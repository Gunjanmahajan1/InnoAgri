/**
 * Firebase Admin Service
 * ─────────────────────
 * Initialises Firebase Admin SDK once and exports the Firestore db object.
 *
 * HOW TO SET UP (one-time):
 *  1. Go to Firebase Console → Project Settings → Service Accounts
 *  2. Click "Generate new private key" → Download the JSON file
 *  3. Copy the values from the JSON into your backend/.env file
 *     (see .env.example for the exact key names)
 *  4. NEVER commit the JSON file or your .env to Git.
 */

const admin = require('firebase-admin');

let db = null; // Singleton – only initialise once

const initFirebase = () => {
    if (admin.apps.length) {
        db = admin.firestore();
        return db;
    }

    // Build the service-account credential from individual env vars
    // (avoids having to share a JSON file between team members)
    const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    console.log('✅  Firebase connected to project:', process.env.FIREBASE_PROJECT_ID);
    return db;
};

const getDb = () => {
    if (!db) {
        initFirebase();
    }
    return db;
};

module.exports = { initFirebase, getDb };
