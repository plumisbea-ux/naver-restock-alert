import crypto from "node:crypto";
import { addMessageLog, getOptionById, getProductById, getWaitlistCount } from "./db.js";

function displayProductName(product) {
  return product.display_name || `[로그인 10% 쿠폰] ${product.product_name}`;
}

export function buildRestockText({ product, option, waitCount }) {
  return [
    `🔔 [재입고 안내]`,
    "",
    `${displayProductName(product)}`,
    `${option.original_option_name} 옵션이 재입고되었습니다.`,
    "",
    `현재 대기인원: ${waitCount}명`,
    "재고는 조기 소진될 수 있습니다.",
    `상품 확인: ${product.product_url}`
  ].join("\n");
}

export async function requestNaverProfileCellphone({ sellerId, talkUserId, waitlistId = null, productId = null, optionId = null }) {
  const body = {
    event: "profile",
    user: talkUserId,
    options: {
      field: "cellphone"
    }
  };

  const authorization = process.env.NAVER_TALK_AUTHORIZATION;
  const requestUrl = "https://gw.talk.naver.com/chatbot/v1/event";

  if (authorization && !authorization.startsWith("mock")) {
    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Authorization: authorization
        },
        body: JSON.stringify(body)
      });
      const responseText = await response.text();
      let responseBody = responseText;
      try { responseBody = JSON.parse(responseText); } catch {}

      return addMessageLog({
        sellerId,
        waitlistId,
        productId,
        optionId,
        channel: "NAVER_PROFILE",
        messageType: "PROFILE_CELLPHONE_REQUEST",
        sendStatus: response.ok ? "SENT" : "FAILED",
        errorMessage: response.ok ? null : `NAVER_PROFILE_API_${response.status}`,
        payload: { requestUrl, method: "POST", body, responseStatus: response.status, responseBody }
      });
    } catch (error) {
      return addMessageLog({
        sellerId,
        waitlistId,
        productId,
        optionId,
        channel: "NAVER_PROFILE",
        messageType: "PROFILE_CELLPHONE_REQUEST",
        sendStatus: "FAILED",
        errorMessage: error?.message || "NAVER_PROFILE_API_ERROR",
        payload: { requestUrl, method: "POST", body }
      });
    }
  }

  return addMessageLog({
    sellerId,
    waitlistId,
    productId,
    optionId,
    channel: "NAVER_PROFILE",
    messageType: "PROFILE_CELLPHONE_REQUEST",
    sendStatus: "SENT",
    payload: {
      requestUrl: `MOCK ${requestUrl}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: "MOCK_NAVER_TALK_AUTHORIZATION"
      },
      body,
      note: "NAVER_TALK_AUTHORIZATION 환경변수가 없어서 실제 Profile API 요청 대신 mock log만 저장했습니다."
    }
  });
}

export async function sendMockNaverTalk({ waitlist, waitingCount = null }) {
  const product = getProductById(waitlist.product_id);
  const option = getOptionById(waitlist.option_id);
  const waitCount = waitingCount ?? getWaitlistCount(waitlist.product_id, waitlist.option_id);
  const body = {
    event: "send",
    user: waitlist.talk_user_id,
    textContent: {
      text: buildRestockText({ product, option, waitCount })
    },
    options: {
      notification: true
    }
  };

  const authorization = process.env.NAVER_TALK_AUTHORIZATION;

  if (authorization && !authorization.startsWith("mock")) {
    const requestUrl = "https://gw.talk.naver.com/chatbot/v1/event";
    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Authorization: authorization
        },
        body: JSON.stringify(body)
      });
      const responseText = await response.text();
      let responseBody = responseText;
      try { responseBody = JSON.parse(responseText); } catch {}

      return addMessageLog({
        sellerId: waitlist.seller_id,
        waitlistId: waitlist.id,
        productId: waitlist.product_id,
        optionId: waitlist.option_id,
        channel: "NAVER_TALK",
        messageType: "RESTOCK_ALERT",
        sendStatus: response.ok ? "SENT" : "FAILED",
        errorMessage: response.ok ? null : `NAVER_SEND_API_${response.status}`,
        payload: { requestUrl, method: "POST", body, responseStatus: response.status, responseBody }
      });
    } catch (error) {
      return addMessageLog({
        sellerId: waitlist.seller_id,
        waitlistId: waitlist.id,
        productId: waitlist.product_id,
        optionId: waitlist.option_id,
        channel: "NAVER_TALK",
        messageType: "RESTOCK_ALERT",
        sendStatus: "FAILED",
        errorMessage: error?.message || "NAVER_SEND_API_ERROR",
        payload: { requestUrl, method: "POST", body }
      });
    }
  }

  const payload = {
    requestUrl: "MOCK https://gw.talk.naver.com/chatbot/v1/event",
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Authorization: "MOCK_NAVER_TALK_AUTHORIZATION"
    },
    body,
    note: "NAVER_TALK_AUTHORIZATION 환경변수가 없어서 실제 톡톡 발송 대신 mock log만 저장했습니다."
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

function makeSensSignature({ method, uri, timestamp, accessKey, secretKey }) {
  const space = " ";
  const newLine = "\n";
  const message = [method, space, uri, newLine, timestamp, newLine, accessKey].join("");
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

export async function sendMockSms({ waitlist, waitingCount = null }) {
  const product = getProductById(waitlist.product_id);
  const option = getOptionById(waitlist.option_id);
  const waitCount = waitingCount ?? getWaitlistCount(waitlist.product_id, waitlist.option_id);
  const phoneNumber = waitlist.phone_number;
  const message = buildRestockText({ product, option, waitCount });

  if (!phoneNumber) {
    return addMessageLog({
      sellerId: waitlist.seller_id,
      waitlistId: waitlist.id,
      productId: waitlist.product_id,
      optionId: waitlist.option_id,
      channel: "SMS",
      messageType: "RESTOCK_ALERT",
      sendStatus: "SKIPPED",
      errorMessage: "PHONE_NUMBER_NOT_AVAILABLE",
      payload: { note: "SMS 수신을 선택했지만 Profile API cellphone 동의/수신이 완료되지 않았습니다." }
    });
  }

  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const from = process.env.NCP_SENS_SMS_FROM;

  if (serviceId && accessKey && secretKey && from) {
    const method = "POST";
    const uri = `/sms/v2/services/${serviceId}/messages`;
    const requestUrl = `https://sens.apigw.ntruss.com${uri}`;
    const timestamp = Date.now().toString();
    const signature = makeSensSignature({ method, uri, timestamp, accessKey, secretKey });
    const body = {
      type: "SMS",
      contentType: "COMM",
      countryCode: "82",
      from: from.replace(/\D/g, ""),
      content: message.slice(0, 80),
      messages: [{ to: phoneNumber.replace(/\D/g, "") }]
    };

    try {
      const response = await fetch(requestUrl, {
        method,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-ncp-apigw-timestamp": timestamp,
          "x-ncp-iam-access-key": accessKey,
          "x-ncp-apigw-signature-v2": signature
        },
        body: JSON.stringify(body)
      });
      const responseText = await response.text();
      let responseBody = responseText;
      try { responseBody = JSON.parse(responseText); } catch {}

      return addMessageLog({
        sellerId: waitlist.seller_id,
        waitlistId: waitlist.id,
        productId: waitlist.product_id,
        optionId: waitlist.option_id,
        channel: "SMS",
        messageType: "RESTOCK_ALERT",
        sendStatus: response.ok ? "SENT" : "FAILED",
        errorMessage: response.ok ? null : `NCP_SENS_${response.status}`,
        payload: { requestUrl, method, body, responseStatus: response.status, responseBody }
      });
    } catch (error) {
      return addMessageLog({
        sellerId: waitlist.seller_id,
        waitlistId: waitlist.id,
        productId: waitlist.product_id,
        optionId: waitlist.option_id,
        channel: "SMS",
        messageType: "RESTOCK_ALERT",
        sendStatus: "FAILED",
        errorMessage: error?.message || "NCP_SENS_ERROR",
        payload: { requestUrl, method, to: phoneNumber }
      });
    }
  }

  return addMessageLog({
    sellerId: waitlist.seller_id,
    waitlistId: waitlist.id,
    productId: waitlist.product_id,
    optionId: waitlist.option_id,
    channel: "SMS",
    messageType: "RESTOCK_ALERT",
    sendStatus: "SENT",
    payload: {
      requestUrl: "MOCK NAVER Cloud SENS SMS API",
      method: "POST",
      body: {
        to: phoneNumber,
        content: message
      },
      note: "NCP SENS 환경변수가 없어서 실제 SMS 발송 대신 mock log만 저장했습니다."
    }
  });
}

// 이전 버전 호환용: 카카오 알림톡 호출이 남아 있어도 SMS mock으로 라우팅합니다.
export async function sendMockKakaoAlimtalk({ waitlist, waitingCount = null }) {
  return sendMockSms({ waitlist, waitingCount });
}
