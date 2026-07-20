/**
 * meetings.module.js — Step 35: полный перенос бизнес-логики модуля «Протоколы Совещаний».
 *
 * Бизнес-функции перенесены из app.js (блок МОДУЛЬ СОВЕЩАНИЙ И ПРОТОКОЛОВ, строки 6876–7669).
 * Глобальные window.rbi_* присвоения вынесены в meetings.legacy.js.
 * Вспомогательные функции _meetingsStorage / _meetingsSync — здесь же (изолированы в модуле).
 *
 * Зависимости из app.js, которые остаются глобальными:
 *   window.rbi_meetingsData, appSettings,
 *   PhotoManager, compressImageToBase64,
 *   window.getPhotoSrc, window.activeTaskId, window.rbi_tasksData,
 *   getObjectIntegralMetrics, getContractorMetrics, getFlatList,
 *   showToast, closeModal, openPhotoViewer, openUniversalActionSheet,
 *   copyExpertText, RbiRoles, gameLogAction, gameGenerateWeeklyPlan,
 *   switchTab, rbi_switchEngineerSubTab, window.SyncQueueManager
 */

/* ── хелперы storage / sync ──────────────────────────────────────────────────── */

let _ctx = null;

function _meetingsStorage() {
    if (_ctx && _ctx.storage) return _ctx.storage;
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
        return window.RBI.services.storage;
    }
    return {
        stores: function () { return typeof STORES !== 'undefined' ? STORES : {}; },
        get: function (store, key) { return dbGet(store, key); },
        getAll: function (store) { return dbGetAll(store); },
        put: function (store, data) { return dbPut(store, data); },
        delete: function (store, key) { return dbDelete(store, key); }
    };
}

function _isDemoMode() {
    return ((_ctx && _ctx.appMode) || window.RBI.services.appMode).isDemo();
}

function _getAllInspections() {
    if (_ctx && _ctx.inspections) return _ctx.inspections.getAllSync();
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getAllSync();
    }
    return Array.isArray(contractorArray) ? contractorArray : [];
}

function _meetingsSync(mode) {
    var m = mode || 'silent';
    if (_ctx && _ctx.sync) return _ctx.sync.trigger(m);
    if (window.RBI && window.RBI.services && window.RBI.services.sync) {
        return window.RBI.services.sync.trigger(m);
    }
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
}

function _getSetting(key) {
    return ((_ctx && _ctx.settings) || window.RBI.services.settings).get(key);
}

function _getSkRecords() {
    if (_ctx && _ctx.sk) return _ctx.sk.getRecordsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getRecordsSync();
    }
    return Array.isArray(window.skRecords) ? window.skRecords : [];
}

function _gameLogAction(actionType, targetId) {
    if (_ctx && _ctx.game) return _ctx.game.logAction(actionType, targetId);
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.logAction(actionType, targetId);
    }
    if (typeof gameLogAction === 'function') return gameLogAction(actionType, targetId);
}
function _getSkContractorMap() {
    if (_ctx && _ctx.sk) return _ctx.sk.getContractorMapSync();
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getContractorMapSync();
    }
    return window.skContractorMap || {};
}

function _getTasks() {
    if (_ctx && _ctx.tasks) return _ctx.tasks.getTasksSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getTasksSync();
    }
    return typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : [];
}

