import { seedData } from "../../data/mock-store.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDb() {
  return clone(seedData);
}

const globalKey = "__NAVER_RESTOCK_ALERT_MOCK_DB__";

export function db() {
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = createDb();
  }
  return globalThis[globalKey];
}

export function resetDb() {
  globalThis[globalKey] = createDb();
  return globalThis[globalKey];
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${random}`;
}

export function getSeller(id = "seller_001") {
  return db().sellers.find((seller) => seller.id === id);
}

export function getProductById(productId) {
  return db().products.find((product) => product.id === productId);
}

export function getProductByProductNo(productNo) {
  return db().products.find((product) => String(product.product_no) === String(productNo));
}

export function getProductOptions(productId) {
  return db().product_options.filter((option) => option.product_id === productId);
}

export function getOptionById(optionId) {
  return db().product_options.find((option) => option.id === optionId);
}

export function getOutOfStockOptions(productId) {
  return getProductOptions(productId).filter((option) => Number(option.stock_quantity) <= 0);
}

export function getSession(talkUserId) {
  const store = db();
  if (!store.sessions[talkUserId]) {
    store.sessions[talkUserId] = {
      talk_user_id: talkUserId,
      stage: "EMPTY",
      product_id: null,
      option_id: null,
      kakao_consent: false,
      awaiting_phone: false,
      updated_at: nowIso()
    };
  }
  return store.sessions[talkUserId];
}

export function updateSession(talkUserId, patch) {
  const session = getSession(talkUserId);
  Object.assign(session, patch, { updated_at: nowIso() });
  return session;
}

export function getWaitlistCount(productId, optionId) {
  return db().waitlists.filter((item) => {
    return item.product_id === productId && item.option_id === optionId && item.status !== "CANCELLED";
  }).length;
}

export function findWaitlist({ sellerId, productId, optionId, talkUserId }) {
  return db().waitlists.find((item) => {
    return item.seller_id === sellerId && item.product_id === productId && item.option_id === optionId && item.talk_user_id === talkUserId && item.status !== "CANCELLED";
  });
}

export function upsertWaitlist({ sellerId, productId, optionId, talkUserId, phoneNumber = null, kakaoOptIn = false, channelPreference = "NAVER_TALK_ONLY", memo = null }) {
  const store = db();
  const existing = findWaitlist({ sellerId, productId, optionId, talkUserId });
  if (existing) {
    existing.phone_number = phoneNumber ?? existing.phone_number;
    existing.kakao_opt_in = Boolean(kakaoOptIn || existing.kakao_opt_in);
    existing.channel_preference = channelPreference || existing.channel_preference;
    existing.memo = memo ?? existing.memo;
    existing.updated_at = nowIso();
    return { waitlist: existing, created: false };
  }

  const waitlist = {
    id: makeId("waitlist"),
    seller_id: sellerId,
    product_id: productId,
    option_id: optionId,
    talk_user_id: talkUserId,
    phone_number: phoneNumber,
    kakao_opt_in: Boolean(kakaoOptIn),
    channel_preference: channelPreference,
    status: "WAITING",
    requested_at: nowIso(),
    restocked_at: null,
    notified_at: null,
    cancelled_at: null,
    expired_at: null,
    memo,
    created_at: nowIso(),
    updated_at: nowIso()
  };
  store.waitlists.push(waitlist);
  return { waitlist, created: true };
}

export function addConsentLog({ sellerId, waitlistId, talkUserId, phoneNumber, consentType, consentText, ipAddress = null }) {
  const log = {
    id: makeId("consent"),
    seller_id: sellerId,
    waitlist_id: waitlistId,
    talk_user_id: talkUserId,
    phone_number: phoneNumber,
    consent_type: consentType,
    consent_text: consentText,
    consented_at: nowIso(),
    withdrawn_at: null,
    ip_address: ipAddress,
    created_at: nowIso()
  };
  db().consent_logs.push(log);
  return log;
}

export function addMessageLog({ sellerId, waitlistId = null, productId = null, optionId = null, channel, messageType, sendStatus, errorMessage = null, payload = null }) {
  const log = {
    id: makeId("msg"),
    seller_id: sellerId,
    waitlist_id: waitlistId,
    product_id: productId,
    option_id: optionId,
    channel,
    message_type: messageType,
    send_status: sendStatus,
    sent_at: sendStatus === "SENT" ? nowIso() : null,
    error_message: errorMessage,
    payload,
    created_at: nowIso()
  };
  db().message_logs.unshift(log);
  return log;
}


export function recomputeProductStatus(productId) {
  const product = getProductById(productId);
  if (!product) return null;
  const options = getProductOptions(productId);
  const activeStocks = options.map((option) => Number(option.stock_quantity));
  if (options.length > 0 && activeStocks.every((stock) => stock <= 0)) {
    product.status = "FULL_OUT_OF_STOCK";
  } else if (activeStocks.some((stock) => stock <= 0)) {
    product.status = "PARTIAL_OUT_OF_STOCK";
  } else if (activeStocks.some((stock) => stock <= Number(product.low_stock_threshold || 3))) {
    product.status = "LOW_STOCK";
  } else {
    product.status = "NORMAL";
  }
  product.updated_at = nowIso();
  return product;
}

export function setOptionStock(optionId, stockQuantity) {
  const option = getOptionById(optionId);
  if (!option) return null;
  const nextStock = Math.max(0, Number(stockQuantity || 0));
  const previous = Number(option.stock_quantity);
  option.previous_stock_quantity = previous;
  option.stock_quantity = nextStock;
  option.stock_status = nextStock <= 0 ? "PARTIAL_OUT_OF_STOCK" : nextStock <= 3 ? "LOW_STOCK" : "NORMAL";
  option.current_option_name = nextStock <= 0 ? `${option.original_option_name} [품절]` : option.original_option_name;
  option.notice_applied = nextStock <= 0;
  option.notice_text = nextStock <= 0 ? "재입고 알림 가능" : null;
  option.updated_at = nowIso();
  recomputeProductStatus(option.product_id);
  return { option, previous_stock: previous, current_stock: nextStock };
}

export function getWaitingWaitlists(productId, optionId) {
  return db().waitlists.filter((item) => {
    return item.product_id === productId && item.option_id === optionId && item.status === "WAITING";
  });
}
