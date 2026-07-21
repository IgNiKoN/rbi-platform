/* Файл: sw.js */
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
const APP_VERSION = '18.57.0';
const SW_VERSION = '18.57.130';
const CACHE_NAME = `rbi-quality-v${SW_VERSION}`;

// 1. ПРЕ-КЭШ: Локальные файлы и ВНЕШНИЕ БИБЛИОТЕКИ (для 100% офлайна)
const urlsToCache = [
  './',
  './index.html',
  './report.html',
  './css/style.css',
  './data/system_docs.js',
  './data/system_nodes.js',
  './data/system_twi.js',
  './js/shared/template.utils.js',
  './data/system_templates.js',
  './js/modules/construction/features/construction-core.js',
  './js/modules/construction/features/defect-form.js',
  './js/modules/construction/features/pdf-viewer.js',
  './js/modules/construction/features/admin.js',
  './js/modules/construction/features/acceptance.js',
  './js/modules/construction/features/transfer.js',
  './js/core/router.js',
  './js/core/views.js',
  './js/services/config.service.js',
  './libs/tailwindcdn.js',
  './libs/chart.umd.min.js',
  './libs/xlsx.full.min.js',
  './libs/html2pdf.bundle.min.js',
  './libs/pdfjs/pdf.min.js',
  './libs/pdfjs/pdf.worker.min.js',
  './libs/qrcode.min.js',
  './libs/panzoom.min.js',
  './libs/Sortable.min.js',
  './libs/supabase-js.min.js',
  './js/services/sync/sync-core.state.js',
  './js/services/sync/sync-cloud-prepare.utils.js',
  './js/services/sync/sync-auth.js',
  './js/services/sync/sync-ui.render.js',
  './js/services/sync/sync-connection.actions.js',
  './js/services/sync/sync-push-pull.core.js',
  './js/services/sync/sync-engine.core.js',
  './js/services/sync/sync-post-actions.js',
  './js/services/storage/storage-db.core.js',
  './js/services/storage/storage-converters.utils.js',
  './js/services/storage/storage-cache-manager.js',
  './js/services/storage/storage-diagnostics.render.js',
  './js/services/storage/storage-photo-manager.js',
  './js/services/storage/storage-file-queue.actions.js',
  './js/shared/math.utils.js',
  './js/shared/toast.utils.js',
  './js/shared/smart-input.utils.js',
  './js/shared/photo-editor.utils.js',
  './js/shared/photo-viewer-zoom.utils.js',
  './js/shared/splash-screen.utils.js',
  './js/shared/pwa-update.utils.js',
  './js/shared/fab-export.utils.js',
  './js/shared/layout.utils.js',
  './js/shared/notify.utils.js',
  './js/shared/error-log.utils.js',
  './js/shared/touch-gestures.utils.js',
  './js/shared/snake-game.utils.js',
  './js/core/bootstrap.js',
  './js/core/app-shell.js',

  // Ядро модульной архитектуры
  './js/core/rbi-core.js',
  './js/core/app.entry.js',
  './js/core/module-loader.js',
  './js/modules/modules.manifest.js',

  // Сервисы
  './js/services/storage.service.js',
  './js/services/permission.service.js',
  './js/services/sync.service.js',
  './js/services/inspection.service.js',
  './js/services/file.service.js',
  './js/services/report.service.js',
  './js/services/contractor-directory.service.js',
  './js/services/contractor-metrics.service.js',
  './js/services/object-directory.service.js',
  './js/services/task.service.js',
  './js/services/sk.service.js',
  './js/services/game.service.js',
  './js/services/knowledge.service.js',
  './js/services/analytics.service.js',

  // Фаза 21 — AI Service
  './js/services/ai.service.js',

  // Фаза 22/23 — Master Data Service
  './js/services/masterData.service.js',

  // Фаза 29 — Template Service
  './js/services/template.service.js',

  // Фаза 8 — Settings
  './js/services/settings.service.js',
  './js/services/app-mode.service.js',
  './js/services/company.service.js',
  './js/services/user-context.service.js',
  './js/services/session.service.js',
  './js/modules/quality/features/settings/settings.manifest.js',
  './js/modules/quality/features/settings/settings.render.js',
  './js/modules/quality/features/settings/settings.actions.js',
  './js/modules/quality/features/settings/settings.module.js',
  './js/modules/quality/features/settings/features/tutorial.js',
  './js/modules/quality/features/settings/features/app-mode-utils.js',
  './js/modules/quality/features/settings/features/changelog.js',
  './js/modules/quality/features/settings/features/feedback.js',
  './js/modules/quality/features/settings/index.js',

  // Фаза 9 — Knowledge Module
  './js/modules/quality/features/knowledge/knowledge.manifest.js',
  './js/modules/quality/features/knowledge/knowledge.module.js',
  './js/modules/quality/features/knowledge/knowledge.state.js',
  './js/modules/quality/features/knowledge/knowledge.actions.js',
  './js/modules/quality/features/knowledge/knowledge.render.js',
  './js/modules/quality/features/knowledge/features/faq.js',
  './js/modules/quality/features/knowledge/index.js',

  // Фаза 10 — Tasks Module
  './js/modules/quality/features/tasks/tasks.module.js',
  './js/modules/quality/features/tasks/tasks.state.js',
  './js/modules/quality/features/tasks/tasks.actions.js',
  './js/modules/quality/features/tasks/tasks.render.js',

  // Фаза 11 — Analytics Module
  './js/modules/quality/features/analytics/analytics.module.js',
  './js/modules/quality/features/analytics/analytics.state.js',
  './js/modules/quality/features/analytics/analytics.actions.js',
  './js/modules/quality/features/analytics/analytics.render.js',

  // Фаза 12 — History Module
  './js/modules/quality/features/history/history.module.js',
  './js/modules/quality/features/history/history.state.js',
  './js/modules/quality/features/history/history.actions.js',
  './js/modules/quality/features/history/history.render.js',
  './js/modules/quality/features/shared/multi-filter.js',
  './js/modules/quality/features/reference/reference.js',

  // Фаза 13 — SK Module
  './js/modules/quality/features/sk/sk.module.js',
  './js/modules/quality/features/sk/sk.state.js',
  './js/modules/quality/features/sk/sk.actions.js',
  './js/modules/quality/features/sk/sk.render.js',
  './js/modules/quality/features/sk/sk.manifest.js',
  './js/modules/quality/features/sk/index.js',

  // Фаза 14 — Audit Module
  './js/modules/quality/features/audit/audit.module.js',
  './js/modules/quality/features/audit/audit.state.js',
  './js/modules/quality/features/audit/audit.actions.js',
  './js/modules/quality/features/audit/audit.render.js',

  // Фаза 15 — Construction Module
  './js/modules/construction/construction.module.js',
  './js/modules/construction/construction.state.js',
  './js/modules/construction/construction.actions.js',
  './js/modules/construction/construction.render.js',
  './js/modules/construction/construction.manifest.js',
  './js/modules/construction/index.js',

  // Фаза 16 — Reports Module
  './js/modules/quality/features/reports/reports.module.js',
  './js/modules/quality/features/reports/reports.state.js',
  './js/modules/quality/features/reports/reports.actions.js',
  './js/modules/quality/features/reports/reports.render.js',

  // Фаза 17 — Game Module
  './js/modules/quality/features/gamification/game.module.js',
  './js/modules/quality/features/gamification/game.state.js',
  './js/modules/quality/features/gamification/game.actions.js',
  './js/modules/quality/features/gamification/game.render.js',
  './js/modules/quality/features/gamification/game.manifest.js',
  './js/modules/quality/features/gamification/index.js',

  // Фаза 18 — Etalon Module
  './js/modules/quality/features/etalon/etalon.module.js',
  './js/modules/quality/features/etalon/etalon.state.js',
  './js/modules/quality/features/etalon/etalon.actions.js',
  './js/modules/quality/features/etalon/etalon.render.js',
  './js/modules/quality/features/etalon/etalon-v18.render.js',
  './js/modules/quality/features/etalon/etalon-v18.actions.js',
  './js/modules/quality/features/etalon/etalon-v18b.render.js',
  './js/modules/quality/features/etalon/etalon-v18b.actions.js',
  './js/modules/quality/features/etalon/etalon-v18b.frame.html',

  // Фаза 19 — AI Module
  './js/modules/quality/features/ai/ai.module.js',
  './js/modules/quality/features/ai/ai.state.js',
  './js/modules/quality/features/ai/ai.actions.js',
  './js/modules/quality/features/ai/ai.render.js',
  './js/modules/quality/features/ai/ai.manifest.js',
  './js/modules/quality/features/ai/index.js',

  // Фаза 20 — Engineer Module
  './js/modules/quality/features/engineer/engineer.module.js',
  './js/modules/quality/features/engineer/engineer.state.js',
  './js/modules/quality/features/engineer/engineer.actions.js',
  './js/modules/quality/features/engineer/engineer.render.js',

  // Блок 29 — Schedule Module (Wrapper, Шаг 1/10)
  './js/modules/quality/features/schedule/schedule.module.js',
  './js/modules/quality/features/schedule/schedule.state.js',
  './js/modules/quality/features/schedule/schedule.actions.js',
  './js/modules/quality/features/schedule/schedule.render.js',

  // Step 32 — Meetings Module (Wrapper, Шаг 1/10)
  './js/modules/quality/features/meetings/meetings.module.js',
  './js/modules/quality/features/meetings/meetings.state.js',
  './js/modules/quality/features/meetings/meetings.actions.js',
  './js/modules/quality/features/meetings/meetings.render.js',
  './js/modules/quality/features/meetings/meetings.protocol.js',

  // Compact Module Restructure, шаг 1 — агрегирующий platform module quality
  './js/modules/quality/manifest.js',
  './js/modules/quality/index.js',
  './js/modules/quality/quality.module.js',
  './js/modules/quality/features/interventions.js',

  // Модули (legacy)
  './manifest.webmanifest',
  // Шрифты Inter (интерфейс)
  './fonts/Inter-Regular.woff2',
  './fonts/Inter-Medium.woff2',
  './fonts/Inter-SemiBold.woff2',
  './fonts/Inter-Bold.woff2',
  './fonts/Inter-ExtraBold.woff2',
  './fonts/Inter-Black.woff2',

  // Шрифты Playfair Display (PDF – заголовки)
  './fonts/PlayfairDisplay-Regular.woff2',
  './fonts/PlayfairDisplay-Italic.woff2',
  './fonts/PlayfairDisplay-Medium.woff2',
  './fonts/PlayfairDisplay-MediumItalic.woff2',
  './fonts/PlayfairDisplay-SemiBold.woff2',
  './fonts/PlayfairDisplay-SemiBoldItalic.woff2',
  './fonts/PlayfairDisplay-Bold.woff2',
  './fonts/PlayfairDisplay-BoldItalic.woff2',
  './fonts/PlayfairDisplay-ExtraBold.woff2',
  './fonts/PlayfairDisplay-ExtraBoldItalic.woff2',
  './fonts/PlayfairDisplay-Black.woff2',
  './fonts/PlayfairDisplay-BlackItalic.woff2',

  // Шрифты Bricolage Grotesque (PDF – основной текст)
  './fonts/BricolageGrotesque-Light.woff2',
  './fonts/BricolageGrotesque-Regular.woff2',
  './fonts/BricolageGrotesque-Medium.woff2',
  './fonts/BricolageGrotesque-SemiBold.woff2',
  './fonts/BricolageGrotesque-Bold.woff2',
  './fonts/BricolageGrotesque-ExtraBold.woff2'
];

