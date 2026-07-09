# Naver Restock Alert MVP

네이버 스마트스토어의 품절 옵션 고객을 톡톡 재입고 알림 대기자로 전환하는 1차 MVP입니다.

이번 버전은 **GitHub Pages용 mock 스마트스토어 화면**과 **Vercel용 mock Webhook/API**를 분리했습니다.

## 현재 구현 범위

- 옷 카테고리 mock 스마트스토어 상품 8개
- 상품 상세 화면, 색상/사이즈 옵션 선택 UI
- 옵션 조합별 재고 mock DB 관리
- 품절 옵션 표시
- `톡톡하기` 클릭 시 실제 톡톡 URL 새 탭 열기
- 동시에 mock `open` webhook payload 생성
- 실제 톡톡 `open` webhook 수신 시 첫 메시지 자동 응답
  - 예: `[로그인 10% 쿠폰] 케이블 니트 카라 반팔 셔츠 에 대해 문의를 해주셨군요!`
  - `재입고 알림받기` / `기타 문의하기` 버튼 제공
- 톡톡 챗봇 Webhook 흐름
  - 상품 context 인식
  - 품절 옵션 감지
  - `재입고 알림받기` 버튼 응답
  - 품절 옵션 버튼 응답
  - `톡톡으로 받기` / `카카오톡도` 버튼 응답
  - 카카오 선택 시 개인정보 수집 동의 및 전화번호 저장
- 우측 관리창에서 옵션 재고 수동 변경
- 재고가 `0 → 1 이상`이 되는 순간 해당 옵션 대기자에게 mock 톡톡/카카오 재입고 알림 발송 로그 생성

## 중요한 구조

```text
GitHub Pages
- mock 스마트스토어 화면
- 상품 목록/상세/옵션 선택
- 우측 재고 관리창
- 실제 톡톡 탭 열기

Vercel
- /api/naver-talk-webhook
- /api/admin-state
- /api/update-stock
- /api/reset-mock
- mock DB와 mock send payload 처리
```

GitHub Pages만으로는 네이버 톡톡 Webhook을 받을 수 없습니다. GitHub Pages는 정적 페이지이기 때문입니다. 실제 톡톡 챗봇 응답은 네이버 톡톡 파트너센터의 Webhook URL을 Vercel API로 등록해야 동작합니다.

## 배포 순서

### 1. GitHub에 업로드

```bash
git add .
git commit -m "Implement smartstore mock and manual restock admin"
git push origin main
```

### 2. GitHub Pages 켜기

저장소에서:

```text
Settings
→ Pages
→ Build and deployment
→ Source: GitHub Actions
```

배포 후 예시 주소:

```text
https://plumisbea-ux.github.io/naver-restock-alert/
```

### 3. Vercel 연결

Vercel에서 같은 GitHub 저장소를 Import 합니다.

배포 후 API 주소 예시:

```text
https://naver-restock-alert.vercel.app/api/naver-talk-webhook
```

### 4. GitHub Pages 화면에서 API Base 확인

우측 `관리창`을 열고 API Base가 아래처럼 되어 있는지 확인합니다.

```text
https://naver-restock-alert.vercel.app
```

프로젝트명이 다르면 본인의 Vercel 주소로 바꿔 저장하세요.

## 네이버 톡톡 설정

네이버 톡톡 파트너센터에서 Webhook URL에 아래 주소를 등록합니다.

```text
https://naver-restock-alert.vercel.app/api/naver-talk-webhook
```

처음에는 이벤트를 아래만 켜는 것을 권장합니다.

```text
open
send
```

`echo`는 챗봇이 보낸 메시지가 다시 들어오는 이벤트라 반복 응답 위험이 있어 나중에 켜는 것을 권장합니다.

## 실제 테스트 흐름

1. GitHub Pages mock 스마트스토어 접속
2. 상품 상세 진입
3. 품절 옵션 확인
4. `톡톡하기` 클릭
5. 실제 톡톡 탭이 새 창으로 열림
6. 네이버 톡톡이 `open` webhook을 Vercel로 보내면 챗봇이 아래 첫 메시지를 자동 응답

