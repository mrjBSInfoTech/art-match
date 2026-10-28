# Seller earnings and payouts — implementation and verification

Verified on 28 October 2026, Asia/Manila.

## 1. Result

**PARTIALLY VERIFIED — BLOCKED FOR LIVE PAYOUT.**

The database-backed earnings, destination settings, delivery/return/refund holds, admin authorization, transfer reservation, reconciliation, and UI are implemented and tested. Actual external transfer completion is blocked: a read-only request using the configured TEST account returned HTTP 200 with `data: []` from `GET /v2/wallets`. There is no provisioned TEST Wallet. LIVE Wallet availability and marketplace approval are unverified.

No real funds were moved. No provider transfer or refund was created. Provider success/failure/concurrency checks used an explicitly simulated provider against real MySQL fixtures. All fixtures were removed.

Seller UI: `/seller/settlement-payout`. Admin UI: `/admin/payouts`.

### Latest TEST readiness recheck

The subsequent provisioning recheck again returned HTTP 200 with exactly `{"data":[]}` from `GET /v2/wallets`, using only the existing TEST secret. The user confirmed that sandbox Wallet provisioning is still pending. No Wallet ID was invented, no LIVE Wallet or credentials were used, and outbound configuration remains disabled.

- Read-only receiving-institution lookup: 218 canonical entries; GCash and Maya are present.
- Existing TEST webhook: enabled, but neither outbound transfer event is subscribed yet. Subscription and genuine provider event delivery remain pending prerequisites for transfer testing.
- Re-run focused payout/eligibility/permission/migration/payment-webhook tests: 135 passed.
- Re-run MySQL payout integration with a simulated provider: 12 checks passed, fixtures cleaned.
- Actual provider transfers: none attempted. Status remains **PARTIALLY VERIFIED**.

After PayMongo confirms sandbox provisioning, retrieve the actual `wallet_...` ID automatically from the TEST `GET /v2/wallets` response, validate its mode/status, and resume the blocked provider checks. Do not substitute a LIVE resource.

The further recheck requested after the subsequent provisioning confirmation still returned HTTP 200 with exactly `{"data":[]}`. The effective TEST key was confirmed to match the project's `backend/.env`; no different inherited credential was overriding it. No Wallet ID was available to configure. TEST payouts and LIVE payouts remain disabled, and no actual provider transfers were attempted. Evidence: `backend/.cache/payout-wallet-recheck-results.json`. The account's sandbox Wallet must become visible to this same TEST key before provider success/failure/webhook tests can proceed. The workflow therefore cannot yet be marked FULLY VERIFIED.

## 2. Files created

- `backend/.env.example`
- `backend/database/payouts.js`
- `backend/database/payouts.test.js`
- `backend/middleware/payoutAdminMiddleware.js`
- `backend/routes/admin/payouts.js`
- `backend/routes/seller/payouts.js`
- `backend/scripts/testPayoutsFlow.js`
- `backend/test/payoutAdmin.test.js`
- `backend/utils/paymongoPayouts.js`
- `backend/utils/paymongoPayouts.test.js`
- `backend/utils/payoutAccount.js`
- `backend/utils/payoutEligibility.js`
- `backend/utils/payoutEligibility.test.js`
- `backend/utils/payouts.js`
- `frontend/src/api/admin/payoutAPI.js`
- `frontend/src/components/seller/Payout/PayoutAccount.jsx`
- `frontend/src/components/seller/Payout/PayoutMetrics.jsx`
- `frontend/src/components/seller/Payout/PayoutTable.jsx`
- `frontend/src/components/seller/Payout/payoutDisplay.js`
- `frontend/src/components/seller/Payout/payoutPages.test.mjs`
- `frontend/src/pages/admin/Payout.jsx`
- `SELLER_PAYOUT_VERIFICATION.md`

## 3. Files modified

- `backend/routes/buyer/orders.payment.test.js` — updated the downstream earnings expectation to Held.
- `backend/routes/payments/paymongo.js` — documented transfer events reuse existing signature verification and trigger independent provider reconciliation.
- `backend/routes/seller/orders.js` — existing payout summary route now uses the centralized earnings service.
- `backend/server.js` — mounts payout routes and initializes additive payout tables.
- `backend/test/paymentHarness.js` — payout dependency support for existing checkout/webhook tests.
- `backend/test/returns.test.js` — return/payout reservation boundary regression.
- `backend/utils/paymongoReconciliation.js` — confirmed online payments remain Held rather than immediately becoming Eligible.
- `backend/utils/returns.js` — uses the existing order lock to prevent a new deadline-boundary return from conflicting with a reserved transfer.
- `frontend/src/api/seller/payoutAPI.js` — destination and institution APIs.
- `frontend/src/layouts/AdminLayout.jsx` — Seller Payouts navigation.
- `frontend/src/pages/seller/Payout.jsx` — existing page reused for earnings, holds and destination settings.
- `frontend/src/routes/AppRoutes.jsx` — protected admin payout route.

