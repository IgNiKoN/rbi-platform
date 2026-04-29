/* Файл: js/sync.js */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '', syncMode: 'personal', fullAccessGranted: false };
window.isSyncing = false;

const SYNC_FULL_ACCESS_HASH = "16e1fc3fccf0e21ea5c3a37fc6bdfe2db9ee3646ca153ff29ccfbbe868e7ec8b";

try {
    let saved = localStorage.getItem('rbi_sync_config');
    if (saved) window.syncConfig = JSON.parse(saved);
} catch(e) { console.error("Ошибка чтения конфига:", e); }

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
        if (window.supabase && window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL && window.APP_CONFIG.SUPABASE_URL.startsWith('http')) {
            window.supabaseClient = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
        }
    } catch (e) { console.error("Ошибка инициализации Supabase:", e); }

    if (!window.supabaseClient) {
        const block = document.getElementById('sync-settings-block');
        if (block && !block.innerHTML.includes('Облако отключено')) {
            block.insertAdjacentHTML('afterbegin', '<div class="p-3 bg-red-50 text-red-600 text-[10px] font-bold text-center border-b border-red-200">⚠️ Облако отключено: Добавьте рабочие ключи в js/config.js</div>');
        }
        return;
    }
    
    if (window.syncConfig.enabled && window.syncConfig.engineerName && window.syncConfig.projectCode) {
        window.triggerSync('full');
        setInterval(() => window.triggerSync('silent'), 120000);
    }
};

window.isSyncEnabled = function() { return window.syncConfig.enabled; };

window.renderSyncUI = function() {
    const container = document.getElementById('sync-settings-block');
    const headerIndicator = document.getElementById('header-sync-status');
    
    if (headerIndicator) {
        if (window.syncConfig.enabled) {
            if (window.isSyncing) {
                headerIndicator.innerHTML = `<div title="Синхронизация..." class="text-green-500 animate-pulse flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg></div>`;
            } else {
                headerIndicator.innerHTML = `<div title="Облако подключено" class="text-green-500 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg></div>`;
            }
        } else {
            headerIndicator.innerHTML = `<div title="Локальный режим" class="text-slate-400 opacity-70 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg></div>`;
        }
    }

    if (!container) return;

    let engName = window.syncConfig.engineerName || '';
    if (!engName && typeof appSettings !== 'undefined' && appSettings.engineerName) engName = appSettings.engineerName;

    if (window.syncConfig.enabled) {
        container.innerHTML = `
            <div class="p-4 bg-green-50 dark:bg-green-900/20 border-b border-[var(--card-border)] text-center">
                <div class="text-[12px] font-black text-green-700 dark:text-green-400 uppercase mb-1">Синхронизация активна</div>
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Инженер: ${window.syncConfig.engineerName}</div>
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Код проекта: ${window.syncConfig.projectCode}</div>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.triggerSync('manual')" class="w-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform mb-2 flex items-center justify-center gap-2">🔄 Синхронизировать сейчас</button>
                <button onclick="window.disconnectSync()" class="w-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform">Отключить облако</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="p-4 border-b border-[var(--card-border)]">
                <div class="text-[10px] text-[var(--text-muted)] mb-3 leading-relaxed font-medium">Для работы в команде введите свои данные. Без подключения приложение работает локально.</div>
                <div class="space-y-3">
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Ваше Имя (Фамилия И.О.) *</label>
                        <input type="text" id="sync-name" class="input-base ${engName ? 'bg-slate-100 text-slate-500 cursor-not-allowed dark:bg-slate-900' : ''}" placeholder="Иванов И.И." value="${engName}" ${engName ? 'readonly' : ''}>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Код проекта команды *</label>
                        <input type="text" id="sync-code" class="input-base" placeholder="Например: RBI-TOWER-1">
                    </div>
                </div>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.saveSyncSettings()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform">Сохранить и подключиться</button>
            </div>
        `;
    }
};

