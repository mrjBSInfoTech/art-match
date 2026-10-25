// Read only the local tunnel inspector; never prints headers, billing, or bodies.
const response = await fetch("http://127.0.0.1:4040/api/requests/http?limit=50", { signal: AbortSignal.timeout(5000) });
if (!response.ok) throw new Error("The local ngrok inspector is unavailable.");
const body = await response.json();
const requests = (body.requests || []).filter(item => item.request?.uri?.startsWith("/api/payments/paymongo/webhook"));
const deliveries = requests.map(item => {
  let event = {};
  try {
    const raw = Buffer.from(item.request?.raw || "", "base64").toString("utf8");
    const separator = raw.indexOf("\r\n\r\n");
    const parsed = JSON.parse(separator >= 0 ? raw.slice(separator + 4) : raw);
    event = parsed.data?.type === "event" ? parsed.data.attributes : parsed.data || {};
  } catch { /* Inspector may omit a body; status/time still provide evidence. */ }
  return { requestId: item.id, receivedAt: item.start, statusCode: item.response?.status_code,
    eventType: event.type, livemode: event.livemode,
    checkoutSessionId: event.data?.id, reference: event.data?.attributes?.reference_number };
});
console.log(JSON.stringify({ inspectedWebhookRequests: deliveries.length, deliveries }, null, 2));
