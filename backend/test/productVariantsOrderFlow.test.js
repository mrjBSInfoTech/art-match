import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductOptions,
  validateProductOptionSelections,
  summarizeProductOptionSelections,
  calculateProductOptionsTotal,
} from "../utils/productOptions.js";
import { databaseFixture, invoke, loadPaymentRoute } from "./paymentHarness.js";

const sampleArtworkDetails = {
  product_price_mode: "manual",
  product_options: [
    {
      id: "prod-a",
      name: "Product A",
      description: "Description A",
      image: "https://example.com/a.jpg",
      price: 50,
      quantity: 10,
      remaining_stock: 10,
    },
    {
      id: "prod-b",
      name: "Product B",
      description: "Description B",
      image: "https://example.com/b.jpg",
      price: 60,
      quantity: 5,
      remaining_stock: 5,
    },
  ],
};

test("Variant Selection: Product B (₱60) selection uses ₱60, not base artwork price (₱50)", () => {
  const options = getProductOptions(sampleArtworkDetails);
  assert.equal(options.length, 2);

  // Artwork base price is ₱50
  const artworkBasePrice = 50;

  // Buyer selects Product B with quantity 2
  const selections = validateProductOptionSelections(
    [{ id: "prod-b", quantity: 2 }],
    options,
    sampleArtworkDetails.product_price_mode,
    artworkBasePrice,
  );

  assert.equal(selections.length, 1);
  assert.equal(selections[0].id, "prod-b");
  assert.equal(selections[0].name, "Product B");
  assert.equal(selections[0].image, "https://example.com/b.jpg");
  assert.equal(selections[0].unit_price, 60);
  assert.equal(selections[0].quantity, 2);

  const total = calculateProductOptionsTotal(selections);
  assert.equal(total, 120);

  // Verify that summarizeProductOptionSelections also computes exactly ₱60 * 2 = ₱120
  const summary = summarizeProductOptionSelections(sampleArtworkDetails, [{ id: "prod-b", quantity: 2 }], artworkBasePrice);
  assert.equal(summary.quantity, 2);
  assert.equal(summary.total, 120);
  assert.equal(summary.selections[0].unit_price, 60);
});

test("Backend Price Validation: client cannot tamper with variant unit price", () => {
  const options = getProductOptions(sampleArtworkDetails);

  // Client attempts to send forged price of ₱1 for Product B
  const clientPayload = [{ id: "prod-b", quantity: 1, unit_price: 1, price: 1 }];
  const selections = validateProductOptionSelections(
    clientPayload,
    options,
    sampleArtworkDetails.product_price_mode,
    50,
  );

  // Server ignores client-submitted price and uses canonical price 60 from database
  assert.equal(selections[0].unit_price, 60);
  assert.equal(calculateProductOptionsTotal(selections), 60);
});

test("Stock Validation: selecting more than available option stock throws validation error", () => {
  const options = getProductOptions(sampleArtworkDetails);

  // Product B only has 5 in stock; requesting 6 must fail
  assert.throws(
    () => validateProductOptionSelections([{ id: "prod-b", quantity: 6 }], options, "manual", 50),
    /Product B has only 5 available/i,
  );
});

