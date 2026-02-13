# Firebase InputPackages Seed Data

This document contains the JSON data for the 4 standard contract templates that should be added to the `InputPackages` collection in Firebase.

## Instructions

1. Go to Firebase Console → Firestore Database
2. Create a new collection called `InputPackages`
3. Add each document below with the specified Document ID

---

## Document 1: Maize Production Contract

**Document ID:** `maize_standard_2026`

```json
{
  "cropType": "Maize",
  "packageName": "Maize Production Contract",
  "totalInputValue": 2100,
  "produceRepaymentPerAcre": 6,
  "produceType": "Grade A White Maize",
  "bagWeight": 100,
  "repaymentTimeline": "Within 14 days of harvest completion",
  "inputsIncluded": [
    {
      "productId": "hybrid_maize_seed",
      "productName": "Hybrid Maize Seed Pack (4 packs)",
      "quantity": 4
    },
    {
      "productId": "npk_compound",
      "productName": "NPK Compound Fertilizer 50kg",
      "quantity": 2
    },
    {
      "productId": "urea_fertilizer",
      "productName": "Urea Fertilizer 50kg",
      "quantity": 2
    }
  ],
  "marginPercentage": 25,
  "description": "Full Input Package for 1 Acre of Maize. Includes hybrid seeds, NPK compound, and Urea fertilizer. Repayment: 6 bags (100kg each) of Grade A White Maize.",
  "active": true
}
```

---

## Document 2: Soybean Booster Contract

**Document ID:** `soybean_booster_2026`

```json
{
  "cropType": "Soybean",
  "packageName": "Soybean Booster Contract",
  "totalInputValue": 1100,
  "produceRepaymentPerAcre": 3.5,
  "produceType": "Clean, Dried Soybean",
  "bagWeight": 100,
  "repaymentTimeline": "Within 21 days of harvest",
  "inputsIncluded": [
    {
      "productId": "soybean_booster_pack",
      "productName": "Soybean Booster Pack (Seed + Inoculant)",
      "quantity": 1
    },
    {
      "productId": "liquid_organic_fertilizer",
      "productName": "Liquid Organic Fertilizer (4L)",
      "quantity": 1
    },
    {
      "productId": "foliar_spray",
      "productName": "Foliar Spray",
      "quantity": 1
    }
  ],
  "marginPercentage": 28,
  "description": "Specialized Soya Yield Booster Pack. Includes seeds with inoculant, liquid organic fertilizer, and foliar spray. Repayment: 3.5 bags (100kg each) of clean, dried Soybean.",
  "active": true
}
```

---

## Document 3: Rice Grower Contract

**Document ID:** `rice_grower_2026`

```json
{
  "cropType": "Rice",
  "packageName": "Rice Grower Contract",
  "totalInputValue": 2500,
  "produceRepaymentPerAcre": 8,
  "produceType": "Paddy Rice (unmilled)",
  "bagWeight": 100,
  "repaymentTimeline": "Immediately upon threshing",
  "inputsIncluded": [
    {
      "productId": "certified_paddy_seed",
      "productName": "Certified Paddy Seed (40kg)",
      "quantity": 1
    },
    {
      "productId": "npk_compound",
      "productName": "NPK Compound Fertilizer 50kg",
      "quantity": 3
    },
    {
      "productId": "urea_fertilizer",
      "productName": "Urea Fertilizer 50kg",
      "quantity": 2
    }
  ],
  "marginPercentage": 30,
  "description": "High-Yield Paddy Rice Input Bundle. Includes certified paddy seed and heavy fertilization (NPK + Urea). Repayment: 8 bags (100kg each) of Paddy Rice (unmilled).",
  "active": true
}
```

---

## Document 4: Sorghum Resilience Contract

**Document ID:** `sorghum_resilience_2026`

```json
{
  "cropType": "Sorghum",
  "packageName": "Sorghum Resilience Contract",
  "totalInputValue": 1300,
  "produceRepaymentPerAcre": 4.5,
  "produceType": "Sorghum Grain",
  "bagWeight": 100,
  "repaymentTimeline": "Post-harvest drying phase",
  "inputsIncluded": [
    {
      "productId": "improved_sorghum_seed",
      "productName": "Improved Sorghum Seed (5kg)",
      "quantity": 1
    },
    {
      "productId": "npk_compound",
      "productName": "NPK Compound Fertilizer 50kg",
      "quantity": 2
    },
    {
      "productId": "liquid_organic_fertilizer",
      "productName": "Liquid Organic Fertilizer (2L)",
      "quantity": 1
    }
  ],
  "marginPercentage": 22,
  "description": "Climate-Resistant Sorghum Bundle. Includes improved sorghum seed, NPK compound, and liquid organic fertilizer. Repayment: 4.5 bags (100kg each) of Sorghum Grain.",
  "active": true
}
```

---

## How to Add to Firebase

### Method 1: Firebase Console (Manual)
1. Open Firebase Console
2. Navigate to Firestore Database
3. Click "Start collection"
4. Collection ID: `InputPackages`
5. For each document above:
   - Click "Add document"
   - Set Document ID (e.g., `maize_standard_2026`)
   - Copy-paste the JSON fields
   - Click "Save"

### Method 2: Firebase Admin SDK (Automated)
If you have Firebase Admin SDK set up, you can run a script to populate these automatically. Contact your developer for assistance.

---

## Notes

- **produceRepaymentPerAcre**: Number of 100kg bags required per acre
- **totalInputValue**: Total cost of inputs in GH₵
- **marginPercentage**: Profit margin built into the repayment (20-30%)
- **active**: Set to `false` to disable a package without deleting it
- **inputsIncluded**: Array of products included in the package (productId should match InputProducts collection)

---

## Updating Packages

To update repayment rates or input values due to inflation or market changes:
1. Go to Firebase Console → InputPackages
2. Edit the specific document
3. Update `totalInputValue` or `produceRepaymentPerAcre`
4. Changes will reflect immediately in the app (no code changes needed)
