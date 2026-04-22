/* Файл: js/sync.js (Финальная боевая версия) */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '' };
window.isSyncing = false;

// Безопасное чтение памяти
try {
    let saved = localStorage.getItem('rbi_sync_config');
    if (saved) window.syncConfig = JSON.parse(saved);
} catch(e) { console.error("Ошибка чтения конфига:", e); }

if (!window.syncConfig.deviceId) {
    window.syncConfig.deviceId = 'dev_' + Date.now().toString(36);
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
}

// Вспомогательная функция для уведомлений (чтобы не падало, если не загрузился app.js)
function safeToast(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log(msg);
}

// Хэширование PIN-кода (SHA-256)
window.hashPin = async function(pin) {
    if (!pin) return null;
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 1. ИНИЦИАЛИЗАЦИЯ
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
        setInterval(() => window.triggerSync('silent'), 120000); // Автосинхронизация каждые 2 мин
    }
};

window.isSyncEnabled = function() {
    return window.syncConfig.enabled;
};

// 2. ОТРИСОВКА ИНТЕРФЕЙСА
window.renderSyncUI = function() {
    const container = document.getElementById('sync-settings-block');
    if (!container) return;

    const headerIndicator = document.getElementById('header-sync-status');
    if (headerIndicator) {
        if (window.syncConfig.enabled) {
            headerIndicator.innerHTML = `<span class="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-indigo-200"><span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Cloud</span>`;
        } else {
            headerIndicator.innerHTML = `<span class="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-slate-200"><span class="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Локально</span>`;
        }
    }

    let engName = window.syncConfig.engineerName || '';
    if (!engName && typeof appSettings !== 'undefined' && appSettings.engineerName) engName = appSettings.engineerName;

    if (window.syncConfig.enabled) {
        container.innerHTML = `
            <div class="p-4 bg-green-50 dark:bg-green-900/20 border-b border-[var(--card-border)] text-center">
                <div class="text-[12px] font-black text-green-700 dark:text-green-400 uppercase mb-1">Синхронизация активна</div>
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Инженер: ${window.syncConfig.engineerName} ${window.syncConfig.pinHash ? '🔒' : ''}</div>
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Код проекта: ${window.syncConfig.projectCode}</div>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.triggerSync('full')" class="w-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform mb-2 flex items-center justify-center gap-2">🔄 Синхронизировать сейчас</button>
                <button onclick="window.disconnectSync()" class="w-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform">Отключить облако</button>
            </div>
        `;
        const inspInput = document.getElementById('inp-inspector');
        if (inspInput && !inspInput.value) inspInput.value = window.syncConfig.engineerName;
    } else {
        container.innerHTML = `
            <div class="p-4 border-b border-[var(--card-border)]">
                <div class="text-[10px] text-[var(--text-muted)] mb-3 leading-relaxed font-medium">Для работы в команде введите свои данные. Без подключения приложение работает локально.</div>
                <div class="space-y-3">
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Ваше Имя (Фамилия И.О.) *</label>
                        <input type="text" id="sync-name" class="input-base" placeholder="Иванов И.И." value="${engName}">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Код проекта команды *</label>
                        <input type="text" id="sync-code" class="input-base" placeholder="Например: RBI-TOWER-1">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">ПИН-код (Опционально)</label>
                        <input type="password" id="sync-pin" class="input-base" placeholder="4 цифры" maxlength="4" inputmode="numeric">
                        <div class="text-[8px] text-slate-400 mt-1">Защитит ваши личные черновики от других устройств</div>
                    </div>
                </div>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.saveSyncSettings()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform">Сохранить и подключиться</button>
            </div>
        `;
    }
};

