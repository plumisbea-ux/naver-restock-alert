import {
  addConsentLog,
  db,
  getDefaultProduct,
  getOptionById,
  getOutOfStockOptions,
  getProductById,
  getSession,
  getSeller,
  getWaitlistCount,
  updateSession,
  upsertWaitlist
} from "./db.js";
import {
  askPhonePrompt,
  channelSelectPrompt,
  completePrompt,
  fallbackPrompt,
  kakaoConsentPrompt,
  noOutOfStockOptionsPrompt,
  noStockPrompt,
  otherInquiryPrompt,
  optionSelectPrompt,
  productContextMissingPrompt,
  restockApplyPrompt
} from "./naverTalkMessages.js";
import { detectIntent, extractProductFromOpenEvent } from "./naverTalkParser.js";

function pickPhoneForMockUser(talkUserId) {
  return db().mock_users[talkUserId]?.mock_phone_number || null;
}

function getProductOrFallback(productId) {
  if (productId) return getProductById(productId) || getDefaultProduct();
  return getDefaultProduct();
}

function startApplyFlow(talkUserId, productId) {
  const product = getProductOrFallback(productId);
  const outOfStockOptions = getOutOfStockOptions(product.id);

  updateSession(talkUserId, {
    stage: "OPTION_SELECT",
    product_id: product.id,
    option_id: null,
    awaiting_phone: false
  });

  if (outOfStockOptions.length === 0) {
    return noOutOfStockOptionsPrompt(product);
  }

  if (outOfStockOptions.length === 1) {
    const option = outOfStockOptions[0];
    updateSession(talkUserId, {
      stage: "CHANNEL_SELECT",
      product_id: product.id,
      option_id: option.id
    });
    return channelSelectPrompt(product, option);
  }

  return optionSelectPrompt(product, outOfStockOptions);
}

function completeWaitlist({ talkUserId, productId, optionId, channelPreference, phoneNumber = null, kakaoOptIn = false, request }) {
  const seller = getSeller();
  const product = getProductById(productId);
  const option = getOptionById(optionId);

  const { waitlist } = upsertWaitlist({
    sellerId: seller.id,
    productId,
    optionId,
    talkUserId,
    phoneNumber,
    kakaoOptIn,
    channelPreference,
    memo: "1차 MVP mock waitlist"
  });

  if (kakaoOptIn && phoneNumber) {
    const consentText = "재입고 알림 발송을 위해 휴대전화번호를 수집합니다. 보관 기간: 알림 발송 후 30일 또는 신청 취소 시 즉시 삭제.";
    addConsentLog({
      sellerId: seller.id,
      waitlistId: waitlist.id,
      talkUserId,
      phoneNumber,
      consentType: "KAKAO_RESTOCK_ALERT",
      consentText,
      ipAddress: request?.headers?.get?.("x-forwarded-for") || null
    });
  }

  updateSession(talkUserId, {
    stage: "COMPLETED",
    product_id: productId,
    option_id: optionId,
    awaiting_phone: false
  });

  const waitCount = getWaitlistCount(productId, optionId);
  return completePrompt({ product, option, channelPreference, waitCount });
}

export function handleOpenEvent(eventBody) {
  const talkUserId = eventBody.user;
  const product = extractProductFromOpenEvent(eventBody);

  if (!product) {
    updateSession(talkUserId, {
      stage: "PRODUCT_SELECT",
      product_id: null,
      option_id: null,
      awaiting_phone: false
    });
    return productContextMissingPrompt(db().products);
  }

  const outOfStockOptions = getOutOfStockOptions(product.id);
  updateSession(talkUserId, {
    stage: "OPENED_PRODUCT",
    product_id: product.id,
    option_id: null,
    awaiting_phone: false
  });

  if (outOfStockOptions.length === 0) {
    return noOutOfStockOptionsPrompt(product);
  }

  if (product.status === "FULL_OUT_OF_STOCK") {
    return noStockPrompt(product);
  }

  return restockApplyPrompt(product, outOfStockOptions);
}

export function handleSendEvent(eventBody, request) {
  const talkUserId = eventBody.user || "mock_user";
  const session = getSession(talkUserId);
  const intent = detectIntent(eventBody, session);

  switch (intent.type) {
    case "APPLY_RESTOCK": {
      return startApplyFlow(talkUserId, intent.productId || session.product_id);
    }

    case "OTHER_INQUIRY": {
      const product = getProductOrFallback(intent.productId || session.product_id);
      updateSession(talkUserId, {
        stage: "OTHER_INQUIRY",
        product_id: product.id,
        awaiting_phone: false
      });
      return otherInquiryPrompt(product);
    }

    case "SELECT_OPTION": {
      const product = getProductOrFallback(intent.productId || session.product_id);
      const option = getOptionById(intent.optionId);
      if (!option) return startApplyFlow(talkUserId, product.id);

      updateSession(talkUserId, {
        stage: "CHANNEL_SELECT",
        product_id: product.id,
        option_id: option.id,
        awaiting_phone: false
      });
      return channelSelectPrompt(product, option);
    }

    case "CHANNEL_NAVER_ONLY": {
      const productId = intent.productId || session.product_id;
      const optionId = intent.optionId || session.option_id;
      return completeWaitlist({
        talkUserId,
        productId,
        optionId,
        channelPreference: "NAVER_TALK_ONLY",
        request
      });
    }

    case "CHANNEL_KAKAO": {
      updateSession(talkUserId, {
        stage: "KAKAO_CONSENT",
        product_id: intent.productId || session.product_id,
        option_id: intent.optionId || session.option_id,
        awaiting_phone: false
      });
      return kakaoConsentPrompt();
    }

    case "KAKAO_CONSENT": {
      const mockPhone = pickPhoneForMockUser(talkUserId);
      if (mockPhone) {
        return completeWaitlist({
          talkUserId,
          productId: session.product_id,
          optionId: session.option_id,
          phoneNumber: mockPhone,
          kakaoOptIn: true,
          channelPreference: "NAVER_TALK_AND_KAKAO",
          request
        });
      }

      updateSession(talkUserId, {
        stage: "PHONE_INPUT",
        awaiting_phone: true,
        kakao_consent: true
      });
      return askPhonePrompt();
    }

    case "PHONE_NUMBER": {
      return completeWaitlist({
        talkUserId,
        productId: session.product_id,
        optionId: session.option_id,
        phoneNumber: intent.phoneNumber,
        kakaoOptIn: true,
        channelPreference: "NAVER_TALK_AND_KAKAO",
        request
      });
    }

    default:
      return fallbackPrompt();
  }
}

export function handleEvent(eventBody, request) {
  if (!eventBody || !eventBody.event) {
    return fallbackPrompt();
  }

  if (eventBody.event === "open") return handleOpenEvent(eventBody);
  if (eventBody.event === "send") return handleSendEvent(eventBody, request);

  return null;
}
