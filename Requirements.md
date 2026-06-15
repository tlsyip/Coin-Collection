# Coin Collection — Requirements

## 1. Overview

Coin Collection is a web-based application for coin collectors that helps users determine whether a newly photographed coin already exists in their personal collection.

The app focuses on **duplicate detection of unique coin types and inventory tracking**.

Version 1 is fully offline and runs locally on the device.

---

## 2. Core Principle

This app is designed for **unique coin collection only**.

- Each coin type should exist only once in the collection.
- If a coin is already present, the app must flag it as “Already in collection.”
- No support for multiple copies of the same coin.

---

## 3. Key Functional Requirements

### 3.1 Add Coin

- User captures:
  - Front image
  - Back image
- App automatically:
  - Detects and crops the coin
  - Normalizes image size and orientation
  - Generates visual fingerprints
- Store coin in local database

---

### 3.2 Check Coin

- User captures a coin image
- App processes image and generates fingerprints
- App compares against stored coins
- Output:

If match found (above threshold):
- Show: **“Already in collection.”**
- Display matching coin image
- Show similarity score

If no match:
- Show: **“New coin detected.”**
- Allow user to add it to collection

---

## 4. Computer Vision Requirements

### 4.1 Coin Detection

- Detect largest circular object in image
- Crop coin region
- Remove background as much as possible
- Normalize size and orientation

---

### 4.2 Visual Fingerprint System

Each coin must store:

1. Perceptual Hash (pHash)
   - Captures structural similarity

2. Color Histogram
   - Captures color distribution
   - Critical for distinguishing color vs non-color variants

3. Image Embedding
   - Generated using ML Kit or TensorFlow Lite
   - Captures deeper visual features

---

## 5. Duplicate Detection Algorithm

Compare incoming coin against stored coins using:

- pHash similarity
- Color histogram similarity
- Embedding similarity

### Final Score Formula

Final Score =
- 0.20 × pHash similarity  
- 0.30 × color similarity  
- 0.50 × embedding similarity  

### Rules

- Do NOT rely on grayscale comparison.
- Color information must influence final decision.
- pHash alone must never determine a match.

---

## 6. Matching Logic

### Confidence Thresholds

- 95–100% → Already in collection
- 80–95% → Possible match (show comparison)
- < 80% → New coin

### Output Behavior

If match:
- Show existing coin
- Show similarity score

If uncertain:
- Show side-by-side comparison
- Let user decide

If no match:
- Allow adding as new coin

---

## 7. Data Model

### Coin

- id
- nickname (optional)
- frontImagePath
- backImagePath
- dateAdded
- visualFingerprintVersion
- pHashFront
- pHashBack
- colorHistogramFront
- colorHistogramBack
- frontEmbedding
- backEmbedding

---

## 8. Orientation Handling

The system must handle:

- Rotation
- Upside-down images
- Slight angle variations

Preprocess images before fingerprint generation where possible.

---

## 9. Future Expansion (Non-MVP)

The architecture must support future features without redesign:

- Coin identification (name, year, country)
- Commemorative event detection
- Mintage data
- Rarity scoring
- Collection statistics
- Wishlist system
- Cloud sync (optional future)

---

## 10. Success Criteria

The app is successful when:

- User can add coins
- Coins are stored locally
- Duplicate detection works reliably
- Color variants are correctly distinguished
- App runs fully offline
- Collection persists after restart
- Code compiles without errors
- Architecture is modular and extensible