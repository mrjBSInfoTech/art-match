const clientsByAccount = new Map();

const accountKey = (role, accountId) => `${role}:${accountId}`;

export const addChatEventClient = (role, accountId, response) => {
  const key = accountKey(role, accountId);
  const clients = clientsByAccount.get(key) || new Set();
  clients.add(response);
  clientsByAccount.set(key, clients);

  response.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();
  response.write("retry: 3000\n\nevent: ready\ndata: {}\n\n");

  const heartbeat = setInterval(() => {
    if (!response.destroyed) response.write(": keep-alive\n\n");
  }, 25000);
  heartbeat.unref?.();

  response.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(response);
    if (clients.size === 0) clientsByAccount.delete(key);
  });
};

const publish = (role, accountId, payload) => {
  const clients = clientsByAccount.get(accountKey(role, accountId));
  if (!clients) return;

  const event = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((response) => {
    if (response.destroyed) {
      clients.delete(response);
      return;
    }
    response.write(event);
  });
};

export const publishChatMessage = (sellerId, buyerId, conversationId, messageId) => {
  const payload = { conversation_id: conversationId, message_id: messageId };
  publish("seller", sellerId, payload);
  publish("buyer", buyerId, payload);
};