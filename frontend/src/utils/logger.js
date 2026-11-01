/**
 * Sanitized development logger utility.
 * Suppresses verbose output in production and prevents logging sensitive data.
 */
const isDev = import.meta.env?.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (message, error) => {
    // Preserve sanitized error reporting
    if (isDev) {
      console.error(message, error?.message || error);
    } else {
      console.error(message);
    }
  },
};

export default logger;

