/* Файл: js/storage.js */

const DB_NAME = 'RBI_QUALITY_DB';
// Повышаем версию только при изменении структуры IndexedDB
const DB_VERSION = 16;

// Глобально отдаём версию БД в интерфейс диагностики
window.RBI_DB_VERSION = DB_VERSION;

const STORES = {
    OBJECT_QUEUE: 'object_normalization_queue', // <-- ВСТАВИТЬ СЮДА
    STATE: 'app_state',
    HISTORY: 'app_history',
    SETTINGS: 'app_settings',
    TEMPLATES: 'user_templates',
    PHOTOS: 'app_photos',
    REPORTS: 'app_reports',
    REPORT_TEMPLATES: 'report_templates', // <-- ХРАНИЛИЩЕ ДЛЯ ДИЗАЙНА ОТЧЕТОВ
    TASKS: 'rbi_tasks',
    SCHEDULE: 'rbi_schedule_stages',
    MEETINGS: 'rbi_meetings',
    INTERVENTIONS: 'rbi_interventions',
    PRACTICES: 'rbi_practices',
    ETALON_ACTS: 'rbi_etalon_acts',
    ETALON_DRAFT: 'rbi_etalon_draft',
    FMEA: 'rbi_fmea',
    SK_IMPORTS: 'sk_imports',

    // ПК СК: единый реестр замечаний и журнал загрузок
    SK_RECORDS: 'sk_records',
    SK_IMPORT_BATCHES: 'sk_import_batches',

    // Старые справочники ПК СК — оставляем для совместимости
    SK_CONTRACTOR_MAP: 'sk_contractor_map',
    SK_VOLUMES: 'sk_volumes',
    SK_ISD_HISTORY: 'sk_isd_history',
    SK_CATEGORY_MAP: 'sk_category_map',
    SK_MAPPING: 'sk_mapping',

    // Новый справочник подрядчиков
    CONTRACTOR_DIRECTORY: 'contractor_directory',
    CONTRACTOR_ALIASES: 'contractor_aliases',
    CONTRACTOR_QUEUE: 'contractor_normalization_queue',      // <-- НОВОЕ
    PROJECT_OBJECTS: 'project_objects',
    OBJECT_ALIASES: 'object_aliases',   // <-- НОВОЕ
    BACKUP_LOGS: 'backup_logs',
    GAME_LOGS: 'game_logs',      // <-- НОВОЕ
    TWI_CARDS: 'twi_cards',
    CUSTOM_DOCS: 'custom_docs',
    CUSTOM_NODES: 'custom_nodes',
    FEEDBACK_LIST: 'feedback_list',
    ASSISTANT_KB: 'app_assistant_kb',
    FILE_REGISTRY: 'file_registry_cache',
    STORAGE_EVENTS: 'storage_events'
};

/**
/**
 /**
 * Инициализация и открытие базы данных IndexedDB (Singleton)
 */
let _dbPromise = null;

function openAppDb() {
    if (!_dbPromise) {
        _dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (event) {
                const db = event.target.result;

                // Создаем таблицы, если их нет
                Object.values(STORES).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        let keyOptions = { keyPath: 'id' };
                        if (storeName === STORES.STATE || storeName === STORES.SETTINGS) keyOptions = { keyPath: 'key' };
                        if (storeName === STORES.TEMPLATES) keyOptions = { keyPath: 'slug' };

                        db.createObjectStore(storeName, keyOptions);
                    }
                });
            };

            // ЕСЛИ БАЗА ЗАБЛОКИРОВАНА СТАРОЙ ВКЛАДКОЙ
            request.onblocked = function () {
                console.error("IndexedDB заблокирована! Закройте другие вкладки.");
                if (typeof showToast === 'function') showToast("⚠️ Закройте все вкладки приложения и откройте заново!");
                reject(new Error("БД заблокирована"));
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    _dbPromise = null;
                    if (typeof showToast === 'function') showToast('⚠️ База данных обновлена. Пожалуйста, перезагрузите страницу.');
                };
                resolve(db);
            };
            request.onerror = () => {
                _dbPromise = null; // Сбрасываем промис при ошибке
                reject(request.error);
            };
        });
    }
    return _dbPromise;
}
/**
 * ГЛОБАЛЬНЫЙ НОРМАЛИЗАТОР СИСТЕМНЫХ КЛЮЧЕЙ (JS vs Supabase)
 * Автоматически выравнивает camelCase и snake_case перед любым сохранением в базу.
 */
/**
 * ГЛОБАЛЬНЫЙ НОРМАЛИЗАТОР СИСТЕМНЫХ КЛЮЧЕЙ
 * Автоматически выравнивает структуру, добавляет проект и владельца перед любым сохранением.
 */
function normalizeSystemKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // 1. УНИВЕРСАЛЬНОЕ КЛЕЙМО ПРОЕКТА
    const pCode = window.syncConfig?.projectCode || 'LOCAL';
    if (!obj.project_code) obj.project_code = pCode;

    // 2. ВЛАДЕЛЕЦ (Критично для RLS политик Supabase)
    const currentEng = window.syncConfig?.engineerName || 'Инженер';
    const owner = obj.owner || obj.created_by || obj.author || obj.inspectorName || obj.engineer_name || currentEng;
    if (!obj.owner) obj.owner = owner;
    if (!obj.created_by) obj.created_by = owner;

    // 3. МЕТКИ УДАЛЕНИЯ (_deleted <-> is_deleted)
    const isDel = obj._deleted === true || obj.is_deleted === true;
    obj._deleted = isDel;
    obj.is_deleted = isDel;

    const delAt = obj._deletedAt || obj.deleted_at || null;
    if (delAt) {
        obj._deletedAt = delAt;
        obj.deleted_at = delAt;
    }

    // 4. СТАТУСЫ СИНХРОНИЗАЦИИ (syncStatus <-> sync_status)
    const sStatus = obj.syncStatus || obj.sync_status || 'not_synced';
    obj.syncStatus = sStatus;
    obj.sync_status = sStatus;

    const sReason = obj.syncBlockReason || obj.sync_block_reason || '';
    obj.syncBlockReason = sReason;
    obj.sync_block_reason = sReason;

    // 5. ВРЕМЕННЫЕ МЕТКИ (updatedAt <-> updated_at)
    const updAt = obj.updatedAt || obj.updated_at || new Date().toISOString();
    obj.updatedAt = updAt;
    obj.updated_at = updAt;

    const creAt = obj.createdAt || obj.created_at;
    if (creAt) {
        obj.createdAt = creAt;
        obj.created_at = creAt;
    }

    return obj;
}
/**
 * Базовые операции CRUD
 */
