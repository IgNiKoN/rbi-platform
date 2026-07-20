/**
 * settings.actions.js
 * Реальная бизнес-логика модуля настроек (owner-module 'quality.settings').
 * Перенесено 1:1 из settings.legacy.js (удалён). Рендер/DOM-отрисовка —
 * в settings.render.js (window.renderSettingsTab/applySettingsToUI).
 *
 * SettingsActions — фасад для settings.module.js (ctx.settings), методы
 * loadSettings/get/set/renderTab/applyToUI вызывают локальные функции
 * этого же файла напрямую (не делегируют в window.*, кроме renderTab/
 * applyToUI — они резолвятся в settings.render.js).
 */

(function () {
    'use strict';

    // ─── Вспомогательные константы ───────────────────────────────────────────

    var RBI_ALLOWED_THEMES_LOCAL = ['auto', 'light', 'dark', 'rbi-light', 'rbi-dark'];

    // ─── Вспомогательные функции изоляции ────────────────────────────────────

    // Фаза 92: единая точка доступа к IndexedDB через StorageService или fallback
    function _storage() {
        var svc = (window.SettingsActions && window.SettingsActions._ctx && window.SettingsActions._ctx.storage) ||
                  (window.RBI && window.RBI.services && window.RBI.services.storage);
        if (svc) {
            return svc;
        }
        return {
            stores: function() { return typeof window.STORES !== 'undefined' ? window.STORES : {}; },
            get: function(store, key) { return window.dbGet(store, key); },
            put: function(store, data) { return window.dbPut(store, data); }
        };
    }

    function _setGameActionLogs(arr) {
        var svc = (window.SettingsActions && window.SettingsActions._ctx && window.SettingsActions._ctx.game) || window.RBI.services.game;
        return svc.setGameActionLogsSync(arr);
    }

    // Фаза 64: изоляция записи appSettings через SettingsService с fallback
    function _setSetting(key, value) {
        var svc = (window.SettingsActions && window.SettingsActions._ctx && window.SettingsActions._ctx.settings) ||
                  (window.RBI && window.RBI.services && window.RBI.services.settings);
        if (svc) {
            svc.set(key, value);
            return;
        }
        if (window.appSettings) window.appSettings[key] = value;
    }

    // Фаза 141: единая точка чтения настроек через SettingsService или fallback
    function _getSetting(key) {
        var svc = (window.SettingsActions && window.SettingsActions._ctx && window.SettingsActions._ctx.settings) ||
                  (window.RBI && window.RBI.services && window.RBI.services.settings);
        if (svc) {
            return svc.get(key);
        }
        return window.appSettings ? window.appSettings[key] : undefined;
    }

    // ─── Приватные функции ────────────────────────────────────────────────────

    function _rbiGetSavedThemePreference() {
        var value = localStorage.getItem('rbi_theme_preference');
        return RBI_ALLOWED_THEMES_LOCAL.includes(value) ? value : null;
    }

    function _rbiSaveThemePreference(value) {
        var theme = RBI_ALLOWED_THEMES_LOCAL.includes(value) ? value : 'auto';
        localStorage.setItem('rbi_theme_preference', theme);
        return theme;
    }

    async function _loadSettings() {
        try {
            var data = await _storage().get(_storage().stores().SETTINGS, 'user_prefs');
            if (data) Object.assign(window.appSettings, data);

            var savedTheme = _rbiGetSavedThemePreference();

            if (savedTheme) {
                window.appSettings.theme = savedTheme;
            } else if (!RBI_ALLOWED_THEMES_LOCAL.includes(window.appSettings.theme)) {
                window.appSettings.theme = 'auto';
                _rbiSaveThemePreference('auto');
            }

        } catch (e) {
            console.error('Ошибка загрузки настроек', e);
            window.appSettings.theme = _rbiGetSavedThemePreference() || 'auto';
        }
    }

    async function _saveSettings(key, value) {
        if (key === 'theme') {
            value = _rbiSaveThemePreference(value);
        }

        _setSetting(key, value);

        if (typeof window.applySettingsToUI === 'function') window.applySettingsToUI();

        try {
            await _storage().put(_storage().stores().SETTINGS, Object.assign({ key: 'user_prefs' }, window.appSettings));
        } catch (e) {
            console.error('Ошибка сохранения настроек', e);
        }
    }

    function _toggleSetting(settingKey, element) {
        var val = element.type === 'checkbox' ? element.checked : element.value;

        // Режим карточки/список — единая точка входа (сохранение + перерисовка списков)
        var setKbViewMode = window.setKnowledgeViewMode;
        if (settingKey === 'knowledgeViewMode' && typeof setKbViewMode === 'function') {
            setKbViewMode(val);
            return;
        }

        _setSetting(settingKey, val);

        if (settingKey === 'brandColor') {
            _setSetting('isBrandingCustomized', true);
            _saveSettings('isBrandingCustomized', true);
        }

        _saveSettings(settingKey, val);
    }

    function _resetSettingsToDefault() {
        if (!confirm('Сбросить все настройки к значениям по умолчанию?')) return;

        var defaults = {
            userRole: 'engineer',
            cloudStatus: 'offline',
            assignedProjects: [],
            assignedContractor: '',
            contractorName: '',
            theme: 'auto', engineerName: '', defaultProject: '', fontSize: 'medium', navPosition: 'auto', swipeEnabled: false,
            autoCollapseOk: false, defaultGroupsCollapsed: false, fastMode: false,
            soundEnabled: true, autoSave: true, aiEnabled: false, autoCacheCloudFiles: true, pushEnabled: false, storageMode: 'adaptive',
            storageAutoCleanupEnabled: true,
            storageSilentCleanupEnabled: true,
            storageKeepAllIfFreeMB: 2048,
            storageSoftCleanupFreeMB: 1000,
            storageNormalCleanupFreeMB: 500,
            storageCriticalCleanupFreeMB: 250,
            storageSoftThresholdPercent: 60,
            storageCleanupThresholdPercent: 80,
            storageCriticalThresholdPercent: 90,
            storageInspectionPhotoTtlDays: 60,
            storageKnowledgeFileTtlDays: 45,
            storageReportTtlDays: 30,
            storageTwiTtlDays: 90,
            storageNodeTtlDays: 90,
            storagePracticeTtlDays: 60,
            storageDocTtlDays: 60,
            storageCleanupOnlyCloudBackedFiles: true,
            storageLastCleanupAt: null,
            storagePersistentRequestedAt: null,
            storagePersistentGranted: false, aiAuto: false, apiKey: '', dashboardMode: 'compact',
            knowledgeViewMode: 'cards',
            anaEngPareto: true, anaOpTrend: true, anaOpLeader: true, anaEngAi: true, anaEngPhotos: true, anaOpTopDefects: true,
            autoBackupEnabled: false, autoBackupDay: '5', autoBackupShare: false, autoManagerEnabled: false, autoManagerDay: '5',
            brandColor: '#1c2b39', brandLogo: '', autoReportEnabled: false, autoReportDay: '1', autoReportType: 'global_onepager'
        };
        // Мутируем существующий объект, чтобы не разрывать ссылку с app.js (let appSettings)
        Object.keys(window.appSettings).forEach(function (k) { delete window.appSettings[k]; });
        Object.assign(window.appSettings, defaults);
        _rbiSaveThemePreference('auto');
        window.appSettings.theme = 'auto';

        _saveSettings('dummy', 'dummy');
        if (typeof window.renderSettingsTab === 'function') window.renderSettingsTab();
        if (typeof window.applySettingsToUI === 'function') window.applySettingsToUI();

        setTimeout(function () {
            if (typeof window.updateBodyPadding === 'function') window.updateBodyPadding();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.body.classList.remove('modal-open');
        }, 100);

        if (typeof window.showToast === 'function') window.showToast('Настройки сброшены!');
    }

    async function _clearPdfCache() {
        var ok = confirm(
            'Очистить локальный кэш файлов?\n\n' +
            'Будут удалены только локальные копии файлов, которые уже есть в облаке.\n' +
            'Проверки, история, задачи, документы и файлы в Supabase не удаляются.\n\n' +
            'Без интернета очищенные файлы могут быть недоступны, но загрузятся снова при подключении.'
        );

        if (!ok) return;

        if (!window.RbiStorageManager || typeof window.RbiStorageManager.runManualRecoverableCacheCleanup !== 'function') {
            if (typeof window.showToast === 'function') window.showToast('⚠️ Менеджер хранилища не загружен');
            return;
        }

        if (typeof window.showToast === 'function') window.showToast('⏳ Очищаем восстановимый кэш...');
        await window.RbiStorageManager.runManualRecoverableCacheCleanup();
    }

    async function _previewStorageCleanup() {
        if (!window.RbiStorageManager || typeof window.RbiStorageManager.previewAdaptiveStorageCleanup !== 'function') {
            if (typeof window.showToast === 'function') window.showToast('⚠️ Менеджер хранилища не загружен');
            return;
        }

        if (typeof window.showToast === 'function') window.showToast('⏳ Проверяем файловый кэш...');

        var result = await window.RbiStorageManager.previewAdaptiveStorageCleanup('manual_preview');

        if (!result || result.error) {
            if (typeof window.showToast === 'function') window.showToast('❌ Не удалось проверить кэш');
            return;
        }
    }

    // === ОКНО "О ПРИЛОЖЕНИИ" (перенесено 1:1 из settings.legacy.js) ===
    function _showAboutApp() {
        const modal = document.getElementById('modal-overlay');
        document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[14px] flex items-center justify-center border border-slate-200 dark:border-slate-700 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>`;
        document.getElementById('modal-title').innerHTML = `
    <div style="text-align: center;">
        RBI Quality <span class="splash-pro">PRO</span>
    </div>
`;

        document.getElementById('modal-body').innerHTML = `
        <div class="space-y-4 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
            
            <div class="text-center font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                Система управления качеством на основе данных <br> (Data-Driven Quality)
            </div>

            <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-xl shadow-sm">
                <h4 class="font-black text-indigo-800 dark:text-indigo-300 mb-2 uppercase tracking-wider flex items-center gap-1.5"><span class="text-lg"></span> Архитектура и Безопасность</h4>
                <p class="mb-2">Приложение построено по технологии <b>PWA (Progressive Web App)</b> и работает полностью автономно.</p>
                <ul class="list-disc pl-4 space-y-1.5 text-[11px] text-indigo-900 dark:text-indigo-200 mb-3">
                    <li><b>Offline-First:</b> Приложение является "клиентским контейнером". Все проверки, фотографии, PDF-файлы и созданные справочники сохраняются <b>исключительно в изолированной базе данных (IndexedDB) вашего устройства</b>.</li>
                    <li><b>Локальные вычисления:</b> Вся сложная математика, генерация аналитики и сборка PDF-отчетов происходит за счет процессора вашего телефона/ПК. Данные не передаются на сторонние серверы для обработки.</li>
                </ul>
                <div class="bg-white/60 dark:bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-700/50 text-[10px] font-bold leading-snug text-indigo-800 dark:text-indigo-300">
                    🔒 <b>О размещении:</b> Так как это моя личная разработка, приложение базируется на личном сервере <b>rbi-q.ru</b> и не планируется к переносу на иные коммерческие серверы. Это абсолютно безопасно для корпоративного использования, так как сервер отдает только программный "каркас" (HTML/CSS/JS). Демо-данные и встроенные чек-листы скомпилированы из открытых источников (ГОСТ, СП). Реальные коммерческие данные со строек <b>никогда не покидают ваше устройство, без явного согласия и подключения к серверу синхронизации </b>.
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
    <h4 class="font-black text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-1.5">
        <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        Единая экосистема управления качеством жизненного цикла объекта
    </h4>

    <div class="space-y-3 text-[11px]">
        <div>
            <b class="text-slate-900 dark:text-white text-[12px]">1. Контроль качества (RBI Quality):</b><br>
            Осмотр по чек‑листам (B1/B2/B3), эскалация >1,5x, фото с разметкой. Расчёт УрК, ИУрК, ИКО, Impact Score, стабильности подрядчика. Геймификация инженеров (XP, ранги, ачивки), планировщик задач с ИИ.
        </div>
        <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
            <b class="text-slate-900 dark:text-white text-[12px]">2. Стройконтроль (Construction Control):</b><br>
            Иерархия объект → корпус → этаж, привязка PDF‑планов, нанесение дефектов с координатами. Журнал заявок на приёмку работ, выделение зон на плане. Импорт из ПК Стройконтроль, расчёт ИСД, CMI, KPI инженеров СК, AI‑генерация писем прорабам.
        </div>
        <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
            <b class="text-slate-900 dark:text-white text-[12px]">3. Аналитика и отчёты:</b><br>
            Динамические графики (тренды, Парето, тепловые карты), One‑Pager с ИИ‑резюме, QR‑код для публичного доступа. Глобальная сводка по компании, рейтинги подрядчиков и инженеров. Выгрузка в PDF (A3/A4) и Excel, брендирование отчётов.
        </div>
        <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
            <b class="text-slate-900 dark:text-white text-[12px]">4. База знаний (TWI, узлы, НД):</b><br>
            Визуальные стандарты TWI (технадзор / рабочие инструкции / регламенты), технические узлы со спецификациями, справочник ГОСТ/СП с полнотекстовым поиском и AI‑чатом. Лучшие практики и акты‑эталоны, привязка к чек‑листам.
        </div>
        <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
            <b class="text-slate-900 dark:text-white text-[12px]">5. Offline‑синхронизация и ролевая модель:</b><br>
            Полная автономная работа (Offline‑First) с последующей синхронизацией через Supabase. Роли: гость, подрядчик, инженер, руководитель проекта, заместитель, директор, администратор. Разграничение доступа к объектам, данным, функциям (RLS на сервере + клиентская маршрутизация).
        </div>
        <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
            <b class="text-slate-900 dark:text-white text-[12px]">6. Искусственный интеллект (DeepSeek):</b><br>
            Генерация управленческих резюме, прогноз рисков, автозаполнение FMEA и TWI, AI‑чат по нормативной базе, маршрутизация задач, анализ обратной связи. Работает как в онлайн, так и в гибридном режиме.
        </div>
    </div>

    <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 italic">
        ⚙️ В разработке / планах: передача квартир (шахматка + акты), гарантийное обслуживание, охрана труда и безопасность, управляющая компания. Полная цифровизация жизненного цикла объекта.
    </div>
</div>

            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-xl shadow-sm">
                <h4 class="font-black text-amber-800 dark:text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-1.5"><span class="text-lg">🚀</span> Ближайшее развитие (Roadmap)</h4>
                <ul class="list-disc pl-4 text-[11px] text-amber-900 dark:text-amber-200 space-y-1.5">
                    <li><b>Завершение Beta-тестирования:</b> Обкатка приложения на реальных строительных объектах, выявление и исправление "плавающих" багов.</li>
                    <li><b>Глубокая оптимизация:</b> Ускорение рендеринга интерфейса при огромных массивах данных, улучшение алгоритмов сжатия загружаемых фотографий.</li>
                    <li><b>Наполнение Базы Знаний:</b> Масштабная оцифровка нормативной документации (СП, ГОСТ), создание системных чек-листов, библиотеки узлов и эталонных TWI-карт для всех основных видов СМР.</li>
                </ul>
            </div>
            
            <div class="text-center text-[9px] text-slate-400 uppercase tracking-widest font-black mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                Спроектировано и разработано для профессионального управления качеством<br>
            </div>
        </div>
    `;
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    }

    // === ПОЛНАЯ ОЧИСТКА ИСТОРИИ (перенесено 1:1 из settings.legacy.js) ===
    async function _clearHistory() {
        var _ctxLocal = window.SettingsActions && window.SettingsActions._ctx;
        var _permSvc = (_ctxLocal && _ctxLocal.permissions) || window.RBI.services.permissions;
        if (_permSvc && !_permSvc.isAdmin()) {
            return showToast("⛔ Полная очистка истории доступна только администратору или заместителю");
        }
        if (!confirm('Удалить ВСЮ историю проверок? Сами чек-листы и настройки останутся.')) return;

        // Очищаем массивы в памяти и в IndexedDB
        var _inspSvc = (_ctxLocal && _ctxLocal.inspections) || window.RBI.services.inspections;
        var _knowSvc = (_ctxLocal && _ctxLocal.knowledge) || window.RBI.services.knowledge;
        _inspSvc.setAllSync([]);
        _knowSvc.setEtalonActsSync([]);
        await _storage().clear(_storage().stores().HISTORY);
        await _storage().clear(_storage().stores().ETALON_ACTS);

        // Очищаем память умного автозаполнения (чтобы старые подрядчики не вылезали при вводе)
        localStorage.removeItem('smart_input_cache');

        // Очищаем логи геймификации HR
        _setGameActionLogs([]);
        await _storage().put(_storage().stores().GAME_LOGS, { id: 'main', data: [] });

        // Принудительно обновляем все связанные экраны
        if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('history:renderRequested', {});
        if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('analytics:renderRequested', {});
        window.updateDataSummary();

        showToast('🗑️ История проверок полностью очищена');
    }

    // === ПОЛНЫЙ СБРОС ПРИЛОЖЕНИЯ (перенесено 1:1 из settings.legacy.js) ===
    async function _fullFactoryReset() {
        if (!confirm('УДАЛИТЬ ВООБЩЕ ВСЁ?\n\nЭто действие необратимо! Все ваши проверки, настройки, TWI-карты и загруженные документы будут уничтожены. Приложение вернется к первоначальному виду.')) return;

        // Показываем лоадер
        const loader = document.getElementById('global-loader');
        const loaderText = document.getElementById('global-loader-text');
        if (loader && loaderText) {
            loaderText.innerText = "Уничтожение базы данных...";
            loader.style.display = 'flex';
            setTimeout(() => loader.classList.remove('opacity-0'), 10);
        }

        try {
            // 1. Очищаем локальные хранилища
            localStorage.clear();
            sessionStorage.clear();

            // 2. Закрываем активное соединение с БД, чтобы избежать блокировок
            if (typeof window._dbPromise !== 'undefined' && window._dbPromise) {
                try {
                    const db = await window._dbPromise;
                    db.close();
                } catch (e) { }
                window._dbPromise = null;
            }

            // 3. ЖЕСТКО удаляем всю базу данных целиком (самый надежный способ)
            // DB_NAME берется из storage.js ('RBI_QUALITY_DB')
            const req = indexedDB.deleteDatabase(typeof DB_NAME !== 'undefined' ? DB_NAME : 'RBI_QUALITY_DB');

            await new Promise((resolve) => {
                req.onsuccess = resolve;
                req.onerror = resolve; // Игнорируем ошибки, идем дальше
                req.onblocked = () => {
                    console.warn("БД заблокирована другим процессом, браузер удалит ее при перезапуске.");
                    resolve();
                };
            });

            // 4. Очистка кэша PWA (удаление старых файлов)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // 5. Сброс Service Worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            // 6. Перезагрузка страницы со сбросом кэша
            window.location.href = window.location.pathname + '?reset=' + Date.now();

        } catch (e) {
            console.error('Сбой при очистке:', e);
            // Резервный выход: если что-то упало, всё равно чистим LS и перезагружаем
            localStorage.clear();
            window.location.href = window.location.pathname + '?reset=' + Date.now();
        }
    }

    /* RBI NEW: Рендер реестра бэкапов в Настройках (перенесено 1:1 из settings.legacy.js) */
    async function _rbi_renderBackupRegistry() {
        const listEl = document.getElementById('rbi-backup-registry-list');
        if (!listEl) return;

        let logs = [];
        try {
            const logsObj = await _storage().get(_storage().stores().BACKUP_LOGS, 'main');
            if (logsObj && logsObj.data) logs = logsObj.data;
        } catch (e) { }

        if (logs.length === 0) {
            listEl.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-[10px] text-slate-400 italic">Реестр выгрузок пуст</td></tr>`;
            return;
        }

        listEl.innerHTML = logs.map(l => `
        <tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <td class="py-2 pr-2 text-[9px] text-slate-500 whitespace-nowrap">${l.dateStr}</td>
            <td class="py-2 px-2 text-[10px] font-bold text-slate-800 dark:text-slate-200">${l.type}</td>
            <td class="py-2 px-2 text-[9px] text-slate-500 text-center">${l.stats?.checks || 0}</td>
            <td class="py-2 pl-2 text-[8px] text-slate-400 truncate max-w-[80px]" title="${l.fileName}">${l.fileName}</td>
        </tr>
    `).join('');
    }

    // ─── SettingsActions (facade для settings.module.js) ─────────────────────

    var SettingsActions = {

        _ctx: null,

        bindCtx: function (ctx) {
            this._ctx = ctx;
        },

        _getService: function () {
            return (this._ctx && this._ctx.settings) ||
                   (window.RBI && window.RBI.services && window.RBI.services.settings);
        },

        loadSettings: function () {
            return _loadSettings();
        },

        get: function (key) {
            return _getSetting(key);
        },

        set: async function (key, value) {
            return _setSetting(key, value);
        },

        renderTab: function () {
            if (typeof window.renderSettingsTab === 'function') {
                return window.renderSettingsTab();
            }
        },

        applyToUI: function () {
            if (typeof window.applySettingsToUI === 'function') {
                return window.applySettingsToUI();
            }
        }
    };

    window.SettingsActions = SettingsActions;

    // ─── Модуль ───────────────────────────────────────────────────────────────

    var settingsModule = {
        _version: '1.0',
        _name: 'quality.settings',

        init: function () {
            console.log('[RBI Module] quality.settings v2.0 loaded (hard override)');
        },

        mount: function () {
            if (typeof window.renderSettingsTab === 'function') window.renderSettingsTab();
        },

        unmount: function () {
        },

        loadSettings: _loadSettings,
        saveSettings: _saveSettings,
        renderSettingsTab: function () { if (typeof window.renderSettingsTab === 'function') return window.renderSettingsTab(); },
        toggleSetting: _toggleSetting,
        resetSettingsToDefault: _resetSettingsToDefault,
        applySettingsToUI: function () { if (typeof window.applySettingsToUI === 'function') return window.applySettingsToUI(); },
        clearPdfCache: _clearPdfCache,
        previewStorageCleanup: _previewStorageCleanup,
        rbiGetSavedThemePreference: _rbiGetSavedThemePreference,
        rbiSaveThemePreference: _rbiSaveThemePreference
    };

    // ─── Регистрация ──────────────────────────────────────────────────────────

    if (window.RBI && window.RBI.registry) {
        window.RBI.registry.register('quality.settings', settingsModule);
    }

    settingsModule.init();

    // ─── Window-прокси (для вызовов из index.html) ────────────────────────────
    // renderSettingsTab/applySettingsToUI устанавливаются в settings.render.js.

    window.loadSettings = _loadSettings;
    window.saveSettings = _saveSettings;
    window.toggleSetting = _toggleSetting;
    window.resetSettingsToDefault = _resetSettingsToDefault;
    window.clearPdfCache = _clearPdfCache;
    window.previewStorageCleanup = _previewStorageCleanup;
    window.rbiGetSavedThemePreference = _rbiGetSavedThemePreference;
    window.rbiSaveThemePreference = _rbiSaveThemePreference;
    window.showAboutApp = _showAboutApp;
    window.clearHistory = _clearHistory;
    window.fullFactoryReset = _fullFactoryReset;
    window.rbi_renderBackupRegistry = _rbi_renderBackupRegistry;

    console.log('[SettingsActions] settings.actions.js loaded (real logic, v2.0)');
}());

export const SettingsActions = window.SettingsActions;
