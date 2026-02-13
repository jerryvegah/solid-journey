const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Download this from Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'PASTE_THE_USER_UID_FROM_FIREBASE_AUTH_HERE';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => console.log('Successfully made user an admin!'))
  .catch(error => console.log(error));