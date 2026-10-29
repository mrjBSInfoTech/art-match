# Multi-admin payout demo and verification

## Result

**FULLY VERIFIED — local Demo Payout Provider and multi-admin application workflow.**

Verification included the real running application: four separate database admins logged in through the normal HTTP login endpoint, requested and approved one isolated payout, explicitly released it with the demo provider, and verified the seller ledger, notification and audit trail. Duplicate release created no second attempt. All HTTP fixtures were removed afterward. The existing presentation payout remains Eligible and unrequested.

Real PayMongo payout integration remains **PARTIALLY VERIFIED / provider testing blocked**, because no TEST Money Movement Wallet is provisioned. A successful demo is not evidence of a PayMongo transfer.

This feature is **multi-admin approval / quorum authorization**. It uses one requester and three other independently authenticated finance administrators. It does not use email or SMS OTP.

Demo success means: **ArtMatch payout workflow succeeded using Demo Payout Provider. No external money movement occurred.** It never means a PayMongo Wallet transfer succeeded. Real PayMongo provider verification remains blocked by the missing TEST Money Movement Wallet.

## Architecture and preserved behavior

Existing buyer checkout, confirmed payment, seller earnings, delivery, seven-day hold, return/refund eligibility, encrypted payout destination, and duplicate-transfer protection remain in place. The previously configured development-only immediate eligibility flag is reused. It does not waive payment, delivery, return, refund, or approval checks.

The actual payout ledger is `seller_payment_split` with primary key `split_id`; no second seller balance was introduced. `seller_payout_account` retains encrypted destinations, and `seller_payout_attempt` retains provider attempts.

```text
Confirmed buyer payment → Held → Delivered → hold elapsed → no unresolved return/refund
→ Eligible → Request Payout (Admin A)
→ Admin B approves (1/3) → Admin C approves (2/3) → Admin D approves (3/3)
→ Approved for Release → explicit Release Payout
→ provider execution → Processing → Paid / Failed
```

Economic eligibility, approval state, and provider execution remain separate. Third approval does not automatically release. Existing `/send` clients pass through the same approval gate.

Payout administration is limited to the current database roles `admin` and
`super admin`, with banned accounts excluded. Generic Add/Edit/Delete permissions
never grant payout access to a `moderator` or `customize` account. All payout
read/action endpoints enforce this rule, including request, approve, reject,
release, legacy send, reconciliation and refund verification. Real HTTP checks
confirmed 403 on all ten endpoints for both denied roles, even with every generic
permission enabled and an older token issued while the account was an admin.
`Admin4` retains payout access through its `admin` role despite its generic
permission flags being zero.

## Database changes

Startup uses the existing idempotent `ensurePayoutTables()` helper. No manual SQL import is required.

- `seller_payment_split`: adds `payout_provider` and `approval_cycle_id` (existing `requested_at` is reused).
- `seller_payout_attempt`: records `payout_provider` and `payout_mode` for immutable provider routing.
- `seller_payout_approval_cycle`: records `cycle_id`, `split_id`, requester, approval state, provider/mode, approved amount in centavos, internal destination/accounting snapshot hash, request/approval/release timestamps, releasing admin, and invalidation reason.
- `seller_payout_approval`: records `approval_id`, `cycle_id`, `admin_id`, Approved/Rejected decision, optional comment, and creation timestamp. `UNIQUE(cycle_id, admin_id)` prevents duplicate votes. Foreign keys reference the cycle and actual `admin.admin_id`.

Rejected or changed requests create fresh cycles. Old decisions remain audit history and never count toward the new cycle. Full account numbers and internal snapshot hashes are not exposed in UI or audit logs.

## Provider safety and configuration

Current local configuration:

```dotenv
PAYOUT_PROVIDER=demo
PAYMONGO_TEST_PAYOUT_IMMEDIATE=true
```

Demo requires no PayMongo Wallet ID. It uses local destination options and records clearly simulated `DEMO-PAYOUT-YYYYMMDD-...` references. Demo payout paths make no PayMongo HTTP requests, including institution loading, payment/refund preflight, release and reconciliation. Demo does not issue or externally verify refunds.

Production (`NODE_ENV=production`) refuses to start with `PAYOUT_PROVIDER=demo`. Unknown provider names fail closed. Missing real provider configuration never selects demo automatically. Stored demo attempts remain demo when the configured provider later changes, and terminal Paid payouts cannot be released again.

The existing immediate flag is effective only outside production with the demo provider or TEST PayMongo credentials. Live credentials retain seven days. Buyer return-window rules are unchanged.

