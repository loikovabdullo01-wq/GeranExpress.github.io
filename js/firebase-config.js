// Firebase configuration.
//
// This file is the ONLY place you need to touch to turn on real
// server-side auth + data for Geran Express. Until real values are
// filled in below, FIREBASE_READY stays false and the whole app keeps
// working exactly like today (phone number saved locally, listings in
// this browser only) — nothing breaks by adding this file.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBcg07lrmxf7ixeHxa29rSrkWxb03G4w4U",
  authDomain: "geran-express.firebaseapp.com",
  projectId: "geran-express",
  storageBucket: "geran-express.firebasestorage.app",
  messagingSenderId: "100329986906",
  appId: "1:100329986906:web:4998c36eecc975b46bf163",
  measurementId: "G-WP2S70R07C"
};

// ImgBB — бесплатный хостинг картинок. Получи ключ на https://api.imgbb.com/
const IMGBB_API_KEY = "044c84fb33e068293052ead694715174";

// Загрузка файла в ImgBB, возвращает URL или null.
async function uploadToImgBB(file) {
  if (!IMGBB_API_KEY) {
    console.warn("[ImgBB] IMGBB_API_KEY not set — falling back to local base64 photo storage.");
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
    console.info("[Firebase] Not configured — running in local-only demo mode.");
    return;
  }
  if (typeof firebase === "undefined") {
    console.warn("[Firebase] SDK script did not load — running in local-only demo mode.");
    return;
  }
  try {
    fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    fbStorage = firebase.storage();
    FIREBASE_READY = true;
    console.info("[Firebase] Connected — live mode.");
  } catch (e) {
    console.error("[Firebase] init failed — local-only demo mode.", e);
  }
})();

const LISTINGS_COLLECTION = "listings";
const DONATIONS_COLLECTION = "donations";
const SETTINGS_COLLECTION = "settings";

async function ensureFirebaseAuth() {
  if (!FIREBASE_READY || !fbAuth) return null;
  if (fbAuth.currentUser) return fbAuth.currentUser;

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (user) => {
      if (resolved) return;
      resolved = true;
      resolve(user || null);
    };

    const unsubscribe = fbAuth.onAuthStateChanged((user) => {
      unsubscribe();
      if (user) finish(user);
      else {
        fbAuth.signInAnonymously()
          .then((cred) => finish(cred.user))
          .catch((err) => {
            console.error("[Firebase] Auto auth restore failed:", err);
            finish(null);
          });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        if (fbAuth.currentUser) finish(fbAuth.currentUser);
        else {
          fbAuth.signInAnonymously()
            .then((cred) => finish(cred.user))
            .catch(() => finish(null));
        }
      }
    }, 1500);
  });
}

function sanitizeFirestoreData(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) clean[key] = obj[key];
  });
  return clean;
}

