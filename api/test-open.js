import { handleEvent } from "../lib/flow.js";
import { json, empty, isPreflight } from "../lib/http.js";

export default {
  async fetch(request) {
    if (isPreflight(request)) return empty();
    const mockOpenEvent = {
      event: "open",
      user: "al-2eGuGr5WQOnco1_V-FQ",
      options: {
        inflow: "button",
        referer: "https://plumisbea-ux.github.io/naver-restock-alert/?productNo=200000001",
        from: "200000001",
        friend: false,
        under14: false,
        under19: false
      }
    };

    return json({
      request: mockOpenEvent,
      response: handleEvent(mockOpenEvent)
    });
  }
};
