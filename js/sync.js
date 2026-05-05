/* Файл: js/sync.js (Исправленная версия сборки объектов) */
console.log("✅ SYNC.JS загружен браузером!");

window.supabaseClient = null;
window.syncConfig = { enabled: false, engineerName: '', projectCode: '', pinHash: '', deviceId: '', syncMode: 'personal', fullAccessGranted: false };
window.isSyncing = false;
let syncTimeout = null;

const SYNC_FULL_ACCESS_HASH = "cd6ca24c2ed2b7c6c4c549de010cc106316279f972b2d075cd6a454d45be70d8";

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
    window.triggerSync('manual'); 
};

window.verifyFullAccessPin = async function() {
    const input = document.getElementById('sync-full-access-pin').value.trim();
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


window.cacheCloudPhotoToIndexedDB = async function(url) {
    if (!url || typeof url !== 'string') return url;
    if (!url.startsWith('http')) return url;
    if (typeof dbGet === 'undefined' || typeof dbPut === 'undefined') return url;

    const cacheKey = 'cloud://' + btoa(url).replace(/=/g, '');

    const existing = await dbGet('app_photos', cacheKey);
    if (existing && existing.data) {
        return cacheKey;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) return url;

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();

        await dbPut('app_photos', {
            id: cacheKey,
            data: buffer,
            mimeType: blob.type || 'image/jpeg',
            cloudUrl: url,
            createdAt: new Date().toISOString()
        });

        return cacheKey;
    } catch (e) {
        console.warn('[Sync] Фото не сохранено офлайн:', e);
        return url;
    }
};

window.cachePhotosMapToIndexedDB = async function(photosMap) {
    const result = {};

    for (const itemId of Object.keys(photosMap || {})) {
        result[itemId] = await window.cacheCloudPhotoToIndexedDB(photosMap[itemId]);
    }

    return result;
};

window.cacheCloudFileToIndexedDB = async function(url, type = 'file') {
    if (!url || typeof url !== 'string') return url;
    if (!url.startsWith('http')) return url;
    if (typeof dbGet === 'undefined' || typeof dbPut === 'undefined') return url;

    const cacheKey = 'cloud://' + type + '_' + btoa(url).replace(/=/g, '');

    const existing = await dbGet('app_photos', cacheKey);
    if (existing && existing.data) {
        return cacheKey;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) return url;

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();

        await dbPut('app_photos', {
            id: cacheKey,
            data: buffer,
            mimeType: blob.type || 'application/octet-stream',
            cloudUrl: url,
            fileType: type,
            createdAt: new Date().toISOString()
        });

        return cacheKey;
    } catch (e) {
        console.warn('[Sync] Файл не сохранен офлайн:', e);
        return url;
    }
};

window.cacheObjectCloudFilesToIndexedDB = async function(obj, type = 'file') {
    if (!obj || typeof obj !== 'object') return obj;

    const clone = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(clone)) {
        const val = clone[key];

        if (typeof val === 'string' && val.startsWith('http')) {
            const k = key.toLowerCase();
            const looksLikeFile =
                k.includes('photo') ||
                k.includes('image') ||
                k.includes('img') ||
                k.includes('pdf') ||
                k.includes('file') ||
                k.includes('url') ||
                val.includes('/storage/v1/object/public/');

            if (looksLikeFile) {
                clone[key] = await window.cacheCloudFileToIndexedDB(val, type);
            }
        } else if (val && typeof val === 'object') {
            clone[key] = await window.cacheObjectCloudFilesToIndexedDB(val, type);
        }
    }

    return clone;
};

window.cacheCloudFileToIndexedDB = async function(url, type = 'file') {
    if (!url || typeof url !== 'string') return url;
    if (!url.startsWith('http')) return url;
    if (typeof dbGet === 'undefined' || typeof dbPut === 'undefined') return url;

    const cacheKey = 'cloud://' + type + '_' + btoa(url).replace(/=/g, '');

    const existing = await dbGet('app_photos', cacheKey);
    if (existing && existing.data) return cacheKey;

    try {
        const response = await fetch(url);
        if (!response.ok) return url;

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();

        await dbPut('app_photos', {
            id: cacheKey,
            data: buffer,
            mimeType: blob.type || 'application/octet-stream',
            cloudUrl: url,
            fileType: type,
            createdAt: new Date().toISOString()
        });

        return cacheKey;
    } catch (e) {
        console.warn('[Sync] Файл не сохранен офлайн:', e);
        return url;
    }
};

