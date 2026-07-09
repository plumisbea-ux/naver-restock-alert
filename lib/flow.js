import {
  addConsentLog,
  db,
  findWaitlist,
  getDefaultProduct,
  getOptionById,
  getOutOfStockOptions,
  getProductById,
  getSeller,
  getSession,
  getWaitlistCount,
  updateSession,
  upsertWaitlist,
  updateWaitlistPhoneForUser,
  withdrawPhoneForUser
} from "./db.js";
import {
  channelSelectPrompt,
  completePrompt,
  fallbackPrompt,
  noOutOfStockOptionsPrompt,
  noStockPrompt,
  otherInquiryPrompt,
  optionSelectPrompt,
  productContextMissingPrompt,
  profileCancelPrompt,
  profileCompletePrompt,
  profileWithdrawPrompt,
  restockApplyPrompt,
  smsProfileRequestPrompt
} from "./naverTalkMessages.js";
import { requestNaverProfileCellphone } from "./mockSenders.js";
import { detectIntent, extractProductFromOpenEvent } from "./naverTalkParser.js";

function pickPhoneForMockUser(talkUserId) {
  return db().mock_users[talkUserId]?.mock_phone_number || null;
}

function getProductOrFallback(productId) {
  if (productId) return getProductById(productId) || getDefaultProduct();
  return getDefaultProduct();
}

function initialProductPrompt(product) {
  const outOfStockOptions = getOutOfStockOptions(product.id);
  if (outOfStockOptions.length === 0) return noOutOfStockOptionsPrompt(product);
  if (product.status === "FULL_OUT_OF_STOCK") return noStockPrompt(product);
  return restockApplyPrompt(product, outOfStockOptions);
}