Local, ignored `backend/.env`: generated a dedicated encryption key because none existed. Payment credentials were preserved; outbound and LIVE payouts were not enabled. Back up the encryption key securely. Rotating or losing it makes previously saved destinations unreadable.

The pre-existing change in `frontend/src/components/buyer/Message/MessageCard.jsx` was preserved. Checkout UI, cart, artwork upload, recommendations, favorites, events, chat encryption, reviews and certificates were not rewritten for this feature.

## 4. Database changes

Reused **`seller_payment_split`** as the sole logical earnings/payout ledger. Its existing `UNIQUE(order_id)` continues to guarantee one logical balance per seller order. Added:

- `provider_transfer_id`, `provider_reference`, `failure_reason`
- `requested_at`, `failed_at`
- `refund_amount`, `payout_amount`, `hold_reason`
- `Failed` and `Cancelled` statuses, preserving existing statuses including `Reversed`
- unique provider-transfer index

Created:

| Table | Purpose and protections |
| --- | --- |
| `seller_payout_account` | One destination per student, `UNIQUE(student_id)`, student FK, canonical institution/rail, account name, authenticated encrypted account number. |
| `seller_payout_attempt` | Durable attempt history, split FK, unique reference and provider-transfer ID, positive integer centavos, encrypted destination snapshot, initiating admin, processing/final timestamps. |
| `seller_order_refund` | Provider-verified refund evidence attributed to a seller order and optionally a return; order/return FKs, positive amount, globally unique provider refund ID. |

Initialization uses `CREATE TABLE IF NOT EXISTS` and guarded column/enum/index additions. It ran repeatedly without duplicate-column/table/index failures. No destructive import or financial-data rewrite was used. Existing Paid/Processing payouts remain protected; no legacy Paid row without provider evidence was found in the inspected database.

## 5. Payout flow

```text
Verified buyer payment = Paid
  → existing seller split remains Held
  → Confirmed → Packed → Shipped → Delivered
  → immutable delivered_at + exactly 7 days, using MySQL time
  → no unresolved return/refund and valid accounting
  → Eligible
  → authorized admin reviews and selects Send Payout
  → order/destination/eligibility revalidated under database locks
  → durable Processing attempt committed
  → PayMongo Wallet request outside the transaction
  → provider pending: Processing
  → provider succeeded: Paid
  → provider failed: Failed
```

Reading earnings may refresh eligibility. It never sends money, retries a failed transfer, or uses a browser clock to authorize payment. There is no payout scheduler. Sellers cannot initiate transfers or mark earnings Paid.

The order is locked first, matching the existing return workflow. At the inclusive seven-day boundary, return creation and payout reservation cannot both commit independently. Destination changes serialize with payout reservation and are rejected while a payout is Processing.

## 6. Payout amount calculation

Amounts use safe integer centavos in application calculations and existing decimal snapshots in MySQL.

```text
payout = max(0, stored seller net amount − successful, order-attributed refunds)
```

Before payout, the service verifies purchased item quantities/prices against the immutable order subtotal and verifies that the seller, currency, gross, commission, processing-fee and net snapshots balance.

Current project policy is **full artwork subtotal**, with shipping zero, commission zero and attributed processing fee zero. No commission, gateway fee sharing or shipping allocation was invented. Historical accounting with a nonzero/unrecognized fee or shipping policy is Held for review rather than guessed. The outbound transfer fee reserve is funded by the platform Wallet and does not reduce seller earnings.

Requested refunds do not reduce earnings. Pending verified refunds hold them. Successful partial refunds reduce only their allocated seller-order balance. Successful full refunds cancel the payable balance without sending a zero transfer. COD never enters the PayMongo payout ledger view or transfer path.

## 7. PayMongo integration

The outbound helper is separate from the existing buyer Checkout helper. It follows the current official Wallet API:

