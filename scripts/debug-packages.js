const admin = require('firebase-admin');
const serviceAccount = require('./agricheck-83fe1-firebase-adminsdk-fbsvc-ff9eda89c8.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listAllPackages() {
    console.log('🔍 Listing all documents in InputPackages collection...');
    try {
        const snapshot = await db.collection('InputPackages').get();
        if (snapshot.empty) {
            console.log('❌ InputPackages collection is EMPTY!');

            // Check for common typos
            const collections = await db.listCollections();
            console.log('Available collections:', collections.map(c => c.id).join(', '));

            return;
        }

        console.log(`✅ Found ${snapshot.size} documents:\n`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log(`- cropType: "${data.cropType}"`);
            console.log(`- active: ${data.active} (type: ${typeof data.active})`);
            console.log('---');
        });
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

listAllPackages();