// 3. СОХРАНЕНИЕ И АВТОРИЗАЦИЯ (СТРОГИЙ РЕЖИМ)
window.saveSyncSettings = async function() {
    const name = document.getElementById('sync-name').value.trim();
    const code = document.getElementById('sync-code').value.trim();
    const pin = document.getElementById('sync-pin').value.trim();

    if (!name || !code) return safeToast("⚠️ Имя и Код проекта обязательны!");
    if (pin && (pin.length !== 4 || isNaN(pin))) return safeToast("⚠️ ПИН-код должен содержать ровно 4 цифры!");

    if (!window.supabaseClient) {
        alert("❌ Ошибка: Ключи базы данных не настроены! Внесите настройки Supabase в файл js/config.js");
        return;
    }

    // --- НОВАЯ ПРОВЕРКА: СУЩЕСТВУЕТ ЛИ ПРОЕКТ В БАЗЕ? ---
    const { data: projData, error: projErr } = await window.supabaseClient
        .from('allowed_projects')
        .select('code')
        .eq('code', code)
        .limit(1);

    if (!projData || projData.length === 0) {
        safeToast("❌ Ошибка: Такого кода проекта не существует!");
        return;
    }
    // -----------------------------------------------------

    const hashedPin = await window.hashPin(pin);

    // Проверяем на сервере, есть ли такой юзер и совпадает ли ПИН
    const { data, error } = await window.supabaseClient.from('app_sync_state')
        .select('pin_hash')
        .eq('project_code', code)
        .eq('engineer_name', name)
        .limit(1);
        
    if (data && data.length > 0 && data[0].pin_hash && data[0].pin_hash !== hashedPin) {
        window.showPinPromptModal(name, code, data[0].pin_hash);
        return;
    }

    window.applySyncConnect(name, code, hashedPin);
};