function subscribeToListings(onChange, onError) {
  if (!FIREBASE_READY || !fbDb) return null;
  return fbDb.collection(LISTINGS_COLLECTION).onSnapshot(
    (snap) => onChange(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
    (err) => {
      console.error("[Firestore] listings subscription failed:", err);
      if (onError) onError(err);
    }
  );
}

async function addListingToFirestore(listingData) {
  if (!FIREBASE_READY || !fbDb) return Promise.reject(new Error("Firestore not configured"));
  const user = await ensureFirebaseAuth();
  if (!user) {
    const err = new Error("Пользователь не авторизован");
    console.error("Ошибка Firestore:", err);
    throw err;
  }
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const rawData = {
    ...listingData,
    userId: user.uid,
    date: now,
    createdAt: now,
    updatedAt: now,
    favoritedBy: Array.isArray(listingData.favoritedBy) ? listingData.favoritedBy : [],
    views: typeof listingData.views === "number" ? listingData.views : 0,
  };
  const dataToSend = sanitizeFirestoreData(rawData);
  return fbDb.collection(LISTINGS_COLLECTION).add(dataToSend).then((docRef) => {
    console.info("[Firestore] Listing created:", docRef.id);
    return docRef;
  }).catch((e) => {
    console.error("[Firestore] Failed to create listing:", e);
    throw e;
  });
}

async function updateListingInFirestore(id, patch) {
  if (!FIREBASE_READY || !fbDb) return Promise.resolve();
  await ensureFirebaseAuth();
  const rawData = {
    ...patch,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const dataToSend = sanitizeFirestoreData(rawData);
  return fbDb.collection(LISTINGS_COLLECTION).doc(id).set(dataToSend, { merge: true })
    .catch((e) => {
      console.error("[Firestore] Failed to update listing " + id + ":", e);
      throw e;
    });
}

async function deleteListingFromFirestore(id) {
  if (!FIREBASE_READY || !fbDb) return Promise.resolve();
  await ensureFirebaseAuth();
  return fbDb.collection(LISTINGS_COLLECTION).doc(id).delete()
    .catch((e) => {
      console.error("[Firestore] Failed to delete listing " + id + ":", e);
      throw e;
    });
}

// Увеличивает числовое поле (views, likes и т.п.) атомарно.
async function incrementListingField(id, field, amount) {
  if (!FIREBASE_READY || !fbDb) return Promise.resolve();
  await ensureFirebaseAuth();
  return fbDb.collection(LISTINGS_COLLECTION).doc(id)
    .update({ [field]: firebase.firestore.FieldValue.increment(amount) })
    .catch((e) => {
      console.error("[Firestore] increment " + field + " failed:", e);
      throw e;
    });
}

// Добавляет/удаляет uid в массиве favoritedBy.
async function toggleListingFavoriteRemote(id, uid, isAdding) {
  if (!FIREBASE_READY || !fbDb || !uid) return Promise.resolve();
  await ensureFirebaseAuth();
  return fbDb.collection(LISTINGS_COLLECTION).doc(id)
    .update({
      favoritedBy: isAdding
        ? firebase.firestore.FieldValue.arrayUnion(uid)
        : firebase.firestore.FieldValue.arrayRemove(uid),
    })
    .catch((e) => {
      console.error("[Firestore] favorite toggle failed:", e);
      throw e;
    });
}

function subscribeToBanners(onChange) {
  if (!FIREBASE_READY || !fbDb) return null;
  return fbDb.collection(SETTINGS_COLLECTION).doc("banners").onSnapshot(
    (snap) => {
      if (snap.exists) {
        const data = snap.data();
        onChange(Array.isArray(data.list) ? data.list : []);
      } else onChange([]);
    },
    (err) => console.error("[Firestore] Banners subscription failed:", err)
  );
}

async function saveBannersToFirestore(bannersArray) {
  if (!FIREBASE_READY || !fbDb) return Promise.reject(new Error("Firestore not configured"));
  await ensureFirebaseAuth();
  return fbDb.collection(SETTINGS_COLLECTION).doc("banners").set({
    list: bannersArray,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

function saveSponsorDonation(payload) {
  if (!FIREBASE_READY || !fbDb) return Promise.reject(new Error("Firestore not configured"));
  const normalized = {
    userId: payload.userId || null,
    amount: Number(payload.amount) || 0,
    bank: payload.bank || "Эсхата",
    account: payload.account || "971 220 800",
    message: String(payload.message || ""),
    receiptUrl: payload.receiptUrl || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  return fbDb.collection(DONATIONS_COLLECTION).add(normalized).then((docRef) => {
    console.info("[Firestore] Sponsor donation saved:", docRef.id);
    return docRef;
  }).catch((e) => {
    console.error("[Firestore] Failed to save sponsor donation:", e);
    throw e;
  });
}

// --- Online presence ---------------------------------------------------
const PRESENCE_COLLECTION = "presence";
const PRESENCE_HEARTBEAT_MS = 25000;
const PRESENCE_STALE_MS = 70000;

function getPresenceSessionId() {
  let id = sessionStorage.getItem("bh_presence_id");
  if (!id) {
    id = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
    sessionStorage.setItem("bh_presence_id", id);
  }
  return id;
}

function markPresenceOnline() {
  if (!FIREBASE_READY || !fbDb) return;
  fbDb.collection(PRESENCE_COLLECTION).doc(getPresenceSessionId())
    .set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
    .catch((e) => console.error("[Presence] Failed to mark online:", e));
}

function markPresenceOffline() {
  if (!FIREBASE_READY || !fbDb) return;
  fbDb.collection(PRESENCE_COLLECTION).doc(getPresenceSessionId()).delete().catch(() => {});
}

function initPresenceTracking(onCount) {
  if (!FIREBASE_READY || !fbDb) return null;

  markPresenceOnline();
  const heartbeatTimer = setInterval(markPresenceOnline, PRESENCE_HEARTBEAT_MS);

  let lastSeenById = new Map();
  function recomputeCount() {
    const cutoff = Date.now() - PRESENCE_STALE_MS;
    let online = 0;
    lastSeenById.forEach((ms) => { if (ms > cutoff) online++; });
    onCount(Math.max(online, 1));
  }

  const unsubscribe = fbDb.collection(PRESENCE_COLLECTION).onSnapshot(
    (snap) => {
      lastSeenById = new Map();
      snap.forEach((doc) => {
        const data = doc.data();
        const ms = data.lastSeen && data.lastSeen.toMillis ? data.lastSeen.toMillis() : 0;
        lastSeenById.set(doc.id, ms);
      });
      recomputeCount();
    },
    (err) => console.error("[Presence] Subscription failed:", err)
  );

  const tickTimer = setInterval(recomputeCount, 5000);

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") markPresenceOffline();
    else markPresenceOnline();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("beforeunload", markPresenceOffline);
  window.addEventListener("pagehide", markPresenceOffline);

  return function stopPresenceTracking() {
    clearInterval(heartbeatTimer);
    clearInterval(tickTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", markPresenceOffline);
    window.removeEventListener("pagehide", markPresenceOffline);
    unsubscribe();
    markPresenceOffline();
  };
}