## Presentation accounts

Existing accounts were retained: `Admin`, `Admin2`, and `Admin3`. One missing local demo finance admin was added, then renamed to `Admin4` with the user-requested password. The first three accounts and all approval/account identities were preserved.

The fourth account's current login details are available in the ignored local file:

`backend/.cache/payout-demo-admin-credentials.json`

Do not commit that file or reuse its password for real accounts. No existing payout was released to prepare the presentation.

Check availability without creating accounts:

```powershell
cd backend
node scripts/setupPayoutDemoAdmins.js
```

On a different local development copy, add only missing accounts explicitly if necessary. Set a temporary password through `DEMO_ADMIN_PASSWORD` and run:

```powershell
node scripts/setupPayoutDemoAdmins.js --create-missing-admins
```

The script requires explicit demo mode, a local development database and a nonproduction environment. It never overwrites existing accounts, passwords or roles, and never creates orders. Keep the password out of source files and shell history; use a secure password prompt to populate the environment variable, then remove it afterward.

## Exact presentation steps

1. Start the backend from `backend` with `npm start`, then the frontend from `frontend` with `npm run dev`. Refresh both payout pages after restarting. Local `backend/.env` already explicitly selects demo.
2. In the seller account, open **Settlement and Payout**. Choose the local GCash or Maya demo destination, use an account name such as `Demo Seller`, enter `999999990001` as the **Account number**, and save. The seller needs no personal PayMongo merchant Wallet.
3. Select a confirmed online order that is **Delivered**, has no unresolved return/refund and is **Eligible**. Existing presentation immediate eligibility skips only the waiting period. COD does not create platform-funded seller payouts.
4. Login as **Admin** (requester A). Open **Seller Payouts → Review → Request Payout**. Expect **Pending Approval, 0/3**.
5. Logout, login as **Admin2** (B), open the same payout and click **Approve**. Expect **1/3**.
6. Logout, login as **Admin3** (C), approve the same payout. Expect **2/3**.
7. Logout, login as **Admin4** (D), approve. Expect **3/3, Approved for Release**. No payment occurs at this step.
8. Login again as **Admin** (or another currently authorized finance admin), review and click **Release Payout** once. The backend revalidates payment, delivery, hold, returns/refunds, amount, destination, requester, three current approvers and absence of an existing attempt.
9. Refresh the seller page. Expect **Paid (Demo)**, a `DEMO-PAYOUT-...` reference and a notification explaining that no money moved. Demo totals are separate from real paid transfers.

Use logout/login between identities or separate browser profiles. Two tabs in the same browser generally share the login token, so they do not represent independent admins.

If the request is rejected, read the rejection comment, correct the issue, then create a new request. Amount, destination, provider/mode or relevant permission changes require fresh approvals. Do not enter a PayMongo refund ID to pay a seller; that existing section concerns money returned to the buyer and is unavailable for provider verification in demo mode.

## Verification and repeatable tests

Security checks include requester self-approval, duplicate approvals, fewer than three approvals, forged frontend counts, concurrent votes/releases, active return/refund before release, changed destination/amount/provider/mode, stale permissions, rejected cycles, production demo refusal, and duplicate release prevention.

Executed verification:

- **127 focused backend tests passed** for schema, routes, approvals, eligibility and provider safety. Additional buyer checkout, voucher, payment split and webhook regression tests passed in the combined backend run.
- **14 payout frontend tests passed**, plus the existing voucher/checkout API and component tests in a combined frontend run. Scoped payout ESLint passed.
- **18 actual MySQL integration checks passed**, including duplicate/concurrent voting, unique constraints, fresh cycles, eligibility, return/refund blocking, changed snapshots and financial replay protection. Temporary fixtures were cleaned.
- **8 end-to-end HTTP checks passed** against the actual running backend using four separately authenticated admin accounts. The test verified the seller-facing ledger/notification and persisted audit events, then removed its fixtures.
- **Vite production build passed** (13,399 modules); only the existing large-bundle warning remains.
- Startup migration ran successfully and is repeatable. The live local schema has the cycle/vote tables and a unique `(cycle_id, admin_id)` vote index.

Required security outcomes:

