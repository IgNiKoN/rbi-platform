/* Файл: js/services/sync/sync-core.state.js — перенесено из js/sync.js без изменения логики */
/* Файл: js/sync.js (Исправленная версия сборки объектов) */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '', syncMode: 'personal', fullAccessGranted: false };
window.isSyncing = false;
window.appAssistantData = []; // Массив базы знаний ИИ
let syncTimeout = null;
const syncChannel = new BroadcastChannel('rbi_sync_lock');
syncChannel.onmessage = (e) => {
    if (e.data === 'sync_started') window.isSyncing = true;
    if (e.data === 'sync_done') window.isSyncing = false;
};
// Флаги отложенного обновления интерфейса (Lazy Rendering)
window.syncDirtyFlags = {
    templates: false,
    history: false,
    analytics: false,
    tasks: false,
    session: false,
    reference: false
};
// Хэш SHA-256 для пароля ""
const SYNC_FULL_ACCESS_HASH = "1570722437"
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Преобразуем в 32-битное целое
    }
    return hash.toString();
}
try {
    let saved = localStorage.getItem('rbi_sync_config');
    if (saved) window.syncConfig = JSON.parse(saved);
} catch (e) { }

if (!window.syncConfig.deviceId) {
    window.syncConfig.deviceId = 'dev_' + Date.now().toString(36);
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
}

function safeToast(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log(msg);
}
// === RBI FIX: лёгкая очередь фонового кэша файлов ===
window.rbiBgCacheQueue = window.rbiBgCacheQueue || [];
window.rbiBgCacheProcessing = false;
window.rbiFullOfflineCacheProcessing = false;

function rbiEnqueueCloudFilesForCache(urls, source = 'unknown') {
    if (!Array.isArray(urls) || urls.length === 0) return;

    const existing = new Set(window.rbiBgCacheQueue.map(x => x.url));

    urls.forEach(url => {
        if (
            typeof url === 'string' &&
            url.startsWith('http') &&
            url.includes('/storage/v1/object/') &&
            !existing.has(url)
        ) {
            window.rbiBgCacheQueue.push({
                url,
                source,
                addedAt: Date.now()
            });
            existing.add(url);
        }
    });

    // Ограничиваем очередь, чтобы старые телефоны не зависали.
    // Ограничиваем очередь, но не режем её слишком сильно.
    // 300 мало: при первой полной синхронизации часть файлов просто не успевает попасть в автокэш.
    const maxQueueSize = 2000;

    if (window.rbiBgCacheQueue.length > maxQueueSize) {
        window.rbiBgCacheQueue = window.rbiBgCacheQueue.slice(-maxQueueSize);
    }
}

async function rbiProcessBgCacheQueue(options = {}) {
    if (window.rbiBgCacheProcessing) return;
    if (!navigator.onLine) return;
    if (typeof PhotoManager === 'undefined') return;
    if (typeof PhotoManager.downloadForOffline !== 'function') return;

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent || '');
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

    // Ускорение:
    // Safari/iOS держим осторожнее, Edge/Chrome можно быстрее.
    const concurrency = options.concurrency || (isSafari || isIOS ? 2 : 5);
    const maxPerRun = options.maxPerRun || (isSafari || isIOS ? 30 : 100);
    const pauseBetweenRounds = options.pauseBetweenRounds ?? (isSafari || isIOS ? 1200 : 500);

    window.rbiBgCacheProcessing = true;

    try {
        const batch = window.rbiBgCacheQueue.splice(0, maxPerRun);
        if (batch.length === 0) return;

        console.log(`[Cache] Старт фонового кэша: ${batch.length} файлов, потоков: ${concurrency}, осталось в очереди: ${window.rbiBgCacheQueue.length}`);

        let cursor = 0;
        let done = 0;

        const workers = Array.from({ length: concurrency }, async () => {
            while (cursor < batch.length) {
                const item = batch[cursor++];
                if (!item || !item.url) continue;

                try {
                    await PhotoManager.downloadForOffline(item.url);
                    done++;
                } catch (e) {
                    console.warn('[Cache] Не удалось закэшировать файл:', item.source, e);
                }
            }
        });

        await Promise.allSettled(workers);

        console.log(`[Cache] Фоновый кэш: обработано ${done}/${batch.length}, осталось ${window.rbiBgCacheQueue.length}`);

        if (window.rbiBgCacheQueue.length > 0) {
            setTimeout(() => {
                rbiProcessBgCacheQueue(options);
            }, pauseBetweenRounds);
        }
    } finally {
        window.rbiBgCacheProcessing = false;
    }
}

