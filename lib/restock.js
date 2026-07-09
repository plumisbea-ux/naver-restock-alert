import { waitUntil } from "@vercel/functions";
import { addMessageLog, db, getOptionById, getProductById, makeId, nowIso } from "./db.js";
import { sendMockKakaoAlimtalk, sendMockNaverTalk } from "./mockSenders.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processMockRestockForWaitlist(waitlistId) {
  const store = db();
  const waitlist = store.waitlists.find((item) => item.id === waitlistId);
  if (!waitlist) return { ok: false, reason: "WAITLIST_NOT_FOUND" };
  if (waitlist.status === "NOTIFIED") return { ok: true, reason: "ALREADY_NOTIFIED" };

  const product = getProductById(waitlist.product_id);
  const option = getOptionById(waitlist.option_id);
  if (!product || !option) return { ok: false, reason: "PRODUCT_OR_OPTION_NOT_FOUND" };

  const beforeStock = Number(option.stock_quantity);
  option.previous_stock_quantity = beforeStock;
  option.stock_quantity = Math.max(3, beforeStock + 3);
  option.stock_status = "RESTOCKED";
  option.current_option_name = option.original_option_name;
  option.updated_at = nowIso();

  product.status = "RESTOCKED";
  product.updated_at = nowIso();

  store.stock_events.push({
    id: makeId("stock_event"),
    seller_id: waitlist.seller_id,
    product_id: product.id,
    option_id: option.id,
    event_type: "RESTOCKED",
    previous_stock: beforeStock,
    current_stock: option.stock_quantity,
    event_started_at: nowIso(),
    event_ended_at: null,
    created_at: nowIso()
  });

  store.notification_queue.push({
    id: makeId("queue"),
    seller_id: waitlist.seller_id,
    waitlist_id: waitlist.id,
    product_id: waitlist.product_id,
    option_id: waitlist.option_id,
    channel: "NAVER_TALK",
    priority: 1,
    batch_id: null,
    scheduled_at: nowIso(),
    sent_at: null,
    status: "PENDING",
    failure_reason: null,
    created_at: nowIso(),
    updated_at: nowIso()
  });

  await sendMockNaverTalk({ waitlist });

  if (waitlist.kakao_opt_in && waitlist.phone_number) {
    store.notification_queue.push({
      id: makeId("queue"),
      seller_id: waitlist.seller_id,
      waitlist_id: waitlist.id,
      product_id: waitlist.product_id,
      option_id: waitlist.option_id,
      channel: "KAKAO_ALIMTALK",
      priority: 2,
      batch_id: null,
      scheduled_at: nowIso(),
      sent_at: null,
      status: "PENDING",
      failure_reason: null,
      created_at: nowIso(),
      updated_at: nowIso()
    });
    await sendMockKakaoAlimtalk({ waitlist });
  }

  waitlist.status = "NOTIFIED";
  waitlist.restocked_at = nowIso();
  waitlist.notified_at = nowIso();
  waitlist.updated_at = nowIso();

  addMessageLog({
    sellerId: waitlist.seller_id,
    waitlistId: waitlist.id,
    productId: waitlist.product_id,
    optionId: waitlist.option_id,
    channel: "SYSTEM",
    messageType: "RESTOCK_ALERT",
    sendStatus: "SENT",
    payload: {
      note: "Mock restock completed after scheduled delay.",
      product_name: product.product_name,
      option_name: option.original_option_name
    }
  });

  return { ok: true, waitlistId, productId: product.id, optionId: option.id };
}

export function scheduleMockRestock(waitlistId, delayMs = Number(process.env.MOCK_RESTOCK_DELAY_MS || 10000)) {
  const task = (async () => {
    await sleep(delayMs);
    await processMockRestockForWaitlist(waitlistId);
  })();

  try {
    waitUntil(task);
  } catch {
    task.catch((error) => {
      console.error("Mock restock task failed", error);
    });
  }

  return { scheduled: true, delayMs };
}
