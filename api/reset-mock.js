import { resetDb } from "../lib/db.js";
import { json, empty, isPreflight } from "../lib/http.js";

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();
    if (!["POST", "GET"].includes(request.method)) {
      return json({ error: "Method Not Allowed" }, 405);
    }
    resetDb();
    return json({ ok: true, message: "Mock DB reset completed." });
  }
};
