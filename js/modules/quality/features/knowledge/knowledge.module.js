/**
 * knowledge.module.js
 * Модуль «База знаний / TWI / Узлы» — ES-модуль (Step 38).
 *
 * Содержит всю бизнес-логику из app.js строки 4311–5586.
 * Регистрирует window.rbi_* и вспомогательные window.* функции напрямую.
 *
 * Приватные хелперы: _storage(), _syncEnqueue(), _getSetting(),
 *   _isDemoMode(), _getPermissions(), _sync().
 * Бизнес-логику не меняет — перенос 1-в-1 из app.js.
 */

import {
    openFaqModal, closeFaqModal, filterFaq, toggleFaqAnswer,
    openAppAssistantChat, closeAppAssistantChat, RBI_ASSISTANT_SYNONYMS,
    rbiAssistantNormalizeText, rbiAssistantStem, rbiAssistantTokenize,
    rbiAssistantExpandQuery, rbiAssistantCharSimilarity, rbiAssistantDetectIntentBoost,
    rbiAssistantScoreItem, rbiAssistantFindContext, rbiAssistantBuildContextText,
    rbiAssistantOfflineAnswer, rbiAssistantRenderMessage, askAppAssistant,
    bindCtx as bindFaqCtx
} from './features/faq.js';

window.openFaqModal = openFaqModal;
window.closeFaqModal = closeFaqModal;
window.filterFaq = filterFaq;
window.toggleFaqAnswer = toggleFaqAnswer;
window.openAppAssistantChat = openAppAssistantChat;
window.closeAppAssistantChat = closeAppAssistantChat;
window.RBI_ASSISTANT_SYNONYMS = RBI_ASSISTANT_SYNONYMS;
window.rbiAssistantNormalizeText = rbiAssistantNormalizeText;
window.rbiAssistantStem = rbiAssistantStem;
window.rbiAssistantTokenize = rbiAssistantTokenize;
window.rbiAssistantExpandQuery = rbiAssistantExpandQuery;
window.rbiAssistantCharSimilarity = rbiAssistantCharSimilarity;
window.rbiAssistantDetectIntentBoost = rbiAssistantDetectIntentBoost;
window.rbiAssistantScoreItem = rbiAssistantScoreItem;
window.rbiAssistantFindContext = rbiAssistantFindContext;
window.rbiAssistantBuildContextText = rbiAssistantBuildContextText;
window.rbiAssistantOfflineAnswer = rbiAssistantOfflineAnswer;
window.rbiAssistantRenderMessage = rbiAssistantRenderMessage;
window.askAppAssistant = askAppAssistant;

// =========================================================================
// ПРИВАТНЫЕ ХЕЛПЕРЫ (изоляция от прямых dbPut/STORES/triggerSync)
// =========================================================================

let _ctx = null;

function _getSetting(key) {
    return ((_ctx && _ctx.settings) || window.RBI.services.settings).get(key);
}

function _isDemoMode() {
    return ((_ctx && _ctx.appMode) || window.RBI.services.appMode).isDemo();
}

function _getPermissions() {
    if (_ctx && _ctx.permissions) {
        return _ctx.permissions;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.permissions) {
        return window.RBI.services.permissions;
    }
    // Defensive fallback safety-net (недостижимо на практике: сервис permissions
    // регистрируется раньше загрузки этого ES-модуля) — не «живое обращение».
    return window.RbiRoles;
}

function _syncEnqueue(action, payload) {
    if (_ctx && _ctx.sync && typeof _ctx.sync.enqueue === 'function') {
        _ctx.sync.enqueue(action, payload);
        return;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.sync &&
        typeof window.RBI.services.sync.enqueue === 'function') {
        window.RBI.services.sync.enqueue(action, payload);
        return;
    }
    if (window.SyncQueueManager && typeof window.SyncQueueManager.enqueue === 'function') {
        window.SyncQueueManager.enqueue(action, payload);
    }
}

function _storage() {
    if (_ctx && _ctx.storage) {
        return _ctx.storage;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
        return window.RBI.services.storage;
    }
    return {
        stores: function() { return typeof STORES !== 'undefined' ? STORES : {}; },
        get: function(store, key) { return dbGet(store, key); },
        getAll: function(store) { return dbGetAll(store); },
        put: function(store, data) { return dbPut(store, data); },
        delete: function(store, key) { return dbDelete(store, key); }
    };
}

function _gameLogAction(actionType, targetId) {
    if (_ctx && _ctx.game) {
        return _ctx.game.logAction(actionType, targetId);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.logAction(actionType, targetId);
    }
    if (typeof gameLogAction === 'function') return gameLogAction(actionType, targetId);
}

function _extractTextFromPdf(url) {
    return ((_ctx && _ctx.ai) || window.RBI.services.ai).extractTextFromPdf(url);
}

function _getAllInspections() {
    if (_ctx && _ctx.inspections) {
        return _ctx.inspections.getAllSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getAllSync();
    }
    return Array.isArray(contractorArray) ? contractorArray : [];
}

function _sync(mode) {
    var m = mode || 'silent';
    if (_ctx && _ctx.sync) {
        return _ctx.sync.trigger(m);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.sync) {
        return window.RBI.services.sync.trigger(m);
    }
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
}

function _getTasks() {
    if (_ctx && _ctx.tasks) {
        return _ctx.tasks.getTasksSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getTasksSync();
    }
    return Array.isArray(window.rbi_tasksData) ? window.rbi_tasksData : [];
}

function _templates() {
    if (_ctx && _ctx.templates) {
        return _ctx.templates;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.templates) {
        return window.RBI.services.templates;
    }
    return {
        getUserTemplates: function () {
            return typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
        },
        getSystemTemplates: function () {
            return typeof window.SYSTEM_TEMPLATES !== 'undefined' ? window.SYSTEM_TEMPLATES : {};
        }
    };
}

// =========================================================================
// ИНИЦИАЛИЗАЦИЯ ДАННЫХ (guard)
// =========================================================================

window.rbi_twiCards    = window.rbi_twiCards    || [];
window.rbi_customDocs  = window.rbi_customDocs  || [];
window.rbi_customNodes = window.rbi_customNodes || [];

// =========================================================================
// ПРАВА НА БАЗУ ЗНАНИЙ
// =========================================================================

function rbi_getCurrentRoleSafe() {
    const perms = _getPermissions();
    return perms ? perms.getCurrentRole() : 'guest';
}

function rbi_getCurrentUserNameSafe() {
    const perms = _getPermissions();
    return perms ? perms.getCurrentEngineerName() : 'Инженер';
}

function rbi_canEditKnowledgeBase() {
    const perms = _getPermissions();
    return perms ? perms.canEditKnowledgeBase() : false;
}

function rbi_canDeleteKnowledgeItem(ownerName) {
    const perms = _getPermissions();
    return perms ? perms.canDelete(ownerName) : false;
}

function rbi_requireKnowledgeEditRight() {
    if (!rbi_canEditKnowledgeBase()) {
        showToast('⛔ Ваша роль не позволяет редактировать базу знаний');
        return false;
    }
    return true;
}

window.rbi_getCurrentRoleSafe       = rbi_getCurrentRoleSafe;
window.rbi_getCurrentUserNameSafe   = rbi_getCurrentUserNameSafe;
window.rbi_canEditKnowledgeBase     = rbi_canEditKnowledgeBase;
window.rbi_canDeleteKnowledgeItem   = rbi_canDeleteKnowledgeItem;
window.rbi_requireKnowledgeEditRight = rbi_requireKnowledgeEditRight;

// =========================================================================
// БЛОК: TWI КАРТЫ И КОНСТРУКТОР
// =========================================================================

// ES-модуль имеет собственный scope — переменные не попадают в window
// автоматически (в отличие от classic script). knowledge.legacy.js (classic
// script) ожидает customTwiCards/customNodes/customDocs как globals, поэтому
// инициализируем их из window.* (на случай повторной загрузки) и синхронизируем
// window.* после каждого переприсваивания — см. паттерн KnowledgeState.setTwiCards.
let customTwiCards = window.customTwiCards || [];
let customDocs = window.customDocs || [];
let currentDocFilter = window.currentDocFilter || 'ALL';
window.customTwiCards = customTwiCards;
window.customDocs = customDocs;
window.currentDocFilter = currentDocFilter;
let twiStepCount = window.twiStepCount || 0;
let currentEditingTwiId = window.currentEditingTwiId ?? null;
let currentTwiStepUploadId = window.currentTwiStepUploadId ?? null;
let currentTwiType = window.currentTwiType || 'INSPECTOR';
window.twiStepCount = twiStepCount;
window.currentEditingTwiId = currentEditingTwiId;
window.currentTwiStepUploadId = currentTwiStepUploadId;
window.currentTwiType = currentTwiType;

// Глобальная функция для перезагрузки данных справочника из базы в оперативную память
window.rbi_reloadReferenceMemory = async function () {
    const st = _storage();
    const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});
    try {
        // 1. TWI КАРТЫ
        const loadedTwi = await st.getAll(stores.TWI_CARDS) || [];
        const sysTwiIds = (typeof window.SYSTEM_TWI_CARDS !== 'undefined' ? window.SYSTEM_TWI_CARDS : []).map(c => String(c.id));
        customTwiCards = loadedTwi.filter(c => !sysTwiIds.includes(String(c.id)) && !c._deleted);
        window.customTwiCards = customTwiCards;

        // 2. ТЕХНИЧЕСКИЕ УЗЛЫ
        const loadedNodes = await st.getAll(stores.CUSTOM_NODES) || [];
        const sysNodeIds = (typeof window.SYSTEM_NODES !== 'undefined' ? window.SYSTEM_NODES : []).map(c => String(c.id));
        customNodes = loadedNodes.filter(c => !sysNodeIds.includes(String(c.id)) && !c._deleted);
        window.customNodes = customNodes;

        // 3. НОРМАТИВНЫЕ ДОКУМЕНТЫ
        const loadedDocs = await st.getAll(stores.CUSTOM_DOCS) || [];
        const sysDocIds = (typeof window.SYSTEM_DOCS !== 'undefined' ? window.SYSTEM_DOCS : []).map(c => String(c.id));
        customDocs = loadedDocs.filter(c => !sysDocIds.includes(String(c.id)) && !c._deleted);
        window.customDocs = customDocs;

        // 4. ПОЛЬЗОВАТЕЛЬСКИЕ ЧЕК-ЛИСТЫ
        const storedTmpls = await st.getAll(stores.TEMPLATES);
        if (storedTmpls && storedTmpls.length > 0) {
            window.userTemplates = {};
            storedTmpls.forEach(t => {
                if (!t.data._deleted) {
                    window.userTemplates[t.slug] = t.data;
                }
            });
        }
    } catch (e) { console.error("Ошибка обновления памяти Справочников", e); }
};

// Загрузка при старте приложения
document.addEventListener("DOMContentLoaded", async () => {
    await window.rbi_reloadReferenceMemory();
    if (typeof window.renderTwiList === 'function') window.renderTwiList();
});

// Анимация меню управления TWI
function toggleTwiManagePanel() {
    const body = document.getElementById('twi-manage-body');
    const icon = document.getElementById('twi-manage-toggle-icon');
    if (!body || !icon) return;
    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
        body.style.maxHeight = '200px';
        body.style.opacity = '1';
        body.style.marginTop = '12px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        icon.style.transform = 'rotate(-90deg)';
    }
}

// ЭКСПОРТ (ВЫГРУЗКА В JSON)
function exportTwiJson() {
    const userCardsToExport = customTwiCards.filter(c => !c.id.startsWith('sys_'));
    if (userCardsToExport.length === 0) return showToast('Нет пользовательских карт для экспорта');

    const dataStr = JSON.stringify(userCardsToExport, null, 4);
    downloadFile(dataStr, `RBI_TWI_Cards_${new Date().toLocaleDateString('ru-RU')}.json`, 'application/json');
    showToast("✅ JSON-файл скачан!");
}

// ИМПОРТ (ЗАГРУЗКА ИЗ JSON)
function processTwiImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Неверный формат");

            const st = _storage();
            const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});
            let addedCount = 0;
            for (const item of data) {
                if (!customTwiCards.find(x => x.id === item.id)) {
                    customTwiCards.push(item);
                    window.customTwiCards = customTwiCards;
                    await st.put(stores.TWI_CARDS, item);
                    addedCount++;
                }
            }

            showToast(`✅ Импорт завершен! Добавлено карт: ${addedCount}`);
            window.renderTwiList();
        } catch (err) {
            console.error(err);
            alert("Ошибка импорта. Проверьте формат файла.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// === ПОИСК КАНДИДАТОВ ДЛЯ МАГИИ TWI ===
window.getMagicTwiCandidates = function () {
    let twiMagicMap = {};
    _getAllInspections().forEach(check => {
        if (check.state && check.photos) {
            Object.keys(check.state).forEach(id => {
                const s = check.state[id];
                if (check.photos[id]) {
                    const tType = check.templateKey.split('_')[0];
                    const tKey = check.templateKey.replace(tType + '_', '');
                    const cl = tType === 'sys' && _templates().getSystemTemplates()[tKey] ? _templates().getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                    const foundItem = getFlatList(cl).find(x => x.id == id);
                    let defName = foundItem ? foundItem.n : "Дефект";

                    const magicKey = check.templateKey + '_' + id;
                    if (!twiMagicMap[magicKey]) twiMagicMap[magicKey] = { ok: null, fail: null, title: defName, tmplKey: check.templateKey, itemId: id };

                    if (s === 'ok') twiMagicMap[magicKey].ok = check.photos[id];
                    else if (s === 'fail' || s === 'fail_escalated') twiMagicMap[magicKey].fail = check.photos[id];
                }
            });
        }
    });

    const magicCandidates = Object.values(twiMagicMap).filter(m => m.ok && m.fail);
    return magicCandidates.filter(m => {
        const existing = customTwiCards.find(c => c.checklistKey === m.tmplKey && String(c.itemId) === String(m.itemId) && c.type === 'INSPECTOR');
        return !existing;
    });
};

// === КОНТЕКСТНОЕ МЕНЮ TWI ===
let currentActionTwiId = null;

function openTwiActionSheet(twiId, event) {
    if (event) event.stopPropagation();
    currentActionTwiId = twiId;
    const overlay = document.getElementById('twi-action-sheet');
    const card = customTwiCards.find(c => c.id === twiId);
    if (!card) return;

    document.getElementById('twi-action-title').innerText = card.title;

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('.transform').classList.remove('translate-y-full');
    }, 10);
}

function closeTwiActionSheet() {
    const overlay = document.getElementById('twi-action-sheet');
    overlay.classList.add('opacity-0');
    overlay.querySelector('.transform').classList.add('translate-y-full');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentActionTwiId = null;
    }, 300);
}

function handleTwiAction(action) {
    const id = currentActionTwiId;
    closeTwiActionSheet();

    const card = customTwiCards.find(c => c.id === id);
    const currentEngineer = _getSetting('engineerName') || 'Инженер';
    const isOwner = !card || !card.owner || card.owner === currentEngineer;

    setTimeout(() => {
        if (action === 'view') {
            openTwiViewer(id);
            return;
        }

        if (!rbi_canEditKnowledgeBase()) {
            showToast('⛔ Ваша роль не позволяет редактировать базу знаний');
            return;
        }

        if (action === 'duplicate') {
            duplicateTwiCard(id);
            return;
        }

        if (action === 'edit') {
            if (!rbi_canDeleteKnowledgeItem(card?.owner)) {
                showToast('⚠️ Редактировать чужую инструкцию может только заместитель или администратор');
                return;
            }

            window.openTwiConstructor(id);
            return;
        }

        if (action === 'delete') {
            deleteTwiCard(id);
        }
    }, 350);
}

async function duplicateTwiCard(id) {
    if (!rbi_requireKnowledgeEditRight()) return;
    const card = customTwiCards.find(c => c.id === id);
    if (!card) return;
    const newCard = JSON.parse(JSON.stringify(card));
    newCard.id = 'twi_' + Date.now().toString(36);
    newCard.owner = rbi_getCurrentUserNameSafe();
    newCard.source = 'local';
    newCard.syncStatus = 'not_synced';
    newCard.sync_status = 'not_synced';
    newCard.syncBlockReason = '';
    newCard.sync_block_reason = '';
    newCard.createdAt = new Date().toISOString();
    newCard.updatedAt = newCard.createdAt;
    newCard.title = newCard.title + ' (Копия)';
    customTwiCards.push(newCard);
    window.customTwiCards = customTwiCards;

    const st = _storage();
    const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});
    try {
        await st.put(stores.TWI_CARDS, newCard);
        showToast("✅ Карта дублирована");
        window.renderTwiList();
    } catch (e) { showToast("❌ Ошибка при дублировании"); }
}

function changeTwiType(type) {
    currentTwiType = type;
    window.currentTwiType = currentTwiType;
    const btns = ['inspector', 'worker', 'pdf'];
    btns.forEach(b => {
        const btnEl = document.getElementById(`twi-type-btn-${b}`);
        if (btnEl) btnEl.className = "flex-1 py-2.5 text-[10px] font-bold uppercase rounded-lg text-slate-500 hover:text-slate-700 transition-all bg-transparent border border-transparent shadow-none flex items-center justify-center gap-1.5";
    });

    const activeBtn = document.getElementById(`twi-type-btn-${type.toLowerCase()}`);
    if (activeBtn) activeBtn.className = "flex-1 py-2.5 text-[10px] font-bold uppercase rounded-lg bg-indigo-50 shadow-sm text-indigo-600 border border-indigo-200 transition-all flex items-center justify-center gap-1.5";

    document.getElementById('twi-block-inspector').classList.add('hidden');
    document.getElementById('twi-block-worker').classList.add('hidden');
    document.getElementById('twi-block-pdf').classList.add('hidden');
    document.getElementById(`twi-block-${type.toLowerCase()}`).classList.remove('hidden');
}

function populateTwiItemSelect(selectedItemId = null) {
    const checklistKey = document.getElementById('twi-checklist-select').value;
    const itemSelect = document.getElementById('twi-item-select');

    if (!checklistKey) {
        itemSelect.innerHTML = '<option value="" disabled selected>Сначала выберите чек-лист выше...</option>';
        document.getElementById('twi-auto-norm-text').innerText = 'Выберите пункт чек-листа...';
        return;
    }

    let checklistGroups = [];
    const type = checklistKey.split('_')[0];
    const key = checklistKey.replace(type + '_', '');

    if (type === 'sys' && _templates().getSystemTemplates()[key]) checklistGroups = _templates().getSystemTemplates()[key].groups;
    else if (type === 'user' && _templates().getUserTemplates()[key]) checklistGroups = _templates().getUserTemplates()[key].groups;

    if (checklistGroups.length === 0) {
        itemSelect.innerHTML = '<option value="" disabled selected>Чек-лист пуст...</option>';
        return;
    }

    let optionsHtml = '<option value="ALL" class="font-bold text-indigo-600">📘 Привязать ко всему виду работ</option>';
    optionsHtml += '<option value="" disabled>--- Или выберите конкретный пункт ---</option>';

    checklistGroups.forEach(g => {
        optionsHtml += `<optgroup label="${g.group || g.title}">`;
        g.items.forEach(i => { optionsHtml += `<option value="${i.id}">[B${i.w}] ${i.n}</option>`; });
        optionsHtml += `</optgroup>`;
    });

    itemSelect.innerHTML = optionsHtml;

    if (selectedItemId) {
        itemSelect.value = String(selectedItemId);
        autoFillTwiNorm();
    } else {
        document.getElementById('twi-auto-norm-text').innerText = 'Справочная информация не найдена';
    }
}

function autoFillTwiNorm() {
    const checklistKey = document.getElementById('twi-checklist-select').value;
    const itemId = document.getElementById('twi-item-select').value;
    const normTextEl = document.getElementById('twi-auto-norm-text');

    if (!checklistKey || !itemId || itemId === 'ALL') {
        normTextEl.innerText = 'Общая инструкция (Норматив не привязан)';
        return;
    }

    const type = checklistKey.split('_')[0];
    const key = checklistKey.replace(type + '_', '');
    const checklistGroups = type === 'sys' && _templates().getSystemTemplates()[key] ? _templates().getSystemTemplates()[key].groups : (_templates().getUserTemplates()[key] ? _templates().getUserTemplates()[key].groups : []);

    const item = getFlatList(checklistGroups).find(x => String(x.id) === String(itemId));
    if (item && item.t) {
        const cleanNorm = item.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ");
        normTextEl.innerText = cleanNorm;
        normTextEl.dataset.raw = cleanNorm;
    } else {
        normTextEl.innerText = 'Норматив для этого пункта не заполнен';
        normTextEl.dataset.raw = '';
    }
}

window.searchNormFromTwi = function () {
    const textEl = document.getElementById('twi-auto-norm-text');
    const text = textEl.dataset.raw || textEl.innerText;

    if (!text || text.includes('не заполнен') || text.includes('Выберите')) {
        return showToast('Сначала выберите пункт с заполненным нормативом');
    }

    const match = text.match(/(СП\s?\d+(\.\d+)*|ГОСТ\s?(Р\s)?\d+(-\d+)?)/i);
    const searchString = match ? match[0] : text.substring(0, 15);

    closeTwiConstructor();
    switchTab('tab-reference');
    setTimeout(() => {
        const btns = document.querySelectorAll('.sub-tab-btn');
        if (btns[1]) switchReferenceSubTab('ref-sub-docs', btns[1]);
        const searchInput = document.getElementById('doc-search-input');
        if (searchInput) {
            searchInput.value = searchString;
            currentDocFilter = 'ALL';
            window.renderDocsList();
        }
    }, 200);
};

