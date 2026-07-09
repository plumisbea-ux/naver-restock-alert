import { getOptionById } from "../lib/db.js";
import { readJson, json, empty, isPreflight } from "../lib/http.js";
import { processManualRestockForOption } from "../lib/restock.js";

export const config = {
  maxDuration: 30
};

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();
    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = await readJson(request);
    const optionId = body?.option_id || body?.optionId;
    const stockQuantity = body?.stock_quantity ?? body?.stockQuantity;

    if (!optionId || stockQuantity === undefined || stockQuantity === null) {
      return json({ ok: false, error: "option_id and stock_quantity are required" }, 400);
    }

    const option = getOptionById(optionId);
    if (!option) return json({ ok: false, error: "Option not found" }, 404);

    const result = await processManualRestockForOption({ optionId, stockQuantity });
    return json({ ok: true, result });
  }
};