window.showPinPromptModal = function(name, code, correctHash) {
    const html = `
    <div id="sync-pin-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-[var(--card-bg)] w-full max-w-xs p-6 rounded-2xl shadow-2xl">
            <div class="text-center mb-4">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">🔒</div>
                <h3 class="font-black text-[13px] uppercase text-slate-800 dark:text-white">Введите PIN-код</h3>
                <p class="text-[10px] text-slate-500 mt-1">Профиль ${name} защищен. Введите ПИН для доступа к облаку.</p>
            </div>
            <input type="password" id="sync-pin-verify" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center text-xl font-black tracking-widest outline-none mb-4" placeholder="••••" maxlength="4" inputmode="numeric">
            <div class="flex gap-2">
                <button onclick="document.getElementById('sync-pin-modal').remove()" class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-[10px] uppercase">Отмена</button>
                <button onclick="window.verifySyncPin('${name}', '${code}', '${correctHash}')" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-md">Войти</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('sync-pin-verify').focus();
};

window.verifySyncPin = async function(name, code, correctHash) {
    const input = document.getElementById('sync-pin-verify').value;
    const inputHash = await window.hashPin(input);
    if (inputHash === correctHash) {
        document.getElementById('sync-pin-modal').remove();
        window.applySyncConnect(name, code, inputHash);
    } else {
        safeToast("❌ Неверный PIN-код!");
    }
};

window.applySyncConnect = function(name, code, hashedPin) {
    window.syncConfig.enabled = true;
    window.syncConfig.engineerName = name;
    window.syncConfig.projectCode = code;
    window.syncConfig.pinHash = hashedPin;
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    
    if (typeof appSettings !== 'undefined') {
        appSettings.engineerName = name;
        if (typeof dbPut === 'function' && typeof STORES !== 'undefined') {
            dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
        }
    }

    window.renderSyncUI();
    safeToast("✅ Успешно подключено к Облаку!");
    window.triggerSync('full');
};

window.disconnectSync = function() {
    if (!confirm("Отключить облако? Ваши данные останутся на устройстве, но не будут отправляться коллегам.")) return;
    window.syncConfig.enabled = false;
    window.syncConfig.projectCode = '';
    window.syncConfig.pinHash = '';
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
    safeToast("Отключено. Локальный режим.");
};

// 4. ВЫГРУЗКА ФОТО В SUPABASE BUCKET
window.uploadBase64ToStorage = async function(base64str, path) {
    if (!base64str.startsWith('data:image')) return base64str; 
    try {
        const res = await fetch(base64str);
        const blob = await res.blob();
        const { data, error } = await window.supabaseClient.storage.from('inspection-photos').upload(path, blob, { upsert: true });
        if (error) throw error;
        const { data: publicUrlData } = window.supabaseClient.storage.from('inspection-photos').getPublicUrl(path);
        return publicUrlData.publicUrl;
    } catch(e) {
        console.error("Ошибка загрузки фото:", e);
        return base64str; // при ошибке оставляем base64 как есть, чтобы не потерять фото
    }
};

window.extractAndUploadPhotos = async function() {
    if (typeof photos !== 'undefined') {
        for (let id in photos) {
            if (photos[id].startsWith('data:image')) {
                photos[id] = await window.uploadBase64ToStorage(photos[id], `sessions/${window.syncConfig.deviceId}_${id}.jpg`);
            }
        }
    }
    if (typeof contractorArray !== 'undefined') {
        for (let i = 0; i < contractorArray.length; i++) {
            let check = contractorArray[i];
            let changed = false;
            if (check.photos) {
                for (let id in check.photos) {
                    if (check.photos[id] && check.photos[id].startsWith('data:image')) {
                        check.photos[id] = await window.uploadBase64ToStorage(check.photos[id], `history/${check.id}_${id}.jpg`);
                        changed = true;
                    }
                }
            }
            if (changed && typeof dbPut !== 'undefined') await dbPut(STORES.HISTORY, check);
        }
    }
};

// 5. ГЛАВНЫЙ МЕХАНИЗМ СИНХРОНИЗАЦИИ (Отправка и Прием)
window.triggerSync = async function(mode = 'full') {
    if (!window.isSyncEnabled() || window.isSyncing || !window.supabaseClient) return;
    
    window.isSyncing = true;
    if (mode === 'full') safeToast('🔄 Синхронизация с облаком...');
    
    try {
        // Выгружаем тяжелые фотки в бакет перед отправкой JSON
        await window.extractAndUploadPhotos();

        // Собираем всё текущее состояние устройства
        const localStateData = {
            timestamp: new Date().getTime(),
            shared: {
                history: typeof contractorArray !== 'undefined' ? contractorArray : [],
                templates: typeof userTemplates !== 'undefined' ? userTemplates : {},
                twi: typeof customTwiCards !== 'undefined' ? customTwiCards : [],
                docs: typeof customDocs !== 'undefined' ? customDocs : [],
                gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [],
                statuses: typeof contractorStatuses !== 'undefined' ? contractorStatuses : {}
            },
            personal: {
                session: { 
                    templateKey: typeof currentTemplateKey !== 'undefined' ? currentTemplateKey : '', 
                    state: typeof state !== 'undefined' ? state : {}, 
                    details: typeof details !== 'undefined' ? details : {}, 
                    photos: typeof photos !== 'undefined' ? photos : {}, 
                    expert: typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {} 
                },
                settings: typeof appSettings !== 'undefined' ? appSettings : {},
                plan: typeof weeklyPlanData !== 'undefined' ? weeklyPlanData : null,
                absence: typeof engineerAbsence !== 'undefined' ? engineerAbsence : null
            }
        };

        // Отправляем на сервер
        await window.supabaseClient.from('app_sync_state').upsert({
            project_code: window.syncConfig.projectCode,
            engineer_name: window.syncConfig.engineerName,
            device_id: window.syncConfig.deviceId,
            state_data: localStateData,
            pin_hash: window.syncConfig.pinHash,
            updated_at: new Date().toISOString()
        }, { onConflict: 'project_code, engineer_name, device_id' });

        // Скачиваем данные всех остальных устройств на этом проекте
        const { data: teamData, error } = await window.supabaseClient.from('app_sync_state').select('*').eq('project_code', window.syncConfig.projectCode);
        if (error) throw error;

        // Склеиваем локальные и облачные данные
        await window.mergeCloudData(teamData);

        if (mode === 'full') safeToast('✅ Данные успешно синхронизированы!');
        
        // Обновляем UI после слияния
        if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
        if (typeof renderSelector === 'function') renderSelector();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();
        
    } catch (e) {
        console.error("Ошибка синхронизации:", e);
        if (mode === 'full') safeToast('❌ Ошибка синхронизации. Проверьте интернет.');
    } finally {
        window.isSyncing = false;
    }
};

// 6. УМНОЕ СЛИЯНИЕ ДАННЫХ
window.mergeCloudData = async function(teamData) {
    // Карты для слияния по ID (чтобы исключить дубликаты)
    let historyMap = new Map();
    if (typeof contractorArray !== 'undefined') contractorArray.forEach(c => historyMap.set(c.id, c));

    let templatesMerged = typeof userTemplates !== 'undefined' ? { ...userTemplates } : {};
    let twiMerged = new Map(typeof customTwiCards !== 'undefined' ? customTwiCards.map(c => [c.id, c]) : []);
    let docsMerged = new Map(typeof customDocs !== 'undefined' ? customDocs.map(c => [c.id, c]) : []);
    let logsMerged = new Map(typeof gameActionLogs !== 'undefined' ? gameActionLogs.map(l => [l.id, l]) : []);
    let statusesMerged = typeof contractorStatuses !== 'undefined' ? { ...contractorStatuses } : {};

    let latestPersonalSessionTime = 0;
    let personalDataToRestore = null;

    teamData.forEach(row => {
        const cloudData = row.state_data;
        if (!cloudData) return;

        // 1. Сливаем ОБЩИЕ данные (Всех инженеров проекта)
        if (cloudData.shared) {
            (cloudData.shared.history || []).forEach(h => { if (!historyMap.has(h.id)) historyMap.set(h.id, h); });
            Object.assign(templatesMerged, cloudData.shared.templates || {});
            (cloudData.shared.twi || []).forEach(t => twiMerged.set(t.id, t));
            (cloudData.shared.docs || []).forEach(d => docsMerged.set(d.id, d));
            (cloudData.shared.gameLogs || []).forEach(l => logsMerged.set(l.id, l));
            Object.assign(statusesMerged, cloudData.shared.statuses || {});
        }

        // 2. Ищем ПЕРСОНАЛЬНЫЕ данные (С других устройств ТЕКУЩЕГО инженера)
        if (row.engineer_name === window.syncConfig.engineerName && row.device_id !== window.syncConfig.deviceId) {
            // Защита: если там стоит ПИН, а у нас он не введен (или неверный), пропускаем его личные данные
            if (row.pin_hash && row.pin_hash !== window.syncConfig.pinHash) return; 
            
            // Берем самую последнюю по времени сессию
            if (cloudData.timestamp > latestPersonalSessionTime) {
                latestPersonalSessionTime = cloudData.timestamp;
                personalDataToRestore = cloudData.personal;
            }
        }
    });

    // Возвращаем склеенные массивы в глобальные переменные приложения
    if (typeof contractorArray !== 'undefined') contractorArray = Array.from(historyMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (typeof userTemplates !== 'undefined') userTemplates = templatesMerged;
    if (typeof customTwiCards !== 'undefined') customTwiCards = Array.from(twiMerged.values());
    if (typeof customDocs !== 'undefined') customDocs = Array.from(docsMerged.values());
    if (typeof gameActionLogs !== 'undefined') gameActionLogs = Array.from(logsMerged.values());
    if (typeof contractorStatuses !== 'undefined') contractorStatuses = statusesMerged;

    // Сохраняем в локальную базу данных IndexedDB
    if (typeof dbPut !== 'undefined' && typeof STORES !== 'undefined') {
        await dbPut(STORES.HISTORY, contractorArray);
        await dbPut(STORES.SETTINGS, { key: 'custom_twi_cards', data: customTwiCards });
        await dbPut(STORES.SETTINGS, { key: 'custom_docs', data: customDocs });
        await dbPut(STORES.SETTINGS, { key: 'game_action_logs', data: gameActionLogs });
        await dbPut(STORES.SETTINGS, { key: 'contractor_statuses', data: contractorStatuses });
    }

    // Если нашли свежую персональную сессию с другого устройства — восстанавливаем её
    if (personalDataToRestore && typeof state !== 'undefined') {
        // Мы применяем чужую сессию только если у нас прямо сейчас акт пустой (чтобы не стереть то, что юзер пишет прямо сейчас)
        const isSafeToRestoreSession = Object.keys(state).length === 0;

        if (personalDataToRestore.settings && typeof appSettings !== 'undefined') {
            appSettings = { ...appSettings, ...personalDataToRestore.settings };
            if (typeof dbPut !== 'undefined') await dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
            if (typeof applySettingsToUI === 'function') applySettingsToUI();
        }
        
        if (personalDataToRestore.plan && typeof weeklyPlanData !== 'undefined') {
            weeklyPlanData = personalDataToRestore.plan;
            if (typeof dbPut !== 'undefined') await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
        }
        
        if (personalDataToRestore.absence && typeof engineerAbsence !== 'undefined') {
            engineerAbsence = personalDataToRestore.absence;
            if (typeof dbPut !== 'undefined') await dbPut(STORES.SETTINGS, { key: 'engineer_absence', data: engineerAbsence });
        }

        if (isSafeToRestoreSession && personalDataToRestore.session) {
            currentTemplateKey = personalDataToRestore.session.templateKey || '';
            state = personalDataToRestore.session.state || {};
            details = personalDataToRestore.session.details || {};
            photos = personalDataToRestore.session.photos || {};
            customExpertConclusions = personalDataToRestore.session.expert || {};
            
            if (currentTemplateKey) {
                const type = currentTemplateKey.split('_')[0];
                const key = currentTemplateKey.replace(type + '_', '');
                currentChecklist = type === 'sys' ? SYSTEM_TEMPLATES[key].groups : userTemplates[key].groups;
                if (typeof render === 'function') render();
            }
        }
    }
};