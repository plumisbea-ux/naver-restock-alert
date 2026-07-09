import { handleEvent } from "../lib/flow.js";
import { json } from "../lib/http.js";

export default {
  async fetch() {
    const mockOpenEvent = {
      event: "open",
      user: "al-2eGuGr5WQOnco1_V-FQ",
      options: {
        inflow: "button",
        referer: "https://smartstore.naver.com/mock-store/products/100000001",
        from: "100000001",
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
