// Diagnostic only: create an unpaid TEST session, inspect its method sections,
// then expire it. Never enters payment details or submits/authorizes a payment.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { connectPaymentBrowser } from "./paymongoBrowserProbe.js";
import { createPayMongoCheckoutSession, expirePayMongoCheckoutSession,
  getPayMongoMode, getPayMongoPaymentMethodTypes, retrievePayMongoCheckoutSession } from "../utils/paymongo.js";

dotenv.config({ quiet: true });
let checkout;
let browser;
let chrome;
try {
  assert.equal(getPayMongoMode(), false, "Only TEST credentials may run this check");
  const enabled = await getPayMongoPaymentMethodTypes();
  const requested = ["card", "gcash", "paymaya", "qrph"];
  checkout = await createPayMongoCheckoutSession({
    lineItems: [{ name: "Unpaid payment-method diagnostic", amount: 10000, currency: "PHP", quantity: 1 }],
    paymentMethodTypes: requested,
    successUrl: "http://localhost:5173/buyer/checkout",
    cancelUrl: "http://localhost:5173/buyer/checkout",
    referenceNumber: `AM-METHODS-${randomUUID()}`,
  });
  const session = await retrievePayMongoCheckoutSession(checkout.checkoutSessionId);
  assert.equal(session.attributes.livemode, false);
  assert.equal(session.attributes.payments.length, 0);
  chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9334",
    "--user-data-dir=" + fileURLToPath(new URL("../.cache/paymongo-methods-browser", import.meta.url)),
    "--no-first-run", "--no-default-browser-check", "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  for (let attempt = 0; attempt < 30; attempt++) {
    try { browser = await connectPaymentBrowser(9334); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 500)); }
  }
  assert.ok(browser, "The isolated diagnostic browser must start");
  await browser.send("Page.navigate", { url: checkout.checkoutUrl });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    ready = await browser.evaluate("document.body.innerText.includes('Payment Method') && document.body.innerText.includes('Continue')").catch(() => false);
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Hosted Checkout must finish rendering");
  // SSR text can be visible before the provider's interactive handlers hydrate.
  await new Promise(resolve => setTimeout(resolve, 2000));
  const controls = await browser.evaluate(`Array.from(document.querySelectorAll('button,[role="button"],label'))
    .filter(element => element.getClientRects().length)
    .map(element => ({ tag: element.tagName, name: element.getAttribute('name'), text: element.innerText.trim(), disabled: element.disabled || element.getAttribute('aria-disabled') === 'true', parent: element.parentElement.tagName }))
    .filter(element => element.text || element.name)`);
  // Open the method sections without entering any data or submitting payment.
  const expanded = {};
  for (const label of ["E-Wallets", "Card"]) {
    const clicked = await browser.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('button')).find(element => element.innerText.trim() === ${JSON.stringify(label)});
      if (!button || button.disabled) return false;
      button.click(); return true;
    })()`);
    if (clicked) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      expanded[label] = await browser.evaluate(`({
        walletText: {gcash:document.body.innerText.includes('GCash'),maya:document.body.innerText.includes('Maya')},
        images:Array.from(document.querySelectorAll('img')).filter(element=>element.getClientRects().length).map(element=>({alt:element.alt,file:new URL(element.src).pathname.split('/').pop()})),
        controls:Array.from(document.querySelectorAll('button,input'))
        .filter(element => element.getClientRects().length)
        .filter(element => element.tagName==='BUTTON' || element.name.startsWith('payment.details.card'))
        .map(element => ({tag:element.tagName,name:element.getAttribute('name'),type:element.type,text:element.innerText.trim(),disabled:element.disabled}))})`);
      if (label === "E-Wallets") {
        const walletScreenshot = await browser.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
        await writeFile(fileURLToPath(new URL("../.cache/paymongo-methods-wallets.png", import.meta.url)), Buffer.from(walletScreenshot.data, "base64"));
      }
    }
  }
  const selections = await browser.evaluate(`Array.from(document.querySelectorAll('select,input'))
    .filter(element => element.getClientRects().length)
    .map(element => ({ tag: element.tagName, name: element.getAttribute('name'), type: element.type, disabled: element.disabled,
      optionCount: element.options?.length }))`);
  const screenshot = await browser.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(fileURLToPath(new URL("../.cache/paymongo-methods-page.png", import.meta.url)), Buffer.from(screenshot.data, "base64"));
  assert.ok(expanded["E-Wallets"]?.walletText.gcash && expanded["E-Wallets"]?.walletText.maya,
    "GCash and Maya must be visible in the TEST wallet choices");
  assert.ok(expanded.Card?.controls.some(control => control.name === "payment.details.card.number" && !control.disabled),
    "The TEST card form must be available");
  console.log(JSON.stringify({
    testMode: true, configuredTestMethods: enabled,
    requestedMethods: requested, storedSessionMethods: session.attributes.payment_method_types,
    renderedControls: controls, expanded, selections, paymentAuthorized: false,
  }, null, 2));
} catch (error) {
  console.error("Hosted payment-method check failed:", error.code || error.message);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.send("Browser.close").catch(() => {});
    browser.close();
  } else chrome?.kill();
  if (checkout) {
    const expired = await expirePayMongoCheckoutSession(checkout.checkoutSessionId);
    assert.equal(expired.attributes.status, "expired");
    console.log("Diagnostic TEST session expired; no order or payment was created.");
  }
}
