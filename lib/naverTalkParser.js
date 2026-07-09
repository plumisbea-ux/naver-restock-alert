import { db, getProductById, getProductByProductNo, getProductOptions } from "./db.js";

function pushCandidate(list, value) {
  if (value === undefined || value === null) return;
  const text = String(value).trim();
  if (!text) return;
  if (!list.includes(text)) list.push(text);
}

function collectProductNoCandidatesFromUrl(value) {
  const candidates = [];
  if (!value) return candidates;
  const text = String(value);

  const productsMatch = text.match(/\/products\/(\d+)/);
  if (productsMatch) pushCandidate(candidates, productsMatch[1]);

  const productNoMatch = text.match(/[?&](?:productNo|product_no|from)=([^&]+)/);
  if (productNoMatch) pushCandidate(candidates, decodeURIComponent(productNoMatch[1]));

  try {
    const url = new URL(text);
    pushCandidate(candidates, url.searchParams.get("productNo"));
    pushCandidate(candidates, url.searchParams.get("product_no"));
    pushCandidate(candidates, url.searchParams.get("from"));
  } catch {
    // not a full URL
  }

  return candidates;
}

export function extractProductNoCandidatesFromOpenEvent(eventBody) {
  const candidates = [];
  const options = eventBody?.options || {};

  // 네이버 톡톡 문서상 여러 상품 링크를 구분할 때 from 파라미터를 쓰는 것이 가장 안정적입니다.
  pushCandidate(candidates, options.from);

  for (const value of collectProductNoCandidatesFromUrl(options.referer)) pushCandidate(candidates, value);
  for (const value of collectProductNoCandidatesFromUrl(options.url)) pushCandidate(candidates, value);
  for (const value of collectProductNoCandidatesFromUrl(options.mobileUrl)) pushCandidate(candidates, value);

  return candidates;
}

export function extractProductNoFromOpenEvent(eventBody) {
  for (const candidate of extractProductNoCandidatesFromOpenEvent(eventBody)) {
    if (getProductByProductNo(candidate)) return candidate;
  }
  return null;
}

export function extractProductFromOpenEvent(eventBody) {
  const candidates = extractProductNoCandidatesFromOpenEvent(eventBody);
  for (const candidate of candidates) {
    const product = getProductByProductNo(candidate);
    if (product) return product;
  }
  return null;
}

export function getTextAndCode(eventBody) {
  const text = eventBody?.textContent?.text?.trim() || "";
  const code = eventBody?.textContent?.code?.trim() || eventBody?.code?.trim() || "";
  return { text, code };
}

export function detectIntent(eventBody, session) {
  const { text, code } = getTextAndCode(eventBody);
  const source = code || text;

  if (source.startsWith("OTHER_INQUIRY")) {
    const [, productId] = source.split(":");
    return { type: "OTHER_INQUIRY", productId: productId || session?.product_id || null };
  }

  if (source.startsWith("APPLY_RESTOCK")) {
    const [, productId] = source.split(":");
    return { type: "APPLY_RESTOCK", productId: productId || session?.product_id || null };
  }

  if (source.startsWith("SELECT_OPTION")) {
    const [, productId, optionId] = source.split(":");
    return { type: "SELECT_OPTION", productId, optionId };
  }

  if (source.startsWith("CHANNEL:NAVER_TALK_ONLY")) {
    const parts = source.split(":");
    return { type: "CHANNEL_NAVER_ONLY", productId: parts[2] || session?.product_id, optionId: parts[3] || session?.option_id };
  }

  if (source.startsWith("CHANNEL:KAKAO")) {
    const parts = source.split(":");
    return { type: "CHANNEL_KAKAO", productId: parts[2] || session?.product_id, optionId: parts[3] || session?.option_id };
  }

  if (source.startsWith("CONSENT:KAKAO_RESTOCK_ALERT") || text.includes("동의")) {
    return { type: "KAKAO_CONSENT" };
  }

  if (/^01[016789]-?\d{3,4}-?\d{4}$/.test(text.replaceAll(" ", ""))) {
    return { type: "PHONE_NUMBER", phoneNumber: normalizePhone(text) };
  }

  if (text.includes("재입고") || text.includes("알림")) {
    return { type: "APPLY_RESTOCK", productId: session?.product_id || null };
  }

  const matchingOption = findOptionByText(session?.product_id, text);
  if (matchingOption) {
    return { type: "SELECT_OPTION", productId: session.product_id, optionId: matchingOption.id };
  }

  return { type: "UNKNOWN", text, code };
}

export function findOptionByText(productId, text) {
  if (!productId || !text) return null;
  const normalized = text.replace("[품절]", "").trim();
  return getProductOptions(productId).find((option) => {
    return option.id === normalized || option.option_id === normalized || option.original_option_name === normalized || option.current_option_name === text;
  });
}

export function normalizePhone(text) {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return text;
}

export function getDefaultProduct() {
  return db().products[0];
}
