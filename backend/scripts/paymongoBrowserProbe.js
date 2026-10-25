// Local development browser inspection. Never scans or pays a QR code.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const cacheDirectory = fileURLToPath(new URL("../.cache/", import.meta.url));

export async function connectPaymentBrowser(port = 9333, targetId) {
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  const target = targets.find(item => item.type === "page" && (!targetId || item.id === targetId));
  if (!target?.webSocketDebuggerUrl) throw new Error("The isolated payment test browser is not running");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else {
      for (const listener of listeners.get(message.method) || []) {
        Promise.resolve(listener(message.params)).catch(() => {});
      }
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const on = (event, listener) => {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(listener);
  };
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result?.value;
  };
  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);
  return { send, on, evaluate, targetId: target.id, close: () => socket.close() };
}

export function capturePayMongoTestUrls(browser) {
  const responses = new Map();
  const testUrls = new Set();
  const network = [];
  const findUrls = value => {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (key === "test_url" && typeof item === "string") {
        const url = new URL(item);
        if (url.protocol === "https:" && (url.hostname === "paymongo.com" || url.hostname.endsWith(".paymongo.com"))) testUrls.add(item);
      } else if (item && typeof item === "object") findUrls(item);
    }
  };
  browser.on("Network.responseReceived", ({ requestId, response }) => {
    const url = new URL(response.url);
    if (!url.hostname.endsWith(".paymongo.com")) return;
    network.push({ origin: url.origin, path: url.pathname, status: response.status, mimeType: response.mimeType });
    if (response.mimeType.includes("json")) responses.set(requestId, true);
  });
  browser.on("Network.loadingFinished", async ({ requestId }) => {
    if (!responses.delete(requestId)) return;
    const body = await browser.send("Network.getResponseBody", { requestId });
    const json = JSON.parse(body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf8") : body.body);
    findUrls(json);
  });
  return { network, testUrls };
}

export const inspectPaymentPage = browser => browser.evaluate(`({
  url: location.origin + location.pathname,
  title: document.title,
  text: document.body?.innerText?.slice(0, 4500),
  controls: [...document.querySelectorAll('input, button, a, select')].map(element => ({
    tag: element.tagName, type: element.type, id: element.id, name: element.name,
    placeholder: element.placeholder, text: element.innerText?.slice(0, 100),
    disabled: element.disabled,
    href: element.tagName === 'A' ? element.getAttribute('href')?.split('?')[0] : undefined
  }))
})`);

