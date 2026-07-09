import { handleEvent } from "../lib/flow.js";
import { db, getProductByProductNo } from "../lib/db.js";
import { json, empty, isPreflight } from "../lib/http.js";

function buildMockOpenEvent(productNo, user = "al-2eGuGr5WQOnco1_V-FQ") {
  const product = getProductByProductNo(productNo) || db().products[0];
  return {
    event: "open",
    user,
    options: {
      inflow: "button",
      referer: `https://plumisbea-ux.github.io/naver-restock-alert/?productNo=${product.product_no}`,
      from: String(product.product_no),
      friend: false,
      under14: false,
      under19: false
    }
  };
}

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();

    const url = new URL(request.url);
    const productNo = url.searchParams.get("productNo") || url.searchParams.get("from") || "200000001";
    const user = url.searchParams.get("user") || "al-2eGuGr5WQOnco1_V-FQ";
    const mockOpenEvent = buildMockOpenEvent(productNo, user);

    return json({
      request: mockOpenEvent,
      response: await handleEvent(mockOpenEvent)
    });
  }
};