async function dbPut(storeName, data, retryAfterCleanup = true) {
    const db = await openAppDb();

    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const normalizedData = normalizeSystemKeys(data);

            store.put(normalizedData);

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        if (e && e.name === 'QuotaExceededError' && retryAfterCleanup) {
            console.warn('[DB] QuotaExceededError. Запускаем аварийную очистку...');

            if (window.RbiStorageManager) {
                await window.RbiStorageManager.runAdaptiveStorageCleanup('quota_exceeded');
            }

            return dbPut(storeName, data, false);
        }

        if (e && e.name === 'QuotaExceededError') {
            if (typeof showToast === 'function') {
                showToast('❌ Память устройства заполнена. Несинхронизированные файлы не удалены.');
            }
        }

        throw e;
    }
}
// МАССОВОЕ СОХРАНЕНИЕ (УСКОРЕНИЕ В 10 РАЗ)
async function dbPutBatch(storeName, itemsArray, retryAfterCleanup = true) {
    if (!itemsArray || itemsArray.length === 0) return true;

    const db = await openAppDb();

    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);

            itemsArray.forEach(item => {
                const normalizedItem = normalizeSystemKeys(item);
                store.put(normalizedItem);
            });

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        if (e && e.name === 'QuotaExceededError' && retryAfterCleanup) {
            console.warn('[DB] QuotaExceededError batch. Запускаем аварийную очистку...');

            if (window.RbiStorageManager) {
                await window.RbiStorageManager.runAdaptiveStorageCleanup('quota_exceeded');
            }

            return dbPutBatch(storeName, itemsArray, false);
        }

        if (e && e.name === 'QuotaExceededError') {
            if (typeof showToast === 'function') {
                showToast('❌ Память устройства заполнена. Автоочистка не смогла освободить достаточно места.');
            }
        }

        throw e;
    }
}
async function dbGet(storeName, key) {
    const db = await openAppDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbGetAll(storeName) {
    const db = await openAppDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        
        req.onsuccess = () => {
            let results = req.result || [];

            // --- ГЛОБАЛЬНАЯ ИЗОЛЯЦИЯ ПРОЕКТОВ ---
            const pCode = window.syncConfig?.projectCode || 'LOCAL';
            
            // Исключения: эти таблицы общие для всего телефона (настройки, логи, фото-кэш)
            const globalStores = [STORES.STATE, STORES.SETTINGS, STORES.PHOTOS, STORES.BACKUP_LOGS, STORES.GAME_LOGS];

            if (!globalStores.includes(storeName)) {
                results = results.filter(item => {
                    // Разрешаем системные шаблоны и узлы (они начинаются на sys_)
                    if (String(item.id).startsWith('sys_') || String(item.slug).startsWith('sys_')) return true;
                    
                    const itemProject = item.project_code || item.data?.project_code;
                    
                    // Пропускаем записи, если они принадлежат текущему проекту
                    // (или если project_code вообще пустой — это старые локальные данные до обновления)
                    return !itemProject || itemProject === pCode;
                });
            }
            // ------------------------------------

            resolve(results);
        };
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(storeName, key) {
    const db = await openAppDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

async function dbClear(storeName) {
    const db = await openAppDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

/**
 /**
 * Вспомогательные функции для работы с ArrayBuffer/Blob/Base64
 */
function base64ToBlob(base64, mimeType = 'image/jpeg') {
    if (!base64 || !base64.includes('base64,')) return null;
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// НОВЫЕ ФУНКЦИИ ДЛЯ v16.8.7 (Конвертация в бинарный формат ArrayBuffer)
async function blobToArrayBuffer(blob) {
    return await blob.arrayBuffer();
}
// RBI NEW: сетевое получение облачного файла без использования HTTP-кэша браузера.
// Это нужно, чтобы после очистки IndexedDB файл не "воскресал" офлайн из браузерного cache.
async function rbiFetchCloudFileNoBrowserCache(url) {
    if (!url || !String(url).startsWith('http')) {
        throw new Error('Некорректная облачная ссылка');
    }

    // Если браузер сам считает, что офлайн — сразу запрещаем восстановление.
    if (navigator.onLine === false) {
        throw new Error('Нет интернета для загрузки файла из облака');
    }

    return await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
    });
}

function arrayBufferToBlob(buffer, mimeType = 'image/webp') {
    return new Blob([buffer], { type: mimeType });
}

async function base64ToArrayBuffer(base64) {
    const mimeType = base64.match(/data:(.*?);/)[1] || 'image/webp';
    const blob = base64ToBlob(base64, mimeType);
    return await blobToArrayBuffer(blob);
}

async function arrayBufferToBase64(buffer, mimeType = 'image/webp') {
    const blob = arrayBufferToBlob(buffer, mimeType);
    return await blobToBase64(blob);
}

/**
 * Экспорт и Импорт данных (JSON и CSV)
 */
function exportToCSV(historyArray) {
    if (!historyArray || historyArray.length === 0) return null;

    // Добавляем BOM для правильного отображения кириллицы в Excel
    let csvContent = "\uFEFF";

    // Заголовки столбцов
    const headers = ['ID', 'Дата', 'Подрядчик', 'Вид работ', 'Локация', 'Инспектор', 'УрК (%)', 'Статус', 'Ошибки B1', 'Ошибки B2', 'Ошибки B3', 'Причина снижения'];
    csvContent += headers.join(";") + "\r\n";

    historyArray.forEach(item => {
        const dateStr = new Date(item.date).toLocaleString('ru-RU').replace(/,/g, '');
        const reason = item.metrics.reason ? item.metrics.reason.replace(/;/g, ',').replace(/\n/g, ' ') : '';
        const loc = item.location ? item.location.replace(/;/g, ',').replace(/\n/g, ' ') : '';

        const row = [
            item.id,
            dateStr,
            item.contractorName,
            item.templateTitle,
            loc,
            item.inspectorName,
            item.metrics.final,
            item.metrics.statusTxt,
            item.metrics.n_B1_fail,
            item.metrics.n_B2_fail,
            item.metrics.n_B3_fail,
            reason
        ];
        csvContent += row.join(";") + "\r\n";
    });

    return csvContent;
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
// =====================================================
// RBI NEW: Адаптивный менеджер файлового кэша
// Управляет только локальными копиями файлов в IndexedDB.
// НЕ удаляет записи проверок, TWI, документы и файлы из Supabase Storage.
// =====================================================

window.RbiStorageManager = {
    cleanupLock: false,

    async logEvent(type, payload = {}) {
        try {
            if (!STORES.STORAGE_EVENTS || typeof dbPut !== 'function') return;

            const event = {
                id: 'storage_event_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 10000),
                type,
                ...payload,
                createdAt: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            await dbPut(STORES.STORAGE_EVENTS, event);
        } catch (e) {
            console.warn('[StorageManager] Не удалось записать событие:', e);
        }
    },

    async getStorageSnapshot() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return {
                supported: false,
                usageBytes: 0,
                quotaBytes: 0,
                freeBytes: 0,
                usedMB: 0,
                quotaMB: 0,
                freeMB: 0,
                usagePercent: 0,
                mode: 'unknown'
            };
        }

        const estimate = await navigator.storage.estimate();

        let realBytes = 0;
        try {
            const files = await dbGetAll(STORES.PHOTOS);
            if (files) {
                files.forEach(f => {
                    if (f && f.data && f.data.byteLength) {
                        realBytes += f.data.byteLength;
                    }
                });
            }
        } catch (e) { }

        const usageBytes = Math.max(realBytes, estimate.usage || 0);
        const quotaBytes = estimate.quota || 0;
        const freeBytes = Math.max(0, quotaBytes - usageBytes);

        const usedMB = usageBytes / 1024 / 1024;
        const quotaMB = quotaBytes / 1024 / 1024;
        const freeMB = freeBytes / 1024 / 1024;
        const usagePercent = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

        let mode = 'keep_all';

        const settings = typeof appSettings !== 'undefined' ? appSettings : {};

        if (
            usagePercent >= (settings.storageCriticalThresholdPercent || 90) ||
            freeMB <= (settings.storageCriticalCleanupFreeMB || 250)
        ) {
            mode = 'critical_cleanup';
        } else if (
            usagePercent >= (settings.storageCleanupThresholdPercent || 80) ||
            freeMB <= (settings.storageNormalCleanupFreeMB || 500)
        ) {
            mode = 'normal_cleanup';
        } else if (
            usagePercent >= (settings.storageSoftThresholdPercent || 60) ||
            freeMB <= (settings.storageSoftCleanupFreeMB || 1000)
        ) {
            mode = 'soft_lifecycle';
        } else {
            mode = 'keep_all';
        }

        return {
            supported: true,
            usageBytes,
            quotaBytes,
            freeBytes,
            usedMB,
            quotaMB,
            freeMB,
            usagePercent,
            mode
        };
    },

    async getRecoverableCacheStats() {
        try {
            const files = await dbGetAll(STORES.PHOTOS) || [];
            const reports = await dbGetAll(STORES.REPORTS) || [];
            const registry = STORES.FILE_REGISTRY ? (await dbGetAll(STORES.FILE_REGISTRY) || []) : [];

            const registryByUrl = new Map();

            registry.forEach(r => {
                if (r.public_url) registryByUrl.set(r.public_url, r);
                if (r.publicUrl) registryByUrl.set(r.publicUrl, r);
                if (r.local_key) registryByUrl.set(r.local_key, r);
                if (r.localKey) registryByUrl.set(r.localKey, r);
            });

            let totalFiles = 0;
            let totalBytes = 0;

            let recoverableFiles = 0;
            let recoverableBytes = 0;

            let localOnlyFiles = 0;
            let localOnlyBytes = 0;

            let otherFiles = 0;
            let otherBytes = 0;

            let imageFiles = 0;
            let pdfFiles = 0;

            for (const file of files) {
                if (!file || !file.id || !file.data) continue;

                totalFiles++;

                const id = String(file.id || '');

                const sizeBytes =
                    file.sizeBytes ||
                    file.size_bytes ||
                    file.data.byteLength ||
                    0;

                totalBytes += sizeBytes;

                const mime =
                    file.mimeType ||
                    file.mime_type ||
                    '';

                if (String(mime).includes('image')) imageFiles++;
                if (String(mime).includes('pdf')) pdfFiles++;

                const sourceUrl =
                    file.sourceUrl ||
                    file.source_url ||
                    file.public_url ||
                    file.publicUrl ||
                    '';

                const registryItem =
                    registryByUrl.get(id) ||
                    registryByUrl.get(sourceUrl) ||
                    null;

                const registryUrl =
                    registryItem?.public_url ||
                    registryItem?.publicUrl ||
                    '';

                const hasCloudSource =
                    id.startsWith('http') ||
                    String(sourceUrl).startsWith('http') ||
                    String(registryUrl).startsWith('http');

                const isLocalOnly =
                    id.startsWith('local://') &&
                    !hasCloudSource;

                if (hasCloudSource) {
                    recoverableFiles++;
                    recoverableBytes += sizeBytes;
                } else if (isLocalOnly) {
                    localOnlyFiles++;
                    localOnlyBytes += sizeBytes;
                } else {
                    otherFiles++;
                    otherBytes += sizeBytes;
                }
            }
            // RBI NEW: учитываем PDF-отчеты, которые хранятся не в app_photos, а в app_reports.file_blob
            for (const rep of reports) {
                if (!rep || !rep.file_blob) continue;

                let reportSize = 0;

                try {
                    reportSize =
                        rep.file_blob.size ||
                        rep.file_size ||
                        rep.sizeBytes ||
                        rep.size_bytes ||
                        0;
                } catch (e) { }

                totalFiles++;
                totalBytes += reportSize;

                pdfFiles++;

                if (rep.file_url && String(rep.file_url).startsWith('http')) {
                    recoverableFiles++;
                    recoverableBytes += reportSize;
                } else {
                    otherFiles++;
                    otherBytes += reportSize;
                }
            }
            return {
                totalFiles,
                totalBytes,
                totalMB: totalBytes / 1024 / 1024,

                recoverableFiles,
                recoverableBytes,
                recoverableMB: recoverableBytes / 1024 / 1024,

                localOnlyFiles,
                localOnlyBytes,
                localOnlyMB: localOnlyBytes / 1024 / 1024,

                otherFiles,
                otherBytes,
                otherMB: otherBytes / 1024 / 1024,

                imageFiles,
                pdfFiles,

                lastCleanupAt: appSettings?.storageLastCleanupAt || null
            };

        } catch (e) {
            console.warn('[StorageManager] Не удалось посчитать статистику кэша:', e);
            return null;
        }
    },
    async requestPersistentStorageOnce() {
        try {
            if (!navigator.storage || !navigator.storage.persist || !navigator.storage.persisted) {
                return false;
            }

            if (typeof appSettings !== 'undefined' && appSettings.storagePersistentRequestedAt) {
                return !!appSettings.storagePersistentGranted;
            }

            const already = await navigator.storage.persisted();
            let granted = already;

            if (!already) {
                granted = await navigator.storage.persist();
            }

            if (typeof appSettings !== 'undefined') {
                appSettings.storagePersistentRequestedAt = new Date().toISOString();
                appSettings.storagePersistentGranted = granted === true;

                try {
                    await dbPut(STORES.SETTINGS, { key: 'app_settings', data: appSettings });
                } catch (e) { }
            }

            return granted === true;
        } catch (e) {
            console.warn('[StorageManager] Persistent storage недоступен:', e);
            return false;
        }
    },

    guessEntityTypeByUrl(url) {
        const s = String(url || '').toLowerCase();

        if (s.includes('/reports/')) return 'report_pdf';
        if (s.includes('inspection') || s.includes('inspection-photos')) return 'inspection_photo';
        if (s.includes('twi')) return 'twi_photo';
        if (s.includes('node')) return 'node_file';
        if (s.includes('practice')) return 'practice_file';
        if (s.includes('doc') || s.includes('library-docs')) return 'custom_doc_pdf';
        if (s.includes('assistant') || s.includes('kb')) return 'assistant_kb_file';

        return 'unknown_file';
    },

    getEvictionPriority(entityType, ageDays, sizeBytes) {
        let base = 0;

        if (entityType === 'report_pdf') {
            base += 1000;
        } else if (
            entityType === 'custom_doc_pdf' ||
            entityType === 'custom_doc_file' ||
            entityType === 'assistant_kb_file' ||
            entityType === 'knowledge_file'
        ) {
            base += 800;
        } else if (entityType === 'inspection_photo') {
            base += 700;
        } else if (entityType === 'practice_file') {
            base += 500;
        } else if (
            entityType === 'node_file' ||
            entityType === 'etalon_file'
        ) {
            base += 400;
        } else if (
            entityType === 'twi_file' ||
            entityType === 'twi_photo' ||
            entityType === 'twi_pdf'
        ) {
            base += 300;
        } else {
            base += 100;
        }

        base += Math.min(500, ageDays);
        base += Math.min(500, sizeBytes / 1024 / 1024);

        return base;
    },

    async upsertLocalFileRegistry(item) {
        if (!item || !item.id || !STORES.FILE_REGISTRY) return;

        const now = new Date().toISOString();

        const normalized = {
            ...item,
            updatedAt: now,
            updated_at: now
        };

        await dbPut(STORES.FILE_REGISTRY, normalized);
    },

    async syncFileRegistryFromCloud() {
        try {
            if (!window.supabaseClient || !window.syncConfig?.enabled || !STORES.FILE_REGISTRY) return 0;

            const pCode = window.syncConfig.projectCode || '';
            if (!pCode) return 0;

            const { data, error } = await window.supabaseClient
                .from('file_registry')
                .select('*')
                .eq('project_code', pCode)
                .eq('is_deleted', false)
                .limit(5000);

            if (error) throw error;

            let count = 0;

            for (const row of data || []) {
                await dbPut(STORES.FILE_REGISTRY, {
                    ...row,
                    id: row.id,
                    cacheStatus: row.cache_status || row.cacheStatus || 'cloud_only',
                    cache_status: row.cache_status || row.cacheStatus || 'cloud_only',
                    publicUrl: row.public_url || row.publicUrl || '',
                    public_url: row.public_url || row.publicUrl || '',
                    storagePath: row.storage_path || row.storagePath || '',
                    storage_path: row.storage_path || row.storagePath || ''
                });

                count++;
            }

            return count;
        } catch (e) {
            console.warn('[StorageManager] Не удалось синхронизировать file_registry:', e);
            return 0;
        }
    },
    async backfillLocalFileRegistryCache() {
        try {
            if (!STORES.FILE_REGISTRY || !STORES.PHOTOS) return 0;

            const files = await dbGetAll(STORES.PHOTOS) || [];
            const registry = await dbGetAll(STORES.FILE_REGISTRY) || [];

            const existingKeys = new Set();

            registry.forEach(r => {
                if (r.public_url) existingKeys.add(String(r.public_url));
                if (r.publicUrl) existingKeys.add(String(r.publicUrl));
                if (r.local_key) existingKeys.add(String(r.local_key));
                if (r.localKey) existingKeys.add(String(r.localKey));
            });

            let createdCount = 0;
            const now = new Date().toISOString();

            for (const file of files) {
                if (!file || !file.id || !file.data) continue;

                const id = String(file.id || '');
                const sourceUrl =
                    file.sourceUrl ||
                    file.source_url ||
                    file.public_url ||
                    file.publicUrl ||
                    '';

                const publicUrl = id.startsWith('http')
                    ? id
                    : String(sourceUrl).startsWith('http')
                        ? sourceUrl
                        : '';

                const localKey = id;
                const lookupKey = publicUrl || localKey;

                if (!lookupKey || existingKeys.has(lookupKey)) continue;

                const sizeBytes =
                    file.sizeBytes ||
                    file.size_bytes ||
                    file.data.byteLength ||
                    0;

                const mimeType =
                    file.mimeType ||
                    file.mime_type ||
                    'application/octet-stream';

                const entityType =
                    file.entityType ||
                    file.entity_type ||
                    this.guessEntityTypeByUrl(publicUrl || localKey);

                const isCloudBacked = !!publicUrl;

                await dbPut(STORES.FILE_REGISTRY, {
                    id: 'localreg_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 100000),

                    project_code: window.syncConfig?.projectCode || 'LOCAL',

                    entity_type: entityType,
                    entityType: entityType,

                    entity_id: file.entityId || file.entity_id || '',
                    entityId: file.entityId || file.entity_id || '',

                    field_path: file.fieldPath || file.field_path || '',
                    fieldPath: file.fieldPath || file.field_path || '',

                    bucket: '',
                    storage_path: '',
                    storagePath: '',

                    public_url: publicUrl,
                    publicUrl: publicUrl,

                    local_key: localKey,
                    localKey: localKey,

                    original_name: file.originalName || file.original_name || '',
                    originalName: file.originalName || file.original_name || '',

                    mime_type: mimeType,
                    mimeType: mimeType,

                    size_bytes: sizeBytes,
                    sizeBytes: sizeBytes,

                    uploaded_by: file.uploadedBy || file.uploaded_by || window.syncConfig?.engineerName || '',
                    uploadedBy: file.uploadedBy || file.uploaded_by || window.syncConfig?.engineerName || '',

                    uploaded_at: file.created_at || file.createdAt || now,
                    uploadedAt: file.created_at || file.createdAt || now,

                    cache_policy: 'auto',
                    cachePolicy: 'auto',

                    cache_status: isCloudBacked ? 'cached_cloud' : 'local_only',
                    cacheStatus: isCloudBacked ? 'cached_cloud' : 'local_only',

                    is_deleted: false,
                    isDeleted: false,

                    last_accessed_at: file.last_accessed_at || file.lastAccessedAt || now,
                    lastAccessedAt: file.last_accessed_at || file.lastAccessedAt || now,

                    last_local_cached_at: file.cached_at || file.cachedAt || now,
                    lastLocalCachedAt: file.cached_at || file.cachedAt || now,

                    last_local_cleanup_at: null,
                    lastLocalCleanupAt: null,

                    created_at: now,
                    createdAt: now,

                    updated_at: now,
                    updatedAt: now
                });

                existingKeys.add(lookupKey);
                createdCount++;
            }

            if (createdCount > 0) {
                await this.logEvent('local_file_registry_backfilled', {
                    createdCount
                });
            }

            return createdCount;

        } catch (e) {
            console.warn('[StorageManager] Не удалось выполнить backfill локального file_registry:', e);
            return 0;
        }
    },
    async registerUploadedFile(meta) {
        try {
            if (!meta || !meta.public_url || !meta.bucket || !meta.storage_path) {
                console.warn('[StorageManager] Недостаточно данных для регистрации файла:', meta);
                return null;
            }

            const pCode = meta.project_code || window.syncConfig?.projectCode || 'LOCAL';
            const now = new Date().toISOString();

            const payload = {
                project_code: pCode,

                entity_type: meta.entity_type || 'unknown_file',
                entity_id: meta.entity_id || '',
                field_path: meta.field_path || '',

                bucket: meta.bucket,
                storage_path: meta.storage_path,
                public_url: meta.public_url,

                original_name: meta.original_name || '',
                mime_type: meta.mime_type || '',
                size_bytes: meta.size_bytes || 0,

                uploaded_by: meta.uploaded_by || window.syncConfig?.engineerName || '',
                uploaded_at: meta.uploaded_at || now,

                cache_policy: meta.cache_policy || 'auto',
                cache_status: meta.cache_status || 'cached_cloud',

                is_deleted: false,

                last_accessed_at: meta.last_accessed_at || now,
                last_local_cached_at: meta.last_local_cached_at || now,
                last_local_cleanup_at: null,

                updated_at: now
            };

            let cloudRow = null;

            if (window.supabaseClient && window.syncConfig?.enabled) {
                const { data, error } = await window.supabaseClient
                    .from('file_registry')
                    .upsert(payload, { onConflict: 'bucket,storage_path' })
                    .select()
                    .single();

                if (error) {
                    console.error('[StorageManager] Ошибка записи file_registry:', error);
                    return null;
                }

                cloudRow = data;
                //console.log('[StorageManager] Файл зарегистрирован в file_registry:', cloudRow);
            }

            const localRow = {
                ...(cloudRow || payload),
                id: cloudRow?.id || meta.id || ('file_' + Date.now().toString(36)),
                cacheStatus: payload.cache_status,
                cache_status: payload.cache_status,
                publicUrl: payload.public_url,
                public_url: payload.public_url,
                storagePath: payload.storage_path,
                storage_path: payload.storage_path,
                updatedAt: now,
                updated_at: now
            };

            if (STORES.FILE_REGISTRY) {
                await dbPut(STORES.FILE_REGISTRY, localRow);
            }

            return localRow;
        } catch (e) {
            console.error('[StorageManager] Не удалось зарегистрировать файл:', e);
            return null;
        }
    },

    async updateAccessByUrl(url) {
        try {
            if (!url || !STORES.FILE_REGISTRY) return;

            const now = new Date().toISOString();
            const all = await dbGetAll(STORES.FILE_REGISTRY) || [];

            const found = all.find(f =>
                f.public_url === url ||
                f.publicUrl === url ||
                f.local_key === url ||
                f.localKey === url
            );

            if (found) {
                found.last_accessed_at = now;
                found.lastAccessedAt = now;
                found.updated_at = now;
                found.updatedAt = now;
                await dbPut(STORES.FILE_REGISTRY, found);
            }
        } catch (e) { }
    },

    async markCloudFileCached(url, sizeBytes = 0, mimeType = '') {
        try {
            if (!url || !STORES.FILE_REGISTRY) return;

            const now = new Date().toISOString();
            const all = await dbGetAll(STORES.FILE_REGISTRY) || [];

            const found = all.find(f =>
                f.public_url === url ||
                f.publicUrl === url ||
                f.local_key === url ||
                f.localKey === url
            );

            if (!found) return;

            found.cache_status = 'cached_cloud';
            found.cacheStatus = 'cached_cloud';

            found.last_accessed_at = now;
            found.lastAccessedAt = now;

            found.last_local_cached_at = now;
            found.lastLocalCachedAt = now;

            found.updated_at = now;
            found.updatedAt = now;

            if (sizeBytes > 0) {
                found.size_bytes = sizeBytes;
                found.sizeBytes = sizeBytes;
            }

            if (mimeType) {
                found.mime_type = mimeType;
                found.mimeType = mimeType;
            }
            if ((!found.size_bytes || found.size_bytes <= 0 || !found.mime_type) && typeof this.updateRegistryFileSizeByUrl === 'function') {
                await this.updateRegistryFileSizeByUrl(url, sizeBytes, mimeType);
            }

            await dbPut(STORES.FILE_REGISTRY, found);
        } catch (e) {
            console.warn('[StorageManager] Не удалось обновить статус кэша файла:', e);
        }
    },
    async updateRegistryFileSizeByUrl(url, sizeBytes = 0, mimeType = '') {
        try {
            if (!url || !STORES.FILE_REGISTRY) return false;

            const all = await dbGetAll(STORES.FILE_REGISTRY) || [];
            const found = all.find(f =>
                f.public_url === url ||
                f.publicUrl === url ||
                f.local_key === url ||
                f.localKey === url
            );

            if (!found) return false;

            const currentSize =
                found.size_bytes ||
                found.sizeBytes ||
                0;

            const currentMime =
                found.mime_type ||
                found.mimeType ||
                '';

            let nextSize = sizeBytes || currentSize || 0;
            let nextMime = mimeType || currentMime || '';

           // HEAD-запрос делаем только если это НЕ синхронизация (т.е. уже прошёл первый pull).
            // Во время первой синхронизации этот запрос блокирует поток на ~60 сек для каждого файла.
            // lastPullAt пустой при первой синхронизации.
            const isFirstSync = !localStorage.getItem('rbi_sync_last_pull_at');
            if ((!nextSize || nextSize <= 0) && navigator.onLine !== false && !isFirstSync) {
                try {
                    const res = await fetch(url, {
                        method: 'HEAD',
                        cache: 'no-store',
                        credentials: 'omit',
                        mode: 'cors'
                    });

                    if (res && res.ok) {
                        const len = parseInt(res.headers.get('content-length') || '0', 10);
                        const type = res.headers.get('content-type') || '';

                        if (len > 0) nextSize = len;
                        if (type) nextMime = type;
                    }
                } catch (e) { }
            }

            if (!nextSize && !nextMime) return false;

            const now = new Date().toISOString();

            found.size_bytes = nextSize || 0;
            found.sizeBytes = nextSize || 0;

            if (nextMime) {
                found.mime_type = nextMime;
                found.mimeType = nextMime;
            }

            found.updated_at = now;
            found.updatedAt = now;

            await dbPut(STORES.FILE_REGISTRY, found);

            if (window.supabaseClient && window.syncConfig?.enabled && found.bucket && found.storage_path) {
                try {
                    await window.supabaseClient
                        .from('file_registry')
                        .update({
                            size_bytes: found.size_bytes,
                            mime_type: found.mime_type || '',
                            updated_at: now
                        })
                        .eq('bucket', found.bucket)
                        .eq('storage_path', found.storage_path);
                } catch (e) {
                    console.warn('[StorageManager] Не удалось обновить размер файла в Supabase:', e);
                }
            }

            return true;

        } catch (e) {
            console.warn('[StorageManager] Не удалось обновить размер файла:', e);
            return false;
        }
    },
    async collectEvictionCandidates(mode = 'normal_cleanup') {
        const files = await dbGetAll(STORES.PHOTOS) || [];
        const registry = STORES.FILE_REGISTRY ? (await dbGetAll(STORES.FILE_REGISTRY) || []) : [];

        const registryByUrl = new Map();

        registry.forEach(r => {
            if (r.public_url) registryByUrl.set(r.public_url, r);
            if (r.publicUrl) registryByUrl.set(r.publicUrl, r);
            if (r.local_key) registryByUrl.set(r.local_key, r);
            if (r.localKey) registryByUrl.set(r.localKey, r);
        });

        const now = Date.now();
        const settings = typeof appSettings !== 'undefined' ? appSettings : {};
        const result = [];

        for (const file of files) {
            if (!file || !file.id || !file.data) continue;

            const isHttp = String(file.id).startsWith('http');
            const isLocalOnly = String(file.id).startsWith('local://') && !file.sourceUrl && !file.public_url;

            if (isLocalOnly) continue;

            const reg = registryByUrl.get(file.id) || null;

            const publicUrl =
                file.sourceUrl ||
                file.source_url ||
                file.public_url ||
                file.publicUrl ||
                reg?.public_url ||
                reg?.publicUrl ||
                (isHttp ? file.id : '');

            if (!publicUrl || !String(publicUrl).startsWith('http')) continue;

            const entityType =
                file.entityType ||
                file.entity_type ||
                reg?.entity_type ||
                reg?.entityType ||
                this.guessEntityTypeByUrl(publicUrl);

            const lastAccessRaw =
                file.lastAccessedAt ||
                file.last_accessed_at ||
                reg?.last_accessed_at ||
                reg?.lastAccessedAt ||
                file.cachedAt ||
                file.createdAt ||
                file.created_at ||
                '';

            const lastAccessTime = lastAccessRaw ? new Date(lastAccessRaw).getTime() : 0;
            const ageDays = lastAccessTime ? (now - lastAccessTime) / 86400000 : 9999;
            const sizeBytes = file.sizeBytes || file.size_bytes || file.data.byteLength || 0;

            let ttl = 60;

            if (entityType === 'inspection_photo') {
                ttl = settings.storageInspectionPhotoTtlDays || 60;
            } else if (
                entityType === 'assistant_kb_file' ||
                entityType === 'knowledge_file'
            ) {
                ttl = settings.storageKnowledgeFileTtlDays || 45;
            } else if (entityType === 'report_pdf') {
                ttl = settings.storageReportTtlDays || 30;
            } else if (
                entityType === 'twi_file' ||
                entityType === 'twi_photo' ||
                entityType === 'twi_pdf'
            ) {
                ttl = settings.storageTwiTtlDays || 90;
            } else if (entityType === 'node_file') {
                ttl = settings.storageNodeTtlDays || 90;
            } else if (entityType === 'etalon_file') {
                ttl = settings.storageNodeTtlDays || 90;
            } else if (entityType === 'practice_file') {
                ttl = settings.storagePracticeTtlDays || 60;
            } else if (
                entityType === 'custom_doc_pdf' ||
                entityType === 'custom_doc_file'
            ) {
                ttl = settings.storageDocTtlDays || 60;
            }

            const oldEnough = ageDays >= ttl;
            // RBI SAFETY: свежие файлы не удаляем, чтобы не ломать Offline-First после текущей работы
            const freshProtectionHours = 24;
            const isFreshFile = ageDays < (freshProtectionHours / 24);

            if (isFreshFile && mode !== 'critical_cleanup') {
                continue;
            }

            if (mode === 'soft_lifecycle' && !oldEnough) continue;

            result.push({
                id: file.id,
                publicUrl,
                entityType,
                ageDays,
                sizeBytes,
                priority: this.getEvictionPriority(entityType, ageDays, sizeBytes),
                registry: reg
            });
        }

        result.sort((a, b) => b.priority - a.priority);

        return result;
    },
    async previewAdaptiveStorageCleanup(reason = 'manual_preview') {
        try {
            const snapshot = await this.getStorageSnapshot();

            let mode = snapshot.mode || 'keep_all';

            // Для ручного предпросмотра показываем, что можно очистить,
            // даже если памяти сейчас достаточно.
            if (reason === 'manual_preview' && mode === 'keep_all') {
                mode = 'normal_cleanup';
            }

            const candidates = await this.collectEvictionCandidates(mode);

            let totalBytes = 0;
            let inspectionPhotos = 0;
            let reports = 0;
            let docs = 0;
            let twi = 0;
            let nodes = 0;
            let practices = 0;
            let etalons = 0;
            let other = 0;

            candidates.forEach(c => {
                totalBytes += c.sizeBytes || 0;

                if (c.entityType === 'inspection_photo') {
                    inspectionPhotos++;
                } else if (c.entityType === 'report_pdf') {
                    reports++;
                } else if (
                    c.entityType === 'custom_doc_pdf' ||
                    c.entityType === 'custom_doc_file' ||
                    c.entityType === 'assistant_kb_file' ||
                    c.entityType === 'knowledge_file'
                ) {
                    docs++;
                } else if (
                    c.entityType === 'twi_file' ||
                    c.entityType === 'twi_photo' ||
                    c.entityType === 'twi_pdf'
                ) {
                    twi++;
                } else if (c.entityType === 'node_file') {
                    nodes++;
                } else if (c.entityType === 'practice_file') {
                    practices++;
                } else if (c.entityType === 'etalon_file') {
                    etalons++;
                } else {
                    other++;
                }
            });

            // RBI NEW: отдельно учитываем PDF-отчеты из app_reports.file_blob
            try {
                const reportRows = await dbGetAll(STORES.REPORTS) || [];

                reportRows.forEach(rep => {
                    if (!rep || !rep.file_blob || !rep.file_url || !String(rep.file_url).startsWith('http')) return;

                    let reportSize = 0;

                    try {
                        reportSize =
                            rep.file_blob.size ||
                            rep.file_size ||
                            rep.sizeBytes ||
                            rep.size_bytes ||
                            0;
                    } catch (e) { }

                    totalBytes += reportSize;
                    reports++;
                });
            } catch (e) {
                console.warn('[StorageManager] Не удалось учесть PDF-отчеты в предпросмотре:', e);
            }

            return {
                reason,
                mode,
                usagePercent: snapshot.usagePercent || 0,
                freeMB: snapshot.freeMB || 0,
                candidatesCount: candidates.length,
                totalBytes,
                totalMB: totalBytes / 1024 / 1024,
                inspectionPhotos,
                reports,
                docs,
                twi,
                nodes,
                practices,
                etalons,
                other
            };

        } catch (e) {
            console.error('[StorageManager] Ошибка предпросмотра очистки:', e);
            return {
                error: e.message || String(e)
            };
        }
    },
    async evictLocalCopy(candidate) {
        if (!candidate || !candidate.id) return 0;

        const rec = await dbGet(STORES.PHOTOS, candidate.id);
        const freed = rec?.data?.byteLength || candidate.sizeBytes || 0;

        await dbDelete(STORES.PHOTOS, candidate.id);

        if (typeof PhotoManager !== 'undefined' && PhotoManager.cache && PhotoManager.cache[candidate.id]) {
            try {
                URL.revokeObjectURL(PhotoManager.cache[candidate.id]);
            } catch (e) { }

            delete PhotoManager.cache[candidate.id];
        }

        if (candidate.registry) {
            candidate.registry.cache_status = 'cloud_only';
            candidate.registry.cacheStatus = 'cloud_only';
            candidate.registry.last_local_cleanup_at = new Date().toISOString();
            candidate.registry.lastLocalCleanupAt = candidate.registry.last_local_cleanup_at;
            await dbPut(STORES.FILE_REGISTRY, candidate.registry);
        }

        await this.logEvent('file_evicted', {
            fileId: candidate.id,
            publicUrl: candidate.publicUrl,
            entityType: candidate.entityType,
            sizeBytes: freed
        });

        return freed;
    },

    async runManualRecoverableCacheCleanup() {
        if (this.cleanupLock) {
            if (typeof showToast === 'function') showToast('⏳ Очистка уже выполняется...');
            return { skipped: true, reason: 'locked' };
        }

        this.cleanupLock = true;

        try {
            if (typeof PhotoManager !== 'undefined' && typeof PhotoManager.clearMemory === 'function') {
                PhotoManager.clearMemory();
            }

            const files = await dbGetAll(STORES.PHOTOS) || [];
            const registry = STORES.FILE_REGISTRY ? (await dbGetAll(STORES.FILE_REGISTRY) || []) : [];

            const registryByUrl = new Map();

            registry.forEach(r => {
                if (r.public_url) registryByUrl.set(r.public_url, r);
                if (r.publicUrl) registryByUrl.set(r.publicUrl, r);
                if (r.local_key) registryByUrl.set(r.local_key, r);
                if (r.localKey) registryByUrl.set(r.localKey, r);
            });

            let deletedCount = 0;
            let freedBytes = 0;
            let skippedLocalOnly = 0;

            for (const file of files) {
                if (!file || !file.id || !file.data) continue;

                const id = String(file.id || '');

                const sourceUrl =
                    file.sourceUrl ||
                    file.source_url ||
                    file.public_url ||
                    file.publicUrl ||
                    '';

                const registryItem =
                    registryByUrl.get(id) ||
                    registryByUrl.get(sourceUrl) ||
                    null;

                const registryUrl =
                    registryItem?.public_url ||
                    registryItem?.publicUrl ||
                    '';

                const cloudUrl =
                    id.startsWith('http') ? id :
                        String(sourceUrl).startsWith('http') ? sourceUrl :
                            String(registryUrl).startsWith('http') ? registryUrl :
                                '';

                const isLocalOnly =
                    id.startsWith('local://') &&
                    !cloudUrl;

                // Offline-First защита:
                // локальные несинхронизированные файлы без облачного источника не удаляем.
                if (isLocalOnly) {
                    skippedLocalOnly++;
                    continue;
                }

                // Удаляем только восстановимые локальные копии.
                if (!cloudUrl) continue;

                const sizeBytes =
                    file.sizeBytes ||
                    file.size_bytes ||
                    file.data.byteLength ||
                    0;

                await dbDelete(STORES.PHOTOS, file.id);

                if (registryItem) {
                    registryItem.cache_status = 'cloud_only';
                    registryItem.cacheStatus = 'cloud_only';
                    registryItem.last_local_cleanup_at = new Date().toISOString();
                    registryItem.lastLocalCleanupAt = registryItem.last_local_cleanup_at;

                    await dbPut(STORES.FILE_REGISTRY, registryItem);
                }

                deletedCount++;
                freedBytes += sizeBytes;

                await this.logEvent('manual_file_evicted', {
                    fileId: file.id,
                    publicUrl: cloudUrl,
                    entityType: file.entityType || file.entity_type || registryItem?.entity_type || this.guessEntityTypeByUrl(cloudUrl),
                    sizeBytes
                });
            }

            if (typeof PhotoManager !== 'undefined' && typeof PhotoManager.clearMemory === 'function') {
                PhotoManager.clearMemory();
            }
            // RBI NEW: очищаем локальные PDF-отчеты из app_reports.
            // Метаданные отчета и file_url остаются, удаляется только тяжелый file_blob.
            try {
                const reports = await dbGetAll(STORES.REPORTS) || [];

                for (const rep of reports) {
                    if (!rep || !rep.file_blob || !rep.file_url || !String(rep.file_url).startsWith('http')) continue;

                    let reportSize = 0;

                    try {
                        reportSize =
                            rep.file_blob.size ||
                            rep.file_size ||
                            rep.sizeBytes ||
                            rep.size_bytes ||
                            0;
                    } catch (e) { }

                    rep.file_blob = null;
                    rep.cache_status = 'cloud_only';
                    rep.cacheStatus = 'cloud_only';
                    rep.updatedAt = new Date().toISOString();
                    rep.updated_at = rep.updatedAt;

                    await dbPut(STORES.REPORTS, rep);

                    // Обновляем массив в памяти, чтобы интерфейс не держал старый blob до перезагрузки
                    if (typeof reportsArray !== 'undefined' && Array.isArray(reportsArray)) {
                        const idx = reportsArray.findIndex(r => String(r.id) === String(rep.id));
                        if (idx >= 0) {
                            reportsArray[idx] = {
                                ...reportsArray[idx],
                                file_blob: null,
                                cache_status: 'cloud_only',
                                cacheStatus: 'cloud_only',
                                updatedAt: rep.updatedAt,
                                updated_at: rep.updated_at
                            };
                        }
                    }

                    const reportRegistryItem =
                        registryByUrl.get(rep.file_url) ||
                        null;

                    if (reportRegistryItem) {
                        reportRegistryItem.cache_status = 'cloud_only';
                        reportRegistryItem.cacheStatus = 'cloud_only';
                        reportRegistryItem.last_local_cleanup_at = new Date().toISOString();
                        reportRegistryItem.lastLocalCleanupAt = reportRegistryItem.last_local_cleanup_at;
                        reportRegistryItem.updated_at = reportRegistryItem.last_local_cleanup_at;
                        reportRegistryItem.updatedAt = reportRegistryItem.updated_at;

                        await dbPut(STORES.FILE_REGISTRY, reportRegistryItem);
                    }

                    deletedCount++;
                    freedBytes += reportSize;

                    await this.logEvent('manual_report_blob_evicted', {
                        fileId: rep.id,
                        publicUrl: rep.file_url,
                        entityType: 'report_pdf',
                        sizeBytes: reportSize
                    });
                }
            } catch (e) {
                console.warn('[StorageManager] Не удалось очистить локальные PDF-отчеты:', e);
            }
            await this.logEvent('manual_recoverable_cleanup_completed', {
                deletedCount,
                freedBytes,
                skippedLocalOnly
            });
            if (typeof appSettings !== 'undefined') {
                appSettings.storageLastCleanupAt = new Date().toISOString();

                try {
                    await dbPut(STORES.SETTINGS, { key: 'app_settings', data: appSettings });
                } catch (e) { }
            }

            if (typeof updateStorageInfo === 'function') updateStorageInfo();

            if (typeof showToast === 'function') {
                showToast(
                    `✅ Очищено ${(freedBytes / 1024 / 1024).toFixed(1)} МБ. ` +
                    `Удалено локальных копий: ${deletedCount}. ` +
                    `Несинхронизированные: ${skippedLocalOnly} не тронуты.`
                );
            }

            return {
                deletedCount,
                freedBytes,
                skippedLocalOnly
            };

        } catch (e) {
            console.error('[StorageManager] Ошибка ручной очистки:', e);

            if (typeof showToast === 'function') {
                showToast('❌ Ошибка при очистке кэша');
            }

            return { error: e };
        } finally {
            this.cleanupLock = false;
        }
    },
    async cleanupReportBlobsByTtl(mode = 'normal_cleanup') {
        try {
            const reports = await dbGetAll(STORES.REPORTS) || [];
            const registry = STORES.FILE_REGISTRY ? (await dbGetAll(STORES.FILE_REGISTRY) || []) : [];

            const registryByUrl = new Map();

            registry.forEach(r => {
                if (r.public_url) registryByUrl.set(r.public_url, r);
                if (r.publicUrl) registryByUrl.set(r.publicUrl, r);
            });

            const settings = typeof appSettings !== 'undefined' ? appSettings : {};
            const ttlDays = settings.storageReportTtlDays || 30;
            const now = Date.now();

            let deletedCount = 0;
            let freedBytes = 0;

            for (const rep of reports) {
                if (!rep || !rep.file_blob || !rep.file_url || !String(rep.file_url).startsWith('http')) continue;

                const lastAccessRaw =
                    rep.lastAccessedAt ||
                    rep.last_accessed_at ||
                    rep.cachedAt ||
                    rep.cached_at ||
                    rep.updatedAt ||
                    rep.updated_at ||
                    rep.createdAt ||
                    rep.created_at ||
                    '';

                const lastAccessTime = lastAccessRaw ? new Date(lastAccessRaw).getTime() : 0;
                const ageDays = lastAccessTime ? (now - lastAccessTime) / 86400000 : 9999;

                // Не удаляем свежие отчеты в первые 24 часа, кроме аварийного режима
                if (ageDays < 1 && mode !== 'critical_cleanup') {
                    continue;
                }

                // В мягком и нормальном режиме уважаем TTL
                if ((mode === 'soft_lifecycle' || mode === 'normal_cleanup') && ageDays < ttlDays) {
                    continue;
                }

                let reportSize = 0;

                try {
                    reportSize =
                        rep.file_blob.size ||
                        rep.file_size ||
                        rep.sizeBytes ||
                        rep.size_bytes ||
                        0;
                } catch (e) { }

                rep.file_blob = null;
                rep.cache_status = 'cloud_only';
                rep.cacheStatus = 'cloud_only';
                rep.last_local_cleanup_at = new Date().toISOString();
                rep.lastLocalCleanupAt = rep.last_local_cleanup_at;
                rep.updatedAt = rep.last_local_cleanup_at;
                rep.updated_at = rep.updatedAt;

                await dbPut(STORES.REPORTS, rep);

                if (typeof reportsArray !== 'undefined' && Array.isArray(reportsArray)) {
                    const idx = reportsArray.findIndex(r => String(r.id) === String(rep.id));

                    if (idx >= 0) {
                        reportsArray[idx] = {
                            ...reportsArray[idx],
                            file_blob: null,
                            cache_status: 'cloud_only',
                            cacheStatus: 'cloud_only',
                            last_local_cleanup_at: rep.last_local_cleanup_at,
                            lastLocalCleanupAt: rep.lastLocalCleanupAt,
                            updatedAt: rep.updatedAt,
                            updated_at: rep.updated_at
                        };
                    }
                }

                const registryItem = registryByUrl.get(rep.file_url);

                if (registryItem) {
                    registryItem.cache_status = 'cloud_only';
                    registryItem.cacheStatus = 'cloud_only';
                    registryItem.last_local_cleanup_at = new Date().toISOString();
                    registryItem.lastLocalCleanupAt = registryItem.last_local_cleanup_at;
                    registryItem.updated_at = registryItem.last_local_cleanup_at;
                    registryItem.updatedAt = registryItem.updated_at;

                    await dbPut(STORES.FILE_REGISTRY, registryItem);
                }

                deletedCount++;
                freedBytes += reportSize;

                await this.logEvent('auto_report_blob_evicted', {
                    fileId: rep.id,
                    publicUrl: rep.file_url,
                    entityType: 'report_pdf',
                    ageDays,
                    sizeBytes: reportSize,
                    mode
                });
            }

            return {
                deletedCount,
                freedBytes
            };

        } catch (e) {
            console.warn('[StorageManager] Не удалось выполнить автоочистку PDF-отчетов:', e);

            return {
                deletedCount: 0,
                freedBytes: 0,
                error: e
            };
        }
    },

    async runAdaptiveStorageCleanup(reason = 'scheduled') {
        if (this.cleanupLock) return { skipped: true, reason: 'locked' };

        const settings = typeof appSettings !== 'undefined' ? appSettings : {};
        if (settings.storageAutoCleanupEnabled === false) return { skipped: true, reason: 'disabled' };

        this.cleanupLock = true;

        try {
            const lastCleanup = settings.storageLastCleanupAt ? new Date(settings.storageLastCleanupAt).getTime() : 0;
            const now = Date.now();

            if (reason !== 'quota_exceeded' && lastCleanup && (now - lastCleanup) < 6 * 60 * 60 * 1000) {
                return { skipped: true, reason: 'too_early' };
            }

            const snapshot = await this.getStorageSnapshot();

            if (snapshot.mode === 'keep_all' && reason !== 'quota_exceeded') {
                return { skipped: true, reason: 'enough_space', snapshot };
            }

            await this.logEvent('cleanup_started', { reason, mode: snapshot.mode });

            const candidates = await this.collectEvictionCandidates(snapshot.mode);

            let targetFreeBytes = 0;

            if (snapshot.mode === 'soft_lifecycle') targetFreeBytes = 150 * 1024 * 1024;
            else if (snapshot.mode === 'normal_cleanup') targetFreeBytes = 500 * 1024 * 1024;
            else if (snapshot.mode === 'critical_cleanup' || reason === 'quota_exceeded') targetFreeBytes = 1024 * 1024 * 1024;

            let freedBytes = 0;
            let deletedCount = 0;

            for (const c of candidates) {
                if (freedBytes >= targetFreeBytes && reason !== 'quota_exceeded') break;

                const freed = await this.evictLocalCopy(c);

                if (freed > 0) {
                    freedBytes += freed;
                    deletedCount++;
                }
            }

            // RBI NEW: автоочистка локальных PDF-blob отчетов из app_reports.
            // Отчеты хранятся отдельно от app_photos, поэтому чистим их отдельным безопасным методом.
            if (
                typeof this.cleanupReportBlobsByTtl === 'function' &&
                (freedBytes < targetFreeBytes || snapshot.mode === 'critical_cleanup' || reason === 'quota_exceeded')
            ) {
                const reportCleanup = await this.cleanupReportBlobsByTtl(snapshot.mode);

                if (reportCleanup && !reportCleanup.error) {
                    freedBytes += reportCleanup.freedBytes || 0;
                    deletedCount += reportCleanup.deletedCount || 0;
                }
            }

            if (typeof appSettings !== 'undefined') {
                appSettings.storageLastCleanupAt = new Date().toISOString();

                try {
                    await dbPut(STORES.SETTINGS, { key: 'app_settings', data: appSettings });
                } catch (e) { }
            }

            await this.logEvent('cleanup_completed', {
                reason,
                mode: snapshot.mode,
                deletedCount,
                freedBytes
            });

            if (deletedCount > 0 && reason === 'quota_exceeded' && typeof showToast === 'function') {
                showToast(`🧹 Освобождено ${(freedBytes / 1024 / 1024).toFixed(1)} МБ. Данные проверок сохранены.`);
            }

            if (typeof updateStorageInfo === 'function') updateStorageInfo();

            return {
                skipped: false,
                deletedCount,
                freedBytes,
                snapshot
            };

        } catch (e) {
            console.error('[StorageManager] Ошибка автоочистки:', e);
            await this.logEvent('cleanup_error', { reason, message: e.message || String(e) });
            return { error: e };
        } finally {
            this.cleanupLock = false;
        }
    }
};
/**
 * Статистика хранилища (Свободное место на устройстве)
 */
async function getStorageStats() {
    if (window.RbiStorageManager && typeof window.RbiStorageManager.getStorageSnapshot === 'function') {
        try {
            const snap = await window.RbiStorageManager.getStorageSnapshot();

            return {
                supported: snap.supported,
                usedMB: snap.usedMB.toFixed(1),
                quotaMB: snap.quotaMB.toFixed(1),
                freeMB: snap.freeMB.toFixed(1),
                percentUsed: snap.usagePercent.toFixed(1),
                mode: snap.mode,
                status: snap.freeMB > 1000 ? 'good' : (snap.freeMB > 300 ? 'warning' : 'critical')
            };
        } catch (e) {
            return { supported: false, message: 'Ошибка доступа' };
        }
    }

    if (!navigator.storage || !navigator.storage.estimate) {
        return { supported: false, message: 'Не поддерживается', usedMB: 0, quotaMB: 0, freeMB: 0, percentUsed: 0 };
    }

    try {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
        const quotaMB = (estimate.quota / 1024 / 1024).toFixed(1);
        const freeMB = ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(1);
        const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

        return {
            supported: true,
            usedMB,
            quotaMB,
            freeMB,
            percentUsed,
            status: parseFloat(freeMB) > 1000 ? 'good' : (parseFloat(freeMB) > 300 ? 'warning' : 'critical')
        };
    } catch (e) {
        return { supported: false, message: 'Ошибка доступа' };
    }
}
/**
 * ОТОБРАЖЕНИЕ СТАТИСТИКИ ХРАНИЛИЩА (Для вкладки Настройки)
 */
/**
 * ОТОБРАЖЕНИЕ СТАТИСТИКИ ХРАНИЛИЩА (Для вкладки Настройки)
 */
async function updateStorageInfo() {
    const sUsed = document.getElementById('storage-used');
    const sFree = document.getElementById('storage-free');
    const sPercent = document.getElementById('storage-percent');
    const sBar = document.getElementById('storage-bar');

    if (!sUsed || !navigator.storage || !navigator.storage.estimate) return;

    try {
        const estimate = await navigator.storage.estimate();

        // Считаем РЕАЛЬНЫЙ физический вес фотографий в базе данных (в байтах)
        let realBytes = 0;
        try {
            const photos = await dbGetAll(STORES.PHOTOS);
            if (photos) {
                photos.forEach(p => {
                    if (p.data && p.data.byteLength) realBytes += p.data.byteLength;
                });
            }
        } catch (e) { }

        // Базовая квота диска, выделенная браузером
        const quotaMB = estimate.quota / 1024 / 1024;

        // Оценка браузера (Включает кэш приложения, шрифты, системный мусор SQLite)
        const browserUsedMB = estimate.usage / 1024 / 1024;

        // Используем реальный вес фоток (так как они занимают 99% базы)
        let actualUsedMB = realBytes / 1024 / 1024;
        // Если фотки весят меньше мегабайта (пусто), берем вес каркаса приложения из кэша
        if (actualUsedMB < 1) actualUsedMB = browserUsedMB;

        const usedStr = actualUsedMB.toFixed(1);
        const freeMB = (quotaMB - actualUsedMB).toFixed(1);
        const percentUsed = ((actualUsedMB / quotaMB) * 100).toFixed(1);

        sUsed.innerText = usedStr;
        sFree.innerText = freeMB;
        sPercent.innerText = `${percentUsed}%`;
        sBar.style.width = `${percentUsed}%`;

        // Меняем цвет полоски, если места мало
        if (parseFloat(percentUsed) > 80) sBar.className = 'h-full bg-red-500 transition-all';
        else if (parseFloat(percentUsed) > 50) sBar.className = 'h-full bg-yellow-500 transition-all';
        else sBar.className = 'h-full bg-indigo-500 transition-all';
        // --- ПАНЕЛЬ ДИАГНОСТИКИ ---
        let diagBlock = document.getElementById('rbi-diagnostics-block');
        if (!diagBlock) {
            const storageContainer = sBar.closest('.p-4');
            if (storageContainer) {
                storageContainer.insertAdjacentHTML('beforeend', '<div id="rbi-diagnostics-block" class="mt-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-500 font-mono leading-relaxed"></div>');
                diagBlock = document.getElementById('rbi-diagnostics-block');
            }
        }
        if (diagBlock) {
            const histCount = typeof contractorArray !== 'undefined' ? contractorArray.length : 0;
            const notSyncedCount = typeof contractorArray !== 'undefined'
                ? contractorArray.filter(c => c.syncStatus !== 'synced' && c.sync_status !== 'synced').length
                : 0;

            const lastSync = localStorage.getItem('rbi_sync_last_push_at');
            const syncText = lastSync ? new Date(lastSync).toLocaleString('ru-RU') : 'Никогда';

            const versionInfo = window.RBI_APP_VERSION || {};
            const appVersion = versionInfo.app || '—';
            const swVersion = versionInfo.sw || '—';
            const dbVersion = window.RBI_DB_VERSION || '—';
            const buildDate = versionInfo.buildDate || '—';

            let cacheStatsHtml = '';

            try {
                const localFiles = await dbGetAll(STORES.PHOTOS) || [];

                let totalFiles = 0;
                let totalBytes = 0;
                let imageFiles = 0;
                let pdfFiles = 0;
                let recoverableFiles = 0;
                let recoverableBytes = 0;
                let localOnlyFiles = 0;
                let localOnlyBytes = 0;

                for (const f of localFiles) {
                    if (!f || !f.id || !f.data) continue;

                    totalFiles++;

                    const id = String(f.id || '');
                    const sizeBytes =
                        f.sizeBytes ||
                        f.size_bytes ||
                        f.data.byteLength ||
                        0;

                    const mime =
                        f.mimeType ||
                        f.mime_type ||
                        '';

                    const sourceUrl =
                        f.sourceUrl ||
                        f.source_url ||
                        f.public_url ||
                        f.publicUrl ||
                        '';

                    totalBytes += sizeBytes;

                    if (String(mime).includes('image')) imageFiles++;
                    if (String(mime).includes('pdf')) pdfFiles++;

                    const hasCloudSource =
                        id.startsWith('http') ||
                        String(sourceUrl).startsWith('http');

                    const isLocalOnly =
                        id.startsWith('local://') &&
                        !hasCloudSource;

                    if (hasCloudSource) {
                        recoverableFiles++;
                        recoverableBytes += sizeBytes;
                    } else if (isLocalOnly) {
                        localOnlyFiles++;
                        localOnlyBytes += sizeBytes;
                    }
                }

                cacheStatsHtml = `
            <br><b>Файловый кэш:</b><br>
            Всего локальных файлов: ${totalFiles} шт. / ${(totalBytes / 1024 / 1024).toFixed(1)} МБ<br>
            Фото: ${imageFiles} шт.; PDF: ${pdfFiles} шт.<br>
            Можно безопасно очистить: ${recoverableFiles} шт. / ${(recoverableBytes / 1024 / 1024).toFixed(1)} МБ<br>
            Только локальные, не удаляются: ${localOnlyFiles} шт. / ${(localOnlyBytes / 1024 / 1024).toFixed(1)} МБ<br>
        `;
            } catch (e) {
                cacheStatsHtml = '<br><b>Файловый кэш:</b><br>Статистика временно недоступна<br>';
            }

            const lastCleanupText = appSettings && appSettings.storageLastCleanupAt
                ? new Date(appSettings.storageLastCleanupAt).toLocaleString('ru-RU')
                : 'Не выполнялась';

            diagBlock.innerHTML = `
        <b>Диагностика системы:</b><br>
        Версия приложения: v${appVersion}<br>
        Service Worker: v${swVersion}<br>
        БД IndexedDB: v${dbVersion}<br>
        Сборка: ${buildDate}<br>
        Последняя очистка кэша:<br>${lastCleanupText}<br>
        База проверок: ${histCount} шт.<br>
        Ожидают отправки: ${notSyncedCount} шт.<br>
        Последний контакт с облаком:<br>${syncText}
        ${cacheStatsHtml}
    `;
        }
    } catch (e) {
        sUsed.innerText = 'н/д';
        sFree.innerText = 'н/д';
    }
}

/**
/**
 * ГЛОБАЛЬНЫЙ МЕНЕДЖЕР ФОТОГРАФИЙ И ФАЙЛОВ (Умный кэш и Офлайн)
 */
const PhotoManager = {
    cache: {},
    activeUrls: new Set(),

    async init() {
        console.log(`[PhotoManager] Инициализация`);
    },

    async saveLocal(base64Data, prefix = 'img', meta = {}) {
        if (!base64Data || !base64Data.startsWith('data:')) return base64Data;

        const id = 'local://' + prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000);
        const mimeType = base64Data.match(/data:(.*?);/)?.[1] || 'image/webp';
        const buffer = await base64ToArrayBuffer(base64Data);
        const now = new Date().toISOString();

        await dbPut(STORES.PHOTOS, {
            id,
            data: buffer,
            mimeType,
            mime_type: mimeType,
            sizeBytes: buffer.byteLength,
            size_bytes: buffer.byteLength,
            createdAt: now,
            created_at: now,
            cachedAt: now,
            cached_at: now,
            lastAccessedAt: now,
            last_accessed_at: now,
            sourceUrl: meta.sourceUrl || '',
            source_url: meta.sourceUrl || '',
            entityType: meta.entityType || meta.entity_type || 'local_file',
            entity_type: meta.entityType || meta.entity_type || 'local_file',
            entityId: meta.entityId || meta.entity_id || '',
            entity_id: meta.entityId || meta.entity_id || '',
            fieldPath: meta.fieldPath || meta.field_path || '',
            field_path: meta.fieldPath || meta.field_path || '',
            cacheStatus: meta.cacheStatus || meta.cache_status || 'local_only',
            cache_status: meta.cacheStatus || meta.cache_status || 'local_only'
        });

        const blob = arrayBufferToBlob(buffer, mimeType);
        const url = URL.createObjectURL(blob);

        this.cache[id] = url;
        this.activeUrls.add(url);

        return id;
    },

    getSrc(url) {
        if (!url) return '';

        if (this.cache[url]) return this.cache[url];

        // local:// и cloud:// нельзя отдавать напрямую в img.src
        if (String(url).startsWith('local://') || String(url).startsWith('cloud://')) {
            return window.rbiPhotoPlaceholder || '';
        }

        // http оставляем только для старых мест интерфейса.
        return url;
    },

    async getAsyncUrl(localIdOrHttp) {
        if (!localIdOrHttp) return null;

        if (this.cache[localIdOrHttp]) {
            return this.cache[localIdOrHttp];
        }

        try {
            const record = await dbGet(STORES.PHOTOS, localIdOrHttp);

            if (record && record.data) {
                const now = new Date().toISOString();

                record.lastAccessedAt = now;
                record.last_accessed_at = now;
                await dbPut(STORES.PHOTOS, record);

                if (window.RbiStorageManager && typeof window.RbiStorageManager.markCloudFileCached === 'function') {
                    await window.RbiStorageManager.markCloudFileCached(
                        localIdOrHttp,
                        record.sizeBytes || record.size_bytes || record.data.byteLength || 0,
                        record.mimeType || record.mime_type || 'image/webp'
                    );
                } else if (window.RbiStorageManager && typeof window.RbiStorageManager.updateAccessByUrl === 'function') {
                    window.RbiStorageManager.updateAccessByUrl(localIdOrHttp);
                }

                const blob = arrayBufferToBlob(record.data, record.mimeType || record.mime_type || 'image/webp');
                const url = URL.createObjectURL(blob);

                this.cache[localIdOrHttp] = url;
                this.activeUrls.add(url);

                return url;
            }

            if (String(localIdOrHttp).startsWith('http')) {
                if (!navigator.onLine) {
                    return null;
                }

                const res = await rbiFetchCloudFileNoBrowserCache(localIdOrHttp);
                if (!res.ok) return null;

                const blob = await res.blob();
                const buffer = await blobToArrayBuffer(blob);
                const now = new Date().toISOString();

                await dbPut(STORES.PHOTOS, {
                    id: localIdOrHttp,
                    data: buffer,
                    mimeType: blob.type || 'image/jpeg',
                    mime_type: blob.type || 'image/jpeg',
                    sizeBytes: buffer.byteLength,
                    size_bytes: buffer.byteLength,
                    createdAt: now,
                    created_at: now,
                    cachedAt: now,
                    cached_at: now,
                    lastAccessedAt: now,
                    last_accessed_at: now,
                    sourceUrl: localIdOrHttp,
                    source_url: localIdOrHttp,
                    cacheStatus: 'cached_cloud',
                    cache_status: 'cached_cloud',
                    entityType: window.RbiStorageManager ? window.RbiStorageManager.guessEntityTypeByUrl(localIdOrHttp) : 'unknown_file',
                    entity_type: window.RbiStorageManager ? window.RbiStorageManager.guessEntityTypeByUrl(localIdOrHttp) : 'unknown_file'
                });



                if (window.RbiStorageManager && typeof window.RbiStorageManager.updateAccessByUrl === 'function') {
                    window.RbiStorageManager.updateAccessByUrl(localIdOrHttp);
                }

                const localUrl = URL.createObjectURL(blob);

                this.cache[localIdOrHttp] = localUrl;
                this.activeUrls.add(localUrl);

                return localUrl;
            }

        } catch (e) {
            console.error("Ошибка загрузки фото", e);
        }

        // ВАЖНО: если локальной копии нет, не возвращаем обратно local:// или https://.
        // Иначе браузер может показать фото из своего HTTP-кэша, и тест очистки будет нечестным.
        return null;
    },
    async getBase64(localIdOrHttp) {
        if (!localIdOrHttp) return null;

        const value = String(localIdOrHttp);

        if (value.startsWith('data:')) {
            return value;
        }

        try {
            // 1. Пробуем взять файл из IndexedDB по ключу local:// или http-url
            const record = await dbGet(STORES.PHOTOS, localIdOrHttp);

            if (record && record.data) {
                const blob = arrayBufferToBlob(
                    record.data,
                    record.mimeType || record.mime_type || 'image/webp'
                );

                return await blobToBase64(blob);
            }

            // 2. Если это обычная ссылка на Storage — скачиваем и превращаем в base64
            if (value.startsWith('http')) {
                const res = await rbiFetchCloudFileNoBrowserCache(value);
                if (!res.ok) return null;

                const blob = await res.blob();
                return await blobToBase64(blob);
            }

            // 3. Если это local://, но прямой записи не нашли — пробуем через getAsyncUrl
            if (
                value.startsWith('local://') ||
                value.startsWith('cloud://')
            ) {
                const realUrl = await this.getAsyncUrl(value);

                if (realUrl && !String(realUrl).startsWith('local://') && !String(realUrl).startsWith('cloud://')) {
                    const res = await fetch(realUrl);
                    if (!res.ok) return null;

                    const blob = await res.blob();
                    return await blobToBase64(blob);
                }
            }

        } catch (e) {
            console.warn('[PhotoManager] getBase64 error:', e);
        }

        return null;
    },
    async getBase64(localId) {
        if (!localId) return null;

        try {
            const record = await dbGet(STORES.PHOTOS, localId);

            if (record && record.data) {
                const now = new Date().toISOString();

                record.lastAccessedAt = now;
                record.last_accessed_at = now;
                await dbPut(STORES.PHOTOS, record);

                return await arrayBufferToBase64(record.data, record.mimeType || record.mime_type || 'image/webp');
            }

            if (String(localId).startsWith('http')) {
                if (!navigator.onLine) return null;

                const res = await rbiFetchCloudFileNoBrowserCache(localId);
                if (!res.ok) return null;

                const blob = await res.blob();
                const buffer = await blobToArrayBuffer(blob);
                const now = new Date().toISOString();

                await dbPut(STORES.PHOTOS, {
                    id: localId,
                    data: buffer,
                    mimeType: blob.type || 'image/jpeg',
                    mime_type: blob.type || 'image/jpeg',
                    sizeBytes: buffer.byteLength,
                    size_bytes: buffer.byteLength,
                    createdAt: now,
                    created_at: now,
                    cachedAt: now,
                    cached_at: now,
                    lastAccessedAt: now,
                    last_accessed_at: now,
                    sourceUrl: localId,
                    source_url: localId,
                    cacheStatus: 'cached_cloud',
                    cache_status: 'cached_cloud',
                    entityType: window.RbiStorageManager ? window.RbiStorageManager.guessEntityTypeByUrl(localId) : 'unknown_file',
                    entity_type: window.RbiStorageManager ? window.RbiStorageManager.guessEntityTypeByUrl(localId) : 'unknown_file'
                });
                if (window.RbiStorageManager && typeof window.RbiStorageManager.markCloudFileCached === 'function') {
                    await window.RbiStorageManager.markCloudFileCached(
                        localId,
                        buffer.byteLength,
                        blob.type || 'image/jpeg'
                    );
                }
                return await arrayBufferToBase64(buffer, blob.type || 'image/jpeg');
            }
        } catch (e) {
            console.warn('[PhotoManager] getBase64 error:', e);
        }

        return null;
    },

    clearMemory() {
        this.activeUrls.forEach(url => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) { }
        });

        this.activeUrls.clear();
        this.cache = {};
    },

    async linkCloudToLocal(oldLocalUrl, newCloudUrl) {
        const record = await dbGet(STORES.PHOTOS, oldLocalUrl);

        if (record) {
            const now = new Date().toISOString();

            await dbPut(STORES.PHOTOS, {
                ...record,
                id: newCloudUrl,
                sourceUrl: newCloudUrl,
                source_url: newCloudUrl,
                cacheStatus: 'cached_cloud',
                cache_status: 'cached_cloud',
                lastAccessedAt: now,
                last_accessed_at: now,
                cachedAt: record.cachedAt || now,
                cached_at: record.cached_at || now
            });

            await dbDelete(STORES.PHOTOS, oldLocalUrl);

            this.cache[newCloudUrl] = this.cache[oldLocalUrl];
            delete this.cache[oldLocalUrl];

            if (window.RbiStorageManager) {
                await window.RbiStorageManager.upsertLocalFileRegistry({
                    id: 'localreg_' + Date.now().toString(36),
                    local_key: newCloudUrl,
                    localKey: newCloudUrl,
                    public_url: newCloudUrl,
                    publicUrl: newCloudUrl,
                    cache_status: 'cached_cloud',
                    cacheStatus: 'cached_cloud',
                    entity_type: record.entity_type || record.entityType || 'inspection_photo',
                    entityType: record.entity_type || record.entityType || 'inspection_photo',
                    size_bytes: record.sizeBytes || record.size_bytes || record.data?.byteLength || 0,
                    sizeBytes: record.sizeBytes || record.size_bytes || record.data?.byteLength || 0
                });
            }
        }
    },

    async downloadForOffline(url) {
        if (!url || !String(url).startsWith('http') || this.cache[url]) return;

        try {
            if (window.RbiStorageManager) {
                const snap = await window.RbiStorageManager.getStorageSnapshot();

                if (snap.mode === 'normal_cleanup' || snap.mode === 'critical_cleanup') {
                    await window.RbiStorageManager.runAdaptiveStorageCleanup('before_download');
                }
            }

            const cached = await dbGet(STORES.PHOTOS, url);
            if (cached && cached.data) return;

            const res = await rbiFetchCloudFileNoBrowserCache(url);
            if (!res.ok) throw new Error("Файл недоступен");

            const blob = await res.blob();
            const buffer = await blobToArrayBuffer(blob);
            const now = new Date().toISOString();

            await dbPut(STORES.PHOTOS, {
                id: url,
                data: buffer,
                mimeType: blob.type || 'application/octet-stream',
                mime_type: blob.type || 'application/octet-stream',
                sizeBytes: buffer.byteLength,
                size_bytes: buffer.byteLength,
                createdAt: now,
                created_at: now,
                cachedAt: now,
                cached_at: now,
                lastAccessedAt: now,
                last_accessed_at: now,
                sourceUrl: url,
                source_url: url,
                cacheStatus: 'cached_cloud',
                cache_status: 'cached_cloud',
                entityType: window.RbiStorageManager ? window.RbiStorageManager.guessEntityTypeByUrl(url) : 'unknown_file',
                entity_type: window.RbiStorageManager ? window.RbiStorageManager.guessEntityTypeByUrl(url) : 'unknown_file'
            });
            if (window.RbiStorageManager && typeof window.RbiStorageManager.markCloudFileCached === 'function') {
                await window.RbiStorageManager.markCloudFileCached(
                    url,
                    buffer.byteLength,
                    blob.type || 'application/octet-stream'
                );
            }
            const localUrl = URL.createObjectURL(blob);

            this.cache[url] = localUrl;
            this.activeUrls.add(localUrl);
        } catch (e) {
            console.warn('[PhotoManager] downloadForOffline error:', e);
        }
    }
};

