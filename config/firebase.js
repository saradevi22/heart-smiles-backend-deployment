const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Initialize Firebase Admin if not already initialized
// This is critical for serverless - must handle errors gracefully
if (!admin.apps.length) {
  try {
    // Validate required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Missing required Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    // In serverless, we want to know about this but not crash the module load
    // Individual route handlers should check if Firebase is initialized
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error:', error);
    }
  }
}

// Get Firestore instance - handle case where Firebase might not be initialized
let db;
let collections = {};

try {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    // Collection references
    collections = {
      staff: db.collection('staff'),
      participants: db.collection('participants'),
      programs: db.collection('programs'),
      sessions: db.collection('sessions')
    };
  } else {
    console.warn('Firebase not initialized - db and collections will be undefined');
  }
} catch (error) {
  console.error('Error setting up Firestore:', error.message);
  // Don't crash - let route handlers deal with this
}

module.exports = {
  admin,
  db,
  collections
};
