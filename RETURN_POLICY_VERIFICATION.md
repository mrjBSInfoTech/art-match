# Seven-day return policy verification

## 1. Result

**FULLY VERIFIED for the implemented return authorization workflow.**

Verified on 2026-10-26 using native tests, actual HTTP/JWT/MySQL checks, an
encrypted Backblaze attachment round trip, and actual buyer/seller browser
actions. The normal backend starts on port 5000 and installed-schema checks
pass. Ownership-validated cleanup removed every labelled test account, order,
message and cloud object created by these checks.

Repository-wide lint reports **80 pre-existing errors and 25 warnings**.
Message-page findings were reproduced against HEAD. Scoped return API,
component, order-page and test lint passes; unrelated findings were left alone.
The final production build after the return-period caption adjustment passed,
processing 13,301 modules in 1 minute 17 seconds.

## 2. Files changed

Modified:

- backend/database/orders.js
- backend/database/schema.sql
- backend/routes/buyer/orders.js
- backend/routes/buyer/orders.payment.test.js
- backend/routes/chat.js
- backend/routes/seller/orders.js
- backend/routes/seller/orders.payment.test.js
- backend/server.js
- backend/test/paymentHarness.js
- backend/utils/chatEvents.js
- frontend/src/components/buyer/Order/OrderGrid.jsx
- frontend/src/components/seller/Order/OrderCard.jsx
- frontend/src/pages/buyer/Message.jsx
- frontend/src/pages/buyer/Order.jsx
- frontend/src/pages/seller/Messages.jsx
- frontend/src/pages/seller/Order.jsx
- frontend/src/utils/sellerOrders.test.mjs

Created:

- backend/database/orders.delivery.test.js
- backend/database/returns.js
- backend/routes/buyer/returns.js
- backend/routes/seller/returns.js
- backend/scripts/checkReturnsSchema.js
- backend/scripts/testReturnsFlow.js
- backend/scripts/verifyReturnsBrowser.js
- backend/test/chatReturnEvents.test.js
- backend/test/returns.test.js
- backend/utils/returns.js
- frontend/src/api/buyer/returnAPI.js
- frontend/src/api/buyer/returnAPI.test.mjs
- frontend/src/api/seller/returnAPI.js
- frontend/src/components/return/ConversationReturns.jsx
- frontend/src/components/return/ReturnRequestCard.jsx
- frontend/src/components/return/ReturnRequestDialog.jsx
- frontend/src/utils/returns.test.mjs
- RETURN_POLICY_VERIFICATION.md

Pre-existing AppRoutes.jsx changes and Python bytecode changes are outside this
feature and were not edited by the return implementation.

## 3. Why each file was necessary

