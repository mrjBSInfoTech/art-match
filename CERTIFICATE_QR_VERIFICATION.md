# Certificate QR enhancement

Result: **PARTIALLY VERIFIED**. Automated QR decoding, component tests, backend lifecycle tests, and local MySQL/HTTP checks passed. A real phone scan and a browser walkthrough at mobile and desktop sizes remain manual acceptance steps.

## Implementation

The existing 1200 × 800 certificate design, borders, text, custom raster templates, publication record, chat conversations, encryption, delivery scheduler, and return workflow remain in use. An opaque identity is reserved on the backend for each approved, seller-owned artwork before preview/download. `crypto.randomBytes(32)` generates its public token; repeated reservations reuse the same identity.

The destination is `PUBLIC_APP_URL` (or `FRONTEND_URL`) plus `/buyer/certificate/verify/<64-character-random-token>`. Development falls back to `http://localhost:5173`. Production requires an HTTPS public URL and rejects loopback hosts. Configure the final public domain before downloading or publishing certificates intended for printing. For separate frontend/backend hosting, set frontend `VITE_API_BASE_URL` to the backend API root, including `/api`; production otherwise uses same-origin `/api`.

Local `qrcode` generation produces a PNG data URL with a four-module quiet zone. The SVG overlays a white-backed QR at x=1000, y=602, size=126, with a small “Scan to verify” label. This lies beyond the existing footer line/date and above raster templates. Preview and download use the same SVG builder; publication embeds the backend-generated QR for the reserved identity. Published certificates reload their stored SVG with this overlay, preserving the certificate ID and original content. Existing stored certificates do not need to be republished.

The existing certificate media type remains a special system message. New messages store the public URL in the existing image/reference field and include the certificate ID in their short system text. A shared certificate-specific card generates a visible, responsive 200px QR in buyer and seller Messages. Its QR can also be tapped; there is no View Certificate button or displayed raw URL. Existing buyer and seller messages with private order-item links resolve through authenticated, participant-specific ownership-checked metadata endpoints. Ordinary encrypted text and attachment handling are unchanged.

The existing CertificateView is reused by the public route. It displays the certificate ID, Active status, and the actual certificate SVG containing title, artist, medium and issue date. Publication and paid delivery plus 24 hours are required. A completed return returns HTTP 410 and shows an unavailable message, without a valid SVG. Missing/malformed tokens return 404; not-yet-eligible certificates return 409. Public responses contain only certificate ID, validity status and certificate SVG, not buyer, payment, address, email, or chat records. Public lookups are rate limited and not cached. Ownership and approved-artwork checks remain enforced. No auth tokens or private keys are encoded in QR codes.

## Verification

- Backend certificate tests: 12 passed. Includes unsafe SVG rejection, ownership, publication, one-day gating, return invalidation, duplicate delivery prevention, actual seller SVG generation, and decoding of rasterized SVG QR codes over both standard and custom backgrounds.
- Certificate component tests: 3 passed. Actual JSX effects generate a visible QR, support previous buyer links, constrain image width, provide descriptive alt text, omit redirect buttons, and isolate QR failure.
- Related regression tests: 52 backend chat/return tests and 18 frontend chat encryption/return/order-payment tests passed.
- `jsQR` decoded the certificate overlay, actual seller preview/download SVG, and message PNG to the identical expected verification URL. Reapplying the overlay leaves one QR.
- Local MySQL: table initialization ran twice successfully; repeated identity reservation returned the same URL. An existing completed-return certificate was rejected with 410.
- Local HTTP router: malformed public token returned 404, private buyer route without login returned 401, and a completed-return public token without login returned 410. No authentication is needed for public verification.
- Scoped frontend ESLint passed. Production Vite build passed (13,400 modules); it reported the existing large-bundle warning.
- Real-device camera scan: **not performed**. Localhost QR destinations require opening on the same machine; use a configured network-accessible site URL for phone testing.
- Browser mobile/desktop visual acceptance and a new full seller-publish → delivered-order → scheduled-chat flow: **not manually performed**. Automated tests cover the relevant paths; they do not substitute for those acceptance steps.

## Files modified for this enhancement

- `backend/database/certificates.js`
- `backend/utils/certificates.js`
- `backend/routes/buyer/certificates.js`
- `backend/routes/seller/certificates.js`
- `backend/test/certificates.test.js`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/api/buyer/certificateAPI.js`
- `frontend/src/api/seller/certificateAPI.js`
- `frontend/src/components/buyer/Message/MessageCard.jsx`
- `frontend/src/components/seller/Message/MessageCard.jsx`
- `frontend/src/pages/buyer/CertificateView.jsx`
- `frontend/src/pages/seller/CertificateOfAuthenticity.jsx`
- `frontend/src/routes/AppRoutes.jsx`

## Files created

- `frontend/src/components/buyer/Message/CertificateMessage.jsx`
- `frontend/src/utils/certificateQr.js`
- `frontend/src/utils/certificateQr.test.mjs`
- `CERTIFICATE_QR_VERIFICATION.md`

Restart the backend to load the new endpoints and scheduler code. The additional `marketplace_certificate_identity` table is created by the existing certificate initialization. No order, return, payout, checkout, or ordinary chat record was modified for testing. The only existing-record addition during local verification was a reserved public certificate identity.

The running development backend was subsequently restarted after confirming it was serving an older version of the certificate router. The new public verification route is now loaded on port 5000; the private routes continue to require authentication. Refresh the browser after this restart. A valid token may still return an unavailable response when its actual delivery/return conditions do not permit access; that differs from a missing API route.

## Phone access during local development

The phone scan originally used localhost, which addresses the phone itself. Local configuration now sets backend `PUBLIC_APP_URL` and frontend `VITE_PUBLIC_APP_URL` to the computer's current Wi-Fi site URL, `http://192.168.1.6:5173`. Both environment files are ignored by Git. Vite listens on the local network and proxies `/api` to the backend. Certificate API clients default to same-origin `/api`; an explicit `VITE_API_BASE_URL` still overrides this. The QR helper accepts the configured public site origin as well as the current browser origin.

After restarting the backend, an actual delivered, active certificate was fetched through the Wi-Fi address with HTTP 200. Its embedded PNG QR was decoded and verified to contain the Wi-Fi URL plus the full verification path. The destination page returned HTTP 200 without redirecting. Three certificate message tests and scoped lint passed. The phone must share the Wi-Fi network; a physical phone scan is still awaiting user confirmation. Refresh Messages to generate a QR with the new address. Earlier screenshots/downloads containing localhost retain that old address. If the computer's Wi-Fi IP changes, update both public URL settings; use the deployed public domain for permanent printed certificates.

Additional files changed for local phone access: `frontend/vite.config.js`, the certificate API clients, and `frontend/src/utils/certificateQr.js`. The local environment settings are not committed.