// 2. УСТАНОВКА: Безопасное скачивание файлов в память
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Кэшируем ядро и библиотеки...');
      // Безопасное кэширование: если одна ссылка недоступна, остальные всё равно скачаются
      return Promise.all(

        urlsToCache.map(url => {

          // cache: 'reload' — принудительно обходит HTTP-кэш браузера (критично для
          // iOS Safari: без этого fetch() мог вернуть старую версию файла из
          // собственного кэша WebKit, даже если Cache API уже создаёт новую версию
          // кэша под новым CACHE_NAME — из-за этого получалась смесь старых и новых
          // файлов внутри "новой" версии и визуальные артефакты после обновления).
          return fetch(url, { cache: 'reload' })

            .then(response => {

              if (
                response &&
                response.status === 200
              ) {

                return cache.put(
                  url,
                  response.clone()
                );

              }

            })

            .catch(err => {

              console.log(
                '[SW] Ошибка кэширования:',
                url,
                err
              );

            });

        })

      );
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

// ==========================================
// PUSH УВЕДОМЛЕНИЯ
// ==========================================

// Слушаем приход Push-уведомления с сервера
self.addEventListener('push', function (event) {
  // Если сервер прислал данные, берем их. Иначе ставим заглушку.
  const data = event.data ? event.data.json() : { title: 'RBI Quality', body: 'У вас новое уведомление' };

  const options = {
    body: data.body,
    icon: './icons/icon-512-2.png',
    badge: './icons/icon-512-2.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/' // Ссылка, куда перейти при клике
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Слушаем клик пользователя по уведомлению
self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Закрываем уведомление

  // Открываем приложение по ссылке из уведомления
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// ==========================================
// ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ КЭША
// ==========================================
self.addEventListener('message', (event) => {
  // Если получаем команду SKIP_WAITING от кнопки "Обновить" в интерфейсе
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting(); // Заставляем новый Service Worker немедленно взять управление на себя
  }
});