function openNodeSelectorModal() {
    const listEl = document.getElementById('node-selector-list');

    const allNodes = [...(typeof window.SYSTEM_NODES !== 'undefined' ? window.SYSTEM_NODES : []), ...customNodes];

    listEl.innerHTML = allNodes.map(node => {
        let previewSrc = '';
        if (node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'image') {
            previewSrc = window.getPhotoSrc(node.attachments[0].url);
        } else if (node.img && !node.img.includes('application/pdf')) {
            previewSrc = window.getPhotoSrc(node.img);
        }

        const imgHtml = previewSrc
            ? `<img src="${previewSrc}" class="w-12 h-12 object-cover rounded-lg border border-slate-100 bg-white dark:bg-slate-900">`
            : `<div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-[8px] font-black text-slate-400 uppercase">📄 PDF</div>`;

        return `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer active:scale-95 transition-transform" onclick="selectNodeForTwi('${node.id}', '${(node.title || 'Узел').replace(/'/g, "\\'")}')">
            ${imgHtml}
            <div class="flex-1 min-w-0">
                <div class="text-[9px] font-black text-indigo-500 uppercase">${node.category || 'Без категории'}</div>
                <div class="text-[12px] font-bold text-slate-800 dark:text-white truncate">${node.title || 'Без названия'}</div>
            </div>
        </div>`;
    }).join('') + `<button onclick="selectNodeForTwi('', 'Не привязан')" class="w-full mt-2 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase border border-red-200 active:scale-95 transition-colors">Отвязать узел</button>`;

    const overlay = document.getElementById('node-selector-modal');
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('.transform').classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    }, 10);
}

function closeNodeSelectorModal() {
    const overlay = document.getElementById('node-selector-modal');
    overlay.classList.add('opacity-0');
    overlay.querySelector('.transform').classList.add('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

function selectNodeForTwi(id, title) {
    document.getElementById('twi-linked-node-id').value = id;
    const nameEl = document.getElementById('twi-linked-node-name');
    nameEl.innerText = title;
    nameEl.className = id ? "text-[12px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5" : "text-[12px] font-black text-slate-800 dark:text-white mt-0.5";
    closeNodeSelectorModal();
}

// === МАГИЯ РАЗМЕТКИ (ФОТО РЕДАКТОР ДЛЯ TWI) ===
let currentMarkupTarget = null;

window.triggerTwiMarkupUpload = function (target) {
    currentMarkupTarget = target;
    const inputId = target === 'GOOD' ? 'twi-photo-good-input' : 'twi-photo-bad-input';
    document.getElementById(inputId).click();
};

window.triggerTwiPhotoUpload = function (stepId) {
    currentTwiStepUploadId = stepId;
    window.currentTwiStepUploadId = currentTwiStepUploadId;
    currentMarkupTarget = 'STEP';
    document.getElementById('twi-photo-input').click();
};

window.handleTwiGoodPhotoUpload = function (event) { handleTwiMarkupUpload(event, 'GOOD'); };
window.handleTwiBadPhotoUpload = function (event) { handleTwiMarkupUpload(event, 'BAD'); };
window.handleTwiPhotoUpload = function (event) { handleTwiMarkupUpload(event, 'STEP'); };

function handleTwiMarkupUpload(event, target) {
    const file = event.target.files[0];
    if (!file) return;

    currentMarkupTarget = target;

    const reader = new FileReader();
    reader.onload = function (e) {
        window.editorImgElement = new Image();
        window.editorImgElement.onload = function () {
            document.getElementById('photo-editor-overlay').style.display = 'flex';
            document.body.classList.add('modal-open');
            initPhotoEditor();

            const saveBtn = document.querySelector('#photo-editor-overlay button.text-green-400');
            saveBtn.onclick = saveTwiMarkupPhoto;
        }
        window.editorImgElement.src = e.target.result;
    }
    reader.readAsDataURL(file);
    event.target.value = '';
}

async function saveTwiMarkupPhoto() {
    if (!window.editorCanvas || !currentMarkupTarget) return;

    const base64 = window.editorCanvas.toDataURL('image/jpeg', 0.85);
    const localUrl = await PhotoManager.saveLocal(base64, 'twi');

    if (currentMarkupTarget === 'GOOD') renderGoodPhoto(localUrl);
    else if (currentMarkupTarget === 'BAD') renderBadPhoto(localUrl);
    else if (currentMarkupTarget === 'STEP' && currentTwiStepUploadId) {
        const container = document.getElementById(currentTwiStepUploadId).querySelector('.twi-photo-container');
        const photosArr = _readTwiStepPhotos(container);
        photosArr.push(localUrl);
        container.dataset.photo = JSON.stringify(photosArr);
        container.innerHTML = renderTwiStepPhotoRow(currentTwiStepUploadId, photosArr);
    }

    showToast("📸 Фото добавлено!");

    document.getElementById('photo-editor-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    const saveBtn = document.querySelector('#photo-editor-overlay button.text-green-400');
    saveBtn.onclick = saveEditedPhoto;
    currentMarkupTarget = null;
}

function closeTwiConstructor() {
    var FD = window.RBIFormDraft;
    var wasEdit = !!window.currentEditingTwiId;
    if (FD) {
        if (!wasEdit) FD.saveNow(FD.KEYS.TWI_NEW, _rbiCollectTwiNewDraft);
        FD.unbindAutoSave(FD.KEYS.TWI_NEW);
    }
    document.getElementById('twi-list-view').classList.remove('hidden');
    document.getElementById('twi-constructor-view').classList.add('hidden');
    document.body.classList.remove('modal-open');
    currentEditingTwiId = null;
    window.currentEditingTwiId = currentEditingTwiId;
    // Сброс только если не успели сохранить «магическую» карту в этом же тике
    // (saveTwiCard сам снимает флаг до вызова close)
    if (!window._rbiMagicTwiSaving) window._rbiMagicTwiPending = false;
    window.renderTwiList();
}

// compressImageToBase64 — общий хелпер в js/shared/photo-editor.utils.js (window.*)

function renderGoodPhoto(localUrl) {
    const cont = document.getElementById('twi-photo-good-container');
    cont.dataset.photo = localUrl;
    cont.innerHTML = `<div class="relative w-full h-40 md:h-64 rounded-lg overflow-hidden border border-green-300 shadow-sm mt-1 bg-slate-50 dark:bg-slate-900"><img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-contain"><button onclick="removeTwiGoodPhoto()" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
}
function removeTwiGoodPhoto() {
    const cont = document.getElementById('twi-photo-good-container');
    cont.dataset.photo = '';
    cont.innerHTML = `<button onclick="triggerTwiMarkupUpload('GOOD')" class="w-full h-full min-h-[80px] bg-white dark:bg-slate-800 border border-dashed border-green-300 py-4 rounded-lg text-[10px] font-bold text-green-600 active:scale-95 transition-all">➕ Загрузить фото</button>`;
}

function renderBadPhoto(localUrl) {
    const cont = document.getElementById('twi-photo-bad-container');
    cont.dataset.photo = localUrl;
    cont.innerHTML = `<div class="relative w-full h-40 md:h-64 rounded-lg overflow-hidden border border-red-300 shadow-sm mt-1 bg-slate-50 dark:bg-slate-900"><img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-contain"><button onclick="removeTwiBadPhoto()" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
}
function removeTwiBadPhoto() {
    const cont = document.getElementById('twi-photo-bad-container');
    cont.dataset.photo = '';
    cont.innerHTML = `<button onclick="triggerTwiMarkupUpload('BAD')" class="w-full h-full min-h-[80px] bg-white dark:bg-slate-800 border border-dashed border-red-300 py-4 rounded-lg text-[10px] font-bold text-red-600 active:scale-95 transition-all">➕ Загрузить фото</button>`;
}

function handleTwiPdfUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { event.target.value = ''; return showToast("Файл слишком большой! Максимум 15 МБ."); }
    showToast("⚙️ Сохранение PDF в локальную базу...");
    const reader = new FileReader();
    reader.onload = async function (e) {
        const localUrl = await PhotoManager.saveLocal(e.target.result, 'twi');
        renderPdfFile(file.name, (file.size / 1024 / 1024).toFixed(1) + ' MB', localUrl);
        event.target.value = '';
    }
    reader.readAsDataURL(file);
}
function renderPdfFile(name, size, base64) {
    const cont = document.getElementById('twi-pdf-container');
    cont.dataset.pdf = base64;
    document.getElementById('twi-pdf-name').innerText = name;
    document.getElementById('twi-pdf-size').innerText = size;
    cont.classList.remove('hidden');
    cont.nextElementSibling.classList.add('hidden');
}
function removeTwiPdf() {
    const cont = document.getElementById('twi-pdf-container');
    cont.dataset.pdf = '';
    cont.classList.add('hidden');
    cont.nextElementSibling.classList.remove('hidden');
}

// =====================================================================
// РЯД МИНИАТЮР ФОТО ШАГА TWI-КАРТОЧКИ (Множественные фото в шагах, B1)
// Хранение состояния — JSON-строка массива в .twi-photo-container[data-photo]
// (единственный практичный способ хранить множественное значение в dataset.*
// без создания новой DOM-структуры хранения состояния). Нормализация через
// уже существующий window.normalizeItemPhotos (строка/undefined/массив → массив).
// =====================================================================
function renderTwiStepPhotoRow(stepId, photosArr) {
    const thumbsHtml = photosArr.map(function (src, idx) {
        return `<div class="relative shrink-0"><img src="${window.getPhotoSrc(src)}" class="w-20 h-20 rounded-lg border border-slate-200 shadow-sm object-cover" onclick="openPhotoViewer('${src}')"><button onclick="removeTwiPhoto('${stepId}', ${idx})" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold shadow-md border border-white z-10">✕</button></div>`;
    }).join('');

    const addBtnHtml = `<button onclick="triggerTwiPhotoUpload('${stepId}')" class="w-20 h-20 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[9px] uppercase active:scale-95 transition-colors flex flex-col items-center justify-center gap-1" title="${photosArr.length ? 'Добавить ещё' : 'Прикрепить фото/схему'}">📸<span>${photosArr.length ? 'Ещё' : 'Фото'}</span></button>`;

    return `<div class="flex items-center gap-2 flex-wrap mt-2">${thumbsHtml}${addBtnHtml}</div>`;
}

function addTwiStep(data = null) {
    // twiStepCount может быть обнулён извне (knowledge.legacy.js:441, js/ai.js:345)
    // через bare-присваивание — эти classic-script записи попадают в window.*
    // (implicit global), а не в этот module-scope let, поэтому читаем
    // актуальное значение из window.* перед инкрементом.
    twiStepCount = window.twiStepCount || 0;
    twiStepCount++;
    window.twiStepCount = twiStepCount;
    const stepId = `twi-step-${twiStepCount}`;
    const text = data ? data.text : '';
    const time = data ? data.time : '';
    const photosArr = window.normalizeItemPhotos(data ? data.photo : null);

    const photoHtml = renderTwiStepPhotoRow(stepId, photosArr);

    const html = `
        <div id="${stepId}" class="twi-step-item bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative transition-all">
            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                <div class="font-black text-[12px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><span class="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/50 rounded flex items-center justify-center">${twiStepCount}</span> Шаг</div>
                <button onclick="document.getElementById('${stepId}').remove()" class="text-red-400 active:scale-90 font-black text-sm px-2">✕</button>
            </div>
            <textarea class="input-base text-[12px] h-16 resize-none mb-2 twi-step-text" placeholder="Опишите действие...">${text}</textarea>
            <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase flex-1">Время на операцию:</span>
                <input type="number" class="input-base !w-24 text-center !py-1 text-[11px] twi-step-time" placeholder="Мин." value="${time}">
            </div>
            <div class="twi-photo-container" data-photo="${photosArr.length ? JSON.stringify(photosArr).replace(/"/g, '&quot;') : ''}">${photoHtml}</div>
        </div>`;
    document.getElementById('twi-steps-container').insertAdjacentHTML('beforeend', html);
}

function removeTwiPhoto(stepId, index) {
    const container = document.getElementById(stepId).querySelector('.twi-photo-container');
    const photosArr = window.normalizeItemPhotos(_readTwiStepPhotos(container));
    if (typeof index === 'number') photosArr.splice(index, 1);
    else photosArr.length = 0;
    container.dataset.photo = photosArr.length ? JSON.stringify(photosArr) : '';
    container.innerHTML = renderTwiStepPhotoRow(stepId, photosArr);
}

// Читает текущий массив фото шага из dataset.photo (JSON-строка массива,
// с обратной совместимостью на старый формат — одна строка src).
function _readTwiStepPhotos(container) {
    const raw = container.dataset.photo || '';
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : window.normalizeItemPhotos(parsed);
    } catch (e) {
        return window.normalizeItemPhotos(raw);
    }
}

function triggerTwiPhotoUpload(stepId) { currentTwiStepUploadId = stepId; window.currentTwiStepUploadId = currentTwiStepUploadId; document.getElementById('twi-photo-input').click(); }

// УДАЛЕНИЕ КАРТЫ
window.deleteTwiCard = async function (id) {
    if (id.startsWith('sys_')) return showToast("⚠️ Системные инструкции удалить нельзя!");

    const card = customTwiCards.find(c => c.id === id);
    if (!rbi_canDeleteKnowledgeItem(card?.owner)) {
        return showToast("⚠️ Инженер может удалить только свою инструкцию.");
    }
    if (!confirm('Удалить эту инструкцию? В облаке она тоже будет удалена.')) return;

    const st = _storage();
    const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});

    if (card) {
        const nowIso = new Date().toISOString();
        card._deleted = true;
        card.is_deleted = true;
        card.deleted_at = nowIso;
        card.updatedAt = nowIso;
        card.updated_at = nowIso;
        card.source = 'local';
        card.syncStatus = 'not_synced';
        card.sync_status = 'not_synced';

        await st.put(stores.TWI_CARDS, card);
    }

    showToast("🗑️ Инструкция удалена");
    customTwiCards = customTwiCards.filter(c => !c._deleted);
    window.customTwiCards = customTwiCards;
    window.renderTwiList();

    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
};

function toggleManagePanel() {
    const body = document.getElementById('ref-manage-body');
    const icon = document.getElementById('ref-manage-toggle-icon');

    if (!body || !icon) return;

    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
        body.style.maxHeight = '400px';
        body.style.opacity = '1';
        body.style.marginTop = '12px';
        icon.style.transform = 'rotate(0deg)';

        const templatesList = document.getElementById('settings-user-templates-list');
        if (templatesList) {
            const currentEngineer = _getSetting('engineerName') || 'Инженер';
            const customKeys = Object.keys(_templates().getUserTemplates()).filter(k => !_templates().getUserTemplates()[k]._deleted).sort((a, b) => _templates().getUserTemplates()[a].title.localeCompare(_templates().getUserTemplates()[b].title, 'ru'));

            let sysOptions = '<option value="" disabled selected>Выбрать системный чек-лист...</option>';
            Object.keys(_templates().getSystemTemplates()).forEach(k => {
                sysOptions += `<option value="${k}">${_templates().getSystemTemplates()[k].title}</option>`;
            });

            let html = `
                <div class="mb-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 flex gap-2 items-center shadow-sm">
                    <select id="clone-sys-select" class="input-base text-[10px] !py-1.5 flex-1">${sysOptions}</select>
                    <button onclick="cloneSystemTemplateToCustom()" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase active:scale-95 shadow-sm shrink-0">Копия</button>
                </div>
            `;

            if (customKeys.length === 0) {
                html += `<div class="text-[10px] text-slate-400 italic py-2 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Созданных чек-листов пока нет</div>`;
            } else {
                html += customKeys.map(key => {
                    const permSvc = (_ctx && _ctx.permissions) || window.RBI.services.permissions;
                    const isAdmin = permSvc ? permSvc.isAdmin() : false;
                    const isOwner = isAdmin || !_templates().getUserTemplates()[key].owner || _templates().getUserTemplates()[key].owner === currentEngineer;

                    const actionBtns = isOwner
                        ? `<button onclick="editUserTemplate('${key}')" class="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[9px] font-bold active:scale-90">Изменить</button>
                           <button onclick="deleteUserTemplate('${key}')" class="bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded text-[9px] font-bold active:scale-90">Удалить</button>`
                        : `<div class="text-[8px] font-bold text-slate-400">Автор: ${_templates().getUserTemplates()[key].owner}</div>`;

                    return `
                    <div class="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl mb-1.5 shadow-sm">
                        <div class="min-w-0 pr-2">
                            <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate leading-tight">${_templates().getUserTemplates()[key].title}</div>
                            <div class="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">${_templates().getUserTemplates()[key].groups?.length || 0} этапов</div>
                        </div>
                        <div class="flex gap-1.5 shrink-0">${actionBtns}</div>
                    </div>
                `}).join('');
            }
            templatesList.innerHTML = html;
        }
    } else {
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        icon.style.transform = 'rotate(-90deg)';
    }
}

// =========================================================================
// БЛОК: БИБЛИОТЕКА ТЕХНИЧЕСКИХ УЗЛОВ И КОНСТРУКТОР
// =========================================================================

let customNodes = window.customNodes || [];

// Загрузка пользовательских узлов при старте
document.addEventListener("DOMContentLoaded", async () => {
    const st = _storage();
    const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});
    try {
        const storedNodes = await st.getAll(stores.CUSTOM_NODES);
        if (storedNodes && storedNodes.length > 0) {
            customNodes = storedNodes.filter(n => !n._deleted);
            window.customNodes = customNodes;
        }
    } catch (e) { console.error("Ошибка загрузки узлов", e); }
});

// Анимация меню управления узлами
function toggleNodeManagePanel() {
    const body = document.getElementById('node-manage-body');
    const icon = document.getElementById('node-manage-toggle-icon');
    if (!body || !icon) return;
    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
        body.style.maxHeight = '200px';
        body.style.opacity = '1';
        body.style.marginTop = '12px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        icon.style.transform = 'rotate(-90deg)';
    }
}

// ЭКСПОРТ (ВЫГРУЗКА В JSON)
function exportNodeJson() {
    if (customNodes.length === 0) return showToast('Нет созданных узлов для экспорта');
    const dataStr = JSON.stringify(customNodes, null, 4);
    downloadFile(dataStr, `RBI_Nodes_${new Date().toLocaleDateString('ru-RU')}.json`, 'application/json');
    showToast("✅ JSON-файл с узлами скачан!");
}

// ЭКСПОРТ В КОД (ДЛЯ system_nodes.js)
function exportNodeJsCode() {
    if (customNodes.length === 0) return showToast('Нет узлов для выгрузки в код');

    let jsCode = "/* Сгенерировано из RBI Quality (Пользовательские Узлы) */\n\nconst CUSTOM_SYSTEM_NODES = [\n";
    customNodes.forEach((n, idx) => {
        const comma = idx < customNodes.length - 1 ? ',' : '';
        jsCode += `    {\n`;
        jsCode += `        id: '${n.id}',\n`;
        jsCode += `        category: '${n.category}',\n`;
        jsCode += `        title: '${n.title.replace(/'/g, "\\'")}',\n`;
        jsCode += `        desc: '${(n.desc || '').replace(/'/g, "\\'")}',\n`;
        jsCode += `        img: '${n.img}',\n`;
        jsCode += `        attachments: ${JSON.stringify(n.attachments || [])},\n`;
        jsCode += `        materials: ${JSON.stringify(n.materials)},\n`;
        jsCode += `        linkedDoc: '${(n.linkedDoc || '').replace(/'/g, "\\'")}',\n`;
        jsCode += `        linkedTwiChecklistKey: ${n.linkedTwiChecklistKey ? "'" + n.linkedTwiChecklistKey + "'" : "null"}\n`;
        jsCode += `    }${comma}\n`;
    });
    jsCode += "];\n";

    downloadFile(jsCode, `rbi_nodes_code_${new Date().toLocaleDateString('ru-RU')}.js`, 'application/javascript');
    showToast("✅ Код JS скопирован и скачан!");
}

