/* Файл: js/services/storage/storage-file-queue.actions.js — перенесено из js/storage.js без изменения логики */
// === RBI FILE CACHE QUEUE v17.8.205 ===
window.rbiFileCacheQueueLock = false;

async function rbiUpsertFileCacheQueueItem(url, status = 'pending', extra = {}) {
    if (!url || !STORES.FILE_REGISTRY) return;

    const now = new Date().toISOString();
    const all = await dbGetAll(STORES.FILE_REGISTRY) || [];

    let item = all.find(f =>
        f.public_url === url ||
        f.publicUrl === url ||
        f.local_key === url ||
        f.localKey === url
    );

    if (!item) {
        item = {
            id: 'cacheq_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 100000),
            project_code: window.syncConfig?.projectCode || 'LOCAL',
            public_url: url,
            publicUrl: url,
            local_key: url,
            localKey: url,
            entity_type: window.RbiStorageManager?.guessEntityTypeByUrl?.(url) || 'unknown_file',
            entityType: window.RbiStorageManager?.guessEntityTypeByUrl?.(url) || 'unknown_file',
            cache_policy: 'auto',
            cachePolicy: 'auto',
            is_deleted: false,
            created_at: now,
            createdAt: now
        };
    }

    item.cache_status = status;
    item.cacheStatus = status;
    item.cache_attempts = extra.cache_attempts ?? item.cache_attempts ?? item.cacheAttempts ?? 0;
    item.cacheAttempts = item.cache_attempts;
    item.last_cache_error = extra.last_cache_error ?? item.last_cache_error ?? '';
    item.lastCacheError = item.last_cache_error;
    item.next_cache_retry_at = extra.next_cache_retry_at ?? item.next_cache_retry_at ?? null;
    item.nextCacheRetryAt = item.next_cache_retry_at;
    item.updated_at = now;
    item.updatedAt = now;

    await dbPut(STORES.FILE_REGISTRY, item);
}

