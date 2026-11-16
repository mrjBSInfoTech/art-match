import QRCode from "qrcode";

export const createCertificateQr = (url) => {
  const parsed = new URL(url);
  const configuredUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_PUBLIC_APP_URL
      : "";
  const configuredOrigin = configuredUrl
    ? new URL(configuredUrl).origin : null;
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password ||
      (typeof window !== "undefined" && parsed.origin !== window.location.origin && parsed.origin !== configuredOrigin) ||
      !/\/buyer\/certificate\/verify\/[a-f0-9]{64}$/.test(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error("Invalid certificate verification URL.");
  }
  return QRCode.toDataURL(parsed.href, { width: 384, margin: 4, errorCorrectionLevel: "M" });
};
