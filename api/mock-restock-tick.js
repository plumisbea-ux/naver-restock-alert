import { db } from "../lib/db.js";
import { json, empty, isPreflight } from "../lib/http.js";
import { processMockRestockForWaitlist } from "../lib/restock.js";

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();
    if (!["POST", "GET"].includes(request.method)) {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const url = new URL(request.url);
    const waitlistId = url.searchParams.get("waitlistId") || db().waitlists.find((item) => item.status === "WAITING")?.id;
    if (!waitlistId) return json({ ok: false, reason: "NO_WAITING_WAITLIST" }, 404);

    const result = await processMockRestockForWaitlist(waitlistId);
    return json({ ok: true, result });
  }
};
