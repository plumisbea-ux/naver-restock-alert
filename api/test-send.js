import { handleEvent } from "../lib/flow.js";
import { hydrateDb, persistDb } from "../lib/db.js";
import { json, empty, isPreflight } from "../lib/http.js";

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();
    await hydrateDb();
    const url = new URL(request.url);
    const text = url.searchParams.get("text") || "재입고 신청";
    const code = url.searchParams.get("code") || undefined;

    const mockSendEvent = {
      event: "send",
      user: "al-2eGuGr5WQOnco1_V-FQ",
      textContent: {
        text,
        ...(code ? { code } : {}),
        inputType: "typing"
      }
    };

    const response = await handleEvent(mockSendEvent, request);
    await persistDb();
    return json({
      request: mockSendEvent,
      response
    });
  }
};
