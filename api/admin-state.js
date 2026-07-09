import { db, getOptionById, getProductById, getProductOptions } from "../lib/db.js";
import { json, empty, isPreflight } from "../lib/http.js";

function decorateWaitlist(waitlist) {
  const product = getProductById(waitlist.product_id);
  const option = getOptionById(waitlist.option_id);
  return {
    ...waitlist,
    product_name: product?.product_name || "-",
    option_name: option?.original_option_name || "-"
  };
}

function dashboardMetrics(store) {
  const productCount = store.products.length;
  const partialOutOptions = store.product_options.filter((option) => option.stock_quantity <= 0).length;
  const fullOutProducts = store.products.filter((product) => {
    const options = getProductOptions(product.id);
    return options.length > 0 && options.every((option) => option.stock_quantity <= 0);
  }).length;
  const waitingCount = store.waitlists.filter((item) => item.status === "WAITING").length;
  const notifiedCount = store.waitlists.filter((item) => item.status === "NOTIFIED").length;
  const kakaoOptInCount = store.waitlists.filter((item) => item.kakao_opt_in).length;

  return {
    productCount,
    partialOutOptions,
    fullOutProducts,
    waitingCount,
    notifiedCount,
    kakaoOptInCount,
    messageLogCount: store.message_logs.length
  };
}

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();
    const store = db();
    return json({
      ok: true,
      metrics: dashboardMetrics(store),
      sellers: store.sellers,
      products: store.products.map((product) => ({
        ...product,
        options: getProductOptions(product.id)
      })),
      waitlists: store.waitlists.map(decorateWaitlist),
      message_logs: store.message_logs.slice(0, 50),
      consent_logs: store.consent_logs.slice(0, 50),
      stock_events: store.stock_events.slice(-50).reverse(),
      sessions: store.sessions
    });
  }
};
