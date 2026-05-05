/* Файл: sw.js */
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
const CACHE_NAME = 'rbi-quality-v17.8.56'; 

// 1. ПРЕ-КЭШ: Локальные файлы и ВНЕШНИЕ БИБЛИОТЕКИ (для 100% офлайна)
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './data/system_docs.js',
  './data/system_nodes.js',
  './data/system_twi.js',
  './js/config.js',
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
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
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

// 4. ПЕРЕХВАТ ЗАПРОСОВ (Stale-While-Revalidate)
self.addEventListener('fetch', event => {
  // Игнорируем запросы не по HTTP
  if (!event.request.url.startsWith('http')) return;
  if (event.request.method !== 'GET') return;
  
  // Запросы к Supabase (API БД) мы НЕ кэшируем, чтобы данные были актуальными
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      
      // Фоновый запрос в сеть за свежей версией файла
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache); // Обновляем кэш на лету
          });
        }
        return networkResponse;
      }).catch(err => {
        console.log('[SW] Офлайн: Сеть недоступна, пытаемся отдать из кэша.', event.request.url);
      });

      // Отдаем кэш сразу (если он есть), а в фоне скачиваем обновления
      return cachedResponse || fetchPromise;
    })
  );
});