window.cacheObjectCloudFilesToIndexedDB = async function(obj, type = 'file') {
    if (!obj || typeof obj !== 'object') return obj;

    const clone = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(clone)) {
        const val = clone[key];

        if (typeof val === 'string' && val.startsWith('http')) {
            const k = key.toLowerCase();

            const looksLikeFile =
                k.includes('photo') ||
                k.includes('image') ||
                k.includes('img') ||
                k.includes('pdf') ||
                k.includes('file') ||
                k.includes('url') ||
                val.includes('/storage/v1/object/public/');

            if (looksLikeFile) {
                clone[key] = await window.cacheCloudFileToIndexedDB(val, type);
            }
        } else if (val && typeof val === 'object') {
            clone[key] = await window.cacheObjectCloudFilesToIndexedDB(val, type);
        }
    }

    return clone;
};

window.uploadObjectFilesToCloud = async function(obj, bucketName, pathPrefix, type = 'file') {
    if (!obj || typeof obj !== 'object') return obj;

    const clone = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(clone)) {
        const val = clone[key];

        if (typeof val === 'string') {
            const k = key.toLowerCase();

            const looksLikeFile =
                k.includes('photo') ||
                k.includes('image') ||
                k.includes('img') ||
                k.includes('pdf') ||
                k.includes('file');

            if (
                looksLikeFile &&
                typeof uploadAsset === 'function' &&
                (val.startsWith('local://') || val.startsWith('data:'))
            ) {
                clone[key] = await uploadAsset(
                    val,
                    bucketName,
                    pathPrefix,
                    type
                );
            }
        } else if (val && typeof val === 'object') {
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

    const uploadedData = await window.uploadObjectFilesToCloud(
        data,
        bucketName,
        `${pCode}/${objectType}/${id}`,
        objectType
    );

    await window.supabaseClient
        .from('rbi_cloud_objects')
        .upsert({
            id: `${pCode}_${objectType}_${id}`.replace(/\s+/g, '_'),
            project_code: pCode,
            object_type: objectType,
            engineer_name: iName,
            object_data: uploadedData,
            is_deleted: uploadedData._deleted || false,
            updated_at: uploadedData.updatedAt || uploadedData.updated_at || new Date().toISOString()
        }, { onConflict: 'id' });
};

window.pullCloudObjects = async function(objectType) {
    const pCode = window.syncConfig.projectCode;

    const { data, error } = await window.supabaseClient
        .from('rbi_cloud_objects')
        .select('*')
        .eq('project_code', pCode)
        .eq('object_type', objectType)
        .eq('is_deleted', false);

    if (error) throw error;

    const result = [];

    for (const row of data || []) {
        let obj = row.object_data || {};
        obj = await window.cacheObjectCloudFilesToIndexedDB(obj, objectType);
        obj.id = obj.id || row.id;
        obj.updatedAt = row.updated_at;
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
    window.renderSyncUI();

    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        window.isSyncing = false;
        window.renderSyncUI();
        console.log("[Sync] Timeout. Снята блокировка.");
    }, 45000);

    const pCode = window.syncConfig.projectCode;
    const iName = window.syncConfig.engineerName;
    const stableInspectorId = `${pCode}_${iName}`.replace(/\s+/g, '_');
    const lastPullAt = localStorage.getItem('rbi_sync_last_pull_at') || '';
    const lastPushAt = localStorage.getItem('rbi_sync_last_push_at') || '';

    function isHttpUrl(v) {
        return typeof v === 'string' && /^https?:\/\//i.test(v);
    }

    function isLocalUrl(v) {
        return typeof v === 'string' && v.startsWith('local://');
    }

    function isDataUrl(v) {
        return typeof v === 'string' && v.startsWith('data:');
    }

    function getStoragePathFromPublicUrl(url, bucketName) {
        if (!url || !bucketName) return '';
        const marker = `/storage/v1/object/public/${bucketName}/`;
        const idx = url.indexOf(marker);
        if (idx === -1) return '';
        return decodeURIComponent(url.slice(idx + marker.length));
    }

    function dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const mime = (parts[0].match(/data:(.*?);base64/) || [])[1] || 'image/jpeg';
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return { blob: new Blob([bytes], { type: mime }), mime };
    }

    function extFromMime(mime) {
        if (!mime) return 'bin';
        if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
        if (mime.includes('png')) return 'png';
        if (mime.includes('webp')) return 'webp';
        if (mime.includes('pdf')) return 'pdf';
        return 'bin';
    }

    async function localPhotoToBlob(localUrl) {
        if (!isLocalUrl(localUrl) || typeof dbGet !== 'function') return null;
        const rec = await dbGet('app_photos', localUrl);
        if (!rec || !rec.data) return null;
        const mime = rec.mimeType || 'image/jpeg';
        return { blob: new Blob([rec.data], { type: mime }), mime };
    }

    async function uploadAsset(value, bucketName, pathPrefix, filePrefix) {
        if (!value) return value;
        if (isHttpUrl(value)) return value;

        let blobData = null;

        if (isLocalUrl(value)) blobData = await localPhotoToBlob(value);
        else if (isDataUrl(value)) blobData = dataUrlToBlob(value);
        else return value;

        if (!blobData || !blobData.blob) return value;

        const ext = extFromMime(blobData.mime);
        const storagePath = `${pathPrefix}/${filePrefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 99999)}.${ext}`;

        const { error } = await window.supabaseClient.storage
            .from(bucketName)
            .upload(storagePath, blobData.blob, {
                upsert: true,
                cacheControl: '3600',
                contentType: blobData.mime
            });

        if (error) throw error;

        const { data } = window.supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(storagePath);

        return data.publicUrl;
    }

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
        if (mode === 'manual') safeToast('📥 Скачивание проверок...');

        let inspectionsQuery = window.supabaseClient
            .from('rbi_inspections')
            .select('*')
            .eq('project_code', pCode)
            .eq('is_deleted', false)
            .order('inspection_date', { ascending: false });

        if (window.syncConfig.syncMode === 'personal') {
            inspectionsQuery = inspectionsQuery.eq('engineer_name', iName);
        }

        if (lastPullAt && mode !== 'manual') {
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
                    id: h.id,
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
                    photos: await window.cachePhotosMapToIndexedDB(photosMap[h.id] || {}),
                    metrics: h.metrics || {},
                    updatedAt: h.updated_at || new Date().toISOString()
                };

                if (typeof dbPut === 'function') {
                    await dbPut('app_history', localItem);
                }
            }

            if (typeof dbGetAll === 'function') {
                contractorArray = (await dbGetAll('app_history') || []).filter(x => !x._deleted);
            }
        }

        // =====================================================
        // 3. PULL: черновик текущей проверки
        // =====================================================
        try {
            const { data: draftRows } = await window.supabaseClient
                .from('rbi_draft_sessions')
                .select('*')
                .eq('project_code', pCode)
                .eq('engineer_name', iName)
                .limit(1);

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
                            safeToast("📥 Черновик подтянут из облака");
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
                .eq('is_deleted', false);

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

        try {
            let etalonQuery = window.supabaseClient
                .from('rbi_etalon_acts')
                .select('*')
                .eq('project_code', pCode)
                .eq('is_deleted', false);

            if (window.syncConfig.syncMode === 'personal') {
                etalonQuery = etalonQuery.eq('engineer_name', iName);
            }

            const { data: etalonRows } = await etalonQuery;

            if (etalonRows && typeof dbPut === 'function') {
                etalonActsArray = etalonActsArray || [];

                for (const row of etalonRows) {
                    let act = row.act_data || {};
                  act = await window.cacheObjectCloudFilesToIndexedDB(act, 'etalon');
                  act.id = row.id;
                  act.updatedAt = row.updated_at;

                    await dbPut('rbi_etalon_acts', act);

                    const idx = etalonActsArray.findIndex(x => String(x.id) === String(act.id));
                    if (idx >= 0) etalonActsArray[idx] = act;
                    else etalonActsArray.push(act);
                }
            }
        } catch (e) {
            console.warn("[Sync] Эталоны не подтянуты:", e.message);
        }
              // =====================================================
        // 4.1. PULL: прочие модули через rbi_cloud_objects
        // =====================================================
        // =====================================================
        // 4.1. PULL: прочие модули через rbi_cloud_objects
        // =====================================================
        try {
            const cloudTypes = [
                'meeting',
                'intervention',
                'practice',
                'schedule',
                'custom_doc',
                'custom_node',
                'custom_twi_card',
                'fmea', // <-- ДОБАВЛЕНО FMEA
                'sk_data_bundle' // <-- НОВОЕ: Пакет данных ПК СК
            ];

            for (const type of cloudTypes) {
                const objects = await window.pullCloudObjects(type);

                if (type === 'meeting' && typeof dbPut === 'function') {
                    window.rbi_meetingsData = window.rbi_meetingsData || [];
                    for (const obj of objects) {
                        await dbPut('rbi_meetings', obj);
                        const idx = window.rbi_meetingsData.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.rbi_meetingsData[idx] = obj;
                        else window.rbi_meetingsData.push(obj);
                    }
                }

                if (type === 'intervention' && typeof dbPut === 'function') {
                    window.rbi_interventionsData = window.rbi_interventionsData || [];
                    for (const obj of objects) {
                        await dbPut('rbi_interventions', obj);
                        const idx = window.rbi_interventionsData.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.rbi_interventionsData[idx] = obj;
                        else window.rbi_interventionsData.push(obj);
                    }
                }

                if (type === 'practice' && typeof dbPut === 'function') {
                    window.rbi_practicesData = window.rbi_practicesData || [];
                    for (const obj of objects) {
                        await dbPut('rbi_practices', obj);
                        const idx = window.rbi_practicesData.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.rbi_practicesData[idx] = obj;
                        else window.rbi_practicesData.push(obj);
                    }
                }

                if (type === 'schedule' && typeof dbPut === 'function') {
                    window.rbi_scheduleData = window.rbi_scheduleData || [];
                    for (const obj of objects) {
                        await dbPut('rbi_schedule_stages', obj);
                        const idx = window.rbi_scheduleData.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.rbi_scheduleData[idx] = obj;
                        else window.rbi_scheduleData.push(obj);
                    }
                }

                // <-- НОВОЕ: Обработка скачанных FMEA
                if (type === 'fmea' && typeof dbPut === 'function') {
                    window.rbi_fmeaRecords = window.rbi_fmeaRecords || [];
                    for (const obj of objects) {
                        await dbPut('rbi_fmea', obj);
                        const idx = window.rbi_fmeaRecords.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.rbi_fmeaRecords[idx] = obj;
                        else window.rbi_fmeaRecords.push(obj);
                    }
                }
                                // <-- НОВОЕ: Обработка скачанного пакета ПК СК (с защитой от затирания)
                                // Синхронизация данных ПК Стройконтроль (двусторонняя, с soft delete)
                                // Синхронизация данных ПК Стройконтроль (сравнение по времени)
                if (type === 'sk_data_bundle' && typeof dbPut === 'function' && typeof dbGetAll === 'function') {
                    let localRecords = await dbGetAll('sk_records') || [];
                    const localMap = new Map();
                    localRecords.forEach(r => localMap.set(r.id, r));

                    const saveSkRecord = async (record) => {
                        record._updatedAt = record._updatedAt || new Date().toISOString();
                        await dbPut('sk_records', record);
                    };

                    for (const obj of objects) {
                        if (!obj.records || !Array.isArray(obj.records)) continue;
                        
                        for (const cloudRecord of obj.records) {
                            const localRecord = localMap.get(cloudRecord.id);
                            const cloudTime = cloudRecord._updatedAt ? new Date(cloudRecord._updatedAt).getTime() : 0;
                            const localTime = localRecord?._updatedAt ? new Date(localRecord._updatedAt).getTime() : 0;

                            if (!localRecord || cloudTime > localTime) {
                                if (cloudRecord._deleted === true) {
                                    if (localRecord) {
                                        await dbDelete('sk_records', cloudRecord.id);
                                        localMap.delete(cloudRecord.id);
                                    }
                                } else {
                                    await saveSkRecord(cloudRecord);
                                    localMap.set(cloudRecord.id, cloudRecord);
                                }
                            }
                        }

                        if (obj.volumes) {
                            window.skVolumes = obj.volumes;
                            await dbPut('app_settings', { key: 'sk_volumes', data: window.skVolumes });
                        }
                        if (obj.contractorMap) {
                            window.skContractorMap = obj.contractorMap;
                            await dbPut('app_settings', { key: 'sk_contractor_map', data: window.skContractorMap });
                        }
                    }
                    
                    window.skRecords = Array.from(localMap.values()).filter(r => !r._deleted);
                }

                if (type === 'custom_doc') {
                    window.customDocs = window.customDocs || [];
                    for (const obj of objects) {
                        const idx = window.customDocs.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.customDocs[idx] = obj;
                        else window.customDocs.push(obj);
                    }
                }

                if (type === 'custom_node') {
                    window.customNodes = window.customNodes || [];
                    for (const obj of objects) {
                        const idx = window.customNodes.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.customNodes[idx] = obj;
                        else window.customNodes.push(obj);
                    }
                }

                if (type === 'custom_twi_card') {
                    window.customTwiCards = window.customTwiCards || [];
                    for (const obj of objects) {
                        const idx = window.customTwiCards.findIndex(x => String(x.id) === String(obj.id));
                        if (idx >= 0) window.customTwiCards[idx] = obj;
                        else window.customTwiCards.push(obj);
                    }
                }
            }
        } catch (e) {
            console.warn("[Sync] Прочие модули не подтянуты:", e.message);
        }
        // =====================================================
        // 5. PUSH: локальная история в новую архитектуру
        // =====================================================
        let currentHistory = typeof contractorArray !== 'undefined' ? contractorArray : [];

        if (window.syncConfig.syncMode === 'personal') {
            currentHistory = currentHistory.filter(i => i.inspectorName === iName);
        }

        if (lastPushAt && mode !== 'manual') {
            const lastPushTime = new Date(lastPushAt).getTime();
            currentHistory = currentHistory.filter(i => {
                const t = new Date(i.updatedAt || i.updated_at || i.date || 0).getTime();
                return t >= lastPushTime;
            });
        }

        if (currentHistory.length > 0) {
            if (mode === 'manual') safeToast(`📤 Отправка проверок: ${currentHistory.length}`);

            for (const c of currentHistory) {
                const inspectionId = String(c.id);
                const photoRows = [];
                const uploadedPhotos = {};

                for (const itemId of Object.keys(c.photos || {})) {
                    const oldPhoto = c.photos[itemId];
                    const publicUrl = await uploadAsset(
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
                        is_deleted: c._deleted || false,
                        deleted_at: c._deleted ? (c._deletedAt || new Date().toISOString()) : null,
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

                    c.photos = uploadedPhotos;
                    if (typeof dbPut === 'function') await dbPut('app_history', c);
                }
            }
        }
                        // 5.1. PUSH: акты-эталоны в rbi_etalon_acts (с принудительной загрузкой фото)
                try {
                    const etalons = typeof dbGetAll === 'function'
                        ? (await dbGetAll('rbi_etalon_acts') || [])
                        : (typeof etalonActsArray !== 'undefined' ? etalonActsArray : []);

                    for (const act of etalons) {
                        if (!act || !act.id) continue;

                        // Создаём копию, чтобы не менять оригинал до успешной загрузки фото
                        let uploadedAct = JSON.parse(JSON.stringify(act));
                        
                        // Принудительно обрабатываем фото в элементах эталона
                        if (uploadedAct.details && uploadedAct.details.elements && Array.isArray(uploadedAct.details.elements)) {
                            for (let i = 0; i < uploadedAct.details.elements.length; i++) {
                                const element = uploadedAct.details.elements[i];
                                if (element.photo && typeof element.photo === 'string' && element.photo.startsWith('local://')) {
                                    try {
                                        // Достаём фото из IndexedDB
                                        const photoRecord = await dbGet('app_photos', element.photo);
                                        if (photoRecord && photoRecord.data) {
                                            const blob = new Blob([photoRecord.data], { type: photoRecord.mimeType || 'image/jpeg' });
                                            const ext = photoRecord.mimeType?.includes('png') ? 'png' : 'jpg';
                                            const fileName = `etalon_${act.id}_elem${i}_${Date.now()}.${ext}`;
                                            const filePath = `${pCode}/etalons/${act.id}/${fileName}`;
                                            
                                            // Загружаем в Storage Supabase
                                            const { error: uploadError } = await window.supabaseClient.storage
                                                .from('inspection-photos')
                                                .upload(filePath, blob, { upsert: true, contentType: photoRecord.mimeType });
                                            
                                            if (uploadError) throw uploadError;
                                            
                                            // Получаем публичный URL
                                            const { data: urlData } = window.supabaseClient.storage
                                                .from('inspection-photos')
                                                .getPublicUrl(filePath);
                                            
                                            // Заменяем local:// на публичный URL
                                            element.photo = urlData.publicUrl;
                                            
                                            // Обновляем запись в IndexedDB, чтобы локально тоже был публичный URL
                                            if (typeof dbPut === 'function') {
                                                const updatedAct = JSON.parse(JSON.stringify(act));
updatedAct.details.elements[i].photo = urlData.publicUrl;
updatedAct.updatedAt = new Date().toISOString();
await dbPut('rbi_etalon_acts', updatedAct);
const idx = etalonActsArray.findIndex(x => String(x.id) === String(act.id));
if (idx !== -1) etalonActsArray[idx] = updatedAct;
                                            }
                                        }
                                    } catch (photoError) {
                                        console.error(`[Sync] Ошибка загрузки фото для эталона ${act.id}, элемент ${i}:`, photoError);
                                        // Не прерываем отправку, фото останется local:// (будет загружено при следующей синхронизации)
                                    }
                                }
                            }
                        }

                        // Отправляем запись в таблицу Supabase
                        const { error: etalonError } = await window.supabaseClient
                            .from('rbi_etalon_acts')
                            .upsert({
                                id: String(uploadedAct.id),
                                project_code: pCode,
                                engineer_name: uploadedAct.inspectorName || uploadedAct.engineerName || iName,
                                contractor_name: uploadedAct.contractorName || uploadedAct.contractor || '',
                                template_key: uploadedAct.templateKey || 'sys_etalon_act',
                                template_title: uploadedAct.templateTitle || '',
                                act_data: uploadedAct,
                                is_deleted: uploadedAct._deleted || false,
                                updated_at: uploadedAct.updatedAt || uploadedAct.updated_at || new Date().toISOString()
                            }, { onConflict: 'id' });

                        if (etalonError) throw etalonError;
                    }
                } catch (e) {
                    console.warn("[Sync] Эталоны не отправлены:", e.message);
                }
        // =====================================================
        // 6. PUSH: черновик
        // =====================================================
        if (typeof dbGet === 'function') {
            const currentSession = await dbGet('app_state', 'current_session');

            if (currentSession) {
                const draftPhotos = {};

                for (const itemId of Object.keys(currentSession.photos || {})) {
                    draftPhotos[itemId] = await uploadAsset(
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

                // =====================================================
        // 7. PUSH: профиль инженера для совместимости
        // =====================================================
        try {
            const currentSession = (typeof dbGet !== 'undefined')
                ? (await dbGet('app_state', 'current_session') || {})
                : {};

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

            console.log('[Sync] Профиль инженера отправлен:', stableInspectorId);

        } catch (e) {
            console.warn('[Sync] Профиль инженера не отправлен:', e.message);
            if (mode === 'manual') safeToast('⚠️ Профиль не отправлен: ' + e.message.substring(0, 60));
        }
          
                // =====================================================
        // 7.1. PUSH: задачи в rbi_tasks
        // =====================================================
        try {
            const tasks = typeof dbGetAll === 'function'
                ? (await dbGetAll('rbi_tasks') || [])
                : (typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : []);

            if (tasks.length > 0) {
                // ИСПРАВЛЕНИЕ: Пакетная отправка (Batch Upsert). 
                // Решает проблему зависания, когда задач накопилось больше сотни.
                for (let i = 0; i < tasks.length; i += 50) {
                    const batch = tasks.slice(i, i + 50);
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
        // 7.2. PUSH: совещания в rbi_cloud_objects
        // =====================================================
        try {
            const meetings = typeof dbGetAll === 'function'
                ? (await dbGetAll('rbi_meetings') || [])
                : (typeof window.rbi_meetingsData !== 'undefined' ? window.rbi_meetingsData : []);

            for (const meeting of meetings) {
                if (!meeting || !meeting.id) continue;

                const { error: meetingError } = await window.supabaseClient
                    .from('rbi_cloud_objects')
                    .upsert({
                        id: `${pCode}_meeting_${meeting.id}`.replace(/\s+/g, '_'),
                        project_code: pCode,
                        object_type: 'meeting',
                        engineer_name: meeting.author || iName,
                        object_data: meeting,
                        is_deleted: meeting._deleted || false,
                        updated_at: meeting.updatedAt || meeting.updated_at || meeting.date || new Date().toISOString()
                    }, { onConflict: 'id' });

                if (meetingError) throw meetingError;
            }
        } catch (e) {
            console.warn("[Sync] Совещания не отправлены:", e.message);
            if (mode === 'manual') safeToast('⚠️ Совещания не отправлены: ' + e.message.substring(0, 60));
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
                    if (typeof dbGetAll === 'function') {
                        const meetings = await dbGetAll('rbi_meetings') || [];
                        for (const obj of meetings) { await window.pushCloudObject('meeting', obj.id, obj, 'custom-assets'); }

                        const interventions = await dbGetAll('rbi_interventions') || [];
                        for (const obj of interventions) { await window.pushCloudObject('intervention', obj.id, obj, 'custom-assets'); }

                        const practices = await dbGetAll('rbi_practices') || [];
                        for (const obj of practices) { await window.pushCloudObject('practice', obj.id, obj, 'custom-assets'); }

                        const scheduleStages = await dbGetAll('rbi_schedule_stages') || [];
                        for (const obj of scheduleStages) { await window.pushCloudObject('schedule', obj.id, obj, 'custom-assets'); }

                        const fmeas = await dbGetAll('rbi_fmea') || [];
                        for (const obj of fmeas) { await window.pushCloudObject('fmea', obj.id, obj, 'custom-assets'); }

                        // Отправка ПК СК (единым пакетом)
                        const skRecs = await dbGetAll('sk_records') || [];
                        const skVols = await dbGet('app_settings', 'sk_volumes');
                        const skCmap = await dbGet('app_settings', 'sk_contractor_map');
                        if (skRecs.length > 0 || (skVols && skVols.data)) {
                            const skBundle = {
                                id: 'main_bundle',
                                records: skRecs,
                                volumes: skVols ? skVols.data : {},
                                contractorMap: skCmap ? skCmap.data : {}
                            };
                            await window.pushCloudObject('sk_data_bundle', skBundle.id, skBundle, 'custom-assets');
                        }
                    }

                    if (typeof customDocs !== 'undefined' && Array.isArray(customDocs)) {
                        for (const obj of customDocs.filter(x => x && x.id && !String(x.id).startsWith('sys_'))) {
                            await window.pushCloudObject('custom_doc', obj.id, obj, 'custom-assets');
                        }
                    }

                    if (typeof customNodes !== 'undefined' && Array.isArray(customNodes)) {
                        for (const obj of customNodes.filter(x => x && x.id)) {
                            await window.pushCloudObject('custom_node', obj.id, obj, 'custom-assets');
                        }
                    }

                    if (typeof customTwiCards !== 'undefined' && Array.isArray(customTwiCards)) {
                        for (const obj of customTwiCards.filter(x => x && x.id)) {
                            await window.pushCloudObject('custom_twi_card', obj.id, obj, 'twi-pdfs');
                        }
                    }
                } catch (e) {
                    console.warn("[Sync] Прочие модули не отправлены:", e.message);
                }
        const doneAt = new Date().toISOString();

        localStorage.setItem('rbi_sync_last_pull_at', doneAt);
        localStorage.setItem('rbi_sync_last_push_at', doneAt);
        localStorage.setItem('rbi_cloud_dirty', '0');

        if (mode === 'manual') safeToast('✅ Синхронизация завершена');

        if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
        if (typeof renderSelector === 'function') renderSelector();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();
        if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
          if (typeof gameGenerateWeeklyPlan === 'function') {
            await gameGenerateWeeklyPlan(false);
        }
        if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();

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