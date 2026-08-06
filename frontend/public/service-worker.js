// Motoristas VIP Litoral - minimal service worker for PWA installability
const CACHE = 'vip-litoral-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first for API, fall back to network for everything else.
  // Kept intentionally minimal - just needed for installability.
  return;
});
