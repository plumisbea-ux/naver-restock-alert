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


## 셀러 설명용 데모 구성

이번 버전은 단순 테스트 페이지가 아니라, 셀러에게 서비스를 보여주고 설명하기 위한 데모 랜딩 영역을 포함합니다.

상단 히어로 섹션은 다음 메시지를 전달하도록 구성했습니다.

```text
품절된 옵션도 구매 의도로 저장합니다.
고객이 품절 옵션을 보고 나가기 전에 톡톡 챗봇으로 재입고 알림 대기자를 만들고, 재입고 순간 다시 불러오는 서비스입니다.
```

화면에서 바로 설명할 수 있는 포인트:

```text
1. 상품 context 인식
2. 옵션별 품절 감지
3. 톡톡 재입고 알림 신청
4. 고객별 대기자 저장
5. 관리창 재고 변경
6. 재입고 알림 발송
```

셀러 미팅에서는 상단 설명 → 상품 상세 → 톡톡하기 → 관리창 재고 변경 순서로 시연하면 됩니다.

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
git commit -m "Polish seller demo landing section"
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
lib/mockSenders.js                  톡톡/Profile API/SMS mock 또는 실제 발송 payload 생성
```

## 이미지 관련

상품 이미지는 네이버 상품 이미지를 복사하지 않고, 외부 공개 의류 사진 URL을 mock 상품 이미지로 연결했습니다. 실제 서비스에서는 판매자 상품 이미지 URL을 네이버 커머스 API 또는 직접 등록 DB에서 받아오면 됩니다.


## GitHub Pages 화면이 비어 보일 때

이번 버전부터 GitHub Pages 배포 워크플로가 `index.html`뿐 아니라 `data/mock-store.js`도 함께 배포합니다.
이 파일이 Pages artifact에 없으면 `index.html`의 `import { seedData } from "./data/mock-store.js";`가 실패해서 메뉴, 상품 카드, 상세 화면 버튼이 모두 작동하지 않습니다.

적용 후 GitHub Actions의 `Deploy static dashboard to GitHub Pages` 로그에서 아래 파일이 보여야 정상입니다.

```text
_site/index.html
_site/data/mock-store.js
```

이미 이전 버전이 배포되어 있다면 `pages.yml` 변경 사항을 push한 뒤 Actions가 다시 성공할 때까지 기다리세요.

## 이번 버전 업데이트: 이전으로 돌아가기 버튼

모든 톡톡 응답 quickReply에 `이전으로 돌아가기` 버튼을 추가했습니다.

동작 기준:

```text
SMS Profile API 동의 대기 단계 → 수신 채널 선택 단계로 복귀
수신 채널 선택 단계 → 품절 옵션 선택 단계로 복귀
옵션 선택/기타 문의/신청 완료 단계 → 상품 첫 안내 메시지로 복귀
상품 context 없음 → 상품 선택 안내 유지
```

관련 파일:

```text
lib/naverTalkMessages.js
lib/naverTalkParser.js
lib/flow.js
```

## 이번 버전 업데이트: 고객 식별 + SMS 구조

이번 버전은 고객을 닉네임/전화번호가 아니라 네이버 톡톡 Webhook의 `user` 값으로 구분합니다.

```text
open/send webhook body.user
→ talk_user_id로 저장
→ customer session과 waitlist의 기본 고객 키로 사용
→ 재입고 시 waitlist.talk_user_id로 톡톡 보내기 API 발송
```

수신 채널은 일단 이메일을 제외하고 아래 2개만 사용합니다.

```text
NAVER_TALK_ONLY      톡톡만 받기
NAVER_TALK_AND_SMS   톡톡 + SMS로 받기
```

`톡톡 + SMS로 받기`를 선택하면 서버는 네이버 톡톡 Profile API로 `cellphone` 제공을 요청합니다. 실제 네이버 톡톡에서는 사용자가 개인정보 제3자 제공 동의창에 동의해야 휴대전화번호가 `profile` webhook으로 다시 들어옵니다.

```text
고객이 톡톡 + SMS 선택
→ /chatbot/v1/event 로 event: profile, options.field: cellphone 요청
→ 네이버 톡톡 동의 UI
→ event: profile, options.result: SUCCESS, options.cellphone 수신
→ waitlist.phone_number 저장
→ 재입고 시 톡톡 + SMS 발송
```

Vercel 환경변수는 아래를 사용합니다.

```env
NAVER_TALK_AUTHORIZATION=ct_xxxxxxxxxxxxxxxxx
NCP_SENS_SERVICE_ID=ncp:sms:kr:000000000000:your_service
NCP_ACCESS_KEY=your_access_key
NCP_SECRET_KEY=your_secret_key
NCP_SENS_SMS_FROM=01012345678
```

환경변수가 없으면 실제 외부 발송 없이 mock 발송 로그만 남습니다.