// Глобальная функция для HTML разметки
window.getPhotoSrc = (url) => PhotoManager.getSrc(url);

// Обновленная функция авто-миграции
async function runPhotoMigration(historyArray) {
    for (let item of historyArray) {
        let itemChanged = false;
        if (item.photos) {
            for (let key in item.photos) {
                const photoData = item.photos[key];
                if (photoData && photoData.startsWith('data:image')) {
                    const localUrl = await PhotoManager.saveLocal(photoData, 'migr');
                    item.photos[key] = localUrl;
                    itemChanged = true;
                }
            }
        }
        if (itemChanged) await dbPut(STORES.HISTORY, item);
    }
}


window.downloadMissingCloudFiles = async function (silent = false) {
    console.log("[Cache] Фоновая загрузка облачных файлов...");

    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('global-loader-text');

    if (!silent && loader && loaderText) {
        loaderText.innerText = 'Кэширование облачных файлов...';
        loader.style.display = 'flex';
        setTimeout(() => loader.classList.remove('opacity-0'), 10);
    }

    const urlsToDownload = new Set();

    // 1. Фото в истории проверок
    if (typeof contractorArray !== 'undefined') {
        contractorArray.forEach(check => {
            if (check.photos) {
                Object.values(check.photos).forEach(url => {
                    if (url && (url.startsWith('http') || url.startsWith('cloud://'))) urlsToDownload.add(url);
                });
            }
        });
    }

    // 2. TWI‑карты (фото и PDF)
    if (typeof customTwiCards !== 'undefined') {
        customTwiCards.forEach(twi => {
            [twi.photoGood, twi.photoBad, twi.pdfData].forEach(url => {
                if (url && (url.startsWith('http') || url.startsWith('cloud://'))) urlsToDownload.add(url);
            });
            if (twi.steps) {
                twi.steps.forEach(step => {
                    if (step.photo && (step.photo.startsWith('http') || step.photo.startsWith('cloud://'))) urlsToDownload.add(step.photo);
                });
            }
        });
    }

    // 3. Узлы
    if (typeof customNodes !== 'undefined') {
        customNodes.forEach(node => {
            if (node.img && (node.img.startsWith('http') || node.img.startsWith('cloud://'))) urlsToDownload.add(node.img);
        });
    }

    // 4. Совещания и практики
    if (typeof window.rbi_meetingsData !== 'undefined') {
        window.rbi_meetingsData.forEach(m => {
            if (m.qDayPhoto && (m.qDayPhoto.startsWith('http') || m.qDayPhoto.startsWith('cloud://'))) urlsToDownload.add(m.qDayPhoto);
        });
    }
    if (typeof window.rbi_practicesData !== 'undefined') {
        window.rbi_practicesData.forEach(p => {
            [p.photoBefore, p.photoAfter].forEach(url => {
                if (url && (url.startsWith('http') || url.startsWith('cloud://'))) urlsToDownload.add(url);
            });
        });
    }

    // 5. PDF-Отчеты
    if (typeof reportsArray !== 'undefined') {
        reportsArray.forEach(rep => {
            if (rep.file_url && rep.file_url.startsWith('http') && !rep.file_blob) {
                urlsToDownload.add(rep.file_url);
            }
        });
    }

    let downloadedCount = 0;
    let alreadyCachedCount = 0;
    const urlArray = Array.from(urlsToDownload);
    const total = urlArray.length;
    const BATCH_SIZE = 5; // Качаем по 5 файлов за раз

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = urlArray.slice(i, i + BATCH_SIZE);
        
        if (!silent && loaderText) {
            loaderText.innerText = `Кэширование: ${downloadedCount + alreadyCachedCount} из ${total}…`;
        }

        const promises = batch.map(async (url) => {
            try {
                if (url.includes('/reports/')) {
                    const repObj = reportsArray.find(r => r.file_url === url);
                    if (repObj && !repObj.file_blob) {
                        const res = await rbiFetchCloudFileNoBrowserCache(url);
                        if (res.ok) {
                            const reportBlob = await res.blob();
                            repObj.file_blob = reportBlob;
                            repObj.cache_status = 'cached_cloud';
                            repObj.cacheStatus = 'cached_cloud';
                            repObj.updatedAt = new Date().toISOString();
                            repObj.updated_at = repObj.updatedAt;
                            await dbPut(STORES.REPORTS, repObj);

                            if (window.RbiStorageManager && typeof window.RbiStorageManager.markCloudFileCached === 'function') {
                                await window.RbiStorageManager.markCloudFileCached(url, reportBlob.size || 0, reportBlob.type || 'application/pdf');
                            }
                            downloadedCount++;
                        }
                    }
                    return;
                }

                // Уже в RAM‑кэше
                if (PhotoManager.cache[url]) { alreadyCachedCount++; return; }

                // Проверяем IndexedDB
                const alreadyInDb = await dbGet(STORES.PHOTOS, url);
                if (alreadyInDb) { alreadyCachedCount++; return; }

                if (url.startsWith('cloud://')) return;

                await PhotoManager.getBase64(url);
                downloadedCount++;
            } catch (e) {
                console.warn('[Cache] Пропущен файл:', url.substring(0, 30));
            }
        });

        // Ждем завершения пачки
        await Promise.all(promises);
    }

    if (typeof showToast === 'function') {
        if (downloadedCount > 0) {
            showToast(`📥 Автокэширование завершено. Загружено файлов: ${downloadedCount}`);
        } else if (!silent) {
            if (alreadyCachedCount === total && total > 0) {
                showToast(`✅ Все файлы уже сохранены на устройстве.`);
            } else if (total === 0) {
                showToast(`ℹ️ Нет файлов для кэширования.`);
            }
        }
    }

    if (typeof updateStorageInfo === 'function') updateStorageInfo();

    if (!silent && loader) {
        loader.classList.add('opacity-0');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300);
    }
};