async function inspectFixture() {
  const fixturePath = path.join(cacheDirectory, "paymongo-flow-test.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  if (!/^pmtest_[a-f0-9]{16}$/.test(fixture.marker)) throw new Error("Only the dedicated payment test fixture may be inspected");
  const checkoutUrl = fixture.checkout_url || fixture.checkoutUrl || fixture.checkout?.checkout_url;
  if (!checkoutUrl || !/^https:\/\/checkout\.paymongo\.com\//.test(checkoutUrl)) throw new Error("Dedicated test fixture checkout URL is missing");
  const browser = await connectPaymentBrowser();
  const captured = capturePayMongoTestUrls(browser);
  try {
    if (process.argv.includes("--refresh-buyer-ui") || process.argv.includes("--authorize-test-payment")) {
      const tabs = JSON.parse(await readFile(path.join(cacheDirectory, "paymongo-browser-tabs.json"), "utf8"));
      if (process.argv.includes("--refresh-buyer-ui")) {
        const buyer = await connectPaymentBrowser(9333, tabs.buyerTargetId);
        try {
          await buyer.evaluate("window.dispatchEvent(new Event('focus'))");
          await new Promise(resolve => setTimeout(resolve, 3000));
          const inspection = await inspectPaymentPage(buyer);
          const pending = (inspection.text.match(/Awaiting Payment/g) || []).length;
          await writeFile(path.join(cacheDirectory, "paymongo-buyer-before-payment.json"), JSON.stringify(inspection, null, 2));
          console.log(JSON.stringify({ title: inspection.title, pendingSellerOrders: pending, falselyConfirmed: inspection.text.includes("Payment confirmed."), verifying: inspection.text.includes("Verifying your payment") }));
          if (pending !== 2 || inspection.text.includes("Payment confirmed.")) throw new Error("Pending browser UI verification did not match the dedicated two-seller test checkout");
        } finally { buyer.close(); }
      } else {
        const simulator = await connectPaymentBrowser(9333, tabs.simulationTargetId);
        try {
          const inspection = await inspectPaymentPage(simulator);
          if (new URL(inspection.url).hostname !== "secure-authentication.paymongo.com" || !inspection.text.includes("QRPH Test Payment Page") || !inspection.text.includes("3,300.00")) {
            throw new Error("Payment authorization refused: expected dedicated PHP 3300 provider TEST simulation page");
          }
          const authorized = await simulator.evaluate("(() => { const button = [...document.querySelectorAll('button')].find(item => item.innerText.trim() === 'Authorize Test Payment'); if (!button || button.disabled) return false; button.click(); return true; })()");
          if (!authorized) throw new Error("The official Authorize Test Payment control is unavailable");
          await new Promise(resolve => setTimeout(resolve, 5000));
          const after = await inspectPaymentPage(simulator);
          await writeFile(path.join(cacheDirectory, "paymongo-simulation-after-authorization.json"), JSON.stringify(after, null, 2));
          console.log(JSON.stringify({ testAuthorizationClicked: true, page: after }, null, 2));
        } finally { simulator.close(); }
      }
      return;
    }
    if (process.argv.includes("--prepare-buyer-ui")) {
      const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
      const buyer = await connectPaymentBrowser(9333, targetId);
      try {
        await buyer.send("Page.addScriptToEvaluateOnNewDocument", { source: `if (location.origin === 'http://localhost:5173') { localStorage.setItem('buyer_token', ${JSON.stringify(fixture.buyerToken)}); localStorage.setItem('buyer_username', ${JSON.stringify(fixture.marker)}); localStorage.setItem('buyer_first_name', 'Payment integration test'); }` });
        await buyer.send("Page.navigate", { url: `http://localhost:5173/buyer/profile/orders?payment=success&reference=${encodeURIComponent(fixture.paymentReference)}` });
        await new Promise(resolve => setTimeout(resolve, 4000));
        const tabs = JSON.parse(await readFile(path.join(cacheDirectory, "paymongo-browser-tabs.json"), "utf8"));
        tabs.buyerTargetId = targetId;
        await writeFile(path.join(cacheDirectory, "paymongo-browser-tabs.json"), JSON.stringify(tabs));
        const inspection = await inspectPaymentPage(buyer);
        await writeFile(path.join(cacheDirectory, "paymongo-buyer-before-payment.json"), JSON.stringify(inspection, null, 2));
        console.log(JSON.stringify({ title: inspection.title, url: inspection.url, falselyConfirmed: inspection.text?.includes("Payment confirmed."), bodySummary: inspection.text?.slice(-2200) }, null, 2));
      } finally {
        buyer.close();
      }
      return;
    }
    if (process.argv.includes("--inspect-test-simulation")) {
      const simulationUrl = await browser.evaluate("[...document.querySelectorAll('a')].find(link => link.innerText.trim() === 'Simulate Payment')?.href");
      if (!simulationUrl || new URL(simulationUrl).hostname !== "secure-authentication.paymongo.com") throw new Error("The provider's official simulation link is unavailable");
      const { targetId } = await browser.send("Target.createTarget", { url: simulationUrl });
      await writeFile(path.join(cacheDirectory, "paymongo-browser-tabs.json"), JSON.stringify({ checkoutTargetId: browser.targetId, simulationTargetId: targetId }));
      const simulator = await connectPaymentBrowser(9333, targetId);
      try {
        await new Promise(resolve => setTimeout(resolve, 4000));
        const inspection = await inspectPaymentPage(simulator);
        await writeFile(path.join(cacheDirectory, "paymongo-simulation-observation.json"), JSON.stringify(inspection, null, 2));
        console.log(JSON.stringify(inspection, null, 2));
      } finally {
        simulator.close();
      }
      return;
    }
    if (process.argv.includes("--generate-test-qr")) {
      const current = await browser.evaluate("location.origin + location.pathname");
      if (current !== checkoutUrl.split("?")[0]) throw new Error("Browser is not viewing the dedicated test fixture checkout");
      await browser.evaluate("document.querySelector('button[name=qrph]').click()");
      await new Promise(resolve => setTimeout(resolve, 300));
      const continued = await browser.evaluate("(() => { const button = document.querySelector('button[name=continue]'); if (!button || button.disabled) return false; button.click(); return true; })()");
      if (!continued) throw new Error("Hosted Checkout did not allow generating the test QR");
      await new Promise(resolve => setTimeout(resolve, 6000));
    } else {
      const loaded = new Promise(resolve => browser.on("Page.loadEventFired", resolve));
      const navigation = await browser.send("Page.navigate", { url: checkoutUrl });
      if (navigation.errorText) throw new Error(`Hosted page navigation failed: ${navigation.errorText}`);
      await Promise.race([loaded, new Promise(resolve => setTimeout(resolve, 15000))]);
    }
    const inspection = await inspectPaymentPage(browser);
    await writeFile(path.join(cacheDirectory, "paymongo-browser-observation.json"), JSON.stringify({ inspection, network: captured.network, testUrls: [...captured.testUrls] }, null, 2));
    console.log(JSON.stringify({ inspection, network: captured.network, documentedTestUrlCount: captured.testUrls.size }, null, 2));
  } finally {
    browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  inspectFixture().catch(error => { console.error(error.message); process.exitCode = 1; });
}
