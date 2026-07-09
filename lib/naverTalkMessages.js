function button(title, code = null) {
  return {
    type: "TEXT",
    data: {
      title,
      ...(code ? { code } : {})
    }
  };
}

export function backButton() {
  return button("↩️ 이전으로 돌아가기", "BACK");
}

function withBackButton(buttons = [], includeBack = true) {
  const list = Array.isArray(buttons) ? [...buttons] : [];
  if (!includeBack) return list;
  const alreadyHasBack = list.some((item) => item?.data?.code === "BACK" || item?.data?.title === "이전으로 돌아가기");
  if (!alreadyHasBack) list.push(backButton());
  return list;
}

export function textMessage(text, buttons = [], options = {}) {
  const finalButtons = withBackButton(buttons, options.includeBack !== false);
  const message = {
    event: "send",
    textContent: {
      text
    }
  };

  if (finalButtons.length > 0) {
    message.textContent.quickReply = {
      buttonList: finalButtons
    };
  }

  return message;
}

function displayProductName(product) {
  return product.display_name || `[로그인 10% 쿠폰] ${product.product_name}`;
}

export function restockApplyPrompt(product, outOfStockOptions) {
  const optionNames = outOfStockOptions.map((option) => option.original_option_name).join(", ");
  const text = [
    `👋 ${displayProductName(product)} 에 대해 문의를 해주셨군요!`,
    "",
    "🚫 현재 품절된 옵션이 있습니다.",
    `옵션: ${optionNames}`,
    "",
    "🔔 원하시는 옵션이 재입고되면 톡톡 또는 SMS로 알려드릴게요."
  ].join("\n");

  return textMessage(text, [
    button("🔔 재입고 알림받기", `APPLY_RESTOCK:${product.id}`),
    button("💬 기타 문의하기", `OTHER_INQUIRY:${product.id}`)
  ]);
}

export function noStockPrompt(product) {
  const text = [
    `👋 ${displayProductName(product)} 에 대해 문의를 해주셨군요!`,
    "",
    "🚫 현재 이 상품은 전체 품절 상태입니다.",
    "🔔 재입고 알림을 신청하시면 입고 후 톡톡 또는 SMS로 알려드릴게요."
  ].join("\n");

  return textMessage(text, [
    button("🔔 재입고 알림받기", `APPLY_RESTOCK:${product.id}`),
    button("💬 기타 문의하기", `OTHER_INQUIRY:${product.id}`)
  ]);
}

export function optionSelectPrompt(product, outOfStockOptions) {
  const buttons = outOfStockOptions.slice(0, 9).map((option) => {
    const title = option.original_option_name.length > 18 ? option.original_option_name.slice(0, 18) : option.original_option_name;
    return button(title, `SELECT_OPTION:${product.id}:${option.id}`);
  });

  return textMessage(
    [
      "🧾 어떤 옵션에 대한 재입고 알림을 원하시나요?",
      `상품명: ${displayProductName(product)}`,
      "",
      "품절 옵션만 버튼으로 보여드릴게요."
    ].join("\n"),
    buttons
  );
}

export function channelSelectPrompt(product, option) {
  return textMessage(
    [
      "✅ 옵션을 선택했어요.",
      `상품명: ${displayProductName(product)}`,
      `옵션: ${option.original_option_name}`,
      "",
      "📮 재입고 알림을 어디로 받아보시겠어요?"
    ].join("\n"),
    [
      button("💬 톡톡만 받기", `CHANNEL:NAVER_TALK_ONLY:${product.id}:${option.id}`),
      button("📱 톡톡 + SMS로 받기", `CHANNEL:SMS:${product.id}:${option.id}`)
    ]
  );
}

