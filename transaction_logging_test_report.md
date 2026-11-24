# Transaction Logging Accuracy Integration Test Report

## 1. Test Metadata & Environment

| Field | Value |
| :--- | :--- |
| **Test Date (UTC)** | `2026-11-23T14:11:41.361Z` |
| **Test Run Tag** | `TEST_RUN_1795443077157` |
| **System / Repository** | ArtMatch Backend (`backend/routes/buyer/orders.js`, `backend/routes/payments/paymongo.js`) |
| **Runtime** | Node.js `v22.13.1` on `win32 (x64)` |
| **MySQL Target** | `localhost:3307/art_match` (live InnoDB tables, real SQL transactions & constraints) |
| **Processing Fee Config** | `PAYMONGO_PROCESSING_FEE_ENABLED=true` |
| **Total Execution Time** | `22142.67 ms` (500 consecutive transactions) + `290.08 ms` (MySQL cross-reference) |
| **Database Tables Audited** | `marketplace_order`, `marketplace_order_item`, `seller_payment_split`, `audit_logs`, `recommendation_interaction` |

> **Codebase Audit Note on Cash on Delivery (COD):** Inspection of the latest `backend/routes/buyer/orders.js` (lines 628–632) confirms that while `marketplace_order.payment_method` retains `ENUM('paymongo', 'cod')` for historical records, new COD checkouts are intentionally disabled and rejected with `HTTP 400` (*"Cash on Delivery is no longer available. Please select an online payment method."*). Accordingly, this suite tests **350 successful PayMongo online payments** (single-seller, multi-seller split, and delayed-webhook reconciliation) and **150 failed, cancelled, declined, or rejected payment attempts** (including **20 explicit COD rejection tests** verifying zero orphan database entries).

---

## 2. Breakdown of the 500 Simulated Transactions

| Transaction Category | Simulated | Matched | Mismatched | Missing | Duplicates | Category Accuracy |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Successful Online Payment — PayMongo Single-Seller (Webhook) | 200 | 200 | 0 | 0 | 0 | 100.00% |
| Successful Online Payment — PayMongo Multi-Seller Split (Webhook) | 100 | 100 | 0 | 0 | 0 | 100.00% |
| Successful Online Payment — PayMongo Delayed-Webhook Reconciliation (Retry) | 50 | 50 | 0 | 0 | 0 | 100.00% |
| Cancelled / Expired Online Payment (`PUT /payments/:reference/cancel`) | 50 | 50 | 0 | 0 | 0 | 100.00% |
| Failed Online Payment — PayMongo Gateway Error (`HTTP 502` Rollback) | 40 | 40 | 0 | 0 | 0 | 100.00% |
| Declined / Rejected Webhook — Invalid HMAC-SHA256 Signature (`HTTP 401`) | 20 | 20 | 0 | 0 | 0 | 100.00% |
| Declined / Rejected Webhook — Tampered Amount Mismatch (`HTTP 400`) | 20 | 20 | 0 | 0 | 0 | 100.00% |
| Rejected Legacy COD Checkout (`payment_method='cod'`, Discontinued `HTTP 400`) | 20 | 20 | 0 | 0 | 0 | 100.00% |
| **Total** | **500** | **500** | **0** | **0** | **0** | **100.00%** |

---

## 3. MySQL Cross-Reference Verification Summary

After all **500** consecutive simulations completed, fresh `SELECT` queries were executed directly against MySQL (`localhost:3307/art_match`) to cross-reference every ground-truth transaction against persisted database state:

| Verification Check | Expected | Observed in MySQL | Status |
| :--- | ---: | ---: | :---: |
| Accurately Logged Simulated Transactions | 500 | 500 | PASS |
| Persisted `marketplace_order` Rows (450 Paid across 350 online txns + 50 Expired + 40 Pending Rejected-Webhook) | 540 | 540 | PASS |
| Persisted `marketplace_order_item` Rows | 540 | 540 | PASS |
| Persisted `seller_payment_split` Rows | 540 | 540 | PASS |
| Persisted `audit_logs` — `SALE_PAYMENT_RECEIVED` | 450 | 450 | PASS |
| Persisted `audit_logs` — `SALE_ORDER_CANCELLED` | 50 | 50 | PASS |
| Buyer Orders Ledger Visibility (`GET /api/buyer/orders`) | 450 | 450 | PASS |
| Total Gross Paid Amount Verified (PHP) | PHP 1521361.17 | PHP 1521361.17 | PASS |
| Rolled-Back / Rejected Orphan Records | 0 | 0 | PASS |

### Discrepancies, Missing Entries, and Errors
None — `0` discrepancies, `0` missing entries, `0` mismatches, and `0` duplicate entries across all 500 simulated transactions.

---

## 4. Accuracy Formula & Final Calculation

$$\text{Transaction Logging Accuracy (\%)} = \left( \frac{\text{Accurately Logged Transactions}}{\text{Total Simulated Transactions (500)}} \right) \times 100$$

**Step-by-step substitution:**

1. $\text{Accurately Logged Transactions} = 500$
2. $\text{Total Simulated Transactions} = 500$
3. $\text{Transaction Logging Accuracy (\%)} = \left( \frac{500}{500} \right) \times 100 = \mathbf{100.00\%}$

---

## 5. Pass / Fail Verdict

- **Final Verdict:** **PASSED**
- **Result:** **500 / 500 (100.00%)** simulated transactions matched their ground-truth payment reference, exact centavo total (including processing fee apportionment and multi-seller split ledger), payment method/channel, final order & payment status, and seller `audit_logs` entries in MySQL with zero missing, mismatched, or duplicate records.

---

## 6. Post-Test Database Cleanup Verification

All synthetic `TEST_RUN_1795443077157` buyer, seller, artwork, cart, order, payment split, recommendation interaction, and audit log records were removed after report validation:

| Table | Count Before Test | Count After Cleanup | Residual `TEST_RUN_1795443077157` Rows |
| :--- | ---: | ---: | ---: |
| `marketplace_order` | 25 | 25 | 0 |
| `seller_payment_split` | 24 | 24 | 0 |
| `audit_logs` | 845 | 845 | 0 |
| `recommendation_interaction` | 608 | 608 | 0 |
| `artwork` | 112 | 112 | 0 |
| `student` | 361 | 361 | 0 |
| `customer` | 30 | 30 | 0 |

- **Database Cleanliness Status:** **CLEAN (0 synthetic rows remaining; baseline counts restored identically)**
