# Mock Payloads

## 1. 네이버 톡톡 open 이벤트

상품 상세에서 `톡톡하기`를 눌러 실제 톡톡 탭이 열리면, 네이버 톡톡이 아래와 같은 `open` webhook을 Vercel로 보낸다고 가정합니다.

```json
{
  "event": "open",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "options": {
    "inflow": "button",
    "referer": "https://plumisbea-ux.github.io/naver-restock-alert/?productNo=200000001",
    "from": "200000001",
    "friend": false,
    "under14": false,
    "under19": false
  }
}
```

처리 결과:

- `options.from`에서 상품번호 `200000001` 추출
- `data/mock-store.js`에서 `[로그인 10% 쿠폰] 케이블 니트 카라 반팔 셔츠` 조회
- 재고 0 옵션 조회
- 톡톡 첫 메시지 자동 응답

응답 예시:

```text
[로그인 10% 쿠폰] 케이블 니트 카라 반팔 셔츠 에 대해 문의를 해주셨군요!
현재 품절된 옵션이 있습니다: 블랙(031) / 004, 블랙(031) / 005, 그레이 블루(AEY) / 004
원하시는 옵션이 재입고되면 톡톡으로 알려드릴게요.

[재입고 알림받기]
[기타 문의하기]
```

## 2. 재입고 알림받기 버튼 클릭

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "재입고 알림받기",
    "code": "APPLY_RESTOCK:prod_knit_collar_001",
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
    "text": "블랙(031) / 004",
    "code": "SELECT_OPTION:prod_knit_collar_001:opt_knit_black_004",
    "inputType": "typing"
  }
}
```

처리 결과:

- `톡톡으로 재입고 알림받기`, `카카오톡으로 같이 알림받기` 버튼 응답

## 4. 톡톡만 선택

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "톡톡으로 재입고 알림받기",
    "code": "CHANNEL:NAVER_TALK_ONLY:prod_knit_collar_001:opt_knit_black_004",
    "inputType": "typing"
  }
}
```

처리 결과:

- `waitlists`에 대기자 저장
- 관리창에서 해당 옵션 재고를 `0 → 1 이상`으로 바꾸면 mock 재입고 알림 payload 저장

## 5. 카카오톡도 선택

```json
{
  "event": "send",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "textContent": {
    "text": "카카오톡으로 같이 알림받기",
    "code": "CHANNEL:KAKAO:prod_knit_collar_001:opt_knit_black_004",
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
    "text": "개인정보 수집 동의하기",
    "code": "CONSENT:KAKAO_RESTOCK_ALERT",
    "inputType": "typing"
  }
}
```

처리 결과:

- mock user에 저장된 번호 `010-1234-5678` 사용
- `waitlists`에 전화번호와 카카오 동의 여부 저장
- `consent_logs`에 동의 기록 저장
- 관리창에서 재고가 채워지면 네이버 톡톡/카카오 알림톡 mock payload 저장

---

## 최신 SMS 수신 채널 예시

이메일 수신은 현재 제외합니다. 고객 키는 `user` 값입니다.

### 톡톡 + SMS 선택

```json
{
  "event": "send",
  "user": "mock_user_001",
  "textContent": {
    "text": "톡톡 + SMS로 받기",
    "code": "CHANNEL:SMS:prod_knit_collar_001:opt_knit_black_004"
  }
}
```

### 네이버 Profile API 성공 webhook mock

```json
{
  "event": "profile",
  "user": "mock_user_001",
  "options": {
    "result": "SUCCESS",
    "cellphone": "01011110001"
  }
}
```

### 네이버 Profile API 철회 webhook mock

```json
{
  "event": "profile",
  "user": "mock_user_001",
  "options": {
    "result": "WITHDRAW",
    "withdrawals": ["cellphone"]
  }
}
```
