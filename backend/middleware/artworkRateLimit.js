import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";

/*
 * Artwork image protection: cap how fast anyone can pull images.
 *
 *   logged-in buyer/seller  100 requests / minute
 *   anonymous / no token     60 requests / minute
 *
 * A short burst is allowed within the window, and repeated offenders are
 * logged so an alert can be raised. Limits are keyed by the authenticated
 * account when we have one and by IP otherwise, so one logged-in account
 * cannot be masked by sharing an IP with other visitors.
 */
const WINDOW_MS = 60 * 1000;
const LOGGED_IN_LIMIT = 100;
const ANONYMOUS_LIMIT = 60;

// One account pulling more than this in an hour is worth investigating.
const HOURLY_VOLUME_THRESHOLD = 500;
const HOUR_MS = 60 * 60 * 1000;

const hourlyCounts = new Map();

const readAccount = (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    const user = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key",
    );
    const id = user.customer_id ?? user.student_id ?? user.id;
    return id ? { role: user.customer_id ? "buyer" : "account", id } : null;
  } catch {
    // An invalid token is treated as anonymous, which has the stricter limit.
    return null;
  }
};

const trimHourly = (now) => {
  if (hourlyCounts.size < 5000) return;
  for (const [key, entry] of hourlyCounts) {
    if (now - entry.resetAt >= 0) hourlyCounts.delete(key);
  }
};

const trackHourlyVolume = (req, account) => {
  const now = Date.now();
  trimHourly(now);
  const key = account ? `${account.role}:${account.id}` : `ip:${req.ip}`;
  let entry = hourlyCounts.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + HOUR_MS, warned: false };
    hourlyCounts.set(key, entry);
  }
  entry.count += 1;

  if (entry.count === HOURLY_VOLUME_THRESHOLD && !entry.warned) {
    entry.warned = true;
    console.warn(
      `[artwork-protection] volume alert: ${key} requested ${entry.count} artwork images within one hour.`,
    );
  }
};

const limiterFor = (limit, label) =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Identify by account before falling back to a normalised IP. The helper
    // collapses IPv6 addresses to their /64 subnet so a caller cannot rotate
    // through its own address block to dodge the limit.
    keyGenerator: (req) => {
      const account = readAccount(req);
      return account
        ? `${account.role}:${account.id}`
        : `ip:${ipKeyGenerator(req.ip)}`;
    },
    handler: (req, res, next, options) => {
      const account = readAccount(req);
      console.warn(
        `[artwork-protection] rate limit (${label}) exceeded by ${account ? `${account.role}:${account.id}` : `ip:${req.ip}`
        } on ${req.originalUrl.split("?")[0]}`,
      );
      res.status(options.statusCode).json({
        message: "Too many artwork image requests. Please slow down.",
      });
    },
  });

const authenticatedLimiter = limiterFor(LOGGED_IN_LIMIT, "authenticated");
const anonymousLimiter = limiterFor(ANONYMOUS_LIMIT, "anonymous");

// Logged-in accounts get the higher ceiling; everyone else the lower one.
export const artworkImageRateLimit = (req, res, next) => {
  const account = readAccount(req);
  trackHourlyVolume(req, account);
  return (account ? authenticatedLimiter : anonymousLimiter)(req, res, next);
};

// A request that fails signature validation is a strong signal of scraping or
// URL tampering, so record it without ever exposing the reason to the client.
export const recordArtworkDenied = async (req) => {
  const account = readAccount(req);
  console.warn(
    `[artwork-protection] rejected unsigned or tampered artwork image request from ${account ? `${account.role}:${account.id}` : `ip:${req.ip}`
    }`,
  );
};

// Exposed for tests only.
export const __testing = {
  LOGGED_IN_LIMIT,
  ANONYMOUS_LIMIT,
  HOURLY_VOLUME_THRESHOLD,
  readAccount,
};