test("End-to-End Order Creation: checkout creates marketplace_order_item with variant snapshot", async () => {
  const sessions = [];
  const fixture = databaseFixture({
    orders: [],
    orderItems: [],
    artworks: [
      {
        artwork_id: 200,
        student_id: 1,
        title: "T-Shirt Listing",
        price: "50.00",
        art_type: "Product",
        product: "Product",
        image: "https://example.com/base.jpg",
        status: "Available",
        is_verified: 1,
        is_sold: 0,
        artwork_details: sampleArtworkDetails,
      },
    ],
    cartItems: [
      {
        add_to_id: 1,
        artwork_id: 200,
        quantity: 2,
        selected_products: [
          { id: "prod-b", quantity: 2 },
        ],
        order_note: "Please pack carefully.",
      },
    ],
  });

  const routes = loadPaymentRoute("../routes/buyer/orders.js", {
    ...fixture,
    getPayMongoMode: () => false,
    getPayMongoPaymentMethodTypes: async () => ["card", "gcash", "paymaya", "qrph"],
    async createPayMongoCheckoutSession(options) {
      sessions.push(structuredClone(options));
      return {
        checkoutSessionId: "cs_test_variant",
        checkoutUrl: "https://checkout.paymongo.com/variant-test",
        referenceNumber: options.referenceNumber,
      };
    },
  });

  const checkout = (body) => invoke(routes, "post", "/checkout", { body });

  const response = await checkout({
    address_id: 4,
    payment_method: "paymongo",
    artwork_ids: [200],
    delivery_method: "door_to_door",
  });

  assert.equal(response.status, 201);
  // Total must be ₱60 * 2 = ₱120 (12000 centavos)
  assert.equal(response.body.total, 120);
  assert.equal(sessions[0].lineItems[0].amount, 12000);
  assert.equal(sessions[0].lineItems[0].quantity, 1);

  // Verify order item in database has correct variant snapshot
  const orderItem = fixture.state.orderItems[0];
  assert.ok(orderItem);
  assert.equal(orderItem.product_option_id, "prod-b");
  assert.equal(orderItem.product_option_name, "Product B");
  assert.equal(orderItem.image, "https://example.com/b.jpg");
  assert.equal(Number(orderItem.unit_price), 60);
  assert.equal(Number(orderItem.quantity), 2);
  assert.equal(Number(orderItem.line_total), 120);
  assert.equal(orderItem.order_note, "Please pack carefully.");

  const selectedProducts = JSON.parse(orderItem.selected_products);
  assert.equal(selectedProducts[0].id, "prod-b");
  assert.equal(selectedProducts[0].name, "Product B");
  assert.equal(selectedProducts[0].unit_price, 60);
  assert.equal(selectedProducts[0].quantity, 2);
});

test("Standard Artwork: non-product artwork purchase works normally without variant options", async () => {
  const sessions = [];
  const fixture = databaseFixture({
    orders: [],
    orderItems: [],
    artworks: [
      {
        artwork_id: 300,
        student_id: 1,
        title: "Oil Painting",
        price: "1500.00",
        art_type: "Painting",
        image: "https://example.com/oil.jpg",
        status: "Available",
        is_verified: 1,
        is_sold: 0,
        artwork_details: { stock_available: 1 },
      },
    ],
    cartItems: [
      {
        add_to_id: 1,
        artwork_id: 300,
        quantity: 1,
        selected_products: null,
      },
    ],
  });

  const routes = loadPaymentRoute("../routes/buyer/orders.js", {
    ...fixture,
    getPayMongoMode: () => false,
    getPayMongoPaymentMethodTypes: async () => ["card", "gcash", "paymaya", "qrph"],
    async createPayMongoCheckoutSession(options) {
      sessions.push(structuredClone(options));
      return {
        checkoutSessionId: "cs_test_standard",
        checkoutUrl: "https://checkout.paymongo.com/standard-test",
        referenceNumber: options.referenceNumber,
      };
    },
  });

  const checkout = (body) => invoke(routes, "post", "/checkout", { body });

  const response = await checkout({
    address_id: 4,
    payment_method: "paymongo",
    artwork_ids: [300],
    delivery_method: "door_to_door",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.total, 1500);

  const orderItem = fixture.state.orderItems[0];
  assert.ok(orderItem);
  assert.equal(orderItem.product_option_id, null);
  assert.equal(orderItem.product_option_name, null);
  assert.equal(orderItem.image, "https://example.com/oil.jpg");
  assert.equal(Number(orderItem.unit_price), 1500);
  assert.equal(Number(orderItem.quantity), 1);
  assert.equal(Number(orderItem.line_total), 1500);
});