function rbiCollectCloudStorageUrls(obj, limit = 30) {
    const urls = new Set();

    const walk = (value) => {
        if (!value || urls.size >= limit) return;

        if (
            typeof value === 'string' &&
            value.startsWith('http') &&
            value.includes('/storage/v1/object/')
        ) {
            urls.add(value);
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }

        if (typeof value === 'object') {
            Object.values(value).forEach(walk);
        }
    };

    walk(obj);
    return Array.from(urls);
}
// === /RBI FIX ===
// === RBI FIX: регулярная проверка облака даже без локальных изменений ===
function rbiIsRemotePollDue(intervalMs = 10 * 60 * 1000) {
    const last = Number(localStorage.getItem('rbi_sync_last_remote_check_at') || 0);
    return !last || (Date.now() - last) > intervalMs;
}

function rbiMarkCloudDirty() {
    localStorage.setItem('rbi_cloud_dirty', '1');
    localStorage.setItem('rbi_force_remote_poll', '1');
}

window.rbiMarkCloudDirty = rbiMarkCloudDirty;
// === RBI FIX: настройка автокэша офлайн-файлов ===
function rbiIsAutoCacheEnabled() {
    // Полное автокэширование запускаем только когда настройка явно включена.
    return typeof appSettings !== 'undefined' && appSettings.autoCacheCloudFiles === true;
}
// === /RBI FIX ===
// === /RBI FIX ===
// === RBI FIX: безопасные батчи для pull/push и кэширования файлов ===
async function rbiPullRowsByInspectionIds(tableName, ids, batchSize = 40) {
    const result = [];
    const cleanIds = Array.from(new Set((ids || []).map(x => String(x)).filter(Boolean)));

    for (let i = 0; i < cleanIds.length; i += batchSize) {
        const batchIds = cleanIds.slice(i, i + batchSize);

        const { data, error } = await window.supabaseClient
            .from(tableName)
            .select('*')
            .in('inspection_id', batchIds);

        if (error) {
            console.error(`[Sync] Ошибка pull ${tableName}, batch ${i}-${i + batchIds.length}:`, error);
            throw error;
        }

        if (Array.isArray(data)) result.push(...data);

        await new Promise(r => setTimeout(r, 20));
    }

    return result;
}

async function rbiUpsertBatches(tableName, rows, batchSize = 500, options = { onConflict: 'id' }) {
    if (!Array.isArray(rows) || rows.length === 0) return 0;

    let pushed = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const { error } = await window.supabaseClient
            .from(tableName)
            .upsert(batch, options);

        if (error) {
            console.error(`[Sync] Ошибка push ${tableName}, batch ${i}-${i + batch.length}:`, error);
            throw error;
        }

        pushed += batch.length;
        await new Promise(r => setTimeout(r, 20));
    }

    return pushed;
}

window.simpleHash = simpleHash;
window.safeToast = safeToast;
window.rbiEnqueueCloudFilesForCache = rbiEnqueueCloudFilesForCache;
window.rbiProcessBgCacheQueue = rbiProcessBgCacheQueue;
window.rbiCollectCloudStorageUrls = rbiCollectCloudStorageUrls;
window.rbiIsRemotePollDue = rbiIsRemotePollDue;
window.rbiIsAutoCacheEnabled = rbiIsAutoCacheEnabled;
window.rbiPullRowsByInspectionIds = rbiPullRowsByInspectionIds;
window.rbiUpsertBatches = rbiUpsertBatches;
window.syncTimeout = syncTimeout;
window.syncChannel = syncChannel;
window.SYNC_FULL_ACCESS_HASH = SYNC_FULL_ACCESS_HASH;
