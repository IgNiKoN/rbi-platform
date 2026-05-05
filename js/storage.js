/* Файл: js/storage.js */

const DB_NAME = 'RBI_QUALITY_DB';
// Повышаем версию до 7 для создания таблиц модуля ПК СК
const DB_VERSION = 7; 

const STORES = {
    STATE: 'app_state',       
    HISTORY: 'app_history',   
    SETTINGS: 'app_settings', 
    TEMPLATES: 'user_templates', 
    PHOTOS: 'app_photos',
    TASKS: 'rbi_tasks',
    SCHEDULE: 'rbi_schedule_stages',
    MEETINGS: 'rbi_meetings',
    INTERVENTIONS: 'rbi_interventions',
    PRACTICES: 'rbi_practices',
    ETALON_ACTS: 'rbi_etalon_acts',
    ETALON_DRAFT: 'rbi_etalon_draft',
    FMEA: 'rbi_fmea',
    // --- НОВЫЕ ХРАНИЛИЩА ДЛЯ МОДУЛЯ ПК СК ---
    SK_IMPORTS: 'sk_imports',             // История загрузок файлов
    SK_RECORDS: 'sk_records',             // Сами позиции из файлов
    SK_CONTRACTOR_MAP: 'sk_contractor_map',// Словарь алиасов подрядчиков
    SK_VOLUMES: 'sk_volumes',             // Справочник объемов объекта
    SK_ISD_HISTORY: 'sk_isd_history'      // История значений ИСД
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

            request.onupgradeneeded = function(event) {
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
            request.onblocked = function() {
                console.error("IndexedDB заблокирована! Закройте другие вкладки.");
                if (typeof showToast === 'function') showToast("⚠️ Закройте все вкладки приложения и откройте заново!");
                reject(new Error("БД заблокирована"));
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                _dbPromise = null; // Сбрасываем промис при ошибке
                reject(request.error);
            };
        });
    }
    return _dbPromise;
}

/**
 * Базовые операции CRUD
 */
async function dbPut(storeName, data) {
    const db = await openAppDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(data);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
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
        req.onsuccess = () => resolve(req.result);
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
    return new Blob([byteArray], {type: mimeType});
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

/**
 * Статистика хранилища (Свободное место на устройстве)
 */
async function getStorageStats() {
    if (!navigator.storage || !navigator.storage.estimate) {
        return { supported: false, message: 'Не поддерживается', usedMB: 0, quotaMB: 0, freeMB: 0, percentUsed: 0 };
    }
    try {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
        let quotaMB = (estimate.quota / 1024 / 1024).toFixed(1);
        let freeMB = ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(1);
        let percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

        if (navigator.storage.persist) {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) await navigator.storage.persist();
        }

        return {
            supported: true,
            usedMB, quotaMB, freeMB, percentUsed,
            status: parseFloat(freeMB) > 100 ? 'good' : (parseFloat(freeMB) > 20 ? 'warning' : 'critical')
        };
    } catch (e) {
        return { supported: false, message: 'Ошибка доступа' };
    }
}
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
        const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
        const freeMB = ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(1);
        const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

        sUsed.innerText = usedMB;
        sFree.innerText = freeMB;
        sPercent.innerText = `${percentUsed}%`;
        sBar.style.width = `${percentUsed}%`;
        
        // Меняем цвет полоски, если места мало
        if (parseFloat(percentUsed) > 80) sBar.className = 'h-full bg-red-500 transition-all';
        else if (parseFloat(percentUsed) > 50) sBar.className = 'h-full bg-yellow-500 transition-all';
        else sBar.className = 'h-full bg-indigo-500 transition-all';

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
    cache: {}, // Быстрый кэш для моментальной отрисовки (RAM)
    activeUrls: new Set(), // Список созданных Blob URL для очистки памяти

    // 1. Инициализация (Больше не грузим всё в оперативку!)
    async init() {
        console.log(`[PhotoManager] Инициализация (режим On-Demand). Память чиста.`);
    },

    // 2. Сохранение нового фото (Сразу в БД)
    async saveLocal(base64Data, prefix = 'img') {
        if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
        
        const id = 'local://' + prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000);
        const mimeType = base64Data.match(/data:(.*?);/)[1] || 'image/webp';
        const buffer = await base64ToArrayBuffer(base64Data);
        
        await dbPut(STORES.PHOTOS, { id, data: buffer, mimeType });
        
        const blob = arrayBufferToBlob(buffer, mimeType);
        const url = URL.createObjectURL(blob);
        this.cache[id] = url;
        this.activeUrls.add(url);
        return id;
    },

    // 3. Синхронная выдача ссылки для HTML (Оставляем local://, чтобы отловил Observer)
    // 3. Синхронная выдача ссылки для HTML
    getSrc(url) {
        if (!url) return '';
        // Оставляем как есть для MutationObserver, чтобы он сам подменил URL
        if (url.startsWith('local://') || url.startsWith('cloud://')) return url; 
        if (this.cache[url]) return this.cache[url]; 
        return url; 
    },

    // 3.1. АСИНХРОННАЯ выдача реального Blob URL из базы
    async getAsyncUrl(localId) {
        if (this.cache[localId]) return this.cache[localId];
        try {
            const record = await dbGet(STORES.PHOTOS, localId);
            if (record && record.data) {
                const blob = arrayBufferToBlob(record.data, record.mimeType);
                const url = URL.createObjectURL(blob);
                this.cache[localId] = url;
                this.activeUrls.add(url);
                return url;
            }
        } catch(e) { console.error("Ошибка загрузки фото из БД", e); }
        return null;
    },

    // 3.2. ОЧИСТКА ПАМЯТИ (Вызывается при переключении вкладок)
    clearMemory() {
        this.activeUrls.forEach(url => URL.revokeObjectURL(url));
        this.activeUrls.clear();
        this.cache = {};
        console.log('[PhotoManager] Оперативная память (RAM) очищена от фото');
    },

    // 4. ПРИВЯЗКА: Меняем ключ, когда фото улетело в облако
    async linkCloudToLocal(oldLocalUrl, newCloudUrl) {
        const record = await dbGet(STORES.PHOTOS, oldLocalUrl);
        if (record) {
            await dbPut(STORES.PHOTOS, { id: newCloudUrl, data: record.data, mimeType: record.mimeType });
            await dbDelete(STORES.PHOTOS, oldLocalUrl);
            this.cache[newCloudUrl] = this.cache[oldLocalUrl];
            delete this.cache[oldLocalUrl];
        }
    },

    // 5. ФОНОВОЕ СКАЧИВАНИЕ (Для Офлайна)
    async downloadForOffline(url) {
        if (!url || !url.startsWith('http') || this.cache[url]) return;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Файл недоступен");
            const blob = await res.blob();
            const buffer = await blobToArrayBuffer(blob);
            await dbPut(STORES.PHOTOS, { id: url, data: buffer, mimeType: blob.type });
            const localUrl = URL.createObjectURL(blob);
            this.cache[url] = localUrl;
            this.activeUrls.add(localUrl);
        } catch(e) { console.warn("[PhotoManager] Ошибка скачивания для офлайна:", url); }
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