| File | Reason |
| --- | --- |
| backend/database/orders.js | Adds stable delivered_at and performs legacy backfill once when adding the missing column. |
| backend/database/schema.sql | Keeps the checked-in order schema consistent with startup migration. |
| backend/routes/buyer/orders.js | Exposes trusted return metadata and rejects cross-role access to buyer order data. |
| backend/routes/buyer/orders.payment.test.js | Updates stale zero-shipping expectations and verifies existing seller split states for payment regression checks. |
| backend/routes/chat.js | Preserves access to conversations with transaction returns and protects buyer return-related metadata from cross-role tokens. |
| backend/routes/seller/orders.js | Sets delivered_at once and includes linked returns in seller history. |
| backend/routes/seller/orders.payment.test.js | Adapts route test dependencies and verifies timestamp preservation without weakening payment restrictions. |
| backend/server.js | Mounts return routers and initializes their tables before listening. |
| backend/test/paymentHarness.js | Supplies the return metadata dependency and existing payment-split fixtures for isolated regressions. |
| backend/utils/chatEvents.js | Publishes structured return_updated events to existing participant SSE connections. |
| frontend/src/components/buyer/Order/OrderGrid.jsx | Displays the backend return window, expired caption, request action and linked-chat navigation. |
| frontend/src/components/seller/Order/OrderCard.jsx | Displays return status and opens the correct buyer conversation. |
| frontend/src/pages/buyer/Message.jsx | Opens a selected conversation and displays trusted cards independently of normal chat unlocking. |
| frontend/src/pages/buyer/Order.jsx | Opens item selection and navigates successful requests to chat. |
| frontend/src/pages/seller/Messages.jsx | Opens a selected conversation and renders seller return controls alongside chat. |
| frontend/src/pages/seller/Order.jsx | Connects seller order navigation to return conversations. |
| frontend/src/utils/sellerOrders.test.mjs | Updates seller-order expectations for return navigation. |
| backend/database/orders.delivery.test.js | Verifies historical backfill and prevents restart from renewing return windows. |
| backend/database/returns.js | Automatically creates separate request/item tables with audit fields and constraints. |
| backend/routes/buyer/returns.js | Provides authorized create/read/cancel/shipment actions and a narrow JWT role guard. |
| backend/routes/seller/returns.js | Provides authorized read/approve/reject/receipt actions. |
| backend/scripts/checkReturnsSchema.js | Read-only checks installed constraints, conflicts, fixture cleanup and API startup. |
| backend/scripts/testReturnsFlow.js | Exercises real return/order/chat APIs against disposable MySQL fixtures and optional cloud/browser checks. |
| backend/scripts/verifyReturnsBrowser.js | Drives the real interfaces through completion and captures desktop/mobile evidence. |
| backend/test/chatReturnEvents.test.js | Checks participant-only return events and unchanged ordinary message behavior. |
| backend/test/returns.test.js | Checks validation, authorization, transitions, deadline rechecks and rollback. |
| backend/utils/returns.js | Implements authoritative database-time eligibility, locks, ownership, conflicts, transactions, notifications and DTOs. |
| frontend/src/api/buyer/returnAPI.js | Calls buyer endpoints using existing Axios/token conventions. |
| frontend/src/api/buyer/returnAPI.test.mjs | Checks API paths, authentication handling and cancellation support. |
| frontend/src/api/seller/returnAPI.js | Calls seller decision and receipt endpoints. |
| frontend/src/components/return/ConversationReturns.jsx | Loads conversation returns and refreshes through existing live events. |
| frontend/src/components/return/ReturnRequestCard.jsx | Presents selected items, status, audit details and role-specific controls. |
| frontend/src/components/return/ReturnRequestDialog.jsx | Collects purchased items, controlled reason and validated details. |
| frontend/src/utils/returns.test.mjs | Checks return display and server-provided eligibility/window metadata. |
| RETURN_POLICY_VERIFICATION.md | Records scope, evidence, commands and verification limits. |

## 4. Database changes

marketplace_order gains **delivered_at DATETIME NULL**. Delivery uses
COALESCE(delivered_at, NOW()), so later activity cannot reset it. The migration
uses historical updated_at, with created_at fallback, only when adding the
previously missing column; it preserves updated_at and never repeats the backfill
on subsequent startup.

marketplace_return_request contains:

```text
return_request_id, order_id, conversation_id, customer_id, seller_id,
reason, details, status, seller_response, requested_at, decision_at,
return_shipped_at, received_at, completed_at, return_tracking_url,
created_at, updated_at
```

Its separate enum is Requested, Approved, Rejected, Cancelled, Return Shipped,
Received and Completed. Indexes cover (order_id, status),
(customer_id, requested_at), (seller_id, requested_at) and
(conversation_id, requested_at). Four foreign keys reference marketplace_order,
conversation, customer and student with restricted deletion.

marketplace_return_item contains return_item_id, return_request_id,
order_item_id and quantity. It has a positive-quantity check, unique
(return_request_id, order_item_id) key and (order_item_id, return_request_id)
index. Two foreign keys reference the request with cascade deletion and the
purchased order item with restricted deletion. A selected item returns its whole
purchased quantity.

Existing account_notifications records return_requested, return_approved,
return_rejected, return_cancelled, return_shipped and return_completed events
inside the relevant transaction. Receipt/completion occur in one action, with
separate timestamps and one completion notice; no notification table was added.

Installed-schema checks passed: both return tables, six foreign keys, zero
conflicting active/completed item returns and zero leftover fixture accounts.
Startup uses CREATE TABLE IF NOT EXISTS and additive migration.

## 5. Final return flow