| Scenario | Verified result |
| --- | --- |
| Requester approves own request | HTTP 403 with the required message; no approval row. |
| Same admin approves twice | Rejected; only one vote, enforced by database uniqueness. |
| Release with two approvals | HTTP 409; no provider attempt. |
| Forged frontend approval count | Rejected; count comes from current database rows. |
| Active return or pending refund before release | Held/blocked; no Paid result. |
| Destination, amount, provider or credential mode changes | Old approval invalidated; fresh request required. |
| Approver is banned or demoted | Its vote no longer counts; old authorization invalidated. |
| Third valid approval | Approved for Release; still Eligible, no automatic transfer. |
| Explicit demo release | Processing reservation then Paid with `payout_provider=demo`, demo reference and timestamp. |
| Release repeated or raced | Blocked; exactly one financial attempt. |
| PayMongo selected without Wallet configuration | Safely disabled; never falls back to demo. |
| Production plus demo | Startup refused. |

Provider tests install a network trap, proving that demo payout operations cannot call PayMongo. Database and HTTP integration use isolated, clearly identified fixtures and remove only their own records. They do not release the existing presentation payout.

The opt-in local HTTP test uses actual login endpoints with four separate generated test accounts:

```powershell
cd backend
node scripts/testPayoutDemoHttp.js --run
```

This creates and then removes its own test accounts/order/payout. Its result is written to ignored `backend/.cache/payout-demo-http-verification.json`. It never records the generated test login passwords or tokens in the report.

## When the real TEST Wallet becomes available

Keep the same Request → three other approvals → explicit Release workflow. Change configuration only, using the actual TEST Wallet returned by PayMongo:

```dotenv
PAYOUT_PROVIDER=paymongo
PAYMONGO_PAYOUT_WALLET_ID=wallet_THE_ACTUAL_RETURNED_TEST_ID
PAYMONGO_PAYOUTS_ENABLED=true
PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS=THE_CONFIRMED_NONNEGATIVE_FEE_RESERVE
PAYMONGO_LIVE_PAYOUTS_ENABLED=false
PAYMONGO_MARKETPLACE_PAYOUTS_APPROVED=false
```

The values above are placeholders, not usable Wallet IDs or fee values. Keep the existing TEST secret key and payout account encryption key. Ensure the TEST Wallet is activated with sufficient simulated funds and the TEST webhook subscribes to `transfer.outward.successful` and `transfer.outward.failed` while preserving buyer-payment events. Restart the backend and create fresh approvals under the PayMongo provider; demo approvals and completed demo payouts cannot be reused as real transfers.

Run actual provider tests with PayMongo's official simulated destinations only. PayMongo readiness remains separately **PARTIALLY VERIFIED** until genuine TEST Wallet transfers and notifications pass. No live credentials, Wallets or real funds are authorized by this demo setup.

## Files created for this request

```text
PAYOUT_DEMO_VERIFICATION.md
backend/utils/payoutProvider.js
backend/utils/payoutProvider.test.js
backend/utils/payoutApprovals.js
backend/utils/payoutApprovals.test.js
backend/scripts/setupPayoutDemoAdmins.js
backend/scripts/testPayoutDemoHttp.js
frontend/src/api/admin/payoutAPI.test.mjs
```

## Files modified for this request

```text
PAYOUT_SETUP_GUIDE.md
backend/.env.example
backend/database/payouts.js
backend/database/payouts.test.js
backend/middleware/payoutAdminMiddleware.js
backend/routes/admin/payouts.js
backend/routes/seller/payouts.js
backend/scripts/testPayoutsFlow.js
backend/server.js
backend/test/payoutAdmin.test.js
backend/utils/payoutEligibility.js
backend/utils/payoutEligibility.test.js
backend/utils/payouts.js
frontend/src/api/admin/payoutAPI.js
frontend/src/pages/admin/Payout.jsx
frontend/src/pages/seller/Payout.jsx
frontend/src/components/seller/Payout/PayoutAccount.jsx
frontend/src/components/seller/Payout/PayoutMetrics.jsx
frontend/src/components/seller/Payout/PayoutTable.jsx
frontend/src/components/seller/Payout/payoutDisplay.js
frontend/src/components/seller/Payout/payoutPages.test.mjs
```

Local ignored setup/evidence files:

```text
backend/.env                                  (PAYOUT_PROVIDER=demo only; no key/Wallet invented)
backend/.cache/payout-demo-admin-credentials.json
backend/.cache/payout-demo-http-verification.json
```

Earlier voucher/checkout changes and the empty user-created `frontend/src/components/admin/Payout/PayoutForm.jsx` were retained. This request did not modify buyer payments, COD, tracking, certificates, chat, ratings, following, favorites, recommendations, uploads, or return/refund processing.
