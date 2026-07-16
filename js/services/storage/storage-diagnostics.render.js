/* Файл: js/services/storage/storage-diagnostics.render.js — перенесено из js/storage.js без изменения логики */
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

window.updateStorageInfo = updateStorageInfo;

