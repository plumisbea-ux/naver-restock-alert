import assert from "node:assert/strict";
import { db, getProductByProductNo, resetDb, upsertWaitlist } from "../lib/db.js";
import { handleEvent } from "../lib/flow.js";
import { buildRestockText } from "../lib/mockSenders.js";

resetDb();

const user = "talk_test_user";
const product = getProductByProductNo("200000001");
const soldOutOption = db().product_options.find((option) => option.id === "opt_knit_black_004");
const inStockOption = db().product_options.find((option) => option.id === "opt_knit_navy_004");

const selectedSoldOut = await handleEvent({ event: "open", user, options: { from: `200000001|${soldOutOption.id}` } });
assert.match(selectedSoldOut.textContent.text, /블랙\(031\) \/ 004/);
assert.match(selectedSoldOut.textContent.text, /알림 받을 채널/);
assert.doesNotMatch(selectedSoldOut.textContent.text, /로그인 10% 쿠폰/);

const selectedInStock = await handleEvent({ event: "open", user: "in_stock_user", options: { from: `200000001|${inStockOption.id}` } });
assert.doesNotMatch(selectedInStock.textContent.text, /알림 받을 채널/);

const completed = await handleEvent({
  event: "send",
  user,
  textContent: { text: "톡톡으로 받기", code: `CHANNEL:NAVER_TALK_ONLY:${product.id}:${soldOutOption.id}` }
});
assert.match(completed.textContent.text, /신청이 완료되었습니다/);
assert.match(completed.textContent.text, /해당 옵션이 재입고되면/);

const existing = db().waitlists.find((waitlist) => waitlist.talk_user_id === user && waitlist.option_id === soldOutOption.id);
existing.status = "NOTIFIED";
existing.notified_at = new Date().toISOString();
upsertWaitlist({ sellerId: existing.seller_id, productId: existing.product_id, optionId: existing.option_id, talkUserId: user });
assert.equal(existing.status, "WAITING");
assert.equal(existing.notified_at, null);

const alertText = buildRestockText({ product, option: soldOutOption, waitCount: 1 });
assert.match(alertText, /\[재입고 안내\]/);
assert.doesNotMatch(alertText, /로그인 10% 쿠폰/);

console.log("PASS TalkTalk restock flow");
