const admin = require('firebase-admin');
const serviceAccount = require('./agricheck-83fe1-firebase-adminsdk-fbsvc-ff9eda89c8.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkInputProducts() {
    console.log('🔍 Checking InputProducts collection structure...');
    try {
        const snapshot = await db.collection('InputProducts').limit(3).get();
        if (snapshot.empty) {
            console.log('⚠️ InputProducts collection is empty!');
            return;
        }

        snapshot.forEach(doc => {
            console.log(`\n📄 Document ID: ${doc.id}`);
            console.log('Data:', JSON.stringify(doc.data(), null, 2));
        });
    } catch (error) {
        console.error('❌ Error checking collection:', error);
    } finally {
        process.exit(0);
    }
}

checkInputProducts();
