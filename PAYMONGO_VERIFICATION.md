# Current checkout flow — 26 October 2026

Online payment attempts remain internal until payment is confirmed. Buyer and seller Orders now include COD purchases and Paid/Refunded online purchases, including paid cancelled records that require refund review. Old unpaid, failed and expired attempts no longer appear in those lists; their records remain available for secure payment reconciliation.

Checkout has only Secure Online Payment and Cash on Delivery. Secure Online Payment sends all configured TEST methods to PayMongo, where the buyer chooses GCash, Maya, card or QR Ph. There is no ArtMatch channel selector, and legacy client channel fields cannot restrict a new Hosted Checkout Session. LIVE mode still intersects configured methods with activated merchant capabilities. The capability endpoint returning only `qrph` must not restrict the TEST simulators.

Correction to the earlier investigation: a fresh all-method TEST session was inspected in an interactive browser. PayMongo rendered Card and E-Wallets controls; expanding E-Wallets showed GCash and Maya, and Card opened its enabled card form. The earlier HTML matcher inspected named buttons only and missed those sections, so the conclusion that TEST supported only QR Ph was incorrect. This verifies option availability, not completed wallet/card authorization. No payment was entered or submitted, and every diagnostic session was expired afterward.

PayMongo success/cancel URLs now return to Checkout. The authenticated checkout-status endpoint verifies payment independently of the browser URL. A successful paid checkout then opens buyer Orders. Cancellation expires the provider session, preserves the cart and keeps the unpaid attempt out of Orders. Legacy return URLs are forwarded through the same verification flow.

Seller fulfillment supports Pending → Confirmed → Packed → Shipped → Delivered for eligible paid online/COD orders. Packing requires parcel photos; shipping supports a tracking link. Unpaid online attempts remain protected from fulfillment.

Validation completed:

- 102 backend payment tests and 38 frontend payment/order tests passed.
- Focused ESLint and the frontend production build passed.
- 12 real TEST-mode lifecycle checks passed, including hidden unpaid attempts, authoritative checkout status, enabled methods, selective cart behavior, provider expiry and actual COD fulfillment with a B2 parcel photo.
- A hidden browser followed PayMongo's official Cancel link back to Checkout; both temporary attempts became Cancelled/Expired, no Orders cards appeared, and all three cart items remained.
- All disposable fixture data, test tokens and test parcel photos were removed.

The dated report below describes earlier verification; its old Orders-page retry/cancel UI has been superseded by the Checkout flow above.

# Earlier PayMongo verification — 25 October 2026

## 1. Result

**Partially verified across all requested payment channels; actual QR Ph TEST checkout is verified end to end.**

A real PayMongo Hosted Checkout TEST session for PHP 3,300 was authorized once using PayMongo's official QR Ph **Authorize Test Payment** simulator. No QR was scanned and no real money was used. PayMongo delivered the real webhook through ngrok, ArtMatch validated it, and both seller orders became Paid in MySQL. Browser return displayed **Payment confirmed** only after backend confirmation.

Current merchant capabilities return **qrph only**. Card success/decline, 3DS, GCash, Maya and banking authorization cannot be claimed as tested on this account.

Observed evidence:

| Field | Observed value |
| --- | --- |
| Test payment reference | AM-882a293f-7fc2-4115-8baf-906abe23a21e |
| Checkout Session | cs_fb6664ab2cf2b728a7005e79 |
| Payment | pay_WUPS7a9t21CwaCdEDfFJJj3X |
| Actual channel | qrph |
| Order 14 total | PHP 1,150.00 |
| Order 15 total | PHP 2,150.00 |
| Payment time | 2026-10-25T12:10:49.000Z |
| ngrok delivery time | 2026-10-25T20:10:50+08:00 |
| Incoming event | checkout_session.payment.paid, livemode=false |
| Webhook response | HTTP 200 |
| Purchased quantities | One each for the two purchased test artworks |
| Remaining cart | Newly added unrelated artwork, PHP 500.00 |
| Seller processing | Both paid orders successfully confirmed through the actual API |

All dedicated fixture customers, sellers, artwork, addresses, carts, orders, interactions and cached test tokens were removed after verification. Existing project records were retained. PayMongo's test payment remains in its test history.

## 2. Files changed

The following files belong to the payment implementation/verification. Concurrent event-page work in other files was preserved.

