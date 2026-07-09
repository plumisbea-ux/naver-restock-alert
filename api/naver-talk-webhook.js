export default {
  async fetch(request) {
    // 브라우저에서 열어봤을 때 살아있는지 확인용
    if (request.method === "GET") {
      return Response.json({
        ok: true,
        message: "Naver Talk webhook is alive",
      });
    }

    // 네이버 톡톡 Webhook은 POST로 들어와야 함
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method Not Allowed" },
        { status: 405 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch (error) {
      return Response.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    console.log("Naver Talk event:", JSON.stringify(body));

    const event = body.event;

    // 사용자가 메시지를 보냈을 때
    if (event === "send") {
      const userText = body.textContent?.text ?? "";

      return Response.json({
        event: "send",
        textContent: {
          text: `받았어요: ${userText}`,
        },
      });
    }

    // 채팅창 열기, 친구추가, 나가기 등은 일단 정상 수신만 처리
    return Response.json({
      ok: true,
    });
  },
};
