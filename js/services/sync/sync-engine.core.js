/* Файл: js/services/sync/sync-engine.core.js — перенесено из js/sync.js без изменения логики */
// ============================================================================
// ГЛАВНЫЙ БЛОК СИНХРОНИЗАЦИИ (ИСПРАВЛЕНО СОХРАНЕНИЕ ОБЪЕКТОВ)
// ==========================================
window.triggerSync = async function (mode = 'silent') {
    // ЖЕСТКАЯ ЗАЩИТА: Запрещаем синхронизацию в демо-режиме
    if (typeof isDemoMode !== 'undefined' && isDemoMode) {
        if (mode === 'manual') safeToast("В демо-режиме синхронизация отключена!");
        return;
    }
    if (!window.isSyncEnabled() || !window.supabaseClient) return;
    // --- НОВОЕ: Проверка интернета ---
    if (!navigator.onLine) {
        if (mode === 'manual') safeToast("⚠️ Нет подключения к интернету. Данные сохранены локально.");
        return;
    }
    // ---------------------------------
    // --- НОВОЕ: Проверка прав на синхронизацию (Push) ---
    // Если пользователь - гость, подрядчик или просто читатель,
    // мы разрешаем ему синхронизацию (чтобы он стянул свежие данные - Pull),
    // но мы должны запомнить, что ему НЕЛЬЗЯ делать Push (отправлять данные).
    let canPush = window.RBI.services.permissions ? window.RBI.services.permissions.canPush() : false;
    // -----------------------------------------------------

    if (window.isSyncing) {
        if (mode === 'manual') safeToast("⏳ Синхронизация уже идет...");
        // Не теряем запрос: например, OCR норматива мог обновить данные ровно во время
        // уже идущего push. Запоминаем самый "сильный" режим и перезапустим sync
        // в finally-блоке текущего цикла, когда isSyncing снова станет false.
        window._rbiPendingSyncRetryMode = (mode === 'manual' || window._rbiPendingSyncRetryMode === 'manual') ? 'manual' : 'silent';
        return;
    }

    // Экономия Supabase: тихую синхронизацию не запускаем без изменений
    const hasNeverPulled = !localStorage.getItem('rbi_sync_last_pull_at');
    const forcePullRequested = localStorage.getItem('rbi_force_full_pull') === '1';
    const forceRemotePollRequested = localStorage.getItem('rbi_force_remote_poll') === '1';
    const remotePollDue = typeof window.rbiIsRemotePollDue === 'function' && window.rbiIsRemotePollDue();

    if (
        mode === 'silent' &&
        localStorage.getItem('rbi_cloud_dirty') !== '1' &&
        !hasNeverPulled &&
        !forcePullRequested &&
        !forceRemotePollRequested &&
        !remotePollDue
    ) {
        return;
    }
    let pushErrors = 0;
    let pullErrors = 0;
    let referencePullErrors = 0;

    window.isSyncing = true;
    // §5: единый defer full-render активного экрана (js/shared/sync-ui-defer.utils.js).
    if (typeof window.rbiBeginSyncUiDefer === 'function') window.rbiBeginSyncUiDefer();
    else window._rbiDeferActiveViewFullRender = true;
    window.syncChannel.postMessage('sync_started');
    let hasNewCriticalData = false;

    // RBI FIX: отслеживаем, что из облака пришли практики/эталоны,
    // чтобы обновить интерфейс без перезагрузки страницы.
    let pulledPracticesChanged = false;
    let pulledEtalonsChanged = false;

    window.renderSyncUI();

    if (window.syncTimeout) clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(() => {
        window.isSyncing = false;
        if (typeof window.rbiEndSyncUiDefer === 'function') window.rbiEndSyncUiDefer(0);
        else window._rbiDeferActiveViewFullRender = false;
        window.renderSyncUI();
        safeToast("⚠️ Синхронизация прервана (слабый интернет). Попробуйте позже.");
        console.log("[Sync] Timeout. Снята блокировка.");
    }, 90000);

    const pCode = window.syncConfig.projectCode;
    const iName = window.syncConfig.engineerName;
    const stableInspectorId = `${pCode}_${iName}`.replace(/\s+/g, '_');
    let lastPullAt = localStorage.getItem('rbi_sync_last_pull_at') || '';
    const lastPushAt = localStorage.getItem('rbi_sync_last_push_at') || '';

    const forceFullPullRequested = localStorage.getItem('rbi_force_full_pull') === '1';

    let localReferenceCount = 0;
    try {
        const countAlive = (arr) => (arr || []).filter(x => {
            const obj = x && x.data && typeof x.data === 'object' ? x.data : x;
            return obj && obj._deleted !== true && obj.is_deleted !== true;
        }).length;

        const localDocs = await dbGetAll('custom_docs') || [];
        const localNodes = await dbGetAll('custom_nodes') || [];
        const localTwi = await dbGetAll('twi_cards') || [];
        const localKb = await dbGetAll('app_assistant_kb') || [];
        const localUserTemplates = await dbGetAll('user_templates') || [];
        const localPractices = await dbGetAll('rbi_practices') || [];
        const localEtalons = await dbGetAll('rbi_etalon_acts') || [];
        const localReportTemplates = await dbGetAll('report_templates') || [];

        localReferenceCount =
            countAlive(localDocs) +
            countAlive(localNodes) +
            countAlive(localTwi) +
            countAlive(localKb) +
            countAlive(localUserTemplates) +
            countAlive(localPractices) +
            countAlive(localEtalons) +
            countAlive(localReportTemplates);
    } catch (e) {
        localReferenceCount = 0;
    }

    let needFullReferencePull = forceFullPullRequested || localReferenceCount === 0;

    if (needFullReferencePull) {
        console.log('[Sync] Полный pull справочников: локальная база знаний пустая или запрошен полный pull');
        lastPullAt = '';
    }
    // Счётчики реально отправленных данных.
    // Обязательно объявляем заранее, чтобы не было ReferenceError при первой синхронизации.

    let actuallyPushedChecks = 0;
    let actuallyPushedTasks = 0;
    let actuallyPushedProfiles = 0;
    // --- НОВОЕ: Проверка роли при синхронизации ---
    // --- НОВОЕ: Проверка роли при синхронизации ---
    // --- Проверка серверного профиля перед синхронизацией ---
    try {
        const { data: roleData, error: roleError } = await window.supabaseClient
            .from('rbi_engineer_profiles')
            .select('role, cloud_status, assigned_contractor, contractor_name, assigned_projects, settings')
            .eq('inspector_id', stableInspectorId)
            .limit(1);

        if (roleError) throw roleError;

        if (roleData && roleData.length > 0) {
            const serverProfile = roleData[0];

            if (typeof appSettings !== 'undefined') {
                const fetchedRole = serverProfile.role || 'guest';
                const fetchedCloudStatus = serverProfile.cloud_status || 'pending';

                const fetchedContr =
                    serverProfile.contractor_name ||
                    serverProfile.assigned_contractor ||
                    '';

                // Читаем оба поля профиля и берём непустой источник (симметрично
                // permission.service.js:getAssignedProjects()) — пустой массив в
                // колонке assigned_projects больше не блокирует fallback на
                // settings.assignedProjects, если тот реально содержит данные.
                let fetchedProjects = [];
                const columnProjects = Array.isArray(serverProfile.assigned_projects) ? serverProfile.assigned_projects : null;
                const settingsProjects = (serverProfile.settings && Array.isArray(serverProfile.settings.assignedProjects))
                    ? serverProfile.settings.assignedProjects
                    : null;

                if (columnProjects && columnProjects.length > 0) {
                    fetchedProjects = columnProjects;
                } else if (settingsProjects && settingsProjects.length > 0) {
                    fetchedProjects = settingsProjects;
                } else {
                    fetchedProjects = columnProjects || settingsProjects || [];
                }

                let needUiUpdate = false;
                let roleOrModeChanged = false; // <-- Флаг для сброса кэша времени

                if (appSettings.userRole !== fetchedRole) {
                    appSettings.userRole = fetchedRole;
                    needUiUpdate = true;
                    roleOrModeChanged = true; // Роль изменилась -> нужен полный pull
                }

                if (appSettings.cloudStatus !== fetchedCloudStatus) {
                    appSettings.cloudStatus = fetchedCloudStatus;
                    needUiUpdate = true;
                }

                if (appSettings.assignedContractor !== fetchedContr) {
                    appSettings.assignedContractor = fetchedContr;
                    appSettings.contractorName = fetchedContr;
                    needUiUpdate = true;
                }

                if (Array.isArray(fetchedProjects)) {
                    // Только approved-профиль имеет право заменить локальные подтверждённые объекты.
                    // pending/guest не должен стирать заявки пользователя.
                    if (fetchedCloudStatus === 'approved') {
                        if (localStorage.getItem('rbi_last_approved_pull_done') !== '1') {
                            localStorage.setItem('rbi_force_full_pull', '1');
                            localStorage.setItem('rbi_cloud_dirty', '1');
                            localStorage.setItem('rbi_last_approved_pull_done', '1');

                            // Разовая сверка офлайн-истории со справочником объектов при
                            // первом approve (current_plan.md §8/§9, решение пользователя:
                            // запускать после approve, не сразу при подключении) — отправляет
                            // админу заявки на объекты из локальной истории, не совпадающие
                            // со справочником, через уже существующий экран «Заявки из ПК СК».
                            if (window.ObjectDirectory && typeof window.ObjectDirectory.scanOfflineHistoryForNewUser === 'function') {
                                window.ObjectDirectory.scanOfflineHistoryForNewUser().catch(function (e) {
                                    console.warn('[Sync] scanOfflineHistoryForNewUser не выполнена:', e);
                                });
                            }
                        }
                        // Сортируем перед сравнением: сервер может отдавать тот же
                        // набор объектов в другом порядке — иначе needUiUpdate
                        // срабатывает на каждом sync и full-render схлопывает UI.
                        const normProjects = (arr) => JSON.stringify([...(arr || [])].map(String).sort());
                        const oldProjects = normProjects(appSettings.assignedProjects);
                        const newProjects = normProjects(fetchedProjects);

                        if (oldProjects !== newProjects) {
                            appSettings.assignedProjects = fetchedProjects;
                            appSettings.pendingAssignedProjects = [];
                            // Заявки на снятие, которые сервер уже применил (объект
                            // реально пропал из fetchedProjects) — больше не "в ожидании".
                            if (Array.isArray(appSettings.pendingUnassignProjects)) {
                                appSettings.pendingUnassignProjects = appSettings.pendingUnassignProjects.filter(
                                    key => fetchedProjects.includes(key)
                                );
                            }
                            needUiUpdate = true;

                            // 1. Команды для синхронизатора (качаем заново)
                            localStorage.setItem('rbi_force_full_pull', '1');
                            localStorage.setItem('rbi_cloud_dirty', '1');
                            localStorage.removeItem('rbi_sync_last_pull_at');
                            localStorage.removeItem('rbi_first_full_offline_cache_done');
                            localStorage.removeItem('rbi_first_full_offline_cache_started_at');
                            // 2. Запускаем физическую чистку телефона от чужих объектов
                            if (typeof window.purgeDataOutsideAssignedProjects === 'function') {
                                window.purgeDataOutsideAssignedProjects(fetchedProjects);
                            }
                        }
                    } else {
                        if (!Array.isArray(appSettings.assignedProjects)) {
                            appSettings.assignedProjects = [];
                        }

                        if (!Array.isArray(appSettings.pendingAssignedProjects)) {
                            appSettings.pendingAssignedProjects = [];
                        }

                        if (!Array.isArray(appSettings.pendingUnassignProjects)) {
                            appSettings.pendingUnassignProjects = [];
                        }
                    }
                }

                // Руководящим ролям автоматически включаем режим "Вся команда"
                if (window.RBI.services.permissions && window.RBI.services.permissions.isLeadership()) {
                    if (window.syncConfig.syncMode !== 'full') {
                        window.syncConfig.syncMode = 'full';
                        localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
                        needUiUpdate = true;
                        roleOrModeChanged = true; // Права расширились -> нужен полный pull
                    }
                }

                // СБРОС КЭША ВРЕМЕНИ: Если права расширились, заставляем приложение скачать всю историю заново
                if (roleOrModeChanged) {
                    localStorage.setItem('rbi_force_full_pull', '1');
                    localStorage.removeItem('rbi_sync_last_pull_at');
                    localStorage.removeItem('rbi_first_full_offline_cache_done');
                    localStorage.removeItem('rbi_first_full_offline_cache_started_at');
                    console.log('[Sync] Роль изменилась. Запрошен полный PULL базы.');
                }

                // АВТОМАТИЧЕСКИ Включаем ИИ для штатных сотрудников
                if (fetchedRole !== 'guest' && fetchedRole !== 'contractor') {
                    if (typeof appSettings !== 'undefined' && !appSettings.aiEnabled) {
                        appSettings.aiEnabled = true;
                        appSettings.aiAuthMode = 'role'; // Используем корпоративный пароль
                        needUiUpdate = true;
                        console.log("[Sync] Корпоративный AI активирован автоматически.");
                    }
                }

                if (typeof dbPut === 'function') {
                    await dbPut('app_settings', { key: 'user_prefs', ...appSettings });
                }

                if (needUiUpdate && window.RBI.services.permissions) {
                    window.RBI.services.permissions.applyUIConstraints();

                    if (typeof renderSyncUI === 'function') renderSyncUI();
                    if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();

                    // --- НОВОЕ: Очистка кэша при смене роли; UI — только dirty (§5) ---
                    if (typeof window.clearMetricsCache === 'function') window.clearMetricsCache();
                    if (typeof gameGenerateWeeklyPlan === 'function') gameGenerateWeeklyPlan(true);
                    if (window.RBI?.utils?.syncUi?.markDirty) {
                        window.RBI.utils.syncUi.markDirty(['analytics', 'history', 'sk', 'tasks', 'reference']);
                    } else if (window.syncDirtyFlags) {
                        window.syncDirtyFlags.analytics = true;
                        window.syncDirtyFlags.history = true;
                        window.syncDirtyFlags.sk = true;
                    }
                    // ------------------------------------------------------------------
                }
            }
        } else {
            // Профиля ещё нет: считаем пользователя неподтверждённым.
            if (typeof appSettings !== 'undefined') {
                appSettings.userRole = 'guest';
                appSettings.cloudStatus = 'pending';

                if (typeof dbPut === 'function') {
                    await dbPut('app_settings', { key: 'user_prefs', ...appSettings });
                }

                if (window.RBI.services.permissions) window.RBI.services.permissions.applyUIConstraints();
            }
        }

        // После получения серверной роли пересчитываем право push.
        canPush = window.RBI.services.permissions ? window.RBI.services.permissions.canPush() : false;

        if (!canPush) {
            console.log('[Sync] Push заблокирован. Роль:', appSettings?.userRole, 'Статус:', appSettings?.cloudStatus);
        }

    } catch (e) {
        console.warn("[Sync] Не удалось обновить роль:", e.message);

        // Если профиль не удалось проверить — запрещаем отправку,
        // но не запрещаем pull и локальную работу.
        canPush = false;
    }
    // RBI FIX: если в ходе проверки роли появился запрос полного pull,
    // применяем его сразу в этой же синхронизации, а не на следующий запуск.
    if (localStorage.getItem('rbi_force_full_pull') === '1') {
        needFullReferencePull = true;
        lastPullAt = '';
        console.log('[Sync] Полный pull применён после обновления роли.');
    }
    // ==============================================
    // ==============================================
    // ==============================================
    // === ГЛОБАЛЬНЫЕ ФУНКЦИИ ЗАГРУЗКИ ФОТО ===
    window.isHttpUrl = function (v) { return typeof v === 'string' && /^https?:\/\//i.test(v); };
    window.isLocalUrl = function (v) { return typeof v === 'string' && v.startsWith('local://'); };
    window.isDataUrl = function (v) { return typeof v === 'string' && v.startsWith('data:'); };

    window.getStoragePathFromPublicUrl = function (url, bucketName) {
        if (!url || !bucketName) return '';
        const marker = `/storage/v1/object/public/${bucketName}/`;
        const idx = url.indexOf(marker);
        if (idx === -1) return '';
        return decodeURIComponent(url.slice(idx + marker.length));
    };

    window.dataUrlToBlob = function (dataUrl) {
        const parts = dataUrl.split(',');
        const mime = (parts[0].match(/data:(.*?);base64/) || [])[1] || 'image/jpeg';
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return { blob: new Blob([bytes], { type: mime }), mime };
    };

    window.extFromMime = function (mime) {
        if (!mime) return 'bin';
        if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
        if (mime.includes('png')) return 'png';
        if (mime.includes('webp')) return 'webp';
        if (mime.includes('pdf')) return 'pdf';
        return 'bin';
    };

    // Supabase Storage: только ASCII в ключах (кириллица в имени инженера ломает upload)
    const _ruStorageTranslit = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
        'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
        'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
        'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    window.sanitizeStorageKeySegment = function (segment) {
        const raw = String(segment || '').trim();
        if (!raw) return 'unknown';

        let latin = '';
        for (const ch of raw) {
            const lower = ch.toLowerCase();
            if (_ruStorageTranslit[lower] !== undefined) {
                latin += _ruStorageTranslit[lower];
            } else {
                latin += ch;
            }
        }

        const safe = latin
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        return safe || 'unknown';
    };

    window.sanitizeStoragePath = function (path) {
        return String(path || '')
            .replace(/^\/+|\/+$/g, '')
            .split('/')
            .map(seg => window.sanitizeStorageKeySegment(seg))
            .filter(Boolean)
            .join('/');
    };

    window.localPhotoToBlob = async function (localUrl) {
        if (!window.isLocalUrl(localUrl) || typeof dbGet !== 'function') return null;
        const rec = await dbGet('app_photos', localUrl);
        if (!rec || !rec.data) return null;
        const mime = rec.mimeType || 'image/jpeg';
        return { blob: new Blob([rec.data], { type: mime }), mime };
    };

    window.rbiUploadAsset = async function (value, bucketName, pathPrefix, filePrefix) {
        if (!value) return value;
        if (window.isHttpUrl(value)) return value;

        let blobData = null;
        const wasLocalUrl = window.isLocalUrl(value);

        if (wasLocalUrl) blobData = await window.localPhotoToBlob(value);
        else if (window.isDataUrl(value)) blobData = window.dataUrlToBlob(value);
        else return value;

        if (!blobData || !blobData.blob) {
            if (wasLocalUrl) {
                // RBI FIX (гонка "PDF/фото не синхронизируется"): файл ещё не успел
                // записаться в IndexedDB к моменту запуска синхронизации. Раньше здесь
                // молча возвращалась исходная ссылка local://..., она уходила в облако
                // как обычная строка, а запись сразу помечалась synced — повторной
                // попытки отправки уже никогда не происходило. Теперь бросаем ошибку,
                // чтобы pushCloudObject для этого объекта прервался, запись осталась
                // not_synced и была отправлена повторно на следующем цикле синхронизации.
                throw new Error(`[Sync] Локальный файл не найден в IndexedDB (возможна гонка записи): ${value}`);
            }
            return value;
        }

        const ext = window.extFromMime(blobData.mime);
        const arrayBuffer = await blobData.blob.arrayBuffer();

        // 1. УМНАЯ ДЕДУПЛИКАЦИЯ: Вычисляем SHA-256 хеш файла
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashStr = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 2. Формируем путь (только ASCII — иначе StorageApiError: Invalid key)
        const cleanPrefix = window.sanitizeStoragePath(pathPrefix || 'hashed_assets');

        const cleanFilePrefix = window.sanitizeStorageKeySegment(filePrefix || 'file');

        const storagePath = `${cleanPrefix}/${cleanFilePrefix}_${hashStr}.${ext}`;

        // 3. Получаем публичный URL
        const { data: urlData } = window.supabaseClient.storage.from(bucketName).getPublicUrl(storagePath);
        const publicUrl = urlData.publicUrl;
        const fileSizeBytes = blobData.blob.size || arrayBuffer.byteLength || 0;

        // 4. Проверяем наличие файла именно в той папке, куда собираемся вернуть ссылку.
        // Раньше всегда проверялась папка hashed_assets, из-за чего можно было вернуть URL на файл,
        // который фактически не был загружен в нужный путь inspection/practice/etalon.
        const storageSlashIndex = storagePath.lastIndexOf('/');
        const storageDir = storageSlashIndex >= 0 ? storagePath.slice(0, storageSlashIndex) : '';
        const storageFileName = storageSlashIndex >= 0 ? storagePath.slice(storageSlashIndex + 1) : storagePath;

        const { data: existingFiles } = await window.supabaseClient.storage
            .from(bucketName)
            .list(storageDir, { search: storageFileName });

        if (existingFiles && existingFiles.some(f => f.name === storageFileName)) {
            console.log('[Sync] Дедупликация сработала (файл уже есть):', publicUrl);
            // ВРЕМЕННО ОТКЛЮЧЕНО, чтобы не было дублей в file_registry.
            // Сначала регистрируем только фото проверок как inspection_photo.
            /*
            if (window.RbiStorageManager) {
                await window.RbiStorageManager.registerUploadedFile({
                    project_code: window.syncConfig?.projectCode || 'LOCAL',
                    entity_type: 'uploaded_asset',
                    entity_id: '',
                    field_path: '',
                    bucket: bucketName,
                    storage_path: storagePath,
                    public_url: publicUrl,
                    mime_type: blobData.mime,
                    size_bytes: fileSizeBytes,
                    uploaded_by: window.syncConfig?.engineerName || '',
                    cache_status: 'cached_cloud'
                });
            }
            */
            return publicUrl;
        }

        // 5. Если файла нет - загружаем
        const { error } = await window.supabaseClient.storage
            .from(bucketName)
            .upload(storagePath, blobData.blob, {
                upsert: true,
                cacheControl: '31536000',
                contentType: blobData.mime
            });

        if (error) {
            console.error('[Sync] Ошибка загрузки файла:', error);
            throw error;
        }
        if (window.RbiStorageManager) {
            /*
if (window.RbiStorageManager) {
    await window.RbiStorageManager.registerUploadedFile({
        project_code: window.syncConfig?.projectCode || 'LOCAL',
        entity_type: 'uploaded_asset',
        entity_id: '',
        field_path: '',
        bucket: bucketName,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: blobData.mime,
        size_bytes: fileSizeBytes,
        uploaded_by: window.syncConfig?.engineerName || '',
        cache_status: 'cached_cloud'
    });
}
*/
        }
        return publicUrl;
    };

    // RBI NEW: регистрация облачных файлов внутри проектных объектов.
    // Не регистрирует inspection_photo, потому что фото проверок уже пишутся отдельно.
    window.rbiRegisterObjectFilesToRegistry = async function (objectType, objectId, obj, bucketName) {
        try {
            if (!window.RbiStorageManager || typeof window.RbiStorageManager.registerUploadedFile !== 'function') return;
            if (!obj || !bucketName) return;

            const pCode = window.syncConfig?.projectCode || obj.project_code || 'LOCAL';
            const owner = obj.owner || obj.author || obj.created_by || obj.uploaded_by || window.syncConfig?.engineerName || '';

            const typeMap = {
                custom_twi_card: 'twi_file',
                custom_doc: 'custom_doc_pdf',
                custom_node: 'node_file',
                practice: 'practice_file',
                etalon: 'etalon_file',
                report: 'report_pdf',
                assistant_kb: 'assistant_kb_file'
            };

            const entityType = typeMap[objectType] || `${objectType}_file`;

            const walk = async (value, path) => {
                if (!value) return;

                if (typeof value === 'string' && value.startsWith('http') && value.includes('/storage/v1/object/')) {
                    const storagePath = getStoragePathFromPublicUrl(value, bucketName);

                    if (storagePath) {
                        const registeredFile = await window.RbiStorageManager.registerUploadedFile({
                            project_code: pCode,
                            entity_type: entityType,
                            entity_id: String(objectId || obj.id || ''),
                            field_path: path,
                            bucket: bucketName,
                            storage_path: storagePath,
                            public_url: value,
                            original_name: `${objectType}_${objectId || obj.id || ''}`,
                            mime_type: '',
                            size_bytes: 0,
                            uploaded_by: owner,
                            cache_policy: 'auto',
                            cache_status: 'cached_cloud'
                        });

                        if (
                            registeredFile &&
                            window.RbiStorageManager &&
                            typeof window.RbiStorageManager.updateRegistryFileSizeByUrl === 'function'
                        ) {
                            await window.RbiStorageManager.updateRegistryFileSizeByUrl(value);
                        }
                    }
                }

                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        await walk(value[i], `${path}.${i}`);
                    }
                    return;
                }

                if (typeof value === 'object') {
                    for (const key of Object.keys(value)) {
                        await walk(value[key], path ? `${path}.${key}` : key);
                    }
                }
            };

            await walk(obj, '');

        } catch (e) {
            console.warn('[FileRegistry] Не удалось зарегистрировать файлы объекта:', objectType, objectId, e);
        }
    };

    function getChecklistItem(templateKey, itemId) {
        try {
            if (!templateKey) return null;

            const type = templateKey.split('_')[0];
            const key = templateKey.replace(type + '_', '');

            let groups = [];

            if (type === 'sys' && typeof window.SYSTEM_TEMPLATES !== 'undefined' && window.SYSTEM_TEMPLATES[key]) {
                groups = window.SYSTEM_TEMPLATES[key].groups || [];
            }

            if (type === 'user' && window.userTemplates && window.userTemplates[key]) {
                groups = window.userTemplates[key].groups || [];
            }

            const flat = groups.flatMap(g => g.items || []);
            return flat.find(x => String(x.id) === String(itemId)) || null;
        } catch (e) {
            return null;
        }
    }

    async function pullEngineerRatingAlways() {
        try {
            const { data } = await window.supabaseClient
                .from('rbi_engineer_ratings')
                .select('*')
                .eq('project_code', pCode)
                .order('pi', { ascending: false });

            window.serverGlobalRating = (data || []).map(row => ({
                ...(row.rating_data || {}),
                name: row.rating_data?.name || row.engineer_name,
                pi: row.pi || row.rating_data?.pi || 0,
                checksCount: row.checks_count || row.rating_data?.checksCount || 0,
                levelObj: row.rating_data?.levelObj || { name: row.level_name || 'Инженер' }
            }));
        } catch (e) {
            console.warn("[Sync] Рейтинг инженеров не подтянут:", e.message);
        }
    }

    try {
        if (mode === 'manual') safeToast('🔄 Синхронизация...');

        // =====================================================
        // 1. ВСЕГДА ТЯНЕМ РЕЙТИНГ ИНЖЕНЕРОВ
        // =====================================================
        await pullEngineerRatingAlways();
        // =====================================================
        // 1.5. PULL: КОРПОРАТИВНЫЙ СТИЛЬ (Логотип и Цвет)
        // =====================================================
        try {
            const { data: pSet, error: pSetErr } = await window.supabaseClient
                .from('project_settings')
                .select('*')
                .eq('project_code', pCode)
                .maybeSingle();

            if (!pSetErr && pSet) {
                // Если пользователь не кастомизировал стиль вручную, применяем корпоративный
                if (typeof appSettings !== 'undefined' && !appSettings.isBrandingCustomized) {
                    let changed = false;
                    if (pSet.brand_color && appSettings.brandColor !== pSet.brand_color) {
                        appSettings.brandColor = pSet.brand_color;
                        changed = true;
                    }
                    if (pSet.logo_url !== undefined && appSettings.brandLogo !== pSet.logo_url) {
                        appSettings.brandLogo = pSet.logo_url;
                        changed = true;
                        // Кэшируем логотип для офлайна
                        if (pSet.logo_url.startsWith('http') && typeof PhotoManager !== 'undefined') {
                            PhotoManager.downloadForOffline(pSet.logo_url);
                        }
                    }
                    if (changed) {
                        if (typeof dbPut === 'function') await dbPut('app_settings', { key: 'user_prefs', ...appSettings });
                        if (document.getElementById('tab-settings')?.classList.contains('active')) {
                            if (typeof renderSettingsTab === 'function') renderSettingsTab();
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[Sync] Корпоративные настройки проекта не найдены.");
        }
        // 🛡️ САМОЛЕЧЕНИЕ БАЗЫ ДАННЫХ (Для PWA на iOS)
        // Проверяем: если локальная база пуста, но время lastPullAt стоит - это глюк PWA.
        // Нужно принудительно сбросить время и скачать всё с нуля!
        let localHistoryCount = 0;
        try {
            if (typeof dbGetAll === 'function') {
                const hist = await dbGetAll('app_history');
                localHistoryCount = hist ? hist.length : 0;
            }
        } catch (e) { }

        if (localHistoryCount === 0 || forceFullPullRequested) {
            console.log('[Sync] ⚠️ База пуста или запрошен полный сброс. Игнорируем время, качаем всё!');
            lastPullAt = ''; // Обнуляем время, чтобы Supabase отдал все данные
        }

        // =====================================================
        // 2. PULL: проверки из новой нормальной архитектуры
        // =====================================================
        // =====================================================
        // 2. PULL: проверки из новой нормальной архитектуры
        // =====================================================

        // --- НОВОЕ: Фильтрация PULL по ролям (по dataScope, не по буквальной роли) ---
        const role = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentRole() : 'guest';
        const cloudStatus = window.RBI.services.permissions ? window.RBI.services.permissions.getCloudStatus() : 'pending';
        const dataScope = window.RBI.services.permissions ? window.RBI.services.permissions.getDataScope(role) : 'none';

        // ИСПРАВЛЕНИЕ "Пропажи старых проверок": раньше здесь был единичный запрос
        // с .limit(500) — при 500+ живых проверках в проекте старые (за пределами
        // топ-500 по дате) физически никогда не скачивались на устройство ни при
        // первой, ни при последующих синхронизациях (см. отчёт "566 в базе / 500
        // у клиента"). buildInspectionsQuery — фабрика, пересобирающая ту же цепочку
        // фильтров заново на каждой странице (сам объект запроса одноразовый после
        // await), rbiPullAllRows докачивает страницы по .range() пока не заберёт всё.
        const buildInspectionsQuery = (from, to) => {
            let q = window.supabaseClient
                .from('rbi_inspections')
                .select('*')
                .eq('project_code', pCode)
                .order('inspection_date', { ascending: false })
                .order('id', { ascending: false })
                .range(from, to);

            // ИСПРАВЛЕНИЕ "Воскрешения" файлов:
            // Если это первая полная синхронизация (нет lastPullAt), скачиваем ТОЛЬКО живые проверки.
            if (!lastPullAt) {
                q = q.eq('is_deleted', false);
            }

            if (dataScope === 'none' || cloudStatus !== 'approved') {
                // БЕЗОПАСНОСТЬ: Гостям и неподтвержденным пользователям запрещено качать чужие проверки
                q = q.eq('id', 'impossible_id');
            }
            else if (dataScope === 'ownContractor') {
                const myContrName =
                    typeof appSettings !== 'undefined'
                        ? (appSettings.contractorName || appSettings.assignedContractor || '')
                        : '';

                if (myContrName) {
                    q = q.eq('contractor_name', myContrName);
                } else {
                    q = q.eq('id', 'impossible_id');
                }
            }
            else if (dataScope === 'ownProject') {
                const assignedProjects = window.RBI.services.permissions ? window.RBI.services.permissions.getAssignedProjects() : [];

                if (assignedProjects && assignedProjects.length > 0) {
                    q = q.in('project_canonical_key', assignedProjects);
                } else {
                    q = q.eq('id', 'impossible_id');
                }
            }
            else if (dataScope === 'ownProjectOrOwnRecords') {
                const assignedProjects = window.RBI.services.permissions ? window.RBI.services.permissions.getAssignedProjects() : [];

                q = q.eq('engineer_name', iName);

                if (assignedProjects && assignedProjects.length > 0) {
                    q = q.in('project_canonical_key', assignedProjects);
                }
            }
            else if (window.syncConfig.syncMode === 'personal') {
                q = q.eq('engineer_name', iName);
            }
            // dataScope === 'all' (директор/менеджер/зам) качают всё (условий не добавляем)
            // ---------------------------------------

            if (lastPullAt) {
                q = q.gt('updated_at', lastPullAt);
            }

            return q;
        };

        const cloudInspections = await rbiPullAllRows(buildInspectionsQuery, 500);

        if (cloudInspections && cloudInspections.length > 0) {
            const ids = cloudInspections.map(x => x.id);

            // RBI FIX: не грузим все inspection_items/photos одним огромным GET-запросом.
            // Иначе URL становится слишком длинным, API может вернуть 502 Bad Gateway.
            const cloudItems = await rbiPullRowsByInspectionIds('rbi_inspection_items', ids, 40);
            const cloudPhotos = await rbiPullRowsByInspectionIds('rbi_inspection_photos', ids, 40);

            const itemsMap = {};
            const photosMap = {};

            (cloudItems || []).forEach(row => {
                if (!itemsMap[row.inspection_id]) itemsMap[row.inspection_id] = [];
                itemsMap[row.inspection_id].push(row);
            });

            const pulledInspectionPhotoUrls = new Set();

            // Множественные фото к пункту чек-листа (B1): группируем по item_id в
            // массив, отсортированный по photo_index (старые строки без
            // photo_index — по умолчанию 0, оказываются первыми).
            (cloudPhotos || []).forEach(row => {
                if (!photosMap[row.inspection_id]) photosMap[row.inspection_id] = {};
                if (row.item_id && row.public_url) {
                    if (!photosMap[row.inspection_id][row.item_id]) photosMap[row.inspection_id][row.item_id] = [];
                    photosMap[row.inspection_id][row.item_id].push({ idx: row.photo_index || 0, url: row.public_url });
                    pulledInspectionPhotoUrls.add(row.public_url);
                }
            });
            Object.keys(photosMap).forEach(insId => {
                Object.keys(photosMap[insId]).forEach(itemId => {
                    photosMap[insId][itemId] = photosMap[insId][itemId]
                        .sort((a, b) => a.idx - b.idx)
                        .map(entry => entry.url);
                });
            });

            // RBI FIX: готовим фото проверок к офлайн-просмотру, но не блокируем синхронизацию.
            if (
                pulledInspectionPhotoUrls.size > 0 &&
                typeof PhotoManager !== 'undefined' &&
                typeof PhotoManager.downloadForOffline === 'function'
            ) {
                if (pulledInspectionPhotoUrls.size > 0) {
                    rbiEnqueueCloudFilesForCache(
                        Array.from(pulledInspectionPhotoUrls).slice(0, 300),
                        'inspection_photo'
                    );
                }
            }

            for (const h of cloudInspections) {
                // --- ЗАЩИТА ОТ ПЕРЕЗАПИСИ УДАЛЕННЫХ ИЛИ ОФЛАЙН ИЗМЕНЕНИЙ ---
                let existingLocal = typeof dbGet === 'function' ? await dbGet('app_history', String(h.id)) : null;

                // Авто-лечение дубликатов (если в базе телефона остался старый ID в виде числа)
                if (!existingLocal && !isNaN(Number(h.id))) {
                    const numExisting = await dbGet('app_history', Number(h.id));
                    if (numExisting) {
                        existingLocal = numExisting;
                        await dbDelete('app_history', Number(h.id)); // Стираем числовой дубль
                    }
                }

                const localTime = existingLocal ? new Date(existingLocal.updatedAt || existingLocal._deletedAt || 0).getTime() : 0;
                const cloudTime = new Date(h.updated_at || 0).getTime();

                if (existingLocal && localTime >= cloudTime) {
                    // Наша локальная версия новее (например, мы её только что удалили). Пропускаем облачную!
                    continue;
                }

                // <-- ВСТАВКА: Если из облака прилетела метка "Удалено", стираем локально
                if (h.is_deleted) {
                    if (existingLocal) {
                        await dbDelete('app_history', String(h.id));
                    }
                    continue;
                }
                // -----------------------------------------------------------

                const state = {};
                const details = {};

                (itemsMap[h.id] || []).forEach(r => {
                    state[r.item_id] = r.status;
                    details[r.item_id] = {
                        ...(r.details || {}),
                        comment: r.comment || r.details?.comment || '',
                        causeCode: r.cause_code || r.details?.causeCode || '',
                        fact: r.fact_value || r.details?.fact || '',
                        tolerance: r.tolerance_value || r.details?.tolerance || ''
                    };
                });

                const localItem = {
                    id: String(h.id),

                    // Старое поле для совместимости
                    projectName: h.project_display_name || h.project_name || '',

                    // Новые поля объекта
                    project_canonical_key: h.project_canonical_key || h.project_name || '',
                    project_display_name: h.project_display_name || h.project_name || '',

                    inspectorName: h.engineer_name || '',
                    contractorName: h.contractor_name || '',
                    contractorId: h.contractorId || h.contractor_id || '',
                    templateKey: h.template_key || '',
                    templateTitle: h.template_title || '',
                    location: h.location || '',
                    section: h.section || '',
                    floor: h.floor || '',
                    room: h.room || '',
                    date: h.inspection_date || h.created_at || new Date().toISOString(),
                    isCompleted: h.is_completed !== false,
                    state,
                    details,
                    photos: photosMap[h.id] || {},
                    metrics: h.metrics || {},
                    updatedAt: h.updated_at || new Date().toISOString(),

                    // Всё, что пришло из Supabase, считается облачным и синхронизированным.
                    source: 'cloud',
                    syncStatus: 'synced',
                    syncBlockReason: ''
                };

                // Собираем элементы в массив для пакетного сохранения
                if (!window._tempHistoryBatch) window._tempHistoryBatch = [];
                window._tempHistoryBatch.push(localItem);

                // Ловим новые критические дефекты
                if (mode === 'silent' && localItem.metrics && localItem.metrics.n_B3_fail > 0) {
                    hasNewCriticalData = true;
                }
            }

            // МАССОВОЕ СОХРАНЕНИЕ ПРОВЕРОК
            let pulledHistoryBatch = [];
            if (window._tempHistoryBatch && window._tempHistoryBatch.length > 0 && typeof dbPutBatch === 'function') {
                pulledHistoryBatch = window._tempHistoryBatch;
                await dbPutBatch('app_history', window._tempHistoryBatch);
                window._tempHistoryBatch = []; // очищаем
            }

            if (typeof dbGetAll === 'function') {
                window.contractorArray = (await dbGetAll('app_history') || []).filter(x => !x._deleted);
                window.etalonActsArray = (await dbGetAll('rbi_etalon_acts') || []).filter(x => !x._deleted); // <-- ОЧЕНЬ ВАЖНО: обновляем и эталоны
            }

            // Точечный пересчёт агрегатов подрядчика (contractor-metrics.service.js) —
            // только для подрядчиков/объектов, чьи записи реально пришли в этом pull,
            // а не полный пересчёт всей базы (см. отчёт по оптимизации журнала/аналитики).
            if (pulledHistoryBatch.length > 0 && window.RBI.services.contractorMetrics) {
                window.RBI.services.contractorMetrics.recalcTouched(pulledHistoryBatch);
            }
        }

        // =====================================================
        // 3. PULL: черновик текущей проверки
        // =====================================================
        // =====================================================
        // 3. PULL: черновик текущей проверки
        // =====================================================
        try {
            let draftQuery = window.supabaseClient
                .from('rbi_draft_sessions')
                .select('*')
                .eq('project_code', pCode)
                .eq('engineer_name', iName);

            // ИСПРАВЛЕНИЕ: Тянем черновик только если он обновился с прошлой синхронизации
            if (lastPullAt) {
                draftQuery = draftQuery.gt('updated_at', lastPullAt);
            }

            draftQuery = draftQuery.limit(1);
            const { data: draftRows } = await draftQuery;

            if (draftRows && draftRows.length > 0 && typeof dbGet === 'function' && typeof dbPut === 'function') {
                const cloudDraft = draftRows[0];
                const localSession = await dbGet('app_state', 'current_session');

                const cloudTime = new Date(cloudDraft.updated_at || 0).getTime();
                const localTime = localSession ? (localSession.timestamp || 0) : 0;

                if (cloudTime > localTime) {
                    // ЖЕЛЕЗНЫЙ ЩИТ: Если инженер сейчас на вкладке "Осмотр" - ЗАПРЕЩАЕМ облаку трогать его экран!
                    // Это решает проблему пропадающих фоток и сброса данных прямо во время работы.
                    const isAuditActive = document.getElementById('tab-audit')?.classList.contains('active');

                    if (isAuditActive) {
                        console.log('[Sync] 🛡️ Инженер заполняет чек-лист. Облачный черновик проигнорирован, чтобы не стереть данные.');
                    } else {
                        // Обновляем локальный черновик только если инженер гуляет по другим вкладкам (Аналитика, Настройки)
                        await dbPut('app_state', {
                            key: 'current_session',
                            timestamp: cloudTime,
                            templateKey: cloudDraft.template_key || '',
                            project: localSession?.project || '',
                            inspector: iName,
                            contractor: cloudDraft.contractor_name || '',
                            location: cloudDraft.location || '',
                            section: cloudDraft.section || '',
                            floor: cloudDraft.floor || '',
                            room: cloudDraft.room || '',
                            state: cloudDraft.state || {},
                            details: cloudDraft.details || {},
                            photos: cloudDraft.photos || {},
                            customExpertConclusions: cloudDraft.custom_expert_conclusions || {}
                        });

                        if (typeof restoreSession === 'function') {
                            setTimeout(() => {
                                if (!document.getElementById('tab-audit')?.classList.contains('active')) {
                                    restoreSession();
                                }
                            }, 500);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[Sync] Черновик не подтянут:", e.message);
        }

        // =====================================================
        // 4. PULL: задачи и эталоны
        // =====================================================
        try {
            let taskQuery = window.supabaseClient
                .from('rbi_tasks')
                .select('*')
                .eq('project_code', pCode)
                .eq('task_data->>type', 'manual');

            const role = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentRole() : 'guest';
            const taskDataScope = window.RBI.services.permissions ? window.RBI.services.permissions.getDataScope(role) : 'none';

            if (taskDataScope === 'none') {
                taskQuery = taskQuery.eq('id', 'impossible_id');
            }
            else if (taskDataScope === 'ownContractor') {
                const myContrName =
                    typeof appSettings !== 'undefined'
                        ? (appSettings.contractorName || appSettings.assignedContractor || '')
                        : '';

                if (myContrName) {
                    taskQuery = taskQuery.eq('contractor_name', myContrName);
                } else {
                    taskQuery = taskQuery.eq('id', 'impossible_id');
                }
            }
            else if (taskDataScope === 'ownProject') {
                const assignedProjects = window.RBI.services.permissions ? window.RBI.services.permissions.getAssignedProjects() : [];

                if (assignedProjects && assignedProjects.length > 0) {
                    taskQuery = taskQuery.in('project_canonical_key', assignedProjects);
                } else {
                    taskQuery = taskQuery.eq('id', 'impossible_id');
                }
            }
            else if (taskDataScope === 'ownProjectOrOwnRecords') {
                const assignedProjects = window.RBI.services.permissions ? window.RBI.services.permissions.getAssignedProjects() : [];

                taskQuery = taskQuery.eq('engineer_name', iName);

                if (assignedProjects && assignedProjects.length > 0) {
                    taskQuery = taskQuery.in('project_canonical_key', assignedProjects);
                }
            }
            else if (window.syncConfig.syncMode === 'personal') {
                taskQuery = taskQuery.eq('engineer_name', iName);
            }
            // Если это полная синхронизация - берем только живые. 
            // Если быстрая - берем все измененные (включая удаленные)
            if (!lastPullAt) {
                taskQuery = taskQuery.eq('is_deleted', false);
            } else {
                taskQuery = taskQuery.gt('updated_at', lastPullAt);
            }
            const { data: taskRows } = await taskQuery;

            if (taskRows && typeof dbPut === 'function') {
                window.rbi_tasksData = window.rbi_tasksData || [];

                for (const row of taskRows) {
                    // ИСПРАВЛЕНИЕ: Ищем задачу прямо в базе IndexedDB, а не в оперативной памяти!
                    // Потому что в RAM мы уже скрыли удаленные задачи, и система думает, что их нет.
                    const existingLocal = await dbGet('rbi_tasks', row.id);
                    const localTime = existingLocal ? new Date(existingLocal.updatedAt || existingLocal.updated_at || 0).getTime() : 0;
                    const cloudTime = new Date(row.updated_at || 0).getTime();
                    // --- ВСТАВКА: ЕСЛИ ОБЛАКО ГОВОРИТ, ЧТО ЗАДАЧА УДАЛЕНА ---
                    if (row.is_deleted === true) {
                        if (existingLocal) {
                            existingLocal._deleted = true;
                            existingLocal.is_deleted = true;
                            existingLocal.deleted_at = row.deleted_at || row.updated_at;
                            existingLocal._deletedAt = existingLocal.deleted_at;
                            existingLocal.source = 'cloud';
                            existingLocal.syncStatus = 'synced';
                            existingLocal.sync_status = 'synced';
                            await dbPut('rbi_tasks', existingLocal);
                        }
                        // Удаляем из оперативной памяти
                        window.rbi_tasksData = window.rbi_tasksData.filter(t => String(t.id) !== String(row.id));
                        continue; // Переходим к следующей задаче
                    }
                    // ---------------------------------------------------------

                    // Если локально мы удалили задачу, а облако пытается ее вернуть - игнорируем!
                    if (!existingLocal || cloudTime > localTime) {
                        const t = row.task_data || {};
                        t.id = row.id;
                        t.status = row.status || t.status;
                        t.updatedAt = row.updated_at;
                        t.project_canonical_key = row.project_canonical_key || t.project_canonical_key || t.project || t.projectName || '';
                        t.project_display_name = row.project_display_name || t.project_display_name || t.project || t.projectName || '';

                        t.source = 'cloud';
                        t.syncStatus = 'synced';
                        t.sync_status = 'synced';
                        t.syncBlockReason = '';
                        t.sync_block_reason = '';
                        // --- НОВОЕ: Кэшируем фото закрытия задачи ---
                        if (t.completionPhoto && t.completionPhoto.startsWith('http')) {
                            t.completionPhoto = await window.cacheCloudPhotoToIndexedDB(t.completionPhoto);
                        }
                        // --------------------------------------------

                        await dbPut('rbi_tasks', t);

                        const idx = window.rbi_tasksData.findIndex(x => String(x.id) === String(t.id));
                        if (idx >= 0) window.rbi_tasksData[idx] = t;
                        else window.rbi_tasksData.push(t);
                    }
                }
            }
        } catch (e) {
            console.warn("[Sync] Задачи не подтянуты:", e.message);
        }


        // Вспомогательная функция для фоновой загрузки всех фото эталона в кеш
        async function downloadAllActPhotosForOffline(act) {
            if (!act?.details?.elements) return;

            for (const el of act.details.elements) {
                if (el.photo && el.photo.startsWith('http')) {
                    // PhotoManager.downloadForOffline сохранит фото в IndexedDB,
                    // но сам el.photo останется публичным URL
                    await PhotoManager.downloadForOffline(el.photo);
                }
            }
        }
        // =====================================================
        // 4.1. PULL: прочие модули через rbi_cloud_objects
        // =====================================================
        try {
            // Единый массив всех независимых таблиц (И проектные, и общие справочники)
            const cloudTypes = [
                { type: 'meeting', store: 'rbi_meetings', memory: 'rbi_meetingsData' },
                { type: 'intervention', store: 'rbi_interventions', memory: 'rbi_interventionsData' },
                { type: 'practice', store: 'rbi_practices', memory: 'rbi_practicesData' },
                { type: 'schedule', store: 'rbi_schedule_stages', memory: 'rbi_scheduleData' },
                { type: 'fmea', store: 'rbi_fmea', memory: 'rbi_fmeaRecords' },
                { type: 'etalon', store: 'rbi_etalon_acts', memory: 'etalonActsArray' },
                // --- СТРОЙКОНТРОЛЬ ---
                { type: 'const_object', store: 'construction_objects', memory: '_sys_dummy' },
                { type: 'const_building', store: 'construction_buildings', memory: '_sys_dummy' },
                { type: 'const_floor', store: 'construction_floors', memory: '_sys_dummy' },
                { type: 'const_defect', store: 'construction_defects', memory: '_sys_dummy' },
                { type: 'const_unit', store: 'construction_units', memory: '_sys_dummy' },
                { type: 'const_acceptance', store: 'construction_acceptance', memory: '_sys_dummy' },
                // ---------------------
                // НОВЫЕ БЫСТРЫЕ ТАБЛИЦЫ СПРАВОЧНИКОВ:
                { type: 'custom_doc', store: 'custom_docs', memory: 'customDocs' },
                { type: 'custom_node', store: 'custom_nodes', memory: 'customNodes' },
                { type: 'custom_twi_card', store: 'twi_cards', memory: 'customTwiCards' },
                { type: 'feedback', store: 'feedback_list', memory: 'rbi_feedbackData' },
                { type: 'project_object', store: 'project_objects', memory: '_sys_obj_dummy' },
                { type: 'object_alias', store: 'object_aliases', memory: '_sys_alias_dummy' },
                { type: 'report', store: 'app_reports', memory: 'reportsArray' },
                { type: 'report_template', store: 'report_templates', memory: 'userReportTemplates' },
                { type: 'assistant_kb', store: 'app_assistant_kb', memory: 'appAssistantData' }
            ];

            for (const cType of cloudTypes) {
                try {
                    const isReferenceType = [
                        'custom_doc',
                        'custom_node',
                        'custom_twi_card',
                        'assistant_kb',
                        'user_template',
                        'project_object',
                        'object_alias'
                    ].includes(cType.type);

                    const pullSince = isReferenceType && needFullReferencePull ? '' : lastPullAt;

                    const objects = await window.pullCloudObjects(cType.type, pullSince, mode);

                    window[cType.memory] = window[cType.memory] || [];

                    if (!objects || objects.length === 0) {
                        console.log(`[Sync] ${cType.type}: новых данных нет`);
                        continue;
                    }

                    console.log(`[Sync] ${cType.type}: получено ${objects.length}`);
                    if (cType.type === 'practice') pulledPracticesChanged = true;
                    if (cType.type === 'etalon') pulledEtalonsChanged = true;
                    for (const obj of objects) {
                        const localExisting = await dbGet(cType.store, obj.id);
                        const localTime = localExisting
                            ? new Date(localExisting.updatedAt || localExisting.updated_at || localExisting.date || localExisting.createdAt || 0).getTime()
                            : 0;

                        const cloudTime = new Date(obj.updatedAt || obj.updated_at || 0).getTime();

                        if (!localExisting || cloudTime >= localTime || needFullReferencePull) {
                            if (obj._deleted || obj.is_deleted) {
                                await dbDelete(cType.store, obj.id);
                                window[cType.memory] = window[cType.memory].filter(x => String(x.id) !== String(obj.id));
                            } else {
                                await dbPut(cType.store, obj);

                                // RBI FIX: не скачиваем файлы прямо во время синхронизации.
                                // Только ставим ссылки в лёгкую фоновую очередь.
                                if (['practice', 'etalon', 'custom_twi_card', 'custom_node', 'custom_doc', 'user_template'].includes(cType.type)) {
                                    const urls = rbiCollectCloudStorageUrls(obj, 60);
                                    rbiEnqueueCloudFilesForCache(urls, cType.type);
                                }

                                const idx = window[cType.memory].findIndex(x => String(x.id) === String(obj.id));
                                if (idx >= 0) window[cType.memory][idx] = obj;
                                else window[cType.memory].push(obj);
                            }
                        }
                    }

                } catch (e) {
                    pullErrors++;
                    console.warn(`[Sync] Ошибка pull ${cType.type}:`, e.message || e);

                    if ([
                        'custom_doc',
                        'custom_node',
                        'custom_twi_card',
                        'assistant_kb',
                        'user_template',
                        'project_object',
                        'object_alias'
                    ].includes(cType.type)) {
                        referencePullErrors++;
                    }
                }
            } // конец цикла cloudTypes
            // Перезагружаем Справочник объектов в память, если он прилетел из облака
            if (typeof ObjectDirectory !== 'undefined') await ObjectDirectory.init();
            // ИСПРАВЛЕНИЕ: ЖЕСТКАЯ СИНХРОНИЗАЦИЯ ПАМЯТИ ОТЧЕТОВ, ПРАКТИК И ЭТАЛОНОВ
            // Достаем свежие данные из БД в оперативную память, чтобы экран их увидел без перезагрузки.
            if (typeof dbGetAll === 'function') {
                if (typeof reportsArray !== 'undefined') {
                    window.reportsArray = (await dbGetAll('app_reports') || []).filter(x => !x._deleted && !x.is_deleted);
                }

                if (typeof userReportTemplates !== 'undefined') {
                    userReportTemplates = (await dbGetAll('report_templates') || []).filter(x => !x._deleted && !x.is_deleted);
                }

                if (pulledPracticesChanged) {
                    window.rbi_practicesData = (await dbGetAll('rbi_practices') || [])
                        .filter(x => !x._deleted && !x.is_deleted);

                    if (typeof rbi_practicesData !== 'undefined') {
                        rbi_practicesData = window.rbi_practicesData;
                    }
                }

                if (pulledEtalonsChanged) {
                    window.etalonActsArray = (await dbGetAll('rbi_etalon_acts') || [])
                        .filter(x => !x._deleted && !x.is_deleted);
                }
            }

            // =====================================================
            // PULL ПК СК: новая модель через public.sk_records
            // =====================================================
            if (window.supabaseClient && typeof dbGetAll === 'function') {
                try {
                    const pCode = window.syncConfig.projectCode;

                    let query = window.supabaseClient
                        .from('sk_records')
                        .select('*')
                        .eq('project_code', pCode)
                        .limit(25000); // <-- СНЯЛИ ЛИМИТ СУПАБЕЙСА (По умолчанию там 1000)

                    if (lastPullAt) {
                        query = query.gt('updated_at', lastPullAt);
                    }

                    const { data: cloudSkRows, error: skPullError } = await query;

                    if (skPullError) throw skPullError;

                    if (cloudSkRows && cloudSkRows.length > 0) {
                        const localRecords = await dbGetAll(STORES.SK_RECORDS) || [];
                        const localMap = new Map();
                        const skRecordsToSaveBatch = []; // <-- ДОБАВИЛИ МАССИВ ДЛЯ ПАКЕТА
                        localRecords.forEach(r => {
                            const key = r.sk_unique_key || r.id;
                            if (key) localMap.set(String(key), r);
                        });

                        for (const row of cloudSkRows) {
                            const cloudRecord = window.normalizeCloudSkRecordForLocal(row);
                            if (!cloudRecord) continue;

                            const cloudKey = String(cloudRecord.sk_unique_key || cloudRecord.id);
                            const localRecord = localMap.get(cloudKey);

                            const cloudTime = new Date(cloudRecord.updated_at || cloudRecord.updatedAt || 0).getTime();
                            const localTime = localRecord
                                ? new Date(localRecord.updated_at || localRecord.updatedAt || localRecord._updatedAt || 0).getTime()
                                : 0;

                            // КРИТИЧЕСКОЕ ПРАВИЛО:
                            // Если локально запись удалена и это удаление ещё не синхронизировано,
                            // не подтягиваем старую активную запись из облака обратно.
                            const localDeletePending =
                                localRecord &&
                                (localRecord._deleted === true || localRecord.is_deleted === true) &&
                                (localRecord.syncStatus === 'not_synced' || localRecord.sync_status === 'not_synced');

                            const cloudIsDeleted =
                                cloudRecord._deleted === true || cloudRecord.is_deleted === true;

                            if (localDeletePending && !cloudIsDeleted) {
                                console.log('[Sync][ПК СК] Пропущен pull: локальное удаление ожидает отправки', cloudKey);
                                continue;
                            }

                            // Если облако говорит, что запись удалена — сохраняем tombstone локально,
                            // чтобы она не отображалась и не прилетала заново.
                            if (cloudIsDeleted) {
                                const tombstone = {
                                    ...(localRecord || cloudRecord),
                                    ...cloudRecord,
                                    _deleted: true,
                                    is_deleted: true,
                                    source: 'cloud',
                                    syncStatus: 'synced',
                                    sync_status: 'synced',
                                    syncBlockReason: '',
                                    sync_block_reason: ''
                                };

                                await dbPut(STORES.SK_RECORDS, tombstone);
                                localMap.set(cloudKey, tombstone);
                                continue;
                            }

                            // Обычное обновление: облачная запись новее локальной
                            if (!localRecord || cloudTime > localTime) {
                                skRecordsToSaveBatch.push(cloudRecord); // <-- КЛАДЕМ В МАССИВ ВМЕСТО МЕДЛЕННОГО СОХРАНЕНИЯ
                                localMap.set(cloudKey, cloudRecord);
                            }
                        }

                        // --- ПАКЕТНОЕ СОХРАНЕНИЕ ---
                        if (skRecordsToSaveBatch.length > 0 && typeof dbPutBatch === 'function') {
                            await dbPutBatch(STORES.SK_RECORDS, skRecordsToSaveBatch);
                        }
                        // ---------------------------


                        const allPulledSkRecords = Array.from(localMap.values()).filter(r => !r._deleted && !r.is_deleted);

                        if (typeof sk_filterRecordsByAccess === 'function') {
                            window.skRecords = sk_filterRecordsByAccess(allPulledSkRecords);
                        } else {
                            window.skRecords = allPulledSkRecords;
                        }

                        if (
                            document.getElementById('tab-analytics')?.classList.contains('active') &&
                            typeof currentActiveAnalyticsTab !== 'undefined' &&
                            currentActiveAnalyticsTab === 'sub-sk'
                        ) {
                            if (typeof sk_renderMainTab === 'function') sk_renderMainTab();
                        }
                    }
                } catch (e) {
                    console.warn('[Sync][ПК СК] Не удалось подтянуть sk_records:', e.message);
                }
            }
            // =====================================================
            // PULL справочника подрядчиков ПК СК
            // =====================================================
            if (window.supabaseClient && typeof dbPut === 'function' && typeof STORES !== 'undefined') {
                try {
                    const pCode = window.syncConfig.projectCode;

                    // 1. Справочник подрядчиков
                    const { data: cloudContractors, error: contractorsErr } = await window.supabaseClient
                        .from('contractor_directory')
                        .select('*')
                        .eq('project_code', pCode);

                    if (contractorsErr) throw contractorsErr;

                    if (Array.isArray(cloudContractors)) {
                        for (const c of cloudContractors) {
                            await dbPut(STORES.CONTRACTOR_DIRECTORY, {
                                ...c,
                                _deleted: c.is_deleted === true,
                                source: 'cloud',
                                syncStatus: 'synced',
                                sync_status: 'synced',
                                syncBlockReason: '',
                                sync_block_reason: '',
                                updatedAt: c.updated_at || new Date().toISOString()
                            });
                        }
                    }

                    // 2. Алиасы подрядчиков
                    const { data: cloudAliases, error: aliasesErr } = await window.supabaseClient
                        .from('contractor_aliases')
                        .select('*')
                        .eq('project_code', pCode);

                    if (aliasesErr) throw aliasesErr;

                    if (Array.isArray(cloudAliases)) {
                        for (const a of cloudAliases) {
                            await dbPut(STORES.CONTRACTOR_ALIASES, {
                                ...a,
                                source: 'cloud',
                                syncStatus: 'synced',
                                sync_status: 'synced',
                                syncBlockReason: '',
                                sync_block_reason: '',
                                updatedAt: a.updated_at || new Date().toISOString()
                            });
                        }
                    }

                    // 3. Очередь нормализации подрядчиков
                    const { data: cloudQueue, error: queueErr } = await window.supabaseClient
                        .from('contractor_normalization_queue')
                        .select('*')
                        .eq('project_code', pCode);

                    if (queueErr) throw queueErr;

                    if (Array.isArray(cloudQueue)) {
                        for (const q of cloudQueue) {
                            await dbPut(STORES.CONTRACTOR_QUEUE, {
                                ...q,
                                source: 'cloud',
                                syncStatus: 'synced',
                                sync_status: 'synced',
                                syncBlockReason: '',
                                sync_block_reason: '',
                                updatedAt: q.updated_at || new Date().toISOString()
                            });
                        }
                    }

                    // 4. Платформенная таблица contractors → merge legal_* в локальный directory (тот же UUID)
                    try {
                        const { data: platformContractors, error: platformContrErr } = await window.supabaseClient
                            .from('contractors')
                            .select('*');

                        if (platformContrErr) throw platformContrErr;

                        if (Array.isArray(platformContractors)) {
                            for (const pc of platformContractors) {
                                if (!pc || !pc.id) continue;
                                const local = await dbGet(STORES.CONTRACTOR_DIRECTORY, pc.id);
                                if (!local) continue; // identity остаётся за pull contractor_directory

                                const legalFields = [
                                    'legal_name', 'legal_form', 'legal_address',
                                    'contact_person', 'contact_phone', 'contact_email'
                                ];
                                let changed = false;
                                for (const field of legalFields) {
                                    if (pc[field] !== undefined && pc[field] !== null && String(local[field] || '') !== String(pc[field] || '')) {
                                        local[field] = pc[field] || '';
                                        changed = true;
                                    }
                                }
                                if (pc.inn !== undefined && pc.inn !== null && String(local.inn || '') !== String(pc.inn || '')) {
                                    local.inn = pc.inn || '';
                                    changed = true;
                                }
                                if (pc.displayName && String(local.display_name || '') !== String(pc.displayName || '')) {
                                    // Не перетираем локально грязную карточку
                                    const localDirty = (local.syncStatus || local.sync_status) === 'not_synced' || local.source === 'local';
                                    if (!localDirty) {
                                        local.display_name = pc.displayName;
                                        changed = true;
                                    }
                                }
                                if (changed) {
                                    local.updatedAt = pc.updated_at || new Date().toISOString();
                                    local.updated_at = local.updatedAt;
                                    await dbPut(STORES.CONTRACTOR_DIRECTORY, local);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[Sync][Подрядчики] Не удалось подтянуть platform contractors:', e.message || e);
                    }

                    // 5. Платформенная таблица contracts → IDB + память сервиса
                    if (STORES.CONTRACTS) {
                        try {
                            const { data: cloudContracts, error: contractsErr } = await window.supabaseClient
                                .from('contracts')
                                .select('*');

                            if (contractsErr) throw contractsErr;

                            if (Array.isArray(cloudContracts)) {
                                for (const c of cloudContracts) {
                                    if (!c || !c.id) continue;
                                    await dbPut(STORES.CONTRACTS, {
                                        ...c,
                                        contractorId: c.contractorId || c.contractor_id,
                                        _deleted: c.is_deleted === true,
                                        source: 'cloud',
                                        syncStatus: 'synced',
                                        sync_status: 'synced',
                                        syncBlockReason: '',
                                        sync_block_reason: '',
                                        updatedAt: c.updated_at || new Date().toISOString()
                                    });
                                }
                            }
                        } catch (e) {
                            console.warn('[Sync][Подрядчики] Не удалось подтянуть contracts:', e.message || e);
                        }
                    }

                    // Обновляем кэш ContractorDirectory после pull
                    if (window.ContractorDirectory && typeof window.ContractorDirectory.init === 'function') {
                        await window.ContractorDirectory.init();
                    }
                } catch (e) {
                    console.warn('[Sync][Подрядчики] Не удалось подтянуть справочник подрядчиков:', e.message || e);
                }
            }

            // --- Справочник локаций v2 (location_nodes + construction_floors_v2) ---
            if (STORES.LOCATION_NODES && window.supabaseClient) {
                try {
                    const { data: cloudNodes, error: locErr } = await window.supabaseClient
                        .from('location_nodes')
                        .select('*');
                    if (locErr) throw locErr;
                    if (Array.isArray(cloudNodes)) {
                        for (const n of cloudNodes) {
                            if (!n || !n.id) continue;
                            await dbPut(STORES.LOCATION_NODES, {
                                ...n,
                                nodeType: n.nodeType || n.node_type || null,
                                parentId: n.parentId !== undefined ? n.parentId : (n.parent_id ?? null),
                                displayName: n.displayName || n.display_name || '',
                                _deleted: n.is_deleted === true,
                                source: 'cloud',
                                syncStatus: 'synced',
                                sync_status: 'synced',
                                updatedAt: n.updated_at || new Date().toISOString()
                            });
                        }
                    }
                    if (STORES.CONST_FLOORS_V2) {
                        const { data: cloudPlans, error: planErr } = await window.supabaseClient
                            .from('construction_floors_v2')
                            .select('*');
                        if (planErr) throw planErr;
                        if (Array.isArray(cloudPlans)) {
                            for (const p of cloudPlans) {
                                if (!p || !p.id) continue;
                                await dbPut(STORES.CONST_FLOORS_V2, {
                                    ...p,
                                    locationId: p.locationId || p.location_id,
                                    _deleted: p.is_deleted === true,
                                    source: 'cloud',
                                    syncStatus: 'synced',
                                    sync_status: 'synced',
                                    updatedAt: p.updated_at || new Date().toISOString()
                                });
                            }
                        }
                    }
                    const locSvc = window.RBI && window.RBI.services && window.RBI.services.locations;
                    if (locSvc && typeof locSvc.init === 'function') {
                        await locSvc.init();
                    }
                } catch (e) {
                    console.warn('[Sync][Локации] Не удалось подтянуть location_nodes/floors_v2:', e.message || e);
                }
            }
            // Пользовательские Чек-листы (Объекты)
            const templatePullSince = needFullReferencePull ? '' : lastPullAt;
            const templateObjects = await window.pullCloudObjects('user_template', templatePullSince, mode);
            if (templateObjects && templateObjects.length > 0) {
                if (!window.userTemplates || typeof window.userTemplates !== 'object') {
                    const templatesSvc = window.RBI && window.RBI.services && window.RBI.services.templates;
                    if (templatesSvc && typeof templatesSvc.replaceUserTemplates === 'function') {
                        templatesSvc.replaceUserTemplates({});
                    } else {
                        window.userTemplates = {};
                    }
                }
                let templatesChanged = false;
                for (const obj of templateObjects) {
                    const localExisting = await dbGet('user_templates', obj.id);
                    const localTime = localExisting?.data ? new Date(localExisting.data.updatedAt || 0).getTime() : 0;
                    const cloudTime = new Date(obj.updatedAt || 0).getTime();

                    if (!localExisting || cloudTime > localTime) {
                        if (obj._deleted) {
                            delete window.userTemplates[obj.id];
                            await dbDelete('user_templates', obj.id);
                        } else {
                            window.userTemplates[obj.id] = obj;
                            await dbPut('user_templates', { slug: obj.id, data: obj });
                        }
                        templatesChanged = true;
                    }
                }
                if (templatesChanged && window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') {
                    window.RBI.events.emit('templates:changed', {});
                }
            }
        } catch (e) {
            console.warn("[Sync] Прочие модули не подтянуты:", e.message);
        }
        let currentHistory = []; // <-- ОБЪЯВЛЯЕМ СНАРУЖИ БЛОКА
        // =====================================================
        // 5. PUSH: локальная история в новую архитектуру (ОПТИМИЗИРОВАНО)
        // =====================================================
        if (canPush) {
            currentHistory = typeof dbGetAll === 'function' ? (await dbGetAll('app_history') || []) : [];

            // Если не админ, отправляем только свои проверки
            if (window.RBI.services.permissions && !window.RBI.services.permissions.isAdmin()) {
                currentHistory = currentHistory.filter(i => i.inspectorName === iName);
            }

            // Блокируем "эхо" облачных проверок, но не теряем старые несинхронизированные записи
            currentHistory = currentHistory.filter(i => {
                if (!i) return false;

                const status = i.syncStatus || i.sync_status || '';
                const source = i.source || '';

                // Уже синхронизированное облачное эхо не отправляем обратно
                if (source === 'cloud' || status === 'synced') return false;

                // Любые несинхронизированные / заблокированные / локальные проверки отправляем всегда,
                // даже если они старше последней синхронизации.
                if (status !== 'synced') return true;
                if (source === 'local') return true;

                if (!lastPushAt) return true;

                const lastPushTime = new Date(lastPushAt).getTime();
                const t = new Date(i.updatedAt || i.updated_at || i.date || 0).getTime();

                return !t || Number.isNaN(t) || t >= lastPushTime;
            });

            if (currentHistory.length > 0) {
                const inspectionsBatch = [];
                const itemsBatch = [];
                const photosBatch = [];
                const localHistoryToUpdate = [];

                // Собираем пакеты данных
                for (const c of currentHistory) {
                    const inspectionId = String(c.id);
                    const isDeleted = c._deleted === true;

                    // Ретроактивная нормализация объекта
                    if (typeof ObjectDirectory !== 'undefined' && (!c.project_canonical_key || c.project_canonical_key === c.projectName || c.project_canonical_key === c.project_display_name)) {
                        try {
                            const match = await ObjectDirectory.normalizeProjectName(c.projectName || c.project_display_name);
                            if (match && match.status === 'matched') {
                                c.project_canonical_key = match.canonical_key;
                                c.project_display_name = match.display_name;
                                c.projectName = match.display_name;
                            }
                        } catch (err) { }
                    }

                    // Проверка прав на отправку
                    if (c.source === 'local' || c.importedFromBackup) {
                        const currentRole = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentRole() : 'guest';
                        const currentEngineer = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentEngineerName() : (window.syncConfig?.engineerName || '');
                        const assignedProjects = window.RBI.services.permissions ? window.RBI.services.permissions.getAssignedProjects() : (appSettings?.assignedProjects || []);
                        const recProject = c.project_canonical_key || c.projectName || '';
                        const recEngineer = c.inspectorName || c.inspector_name || '';

                        let allowedToPush = false;
                        let blockReason = '';

                        if (!canPush) {
                            blockReason = 'Роль не подтверждена для отправки';
                        } else if (window.RBI.services.permissions ? window.RBI.services.permissions.isAdmin() : ['manager', 'deputy_manager'].includes(currentRole)) {
                            allowedToPush = true;
                        } else if (currentRole === 'engineer') {
                            const ownerOk = !recEngineer || recEngineer === currentEngineer;
                            // Согласовано с filterByDataScope('ownProjectOrOwnRecords',
                            // permission.service.js): пустой assignedProjects больше НЕ
                            // разрешает push по любому объекту — только записи без
                            // назначенного проекта (свои же). Раньше пустой список
                            // трактовался как "доступ ко всему", что противоречило
                            // чтению того же инженера (см. current_plan.md §2).
                            const isUnassignedProject = recProject === 'unknown' || recProject === '';
                            const projectOk = (!assignedProjects || assignedProjects.length === 0)
                                ? isUnassignedProject
                                : assignedProjects.includes(recProject);

                            if (ownerOk && projectOk) allowedToPush = true;
                            else if (!ownerOk) blockReason = 'Запись создана другим инженером';
                            else blockReason = 'Объект не назначен пользователю';
                        } else {
                            blockReason = 'Эта роль не может отправлять проектные данные';
                        }

                        if (!allowedToPush) {
                            c.syncStatus = 'blocked'; c.sync_status = 'blocked';
                            c.syncBlockReason = blockReason || 'Отправка запрещена'; c.sync_block_reason = c.syncBlockReason;
                            c.updatedAt = new Date().toISOString();
                            localHistoryToUpdate.push(c);
                            continue;
                        }
                    }

                    const uploadedPhotos = {};
                    const storagePathsToRemove = [];

                    // ПАРАЛЛЕЛЬНАЯ отправка фото для одной инспекции.
                    // Множественные фото к пункту чек-листа (B1): c.photos[itemId] —
                    // массив (window.normalizeItemPhotos покрывает и старые записи
                    // со строкой). Каждый элемент массива грузится и пишется отдельной
                    // строкой rbi_inspection_photos с собственным photo_index — id
                    // строки теперь `${inspectionId}_${itemId}_${photoIndex}` (было
                    // `..._main`, всегда photoIndex=0 для единственного фото).
                    const photoItemIds = Object.keys(c.photos || {});
                    const photoPromises = photoItemIds.map(async (itemId) => {
                        const oldPhotosArr = window.normalizeItemPhotos(c.photos[itemId]);
                        const uploadedArr = [];

                        if (isDeleted) {
                            oldPhotosArr.forEach((oldPhoto, photoIndex) => {
                                const path = getStoragePathFromPublicUrl(oldPhoto, 'inspection-photos');
                                if (path) storagePathsToRemove.push(path);
                                if (oldPhoto && isHttpUrl(oldPhoto)) {
                                    photosBatch.push({
                                        id: `${inspectionId}_${itemId}_${photoIndex}`, inspection_id: inspectionId, project_code: pCode, project_canonical_key: c.project_canonical_key || c.projectName || '',
                                        source: 'cloud', sync_status: 'synced', sync_block_reason: '', item_id: String(itemId), photo_index: photoIndex, photo_type: 'inspection',
                                        bucket_name: 'inspection-photos', storage_path: path, public_url: oldPhoto, updated_at: new Date().toISOString()
                                    });
                                }
                            });
                            return;
                        }

                        for (let photoIndex = 0; photoIndex < oldPhotosArr.length; photoIndex++) {
                            const oldPhoto = oldPhotosArr[photoIndex];
                            let localPhotoSizeBytes = 0; let localPhotoMimeType = '';
                            try {
                                if (oldPhoto && oldPhoto.startsWith('local://') && typeof dbGet === 'function') {
                                    const localPhotoRecord = await dbGet('app_photos', oldPhoto);
                                    if (localPhotoRecord && localPhotoRecord.data) {
                                        localPhotoSizeBytes = localPhotoRecord.data.byteLength || localPhotoRecord.sizeBytes || 0;
                                        localPhotoMimeType = localPhotoRecord.mimeType || localPhotoRecord.mime_type || '';
                                    }
                                }
                            } catch (e) { }

                            const publicUrl = await window.rbiUploadAsset(oldPhoto, 'inspection-photos', `${pCode}/inspections/${inspectionId}/${itemId}_${photoIndex}`, 'photo');
                            uploadedArr[photoIndex] = publicUrl;

                            if (publicUrl && isHttpUrl(publicUrl)) {
                                const photoStoragePath = getStoragePathFromPublicUrl(publicUrl, 'inspection-photos');
                                photosBatch.push({
                                    id: `${inspectionId}_${itemId}_${photoIndex}`, inspection_id: inspectionId, project_code: pCode, project_canonical_key: c.project_canonical_key || c.projectName || '',
                                    source: 'cloud', sync_status: 'synced', sync_block_reason: '', item_id: String(itemId), photo_index: photoIndex, photo_type: 'inspection',
                                    bucket_name: 'inspection-photos', storage_path: photoStoragePath, public_url: publicUrl, updated_at: new Date().toISOString()
                                });

                                if (oldPhoto && oldPhoto.startsWith('local://') && typeof PhotoManager !== 'undefined') {
                                    await PhotoManager.linkCloudToLocal(oldPhoto, publicUrl);
                                }
                                if (window.RbiStorageManager && typeof window.RbiStorageManager.registerUploadedFile === 'function') {
                                    await window.RbiStorageManager.registerUploadedFile({
                                        project_code: pCode, entity_type: 'inspection_photo', entity_id: inspectionId, field_path: `photos.${itemId}.${photoIndex}`,
                                        bucket: 'inspection-photos', storage_path: photoStoragePath, public_url: publicUrl, original_name: `inspection_${inspectionId}_${itemId}_${photoIndex}`,
                                        mime_type: localPhotoMimeType, size_bytes: localPhotoSizeBytes, uploaded_by: iName, cache_policy: 'auto', cache_status: 'cached_cloud'
                                    });
                                }
                            }
                        }

                        uploadedPhotos[itemId] = uploadedArr;
                    });

                    await Promise.all(photoPromises); // Дожидаемся фоток

                    if (storagePathsToRemove.length > 0) {
                        await window.supabaseClient.storage.from('inspection-photos').remove(storagePathsToRemove);
                    }

                    // Формируем пакет самой проверки
                    const inspContractorId = String(c.contractorId || '').trim();
                    const inspPayload = {
                        id: inspectionId, project_code: pCode,
                        project_name: c.project_display_name || c.projectName || '', project_canonical_key: c.project_canonical_key || c.projectName || '', project_display_name: c.project_display_name || c.projectName || '',
                        engineer_name: c.inspectorName || iName, inspector_name: c.inspectorName || iName, contractor_name: c.contractorName || '',
                        template_key: c.templateKey || '', template_title: c.templateTitle || '', location: c.location || '',
                        section: c.section || '', floor: c.floor || '', room: c.room || '', inspection_date: c.date || new Date().toISOString(),
                        metrics: c.metrics || {}, is_completed: c.isCompleted !== false, is_deleted: isDeleted, deleted_at: isDeleted ? (c._deletedAt || new Date().toISOString()) : null,
                        inspection_type: c.inspection_type || 'rbi_audit',
                        source: 'cloud', sync_status: 'synced', sync_block_reason: '', updated_at: new Date().toISOString()
                    };
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inspContractorId)) {
                        inspPayload.contractorId = inspContractorId;
                    }
                    inspectionsBatch.push(inspPayload);

                    // Формируем пакет нарушений
                    for (const itemId of Object.keys(c.state || {})) {
                        const info = getChecklistItem(c.templateKey || '', itemId);
                        const d = (c.details || {})[itemId] || {};
                        itemsBatch.push({
                            id: `${inspectionId}_${itemId}`, inspection_id: inspectionId, project_code: pCode, project_canonical_key: c.project_canonical_key || c.projectName || '',
                            source: 'cloud', sync_status: 'synced', sync_block_reason: '', item_id: String(itemId), item_name: info?.n || d.name || '', item_weight: info?.w || d.weight || null,
                            status: c.state[itemId], comment: d.comment || d.text || '', cause_code: d.causeCode || '', fact_value: d.fact || d.factValue || '', tolerance_value: d.tolerance || d.toleranceValue || '',
                            details: d, updated_at: new Date().toISOString()
                        });
                    }

                    // Помечаем, что всё ок (и для живых, и для удаленных!)
                    c.source = 'cloud'; c.syncStatus = 'synced'; c.sync_status = 'synced';
                    c.syncBlockReason = ''; c.sync_block_reason = ''; c.importedFromBackup = false;
                    c.updatedAt = new Date().toISOString(); c.updated_at = c.updatedAt;

                    if (!isDeleted) {
                        c.photos = uploadedPhotos;
                    }
                    // ВСТАВКА: Обязательно сохраняем локально, чтобы статус стал synced и перестал спамить облако
                    localHistoryToUpdate.push(c);
                }

                // 🚀 ПАКЕТНАЯ ОТПРАВКА В БАЗУ (Вжух и готово!)
                if (inspectionsBatch.length > 0) {
                    const { error } = await window.supabaseClient.from('rbi_inspections').upsert(inspectionsBatch, { onConflict: 'id' });
                    if (error) {
                        console.warn('[Sync] Ошибка RLS: нет прав на отправку некоторых проверок', error.message);
                        // Помечаем их локально как заблокированные
                        localHistoryToUpdate.forEach(c => {
                            c.syncStatus = 'blocked';
                            c.sync_status = 'blocked';
                            c.syncBlockReason = 'Ошибка прав доступа (RLS)';
                            c.sync_block_reason = c.syncBlockReason;
                        });
                    } else {
                        actuallyPushedChecks += inspectionsBatch.length;
                    }
                }

                // Бьем на куски по 1000 строк (лимит Supabase)
                // RBI FIX: отправляем пункты и фото пачками с обязательной проверкой error.
                // Раньше ошибки upsert могли теряться, а локальная проверка помечалась как synced.
                await rbiUpsertBatches('rbi_inspection_items', itemsBatch, 500, { onConflict: 'id' });
                await rbiUpsertBatches('rbi_inspection_photos', photosBatch, 500, { onConflict: 'id' });

                // Обновляем локальную базу
                if (localHistoryToUpdate.length > 0 && typeof dbPutBatch === 'function') {
                    await dbPutBatch('app_history', localHistoryToUpdate);
                    if (Array.isArray(contractorArray)) {
                        localHistoryToUpdate.forEach(updatedC => {
                            const idx = contractorArray.findIndex(x => String(x.id) === String(updatedC.id));
                            if (idx >= 0) contractorArray[idx] = updatedC;
                        });
                    }
                }
            }
        }
        // =====================================================
        // 6. PUSH: черновик
        // =====================================================
        if (canPush) {
            if (typeof dbGet === 'function') {
                const currentSession = await dbGet('app_state', 'current_session');

                if (currentSession) {
                    const draftPhotos = {};

                    for (const itemId of Object.keys(currentSession.photos || {})) {
                        // Фото стройконтроля (def_*) хранятся в CONST_DEFECTS, не в черновике осмотра
                        if (String(itemId).startsWith('def_')) {
                            continue;
                        }
                        // Множественные фото к пункту чек-листа (B1): каждый элемент
                        // массива грузится отдельно (защита: только реально локальные —
                        // не http — фото), обратная совместимость со старым форматом
                        // (строка) через normalizeItemPhotos.
                        const itemPhotosArr = window.normalizeItemPhotos(currentSession.photos[itemId]);
                        const draftArr = [];
                        for (let pIdx = 0; pIdx < itemPhotosArr.length; pIdx++) {
                            const srcPhoto = itemPhotosArr[pIdx];
                            if (srcPhoto && !srcPhoto.startsWith('http')) {
                                const inspectorPath = window.sanitizeStorageKeySegment(stableInspectorId);
                                draftArr.push(await window.rbiUploadAsset(
                                    srcPhoto,
                                    'inspection-photos',
                                    `${pCode}/drafts/${inspectorPath}/${itemId}_${pIdx}`,
                                    'photo'
                                ));
                            } else {
                                draftArr.push(srcPhoto);
                            }
                        }
                        draftPhotos[itemId] = draftArr;
                    }

                    await window.supabaseClient
                        .from('rbi_draft_sessions')
                        .upsert({
                            id: `draft_${stableInspectorId}`,
                            project_code: pCode,
                            engineer_name: iName,
                            template_key: currentSession.templateKey || '',
                            template_title: currentSession.templateTitle || '',
                            contractor_name: currentSession.contractor || '',
                            location: currentSession.location || '',
                            section: currentSession.section || '',
                            floor: currentSession.floor || '',
                            room: currentSession.room || '',
                            state: currentSession.state || {},
                            details: currentSession.details || {},
                            photos: draftPhotos,
                            custom_expert_conclusions: currentSession.customExpertConclusions || {},
                            device_id: window.syncConfig.deviceId,
                            updated_at: new Date(currentSession.timestamp || Date.now()).toISOString()
                        }, { onConflict: 'id' });
                }
            }
        }
        // =====================================================
        // 7. PUSH: профиль инженера для совместимости
        // =====================================================
        // =====================================================
        // 7. PUSH: профиль инженера для совместимости
        // =====================================================
        if (canPush) {
            try {
                const currentSession = (typeof dbGet !== 'undefined')
                    ? (await dbGet('app_state', 'current_session') || {})
                    : {};

                // ИСПРАВЛЕНИЕ: Пушим профиль только если были реальные действия инженера после последней синхронизации
                const lastPushTime = lastPushAt ? new Date(lastPushAt).getTime() : 0;
                const profileLastUpdated = Math.max(
                    currentSession.timestamp || 0,
                    (typeof gameActionLogs !== 'undefined' && gameActionLogs.length > 0) ? new Date(gameActionLogs[gameActionLogs.length - 1].date).getTime() : 0,
                    (typeof weeklyPlanData !== 'undefined' && weeklyPlanData.tasks && weeklyPlanData.tasks.length > 0) ? new Date(weeklyPlanData.tasks[0].updatedAt || 0).getTime() : 0
                );

                // 🛡️ ЗАЩИТА 2: Строгая проверка свежести профиля
                // Устройство отправит свой XP в облако ТОЛЬКО если оно реально заработало новый опыт
                // ПОСЛЕ последней синхронизации.
                const isProfileReallyNewer = profileLastUpdated > lastPushTime;

                if (isProfileReallyNewer) {
                    let currentAuthUserId = null;
                    let currentAuthEmail = '';

                    try {
                        const { data: authData } = await window.supabaseClient.auth.getUser();
                        currentAuthUserId = authData?.user?.id || null;
                        currentAuthEmail = authData?.user?.email || '';
                    } catch (e) {
                        console.warn('[Sync] Не удалось получить auth user для профиля:', e);
                    }

                    // ИСПРАВЛЕНИЕ (403 42501): без валидного auth_user_id RLS-политика
                    // всегда отклонит upsert (проверено на реальной ошибке Supabase).
                    // Раньше сюда всё равно уходил payload с auth_user_id: null,
                    // что гарантированно триггерило "new row violates row-level security policy".
                    // Если сессия истекла/недоступна — не отправляем профиль в этой синхронизации,
                    // следующая успешная синхронизация с валидной сессией отправит его.
                    if (!currentAuthUserId) {
                        console.warn('[Sync] Профиль инженера не отправлен: невалидная auth-сессия (auth_user_id недоступен).');
                        throw new Error('Нет валидной auth-сессии для отправки профиля');
                    }

                    const profilePayload = {
                        inspector_id: stableInspectorId,

                        auth_user_id: currentAuthUserId,
                        auth_email: currentAuthEmail,
                        last_auth_at: new Date().toISOString(),

                        inspector_name: iName,
                        engineer_name: iName,
                        project_code: pCode,
                        pin_hash: window.syncConfig.pinHash || '',

                        profile_data: {
                            timestamp: Date.now(),
                            session: currentSession,

                            gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [],
                            plan: typeof weeklyPlanData !== 'undefined' ? weeklyPlanData : null,
                            absence: typeof engineerAbsence !== 'undefined' ? engineerAbsence : null,
                            statuses: typeof contractorStatuses !== 'undefined' ? contractorStatuses : {},
                            expertConclusions: typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {},

                            settings: typeof appSettings !== 'undefined' ? appSettings : {}
                        },

                        settings: typeof appSettings !== 'undefined' ? appSettings : {},
                        last_seen_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { error: profileError } = await window.supabaseClient
                        .from('rbi_engineer_profiles')
                        .upsert(profilePayload, { onConflict: 'inspector_id' });

                    if (profileError) {
                        console.error('[Sync] Ошибка записи профиля:', profileError);
                        throw profileError;
                    }

                    actuallyPushedProfiles = 1;
                    console.log('[Sync] Профиль инженера отправлен:', stableInspectorId);

                } // Закрываем if (profileLastUpdated >= lastPushTime)

            } catch (e) {
                console.warn('[Sync] Профиль инженера не отправлен:', e.message);
                if (mode === 'manual') safeToast('⚠️ Профиль не отправлен: ' + e.message.substring(0, 60));
            }
        }
        // =====================================================
        // 7.1. PUSH: задачи в rbi_tasks
        // =====================================================
        if (canPush) {
            try {

                let tasks = typeof dbGetAll === 'function'
                    ? (await dbGetAll('rbi_tasks') || [])
                    : (typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : []);

                const lastPushTimeTasks = lastPushAt ? new Date(lastPushAt).getTime() : 0;

                // ИСПРАВЛЕНИЕ: Отправляем ручные локальные / несинхронизированные задачи,
                // даже если они старше последней синхронизации
                tasks = tasks.filter(t => {
                    if (!t) return false;
                    if (t.type !== 'manual') return false;

                    const status = t.syncStatus || t.sync_status || '';
                    const source = t.source || '';

                    // Уже синхронизированное облачное эхо не отправляем обратно
                    if (source === 'cloud' || status === 'synced') {
                        return false;
                    }

                    // Старые несинхронизированные задачи отправляем всегда
                    if (status !== 'synced') return true;
                    if (source === 'local') return true;

                    const tTime = new Date(t.updatedAt || t.updated_at || t.date || t.createdAt || 0).getTime();
                    return tTime === 0 || Number.isNaN(tTime) || tTime >= lastPushTimeTasks;
                });
                const taskPushRole = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentRole() : 'guest';

                if (taskPushRole === 'engineer') {
                    tasks = tasks.filter(t => {
                        const taskEngineer =
                            t.engineerName ||
                            t.inspectorName ||
                            t.engineer_name ||
                            t.inspector_name ||
                            '';

                        return !taskEngineer || taskEngineer === iName;
                    });
                }

                if (!(window.RBI.services.permissions ? window.RBI.services.permissions.isEngineerOrAdmin() : ['engineer', 'deputy_manager', 'manager'].includes(taskPushRole))) {
                    tasks = [];
                }

                actuallyPushedTasks = tasks.length; // Запоминаем для честного счетчика

                if (tasks.length > 0) {
                    // ИСПРАВЛЕНИЕ: Пакетная отправка (Batch Upsert). 
                    // Решает проблему зависания, когда задач накопилось больше сотни.
                    for (let i = 0; i < tasks.length; i += 50) {
                        const batch = tasks.slice(i, i + 50);

                        // --- НОВОЕ: Загружаем фото закрытия задачи в облако ---
                        for (let task of batch) {
                            if (task.completionPhoto && task.completionPhoto.startsWith('local://')) {
                                task.completionPhoto = await window.rbiUploadAsset(
                                    task.completionPhoto,
                                    'inspection-photos',
                                    `${pCode}/tasks/${task.id}`,
                                    'photo'
                                );
                                if (typeof dbPut === 'function') await dbPut('rbi_tasks', task); // Обновляем локально, чтобы сохранить ссылку
                            }
                        }
                        // ------------------------------------------------------
                        // ------------------------------------------------------

                        const upsertData = batch.map(task => ({
                            id: String(task.id),
                            project_code: pCode,
                            project_canonical_key: task.project_canonical_key || task.project || task.projectName || '',
                            project_display_name: task.project_display_name || task.project || task.projectName || '',
                            engineer_name: task.engineerName || task.inspectorName || iName,
                            inspector_name: task.engineerName || task.inspectorName || iName,
                            contractor_name: task.contractor || task.contractorName || '',
                            title: task.title || '',
                            task_data: {
                                ...task,
                                source: 'cloud',
                                sync_status: 'synced'
                            },
                            status: task.status || 'pending',
                            task_date: task.date || task.taskDate || null,
                            is_deleted: task._deleted || false,
                            deleted_at: task._deleted ? (task._deletedAt || new Date().toISOString()) : null,
                            updated_at: task.updatedAt || task.updated_at || new Date().toISOString(),
                            created_at: task.createdAt || task.created_at || new Date().toISOString()
                        }));

                        const { error: taskError } = await window.supabaseClient
                            .from('rbi_tasks')
                            .upsert(upsertData, { onConflict: 'id' });

                        if (taskError) throw taskError;
                        // После успешной отправки задач помечаем локальные ручные задачи как синхронизированные
                        for (const task of batch) {
                            task.source = 'cloud';
                            task.syncStatus = 'synced';
                            task.sync_status = 'synced';
                            task.syncBlockReason = '';
                            task.sync_block_reason = '';
                            task.importedFromBackup = false;
                            task.updatedAt = new Date().toISOString();

                            if (typeof dbPut === 'function') {
                                await dbPut('rbi_tasks', task);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("[Sync] Задачи не отправлены:", e.message);
                if (mode === 'manual') safeToast('⚠️ Задачи не отправлены: ' + e.message.substring(0, 60));
            }

        }
        // =====================================================
        // 8. PUSH: рейтинг инженера
        // =====================================================
        if (canPush) {
            try {
                if (typeof gameCalculateAllProfiles === 'function') {
                    const profiles = gameCalculateAllProfiles();
                    const my = profiles[iName];

                    if (my) {
                        const rating = {
                            name: my.name || iName,
                            pi: my.pi || 0,
                            checksCount: my.checksCount || 0,
                            currentStreak: my.currentStreak || 0,
                            badgesData: my.badgesData || {},
                            monthlyPI: my.monthlyPI || {},
                            radarData: my.radarData || {},
                            levelObj: my.levelObj || null
                        };

                        const { data: authData } = await window.supabaseClient.auth.getUser();
                        const authUserId = authData?.user?.id || null;

                        await window.supabaseClient
                            .from('rbi_engineer_ratings')
                            .upsert({
                                id: stableInspectorId,
                                project_code: pCode,
                                engineer_name: iName,
                                auth_user_id: authUserId,
                                rating_data: rating,
                                pi: rating.pi,
                                checks_count: rating.checksCount,
                                level_name: rating.levelObj?.name || '',
                                is_deleted: false,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'project_code,engineer_name' });
                    }
                }
            } catch (e) {
                console.warn("[Sync] Рейтинг не отправлен:", e.message);
            }
        }
        // =====================================================
        // 8.1. PUSH: прочие модули через rbi_cloud_objects
        // =====================================================
        if (canPush) {
            try {
                const canCreatePush = window.RBI.services.permissions ? window.RBI.services.permissions.canCreate() : false;
                const projectObjectPushRole = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentRole() : 'guest'; // <-- ВОТ ЭТА СТРОКА

                if (!canCreatePush) {
                    console.log('[Sync] Push прочих проектных модулей пропущен из-за ограничений роли');
                } else {
                    const lastPushTime = lastPushAt ? new Date(lastPushAt).getTime() : 0;
                    const filterNew = (arr) => arr.filter(i => {
                        if (!i) return false;

                        const status = i.syncStatus || i.sync_status || '';
                        const source = i.source || '';

                        // Явно грязные записи отправляем всегда.
                        if (status === 'not_synced') return true;
                        if (status === 'blocked') return true;
                        if (source === 'local') return true;

                        // Облачное эхо не отправляем обратно.
                        if (source === 'cloud' || status === 'synced') return false;

                        // Если это локальный объект без статуса — считаем его кандидатом на отправку.
                        // Это важно для шаблонов, практик и отчетов, если при создании им не поставили syncStatus.
                        if (!source && !status) return true;

                        if (!lastPushTime) return true;

                        const rawTime =
                            i.updatedAt ||
                            i.updated_at ||
                            i.modifiedAt ||
                            i.modified_at ||
                            i.createdAt ||
                            i.created_at ||
                            i.generated_at ||
                            i.date ||
                            i.timestamp ||
                            0;

                        const t = new Date(rawTime).getTime();

                        // Если даты нет, лучше один раз попробовать отправить, чем потерять объект.
                        if (!t || Number.isNaN(t)) return true;

                        // Небольшой запас 5 секунд на рассинхрон часов/округление времени.
                        return t >= (lastPushTime - 5000);
                    });
                    // Единая функция отправки для всех новых таблиц
                    const syncTableData = async (storeName, memoryArrayName, objectType) => {
                        if (typeof dbGetAll !== 'function') return;
                        let items = filterNew(await dbGetAll(storeName) || []);

                        // --- ИСПРАВЛЕНИЕ ЗАЩИТЫ: Если не админ, отправляем только СВОИ записи ---
                        // ИСКЛЮЧЕНИЕ: Бэклог (feedback), так как инженеры могут лайкать чужие идеи!
                        const isAdminPush = window.RBI.services.permissions ? window.RBI.services.permissions.isAdmin() : false;
                        if (!isAdminPush && objectType !== 'feedback') {
                            items = items.filter(obj => {
                                const objOwner = obj.owner || obj.author || obj.inspectorName || obj.engineerName || '';
                                return !objOwner || objOwner === iName;
                            });
                        }
                        // ---------------------------------------------------------------------------------

                        for (const obj of items) {
                            try {
                                // RBI FIX: страхуем объекты, созданные на разных браузерах.
                                // Если конструктор шаблона/практики/отчета не поставил служебные поля,
                                // синхронизатор сам доводит объект до отправляемого состояния.
                                if (!obj.id) {
                                    obj.id = `${objectType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                                }

                                if (!obj.updatedAt && !obj.updated_at) {
                                    obj.updatedAt = new Date().toISOString();
                                }

                                if (!obj.source) {
                                    obj.source = 'local';
                                }

                                if (!obj.syncStatus && !obj.sync_status) {
                                    obj.syncStatus = 'not_synced';
                                    obj.sync_status = 'not_synced';
                                }

                                // bucketName внутри функции pushCloudObject переопределится сам на правильный
                                const updated = await window.pushCloudObject(objectType, obj.id, obj, 'custom-assets');
                                const registryBucketMap = {
                                    custom_twi_card: 'library-twi',
                                    custom_doc: 'library-docs',
                                    custom_node: 'library-nodes',
                                    practice: 'library-practices',
                                    etalon: 'library-etalons',
                                    assistant_kb: 'library-docs'
                                };

                                const registryBucket = registryBucketMap[objectType] || 'custom-assets';

                                if (updated && typeof window.rbiRegisterObjectFilesToRegistry === 'function') {
                                    await window.rbiRegisterObjectFilesToRegistry(objectType, obj.id, updated, registryBucket);
                                }
                                if (updated) {
                                    updated.source = 'cloud';
                                    updated.syncStatus = 'synced';
                                    updated.sync_status = 'synced';
                                    updated.syncBlockReason = '';
                                    updated.sync_block_reason = '';
                                    updated.importedFromBackup = false;
                                    updated.updatedAt = new Date().toISOString();

                                    // ЗАЩИТА ОТ RACE: пока шел push, запись в IndexedDB могла обновиться
                                    // (например, фоновая индексация OCR норматива дописала extractedText).
                                    // Подтягиваем самую свежую версию и мержим в неё результат push,
                                    // а не затираем её напрямую — иначе такие поля будут потеряны.
                                    try {
                                        const freshRecord = typeof dbGet === 'function'
                                            ? await dbGet(storeName, updated.id)
                                            : (await dbGetAll(storeName) || []).find(x => String(x.id) === String(updated.id));
                                        if (freshRecord && freshRecord.updatedAt && new Date(freshRecord.updatedAt).getTime() > new Date(obj.updatedAt || obj.updated_at || 0).getTime()) {
                                            updated = Object.assign({}, freshRecord, updated);
                                        }
                                    } catch (mergeErr) {
                                        console.warn('[Sync] Не удалось смержить свежую запись перед сохранением:', mergeErr);
                                    }

                                    await dbPut(storeName, updated);

                                    if (window[memoryArrayName] && Array.isArray(window[memoryArrayName])) {
                                        // НОВОЕ: Если элемент удален, чистим его из ОЗУ. Иначе - обновляем/добавляем
                                        if (updated._deleted || updated.is_deleted) {
                                            window[memoryArrayName] = window[memoryArrayName].filter(x => String(x.id) !== String(updated.id));
                                        } else {
                                            const idx = window[memoryArrayName].findIndex(x => String(x.id) === String(updated.id));
                                            if (idx !== -1) {
                                                window[memoryArrayName][idx] = updated;
                                            } else {
                                                window[memoryArrayName].push(updated);
                                            }
                                        }
                                    }
                                }
                            } catch (objErr) {
                                // RBI FIX (гонка "PDF/фото не синхронизируется"): ошибка отправки ОДНОГО
                                // объекта (например, файл ещё не дозаписался в IndexedDB, см. rbiUploadAsset)
                                // больше не прерывает отправку всех остальных объектов этой и следующих таблиц.
                                // Проблемный объект остаётся not_synced/local и будет отправлен повторно
                                // на следующем цикле синхронизации, когда файл уже точно будет на месте.
                                console.warn(`[Sync] Не удалось отправить объект ${objectType}/${obj.id}, повтор на следующей синхронизации:`, objErr.message || objErr);
                                pushErrors++;
                            }
                        }
                    };

                    // Синхронизация проектных модулей
                    await syncTableData('rbi_meetings', 'rbi_meetingsData', 'meeting');
                    await syncTableData('rbi_interventions', 'rbi_interventionsData', 'intervention');
                    await syncTableData('rbi_practices', 'rbi_practicesData', 'practice');
                    await syncTableData('rbi_schedule_stages', 'rbi_scheduleData', 'schedule');
                    await syncTableData('rbi_fmea', 'rbi_fmeaRecords', 'fmea');
                    await syncTableData('rbi_etalon_acts', 'etalonActsArray', 'etalon');
                    // Синхронизация модулей Стройконтроля (Иерархия, Дефекты на планах, Приемка)
                    await syncTableData('construction_buildings', '_sys_dummy', 'const_building');
                    await syncTableData('construction_floors', '_sys_dummy', 'const_floor');
                    await syncTableData('construction_defects', '_sys_dummy', 'const_defect');
                    await syncTableData('construction_units', '_sys_dummy', 'const_unit');
                    await syncTableData('construction_acceptance', '_sys_dummy', 'const_acceptance');

                    // Синхронизация новых таблиц Справочников
                    // Синхронизация новых таблиц Справочников
                    await syncTableData('custom_docs', 'customDocs', 'custom_doc');
                    await syncTableData('custom_nodes', 'customNodes', 'custom_node');
                    await syncTableData('twi_cards', 'customTwiCards', 'custom_twi_card');

                    // Официальный справочник объектов и алиасы ведут только админ/зам.
                    // Инженер не должен писать напрямую в project_objects/object_aliases:
                    // от инженера уходят заявки через object_normalization_queue.
                    const canManageObjects = window.RBI.services.permissions && typeof window.RBI.services.permissions.canManageObjects === 'function'
                        ? window.RBI.services.permissions.canManageObjects()
                        : false;

                    // Отправка справочника объектов (только для Админов)
                    if (canManageObjects) {
                        await syncTableData('project_objects', '_sys_obj_dummy', 'project_object');
                        await syncTableData('object_aliases', '_sys_alias_dummy', 'object_alias');
                    }

                    // Отправка заявок на новые объекты (могут все, кто может создавать проверки)
                    const canCreate = window.RBI.services.permissions ? window.RBI.services.permissions.canCreate() : false;
                    if (canCreate) {
                        await syncTableData('object_normalization_queue', '_sys_obj_queue_dummy', 'object_queue');
                    }

                    await syncTableData('feedback_list', 'rbi_feedbackData', 'feedback');
                    await syncTableData('report_templates', 'userReportTemplates', 'report_template');
                    await syncTableData('app_assistant_kb', 'appAssistantData', 'assistant_kb'); // <-- ОТПРАВКА БАЗЫ ИИ В ОБЛАКО
                    // --- АВТОМАТИЧЕСКАЯ ДЕДУПЛИКАЦИЯ TWI (РЕШЕНИЕ ОФЛАЙН-КОНФЛИКТОВ) ---
                    if (typeof customTwiCards !== 'undefined' && customTwiCards.length > 0) {
                        const twiMap = new Map();
                        for (let i = 0; i < customTwiCards.length; i++) {
                            const c = customTwiCards[i];
                            // Проверяем только живые карты Технадзора с привязкой к конкретному пункту
                            if (c._deleted || c.type !== 'INSPECTOR' || !c.itemId || c.itemId === 'ALL') continue;

                            const dupKey = `${c.checklistKey}_${c.itemId}`;
                            if (twiMap.has(dupKey)) {
                                // Конфликт! Два инженера создали карту в офлайне.
                                const existing = twiMap.get(dupKey);
                                const timeExisting = new Date(existing.createdAt || 0).getTime();
                                const timeCurrent = new Date(c.createdAt || 0).getTime();

                                // Выживает та, что создана раньше. Проигравшая удаляется.
                                let loser = timeCurrent > timeExisting ? c : existing;
                                let winner = timeCurrent > timeExisting ? existing : c;

                                // Мягко удаляем проигравшую карточку (она отправится в облако как удаленная)
                                loser._deleted = true;
                                loser.is_deleted = true;
                                loser.updatedAt = new Date().toISOString();
                                loser.source = 'local';
                                loser.syncStatus = 'not_synced';
                                await dbPut('twi_cards', loser);

                                twiMap.set(dupKey, winner); // Оставляем победителя
                            } else {
                                twiMap.set(dupKey, c);
                            }
                        }
                        // Очищаем оперативную память от "убитых" дубликатов
                        customTwiCards = customTwiCards.filter(c => !c._deleted);
                    }
                    // --- КОНЕЦ ДЕДУПЛИКАЦИИ ---
                    // --- НОВОЕ: ОТПРАВКА ОТЧЕТОВ И HTML СНИМКОВ ---
                    let reportsToPush = filterNew(await dbGetAll(STORES.REPORTS) || []);

                    // Админы могут отправлять (в том числе удалять) чужие отчеты
                    const isAdmin = window.RBI.services.permissions ? window.RBI.services.permissions.isAdmin() : false;
                    if (!isAdmin) {
                        reportsToPush = reportsToPush.filter(r => r.created_by === iName || !r.created_by);
                    }

                    for (const rep of reportsToPush) {
                        try {
                            // RBI FIX: отчеты, созданные в разных браузерах, должны гарантированно попадать в push.
                            if (!rep.updatedAt && !rep.updated_at) {
                                rep.updatedAt = new Date().toISOString();
                                rep.updated_at = rep.updatedAt;
                            }

                            if (!rep.source) {
                                rep.source = 'local';
                            }

                            if (!rep.syncStatus && !rep.sync_status) {
                                rep.syncStatus = 'not_synced';
                                rep.sync_status = 'not_synced';
                            }
                            if (!rep.is_deleted && rep.file_blob && (!rep.file_url || rep.sync_status !== 'synced')) {
                                // 1. Загружаем PDF в бакет
                                const fileName = `${rep.id}.pdf`;
                                const { data: fileData, error: fileErr } = await window.supabaseClient.storage
                                    .from('reports')
                                    .upload(fileName, rep.file_blob, { upsert: true, contentType: 'application/pdf' });

                                if (fileErr) throw fileErr;

                                // Получаем публичную ссылку
                                const { data: pubData } = window.supabaseClient.storage.from('reports').getPublicUrl(fileName);
                                rep.file_url = pubData.publicUrl;
                            }

                            // 2. Отправляем метаданные в таблицу
                            await window.pushCloudObject('report', rep.id, rep, 'reports');
                            if (rep.file_url && typeof window.rbiRegisterObjectFilesToRegistry === 'function') {
                                await window.rbiRegisterObjectFilesToRegistry('report', rep.id, rep, 'reports');
                            }

                            // 3. Отправляем HTML-снимок для QR-кода (берем надежно из базы)
                            if (rep.snapshot_html) {
                                const snap = {
                                    id: 'snap_' + rep.id,
                                    report_id: rep.id,
                                    public_token: rep.public_token || rep.metadata?.public_token || rep.id,
                                    html_content: rep.snapshot_html,
                                    is_public: rep.is_public !== false,
                                    is_deleted: rep.is_deleted === true || rep._deleted === true,
                                    created_at: rep.created_at || new Date().toISOString(),
                                    updated_at: rep.updated_at || new Date().toISOString(),
                                    expires_at: null
                                };
                                await window.pushCloudObject('snapshot', snap.id, snap);

                                // После успешной отправки удаляем тяжелый HTML из базы телефона для экономии места
                                rep.snapshot_html = null;
                            } else if (window._tempSnapshots && window._tempSnapshots[rep.id]) {
                                // Резервный старый вариант из оперативной памяти
                                const snap = window._tempSnapshots[rep.id];
                                await window.pushCloudObject('snapshot', snap.id || ('snap_' + rep.id), snap);
                                delete window._tempSnapshots[rep.id];
                            }

                            // 4. ЖЕСТКО помечаем локально как синхронизированное (чтобы бейдж стал зеленым)
                            rep.source = 'cloud';
                            rep.sync_status = 'synced';
                            rep.syncStatus = 'synced';
                            rep.updated_at = new Date().toISOString();
                            rep.updatedAt = rep.updated_at; // Дублируем ключ для верности
                            await dbPut(STORES.REPORTS, rep);

                            // Обновляем массив в оперативной памяти
                            if (typeof reportsArray !== 'undefined') {
                                const idx = reportsArray.findIndex(x => x.id === rep.id);
                                if (idx !== -1) reportsArray[idx] = rep;
                            }

                            // Заставляем интерфейс перерисовать экран отчетов мгновенно!
                            if (document.getElementById('tab-analytics')?.classList.contains('active') && window.currentHistoryViewMode === 'reports') {
                                if (typeof renderReportsList === 'function') renderReportsList();
                            }

                        } catch (err) {
                            console.error('[Sync] Ошибка выгрузки отчета:', err);
                        }
                    }
                    // ---------------------------------------------

                    // Отправка ПК СК: новая правильная модель.
                    // Больше НЕ отправляем bundle с массивом records.
                    // Каждое замечание уходит отдельной строкой в public.sk_records
                    // с защитой от дублей через unique(project_code, sk_number).
                    if (typeof dbGetAll === 'function' && window.supabaseClient) {
                        let skRecs = await dbGetAll(STORES.SK_RECORDS) || [];

                        const skCurrentUser = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentEngineerName() : iName;
                        const canManageSk = window.RBI.services.permissions ? window.RBI.services.permissions.canManageSK() : false;
                        const isAdmin = window.RBI.services.permissions ? window.RBI.services.permissions.isAdmin() : false;

                        // ПК СК отправляют только те, кому разрешено
                        if (!canManageSk) {
                            skRecs = [];
                        } else if (!isAdmin) {
                            // Инженер отправляет только свои загруженные записи.
                            skRecs = skRecs.filter(r => {
                                const uploadedBy =
                                    r.uploaded_by ||
                                    r.sk_uploaded_by ||
                                    r.imported_by ||
                                    '';

                                return uploadedBy === skCurrentUser;
                            });
                        }

                        const skRecordsToPush = skRecs.filter(window.isSkRecordDirtyForPush);

                        if (skRecordsToPush.length > 0) {
                            let pushedSkCount = 0;
                            let blockedSkCount = 0;

                            const batchSize = 500;

                            for (let start = 0; start < skRecordsToPush.length; start += batchSize) {
                                const batch = skRecordsToPush.slice(start, start + batchSize);

                                const cloudBatch = [];
                                const localBatchMap = new Map();

                                for (const rec of batch) {
                                    const cloudRec = window.prepareSkRecordForCloud(rec, pCode);

                                    if (!cloudRec || !cloudRec.sk_number) {
                                        rec.syncStatus = 'blocked';
                                        rec.sync_status = 'blocked';
                                        rec.syncBlockReason = 'ПК СК: нет номера замечания';
                                        rec.sync_block_reason = rec.syncBlockReason;
                                        await dbPut(STORES.SK_RECORDS, rec);
                                        blockedSkCount++;
                                        continue;
                                    }

                                    const key = `${cloudRec.project_code}_${cloudRec.sk_number}`;
                                    cloudBatch.push(cloudRec);
                                    localBatchMap.set(key, rec);
                                }

                                if (cloudBatch.length === 0) continue;

                                try {
                                    const { data, error } = await window.supabaseClient
                                        .from('sk_records')
                                        .upsert(cloudBatch, {
                                            onConflict: 'project_code,sk_number'
                                        })
                                        .select('project_code,sk_number,id,updated_at');

                                    if (error) throw error;

                                    const nowIso = new Date().toISOString();
                                    const localBatchToUpdate = []; // <-- НОВЫЙ МАССИВ ДЛЯ ПАКЕТА

                                    for (const row of data || []) {
                                        const key = `${row.project_code}_${row.sk_number}`;
                                        const rec = localBatchMap.get(key);
                                        if (!rec) continue;

                                        rec.id = row.id || rec.id;
                                        rec.source = 'cloud';
                                        rec.syncStatus = 'synced';
                                        rec.sync_status = 'synced';
                                        rec.syncBlockReason = '';
                                        rec.sync_block_reason = '';
                                        rec._updatedAt = row.updated_at || nowIso;
                                        rec.updated_at = row.updated_at || nowIso;
                                        rec.updatedAt = row.updated_at || nowIso;

                                        localBatchToUpdate.push(rec); // <-- КЛАДЕМ В МАССИВ ВМЕСТО ОЖИДАНИЯ
                                        pushedSkCount++;
                                    }

                                    // СОХРАНЯЕМ ВСЮ ПАЧКУ СРАЗУ
                                    if (localBatchToUpdate.length > 0 && typeof dbPutBatch === 'function') {
                                        await dbPutBatch(STORES.SK_RECORDS, localBatchToUpdate);
                                    }
                                } catch (e) {
                                    console.warn('[Sync][ПК СК] Ошибка пакетной отправки:', e);

                                    for (const rec of batch) {
                                        rec.syncStatus = 'blocked';
                                        rec.sync_status = 'blocked';
                                        rec.syncBlockReason = e.message || 'Ошибка пакетной отправки ПК СК';
                                        rec.sync_block_reason = rec.syncBlockReason;
                                        rec._updatedAt = new Date().toISOString();
                                        rec.updated_at = rec._updatedAt;
                                        rec.updatedAt = rec._updatedAt;

                                        await dbPut(STORES.SK_RECORDS, rec);
                                        blockedSkCount++;
                                    }

                                    pushErrors++;
                                    localStorage.setItem('rbi_cloud_dirty', '1');
                                }
                            }

                            console.log(`[Sync][ПК СК] Отправлено: ${pushedSkCount}, заблокировано: ${blockedSkCount}`);
                        }

                        // Отправка журнала загрузок ПК СК
                        if (STORES.SK_IMPORT_BATCHES) {
                            const importBatches = await dbGetAll(STORES.SK_IMPORT_BATCHES) || [];
                            const batchesToPush = importBatches.filter(b => {
                                const status = b.syncStatus || b.sync_status || '';
                                const source = b.source || '';
                                return status === 'not_synced' || status === 'blocked' || source === 'local';
                            });

                            for (const batch of batchesToPush) {
                                const cloudBatch = window.prepareSkImportBatchForCloud(batch, pCode);
                                if (!cloudBatch || !cloudBatch.id) continue;

                                try {
                                    const { error } = await window.supabaseClient
                                        .from('sk_import_batches')
                                        .upsert(cloudBatch, {
                                            onConflict: 'id'
                                        });

                                    if (error) throw error;

                                    batch.source = 'cloud';
                                    batch.syncStatus = 'synced';
                                    batch.sync_status = 'synced';
                                    batch.syncBlockReason = '';
                                    batch.sync_block_reason = '';
                                    batch.updatedAt = new Date().toISOString();
                                    batch.updated_at = batch.updatedAt;

                                    await dbPut(STORES.SK_IMPORT_BATCHES, batch);
                                } catch (e) {
                                    console.warn('[Sync][ПК СК] Не удалось отправить журнал импорта:', batch.id, e);
                                }
                            }
                        }
                    }
                    // =====================================================
                    // PUSH справочника подрядчиков ПК СК
                    // contractor_directory / contractor_aliases / contractor_normalization_queue
                    // =====================================================
                    if (typeof dbGetAll === 'function' && window.supabaseClient && typeof STORES !== 'undefined') {
                        const isAdminContractors = window.RBI.services.permissions ? window.RBI.services.permissions.isAdmin() : false;
                        const canPushQueue = window.RBI.services.permissions ? window.RBI.services.permissions.canCreate() : false;

                        // 1. Справочник и Алиасы отправляют ТОЛЬКО Админы
                        if (isAdminContractors) {
                            try {
                                const contractorItems = await dbGetAll(STORES.CONTRACTOR_DIRECTORY) || [];
                                const contractorsToPush = contractorItems.filter(c => {
                                    const status = c.syncStatus || c.sync_status || '';
                                    const source = c.source || '';
                                    return status === 'not_synced' || status === 'blocked' || source === 'local';
                                });

                                for (const item of contractorsToPush) {
                                    const cloudItem = window.prepareContractorForCloud(item, pCode);
                                    if (!cloudItem) continue;

                                    const { error } = await window.supabaseClient
                                        .from('contractor_directory')
                                        .upsert(cloudItem, {
                                            onConflict: 'project_code,canonical_key'
                                        });

                                    if (error) throw error;

                                    // Dual-write в платформенную таблицу contractors (тот же UUID)
                                    if (typeof window.preparePlatformContractorForCloud === 'function') {
                                        const platformItem = window.preparePlatformContractorForCloud(item);
                                        if (platformItem) {
                                            const { error: platformErr } = await window.supabaseClient
                                                .from('contractors')
                                                .upsert(platformItem, { onConflict: 'id' });
                                            if (platformErr) throw platformErr;
                                        }
                                    }

                                    item.source = 'cloud';
                                    item.syncStatus = 'synced';
                                    item.sync_status = 'synced';
                                    item.syncBlockReason = '';
                                    item.sync_block_reason = '';
                                    item.updatedAt = new Date().toISOString();
                                    item.updated_at = item.updatedAt;

                                    await dbPut(STORES.CONTRACTOR_DIRECTORY, item);
                                }
                            } catch (e) {
                                console.warn('[Sync][Подрядчики] Ошибка отправки contractor_directory:', e);
                                pushErrors++;
                                localStorage.setItem('rbi_cloud_dirty', '1');
                            }

                            // Push договоров (после contractors — FK contractorId → contractors.id)
                            if (STORES.CONTRACTS && typeof window.prepareContractForCloud === 'function') {
                                try {
                                    const contractItems = await dbGetAll(STORES.CONTRACTS) || [];
                                    const contractsToPush = contractItems.filter(c => {
                                        const status = c.syncStatus || c.sync_status || '';
                                        const source = c.source || '';
                                        return status === 'not_synced' || status === 'blocked' || source === 'local';
                                    });

                                    for (const item of contractsToPush) {
                                        const cloudItem = window.prepareContractForCloud(item);
                                        if (!cloudItem) continue;

                                        const { error } = await window.supabaseClient
                                            .from('contracts')
                                            .upsert(cloudItem, { onConflict: 'id' });

                                        if (error) throw error;

                                        item.source = 'cloud';
                                        item.syncStatus = 'synced';
                                        item.sync_status = 'synced';
                                        item.syncBlockReason = '';
                                        item.sync_block_reason = '';
                                        item.updatedAt = new Date().toISOString();
                                        item.updated_at = item.updatedAt;

                                        await dbPut(STORES.CONTRACTS, item);
                                    }
                                } catch (e) {
                                    console.warn('[Sync][Подрядчики] Ошибка отправки contracts:', e);
                                    pushErrors++;
                                    localStorage.setItem('rbi_cloud_dirty', '1');
                                }
                            }

                            // Push справочника локаций v2
                            if (STORES.LOCATION_NODES && typeof window.prepareLocationNodeForCloud === 'function') {
                                try {
                                    const nodeItems = await dbGetAll(STORES.LOCATION_NODES) || [];
                                    const nodesToPush = nodeItems.filter(n => {
                                        const status = n.syncStatus || n.sync_status || '';
                                        const source = n.source || '';
                                        return status === 'not_synced' || status === 'blocked' || source === 'local';
                                    });
                                    for (const item of nodesToPush) {
                                        const cloudItem = window.prepareLocationNodeForCloud(item);
                                        if (!cloudItem) continue;
                                        const { error } = await window.supabaseClient
                                            .from('location_nodes')
                                            .upsert(cloudItem, { onConflict: 'id' });
                                        if (error) throw error;
                                        item.source = 'cloud';
                                        item.syncStatus = 'synced';
                                        item.sync_status = 'synced';
                                        item.updatedAt = new Date().toISOString();
                                        item.updated_at = item.updatedAt;
                                        await dbPut(STORES.LOCATION_NODES, item);
                                    }
                                    if (STORES.CONST_FLOORS_V2 && typeof window.prepareFloorPlanForCloud === 'function') {
                                        const planItems = await dbGetAll(STORES.CONST_FLOORS_V2) || [];
                                        const plansToPush = planItems.filter(p => {
                                            const status = p.syncStatus || p.sync_status || '';
                                            const source = p.source || '';
                                            return status === 'not_synced' || status === 'blocked' || source === 'local';
                                        });
                                        for (const item of plansToPush) {
                                            const cloudItem = window.prepareFloorPlanForCloud(item);
                                            if (!cloudItem) continue;
                                            const { error } = await window.supabaseClient
                                                .from('construction_floors_v2')
                                                .upsert(cloudItem, { onConflict: 'id' });
                                            if (error) throw error;
                                            item.source = 'cloud';
                                            item.syncStatus = 'synced';
                                            item.sync_status = 'synced';
                                            item.updatedAt = new Date().toISOString();
                                            item.updated_at = item.updatedAt;
                                            await dbPut(STORES.CONST_FLOORS_V2, item);
                                        }
                                    }
                                    const locSvc = window.RBI && window.RBI.services && window.RBI.services.locations;
                                    if (locSvc && typeof locSvc.init === 'function') {
                                        await locSvc.init();
                                    }
                                } catch (e) {
                                    console.warn('[Sync][Локации] Ошибка отправки location_nodes/floors_v2:', e);
                                    pushErrors++;
                                    localStorage.setItem('rbi_cloud_dirty', '1');
                                }
                            }

                            try {
                                const aliasItems = await dbGetAll(STORES.CONTRACTOR_ALIASES) || [];
                                const aliasesToPush = aliasItems.filter(a => {
                                    const status = a.syncStatus || a.sync_status || '';
                                    const source = a.source || '';
                                    return status === 'not_synced' || status === 'blocked' || source === 'local';
                                });

                                for (const item of aliasesToPush) {
                                    const cloudItem = window.prepareContractorAliasForCloud(item, pCode);
                                    if (!cloudItem) continue;

                                    const { error } = await window.supabaseClient
                                        .from('contractor_aliases')
                                        .upsert(cloudItem, {
                                            onConflict: 'project_code,raw_name'
                                        });

                                    if (error) throw error;

                                    item.source = 'cloud';
                                    item.syncStatus = 'synced';
                                    item.sync_status = 'synced';
                                    item.syncBlockReason = '';
                                    item.sync_block_reason = '';
                                    item.updatedAt = new Date().toISOString();
                                    item.updated_at = item.updatedAt;

                                    await dbPut(STORES.CONTRACTOR_ALIASES, item);
                                }
                            } catch (e) {
                                console.warn('[Sync][Подрядчики] Ошибка отправки contractor_aliases:', e);
                                pushErrors++;
                                localStorage.setItem('rbi_cloud_dirty', '1');
                            }
                        } // <-- ЗАКРЫЛИ БЛОК АДМИНА

                        // 2. Очередь заявок отправляют все Инженеры
                        if (canPushQueue) {
                            try {
                                const queueItems = await dbGetAll(STORES.CONTRACTOR_QUEUE) || [];

                                // Берём только реально грязные элементы, даже при ручной синхронизации.
                                const dirtyQueue = queueItems.filter(q => {
                                    const status = q.syncStatus || q.sync_status || '';
                                    const source = q.source || '';
                                    return status === 'not_synced' || status === 'blocked' || source === 'local';
                                });

                                // Убираем дубли по project_code + raw_name
                                const dedupMap = new Map();

                                for (const item of dirtyQueue) {
                                    const raw = String(item.raw_name || '').trim();
                                    if (!raw) continue;

                                    const key = `${item.project_code || pCode}__${raw.toLowerCase()}`;

                                    if (!dedupMap.has(key)) {
                                        dedupMap.set(key, item);
                                    }
                                }

                                const queueToPush = Array.from(dedupMap.values());
                                const cloudItems = [];

                                for (const item of queueToPush) {
                                    const cloudItem = window.prepareContractorQueueForCloud(item, pCode);
                                    if (cloudItem) cloudItems.push(cloudItem);
                                }

                                if (cloudItems.length > 0) {
                                    const { error } = await window.supabaseClient
                                        .from('contractor_normalization_queue')
                                        .upsert(cloudItems, {
                                            onConflict: 'project_code,raw_name'
                                        });

                                    if (error) throw error;

                                    const nowIso = new Date().toISOString();

                                    for (const item of queueToPush) {
                                        item.source = 'cloud';
                                        item.syncStatus = 'synced';
                                        item.sync_status = 'synced';
                                        item.syncBlockReason = '';
                                        item.sync_block_reason = '';
                                        item.updatedAt = nowIso;
                                        item.updated_at = nowIso;

                                        await dbPut(STORES.CONTRACTOR_QUEUE, item);
                                    }
                                }
                            } catch (e) {
                                console.warn('[Sync][Подрядчики] Ошибка отправки contractor_normalization_queue:', e);
                                pushErrors++;
                                localStorage.setItem('rbi_cloud_dirty', '1');
                            }
                        }
                    }
                    // Отправка Чек-листов (Это объект-словарь, а не массив)
                    if (typeof dbGetAll === 'function') {
                        const storedTmpls = await dbGetAll('user_templates') || [];
                        const tmplArray = storedTmpls.map(t => t.data);

                        for (const obj of filterNew(tmplArray)) {
                            const updated = await window.pushCloudObject('user_template', obj.id, obj, 'library-checklists');
                            if (updated) {
                                updated.syncStatus = 'synced';
                                updated.sync_status = 'synced';
                                await dbPut('user_templates', { slug: updated.id, data: updated });

                                if (window.userTemplates && typeof window.userTemplates === 'object') {
                                    if (updated._deleted || updated.is_deleted) {
                                        delete window.userTemplates[updated.id];
                                    } else {
                                        window.userTemplates[updated.id] = updated;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("[Sync] Прочие модули не отправлены:", e.message);
            }
        } // <-- Идеально закрытая скобка if(canPush)
        // =====================================================
        // 9. ЗАВЕРШЕНИЕ СИНХРОНИЗАЦИИ И ОБНОВЛЕНИЕ UI
        // =====================================================
        const doneAt = new Date().toISOString();

        const wasFirstFullPullForOfflineCache =
            localStorage.getItem('rbi_force_full_pull') === '1' ||
            !localStorage.getItem('rbi_sync_last_pull_at') ||
            forceFullPullRequested === true ||
            needFullReferencePull === true;

        localStorage.setItem('rbi_sync_last_push_at', doneAt);
        let referenceOk = true;
        try {
            const countAlive = (arr) => (arr || []).filter(x => {
                const obj = x && x.data && typeof x.data === 'object' ? x.data : x;
                return obj && obj._deleted !== true && obj.is_deleted !== true;
            }).length;

            const checkDocs = await dbGetAll('custom_docs') || [];
            const checkNodes = await dbGetAll('custom_nodes') || [];
            const checkTwi = await dbGetAll('twi_cards') || [];
            const checkKb = await dbGetAll('app_assistant_kb') || [];
            const checkUserTemplates = await dbGetAll('user_templates') || [];
            const checkPractices = await dbGetAll('rbi_practices') || [];
            const checkEtalons = await dbGetAll('rbi_etalon_acts') || [];
            const checkReportTemplates = await dbGetAll('report_templates') || [];

            const checkReferenceCount =
                countAlive(checkDocs) +
                countAlive(checkNodes) +
                countAlive(checkTwi) +
                countAlive(checkKb) +
                countAlive(checkUserTemplates) +
                countAlive(checkPractices) +
                countAlive(checkEtalons) +
                countAlive(checkReportTemplates);

            console.log('[Sync] Проверка справочников после pull:', {
                needFullReferencePull,
                checkReferenceCount
            });

            // ВАЖНО:
            // Ноль справочников сам по себе не ошибка.
            // Проект может быть пустым или без TWI/документов/шаблонов.
            referenceOk = true;
        } catch (e) {
            console.warn('[Sync] Не удалось проверить локальные справочники после pull:', e);
            referenceOk = false;
        }

        if (pushErrors === 0 && pullErrors === 0 && referencePullErrors === 0 && referenceOk) {
            localStorage.setItem('rbi_cloud_dirty', '0');
            localStorage.setItem('rbi_sync_last_pull_at', doneAt);
            localStorage.setItem('rbi_sync_last_remote_check_at', String(Date.now()));
            localStorage.removeItem('rbi_force_full_pull');
            localStorage.removeItem('rbi_force_remote_poll');
        } else {
            localStorage.setItem('rbi_force_full_pull', '1');
            localStorage.setItem('rbi_cloud_dirty', '1');
            console.log('[Sync] Pull неполный или с ошибками. Полный pull будет повторён при следующей синхронизации.', {
                pushErrors,
                pullErrors,
                referencePullErrors,
                referenceOk
            });
        }
        // =====================================================
        // 10. АВТО-ОЧИСТКА УДАЛЕННЫХ ЗАПИСЕЙ И ФАЙЛОВ ИЗ ПАМЯТИ
        // =====================================================
        try {
            const storesToClean = [
                'app_history', 'rbi_etalon_acts', 'rbi_tasks', 'rbi_meetings',
                'rbi_practices', 'rbi_interventions', 'rbi_fmea', 'sk_records',
                'user_templates', 'custom_docs', 'custom_nodes', 'twi_cards',
                'feedback_list', 'app_reports', 'project_objects', 'object_aliases'
            ];

            let hardDeletedCount = 0;
            // 1. Физическое удаление "мертвых" карточек
            for (let store of storesToClean) {
                const items = await dbGetAll(store);
                if (items) {
                    for (let item of items) {
                        const isDel = item._deleted === true || item.is_deleted === true || (item.data && item.data._deleted === true);
                        const isSynced = item.syncStatus === 'synced' || item.sync_status === 'synced';

                        if (isDel && isSynced) {
                            const key = item.id || item.slug;
                            if (key) {
                                await dbDelete(store, key);
                                hardDeletedCount++;
                            }
                        }
                    }
                }
            }

            // 2. Тихая зачистка осиротевших фото (если карточка удалена, её фото больше не нужны)
            if (hardDeletedCount > 0) {
                const usedPhotos = new Set();
                const extractFiles = (obj) => {
                    if (!obj) return;
                    if (typeof obj === 'string') {
                        if (obj.startsWith('local://') || obj.startsWith('http')) usedPhotos.add(obj);
                    } else if (typeof obj === 'object') {
                        Object.values(obj).forEach(extractFiles);
                    }
                };

                const allStores = ['app_history', 'rbi_etalon_acts', 'rbi_tasks', 'rbi_meetings', 'rbi_practices', 'rbi_fmea', 'sk_records'];
                for (let store of allStores) {
                    const items = await dbGetAll(store);
                    if (items) items.forEach(extractFiles);
                }
                if (typeof customTwiCards !== 'undefined') extractFiles(customTwiCards);
                if (typeof customNodes !== 'undefined') extractFiles(customNodes);
                if (typeof customDocs !== 'undefined') extractFiles(customDocs);

                const allPhotos = await dbGetAll('app_photos');
                if (allPhotos) {
                    for (let p of allPhotos) {
                        if (!usedPhotos.has(p.id)) {
                            await dbDelete('app_photos', p.id);
                            if (PhotoManager.cache && PhotoManager.cache[p.id]) {
                                URL.revokeObjectURL(PhotoManager.cache[p.id]);
                                delete PhotoManager.cache[p.id];
                            }
                        }
                    }
                }
                console.log(`[Sync] Авто-очистка: навсегда удалено ${hardDeletedCount} записей и очищен кэш фото.`);
            }
        } catch (e) {
            console.warn('[Sync] Ошибка авто-очистки удаленных записей:', e);
        }
        // --- Фоновое кэширование облачных файлов (не чаще раза в 5 мин) ---
        // --- Лёгкое фоновое кэширование облачных файлов ---
        // --- RBI FIX: офлайн-кэш после синхронизации ---
        if (typeof window.rbiIsAutoCacheEnabled === 'function' && window.rbiIsAutoCacheEnabled()) {
            const syncWasSuccessful =
                pushErrors === 0 &&
                pullErrors === 0 &&
                referencePullErrors === 0 &&
                referenceOk === true;

            const firstFullOfflineCacheDone =
                localStorage.getItem('rbi_first_full_offline_cache_done') === '1';

            const shouldRunFirstFullOfflineCache =
                wasFirstFullPullForOfflineCache === true &&
                !firstFullOfflineCacheDone &&
                syncWasSuccessful &&
                typeof window.downloadMissingCloudFiles === 'function';

            if (shouldRunFirstFullOfflineCache) {
                // ВАЖНО:
                // После первой полной синхронизации нужно кэшировать ВСЁ,
                // а не только лёгкую очередь из 12-30 файлов.
                localStorage.setItem('rbi_first_full_offline_cache_started_at', String(Date.now()));

                setTimeout(async () => {
                    if (window.rbiFullOfflineCacheProcessing) return;

                    window.rbiFullOfflineCacheProcessing = true;

                    try {
                        console.log('[OfflineCache] Первая полная синхронизация завершена. Запускаем полное копирование файлов для офлайна.');

                        await window.downloadMissingCloudFiles(false);

                        window.rbiBgCacheQueue = [];

                        localStorage.setItem('rbi_first_full_offline_cache_done', '1');
                        localStorage.setItem('rbi_last_bg_cache_at', String(Date.now()));

                        if (typeof window.rbi_reloadReferenceMemory === 'function') {
                            await window.rbi_reloadReferenceMemory();
                        }

                        if (window.syncDirtyFlags) {
                            window.syncDirtyFlags.reference = true;
                            window.syncDirtyFlags.history = true;
                            window.syncDirtyFlags.analytics = true;
                            window.syncDirtyFlags.tasks = true;
                        }

                        console.log('[OfflineCache] Первичное полное копирование для офлайна завершено.');
                    } catch (e) {
                        console.warn('[OfflineCache] Ошибка первичного полного копирования:', e);
                        localStorage.removeItem('rbi_first_full_offline_cache_done');
                    } finally {
                        window.rbiFullOfflineCacheProcessing = false;
                    }
                }, 1500);
            } else {
                // Обычный режим после следующих синхронизаций:
                // не копируем всё заново, а обрабатываем только лёгкую очередь.
                const now = Date.now();
                const lastCacheAt = Number(localStorage.getItem('rbi_last_bg_cache_at') || 0);

                const hasCacheQueue = Array.isArray(window.rbiBgCacheQueue) && window.rbiBgCacheQueue.length > 0;

                if (hasCacheQueue || !lastCacheAt || (now - lastCacheAt) > 3 * 60 * 1000 || mode === 'manual') {
                    localStorage.setItem('rbi_last_bg_cache_at', String(now));

                    setTimeout(() => {
                        if (typeof window.rbiProcessBgCacheQueue === 'function') {
                            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent || '');
                            const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

                            window.rbiProcessBgCacheQueue({
                                maxPerRun: mode === 'manual'
                                    ? (isSafari || isIOS ? 60 : 180)
                                    : (isSafari || isIOS ? 30 : 100),
                                concurrency: isSafari || isIOS ? 2 : 5,
                                pauseBetweenRounds: isSafari || isIOS ? 1200 : 500
                            });
                        }
                    }, 1000);
                }
            }
        }
        // ИСПРАВЛЕНИЕ: Честный подсчет реально отправленных и полученных объектов
        const pulledChecks = cloudInspections ? cloudInspections.length : 0;
        const pushedChecks = actuallyPushedChecks;

        const totalPushed = pushedChecks + actuallyPushedTasks + actuallyPushedProfiles;
        const hasChanges = pulledChecks > 0 || totalPushed > 0;

        // Включаем флаги "Грязных данных", чтобы вкладки обновились при переходе на них
        window.syncDirtyFlags.templates = true;
        window.syncDirtyFlags.history = true;
        window.syncDirtyFlags.analytics = true;
        window.syncDirtyFlags.tasks = true;
        window.syncDirtyFlags.session = true;
        window.syncDirtyFlags.reference = true; // <-- ДОБАВИЛИ ФЛАГ СПРАВОЧНИКА
        // Перезагружаем Справочник объектов в память, если он прилетел из облака
        if (typeof ObjectDirectory !== 'undefined') await ObjectDirectory.init();

        // === АВТОГЕНЕРАЦИЯ И СИНХРОНИЗАЦИЯ ЗАДАЧ ===
        // Запускаем пересчет только если не открыто модальное окно
        const isModalOpen = document.body.classList.contains('modal-open');

        // Смотрит ли юзер на Задачи / Инженер (единый хелпер §5)?
        const isTasksTabActive = (typeof window.shouldDeferFullRender === 'function')
            ? window.shouldDeferFullRender(['tasks', 'engineer'])
            : !!(document.getElementById('tab-engineer')?.classList.contains('active'));

        // Если открыта модалка ИЛИ открыта вкладка Задач — запрещаем перерисовку!
        if (!isModalOpen && !isTasksTabActive) {
            if (typeof dbGetAll === 'function') {
                const freshTasks = await dbGetAll('rbi_tasks');
                if (freshTasks) window.rbi_tasksData = freshTasks.filter(t => !t._deleted);
            }

            if (typeof window.rbi_generateAutoTasks === 'function') await window.rbi_generateAutoTasks(true);
            if (typeof window.sk_generateAnomalyTasks === 'function') await window.sk_generateAnomalyTasks();
            if (typeof gameForceUpdatePlan === 'function') await gameForceUpdatePlan(true);
        } else {
            // Откладываем обновление на потом, чтобы не сбрасывать экран пользователю
            window.syncDirtyFlags.tasks = true;
            window.syncDirtyFlags.history = true;
        }
        // RBI NEW: мягкая автоочистка после полного успешного цикла синхронизации.
        // Ставим здесь, а не после профиля, чтобы сначала завершились проверки, задачи, справочники и интерфейсные флаги.
        try {
            if (
                window.RbiStorageManager &&
                typeof appSettings !== 'undefined' &&
                appSettings.storageAutoCleanupEnabled !== false &&
                typeof window.RbiStorageManager.syncFileRegistryFromCloud === 'function' &&
                typeof window.RbiStorageManager.runAdaptiveStorageCleanup === 'function'
            ) {
                await window.RbiStorageManager.syncFileRegistryFromCloud();
                if (typeof window.RbiStorageManager.backfillLocalFileRegistryCache === 'function') {
                    await window.RbiStorageManager.backfillLocalFileRegistryCache();
                }

                // Без await: очистка фоновая, не блокирует финальное сообщение синхронизации
                window.RbiStorageManager.runAdaptiveStorageCleanup('after_sync');
            }
        } catch (storageCleanupError) {
            console.warn('[StorageManager] Ошибка автоочистки после полной синхронизации:', storageCleanupError);
        }
        // <-- ВСТАВКА: Тихо обновляем Бэклог и в ручном, и в фоновом режиме (если вкладка открыта)
        // <-- ВСТАВКА: Тихо обновляем Бэклог и в ручном, и в фоновом режиме (если вкладка открыта)
        if (typeof rbi_renderFeedbackTab === 'function') rbi_renderFeedbackTab();
        if (typeof rbi_renderDevFeedbackTab === 'function') rbi_renderDevFeedbackTab();

        // RBI FIX: практики и эталоны после pull — paint только если Справочник не на экране (§5).
        if ((pulledPracticesChanged || pulledEtalonsChanged) && !document.body.classList.contains('modal-open')) {
            setTimeout(async () => {
                try {
                    const deferRef = (typeof window.shouldDeferFullRender === 'function')
                        ? window.shouldDeferFullRender('reference')
                        : false;

                    if (pulledPracticesChanged) {
                        if (typeof rbi_loadPractices === 'function') {
                            await rbi_loadPractices();
                        }
                        if (!deferRef && typeof rbi_renderPracticesTab === 'function') {
                            await rbi_renderPracticesTab();
                        }
                    }

                    if (pulledEtalonsChanged) {
                        if (typeof dbGetAll === 'function') {
                            window.etalonActsArray = (await dbGetAll('rbi_etalon_acts') || [])
                                .filter(x => !x._deleted && !x.is_deleted);
                        }

                        if (!deferRef) {
                            if (typeof renderEtalonActs === 'function') renderEtalonActs();
                            if (typeof renderEtalonsList === 'function') renderEtalonsList();
                            if (typeof renderEtalonList === 'function') renderEtalonList();
                            if (typeof renderEtalons === 'function') renderEtalons();
                            if (typeof renderReferenceTab === 'function') renderReferenceTab();
                        }
                    }

                    if (deferRef) {
                        if (window.RBI?.utils?.syncUi?.markDirty) {
                            window.RBI.utils.syncUi.markDirty(['reference', 'analytics']);
                        } else if (window.syncDirtyFlags) {
                            window.syncDirtyFlags.reference = true;
                            window.syncDirtyFlags.analytics = true;
                        }
                    } else if (window.syncDirtyFlags) {
                        window.syncDirtyFlags.reference = false;
                        window.syncDirtyFlags.analytics = true;
                    }

                    console.log('[Sync] Практики/эталоны обновлены в интерфейсе без перезагрузки.');
                } catch (e) {
                    console.warn('[Sync] Не удалось мягко обновить практики/эталоны:', e);
                    if (window.syncDirtyFlags) {
                        window.syncDirtyFlags.reference = true;
                        window.syncDirtyFlags.analytics = true;
                    }
                }
            }, 300);
        }

        if (mode === 'manual') {
            if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
            if (typeof renderSelector === 'function') renderSelector();

            // Память справочника обновляем всегда; full-render — только если
            // Справочник НЕ на экране (единый хелпер §5).
            const refDeferred = (typeof window.shouldDeferFullRender === 'function')
                ? window.shouldDeferFullRender('reference')
                : !!(document.getElementById('tab-reference')?.classList.contains('active'));
            if (typeof window.rbi_reloadReferenceMemory === 'function') {
                await window.rbi_reloadReferenceMemory();
            }
            if (refDeferred) {
                if (window.RBI?.utils?.syncUi?.markDirty) window.RBI.utils.syncUi.markDirty('reference');
                else if (window.syncDirtyFlags) window.syncDirtyFlags.reference = true;
            } else {
                if (typeof renderTwiList === 'function') renderTwiList();
                if (typeof renderDocsList === 'function') renderDocsList();
                if (typeof renderNodesList === 'function') renderNodesList();
                if (window.syncDirtyFlags) window.syncDirtyFlags.reference = false;
            }

            if (!pulledPracticesChanged && typeof rbi_loadPractices === 'function') {
                await rbi_loadPractices();
                if (!refDeferred && typeof rbi_renderPracticesTab === 'function') {
                    await rbi_renderPracticesTab();
                } else if (window.syncDirtyFlags) {
                    window.syncDirtyFlags.reference = true;
                }
            }

            // dirty для аналитики/истории — paint при следующем заходе
            if (window.RBI?.utils?.syncUi?.markDirty) {
                window.RBI.utils.syncUi.markDirty(['analytics', 'history']);
            } else if (window.syncDirtyFlags) {
                window.syncDirtyFlags.analytics = true;
                window.syncDirtyFlags.history = true;
            }

            if (hasChanges) {
                safeToast(`✅ Успешно! Отправлено: ${totalPushed}, загружено: ${pulledChecks}.`);
            } else {
                safeToast('✅ Синхронизировано. Новых данных нет.');
            }
        } else {
            // Тихий режим: НИЧЕГО НЕ ПЕРЕРИСОВЫВАЕМ! Только уведомления о критическом
            if (hasNewCriticalData) {
                safeToast("⚠️ В фоне загружены новые аварии (B3). Обновите вкладку для просмотра.");
            }
        }

        // sync:completed — оба канала (EventBus + document). Payload включает
        // activeTabId и счётчики; модули обязаны НЕ делать full-render активного
        // view (см. PLATFORM_TARGET_ARCHITECTURE.md §5).
        const activeSection = document.querySelector('.view-section.active');
        const syncCompletedPayload = {
            mode: mode,
            hasChanges: hasChanges,
            pulledChecks: pulledChecks,
            totalPushed: totalPushed,
            activeTabId: activeSection ? activeSection.id : null
        };
        if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') {
            window.RBI.events.emit('sync:completed', syncCompletedPayload);
        }
        document.dispatchEvent(new CustomEvent('sync:completed', { detail: syncCompletedPayload }));

    } catch (e) {
        console.error("[Sync] Ошибка:", e);
        pushErrors++;
        if (mode === 'manual') {
            safeToast('❌ Ошибка: ' + (e.message ? e.message.substring(0, 80) : 'Сбой сети'));
        } // <-- ВОТ ЭТОЙ СКОБКИ НЕ ХВАТАЛО
    } finally {
        if (window.syncTimeout) clearTimeout(window.syncTimeout);
        window.isSyncing = false;
        window.syncChannel.postMessage('sync_done');
        window.renderSyncUI();

        // Снимаем defer после тика: sync:completed-хендлеры и late UI уже отработали.
        if (typeof window.rbiEndSyncUiDefer === 'function') window.rbiEndSyncUiDefer(400);
        else {
            setTimeout(function () { window._rbiDeferActiveViewFullRender = false; }, 400);
        }

        // Если во время этого цикла sync был запрошен повторно (и отброшен из-за isSyncing),
        // не теряем его — запускаем отложенный повторный проход.
        if (window._rbiPendingSyncRetryMode) {
            const retryMode = window._rbiPendingSyncRetryMode;
            window._rbiPendingSyncRetryMode = null;
            setTimeout(() => window.triggerSync(retryMode), 300);
        }
    }
};
// === КОНЕЦ ФУНКЦИИ triggerSync ===