| File | Change |
| --- | --- |
| backend/utils/paymongo.js | Validated centavos, line items, return URLs, backend Basic authentication, v2 creation, enabled-channel filtering, official v1 retrieve/expire, strict test/live signatures and freshness. |
| backend/routes/payments/paymongo.js | Transactional whole-group payment validation, amount/currency/session/reference checks, stock recheck, idempotency, actual channel/time, selective cart removal, purchase tracking and refund-review protection. |
| backend/routes/buyer/orders.js | Trusted prices, multi-seller grouping, one session, recovery URL/reference, duplicate-attempt guard, safe same-session retry, provider-confirmed cancellation, paid cancellation protection and COD cleanup. |
| backend/routes/seller/orders.js | Backend fulfillment/payment gates, safe cancellation policy, payment metadata, COD collection on delivery. |
| backend/database/orders.js | Idempotent checkout URL column and payment enum compatibility; preserves existing records and handling columns. |
| backend/utils/artworkAvailability.js | Canonical completed-sale SQL and matching stock validation for JSON null, empty, invalid and tracked inventory. |
| backend/routes/buyer/artwork.js | Payment-aware public catalog/detail/profile stock and seller sales. |
| backend/routes/buyer/cart.js | Shared stock policy; uncached cart reads. |
| backend/routes/buyer/recommendation.js | Same availability policy for candidate selection and hydration; no recommendation architecture changes. |
| backend/server.js | Safe malformed-JSON responses; retained exact webhook raw-body capture. |
| backend/routes/admin/event.js | Minimal default Express router export in an empty newly imported module that otherwise prevented server startup. Event feature implementation remains outside payment scope. |
| frontend/src/api/buyer/orderAPI.js | Retry/cancel group APIs, uncached abortable reads, safe 409 metadata, immediate cart event only for COD. |
| frontend/src/pages/buyer/Checkout.jsx | Saved address selection, canonical payment options, double-submit guard, session reference, top-level redirect and resume-existing-checkout link. |
| frontend/src/pages/buyer/Order.jsx | Server-confirmed payment labels, return verification, retry/cancel controls, paid polling and refund-review notice. |
| frontend/src/pages/buyer/Cart.jsx | Publishes the initial authoritative cart count, including zero. |
| frontend/src/pages/seller/Order.jsx | Payment labels, unpaid fulfillment/label-printing gates, sales exclusion and COD status refresh. |
| frontend/src/pages/seller/Sales.jsx | Clarified sales caption. |
| frontend/src/utils/sellerSales.js | Excludes unpaid online attempts from shared sales metrics. |
| frontend/src/utils/orderPayments.js | Shared display, fulfillment, sales, resume and return-verification rules. |
| backend/test/paymentHarness.js | Isolated real-handler transactional test fixture; no provider/production DB calls. |
| backend/utils/paymongo.test.js | Money, methods, API, signature and expiry tests. |
| backend/routes/payments/paymongo.test.js | Paid group integrity, rollback, duplicate delivery, signatures, stock conflicts and selective cart regression tests. |
| backend/routes/buyer/orders.payment.test.js | Trusted checkout, COD, retry, ownership and cancellation-race tests. |
| backend/routes/seller/orders.payment.test.js | Unpaid/paid transitions, seller cancellation restrictions and COD collection tests. |
| backend/database/orders.payment.test.js | Idempotent migration/data-preservation tests. |
| backend/routes/buyer/artwork.availability.test.js | Catalog/detail/profile/recommendation availability SQL checks. |
| backend/utils/artworkAvailability.test.js | Shared inventory policy and invalid stock boundary tests. |
| backend/utils/artworkAvailability.mysql.test.js | Opt-in read-only real MySQL payment/stock parity checks. |
| backend/routes/buyer/orders.mysql.test.js | Opt-in execution of actual production checkout/retry/webhook SELECT projections against MySQL. |
| frontend/src/api/buyer/orderAPI.test.mjs | Axios adapter contract checks. |
| frontend/src/utils/orderPayments.test.mjs | Payment/sales/display rules. |
| frontend/src/utils/paymentPages.test.mjs | Actual JSX handlers/effects tested with existing SWC, including return/cancel/retry/cart behavior. |
| backend/scripts/checkPaymongoIntegration.js | Read-only environment, DB, local server, ngrok, channel and webhook diagnostics; secret values omitted. |
| backend/scripts/setupPaymongoTestWebhook.js | Explicit test-only, idempotent webhook setup using the current ngrok URL; signing secret saved only in ignored backend/.env. |
| backend/scripts/smokePaymongoServer.js | Real HTTP middleware/security and unchanged-data checks. |
| backend/scripts/smokePaymongoTestCheckout.js | Real provider test creation/retrieval/hosted-page/expiry without payment. |
| backend/scripts/testPaymongoCheckoutFlow.js | Strictly labelled temporary real DB fixtures; online/COD/retry/cancel verification and ownership-checked cleanup. |
| backend/scripts/paymongoBrowserProbe.js | Isolated Chrome CDP test helper and official QR Ph simulation controls; no real QR payment. |
| backend/scripts/checkPaymongoDeliveries.js | Sanitized read-only evidence from the local ngrok request inspector. |
| backend/.env (Git-ignored) | Saved the signing secret of the newly registered test webhook; no values printed or committed. |