async function rbiDownloadFileWithRetry(url, maxAttempts = 3) {
    if (!url || !String(url).startsWith('http')) {
        return { status: 'skipped' };
    }

    const nowMs = Date.now();
    const registry = await dbGetAll(STORES.FILE_REGISTRY) || [];
    const item = registry.find(f => f.public_url === url || f.publicUrl === url);

    const retryAt = item?.next_cache_retry_at || item?.nextCacheRetryAt;
    if (retryAt && new Date(retryAt).getTime() > nowMs) {
        return { status: 'postponed' };
    }

    let attempts = item?.cache_attempts || item?.cacheAttempts || 0;

    for (let i = attempts; i < maxAttempts; i++) {
        try {
            await rbiUpsertFileCacheQueueItem(url, 'pending', {
                cache_attempts: i + 1,
                last_cache_error: ''
            });

            await PhotoManager.downloadForOffline(url);

            const cached = await dbGet(STORES.PHOTOS, url);
            if (cached && cached.data) {
                await rbiUpsertFileCacheQueueItem(url, 'cached_cloud', {
                    cache_attempts: i + 1,
                    last_cache_error: '',
                    next_cache_retry_at: null
                });

                return { status: 'cached' };
            }

            throw new Error('Файл не сохранился в IndexedDB');

        } catch (e) {
            const delayMin = i === 0 ? 2 : i === 1 ? 10 : 60;
            const nextRetry = new Date(Date.now() + delayMin * 60 * 1000).toISOString();

            await rbiUpsertFileCacheQueueItem(url, i + 1 >= maxAttempts ? 'failed' : 'pending', {
                cache_attempts: i + 1,
                last_cache_error: e.message || String(e),
                next_cache_retry_at: nextRetry
            });

            if (i + 1 >= maxAttempts) {
                return { status: 'failed' };
            }
        }
    }

    return { status: 'failed' };
}
window.rbiFileCacheQueueLock = false;
window.downloadMissingCloudFiles = async function (silent = false) {
    if (window.rbiFileCacheQueueLock) {
        if (!silent && typeof showToast === 'function') showToast('⏳ Докачка файлов уже выполняется');
        return;
    }

    window.rbiFileCacheQueueLock = true;

    let miniCacheToast = document.getElementById('mini-cache-toast');

    if (!miniCacheToast) {
        miniCacheToast = document.createElement('div');
        miniCacheToast.id = 'mini-cache-toast';
        miniCacheToast.className = 'fixed left-1/2 bottom-24 z-[9000] bg-slate-900/90 text-white rounded-2xl shadow-xl px-5 py-4 text-[12px] font-bold hidden border border-white/10 backdrop-blur-md max-w-[300px] -translate-x-1/2 text-center';
        miniCacheToast.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <span class="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0"></span>
                <span id="mini-cache-toast-text">Кэширование файлов...</span>
            </div>
        `;
        document.body.appendChild(miniCacheToast);
    }

    const miniText = document.getElementById('mini-cache-toast-text');

    try {
        const showProgress = silent !== true;

        if (showProgress) {
            miniCacheToast.classList.remove('hidden');
            if (miniText) miniText.innerText = 'Подготовка файлов...';
        }

        const urlsToDownload = new Set();

        if (typeof contractorArray !== 'undefined') {
            contractorArray.forEach(check => {
                if (check.photos) {
                    // RBI NEW (Множественные фото к пункту чек-листа, B1): значение
                    // photos[itemId] может быть массивом — нормализуем перед .startsWith.
                    Object.values(check.photos).forEach(rawValue => {
                        const urls = window.normalizeItemPhotos ? window.normalizeItemPhotos(rawValue) : [rawValue];
                        urls.forEach(url => {
                            if (url && (url.startsWith('http') || url.startsWith('cloud://'))) urlsToDownload.add(url);
                        });
                    });
                }
            });
        }

        if (typeof customTwiCards !== 'undefined') {
            customTwiCards.forEach(twi => {
                [twi.photoGood, twi.photoBad, twi.pdfData].forEach(url => {
                    if (url && (url.startsWith('http') || url.startsWith('cloud://'))) urlsToDownload.add(url);
                });

                if (twi.steps) {
                    twi.steps.forEach(step => {
                        if (step.photo && (step.photo.startsWith('http') || step.photo.startsWith('cloud://'))) {
                            urlsToDownload.add(step.photo);
                        }
                    });
                }
            });
        }

        if (typeof customNodes !== 'undefined') {
            customNodes.forEach(node => {
                if (node.img && (node.img.startsWith('http') || node.img.startsWith('cloud://'))) {
                    urlsToDownload.add(node.img);
                }

                if (Array.isArray(node.attachments)) {
                    node.attachments.forEach(att => {
                        const url = att.url || att.data || att.file_url || '';
                        if (url && (url.startsWith('http') || url.startsWith('cloud://'))) {
                            urlsToDownload.add(url);
                        }
                    });
                }
            });
        }

        if (typeof customDocs !== 'undefined') {
            customDocs.forEach(doc => {
                if (doc.pdfData && (doc.pdfData.startsWith('http') || doc.pdfData.startsWith('cloud://'))) {
                    urlsToDownload.add(doc.pdfData);
                }
            });
        }

        if (typeof window.rbi_meetingsData !== 'undefined') {
            window.rbi_meetingsData.forEach(m => {
                if (m.qDayPhoto && (m.qDayPhoto.startsWith('http') || m.qDayPhoto.startsWith('cloud://'))) {
                    urlsToDownload.add(m.qDayPhoto);
                }
            });
        }

        if (typeof window.rbi_practicesData !== 'undefined') {
            window.rbi_practicesData.forEach(p => {
                [p.photoBefore, p.photoAfter].forEach(url => {
                    if (url && (url.startsWith('http') || url.startsWith('cloud://'))) urlsToDownload.add(url);
                });
            });
        }

        if (typeof reportsArray !== 'undefined') {
            reportsArray.forEach(rep => {
                if (rep.file_url && rep.file_url.startsWith('http') && !rep.file_blob) {
                    urlsToDownload.add(rep.file_url);
                }
            });
        }

        let downloadedCount = 0;
        let alreadyCachedCount = 0;
        let failedCount = 0;

        const urlArray = Array.from(urlsToDownload);
        const total = urlArray.length;
        const BATCH_SIZE = 3;

        if (total === 0) {
            if (showProgress && miniText) {
                miniText.innerText = 'Нет файлов для загрузки';
                setTimeout(() => miniCacheToast.classList.add('hidden'), 1800);
            }
            return;
        }

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = urlArray.slice(i, i + BATCH_SIZE);

            if (showProgress && miniText) {
                miniText.innerText = `Кэширование: ${downloadedCount + alreadyCachedCount}/${total}`;
            }

            const promises = batch.map(async (url) => {
                try {
                    if (url.includes('/reports/')) {
                        const repObj = reportsArray.find(r => r.file_url === url);

                        if (repObj && repObj.file_blob) {
                            alreadyCachedCount++;
                            return;
                        }

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
                                    await window.RbiStorageManager.markCloudFileCached(
                                        url,
                                        reportBlob.size || 0,
                                        reportBlob.type || 'application/pdf'
                                    );
                                }

                                downloadedCount++;
                            } else {
                                failedCount++;
                            }
                        }

                        return;
                    }

                    if (PhotoManager.cache[url]) {
                        alreadyCachedCount++;
                        return;
                    }

                    const alreadyInDb = await dbGet(STORES.PHOTOS, url);
                    if (alreadyInDb && alreadyInDb.data) {
                        alreadyCachedCount++;
                        return;
                    }

                    if (url.startsWith('cloud://')) {
                        alreadyCachedCount++;
                        return;
                    }

                    const result = await rbiDownloadFileWithRetry(url, 3);

                    if (result.status === 'cached') {
                        downloadedCount++;
                    } else if (result.status === 'postponed' || result.status === 'skipped') {
                        alreadyCachedCount++;
                    } else {
                        failedCount++;
                    }

                } catch (e) {
                    failedCount++;
                    console.warn('[Cache] Пропущен файл:', String(url).substring(0, 80), e);
                }
            });

            await Promise.all(promises);

            if (miniText) {
                miniText.innerText = `Кэширование: ${downloadedCount + alreadyCachedCount}/${total}`;
            }
        }

        if (miniText) {
            if (failedCount > 0) {
                miniText.innerText = `Готово: ${downloadedCount} загружено, ${failedCount} пропущено`;
            } else if (downloadedCount > 0) {
                miniText.innerText = `Готово: загружено ${downloadedCount}`;
            } else {
                miniText.innerText = 'Все файлы уже сохранены';
            }
        }

        if (showProgress) {
            setTimeout(() => miniCacheToast.classList.add('hidden'), 3000);
        }

    } finally {
        window.rbiFileCacheQueueLock = false;

        if (typeof updateStorageInfo === 'function') {
            updateStorageInfo();
        }
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
