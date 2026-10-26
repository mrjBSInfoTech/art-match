// Optional real-browser companion to testReturnsFlow.js. Uses only that script's
// disposable accounts, a dedicated headless Chrome profile, and actual UI clicks.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { connectPaymentBrowser } from "./paymongoBrowserProbe.js";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cache = (name) => new URL(`../.cache/${name}`, import.meta.url);
const activeDialog = "[...document.querySelectorAll('[role=dialog]')].find(dialog => getComputedStyle(dialog).visibility !== 'hidden' && dialog.getBoundingClientRect().width > 0)";

async function waitFor(browser, expression, label, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await browser.evaluate(expression)) return;
    await pause(250);
  }
  const summary = await browser.evaluate("({path:location.pathname, title:document.title, text:document.body?.innerText?.slice(-3500)})");
  throw new Error(`${label}: ${JSON.stringify(summary)}`);
}

const buttonExpression = (label, root = "document") =>
  `[...(${root}).querySelectorAll('button')].find(button => button.innerText.trim() === ${JSON.stringify(label)} && !button.disabled)`;
async function click(browser, label, root = "document") {
  const expression = buttonExpression(label, root);
  await waitFor(browser, `Boolean(${expression})`, `Button unavailable: ${label}`);
  await browser.evaluate(`${expression}.click()`);
}
async function fill(browser, selector, value) {
  const inputExpression = `[...document.querySelectorAll(${JSON.stringify(selector)})].find(input => getComputedStyle(input).visibility !== 'hidden' && input.getBoundingClientRect().width > 0)`;
  await waitFor(browser, `Boolean(${inputExpression})`, "Input unavailable");
  await browser.evaluate(`(() => {
    const input = ${inputExpression};
    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
}
async function pointerClick(browser, selector) {
  const point = await browser.evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    element.scrollIntoView({ block: 'center' });
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await browser.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  await browser.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
}
async function screenshot(browser, filename) {
  await browser.send("Page.bringToFront");
  await pause(150);
  const { data } = await browser.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(cache(filename), Buffer.from(data, "base64"));
}

export async function runReturnBrowserCheck({ state, apiBaseUrl, createOrder, rows }) {
  const controller = await connectPaymentBrowser(9337);
  const browsers = [];
  const checks = [];
  const record = (check) => { checks.push({ result: "PASS", test: check }); console.log(`PASS browser: ${check}`); };
  const credentials = {
    buyer_token: state.buyerTokens[0], buyer_customer_id: String(state.buyerIds[0]),
    buyer_username: state.marker, buyer_first_name: "Return", buyer_last_name: "Test Buyer",
    seller_token: state.sellerTokens[0], seller_student_id: String(state.sellerIds[0]),
    seller_first_name: "Return", seller_last_name: "Test Seller",
  };
  const createPage = async () => {
    const { targetId } = await controller.send("Target.createTarget", { url: "about:blank" });
    const browser = await connectPaymentBrowser(9337, targetId);
    browsers.push(browser);
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `if(location.origin === 'http://localhost:5173') { for(const [key,value] of Object.entries(${JSON.stringify(credentials)})) localStorage.setItem(key,value); }`,
    });
    await browser.send("Network.setCacheDisabled", { cacheDisabled: true });
    await browser.send("Network.setBlockedURLs", { urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"] });
    // Frontend API helpers retain their normal address. Only this isolated test
    // browser redirects return/order/chat requests to the script's real API app.
    // Other layout APIs use the current backend on its normal port5000.
    browser.on("Fetch.requestPaused", async ({ requestId, request }) => {
      const url = new URL(request.url);
      const useFixtureApp = /^\/api\/(?:buyer\/(?:orders|returns)|seller\/(?:orders|returns)|chat)(?:\/|$)/.test(url.pathname);
      const destination = new URL(url.pathname + url.search, useFixtureApp ? apiBaseUrl : "http://127.0.0.1:5000");
      await browser.send("Fetch.continueRequest", { requestId, url: destination.href });
    });
    await browser.send("Fetch.enable", { patterns: [{ urlPattern: "http://localhost:5000/*" }] });
    await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    return browser;
  };
  try {
    const order = await createOrder({ payment: "paymongo" });
    const orderNumber = `AM-${String(order.id).padStart(6, "0")}`;
    const buyer = await createPage();
    await buyer.send("Page.navigate", { url: "http://localhost:5173/buyer/profile/orders" });
    const requestButton = `[...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Request return' && button.closest('.MuiPaper-root')?.innerText.includes(${JSON.stringify(orderNumber)}))`;
    await waitFor(buyer, `Boolean(${requestButton})`, "Eligible buyer order did not display Request return", 90000);
    await waitFor(buyer, "document.body.innerText.includes('Return period ended.')", "Expired return period was not displayed from server policy");
    assert.equal(await buyer.evaluate(`(() => {
      const caption = [...document.querySelectorAll('span,p')].find(element => element.innerText.trim() === 'Return period ended.');
      const card = caption?.closest('.MuiPaper-root');
      return [...(card?.querySelectorAll('button') || [])].find(button => button.innerText.trim() === 'Request return')?.disabled === true;
    })()`), true);
    record("Expired orders show the server's ended-period notice and disable new return requests");
    await buyer.evaluate(`${requestButton}.click()`);
    await waitFor(buyer, "Boolean(document.querySelector('[role=dialog] input[type=checkbox]'))", "Return dialog missing selected-item controls");
    assert.equal(await buyer.evaluate(`${buttonExpression("Submit return request", activeDialog)}?.disabled ?? true`), true);
    await pointerClick(buyer, "[role=dialog] label");
    await waitFor(buyer, "document.querySelector('[role=dialog] input[type=checkbox]')?.checked === true", "Purchased item selection was not retained", 5000);
    await pointerClick(buyer, "[role=dialog] [role=combobox]");
    await waitFor(buyer, "[...document.querySelectorAll('[role=option]')].some(option => option.innerText === 'Shipping damage')", "Return reasons missing");
    await buyer.evaluate("[...document.querySelectorAll('[role=option]')].find(option => option.innerText === 'Shipping damage').click()");
    await fill(buyer, "[role=dialog] textarea", "The artwork frame arrived damaged; please approve this return.");
    await click(buyer, "Submit return request", activeDialog);
    await waitFor(buyer, "location.pathname === '/buyer/messages' && new URLSearchParams(location.search).has('return')", "Submission did not open the linked chat");
    const returnId = await buyer.evaluate("Number(new URLSearchParams(location.search).get('return'))");
    const conversationId = await buyer.evaluate("Number(new URLSearchParams(location.search).get('conversation'))");
    const card = `document.getElementById('return-${returnId}')`;
    await waitFor(buyer, `Boolean(${card})`, "Trusted buyer return card not displayed");
    assert.equal(await buyer.evaluate(`Boolean(${buttonExpression("Approve return", card)})`), false);
    await waitFor(buyer, `Boolean(${buttonExpression("Cancel request", card)})`, "Buyer cancellation missing while Requested");
    const selected = await rows("SELECT order_item_id FROM marketplace_return_item WHERE return_request_id = ?", [returnId]);
    assert.deepEqual(selected.map((item) => item.order_item_id), [order.items[0]]);
    record("Buyer selects a single purchased item, submits valid feedback, and opens the linked return card without chat unlocking");
    await screenshot(buyer, "returns-buyer-requested.png");

    const seller = await createPage();
    await seller.send("Page.navigate", { url: `http://localhost:5173/seller/messages?conversation=${conversationId}&return=${returnId}` });
    await waitFor(seller, `Boolean(${card})`, "Seller return card not displayed", 90000);
    assert.equal(await seller.evaluate(`Boolean(${buttonExpression("Cancel request", card)})`), false);
    await click(seller, "Approve return", card);
    await fill(seller, "[role=dialog] textarea", "Please return the artwork in protective packaging.");
    await click(seller, "Confirm", activeDialog);
    await waitFor(seller, `${card}?.innerText.includes('Approved')`, "Seller approval did not update");
    await buyer.send("Page.bringToFront");
    await waitFor(buyer, `Boolean(${buttonExpression("Mark return shipped", card)})`, "Buyer did not receive the live approval update");
    assert.equal(await buyer.evaluate(`Boolean(${buttonExpression("Cancel request", card)})`), false);
    record("Seller-only approval updates the buyer card live; buyer cancellation disappears after approval");
    await screenshot(buyer, "returns-buyer-approved.png");

    await click(buyer, "Mark return shipped", card);
    await fill(buyer, "[role=dialog] input", "https://carrier.example/return-test");
    await click(buyer, "Confirm", activeDialog);
    await waitFor(buyer, `${card}?.innerText.includes('Return shipped')`, "Buyer shipment did not update");
    await seller.send("Page.bringToFront");
    await waitFor(seller, `Boolean(${buttonExpression("Confirm items received", card)})`, "Seller did not receive the return-shipment update");
    assert.equal(await buyer.evaluate(`Boolean(${buttonExpression("Confirm items received", card)})`), false);
    record("Buyer-only shipment accepts a tracking URL and exposes receipt only to the seller");

    await click(seller, "Confirm items received", card);
    await click(seller, "Confirm", activeDialog);
    await waitFor(seller, `${card}?.innerText.includes('Completed')`, "Seller completion did not update");
    await buyer.send("Page.bringToFront");
    await waitFor(buyer, `${card}?.innerText.includes('Completed')`, "Buyer completion update missing");
    const final = (await rows(`SELECT r.status AS return_status, r.received_at, r.completed_at,
      o.status, o.payment_status FROM marketplace_return_request r
      JOIN marketplace_order o USING (order_id) WHERE r.return_request_id = ?`, [returnId]))[0];
    assert.equal(final.return_status, "Completed");
    assert.ok(final.received_at && final.completed_at);
    assert.equal(final.status, "Delivered");
    assert.equal(final.payment_status, "Paid");
    record("Seller receipt completes both live cards and persists timestamps while fulfillment stays Delivered and payment stays Paid");
    await buyer.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await pause(500);
    assert.equal(await buyer.evaluate(`(() => { const rect = ${card}.getBoundingClientRect(); return rect.width > 0 && rect.width <= innerWidth; })()`), true);
    await screenshot(buyer, "returns-mobile-completed.png");
    await screenshot(seller, "returns-seller-completed.png");
    record("Return card remains visible at a 390-pixel mobile viewport");
    await writeFile(cache("returns-browser-results.json"), JSON.stringify({ checks, orderId: order.id, returnId, conversationId }, null, 2));
  } finally {
    for (const browser of browsers) {
      try {
        await browser.send("Storage.clearDataForOrigin", { origin: "http://localhost:5173", storageTypes: "all" });
        await browser.send("Target.closeTarget", { targetId: browser.targetId });
      } catch { /* The isolated tab may already have closed. */ }
      browser.close();
    }
    controller.close();
  }
}
