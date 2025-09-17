// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC7VSuceoRcx5RsazsMsULu_1YJHr98z4c",
    authDomain: "auckland-domain-rock-hunter.firebaseapp.com",
    projectId: "auckland-domain-rock-hunter",
    storageBucket: "auckland-domain-rock-hunter.firebasestorage.app",
    messagingSenderId: "700245081143",
    appId: "1:700245081143:web:26769d4cd4a35b21a2d3b2",
    measurementId: "G-5GB0TT9CJT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export for use in main app - only Firestore (no Storage)
window.firebaseDb = firebase.firestore();
// Skip Storage initialization to avoid setup requirements
// window.firebaseStorage = firebase.storage();

console.log('🔥 Firebase initialized successfully (Firestore only)!');
console.log('🔍 Project ID:', firebaseConfig.projectId);
console.log('🔍 Auth Domain:', firebaseConfig.authDomain);