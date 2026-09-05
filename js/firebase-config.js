// Firebase configuration.
//
// This file is the ONLY place you need to touch to turn on real
// server-side auth + data for Geran Express. Until real values are
// filled in below, FIREBASE_READY stays false and the whole app keeps
// working exactly like today (phone number saved locally, listings in
// this browser only) — nothing breaks by adding this file.
//
// Where to get these values:
//   Firebase Console -> (your project) -> gear icon -> Project settings
//   -> General tab -> scroll to "Your apps" -> Web app -> the
//   firebaseConfig object shown there. Copy each field below.
//
// Also make sure, in the same console, you have enabled:
//   Build -> Authentication -> Sign-in method -> Phone
//   Build -> Firestore Database -> Create database
//   Build -> Storage -> Get started
// (Phone auth on the free "Spark" plan only sends real SMS to test
// numbers you add yourself in the console; real SMS to real users
// needs the pay-as-you-go "Blaze" plan.)

  const firebaseConfig = {
    apiKey: "AIzaSyBcg07lrmxf7ixeHxa29rSrkWxb03G4w4U",
    authDomain: "geran-express.firebaseapp.com",
    projectId: "geran-express",
    storageBucket: "geran-express.firebasestorage.app",
    messagingSenderId: "100329986906",
    appId: "1:100329986906:web:4998c36eecc975b46bf163",
    measurementId: "G-WP2S70R07C"
  };

let fbApp = null;
let fbAuth = null;
let fbDb = null;
let fbStorage = null;
let FIREBASE_READY = false;

(function initFirebaseIfConfigured() {
  const looksConfigured = FIREBASE_CONFIG.apiKey && !String(FIREBASE_CONFIG.apiKey).startsWith("YOUR_");
  if (!looksConfigured) {
    console.info("[Firebase] Not configured yet — running in local-only demo mode. Fill in js/firebase-config.js to go live.");
    return;
  }
  if (typeof firebase === "undefined") {
    console.warn("[Firebase] SDK script did not load (offline or blocked) — running in local-only demo mode.");
    return;
  }
  try {
    fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    fbStorage = firebase.storage();
    FIREBASE_READY = true;
    console.info("[Firebase] Connected — running in live mode (real SMS auth, shared listings).");
  } catch (e) {
    console.error("[Firebase] init failed — running in local-only demo mode.", e);
  }
})();
