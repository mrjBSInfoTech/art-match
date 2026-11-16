let activeConnectionErrorCount = 0;
const connectionErrorListeners = new Set();

function notifyConnectionErrorListeners() {
  const hasError = activeConnectionErrorCount > 0;
  connectionErrorListeners.forEach((listener) => listener(hasError));
}

export function registerConnectionErrorPanel() {
  activeConnectionErrorCount += 1;
  notifyConnectionErrorListeners();
  return () => {
    activeConnectionErrorCount = Math.max(0, activeConnectionErrorCount - 1);
    notifyConnectionErrorListeners();
  };
}

export function subscribeConnectionError(listener) {
  connectionErrorListeners.add(listener);
  listener(activeConnectionErrorCount > 0);
  return () => {
    connectionErrorListeners.delete(listener);
  };
}

