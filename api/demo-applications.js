import crypto from "node:crypto";
import { addApplication, listApplications } from "../lib/applications.js";
import { empty, isPreflight, json, readJson } from "../lib/http.js";
import { makeId, nowIso } from "../lib/db.js";

const text = (value, max) => String(value || "").trim().slice(0, max);

function authorized(request) {
  const expected = process.env.ADMIN_ACCESS_KEY || "";
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validate(body) {
  if (!body || body.website) return body?.website ? { spam: true } : { error: "신청 내용을 확인해 주세요." };
  const application = {
    id: makeId("application"),
    store_name: text(body.store_name, 100),
    store_url: text(body.store_url, 500),
    soldout_cycle: text(body.soldout_cycle, 80),
    contact_name: text(body.contact_name, 80),
    phone: text(body.phone, 40),
    email: text(body.email, 180).toLowerCase(),
    contact_date: text(body.contact_date, 20),
    contact_time_start: text(body.contact_time_start, 10),
    contact_time_end: text(body.contact_time_end, 10),
    request_details: text(body.request_details, 2000),
    privacy_consent: body.privacy_consent === true,
    status: "NEW",
    created_at: nowIso()
  };
  if (!application.store_name || !application.store_url || !application.soldout_cycle || !application.contact_name || !application.phone || !application.email || !application.contact_date || !application.contact_time_start || !application.contact_time_end) return { error: "필수 항목을 모두 입력해 주세요." };
  try {
    const url = new URL(application.store_url);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    return { error: "스토어 URL을 확인해 주세요." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) return { error: "메일 주소를 확인해 주세요." };
  if (application.phone.replace(/\D/g, "").length < 9) return { error: "연락처를 확인해 주세요." };
  if (!application.privacy_consent) return { error: "개인정보 수집 및 이용에 동의해 주세요." };
  return { application };
}

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();
    if (request.method === "POST") {
      const result = validate(await readJson(request));
      if (result.spam) return json({ ok: true, application_id: "received" }, 201);
      if (result.error) return json({ ok: false, error: result.error }, 400);
      await addApplication(result.application);
      return json({ ok: true, application_id: result.application.id }, 201);
    }
    if (request.method === "GET") {
      if (!authorized(request)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
      const applications = await listApplications();
      return json({ ok: true, total: applications.length, applications });
    }
    return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }
};
