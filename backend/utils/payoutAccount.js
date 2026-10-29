import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Dedicated server key; never derive financial encryption from a public value
// or the application's fallback JWT secret. Versioned AES-256-GCM envelope.
const encryptionKey = () => {
  const value = String(process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY || "");
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    const error = new Error("Payout account encryption is not configured. Contact the administrator.");
    error.status = 503;
    throw error;
  }
  return Buffer.from(value, "hex");
};

export function encryptPayoutAccount(number, sellerId) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`artmatch:payout-account:${sellerId}`));
  const encrypted = Buffer.concat([cipher.update(number, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptPayoutAccount(value, sellerId) {
  const key = encryptionKey();
  try {
    const [version, iv, tag, ciphertext, extra] = String(value).split(".");
    if (version !== "v1" || extra || !iv || !tag || !ciphertext) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from(`artmatch:payout-account:${sellerId}`));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    const error = new Error("Unable to read the saved payout destination. Contact the administrator.");
    error.status = 503;
    throw error;
  }
}

export const maskPayoutAccount = number => "*".repeat(Math.max(4, number.length - 4)) + number.slice(-4);

export function payoutAccountDto(account) {
  if (!account) return null;
  const accountNumber = decryptPayoutAccount(account.account_number_ciphertext, account.student_id);
  return {
    destinationType: account.destination_type,
    institutionCode: account.institution_code,
    institutionName: account.institution_name,
    provider: account.institution_provider,
    accountName: account.account_name,
    accountNumber,
    maskedAccountNumber: maskPayoutAccount(accountNumber),
  };
}
