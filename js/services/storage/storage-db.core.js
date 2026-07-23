/* Файл: js/services/storage/storage-db.core.js — перенесено из js/storage.js без изменения логики */
/* Файл: js/storage.js */

const DB_NAME = 'RBI_QUALITY_DB';
// Повышаем версию только при изменении структуры IndexedDB
const DB_VERSION = 25; // БЫЛО 24, СТАЛО 25 — store construction_defects_v2 (CONST_DEFECTS_V2)

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
    CONTRACTS: 'contracts',
    LOCATION_NODES: 'location_nodes',
    LOCATION_NODE_ALIASES: 'location_node_aliases',
    CONST_FLOORS_V2: 'construction_floors_v2',
    CONST_DEFECTS_V2: 'construction_defects_v2',
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

// Индексы Object Store → [{ name, keyPath }]. onupgradeneeded создаёт только
// отсутствующие — безопасно для уже заполненной локальной БД (upgrade 23→24).
// by_contractor_date не добавляем: пагинация журнала идёт по by_date (YAGNI).
const INDEX_DEFINITIONS = {
    [STORES.HISTORY]: [
        { name: 'by_date', keyPath: 'date' },
        { name: 'by_contractor', keyPath: 'contractorName' },
        // Мягко удалённые (_deleted:true). Записи без поля в индекс не попадают —
        // getActive() по-прежнему фильтрует после чтения; индекс для точечных выборок.
        { name: 'by_deleted', keyPath: '_deleted' }
    ]
};
window.INDEX_DEFINITIONS = INDEX_DEFINITIONS;

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
                const upgradeTx = event.target.transaction;

                // Создаем таблицы, если их нет
                Object.values(STORES).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        let keyOptions = { keyPath: 'id' };
                        if (storeName === STORES.STATE || storeName === STORES.SETTINGS) keyOptions = { keyPath: 'key' };
                        if (storeName === STORES.TEMPLATES) keyOptions = { keyPath: 'slug' };

                        db.createObjectStore(storeName, keyOptions);
                    }
                });

                // Индексы (DB_VERSION 21+: by_date/by_contractor; 24+: by_deleted).
                Object.keys(INDEX_DEFINITIONS).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) return;
                    const store = upgradeTx.objectStore(storeName);
                    (INDEX_DEFINITIONS[storeName] || []).forEach(def => {
                        if (!store.indexNames.contains(def.name)) {
                            store.createIndex(def.name, def.keyPath, def.options || {});
                        }
                    });
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

