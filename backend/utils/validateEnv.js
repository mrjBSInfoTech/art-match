import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Ensure environment variables from backend/.env are loaded if not already present
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const WEAK_JWT_SECRETS = new Set([
  "my_super_secret_key",
  "secret",
  "changeme",
  "default_secret",
  "your_secret_key",
  "artmatch_development_jwt_secret_do_not_use_in_prod",
]);

const PLACEHOLDER_PATTERNS = [
  /dev_placeholder/i,
  /placeholder/i,
  /changeme/i,
  /your_secret/i,
  /test_placeholder/i,
];

export const isPlaceholderCredential = (val) => {
  if (!val) return true;
  return PLACEHOLDER_PATTERNS.some((pat) => pat.test(String(val).trim()));
};

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  // 1. JWT_SECRET validation (strictly enforced across ALL environments)
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || WEAK_JWT_SECRETS.has(jwtSecret.toLowerCase())) {
    errors.push("JWT_SECRET must be a high-entropy secret of at least 256 bits (32+ characters)");
  }

  // 2. Cryptographic hex secrets
  const payoutKey = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
  if (!payoutKey || !/^[a-fA-F0-9]{64}$/.test(payoutKey)) {
    errors.push("PAYOUT_ACCOUNT_ENCRYPTION_KEY must be a valid 64-character hexadecimal key (256 bits)");
  }

  const signingSecret = process.env.ARTWORK_URL_SIGNING_SECRET || process.env.JWT_SECRET;
  if (!signingSecret || signingSecret.length < 32) {
    errors.push("ARTWORK_URL_SIGNING_SECRET must be at least 32 characters");
  }

  // 3. Production enforcement: Reject default placeholders
  if (isProduction) {
    if (isPlaceholderCredential(process.env.B2_KEY_ID)) {
      errors.push("B2_KEY_ID cannot use placeholder values in production.");
    }
    if (isPlaceholderCredential(process.env.B2_APPLICATION_KEY)) {
      errors.push("B2_APPLICATION_KEY cannot use placeholder values in production.");
    }
    if (isPlaceholderCredential(process.env.PAYMONGO_SECRET_KEY) || String(process.env.PAYMONGO_SECRET_KEY || "").startsWith("sk_test_")) {
      errors.push("PAYMONGO_SECRET_KEY must be a valid live key in production.");
    }
    if (isPlaceholderCredential(process.env.PAYMONGO_WEBHOOK_SECRET)) {
      errors.push("PAYMONGO_WEBHOOK_SECRET cannot use placeholder values in production.");
    }
    if (isPlaceholderCredential(process.env.API_KEY)) {
      errors.push("API_KEY cannot use placeholder values in production.");
    }
  } else {
    // Non-production warnings
    if (isPlaceholderCredential(process.env.B2_KEY_ID)) {
      warnings.push("B2_KEY_ID is using a development placeholder.");
    }
    if (isPlaceholderCredential(process.env.PAYMONGO_SECRET_KEY)) {
      warnings.push("PAYMONGO_SECRET_KEY is using a development placeholder.");
    }
  }

  if (errors.length > 0) {
    const errorMsg = `Environment configuration validation failed:\n  - ${errors.join("\n  - ")}`;
    throw new Error(errorMsg);
  }

  if (warnings.length > 0 && !isProduction && process.env.NODE_ENV !== "test") {
    console.warn(`[validateEnv] Configuration warnings:\n  - ${warnings.join("\n  - ")}`);
  }

  return { valid: true, warnings };
}

// Automatically validate on module import
validateEnv();

