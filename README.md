# 네이버 톡톡 재입고 알림 MVP

네이버 스마트스토어 품절 옵션 고객을 톡톡 재입고 알림 대기자로 저장하고, mock 재입고 후 톡톡/카카오 알림톡 발송 payload를 기록하는 1차 MVP입니다.

이 버전은 실제 네이버 커머스 API, 네이버 톡톡 보내기 API, 카카오 알림톡 API를 호출하지 않습니다. 대신 실제 연동 시 주고받을 데이터 형태에 가깝게 mock 데이터를 구성하고, 나중에 실제 API 함수만 교체할 수 있도록 분리했습니다.

## 구현된 1차 기능

- 고객이 특정 상품을 타고 톡톡 페이지를 연 open 이벤트 인식
- `options.from` 또는 `referer` URL에서 상품번호 추출
- mock 상품/옵션/재고 데이터 조회
- 품절 옵션 탐지
- `재입고 신청` 퀵버튼 제공
- 품절 옵션을 버튼으로 제공
- `톡톡으로 받기` / `카카오톡도` 채널 선택
- 카카오 선택 시 개인정보 수집 동의 플로우
- mock 전화번호 저장
- 대기자 저장
- 신청 후 약 10초 뒤 mock 재입고 처리
- mock 네이버 톡톡 보내기 API payload 로그 생성
- 카카오 동의 시 mock 카카오 알림톡 payload 로그 생성
- 관리자 대시보드 및 대화 시뮬레이터

## 파일 구조

```text
.
├── api
│   ├── admin-state.js
│   ├── mock-restock-tick.js
│   ├── naver-talk-webhook.js
│   ├── reset-mock.js
│   ├── test-open.js
│   └── test-send.js
├── lib
│   ├── db.js
│   ├── flow.js
│   ├── http.js
│   ├── mockSenders.js
│   ├── naverTalkMessages.js
│   ├── naverTalkParser.js
│   └── restock.js
├── data
│   └── mock-store.js
├── docs
│   ├── MOCK_PAYLOADS.md
│   └── REAL_API_SWAP_GUIDE.md
├── index.html
├── package.json
├── vercel.json
└── .env.example
```

## Vercel 배포 방법

### 1. GitHub 저장소 생성

```bash
git init
git add .
git commit -m "initial mock restock alert mvp"
git branch -M main
git remote add origin https://github.com/YOUR_ID/naver-restock-alert-mvp.git
git push -u origin main
```

### 2. Vercel에서 Import

1. Vercel 로그인
2. Add New → Project
3. GitHub 저장소 선택
4. Deploy

배포 후 루트 URL에 접속하면 대시보드가 열립니다.

```text
https://YOUR_PROJECT.vercel.app/
```

네이버 톡톡 Webhook URL에는 아래 주소를 넣으면 됩니다.

```text
https://YOUR_PROJECT.vercel.app/api/naver-talk-webhook
```

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 접속:

```text
http://localhost:3000
```

## 테스트 흐름

1. 루트 대시보드 접속
2. `상품 타고 톡톡 열기` 클릭
3. `재입고 신청` 클릭
4. 품절 옵션 `M` 또는 `XL` 클릭
5. `톡톡으로 받기` 또는 `카카오톡도` 클릭
6. 카카오톡을 선택한 경우 `동의하고 계속` 클릭
7. 약 10초 후 관리자 대시보드의 발송 로그 확인

## 직접 API 테스트

### 상품 context 있는 open 이벤트

```bash
curl -X POST \
  -H "Content-Type: application/json;charset=UTF-8" \
  -d '{
    "event":"open",
    "user":"al-2eGuGr5WQOnco1_V-FQ",
    "options":{
      "inflow":"button",
      "referer":"https://smartstore.naver.com/mock-store/products/100000001",
      "from":"100000001",
      "friend":false,
      "under14":false,
      "under19":false
    }
  }' \
  "http://localhost:3000/api/naver-talk-webhook"
```

### 버튼 클릭 mock send 이벤트

```bash
curl -X POST \
  -H "Content-Type: application/json;charset=UTF-8" \
  -d '{
    "event":"send",
    "user":"al-2eGuGr5WQOnco1_V-FQ",
    "textContent":{
      "text":"재입고 신청",
      "code":"APPLY_RESTOCK:prod_hoodie_001",
      "inputType":"typing"
    }
  }' \
  "http://localhost:3000/api/naver-talk-webhook"
```

## 실제 API로 바꿀 위치

- 네이버 톡톡 보내기 API: `lib/mockSenders.js`의 `sendMockNaverTalk()` 교체
- 카카오 알림톡 API: `lib/mockSenders.js`의 `sendMockKakaoAlimtalk()` 교체
- 네이버 커머스 상품/재고 API: `data/mock-store.js`와 `lib/db.js`를 실제 DB/API 조회로 교체
- 영구 DB: 현재는 Vercel Function 메모리 mock DB입니다. 운영 전 Supabase/Postgres/Redis 등으로 교체하세요.

## 주의사항

현재 mock DB는 메모리 기반입니다. Vercel 서버리스 인스턴스가 재시작되면 데이터가 초기화될 수 있습니다. 1차 검증용으로만 사용하고, 베타 운영 전에는 DB를 붙이세요.

카카오 알림톡 문구는 정보성 문구만 넣는 전제로 작성했습니다. 실제 운영 시 템플릿 승인과 개인정보 수집/이용 동의 절차를 반드시 확인하세요.
