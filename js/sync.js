/* Файл: js/sync.js (Исправленная версия сборки объектов) */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '', syncMode: 'personal', fullAccessGranted: false };
window.isSyncing = false;
window.appAssistantData = []; // Массив базы знаний ИИ
let syncTimeout = null;
const syncChannel = new BroadcastChannel('rbi_sync_lock');
syncChannel.onmessage = (e) => {
    if (e.data === 'sync_started') window.isSyncing = true;
    if (e.data === 'sync_done') window.isSyncing = false;
};
// Флаги отложенного обновления интерфейса (Lazy Rendering)
window.syncDirtyFlags = {
    templates: false,
    history: false,
    analytics: false,
    tasks: false,
    session: false,
    reference: false
};
// Хэш SHA-256 для пароля ""
const SYNC_FULL_ACCESS_HASH = "1570722437"
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Преобразуем в 32-битное целое
    }
    return hash.toString();
}
try {
    let saved = localStorage.getItem('rbi_sync_config');
    if (saved) window.syncConfig = JSON.parse(saved);
} catch (e) { }

if (!window.syncConfig.deviceId) {
    window.syncConfig.deviceId = 'dev_' + Date.now().toString(36);
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
}

function safeToast(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log(msg);
}

// === ПК СК: подготовка записи для таблицы public.sk_records ===
// ВАЖНО: в Supabase нельзя отправлять лишние JS-поля, которых нет в таблице.
// Поэтому собираем чистый объект только из разрешённых колонок.
function prepareSkRecordForCloud(record, projectCode) {
    if (!record) return null;

    const skNumber = String(record.sk_number || record.number || '').trim();
    if (!skNumber) return null;

    const pCode = String(projectCode || record.project_code || window.syncConfig?.projectCode || 'LOCAL').trim() || 'LOCAL';
    const uniqueKey = record.sk_unique_key || `${pCode}_${skNumber}`;

    return {
        id: record.id || `sk_${uniqueKey}`,

        project_code: pCode,
        sk_number: skNumber,
        sk_unique_key: uniqueKey,

        row_number: record.row_number || '',
        text: record.text || '',
        category: record.category || '',
        date_issued: record.date_issued || null,

        contractor_raw: record.contractor_raw || record.raw_contractor || record.contractor || '',
        contractor_name: record.contractor_name || record.contractorName || record.contractor || '',
        contractor_canonical_key: record.contractor_canonical_key || '',
        contractor_normalization_status: record.contractor_normalization_status || 'pending',
        contractor_representative: record.contractor_representative || '',

        deadline: record.deadline || null,
        status_raw: record.status_raw || record.status || '',
        status_normalized: record.status_normalized || '',
        is_verified_closed: record.is_verified_closed === true,
        date_resolved: record.date_resolved || null,

        issued_by: record.issued_by || record.inspector || '',
        closed_by: record.closed_by || '',

        structure: record.structure || '',
        project_loc: record.project_loc || '',
        project_raw_path: record.project_raw_path || record.project_loc || '',
        project_raw_name: record.project_raw_name || '',
        project_canonical_key: record.project_canonical_key || '',
        project_display_name: record.project_display_name || record.display_name || '',
        project_block: record.project_block || record.block || '',
        project_floor: record.project_floor || record.floor || '',
        project_normalization_status: record.project_normalization_status || 'pending',

        uploaded_by: record.uploaded_by || record.sk_uploaded_by || record.imported_by || '',
        sk_uploaded_by: record.sk_uploaded_by || record.uploaded_by || record.imported_by || '',
        imported_by: record.imported_by || '',

        first_uploaded_by: record.first_uploaded_by || record.uploaded_by || record.sk_uploaded_by || '',
        last_uploaded_by: record.last_uploaded_by || record.uploaded_by || record.sk_uploaded_by || '',

        import_batch_id: record.import_batch_id || '',
        import_count: record.import_count || 1,
        first_imported_at: record.first_imported_at || record.created_at || new Date().toISOString(),
        last_imported_at: record.last_imported_at || record.updated_at || record.updatedAt || new Date().toISOString(),

        source: 'cloud',
        sync_status: 'synced',
        sync_block_reason: '',

        is_deleted: record.is_deleted === true || record._deleted === true,
        deleted_at: record.deleted_at || record._deletedAt || null,

        created_at: record.created_at || record.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

// === ПК СК: преобразование строки public.sk_records из Supabase в локальный формат ===
function normalizeCloudSkRecordForLocal(row) {
    if (!row) return null;

    const isDeleted = row.is_deleted === true;

    return {
        ...row,

        id: row.id,
        number: row.sk_number || row.number || '',
        sk_number: row.sk_number || row.number || '',
        sk_unique_key: row.sk_unique_key || `${row.project_code || window.syncConfig?.projectCode || 'LOCAL'}_${row.sk_number || row.number || ''}`,

        contractor: row.contractor_name || row.contractor_raw || '',
        contractorName: row.contractor_name || row.contractor_raw || '',
        contractor_name: row.contractor_name || row.contractor_raw || '',
        raw_contractor: row.contractor_raw || '',

        status: row.status_raw || '',
        status_raw: row.status_raw || '',
        status_normalized: row.status_normalized || '',
        is_verified_closed: row.is_verified_closed === true,

        inspector: row.issued_by || '',
        issued_by: row.issued_by || '',
        closed_by: row.closed_by || '',

        canonical_key: row.project_canonical_key || '',
        display_name: row.project_display_name || row.project_raw_name || '',
        block: row.project_block || '',
        floor: row.project_floor || '',

        source: 'cloud',
        syncStatus: row.sync_status || 'synced',
        sync_status: row.sync_status || 'synced',
        syncBlockReason: row.sync_block_reason || '',
        sync_block_reason: row.sync_block_reason || '',

        _deleted: isDeleted,
        is_deleted: isDeleted,
        _deletedAt: row.deleted_at || null,
        deleted_at: row.deleted_at || null,

        _updatedAt: row.updated_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString()
    };
}

function isSkRecordDirtyForPush(record) {
    if (!record) return false;

    const status = record.syncStatus || record.sync_status || '';
    const source = record.source || '';

    // Отправляем только то, что реально требует отправки.
    // synced/cloud больше не гоняем туда-сюда.
    if (status === 'not_synced') return true;
    if (status === 'blocked') return true;
    if (source === 'local') return true;

    return false;
}

// === ПК СК: подготовка журнала импорта для public.sk_import_batches ===
function prepareSkImportBatchForCloud(batch, projectCode) {
    if (!batch) return null;

    return {
        id: batch.id,
        project_code: batch.project_code || projectCode || window.syncConfig?.projectCode || 'LOCAL',
        uploaded_by: batch.uploaded_by || window.syncConfig?.engineerName || '',
        uploaded_at: batch.uploaded_at || batch.date || new Date().toISOString(),

        file_name: batch.file_name || '',
        file_hash: batch.file_hash || '',

        project_canonical_key: batch.project_canonical_key || '',
        project_display_name: batch.project_display_name || '',

        records_total: batch.records_total || 0,
        records_created: batch.records_created || batch.added || 0,
        records_updated: batch.records_updated || batch.updated || 0,
        records_skipped: batch.records_skipped || batch.skipped || 0,

        status: batch.status || 'completed',
        error_message: batch.error_message || '',

        created_at: batch.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}


// === ПК СК: подготовка подрядчика для public.contractor_directory ===
function isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

// === ПК СК: подготовка подрядчика для public.contractor_directory ===
function prepareContractorForCloud(item, projectCode) {
    if (!item) return null;

    const pCode = String(projectCode || item.project_code || window.syncConfig?.projectCode || 'LOCAL').trim() || 'LOCAL';
    const canonicalKey = String(item.canonical_key || '').trim();
    const displayName = String(item.display_name || '').trim();

    if (!canonicalKey || !displayName) return null;

    const payload = {
        project_code: pCode,
        canonical_key: canonicalKey,
        display_name: displayName,
        synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
        inn: item.inn || '',
        created_by: item.created_by || window.syncConfig?.engineerName || '',
        is_deleted: item.is_deleted === true || item._deleted === true,
        created_at: item.created_at || item.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // В Supabase id = uuid. Строковые id не отправляем.
    if (isUuidLike(item.id)) {
        payload.id = item.id;
    }

    return payload;
}

// === ПК СК: подготовка алиаса подрядчика для public.contractor_aliases ===
// === ПК СК: подготовка алиаса подрядчика для public.contractor_aliases ===
function prepareContractorAliasForCloud(item, projectCode) {
    if (!item) return null;

    const pCode = String(projectCode || item.project_code || window.syncConfig?.projectCode || 'LOCAL').trim() || 'LOCAL';
    const rawName = String(item.raw_name || '').trim();
    const canonicalKey = String(item.canonical_key || '').trim();

    if (!rawName || !canonicalKey) return null;

    const payload = {
        project_code: pCode,
        raw_name: rawName,
        canonical_key: canonicalKey,
        created_by: item.created_by || window.syncConfig?.engineerName || '',
        created_at: item.created_at || item.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    if (isUuidLike(item.id)) {
        payload.id = item.id;
    }

    return payload;
}

// === ПК СК: подготовка очереди нормализации подрядчиков для public.contractor_normalization_queue ===
// === ПК СК: подготовка очереди нормализации подрядчиков для public.contractor_normalization_queue ===
function prepareContractorQueueForCloud(item, projectCode) {
    if (!item) return null;

    const pCode = String(projectCode || item.project_code || window.syncConfig?.projectCode || 'LOCAL').trim() || 'LOCAL';
    const rawName = String(item.raw_name || '').trim();

    if (!rawName) return null;

    const payload = {
        project_code: pCode,
        raw_name: rawName,
        cleaned_name: item.cleaned_name || '',
        suggested_canonical_key: item.suggested_canonical_key || '',
        source_table: item.source_table || 'sk_records',
        source_record_id: item.source_record_id || '',
        created_by: item.created_by || window.syncConfig?.engineerName || '',
        status: item.status || 'pending',
        admin_comment: item.admin_comment || '',
        created_at: item.created_at || item.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    if (isUuidLike(item.id)) {
        payload.id = item.id;
    }

    return payload;
}

window.hashPin = async function (pin) {
    if (!pin) return null;
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

window.initSync = async function () {
    window.renderSyncUI();

    try {
        if (window.supabase && window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) {
            window.supabaseClient = window.supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_KEY
            );
        }
    } catch (e) {
        console.error("Ошибка Supabase:", e);
    }

    if (!window.supabaseClient) {
        const block = document.getElementById('sync-settings-block');
        if (block && !block.innerHTML.includes('Облако отключено')) {
            block.insertAdjacentHTML(
                'afterbegin',
                '<div class="p-3 bg-red-50 text-red-600 text-[10px] font-bold text-center border-b border-red-200">⚠️ Облако отключено</div>'
            );
        }
        return;
    }

    // ВАЖНО:
    // Автосинхронизация запускается только если облако уже включено.
    // При локальной работе приложение вообще не трогаем.
    if (window.syncConfig.enabled && window.syncConfig.engineerName && window.syncConfig.projectCode) {
        setTimeout(() => {
            window.triggerSync('silent');
        }, 5000);

        setInterval(() => {
            // Экономим Supabase: не гоняем облако без изменений
            if (localStorage.getItem('rbi_cloud_dirty') === '1') {
                window.triggerSync('silent');
            }
        }, 60000);
    }
};

window.isSyncEnabled = function () { return window.syncConfig.enabled; };

window.renderSyncUI = function () {
    const container = document.getElementById('sync-settings-block');
    const headerIndicator = document.getElementById('header-sync-status');

    if (headerIndicator) {
        const cloudSvg = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 18H7a4 4 0 1 1 1-7.9A5 5 0 0 1 19 10a4 4 0 0 1 0 8z"/>
    </svg>`;

        const loadingSvg = `
    <svg width="14" height="14" viewBox="0 0 24 24" class="animate-spin" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" opacity="0.2"/>
        <path d="M21 12a9 9 0 0 1-9 9"/>
    </svg>`;

        if (window.syncConfig.enabled) {
            if (window.isSyncing) {
                // СИНХРОНИЗАЦИЯ → INDIGO
                headerIndicator.innerHTML = `<div class="text-indigo-500 flex items-center justify-center">${loadingSvg}</div>`;
            } else {
                // ОНЛАЙН → GREEN
                headerIndicator.innerHTML = `<div class="text-green-500 flex items-center justify-center">${cloudSvg}</div>`;
            }
        } else {
            // ОФФЛАЙН → GRAY
            headerIndicator.innerHTML = `<div class="text-slate-400 flex items-center justify-center">${cloudSvg}</div>`;
        }
    }

    if (!container) return;

    let engName = window.syncConfig.engineerName || (typeof appSettings !== 'undefined' ? appSettings.engineerName : '');

    if (window.syncConfig.enabled) {
        // Отрисовка "Моих объектов"
        const myProjects = (typeof appSettings !== 'undefined' && Array.isArray(appSettings.assignedProjects))
            ? appSettings.assignedProjects
            : [];

        // Исключаем заявки, которые сгенерировал импорт Стройконтроля или Справочник
        let projectsHtml = '';

        if (myProjects.length === 0) {
            projectsHtml = '<div class="text-[10px] text-slate-400 italic text-center mb-2 border border-dashed border-slate-300 rounded p-2">Объекты не добавлены. Шапка осмотра разблокирована для ручного ввода.</div>';
        } else {
            projectsHtml = myProjects.map(p => `
                <div class="flex justify-between items-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded-lg mb-1.5 shadow-sm">
                    <div>
                        <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">${p}</div>
                        <div class="text-[8px] font-black uppercase text-green-600">Подтверждён</div>
                    </div>
                    <button onclick="window.removeAssignedProject('${p.replace(/'/g, "\\'")}')" class="text-red-500 font-black text-[12px] px-2 active:scale-90">✕</button>
                </div>
            `).join('');
        }
        // --- НОВОЕ: Готовим блок выбора режима синхронизации в зависимости от роли ---
        const currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isManagerRole = ['director', 'project_manager', 'deputy_manager', 'manager'].includes(currentRole);
        const cloudStatus = window.RbiRoles ? window.RbiRoles.getCloudStatus() : (appSettings?.cloudStatus || 'pending');

        const roleLabels = {
            guest: 'Гость',
            contractor: 'Подрядчик',
            engineer: 'Инженер',
            project_manager: 'Руководитель проекта',
            deputy_manager: 'Заместитель руководителя',
            director: 'Директор',
            manager: 'Администратор'
        };

        let syncStatusTitle = 'Синхронизация активна';
        let syncStatusText = 'Данные могут синхронизироваться согласно вашей роли.';
        let syncStatusClass = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400';

        if (cloudStatus === 'pending') {
            syncStatusTitle = 'Ожидает подтверждения';
            syncStatusText = 'Администратор должен подтвердить вашу роль и закрепить объекты. До подтверждения данные не отправляются в облако.';
            syncStatusClass = 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-400';
        }

        if (cloudStatus === 'blocked') {
            syncStatusTitle = 'Доступ ограничен';
            syncStatusText = 'Отправка данных в облако недоступна. Новые данные сохраняются локально.';
            syncStatusClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400';
        }

        if (cloudStatus === 'offline') {
            syncStatusTitle = 'Локальный режим';
            syncStatusText = 'Данные сохраняются только на устройстве.';
            syncStatusClass = 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/50 text-slate-600 dark:text-slate-400';
        }

        let syncModeHtml = '';
        if (isManagerRole) {
            syncModeHtml = `
            <button onclick="gameOpenManagerPanelAuth()" class="w-full bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-b border-[var(--card-border)] py-3 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors hover:bg-orange-100">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> 
                Панель Руководителя
                <span id="admin-badge-count" class="hidden bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[8px] animate-pulse shadow-sm ml-1"></span>
            </button>
            <div class="p-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] flex justify-between items-center">
                <div>
                    <div class="font-bold text-[11px] uppercase text-slate-700 dark:text-slate-300">Обмен данными</div>
                    <div class="text-[9px] text-indigo-500 mt-1 font-bold">Выбран автоматически</div>
                </div>
                <div class="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                    Вся команда
                </div>
            </div>`;
            
            // Запускаем асинхронный подсчет заявок НАПРЯМУЮ из облака
            setTimeout(async () => {
                let totalReqs = 0;
                try {
                    if (window.supabaseClient) {
                        const pCode = window.syncConfig?.projectCode || 'RBI';
                        
                        // 1. Считаем заявки на подрядчиков (статус pending)
                        const { count: contrCount } = await window.supabaseClient
                            .from('contractor_normalization_queue')
                            .select('*', { count: 'exact', head: true })
                            .eq('project_code', pCode)
                            .eq('status', 'pending');
                        if (contrCount) totalReqs += contrCount;

                        // 2. Считаем заявки на объекты из ПК СК (статус pending)
                        const { count: objCount } = await window.supabaseClient
                            .from('object_normalization_queue')
                            .select('*', { count: 'exact', head: true })
                            .eq('project_code', pCode)
                            .eq('status', 'pending');
                        if (objCount) totalReqs += objCount;

                        // 3. Считаем заявки на доступы от инженеров
                        const { data: profiles } = await window.supabaseClient
                            .from('rbi_engineer_profiles')
                            .select('cloud_status, settings')
                            .eq('project_code', pCode);
                            
                        if (profiles) {
                            profiles.forEach(p => {
                                if (p.cloud_status === 'pending') {
                                    totalReqs++; // Заявка на доступ в систему
                                } else if (p.settings && Array.isArray(p.settings.requestedProjects)) {
                                    totalReqs += p.settings.requestedProjects.length; // Заявки на объекты
                                }
                            });
                        }
                    }
                } catch(e) {
                    console.warn('[Sync] Ошибка подсчета заявок для бейджа', e);
                }
                
                // Отрисовываем бейдж
                const badge = document.getElementById('admin-badge-count');
                if (badge) {
                    if (totalReqs > 0) {
                        badge.innerText = `+${totalReqs}`;
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                }
            }, 500);
        } else {
            // Инженерам оставляем выпадающий список
            syncModeHtml = `
            <div class="p-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] flex justify-between items-center">
                <div>
                    <div class="font-bold text-[11px] uppercase text-slate-700 dark:text-slate-300 cursor-pointer" ondblclick="window.resetFullAccess()">Обмен данными: ${window.syncConfig.syncMode === 'full' ? 'Вся команда' : 'Только мои'}</div>
                </div>
                <select id="sync-mode-select" class="input-base !w-auto !py-1.5 !text-[10px] font-bold" onchange="window.changeSyncMode(this.value)">
                    <option value="personal" ${window.syncConfig.syncMode === 'personal' ? 'selected' : ''}>Только мои</option>
                    <option value="full" ${window.syncConfig.syncMode === 'full' ? 'selected' : ''}>Вся команда</option>
                </select>
            </div>`;
        }
        // -----------------------------------------------------------------------------
        container.innerHTML = `
            <div class="p-4 ${syncStatusClass} border-b text-center">
            <div class="text-[12px] font-black uppercase mb-1">${syncStatusTitle}</div>
            <div class="text-[10px] font-bold leading-snug max-w-sm mx-auto">${syncStatusText}</div>
             <div class="mt-3 grid grid-cols-1 gap-1 text-[10px] font-bold">
            <div>Пользователь: ${window.syncConfig.engineerName}</div>
        <div>Код компании: ${window.syncConfig.projectCode}</div>
        <div class="font-black uppercase">Роль: ${roleLabels[currentRole] || currentRole}</div>
        <div class="font-black uppercase">Статус: ${cloudStatus}</div>
    </div>
</div>
            
            <div class="p-4 border-b border-[var(--card-border)] bg-[var(--card-bg)]">
                <h3 class="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1.5">🏢 Мои Объекты (Справочник)</h3>
                <div class="text-[10px] text-slate-500 mb-3 leading-snug">Добавьте объекты, на которых вы работаете. Они появятся в выпадающем списке в шапке осмотра.</div>
                
                ${projectsHtml}
                
                <div class="flex gap-2 mt-2">
                    <input type="text" id="new-assigned-project" list="sys-objects-list" class="input-base text-[11px] !py-2" placeholder="Название (или выберите из списка)...">
                    <datalist id="sys-objects-list">
                        ${(typeof ObjectDirectory !== 'undefined' ? ObjectDirectory.objects : []).map(o => `<option value="${o.display_name}"></option>`).join('')}
                    </datalist>
                    <button onclick="window.addAssignedProject()" class="bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm active:scale-95 shrink-0">Добавить</button>
                </div>
            </div>

            ${syncModeHtml}

            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.triggerSync('manual')" class="w-full bg-[var(--card-bg)] text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 mb-2 flex items-center justify-center gap-2 transition-colors hover:border-indigo-400">
    ${cloudStatus === 'pending' ? '🔎 Проверить статус' : '🔄 Синхронизировать сейчас'}
</button>
                <button onclick="window.disconnectSync()" class="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-colors">Отключить облако</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="p-4 border-b border-[var(--card-border)] bg-[var(--card-bg)]">
                <div class="space-y-3">
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Имя (Фамилия И.О.) *</label>
                        <input type="text" id="sync-name" class="input-base" value="${engName}" ${engName ? 'readonly' : ''}>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Код компании *</label>
                        <input type="text" id="sync-code" class="input-base" placeholder="Например: RBI-COMPANY">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">ПИН-код (Опционально)</label>
                        <input type="password" id="sync-pin" class="input-base" placeholder="4 цифры" maxlength="4" inputmode="numeric">
                    </div>
                </div>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.initCloudConnection()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 transition-transform">Подключиться к облаку</button>
            </div>
        `;
    }
};
window.pushObjectRequestToCloud = async function (requestedProject) {
    if (
        !requestedProject ||
        !window.supabaseClient ||
        !window.syncConfig ||
        !window.syncConfig.enabled ||
        !window.syncConfig.projectCode ||
        !window.syncConfig.engineerName
    ) {
        return false;
    }

    const pCode = window.syncConfig.projectCode;
    const iName = window.syncConfig.engineerName;
    const nowIso = new Date().toISOString();

    // 1. ЗАЯВКИ ИЗ ПК СК (На пополнение глобального справочника объектов)
    if (requestedProject.source === 'sk_import' || requestedProject.request_type === 'directory') {
        const rawNameStr = String(requestedProject.raw_name || requestedProject.display_name || '').trim();
        if (!rawNameStr) return false;

        // КРИТИЧЕСКИЙ ФИКС: Делаем ID постоянным на основе имени. 
        // Теперь при повторной загрузке локальная база просто перезапишет старую заявку, а не создаст дубль!
        const safeIdPart = rawNameStr.toLowerCase().replace(/[^a-zа-я0-9]/gi, '').substring(0, 20);
        const deterministicId = 'req_obj_' + pCode + '_' + safeIdPart;

        const payload = {
            id: deterministicId,
            project_code: pCode,
            raw_name: rawNameStr,
            suggested_canonical_key: requestedProject.canonical_key || '',
            source_table: 'sk_records',
            source_record_id: requestedProject.source_record_id || '',
            created_by: iName,
            status: 'pending',
            admin_comment: 'Новый объект найден при загрузке ПК СК',
            created_at: requestedProject.created_at || nowIso,
            updated_at: nowIso
        };

        if (!payload.raw_name) return false;

        // СНАЧАЛА Отправляем в облако (чтобы локальная БД не добавила лишние поля _deleted)
        const { error } = await window.supabaseClient.from('object_normalization_queue').upsert(payload, { onConflict: 'project_code,raw_name' });
        if (error) console.warn('Ошибка отправки заявки на объект:', error);

        // ПОСЛЕ отправки сохраняем локально
        if (typeof dbPut === 'function') {
            const localPayload = { ...payload }; // Клонируем от греха подальше
            await dbPut('object_normalization_queue', localPayload);
        }

        return true;
    }

    // 2. ЗАЯВКИ ОТ ИНЖЕНЕРА (На привязку инженера к объекту)
    const stableInspectorId = `${pCode}_${iName}`.replace(/\s+/g, '_');

    const { data: profileRows } = await window.supabaseClient
        .from('rbi_engineer_profiles')
        .select('inspector_id, inspector_name, engineer_name, project_code, settings, assigned_projects, role, cloud_status')
        .eq('inspector_id', stableInspectorId)
        .limit(1);

    const existingProfile = profileRows && profileRows.length > 0 ? profileRows[0] : null;
    const currentSettings = existingProfile?.settings || {};
    const oldRequests = Array.isArray(currentSettings.requestedProjects) ? currentSettings.requestedProjects : [];

    const existsCloud = oldRequests.some(p =>
        p.raw_name === requestedProject.raw_name ||
        (requestedProject.canonical_key && p.canonical_key === requestedProject.canonical_key)
    );

    const newRequests = existsCloud ? oldRequests : [...oldRequests, requestedProject];
    const newSettings = { ...currentSettings, requestedProjects: newRequests };

    const payload = {
        inspector_id: stableInspectorId,
        inspector_name: existingProfile?.inspector_name || iName,
        engineer_name: existingProfile?.engineer_name || iName,
        project_code: pCode,
        role: existingProfile?.role || appSettings?.userRole || 'guest',
        cloud_status: existingProfile?.cloud_status || appSettings?.cloudStatus || 'pending',
        assigned_projects: existingProfile?.assigned_projects || appSettings?.assignedProjects || [],
        settings: newSettings,
        updated_at: nowIso,
        last_seen_at: nowIso
    };

    await window.supabaseClient.from('rbi_engineer_profiles').upsert(payload, { onConflict: 'inspector_id' });
    return true;
};

window.addAssignedProject = async function () {
    const input = document.getElementById('new-assigned-project');
    const rawValue = input?.value?.trim() || '';
    if (!rawValue) return;

    if (typeof appSettings === 'undefined') return;

    if (!Array.isArray(appSettings.assignedProjects)) {
        appSettings.assignedProjects = [];
    }

    if (!Array.isArray(appSettings.pendingAssignedProjects)) {
        appSettings.pendingAssignedProjects = [];
    }

    let canonicalKey = '';
    let displayName = rawValue;
    let requestStatus = 'pending';

    // Пытаемся сразу сопоставить объект со справочником
    if (typeof ObjectDirectory !== 'undefined' && typeof ObjectDirectory.normalizeProjectName === 'function') {
        try {
            const normalized = await ObjectDirectory.normalizeProjectName(rawValue);

            if (
                normalized &&
                (
                    normalized.status === 'matched' ||
                    normalized.status === 'multiple_matched_auto_best'
                )
            ) {
                canonicalKey = normalized.canonical_key || '';
                displayName = normalized.display_name || rawValue;
                requestStatus = 'matched_pending_approval';
            }
        } catch (e) {
            console.warn('[Objects] Не удалось нормализовать объект:', e);
        }
    }

    const requestedProject = {
        raw_name: rawValue,
        canonical_key: canonicalKey,
        display_name: displayName,
        status: requestStatus,
        created_at: new Date().toISOString()
    };

    const existsLocal = appSettings.pendingAssignedProjects.some(p =>
        p.raw_name === rawValue ||
        (canonicalKey && p.canonical_key === canonicalKey)
    );

    if (!existsLocal) {
        appSettings.pendingAssignedProjects.push(requestedProject);
    }

    // ВАЖНО:
    // Пока пользователь pending/guest, это НЕ подтверждённое право.
    // Поэтому в assignedProjects не кладём, если статус не approved.
    const cloudStatus = appSettings.cloudStatus || 'offline';

    if (cloudStatus === 'approved' && canonicalKey) {
        if (!appSettings.assignedProjects.includes(canonicalKey)) {
            appSettings.assignedProjects.push(canonicalKey);
        }
    }

    if (typeof dbPut === 'function') {
        await dbPut('app_settings', { key: 'user_prefs', ...appSettings });
    }

    // Если облако подключено — записываем заявку в профиль пользователя,
    // чтобы админ видел её в панели руководителя.
    try {
        if (typeof window.pushObjectRequestToCloud === 'function') {
            await window.pushObjectRequestToCloud(requestedProject);
        }
    } catch (e) {
        console.warn('[Objects] Не удалось отправить заявку на объект в профиль:', e);
        localStorage.setItem('rbi_cloud_dirty', '1');
    }

    input.value = '';

    if (typeof ObjectDirectory !== 'undefined') {
        ObjectDirectory.initUI();
    }

    if (typeof window.renderSyncUI === 'function') {
        window.renderSyncUI();
    }

    if (typeof showToast === 'function') {
        showToast('🏢 Объект запрошен: ' + displayName);
    }
};

window.removeAssignedProject = async function (val) {
    if (typeof appSettings !== 'undefined' && appSettings.assignedProjects) {
        appSettings.assignedProjects = appSettings.assignedProjects.filter(p => p !== val);
        if (typeof dbPut === 'function') await dbPut('app_settings', { key: 'user_prefs', ...appSettings });

        // Если удалили все проекты - нужно вернуть шапке обычный текстовый input
        const projInputContainer = document.getElementById('inp-project')?.parentElement;
        if (appSettings.assignedProjects.length === 0 && projInputContainer) {
            projInputContainer.innerHTML = `<input type="text" id="inp-project" class="input-base text-center pr-7 transition-colors" placeholder="Объект *" autocomplete="off">
            <span id="lock-inp-project" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-50 hidden pointer-events-none">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"></path></svg>
            </span>`;
        } else {
            if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
        }

        window.renderSyncUI();
    }

    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

window.initCloudConnection = async function () {
    const name = document.getElementById('sync-name').value.trim();
    const code = document.getElementById('sync-code').value.trim();
    const pin = document.getElementById('sync-pin').value.trim();

    if (!name || !code) return safeToast("⚠️ Имя и Код проекта обязательны!");
    if (!window.supabaseClient) return alert("❌ Ошибка: Ключи базы данных не настроены");

    const { data: projData } = await window.supabaseClient.from('allowed_projects').select('code').eq('code', code).limit(1);
    if (!projData || projData.length === 0) return safeToast("❌ Ошибка: Такого кода проекта не существует!");

    const hashedPin = await window.hashPin(pin);
    const stableInspectorId = `${code}_${name}`.replace(/\s+/g, '_');

    const { data, error } = await window.supabaseClient
        .from('rbi_engineer_profiles')
        .select('inspector_id, pin_hash, role, cloud_status, assigned_projects, contractor_name, assigned_contractor, settings')
        .eq('project_code', code)
        .eq('inspector_name', name)
        .limit(1);

    if (error) {
        console.error('[Sync] Ошибка проверки профиля:', error);
        return safeToast("❌ Ошибка проверки профиля пользователя");
    }

    // Если профиль есть и PIN не совпал — просим правильный PIN.
    if (data && data.length > 0 && data[0].pin_hash && data[0].pin_hash !== hashedPin) {
        window.showPinPromptModal(name, code, data[0].pin_hash);
        return;
    }

    // Если профиля ещё нет — создаём заявку guest / pending.
    if (!data || data.length === 0) {
        const newProfile = {
            inspector_id: stableInspectorId,
            inspector_name: name,
            engineer_name: name,
            project_code: code,
            pin_hash: hashedPin || '',
            role: 'guest',
            cloud_status: 'pending',
            assigned_projects: [],
            contractor_name: '',
            assigned_contractor: '',
            settings: {
                assignedProjects: [],
                createdFromApp: true
            },
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: insertError } = await window.supabaseClient
            .from('rbi_engineer_profiles')
            .insert(newProfile);

        if (insertError) {
            console.error('[Sync] Ошибка создания профиля:', insertError);
            return safeToast("❌ Не удалось создать заявку на доступ");
        }

        if (typeof appSettings !== 'undefined') {
            appSettings.userRole = 'guest';
            appSettings.cloudStatus = 'pending';
            appSettings.assignedProjects = [];
            appSettings.assignedContractor = '';
            appSettings.contractorName = '';

            if (typeof dbPut === 'function') {
                await dbPut('app_settings', { key: 'user_prefs', ...appSettings });
            }
        }

        safeToast("✅ Заявка отправлена. Ожидает подтверждения администратора.");
    }

    // Если профиль уже есть — применяем его роль и статус.
    if (data && data.length > 0 && typeof appSettings !== 'undefined') {
        const profile = data[0];

        appSettings.userRole = profile.role || 'guest';
        appSettings.cloudStatus = profile.cloud_status || 'pending';

        appSettings.assignedContractor =
            profile.contractor_name ||
            profile.assigned_contractor ||
            '';

        appSettings.contractorName = appSettings.assignedContractor;

        const profileCloudStatus = profile.cloud_status || 'pending';

        if (profileCloudStatus === 'approved') {
            if (Array.isArray(profile.assigned_projects)) {
                appSettings.assignedProjects = profile.assigned_projects;
            } else if (profile.settings && Array.isArray(profile.settings.assignedProjects)) {
                appSettings.assignedProjects = profile.settings.assignedProjects;
            } else {
                appSettings.assignedProjects = [];
            }

            appSettings.pendingAssignedProjects = [];
        } else {
            // pending/blocked не должны стирать локальные заявки
            if (!Array.isArray(appSettings.assignedProjects)) {
                appSettings.assignedProjects = [];
            }

            if (profile.settings && Array.isArray(profile.settings.requestedProjects)) {
                appSettings.pendingAssignedProjects = profile.settings.requestedProjects;
            } else if (!Array.isArray(appSettings.pendingAssignedProjects)) {
                appSettings.pendingAssignedProjects = [];
            }
        }

        if (typeof dbPut === 'function') {
            await dbPut('app_settings', { key: 'user_prefs', ...appSettings });
        }
    }

    window.applySyncConnect(name, code, hashedPin);
};

window.showPinPromptModal = function (name, code, correctHash) {
    const html = `
    <div id="sync-pin-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-xs p-6 rounded-2xl shadow-2xl text-center">
            <h3 class="font-black text-[13px] uppercase text-slate-800 mb-4">Введите PIN-код</h3>
            <input type="password" id="sync-pin-verify" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xl font-black mb-4" placeholder="••••" maxlength="4" inputmode="numeric">
            <div class="flex gap-2">
                <button onclick="document.getElementById('sync-pin-modal').remove()" class="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-[10px] uppercase">Отмена</button>
                <button onclick="window.verifySyncPin('${name}', '${code}', '${correctHash}')" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Войти</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.verifySyncPin = async function (name, code, correctHash) {
    const input = document.getElementById('sync-pin-verify').value;
    const inputHash = await window.hashPin(input);
    if (inputHash === correctHash) {
        document.getElementById('sync-pin-modal').remove();
        window.applySyncConnect(name, code, inputHash);
    } else safeToast("❌ Неверный PIN-код!");
};

// Функция глубокой очистки проектных данных
window.clearProjectLocalData = async function () {
    if (typeof showToast === 'function') showToast("🧹 Очистка данных старого проекта...");

    // Очищаем таблицы проектных данных в IndexedDB
    await dbClear('app_history');
    await dbClear('rbi_tasks');
    await dbClear('rbi_schedule_stages');
    await dbClear('rbi_meetings');
    await dbClear('rbi_interventions');
    await dbClear('rbi_etalon_acts');
    await dbClear('rbi_fmea');
    await dbClear('sk_records');
    await dbClear('sk_imports');

    // Очищаем локальные массивы (ОЗУ)
    if (typeof contractorArray !== 'undefined') contractorArray = [];
    if (typeof etalonActsArray !== 'undefined') etalonActsArray = [];
    if (typeof window.rbi_tasksData !== 'undefined') window.rbi_tasksData = [];
    if (typeof window.rbi_scheduleData !== 'undefined') window.rbi_scheduleData = [];
    if (typeof window.rbi_meetingsData !== 'undefined') window.rbi_meetingsData = [];
    if (typeof window.rbi_interventionsData !== 'undefined') window.rbi_interventionsData = [];
    if (typeof window.rbi_fmeaRecords !== 'undefined') window.rbi_fmeaRecords = [];
    if (typeof window.skRecords !== 'undefined') window.skRecords = [];

    // Сброс плана и статусов
    if (typeof weeklyPlanData !== 'undefined') weeklyPlanData = { weekId: null, tasks: [], completed: false };
    if (typeof contractorStatuses !== 'undefined') contractorStatuses = {};

    // Очищаем кэш автозаполнения инпутов
    localStorage.removeItem('smart_input_cache');

    // Сброс мульти-фильтров
    if (typeof activeMultiFilters !== 'undefined') {
        activeMultiFilters = {
            history: { project: [], contractor: [], inspector: [] },
            analytics: { project: [], contractor: [], inspector: [], template: [] }
        };
    }

    if (typeof showToast === 'function') showToast("✅ Локальные данные очищены");
};

window.applySyncConnect = async function (name, code, hashedPin) {
    const oldCode = window.syncConfig.projectCode;

    // УМНАЯ ПРОВЕРКА: Если код объекта изменился
    if (oldCode && oldCode !== code) {
        if (confirm(`Вы меняете код проекта с "${oldCode}" на "${code}".\n\nОчистить локальные проектные данные (историю, задачи, встречи) предыдущего объекта?\n\nБиблиотека (TWI, Узлы, Справочники) останется нетронутой.`)) {
            await window.clearProjectLocalData();
        }
    }

    window.syncConfig.enabled = true;
    window.syncConfig.engineerName = name;
    window.syncConfig.projectCode = code;
    window.syncConfig.pinHash = hashedPin;

    // Не сбрасываем режим, если он уже был выбран
    if (!window.syncConfig.syncMode) window.syncConfig.syncMode = 'personal';

    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    localStorage.setItem('rbi_cloud_dirty', '1');

    if (typeof appSettings !== 'undefined') {
        appSettings.engineerName = name;

        // ВАЖНО: не затираем AI-настройки при подключении облака
        const oldSettings = JSON.parse(localStorage.getItem('rbi_settings_backup') || '{}');

        appSettings.aiEnabled = appSettings.aiEnabled ?? oldSettings.aiEnabled ?? false;
        appSettings.aiCorpPwd = appSettings.aiCorpPwd || oldSettings.aiCorpPwd || '';
        appSettings.apiKey = appSettings.apiKey || oldSettings.apiKey || '';
        appSettings.usePersonalKey = appSettings.usePersonalKey ?? oldSettings.usePersonalKey ?? false;

        localStorage.setItem('rbi_settings_backup', JSON.stringify(appSettings));

        if (typeof dbPut === 'function') {
            dbPut('app_settings', { key: 'user_prefs', ...appSettings });
        }
    }

    const inpInspector = document.getElementById('inp-inspector');
    if (inpInspector && !inpInspector.value) {
        inpInspector.value = name;
    }

    window.renderSyncUI();
    window.triggerSync('manual');
};

window.disconnectSync = function () {
    if (!confirm("Отключить облако? Данные останутся на устройстве.")) return;
    window.syncConfig.enabled = false;
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
};

window.changeSyncMode = function (mode) {
    if (mode === 'full' && !window.syncConfig.fullAccessGranted) {
        document.getElementById('sync-mode-select').value = 'personal';
        const html = `
        <div id="sync-full-access-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4">
            <div class="bg-white w-full max-w-xs p-6 rounded-2xl text-center">
                <h3 class="font-black text-[13px] uppercase mb-4">Пароль руководителя</h3>
                <input type="password" id="sync-full-access-pin" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xl font-black mb-4" placeholder="••••••" maxlength="6" inputmode="numeric">
                <div class="flex gap-2">
                    <button onclick="document.getElementById('sync-full-access-modal').remove()" class="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-[10px] uppercase">Отмена</button>
                    <button onclick="window.verifyFullAccessPin()" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Далее</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        return;
    }
    window.syncConfig.syncMode = mode;
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    if (mode === 'full') {
        localStorage.removeItem('rbi_sync_last_pull_at');
    }
    window.triggerSync('manual');
};

window.verifyFullAccessPin = async function () {
    const input = document.getElementById('sync-full-access-pin').value.trim();
    const inputHash = simpleHash(input);
    if (inputHash === SYNC_FULL_ACCESS_HASH) {
        document.getElementById('sync-full-access-modal').remove();
        window.syncConfig.fullAccessGranted = true;
        window.changeSyncMode('full');

        // === ВОТ ЭТО ДОБАВИТЬ ===
        localStorage.removeItem('rbi_sync_last_pull_at');
        localStorage.setItem('rbi_cloud_dirty', '1');
        window.triggerSync('manual');
        // =======================
    } else {
        if (typeof showToast === 'function') showToast("❌ Неверный пароль!");
    }
};

window.resetFullAccess = function () {
    window.syncConfig.fullAccessGranted = false;
    window.syncConfig.syncMode = 'personal';
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
};


window.uploadObjectFilesToCloud = async function (obj, bucketName, pathPrefix, type = 'file') {
    if (!obj || typeof obj !== 'object') return obj;

    const clone = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(clone)) {
        const val = clone[key];

        if (typeof val === 'string') {
            // УМНАЯ ПРОВЕРКА: Смотрим не на название ключа, а на само значение!
            // Если это локальная ссылка на фото - 100% грузим в бакет.
            const isLocalAsset = val.startsWith('local://') || val.startsWith('data:image');

            if (isLocalAsset && typeof window.rbiUploadAsset === 'function') {
                clone[key] = await window.rbiUploadAsset(
                    val,
                    bucketName,
                    pathPrefix,
                    type
                );
            }
        } else if (val && typeof val === 'object') {
            // Рекурсия для вложенных массивов (как в FMEA)
            clone[key] = await window.uploadObjectFilesToCloud(
                val,
                bucketName,
                pathPrefix,
                type
            );
        }
    }

    return clone;
};

window.pushCloudObject = async function (objectType, id, data, bucketName = 'custom-assets') {
    if (!data || !id) return;

    const pCode = window.syncConfig.projectCode;
    const iName = window.syncConfig.engineerName;

    // ИСПРАВЛЕНИЕ: Учим синхронизатор понимать метки удаленных отчетов
    const isDeleted = data._deleted === true || data.is_deleted === true;
    const deletedAt = isDeleted ? (data._deletedAt || data.deleted_at || data.updatedAt || data.updated_at || new Date().toISOString()) : null;
    const updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();

    // МАППИНГ НОВЫХ ТАБЛИЦ И БАКЕТОВ
    let tableName = ''; let isShared = false; let targetBucket = bucketName;
    switch (objectType) {
        case 'custom_twi_card': tableName = 'shared_twi_cards'; isShared = true; targetBucket = 'library-twi'; break;
        case 'custom_node': tableName = 'shared_nodes'; isShared = true; targetBucket = 'library-nodes'; break;
        case 'custom_doc': tableName = 'shared_docs'; isShared = true; targetBucket = 'library-docs'; break;
        case 'user_template': tableName = 'shared_checklists'; isShared = true; targetBucket = 'library-checklists'; break;
        case 'practice': tableName = 'shared_practices'; isShared = true; targetBucket = 'library-practices'; break;
        case 'feedback': tableName = 'shared_feedback'; isShared = true; break;
        case 'etalon': tableName = 'shared_etalons'; isShared = true; targetBucket = 'library-etalons'; break;
        case 'meeting': tableName = 'project_meetings'; targetBucket = 'inspection-photos'; break;
        case 'intervention': tableName = 'project_interventions'; targetBucket = 'inspection-photos'; break;
        case 'fmea': tableName = 'project_fmea'; targetBucket = 'inspection-photos'; break;
        case 'schedule': tableName = 'project_schedule_stages'; targetBucket = 'inspection-photos'; break;
        case 'sk_data_bundle': tableName = 'sk_data_bundles'; targetBucket = 'inspection-photos'; break;
        case 'project_object': tableName = 'project_objects'; isShared = true; break; // <-- ДОБАВЛЕНО
        case 'object_alias': tableName = 'object_aliases'; isShared = true; break;   // <-- ДОБАВЛЕНО
        case 'report': tableName = 'shared_reports'; isShared = false; targetBucket = 'reports'; break;
        case 'report_template': tableName = 'shared_report_templates'; isShared = true; break;
        case 'snapshot': tableName = 'shared_report_snapshots'; isShared = false; break;
        case 'assistant_kb': tableName = 'app_assistant_kb'; isShared = true; break;
        default: return;
    }

    let uploadedData = data;

    if (isDeleted) {
        // Мягкое удаление: мы не удаляем файлы физически, чтобы не сломать чужие кэши
    } else {
        // ИСКЛЮЧАЕМ огромные массивы (Стройконтроль) из рекурсивного сканера фото, чтобы не повесить браузер!
        if (objectType !== 'sk_data_bundle') {
            const storagePrefix = isShared ? `hashed_assets` : `${pCode}/${objectType}/${id}`;
            uploadedData = await window.uploadObjectFilesToCloud(data, targetBucket, storagePrefix, objectType);
        }
    }

    let payload = {};

    if (objectType === 'report') {
        // Специфичный формат для таблицы отчетов (С ПОДДЕРЖКОЙ РОЛЕЙ И ОБЪЕКТОВ)
        payload = {
            id: id,
            project_code: window.syncConfig.projectCode,
            project_canonical_key: data.project_canonical_key || data.metadata?.project || '',
            project_display_name: data.project_display_name || data.metadata?.project || '',
            engineer_name: data.engineer_name || data.created_by || iName,
            report_type: data.report_type || 'unknown',
            title: data.title || 'Отчет',
            generated_at: data.generated_at || new Date().toISOString(),
            file_url: data.file_url || '',
            file_size: data.file_size || 0,
            metadata: data.metadata || {},
            created_by: data.created_by || iName,
            is_deleted: isDeleted,
            deleted_at: deletedAt,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: updatedAt
        };
    } else if (objectType === 'snapshot') {
        // Специфичный формат для HTML-снимков (для QR)
        payload = {
            id: id,
            report_id: data.report_id,
            html_content: data.html_content,
            created_at: data.created_at || new Date().toISOString(),
            expires_at: null // Пока не используем
        };
    } else if (objectType === 'assistant_kb') {
        payload = {
            id: id,
            project_code: window.syncConfig.projectCode || 'local',
            question: data.question || '',
            answer: data.answer || '',
            tags: data.tags || [],
            enabled: data.enabled !== false,
            created_by: data.created_by || iName,
            is_deleted: isDeleted,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: updatedAt
        };
    } else if (objectType === 'project_object') {
        // Строгий реляционный формат для Справочника объектов
        payload = {
            id: id,
            project_code: window.syncConfig.projectCode,
            canonical_key: data.canonical_key || '',
            display_name: data.display_name || '',
            synonyms: data.synonyms || [],
            created_by: data.created_by || iName,
            _deleted: isDeleted,
            is_deleted: isDeleted,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: updatedAt
        };
    } else if (objectType === 'object_alias') {
        // Строгий реляционный формат для Алиасов
        payload = {
            id: id,
            project_code: window.syncConfig.projectCode,
            raw_name: data.raw_name || '',
            canonical_key: data.canonical_key || '',
            created_at: data.created_at || new Date().toISOString(),
            updated_at: updatedAt
        };
    } else {
        // Стандартный формат (всё складываем в JSONB колонку 'data')
        payload = {
            id: id,
            data: uploadedData,
            is_deleted: isDeleted,
            deleted_at: deletedAt,
            updated_at: updatedAt
        };
    }

    if (objectType !== 'report' && objectType !== 'snapshot' && objectType !== 'assistant_kb' && objectType !== 'project_object' && objectType !== 'object_alias') {
        if (isShared) {
            payload.owner = data.owner || iName;
        } else {
            payload.project_code = pCode;

            payload.project_canonical_key =
                data.project_canonical_key ||
                data.projectCanonicalKey ||
                data.project ||
                data.projectName ||
                '';

            payload.project_display_name =
                data.project_display_name ||
                data.projectDisplayName ||
                data.project ||
                data.projectName ||
                '';

            payload.engineer_name =
                data.engineer_name ||
                data.engineerName ||
                data.inspector_name ||
                data.inspectorName ||
                iName;

            payload.inspector_name =
                data.inspector_name ||
                data.inspectorName ||
                data.engineer_name ||
                data.engineerName ||
                iName;

            payload.contractor_name =
                data.contractor_name ||
                data.contractorName ||
                data.contractor ||
                '';

            payload.source = 'cloud';
            payload.sync_status = 'synced';
            payload.sync_block_reason = '';
        }
    }

    const { error } = await window.supabaseClient.from(tableName).upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    // ВАЖНО: Возвращаем обновленный объект (с замененными ссылками на http://)
    return uploadedData;
};

window.pullCloudObjects = async function (objectType, lastPullTimeStr = '', mode = 'silent') {
    const pCode = window.syncConfig.projectCode;
    const iName = window.syncConfig.engineerName || 'Инженер'; // <-- ДОБАВЛЕНО
    let tableName = ''; let isShared = false;

    switch (objectType) {
        case 'custom_twi_card': tableName = 'shared_twi_cards'; isShared = true; break;
        case 'custom_node': tableName = 'shared_nodes'; isShared = true; break;
        case 'custom_doc': tableName = 'shared_docs'; isShared = true; break;
        case 'user_template': tableName = 'shared_checklists'; isShared = true; break;
        case 'feedback': tableName = 'shared_feedback'; isShared = true; break; // <-- ДОБАВЛЕНО
        case 'practice': tableName = 'shared_practices'; isShared = true; break;
        case 'etalon': tableName = 'shared_etalons'; isShared = true; break;
        case 'meeting': tableName = 'project_meetings'; break;
        case 'intervention': tableName = 'project_interventions'; break;
        case 'fmea': tableName = 'project_fmea'; break;
        case 'schedule': tableName = 'project_schedule_stages'; break;
        case 'sk_data_bundle': tableName = 'sk_data_bundles'; break;
        case 'project_object': tableName = 'project_objects'; isShared = true; break; // <-- ДОБАВЛЕНО
        case 'object_alias': tableName = 'object_aliases'; isShared = true; break;   // <-- ДОБАВЛЕНО
        case 'report': tableName = 'shared_reports'; isShared = false; targetBucket = 'reports'; break;
        case 'report_template': tableName = 'shared_report_templates'; isShared = true; break;
        case 'snapshot': tableName = 'shared_report_snapshots'; isShared = true; break;
        case 'assistant_kb': tableName = 'app_assistant_kb'; isShared = true; break;
        default: return [];
    }

    let query = window.supabaseClient.from(tableName).select('*').limit(1000);
    if (!isShared) query = query.eq('project_code', pCode);
    if (lastPullTimeStr) query = query.gt('updated_at', lastPullTimeStr);

    const { data, error } = await query;
    if (error) throw error;

    let result = [];
    const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
    const myProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : [];
    const myContrName = typeof appSettings !== 'undefined'
        ? (appSettings.contractorName || appSettings.assignedContractor || '')
        : '';

    for (const row of data || []) {
        // ВАЖНО:
        // В shared_* таблицах реальные данные лежат в row.data.
        // Если взять просто {...row}, то title/category/name окажутся внутри data,
        // и renderTwiList/renderNodesList упадут на .toLowerCase().
        let obj = {};

        if (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) {
            obj = { ...row.data };
        } else {
            obj = { ...row };
        }

        obj.id = row.id || obj.id;
        obj.updatedAt = row.updated_at || obj.updatedAt || obj.updated_at || new Date().toISOString();
        obj.updated_at = row.updated_at || obj.updated_at || obj.updatedAt || new Date().toISOString();

        if (row.owner) obj.owner = row.owner;

        if (row.is_deleted) {
            obj._deleted = true;
            obj._deletedAt = row.deleted_at || new Date().toISOString();
        }

        obj.project_code = row.project_code || obj.project_code || pCode;
        obj.project_canonical_key = row.project_canonical_key || obj.project_canonical_key || obj.project || obj.projectName || '';
        obj.project_display_name = row.project_display_name || obj.project_display_name || obj.project || obj.projectName || '';
        obj.inspector_name = row.inspector_name || obj.inspector_name || obj.inspectorName || obj.engineer_name || obj.engineerName || '';
        obj.contractor_name = row.contractor_name || obj.contractor_name || obj.contractorName || obj.contractor || '';

        obj.source = 'cloud';
        obj.syncStatus = 'synced';
        obj.sync_status = 'synced';
        obj.syncBlockReason = '';
        obj.sync_block_reason = '';

        // --- УМНЫЙ ФИЛЬТР ДЛЯ ПРОЕКТНЫХ ДАННЫХ (Задачи, Мемо, FMEA и т.д.) ---
        // --- ЕДИНЫЙ ФИЛЬТР ДЛЯ ПРОЕКТНЫХ ДАННЫХ ---
        if (!isShared) {
            const itemProject =
                obj.project_canonical_key ||
                obj.projectCanonicalKey ||
                obj.canonical_key ||
                obj.project ||
                obj.projectName ||
                '';

            const itemContr =
                obj.contractor_name ||
                obj.contractorName ||
                obj.contractor ||
                '';

            const itemEngineer =
                obj.inspector_name ||
                obj.inspectorName ||
                obj.engineer_name ||
                obj.engineerName ||
                obj.owner ||
                '';

            const assignedProjects = Array.isArray(myProjects) ? myProjects : [];

            if (role === 'guest') {
                continue;
            }

            if (role === 'contractor') {
                if (!myContrName) continue;
                if (itemContr && itemContr !== myContrName) continue;

                if (assignedProjects.length > 0 && itemProject && itemProject !== 'Все' && !assignedProjects.includes(itemProject)) {
                    continue;
                }
            }

            else if (role === 'engineer') {
                if (window.syncConfig.syncMode === 'personal') {
                    if (itemEngineer && itemEngineer !== iName) continue;
                }

                // УМНЫЙ ФИЛЬТР: Пропускаем глобальные отчеты и отчеты по всей компании
                const isGlobal = !itemProject || itemProject.toLowerCase().includes('все ') || itemProject === 'all';

                if (assignedProjects.length > 0 && !isGlobal && !assignedProjects.includes(itemProject)) {
                    continue;
                }
            }

            else if (role === 'project_manager') {
                if (assignedProjects.length === 0) continue;

                if (itemProject && itemProject !== 'Все' && !assignedProjects.includes(itemProject)) {
                    continue;
                }
            }

            else if (['director', 'deputy_manager', 'manager'].includes(role)) {
                // Полный просмотр / доступ согласно роли
            }

            else {
                continue;
            }
        }
        // -------------------------------------------------------------------
        // -------------------------------------------------------------------

        if (row.is_deleted) {
            obj._deleted = true;
            obj._deletedAt = row.deleted_at || new Date().toISOString();
        }

        if (isShared && row.owner) obj.owner = row.owner;

        // ИСПРАВЛЕНИЕ: Если Supabase вернул metadata как строку, превращаем в объект
        if (typeof obj.metadata === 'string') {
            try { obj.metadata = JSON.parse(obj.metadata); } catch (e) { obj.metadata = {}; }
        }

        // Гарантируем наличие даты генерации для сортировки
        if (!obj.generated_at) obj.generated_at = obj.created_at || new Date().toISOString();

        result.push(obj);
    }
    return result;
};
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
    let canPush = window.RbiRoles ? window.RbiRoles.canPush() : false;
    // -----------------------------------------------------

    if (window.isSyncing) {
        if (mode === 'manual') safeToast("⏳ Синхронизация уже идет...");
        return;
    }

    // Экономия Supabase: тихую синхронизацию не запускаем без изменений
    if (mode === 'silent' && localStorage.getItem('rbi_cloud_dirty') !== '1') {
        return;
    }
    let pushErrors = 0;

    window.isSyncing = true;
    syncChannel.postMessage('sync_started');
    let hasNewCriticalData = false;
    window.renderSyncUI();

    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        window.isSyncing = false;
        window.renderSyncUI();
        safeToast("⚠️ Синхронизация прервана (слабый интернет). Попробуйте позже.");
        console.log("[Sync] Timeout. Снята блокировка.");
    }, 90000);

    const pCode = window.syncConfig.projectCode;
    const iName = window.syncConfig.engineerName;
    const stableInspectorId = `${pCode}_${iName}`.replace(/\s+/g, '_');
    const lastPullAt = localStorage.getItem('rbi_sync_last_pull_at') || '';
    const lastPushAt = localStorage.getItem('rbi_sync_last_push_at') || '';
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

                let fetchedProjects = [];

                if (Array.isArray(serverProfile.assigned_projects)) {
                    fetchedProjects = serverProfile.assigned_projects;
                } else if (
                    serverProfile.settings &&
                    Array.isArray(serverProfile.settings.assignedProjects)
                ) {
                    fetchedProjects = serverProfile.settings.assignedProjects;
                }

                let needUiUpdate = false;

                if (appSettings.userRole !== fetchedRole) {
                    appSettings.userRole = fetchedRole;
                    needUiUpdate = true;
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
                        const oldProjects = JSON.stringify(appSettings.assignedProjects || []);
                        const newProjects = JSON.stringify(fetchedProjects);

                        if (oldProjects !== newProjects) {
                            appSettings.assignedProjects = fetchedProjects;
                            appSettings.pendingAssignedProjects = [];
                            needUiUpdate = true;
                        }
                    } else {
                        if (!Array.isArray(appSettings.assignedProjects)) {
                            appSettings.assignedProjects = [];
                        }

                        if (!Array.isArray(appSettings.pendingAssignedProjects)) {
                            appSettings.pendingAssignedProjects = [];
                        }
                    }
                }

                // Руководящим ролям автоматически включаем режим "Вся команда"
                if (['director', 'project_manager', 'deputy_manager', 'manager'].includes(fetchedRole)) {
                    if (window.syncConfig.syncMode !== 'full') {
                        window.syncConfig.syncMode = 'full';
                        localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
                        needUiUpdate = true;
                    }
                }

                // АВТОМАТИЧЕСКИ Включаем ИИ для штатных сотрудников
                if (['director', 'project_manager', 'deputy_manager', 'manager', 'engineer'].includes(fetchedRole)) {
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

                if (needUiUpdate && window.RbiRoles) {
                    window.RbiRoles.applyUIConstraints();

                    if (typeof renderSyncUI === 'function') renderSyncUI();
                    if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();

                    // --- НОВОЕ: Очистка кэша и перерисовка интерфейса при смене роли ---
                    if (typeof window.clearMetricsCache === 'function') window.clearMetricsCache();
                    if (typeof gameGenerateWeeklyPlan === 'function') gameGenerateWeeklyPlan(true);
                    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
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

                if (window.RbiRoles) window.RbiRoles.applyUIConstraints();
            }
        }

        // После получения серверной роли пересчитываем право push.
        canPush = window.RbiRoles ? window.RbiRoles.canPush() : false;

        if (!canPush) {
            console.log('[Sync] Push заблокирован. Роль:', appSettings?.userRole, 'Статус:', appSettings?.cloudStatus);
        }

    } catch (e) {
        console.warn("[Sync] Не удалось обновить роль:", e.message);

        // Если профиль не удалось проверить — запрещаем отправку,
        // но не запрещаем pull и локальную работу.
        canPush = false;
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

        if (window.isLocalUrl(value)) blobData = await window.localPhotoToBlob(value);
        else if (window.isDataUrl(value)) blobData = window.dataUrlToBlob(value);
        else return value;

        if (!blobData || !blobData.blob) return value;

        const ext = window.extFromMime(blobData.mime);
        const arrayBuffer = await blobData.blob.arrayBuffer();

        // 1. УМНАЯ ДЕДУПЛИКАЦИЯ: Вычисляем SHA-256 хеш файла
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashStr = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 2. Формируем путь (Все файлы падают в папку hashed_assets под своим хешем)
        const storagePath = `hashed_assets/${hashStr}.${ext}`;

        // 3. Получаем публичный URL
        const { data: urlData } = window.supabaseClient.storage.from(bucketName).getPublicUrl(storagePath);
        const publicUrl = urlData.publicUrl;

        // 4. Проверяем наличие файла через .list() (Экономим трафик!)
        const { data: existingFiles } = await window.supabaseClient.storage
            .from(bucketName)
            .list('hashed_assets', { search: hashStr });

        if (existingFiles && existingFiles.length > 0) {
            console.log('[Sync] Дедупликация сработала (файл уже есть):', publicUrl);
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
        return publicUrl;
    };

    function getChecklistItem(templateKey, itemId) {
        try {
            if (!templateKey) return null;

            const type = templateKey.split('_')[0];
            const key = templateKey.replace(type + '_', '');

            let groups = [];

            if (type === 'sys' && typeof SYSTEM_TEMPLATES !== 'undefined' && SYSTEM_TEMPLATES[key]) {
                groups = SYSTEM_TEMPLATES[key].groups || [];
            }

            if (type === 'user' && typeof userTemplates !== 'undefined' && userTemplates[key]) {
                groups = userTemplates[key].groups || [];
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
                .single();

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
        // =====================================================
        // 2. PULL: проверки из новой нормальной архитектуры
        // =====================================================

        let inspectionsQuery = window.supabaseClient
            .from('rbi_inspections')
            .select('*')
            .eq('project_code', pCode)
            .eq('is_deleted', false)
            .order('inspection_date', { ascending: false })
            .limit(500); // Ограничиваем загрузку, чтобы не повесить телефон

        // --- НОВОЕ: Фильтрация PULL по ролям ---
        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

        if (role === 'guest') {
            // Гостям не нужны чужие проверки (экономим трафик)
            // Но запрос отменять нельзя (сломает цепочку), поэтому ставим заведомо ложное условие
            inspectionsQuery = inspectionsQuery.eq('id', 'impossible_id');
        }
        else if (role === 'contractor') {
            const myContrName =
                typeof appSettings !== 'undefined'
                    ? (appSettings.contractorName || appSettings.assignedContractor || '')
                    : '';

            if (myContrName) {
                inspectionsQuery = inspectionsQuery.eq('contractor_name', myContrName);
            } else {
                inspectionsQuery = inspectionsQuery.eq('id', 'impossible_id');
            }
        }
        else if (role === 'project_manager') {
            const assignedProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : [];

            if (assignedProjects && assignedProjects.length > 0) {
                inspectionsQuery = inspectionsQuery.in('project_canonical_key', assignedProjects);
            } else {
                inspectionsQuery = inspectionsQuery.eq('id', 'impossible_id');
            }
        }
        else if (role === 'engineer') {
            const assignedProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : [];

            inspectionsQuery = inspectionsQuery.eq('engineer_name', iName);

            if (assignedProjects && assignedProjects.length > 0) {
                inspectionsQuery = inspectionsQuery.in('project_canonical_key', assignedProjects);
            }
        }
        else if (window.syncConfig.syncMode === 'personal') {
            inspectionsQuery = inspectionsQuery.eq('engineer_name', iName);
        }
        // Директор и менеджер качают всё (условий не добавляем)
        // ---------------------------------------

        if (lastPullAt) {
            inspectionsQuery = inspectionsQuery.gt('updated_at', lastPullAt);
        }

        const { data: cloudInspections, error: inspectionsError } = await inspectionsQuery;
        if (inspectionsError) throw inspectionsError;

        if (cloudInspections && cloudInspections.length > 0) {
            const ids = cloudInspections.map(x => x.id);

            const { data: cloudItems, error: itemsError } = await window.supabaseClient
                .from('rbi_inspection_items')
                .select('*')
                .in('inspection_id', ids);

            if (itemsError) throw itemsError;

            const { data: cloudPhotos, error: photosError } = await window.supabaseClient
                .from('rbi_inspection_photos')
                .select('*')
                .in('inspection_id', ids);

            if (photosError) throw photosError;

            const itemsMap = {};
            const photosMap = {};

            (cloudItems || []).forEach(row => {
                if (!itemsMap[row.inspection_id]) itemsMap[row.inspection_id] = [];
                itemsMap[row.inspection_id].push(row);
            });

            (cloudPhotos || []).forEach(row => {
                if (!photosMap[row.inspection_id]) photosMap[row.inspection_id] = {};
                if (row.item_id && row.public_url) photosMap[row.inspection_id][row.item_id] = row.public_url;
            });

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
            if (window._tempHistoryBatch && window._tempHistoryBatch.length > 0 && typeof dbPutBatch === 'function') {
                await dbPutBatch('app_history', window._tempHistoryBatch);
                window._tempHistoryBatch = []; // очищаем
            }

            if (typeof dbGetAll === 'function') {
                contractorArray = (await dbGetAll('app_history') || []).filter(x => !x._deleted);
                etalonActsArray = (await dbGetAll('rbi_etalon_acts') || []).filter(x => !x._deleted); // <-- ОЧЕНЬ ВАЖНО: обновляем и эталоны
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
                            restoreSession();
                        }, 500);
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
                .eq('is_deleted', false)
                .eq('task_data->>type', 'manual');

            const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

            if (role === 'guest') {
                taskQuery = taskQuery.eq('id', 'impossible_id');
            }
            else if (role === 'contractor') {
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
            else if (role === 'project_manager') {
                const assignedProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : [];

                if (assignedProjects && assignedProjects.length > 0) {
                    taskQuery = taskQuery.in('project_canonical_key', assignedProjects);
                } else {
                    taskQuery = taskQuery.eq('id', 'impossible_id');
                }
            }
            else if (role === 'engineer') {
                const assignedProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : [];

                taskQuery = taskQuery.eq('engineer_name', iName);

                if (assignedProjects && assignedProjects.length > 0) {
                    taskQuery = taskQuery.in('project_canonical_key', assignedProjects);
                }
            }
            else if (window.syncConfig.syncMode === 'personal') {
                taskQuery = taskQuery.eq('engineer_name', iName);
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
                const objects = await window.pullCloudObjects(cType.type, lastPullAt, mode);
                if (!objects || objects.length === 0) continue;

                window[cType.memory] = window[cType.memory] || [];

                for (const obj of objects) {
                    const localExisting = await dbGet(cType.store, obj.id);
                    const localTime = localExisting ? new Date(localExisting.updatedAt || localExisting.updated_at || localExisting.date || localExisting.createdAt || 0).getTime() : 0;
                    const cloudTime = new Date(obj.updatedAt || 0).getTime();

                    if (!localExisting || cloudTime > localTime) {
                        if (obj._deleted) {
                            await dbDelete(cType.store, obj.id);
                            window[cType.memory] = window[cType.memory].filter(x => String(x.id) !== String(obj.id));
                        } else {
                            await dbPut(cType.store, obj);
                            const idx = window[cType.memory].findIndex(x => String(x.id) === String(obj.id));
                            if (idx >= 0) window[cType.memory][idx] = obj;
                            else window[cType.memory].push(obj);
                        }
                    }

                }

            } // конец цикла cloudTypes
            // Перезагружаем Справочник объектов в память, если он прилетел из облака
            if (typeof ObjectDirectory !== 'undefined') await ObjectDirectory.init();
            // ИСПРАВЛЕНИЕ: ЖЕСТКАЯ СИНХРОНИЗАЦИЯ ПАМЯТИ ОТЧЕТОВ
            // Достаем свежие данные из БД в оперативную память, чтобы экран их увидел
            if (typeof dbGetAll === 'function') {
                if (typeof reportsArray !== 'undefined') {
                    reportsArray = (await dbGetAll('app_reports') || []).filter(x => !x._deleted);
                }
                if (typeof userReportTemplates !== 'undefined') {
                    userReportTemplates = (await dbGetAll('report_templates') || []).filter(x => !x._deleted);
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
                        .eq('project_code', pCode);

                    if (lastPullAt) {
                        query = query.gt('updated_at', lastPullAt);
                    }

                    const { data: cloudSkRows, error: skPullError } = await query;

                    if (skPullError) throw skPullError;

                    if (cloudSkRows && cloudSkRows.length > 0) {
                        const localRecords = await dbGetAll(STORES.SK_RECORDS) || [];
                        const localMap = new Map();

                        localRecords.forEach(r => {
                            const key = r.sk_unique_key || r.id;
                            if (key) localMap.set(String(key), r);
                        });

                        for (const row of cloudSkRows) {
                            const cloudRecord = normalizeCloudSkRecordForLocal(row);
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
                                await dbPut(STORES.SK_RECORDS, cloudRecord);
                                localMap.set(cloudKey, cloudRecord);
                            }
                        }

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

                    // Обновляем кэш ContractorDirectory после pull
                    if (window.ContractorDirectory && typeof window.ContractorDirectory.init === 'function') {
                        await window.ContractorDirectory.init();
                    }
                } catch (e) {
                    console.warn('[Sync][Подрядчики] Не удалось подтянуть справочник подрядчиков:', e.message || e);
                }
            }
            // Пользовательские Чек-листы (Объекты)
            const templateObjects = await window.pullCloudObjects('user_template', lastPullAt, mode);
            if (templateObjects && templateObjects.length > 0 && typeof userTemplates !== 'undefined') {
                for (const obj of templateObjects) {
                    const localExisting = await dbGet('user_templates', obj.id);
                    const localTime = localExisting?.data ? new Date(localExisting.data.updatedAt || 0).getTime() : 0;
                    const cloudTime = new Date(obj.updatedAt || 0).getTime();

                    if (!localExisting || cloudTime > localTime) {
                        if (obj._deleted) {
                            delete userTemplates[obj.id];
                            await dbDelete('user_templates', obj.id);
                        } else {
                            userTemplates[obj.id] = obj;
                            await dbPut('user_templates', { slug: obj.id, data: obj });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[Sync] Прочие модули не подтянуты:", e.message);
        }
        let currentHistory = []; // <-- ОБЪЯВЛЯЕМ СНАРУЖИ БЛОКА
        // =====================================================
        // 5. PUSH: локальная история в новую архитектуру
        // =====================================================
        if (canPush) {
            // Отправлять историю в облако могут только инженеры и менеджеры.
            currentHistory = typeof dbGetAll === 'function' ? (await dbGetAll('app_history') || []) : [];

            // Если не админ, отправляем ТОЛЬКО свои проверки, чтобы случайно не затереть чужие
            const currentPushRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

            if (!['manager', 'deputy_manager'].includes(currentPushRole)) {
                currentHistory = currentHistory.filter(i => i.inspectorName === iName);
            }

            if (lastPushAt) {
                const lastPushTime = new Date(lastPushAt).getTime();
                currentHistory = currentHistory.filter(i => {
                    const t = new Date(i.updatedAt || i.updated_at || i.date || 0).getTime();
                    return t >= lastPushTime;
                });
            }

            if (currentHistory.length > 0) {

                for (const c of currentHistory) {
                    const inspectionId = String(c.id);
                    const photoRows = [];
                    const uploadedPhotos = {};
                    const storagePathsToRemove = []; // Для мягкого удаления фото
                    const isDeleted = c._deleted === true;
                    // --- РЕТРОАКТИВНАЯ НОРМАЛИЗАЦИЯ ИМЕНИ ОБЪЕКТА ---
                    // Если у локальной проверки нет жесткого ключа или он равен сырому тексту:
                    if (typeof ObjectDirectory !== 'undefined' && (!c.project_canonical_key || c.project_canonical_key === c.projectName || c.project_canonical_key === c.project_display_name)) {
                        try {
                            const match = await ObjectDirectory.normalizeProjectName(c.projectName || c.project_display_name);
                            if (match && match.status === 'matched') {
                                c.project_canonical_key = match.canonical_key;
                                c.project_display_name = match.display_name;
                                c.projectName = match.display_name; // Обновляем старое поле тоже
                                if (typeof dbPut === 'function') await dbPut('app_history', c); // Сохраняем обновление
                            }
                        } catch (err) { console.warn("[Sync] Ошибка ретроактивной нормализации:", err); }
                    }
                    // ------------------------------------------------
                    // Проверяем, можно ли отправлять локальную или импортированную запись.
                    // ВАЖНО: проверка должна быть ДО загрузки фото.
                    if (c.source === 'local' || c.importedFromBackup) {
                        const currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
                        const currentEngineer = window.RbiRoles ? window.RbiRoles.getCurrentEngineerName() : (window.syncConfig?.engineerName || '');
                        const assignedProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : (appSettings?.assignedProjects || []);

                        const recProject = c.project_canonical_key || c.projectName || '';
                        const recEngineer = c.inspectorName || c.inspector_name || '';

                        let allowedToPush = false;
                        let blockReason = '';

                        if (!canPush) {
                            blockReason = 'Роль не подтверждена для отправки';
                        } else if (['manager', 'deputy_manager'].includes(currentRole)) {
                            allowedToPush = true;
                        } else if (currentRole === 'engineer') {
                            const ownerOk = !recEngineer || recEngineer === currentEngineer;
                            const projectOk =
                                !assignedProjects ||
                                assignedProjects.length === 0 ||
                                assignedProjects.includes(recProject);

                            if (ownerOk && projectOk) {
                                allowedToPush = true;
                            } else if (!ownerOk) {
                                blockReason = 'Запись создана другим инженером';
                            } else {
                                blockReason = 'Объект не назначен пользователю';
                            }
                        } else {
                            blockReason = 'Эта роль не может отправлять проектные данные';
                        }

                        if (!allowedToPush) {
                            c.syncStatus = 'blocked';
                            c.sync_status = 'blocked';
                            c.syncBlockReason = blockReason || 'Отправка запрещена';
                            c.sync_block_reason = c.syncBlockReason;
                            c.updatedAt = new Date().toISOString();

                            if (typeof dbPut === 'function') {
                                await dbPut('app_history', c);
                            }

                            continue;
                        }
                    }
                    for (const itemId of Object.keys(c.photos || {})) {
                        const oldPhoto = c.photos[itemId];

                        if (isDeleted) {
                            // Если проверка удалена, фото в облако не грузим, а наоборот - удаляем
                            const path = getStoragePathFromPublicUrl(oldPhoto, 'inspection-photos');
                            if (path) storagePathsToRemove.push(path);

                            if (oldPhoto && isHttpUrl(oldPhoto)) {
                                photoRows.push({
                                    id: `${inspectionId}_${itemId}_main`,
                                    inspection_id: inspectionId,
                                    project_code: pCode,
                                    project_canonical_key: c.project_canonical_key || c.projectName || '',
                                    source: 'cloud',
                                    sync_status: 'synced',
                                    sync_block_reason: '',
                                    item_id: String(itemId),
                                    photo_type: 'inspection',
                                    bucket_name: 'inspection-photos',
                                    storage_path: path,
                                    public_url: oldPhoto,
                                    updated_at: new Date().toISOString()
                                });
                            }
                        } else {
                            // Стандартная загрузка фото
                            const publicUrl = await window.rbiUploadAsset(
                                oldPhoto,
                                'inspection-photos',
                                `${pCode}/inspections/${inspectionId}/${itemId}`,
                                'photo'
                            );

                            uploadedPhotos[itemId] = publicUrl;

                            if (publicUrl && isHttpUrl(publicUrl)) {
                                photoRows.push({
                                    id: `${inspectionId}_${itemId}_main`,
                                    inspection_id: inspectionId,
                                    project_code: pCode,
                                    project_canonical_key: c.project_canonical_key || c.projectName || '',
                                    source: 'cloud',
                                    sync_status: 'synced',
                                    sync_block_reason: '',
                                    item_id: String(itemId),
                                    photo_type: 'inspection',
                                    bucket_name: 'inspection-photos',
                                    storage_path: getStoragePathFromPublicUrl(publicUrl, 'inspection-photos'),
                                    public_url: publicUrl,
                                    updated_at: new Date().toISOString()
                                });
                            }
                        }
                    }

                    // Если есть фото для удаления из бакета Supabase
                    if (storagePathsToRemove.length > 0) {
                        const { error: rmErr } = await window.supabaseClient.storage
                            .from('inspection-photos')
                            .remove(storagePathsToRemove);
                        if (rmErr) console.warn("[Sync] Ошибка удаления фото инспекции из Storage:", rmErr);
                    }

                    // Проверяем, можно ли отправлять локальную или импортированную запись

                    const { error: headerError } = await window.supabaseClient
                        .from('rbi_inspections')
                        .upsert({
                            id: inspectionId,
                            project_code: pCode,

                            // Старое поле
                            project_name: c.project_display_name || c.projectName || '',

                            // Новые поля объектной модели
                            project_canonical_key: c.project_canonical_key || c.projectName || '',
                            project_display_name: c.project_display_name || c.projectName || '',

                            engineer_name: c.inspectorName || iName,
                            inspector_name: c.inspectorName || iName,
                            contractor_name: c.contractorName || '',
                            template_key: c.templateKey || '',
                            template_title: c.templateTitle || '',
                            location: c.location || '',
                            section: c.section || '',
                            floor: c.floor || '',
                            room: c.room || '',
                            inspection_date: c.date || new Date().toISOString(),
                            metrics: c.metrics || {},
                            is_completed: c.isCompleted !== false,
                            is_deleted: isDeleted,
                            deleted_at: isDeleted ? (c._deletedAt || new Date().toISOString()) : null,

                            source: 'cloud',
                            sync_status: 'synced',
                            sync_block_reason: '',

                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' });

                    if (headerError) throw headerError;
                    actuallyPushedChecks++;

                    // После успешной отправки шапки проверки помечаем локальную запись как синхронизированную.
                    // Это важно для разделения "Моя аналитика" / "Облачная аналитика".
                    if (!isDeleted) {
                        c.source = 'cloud';
                        c.syncStatus = 'synced';
                        c.sync_status = 'synced';
                        c.syncBlockReason = '';
                        c.sync_block_reason = '';
                        c.importedFromBackup = false;
                        c.updatedAt = new Date().toISOString();
                        c.updated_at = c.updatedAt;

                        if (typeof dbPut === 'function') {
                            await dbPut('app_history', c);
                        }
                    }

                    const itemRows = [];

                    for (const itemId of Object.keys(c.state || {})) {
                        const info = getChecklistItem(c.templateKey || '', itemId);
                        const d = (c.details || {})[itemId] || {};

                        itemRows.push({
                            id: `${inspectionId}_${itemId}`,
                            inspection_id: inspectionId,
                            project_code: pCode,
                            project_canonical_key: c.project_canonical_key || c.projectName || '',
                            source: 'cloud',
                            sync_status: 'synced',
                            sync_block_reason: '',
                            item_id: String(itemId),
                            item_name: info?.n || d.name || '',
                            item_weight: info?.w || d.weight || null,
                            status: c.state[itemId],
                            comment: d.comment || d.text || '',
                            cause_code: d.causeCode || '',
                            fact_value: d.fact || d.factValue || '',
                            tolerance_value: d.tolerance || d.toleranceValue || '',
                            details: d,
                            updated_at: new Date().toISOString()
                        });
                    }

                    if (itemRows.length > 0) {
                        const { error: itemError } = await window.supabaseClient
                            .from('rbi_inspection_items')
                            .upsert(itemRows, { onConflict: 'id' });

                        if (itemError) throw itemError;
                    }

                    if (photoRows.length > 0) {
                        const { error: photoError } = await window.supabaseClient
                            .from('rbi_inspection_photos')
                            .upsert(photoRows, { onConflict: 'id' });

                        if (photoError) throw photoError;

                        if (!isDeleted) {
                            c.photos = uploadedPhotos;
                            if (typeof dbPut === 'function') await dbPut('app_history', c);
                        }
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
                        // Защита: загружаем только если это реально локальное фото
                        if (currentSession.photos[itemId] && !currentSession.photos[itemId].startsWith('http')) {
                            draftPhotos[itemId] = await window.rbiUploadAsset(
                                currentSession.photos[itemId],
                                'inspection-photos',
                                `${pCode}/drafts/${stableInspectorId}/${itemId}`,
                                'photo'
                            );
                        } else {
                            draftPhotos[itemId] = currentSession.photos[itemId];
                        }
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

                if (profileLastUpdated === 0 || profileLastUpdated >= lastPushTime) {

                    const profilePayload = {
                        inspector_id: stableInspectorId,
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

                            // AI-настройки сохраняем, но не используем их для перезаписи Edge Function
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

                // ИСПРАВЛЕНИЕ: Отправляем только РУЧНЫЕ задачи, которые ИЗМЕНИЛИСЬ
                tasks = tasks.filter(t => {
                    if (t.type !== 'manual') return false;
                    const tTime = new Date(t.updatedAt || t.updated_at || t.date || t.createdAt || 0).getTime();
                    return tTime === 0 || tTime >= lastPushTimeTasks;
                });
                const taskPushRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

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

                if (!['engineer', 'deputy_manager', 'manager'].includes(taskPushRole)) {
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
                                syncStatus: 'synced',
                                sync_status: 'synced',
                                syncBlockReason: '',
                                sync_block_reason: ''
                            },
                            status: task.status || 'pending',
                            task_date: task.date || task.taskDate || null,
                            is_deleted: task._deleted || false,
                            deleted_at: task._deleted ? (task._deletedAt || new Date().toISOString()) : null,
                            source: 'cloud',
                            sync_status: 'synced',
                            sync_block_reason: '',
                            updated_at: task.updatedAt || task.updated_at || new Date().toISOString()
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

                        await window.supabaseClient
                            .from('rbi_engineer_ratings')
                            .upsert({
                                id: stableInspectorId,
                                project_code: pCode,
                                engineer_name: iName,
                                rating_data: rating,
                                pi: rating.pi,
                                checks_count: rating.checksCount,
                                level_name: rating.levelObj?.name || '',
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
                const projectObjectPushRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

                if (!['engineer', 'deputy_manager', 'manager'].includes(projectObjectPushRole)) {
                    console.log('[Sync] Push прочих проектных модулей пропущен для роли:', projectObjectPushRole);
                } else {
                    const lastPushTime = lastPushAt ? new Date(lastPushAt).getTime() : 0;
                    const filterNew = (arr) => arr.filter(i => {
                        const t = new Date(i.updatedAt || i.updated_at || i.date || i.createdAt || 0).getTime();
                        return t === 0 || t >= lastPushTime;
                    });

                    // Единая функция отправки для всех новых таблиц
                    const syncTableData = async (storeName, memoryArrayName, objectType) => {
                        if (typeof dbGetAll !== 'function') return;
                        let items = filterNew(await dbGetAll(storeName) || []);

                        // --- ИСПРАВЛЕНИЕ ЗАЩИТЫ: Инженер может отправлять в облако только СВОИ записи ---
                        if (projectObjectPushRole === 'engineer') {
                            items = items.filter(obj => {
                                const objOwner = obj.owner || obj.author || obj.inspectorName || obj.engineerName || '';
                                return !objOwner || objOwner === iName;
                            });
                        }
                        // ---------------------------------------------------------------------------------

                        for (const obj of items) {
                            // bucketName внутри функции pushCloudObject переопределится сам на правильный
                            const updated = await window.pushCloudObject(objectType, obj.id, obj, 'custom-assets');
                            if (updated) {
                                updated.source = 'cloud';
                                updated.syncStatus = 'synced';
                                updated.sync_status = 'synced';
                                updated.syncBlockReason = '';
                                updated.sync_block_reason = '';
                                updated.importedFromBackup = false;
                                updated.updatedAt = new Date().toISOString();

                                await dbPut(storeName, updated);

                                if (window[memoryArrayName] && Array.isArray(window[memoryArrayName])) {
                                    const idx = window[memoryArrayName].findIndex(x => String(x.id) === String(updated.id));

                                    if (idx !== -1) {
                                        window[memoryArrayName][idx] = updated;
                                    } else {
                                        window[memoryArrayName].push(updated);
                                    }
                                }
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

                    // Синхронизация новых таблиц Справочников
                    await syncTableData('custom_docs', 'customDocs', 'custom_doc');
                    await syncTableData('custom_nodes', 'customNodes', 'custom_node');
                    await syncTableData('twi_cards', 'customTwiCards', 'custom_twi_card');
                    await syncTableData('project_objects', '_sys_obj_dummy', 'project_object');
                    await syncTableData('object_aliases', '_sys_alias_dummy', 'object_alias');
                    await syncTableData('feedback_list', 'rbi_feedbackData', 'feedback');
                    await syncTableData('report_templates', 'userReportTemplates', 'report_template'); // <-- ДОБАВИЛИ
                    await syncTableData('app_assistant_kb', 'appAssistantData', 'assistant_kb'); // <-- ОТПРАВКА БАЗЫ ИИ В ОБЛАКО
                    // --- НОВОЕ: ОТПРАВКА ОТЧЕТОВ И HTML СНИМКОВ ---
                    let reportsToPush = filterNew(await dbGetAll(STORES.REPORTS) || []);
                    // Отправляем только свои отчеты
                    reportsToPush = reportsToPush.filter(r => r.created_by === iName || !r.created_by);

                    for (const rep of reportsToPush) {
                        try {
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

                            // 3. Отправляем HTML-снимок для QR-кода (если он есть)
                            if (window._tempSnapshots && window._tempSnapshots[rep.id]) {
                                await window.pushCloudObject('snapshot', 'snap_' + rep.id, window._tempSnapshots[rep.id]);
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

                        const skPushRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
                        const skCurrentUser = window.RbiRoles ? window.RbiRoles.getCurrentEngineerName() : iName;

                        // ПК СК отправляют только инженер, заместитель и администратор.
                        if (!['engineer', 'deputy_manager', 'manager'].includes(skPushRole)) {
                            skRecs = [];
                        } else if (skPushRole === 'engineer') {
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

                        const skRecordsToPush = skRecs.filter(isSkRecordDirtyForPush);

                        if (skRecordsToPush.length > 0) {
                            let pushedSkCount = 0;
                            let blockedSkCount = 0;

                            const batchSize = 500;

                            for (let start = 0; start < skRecordsToPush.length; start += batchSize) {
                                const batch = skRecordsToPush.slice(start, start + batchSize);

                                const cloudBatch = [];
                                const localBatchMap = new Map();

                                for (const rec of batch) {
                                    const cloudRec = prepareSkRecordForCloud(rec, pCode);

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

                                        await dbPut(STORES.SK_RECORDS, rec);
                                        pushedSkCount++;
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
                                const cloudBatch = prepareSkImportBatchForCloud(batch, pCode);
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
                        const contractorRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

                        // Создавать/обновлять связи подрядчиков могут инженер, зам и админ.
                        // Остальные только читают после pull.
                        const canPushContractors = ['engineer', 'deputy_manager', 'manager'].includes(contractorRole);

                        if (canPushContractors) {
                            try {
                                const contractorItems = await dbGetAll(STORES.CONTRACTOR_DIRECTORY) || [];
                                const contractorsToPush = contractorItems.filter(c => {
                                    const status = c.syncStatus || c.sync_status || '';
                                    const source = c.source || '';
                                    return status === 'not_synced' || status === 'blocked' || source === 'local';
                                });

                                for (const item of contractorsToPush) {
                                    const cloudItem = prepareContractorForCloud(item, pCode);
                                    if (!cloudItem) continue;

                                    const { error } = await window.supabaseClient
                                        .from('contractor_directory')
                                        .upsert(cloudItem, {
                                            onConflict: 'project_code,canonical_key'
                                        });

                                    if (error) throw error;

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

                            try {
                                const aliasItems = await dbGetAll(STORES.CONTRACTOR_ALIASES) || [];
                                const aliasesToPush = aliasItems.filter(a => {
                                    const status = a.syncStatus || a.sync_status || '';
                                    const source = a.source || '';
                                    return status === 'not_synced' || status === 'blocked' || source === 'local';
                                });

                                for (const item of aliasesToPush) {
                                    const cloudItem = prepareContractorAliasForCloud(item, pCode);
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
                                    const cloudItem = prepareContractorQueueForCloud(item, pCode);
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
                    if (typeof userTemplates !== 'undefined') {
                        const tmplArray = Object.values(userTemplates);
                        for (const obj of filterNew(tmplArray)) {
                            const updated = await window.pushCloudObject('user_template', obj.id, obj, 'library-checklists');
                            if (updated) {
                                userTemplates[updated.id] = updated;
                                await dbPut('user_templates', { slug: updated.id, data: updated });
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

        localStorage.setItem('rbi_sync_last_pull_at', doneAt);
        localStorage.setItem('rbi_sync_last_push_at', doneAt);
        if (pushErrors === 0) {
            localStorage.setItem('rbi_cloud_dirty', '0');
        } else {
            console.log('[Sync] Были сетевые ошибки, флаг изменений сохранен для повторной попытки.');
        }

        // --- Фоновое кэширование облачных файлов (не чаще раза в 5 мин) ---
        if (typeof window.downloadMissingCloudFiles === 'function' && appSettings.autoCacheCloudFiles) {
            const now = Date.now();
            if (!window._lastBgDownloadTime || (now - window._lastBgDownloadTime) > 300000) {
                window._lastBgDownloadTime = now;
                setTimeout(() => {
                    window.downloadMissingCloudFiles(mode === 'manual' ? false : true);
                }, 5000);
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
        // 1. Автоматически пересчитываем задачи из Графика СМР (если прилетели новые этапы)
        if (typeof window.rbi_generateAutoTasks === 'function') {
            await window.rbi_generateAutoTasks(true);
        }

        // 2. Пересчитываем рутинные задачи (Аудиты, Эталоны) после получения свежей истории из облака
        if (typeof gameGenerateWeeklyPlan === 'function') {
            await gameGenerateWeeklyPlan(true);
        }

        if (mode === 'manual') {
            if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
            if (typeof renderSelector === 'function') renderSelector();

            // При ручной синхронизации принудительно обновляем память и интерфейс
            if (typeof window.rbi_reloadReferenceMemory === 'function') {
                await window.rbi_reloadReferenceMemory();
                window.syncDirtyFlags.reference = false;
            }
            if (typeof renderTwiList === 'function') renderTwiList();
            if (typeof renderDocsList === 'function') renderDocsList();
            if (typeof renderNodesList === 'function') renderNodesList();

            if (typeof rbi_loadPractices === 'function' && typeof rbi_renderPracticesTab === 'function') {
                await rbi_loadPractices();
                await rbi_renderPracticesTab();
            }

            // Обновляем текущую активную аналитику, если мы на этой вкладке
            const analyticsTab = document.getElementById('tab-analytics');
            if (analyticsTab && analyticsTab.classList.contains('active') && typeof renderCurrentAnalyticsTab === 'function') {
                renderCurrentAnalyticsTab();
            }

            // ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ОТЧЕТОВ: Если открыта вкладка отчетов, перерисовываем её
            if (analyticsTab && analyticsTab.classList.contains('active') && window.currentHistoryViewMode === 'reports') {
                if (typeof renderReportsList === 'function') renderReportsList();
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

    } catch (e) {
        console.error("[Sync] Ошибка:", e);
        pushErrors++;
        if (mode === 'manual') {
            safeToast('❌ Ошибка: ' + (e.message ? e.message.substring(0, 80) : 'Сбой сети'));
        } // <-- ВОТ ЭТОЙ СКОБКИ НЕ ХВАТАЛО
    } finally {
        if (syncTimeout) clearTimeout(syncTimeout);
        window.isSyncing = false;
        syncChannel.postMessage('sync_done');
        window.renderSyncUI();
    }
};
// === КОНЕЦ ФУНКЦИИ triggerSync ===

window.mergeCloudData = async function (newInspections, newProfiles, newTasks, newEtalons) {
    let dbUpdated = false;

    // 1. ИСПРАВЛЕНИЕ РАСПАКОВКИ ПРОВЕРОК
    if (newInspections && newInspections.length > 0) {
        let historyMap = new Map();
        if (typeof contractorArray !== 'undefined') contractorArray.forEach(c => historyMap.set(c.id, c));

        newInspections.forEach(row => {
            // ИСПРАВЛЕНИЕ: Вытягиваем projectName и metrics из inspection_data
            const item = {
                id: row.id,
                date: row.date,
                // Если в data есть projectName - берем его, иначе fallback на код проекта
                projectName: (row.inspection_data && row.inspection_data.projectName) ? row.inspection_data.projectName : row.project_code,
                inspectorName: row.inspector_name,
                contractorName: row.contractor_name,
                templateKey: row.template_key,
                location: row.location,

                // Распаковываем все вложенные данные (включая metrics)
                ...(row.inspection_data || {}),

                photos: row.photos,
                _deleted: row._deleted,
                _deletedAt: row._deleted_at
            };

            const existing = historyMap.get(item.id);
            if (!existing || item._deleted) {
                historyMap.set(item.id, item);
            }
        });
        contractorArray = Array.from(historyMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        dbUpdated = true;
    }

    // 2. Слияние профиля (Черновик)
    if (newProfiles && newProfiles.length > 0) {
        const myProfile = newProfiles.find(p => p.inspector_name === window.syncConfig.engineerName);
        if (myProfile) {
            const data = myProfile.profile_data;

            if (data.session && typeof dbPut !== 'undefined' && typeof dbGet !== 'undefined') {
                const localSession = await dbGet('app_state', 'current_session');
                const localTime = localSession ? (localSession.timestamp || 0) : 0;
                const cloudTime = data.session.timestamp || 0;

                if (cloudTime > localTime) {
                    await dbPut('app_state', data.session);
                    if (typeof restoreSession === 'function') {
                        setTimeout(() => { restoreSession(); safeToast("📥 Черновик подтянут из облака!"); }, 500);
                    }
                }
            }
            dbUpdated = true;
        }
    }

    // Сохранение в базу телефона
    if (dbUpdated && typeof dbPut !== 'undefined') {
        if (typeof contractorArray !== 'undefined') {
            for (const item of contractorArray) {
                if (item._deleted) await dbDelete('app_history', item.id);
                else await dbPut('app_history', item);
            }
            contractorArray = contractorArray.filter(i => !i._deleted);
        }
    }
};