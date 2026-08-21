import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/demo-applications.js";

test("stores applications and protects applicant data", async () => {
  process.env.ADMIN_ACCESS_KEY = "test-admin-key";
  const payload = {
    store_name: "테스트 스토어",
    store_url: "https://smartstore.naver.com/test",
    soldout_rate_pct: 35,
    contact_name: "담당자",
    phone: "010-1234-5678",
    email: "seller@example.com",
    contact_availability: "8월 25일 이후 평일 오후 1시~5시",
    request_details: "옵션별 수요 확인",
    privacy_consent: true
  };
  const created = await handler.fetch(new Request("http://localhost/api/demo-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
  assert.equal(created.status, 201);
  assert.equal((await created.json()).ok, true);

  const denied = await handler.fetch(new Request("http://localhost/api/demo-applications"));
  assert.equal(denied.status, 401);

  const allowed = await handler.fetch(new Request("http://localhost/api/demo-applications", { headers: { Authorization: "Bearer test-admin-key" } }));
  const result = await allowed.json();
  assert.equal(allowed.status, 200);
  assert.equal(result.applications[0].store_name, payload.store_name);
});
