import { handleEvent } from "../lib/flow.js";
import { db } from "../lib/db.js";
import { json, empty, isPreflight } from "../lib/http.js";

function buildMockOpenEvent(product, index) {
  return {
    event: "open",
    user: `mock_open_user_${index + 1}`,
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

    const results = await Promise.all(db().products.map(async (product, index) => {
      const requestBody = buildMockOpenEvent(product, index);
      return {
        product_no: product.product_no,
        product_name: product.product_name,
        request: requestBody,
        response: await handleEvent(requestBody)
      };
    }));

    return json({ count: results.length, results });
  }
};
