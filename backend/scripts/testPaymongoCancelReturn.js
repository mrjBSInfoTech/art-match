// Actual TEST checkout → PayMongo Back/Cancel → ArtMatch auto-cancellation.
// Uses labelled disposable fixtures and a separate hidden Chrome profile.
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { connectPaymentBrowser } from "./paymongoBrowserProbe.js";

const execute = promisify(execFile);
const backend = fileURLToPath(new URL("../", import.meta.url));
const fixtureScript = fileURLToPath(new URL("testPaymongoCheckoutFlow.js", import.meta.url));
const stateFile = fileURLToPath(new URL("../.cache/paymongo-flow-test.json", import.meta.url));
const runFixture = async flag => {
  const result = await execute(process.execPath, [fixtureScript, flag], { cwd: backend, windowsHide: true, timeout: 90000 });
  process.stdout.write(result.stdout);
};
let browser;
let chrome;
try {
  await runFixture("--prepare");
  const fixture = JSON.parse(await readFile(stateFile, "utf8"));
  assert.match(fixture.marker, /^pmtest_[a-f0-9]{16}$/);
  chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9333",
    "--user-data-dir=" + fileURLToPath(new URL("../.cache/paymongo-browser", import.meta.url)),
    "--no-first-run", "--no-default-browser-check", "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  for (let attempt = 0; attempt < 20; attempt++) {
    try { browser = await connectPaymentBrowser(); break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
  }
  assert.ok(browser, "The isolated Chrome test browser must start");
  await browser.send("Page.addScriptToEvaluateOnNewDocument", { source:
    "if(location.origin==='http://localhost:5173'){localStorage.setItem('buyer_token'," + JSON.stringify(fixture.buyerToken) + ");}" });
  await browser.send("Page.navigate", { url: "http://localhost:5173/buyer/checkout?reference=" + encodeURIComponent(fixture.paymentReference) });
  const waitFor = async (expression, description) => {
    for (let attempt = 0; attempt < 35; attempt++) {
      if (await browser.evaluate(expression).catch(() => false)) return;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(description);
  };
  await waitFor("!![...document.querySelectorAll('button')].find(button=>button.innerText.trim()==='Continue payment')", "An unfinished payment belongs in Checkout");
  await browser.evaluate("[...document.querySelectorAll('button')].find(button=>button.innerText.trim()==='Continue payment').click()");
  await waitFor("location.hostname==='checkout.paymongo.com'", "Continue payment must redirect to PayMongo Hosted Checkout");
  const cancelSelector = "[...document.querySelectorAll('a')].find(link=>{try{const url=new URL(link.href);return url.origin==='http://localhost:5173'&&url.searchParams.get('payment')==='cancelled'&&url.searchParams.get('reference')===" + JSON.stringify(fixture.paymentReference) + ";}catch{return false;}})";
  await waitFor("!!(" + cancelSelector + ")", "The official PayMongo Cancel/Back link must be present");
  await browser.evaluate("(" + cancelSelector + ").click()");
  await waitFor("location.hostname==='localhost'&&location.pathname==='/buyer/checkout'&&location.search.includes('payment=cancelled')&&document.body.innerText.includes('Checkout closed')", "Cancel must return to Checkout and expire its unfinished payment");
  const headers = { Authorization: "Bearer " + fixture.buyerToken };
  const orders = await fetch("http://localhost:5000/api/buyer/orders", { headers }).then(response => response.json());
  assert.equal(orders.length, 0, "An unpaid or cancelled attempt must not appear as a placed order");
  const checkout = await fetch("http://localhost:5000/api/buyer/orders/payments/" + encodeURIComponent(fixture.paymentReference), { headers }).then(response => response.json());
  const matching = checkout.orders;
  assert.equal(matching.length, 2);
  assert.ok(matching.every(order => order.status === "Cancelled" && order.paymentStatus === "Expired"));
  const cart = await fetch("http://localhost:5000/api/buyer/cart", { headers }).then(response => response.json());
  assert.deepEqual(cart.map(item => Number(item.artwork_id)).sort((a, b) => a - b), [...fixture.artworkIds].sort((a, b) => a - b));
  const evidence = { officialCancelLinkClicked: true, automaticCancellation: true,
    orders: matching.map(({ orderId, status, paymentStatus }) => ({ orderId, status, paymentStatus })),
    cartItemsRetained: cart.length, paid: false };
  await writeFile(fileURLToPath(new URL("../.cache/paymongo-cancel-return-results.json", import.meta.url)), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  if (browser) {
    await browser.evaluate("localStorage.removeItem('buyer_token'); sessionStorage.removeItem('paymongo_payment_reference')").catch(() => {});
    await browser.send("Browser.close").catch(() => {});
    browser.close();
  } else chrome?.kill();
  let hasFixture = false;
  try { await access(stateFile); hasFixture = true; } catch { /* No retained fixture. */ }
  if (hasFixture) await runFixture("--cleanup");
}
