/* Файл: js/sync.js (Исправленная версия сборки объектов) */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '', syncMode: 'personal', fullAccessGranted: false };
window.isSyncing = false;
let syncTimeout = null;
// Флаги отложенного обновления интерфейса (Lazy Rendering)
window.syncDirtyFlags = {
    templates: false,
    history: false,
    analytics: false,
    tasks: false,
    session: false
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
} catch(e) {}

if (!window.syncConfig.deviceId) {
    window.syncConfig.deviceId = 'dev_' + Date.now().toString(36);
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
}

function safeToast(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log(msg);
}

window.hashPin = async function(pin) {
    if (!pin) return null;
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

window.initSync = async function() {
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

window.isSyncEnabled = function() { return window.syncConfig.enabled; };

window.renderSyncUI = function() {
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
        container.innerHTML = `
            <div class="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800/50 text-center">
                <div class="text-[12px] font-black text-green-700 dark:text-green-400 uppercase mb-1">Синхронизация активна</div>
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Инженер: ${window.syncConfig.engineerName}</div>
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Код проекта: ${window.syncConfig.projectCode}</div>
            </div>
            <div class="p-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] flex justify-between items-center">
                <div>
                    <div class="font-bold text-[11px] uppercase text-slate-700 dark:text-slate-300 cursor-pointer" ondblclick="window.resetFullAccess()">Режим: ${window.syncConfig.syncMode === 'full' ? 'Вся команда' : 'Только мои'}</div>
                </div>
                <select id="sync-mode-select" class="input-base !w-auto !py-1.5 !text-[10px] font-bold" onchange="window.changeSyncMode(this.value)">
                    <option value="personal" ${window.syncConfig.syncMode === 'personal' ? 'selected' : ''}>Только мои</option>
                    <option value="full" ${window.syncConfig.syncMode === 'full' ? 'selected' : ''}>Вся команда</option>
                </select>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.triggerSync('manual')" class="w-full bg-[var(--card-bg)] text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 mb-2 flex items-center justify-center gap-2 transition-colors hover:border-indigo-400">🔄 Синхронизировать сейчас</button>
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
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Код проекта *</label>
                        <input type="text" id="sync-code" class="input-base" placeholder="Например: RBI-TOWER-1">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">ПИН-код (Опционально)</label>
                        <input type="password" id="sync-pin" class="input-base" placeholder="4 цифры" maxlength="4" inputmode="numeric">
                    </div>
                </div>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.saveSyncSettings()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 transition-transform">Подключиться к облаку</button>
            </div>
        `;
    }
};

window.saveSyncSettings = async function() {
    const name = document.getElementById('sync-name').value.trim();
    const code = document.getElementById('sync-code').value.trim();
    const pin = document.getElementById('sync-pin').value.trim();

    if (!name || !code) return safeToast("⚠️ Имя и Код проекта обязательны!");
    if (!window.supabaseClient) return alert("❌ Ошибка: Ключи базы данных не настроены");

    const { data: projData } = await window.supabaseClient.from('allowed_projects').select('code').eq('code', code).limit(1);
    if (!projData || projData.length === 0) return safeToast("❌ Ошибка: Такого кода проекта не существует!");

    const hashedPin = await window.hashPin(pin);
    const { data } = await window.supabaseClient.from('rbi_engineer_profiles').select('pin_hash').eq('project_code', code).eq('inspector_name', name).limit(1);
        
    if (data && data.length > 0 && data[0].pin_hash && data[0].pin_hash !== hashedPin) {
        window.showPinPromptModal(name, code, data[0].pin_hash);
        return;
    }

    window.applySyncConnect(name, code, hashedPin);
};

window.showPinPromptModal = function(name, code, correctHash) {
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

window.verifySyncPin = async function(name, code, correctHash) {
    const input = document.getElementById('sync-pin-verify').value;
    const inputHash = await window.hashPin(input);
    if (inputHash === correctHash) {
        document.getElementById('sync-pin-modal').remove();
        window.applySyncConnect(name, code, inputHash);
    } else safeToast("❌ Неверный PIN-код!");
};

// Функция глубокой очистки проектных данных
window.clearProjectLocalData = async function() {
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

window.applySyncConnect = async function(name, code, hashedPin) {
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

window.disconnectSync = function() {
    if (!confirm("Отключить облако? Данные останутся на устройстве.")) return;
    window.syncConfig.enabled = false;
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
};

window.changeSyncMode = function(mode) {
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

window.verifyFullAccessPin = async function() {
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

window.resetFullAccess = function() {
    window.syncConfig.fullAccessGranted = false;
    window.syncConfig.syncMode = 'personal';
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
};


window.uploadObjectFilesToCloud = async function(obj, bucketName, pathPrefix, type = 'file') {
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

window.pushCloudObject = async function(objectType, id, data, bucketName = 'custom-assets') {
    if (!data || !id) return;

    const pCode = window.syncConfig.projectCode;
    const iName = window.syncConfig.engineerName;
    const isDeleted = data._deleted === true; 
    const deletedAt = isDeleted ? (data._deletedAt || data.updatedAt || new Date().toISOString()) : null;
    const updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();

    // МАППИНГ НОВЫХ ТАБЛИЦ И БАКЕТОВ
    let tableName = ''; let isShared = false; let targetBucket = bucketName;
    switch(objectType) {
        case 'custom_twi_card': tableName = 'shared_twi_cards'; isShared = true; targetBucket = 'library-twi'; break;
        case 'custom_node': tableName = 'shared_nodes'; isShared = true; targetBucket = 'library-nodes'; break;
        case 'custom_doc': tableName = 'shared_docs'; isShared = true; targetBucket = 'library-docs'; break;
        case 'user_template': tableName = 'shared_checklists'; isShared = true; targetBucket = 'library-checklists'; break;
        case 'practice': tableName = 'shared_practices'; isShared = true; targetBucket = 'library-practices'; break;
        case 'etalon': tableName = 'shared_etalons'; isShared = true; targetBucket = 'library-etalons'; break;
        case 'meeting': tableName = 'project_meetings'; targetBucket = 'inspection-photos'; break;
        case 'intervention': tableName = 'project_interventions'; targetBucket = 'inspection-photos'; break;
        case 'fmea': tableName = 'project_fmea'; targetBucket = 'inspection-photos'; break;
        case 'schedule': tableName = 'project_schedule_stages'; targetBucket = 'inspection-photos'; break;
        case 'sk_data_bundle': tableName = 'sk_data_bundles'; targetBucket = 'inspection-photos'; break;
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

    const payload = {
        id: id,
        data: uploadedData,
        is_deleted: isDeleted,
        deleted_at: deletedAt,
        updated_at: updatedAt
    };

    if (isShared) payload.owner = data.owner || iName;
    else { payload.project_code = pCode; payload.engineer_name = iName; }

    const { error } = await window.supabaseClient.from(tableName).upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    
    // ВАЖНО: Возвращаем обновленный объект (с замененными ссылками на http://)
    return uploadedData; 
};

window.pullCloudObjects = async function(objectType, lastPullTimeStr = '', mode = 'silent') {
    const pCode = window.syncConfig.projectCode;
    let tableName = ''; let isShared = false;

    switch(objectType) {
        case 'custom_twi_card': tableName = 'shared_twi_cards'; isShared = true; break;
        case 'custom_node': tableName = 'shared_nodes'; isShared = true; break;
        case 'custom_doc': tableName = 'shared_docs'; isShared = true; break;
        case 'user_template': tableName = 'shared_checklists'; isShared = true; break;
        case 'practice': tableName = 'shared_practices'; isShared = true; break;
        case 'etalon': tableName = 'shared_etalons'; isShared = true; break;
        case 'meeting': tableName = 'project_meetings'; break;
        case 'intervention': tableName = 'project_interventions'; break;
        case 'fmea': tableName = 'project_fmea'; break;
        case 'schedule': tableName = 'project_schedule_stages'; break;
        case 'sk_data_bundle': tableName = 'sk_data_bundles'; break;
        default: return [];
    }

    let query = window.supabaseClient.from(tableName).select('*');
    if (!isShared) query = query.eq('project_code', pCode);
    if (lastPullTimeStr) query = query.gt('updated_at', lastPullTimeStr);

    const { data, error } = await query;
    if (error) throw error;

    const result = [];

    for (const row of data || []) {
        let obj = row.data || {};
        obj.id = row.id;
        obj.updatedAt = row.updated_at;
        
        // ЖЕЛЕЗОБЕТОННОЕ УДАЛЕНИЕ (Soft Delete)
        if (row.is_deleted) {
            obj._deleted = true; 
            obj._deletedAt = row.deleted_at || new Date().toISOString();
        }
        
        if (isShared && row.owner) obj.owner = row.owner;
        
        result.push(obj);
    }
    return result;
};
// ============================================================================
// ГЛАВНЫЙ БЛОК СИНХРОНИЗАЦИИ (ИСПРАВЛЕНО СОХРАНЕНИЕ ОБЪЕКТОВ)
// ==========================================
window.triggerSync = async function(mode = 'silent') {
    // ЖЕСТКАЯ ЗАЩИТА: Запрещаем синхронизацию в демо-режиме
    if (typeof isDemoMode !== 'undefined' && isDemoMode) {
        if (mode === 'manual') safeToast("В демо-режиме синхронизация отключена!");
        return;
    }
    if (!window.isSyncEnabled() || !window.supabaseClient) return;

    if (window.isSyncing) {
        if (mode === 'manual') safeToast("⏳ Синхронизация уже идет...");
        return;
    }

    // Экономия Supabase: тихую синхронизацию не запускаем без изменений
    if (mode === 'silent' && localStorage.getItem('rbi_cloud_dirty') !== '1') {
        return;
    }

    window.isSyncing = true;
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

    // === ГЛОБАЛЬНЫЕ ФУНКЦИИ ЗАГРУЗКИ ФОТО ===
window.isHttpUrl = function(v) { return typeof v === 'string' && /^https?:\/\//i.test(v); };
window.isLocalUrl = function(v) { return typeof v === 'string' && v.startsWith('local://'); };
window.isDataUrl = function(v) { return typeof v === 'string' && v.startsWith('data:'); };

window.getStoragePathFromPublicUrl = function(url, bucketName) {
    if (!url || !bucketName) return '';
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return '';
    return decodeURIComponent(url.slice(idx + marker.length));
};

window.dataUrlToBlob = function(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = (parts[0].match(/data:(.*?);base64/) || [])[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { blob: new Blob([bytes], { type: mime }), mime };
};

window.extFromMime = function(mime) {
    if (!mime) return 'bin';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('pdf')) return 'pdf';
    return 'bin';
};

window.localPhotoToBlob = async function(localUrl) {
    if (!window.isLocalUrl(localUrl) || typeof dbGet !== 'function') return null;
    const rec = await dbGet('app_photos', localUrl);
    if (!rec || !rec.data) return null;
    const mime = rec.mimeType || 'image/jpeg';
    return { blob: new Blob([rec.data], { type: mime }), mime };
};

window.rbiUploadAsset = async function(value, bucketName, pathPrefix, filePrefix) {
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
        // 2. PULL: проверки из новой нормальной архитектуры
        // =====================================================
       
        let inspectionsQuery = window.supabaseClient
            .from('rbi_inspections')
            .select('*')
            .eq('project_code', pCode)
            .eq('is_deleted', false)
            .order('inspection_date', { ascending: false });

        if (window.syncConfig.syncMode === 'personal') {
            inspectionsQuery = inspectionsQuery.eq('engineer_name', iName);
        }

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
                    projectName: h.project_name || '',
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
                    updatedAt: h.updated_at || new Date().toISOString()
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
                .eq('task_data->>type', 'manual'); // <-- СКАЧИВАЕМ ТОЛЬКО РУЧНЫЕ ЗАДАЧИ

            if (window.syncConfig.syncMode === 'personal') {
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
        // =====================================================
        // 4.1. PULL: прочие модули через rbi_cloud_objects
        // =====================================================
        try {
            const cloudTypes = [
                { type: 'meeting', store: 'rbi_meetings', memory: 'rbi_meetingsData' },
                { type: 'intervention', store: 'rbi_interventions', memory: 'rbi_interventionsData' },
                { type: 'practice', store: 'rbi_practices', memory: 'rbi_practicesData' },
                { type: 'schedule', store: 'rbi_schedule_stages', memory: 'rbi_scheduleData' },
                { type: 'fmea', store: 'rbi_fmea', memory: 'rbi_fmeaRecords' },
                { type: 'etalon', store: 'rbi_etalon_acts', memory: 'etalonActsArray' }
            ];

            for (const cType of cloudTypes) {
                const objects = await window.pullCloudObjects(cType.type, lastPullAt, mode);
                if (!objects || objects.length === 0) continue;

                window[cType.memory] = window[cType.memory] || [];
                
                for (const obj of objects) {
                    const localExisting = await dbGet(cType.store, obj.id);
                    const localTime = localExisting ? new Date(localExisting.updatedAt || localExisting.updated_at || localExisting.date || 0).getTime() : 0;
                    const cloudTime = new Date(obj.updatedAt || 0).getTime();
                    
                    // Применяем изменения ТОЛЬКО если облако новее
                    if (!localExisting || cloudTime > localTime) {
                        await dbPut(cType.store, obj);
                        const idx = window[cType.memory].findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window[cType.memory][idx] = obj;
                        else window[cType.memory].push(obj);
                    }
                }
            }

            // Пакет Стройконтроля
            const skBundles = await window.pullCloudObjects('sk_data_bundle', lastPullAt, mode);
            if (skBundles && skBundles.length > 0 && typeof dbGetAll === 'function') {
                let localRecords = await dbGetAll('sk_records') || [];
                const localMap = new Map();
                localRecords.forEach(r => localMap.set(r.id, r));

                for (const obj of skBundles) {
                    if (!obj.records) continue;
                    for (const cloudRecord of obj.records) {
                        const localRecord = localMap.get(cloudRecord.id);
                        const cloudTime = cloudRecord._updatedAt ? new Date(cloudRecord._updatedAt).getTime() : 0;
                        const localTime = localRecord?._updatedAt ? new Date(localRecord._updatedAt).getTime() : 0;

                        if (!localRecord || cloudTime > localTime) {
                            if (cloudRecord._deleted === true) {
                                if (localRecord) { await dbDelete('sk_records', cloudRecord.id); localMap.delete(cloudRecord.id); }
                            } else {
                                cloudRecord._updatedAt = cloudRecord._updatedAt || new Date().toISOString();
                                await dbPut('sk_records', cloudRecord);
                                localMap.set(cloudRecord.id, cloudRecord);
                            }
                        }
                    }
                    if (obj.volumes) { window.skVolumes = obj.volumes; await dbPut('app_settings', { key: 'sk_volumes', data: window.skVolumes }); }
                    if (obj.contractorMap) { window.skContractorMap = obj.contractorMap; await dbPut('app_settings', { key: 'sk_contractor_map', data: window.skContractorMap }); }
                }
                window.skRecords = Array.from(localMap.values()).filter(r => !r._deleted);
                // Мгновенное обновление экрана, если мы прямо сейчас находимся во вкладке ПК СК
                if (document.getElementById('tab-analytics')?.classList.contains('active') && typeof currentActiveAnalyticsTab !== 'undefined' && currentActiveAnalyticsTab === 'sub-sk') {
                    if (typeof sk_renderMainTab === 'function') sk_renderMainTab();
                }
            }

            // Справочники (TWI, Узлы, Документы, Чек-листы)
            const refTypes = [
                { type: 'custom_doc', memory: 'customDocs', storeKey: 'custom_docs' },
                { type: 'custom_node', memory: 'customNodes', storeKey: 'custom_nodes' },
                { type: 'custom_twi_card', memory: 'customTwiCards', storeKey: 'custom_twi_cards' },
                { type: 'user_template', memory: 'userTemplates', storeKey: 'user_templates', isDict: true }
            ];

            for (const rType of refTypes) {
                const objects = await window.pullCloudObjects(rType.type, lastPullAt, mode);
                if (!objects || objects.length === 0) continue;

                if (rType.isDict) {
                    // Чек-листы (Объект, а не массив)
                    window[rType.memory] = window[rType.memory] || {};
                    for (const obj of objects) {
                        const localExisting = await dbGet('user_templates', obj.id);
                        const localTime = localExisting?.data ? new Date(localExisting.data.updatedAt || 0).getTime() : 0;
                        const cloudTime = new Date(obj.updatedAt || 0).getTime();
                        
                        if (!localExisting || cloudTime > localTime) {
                            if (obj._deleted) {
                                delete window[rType.memory][obj.id];
                                await dbDelete('user_templates', obj.id);
                            } else {
                                window[rType.memory][obj.id] = obj;
                                await dbPut('user_templates', { slug: obj.id, data: obj });
                            }
                        }
                    }
                } else {
                    // Массивы (TWI, Узлы, Доки)
                    window[rType.memory] = window[rType.memory] || [];
                    let memoryChanged = false;
                    
                    for (const obj of objects) {
                        // Для них мы храним данные единым массивом в Settings
                        const idx = window[rType.memory].findIndex(x => String(x.id) === String(obj.id));
                        const localTime = idx >= 0 ? new Date(window[rType.memory][idx].updatedAt || 0).getTime() : 0;
                        const cloudTime = new Date(obj.updatedAt || 0).getTime();

                        if (idx === -1 || cloudTime > localTime) {
                            if (obj._deleted) {
                                if (idx >= 0) window[rType.memory].splice(idx, 1);
                            } else {
                                if (idx >= 0) window[rType.memory][idx] = obj;
                                else window[rType.memory].push(obj);
                            }
                            memoryChanged = true;
                        }
                    }
                    
                    if (memoryChanged && typeof dbPut === 'function') {
                        await dbPut('app_settings', { key: rType.storeKey, data: window[rType.memory].filter(c => !String(c.id).startsWith('sys_')) });
                    }
                }
            }
        } catch (e) {
            console.warn("[Sync] Прочие модули не подтянуты:", e.message);
        }
        // =====================================================
        // 5. PUSH: локальная история в новую архитектуру
        // =====================================================
        // Тянем данные напрямую из базы памяти, так как на экране удаленные файлы уже скрыты
        let currentHistory = typeof dbGetAll === 'function' ? (await dbGetAll('app_history') || []) : [];

        if (window.syncConfig.syncMode === 'personal') {
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

                const { error: headerError } = await window.supabaseClient
                    .from('rbi_inspections')
                    .upsert({
                        id: inspectionId,
                        project_code: pCode,
                        project_name: c.projectName || '',
                        engineer_name: c.inspectorName || iName,
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
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (headerError) throw headerError;

                const itemRows = [];

                for (const itemId of Object.keys(c.state || {})) {
                    const info = getChecklistItem(c.templateKey || '', itemId);
                    const d = (c.details || {})[itemId] || {};

                    itemRows.push({
                        id: `${inspectionId}_${itemId}`,
                        inspection_id: inspectionId,
                        project_code: pCode,
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
         
        // =====================================================
        // 6. PUSH: черновик
        // =====================================================
        if (typeof dbGet === 'function') {
            const currentSession = await dbGet('app_state', 'current_session');

            if (currentSession) {
                const draftPhotos = {};

                for (const itemId of Object.keys(currentSession.photos || {})) {
                    draftPhotos[itemId] = await window.rbiUploadAsset(
                        currentSession.photos[itemId],
                        'inspection-photos',
                        `${pCode}/drafts/${stableInspectorId}/${itemId}`,
                        'photo'
                    );
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
// Счётчики реально отправленных данных (чтобы не врать пользователю)
        let actuallyPushedProfiles = 0;
        let actuallyPushedTasks = 0;
                // =====================================================
        // 7. PUSH: профиль инженера для совместимости
        // =====================================================
      // =====================================================
        // 7. PUSH: профиль инженера для совместимости
        // =====================================================
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
          
                // =====================================================
        // 7.1. PUSH: задачи в rbi_tasks
        // =====================================================
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
                        engineer_name: task.engineerName || task.inspectorName || iName,
                        contractor_name: task.contractor || task.contractorName || '',
                        title: task.title || '',
                        task_data: task,
                        status: task.status || 'pending',
                        task_date: task.date || task.taskDate || null,
                        is_deleted: task._deleted || false,
                        deleted_at: task._deleted ? (task._deletedAt || new Date().toISOString()) : null,
                        updated_at: task.updatedAt || task.updated_at || new Date().toISOString()
                    }));
                    
                    const { error: taskError } = await window.supabaseClient
                        .from('rbi_tasks')
                        .upsert(upsertData, { onConflict: 'id' });

                    if (taskError) throw taskError;
                }
            }
        } catch (e) {
            console.warn("[Sync] Задачи не отправлены:", e.message);
            if (mode === 'manual') safeToast('⚠️ Задачи не отправлены: ' + e.message.substring(0, 60));
        }
         
        
        // =====================================================
        // 8. PUSH: рейтинг инженера
        // =====================================================
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
            // =====================================================
                // 8.1. PUSH: прочие модули через rbi_cloud_objects
                // =====================================================
                try {
                    const lastPushTime = lastPushAt ? new Date(lastPushAt).getTime() : 0;
                    const filterNew = (arr) => arr.filter(i => {
                        const t = new Date(i.updatedAt || i.updated_at || i.date || 0).getTime();
                        return t === 0 || t >= lastPushTime;
                    });

                    // 1. Вспомогательная функция для табличных данных (Совещания, FMEA и т.д.)
                    const syncTableData = async (storeName, memoryArrayName, objectType) => {
                        if (typeof dbGetAll !== 'function') return;
                        const items = filterNew(await dbGetAll(storeName) || []);
                        for (const obj of items) { 
                            const updated = await window.pushCloudObject(objectType, obj.id, obj, 'inspection-photos'); 
                            if (updated) {
                                await dbPut(storeName, updated);
                                if (window[memoryArrayName]) {
                                    const idx = window[memoryArrayName].findIndex(x => String(x.id) === String(updated.id));
                                    if (idx !== -1) window[memoryArrayName][idx] = updated;
                                }
                            }
                        }
                    };

                    await syncTableData('rbi_meetings', 'rbi_meetingsData', 'meeting');
                    await syncTableData('rbi_interventions', 'rbi_interventionsData', 'intervention');
                    await syncTableData('rbi_practices', 'rbi_practicesData', 'practice');
                    await syncTableData('rbi_schedule_stages', 'rbi_scheduleData', 'schedule');
                    await syncTableData('rbi_fmea', 'rbi_fmeaRecords', 'fmea');
                    await syncTableData('rbi_etalon_acts', 'etalonActsArray', 'etalon');

                    // Отправка ПК СК (Стройконтроль)
                    if (typeof dbGetAll === 'function') {
                        const skRecs = await dbGetAll('sk_records') || [];
                        const newSkRecs = filterNew(skRecs);
                        // Загружаем в облако, если есть новые записи, либо при ручной синхронизации
                        if (mode === 'manual' || newSkRecs.length > 0) {
                            const skVols = await dbGet('app_settings', 'sk_volumes');
                            const skCmap = await dbGet('app_settings', 'sk_contractor_map');
                            if (skRecs.length > 0 || (skVols && skVols.data)) {
                                const skBundle = {
                                    id: 'sk_bundle_' + pCode, 
                                    records: skRecs,
                                    volumes: skVols ? skVols.data : {},
                                    contractorMap: skCmap ? skCmap.data : {},
                                    updatedAt: new Date().toISOString()
                                };
                                
               
                                await window.pushCloudObject('sk_data_bundle', skBundle.id, skBundle, 'custom-assets');
                                
                            }
                        }
                    }

                    // 2. Вспомогательная функция для Библиотеки Справочников (TWI, Узлы, НД)
                    const syncSettingsData = async (memoryArray, storeKey, objectType, bucket) => {
                        if (typeof memoryArray !== 'undefined' && Array.isArray(memoryArray)) {
                            let changed = false;
                            for (const obj of filterNew(memoryArray.filter(x => x && x.id && !String(x.id).startsWith('sys_')))) {
                                const updated = await window.pushCloudObject(objectType, obj.id, obj, bucket);
                                if (updated) {
                                    const idx = memoryArray.findIndex(x => String(x.id) === String(updated.id));
                                    if (idx !== -1) memoryArray[idx] = updated;
                                    changed = true;
                                }
                            }
                            if (changed && typeof dbPut === 'function') {
                                await dbPut('app_settings', { key: storeKey, data: memoryArray.filter(c => !String(c.id).startsWith('sys_')) });
                            }
                        }
                    };

                    await syncSettingsData(customDocs, 'custom_docs', 'custom_doc', 'custom-assets');
                    await syncSettingsData(customNodes, 'custom_nodes', 'custom_node', 'custom-assets');
                    await syncSettingsData(customTwiCards, 'custom_twi_cards', 'custom_twi_card', 'twi-pdfs');

                    // ОТДЕЛЬНЫЙ PUSH ДЛЯ ЧЕК-ЛИСТОВ (т.к. это Объект, а не массив)
                    if (typeof userTemplates !== 'undefined') {
                        let tmplChanged = false;
                        const tmplArray = Object.values(userTemplates);
                        for (const obj of filterNew(tmplArray)) {
                            const updated = await window.pushCloudObject('user_template', obj.id, obj, 'library-checklists');
                            if (updated) {
                                userTemplates[updated.id] = updated;
                                await dbPut('user_templates', { slug: updated.id, data: updated });
                                tmplChanged = true;
                            }
                        }
                    }

                } catch (e) {
                    console.warn("[Sync] Прочие модули не отправлены:", e.message);
                }

        const doneAt = new Date().toISOString();

        localStorage.setItem('rbi_sync_last_pull_at', doneAt);
        localStorage.setItem('rbi_sync_last_push_at', doneAt);
        localStorage.setItem('rbi_cloud_dirty', '0');

        // ИСПРАВЛЕНИЕ: Честный подсчет реально отправленных и полученных объектов
        const pulledChecks = cloudInspections ? cloudInspections.length : 0;
        // pushedChecks уже отфильтрованы по времени выше (строка ~274)
        const pushedChecks = currentHistory ? currentHistory.length : 0; 
        
        const totalPushed = pushedChecks + actuallyPushedTasks + actuallyPushedProfiles;
        const hasChanges = pulledChecks > 0 || totalPushed > 0;

        // Включаем флаги "Грязных данных", чтобы вкладки обновились при переходе на них
        window.syncDirtyFlags.templates = true;
        window.syncDirtyFlags.history = true;
        window.syncDirtyFlags.analytics = true;
        window.syncDirtyFlags.tasks = true;
        window.syncDirtyFlags.session = true;
        window.syncDirtyFlags.reference = true; // <-- ДОБАВИЛИ ФЛАГ СПРАВОЧНИКА

        // === АВТОГЕНЕРАЦИЯ ПЛАНА НА НОВОМ УСТРОЙСТВЕ ===
        // Если синхронизация прошла, а задач всё еще 0 (новый телефон/браузер) - генерируем план
        if (typeof gameGenerateWeeklyPlan === 'function') {
            if (typeof window.rbi_tasksData !== 'undefined' && window.rbi_tasksData.length === 0) {
                await gameGenerateWeeklyPlan(true);
            }
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
            
            // Обновляем текущую активную аналитику, если мы на этой вкладке
            const analyticsTab = document.getElementById('tab-analytics');
            if (analyticsTab && analyticsTab.classList.contains('active') && typeof renderCurrentAnalyticsTab === 'function') {
                renderCurrentAnalyticsTab();
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
        if (mode === 'manual') {
            safeToast('❌ Ошибка: ' + (e.message ? e.message.substring(0, 80) : 'Сбой сети'));
        }
    } finally {
        if (syncTimeout) clearTimeout(syncTimeout);
        window.isSyncing = false;
        window.renderSyncUI();
    }
};

window.mergeCloudData = async function(newInspections, newProfiles, newTasks, newEtalons) {
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