function _templates() {
    if (_ctx && _ctx.templates) return _ctx.templates;
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

/* ── renderMeetingTab ────────────────────────────────────────────────────────── */

export function renderMeetingTab() {
    const container = document.getElementById('rbi-meeting-container');
    if (!container) return;

    const titleContainer = container.previousElementSibling;
    if (titleContainer) {
        titleContainer.className = "sticky-top-panel bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 z-40";
        titleContainer.innerHTML = `
            <div class="flex justify-between items-center">
                <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    Протоколы Совещаний
                </h2>
                <button onclick="rbi_createMeeting()" class="bg-orange-500 text-white px-3 py-1.5 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Новое совещание
                </button>
            </div>
        `;
    }

    if (window.rbi_meetingsData.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] shadow-sm">Активных протоколов нет</div>`;
        return;
    }

    const currentEngineer = _getSetting('engineerName') || 'Инженер';
    const sorted = [...window.rbi_meetingsData]
        .filter(m => m && m.id && m.date && m.title && m.memoText && !m._deleted)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">` + sorted.map(m => {
        let isOwner = !m.author || m.author === currentEngineer;

        let previewHtml = '';
        if (m.qDayPhoto) {
            previewHtml = `<img src="${window.getPhotoSrc(m.qDayPhoto)}" class="w-full h-full object-cover">`;
        } else {
            previewHtml = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg></div>`;
        }

        const resolvedCount = m.agenda ? m.agenda.filter(a => a.isDone).length : 0;
        const totalCount = m.agenda ? m.agenda.length : 0;

        return `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="rbi_openSavedMeeting('${m.id}')">
            
            <div class="h-24 sm:h-28 border-b border-[var(--card-border)] relative">
                ${previewHtml}
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${m.id}', 'meeting', '${m.title.replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
            </div>
            
            <div class="p-3 flex flex-col flex-1">
                <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1 truncate">${m.title}</div>
                <div class="text-[9px] font-bold text-[var(--text-muted)] mb-2 flex items-center gap-1">
                    Вопросов: ${resolvedCount}/${totalCount}
                </div>
                
                <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 italic mb-2 flex-1">
                    ${(m.memoText || '').replace(/<br>/g, ' ')}
                </div>
                
                <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                    <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                        <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${m.author ? m.author.split(' ')[0] : 'Инженер'}
                    </div>
                    <div class="text-[9px] font-black text-slate-400">${new Date(m.date).toLocaleDateString('ru-RU')}</div>
                </div>
            </div>
            
        </div>
        `;
    }).join('') + `</div>`;
}

/* ── openSavedMeeting ────────────────────────────────────────────────────────── */

export async function openSavedMeeting(id) {
    const meet = window.rbi_meetingsData.find(m => m.id === id);
    if (!meet) return;

    window.currentEditingMeetingId = id;

    let photoHtml = '';
    if (meet.qDayPhoto) {
        const realSrc = await PhotoManager.getAsyncUrl(meet.qDayPhoto) || window.getPhotoSrc(meet.qDayPhoto);
        photoHtml = `
            <div class="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm h-48 sm:h-56 relative bg-slate-50 dark:bg-slate-900">
                <img src="${realSrc}" class="w-full h-full object-cover cursor-pointer active:scale-95 transition-transform" onclick="setTimeout(() => openPhotoViewer('${meet.qDayPhoto}'), 100)">
                <div class="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-black uppercase px-2 py-1 rounded backdrop-blur-sm">📸 Фото фиксация</div>
            </div>`;
    }

    let agendaHtml = '';
    if (meet.agenda && meet.agenda.length > 0) {
        agendaHtml = meet.agenda.map(a => `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl mb-2 shadow-sm">
                <div class="text-[11px] font-black text-slate-800 dark:text-white mb-1">${a.contr}</div>
                <div class="text-[11px] text-slate-700 dark:text-slate-300 font-medium mb-2 leading-snug">${a.defect}</div>
                <div class="flex flex-wrap gap-2 text-[9px] font-bold">
                    <span class="${a.isDone ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'} px-2 py-1 rounded border uppercase tracking-widest flex items-center gap-1">${a.isDone ? '✅ Решено' : '⏳ В работе'}</span>
                    ${a.date ? `<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200">Срок: ${new Date(a.date).toLocaleDateString('ru-RU')}</span>` : ''}
                    ${a.resp ? `<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200">Отв: ${a.resp}</span>` : ''}
                </div>
                ${a.comment ? `<div class="text-[11px] text-slate-600 dark:text-slate-400 mt-2 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100">💬 ${a.comment}</div>` : ''}
            </div>
        `).join('');
    } else {
        agendaHtml = `<div class="text-[10px] text-slate-400 italic text-center py-4 bg-white rounded-xl border border-dashed border-slate-300">Детальная повестка не сохранена</div>`;
    }

    let notesHtml = meet.notes ? `
        <div class="mt-3 text-[11px] bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-xl shadow-sm leading-relaxed">
            <span class="font-black uppercase mb-1 block">📌 Дополнительные тезисы:</span>
            ${meet.notes}
        </div>` : '';

    document.getElementById('modal-icon').innerHTML = ``;
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full">
            <span class="text-[14px] uppercase font-black text-slate-800 dark:text-white flex items-center gap-2">📅 Протокол</span>
            <button onclick="closeModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg">✕</button>
        </div>
    `;

    document.getElementById('modal-body').innerHTML = `
        <div class="text-[10px] text-slate-500 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 flex justify-between items-center">
            <span>Автор: <b>${meet.author}</b></span>
            <span>Составлено: <b>${new Date(meet.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b></span>
        </div>

        ${photoHtml}

        <div class="mb-4 bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[30vh] overflow-y-auto custom-scrollbar shadow-inner">
            <div class="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 pl-1">📋 Повестка и решения</div>
            ${agendaHtml}
            ${notesHtml}
        </div>

        <div class="text-[11px] font-black uppercase tracking-widest text-green-600 dark:text-green-500 mb-2 pl-1 flex justify-between items-center">
            <span>Итоговый протокол (Мемо)</span>
            <button onclick="rbi_saveEditedMeeting()" class="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-1 rounded text-[9px] font-bold active:scale-95">💾 Сохранить правки</button>
        </div>
        <textarea id="saved-memo-text" class="w-full text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 bg-white p-3 sm:p-4 rounded-xl border border-slate-300 shadow-inner whitespace-pre-wrap font-medium h-48 resize-none outline-none custom-scrollbar mb-4">${meet.memoText}</textarea>

        <div class="flex gap-2">
            <button onclick="rbi_printMeetingPdf('${meet.id}', 'script')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg> PDF</button>
            <button onclick="rbi_printMeetingPdf('${meet.id}', 'browser')" class="flex-1 bg-slate-100 text-slate-700 border border-slate-200 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button>
            <button onclick="copyExpertText('btn-copy-saved', 'saved-memo-text')" id="btn-copy-saved" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-md active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Копировать</button>
        </div>
    `;

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

/* ── saveEditedMeeting ───────────────────────────────────────────────────────── */

export async function saveEditedMeeting() {
    if (!window.currentEditingMeetingId) return;
    const meet = window.rbi_meetingsData.find(m => m.id === window.currentEditingMeetingId);
    if (!meet) return;

    meet.memoText = document.getElementById('saved-memo-text').value;
    meet.updatedAt = new Date().toISOString();
    meet.updated_at = meet.updatedAt;

    meet.source = 'local';
    meet.syncStatus = 'not_synced';
    meet.sync_status = 'not_synced';
    meet.syncBlockReason = '';
    meet.sync_block_reason = '';

    await _meetingsStorage().put(_meetingsStorage().stores().MEETINGS, meet);
    localStorage.setItem('rbi_cloud_dirty', '1');
    _meetingsSync('silent');

    showToast("✅ Правки протокола сохранены");
}

/* ── deleteMeeting ───────────────────────────────────────────────────────────── */

export async function deleteMeeting(id) {
    const meetIndex = window.rbi_meetingsData.findIndex(m => m.id === id);
    var permSvc = (_ctx && _ctx.permissions) || (window.RBI && window.RBI.services && window.RBI.services.permissions);
    if (meetIndex !== -1 && permSvc && !permSvc.canDelete(window.rbi_meetingsData[meetIndex].author)) return showToast("⚠️ Нет прав на удаление чужого протокола!");

    if (!confirm("Удалить этот протокол?")) return;
    if (meetIndex !== -1) {
        window.rbi_meetingsData[meetIndex]._deleted = true;
        window.rbi_meetingsData[meetIndex].is_deleted = true;
        window.rbi_meetingsData[meetIndex]._deletedAt = new Date().toISOString();
        window.rbi_meetingsData[meetIndex].updatedAt = window.rbi_meetingsData[meetIndex]._deletedAt;

        window.rbi_meetingsData[meetIndex].source = 'local';
        window.rbi_meetingsData[meetIndex].syncStatus = 'not_synced';
        window.rbi_meetingsData[meetIndex].sync_status = 'not_synced';

        await _meetingsStorage().put(_meetingsStorage().stores().MEETINGS, window.rbi_meetingsData[meetIndex]);
    }

    window.rbi_meetingsData = window.rbi_meetingsData.filter(m => !m._deleted);
    rbi_renderMeetingTab();
    if (typeof gameGenerateWeeklyPlan === 'function') gameGenerateWeeklyPlan(true);
    showToast("🗑️ Протокол удален");

    localStorage.setItem('rbi_cloud_dirty', '1');
    _meetingsSync('silent');
}

/* ── openMeetingSetupModal ───────────────────────────────────────────────────── */

export function openMeetingSetupModal(taskId = null) {
    const uniqueProjects = [...new Set(_getAllInspections().map(c => c.projectName).filter(Boolean))].sort();
    let projOptions = `<option value="ALL">Все объекты</option>`;
    uniqueProjects.forEach(p => { projOptions += `<option value="${p.replace(/"/g, '&quot;')}">${p}</option>`; });

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-orange-200">👥</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Повестка Совещания</div>`;

    document.getElementById('modal-body').innerHTML = `
        <div class="grid grid-cols-2 gap-2 mb-4">
            <div>
                <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Объект</label>
                <select id="meet-setup-project" class="input-base !py-2 text-[11px] font-bold" onchange="rbi_updateMeetingSetupList()">
                    ${projOptions}
                </select>
            </div>
            <div>
                <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Период</label>
                <select id="meet-setup-period" class="input-base !py-2 text-[11px] font-bold" onchange="rbi_updateMeetingSetupList()">
                    <option value="WEEK" selected>Неделя</option>
                    <option value="MONTH">Месяц</option>
                    <option value="ALL">Всё время</option>
                </select>
            </div>
        </div>
        
        <div class="flex justify-between items-center mb-2 px-1 border-t border-slate-100 pt-2">
            <span class="text-[10px] font-black uppercase text-slate-400">Список подрядчиков</span>
            <button onclick="document.querySelectorAll('.meet-setup-cb').forEach(cb=>cb.checked=true)" class="text-orange-600 text-[10px] font-bold hover:underline">Выбрать всех</button>
        </div>
        
        <div id="meet-setup-checkboxes" class="space-y-2 mb-6 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
            <!-- Чекбоксы загрузятся сюда -->
        </div>

        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700">Отмена</button>
            <button onclick="closeModal(); rbi_executeMeetingSetup('${taskId || ''}')" class="flex-1 bg-orange-500 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">▶ Начать разбор</button>
        </div>
    `;

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    rbi_updateMeetingSetupList();
}

/* ── updateMeetingSetupList ──────────────────────────────────────────────────── */

export function updateMeetingSetupList() {
    const proj = document.getElementById('meet-setup-project').value;
    const period = document.getElementById('meet-setup-period').value;
    const container = document.getElementById('meet-setup-checkboxes');

    let baseData = _getAllInspections();

    if (proj !== 'ALL') baseData = baseData.filter(c => c.projectName === proj);

    const now = new Date();
    if (period === 'WEEK') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        baseData = baseData.filter(c => new Date(c.date) >= d);
    } else if (period === 'MONTH') {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        baseData = baseData.filter(c => new Date(c.date) >= d);
    }

    const uniqueContrs = [...new Set(baseData.map(c => c.contractorName).filter(Boolean))].sort();

    if (uniqueContrs.length === 0) {
        container.innerHTML = `<div class="text-center text-[10px] font-bold text-slate-400 py-4 bg-[var(--hover-bg)] rounded-lg">Нет проверок за этот период</div>`;
        return;
    }

    container.innerHTML = uniqueContrs.map(c => `
        <label class="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all hover:border-orange-300">
            <input type="checkbox" value="${c.replace(/"/g, '&quot;')}" class="meet-setup-cb w-5 h-5 accent-orange-600 rounded cursor-pointer" checked>
            <span class="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1">${c}</span>
        </label>
    `).join('');
}

/* ── executeMeetingSetup ─────────────────────────────────────────────────────── */

export async function executeMeetingSetup(taskId) {
    const checkedBoxes = document.querySelectorAll('.meet-setup-cb:checked');
    const selectedContrs = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedContrs.length === 0) return showToast("⚠️ Выберите хотя бы одного подрядчика!");

    const proj = document.getElementById('meet-setup-project').value;
    const period = document.getElementById('meet-setup-period').value;

    let finalData = _getAllInspections().filter(c => selectedContrs.includes(c.contractorName));
    if (proj !== 'ALL') finalData = finalData.filter(c => c.projectName === proj);

    const now = new Date();
    if (period === 'WEEK') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        finalData = finalData.filter(c => new Date(c.date) >= d);
    } else if (period === 'MONTH') {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        finalData = finalData.filter(c => new Date(c.date) >= d);
    }

    if (taskId && taskId !== 'null') window.activeTaskId = taskId;

    switchTab('tab-engineer');
    const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
    if (btns[2]) await rbi_switchEngineerSubTab('eng-sub-meetings', btns[2]);

    rbi_createMeeting(finalData);
}

