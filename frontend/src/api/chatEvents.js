const chatEventsUrl = "http://localhost:5000/api/chat";

export const subscribeToChatEvents = (role, onEvent) => {
  let closed = false;
  let activeController = null;
  let retryTimeout = null;
  let resolveRetry = null;
  let retryDelay = 1000;

  const connect = async () => {
    while (!closed) {
      const controller = new AbortController();
      activeController = controller;

      try {
        const token = localStorage.getItem(`${role}_token`);
        const response = await fetch(`${chatEventsUrl}/${role}/events`, {
          headers: { Authorization: `Bearer ${token || ""}` },
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) return;
        if (!response.ok || !response.body) {
          const error = new Error("Unable to connect to chat events");
          error.status = response.status;
          throw error;
        }

        retryDelay = 1000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const lines = block.split("\n");
            const type = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
            const data = lines
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("\n");

            if (data) {
              try {
                onEvent({ type, ...JSON.parse(data) });
              } catch {
                // Ignore malformed event payloads and keep the stream alive.
              }
            }
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        if (closed || error.name === "AbortError") return;
      }

      if (closed) return;
      await new Promise((resolve) => {
        resolveRetry = resolve;
        retryTimeout = setTimeout(resolve, retryDelay);
      });
      resolveRetry = null;
      retryTimeout = null;
      retryDelay = Math.min(retryDelay * 2, 15000);
    }
  };

  connect();

  return () => {
    closed = true;
    activeController?.abort();
    clearTimeout(retryTimeout);
    resolveRetry?.();
  };
};