window.saveSyncSettings = async function() {
    const name = document.getElementById('sync-name').value.trim();
    const code = document.getElementById('sync-code').value.trim();

    if (!name || !code) return safeToast("⚠️ Имя и Код проекта обязательны!");
    if (!window.supabaseClient) return alert("❌ Ошибка: Ключи базы данных не настроены в js/config.js");

    const { data: projData } = await window.supabaseClient.from('allowed_projects').select('code').eq('code', code).limit(1);
    if (!projData || projData.length === 0) return safeToast("❌ Ошибка: Такого кода проекта не существует!");

    window.applySyncConnect(name, code, '');
};

window.applySyncConnect = function(name, code, hashedPin) {
    window.syncConfig.enabled = true;
    window.syncConfig.engineerName = name;
    window.syncConfig.projectCode = code;
    window.syncConfig.pinHash = hashedPin;
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    
    if (typeof appSettings !== 'undefined') {
        appSettings.engineerName = name;
        if (typeof dbPut === 'function') dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
        if (typeof applySmartLocks === 'function') applySmartLocks();
    }
    window.renderSyncUI();
    safeToast("✅ Подключено к Облаку!");
    window.triggerSync('manual');
};

window.disconnectSync = function() {
    if (!confirm("Отключить облако? Ваши данные останутся на устройстве.")) return;
    window.syncConfig.enabled = false;
    window.syncConfig.projectCode = '';
    window.syncConfig.pinHash = '';
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
    safeToast("Отключено. Локальный режим.");
};