/* ── createMeeting ───────────────────────────────────────────────────────────── */

export function createMeeting(customData = null) {
    if (!customData) {
        rbi_openMeetingSetupModal(null);
        return;
    }

    const container = document.getElementById('rbi-meeting-container');
    const d = new Date();
    let weekChecks = customData;

    let periodText = "7 дней";
    const selectedPeriod = document.getElementById('meet-setup-period')?.value;
    if (selectedPeriod === 'MONTH') periodText = "30 дней";
    if (selectedPeriod === 'ALL') periodText = "Всё время";

    const weekMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(weekChecks, _templates().getUserTemplates()) : null;
    const iko = weekMetrics ? weekMetrics.IKO : '0.00';
    const ikoColor = weekMetrics ? weekMetrics.ikoColor : 'text-slate-500';

    let defectPhotosHtml = '';
    let b3Photos = [];
    weekChecks.forEach(c => {
        if (c.state && c.photos) {
            Object.keys(c.state).forEach(id => {
                if ((c.state[id] === 'fail' || c.state[id] === 'fail_escalated') && c.photos[id]) {
                    b3Photos.push({ src: c.photos[id], contr: c.contractorName });
                }
            });
        }
    });
    b3Photos = b3Photos.sort(() => 0.5 - Math.random()).slice(0, 4);
    if (b3Photos.length > 0) {
        defectPhotosHtml = `
            <div class="mt-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-[var(--card-border)] shadow-sm">
                <div class="text-[10px] font-black text-red-600 uppercase mb-2">📸 Фотофиксация брака (Рандом)</div>
                <div class="flex gap-2 overflow-x-auto no-scrollbar">
                    ${b3Photos.map(p => `
                        <div class="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border border-red-200 relative">
                            <img src="${window.getPhotoSrc(p.src)}" class="w-full h-full object-cover">
                            <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] truncate px-1 pb-0.5">${p.contr}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    const contrDefects = {};
    let b3Count = 0;
    let goodContrs = [];
    let badContrs = [];
    const contrMap = {};

    weekChecks.forEach(c => { contrMap[c.contractorName] = contrMap[c.contractorName] || []; contrMap[c.contractorName].push(c); });

    for (let cName in contrMap) {
        const m = getContractorMetrics(contrMap[cName], _templates().getUserTemplates());
        if (m) {
            if (m.finalC >= 85 && m.n_изделий_с_B3 === 0) goodContrs.push(cName);
            if (m.finalC < 70 || m.n_изделий_с_B3 > 0) badContrs.push(cName);
        }

        contrMap[cName].forEach(c => {
            if (c.metrics) b3Count += c.metrics.n_B3_fail;
            if (c.state && c.templateKey) {
                Object.keys(c.state).forEach(id => {
                    if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                        const flat = getFlatList(_templates().getUserTemplates()[c.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[c.templateKey.replace('sys_', '')]?.groups);
                        const item = flat.find(x => x.id == id);
                        if (item) {
                            if (!contrDefects[cName]) contrDefects[cName] = [];
                            let existing = contrDefects[cName].find(d => d.name === item.n);
                            if (existing) existing.count++;
                            else contrDefects[cName].push({ name: item.n, count: 1, isB3: c.state[id] === 'fail_escalated' || item.w === 3, isSk: false });
                        }
                    }
                });
            }
        });
    }

    let skOverdueCount = 0;
    const skRecordsList = _getSkRecords();
    if (skRecordsList.length) {
        const today = new Date();
        const skContractorMap = _getSkContractorMap();
        skRecordsList.forEach(r => {
            const isOpen = r.status && r.status.toLowerCase().includes('не устран');
            if (isOpen && r.contractor) {
                let targetContr = r.contractor;
                if (skContractorMap && skContractorMap[r.contractor]) {
                    targetContr = skContractorMap[r.contractor];
                }

                if (customData && !customData.some(c => c.contractorName === targetContr)) return;

                let isOverdue = false;
                if (r.deadline) {
                    const deadlineDate = new Date(r.deadline);
                    if (deadlineDate < today) {
                        isOverdue = true;
                    }
                }

                if (!isOverdue) return;

                skOverdueCount++;

                if (!contrDefects[targetContr]) contrDefects[targetContr] = [];
                const defectName = r.text ? r.text : 'Замечание без текста';

                let existing = contrDefects[targetContr].find(d => d.name === defectName);
                if (existing) {
                    existing.count++;
                } else {
                    const explicitName = `[Просрочено в СК] ${defectName}`;
                    contrDefects[targetContr].push({
                        name: explicitName, count: 1, isB3: false, isSk: true, deadline: r.deadline
                    });
                }
            }
        });
    }

    if (typeof window.rbi_meetingsData !== 'undefined') {
        window.rbi_meetingsData.forEach(meet => {
            if (meet.agenda) {
                meet.agenda.forEach(a => {
                    if (!a.isDone) {
                        if (customData && !customData.some(c => c.contractorName === a.contr)) return;

                        if (!contrDefects[a.contr]) contrDefects[a.contr] = [];
                        let existing = contrDefects[a.contr].find(d => d.name === a.defect);
                        if (!existing) {
                            contrDefects[a.contr].push({
                                name: a.defect,
                                count: 1,
                                isB3: false,
                                isSk: false,
                                isCarryOver: true,
                                oldDate: a.date,
                                oldResp: a.resp,
                                oldComment: a.comment
                            });
                        }
                    }
                });
            }
        });
    }

    let goodContrsHtml = goodContrs.length > 0
        ? goodContrs.map(c => `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-black mr-1 mb-1 inline-block">${c}</span>`).join('')
        : '<span class="text-[10px] text-slate-400 font-bold">Отличников нет</span>';

    let badContrsHtml = badContrs.length > 0
        ? badContrs.map(c => `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black mr-1 mb-1 inline-block">${c}</span>`).join('')
        : '<span class="text-[10px] text-slate-400 font-bold">Критических нет</span>';

    let agendaHtml = '';
    for (let cName in contrDefects) {
        agendaHtml += `
            <div class="bg-white dark:bg-slate-800 rounded-xl p-3 mb-3 border border-[var(--card-border)] shadow-sm">
                <div class="text-[12px] font-black text-slate-800 dark:text-white mb-2 uppercase border-b border-slate-100 dark:border-slate-700 pb-1">👷‍♂️ ${cName}</div>
                <div class="space-y-3">
        `;

        let b3List = [];
        let b2List = [];
        let skList = [];
        let carryList = [];
        let earliestSkDeadline = '';

        contrDefects[cName].sort((a, b) => b.count - a.count).forEach(def => {
            if (def.isCarryOver) {
                carryList.push(`${def.name}`);
            } else if (def.isSk) {
                let cleanName = def.name.replace('[Официальное предписание СК] ', '');
                skList.push(`${cleanName}`);
                if (def.deadline) {
                    if (!earliestSkDeadline || new Date(def.deadline) < new Date(earliestSkDeadline)) {
                        earliestSkDeadline = def.deadline.split('T')[0];
                    }
                }
            } else if (def.isB3) {
                b3List.push(`${def.name} (${def.count} раз)`);
            } else {
                b2List.push(`${def.name} (${def.count} раз)`);
            }
        });

        const renderGroupRow = (groupTitle, itemsArray, borderCls, badgeHtml, defaultDeadline = '') => {
            if (itemsArray.length === 0) return '';

            const fullText = groupTitle + ':\\n• ' + itemsArray.join('\\n• ');
            const htmlText = `<ul class="list-disc pl-4 mt-1 space-y-0.5"><li>` + itemsArray.join('</li><li>') + `</li></ul>`;
            const defDeadline = defaultDeadline ? ` value="${defaultDeadline}"` : '';

            return `
                <div class="meeting-agenda-row border-l-2 ${borderCls} pl-2 py-1 relative">
                    <input type="hidden" class="agenda-meta-contr" value="${cName}">
                    <input type="hidden" class="agenda-meta-defect" value="${fullText.replace(/"/g, '&quot;')}">
                    
                    <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 leading-snug">
                        <div class="font-bold flex items-center gap-1.5">${badgeHtml} ${groupTitle}</div>
                        ${htmlText}
                    </div>
                    
                    <div class="flex flex-wrap gap-2 mt-2">
                        <label class="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 cursor-pointer active:scale-95 transition-transform">
                            <input type="checkbox" class="agenda-done-cb w-3.5 h-3.5 accent-green-600"> Решено
                        </label>
                        <input type="date" class="agenda-date input-base !py-1 !text-[10px] !w-auto flex-1 min-w-[90px]" ${defDeadline}>
                        <input type="text" class="agenda-resp input-base !py-1 !text-[10px] !w-auto flex-1 min-w-[90px]" placeholder="Ответственный...">
                    </div>
                    <textarea class="agenda-comment input-base mt-2 h-10 resize-none text-[10px]" placeholder="Что решили по этому блоку проблем..."></textarea>
                </div>
            `;
        };

        agendaHtml += renderGroupRow('Критические аварии', b3List, 'border-red-500 bg-red-50 dark:bg-red-900/10', '<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">B3</span>');
        agendaHtml += renderGroupRow('Повторяющиеся нарушения', b2List, 'border-orange-500 bg-orange-50 dark:bg-orange-900/10', '<span class="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black">B2</span>');
        agendaHtml += renderGroupRow('Открытые предписания', skList, 'border-blue-500 bg-blue-50 dark:bg-blue-900/10', '<span class="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">ПК СК</span>', earliestSkDeadline);
        agendaHtml += renderGroupRow('Долги с прошлых планерок', carryList, 'border-purple-500 bg-purple-50 dark:bg-purple-900/10', '<span class="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black">ДОЛГ</span>');

        agendaHtml += `</div></div>`;
    }

    if (!agendaHtml) agendaHtml = `<div class="text-[11px] text-green-600 font-bold text-center py-4 bg-white rounded-xl border border-dashed border-[var(--card-border)]">Дефектов за ${periodText} не выявлено. Идеально!</div>`;

    const html = `
    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm relative animate-fadeIn overflow-hidden flex flex-col max-h-[85vh]">
        <!-- ШАПКА -->
        <div class="p-4 border-b border-[var(--card-border)] bg-[var(--hover-bg)] flex justify-between items-center shrink-0">
            <div>
                <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Meeting Workspace</div>
                <div class="font-black text-[14px] text-slate-800 dark:text-white uppercase">Планерка от ${d.toLocaleDateString('ru-RU')}</div>
            </div>
            <button onclick="rbi_renderMeetingTab()" class="text-slate-400 hover:text-red-500 active:scale-95 transition-colors font-black px-2 text-lg">✕</button>
        </div>
        
        <!-- ЕДИНАЯ КОЛОНКА (СВЕРХУ ИНФО, СНИЗУ ДЕФЕКТЫ) -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4">
            
            <!-- БЛОК АНАЛИТИКИ -->
            <div class="mb-5">
                <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2">📈 Статус Объекта (${periodText})</div>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] p-3 rounded-xl shadow-sm flex flex-col justify-center">
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Индекс Риска (ИКО)</div>
                        <div class="text-[20px] font-black leading-none ${ikoColor}">${iko}</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] p-3 rounded-xl shadow-sm flex flex-col justify-center">
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Крит. деф. (B3)</div>
                        <div class="text-[20px] font-black leading-none ${b3Count > 0 ? 'text-red-600' : 'text-green-600'}">${b3Count}</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] p-3 rounded-xl shadow-sm flex flex-col justify-center col-span-2 sm:col-span-1">
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Просрочено в ПК СК</div>
                        <div class="text-[20px] font-black leading-none text-red-600">${skOverdueCount}</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
                    <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 p-3 rounded-xl shadow-sm">
                        <div class="text-[10px] font-black text-red-600 dark:text-red-400 uppercase mb-2 tracking-widest">🚨 Зона риска (B3 или УрК < 70)</div>
                        <div>${badContrsHtml}</div>
                    </div>
                    <div class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 p-3 rounded-xl shadow-sm">
                        <div class="text-[10px] font-black text-green-600 dark:text-green-400 uppercase mb-2 tracking-widest">✅ Эталонное качество</div>
                        <div>${goodContrsHtml}</div>
                    </div>
                </div>
                
                ${defectPhotosHtml}
            </div>

            <!-- БЛОК РЕШЕНИЙ -->
            <div>
                <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2 flex items-center gap-2">📋 Повестка и Решения</div>
                <div class="text-[10px] text-slate-500 mb-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">Отмечайте решенные вопросы прямо на совещании. В конце нажмите кнопку внизу — нейросеть соберет их в готовый официальный протокол.</div>
                
                <div class="mb-4">
                    ${agendaHtml}
                </div>
                
                <div class="bg-[var(--hover-bg)] p-3 rounded-xl border border-[var(--card-border)] mb-4">
                    <label class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2 block">Дополнительные тезисы / Разное</label>
                    <textarea id="rbi-meeting-notes" class="input-base h-24 resize-none text-[11px]" placeholder="Что еще обсудили на планерке, кроме указанных дефектов..."></textarea>
                </div>

                <div class="mb-4">
                    <button onclick="document.getElementById('meeting-photo-upload').click()" class="w-full bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-colors hover:border-slate-400">
                        📸 Прикрепить общее фото совещания
                    </button>
                    <div id="meeting-photo-preview" class="hidden mt-2 relative w-full h-40 sm:h-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div>
                </div>
            </div>

            <!-- РЕЗУЛЬТАТ / РУЧНОЙ ВВОД -->
            <div id="rbi-meeting-result" class="border-t border-[var(--card-border)] bg-[var(--hover-bg)] p-3 sm:p-4 rounded-xl mt-4 mb-2">
                <div class="flex justify-between items-center mb-2">
                    <div class="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Итоговый текст (Мемо)</div>
                    <button onclick="copyExpertText('btn-copy-memo', 'rbi-meeting-memo-text')" id="btn-copy-memo" class="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 px-2 py-1 rounded active:scale-95 transition-colors">📋 Копировать</button>
                </div>
                <textarea id="rbi-meeting-memo-text" class="w-full bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl p-3 text-[11px] outline-none resize-none text-slate-800 dark:text-slate-200 h-32 shadow-inner font-medium leading-relaxed custom-scrollbar transition-all" placeholder="Можно написать текст вручную или нажать кнопку ИИ внизу..."></textarea>
            </div>

        </div>

        <!-- ПОДВАЛ (КНОПКИ СОХРАНЕНИЯ И ИИ) -->
        <div id="meeting-footer-btn" class="p-3 sm:p-4 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/80 shrink-0 backdrop-blur-md z-10 flex gap-2">
            <button onclick="rbi_saveMeetingMemo()" class="flex-1 bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1.5">
                💾 Сохранить
            </button>
            <button onclick="window.RBI.services.ai.rbi_generateMeetingMemo()" id="btn-gen-memo" class="flex-[1.5] bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span class="truncate">Собрать (ИИ)</span>
            </button>
        </div>
    </div>`;

    container.innerHTML = html;
}