// ИМПОРТ (ЗАГРУЗКА ИЗ JSON)
function processNodeImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Неверный формат");

            const st = _storage();
            const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});
            let addedCount = 0;
            for (const item of data) {
                if (!customNodes.find(x => x.id === item.id) && !window.SYSTEM_NODES.find(x => x.id === item.id)) {
                    customNodes.push(item);
                    window.customNodes = customNodes;
                    addedCount++;
                }
            }

            await st.put(stores.SETTINGS, { key: 'custom_nodes', data: customNodes });
            showToast(`✅ Импорт завершен! Добавлено узлов: ${addedCount}`);
            window.renderNodesList();
        } catch (err) {
            console.error(err);
            alert("Ошибка импорта. Проверьте формат файла.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// === 2. ОТКРЫТИЕ УНИВЕРСАЛЬНОЙ ЧИТАЛКИ ИНСТРУКЦИЙ (БЕЗ ЭМОДЗИ) ===
// Перенесено из js/app.js (строки 776-1232).
window.openTwiViewer = async function (twiId) {
    const card = customTwiCards.find(c => c.id === twiId);
    if (!card) return showToast('Ошибка: Инструкция не найдена');
    if (typeof gameLogAction === 'function') {
        _gameLogAction('open_twi', twiId);
    }
    const overlayElement = document.getElementById('twi-viewer-overlay');
    if (overlayElement) overlayElement.dataset.currentTwiId = twiId;

    document.getElementById('viewer-twi-checklist').innerText = card.checklistName;
    document.getElementById('viewer-twi-title').innerText = card.title;

    const badgeEl = document.getElementById('viewer-twi-badge');
    const infoPanel = document.getElementById('viewer-twi-info-panel');
    const footer = document.getElementById('viewer-twi-footer');
    const content = document.getElementById('viewer-twi-content');

    content.innerHTML = '';
    content.classList.remove('p-0');

    // === ТИП 1: КАРТА ИНСПЕКТОРА (Правильно / Неправильно) ===
    if (card.type === 'INSPECTOR') {
        badgeEl.innerText = 'Технадзор';
        badgeEl.className = 'bg-blue-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
        infoPanel.classList.add('hidden');
        footer.classList.remove('hidden');
        content.classList.remove('p-0');

        let resolvedGood = card.photoGood ? await PhotoManager.getAsyncUrl(card.photoGood) || window.getPhotoSrc(card.photoGood) : null;
        let resolvedBad = card.photoBad ? await PhotoManager.getAsyncUrl(card.photoBad) || window.getPhotoSrc(card.photoBad) : null;

        let photoGoodHtml = resolvedGood ? `
            <div class="relative rounded-xl overflow-hidden shadow-sm border-2 border-green-500 cursor-pointer active:scale-95 transition-transform bg-slate-50 dark:bg-slate-900" onclick="openPhotoViewer('${card.photoGood}')">
                <div class="absolute top-0 left-0 w-full bg-gradient-to-b from-green-600/90 to-transparent p-2 text-white font-black text-[10px] uppercase tracking-widest drop-shadow-md flex items-center gap-1.5 z-10"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Правильно</div>
                <img src="${resolvedGood}" class="w-full h-48 md:h-64 object-contain">
            </div>` : `<div class="h-48 md:h-64 rounded-xl border-2 border-dashed border-green-300 flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500"><svg class="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="font-bold text-[9px] uppercase">Нет фото эталона</span></div>`;

        let photoBadHtml = resolvedBad ? `
            <div class="relative rounded-xl overflow-hidden shadow-sm border-2 border-red-500 cursor-pointer active:scale-95 transition-transform bg-slate-50 dark:bg-slate-900" onclick="openPhotoViewer('${card.photoBad}')">
                <div class="absolute top-0 left-0 w-full bg-gradient-to-b from-red-600/90 to-transparent p-2 text-white font-black text-[10px] uppercase tracking-widest drop-shadow-md flex items-center gap-1.5 z-10"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg> Брак</div>
                <img src="${resolvedBad}" class="w-full h-48 md:h-64 object-contain">
            </div>` : `<div class="h-48 md:h-64 rounded-xl border-2 border-dashed border-red-300 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500"><svg class="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="font-bold text-[9px] uppercase">Нет фото брака</span></div>`;

        let normText = 'Норматив не указан';
        const activeChecklist = (window.AuditState && window.AuditState.currentChecklist) || currentChecklist;
        const flatList = getFlatList(activeChecklist.length > 0 ? activeChecklist : []);
        const itemInfo = flatList.find(i => i.id == card.itemId);
        if (itemInfo) normText = itemInfo.t || normText;

        content.innerHTML = `
            <div class="p-4 space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    ${photoGoodHtml}
                    ${photoBadHtml}
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div class="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span class="w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></span>
                        <h4 class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Почему это важно (Риски)</h4>
                    </div>
                    <div class="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${card.whyImportant || 'Обоснование не заполнено'}</div>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div class="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span class="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></span>
                        <h4 class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Как проверять (Методика)</h4>
                    </div>
                    <div class="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${card.howToCheck || 'Методика не заполнена'}</div>
                    <div class="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Справочно (СНиП / ГОСТ):</div>
                        <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">${normText}</div>
                    </div>
                </div>
            </div>
        `;
    }
    // === ТИП 2: ПОШАГОВЫЙ TWI РАБОЧЕГО ===
    else if (card.type === 'WORKER') {
        badgeEl.innerText = 'Инструкция';
        badgeEl.className = 'bg-orange-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';

        infoPanel.classList.remove('hidden');
        footer.classList.remove('hidden');
        content.classList.remove('p-0');

        document.getElementById('viewer-twi-time').innerText = `~${card.totalTime || 0} мин`;
        document.getElementById('viewer-twi-steps-count').innerText = `${card.steps ? card.steps.length : 0} шагов`;

        let stepsHtml = '<div class="p-4 space-y-4">';
        if (card.steps && card.steps.length > 0) {
            for (let step of card.steps) {
                let resolvedStepPhoto = step.photo ? await PhotoManager.getAsyncUrl(step.photo) || window.getPhotoSrc(step.photo) : null;

                const photoHtml = resolvedStepPhoto ? `
                    <div class="mt-3 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative group" onclick="openPhotoViewer('${step.photo}')">
                        <img src="${resolvedStepPhoto}" class="w-full h-40 object-cover active:scale-95 transition-transform origin-center cursor-pointer">
                        <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold uppercase px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg> Увеличить</div>
                    </div>
                ` : '';

                stepsHtml += `
                    <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                        <div class="flex justify-between items-start mb-2">
                            <div class="font-black text-orange-600 dark:text-orange-400 text-[11px] uppercase tracking-wider bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">Шаг ${step.order}</div>
                            ${step.time ? `<div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${step.time} мин</div>` : ''}
                        </div>
                        <div class="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">${step.text}</div>
                        ${photoHtml}
                    </div>
                `;
            }
        } else {
            stepsHtml += `<div class="text-center text-slate-500 text-sm font-bold py-10">Шаги не заполнены</div>`;
        }
        stepsHtml += '</div>';
        content.innerHTML = stepsHtml;
    }
    // === ТИП 3: ВНЕШНИЙ PDF-ДОКУМЕНТ ===
    else if (card.type === 'PDF') {
        await window.rbiOpenPdfInTwiViewer(
            card.pdfData,
            card.title,
            card.checklistName || 'TWI / Регламент',
            card.pdfName || card.title || 'document.pdf',
            card.pdfSize || ''
        );
        return;

        badgeEl.innerText = 'PDF-Файл';
        badgeEl.className = 'bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
        infoPanel.classList.add('hidden');
        footer.classList.add('hidden');
        content.classList.add('p-0');

        if (card.pdfData) {
            try {
                let blobUrl = '';
                if (card.pdfData.startsWith('data:application/pdf')) {
                    const byteCharacters = atob(card.pdfData.split(',')[1]);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    blobUrl = URL.createObjectURL(blob);
                } else {
                    blobUrl = await PhotoManager.getAsyncUrl(card.pdfData) || PhotoManager.getSrc(card.pdfData);
                }
                const isAndroid = /Android/i.test(navigator.userAgent);
                content.innerHTML = `
                    <div class="w-full h-full flex flex-col relative bg-slate-100 dark:bg-slate-900">
                        <div class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 p-2 text-[10px] text-center font-bold flex justify-between items-center shrink-0 border-b border-indigo-100 dark:border-indigo-800">
                            <span>📱 Не листается вниз? Откройте в читалке 👉</span>
                            <a href="${blobUrl}" target="_blank" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase tracking-widest">Открыть</a>
                        </div>
                        <div style="-webkit-overflow-scrolling: touch; overflow-y: auto; flex: 1; width: 100%; min-height: 60vh;">
                            ${isAndroid ? `
    <div class="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-900">
        <div class="text-[13px] font-black text-slate-800 dark:text-white mb-2">PDF готов к открытию</div>
        <div class="text-[10px] font-bold text-slate-500 mb-4">На Android PDF надежнее открывать системной читалкой.</div>
        <a href="${blobUrl}" target="_blank" download="${card.pdfName || 'document.pdf'}"
           class="bg-red-600 text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase shadow-md">
           Открыть PDF
        </a>
    </div>
` : `
    <object data="${blobUrl}#view=FitH" type="application/pdf" class="w-full h-full border-none bg-white dark:bg-slate-800" style="min-height: 60vh;">
        <embed src="${blobUrl}#view=FitH" type="application/pdf" class="w-full h-full" />
    </object>
`}
                        </div>
                        <div class="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10">
                            <div class="min-w-0 pr-2 flex-1">
                                <div class="text-[11px] font-black text-slate-800 dark:text-white truncate">${card.pdfName || 'Документ.pdf'}</div>
                                <div class="text-[9px] font-bold text-slate-500">${card.pdfSize || 'Загружено из облака'}</div>
                            </div>
                            <div class="flex gap-2 shrink-0">
                                <a href="${blobUrl}" target="_blank" download="${card.pdfName || 'document.pdf'}" class="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex items-center justify-center" title="Скачать файл">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                content.dataset.blobUrl = blobUrl;
            } catch (err) {
                console.error(err);
                content.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-6 text-center"><div class="text-sm font-bold text-slate-500">Не удалось открыть PDF.</div></div>`;
            }
        } else {
            content.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-6 text-center"><div class="text-sm font-bold text-slate-500">PDF файл отсутствует.</div></div>`;
        }
    }
    // === СКВОЗНЫЕ ССЫЛКИ (ЭКОСИСТЕМА) ===
    let crossLinksHtml = '';
    // Ссылка на Видео
    if (card.videoLink) {
        crossLinksHtml += `
            <a href="${card.videoLink}" target="_blank" class="w-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Смотреть видеоинструкцию
            </a>`;
    }

    // Ссылка на Узел
    if (card.linkedNodeId) {
        crossLinksHtml += `
            <button onclick="closeTwiViewer(); setTimeout(()=>openNodeViewer('${card.linkedNodeId}'), 300)" class="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                Открыть Технический Узел
            </button>`;
    }

    // Ссылка на Норматив (НД)
    if (card.linkedDocId) {
        crossLinksHtml += `
            <button onclick="closeTwiViewer(); setTimeout(()=>openDocViewer('${card.linkedDocId}'), 300)" class="w-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                Смотреть Норматив (ГОСТ/СП)
            </button>`;
    }

    // Добавляем кнопки в конец контента (если они есть)
    if (crossLinksHtml) {
        content.insertAdjacentHTML('beforeend', `
            <div class="p-4 border-t border-slate-200 dark:border-slate-700 mt-4 bg-slate-100 dark:bg-slate-900/50">
                <div class="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest text-center">Связанные материалы</div>
                ${crossLinksHtml}
            </div>
        `);
    }
    const overlay = document.getElementById('twi-viewer-overlay');
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => { overlay.classList.remove('opacity-0'); }, 10);
};
// === RBI UNIVERSAL PDF VIEWER FIX v17.8.206 ===
// === RBI UNIVERSAL PDF VIEWER FIX v17.8.207 ===
window.rbiOpenPdfInTwiViewer = async function (pdfData, title, subtitle, fileName, fileSize) {
    const overlay = document.getElementById('twi-viewer-overlay');
    const content = document.getElementById('viewer-twi-content');
    const titleEl = document.getElementById('viewer-twi-title');
    const badgeEl = document.getElementById('viewer-twi-badge');
    const infoPanel = document.getElementById('viewer-twi-info-panel');
    const footer = document.getElementById('viewer-twi-footer');

    if (!overlay || !content) return showToast('Окно PDF не найдено');

    if (content.dataset.blobUrl && content.dataset.blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(content.dataset.blobUrl);
    }

    content.dataset.blobUrl = '';
    content.innerHTML = '';
    content.className = 'flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 p-0';

    if (titleEl) titleEl.innerText = title || 'PDF документ';

    if (badgeEl) {
        badgeEl.innerText = 'PDF';
        badgeEl.className = 'bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
    }

    if (infoPanel) infoPanel.classList.add('hidden');
    if (footer) footer.classList.add('hidden');

    try {
        let pdfBase64 = null;
        let pdfArrayBuffer = null;

        if (String(pdfData).startsWith('local://') || String(pdfData).startsWith('cloud://')) {
            pdfBase64 = await PhotoManager.getBase64(pdfData);
            pdfArrayBuffer = await base64ToArrayBuffer(pdfBase64);
        } else if (String(pdfData).startsWith('data:application/pdf')) {
            pdfBase64 = pdfData;
            pdfArrayBuffer = await base64ToArrayBuffer(pdfData);
        } else if (String(pdfData).startsWith('http')) {
            const res = await rbiFetchCloudFileNoBrowserCache(pdfData);
            if (!res.ok) throw new Error('PDF не скачался');
            pdfArrayBuffer = await res.arrayBuffer();
        } else {
            const realUrl = await PhotoManager.getAsyncUrl(pdfData) || pdfData;
            const res = await fetch(realUrl, { cache: 'no-store' });
            pdfArrayBuffer = await res.arrayBuffer();
        }

        const blob = new Blob([pdfArrayBuffer.slice(0)], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        content.dataset.blobUrl = blobUrl;

        content.innerHTML = `
            <div class="sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 p-2 text-[10px] font-bold flex justify-between items-center border-b border-indigo-100 dark:border-indigo-800">
                <span class="truncate pr-2">${subtitle || 'PDF документ'}</span>
                <div class="flex gap-2 shrink-0">
    <button onclick="window.open('${blobUrl}', '_blank')"
        class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase tracking-widest">
        Открыть стандартно
    </button>

    <a href="${blobUrl}" target="_blank" download="${fileName || 'document.pdf'}"
       class="bg-slate-700 text-white px-3 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase tracking-widest">
       Скачать
    </a>
</div>
            </div>
            <div id="rbi-pdf-pages" class="p-3 space-y-3"></div>
        `;

        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);

        const pagesRoot = document.getElementById('rbi-pdf-pages');
        const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            const containerWidth = Math.min(window.innerWidth - 24, 1100);
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / baseViewport.width;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.className = 'w-full bg-white rounded-xl shadow-sm border border-slate-200';
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            pagesRoot.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            await page.render({
                canvasContext: ctx,
                viewport
            }).promise;
        }

    } catch (e) {
        console.error('[Universal PDF Viewer]', e);
        content.innerHTML = `
            <div class="p-6 text-center">
                <div class="text-red-600 font-black text-[13px] mb-2">PDF не удалось открыть</div>
                <div class="text-slate-500 text-[11px]">Попробуйте синхронизировать файлы или открыть документ повторно.</div>
            </div>
        `;
        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    }
};
window.closeTwiViewer = function () {
    const overlay = document.getElementById('twi-viewer-overlay');
    const content = document.getElementById('viewer-twi-content');

    overlay.classList.add('opacity-0');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');

        // Очищаем оперативную память от временного файла (Blob)
        if (content.dataset.blobUrl && content.dataset.blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(content.dataset.blobUrl);
            content.dataset.blobUrl = '';
        }

        content.innerHTML = '';
        customTwiCards = customTwiCards.filter(c => !c._tempViewerOnly);
        window.customTwiCards = customTwiCards;
    }, 300);
};

// === МЕНЮ СПРАВКИ В КАРТОЧКЕ ДЕФЕКТА (БЕЗ ЭМОДЗИ) ===
window.openItemHelpMenu = function (id, event) {
    if (event) event.stopPropagation();

    const flat = getFlatList((window.AuditState && window.AuditState.currentChecklist) || currentChecklist);
    const itemData = flat.find(x => x.id === id);
    if (!itemData) return;

    document.getElementById('help-modal-title').innerText = itemData.n;

    const inspectorCard = customTwiCards.find(c => c.type === 'INSPECTOR' && String(c.itemId) === String(id));
    const generalCards = customTwiCards.filter(c =>
        (c.type === 'WORKER' || c.type === 'PDF') &&
        c.checklistKey === ((window.AuditState && window.AuditState.currentTemplateKey) || currentTemplateKey) &&
        (String(c.itemId) === String(id) || c.itemId === 'ALL' || !c.itemId)
    );

    const listContainer = document.getElementById('help-modal-list');
    let html = '';

    if (inspectorCard) {
        html += `
            <div class="bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-xl p-3 shadow-md flex items-center justify-between cursor-pointer active:scale-95 transition-transform mb-4" 
                 onclick="closeItemHelpMenu(); setTimeout(() => openTwiViewer('${inspectorCard.id}'), 300)">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </div>
                    <div>
                        <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Карта Технадзора</div>
                        <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight">Эталон и примеры брака</div>
                    </div>
                </div>
                <div class="text-blue-500 font-black"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg></div>
            </div>
        `;
    }

    if (generalCards.length > 0) {
        html += `<div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1 border-b border-slate-200 dark:border-slate-700 pb-2 mt-2">Инструкции к виду работ</div>`;

        generalCards.forEach(c => {
            const isPdf = c.type === 'PDF';
            const iconSvg = isPdf
                ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
                : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';

            const colorClass = isPdf ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-orange-500 bg-orange-50 dark:bg-orange-900/30';
            const typeName = isPdf ? 'Внешний PDF-Регламент' : 'Пошаговое руководство (TWI)';

            html += `
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-transform" 
                     onclick="closeItemHelpMenu(); setTimeout(() => openTwiViewer('${c.id}'), 300)">
                    <div class="flex items-center gap-3 min-w-0 pr-2">
                        <div class="w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center shrink-0">${iconSvg}</div>
                        <div class="min-w-0">
                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">${typeName}</div>
                            <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight truncate">${c.title}</div>
                        </div>
                    </div>
                    <div class="text-slate-400 shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg></div>
                </div>
            `;
        });
    }

    listContainer.innerHTML = html;

    const overlay = document.getElementById('item-help-modal-overlay');
    const content = document.getElementById('item-help-modal-content');

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => { content.classList.remove('translate-y-full'); }, 10);
};

window.closeItemHelpMenu = function () {
    const overlay = document.getElementById('item-help-modal-overlay');
    const content = document.getElementById('item-help-modal-content');

    content.classList.add('translate-y-full');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
};

