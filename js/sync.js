/* Файл: js/sync.js */
/* RBI QUALITY CLOUD SYNC v2.1
   Правильная архитектура:
   - Черновик проверки: rbi_draft_sessions
   - Завершенные проверки: rbi_inspections
   - Пункты проверок: rbi_inspection_items
   - Фото проверок: Storage bucket inspection-photos + rbi_inspection_photos
   - Шаблоны: rbi_templates
   - Задачи: rbi_tasks
   - Эталоны: rbi_etalon_acts
   - Режимы:
     personal = только мои проверки
     full = весь проект для руководителя по паролю 
*/

console.log("✅ SYNC.JS v2.1 загружен");

window.supabaseClient = null;
window.isSyncing = false;

window.syncConfig = {
    enabled: false,
    engineerName: '',
    projectCode: '',
    pinHash: '',
    syncMode: 'personal',
    fullAccessGranted: false,
    lastPullAt: '',
    deviceId: ''
};

let syncTimer = null;
let syncTimeout = null;
let silentSyncDebounce = null;

const MANAGER_PIN_HASH = 'cbb9e1bf165fd6904e7a9b802917b83cd0f2dbb87cbe438ca30a3c4bece221b0';

// =========================================================
// SAFE HELPERS
// =========================================================

function safeToast(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log(msg);
}

function nowIso() {
    return new Date().toISOString();
}

function makeId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 100000).toString(36);
}

function normalizeText(v) {
    return (v || '').toString().trim();
}

function isDataUrl(v) {
    return typeof v === 'string' && v.startsWith('data:');
}

function isLocalUrl(v) {
    return typeof v === 'string' && v.startsWith('local://');
}

function isHttpUrl(v) {
    return typeof v === 'string' && /^https?:\/\//i.test(v);
}

function getStoragePathFromPublicUrl(url, bucketName) {
    if (!url || !bucketName) return '';
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return '';
    return decodeURIComponent(url.slice(idx + marker.length));
}

function getProjectCode() {
    return normalizeText(window.syncConfig.projectCode);
}

function getEngineerName() {
    return normalizeText(window.syncConfig.engineerName);
}

function getCurrentProjectName() {
    return normalizeText(document.getElementById('inp-project')?.value || '');
}

function getCurrentInspectorName() {
    return normalizeText(document.getElementById('inp-inspector')?.value || window.syncConfig.engineerName || '');
}

function getCurrentContractorName() {
    return normalizeText(document.getElementById('inp-contractor')?.value || '');
}

function getCurrentLocation() {
    return normalizeText(document.getElementById('inp-location')?.value || '');
}

function getCurrentSection() {
    return normalizeText(document.getElementById('inp-section')?.value || '');
}

function getCurrentFloor() {
    return normalizeText(document.getElementById('inp-floor')?.value || '');
}

function getCurrentRoom() {
    return normalizeText(document.getElementById('inp-room')?.value || '');
}

function getTemplateTitleByKey(templateKey) {
    if (!templateKey) return '';
    try {
        const type = templateKey.split('_')[0];
        const key = templateKey.slice(type.length + 1);

        if (type === 'sys' && typeof SYSTEM_TEMPLATES !== 'undefined' && SYSTEM_TEMPLATES[key]) {
            return SYSTEM_TEMPLATES[key].title || '';
        }

        if (type === 'user' && typeof userTemplates !== 'undefined' && userTemplates[key]) {
            return userTemplates[key].title || '';
        }

        const sel = document.getElementById('checklist-selector');
        if (sel) {
            const opt = Array.from(sel.options).find(o => o.value === templateKey);
            if (opt) return opt.textContent || '';
        }
    } catch (e) {}
    return '';
}

function getChecklistByTemplateKey(templateKey) {
    if (!templateKey) return [];
    try {
        const type = templateKey.split('_')[0];
        const key = templateKey.slice(type.length + 1);

        if (type === 'sys' && typeof SYSTEM_TEMPLATES !== 'undefined' && SYSTEM_TEMPLATES[key]) {
            return SYSTEM_TEMPLATES[key].groups || [];
        }

        if (type === 'user' && typeof userTemplates !== 'undefined' && userTemplates[key]) {
            return userTemplates[key].groups || [];
        }
    } catch (e) {}
    return [];
}

function flattenChecklist(groups) {
    if (!groups || !Array.isArray(groups)) return [];
    return groups.flatMap(g => Array.isArray(g.items) ? g.items : []);
}

function findChecklistItem(templateKey, itemId) {
    const flat = flattenChecklist(getChecklistByTemplateKey(templateKey));
    return flat.find(x => String(x.id) === String(itemId)) || null;
}