// Окончательное удаление файлов из корзины (Hard Delete)
// Глубокая очистка устройства (Удаление скрытых записей и осиротевших файлов)
window.emptyTrashBin = async function () {
    if (!confirm("Выполнить глубокую очистку памяти устройства?\n\nБудут окончательно удалены все скрытые записи и «осиротевшие» системные файлы (фото, PDF), которые больше нигде не используются.")) return;

    showToast("⏳ Начинаем глубокое сканирование памяти...");

    let deletedRecords = 0;
    let deletedFiles = 0;
    let freedBytes = 0;

    try {
        // 1. ОЧИСТКА МЯГКО УДАЛЕННЫХ ЗАПИСЕЙ ВО ВСЕХ БАЗАХ
        const storesToClean = [
            STORES.HISTORY, STORES.ETALON_ACTS, STORES.TASKS, STORES.MEETINGS,
            STORES.PRACTICES, STORES.INTERVENTIONS, STORES.FMEA, STORES.SK_RECORDS,
            STORES.TEMPLATES
        ];

        for (let store of storesToClean) {
            const items = await dbGetAll(store);
            if (items) {
                for (let item of items) {
                    const isDel = item._deleted || (item.data && item.data._deleted);
                    if (isDel) {
                        const key = item.id || item.slug;
                        if (key) {
                            await dbDelete(store, key);
                            deletedRecords++;
                        }
                    }
                }
            }
        }

        // 2. СБОР ВСЕХ ЖИВЫХ (ИСПОЛЬЗУЕМЫХ) ССЫЛОК НА ФАЙЛЫ
        const usedFiles = new Set();

        // Рекурсивный сканер: лезет вглубь любого объекта и ищет ссылки
        const extractFiles = (obj) => {
            if (!obj) return;
            if (typeof obj === 'string') {
                if (obj.startsWith('local://') || obj.startsWith('http')) usedFiles.add(obj);
            } else if (typeof obj === 'object') {
                Object.values(obj).forEach(extractFiles);
            }
        };

        // Сканируем все живые записи в базе
        const allStores = [STORES.HISTORY, STORES.ETALON_ACTS, STORES.TASKS, STORES.MEETINGS, STORES.PRACTICES, STORES.FMEA];
        for (let store of allStores) {
            const items = await dbGetAll(store);
            if (items) items.forEach(extractFiles);
        }

        // Сканируем системные справочники из памяти (TWI, Узлы, Нормативы)
        if (typeof customTwiCards !== 'undefined') extractFiles(customTwiCards);
        if (typeof customNodes !== 'undefined') extractFiles(customNodes);
        if (typeof customDocs !== 'undefined') extractFiles(customDocs);

        // 3. УДАЛЕНИЕ МУСОРНЫХ ФАЙЛОВ ИЗ ХРАНИЛИЩА ФОТО/PDF
        const allPhotos = await dbGetAll(STORES.PHOTOS);
        if (allPhotos) {
            for (let p of allPhotos) {
                // Если файл лежит в базе, но ссылка на него не найдена ни в одной карточке
                if (!usedFiles.has(p.id)) {
                    if (p.data && p.data.byteLength) freedBytes += p.data.byteLength;
                    await dbDelete(STORES.PHOTOS, p.id);

                    // Выгружаем из кэша браузера, если он там застрял
                    if (PhotoManager.cache && PhotoManager.cache[p.id]) {
                        URL.revokeObjectURL(PhotoManager.cache[p.id]);
                        delete PhotoManager.cache[p.id];
                    }
                    deletedFiles++;
                }
            }
        }

        // 4. ИТОГИ
        const freedMB = (freedBytes / 1024 / 1024).toFixed(1);
        showToast(`✅ Готово! Очищено записей: ${deletedRecords}. Удалено мусорных файлов: ${deletedFiles}. Освобождено: ${freedMB} МБ.`);

        if (typeof updateStorageInfo === 'function') updateStorageInfo();

        // --- НОВОЕ: Сбрасываем оперативную память ---
        // Иначе удаленные из IndexedDB записи останутся висеть на экране 
        // и при синхронизации снова запишутся в базу!
        if (deletedRecords > 0 || deletedFiles > 0) {
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }

    } catch (e) {
        console.error("Ошибка при очистке мусора:", e);
        showToast("❌ Ошибка при очистке памяти");
    }
};