Additional B2 image fixes requested during verification are described in section 9.

## 3. Database changes

The existing ensureOrderTables startup migration added nullable **marketplace_order.paymongo_checkout_url VARCHAR(2048)**. Existing payment_status values and payment ID/channel/time fields were already present. Existing handling_instructions was retained/ensured by the startup migration.

Correct current enums no longer undergo unconditional ALTER statements. Older enums are expanded safely; known legacy online labels preserve their channel while normalizing to paymongo. Unknown historical values are preserved for review. No existing order table was recreated or historical payment status manually changed.

Synthetic test fixtures were created only for the authorized integration tests, verified through real APIs, and cleaned up using exact labelled ownership checks.

## 4. Resulting payment flow

Buyer cart → saved address + Secure Online Payment → backend reloads trusted artwork prices → one Pending order per seller → shared reference → **one v2 Checkout Session** → top-level PayMongo redirect → official test authorization → PayMongo webhook → raw-body HMAC/mode/freshness validation → lock whole order group → validate reference/session/PHP/full trusted total → stock recheck → all applicable seller orders Paid atomically → purchase interactions once → remove only purchased cart items → recalculate remaining total → seller fulfillment unlocked.

The browser redirect never sets Paid. Payment and fulfillment status remain separate.

Pending online sessions do not count as sold or revenue, and sellers cannot process them. COD preserves the placed-order stock policy and becomes Paid with paid_at when delivered/collected.

Retries reuse an active provider session. Explicit buyer cancellation expires the provider session first, then marks the whole unpaid group Expired/Cancelled. If the provider reports paid/processing or refuses expiry, local cancellation is rejected. Paid cancellation requires a real refund/support process; none is fabricated.

Because unpaid attempts do not reserve stock, a different buyer may complete a purchase first. A later paid checkout that no longer has sufficient stock is recorded financially as Paid but has fulfillment Cancelled, with a refund-review warning; it does not double-sell inventory or create purchase/cart effects. Refund handling remains a support operation.