function handleBackFlow(talkUserId, session) {
  const product = getProductOrFallback(session.product_id);
  const option = session.option_id ? getOptionById(session.option_id) : null;

  if (session.stage === "SMS_PROFILE_PENDING" || session.stage === "PHONE_INPUT" || session.stage === "KAKAO_CONSENT") {
    updateSession(talkUserId, {
      stage: "CHANNEL_SELECT",
      product_id: product.id,
      option_id: option?.id || session.option_id,
      awaiting_phone: false,
      profile_request_status: null
    });
    if (option) return channelSelectPrompt(product, option);
    return startApplyFlow(talkUserId, product.id);
  }

  if (session.stage === "CHANNEL_SELECT") {
    return startApplyFlow(talkUserId, product.id);
  }

  if (session.stage === "OPTION_SELECT" || session.stage === "OTHER_INQUIRY" || session.stage === "COMPLETED") {
    updateSession(talkUserId, {
      stage: "OPENED_PRODUCT",
      product_id: product.id,
      option_id: null,
      awaiting_phone: false
    });
    return initialProductPrompt(product);
  }

  if (session.stage === "PRODUCT_SELECT" || !session.product_id) {
    updateSession(talkUserId, {
      stage: "PRODUCT_SELECT",
      product_id: null,
      option_id: null,
      awaiting_phone: false
    });
    return productContextMissingPrompt(db().products);
  }

  updateSession(talkUserId, {
    stage: "OPENED_PRODUCT",
    product_id: product.id,
    option_id: null,
    awaiting_phone: false
  });
  return initialProductPrompt(product);
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

function completeWaitlist({ talkUserId, productId, optionId, channelPreference, phoneNumber = null, smsOptIn = false, request, profileRequestStatus = null }) {
  const seller = getSeller();
  const product = getProductById(productId);
  const option = getOptionById(optionId);

  const { waitlist } = upsertWaitlist({
    sellerId: seller.id,
    productId,
    optionId,
    talkUserId,
    phoneNumber,
    smsOptIn,
    channelPreference,
    profileRequestStatus,
    memo: "1차 MVP mock waitlist"
  });

  if (smsOptIn && phoneNumber) {
    const consentText = "재입고 알림 SMS 발송을 위해 휴대전화번호를 수집합니다. 보관 기간: 알림 발송 후 30일 또는 신청 취소 시 즉시 삭제.";
    addConsentLog({
      sellerId: seller.id,
      waitlistId: waitlist.id,
      talkUserId,
      phoneNumber,
      consentType: "SMS_RESTOCK_ALERT",
      consentText,
      ipAddress: request?.headers?.get?.("x-forwarded-for") || null
    });
  }

  updateSession(talkUserId, {
    stage: profileRequestStatus === "PENDING" ? "SMS_PROFILE_PENDING" : "COMPLETED",
    product_id: productId,
    option_id: optionId,
    awaiting_phone: false,
    profile_request_status: profileRequestStatus
  });

  const waitCount = getWaitlistCount(productId, optionId);
  return completePrompt({ product, option, channelPreference, waitCount });
}

async function startSmsFlow({ talkUserId, productId, optionId, request }) {
  const seller = getSeller();
  const product = getProductById(productId);
  const option = getOptionById(optionId);

  const { waitlist } = upsertWaitlist({
    sellerId: seller.id,
    productId,
    optionId,
    talkUserId,
    smsOptIn: true,
    channelPreference: "NAVER_TALK_AND_SMS",
    profileRequestStatus: "PENDING",
    memo: "SMS profile request pending"
  });

  updateSession(talkUserId, {
    stage: "SMS_PROFILE_PENDING",
    product_id: productId,
    option_id: optionId,
    awaiting_phone: false,
    profile_request_status: "PENDING",
    waitlist_id: waitlist.id
  });

  await requestNaverProfileCellphone({
    sellerId: seller.id,
    talkUserId,
    waitlistId: waitlist.id,
    productId,
    optionId
  });

  // 데모 페이지의 mock_user_*는 네이버 실제 동의창을 띄울 수 없으므로 mock profile SUCCESS를 즉시 반영합니다.
  const mockPhone = pickPhoneForMockUser(talkUserId);
  if (talkUserId?.startsWith?.("mock_") && mockPhone) {
    updateWaitlistPhoneForUser({ talkUserId, productId, optionId, phoneNumber: mockPhone, profileResult: "SUCCESS" });
    addConsentLog({
      sellerId: seller.id,
      waitlistId: waitlist.id,
      talkUserId,
      phoneNumber: mockPhone,
      consentType: "SMS_RESTOCK_ALERT_MOCK_PROFILE",
      consentText: "데모 mock user 휴대전화번호 자동 연결",
      ipAddress: request?.headers?.get?.("x-forwarded-for") || null
    });
  }

  return smsProfileRequestPrompt(product, option);
}

function handleProfileEvent(eventBody, request) {
  const talkUserId = eventBody.user || "mock_user";
  const options = eventBody.options || {};
  const result = options.result || eventBody.result;
  const session = getSession(talkUserId);
  const productId = session.product_id;
  const optionId = session.option_id;
  const product = getProductOrFallback(productId);
  const option = optionId ? getOptionById(optionId) : null;

  if (result === "WITHDRAW") {
    withdrawPhoneForUser(talkUserId);
    updateSession(talkUserId, { profile_request_status: "WITHDRAW", awaiting_phone: false });
    return profileWithdrawPrompt();
  }

  const phoneNumber = options.cellphone || eventBody.cellphone || null;
  const waitlist = option ? findWaitlist({ sellerId: getSeller().id, productId: product.id, optionId: option.id, talkUserId }) : null;

  if (result === "SUCCESS" && phoneNumber && waitlist && option) {
    updateWaitlistPhoneForUser({ talkUserId, productId: product.id, optionId: option.id, phoneNumber, profileResult: "SUCCESS" });
    addConsentLog({
      sellerId: getSeller().id,
      waitlistId: waitlist.id,
      talkUserId,
      phoneNumber,
      consentType: "SMS_RESTOCK_ALERT",
      consentText: "네이버 Profile API cellphone 제공 동의 기반 재입고 SMS 알림 수신",
      ipAddress: request?.headers?.get?.("x-forwarded-for") || null
    });
    updateSession(talkUserId, { stage: "COMPLETED", profile_request_status: "SUCCESS", awaiting_phone: false });
    const waitCount = getWaitlistCount(product.id, option.id);
    return profileCompletePrompt({ product, option, waitCount, phoneNumber });
  }

  if (waitlist) {
    waitlist.profile_request_status = "CANCEL";
    waitlist.profile_result = "CANCEL";
    waitlist.updated_at = new Date().toISOString();
  }
  updateSession(talkUserId, { stage: "COMPLETED", profile_request_status: "CANCEL", awaiting_phone: false });

  if (option) {
    const waitCount = getWaitlistCount(product.id, option.id);
    return profileCancelPrompt({ product, option, waitCount });
  }

  return fallbackPrompt();
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

  updateSession(talkUserId, {
    stage: "OPENED_PRODUCT",
    product_id: product.id,
    option_id: null,
    awaiting_phone: false
  });

  return initialProductPrompt(product);
}

export async function handleSendEvent(eventBody, request) {
  const talkUserId = eventBody.user || "mock_user";
  const session = getSession(talkUserId);
  const intent = detectIntent(eventBody, session);

  switch (intent.type) {
    case "BACK": {
      return handleBackFlow(talkUserId, session);
    }

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

    case "CHANNEL_SMS":
    case "CHANNEL_KAKAO": {
      const productId = intent.productId || session.product_id;
      const optionId = intent.optionId || session.option_id;
      return await startSmsFlow({ talkUserId, productId, optionId, request });
    }

    case "SMS_CONSENT": {
      return await startSmsFlow({
        talkUserId,
        productId: session.product_id,
        optionId: session.option_id,
        request
      });
    }

    case "PHONE_NUMBER": {
      return completeWaitlist({
        talkUserId,
        productId: session.product_id,
        optionId: session.option_id,
        phoneNumber: intent.phoneNumber,
        smsOptIn: true,
        channelPreference: "NAVER_TALK_AND_SMS",
        request,
        profileRequestStatus: "MANUAL_PHONE"
      });
    }

    default:
      return fallbackPrompt();
  }
}

export async function handleEvent(eventBody, request) {
  if (!eventBody || !eventBody.event) {
    return fallbackPrompt();
  }

  if (eventBody.event === "open") return handleOpenEvent(eventBody);
  if (eventBody.event === "send") return await handleSendEvent(eventBody, request);
  if (eventBody.event === "profile") return handleProfileEvent(eventBody, request);

  return null;
}
