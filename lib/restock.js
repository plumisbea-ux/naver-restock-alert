import {
  addMessageLog,
  db,
  getOptionById,
  getProductById,
  getWaitingWaitlists,
  makeId,
  nowIso,
  setOptionStock
} from "./db.js";
import { sendMockKakaoAlimtalk, sendMockNaverTalk } from "./mockSenders.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function notifyWaitlist(waitlist, reason = "MANUAL_RESTOCK") {
  const store = db();
  if (!waitlist) return { ok: false, reason: "WAITLIST_NOT_FOUND" };
  if (waitlist.status === "NOTIFIED") return { ok: true, reason: "ALREADY_NOTIFIED" };

  const product = getProductById(waitlist.product_id);
  const option = getOptionById(waitlist.option_id);
  if (!product || !option) return { ok: false, reason: "PRODUCT_OR_OPTION_NOT_FOUND" };

  const waitingCount = store.waitlists.filter((item) => item.product_id === product.id && item.option_id === option.id && item.status !== "CANCELLED").length;

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

  await sendMockNaverTalk({ waitlist, waitingCount });

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
    await sendMockKakaoAlimtalk({ waitlist, waitingCount });
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
      reason,
      product_name: product.product_name,
      option_name: option.original_option_name,
      waiting_count: waitingCount
    }
  });

  return { ok: true, waitlistId: waitlist.id, productId: product.id, optionId: option.id };
}

export async function processManualRestockForOption({ optionId, stockQuantity }) {
  const optionBefore = getOptionById(optionId);
  if (!optionBefore) return { ok: false, reason: "OPTION_NOT_FOUND" };

  const beforeStock = Number(optionBefore.stock_quantity);
  const result = setOptionStock(optionId, stockQuantity);
  const option = result.option;
  const product = getProductById(option.product_id);
  const becameRestocked = beforeStock <= 0 && Number(option.stock_quantity) > 0;

  const stockEvent = {
    id: makeId("stock_event"),
    seller_id: option.seller_id,
    product_id: option.product_id,
    option_id: option.id,
    event_type: becameRestocked ? "RESTOCKED" : "STOCK_UPDATED",
    previous_stock: beforeStock,
    current_stock: Number(option.stock_quantity),
    event_started_at: nowIso(),
    event_ended_at: null,
    created_at: nowIso()
  };
  db().stock_events.push(stockEvent);

  if (!becameRestocked) {
    return {
      ok: true,
      event: stockEvent,
      notified_count: 0,
      message: "재고가 수정되었지만 0 → 1 이상 전환이 아니어서 알림은 발송하지 않았습니다."
    };
  }

  const waiting = getWaitingWaitlists(option.product_id, option.id);
  const notified = [];
  for (const waitlist of waiting) {
    const notifyResult = await notifyWaitlist(waitlist, "MANUAL_STOCK_UPDATE_GT_ZERO");
    notified.push(notifyResult);
  }

  return {
    ok: true,
    event: stockEvent,
    product,
    option,
    notified_count: notified.filter((item) => item.ok).length,
    notified
  };
}

export async function processMockRestockForWaitlist(waitlistId) {
  const store = db();
  const waitlist = store.waitlists.find((item) => item.id === waitlistId);
  if (!waitlist) return { ok: false, reason: "WAITLIST_NOT_FOUND" };
  const option = getOptionById(waitlist.option_id);
  if (!option) return { ok: false, reason: "OPTION_NOT_FOUND" };
  await processManualRestockForOption({ optionId: option.id, stockQuantity: Math.max(3, Number(option.stock_quantity) + 3) });
  return { ok: true, waitlistId, productId: waitlist.product_id, optionId: option.id };
}

export function scheduleMockRestock(waitlistId, delayMs = Number(process.env.MOCK_RESTOCK_DELAY_MS || 10000)) {
  const task = (async () => {
    await sleep(delayMs);
    await processMockRestockForWaitlist(waitlistId);
  })();

  import("@vercel/functions")
    .then(({ waitUntil }) => waitUntil(task))
    .catch(() => {
      task.catch((error) => {
        console.error("Mock restock task failed", error);
      });
    });

  return { scheduled: true, delayMs };
}