async function sha256(text) {
    const msgBuffer = new TextEncoder().encode(text || '');
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.hashPin = sha256;

// =========================================================
// INIT
// =========================================================

window.initSync = async function () {
    try {
        const saved = localStorage.getItem('rbi_sync_config');
        if (saved) {
            window.syncConfig = { ...window.syncConfig, ...JSON.parse(saved) };
        }
    } catch (e) {}

    if (!window.syncConfig.deviceId) {
        window.syncConfig.deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 10000);
        saveSyncConfig();
    }

    try {
        if (window.supabase && window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL && window.APP_CONFIG.SUPABASE_KEY) {
            window.supabaseClient = window.supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_KEY
            );
        }
    } catch (e) {
        console.error('[Sync] Ошибка инициализации Supabase:', e);
    }

    window.renderSyncUI();

    if (!window.supabaseClient) {
        safeToast('⚠️ Supabase не подключен');
        return;
    }

    if (window.syncConfig.enabled && getProjectCode() && getEngineerName()) {
        window.triggerSync('silent');
        if (syncTimer) clearInterval(syncTimer);
        syncTimer = setInterval(() => window.triggerSync('silent'), 15000);
    }
};

function saveSyncConfig() {
    localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
}

window.isSyncEnabled = function () {
    return !!(window.syncConfig.enabled && getProjectCode() && getEngineerName());
};

// =========================================================
// UI
// =========================================================