// КУРСОРНОЕ ЧТЕНИЕ СТРАНИЦЫ ПО ИНДЕКСУ (Журнал проверок, DB_VERSION 21).
// Не заменяет dbGetAll — используется точечно там, где нужна страница,
// а не весь стор (см. inspection.service.js getPage()).
// opts: { indexName, limit, direction: 'prev'|'next', range: IDBKeyRange|null,
//         cursorKey: значение поля индекса, с которого продолжить,
//         cursorPrimaryKey: primary key (id) записи, на которой остановилась
//         предыдущая страница — обязателен вместе с cursorKey }
//
// ИСПРАВЛЕНИЕ (см. отчёт "История показывает меньше записей, чем есть в базе"):
// граница по одному только значению cursorKey была ИСКЛЮЧАЮЩЕЙ (upperBound/
// lowerBound с exclusive=true) — если у нескольких записей совпадает значение
// поля `date` (секундная точность ISO-строки, массовый импорт/pull одним
// batch'ем — совсем не редкость), ВСЕ записи с этим значением, кроме уже
// прочитанных на предыдущей странице, навсегда пропускались курсором. Теперь
// граница по cursorKey ВКЛЮЧАЮЩАЯ, а точную позицию (с точностью до записи)
// определяем сами: пропускаем курсором все записи вплоть до и включая
// (cursorKey, cursorPrimaryKey) записи с предыдущей страницы, затем начинаем
// собирать со следующей.
//
// ПОЧЕМУ НЕ cursor.continuePrimaryKey() (первая версия фикса, откачена):
// спецификация IndexedDB требует, чтобы целевая позиция была строго ПОСЛЕ
// текущей позиции курсора — но открытый с включающей границей курсор нередко
// сам сразу встаёт РОВНО на запись (cursorKey, cursorPrimaryKey) (когда её
// значение `date` уникально в пределах диапазона). Вызов continuePrimaryKey
// с координатами собственной текущей позиции запрещён спецификацией и кидает
// `DataError: The parameter is greater than or equal to this cursor's
// position` — воспроизведено при живом клике «Загрузить более старые
// проверки». Ручное сравнение ключей через cursor.continue() (ниже) работает
// в обоих случаях (уникальное и повторяющееся значение `date`) без риска
// этой ошибки.
async function dbGetPageByIndex(storeName, opts) {
    const { indexName, limit = 50, direction = 'prev', range = null, cursorKey = null, cursorPrimaryKey = null } = opts || {};
    const db = await openAppDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);

        let effectiveRange = range;
        const hasCursor = cursorKey !== undefined && cursorKey !== null
            && cursorPrimaryKey !== undefined && cursorPrimaryKey !== null;
        if (hasCursor) {
            // Включающая граница — сама запись (cursorKey, cursorPrimaryKey) и всё,
            // что совпадает с ней по значению `date`, попадут в диапазон курсора;
            // пропускаем их вручную ниже (skipUntilPastCursor), пока не пройдём
            // именно ту запись, primaryKey которой совпадает с cursorPrimaryKey.
            if (direction === 'prev') {
                effectiveRange = IDBKeyRange.upperBound(cursorKey, false);
            } else {
                effectiveRange = IDBKeyRange.lowerBound(cursorKey, false);
            }
        }

        const results = [];
        let lastKey = null;
        let lastPrimaryKey = null;
        // Пока true — курсор идёт по записям с ключом cursorKey и ищет ровно
        // запись с primaryKey === cursorPrimaryKey, чтобы понять, где кончилась
        // предыдущая страница; сама эта запись и всё до неё — не результат.
        let skipUntilPastCursor = hasCursor;
        const pCode = window.syncConfig?.projectCode || 'LOCAL';
        const req = index.openCursor(effectiveRange, direction === 'prev' ? 'prev' : 'next');

        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) {
                resolve({
                    items: results,
                    hasMore: false,
                    nextCursorKey: lastKey,
                    nextCursorPrimaryKey: lastPrimaryKey
                });
                return;
            }

            if (skipUntilPastCursor) {
                // cursor.key !== cursorKey означает, что записей с cursorKey больше
                // нет (все они шли первыми в диапазоне) — искомая запись либо уже
                // прошла, либо её нет вовсе; в любом случае со следующей записи
                // начинаем собирать страницу.
                const isSameKey = indexedDB.cmp(cursor.key, cursorKey) === 0;
                const isCursorRecord = isSameKey && String(cursor.primaryKey) === String(cursorPrimaryKey);
                if (!isSameKey) {
                    skipUntilPastCursor = false;
                    // Не return — обрабатываем эту запись как первую страницы ниже.
                } else {
                    cursor.continue();
                    if (isCursorRecord) skipUntilPastCursor = false;
                    return;
                }
            }

            const item = cursor.value;

            if (results.length >= limit) {
                resolve({
                    items: results,
                    hasMore: true,
                    nextCursorKey: lastKey,
                    nextCursorPrimaryKey: lastPrimaryKey
                });
                return;
            }

            const itemProject = item.project_code || item.data?.project_code;
            const belongsToProject = !itemProject || itemProject === pCode;

            if (belongsToProject) {
                results.push(item);
                lastKey = cursor.key;
                lastPrimaryKey = cursor.primaryKey;
            }
            cursor.continue();
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
window.dbGetPageByIndex = dbGetPageByIndex;
window.dbDelete = dbDelete;
window.dbClear = dbClear;
window.dbPutBatch = dbPutBatch;

