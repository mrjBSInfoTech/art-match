import QRCode from "qrcode";

export const createCertificateQr = (url) => {
  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : undefined;
  const parsed = new URL(url, baseOrigin);
  const configuredUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_PUBLIC_APP_URL
      : "";
  let configuredOrigin = null;
  if (configuredUrl) {
    try {
      configuredOrigin = new URL(configuredUrl).origin;
    } catch {
      configuredOrigin = null;
    }
  }
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password ||
      !/\/buyer\/certificate\/verify\/[a-f0-9]{64}$/.test(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error("Invalid certificate verification URL.");
  }
  const normalizedOrigin =
    typeof window !== "undefined" &&
    parsed.origin !== window.location.origin &&
    parsed.origin !== configuredOrigin
      ? (configuredOrigin || window.location.origin)
      : parsed.origin;
  const targetUrl = `${normalizedOrigin}${parsed.pathname}`;
  return QRCode.toDataURL(targetUrl, { width: 384, margin: 4, errorCorrectionLevel: "M" });
};
