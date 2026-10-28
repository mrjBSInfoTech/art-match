const API_BASE_URL = "http://localhost:5000";
const CACHE_TTL_MS = 180_000;

// Share requests across cards, dialogs and StrictMode remounts. Cache blobs,
// rather than object URLs, so each component owns and revokes its own URL.
export function createArtworkImageLoader({
  fetcher = (...args) => fetch(...args),
  now = () => Date.now(),
  wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  concurrency = 4,
  cacheLimit = 48,
} = {}) {
  const cache = new Map();
  const pending = new Map();
  const queue = [];
  let active = 0;
  let pauseUntil = 0;

  const drain = () => {
    while (active < concurrency && queue.length) {
      const { task, resolve, reject } = queue.shift();
      active++;
      void (async () => {
        try { resolve(await task()); }
        catch (error) { reject(error); }
        finally { active--; drain(); }
      })();
    }
  };
  const schedule = task => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    drain();
  });

  const request = async (url, options = {}) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      while (pauseUntil > now()) await wait(pauseUntil - now());
      let response;
      try { response = await fetcher(url, { cache: "no-store", ...options }); }
      catch (error) {
        if (attempt === 3 || error.name === "AbortError") throw error;
        await wait(500 * (attempt + 1));
        continue;
      }
      if (response.ok) return response;
      const retryable = response.status === 429 || [500, 502, 503, 504].includes(response.status);
      if (!retryable || attempt === 3) throw new Error(`Unable to load artwork image (${response.status}).`);
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const seconds = retryAfter && Number(retryAfter);
        const delay = retryAfter && Number.isFinite(seconds)
          ? Math.max(1000, seconds * 1000)
          : Math.max(1000, (Date.parse(retryAfter) || now() + 60_000) - now());
        pauseUntil = Math.max(pauseUntil, now() + delay);
      } else await wait(500 * (attempt + 1));
    }
  };

  return ({ filename, variant = "web", token = null }) => {
    // Buyer credentials are only used in memory and isolate personalized watermarks.
    const key = JSON.stringify([filename, variant, token]);
    for (const [cachedKey, entry] of cache) if (entry.expires <= now()) cache.delete(cachedKey);
    if (cache.has(key)) {
      const entry = cache.get(key);
      cache.delete(key); cache.set(key, entry);
      return Promise.resolve(entry.blob);
    }
    if (pending.has(key)) return pending.get(key);
    const promise = schedule(async () => {
      const response = await request(`${API_BASE_URL}/api/artwork-image-url/${encodeURIComponent(filename)}?variant=${encodeURIComponent(variant)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const { url } = await response.json();
      const signed = new URL(url, API_BASE_URL);
      if (signed.origin !== new URL(API_BASE_URL).origin || !signed.pathname.startsWith("/api/artwork-images/")) {
        throw new Error("Server returned an invalid signed artwork URL.");
      }
      const image = await request(signed);
      if (!image.headers.get("Content-Type")?.startsWith("image/")) throw new Error("Server did not return an artwork image.");
      return image.blob();
    }).then(blob => {
      cache.set(key, { blob, expires: now() + CACHE_TTL_MS });
      while (cache.size > cacheLimit) cache.delete(cache.keys().next().value);
      return blob;
    }).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };
}

export const loadArtworkImage = createArtworkImageLoader();
