# ML Recommendation System Accuracy & Speed Evaluation Report

## 1. Test Metadata, Environment & Model Overview

| Field | Value |
| :--- | :--- |
| **Test Date (UTC)** | `2026-11-24T02:28:38.469775+00:00` |
| **Hardware / OS** | `Windows 11 (AMD64)` / CPU: `Intel64 Family 6 Model 154 Stepping 3, GenuineIntel` (`12` logical cores) |
| **Python & Frameworks** | Python `3.13.6`, PyTorch `2.13.0+cpu`, FastAPI `0.141.1`, NumPy `2.3.2` |
| **Recommendation Architecture** | **Two-Stage Hybrid Recommender** — Stage 1: **SASRec** Self-Attentive Sequential Transformer (`backend/ml/recommendation/sasrec_model.py`, FastAPI `POST /recommend`); Stage 2: **Content-Based & Affinity Reranker** (`backend/routes/buyer/recommendation.js` using `art_type`, `genre`, `mediums_used`, `feature_scanned`, `artist_affinity`, `storefront.specialties`, and train-split popularity) |
| **SASRec Configuration** | `item_num=111`, `maxlen=50`, `hidden_units=50`, `num_blocks=2`, `num_heads=1`, `dropout_rate=0.2`, `norm_first=True`, `parameters=39,250` |
| **Training Settings** | `epochs=90`, `batch_size=8`, `lr=0.0025`, `Adam(betas=(0.9, 0.98))`, `BCEWithLogitsLoss`, `device=cpu`, `seed=42` |
| **Inference Endpoint Tested** | FastAPI `POST /recommend` (`RecommendationRequest` -> `SASRec.predict` -> Hybrid Reranker) |
| **Live Artifacts Safety** | Production MySQL read-only; live `backend/ml/recommendation/models/sasrec.pth` untouched (evaluation checkpoint saved strictly to a temporary folder and discarded) |

---

## 2. Evaluation Dataset & 80/20 Split Details

- **Live MySQL Source (`localhost:3307/art_match`):** Verified catalog contains **`111` real artworks**; live `recommendation_interaction` currently holds `446` positive interactions across `13` actors (`< 500`), so a deterministic offline benchmark dataset of **`500` labeled user-artwork interactions** was generated in memory using the **`111` real verified artwork IDs and attributes** (`art_type`, `genre`, `mediums_used`, `feature_scanned`, `student_id`, `storefront.specialties`) from MySQL (`seed=42`).
- **Split Policy:** **80% Training (`400` interactions)** / **20% Testing (`100` interactions)** across `20` users (`10` evaluated test users with `20` training + `10` strictly unseen held-out test interactions each, plus `10` peer training users with `20` training interactions each).
- **Strict Zero Data Leakage:** For every evaluated user, `train_items ∩ test_items = ∅`. All SASRec weights, artist affinity scores, specialty scores, metadata preferences, and popularity weights are computed strictly from the 80% training split, and seen training items are masked before ranking the remaining `91` unseen real artworks.

| Real Artwork Taste Cohort (Derived from MySQL `art_type` & `genre`) | Real Artworks Assigned |
| :--- | ---: |
| `Products_Cute_Crafts` | 28 |
| `Digital_Conceptual_Art` | 28 |
| `Painting_Modern_Abstract` | 28 |
| `Painting_Traditional_Physical` | 27 |

---

## 3. Benchmark 1 — Model Training Time

- **Measured on:** 80% Training Split (`400` interactions across `20` users, `90` epochs on CPU) using `time.perf_counter()`
- **Training Loss Progression:** Epoch 1 = `1.545769` -> Epoch 90 = `0.160081`
- **Measured Training Time:** **`14.3588 seconds`** (`14358.75 ms`)
- **Thesis Target:** `<= 30.0 seconds`
- **Status:** **PASS**

---

## 4. Benchmark 2 — Offline Accuracy Metrics (Top-10 Recommendations)

### 4.1 Raw Confusion Counts (Full Production Hybrid Pipeline Across `10` Test Users)

| Confusion Metric | Definition (Top-10 Evaluation) | Raw Count |
| :--- | :--- | ---: |
| **True Positives (TP)** | Relevant held-out test artworks correctly recommended in Top-10 | **81** |
| **False Positives (FP)** | Non-relevant artworks recommended in Top-10 | **19** |
| **False Negatives (FN)** | Relevant held-out test artworks missed outside Top-10 | **19** |
| **Total Recommendations Evaluated (`TP + FP`)** | `10 test users × 10 recommendations` | **100** |
| **Total Held-Out Relevant Items (`TP + FN`)** | `20% test split ground-truth preferred artworks` | **100** |

### 4.2 Per-User Top-10 Breakdown (Full Hybrid Pipeline)