- Basic authentication with backend secret key and empty password.
- Canonical recipient institutions from `GET /v1/wallets/receiving_institutions` for InstaPay/PESONet.
- Activated Wallet and available funds from `GET /v2/wallets/:id`.
- One transfer through `POST /v2/batch_transfers`, with the plain `transfers` array, integer centavos, trusted source/destination and durable reference.
- Status lookup through `GET /v2/transfers/:id`; unknown outcomes reconcile through the documented reference-number lookup.
- Pending/succeeded/failed map to Processing/Paid/Failed. An accepted request alone is not payment success. [Official transfer flow](https://docs.paymongo.com/docs/money-movement-moving-money-with-api), [Wallet fields](https://docs.paymongo.com/reference/wallet-resource), [transfer resource](https://docs.paymongo.com/reference/transfer-resource), [reference lookup](https://docs.paymongo.com/reference/get-list-transfer).

The persisted reference is also sent as `Idempotency-Key`. Database reservation and terminal-state checks remain authoritative after the provider's idempotency retention expires. Network errors, HTTP 408/409/425/5xx and invalid/mismatched successful responses remain uncertain: they do not automatically rearm a transfer. [Idempotency guidance](https://docs.paymongo.com/docs/money-movement-best-practices).

The existing signed webhook accepts documented `transfer.outward.successful` and `transfer.outward.failed` events after the same signature/mode validation. It retrieves the transfer independently and checks its reference, mode, amount, currency, rail and destination against the attempt snapshot. Unknown early callbacks can be recovered through explicit admin reconciliation by persisted reference. [Event catalogue](https://docs.paymongo.com/docs/developer-tools-webhooks-events), [signature verification](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management).

Read-only TEST diagnostics succeeded for **218 canonical institution entries**, including GCash and Maya. Wallet listing succeeded but returned zero wallets. TEST writes are limited to PayMongo's documented simulated destination numbers; no actual write was attempted. [Transfer test cases](https://docs.paymongo.com/docs/transfer-test-cases).

Refund evidence is retrieved from PayMongo rather than accepted as an admin-entered amount. The current official refund reference omits a version in one path while the guide uses `/v1/refunds`; the helper uses `/v1/refunds/:id` and fails closed. Successful retrieval of an existing refund has not been externally verified. [Refund resource](https://docs.paymongo.com/reference/refund-resource), [refund guide](https://docs.paymongo.com/docs/payment-acceptance-refunds).

## 8. Security

- Seller identity comes from `authenticateSeller` and trusted `req.user.student_id`.
- All admin payout routes require authentication and a current database role of `admin` or `super admin`. Generic moderator edit permission does not authorize financial operations.
- Admin Send/Reconcile accepts only the payout ID, not amount, seller, destination or final status.
- Account numbers use versioned AES-256-GCM with random IVs, authentication tags and seller-bound authenticated data. No fallback key is derived from JWT defaults.
- Normal seller/admin responses contain masked account numbers only. Platform Wallet balance/source-account details are not exposed in seller responses.
- Full numbers are absent from URLs, notifications, localStorage and normal logs. Form values clear after save/cancel.
- One logical payout per order, durable attempts, unique provider references/IDs and locked reservation prevent duplicate submission.
- Processing account snapshots cannot be replaced by later settings changes.
- Audit events identify actor, payout, seller order and trusted amount; notifications omit account numbers.
- Provider errors are sanitized; raw financial payloads are not returned or logged.

## 9. Return policy and refund tests

Verified using real MySQL fixtures plus isolated eligibility tests:

- Less than seven days: Held.
- Exactly seven days by database time: Eligible if otherwise valid.
- No delivery timestamp or not Delivered: Held.
- Requested/Approved/Return Shipped/Received: Held.
- Completed physical return without sufficient linked successful refund evidence: Held.
- Rejected/cancelled return after deadline: may become Eligible.
- Pending refund: Held.
- Successful partial refund: remaining seller amount calculated correctly.
- Full refund: Cancelled/zero.
- Duplicate/mismatched/overallocated refund evidence: rejected or Held.
- Processing/Paid payout and a new boundary return cannot both commit.

**Existing financial limitation:** the prior return implementation only records physical return receipt. It has no automatic buyer-refund initiation flow. This change adds verified evidence for refunds already issued through PayMongo, not a new automatic refund sender. Admin UI states this explicitly.

For a shared buyer payment, PayMongo identifies the payment/refund rather than an individual seller order. An authorized admin explicitly allocates the verified refund to the reviewed order/returned items. A globally unique refund ID prevents reuse; amounts/payment identity/return ownership are checked. One provider refund is not automatically apportioned across multiple sellers. Ambiguous allocation needs review. Refunds issued externally after a payout is reserved or Paid also require support resolution; no database transaction can make an external Dashboard action atomic with payout submission.

## 10. Payout tests

`backend/scripts/testPayoutsFlow.js` passed **12 real-MySQL integration checks** with a simulated provider:

1. Repeatable schema initialization.
2. Encrypted storage and masked responses.
3. Exact deadline, return states, pending payment and COD eligibility.
4. Pending/partial/full provider-verified refund evidence.
5. Forged amount and COD rejection.
6. Two admins produce exactly one provider attempt; account changes and boundary returns are blocked while reserved.
7. Provider success persists Paid across a fresh service instance; webhook replay does not duplicate payment.
8. Definitive failure remains Failed until explicit safe reconciliation.
9. Later provider failure is never treated as Paid.
10. Ambiguous network outcome stays reserved and cannot be resent after refresh/restart.
11. Missing destination and unallocated provider refunds block sending.
12. Buyer payment, fulfillment and artwork inventory remain unaffected.

The provider helper's **39 focused checks** cover request/response contracts, institutions, mode gates, test destinations, balance including configured fee reserve, malformed results, insufficient funds, ambiguous results, reference reconciliation and refund validation. These are simulated HTTP responses, not a claim of actual transfer completion.

Six real JSX-handler tests cover account masking/clearing, unavailable institutions, disabled Wallet readiness, duplicate-click guarding, status reconciliation and refund allocation without client amounts.

## 11. Regression and runtime verification

- Backend `node --test`: **391 total; 388 passed, 3 opt-in MySQL checks skipped, zero failures**.
- Frontend selected complete existing JS test suite plus payout UI tests: **79 passed, zero failures**.
- Real MySQL payout integration: **12 passed**, fixture counts returned to zero.
- Scoped frontend ESLint: passed.
- Production frontend build: passed, 13,349 modules; existing large-bundle warning remains.
- Syntax checks and Git whitespace check: passed.
- Backend started successfully with the new table initialization. All three protected endpoints returned HTTP 401 without credentials: admin payouts, seller payout account, existing seller payout summary.
- The stale backend occupying port 5000 was restarted so the new routes are active.

Existing checkout, verified payment webhook, COD, seller fulfillment, parcel/tracking guards, immutable delivery time, selected-item returns, chat events, reviews, recommendations and certificates have regression coverage in the passing suites. No real online buyer payment, real payout, real refund, or browser automation was performed for this change. Favorites and events were left untouched, rather than claimed as newly end-to-end tested.

Evidence: `backend/.cache/payout-flow-results.json` records checks, simulated-provider status and fixture cleanup, without credentials or account numbers.

Useful commands:

```powershell
cd backend
node --test
node scripts/testPayoutsFlow.js
```

```powershell
cd frontend
node --test src/utils/*.test.mjs src/api/buyer/*.test.mjs src/components/seller/Payout/payoutPages.test.mjs
npm run build
```

## 12. Production limitations and setup

**BLOCKED FOR LIVE PAYOUT.** No individual student PayMongo account, API key or linked merchant account is required by this implementation. The institution must provision/activate and fund its own platform Wallet and confirm that PayMongo approves the marketplace/third-party seller payout use case. Existing successful buyer collection does not imply that the Wallet has available outbound funds. [Wallet requirements](https://docs.paymongo.com/docs/money-movement-wallets), [go-live requirements](https://docs.paymongo.com/docs/money-movement-go-live-checklist).

Required backend configuration is documented in `backend/.env.example`:

```text
PAYOUT_ACCOUNT_ENCRYPTION_KEY
PAYMONGO_PAYOUTS_ENABLED
PAYMONGO_PAYOUT_WALLET_ID
PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS
```

Live additionally requires explicit `PAYMONGO_LIVE_PAYOUTS_ENABLED` and `PAYMONGO_MARKETPLACE_PAYOUTS_APPROVED`. Do not enable them merely to remove a warning. Confirm provider approval and complete a supported TEST transfer first.

Where PayMongo requires registered recipients, the platform owner must complete its recipient OTP registration and cooling period. Saving an ArtMatch destination is not ownership verification. [Recipient security requirements](https://docs.paymongo.com/docs/send-money-security-registered-recipients-and-cooling-periods).

Remaining external verification: provisioned/funded TEST Wallet; actual supported TEST transfer and signed provider event; provider refund retrieval using a genuine TEST refund; live account approval, recipient requirements and pricing. Current code is not claimed production-ready or automatically compliant with every legal, tax, KYC or PayMongo requirement.

**Buyer payment being Paid and seller payout being Paid are separate financial states. Return authorization is separate from financial refund processing.**
