/* Файл: sw.js */
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
const CACHE_NAME = 'rbi-quality-v17.8.111'; 

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

// 4. ПЕРЕХВАТ ЗАПРОСОВ (Stale-While-Revalidate & Cache-First для файлов)
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;
  if (event.request.method !== 'GET') return;
  
  // РАЗДЕЛЯЕМ ЗАПРОСЫ (С учетом кастомного домена api.rbi-q.ru)
  // 1. Запросы к хранилищу файлов (картинки, PDF)
  const isStorage = event.request.url.includes('api.rbi-q.ru/storage/v1/object/public/');
  // 2. Запросы к API (база данных, функции, авторизация)
  const isApi = event.request.url.includes('api.rbi-q.ru') && !isStorage;

  // ЗАПРОСЫ К БД СТРОГО ИГНОРИРУЕМ! Иначе ServiceWorker сломает синхронизацию в офлайне.
  if (isApi) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      
      // СТРАТЕГИЯ CACHE-FIRST ДЛЯ ОБЛАЧНЫХ ФАЙЛОВ:
      // Если это картинка/PDF из бакета Supabase и она уже есть в кэше — отдаем её мгновенно
      if (cachedResponse && isStorage) {
          return cachedResponse;
      }

      // Для остальных файлов (HTML, CSS, JS) — фоновый запрос в сеть за свежей версией
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache); // Обновляем кэш
          });
        }
        return networkResponse;
      }).catch(err => {
        console.log('[SW] Офлайн: Сеть недоступна, пытаемся отдать из кэша.', event.request.url);
      });

      return cachedResponse || fetchPromise;
    })
  );
});