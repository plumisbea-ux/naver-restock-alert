export const seedData = {
  sellers: [
    {
      id: "seller_001",
      store_name: "테스트 스마트스토어",
      naver_account_id: "test_naver_account",
      talk_account_id: "wc_testtalk",
      kakao_channel_id: "@테스트스토어",
      plan: "FREE_TEST",
      status: "ACTIVE",
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    }
  ],
  products: [
    {
      id: "prod_hoodie_001",
      seller_id: "seller_001",
      product_no: "100000001",
      origin_product_no: "100000001",
      channel_product_no: "ch_100000001",
      product_name: "베이직 오버핏 후드티",
      product_url: "https://smartstore.naver.com/mock-store/products/100000001",
      status: "PARTIAL_OUT_OF_STOCK",
      is_active: true,
      low_stock_threshold: 3,
      has_options: true,
      replacement_enabled: true,
      expected_restock_date: null,
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    },
    {
      id: "prod_belt_001",
      seller_id: "seller_001",
      product_no: "100000002",
      origin_product_no: "100000002",
      channel_product_no: "ch_100000002",
      product_name: "프린터 전사벨트",
      product_url: "https://smartstore.naver.com/mock-store/products/100000002",
      status: "FULL_OUT_OF_STOCK",
      is_active: true,
      low_stock_threshold: 3,
      has_options: true,
      replacement_enabled: false,
      expected_restock_date: null,
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    }
  ],
  product_options: [
    {
      id: "opt_hoodie_s",
      seller_id: "seller_001",
      product_id: "prod_hoodie_001",
      option_id: "S",
      original_option_name: "S",
      current_option_name: "S",
      stock_quantity: 5,
      previous_stock_quantity: 5,
      stock_status: "NORMAL",
      notice_applied: false,
      notice_text: null,
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    },
    {
      id: "opt_hoodie_m",
      seller_id: "seller_001",
      product_id: "prod_hoodie_001",
      option_id: "M",
      original_option_name: "M",
      current_option_name: "M [품절]",
      stock_quantity: 0,
      previous_stock_quantity: 0,
      stock_status: "PARTIAL_OUT_OF_STOCK",
      notice_applied: true,
      notice_text: "재입고 알림 가능",
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    },
    {
      id: "opt_hoodie_l",
      seller_id: "seller_001",
      product_id: "prod_hoodie_001",
      option_id: "L",
      original_option_name: "L",
      current_option_name: "L",
      stock_quantity: 2,
      previous_stock_quantity: 2,
      stock_status: "LOW_STOCK",
      notice_applied: false,
      notice_text: null,
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    },
    {
      id: "opt_hoodie_xl",
      seller_id: "seller_001",
      product_id: "prod_hoodie_001",
      option_id: "XL",
      original_option_name: "XL",
      current_option_name: "XL [품절]",
      stock_quantity: 0,
      previous_stock_quantity: 0,
      stock_status: "PARTIAL_OUT_OF_STOCK",
      notice_applied: true,
      notice_text: "재입고 알림 가능",
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    },
    {
      id: "opt_hoodie_xxl",
      seller_id: "seller_001",
      product_id: "prod_hoodie_001",
      option_id: "XXL",
      original_option_name: "XXL",
      current_option_name: "XXL",
      stock_quantity: 7,
      previous_stock_quantity: 7,
      stock_status: "NORMAL",
      notice_applied: false,
      notice_text: null,
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    },
    {
      id: "opt_belt_basic",
      seller_id: "seller_001",
      product_id: "prod_belt_001",
      option_id: "basic",
      original_option_name: "기본형",
      current_option_name: "기본형 [품절]",
      stock_quantity: 0,
      previous_stock_quantity: 0,
      stock_status: "FULL_OUT_OF_STOCK",
      notice_applied: true,
      notice_text: "재입고 알림 가능",
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    }
  ],
  stock_events: [],
  waitlists: [],
  notification_queue: [],
  restock_batches: [],
  replacement_products: [
    {
      id: "repl_001",
      seller_id: "seller_001",
      product_id: "prod_hoodie_001",
      replacement_product_id: "prod_alt_001",
      replacement_product_name: "베이직 맨투맨",
      replacement_product_url: "https://smartstore.naver.com/mock-store/products/100000099",
      priority: 1,
      is_active: true,
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T00:00:00.000Z"
    }
  ],
  expected_restock_notices: [],
  consent_logs: [],
  message_logs: [],
  sessions: {},
  mock_users: {
    "al-2eGuGr5WQOnco1_V-FQ": {
      talk_user_id: "al-2eGuGr5WQOnco1_V-FQ",
      mock_phone_number: "010-1234-5678"
    }
  }
};