| Test User | Taste Cohort | Train Items | Test Items | TP | FP | FN | Precision@10 | Recall@10 | AP@10 |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| User 01 | `Products_Cute_Crafts` | 20 | 10 | 9 | 1 | 1 | 90.00% | 90.00% | 0.9000 |
| User 02 | `Digital_Conceptual_Art` | 20 | 10 | 9 | 1 | 1 | 90.00% | 90.00% | 0.9000 |
| User 03 | `Painting_Modern_Abstract` | 20 | 10 | 7 | 3 | 3 | 70.00% | 70.00% | 0.6635 |
| User 04 | `Painting_Traditional_Physical` | 20 | 10 | 8 | 2 | 2 | 80.00% | 80.00% | 0.7532 |
| User 05 | `Products_Cute_Crafts` | 20 | 10 | 9 | 1 | 1 | 90.00% | 90.00% | 0.9000 |
| User 06 | `Digital_Conceptual_Art` | 20 | 10 | 8 | 2 | 2 | 80.00% | 80.00% | 0.7764 |
| User 07 | `Painting_Modern_Abstract` | 20 | 10 | 7 | 3 | 3 | 70.00% | 70.00% | 0.6732 |
| User 08 | `Painting_Traditional_Physical` | 20 | 10 | 8 | 2 | 2 | 80.00% | 80.00% | 0.7621 |
| User 09 | `Products_Cute_Crafts` | 20 | 10 | 9 | 1 | 1 | 90.00% | 90.00% | 0.9000 |
| User 10 | `Digital_Conceptual_Art` | 20 | 10 | 7 | 3 | 3 | 70.00% | 70.00% | 0.7000 |

### 4.3 Step-by-Step Formula Substitutions

1. **Precision (Target: $\ge 70\%$):**
$$\text{Precision} = \frac{TP}{TP + FP} = \frac{81}{81 + 19} = \frac{81}{100} = 0.8100 \; (\mathbf{81.00\%})$$

2. **Recall (Target: $\ge 65\%$):**
$$\text{Recall} = \frac{TP}{TP + FN} = \frac{81}{81 + 19} = \frac{81}{100} = 0.8100 \; (\mathbf{81.00\%})$$

3. **F1-Score (Target: $\ge 0.67$):**
$$\text{F1-Score} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}} = 2 \times \frac{0.8100 \times 0.8100}{0.8100 + 0.8100} = \mathbf{0.8100}$$

4. **Mean Average Precision — MAP@10 (Target: $\ge 0.70$):**
$$\text{MAP@10} = \frac{1}{10} \sum_{u=1}^{10} \text{AP@10}(u) = \frac{0.9000 + 0.9000 + 0.6635 + 0.7532 + 0.9000 + 0.7764 + 0.6732 + 0.7621 + 0.9000 + 0.7000}{10} = \mathbf{0.7928}$$

### 4.4 Architecture Ablation: Standalone SASRec vs. Full Hybrid Pipeline

| Model Variant | TP | FP | FN | Precision@10 | Recall@10 | F1-Score | MAP@10 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Stage 1 Only — Standalone SASRec** (`sasrec_model.py`) | 68 | 32 | 32 | 68.00% | 68.00% | 0.6800 | 0.6242 |
| **Full Production Hybrid — SASRec + Content Reranker** (`recommendation.js`) | **81** | **19** | **19** | **81.00%** | **81.00%** | **0.8100** | **0.7928** |

---

## 5. Benchmark 3 — Inference Speed (`100` Consecutive `POST /recommend` Requests)

Measured end-to-end across **100 consecutive FastAPI `POST /recommend` requests** (JSON parsing, Pydantic `RecommendationRequest` validation, SASRec Transformer forward pass, and Top-10 ranking):

| Endpoint Pipeline (`100` consecutive requests) | Average | Min | Median (p50) | 95th Percentile (p95) | Max |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **FastAPI `/recommend` — SASRec Only** | 5.357 ms (0.005357 s) | 3.363 ms | 4.806 ms | 7.276 ms (0.007276 s) | 28.612 ms |
| **FastAPI `/recommend` — Full Hybrid (SASRec + Reranker)** | **9.612 ms (0.009612 s)** | 6.896 ms (0.006896 s) | 9.479 ms | **11.857 ms (0.011857 s)** | 13.527 ms (0.013527 s) |

---

## 6. Final Summary Table

| Metric | Target | Actual Result | Status |
| :--- | :---: | :---: | :---: |
| **Model Training Time (80% split, 400 interactions)** | <= 30.0 s | **14.3588 s** (14358.75 ms) | **PASS** |
| **Precision@10** | >= 70.00% | **81.00%** (81/100) | **PASS** |
| **Recall@10** | >= 65.00% | **81.00%** (81/100) | **PASS** |
| **F1-Score** | >= 0.67 | **0.8100** | **PASS** |
| **Mean Average Precision (MAP@10)** | >= 0.70 | **0.7928** | **PASS** |
| **Inference Time — Average (100 requests)** | Real-time (< 1.0 s) | **9.612 ms** (0.009612 s) | **PASS** |
| **Inference Time — p95 (100 requests)** | Real-time (< 1.0 s) | **11.857 ms** (0.011857 s) | **PASS** |

- **Overall Capstone Evaluation Verdict:** **PASSED — All thesis targets met.**
