import { addMessageLog, getOptionById, getProductById, getWaitlistCount } from "./db.js";

export function buildRestockText({ product, option, waitCount }) {
  return [
    `[재입고 안내]`,
    `${product.product_name} ${option.original_option_name} 옵션이 재입고되었습니다.`,
    `대기인원 ${waitCount}명`,
    "재고는 조기 소진될 수 있습니다.",
    `상품 확인: ${product.product_url}`
  ].join("\n");
}

export async function sendMockNaverTalk({ waitlist, waitingCount = null }) {
  const product = getProductById(waitlist.product_id);
  const option = getOptionById(waitlist.option_id);
  const waitCount = waitingCount ?? getWaitlistCount(waitlist.product_id, waitlist.option_id);
  const payload = {
    requestUrl: "MOCK https://gw.talk.naver.com/chatbot/v1/event",
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Authorization: "MOCK_NAVER_TALK_AUTHORIZATION"
    },
    body: {
      event: "send",
      user: waitlist.talk_user_id,
      textContent: {
        text: buildRestockText({ product, option, waitCount })
      },
      options: {
        notification: true
      }
    }
  };

  return addMessageLog({
    sellerId: waitlist.seller_id,
    waitlistId: waitlist.id,
    productId: waitlist.product_id,
    optionId: waitlist.option_id,
    channel: "NAVER_TALK",
    messageType: "RESTOCK_ALERT",
    sendStatus: "SENT",
    payload
  });
}

export async function sendMockKakaoAlimtalk({ waitlist, waitingCount = null }) {
  const product = getProductById(waitlist.product_id);
  const option = getOptionById(waitlist.option_id);
  const waitCount = waitingCount ?? getWaitlistCount(waitlist.product_id, waitlist.option_id);
  const payload = {
    requestUrl: "MOCK Kakao Alimtalk Provider API",
    method: "POST",
    headers: {
      Authorization: "MOCK_KAKAO_ALIMTALK_API_KEY"
    },
    body: {
      templateCode: "RESTOCK_ALERT_V1",
      phoneNumber: waitlist.phone_number,
      variables: {
        상품명: product.product_name,
        옵션명: option.original_option_name,
        대기인원: String(waitCount),
        상품URL: product.product_url
      },
      message: buildRestockText({ product, option, waitCount })
    }
  };

  return addMessageLog({
    sellerId: waitlist.seller_id,
    waitlistId: waitlist.id,
    productId: waitlist.product_id,
    optionId: waitlist.option_id,
    channel: "KAKAO_ALIMTALK",
    messageType: "RESTOCK_ALERT",
    sendStatus: "SENT",
    payload
  });
}
