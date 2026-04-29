/* Файл: js/sync.js (Финальная боевая версия) */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '', syncMode: 'personal', fullAccessGranted: false };
window.isSyncing = false;

// Пароль для доступа ко всем проверкам команды 
const SYNC_FULL_ACCESS_HASH = "16e1fc3fccf0e21ea5c3a37fc6bdfe2db9ee3646ca153ff29ccfbbe868e7ec8b";

// Безопасное чтение памяти
try {
    let saved = localStorage.getItem('rbi_sync_config');
    if (saved) window.syncConfig = JSON.parse(saved);
} catch(e) { console.error("Ошибка чтения конфига:", e); }

if (!window.syncConfig.deviceId) {
    window.syncConfig.deviceId = 'dev_' + Date.now().toString(36);
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
}

// Вспомогательная функция для уведомлений
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

// 2. ОТРИСОВКА ИНТЕРФЕЙСА И ИНДИКАТОР-ОБЛАЧКО
window.renderSyncUI = function() {
    const container = document.getElementById('sync-settings-block');
    const headerIndicator = document.getElementById('header-sync-status');
    
    if (headerIndicator) {
        if (window.syncConfig.enabled) {
            if (window.isSyncing) {
                // Зеленое мигающее (идет загрузка)
                headerIndicator.innerHTML = `<div title="Синхронизация..." class="text-green-500 animate-pulse flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg></div>`;
            } else {
                // Зеленое статичное (онлайн, ждет)
                headerIndicator.innerHTML = `<div title="Облако подключено" class="text-green-500 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg></div>`;
            }
        } else {
            // Серое статичное (офлайн)
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
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Инженер: ${window.syncConfig.engineerName} ${window.syncConfig.pinHash ? '🔒' : ''}</div>
                <div class="text-[10px] text-green-600 dark:text-green-500 font-bold">Код проекта: ${window.syncConfig.projectCode}</div>
            </div>
            <div class="p-3 bg-white dark:bg-slate-800 border-b border-[var(--card-border)] flex justify-between items-center">
                <div>
                    <div class="font-bold text-[11px] uppercase text-slate-700 dark:text-slate-300 cursor-pointer" ondblclick="window.resetFullAccess()">Режим: ${window.syncConfig.syncMode === 'full' ? 'Вся команда' : 'Только мои'}</div>
                    <div class="text-[9px] text-slate-500">Какие проверки скачивать (Двойной клик для сброса)</div>
                </div>
                <select id="sync-mode-select" class="input-base !w-auto !py-1.5 !text-[10px] font-bold" onchange="window.changeSyncMode(this.value)">
                    <option value="personal" ${window.syncConfig.syncMode === 'personal' ? 'selected' : ''}>Только мои</option>
                    <option value="full" ${window.syncConfig.syncMode === 'full' ? 'selected' : ''}>Вся команда</option>
                </select>
            </div>
            <div class="p-4 bg-[var(--hover-bg)]">
                <button onclick="window.isSyncing = false; window.triggerSync('manual')" class="w-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform mb-2 flex items-center justify-center gap-2">🔄 Синхронизировать сейчас</button>
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
                        ${engName ? '<div class="text-[8px] text-indigo-500 mt-1 font-bold">Имя подтянуто из вашего Профиля.</div>' : '<div class="text-[8px] text-orange-500 mt-1 font-bold">Заполните имя во вкладке Инженер -> Профиль.</div>'}
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

// 3. СОХРАНЕНИЕ И АВТОРИЗАЦИЯ
// 3. СОХРАНЕНИЕ И АВТОРИЗАЦИЯ
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

    const { data: projData } = await window.supabaseClient.from('allowed_projects').select('code').eq('code', code).limit(1);

    if (!projData || projData.length === 0) {
        safeToast("❌ Ошибка: Такого кода проекта не существует!");
        return;
    }

    const hashedPin = await window.hashPin(pin);

    // ИСПРАВЛЕНИЕ: Ищем ПИН-код в новой таблице профилей
    const { data } = await window.supabaseClient.from('rbi_engineer_profiles')
        .select('pin_hash').eq('project_code', code).eq('inspector_name', name).limit(1);
        
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
                <p class="text-[10px] text-slate-500 mt-1">Профиль ${name} защищен. Введите ПИН для доступа.</p>
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
        if (typeof applySmartLocks === 'function') {
            applySmartLocks(); // Обновляем блокировку
        }
    }

    window.renderSyncUI();
    safeToast("✅ Подключено к Облаку!");
    window.triggerSync('manual'); // Первый запуск - ручной (с уведомлениями)
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

// 4. НАДЕЖНАЯ ВЫГРУЗКА ФОТО В SUPABASE BUCKET
function b64toBlob(b64Data, contentType = 'image/jpeg', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}

window.uploadBase64ToStorage = async function(base64str, path) {
    if (!base64str || !base64str.startsWith('data:image')) return base64str; 
    // ИСПРАВЛЕНИЕ: Если это текстовый SVG из демо-режима (в нем нет 'base64,'), мы его просто пропускаем
    if (!base64str.includes('base64,')) return base64str;
    
    try {
        console.log(`[Sync] Выгрузка файла: ${path}`);
        const parts = base64str.split(';');
        const mime = parts[0].split(':')[1];
        const b64Data = parts[1].split(',')[1];
        
        const blob = b64toBlob(b64Data, mime);

        const { data, error } = await window.supabaseClient.storage
            .from('inspection-photos')
            .upload(path, blob, { upsert: true, contentType: mime });

        if (error) throw error;

        const { data: publicUrlData } = window.supabaseClient.storage.from('inspection-photos').getPublicUrl(path);
        return publicUrlData.publicUrl;

    } catch(e) {
        console.error("[Sync] Ошибка загрузки фото (fallback to base64):", e);
        return base64str; 
    }
};

// ЖЕСТКО СИНХРОННАЯ ФУНКЦИЯ ОБРАБОТКИ ФОТО
window.extractAndUploadPhotos = async function() {
    console.log("[Sync] Запуск выгрузки фото...");
    let dbUpdated = false;

    // 1. Проверяем текущий активный черновик (теперь умеет выгружать local://)
    if (typeof photos !== 'undefined' && photos !== null) {
        const keys = Object.keys(photos);
        for (let id of keys) {
            let localUrl = photos[id];
            if (localUrl && localUrl.startsWith('data:image')) {
                photos[id] = await window.uploadBase64ToStorage(localUrl, `sessions/${window.syncConfig.deviceId}_${id}.jpg`);
                dbUpdated = true;
            } else if (localUrl && localUrl.startsWith('local://')) {
                const record = await dbGet(STORES.PHOTOS, localUrl);
                if (record && record.data) {
                    const blob = arrayBufferToBlob(record.data, record.mimeType);
                    const { data, error } = await window.supabaseClient.storage
                        .from('inspection-photos')
                        .upload(`sessions/${window.syncConfig.deviceId}_${id}.webp`, blob, { upsert: true, contentType: record.mimeType });
                    if (!error) {
                        const { data: urlData } = window.supabaseClient.storage.from('inspection-photos').getPublicUrl(`sessions/${window.syncConfig.deviceId}_${id}.webp`);
                        const cloudUrl = urlData.publicUrl;
                        await PhotoManager.linkCloudToLocal(localUrl, cloudUrl);
                        photos[id] = cloudUrl;
                        dbUpdated = true;
                    }
                }
            }
        }
    }

    // 1.5. Проверяем Акты-Эталоны
    if (typeof etalonActsArray !== 'undefined' && Array.isArray(etalonActsArray)) {
        for (let i = 0; i < etalonActsArray.length; i++) {
            let check = etalonActsArray[i];
            let changed = false;
            
            if (check.details && check.details.elements) {
                for (let el of check.details.elements) {
                    let localUrl = el.photo;
                    if (localUrl && localUrl.startsWith('local://')) {
                        const record = await dbGet(STORES.PHOTOS, localUrl);
                        if (record && record.data) {
                            const blob = arrayBufferToBlob(record.data, record.mimeType);
                            const { data, error } = await window.supabaseClient.storage
                                .from('inspection-photos')
                                .upload(`etalons/${check.id}_${Math.random().toString(36).substring(7)}.webp`, blob, { upsert: true, contentType: record.mimeType });
                            
                            if (!error) {
                                const { data: urlData } = window.supabaseClient.storage.from('inspection-photos').getPublicUrl(`etalons/${check.id}_${Math.random().toString(36).substring(7)}.webp`);
                                const cloudUrl = urlData.publicUrl;
                                await PhotoManager.linkCloudToLocal(localUrl, cloudUrl);
                                el.photo = cloudUrl;
                                changed = true; dbUpdated = true;
                            }
                        }
                    }
                }
            }
            if (changed && typeof dbPut !== 'undefined' && typeof STORES !== 'undefined') {
                await dbPut(STORES.ETALON_ACTS, check);
            }
        }
    }
    // 1.6. Проверяем фото внутри Задач (Воркшопы и т.д.)
    if (typeof rbi_tasksData !== 'undefined' && Array.isArray(rbi_tasksData)) {
        for (let i = 0; i < rbi_tasksData.length; i++) {
            let task = rbi_tasksData[i];
            if (task.completionPhoto && task.completionPhoto.startsWith('local://')) {
                const record = await dbGet(STORES.PHOTOS, task.completionPhoto);
                if (record && record.data) {
                    const blob = arrayBufferToBlob(record.data, record.mimeType);
                    const { data, error } = await window.supabaseClient.storage
                        .from('inspection-photos')
                        .upload(`tasks/${task.id}_completion.webp`, blob, { upsert: true, contentType: record.mimeType });
                    
                    if (!error) {
                        const { data: urlData } = window.supabaseClient.storage.from('inspection-photos').getPublicUrl(`tasks/${task.id}_completion.webp`);
                        const cloudUrl = urlData.publicUrl;
                        await PhotoManager.linkCloudToLocal(task.completionPhoto, cloudUrl);
                        task.completionPhoto = cloudUrl;
                        task.updatedAt = new Date().toISOString();
                        dbUpdated = true;
                        
                        if (typeof dbPut !== 'undefined' && typeof STORES !== 'undefined') {
                            await dbPut(STORES.TASKS, task);
                        }
                    }
                }
            }
        }
    }
    // 2. Проверяем Архив проверок (без изменений, просто оставляем как было)
    if (typeof contractorArray !== 'undefined' && Array.isArray(contractorArray)) {
        for (let i = 0; i < contractorArray.length; i++) {
            let check = contractorArray[i];
            let changed = false;
            
            if (check.photos) {
                const pKeys = Object.keys(check.photos);
                for (let id of pKeys) {
                    let localUrl = check.photos[id];
                    // Если находим локальную ссылку - значит фото еще не в облаке
                    if (localUrl && localUrl.startsWith('local://')) {
                        // Достаем бинарник из БД
                        const record = await dbGet(STORES.PHOTOS, localUrl);
                        if (record && record.data) {
                            const blob = arrayBufferToBlob(record.data, record.mimeType);
                            const { data, error } = await window.supabaseClient.storage
                                .from('inspection-photos')
                                .upload(`history/${check.id}_${id}.webp`, blob, { upsert: true, contentType: record.mimeType });
                            
                            if (!error) {
                                const { data: urlData } = window.supabaseClient.storage.from('inspection-photos').getPublicUrl(`history/${check.id}_${id}.webp`);
                                const cloudUrl = urlData.publicUrl;
                                
                                // САМОЕ ВАЖНОЕ: Привязываем облачную ссылку к локальному бинарнику
                                await PhotoManager.linkCloudToLocal(localUrl, cloudUrl);
                                
                                check.photos[id] = cloudUrl;
                                changed = true; dbUpdated = true;
                            }
                        }
                    }
                }
            }
            if (changed && typeof dbPut !== 'undefined' && typeof STORES !== 'undefined') {
                await dbPut(STORES.HISTORY, check);
            }
        }
    }

    // 3. Проверяем TWI Карты (Они тоже могут пухнуть от Base64!)
    if (typeof customTwiCards !== 'undefined' && Array.isArray(customTwiCards)) {
        for (let i = 0; i < customTwiCards.length; i++) {
            let twi = customTwiCards[i];
            let changed = false;

            if (twi.photoGood && twi.photoGood.startsWith('data:image')) {
                twi.photoGood = await window.uploadBase64ToStorage(twi.photoGood, `twi/${twi.id}_good.jpg`);
                changed = true; dbUpdated = true;
            }
            if (twi.photoBad && twi.photoBad.startsWith('data:image')) {
                twi.photoBad = await window.uploadBase64ToStorage(twi.photoBad, `twi/${twi.id}_bad.jpg`);
                changed = true; dbUpdated = true;
            }
            if (twi.pdfData && twi.pdfData.startsWith('data:application/pdf')) {
                // НОВОЕ: Загрузка PDF в бакет
                const pdfBlob = b64toBlob(twi.pdfData.split(',')[1], 'application/pdf');
                const { data, error } = await window.supabaseClient.storage.from('twi-pdfs').upload(`${window.syncConfig.projectCode}/${window.syncConfig.deviceId}/${twi.id}.pdf`, pdfBlob, { upsert: true, contentType: 'application/pdf' });
                if (!error) {
                    const { data: urlData } = window.supabaseClient.storage.from('twi-pdfs').getPublicUrl(`${window.syncConfig.projectCode}/${window.syncConfig.deviceId}/${twi.id}.pdf`);
                    twi.pdfData = urlData.publicUrl;
                    changed = true; dbUpdated = true;
                }
            }
            if (twi.steps && Array.isArray(twi.steps)) {
                for (let j = 0; j < twi.steps.length; j++) {
                    let step = twi.steps[j];
                    if (step.photo && step.photo.startsWith('data:image')) {
                        step.photo = await window.uploadBase64ToStorage(step.photo, `twi/${twi.id}_step_${step.order}.jpg`);
                        changed = true; dbUpdated = true;
                    }
                }
            }
            
            if (changed && typeof dbPut !== 'undefined') {
                await dbPut(STORES.SETTINGS, { key: 'custom_twi_cards', data: customTwiCards.filter(c => !String(c.id).startsWith('sys_')) });
            }
        }
    }

    // 4. НОВОЕ: Проверяем Пользовательские Технические узлы (customNodes)
    if (typeof customNodes !== 'undefined' && Array.isArray(customNodes)) {
        for (let i = 0; i < customNodes.length; i++) {
            let node = customNodes[i];
            if (node.img && node.img.startsWith('data:image')) {
                node.img = await window.uploadBase64ToStorage(node.img, `${window.syncConfig.projectCode}/${window.syncConfig.deviceId}/nodes/${node.id}.jpg`);
                dbUpdated = true;
                if (typeof dbPut !== 'undefined') await dbPut(STORES.SETTINGS, { key: 'custom_nodes', data: customNodes });
            }
        }
    }

    if (dbUpdated && typeof saveSessionData === 'function') {
        await saveSessionData();
    }
    console.log("[Sync] Выгрузка фото и ресурсов завершена.");
};

// 5. ГЛАВНЫЙ МЕХАНИЗМ СИНХРОНИЗАЦИИ
window.triggerSync = async function(mode = 'silent') {
    if (!window.isSyncEnabled()) return;
    
    if (!window.supabaseClient) {
        if (mode === 'manual') safeToast('❌ Ошибка: Облако не подключено');
        return;
    }
    
    // Если кнопка зависла - мы ее отпускаем вручную
    if (window.isSyncing) {
        if (mode === 'manual') safeToast("⏳ Синхронизация уже идет... Подождите");
        return;
    }
    
    window.isSyncing = true;
    window.renderSyncUI(); 
    
    try {
        if (mode === 'manual') safeToast('🔄 Шаг 1: Подготовка...');
        console.log(`[Sync] Старт синхронизации (${mode})...`);
        
        // 1. Фотографии
        if (mode === 'manual') safeToast('🔄 Шаг 2: Выгрузка фотографий...');
        try {
            await window.extractAndUploadPhotos();
        } catch (photoErr) {
            console.warn("[Sync] Ошибка при выгрузке фото, идем дальше:", photoErr);
        }

        const pCode = window.syncConfig.projectCode;
        const iName = window.syncConfig.engineerName;

        // 2. Сбор истории
        let currentHistory = typeof contractorArray !== 'undefined' ? contractorArray : [];
        if (window.syncConfig.syncMode === 'personal') {
            currentHistory = currentHistory.filter(i => i.inspectorName === iName);
        }

        console.log(`[Sync] К отправке подготовлено: Проверок (${currentHistory.length})`);

        // 3. Отправка проверок (PUSH)
        if (currentHistory.length > 0) {
            if (mode === 'manual') safeToast(`🔄 Шаг 3: Отправка проверок (${currentHistory.length} шт)...`);
            const inspectionsToPush = currentHistory.map(c => ({
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
            for (let i = 0; i < inspectionsToPush.length; i += 100) {
                const { error } = await window.supabaseClient.from('rbi_inspections').upsert(inspectionsToPush.slice(i, i + 100), { onConflict: 'id' });
                if (error) throw new Error("Сбой в rbi_inspections: " + error.message);
            }
        }

        // 4. Справочники
        if (mode === 'manual') safeToast('🔄 Шаг 4: Отправка справочников...');
        const pushDict = async (table, dataArr, dataField) => {
            if (!dataArr || dataArr.length === 0) return;
            const rows = dataArr.filter(item => !String(item.id).startsWith('sys_')).map(item => ({
                id: String(item.id), project_code: pCode, [dataField]: item, updated_at: new Date().toISOString()
            }));
            if (rows.length > 0) {
                const { error } = await window.supabaseClient.from(table).upsert(rows, { onConflict: 'id' });
                if (error) console.warn(`Сбой в ${table}:`, error.message);
            }
        };
        await pushDict('rbi_custom_twi_cards', typeof customTwiCards !== 'undefined' ? customTwiCards : [], 'card_data');
        await pushDict('rbi_custom_nodes', typeof customNodes !== 'undefined' ? customNodes : [], 'node_data');
        await pushDict('rbi_custom_docs', typeof customDocs !== 'undefined' ? customDocs : [], 'doc_data');

        // 5. Задачи и Эталоны (с мягким перехватом ошибок, если таблиц нет)
        if (mode === 'manual') safeToast('🔄 Шаг 5: Отправка Задач и Эталонов...');
        if (typeof rbi_tasksData !== 'undefined' && rbi_tasksData.length > 0) {
            try {
                const tasksToPush = rbi_tasksData.map(t => ({
                    id: t.id, inspector_id: window.syncConfig.deviceId, inspector_name: iName, project_code: pCode, task_data: t,
                    updated_at: t.updatedAt || new Date().toISOString(), _deleted: t._deleted || false, deleted_at: t._deleted ? new Date().toISOString() : null
                }));
                for (let i = 0; i < tasksToPush.length; i += 100) {
                    const { error } = await window.supabaseClient.from('rbi_tasks').upsert(tasksToPush.slice(i, i + 100), { onConflict: 'id' });
                    if (error) console.warn("Таблица rbi_tasks не настроена", error);
                }
            } catch(e) { console.warn("Пропуск Задач:", e); }
        }

        if (typeof etalonActsArray !== 'undefined' && etalonActsArray.length > 0) {
            try {
                const etalonsToPush = etalonActsArray.map(c => ({
                    id: c.id, inspector_id: window.syncConfig.deviceId, inspector_name: c.inspectorName, contractor_name: c.contractorName,
                    project_code: pCode, template_key: c.templateKey, act_data: c, updated_at: c.updatedAt || new Date().toISOString(),
                    _deleted: c._deleted || false, deleted_at: c._deleted ? new Date().toISOString() : null
                }));
                for (let i = 0; i < etalonsToPush.length; i += 100) {
                    const { error } = await window.supabaseClient.from('rbi_etalon_acts').upsert(etalonsToPush.slice(i, i + 100), { onConflict: 'id' });
                    if (error) console.warn("Таблица rbi_etalon_acts не настроена", error);
                }
            } catch(e) { console.warn("Пропуск Эталонов:", e); }
        }

        // 6. Профиль HR и Черновики
        if (mode === 'manual') safeToast('🔄 Шаг 6: Сохранение профиля...');
        const currentSession = (typeof dbGet !== 'undefined') ? (await dbGet('app_state', 'current_session') || {}) : {};
        const hrProfileData = {
            timestamp: Date.now(), session: currentSession, gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [],
            plan: typeof weeklyPlanData !== 'undefined' ? weeklyPlanData : null, absence: typeof engineerAbsence !== 'undefined' ? engineerAbsence : null,
            statuses: typeof contractorStatuses !== 'undefined' ? contractorStatuses : {}, expertConclusions: typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {},
            settings: typeof appSettings !== 'undefined' ? appSettings : {}, schedule: typeof rbi_scheduleData !== 'undefined' ? rbi_scheduleData : [],
            interventions: typeof rbi_interventionsData !== 'undefined' ? rbi_interventionsData : [], practices: typeof rbi_practicesData !== 'undefined' ? rbi_practicesData : []
        };

        const { error: profileError } = await window.supabaseClient.from('rbi_engineer_profiles').upsert({
            inspector_id: window.syncConfig.deviceId, inspector_name: iName, project_code: pCode, pin_hash: window.syncConfig.pinHash,
            profile_data: hrProfileData, updated_at: new Date().toISOString()
        }, { onConflict: 'inspector_id' });
        if (profileError) throw new Error("Сбой профиля: " + profileError.message);

        // 7. Скачивание (Pull)
        if (mode === 'manual') safeToast('🔄 Шаг 7: Загрузка обновлений...');
        let lastSync = localStorage.getItem('last_cloud_sync_time') || '2000-01-01T00:00:00Z';

        let query = window.supabaseClient.from('rbi_inspections').select('*').eq('project_code', pCode).gt('updated_at', lastSync);
        if (window.syncConfig.syncMode === 'personal') query = query.eq('inspector_name', iName);
        const { data: newInspections, error: errInsp } = await query;
        if (errInsp) throw new Error("Сбой загрузки проверок: " + errInsp.message);

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
        } catch (dbErr) {
            console.warn("[Sync] Пропуск скачивания таблиц задач/эталонов.");
        }

        const { data: ratingData } = await window.supabaseClient.from('rbi_project_ratings').select('rating_data').eq('project_code', pCode).limit(1);
        if (ratingData && ratingData.length > 0) window.serverGlobalRating = ratingData[0].rating_data;

        // 8. Слияние
        if (mode === 'manual') safeToast('🔄 Шаг 8: Слияние баз...');
        await window.mergeCloudData(newInspections, newTwi, newNodes, newDocs, newProfiles, newTasks, newEtalons);

        localStorage.setItem('last_cloud_sync_time', new Date().toISOString());

        if (mode === 'manual') safeToast('✅ Готово! Синхронизация завершена!');
        
        if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
        if (typeof renderSelector === 'function') renderSelector();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();
        if (typeof downloadMissingCloudFiles === 'function') window.downloadMissingCloudFiles();

    } catch (e) {
        console.error("[Sync] Ошибка синхронизации:", e);
        // Выводим ошибку крупно на экран
        if (mode === 'manual') safeToast('❌ Ошибка: ' + e.message.substring(0, 70));
    } finally {
        window.isSyncing = false;
        window.renderSyncUI(); 
    }
};

// 6. УМНОЕ СЛИЯНИЕ ДАННЫХ В ПАМЯТЬ ТЕЛЕФОНА
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
        const myProfile = safeProfiles.find(p => p.inspector_id !== window.syncConfig.deviceId && p.inspector_name === window.syncConfig.engineerName);
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
            
            // ВОССТАНОВЛЕНИЕ ЧЕРНОВИКА (Начал на телефоне -> продолжил на ПК)
            if (data.session && typeof dbPut !== 'undefined' && typeof dbGet !== 'undefined') {
                const localSession = await dbGet('app_state', 'current_session');
                const localTime = localSession ? (localSession.timestamp || 0) : 0;
                const cloudTime = data.session.timestamp || 0;
                
                // Если облачный черновик свежее локального
                if (cloudTime > localTime) {
                    await dbPut('app_state', data.session);
                    // Говорим приложению перезагрузить черновик в интерфейс
                    if (typeof restoreSession === 'function') {
                        setTimeout(() => {
                            restoreSession();
                            console.log("[Sync] Черновик обновлен из облака!");
                        }, 500);
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
                    if (item.photos) {
                        for (let k in item.photos) {
                            if (item.photos[k]) { await dbDelete('app_photos', item.photos[k]); delete PhotoManager.cache[item.photos[k]]; }
                        }
                    }
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



// === ЛОГИКА РЕЖИМОВ СИНХРОНИЗАЦИИ ===
window.changeSyncMode = function(mode) {
    if (mode === 'full' && !window.syncConfig.fullAccessGranted) {
        // Возвращаем селект обратно, пока не введут пароль
        document.getElementById('sync-mode-select').value = 'personal';
        window.showFullAccessModal();
        return;
    }
    
    window.syncConfig.syncMode = mode;
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    window.renderSyncUI();
    safeToast(`✅ Режим изменен на: ${mode === 'full' ? 'Вся команда' : 'Только мои'}`);
    window.triggerSync('manual'); // Запускаем синхронизацию для загрузки нужных данных
};

// Функция сброса прав (вызывается двойным кликом по тексту)
window.resetFullAccess = function() {
    if (window.syncConfig.fullAccessGranted) {
        window.syncConfig.fullAccessGranted = false;
        window.syncConfig.syncMode = 'personal';
        localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
        window.renderSyncUI();
        safeToast('🔒 Доступ ко всем проверкам сброшен');
    }
};

window.showFullAccessModal = function() {
    if (document.getElementById('sync-full-access-modal')) return;
    const html = `
    <div id="sync-full-access-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-[var(--card-bg)] w-full max-w-xs p-6 rounded-2xl shadow-2xl">
            <div class="text-center mb-4">
                <div class="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl">🛡️</div>
                <h3 class="font-black text-[13px] uppercase text-slate-800 dark:text-white">Доступ ограничен</h3>
                <p class="text-[10px] text-slate-500 mt-1">Введите пароль руководителя для скачивания чужих проверок.</p>
            </div>
            <!-- ИСПРАВЛЕНИЕ: maxlength="6" и placeholder 6 точек -->
            <input type="password" id="sync-full-access-pin" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center text-xl font-black tracking-widest outline-none mb-4" placeholder="••••••" maxlength="6" inputmode="numeric">
            <div class="flex gap-2">
                <button onclick="document.getElementById('sync-full-access-modal').remove()" class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-[10px] uppercase">Отмена</button>
                <button onclick="window.verifyFullAccessPin()" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-md">Далее</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('sync-full-access-pin').focus();
};

window.verifyFullAccessPin = async function() {
    const input = document.getElementById('sync-full-access-pin').value;
    const inputHash = await window.hashPin(input);
    
    // СТРОГАЯ БЕЗОПАСНОСТЬ: Сравниваем только зашифрованные хэши. 
    // Пароль в открытом виде в коде нигде не фигурирует.
    if (inputHash === SYNC_FULL_ACCESS_HASH) {
        document.getElementById('sync-full-access-modal').remove();
        window.syncConfig.fullAccessGranted = true;
        window.changeSyncMode('full');
    } else {
        safeToast("❌ Неверный пароль!");
    }
};