// Diamond Athletics service worker.
//
// This file has to be deployed exactly as-is, as its own standalone file, at
// the root of the site (same level as index.html / basepath.html) — NOT
// bundled into the app JS. Its scope only covers files at or below wherever
// it's served from, which is why it has to sit at the root rather than in a
// subfolder, and why the same file is shared by both apps.
//
// Two unrelated jobs live in this one file:
//   1. FCM background notifications (arriving while the tab isn't focused)
//   2. Caching the app shell so the app still loads if a coach's connection
//      drops mid-game and the tab has to reload — Firestore/Auth traffic and
//      everything else is left alone, only these specific files are cached.

importScripts("https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCYOe0cu4qaY9DNCMScyGyu31DpgwpIwPY",
  authDomain: "diamond-athletics.firebaseapp.com",
  projectId: "diamond-athletics",
  storageBucket: "diamond-athletics.firebasestorage.app",
  messagingSenderId: "509403864718",
  appId: "1:509403864718:web:da037c53aa4b7f51af33df",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Diamond Athletics";
  const body = (payload.notification && payload.notification.body) || "";
  self.registration.showNotification(title, {
    body,
    icon: "./favicon.ico",
  });
});

// ---- Offline app-shell caching ----

const CACHE_NAME = "diamond-athletics-shell-v1";
const SHELL_URLS = ["./index.html", "./basepath.html"];

function isShellRequest(url) {
  return url.endsWith("index.html") || url.endsWith("basepath.html") || url.includes("cdn.tailwindcss.com");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_URLS.map((url) =>
          fetch(url, { cache: "no-store" })
            .then((response) => {
              if (response.ok) return cache.put(url, response);
            })
            .catch(() => {}) // don't fail the whole install if one file isn't reachable yet
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only ever intercept GETs for the app shell itself + the Tailwind CDN
  // script. Everything else — Firestore, Auth, fonts, images — goes straight
  // to the network untouched, so there's no risk of ever serving stale or
  // wrong data for anything that actually needs to be live.
  if (req.method !== "GET" || !isShellRequest(req.url)) return;

  // Network-first: always prefer the live, current version when online (so
  // a coach never gets stuck on an old cached build), falling back to
  // whatever was last cached only when the network request actually fails.
  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      })
      .catch(() => caches.match(req))
  );
});