```text
[로그인 10% 쿠폰] 케이블 니트 카라 반팔 셔츠 에 대해 문의를 해주셨군요!
현재 품절된 옵션이 있습니다: 블랙(031) / 004, 블랙(031) / 005, 그레이 블루(AEY) / 004
원하시는 옵션이 재입고되면 톡톡으로 알려드릴게요.

[재입고 알림받기]
[기타 문의하기]
```

7. 고객이 재입고 알림 신청
8. GitHub Pages 우측 관리창에서 해당 옵션 재고를 `0 → 1 이상`으로 수정
9. Vercel mock API가 해당 대기자에게 재입고 알림 payload를 생성
10. 우측 관리창의 발송 로그에서 확인

## API 목록

### `GET /api/admin-state`

현재 mock DB 상태를 반환합니다.

### `POST /api/naver-talk-webhook`

네이버 톡톡 Webhook mock/실제 이벤트를 받습니다.

예시 open:

```json
{
  "event": "open",
  "user": "mock_page_user",
  "options": {
    "inflow": "button",
    "referer": "https://plumisbea-ux.github.io/naver-restock-alert/?productNo=200000001",
    "from": "200000001"
  }
}
```

### `POST /api/update-stock`

관리자가 재고를 바꿉니다. `0 → 1 이상`으로 바뀌면 대기자 알림이 발송됩니다.

```json
{
  "option_id": "opt_knit_black_004",
  "stock_quantity": 5
}
```

### `POST /api/reset-mock`

mock DB를 초기 상태로 되돌립니다.

## 실제 API 교체 위치

현재는 모든 네이버/카카오 API 호출을 mock payload로 저장합니다.

실제 발송으로 바꿀 위치:

```text
lib/mockSenders.js
```

실제 DB로 바꿀 위치:

```text
lib/db.js
```

스마트스토어 상품/옵션/재고 API로 바꿀 위치:

```text
data/mock-store.js
api/update-stock.js
```

## 한계

- GitHub Pages 화면에서 실제 톡톡 UI 내부 메시지를 직접 조작할 수는 없습니다.
- 실제 톡톡 대화는 네이버 톡톡이 Webhook 이벤트를 Vercel로 보내야 시작됩니다.
- Vercel의 메모리 mock DB는 영구 저장소가 아닙니다. 베타 운영 전에는 Supabase/Postgres/Redis 등으로 교체해야 합니다.


## 이번 수정 핵심

`open` webhook이 들어오면 상품번호를 `options.from` 또는 `options.referer`에서 읽고, 해당 상품의 품절 옵션을 조회한 뒤 첫 메시지를 자동으로 반환합니다.

```json
{
  "event": "open",
  "user": "al-2eGuGr5WQOnco1_V-FQ",
  "options": {
    "from": "200000001",
    "referer": "https://plumisbea-ux.github.io/naver-restock-alert/?productNo=200000001"
  }
}
```

위 이벤트는 아래 응답으로 이어집니다.

```text
[로그인 10% 쿠폰] 케이블 니트 카라 반팔 셔츠 에 대해 문의를 해주셨군요!
현재 품절된 옵션이 있습니다: 블랙(031) / 004, 블랙(031) / 005, 그레이 블루(AEY) / 004
원하시는 옵션이 재입고되면 톡톡으로 알려드릴게요.

[재입고 알림받기]
[기타 문의하기]
```

## 상품별 open webhook 처리

`open` 이벤트 처리는 특정 상품번호에 하드코딩되어 있지 않습니다.

네이버 톡톡에서 아래처럼 상품번호가 들어오면:

```json
{
  "event": "open",
  "user": "USER_ID",
  "options": {
    "inflow": "button",
    "referer": "https://plumisbea-ux.github.io/naver-restock-alert/?productNo=200000003",
    "from": "200000003"
  }
}
```

서버는 `options.from` 또는 `options.referer`의 `productNo`를 읽고, mock DB의 해당 상품을 찾아서 동일한 흐름으로 첫 메시지를 반환합니다.

```text
[로그인 10% 쿠폰] 해당 상품명 에 대해 문의를 해주셨군요!
[재입고 알림받기]
[기타 문의하기]
```