/* ── handleMeetingPhotoUpload ────────────────────────────────────────────────── */

export function handleMeetingPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("⚙️ Обработка фото...");
    compressImageToBase64(file, 1000, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'meet');
        const box = document.getElementById('meeting-photo-preview');
        box.dataset.photo = localUrl;
        box.classList.remove('hidden');

        const realSrc = await PhotoManager.getAsyncUrl(localUrl) || window.getPhotoSrc(localUrl);

        box.innerHTML = `<img src="${realSrc}" class="w-full h-full object-cover"><div onclick="event.stopPropagation(); document.getElementById('meeting-photo-preview').dataset.photo=''; document.getElementById('meeting-photo-preview').classList.add('hidden');" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black shadow-md cursor-pointer">✕</div>`;
        event.target.value = '';
    });
}

/* ── saveMeetingMemo ─────────────────────────────────────────────────────────── */

export async function saveMeetingMemo() {
    if (_isDemoMode()) return showToast("В демо-режиме сохранение отключено");
    let text = document.getElementById('rbi-meeting-memo-text').value.trim();
    if (!text) {
        text = "Протокол сохранен без генерации ИИ. Детали решений смотрите в блоке повестки.";
    }

    let agendaData = [];
    const rows = document.querySelectorAll('.meeting-agenda-row');
    rows.forEach(row => {
        agendaData.push({
            contr: row.querySelector('.agenda-meta-contr').value,
            defect: row.querySelector('.agenda-meta-defect').value,
            isDone: row.querySelector('.agenda-done-cb').checked,
            date: row.querySelector('.agenda-date').value,
            resp: row.querySelector('.agenda-resp').value.trim(),
            comment: row.querySelector('.agenda-comment').value.trim()
        });
    });

    const extraNotes = document.getElementById('rbi-meeting-notes')?.value.trim() || '';
    const author = document.getElementById('inp-inspector')?.value.trim() || 'Инженер';

    const meet = {
        id: 'meet_' + Date.now().toString(36),
        date: new Date().toISOString(),
        author: author,
        title: `Совещание от ${new Date().toLocaleDateString('ru-RU')}`,
        memoText: text,
        agenda: agendaData,
        notes: extraNotes,
        qDayPhoto: document.getElementById('meeting-photo-preview')?.dataset?.photo || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    window.rbi_meetingsData.push(meet);
    await _meetingsStorage().put(_meetingsStorage().stores().MEETINGS, meet);
    if (window.SyncQueueManager && !_isDemoMode()) {
        window.SyncQueueManager.enqueue('SAVE_MEETING', meet);
    }

    localStorage.setItem('rbi_cloud_dirty', '1');
    _gameLogAction('meeting_memo_created', meet.id);
    _meetingsSync('silent');

    if (Array.isArray(_getTasks())) {
        if (window.activeTaskId) {
            const task = _getTasks().find(t => t.id === window.activeTaskId);
            if (task) {
                task.status = 'done';
                task.resultComment = 'Протокол сформирован';
                task.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') await _meetingsStorage().put(_meetingsStorage().stores().TASKS, task);
            }
            window.activeTaskId = null;
        }

        const autoTasks = _getTasks().filter(t =>
            t.status === 'pending' &&
            (t.title === 'Еженедельный разбор качества' || t.taskType === 'Аналитика СК')
        );
        for (let t of autoTasks) {
            t.status = 'done';
            t.resultComment = 'Протокол сформирован';
            t.updatedAt = new Date().toISOString();
            if (typeof dbPut === 'function') await _meetingsStorage().put(_meetingsStorage().stores().TASKS, t);
        }
    }
    showToast("💾 Протокол сохранен в архив!");
    rbi_renderMeetingTab();
}

/* ── bindMeetingsActionDelegation ─────────────────────────────────────────────
 * Паттерн делегирования событий для инициативы «Разбор inline onclick/onchange»
 * (см. _ai/INDEX_HTML_HANDLERS_MAP.md), namespace-per-module (data-meetings-action).
 */
function bindMeetingsActionDelegation() {
    if (window.__meetingsActionDelegationBound) return;
    window.__meetingsActionDelegationBound = true;

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
        const action = el.dataset.meetingsAction;
        const fn = window[action];
        if (typeof fn !== 'function') return;
        const valType = el.dataset.meetingsActionValType;
        const arg = valType ? readArg(el, valType, evt) : el.dataset.actionArg;
        if (arg === undefined) {
            fn();
        } else {
            fn(arg);
        }
    };

    const resolveActionElement = (target, wantsChange) => {
        let el = target;
        while (el && el.nodeType === 1) {
            if (el.dataset && el.dataset.meetingsAction) {
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

/* ── MeetingsModule (платформенный контракт) ────────────────────────────────── */

export const MeetingsModule = {
    id: 'meetings',
    routes: ['/meetings'],
    dependencies: ['storage', 'tasks'],

    _syncUnsubscribe: null,

    async init(ctx) {
        _ctx = ctx;
        if (window.MeetingsActions) window.MeetingsActions.bindCtx(ctx);
        if (window.MeetingsState) window.MeetingsState.syncFromLegacy();

        bindMeetingsActionDelegation();

        const events = (ctx && ctx.events) || (window.RBI && window.RBI.events);

        if (events && typeof events.on === 'function') {
            const syncHandler = function () {
                if (window.MeetingsState) window.MeetingsState.syncFromLegacy();
            };
            events.on('sync:completed', syncHandler);
            MeetingsModule._syncUnsubscribe = function () {
                if (events.off) events.off('sync:completed', syncHandler);
            };
        }

        if (events && typeof events.emit === 'function') {
            events.emit('meetings:initialized', {});
        }

        console.log('[MeetingsModule] init complete');
    },

    mount(container, ctx) {
        renderMeetingTab();
    },

    unmount() {
        if (typeof MeetingsModule._syncUnsubscribe === 'function') {
            MeetingsModule._syncUnsubscribe();
            MeetingsModule._syncUnsubscribe = null;
        }
    }
};

if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.meetings', MeetingsModule);
}

/* ── window.rbi_* accessors (legacy compatibility) ──────────────────────────── */
/* Перезаписывают stub-заглушки из app.js сразу при загрузке ES-модуля.         */
/* meetings.legacy.js дублирует это — оба варианта идемпотентны.                */
if (typeof window !== 'undefined') {
    window.rbi_renderMeetingTab       = renderMeetingTab;
    window.rbi_openSavedMeeting       = openSavedMeeting;
    window.rbi_saveEditedMeeting      = saveEditedMeeting;
    window.rbi_deleteMeeting          = deleteMeeting;
    window.rbi_openMeetingSetupModal  = openMeetingSetupModal;
    window.rbi_updateMeetingSetupList = updateMeetingSetupList;
    window.rbi_executeMeetingSetup    = executeMeetingSetup;
    window.rbi_createMeeting          = createMeeting;
    window.rbi_handleMeetingPhotoUpload = handleMeetingPhotoUpload;
    window.rbi_saveMeetingMemo        = saveMeetingMemo;
}

console.log('[MeetingsModule] meetings.module.js loaded (ES module, Step 35 — full business logic)');
