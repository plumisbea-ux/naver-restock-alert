import { handleEvent } from "../lib/flow.js";
import { json } from "../lib/http.js";

export default {
  async fetch(request) {
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

    return json({
      request: mockSendEvent,
      response: handleEvent(mockSendEvent, request)
    });
  }
};
