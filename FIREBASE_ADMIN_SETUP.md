# Firebase Admin Setup Guide

## Issue: Network Connectivity for Token Verification

The Firebase Admin SDK needs to verify tokens by calling Google's APIs. If you experience `ENOTFOUND www.googleapis.com` errors:

### Quick Fix for Development

The code has a **development fallback** that works offline:
- In development mode (`NODE_ENV=development`), tokens are decoded locally without verifying the signature
- ⚠️ This is **insecure** for production - use only for local development

### Proper Solution

1. **Ensure internet connectivity**: Make sure your machine can reach `googleapis.com`:
   ```bash
   ping googleapis.com
   ```

2. **Check DNS**: If ping works but Firebase still fails, it might be a DNS issue:
   ```bash
   nslookup googleapis.com
   ```

3. **Firewall/Proxy**: If you're behind a corporate firewall, ensure it allows traffic to Google APIs

## Making a User an Admin

### Option 1: Using `manageAdmin.js` (Recommended)

This script grants admin access via both custom claims AND Firestore, so it works even if network verification fails:

```bash
# Requires FIREBASE_SERVICE_ACCOUNT_KEY or scripts/serviceAccountKey.json
node scripts/manageAdmin.js
```

Then follow the prompts:
```
Enter user UID to manage: [paste user's UID from Firebase Console]
Action? (grant/revoke): grant
```

### Option 2: Using `makeAdmin.js` (Original)

Only works if you have network connectivity to Google:

```bash
node scripts/makeAdmin.js
```

## Finding Your User UID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Users**
4. Find your user and click on them
5. Copy the **UID** from the details panel

## How Admin Verification Works

The API checks admin status in this order:
1. **Custom claims** from Firebase Auth (requires network)
2. **Firestore `admins` collection** (fallback, local lookup)
3. **Development mode fallback** (for offline testing)

This multi-layer approach ensures admins work even if one verification method fails.

## Testing Admin Upload

1. Sign in at `/admin/upload`
2. Grant yourself admin access: `node scripts/manageAdmin.js`
3. Refresh the page
4. Try uploading a property

## Environment Setup

Ensure `.env.local` has:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

Or place `scripts/serviceAccountKey.json` (downloaded from Firebase Console)