// === ФОНОВЫЙ ЗАГРУЗЧИК ФАЙЛОВ ДЛЯ ОФЛАЙНА ===
window.downloadMissingCloudFiles = async function() {
    console.log("[Sync] Поиск новых файлов для скачивания в офлайн...");
    const urlsToDownload = new Set();

    // 1. Ищем фото в истории проверок
    if (typeof contractorArray !== 'undefined') {
        contractorArray.forEach(check => {
            if (check.photos) {
                Object.values(check.photos).forEach(url => {
                    if (url && url.startsWith('http')) urlsToDownload.add(url);
                });
            }
        });
    }

    // 2. Ищем фото и PDF в TWI картах
    if (typeof customTwiCards !== 'undefined') {
        customTwiCards.forEach(twi => {
            if (twi.photoGood && twi.photoGood.startsWith('http')) urlsToDownload.add(twi.photoGood);
            if (twi.photoBad && twi.photoBad.startsWith('http')) urlsToDownload.add(twi.photoBad);
            if (twi.pdfData && twi.pdfData.startsWith('http')) urlsToDownload.add(twi.pdfData);
            if (twi.steps) {
                twi.steps.forEach(step => {
                    if (step.photo && step.photo.startsWith('http')) urlsToDownload.add(step.photo);
                });
            }
        });
    }

    // 3. Ищем схемы в Узлах
    if (typeof customNodes !== 'undefined') {
        customNodes.forEach(node => {
            if (node.img && node.img.startsWith('http')) urlsToDownload.add(node.img);
        });
    }

    // Запускаем скачивание по очереди, чтобы не перегрузить память телефона
    let count = 0;
    for (let url of urlsToDownload) {
        if (!PhotoManager.cache[url]) { // Если еще нет в кэше
            await PhotoManager.downloadForOffline(url);
            count++;
        }
    }
    if (count > 0) console.log(`[Sync] Скачано файлов для офлайна: ${count} шт.`);
};

// Окончательное удаление файлов из корзины (Hard Delete)
window.emptyTrashBin = async function() {
    if(!confirm("Безвозвратно удалить все скрытые записи из базы? Они больше не будут восстанавливаться при синхронизации.")) return;
    
    let deletedCount = 0;

    // Вспомогательная функция для удаления фото
    const deletePhotos = async (photosObj) => {
        if (!photosObj) return;
        for (let k in photosObj) {
            const url = photosObj[k];
            if (url) {
                await dbDelete(STORES.PHOTOS, url);
                if (PhotoManager.cache[url]) {
                    if (PhotoManager.cache[url].startsWith('blob:')) URL.revokeObjectURL(PhotoManager.cache[url]);
                    delete PhotoManager.cache[url];
                }
            }
        }
    };

    // 1. Чистим Историю
    const hist = await dbGetAll(STORES.HISTORY);
    if (hist) {
        for (let item of hist) {
            if (item._deleted) {
                await deletePhotos(item.photos);
                await dbDelete(STORES.HISTORY, item.id);
                deletedCount++;
            }
        }
    }

    // 2. Чистим Эталоны
    const etalons = await dbGetAll(STORES.ETALON_ACTS);
    if (etalons) {
        for (let item of etalons) {
            if (item._deleted) {
                if (item.details && item.details.elements) {
                    for (let el of item.details.elements) {
                        if (el.photo) await deletePhotos({ p: el.photo });
                    }
                }
                await dbDelete(STORES.ETALON_ACTS, item.id);
                deletedCount++;
            }
        }
    }

    // 3. Чистим Задачи
    const tasks = await dbGetAll(STORES.TASKS);
    if (tasks) {
        for (let task of tasks) {
            if (task._deleted) {
                if (task.completionPhoto) await deletePhotos({ p: task.completionPhoto });
                await dbDelete(STORES.TASKS, task.id);
                deletedCount++;
            }
        }
    }
    
    showToast(`🗑️ Корзина очищена. Уничтожено записей: ${deletedCount} шт.`);
    if (typeof updateStorageInfo === 'function') updateStorageInfo();
}
