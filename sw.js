const CACHE_NAME = 'raga-fm-cache-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/sketch.js',
  '/style.css',
  '/manifest.json',
  '/js/config.js',
  '/js/audio.js',
  '/js/raga.js',
  '/js/ui.js',
  '/js/visuals.js',
  '/ragadata.json',
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/15.0.4/Tone.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Koto Samples
  "samples/Sustain/Front_D3_Sustain2.flac",
  "samples/Sustain/Front_D#3_Sustain2.flac",
  "samples/Sustain/Front_E3_Sustain2.flac",
  "samples/Sustain/Front_F3_Sustain2.flac",
  "samples/Sustain/Front_F#3_Sustain2.flac",
  "samples/Sustain/Front_G3_Sustain2.flac",
  "samples/Sustain/Front_G#3_Sustain2.flac",
  "samples/Sustain/Front_A3_Sustain2.flac",
  "samples/Sustain/Front_A#3_Sustain2.flac",
  "samples/Sustain/Front_B3_Sustain2.flac",
  "samples/Sustain/Front_C4_Sustain2.flac",
  "samples/Sustain/Front_C#4_Sustain2.flac",
  "samples/Sustain/Front_D4_Sustain2.flac",
  "samples/Sustain/Front_D#4_Sustain2.flac",
  "samples/Sustain/Front_E4_Sustain2.flac",
  "samples/Sustain/Front_F4_Sustain2.flac",
  "samples/Sustain/Front_F#4_Sustain2.flac",
  "samples/Sustain/Front_G4_Sustain2.flac",
  "samples/Sustain/Front_G#4_Sustain2.flac",
  "samples/Sustain/Front_A4_Sustain2.flac",
  "samples/Sustain/Front_A#4_Sustain2.flac",
  "samples/Sustain/Front_B4_Sustain2.flac",
  "samples/Sustain/Front_C5_Sustain2.flac",
  "samples/Sustain/Front_C#5_Sustain2.flac",
  "samples/Sustain/Front_D5_Sustain2.flac",
  "samples/Sustain/Front_D#5_Sustain2.flac",
  "samples/Sustain/Front_E5_Sustain2.flac",
  "samples/Sustain/Front_F5_Sustain2.flac",
  "samples/Sustain/Front_F#5_Sustain2.flac",
  "samples/Sustain/Front_G5_Sustain2.flac",
  "samples/Sustain/Front_G#5_Sustain2.flac",
  "samples/Sustain/Front_A5_Sustain2.flac",
  "samples/Sustain/Front_A#5_Sustain2.flac",
  "samples/Sustain/Front_B5_Sustain2.flac",
  "samples/Sustain/Front_C6_Sustain2.flac"
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    clients.claim().then(() => {
      const cacheWhitelist = [CACHE_NAME];
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
        })
    );
  }
}); 