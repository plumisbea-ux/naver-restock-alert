# SMS/Profile API 연동 메모

이번 MVP는 고객 식별을 `nickname`이나 전화번호가 아니라 네이버 톡톡 Webhook의 `user` 값으로 처리한다.

```text
body.user → talk_user_id
```

## 수신 채널

```text
NAVER_TALK_ONLY      톡톡만 받기
NAVER_TALK_AND_SMS   톡톡 + SMS로 받기
```

이메일 수신은 현재 제외한다.

## 톡톡 + SMS 흐름

```text
1. 고객이 상품 상세에서 톡톡 열기
2. open webhook의 user + 상품 context 저장
3. 고객이 품절 옵션 선택
4. 고객이 “톡톡 + SMS로 받기” 선택
5. 서버가 네이버 톡톡 보내기 API로 event: profile / field: cellphone 요청
6. 고객이 네이버 동의 UI에서 개인정보 제3자 제공 동의
7. 네이버가 event: profile / result: SUCCESS / cellphone을 webhook으로 전달
8. waitlist.phone_number 저장
9. 재고가 0 → 1 이상으로 변경되면 톡톡 + SMS 발송
```

## Vercel 환경변수

```env
NAVER_TALK_AUTHORIZATION=ct_xxxxxxxxxxxxxxxxx
NCP_SENS_SERVICE_ID=ncp:sms:kr:000000000000:your_service
NCP_ACCESS_KEY=your_access_key
NCP_SECRET_KEY=your_secret_key
NCP_SENS_SMS_FROM=01012345678
```

환경변수가 없으면 실제 외부 발송 대신 `message_logs`에 mock payload만 저장한다.

## Profile 철회 처리

네이버에서 아래 형태의 profile withdraw 이벤트가 들어오면 저장된 휴대전화번호를 삭제하고, 이후 알림은 톡톡만 유지한다.

```json
{
  "event": "profile",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "options": {
    "result": "WITHDRAW",
    "withdrawals": ["cellphone"]
  }
}
```