```text
Delivered
  -> exact seven-day window
  -> buyer selects purchased items and requests return
  -> existing conversation and structured return card
  -> seller approves or rejects
  -> buyer ships approved return, with optional HTTP(S) tracking
  -> seller confirms receipt
  -> Received and Completed timestamps; final status Completed
```

MySQL checks the inclusive exact deadline; React displays the server result.
A buyer may cancel only Requested requests. Rejected/Cancelled requests permit
a fresh request only inside the original deadline and without an active/completed
item conflict. Fulfillment remains Delivered throughout.

## 6. Permission matrix

| Action | Buyer | Seller/student |
| --- | --- | --- |
| Create | Own Delivered order and eligible selected items | Denied |
| View | Own requests/conversations | Own seller orders/conversations |
| Cancel | Own Requested request | Denied |
| Approve/reject | Denied | Own Requested request; rejection requires response |
| Mark shipped | Own Approved request | Denied |
| Confirm receipt/completion | Denied | Own Return Shipped request |
| Change other participant's fields | Denied | Denied |
| Act on another account's return | Denied | Denied |

Ownership comes from the verified JWT and database rows. Seller/admin JWT
markers are rejected even when numeric IDs collide with buyer IDs. Social blocks
do not remove return rights; normal messages retain existing block rules.

## 7. Test results

| Check | Result | Evidence |
| --- | --- | --- |
| Backend syntax | PASS | Nineteen modified/created JavaScript files checked. |
| Native backend suite | PASS | 259 passed, zero failed; three opt-in DB checks skipped in this run. |
| Opt-in read-only MySQL checks | PASS | All three separately enabled checks passed against actual tables. |
| Native return service/SSE | PASS | 48 service tests plus three event tests. |
| Frontend native suite | PASS | 73 tests passed. |
| Actual HTTP/MySQL workflow | PASS | Latest browser-enabled run: 23 grouped checks, zero failures; optional cloud step verified separately. |
| Actual encrypted cloud attachment | PASS | Approved run: 23 checks, including ciphertext retrieval, exact PNG decryption and object cleanup. |
| Actual browser workflow | PASS | Six buyer/seller desktop/mobile checks, including server-controlled expiry. |
| Scoped frontend lint | PASS | Return APIs/components/order pages/related tests passed. |
| Global frontend lint | FAIL, pre-existing | 80 errors, 25 warnings; baseline findings left unchanged. |
| Frontend build | PASS | Latest return caption included; 13,301 modules in 1 minute 17 seconds. |
| Diff whitespace check | PASS | Final git diff check passed. |
| Normal startup/schema | PASS | Port 5000, installed constraints, clean fixtures and API smoke checks. |

| Requested case | Result | Actual verification |
| --- | --- | --- |
| 1. Eligible | PASS | HTTP 201, selected item/quantity, linked conversation, notification, browser dialog/card. |
| 2. Expired | PASS | Exact database deadline accepted; one second later rejected without insert. |
| 3. Not Delivered | PASS | Pending, Confirmed, Packed and Shipped rejected. |
| 4. Wrong buyer | PASS | Create/read/conversation access rejected through real middleware. |
| 5. Wrong seller | PASS | Read/approve/reject rejected through real middleware. |
| 6. Approval | PASS | State, timestamp, notification and live browser card update. |
| 7. Rejection | PASS | Required/stored response, decision time, notification, terminal old request. |
| 8. Cancellation | PASS | Requested only; seller notified; later decision rejected. |
| 9. Shipment | PASS | Buyer-only Approved transition, safe URL, timestamp, notification and browser controls. |
| 10. Receipt | PASS | Seller-only receipt, both timestamps, Completed, notification and both browser cards. |
| 11. Duplicates | PASS | Simultaneous submits produce one 201/one 409; completed items stay blocked. |
| 12. Chat permissions | PASS | Ownership, cross-role guards, membership and participant-only live events. |
| 13. Chat block | PASS | Messaging stays blocked while return create/read/approve work. |
| 14. Normal chat | PASS | Encrypted text, unread/read counts, list, hide/reopen, cloud evidence and SSE. |
| 15. Payments | PASS | Return actions preserve payment state/provider IDs; existing payment tests pass. |
| 16. Fulfillment | PASS | Existing transitions pass; actual delivery sets timestamp once and returns preserve it. |

