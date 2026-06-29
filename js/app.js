/* Файл: js/app.js (БЛОК 1: Ядро, Настройки, История, Справочник) */

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let state = {};
let details = {};
let photos = {};
window.photos = photos;

function assignPhotosMap(next) {
    const src = next || {};
    Object.keys(photos).forEach((k) => delete photos[k]);
    Object.assign(photos, src);
    window.photos = photos;
}
let contractorArray = [];
let etalonActsArray = []; // НОВОЕ: Отдельный массив для эталонов
let userTemplates = {};
let reportsArray = []; // Массив для PDF-отчетов
let currentTemplateKey = '';
let currentChecklist = [];
window.activeTaskId = null; // Глобальная переменная для отслеживания текущей выполняемой задачи
let currentPhotoId = null;
let chartInstances = {};
let customExpertConclusions = {};
window.twiOwnerFilter = 'ALL'; // Глобальный фильтр для TWI карт
window.nodeOwnerFilter = 'ALL'; // Глобальный фильтр для Узлов
window.docOwnerFilter = 'ALL';
window.practiceOwnerFilter = 'ALL';
// Состояние мульти-фильтров
let activeMultiFilters = {
    history: { project: [], contractor: [], inspector: [] },
    analytics: { project: [], contractor: [], inspector: [], template: [] }
};
let currentFilterContext = ''; // 'history' или 'analytics'
let currentFilterType = '';    // 'project', 'contractor' и т.д.
let auditOriginalData = null; // Для перекрестного аудита (сравнение двух проверок)

// Переменные зума фото
let currentZoom = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;

// Демо-режим
// Демо-режим и резервные хранилища реальных данных
let isDemoMode = false;
// "Сейфы" для реальных данных
let realState = {}, realDetails = {}, realPhotos = {}, realContractorArray = [], realTemplateKey = '';
let real_rbi_tasksData = [], real_weeklyPlanData = {}, real_gameActionLogs = [];
let real_rbi_meetingsData = [], real_rbi_interventionsData = [], real_rbi_practicesData = [];
let realTwiCards = [], realCustomDocs = [], realCustomNodes = [];
window.rbi_feedbackData = [];
let realFeedbackData = [];
// Новые сейфы
let real_skRecords = [], real_skVolumes = {}, real_skContractorMap = {};
let real_rbi_fmeaRecords = [], real_rbi_scheduleData = [];

// Настройки приложения (v16.0)
let appSettings = {
    userRole: 'engineer', // Локально по умолчанию работаем как инженер
    cloudStatus: 'offline', // offline / pending / approved / blocked
    assignedProjects: [], // Закрепленные объекты: canonical_key
    assignedContractor: '',
    brandColor: '#1c2b39', // Темно-синий RBI
    brandLogo: '', // Логотип (Base64)
    autoReportEnabled: false, // Фоновые отчеты
    autoReportDay: '1', // Число месяца
    autoReportType: 'global_onepager', // Тип отчета
    contractorName: '',
    theme: 'auto',
    engineerName: '',
    defaultProject: '',
    fontSize: 'medium',
    navPosition: 'auto',
    swipeEnabled: false,
    autoCollapseOk: false,
    defaultGroupsCollapsed: false,
    fastMode: false,
    soundEnabled: true,
    autoSave: true,
    pushEnabled: false,
    aiEnabled: false,
    autoCacheCloudFiles: true, // автоматически сохранять облачные файлы в офлайн-кэш после синхронизации
    // RBI NEW: адаптивное управление файловым кэшем
    storageMode: 'adaptive',

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
    storagePersistentGranted: false,
    aiAuthMode: 'role', // 'role', 'corporate', 'personal'
    aiCorpPwd: '',
    aiAuto: false,
    apiKey: '',
    dashboardMode: 'compact',
    anaEngPareto: true,
    anaOpTrend: true,
    anaOpLeader: true,
    anaEngAi: true,
    anaEngPhotos: true,
    anaOpTopDefects: true,
    autoBackupEnabled: false,
    autoBackupDay: '5', // 5 - Пятница
    autoBackupShare: false,
    autoManagerEnabled: false,
    autoManagerDay: '5', // 5 - Пятница
    taskMeetingDay: '1',      // Понедельник
    taskFmeaDay: '5',         // Пятница
    taskMonthReportDay: '1'   // 1-е число месяца
};
const RBI_ALLOWED_THEMES = ['auto', 'light', 'dark', 'rbi-light', 'rbi-dark'];

function rbiGetSavedThemePreference() {
    const value = localStorage.getItem('rbi_theme_preference');
    return RBI_ALLOWED_THEMES.includes(value) ? value : null;
}

function rbiSaveThemePreference(value) {
    const theme = RBI_ALLOWED_THEMES.includes(value) ? value : 'auto';
    localStorage.setItem('rbi_theme_preference', theme);
    return theme;
}
// Универсальный помощник для статусов синхронизации
window.setSyncStatus = function (record, status, reason = '') {
    record.source = status === 'synced' ? 'cloud' : 'local';
    record.syncStatus = status;
    record.sync_status = status;
    record.syncBlockReason = reason;
    record.sync_block_reason = reason;
    return record;
};



// RBI NEW: безопасная подстановка local:// / cloud:// фото в интерфейсе
window.rbiPhotoPlaceholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
</svg>
`);

window.rbiPhotoCloudPlaceholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="45%" text-anchor="middle" fill="#64748b" font-size="22" font-family="Arial" font-weight="700">
        Файл очищен с устройства
    </text>
    <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-size="16" font-family="Arial">
        Подключитесь к интернету для загрузки из облака
    </text>
</svg>
`);

window.rbiEscapeAttr = function (value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

window.rbiHydrateLocalImages = async function (root = document) {
    if (typeof PhotoManager === 'undefined' || typeof PhotoManager.getAsyncUrl !== 'function') return;

    const scope = root || document;
    const imgs = Array.from(scope.querySelectorAll('img[data-local-src]'));

    for (const img of imgs) {
        const src = img.getAttribute('data-local-src');
        if (!src) continue;

        try {
            const realUrl = await PhotoManager.getAsyncUrl(src);

            if (
                realUrl &&
                !String(realUrl).startsWith('local://') &&
                !String(realUrl).startsWith('cloud://')
            ) {
                img.src = realUrl;
                img.removeAttribute('data-local-src');
                continue;
            }

            img.src = window.rbiPhotoCloudPlaceholder || window.rbiPhotoPlaceholder || img.src;

        } catch (e) {
            img.src = window.rbiPhotoCloudPlaceholder || window.rbiPhotoPlaceholder || img.src;
        }
    }
};

// Звуковые эффекты (base64 для офлайна)
const audioOk = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
const audioFail = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
// (В реале сюда можно вставить короткие base64 писки, сейчас они просто заглушки, чтобы не было ошибки)

// Таймер для дебаунса сохранений (оптимизация)
let __saveSessionTimer = null;
// --- Глобальный отлов ошибок для разработчика ---
async function sendErrorLogToCloud(message, stack) {
    // ЗАЩИТА: Если нет интернета - не пытаемся отправить ошибку, иначе будет бесконечный цикл
    if (!navigator.onLine || !window.supabaseClient || !window.syncConfig || !window.syncConfig.enabled) return;
    try {
        // Оборачиваем объект в массив [] - это надежнее для Supabase
        await window.supabaseClient.from('rbi_error_logs').insert([{
            device_id: window.syncConfig.deviceId,
            project_code: window.syncConfig.projectCode || 'N/A',
            message: String(message).slice(0, 300),
            stack: String(stack || '').slice(0, 500),
            app_version: 'v17.8.188',
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error('Ошибка записи лога', e); }
}

// Ловим ошибки промисов (асинхронные)
window.addEventListener('unhandledrejection', event => {
    const msg = String(event.reason?.message || event.reason || '');
    const stack = String(event.reason?.stack || '');
    
    // Игнорируем фоновые ошибки от расширений Chrome (AdBlock, Adobe, VPN и т.д.)
    if (msg.includes('message channel closed') || stack.includes('chrome-extension://')) return;
    
    sendErrorLogToCloud(msg, stack);
});

// Ловим обычные ошибки интерфейса (синхронные)
window.addEventListener('error', event => {
    const msg = String(event.message || '');
    const stack = String(event.error?.stack || '');
    const filename = String(event.filename || '');
    
    // Игнорируем чужой код плагинов (чтобы не засорять консоль и нашу базу)
    if (filename.includes('chrome-extension://') || 
        msg.includes('showOneChild') || 
        msg.includes('ActionableCoachmark')) {
        return;
    }

    sendErrorLogToCloud(msg, stack);
});
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // --- НОВОЕ: Автоматическая синхронизация при появлении интернета ---
        window.addEventListener('online', () => {
            if (window.syncConfig && window.syncConfig.enabled) {
                if (typeof showToast === 'function') showToast("🌐 Интернет восстановлен. Синхронизируем...");
                if (typeof triggerSync === 'function') triggerSync('silent');
            }
        });
        // -------------------------------------------------------------------
        
        // Мгновенное сохранение черновика при сворачивании браузера / переключении вкладок
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (typeof saveSessionData === 'function') saveSessionData();
            }
        });

        // -------------------------------------------------------------------
        // Запускаем облако до загрузки остальных настроек
        if (typeof initSync === 'function') await initSync();
        if (
            window.syncConfig &&
            window.syncConfig.enabled &&
            !localStorage.getItem('rbi_sync_last_pull_at')
        ) {
            localStorage.setItem('rbi_force_full_pull', '1');
            localStorage.setItem('rbi_cloud_dirty', '1');

            setTimeout(() => {
                if (typeof triggerSync === 'function') triggerSync('manual');
            }, 1500);
        }

        await loadSettings();
        applySettingsToUI();

        // РАДАР ВЫСОТЫ ШАПКИ
        const headerEl = document.getElementById('main-header');
        window.addEventListener('resize', updateBodyPadding);

        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 50 && currentScroll > lastScroll) {
                if (headerEl) headerEl.classList.add('header-collapsed');
            } else if (currentScroll < 50) {
                if (headerEl) headerEl.classList.remove('header-collapsed');
            }
            lastScroll = currentScroll;
        }, { passive: true });

        // ИСПРАВЛЕНИЕ: Правильная загрузка ВСЕХ созданных шаблонов из базы
        const storedTmpls = await dbGetAll(STORES.TEMPLATES);
        if (storedTmpls && storedTmpls.length > 0) {
            userTemplates = {};
            storedTmpls.forEach(t => { userTemplates[t.slug] = t.data; });
        } else {
            userTemplates = JSON.parse(localStorage.getItem('rbi_audit_user_templates_ent_v12') || '{}');
        }

        renderSelector();
        await restoreSession();
        // RBI NEW: мягкий запуск менеджера хранилища
        try {
            if (window.RbiStorageManager) {
                await window.RbiStorageManager.requestPersistentStorageOnce();
                await window.RbiStorageManager.syncFileRegistryFromCloud();

                if (typeof window.RbiStorageManager.backfillLocalFileRegistryCache === 'function') {
                    await window.RbiStorageManager.backfillLocalFileRegistryCache();
                }

                setTimeout(async () => {
                    try {
                        if (
                            window.RbiStorageManager &&
                            typeof window.RbiStorageManager.getStorageSnapshot === 'function' &&
                            typeof window.RbiStorageManager.runAdaptiveStorageCleanup === 'function'
                        ) {
                            const snap = await window.RbiStorageManager.getStorageSnapshot();

                            if (snap && snap.mode && snap.mode !== 'keep_all') {
                                window.RbiStorageManager.runAdaptiveStorageCleanup('app_start');
                            }
                        }
                    } catch (e) {
                        console.warn('[StorageManager] Ошибка мягкой проверки памяти при старте:', e);
                    }
                }, 3000);
            }
        } catch (e) {
            console.warn('[StorageManager] Ошибка запуска:', e);
        }
        // Загрузка фидбека из новой таблицы
        const storedFb = await dbGetAll(STORES.FEEDBACK_LIST);
        if (storedFb) window.rbi_feedbackData = storedFb.filter(f => !f._deleted);
        if (typeof rbi_renderFeedbackTab === 'function') rbi_renderFeedbackTab();

        if (!currentTemplateKey) {
            document.getElementById('empty-checklist-state').style.display = 'block';
            document.getElementById('audit-items').style.display = 'none';
            document.getElementById('audit-actions').style.display = 'none';
        } else {
            document.getElementById('empty-checklist-state').style.display = 'none';
            document.getElementById('audit-items').style.display = 'block';
            document.getElementById('audit-actions').style.display = 'grid';
            if (typeof render === 'function') render();
        }

        setupNavigation();
        initHorizontalMouseScroll();
        // ОПТИМИЗАЦИЯ: Ленивая загрузка фото через IntersectionObserver и легкий MutationObserver
        // ОПТИМИЗАЦИЯ: Умная ленивая загрузка фото без утечек памяти
        let localImgObserver = null;

        function initImageObserver() {
            if (localImgObserver) localImgObserver.disconnect(); // Убиваем старого наблюдателя, чтобы не текла память

            localImgObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(async entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-local-src');
                        if (src) {
                            observer.unobserve(img); // Перестаем следить после загрузки
                            const realUrl = await PhotoManager.getAsyncUrl(src);
                            if (realUrl) {
                                img.src = realUrl;
                                img.removeAttribute('data-local-src');
                            }
                        }
                    }
                });
            }, { rootMargin: "200px" });
        }

        initImageObserver();

        let imgDebounceTimer = null;
        const domObserver = new MutationObserver((mutations) => {
            let hasNewNodes = false;
            for (let i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) {
                    hasNewNodes = true; break;
                }
            }
            if (hasNewNodes) {
                clearTimeout(imgDebounceTimer);
                imgDebounceTimer = setTimeout(() => {
                    initImageObserver(); // Перезапускаем чистого наблюдателя

                    const imgs = Array.from(document.querySelectorAll(
                        'img[src^="local://"]:not([data-local-src]), img[src^="cloud://"]:not([data-local-src])'
                    )).filter(img => !img.closest('[data-no-observe]'));

                    for (let i = 0; i < imgs.length; i++) {
                        const img = imgs[i];
                        img.setAttribute('data-local-src', img.src);
                        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="100%" height="100%" fill="%23f1f5f9"/></svg>';
                        localImgObserver.observe(img);
                    }
                }, 150);
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
        // <-- ВСТАВКА: Принудительно отрисовываем тумблеры после загрузки всех данных
        setTimeout(() => {
            if (typeof renderSettingsTab === 'function') renderSettingsTab();
        }, 500);
    } catch (error) { console.error("Ошибка при загрузке:", error); }
});

// === СОХРАНЕНИЕ И ВОССТАНОВЛЕНИЕ СЕССИИ ===
function scheduleSessionSave() {
    // Помечаем, что есть локальные изменения.
    // sync.js отправит их в Supabase только при включенном облаке.
    localStorage.setItem('rbi_cloud_dirty', '1');

    clearTimeout(__saveSessionTimer);
    __saveSessionTimer = setTimeout(() => {
        saveSessionData();
    }, 500);
}

function getSessionPhotosForSync() {
    const sessionPhotos = {};
    Object.keys(photos || {}).forEach((key) => {
        if (String(key).startsWith('def_')) return;
        sessionPhotos[key] = photos[key];
    });
    return sessionPhotos;
}

async function saveSessionData() {
    if (isDemoMode) return;
    try {
        await dbPut(STORES.STATE, {
            key: 'current_session',
            timestamp: Date.now(), // <-- КРИТИЧЕСКИ ВАЖНО ДЛЯ БЕСШОВНОЙ РАБОТЫ МЕЖДУ ПК И ТЕЛЕФОНОМ
            templateKey: currentTemplateKey,
            project: document.getElementById('inp-project') ? document.getElementById('inp-project').value : '',
            inspector: document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value : '',
            contractor: document.getElementById('inp-contractor') ? document.getElementById('inp-contractor').value : '',
            location: document.getElementById('inp-location') ? document.getElementById('inp-location').value : '',
            state, details, photos: getSessionPhotosForSync(),
            customExpertConclusions
        });
    } catch (e) {
        console.error('Ошибка сохранения в IndexedDB:', e);
        showToast('⚠️ Ошибка автосохранения!');
    }
}

async function restoreSession() {
    try {
        const data = await dbGet(STORES.STATE, 'current_session');
        const hist = await dbGetAll(STORES.HISTORY);

        let fullHistory = hist || [];

        // ЖЕСТКАЯ ОЧИСТКА: Убираем Эталоны из массива Истории
        contractorArray = fullHistory.filter(i => !i._deleted && i.templateKey !== 'sys_etalon_act');

        // Удаляем их физически из базы Истории, если они туда затесались
        const etalonsInHistory = fullHistory.filter(i => i.templateKey === 'sys_etalon_act');
        if (etalonsInHistory.length > 0) {
            for (let e of etalonsInHistory) {
                await dbDelete(STORES.HISTORY, e.id);
            }
            console.log(`[Очистка] Удалено ${etalonsInHistory.length} эталонов из Истории`);
        }

        // Загружаем эталоны в СВОЙ отдельный массив
        const etalons = await dbGetAll(STORES.ETALON_ACTS);
        etalonActsArray = (etalons || []).filter(i => !i._deleted);
        // Загружаем сохраненные PDF-отчеты
        const reports = await dbGetAll(STORES.REPORTS);
        reportsArray = (reports || []).filter(i => !i._deleted);

        // НОВОЕ: Инициализируем кэш и запускаем миграцию
        await PhotoManager.init();
        if (!localStorage.getItem('photo_migration_v1_done')) {
            await runPhotoMigration(contractorArray);
            localStorage.setItem('photo_migration_v1_done', '1');
        }

        if (!data) return;

        if (data.templateKey) currentTemplateKey = data.templateKey;

        if (currentTemplateKey) {
            const type = currentTemplateKey.split('_')[0];
            const key = currentTemplateKey.slice(type.length + 1);
            if (type === 'sys' && SYSTEM_TEMPLATES[key]) currentChecklist = SYSTEM_TEMPLATES[key].groups;
            else if (type === 'user' && userTemplates[key]) currentChecklist = userTemplates[key].groups;
        }

        state = data.state || {};
        details = data.details || {};
        assignPhotosMap(data.photos);
        customExpertConclusions = data.customExpertConclusions || {};

        // НОВОЕ: Распаковываем фото в незаконченном черновике, если они там есть
        for (let k in photos) {
            if (photos[k] && photos[k].startsWith('local://')) {
                photos[k] = await PhotoManager.getBlobUrl(photos[k]) || photos[k];
            }
        }

        if (currentTemplateKey && document.getElementById('checklist-selector')) {
            document.getElementById('checklist-selector').value = currentTemplateKey;
        }

        if (document.getElementById('inp-project')) document.getElementById('inp-project').value = data.project || '';
        if (document.getElementById('inp-inspector')) document.getElementById('inp-inspector').value = data.inspector || '';
        if (document.getElementById('inp-contractor')) document.getElementById('inp-contractor').value = data.contractor || '';
        if (document.getElementById('inp-section')) document.getElementById('inp-section').value = data.section || '';
        if (document.getElementById('inp-floor')) document.getElementById('inp-floor').value = data.floor || '';
        if (document.getElementById('inp-room')) document.getElementById('inp-room').value = data.room || '';

        updateLocationFromStructured(); // Пересчитываем скрытый inp-location
        applySmartLocks(); // Применяем замки после загрузки сессии

        if (typeof updateDataSummary === 'function') updateDataSummary();

        // ПРИНУДИТЕЛЬНЫЙ РЕНДЕР АНАЛИТИКИ (ЕСЛИ МЫ НА ЭТОЙ ВКЛАДКЕ ПОСЛЕ F5)
        const activeTab = document.querySelector('.view-section.active');
        if (activeTab && activeTab.id === 'tab-analytics' && typeof renderCurrentAnalyticsTab === 'function') {
            renderCurrentAnalyticsTab();
        }
    } catch (e) {
        console.error('Ошибка восстановления:', e);
    }
    // Принудительный сброс фильтров удален, чтобы у админа всегда было "Все объекты"
    updateAllDynamicFilters();
    setTimeout(() => {
        if (typeof checkScheduledBackups === 'function') checkScheduledBackups();
        if (typeof checkAutoReports === 'function') checkAutoReports(); // <-- ДОБАВИЛИ
    }, 2000);
}

// === УМНАЯ СТРУКТУРИРОВАННАЯ ЛОКАЦИЯ ===
// === НАЧАЛО ЗАМЕНЫ 1 (УМНАЯ ЛОКАЦИЯ) ===
function updateLocationFromStructured() {
    const secInput = document.getElementById('inp-section');
    const floorInput = document.getElementById('inp-floor');
    const roomInput = document.getElementById('inp-room');
    const locHidden = document.getElementById('inp-location');
    if (!secInput || !floorInput || !roomInput || !locHidden) return;

    let parts = [];

    let secVal = secInput.value.trim();
    if (secVal) {
        // НОВАЯ ЛОГИКА: "1" -> "Корпус 1", "1/2" -> "Корпус 1, секция 2"
        let slashMatch = secVal.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (slashMatch) {
            parts.push(`Корпус ${slashMatch[1]}, секция ${slashMatch[2]}`);
        } else if (/^\d+$/.test(secVal)) {
            parts.push(`Корпус ${secVal}`);
        } else if (/^[\dА-Яа-яA-Za-z]+$/.test(secVal) && !secVal.toLowerCase().includes('корпус')) {
            parts.push(`Корпус ${secVal}`);
        } else {
            parts.push(secVal);
        }
    }

    let floorVal = floorInput.value.trim();
    if (floorVal) {
        if (/^-?\d+$/.test(floorVal)) parts.push(`Этаж ${floorVal}`);
        else parts.push(floorVal);
    }

    let roomVal = roomInput.value.trim();
    if (roomVal) {
        if (isNaN(roomVal) && !roomVal.toLowerCase().includes('оси') && !roomVal.toLowerCase().includes('пом')) {
            parts.push(`Оси ${roomVal}`);
        } else {
            parts.push(roomVal);
        }
    }

    locHidden.value = parts.join(', ');
    scheduleSessionSave();
    updateUI();
    setTimeout(updateBodyPadding, 50);
}

// Привязка слушателей к инпутам локации
document.addEventListener("DOMContentLoaded", () => {
    ['inp-section', 'inp-floor', 'inp-room'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateLocationFromStructured);
            el.addEventListener('blur', () => {
                let val = el.value.trim();
                if (!val) return;
                // Форматируем для красоты при потере фокуса
                if (id === 'inp-section') {
                    let slashMatch = val.match(/^(\d+)\s*\/\s*(\d+)$/);
                    if (slashMatch) el.value = `Корпус ${slashMatch[1]}, секция ${slashMatch[2]}`;
                    else if (/^\d+$/.test(val)) el.value = `Корпус ${val}`;
                    else if (/^[\dА-Яа-яA-Za-z]+$/.test(val) && !val.toLowerCase().includes('корпус')) el.value = `Корпус ${val}`;
                }
                if (id === 'inp-floor' && /^-?\d+$/.test(val)) el.value = `Этаж ${val}`;
                if (id === 'inp-room' && isNaN(val) && !val.toLowerCase().includes('оси') && !val.toLowerCase().includes('пом')) el.value = `Оси ${val}`;
                updateLocationFromStructured();
            });
            el.addEventListener('focus', () => {
                // При фокусе убираем слова для удобного редактирования
                if (id === 'inp-section') {
                    el.value = el.value.replace(/^Корпус\s+(\d+),\s*секция\s+(\d+)$/i, '$1/$2').replace(/^Корпус\s+/i, '');
                }
                el.value = el.value.replace(/^(Секция|Этаж|Оси)\s+/i, '');
            });
        }
    });

    initSmartInput('inp-inspector', 'inspectorName');
    initSmartInput('inp-contractor', 'contractorName');
    initSmartInput('inp-section', 'section');
    initSmartInput('inp-floor', 'floor');
    initSmartInput('inp-room', 'room');
});
// === КОНЕЦ ЗАМЕНЫ 1 ===
// === Подгрузка нормализованных подрядчиков в поле "Подрядчик" на осмотре ===
// === Подгрузка нормализованных подрядчиков (Кастомный Dropdown) ===
// === Подгрузка нормализованных подрядчиков (Кастомный Dropdown) ===
window.loadContractorDirectoryToInspectionInput = async function () {
    const input = document.getElementById('inp-contractor');
    if (!input) return;

    // Убираем старый глючный datalist
    input.removeAttribute('list');

    try {
        let contractorNames = [];

        // Берем подрядчиков из справочника
        if (typeof ContractorDirectory !== 'undefined' && ContractorDirectory.contractors.length > 0) {
            contractorNames = ContractorDirectory.contractors.map(c => c.display_name);
        } else if (typeof dbGetAll !== 'undefined') {
            const dirs = await dbGetAll('contractor_directory');
            if (dirs) {
                contractorNames = dirs.filter(c => !c._deleted && !c.is_deleted).map(c => c.display_name);
            }
        }

        // Добавляем тех, кто уже есть в нашей истории (на случай если справочник пуст)
        if (typeof contractorArray !== 'undefined') {
            const histNames = contractorArray.map(c => c.contractorName).filter(Boolean);
            contractorNames = contractorNames.concat(histNames);
        }

        // Оставляем только уникальные и сортируем по алфавиту
        if (contractorNames.length > 0) {
            contractorNames = [...new Set(contractorNames)].sort();

            // Загоняем их в кэш умного инпута
            if (!_smartInputMemoryCache) _smartInputMemoryCache = JSON.parse(localStorage.getItem('smart_input_cache') || '{}');
            _smartInputMemoryCache['contractorName'] = contractorNames;
            localStorage.setItem('smart_input_cache', JSON.stringify(_smartInputMemoryCache));
        }

        // Инициализируем красивый iOS-подобный дропдаун
        initSmartInput('inp-contractor', 'contractorName');

    } catch (e) {
        console.warn('[Осмотр] Не удалось загрузить справочник подрядчиков:', e);
    }
};

window.loadObjectDirectoryToInspectionInput = async function () {
    const input = document.getElementById('inp-project');
    if (!input) return;

    input.removeAttribute('list');

    try {
        let objectNames = [];

        // 1. Берём объекты из ObjectDirectory
        if (
            typeof ObjectDirectory !== 'undefined' &&
            Array.isArray(ObjectDirectory.objects) &&
            ObjectDirectory.objects.length > 0
        ) {
            objectNames = ObjectDirectory.objects
                .filter(o => !o._deleted && !o.is_deleted)
                .map(o => o.display_name || o.name || o.canonical_key)
                .filter(Boolean);
        }

        // 2. Если ObjectDirectory ещё не готов — берём из IndexedDB
        if (objectNames.length === 0 && typeof dbGetAll !== 'undefined') {
            const dirs = await dbGetAll('project_objects');
            if (dirs) {
                objectNames = dirs
                    .filter(o => !o._deleted && !o.is_deleted)
                    .map(o => o.display_name || o.name || o.canonical_key)
                    .filter(Boolean);
            }
        }

        // 3. Добавляем объекты из истории осмотров
        if (typeof contractorArray !== 'undefined') {
            const histNames = contractorArray
                .map(i => i.project_display_name || i.projectName || i.project_canonical_key)
                .filter(Boolean);

            objectNames = objectNames.concat(histNames);
        }

        objectNames = [...new Set(objectNames.map(v => String(v).trim()).filter(Boolean))].sort();

        if (!_smartInputMemoryCache) {
            _smartInputMemoryCache = JSON.parse(localStorage.getItem('smart_input_cache') || '{}');
        }

        _smartInputMemoryCache['projectName'] = objectNames;
        localStorage.setItem('smart_input_cache', JSON.stringify(_smartInputMemoryCache));

        initSmartInput('inp-project', 'projectName');
        if (typeof ObjectDirectory !== 'undefined' && typeof ObjectDirectory.initUI === 'function') {
            ObjectDirectory.initUI();
        }

    } catch (e) {
        console.warn('[Осмотр] Не удалось загрузить справочник объектов:', e);
    }
};
window.refreshInspectionDirectoriesAfterSync = async function () {
    try {
        // Обновляем внутренние справочники из IndexedDB после pull
        if (window.ContractorDirectory && typeof window.ContractorDirectory.init === 'function') {
            await window.ContractorDirectory.init();
        }

        if (window.ObjectDirectory && typeof window.ObjectDirectory.init === 'function') {
            await window.ObjectDirectory.init();
        }

        // Пересобираем выпадающие списки в шапке осмотра
        if (typeof window.loadContractorDirectoryToInspectionInput === 'function') {
            await window.loadContractorDirectoryToInspectionInput();
        }

        if (typeof window.loadObjectDirectoryToInspectionInput === 'function') {
            await window.loadObjectDirectoryToInspectionInput();
        }

        if (typeof ObjectDirectory !== 'undefined' && typeof ObjectDirectory.initUI === 'function') {
            ObjectDirectory.initUI();
        }

        console.log('[Inspection] Справочники подрядчиков и объектов обновлены после синхронизации');

    } catch (e) {
        console.warn('[Inspection] Не удалось обновить справочники после синхронизации:', e);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (
            typeof window.triggerSync === 'function' &&
            !window.triggerSync.__rbiInspectionRefreshWrapped
        ) {
            const originalTriggerSync = window.triggerSync;

            window.triggerSync = async function (...args) {
                const result = await originalTriggerSync.apply(this, args);

                setTimeout(() => {
                    if (typeof window.refreshInspectionDirectoriesAfterSync === 'function') {
                        window.refreshInspectionDirectoriesAfterSync();
                    }
                }, 500);

                return result;
            };

            window.triggerSync.__rbiInspectionRefreshWrapped = true;
            console.log('[Inspection] triggerSync обёрнут для обновления справочников');
        }
    }, 1000);
});
// Автоматически подгружаем подрядчиков после запуска приложения
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof window.loadContractorDirectoryToInspectionInput === 'function') {
            window.loadContractorDirectoryToInspectionInput();
        }

        if (typeof window.loadObjectDirectoryToInspectionInput === 'function') {
            window.loadObjectDirectoryToInspectionInput();
        }
    }, 1500);
});

// === Нормализация подрядчика перед сохранением осмотра ===
window.normalizeInspectionContractorBeforeSave = async function () {
    const input = document.getElementById('inp-contractor');

    if (!input) {
        return {
            contractor_raw_name: '',
            contractor_name: '',
            contractor_canonical_key: '',
            contractor_normalization_status: 'empty'
        };
    }

    const rawName = input.value.trim();

    if (!rawName) {
        return {
            contractor_raw_name: '',
            contractor_name: '',
            contractor_canonical_key: '',
            contractor_normalization_status: 'empty'
        };
    }

    // Если справочник подрядчиков подключен — пробуем нормализовать
    if (window.ContractorDirectory && typeof window.ContractorDirectory.normalizeContractorName === 'function') {
        const result = await window.ContractorDirectory.normalizeContractorName(rawName);

        // Нашли подрядчика в справочнике / алиасах / синонимах
        if (result && result.canonical_key && result.display_name) {
            input.value = result.display_name;

            return {
                contractor_raw_name: rawName,
                contractor_name: result.display_name,
                contractor_canonical_key: result.canonical_key,
                contractor_normalization_status: 'matched'
            };
        }

        // Не нашли — ContractorDirectory сам создаст заявку в очередь
        return {
            contractor_raw_name: rawName,
            contractor_name: rawName,
            contractor_canonical_key: '',
            contractor_normalization_status: 'pending'
        };
    }

    // Если справочник не загрузился — просто сохраняем как текст
    return {
        contractor_raw_name: rawName,
        contractor_name: rawName,
        contractor_canonical_key: '',
        contractor_normalization_status: 'pending'
    };
};

// === КАСТОМНЫЕ DROPDOWN АВТОЗАПОЛНЕНИЯ (БЕЗ DATALIST) ===
let _smartInputMemoryCache = null;

function getSmartInputCache(field) {
    if (!_smartInputMemoryCache) {
        _smartInputMemoryCache = JSON.parse(localStorage.getItem('smart_input_cache') || '{}');
    }
    if (!_smartInputMemoryCache[field]) {
        _smartInputMemoryCache[field] = [...new Set(contractorArray.map(i => i[field]).filter(Boolean))].slice(0, 15);
        localStorage.setItem('smart_input_cache', JSON.stringify(_smartInputMemoryCache));
    }
    return _smartInputMemoryCache[field];
}

function updateSmartInputCache(field, value) {
    if (!value) return;
    if (!_smartInputMemoryCache) _smartInputMemoryCache = JSON.parse(localStorage.getItem('smart_input_cache') || '{}');
    if (!_smartInputMemoryCache[field]) _smartInputMemoryCache[field] = [];

    if (_smartInputMemoryCache[field].includes(value)) {
        _smartInputMemoryCache[field] = _smartInputMemoryCache[field].filter(v => v !== value);
    }
    _smartInputMemoryCache[field].unshift(value);
    if (_smartInputMemoryCache[field].length > 15) _smartInputMemoryCache[field].pop();

    localStorage.setItem('smart_input_cache', JSON.stringify(_smartInputMemoryCache));
}

function initSmartInput(inputId, dataField) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Если уже инициализирован — не навешиваем повторные обработчики
    if (input.dataset.smartInputReady === '1') return;
    input.dataset.smartInputReady = '1';

    const wrapper = input.parentElement;
    if (wrapper && getComputedStyle(wrapper).position === 'static') {
        wrapper.style.position = 'relative';
    }
    const dropdown = document.createElement('div');
    // ЖЕСТКО ЗАДАЕМ ID ДЛЯ ЗАКРЫТИЯ
    dropdown.id = 'dd_' + inputId;
    dropdown.className = 'absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg mt-1 z-[5000] hidden max-h-48 overflow-y-auto custom-scrollbar';
    wrapper.appendChild(dropdown);

    const renderList = (filter = '') => {
        if (input.readOnly || input.disabled) {
            dropdown.classList.add('hidden');
            return;
        }

        let items = getSmartInputCache(dataField);
        if (filter) items = items.filter(i => String(i).toLowerCase().includes(filter.toLowerCase()));

        if (items.length === 0) {
            dropdown.innerHTML = '';
            dropdown.classList.add('hidden');
            return;
        }

        dropdown.innerHTML = items.map(val => {
            const safeVal = String(val).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            // ТЕПЕРЬ ОН ТОЧНО ЗАКРОЕТСЯ, ТАК КАК ID ИЗВЕСТЕН
            return `<div class="p-2.5 text-[11px] font-bold border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-300 transition-colors" 
                onmousedown="document.getElementById('${inputId}').value='${safeVal}'; document.getElementById('${inputId}').dispatchEvent(new Event('input')); document.getElementById('${dropdown.id}').classList.add('hidden');">
                ${val}
            </div>`;
        }).join('');
        dropdown.classList.remove('hidden');
    };

    input.addEventListener('focus', () => renderList());
    input.addEventListener('input', (e) => renderList(e.target.value));
    input.addEventListener('blur', () => { setTimeout(() => dropdown.classList.add('hidden'), 200); });
}

// === МУЛЬТИ-ФИЛЬТРЫ (ЛОГИКА МОДАЛКИ) ===
// === МУЛЬТИ-ФИЛЬТРЫ (ЛОГИКА МОДАЛКИ) ===
// === МУЛЬТИ-ФИЛЬТРЫ (ЛОГИКА МОДАЛКИ С ПРАВАМИ ДОСТУПА) ===
function openMultiFilterModal(type, title, context) {
    currentFilterType = type;
    currentFilterContext = context;

    document.getElementById('multi-filter-title').innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
        ${title}
    `;

    document.getElementById('multi-filter-search').value = '';

    // 1. ОПРЕДЕЛЯЕМ РОЛЬ И ДОСТУПЫ ПОЛЬЗОВАТЕЛЯ
    const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
    const assignedProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : [];
    const isManager = ['director', 'deputy_manager', 'manager'].includes(role);

    // 2. БАЗЫ ДАННЫХ (RBI и ПК СК)
    let accessibleRbi = contractorArray || [];
    let accessibleSk = window.skRecords || [];

    // 3. ПРИМЕНЯЕМ ПРАВА ДОСТУПА (Если не админ — режем массивы по закрепленным объектам)
    if (!isManager && role !== 'guest') {
        if (assignedProjects.length > 0) {
            accessibleRbi = accessibleRbi.filter(i => {
                const p = i.project_canonical_key || i.project_display_name || i.projectName;
                return assignedProjects.includes(p);
            });
            accessibleSk = accessibleSk.filter(r => {
                const p = r.project_canonical_key || r.project_display_name || r.display_name;
                return assignedProjects.includes(p);
            });
        }
    }

    let uniqueValues = [];
    let field = '';

    // 4. КАСКАДНАЯ ФИЛЬТРАЦИЯ (Связываем Объект, Подрядчика и Инспектора)
    let filteredRbi = accessibleRbi;
    let filteredSk = accessibleSk;

    // Если открыт НЕ фильтр Объектов, но Объект уже выбран — сужаем базу
    if (type !== 'project' && activeMultiFilters[context].project && activeMultiFilters[context].project.length > 0) {
        const fProj = activeMultiFilters[context].project;
        filteredRbi = filteredRbi.filter(i => fProj.includes(i.project_display_name) || fProj.includes(i.project_canonical_key) || fProj.includes(i.projectName));
        filteredSk = filteredSk.filter(r => fProj.includes(r.project_display_name) || fProj.includes(r.project_canonical_key) || fProj.includes(r.display_name));
    }

    // Если открыт НЕ фильтр Подрядчиков, но Подрядчик уже выбран — сужаем базу
    if (type !== 'contractor' && activeMultiFilters[context].contractor && activeMultiFilters[context].contractor.length > 0) {
        const fContr = activeMultiFilters[context].contractor;
        filteredRbi = filteredRbi.filter(i => fContr.includes(i.contractorName));
        filteredSk = filteredSk.filter(r => fContr.includes(r.contractor_name) || fContr.includes(r.contractor));
    }

    // Если открыт НЕ фильтр Инспекторов, но Инспектор уже выбран — сужаем базу
    if (type !== 'inspector' && activeMultiFilters[context].inspector && activeMultiFilters[context].inspector.length > 0) {
        const fInsp = activeMultiFilters[context].inspector;
        filteredRbi = filteredRbi.filter(i => fInsp.includes(i.inspectorName));
        filteredSk = filteredSk.filter(r => fInsp.includes(r.issued_by) || fInsp.includes(r.inspector));
    }

    // 5. СОБИРАЕМ ДАННЫЕ ИЗ УЖЕ ОТФИЛЬТРОВАННОЙ БАЗЫ
    if (type === 'project') {
        const rbiProjs = filteredRbi.map(i => i.project_display_name || i.projectName || i.project_canonical_key);
        const skProjs = filteredSk.map(r => r.project_display_name || r.display_name || r.canonical_key);
        uniqueValues = [...new Set([...rbiProjs, ...skProjs].filter(Boolean))].sort();
    }
    else if (type === 'contractor') {
        const rbiContrs = filteredRbi.map(i => i.contractorName);
        const skContrs = filteredSk.map(r => r.contractor_name || r.contractor);
        uniqueValues = [...new Set([...rbiContrs, ...skContrs].filter(Boolean))].sort();
    }
    else if (type === 'inspector') {
        // Берем ТОЛЬКО Инженеров по Качеству (из истории RBI аудитов), исключая инженеров СК
        const rbiEngs = filteredRbi.map(i => i.inspectorName);
        uniqueValues = [...new Set(rbiEngs.filter(name => name && name !== 'Система' && name !== 'Системная'))].sort();
    }
    else if (type === 'template') {
        const rbiTmpls = filteredRbi.map(i => i.templateTitle);
        const skTmpls = filteredSk.map(r => r.category && r.category !== 'Без категории' ? r.category : null);
        uniqueValues = [...new Set([...rbiTmpls, ...skTmpls].filter(Boolean))].sort();
    }

    const currentSelected = activeMultiFilters[context][type] || [];
    const listEl = document.getElementById('multi-filter-list');

    if (uniqueValues.length === 0) {
        listEl.innerHTML = `<div class="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500"><svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg><span class="text-xs font-bold uppercase tracking-wider">Нет данных</span></div>`;
    } else {
        listEl.innerHTML = uniqueValues.map(val => {
            const isChecked = currentSelected.length === 0 || currentSelected.includes(val);
            let displayVal = val;

            return `
            <label class="filter-item-label flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all hover:border-indigo-300 dark:hover:border-indigo-600">
                <input type="checkbox" value="${val}" class="filter-modal-cb w-5 h-5 accent-indigo-600 rounded cursor-pointer" ${isChecked ? 'checked' : ''}>
                <span class="text-[13px] font-bold text-slate-700 dark:text-slate-200 filter-item-text truncate flex-1 leading-none pt-0.5">${displayVal}</span>
            </label>`;
        }).join('');
    }

    const overlay = document.getElementById('multi-filter-modal-overlay');
    const content = document.getElementById('multi-filter-modal-content');

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');

    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        content.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    }, 10);
}

// === ЕДИНАЯ ФУНКЦИЯ ЗАКРЫТИЯ МУЛЬТИ-ФИЛЬТРА ===
function closeMultiFilterModal() {
    const overlay = document.getElementById('multi-filter-modal-overlay');
    const content = document.getElementById('multi-filter-modal-content');

    // Плавное исчезновение
    overlay.classList.add('opacity-0');
    content.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');

    setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

function filterMultiModalList() {
    const term = document.getElementById('multi-filter-search').value.toLowerCase();
    const labels = document.querySelectorAll('.filter-item-label');
    labels.forEach(label => {
        const text = label.querySelector('.filter-item-text').innerText.toLowerCase();
        label.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

function selectAllMultiFilter() {
    const checkboxes = document.querySelectorAll('.filter-modal-cb');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

function applyMultiFilter() {
    const checkboxes = document.querySelectorAll('.filter-modal-cb');
    const total = checkboxes.length;
    const checkedValues = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    // Если выбраны все или не выбран ни один -> сбрасываем фильтр (означает "Все")
    if (checkedValues.length === total || checkedValues.length === 0) {
        activeMultiFilters[currentFilterContext][currentFilterType] = [];
    } else {
        activeMultiFilters[currentFilterContext][currentFilterType] = checkedValues;
    }

    updateFilterButtonLabels();
    closeMultiFilterModal();

    // Запускаем рендер нужной вкладки
    if (currentFilterContext === 'history') {
        applyHistoryFilters();
    } else {
        renderCurrentAnalyticsTab();
    }
}

function updateFilterButtonLabels() {
    const updateBtn = (btnId, arr, defaultText) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const textEl = btn.querySelector('.truncate');
        if (arr.length === 0) {
            textEl.innerText = defaultText;
            textEl.classList.remove('text-indigo-600', 'font-black');
        } else if (arr.length === 1) {
            // Если выбран 1, показываем его имя (для шаблона придется искать имя)
            let display = arr[0];
            if (btnId.includes('template')) {
                const sample = contractorArray.find(i => i.templateKey === arr[0]);
                if (sample) display = sample.templateTitle;
            }
            textEl.innerText = display;
            textEl.classList.add('text-indigo-600', 'font-black');
        } else {
            textEl.innerText = `Выбрано: ${arr.length}`;
            textEl.classList.add('text-indigo-600', 'font-black');
        }
    };

    updateBtn('btn-hist-project', activeMultiFilters.history.project, 'Все объекты');
    updateBtn('btn-hist-contractor', activeMultiFilters.history.contractor, 'Все подрядчики');
    updateBtn('btn-hist-inspector', activeMultiFilters.history.inspector, 'Все инспекторы');

    updateBtn('btn-ana-project', activeMultiFilters.analytics.project, 'Все объекты');
    updateBtn('btn-ana-contractor', activeMultiFilters.analytics.contractor, 'Все подрядчики');
    updateBtn('btn-ana-inspector', activeMultiFilters.analytics.inspector, 'Все инспекторы');
    updateBtn('btn-ana-template', activeMultiFilters.analytics.template, 'Все виды работ');
}

// Заглушка, чтобы не ломать старый код при загрузке


// === УВЕДОМЛЕНИЯ И МОДАЛКИ (v15 100% совместимость) ===
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
}

// === НАВИГАЦИЯ (5 ВКЛАДОК v16.0) ===
// === НАВИГАЦИЯ: БЕЗ БЛОКИРОВКИ ЖЕСТОВ v17.8.208 ===


// === RBI BLOCK ANDROID PULL TO REFRESH ONLY v17.8.209 ===
// Блокирует только жест "потянуть вниз для обновления" на самом верху страницы.
// Не блокирует клики по вкладкам и обычный скролл.
(function rbiBlockAndroidPullToRefreshOnly() {
    if (window.__rbiPullToRefreshBlockReady) return;
    window.__rbiPullToRefreshBlockReady = true;

    let startY = 0;
    let startX = 0;

    function isInsideNoBlockZone(target) {
        return !!target.closest(
            '.bottom-nav, .nav-item, button, a, input, textarea, select, [contenteditable="true"], .modal, [role="dialog"]'
        );
    }

    document.addEventListener('touchstart', function (e) {
        if (!e.touches || e.touches.length !== 1) return;

        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        if (isInsideNoBlockZone(e.target)) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;

        const dy = currentY - startY;
        const dx = Math.abs(currentX - startX);

        const isPullingDown = dy > 8;
        const isMostlyVertical = Math.abs(dy) > dx;
        const isAtTop = window.scrollY <= 0 || document.documentElement.scrollTop <= 0;

        if (isAtTop && isPullingDown && isMostlyVertical) {
            e.preventDefault();
        }
    }, { passive: false });
})();

// === ДИНАМИЧЕСКИЕ ОТСТУПЫ ===
// === ДИНАМИЧЕСКИЕ ОТСТУПЫ ===
function updateBodyPadding() {
    const headerEl = document.getElementById('main-header');

    // Ищем нижнюю панель по новому ID или по классу
    const navEl = document.getElementById('main-bottom-nav') || document.querySelector('.bottom-nav');

    const isNavTop = (document.body.classList.contains('nav-pos-top')) ||
        (document.body.classList.contains('nav-pos-auto') && window.innerWidth >= 768);

    // Проверяем, активны ли вкладки, где нужна шапка
    const isAuditActive = document.getElementById('tab-audit')?.classList.contains('active');
    const isDefects = document.getElementById('tab-construction-defects')?.classList.contains('active');
    const isAcceptance = document.getElementById('tab-construction-acceptance')?.classList.contains('active');
    const isTransfer = document.getElementById('tab-transfer')?.classList.contains('active'); // <-- НОВОЕ
    const isPlaceholder = document.getElementById('tab-mode-placeholder')?.classList.contains('active');

    // Шапка нужна на любой из этих вкладок
    const needsHeader = isAuditActive || isDefects || isAcceptance || isTransfer || isPlaceholder;

    // Снимаем дефолтный отступ контента
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.classList.remove('pt-4');

    let totalTop = 0;

    if (needsHeader) {
        if (isNavTop && navEl) totalTop += navEl.offsetHeight;

        if (headerEl && headerEl.style.display !== 'none') {
            const wasCollapsed = headerEl.classList.contains('header-collapsed');
            // Временно убираем класс, чтобы браузер мог посчитать реальную высоту
            if (wasCollapsed) headerEl.classList.remove('header-collapsed');

            // Если мы в режиме стройконтроля, высота шапки будет меньше
            totalTop += headerEl.offsetHeight;

            if (wasCollapsed) headerEl.classList.add('header-collapsed');
        }

        document.body.style.paddingTop = `${totalTop + 15}px`;
        if (mainEl) mainEl.classList.add('pt-4'); // Для красоты внутри Осмотра/Дефектов
    } else {
        if (isNavTop && navEl) {
            // Навигация сверху: Высота меню (60px) + зазор 10px = 70px
            document.body.style.paddingTop = `70px`;
        } else {
            // Навигация снизу (Телефон): Жесткий безопасный отступ от верха экрана 20px
            document.body.style.paddingTop = `20px`;
        }
    }
}

// === НАВИГАЦИЯ И ВКЛАДКИ ===
// === НАВИГАЦИЯ (РОУТЕР-АДАПТЕР) ===
// === НАВИГАЦИЯ (РОУТЕР-АДАПТЕР) ===
function setupNavigation() {
    // Пусто
}

function switchTab(tabId, navElement = null) {
    const routeMap = {
        'tab-audit': '#/quality/audit',
        'tab-engineer': '#/quality/engineer',
        'tab-analytics': '#/quality/analytics',
        'tab-reference': '#/quality/reference',
        'tab-settings': '#/quality/settings'
    };

    if (routeMap[tabId]) {
        AppRouter.navigate(routeMap[tabId]);
    }
}



// === СВОРАЧИВАЕМ МИНИДАШБОРД ===
function toggleDashboardExpand() {
    const expView = document.getElementById('dash-expanded-view');
    if (!expView) return;
    expView.classList.toggle('hidden');
    // Обновляем отступ страницы через нашу умную функцию
    setTimeout(updateBodyPadding, 50);
}
// === ЕДИНАЯ УМНАЯ КНОПКА FAB (СКАЧАТЬ PDF) ===
function updateFabButton(tabId) {
    const fab = document.getElementById('fab-download-btn');
    if (!fab) return;

    if (tabId === 'tab-analytics') {
        // ЖЕСТКАЯ ПРОВЕРКА: Если мы на вкладке Инженеров (HR) - скрываем кнопку!
        if (typeof currentActiveAnalyticsTab !== 'undefined' && currentActiveAnalyticsTab === 'sub-engineer-rating') {
            fab.classList.add('hidden');
            fab.classList.remove('fab-visible');
            fab.style.display = 'none';
        } else {
            fab.classList.remove('hidden');
            fab.classList.add('fab-visible');
            fab.style.display = 'flex';
            fab.dataset.context = typeof currentActiveAnalyticsTab !== 'undefined' ? currentActiveAnalyticsTab : 'pdf';
        }
    } else {
        fab.classList.add('hidden');
        fab.classList.remove('fab-visible');
        fab.style.display = 'none';
    }
}

function handleFabDownload() {
    const fab = document.getElementById('fab-download-btn');
    const ctx = fab?.dataset.context || 'pdf';
    const data = getFilteredAnalyticsData();

    if (data.length === 0) return showToast('Нет данных для выгрузки');

    const menuOverlay = document.getElementById('fab-export-menu-overlay');
    const menuContent = document.getElementById('fab-export-menu-content');
    const dynamicList = document.getElementById('fab-menu-dynamic-list');

    if (!menuOverlay || !dynamicList) return;

    // SVG Иконки
    const iconPdf = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>`;
    const iconPrint = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>`;
    const iconDoc = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>`;
    const iconChart = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg>`;
    const iconPoster = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg>`;
    const iconTable = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125-.504 1.125-1.125M3.375 8.25v-1.5c0-.621.504-1.125 1.125-1.125m17.25 2.625v-1.5c0-.621-.504-1.125-1.125-1.125m-17.25 0h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0v1.5c0 .621.504 1.125 1.125 1.125"></path></svg>`;

    const createRow = (action, title, desc, iconBg, iconColor, mainIcon) => `
        <div class="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
            <div class="flex items-center gap-3 min-w-0 pr-2">
                <div class="w-10 h-10 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">${mainIcon}</div>
                <div class="min-w-0">
                    <div class="font-bold text-[12px] text-slate-800 dark:text-white truncate">${title}</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase mt-0.5 truncate">${desc}</div>
                </div>
            </div>
            <div class="flex gap-1.5 shrink-0">
                <button onclick="handleFabExportAction('${action}', 'script')" class="w-10 h-10 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all border border-indigo-100 dark:border-indigo-800" title="Скачать PDF">
                    ${iconPdf}
                </button>
                <button onclick="handleFabExportAction('${action}', 'browser')" class="w-10 h-10 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all border border-slate-200 dark:border-slate-700" title="Напечатать">
                    ${iconPrint}
                </button>
            </div>
        </div>`;

    let contentHtml = '';

    if (ctx === 'sub-contractors') {
        contentHtml += createRow('current', 'Текущий экран', 'Детализация или список (А4)', 'bg-indigo-50 dark:bg-indigo-900/30', 'text-indigo-600 dark:text-indigo-400', iconDoc);
        contentHtml += createRow('full_report', 'Отчёт по объекту', 'Паспорта подрядчиков (А3)', 'bg-emerald-50 dark:bg-emerald-900/30', 'text-emerald-600 dark:text-emerald-400', iconChart);
        contentHtml += createRow('poster', 'Плакат качества', 'Рейтинги и фото (А3)', 'bg-orange-50 dark:bg-orange-900/30', 'text-orange-600 dark:text-orange-400', iconPoster);
        contentHtml += createRow('tender', 'Тендерный отчет', 'Левая кнопка: PDF | Правая: Excel CSV', 'bg-purple-50 dark:bg-purple-900/30', 'text-purple-600 dark:text-purple-400', iconTable);
    } else if (ctx === 'sub-onepager') {
        contentHtml += createRow('onepager', 'Сводный статус объекта', 'Графики и управленческие выводы (А3)', 'bg-indigo-50 dark:bg-indigo-900/30', 'text-indigo-600 dark:text-indigo-400', iconChart);
        contentHtml += createRow('global_onepager', 'Глобальная сводка', 'Все объекты компании (А3)', 'bg-blue-50 dark:bg-blue-900/30', 'text-blue-600 dark:text-blue-400', iconDoc);

        // --- НОВОЕ: МАРШРУТИЗАЦИЯ ДЛЯ ОСТАЛЬНЫХ ВКЛАДОК ---
    } else if (ctx === 'sub-data' || ctx === 'sub-history') {
        contentHtml += createRow('data', 'Реестр проверок', 'Сырая база данных (А4)', 'bg-slate-100 dark:bg-slate-800', 'text-slate-600 dark:text-slate-300', iconTable);
    } else if (ctx === 'sub-schedule') {
        contentHtml += createRow('schedule', 'График СМР', 'Текущий график работ (А4)', 'bg-emerald-50 dark:bg-emerald-900/30', 'text-emerald-600 dark:text-emerald-400', iconTable);
    } else if (ctx === 'sub-sk') {
        contentHtml += createRow('sk_dashboard', 'Дашборд Стройконтроля', 'Матрица сокрытия брака (А4)', 'bg-blue-50 dark:bg-blue-900/30', 'text-blue-600 dark:text-blue-400', iconChart);
    } else {
        contentHtml += `<div class="text-center text-sm text-slate-500 py-4 font-bold">Выгрузка для этого раздела недоступна</div>`;
    }

    dynamicList.innerHTML = contentHtml;

    // Показываем меню
    menuOverlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        menuOverlay.classList.remove('opacity-0');
        menuContent.classList.remove('translate-y-full');
    }, 10);
}

// === ВКЛАДКА: НАСТРОЙКИ ===
async function loadSettings() {
    try {
        const data = await dbGet(STORES.SETTINGS, 'user_prefs');
        if (data) appSettings = { ...appSettings, ...data };

        // Тема — локальная UI-настройка. Держим её отдельно, чтобы не было рассинхрона после кэша/синхры.
        const savedTheme = rbiGetSavedThemePreference();

        if (savedTheme) {
            appSettings.theme = savedTheme;
        } else if (!RBI_ALLOWED_THEMES.includes(appSettings.theme)) {
            appSettings.theme = 'auto';
            rbiSaveThemePreference('auto');
        }

    } catch (e) {
        console.error("Ошибка загрузки настроек", e);
        appSettings.theme = rbiGetSavedThemePreference() || 'auto';
    }
}

async function saveSettings(key, value) {
    if (key === 'theme') {
        value = rbiSaveThemePreference(value);
    }

    appSettings[key] = value;

    applySettingsToUI();

    try {
        await dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
    } catch (e) {
        console.error("Ошибка сохранения настроек", e);
    }
}

function renderSettingsTab() {
    // 1. Базовые селекторы оформления
    if (document.getElementById('set-theme')) document.getElementById('set-theme').value = appSettings.theme || 'auto';
    if (document.getElementById('set-fontsize')) document.getElementById('set-fontsize').value = appSettings.fontSize || 'medium';
    if (document.getElementById('set-navpos')) document.getElementById('set-navpos').value = appSettings.navPosition || 'auto';
    if (document.getElementById('set-dashmode')) document.getElementById('set-dashmode').value = appSettings.dashboardMode || 'compact';

    // 2. Переключатели логики
    if (document.getElementById('set-swipe')) document.getElementById('set-swipe').checked = appSettings.swipeEnabled;
    if (document.getElementById('set-collapse')) document.getElementById('set-collapse').checked = appSettings.autoCollapseOk;
    if (document.getElementById('set-groups-col')) document.getElementById('set-groups-col').checked = appSettings.defaultGroupsCollapsed;
    if (document.getElementById('set-fast')) document.getElementById('set-fast').checked = appSettings.fastMode;

    // RBI NEW: настройки управления файловым кэшем
    if (document.getElementById('set-storage-auto-cleanup')) {
        document.getElementById('set-storage-auto-cleanup').checked = appSettings.storageAutoCleanupEnabled !== false;
    }

    if (document.getElementById('set-storage-cleanup-threshold')) {
        document.getElementById('set-storage-cleanup-threshold').value = String(appSettings.storageCleanupThresholdPercent || 80);
    }

    if (document.getElementById('set-storage-photo-ttl')) {
        document.getElementById('set-storage-photo-ttl').value = String(appSettings.storageInspectionPhotoTtlDays || 60);
    }

    // RBI NEW: расширенные TTL настройки файлового кэша
    if (document.getElementById('set-storage-report-ttl')) {
        document.getElementById('set-storage-report-ttl').value = String(appSettings.storageReportTtlDays || 30);
    }

    if (document.getElementById('set-storage-doc-ttl')) {
        document.getElementById('set-storage-doc-ttl').value = String(appSettings.storageDocTtlDays || appSettings.storageKnowledgeFileTtlDays || 60);
    }

    if (document.getElementById('set-storage-twi-node-ttl')) {
        document.getElementById('set-storage-twi-node-ttl').value = String(appSettings.storageTwiTtlDays || appSettings.storageNodeTtlDays || 90);
    }

    if (document.getElementById('set-storage-practice-ttl')) {
        document.getElementById('set-storage-practice-ttl').value = String(appSettings.storagePracticeTtlDays || 60);
    }

    // 3. Аналитика
    if (document.getElementById('set-ana-pareto')) document.getElementById('set-ana-pareto').checked = appSettings.anaEngPareto;
    if (document.getElementById('set-ana-trend')) document.getElementById('set-ana-trend').checked = appSettings.anaOpTrend;
    if (document.getElementById('set-ana-leader')) document.getElementById('set-ana-leader').checked = appSettings.anaOpLeader;
    if (document.getElementById('set-ana-ai')) document.getElementById('set-ana-ai').checked = appSettings.anaEngAi;
    if (document.getElementById('set-ana-photos')) document.getElementById('set-ana-photos').checked = appSettings.anaEngPhotos;
    if (document.getElementById('set-ana-top')) document.getElementById('set-ana-top').checked = appSettings.anaOpTopDefects;
    if (document.getElementById('set-task-meeting')) document.getElementById('set-task-meeting').value = appSettings.taskMeetingDay || '1';
    if (document.getElementById('set-task-fmea')) document.getElementById('set-task-fmea').value = appSettings.taskFmeaDay || '5';
    if (document.getElementById('set-task-month')) document.getElementById('set-task-month').value = appSettings.taskMonthReportDay || '1';
    // 3.5. AI-настройки
    if (document.getElementById('set-ai-enabled')) {
        document.getElementById('set-ai-enabled').checked = appSettings.aiEnabled;
        document.getElementById('ai-settings-body').style.display = appSettings.aiEnabled ? 'block' : 'none';
    }
    if (document.getElementById('set-ai-key')) document.getElementById('set-ai-key').value = appSettings.apiKey || '';
    if (document.getElementById('set-ai-corp-pwd')) document.getElementById('set-ai-corp-pwd').value = appSettings.aiCorpPwd || ''; // НОВОЕ ПОЛЕ

    const aiModes = document.getElementsByName('ai-mode');
    if (aiModes.length > 0) {
        const mode = appSettings.aiAuthMode || 'role';
        document.getElementById('corporate-pwd-field').classList.add('hidden');
        document.getElementById('personal-key-field').classList.add('hidden');

        if (mode === 'role') {
            aiModes[0].checked = true;
        } else if (mode === 'corporate') {
            aiModes[1].checked = true;
            document.getElementById('corporate-pwd-field').classList.remove('hidden');
        } else if (mode === 'personal') {
            aiModes[2].checked = true;
            document.getElementById('personal-key-field').classList.remove('hidden');
        }
    }
    // 4. НОВЫЕ БЛОКИ: Автоматизация бэкапов
    // Авто‑кэш облака
    if (document.getElementById('set-autocache')) document.getElementById('set-autocache').checked = appSettings.autoCacheCloudFiles;
    if (document.getElementById('set-autobackup')) document.getElementById('set-autobackup').checked = appSettings.autoBackupEnabled;
    if (document.getElementById('set-autobackup-day')) document.getElementById('set-autobackup-day').value = appSettings.autoBackupDay || '5';
    if (document.getElementById('set-autobackup-share')) document.getElementById('set-autobackup-share').checked = appSettings.autoBackupShare;

    if (document.getElementById('set-automanager')) document.getElementById('set-automanager').checked = appSettings.autoManagerEnabled;
    if (document.getElementById('set-automanager-day')) document.getElementById('set-automanager-day').value = appSettings.autoManagerDay || '5';
    // 5. Брендирование и Авто-отчеты
    if (document.getElementById('set-brand-color')) document.getElementById('set-brand-color').value = appSettings.brandColor || '#4f46e5';
    if (document.getElementById('set-auto-report')) document.getElementById('set-auto-report').checked = appSettings.autoReportEnabled;
    if (document.getElementById('set-auto-report-day')) document.getElementById('set-auto-report-day').value = appSettings.autoReportDay || '1';
    if (document.getElementById('set-auto-report-type')) document.getElementById('set-auto-report-type').value = appSettings.autoReportType || 'global_onepager';

    // Отрисовка логотипа
    const logoPreview = document.getElementById('brand-logo-preview');
    const logoImg = document.getElementById('brand-logo-img');
    if (logoPreview && logoImg) {
        if (appSettings.brandLogo) {
            logoImg.src = appSettings.brandLogo;
            logoPreview.classList.remove('hidden');
        } else {
            logoPreview.classList.add('hidden');
        }
    }
    // ПРИНУДИТЕЛЬНАЯ ОТРИСОВКА ПОЛЕЙ СИНХРОНИЗАЦИИ
    if (typeof renderSyncUI === 'function') renderSyncUI();
    // --- УПРАВЛЕНИЕ КОРПОРАТИВНЫМ СТИЛЕМ ---
    const brandControls = document.getElementById('corp-branding-controls');
    if (brandControls) {
        const currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isAdmin = ['manager', 'deputy_manager', 'director'].includes(currentRole);
        let controlsHtml = '';

        // Кнопка публикации видна только руководству
        if (isAdmin) {
            controlsHtml += `
            <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex justify-between items-center mb-2 shadow-sm">
                <div>
                    <div class="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase">Для всей команды</div>
                    <div class="text-[9px] text-slate-500">Сделать стилем компании</div>
                </div>
                <button onclick="window.publishCorporateBranding()" class="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[9px] font-bold active:scale-95 shadow-md uppercase">Опубликовать</button>
            </div>`;
        }

        // Кнопка возврата к корпоративному стилю (если юзер поменял его вручную)
        if (appSettings.isBrandingCustomized) {
            controlsHtml += `
            <button onclick="window.resetToCorporateBranding()" class="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-2.5 rounded-lg text-[10px] font-bold active:scale-95 shadow-sm uppercase flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                Вернуть корпоративный стиль
            </button>`;
        }

        brandControls.innerHTML = controlsHtml;
    }
}


function resetSettingsToDefault() {
    if (!confirm("Сбросить все настройки к значениям по умолчанию?")) return;

    // 1. Сбрасываем объект
    appSettings = {
        userRole: 'engineer',
        cloudStatus: 'offline',
        assignedProjects: [],
        assignedContractor: '',
        contractorName: '', // <-- ДОБАВЛЕНО
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
        anaEngPareto: true, anaOpTrend: true, anaOpLeader: true, anaEngAi: true, anaEngPhotos: true, anaOpTopDefects: true,
        autoBackupEnabled: false, autoBackupDay: '5', autoBackupShare: false, autoManagerEnabled: false, autoManagerDay: '5',
        brandColor: '#1c2b39', brandLogo: '', autoReportEnabled: false, autoReportDay: '1', autoReportType: 'global_onepager'
    };
    rbiSaveThemePreference('auto');
    appSettings.theme = 'auto';
    // 2. Сохраняем в базу
    saveSettings('dummy', 'dummy');

    // 3. Обновляем селекторы на экране
    renderSettingsTab();

    // 4. ПРИМЕНЯЕМ настройки к интерфейсу (Этого не хватало!)
    applySettingsToUI();

    // 5. Пересчитываем отступы шапки с небольшой задержкой и плавно скроллим наверх
    setTimeout(() => {
        updateBodyPadding();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.classList.remove('modal-open'); // На всякий случай снимаем блокировку скролла
    }, 100);

    showToast("Настройки сброшены!");
}

function applySettingsToUI() {
    let theme = appSettings.theme || 'auto';

    if (theme === 'auto') {
        const prefersDark =
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;

        theme = prefersDark ? 'dark' : 'light';
    }

    if (!['light', 'dark', 'rbi-light', 'rbi-dark'].includes(theme)) {
        theme = 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);

    document.documentElement.classList.remove(
        'light',
        'dark',
        'rbi-light',
        'rbi-dark'
    );

    document.documentElement.classList.add(theme);

    /*
      Tailwind dark: классы работают только от класса dark.
      Поэтому для rbi-dark тоже добавляем dark.
    */
    if (theme === 'dark' || theme === 'rbi-dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }

    if (appSettings.fastMode) document.body.classList.add('fast-mode');
    else document.body.classList.remove('fast-mode');

    document.documentElement.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
    document.documentElement.classList.add(`font-${appSettings.fontSize || 'medium'}`);

    document.body.classList.remove('nav-pos-auto', 'nav-pos-top', 'nav-pos-bottom');
    document.body.classList.add(`nav-pos-${appSettings.navPosition || 'auto'}`);

    const dash = document.getElementById('header-dashboard');
    const dashExp = document.getElementById('dash-expanded-view');
    const dashIcon = document.getElementById('dash-expand-icon');

    if (appSettings.dashboardMode === 'hidden') {
        if (dash) dash.style.display = 'none';
    } else if (appSettings.dashboardMode === 'expanded') {
        if (dash) dash.style.display = 'block';
        if (dashExp) dashExp.classList.remove('hidden');
        if (dashIcon) dashIcon.style.display = 'none';
    } else {
        if (dash) dash.style.display = 'block';
        if (dashExp) dashExp.classList.add('hidden');
        if (dashIcon) dashIcon.style.display = 'flex';
    }

    // Плавный пересчет отступов без перерисовки контента
    setTimeout(() => {
        if (typeof updateBodyPadding === 'function') updateBodyPadding();
    }, 150);

    const activeTab = document.querySelector('.view-section.active');
    if (activeTab && typeof updateFabButton === 'function') updateFabButton(activeTab.id);
    const aiBody = document.getElementById('ai-settings-body');
    if (aiBody) aiBody.style.display = appSettings.aiEnabled ? 'block' : 'none';

    const personalKeyBlock = document.getElementById('personal-key-field');
    if (personalKeyBlock) {
        if (appSettings.usePersonalKey) personalKeyBlock.classList.remove('hidden');
        else personalKeyBlock.classList.add('hidden');
    }
    // ДОБАВЛЕНО: Применяем ролевые ограничения интерфейса
    if (typeof RbiRoles !== 'undefined') RbiRoles.applyUIConstraints();
    // ДОБАВЛЕНО: Инициализируем выпадающий список объектов
    if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();

    // ВАЖНО: селект показывает именно выбранную настройку, а не вычисленную light/dark тему
    const themeSelect = document.getElementById('set-theme');
    if (themeSelect && themeSelect.value !== (appSettings.theme || 'auto')) {
        themeSelect.value = appSettings.theme || 'auto';
    }

}



// Вывод списка пользовательских шаблонов для управления (Удаления)
const templatesList = document.getElementById('settings-user-templates-list');
if (templatesList) {
    // ИСПРАВЛЕНИЕ: Сортировка своих шаблонов по алфавиту перед выводом
    const customKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru'));

    if (customKeys.length === 0) {
        templatesList.innerHTML = `<div class="text-[10px] text-slate-400 italic py-2 text-center">Созданных чек-листов пока нет</div>`;
    } else {
        templatesList.innerHTML = customKeys.map(key => `
                <div class="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg">
                    <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate pr-2 flex-1">📋 ${userTemplates[key].title}</div>
                    <button onclick="deleteUserTemplate('${key}')" class="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded border border-red-100 dark:border-red-900 shadow-sm active:scale-95">УДАЛИТЬ</button>
                </div>
            `).join('');
    }
}

function toggleSetting(settingKey, element) {
    let val = element.type === 'checkbox' ? element.checked : element.value;
    appSettings[settingKey] = val;

    // Если юзер сам меняет цвет, ставим флаг "ручная настройка"
    if (settingKey === 'brandColor') {
        appSettings.isBrandingCustomized = true;
        saveSettings('isBrandingCustomized', true);
    }

    saveSettings(settingKey, val);
}


// Удаляет только восстановимые локальные копии, которые уже имеют облачный источник.
async function clearPdfCache() {
    const ok = confirm(
        'Очистить локальный кэш файлов?\n\n' +
        'Будут удалены только локальные копии файлов, которые уже есть в облаке.\n' +
        'Проверки, история, задачи, документы и файлы в Supabase не удаляются.\n\n' +
        'Без интернета очищенные файлы могут быть недоступны, но загрузятся снова при подключении.'
    );

    if (!ok) return;

    if (!window.RbiStorageManager || typeof window.RbiStorageManager.runManualRecoverableCacheCleanup !== 'function') {
        showToast('⚠️ Менеджер хранилища не загружен');
        return;
    }

    showToast('⏳ Очищаем восстановимый кэш...');

    await window.RbiStorageManager.runManualRecoverableCacheCleanup();
}
// RBI NEW: предпросмотр автоочистки без удаления файлов
async function previewStorageCleanup() {
    if (!window.RbiStorageManager || typeof window.RbiStorageManager.previewAdaptiveStorageCleanup !== 'function') {
        showToast('⚠️ Менеджер хранилища не загружен');
        return;
    }

    showToast('⏳ Проверяем файловый кэш...');

    const result = await window.RbiStorageManager.previewAdaptiveStorageCleanup('manual_preview');

    if (!result || result.error) {
        showToast('❌ Не удалось проверить кэш');
        return;
    }

    const msg =
        'Предпросмотр автоочистки:\n\n' +
        `Режим: ${result.mode}\n` +
        `Заполнено памяти: ${result.usagePercent.toFixed(1)}%\n` +
        `Свободно: ${result.freeMB.toFixed(1)} МБ\n\n` +
        `Можно безопасно очистить: ${result.candidatesCount} файлов / ${result.totalMB.toFixed(1)} МБ\n\n` +
        `Фото проверок: ${result.inspectionPhotos || 0} шт.\n` +
        `PDF-отчеты: ${result.reports || 0} шт.\n` +
        `Документы / база знаний: ${result.docs || 0} шт.\n` +
        `TWI: ${result.twi || 0} шт.\n` +
        `Узлы: ${result.nodes || 0} шт.\n` +
        `Практики: ${result.practices || 0} шт.\n` +
        `Эталоны: ${result.etalons || 0} шт.\n` +
        `Прочее: ${result.other || 0} шт.\n\n` +
        'Файлы сейчас НЕ удалены. Это только проверка.';

    alert(msg);
}

// === ВКЛАДКА: СПРАВОЧНИК (ПОДВКЛАДКА 1 - ЧЕК-ЛИСТЫ И СВЯЗИ) ===
// === ВКЛАДКА: СПРАВОЧНИК (ПОДВКЛАДКА 1 - ЧЕК-ЛИСТЫ И СВЯЗИ) iOS STYLE ===
function renderReferenceTab() {
    const root = document.getElementById('reference-items');
    const refSelect = document.getElementById('ref-checklist-selector');
    if (!root || !refSelect) return;

    const selectedKey = refSelect.value;
    if (!selectedKey) return;

    let checklist = [];
    const type = selectedKey.split('_')[0];
    const key = selectedKey.replace(type + '_', '');
    if (type === 'sys' && SYSTEM_TEMPLATES[key]) checklist = SYSTEM_TEMPLATES[key].groups;
    else if (type === 'user' && userTemplates[key]) checklist = userTemplates[key].groups;

    const searchTerm = document.getElementById('ref-search')?.value.toLowerCase() || "";

    // СОРТИРОВКА ПРИВЯЗАННЫХ КАРТ
    const linkedTwiCards = customTwiCards.filter(c => c.checklistKey === selectedKey);
    const globalCards = linkedTwiCards.filter(c => c.itemId === 'ALL' || !c.itemId);
    const itemCards = linkedTwiCards.filter(c => c.itemId && c.itemId !== 'ALL');

    let html = '';

    // --- ШАПКА: СТАТИСТИКА И ОБЩИЕ ИНСТРУКЦИИ ---
    html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm mb-4 relative overflow-hidden">
            <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Требования по виду работ</div>
            <div class="text-[16px] font-black text-slate-800 dark:text-white leading-tight mb-4">${refSelect.options[refSelect.selectedIndex].text.replace('▼', '').trim()}</div>
            
            <div class="flex gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div class="text-[10px] font-bold text-slate-600 dark:text-slate-400"><span class="text-indigo-600 text-[14px] font-black mr-1">${globalCards.length}</span> общих инстр.</div>
                <div class="text-[10px] font-bold text-slate-600 dark:text-slate-400"><span class="text-emerald-600 text-[14px] font-black mr-1">${itemCards.length}</span> инстр. к пунктам</div>
            </div>
    `;

    if (globalCards.length > 0) {
        html += `<div class="space-y-2">`;
        globalCards.forEach(c => {
            const isPdf = c.type === 'PDF';
            const icon = isPdf ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>' : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>';
            const colorClass = isPdf ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
            const typeName = isPdf ? 'Регламент' : 'Алгоритм';

            html += `
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between cursor-pointer active:scale-95 transition-transform" onclick="openTwiViewer('${c.id}')">
                    <div class="flex items-center gap-3 min-w-0 pr-2">
                        <div class="w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center shrink-0">${icon}</div>
                        <div class="min-w-0">
                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">${typeName}</div>
                            <div class="text-[12px] font-bold text-slate-800 dark:text-white truncate">${c.title}</div>
                        </div>
                    </div>
                    <div class="text-slate-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg></div>
                </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `<div class="text-[11px] text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">Общих инструкций к разделу пока нет</div>`;
    }
    html += `</div>`;

    // --- СПИСОК ПУНКТОВ (СВОРАЧИВАЕМЫЕ ГРУППЫ) ---
    checklist.forEach(g => {
        const filteredItems = g.items.filter(i =>
            i.n.toLowerCase().includes(searchTerm) ||
            (i.t && i.t.toLowerCase().includes(searchTerm))
        );

        if (filteredItems.length === 0) return;

        // Используем HTML <details> для нативного аккордеона в стиле iOS
        // Используем HTML <details> для нативного аккордеона в стиле iOS (Свернуты по умолчанию)
        html += `
        <details class="mb-3 bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden shadow-sm group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-4 text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 group-open:border-b border-[var(--card-border)] transition-colors select-none">
                <span class="pr-4 leading-snug">${g.group || g.title}</span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-2 space-y-2">`;

        filteredItems.forEach(i => {
            const safeNormText = (i.t || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ').replace(/\r/g, '');
            const specificItemCards = itemCards.filter(c => String(c.itemId) === String(i.id));

            // Проверяем наличие TWI
            const hasTwi = specificItemCards.length > 0;
            const twiAction = hasTwi ? `openTwiViewer('${specificItemCards[0].id}')` : `showToast('Для этого пункта пока нет TWI')`;

            // Умная кнопка норматива
            const docAction = i.ndId ? `openDocViewer('${i.ndId}')` : `findAndOpenND('${safeNormText}')`;
            const docIconColor = i.ndId ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-blue-600 bg-blue-50 border-blue-200';

            html += `
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-2 flex flex-col">
                    <div class="p-3">
                        <div class="flex items-start justify-between gap-3 mb-2">
                            <div class="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">
                                <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 mr-1">B${i.w}</span>
                                ${i.n}
                            </div>
                            <div class="flex gap-1 shrink-0">
                                <button onclick="${docAction}" class="w-8 h-8 rounded-lg ${docIconColor} flex items-center justify-center active:scale-90 border">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                                </button>
                                <button onclick="${twiAction}" class="w-8 h-8 rounded-lg ${hasTwi ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'} flex items-center justify-center active:scale-90">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div class="text-[11px] font-medium text-[var(--text-muted)] leading-relaxed border-t border-slate-50 dark:border-slate-800 pt-2">
                            ${i.t || 'Норматив не указан'}
                        </div>
                    </div>
                </div>`;
        });
        html += `</div></details>`;
    });

    root.innerHTML = html || `<div class="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Ничего не найдено</div>`;
}

// === ЛОГИКА ОТКРЫТИЯ СВЯЗАННЫХ ДОКУМЕНТОВ ===

// 1. Умный поиск Норматива
// Умный поиск Норматива (С промежуточным окном)
function findAndOpenND(normText) {
    if (!normText) return showToast('Норматив не указан');

    // Пытаемся вытащить ГОСТ или СП из текста для последующего поиска
    const match = normText.match(/(СП\s?\d+(\.\d+)*|ГОСТ\s?(Р\s)?\d+(-\d+)?)/i);
    const searchString = match ? match[0] : normText.substring(0, 15);

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-[14px] flex items-center justify-center border border-blue-100 dark:border-blue-800 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>`;
    document.getElementById('modal-title').innerText = "Нормативное требование";

    document.getElementById('modal-body').innerHTML = `
        <div class="text-[12px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 whitespace-pre-wrap">
            ${normText}
        </div>
        
        <div class="text-[10px] text-slate-500 font-bold mb-2 uppercase text-center border-t border-slate-100 dark:border-slate-700 pt-3">Нужно больше информации?</div>
        
        <button onclick="closeModal(); switchToNdSearch('${searchString}')" class="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm flex items-center justify-center gap-2">
            🔍 Искать полный документ в Базе НД
        </button>
    `;

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

// Вспомогательная функция для перехода в Справочник -> База НД
function switchToNdSearch(searchString) {
    switchTab('tab-reference');
    setTimeout(() => {
        const btns = document.querySelectorAll('.sub-tab-btn');
        if (btns[1]) switchReferenceSubTab('ref-sub-docs', btns[1]);

        const searchInput = document.getElementById('doc-search-input');
        if (searchInput) {
            searchInput.value = searchString;
            currentDocFilter = 'ALL';
            renderDocsList();
            showToast(`🔍 Ищем в базе: ${searchString}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
}

// === 2. ОТКРЫТИЕ УНИВЕРСАЛЬНОЙ ЧИТАЛКИ ИНСТРУКЦИЙ (БЕЗ ЭМОДЗИ) ===
async function openTwiViewer(twiId) {
    const card = customTwiCards.find(c => c.id === twiId);
    if (!card) return showToast('Ошибка: Инструкция не найдена');
    if (typeof gameLogAction === 'function') {
        gameLogAction('open_twi', twiId);
    }
    const overlayElement = document.getElementById('twi-viewer-overlay');
    if (overlayElement) overlayElement.dataset.currentTwiId = twiId;

    document.getElementById('viewer-twi-checklist').innerText = card.checklistName;
    document.getElementById('viewer-twi-title').innerText = card.title;

    const badgeEl = document.getElementById('viewer-twi-badge');
    const infoPanel = document.getElementById('viewer-twi-info-panel');
    const footer = document.getElementById('viewer-twi-footer');
    const content = document.getElementById('viewer-twi-content');

    content.innerHTML = '';
    content.classList.remove('p-0');

    // === ТИП 1: КАРТА ИНСПЕКТОРА (Правильно / Неправильно) ===
    if (card.type === 'INSPECTOR') {
        badgeEl.innerText = 'Технадзор';
        badgeEl.className = 'bg-blue-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
        infoPanel.classList.add('hidden');
        footer.classList.remove('hidden');
        content.classList.remove('p-0');

        let resolvedGood = card.photoGood ? await PhotoManager.getAsyncUrl(card.photoGood) || window.getPhotoSrc(card.photoGood) : null;
        let resolvedBad = card.photoBad ? await PhotoManager.getAsyncUrl(card.photoBad) || window.getPhotoSrc(card.photoBad) : null;

        let photoGoodHtml = resolvedGood ? `
            <div class="relative rounded-xl overflow-hidden shadow-sm border-2 border-green-500 cursor-pointer active:scale-95 transition-transform bg-slate-50 dark:bg-slate-900" onclick="openPhotoViewer('${card.photoGood}')">
                <div class="absolute top-0 left-0 w-full bg-gradient-to-b from-green-600/90 to-transparent p-2 text-white font-black text-[10px] uppercase tracking-widest drop-shadow-md flex items-center gap-1.5 z-10"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Правильно</div>
                <img src="${resolvedGood}" class="w-full h-48 md:h-64 object-contain">
            </div>` : `<div class="h-48 md:h-64 rounded-xl border-2 border-dashed border-green-300 flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500"><svg class="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="font-bold text-[9px] uppercase">Нет фото эталона</span></div>`;

        let photoBadHtml = resolvedBad ? `
            <div class="relative rounded-xl overflow-hidden shadow-sm border-2 border-red-500 cursor-pointer active:scale-95 transition-transform bg-slate-50 dark:bg-slate-900" onclick="openPhotoViewer('${card.photoBad}')">
                <div class="absolute top-0 left-0 w-full bg-gradient-to-b from-red-600/90 to-transparent p-2 text-white font-black text-[10px] uppercase tracking-widest drop-shadow-md flex items-center gap-1.5 z-10"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg> Брак</div>
                <img src="${resolvedBad}" class="w-full h-48 md:h-64 object-contain">
            </div>` : `<div class="h-48 md:h-64 rounded-xl border-2 border-dashed border-red-300 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500"><svg class="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="font-bold text-[9px] uppercase">Нет фото брака</span></div>`;

        let normText = 'Норматив не указан';
        const flatList = getFlatList(currentChecklist.length > 0 ? currentChecklist : []);
        const itemInfo = flatList.find(i => i.id == card.itemId);
        if (itemInfo) normText = itemInfo.t || normText;

        content.innerHTML = `
            <div class="p-4 space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    ${photoGoodHtml}
                    ${photoBadHtml}
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div class="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span class="w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></span>
                        <h4 class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Почему это важно (Риски)</h4>
                    </div>
                    <div class="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${card.whyImportant || 'Обоснование не заполнено'}</div>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div class="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span class="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></span>
                        <h4 class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Как проверять (Методика)</h4>
                    </div>
                    <div class="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${card.howToCheck || 'Методика не заполнена'}</div>
                    <div class="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Справочно (СНиП / ГОСТ):</div>
                        <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">${normText}</div>
                    </div>
                </div>
            </div>
        `;
    }
    // === ТИП 2: ПОШАГОВЫЙ TWI РАБОЧЕГО ===
    else if (card.type === 'WORKER') {
        badgeEl.innerText = 'Инструкция';
        badgeEl.className = 'bg-orange-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';

        infoPanel.classList.remove('hidden');
        footer.classList.remove('hidden');
        content.classList.remove('p-0');

        document.getElementById('viewer-twi-time').innerText = `~${card.totalTime || 0} мин`;
        document.getElementById('viewer-twi-steps-count').innerText = `${card.steps ? card.steps.length : 0} шагов`;

        let stepsHtml = '<div class="p-4 space-y-4">';
        if (card.steps && card.steps.length > 0) {
            for (let step of card.steps) {
                let resolvedStepPhoto = step.photo ? await PhotoManager.getAsyncUrl(step.photo) || window.getPhotoSrc(step.photo) : null;

                const photoHtml = resolvedStepPhoto ? `
                    <div class="mt-3 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative group" onclick="openPhotoViewer('${step.photo}')">
                        <img src="${resolvedStepPhoto}" class="w-full h-40 object-cover active:scale-95 transition-transform origin-center cursor-pointer">
                        <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold uppercase px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg> Увеличить</div>
                    </div>
                ` : '';

                stepsHtml += `
                    <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                        <div class="flex justify-between items-start mb-2">
                            <div class="font-black text-orange-600 dark:text-orange-400 text-[11px] uppercase tracking-wider bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">Шаг ${step.order}</div>
                            ${step.time ? `<div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${step.time} мин</div>` : ''}
                        </div>
                        <div class="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">${step.text}</div>
                        ${photoHtml}
                    </div>
                `;
            }
        } else {
            stepsHtml += `<div class="text-center text-slate-500 text-sm font-bold py-10">Шаги не заполнены</div>`;
        }
        stepsHtml += '</div>';
        content.innerHTML = stepsHtml;
    }
    // === ТИП 3: ВНЕШНИЙ PDF-ДОКУМЕНТ ===
    else if (card.type === 'PDF') {
        await window.rbiOpenPdfInTwiViewer(
            card.pdfData,
            card.title,
            card.checklistName || 'TWI / Регламент',
            card.pdfName || card.title || 'document.pdf',
            card.pdfSize || ''
        );
        return;

        badgeEl.innerText = 'PDF-Файл';
        badgeEl.className = 'bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
        infoPanel.classList.add('hidden');
        footer.classList.add('hidden');
        content.classList.add('p-0');

        if (card.pdfData) {
            try {
                let blobUrl = '';
                if (card.pdfData.startsWith('data:application/pdf')) {
                    const byteCharacters = atob(card.pdfData.split(',')[1]);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    blobUrl = URL.createObjectURL(blob);
                } else {
                    blobUrl = await PhotoManager.getAsyncUrl(card.pdfData) || PhotoManager.getSrc(card.pdfData);
                }
                const isAndroid = /Android/i.test(navigator.userAgent);
                content.innerHTML = `
                    <div class="w-full h-full flex flex-col relative bg-slate-100 dark:bg-slate-900">
                        <div class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 p-2 text-[10px] text-center font-bold flex justify-between items-center shrink-0 border-b border-indigo-100 dark:border-indigo-800">
                            <span>📱 Не листается вниз? Откройте в читалке 👉</span>
                            <a href="${blobUrl}" target="_blank" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase tracking-widest">Открыть</a>
                        </div>
                        <div style="-webkit-overflow-scrolling: touch; overflow-y: auto; flex: 1; width: 100%; min-height: 60vh;">
                            ${isAndroid ? `
    <div class="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-900">
        <div class="text-[13px] font-black text-slate-800 dark:text-white mb-2">PDF готов к открытию</div>
        <div class="text-[10px] font-bold text-slate-500 mb-4">На Android PDF надежнее открывать системной читалкой.</div>
        <a href="${blobUrl}" target="_blank" download="${card.pdfName || 'document.pdf'}"
           class="bg-red-600 text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase shadow-md">
           Открыть PDF
        </a>
    </div>
` : `
    <object data="${blobUrl}#view=FitH" type="application/pdf" class="w-full h-full border-none bg-white dark:bg-slate-800" style="min-height: 60vh;">
        <embed src="${blobUrl}#view=FitH" type="application/pdf" class="w-full h-full" />
    </object>
`}
                        </div>
                        <div class="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10">
                            <div class="min-w-0 pr-2 flex-1">
                                <div class="text-[11px] font-black text-slate-800 dark:text-white truncate">${card.pdfName || 'Документ.pdf'}</div>
                                <div class="text-[9px] font-bold text-slate-500">${card.pdfSize || 'Загружено из облака'}</div>
                            </div>
                            <div class="flex gap-2 shrink-0">
                                <a href="${blobUrl}" target="_blank" download="${card.pdfName || 'document.pdf'}" class="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex items-center justify-center" title="Скачать файл">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                content.dataset.blobUrl = blobUrl;
            } catch (err) {
                console.error(err);
                content.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-6 text-center"><div class="text-sm font-bold text-slate-500">Не удалось открыть PDF.</div></div>`;
            }
        } else {
            content.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-6 text-center"><div class="text-sm font-bold text-slate-500">PDF файл отсутствует.</div></div>`;
        }
    }
    // === СКВОЗНЫЕ ССЫЛКИ (ЭКОСИСТЕМА) ===
    let crossLinksHtml = '';
    // Ссылка на Видео
    if (card.videoLink) {
        crossLinksHtml += `
            <a href="${card.videoLink}" target="_blank" class="w-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Смотреть видеоинструкцию
            </a>`;
    }

    // Ссылка на Узел
    if (card.linkedNodeId) {
        crossLinksHtml += `
            <button onclick="closeTwiViewer(); setTimeout(()=>openNodeViewer('${card.linkedNodeId}'), 300)" class="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                Открыть Технический Узел
            </button>`;
    }

    // Ссылка на Норматив (НД)
    if (card.linkedDocId) {
        crossLinksHtml += `
            <button onclick="closeTwiViewer(); setTimeout(()=>openDocViewer('${card.linkedDocId}'), 300)" class="w-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                Смотреть Норматив (ГОСТ/СП)
            </button>`;
    }

    // Добавляем кнопки в конец контента (если они есть)
    if (crossLinksHtml) {
        content.insertAdjacentHTML('beforeend', `
            <div class="p-4 border-t border-slate-200 dark:border-slate-700 mt-4 bg-slate-100 dark:bg-slate-900/50">
                <div class="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest text-center">Связанные материалы</div>
                ${crossLinksHtml}
            </div>
        `);
    }
    const overlay = document.getElementById('twi-viewer-overlay');
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => { overlay.classList.remove('opacity-0'); }, 10);
}
// === RBI UNIVERSAL PDF VIEWER FIX v17.8.206 ===
// === RBI UNIVERSAL PDF VIEWER FIX v17.8.207 ===
window.rbiOpenPdfInTwiViewer = async function (pdfData, title, subtitle, fileName, fileSize) {
    const overlay = document.getElementById('twi-viewer-overlay');
    const content = document.getElementById('viewer-twi-content');
    const titleEl = document.getElementById('viewer-twi-title');
    const badgeEl = document.getElementById('viewer-twi-badge');
    const infoPanel = document.getElementById('viewer-twi-info-panel');
    const footer = document.getElementById('viewer-twi-footer');

    if (!overlay || !content) return showToast('Окно PDF не найдено');

    if (content.dataset.blobUrl && content.dataset.blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(content.dataset.blobUrl);
    }

    content.dataset.blobUrl = '';
    content.innerHTML = '';
    content.className = 'flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 p-0';

    if (titleEl) titleEl.innerText = title || 'PDF документ';

    if (badgeEl) {
        badgeEl.innerText = 'PDF';
        badgeEl.className = 'bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
    }

    if (infoPanel) infoPanel.classList.add('hidden');
    if (footer) footer.classList.add('hidden');

    try {
        let pdfBase64 = null;
        let pdfArrayBuffer = null;

        if (String(pdfData).startsWith('local://') || String(pdfData).startsWith('cloud://')) {
            pdfBase64 = await PhotoManager.getBase64(pdfData);
            pdfArrayBuffer = await base64ToArrayBuffer(pdfBase64);
        } else if (String(pdfData).startsWith('data:application/pdf')) {
            pdfBase64 = pdfData;
            pdfArrayBuffer = await base64ToArrayBuffer(pdfData);
        } else if (String(pdfData).startsWith('http')) {
            const res = await rbiFetchCloudFileNoBrowserCache(pdfData);
            if (!res.ok) throw new Error('PDF не скачался');
            pdfArrayBuffer = await res.arrayBuffer();
        } else {
            const realUrl = await PhotoManager.getAsyncUrl(pdfData) || pdfData;
            const res = await fetch(realUrl, { cache: 'no-store' });
            pdfArrayBuffer = await res.arrayBuffer();
        }

        const blob = new Blob([pdfArrayBuffer.slice(0)], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        content.dataset.blobUrl = blobUrl;

        content.innerHTML = `
            <div class="sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 p-2 text-[10px] font-bold flex justify-between items-center border-b border-indigo-100 dark:border-indigo-800">
                <span class="truncate pr-2">${subtitle || 'PDF документ'}</span>
                <div class="flex gap-2 shrink-0">
    <button onclick="window.open('${blobUrl}', '_blank')"
        class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase tracking-widest">
        Открыть стандартно
    </button>

    <a href="${blobUrl}" target="_blank" download="${fileName || 'document.pdf'}"
       class="bg-slate-700 text-white px-3 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase tracking-widest">
       Скачать
    </a>
</div>
            </div>
            <div id="rbi-pdf-pages" class="p-3 space-y-3"></div>
        `;

        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);

        const pagesRoot = document.getElementById('rbi-pdf-pages');
        const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            const containerWidth = Math.min(window.innerWidth - 24, 1100);
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / baseViewport.width;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.className = 'w-full bg-white rounded-xl shadow-sm border border-slate-200';
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            pagesRoot.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            await page.render({
                canvasContext: ctx,
                viewport
            }).promise;
        }

    } catch (e) {
        console.error('[Universal PDF Viewer]', e);
        content.innerHTML = `
            <div class="p-6 text-center">
                <div class="text-red-600 font-black text-[13px] mb-2">PDF не удалось открыть</div>
                <div class="text-slate-500 text-[11px]">Попробуйте синхронизировать файлы или открыть документ повторно.</div>
            </div>
        `;
        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    }
};
function closeTwiViewer() {
    const overlay = document.getElementById('twi-viewer-overlay');
    const content = document.getElementById('viewer-twi-content');

    overlay.classList.add('opacity-0');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');

        // Очищаем оперативную память от временного файла (Blob)
        if (content.dataset.blobUrl && content.dataset.blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(content.dataset.blobUrl);
            content.dataset.blobUrl = '';
        }

        content.innerHTML = '';
        customTwiCards = customTwiCards.filter(c => !c._tempViewerOnly);
    }, 300);
}

// === МЕНЮ СПРАВКИ В КАРТОЧКЕ ДЕФЕКТА (БЕЗ ЭМОДЗИ) ===
function openItemHelpMenu(id, event) {
    if (event) event.stopPropagation();

    const flat = getFlatList(currentChecklist);
    const itemData = flat.find(x => x.id === id);
    if (!itemData) return;

    document.getElementById('help-modal-title').innerText = itemData.n;

    const inspectorCard = customTwiCards.find(c => c.type === 'INSPECTOR' && String(c.itemId) === String(id));
    const generalCards = customTwiCards.filter(c =>
        (c.type === 'WORKER' || c.type === 'PDF') &&
        c.checklistKey === currentTemplateKey &&
        (String(c.itemId) === String(id) || c.itemId === 'ALL' || !c.itemId)
    );

    const listContainer = document.getElementById('help-modal-list');
    let html = '';

    if (inspectorCard) {
        html += `
            <div class="bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-xl p-3 shadow-md flex items-center justify-between cursor-pointer active:scale-95 transition-transform mb-4" 
                 onclick="closeItemHelpMenu(); setTimeout(() => openTwiViewer('${inspectorCard.id}'), 300)">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </div>
                    <div>
                        <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Карта Технадзора</div>
                        <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight">Эталон и примеры брака</div>
                    </div>
                </div>
                <div class="text-blue-500 font-black"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg></div>
            </div>
        `;
    }

    if (generalCards.length > 0) {
        html += `<div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1 border-b border-slate-200 dark:border-slate-700 pb-2 mt-2">Инструкции к виду работ</div>`;

        generalCards.forEach(c => {
            const isPdf = c.type === 'PDF';
            const iconSvg = isPdf
                ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
                : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';

            const colorClass = isPdf ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-orange-500 bg-orange-50 dark:bg-orange-900/30';
            const typeName = isPdf ? 'Внешний PDF-Регламент' : 'Пошаговое руководство (TWI)';

            html += `
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-transform" 
                     onclick="closeItemHelpMenu(); setTimeout(() => openTwiViewer('${c.id}'), 300)">
                    <div class="flex items-center gap-3 min-w-0 pr-2">
                        <div class="w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center shrink-0">${iconSvg}</div>
                        <div class="min-w-0">
                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">${typeName}</div>
                            <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight truncate">${c.title}</div>
                        </div>
                    </div>
                    <div class="text-slate-400 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg></div>
                </div>
            `;
        });
    }

    listContainer.innerHTML = html;

    const overlay = document.getElementById('item-help-modal-overlay');
    const content = document.getElementById('item-help-modal-content');

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => { content.classList.remove('translate-y-full'); }, 10);
}

function closeItemHelpMenu() {
    const overlay = document.getElementById('item-help-modal-overlay');
    const content = document.getElementById('item-help-modal-content');

    content.classList.add('translate-y-full');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

// === ВКЛАДКА: ИСТОРИЯ (С ФИЛЬТРАМИ v16.0) ===

// --- УМНОЕ ОБНОВЛЕНИЕ ФИЛЬТРОВ (ЧТОБЫ НЕ СБРАСЫВАЛСЯ ВЫБОР) ---
function populateSelect(id, values, defaultText) {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value; // Запоминаем, что выбрано сейчас
    el.innerHTML = `<option value="ALL">${defaultText}</option>` + values.map(v => `<option value="${v}">${v}</option>`).join('');
    if (values.includes(currentVal)) el.value = currentVal; // Восстанавливаем выбор
    else el.value = "ALL";
}



// === МАССОВЫЕ ОПЕРАЦИИ (ИСТОРИЯ) ===
function toggleAllHistory(checkbox) {
    const checkboxes = document.querySelectorAll('.hist-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

function getSelectedHistoryIds() {
    // Убираем parseInt, так как ID из облака - это текстовые строки (UUID)
    return Array.from(document.querySelectorAll('.hist-checkbox:checked')).map(cb => cb.value);
}

async function deleteSelectedHistory() {
    const ids = getSelectedHistoryIds();
    if (ids.length === 0) return showToast('Сначала выберите элементы галочками');

    // ДОБАВЛЕНО: Проверяем права на удаление для каждой выбранной проверки
    // Проверяем права удаления:
    // engineer — только свои проверки;
    // deputy_manager / manager — любые;
    // остальные роли не удаляют проектные проверки.
    if (window.RbiRoles && !window.RbiRoles.canCreate()) {
        return showToast('⛔ Ваша роль не позволяет удалять проверки');
    }

    let canDeleteAll = true;
    for (let id of ids) {
        let item = contractorArray.find(i => String(i.id) === String(id));
        if (!item) continue;

        const ownerName = item.inspectorName || item.inspector_name || '';
        if (window.RbiRoles && !window.RbiRoles.canDelete(ownerName)) {
            canDeleteAll = false;
            break;
        }
    }

    if (!canDeleteAll) {
        return showToast('⚠️ Инженер может удалить только свои проверки. Снимите галочки с чужих актов.');
    }

    if (!confirm(`Удалить выбранные проверки (${ids.length} шт)?`)) return;

    // НОВАЯ ЛОГИКА: Soft Delete (Мягкое удаление)
    // НОВАЯ ЛОГИКА: Soft Delete (Мягкое удаление с правильными флагами для облака)
    for (let id of ids) {
        let item = contractorArray.find(i => String(i.id) === String(id));
        if (item) {
            item._deleted = true;
            item.is_deleted = true; // <-- КРИТИЧЕСКИ ВАЖНО ДЛЯ ОБЛАКА
            item._deletedAt = new Date().toISOString();
            item.updatedAt = item._deletedAt;
            item.updated_at = item._deletedAt;

            item.source = 'local'; // <-- КРИТИЧЕСКИ ВАЖНО (иначе облако проигнорирует)
            item.syncStatus = 'not_synced';
            item.sync_status = 'not_synced';
            item.syncBlockReason = '';

            await dbPut(STORES.HISTORY, item);
        }
    }

    // Убираем удаленные из активного массива ОЗУ
    contractorArray = contractorArray.filter(i => !i._deleted);

    // Снимаем главную галочку "Выбрать всё"
    const selectAllCb = document.getElementById('hist-select-all');
    if (selectAllCb) selectAllCb.checked = false;

    // Обновляем интерфейс Истории
    renderHistoryTab();

    // Принудительно обновляем Аналитику, чтобы графики перестроились без удаленных проверок
    if (typeof renderCurrentAnalyticsTab === 'function') {
        renderCurrentAnalyticsTab();
    }
    updateDataSummary();

    // ---> ДОБАВЛЕНО: Даем команду облаку на удаление
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    // <---
    // Принудительно обновляем Аналитику и Задачи, чтобы всё пересчиталось без удаленных проверок
    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
    if (typeof gameForceUpdatePlan === 'function') gameForceUpdatePlan(true); // <-- ДОБАВЛЕНО
    updateDataSummary();
    showToast(`✅ Удалено успешно (${ids.length} шт)`);
}

function exportSelectedCsv() {
    const ids = getSelectedHistoryIds();
    if (ids.length === 0) return showToast('Выберите элементы для выгрузки');

    const selectedData = contractorArray.filter(i => ids.includes(i.id));
    const csv = exportToCSV(selectedData);
    if (csv) downloadFile(csv, `rbi_selected_${new Date().toLocaleDateString()}.csv`, 'text/csv');
}

// 100% СОВМЕСТИМАЯ МОДАЛКА ИСТОРИИ ИЗ v15
function showHistoryDetail(id) {
    let sortedArray = [...contractorArray].sort((a, b) => new Date(b.date) - new Date(a.date));
    let currIdx = sortedArray.findIndex(x => String(x.id) === String(id));

    if (currIdx === -1) {
        // Если не нашли в истории, ищем в эталонах
        sortedArray = [...etalonActsArray].sort((a, b) => new Date(b.date) - new Date(a.date));
        currIdx = sortedArray.findIndex(x => String(x.id) === String(id));
    }

    if (currIdx === -1) return;

    const item = sortedArray[currIdx];
    const newerId = currIdx > 0 ? sortedArray[currIdx - 1].id : null;
    const olderId = currIdx < sortedArray.length - 1 ? sortedArray[currIdx + 1].id : null;
    // ПЕРЕХВАТЧИК: Если это Акт-Эталон, открываем новую красивую модалку!
    if (item.templateKey === 'sys_etalon_act') {
        if (typeof openEtalonViewer === 'function') {
            // Задержка даёт время завершить все асинхронные операции
            setTimeout(() => openEtalonViewer(item.id), 200);
            return;
        }
    }

    const type = item.templateKey.split('_')[0];
    const key = item.templateKey.replace(type + '_', '');
    const specificChecklist = type === 'sys' && SYSTEM_TEMPLATES[key] ? SYSTEM_TEMPLATES[key].groups : (userTemplates[key] ? userTemplates[key].groups : []);

    let nOk = 0, nTotal = 0;

    const resultItems = getFlatList(specificChecklist).filter(i => item.state[i.id]).map(i => {
        nTotal++;
        let stTxt = 'OK', stCls = 'tag-green', cat = `B${i.w}`;
        if (item.state[i.id] === 'ok') nOk++;
        if (item.state[i.id] === 'fail') { stTxt = 'FAIL'; stCls = 'tag-red'; }
        if (item.state[i.id] === 'fail_escalated') { stTxt = '>1.5x (B3)'; stCls = 'tag-red shadow-sm'; cat = 'B3'; }

        let photoHtml = '';
        if (item.photos && item.photos[i.id]) {
            const rawPhotoSrc = item.photos[i.id];
            const safePhotoSrc = window.rbiEscapeAttr(rawPhotoSrc);

            photoHtml = `
        <img 
            src="${window.rbiPhotoPlaceholder}"
            data-local-src="${safePhotoSrc}"
            class="mt-2 w-20 h-20 object-cover rounded border border-slate-200 shadow-sm cursor-pointer"
            onclick="openPhotoViewer('${safePhotoSrc}')"
        >`;
        }

        let extraData = '';
        if (item.details && item.details[i.id]) {
            const d = item.details[i.id];
            if (d.fact && d.tol) extraData += `<div class="text-[10px] font-bold text-orange-600 mt-1">Факт: ${d.fact}${d.unit} при допуске ${d.tol}${d.unit} (Превышение ${(d.fact / d.tol).toFixed(1)}x)</div>`;
            if (d.comment) extraData += `<div class="text-[10px] text-slate-500 italic mt-1">${d.comment}</div>`;
        }

        return `<div class="border-b border-slate-100 dark:border-slate-700 py-2.5"><div class="flex items-start justify-between gap-3"><div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-snug"><span class="weight-tag wt-${i.w}">${cat}</span> ${i.n}${extraData}</div><span class="status-tag ${stCls}">${stTxt}</span></div>${photoHtml}</div>`;
    }).join('');

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-title').innerHTML = `
    <div class="flex justify-between items-center w-full">
        <button class="p-2 -ml-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 active:scale-90" ${newerId ? `onclick="showHistoryDetail('${newerId}')"` : 'disabled'}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg></button>
        <div class="text-center truncate flex-1 px-2 text-lg dark:text-white">${item.location}</div>
        <button class="p-2 -mr-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 active:scale-90" ${olderId ? `onclick="showHistoryDetail('${olderId}')"` : 'disabled'}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg></button>
    </div>`;

    document.getElementById('modal-body').innerHTML = `
        <div class="text-xs font-bold text-slate-500 mb-1">${item.contractorName}</div>
        <div class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">${item.templateTitle}</div>
        ${item.checkedStagesInfo ? `<div class="text-[9px] bg-slate-100 dark:bg-slate-800 p-2 rounded mt-2 mb-2 text-slate-500 dark:text-slate-400 font-bold leading-snug"><span class="text-slate-400 uppercase tracking-widest block mb-1">Проверенные этапы:</span> ${item.checkedStagesInfo.join('<br>')}</div>` : ''}
        <div class="text-[10px] text-slate-400 mb-4">${new Date(item.date).toLocaleString('ru-RU')}</div>
        
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">УрК Изделия</div>
                <div class="text-3xl font-black ${item.metrics.isDanger ? 'text-red-600' : (item.metrics.final < 85 ? 'text-orange-500' : 'text-green-600')}">${item.metrics.final}%</div>
            </div>
        </div>
        
        ${item.metrics.reason ? `<div class="text-[10px] font-bold text-red-600 mb-3 bg-red-50 p-3 rounded-lg border border-red-100 shadow-sm">${item.metrics.reason}</div>` : ''}
        
        ${item.templateKey === 'sys_etalon_act'
            ? `<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 text-center shadow-sm">
                   <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Это Акт-Эталон</div>
                   <button onclick="closeModal(); setTimeout(() => printEtalonAct('${item.id}'), 300)" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2">
                       🖨️ РАСПЕЧАТАТЬ (PDF)
                   </button>
               </div>`
            : `<button onclick="closeModal(); setTimeout(() => generatePrescriptionAi('${item.id}'), 300)" class="w-full mb-4 bg-slate-800 text-white dark:bg-white dark:text-slate-800 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2">
                   📄 Создать предписание (ИИ)
               </button>`
        }
        
        <div class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4">
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Инженерный breakdown</div>
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                <div>Проверено: <b>${nTotal} из ${item.metrics.totalCount}</b></div>
                <div>Соответствует: <b class="text-green-600">${nOk}</b></div>
                <div>Нарушения: <b class="text-red-600">${nTotal - nOk}</b></div>
                <div class="col-span-2 text-[10px] mt-1">B1: <b>${item.metrics.n_B1_fail}</b> | B2: <b>${item.metrics.n_B2_fail}</b> | B3: <b>${item.metrics.n_B3_fail}</b></div>
                <div class="col-span-2 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded mt-1 text-center font-bold">Формула: ${item.metrics.baseUrkPerc}% × ${item.metrics.kc.toFixed(2)} × ${item.metrics.kcrit.toFixed(2)} = ${item.metrics.final}%</div>
            </div>
        </div>
        <div class="text-[11px] font-bold text-slate-400 uppercase mb-2 mt-6">Детализация проверки</div>
        <div class="pb-6">${resultItems}</div>
    `;

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    if (typeof window.rbiHydrateLocalImages === 'function') {
        setTimeout(() => {
            window.rbiHydrateLocalImages(document.getElementById('modal-body'));
        }, 50);
    }
}
/* Файл: js/app.js (БЛОК 2: Инспекция, Свайпы, Аналитика, Данные) */

// === ШАПКА И ВЫБОР ЧЕК-ЛИСТА ===
// === ШАПКА И ВЫБОР ЧЕК-ЛИСТА ===
function renderSelector() {
    // Селекторы в шапке
    const sysGroup = document.getElementById('system-group');
    const userGroup = document.getElementById('user-group');

    // Селекторы в Справочнике
    const refSysGroup = document.getElementById('ref-system-group');
    const refUserGroup = document.getElementById('ref-user-group');

    // Селекторы на стартовом экране (Фейковые)
    const fakeSysGroup = document.getElementById('fake-system-group');
    const fakeUserGroup = document.getElementById('fake-user-group');

    // ИСПРАВЛЕНИЕ: Сортировка по алфавиту (по названию)
    let sysKeys = Object.keys(SYSTEM_TEMPLATES).sort((a, b) => SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title, 'ru'));
    let sysHtml = sysKeys.map(key => `<option value="sys_${key}">${SYSTEM_TEMPLATES[key].title}</option>`).join('');

    let userKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru'));
    let userHtml = userKeys.length > 0 ? userKeys.map(key => `<option value="user_${key}">${userTemplates[key].title}</option>`).join('') : `<option disabled>Своих шаблонов нет</option>`;

    if (sysGroup) sysGroup.innerHTML = sysHtml;
    if (userGroup) userGroup.innerHTML = userHtml;

    if (refSysGroup) refSysGroup.innerHTML = sysHtml;
    if (refUserGroup) refUserGroup.innerHTML = userHtml;

    if (fakeSysGroup) fakeSysGroup.innerHTML = sysHtml;
    if (fakeUserGroup) fakeUserGroup.innerHTML = userHtml;

    if (currentTemplateKey) {
        const sel = document.getElementById('checklist-selector');
        if (sel) sel.value = currentTemplateKey;
    }
}

// Изменение селектора ТОЛЬКО в Справочнике
function changeRefTemplate(selectEl) {
    const label = document.getElementById('ref-selector-label');
    if (label) label.innerHTML = `${selectEl.options[selectEl.selectedIndex].text} <span>▼</span>`;
    renderReferenceTab();
}

// === НАЧАЛО ЗАМЕНЫ 1: УМНЫЙ СБРОС ПОЛЕЙ === //
function changeTemplate(val) {
    if (val === 'HOME') {
        currentTemplateKey = '';
        if (document.getElementById('checklist-selector')) document.getElementById('checklist-selector').value = '';
        state = {}; details = {}; assignPhotosMap({});

        // Умный сброс (Инспектор остается, а Защищенные поля не трогаем)
        const pInp = document.getElementById('inp-project');
        const cInp = document.getElementById('inp-contractor');
        if (pInp && !pInp.hasAttribute('readonly') && !pInp.disabled) pInp.value = '';
        if (cInp && !cInp.hasAttribute('readonly')) cInp.value = '';
        if (document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

        switchTab('tab-audit');
        document.getElementById('empty-checklist-state').style.display = 'block';
        document.getElementById('audit-items').style.display = 'none';
        document.getElementById('audit-actions').style.display = 'none';

        const nav = document.getElementById('audit-group-nav');
        if (nav) { nav.innerHTML = ''; nav.classList.add('hidden'); }

        document.getElementById('data-block-summary')?.classList.add('hidden');
        if (document.getElementById('current-checklist-label')) document.getElementById('current-checklist-label').innerText = 'Вид работ не выбран';

        saveSessionData();
        if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
        return;
    }

    if (val === 'UPLOAD') {
        document.getElementById('json-input').click();
        document.getElementById('checklist-selector').value = currentTemplateKey || "";
        return;
    }

    currentTemplateKey = val;
    const type = val.split('_')[0];
    const key = val.replace(type + '_', '');

    if (type === 'sys' && SYSTEM_TEMPLATES[key]) currentChecklist = SYSTEM_TEMPLATES[key].groups;
    else if (type === 'user' && userTemplates[key]) currentChecklist = userTemplates[key].groups;

    // Сброс ответов при смене листа
    state = {}; details = {}; assignPhotosMap({});

    // НЕ стираем Защищенные поля (readonly)
    const pInp2 = document.getElementById('inp-project');
    const cInp2 = document.getElementById('inp-contractor');
    if (pInp2 && !pInp2.hasAttribute('readonly') && !pInp2.disabled) pInp2.value = '';
    if (cInp2 && !cInp2.hasAttribute('readonly')) cInp2.value = '';
    if (document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

    saveSessionData();

    if (document.getElementById('checklist-selector')) {
        document.getElementById('checklist-selector').value = val;
    }
    updateDataSummary();

    document.getElementById('empty-checklist-state').style.display = 'none';
    document.getElementById('audit-items').style.display = 'block';
    document.getElementById('audit-actions').style.display = 'grid';

    if (document.getElementById('tab-audit').classList.contains('active')) { render(); updateUI(); }
    if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
}

// === КОНЕЦ ЗАМЕНЫ 1 === //
// === КОНЕЦ ЗАМЕНЫ 1 === //

function updateDataSummary() {
    const proj = document.getElementById('inp-project')?.value.trim() || 'Объект';
    const contr = document.getElementById('inp-contractor')?.value.trim() || 'Подрядчик';
    const loc = document.getElementById('inp-location')?.value.trim() || 'Локация';

    const selectEl = document.getElementById('checklist-selector');
    const clName = selectEl?.options[selectEl.selectedIndex]?.text.replace('▼', '').trim() || 'Чек-лист не выбран';

    const summary = document.getElementById('data-block-summary');
    if (summary) summary.innerText = `✏️ ${clName} | ${proj} | ${contr} | ${loc}`;

    const labelEl = document.getElementById('current-checklist-label');
    if (labelEl) labelEl.innerText = clName;
}

function toggleDataBlock(forceOpen = false) {
    const content = document.getElementById('data-block-content');
    const summary = document.getElementById('data-block-summary');
    const icon = document.getElementById('data-toggle-icon');
    if (!content || !summary) return;

    if (forceOpen || content.style.display === 'none') {
        content.style.display = 'grid'; summary.classList.add('hidden'); icon.innerText = 'СВЕРНУТЬ ▲';
    } else {
        updateDataSummary(); content.style.display = 'none'; summary.classList.remove('hidden'); icon.innerText = 'РАЗВЕРНУТЬ ▼';
    }
}

// === ЛОГИКА ВЗАИМОДЕЙСТВИЯ (ОТКАЗ ОТ ПОЛНОЙ ПЕРЕРИСОВКИ) ===
function toggleOk(id) {
    if (state[id] === 'ok') {
        state[id] = null; delete photos[id]; delete details[id];
    } else {
        state[id] = 'ok'; delete details[id]; // Фото не удаляем!
    }
    updateCardDOM(id); updateUI(); scheduleSessionSave();
}

function toggleFail(id) {
    if (state[id] === 'fail' || state[id] === 'fail_escalated') {
        state[id] = null; delete photos[id]; delete details[id];
    } else {
        state[id] = 'fail'; delete details[id]; // Фото не удаляем!
    }
    updateCardDOM(id); updateUI(); scheduleSessionSave();
}

function toggleEscalation(id) {
    if (state[id] === 'fail_escalated') state[id] = 'fail';
    else if (state[id] === 'fail') state[id] = 'fail_escalated';
    updateCardDOM(id); updateUI(); scheduleSessionSave();
}

// === РЕНДЕР ОСМОТРА ===
function render() {
    if (!currentTemplateKey) return;
    const root = document.getElementById('audit-items');
    const navRoot = document.getElementById('audit-group-nav');
    if (!root) return;

    let html = ""; let navHtml = "";

    currentChecklist.forEach((g, gIndex) => {
        navHtml += `<button id="nav-btn-${gIndex}" onclick="scrollToGroup(${gIndex})" class="inline-block px-3 py-1.5 min-w-fit text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95 shrink-0">${g.group || g.title}</button>`;

        // Проверяем настройку свернутости по умолчанию
        const isCollapsed = appSettings.defaultGroupsCollapsed;
        const arrow = isCollapsed ? '▶' : '▼';
        const displayStyle = isCollapsed ? 'display: none;' : 'display: block;';

        html += `<div class="block-title flex justify-between items-center cursor-pointer select-none rounded-lg px-2 mt-4" onclick="toggleGroup(${gIndex})">
            <span id="group-title-${gIndex}">${arrow} ${g.group || g.title}</span>
            <span id="group-counter-${gIndex}" class="text-[10px] bg-[var(--card-border)] px-2 py-0.5 rounded text-[var(--text-muted)]">0/${g.items.length}</span>
        </div><div id="group_content_${gIndex}" class="transition-all origin-top" style="${displayStyle}">`;

        // Рендерим пункты как есть (сортировку ошибок наверх убрали)
        let itemsToRender = [...g.items];

        itemsToRender.forEach((i) => { html += `<div id="card_wrapper_${i.id}"></div>`; });
        html += `</div>`;
    });

    root.innerHTML = html;
    if (navRoot) { navRoot.innerHTML = navHtml; navRoot.classList.remove('hidden'); }

    // Рендер карточек
    currentChecklist.forEach(g => {
        g.items.forEach(i => updateCardDOM(i.id, i));
    });

    if (appSettings.swipeEnabled) initSwipes();
    updateGroupCounters();
}

function toggleGroup(index) {
    const content = document.getElementById(`group_content_${index}`);
    const title = document.getElementById(`group-title-${index}`);
    if (!content || !title) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        title.innerText = title.innerText.replace('▶', '▼');
    } else {
        content.style.display = 'none';
        title.innerText = title.innerText.replace('▼', '▶');
    }
}

function scrollToGroup(index) {
    const content = document.getElementById(`group_content_${index}`);
    if (content && content.previousElementSibling) {
        // Динамически вычисляем высоту текущей шапки
        const headerEl = document.getElementById('main-header');
        const headerOffset = headerEl ? headerEl.offsetHeight + 10 : 120;

        const elementPosition = content.previousElementSibling.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
}

// === КНОПКИ ЭТАПОВ (РАСКРАСКА ПО КАЧЕСТВУ) ===
function updateGroupCounters() {
    if (!currentTemplateKey) return;

    currentChecklist.forEach((g, gIndex) => {
        let answered = 0;
        let stageState = {};

        // Собираем стейт только для этого этапа
        g.items.forEach(i => {
            if (state[i.id]) {
                answered++;
                stageState[i.id] = state[i.id];
            }
        });

        const counterEl = document.getElementById(`group-counter-${gIndex}`);
        const navBtnEl = document.getElementById(`nav-btn-${gIndex}`);

        if (counterEl) counterEl.innerText = `${answered}/${g.items.length}`;

        if (navBtnEl) {
            // Если этап не начали проверять
            if (answered === 0) {
                navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95`;
            } else {
                // Если начали, считаем его УрК
                const stageMetrics = getProductMetrics(stageState, [g]);
                const f = stageMetrics.final;

                // Тонкий iOS-стиль (border вместо border-2, font-bold вместо font-black)
                if (f < 70 || stageMetrics.isDanger) {
                    navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 active:scale-95`;
                } else if (f < 85) {
                    navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400 active:scale-95`;
                } else {
                    navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 active:scale-95`;
                }
            }
        }
    });
}
// Функция принудительного разворачивания карточки без потери статуса OK
window.expandCard = function (id, event) {
    if (event) event.stopPropagation();
    const flatList = getFlatList(currentChecklist);
    const itemData = flatList.find(x => x.id === id);
    if (itemData) {
        itemData._forceExpand = true; // Ставим метку, что юзер хочет видеть ее развернутой
        updateCardDOM(id, itemData);
    }
};

function updateCardDOM(id, itemData = null) {
    const wrapper = document.getElementById(`card_wrapper_${id}`);
    if (!wrapper) return;

    if (!itemData) {
        const flat = getFlatList(currentChecklist);
        itemData = flat.find(x => x.id === id);
    }
    if (!itemData) return;

    const s = state[id];
    const i = itemData;

    let isEscalated = s === 'fail_escalated';
    let failActive = s === 'fail' || s === 'fail_escalated';
    let okActive = s === 'ok';

    let cardBgClass = failActive ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' : (okActive ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' : '');
    let indicatorClass = `indicator-${s ? (okActive ? 'ok' : (isEscalated ? 3 : i.w)) : i.w}`;

    let collapseClass = '';
    if (okActive && appSettings.autoCollapseOk && !itemData._forceExpand) {
        collapseClass = 'card-collapsed';
        cardBgClass = '';
    }

    if (appSettings.soundEnabled && state[id] && !itemData._justRendered) {
        if (state[id] === 'ok') audioOk.play().catch(() => { });
        else audioFail.play().catch(() => { });
    }
    itemData._justRendered = true;

    // === ИЩЕМ ПРИВЯЗАННЫЕ ИНСТРУКЦИИ (КНОПКА СПРАВКИ) ===
    // === ИЩЕМ ПРИВЯЗАННЫЕ ИНСТРУКЦИИ (КНОПКА СПРАВКИ) ===
    // === ИЩЕМ ПРИВЯЗАННЫЕ ИНСТРУКЦИИ (КНОПКА СПРАВКИ - iOS STYLE) ===
    const inspectorCard = customTwiCards.find(c => c.type === 'INSPECTOR' && String(c.itemId) === String(id));
    const workerCard = customTwiCards.find(c => c.type === 'WORKER' && c.checklistKey === currentTemplateKey && (String(c.itemId) === String(id) || c.itemId === 'ALL'));
    const pdfCard = customTwiCards.find(c => c.type === 'PDF' && c.checklistKey === currentTemplateKey && (String(c.itemId) === String(id) || c.itemId === 'ALL'));

    const hasAnyHelp = inspectorCard || workerCard || pdfCard;

    let helpBtnHtml = '';
    if (hasAnyHelp) {
        let btnClass = 'text-slate-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'; // Default / PDF

        if (inspectorCard && workerCard) {
            btnClass = 'text-purple-600 bg-purple-100 border-purple-300 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800';
        } else if (inspectorCard) {
            btnClass = 'text-blue-600 bg-blue-100 border-blue-300 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800';
        } else if (workerCard) {
            btnClass = 'text-green-600 bg-green-100 border-green-300 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800';
        }

        // Убрали animate-ping, оставили строгую iOS заливку
        helpBtnHtml = `
            <button onclick="openItemHelpMenu(${id}, event)" class="btn-status ${btnClass} !w-11 !h-11 !rounded-[12px] relative shadow-sm shrink-0" title="Инструкции и Справка">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path></svg>
            </button>
        `;
    } else {
        helpBtnHtml = `
            <button onclick="showToast('К этому пункту пока не привязаны инструкции')" class="btn-status text-slate-300 bg-transparent border-dashed border-slate-200 dark:text-slate-600 dark:border-slate-700 !w-11 !h-11 !rounded-[12px] shadow-sm shrink-0" title="Нет инструкций">
                <svg class="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path></svg>
            </button>
        `;
    }

    // === ОСНОВНЫЕ КНОПКИ (OK / FAIL) iOS Style ===
    let mainBtnsHtml = `
        <button onclick="toggleOk(${id})" class="btn-status ${okActive ? 'bg-green-500 text-white border-green-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button onclick="toggleFail(${id})" class="btn-status ${failActive ? 'bg-red-500 text-white border-red-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    // === ЛОГИКА ОТОБРАЖЕНИЯ АУДИТА И ЭТАЛОНА (БЫЛО/СТАЛО) ===
    let auditHtml = '';

    if (auditOriginalData) {
        const origState = auditOriginalData.state[id];
        const origPhoto = auditOriginalData.photos ? auditOriginalData.photos[id] : null;

        if (origState) {
            if (auditOriginalData.isCrossAudit) {
                // ПЕРЕКРЕСТНЫЙ АУДИТ: Показываем оценку прошлого инспектора
                const badgeColor = origState === 'ok' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200';
                const badgeText = origState === 'ok' ? 'OK' : 'FAIL';
                const photoBlock = origPhoto ? `<img src="${window.getPhotoSrc(origPhoto)}" class="w-8 h-8 object-cover rounded cursor-pointer border border-slate-300" onclick="openPhotoViewer('${origPhoto}')">` : '';

                auditHtml = `
                    <div class="mt-2 bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 p-2 rounded-lg flex justify-between items-center w-full">
                        <div>
                            <div class="text-[8px] font-black uppercase text-slate-400 mb-0.5">Оценка инженера (${auditOriginalData.inspector})</div>
                            <span class="text-[9px] font-black px-1.5 py-0.5 rounded border ${badgeColor}">${badgeText}</span>
                        </div>
                        ${photoBlock}
                    </div>
                `;
            } else if (auditOriginalData.isEtalonCompare && (origState === 'fail' || origState === 'fail_escalated')) {
                // ПРИЕМКА ЭТАЛОНА: Показываем фото прошлого брака "БЫЛО"
                if (origPhoto) {
                    auditHtml = `
                        <div class="mt-2 bg-orange-50 dark:bg-orange-900/10 border border-dashed border-orange-200 dark:border-orange-800 p-2 rounded-lg flex items-center gap-3 w-full">
                            <img src="${window.getPhotoSrc(origPhoto)}" class="w-12 h-12 object-cover rounded cursor-pointer border border-orange-300" onclick="openPhotoViewer('${origPhoto}')">
                            <div>
                                <div class="text-[9px] font-black uppercase text-orange-600 mb-0.5">📸 Было (Брак)</div>
                                <div class="text-[9px] font-bold text-orange-800 dark:text-orange-400 leading-tight">Прикрепите новое фото "СТАЛО", чтобы зафиксировать исправление эталона.</div>
                            </div>
                        </div>
                    `;
                }
            }
        }
    }

    let contentHtml = '';

    // === 1. МАКЕТ ПРИ FAIL (Двухуровневый: Текст сверху, Кнопки снизу) ===
    if (failActive) {
        let hasComment = details[id]?.comment && details[id].comment.trim() !== "";

        let commBtn = hasComment ?
            `<div class="relative shrink-0"><button onclick="toggleCommentField(${id})" class="btn-status text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 !w-11 !h-11 !rounded-[12px] shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button><div onclick="deleteComment(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
            `<button onclick="toggleCommentField(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button>`;

        let photoBtn = photos[id] ?
            `<div class="relative shrink-0"><img src="${window.getPhotoSrc(photos[id])}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-indigo-200 dark:border-indigo-800 shadow-sm object-cover" onclick="openPhotoViewer('${photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
            `<button onclick="triggerPhotoInput(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg></button>`;
        let escBtn = (i.w === 2) ? `<button onclick="toggleEscalation(${id})" class="btn-status ${isEscalated ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'text-orange-500 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'} !w-11 !h-11 !rounded-[12px] transition-all shrink-0 shadow-sm"><span class="text-[13px] font-bold">>1.5</span></button>` : '';

        let visualIndicatorHtml = isEscalated ? `<div class="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded w-fit mt-1 shadow-sm">Дефект учтен как B3</div>` : '';
        let commentBlockHtml = hasComment ? `<div class="mt-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-red-100 dark:border-red-800 shadow-sm leading-snug break-words w-full">💬 ${details[id].comment}</div>` : '';

        contentHtml = `
            <div class="flex flex-col w-full">
                <!-- Верх: Название дефекта (Нормы скрыты) -->
                <div class="w-full pointer-events-none mb-2">
                    <div class="text-[13px] font-bold leading-snug card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    ${visualIndicatorHtml}
                    ${commentBlockHtml}
                </div>
                
                <!-- Низ: Единый Тулбар прижатый вправо (Справа налево: Фото, Коммент, 1.5x) -->
                <div class="flex justify-end items-center flex-wrap gap-1.5 w-full mt-1 border-t border-red-100 dark:border-red-800 pt-3">
                    ${escBtn}
                    ${commBtn}
                    ${photoBtn}
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
    }
    // === 2. МАКЕТ ПРИ OK (Нормы скрыты, добавлено фото эталона) ===
    else if (okActive) {
        let photoBtnOk = photos[id] ?
            `<div class="relative shrink-0"><img src="${window.getPhotoSrc(photos[id])}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-green-300 shadow-sm object-cover" onclick="openPhotoViewer('${photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
            `<button onclick="triggerPhotoInput(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm text-green-600 bg-green-50 border-green-200" title="Добавить фото эталона"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg></button>`;
        contentHtml = `
            <div class="flex justify-between items-center w-full min-h-[44px]">
                <div class="flex-1 mr-3 min-w-0 pointer-events-none">
                    <div class="text-[13px] font-bold leading-snug card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${photoBtnOk}
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
    }
    // === 3. НЕЙТРАЛЬНЫЙ МАКЕТ (Видно всё) ===
    else {
        contentHtml = `
            <div class="flex justify-between items-center w-full min-h-[44px]">
                <div class="flex-1 mr-3 min-w-0 pointer-events-none">
                    <div class="text-[13px] font-bold leading-snug mb-1 card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    <div class="text-[11px] text-[var(--text-muted)] leading-snug norm-desc-text">${i.t}</div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
    }

    const cardHtml = `
    <div class="card-audit swipe-container ${indicatorClass} ${cardBgClass} ${collapseClass}" data-id="${id}" onclick="if(this.classList.contains('card-collapsed')) expandCard(${id}, event)">
        <div class="swipe-actions-bg swipe-bg-ok"><span class="ml-4">OK</span></div>
        <div class="swipe-actions-bg swipe-bg-fail"><span class="mr-4">FAIL</span></div>
        <div class="swipe-content p-2.5 bg-inherit border-inherit rounded-inherit h-full w-full bg-[var(--card-bg)] dark:bg-slate-800 transition-colors">
            ${contentHtml}
        </div>
    </div>`;

    wrapper.innerHTML = cardHtml;
}

// === СВАЙПЫ (ЛОГИКА) ===
// === СВАЙПЫ (УМНАЯ ЛОГИКА И ПЛАВНОСТЬ iOS) ===
function initSwipes() {
    const container = document.getElementById('audit-items');
    let startX = 0, currentX = 0, isDragging = false, currentCard = null, content = null;
    let bgOk = null, bgFail = null;

    container.addEventListener('touchstart', (e) => {
        if (!appSettings.swipeEnabled) return;
        const target = e.target.closest('.swipe-container');
        if (!target || e.target.closest('.btn-status') || e.target.closest('.photo-thumb')) return;

        currentCard = target;
        content = currentCard.querySelector('.swipe-content');
        bgOk = currentCard.querySelector('.swipe-bg-ok');
        bgFail = currentCard.querySelector('.swipe-bg-fail');

        startX = e.touches[0].clientX;
        isDragging = true;
        currentCard.classList.add('swiping');

        // Сбрасываем стили
        if (bgOk) bgOk.style.opacity = '0';
        if (bgFail) bgFail.style.opacity = '0';
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isDragging || !currentCard || !content) return;
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;

        // Ограничитель с эффектом "резинки"
        const maxSwipe = 100;
        let moveX = diff;
        if (diff > maxSwipe) moveX = maxSwipe + (diff - maxSwipe) * 0.2;
        if (diff < -maxSwipe) moveX = -maxSwipe + (diff + maxSwipe) * 0.2;

        content.style.transform = `translateX(${moveX}px)`;

        // Плавное проявление цвета подложки (Opacity)
        if (diff > 0 && bgOk && bgFail) {
            bgOk.style.zIndex = 1; bgFail.style.zIndex = 0;
            bgOk.style.opacity = Math.min(diff / 80, 1).toString();
            bgFail.style.opacity = '0';
        } else if (diff < 0 && bgOk && bgFail) {
            bgOk.style.zIndex = 0; bgFail.style.zIndex = 1;
            bgFail.style.opacity = Math.min(Math.abs(diff) / 80, 1).toString();
            bgOk.style.opacity = '0';
        }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (!isDragging || !currentCard || !content) return;
        isDragging = false;
        currentCard.classList.remove('swiping');

        const diff = currentX - startX;
        const id = parseInt(currentCard.dataset.id);

        // Возвращаем карточку на место
        content.style.transform = `translateX(0)`;
        if (bgOk) bgOk.style.opacity = '0';
        if (bgFail) bgFail.style.opacity = '0';

        // Отложенное срабатывание (ждем пока карточка визуально отскочит)
        if (diff > 80) {
            setTimeout(() => toggleOk(id), 150);
        } else if (diff < -80) {
            setTimeout(() => toggleFail(id), 150);
        }

        currentCard = null; content = null; bgOk = null; bgFail = null;
    });
}

// === ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА ===
// === ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА ===
// === ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА ===
function updateUI() {
    const p = currentTemplateKey ? getProductMetrics(state, currentChecklist) : null;
    const getTextColor = (val, isDanger) => {
        if (isDanger || val < 70) return 'text-white drop-shadow-md';
        if (val < 85) return 'text-slate-900';
        return 'text-white drop-shadow-md';
    };

    // Обновление метрик текущего осмотра
    if (!p) {
        if (document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = "0/0";
        if (document.getElementById('dash-p-bar')) document.getElementById('dash-p-bar').style.width = "0%";
        if (document.getElementById('dash-p-percent')) document.getElementById('dash-p-percent').innerText = "--%";
        ['dash-p-kc', 'dash-p-kcrit', 'dash-p-b2', 'dash-p-b3'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = "-"; });
    } else {
        if (document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = `${p.checkedCount}/${p.totalCount}`;
        if (document.getElementById('dash-p-bar')) {
            document.getElementById('dash-p-bar').style.width = `${p.final}%`;
            document.getElementById('dash-p-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${p.isDanger ? 'bg-red-500' : (p.final < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
        }
        if (document.getElementById('dash-p-percent')) {
            document.getElementById('dash-p-percent').innerText = `${p.final}%`;
            document.getElementById('dash-p-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(p.final, p.isDanger)}`;
        }
        if (document.getElementById('dash-p-kc')) document.getElementById('dash-p-kc').innerText = p.kc.toFixed(2);
        if (document.getElementById('dash-p-kcrit')) document.getElementById('dash-p-kcrit').innerText = p.kcrit.toFixed(2);
        if (document.getElementById('dash-p-b2')) document.getElementById('dash-p-b2').innerText = p.n_B2_fail;
        if (document.getElementById('dash-p-b3')) document.getElementById('dash-p-b3').innerText = p.n_B3_fail;
    }

    // Обновление интегральных метрик подрядчика
    const currentContr = document.getElementById('inp-contractor')?.value.trim();
    const filteredArr = currentContr ? contractorArray.filter(i => i.contractorName === currentContr && i.templateKey === currentTemplateKey) : [];

    // Модель 4.0: Порог старта расчета - 7 независимых проверок
    if (filteredArr.length < 7) {
        if (document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${filteredArr.length}/7 пров.`;
        if (document.getElementById('dash-c-bar')) document.getElementById('dash-c-bar').style.width = "0%";
        if (document.getElementById('dash-c-percent')) document.getElementById('dash-c-percent').innerText = "СБОР";
        ['dash-c-ks', 'dash-c-kcrit', 'dash-c-b3'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = "-"; });
    } else {
        const c = getContractorMetrics(filteredArr, userTemplates);
        if (c) {
            if (document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${c.count} пров.`;
            if (document.getElementById('dash-c-bar')) {
                document.getElementById('dash-c-bar').style.width = `${c.finalC}%`;
                document.getElementById('dash-c-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${c.isRedZone ? 'bg-red-500' : (c.finalC < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
            }
            if (document.getElementById('dash-c-percent')) {
                document.getElementById('dash-c-percent').innerText = `${c.finalC}%`;
                document.getElementById('dash-c-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(c.finalC, c.isRedZone)}`;
            }
            if (document.getElementById('dash-c-ks')) {
                const ksEl = document.getElementById('dash-c-ks');
                ksEl.innerText = c.ks.toFixed(2);
                ksEl.className = `font-black ${c.ks < 1 ? 'text-red-500' : 'text-green-600'}`;
            }
            if (document.getElementById('dash-c-kcrit')) {
                const kcritEl = document.getElementById('dash-c-kcrit');
                kcritEl.innerText = c.kcritC.toFixed(2);
                kcritEl.className = `font-black ${c.kcritC < 1 ? 'text-red-500' : 'text-green-600'}`;
            }
            if (document.getElementById('dash-c-b3')) document.getElementById('dash-c-b3').innerText = c.n_изделий_с_B3;
        }
    }

    const selectEl = document.getElementById('checklist-selector');
    const clName = selectEl?.options[selectEl.selectedIndex]?.text.replace('▼', '').trim() || 'Вид работ не выбран';
    const labelEl = document.getElementById('current-checklist-label');
    if (labelEl) labelEl.innerText = clName;

    updateGroupCounters();
}

// === СОХРАНЕНИЕ / ОЧИСТКА ===
// === СОХРАНЕНИЕ В ИСТОРИЮ (С ПОЛЯМИ СЕКЦИЯ/ЭТАЖ/ПОМЕЩЕНИЕ) ===
// === СОХРАНЕНИЕ В ИСТОРИЮ (С ЖЕЛЕЗНОЙ ПРИВЯЗКОЙ ИМЕНИ) ===
async function saveProductToArray() {
    // Ролевая защита создания проверки.
    if (window.RbiRoles && !window.RbiRoles.canCreate()) {
        return showToast("⛔ Ваша роль не позволяет создавать проверки");
    }
    const projInput = document.getElementById('inp-project');
    const inspInput = document.getElementById('inp-inspector');
    const contrInput = document.getElementById('inp-contractor');
    const secInput = document.getElementById('inp-section');
    const floorInput = document.getElementById('inp-floor');
    const roomInput = document.getElementById('inp-room');
    const locHidden = document.getElementById('inp-location');

    // 1. ПРИНУДИТЕЛЬНО тянем имя из настроек Профиля
    if (typeof appSettings !== 'undefined' && appSettings.engineerName) {
        if (inspInput) inspInput.value = appSettings.engineerName;
    }

    // 2. Проверяем скрытое поле инспектора отдельно
    if (!inspInput || !inspInput.value.trim()) {
        return showToast('⚠️ Укажите ваше Имя во вкладке "Инженер -> Профиль" перед сохранением!');
    }

    let hasError = false;

    // 3. Красим в красный пустые ВИДИМЫЕ поля (Объект, Подрядчик, Секция)
    [projInput, contrInput, secInput].forEach(el => {
        if (el && !el.value.trim()) {
            el.classList.add('border-red-500', 'bg-red-50');
            setTimeout(() => el.classList.remove('border-red-500', 'bg-red-50'), 3000);
            hasError = true;
        }
    });

    if (hasError) {
        showToast('⚠️ Заполните все поля со звездочкой (Объект, Подрядчик, Секция)!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    // --- АВТОМАТИЧЕСКАЯ ЗАЯВКА НА ОБЪЕКТ ---
    // Если облако включено, пользователь Инженер, и поле объекта было введено от руки (не из списка)
    const isCloudConnected = window.syncConfig && window.syncConfig.enabled && window.syncConfig.projectCode;
    const currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

    if (isCloudConnected && currentRole === 'engineer' && projInput.tagName.toLowerCase() === 'input') {
        const newObjName = projInput.value.trim();

        // Проверяем, нет ли уже такой заявки локально
        if (!appSettings.pendingAssignedProjects) appSettings.pendingAssignedProjects = [];
        const exists = appSettings.pendingAssignedProjects.some(p => p.raw_name === newObjName);

        if (!exists) {
            appSettings.pendingAssignedProjects.push({
                raw_name: newObjName,
                status: 'pending',
                created_at: new Date().toISOString()
            });
            dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });

            // Если мы онлайн, кидаем заявку в профиль Supabase для админа
            if (window.supabaseClient) {
                const stableInspectorId = `${window.syncConfig.projectCode}_${appSettings.engineerName}`.replace(/\s+/g, '_');
                window.supabaseClient.from('rbi_engineer_profiles').select('settings').eq('inspector_id', stableInspectorId).single().then(({ data }) => {
                    if (data) {
                        const s = data.settings || {};
                        const reqs = s.requestedProjects || [];
                        if (!reqs.some(r => r.raw_name === newObjName)) {
                            reqs.push({ raw_name: newObjName, status: 'pending', created_at: new Date().toISOString() });
                            s.requestedProjects = reqs;
                            window.supabaseClient.from('rbi_engineer_profiles').update({ settings: s }).eq('inspector_id', stableInspectorId).then();
                        }
                    }
                });
            }
            showToast(`🏢 Объект "${newObjName}" отправлен на согласование руководителю.`);
        }
    }

    // --- ЗАЩИТА ОТ ДУБЛИКАТОВ ---
    const locVal = locHidden.value.trim();
    const projVal = projInput.value.trim();
    const contrVal = contrInput.value.trim();

    const isDuplicate = contractorArray.some(item =>
        item.projectName === projVal &&
        item.contractorName === contrVal &&
        item.templateKey === currentTemplateKey &&
        item.location === locVal
    );

    if (isDuplicate) {
        return showToast('⚠️ Проверка с такой локацией уже существует в Истории!');
    }

    // --- УМНАЯ ФИКСАЦИЯ ОБЪЕКТА ПОСЛЕ ПЕРВОГО СОХРАНЕНИЯ ---
    let settingsChanged = false;
    if (!appSettings.defaultProject && projInput.value.trim()) {
        appSettings.defaultProject = projInput.value.trim();
        settingsChanged = true;
    }
    if (settingsChanged && !isDemoMode) {
        dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
        applySmartLocks();
    }

    let mergedState = {};
    let mergedDetails = {};
    let mergedPhotos = {};
    let checkedStageNames = [];
    let stagesToMetric = [];

    currentChecklist.forEach(group => {
        let hasAnswersInStage = false;
        group.items.forEach(item => {
            if (state[item.id]) {
                mergedState[item.id] = state[item.id];
                if (details[item.id]) mergedDetails[item.id] = details[item.id];
                if (photos[item.id]) mergedPhotos[item.id] = photos[item.id];
                hasAnswersInStage = true;
            }
        });

        if (hasAnswersInStage) {
            checkedStageNames.push(group.group || group.title);
            stagesToMetric.push(group);
        }
    });

    if (checkedStageNames.length === 0) {
        return showToast('⚠️ Чек-лист пуст. Заполните хотя бы один пункт.');
    }

    const finalMetrics = getProductMetrics(mergedState, stagesToMetric);
    const isFullCheck = checkedStageNames.length === currentChecklist.length;
    const stageNameLabel = isFullCheck ? 'Полная проверка' : 'Частичная проверка';

    // Геймификация
    if (finalMetrics.escalated_found && typeof gameLogAction === 'function') {
        gameLogAction('escalation_bonus', 'esc');
    }
    if (currentTemplateKey === 'sys_etalon_act' && Object.keys(mergedPhotos).length > 0 && typeof gameLogAction === 'function') {
        gameLogAction('etalon_accepted', 'etalon');
    }

    const selectEl = document.getElementById('checklist-selector');
    const tTitle = selectEl.options[selectEl.selectedIndex].text.replace('▼', '').trim();

    let instanceId = "default";
    // ИСПРАВЛЕНО: Заменили \D на [^\d-], чтобы не удалялся минус у подземных этажей (-1)
    if (secInput.value && floorInput.value) instanceId = `${secInput.value.replace(/[^\d-]/g, '')}_${floorInput.value.replace(/[^\d-]/g, '')}`;

    // --- ПЕРЕНОС ФОТО В БИНАРНОЕ ХРАНИЛИЩЕ ---
    let dbPhotos = {};
    for (let id in mergedPhotos) {
        const photoData = mergedPhotos[id];
        if (photoData.startsWith('data:image')) {
            dbPhotos[id] = await PhotoManager.saveLocal(photoData, 'hist');
        } else {
            dbPhotos[id] = photoData;
        }
    }

    // --- НОВОЕ: определяем объект и служебные статусы синхронизации ---
    const rawProjectValue = projInput.value.trim();
    const rawProjectName = projInput.dataset?.displayName || rawProjectValue;

    let projectCanonicalKey = rawProjectValue;
    let projectDisplayName = rawProjectName;

    // Если справочник объектов уже загружен — пытаемся найти canonical_key.
    // Это мягкий fallback, чтобы не ломать старую логику.
    if (typeof ObjectDirectory !== 'undefined' && Array.isArray(ObjectDirectory.objects)) {
        const clean = ObjectDirectory.cleanString
            ? ObjectDirectory.cleanString(rawProjectName)
            : rawProjectName.toLowerCase().trim();

        const foundObj = ObjectDirectory.objects.find(o => {
            const displayClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(o.display_name || '') : String(o.display_name || '').toLowerCase().trim();
            const keyClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(o.canonical_key || '') : String(o.canonical_key || '').toLowerCase().trim();

            const synonymMatch = Array.isArray(o.synonyms)
                ? o.synonyms.some(s => {
                    const synClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(s) : String(s).toLowerCase().trim();
                    return synClean === clean;
                })
                : false;

            return displayClean === clean || keyClean === clean || synonymMatch;
        });

        if (foundObj) {
            projectCanonicalKey = foundObj.canonical_key || '';
            projectDisplayName = foundObj.display_name || rawProjectName;
        }
    }

    // Если объект не найден в справочнике, временно используем введённое значение.
    if (!projectCanonicalKey) {
        projectCanonicalKey = rawProjectValue || rawProjectName;
    }
    const contractorNormalized = typeof window.normalizeInspectionContractorBeforeSave === 'function'
        ? await window.normalizeInspectionContractorBeforeSave()
        : {
            contractor_raw_name: contrInput.value.trim(),
            contractor_name: contrInput.value.trim(),
            contractor_canonical_key: '',
            contractor_normalization_status: 'pending'
        };
    // --- НОВОЕ: ОПРЕДЕЛЯЕМ РЕЖИМ РАБОТЫ (АУДИТ ИЛИ СТРОЙКОНТРОЛЬ) ---
    const isConstructionMode = (window.AppModeManager && window.AppModeManager.currentMode === 'construction') || window.activeAcceptanceRequestId;
    const inspType = isConstructionMode ? 'sk_acceptance' : 'rbi_audit';

    // Если это Стройконтроль, сразу блокируем синхронизацию этой записи, чтобы не сломать Supabase
    const initialSyncStatus = isConstructionMode ? 'blocked' : 'not_synced';
    const initialSyncReason = isConstructionMode ? 'Модуль СК временно отключен от облака' : '';
    // -----------------------------------------------------------------
    const newItem = {
        id: String(Date.now() + Math.floor(Math.random() * 1000)),
        date: new Date().toISOString(),

        // Старое поле оставляем для обратной совместимости.
        projectName: projectDisplayName,

        // Новые поля для объектной фильтрации.
        project_canonical_key: projectCanonicalKey,
        project_display_name: projectDisplayName,

        inspectorName: inspInput.value.trim(),
        contractorName: contractorNormalized.contractor_name || contrInput.value.trim(),
        contractor_name: contractorNormalized.contractor_name || contrInput.value.trim(),
        contractor_raw_name: contractorNormalized.contractor_raw_name || contrInput.value.trim(),
        contractor_canonical_key: contractorNormalized.contractor_canonical_key || '',
        contractor_normalization_status: contractorNormalized.contractor_normalization_status || 'pending',
        templateKey: currentTemplateKey,
        templateTitle: tTitle,
        section: secInput.value.trim(),
        floor: floorInput.value.trim(),
        room: roomInput.value.trim(),
        location: locHidden.value.trim(),
        instanceId: instanceId,
        stageId: 0,
        stageName: stageNameLabel,
        checkedStagesInfo: checkedStageNames,
        isCompleted: isFullCheck,
        state: JSON.parse(JSON.stringify(mergedState)),
        details: JSON.parse(JSON.stringify(mergedDetails)),
        photos: dbPhotos,
        metrics: finalMetrics,

        inspection_type: inspType, // <-- НОВОЕ: Метка типа проверки (Аудит или Приемка)

        // Двухконтурная модель данных.
        source: 'local',
        syncStatus: initialSyncStatus,     // <-- ИСПОЛЬЗУЕМ УМНЫЙ СТАТУС
        sync_status: initialSyncStatus,    // <-- ДУБЛИРУЕМ ДЛЯ НАДЕЖНОСТИ
        syncBlockReason: initialSyncReason,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    contractorArray.push(newItem);
    if (!isDemoMode) {
        await dbPut(STORES.HISTORY, newItem);

        // ---> ВСТАВКА ОЧЕРЕДИ: Логируем создание проверки в неубиваемую очередь
        if (window.SyncQueueManager) {
            window.SyncQueueManager.enqueue('SAVE_INSPECTION', newItem);
        }
        // <---
    }
    // === АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ДЕФЕКТОВ В РЕЕСТР СТРОЙКОНТРОЛЯ ===
    if (isConstructionMode && typeof window.ConstManager !== 'undefined') {
        let defectsCreated = 0;

        // Срок по умолчанию: +14 дней
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        const defaultDeadline = futureDate.toISOString().split('T')[0];

        // Проходим по всем пунктам с минусами в текущем чек-листе
        for (let itemId in mergedState) {
            const stateVal = mergedState[itemId];
            if (stateVal === 'fail' || stateVal === 'fail_escalated') {

                // Достаем инфу о пункте из шаблона
                const flatList = getFlatList(currentChecklist);
                const itemInfo = flatList.find(x => String(x.id) === String(itemId));
                if (!itemInfo) continue;

                // Формируем красивый текст (Нарушение + Норматив + Коммент)
                let cleanNorm = itemInfo.t ? itemInfo.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ") : "";
                let desc = `Нарушение: ${itemInfo.n}.`;
                if (cleanNorm && cleanNorm !== 'Без норматива') desc += ` Требования: ${cleanNorm}`;

                if (mergedDetails[itemId] && mergedDetails[itemId].comment) {
                    desc += `\nУточнение инженера: ${mergedDetails[itemId].comment}`;
                }

                // Категория
                let category = 'B2';
                if (stateVal === 'fail_escalated' || itemInfo.w === 3) category = 'B3';
                else if (itemInfo.w === 1) category = 'B1';

                const newDefectId = 'def_auto_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);

                // Переносим фото, если оно было
                let defectPhoto = mergedPhotos[itemId] || null;
                if (defectPhoto && window.photos) {
                    window.photos[newDefectId] = defectPhoto;
                }

                const newDefect = {
                    id: newDefectId,
                    floorId: window.ConstManager.currentFlrId || null, // Привязываем к этажу, если он был выбран
                    x: 50, // Дефолтные координаты (по центру), если потом захотят посмотреть на плане
                    y: 50,
                    templateKey: currentTemplateKey,
                    itemId: String(itemId),
                    itemName: itemInfo.n,
                    normText: itemInfo.t,
                    text: itemInfo.n,
                    category: category,
                    deadline: defaultDeadline,
                    contractor: contractorNormalized.contractor_name || contrInput.value.trim(),
                    description: desc,
                    photo: defectPhoto,
                    status: 'issued',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    created_by: inspInput.value.trim() || 'Инженер',
                    // Доп. поле для понимания, где это было найдено
                    locationDesc: locHidden.value.trim()
                };

                window.ConstManager.defects.push(newDefect);
                if (typeof dbPut === 'function' && typeof STORES !== 'undefined' && STORES.CONST_DEFECTS) {
                    await dbPut(STORES.CONST_DEFECTS, newDefect);
                }
                defectsCreated++;
            }
        }

        if (defectsCreated > 0) {
            setTimeout(() => {
                showToast(`🏗️ В реестр Стройконтроля автоматически добавлено ${defectsCreated} дефектов!`);
                if (window.ConstManager.currentView === 'list') {
                    window.ConstManager.renderDefectsList();
                }
            }, 1000);
        }
    }
    // ===============================================================
    updateSmartInputCache('projectName', projInput.value.trim());
    updateSmartInputCache('contractorName', contractorNormalized.contractor_name || contrInput.value.trim());
    updateSmartInputCache('section', secInput.value.trim());
    updateSmartInputCache('floor', floorInput.value.trim());
    updateSmartInputCache('room', roomInput.value.trim());

    // Обновляем план, если появилась новая связка
    const pastChecks = contractorArray.filter(c =>
        c.contractorName === (contractorNormalized.contractor_name || contrInput.value.trim()) &&
        c.templateKey === currentTemplateKey
    );
    if (pastChecks.length === 1 && typeof gameGenerateWeeklyPlan === 'function') {
        gameGenerateWeeklyPlan(true);
    } else if (typeof gameUpdatePlanProgress === 'function') {
        gameUpdatePlanProgress();
    }
    // ЗАКРЫТИЕ ПРИВЯЗАННОЙ ЗАДАЧИ АУДИТА
    // ЗАКРЫТИЕ ПРИВЯЗАННОЙ ЗАДАЧИ АУДИТА (С УЧЕТОМ ЦЕЛИ)
    if (window.activeTaskId) {
        const task = window.rbi_tasksData.find(t => t.id === window.activeTaskId);
        if (task) {
            // Увеличиваем счетчик выполненных проверок
            task.done = (task.done || 0) + 1;
            task.updatedAt = new Date().toISOString();

            // Закрываем задачу ТОЛЬКО если достигли цели
            if (task.done >= task.target) {
                task.status = 'done';
                task.resultComment = `Выполнено (${task.done}/${task.target})`;
            } else {
                task.resultComment = `В процессе (${task.done}/${task.target})`;
            }
            dbPut(STORES.TASKS, task);
        }
        window.activeTaskId = null; // Сбрасываем
    }

    // --- НОВОЕ: ЗАКРЫТИЕ ПРИВЯЗАННОЙ ЗАЯВКИ НА ПРИЕМКУ ---
    if (window.activeAcceptanceRequestId && window.ConstAcceptance) {
        const req = window.ConstAcceptance.requests.find(r => r.id === window.activeAcceptanceRequestId);
        if (req) {
            // Если в ходе проверки найден критический риск или оценка ниже 85% - отклоняем
            if (finalMetrics.isDanger || finalMetrics.final < 85) {
                req.status = 'rejected';
                showToast("❌ Работы отклонены по результатам чек-листа");
            } else {
                req.status = 'accepted';
                showToast("✅ Работы успешно приняты!");
            }
            // Обновляем заявку в базе
            if (typeof dbPut === 'function') dbPut(STORES.CONST_ACCEPTANCE, req);

            // Если вкладка приемки была отрендерена, обновляем её тихо
            if (window.ConstAcceptance.renderList) window.ConstAcceptance.renderList();
        }
        window.activeAcceptanceRequestId = null; // Сбрасываем флаг
    }
    state = {}; details = {}; assignPhotosMap({});
    secInput.value = ''; floorInput.value = ''; roomInput.value = ''; locHidden.value = '';

    scheduleSessionSave();

    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast(`✅ Сохранено в Историю!`);

    render();
    updateUI();
    // После локального сохранения только помечаем данные грязными.
    // Сама синхронизация решит, можно ли отправлять запись по роли и статусу.
    localStorage.setItem('rbi_cloud_dirty', '1');

    if (window.syncConfig && window.syncConfig.enabled && typeof triggerSync === 'function') {
        triggerSync('silent');
    }
}

// === ОБНОВЛЕНИЕ ПАМЯТИ ПОЛЕЙ ВВОДА (АВТОКОМПЛИТ) ===


function resetChecklist() {
    if (!confirm('Очистить только текущий чек-лист?')) return;
    state = {}; details = {}; assignPhotosMap({}); document.getElementById('inp-location').value = '';
    saveSessionData(); render(); updateUI();
}

async function clearHistory() {
    if (window.RbiRoles && !window.RbiRoles.isAdmin()) {
        return showToast("⛔ Полная очистка истории доступна только администратору или заместителю");
    }
    if (!confirm('Удалить ВСЮ историю проверок? Сами чек-листы и настройки останутся.')) return;

    // Очищаем массивы в памяти и в IndexedDB
    contractorArray = [];
    etalonActsArray = [];
    await dbClear(STORES.HISTORY);
    await dbClear(STORES.ETALON_ACTS);

    // Очищаем память умного автозаполнения (чтобы старые подрядчики не вылезали при вводе)
    localStorage.removeItem('smart_input_cache');

    // Очищаем логи геймификации HR
    if (typeof gameActionLogs !== 'undefined') {
        gameActionLogs = [];
        await dbPut(STORES.GAME_LOGS, { id: 'main', data: [] });
    }

    // Принудительно обновляем все связанные экраны
    renderHistoryTab();
    if (typeof renderCurrentAnalyticsTab === 'function') {
        renderCurrentAnalyticsTab();
    }
    updateDataSummary();

    showToast('🗑️ История проверок полностью очищена');
}


async function fullFactoryReset() {
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


// === АНАЛИТИКА И ОТЧЕТЫ ===


function renderAnalyticsTab() {
    const container = document.getElementById('analytics-contractors-container');
    if (!container) return;
    for (const key in chartInstances) { if (chartInstances[key]) chartInstances[key].destroy(); }
    chartInstances = {};

    if (contractorArray.length === 0) {
        container.innerHTML = `<p class="text-center py-6 text-slate-500 text-sm">Нет данных для аналитики.</p>`; return;
    }

    let baseArray = contractorArray;
    const fContr = document.getElementById('analytics-contractor-select')?.value || 'ALL';
    if (fContr !== "ALL") baseArray = baseArray.filter(i => i.contractorName === fContr);

    if (baseArray.length === 0) {
        container.innerHTML = `<p class="text-center py-6 text-slate-500 text-sm">По выбранным фильтрам нет данных.</p>`; return;
    }

    // Сокращенная версия генерации дашборда для совместимости с v15 (графики и эксперт)
    let sumUrk = 0; baseArray.forEach(i => sumUrk += i.metrics.final);
    const avgUrk = Math.round(sumUrk / baseArray.length);

    let html = `
    <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div class="text-[10px] text-slate-400 font-bold uppercase mb-2">Общая сводка</div>
        <div class="flex justify-between items-center mb-4">
            <div>Средний УрК: <b class="text-2xl">${avgUrk}%</b></div>
            <div>Проверок: <b>${baseArray.length}</b></div>
        </div>
    </div>`;

    // Генерация карточек по подрядчикам
    const uniqueCs = [...new Set(baseArray.map(i => i.contractorName))];
    uniqueCs.forEach(cName => {
        const cData = baseArray.filter(i => i.contractorName === cName);
        const uniqueTs = [...new Set(cData.map(i => i.templateKey))];

        uniqueTs.forEach(tKey => {
            const tData = cData.filter(i => i.templateKey === tKey);
            const tmplTitle = tData[0].templateTitle;
            const safeId = cName.replace(/\W/g, '_') + '_' + tKey;

            let expHtml = "";
            if (tData.length >= 7) {
                const metrics = getContractorMetrics(tData, userTemplates);
                const expert = getExpertConclusion(metrics, cName, tmplTitle, tData.length, safeId, customExpertConclusions);
                expHtml = expert.uiHtml;
            } else {
                expHtml = `<div class="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-[10px] mt-4 mb-4">Собрано ${tData.length} изд. Для расчета УрК нужно минимум 7.</div>`;
            }

            html += `
            <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <div class="font-black text-sm uppercase mb-1">${cName} </div>
                <div class="text-[10px] text-slate-500 mb-2 border-b pb-2">${tmplTitle}</div>
                ${expHtml}
            </div>`;
        });
    });

    container.innerHTML = html;
}

// === УМНЫЕ МУЛЬТИ-ФИЛЬТРЫ И ИСТОРИЯ ===
function updateAllDynamicFilters() {
    // Обновляем надписи на кнопках мульти-фильтров
    if (typeof updateFilterButtonLabels === 'function') {
        updateFilterButtonLabels();
    }
}

function applyHistoryFilters() {
    const periodSelect = document.getElementById('hist-filter-period');
    const periodLabel = document.getElementById('btn-hist-period-label');
    if (periodSelect && periodLabel) {
        periodLabel.querySelector('.truncate').innerText = periodSelect.options[periodSelect.selectedIndex].text;
    }

    // Если открыты отчеты - рендерим отчеты, если проверки - проверки
    if (window.currentHistoryViewMode === 'reports') {
        renderReportsList();
    } else {
        renderHistoryTab();
    }
}
// Генерация красивых SVG бейджей для Истории
function getSyncBadgeHtml(item) {
    const source = item.source || '';
    const syncStatus = item.syncStatus || item.sync_status || '';

    // Заготовки SVG иконок
    const iconLocal = `<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"></path></svg>`;
    const iconCloud = `<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"></path></svg>`;
    const iconBlocked = `<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

    if (syncStatus === 'blocked') {
        const reason = item.syncBlockReason || item.sync_block_reason || 'Отправка запрещена';
        return `<button onclick="event.stopPropagation(); showToast('Причина: ${String(reason).replace(/'/g, "\\'")}')" class="px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">${iconBlocked}Заблок.</button>`;
    }
    if (source === 'cloud' || syncStatus === 'synced') {
        return `<span class="px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">${iconCloud}</span>`;
    }
    return `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">${iconLocal}</span>`;
}

function renderHistoryTab() {
    const listDiv = document.getElementById('history-list');
    const emptyMsg = document.getElementById('hist-empty-msg');
    const countEl = document.getElementById('hist-count-total');
    if (!listDiv) return;

    if (contractorArray.length === 0) {
        listDiv.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (countEl) countEl.innerText = '0';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    const fSearch = document.getElementById('hist-search-text')?.value.toLowerCase() || '';
    const fPeriod = document.getElementById('hist-filter-period')?.value || 'ALL';
    const fPhoto = document.getElementById('hist-filter-photo')?.checked;
    const fB3 = document.getElementById('hist-filter-b3')?.checked;

    const fProj = activeMultiFilters.history.project || [];
    const fContr = activeMultiFilters.history.contractor || [];
    const fInsp = activeMultiFilters.history.inspector || [];

    let filteredArr = contractorArray;
    const now = new Date();

    if (fSearch) {
        filteredArr = filteredArr.filter(i => {
            const projectText = i.project_display_name || i.projectName || i.project_canonical_key || '';

            return (
                (i.location && i.location.toLowerCase().includes(fSearch)) ||
                (projectText && projectText.toLowerCase().includes(fSearch)) ||
                (i.inspectorName && i.inspectorName.toLowerCase().includes(fSearch)) ||
                (i.contractorName && i.contractorName.toLowerCase().includes(fSearch))
            );
        });
    }

    if (fProj.length > 0) {
        filteredArr = filteredArr.filter(i => { // <-- ИСПРАВЛЕНО: arr заменено на filteredArr
            const p = i.project_display_name || i.projectName || i.project_canonical_key || '';
            return fProj.includes(p) || fProj.includes(i.project_canonical_key);
        });
    }
    if (fContr.length > 0) filteredArr = filteredArr.filter(i => fContr.includes(i.contractorName));
    if (fInsp.length > 0) filteredArr = filteredArr.filter(i => fInsp.includes(i.inspectorName));

    if (fPeriod === 'DAY') filteredArr = filteredArr.filter(i => new Date(i.date).toDateString() === now.toDateString());
    else if (fPeriod === 'WEEK') { const w = new Date(); w.setDate(now.getDate() - 7); filteredArr = filteredArr.filter(i => new Date(i.date) >= w); }
    else if (fPeriod === 'MONTH') { const m = new Date(); m.setDate(now.getDate() - 30); filteredArr = filteredArr.filter(i => new Date(i.date) >= m); }

    if (fPhoto) filteredArr = filteredArr.filter(i => i.photos && Object.keys(i.photos).length > 0);
    if (fB3) filteredArr = filteredArr.filter(i => i.metrics && i.metrics.n_B3_fail > 0);

    if (countEl) countEl.innerText = filteredArr.length;

    if (filteredArr.length === 0) {
        listDiv.innerHTML = `<div class="text-sm text-slate-500 text-center bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">По заданным фильтрам проверок не найдено.</div>`;
        return;
    }

    // Группировка
    const grouped = {};
    filteredArr.forEach(item => {
        const cName = item.contractorName || 'Не указан';
        const pName = item.projectName || 'Без объекта';
        const groupKey = `${cName}_||_${pName}`; // Безопасный ключ

        const tTitle = item.templateTitle || 'Неизвестный вид работ';
        if (!grouped[groupKey]) grouped[groupKey] = {};
        if (!grouped[groupKey][tTitle]) grouped[groupKey][tTitle] = [];
        grouped[groupKey][tTitle].push(item);
    });

    const groupKeys = Object.keys(grouped);
    // Умная сортировка групп: наверху те подрядчики, кого проверяли последними
    groupKeys.sort((a, b) => {
        const newestA = Math.max(...Object.values(grouped[a]).flat().map(c => new Date(c.date).getTime()));
        const newestB = Math.max(...Object.values(grouped[b]).flat().map(c => new Date(c.date).getTime()));
        return newestB - newestA;
    });

    let html = '';
    let groupIndex = 0;

    const renderGroup = (gKey) => {
        const parts = gKey.split('_||_');
        const cName = parts[0];
        const pName = parts[1];
        const safeGroupName = `hist-group-${groupIndex++}`;

        let totalChecksInGroup = 0;
        Object.values(grouped[gKey]).forEach(arr => totalChecksInGroup += arr.length);

        // Компактный дизайн (уменьшены паддинги, иконка и шрифты)
        let groupHtml = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[14px] shadow-sm mb-2 overflow-hidden">
            <div class="flex justify-between items-center p-2.5 cursor-pointer active:bg-[var(--hover-bg)] transition-colors select-none" onclick="
                const body = document.getElementById('${safeGroupName}');
                const icon = this.querySelector('.chevron-icon');
                if (body.classList.contains('hidden')) {
                    body.classList.remove('hidden');
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    body.classList.add('hidden');
                    icon.style.transform = 'rotate(0deg)';
                }
            ">
                <div class="flex items-center gap-2.5 min-w-0 pr-2">
                    <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight">${cName}</div>
                        <div class="text-[9px] font-bold text-slate-400 truncate mt-[1px]">${pName}</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 pl-1">
                    <span class="text-[9px] font-bold text-slate-500 bg-[var(--hover-bg)] px-1.5 py-0.5 rounded-md border border-[var(--card-border)]">${totalChecksInGroup} шт</span>
                    <svg class="w-4 h-4 text-slate-400 transition-transform duration-300 transform rotate-0 chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
            
            <div id="${safeGroupName}" class="hidden border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 p-2">`;

        for (let tTitle in grouped[gKey]) {
            groupHtml += `<div class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1 mt-1.5 flex items-center gap-1"><svg class="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg> ${tTitle} <span class="opacity-70 font-bold">(${grouped[gKey][tTitle].length})</span></div>`;
            const reversed = [...grouped[gKey][tTitle]].sort((a, b) => new Date(b.date) - new Date(a.date));

            const visibleItems = reversed.slice(0, 10);
            const hiddenItems = reversed.slice(10);

            const renderRow = (item) => {
                const photoIcon = (item.photos && Object.keys(item.photos).length > 0) ? `📸` : '';
                const syncBadge = getSyncBadgeHtml(item); // <-- ПОЛУЧАЕМ БЕЙДЖ

                return `
                <div class="flex items-center gap-1.5 mb-1.5">
                    <input type="checkbox" class="hist-checkbox w-4 h-4 accent-indigo-600 rounded shrink-0 cursor-pointer" value="${item.id}">
                    <div class="flex-1 bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors active:scale-[0.98]" onclick="showHistoryDetail('${item.id}')">
                        <div class="flex justify-between items-center">
                            <div class="min-w-0 pr-2">
                                <div class="text-[10px] font-bold text-slate-800 dark:text-white truncate leading-tight">${item.location} <span class="text-[9px] ml-1">${photoIcon}</span></div>
                                <div class="text-[8px] text-slate-400 mt-0.5 truncate font-medium flex items-center">
                                    ${new Date(item.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} | Инсп: ${item.inspectorName || 'Не указан'}
                                    ${syncBadge} <!-- <-- ВСТАВИЛИ БЕЙДЖ СЮДА -->
                                </div>
                            </div>
                            <span class="status-tag ${item.metrics.statusCls} !text-[9px] !px-1.5 !py-0.5 shrink-0 shadow-sm">${item.metrics.final}%</span>
                        </div>
                    </div>
                </div>`;
            };

            groupHtml += visibleItems.map(renderRow).join('');

            if (hiddenItems.length > 0) {
                const hiddenGroupId = `${safeGroupName}-hidden-${tTitle.replace(/\W/g, '')}`;
                groupHtml += `<div id="${hiddenGroupId}" class="hidden">${hiddenItems.map(renderRow).join('')}</div>`;
                groupHtml += `<button onclick="document.getElementById('${hiddenGroupId}').classList.remove('hidden'); this.style.display='none'" class="w-full bg-[var(--hover-bg)] text-slate-500 dark:text-slate-400 py-2 mt-1 mb-2 rounded-lg text-[9px] font-bold uppercase active:scale-95 transition-colors border border-dashed border-[var(--card-border)]">Показать еще проверки (${hiddenItems.length})</button>`;
            }
        }
        groupHtml += `</div></div>`;
        return groupHtml;
    };

    // ВНЕШНЯЯ ПАГИНАЦИЯ: Изначально грузим 15 подрядчиков
    const VISIBLE_GROUPS = 15;
    const visibleGroupKeys = groupKeys.slice(0, VISIBLE_GROUPS);

    // Сохраняем скрытые группы в глобальную память, а не в скрытый HTML
    window._hiddenHistoryGroups = groupKeys.slice(VISIBLE_GROUPS);
    window._historyRenderGroupFunc = renderGroup;

    html += visibleGroupKeys.map(renderGroup).join('');

    if (window._hiddenHistoryGroups.length > 0) {
        html += `<div id="hidden-contractor-groups"></div>`;
        html += `<button id="load-more-history-btn" onclick="window.loadMoreHistoryGroups()" class="w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 py-3 mt-1 mb-6 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm">
            Загрузить остальные объекты (${window._hiddenHistoryGroups.length})
        </button>`;
    }

    listDiv.innerHTML = html;
}
// Ленивая подгрузка истории
window.loadMoreHistoryGroups = function () {
    const container = document.getElementById('hidden-contractor-groups');
    const btn = document.getElementById('load-more-history-btn');
    if (!container || !window._hiddenHistoryGroups || !window._historyRenderGroupFunc) return;

    const nextBatch = window._hiddenHistoryGroups.slice(0, 15);
    window._hiddenHistoryGroups = window._hiddenHistoryGroups.slice(15);

    // Рисуем новые карточки только в момент клика
    container.insertAdjacentHTML('beforeend', nextBatch.map(window._historyRenderGroupFunc).join(''));

    if (window._hiddenHistoryGroups.length > 0) {
        btn.innerText = `Загрузить остальные объекты (${window._hiddenHistoryGroups.length})`;
    } else {
        btn.style.display = 'none';
    }
};
// === ФОТО И КОММЕНТАРИИ (СОВМЕСТИМОСТЬ v15) ===
// === ФОТО И КОММЕНТАРИИ (С ПРИЧИНАМИ ДЕФЕКТОВ) ===
const DEFECT_CAUSES = [
    { code: 'C01', name: 'Нарушение технологии (ППР)', group: 'Технология' },
    { code: 'C02', name: 'Отклонение от проекта/РД', group: 'Проект' },
    { code: 'C03', name: 'Некачественный материал', group: 'Материалы' },
    { code: 'C04', name: 'Низкая квалификация рабочих', group: 'Персонал' },
    { code: 'C05', name: 'Отсутствие контроля (ИТР)', group: 'Организация' },
    { code: 'C06', name: 'Спешка / Нарушение сроков', group: 'Организация' },
    { code: 'C07', name: 'Погодные условия', group: 'Внешние факторы' },
    { code: 'C00', name: 'Иное (указать в комментарии)', group: 'Другое' }
];

let currentCommentId = null;

function toggleCommentField(id) {
    currentCommentId = id;
    const container = document.getElementById('modal-cause-checkboxes');
    const textarea = document.getElementById('modal-cause-comment');

    const currentData = details[id] || {};
    const savedCodes = currentData.causeCode ? currentData.causeCode.split(',') : [];

    // Генерируем чекбоксы
    let html = '';
    DEFECT_CAUSES.forEach(c => {
        const isChecked = savedCodes.includes(c.code) ? 'checked' : '';
        html += `<label class="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" value="${c.code}" class="cause-checkbox w-4 h-4 accent-indigo-600 rounded cursor-pointer" ${isChecked}> ${c.name}</label>`;
    });
    container.innerHTML = html;

    // Вырезаем причину из начала текста, чтобы в поле ввода был чистый текст
    let pureComment = currentData.comment || '';
    if (pureComment.startsWith('[')) {
        pureComment = pureComment.replace(/^\[.*?\]\s*/, '');
    }
    textarea.value = pureComment;

    const aiHint = document.getElementById('ai-hint-block');
    if (aiHint) { aiHint.innerHTML = ''; aiHint.classList.add('hidden'); }
    document.getElementById('comment-modal-overlay').style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeCommentModal() {
    document.getElementById('comment-modal-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    currentCommentId = null;
}

function saveCommentModal() {
    if (!currentCommentId) return;

    // Собираем все выбранные галочки
    const checkboxes = document.querySelectorAll('.cause-checkbox:checked');
    const checkedCodes = Array.from(checkboxes).map(cb => cb.value);
    const code = checkedCodes.join(','); // Сохраняем в базу через запятую

    const text = document.getElementById('modal-cause-comment').value.trim();

    details[currentCommentId] = details[currentCommentId] || {};
    details[currentCommentId].causeCode = code;

    // Собираем красивые названия причин
    let causeNames = checkedCodes.map(cCode => DEFECT_CAUSES.find(c => c.code === cCode)?.name).filter(Boolean).join(', ');

    // Формируем красивый итоговый комментарий для карточки
    let finalComment = text;
    if (causeNames) {
        finalComment = text ? `[${causeNames}] ${text}` : `[${causeNames}]`;
    }

    details[currentCommentId].comment = finalComment;

    updateCardDOM(currentCommentId);
    saveSessionData();

    if (typeof gameLogAction === 'function' && text.length > 15) {
        gameLogAction('comment_written', currentCommentId);
    }
    closeCommentModal();
}



function deleteComment(id, e) {
    if (e) e.stopPropagation();
    if (details[id]) {
        details[id].comment = "";
        details[id].causeCode = "";
    }
    updateCardDOM(id); saveSessionData();
}

function triggerPhotoInput(id) {
    syncPhotoTargetId(id);
    // Вместо прямого клика, открываем наше новое окно выбора
    document.getElementById('photo-source-modal').style.display = 'flex';
}
function removePhoto(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('Удалить фото?')) return;
    delete photos[id];
    updateCardDOM(id); saveSessionData();
}

// Обработка загрузки фото (Конвертация в сжатый формат для экономии IndexedDB)
// Обработка загрузки фото (Повышенное качество для презентаций)
// === ФОТОРЕДАКТОР (ЗАГРУЗКА И РИСОВАНИЕ) ===
let editorCanvas, editorCtx, isDrawing = false;
let editorImgElement = null; // Оригинальное изображение для сброса

function resolvePhotoTargetId() {
    return currentPhotoId || window.currentPhotoId || null;
}

function syncPhotoTargetId(id) {
    currentPhotoId = id || null;
    window.currentPhotoId = id || null;
}

window.ensureLocalPhotoRef = async function (photoRef, prefix = 'img', meta = {}) {
    if (!photoRef) return photoRef;
    const value = String(photoRef);
    if (value.startsWith('local://') || value.startsWith('http')) return photoRef;
    if (value.startsWith('data:') && typeof PhotoManager !== 'undefined' && typeof PhotoManager.saveLocal === 'function') {
        return await PhotoManager.saveLocal(photoRef, prefix, meta);
    }
    return photoRef;
};

async function updateConstDefectPhotoPreview(photoId) {
    const photoRef = photos[photoId];
    if (!photoRef) return;
    const previewDiv = document.getElementById('const-defect-photo-preview');
    const imgEl = document.getElementById('const-defect-img');
    if (!previewDiv || !imgEl) return;

    const ref = String(photoRef);
    if (ref.startsWith('local://') || ref.startsWith('cloud://')) {
        imgEl.src = typeof window.getPhotoSrc === 'function' ? window.getPhotoSrc(photoRef) : '';
        imgEl.setAttribute('data-local-src', photoRef);
        imgEl.setAttribute('data-defect-id', photoId);
        imgEl.onclick = () => openPhotoViewer(photoRef);
        if (typeof window.rbiHydrateLocalImages === 'function') {
            await window.rbiHydrateLocalImages(previewDiv);
        }
    } else {
        imgEl.removeAttribute('data-local-src');
        imgEl.setAttribute('data-defect-id', photoId);
        imgEl.src = typeof window.getPhotoSrc === 'function' ? window.getPhotoSrc(photoRef) : photoRef;
        imgEl.onclick = () => openPhotoViewer(photoRef);
    }

    previewDiv.classList.remove('hidden');
    const btn = document.getElementById('const-defect-photo-btn');
    if (btn) btn.innerHTML = '📷 Изменить фото';
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const photoId = resolvePhotoTargetId();
    // В обычном режиме проверяем, есть ли ID цели. Если это Эталон - пропускаем.
    if (window.activePhotoContext !== 'etalon' && !photoId) return;
    syncPhotoTargetId(photoId);

    const reader = new FileReader();
    reader.onload = function (e) {
        editorImgElement = new Image();
        editorImgElement.onload = function () {
            // Открываем оверлей редактора
            document.getElementById('photo-editor-overlay').style.display = 'flex';
            document.body.classList.add('modal-open');

            initPhotoEditor();

            // УМНЫЙ РОУТИНГ: Куда сохранять фото после рисования?
            const saveBtn = document.querySelector('#photo-editor-overlay button.text-green-400');
            if (window.activePhotoContext === 'etalon') {
                saveBtn.onclick = saveEtalonMarkupPhoto;
            } else {
                saveBtn.onclick = saveEditedPhoto;
            }
        }
        editorImgElement.src = e.target.result;
    }
    reader.readAsDataURL(file);
    event.target.value = ''; // Сброс инпута
}

function initPhotoEditor() {
    editorCanvas = document.getElementById('drawing-canvas');
    editorCtx = editorCanvas.getContext('2d');

    // Оптимизируем размер (HD качество, но не гигантское)
    const MAX_WIDTH = 1280; const MAX_HEIGHT = 1280;
    let width = editorImgElement.width;
    let height = editorImgElement.height;

    if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
    } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
    }

    editorCanvas.width = width;
    editorCanvas.height = height;

    // Рисуем картинку на холсте
    clearPhotoEditor();

    // Настраиваем кисть
    editorCtx.strokeStyle = '#ef4444'; // Красный цвет
    editorCtx.lineWidth = Math.max(4, width / 150); // Толщина зависит от размера фото
    editorCtx.lineCap = 'round';
    editorCtx.lineJoin = 'round';

    // Привязываем события рисования
    editorCanvas.onmousedown = startDrawing;
    editorCanvas.onmousemove = draw;
    editorCanvas.onmouseup = stopDrawing;
    editorCanvas.onmouseout = stopDrawing;

    editorCanvas.ontouchstart = startDrawing;
    editorCanvas.ontouchmove = draw;
    editorCanvas.ontouchend = stopDrawing;
}

function clearPhotoEditor() {
    if (!editorCtx || !editorImgElement) return;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(editorImgElement, 0, 0, editorCanvas.width, editorCanvas.height);
}

function getCanvasCoordinates(e) {
    const rect = editorCanvas.getBoundingClientRect();
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getCanvasCoordinates(e);
    editorCtx.beginPath();
    editorCtx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasCoordinates(e);
    editorCtx.lineTo(pos.x, pos.y);
    editorCtx.stroke();
}

function stopDrawing(e) {
    if (e) e.preventDefault();
    isDrawing = false;
    editorCtx.closePath();
}

function cancelPhotoEditor() {
    document.getElementById('photo-editor-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    syncPhotoTargetId(null);
    editorImgElement = null;
    window.activePhotoContext = null; // Очищаем контекст, чтобы не ломать другие загрузки
}

async function saveEditedPhoto() {
    const photoId = resolvePhotoTargetId();
    const photoContext = window.activePhotoContext;
    if (!photoId || !editorCanvas) return;

    // Добавляем штамп времени на финальное фото
    const now = new Date();
    const timestamp = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const w = editorCanvas.width;
    const h = editorCanvas.height;
    const fontSize = Math.max(16, Math.floor(w / 35)); // Адаптивный шрифт

    editorCtx.fillStyle = 'rgba(0,0,0,0.6)';
    editorCtx.fillRect(15, h - (fontSize + 20), fontSize * 10, fontSize + 15);
    editorCtx.font = `bold ${fontSize}px Arial`;
    editorCtx.fillStyle = 'white';
    editorCtx.fillText(timestamp, 25, h - 20);

    let photoRef = editorCanvas.toDataURL('image/jpeg', 0.85);

    // НОВОЕ: Если фото сделано Подрядчиком при устранении дефекта
    if (photoContext === 'defect_fix') {
        photoRef = await window.ensureLocalPhotoRef(photoRef, 'const_fix', {
            entityType: 'construction_defect_history',
            entityId: window.currentDefectFixId
        });

        showToast("📸 Фото устранения прикреплено!");
        cancelPhotoEditor();

        // Запускаем завершение смены статуса
        const userName = window.syncConfig?.engineerName || 'Подрядчик';
        const defect = window.ConstManager.defects.find(d => d.id === window.currentDefectFixId);
        if (defect && window.ConstDefectForm) {
            window.ConstDefectForm.applyStatusChange(defect, 'fixed', userName, window.currentDefectFixComment, photoRef);
        }
        return; // Выходим из функции, чтобы не идти по старому пути
    }

    if (photoContext === 'defect') {
        photoRef = await window.ensureLocalPhotoRef(photoRef, 'const', {
            entityType: 'construction_defect',
            entityId: photoId
        });
    }

    photos[photoId] = photoRef;
    showToast("📸 Фото с пометками сохранено!");

    if (photoContext === 'defect') {
        await updateConstDefectPhotoPreview(photoId);
    } else {
        updateCardDOM(photoId);
        scheduleSessionSave();
    }
    cancelPhotoEditor();
}

async function openPhotoViewer(src) {
    const viewer = document.getElementById('photo-viewer-overlay');
    const img = document.getElementById('photo-viewer-img');

    if (!viewer || !img) return;

    viewer.style.display = 'flex';
    img.style.opacity = '0.5';
    img.src = window.rbiPhotoPlaceholder || '';

    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    img.style.transform = `translate(0px, 0px) scale(1)`;

    setTimeout(() => viewer.classList.remove('opacity-0'), 10);

    let finalSrc = null;
    const srcStr = String(src || '');

    if (srcStr.startsWith('data:') || srcStr.startsWith('blob:')) {
        finalSrc = src;
    } else {
        try {
            if (src && typeof PhotoManager !== 'undefined' && typeof PhotoManager.getAsyncUrl === 'function') {
                const resolvedSrc = await PhotoManager.getAsyncUrl(src);

                if (
                    resolvedSrc &&
                    !String(resolvedSrc).startsWith('local://') &&
                    !String(resolvedSrc).startsWith('cloud://')
                ) {
                    finalSrc = resolvedSrc;
                }
            }
        } catch (e) {
            finalSrc = null;
        }
    }

    if (finalSrc) {
        img.src = finalSrc;
    } else {
        img.src = window.rbiPhotoCloudPlaceholder || window.rbiPhotoPlaceholder || '';
    }

    img.style.opacity = '1';
}

// НОВАЯ ФУНКЦИЯ: Правильно закрывает фото и чистит за собой память
function closePhotoViewer() {
    const viewer = document.getElementById('photo-viewer-overlay');
    const img = document.getElementById('photo-viewer-img');

    viewer.classList.add('opacity-0');
    setTimeout(() => {
        viewer.style.display = 'none';
        // Если картинка была временной ссылкой (blob:), очищаем память, чтобы iOS не вылетел
        if (img.src && img.src.startsWith('blob:')) {
            // URL.revokeObjectURL(img.src); // Пока закомментируем жесткую очистку, т.к. кэш держит PhotoManager
            img.src = '';
        }
    }, 300);
}


// === ПОДСКАЗКИ СПРАВКИ (v15) ===
function showHelp(type) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    document.getElementById('modal-icon').innerHTML = ``;

    if (type === 'contractor') {
        title.innerText = "Краткая инфо-справка об УрК";
        body.innerHTML = `
        <div class="space-y-3 text-sm leading-6">
            <div class="rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-sky-500"></div><p class="font-semibold text-sky-900 dark:text-sky-300">Что считает система</p></div>
                <div class="space-y-2 text-sky-900 dark:text-sky-400">
                    <p><b>УрК изделия</b> — качество конкретного узла или участка работ.</p>
                    <p><b>УрК подрядчика</b> — качество подрядчика по массиву однотипных проверок.</p>
                    <p class="text-sky-800 dark:text-sky-200"><b>Чем выше процент, тем выше качество.</b></p>
                </div>
            </div>
            <div class="rounded-2xl border border-violet-200 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-violet-500"></div><p class="font-semibold text-violet-900 dark:text-violet-300">Категории дефектов</p></div>
                <div class="grid grid-cols-1 gap-2 text-violet-900 dark:text-violet-400">
                    <div class="rounded-xl border border-violet-100 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3"><b>B1</b> — незначительный дефект</div>
                    <div class="rounded-xl border border-violet-100 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3"><b>B2</b> — значительный дефект</div>
                    <div class="rounded-xl border border-violet-100 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3"><b>B3</b> — критический дефект</div>
                </div>
                <div class="mt-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3 text-violet-800 dark:text-violet-300">
                    <p class="font-medium mb-1">Правило 1.5</p><p>Если дефект относится к <b>B2</b>, но отклонение превышает допустимое более чем в <b>1.5 раза</b>, он переводится в <b>B3</b>.</p>
                </div>
            </div>
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-emerald-500"></div><p class="font-semibold text-emerald-900 dark:text-emerald-300">УрК изделия</p></div>
                <div class="space-y-3 text-emerald-900 dark:text-emerald-400">
                    <p>Считается базовый процент качества, затем применяются штрафы за концентрацию дефектов и за критичность.</p>
                    <code class="inline-block rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 px-2 py-1 text-xs">УрК = Базовый УрК × Kc × Kcrit</code>
                </div>
            </div>
            <div class="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-amber-500"></div><p class="font-semibold text-amber-900 dark:text-amber-300">Ключевые правила</p></div>
                <div class="space-y-2">
                    <div class="rounded-xl border border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-slate-800 p-3 text-amber-900 dark:text-amber-400">Если есть <b>B2</b> или штрафы, итог <b>не выше 84%</b>.</div>
                    <div class="rounded-xl border border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-slate-800 p-3 text-amber-900 dark:text-amber-400">Если есть <b>B3</b>, изделие считается <b>непринятым</b>.</div>
                </div>
            </div>
        </div>`;
    } else if (type === 'analytics' || type === 'rating') {
        title.innerText = "Справка по Аналитике";
        body.innerHTML = `<div class="space-y-3 text-sm leading-relaxed">
            <p>В этом разделе отображается статистика на основе сохраненных проверок.</p>
            <ul class="list-disc pl-4 space-y-2 text-xs">
                <li><b>Рейтинг</b> строится только если подрядчик имеет <b>минимум 7 проверок</b> по одному виду работ.</li>
                <li>Учитывается не только балл, но и стабильность качества (волатильность).</li>
                <li>Вы можете выгрузить графики и отчеты в PDF для отправки руководству.</li>
            </ul>
        </div>`;
    }

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

// === МОДАЛКИ РАСЧЕТОВ (По клику на мини-дашборд) ===
// Назначаем клики на мини-дашборд
document.addEventListener("DOMContentLoaded", () => {
    const pCard = document.getElementById('mini-p-bar')?.parentElement;
    const cCard = document.getElementById('mini-c-urk')?.parentElement;

    if (pCard) pCard.addEventListener('click', showProductMath);
    if (cCard) cCard.addEventListener('click', showContractorDetails);
});

// === МОДАЛКИ РАСЧЕТОВ ===
function showProductMath() {
    if (!currentTemplateKey) return;
    const p = getProductMetrics(state, currentChecklist);
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');

    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[14px] flex items-center justify-center border border-indigo-100 dark:border-indigo-800 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="8" y="8" width="8" height="2"></rect><line x1="8" y1="14" x2="8.01" y2="14"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="16" y1="14" x2="16.01" y2="14"></line></svg></div>`;
    document.getElementById('modal-title').innerText = "Расчет УрК Осмотра";

    if (!p) {
        body.innerHTML = "<p>Проверьте хотя бы один пункт для отображения оценки.</p>";
    } else {
        body.innerHTML = `
        <div class="bg-[var(--hover-bg)] p-4 rounded-xl border border-[var(--card-border)] mb-4">
            <div class="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-2">Формула (Текущий осмотр)</div>
            <div class="text-sm font-black font-mono bg-[var(--card-bg)] p-2 rounded border border-[var(--card-border)] text-center">УрК = База × Kc × Kcrit</div>
            <div class="text-center mt-2 text-2xl font-black ${p.final < 70 ? 'text-red-600' : (p.final < 85 ? 'text-orange-500' : 'text-green-600')}">${p.final}%</div>
        </div>
        <ul class="text-sm space-y-3 mb-4">
            <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                <span><b>Базовый балл</b><br><span class="text-[10px] text-[var(--text-muted)]">Доля пройденных пунктов (по весам)</span></span>
                <span class="font-black text-lg">${p.baseUrkPerc}%</span>
            </li>
            <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                <span><b>Концентрация (Kc)</b><br><span class="text-[10px] text-[var(--text-muted)]">Штраф за долю брака B2</span></span>
                <span class="font-black text-lg ${p.kc < 1 ? 'text-red-500' : 'text-green-600'}">${p.kc.toFixed(2)}</span>
            </li>
            <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                <span><b>Критичность (Kcrit)</b><br><span class="text-[10px] text-[var(--text-muted)]">Штраф за наличие B3</span></span>
                <span class="font-black text-lg ${p.kcrit < 1 ? 'text-red-500' : 'text-green-600'}">${p.kcrit.toFixed(2)}</span>
            </li>
        </ul>
        <div class="text-[11px] font-bold ${p.final > 84 && (p.kc < 1 || p.kcrit < 1 || p.n_B2_fail > 0) ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'} p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm leading-relaxed">
            <b>Правило потолка (Cap84):</b> Если допущен B2 или применены штрафы, итоговый балл не может превышать 84%.
        </div>`;
    }
    document.body.classList.add('modal-open'); modal.style.display = 'flex';
}

function showContractorDetails() {
    if (!currentTemplateKey) return;
    const currentContr = document.getElementById('inp-contractor').value.trim();
    const filteredArr = currentContr ? contractorArray.filter(i => i.contractorName === currentContr && i.templateKey === currentTemplateKey) : [];

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl">M</div>`;
    document.getElementById('modal-title').innerText = currentContr ? `Аналитика: ${currentContr}` : "Аналитика подрядчика";
    const body = document.getElementById('modal-body');

    if (filteredArr.length < 7) {
        body.innerHTML = `<p class="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold leading-snug text-center">Сбор данных: <b class="text-lg text-indigo-600">${filteredArr.length} / 7</b><br><br>Для расчета интегрального рейтинга подрядчика и штрафных коэффициентов требуется минимум <b>7</b> независимых проверок.</p>`;
    } else {
        const c = getContractorMetrics(filteredArr, userTemplates);
        let warningHtml = ''; // Убрали предупреждение, так как до 7 проверок модалка теперь блокируется

        body.innerHTML = `
            ${warningHtml}
            <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 mb-5 shadow-sm relative overflow-hidden">
                <div class="text-[10px] uppercase font-bold text-indigo-500 mb-2 flex justify-between items-center">
                    <span>УрК Подрядчика</span>
                    <span class="text-[9px] font-bold ${c.confCls} px-2 py-0.5 rounded border uppercase">${c.confStatus}</span>
                </div>
                <div class="flex items-center justify-between mt-1">
                    <div class="text-5xl font-black text-indigo-700 dark:text-indigo-400">${c.finalC}%</div>
                    <div class="text-right">
                        <span class="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded uppercase block w-fit ml-auto border border-indigo-200">${c.statusTxt}</span>
                        <div class="text-[9px] text-indigo-500 mt-1 font-bold">Выборка: ${c.count} пров.</div>
                    </div>
                </div>
            </div>
            
            <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Штрафные коэффициенты</div>
            <ul class="text-[13px] space-y-3 mb-5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm">
                <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                    <span class="leading-snug"><b>Системный брак (Ks)</b><br><span class="text-[10px] text-[var(--text-muted)] mt-0.5">Повтор дефекта в ${c.maxFailRate.toFixed(1)}% проверок</span></span>
                    <span class="font-black text-lg ${c.ks < 1 ? 'text-red-500' : 'text-green-600'}">${c.ks.toFixed(2)}</span>
                </li>
                <li class="flex justify-between items-center pb-1">
                    <span class="leading-snug"><b>Критичность (KB3)</b><br><span class="text-[10px] text-[var(--text-muted)] mt-0.5">Доля проверок с B3: ${c.rateB3.toFixed(1)}%</span></span>
                    <span class="font-black text-lg ${c.kcritC < 1 ? 'text-red-500' : 'text-green-600'}">${c.kcritC.toFixed(2)}</span>
                </li>
            </ul>

            <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Достоверность и Стабильность</div>
            <div class="grid grid-cols-2 gap-2 mb-5">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center">
                    <div class="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1" title="Доверительный интервал 95%">Погрешность (±E)</div>
                    <div class="text-xl font-black text-slate-700 dark:text-slate-300">± ${c.ci95_margin.toFixed(1)}%</div>
                </div>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center cursor-help" title="${c.stabDesc}">
                    <div class="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 border-b border-dashed border-slate-300 pb-1 inline-block">Индекс стаб.</div>
                    <div class="text-xl font-black ${c.stabColor} leading-none">${c.stabilityIndex}</div>
                    <div class="text-[8px] font-bold uppercase mt-1 ${c.stabColor}">${c.stabText}</div>
                </div>
            </div>

            <div class="text-[11px] font-bold ${c.finalC < 70 ? 'text-red-700 bg-red-50 border-red-200' : (c.finalC < 85 ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-green-700 bg-green-50 border-green-200')} mt-2 p-3 rounded-xl border shadow-sm leading-snug">
                <span class="uppercase text-[9px] block mb-1 opacity-70">Основание / Вывод</span>${c.reason}
            </div>`;
    }
    document.body.classList.add('modal-open'); modal.style.display = 'flex';
}

// === ПЕРЕКЛЮЧАТЕЛЬ ПОДВКЛАДОК СПРАВОЧНИКА ===
function switchReferenceSubTab(tabId, btnElement) {
    document.querySelectorAll('.ref-sub-section').forEach(el => el.classList.add('hidden'));

    const btnContainer = document.getElementById('reference-subtabs-block');
    if (btnContainer) {
        btnContainer.querySelectorAll('.sub-tab-btn').forEach(el => {
            el.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400', 'active');
            el.classList.add('text-[var(--text-muted)]');
        });
    }

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    if (btnElement) {
        btnElement.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400', 'active');
        btnElement.classList.remove('text-[var(--text-muted)]');
    }

    // Инициализация контента при переключении (ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ЭКРАНОВ)
    if (tabId === 'ref-sub-checklists') {
        if (typeof renderReferenceTab === 'function') renderReferenceTab();
    } else if (tabId === 'ref-sub-docs') {
        if (typeof renderDocsList === 'function') renderDocsList();
    } else if (tabId === 'ref-sub-nodes') {
        if (typeof renderNodesList === 'function') renderNodesList();
    } else if (tabId === 'ref-sub-twi') {
        // ВОТ ОНО: Теперь при входе в TWI мы заново ищем Магию!
        if (typeof renderTwiList === 'function') renderTwiList();
    } else if (tabId === 'ref-sub-practices') {
        if (typeof rbi_loadPractices === 'function') {
            rbi_loadPractices().then(() => {
                if (typeof rbi_renderPracticesTab === 'function') rbi_renderPracticesTab();
            });
        }
    }
}
// === АНАЛИТИКА И ОТЧЕТЫ (ПРО 4.0) ===

function closeFabExportMenu() {
    document.getElementById('fab-export-menu-overlay').classList.add('opacity-0');
    document.getElementById('fab-export-menu-content').classList.add('translate-y-full');
    setTimeout(() => {
        document.getElementById('fab-export-menu-overlay').style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

// --- ЯДРО ГРАФИКОВ ТРЕНДОВ И ФИЛЬТРОВ ---

// --- ЯДРО ГРАФИКОВ ТРЕНДОВ И ФИЛЬТРОВ ---

let trendGroupings = { contrs: 'MONTH', works: 'MONTH', global: 'MONTH', onepager: 'MONTH' };
let selectedChartFilters = { contrs: [], works: [], onepager: [] }; // Пустой массив = Авто

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// === УМНЫЙ ГЕНЕРАТОР ДАННЫХ ДЛЯ ТРЕНДОВ ===
function buildTrendChartData(data, fieldName, allowedCats = [], period = 'MONTH') {
    const timeMap = {}; const categoriesTotal = {};
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedData.forEach(item => {
        if (!item.metrics) return;
        const d = new Date(item.date);
        let tLabel = '';

        if (period === 'YEAR') tLabel = d.getFullYear().toString();
        else if (period === 'QUARTER') tLabel = `Q${Math.floor(d.getMonth() / 3) + 1} '${d.getFullYear().toString().slice(-2)}`;
        else if (period === 'WEEK') tLabel = `Нед.${getWeekNumber(d)} '${d.getFullYear().toString().slice(-2)}`;
        else tLabel = d.toLocaleString('ru-RU', { month: 'short', year: '2-digit' });

        // УМНОЕ ИМЯ: Подрядчик + Объект
        let cat = fieldName === 'TOTAL' ? 'Общий УрК' : (item[fieldName] || 'Неизвестно');
        if (fieldName === 'contractorName') {
            cat = (item.contractorName || 'Неизвестно') + ' [' + (item.projectName || 'Без объекта') + ']';
        }
        categoriesTotal[cat] = (categoriesTotal[cat] || 0) + 1;

        if (!timeMap[tLabel]) timeMap[tLabel] = {};
        if (!timeMap[tLabel][cat]) timeMap[tLabel][cat] = { sum: 0, cnt: 0 };
        timeMap[tLabel][cat].sum += item.metrics.final;
        timeMap[tLabel][cat].cnt++;
    });

    let targetCats = [];
    if (fieldName === 'TOTAL') targetCats = ['Общий УрК'];
    else if (allowedCats && allowedCats.length > 0) targetCats = allowedCats.filter(c => categoriesTotal[c]);
    else targetCats = Object.keys(categoriesTotal).sort((a, b) => categoriesTotal[b] - categoriesTotal[a]).slice(0, 5);

    const labels = Object.keys(timeMap);
    const colors = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#db2777', '#d97706', '#059669', '#2563eb'];

    const datasets = targetCats.map((cat, i) => {
        const dataPoints = labels.map(l => (timeMap[l][cat] ? Math.round(timeMap[l][cat].sum / timeMap[l][cat].cnt) : null));
        return {
            label: cat.length > 20 ? cat.substring(0, 20) + '...' : cat,
            data: dataPoints,
            borderColor: fieldName === 'TOTAL' ? '#4f46e5' : colors[i % colors.length],
            backgroundColor: fieldName === 'TOTAL' ? 'rgba(79, 70, 229, 0.1)' : colors[i % colors.length],
            fill: fieldName === 'TOTAL',
            tension: 0.4, borderWidth: 3, pointRadius: 4, spanGaps: true
        };
    });

    return { labels, datasets };
}

// === ФУНКЦИИ РЕДАКТИРОВАНИЯ ЗАКЛЮЧЕНИЯ ИИ ===
let currentEditingExpertKey = null;
let currentEditingTextAreaId = null;

// === УМНЫЕ ПРИЛИПАЮЩИЕ ПАНЕЛИ ПОИСКА (История / Справочник) ===
// Работают как мини-дашборд: сворачиваются при скролле вниз, разворачиваются вверх

function initCollapsibleSearchPanel(panelId, bodyId, headerId) {
    let lastScrollY = 0;
    let isCollapsed = false;

    const panel = document.getElementById(panelId);
    const body = document.getElementById(bodyId);
    if (!panel || !body) return;

    // Клик по заголовку — принудительный тоггл
    const header = document.getElementById(headerId);
    if (header) {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            applyPanelState(body, isCollapsed);
            // Убрано принудительное изменение скролла (window.scrollTo), 
            // так как на мобильных устройствах это вызывает "прыжки" экрана.
            // CSS-свойство transition: max-height справится с этим плавно и естественно.
        });
    }

    // Скролл — авто-сворачивание
    window.addEventListener('scroll', () => {
        const currentY = window.scrollY; // ИСПРАВЛЕНО: убрана опечатка currentYF
        if (currentY > lastScrollY + 10 && currentY > 60 && !isCollapsed) {
            isCollapsed = true;
            applyPanelState(body, true);
        } else if (currentY < lastScrollY - 10 && isCollapsed) {
            isCollapsed = false;
            applyPanelState(body, false);
        }
        lastScrollY = currentY;
    }, { passive: true });
}

function applyPanelState(bodyEl, collapsed) {
    // Находим иконку-стрелку (ищем в ближайшем родителе)
    const panel = bodyEl.closest('[id$="-sticky-panel"]') || bodyEl.parentElement;
    const icon = panel?.querySelector('[id$="-panel-toggle-icon"]');

    if (collapsed) {
        bodyEl.style.maxHeight = '0px';
        bodyEl.style.opacity = '0';
        bodyEl.style.overflow = 'hidden';
        bodyEl.style.marginBottom = '0';
        if (icon) icon.style.transform = 'rotate(-90deg)';
    } else {
        bodyEl.style.maxHeight = '400px';
        bodyEl.style.opacity = '1';
        bodyEl.style.overflow = '';
        bodyEl.style.marginBottom = '';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

// ============================================================================
// === НОВАЯ ВКЛАДКА: ПОДРЯДЧИКИ И ДЕТАЛИЗАЦИЯ (v16.5) ===
// ============================================================================

let currentContractorsFilter = 'ALL'; // Состояние чипсов (Все, Критичные и т.д.)
let currentDetailedContractor = null; // Какой подрядчик сейчас открыт

// === ОКНО "О ПРИЛОЖЕНИИ" ===
function showAboutApp() {
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

// === СВОРАЧИВАЕМЫЕ ПАНЕЛИ (УМНАЯ ЛОГИКА БЕЗ ПРЫЖКОВ) ===
function initCollapsiblePanel(panelId, bodyId, headerId, iconId) {
    const panel = document.getElementById(panelId);
    const body = document.getElementById(bodyId);
    const header = document.getElementById(headerId);
    const icon = document.getElementById(iconId);
    if (!panel || !body) return;
    if (panel.dataset.inited) return;
    panel.dataset.inited = '1';

    let collapsed = false;
    let isAnimating = false; // Блокировка от дребезга

    function setCollapsed(val) {
        if (collapsed === val || isAnimating) return;
        collapsed = val;
        isAnimating = true;

        body.style.maxHeight = collapsed ? '0px' : '400px';
        body.style.opacity = collapsed ? '0' : '1';
        body.style.overflow = collapsed ? 'hidden' : 'visible';
        body.style.marginTop = collapsed ? '0px' : '8px';
        if (icon) icon.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';

        setTimeout(() => { isAnimating = false; }, 400); // Ждем конца CSS анимации
    }

    if (header) {
        header.addEventListener('click', () => setCollapsed(!collapsed));
    }

    window.addEventListener('scroll', () => {
        // Если панель не на активной вкладке - игнорируем
        if (!panel.closest('.view-section.active') && !panel.closest('.active')) return;

        // ЗАЩИТА ОТ ПРЫЖКОВ: Если страница короткая, не сворачиваем вообще!
        if (document.body.scrollHeight <= window.innerHeight + 250) {
            setCollapsed(false);
            return;
        }

        const y = window.scrollY;
        // Используем абсолютные пороги с "мертвой зоной", чтобы исключить цикличность
        if (y > 100 && !collapsed) setCollapsed(true);
        else if (y < 40 && collapsed) setCollapsed(false);
    }, { passive: true });
}



// === КОНСТРУКТОР СВОИХ ЧЕК-ЛИСТОВ ===
let builderGroupCount = 0;
let builderItemCount = 0;

function openTemplateBuilder() {
    const overlay = document.getElementById('template-builder-overlay');
    document.getElementById('builder-title').value = '';
    document.getElementById('builder-groups').innerHTML = '';
    builderGroupCount = 0;
    builderItemCount = 0;

    addBuilderGroup(); // Добавляем первую пустую группу по умолчанию

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeTemplateBuilder() {
    document.getElementById('template-builder-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
}

function addBuilderGroup() {
    builderGroupCount++;
    const groupId = `builder-group-${builderGroupCount}`;
    const html = `
        <div id="${groupId}" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative">
            <button onclick="document.getElementById('${groupId}').remove()" class="absolute top-2 right-2 w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-bold text-xs active:scale-95 border border-red-100">✕</button>
            <label class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1 block">Название этапа (Группы)</label>
            <input type="text" class="input-base text-xs mb-3 group-title-input" placeholder="Например: 1. Подготовительные работы" value="Этап ${builderGroupCount}">
            
            <div id="${groupId}-items" class="space-y-2 mb-3 pl-2 border-l-2 border-indigo-100 dark:border-indigo-800">
                <!-- Сюда будут падать пункты -->
            </div>
            
            <button onclick="addBuilderItem('${groupId}-items')" class="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg active:scale-95 transition-colors uppercase dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400">
                + Добавить пункт контроля
            </button>
        </div>
    `;
    document.getElementById('builder-groups').insertAdjacentHTML('beforeend', html);
    addBuilderItem(`${groupId}-items`); // Сразу добавляем 1 пустой пункт
}

function addBuilderItem(containerId, itemData = null) {
    builderItemCount++;
    const itemId = `builder-item-${builderItemCount}`;

    // Собираем список всех нормативных документов
    const allDocs = [...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []), ...(typeof customDocs !== 'undefined' ? customDocs : [])];
    let docOptions = '<option value="">-- Без привязки к документу --</option>';

    allDocs.sort((a, b) => a.code.localeCompare(b.code)).forEach(doc => {
        const shortTitle = doc.title.length > 30 ? doc.title.substring(0, 30) + '...' : doc.title;
        const isSelected = (itemData && itemData.ndId === doc.id) ? 'selected' : '';
        docOptions += `<option value="${doc.id}" ${isSelected}>${doc.code} - ${shortTitle}</option>`;
    });

    // Предзаполнение, если мы редактируем старый шаблон
    const nVal = itemData ? itemData.n.replace(/"/g, '&quot;') : '';
    const tVal = itemData && itemData.t ? itemData.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ").replace(/"/g, '&quot;') : '';
    const wVal = itemData ? itemData.w : 2;

    const html = `
        <div id="${itemId}" class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] relative mb-2">
            <button onclick="document.getElementById('${itemId}').remove()" class="absolute top-2 right-2 text-red-500 font-black text-sm px-2">✕</button>
            
            <div class="pr-8 mb-2">
                <input type="text" class="input-base text-xs item-name-input font-bold" placeholder="Текст нарушения (Напр: Отклонение от вертикали)" value="${nVal}">
            </div>
            
            <div class="grid grid-cols-1 gap-2 mb-2">
                <div class="flex gap-2">
                    <select class="input-base text-[10px] !py-1.5 item-weight-select bg-white w-1/3 font-bold">
                        <option value="1" ${wVal === 1 ? 'selected' : ''}>B1 (Мелкий)</option>
                        <option value="2" ${wVal === 2 ? 'selected' : ''}>B2 (Значимый)</option>
                        <option value="3" ${wVal === 3 ? 'selected' : ''}>B3 (Критич.)</option>
                    </select>
                    <select class="input-base text-[10px] !py-1.5 item-nd-select bg-white w-2/3 truncate">
                        ${docOptions}
                    </select>
                </div>
                <input type="text" class="input-base text-[10px] !py-1.5 item-norm-input" placeholder="Доп. текст / допуск (Напр: ±2 мм)" value="${tVal}">
            </div>
        </div>
    `;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

async function saveCustomTemplate() {
    const titleInput = document.getElementById('builder-title').value.trim();
    if (!titleInput) return showToast("Введите название чек-листа!");

    const groupsEl = document.getElementById('builder-groups').children;
    if (groupsEl.length === 0) return showToast("Добавьте хотя бы один этап!");

    const newTemplate = {
        title: titleInput,
        templateVersion: "1.0",
        groups: []
    };

    let isValid = true;

    Array.from(groupsEl).forEach(groupEl => {
        const groupTitle = groupEl.querySelector('.group-title-input').value.trim();
        const itemsContainer = groupEl.querySelector('div[id$="-items"]');
        const itemsEl = itemsContainer.children;

        if (!groupTitle || itemsEl.length === 0) isValid = false;

        const groupData = { group: groupTitle || "Без названия", items: [] };

        Array.from(itemsEl).forEach(itemEl => {
            const name = itemEl.querySelector('.item-name-input').value.trim();
            const weight = parseInt(itemEl.querySelector('.item-weight-select').value);

            // <-- ВСТАВКА: Безопасное чтение селекта (защита от краша)
            const ndSelect = itemEl.querySelector('.item-nd-select');
            const ndId = ndSelect ? ndSelect.value : null;

            const norm = itemEl.querySelector('.item-norm-input').value.trim();

            if (!name) isValid = false;

            const uniqueId = Date.now() % 100000 + Math.floor(Math.random() * 1000);

            groupData.items.push({
                id: uniqueId,
                n: name || "Пустой пункт",
                w: weight,
                ndId: ndId || null, // <-- Сохраняем в объект шаблона
                t: formatNorms(norm || "Без норматива")
            });
        });

        newTemplate.groups.push(groupData);
    });

    if (!isValid) return showToast("Заполните все пустые поля и пункты!");

    // Если мы редактируем старый шаблон - берем его ключ, иначе создаем новый
    const slug = window.currentEditingTemplateSlug || ("cstm_" + Date.now().toString(36));
    window.currentEditingTemplateSlug = null; // сбрасываем

    newTemplate.id = slug; // Дублируем ключ в id для синхронизатора
    newTemplate.owner = appSettings.engineerName || 'Инженер';
    newTemplate.source = 'local';
    newTemplate.syncStatus = 'not_synced';
    newTemplate.sync_status = 'not_synced';
    newTemplate.is_deleted = false;
    newTemplate._deleted = false;
    newTemplate.createdAt = new Date().toISOString();
    newTemplate.updatedAt = new Date().toISOString();

    // Сохраняем в глобальный объект
    userTemplates[slug] = newTemplate;

    // Сохраняем в IndexedDB
    try {
        await dbPut(STORES.TEMPLATES, { slug: slug, data: newTemplate });
        showToast("✅ Шаблон успешно сохранен!");
        closeTemplateBuilder();

        // Обновляем списки селекторов и список в настройках
        renderSelector();
        renderSettingsTab();

        // <-- ВСТАВКА: Мгновенное обновление списка шаблонов в панели
        const manageBody = document.getElementById('ref-manage-body');
        if (manageBody && manageBody.style.opacity === '1') {
            toggleManagePanel();
            setTimeout(() => toggleManagePanel(), 50);
        }

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    } catch (e) {
        console.error(e);
        showToast("Ошибка сохранения шаблона!");
    }
}
// === НОВАЯ ЛОГИКА: РЕДАКТИРОВАНИЕ ЧЕК-ЛИСТА ===
window.editUserTemplate = function (slug) {
    const tmpl = userTemplates[slug];
    if (!tmpl) return;

    // Глобально запоминаем, что мы редактируем
    window.currentEditingTemplateSlug = slug;

    const overlay = document.getElementById('template-builder-overlay');
    document.getElementById('builder-title').value = tmpl.title;
    document.getElementById('builder-groups').innerHTML = '';

    builderGroupCount = 0;
    builderItemCount = 0;

    // Восстанавливаем этапы и пункты
    tmpl.groups.forEach(g => {
        builderGroupCount++;
        const groupId = `builder-group-${builderGroupCount}`;
        const groupHtml = `
            <div id="${groupId}" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative">
                <button onclick="document.getElementById('${groupId}').remove()" class="absolute top-2 right-2 w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-bold text-xs active:scale-95 border border-red-100">✕</button>
                <label class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1 block">Название этапа (Группы)</label>
                <input type="text" class="input-base text-xs mb-3 group-title-input" value="${g.group || g.title}">
                
                <div id="${groupId}-items" class="space-y-2 mb-3 pl-2 border-l-2 border-indigo-100 dark:border-indigo-800">
                </div>
                
                <button onclick="addBuilderItem('${groupId}-items')" class="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg active:scale-95 transition-colors uppercase dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400">
                    + Добавить пункт
                </button>
            </div>
        `;
        document.getElementById('builder-groups').insertAdjacentHTML('beforeend', groupHtml);

        // Восстанавливаем пункты внутри этапа
        g.items.forEach(item => {
            builderItemCount++;
            const itemId = `builder-item-${builderItemCount}`;
            // Убираем HTML-теги из норматива для красивого отображения в инпуте
            const cleanNorm = item.t ? item.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ") : "";
            const itemHtml = `
                <div id="${itemId}" class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] relative">
                    <button onclick="document.getElementById('${itemId}').remove()" class="absolute top-2 right-2 text-red-500 font-black text-sm px-2">✕</button>
                    <div class="pr-8 mb-2">
                        <input type="text" class="input-base text-xs item-name-input" value="${item.n.replace(/"/g, '&quot;')}">
                    </div>
                    <div class="grid grid-cols-3 gap-2 mb-2">
                        <div class="col-span-1">
                            <select class="input-base text-[10px] !py-1 item-weight-select bg-white">
                                <option value="1" ${item.w === 1 ? 'selected' : ''}>B1 (Мелкий)</option>
                                <option value="2" ${item.w === 2 ? 'selected' : ''}>B2 (Значимый)</option>
                                <option value="3" ${item.w === 3 ? 'selected' : ''}>B3 (Критич.)</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <input type="text" class="input-base text-[10px] !py-1 item-norm-input" value="${cleanNorm.replace(/"/g, '&quot;')}">
                        </div>
                    </div>
                </div>
            `;
            document.getElementById(`${groupId}-items`).insertAdjacentHTML('beforeend', itemHtml);
        });
    });

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
};

// === НОВАЯ ЛОГИКА: КЛОНИРОВАНИЕ СИСТЕМНОГО ЧЕК-ЛИСТА ===
window.cloneSystemTemplateToCustom = function () {
    const select = document.getElementById('clone-sys-select');
    const key = select.value;
    if (!key || !SYSTEM_TEMPLATES[key]) return showToast('Выберите чек-лист для копирования!');

    const tmpl = SYSTEM_TEMPLATES[key];

    // Подменяем данные во временном объекте
    userTemplates['temp_clone'] = {
        title: tmpl.title + ' (Копия)',
        groups: JSON.parse(JSON.stringify(tmpl.groups))
    };

    // Запускаем режим редактирования для этой копии
    window.editUserTemplate('temp_clone');

    // Сразу очищаем, чтобы при сохранении сгенерировался новый уникальный ID
    window.currentEditingTemplateSlug = null;
    delete userTemplates['temp_clone'];
};
// Функция для удаления пользовательских шаблонов
async function deleteUserTemplate(slug) {
    if (!confirm("Удалить этот чек-лист? Вы не сможете проводить по нему новые проверки.")) return;

    // Мягкое удаление
    if (userTemplates[slug]) {
        userTemplates[slug]._deleted = true;
        userTemplates[slug].is_deleted = true;
        userTemplates[slug].source = 'local';
        userTemplates[slug].syncStatus = 'not_synced';
        userTemplates[slug].sync_status = 'not_synced';
        userTemplates[slug]._deletedAt = new Date().toISOString();
        userTemplates[slug].updatedAt = userTemplates[slug]._deletedAt;

        try {
            await dbPut(STORES.TEMPLATES, { slug: slug, data: userTemplates[slug] });
        } catch (e) { }
    }

    delete userTemplates[slug]; // Убираем из оперативной памяти для рендера

    try {
        showToast("🗑️ Чек-лист удален");
        renderSelector();
        renderSettingsTab();

        // <-- ВСТАВКА: Мгновенное обновление списка шаблонов
        const manageBody = document.getElementById('ref-manage-body');
        if (manageBody && manageBody.style.opacity === '1') {
            toggleManagePanel();
            setTimeout(() => toggleManagePanel(), 50);
        }

        // Если удалили тот, что был выбран - сбрасываем на HOME
        if (currentTemplateKey === `user_${slug}`) {
            changeTemplate('HOME');
        }

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    } catch (e) {
        console.error(e);
        showToast("Ошибка при удалении");
    }
}
// === АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ШАБЛОНОВ ИЗ EXCEL ===

function triggerExcelImport() {
    document.getElementById('excel-template-input').click();
}

function showExcelHelp() {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="text-4xl mb-2">📊</div>`;
    document.getElementById('modal-title').innerText = "Как загрузить Excel";
    document.getElementById('modal-body').innerHTML = `
        <div class="text-sm leading-relaxed space-y-3">
            <p>Система автоматически превратит вашу таблицу в чек-лист. Файл должен быть формата <b>.xlsx</b>.</p>
            <p class="font-bold text-indigo-600 dark:text-indigo-400 mt-2">Структура таблицы (строго 4 столбца):</p>
            <table class="w-full text-left border-collapse border border-slate-300 mt-2 text-[10px] bg-white dark:bg-slate-800">
                <tr class="bg-slate-100 dark:bg-slate-700">
                    <th class="border border-slate-300 p-1">Столбец A</th>
                    <th class="border border-slate-300 p-1">Столбец B</th>
                    <th class="border border-slate-300 p-1">Столбец C</th>
                    <th class="border border-slate-300 p-1">Столбец D</th>
                </tr>
                <tr>
                    <td class="border border-slate-300 p-1"><b>Название этапа (Группы)</b></td>
                    <td class="border border-slate-300 p-1"><b>Название дефекта/пункта</b></td>
                    <td class="border border-slate-300 p-1"><b>Категория (1, 2 или 3)</b></td>
                    <td class="border border-slate-300 p-1"><b>Текст норматива / ГОСТ</b></td>
                </tr>
                <tr>
                    <td class="border border-slate-300 p-1 text-slate-500">Подготовка поверхности</td>
                    <td class="border border-slate-300 p-1 text-slate-500">Грязь, пыль на бетоне</td>
                    <td class="border border-slate-300 p-1 text-slate-500">2</td>
                    <td class="border border-slate-300 p-1 text-slate-500">СП 70.13330 очистить до основания</td>
                </tr>
            </table>
            <div class="bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-lg text-[11px] mt-3">
                ⚠️ <b>Важно:</b> Первая строка таблицы (заголовки столбцов) игнорируется при загрузке. Данные должны начинаться со 2-й строки.
            </div>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Показываем уведомление о начале загрузки
    showToast("⚙️ Обработка Excel файла...");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // Читаем Excel файл
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Берем первый лист
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Переводим в формат массива массивов
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rows.length < 2) throw new Error("Файл пуст или не содержит данных со 2-й строки");

            // Имя файла становится названием чек-листа
            const templateTitle = file.name.replace(/\.[^/.]+$/, "");
            const newTemplate = {
                title: templateTitle,
                templateVersion: "1.0",
                groups: []
            };

            let currentGroupTitle = "";
            let currentGroupItems = [];

            // Пропускаем 1-ю строку (rows[0]), так как это заголовки
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue; // Пропуск пустых строк

                // Считываем ячейки (Колонка A, B, C, D)
                const groupCol = row[0] ? row[0].toString().trim() : null;
                const itemCol = row[1] ? row[1].toString().trim() : null;
                const weightCol = row[2];
                const normCol = row[3] ? row[3].toString().trim() : null;

                // Если есть название группы и оно отличается от предыдущего - создаем новый блок
                if (groupCol && groupCol !== currentGroupTitle) {
                    if (currentGroupTitle && currentGroupItems.length > 0) {
                        newTemplate.groups.push({ group: currentGroupTitle, items: currentGroupItems });
                    }
                    currentGroupTitle = groupCol;
                    currentGroupItems = [];
                }

                // Если есть название дефекта
                if (itemCol) {
                    // Проверка категории
                    let weight = parseInt(weightCol);
                    if (isNaN(weight) || weight < 1 || weight > 3) weight = 2; // По умолчанию B2

                    currentGroupItems.push({
                        id: Date.now() % 100000 + Math.floor(Math.random() * 10000) + i,
                        n: itemCol,
                        w: weight,
                        t: formatNorms(normCol ? normCol : "Без норматива")
                    });
                }
            }

            // Не забываем добавить последнюю группу после цикла
            if (currentGroupTitle && currentGroupItems.length > 0) {
                newTemplate.groups.push({ group: currentGroupTitle, items: currentGroupItems });
            }

            if (newTemplate.groups.length === 0) throw new Error("Не удалось найти данные в таблице. Проверьте формат по инструкции (Кнопка '?').");

            // Генерируем уникальный ключ
            const slug = "cstm_" + Date.now().toString(36);

            // Сохраняем в память
            userTemplates[slug] = newTemplate;
            await dbPut(STORES.TEMPLATES, { slug: slug, data: newTemplate });

            showToast(`✅ Чек-лист "${templateTitle}" успешно загружен!`);

            // Перерисовываем интерфейс, чтобы шаблон сразу появился в списках
            renderSelector();
            renderSettingsTab();

        } catch (err) {
            console.error(err);
            alert("Ошибка загрузки: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);

    // Сбрасываем инпут, чтобы можно было выбрать тот же файл снова
    event.target.value = '';
}
// === ЭКСПОРТ ЧЕК-ЛИСТОВ В EXCEL И JSON ===

// Вспомогательная функция очистки HTML-тегов для выгрузки
// (Убирает красные и синие подсветки нормативов, чтобы в Excel был чистый текст)
function stripHtmlTags(str) {
    if (!str) return "";
    // Заменяем <br> на реальные переносы строк для Excel
    let text = str.replace(/<br\s*[\/]?>/gi, "\n");
    // Удаляем все остальные HTML-теги
    return text.replace(/<\/?[^>]+(>|$)/g, "");
}

function exportAllTemplatesJson() {
    showToast("⚙️ Формирование кода для templates.js...");

    // Объединяем системные и пользовательские чек-листы
    const allTemplates = { ...SYSTEM_TEMPLATES, ...userTemplates };

    // Вспомогательная функция очистки HTML для формирования чистого кода
    function cleanForCode(str) {
        if (!str) return "";
        // Убираем HTML теги, но сохраняем переносы строк как \n
        let text = str.replace(/<br\s*[\/]?>/gi, "\\n");
        text = text.replace(/<\/?[^>]+(>|$)/g, "");
        // Экранируем двойные кавычки
        return text.replace(/"/g, '\\"');
    }

    // Начинаем собирать строку, которая выглядит в точности как файл templates.js
    let jsCode = "/* Сгенерировано из RBI Quality */\n\n";
    jsCode += "const SYSTEM_TEMPLATES = {\n";

    const templateKeys = Object.keys(allTemplates);

    templateKeys.forEach((tKey, tIndex) => {
        const tmpl = allTemplates[tKey];
        jsCode += `    "${tKey}": {\n`;
        jsCode += `        title: "${tmpl.title}",\n`;
        jsCode += `        templateVersion: "${tmpl.templateVersion || '1.0'}",\n`;
        jsCode += `        groups: [\n`;

        if (tmpl.groups && Array.isArray(tmpl.groups)) {
            tmpl.groups.forEach((g, gIdx) => {
                jsCode += `            { group: "${g.group || g.title}", items: [\n`;

                if (g.items && Array.isArray(g.items)) {
                    g.items.forEach((i, iIdx) => {
                        const comma = iIdx < g.items.length - 1 ? ',' : '';
                        const cleanT = cleanForCode(i.t);
                        const cleanN = (i.n || "").replace(/"/g, '\\"');

                        // Оборачиваем текст норматива обратно в функцию formatNorms!
                        jsCode += `                { id: ${i.id}, n: "${cleanN}", w: ${i.w}, t: formatNorms("${cleanT}") }${comma}\n`;
                    });
                }

                const gComma = gIdx < tmpl.groups.length - 1 ? ',' : '';
                jsCode += `            ]}${gComma}\n`;
            });
        }

        const tComma = tIndex < templateKeys.length - 1 ? ',' : '';
        jsCode += `        ]\n    }${tComma}\n`;
    });

    jsCode += "};\n";

    // Скачиваем файл как .js
    downloadFile(jsCode, `rbi_templates_code_${new Date().toLocaleDateString('ru-RU')}.js`, 'application/javascript');
    showToast("✅ Готовый код для templates.js скачан!");
}


// ==========================================
// БЛОК: БАЗА НОРМАТИВНЫХ ДОКУМЕНТОВ (НД)
// ==========================================

let customDocs = [];
let currentDocFilter = 'ALL';
// ЭКСПОРТ НД В КОД (ДЛЯ system_docs.js)
window.exportDocsJsCode = function () {
    if (customDocs.length === 0) return showToast('Нет своих документов для экспорта');

    let jsCode = "/* Сгенерировано из RBI Quality (Пользовательские НД) */\n\nconst CUSTOM_SYSTEM_DOCS = [\n";
    customDocs.forEach((d, idx) => {
        const comma = idx < customDocs.length - 1 ? ',' : '';
        jsCode += `    {\n`;
        jsCode += `        id: '${d.id}',\n`;
        jsCode += `        type: '${d.type}',\n`;
        jsCode += `        code: '${d.code.replace(/'/g, "\\'")}',\n`;
        jsCode += `        title: '${d.title.replace(/'/g, "\\'")}',\n`;
        if (d.link) jsCode += `        link: '${d.link}',\n`;
        if (d.pdfData) jsCode += `        pdfData: '${d.pdfData}',\n`;
        if (d.pdfName) jsCode += `        pdfName: '${d.pdfName}',\n`;
        if (d.pdfSize) jsCode += `        pdfSize: '${d.pdfSize}',\n`;
        jsCode += `        isSystem: true\n`;
        jsCode += `    }${comma}\n`;
    });
    jsCode += "];\n";

    downloadFile(jsCode, `rbi_docs_code_${new Date().toLocaleDateString('ru-RU')}.js`, 'application/javascript');
    showToast("✅ Код JS скачан!");
};
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const storedDocs = await dbGetAll(STORES.CUSTOM_DOCS);
        if (storedDocs && storedDocs.length > 0) customDocs = storedDocs.filter(d => !d._deleted);
    } catch (e) { console.error("Ошибка загрузки пользовательских НД", e); }
});

// Рендер списка документов (В виде красивой сетки)
function renderDocsList() {
    const container = document.getElementById('docs-list-container');
    const searchInput = document.getElementById('doc-search-input')?.value.toLowerCase() || '';
    if (!container) return;

    // ОБНОВЛЯЕМ ШАПКУ (Возвращаем все кнопки и фильтры)
    const filtersBlock = document.getElementById('ref-docs-filters');
    // Добавили проверку !filtersBlock.dataset.initialized, чтобы шапка не перерисовывалась при каждой букве
    if (filtersBlock && !filtersBlock.dataset.initialized) {
        filtersBlock.dataset.initialized = 'true';
        filtersBlock.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <label class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                    <span class="text-[10px] font-black uppercase tracking-widest ${window.docOwnerFilter === 'MY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">Только мои</span>
                    <div class="relative">
                        <input type="checkbox" class="sr-only peer" onchange="window.docOwnerFilter = this.checked ? 'MY' : 'ALL'; renderDocsList()" ${window.docOwnerFilter === 'MY' ? 'checked' : ''}>
                        <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                    </div>
                </label>
                <button onclick="downloadMissingCloudFiles()" class="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m0 0l-3-3m3 3l3-3"></path></svg> Скачать
                </button>
            </div>
            
            <div class="flex justify-between items-center mb-2">
                <div class="relative flex-1 mr-2">
                    <span class="absolute left-3 top-2.5 text-slate-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></span>
                    <input type="text" id="doc-search-input" class="input-base pl-9 text-[11px]" placeholder="Поиск ГОСТ, СП..." oninput="renderDocsList()" value="${searchInput}">
                </div>
                <button onclick="openAiDocChat()" class="bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-400 px-3 py-2 rounded-lg shadow-sm active:scale-95 text-[10px] font-black uppercase whitespace-nowrap mr-2 flex items-center gap-1">
                    🤖 Спросить ИИ
                </button>
                <button onclick="openAddDocModal()" class="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Свой НД
                </button>
            </div>
            
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-t border-[var(--card-border)] pt-2" id="doc-filters-container">
                <button onclick="filterDocs('ALL', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">Все</button>
                <button onclick="filterDocs('СП', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'СП' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">СП</button>
                <button onclick="filterDocs('ГОСТ', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ГОСТ' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">ГОСТ</button>
                <button onclick="filterDocs('ПРОЕКТ', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ПРОЕКТ' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">Проект / РД</button>
            </div>
        `;
    }

    const allDocs = [...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []), ...customDocs];
    const currentEngineer = appSettings.engineerName || 'Инженер';

    let filtered = allDocs.filter(doc => {
        const code = String(doc.code || doc.docCode || doc.data?.code || '').toLowerCase();
        const title = String(doc.title || doc.name || doc.data?.title || '').toLowerCase();
        const type = doc.type || doc.data?.type || '';
        const owner = doc.owner || doc.data?.owner || '';

        const matchSearch =
            code.includes(searchInput) ||
            title.includes(searchInput);

        const matchFilter =
            currentDocFilter === 'ALL' ||
            type === currentDocFilter;

        // Фильтр владельца: системные документы видны всем
        const matchOwner =
            window.docOwnerFilter === 'ALL' ||
            doc.isSystem ||
            owner === currentEngineer;

        return matchSearch && matchFilter && matchOwner;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-500 text-[11px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">Документы не найдены</div>`;
        return;
    }

    // Группируем по типу документа
    const grouped = {};
    filtered.forEach(doc => {
        if (!grouped[doc.type]) grouped[doc.type] = [];
        grouped[doc.type].push(doc);
    });

    let html = '';

    // Сортируем группы по алфавиту
    Object.keys(grouped).sort().forEach(type => {
        html += `
        <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
            <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
                <span class="truncate pr-4">${type} <span class="text-[10px] text-slate-400 ml-1">(${grouped[type].length})</span></span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
        `;

        grouped[type].forEach(doc => {
            const isSystem = String(doc.id).startsWith('sys_');
            const isOwner = !isSystem && (!doc.owner || doc.owner === currentEngineer);
            const tagColor = 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400';
            let infoText = isSystem ? "Системный" : (doc.pdfSize ? `PDF: ${doc.pdfSize}` : "Без файла");

            html += `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openDocViewer('${doc.id}')">
                ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИС</div>' : ''}
                
                <div class="h-24 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    <div class="w-10 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-1.5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 right-0 h-3.5 bg-red-500 flex items-center justify-center"><span class="text-[6px] text-white font-black tracking-widest">DOC</span></div>
                        <div class="space-y-1 mt-4">
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                        </div>
                    </div>
                    
                    ${!isSystem ? `
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${doc.id}', 'doc', '${doc.code.replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20 hover:bg-black/50">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>` : ''}
                </div>
                
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[8px] font-black px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border ${tagColor} truncate max-w-full">${doc.type}</div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white leading-tight mb-1 truncate">${doc.code}</div>
                    <div class="text-[10px] font-medium text-[var(--text-muted)] leading-snug line-clamp-2 mb-2">${doc.title}</div>
                    
                    <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                            <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            ${isSystem ? 'Система' : (doc.owner ? doc.owner.split(' ')[0] : 'Инженер')}
                        </div>
                        <div class="text-[9px] font-black text-slate-400">${infoText}</div>
                    </div>
                </div>
            </div>`;
        });
        html += `</div></details>`;
    });

    container.innerHTML = html;
}

// Фильтры НД
function filterDocs(type, btnElement) {
    currentDocFilter = type;
    const container = document.getElementById('doc-filters-container');
    container.querySelectorAll('.doc-filter-btn').forEach(btn => {
        btn.className = "doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700";
    });
    btnElement.className = "doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap border border-indigo-600";
    renderDocsList();
}

// Открытие модалки добавления
function openAddDocModal() {
    if (!rbi_requireKnowledgeEditRight()) return;
    document.getElementById('add-doc-modal-overlay').style.display = 'flex';
    document.body.classList.add('modal-open');
    document.getElementById('new-doc-code').value = '';
    document.getElementById('new-doc-title').value = '';
    removeDocPdf();
}

function closeAddDocModal() {
    document.getElementById('add-doc-modal-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Обработка загрузки PDF для НД
window.handleDocPdfUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { event.target.value = ''; return showToast("Файл слишком большой! Максимум 5 МБ."); }

    showToast("⚙️ Сохранение PDF в локальную базу...");
    const reader = new FileReader();
    reader.onload = async function (e) {
        // Пропускаем через менеджер кэша
        const localUrl = await PhotoManager.saveLocal(e.target.result, 'doc');

        const cont = document.getElementById('doc-pdf-preview');
        cont.dataset.pdf = localUrl;
        document.getElementById('doc-pdf-name').innerText = file.name;
        document.getElementById('doc-pdf-size').innerText = (file.size / 1024 / 1024).toFixed(1) + ' MB';

        cont.classList.remove('hidden');
        document.getElementById('doc-pdf-upload-btn').classList.add('hidden');
        event.target.value = '';
    }
    reader.readAsDataURL(file);
};

window.removeDocPdf = function () {
    const cont = document.getElementById('doc-pdf-preview');
    if (cont) {
        cont.dataset.pdf = '';
        cont.classList.add('hidden');
        document.getElementById('doc-pdf-upload-btn').classList.remove('hidden');
    }
};

// Сохранение документа
async function saveCustomDoc() {
    if (!rbi_requireKnowledgeEditRight()) return;
    const type = document.getElementById('new-doc-type').value;
    const code = document.getElementById('new-doc-code').value.trim();
    const title = document.getElementById('new-doc-title').value.trim();
    const pdfData = document.getElementById('doc-pdf-preview').dataset.pdf;

    if (!code || !title) return showToast('⚠️ Заполните шифр и название документа');

    const newDoc = {
        id: 'usr_doc_' + Date.now().toString(36),
        type: type,
        code: code,
        title: title,
        isSystem: false,
        owner: rbi_getCurrentUserNameSafe(),
        source: 'local',
        syncStatus: 'not_synced',
        sync_status: 'not_synced',
        syncBlockReason: '',
        sync_block_reason: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (pdfData) {
        newDoc.pdfData = pdfData;
        newDoc.pdfName = document.getElementById('doc-pdf-name').innerText;
        newDoc.pdfSize = document.getElementById('doc-pdf-size').innerText;

        // Фоновая задача: извлечь текст из PDF для умного поиска
        setTimeout(async () => {
            showToast("📄 Индексация текста документа для ИИ...");
            const realUrl = await PhotoManager.getAsyncUrl(pdfData) || pdfData;
            const extracted = await window.extractTextFromPdf(realUrl);
            if (extracted) {
                // Достаем свежую базу, чтобы избежать перезаписи
                const freshDocs = await dbGetAll(STORES.CUSTOM_DOCS) || customDocs;
                const idx = freshDocs.findIndex(d => d.id === newDoc.id);
                if (idx !== -1) {
                    freshDocs[idx].extractedText = extracted;
                    freshDocs[idx].updatedAt = new Date().toISOString();
                    freshDocs[idx].updated_at = freshDocs[idx].updatedAt;

                    // ДОБАВЛЕНО: Говорим системе, что файл нужно снова отправить в облако
                    freshDocs[idx].source = 'local';
                    freshDocs[idx].syncStatus = 'not_synced';
                    freshDocs[idx].sync_status = 'not_synced';

                    await dbPut(STORES.CUSTOM_DOCS, freshDocs[idx]);
                    customDocs = freshDocs.filter(d => !d._deleted); // обновляем экран
                    showToast("✨ Текст документа успешно проиндексирован ИИ!");

                    localStorage.setItem('rbi_cloud_dirty', '1');
                    if (typeof triggerSync === 'function') triggerSync('silent');
                }
            } else {
                showToast("⚠️ Текст из PDF извлечь не удалось.");
            }
        }, 2000);
    }

    customDocs.unshift(newDoc);

    try {
        await dbPut(STORES.CUSTOM_DOCS, newDoc); // <-- НОВОЕ: Сохраняем только 1 запись
        showToast('✅ Норматив успешно добавлен!');
        closeAddDocModal();
        renderDocsList();

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    } catch (e) {
        console.error(e);
        showToast('❌ Ошибка сохранения (Файл слишком большой)');
    }
}

// Удаление
// Удаление
window.deleteCustomDoc = async function (id) {
    const doc = customDocs.find(d => d.id === id);
    if (!rbi_canDeleteKnowledgeItem(doc?.owner)) {
        return showToast("⚠️ Инженер может удалить только свой документ.");
    }
    if (!confirm('Удалить этот документ из базы?')) return;

    if (doc) {
        const nowIso = new Date().toISOString();
        doc._deleted = true;
        doc.is_deleted = true;
        doc.deleted_at = nowIso;
        doc.updatedAt = nowIso;
        doc.updated_at = nowIso;
        doc.source = 'local';
        doc.syncStatus = 'not_synced';
        doc.sync_status = 'not_synced';

        await dbPut(STORES.CUSTOM_DOCS, doc);
    }

    showToast('🗑️ Документ удален');
    customDocs = customDocs.filter(d => !d._deleted);
    renderDocsList();

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

// ПРОСМОТРЩИК НД (Используем оболочку TWI)
window.openDocViewer = async function (docId) {
    const allDocs = [...SYSTEM_DOCS, ...customDocs];
    const doc = allDocs.find(d => d.id === docId);
    if (!doc) return showToast('Документ не найден');

    if (doc.isSystem || !doc.pdfData) {
        return findAndOpenND(doc.code + " " + doc.title);
    }

    await window.rbiOpenPdfInTwiViewer(
        doc.pdfData,
        doc.title,
        doc.code || 'Нормативный документ',
        doc.pdfName || doc.code || 'document.pdf',
        doc.pdfSize || ''
    );

    if (!doc.extractedText && doc.pdfData && appSettings.aiEnabled) {
        setTimeout(async () => {
            try {
                const realUrl = await PhotoManager.getAsyncUrl(doc.pdfData) || doc.pdfData;
                const extracted = await window.extractTextFromPdf(realUrl);

                if (extracted) {
                    doc.extractedText = extracted;
                    doc.updatedAt = new Date().toISOString();
                    doc.updated_at = doc.updatedAt;
                    doc.source = 'local';
                    doc.syncStatus = 'not_synced';
                    doc.sync_status = 'not_synced';

                    await dbPut(STORES.CUSTOM_DOCS, doc);

                    localStorage.setItem('rbi_cloud_dirty', '1');
                    if (typeof triggerSync === 'function') triggerSync('silent');
                }
            } catch (e) {
                console.warn('[DocViewer] Индексация PDF пропущена:', e);
            }
        }, 2000);
    }
};
// === ПРАВА НА БАЗУ ЗНАНИЙ ===

function rbi_getCurrentRoleSafe() {
    return window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
}

function rbi_getCurrentUserNameSafe() {
    return window.RbiRoles ? window.RbiRoles.getCurrentEngineerName() : 'Инженер';
}

function rbi_canEditKnowledgeBase() {
    return window.RbiRoles ? window.RbiRoles.canEditKnowledgeBase() : false;
}

function rbi_canDeleteKnowledgeItem(ownerName) {
    return window.RbiRoles ? window.RbiRoles.canDelete(ownerName) : false;
}

function rbi_requireKnowledgeEditRight() {
    if (!rbi_canEditKnowledgeBase()) {
        showToast('⛔ Ваша роль не позволяет редактировать базу знаний');
        return false;
    }
    return true;
}
// ==========================================
// БЛОК: TWI КАРТЫ И КОНСТРУКТОР (ЭТАП 1: БД и UI)
// ==========================================

let customTwiCards = [];
let twiStepCount = 0;
let currentEditingTwiId = null;
let currentTwiStepUploadId = null;
let currentTwiType = 'INSPECTOR';

// === 1. ВШИТЫЕ СИСТЕМНЫЕ TWI КАРТЫ (ИХ НЕЛЬЗЯ УДАЛИТЬ) ===
// Сюда ты можешь вставлять код карт, выгруженных через кнопку "В код (Экспорт)"

// Загрузка TWI карт при старте и слияние с системными
// === 1. ВШИТЫЕ СИСТЕМНЫЕ TWI КАРТЫ (ИХ НЕЛЬЗЯ УДАЛИТЬ) ===
// Сюда ты можешь вставлять код карт, выгруженных через кнопку "В код (Экспорт)"

// Глобальная функция для перезагрузки данных справочника из базы в оперативную память
// Глобальная функция для перезагрузки данных справочника из базы в оперативную память
window.rbi_reloadReferenceMemory = async function () {
    try {
        // 1. TWI КАРТЫ
        const loadedTwi = await dbGetAll(STORES.TWI_CARDS) || [];
        const sysTwiIds = (typeof SYSTEM_TWI_CARDS !== 'undefined' ? SYSTEM_TWI_CARDS : []).map(c => String(c.id));
        customTwiCards = loadedTwi.filter(c => !sysTwiIds.includes(String(c.id)) && !c._deleted);

        // 2. ТЕХНИЧЕСКИЕ УЗЛЫ
        const loadedNodes = await dbGetAll(STORES.CUSTOM_NODES) || [];
        const sysNodeIds = (typeof SYSTEM_NODES !== 'undefined' ? SYSTEM_NODES : []).map(c => String(c.id));
        customNodes = loadedNodes.filter(c => !sysNodeIds.includes(String(c.id)) && !c._deleted);

        // 3. НОРМАТИВНЫЕ ДОКУМЕНТЫ
        const loadedDocs = await dbGetAll(STORES.CUSTOM_DOCS) || [];
        const sysDocIds = (typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []).map(c => String(c.id));
        customDocs = loadedDocs.filter(c => !sysDocIds.includes(String(c.id)) && !c._deleted);

        // 4. ПОЛЬЗОВАТЕЛЬСКИЕ ЧЕК-ЛИСТЫ (Они уже были в отдельной базе)
        const storedTmpls = await dbGetAll(STORES.TEMPLATES);
        if (storedTmpls && storedTmpls.length > 0) {
            userTemplates = {};
            storedTmpls.forEach(t => {
                if (!t.data._deleted) {
                    userTemplates[t.slug] = t.data;
                }
            });
        }
    } catch (e) { console.error("Ошибка обновления памяти Справочников", e); }
};

// Загрузка при старте приложения
document.addEventListener("DOMContentLoaded", async () => {
    await window.rbi_reloadReferenceMemory();
    if (typeof renderTwiList === 'function') renderTwiList();
});

// Анимация меню управления TWI
function toggleTwiManagePanel() {
    const body = document.getElementById('twi-manage-body');
    const icon = document.getElementById('twi-manage-toggle-icon');
    if (!body || !icon) return;
    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
        body.style.maxHeight = '200px';
        body.style.opacity = '1';
        body.style.marginTop = '12px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        icon.style.transform = 'rotate(-90deg)';
    }
}

// ЭКСПОРТ (ВЫГРУЗКА В JSON)
function exportTwiJson() {
    // Выгружаем ТОЛЬКО пользовательские карты (системные и так уже в коде)
    const userCardsToExport = customTwiCards.filter(c => !c.id.startsWith('sys_'));
    if (userCardsToExport.length === 0) return showToast('Нет пользовательских карт для экспорта');

    const dataStr = JSON.stringify(userCardsToExport, null, 4);
    downloadFile(dataStr, `RBI_TWI_Cards_${new Date().toLocaleDateString('ru-RU')}.json`, 'application/json');
    showToast("✅ JSON-файл скачан!");
}

// ИМПОРТ (ЗАГРУЗКА ИЗ JSON)
function processTwiImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Неверный формат");

            let addedCount = 0;
            for (const item of data) {
                // Если карты с таким ID еще нет, добавляем
                if (!customTwiCards.find(x => x.id === item.id)) {
                    customTwiCards.push(item);
                    await dbPut(STORES.TWI_CARDS, item); // <-- НОВОЕ: Сохраняем сразу в цикле
                    addedCount++;
                }
            }

            showToast(`✅ Импорт завершен! Добавлено карт: ${addedCount}`);
            renderTwiList();
        } catch (err) {
            console.error(err);
            alert("Ошибка импорта. Проверьте формат файла.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
// 1. РЕНДЕР СПИСКА TWI КАРТ (С бейджиками типов)

// === ПОИСК КАНДИДАТОВ ДЛЯ МАГИИ TWI ===
window.getMagicTwiCandidates = function () {
    let twiMagicMap = {};
    contractorArray.forEach(check => {
        if (check.state && check.photos) {
            Object.keys(check.state).forEach(id => {
                const s = check.state[id];
                if (check.photos[id]) {
                    const tType = check.templateKey.split('_')[0];
                    const tKey = check.templateKey.replace(tType + '_', '');
                    const cl = tType === 'sys' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (userTemplates[tKey] ? userTemplates[tKey].groups : []);
                    const foundItem = getFlatList(cl).find(x => x.id == id);
                    let defName = foundItem ? foundItem.n : "Дефект";

                    const magicKey = check.templateKey + '_' + id;
                    if (!twiMagicMap[magicKey]) twiMagicMap[magicKey] = { ok: null, fail: null, title: defName, tmplKey: check.templateKey, itemId: id };

                    if (s === 'ok') twiMagicMap[magicKey].ok = check.photos[id];
                    else if (s === 'fail' || s === 'fail_escalated') twiMagicMap[magicKey].fail = check.photos[id];
                }
            });
        }
    });

    const magicCandidates = Object.values(twiMagicMap).filter(m => m.ok && m.fail);
    return magicCandidates.filter(m => {
        const existing = customTwiCards.find(c => c.checklistKey === m.tmplKey && String(c.itemId) === String(m.itemId) && c.type === 'INSPECTOR');
        return !existing; // Оставляем только те, для которых еще нет карточки
    });
};
// 2. ОТКРЫТИЕ КОНСТРУКТОРА И ПЕРЕКЛЮЧЕНИЕ ТИПОВ

// === 1. РЕНДЕР СПИСКА TWI КАРТ (ИОС СТИЛЬ С ГРУППИРОВКОЙ) ===
// === 1. РЕНДЕР СПИСКА TWI КАРТ (ИОС СТИЛЬ С ГРУППИРОВКОЙ И СВОРАЧИВАНИЕМ) ===
// === 1. РЕНДЕР СПИСКА TWI КАРТ (ИОС СТИЛЬ С ГРУППИРОВКОЙ И СВОРАЧИВАНИЕМ) ===
function renderTwiList() {
    const container = document.getElementById('twi-cards-container');
    const searchInput = document.getElementById('twi-search-input')?.value.toLowerCase() || '';
    if (!container) return;

    // --- 1. МАГИЯ TWI (ПЛАШКА) ---
    const newMagicCandidates = window.getMagicTwiCandidates ? window.getMagicTwiCandidates() : [];
    let magicTwiHtml = '';

    if (newMagicCandidates.length > 0 && !searchInput) {
        magicTwiHtml = `
            <div id="twi-magic-block" class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm mb-4 text-white overflow-hidden relative magic-collapsed" style="transition: padding 0.3s ease;">
                <div onclick="document.getElementById('twi-magic-block').classList.toggle('magic-collapsed')" class="cursor-pointer p-3">
                    <button class="absolute top-3 right-3 text-white/50 hover:text-white/100 transition-colors pointer-events-none">
                        <svg class="w-5 h-5 magic-arrow transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="flex items-center gap-2 font-black uppercase tracking-widest text-[11px] drop-shadow-md">
                        <span class="text-lg animate-pulse">✨</span> Магия TWI (Найдено: ${newMagicCandidates.length})
                    </div>
                </div>
                
                <div class="magic-content-wrapper px-3">
                    <div class="magic-content">
                        <div class="text-[11px] font-medium text-indigo-100 mb-3 leading-snug">
                            Система нашла эталоны (OK) и брак (FAIL) для одних и тех же пунктов. За создание TWI-карты начислен <b class="text-yellow-300">Бонус XP!</b>
                        </div>
                        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-3">
                            ${newMagicCandidates.map((m) => `
                                <div class="bg-white/10 border border-white/20 p-2.5 rounded-xl shrink-0 w-48 flex flex-col justify-between">
                                    <div class="text-[10px] font-bold leading-tight line-clamp-2 mb-3" title="${m.title}">${m.title}</div>
                                    <button onclick="window.createMagicTwi('${m.tmplKey}', '${m.itemId}', '${m.ok}', '${m.fail}', '${m.title.replace(/'/g, "\\'")}')" class="w-full bg-white text-indigo-600 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform">Создать (+100 XP)</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <style>
                #twi-magic-block.magic-collapsed { padding-bottom: 0px; }
                #twi-magic-block.magic-collapsed .magic-arrow { transform: rotate(0deg); }
                #twi-magic-block:not(.magic-collapsed) .magic-arrow { transform: rotate(180deg); }
                .magic-content-wrapper { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.3s ease-out; }
                #twi-magic-block.magic-collapsed .magic-content-wrapper { grid-template-rows: 0fr; }
                .magic-content { overflow: hidden; }
            </style>
        `;
    }

    // --- 2. СПИСОК КАРТОЧЕК ---
    const currentEngineer = appSettings.engineerName || 'Инженер';

    const filtered = customTwiCards.filter(card => {
        const title = String(card.title || card.name || card.data?.title || '').toLowerCase();
        const checklistName = String(card.checklistName || card.category || card.data?.checklistName || 'Без привязки').toLowerCase();
        const type = String(card.type || card.data?.type || '').toLowerCase();
        const owner = card.owner || card.data?.owner || '';

        const matchSearch =
            title.includes(searchInput) ||
            checklistName.includes(searchInput) ||
            type.includes(searchInput);

        const matchOwner =
            window.twiOwnerFilter === 'ALL' ||
            owner === currentEngineer;

        return matchSearch && matchOwner;
    });

    let html = '';

    if (filtered.length === 0) {
        html = `<div class="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Инструкций пока нет</div>`;
    } else {
        // Группируем по чек-листу
        const grouped = {};
        filtered.forEach(c => {
            const groupName = c.checklistName || c.category || c.data?.checklistName || 'Без привязки';
            if (!grouped[groupName]) grouped[groupName] = [];
            grouped[groupName].push(c);
        });

        for (let checklistName in grouped) {
            html += `
            <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
                <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
                    <span class="truncate pr-4">${checklistName} <span class="text-[10px] text-slate-400 ml-1">(${grouped[checklistName].length})</span></span>
                    <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
            `;

            grouped[checklistName].forEach(card => {
                let typeIcon = ''; let typeText = ''; let typeColor = '';
                if (card.type === 'INSPECTOR') {
                    typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
                    typeText = 'Технадзор'; typeColor = 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
                } else if (card.type === 'WORKER') {
                    typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>`;
                    typeText = 'Пошаговая'; typeColor = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800';
                } else if (card.type === 'PDF') {
                    typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>`;
                    typeText = 'Регламент'; typeColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
                }

                let infoText = '';
                if (card.type === 'WORKER') infoText = `Шагов: ${card.steps?.length || 0}`;
                else if (card.type === 'INSPECTOR') infoText = `Визуал`;
                else if (card.type === 'PDF') infoText = `${card.pdfSize || 'Файл'}`;

                // Ищем картинку для превью
                let previewImg = null;
                if (card.type === 'INSPECTOR') previewImg = card.photoGood || card.photoBad;
                else if (card.type === 'WORKER' && card.steps && card.steps.length > 0) {
                    const stepWithPhoto = card.steps.find(s => s.photo);
                    if (stepWithPhoto) previewImg = stepWithPhoto.photo;
                }

                // === ИНТЕЛЛЕКТУАЛЬНОЕ iOS-ПРЕВЬЮ КАРТИНКИ ИЛИ PDF ===
                let previewHtml = '';
                if (card.type === 'PDF') {
                    // Превью для PDF в стиле приложения "Файлы" Apple
                    previewHtml = `
                    <div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 relative">
                        <div class="w-10 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-1.5 relative overflow-hidden">
                            <div class="absolute top-0 left-0 right-0 h-3.5 bg-red-500 flex items-center justify-center"><span class="text-[7px] text-white font-black tracking-widest">PDF</span></div>
                            <div class="space-y-1 mt-4">
                                <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                                <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                                <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>`;
                } else {
                    previewHtml = previewImg
                        ? `<img src="${window.getPhotoSrc(previewImg)}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 ${typeColor}">${typeIcon}</div>`;
                }

                let isOwner = !card.id.startsWith('sys_') && (!card.owner || card.owner === currentEngineer);
                let isSystem = card.id.startsWith('sys_');

                html += `
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openTwiViewer('${card.id}')">
                    ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИСТЕМА</div>' : ''}
                    
                    <div class="h-28 sm:h-32 border-b border-[var(--card-border)] relative">
                        ${previewHtml}
                        <button onclick="event.stopPropagation(); openUniversalActionSheet('${card.id}', 'twi', '${card.title.replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                        </button>
                    </div>
                    
                    <div class="p-3 flex flex-col flex-1">
                        <div class="text-[8px] font-black px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border ${typeColor} truncate max-w-full">${typeText}</div>
                        <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">${card.title}</div>
                        
                        <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                            <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                                <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                ${card.owner ? card.owner.split(' ')[0] : 'Система'}
                            </div>
                            <div class="text-[9px] font-black text-slate-400">${infoText}</div>
                        </div>
                    </div>
                </div>`;
            });

            html += `</div></details>`;
        }
    }

    // --- 3. ИТОГОВЫЙ ВЫВОД ---
    // Сначала ставим Магию, а потом уже список (или надпись "пусто")
    container.innerHTML = magicTwiHtml + html;
}

// === КОНТЕКСТНОЕ МЕНЮ TWI ===
let currentActionTwiId = null;

function openTwiActionSheet(twiId, event) {
    if (event) event.stopPropagation();
    currentActionTwiId = twiId;
    const overlay = document.getElementById('twi-action-sheet');
    const card = customTwiCards.find(c => c.id === twiId);
    if (!card) return;

    document.getElementById('twi-action-title').innerText = card.title;

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('.transform').classList.remove('translate-y-full');
    }, 10);
}

function closeTwiActionSheet() {
    const overlay = document.getElementById('twi-action-sheet');
    overlay.classList.add('opacity-0');
    overlay.querySelector('.transform').classList.add('translate-y-full');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentActionTwiId = null;
    }, 300);
}

function handleTwiAction(action) {
    const id = currentActionTwiId;
    closeTwiActionSheet();

    // Проверяем права: если есть владелец и он не совпадает с текущим именем инженера - блокируем
    const card = customTwiCards.find(c => c.id === id);
    const currentEngineer = appSettings.engineerName || 'Инженер';
    const isOwner = !card || !card.owner || card.owner === currentEngineer;

    setTimeout(() => {
        if (action === 'view') {
            openTwiViewer(id);
            return;
        }

        if (!rbi_canEditKnowledgeBase()) {
            showToast('⛔ Ваша роль не позволяет редактировать базу знаний');
            return;
        }

        if (action === 'duplicate') {
            duplicateTwiCard(id);
            return;
        }

        if (action === 'edit') {
            if (!rbi_canDeleteKnowledgeItem(card?.owner)) {
                showToast('⚠️ Редактировать чужую инструкцию может только заместитель или администратор');
                return;
            }

            openTwiConstructor(id);
            return;
        }

        if (action === 'delete') {
            deleteTwiCard(id);
        }
    }, 350);
}

async function duplicateTwiCard(id) {
    if (!rbi_requireKnowledgeEditRight()) return;
    const card = customTwiCards.find(c => c.id === id);
    if (!card) return;
    const newCard = JSON.parse(JSON.stringify(card));
    newCard.id = 'twi_' + Date.now().toString(36);
    newCard.owner = rbi_getCurrentUserNameSafe();
    newCard.source = 'local';
    newCard.syncStatus = 'not_synced';
    newCard.sync_status = 'not_synced';
    newCard.syncBlockReason = '';
    newCard.sync_block_reason = '';
    newCard.createdAt = new Date().toISOString();
    newCard.updatedAt = newCard.createdAt;
    newCard.title = newCard.title + ' (Копия)';
    customTwiCards.push(newCard);

    try {
        await dbPut(STORES.TWI_CARDS, newCard); // <-- НОВОЕ: Сохраняем новую карту
        showToast("✅ Карта дублирована");
        renderTwiList();
    } catch (e) { showToast("❌ Ошибка при дублировании"); }
}

// 2. ОТКРЫТИЕ КОНСТРУКТОРА И ПЕРЕКЛЮЧЕНИЕ ТИПОВ
function changeTwiType(type) {
    currentTwiType = type;
    const btns = ['inspector', 'worker', 'pdf'];
    btns.forEach(b => {
        const btnEl = document.getElementById(`twi-type-btn-${b}`);
        if (btnEl) btnEl.className = "flex-1 py-2.5 text-[10px] font-bold uppercase rounded-lg text-slate-500 hover:text-slate-700 transition-all bg-transparent border border-transparent shadow-none flex items-center justify-center gap-1.5";
    });

    const activeBtn = document.getElementById(`twi-type-btn-${type.toLowerCase()}`);
    if (activeBtn) activeBtn.className = "flex-1 py-2.5 text-[10px] font-bold uppercase rounded-lg bg-indigo-50 shadow-sm text-indigo-600 border border-indigo-200 transition-all flex items-center justify-center gap-1.5";

    document.getElementById('twi-block-inspector').classList.add('hidden');
    document.getElementById('twi-block-worker').classList.add('hidden');
    document.getElementById('twi-block-pdf').classList.add('hidden');
    document.getElementById(`twi-block-${type.toLowerCase()}`).classList.remove('hidden');
}

function populateTwiItemSelect(selectedItemId = null) {
    const checklistKey = document.getElementById('twi-checklist-select').value;
    const itemSelect = document.getElementById('twi-item-select');

    if (!checklistKey) {
        itemSelect.innerHTML = '<option value="" disabled selected>Сначала выберите чек-лист выше...</option>';
        document.getElementById('twi-auto-norm-text').innerText = 'Выберите пункт чек-листа...';
        return;
    }

    let checklistGroups = [];
    const type = checklistKey.split('_')[0];
    const key = checklistKey.replace(type + '_', '');

    if (type === 'sys' && SYSTEM_TEMPLATES[key]) checklistGroups = SYSTEM_TEMPLATES[key].groups;
    else if (type === 'user' && userTemplates[key]) checklistGroups = userTemplates[key].groups;

    if (checklistGroups.length === 0) {
        itemSelect.innerHTML = '<option value="" disabled selected>Чек-лист пуст...</option>';
        return;
    }

    let optionsHtml = '<option value="ALL" class="font-bold text-indigo-600">📘 Привязать ко всему виду работ</option>';
    optionsHtml += '<option value="" disabled>--- Или выберите конкретный пункт ---</option>';

    checklistGroups.forEach(g => {
        optionsHtml += `<optgroup label="${g.group || g.title}">`;
        g.items.forEach(i => { optionsHtml += `<option value="${i.id}">[B${i.w}] ${i.n}</option>`; });
        optionsHtml += `</optgroup>`;
    });

    itemSelect.innerHTML = optionsHtml;

    if (selectedItemId) {
        itemSelect.value = String(selectedItemId);
        autoFillTwiNorm(); // Автозаполнение норматива
    } else {
        document.getElementById('twi-auto-norm-text').innerText = 'Справочная информация не найдена';
    }
}

// Автоподстановка норматива
function autoFillTwiNorm() {
    const checklistKey = document.getElementById('twi-checklist-select').value;
    const itemId = document.getElementById('twi-item-select').value;
    const normTextEl = document.getElementById('twi-auto-norm-text');

    if (!checklistKey || !itemId || itemId === 'ALL') {
        normTextEl.innerText = 'Общая инструкция (Норматив не привязан)';
        return;
    }

    const type = checklistKey.split('_')[0];
    const key = checklistKey.replace(type + '_', '');
    const checklistGroups = type === 'sys' && SYSTEM_TEMPLATES[key] ? SYSTEM_TEMPLATES[key].groups : (userTemplates[key] ? userTemplates[key].groups : []);

    const item = getFlatList(checklistGroups).find(x => String(x.id) === String(itemId));
    if (item && item.t) {
        // Убираем HTML теги из текста норматива
        const cleanNorm = item.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ");
        normTextEl.innerText = cleanNorm;
        normTextEl.dataset.raw = cleanNorm;
    } else {
        normTextEl.innerText = 'Норматив для этого пункта не заполнен';
        normTextEl.dataset.raw = '';
    }
}

// Искать норматив в базе (открывает вкладку)
window.searchNormFromTwi = function () {
    const textEl = document.getElementById('twi-auto-norm-text');
    const text = textEl.dataset.raw || textEl.innerText;

    if (!text || text.includes('не заполнен') || text.includes('Выберите')) {
        return showToast('Сначала выберите пункт с заполненным нормативом');
    }

    const match = text.match(/(СП\s?\d+(\.\d+)*|ГОСТ\s?(Р\s)?\d+(-\d+)?)/i);
    const searchString = match ? match[0] : text.substring(0, 15);

    closeTwiConstructor();
    switchTab('tab-reference');
    setTimeout(() => {
        const btns = document.querySelectorAll('.sub-tab-btn');
        if (btns[1]) switchReferenceSubTab('ref-sub-docs', btns[1]);
        const searchInput = document.getElementById('doc-search-input');
        if (searchInput) {
            searchInput.value = searchString;
            currentDocFilter = 'ALL';
            renderDocsList();
        }
    }, 200);
};

// Привязка узла (Модалка)
function openNodeSelectorModal() {
    const listEl = document.getElementById('node-selector-list');

    // 1. Объединяем системные и пользовательские (твои) узлы
    const allNodes = [...(typeof SYSTEM_NODES !== 'undefined' ? SYSTEM_NODES : []), ...customNodes];

    // 2. Отрисовываем список
    listEl.innerHTML = allNodes.map(node => {

        // Определяем картинку для превью (поддерживаем и старый формат, и новый массив файлов)
        let previewSrc = '';
        if (node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'image') {
            previewSrc = window.getPhotoSrc(node.attachments[0].url);
        } else if (node.img && !node.img.includes('application/pdf')) {
            previewSrc = window.getPhotoSrc(node.img);
        }

        const imgHtml = previewSrc
            ? `<img src="${previewSrc}" class="w-12 h-12 object-cover rounded-lg border border-slate-100 bg-white dark:bg-slate-900">`
            : `<div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-[8px] font-black text-slate-400 uppercase">📄 PDF</div>`;

        return `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer active:scale-95 transition-transform" onclick="selectNodeForTwi('${node.id}', '${(node.title || 'Узел').replace(/'/g, "\\'")}')">
            ${imgHtml}
            <div class="flex-1 min-w-0">
                <div class="text-[9px] font-black text-indigo-500 uppercase">${node.category || 'Без категории'}</div>
                <div class="text-[12px] font-bold text-slate-800 dark:text-white truncate">${node.title || 'Без названия'}</div>
            </div>
        </div>`;
    }).join('') + `<button onclick="selectNodeForTwi('', 'Не привязан')" class="w-full mt-2 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase border border-red-200 active:scale-95 transition-colors">Отвязать узел</button>`;

    const overlay = document.getElementById('node-selector-modal');
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('.transform').classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    }, 10);
}

function closeNodeSelectorModal() {
    const overlay = document.getElementById('node-selector-modal');
    overlay.classList.add('opacity-0');
    overlay.querySelector('.transform').classList.add('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

function selectNodeForTwi(id, title) {
    document.getElementById('twi-linked-node-id').value = id;
    const nameEl = document.getElementById('twi-linked-node-name');
    nameEl.innerText = title;
    nameEl.className = id ? "text-[12px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5" : "text-[12px] font-black text-slate-800 dark:text-white mt-0.5";
    closeNodeSelectorModal();
}

function openTwiConstructor(editId = null) {
    if (!rbi_requireKnowledgeEditRight()) return;
    document.getElementById('twi-list-view').classList.add('hidden');
    const view = document.getElementById('twi-constructor-view');
    view.classList.remove('hidden');
    document.body.classList.add('modal-open'); // Блокируем фон
    view.scrollTo(0, 0); // Скроллим само модальное окно наверх

    const selectEl = document.getElementById('twi-checklist-select');
    let options = '<option value="" disabled selected>Выберите вид работ...</option>';

    const sysKeys = Object.keys(SYSTEM_TEMPLATES).sort((a, b) => SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title, 'ru'));
    sysKeys.forEach(key => { options += `<option value="sys_${key}">${SYSTEM_TEMPLATES[key].title}</option>`; });

    const userKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru'));
    userKeys.forEach(key => { options += `<option value="user_${key}">${userTemplates[key].title}</option>`; });

    selectEl.innerHTML = options;
    // Заполняем селектор НД
    const selectDoc = document.getElementById('twi-linked-doc-id');
    let docOptions = '<option value="">Не привязывать</option>';
    const allDocs = [...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []), ...(typeof customDocs !== 'undefined' ? customDocs : [])];
    allDocs.sort((a, b) => a.code.localeCompare(b.code)).forEach(doc => {
        const shortTitle = doc.title.length > 40 ? doc.title.substring(0, 40) + '...' : doc.title;
        docOptions += `<option value="${doc.id}">${doc.code} - ${shortTitle}</option>`;
    });
    selectDoc.innerHTML = docOptions;
    // Сброс полей
    document.getElementById('twi-title-input').value = '';
    document.getElementById('twi-steps-container').innerHTML = '';
    document.getElementById('twi-why-input').value = '';
    document.getElementById('twi-compliance-input').value = '';
    document.getElementById('twi-preparation-input').value = '';
    document.getElementById('twi-video-link-input').value = '';
    selectNodeForTwi('', 'Не привязан');

    removeTwiGoodPhoto(); removeTwiBadPhoto(); removeTwiPdf();
    twiStepCount = 0; currentEditingTwiId = editId;

    if (editId) {
        const card = customTwiCards.find(c => c.id === editId);
        if (card) {
            document.getElementById('twi-title-input').value = card.title;
            selectEl.value = card.checklistKey;
            document.getElementById('twi-video-link-input').value = card.videoLink || '';

            populateTwiItemSelect(card.type === 'INSPECTOR' ? card.itemId : null);
            changeTwiType(card.type || 'WORKER');
            selectDoc.value = card.linkedDocId || '';
            selectNodeForTwi(card.linkedNodeId || '', card.linkedNodeId ? (SYSTEM_NODES.find(n => n.id === card.linkedNodeId)?.title || customNodes.find(n => n.id === card.linkedNodeId)?.title || 'Узел') : 'Не привязан');
            if (card.type === 'INSPECTOR') {
                document.getElementById('twi-why-input').value = card.whyImportant || '';


                // РАСЩЕПЛЕНИЕ ПОЛЯ howToCheck
                let comp = "", prep = "";
                if (card.howToCheck) {
                    if (card.howToCheck.includes('[Как подготовить]')) {
                        const parts = card.howToCheck.split('[Как подготовить]\n');
                        prep = parts[1] || '';
                        comp = parts[0].replace('[Что соблюсти]\n', '').trim();
                    } else {
                        comp = card.howToCheck.replace('[Что соблюсти]\n', '').trim();
                    }
                }
                document.getElementById('twi-compliance-input').value = comp;
                document.getElementById('twi-preparation-input').value = prep;

                if (card.photoGood) renderGoodPhoto(card.photoGood);
                if (card.photoBad) renderBadPhoto(card.photoBad);
            } else if (card.type === 'PDF') {
                if (card.pdfData) renderPdfFile(card.pdfName, card.pdfSize, card.pdfData);
            } else {
                card.steps.forEach(step => addTwiStep(step));
            }
        }
    } else {
        changeTwiType('INSPECTOR'); addTwiStep(); populateTwiItemSelect();
    }
}

// 5. СОХРАНЕНИЕ TWI КАРТЫ С УЧЕТОМ ДВУХ ПОЛЕЙ
async function saveTwiCard() {
    if (!rbi_requireKnowledgeEditRight()) return;
    const title = document.getElementById('twi-title-input').value.trim();
    const select = document.getElementById('twi-checklist-select');
    const checklistKey = select.value;
    const checklistName = select.options[select.selectedIndex]?.text || 'Без привязки';

    if (!title) return showToast("⚠️ Укажите название!");
    if (currentTwiType !== 'PDF' && !checklistKey) return showToast("⚠️ Укажите привязку к чек-листу!");
    // ЗАЩИТА ОТ ДУБЛИКАТОВ: Проверяем, нет ли уже такой карты в базе (для типа Технадзор)
    if (currentTwiType === 'INSPECTOR' && !currentEditingTwiId) {
        const itemId = document.getElementById('twi-item-select').value;
        const existingCard = customTwiCards.find(c => 
            c.checklistKey === checklistKey && 
            String(c.itemId) === String(itemId) && 
            c.type === 'INSPECTOR' && 
            !c._deleted
        );
        if (existingCard) {
            return showToast("⚠️ TWI-карта для этого пункта уже создана другим инженером! Обновите базу.");
        }
    }
    let cardData = {
        id: currentEditingTwiId || 'twi_' + Date.now().toString(36),
        title: title, checklistKey: checklistKey, checklistName: checklistName, type: currentTwiType,
        owner: appSettings.engineerName || 'Инженер',
        linkedNodeId: document.getElementById('twi-linked-node-id').value || null,
        linkedDocId: document.getElementById('twi-linked-doc-id').value || null,
        videoLink: document.getElementById('twi-video-link-input').value.trim() || null
    };

    if (currentTwiType === 'INSPECTOR') {
        const itemId = document.getElementById('twi-item-select').value;
        const why = document.getElementById('twi-why-input').value.trim();
        const comp = document.getElementById('twi-compliance-input').value.trim();
        const prep = document.getElementById('twi-preparation-input').value.trim();
        const linkedNode = document.getElementById('twi-linked-node-id').value;

        if (!itemId) return showToast("⚠️ Выберите конкретный пункт контроля!");
        if (!comp && !prep) return showToast("⚠️ Заполните хотя бы одно поле: Что соблюсти или Как подготовить!");

        // СОБИРАЕМ ПОЛЯ В ОДНО ДЛЯ СОВМЕСТИМОСТИ
        let how = "";
        if (comp && prep) how = `[Что соблюсти]\n${comp}\n\n[Как подготовить]\n${prep}`;
        else if (comp) how = `[Что соблюсти]\n${comp}`;
        else if (prep) how = `[Как подготовить]\n${prep}`;

        cardData.itemId = itemId === 'ALL' ? 'ALL' : parseInt(itemId);
        cardData.whyImportant = why;
        cardData.howToCheck = how;

        cardData.photoGood = document.getElementById('twi-photo-good-container').dataset.photo || null;
        cardData.photoBad = document.getElementById('twi-photo-bad-container').dataset.photo || null;

    } else if (currentTwiType === 'WORKER') {
        const stepEls = document.getElementById('twi-steps-container').querySelectorAll('.twi-step-item');
        if (stepEls.length === 0) return showToast("⚠️ Добавьте хотя бы один шаг!");

        const steps = []; let totalTime = 0; let isValid = true;
        stepEls.forEach((el, index) => {
            const text = el.querySelector('.twi-step-text').value.trim();
            const time = parseInt(el.querySelector('.twi-step-time').value) || 0;
            const photo = el.querySelector('.twi-photo-container').dataset.photo || null;
            if (!text) isValid = false;
            totalTime += time;
            steps.push({ order: index + 1, text: text, time: time, photo: photo });
        });

        if (!isValid) return showToast("⚠️ Заполните текст во всех шагах!");
        cardData.totalTime = totalTime; cardData.steps = steps;
    } else if (currentTwiType === 'PDF') {
        const pdfData = document.getElementById('twi-pdf-container').dataset.pdf;
        if (!pdfData) return showToast("⚠️ Загрузите PDF-файл!");
        cardData.pdfData = pdfData; cardData.pdfName = document.getElementById('twi-pdf-name').innerText; cardData.pdfSize = document.getElementById('twi-pdf-size').innerText;
    }
    if (!cardData.owner) {
        cardData.owner = rbi_getCurrentUserNameSafe();
    }

    cardData.source = 'local';
    cardData.syncStatus = 'not_synced';
    cardData.sync_status = 'not_synced';
    cardData.syncBlockReason = '';
    cardData.sync_block_reason = '';
    // Добавляем дату обновления
    cardData.updatedAt = new Date().toISOString();

    if (currentEditingTwiId) {
        const index = customTwiCards.findIndex(c => c.id === currentEditingTwiId);
        if (index !== -1) {
            // Сохраняем дату создания, если была
            cardData.createdAt = customTwiCards[index].createdAt || cardData.updatedAt;
            customTwiCards[index] = cardData;
        }
    } else {
        cardData.createdAt = cardData.updatedAt;
        customTwiCards.push(cardData);
    }

    try {
        await dbPut(STORES.TWI_CARDS, cardData); // <-- НОВОЕ: Сохраняем только 1 карту
        showToast("✅ Инструкция успешно сохранена!");
        closeTwiConstructor();

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
        // АВТОЗАКРЫТИЕ ЗАДАЧИ "МАГИЯ TWI"
        if (typeof window.rbi_tasksData !== 'undefined' && typeof window.getMagicTwiCandidates === 'function') {
            const remaining = window.getMagicTwiCandidates().length;
            const magicTask = window.rbi_tasksData.find(t => t.taskType === 'Магия TWI' && t.status === 'pending');
            if (magicTask) {
                magicTask.done = (magicTask.done || 0) + 1;
                if (remaining === 0) {
                    magicTask.status = 'done';
                    magicTask.resultComment = 'Все карточки созданы';
                } else {
                    magicTask.target = magicTask.done + remaining;
                    magicTask.resultComment = `В процессе (${magicTask.done}/${magicTask.target})`;
                }
                magicTask.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') await dbPut(STORES.TASKS, magicTask);
                if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
            }
        }
    } catch (e) { showToast("❌ Ошибка при сохранении"); }
}

// === МАГИЯ РАЗМЕТКИ (ФОТО РЕДАКТОР ДЛЯ TWI) ===
let currentMarkupTarget = null;

window.triggerTwiMarkupUpload = function (target) {
    currentMarkupTarget = target;
    const inputId = target === 'GOOD' ? 'twi-photo-good-input' : 'twi-photo-bad-input';
    document.getElementById(inputId).click();
};

window.triggerTwiPhotoUpload = function (stepId) {
    currentTwiStepUploadId = stepId;
    currentMarkupTarget = 'STEP';
    document.getElementById('twi-photo-input').click();
};

window.handleTwiGoodPhotoUpload = function (event) { handleTwiMarkupUpload(event, 'GOOD'); };
window.handleTwiBadPhotoUpload = function (event) { handleTwiMarkupUpload(event, 'BAD'); };
window.handleTwiPhotoUpload = function (event) { handleTwiMarkupUpload(event, 'STEP'); };

function handleTwiMarkupUpload(event, target) {
    const file = event.target.files[0];
    if (!file) return;

    currentMarkupTarget = target;

    const reader = new FileReader();
    reader.onload = function (e) {
        editorImgElement = new Image();
        editorImgElement.onload = function () {
            document.getElementById('photo-editor-overlay').style.display = 'flex';
            document.body.classList.add('modal-open');
            initPhotoEditor();

            const saveBtn = document.querySelector('#photo-editor-overlay button.text-green-400');
            saveBtn.onclick = saveTwiMarkupPhoto;
        }
        editorImgElement.src = e.target.result;
    }
    reader.readAsDataURL(file);
    event.target.value = '';
}

async function saveTwiMarkupPhoto() {
    if (!editorCanvas || !currentMarkupTarget) return;

    const base64 = editorCanvas.toDataURL('image/jpeg', 0.85);
    // ДОБАВЛЕНО: Правильное сохранение в локальный файловый кэш!
    const localUrl = await PhotoManager.saveLocal(base64, 'twi');

    if (currentMarkupTarget === 'GOOD') renderGoodPhoto(localUrl);
    else if (currentMarkupTarget === 'BAD') renderBadPhoto(localUrl);
    else if (currentMarkupTarget === 'STEP' && currentTwiStepUploadId) {
        const container = document.getElementById(currentTwiStepUploadId).querySelector('.twi-photo-container');
        container.dataset.photo = localUrl;
        container.innerHTML = `<div class="relative w-full h-48 md:h-64 rounded-lg overflow-hidden border border-slate-200 shadow-sm mt-2 bg-slate-50 dark:bg-slate-900"><img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-contain"><button onclick="removeTwiPhoto('${currentTwiStepUploadId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
    }

    showToast("📸 Фото добавлено!");

    document.getElementById('photo-editor-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    const saveBtn = document.querySelector('#photo-editor-overlay button.text-green-400');
    saveBtn.onclick = saveEditedPhoto;
    currentMarkupTarget = null;
}

function closeTwiConstructor() {
    document.getElementById('twi-list-view').classList.remove('hidden');
    document.getElementById('twi-constructor-view').classList.add('hidden');
    document.body.classList.remove('modal-open'); // Разблокируем фон
    currentEditingTwiId = null;
    renderTwiList();
}
// 3. ОБРАБОТКА ФОТО И PDF (ИНСПЕКТОР)
function compressImageToBase64(file, oldMaxWidth, oldQuality, callback) {
    // Жестко задаем новые стандарты сжатия (v16.8.7) игнорируя старые параметры
    const maxWidth = 1200;
    const quality = 0.6;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width; let height = img.height;

            if (width > height && width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            else if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }

            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);

            // Используем WebP для максимального сжатия
            let mimeType = 'image/webp';
            let dataUrl = canvas.toDataURL(mimeType, quality);

            // Fallback: старые iOS не умеют кодировать WebP и вернут PNG (который весит очень много). 
            // Перехватываем это и принудительно жмем в JPEG.
            if (dataUrl.startsWith('data:image/png')) {
                mimeType = 'image/jpeg';
                dataUrl = canvas.toDataURL(mimeType, quality);
            }

            callback(dataUrl);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function renderGoodPhoto(localUrl) {
    const cont = document.getElementById('twi-photo-good-container');
    cont.dataset.photo = localUrl;
    cont.innerHTML = `<div class="relative w-full h-40 md:h-64 rounded-lg overflow-hidden border border-green-300 shadow-sm mt-1 bg-slate-50 dark:bg-slate-900"><img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-contain"><button onclick="removeTwiGoodPhoto()" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
}
function removeTwiGoodPhoto() {
    const cont = document.getElementById('twi-photo-good-container');
    cont.dataset.photo = '';
    cont.innerHTML = `<button onclick="triggerTwiMarkupUpload('GOOD')" class="w-full h-full min-h-[80px] bg-white dark:bg-slate-800 border border-dashed border-green-300 py-4 rounded-lg text-[10px] font-bold text-green-600 active:scale-95 transition-all">➕ Загрузить фото</button>`;
}

function renderBadPhoto(localUrl) {
    const cont = document.getElementById('twi-photo-bad-container');
    cont.dataset.photo = localUrl;
    cont.innerHTML = `<div class="relative w-full h-40 md:h-64 rounded-lg overflow-hidden border border-red-300 shadow-sm mt-1 bg-slate-50 dark:bg-slate-900"><img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-contain"><button onclick="removeTwiBadPhoto()" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
}
function removeTwiBadPhoto() {
    const cont = document.getElementById('twi-photo-bad-container');
    cont.dataset.photo = '';
    cont.innerHTML = `<button onclick="triggerTwiMarkupUpload('BAD')" class="w-full h-full min-h-[80px] bg-white dark:bg-slate-800 border border-dashed border-red-300 py-4 rounded-lg text-[10px] font-bold text-red-600 active:scale-95 transition-all">➕ Загрузить фото</button>`;
}

function handleTwiPdfUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { event.target.value = ''; return showToast("Файл слишком большой! Максимум 5 МБ."); }
    showToast("⚙️ Сохранение PDF в локальную базу...");
    const reader = new FileReader();
    reader.onload = async function (e) {
        // Пропускаем через менеджер кэша
        const localUrl = await PhotoManager.saveLocal(e.target.result, 'twi');
        renderPdfFile(file.name, (file.size / 1024 / 1024).toFixed(1) + ' MB', localUrl);
        event.target.value = '';
    }
    reader.readAsDataURL(file);
}
function renderPdfFile(name, size, base64) {
    const cont = document.getElementById('twi-pdf-container');
    cont.dataset.pdf = base64;
    document.getElementById('twi-pdf-name').innerText = name;
    document.getElementById('twi-pdf-size').innerText = size;
    cont.classList.remove('hidden');
    cont.nextElementSibling.classList.add('hidden');
}
function removeTwiPdf() {
    const cont = document.getElementById('twi-pdf-container');
    cont.dataset.pdf = '';
    cont.classList.add('hidden');
    cont.nextElementSibling.classList.remove('hidden');
}

// 4. ДОБАВЛЕНИЕ ШАГА (ДЛЯ РАБОЧЕГО TWI)
function addTwiStep(data = null) {
    twiStepCount++;
    const stepId = `twi-step-${twiStepCount}`;
    const text = data ? data.text : '';
    const time = data ? data.time : '';
    const photoSrc = data ? data.photo : null;

    const photoHtml = photoSrc ?
        `<div class="relative w-full h-48 md:h-64 rounded-lg overflow-hidden border border-slate-200 shadow-sm mt-2 bg-slate-50 dark:bg-slate-900"><img src="${photoSrc}" class="w-full h-full object-contain" id="img-${stepId}"><button onclick="removeTwiPhoto('${stepId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>` :
        `<button onclick="triggerTwiPhotoUpload('${stepId}')" class="w-full mt-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2" id="btn-photo-${stepId}">📸 Прикрепить фото/схему</button>`;

    const html = `
        <div id="${stepId}" class="twi-step-item bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative transition-all">
            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                <div class="font-black text-[12px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><span class="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/50 rounded flex items-center justify-center">${twiStepCount}</span> Шаг</div>
                <button onclick="document.getElementById('${stepId}').remove()" class="text-red-400 active:scale-90 font-black text-sm px-2">✕</button>
            </div>
            <textarea class="input-base text-[12px] h-16 resize-none mb-2 twi-step-text" placeholder="Опишите действие...">${text}</textarea>
            <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase flex-1">Время на операцию:</span>
                <input type="number" class="input-base !w-24 text-center !py-1 text-[11px] twi-step-time" placeholder="Мин." value="${time}">
            </div>
            <div class="twi-photo-container" data-photo="${photoSrc || ''}">${photoHtml}</div>
        </div>`;
    document.getElementById('twi-steps-container').insertAdjacentHTML('beforeend', html);
}

function removeTwiPhoto(stepId) {
    const container = document.getElementById(stepId).querySelector('.twi-photo-container');
    container.dataset.photo = '';
    container.innerHTML = `<button onclick="triggerTwiPhotoUpload('${stepId}')" class="w-full mt-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">📸 Прикрепить фото/схему</button>`;
}

// 4. ДОБАВЛЕНИЕ ШАГА (ДЛЯ РАБОЧЕГО TWI)
function addTwiStep(data = null) {
    twiStepCount++;
    const stepId = `twi-step-${twiStepCount}`;
    const text = data ? data.text : '';
    const time = data ? data.time : '';
    const photoSrc = data ? data.photo : null;

    const photoHtml = photoSrc ?
        `<div class="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm mt-2"><img src="${photoSrc}" class="w-full h-full object-cover" id="img-${stepId}"><button onclick="removeTwiPhoto('${stepId}')" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shadow-md">✕</button></div>` :
        `<button onclick="triggerTwiPhotoUpload('${stepId}')" class="w-full mt-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2" id="btn-photo-${stepId}">📸 Прикрепить фото/схему</button>`;

    const html = `
        <div id="${stepId}" class="twi-step-item bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative transition-all">
            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                <div class="font-black text-[12px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><span class="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/50 rounded flex items-center justify-center">${twiStepCount}</span> Шаг</div>
                <button onclick="document.getElementById('${stepId}').remove()" class="text-red-400 active:scale-90 font-black text-sm px-2">✕</button>
            </div>
            <textarea class="input-base text-[12px] h-16 resize-none mb-2 twi-step-text" placeholder="Опишите действие...">${text}</textarea>
            <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase flex-1">Время на операцию:</span>
                <input type="number" class="input-base !w-24 text-center !py-1 text-[11px] twi-step-time" placeholder="Мин." value="${time}">
            </div>
            <div class="twi-photo-container" data-photo="${photoSrc || ''}">${photoHtml}</div>
        </div>`;
    document.getElementById('twi-steps-container').insertAdjacentHTML('beforeend', html);
}

function triggerTwiPhotoUpload(stepId) { currentTwiStepUploadId = stepId; document.getElementById('twi-photo-input').click(); }

function handleTwiPhotoUpload(event) {
    if (!event.target.files[0] || !currentTwiStepUploadId) return;
    compressImageToBase64(event.target.files[0], 800, 0.8, (base64) => {
        const container = document.getElementById(currentTwiStepUploadId).querySelector('.twi-photo-container');
        container.dataset.photo = base64;
        // ИСПРАВЛЕНО: h-48 md:h-64 object-contain
        container.innerHTML = `<div class="relative w-full h-48 md:h-64 rounded-lg overflow-hidden border border-slate-200 shadow-sm mt-2 bg-slate-50 dark:bg-slate-900"><img src="${base64}" class="w-full h-full object-contain"><button onclick="removeTwiPhoto('${currentTwiStepUploadId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
        event.target.value = '';
    });
}

function removeTwiPhoto(stepId) {
    const container = document.getElementById(stepId).querySelector('.twi-photo-container');
    container.dataset.photo = '';
    container.innerHTML = `<button onclick="triggerTwiPhotoUpload('${stepId}')" class="w-full mt-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">📸 Прикрепить фото/схему</button>`;
}

// 5. СОХРАНЕНИЕ TWI КАРТЫ С УЧЕТОМ ТИПОВ


// 6. УДАЛЕНИЕ КАРТЫ
window.deleteTwiCard = async function (id) {
    if (id.startsWith('sys_')) return showToast("⚠️ Системные инструкции удалить нельзя!");

    const card = customTwiCards.find(c => c.id === id);
    if (!rbi_canDeleteKnowledgeItem(card?.owner)) {
        return showToast("⚠️ Инженер может удалить только свою инструкцию.");
    }
    if (!confirm('Удалить эту инструкцию? В облаке она тоже будет удалена.')) return;

    if (card) {
        const nowIso = new Date().toISOString();
        card._deleted = true;
        card.is_deleted = true;
        card.deleted_at = nowIso;
        card.updatedAt = nowIso;
        card.updated_at = nowIso;
        card.source = 'local';
        card.syncStatus = 'not_synced';
        card.sync_status = 'not_synced';

        await dbPut(STORES.TWI_CARDS, card);
    }

    showToast("🗑️ Инструкция удалена");
    customTwiCards = customTwiCards.filter(c => !c._deleted);
    renderTwiList();

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

function toggleManagePanel() {
    const body = document.getElementById('ref-manage-body');
    const icon = document.getElementById('ref-manage-toggle-icon');

    if (!body || !icon) return;

    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
        // Открываем панель управления
        body.style.maxHeight = '400px';
        body.style.opacity = '1';
        body.style.marginTop = '12px';
        icon.style.transform = 'rotate(0deg)';

        // Рендерим список пользовательских шаблонов ПРЯМО ТУТ
        const templatesList = document.getElementById('settings-user-templates-list');
        if (templatesList) {
            const currentEngineer = appSettings.engineerName || 'Инженер';
            const customKeys = Object.keys(userTemplates).filter(k => !userTemplates[k]._deleted).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru'));

            // Селектор системных чек-листов для их клонирования
            let sysOptions = '<option value="" disabled selected>Выбрать системный чек-лист...</option>';
            Object.keys(SYSTEM_TEMPLATES).forEach(k => {
                sysOptions += `<option value="${k}">${SYSTEM_TEMPLATES[k].title}</option>`;
            });

            let html = `
                <div class="mb-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 flex gap-2 items-center shadow-sm">
                    <select id="clone-sys-select" class="input-base text-[10px] !py-1.5 flex-1">${sysOptions}</select>
                    <button onclick="cloneSystemTemplateToCustom()" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase active:scale-95 shadow-sm shrink-0">Копия</button>
                </div>
            `;

            if (customKeys.length === 0) {
                html += `<div class="text-[10px] text-slate-400 italic py-2 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Созданных чек-листов пока нет</div>`;
            } else {
                html += customKeys.map(key => {
                    const isAdmin = window.RbiRoles ? window.RbiRoles.isAdmin() : false;
                    const isOwner = isAdmin || !userTemplates[key].owner || userTemplates[key].owner === currentEngineer;
                    
                    const actionBtns = isOwner
                        ? `<button onclick="editUserTemplate('${key}')" class="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[9px] font-bold active:scale-90">Изменить</button>
                           <button onclick="deleteUserTemplate('${key}')" class="bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded text-[9px] font-bold active:scale-90">Удалить</button>`
                        : `<div class="text-[8px] font-bold text-slate-400">Автор: ${userTemplates[key].owner}</div>`;

                    return `
                    <div class="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl mb-1.5 shadow-sm">
                        <div class="min-w-0 pr-2">
                            <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate leading-tight">${userTemplates[key].title}</div>
                            <div class="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">${userTemplates[key].groups?.length || 0} этапов</div>
                        </div>
                        <div class="flex gap-1.5 shrink-0">${actionBtns}</div>
                    </div>
                `}).join('');
            }
            templatesList.innerHTML = html;
        }
    } else {
        // Скрываем панель управления
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        icon.style.transform = 'rotate(-90deg)';
    }
}
// ==========================================
// БЛОК: БИБЛИОТЕКА ТЕХНИЧЕСКИХ УЗЛОВ
// ==========================================

// ==========================================
// БЛОК: БИБЛИОТЕКА ТЕХНИЧЕСКИХ УЗЛОВ И КОНСТРУКТОР
// ==========================================

let customNodes = [];

// Загрузка пользовательских узлов при старте
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const storedNodes = await dbGetAll(STORES.CUSTOM_NODES);
        if (storedNodes && storedNodes.length > 0) customNodes = storedNodes.filter(n => !n._deleted);
    } catch (e) { console.error("Ошибка загрузки узлов", e); }
});

// Анимация меню управления узлами
function toggleNodeManagePanel() {
    const body = document.getElementById('node-manage-body');
    const icon = document.getElementById('node-manage-toggle-icon');
    if (!body || !icon) return;
    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
        body.style.maxHeight = '200px';
        body.style.opacity = '1';
        body.style.marginTop = '12px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        icon.style.transform = 'rotate(-90deg)';
    }
}

// ЭКСПОРТ (ВЫГРУЗКА В JSON)
function exportNodeJson() {
    if (customNodes.length === 0) return showToast('Нет созданных узлов для экспорта');
    const dataStr = JSON.stringify(customNodes, null, 4);
    downloadFile(dataStr, `RBI_Nodes_${new Date().toLocaleDateString('ru-RU')}.json`, 'application/json');
    showToast("✅ JSON-файл с узлами скачан!");
}

// ЭКСПОРТ В КОД (ДЛЯ system_nodes.js)
function exportNodeJsCode() {
    if (customNodes.length === 0) return showToast('Нет узлов для выгрузки в код');

    let jsCode = "/* Сгенерировано из RBI Quality (Пользовательские Узлы) */\n\nconst CUSTOM_SYSTEM_NODES = [\n";
    customNodes.forEach((n, idx) => {
        const comma = idx < customNodes.length - 1 ? ',' : '';
        jsCode += `    {\n`;
        jsCode += `        id: '${n.id}',\n`;
        jsCode += `        category: '${n.category}',\n`;
        jsCode += `        title: '${n.title.replace(/'/g, "\\'")}',\n`;
        jsCode += `        desc: '${(n.desc || '').replace(/'/g, "\\'")}',\n`;
        jsCode += `        img: '${n.img}',\n`;
        jsCode += `        attachments: ${JSON.stringify(n.attachments || [])},\n`; // <-- Сохраняем массив файлов!
        jsCode += `        materials: ${JSON.stringify(n.materials)},\n`;
        jsCode += `        linkedDoc: '${(n.linkedDoc || '').replace(/'/g, "\\'")}',\n`;
        jsCode += `        linkedTwiChecklistKey: ${n.linkedTwiChecklistKey ? "'" + n.linkedTwiChecklistKey + "'" : "null"}\n`;
        jsCode += `    }${comma}\n`;
    });
    jsCode += "];\n";

    downloadFile(jsCode, `rbi_nodes_code_${new Date().toLocaleDateString('ru-RU')}.js`, 'application/javascript');
    showToast("✅ Код JS скопирован и скачан!");
}

// ИМПОРТ (ЗАГРУЗКА ИЗ JSON)
function processNodeImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Неверный формат");

            let addedCount = 0;
            for (const item of data) {
                if (!customNodes.find(x => x.id === item.id) && !SYSTEM_NODES.find(x => x.id === item.id)) {
                    customNodes.push(item);
                    addedCount++;
                }
            }

            await dbPut(STORES.SETTINGS, { key: 'custom_nodes', data: customNodes });
            showToast(`✅ Импорт завершен! Добавлено узлов: ${addedCount}`);
            renderNodesList();
        } catch (err) {
            console.error(err);
            alert("Ошибка импорта. Проверьте формат файла.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function renderNodesList() {
    const container = document.getElementById('nodes-list-container');
    const searchInput = document.getElementById('node-search-input')?.value.toLowerCase() || '';
    if (!container) return;

    // ОБНОВЛЯЕМ ШАПКУ (ПЕРЕКЛЮЧАТЕЛЬ "МОИ/ВСЕ")
    const filtersBlock = document.getElementById('node-filters-block');
    if (filtersBlock) {
        // Проверяем, есть ли уже переключатель, если нет - вставляем
        if (!filtersBlock.innerHTML.includes('nodeOwnerFilter')) {
            const originalHtml = filtersBlock.innerHTML;
            filtersBlock.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <label class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                        <span class="text-[10px] font-black uppercase tracking-widest ${window.nodeOwnerFilter === 'MY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">Только мои</span>
                        <div class="relative">
                            <input type="checkbox" class="sr-only peer" onchange="window.nodeOwnerFilter = this.checked ? 'MY' : 'ALL'; renderNodesList()" ${window.nodeOwnerFilter === 'MY' ? 'checked' : ''}>
                            <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                        </div>
                    </label>
                    <button onclick="downloadMissingCloudFiles()" class="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m0 0l-3-3m3 3l3-3"></path></svg> Скачать
                    </button>
                </div>
            ` + originalHtml;
        }

    }

    // Объединяем системные и пользовательские узлы
    const allNodes = [...SYSTEM_NODES, ...customNodes];
    const currentEngineer = appSettings.engineerName || 'Инженер';

    let filtered = allNodes.filter(node => {
        const title = String(node.title || node.name || node.data?.title || '').toLowerCase();
        const desc = String(node.desc || node.description || node.data?.desc || node.data?.description || '').toLowerCase();
        const category = String(node.category || node.data?.category || '').toLowerCase();
        const owner = node.owner || node.data?.owner || '';

        const matchSearch =
            title.includes(searchInput) ||
            desc.includes(searchInput) ||
            category.includes(searchInput);

        const isSystemNode = !customNodes.find(n => n.id === node.id);

        const matchOwner =
            window.nodeOwnerFilter === 'ALL' ||
            isSystemNode ||
            owner === currentEngineer;

        return matchSearch && matchOwner;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Узлы не найдены</div>`;
        return;
    }

    // Группируем по категории
    const grouped = {};
    filtered.forEach(node => {
        const groupName = node.category || node.data?.category || 'Без категории';
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(node);
    });

    let html = '';
    for (let cat in grouped) {
        // Обертка группы (Свернута по умолчанию, iOS-стиль)
        html += `
        <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
            <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
                <span class="truncate pr-4">${cat} <span class="text-[10px] text-slate-400 ml-1">(${grouped[cat].length})</span></span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 py-2">
        `;

        grouped[cat].forEach(node => {
            const isSystem = !customNodes.find(n => n.id === node.id);
            const isOwner = !node.owner || node.owner === currentEngineer;

            let previewHtml = '';

            // Железобетонная проверка: если есть вложения и первое это PDF, ИЛИ старое поле img содержит PDF
            const hasPdfAttachment = node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'pdf';
            const isOldPdf = node.img && node.img.includes('application/pdf');

            if (hasPdfAttachment || isOldPdf) {
                previewHtml = `
                    <div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 relative p-2">
                        <div class="w-12 h-16 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-red-200 dark:border-red-800 flex flex-col justify-between p-1.5 relative overflow-hidden">
                            <div class="absolute top-0 left-0 right-0 h-4 bg-red-500 flex items-center justify-center"><span class="text-[7px] text-white font-black tracking-widest">PDF</span></div>
                            <div class="space-y-1.5 mt-5">
                                <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                                <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                                <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>`;
            }
            // Иначе, если есть фото во вложениях
            else if (node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'image') {
                previewHtml = `<img src="${window.getPhotoSrc(node.attachments[0].url)}" class="w-full h-full object-contain p-2">`;
            }
            // Фолбэк для старых узлов
            else if (node.img) {
                previewHtml = `<img src="${window.getPhotoSrc(node.img)}" class="w-full h-full object-contain p-2">`;
            }
            // Если совсем пусто
            else {
                previewHtml = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg></div>`;
            }

            html += `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openNodeViewer('${node.id}')">
                ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИС</div>' : ''}
                
                <div class="h-28 sm:h-32 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 relative">
                    ${previewHtml}
                    <!-- Меню вызывается только если это не системный узел (систему нельзя удалять) -->
                    ${!isSystem ? `
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${node.id}', 'node', '${String(node.title || node.name || 'Узел').replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>` : ''}
                </div>
                
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[8px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase truncate max-w-full">${node.category}</div>
                    <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">${node.title}</div>
                    
                    <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                            <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            ${isSystem ? 'Система' : (node.owner ? node.owner.split(' ')[0] : 'Инженер')}
                        </div>
                    </div>
                </div>
            </div>`;
        });

        html += `</div></details>`;
    }

    container.innerHTML = html;
}
window.openNodeViewer = async function (nodeId) {
    const allNodes = [...(typeof SYSTEM_NODES !== 'undefined' ? SYSTEM_NODES : []), ...customNodes];
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    const titleEl = document.getElementById('viewer-node-title');
    if (titleEl) titleEl.innerText = node.title;

    const descEl = document.getElementById('viewer-node-desc');
    if (descEl) descEl.innerText = node.desc || 'Описание отсутствует';

    const catEl = document.getElementById('viewer-node-category');
    if (catEl) catEl.innerText = node.category;

    // === ОТРИСОВКА ВЛОЖЕНИЙ (ФОТО И PDF) ===
    const attContainer = document.getElementById('viewer-node-attachments');
    if (attContainer) {
        attContainer.innerHTML = '<div class="text-[10px] text-center text-slate-400 py-4 animate-pulse">Загрузка файлов...</div>';

        let files = node.attachments || [];
        if (files.length === 0 && node.img) {
            files = [{ type: 'image', url: node.img }];
        }

        if (files.length === 0) {
            attContainer.innerHTML = '<div class="text-[10px] text-center text-slate-400 py-4">Нет вложенных файлов</div>';
        } else {
            let html = '';
            for (let file of files) {
                if (file.type === 'image') {
                    const realSrc = await PhotoManager.getAsyncUrl(file.url) || window.getPhotoSrc(file.url);
                    html += `
                    <div class="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm mb-3 bg-white dark:bg-slate-800" onclick="openPhotoViewer('${file.url}')">
                        <img src="${realSrc}" class="w-full h-full object-contain">
                        <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold uppercase px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">🔍 Увеличить</div>
                    </div>`;
                } else if (file.type === 'pdf' || (file.url && file.url.includes('application/pdf'))) {
                    // Используем нашу новую функцию openNodeAttachmentPdf
                    html += `
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex justify-between items-center cursor-pointer active:scale-95 transition-transform mb-3" onclick="window.openNodeAttachmentPdf('${file.url}', '${file.name || 'Документ'}', '${file.size || ''}')">
                        <div class="flex items-center gap-3 min-w-0 pr-2">
                            <div class="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0 font-black">PDF</div>
                            <div class="truncate min-w-0">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">${file.name || 'Документ.pdf'}</div>
                                <div class="text-[9px] text-slate-500">${file.size || 'PDF Файл'}</div>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold text-red-600 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-red-200 dark:border-red-800">Открыть</span>
                    </div>`;
                }
            }
            attContainer.innerHTML = html;
        }
    }

    const matTbody = document.getElementById('viewer-node-materials');
    if (matTbody) {
        if (node.materials && node.materials.length > 0) {
            matTbody.innerHTML = node.materials.map(m => `
                <tr class="border-b border-slate-100 dark:border-slate-700">
                    <td class="p-2 font-medium text-slate-700 dark:text-slate-300 text-[12px]">${m.name}</td>
                    <td class="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap text-[12px]">${m.qty}</td>
                </tr>
            `).join('');
            matTbody.parentElement.parentElement.classList.remove('hidden');
        } else {
            matTbody.parentElement.parentElement.classList.add('hidden');
        }
    }

    // Ищем TWI, которая ссылается на этот узел
    const linksEl = document.getElementById('viewer-node-links');
    if (linksEl) {
        const isSystem = !customNodes.find(n => n.id === nodeId);
        const isOwner = !node.owner || node.owner === (appSettings.engineerName || 'Инженер');

        let deleteBtnHtml = '';
        if (!isSystem && isOwner) {
            deleteBtnHtml = `<button onclick="closeNodeViewer(); deleteNode('${node.id}')" class="bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 py-3 rounded-xl text-[10px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mt-2 col-span-full">
                <span>🗑️</span> Удалить узел
            </button>`;
        }

        // 1. Кнопка Норматива
        let docActionHtml = '';
        if (node.linkedDoc) {
            let docAction = `findAndOpenND('${node.linkedDoc || ''}')`;
            if (node.linkedDoc.startsWith('sys_') || node.linkedDoc.startsWith('usr_')) { docAction = `openDocViewer('${node.linkedDoc}')`; }
            docActionHtml = `<button onclick="closeNodeViewer(); setTimeout(()=>${docAction}, 300)" class="bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 py-3.5 rounded-xl text-[11px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Норматив
            </button>`;
        }

        // 2. Кнопка TWI
        let twiActionHtml = '';
        if (node.linkedTwiId) {
            twiActionHtml = `<button onclick="closeNodeViewer(); setTimeout(()=>openTwiViewer('${node.linkedTwiId}'), 300)" class="bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-3.5 rounded-xl text-[11px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> TWI Карта
            </button>`;
        }

        // 3. Кнопка Чек-листа
        let chkActionHtml = '';
        // Для обратной совместимости проверяем оба поля
        const checklistKey = node.linkedChecklistKey || node.linkedTwiChecklistKey;
        if (checklistKey && !checklistKey.includes('|')) {
            chkActionHtml = `<button onclick="closeNodeViewer(); switchTab('tab-audit'); setTimeout(()=>changeTemplate('${checklistKey}'), 300)" class="bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400 py-3.5 rounded-xl text-[11px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg> Чек-лист
            </button>`;
        }

        linksEl.className = "grid grid-cols-1 gap-2 mt-4"; // Делаем их друг под другом для красоты
        linksEl.innerHTML = `
            ${docActionHtml}
            ${twiActionHtml}
            ${chkActionHtml}
            ${deleteBtnHtml}
        `;
    }

    const overlay = document.getElementById('node-viewer-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    }
};

// КОНСТРУКТОР УЗЛОВ
window.currentEditingNodeId = null;

window.openNodeConstructor = function (editId = null) {
    document.getElementById('nodes-main-view').classList.add('hidden');
    const view = document.getElementById('node-constructor-view');
    view.classList.remove('hidden');
    document.body.classList.add('modal-open');
    view.scrollTo(0, 0);

    window.currentEditingNodeId = editId;

    // 1. Заполняем селектор НД
    const selectDoc = document.getElementById('node-linked-doc');
    let docOptions = '<option value="">-- Без привязки к НД --</option>';
    const allDocs = [...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []), ...(typeof customDocs !== 'undefined' ? customDocs : [])];
    allDocs.sort((a, b) => a.code.localeCompare(b.code)).forEach(doc => {
        const shortTitle = doc.title.length > 40 ? doc.title.substring(0, 40) + '...' : doc.title;
        docOptions += `<option value="${doc.id}">${doc.code} - ${shortTitle}</option>`;
    });
    selectDoc.innerHTML = docOptions;

    // 2. Заполняем селектор TWI
    const selectTwi = document.getElementById('node-linked-twi');
    let twiOptions = '<option value="">-- Без привязки к TWI --</option>';
    customTwiCards.forEach(card => {
        const typePrefix = card.type === 'INSPECTOR' ? '[Надзор]' : (card.type === 'WORKER' ? '[Шаги]' : '[PDF]');
        twiOptions += `<option value="${card.id}">${typePrefix} ${card.title}</option>`;
    });
    selectTwi.innerHTML = twiOptions;

    // 3. Заполняем селектор Чек-листов
    const selectChecklist = document.getElementById('node-linked-checklist');
    let chkOptions = '<option value="">-- Без привязки к Чек-листу --</option>';
    Object.keys(SYSTEM_TEMPLATES).sort().forEach(key => { chkOptions += `<option value="sys_${key}">[СИС] ${SYSTEM_TEMPLATES[key].title}</option>`; });
    if (typeof userTemplates !== 'undefined') {
        Object.keys(userTemplates).sort().forEach(key => { chkOptions += `<option value="user_${key}">[МОЙ] ${userTemplates[key].title}</option>`; });
    }
    selectChecklist.innerHTML = chkOptions;

    // Сбрасываем поля материалов
    document.getElementById('node-materials-container').innerHTML = '';

    // ЕСЛИ ЭТО РЕДАКТИРОВАНИЕ - ВОССТАНАВЛИВАЕМ ДАННЫЕ
    if (editId) {
        const allNodes = [...(typeof SYSTEM_NODES !== 'undefined' ? SYSTEM_NODES : []), ...customNodes];
        const node = allNodes.find(n => n.id === editId);
        if (node) {
            document.getElementById('node-title-input').value = node.title || '';
            document.getElementById('node-desc-input').value = node.desc || '';
            document.getElementById('node-category-input').value = node.category || 'ФАСАД';

            selectDoc.value = node.linkedDoc || '';
            selectTwi.value = node.linkedTwiId || '';
            // Для старых узлов, у которых чек-лист лежал в linkedTwiChecklistKey
            selectChecklist.value = node.linkedChecklistKey || node.linkedTwiChecklistKey || '';

            // Восстанавливаем вложения (фото/pdf)
            window.currentNodeAttachments = node.attachments ? [...node.attachments] : [];
            if (window.currentNodeAttachments.length === 0 && node.img) {
                window.currentNodeAttachments.push({ type: 'image', url: node.img, name: 'Фото' });
            }
            if (typeof window.renderNodeAttachmentsUI === 'function') window.renderNodeAttachmentsUI();

            // Восстанавливаем материалы
            if (node.materials && node.materials.length > 0) {
                node.materials.forEach(m => {
                    addNodeMaterialRow();
                    const rows = document.querySelectorAll('.node-material-row');
                    const lastRow = rows[rows.length - 1];
                    lastRow.querySelector('.mat-name').value = m.name;
                    lastRow.querySelector('.mat-qty').value = m.qty;
                });
            } else {
                addNodeMaterialRow();
            }
        }
    } else {
        // НОВЫЙ УЗЕЛ - Сброс
        document.getElementById('node-title-input').value = '';
        document.getElementById('node-desc-input').value = '';
        document.getElementById('node-category-input').value = 'ФАСАД';
        window.currentNodeAttachments = [];
        if (typeof window.renderNodeAttachmentsUI === 'function') window.renderNodeAttachmentsUI();
        addNodeMaterialRow();
    }
};

function closeNodeConstructor() {
    document.getElementById('node-constructor-view').classList.add('hidden');
    document.getElementById('nodes-main-view').classList.remove('hidden');
    document.body.classList.remove('modal-open'); // Разблокируем фон
    renderNodesList();
}

function addNodeMaterialRow() {
    const id = Date.now();
    const html = `
        <div class="flex gap-2 items-center node-material-row mb-2" id="mat-${id}">
            <input type="text" class="input-base text-[12px] flex-1 mat-name" placeholder="Название (напр: Анкер 10х100)">
            <input type="text" class="input-base text-[12px] w-24 text-center mat-qty" placeholder="Кол-во">
            <button onclick="document.getElementById('mat-${id}').remove()" class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-200 active:scale-90 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>`;
    document.getElementById('node-materials-container').insertAdjacentHTML('beforeend', html);
}

window.currentNodeAttachments = [];

window.renderNodeAttachmentsUI = async function () {
    const list = document.getElementById('node-attachments-list');
    if (!list) return;

    let html = '';
    for (let i = 0; i < window.currentNodeAttachments.length; i++) {
        let att = window.currentNodeAttachments[i];
        if (att.type === 'image') {
            const realSrc = await PhotoManager.getAsyncUrl(att.url) || window.getPhotoSrc(att.url);
            html += `
            <div class="relative w-full h-32 rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-50 dark:bg-slate-900 mt-2">
                <img src="${realSrc}" class="w-full h-full object-contain">
                <button onclick="window.removeNodeAttachment(${i})" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md active:scale-90">✕</button>
            </div>`;
        } else if (att.type === 'pdf') {
            html += `
            <div class="flex items-center justify-between p-3 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-sm">
                <div class="flex items-center gap-3 min-w-0 pr-2">
                    <div class="text-red-500 font-black text-lg">PDF</div>
                    <div class="min-w-0">
                        <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">${att.name}</div>
                        <div class="text-[9px] text-slate-500">${att.size}</div>
                    </div>
                </div>
                <button onclick="window.removeNodeAttachment(${i})" class="text-red-500 font-black px-2 text-lg active:scale-90 shrink-0">✕</button>
            </div>`;
        }
    }
    list.innerHTML = html;
};

window.removeNodeAttachment = function (index) {
    window.currentNodeAttachments.splice(index, 1);
    window.renderNodeAttachmentsUI();
};

window.handleNodeFileUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("⚙️ Обработка файла...");

    if (file.type === 'application/pdf') {
        if (file.size > 5 * 1024 * 1024) {
            event.target.value = '';
            return showToast("PDF слишком большой! Максимум 5 МБ.");
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const localUrl = await PhotoManager.saveLocal(e.target.result, 'node_pdf');
            // КЛАДЕМ PDF В МАССИВ ВЛОЖЕНИЙ
            window.currentNodeAttachments.push({ type: 'pdf', url: localUrl, name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + ' MB' });
            window.renderNodeAttachmentsUI();
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    } else {
        compressImageToBase64(file, 1000, 0.8, async (base64) => {
            const localUrl = await PhotoManager.saveLocal(base64, 'node_img');
            // КЛАДЕМ ФОТО В МАССИВ ВЛОЖЕНИЙ
            window.currentNodeAttachments.push({ type: 'image', url: localUrl, name: file.name || 'Фото' });
            window.renderNodeAttachmentsUI();
            event.target.value = '';
        });
    }
};

// Функция-помощник для открытия PDF прямо внутри узла (через нашу универсальную читалку)
window.openFakePdfViewer = async function (url, name, size) {
    await window.rbiOpenPdfInTwiViewer(
        url,
        name || 'PDF вложение',
        'Вложение узла',
        name || 'document.pdf',
        size || ''
    );
};

window.saveNodeCard = async function () {
    if (!rbi_requireKnowledgeEditRight()) return;

    const title = document.getElementById('node-title-input').value.trim();
    if (!title) return showToast('⚠️ Укажите название узла!');

    // Проверяем, есть ли файлы в нашем новом массиве вложений
    if (!window.currentNodeAttachments || window.currentNodeAttachments.length === 0) {
        return showToast('⚠️ Загрузите хотя бы один файл (чертеж, схему или PDF)!');
    }

    const materials = [];
    document.querySelectorAll('.node-material-row').forEach(row => {
        const name = row.querySelector('.mat-name').value.trim();
        const qty = row.querySelector('.mat-qty').value.trim();
        if (name) materials.push({ name, qty: qty || 'По проекту' });
    });

    // Берем первый файл как обложку для списков (для совместимости)
    let imgData = '';
    const firstImg = window.currentNodeAttachments.find(a => a.type === 'image');
    if (firstImg) imgData = firstImg.url;

    const nodeData = {
        id: window.currentEditingNodeId || 'node_' + Date.now().toString(36),
        category: document.getElementById('node-category-input').value,
        title: title,
        desc: document.getElementById('node-desc-input').value.trim(),
        img: imgData,
        attachments: window.currentNodeAttachments,
        materials: materials,
        linkedDoc: document.getElementById('node-linked-doc').value || null,
        linkedTwiId: document.getElementById('node-linked-twi').value || null,
        linkedChecklistKey: document.getElementById('node-linked-checklist').value || null,
        owner: rbi_getCurrentUserNameSafe(),
        source: 'local',
        syncStatus: 'not_synced',
        sync_status: 'not_synced',
        syncBlockReason: '',
        sync_block_reason: '',
        updatedAt: new Date().toISOString()
    };

    if (window.currentEditingNodeId) {
        // Обновляем существующий
        const index = customNodes.findIndex(n => n.id === window.currentEditingNodeId);
        if (index !== -1) {
            nodeData.createdAt = customNodes[index].createdAt || nodeData.updatedAt;
            customNodes[index] = nodeData;
        }
    } else {
        // Создаем новый
        nodeData.createdAt = nodeData.updatedAt;
        customNodes.push(nodeData);
    }

    try {
        await dbPut(STORES.CUSTOM_NODES, nodeData);
        showToast('✅ Узел успешно сохранен!');
        closeNodeConstructor();

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    } catch (e) {
        console.error("Ошибка сохранения узла:", e);
        showToast('❌ Ошибка сохранения (Возможно, файлы слишком большие)');
    }
};

window.deleteNode = async function (id) {
    const node = customNodes.find(n => n.id === id);
    if (!rbi_canDeleteKnowledgeItem(node?.owner)) {
        return showToast("⚠️ Инженер может удалить только свой узел. Чужие материалы удаляют заместитель или администратор.");
    }
    if (!confirm('Удалить этот узел навсегда? В облаке он тоже будет удален.')) return;

    if (node) {
        const nowIso = new Date().toISOString();
        node._deleted = true;
        node.is_deleted = true; // Жесткий флаг для Supabase
        node.deleted_at = nowIso;
        node.updatedAt = nowIso;
        node.updated_at = nowIso; // КРИТИЧНО: обновляем время, чтобы облако увидело изменение!
        node.source = 'local';
        node.syncStatus = 'not_synced';
        node.sync_status = 'not_synced';

        await dbPut(STORES.CUSTOM_NODES, node);
    }

    showToast('🗑️ Узел удален');
    customNodes = customNodes.filter(n => !n._deleted);
    renderNodesList();

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

function filterNodes(category, btnElement) {
    currentNodeFilter = category;
    const container = document.getElementById('node-filters-container');
    container.querySelectorAll('.node-filter-btn').forEach(btn => {
        btn.className = "node-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700";
    });
    btnElement.className = "node-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap border border-indigo-600";
    renderNodesList();
}



function closeNodeViewer() {
    const overlay = document.getElementById('node-viewer-overlay');
    overlay.classList.add('opacity-0');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}



// === ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ МЫШКОЙ (ДЛЯ ПК) ===
function initHorizontalMouseScroll() {
    let isDown = false;
    let startX;
    let scrollLeft;
    let slider = null;

    // Вешаем слушатели на весь документ, но фильтруем цели
    document.addEventListener('mousedown', (e) => {
        // Ищем ближайший контейнер со скроллом
        slider = e.target.closest('.overflow-x-auto, .custom-scrollbar, .no-scrollbar');

        // Запрещаем скролл мышкой, если кликнули по кнопке, инпуту или фото (чтобы не блокировать их нажатие)
        if (!slider || e.target.closest('button, input, select, a, img')) {
            slider = null;
            return;
        }

        isDown = true;
        slider.style.cursor = 'grabbing';
        slider.style.userSelect = 'none'; // Запрет выделения текста при скролле

        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    document.addEventListener('mouseleave', () => {
        if (!isDown || !slider) return;
        isDown = false;
        slider.style.cursor = '';
        slider.style.userSelect = '';
    });

    document.addEventListener('mouseup', () => {
        if (!isDown || !slider) return;
        isDown = false;
        slider.style.cursor = '';
        slider.style.userSelect = '';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDown || !slider) return;
        e.preventDefault(); // Останавливает стандартные браузерные события
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5; // Скорость прокрутки (1.5x)
        slider.scrollLeft = scrollLeft - walk;
    });
}


// ============================================================================
// === БЛОК: СОВЕРШЕННЫЙ ДЕМО-РЕЖИМ (ПОЛНОЕ ПОКРЫТИЕ ФУНКЦИОНАЛА) ===
// ============================================================================
window.rbi_enrichDemoModeV2 = function ({ demoPhotoGood, demoPhotoBad, nowIso } = {}) {
    const now = nowIso || new Date().toISOString();
    const good = demoPhotoGood || window.rbiPhotoPlaceholder || '';
    const bad = demoPhotoBad || window.rbiPhotoPlaceholder || '';

    window.rbi_tasksData = Array.isArray(window.rbi_tasksData) ? window.rbi_tasksData : [];
    window.rbi_fmeaRecords = Array.isArray(window.rbi_fmeaRecords) ? window.rbi_fmeaRecords : [];
    window.rbi_meetingsData = Array.isArray(window.rbi_meetingsData) ? window.rbi_meetingsData : [];
    window.rbi_interventionsData = Array.isArray(window.rbi_interventionsData) ? window.rbi_interventionsData : [];
    window.rbi_practicesData = Array.isArray(window.rbi_practicesData) ? window.rbi_practicesData : [];
    window.skRecords = Array.isArray(window.skRecords) ? window.skRecords : [];

    if (typeof customTwiCards === 'undefined' || !Array.isArray(customTwiCards)) {
        window.customTwiCards = [];
    }

    const pushUnique = (arr, item) => {
        if (!Array.isArray(arr) || !item || !item.id) return;
        if (!arr.some(x => String(x.id) === String(item.id))) arr.push(item);
    };

    pushUnique(customTwiCards, {
        id: 'demo_twi_windows_apply_v2',
        title: 'TWI: Герметизация примыкания окон',
        checklistKey: 'sys_okna_pvh',
        checklistName: 'Окна ПВХ',
        type: 'INSPECTOR',
        itemId: '1617',
        whyImportant: 'Риск продувания, протечек, промерзания и гарантийных обращений.',
        howToCheck: 'Проверить подготовку основания, непрерывность герметизации, примыкания по периметру и фотофиксацию до закрытия откосов.',
        photoGood: good,
        photoBad: bad,
        createdAt: now,
        updatedAt: now
    });

    pushUnique(customTwiCards, {
        id: 'demo_twi_finish_worker_v2',
        title: 'Инструкция: подготовка основания под отделку',
        checklistKey: 'sys_otdelka_mop',
        checklistName: 'Отделка МОП',
        type: 'WORKER',
        itemId: 'ALL',
        totalTime: 7,
        steps: [
            { order: 1, text: 'Проверить основание: нет пыли, непрочных участков и мусора.', time: 2, photo: good },
            { order: 2, text: 'Устранить дефекты основания до начала следующего слоя.', time: 3, photo: bad },
            { order: 3, text: 'Предъявить участок прорабу или инженеру до закрытия работ.', time: 2, photo: good }
        ],
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.rbi_tasksData, {
        id: 'demo_task_audit_red_contractor_v2',
        title: 'Аудит подрядчика в красной зоне',
        taskType: 'Аудит',
        type: 'control',
        category: 'Аудит',
        priority: 'high',
        status: 'open',
        contractor: 'ООО "Окна-Про"',
        projectName: 'ЖК "Демонстрационный"',
        reason: 'Повторяющиеся B2 по оконным примыканиям и низкая стабильность качества.',
        target: 3,
        done: 1,
        progress: 1,
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.rbi_tasksData, {
        id: 'demo_task_twi_magic_v2',
        title: 'Магия TWI: создать карту по OK/FAIL',
        taskType: 'TWI',
        type: 'method',
        category: 'TWI',
        priority: 'medium',
        status: 'open',
        contractor: 'ООО "Окна-Про"',
        projectName: 'ЖК "Демонстрационный"',
        reason: 'Есть фото правильного и неправильного выполнения. Нужно превратить их в TWI.',
        target: 1,
        done: 0,
        progress: 0,
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.rbi_tasksData, {
        id: 'demo_task_pcsk_analysis_v2',
        title: 'Аналитика ПК СК: проверить просрочки и CMI',
        taskType: 'ПК СК',
        type: 'analysis',
        category: 'ПК СК',
        priority: 'high',
        status: 'open',
        contractor: 'ООО "Окна-Про"',
        projectName: 'ЖК "Демонстрационный"',
        reason: 'Есть просроченные замечания и статусы «Устранено» без «Проверено».',
        target: 1,
        done: 0,
        progress: 0,
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.rbi_fmeaRecords, {
        id: 'demo_fmea_windows_leak_v2',
        title: 'FMEA: повторная протечка оконного примыкания',
        contractor: 'ООО "Окна-Про"',
        projectName: 'ЖК "Демонстрационный"',
        failureMode: 'Нарушение герметизации оконного примыкания',
        cause: 'Нет единого порядка подготовки основания и контроля герметика.',
        effect: 'Продувание, протечки, промерзание, гарантийные обращения.',
        action: 'Создать TWI, принять эталон, проверить соседние этажи до закрытия откосов.',
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.rbi_meetingsData, {
        id: 'demo_meeting_quality_day_v2',
        date: now,
        author: 'Иванов И.И.',
        title: 'Демо: совещание по качеству',
        memoText: 'Разобраны повторяющиеся B2 по окнам, просрочки ПК СК, низкий CMI и необходимость TWI-инструктажа.',
        agenda: [
            {
                contr: 'ООО "Окна-Про"',
                defect: 'Повторная герметизация окон',
                isDone: false,
                date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
                resp: 'Прораб окон',
                comment: 'Провести TWI и предъявить 3 этажа на повторный контроль.'
            }
        ],
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.rbi_interventionsData, {
        id: 'demo_intervention_twi_windows_v2',
        date: now,
        inspector: 'Иванов И.И.',
        contractor: 'ООО "Окна-Про"',
        templateKey: 'sys_okna_pvh',
        templateTitle: 'Окна ПВХ',
        typeText: 'TWI-инструктаж',
        typeCoef: 1.2,
        comment: 'Проведён инструктаж по герметизации оконных примыканий.',
        baseUrk: 0.62,
        finalImpact: 0.18,
        deltaUrk: 0.12,
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.rbi_practicesData, {
        id: 'demo_practice_windows_twi_v2',
        title: 'Практика: TWI перед закрытием откосов',
        category: 'Окна',
        problem: 'Дефекты герметизации выявлялись после закрытия откосов.',
        solution: 'Ввели обязательный TWI-инструктаж и фотофиксацию до закрытия.',
        result: 'Снизилась повторяемость B2 и ускорился повторный контроль.',
        author: 'Иванов И.И.',
        createdAt: now,
        updatedAt: now
    });

    pushUnique(window.skRecords, {
        id: 'demo_sk_v2_001',
        number: 'ДЕМО-201',
        text: 'Нарушена герметизация примыкания оконного блока.',
        category: 'Окна ПВХ',
        contractor: 'ООО "Окна-Про"',
        project_name: 'ЖК "Демонстрационный"',
        deadline: new Date(Date.now() - 3 * 86400000).toISOString(),
        date_issued: new Date(Date.now() - 10 * 86400000).toISOString(),
        status: 'Не устранено',
        inspector: 'Петров А.А.',
        structure: 'Корпус 2, этаж 5'
    });

    pushUnique(window.skRecords, {
        id: 'demo_sk_v2_002',
        number: 'ДЕМО-202',
        text: 'Подрядчик заявил устранение, требуется проверка СК.',
        category: 'Окна ПВХ',
        contractor: 'ООО "Окна-Про"',
        project_name: 'ЖК "Демонстрационный"',
        deadline: new Date(Date.now() - 1 * 86400000).toISOString(),
        date_issued: new Date(Date.now() - 8 * 86400000).toISOString(),
        status: 'Устранено',
        inspector: 'Петров А.А.',
        structure: 'Корпус 2, этаж 6'
    });

    pushUnique(window.skRecords, {
        id: 'demo_sk_v2_003',
        number: 'ДЕМО-203',
        text: 'Замечание проверено строительным контролем.',
        category: 'Фасад',
        contractor: 'ООО "Фасад-Мастер"',
        project_name: 'ЖК "Демонстрационный"',
        deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
        date_issued: new Date(Date.now() - 5 * 86400000).toISOString(),
        status: 'Проверено',
        inspector: 'Сидоров В.В.',
        structure: 'Корпус 1'
    });
};
window.startDemoMode = function (silent = false) {
    // 1. БЕЗОПАСНОСТЬ: ПРЯЧЕМ РЕАЛЬНЫЕ ДАННЫЕ
    realState = JSON.parse(JSON.stringify(state));
    realDetails = JSON.parse(JSON.stringify(details));
    realPhotos = JSON.parse(JSON.stringify(photos));
    realContractorArray = JSON.parse(JSON.stringify(contractorArray));
    realTemplateKey = currentTemplateKey;

    real_rbi_tasksData = JSON.parse(JSON.stringify(window.rbi_tasksData || []));
    real_weeklyPlanData = JSON.parse(JSON.stringify(typeof weeklyPlanData !== 'undefined' ? weeklyPlanData : {}));
    real_gameActionLogs = JSON.parse(JSON.stringify(typeof gameActionLogs !== 'undefined' ? gameActionLogs : []));
    real_rbi_meetingsData = JSON.parse(JSON.stringify(window.rbi_meetingsData || []));
    real_rbi_interventionsData = JSON.parse(JSON.stringify(window.rbi_interventionsData || []));
    real_rbi_practicesData = JSON.parse(JSON.stringify(window.rbi_practicesData || []));

    realTwiCards = JSON.parse(JSON.stringify(customTwiCards || []));
    realCustomDocs = JSON.parse(JSON.stringify(customDocs || []));
    realCustomNodes = JSON.parse(JSON.stringify(customNodes || []));

    real_skRecords = JSON.parse(JSON.stringify(window.skRecords || []));
    real_skVolumes = JSON.parse(JSON.stringify(window.skVolumes || {}));
    real_skContractorMap = JSON.parse(JSON.stringify(window.skContractorMap || {}));
    real_rbi_fmeaRecords = JSON.parse(JSON.stringify(window.rbi_fmeaRecords || []));
    real_rbi_scheduleData = JSON.parse(JSON.stringify(window.rbi_scheduleData || []));

    isDemoMode = true;
    document.body.classList.add('demo-mode');

    const fabExit = document.getElementById('fab-exit-demo');
    if (fabExit && !silent) { fabExit.classList.remove('hidden'); fabExit.style.display = 'flex'; }

    const now = new Date();
    const randomDay = (min, max) => {
        let d = new Date(); d.setDate(now.getDate() - (Math.floor(Math.random() * (max - min + 1)) + min));
        return d.toISOString();
    };

    // 2. БЛОКИРУЕМ БАЗУ ДАННЫХ (RAM-ONLY)
    window.originalDbPut = window.dbPut;
    window.originalDbDelete = window.dbDelete;
    window.originalDbClear = window.dbClear;
    window.originalDbGet = window.dbGet;
    window.originalDbGetAll = window.dbGetAll;

    window.dbPut = async () => true;
    window.dbDelete = async () => true;
    window.dbClear = async () => true;
    window.dbGet = async () => null;      // Чтобы вкладки не тянули пустые данные из реальной БД
    window.dbGetAll = async () => null;   // Чтобы вкладки не затирали наши демо-массивы

    // 3. ФОТОГРАФИИ ДЛЯ ДЕМО
    const demoPhotoGood = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='%23f0fdf4'/><path d='M250 300 L350 400 L550 200' stroke='%2322c55e' stroke-width='40' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='400' y='520' font-family='Arial' font-size='36' font-weight='bold' fill='%23166534' text-anchor='middle'>ЭТАЛОН (ВЕРНО)</text></svg>";
    const demoPhotoBad = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='%23fef2f2'/><path d='M250 200 L550 400 M250 400 L550 200' stroke='%23ef4444' stroke-width='40' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='400' y='520' font-family='Arial' font-size='36' font-weight='bold' fill='%23991b1b' text-anchor='middle'>БРАК (НАРУШЕНИЕ)</text></svg>";

    const metric = (f, b1, b2, b3) => ({ final: f, baseUrkPerc: f, checkedCount: 6, totalCount: 6, n_B1_fail: b1, n_B2_fail: b2, n_B3_fail: b3, b3_found: b3 > 0, kc: b2 > 2 ? 0.85 : 1.0, kcrit: b3 > 0 ? 0.5 : 1.0, isDanger: b3 > 0 });

    // 4. БАЗА ПРОВЕРОК (Большой массив данных)
    contractorArray = [];
    for (let i = 0; i < 45; i++) {
        let hasDefect = (i % 10 === 0);
        contractorArray.push({ id: 100 + i, date: randomDay(1, 60), projectName: 'ЖК "Демонстрационный"', inspectorName: 'Иванов И.И.', contractorName: 'ООО "Фасад-Мастер"', templateKey: 'sys_nvf_facade', templateTitle: 'Вент. фасад', section: `Корпус 1`, floor: `Этаж ${Math.floor(i / 4) + 1}`, room: `Оси ${i}`, location: `Корпус 1, Этаж ${Math.floor(i / 4) + 1}`, stageName: "Монтаж", isCompleted: true, state: { '108': 'ok', '109': hasDefect ? 'fail' : 'ok' }, details: hasDefect ? { '109': { causeCode: 'C01', comment: 'Смещение' } } : {}, photos: hasDefect ? { '109': demoPhotoBad } : { '108': demoPhotoGood }, metrics: metric(hasDefect ? 80 : 100, 0, hasDefect ? 1 : 0, 0) });
    }
    for (let i = 0; i < 35; i++) {
        let day = Math.floor(Math.random() * 60) + 1; let hasDefect = day < 30;
        contractorArray.push({ id: 200 + i, date: randomDay(1, 60), projectName: 'ЖК "Демонстрационный"', inspectorName: 'Иванов И.И.', contractorName: 'ООО "Окна-Про"', templateKey: 'sys_okna_pvh', templateTitle: 'Окна ПВХ', location: `Корпус 2, Этаж ${Math.floor(i / 3) + 1}`, stageName: "Монтаж окон", isCompleted: true, state: { '1610': hasDefect ? 'fail' : 'ok', '1615': 'ok' }, details: hasDefect ? { '1610': { causeCode: 'C04', comment: 'Завал рамы' } } : {}, photos: hasDefect ? { '1610': demoPhotoBad } : {}, metrics: metric(hasDefect ? 75 : 100, 0, hasDefect ? 1 : 0, 0) });
    }
    for (let i = 0; i < 30; i++) {
        let day = Math.floor(Math.random() * 60) + 1; let hasB3 = (day < 60 && i % 4 === 0);
        contractorArray.push({ id: 300 + i, date: randomDay(1, 60), projectName: 'ЖК "Демонстрационный"', inspectorName: 'Иванов И.И.', contractorName: 'ИП Петров (Бетон)', templateKey: 'sys_monolit', templateTitle: 'Монолитные работы', location: `Корпус 3, Этаж 1`, stageName: "Стены", isCompleted: true, state: { '1011': 'fail', '1014': hasB3 ? 'fail_escalated' : 'ok' }, details: hasB3 ? { '1014': { causeCode: 'C01', comment: 'Арматура торчит' } } : { '1011': { causeCode: 'C01', comment: 'Смещение' } }, photos: hasB3 ? { '1014': demoPhotoBad } : { '1011': demoPhotoBad }, metrics: metric(hasB3 ? 45 : 80, 0, 1, hasB3 ? 1 : 0) });
    }
    contractorArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 5. ДАТЫ ДЛЯ МОДУЛЕЙ
    let dOld = new Date(now); dOld.setDate(now.getDate() - 10);
    let dOverdue = new Date(now); dOverdue.setDate(now.getDate() - 2);
    let dToday = new Date(now);
    let dFuture = new Date(now); dFuture.setDate(now.getDate() + 5);
    let dFarFuture = new Date(now); dFarFuture.setDate(now.getDate() + 20);

    // 6. ЗАДАЧИ
    window.rbi_tasksData = [
        { id: 'dt1', type: 'auto', category: 'meeting', icon: 'Совещание', contractor: 'ИП Петров (Бетон)', project: 'ЖК "Демонстрационный"', templateKey: 'sys_monolit', workTitle: 'Монолитные работы', taskType: 'Совещание', title: 'Разбор критического брака', prompt: 'Зафиксировано 3 критических дефекта B3. Срочно проведите разбор с прорабом.', status: 'pending', priorityLvl: 4, date: dOverdue.toISOString(), done: 0, target: 1 },
        { id: 'dt2', type: 'auto', category: 'method', icon: 'ППР', contractor: 'Системная', project: 'Все', templateKey: '', workTitle: 'Аналитика СК', taskType: 'Отчет', title: 'Анализ проблем ПК СК', prompt: 'ИИ выявил аномалии в ПК Стройконтроль (высокий ИСД). Проведите сверку.', status: 'pending', priorityLvl: 3, date: dOverdue.toISOString(), done: 0, target: 1 },
        { id: 'dt3', type: 'auto', category: 'control', icon: 'Эталон', contractor: 'ООО "НовичокСтрой"', project: 'ЖК "Демонстрационный"', templateKey: 'sys_kirpich', workTitle: 'Кладка из кирпича', taskType: 'Эталон', title: 'Приемка Эталона', prompt: 'Новый подрядчик. Зафиксируйте эталон.', status: 'pending', priorityLvl: 4, date: dToday.toISOString(), done: 0, target: 1, needsEtalon: true },
        { id: 'dt4', type: 'auto', category: 'control', icon: 'Контроль', contractor: 'ООО "Окна-Про"', project: 'ЖК "Демонстрационный"', templateKey: 'sys_okna_pvh', workTitle: 'Окна ПВХ', taskType: 'Аудит', title: 'Усиленный контроль', prompt: 'Подрядчик в желтой зоне. Требуется 3 проверки на неделе.', status: 'pending', priorityLvl: 3, date: dFuture.toISOString(), done: 1, target: 3 },
        { id: 'dt5', type: 'auto', category: 'report', icon: 'Отчет', contractor: 'Системная', project: 'ЖК "Демонстрационный"', templateKey: '', workTitle: 'Отчетность', taskType: 'Отчет', title: 'Ежемесячный One-Pager', prompt: 'Отправьте руководителю выгрузку Сводного статуса.', status: 'pending', priorityLvl: 2, date: dFarFuture.toISOString(), done: 0, target: 1 }
    ];

    // 7. СОВЕЩАНИЯ (Протоколы)
    window.rbi_meetingsData = [{
        id: 'm1', date: dOld.toISOString(), author: 'Иванов И.И.', title: 'Совещание штаба от ' + dOld.toLocaleDateString('ru-RU'),
        qDayPhoto: demoPhotoBad,
        agenda: [
            { contr: 'ООО "Окна-Про"', defect: 'Завал оконной рамы более 15мм', isDone: true, date: dOld.toISOString(), resp: 'Смирнов', comment: 'Проведен мастер-класс, рамы переставлены.' },
            { contr: 'ИП Петров (Бетон)', defect: 'Обнажение арматуры', isDone: false, date: dFuture.toISOString(), resp: 'Сидоров', comment: 'Ждем поставку ремсостава.' }
        ],
        notes: 'Подрядчикам строго соблюдать ППР. Усилить контроль за поставками.',
        memoText: '**ПРОТОКОЛ**\n\n1. ООО "Окна-Про": Решено.\n2. ИП Петров: В работе до пятницы.'
    }];

    // 8. ВОЗДЕЙСТВИЯ (Impact) И ПРАКТИКИ
    window.rbi_interventionsData = [
        { id: 'int1', date: dOld.toISOString(), inspector: 'Иванов И.И.', contractor: 'ООО "Фасад-Мастер"', templateKey: 'sys_nvf_facade', templateTitle: 'Вент. фасад', typeText: 'Разбор с бригадой (TWI)', typeCoef: 1.5, comment: 'Проведен воркшоп с бригадой', baseUrk: 72, deltaUrk: 18 }
    ];
    window.rbi_practicesData = [
        { id: 'p1', interventionId: 'int1', date: dOld.toISOString(), author: 'Иванов И.И.', title: 'Правильный крепеж кронштейнов', templateTitle: 'Вент. фасад', deltaUrk: 18, problem: 'Смещение осей кронштейнов, срыв сроков', solution: 'Внедрен алюминиевый шаблон для разметки. Бригада обучена.', photoBefore: demoPhotoBad, photoAfter: demoPhotoGood, isPublished: true },
        { id: 'p2', interventionId: null, date: dOverdue.toISOString(), author: 'Иванов И.И.', title: 'Защита пены от солнца', templateTitle: 'Окна ПВХ', deltaUrk: 0, problem: 'Пена разрушается на солнце', solution: 'Обязательное использование Смарт-скин мастики', photoBefore: demoPhotoBad, photoAfter: demoPhotoGood, isPublished: true }
    ];

    // 9. FMEA МАТРИЦА РИСКОВ
    window.rbi_fmeaRecords = [{
        id: 'f1', date: dOverdue.toISOString(), author: 'Иванов И.И.', title: 'FMEA Анализ (Ноябрь)', periodName: 'Месяц',
        defects: [
            { contractor: 'ИП Петров (Бетон)', workTitle: 'Монолитные работы', defectName: 'Обнажение арматуры', count: 8, stage: 'Ошибки СМР', cause: 'Спешка при заливке, экономия фиксаторов', effect: 'Коррозия арматуры, снижение несущей способности', fix: 'Зачеканить ремсоставом', prevent: 'Добавить пункт в акт скрытых работ по проверке 4 фиксаторов на м2', rpn: 720, photo: demoPhotoBad },
            { contractor: 'ООО "Окна-Про"', workTitle: 'Окна ПВХ', defectName: 'Монтажный шов с пустотами', count: 5, stage: 'Материалы', cause: 'Бракованная партия пены', effect: 'Промерзание откосов', fix: 'Перепенить', prevent: 'Входной контроль пены', rpn: 350, photo: demoPhotoBad }
        ]
    }];

    // 10. ГРАФИК СМР
    window.rbi_scheduleData = [
        { id: 'sch1', workTitle: 'Монолит цоколя', contractor: 'ИП Петров (Бетон)', startDate: dOld.toISOString(), endDate: dToday.toISOString(), templateKey: 'sys_monolit', _deleted: false },
        { id: 'sch2', workTitle: 'Кладка наружных стен', contractor: 'ООО "Фасад-Мастер"', startDate: dOverdue.toISOString(), endDate: dFarFuture.toISOString(), templateKey: 'sys_gazobeton', _deleted: false },
        { id: 'sch3', workTitle: 'Монтаж Окон', contractor: 'ООО "Окна-Про"', startDate: dFuture.toISOString(), endDate: dFarFuture.toISOString(), templateKey: 'sys_okna_pvh', _deleted: false }
    ];

    // 11. ДАННЫЕ СТРОЙКОНТРОЛЯ (ПК СК)
    window.skVolumes = { 'Вент. фасад': { amount: 5000, unit: 'м2' }, 'Окна ПВХ': { amount: 300, unit: 'шт' }, 'Монолитные работы': { amount: 1200, unit: 'м3' } };
    window.skRecords = [
        { id: 'sk1', number: '101', text: 'Завал оконной рамы на 15мм', category: 'Окна ПВХ', date_issued: dOld.toISOString(), contractor: 'ООО "Окна-Про"', deadline: dOverdue.toISOString(), status: 'Не устранено', inspector: 'Петров А.А.', structure: 'Секция 1' },
        { id: 'sk2', number: '102', text: 'Отсутствует пароизоляция шва', category: 'Окна ПВХ', date_issued: dOld.toISOString(), contractor: 'ООО "Окна-Про"', deadline: dToday.toISOString(), status: 'Не устранено', inspector: 'Иванов И.И.', structure: 'Секция 2' },
        { id: 'sk3', number: '103', text: 'Обнажение арматуры пилона', category: 'Монолитные работы', date_issued: dOld.toISOString(), contractor: 'ИП Петров (Бетон)', deadline: dOld.toISOString(), status: 'Устранено', date_resolved: dToday.toISOString(), inspector: 'Сидоров В.В.', structure: 'Паркинг' },
        { id: 'sk4', number: '104', text: 'Мусор в котловане', category: 'Земляные работы', date_issued: dOverdue.toISOString(), contractor: 'СМУ-5', deadline: dFuture.toISOString(), status: 'Не устранено', inspector: 'Иванов И.И.', structure: 'Котлован' }
    ];

    // 12. БАЗА ЗНАНИЙ (TWI)
    customTwiCards = [
        { id: "demo_twi_1", title: "Контроль установки кронштейнов", checklistKey: "sys_nvf_facade", checklistName: "Вент. фасад", type: "INSPECTOR", itemId: "109", whyImportant: "Риск обрушения фасада при ветровой нагрузке.", howToCheck: "Проверить динамометрическим ключом.", photoGood: demoPhotoGood, photoBad: demoPhotoBad },
        { id: "demo_twi_2", title: "Монтаж пароизоляции окна", checklistKey: "sys_okna_pvh", checklistName: "Окна ПВХ", type: "WORKER", itemId: "1617", totalTime: 5, steps: [{ order: 1, text: "Очистить проем от пыли", time: 2, photo: null }, { order: 2, text: "Наклеить ленту с нахлестом 10см", time: 3, photo: demoPhotoGood }] }
    ];

    // 13. HR МЕТРИКИ И АЧИВКИ
    gameActionLogs = [];
    for (let i = 0; i < 80; i++) gameActionLogs.push({ id: 'l' + i, date: randomDay(1, 30), inspector: 'Иванов И.И.', action: ['create_twi', 'ai_generate', 'comment_written', 'task_completed_on_time', 'practice_published', 'etalon_accepted'][Math.floor(Math.random() * 6)] });

    // 14. НАСТРОЙКИ ИНТЕРФЕЙСА ДЛЯ ДЕМО
    document.getElementById('inp-project').value = 'ЖК "Демонстрационный"';
    document.getElementById('inp-inspector').value = 'Иванов И.И.';
    document.getElementById('inp-contractor').value = 'ООО "Фасад-Мастер"';
    document.getElementById('inp-section').value = 'Корпус 1, секция 2';

    currentTemplateKey = 'sys_nvf_facade';
    if (document.getElementById('checklist-selector')) document.getElementById('checklist-selector').value = currentTemplateKey;
    currentChecklist = SYSTEM_TEMPLATES['nvf_facade'].groups;

    state = {}; details = {}; assignPhotosMap({});
    state['108'] = 'ok'; photos['108'] = demoPhotoGood;
    state['109'] = 'fail'; details['109'] = { causeCode: 'C01', comment: '[Нарушение технологии] Отклонение' }; photos['109'] = demoPhotoBad;

    document.getElementById('empty-checklist-state').style.display = 'none';
    document.getElementById('audit-items').style.display = 'block';
    document.getElementById('audit-actions').style.display = 'grid';
    if (typeof window.rbi_enrichDemoModeV2 === 'function') {
        window.rbi_enrichDemoModeV2({
            demoPhotoGood,
            demoPhotoBad,
            nowIso: now.toISOString()
        });
    }
    // 15. ПРИНУДИТЕЛЬНЫЙ РЕНДЕР ВСЕГО
    updateDataSummary();
    if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
    render(); updateUI();

    // Заставляем все вкладки "проснуться" и отрисовать демо-массивы
    if (typeof renderHistoryTab === 'function') renderHistoryTab();
    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
    if (typeof renderTwiList === 'function') renderTwiList();
    if (typeof renderDocsList === 'function') renderDocsList();
    if (typeof renderNodesList === 'function') renderNodesList();
    if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
    if (typeof gameRenderDashboard === 'function') gameRenderDashboard();
    if (typeof rbi_renderScheduleTab === 'function') rbi_renderScheduleTab(true);
    if (typeof sk_renderMainTab === 'function') sk_renderMainTab();
    if (typeof rbi_renderMeetingTab === 'function') rbi_renderMeetingTab();
    if (typeof rbi_renderImpactTab === 'function') rbi_renderImpactTab();
    if (typeof rbi_renderFmeaHistory === 'function') rbi_renderFmeaHistory();
    if (typeof rbi_renderPracticesTab === 'function') rbi_renderPracticesTab();

    if (!silent) {
        showToast('🎮 Демо-режим загружен: СМР, FMEA, ПК СК и HR-аналитика!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.exitDemoMode = function () {
    isDemoMode = false;
    document.body.classList.remove('demo-mode');

    const fabExit = document.getElementById('fab-exit-demo');
    if (fabExit) { fabExit.classList.add('hidden'); fabExit.style.display = 'none'; }

    // ВОССТАНАВЛИВАЕМ ВСЁ
    state = JSON.parse(JSON.stringify(realState));
    details = JSON.parse(JSON.stringify(realDetails));
    assignPhotosMap(JSON.parse(JSON.stringify(realPhotos)));
    contractorArray = JSON.parse(JSON.stringify(realContractorArray));
    currentTemplateKey = realTemplateKey;

    window.rbi_tasksData = JSON.parse(JSON.stringify(real_rbi_tasksData));
    weeklyPlanData = JSON.parse(JSON.stringify(real_weeklyPlanData));
    gameActionLogs = JSON.parse(JSON.stringify(real_gameActionLogs));
    window.rbi_meetingsData = JSON.parse(JSON.stringify(real_rbi_meetingsData));
    window.rbi_interventionsData = JSON.parse(JSON.stringify(real_rbi_interventionsData));
    window.rbi_practicesData = JSON.parse(JSON.stringify(real_rbi_practicesData));

    customTwiCards = JSON.parse(JSON.stringify(realTwiCards));
    customDocs = JSON.parse(JSON.stringify(realCustomDocs));
    customNodes = JSON.parse(JSON.stringify(realCustomNodes));

    window.skRecords = JSON.parse(JSON.stringify(real_skRecords));
    window.skVolumes = JSON.parse(JSON.stringify(real_skVolumes));
    window.skContractorMap = JSON.parse(JSON.stringify(real_skContractorMap));
    window.rbi_fmeaRecords = JSON.parse(JSON.stringify(real_rbi_fmeaRecords));
    window.rbi_scheduleData = JSON.parse(JSON.stringify(real_rbi_scheduleData));

    ['inp-project', 'inp-inspector', 'inp-contractor', 'inp-section', 'inp-floor', 'inp-room', 'inp-location'].forEach(id => {
        if (document.getElementById(id)) {
            document.getElementById(id).value = '';
            document.getElementById(id).removeAttribute('readonly');
            document.getElementById(id).classList.remove('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed');
        }
    });

    if (document.getElementById('lock-inp-inspector')) document.getElementById('lock-inp-inspector').classList.add('hidden');
    if (document.getElementById('lock-inp-project')) document.getElementById('lock-inp-project').classList.add('hidden');

    window.dbPut = window.originalDbPut;
    window.dbDelete = window.originalDbDelete;
    window.dbClear = window.originalDbClear;
    window.dbGet = window.originalDbGet;
    window.dbGetAll = window.originalDbGetAll;

    restoreSession();
    switchTab('tab-audit');
    changeTemplate('HOME');

    showToast('🔄 Возврат к реальным данным (БД разблокирована)');
};

// ============================================================================
// === БЛОК: ИНТЕРАКТИВНЫЙ 28-ШАГОВЫЙ ТУТОРИАЛ (АБСОЛЮТНО ВСЕ ФУНКЦИИ) ===
// ============================================================================
let currentTutStep = 0;
let tutOverlay, tutHighlightBox, tutTooltip, tutText, tutStepNum, tutNextBtn;
// ============================================================================
// === RBI: ОБУЧАЮЩИЕ КАРТОЧКИ ДЛЯ ИСТОРИИ В АНАЛИТИКЕ ========================
// ============================================================================

window.rbiShowTutorialHistoryCard = function (mode = 'history') {
    // История у нас живёт внутри аналитики, а не как отдельная tab-history
    if (typeof switchTab === 'function') {
        switchTab('tab-analytics');
    }

    setTimeout(() => {
        // Открываем подвкладку История в аналитике
        const historyBtn =
            Array.from(document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn'))
                .find(b => String(b.getAttribute('onclick') || '').includes('sub-history'));

        if (historyBtn && typeof switchAnalyticsSubTab === 'function') {
            switchAnalyticsSubTab('sub-history', historyBtn);
        } else {
            // fallback, если кнопка не найдена
            document.querySelectorAll('.analytics-sub-section').forEach(s => s.classList.add('hidden'));
            const subHistory = document.getElementById('sub-history');
            if (subHistory) subHistory.classList.remove('hidden');
            window.currentActiveAnalyticsTab = 'sub-history';
        }

        setTimeout(() => {
            if (typeof renderHistoryTab === 'function') renderHistoryTab();
            if (typeof initCollapsiblePanel === 'function') {
                initCollapsiblePanel('hist-sticky-panel', 'hist-panel-body', 'hist-panel-header', 'hist-panel-toggle-icon');
            }

            const subHistory = document.getElementById('sub-history');
            const list = document.getElementById('history-list');
            const checksView = document.getElementById('history-checks-view');
            const emptyMsg = document.getElementById('hist-empty-msg');

            // Главная защита: если history-list пустой/не найден, всё равно вставляем карточку в sub-history
            const host = list || checksView || subHistory;
            if (!host) {
                console.warn('[Tutorial] Не найден контейнер истории: sub-history/history-list/history-checks-view');
                return;
            }

            document.querySelectorAll('.tutorial-history-card').forEach(el => el.remove());
            if (emptyMsg) emptyMsg.style.display = 'none';

            const cards = {
                sync: {
                    id: 'tutorial-history-sync-card',
                    badge: 'офлайн → облако',
                    title: 'Как данные попадают в историю',
                    text: 'После сохранения осмотр сначала появляется на устройстве. Затем при наличии интернета, прав доступа и успешной синхронизации он отправляется в облако.',
                    points: [
                        'Осмотр сохраняется локально',
                        'Фото могут загружаться дольше текста',
                        'После синхронизации данные видны другим пользователям по ролям'
                    ],
                    color: 'indigo'
                },
                history: {
                    id: 'tutorial-history-list-card',
                    badge: 'история проверок',
                    title: 'Что смотреть в истории',
                    text: 'История — это не просто архив. Здесь видно, какие проверки были проведены, где зафиксированы дефекты, какие фото приложены и как менялось качество подрядчика.',
                    points: [
                        'Проверяйте объект, подрядчика и локацию',
                        'Открывайте карточку проверки для деталей',
                        'Используйте историю для повторяемости, отчётов и разбора'
                    ],
                    color: 'blue'
                },
                day: {
                    id: 'tutorial-history-day-card',
                    badge: 'конец дня',
                    title: 'Как правильно завершить рабочий день',
                    text: 'В конце дня важно убедиться, что проверки сохранены, фото прикреплены, черновики не забыты, а синхронизация выполнена.',
                    points: [
                        'Проверьте сохранённые осмотры',
                        'Убедитесь, что фото открываются',
                        'Запустите синхронизацию перед закрытием дня'
                    ],
                    color: 'emerald'
                }
            };

            const card = cards[mode] || cards.history;

            const colorMap = {
                indigo: {
                    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
                    text: 'text-indigo-600 dark:text-indigo-300',
                    border: 'border-indigo-100 dark:border-indigo-800',
                    solid: 'bg-indigo-600'
                },
                blue: {
                    bg: 'bg-blue-50 dark:bg-blue-900/30',
                    text: 'text-blue-600 dark:text-blue-300',
                    border: 'border-blue-100 dark:border-blue-800',
                    solid: 'bg-blue-600'
                },
                emerald: {
                    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
                    text: 'text-emerald-600 dark:text-emerald-300',
                    border: 'border-emerald-100 dark:border-emerald-800',
                    solid: 'bg-emerald-600'
                }
            };

            const c = colorMap[card.color] || colorMap.indigo;

            const html = `
                <div id="${card.id}"
                    class="tutorial-history-card mx-1 mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[24px] shadow-sm overflow-hidden">

                    <div class="p-4 ${c.bg} border-b ${c.border}">
                        <div class="flex items-start gap-3">
                            <div class="w-12 h-12 rounded-2xl ${c.solid} text-white flex items-center justify-center shrink-0 shadow-sm">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9 11l3 3L22 4"></path>
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                                </svg>
                            </div>

                            <div class="min-w-0 flex-1">
                                <div class="text-[9px] font-black uppercase tracking-widest ${c.text} mb-1">
                                    ${card.badge}
                                </div>
                                <div class="text-[15px] font-black text-slate-800 dark:text-white leading-tight">
                                    ${card.title}
                                </div>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                                    ${card.text}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 space-y-2">
                        ${card.points.map(p => `
                            <div class="flex items-start gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-snug">
                                <span class="w-5 h-5 rounded-full ${c.bg} ${c.text} border ${c.border} flex items-center justify-center shrink-0 mt-[-2px]">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </span>
                                <span>${p}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            host.insertAdjacentHTML('afterbegin', html);

            const el = document.getElementById(card.id);
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 80);
            }
        }, 180);
    }, 120);
};
const tutorialSteps = [
    {
        title: "1. Что такое RBI Quality Pro",
        text: "RBI Quality Pro не заменяет ПК СК. ПК СК ведёт официальный контур замечаний, а RBI Quality помогает инженеру по качеству видеть риски, повторяемость дефектов, работу подрядчиков и действия для предотвращения брака.",
        targetId: "empty-checklist-state",
        action: () => { switchTab('tab-audit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    },
    {
        title: "2. Обучение проходит в демо",
        text: "Тур автоматически включает демо-режим. Можно нажимать кнопки и изучать модули — рабочие данные не меняются.",
        targetId: "fab-exit-demo",
        action: () => { if (!isDemoMode && typeof startDemoMode === 'function') startDemoMode(true); }
    },
    {
        title: "3. Осмотр",
        text: "Осмотр — фактическая проверка качества по чек-листу. От правильного выбора объекта, подрядчика и статусов зависит УрК, отчёты и аналитика.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-audit']",
        action: () => { switchTab('tab-audit'); }
    },
    {
        title: "4. Данные проверки",
        text: "Заполните объект, подрядчика и локацию. Эти данные нужны для ролей, отчётов, рейтинга, ПК СК и аналитики.",
        targetId: "header-data-block",
        action: () => { switchTab('tab-audit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    },
    {
        title: "5. Мини-дашборд",
        text: "В шапке видно качество текущего осмотра и накопленную надёжность подрядчика. Это быстрый индикатор риска.",
        targetId: "header-dashboard",
        action: () => {
            const icon = document.getElementById('dash-expand-icon');
            if (icon && document.getElementById('dash-expanded-view')?.classList.contains('hidden')) icon.click();
        }
    },
    {
        title: "6. Статусы пунктов",
        text: "Соответствует — только если реально проверено. Не соответствует — если есть дефект. Не проверялось — если проверить нельзя. Не применимо — если пункт не относится к зоне.",
        targetId: "card_wrapper_108",
        action: () => {
            switchTab('tab-audit');
            const el = document.getElementById('card_wrapper_108');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },
    {
        title: "7. B1 / B2 / B3",
        text: "B1 — мелкая доработка, B2 — значимый технологический дефект, B3 — критический риск. B2 и B3 сильно влияют на УрК, задачи и управленческие выводы.",
        targetId: "card_wrapper_109",
        action: () => {
            const el = document.getElementById('card_wrapper_109');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },
    {
        title: "8. Фото и комментарии",
        text: "Хорошее замечание содержит место, суть дефекта, требуемое действие и фото. Делайте общий вид, крупный план и фото после устранения.",
        targetId: "card_wrapper_109",
        action: () => {
            const el = document.getElementById('card_wrapper_109');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },
    {
        title: "9. TWI прямо из пункта",
        text: "Если к пункту привязана TWI-карта, инженер может сразу показать прорабу правильный пример, брак и методику проверки.",
        targetSelector: "#card_wrapper_109 .btn-status.text-blue-600, #card_wrapper_109 .btn-status.text-purple-600",
        action: () => { }
    },
    {
        title: "10. Сохранение и офлайн",
        text: "Приложение работает Offline-First: сначала сохраняет данные на устройстве, потом отправляет в облако при наличии интернета и прав. Здесь показано, почему после обхода важно дождаться синхронизации.",
        targetId: "tutorial-history-sync-card",
        action: () => {
            if (typeof window.rbiShowTutorialHistoryCard === 'function') {
                window.rbiShowTutorialHistoryCard('sync');
            }
        }
    },
    {
        title: "11. История проверок",
        text: "История нужна для анализа: какие дефекты были, где повторяются, какие фото приложены и как менялось качество. Открывайте проверки из истории, чтобы смотреть детали, фото и УрК.",
        targetId: "tutorial-history-list-card",
        action: () => {
            if (typeof window.rbiShowTutorialHistoryCard === 'function') {
                window.rbiShowTutorialHistoryCard('history');
            }
        }
    },
    {
        title: "12. Инженер",
        text: "Раздел инженера показывает профиль, задачи, совещания, Impact Score, FMEA и практики.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-engineer']",
        action: () => { switchTab('tab-engineer'); }
    },
    {
        title: "13. Задачи",
        text: "Планировщик задач — это карта рисков. Он подсказывает, где нужен аудит, TWI, FMEA, эталон, совещание или анализ ПК СК.",
        targetSelector: "button[onclick*='eng-sub-tasks']",
        action: () => {
            switchTab('tab-engineer');
            setTimeout(() => {
                const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
                const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-tasks')) || btns[1];
                if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-tasks', btn);
            }, 100);
        }
    },
    {
        title: "14. Задача — не слепой приказ",
        text: "Задача показывает риск, но инженер учитывает реальную ситуацию: доступность зоны, готовность работ, безопасность и график.",
        targetSelector: "button[onclick*='eng-sub-tasks']",
        action: () => { }
    },
    {
        title: "15. Совещания",
        text: "Совещание должно завершаться решениями: ответственный, срок, повторный контроль, TWI, FMEA или эталон.",
        targetSelector: "button[onclick*='eng-sub-meetings']",
        action: () => {
            const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-meetings'));
            if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-meetings', btn);
        }
    },
    {
        title: "16. Impact Score",
        text: "Эффективность инженера — не количество найденных дефектов, а влияние на снижение повторяемости и улучшение процесса.",
        targetSelector: "button[onclick*='eng-sub-impact']",
        action: () => {
            const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-impact'));
            if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-impact', btn);
        }
    },
    {
        title: "17. FMEA",
        text: "FMEA нужен, когда дефект повторяется или риск слишком серьёзный. Результатом должны быть действия: TWI, чек-лист, эталон, обучение или повторный контроль.",
        targetSelector: "button[onclick*='eng-sub-fmea']",
        action: () => {
            const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-fmea'));
            if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-fmea', btn);
        }
    },
    {
        title: "18. Аналитика",
        text: "Аналитика превращает проверки в управленческие выводы: УрК, ИУрК, ИКО, стабильность, повторяемость и зоны риска.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-analytics']",
        action: () => {
            switchTab('tab-analytics');
            setTimeout(() => {
                const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
                if (btns[0] && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-contractors', btns[0]);
            }, 100);
        }
    },
    {
        title: "19. Красная / жёлтая / зелёная зона",
        text: "Цвет подрядчика — сигнал риска. Красная зона требует действий: усиленный контроль, TWI, FMEA, эталон или совещание.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-analytics']",
        action: () => { switchTab('tab-analytics'); }
    },
    {
        title: "20. One-Pager",
        text: "One-Pager — короткий управленческий отчёт для руководителя: риски, подрядчики, дефекты, метрики и действия.",
        targetSelector: "button[onclick*='sub-onepager']",
        action: () => {
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('sub-onepager')) || btns[1];
            if (btn && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-onepager', btn);
        }
    },
    {
        title: "21. График СМР",
        text: "График СМР помогает планировать контроль: старт работ, ППР, инструктаж, финал и зоны будущего риска.",
        targetSelector: "button[onclick*='sub-schedule']",
        action: () => {
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('sub-schedule')) || btns[2];
            if (btn && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-schedule', btn);
        }
    },
    {
        title: "22. ПК СК",
        text: "RBI Quality не заменяет ПК СК. Здесь данные ПК СК используются для анализа: просрочки, CMI, ИСД, формальные закрытия и расхождения.",
        targetSelector: "button[onclick*='sub-sk']",
        action: () => {
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('sub-sk')) || btns[3];
            if (btn && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-sk', btn);
        }
    },
    {
        title: "23. Справочник",
        text: "Справочник — база знаний инженера: чек-листы, документы, TWI, узлы, практики, эталоны и FAQ.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-reference']",
        action: () => {
            switchTab('tab-reference');
            setTimeout(() => {
                const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
                if (btns[0] && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-checklists', btns[0]);
            }, 100);
        }
    },
    {
        title: "24. TWI",
        text: "TWI — короткая инструкция на рабочем месте. Она нужна, чтобы обучить подрядчика и не допустить повторения дефекта.",
        targetSelector: "button[onclick*='ref-sub-twi']",
        action: () => {
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('ref-sub-twi')) || btns[2];
            if (btn && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-twi', btn);
        }
    },
    {
        title: "25. Узлы и документы",
        text: "Узлы и документы помогают обосновать требования, объяснить правильное решение и снизить споры с подрядчиком.",
        targetSelector: "button[onclick*='ref-sub-docs']",
        action: () => {
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('ref-sub-docs')) || btns[1];
            if (btn && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-docs', btn);
        }
    },
    {
        title: "26. Практики",
        text: "Практики сохраняют рабочие решения, которые помогли снизить брак. Хорошую практику можно превратить в TWI или стандарт.",
        targetSelector: "button[onclick*='ref-sub-practices']",
        action: () => {
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('ref-sub-practices')) || btns[4];
            if (btn && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-practices', btn);
        }
    },
    {
        title: "27. FAQ / ИИ-помощник",
        text: "FAQ — справочник по приложению и методологии. После первой синхронизации база помощника доступна офлайн, а при интернете и включённом AI можно задавать вопросы свободным текстом.",
        targetSelector: "button[onclick*='openFaqModal']",
        action: () => { switchTab('tab-reference'); }
    },
    {
        title: "28. Отчёты",
        text: "Отчёт нужен не только для архива. Это инструмент совещания: показать факты, фото, риски и решения.",
        targetId: "fab-download-btn",
        action: () => {
            if (typeof closeFabExportMenu === 'function') closeFabExportMenu();
            const fab = document.getElementById('fab-download-btn');
            if (fab) {
                fab.style.display = 'flex';
                fab.classList.add('fab-visible');
            }
        }
    },
    {
        title: "29. Синхронизация",
        text: "После важных обходов запускайте синхронизацию. Пока фото или проверки только локальные, их нельзя удалять вместе с данными приложения.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-settings']",
        action: () => {
            if (typeof closeFabExportMenu === 'function') closeFabExportMenu();
            switchTab('tab-settings');
        }
    },
    {
        title: "30. Роли и доступ",
        text: "Пользователь видит данные по роли и закреплениям. Инженер, руководитель, подрядчик, директор и администратор видят разный объём данных.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-settings']",
        action: () => { switchTab('tab-settings'); }
    },
    {
        title: "31. Завершение дня",
        text: "В конце дня проверьте: осмотры сохранены, фото прикреплены, черновики не забыты, синхронизация выполнена, критичные дефекты вынесены в отчёт или задачу.",
        targetId: "tutorial-history-day-card",
        action: () => {
            if (typeof window.rbiShowTutorialHistoryCard === 'function') {
                window.rbiShowTutorialHistoryCard('day');
            }
        }
    },
    {
        title: "32. Финал",
        text: "Главная логика: RBI Quality помогает инженеру по качеству быть Business Quality Partner — видеть риски, предотвращать дефекты и улучшать процесс, а не просто вести второй журнал замечаний.",
        targetId: "empty-checklist-state",
        action: () => { switchTab('tab-audit'); },
        isEnd: true
    }
];

function startInteractiveTutorial() {
    if (!isDemoMode && typeof startDemoMode === 'function') {
        startDemoMode(true);
    }

    setTimeout(() => {
        currentTutStep = 0;
        tutOverlay = document.getElementById('tutorial-overlay');
        tutHighlightBox = document.getElementById('tut-highlight-box');
        tutTooltip = document.getElementById('tutorial-tooltip');
        tutText = document.getElementById('tut-text');
        tutStepNum = document.getElementById('tut-step');
        tutNextBtn = document.getElementById('tut-next-btn');

        document.getElementById('tut-total').innerText = tutorialSteps.length;

        tutOverlay.classList.remove('hidden');
        tutTooltip.classList.remove('hidden');

        showTutorialStep();
    }, 500);
}

function showTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    if (!step) return stopTutorial();

    // Экшен (переключение вкладок)
    if (step.action) step.action();

    setTimeout(() => {
        let target = step.targetId ? document.getElementById(step.targetId) : document.querySelector(step.targetSelector);

        // === ЖЕЛЕЗОБЕТОННОЕ ПОЗИЦИОНИРОВАНИЕ РАМКИ ===
        if (target) {
            const rect = target.getBoundingClientRect();
            // Используем fixed позиционирование (прямо по координатам viewport)
            tutHighlightBox.style.top = `${rect.top - 4}px`;
            tutHighlightBox.style.left = `${rect.left - 4}px`;
            tutHighlightBox.style.width = `${rect.width + 8}px`;
            tutHighlightBox.style.height = `${rect.height + 8}px`;
            tutHighlightBox.style.opacity = '1';
        } else {
            tutHighlightBox.style.opacity = '0';
        }

        tutStepNum.innerText = currentTutStep + 1;
        tutText.innerHTML = `<strong class="block text-[14px] mb-2 text-indigo-700 dark:text-indigo-400">${step.title}</strong><span class="text-slate-600 dark:text-slate-300 leading-relaxed">${step.text}</span>`;

        // === УМНОЕ ЦЕНТРИРОВАНИЕ ТУЛТИПА ПО ЭКРАНУ ===
        requestAnimationFrame(() => {
            const screenH = window.innerHeight;

            tutTooltip.style.top = 'auto';
            tutTooltip.style.bottom = 'auto';

            if (target) {
                const targetRect = target.getBoundingClientRect();
                const targetCenter = targetRect.top + (targetRect.height / 2);

                // Если элемент в верхней половине -> тултип вниз, иначе наверх
                if (targetCenter < screenH / 2) {
                    tutTooltip.style.bottom = '60px'; // Отступ от нижнего меню
                } else {
                    tutTooltip.style.top = '90px'; // Отступ от верхней шапки
                }
            } else {
                // Если нет элемента, строго по центру
                tutTooltip.style.top = '40%';
            }

            if (step.isEnd) {
                tutNextBtn.innerText = "Завершить 🚀";
                tutNextBtn.className = "bg-green-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-green-500 active:scale-95 transition-all";
            } else {
                tutNextBtn.innerText = "Далее ➔";
                tutNextBtn.className = "bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-indigo-500 active:scale-95 transition-all";
            }

            tutTooltip.classList.add('tut-active');
        });
    }, 700); // 700мс - гарантированно дожидаемся окончания скролла и отрисовки графиков
}

function nextTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    tutTooltip.classList.remove('tut-active');
    tutHighlightBox.style.opacity = '0';

    setTimeout(() => {
        if (step.isEnd) {
            stopTutorial();
        } else {
            currentTutStep++;
            showTutorialStep();
        }
    }, 400); // Время на затухание
}

function stopTutorial() {
    tutTooltip.classList.remove('tut-active');
    tutHighlightBox.style.opacity = '0';

    // Закрываем всё лишнее
    const expView = document.getElementById('dash-expanded-view');
    if (expView && !expView.classList.contains('hidden')) expView.classList.add('hidden');
    const dashIcon = document.getElementById('dash-expand-icon');
    if (dashIcon) dashIcon.innerText = '▼';

    const fab = document.getElementById('fab-download-btn');
    if (fab) { fab.classList.remove('fab-visible'); setTimeout(() => fab.style.display = 'none', 300); }
    if (typeof closeTwiConstructor === 'function') closeTwiConstructor();
    switchTab('tab-audit');

    setTimeout(() => {
        tutOverlay.classList.add('hidden');
        tutTooltip.classList.add('hidden');

        if (isDemoMode) {
            const fabExit = document.getElementById('fab-exit-demo');
            if (fabExit) {
                fabExit.classList.remove('hidden');
                fabExit.style.display = 'flex';
            }
        }

        const manageBody = document.getElementById('ref-manage-body');
        if (manageBody && manageBody.style.maxHeight !== '0px') toggleManagePanel();

        if (typeof updateBodyPadding === 'function') updateBodyPadding();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
}
// === КОНЕЦ ВСТАВКИ ===
// === УМНАЯ ФИКСАЦИЯ ПОЛЕЙ ===
let smartLockTimer = null;

function startSmartLock(e, inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.hasAttribute('readonly')) return;

    smartLockTimer = setTimeout(() => {
        if (confirm('Разблокировать поле для изменения значения?')) {
            unlockSmartField(inputId);
            // Если разблокировали инспектора, убираем из настроек
            if (inputId === 'inp-inspector') { appSettings.engineerName = ''; }
            if (inputId === 'inp-project') { appSettings.defaultProject = ''; }
            dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
        }
    }, 800); // 800 мс долгого нажатия
}

function cancelSmartLock() {
    if (smartLockTimer) clearTimeout(smartLockTimer);
}

function unlockSmartField(inputId) {
    const input = document.getElementById(inputId);
    const lock = document.getElementById(`lock-${inputId}`);
    if (!input) return;

    input.removeAttribute('readonly');
    input.classList.remove('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed');
    if (lock) {
        lock.classList.add('hidden');
    }
    input.focus();
}

function applySmartLocks() {
    if (isDemoMode) return;

    const inspInput = document.getElementById('inp-inspector');

    // 1. Блокировка имени инспектора (всегда)
    if (inspInput && appSettings.engineerName) {
        inspInput.value = appSettings.engineerName;
        inspInput.setAttribute('readonly', 'true');
        inspInput.classList.add('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed', 'pointer-events-none');
        document.getElementById('lock-inp-inspector')?.classList.remove('hidden');
    } else if (inspInput) {
        inspInput.classList.remove('pointer-events-none');
    }

    // Блокировку объекта мы полностью делегировали в ObjectDirectory.initUI()
    if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
}

window.showTwiPrintOptions = function () {
    const twiId = document.getElementById('twi-viewer-overlay').dataset.currentTwiId;
    if (!twiId) return;

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[14px] flex items-center justify-center border border-slate-200 dark:border-slate-700 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg></div>`;
    document.getElementById('modal-title').innerText = "Печать Инструкции";
    document.getElementById('modal-body').innerHTML = `
        <div class="space-y-2">
            <button onclick="closeModal(); setTimeout(()=>printCurrentTwi('script'), 300)" class="w-full text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></div>
                <div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Скачать PDF файл</div>
                    <div class="text-[10px] text-slate-500 font-bold mt-0.5">Сохранить в память устройства</div>
                </div>
            </button>
            <button onclick="closeModal(); setTimeout(()=>printCurrentTwi('browser'), 300)" class="w-full text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                <div class="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg></div>
                <div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Печать через принтер</div>
                    <div class="text-[10px] text-slate-500 font-bold mt-0.5">Системное диалоговое окно (A4)</div>
                </div>
            </button>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

// Переход в базу знаний со стартового экрана
function goToFAQ() {
    openFaqModal();
}


// === ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА AI ===
window.changeAiMode = function (mode) {
    appSettings.aiAuthMode = mode;
    saveSettings('aiAuthMode', mode);

    const personalKeyBlock = document.getElementById('personal-key-field');
    const corporatePwdBlock = document.getElementById('corporate-pwd-field');

    if (personalKeyBlock) personalKeyBlock.classList.add('hidden');
    if (corporatePwdBlock) corporatePwdBlock.classList.add('hidden');

    if (mode === 'personal') {
        if (personalKeyBlock) personalKeyBlock.classList.remove('hidden');
    } else if (mode === 'corporate') {
        if (corporatePwdBlock) corporatePwdBlock.classList.remove('hidden');
    }
};

/* RBI NEW: Рендер реестра бэкапов в Настройках */
window.rbi_renderBackupRegistry = async function () {
    const listEl = document.getElementById('rbi-backup-registry-list');
    if (!listEl) return;

    let logs = [];
    try {
        const logsObj = await dbGet(STORES.BACKUP_LOGS, 'main');
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
};

/* RBI NEW: Рендер списка задач (Инженер) */
window.rbi_tasksData = []; // Локальный массив задач

// --- РОУТЕР ВКЛАДОК ИНЖЕНЕРА ---
let currentActiveEngineerTab = 'eng-sub-tasks';
let _engineerDataLoaded = false; // Флаг ленивой загрузки
window.rbi_switchEngineerSubTab = async function (tabId, btnElement) {
    currentActiveEngineerTab = tabId;
    document.querySelectorAll('.eng-sub-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn').forEach(el => {
        el.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
        el.classList.add('text-[var(--text-muted)]');
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    if (btnElement) {
        btnElement.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
        btnElement.classList.remove('text-[var(--text-muted)]');
    }

    await rbi_renderEngineerTab();
};

window.rbi_renderEngineerTab = async function () {
    // Умная загрузка: грузим базу только 1 раз или если облако принесло новые задачи
    if (!_engineerDataLoaded || (window.syncDirtyFlags && window.syncDirtyFlags.tasks)) {
        await rbi_loadData();
        _engineerDataLoaded = true;
        if (window.syncDirtyFlags) window.syncDirtyFlags.tasks = false;
    }

    // ПРИНУДИТЕЛЬНО генерируем план, чтобы задачи появились!
    if (typeof gameGenerateWeeklyPlan === 'function') {
        await gameGenerateWeeklyPlan(false);
    }

    if (currentActiveEngineerTab === 'eng-sub-tasks') {
        rbi_renderTasksList(true); // Принудительно отрисовываем при входе на вкладку
    } else if (currentActiveEngineerTab === 'eng-sub-meetings') {
        rbi_renderMeetingTab();
    } else if (currentActiveEngineerTab === 'eng-sub-impact') {
        rbi_renderImpactTab();
    } else if (currentActiveEngineerTab === 'eng-sub-badges') {
        gameRenderDashboard();
    } else if (currentActiveEngineerTab === 'eng-sub-fmea') {
        rbi_renderFmeaHistory();
    }
};


// --- ПАРСЕР EXCEL (ГРАФИК РАБОТ) ---
window.rbi_importScheduleExcel = function () {
    document.getElementById('schedule-excel-input').click();
};

function parseExcelDate(val) {
    if (!val) return null;
    if (typeof val === 'number') {
        // Excel дата это кол-во дней с 01.01.1900
        return new Date((val - (25569)) * 86400 * 1000);
    } else if (typeof val === 'string') {
        const parts = val.split(/[.,/]/);
        if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
        }
        return new Date(val);
    }
    return null;
}

// Умный поиск ключа чек-листа по русскому названию
function findTemplateKey(titleStr) {
    if (!titleStr) return null;
    const search = titleStr.toLowerCase();

    // Ищем в системных
    for (let key in SYSTEM_TEMPLATES) {
        if (SYSTEM_TEMPLATES[key].title.toLowerCase().includes(search)) return `sys_${key}`;
    }
    // Ищем в пользовательских
    for (let key in userTemplates) {
        if (userTemplates[key].title.toLowerCase().includes(search)) return `user_${key}`;
    }
    return null;
}



// --- РЕНДЕР И РЕДАКТОР: Вкладка "Аналитика -> График" ---

// Бронебойная функция парсинга дат из Excel
function rbi_safeDateISO(val) {
    if (val === undefined || val === null || val === '') return new Date().toISOString();
    let d = null;
    if (typeof val === 'number') {
        d = new Date((val - 25569) * 86400 * 1000);
    } else if (typeof val === 'string') {
        const parts = val.trim().split(/[.,/ -]/);
        if (parts.length === 3) {
            let day = parts[0].padStart(2, '0');
            let month = parts[1].padStart(2, '0');
            let year = parts[2];
            if (year.length === 2) year = "20" + year;
            d = new Date(`${year}-${month}-${day}T12:00:00Z`);
        } else {
            d = new Date(val);
        }
    }
    if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString();
    return new Date().toISOString();
}

function rbi_findTemplateKey(titleStr) {
    if (!titleStr) return '';
    const search = titleStr.toLowerCase();
    for (let key in SYSTEM_TEMPLATES) {
        if (SYSTEM_TEMPLATES[key].title.toLowerCase().includes(search)) return `sys_${key}`;
    }
    if (typeof userTemplates !== 'undefined') {
        for (let key in userTemplates) {
            if (userTemplates[key].title.toLowerCase().includes(search)) return `user_${key}`;
        }
    }
    return '';
}

// Главный рендер графика (С визуализацией Ганта и задачами)
window.rbi_renderScheduleTab = async function (skipLoad = false) {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    if (!skipLoad && !(typeof isDemoMode !== 'undefined' && isDemoMode)) {
        await rbi_loadData();
    }
    if (!window.rbi_scheduleData) window.rbi_scheduleData = [];

    // 1. Собираем чек-листы для селектора
    let clOptions = '<option value="">-- Не привязан --</option>';
    const sysKeys = Object.keys(SYSTEM_TEMPLATES).sort((a, b) => SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title));
    sysKeys.forEach(key => { clOptions += `<option value="sys_${key}">[СИС] ${SYSTEM_TEMPLATES[key].title}</option>`; });

    if (typeof userTemplates !== 'undefined') {
        const userKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title));
        userKeys.forEach(key => { clOptions += `<option value="user_${key}">[МОЙ] ${userTemplates[key].title}</option>`; });
    }

    // 2. Генерируем строки редактора (таблицы)
    let activeData = window.rbi_scheduleData.filter(s => !s._deleted);
    let rowsHtml = activeData.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0)).map(s => {
        const d1 = s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '';
        const d2 = s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '';
        let currentSelect = clOptions.replace(`value="${s.templateKey}"`, `value="${s.templateKey}" selected`);

        return `
            <tr class="sched-row hover:bg-[var(--hover-bg)] transition-colors" data-id="${s.id}">
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-work font-bold" value="${s.workTitle || ''}" placeholder="Вид работ"></td>
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-contr" value="${s.contractor || ''}" placeholder="Подрядчик"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-start" value="${d1}"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-end" value="${d2}"></td>
                <td class="p-1"><select class="input-base !py-1.5 text-[10px] w-full sched-tmpl">${currentSelect}</select></td>
                <td class="p-1 text-center">
                    <button onclick="rbi_deleteScheduleRow('${s.id}')" class="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-200 active:scale-90 flex items-center justify-center mx-auto transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </td>
            </tr>`;
    }).join('');

    if (activeData.length === 0) {
        rowsHtml = `<tr><td colspan="6" class="text-center py-6 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-dashed border-slate-300">В графике нет этапов.</td></tr>`;
    }

    // 3. ГЕНЕРИРУЕМ ВИЗУАЛЬНЫЙ ТАЙМЛАЙН (СТРОГИЙ, КОМПАКТНЫЙ СТИЛЬ)
    let ganttHtml = '';
    if (activeData.length > 0) {
        // Находим крайние точки проекта для масштаба (+5% отступы по краям)
        let minDateMs = Math.min(...activeData.map(s => new Date(s.startDate).getTime()));
        let maxDateMs = Math.max(...activeData.map(s => new Date(s.endDate).getTime()));
        const paddingTime = (maxDateMs - minDateMs) * 0.05;

        const globalStart = minDateMs - paddingTime;
        const globalEnd = maxDateMs + paddingTime;
        let totalDuration = globalEnd - globalStart;
        if (totalDuration === 0) totalDuration = 1;

        // Положение линии "СЕГОДНЯ"
        const nowTime = new Date().getTime();
        let todayPerc = ((nowTime - globalStart) / totalDuration) * 100;
        todayPerc = Math.max(0, Math.min(100, todayPerc));

        let rowsHtml = '';

        activeData.forEach(s => {
            const sStart = new Date(s.startDate).getTime();
            const sEnd = new Date(s.endDate).getTime();

            let leftPerc = ((sStart - globalStart) / totalDuration) * 100;
            let widthPerc = ((sEnd - sStart) / totalDuration) * 100;
            if (widthPerc < 1) widthPerc = 1;

            // Ищем привязанные задачи к этому этапу
            const linkedTasks = (window.rbi_tasksData || []).filter(t =>
                t.source === 'schedule' && t.stageId === s.id && !t._deleted
            );

            // Отрисовка кружочков-задач (вех)
            let tasksDots = linkedTasks.map(t => {
                const tDate = new Date(t.date).getTime();
                let tLeft = ((tDate - sStart) / (sEnd - sStart)) * 100; // Позиция внутри самой полоски
                if (tLeft < 0) tLeft = 0; if (tLeft > 100) tLeft = 100;

                const isDone = t.status === 'done';
                const dotClass = isDone ? 'bg-green-500 border-green-700 z-20' : 'bg-white dark:bg-slate-700 border-indigo-500 z-10';
                // Берем первую букву из типа задачи
                const initial = t.taskType ? t.taskType.charAt(0).toUpperCase() : '';

                return `
                    <div class="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${dotClass} cursor-pointer group hover:scale-150 transition-transform flex items-center justify-center text-[7px] font-black" style="left: ${tLeft}%; transform: translate(-50%, -50%);">
                        ${isDone ? '✓' : initial}
                        <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 font-normal">
                            ${t.taskType}<br><span class="${isDone ? 'text-green-400' : 'text-slate-300'}">${new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                `;

            }).join('');

            rowsHtml += `
                <div class="relative py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex items-center group">
                    <div class="w-1/3 pr-2 shrink-0">
                        <div class="text-[10px] font-black text-slate-800 dark:text-white truncate" title="${s.workTitle}">${s.workTitle}</div>
                        <div class="text-[8px] font-bold text-slate-500 truncate" title="${s.contractor}">${s.contractor}</div>
                    </div>
                    <div class="w-2/3 h-5 relative shrink-0 border-l border-slate-200 dark:border-slate-700 pl-2">
                        <!-- Фон полосы -->
                        <div class="absolute h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full top-1/2 -translate-y-1/2 left-2 right-2"></div>
                        <!-- Активная заливка этапа -->
                        <div class="absolute h-1.5 bg-indigo-500 rounded-full top-1/2 -translate-y-1/2" style="left: calc(8px + ${leftPerc}% * 0.95); width: calc(${widthPerc}% * 0.95);">
                            ${tasksDots}
                        </div>
                    </div>
                </div>
            `;
        });

        const todayStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

        ganttHtml = `
            <!-- Легенда и правила генерации задач (Аккордеон) -->
            <details class="mb-3 group bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none">
                    <span class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Логика автоматических вех (Справка)
                    </span>
                    <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="p-3 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] leading-relaxed space-y-1.5 font-medium bg-white dark:bg-slate-800">
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">П</span> <span><b>ППР (-14 дн):</b> Задача на проверку и утверждение технологических карт до начала работ.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">И</span> <span><b>Инструктаж (-7 дн):</b> Сбор бригадиров, выдача TWI-инструкций и допусков.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">Э</span> <span><b>Эталон (-3 дн):</b> Комиссионная приемка первого образца работы.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">С</span> <span><b>Старт (0 дн):</b> Первая проверка выполненной работы на объекте в день старта этапа.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">Ф</span> <span><b>Финал (-3 дн от конца):</b> Итоговая инспекция перед закрытием объемов (КС-2), передачей фронта работ и подписания итогового акта.</span></div>
                </div>
            </details>

            <!-- Диаграмма Ганта -->

            <!-- Диаграмма Ганта -->
            <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl p-3 shadow-sm relative overflow-hidden">
                <!-- Вертикальная линия "СЕГОДНЯ" -->
                <div class="absolute top-0 bottom-0 w-px bg-red-500/50 z-0 pointer-events-none" style="left: calc(33.333% + 8px + ${todayPerc}% * 0.63);"></div>
                <div class="absolute top-0 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-b z-10 uppercase tracking-wide" style="left: calc(33.333% + 8px + ${todayPerc}% * 0.63); transform: translateX(-50%);">${todayStr}</div>
                
                <div class="mt-4 relative z-10">
                    ${rowsHtml}
                </div>
                
                <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>${new Date(minDateMs).toLocaleDateString('ru-RU')}</span>
                    <span>${new Date(maxDateMs).toLocaleDateString('ru-RU')}</span>
                </div>
            </div>

            
        `;
    } else {
        ganttHtml = `<div class="text-center py-8 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-2xl border border-dashed border-[var(--card-border)] mt-4">График пуст</div>`;
    }

    // 4. СБОРКА ИТОГОВОГО HTML

    // 4. СБОРКА ИТОГОВОГО HTML (Кнопки + Свернутый редактор + Визуал)
    let html = `
        <div class="flex gap-2 mb-4 px-1">
            <button onclick="rbi_importScheduleExcel()" class="flex-1 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 py-3.5 rounded-xl font-black text-[10px] text-green-700 dark:text-green-500 uppercase tracking-widest active:scale-95 shadow-sm transition-transform flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path></svg> Загрузить Excel
            </button>
            <button onclick="window.rbi_generateAutoTasks()" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сгенерировать задачи
            </button>
        </div>

        <!-- РЕДАКТОР ГРАФИКА (СВЕРНУТ ПО УМОЛЧАНИЮ) -->
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm mb-6 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                <span class="font-black text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg> Редактор (Ручной ввод)</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                <div class="flex justify-end gap-2 mb-3">
                    <button onclick="rbi_clearSchedule()" class="bg-white dark:bg-slate-800 text-red-600 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-[9px] font-bold uppercase shadow-sm active:scale-95 transition-transform flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Очистить всё</button>
                    <button onclick="rbi_saveSchedule()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[9px] font-bold uppercase shadow-md active:scale-95 transition-transform flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Сохранить правки</button>
                </div>
                <div class="overflow-x-auto custom-scrollbar bg-white dark:bg-slate-800 rounded-xl border border-[var(--card-border)] shadow-sm mb-3">
                    <table class="w-full text-left text-[10px] whitespace-nowrap min-w-[800px]">
                        <thead class="bg-[var(--hover-bg)] text-[var(--text-muted)] border-b border-[var(--card-border)] uppercase tracking-wider font-bold">
                            <tr><th class="p-2 pl-3 w-1/4">Вид работ</th><th class="p-2 w-1/5">Подрядчик</th><th class="p-2 w-32">Начало</th><th class="p-2 w-32">Окончание</th><th class="p-2 w-1/4">Чек-лист (Привязка)</th><th class="p-2 w-10 text-center">Удал.</th></tr>
                        </thead>
                        <tbody id="sched-tbody" class="divide-y divide-[var(--card-border)]">${rowsHtml}</tbody>
                    </table>
                </div>
                <button onclick="rbi_addScheduleRow()" class="w-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 py-3.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-600 text-[10px] font-bold uppercase active:scale-95 transition-colors flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Добавить строку
                </button>
            </div>
        </details>

        <!-- ВИЗУАЛЬНЫЙ ТАЙМЛАЙН -->
        <div class="px-1">
            <h3 class="text-[12px] font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5 tracking-tight"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg> Визуализация задач</h3>
            <div class="text-[9px] text-slate-500 font-bold mt-1 mb-2">Наведите мышку (или нажмите) на круглые узлы, чтобы увидеть запланированные задачи.</div>
            ${ganttHtml}
        </div>
    `;
    container.innerHTML = html;
};

// Добавление строки
// Добавление строки без перерисовки всей страницы
window.rbi_addScheduleRow = function () {
    if (!window.rbi_scheduleData) window.rbi_scheduleData = [];
    const newId = 'sch_' + Date.now().toString(36);

    // Получаем список чек-листов для выпадающего списка
    let clOptions = '<option value="">-- Не привязан --</option>';
    const sysKeys = Object.keys(SYSTEM_TEMPLATES).sort((a, b) => SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title));
    sysKeys.forEach(key => { clOptions += `<option value="sys_${key}">[СИС] ${SYSTEM_TEMPLATES[key].title}</option>`; });
    if (typeof userTemplates !== 'undefined') {
        const userKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title));
        userKeys.forEach(key => { clOptions += `<option value="user_${key}">[МОЙ] ${userTemplates[key].title}</option>`; });
    }

    const today = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('sched-tbody');

    if (tbody) {
        // Убираем заглушку "Нет этапов", если она есть
        if (tbody.innerHTML.includes('В графике нет этапов')) tbody.innerHTML = '';

        const tr = `
            <tr class="sched-row hover:bg-[var(--hover-bg)] transition-colors" data-id="${newId}">
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-work font-bold" value="" placeholder="Вид работ"></td>
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-contr" value="" placeholder="Подрядчик"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-start" value="${today}"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-end" value="${today}"></td>
                <td class="p-1"><select class="input-base !py-1.5 text-[10px] w-full sched-tmpl">${clOptions}</select></td>
                <td class="p-1 text-center">
                    <button onclick="this.closest('tr').remove()" class="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-200 active:scale-90 flex items-center justify-center mx-auto transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', tr);
    }
};

// Мягкое удаление одной строки
window.rbi_deleteScheduleRow = async function (id) {
    if (!confirm("Удалить эту строку?")) return;
    let item = window.rbi_scheduleData.find(s => s.id === id);
    if (item) {
        item._deleted = true;
        item.updatedAt = new Date().toISOString();
        if (typeof dbPut === 'function') await dbPut(STORES.SCHEDULE, item);
        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    }
    rbi_renderScheduleTab(true);
};

// Мягкое удаление всего графика
window.rbi_clearSchedule = async function () {
    if (!confirm("Удалить ВЕСЬ график? Это действие необратимо.")) return;
    for (let s of window.rbi_scheduleData) {
        s._deleted = true;
        s.updatedAt = new Date().toISOString();
        if (typeof dbPut === 'function') await dbPut(STORES.SCHEDULE, s);
    }
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    rbi_renderScheduleTab(true);
    showToast("🗑️ График полностью очищен");
};

// Сохранение графика (Только при реальных изменениях)
window.rbi_saveSchedule = async function () {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return showToast("В демо-режиме сохранение отключено");

    const rows = document.querySelectorAll('.sched-row');
    const validIds = new Set();
    let hasRealChanges = false;

    rows.forEach(row => {
        const id = row.dataset.id;
        const wTitle = row.querySelector('.sched-work').value.trim();
        const contr = row.querySelector('.sched-contr').value.trim();
        const dStart = row.querySelector('.sched-start').value;
        const dEnd = row.querySelector('.sched-end').value;
        const tKey = row.querySelector('.sched-tmpl').value;

        if (wTitle || contr) {
            validIds.add(id);
            let existing = window.rbi_scheduleData.find(s => s.id === id);

            const newStartISO = dStart ? new Date(dStart).toISOString() : new Date().toISOString();
            const newEndISO = dEnd ? new Date(dEnd).toISOString() : new Date().toISOString();

            if (existing) {
                // Сверяем значения. Если хоть одно отличается - значит были правки
                if (existing.workTitle !== wTitle || existing.contractor !== contr ||
                    existing.startDate.split('T')[0] !== newStartISO.split('T')[0] ||
                    existing.endDate.split('T')[0] !== newEndISO.split('T')[0] ||
                    existing.templateKey !== tKey || existing._deleted) {

                    existing.workTitle = wTitle;
                    existing.contractor = contr;
                    existing.startDate = newStartISO;
                    existing.endDate = newEndISO;
                    existing.templateKey = tKey;
                    existing.updatedAt = new Date().toISOString();
                    existing._deleted = false;
                    hasRealChanges = true;
                }
            } else {
                // Это новая строка
                window.rbi_scheduleData.push({
                    id: id, workTitle: wTitle, contractor: contr,
                    startDate: newStartISO, endDate: newEndISO,
                    templateKey: tKey, updatedAt: new Date().toISOString(), _deleted: false
                });
                hasRealChanges = true;
            }
        }
    });

    // Помечаем удаленными те, что исчезли из DOM
    window.rbi_scheduleData.forEach(s => {
        if (!validIds.has(s.id) && !s._deleted) {
            s._deleted = true;
            s.updatedAt = new Date().toISOString();
            hasRealChanges = true;
        }
    });

    if (!hasRealChanges) {
        return showToast("Нет изменений для сохранения.");
    }

    // Сохраняем в БД
    for (let s of window.rbi_scheduleData) {
        if (typeof dbPut === 'function') await dbPut(STORES.SCHEDULE, s);
    }

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    showToast("✅ График СМР обновлен!");

    // СНАЧАЛА пересчитываем задачи, А ПОТОМ перерисовываем график (чтобы задачи уже встали на новые места)
    if (typeof window.rbi_generateAutoTasks === 'function') {
        await window.rbi_generateAutoTasks(true); // Передаем true, чтобы скрыть лишние тосты генератора
    }

    rbi_renderScheduleTab(true);
};

// Загрузка графика из Excel
window.rbi_handleScheduleImport = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("⚙️ Читаем Excel файл...");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rows.length < 2) throw new Error("Файл пуст или не содержит данных");

            let added = 0;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const wTitle = row[0] ? row[0].toString().trim() : '';
                const contr = row[1] ? row[1].toString().trim() : '';

                if (!wTitle && !contr) continue;

                // Используем бронебойную функцию парсинга дат
                const dStartISO = rbi_safeDateISO(row[2]);
                const dEndISO = rbi_safeDateISO(row[3]);

                const newRow = {
                    id: 'sch_' + Date.now().toString(36) + i,
                    workTitle: wTitle,
                    contractor: contr,
                    startDate: dStartISO,
                    endDate: dEndISO,
                    templateKey: rbi_findTemplateKey(wTitle),
                    updatedAt: new Date().toISOString(),
                    _deleted: false
                };

                window.rbi_scheduleData.push(newRow);
                if (typeof dbPut === 'function') await dbPut(STORES.SCHEDULE, newRow);
                added++;
            }

            localStorage.setItem('rbi_cloud_dirty', '1');
            if (typeof triggerSync === 'function') triggerSync('silent');

            showToast(`✅ Загружено этапов: ${added}`);
            rbi_renderScheduleTab(true);

            // ВЫЗЫВАЕМ ГЕНЕРАТОР ЗАДАЧ ПОСЛЕ ИМПОРТА EXCEL
            await window.rbi_generateAutoTasks();

        } catch (err) {
            console.error(err);
            alert("Ошибка чтения Excel: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
};


/* ============================================================================ */
/* RBI NEW: МОДУЛЬ СОВЕЩАНИЙ И ПРОТОКОЛОВ (DEEPSEEK + АВТО-ПОВЕСТКА)            */
/* ============================================================================ */

window.rbi_renderMeetingTab = function () {
    const container = document.getElementById('rbi-meeting-container');
    if (!container) return;

    // ОБНОВЛЯЕМ ШАПКУ И КНОПКУ "СОЗДАТЬ" (Без эмодзи, в стиле iOS)
    const titleContainer = container.previousElementSibling;
    if (titleContainer) {
        titleContainer.className = "sticky-top-panel bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 z-40";
        titleContainer.innerHTML = `
            <div class="flex justify-between items-center">
                <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    Протоколы Совещаний
                </h2>
                <button onclick="rbi_createMeeting()" class="bg-orange-500 text-white px-3 py-1.5 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Новое совещание
                </button>
            </div>
        `;
    }

    if (window.rbi_meetingsData.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] shadow-sm">Активных протоколов нет</div>`;
        return;
    }

    const currentEngineer = appSettings.engineerName || 'Инженер';
    const sorted = [...window.rbi_meetingsData]
        .filter(m => m && m.id && m.date && m.title && m.memoText && !m._deleted)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">` + sorted.map(m => {
        let isOwner = !m.author || m.author === currentEngineer;

        let previewHtml = '';
        if (m.qDayPhoto) {
            previewHtml = `<img src="${window.getPhotoSrc(m.qDayPhoto)}" class="w-full h-full object-cover">`;
        } else {
            previewHtml = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg></div>`;
        }

        const resolvedCount = m.agenda ? m.agenda.filter(a => a.isDone).length : 0;
        const totalCount = m.agenda ? m.agenda.length : 0;

        return `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="rbi_openSavedMeeting('${m.id}')">
            
            <div class="h-24 sm:h-28 border-b border-[var(--card-border)] relative">
                ${previewHtml}
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${m.id}', 'meeting', '${m.title.replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
            </div>
            
            <div class="p-3 flex flex-col flex-1">
                <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1 truncate">${m.title}</div>
                <div class="text-[9px] font-bold text-[var(--text-muted)] mb-2 flex items-center gap-1">
                    Вопросов: ${resolvedCount}/${totalCount}
                </div>
                
                <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 italic mb-2 flex-1">
                    ${(m.memoText || '').replace(/<br>/g, ' ')}
                </div>
                
                <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                    <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                        <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${m.author ? m.author.split(' ')[0] : 'Инженер'}
                    </div>
                    <div class="text-[9px] font-black text-slate-400">${new Date(m.date).toLocaleDateString('ru-RU')}</div>
                </div>
            </div>
            
        </div>
        `;
    }).join('');
};

// Открытие сохраненного мемо (ПОЛНОЦЕННЫЙ ПРОСМОТРЩИК)
// Открытие сохраненного мемо (ПОЛНОЦЕННЫЙ ПРОСМОТРЩИК И РЕДАКТОР)
window.rbi_openSavedMeeting = async function (id) {
    const meet = window.rbi_meetingsData.find(m => m.id === id);
    if (!meet) return;

    window.currentEditingMeetingId = id; // Запоминаем для редактирования

    let photoHtml = '';
    if (meet.qDayPhoto) {
        const realSrc = await PhotoManager.getAsyncUrl(meet.qDayPhoto) || window.getPhotoSrc(meet.qDayPhoto);
        photoHtml = `
            <div class="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm h-48 sm:h-56 relative bg-slate-50 dark:bg-slate-900">
                <img src="${realSrc}" class="w-full h-full object-cover cursor-pointer active:scale-95 transition-transform" onclick="setTimeout(() => openPhotoViewer('${meet.qDayPhoto}'), 100)">
                <div class="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-black uppercase px-2 py-1 rounded backdrop-blur-sm">📸 Фото фиксация</div>
            </div>`;
    }

    let agendaHtml = '';
    if (meet.agenda && meet.agenda.length > 0) {
        agendaHtml = meet.agenda.map(a => `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl mb-2 shadow-sm">
                <div class="text-[11px] font-black text-slate-800 dark:text-white mb-1">${a.contr}</div>
                <div class="text-[11px] text-slate-700 dark:text-slate-300 font-medium mb-2 leading-snug">${a.defect}</div>
                <div class="flex flex-wrap gap-2 text-[9px] font-bold">
                    <span class="${a.isDone ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'} px-2 py-1 rounded border uppercase tracking-widest flex items-center gap-1">${a.isDone ? '✅ Решено' : '⏳ В работе'}</span>
                    ${a.date ? `<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200">Срок: ${new Date(a.date).toLocaleDateString('ru-RU')}</span>` : ''}
                    ${a.resp ? `<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200">Отв: ${a.resp}</span>` : ''}
                </div>
                ${a.comment ? `<div class="text-[11px] text-slate-600 dark:text-slate-400 mt-2 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100">💬 ${a.comment}</div>` : ''}
            </div>
        `).join('');
    } else {
        agendaHtml = `<div class="text-[10px] text-slate-400 italic text-center py-4 bg-white rounded-xl border border-dashed border-slate-300">Детальная повестка не сохранена</div>`;
    }

    let notesHtml = meet.notes ? `
        <div class="mt-3 text-[11px] bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-xl shadow-sm leading-relaxed">
            <span class="font-black uppercase mb-1 block">📌 Дополнительные тезисы:</span>
            ${meet.notes}
        </div>` : '';

    document.getElementById('modal-icon').innerHTML = ``;
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full">
            <span class="text-[14px] uppercase font-black text-slate-800 dark:text-white flex items-center gap-2">📅 Протокол</span>
            <button onclick="closeModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg">✕</button>
        </div>
    `;

    document.getElementById('modal-body').innerHTML = `
        <div class="text-[10px] text-slate-500 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 flex justify-between items-center">
            <span>Автор: <b>${meet.author}</b></span>
            <span>Составлено: <b>${new Date(meet.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b></span>
        </div>

        ${photoHtml}

        <div class="mb-4 bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[30vh] overflow-y-auto custom-scrollbar shadow-inner">
            <div class="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 pl-1">📋 Повестка и решения</div>
            ${agendaHtml}
            ${notesHtml}
        </div>

        <div class="text-[11px] font-black uppercase tracking-widest text-green-600 dark:text-green-500 mb-2 pl-1 flex justify-between items-center">
            <span>Итоговый протокол (Мемо)</span>
            <button onclick="rbi_saveEditedMeeting()" class="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-1 rounded text-[9px] font-bold active:scale-95">💾 Сохранить правки</button>
        </div>
        <textarea id="saved-memo-text" class="w-full text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 bg-white p-3 sm:p-4 rounded-xl border border-slate-300 shadow-inner whitespace-pre-wrap font-medium h-48 resize-none outline-none custom-scrollbar mb-4">${meet.memoText}</textarea>

        <div class="flex gap-2">
            <button onclick="rbi_printMeetingPdf('${meet.id}', 'script')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg> PDF</button>
            <button onclick="rbi_printMeetingPdf('${meet.id}', 'browser')" class="flex-1 bg-slate-100 text-slate-700 border border-slate-200 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button>
            <button onclick="copyExpertText('btn-copy-saved', 'saved-memo-text')" id="btn-copy-saved" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-md active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Копировать</button>
        </div>
    `;

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

// Функция сохранения правок в тексте Мемо
window.rbi_saveEditedMeeting = async function () {
    if (!window.currentEditingMeetingId) return;
    const meet = window.rbi_meetingsData.find(m => m.id === window.currentEditingMeetingId);
    if (!meet) return;

    meet.memoText = document.getElementById('saved-memo-text').value;
    meet.updatedAt = new Date().toISOString();
    meet.updated_at = meet.updatedAt;
    
    // ВАЖНО: Говорим облаку, что протокол изменен и его нужно отправить заново!
    meet.source = 'local';
    meet.syncStatus = 'not_synced';
    meet.sync_status = 'not_synced';
    meet.syncBlockReason = '';
    meet.sync_block_reason = '';

    await dbPut(STORES.MEETINGS, meet);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    showToast("✅ Правки протокола сохранены");
};



window.rbi_deleteMeeting = async function (id) {
    const meetIndex = window.rbi_meetingsData.findIndex(m => m.id === id);
    if (meetIndex !== -1 && !RbiRoles.canDelete(window.rbi_meetingsData[meetIndex].author)) return showToast("⚠️ Нет прав на удаление чужого протокола!");

    if (!confirm("Удалить этот протокол?")) return;
    if (meetIndex !== -1) {
        window.rbi_meetingsData[meetIndex]._deleted = true;
        window.rbi_meetingsData[meetIndex].is_deleted = true; // <-- ДЛЯ ОБЛАКА
        window.rbi_meetingsData[meetIndex]._deletedAt = new Date().toISOString();
        window.rbi_meetingsData[meetIndex].updatedAt = window.rbi_meetingsData[meetIndex]._deletedAt;

        window.rbi_meetingsData[meetIndex].source = 'local';
        window.rbi_meetingsData[meetIndex].syncStatus = 'not_synced';
        window.rbi_meetingsData[meetIndex].sync_status = 'not_synced';

        await dbPut(STORES.MEETINGS, window.rbi_meetingsData[meetIndex]);
    }

    window.rbi_meetingsData = window.rbi_meetingsData.filter(m => !m._deleted);
    rbi_renderMeetingTab();
    if (typeof gameGenerateWeeklyPlan === 'function') gameGenerateWeeklyPlan(true); // Пересчет задач
    showToast("🗑️ Протокол удален");

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};


/* === ОКНО НАСТРОЙКИ ПОВЕСТКИ СОВЕЩАНИЯ === */
/* === ОКНО НАСТРОЙКИ ПОВЕСТКИ СОВЕЩАНИЯ (С ФИЛЬТРАМИ) === */
window.rbi_openMeetingSetupModal = function (taskId = null) {
    const uniqueProjects = [...new Set(contractorArray.map(c => c.projectName).filter(Boolean))].sort();
    let projOptions = `<option value="ALL">Все объекты</option>`;
    uniqueProjects.forEach(p => { projOptions += `<option value="${p.replace(/"/g, '&quot;')}">${p}</option>`; });

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-orange-200">👥</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Повестка Совещания</div>`;

    document.getElementById('modal-body').innerHTML = `
        <div class="grid grid-cols-2 gap-2 mb-4">
            <div>
                <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Объект</label>
                <select id="meet-setup-project" class="input-base !py-2 text-[11px] font-bold" onchange="rbi_updateMeetingSetupList()">
                    ${projOptions}
                </select>
            </div>
            <div>
                <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Период</label>
                <select id="meet-setup-period" class="input-base !py-2 text-[11px] font-bold" onchange="rbi_updateMeetingSetupList()">
                    <option value="WEEK" selected>Неделя</option>
                    <option value="MONTH">Месяц</option>
                    <option value="ALL">Всё время</option>
                </select>
            </div>
        </div>
        
        <div class="flex justify-between items-center mb-2 px-1 border-t border-slate-100 pt-2">
            <span class="text-[10px] font-black uppercase text-slate-400">Список подрядчиков</span>
            <button onclick="document.querySelectorAll('.meet-setup-cb').forEach(cb=>cb.checked=true)" class="text-orange-600 text-[10px] font-bold hover:underline">Выбрать всех</button>
        </div>
        
        <div id="meet-setup-checkboxes" class="space-y-2 mb-6 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
            <!-- Чекбоксы загрузятся сюда -->
        </div>

        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700">Отмена</button>
            <button onclick="closeModal(); rbi_executeMeetingSetup('${taskId || ''}')" class="flex-1 bg-orange-500 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">▶ Начать разбор</button>
        </div>
    `;

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    // Сразу генерируем список при открытии
    rbi_updateMeetingSetupList();
};

window.rbi_updateMeetingSetupList = function () {
    const proj = document.getElementById('meet-setup-project').value;
    const period = document.getElementById('meet-setup-period').value;
    const container = document.getElementById('meet-setup-checkboxes');

    let baseData = contractorArray;

    if (proj !== 'ALL') baseData = baseData.filter(c => c.projectName === proj);

    const now = new Date();
    if (period === 'WEEK') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        baseData = baseData.filter(c => new Date(c.date) >= d);
    } else if (period === 'MONTH') {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        baseData = baseData.filter(c => new Date(c.date) >= d);
    }

    const uniqueContrs = [...new Set(baseData.map(c => c.contractorName).filter(Boolean))].sort();

    if (uniqueContrs.length === 0) {
        container.innerHTML = `<div class="text-center text-[10px] font-bold text-slate-400 py-4 bg-[var(--hover-bg)] rounded-lg">Нет проверок за этот период</div>`;
        return;
    }

    container.innerHTML = uniqueContrs.map(c => `
        <label class="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all hover:border-orange-300">
            <input type="checkbox" value="${c.replace(/"/g, '&quot;')}" class="meet-setup-cb w-5 h-5 accent-orange-600 rounded cursor-pointer" checked>
            <span class="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1">${c}</span>
        </label>
    `).join('');
};

window.rbi_executeMeetingSetup = async function (taskId) {
    const checkedBoxes = document.querySelectorAll('.meet-setup-cb:checked');
    const selectedContrs = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedContrs.length === 0) return showToast("⚠️ Выберите хотя бы одного подрядчика!");

    const proj = document.getElementById('meet-setup-project').value;
    const period = document.getElementById('meet-setup-period').value;

    let finalData = contractorArray.filter(c => selectedContrs.includes(c.contractorName));
    if (proj !== 'ALL') finalData = finalData.filter(c => c.projectName === proj);

    const now = new Date();
    if (period === 'WEEK') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        finalData = finalData.filter(c => new Date(c.date) >= d);
    } else if (period === 'MONTH') {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        finalData = finalData.filter(c => new Date(c.date) >= d);
    }

    // ВАЖНО: Привязываем ID задачи к глобальной переменной, чтобы протокол мог её закрыть!
    if (taskId && taskId !== 'null') window.activeTaskId = taskId;

    // Переключаем вкладки и дожидаемся их отрисовки, чтобы не было конфликтов
    switchTab('tab-engineer');
    const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
    if (btns[2]) await rbi_switchEngineerSubTab('eng-sub-meetings', btns[2]);

    // Запускаем сборку рабочего пространства с нашими данными
    rbi_createMeeting(finalData);
};
// === СОВЕЩАНИЯ: ДВУХПАНЕЛЬНЫЙ ИНТЕРФЕЙС (С ИНЪЕКЦИЕЙ ДАННЫХ ПК СК) ===
// === СОВЕЩАНИЯ: ЕДИНЫЙ ИНТЕРФЕЙС (1 КОЛОНКА, АДАПТИВ ДЛЯ МОБИЛЬНЫХ) ===
window.rbi_createMeeting = function (customData = null) {
    if (!customData) {
        rbi_openMeetingSetupModal(null);
        return;
    }

    const container = document.getElementById('rbi-meeting-container');
    const d = new Date();
    let weekChecks = customData;

    let periodText = "7 дней";
    const selectedPeriod = document.getElementById('meet-setup-period')?.value;
    if (selectedPeriod === 'MONTH') periodText = "30 дней";
    if (selectedPeriod === 'ALL') periodText = "Всё время";

    const weekMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(weekChecks, userTemplates) : null;
    const iko = weekMetrics ? weekMetrics.IKO : '0.00';
    const ikoColor = weekMetrics ? weekMetrics.ikoColor : 'text-slate-500';

    let defectPhotosHtml = '';
    let b3Photos = [];
    weekChecks.forEach(c => {
        if (c.state && c.photos) {
            Object.keys(c.state).forEach(id => {
                if ((c.state[id] === 'fail' || c.state[id] === 'fail_escalated') && c.photos[id]) {
                    b3Photos.push({ src: c.photos[id], contr: c.contractorName });
                }
            });
        }
    });
    b3Photos = b3Photos.sort(() => 0.5 - Math.random()).slice(0, 4); // Берем 4 фото для красоты сетки
    if (b3Photos.length > 0) {
        defectPhotosHtml = `
            <div class="mt-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-[var(--card-border)] shadow-sm">
                <div class="text-[10px] font-black text-red-600 uppercase mb-2">📸 Фотофиксация брака (Рандом)</div>
                <div class="flex gap-2 overflow-x-auto no-scrollbar">
                    ${b3Photos.map(p => `
                        <div class="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border border-red-200 relative">
                            <img src="${window.getPhotoSrc(p.src)}" class="w-full h-full object-cover">
                            <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] truncate px-1 pb-0.5">${p.contr}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    const contrDefects = {};
    let b3Count = 0;
    let goodContrs = [];
    let badContrs = [];
    const contrMap = {};

    weekChecks.forEach(c => { contrMap[c.contractorName] = contrMap[c.contractorName] || []; contrMap[c.contractorName].push(c); });

    // 1. Собираем дефекты из RBI (Аудиты) и распределяем подрядчиков по зонам
    for (let cName in contrMap) {
        const m = getContractorMetrics(contrMap[cName], userTemplates);
        if (m) {
            if (m.finalC >= 85 && m.n_изделий_с_B3 === 0) goodContrs.push(cName);
            if (m.finalC < 70 || m.n_изделий_с_B3 > 0) badContrs.push(cName);
        }

        contrMap[cName].forEach(c => {
            if (c.metrics) b3Count += c.metrics.n_B3_fail;
            if (c.state && c.templateKey) {
                Object.keys(c.state).forEach(id => {
                    if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                        const flat = getFlatList(userTemplates[c.templateKey.replace('user_', '')]?.groups || SYSTEM_TEMPLATES[c.templateKey.replace('sys_', '')]?.groups);
                        const item = flat.find(x => x.id == id);
                        if (item) {
                            if (!contrDefects[cName]) contrDefects[cName] = [];
                            let existing = contrDefects[cName].find(d => d.name === item.n);
                            if (existing) existing.count++;
                            else contrDefects[cName].push({ name: item.n, count: 1, isB3: c.state[id] === 'fail_escalated' || item.w === 3, isSk: false });
                        }
                    }
                });
            }
        });
    }

    // 2. ИНЪЕКЦИЯ ПРОСРОЧЕННЫХ ЗАМЕЧАНИЙ ИЗ ПК СТРОЙКОНТРОЛЬ
    let skOverdueCount = 0;
    if (typeof window.skRecords !== 'undefined') {
        const today = new Date();
        window.skRecords.forEach(r => {
            const isOpen = r.status && r.status.toLowerCase().includes('не устран');
            if (isOpen && r.contractor) {
                let targetContr = r.contractor;
                if (window.skContractorMap && window.skContractorMap[r.contractor]) {
                    targetContr = window.skContractorMap[r.contractor];
                }

                // Берем только тех подрядчиков, которых выбрали в фильтре
                if (customData && !customData.some(c => c.contractorName === targetContr)) return;

                // НОВОЕ: Проверяем, просрочено ли замечание
                let isOverdue = false;
                if (r.deadline) {
                    const deadlineDate = new Date(r.deadline);
                    if (deadlineDate < today) {
                        isOverdue = true;
                    }
                }

                // Если замечание НЕ просрочено — пропускаем его
                if (!isOverdue) return;

                skOverdueCount++;

                if (!contrDefects[targetContr]) contrDefects[targetContr] = [];
                const defectName = r.text ? r.text : 'Замечание без текста';

                let existing = contrDefects[targetContr].find(d => d.name === defectName);
                if (existing) {
                    existing.count++;
                } else {
                    // Помечаем, что это именно просрочка
                    const explicitName = `[Просрочено в СК] ${defectName}`;
                    contrDefects[targetContr].push({
                        name: explicitName, count: 1, isB3: false, isSk: true, deadline: r.deadline
                    });
                }
            }
        });
    }
    // 3. ИНЪЕКЦИЯ НЕРЕШЕННЫХ ВОПРОСОВ С ПРОШЛЫХ СОВЕЩАНИЙ
    if (typeof window.rbi_meetingsData !== 'undefined') {
        window.rbi_meetingsData.forEach(meet => {
            if (meet.agenda) {
                meet.agenda.forEach(a => {
                    if (!a.isDone) {
                        // Если в фильтре выбраны конкретные подрядчики, отсеиваем лишних
                        if (customData && !customData.some(c => c.contractorName === a.contr)) return;

                        if (!contrDefects[a.contr]) contrDefects[a.contr] = [];
                        // Проверяем, не добавлен ли этот дефект уже
                        let existing = contrDefects[a.contr].find(d => d.name === a.defect);
                        if (!existing) {
                            contrDefects[a.contr].push({
                                name: a.defect,
                                count: 1,
                                isB3: false,
                                isSk: false,
                                isCarryOver: true, // Флаг: это старый вопрос!
                                oldDate: a.date,
                                oldResp: a.resp,
                                oldComment: a.comment
                            });
                        }
                    }
                });
            }
        });
    }
    let goodContrsHtml = goodContrs.length > 0
        ? goodContrs.map(c => `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-black mr-1 mb-1 inline-block">${c}</span>`).join('')
        : '<span class="text-[10px] text-slate-400 font-bold">Отличников нет</span>';

    let badContrsHtml = badContrs.length > 0
        ? badContrs.map(c => `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black mr-1 mb-1 inline-block">${c}</span>`).join('')
        : '<span class="text-[10px] text-slate-400 font-bold">Критических нет</span>';

    let agendaHtml = '';
    for (let cName in contrDefects) {
        agendaHtml += `
            <div class="bg-white dark:bg-slate-800 rounded-xl p-3 mb-3 border border-[var(--card-border)] shadow-sm">
                <div class="text-[12px] font-black text-slate-800 dark:text-white mb-2 uppercase border-b border-slate-100 dark:border-slate-700 pb-1">👷‍♂️ ${cName}</div>
                <div class="space-y-3">
        `;

        // 1. Создаем корзины для группировки
        let b3List = [];
        let b2List = [];
        let skList = [];
        let carryList = [];
        let earliestSkDeadline = '';

        // 2. Раскладываем дефекты по корзинам (сортируем по частоте)
        contrDefects[cName].sort((a, b) => b.count - a.count).forEach(def => {
            if (def.isCarryOver) {
                carryList.push(`${def.name}`);
            } else if (def.isSk) {
                let cleanName = def.name.replace('[Официальное предписание СК] ', '');
                skList.push(`${cleanName}`);
                if (def.deadline) {
                    if (!earliestSkDeadline || new Date(def.deadline) < new Date(earliestSkDeadline)) {
                        earliestSkDeadline = def.deadline.split('T')[0];
                    }
                }
            } else if (def.isB3) {
                b3List.push(`${def.name} (${def.count} раз)`);
            } else {
                b2List.push(`${def.name} (${def.count} раз)`);
            }
        });

        // 3. Вспомогательная функция отрисовки одной сгруппированной строки
        const renderGroupRow = (groupTitle, itemsArray, borderCls, badgeHtml, defaultDeadline = '') => {
            if (itemsArray.length === 0) return '';

            // Текст для скрытого инпута (уйдет в ИИ)
            const fullText = groupTitle + ':\\n• ' + itemsArray.join('\\n• ');
            // HTML для вывода на экран (красивый маркированный список)
            const htmlText = `<ul class="list-disc pl-4 mt-1 space-y-0.5"><li>` + itemsArray.join('</li><li>') + `</li></ul>`;
            const defDeadline = defaultDeadline ? ` value="${defaultDeadline}"` : '';

            return `
                <div class="meeting-agenda-row border-l-2 ${borderCls} pl-2 py-1 relative">
                    <input type="hidden" class="agenda-meta-contr" value="${cName}">
                    <input type="hidden" class="agenda-meta-defect" value="${fullText.replace(/"/g, '&quot;')}">
                    
                    <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 leading-snug">
                        <div class="font-bold flex items-center gap-1.5">${badgeHtml} ${groupTitle}</div>
                        ${htmlText}
                    </div>
                    
                    <div class="flex flex-wrap gap-2 mt-2">
                        <label class="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 cursor-pointer active:scale-95 transition-transform">
                            <input type="checkbox" class="agenda-done-cb w-3.5 h-3.5 accent-green-600"> Решено
                        </label>
                        <input type="date" class="agenda-date input-base !py-1 !text-[10px] !w-auto flex-1 min-w-[90px]" ${defDeadline}>
                        <input type="text" class="agenda-resp input-base !py-1 !text-[10px] !w-auto flex-1 min-w-[90px]" placeholder="Ответственный...">
                    </div>
                    <textarea class="agenda-comment input-base mt-2 h-10 resize-none text-[10px]" placeholder="Что решили по этому блоку проблем..."></textarea>
                </div>
            `;
        };

        // 4. Отрисовываем корзины в строгом порядке
        agendaHtml += renderGroupRow('Критические аварии', b3List, 'border-red-500 bg-red-50 dark:bg-red-900/10', '<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">B3</span>');
        agendaHtml += renderGroupRow('Повторяющиеся нарушения', b2List, 'border-orange-500 bg-orange-50 dark:bg-orange-900/10', '<span class="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black">B2</span>');
        agendaHtml += renderGroupRow('Открытые предписания', skList, 'border-blue-500 bg-blue-50 dark:bg-blue-900/10', '<span class="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">ПК СК</span>', earliestSkDeadline);
        agendaHtml += renderGroupRow('Долги с прошлых планерок', carryList, 'border-purple-500 bg-purple-50 dark:bg-purple-900/10', '<span class="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black">ДОЛГ</span>');

        agendaHtml += `</div></div>`;
    }

    if (!agendaHtml) agendaHtml = `<div class="text-[11px] text-green-600 font-bold text-center py-4 bg-white rounded-xl border border-dashed border-[var(--card-border)]">Дефектов за ${periodText} не выявлено. Идеально!</div>`;

    const html = `
    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm relative animate-fadeIn overflow-hidden flex flex-col max-h-[85vh]">
        <!-- ШАПКА -->
        <div class="p-4 border-b border-[var(--card-border)] bg-[var(--hover-bg)] flex justify-between items-center shrink-0">
            <div>
                <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Meeting Workspace</div>
                <div class="font-black text-[14px] text-slate-800 dark:text-white uppercase">Планерка от ${d.toLocaleDateString('ru-RU')}</div>
            </div>
            <button onclick="rbi_renderMeetingTab()" class="text-slate-400 hover:text-red-500 active:scale-95 transition-colors font-black px-2 text-lg">✕</button>
        </div>
        
        <!-- ЕДИНАЯ КОЛОНКА (СВЕРХУ ИНФО, СНИЗУ ДЕФЕКТЫ) -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4">
            
            <!-- БЛОК АНАЛИТИКИ -->
            <div class="mb-5">
                <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2">📈 Статус Объекта (${periodText})</div>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] p-3 rounded-xl shadow-sm flex flex-col justify-center">
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Индекс Риска (ИКО)</div>
                        <div class="text-[20px] font-black leading-none ${ikoColor}">${iko}</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] p-3 rounded-xl shadow-sm flex flex-col justify-center">
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Аварий RBI (B3)</div>
                        <div class="text-[20px] font-black leading-none ${b3Count > 0 ? 'text-red-600' : 'text-green-600'}">${b3Count}</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] p-3 rounded-xl shadow-sm flex flex-col justify-center col-span-2 sm:col-span-1">
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Просрочено в ПК СК</div>
                        <div class="text-[20px] font-black leading-none text-red-600">${skOverdueCount}</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
                    <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 p-3 rounded-xl shadow-sm">
                        <div class="text-[10px] font-black text-red-600 dark:text-red-400 uppercase mb-2 tracking-widest">🚨 Зона риска (B3 или УрК < 70)</div>
                        <div>${badContrsHtml}</div>
                    </div>
                    <div class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 p-3 rounded-xl shadow-sm">
                        <div class="text-[10px] font-black text-green-600 dark:text-green-400 uppercase mb-2 tracking-widest">✅ Эталонное качество</div>
                        <div>${goodContrsHtml}</div>
                    </div>
                </div>
                
                ${defectPhotosHtml}
            </div>

            <!-- БЛОК РЕШЕНИЙ -->
            <div>
                <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2 flex items-center gap-2">📋 Повестка и Решения</div>
                <div class="text-[10px] text-slate-500 mb-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">Отмечайте решенные вопросы прямо на совещании. В конце нажмите кнопку внизу — нейросеть соберет их в готовый официальный протокол.</div>
                
                <div class="mb-4">
                    ${agendaHtml}
                </div>
                
                <div class="bg-[var(--hover-bg)] p-3 rounded-xl border border-[var(--card-border)] mb-4">
                    <label class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 block">Дополнительные тезисы / Разное</label>
                    <textarea id="rbi-meeting-notes" class="input-base h-24 resize-none text-[11px]" placeholder="Что еще обсудили на планерке, кроме указанных дефектов..."></textarea>
                </div>

                <div class="mb-4">
                    <button onclick="document.getElementById('meeting-photo-upload').click()" class="w-full bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-colors hover:border-slate-400">
                        📸 Прикрепить общее фото совещания
                    </button>
                    <div id="meeting-photo-preview" class="hidden mt-2 relative w-full h-40 sm:h-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div>
                </div>
            </div>

            <!-- РЕЗУЛЬТАТ / РУЧНОЙ ВВОД -->
            <div id="rbi-meeting-result" class="border-t border-[var(--card-border)] bg-[var(--hover-bg)] p-3 sm:p-4 rounded-xl mt-4 mb-2">
                <div class="flex justify-between items-center mb-2">
                    <div class="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Итоговый текст (Мемо)</div>
                    <button onclick="copyExpertText('btn-copy-memo', 'rbi-meeting-memo-text')" id="btn-copy-memo" class="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 px-2 py-1 rounded active:scale-95 transition-colors">📋 Копировать</button>
                </div>
                <textarea id="rbi-meeting-memo-text" class="w-full bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl p-3 text-[11px] outline-none resize-none text-slate-800 dark:text-slate-200 h-32 shadow-inner font-medium leading-relaxed custom-scrollbar transition-all" placeholder="Можно написать текст вручную или нажать кнопку ИИ внизу..."></textarea>
            </div>

        </div>

        <!-- ПОДВАЛ (КНОПКИ СОХРАНЕНИЯ И ИИ) -->
        <div id="meeting-footer-btn" class="p-3 sm:p-4 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/80 shrink-0 backdrop-blur-md z-10 flex gap-2">
            <button onclick="rbi_saveMeetingMemo()" class="flex-1 bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1.5">
                💾 Сохранить
            </button>
            <button onclick="rbi_generateMeetingMemo()" id="btn-gen-memo" class="flex-[1.5] bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span class="truncate">Собрать (ИИ)</span>
            </button>
        </div>
    </div>`;

    container.innerHTML = html;
};

window.rbi_handleMeetingPhotoUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("⚙️ Обработка фото...");
    compressImageToBase64(file, 1000, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'meet');
        const box = document.getElementById('meeting-photo-preview');
        box.dataset.photo = localUrl;
        box.classList.remove('hidden');

        // Ждем получения реальной ссылки-blob из памяти
        const realSrc = await PhotoManager.getAsyncUrl(localUrl) || window.getPhotoSrc(localUrl);

        box.innerHTML = `<img src="${realSrc}" class="w-full h-full object-cover"><div onclick="event.stopPropagation(); document.getElementById('meeting-photo-preview').dataset.photo=''; document.getElementById('meeting-photo-preview').classList.add('hidden');" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black shadow-md cursor-pointer">✕</div>`;
        event.target.value = '';
    });
};



// СОХРАНЕНИЕ ПРОТОКОЛА В ИСТОРИЮ (С ПОЛНОЙ ПОВЕСТКОЙ)
window.rbi_saveMeetingMemo = async function () {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return showToast("В демо-режиме сохранение отключено");
    let text = document.getElementById('rbi-meeting-memo-text').value.trim();
    if (!text) {
        text = "Протокол сохранен без генерации ИИ. Детали решений смотрите в блоке повестки.";
    }

    // Собираем повестку для сохранения
    let agendaData = [];
    const rows = document.querySelectorAll('.meeting-agenda-row');
    rows.forEach(row => {
        agendaData.push({
            contr: row.querySelector('.agenda-meta-contr').value,
            defect: row.querySelector('.agenda-meta-defect').value,
            isDone: row.querySelector('.agenda-done-cb').checked,
            date: row.querySelector('.agenda-date').value,
            resp: row.querySelector('.agenda-resp').value.trim(),
            comment: row.querySelector('.agenda-comment').value.trim()
        });
    });

    const extraNotes = document.getElementById('rbi-meeting-notes')?.value.trim() || '';
    const author = document.getElementById('inp-inspector')?.value.trim() || 'Инженер';

    const meet = {
        id: 'meet_' + Date.now().toString(36),
        date: new Date().toISOString(),
        author: author,
        title: `Совещание от ${new Date().toLocaleDateString('ru-RU')}`,
        memoText: text,
        agenda: agendaData,
        notes: extraNotes,
        qDayPhoto: document.getElementById('meeting-photo-preview')?.dataset?.photo || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    window.rbi_meetingsData.push(meet);
    await dbPut(STORES.MEETINGS, meet);
    // ОЧЕРЕДЬ
    if (window.SyncQueueManager && !isDemoMode) {
        window.SyncQueueManager.enqueue('SAVE_MEETING', meet);
    }

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof gameLogAction === 'function') gameLogAction('meeting_memo_created', meet.id);
    if (typeof triggerSync === 'function') triggerSync('silent');

    // ЗАКРЫТИЕ ПРИВЯЗАННЫХ ЗАДАЧ СОВЕЩАНИЯ
    if (typeof window.rbi_tasksData !== 'undefined') {
        // 1. Закрываем по activeTaskId, если перешли по кнопке из задачи (например, разбор критического брака)
        if (window.activeTaskId) {
            const task = window.rbi_tasksData.find(t => t.id === window.activeTaskId);
            if (task) {
                task.status = 'done';
                task.resultComment = 'Протокол сформирован';
                task.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') await dbPut(STORES.TASKS, task);
            }
            window.activeTaskId = null;
        }

        // 2. Дополнительно: закрываем Еженедельное совещание или Анализ СК независимо от пути входа
        const autoTasks = window.rbi_tasksData.filter(t =>
            t.status === 'pending' &&
            (t.title === 'Еженедельный разбор качества' || t.taskType === 'Аналитика СК')
        );
        for (let t of autoTasks) {
            t.status = 'done';
            t.resultComment = 'Протокол сформирован';
            t.updatedAt = new Date().toISOString();
            if (typeof dbPut === 'function') await dbPut(STORES.TASKS, t);
        }
    }
    showToast("💾 Протокол сохранен в архив!");
    rbi_renderMeetingTab();
};



/* ============================================================================ */
/* RBI NEW: МОДУЛЬ ВОЗДЕЙСТВИЙ И IMPACT SCORE                                   */
/* ============================================================================ */

window.rbi_interventionsData = [];

// Дополняем загрузчик баз (переопределяем его с добавлением нового стора)
// --- ЗАГРУЗКА БАЗЫ ---
// --- ЗАГРУЗКА БАЗЫ ---
window.rbi_meetingsData = [];
window.rbi_fmeaRecords = []; // Локальный массив для FMEA

window.rbi_loadData = async function () {
    try {
        const scheduleObj = await dbGetAll(STORES.SCHEDULE);
        if (scheduleObj) window.rbi_scheduleData = scheduleObj;

        const tasksObj = await dbGetAll(STORES.TASKS);
        if (tasksObj) window.rbi_tasksData = tasksObj.filter(t => !t._deleted);

        const intObj = await dbGetAll(STORES.INTERVENTIONS);
        if (intObj) window.rbi_interventionsData = intObj;

        const meetObj = await dbGetAll(STORES.MEETINGS);
        if (meetObj) window.rbi_meetingsData = meetObj;

        const fmeaObj = await dbGetAll(STORES.FMEA);
        if (fmeaObj) window.rbi_fmeaRecords = fmeaObj;
    } catch (e) { console.error("Ошибка загрузки баз Инженера", e); }
};

window.rbi_openInterventionModal = function () {
    const cSelect = document.getElementById('rbi-int-contractor');
    if (!cSelect) return;

    // Собираем подрядчиков, которых реально проверял текущий инспектор
    const myName = document.getElementById('inp-inspector')?.value.trim();
    const myChecks = contractorArray.filter(c => c.inspectorName === myName);

    if (myChecks.length === 0) {
        return showToast("⚠️ Сначала проведите хотя бы одну проверку!");
    }

    const uniqueContrs = [...new Set(myChecks.map(c => c.contractorName).filter(Boolean))].sort();

    cSelect.innerHTML = uniqueContrs.map(c => `<option value="${c.replace(/"/g, '&quot;')}">${c}</option>`).join('');

    // Сбрасываем поля
    document.getElementById('rbi-int-comment').value = '';
    rbi_updateInterventionTemplates(); // Обновляем зависимый селектор видов работ

    document.getElementById('rbi-intervention-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.rbi_closeInterventionModal = function () {
    document.getElementById('rbi-intervention-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
};

// Динамическое обновление списка Видов Работ в зависимости от выбранного подрядчика
window.rbi_updateInterventionTemplates = function () {
    const cName = document.getElementById('rbi-int-contractor').value;
    const tSelect = document.getElementById('rbi-int-template');

    const myName = document.getElementById('inp-inspector')?.value.trim();
    const myChecks = contractorArray.filter(c => c.inspectorName === myName && c.contractorName === cName);

    // Собираем уникальные виды работ (templateKey -> templateTitle)
    const templatesMap = {};
    myChecks.forEach(c => {
        if (!templatesMap[c.templateKey]) templatesMap[c.templateKey] = c.templateTitle;
    });

    tSelect.innerHTML = Object.keys(templatesMap).map(key => `<option value="${key}">${templatesMap[key]}</option>`).join('');
};

window.rbi_saveIntervention = async function () {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return showToast("В демо-режиме сохранение отключено");
    const cName = document.getElementById('rbi-int-contractor').value;
    const tKey = document.getElementById('rbi-int-template').value;
    const typeSelect = document.getElementById('rbi-int-type');
    const typeText = typeSelect.options[typeSelect.selectedIndex].text.split(' [')[0];
    const typeCoef = parseFloat(typeSelect.value);
    const comment = document.getElementById('rbi-int-comment').value.trim();

    if (!cName || !tKey) return showToast("⚠️ Выберите подрядчика и вид работ");

    // Фиксируем УрК подрядчика НА МОМЕНТ воздействия (чтобы было с чем сравнивать потом)
    const myName = document.getElementById('inp-inspector')?.value.trim();
    const pastChecks = contractorArray.filter(c => c.inspectorName === myName && c.contractorName === cName && c.templateKey === tKey).sort((a, b) => new Date(b.date) - new Date(a.date));

    let baseUrkC = 0;
    if (pastChecks.length >= 3) {
        const m = getContractorMetrics(pastChecks, userTemplates);
        if (m) baseUrkC = m.finalC;
    }

    const item = {
        id: 'int_' + Date.now().toString(36),
        date: new Date().toISOString(),
        inspector: myName,
        contractor: cName,
        templateKey: tKey,
        templateTitle: pastChecks[0]?.templateTitle || 'Вид работ',
        typeText: typeText,
        typeCoef: typeCoef,
        comment: comment,
        baseUrk: baseUrkC,
        finalImpact: null,
        deltaUrk: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    window.rbi_interventionsData.push(item);
    await dbPut(STORES.INTERVENTIONS, item);
    // ОЧЕРЕДЬ
    if (window.SyncQueueManager && !isDemoMode) {
        window.SyncQueueManager.enqueue('SAVE_INTERVENTION', item);
    }

    if (typeof gameLogAction === 'function') gameLogAction('intervention_logged', item.id);

    showToast("✅ Воздействие зафиксировано! Мониторинг запущен.");
    rbi_closeInterventionModal();
    rbi_renderImpactTab();

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

// ==========================================
// ВКЛАДКА ЭФФЕКТИВНОСТЬ (С РЕЕСТРОМ ЭТАЛОНОВ)
// ==========================================
window.rbi_renderImpactTab = function () {
    const container = document.getElementById('rbi-impact-dashboard');
    if (!container) return;

    // ИСПРАВЛЕНИЕ: Гарантируем, что профиль рассчитан, даже если мы не заходили на вкладку
    if (!window.currentProfileData || !window.currentProfileData.rawChecks) {
        const profiles = gameCalculateAllProfiles();
        const currentInspector = document.getElementById('inp-inspector')?.value.trim() || appSettings.engineerName || 'Неизвестный инспектор';
        window.currentProfileData = profiles[currentInspector] || { name: currentInspector, pi: 0, rawChecks: [] };
    }

    const myProfile = window.currentProfileData;
    if (!myProfile) return container.innerHTML = '<div class="text-center text-slate-500 py-4">Профиль загружается...</div>';

    container.innerHTML = `<div class="flex flex-col items-center justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div><div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Анализ эффективности...</div></div>`;

    setTimeout(() => {
        try {
            let twiCount = 0; let pracCount = 0; let meetCount = 0; let etalonCount = 0;
            const rawChecks = myProfile.rawChecks || [];

            if (typeof gameActionLogs !== 'undefined') {
                gameActionLogs.forEach(l => {
                    if (l.inspector !== myProfile.name) return;
                    if (l.action === 'create_twi' || l.action === 'magic_creator') twiCount++;
                    if (l.action === 'etalon_accepted' || l.action === 'chron_ideal') etalonCount++;
                    if (l.action === 'meeting_memo_created') meetCount++;
                    if (l.action === 'practice_created' || l.action === 'practice_published') pracCount++;
                });
            }

            let totalScore = 0; let impactCount = 0;
            let positiveCount = 0; let negativeCount = 0; let neutralCount = 0;

            const contractorsSet = new Set(rawChecks.map(c => c.contractorName));
            contractorsSet.forEach(cName => {
                const cChecks = rawChecks.filter(c => c.contractorName === cName);
                if (cChecks.length < 6) return;

                const templatesCount = {}; cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey] || 0) + 1);
                const topTemplate = Object.keys(templatesCount).sort((a, b) => templatesCount[b] - templatesCount[a])[0];
                const impact = calculateImpactScore(myProfile.name, cName, topTemplate);

                if (impact && (impact.score !== 0 || impact.trend !== 'Недостаточно данных')) {
                    totalScore += impact.score; impactCount++;
                    if (impact.score > 0.2) positiveCount++;
                    else if (impact.score < -0.2) negativeCount++;
                    else neutralCount++;
                }
            });

            const avgImpact = impactCount > 0 ? (totalScore / impactCount) : 0;
            let impactColor = avgImpact > 0.2 ? 'text-green-500' : (avgImpact < -0.2 ? 'text-red-500' : 'text-slate-400');


            let html = `
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 animate-fadeIn">
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center shadow-sm">
                        <div class="text-[20px] sm:text-[24px] font-black text-indigo-600 dark:text-indigo-400 leading-none mb-1">${twiCount}</div>
                        <div class="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest">TWI-сессии</div>
                    </div>
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center shadow-sm">
                        <div class="text-[20px] sm:text-[24px] font-black text-orange-500 leading-none mb-1">${meetCount}</div>
                        <div class="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest">Совещания</div>
                    </div>
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center shadow-sm">
                        <div class="text-[20px] sm:text-[24px] font-black text-blue-500 leading-none mb-1">${etalonCount}</div>
                        <div class="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest">Эталоны (ОК)</div>
                    </div>
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center shadow-sm">
                        <div class="text-[20px] sm:text-[24px] font-black text-yellow-500 leading-none mb-1">${pracCount}</div>
                        <div class="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest">Практики</div>
                    </div>
                </div>

                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm mb-4 flex flex-col md:flex-row items-center gap-6 animate-fadeIn">
                    <div class="w-full md:w-1/2 relative h-48 flex items-center justify-center">
                        <canvas id="impact-map-chart"></canvas>
                        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                            <div class="text-[28px] font-black ${impactColor} leading-none">${avgImpact > 0 ? '+' : ''}${avgImpact.toFixed(1)}</div>
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Impact Score</div>
                        </div>
                    </div>
                    <div class="w-full md:w-1/2 space-y-3 w-full">
                        <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase mb-2 border-b border-[var(--card-border)] pb-2">Влияние на подрядчиков</div>
                        <div class="flex justify-between items-center bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50">
                            <span class="text-[11px] font-bold text-green-700 dark:text-green-400">Улучшили качество</span>
                            <span class="text-[14px] font-black text-green-600">${positiveCount}</span>
                        </div>
                        <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">Без изменений</span>
                            <span class="text-[14px] font-black text-slate-500">${neutralCount}</span>
                        </div>
                        <div class="flex justify-between items-center bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-800/50">
                            <span class="text-[11px] font-bold text-red-700 dark:text-red-400">Ухудшили качество</span>
                            <span class="text-[14px] font-black text-red-600">${negativeCount}</span>
                        </div>
                    </div>
                </div>

            `;

            container.innerHTML = html;

            setTimeout(() => {
                const ctx = document.getElementById('impact-map-chart');
                if (ctx) {
                    if (window.impactChartInstance) window.impactChartInstance.destroy();
                    let dataArr = [positiveCount, neutralCount, negativeCount];
                    if (positiveCount === 0 && neutralCount === 0 && negativeCount === 0) dataArr = [0, 1, 0];
                    window.impactChartInstance = new Chart(ctx, {
                        type: 'doughnut',
                        data: { labels: ['Улучшили', 'Без изменений', 'Ухудшили'], datasets: [{ data: dataArr, backgroundColor: ['#22c55e', '#cbd5e1', '#ef4444'], borderWidth: 0, cutout: '75%' }] },
                        options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                }
            }, 100);

        } catch (e) {
            console.error("Ошибка в рендере Impact", e);
            container.innerHTML = `<div class="text-center text-red-500 font-bold p-6 bg-red-50 rounded-xl border border-red-200">❌ Ошибка расчета эффективности. ${e.message}</div>`;
        }
    }, 100);
};

/* ============================================================================ */
/* RBI NEW: МОДУЛЬ «ПРАКТИКИ» (БЛОК J)                                          */
/* ============================================================================ */

window.rbi_practicesData = [];

window.rbi_loadPractices = async function () {
    try {
        const stored = await dbGetAll(STORES.PRACTICES);
        if (stored) window.rbi_practicesData = stored;

        // Нужно подгрузить интервенции для детектора
        if (window.rbi_interventionsData.length === 0) {
            const intObj = await dbGetAll(STORES.INTERVENTIONS);
            if (intObj) window.rbi_interventionsData = intObj;
        }
    } catch (e) { console.error("Ошибка загрузки практик", e); }
};

// Глобальные фильтры для новой объединенной вкладки
window.kbShowPractices = true;
window.kbShowEtalons = true;

window.rbi_renderPracticesTab = async function () {
    const detectorContainer = document.getElementById('practices-auto-detector');
    const listContainer = document.getElementById('practices-list-container');
    if (!detectorContainer || !listContainer) return;

    const titleContainer = listContainer.previousElementSibling;
    if (titleContainer) {
        titleContainer.className = "sticky-top-panel bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 mx-1 mt-2 z-40";

        titleContainer.innerHTML = `
            <div class="flex justify-between items-center mb-3 border-b border-[var(--card-border)] pb-2">
                <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path></svg>
                    Библиотека Практик и Эталоны
                </h2>
                <button onclick="rbi_openKbCreateChoice()" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1 transition-transform">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Создать
                </button>
            </div>
            
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <label class="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest active:scale-95">
                        <input type="checkbox" class="w-4 h-4 accent-indigo-600 rounded" ${window.kbShowPractices ? 'checked' : ''} onchange="window.kbShowPractices=this.checked; rbi_renderPracticesTab()"> Практики
                    </label>
                    <label class="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest active:scale-95">
                        <input type="checkbox" class="w-4 h-4 accent-indigo-600 rounded" ${window.kbShowEtalons ? 'checked' : ''} onchange="window.kbShowEtalons=this.checked; rbi_renderPracticesTab()"> Эталоны
                    </label>
                </div>
                <div class="flex justify-between items-center">
                    <label class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                        <span class="text-[10px] font-black uppercase tracking-widest ${window.practiceOwnerFilter === 'MY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">Только мои</span>
                        <div class="relative">
                            <input type="checkbox" class="sr-only peer" onchange="window.practiceOwnerFilter = this.checked ? 'MY' : 'ALL'; rbi_renderPracticesTab()" ${window.practiceOwnerFilter === 'MY' ? 'checked' : ''}>
                            <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                        </div>
                    </label>
                    <button onclick="downloadMissingCloudFiles()" class="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m0 0l-3-3m3 3l3-3"></path></svg> Скачать
                    </button>
                </div>
            </div>
        `;
    }

    const myName = document.getElementById('inp-inspector')?.value.trim();
    const currentEngineer = appSettings.engineerName || 'Инженер';

    // 1. АВТОДЕТЕКТОР УСПЕХА (Для Практик)
    let detectorHtml = '';
    const successfulInterventions = window.rbi_interventionsData.filter(intItem => {
        if (intItem.inspector !== myName) return false;
        if (!intItem.deltaUrk || intItem.deltaUrk < 10) return false;
        return !window.rbi_practicesData.find(p => p.interventionId === intItem.id && !p._deleted);
    });

    if (successfulInterventions.length > 0) {
        const item = successfulInterventions[0];
        detectorHtml = `
            <div class="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl p-4 shadow-lg text-white mb-6 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 opacity-20 text-8xl">🏆</div>
                <div class="relative z-10">
                    <div class="text-[10px] font-black uppercase tracking-widest mb-1 opacity-90 flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Автодетектор Успеха</div>
                    <div class="text-[14px] font-bold leading-snug mb-3">Потрясающий результат! Качество подрядчика <b>${item.contractor}</b> по виду <b>${item.templateTitle}</b> выросло на <b class="text-yellow-100">+${item.deltaUrk}%</b> после вашей работы.</div>
                    <button onclick="rbi_openCreatePracticeModal('${item.id}')" class="bg-white text-yellow-700 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 shadow-sm transition-transform">Кристаллизовать опыт (+120 XP)</button>
                </div>
            </div>`;
    }
    detectorContainer.innerHTML = detectorHtml;

    // 2. СБОР И СОРТИРОВКА ДАННЫХ (Практики + Эталоны)
    let mixedData = [];

    if (window.kbShowPractices) {
        const pracs = [...window.rbi_practicesData].filter(p => !p._deleted && p.title && (window.practiceOwnerFilter === 'ALL' || p.author === currentEngineer));
        for (let p of pracs) {
            p._uiType = 'practice';
            p._realAfter = p.photoAfter ? await PhotoManager.getAsyncUrl(p.photoAfter) || window.getPhotoSrc(p.photoAfter) : null;
            p._realBefore = p.photoBefore ? await PhotoManager.getAsyncUrl(p.photoBefore) || window.getPhotoSrc(p.photoBefore) : null;
            mixedData.push(p);
        }
    }

    if (window.kbShowEtalons) {
        const etals = [...(typeof etalonActsArray !== 'undefined' ? etalonActsArray : [])].filter(e => !e._deleted && (window.practiceOwnerFilter === 'ALL' || e.owner === currentEngineer || e.inspectorName === currentEngineer));
        for (let e of etals) {
            e._uiType = 'etalon';
            // Достаем первое фото эталона для обложки
            e._previewImg = null;
            if (e.details && e.details.elements && e.details.elements.length > 0) {
                const photo = e.details.elements[0].photo;
                if (photo) e._previewImg = await PhotoManager.getAsyncUrl(photo) || window.getPhotoSrc(photo);
            }
            mixedData.push(e);
        }
    }

    mixedData.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    if (mixedData.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">В библиотеке пока пусто</div>`;
        return;
    }

    // 3. РЕНДЕР КАРТОЧЕК
    listContainer.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">` + mixedData.map(item => {

        if (item._uiType === 'practice') {
            const previewImg = item._realAfter || item._realBefore;
            const previewHtml = previewImg ? `<img src="${previewImg}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg></div>`;
            const isOwner = item.author === currentEngineer;
            const pubStatus = item.isPublished ? 'published' : 'draft';

            return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="rbi_openPracticeViewer('${item.id}')">
                <div class="h-28 sm:h-32 border-b border-[var(--card-border)] relative">
                    ${previewHtml}
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${item.id}', 'practice', '${item.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${isOwner}, '${pubStatus}')" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                    ${!item.isPublished ? `<div class="absolute bottom-2 left-2 bg-yellow-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-md">Черновик</div>` : ''}
                </div>
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[8px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border border-indigo-100 dark:border-indigo-800 truncate max-w-full">Практика: ${item.templateTitle}</div>
                    <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">${item.title}</div>
                    <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2"><svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ${item.author.split(' ')[0]}</div>
                        ${item.deltaUrk > 0 ? `<div class="text-[10px] font-black text-green-600">+${item.deltaUrk}%</div>` : `<div class="text-[10px] font-black text-indigo-500">Ручная</div>`}
                    </div>
                </div>
            </div>`;
        }

        else if (item._uiType === 'etalon') {
            const previewHtml = item._previewImg ? `<img src="${item._previewImg}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex flex-col items-center justify-center text-blue-400 bg-blue-50 dark:bg-blue-900/20"><svg class="w-8 h-8 opacity-50 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>`;
            const isOwner = item.inspectorName === currentEngineer;

            return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openEtalonViewer('${item.id}')">
                <div class="h-28 sm:h-32 border-b border-[var(--card-border)] relative">
                    ${previewHtml}
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${item.id}', 'etalon', '${item.contractorName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                </div>
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[8px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border border-blue-100 dark:border-blue-800 truncate max-w-full">Эталон: ${item.templateTitle}</div>
                    
                    <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-1">${item.projectName || 'Без проекта'}</div>
                    <div class="text-[10px] font-medium text-slate-500 truncate mb-2">👤 ${item.contractorName}</div>
                    
                    <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                            <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            ${item.inspectorName ? item.inspectorName.split(' ')[0] : 'Инженер'}
                        </div>
                        <div class="text-[9px] font-black text-slate-400">${new Date(item.date).toLocaleDateString('ru-RU')}</div>
                    </div>
                </div>
            </div>`;
        }
    }).join('') + `</div>`;
};

// Вспомогательная модалка выбора "Что создать?"
window.rbi_openKbCreateChoice = function () {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Добавить в библиотеку</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="space-y-3 mb-2">
            <button onclick="closeModal(); rbi_openManualPracticeModal()" class="w-full text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform shadow-sm">
                <div class="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg></div>
                <div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Лучшая Практика</div>
                    <div class="text-[10px] text-slate-500 font-bold mt-0.5">Поделиться решением проблемы</div>
                </div>
            </button>
            <button onclick="closeModal(); openEtalonConstructor('', '', '', '', '')" class="w-full text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform shadow-sm">
                <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>
                <div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Акт-Эталон</div>
                    <div class="text-[10px] text-slate-500 font-bold mt-0.5">Зафиксировать идеальный образец СМР</div>
                </div>
            </button>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

window.rbi_openCreatePracticeModal = function (intId) {
    const intItem = window.rbi_interventionsData.find(i => i.id === intId);
    if (!intItem) return;

    document.getElementById('rbi-prac-int-id').value = intId;
    document.getElementById('rbi-prac-delta').innerText = `+${intItem.deltaUrk}%`;
    document.getElementById('rbi-prac-title').value = '';

    // Автогенерация черновика
    document.getElementById('rbi-prac-problem').value = `Системное снижение качества (УрК = ${intItem.baseUrk}%). Подрядчик: ${intItem.contractor}.`;
    document.getElementById('rbi-prac-solution').value = `Инструмент: ${intItem.typeText}.\nДействия: ${intItem.comment || 'Проведена работа с персоналом.'}`;

    // Сброс фото
    document.getElementById('rbi-prac-photo-before').value = '';
    document.getElementById('rbi-prac-photo-after').value = '';
    document.getElementById('rbi-prac-btn-before').innerHTML = '➕ Фото (Опционально)';
    document.getElementById('rbi-prac-btn-after').innerHTML = '➕ Фото (Опционально)';
    document.getElementById('rbi-prac-btn-before').dataset.base64 = '';
    document.getElementById('rbi-prac-btn-after').dataset.base64 = '';

    document.getElementById('rbi-practice-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.rbi_closePracticeModal = function () {
    document.getElementById('rbi-practice-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
};

window.rbi_handlePracticePhoto = function (event, type) {
    const file = event.target.files[0];
    if (!file) return;
    compressImageToBase64(file, 800, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'prac');
        const btn = document.getElementById(`rbi-prac-btn-${type}`);
        btn.dataset.base64 = localUrl;
        btn.innerHTML = `<img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-cover">`;
    });
};



window.rbi_savePractice = async function () {
    const title = document.getElementById('rbi-prac-title').value.trim();
    if (!title) return showToast("⚠️ Введите Название Практики!");

    const intId = document.getElementById('rbi-prac-int-id').value;
    const intItem = window.rbi_interventionsData.find(i => i.id === intId);

    const practice = {
        id: 'prac_' + Date.now().toString(36),
        interventionId: intId,
        date: new Date().toISOString(),
        author: document.getElementById('inp-inspector')?.value.trim() || 'Инженер',
        owner: document.getElementById('inp-inspector')?.value.trim() || 'Инженер', // <-- ДОБАВЛЕНО ДЛЯ СИНХРОНИЗАЦИИ
        title: title,
        templateKey: intItem.templateKey,
        templateTitle: intItem.templateTitle,
        deltaUrk: intItem.deltaUrk,
        problem: document.getElementById('rbi-prac-problem').value.trim(),
        solution: document.getElementById('rbi-prac-solution').value.trim(),
        photoBefore: document.getElementById('rbi-prac-btn-before').dataset.base64 || null,
        photoAfter: document.getElementById('rbi-prac-btn-after').dataset.base64 || null,
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    window.rbi_practicesData.push(practice);
    await dbPut(STORES.PRACTICES, practice);
    // ОЧЕРЕДЬ
    if (window.SyncQueueManager && !isDemoMode) {
        window.SyncQueueManager.enqueue('SAVE_PRACTICE', practice);
    }

    if (typeof gameLogAction === 'function') gameLogAction('practice_created', practice.id);

    showToast("🏆 Практика кристаллизована! Начислено +120 XP.");
    rbi_closePracticeModal();
    rbi_renderPracticesTab();

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

window.rbi_publishPractice = async function (id) {
    if (!rbi_requireKnowledgeEditRight()) return;
    const pIndex = window.rbi_practicesData.findIndex(p => p.id === id);
    if (pIndex === -1) return;

    if (window.isSyncEnabled && !window.isSyncEnabled()) {
        return showToast("⚠️ Для публикации включите синхронизацию с облаком в Настройках.");
    }

    window.rbi_practicesData[pIndex].isPublished = true;
    window.rbi_practicesData[pIndex].updatedAt = new Date().toISOString();

    await dbPut(STORES.PRACTICES, window.rbi_practicesData[pIndex]);

    if (typeof gameLogAction === 'function') gameLogAction('practice_published', id);

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    showToast("📤 Практика отправлена в компанию! Начислено +50 XP.");
    rbi_renderPracticesTab();
};

window.rbi_deletePractice = async function (id) {
    const pIndex = window.rbi_practicesData.findIndex(p => p.id === id);
    if (pIndex !== -1 && !rbi_canDeleteKnowledgeItem(window.rbi_practicesData[pIndex].author)) {
        return showToast("⚠️ Инженер может удалить только свою практику. Чужие материалы удаляют заместитель или администратор.");
    }

    if (!confirm("Вы уверены, что хотите удалить эту практику? Она удалится у всей команды.")) return;
    if (pIndex === -1) return;

    // Мягкое удаление с правильными флагами для облака
    window.rbi_practicesData[pIndex]._deleted = true;
    window.rbi_practicesData[pIndex].is_deleted = true; // <-- ЖЕСТКИЙ ФЛАГ
    window.rbi_practicesData[pIndex].updatedAt = new Date().toISOString();
    window.rbi_practicesData[pIndex].updated_at = window.rbi_practicesData[pIndex].updatedAt;
    
    window.rbi_practicesData[pIndex].source = 'local';
    window.rbi_practicesData[pIndex].syncStatus = 'not_synced';
    window.rbi_practicesData[pIndex].sync_status = 'not_synced';
    window.rbi_practicesData[pIndex].syncBlockReason = '';
    window.rbi_practicesData[pIndex].sync_block_reason = '';

    await dbPut(STORES.PRACTICES, window.rbi_practicesData[pIndex]);

    // Даем команду облаку
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    showToast("🗑️ Практика успешно удалена.");
    rbi_renderPracticesTab();
};
window.currentPracticePhotosMulti = { before: [], process: [], after: [] };
window.currentPracticeDocs = []; 

window.rbi_openManualPracticeModal = function () {
    document.getElementById('man-prac-title').value = '';
    document.getElementById('man-prac-problem').value = '';
    document.getElementById('man-prac-solution').value = '';
    
    document.getElementById('man-prac-project').value = document.getElementById('inp-project')?.value || '';
    document.getElementById('man-prac-contractor').value = document.getElementById('inp-contractor')?.value || '';
    document.getElementById('man-prac-work').value = document.getElementById('current-checklist-label')?.innerText || '';
    document.getElementById('man-prac-dates').value = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    
    // Сброс всех массивов
    window.currentPracticePhotosMulti = { before: [], process: [], after: [] };
    window.currentPracticeDocs = [];
    
    window.rbi_renderPracPhotosUI();
    window.renderPracticeDocsUI();

    document.getElementById('manual-practice-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.rbi_closeManualPracticeModal = function () {
    document.getElementById('manual-practice-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
};

// Загрузка фото в массивы
window.rbi_handlePracPhotoMulti = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const type = window.currentPracPhotoType;
    compressImageToBase64(file, 1000, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'prac_img');
        window.currentPracticePhotosMulti[type].push(localUrl);
        window.rbi_renderPracPhotosUI();
        event.target.value = '';
    });
};

// Отрисовка миниатюр фото
window.rbi_renderPracPhotosUI = function() {
    ['before', 'process', 'after'].forEach(type => {
        const list = document.getElementById(`prac-photos-${type}-list`);
        if(list) {
            list.innerHTML = window.currentPracticePhotosMulti[type].map((url, i) => `
                <div class="relative w-full h-16 rounded overflow-hidden border border-slate-200">
                    <img src="${window.getPhotoSrc(url)}" class="w-full h-full object-cover cursor-pointer" onclick="openPhotoViewer('${url}')">
                    <button onclick="window.currentPracticePhotosMulti['${type}'].splice(${i}, 1); window.rbi_renderPracPhotosUI()" class="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md">✕</button>
                </div>
            `).join('');
        }
    });
};

// Загрузка PDF с описаниями
window.rbi_handlePracDocMulti = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { event.target.value = ''; return showToast("PDF слишком большой! Максимум 5 МБ."); }
    
    showToast("⚙️ Прикрепляю PDF...");
    const reader = new FileReader();
    reader.onload = async (e) => {
        const localUrl = await PhotoManager.saveLocal(e.target.result, 'prac_pdf');
        window.currentPracticeDocs.push({ url: localUrl, name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + ' MB', desc: '' });
        window.renderPracticeDocsUI();
        event.target.value = '';
    };
    reader.readAsDataURL(file);
};

window.renderPracticeDocsUI = function() {
    const list = document.getElementById('prac-docs-list');
    if (!list) return;
    list.innerHTML = window.currentPracticeDocs.map((doc, i) => `
        <div class="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2 min-w-0 pr-2">
                    <div class="text-red-500 font-black text-xs">PDF</div>
                    <div class="min-w-0"><div class="text-[10px] font-bold text-slate-800 dark:text-white truncate">${doc.name}</div></div>
                </div>
                <button onclick="window.currentPracticeDocs.splice(${i}, 1); window.renderPracticeDocsUI()" class="text-red-500 font-black px-2 active:scale-90 shrink-0">✕</button>
            </div>
            <input type="text" class="input-base text-[10px] !py-1 w-full" placeholder="Краткое описание документа..." value="${doc.desc || ''}" onchange="window.currentPracticeDocs[${i}].desc = this.value">
        </div>
    `).join('');
};

window.rbi_saveManualPractice = async function () {
    const title = document.getElementById('man-prac-title').value.trim();
    if (!title) return showToast("⚠️ Введите Название Практики!");

    // Сохраняем в новую структуру массивов
    const practice = {
        id: 'prac_' + Date.now().toString(36),
        interventionId: null,
        date: new Date().toISOString(),
        author: document.getElementById('inp-inspector')?.value.trim() || 'Инженер',
        owner: document.getElementById('inp-inspector')?.value.trim() || 'Инженер',
        title: title,
        projectName: document.getElementById('man-prac-project').value.trim(),
        contractorName: document.getElementById('man-prac-contractor').value.trim(),
        templateTitle: document.getElementById('man-prac-work').value.trim() || 'Ручной опыт',
        periodDates: document.getElementById('man-prac-dates').value.trim(),
        deltaUrk: 0,
        problem: document.getElementById('man-prac-problem').value.trim(),
        solution: document.getElementById('man-prac-solution').value.trim(),
        
        // Новые массивы
        photosBefore: window.currentPracticePhotosMulti.before,
        photosProcess: window.currentPracticePhotosMulti.process,
        photosAfter: window.currentPracticePhotosMulti.after,
        docs: window.currentPracticeDocs, 
        
        // Для обратной совместимости старого вьювера, отдаем туда первые картинки из массивов
        photoBefore: window.currentPracticePhotosMulti.before[0] || null,
        photoProcess: window.currentPracticePhotosMulti.process[0] || null,
        photoAfter: window.currentPracticePhotosMulti.after[0] || null,

        isPublished: true,
        source: 'local',
        sync_status: 'not_synced',
        syncStatus: 'not_synced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    window.rbi_practicesData.unshift(practice);
    await dbPut(STORES.PRACTICES, practice);
    if (typeof gameLogAction === 'function') gameLogAction('practice_published', practice.id);

    showToast("📚 Практика сохранена и опубликована!");
    rbi_closeManualPracticeModal();
    rbi_renderPracticesTab();
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

window.rbi_openPracticeViewer = async function (id) {
    const p = window.rbi_practicesData.find(x => x.id === id);
    if (!p) return;

    // Генерируем 3 фото (если они есть)
    const buildImg = async (src, label, colorCls) => {
        if (!src) return '';
        const realSrc = await PhotoManager.getAsyncUrl(src) || window.getPhotoSrc(src);
        return `
        <div class="flex flex-col items-center w-full">
            <div class="text-[9px] font-black uppercase tracking-widest mb-1 ${colorCls}">${label}</div>
            <img src="${realSrc}" class="w-full h-32 sm:h-40 object-cover bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 transition-transform shadow-sm" onclick="openPhotoViewer('${src}')">
        </div>`;
    };

    const imgBefore = await buildImg(p.photoBefore, 'Проблема (Было)', 'text-red-500');
    const imgProcess = await buildImg(p.photoProcess, 'Процесс', 'text-orange-500');
    const imgAfter = await buildImg(p.photoAfter, 'Результат (Стало)', 'text-green-600');

    // Генерируем список PDF-документов
    let docsHtml = '';
    if (p.docs && p.docs.length > 0) {
        docsHtml = `<div class="mt-4"><div class="text-[10px] font-black uppercase text-slate-500 mb-2 pl-1 border-b border-slate-200 pb-1">Приложенные документы</div>` + 
        p.docs.map(doc => `
            <div class="mb-2 p-3 bg-red-50 border border-red-200 rounded-xl flex justify-between items-center cursor-pointer active:scale-95" onclick="window.openFakePdfViewer('${doc.url}', '${doc.name}')">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black shadow-sm text-[10px]">PDF</div>
                    <div class="min-w-0 pr-2"><div class="text-[11px] font-bold text-slate-800 truncate">${doc.name}</div></div>
                </div>
                <span class="text-[9px] font-bold text-red-600 bg-white px-2 py-1 rounded shadow-sm border border-red-200">Открыть</span>
            </div>
        `).join('') + `</div>`;
    }

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full">
            <span class="text-[14px] uppercase font-black text-slate-800 dark:text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Библиотека практик
            </span>
            <button onclick="closeModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg">✕</button>
        </div>
    `;

    document.getElementById('modal-body').innerHTML = `
        <div class="text-center mb-4 border-b border-[var(--card-border)] pb-3">
            <div class="text-[14px] font-black text-slate-800 dark:text-white uppercase leading-tight mb-2">${p.title}</div>
            <div class="flex flex-wrap justify-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                <span class="bg-[var(--hover-bg)] px-2 py-1 rounded border border-[var(--card-border)]">${p.projectName || 'Объект не указан'}</span>
                <span class="bg-[var(--hover-bg)] px-2 py-1 rounded border border-[var(--card-border)]">${p.contractorName || 'Организация'}</span>
                <span class="bg-[var(--hover-bg)] px-2 py-1 rounded border border-[var(--card-border)]">${p.periodDates || new Date(p.date).toLocaleDateString('ru-RU')}</span>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-3 mb-4">
            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-200 dark:border-slate-700 pb-1">
                    Суть проблемы
                </div>
                <div class="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">${p.problem}</div>
            </div>
            
            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-200 dark:border-slate-700 pb-1">
                    Принятое решение
                </div>
                <div class="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">${p.solution}</div>
            </div>
        </div>
        
        <div class="grid grid-cols-3 gap-2 mb-2">
            ${imgBefore}${imgProcess}${imgAfter}
        </div>
        
        ${docsHtml}

        <div class="flex gap-2 w-full mt-4">
            <button onclick="closeModal(); rbi_printPracticePdf('${p.id}', 'script')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform">📥 Скачать PDF</button>
            <button onclick="closeModal(); rbi_printPracticePdf('${p.id}', 'browser')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform">🖨️ Печать (А3)</button>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};


// ============================================================================
// ЭКСПОРТ ВСЕЙ БИБЛИОТЕКИ СПРАВОЧНИКОВ В КОД (ДЛЯ ВШИВАНИЯ В PWA)
// ============================================================================
window.exportLibraryToJsCode = async function (skipSyncCheck = false) {
    const checkLocal = (arr) => {
        if (!Array.isArray(arr)) return false;
        const userItems = arr.filter(i => i && i.id && !String(i.id).startsWith('sys_'));
        let str = JSON.stringify(userItems);
        return str.includes('"local://') || str.includes('"data:image');
    };

    // Если есть локальные фотки и мы еще не пробовали синхронизироваться
    if (!skipSyncCheck && (checkLocal(customTwiCards) || checkLocal(customNodes) || checkLocal(window.rbi_practicesData))) {
        if (confirm("⚠️ В вашей библиотеке есть локальные фото.\n\nЧтобы они работали у всех без интернета, их нужно выгрузить в облако перед скачиванием кода.\n\nПопробовать синхронизировать автоматически?")) {
            showToast("⏳ Синхронизация фото...");

            localStorage.setItem('rbi_cloud_dirty', '1');

            if (typeof window.triggerSync === 'function') {
                await window.triggerSync('manual');
                // Даем время на сохранение в IndexedDB
                setTimeout(async () => {
                    await window.rbi_reloadReferenceMemory(); // Подтягиваем свежие ссылки
                    window.exportLibraryToJsCode(true); // Передаем true, чтобы пропустить проверку и скачать код
                }, 2000);
            }
            return;
        }
    }

    let jsCode = "/* =================================================== */\n";
    jsCode += "/* Сгенерировано из RBI Quality (Вшитая Библиотека)    */\n";
    jsCode += "/* =================================================== */\n\n";

    // 1. Нормативы (Docs)
    const exportDocs = customDocs.filter(d => !String(d.id).startsWith('sys_'));
    jsCode += "// --- 1. НОРМАТИВНЫЕ ДОКУМЕНТЫ ---\n";
    jsCode += `const CUSTOM_SYSTEM_DOCS = ${JSON.stringify(exportDocs, null, 4)};\n\n`;

    // 2. Технические Узлы (Nodes)
    const exportNodes = customNodes.filter(n => !String(n.id).startsWith('sys_'));
    jsCode += "// --- 2. ТЕХНИЧЕСКИЕ УЗЛЫ ---\n";
    jsCode += `const CUSTOM_SYSTEM_NODES = ${JSON.stringify(exportNodes, null, 4)};\n\n`;

    // 3. Инструкции (TWI)
    const exportTwi = customTwiCards.filter(t => !String(t.id).startsWith('sys_'));
    jsCode += "// --- 3. TWI ИНСТРУКЦИИ ---\n";
    jsCode += `const CUSTOM_TWI_CARDS = ${JSON.stringify(exportTwi, null, 4)};\n\n`;

    // 4. Лучшие Практики (Practices)
    const exportPrac = (window.rbi_practicesData || []).filter(p => !p._deleted && p.isPublished);
    jsCode += "// --- 4. ОПУБЛИКОВАННЫЕ ПРАКТИКИ ---\n";
    jsCode += `const CUSTOM_PRACTICES = ${JSON.stringify(exportPrac, null, 4)};\n\n`;

    // 5. Пользовательские Чек-листы (Templates)
    const exportTemplates = {};
    if (typeof userTemplates !== 'undefined') {
        Object.keys(userTemplates).forEach(k => {
            if (!userTemplates[k]._deleted) {
                // Делаем копию, чтобы не сломать рабочие данные на экране
                const tmplClone = JSON.parse(JSON.stringify(userTemplates[k]));

                // Очищаем текст нормативов от HTML-тегов, чтобы код был чистым
                if (tmplClone.groups) {
                    tmplClone.groups.forEach(g => {
                        if (g.items) {
                            g.items.forEach(item => {
                                if (item.t) {
                                    let cleanText = item.t.replace(/<br\s*[\/]?>/gi, "\\n");
                                    cleanText = cleanText.replace(/<\/?[^>]+(>|$)/g, "");
                                    item.t = cleanText;
                                }
                            });
                        }
                    });
                }
                exportTemplates[k] = tmplClone;
            }
        });
    }
    jsCode += "// --- 5. ПОЛЬЗОВАТЕЛЬСКИЕ ЧЕК-ЛИСТЫ ---\n";
    jsCode += `const CUSTOM_USER_TEMPLATES = ${JSON.stringify(exportTemplates, null, 4)};\n\n`;

    downloadFile(jsCode, `rbi_library_code_${new Date().toLocaleDateString('ru-RU')}.js`, 'application/javascript');
    showToast("✅ Файл библиотеки со ссылками скачан!");
};

// === ЛОГИКА УНИВЕРСАЛЬНОГО МЕНЮ (3 ТОЧКИ) ===
window.openUniversalActionSheet = function (id, type, title, isOwner, extraData) {
    // <-- ВСТАВКА: Режим Бога для администратора (разрешаем удалять и менять всё)
    if (window.RbiRoles && window.RbiRoles.isAdmin()) {
        isOwner = true;
    }

    const sheet = document.getElementById('universal-action-sheet');
    document.getElementById('uas-title').innerText = title;

    let btnsHtml = '';

    // Кнопка: Просмотр (Для всех)
    btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'view')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Смотреть</span>
        </button>
    `;

    // Кнопка: PDF (Только Практики)
    if (type === 'practice') {
        btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'pdf')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Скачать PDF (А3)</span>
        </button>`;
    }

    // Кнопка: Опубликовать (Только Практики, только автор, если еще не опубликовано)
    if (type === 'practice' && isOwner && extraData !== 'published') {
        btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'publish')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Опубликовать в библиотеку</span>
        </button>`;
    }
    // Кнопки для Эталонов
    if (type === 'etalon') {
        btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'pdf')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Скачать PDF</span>
        </button>`;

        if (isOwner) {
            btnsHtml += `
            <button onclick="handleUasAction('${id}', '${type}', 'edit')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
                <div class="w-8 h-8 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path></svg>
                </div>
                <span class="text-[12px] font-bold">Изменить</span>
            </button>`;
        }
    }
    // Кнопки для Отчетов (PDF)
    if (type === 'report') {
        btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'share')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Поделиться файлом</span>
        </button>`;
    }
    // Изменить (Только TWI)
    if (type === 'twi' && isOwner) {
        btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'publish')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Изменить</span>
        </button>`;
    }
    // Кнопки для FMEA и Совещаний (Редактировать и PDF)
    if ((type === 'fmea' || type === 'meeting') && isOwner) {
        btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'edit')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Изменить</span>
        </button>
        <button onclick="handleUasAction('${id}', '${type}', 'pdf')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Скачать PDF</span>
        </button>`;
    }
    // Изменить (Только Узлы и только для автора)
    if (type === 'node' && isOwner && !id.startsWith('sys_')) {
        btnsHtml += `
        <button onclick="handleUasAction('${id}', '${type}', 'edit')" class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
            <div class="w-8 h-8 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Изменить</span>
        </button>`;
    }
    // Удаление (Только для автора, не системные)
    if (isOwner && !id.startsWith('sys_')) {
        btnsHtml += `
        <div class="border-t border-slate-100 dark:border-slate-800 my-1"></div>
        <button onclick="handleUasAction('${id}', '${type}', 'delete')" class="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-red-600 dark:text-red-400 active:scale-95">
            <div class="w-8 h-8 bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-500 rounded-lg flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </div>
            <span class="text-[12px] font-bold">Удалить</span>
        </button>`;
    }

    document.getElementById('uas-buttons').innerHTML = btnsHtml;
    sheet.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        sheet.classList.remove('opacity-0');
        sheet.querySelector('.transform').classList.remove('translate-y-full');
    }, 10);
};

window.closeUniversalActionSheet = function () {
    const sheet = document.getElementById('universal-action-sheet');
    sheet.classList.add('opacity-0');
    sheet.querySelector('.transform').classList.add('translate-y-full');
    setTimeout(() => {
        sheet.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
};

window.handleUasAction = function (id, type, action) {
    closeUniversalActionSheet();
    setTimeout(() => {
        // --- ДЕЙСТВИЯ ПРАКТИК ---
        if (type === 'practice') {
            if (action === 'view') rbi_openPracticeViewer(id);
            if (action === 'pdf') rbi_printPracticePdf(id);
            if (action === 'publish') rbi_publishPractice(id);
            if (action === 'delete') rbi_deletePractice(id);
        }
        // --- ДЕЙСТВИЯ ЭТАЛОНОВ ---
        if (type === 'etalon') {
            if (action === 'view') openEtalonViewer(id);
            if (action === 'pdf') printEtalonAct(id, 'script');
            if (action === 'edit') editEtalonAct(id);
            if (action === 'delete') deleteEtalonAct(id);
        }
        // --- ДЕЙСТВИЯ TWI ---
        if (type === 'twi') {
            if (action === 'view') openTwiViewer(id);
            if (action === 'delete') deleteTwiCard(id);
            // Добавим кнопку редактора
            if (action === 'publish') openTwiConstructor(id); // Используем слот publish для "Изменить"
        }
        // --- ДЕЙСТВИЯ УЗЛОВ ---
        if (type === 'node') {
            if (action === 'view') openNodeViewer(id);
            if (action === 'edit') openNodeConstructor(id); // <-- ВСТАВИТЬ ЭТУ СТРОКУ
            if (action === 'delete') deleteNode(id);
        }
        // --- ДЕЙСТВИЯ НД ---
        if (type === 'doc') {
            if (action === 'view') openDocViewer(id);
            if (action === 'delete') deleteCustomDoc(id);
        }
        // --- ДЕЙСТВИЯ FMEA ---
        if (type === 'fmea') {
            if (action === 'view') rbi_viewFmea(id);
            if (action === 'edit') rbi_loadFmeaToWorkspace(id);
            if (action === 'pdf') rbi_printFmeaPdf(id, 'script');
            if (action === 'delete') rbi_deleteFmea(id);
        }
        // --- ДЕЙСТВИЯ СОВЕЩАНИЙ ---
        if (type === 'meeting') {
            if (action === 'view') rbi_openSavedMeeting(id);
            if (action === 'edit') rbi_openSavedMeeting(id); // Совещания редактируются в том же окне просмотра
            if (action === 'pdf') rbi_printMeetingPdf(id, 'script');
            if (action === 'delete') rbi_deleteMeeting(id);
        }
        // --- ДЕЙСТВИЯ ОТЧЕТОВ ---
        if (type === 'report') {
            if (action === 'view') openReport(id);
            if (action === 'share') shareReport(id);
            if (action === 'delete') deleteReport(id);
        }
    }, 350);
};

// --- ОКНО ПРОСМОТРА ПРАКТИКИ ПО КЛИКУ НА КАРТОЧКУ ---
// --- ОКНО ПРОСМОТРА ПРАКТИКИ ПО КЛИКУ НА КАРТОЧКУ ---
window.rbi_openPracticeViewer = async function (id) {
    const p = window.rbi_practicesData.find(x => x.id === id);
    if (!p) return;

    // Нормализуем старые и новые данные (чтобы не сломать старые практики)
    const beforeArr = p.photosBefore || (p.photoBefore ? [p.photoBefore] : []);
    const processArr = p.photosProcess || (p.photoProcess ? [p.photoProcess] : []);
    const afterArr = p.photosAfter || (p.photoAfter ? [p.photoAfter] : []);

    const buildImgBlock = async (arr, label, colorCls) => {
        if (!arr || arr.length === 0) return '';
        
        let imgsHtml = '';
        for (let src of arr) {
            const realSrc = await PhotoManager.getAsyncUrl(src) || window.getPhotoSrc(src);
            imgsHtml += `<img src="${realSrc}" class="w-full h-32 sm:h-40 object-cover bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 transition-transform shadow-sm flex-shrink-0 min-w-[80%]" onclick="openPhotoViewer('${src}')">`;
        }
        
        return `
        <div class="flex flex-col w-full overflow-hidden">
            <div class="text-[9px] font-black uppercase tracking-widest mb-1 text-center ${colorCls}">${label}</div>
            <div class="flex gap-2 overflow-x-auto custom-scrollbar pb-2 snap-x">
                ${imgsHtml}
            </div>
        </div>`;
    };

    const imgBefore = await buildImgBlock(beforeArr, 'Проблема (Было)', 'text-red-500');
    const imgProcess = await buildImgBlock(processArr, 'Процесс (Действия)', 'text-orange-500');
    const imgAfter = await buildImgBlock(afterArr, 'Результат (Стало)', 'text-green-600');

    // Генерируем список PDF-документов с описаниями
    let docsHtml = '';
    if (p.docs && p.docs.length > 0) {
        docsHtml = `<div class="mt-4"><div class="text-[10px] font-black uppercase text-slate-500 mb-2 pl-1 border-b border-slate-200 pb-1">Приложенные документы</div>` + 
        p.docs.map(doc => `
            <div class="mb-2 p-3 bg-red-50 border border-red-200 rounded-xl flex justify-between items-center cursor-pointer active:scale-95" onclick="window.openFakePdfViewer('${doc.url}', '${doc.name}')">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black shadow-sm text-[10px] shrink-0">PDF</div>
                    <div class="min-w-0 pr-2">
                        <div class="text-[11px] font-bold text-slate-800 truncate">${doc.name}</div>
                        ${doc.desc ? `<div class="text-[9px] text-slate-500 font-medium truncate mt-0.5">${doc.desc}</div>` : ''}
                    </div>
                </div>
                <span class="text-[9px] font-bold text-red-600 bg-white px-2 py-1 rounded shadow-sm border border-red-200 shrink-0">Открыть</span>
            </div>
        `).join('') + `</div>`;
    }

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full">
            <span class="text-[14px] uppercase font-black text-slate-800 dark:text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Библиотека практик
            </span>
            <button onclick="closeModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg">✕</button>
        </div>
    `;

    document.getElementById('modal-body').innerHTML = `
        <div class="text-center mb-4 border-b border-[var(--card-border)] pb-3">
            <div class="text-[14px] font-black text-slate-800 dark:text-white uppercase leading-tight mb-2">${p.title}</div>
            <div class="flex flex-wrap justify-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                <span class="bg-[var(--hover-bg)] px-2 py-1 rounded border border-[var(--card-border)]">${p.projectName || 'Объект не указан'}</span>
                <span class="bg-[var(--hover-bg)] px-2 py-1 rounded border border-[var(--card-border)]">${p.contractorName || 'Организация'}</span>
                <span class="bg-[var(--hover-bg)] px-2 py-1 rounded border border-[var(--card-border)]">${p.periodDates || new Date(p.date).toLocaleDateString('ru-RU')}</span>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-3 mb-4">
            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> 
                    ${p.deltaUrk > 0 ? 'Суть проблемы (Было)' : 'Исходная ситуация'}
                </div>
                <div class="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">${p.problem}</div>
            </div>
            
            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                    ${p.deltaUrk > 0 ? 'Принятое решение (Стало)' : 'Решение и результат'}
                </div>
                <div class="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">${p.solution}</div>
            </div>
        </div>
        
        <div class="mb-4">
            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-1 border-b border-[var(--card-border)] pb-2">Материалы презентации</div>
            ${ (imgBefore || imgProcess || imgAfter) ? (imgBefore + imgProcess + imgAfter) : '<div class="text-xs text-center py-4 text-slate-400">Вложений нет</div>' }
            ${docsHtml}
        </div>

        <div class="flex gap-2 w-full">
            <button onclick="closeModal(); rbi_printPracticePdf('${p.id}', 'script')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform">
                📥 Скачать PDF
            </button>
            <button onclick="closeModal(); rbi_printPracticePdf('${p.id}', 'browser')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform">
                🖨️ Печать (А3)
            </button>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

// ============================================================================
// МОДУЛЬ ОБРАТНОЙ СВЯЗИ (ФИДБЕК И ИДЕИ)
// ============================================================================

const STATUS_MAP = {
    'new': { text: 'Новое', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'in_progress': { text: 'В работе', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    'done': { text: 'Готово', color: 'bg-green-100 text-green-700 border-green-200' },
    'rejected': { text: 'Отклонено', color: 'bg-slate-100 text-slate-500 border-slate-300' }
};

window.rbi_renderFeedbackTab = function () {
    const container = document.getElementById('feedback-list-container');
    if (!container) return;

    if (!window.rbi_feedbackData || window.rbi_feedbackData.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-300 rounded-xl">Информации пока нет</div>`;
        return;
    }

    const currentEng = appSettings.engineerName || 'Инженер';
    const allActive = [...window.rbi_feedbackData].filter(f => !f._deleted);

    // Разделяем на Планы разработчика и Фидбек пользователей
    const roadmaps = allActive.filter(f => f.is_roadmap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const feedback = allActive.filter(f => !f.is_roadmap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = '';

    // --- БЛОК: ПЛАНЫ РАЗРАБОТЧИКА ---
    if (roadmaps.length > 0) {
        html += `<div class="mb-4">
            <div class="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-indigo-100 pb-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Планы разработчика (Roadmap)
            </div>
            <div class="space-y-2">`;

        roadmaps.forEach(rm => {
            const likesCount = rm.likes ? rm.likes.length : 0;
            const iLiked = rm.likes && rm.likes.includes(currentEng);

            html += `
                <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 shadow-sm">
                    <div class="text-[12px] font-bold text-indigo-900 leading-tight mb-2">${rm.text}</div>
                    <button onclick="rbi_toggleFeedbackLike('${rm.id}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${iLiked ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-indigo-200 text-indigo-600'} active:scale-95 transition-colors text-[10px] font-black w-fit">
                        <svg class="w-3.5 h-3.5" fill="${iLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path></svg>
                        Жду эту функцию! (${likesCount})
                    </button>
                </div>
            `;
        });
        html += `</div></div>`;
    }

    // --- БЛОК: ИДЕИ ПОЛЬЗОВАТЕЛЕЙ ---
    if (feedback.length > 0) {
        html += `<div class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Идеи и баги от команды</div>
                 <div class="space-y-3">`;

        feedback.forEach(f => {
            const st = STATUS_MAP[f.status] || STATUS_MAP['new'];
            const likesCount = f.likes ? f.likes.length : 0;
            const iLiked = f.likes && f.likes.includes(currentEng);
            const isOwner = f.author === currentEng;

            let contentHtml = f.normalized_text
                ? `<div class="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 mb-2">${f.normalized_text.replace(/\n/g, '<br>')}</div>`
                : `<div class="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 mb-2 italic">«${f.text}»</div>`;

            let notesHtml = f.developer_notes ? `<div class="mt-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-2 rounded-lg text-[10px] text-emerald-800 dark:text-emerald-400"><b>Кондратьев И. Н.</b> ${f.developer_notes}</div>` : '';

            html += `
            <div class="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm transition-colors">
                <div class="flex justify-between items-start mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <div>
                        <div class="text-[10px] font-black text-slate-800 dark:text-white uppercase">${f.author}</div>
                        <div class="text-[8px] text-slate-400 font-bold">${new Date(f.createdAt).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div class="text-[9px] font-black px-2 py-0.5 rounded border ${st.color} uppercase tracking-widest">${st.text}</div>
                </div>
                ${contentHtml}
                ${notesHtml}
                <div class="mt-2 flex justify-between items-center pt-2">
                    <button onclick="rbi_toggleFeedbackLike('${f.id}')" class="flex items-center gap-1.5 px-2 py-1 rounded-lg border ${iLiked ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'} active:scale-95 transition-colors text-[10px] font-bold">
                        <svg class="w-3.5 h-3.5" fill="${iLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path></svg>
                        Поддерживаю (${likesCount})
                    </button>
                    ${isOwner ? `
                    <div class="flex gap-1.5">
                        <button onclick="rbi_editFeedback('${f.id}')" class="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 active:scale-95 shadow-sm transition-colors">Изменить</button>
                        <button onclick="rbi_deleteFeedback('${f.id}')" class="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 active:scale-95 shadow-sm transition-colors">Удалить</button>
                    </div>
                    ` : ''}
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
};

window.rbi_submitFeedback = async function () {
    const inputEl = document.getElementById('feedback-input-text');
    const btn = document.getElementById('feedback-submit-btn');
    const text = inputEl.value.trim();
    if (!text) return showToast("⚠️ Напишите предложение!");

    btn.innerHTML = `<span class="animate-pulse">⏳ ИИ нормализует текст...</span>`;
    btn.disabled = true;

    let normalizedText = null;
    if (appSettings.aiEnabled) {
        normalizedText = await window.rbi_normalizeFeedbackAi(text);
    }

    const currentEng = appSettings.engineerName || 'Инженер';

    const fb = {
        id: 'fb_' + Date.now().toString(36),
        text: text,
        normalized_text: normalizedText,
        author: currentEng,
        owner: currentEng, // Для RLS политик Supabase
        status: 'new',
        developer_notes: '',
        likes: [currentEng], // Автоматически лайкаем свою идею
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false
    };

    window.rbi_feedbackData.unshift(fb);
    await dbPut(STORES.FEEDBACK_LIST, fb);

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    inputEl.value = '';
    btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg> Отправить разработчику`;
    btn.disabled = false;

    showToast("✅ Предложение отправлено!");
    rbi_renderFeedbackTab();
};

window.rbi_toggleFeedbackLike = async function (id) {
    const idx = window.rbi_feedbackData.findIndex(f => f.id === id);
    if (idx === -1) return;

    const currentEng = appSettings.engineerName || 'Инженер';
    let likes = window.rbi_feedbackData[idx].likes || [];

    if (likes.includes(currentEng)) {
        likes = likes.filter(l => l !== currentEng);
    } else {
        likes.push(currentEng);
    }

    window.rbi_feedbackData[idx].likes = likes;
    window.rbi_feedbackData[idx].updatedAt = new Date().toISOString();

    // ВАЖНО: Флаги для синхронизатора (чтобы лайки тоже синхронизировались)
    window.rbi_feedbackData[idx].sync_status = 'not_synced';
    window.rbi_feedbackData[idx].syncStatus = 'not_synced';
    window.rbi_feedbackData[idx].source = 'local';

    await dbPut(STORES.FEEDBACK_LIST, window.rbi_feedbackData[idx]);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    rbi_renderFeedbackTab();
};

window.rbi_deleteFeedback = async function (id) {
    const idx = window.rbi_feedbackData.findIndex(f => f.id === id);
    if (idx === -1) return;

    const f = window.rbi_feedbackData[idx];
    const currentEng = window.RbiRoles ? window.RbiRoles.getCurrentEngineerName() : (appSettings.engineerName || 'Инженер');
    const isOwner = f.author === currentEng;
    const isAdmin = window.RbiRoles ? window.RbiRoles.isAdmin() : false;

    if (!isOwner && !isAdmin) return showToast("⚠️ Нет прав на удаление");

    const msg = (isAdmin && !isOwner) ? "Удалить предложение пользователя из бэклога?" : "Вы уверены, что хотите удалить свое предложение?";
    if (!confirm(msg)) return;

    // Стандартная логика мягкого удаления с ЖЕЛЕЗОБЕТОННЫМИ флагами для облака
    window.rbi_feedbackData[idx]._deleted = true;
    window.rbi_feedbackData[idx].is_deleted = true;
    window.rbi_feedbackData[idx]._deletedAt = new Date().toISOString();
    window.rbi_feedbackData[idx].updatedAt = window.rbi_feedbackData[idx]._deletedAt;

    window.rbi_feedbackData[idx].source = 'local';
    window.rbi_feedbackData[idx].syncStatus = 'not_synced';
    window.rbi_feedbackData[idx].sync_status = 'not_synced';

    // Сохраняем в локальную базу устройства
    await dbPut('feedback_list', window.rbi_feedbackData[idx]);

    // Даем команду облаку на синхронизацию
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    showToast("🗑️ Предложение удалено");

    // Перерисовываем списки (тихо)
    if (typeof rbi_renderFeedbackTab === 'function') rbi_renderFeedbackTab();
    if (typeof rbi_renderDevFeedbackTab === 'function') rbi_renderDevFeedbackTab();
};

// Открытие модального окна для редактирования своего предложения
window.rbi_editFeedback = function (id) {
    const idx = window.rbi_feedbackData.findIndex(f => f.id === id);
    if (idx === -1) return;
    const f = window.rbi_feedbackData[idx];

    // Берем нормализованный текст, если он есть, иначе берем оригинал
    const currentText = f.normalized_text || f.text;

    // Создаем окошко "на лету"
    const modalHtml = `
    <div id="feedback-edit-modal" class="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-[var(--card-bg)] w-full max-w-md p-6 rounded-2xl shadow-2xl border border-[var(--card-border)] flex flex-col animate-fadeIn">
            <div class="font-black text-[13px] uppercase tracking-tight mb-4 text-slate-800 dark:text-white flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                <span class="flex items-center gap-2">✏️ Редактировать текст</span>
                <button onclick="document.getElementById('feedback-edit-modal').remove()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg">✕</button>
            </div>
            <textarea id="feedback-edit-input" class="input-base text-[12px] h-48 resize-none mb-4 p-3 leading-relaxed shadow-inner">${currentText}</textarea>
            <div class="flex gap-2">
                <button onclick="document.getElementById('feedback-edit-modal').remove()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 border border-slate-200 dark:border-slate-700 transition-colors">Отмена</button>
                <button onclick="rbi_saveEditedFeedback('${id}')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 transition-transform">💾 Сохранить</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Сохранение исправленного текста
window.rbi_saveEditedFeedback = async function (id) {
    const newText = document.getElementById('feedback-edit-input').value.trim();
    if (!newText) return showToast("⚠️ Текст не может быть пустым!");

    const idx = window.rbi_feedbackData.findIndex(f => f.id === id);
    if (idx === -1) return;

    // Перезаписываем именно нормализованный текст (так как он выводится на экран)
    window.rbi_feedbackData[idx].normalized_text = newText;
    window.rbi_feedbackData[idx].updatedAt = new Date().toISOString();

    // Сохраняем локально
    await dbPut(STORES.FEEDBACK_LIST, window.rbi_feedbackData[idx]);

    // Команда на синхронизацию с облаком
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    // Удаляем окошко и перерисовываем список
    document.getElementById('feedback-edit-modal').remove();
    showToast("✅ Текст успешно обновлен!");
    rbi_renderFeedbackTab();
};

// --- ПАНЕЛЬ РАЗРАБОТЧИКА ---
window.isFeedbackEditing = false; // Глобальный флаг-замок

window.rbi_renderDevFeedbackTab = function () {
    // 🛡 ПРОВЕРКА ЗАМКА: Если мы только что сохранили статус или текст, 
    // жестко блокируем перерисовку, чтобы карточка не улетела из-под пальцев!
    if (window.rbiDisableFeedbackRerender) {
        return; 
    }

    const listContainer = document.getElementById('manager-dev-list');
    const roadmapContainer = document.getElementById('manager-roadmap-list');
    if (!listContainer || !roadmapContainer) return;

    const allData = (window.rbi_feedbackData || []).filter(f => !f._deleted);

    // 1. Отрисовка планов (Roadmap)
    const roadmaps = allData.filter(f => f.is_roadmap);
    if (roadmaps.length === 0) {
        roadmapContainer.innerHTML = `<div class="text-[10px] text-slate-400 italic text-center">Опубликованных планов нет</div>`;
    } else {
        roadmapContainer.innerHTML = roadmaps.map(rm => `
            <div class="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div class="flex-1 min-w-0 pr-3">
                    <div class="text-[12px] font-bold text-indigo-900 leading-tight">${rm.text}</div>
                    <div class="text-[9px] font-black text-indigo-500 uppercase mt-1">❤️ Лайков от команды: ${rm.likes?.length || 0}</div>
                </div>
                <button onclick="rbi_deleteRoadmapItem('${rm.id}')" class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-red-500 font-black shadow-sm active:scale-90 border border-indigo-100 shrink-0">✕</button>
            </div>
        `).join('');
    }

    // 2. Отрисовка бэклога
    const feedback = allData.filter(f => !f.is_roadmap).sort((a, b) => {
        const order = { 'new': 1, 'in_progress': 2, 'done': 3, 'rejected': 4 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return (b.likes?.length || 0) - (a.likes?.length || 0);
    });

    if (feedback.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-300 rounded-xl bg-white">Бэклог пуст</div>`;
        return;
    }

    listContainer.innerHTML = feedback.map(f => {
        const textDisplay = f.normalized_text
            ? `<div class="text-[11px] bg-slate-50 border border-slate-200 p-2 rounded mb-2 font-medium">${f.normalized_text.replace(/\n/g, '<br>')}</div><details><summary class="text-[9px] text-slate-400 cursor-pointer">Оригинал</summary><div class="text-[10px] italic text-slate-500 mt-1">${f.text}</div></details>`
            : `<div class="text-[11px] bg-slate-50 border border-slate-200 p-2 rounded mb-2 italic">«${f.text}»</div>`;

        return `
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-3">
            <div class="flex justify-between items-center mb-2 border-b border-slate-100 pb-2">
                <div class="text-[11px] font-black uppercase text-slate-800">${f.author} <span class="text-[9px] font-normal text-slate-400 normal-case ml-2">${new Date(f.createdAt).toLocaleDateString('ru-RU')}</span></div>
                <div class="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">❤️ ${f.likes?.length || 0}</div>
            </div>
            ${textDisplay}
            
            <div class="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Управление статусом</label>
                    <select class="input-base text-[11px] !py-1.5 transition-colors duration-300" 
                        onchange="rbi_updateFeedbackStatus('${f.id}', this.value, this)">
                        <option value="new" ${f.status === 'new' ? 'selected' : ''}>🔵 Новое</option>
                        <option value="in_progress" ${f.status === 'in_progress' ? 'selected' : ''}>🟡 В работе</option>
                        <option value="done" ${f.status === 'done' ? 'selected' : ''}>🟢 Готово</option>
                        <option value="rejected" ${f.status === 'rejected' ? 'selected' : ''}>⚪ Отклонено</option>
                    </select>
                </div>
                <div>
                    <label class="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Ответ разработчика</label>
                    <div class="flex gap-1">
                        <input type="text" id="dev-note-${f.id}" class="input-base text-[11px] !py-1.5" placeholder="Напишите ответ..." value="${f.developer_notes || ''}">
                        <button onclick="rbi_updateFeedbackNotes('${f.id}', this)" class="bg-emerald-600 text-white px-3 rounded-lg text-[10px] font-bold active:scale-95 shadow-sm transition-colors duration-300 w-10 shrink-0">OK</button>
                    </div>
                </div>
            </div>
            <div class="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                <button onclick="rbi_deleteFeedback('${f.id}')" class="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase flex items-center gap-1 active:scale-95"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Удалить из бэклога</button>
            </div>
        </div>`;
    }).join('');
};

window.rbi_updateFeedbackStatus = async function (id, newStatus, selectEl) {
    // ЖЕЛЕЗОБЕТОННЫЙ ЗАМОК: запрещаем перерисовку экрана на 5 секунд
    window.rbiDisableFeedbackRerender = true;

    const idx = window.rbi_feedbackData.findIndex(f => f.id === id);
    if (idx === -1) return;
    
    window.rbi_feedbackData[idx].status = newStatus;
    window.rbi_feedbackData[idx].updatedAt = new Date().toISOString();
    window.rbi_feedbackData[idx].sync_status = 'not_synced';
    window.rbi_feedbackData[idx].syncStatus = 'not_synced';
    window.rbi_feedbackData[idx].source = 'local';

    await dbPut(STORES.FEEDBACK_LIST, window.rbi_feedbackData[idx]);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    
    // Визуальная подсветка (мигает зеленым)
    if (selectEl) {
        const originalBg = selectEl.style.backgroundColor;
        selectEl.style.backgroundColor = '#dcfce7'; 
        setTimeout(() => { selectEl.style.backgroundColor = originalBg; }, 1000);
    }
    showToast("✅ Статус обновлен");

    // Снимаем замок после завершения фоновой синхронизации
    setTimeout(() => { window.rbiDisableFeedbackRerender = false; }, 5000);
};

// Добавили параметр btnElement для красивой анимации кнопки без перезагрузки страницы
window.rbi_updateFeedbackNotes = async function (id, btnEl) {
    // ЖЕЛЕЗОБЕТОННЫЙ ЗАМОК: запрещаем перерисовку экрана на 5 секунд
    window.rbiDisableFeedbackRerender = true;

    const idx = window.rbi_feedbackData.findIndex(f => f.id === id);
    if (idx === -1) return;
    const note = document.getElementById(`dev-note-${id}`).value.trim();
    
    window.rbi_feedbackData[idx].developer_notes = note;
    window.rbi_feedbackData[idx].updatedAt = new Date().toISOString();
    window.rbi_feedbackData[idx].sync_status = 'not_synced';
    window.rbi_feedbackData[idx].syncStatus = 'not_synced';
    window.rbi_feedbackData[idx].source = 'local';

    await dbPut(STORES.FEEDBACK_LIST, window.rbi_feedbackData[idx]);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    
    if (btnEl) {
        const originalText = btnEl.innerHTML;
        btnEl.innerHTML = "✓";
        btnEl.classList.replace('bg-emerald-600', 'bg-green-500');
        setTimeout(() => {
            btnEl.innerHTML = originalText;
            btnEl.classList.replace('bg-green-500', 'bg-emerald-600');
        }, 2000);
    }
    showToast("✅ Ответ разработчика сохранен");

    // Снимаем замок
    setTimeout(() => { window.rbiDisableFeedbackRerender = false; }, 5000);
};

window.rbi_exportFeedbackJson = function () {
    const dataStr = JSON.stringify(window.rbi_feedbackData.filter(f => !f._deleted), null, 4);
    downloadFile(dataStr, `RBI_Feedback_${new Date().toLocaleDateString('ru-RU')}.json`, 'application/json');
    showToast("JSON выгружен");
};

// === ЛОГИКА ДОБАВЛЕНИЯ ПЛАНОВ РАЗРАБОТЧИКОМ ===
window.rbi_addRoadmapItem = async function () {
    const inputEl = document.getElementById('dev-roadmap-input');
    const text = inputEl.value.trim();
    if (!text) return showToast("⚠️ Введите текст плана!");

    const rb = {
        id: 'rm_' + Date.now().toString(36),
        text: text,
        normalized_text: text, // У планов разработчика текст выводится как есть
        author: 'Разработчик',
        owner: 'Разработчик',
        status: 'roadmap', // Уникальный статус для планов
        is_roadmap: true,  // Флаг, чтобы отличать от обычного фидбека
        likes: [], // Сюда будут падать лайки от пользователей
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false
    };

    window.rbi_feedbackData.unshift(rb);
    await dbPut(STORES.FEEDBACK_LIST, rb); // <-- Исправлена переменная, из-за которой функция могла падать
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');

    inputEl.value = '';
    showToast("✅ План опубликован для команды!");
    rbi_renderDevFeedbackTab(); // Перерисовываем панель разработчика
    if (typeof rbi_renderFeedbackTab === 'function') rbi_renderFeedbackTab(); // <-- НОВОЕ: Перерисовываем вкладку настроек у юзера
};

window.rbi_deleteRoadmapItem = async function (id) {
    if (!confirm("Удалить этот пункт из планов?")) return;
    const idx = window.rbi_feedbackData.findIndex(f => f.id === id);
    if (idx > -1) {
        // ЖЕЛЕЗОБЕТОННЫЕ ФЛАГИ ДЛЯ ОБЛАКА
        window.rbi_feedbackData[idx]._deleted = true;
        window.rbi_feedbackData[idx].is_deleted = true; // Обязательно для Supabase
        window.rbi_feedbackData[idx].source = 'local';
        window.rbi_feedbackData[idx].syncStatus = 'not_synced';
        window.rbi_feedbackData[idx].sync_status = 'not_synced';
        window.rbi_feedbackData[idx].updatedAt = new Date().toISOString();
        window.rbi_feedbackData[idx].updated_at = window.rbi_feedbackData[idx].updatedAt;

        await dbPut(STORES.FEEDBACK_LIST, window.rbi_feedbackData[idx]);
        
        // ОЧИЩАЕМ ОПЕРАТИВНУЮ ПАМЯТЬ ПЕРЕД ОТРИСОВКОЙ, чтобы план сразу исчез
        window.rbi_feedbackData = window.rbi_feedbackData.filter(f => !f._deleted);
        
        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
        
        rbi_renderDevFeedbackTab();
    }
};

// === ФУНКЦИИ ЛОГОТИПА (С поддержкой прозрачных PNG) ===
window.handleLogoUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showToast("Файл слишком большой! Максимум 2 МБ.");

    const reader = new FileReader();
    reader.onload = async function (e) {
        // Проверяем тип файла. Если это PNG, сохраняем как PNG, чтобы не потерять прозрачность
        let mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        // Создаем временный холст для обработки
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Если JPEG, заливаем белым фоном. Если PNG - оставляем прозрачным.
            if (mimeType === 'image/jpeg') {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0);

            const base64Logo = canvas.toDataURL(mimeType, 0.9);

            appSettings.brandLogo = base64Logo;
            appSettings.isBrandingCustomized = true; // Отмечаем, что это ручной логотип
            saveSettings('isBrandingCustomized', true);
            saveSettings('brandLogo', base64Logo);
            renderSettingsTab();
            showToast("✅ Фирменный логотип RBI успешно сохранен!");
        };
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
    event.target.value = '';
};

window.removeBrandLogo = function () {
    appSettings.brandLogo = '';
    appSettings.isBrandingCustomized = true; // Пользователь явно удалил логотип
    saveSettings('isBrandingCustomized', true);
    saveSettings('brandLogo', '');
    renderSettingsTab();
    showToast("🗑️ Логотип удален");
};

window.publishCorporateBranding = async function () {
    if (!window.supabaseClient) return showToast("❌ Облако не подключено!");
    showToast("⏳ Публикация корпоративного стиля...");
    try {
        const pCode = window.syncConfig?.projectCode;
        let logoUrl = appSettings.brandLogo;

        // Если логотип локальный, грузим его в облако в общую папку
        if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('local://'))) {
            logoUrl = await window.rbiUploadAsset(logoUrl, 'custom-assets', `${pCode}/branding/logo`, 'photo');
        }

        const payload = {
            project_code: pCode,
            logo_url: logoUrl || '',
            brand_color: appSettings.brandColor || '#1c2b39',
            updated_at: new Date().toISOString()
        };

        const { error } = await window.supabaseClient.from('project_settings').upsert(payload, { onConflict: 'project_code' });
        if (error) throw error;

        // Сбрасываем свой флаг кастомизации, так как мы теперь сами сидим на стандарте
        appSettings.isBrandingCustomized = false;
        saveSettings('isBrandingCustomized', false);

        showToast("✅ Корпоративный стиль опубликован для всех!");
        renderSettingsTab();
    } catch (e) {
        console.error(e);
        showToast("❌ Ошибка публикации");
    }
};

window.resetToCorporateBranding = function () {
    appSettings.isBrandingCustomized = false;
    saveSettings('isBrandingCustomized', false);
    // Сразу вызываем синхронизацию, чтобы подтянуть стиль из облака
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('manual');
    showToast("⏳ Запрос корпоративного стиля...");
};

// === Применить связь подрядчика ко всей истории осмотров ===
window.applyContractorAliasToInspectionHistory = async function (rawName, canonicalKey, displayName) {
    if (!rawName || !canonicalKey || !displayName) return 0;
    if (typeof dbGetAll !== 'function' || typeof dbPut !== 'function') return 0;

    const records = await dbGetAll(STORES.HISTORY) || [];

    const rawClean = String(rawName || '').trim().toLowerCase();
    const nowIso = new Date().toISOString();

    let updated = 0;

    for (const rec of records) {
        if (!rec || rec._deleted || rec.is_deleted) continue;

        const recName = String(
            rec.contractor_raw_name ||
            rec.contractorName ||
            rec.contractor_name ||
            ''
        ).trim().toLowerCase();

        if (recName === rawClean) {
            rec.contractor_raw_name = rec.contractor_raw_name || rec.contractorName || rec.contractor_name || rawName;

            rec.contractorName = displayName;
            rec.contractor_name = displayName;
            rec.contractor_canonical_key = canonicalKey;
            rec.contractor_normalization_status = 'matched';

            rec.source = 'local';
            rec.syncStatus = 'not_synced';
            rec.sync_status = 'not_synced';
            rec.syncBlockReason = '';
            rec.sync_block_reason = '';

            rec.updatedAt = nowIso;
            rec.updated_at = nowIso;
            rec._updatedAt = nowIso;

            await dbPut(STORES.HISTORY, rec);
            updated++;
        }
    }

    if (updated > 0) {
        // Обновляем рабочий массив истории
        contractorArray = (await dbGetAll(STORES.HISTORY) || []).filter(x => !x._deleted && !x.is_deleted);

        localStorage.setItem('rbi_cloud_dirty', '1');

        if (typeof updateAllDynamicFilters === 'function') {
            updateAllDynamicFilters();
        }
    }

    console.log(`[Подрядчики] История обновлена по алиасу "${rawName}" → "${displayName}". Записей: ${updated}`);

    return updated;
};

window.openNodeAttachmentPdf = async function (url, name, size) {
    await window.rbiOpenPdfInTwiViewer(
        url,
        name || 'PDF вложение',
        'Вложение узла',
        name || 'document.pdf',
        size || ''
    );
};

// ============================================================================
// === НОВЫЙ БЛОК: УПРАВЛЕНИЕ РЕЖИМАМИ ПРИЛОЖЕНИЯ (QUALITY / CONSTRUCTION и т.д.) ===
// ============================================================================

window.AppModeManager = {
    currentMode: 'quality',
    previousMode: 'quality',

    init() {
        // Загружаем сохраненный режим или ставим quality по умолчанию
        const savedMode = localStorage.getItem('rbi_app_mode');
        this.currentMode = savedMode || 'quality';

        // Синхронизируем выпадающий список в шапке
        const selector = document.getElementById('app-mode-selector');
        const label = document.getElementById('current-mode-label');
        if (selector && label) {
            selector.value = this.currentMode;
            label.innerHTML = `${selector.options[selector.selectedIndex].text.split(' ')[0]} ▾`;
        }

        // Отрисовываем нижнюю навигацию
        this.renderBottomNav();
        this.updateHeaderVisibility();
    },

    changeMode(newMode) {
        if (this.currentMode === newMode) return;

        this.previousMode = this.currentMode;
        this.currentMode = newMode;
        localStorage.setItem('rbi_app_mode', newMode);

        // Обновляем шапку
        const selector = document.getElementById('app-mode-selector');
        const label = document.getElementById('current-mode-label');
        if (selector && label) {
            selector.value = newMode;
            label.innerHTML = `${selector.options[selector.selectedIndex].text.split(' ')[0]} ▾`;
        }

        this.renderBottomNav();
        this.updateHeaderVisibility();

        // Роутинг: куда переходить при смене режима
        switch (newMode) {
            case 'quality':
                document.getElementById('construction-warning-banner').style.display = 'none';
                window.AppRouter.navigate('#/quality/audit', true);
                break;
            case 'construction':
                document.getElementById('construction-warning-banner').style.display = 'flex';
                window.AppRouter.navigate('#/construction/defects', true);
                break;
            // ... (остальные case оставляем без изменений)
            case 'safety': // <-- ДОБАВИЛИ ЭТОТ БЛОК
                window.AppRouter.navigate('#/safety/placeholder', true);
                break;
            case 'warranty':
                window.AppRouter.navigate('#/warranty/placeholder', true);
                break;
            case 'uk':
                window.AppRouter.navigate('#/uk/placeholder', true);
                break;
        }
    },

    revertToPrevious() {
        this.changeMode(this.previousMode || 'quality');
    },

    updateHeaderVisibility(showHeader) {
        const header = document.getElementById('main-header');
        if (!header) return;

        // Если шапка не нужна на этом экране (например, Настройки), жестко скрываем её
        if (!showHeader) {
            header.style.display = 'none';
            return;
        }

        header.style.display = 'block';

        const checklistContainer = document.getElementById('header-checklist-container');
        const dashboard = document.getElementById('header-dashboard');
        const dataBlock = document.getElementById('header-data-block');

        if (this.currentMode === 'quality') {
            if (checklistContainer) checklistContainer.style.display = 'flex';
            if (dashboard && typeof appSettings !== 'undefined' && appSettings.dashboardMode !== 'hidden') {
                dashboard.style.display = 'block';
            } else if (dashboard) {
                dashboard.style.display = 'none';
            }
            if (dataBlock) dataBlock.style.display = 'block';
        } else {
            // В режиме стройконтроля (и других) прячем специфичные блоки "Осмотра"
            if (checklistContainer) checklistContainer.style.display = 'none';
            if (dashboard) dashboard.style.display = 'none';
            if (dataBlock) dataBlock.style.display = 'none';
        }
    },

    renderBottomNav() {
        const nav = document.getElementById('main-bottom-nav');
        if (!nav) return;

        let html = '';

        if (this.currentMode === 'quality') {
            html = `
                <div class="nav-item" data-path="#/quality/audit">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                    <span class="nav-text">Осмотр</span>
                </div>
                <div class="nav-item" data-path="#/quality/engineer">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"></path></svg>
                    <span class="nav-text">Инженер</span>
                </div>
                <div class="nav-item" data-path="#/quality/analytics">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    <span class="nav-text">Аналитика</span>
                </div>
                <div class="nav-item" data-path="#/quality/reference">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    <span class="nav-text">БЗ</span>
                </div>
                <div class="nav-item" data-path="#/quality/settings">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span class="nav-text">Настройки</span>
                </div>
            `;
            nav.style.display = 'flex';
        } else if (this.currentMode === 'construction') {
            html = `
                <div class="nav-item" data-path="#/construction/defects">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                    <span class="nav-text">Дефекты</span>
                </div>
                <div class="nav-item" data-path="#/construction/acceptance">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    <span class="nav-text">Приёмка</span>
                </div>
                <div class="nav-item" data-path="#/construction/transfer">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    <span class="nav-text">Шахматка</span>
                </div>
                 <!-- НОВОЕ: База Знаний в Стройконтроле -->
                <div class="nav-item" data-path="#/quality/reference">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    <span class="nav-text">БЗ</span>
                </div>
                <div class="nav-item" data-path="#/construction/reports">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg>
                    <span class="nav-text">Отчеты СК</span>
                </div>
                 <div class="nav-item" data-path="#/quality/settings">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span class="nav-text">Настройки</span>
                </div>
            `;
            nav.style.display = 'flex';
        } else {
            // Для заглушек (Гарантия, УК) прячем меню, чтобы не ломать логику
            nav.style.display = 'none';
        }

        nav.innerHTML = html;

        // Восстанавливаем подсветку активного пункта меню
        if (window.AppRouter) window.AppRouter.updateNavHighlight(window.location.hash);
    }
};

// Глобальные прокси-функции для вызова из HTML
window.changeAppMode = function (mode) {
    AppModeManager.changeMode(mode);
};

window.revertToPreviousMode = function () {
    AppModeManager.revertToPrevious();
};

// ============================================================================
// === МОДУЛЬ PUSH-УВЕДОМЛЕНИЙ (ТУМБЛЕР) ===
// ============================================================================

window.togglePushSettings = async function (element) {
    const isChecked = element.checked;

    if (isChecked) {
        // Проверяем, поддерживает ли устройство пуши
        if (!('Notification' in window)) {
            showToast("❌ Ваш браузер/устройство не поддерживает Push-уведомления");
            element.checked = false;
            return;
        }

        // Запрашиваем разрешение у системы
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            showToast("✅ Уведомления включены!");
            // Сохраняем в настройки
            appSettings.pushEnabled = true;
            if (typeof saveSettings === 'function') saveSettings('pushEnabled', true);

            // Отправляем тестовый пуш
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification("RBI Quality Pro", {
                        body: "Уведомления успешно настроены! Тумблер активирован.",
                        icon: "./icons/icon-512-2.png",
                        badge: "./icons/icon-512-2.png",
                        vibrate: [200, 100, 200]
                    });
                });
            }
        } else {
            showToast("⚠️ Вы запретили уведомления в настройках браузера/телефона");
            element.checked = false; // Отщелкиваем тумблер назад
            appSettings.pushEnabled = false;
            if (typeof saveSettings === 'function') saveSettings('pushEnabled', false);
        }
    } else {
        // Если юзер выключил тумблер
        showToast("🔕 Уведомления отключены");
        appSettings.pushEnabled = false;
        if (typeof saveSettings === 'function') saveSettings('pushEnabled', false);
    }
};

// Функция для установки тумблера в правильное положение при загрузке страницы
window.initPushToggleState = function () {
    const toggle = document.getElementById('set-push-notifications');
    if (!toggle) return;

    // Если в системе жестко запрещены уведомления — принудительно выключаем тумблер
    if ('Notification' in window && Notification.permission === 'denied') {
        appSettings.pushEnabled = false;
        if (typeof saveSettings === 'function') saveSettings('pushEnabled', false);
    }

    // Устанавливаем тумблер в состояние из настроек
    toggle.checked = !!appSettings.pushEnabled;
};

// Запускаем проверку при загрузке
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(window.initPushToggleState, 500);
});

// === ФУНКЦИЯ: Очистка локальных данных при смене закрепленных объектов (С БРОНЕЖИЛЕТОМ) ===
window.purgeDataOutsideAssignedProjects = async function (assignedKeysArray) {
     const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
    if (['director', 'deputy_manager', 'manager'].includes(role)) {
        return; // Молча выходим, ничего не удаляем
    }
    // Если массив пустой - значит у инженера забрали все объекты. Чистим всё скачанное.
    const keysToKeep = assignedKeysArray || []; 
    if (typeof showToast === 'function') showToast("🧹 Обновление прав: очистка неактуальных данных...");

    const storesToClean = [
        STORES.HISTORY, STORES.TASKS, STORES.FMEA, 
        STORES.MEETINGS, STORES.INTERVENTIONS, STORES.SK_RECORDS, STORES.PRACTICES
    ];

    let deletedCount = 0;
    let photosToDelete = new Set(); // Собираем осиротевшие фото

    for (let store of storesToClean) {
        try {
            const items = await dbGetAll(store);
            if (!items) continue;

            for (let item of items) {
                // БРОНЕЖИЛЕТ: Если запись создана офлайн и еще не улетела в облако — не трогаем её!
                if (item.syncStatus === 'not_synced' || item.sync_status === 'not_synced' || item.source === 'local') {
                    continue; 
                }

                // Ищем привязку к объекту
                const pKey = item.project_canonical_key || item.projectName || item.project || item.project_display_name || '';
                
                // Если объект указан, но его нет в новом списке разрешенных -> удаляем физически
                if (pKey && pKey !== 'Все' && pKey !== 'Системная' && !keysToKeep.includes(pKey)) {
                    
                    // Сначала собираем ссылки на локальные фото, чтобы удалить и их
                    if (item.photos) Object.values(item.photos).forEach(p => { if(String(p).startsWith('local://')) photosToDelete.add(p); });
                    if (item.photo && String(item.photo).startsWith('local://')) photosToDelete.add(item.photo);

                    await dbDelete(store, item.id || item.slug);
                    deletedCount++;
                }
            }
        } catch (e) {
            console.warn(`[Purge] Ошибка очистки хранилища ${store}:`, e);
        }
    }

    // Удаляем осиротевшие локальные фото
    if (photosToDelete.size > 0 && typeof dbDelete === 'function') {
        for (let photoId of photosToDelete) {
            await dbDelete(STORES.PHOTOS, photoId);
        }
    }

    if (deletedCount > 0) {
        console.log(`[Purge] Удалено ${deletedCount} неактуальных записей и ${photosToDelete.size} фото.`);
        // Перезагружаем страницу, чтобы сбросить оперативную память
        setTimeout(() => { window.location.reload(); }, 1500);
    }
};
/* ============================================================================ */
/* ЗДЕСЬ ДОЛЖЕН ЗАКАНЧИВАТЬСЯ ФАЙЛ APP.JS                                       */
/* ============================================================================ */