window.triggerSync = async function(mode = 'silent') {
    if (!window.isSyncEnabled() || !window.supabaseClient) {
        if (mode === 'manual' && !window.supabaseClient) safeToast('❌ Ошибка: Облако не подключено');
        return;
    }
    
    if (window.isSyncing) {
        if (mode === 'manual') safeToast("⏳ Синхронизация уже идет... Подождите");
        return;
    }
    
    window.isSyncing = true;
    window.renderSyncUI(); 
    
    try {
        const pCode = window.syncConfig.projectCode;
        const iName = window.syncConfig.engineerName;

        let currentHistory = typeof contractorArray !== 'undefined' ? contractorArray : [];
        if (window.syncConfig.syncMode === 'personal') {
            currentHistory = currentHistory.filter(i => i.inspectorName === iName);
        }

        // 1. Отправка Истории (PUSH)
        if (currentHistory.length > 0) {
            if (mode === 'manual') safeToast(`🔄 Шаг 1: Отправка проверок...`);
            const insps = currentHistory.map(c => ({
                id: c.id, project_code: pCode, inspector_name: c.inspectorName, contractor_name: c.contractorName,
                template_key: c.templateKey, location: c.location, date: c.date,
                inspection_data: {
                    templateTitle: c.templateTitle, section: c.section, floor: c.floor, room: c.room,
                    instanceId: c.instanceId, stageId: c.stageId, stageName: c.stageName,
                    checkedStagesInfo: c.checkedStagesInfo, isCompleted: c.isCompleted,
                    state: c.state, details: c.details, metrics: c.metrics
                },
                photos: c.photos, _deleted: c._deleted || false, _deleted_at: c._deletedAt || null, updated_at: new Date().toISOString()
            }));
            
            for (let i = 0; i < insps.length; i += 100) {
                await window.supabaseClient.from('rbi_inspections').upsert(insps.slice(i, i + 100), { onConflict: 'id' });
            }
        }

        // 2. Отправка Справочников (PUSH)
        if (mode === 'manual') safeToast('🔄 Шаг 2: Отправка справочников...');
        const pushDict = async (table, dataArr, dataField) => {
            if (!dataArr || dataArr.length === 0) return;
            const rows = dataArr.filter(item => !String(item.id).startsWith('sys_')).map(item => ({
                id: String(item.id), project_code: pCode, [dataField]: item, updated_at: new Date().toISOString()
            }));
            if (rows.length > 0) {
                await window.supabaseClient.from(table).upsert(rows, { onConflict: 'id' });
            }
        };
        await pushDict('rbi_custom_twi_cards', typeof customTwiCards !== 'undefined' ? customTwiCards : [], 'card_data');
        await pushDict('rbi_custom_nodes', typeof customNodes !== 'undefined' ? customNodes : [], 'node_data');
        await pushDict('rbi_custom_docs', typeof customDocs !== 'undefined' ? customDocs : [], 'doc_data');

        // 3. Отправка Задач и Эталонов
        if (mode === 'manual') safeToast('🔄 Шаг 3: Задачи и Эталоны...');
        if (typeof rbi_tasksData !== 'undefined' && rbi_tasksData.length > 0) {
            try {
                const tasks = rbi_tasksData.map(t => ({
                    id: t.id, inspector_id: window.syncConfig.deviceId, inspector_name: iName, project_code: pCode, task_data: t,
                    updated_at: t.updatedAt || new Date().toISOString(), _deleted: t._deleted || false, deleted_at: t._deleted ? new Date().toISOString() : null
                }));
                for (let i = 0; i < tasks.length; i += 100) {
                    await window.supabaseClient.from('rbi_tasks').upsert(tasks.slice(i, i + 100), { onConflict: 'id' });
                }
            } catch(e) {}
        }

        if (typeof etalonActsArray !== 'undefined' && etalonActsArray.length > 0) {
            try {
                const etalons = etalonActsArray.map(c => ({
                    id: c.id, inspector_id: window.syncConfig.deviceId, inspector_name: c.inspectorName, contractor_name: c.contractorName,
                    project_code: pCode, template_key: c.templateKey, act_data: c, updated_at: c.updatedAt || new Date().toISOString(),
                    _deleted: c._deleted || false, deleted_at: c._deleted ? new Date().toISOString() : null
                }));
                for (let i = 0; i < etalons.length; i += 100) {
                    await window.supabaseClient.from('rbi_etalon_acts').upsert(etalons.slice(i, i + 100), { onConflict: 'id' });
                }
            } catch(e) {}
        }

        // 4. Отправка Профиля и Черновика (PUSH)
        if (mode === 'manual') safeToast('🔄 Шаг 4: Профиль и Черновик...');
        const currentSession = (typeof dbGet !== 'undefined') ? (await dbGet('app_state', 'current_session') || {}) : {};
        const hrProfileData = {
            timestamp: Date.now(), session: currentSession, gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [],
            plan: typeof weeklyPlanData !== 'undefined' ? weeklyPlanData : null, absence: typeof engineerAbsence !== 'undefined' ? engineerAbsence : null,
            statuses: typeof contractorStatuses !== 'undefined' ? contractorStatuses : {}, expertConclusions: typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {},
            settings: typeof appSettings !== 'undefined' ? appSettings : {}, schedule: typeof rbi_scheduleData !== 'undefined' ? rbi_scheduleData : [],
            interventions: typeof rbi_interventionsData !== 'undefined' ? rbi_interventionsData : [], practices: typeof rbi_practicesData !== 'undefined' ? rbi_practicesData : []
        };

        await window.supabaseClient.from('rbi_engineer_profiles').upsert({
            inspector_id: window.syncConfig.deviceId, inspector_name: iName, project_code: pCode, pin_hash: window.syncConfig.pinHash,
            profile_data: hrProfileData, updated_at: new Date().toISOString()
        }, { onConflict: 'inspector_id' });

        // 5. Загрузка обновлений (PULL)
        if (mode === 'manual') safeToast('🔄 Шаг 5: Загрузка с сервера...');
        let lastSync = localStorage.getItem('last_cloud_sync_time') || '2000-01-01T00:00:00Z';

        let query = window.supabaseClient.from('rbi_inspections').select('*').eq('project_code', pCode).gt('updated_at', lastSync);
        if (window.syncConfig.syncMode === 'personal') query = query.eq('inspector_name', iName);
        const { data: newInspections } = await query;

        const { data: newTwi } = await window.supabaseClient.from('rbi_custom_twi_cards').select('*').eq('project_code', pCode).gt('updated_at', lastSync);
        const { data: newNodes } = await window.supabaseClient.from('rbi_custom_nodes').select('*').eq('project_code', pCode).gt('updated_at', lastSync);
        const { data: newDocs } = await window.supabaseClient.from('rbi_custom_docs').select('*').eq('project_code', pCode).gt('updated_at', lastSync);
        const { data: newProfiles } = await window.supabaseClient.from('rbi_engineer_profiles').select('*').eq('project_code', pCode);

        let newTasks = [], newEtalons = [];
        try {
            const resT = await window.supabaseClient.from('rbi_tasks').select('*').eq('project_code', pCode).gt('updated_at', lastSync);
            if (resT.data) newTasks = resT.data;
            const resE = await window.supabaseClient.from('rbi_etalon_acts').select('*').eq('project_code', pCode).gt('updated_at', lastSync);
            if (resE.data) newEtalons = resE.data;
        } catch (dbErr) {}

        const { data: ratingData } = await window.supabaseClient.from('rbi_project_ratings').select('rating_data').eq('project_code', pCode).limit(1);
        if (ratingData && ratingData.length > 0) window.serverGlobalRating = ratingData[0].rating_data;

        // 6. Слияние
        if (mode === 'manual') safeToast('🔄 Шаг 6: Слияние баз...');
        await window.mergeCloudData(newInspections, newTwi, newNodes, newDocs, newProfiles, newTasks, newEtalons);

        localStorage.setItem('last_cloud_sync_time', new Date().toISOString());

        if (mode === 'manual') safeToast('✅ Успешно! Базы синхронизированы.');
        
        if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
        if (typeof renderSelector === 'function') renderSelector();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();

    } catch (e) {
        console.error("[Sync] Ошибка:", e);
        if (mode === 'manual') safeToast('❌ Ошибка: ' + e.message.substring(0, 50));
    } finally {
        window.isSyncing = false;
        window.renderSyncUI(); 
    }
};

