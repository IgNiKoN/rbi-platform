/* Файл: sw.js */
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде! (v16.9.9)
const CACHE_NAME = 'rbi-quality-v17.8.16'; 

// 1. ПРЕ-КЭШ: ТОЛЬКО 100% локальные файлы (чтобы установка PWA никогда не падала)
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
  './js/faq.js',      // НОВЫЙ ФАЙЛ: База знаний
  './js/task.js',     // НОВЫЙ ФАЙЛ: Менеджер задач
  './js/etalon.js',   // НОВЫЙ ФАЙЛ: Конструктор эталона
  './js/app.js',
  './js/analytics.js', 
  './js/export.js',    
  './js/game.js',
  './manifest.webmanifest'
];

// 1. УСТАНОВКА: Скачиваем локальные файлы в память
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Кэшируем локальное ядро приложения...');
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. АКТИВАЦИЯ: Удаляем старые версии кэша
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

// 3. ПЕРЕХВАТ ЗАПРОСОВ (Stale-While-Revalidate + Runtime Caching для CDN)
self.addEventListener('fetch', event => {
  // Игнорируем запросы не по HTTP (например, chrome-extension://)
  if (!event.request.url.startsWith('http')) return;
  if (event.request.method !== 'GET') return;
  
  // Запросы к Supabase (API) мы НЕ кэшируем, они должны ходить в базу данных!
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      
      // Фоновый запрос в сеть за свежей версией файла
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Проверяем: если ответ успешный (200) ИЛИ это "opaque" ответ от внешнего CDN (Tailwind/Chart.js)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache); // Сохраняем CDN на лету!
          });
        }
        return networkResponse;
      }).catch(err => {
        console.log('[SW] Офлайн: Сеть недоступна, пытаемся отдать из кэша.', event.request.url);
      });

      // Отдаем кэш сразу (если он есть), а в фоне скачиваем обновления.
      // Если кэша еще нет (первый запуск), ждем ответа от fetchPromise.
      return cachedResponse || fetchPromise;
    })
  );
});