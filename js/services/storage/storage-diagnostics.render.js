/* Файл: js/services/storage/storage-diagnostics.render.js — перенесено из js/storage.js без изменения логики */
/**
 * ОТОБРАЖЕНИЕ СТАТИСТИКИ ХРАНИЛИЩА (Для вкладки Настройки)
 */

/** Размер payload файла: ArrayBuffer / Blob / base64-строка / meta.size. */
function _rbiPayloadBytes(data, meta) {
    if (meta) {
        const metaSize = Number(meta.sizeBytes || meta.size_bytes || 0);
        if (metaSize > 0) return metaSize;
    }
    if (!data) return 0;
    if (typeof data.byteLength === 'number') return data.byteLength;
    if (typeof data.size === 'number') return data.size; // Blob / File
    if (typeof data === 'string') {
        // dataURL / base64 — грубая оценка полезной нагрузки
        if (data.startsWith('data:')) {
            const b64 = data.split(',')[1] || '';
            return Math.floor(b64.length * 0.75);
        }
        return data.length;
    }
    return 0;
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
        // Как в DevTools / console: весь origin (IndexedDB + Cache API + SW + …)
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 0;
        const actualUsedMB = usageBytes / 1024 / 1024;
        const quotaMB = quotaBytes / 1024 / 1024;
        const freeMBNum = Math.max(0, quotaMB - actualUsedMB);
        const percentUsed = quotaBytes > 0 ? ((usageBytes / quotaBytes) * 100) : 0;

        sUsed.innerText = actualUsedMB.toFixed(1);
        sFree.innerText = freeMBNum.toFixed(1);
        sPercent.innerText = `${percentUsed.toFixed(1)}%`;
        sBar.style.width = `${Math.min(100, percentUsed).toFixed(1)}%`;

        // Меняем цвет полоски, если места мало
        if (percentUsed > 80) sBar.className = 'h-full bg-red-500 transition-all';
        else if (percentUsed > 50) sBar.className = 'h-full bg-yellow-500 transition-all';
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

            const details = estimate.usageDetails || {};
            const detailLine = (label, key) => {
                if (details[key] == null) return '';
                return `${label}: ${(details[key] / 1024 / 1024).toFixed(1)} МБ<br>`;
            };
            const usageBreakdownHtml = `
            <br><b>Занято по данным браузера (как в консоли):</b><br>
            Всего origin: ${actualUsedMB.toFixed(1)} МБ / квота ${quotaMB.toFixed(1)} МБ<br>
            ${detailLine('IndexedDB', 'indexedDB')}
            ${detailLine('Cache API (SW)', 'caches')}
            ${detailLine('Service Worker', 'serviceWorkerRegistrations')}
        `;

            let cacheStatsHtml = '';

            try {
                const localFiles = await dbGetAll(STORES.PHOTOS) || [];
                const reports = (STORES.REPORTS && typeof dbGetAll === 'function')
                    ? (await dbGetAll(STORES.REPORTS) || [])
                    : [];

                let totalFiles = 0;
                let totalBytes = 0;
                let imageFiles = 0;
                let pdfFiles = 0;
                let recoverableFiles = 0;
                let recoverableBytes = 0;
                let localOnlyFiles = 0;
                let localOnlyBytes = 0;
                let reportPdfBytes = 0;
                let reportPdfCount = 0;

                for (const f of localFiles) {
                    if (!f || !f.id || !f.data) continue;

                    totalFiles++;

                    const id = String(f.id || '');
                    const sizeBytes = _rbiPayloadBytes(f.data, f);

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

                for (const rep of reports) {
                    if (!rep || !rep.file_blob) continue;
                    const reportSize = _rbiPayloadBytes(rep.file_blob, rep);
                    reportPdfCount++;
                    reportPdfBytes += reportSize;
                    totalFiles++;
                    totalBytes += reportSize;
                    pdfFiles++;
                }

                cacheStatsHtml = `
            <br><b>Файловый кэш (полезная нагрузка в IDB):</b><br>
            Всего локальных файлов: ${totalFiles} шт. / ${(totalBytes / 1024 / 1024).toFixed(1)} МБ<br>
            Фото: ${imageFiles} шт.; PDF в photos: ${pdfFiles - reportPdfCount} шт.; PDF-отчёты: ${reportPdfCount} шт. / ${(reportPdfBytes / 1024 / 1024).toFixed(1)} МБ<br>
            Можно безопасно очистить: ${recoverableFiles} шт. / ${(recoverableBytes / 1024 / 1024).toFixed(1)} МБ<br>
            Только локальные, не удаляются: ${localOnlyFiles} шт. / ${(localOnlyBytes / 1024 / 1024).toFixed(1)} МБ<br>
            <span style="opacity:0.85">Разница «браузер − файлы» ≈ оверхед IDB, записи проверок и кэш SW.</span><br>
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
        ${usageBreakdownHtml}
        ${cacheStatsHtml}
    `;
        }
    } catch (e) {
        sUsed.innerText = 'н/д';
        sFree.innerText = 'н/д';
    }
}

window.updateStorageInfo = updateStorageInfo;

