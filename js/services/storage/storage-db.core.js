/* Файл: js/services/storage/storage-db.core.js — перенесено из js/storage.js без изменения логики */
/* Файл: js/storage.js */

const DB_NAME = 'RBI_QUALITY_DB';
// Повышаем версию только при изменении структуры IndexedDB
const DB_VERSION = 20; // БЫЛО 16, СТАЛО 17

// Глобально отдаём версию БД в интерфейс диагностики
window.RBI_DB_VERSION = DB_VERSION;

const STORES = {
    // --- НОВЫЕ ТАБЛИЦЫ ДЛЯ СТРОЙКОНТРОЛЯ ---
    CONST_OBJECTS: 'construction_objects',
    CONST_BUILDINGS: 'construction_buildings',
    CONST_FLOORS: 'construction_floors',
    CONST_DEFECTS: 'construction_defects',
    CONST_UNITS: 'construction_units',           
    CONST_ACCEPTANCE: 'construction_acceptance',  // <-- НОВОЕ (Заявки на приемку)
    // ---------------------------------------

    OBJECT_QUEUE: 'object_normalization_queue',
    STATE: 'app_state',
    HISTORY: 'app_history',
    SETTINGS: 'app_settings',
    TEMPLATES: 'user_templates',
    PHOTOS: 'app_photos',
    REPORTS: 'app_reports',
    REPORT_TEMPLATES: 'report_templates',
    TASKS: 'rbi_tasks',
    SCHEDULE: 'rbi_schedule_stages',
    MEETINGS: 'rbi_meetings',
    INTERVENTIONS: 'rbi_interventions',
    PRACTICES: 'rbi_practices',
    ETALON_ACTS: 'rbi_etalon_acts',
    ETALON_DRAFT: 'rbi_etalon_draft',
    FMEA: 'rbi_fmea',
    SK_IMPORTS: 'sk_imports',

    SK_RECORDS: 'sk_records',
    SK_IMPORT_BATCHES: 'sk_import_batches',

    SK_CONTRACTOR_MAP: 'sk_contractor_map',
    SK_VOLUMES: 'sk_volumes',
    SK_ISD_HISTORY: 'sk_isd_history',
    SK_CATEGORY_MAP: 'sk_category_map',
    SK_MAPPING: 'sk_mapping',

    CONTRACTOR_DIRECTORY: 'contractor_directory',
    CONTRACTOR_ALIASES: 'contractor_aliases',
    CONTRACTOR_QUEUE: 'contractor_normalization_queue',
    PROJECT_OBJECTS: 'project_objects',
    OBJECT_ALIASES: 'object_aliases',
    BACKUP_LOGS: 'backup_logs',
    GAME_LOGS: 'game_logs',
    TWI_CARDS: 'twi_cards',
    CUSTOM_DOCS: 'custom_docs',
    CUSTOM_NODES: 'custom_nodes',
    FEEDBACK_LIST: 'feedback_list',
    ASSISTANT_KB: 'app_assistant_kb',
    FILE_REGISTRY: 'file_registry_cache',
    STORAGE_EVENTS: 'storage_events',
    SYNC_QUEUE: 'sync_queue'
};
window.STORES = STORES;

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

window.dbPut = dbPut;
window.dbGet = dbGet;
window.dbGetAll = dbGetAll;
window.dbDelete = dbDelete;
window.dbClear = dbClear;
window.dbPutBatch = dbPutBatch;