// === ВЫБОР СПОСОБА ПЕЧАТИ TWI-ИНСТРУКЦИИ (перенесено 1:1 из app.js) ===
window.showTwiPrintOptions = function () {
    const twiId = document.getElementById('twi-viewer-overlay').dataset.currentTwiId;
    if (!twiId) return;

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[14px] flex items-center justify-center border border-slate-200 dark:border-slate-700 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg></div>`;
    document.getElementById('modal-title').innerText = "Печать Инструкции";
    document.getElementById('modal-body').innerHTML = `
        <div class="space-y-2">
            <button onclick="closeModal(); setTimeout(()=>window.RBI.services.reports.printTwi('script'), 300)" class="w-full text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></div>
                <div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Скачать PDF файл</div>
                    <div class="text-[10px] text-slate-500 font-bold mt-0.5">Сохранить в память устройства</div>
                </div>
            </button>
            <button onclick="closeModal(); setTimeout(()=>window.RBI.services.reports.printTwi('browser'), 300)" class="w-full text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                <div class="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg></div>
                <div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Печать через принтер</div>
                    <div class="text-[10px] text-slate-500 font-bold mt-0.5">Системное диалоговое окно (A4)</div>
                </div>
            </button>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

window.openNodeViewer = async function (nodeId) {
    const allNodes = [...(typeof window.SYSTEM_NODES !== 'undefined' ? window.SYSTEM_NODES : []), ...customNodes];
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    const titleEl = document.getElementById('viewer-node-title');
    if (titleEl) titleEl.innerText = node.title;

    const descEl = document.getElementById('viewer-node-desc');
    if (descEl) descEl.innerText = node.desc || 'Описание отсутствует';

    const catEl = document.getElementById('viewer-node-category');
    if (catEl) catEl.innerText = node.category;

    const attContainer = document.getElementById('viewer-node-attachments');
    if (attContainer) {
        attContainer.innerHTML = '<div class="text-[10px] text-center text-slate-400 py-4 animate-pulse">Загрузка файлов...</div>';

        let files = node.attachments || [];
        if (files.length === 0 && node.img) {
            files = [{ type: 'image', url: node.img }];
        }

        if (files.length === 0) {
            attContainer.innerHTML = '<div class="text-[10px] text-center text-slate-400 py-4">Нет вложенных файлов</div>';
        } else {
            let html = '';
            for (let file of files) {
                if (file.type === 'image') {
                    const realSrc = await PhotoManager.getAsyncUrl(file.url) || window.getPhotoSrc(file.url);
                    html += `
                    <div class="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm mb-3 bg-white dark:bg-slate-800" onclick="openPhotoViewer('${file.url}')">
                        <img src="${realSrc}" class="w-full h-full object-contain">
                        <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold uppercase px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">🔍 Увеличить</div>
                    </div>`;
                } else if (file.type === 'pdf' || (file.url && file.url.includes('application/pdf'))) {
                    html += `
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex justify-between items-center cursor-pointer active:scale-95 transition-transform mb-3" onclick="window.openNodeAttachmentPdf('${file.url}', '${file.name || 'Документ'}', '${file.size || ''}')">
                        <div class="flex items-center gap-3 min-w-0 pr-2">
                            <div class="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0 font-black">PDF</div>
                            <div class="truncate min-w-0">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">${file.name || 'Документ.pdf'}</div>
                                <div class="text-[9px] text-slate-500">${file.size || 'PDF Файл'}</div>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold text-red-600 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-red-200 dark:border-red-800">Открыть</span>
                    </div>`;
                }
            }
            attContainer.innerHTML = html;
        }
    }

    const matTbody = document.getElementById('viewer-node-materials');
    if (matTbody) {
        if (node.materials && node.materials.length > 0) {
            matTbody.innerHTML = node.materials.map(m => `
                <tr class="border-b border-slate-100 dark:border-slate-700">
                    <td class="p-2 font-medium text-slate-700 dark:text-slate-300 text-[12px]">${m.name}</td>
                    <td class="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap text-[12px]">${m.qty}</td>
                </tr>
            `).join('');
            matTbody.parentElement.parentElement.classList.remove('hidden');
        } else {
            matTbody.parentElement.parentElement.classList.add('hidden');
        }
    }

    const linksEl = document.getElementById('viewer-node-links');
    if (linksEl) {
        const isSystem = !customNodes.find(n => n.id === nodeId);
        const isOwner = !node.owner || node.owner === (_getSetting('engineerName') || 'Инженер');

        let deleteBtnHtml = '';
        if (!isSystem && isOwner) {
            deleteBtnHtml = `<button onclick="closeNodeViewer(); deleteNode('${node.id}')" class="bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 py-3 rounded-xl text-[10px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mt-2 col-span-full">
                <span>🗑️</span> Удалить узел
            </button>`;
        }

        let docActionHtml = '';
        if (node.linkedDoc) {
            let docAction = `findAndOpenND('${node.linkedDoc || ''}')`;
            if (node.linkedDoc.startsWith('sys_') || node.linkedDoc.startsWith('usr_')) { docAction = `openDocViewer('${node.linkedDoc}')`; }
            docActionHtml = `<button onclick="closeNodeViewer(); setTimeout(()=>${docAction}, 300)" class="bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 py-3.5 rounded-xl text-[11px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Норматив
            </button>`;
        }

        let twiActionHtml = '';
        if (node.linkedTwiId) {
            twiActionHtml = `<button onclick="closeNodeViewer(); setTimeout(()=>openTwiViewer('${node.linkedTwiId}'), 300)" class="bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-3.5 rounded-xl text-[11px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> TWI Карта
            </button>`;
        }

        let chkActionHtml = '';
        const checklistKey = node.linkedChecklistKey || node.linkedTwiChecklistKey;
        if (checklistKey && !checklistKey.includes('|')) {
            chkActionHtml = `<button onclick="closeNodeViewer(); switchTab('tab-audit'); setTimeout(()=>window.changeTemplate('${checklistKey}'), 300)" class="bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400 py-3.5 rounded-xl text-[11px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 w-full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg> Чек-лист
            </button>`;
        }

        linksEl.className = "grid grid-cols-1 gap-2 mt-4";
        linksEl.innerHTML = `
            ${docActionHtml}
            ${twiActionHtml}
            ${chkActionHtml}
            ${deleteBtnHtml}
        `;
    }

    const overlay = document.getElementById('node-viewer-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    }
};

// КОНСТРУКТОР УЗЛОВ
window.currentEditingNodeId = null;

window.openNodeConstructor = function (editId = null) {
    document.getElementById('nodes-main-view').classList.add('hidden');
    const view = document.getElementById('node-constructor-view');
    view.classList.remove('hidden');
    document.body.classList.add('modal-open');
    view.scrollTo(0, 0);

    var FD = window.RBIFormDraft;
    if (FD) FD.unbindAutoSave(FD.KEYS.NODE_NEW);

    window.currentEditingNodeId = editId;

    const selectDoc = document.getElementById('node-linked-doc');
    let docOptions = '<option value="">-- Без привязки к НД --</option>';
    const allDocs = [...(typeof window.SYSTEM_DOCS !== 'undefined' ? window.SYSTEM_DOCS : []), ...(typeof customDocs !== 'undefined' ? customDocs : [])];
    allDocs.sort((a, b) => a.code.localeCompare(b.code)).forEach(doc => {
        const shortTitle = doc.title.length > 40 ? doc.title.substring(0, 40) + '...' : doc.title;
        docOptions += `<option value="${doc.id}">${doc.code} - ${shortTitle}</option>`;
    });
    selectDoc.innerHTML = docOptions;

    const selectTwi = document.getElementById('node-linked-twi');
    let twiOptions = '<option value="">-- Без привязки к TWI --</option>';
    customTwiCards.forEach(card => {
        const typePrefix = card.type === 'INSPECTOR' ? '[Надзор]' : (card.type === 'WORKER' ? '[Шаги]' : '[PDF]');
        twiOptions += `<option value="${card.id}">${typePrefix} ${card.title}</option>`;
    });
    selectTwi.innerHTML = twiOptions;

    const selectChecklist = document.getElementById('node-linked-checklist');
    let chkOptions = '<option value="">-- Без привязки к Чек-листу --</option>';
    Object.keys(_templates().getSystemTemplates()).sort().forEach(key => { chkOptions += `<option value="sys_${key}">[СИС] ${_templates().getSystemTemplates()[key].title}</option>`; });
    Object.keys(_templates().getUserTemplates()).sort().forEach(key => { chkOptions += `<option value="user_${key}">[МОЙ] ${_templates().getUserTemplates()[key].title}</option>`; });
    selectChecklist.innerHTML = chkOptions;

    document.getElementById('node-materials-container').innerHTML = '';

    if (editId) {
        const allNodes = [...(typeof window.SYSTEM_NODES !== 'undefined' ? window.SYSTEM_NODES : []), ...customNodes];
        const node = allNodes.find(n => n.id === editId);
        if (node) {
            document.getElementById('node-title-input').value = node.title || '';
            document.getElementById('node-desc-input').value = node.desc || '';
            document.getElementById('node-category-input').value = node.category || 'ФАСАД';

            selectDoc.value = node.linkedDoc || '';
            selectTwi.value = node.linkedTwiId || '';
            selectChecklist.value = node.linkedChecklistKey || node.linkedTwiChecklistKey || '';

            window.currentNodeAttachments = node.attachments ? [...node.attachments] : [];
            if (window.currentNodeAttachments.length === 0 && node.img) {
                window.currentNodeAttachments.push({ type: 'image', url: node.img, name: 'Фото' });
            }
            if (typeof window.renderNodeAttachmentsUI === 'function') window.renderNodeAttachmentsUI();

            if (node.materials && node.materials.length > 0) {
                node.materials.forEach(m => {
                    addNodeMaterialRow();
                    const rows = document.querySelectorAll('.node-material-row');
                    const lastRow = rows[rows.length - 1];
                    lastRow.querySelector('.mat-name').value = m.name;
                    lastRow.querySelector('.mat-qty').value = m.qty;
                });
            } else {
                addNodeMaterialRow();
            }
        }
    } else {
        document.getElementById('node-title-input').value = '';
        document.getElementById('node-desc-input').value = '';
        document.getElementById('node-category-input').value = 'ФАСАД';
        window.currentNodeAttachments = [];
        if (typeof window.renderNodeAttachmentsUI === 'function') window.renderNodeAttachmentsUI();
        addNodeMaterialRow();

        if (FD) {
            var decision = FD.askRestore(FD.KEYS.NODE_NEW, 'Узел');
            if (decision === 'continue') {
                var d = FD.get(FD.KEYS.NODE_NEW);
                if (d && d.payload) _rbiApplyNodeNewDraft(d.payload);
            }
            FD.bindAutoSave(view, FD.KEYS.NODE_NEW, _rbiCollectNodeNewDraft);
        }
    }
};

function closeNodeConstructor() {
    var FD = window.RBIFormDraft;
    var wasEdit = !!window.currentEditingNodeId;
    if (FD) {
        if (!wasEdit) FD.saveNow(FD.KEYS.NODE_NEW, _rbiCollectNodeNewDraft);
        FD.unbindAutoSave(FD.KEYS.NODE_NEW);
    }
    document.getElementById('node-constructor-view').classList.add('hidden');
    document.getElementById('nodes-main-view').classList.remove('hidden');
    document.body.classList.remove('modal-open');
    window.renderNodesList();
}

function addNodeMaterialRow() {
    const id = Date.now();
    const html = `
        <div class="flex gap-2 items-center node-material-row mb-2" id="mat-${id}">
            <input type="text" class="input-base text-[12px] flex-1 mat-name" placeholder="Название (напр: Анкер 10х100)">
            <input type="text" class="input-base text-[12px] w-24 text-center mat-qty" placeholder="Кол-во">
            <button onclick="document.getElementById('mat-${id}').remove()" class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-200 active:scale-90 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>`;
    document.getElementById('node-materials-container').insertAdjacentHTML('beforeend', html);
}

window.currentNodeAttachments = [];

window.renderNodeAttachmentsUI = async function () {
    const list = document.getElementById('node-attachments-list');
    if (!list) return;

    let html = '';
    for (let i = 0; i < window.currentNodeAttachments.length; i++) {
        let att = window.currentNodeAttachments[i];
        if (att.type === 'image') {
            const realSrc = await PhotoManager.getAsyncUrl(att.url) || window.getPhotoSrc(att.url);
            html += `
            <div class="relative w-full h-32 rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-50 dark:bg-slate-900 mt-2">
                <img src="${realSrc}" class="w-full h-full object-contain">
                <button onclick="window.removeNodeAttachment(${i})" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md active:scale-90">✕</button>
            </div>`;
        } else if (att.type === 'pdf') {
            html += `
            <div class="flex items-center justify-between p-3 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-sm">
                <div class="flex items-center gap-3 min-w-0 pr-2">
                    <div class="text-red-500 font-black text-lg">PDF</div>
                    <div class="min-w-0">
                        <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">${att.name}</div>
                        <div class="text-[9px] text-slate-500">${att.size}</div>
                    </div>
                </div>
                <button onclick="window.removeNodeAttachment(${i})" class="text-red-500 font-black px-2 text-lg active:scale-90 shrink-0">✕</button>
            </div>`;
        }
    }
    list.innerHTML = html;
};

window.removeNodeAttachment = function (index) {
    window.currentNodeAttachments.splice(index, 1);
    window.renderNodeAttachmentsUI();
};

window.handleNodeFileUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("⚙️ Обработка файла...");

    if (file.type === 'application/pdf') {
        if (file.size > 15 * 1024 * 1024) {
            event.target.value = '';
            return showToast("PDF слишком большой! Максимум 15 МБ.");
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const localUrl = await PhotoManager.saveLocal(e.target.result, 'node_pdf');
            window.currentNodeAttachments.push({ type: 'pdf', url: localUrl, name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + ' MB' });
            window.renderNodeAttachmentsUI();
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    } else {
        window.compressImageToBase64(file, 1000, 0.8, async (base64) => {
            const localUrl = await PhotoManager.saveLocal(base64, 'node_img');
            window.currentNodeAttachments.push({ type: 'image', url: localUrl, name: file.name || 'Фото' });
            window.renderNodeAttachmentsUI();
            event.target.value = '';
        });
    }
};

window.openFakePdfViewer = async function (url, name, size) {
    await window.rbiOpenPdfInTwiViewer(
        url,
        name || 'PDF вложение',
        'Вложение узла',
        name || 'document.pdf',
        size || ''
    );
};

window.saveNodeCard = async function () {
    if (!rbi_requireKnowledgeEditRight()) return;

    const title = document.getElementById('node-title-input').value.trim();
    if (!title) return showToast('⚠️ Укажите название узла!');

    if (!window.currentNodeAttachments || window.currentNodeAttachments.length === 0) {
        return showToast('⚠️ Загрузите хотя бы один файл (чертеж, схему или PDF)!');
    }

    const materials = [];
    document.querySelectorAll('.node-material-row').forEach(row => {
        const name = row.querySelector('.mat-name').value.trim();
        const qty = row.querySelector('.mat-qty').value.trim();
        if (name) materials.push({ name, qty: qty || 'По проекту' });
    });

    let imgData = '';
    const firstImg = window.currentNodeAttachments.find(a => a.type === 'image');
    if (firstImg) imgData = firstImg.url;

    const nodeData = {
        id: window.currentEditingNodeId || 'node_' + Date.now().toString(36),
        category: document.getElementById('node-category-input').value,
        title: title,
        desc: document.getElementById('node-desc-input').value.trim(),
        img: imgData,
        attachments: window.currentNodeAttachments,
        materials: materials,
        linkedDoc: document.getElementById('node-linked-doc').value || null,
        linkedTwiId: document.getElementById('node-linked-twi').value || null,
        linkedChecklistKey: document.getElementById('node-linked-checklist').value || null,
        owner: rbi_getCurrentUserNameSafe(),
        source: 'local',
        syncStatus: 'not_synced',
        sync_status: 'not_synced',
        syncBlockReason: '',
        sync_block_reason: '',
        updatedAt: new Date().toISOString()
    };

    if (window.currentEditingNodeId) {
        const index = customNodes.findIndex(n => n.id === window.currentEditingNodeId);
        if (index !== -1) {
            nodeData.createdAt = customNodes[index].createdAt || nodeData.updatedAt;
            customNodes[index] = nodeData;
        }
    } else {
        nodeData.createdAt = nodeData.updatedAt;
        customNodes.push(nodeData);
    }
    window.customNodes = customNodes;

    const st = _storage();
    const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});
    const isNewNode = !window.currentEditingNodeId;
    try {
        await st.put(stores.CUSTOM_NODES, nodeData);
        if (isNewNode && window.RBIFormDraft) {
            window.RBIFormDraft.clear(window.RBIFormDraft.KEYS.NODE_NEW);
            window.RBIFormDraft.unbindAutoSave(window.RBIFormDraft.KEYS.NODE_NEW);
        }
        showToast('✅ Узел успешно сохранен!');
        if (isNewNode) window.currentEditingNodeId = nodeData.id;
        closeNodeConstructor();
        if (isNewNode) window.currentEditingNodeId = null;

        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
    } catch (e) {
        console.error("Ошибка сохранения узла:", e);
        showToast('❌ Ошибка сохранения (Возможно, файлы слишком большие)');
    }
};

window.deleteNode = async function (id) {
    const node = customNodes.find(n => n.id === id);
    if (!rbi_canDeleteKnowledgeItem(node?.owner)) {
        return showToast("⚠️ Инженер может удалить только свой узел. Чужие материалы удаляют заместитель или администратор.");
    }
    if (!confirm('Удалить этот узел навсегда? В облаке он тоже будет удален.')) return;

    const st = _storage();
    const stores = st.stores ? st.stores() : (typeof STORES !== 'undefined' ? STORES : {});

    if (node) {
        const nowIso = new Date().toISOString();
        node._deleted = true;
        node.is_deleted = true;
        node.deleted_at = nowIso;
        node.updatedAt = nowIso;
        node.updated_at = nowIso;
        node.source = 'local';
        node.syncStatus = 'not_synced';
        node.sync_status = 'not_synced';

        await st.put(stores.CUSTOM_NODES, node);
    }

    showToast('🗑️ Узел удален');
    customNodes = customNodes.filter(n => !n._deleted);
    window.customNodes = customNodes;
    window.renderNodesList();

    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
};

function filterNodes(category, btnElement) {
    currentNodeFilter = category;
    const container = document.getElementById('node-filters-container');
    container.querySelectorAll('.node-filter-btn').forEach(btn => {
        btn.className = "node-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700";
    });
    btnElement.className = "node-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap border border-indigo-600";
    window.renderNodesList();
}

