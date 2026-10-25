// Explicit, idempotent test-only setup. Never logs the endpoint signing secret.
import dotenv from "dotenv";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
dotenv.config({ path: envFile, quiet: true });
const key = String(process.env.PAYMONGO_SECRET_KEY || "").trim();
if (!key.startsWith("sk_test_")) throw new Error("This script only permits PayMongo TEST keys.");
const headers = { Authorization: "Basic " + Buffer.from(key + ":").toString("base64"), "Content-Type": "application/json" };
const api = async (path, options = {}) => {
  const response = await fetch("https://api.paymongo.com" + path, { ...options, headers, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok) throw new Error("PayMongo webhook setup failed (HTTP " + response.status + ").");
  return body;
};

const tunnelsResponse = await fetch("http://127.0.0.1:4040/api/tunnels", { signal: AbortSignal.timeout(5000) });
const tunnels = (await tunnelsResponse.json()).tunnels || [];
const tunnel = tunnels.find(item => item.public_url?.startsWith("https://") && /(?:localhost|127\.0\.0\.1):5000\/?$/.test(item.config?.addr || ""));
if (!tunnel) throw new Error("No HTTPS ngrok tunnel to backend port 5000 is running.");
const url = tunnel.public_url.replace(/\/$/, "") + "/api/payments/paymongo/webhook";
const listed = await api("/v1/webhooks");
if (listed.has_more) throw new Error("Webhook list is paginated. Review endpoints before creating another one.");
let endpoint = (listed.data || []).find(item => item.attributes?.url === url && item.attributes?.livemode !== true);
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ proposedUrl: url, existingEndpoint: endpoint?.id || null, applyRequired: true }));
  process.exit(0);
}
let created = false;
if (!endpoint) {
  endpoint = (await api("/v1/webhooks", { method: "POST", body: JSON.stringify({ data: { attributes: { url, events: ["checkout_session.payment.paid"] } } }) })).data;
  created = true;
}
if (!endpoint?.id) throw new Error("PayMongo did not return a webhook endpoint.");
if (!endpoint.attributes.events?.includes("checkout_session.payment.paid")) {
  endpoint = (await api("/v1/webhooks/" + encodeURIComponent(endpoint.id), { method: "PUT", body: JSON.stringify({ data: { attributes: { url, events: ["checkout_session.payment.paid"] } } }) })).data;
}
if (endpoint.attributes.status !== "enabled") {
  endpoint = (await api("/v1/webhooks/" + encodeURIComponent(endpoint.id) + "/enable", { method: "POST" })).data;
}
const secret = endpoint.attributes?.secret_key;
if (!secret || /[\r\n]/.test(secret)) throw new Error("Webhook exists but its secret is not retrievable. Set its secret from the Dashboard in backend/.env.");
let contents = await fs.readFile(envFile, "utf8");
const changed = String(process.env.PAYMONGO_WEBHOOK_SECRET || "").trim() !== secret;
if (changed) {
  contents = /^PAYMONGO_WEBHOOK_SECRET\s*=.*$/m.test(contents)
    ? contents.replace(/^PAYMONGO_WEBHOOK_SECRET\s*=.*$/m, () => "PAYMONGO_WEBHOOK_SECRET=" + secret)
    : contents.trimEnd() + "\nPAYMONGO_WEBHOOK_SECRET=" + secret + "\n";
  await fs.writeFile(envFile, contents, "utf8");
}
console.log(JSON.stringify({ created, id: endpoint.id, url, status: endpoint.attributes.status,
  events: endpoint.attributes.events, secretSaved: true, backendRestartRequired: changed }, null, 2));
