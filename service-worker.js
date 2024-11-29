const CACHE_NAME = 'student-support-system-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://cdn.quilljs.com/1.3.7/quill.min.js',
  'https://cdn.quilljs.com/1.3.7/quill.snow.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