window.mergeCloudData = async function(newInspections, newTwi, newNodes, newDocs, newProfiles, newTasks, newEtalons) {
    let dbUpdated = false;

    const safeInspections = newInspections || [];
    const safeTwi = newTwi || [];
    const safeNodes = newNodes || [];
    const safeDocs = newDocs || [];
    const safeProfiles = newProfiles || [];
    const safeTasks = newTasks || [];
    const safeEtalons = newEtalons || [];

    if (safeInspections.length > 0) {
        let historyMap = new Map();
        if (typeof contractorArray !== 'undefined') contractorArray.forEach(c => historyMap.set(c.id, c));
        safeInspections.forEach(row => {
            const item = { id: row.id, date: row.date, projectName: row.project_code, inspectorName: row.inspector_name, contractorName: row.contractor_name, templateKey: row.template_key, location: row.location, ...row.inspection_data, photos: row.photos, _deleted: row._deleted, _deletedAt: row._deleted_at };
            historyMap.set(item.id, item);
        });
        contractorArray = Array.from(historyMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        dbUpdated = true;
    }

    if (safeTwi.length > 0 && typeof customTwiCards !== 'undefined') {
        let map = new Map(customTwiCards.map(c => [c.id, c]));
        safeTwi.forEach(row => map.set(row.id, row.card_data));
        customTwiCards = Array.from(map.values());
        dbUpdated = true;
    }
    if (safeNodes.length > 0 && typeof customNodes !== 'undefined') {
        let map = new Map(customNodes.map(c => [c.id, c]));
        safeNodes.forEach(row => map.set(row.id, row.node_data));
        customNodes = Array.from(map.values());
        dbUpdated = true;
    }
    if (safeDocs.length > 0 && typeof customDocs !== 'undefined') {
        let map = new Map(customDocs.map(c => [c.id, c]));
        safeDocs.forEach(row => map.set(row.id, row.doc_data));
        customDocs = Array.from(map.values());
        dbUpdated = true;
    }

    if (safeEtalons.length > 0 && typeof etalonActsArray !== 'undefined') {
        let etalonMap = new Map(etalonActsArray.map(c => [c.id, c]));
        safeEtalons.forEach(row => {
            const item = { id: row.id, ...row.act_data, _deleted: row._deleted, _deletedAt: row._deleted_at };
            etalonMap.set(item.id, item);
        });
        etalonActsArray = Array.from(etalonMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        dbUpdated = true;
    }

    if (safeTasks.length > 0 && typeof rbi_tasksData !== 'undefined') {
        safeTasks.forEach(row => {
            const incomingTask = { id: row.id, ...row.task_data, updatedAt: row.updated_at, _deleted: row._deleted };
            const existing = rbi_tasksData.find(t => t.id === incomingTask.id);
            if (!existing) rbi_tasksData.push(incomingTask);
            else {
                const inTime = new Date(incomingTask.updatedAt || 0).getTime();
                const exTime = new Date(existing.updatedAt || 0).getTime();
                if (inTime > exTime) Object.assign(existing, incomingTask);
            }
        });
        dbUpdated = true;
    }

    if (safeProfiles.length > 0) {
        // БЕСШОВНАЯ РАБОТА: ИЩЕМ ПРОФИЛЬ ТОЛЬКО ПО ИМЕНИ ИНЖЕНЕРА (Связываем устройства)
        const myProfile = safeProfiles.find(p => p.inspector_name === window.syncConfig.engineerName);
        if (myProfile) {
            const data = myProfile.profile_data;
            if (data.gameLogs && typeof gameActionLogs !== 'undefined') {
                let logMap = new Map(gameActionLogs.map(l => [l.id, l]));
                data.gameLogs.forEach(l => logMap.set(l.id, l));
                gameActionLogs = Array.from(logMap.values());
            }
            if (data.plan && typeof weeklyPlanData !== 'undefined') weeklyPlanData = data.plan;
            if (data.absence && typeof engineerAbsence !== 'undefined') engineerAbsence = data.absence;
            if (data.statuses && typeof contractorStatuses !== 'undefined') contractorStatuses = { ...contractorStatuses, ...data.statuses };
            if (data.expertConclusions && typeof customExpertConclusions !== 'undefined') customExpertConclusions = { ...customExpertConclusions, ...data.expertConclusions };
            if (data.settings && typeof appSettings !== 'undefined') {
                appSettings = { ...appSettings, ...data.settings };
                if (typeof applySettingsToUI === 'function') applySettingsToUI();
            }
            
            // ВОССТАНОВЛЕНИЕ ЧЕРНОВИКА
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

    if (dbUpdated && typeof dbPut !== 'undefined') {
        if (typeof contractorArray !== 'undefined') {
            for (const item of contractorArray) {
                if (item._deleted) {
                    await dbDelete('app_history', item.id);
                } else await dbPut('app_history', item);
            }
            contractorArray = contractorArray.filter(i => !i._deleted);
        }

        if (typeof etalonActsArray !== 'undefined') {
            for (const item of etalonActsArray) {
                if (item._deleted) await dbDelete('rbi_etalon_acts', item.id);
                else await dbPut('rbi_etalon_acts', item);
            }
            etalonActsArray = etalonActsArray.filter(i => !i._deleted);
        }

        if (typeof rbi_tasksData !== 'undefined') {
            for (const item of rbi_tasksData) {
                if (item._deleted) await dbDelete('rbi_tasks', item.id);
                else await dbPut('rbi_tasks', item);
            }
            rbi_tasksData = rbi_tasksData.filter(i => !i._deleted);
        }

        await dbPut('app_settings', { key: 'custom_twi_cards', data: typeof customTwiCards !== 'undefined' ? customTwiCards.filter(c => !String(c.id).startsWith('sys_')) : [] });
        await dbPut('app_settings', { key: 'custom_docs', data: typeof customDocs !== 'undefined' ? customDocs.filter(d => !String(d.id).startsWith('sys_')) : [] });
        await dbPut('app_settings', { key: 'custom_nodes', data: typeof customNodes !== 'undefined' ? customNodes : [] }); 
        await dbPut('app_settings', { key: 'game_action_logs', data: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [] });
        await dbPut('app_settings', { key: 'contractor_statuses', data: typeof contractorStatuses !== 'undefined' ? contractorStatuses : {} });
        
        if (typeof saveSessionData === 'function') saveSessionData();
    }
};