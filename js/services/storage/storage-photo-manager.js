/* Файл: js/services/storage/storage-photo-manager.js — перенесено из js/storage.js без изменения логики */
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

// Найдено при проверке блока (класс риска 3, не покрыт исходным аудитом — проверял только top-level function,
// не top-level const-объекты): PhotoManager вызывается bare-идентификатором из множества внешних classic/module файлов
// (session.service.js, bootstrap.js, sync-engine.core.js, knowledge.module.js и др.).
window.PhotoManager = PhotoManager;

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

window.runPhotoMigration = runPhotoMigration;