export function smsProfileRequestPrompt(product, option) {
  return textMessage(
    [
      "📱 SMS 알림을 함께 받기 위해 휴대전화번호 제공 동의를 요청했어요.",
      "",
      `상품명: ${displayProductName(product)}`,
      `옵션: ${option.original_option_name}`,
      "",
      "네이버 톡톡 화면에 개인정보 제공 동의창이 표시되면 동의해 주세요.",
      "동의가 완료되면 재입고 시 톡톡과 SMS로 함께 알려드릴게요.",
      "",
      "수집 항목: 휴대전화번호",
      "수집 목적: 신청하신 상품의 재입고 알림 발송",
      "보유 및 이용 기간: 알림 발송 후 30일 또는 신청 취소 시 즉시 삭제",
      "동의 거부 권리: 동의하지 않아도 톡톡 알림은 이용할 수 있습니다."
    ].join("\n"),
    [
      button("💬 톡톡만 받기로 변경", `CHANNEL:NAVER_TALK_ONLY:${product.id}:${option.id}`)
    ]
  );
}

export function profileCompletePrompt({ product, option, waitCount, phoneNumber }) {
  return textMessage([
    "✅ SMS 수신 정보가 연결되었습니다.",
    `상품명: ${displayProductName(product)}`,
    `옵션: ${option.original_option_name}`,
    `휴대전화번호: ${phoneNumber}`,
    `현재 대기인원: ${waitCount}명`,
    "",
    "재입고되면 톡톡과 SMS로 함께 안내드릴게요."
  ].join("\n"));
}

export function profileCancelPrompt({ product, option, waitCount }) {
  return textMessage([
    "ℹ️ 휴대전화번호 제공 동의가 완료되지 않았습니다.",
    `상품명: ${displayProductName(product)}`,
    `옵션: ${option.original_option_name}`,
    `현재 대기인원: ${waitCount}명`,
    "",
    "재입고 알림은 톡톡으로만 유지됩니다."
  ].join("\n"));
}

export function completePrompt({ product, option, channelPreference, waitCount }) {
  const channelText = channelPreference === "NAVER_TALK_AND_SMS" ? "톡톡 + SMS" : "톡톡";
  return textMessage(
    [
      "✅ 재입고 알림 신청이 완료되었습니다.",
      `상품명: ${displayProductName(product)}`,
      `옵션: ${option.original_option_name}`,
      `수신 채널: ${channelText}`,
      `현재 대기인원: ${waitCount}명`,
      "",
      channelPreference === "NAVER_TALK_AND_SMS"
        ? "휴대전화번호 동의가 완료되면 SMS도 함께 발송됩니다."
        : "관리자가 재고를 1개 이상으로 변경하면 톡톡 알림이 발송됩니다."
    ].join("\n")
  );
}

export function productContextMissingPrompt(products) {
  return textMessage(
    "상품 정보를 자동으로 확인하지 못했습니다.\n재입고 알림을 원하시는 상품을 선택해 주세요.",
    products.slice(0, 9).map((product) => button(product.product_name.slice(0, 10), `APPLY_RESTOCK:${product.id}`))
  );
}

export function noOutOfStockOptionsPrompt(product) {
  return textMessage(
    `현재 ${product.product_name} 상품에는 품절 옵션이 없습니다.\n다른 문의가 있으면 메시지를 남겨주세요.`
  );
}

export function otherInquiryPrompt(product = null) {
  const productLine = product ? `상품명: ${displayProductName(product)}\n` : "";
  return textMessage(
    `${productLine}기타 문의 내용을 메시지로 남겨주세요.\n운영자가 확인 후 답변드리겠습니다.`
  );
}

export function fallbackPrompt() {
  return textMessage(
    "재입고 알림 신청을 도와드릴게요.\n상품 페이지에서 톡톡을 열거나 아래 버튼을 눌러 신청을 시작해 주세요.",
    [button("🔔 재입고 알림받기", "APPLY_RESTOCK")]
  );
}

export function profileWithdrawPrompt() {
  return textMessage("개인정보 제공 동의 철회가 확인되어 저장된 휴대전화번호를 삭제했습니다.\n기존 재입고 알림은 톡톡 알림으로만 유지됩니다.");
}
