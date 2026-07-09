# 실제 API 교체 가이드

## 1. 네이버 톡톡 Webhook

현재 엔드포인트:

```text
/api/naver-talk-webhook
```

이 엔드포인트는 실제 네이버 톡톡 Webhook URL로 그대로 사용할 수 있습니다.

처리 이벤트:

- `open`
- `send`

권장 이벤트 선택:

- 1차 테스트: `open`, `send`
- `echo`는 무한 반복 위험이 있으므로 1차에서는 끄기

## 2. 네이버 톡톡 보내기 API 교체

현재 mock 함수:

```text
lib/mockSenders.js
sendMockNaverTalk()
```

실제 전송으로 바꿀 때:

```js
await fetch("https://gw.talk.naver.com/chatbot/v1/event", {
  method: "POST",
  headers: {
    "Content-Type": "application/json;charset=UTF-8",
    "Authorization": process.env.NAVER_TALK_AUTHORIZATION
  },
  body: JSON.stringify({
    event: "send",
    user: waitlist.talk_user_id,
    textContent: {
      text: "신청하신 상품이 재입고되었습니다."
    },
    options: {
      notification: true
    }
  })
});
```

## 3. 카카오 알림톡 교체

현재 mock 함수:

```text
lib/mockSenders.js
sendMockKakaoAlimtalk()
```

실제 연동 시 필요한 것:

- 알림톡 발송 대행사 또는 카카오 비즈메시지 계약
- 발신 프로필
- 승인된 템플릿
- 고객 휴대전화번호
- 개인정보 수집/이용 동의 로그

## 4. 상품/재고 데이터 교체

현재 mock 데이터:

```text
data/mock-store.js
```

운영 교체 대상:

- 상품 목록 조회
- 옵션 목록 조회
- 현재 재고 조회
- 이전 재고와 비교
- 재고 0 → 1 이상 변화 감지

`lib/db.js`의 아래 함수들을 실제 DB/API로 바꾸면 됩니다.

```text
getProductByProductNo()
getProductOptions()
getOutOfStockOptions()
getOptionById()
upsertWaitlist()
addConsentLog()
addMessageLog()
```

## 5. DB 교체

현재는 Vercel 메모리에 저장합니다.

베타 운영 전 권장:

- Supabase Postgres
- Neon Postgres
- Vercel Postgres
- Upstash Redis

최소 필요 테이블:

- sellers
- products
- product_options
- waitlists
- consent_logs
- message_logs
- stock_events
- notification_queue