These choices follow current official [Hosted Checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout), [session lifecycle](https://docs.paymongo.com/docs/payment-channels-key-concepts), and [webhook signature](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management) documentation.

## 5. Test results

| Test | Result and evidence |
| --- | --- |
| Backend startup | PASS — updated server started on port 5000; temporary 5001 verification server stopped |
| Frontend startup/build | PASS — real Chrome loaded ArtMatch; production Vite build passed, existing bundle-size warning only |
| Focused backend regression suite | PASS — 106 tests |
| Focused frontend payment suite | PASS — 23 tests, including automatic Cancel return and paid/processing safeguards |
| Real MySQL query/payment/stock parity | PASS — 3 read-only tests, including 24 stock input cases |
| Real HTTP raw-body/security smoke | PASS — 12 checks, including malformed JSON, invalid signatures and unchanged financial/cart data |
| Real Hosted Checkout creation/retrieval/expiry | PASS — PHP 3,300 unpaid session, hosted page HTTP 200, official expiry confirmed |
| Real two-seller Pending checkout | PASS — one provider session, 1,150 + 2,150 trusted totals, stock/cart retained, zero purchase interactions |
| Real pending seller protection | PASS — both sellers' confirmation attempts returned 409 |
| Real retry/duplicate checkout guard | PASS — same active session resumed; second checkout blocked |
| Real QR Ph success | PASS — official test simulator → actual provider webhook → HTTP 200 → both MySQL rows Paid |
| Real payment metadata | PASS — provider and MySQL payment ID, qrph channel and timestamp matched |
| Real selective cart cleanup | PASS — bought items removed; unrelated PHP 500 item retained; total recalculated |
| Real buyer/seller paid behavior | PASS — buyer API Paid, paid cancellation rejected, both sellers can confirm |
| Real cancellation/abandonment policy | PASS — provider session expired, whole group cancelled, cart and stock retained |
| Actual PayMongo Cancel/Back return | PASS — official hosted-page return link clicked in Chrome; ArtMatch automatically expired the provider session, marked both seller orders Cancelled/Expired and retained all three cart items |
| Real COD | PASS — multi-seller orders, cart removal, purchase tracking and seller confirmation |
| COD delivered/collected | PASS — isolated route tests verify Paid and paid_at atomically |
| Duplicate webhook | PASS — isolated real-handler regression; no duplicate purchase effects or deletion of re-added cart items. A provider dashboard resend was not performed |
| Wrong amount/currency/session/reference | PASS — isolated route tests; no database mutation on rejection |
| Stock conflicts / insufficient quantity | PASS — isolated handler tests; real MySQL SELECT compatibility and stock rules also checked |
| Actual card success/decline | NOT TESTABLE AUTOMATICALLY with current account — card not enabled |
| Actual 3DS | NOT TESTABLE AUTOMATICALLY with current account — card not enabled |
| Actual GCash/Maya success/failure | NOT TESTABLE AUTOMATICALLY with current account — channels not enabled |
| Actual direct banking | NOT TESTABLE AUTOMATICALLY with current account — no enabled banking channel |
| Frontend focused lint | PASS for changed payment production files and image components; existing admin Dashboard has nine unrelated unused-state/helper errors |
| Current tracked secret scan | PASS — env files ignored, no tracked long provider secret matches; Git history was not exhaustively audited |
| Real money / raw card storage | No real money or real credentials used; Hosted Checkout collects payment details |

Baseline failing tests were inspected and corrected. Failures found during this work included missing payment validation, unsafe pending fulfillment/cancellation, actual artwork availability status differing from approval status, JSON-null stock coercion, malformed JSON errors, a missing empty-router export, and image edit-preview sizing. Relevant checks were rerun after fixes.

## 6. Exact commands run

See **[PAYMONGO_COMMANDS.txt](PAYMONGO_COMMANDS.txt)** for the consolidated terminal command log, including inspection, baseline failures, validation, server restarts, test fixture setup/cleanup and isolated browser commands. Repeated identical invocations are consolidated. File edits used apply_patch and are not shell commands. Credential values are excluded.

Main repeatable verification commands, from the repository root unless noted:

~~~powershell
node --test backend/utils/paymongo.test.js backend/routes/payments/paymongo.test.js backend/routes/buyer/orders.payment.test.js backend/routes/seller/orders.payment.test.js backend/database/orders.payment.test.js backend/routes/buyer/artwork.availability.test.js backend/utils/artworkAvailability.test.js
node backend/scripts/smokePaymongoServer.js http://127.0.0.1:5000
node backend/scripts/checkPaymongoIntegration.js --summary
node backend/scripts/checkPaymongoDeliveries.js
~~~

From backend:

~~~powershell
$env:PAYMENT_READONLY_MYSQL_TEST = '1'
node --test routes/buyer/orders.mysql.test.js utils/artworkAvailability.mysql.test.js
node scripts/testPaymongoCheckoutFlow.js
~~~

From frontend:

~~~powershell
node --test src/utils/paymentPages.test.mjs src/utils/orderPayments.test.mjs src/api/buyer/orderAPI.test.mjs
npm run build
~~~

The fixture script is TEST-key-only and deliberately mutates/cleans labelled temporary fixtures. Diagnostic scripts are read-only unless their name/explicit --apply operation states otherwise.

## 7. Manual actions still required

For **additional channel verification only**, the account owner must request/enable Card, GCash, Maya and any intended bank methods in PayMongo, then authorize their official test flows. The current account reports only qrph.

**No webhook Dashboard setup remains required for the current tunnel.** The test webhook was created and verified enabled, subscribed to checkout_session.payment.paid, and its signing secret matches backend/.env.

Current endpoint:

~~~text
https://humped-sensitive-jeeringly.ngrok-free.dev/api/payments/paymongo/webhook
~~~

If the tunnel hostname changes, update the registered test endpoint before testing again. The setup script can configure the current tunnel explicitly with --apply. Do not use a real bank/e-wallet to pay a generated QR: use only PayMongo's documented [test simulator](https://docs.paymongo.com/docs/payment-acceptance-testing).

## 8. Production readiness and limits

| Item | Status |
| --- | --- |
| Provider secret and webhook secret backend-only | Ready in current code; ignored env file |
| Card/CVC collected or stored by ArtMatch | No — provider Hosted Checkout handles payment input |
| Live mode switched / live keys inserted | No |
| Public HTTPS webhook in local testing | Verified through current ngrok tunnel |
| Stable production HTTPS backend + webhook | Not configured or verified here |
| Separate live webhook/signing secret | Required for production; not created |
| Requested channel activation | Only qrph currently available |
| Beneficiary-owned account and production keys | Ownership not verified; required before production |
| No localhost production URLs | Not ready — existing frontend API URLs remain development localhost URLs |
| No ngrok dependency in production | A production host is still required |
| Automated refund integration | Not implemented; paid cancellation blocked and stock conflicts require support review |
| Secrets absent from all historical commits | Not exhaustively verified; current tracked-file scan passed |

No unrelated ML, B2 storage, chat or authentication architecture was replaced.

## 9. Seller/admin B2 artwork image follow-up

The buyer uses signed artwork image requests; seller/admin components were still using unsigned /uploads/seller/uploadArtwork URLs, which the backend rejects with 403.

Added **frontend/src/components/common/ArtworkImage.jsx**, reusing the existing protected signed image loader without sending stale buyer credentials from seller/admin views. Kept the buyer's default identity behavior. Local data/blob upload previews remain supported. Added a stable height for the edit preview so lazy image loading can observe it.

Updated artwork cards/details/form, seller profile/storefront/review thumbnails and admin Dashboard artwork thumbnails. No B2 bucket permissions, storage keys or signature protection were weakened.

**Nine actual browser checks passed:** seller card, admin card, seller profile card, seller storefront card, seller details, admin details, seller edit preview, absolute B2 URL and local file preview. Eight signed image downloads returned HTTP 200. Frontend build passed. Added **backend/scripts/checkArtworkImageRendering.js** as an optional local Chrome/CDP check.

Additional image files changed:

- frontend/src/components/common/ArtworkImage.jsx
- frontend/src/components/buyer/Artwork/WatermarkedArtworkImage.jsx
- frontend/src/components/seller/Artwork/ArtworkCard.jsx
- frontend/src/components/seller/Artwork/ArtworkInfo.jsx
- frontend/src/components/seller/Artwork/ArtworkForm.jsx
- frontend/src/components/seller/Profile/ProfileCard.jsx
- frontend/src/components/seller/Storefront/StorefrontCard.jsx
- frontend/src/components/admin/Artwork/ArtworkCard.jsx
- frontend/src/components/admin/Artwork/ArtworkInfo.jsx
- frontend/src/pages/admin/Dashboard.jsx
- frontend/src/pages/seller/Profile.jsx
- backend/scripts/checkArtworkImageRendering.js

Verification artifacts: this report and PAYMONGO_COMMANDS.txt.

## 10. Follow-up: missing methods and Cancel return

The initial capability response contained only qrph. A further TEST request explicitly asked PayMongo for card, gcash, paymaya and qrph together. The original HTML check found only the named qrph button, but this did not inspect the Card and E-Wallets sections. The newer interactive browser check documented above confirms those TEST options are available. Production activation requirements remain separate from TEST simulator availability.

The Pending entry previously remained after a PayMongo Cancel redirect because returning to cancel_url did not call ArtMatch's cancellation API. It was an unpaid attempt, not a completed order, but required a second Cancel checkout click. Updated frontend/src/pages/buyer/Order.jsx to automatically call the existing safe cancellation API for the checkout launched in the same tab. It waits for provider-confirmed expiry and refreshes orders; the cart remains unchanged. A copied cancel URL without the matching stored checkout reference does not trigger cancellation. Paid payments are never auto-cancelled; processing/refused cancellation remains unchanged with an error message.

Added three JSX regressions and backend/scripts/testPaymongoCancelReturn.js. The real browser test clicked Resume payment, opened PayMongo, clicked its official Cancel/Back link, then observed test orders 21 and 22 as Cancelled/Expired and all three cart artworks retained. Dedicated fixtures and the hidden browser were cleaned up. The updated frontend suite passes 23 tests and the changed Orders page passes focused ESLint.

Account-owner action is still required to activate/request access to Card, GCash and Maya. Once enabled, use a new checkout session to pick up the newly available methods. Existing historical unpaid attempts can be cancelled explicitly with Cancel checkout.

Final cleanup: the isolated Chrome test browser and temporary port 5001 server were closed. ArtMatch was left running on port 5000 with the latest backend changes, and all 12 HTTP smoke checks passed again. No cached fixture token/state file remains. This report and PAYMONGO_COMMANDS.txt were added as review artifacts.