테스트 URL:

```text
/api/test-open?productNo=200000001
/api/test-open?productNo=200000002
/api/test-open?productNo=200000003
/api/test-open-all
```

GitHub Pages의 상품 상세에서 `톡톡하기`를 누를 때도 현재 보고 있는 상품의 `product_no`로 mock open payload를 생성합니다.


## 이번 디버그 수정

### 1. 상품 context 인식 실패 수정

기존 GitHub Pages의 `톡톡하기` 버튼은 실제 톡톡 URL을 아래처럼 열고 있었습니다.

```text
https://talk.naver.com/ct/wocay2r
```

이러면 실제 네이버 `open` webhook에 상품번호가 안 들어올 수 있습니다. 그래서 챗봇이 어떤 상품에서 들어왔는지 모르고 `상품 정보를 자동으로 확인하지 못했습니다`를 반환합니다.

수정 후에는 실제 톡톡 URL을 아래처럼 엽니다.

```text
https://talk.naver.com/ct/wocay2r?from=200000001&productNo=200000001
```

서버는 `options.from`, `options.referer`, `productNo`, `/products/{상품번호}`를 모두 후보로 보고 mock DB에 존재하는 상품번호를 찾아 첫 메시지를 반환합니다.

### 2. 재입고 알림 실제 발송 조건

`/api/update-stock`에서 재고가 `0 → 1 이상`으로 바뀌면 대기자에게 알림을 보냅니다. 다만 실제 톡톡 화면으로 푸시하려면 Vercel 환경변수에 아래 값을 넣어야 합니다.

```text
NAVER_TALK_AUTHORIZATION=ct_...
```

이 값이 없으면 실제 네이버 보내기 API를 호출하지 않고 `message_logs`에 mock payload만 저장합니다.

Vercel 설정 위치:

```text
Vercel Project → Settings → Environment Variables → NAVER_TALK_AUTHORIZATION 추가 → Redeploy
```


## 고객별 context 저장 방식

이번 버전부터 `open` / `send` 이벤트의 `user` 값을 기준으로 고객별 상태를 저장합니다.

저장되는 항목:

```text
sessions[USER_ID]
- 현재 단계
- 현재 상품
- 선택 옵션
- 카카오 동의/전화번호 입력 상태

customer_contexts[USER_ID]
- 마지막 open 상품번호
- 마지막 open 상품 ID
- 마지막 open payload
- open 횟수
```

따라서 고객 A가 200000001 상품에서 톡톡을 열고, 고객 B가 200000004 상품에서 톡톡을 열면 각 고객에게 서로 다른 상품 기준으로 메시지가 이어집니다.

재입고 알림 발송 시에는 `waitlists.talk_user_id`에 저장된 고객 식별값으로 보내기 API payload를 만듭니다.

```json
{
  "event": "send",
  "user": "USER_ID",
  "textContent": {
    "text": "[재입고 안내] ..."
  }
}
```

## 단일 Webhook API에서 관리자 기능까지 처리

Vercel 메모리 mock DB는 함수별로 분리될 수 있으므로, GitHub Pages 관리창은 이제 아래 단일 엔드포인트만 사용합니다.

```text
/api/naver-talk-webhook
```

관리자 상태 조회:

```text
GET /api/naver-talk-webhook?mode=admin-state
```

재고 수정:

```json
{
  "event": "admin.update_stock",
  "option_id": "opt_knit_black_004",
  "stock_quantity": 5
}
```

초기화:

```json
{
  "event": "admin.reset"
}
```

이렇게 하면 실제 톡톡 Webhook으로 저장된 고객 대기자와 관리창에서 변경한 재고가 같은 mock DB 흐름을 타게 됩니다.

## 실제 톡톡 보내기 API Authorization

Vercel 환경변수에 아래 값을 추가해야 실제 재입고 알림이 톡톡으로 발송됩니다.

```text
NAVER_TALK_AUTHORIZATION=네이버_톡톡_보내기_API_Authorization
```

환경변수 추가 후에는 Vercel에서 Redeploy 하세요. 환경변수가 없으면 실제 발송 대신 mock 발송 로그만 생성됩니다.
