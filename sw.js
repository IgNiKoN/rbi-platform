/* Файл: sw.js */
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
const APP_VERSION = '17.8.188';
const SW_VERSION = '17.96';
const CACHE_NAME = `rbi-quality-v${SW_VERSION}`; 

// 1. ПРЕ-КЭШ: Локальные файлы и ВНЕШНИЕ БИБЛИОТЕКИ (для 100% офлайна)
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './data/system_docs.js',
  './data/system_nodes.js',
  './data/system_twi.js',
  './js/config.js',
  './js/contractorDirectory.js',
  './js/objectDirectory.js',
  './js/sync.js',
  './js/storage.js',
  './js/templates.js',
  './js/math.js',
  './js/ai.js',
  './js/faq.js',
  './js/task.js',
  './js/etalon.js',
  './js/app.js',
  './js/analytics.js', 
  './js/export.js',    
  './js/game.js',
  './js/sk.js',
  './manifest.webmanifest',
  // --- ДОБАВЛЕНО: Внешние библиотеки для работы без интернета ---
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js' // <-- ДОБАВИЛИ
];

// 2. УСТАНОВКА: Безопасное скачивание файлов в память
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Кэшируем ядро и библиотеки...');
      // Безопасное кэширование: если одна ссылка недоступна, остальные всё равно скачаются
      return Promise.all(urlsToCache.map(url => {
        return fetch(url, { mode: 'no-cors' }).then(response => {
          return cache.put(url, response);
        }).catch(err => console.log('[SW] Ошибка кэширования: ', url, err));
      }));
    })
  );
});

// 3. АКТИВАЦИЯ: Удаляем старые версии кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); 
});

// 4. ПЕРЕХВАТ ЗАПРОСОВ
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  // ✅ НОВОЕ: Полностью пропускаем запросы к облачному хранилищу (Storage)
  if (event.request.url.includes('/storage/v1/object/public/')) {
    return;   // Браузер обработает запрос напрямую, без вмешательства SW
  }

  // ✅ Пропускаем запросы к API (база данных, функции), чтобы не ломать синхронизацию
  const isApi = event.request.url.includes('api.rbi-q.ru') && 
                !event.request.url.includes('/storage/v1/object/public/');
  if (isApi) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});