Real-DB notification failure injection rolls creation back, including the new
conversation and selected items. A receipt failure restores Return Shipped and
rolls back both timestamps; retries complete without duplicate notices. The
deadline check freezes only this script's own MySQL session timestamp, never
global time. A native test crosses the deadline after the initial order lock.

Evidence:

- [HTTP/MySQL results](backend/.cache/return-flow-results.json)
- [Approved attachment results](backend/.cache/return-flow-attachment-results.json)
- [Browser results](backend/.cache/returns-browser-results.json)
- [Schema/API results](backend/.cache/returns-schema-verification.json)
- [Buyer requested](backend/.cache/returns-buyer-requested.png)
- [Buyer approved](backend/.cache/returns-buyer-approved.png)
- [Seller completed](backend/.cache/returns-seller-completed.png)
- [Mobile completed](backend/.cache/returns-mobile-completed.png)

The browser used the real frontend and actual return/order/chat handlers on the
disposable fixture API port, redirecting only those requests in its isolated
profile. Layout APIs used the normal backend. Checks covered a single selected
item, expired-period notices and disabled requests, cards before chat unlocking,
seller-only approval, buyer-only shipment, seller receipt, live updates and a
390-pixel viewport. Test tabs/fixtures and the isolated Chrome process closed.

## 8. Regression results

| Area | Result and scope |
| --- | --- |
| PayMongo | PASS: checkout/webhook, signature, idempotency, ownership, stock protection and real read-only SQL checks; provider creation/webhook implementation unchanged. |
| COD | PASS: isolated checkout/cart behavior and actual delivery/return behavior. |
| Chat | PASS: actual encryption, attachment round trip, unread/read counts, list, blocks, deletion/reopen, SSE and browser cards. |
| Orders | PASS: native payment/fulfillment, real histories, item eligibility, stable timestamp and browser navigation. |
| Artwork | PASS: native/real read-only availability, unchanged fixture artwork fields after returns, public catalogue HTTP 200. |
| Events | PASS smoke check: existing public endpoint HTTP 200; implementation unchanged. |
| Authentication | PASS: real tokens work, absent credentials return 401, foreign/cross-role access fails; implementation unchanged. |

Initial payment test failures reproduced with HEAD routes and HEAD harness.
Existing checkout already used zero shipping and seller payment splits, while
the harness lacked split helpers/SQL fixtures and expected a shipping charge.
Only test support/expected amounts changed; assertions now also verify held
online shares, eligible COD shares and webhook eligibility.

The first cloud attempt encountered sandbox restrictions and HTTP 502. The
identical command passed with approved network access, and its labelled object
was immediately deleted. Storage behavior/configuration was not modified.

## 9. Exact verification commands run

From backend:

```powershell
node --check scripts/testReturnsFlow.js
node --check test/returns.test.js
node --check test/chatReturnEvents.test.js
node --check test/paymentHarness.js
node --check routes/buyer/orders.payment.test.js
node --check scripts/verifyReturnsBrowser.js
node --test test/returns.test.js
node --test --test-reporter=dot test/returns.test.js test/chatReturnEvents.test.js
node scripts/testReturnsFlow.js
node scripts/testReturnsFlow.js --attachments
node scripts/testReturnsFlow.js --browser
node scripts/checkReturnsSchema.js
Copy-Item -LiteralPath '.cache\return-flow-results.json' -Destination '.cache\return-flow-attachment-results.json'
node .cache/diagnose-payment-baseline.mjs
node --test --test-reporter=spec routes/buyer/orders.payment.test.js routes/payments/paymongo.test.js
node --test --test-reporter=spec utils/*.test.js database/*.test.js routes/buyer/*.test.js routes/seller/*.test.js routes/payments/*.test.js test/*.test.js
node --test --test-reporter=dot routes/buyer/orders.payment.test.js routes/payments/paymongo.test.js
$env:PAYMENT_READONLY_MYSQL_TEST='1'; node --test --test-reporter=spec utils/artworkAvailability.mysql.test.js routes/buyer/orders.mysql.test.js
```