window.renderSyncUI = function () {
    const container = document.getElementById('sync-settings-block');
    const headerIndicator = document.getElementById('header-sync-status');

    if (headerIndicator) {
        if (window.syncConfig.enabled) {
            headerIndicator.innerHTML = window.isSyncing
                ? `<div class="text-green-500 animate-pulse flex items-center justify-center">🔄</div>`
                : `<div class="text-green-500 flex items-center justify-center">☁️</div>`;
        } else {
            headerIndicator.innerHTML = `<div class="text-slate-400 opacity-70 flex items-center justify-center">☁️</div>`;
        }
    }

    if (!container) return;

    const currentEngineer = window.syncConfig.engineerName || document.getElementById('inp-inspector')?.value || '';
    const currentProject = window.syncConfig.projectCode || '';

    if (!window.syncConfig.enabled) {
        container.innerHTML = `
            <div class="p-4 border-b border-slate-200">
                <div class="space-y-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Имя инженера *</label>
                        <input type="text" id="sync-name" class="input-base" value="${currentEngineer}">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Код проекта *</label>
                        <input type="text" id="sync-code" class="input-base" value="${currentProject}" placeholder="Например: RBI-QUALITY-DEMO">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">ПИН проекта, если нужен</label>
                        <input type="password" id="sync-pin" class="input-base" placeholder="Не обязательно" inputmode="numeric">
                    </div>
                </div>
            </div>
            <div class="p-4 bg-slate-50">
                <button onclick="window.saveSyncSettings()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">Подключить облако</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="p-4 bg-green-50 border-b border-green-100 text-center">
            <div class="text-[12px] font-black text-green-700 uppercase mb-1">Синхронизация активна</div>
            <div class="text-[10px] text-green-600 font-bold">Инженер: ${window.syncConfig.engineerName}</div>
            <div class="text-[10px] text-green-600 font-bold">Проект: ${window.syncConfig.projectCode}</div>
        </div>

        <div class="p-3 bg-white border-b border-slate-200 flex justify-between items-center">
            <div>
                <div class="font-bold text-[11px] uppercase text-slate-700">Режим синхронизации</div>
                <div class="text-[9px] text-slate-400 font-bold">
                    ${window.syncConfig.syncMode === 'full' ? 'Руководитель: весь проект' : 'Инженер: только мои проверки'}
                </div>
            </div>
            <select id="sync-mode-select" class="input-base !w-auto !py-1.5 !text-[10px] font-bold" onchange="window.changeSyncMode(this.value)">
                <option value="personal" ${window.syncConfig.syncMode === 'personal' ? 'selected' : ''}>Только мои</option>
                <option value="full" ${window.syncConfig.syncMode === 'full' ? 'selected' : ''}>Весь проект</option>
            </select>
        </div>

        <div class="p-4 bg-slate-50">
            <button onclick="window.triggerSync('manual')" class="w-full bg-white text-indigo-600 border border-slate-200 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 mb-2 flex items-center justify-center gap-2">🔄 Синхронизировать сейчас</button>
            <button onclick="window.disconnectSync()" class="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95">Отключить облако</button>
        </div>
    `;
};

window.saveSyncSettings = async function () {
    const name = normalizeText(document.getElementById('sync-name')?.value);
    const code = normalizeText(document.getElementById('sync-code')?.value);
    const pin = normalizeText(document.getElementById('sync-pin')?.value);

    if (!name || !code) return safeToast('⚠️ Укажите имя инженера и код проекта');
    if (!window.supabaseClient) return safeToast('❌ Supabase не подключен');

    try {
        const { data: projectData, error: projectError } = await window.supabaseClient
            .from('allowed_projects')
            .select('code,is_active')
            .eq('code', code)
            .limit(1);

        if (projectError) throw projectError;
        if (!projectData || projectData.length === 0) return safeToast('❌ Код проекта не найден');
        if (projectData[0].is_active === false) return safeToast('❌ Проект отключен');

        const pinHash = pin ? await sha256(pin) : '';

        window.syncConfig.enabled = true;
        window.syncConfig.engineerName = name;
        window.syncConfig.projectCode = code;
        window.syncConfig.pinHash = pinHash;
        window.syncConfig.syncMode = 'personal';
        window.syncConfig.fullAccessGranted = false;

        saveSyncConfig();

        await window.supabaseClient
            .from('rbi_engineer_profiles')
            .upsert({
                project_code: code,
                engineer_name: name,
                pin_hash: pinHash,
                last_seen_at: nowIso(),
                updated_at: nowIso()
            }, { onConflict: 'project_code,engineer_name' });

        window.renderSyncUI();
        await window.triggerSync('manual');

        if (syncTimer) clearInterval(syncTimer);
        syncTimer = setInterval(() => window.triggerSync('silent'), 15000);

    } catch (e) {
        console.error('[Sync] saveSyncSettings:', e);
        safeToast('❌ Ошибка подключения облака');
    }
};

window.disconnectSync = function () {
    if (!confirm('Отключить облачную синхронизацию на этом устройстве?')) return;
    window.syncConfig.enabled = false;
    window.syncConfig.syncMode = 'personal';
    window.syncConfig.fullAccessGranted = false;
    saveSyncConfig();
    window.renderSyncUI();
};

window.changeSyncMode = function (mode) {
    if (mode === 'full' && !window.syncConfig.fullAccessGranted) {
        const sel = document.getElementById('sync-mode-select');
        if (sel) sel.value = 'personal';

        const html = `
            <div id="sync-full-access-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-800 w-full max-w-xs p-6 rounded-2xl text-center shadow-2xl border border-slate-200 dark:border-slate-700">
                    <h3 class="font-black text-[13px] uppercase mb-2 text-slate-800 dark:text-white">Доступ руководителя</h3>
                    <div class="text-[10px] text-slate-500 mb-4 font-bold">Введите пароль для режима «Весь проект»</div>
                    <input type="password" id="sync-full-access-pin" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center text-xl font-black mb-4 text-slate-800 dark:text-white" placeholder="••••••" maxlength="6" inputmode="numeric">
                    <div class="flex gap-2">
                        <button onclick="document.getElementById('sync-full-access-modal').remove()" class="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-[10px] uppercase">Отмена</button>
                        <button onclick="window.verifyFullAccessPin()" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Войти</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        setTimeout(() => document.getElementById('sync-full-access-pin')?.focus(), 100);
        return;
    }

    window.syncConfig.syncMode = mode;
    saveSyncConfig();
    window.renderSyncUI();
    window.triggerSync('manual');
};

window.verifyFullAccessPin = async function () {
    const input = normalizeText(document.getElementById('sync-full-access-pin')?.value);
    const inputHash = await sha256(input);

    if (inputHash === MANAGER_PIN_HASH) {
        document.getElementById('sync-full-access-modal')?.remove();
        window.syncConfig.fullAccessGranted = true;
        window.syncConfig.syncMode = 'full';
        saveSyncConfig();
        window.renderSyncUI();
        window.triggerSync('manual');
    } else {
        safeToast('❌ Неверный пароль');
    }
};

window.resetFullAccess = function () {
    window.syncConfig.fullAccessGranted = false;
    window.syncConfig.syncMode = 'personal';
    saveSyncConfig();
    window.renderSyncUI();
};

// =========================================================
// PUBLIC SYNC ENTRY
// =========================================================

window.triggerSync = async function (mode = 'silent') {
    if (!window.isSyncEnabled() || !window.supabaseClient) return;

    if (mode === 'silent') {
        clearTimeout(silentSyncDebounce);
        silentSyncDebounce = setTimeout(() => runSync(mode), 1500);
    } else {
        await runSync(mode);
    }
};

async function runSync(mode = 'silent') {
    if (window.isSyncing) {
        if (mode === 'manual') safeToast('⏳ Синхронизация уже идет');
        return;
    }

    window.isSyncing = true;
    window.renderSyncUI();

    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        window.isSyncing = false;
        window.renderSyncUI();
        console.warn('[Sync] Сброшено по таймауту');
    }, 60000);

    try {
        if (mode === 'manual') safeToast('🔄 Синхронизация...');

        await pushEngineerProfile();
        await pushEngineerRating();
        await pushDraftSession();
        await pushTemplates();
        await pushInspectionsNormalized();
        await pushTasks();
        await pushEtalonActs();
        await pushCustomAssets();

        await pullEngineerRatingsAlways();
        await pullTemplates();
        await pullInspectionsNormalized();
        await pullTasks();
        await pullEtalonActs();
        await pullDraftSession();
        await pullCustomAssets();

        window.syncConfig.lastPullAt = nowIso();
        saveSyncConfig();

        refreshAppAfterSync();

        if (mode === 'manual') safeToast('✅ Синхронизация завершена');

    } catch (e) {
        console.error('[Sync] Ошибка:', e);
        if (mode === 'manual') safeToast('❌ Ошибка синхронизации: ' + (e.message || 'сбой'));
    } finally {
        if (syncTimeout) clearTimeout(syncTimeout);
        window.isSyncing = false;
        window.renderSyncUI();
    }
}

function refreshAppAfterSync() {
    try {
        if (typeof updateAllDynamicFilters === 'function') updateAllDynamicFilters();
        if (typeof renderSelector === 'function') renderSelector();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();
        if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
        if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
        if (typeof updateDataSummary === 'function') updateDataSummary();
    } catch (e) {
        console.warn('[Sync] refresh warning:', e);
    }
}

// =========================================================
// STORAGE UPLOAD
// =========================================================

async function getBlobFromLocalPhoto(localId) {
    if (!isLocalUrl(localId)) return null;
    const rec = await dbGet(STORES.PHOTOS, localId);
    if (!rec || !rec.data) return null;

    const mime = rec.mimeType || 'image/jpeg';
    const blob = new Blob([rec.data], { type: mime });
    return { blob, mime };
}

function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const meta = parts[0];
    const base64 = parts[1];
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);

    for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return { blob: new Blob([byteArray], { type: mime }), mime };
}

function extensionFromMime(mime) {
    if (!mime) return 'bin';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('json')) return 'json';
    return 'bin';
}

async function uploadAnyFileToBucket(value, bucketName, pathPrefix, fileHint = 'file') {
    if (!value) return value;

    if (isHttpUrl(value)) return value;

    let blobData = null;

    if (isLocalUrl(value)) {
        blobData = await getBlobFromLocalPhoto(value);
    } else if (isDataUrl(value)) {
        blobData = dataUrlToBlob(value);
    } else {
        return value;
    }

    if (!blobData || !blobData.blob) return value;

    const ext = extensionFromMime(blobData.mime);
    const cleanPrefix = pathPrefix.replace(/^\/+|\/+$/g, '');
    const fileName = `${fileHint}_${Date.now().toString(36)}_${Math.floor(Math.random() * 100000)}.${ext}`;
    const storagePath = `${cleanPrefix}/${fileName}`;

    const { error } = await window.supabaseClient.storage
        .from(bucketName)
        .upload(storagePath, blobData.blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: blobData.mime
        });

    if (error) throw error;

    const { data } = window.supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

    return data.publicUrl;
}

async function uploadInspectionPhoto(inspectionId, itemId, photoValue) {
    if (!photoValue) return null;

    if (isHttpUrl(photoValue)) {
        const storagePath = getStoragePathFromPublicUrl(photoValue, 'inspection-photos');
        return {
            publicUrl: photoValue,
            storagePath: storagePath || `${getProjectCode()}/${inspectionId}/${itemId}/external`
        };
    }

    const publicUrl = await uploadAnyFileToBucket(
        photoValue,
        'inspection-photos',
        `${getProjectCode()}/${inspectionId}/${itemId}`,
        'photo'
    );

    if (!publicUrl) return null;

    return {
        publicUrl,
        storagePath: getStoragePathFromPublicUrl(publicUrl, 'inspection-photos')
    };
}

async function deepUploadAssets(obj, bucketName, pathPrefix) {
    if (!obj || typeof obj !== 'object') return obj;

    const clone = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(clone)) {
        const val = clone[key];

        if (typeof val === 'string') {
            const lowerKey = key.toLowerCase();
            const looksLikeAsset =
                lowerKey.includes('photo') ||
                lowerKey.includes('img') ||
                lowerKey.includes('image') ||
                lowerKey.includes('pdf') ||
                lowerKey.includes('file') ||
                isDataUrl(val) ||
                isLocalUrl(val);

            if (looksLikeAsset && (isDataUrl(val) || isLocalUrl(val))) {
                clone[key] = await uploadAnyFileToBucket(
                    val,
                    bucketName,
                    pathPrefix,
                    lowerKey.includes('pdf') ? 'pdf' : 'asset'
                );
            }
        } else if (val && typeof val === 'object') {
            clone[key] = await deepUploadAssets(val, bucketName, pathPrefix);
        }
    }

    return clone;
}

// =========================================================
// ENGINEER PROFILE
// =========================================================

async function pushEngineerProfile() {
    await window.supabaseClient
        .from('rbi_engineer_profiles')
        .upsert({
            project_code: getProjectCode(),
            engineer_name: getEngineerName(),
            pin_hash: window.syncConfig.pinHash || '',
            settings: typeof appSettings !== 'undefined' ? appSettings : {},
            last_seen_at: nowIso(),
            updated_at: nowIso()
        }, { onConflict: 'project_code,engineer_name' });
}

// =========================================================
// DRAFT SESSION
// =========================================================

async function pushDraftSession() {
    const draft = await dbGet(STORES.STATE, 'current_session');
    if (!draft) return;

    const templateKey = draft.templateKey || currentTemplateKey || '';
    const uploadedPhotos = {};

    const draftPhotos = draft.photos || {};
    for (const itemId of Object.keys(draftPhotos)) {
        const uploaded = await uploadInspectionPhoto('draft', itemId, draftPhotos[itemId]);
        uploadedPhotos[itemId] = uploaded ? uploaded.publicUrl : draftPhotos[itemId];
    }

    await window.supabaseClient
        .from('rbi_draft_sessions')
        .upsert({
            id: `draft_${getProjectCode()}_${getEngineerName()}`.replace(/\s+/g, '_'),
            project_code: getProjectCode(),
            engineer_name: getEngineerName(),
            template_key: templateKey,
            template_title: getTemplateTitleByKey(templateKey),
            contractor_name: draft.contractor || getCurrentContractorName(),
            location: draft.location || getCurrentLocation(),
            section: draft.section || getCurrentSection(),
            floor: draft.floor || getCurrentFloor(),
            room: draft.room || getCurrentRoom(),
            state: draft.state || {},
            details: draft.details || {},
            photos: uploadedPhotos,
            custom_expert_conclusions: draft.customExpertConclusions || {},
            device_id: window.syncConfig.deviceId,
            updated_at: nowIso()
        }, { onConflict: 'project_code,engineer_name' });
}

async function pullDraftSession() {
    const { data, error } = await window.supabaseClient
        .from('rbi_draft_sessions')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('engineer_name', getEngineerName())
        .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return;

    const cloud = data[0];
    const local = await dbGet(STORES.STATE, 'current_session');

    const localTime = local?.timestamp ? new Date(local.timestamp).getTime() : 0;
    const cloudTime = cloud.updated_at ? new Date(cloud.updated_at).getTime() : 0;

    if (cloudTime <= localTime) return;

    await dbPut(STORES.STATE, {
        key: 'current_session',
        timestamp: cloudTime,
        templateKey: cloud.template_key || '',
        project: getCurrentProjectName(),
        inspector: getEngineerName(),
        contractor: cloud.contractor_name || '',
        location: cloud.location || '',
        section: cloud.section || '',
        floor: cloud.floor || '',
        room: cloud.room || '',
        state: cloud.state || {},
        details: cloud.details || {},
        photos: cloud.photos || {},
        customExpertConclusions: cloud.custom_expert_conclusions || {}
    });
}

// =========================================================
// TEMPLATES
// =========================================================

async function pushTemplates() {
    if (typeof userTemplates === 'undefined' || !userTemplates) return;

    const rows = [];

    for (const slug of Object.keys(userTemplates)) {
        rows.push({
            id: slug,
            project_code: getProjectCode(),
            title: userTemplates[slug]?.title || slug,
            template_data: userTemplates[slug],
            created_by: getEngineerName(),
            is_deleted: false,
            updated_at: nowIso()
        });
    }

    for (let i = 0; i < rows.length; i += 100) {
        const { error } = await window.supabaseClient
            .from('rbi_templates')
            .upsert(rows.slice(i, i + 100), { onConflict: 'id' });
        if (error) throw error;
    }
}

async function pullTemplates() {
    const { data, error } = await window.supabaseClient
        .from('rbi_templates')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('is_deleted', false);

    if (error) throw error;
    if (!data) return;

    if (typeof userTemplates === 'undefined') window.userTemplates = {};

    for (const row of data) {
        userTemplates[row.id] = row.template_data;
        await dbPut(STORES.TEMPLATES, {
            slug: row.id,
            data: row.template_data
        });
    }
}

// =========================================================
// INSPECTIONS NORMALIZED
// =========================================================

async function pushInspectionsNormalized() {
    const history = await dbGetAll(STORES.HISTORY);
    if (!history || history.length === 0) return;

    for (const insp of history) {
        await pushOneInspection(insp);
    }
}

async function pushOneInspection(insp) {
    if (!insp || !insp.id) return;

    const projectCode = getProjectCode();
    const engineerName = insp.inspectorName || getEngineerName();
    const templateKey = insp.templateKey || '';
    const inspectionId = String(insp.id);

    const header = {
        id: inspectionId,
        project_code: projectCode,
        project_name: insp.projectName || getCurrentProjectName(),
        engineer_name: engineerName,
        contractor_name: insp.contractorName || '',
        template_key: templateKey,
        template_title: insp.templateTitle || getTemplateTitleByKey(templateKey),
        location: insp.location || '',
        section: insp.section || '',
        floor: insp.floor || '',
        room: insp.room || '',
        inspection_date: insp.date || nowIso(),
        metrics: insp.metrics || {},
        is_completed: insp.isCompleted !== false,
        is_deleted: insp._deleted || false,
        deleted_at: insp._deleted ? (insp._deletedAt || nowIso()) : null,
        updated_at: insp.updatedAt || insp.updated_at || nowIso()
    };

    const { error: headerError } = await window.supabaseClient
        .from('rbi_inspections')
        .upsert(header, { onConflict: 'id' });

    if (headerError) throw headerError;

    const stateObj = insp.state || {};
    const detailsObj = insp.details || {};
    const photosObj = insp.photos || {};

    const itemRows = [];
    const photoRows = [];

    for (const itemId of Object.keys(stateObj)) {
        const itemInfo = findChecklistItem(templateKey, itemId);
        const itemDetails = detailsObj[itemId] || {};
        const itemStatus = stateObj[itemId];

        itemRows.push({
            id: `${inspectionId}_${itemId}`,
            inspection_id: inspectionId,
            project_code: projectCode,
            item_id: String(itemId),
            item_name: itemInfo?.n || itemDetails.name || '',
            item_weight: itemInfo?.w || itemDetails.weight || null,
            status: itemStatus,
            comment: itemDetails.comment || itemDetails.text || '',
            cause_code: itemDetails.causeCode || '',
            fact_value: itemDetails.fact || itemDetails.factValue || '',
            tolerance_value: itemDetails.tolerance || itemDetails.toleranceValue || '',
            details: itemDetails,
            updated_at: nowIso()
        });

        if (photosObj[itemId]) {
            const uploaded = await uploadInspectionPhoto(inspectionId, itemId, photosObj[itemId]);
            if (uploaded) {
                photoRows.push({
                    id: `${inspectionId}_${itemId}_main`,
                    inspection_id: inspectionId,
                    project_code: projectCode,
                    item_id: String(itemId),
                    photo_type: 'inspection',
                    bucket_name: 'inspection-photos',
                    storage_path: uploaded.storagePath,
                    public_url: uploaded.publicUrl,
                    updated_at: nowIso()
                });
            }
        }
    }

    if (itemRows.length > 0) {
        const { error } = await window.supabaseClient
            .from('rbi_inspection_items')
            .upsert(itemRows, { onConflict: 'id' });
        if (error) throw error;
    }

    if (photoRows.length > 0) {
        const { error } = await window.supabaseClient
            .from('rbi_inspection_photos')
            .upsert(photoRows, { onConflict: 'id' });
        if (error) throw error;
    }
}

async function pullInspectionsNormalized() {
    let query = window.supabaseClient
        .from('rbi_inspections')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('is_deleted', false)
        .order('inspection_date', { ascending: false });

    if (window.syncConfig.syncMode !== 'full') {
        query = query.eq('engineer_name', getEngineerName());
    }

    const { data: inspections, error: inspError } = await query;
    if (inspError) throw inspError;
    if (!inspections || inspections.length === 0) return;

    const ids = inspections.map(i => i.id);

    const { data: itemRows, error: itemError } = await window.supabaseClient
        .from('rbi_inspection_items')
        .select('*')
        .in('inspection_id', ids);

    if (itemError) throw itemError;

    const { data: photoRows, error: photoError } = await window.supabaseClient
        .from('rbi_inspection_photos')
        .select('*')
        .in('inspection_id', ids);

    if (photoError) throw photoError;

    const itemsByInspection = {};
    const photosByInspection = {};

    (itemRows || []).forEach(row => {
        if (!itemsByInspection[row.inspection_id]) itemsByInspection[row.inspection_id] = [];
        itemsByInspection[row.inspection_id].push(row);
    });

    (photoRows || []).forEach(row => {
        if (!photosByInspection[row.inspection_id]) photosByInspection[row.inspection_id] = [];
        photosByInspection[row.inspection_id].push(row);
    });

    for (const h of inspections) {
        const rows = itemsByInspection[h.id] || [];
        const pRows = photosByInspection[h.id] || [];

        const restoredState = {};
        const restoredDetails = {};
        const restoredPhotos = {};

        rows.forEach(r => {
            restoredState[r.item_id] = r.status;
            restoredDetails[r.item_id] = {
                ...(r.details || {}),
                comment: r.comment || r.details?.comment || '',
                causeCode: r.cause_code || r.details?.causeCode || '',
                fact: r.fact_value || r.details?.fact || '',
                tolerance: r.tolerance_value || r.details?.tolerance || ''
            };
        });

        pRows.forEach(p => {
            if (p.item_id && p.public_url) restoredPhotos[p.item_id] = p.public_url;
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
            date: h.inspection_date || h.created_at || nowIso(),
            isCompleted: h.is_completed !== false,
            state: restoredState,
            details: restoredDetails,
            photos: restoredPhotos,
            metrics: h.metrics || {},
            updatedAt: h.updated_at || nowIso()
        };

        await dbPut(STORES.HISTORY, localItem);
    }

    contractorArray = (await dbGetAll(STORES.HISTORY) || []).filter(x => !x._deleted);
}

// =========================================================
// TASKS
// =========================================================

async function pushTasks() {
    if (!window.rbi_tasksData && typeof dbGetAll === 'undefined') return;

    const tasks = await dbGetAll(STORES.TASKS) || window.rbi_tasksData || [];
    if (!tasks || tasks.length === 0) return;

    const rows = tasks.map(t => ({
        id: String(t.id || makeId('tsk')),
        project_code: getProjectCode(),
        engineer_name: t.engineerName || t.inspectorName || getEngineerName(),
        contractor_name: t.contractor || t.contractorName || '',
        title: t.title || '',
        task_data: t,
        status: t.status || 'pending',
        task_date: t.date || t.taskDate || null,
        is_deleted: t._deleted || false,
        updated_at: t.updatedAt || t.updated_at || nowIso()
    }));

    for (let i = 0; i < rows.length; i += 100) {
        const { error } = await window.supabaseClient
            .from('rbi_tasks')
            .upsert(rows.slice(i, i + 100), { onConflict: 'id' });
        if (error) throw error;
    }
}

async function pullTasks() {
    let query = window.supabaseClient
        .from('rbi_tasks')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('is_deleted', false);

    if (window.syncConfig.syncMode !== 'full') {
        query = query.eq('engineer_name', getEngineerName());
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return;

    window.rbi_tasksData = window.rbi_tasksData || [];

    for (const row of data) {
        const task = row.task_data || {};
        task.id = row.id;
        task.status = row.status || task.status || 'pending';
        task.date = task.date || row.task_date;
        task.updatedAt = row.updated_at;

        await dbPut(STORES.TASKS, task);

        const idx = window.rbi_tasksData.findIndex(t => String(t.id) === String(task.id));
        if (idx >= 0) window.rbi_tasksData[idx] = task;
        else window.rbi_tasksData.push(task);
    }
}

// =========================================================
// ETALON ACTS
// =========================================================

async function pushEtalonActs() {
    const acts = await dbGetAll(STORES.ETALON_ACTS) || [];
    if (!acts || acts.length === 0) return;

    const rows = [];

    for (const act of acts) {
        const uploadedAct = await deepUploadAssets(
            act,
            'inspection-photos',
            `${getProjectCode()}/etalons/${act.id || makeId('etalon')}`
        );

        rows.push({
            id: String(uploadedAct.id || makeId('etalon')),
            project_code: getProjectCode(),
            engineer_name: uploadedAct.inspectorName || uploadedAct.engineerName || getEngineerName(),
            contractor_name: uploadedAct.contractor || uploadedAct.contractorName || '',
            template_key: uploadedAct.templateKey || '',
            template_title: uploadedAct.templateTitle || '',
            act_data: uploadedAct,
            is_deleted: uploadedAct._deleted || false,
            updated_at: uploadedAct.updatedAt || uploadedAct.updated_at || nowIso()
        });
    }

    for (let i = 0; i < rows.length; i += 100) {
        const { error } = await window.supabaseClient
            .from('rbi_etalon_acts')
            .upsert(rows.slice(i, i + 100), { onConflict: 'id' });
        if (error) throw error;
    }
}

async function pullEtalonActs() {
    let query = window.supabaseClient
        .from('rbi_etalon_acts')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('is_deleted', false);

    if (window.syncConfig.syncMode !== 'full') {
        query = query.eq('engineer_name', getEngineerName());
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return;

    etalonActsArray = etalonActsArray || [];

    for (const row of data) {
        const act = row.act_data || {};
        act.id = row.id;
        act.updatedAt = row.updated_at;

        await dbPut(STORES.ETALON_ACTS, act);

        const idx = etalonActsArray.findIndex(x => String(x.id) === String(act.id));
        if (idx >= 0) etalonActsArray[idx] = act;
        else etalonActsArray.push(act);
    }
}

// =========================================================
// CUSTOM DOCS / NODES / TWI
// =========================================================

async function pushCustomAssets() {
    await pushCustomDocs();
    await pushCustomNodes();
    await pushCustomTwiCards();
}

async function pullCustomAssets() {
    await pullCustomDocs();
    await pullCustomNodes();
    await pullCustomTwiCards();
}

async function pushCustomDocs() {
    if (typeof customDocs === 'undefined' || !Array.isArray(customDocs)) return;

    const rows = [];

    for (const doc of customDocs.filter(d => !String(d.id || '').startsWith('sys_'))) {
        const id = String(doc.id || makeId('doc'));
        const uploaded = await deepUploadAssets(doc, 'custom-assets', `${getProjectCode()}/docs/${id}`);

        rows.push({
            id,
            project_code: getProjectCode(),
            doc_data: uploaded,
            bucket_name: 'custom-assets',
            storage_path: uploaded.storagePath || '',
            public_url: uploaded.publicUrl || uploaded.link || '',
            is_deleted: uploaded._deleted || false,
            updated_at: uploaded.updatedAt || uploaded.updated_at || nowIso()
        });
    }

    if (rows.length === 0) return;

    const { error } = await window.supabaseClient
        .from('rbi_custom_docs')
        .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
}

async function pullCustomDocs() {
    const { data, error } = await window.supabaseClient
        .from('rbi_custom_docs')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('is_deleted', false);

    if (error) throw error;
    if (!data || typeof customDocs === 'undefined') return;

    customDocs = customDocs || [];

    data.forEach(row => {
        const doc = row.doc_data || {};
        doc.id = row.id;

        const idx = customDocs.findIndex(x => String(x.id) === String(doc.id));
        if (idx >= 0) customDocs[idx] = doc;
        else customDocs.push(doc);
    });
}

async function pushCustomNodes() {
    if (typeof customNodes === 'undefined' || !Array.isArray(customNodes)) return;

    const rows = [];

    for (const node of customNodes) {
        const id = String(node.id || makeId('node'));
        const uploaded = await deepUploadAssets(node, 'custom-assets', `${getProjectCode()}/nodes/${id}`);

        rows.push({
            id,
            project_code: getProjectCode(),
            node_data: uploaded,
            bucket_name: 'custom-assets',
            storage_path: uploaded.storagePath || '',
            public_url: uploaded.publicUrl || uploaded.img || '',
            is_deleted: uploaded._deleted || false,
            updated_at: uploaded.updatedAt || uploaded.updated_at || nowIso()
        });
    }

    if (rows.length === 0) return;

    const { error } = await window.supabaseClient
        .from('rbi_custom_nodes')
        .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
}

async function pullCustomNodes() {
    const { data, error } = await window.supabaseClient
        .from('rbi_custom_nodes')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('is_deleted', false);

    if (error) throw error;
    if (!data || typeof customNodes === 'undefined') return;

    customNodes = customNodes || [];

    data.forEach(row => {
        const node = row.node_data || {};
        node.id = row.id;

        const idx = customNodes.findIndex(x => String(x.id) === String(node.id));
        if (idx >= 0) customNodes[idx] = node;
        else customNodes.push(node);
    });
}

async function pushCustomTwiCards() {
    if (typeof customTwiCards === 'undefined' || !Array.isArray(customTwiCards)) return;

    const rows = [];

    for (const card of customTwiCards) {
        const id = String(card.id || makeId('twi'));
        const uploaded = await deepUploadAssets(card, 'twi-pdfs', `${getProjectCode()}/twi/${id}`);

        rows.push({
            id,
            project_code: getProjectCode(),
            twi_data: uploaded,
            bucket_name: 'twi-pdfs',
            storage_path: uploaded.storagePath || '',
            public_url: uploaded.publicUrl || uploaded.pdfUrl || '',
            is_deleted: uploaded._deleted || false,
            updated_at: uploaded.updatedAt || uploaded.updated_at || nowIso()
        });
    }

    if (rows.length === 0) return;

    const { error } = await window.supabaseClient
        .from('rbi_custom_twi_cards')
        .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
}

async function pullCustomTwiCards() {
    const { data, error } = await window.supabaseClient
        .from('rbi_custom_twi_cards')
        .select('*')
        .eq('project_code', getProjectCode())
        .eq('is_deleted', false);

    if (error) throw error;
    if (!data || typeof customTwiCards === 'undefined') return;

    customTwiCards = customTwiCards || [];

    data.forEach(row => {
        const card = row.twi_data || {};
        card.id = row.id;

        const idx = customTwiCards.findIndex(x => String(x.id) === String(card.id));
        if (idx >= 0) customTwiCards[idx] = card;
        else customTwiCards.push(card);
    });
}

// =========================================================
// ENGINEER RATING: всегда подтягивается из облака
// =========================================================

async function pushEngineerRating() {
    if (typeof gameCalculateAllProfiles !== 'function') return;

    const profiles = gameCalculateAllProfiles();
    const myName = getEngineerName();

    if (!profiles || !profiles[myName]) return;

    const p = profiles[myName];

    const cleanProfile = {
        name: p.name,
        pi: p.pi || 0,
        checksCount: p.checksCount || 0,
        currentStreak: p.currentStreak || 0,
        badgesData: p.badgesData || {},
        monthlyPI: p.monthlyPI || {},
        radarData: p.radarData || {},
        levelObj: p.levelObj || null,
        objectName: p.objectName || getCurrentProjectName()
    };

    const { error } = await window.supabaseClient
        .from('rbi_engineer_ratings')
        .upsert({
            id: `${getProjectCode()}_${myName}`.replace(/\s+/g, '_'),
            project_code: getProjectCode(),
            engineer_name: myName,
            rating_data: cleanProfile,
            pi: cleanProfile.pi,
            checks_count: cleanProfile.checksCount,
            level_name: cleanProfile.levelObj?.name || '',
            updated_at: nowIso()
        }, { onConflict: 'project_code,engineer_name' });

    if (error) throw error;
}

async function pullEngineerRatingsAlways() {
    const { data, error } = await window.supabaseClient
        .from('rbi_engineer_ratings')
        .select('*')
        .eq('project_code', getProjectCode())
        .order('pi', { ascending: false });

    if (error) throw error;

    window.serverGlobalRating = (data || []).map(row => {
        const p = row.rating_data || {};
        return {
            ...p,
            name: p.name || row.engineer_name,
            pi: row.pi || p.pi || 0,
            checksCount: row.checks_count || p.checksCount || 0,
            levelObj: p.levelObj || { name: row.level_name || 'Инженер' }
        };
    });
}