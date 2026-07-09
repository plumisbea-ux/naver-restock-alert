import { handleEvent } from "../lib/flow.js";
import { readJson, json, empty, isPreflight } from "../lib/http.js";
import { db, getOptionById, getProductById, getProductOptions, resetDb } from "../lib/db.js";
import { processManualRestockForOption } from "../lib/restock.js";

export const config = {
  maxDuration: 30
};

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
  const partialOutOptions = store.product_options.filter((option) => Number(option.stock_quantity) <= 0).length;
  const fullOutProducts = store.products.filter((product) => {
    const options = getProductOptions(product.id);
    return options.length > 0 && options.every((option) => Number(option.stock_quantity) <= 0);
  }).length;
  const waitingCount = store.waitlists.filter((item) => item.status === "WAITING").length;
  const notifiedCount = store.waitlists.filter((item) => item.status === "NOTIFIED").length;
  const smsOptInCount = store.waitlists.filter((item) => item.sms_opt_in || item.channel_preference === "NAVER_TALK_AND_SMS").length;

  return {
    productCount,
    partialOutOptions,
    fullOutProducts,
    waitingCount,
    notifiedCount,
    smsOptInCount,
    messageLogCount: store.message_logs.length
  };
}

function adminState() {
  const store = db();
  return {
    ok: true,
    metrics: dashboardMetrics(store),
    sellers: store.sellers,
    products: store.products.map((product) => ({
      ...product,
      options: getProductOptions(product.id)
    })),
    product_options: store.product_options,
    waitlists: store.waitlists.map(decorateWaitlist),
    message_logs: store.message_logs.slice(0, 100),
    consent_logs: store.consent_logs.slice(0, 50),
    stock_events: store.stock_events.slice(-100).reverse(),
    sessions: store.sessions,
    mock_users: store.mock_users
  };
}

async function handleAdminEvent(eventBody) {
  if (eventBody.event === "admin.state") return adminState();

  if (eventBody.event === "admin.reset") {
    resetDb();
    return { ok: true, reset: true, state: adminState() };
  }

  if (eventBody.event === "admin.update_stock") {
    const optionId = eventBody.option_id || eventBody.optionId;
    const stockQuantity = eventBody.stock_quantity ?? eventBody.stockQuantity;
    if (!optionId || stockQuantity === undefined || stockQuantity === null) {
      return { ok: false, error: "option_id and stock_quantity are required" };
    }
    const option = getOptionById(optionId);
    if (!option) return { ok: false, error: "Option not found" };
    const result = await processManualRestockForOption({ optionId, stockQuantity });
    return { ok: true, result, state: adminState() };
  }

  return null;
}

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();

    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("mode") === "admin-state") return json(adminState(), 200);
      return json({
        ok: true,
        service: "naver-restock-alert-mvp",
        webhook: "/api/naver-talk-webhook",
        admin_state: "/api/naver-talk-webhook?mode=admin-state",
        message: "Naver TalkTalk mock webhook is alive. Use POST with mock open/send events."
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const eventBody = await readJson(request);
    if (!eventBody) return json({ error: "Invalid JSON" }, 400);

    console.log("[NAVER_TALK_WEBHOOK_MOCK]", JSON.stringify(eventBody));

    const adminResponse = await handleAdminEvent(eventBody);
    if (adminResponse) return json(adminResponse, adminResponse.ok === false ? 400 : 200);

    const response = await handleEvent(eventBody, request);
    if (!response) return new Response(null, { status: 200 });

    return json(response, 200);
  }
};
