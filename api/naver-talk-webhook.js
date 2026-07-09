import { handleEvent } from "../lib/flow.js";
import { readJson, json } from "../lib/http.js";

export const config = {
  maxDuration: 30
};

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return json({
        ok: true,
        service: "naver-restock-alert-mvp",
        webhook: "/api/naver-talk-webhook",
        message: "Naver TalkTalk mock webhook is alive. Use POST with mock open/send events."
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const eventBody = await readJson(request);
    if (!eventBody) {
      return json({ error: "Invalid JSON" }, 400);
    }

    console.log("[NAVER_TALK_WEBHOOK_MOCK]", JSON.stringify(eventBody));

    const response = handleEvent(eventBody, request);
    if (!response) return new Response(null, { status: 200 });

    return json(response, 200);
  }
};
