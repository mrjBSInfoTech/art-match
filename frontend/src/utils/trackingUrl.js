export function getSecureTrackingUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return "";
    return value;
  } catch {
    return "";
  }
}
