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

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBcg07lrmxf7ixeHxa29rSrkWxb03G4w4U",
    authDomain: "geran-express.firebaseapp.com",
    projectId: "geran-express",
    storageBucket: "geran-express.firebasestorage.app",
    messagingSenderId: "100329986906",
    appId: "1:100329986906:web:4998c36eecc975b46bf163",
    measurementId: "G-WP2S70R07C"
  };

// ImgBB is used instead of Firebase Storage for listing photos (free, no billing plan needed).
// Get a key at https://api.imgbb.com/ and paste it below to enable uploads;
// until then, photos are kept as local base64 data (old behavior).
const IMGBB_API_KEY = "044c84fb33e068293052ead694715174";

// Uploads a File/Blob to ImgBB and resolves with its direct hosted URL, or null if not configured.
async function uploadToImgBB(file) {
  if (!IMGBB_API_KEY) {
    console.warn("[ImgBB] IMGBB_API_KEY not set in js/firebase-config.js — falling back to local base64 photo storage.");
    return null;
  }
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json || !json.success || !json.data || !json.data.url) {
      throw new Error((json && json.error && json.error.message) || "ImgBB upload failed");
    }
    return json.data.url;
  } catch (e) {
    console.error("[ImgBB] Upload failed:", e);
    return null;
  }
}

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

const LISTINGS_COLLECTION = "listings";

// Live-syncs the "listings" collection; calls onChange(docsArray) on every update.
// Returns an unsubscribe function, or null if Firestore isn't available.
function subscribeToListings(onChange, onError) {
  if (!FIREBASE_READY || !fbDb) return null;
  return fbDb.collection(LISTINGS_COLLECTION).orderBy("createdAt", "desc").onSnapshot(
    (snap) => onChange(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
    (err) => {
      console.error("[Firestore] listings subscription failed:", err);
      if (onError) onError(err);
    }
  );
}

// Creates a new listing doc with an auto-generated id and a server-side timestamp
// (rules require data.userId === auth.uid to create). Returns the new doc reference.
function addListingToFirestore(listingData) {
  if (!FIREBASE_READY || !fbDb) return Promise.reject(new Error("Firestore not configured"));
  return fbDb.collection(LISTINGS_COLLECTION).add({
    ...listingData,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  }).then((docRef) => {
    console.info("[Firestore] Listing created:", docRef.id);
    return docRef;
  }).catch((e) => { console.error("[Firestore] Failed to create listing:", e); throw e; });
}

// Patches a subset of fields on an existing listing doc (e.g. status toggle, edit form).
function updateListingInFirestore(id, patch) {
  if (!FIREBASE_READY || !fbDb) return Promise.resolve();
  return fbDb.collection(LISTINGS_COLLECTION).doc(id).set(patch, { merge: true })
    .catch((e) => { console.error("[Firestore] Failed to update listing " + id + ":", e); throw e; });
}

function deleteListingFromFirestore(id) {
  if (!FIREBASE_READY || !fbDb) return Promise.resolve();
  return fbDb.collection(LISTINGS_COLLECTION).doc(id).delete()
    .catch((e) => { console.error("[Firestore] Failed to delete listing " + id + ":", e); });
}
