// firebase-config.js - Firebase configuration

// Configuration for Firebase services
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCeX6Qx5D418brqSvnDsTKZxPpIjFGX5G8",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "mates-df5c5.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "mates-df5c5",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "mates-df5c5.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "622990964278",
    appId: process.env.FIREBASE_APP_ID || "1:622990964278:web:459cf848668fce7218ca97",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-QQ0DT2D41V"
};

// Export the configuration
export default firebaseConfig;
