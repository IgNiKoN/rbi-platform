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
// МАССОВОЕ СОХРАНЕНИЕ (УСКОРЕНИЕ В 10 РАЗ)
async function dbPutBatch(storeName, itemsArray) {
    if (!itemsArray || itemsArray.length === 0) return true;
    const db = await openAppDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        itemsArray.forEach(item => {
            store.put(item);
        });
        
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
        } catch(e) {}

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

    async init() {
        console.log(`[PhotoManager] Инициализация`);
    },

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

    getSrc(url) {
        if (!url) return '';
        if (url.startsWith('local://') || url.startsWith('cloud://')) return url; 
        if (this.cache[url]) return this.cache[url]; 
        return url; 
    },

    async getAsyncUrl(localIdOrHttp) {
        if (!localIdOrHttp) return null;
        if (this.cache[localIdOrHttp]) return this.cache[localIdOrHttp];

        try {
            const record = await dbGet(STORES.PHOTOS, localIdOrHttp);
            if (record && record.data) {
                const blob = arrayBufferToBlob(record.data, record.mimeType);
                const url = URL.createObjectURL(blob);
                this.cache[localIdOrHttp] = url;
                this.activeUrls.add(url);
                return url;
            }

            if (localIdOrHttp.startsWith('http')) {
                const res = await fetch(localIdOrHttp);
                if (res.ok) {
                    const blob = await res.blob();
                    const buffer = await blobToArrayBuffer(blob);
                    await dbPut(STORES.PHOTOS, { id: localIdOrHttp, data: buffer, mimeType: blob.type });
                    const localUrl = URL.createObjectURL(blob);
                    this.cache[localIdOrHttp] = localUrl;
                    this.activeUrls.add(localUrl);
                    return localUrl;
                }
            }
        } catch(e) { console.error("Ошибка загрузки фото", e); }
        return localIdOrHttp;
    },

    async getBase64(localId) {
        if (!localId) return null;
        try {
            const record = await dbGet(STORES.PHOTOS, localId);
            if (record && record.data) {
                return await arrayBufferToBase64(record.data, record.mimeType || 'image/webp');
            }
            if (localId.startsWith('http')) {
    // Проверим, нет ли уже в IndexedDB
    const cached = await dbGet(STORES.PHOTOS, localId);
    if (cached && cached.data) {
        return await arrayBufferToBase64(cached.data, cached.mimeType || 'image/jpeg');
    }
    // Если нет – загружаем и сохраняем
    const res = await fetch(localId);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blobToArrayBuffer(blob);
    // Кладём в IndexedDB, чтобы в следующий раз не качать
    await dbPut(STORES.PHOTOS, {
        id: localId,
        data: buffer,
        mimeType: blob.type || 'image/jpeg'
    });
    return await arrayBufferToBase64(buffer, blob.type || 'image/jpeg');
}
        } catch(e) {}
        return null;
    },

    clearMemory() {
        this.activeUrls.forEach(url => URL.revokeObjectURL(url));
        this.activeUrls.clear();
        this.cache = {};
    },

    async linkCloudToLocal(oldLocalUrl, newCloudUrl) {
        const record = await dbGet(STORES.PHOTOS, oldLocalUrl);
        if (record) {
            await dbPut(STORES.PHOTOS, { id: newCloudUrl, data: record.data, mimeType: record.mimeType });
            await dbDelete(STORES.PHOTOS, oldLocalUrl);
            this.cache[newCloudUrl] = this.cache[oldLocalUrl];
            delete this.cache[oldLocalUrl];
        }
    },

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
        } catch(e) {}
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


window.downloadMissingCloudFiles = async function(silent = false) {
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('global-loader-text');

    if (!silent && loader && loaderText) {
        loaderText.innerText = "Поиск файлов в облаке...";
        loader.style.display = 'flex';
        setTimeout(() => loader.classList.remove('opacity-0'), 10);
    }

    console.log("[Cache] Проверка облачных файлов...");
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

        let downloadedCount = 0;
    let alreadyCachedCount = 0;
    const total = urlsToDownload.size;

    for (const url of urlsToDownload) {
        // Уже в RAM‑кэше
        if (PhotoManager.cache[url]) {
            alreadyCachedCount++;
            continue;
        }

        // Проверяем IndexedDB
        try {
            const alreadyInDb = await dbGet(STORES.PHOTOS, url);
            if (alreadyInDb) {
                alreadyCachedCount++;
                continue;
            }
        } catch (e) {
            // ошибка чтения базы — не считаем ни кэшем, ни загрузкой
            continue;
        }

        // Для cloud:// без локального файла — просто пропускаем (не ошибка)
        if (url.startsWith('cloud://')) {
            continue;
        }

        if (!silent && loaderText) {
            loaderText.innerText = `Кэширование: ${downloadedCount + 1} из ${total - alreadyCachedCount}…`;
        }

        try {
            await PhotoManager.getBase64(url);
            downloadedCount++;
        } catch (e) {
            console.warn('[Cache] Ошибка загрузки:', url.substring(0, 80), e.message);
            // продолжаем, это не прерывает общий процесс
        }
    }

    // Итоговое сообщение – только при ручном запуске
    if (!silent) {
        if (loader) {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.style.display = 'none', 300);
        }
        if (typeof showToast === 'function') {
            if (downloadedCount > 0) {
                showToast(`📥 Скачано: ${downloadedCount}`);
            } else if (alreadyCachedCount === total) {
                showToast(`✅ Все файлы уже сохранены на устройстве.`);
            } else {
                showToast(`⚠️ Проверьте интернет.`);
            }
        }
    }

    if (typeof updateStorageInfo === 'function') updateStorageInfo();
};

// Окончательное удаление файлов из корзины (Hard Delete)
// Глубокая очистка устройства (Удаление скрытых записей и осиротевших файлов)
window.emptyTrashBin = async function() {
    if(!confirm("Выполнить глубокую очистку памяти устройства?\n\nБудут окончательно удалены все скрытые записи и «осиротевшие» системные файлы (фото, PDF), которые больше нигде не используются.")) return;
    
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

    } catch (e) {
        console.error("Ошибка при очистке мусора:", e);
        showToast("❌ Ошибка при очистке памяти");
    }
};
