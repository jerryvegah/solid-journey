const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load service account key
let serviceAccount = undefined;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
    process.exit(1);
  }
} else {
  // Try multiple locations
  const possiblePaths = [
    path.join(__dirname, 'serviceAccountKey.json'),  // scripts/serviceAccountKey.json
    path.join(__dirname, '..', 'serviceAccountKey.json'),  // project root/serviceAccountKey.json
    path.join(process.cwd(), 'serviceAccountKey.json'),  // current working directory
  ];

  let keyPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      keyPath = p;
      break;
    }
  }

  if (keyPath) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      console.log(`✓ Loaded service account from: ${keyPath}`);
    } catch (e) {
      console.error('Failed to read serviceAccountKey.json:', e.message);
      process.exit(1);
    }
  } else {
    console.error('Service account key not found. Searched:');
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    console.error('\nPlease place serviceAccountKey.json in project root or set FIREBASE_SERVICE_ACCOUNT_KEY env var');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  try {
    console.log('\n=== Firebase Admin Management ===\n');

    const uid = await question('Enter user UID to manage: ');
    if (!uid) {
      console.error('UID is required');
      process.exit(1);
    }

    const action = await question('Action? (grant/revoke): ');
    
    const firestore = admin.firestore();
    
    if (action === 'grant') {
      // Grant admin access via custom claims
      try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        console.log('✓ Custom claims set');
      } catch (err) {
        console.error('Failed to set custom claims:', err.message);
      }

      // Also add to Firestore admins collection (as fallback)
      try {
        await firestore.collection('admins').doc(uid).set({ isAdmin: true, grantedAt: new Date().toISOString() });
        console.log('✓ Added to Firestore admins collection');
      } catch (err) {
        console.error('Failed to add to Firestore:', err.message);
      }

      console.log(`\n✅ User ${uid} is now an admin`);
    } else if (action === 'revoke') {
      // Revoke admin access
      try {
        await admin.auth().setCustomUserClaims(uid, { admin: false });
        console.log('✓ Custom claims revoked');
      } catch (err) {
        console.error('Failed to revoke custom claims:', err.message);
      }

      // Remove from Firestore admins collection
      try {
        await firestore.collection('admins').doc(uid).delete();
        console.log('✓ Removed from Firestore admins collection');
      } catch (err) {
        console.error('Failed to remove from Firestore:', err.message);
      }

      console.log(`\n✅ Admin privileges revoked for user ${uid}`);
    } else {
      console.error('Invalid action. Use "grant" or "revoke"');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
