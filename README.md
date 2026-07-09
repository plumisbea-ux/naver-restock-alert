# Naver Restock Alert MVP

네이버 스마트스토어 품절 옵션을 톡톡 재입고 알림 신청으로 전환하는 1차 MVP입니다.

이번 버전은 실제 네이버 커머스 API를 붙이기 전 단계로, 상품/옵션/재고/고객/user/payload를 모두 mock DB 형태로 구성했습니다. 이후 실제 커머스 API와 톡톡 보내기 API로 교체하기 쉽도록 데이터 구조를 유지했습니다.

## 이번 버전 핵심 변경

- GitHub Pages 루트에 가상 네이버 스마트스토어 화면 구현
- 베스트, 신상품, 남성, 여성, 키즈, 아울렛 메뉴 이동 구현
- 스토어 대표 제목 `PLUMIS WEAR` 클릭 시 베스트로 이동
- 옷 카테고리 상품 8개 구성
- 상품별 실제 의류 이미지 URL 적용
- 상품 상세 화면에서 색상/사이즈 옵션 선택 가능
- 옵션 조합별 재고 mock DB 관리
- 일부 옵션 품절 표시
- 톡톡하기 클릭 시 실제 톡톡 URL 새 탭 열기
- 동시에 Vercel 서버에 mock open webhook 전송
- 테스트 고객 User 1/2/3/4/5 선택 기능 추가
- 우측 관리창에서 재고를 0 → 1 이상으로 바꾸면 해당 옵션 대기자에게 재입고 알림 발송
- 기존 10초 자동 재입고 제거
- `/api/naver-talk-webhook` 단일 엔드포인트에서 톡톡 이벤트 + 관리자 상태 + 재고 변경 처리

## 화면 주소

GitHub Pages:

```text
https://plumisbea-ux.github.io/naver-restock-alert/
```

Vercel API:

```text
https://naver-restock-alert.vercel.app/api/naver-talk-webhook
```

네이버 톡톡 Webhook URL에는 GitHub Pages가 아니라 Vercel API 주소를 넣어야 합니다.

```text
https://naver-restock-alert.vercel.app/api/naver-talk-webhook
```

## 사용 흐름

1. GitHub Pages에서 가상 스마트스토어 접속
2. 베스트/신상품/남성/여성/키즈/아울렛 메뉴 이동
3. 상품 클릭
4. 색상/사이즈 옵션 확인
5. 품절 옵션이 있으면 `톡톡하기` 클릭
6. 실제 톡톡 탭 열림
7. 동시에 Vercel에 mock open 이벤트 전송
8. 실제 톡톡에서는 네이버가 보낸 open webhook을 Vercel이 받아 첫 메시지 응답
9. 고객이 재입고 알림 신청 진행
10. 우측 관리창에서 해당 옵션 재고를 0 → 1 이상으로 변경
11. 저장된 waitlist의 talk_user_id로 재입고 알림 발송

## 테스트 고객 User 1/2/3 구조

페이지 상단에서 User 1/2/3/4/5를 선택할 수 있습니다.

이 값은 GitHub Pages가 Vercel에 보내는 mock open/send 이벤트의 `user`로 들어갑니다.

예:

```json
{
  "event": "open",
  "user": "mock_user_001",
  "options": {
    "inflow": "button",
    "from": "200000001",
    "referer": "https://plumisbea-ux.github.io/naver-restock-alert/?productNo=200000001"
  }
}
```

단, 실제 네이버 톡톡 탭 안에서는 네이버가 실제 로그인 고객의 `user` 값을 생성합니다. 그래서 User 1/2/3을 선택한다고 실제 톡톡 안의 네이버 사용자 식별값이 바뀌지는 않습니다. 실제 톡톡에서 여러 고객을 테스트하려면 서로 다른 네이버 계정 또는 브라우저 프로필이 필요합니다.

## 서버 mock 대기자 생성

실제 톡톡 계정을 여러 개 만들기 전, 테스트용으로 우측 관리창의 `선택 유저 대기자 생성` 버튼을 사용할 수 있습니다.

동작:

```text
선택 상품
→ 선택된 품절 옵션 또는 첫 번째 품절 옵션
→ 선택 User 1/2/3...
→ Vercel 서버에 open/send 이벤트를 순서대로 mock 전송
→ waitlists 저장
```

그다음 해당 옵션 재고를 0에서 1 이상으로 변경하면 재입고 알림 payload가 생성됩니다.

## 실제 톡톡 메시지 발송 조건

Vercel 환경변수에 네이버 톡톡 보내기 API Authorization을 넣어야 실제 톡톡으로 발송됩니다.

```text
NAVER_TALK_AUTHORIZATION=ct_xxxxxxxxxxxxxxxxx
```

환경변수 추가 후 Vercel에서 Redeploy가 필요합니다.

환경변수가 없으면 발송 로그만 mock으로 생성됩니다.

## 배포 방법

ZIP 내용물을 GitHub 저장소 루트에 덮어쓴 뒤:

```bash
git add .
git commit -m "Update smartstore navigation and mock users"
git push origin main
```

GitHub Pages는 `.github/workflows/pages.yml`로 자동 배포됩니다.

Vercel은 GitHub 저장소 연결 상태라면 push 후 자동 재배포됩니다.

## 주요 파일

```text
index.html                         가상 스마트스토어 + 관리자 패널
api/naver-talk-webhook.js           톡톡 webhook + 관리자 상태 + 재고 변경 단일 엔드포인트
data/mock-store.js                  상품/옵션/재고/테스트 고객 mock DB
lib/flow.js                         톡톡 대화 흐름
lib/naverTalkParser.js              open/send 이벤트에서 productNo와 intent 파싱
lib/restock.js                      재고 0 → 1 이상 변경 시 대기자 알림 발송
lib/mockSenders.js                  톡톡/카카오 mock 또는 실제 발송 payload 생성
```

## 이미지 관련

상품 이미지는 네이버 상품 이미지를 복사하지 않고, 외부 공개 의류 사진 URL을 mock 상품 이미지로 연결했습니다. 실제 서비스에서는 판매자 상품 이미지 URL을 네이버 커머스 API 또는 직접 등록 DB에서 받아오면 됩니다.
