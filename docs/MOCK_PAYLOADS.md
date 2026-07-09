# Mock Payloads

## 1. 네이버 톡톡 open 이벤트

```json
{
  "event": "open",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "options": {
    "inflow": "button",
    "referer": "https://smartstore.naver.com/mock-store/products/100000001",
    "from": "100000001",
    "friend": false,
    "under14": false,
    "under19": false
  }
}
```

처리 결과:

- `options.from`에서 상품번호 `100000001` 추출
- `data/mock-store.js`에서 상품 조회
- 재고 0 옵션 조회
- 재입고 신청 버튼이 포함된 `textContent.quickReply` 응답

## 2. 재입고 신청 버튼 클릭

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "재입고 신청",
    "code": "APPLY_RESTOCK:prod_hoodie_001",
    "inputType": "typing"
  }
}
```

처리 결과:

- 품절 옵션 목록을 버튼으로 응답

## 3. 옵션 선택

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "M",
    "code": "SELECT_OPTION:prod_hoodie_001:opt_hoodie_m",
    "inputType": "typing"
  }
}
```

처리 결과:

- `톡톡으로 받기`, `카카오톡도` 버튼 응답

## 4. 톡톡만 선택

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "톡톡으로 받기",
    "code": "CHANNEL:NAVER_TALK_ONLY:prod_hoodie_001:opt_hoodie_m",
    "inputType": "typing"
  }
}
```

처리 결과:

- `waitlists`에 대기자 저장
- 약 10초 후 mock 재입고
- `message_logs`에 네이버 톡톡 보내기 API mock payload 저장

## 5. 카카오톡도 선택

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "카카오톡도",
    "code": "CHANNEL:KAKAO:prod_hoodie_001:opt_hoodie_m",
    "inputType": "typing"
  }
}
```

처리 결과:

- 개인정보 수집 동의 메시지 응답

## 6. 개인정보 수집 동의

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "동의하고 계속",
    "code": "CONSENT:KAKAO_RESTOCK_ALERT",
    "inputType": "typing"
  }
}
```

처리 결과:

- mock user에 저장된 번호 `010-1234-5678` 사용
- `waitlists`에 전화번호와 카카오 동의 여부 저장
- `consent_logs`에 동의 기록 저장
- 약 10초 후 네이버 톡톡/카카오 알림톡 mock payload 저장
