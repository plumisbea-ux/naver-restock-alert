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
- 톡톡 챗봇 Webhook 흐름
  - 상품 context 인식
  - 품절 옵션 감지
  - `재입고 신청` 버튼 응답
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
6. 파트너센터 Webhook이 Vercel로 연결되어 있으면 톡톡 안에서 챗봇 응답 진행
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
