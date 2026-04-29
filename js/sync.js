/* Файл: js/sync.js (Исправленная версия сборки объектов) */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '', syncMode: 'personal', fullAccessGranted: false };
window.isSyncing = false;
let syncTimeout = null;

const SYNC_FULL_ACCESS_HASH = "16e1fc3fccf0e21ea5c3a37fc6bdfe2db9ee3646ca153ff29ccfbbe868e7ec8b";

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
            window.supabaseClient = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
        }
    } catch (e) { console.error("Ошибка Supabase:", e); }

    if (!window.supabaseClient) {
        const block = document.getElementById('sync-settings-block');
        if (block && !block.innerHTML.includes('Облако отключено')) {
            block.insertAdjacentHTML('afterbegin', '<div class="p-3 bg-red-50 text-red-600 text-[10px] font-bold text-center border-b border-red-200">⚠️ Облако отключено</div>');
        }
        return;
    }
    
    if (window.syncConfig.enabled && window.syncConfig.engineerName && window.syncConfig.projectCode) {
        window.triggerSync('silent'); 
        setInterval(() => window.triggerSync('silent'), 60000); 
    }
};

window.isSyncEnabled = function() { return window.syncConfig.enabled; };

window.renderSyncUI = function() {
    const container = document.getElementById('sync-settings-block');
    const headerIndicator = document.getElementById('header-sync-status');
    
    if (headerIndicator) {
        if (window.syncConfig.enabled) {
            if (window.isSyncing) headerIndicator.innerHTML = `<div class="text-green-500 animate-pulse flex items-center justify-center">🔄</div>`;
            else headerIndicator.innerHTML = `<div class="text-green-500 flex items-center justify-center">☁️</div>`;
        } else {
            headerIndicator.innerHTML = `<div class="text-slate-400 opacity-70 flex items-center justify-center">☁️</div>`;
        }
    }

    if (!container) return;

    let engName = window.syncConfig.engineerName || (typeof appSettings !== 'undefined' ? appSettings.engineerName : '');

    if (window.syncConfig.enabled) {
        container.innerHTML = `
            <div class="p-4 bg-green-50 border-b border-green-100 text-center">
                <div class="text-[12px] font-black text-green-700 uppercase mb-1">Синхронизация активна</div>
                <div class="text-[10px] text-green-600 font-bold">Инженер: ${window.syncConfig.engineerName}</div>
                <div class="text-[10px] text-green-600 font-bold">Код: ${window.syncConfig.projectCode}</div>
            </div>
            <div class="p-3 bg-white border-b border-slate-200 flex justify-between items-center">
                <div>
                    <div class="font-bold text-[11px] uppercase text-slate-700 cursor-pointer" ondblclick="window.resetFullAccess()">Режим: ${window.syncConfig.syncMode === 'full' ? 'Вся команда' : 'Только мои'}</div>
                </div>
                <select id="sync-mode-select" class="input-base !w-auto !py-1.5 !text-[10px] font-bold" onchange="window.changeSyncMode(this.value)">
                    <option value="personal" ${window.syncConfig.syncMode === 'personal' ? 'selected' : ''}>Только мои</option>
                    <option value="full" ${window.syncConfig.syncMode === 'full' ? 'selected' : ''}>Вся команда</option>
                </select>
            </div>
            <div class="p-4 bg-slate-50">
                <button onclick="window.triggerSync('manual')" class="w-full bg-white text-indigo-600 border border-slate-200 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 mb-2 flex items-center justify-center gap-2">🔄 Синхронизировать сейчас</button>
                <button onclick="window.disconnectSync()" class="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95">Отключить облако</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="p-4 border-b border-slate-200">
                <div class="space-y-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Имя (Фамилия И.О.) *</label>
                        <input type="text" id="sync-name" class="input-base" value="${engName}" ${engName ? 'readonly' : ''}>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Код проекта *</label>
                        <input type="text" id="sync-code" class="input-base" placeholder="Например: RBI-TOWER-1">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">ПИН-код (Опционально)</label>
                        <input type="password" id="sync-pin" class="input-base" placeholder="4 цифры" maxlength="4" inputmode="numeric">
                    </div>
                </div>
            </div>
            <div class="p-4 bg-slate-50">
                <button onclick="window.saveSyncSettings()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">Подключиться</button>
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

window.applySyncConnect = function(name, code, hashedPin) {
    window.syncConfig.enabled = true;
    window.syncConfig.engineerName = name;
    window.syncConfig.projectCode = code;
    window.syncConfig.pinHash = hashedPin;
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    
    if (typeof appSettings !== 'undefined') {
        appSettings.engineerName = name;
        if (typeof dbPut === 'function') dbPut('app_settings', { key: 'user_prefs', ...appSettings });
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
    window.triggerSync('manual'); 
};

window.verifyFullAccessPin = async function() {
    const input = document.getElementById('sync-full-access-pin').value;
    const inputHash = await window.hashPin(input);
    if (inputHash === SYNC_FULL_ACCESS_HASH) {
        document.getElementById('sync-full-access-modal').remove();
        window.syncConfig.fullAccessGranted = true;
        window.changeSyncMode('full');
    } else safeToast("❌ Неверный пароль!");
};

window.resetFullAccess = function() {
    window.syncConfig.fullAccessGranted = false;
    window.syncConfig.syncMode = 'personal';
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
};

// ============================================================================
// ГЛАВНЫЙ БЛОК СИНХРОНИЗАЦИИ (ИСПРАВЛЕНО СОХРАНЕНИЕ ОБЪЕКТОВ)
// ==========================================
window.triggerSync = async function(mode = 'silent') {
    if (!window.isSyncEnabled() || !window.supabaseClient) return;
    
    if (window.isSyncing) {
        if (mode === 'manual') safeToast("⏳ Синхронизация уже идет...");
        return;
    }
    
    window.isSyncing = true;
    window.renderSyncUI(); 

    // Предохранитель 30 секунд
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        window.isSyncing = false;
        window.renderSyncUI();
        console.log("[Sync] Timeout. Снята блокировка.");
    }, 30000);
    
    try {
        const pCode = window.syncConfig.projectCode;
        const iName = window.syncConfig.engineerName;

        // ЭТАП 1: СКАЧИВАЕМ ДАННЫЕ (PULL)
        if (mode === 'manual') safeToast('📥 Шаг 1: Скачивание базы с сервера...');
        
        // Убрали ограничение по дате, чтобы гарантированно стянуть всё
        let query = window.supabaseClient.from('rbi_inspections').select('*').eq('project_code', pCode);
        if (window.syncConfig.syncMode === 'personal') query = query.eq('inspector_name', iName);
        
        const { data: newInspections } = await query;
        const { data: newProfiles } = await window.supabaseClient.from('rbi_engineer_profiles').select('*').eq('project_code', pCode);
        
        let newTasks = [], newEtalons = [];
        try {
            const resT = await window.supabaseClient.from('rbi_tasks').select('*').eq('project_code', pCode);
            if (resT.data) newTasks = resT.data;
            const resE = await window.supabaseClient.from('rbi_etalon_acts').select('*').eq('project_code', pCode);
            if (resE.data) newEtalons = resE.data;
        } catch (dbErr) {}

        // ЭТАП 2: СЛИЯНИЕ ДАННЫХ В ПАМЯТЬ
        if (mode === 'manual') safeToast('🔄 Шаг 2: Обновление интерфейса...');
        await window.mergeCloudData(newInspections, newProfiles, newTasks, newEtalons);

        // ЭТАП 3: ОТПРАВКА ДАННЫХ НА СЕРВЕР (PUSH)
        let currentHistory = typeof contractorArray !== 'undefined' ? contractorArray : [];
        if (window.syncConfig.syncMode === 'personal') {
            currentHistory = currentHistory.filter(i => i.inspectorName === iName);
        }

        if (currentHistory.length > 0) {
            if (mode === 'manual') safeToast(`📤 Шаг 3: Отправка текстов (${currentHistory.length} шт)...`);
            
            const insps = currentHistory.map(c => ({
                id: c.id, 
                project_code: pCode, 
                inspector_name: c.inspectorName, 
                contractor_name: c.contractorName,
                template_key: c.templateKey, 
                location: c.location, 
                date: c.date,
                inspection_data: {
                    // ИСПРАВЛЕНИЕ: ЖЕСТКО СОХРАНЯЕМ ИМЯ ОБЪЕКТА (ЖК ...) И МЕТРИКИ
                    projectName: c.projectName,
                    templateTitle: c.templateTitle, 
                    section: c.section, 
                    floor: c.floor, 
                    room: c.room,
                    instanceId: c.instanceId, 
                    stageId: c.stageId, 
                    stageName: c.stageName,
                    checkedStagesInfo: c.checkedStagesInfo, 
                    isCompleted: c.isCompleted,
                    state: c.state, 
                    details: c.details, 
                    metrics: c.metrics
                },
                photos: c.photos, 
                _deleted: c._deleted || false, 
                _deleted_at: c._deletedAt || null, 
                updated_at: new Date().toISOString()
            }));
            
            for (let i = 0; i < insps.length; i += 100) {
                await window.supabaseClient.from('rbi_inspections').upsert(insps.slice(i, i + 100), { onConflict: 'id' });
            }
        }

        // Отправка профиля и черновика (Для передачи между телефоном и ПК)
        const currentSession = (typeof dbGet !== 'undefined') ? (await dbGet('app_state', 'current_session') || {}) : {};
        await window.supabaseClient.from('rbi_engineer_profiles').upsert({
            inspector_id: window.syncConfig.deviceId, inspector_name: iName, project_code: pCode, pin_hash: window.syncConfig.pinHash,
            profile_data: {
                timestamp: Date.now(), session: currentSession, 
                gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [],
                plan: typeof weeklyPlanData !== 'undefined' ? weeklyPlanData : null, 
                absence: typeof engineerAbsence !== 'undefined' ? engineerAbsence : null,
                statuses: typeof contractorStatuses !== 'undefined' ? contractorStatuses : {}, 
                expertConclusions: typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {},
                settings: typeof appSettings !== 'undefined' ? appSettings : {}
            }, 
            updated_at: new Date().toISOString()
        }, { onConflict: 'inspector_id' });


        if (mode === 'manual') safeToast('✅ Готово! Синхронизация завершена!');
        
        // Обновляем интерфейс
        if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
        if (typeof renderSelector === 'function') renderSelector();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();

    } catch (e) {
        console.error("[Sync] Ошибка:", e);
        if (mode === 'manual') safeToast('❌ Ошибка: ' + (e.message ? e.message.substring(0, 50) : 'Сбой сети'));
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