function closeNodeViewer() {
    const overlay = document.getElementById('node-viewer-overlay');
    overlay.classList.add('opacity-0');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

// =========================================================================
// БЛОК: РЕГИСТРАЦИЯ В RBI.REGISTRY (перенесено из knowledge.legacy.js)
// =========================================================================

var _knowledgeRegistry = (window.RBI && window.RBI.registry) ? window.RBI.registry : {
    register: function () {},
    get: function () {}
};

// SYSTEM_TEMPLATES (из templates.js)
if (typeof window.SYSTEM_TEMPLATES !== 'undefined') {
    _knowledgeRegistry.register('systemTemplates', _templates().getSystemTemplates());
}

// FAQ_DATA (из faq.js)
if (typeof FAQ_DATA !== 'undefined') {
    _knowledgeRegistry.register('faqData', FAQ_DATA);
}

// Etalon — агрегированный объект из etalon.js / quality/features/etalon
_knowledgeRegistry.register('etalon', {
    openConstructor:  function() { return window.openEtalonConstructor?.apply(window, arguments); },
    closeConstructor: function() { return window.closeEtalonConstructor?.apply(window, arguments); },
    saveAct:          function() { return window.saveEtalonAct?.apply(window, arguments); },
    openViewer:       function() { return window.openEtalonViewer?.apply(window, arguments); },
    deleteAct:        function() { return window.deleteEtalonAct?.apply(window, arguments); },
    editAct:          function() { return window.editEtalonAct?.apply(window, arguments); },
    addElement:       function() { return window.addEtalonElement?.apply(window, arguments); },
    handlePdfUpload:  function() { return window.handleEtalonPdfUpload?.apply(window, arguments); },
    removePdf:        function() { return window.removeEtalonPdf?.apply(window, arguments); },
    saveMarkupPhoto:  function() { return window.saveEtalonMarkupPhoto?.apply(window, arguments); },
    removePhoto:      function() { return window.removeEtalonPhoto?.apply(window, arguments); },
    triggerPhotoUpload: function() { return window.triggerEtalonPhotoUpload?.apply(window, arguments); },
});

// Knowledge-функции (TWI, Docs, Nodes)
_knowledgeRegistry.register('knowledge', {
    renderTwiList:      function() { return window.renderTwiList?.apply(window, arguments); },
    openTwiConstructor: function() { return window.openTwiConstructor?.apply(window, arguments); },
    saveTwiCard:        function() { return window.saveTwiCard?.apply(window, arguments); },
    renderDocsList:     function() { return window.renderDocsList?.apply(window, arguments); },
    renderNodesList:    function() { return window.renderNodesList?.apply(window, arguments); },
});

// FAQ-функции из faq.js
_knowledgeRegistry.register('faq', {
    renderFaqList:    function() { return window.renderFaqList?.apply(window, arguments); },
    toggleFaqAnswer:  function() { return window.toggleFaqAnswer?.apply(window, arguments); },
});

// =========================================================================
// БЛОК: WINDOW-ПРОКСИ (перенесено из knowledge.legacy.js)
// =========================================================================

// --- TWI ---
window.knowledge_renderTwiList = function () {
    if (typeof window.renderTwiList === 'function') return window.renderTwiList();
};
window.knowledge_openTwiConstructor = function (editId) {
    if (typeof window.openTwiConstructor === 'function') return window.openTwiConstructor(editId);
};
window.knowledge_saveTwiCard = function () {
    if (typeof window.saveTwiCard === 'function') return window.saveTwiCard();
};

// --- ДОКУМЕНТЫ ---
window.knowledge_renderDocsList = function () {
    if (typeof window.renderDocsList === 'function') return window.renderDocsList();
};

// --- УЗЛЫ КОНСТРУКТИВА ---
window.knowledge_renderNodesList = function () {
    if (typeof window.renderNodesList === 'function') return window.renderNodesList();
};

// --- ЭТАЛОНЫ (из etalon.js) ---
window.knowledge_openEtalonConstructor = function (contractor, templateKey, templateTitle, projectName, statusKey) {
    if (typeof window.openEtalonConstructor === 'function')
        return window.openEtalonConstructor(contractor, templateKey, templateTitle, projectName, statusKey);
};
window.knowledge_closeEtalonConstructor = function () {
    if (typeof window.closeEtalonConstructor === 'function') return window.closeEtalonConstructor();
};
window.knowledge_saveEtalonAct = function (printAfter) {
    if (typeof window.saveEtalonAct === 'function') return window.saveEtalonAct(printAfter);
};
window.knowledge_openEtalonViewer = function (id) {
    if (typeof window.openEtalonViewer === 'function') return window.openEtalonViewer(id);
};
window.knowledge_deleteEtalonAct = function (id) {
    if (typeof window.deleteEtalonAct === 'function') return window.deleteEtalonAct(id);
};
window.knowledge_editEtalonAct = function (id) {
    if (typeof window.editEtalonAct === 'function') return window.editEtalonAct(id);
};
window.knowledge_addEtalonElement = function () {
    if (typeof window.addEtalonElement === 'function') return window.addEtalonElement();
};

// --- FAQ (из faq.js) ---
window.knowledge_renderFaqList = function (searchTerm) {
    if (typeof window.renderFaqList === 'function') return window.renderFaqList(searchTerm);
};
window.knowledge_toggleFaqAnswer = function (element) {
    if (typeof window.toggleFaqAnswer === 'function') return window.toggleFaqAnswer(element);
};

// --- ШАБЛОНЫ (из templates.js) ---
window.knowledge_formatNorms = function (text) {
    if (window.RBI && window.RBI.utils && window.RBI.utils.templates && typeof window.RBI.utils.templates.formatNorms === 'function') {
        return window.RBI.utils.templates.formatNorms(text);
    }
    if (typeof window.formatNorms === 'function') return window.formatNorms(text);
    return text || '';
};

// =========================================================================
// БЛОК: ЖИВЫЕ РЕАЛИЗАЦИИ РЕНДЕРА/КОНСТРУКТОРА (перенесено из knowledge.legacy.js)
// Вызываются из index.html напрямую (без префикса knowledge_*).
// KnowledgeRender/KnowledgeState (knowledge.render.js/knowledge.state.js) не
// используются здесь — решение зафиксировано архитектором (см. current_plan.md).
// =========================================================================

// Режим отображения по вкладкам: 'cards' | 'list'
// scope: twi | docs | nodes | practices | reports | meetings | fmea
// Ключи: knowledgeViewModeTwi и т.д.; legacy knowledgeViewMode — fallback.
window._KB_VIEW_SCOPE_KEYS = {
    twi: 'knowledgeViewModeTwi',
    docs: 'knowledgeViewModeDocs',
    nodes: 'knowledgeViewModeNodes',
    practices: 'knowledgeViewModePractices',
    reports: 'knowledgeViewModeReports',
    meetings: 'knowledgeViewModeMeetings',
    fmea: 'knowledgeViewModeFmea'
};

window.getKnowledgeViewMode = function (scope) {
    var key = window._KB_VIEW_SCOPE_KEYS[scope] || null;
    var m = null;
    var settingsSvc = window.RBI && window.RBI.services && window.RBI.services.settings;
    if (key && settingsSvc && typeof settingsSvc.get === 'function') {
        m = settingsSvc.get(key);
    }
    if (!m && key && window.appSettings) m = window.appSettings[key];
    // Миграция: старый единый ключ, если scoped ещё не задан
    if (!m && settingsSvc && typeof settingsSvc.get === 'function') {
        m = settingsSvc.get('knowledgeViewMode');
    }
    if (!m && window.appSettings) m = window.appSettings.knowledgeViewMode;
    return m === 'list' ? 'list' : 'cards';
};

window.setKnowledgeViewMode = function (scope, mode) {
    // Совместимость: setKnowledgeViewMode('list') без scope → legacy (все вкладки)
    if (arguments.length === 1 && (scope === 'list' || scope === 'cards')) {
        mode = scope;
        ['twi', 'docs', 'nodes', 'practices', 'reports', 'meetings', 'fmea'].forEach(function (s) {
            window.setKnowledgeViewMode(s, mode);
        });
        return;
    }
    var key = window._KB_VIEW_SCOPE_KEYS[scope];
    if (!key) return;
    mode = mode === 'list' ? 'list' : 'cards';
    if (typeof window.saveSettings === 'function') {
        window.saveSettings(key, mode);
    } else if (window.appSettings) {
        window.appSettings[key] = mode;
    }
    var selId = {
        twi: 'set-kb-view-twi',
        docs: 'set-kb-view-docs',
        nodes: 'set-kb-view-nodes',
        practices: 'set-kb-view-practices',
        reports: 'set-kb-view-reports',
        meetings: 'set-kb-view-meetings',
        fmea: 'set-kb-view-fmea'
    }[scope];
    var sel = selId ? document.getElementById(selId) : null;
    if (sel && sel.value !== mode) sel.value = mode;
    var act = 'px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-all bg-white dark:bg-slate-800 text-indigo-600 shadow-sm';
    var inact = 'px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-all text-slate-500 dark:text-slate-400';
    document.querySelectorAll('[data-kb-view-scope="' + scope + '"][data-kb-view-toggle]').forEach(function (btn) {
        btn.className = btn.getAttribute('data-kb-view-toggle') === mode ? act : inact;
    });
    if (scope === 'twi' && typeof window.renderTwiList === 'function') window.renderTwiList();
    else if (scope === 'docs' && typeof window.renderDocsList === 'function') window.renderDocsList();
    else if (scope === 'nodes' && typeof window.renderNodesList === 'function') window.renderNodesList();
    else if (scope === 'practices' && typeof window.rbi_renderPracticesTab === 'function') window.rbi_renderPracticesTab();
    else if (scope === 'reports' && typeof window.renderReportsList === 'function') window.renderReportsList();
    else if (scope === 'meetings' && typeof window.rbi_renderMeetingTab === 'function') window.rbi_renderMeetingTab();
    else if (scope === 'fmea' && typeof window.rbi_renderFmeaRegistry === 'function') window.rbi_renderFmeaRegistry();
};

window.kbViewModeToggleHtml = function (scope) {
    scope = scope || 'twi';
    var mode = window.getKnowledgeViewMode(scope);
    var act = 'px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-all bg-white dark:bg-slate-800 text-indigo-600 shadow-sm';
    var inact = 'px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-all text-slate-500 dark:text-slate-400';
    return '<div class="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-full shadow-inner border border-slate-300 dark:border-slate-600 shrink-0" onclick="event.stopPropagation();">'
        + '<button type="button" data-kb-view-scope="' + scope + '" data-kb-view-toggle="cards" onclick="window.setKnowledgeViewMode(\'' + scope + '\',\'cards\')" class="' + (mode === 'cards' ? act : inact) + '">Карточки</button>'
        + '<button type="button" data-kb-view-scope="' + scope + '" data-kb-view-toggle="list" onclick="window.setKnowledgeViewMode(\'' + scope + '\',\'list\')" class="' + (mode === 'list' ? act : inact) + '">Список</button>'
        + '</div>';
};

/**
 * Рендер списка TWI-карточек.
 * Вызывается из index.html: oninput="renderTwiList()"
 */
window.renderTwiList = function () {
    var container = document.getElementById('twi-cards-container');
    var searchInput = (document.getElementById('twi-search-input') && document.getElementById('twi-search-input').value.toLowerCase()) || '';
    if (!container) return;

    var twiToggleHost = document.getElementById('twi-view-mode-toggle');
    if (twiToggleHost && typeof window.kbViewModeToggleHtml === 'function') {
        twiToggleHost.innerHTML = window.kbViewModeToggleHtml('twi');
    }

    // --- 1. МАГИЯ TWI (ПЛАШКА) ---
    var newMagicCandidates = window.getMagicTwiCandidates ? window.getMagicTwiCandidates() : [];
    var magicTwiHtml = '';

    if (newMagicCandidates.length > 0 && !searchInput) {
        magicTwiHtml = `
        <div id="twi-magic-block" class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm mb-4 text-white overflow-hidden relative magic-collapsed" style="transition: padding 0.3s ease;">
            <div onclick="document.getElementById('twi-magic-block').classList.toggle('magic-collapsed')" class="cursor-pointer p-3">
                <button class="absolute top-3 right-3 text-white/50 hover:text-white/100 transition-colors pointer-events-none">
                    <svg class="w-5 h-5 magic-arrow transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="flex items-center gap-2 font-black uppercase tracking-widest text-[11px] drop-shadow-md">
                    <span class="text-lg animate-pulse">✨</span> Магия TWI (Найдено: ${newMagicCandidates.length})
                </div>
            </div>
            
            <div class="magic-content-wrapper px-3">
                <div class="magic-content">
                    <div class="text-[11px] font-medium text-indigo-100 mb-3 leading-snug">
                        Система нашла эталоны (OK) и брак (FAIL) для одних и тех же пунктов. За создание TWI-карты начислен <b class="text-yellow-300">Бонус XP!</b>
                    </div>
                    <div class="flex gap-2 overflow-x-auto no-scrollbar pb-3">
                        ${newMagicCandidates.map((m) => `
                            <div class="bg-white/10 border border-white/20 p-2.5 rounded-xl shrink-0 w-48 flex flex-col justify-between">
                                <div class="text-[10px] font-bold leading-tight line-clamp-2 mb-3" title="${m.title}">${m.title}</div>
                                <button onclick="window.createMagicTwi('${m.tmplKey}', '${m.itemId}', '${m.ok}', '${m.fail}', '${m.title.replace(/'/g, "\\'")}')" class="w-full bg-white text-indigo-600 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform">Создать (+100 XP)</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        <style>
            #twi-magic-block.magic-collapsed { padding-bottom: 0px; }
            #twi-magic-block.magic-collapsed .magic-arrow { transform: rotate(0deg); }
            #twi-magic-block:not(.magic-collapsed) .magic-arrow { transform: rotate(180deg); }
            .magic-content-wrapper { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.3s ease-out; }
            #twi-magic-block.magic-collapsed .magic-content-wrapper { grid-template-rows: 0fr; }
            .magic-content { overflow: hidden; }
        </style>
    `;
    }

    // --- 2. СПИСОК КАРТОЧЕК ---
    var currentEngineer = _getSetting('engineerName') || 'Инженер';

    var filtered = window.customTwiCards.filter(function (card) {
        var title = String(card.title || card.name || (card.data && card.data.title) || '').toLowerCase();
        var checklistName = String(card.checklistName || card.category || (card.data && card.data.checklistName) || 'Без привязки').toLowerCase();
        var type = String(card.type || (card.data && card.data.type) || '').toLowerCase();
        var owner = card.owner || (card.data && card.data.owner) || '';

        var matchSearch =
            title.includes(searchInput) ||
            checklistName.includes(searchInput) ||
            type.includes(searchInput);

        var matchOwner =
            window.twiOwnerFilter === 'ALL' ||
            owner === currentEngineer;

        return matchSearch && matchOwner;
    });

    var html = '';

    if (filtered.length === 0) {
        html = `<div class="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Инструкций пока нет</div>`;
    } else {
        var grouped = {};
        filtered.forEach(function (c) {
            var groupName = c.checklistName || c.category || (c.data && c.data.checklistName) || 'Без привязки';
            if (!grouped[groupName]) grouped[groupName] = [];
            grouped[groupName].push(c);
        });

        var isListView = window.getKnowledgeViewMode('twi') === 'list';
        var itemsWrapClass = isListView ? 'flex flex-col gap-1.5 py-2' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2';

        for (var checklistName in grouped) {
            html += `
        <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
            <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
                <span class="truncate pr-4">${checklistName} <span class="text-[10px] text-slate-400 ml-1">(${grouped[checklistName].length})</span></span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="${itemsWrapClass}">
        `;

            grouped[checklistName].forEach(function (card) {
                var typeIcon = ''; var typeText = ''; var typeColor = '';
                if (card.type === 'INSPECTOR') {
                    typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
                    typeText = 'Технадзор'; typeColor = 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
                } else if (card.type === 'WORKER') {
                    typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>`;
                    typeText = 'Пошаговая'; typeColor = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800';
                } else if (card.type === 'PDF') {
                    typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>`;
                    typeText = 'Регламент'; typeColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
                }

                var infoText = '';
                if (card.type === 'WORKER') infoText = 'Шагов: ' + (card.steps && card.steps.length || 0);
                else if (card.type === 'INSPECTOR') infoText = 'Визуал';
                else if (card.type === 'PDF') infoText = card.pdfSize || 'Файл';

                var previewImg = null;
                if (card.type === 'INSPECTOR') previewImg = card.photoGood || card.photoBad;
                else if (card.type === 'WORKER' && card.steps && card.steps.length > 0) {
                    var stepWithPhoto = card.steps.find(function (s) { return window.normalizeItemPhotos(s.photo).length > 0; });
                    if (stepWithPhoto) previewImg = window.normalizeItemPhotos(stepWithPhoto.photo)[0];
                }

                var previewHtml = '';
                if (card.type === 'PDF') {
                    previewHtml = `
                <div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 relative">
                    <div class="w-10 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-1.5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 right-0 h-3.5 bg-red-500 flex items-center justify-center"><span class="text-[7px] text-white font-black tracking-widest">PDF</span></div>
                        <div class="space-y-1 mt-4">
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                        </div>
                    </div>
                </div>`;
                } else {
                    previewHtml = previewImg
                        ? `<img src="${window.getPhotoSrc(previewImg)}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 ${typeColor}">${typeIcon}</div>`;
                }

                var isOwner = !card.id.startsWith('sys_') && (!card.owner || card.owner === currentEngineer);
                var isSystem = card.id.startsWith('sys_');
                var safeTitle = card.title.replace(/'/g, "\\'");

                if (isListView) {
                    var thumb = previewImg
                        ? `<img src="${window.getPhotoSrc(previewImg)}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full flex items-center justify-center ${typeColor}">${typeIcon.replace('w-8 h-8', 'w-5 h-5').replace(' mb-1', '')}</div>`;
                    html += `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm flex items-center gap-2.5 p-2 active:scale-[0.99] transition-transform relative cursor-pointer" onclick="openTwiViewer('${card.id}')">
                <div class="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[var(--card-border)] bg-slate-50 dark:bg-slate-900">${thumb}</div>
                <div class="min-w-0 flex-1">
                    <div class="text-[12px] font-bold text-slate-800 dark:text-white truncate leading-tight">${card.title}${isSystem ? ' <span class="text-[8px] font-black text-indigo-500">СИС</span>' : ''}</div>
                    <div class="text-[9px] font-bold text-slate-400 truncate mt-0.5">${typeText} · ${infoText} · ${card.owner ? card.owner.split(' ')[0] : 'Система'}</div>
                </div>
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${card.id}', 'twi', '${safeTitle}', ${isOwner})" class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-[var(--hover-bg)] active:scale-90">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
            </div>`;
                } else {
                html += `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openTwiViewer('${card.id}')">
                ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИСТЕМА</div>' : ''}
                
                <div class="h-28 sm:h-32 border-b border-[var(--card-border)] relative">
                    ${previewHtml}
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${card.id}', 'twi', '${safeTitle}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                </div>
                
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[8px] font-black px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border ${typeColor} truncate max-w-full">${typeText}</div>
                    <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">${card.title}</div>
                    
                    <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                            <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            ${card.owner ? card.owner.split(' ')[0] : 'Система'}
                        </div>
                        <div class="text-[9px] font-black text-slate-400">${infoText}</div>
                    </div>
                </div>
            </div>`;
                }
            });

            html += `</div></details>`;
        }
    }

    container.innerHTML = magicTwiHtml + html;
};

function _rbiCollectTwiNewDraft() {
    if (window.currentEditingTwiId) return null;
    var type = window.currentTwiType || 'INSPECTOR';
    var selectEl = document.getElementById('twi-checklist-select');
    var nodeIdEl = document.getElementById('twi-linked-node-id');
    var nodeNameEl = document.getElementById('twi-linked-node-name');
    var p = {
        type: type,
        title: (document.getElementById('twi-title-input') && document.getElementById('twi-title-input').value) || '',
        checklistKey: (selectEl && selectEl.value) || '',
        linkedDocId: (document.getElementById('twi-linked-doc-id') && document.getElementById('twi-linked-doc-id').value) || '',
        linkedNodeId: (nodeIdEl && nodeIdEl.value) || '',
        linkedNodeTitle: (nodeNameEl && nodeNameEl.innerText) || 'Не привязан',
        videoLink: (document.getElementById('twi-video-link-input') && document.getElementById('twi-video-link-input').value) || '',
        itemId: '',
        why: '',
        compliance: '',
        preparation: '',
        photoGood: '',
        photoBad: '',
        steps: [],
        pdfData: '',
        pdfName: '',
        pdfSize: ''
    };
    if (type === 'INSPECTOR') {
        p.itemId = (document.getElementById('twi-item-select') && document.getElementById('twi-item-select').value) || '';
        p.why = (document.getElementById('twi-why-input') && document.getElementById('twi-why-input').value) || '';
        p.compliance = (document.getElementById('twi-compliance-input') && document.getElementById('twi-compliance-input').value) || '';
        p.preparation = (document.getElementById('twi-preparation-input') && document.getElementById('twi-preparation-input').value) || '';
        p.photoGood = (document.getElementById('twi-photo-good-container') && document.getElementById('twi-photo-good-container').dataset.photo) || '';
        p.photoBad = (document.getElementById('twi-photo-bad-container') && document.getElementById('twi-photo-bad-container').dataset.photo) || '';
    } else if (type === 'WORKER') {
        var stepEls = document.getElementById('twi-steps-container').querySelectorAll('.twi-step-item');
        stepEls.forEach(function (el, index) {
            var text = (el.querySelector('.twi-step-text') && el.querySelector('.twi-step-text').value) || '';
            var time = parseInt(el.querySelector('.twi-step-time') && el.querySelector('.twi-step-time').value, 10) || 0;
            var photo = _readTwiStepPhotos(el.querySelector('.twi-photo-container'));
            p.steps.push({ order: index + 1, text: text, time: time, photo: photo });
        });
    } else if (type === 'PDF') {
        var pdfCont = document.getElementById('twi-pdf-container');
        p.pdfData = (pdfCont && pdfCont.dataset.pdf) || '';
        p.pdfName = (document.getElementById('twi-pdf-name') && document.getElementById('twi-pdf-name').innerText) || '';
        p.pdfSize = (document.getElementById('twi-pdf-size') && document.getElementById('twi-pdf-size').innerText) || '';
    }
    var meaningful = !!(
        (p.title || '').trim() ||
        p.checklistKey ||
        p.linkedDocId ||
        p.linkedNodeId ||
        (p.videoLink || '').trim() ||
        p.itemId ||
        (p.why || '').trim() ||
        (p.compliance || '').trim() ||
        (p.preparation || '').trim() ||
        p.photoGood ||
        p.photoBad ||
        p.pdfData ||
        (p.steps && p.steps.some(function (s) {
            return (s.text || '').trim() || s.time || (s.photo && s.photo.length);
        }))
    );
    return meaningful ? p : null;
}

function _rbiApplyTwiNewDraft(p) {
    if (!p) return;
    var selectEl = document.getElementById('twi-checklist-select');
    var selectDoc = document.getElementById('twi-linked-doc-id');
    document.getElementById('twi-title-input').value = p.title || '';
    document.getElementById('twi-video-link-input').value = p.videoLink || '';
    document.getElementById('twi-steps-container').innerHTML = '';
    window.twiStepCount = 0;
    removeTwiGoodPhoto(); removeTwiBadPhoto(); removeTwiPdf();

    if (p.checklistKey && selectEl) selectEl.value = p.checklistKey;
    if (selectDoc) selectDoc.value = p.linkedDocId || '';
    selectNodeForTwi(p.linkedNodeId || '', p.linkedNodeTitle || (p.linkedNodeId ? 'Узел' : 'Не привязан'));

    var type = p.type || 'INSPECTOR';
    changeTwiType(type);

    if (type === 'INSPECTOR') {
        populateTwiItemSelect(p.itemId || null);
        if (p.itemId && document.getElementById('twi-item-select')) {
            document.getElementById('twi-item-select').value = String(p.itemId);
        }
        document.getElementById('twi-why-input').value = p.why || '';
        document.getElementById('twi-compliance-input').value = p.compliance || '';
        document.getElementById('twi-preparation-input').value = p.preparation || '';
        if (p.photoGood) renderGoodPhoto(p.photoGood);
        if (p.photoBad) renderBadPhoto(p.photoBad);
    } else if (type === 'PDF') {
        if (p.pdfData) renderPdfFile(p.pdfName || 'doc.pdf', p.pdfSize || '', p.pdfData);
    } else {
        var steps = Array.isArray(p.steps) ? p.steps : [];
        if (steps.length === 0) addTwiStep();
        else steps.forEach(function (step) { addTwiStep(step); });
    }
}

/**
 * Открывает конструктор TWI (режим создания или редактирования).
 * Вызывается из index.html: onclick="openTwiConstructor()"
 */
window.openTwiConstructor = function (editId) {
    editId = editId || null;
    if (!rbi_requireKnowledgeEditRight()) return;
    document.getElementById('twi-list-view').classList.add('hidden');
    var view = document.getElementById('twi-constructor-view');
    view.classList.remove('hidden');
    document.body.classList.add('modal-open');
    view.scrollTo(0, 0);

    var FD = window.RBIFormDraft;
    if (FD) FD.unbindAutoSave(FD.KEYS.TWI_NEW);

    var selectEl = document.getElementById('twi-checklist-select');
    var options = '<option value="" disabled selected>Выберите вид работ...</option>';

    var sysKeys = Object.keys(_templates().getSystemTemplates()).sort(function (a, b) {
        return _templates().getSystemTemplates()[a].title.localeCompare(_templates().getSystemTemplates()[b].title, 'ru');
    });
    sysKeys.forEach(function (key) { options += `<option value="sys_${key}">${_templates().getSystemTemplates()[key].title}</option>`; });

    var userKeys = Object.keys(_templates().getUserTemplates()).sort(function (a, b) {
        return _templates().getUserTemplates()[a].title.localeCompare(_templates().getUserTemplates()[b].title, 'ru');
    });
    userKeys.forEach(function (key) { options += `<option value="user_${key}">${_templates().getUserTemplates()[key].title}</option>`; });

    selectEl.innerHTML = options;

    var selectDoc = document.getElementById('twi-linked-doc-id');
    var docOptions = '<option value="">Не привязывать</option>';
    var allDocs = [
        ...(typeof window.SYSTEM_DOCS !== 'undefined' ? window.SYSTEM_DOCS : []),
        ...(typeof customDocs !== 'undefined' ? customDocs : [])
    ];
    allDocs.sort(function (a, b) { return a.code.localeCompare(b.code); }).forEach(function (doc) {
        var shortTitle = doc.title.length > 40 ? doc.title.substring(0, 40) + '...' : doc.title;
        docOptions += `<option value="${doc.id}">${doc.code} - ${shortTitle}</option>`;
    });
    selectDoc.innerHTML = docOptions;

    document.getElementById('twi-title-input').value = '';
    document.getElementById('twi-steps-container').innerHTML = '';
    document.getElementById('twi-why-input').value = '';
    document.getElementById('twi-compliance-input').value = '';
    document.getElementById('twi-preparation-input').value = '';
    document.getElementById('twi-video-link-input').value = '';
    selectNodeForTwi('', 'Не привязан');

    removeTwiGoodPhoto(); removeTwiBadPhoto(); removeTwiPdf();
    window.twiStepCount = 0; window.currentEditingTwiId = editId;

    if (editId) {
        var card = window.customTwiCards.find(function (c) { return c.id === editId; });
        if (card) {
            document.getElementById('twi-title-input').value = card.title;
            selectEl.value = card.checklistKey;
            document.getElementById('twi-video-link-input').value = card.videoLink || '';

            populateTwiItemSelect(card.type === 'INSPECTOR' ? card.itemId : null);
            changeTwiType(card.type || 'WORKER');
            selectDoc.value = card.linkedDocId || '';
            selectNodeForTwi(
                card.linkedNodeId || '',
                card.linkedNodeId
                    ? ((window.SYSTEM_NODES.find(function (n) { return n.id === card.linkedNodeId; }) || {}).title ||
                       (window.customNodes.find(function (n) { return n.id === card.linkedNodeId; }) || {}).title ||
                       'Узел')
                    : 'Не привязан'
            );
            if (card.type === 'INSPECTOR') {
                document.getElementById('twi-why-input').value = card.whyImportant || '';

                var comp = '', prep = '';
                if (card.howToCheck) {
                    if (card.howToCheck.includes('[Как подготовить]')) {
                        var parts = card.howToCheck.split('[Как подготовить]\n');
                        prep = parts[1] || '';
                        comp = parts[0].replace('[Что соблюсти]\n', '').trim();
                    } else {
                        comp = card.howToCheck.replace('[Что соблюсти]\n', '').trim();
                    }
                }
                document.getElementById('twi-compliance-input').value = comp;
                document.getElementById('twi-preparation-input').value = prep;

                if (card.photoGood) renderGoodPhoto(card.photoGood);
                if (card.photoBad) renderBadPhoto(card.photoBad);
            } else if (card.type === 'PDF') {
                if (card.pdfData) renderPdfFile(card.pdfName, card.pdfSize, card.pdfData);
            } else {
                card.steps.forEach(function (step) { addTwiStep(step); });
            }
        }
    } else {
        changeTwiType('INSPECTOR'); addTwiStep(); populateTwiItemSelect();
        if (FD) {
            var decision = FD.askRestore(FD.KEYS.TWI_NEW, 'TWI');
            if (decision === 'continue') {
                var d = FD.get(FD.KEYS.TWI_NEW);
                if (d && d.payload) _rbiApplyTwiNewDraft(d.payload);
            }
            FD.bindAutoSave(view, FD.KEYS.TWI_NEW, _rbiCollectTwiNewDraft);
        }
    }
};

/**
 * Сохраняет TWI-карточку (создание или обновление).
 * Вызывается из index.html: onclick="saveTwiCard()"
 */
window.saveTwiCard = async function () {
    if (!rbi_requireKnowledgeEditRight()) return;
    var title = document.getElementById('twi-title-input').value.trim();
    var select = document.getElementById('twi-checklist-select');
    var checklistKey = select.value;
    var checklistName = (select.options[select.selectedIndex] && select.options[select.selectedIndex].text) || 'Без привязки';

    if (!title) return showToast('⚠️ Укажите название!');
    if (window.currentTwiType !== 'PDF' && !checklistKey) return showToast('⚠️ Укажите привязку к чек-листу!');

    if (window.currentTwiType === 'INSPECTOR' && !window.currentEditingTwiId) {
        var itemId = document.getElementById('twi-item-select').value;
        var existingCard = window.customTwiCards.find(function (c) {
            return c.checklistKey === checklistKey &&
                String(c.itemId) === String(itemId) &&
                c.type === 'INSPECTOR' &&
                !c._deleted;
        });
        if (existingCard) {
            return showToast('⚠️ TWI-карта для этого пункта уже создана другим инженером! Обновите базу.');
        }
    }

    var cardData = {
        id: window.currentEditingTwiId || 'twi_' + Date.now().toString(36),
        title: title, checklistKey: checklistKey, checklistName: checklistName, type: window.currentTwiType,
        owner: _getSetting('engineerName') || 'Инженер',
        linkedNodeId: document.getElementById('twi-linked-node-id').value || null,
        linkedDocId: document.getElementById('twi-linked-doc-id').value || null,
        videoLink: document.getElementById('twi-video-link-input').value.trim() || null
    };

    if (window.currentTwiType === 'INSPECTOR') {
        var itemId2 = document.getElementById('twi-item-select').value;
        var why = document.getElementById('twi-why-input').value.trim();
        var comp2 = document.getElementById('twi-compliance-input').value.trim();
        var prep2 = document.getElementById('twi-preparation-input').value.trim();

        if (!itemId2) return showToast('⚠️ Выберите конкретный пункт контроля!');
        if (!comp2 && !prep2) return showToast('⚠️ Заполните хотя бы одно поле: Что соблюсти или Как подготовить!');

        var how = '';
        if (comp2 && prep2) how = '[Что соблюсти]\n' + comp2 + '\n\n[Как подготовить]\n' + prep2;
        else if (comp2) how = '[Что соблюсти]\n' + comp2;
        else if (prep2) how = '[Как подготовить]\n' + prep2;

        cardData.itemId = itemId2 === 'ALL' ? 'ALL' : parseInt(itemId2);
        cardData.whyImportant = why;
        cardData.howToCheck = how;
        cardData.photoGood = document.getElementById('twi-photo-good-container').dataset.photo || null;
        cardData.photoBad = document.getElementById('twi-photo-bad-container').dataset.photo || null;

    } else if (window.currentTwiType === 'WORKER') {
        var stepEls = document.getElementById('twi-steps-container').querySelectorAll('.twi-step-item');
        if (stepEls.length === 0) return showToast('⚠️ Добавьте хотя бы один шаг!');

        var steps = []; var totalTime = 0; var isValid = true;
        stepEls.forEach(function (el, index) {
            var text = el.querySelector('.twi-step-text').value.trim();
            var time = parseInt(el.querySelector('.twi-step-time').value) || 0;
            var photo = _readTwiStepPhotos(el.querySelector('.twi-photo-container'));
            if (!text) isValid = false;
            totalTime += time;
            steps.push({ order: index + 1, text: text, time: time, photo: photo });
        });

        if (!isValid) return showToast('⚠️ Заполните текст во всех шагах!');
        cardData.totalTime = totalTime; cardData.steps = steps;

    } else if (window.currentTwiType === 'PDF') {
        var pdfData = document.getElementById('twi-pdf-container').dataset.pdf;
        if (!pdfData) return showToast('⚠️ Загрузите PDF-файл!');
        cardData.pdfData = pdfData;
        cardData.pdfName = document.getElementById('twi-pdf-name').innerText;
        cardData.pdfSize = document.getElementById('twi-pdf-size').innerText;
    }

    if (!cardData.owner) {
        cardData.owner = rbi_getCurrentUserNameSafe();
    }

    cardData.source = 'local';
    cardData.syncStatus = 'not_synced';
    cardData.sync_status = 'not_synced';
    cardData.syncBlockReason = '';
    cardData.sync_block_reason = '';
    cardData.updatedAt = new Date().toISOString();

    if (window.currentEditingTwiId) {
        var idx = window.customTwiCards.findIndex(function (c) { return c.id === window.currentEditingTwiId; });
        if (idx !== -1) {
            cardData.createdAt = window.customTwiCards[idx].createdAt || cardData.updatedAt;
            window.customTwiCards[idx] = cardData;
        }
    } else {
        cardData.createdAt = cardData.updatedAt;
        window.customTwiCards.push(cardData);
    }

    try {
        await _storage().put(_storage().stores().TWI_CARDS, cardData);
        const isNewCard = !window.currentEditingTwiId;
        const fromMagic = !!window._rbiMagicTwiPending;
        window._rbiMagicTwiPending = false;
        window._rbiMagicTwiSaving = true;
        if (isNewCard) {
            // magic_creator уже включает +100 XP; обычное создание — create_twi
            _gameLogAction(fromMagic ? 'magic_creator' : 'create_twi', cardData.id);
        }
        if (isNewCard && window.RBIFormDraft) {
            window.RBIFormDraft.clear(window.RBIFormDraft.KEYS.TWI_NEW);
            window.RBIFormDraft.unbindAutoSave(window.RBIFormDraft.KEYS.TWI_NEW);
        }
        showToast(isNewCard
            ? (fromMagic ? '✅ TWI создана! Начислено +100 XP (Магия TWI)' : '✅ Инструкция сохранена! Начислено +100 XP')
            : '✅ Инструкция успешно сохранена!');
        // Помечаем editing, чтобы close не перезаписал черновик пустым состоянием после clear
        if (isNewCard) window.currentEditingTwiId = cardData.id;
        closeTwiConstructor();
        window._rbiMagicTwiSaving = false;

        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');

        if (typeof window.getMagicTwiCandidates === 'function') {
            var remaining = window.getMagicTwiCandidates().length;
            var magicTask = _getTasks().find(function (t) { return t.taskType === 'Магия TWI' && t.status === 'pending'; });
            if (magicTask) {
                magicTask.done = (magicTask.done || 0) + 1;
                if (remaining === 0) {
                    magicTask.status = 'done';
                    magicTask.resultComment = 'Все карточки созданы';
                } else {
                    magicTask.target = magicTask.done + remaining;
                    magicTask.resultComment = 'В процессе (' + magicTask.done + '/' + magicTask.target + ')';
                }
                magicTask.updatedAt = new Date().toISOString();
                await _storage().put(_storage().stores().TASKS, magicTask);
                window.RBI.events.emit('tasks:refresh', {});
            }
        }
    } catch (e) { showToast('❌ Ошибка при сохранении'); }
};

/**
 * Рендер списка нормативных документов.
 * Вызывается из index.html: oninput="renderDocsList()"
 */
window.renderDocsList = function () {
    var container = document.getElementById('docs-list-container');
    var searchInput = (document.getElementById('doc-search-input') && document.getElementById('doc-search-input').value.toLowerCase()) || '';
    if (!container) return;

    var filtersBlock = document.getElementById('ref-docs-filters');
    if (filtersBlock && !filtersBlock.dataset.initialized) {
        filtersBlock.dataset.initialized = 'true';
        filtersBlock.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <label class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                <span class="text-[10px] font-black uppercase tracking-widest ${window.docOwnerFilter === 'MY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">Только мои</span>
                <div class="relative">
                    <input type="checkbox" class="sr-only peer" onchange="window.docOwnerFilter = this.checked ? 'MY' : 'ALL'; renderDocsList()" ${window.docOwnerFilter === 'MY' ? 'checked' : ''}>
                    <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                </div>
            </label>
            <div class="flex items-center gap-2">
                <div id="docs-view-mode-toggle" class="shrink-0"></div>
                <button type="button" onclick="downloadMissingCloudFiles()" class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-500 active:scale-95 shadow-sm" title="Скачать всё для офлайна" aria-label="Скачать всё для офлайна">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </button>
            </div>
        </div>
        
        <div class="flex justify-between items-center mb-2">
            <div class="relative flex-1 mr-2">
                <span class="absolute left-3 top-2.5 text-slate-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></span>
                <input type="text" id="doc-search-input" class="input-base pl-9 text-[11px]" placeholder="Поиск ГОСТ, СП..." oninput="renderDocsList()" value="${searchInput}">
            </div>
            <button onclick="openAiDocChat()" class="bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-400 px-3 py-2 rounded-lg shadow-sm active:scale-95 text-[10px] font-black uppercase whitespace-nowrap mr-2 flex items-center gap-1">
                🤖 Спросить ИИ
            </button>
            <button onclick="openAddDocModal()" class="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Свой НД
            </button>
        </div>
        
        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-t border-[var(--card-border)] pt-2" id="doc-filters-container">
            <button onclick="filterDocs('ALL', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">Все</button>
            <button onclick="filterDocs('СП', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'СП' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">СП</button>
            <button onclick="filterDocs('ГОСТ', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ГОСТ' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">ГОСТ</button>
            <button onclick="filterDocs('ПРОЕКТ', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ПРОЕКТ' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">Проект / РД</button>
        </div>
    `;
    }
    var docsToggleHost = document.getElementById('docs-view-mode-toggle');
    if (docsToggleHost && typeof window.kbViewModeToggleHtml === 'function') {
        docsToggleHost.innerHTML = window.kbViewModeToggleHtml('docs');
    }

    var allDocs = [
        ...(typeof window.SYSTEM_DOCS !== 'undefined' ? window.SYSTEM_DOCS : []),
        ...customDocs
    ];
    var currentEngineer = _getSetting('engineerName') || 'Инженер';

    var filtered = allDocs.filter(function (doc) {
        var code = String(doc.code || (doc.data && doc.data.code) || '').toLowerCase();
        var title = String(doc.title || doc.name || (doc.data && doc.data.title) || '').toLowerCase();
        var type = doc.type || (doc.data && doc.data.type) || '';
        var owner = doc.owner || (doc.data && doc.data.owner) || '';

        var matchSearch = code.includes(searchInput) || title.includes(searchInput);
        var matchFilter = currentDocFilter === 'ALL' || type === currentDocFilter;
        var matchOwner =
            window.docOwnerFilter === 'ALL' ||
            doc.isSystem ||
            owner === currentEngineer;

        return matchSearch && matchFilter && matchOwner;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-500 text-[11px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">Документы не найдены</div>`;
        return;
    }

    var grouped = {};
    filtered.forEach(function (doc) {
        if (!grouped[doc.type]) grouped[doc.type] = [];
        grouped[doc.type].push(doc);
    });

    var isListView = window.getKnowledgeViewMode('docs') === 'list';
    var itemsWrapClass = isListView ? 'flex flex-col gap-1.5 py-2' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2';
    var html = '';
    Object.keys(grouped).sort().forEach(function (type) {
        html += `
    <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
        <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
            <span class="truncate pr-4">${type} <span class="text-[10px] text-slate-400 ml-1">(${grouped[type].length})</span></span>
            <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
            </span>
        </summary>
        <div class="${itemsWrapClass}">
    `;

        grouped[type].forEach(function (doc) {
            var isSystem = String(doc.id).startsWith('sys_');
            var isOwner = !isSystem && (!doc.owner || doc.owner === currentEngineer);
            var tagColor = 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400';
            var infoText = isSystem ? 'Системный' : (doc.pdfSize ? 'PDF: ' + doc.pdfSize : 'Без файла');
            var safeCode = String(doc.code || '').replace(/'/g, "\\'");
            var menuBtn = !isSystem
                ? `<button onclick="event.stopPropagation(); openUniversalActionSheet('${doc.id}', 'doc', '${safeCode}', ${isOwner})" class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-[var(--hover-bg)] active:scale-90"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>`
                : '';

            if (isListView) {
                html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm flex items-center gap-2.5 p-2 active:scale-[0.99] transition-transform relative cursor-pointer" onclick="openDocViewer('${doc.id}')">
            <div class="w-10 h-10 rounded-lg shrink-0 bg-slate-50 dark:bg-slate-900 border border-[var(--card-border)] flex items-center justify-center"><span class="text-[8px] font-black text-red-500">DOC</span></div>
            <div class="min-w-0 flex-1">
                <div class="text-[12px] font-black text-slate-800 dark:text-white truncate">${doc.code}${isSystem ? ' <span class="text-[8px] font-black text-indigo-500">СИС</span>' : ''}</div>
                <div class="text-[9px] font-bold text-slate-400 truncate mt-0.5">${doc.type} · ${doc.title}</div>
            </div>
            ${menuBtn}
        </div>`;
            } else {
            html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openDocViewer('${doc.id}')">
            ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИС</div>' : ''}
            
            <div class="h-24 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                <div class="w-10 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-1.5 relative overflow-hidden">
                    <div class="absolute top-0 left-0 right-0 h-3.5 bg-red-500 flex items-center justify-center"><span class="text-[6px] text-white font-black tracking-widest">DOC</span></div>
                    <div class="space-y-1 mt-4">
                        <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                        <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                        <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                    </div>
                </div>
                
                ${!isSystem ? `
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${doc.id}', 'doc', '${safeCode}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20 hover:bg-black/50">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>` : ''}
            </div>
            
            <div class="p-3 flex flex-col flex-1">
                <div class="text-[8px] font-black px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border ${tagColor} truncate max-w-full">${doc.type}</div>
                <div class="text-[12px] font-black text-slate-800 dark:text-white leading-tight mb-1 truncate">${doc.code}</div>
                <div class="text-[10px] font-medium text-[var(--text-muted)] leading-snug line-clamp-2 mb-2">${doc.title}</div>
                
                <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                    <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                        <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${isSystem ? 'Система' : (doc.owner ? doc.owner.split(' ')[0] : 'Инженер')}
                    </div>
                    <div class="text-[9px] font-black text-slate-400">${infoText}</div>
                </div>
            </div>
        </div>`;
            }
        });
        html += `</div></details>`;
    });

    container.innerHTML = html;
};

// ЭКСПОРТ НД В КОД (ДЛЯ system_docs.js)
window.exportDocsJsCode = function () {
    if (customDocs.length === 0) return showToast('Нет своих документов для экспорта');

    let jsCode = "/* Сгенерировано из RBI Quality (Пользовательские НД) */\n\nconst CUSTOM_SYSTEM_DOCS = [\n";
    customDocs.forEach((d, idx) => {
        const comma = idx < customDocs.length - 1 ? ',' : '';
        jsCode += `    {\n`;
        jsCode += `        id: '${d.id}',\n`;
        jsCode += `        type: '${d.type}',\n`;
        jsCode += `        code: '${d.code.replace(/'/g, "\\'")}',\n`;
        jsCode += `        title: '${d.title.replace(/'/g, "\\'")}',\n`;
        if (d.link) jsCode += `        link: '${d.link}',\n`;
        if (d.pdfData) jsCode += `        pdfData: '${d.pdfData}',\n`;
        if (d.pdfName) jsCode += `        pdfName: '${d.pdfName}',\n`;
        if (d.pdfSize) jsCode += `        pdfSize: '${d.pdfSize}',\n`;
        jsCode += `        isSystem: true\n`;
        jsCode += `    }${comma}\n`;
    });
    jsCode += "];\n";

    downloadFile(jsCode, `rbi_docs_code_${new Date().toLocaleDateString('ru-RU')}.js`, 'application/javascript');
    showToast("✅ Код JS скачан!");
};

// Фильтры НД
function filterDocs(type, btnElement) {
    currentDocFilter = type;
    window.currentDocFilter = currentDocFilter;
    const container = document.getElementById('doc-filters-container');
    container.querySelectorAll('.doc-filter-btn').forEach(btn => {
        btn.className = "doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700";
    });
    btnElement.className = "doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap border border-indigo-600";
    window.renderDocsList();
}

function _rbiCollectDocNewDraft() {
    if (window._editingDocId) return null;
    var type = (document.getElementById('new-doc-type') && document.getElementById('new-doc-type').value) || '';
    var code = (document.getElementById('new-doc-code') && document.getElementById('new-doc-code').value.trim()) || '';
    var title = (document.getElementById('new-doc-title') && document.getElementById('new-doc-title').value.trim()) || '';
    var pdfData = (document.getElementById('doc-pdf-preview') && document.getElementById('doc-pdf-preview').dataset.pdf) || '';
    var pdfName = (document.getElementById('doc-pdf-name') && document.getElementById('doc-pdf-name').innerText) || '';
    var pdfSize = (document.getElementById('doc-pdf-size') && document.getElementById('doc-pdf-size').innerText) || '';
    if (!code && !title && !pdfData) return null;
    return { type: type, code: code, title: title, pdfData: pdfData, pdfName: pdfName, pdfSize: pdfSize };
}

function _rbiApplyDocNewDraft(p) {
    if (!p) return;
    document.getElementById('new-doc-type').value = p.type || 'СП';
    document.getElementById('new-doc-code').value = p.code || '';
    document.getElementById('new-doc-title').value = p.title || '';
    if (p.pdfData) {
        var cont = document.getElementById('doc-pdf-preview');
        cont.dataset.pdf = p.pdfData;
        document.getElementById('doc-pdf-name').innerText = p.pdfName || 'document.pdf';
        document.getElementById('doc-pdf-size').innerText = p.pdfSize || '';
        cont.classList.remove('hidden');
        document.getElementById('doc-pdf-upload-btn').classList.add('hidden');
    }
}

function _rbiCollectNodeNewDraft() {
    if (window.currentEditingNodeId) return null;
    var title = (document.getElementById('node-title-input') && document.getElementById('node-title-input').value.trim()) || '';
    var desc = (document.getElementById('node-desc-input') && document.getElementById('node-desc-input').value.trim()) || '';
    var category = (document.getElementById('node-category-input') && document.getElementById('node-category-input').value) || '';
    var linkedDoc = (document.getElementById('node-linked-doc') && document.getElementById('node-linked-doc').value) || '';
    var linkedTwi = (document.getElementById('node-linked-twi') && document.getElementById('node-linked-twi').value) || '';
    var linkedChecklist = (document.getElementById('node-linked-checklist') && document.getElementById('node-linked-checklist').value) || '';
    var materials = [];
    document.querySelectorAll('.node-material-row').forEach(function (row) {
        materials.push({
            name: (row.querySelector('.mat-name') && row.querySelector('.mat-name').value) || '',
            qty: (row.querySelector('.mat-qty') && row.querySelector('.mat-qty').value) || ''
        });
    });
    var attachments = window.currentNodeAttachments ? window.currentNodeAttachments.slice() : [];
    var meaningful = !!(title || desc || linkedDoc || linkedTwi || linkedChecklist || attachments.length ||
        materials.some(function (m) { return (m.name || '').trim(); }));
    if (!meaningful) return null;
    return {
        title: title, desc: desc, category: category,
        linkedDoc: linkedDoc, linkedTwi: linkedTwi, linkedChecklist: linkedChecklist,
        materials: materials, attachments: attachments
    };
}

function _rbiApplyNodeNewDraft(p) {
    if (!p) return;
    document.getElementById('node-title-input').value = p.title || '';
    document.getElementById('node-desc-input').value = p.desc || '';
    document.getElementById('node-category-input').value = p.category || 'ФАСАД';
    document.getElementById('node-linked-doc').value = p.linkedDoc || '';
    document.getElementById('node-linked-twi').value = p.linkedTwi || '';
    document.getElementById('node-linked-checklist').value = p.linkedChecklist || '';
    document.getElementById('node-materials-container').innerHTML = '';
    var mats = Array.isArray(p.materials) ? p.materials : [];
    if (mats.length === 0) addNodeMaterialRow();
    else mats.forEach(function (m) {
        addNodeMaterialRow();
        var rows = document.querySelectorAll('.node-material-row');
        var lastRow = rows[rows.length - 1];
        lastRow.querySelector('.mat-name').value = m.name || '';
        lastRow.querySelector('.mat-qty').value = m.qty || '';
    });
    window.currentNodeAttachments = Array.isArray(p.attachments) ? p.attachments.slice() : [];
    if (typeof window.renderNodeAttachmentsUI === 'function') window.renderNodeAttachmentsUI();
}

// Открытие модалки добавления
function openAddDocModal() {
    if (!rbi_requireKnowledgeEditRight()) return;
    window._editingDocId = null;
    window._editingDocOriginalPdf = '';
    var FD = window.RBIFormDraft;
    if (FD) FD.unbindAutoSave(FD.KEYS.DOC_NEW);
    const heading = document.getElementById('add-doc-modal-heading');
    if (heading) heading.textContent = 'Добавить Норматив';
    document.getElementById('add-doc-modal-overlay').style.display = 'flex';
    document.body.classList.add('modal-open');
    document.getElementById('new-doc-type').value = 'СП';
    document.getElementById('new-doc-code').value = '';
    document.getElementById('new-doc-title').value = '';
    removeDocPdf();

    if (FD) {
        var decision = FD.askRestore(FD.KEYS.DOC_NEW, 'Норматив');
        if (decision === 'continue') {
            var d = FD.get(FD.KEYS.DOC_NEW);
            if (d && d.payload) _rbiApplyDocNewDraft(d.payload);
        }
        var overlay = document.getElementById('add-doc-modal-overlay');
        FD.bindAutoSave(overlay, FD.KEYS.DOC_NEW, _rbiCollectDocNewDraft);
    }
}

/** Редактирование пользовательского НД: id не меняется — связи узлов/TWI сохраняются. */
function openEditCustomDoc(id) {
    if (!rbi_requireKnowledgeEditRight()) return;
    const doc = customDocs.find(d => d.id === id);
    if (!doc) return showToast('Документ не найден');
    if (String(doc.id).startsWith('sys_')) {
        return showToast('⚠️ Системные документы нельзя редактировать');
    }
    if (!rbi_canDeleteKnowledgeItem(doc.owner)) {
        return showToast('⚠️ Можно редактировать только свой документ.');
    }

    window._editingDocId = id;
    window._editingDocOriginalPdf = doc.pdfData || '';
    const heading = document.getElementById('add-doc-modal-heading');
    if (heading) heading.textContent = 'Изменить Норматив';

    document.getElementById('new-doc-type').value = doc.type || 'СП';
    document.getElementById('new-doc-code').value = doc.code || '';
    document.getElementById('new-doc-title').value = doc.title || '';

    const cont = document.getElementById('doc-pdf-preview');
    const uploadBtn = document.getElementById('doc-pdf-upload-btn');
    if (doc.pdfData && cont) {
        cont.dataset.pdf = doc.pdfData;
        document.getElementById('doc-pdf-name').innerText = doc.pdfName || 'document.pdf';
        document.getElementById('doc-pdf-size').innerText = doc.pdfSize || '';
        cont.classList.remove('hidden');
        if (uploadBtn) uploadBtn.classList.add('hidden');
    } else {
        removeDocPdf();
    }

    document.getElementById('add-doc-modal-overlay').style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeAddDocModal() {
    var FD = window.RBIFormDraft;
    var wasEdit = !!window._editingDocId;
    if (FD) {
        if (!wasEdit && !window._rbiDocNewSkipSave) {
            FD.saveNow(FD.KEYS.DOC_NEW, _rbiCollectDocNewDraft);
        }
        FD.unbindAutoSave(FD.KEYS.DOC_NEW);
    }
    window._rbiDocNewSkipSave = false;
    document.getElementById('add-doc-modal-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    window._editingDocId = null;
    window._editingDocOriginalPdf = '';
}

// Обработка загрузки PDF для НД
window.handleDocPdfUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { event.target.value = ''; return showToast("Файл слишком большой! Максимум 15 МБ."); }

    showToast("⚙️ Сохранение PDF в локальную базу...");
    const reader = new FileReader();
    reader.onload = async function (e) {
        // Пропускаем через менеджер кэша
        const localUrl = await PhotoManager.saveLocal(e.target.result, 'doc');

        const cont = document.getElementById('doc-pdf-preview');
        cont.dataset.pdf = localUrl;
        document.getElementById('doc-pdf-name').innerText = file.name;
        document.getElementById('doc-pdf-size').innerText = (file.size / 1024 / 1024).toFixed(1) + ' MB';

        cont.classList.remove('hidden');
        document.getElementById('doc-pdf-upload-btn').classList.add('hidden');
        event.target.value = '';
        if (window.RBIFormDraft && !window._editingDocId) {
            window.RBIFormDraft.saveNow(window.RBIFormDraft.KEYS.DOC_NEW, _rbiCollectDocNewDraft);
        }
    }
    reader.readAsDataURL(file);
};

window.removeDocPdf = function () {
    const cont = document.getElementById('doc-pdf-preview');
    if (cont) {
        cont.dataset.pdf = '';
        cont.classList.add('hidden');
        document.getElementById('doc-pdf-upload-btn').classList.remove('hidden');
    }
};

function _scheduleDocPdfIndex(docId, pdfData) {
    // ВАЖНО: sync только ПОСЛЕ OCR — иначе документ уходит в облако без extractedText
    // (повторный sync во время push молча теряется, см. triggerSync).
    setTimeout(async () => {
        showToast('📄 Индексация текста документа для ИИ...');
        const realUrl = await PhotoManager.getAsyncUrl(pdfData) || pdfData;
        const extracted = await _extractTextFromPdf(realUrl);
        if (extracted) {
            const freshDocs = await _storage().getAll(_storage().stores().CUSTOM_DOCS) || customDocs;
            const idx = freshDocs.findIndex(d => d.id === docId);
            if (idx !== -1) {
                freshDocs[idx].extractedText = extracted;
                freshDocs[idx].updatedAt = new Date().toISOString();
                freshDocs[idx].updated_at = freshDocs[idx].updatedAt;
                freshDocs[idx].source = 'local';
                freshDocs[idx].syncStatus = 'not_synced';
                freshDocs[idx].sync_status = 'not_synced';
                await _storage().put(_storage().stores().CUSTOM_DOCS, freshDocs[idx]);
                customDocs = freshDocs.filter(d => !d._deleted);
                window.customDocs = customDocs;
                showToast('✨ Текст документа успешно проиндексирован ИИ!');
            }
        } else {
            showToast('⚠️ Текст из PDF извлечь не удалось.');
        }
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
    }, 2000);
}

// Сохранение документа (создание или правка существующего — id не меняется)
async function saveCustomDoc() {
    if (!rbi_requireKnowledgeEditRight()) return;
    const type = document.getElementById('new-doc-type').value;
    const code = document.getElementById('new-doc-code').value.trim();
    const title = document.getElementById('new-doc-title').value.trim();
    const pdfData = document.getElementById('doc-pdf-preview').dataset.pdf || '';

    if (!code || !title) return showToast('⚠️ Заполните шифр и название документа');

    const editingId = window._editingDocId || null;
    const nowIso = new Date().toISOString();

    if (editingId) {
        const existing = customDocs.find(d => d.id === editingId);
        if (!existing) return showToast('Документ не найден');
        if (!rbi_canDeleteKnowledgeItem(existing.owner)) {
            return showToast('⚠️ Можно редактировать только свой документ.');
        }

        const originalPdf = window._editingDocOriginalPdf || '';
        const pdfChanged = pdfData !== originalPdf;
        const hasPdf = !!pdfData;

        const updated = {
            ...existing,
            type,
            code,
            title,
            updatedAt: nowIso,
            updated_at: nowIso,
            source: 'local',
            syncStatus: 'not_synced',
            sync_status: 'not_synced',
            syncBlockReason: '',
            sync_block_reason: '',
        };

        if (hasPdf) {
            updated.pdfData = pdfData;
            updated.pdfName = document.getElementById('doc-pdf-name').innerText;
            updated.pdfSize = document.getElementById('doc-pdf-size').innerText;
            if (pdfChanged) {
                updated.extractedText = '';
            }
        } else {
            delete updated.pdfData;
            delete updated.pdfName;
            delete updated.pdfSize;
            updated.extractedText = '';
        }

        try {
            const idx = customDocs.findIndex(d => d.id === editingId);
            if (idx !== -1) customDocs[idx] = updated;
            window.customDocs = customDocs;
            await _storage().put(_storage().stores().CUSTOM_DOCS, updated);
            showToast('✅ Норматив обновлён!');
            closeAddDocModal();
            window.renderDocsList();

            if (hasPdf && pdfChanged) {
                _scheduleDocPdfIndex(editingId, pdfData);
            } else {
                localStorage.setItem('rbi_cloud_dirty', '1');
                _sync('silent');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Ошибка сохранения (Файл слишком большой)');
        }
        return;
    }

    const newDoc = {
        id: 'usr_doc_' + Date.now().toString(36),
        type: type,
        code: code,
        title: title,
        isSystem: false,
        owner: rbi_getCurrentUserNameSafe(),
        source: 'local',
        syncStatus: 'not_synced',
        sync_status: 'not_synced',
        syncBlockReason: '',
        sync_block_reason: '',
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const hasPdf = !!pdfData;

    if (hasPdf) {
        newDoc.pdfData = pdfData;
        newDoc.pdfName = document.getElementById('doc-pdf-name').innerText;
        newDoc.pdfSize = document.getElementById('doc-pdf-size').innerText;
        _scheduleDocPdfIndex(newDoc.id, pdfData);
    }

    customDocs.unshift(newDoc);
    window.customDocs = customDocs;

    try {
        await _storage().put(_storage().stores().CUSTOM_DOCS, newDoc);
        showToast('✅ Норматив успешно добавлен!');
        if (window.RBIFormDraft) {
            window.RBIFormDraft.clear(window.RBIFormDraft.KEYS.DOC_NEW);
            window.RBIFormDraft.unbindAutoSave(window.RBIFormDraft.KEYS.DOC_NEW);
        }
        window._rbiDocNewSkipSave = true;
        closeAddDocModal();
        window.renderDocsList();

        if (!hasPdf) {
            localStorage.setItem('rbi_cloud_dirty', '1');
            _sync('silent');
        }
    } catch (e) {
        console.error(e);
        showToast('❌ Ошибка сохранения (Файл слишком большой)');
    }
}

// Удаление
window.deleteCustomDoc = async function (id) {
    const doc = customDocs.find(d => d.id === id);
    if (!rbi_canDeleteKnowledgeItem(doc?.owner)) {
        return showToast("⚠️ Инженер может удалить только свой документ.");
    }
    if (!confirm('Удалить этот документ из базы?')) return;

    if (doc) {
        const nowIso = new Date().toISOString();
        doc._deleted = true;
        doc.is_deleted = true;
        doc.deleted_at = nowIso;
        doc.updatedAt = nowIso;
        doc.updated_at = nowIso;
        doc.source = 'local';
        doc.syncStatus = 'not_synced';
        doc.sync_status = 'not_synced';

        await _storage().put(_storage().stores().CUSTOM_DOCS, doc);
    }

    showToast('🗑️ Документ удален');
    customDocs = customDocs.filter(d => !d._deleted);
    window.customDocs = customDocs;
    window.renderDocsList();

    localStorage.setItem('rbi_cloud_dirty', '1');
    _sync('silent');
};

// Админ-инструмент: заново распознать текст норматива и отправить в облако,
// без повторной загрузки файла. Нужен для документов, "застрявших" из-за
// race между OCR и синхронизацией (см. saveCustomDoc).
window.rbi_reindexCustomDoc = async function (docId) {
    var _permSvc5 = (typeof _ctx !== 'undefined' && _ctx && _ctx.permissions) || (window.RBI && window.RBI.services && window.RBI.services.permissions);
    if (!_permSvc5 || !_permSvc5.isAdmin()) {
        return showToast('⚠️ Доступно только администратору');
    }

    const doc = customDocs.find(d => d.id === docId);
    if (!doc) return showToast('Документ не найден');
    if (!doc.pdfData) return showToast('⚠️ У документа нет PDF-файла для распознавания');

    showToast('📄 Повторная индексация текста документа...');
    try {
        const realUrl = await PhotoManager.getAsyncUrl(doc.pdfData) || doc.pdfData;
        const extracted = await _extractTextFromPdf(realUrl);

        const freshDocs = await _storage().getAll(_storage().stores().CUSTOM_DOCS) || customDocs;
        const idx = freshDocs.findIndex(d => d.id === docId);
        if (idx === -1) return showToast('Документ не найден в базе');

        if (extracted) {
            freshDocs[idx].extractedText = extracted;
        }
        freshDocs[idx].updatedAt = new Date().toISOString();
        freshDocs[idx].updated_at = freshDocs[idx].updatedAt;
        freshDocs[idx].source = 'local';
        freshDocs[idx].syncStatus = 'not_synced';
        freshDocs[idx].sync_status = 'not_synced';

        await _storage().put(_storage().stores().CUSTOM_DOCS, freshDocs[idx]);
        customDocs = freshDocs.filter(d => !d._deleted);
        window.customDocs = customDocs;

        showToast(extracted ? '✨ Текст переиндексирован, отправляем в облако...' : '⚠️ Текст извлечь не удалось, но переотправляем документ');

        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
    } catch (e) {
        console.error(e);
        showToast('❌ Ошибка переиндексации документа');
    }
};

// ПРОСМОТРЩИК НД (Используем оболочку TWI)
window.openDocViewer = async function (docId) {
    const allDocs = [...(typeof window.SYSTEM_DOCS !== 'undefined' ? window.SYSTEM_DOCS : []), ...customDocs];
    const doc = allDocs.find(d => d.id === docId);
    if (!doc) return showToast('Документ не найден');

    if (doc.isSystem || !doc.pdfData) {
        return window.findAndOpenND(doc.code + " " + doc.title);
    }

    await window.rbiOpenPdfInTwiViewer(
        doc.pdfData,
        doc.title,
        doc.code || 'Нормативный документ',
        doc.pdfName || doc.code || 'document.pdf',
        doc.pdfSize || ''
    );

    if (!doc.extractedText && doc.pdfData && _getSetting('aiEnabled')) {
        setTimeout(async () => {
            try {
                const realUrl = await PhotoManager.getAsyncUrl(doc.pdfData) || doc.pdfData;
                const extracted = await _extractTextFromPdf(realUrl);

                if (extracted) {
                    doc.extractedText = extracted;
                    doc.updatedAt = new Date().toISOString();
                    doc.updated_at = doc.updatedAt;
                    doc.source = 'local';
                    doc.syncStatus = 'not_synced';
                    doc.sync_status = 'not_synced';

                    await _storage().put(_storage().stores().CUSTOM_DOCS, doc);

                    localStorage.setItem('rbi_cloud_dirty', '1');
                    _sync('silent');
                }
            } catch (e) {
                console.warn('[DocViewer] Индексация PDF пропущена:', e);
            }
        }, 2000);
    }
};

/**
 * Рендер списка конструктивных узлов.
 * Вызывается из index.html: oninput="renderNodesList()"
 */
window.renderNodesList = function () {
    var container = document.getElementById('nodes-list-container');
    var searchInput = (document.getElementById('node-search-input') && document.getElementById('node-search-input').value.toLowerCase()) || '';
    if (!container) return;

    var filtersBlock = document.getElementById('node-filters-block');
    if (filtersBlock && !filtersBlock.innerHTML.includes('nodeOwnerFilter')) {
        var originalHtml = filtersBlock.innerHTML;
        filtersBlock.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <label class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                    <span class="text-[10px] font-black uppercase tracking-widest ${window.nodeOwnerFilter === 'MY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">Только мои</span>
                    <div class="relative">
                        <input type="checkbox" class="sr-only peer" onchange="window.nodeOwnerFilter = this.checked ? 'MY' : 'ALL'; renderNodesList()" ${window.nodeOwnerFilter === 'MY' ? 'checked' : ''}>
                        <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                    </div>
                </label>
                <div class="flex items-center gap-2">
                    <div id="nodes-view-mode-toggle" class="shrink-0"></div>
                    <button type="button" onclick="downloadMissingCloudFiles()" class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-500 active:scale-95 shadow-sm" title="Скачать всё для офлайна" aria-label="Скачать всё для офлайна">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </button>
                </div>
            </div>
        ` + originalHtml;
    }
    var nodesToggleHost = document.getElementById('nodes-view-mode-toggle');
    if (nodesToggleHost && typeof window.kbViewModeToggleHtml === 'function') {
        nodesToggleHost.innerHTML = window.kbViewModeToggleHtml('nodes');
    }

    var allNodes = [...window.SYSTEM_NODES, ...window.customNodes];
    var currentEngineer = _getSetting('engineerName') || 'Инженер';

    var filtered = allNodes.filter(function (node) {
        var title = String(node.title || node.name || (node.data && node.data.title) || '').toLowerCase();
        var desc = String(node.desc || node.description || (node.data && node.data.desc) || (node.data && node.data.description) || '').toLowerCase();
        var category = String(node.category || (node.data && node.data.category) || '').toLowerCase();
        var owner = node.owner || (node.data && node.data.owner) || '';

        var matchSearch =
            title.includes(searchInput) ||
            desc.includes(searchInput) ||
            category.includes(searchInput);

        var isSystemNode = !window.customNodes.find(function (n) { return n.id === node.id; });

        var matchOwner =
            window.nodeOwnerFilter === 'ALL' ||
            isSystemNode ||
            owner === currentEngineer;

        return matchSearch && matchOwner;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Узлы не найдены</div>`;
        return;
    }

    var grouped = {};
    filtered.forEach(function (node) {
        var groupName = node.category || (node.data && node.data.category) || 'Без категории';
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(node);
    });

    var isListView = window.getKnowledgeViewMode('nodes') === 'list';
    var itemsWrapClass = isListView ? 'flex flex-col gap-1.5 py-2' : 'grid grid-cols-2 md:grid-cols-3 gap-3 py-2';
    var html = '';
    for (var cat in grouped) {
        html += `
    <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
        <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
            <span class="truncate pr-4">${cat} <span class="text-[10px] text-slate-400 ml-1">(${grouped[cat].length})</span></span>
            <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
            </span>
        </summary>
        <div class="${itemsWrapClass}">
    `;

        grouped[cat].forEach(function (node) {
            var isSystem = !window.customNodes.find(function (n) { return n.id === node.id; });
            var isOwner = !node.owner || node.owner === currentEngineer;
            var nodeTitle = node.title || node.name || 'Узел';
            var safeNodeTitle = String(nodeTitle).replace(/'/g, "\\'");

            var previewHtml = '';
            var hasPdfAttachment = node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'pdf';
            var isOldPdf = node.img && node.img.includes('application/pdf');
            var listThumb = '';

            if (hasPdfAttachment || isOldPdf) {
                previewHtml = `
                <div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 relative p-2">
                    <div class="w-12 h-16 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-red-200 dark:border-red-800 flex flex-col justify-between p-1.5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 right-0 h-4 bg-red-500 flex items-center justify-center"><span class="text-[7px] text-white font-black tracking-widest">PDF</span></div>
                        <div class="space-y-1.5 mt-5">
                            <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                            <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                            <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                        </div>
                    </div>
                </div>`;
                listThumb = '<span class="text-[8px] font-black text-red-500">PDF</span>';
            } else if (node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'image') {
                previewHtml = `<img src="${window.getPhotoSrc(node.attachments[0].url)}" class="w-full h-full object-contain p-2">`;
                listThumb = `<img src="${window.getPhotoSrc(node.attachments[0].url)}" class="w-full h-full object-cover">`;
            } else if (node.img) {
                previewHtml = `<img src="${window.getPhotoSrc(node.img)}" class="w-full h-full object-contain p-2">`;
                listThumb = `<img src="${window.getPhotoSrc(node.img)}" class="w-full h-full object-cover">`;
            } else {
                previewHtml = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg></div>`;
                listThumb = '<span class="text-[8px] font-black text-slate-400">УЗЕЛ</span>';
            }

            var menuBtn = !isSystem
                ? `<button onclick="event.stopPropagation(); openUniversalActionSheet('${node.id}', 'node', '${safeNodeTitle}', ${isOwner})" class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-[var(--hover-bg)] active:scale-90"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>`
                : '';

            if (isListView) {
                html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm flex items-center gap-2.5 p-2 active:scale-[0.99] transition-transform relative cursor-pointer" onclick="openNodeViewer('${node.id}')">
            <div class="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center">${listThumb}</div>
            <div class="min-w-0 flex-1">
                <div class="text-[12px] font-bold text-slate-800 dark:text-white truncate">${nodeTitle}${isSystem ? ' <span class="text-[8px] font-black text-indigo-500">СИС</span>' : ''}</div>
                <div class="text-[9px] font-bold text-slate-400 truncate mt-0.5">${node.category || ''} · ${isSystem ? 'Система' : (node.owner ? node.owner.split(' ')[0] : 'Инженер')}</div>
            </div>
            ${menuBtn}
        </div>`;
            } else {
            html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openNodeViewer('${node.id}')">
            ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИС</div>' : ''}
            
            <div class="h-28 sm:h-32 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 relative">
                ${previewHtml}
                ${!isSystem ? `
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${node.id}', 'node', '${safeNodeTitle}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>` : ''}
            </div>
            
            <div class="p-3 flex flex-col flex-1">
                <div class="text-[8px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase truncate max-w-full">${node.category}</div>
                <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">${nodeTitle}</div>
                
                <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                    <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                        <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${isSystem ? 'Система' : (node.owner ? node.owner.split(' ')[0] : 'Инженер')}
                    </div>
                </div>
            </div>
        </div>`;
            }
        });

        html += `</div></details>`;
    }

    container.innerHTML = html;
};

// =========================================================================
// БЛОК: KNOWLEDGESTATE SYNC (хотфикс, перенесено из knowledge.legacy.js
// Блок 9.5). Рендер идёт через legacy-функции выше (архитектурно
// зафиксированное решение — см. current_plan.md); этот блок только
// поддерживает KnowledgeState в актуальном состоянии для API-вызовов и
// будущего использования KnowledgeRender/KnowledgeActions.
// =========================================================================

function _syncKnowledgeState() {
    if (!window.KnowledgeState) return;
    if (Array.isArray(window.customTwiCards)) {
        window.KnowledgeState.setTwiCards(window.customTwiCards);
    }
    if (Array.isArray(window.customDocs)) {
        window.KnowledgeState.setDocs(window.customDocs);
    }
    if (Array.isArray(window.customNodes)) {
        window.KnowledgeState.setNodes(window.customNodes);
    }
}

// Keepalive sync: после rbi_reloadReferenceMemory — обновить KnowledgeState.
// Оборачивает window.rbi_reloadReferenceMemory, определённый выше в этом файле.
var _knowledgeStateSync_origReload = window.rbi_reloadReferenceMemory;
window.rbi_reloadReferenceMemory = function () {
    var result = _knowledgeStateSync_origReload && _knowledgeStateSync_origReload.apply(this, arguments);
    Promise.resolve(result).then(function () {
        _syncKnowledgeState();
    });
    return result;
};

// Boot sync: когда ES-модуль knowledge.state.js опубликует window.KnowledgeState —
// сразу заполнить его уже загруженными данными из window.customTwiCards и т.д.
(function () {
    var _knowledgeStateSync_ksValue = window.KnowledgeState;
    Object.defineProperty(window, 'KnowledgeState', {
        configurable: true,
        enumerable:   true,
        get: function () { return _knowledgeStateSync_ksValue; },
        set: function (val) {
            _knowledgeStateSync_ksValue = val;
            if (val) {
                Promise.resolve().then(function () {
                    _syncKnowledgeState();
                    console.log('[KnowledgeModule] ✅ Блок 9.5 boot sync: KnowledgeState заполнен');
                });
            }
        }
    });
}());

// Регистрируем публичные функции на window
window.toggleTwiManagePanel   = toggleTwiManagePanel;
window.exportTwiJson          = exportTwiJson;
window.processTwiImport       = processTwiImport;
window.openTwiActionSheet     = openTwiActionSheet;
window.closeTwiActionSheet    = closeTwiActionSheet;
window.handleTwiAction        = handleTwiAction;
window.changeTwiType          = changeTwiType;
window.populateTwiItemSelect  = populateTwiItemSelect;
window.autoFillTwiNorm        = autoFillTwiNorm;
window.openNodeSelectorModal  = openNodeSelectorModal;
window.closeNodeSelectorModal = closeNodeSelectorModal;
window.selectNodeForTwi       = selectNodeForTwi;
window.closeTwiConstructor    = closeTwiConstructor;
window.handleTwiPdfUpload     = handleTwiPdfUpload;
window.renderPdfFile          = renderPdfFile;
window.removeTwiPdf           = removeTwiPdf;
window.renderGoodPhoto        = renderGoodPhoto;
window.renderBadPhoto         = renderBadPhoto;
window.addTwiStep             = addTwiStep;
window.removeTwiPhoto         = removeTwiPhoto;
window.triggerTwiPhotoUpload  = triggerTwiPhotoUpload;
window.removeTwiGoodPhoto     = removeTwiGoodPhoto;
window.removeTwiBadPhoto      = removeTwiBadPhoto;
window.toggleManagePanel      = toggleManagePanel;
window.toggleNodeManagePanel  = toggleNodeManagePanel;
window.exportNodeJson         = exportNodeJson;
window.exportNodeJsCode       = exportNodeJsCode;
window.processNodeImport      = processNodeImport;
window.closeNodeConstructor   = closeNodeConstructor;
window.addNodeMaterialRow     = addNodeMaterialRow;
window.filterNodes            = filterNodes;
window.closeNodeViewer        = closeNodeViewer;
window.filterDocs             = filterDocs;
window.openAddDocModal        = openAddDocModal;
window.openEditCustomDoc      = openEditCustomDoc;
window.closeAddDocModal       = closeAddDocModal;
window.saveCustomDoc          = saveCustomDoc;

// =========================================================================
// РАЗМЕТКА МОДАЛОК KNOWLEDGE (перенос из index.html:749-806/808-867/908-973/
// 998-1078/1265-1293/1458-1483, перенос 30 modal/overlay-блоков #app-modals
// в JS-рендер). HTML-строки 1:1 идентичны прежней статичной разметке.
// =========================================================================
function renderNodeViewerOverlayMarkup() {
    return `
    <div id="node-viewer-overlay"
        class="fixed inset-0 bg-slate-900/90 z-[2500] hidden flex-col transition-opacity duration-300 opacity-0"
        data-knowledge-action="closeNodeViewer">
        <div class="bg-[var(--bg-main)] w-full h-full max-w-2xl mx-auto flex flex-col shadow-2xl overflow-hidden relative"
            onclick="event.stopPropagation()">
            <div
                class="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10 sticky top-0 shrink-0">
                <div class="flex flex-col min-w-0 pr-4">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span
                            class="bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-white/30"
                            id="viewer-node-badge">ТИП</span>
                        <span class="text-[10px] font-bold text-indigo-200 uppercase tracking-widest truncate"
                            id="viewer-node-category">Категория</span>
                    </div>
                    <span class="text-sm font-black truncate leading-tight" id="viewer-node-title">Название Узла</span>
                </div>
                <button data-knowledge-action="closeNodeViewer"
                    class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center font-black active:scale-90 border border-indigo-400 shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900" id="viewer-node-content">
                <div id="viewer-node-attachments"
                    class="w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm p-3 space-y-3">
                    <!-- Сюда JS загрузит картинки и PDF -->
                </div>
                <div class="p-4 space-y-4">
                    <div
                        class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Описание</div>
                        <div id="viewer-node-desc"
                            class="text-[12px] font-medium leading-relaxed text-slate-700 dark:text-slate-300"></div>
                    </div>
                    <div
                        class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div
                            class="bg-slate-50 dark:bg-slate-900/50 p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2">
                                </path>
                            </svg> Спецификация материалов
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-[11px]">
                                <tbody id="viewer-node-materials"
                                    class="divide-y divide-slate-100 dark:divide-slate-700"></tbody>
                            </table>
                        </div>
                    </div>
                    <div id="viewer-node-links" class="grid grid-cols-2 gap-2"></div>
                </div>
            </div>
        </div>
    </div>
`;
}

function renderTwiViewerOverlayMarkup() {
    return `
    <div id="twi-viewer-overlay"
        class="fixed inset-0 bg-slate-900/90 z-[2500] hidden flex-col transition-opacity duration-300 opacity-0"
        data-knowledge-action="closeTwiViewer">
        <div class="bg-[var(--bg-main)] w-full h-full max-w-2xl mx-auto flex flex-col shadow-2xl overflow-hidden relative"
            onclick="event.stopPropagation()">
            <div
                class="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10 sticky top-0 shrink-0">
                <div class="flex flex-col min-w-0 pr-4">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span
                            class="bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-white/30"
                            id="viewer-twi-badge">ТИП</span>
                        <span class="text-[10px] font-bold text-indigo-200 uppercase tracking-widest truncate"
                            id="viewer-twi-checklist">Вид работ</span>
                    </div>
                    <span class="text-sm font-black truncate leading-tight" id="viewer-twi-title">Название
                        Инструкции</span>
                </div>
                <button data-knowledge-action="closeTwiViewer"
                    class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center active:scale-90 shrink-0 border border-indigo-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div id="viewer-twi-info-panel"
                class="hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex gap-6 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm z-10 shrink-0">
                <div class="flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-400" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg> <span id="viewer-twi-time">0 мин</span></div>
                <div class="flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-400" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2">
                        </path>
                    </svg> <span id="viewer-twi-steps-count">0 шагов</span></div>
            </div>
            <div class="flex-1 overflow-y-auto p-0 md:p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900 relative"
                id="viewer-twi-content"></div>
            <div id="viewer-twi-footer"
                class="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0 flex gap-2">
                <button data-knowledge-action="showTwiPrintOptions"
                    class="w-12 h-12 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center active:scale-95 border border-slate-200 dark:border-slate-600 shrink-0 shadow-sm">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z">
                        </path>
                    </svg>
                </button>
                <button data-knowledge-action="closeTwiViewer"
                    class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[12px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                    </svg> Прочитано
                </button>
            </div>
        </div>
    </div>
`;
}

function renderTwiActionSheetMarkup() {
    return `
    <div id="twi-action-sheet"
        class="fixed inset-0 bg-slate-900/60 z-[3500] hidden items-end justify-center p-2 sm:p-4 backdrop-blur-sm transition-opacity duration-300 opacity-0"
        data-knowledge-action="closeTwiActionSheet">
        <div class="bg-[var(--card-bg)] w-full max-w-md rounded-3xl shadow-2xl transition-transform duration-300 transform translate-y-full mb-[20px] sm:mb-0 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col"
            onclick="event.stopPropagation()">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-[var(--hover-bg)] shrink-0">
                <h3 class="font-black text-[13px] uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2"
                    id="twi-action-title">
                    Действия с картой
                </h3>
            </div>
            <div class="p-2 space-y-1">
                <button data-knowledge-action="handleTwiAction" data-action-arg="view"
                    class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
                    <div
                        class="w-8 h-8 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z">
                            </path>
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">
                            </path>
                        </svg>
                    </div>
                    <span class="text-[12px] font-bold">Смотреть</span>
                </button>
                <button data-knowledge-action="handleTwiAction" data-action-arg="edit"
                    class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
                    <div
                        class="w-8 h-8 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded-lg flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125">
                            </path>
                        </svg>
                    </div>
                    <span class="text-[12px] font-bold">Редактировать</span>
                </button>
                <button data-knowledge-action="handleTwiAction" data-action-arg="duplicate"
                    class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
                    <div
                        class="w-8 h-8 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z">
                            </path>
                        </svg>
                    </div>
                    <span class="text-[12px] font-bold">Дублировать</span>
                </button>
                <div class="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                <button data-knowledge-action="handleTwiAction" data-action-arg="delete"
                    class="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-red-600 dark:text-red-400 active:scale-95">
                    <div
                        class="w-8 h-8 bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-500 rounded-lg flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                            </path>
                        </svg>
                    </div>
                    <span class="text-[12px] font-bold">Удалить</span>
                </button>
            </div>
        </div>
    </div>
`;
}

function renderAddDocModalOverlayMarkup() {
    return `
    <div id="add-doc-modal-overlay"
        class="fixed inset-0 bg-slate-900/80 z-[2000] hidden items-center justify-center p-4 backdrop-blur-sm"
        data-knowledge-action="closeAddDocModal">
        <div class="bg-[var(--card-bg)] w-full max-w-md p-6 rounded-2xl shadow-2xl transition-transform border border-[var(--card-border)]"
            onclick="event.stopPropagation()">
            <div
                class="font-black text-[13px] uppercase tracking-tight mb-4 border-b border-[var(--card-border)] pb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253">
                    </path>
                </svg>
                <span id="add-doc-modal-heading">Добавить Норматив</span>
            </div>

            <div class="space-y-4 mb-6">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Тип документа
                            *</label>
                        <select id="new-doc-type" class="input-base">
                            <option value="СП">СП</option>
                            <option value="ГОСТ">ГОСТ</option>
                            <option value="ПРОЕКТ">Проект / РД</option>
                            <option value="ТУ">ТУ / Регламент</option>
                            <option value="ИНСТРУКЦИЯ">Инструкция</option>
                            <option value="ТЕХ. КАРТА">Тех. карта</option>
                            <option value="СТАНДАРТ">Стандарт</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Шифр
                            *</label>
                        <input type="text" id="new-doc-code" class="input-base" placeholder="СТО-12345">
                    </div>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Название
                        документа *</label>
                    <textarea id="new-doc-title" class="input-base h-16 resize-none"
                        placeholder="Полное наименование..."></textarea>
                </div>

                <div class="pt-2 border-t border-[var(--card-border)]">
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Вложенный файл
                        (PDF)</label>
                    <div id="doc-pdf-preview"
                        class="hidden mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex justify-between items-center shadow-inner"
                        data-pdf="">
                        <div class="min-w-0 pr-3">
                            <div class="text-[11px] font-black text-slate-800 dark:text-white truncate"
                                id="doc-pdf-name">doc.pdf</div>
                            <div class="text-[9px] font-bold text-slate-500" id="doc-pdf-size">1.2 MB</div>
                        </div>
                        <button data-knowledge-action="removeDocPdf"
                            class="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-red-500 font-black shadow-sm border border-slate-200 dark:border-slate-700 active:scale-90"><svg
                                class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                            </svg></button>
                    </div>
                    <button id="doc-pdf-upload-btn" onclick="document.getElementById('doc-pdf-input').click()"
                        class="w-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-[10px] font-bold uppercase active:scale-95 transition-colors flex justify-center items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5">
                            </path>
                        </svg>
                        Прикрепить PDF файл (до 5 МБ)
                    </button>
                </div>
            </div>

            <div class="flex gap-2">
                <button data-knowledge-action="closeAddDocModal"
                    class="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 dark:bg-slate-800 dark:text-slate-300">Отмена</button>
                <button data-knowledge-action="saveCustomDoc"
                    class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[11px] uppercase shadow-md active:scale-95">Сохранить</button>
            </div>
        </div>
    </div>
`;
}

function renderItemHelpModalOverlayMarkup() {
    return `
    <div id="item-help-modal-overlay"
        class="fixed inset-0 bg-slate-900/70 z-[2400] hidden items-end justify-center p-0 sm:p-4 backdrop-blur-sm"
        data-knowledge-action="closeItemHelpMenu">
        <div class="bg-[var(--card-bg)] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl transition-transform transform translate-y-full flex flex-col max-h-[85vh]"
            id="item-help-modal-content" onclick="event.stopPropagation()">
            <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center shrink-0">
                <div class="flex flex-col min-w-0 pr-4">
                    <span
                        class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Справка и Инструкции
                    </span>
                    <span class="text-[13px] font-bold text-slate-800 dark:text-white truncate leading-tight"
                        id="help-modal-title">Название пункта</span>
                </div>
                <button data-knowledge-action="closeItemHelpMenu"
                    class="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 active:scale-90 shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-slate-50 dark:bg-slate-900/50"
                id="help-modal-list"></div>
        </div>
    </div>
`;
}

function renderNodeSelectorModalMarkup() {
    return `
    <div id="node-selector-modal"
        class="fixed inset-0 bg-slate-900/70 z-[4000] hidden flex-col items-center justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm transition-opacity duration-300 opacity-0"
        data-knowledge-action="closeNodeSelectorModal">
        <div class="bg-[var(--bg-main)] w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl transition-transform transform translate-y-full sm:translate-y-4 sm:scale-95 flex flex-col max-h-[85vh] border border-slate-200/50 dark:border-slate-700/50"
            onclick="event.stopPropagation()">
            <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                <div
                    class="font-black text-[13px] uppercase tracking-tight text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244">
                        </path>
                    </svg>
                    Привязать технический узел
                </div>
                <button data-knowledge-action="closeNodeSelectorModal"
                    class="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 active:scale-90 shadow-sm border border-slate-200 dark:border-slate-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-slate-50 dark:bg-slate-900/50"
                id="node-selector-list"></div>
        </div>
    </div>
`;
}

(function mountKnowledgeModalsMarkup() {
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals');
    if (!root) return;
    if (!document.getElementById('node-viewer-overlay')) {
        root.insertAdjacentHTML('beforeend', renderNodeViewerOverlayMarkup());
    }
    if (!document.getElementById('twi-viewer-overlay')) {
        root.insertAdjacentHTML('beforeend', renderTwiViewerOverlayMarkup());
    }
    if (!document.getElementById('twi-action-sheet')) {
        root.insertAdjacentHTML('beforeend', renderTwiActionSheetMarkup());
    }
    if (!document.getElementById('add-doc-modal-overlay')) {
        root.insertAdjacentHTML('beforeend', renderAddDocModalOverlayMarkup());
    }
    if (!document.getElementById('item-help-modal-overlay')) {
        root.insertAdjacentHTML('beforeend', renderItemHelpModalOverlayMarkup());
    }
    if (!document.getElementById('node-selector-modal')) {
        root.insertAdjacentHTML('beforeend', renderNodeSelectorModalMarkup());
    }
}());

// =========================================================================
// ДЕЛЕГИРОВАНИЕ INLINE onclick/onchange (инициатива «Разбор inline
// onclick/onchange», см. _ai/INDEX_HTML_HANDLERS_MAP.md / _ai/ROADMAP.md).
// Namespace `data-knowledge-action` (не общий `data-action` ai.module.js —
// избегает двойного срабатывания при коллизии владения, см. отчёт Блока 2/N).
// Capture-фаза + ручной резолвер с остановкой на stopPropagation-узле —
// обязателен, т.к. узлы этой группы находятся внутри модалок с классическим
// backdrop-паттерном (node-viewer-overlay/twi-viewer-overlay/twi-action-sheet/
// add-doc-modal-overlay/node-selector-modal/faq-modal-overlay/app-assistant-modal).
// Расширение относительно settings.module.js#bindSettingsActionDelegation:
// поддержка второго аргумента (`data-knowledge-action-arg2-type`) для случая
// filterDocs(arg, this) — статическая строка + сам DOM-элемент.
function bindKnowledgeActionDelegation() {
    if (window.__knowledgeActionDelegationBound) return;
    window.__knowledgeActionDelegationBound = true;

    const readArg = (el, valType, evt) => {
        switch (valType) {
            case 'element': return el;
            case 'event': return evt;
            case 'checked': return el.checked;
            case 'int': return parseInt(el.value, 10);
            case 'value': return el.value;
            default: return undefined;
        }
    };

    const dispatch = (el, evt) => {
        const action = el.dataset.knowledgeAction;
        const fn = window[action];
        if (typeof fn !== 'function') return;
        const valType = el.dataset.knowledgeActionValType;
        const arg = valType ? readArg(el, valType, evt) : el.dataset.actionArg;
        const arg2Type = el.dataset.knowledgeActionArg2Type;
        if (arg2Type) {
            fn(arg, readArg(el, arg2Type, evt));
        } else if (arg === undefined) {
            fn();
        } else {
            fn(arg);
        }
    };

    const resolveActionElement = (target, wantsChange) => {
        let el = target;
        while (el && el.nodeType === 1) {
            if (el.dataset && el.dataset.knowledgeAction) {
                if (!!(el.dataset.actionEvent === 'change') === wantsChange) return el;
            }
            const inlineOnclick = el.getAttribute && el.getAttribute('onclick');
            if (!wantsChange && inlineOnclick && inlineOnclick.includes('stopPropagation')) return null;
            el = el.parentElement;
        }
        return null;
    };

    document.addEventListener('click', (e) => {
        const el = resolveActionElement(e.target, false);
        if (el) dispatch(el, e);
    }, true);

    document.addEventListener('change', (e) => {
        const el = resolveActionElement(e.target, true);
        if (el) dispatch(el, e);
    }, true);
}

// =========================================================================
// ДЕСКРИПТОР МОДУЛЯ
// =========================================================================

export const KnowledgeModule = {
    id: 'knowledge',
    async init(ctx) {
        _ctx = ctx;
        bindFaqCtx(ctx);
        bindKnowledgeActionDelegation();
        /* данные загружаются через DOMContentLoaded выше */
    },
    mount(container, ctx) { /* no-op */ },
    unmount() { /* no-op */ }
};

// Регистрация: перезапишет legacy stub, зарегистрированный в knowledge.legacy.js
// (knowledge.legacy.js — classic script, выполняется раньше этого ES-модуля,
// поэтому к моменту этого вызова _legacyStub уже установлен в реестре).
if (window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.knowledge', KnowledgeModule);
} else {
    document.addEventListener('rbi:ready', function () {
        if (window.RBI && window.RBI.registry) {
            window.RBI.registry.register('module.knowledge', KnowledgeModule);
        }
    }, { once: true });
}

console.log('[KnowledgeModule] ✅ Knowledge Module объединён с knowledge.legacy.js (2026-07-06)');
