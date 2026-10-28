# Make seller payouts work

## Current status

Local automated tests passed. Real PayMongo payout verification is still blocked: the latest TEST `GET /v2/wallets` returned HTTP 200 with `{"data":[]}`. No TEST Wallet ID is available to configure.

Do not use a LIVE Wallet or a made-up Wallet ID to bypass this result.

## 1. Resolve the TEST Wallet with PayMongo

Send PayMongo this message through your existing support conversation:

> Our ArtMatch integration uses our existing TEST secret key. GET https://api.paymongo.com/v2/wallets returns HTTP 200 with {"data":[]}. Please confirm that the PHP sandbox Money Movement Wallet is provisioned and activated for the same merchant account associated with that TEST key, and that it is exposed by this endpoint. We need TEST InstaPay/PESONet outbound transfers and simulated available funds to verify the integration.

Do not paste your secret API key into public messages, screenshots or source control.

## 2. Configure only after the Wallet is returned

Retrieve the Wallet ID automatically from the TEST API response. Verify that:

- Its ID is an actual returned `wallet_...` ID.
- `livemode` is `false`.
- Its status is `activated` and its account currency is PHP.
- Available simulated funds cover the transfer and the confirmed platform transfer fee reserve.

Then configure these existing settings in `backend/.env`:

| Setting | Value |
| --- | --- |
| `PAYMONGO_SECRET_KEY` | Keep the existing TEST secret. |
| `PAYMONGO_PAYOUT_WALLET_ID` | The validated ID returned by the TEST API. |
| `PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS` | Confirmed transfer fee reserve, expressed in centavos. This is platform-funded, not deducted from seller earnings. |
| `PAYMONGO_PAYOUTS_ENABLED` | `true` after TEST readiness is verified. |
| `PAYMONGO_LIVE_PAYOUTS_ENABLED` | Keep `false` during development. |
| `PAYMONGO_MARKETPLACE_PAYOUTS_APPROVED` | Keep `false` unless actual production approval has been obtained. |

Preserve the existing `PAYOUT_ACCOUNT_ENCRYPTION_KEY`; do not regenerate it after saving destinations. Restart the backend after configuration changes.

## 3. Verify genuine TEST transfers and notifications

Use PayMongo's official simulator destinations only:

| Recipient number | Expected result |
| --- | --- |
| `999999990001` | Succeeded |
| `999999990002` | Failed: simulated failure |
| `999999990003` | Failed: account not found |
| `999999990004` | Failed: inactive account |
| `999999990005` | Failed: account limit |
| `999999990006` | Failed: provider internal error |

Select the institution from the provider's canonical list, not a guessed bank code. These numbers are for TEST credentials only. [Official transfer test cases](https://docs.paymongo.com/docs/transfer-test-cases).

Use isolated TEST order/account fixtures, with server-calculated eligibility. Do not alter genuine customer orders to bypass the seven-day hold.

The existing PayMongo webhook must receive these signed events while retaining its buyer-payment subscription:

- `checkout_session.payment.paid`
- `transfer.outward.successful`
- `transfer.outward.failed`

Keep the HTTPS webhook endpoint reachable. If using ngrok, keep it running and confirm the registered URL matches the current tunnel. The last subscription check found the TEST webhook enabled but without the two transfer events.

Confirm an actual TEST transfer reaches its expected provider status, updates the payout ledger correctly, survives refresh/restart, and does not duplicate on repeated Send or webhook delivery. An unknown result must be reconciled rather than blindly resent.

Also verify genuine TEST refund retrieval and allocation before calling the entire return/refund/payout workflow fully verified. The existing local tests simulate provider refunds; those checks do not prove the external API exchange.

## 4. Enable actual payouts only after TEST verification

Real payouts require a separate approved production setup:

1. PayMongo confirms that ArtMatch may receive marketplace payments centrally and disburse to student sellers.
2. The platform's LIVE Wallet is activated and has available funds, including applicable fees.
3. The operator configures the approved LIVE credentials and matching Wallet, production webhook/signing settings, and both explicit live approval gates.
4. Sellers provide their supported GCash, Maya or bank details. Complete any recipient registration/OTP/cooling requirements imposed by PayMongo.
5. Perform an explicitly approved live verification before regular use.

These steps are not authorization to move real funds during development. [Wallet and outbound requirements](https://docs.paymongo.com/docs/money-movement-go-live-checklist).

## Normal use after setup

Buyer payment confirmed → earnings Held → seller delivers → seven-day return hold ends → no unresolved return/refund → Eligible → admin reviews and sends → provider confirms → Paid to seller.

Seller destination settings are on **Settlement and Payout**. Admin execution is on **Seller Payouts**. A seller does not need an individual PayMongo merchant account.

The status stays **PARTIALLY VERIFIED** until the genuine TEST provider checks pass. Live readiness is a separate approval and verification step.
