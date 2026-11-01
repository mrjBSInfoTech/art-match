import rateLimit from "express-rate-limit";

export const getAuthCookieOptions = (days = 7) => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60 * 1000,
  };
};

export const clearAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
  };
};

export const parseCookies = (req) => {
  const cookieHeader = req.headers.cookie;
  const cookies = {};
  if (cookieHeader) {
    const pairs = cookieHeader.split(";");
    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx !== -1) {
        const key = pair.substring(0, idx).trim();
        const val = pair.substring(idx + 1).trim();
        if (key) {
          try {
            cookies[key] = decodeURIComponent(val);
          } catch {
            cookies[key] = val;
          }
        }
      }
    }
  }
  return cookies;
};

export const cookieMiddleware = (req, res, next) => {
  req.cookies = parseCookies(req);
  next();
};

export const getAllowedOrigins = () => {
  return new Set(
    [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL,
      process.env.PUBLIC_APP_URL,
    ]
      .filter(Boolean)
      .map((url) => url.replace(/\/+$/, "")),
  );
};

export const csrfProtection = (req, res, next) => {
  // Safe read-only HTTP methods are not state-changing
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Exempt external payment webhook callbacks that authenticate via cryptographic signature
  if (req.originalUrl.startsWith("/api/payments/paymongo/webhook")) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowed = getAllowedOrigins();

  // If origin header is present, verify against allowed origins
  if (origin) {
    const cleanOrigin = origin.replace(/\/+$/, "");
    if (
      allowed.has(cleanOrigin) ||
      (process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin))
    ) {
      return next();
    }
    return res.status(403).json({ message: "CSRF check failed: unauthorized request origin." });
  }

  // If referer is present, verify its origin
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin.replace(/\/+$/, "");
      if (
        allowed.has(refererOrigin) ||
        (process.env.NODE_ENV !== "production" &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(refererOrigin))
      ) {
        return next();
      }
      return res.status(403).json({ message: "CSRF check failed: unauthorized request referer." });
    } catch {
      return res.status(403).json({ message: "CSRF check failed: invalid referer header." });
    }
  }

  // For requests without Origin/Referer (e.g. scripts or forms attempting blind forgery),
  // require the custom X-Requested-With header which standard HTML forms cannot set
  const requestedWith = req.headers["x-requested-with"];
  if (requestedWith === "XMLHttpRequest") {
    return next();
  }

  // In development, permit direct API tools if no cookie session is attached
  if (process.env.NODE_ENV !== "production" && !req.headers.cookie) {
    return next();
  }

  return res.status(403).json({ message: "CSRF check failed: missing required request headers." });
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
});