The syntax loop invoked node --check $returnBackendFile for this exact list,
checking the process exit status:

```powershell
$returnBackendFiles = @('database/orders.js','database/returns.js','database/orders.delivery.test.js','routes/buyer/orders.js','routes/buyer/returns.js','routes/buyer/orders.payment.test.js','routes/seller/orders.js','routes/seller/returns.js','routes/seller/orders.payment.test.js','routes/chat.js','server.js','utils/returns.js','utils/chatEvents.js','test/paymentHarness.js','test/returns.test.js','test/chatReturnEvents.test.js','scripts/testReturnsFlow.js','scripts/verifyReturnsBrowser.js','scripts/checkReturnsSchema.js')
foreach ($returnBackendFile in $returnBackendFiles) { node --check $returnBackendFile; if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $returnBackendFile" } }
Write-Output "PASS: syntax checked $($returnBackendFiles.Count) backend files."
```

Normal startup and the stopped alternate-port diagnostic used:

```powershell
node server.js
$env:PORT = '5001'
node server.js
```

The normal backend was started on port 5000. Cloud checks had a sandbox attempt
then the approved run. Browser diagnostics had reruns before final success.
Credentials were never printed.

The optional browser check used this isolated headless Chrome launch on the
verified Windows workspace, then `node scripts/testReturnsFlow.js --browser`:

```powershell
$returnBrowserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9337', '--user-data-dir="C:\VS Codes\React JS\art-match\backend\.cache\returns-browser"', 'about:blank')
$returnBrowserProcess = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $returnBrowserArgs -WindowStyle Hidden -PassThru
$returnBrowserProcess.Id
```

The browser helper addresses visible dialogs, dispatches actual pointer events
for Material UI selects/checkboxes, and brings tabs forward before screenshots.
Its final run exited successfully with all six browser checks. Diagnostic runs
before that exposed stale Vite dependencies, hidden-dialog selectors and a
background screenshot timeout; none remain unresolved. The normal backend was
restarted after the final metadata change and `checkReturnsSchema.js` passed
again with no leftover test accounts. Order metadata includes a database-derived
`returnWindowOpen` flag so the expired notice never relies on browser time.

From frontend:

```powershell
node --test --test-reporter=spec src/utils/*.test.mjs src/utils/*.test.js src/api/buyer/*.test.mjs
node --test --test-reporter=spec src/utils/returns.test.mjs
npm run lint
npx eslint src/api/buyer/returnAPI.js src/api/seller/returnAPI.js src/components/return/*.jsx src/components/buyer/Order/OrderGrid.jsx src/components/seller/Order/OrderCard.jsx src/pages/buyer/Order.jsx src/pages/seller/Order.jsx src/utils/returns.test.mjs src/utils/sellerOrders.test.mjs
npm run build
node node_modules/vite/bin/vite.js --host localhost --port 5173
```

The normal frontend was restored on port 5173 after stale Vite dependencies
caused diagnostic 504 responses. Tests reran after aligning the seller Requested
caption assertion with Awaiting your decision.

Equivalent checks also ran from the repository root:

```powershell
node --check backend/scripts/testReturnsFlow.js
node --check backend/test/returns.test.js
node --check backend/test/chatReturnEvents.test.js
```

## 10. Remaining manual test

No human/browser action remains necessary to verify the implemented return
authorization workflow: the real desktop/mobile buyer/seller flow was exercised.
Optional capstone acceptance can repeat that demonstrated flow using chosen
accounts. Physical shipping and reimbursement are outside the software workflow.

Return authorization is separate from financial refund processing.

## 11. Certificate delivery and return access

The seller still creates the certificate SVG in the browser. After publishing
that SVG for an approved artwork, the backend sends an order-item-specific link
in the buyer/seller conversation once the order has been delivered for one day.
The buyer link requires buyer authentication and is rechecked against the
delivered order item each time it is opened.

A completed return blocks that order item's link. Earlier return statuses and
refund status do not change certificate authenticity or access. The stored
certificate remains associated with the artwork and is not deleted or revoked.
Certificate delivery unit coverage is in `backend/test/certificates.test.js`;
live database and browser verification of this addition remains outstanding.
