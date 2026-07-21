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

import {
    AGENDA_KIND,
    buildMeetingAgenda,
    buildMeetingProtocolHtml,
    collectAgendaFromDom,
    collectMeetingDraftFromDom
} from './meetings.protocol.js';

/* ── хелперы storage / sync ──────────────────────────────────────────────────── */

let _ctx = null;
/** baseline memo открытой карточки архива (dirty-check перед печатью) */
let _savedMeetingBaselineMemo = '';
/** последний черновик для preview/print без save */
let _meetingPreviewDraft = null;
/** не пересохранять черновик при закрытии после успешного save */
let _meetingDraftSkipSave = false;

function _rbiCollectMeetingWsDraft() {
    const notesEl = document.getElementById('rbi-meeting-notes');
    if (!notesEl) return null;
    const notes = notesEl.value.trim();
    const memo = document.getElementById('rbi-meeting-memo-text')?.value.trim() || '';
    const photo = document.getElementById('meeting-photo-preview')?.dataset?.photo || '';
    const agenda = collectAgendaFromDom();
    const agendaTouched = agenda.some(a => a.isDone || a.date || a.resp || a.comment);
    if (!notes && !memo && !photo && !agendaTouched) return null;
    return { notes, memo, photo, agenda };
}

function _rbiApplyMeetingWsDraft(payload) {
    if (!payload) return;
    const notesEl = document.getElementById('rbi-meeting-notes');
    const memoEl = document.getElementById('rbi-meeting-memo-text');
    if (notesEl && payload.notes) notesEl.value = payload.notes;
    if (memoEl && payload.memo) memoEl.value = payload.memo;
    if (payload.photo) {
        const box = document.getElementById('meeting-photo-preview');
        if (box) {
            box.dataset.photo = payload.photo;
            box.classList.remove('hidden');
            const src = window.getPhotoSrc(payload.photo);
            box.innerHTML = `<img src="${src}" class="w-full h-full object-cover"><div onclick="event.stopPropagation(); document.getElementById('meeting-photo-preview').dataset.photo=''; document.getElementById('meeting-photo-preview').classList.add('hidden');" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black shadow-md cursor-pointer">✕</div>`;
            if (typeof PhotoManager !== 'undefined' && PhotoManager.getAsyncUrl) {
                PhotoManager.getAsyncUrl(payload.photo).then(realSrc => {
                    const img = box.querySelector('img');
                    if (img && realSrc) img.src = realSrc;
                });
            }
        }
    }
    if (Array.isArray(payload.agenda)) {
        payload.agenda.forEach(draftItem => {
            const rows = document.querySelectorAll('.meeting-agenda-row');
            let row = null;
            rows.forEach(r => {
                const sk = r.querySelector('.agenda-meta-source-key')?.value || '';
                const id = r.querySelector('.agenda-meta-id')?.value || '';
                if (row) return;
                if (draftItem.sourceKey && sk === draftItem.sourceKey) row = r;
                else if (draftItem.id && id === draftItem.id) row = r;
            });
            if (!row) return;
            const cb = row.querySelector('.agenda-done-cb');
            if (cb) cb.checked = !!draftItem.isDone;
            const dateEl = row.querySelector('.agenda-date');
            if (dateEl && draftItem.date) dateEl.value = draftItem.date.split('T')[0];
            const respEl = row.querySelector('.agenda-resp');
            if (respEl && draftItem.resp) respEl.value = draftItem.resp;
            const commentEl = row.querySelector('.agenda-comment');
            if (commentEl && draftItem.comment) commentEl.value = draftItem.comment;
        });
    }
}

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

/* ── UI: счётчики замечаний / сводка типов у подрядчика ─────────────────────── */

function _zamechWord(n) {
    const abs = Math.abs(n) % 100;
    const d = abs % 10;
    if (abs > 10 && abs < 20) return 'замечаний';
    if (d === 1) return 'замечание';
    if (d >= 2 && d <= 4) return 'замечания';
    return 'замечаний';
}

/** Общее число замечаний в пункте (count или сумма ×N в details). */
function _totalRemarks(item, detailsArr) {
    const c = parseInt(item && item.count, 10);
    if (c > 0) return c;
    let sum = 0;
    (detailsArr || item?.details || []).forEach(d => {
        const m = String(d).match(/×(\d+)/);
        sum += m ? (parseInt(m[1], 10) || 1) : 1;
    });
    return sum || 1;
}

function _countChipHtml(total, tone = 'blue') {
    const cls = ({
        blue: 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400',
        purple: 'bg-purple-600 text-white border-purple-700 dark:bg-purple-500 dark:border-purple-400',
        indigo: 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400',
        red: 'bg-red-600 text-white border-red-700 dark:bg-red-500 dark:border-red-400',
        orange: 'bg-orange-500 text-white border-orange-600 dark:bg-orange-500 dark:border-orange-400'
    })[tone] || 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400';
    return `<span class="text-[9px] font-black border px-1.5 py-0.5 rounded ${cls}">${total} ${_zamechWord(total)}</span>`;
}

/**
 * Долг: два вида по происхождению.
 * SK — незакрытый пункт ПК СК с прошлой планерки;
 * AUDIT — незакрытый пункт аудита (B3/B2).
 */
function _carryDebtKind(item) {
    if (!item || item.kind !== AGENDA_KIND.CARRY) return null;
    const ok = item.originKind || (String(item.sourceKey || '').split('|')[1] || '');
    const t = String(item.title || item.defect || '');
    if (ok === AGENDA_KIND.SK || /пк\s*ск|просрочено/i.test(t)) return 'SK';
    return 'AUDIT';
}

/** Визуал долга: фиолетовый = аудиты, индиго = ПК СК (не emerald-решения). */
function _carryVisual(item) {
    if (_carryDebtKind(item) === 'SK') {
        return {
            debtKind: 'SK',
            tone: 'indigo',
            badgeShort: 'ДОЛГ СК',
            title: 'Долг ПК СК — просроч. не решены с прошлой планерки',
            badgeSolid: 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400',
            softChip: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700',
            catChip: 'bg-white text-indigo-800 border-indigo-200 dark:bg-slate-900 dark:text-indigo-200 dark:border-indigo-700',
            border: 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40',
            cardBadge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
        };
    }
    return {
        debtKind: 'AUDIT',
        tone: 'purple',
        badgeShort: 'ДОЛГ АУД',
        title: 'Долг аудит (не решено / повторно)',
        badgeSolid: 'bg-purple-600 text-white border-purple-700 dark:bg-purple-500 dark:border-purple-400',
        softChip: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700',
        catChip: 'bg-white text-purple-800 border-purple-200 dark:bg-slate-900 dark:text-purple-200 dark:border-purple-700',
        border: 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/40',
        cardBadge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
    };
}

/** Корзина типа для UI-блоков (не сводки). */
function _agendaTypeBucket(item) {
    if (!item) return null;
    const k = item.kind;
    const t = String(item.title || '');
    const ok = item.originKind || (String(item.sourceKey || '').split('|')[1] || '');
    if (k === AGENDA_KIND.CARRY) {
        return _carryDebtKind(item) === 'SK' ? 'CARRY_SK' : 'CARRY_AUDIT';
    }
    if (k === AGENDA_KIND.SK || ok === AGENDA_KIND.SK || /пк\s*ск|просрочено/i.test(t)) return 'SK';
    if (k === AGENDA_KIND.B3 || ok === AGENDA_KIND.B3 || /крит\.?\s*деф|^\s*b3\b/i.test(t)) return 'B3';
    if (k === AGENDA_KIND.B2 || ok === AGENDA_KIND.B2 || /повторяющ|^\s*b2\b/i.test(t)) return 'B2';
    if (k === AGENDA_KIND.REOPENED) {
        if (/крит\.?\s*деф|^\s*b3\b/i.test(t)) return 'B3';
        if (/повторяющ|^\s*b2\b/i.test(t)) return 'B2';
        if (/пк\s*ск|просрочено/i.test(t)) return 'SK';
    }
    return null;
}

function _isAuditB3(item) {
    const t = String(item.title || '');
    const ok = item.originKind || (String(item.sourceKey || '').split('|')[1] || '');
    return item.kind === AGENDA_KIND.B3 || ok === AGENDA_KIND.B3
        || /крит\.?\s*деф|^\s*b3\b/i.test(t);
}

function _isAuditB2(item) {
    const t = String(item.title || '');
    const ok = item.originKind || (String(item.sourceKey || '').split('|')[1] || '');
    return item.kind === AGENDA_KIND.B2 || ok === AGENDA_KIND.B2
        || /повторяющ|^\s*b2\b/i.test(t);
}

/**
 * Сводка у подрядчика:
 * Аудит (B2/B3) · Долг аудит не решено/повторно (B2/B3) · ПК СК · Долг ПК СК
 */
function _contrTypeSummaryHtml(items) {
    const s = { auditB2: 0, auditB3: 0, debtB2: 0, debtB3: 0, sk: 0, debtSk: 0 };
    (items || []).forEach(item => {
        const n = _totalRemarks(item, item.details);
        const k = item.kind;
        const isReopened = k === AGENDA_KIND.REOPENED || !!item.reopened;

        if (k === AGENDA_KIND.CARRY) {
            if (_carryDebtKind(item) === 'SK') {
                s.debtSk += n;
            } else if (_isAuditB3(item)) {
                s.debtB3 += n;
            } else {
                s.debtB2 += n;
            }
            return;
        }
        if (k === AGENDA_KIND.SK || /пк\s*ск|просрочено/i.test(String(item.title || ''))) {
            // повторно открытый СК тоже в «текущий ПК СК» (свежая просрочка)
            s.sk += n;
            return;
        }
        if (isReopened) {
            if (_isAuditB3(item)) s.debtB3 += n;
            else if (_isAuditB2(item)) s.debtB2 += n;
            return;
        }
        if (k === AGENDA_KIND.B3) s.auditB3 += n;
        else if (k === AGENDA_KIND.B2) s.auditB2 += n;
    });

    const chip = (label, n, cls) => (n
        ? `<span class="text-[9px] font-black border px-1.5 py-0.5 rounded ${cls}">${label} · ${n}</span>`
        : '');
    const numChip = (n, cls) => (n
        ? `<span class="text-[9px] font-black border px-1.5 py-0.5 rounded ${cls}">${n}</span>`
        : '');
    const group = (label, labelCls, inner) => (inner
        ? `<span class="inline-flex flex-wrap items-center gap-1">
                <span class="text-[8px] font-black uppercase tracking-wide ${labelCls}">${label}</span>
                ${inner}
           </span>`
        : '');

    // solid chips — одинаково читаются в light/dark
    const b2Cls = 'bg-orange-500 text-white border-orange-600 dark:bg-orange-500 dark:border-orange-400';
    const b3Cls = 'bg-red-600 text-white border-red-700 dark:bg-red-500 dark:border-red-400';
    const skCls = 'bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400';
    const debtSkCls = 'bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400';

    const auditInner = [chip('B2', s.auditB2, b2Cls), chip('B3', s.auditB3, b3Cls)].filter(Boolean).join('');
    const debtAuditInner = [chip('B2', s.debtB2, b2Cls), chip('B3', s.debtB3, b3Cls)].filter(Boolean).join('');
    const skInner = numChip(s.sk, skCls);
    const debtSkInner = numChip(s.debtSk, debtSkCls);

    const groups = [
        group('Аудит', 'text-slate-500 dark:text-slate-400', auditInner),
        group('Долг аудит', 'text-purple-700 dark:text-purple-300', debtAuditInner),
        group('Проср. в ПК СК', 'text-blue-700 dark:text-blue-300', skInner),
        group('Долг ПК СК · не решено', 'text-indigo-700 dark:text-indigo-300', debtSkInner)
    ].filter(Boolean);

    if (!groups.length) return '';
    return `<span class="flex flex-wrap gap-x-3 gap-y-1 ml-0 sm:ml-1.5 mt-1 w-full">${groups.join('')}</span>`;
}

/* ── renderMeetingTab ────────────────────────────────────────────────────────── */

export function renderMeetingTab() {
    const FD = window.RBIFormDraft;
    const notesEl = document.getElementById('rbi-meeting-notes');
    if (FD && notesEl && !_meetingDraftSkipSave) {
        FD.saveNow(FD.KEYS.MEETING_WS, _rbiCollectMeetingWsDraft);
        FD.unbindAutoSave(FD.KEYS.MEETING_WS);
    }
    _meetingDraftSkipSave = false;

    const container = document.getElementById('rbi-meeting-container');
    if (!container) return;

    const toggleHtml = (typeof window.kbViewModeToggleHtml === 'function')
        ? window.kbViewModeToggleHtml('meetings')
        : '';

    const titleContainer = container.previousElementSibling;
    if (titleContainer) {
        titleContainer.className = "sticky-top-panel bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 z-40";
        titleContainer.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2">
                <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5 min-w-0">
                    <svg class="w-4 h-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    <span class="truncate">Протоколы Совещаний</span>
                </h2>
                <div class="flex flex-wrap items-center gap-2">
                    <div id="meetings-view-mode-toggle">${toggleHtml}</div>
                    <button onclick="rbi_createMeeting()" class="bg-orange-500 text-white px-3 py-1.5 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Новое
                    </button>
                </div>
            </div>
        `;
    }

    if (!window.rbi_meetingsData || window.rbi_meetingsData.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] shadow-sm">Активных протоколов нет</div>`;
        return;
    }

    const currentEngineer = _getSetting('engineerName') || 'Инженер';
    const sorted = [...window.rbi_meetingsData]
        .filter(m => m && m.id && m.date && m.title && m.memoText && !m._deleted)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!sorted.length) {
        container.innerHTML = `<div class="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] shadow-sm">Активных протоколов нет</div>`;
        return;
    }

    const isListView = (typeof window.getKnowledgeViewMode === 'function'
        ? window.getKnowledgeViewMode('meetings')
        : 'cards') === 'list';
    const itemsWrapClass = isListView
        ? 'flex flex-col gap-1.5'
        : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3';

    const meetingGroupLabels = (m) => {
        if (Array.isArray(m.projectNames) && m.projectNames.length) {
            return [...new Set(m.projectNames.map(n => String(n).trim()).filter(Boolean))];
        }
        const raw = String(m.projectName || m.project || m.project_display_name || '').trim();
        if (!raw) return ['Без объекта'];
        if (raw === 'Все объекты') return [raw];
        if (raw.includes(',')) {
            const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length > 1) return [...new Set(parts)];
        }
        return [raw];
    };

    const renderMeetingItem = (m) => {
        const isOwner = !m.author || m.author === currentEngineer;
        const safeTitle = String(m.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const authorShort = m.author ? m.author.split(' ')[0] : 'Инженер';
        const resolvedCount = m.agenda ? m.agenda.filter(a => a.isDone).length : 0;
        const totalCount = m.agenda ? m.agenda.length : 0;
        const dateStr = new Date(m.date).toLocaleDateString('ru-RU');
        const thumb = m.qDayPhoto
            ? `<img src="${window.getPhotoSrc(m.qDayPhoto)}" class="w-full h-full object-cover">`
            : `<div class="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg></div>`;

        if (isListView) {
            return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm flex items-center gap-2.5 p-2 active:scale-[0.99] transition-transform relative cursor-pointer" onclick="rbi_openSavedMeeting('${m.id}')">
                <div class="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[var(--card-border)]">${thumb}</div>
                <div class="min-w-0 flex-1">
                    <div class="text-[12px] font-bold text-slate-800 dark:text-white truncate leading-tight">${m.title}</div>
                    <div class="text-[9px] font-bold text-slate-400 truncate mt-0.5">Вопросов ${resolvedCount}/${totalCount} · ${authorShort} · ${dateStr}</div>
                </div>
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${m.id}', 'meeting', '${safeTitle}', ${isOwner})" class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-[var(--hover-bg)] active:scale-90">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
            </div>`;
        }

        const previewHtml = m.qDayPhoto
            ? `<img src="${window.getPhotoSrc(m.qDayPhoto)}" class="w-full h-full object-cover">`
            : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg></div>`;

        return `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="rbi_openSavedMeeting('${m.id}')">
            <div class="h-24 sm:h-28 border-b border-[var(--card-border)] relative">
                ${previewHtml}
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${m.id}', 'meeting', '${safeTitle}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
            </div>
            <div class="p-3 flex flex-col flex-1 min-w-0">
                <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1 truncate">${m.title}</div>
                <div class="text-[9px] font-bold text-[var(--text-muted)] mb-2">Вопросов: ${resolvedCount}/${totalCount}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 italic mb-2 flex-1">
                    ${(m.memoText || '').replace(/<br>/g, ' ').replace(/</g, '&lt;')}
                </div>
                <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center gap-2">
                    <div class="text-[9px] font-bold text-[var(--text-muted)] truncate min-w-0">
                        <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${authorShort}
                    </div>
                    <div class="text-[9px] font-black text-slate-400 shrink-0">${dateStr}</div>
                </div>
            </div>
        </div>`;
    };

    const grouped = {};
    sorted.forEach((m) => {
        meetingGroupLabels(m).forEach((pName) => {
            if (!grouped[pName]) grouped[pName] = [];
            grouped[pName].push(m);
        });
    });
    const collator = new Intl.Collator('ru');
    const groupKeys = Object.keys(grouped).sort((a, b) => {
        if (a === 'Без объекта') return 1;
        if (b === 'Без объекта') return -1;
        if (a === 'Все объекты') return 1;
        if (b === 'Все объекты') return -1;
        return collator.compare(a, b);
    });

    let groupIndex = 0;
    container.innerHTML = groupKeys.map((pName) => {
        const items = grouped[pName];
        const safeGroupId = `meetings-group-${groupIndex++}`;
        const cardsHtml = items.map(renderMeetingItem).join('');
        return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[14px] shadow-sm mb-2 overflow-hidden">
                <div class="flex justify-between items-center p-2.5 cursor-pointer active:bg-[var(--hover-bg)] transition-colors select-none" onclick="
                    const body = document.getElementById('${safeGroupId}');
                    const icon = this.querySelector('.chevron-icon');
                    if (body.classList.contains('hidden')) {
                        body.classList.remove('hidden');
                        icon.style.transform = 'rotate(180deg)';
                    } else {
                        body.classList.add('hidden');
                        icon.style.transform = 'rotate(0deg)';
                    }
                ">
                    <div class="flex items-center gap-2.5 min-w-0 pr-2">
                        <div class="w-8 h-8 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-[10px] flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-800">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        </div>
                        <div class="min-w-0">
                            <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight">${String(pName).replace(/</g, '&lt;')}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0 pl-1">
                        <span class="text-[9px] font-bold text-slate-500 bg-[var(--hover-bg)] px-1.5 py-0.5 rounded-md border border-[var(--card-border)]">${items.length} шт</span>
                        <svg class="w-4 h-4 text-slate-400 transition-transform duration-300 transform rotate-0 chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                <div id="${safeGroupId}" class="hidden border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 p-2.5">
                    <div class="${itemsWrapClass}">${cardsHtml}</div>
                </div>
            </div>`;
    }).join('');
}

/* ── openSavedMeeting ────────────────────────────────────────────────────────── */

export async function openSavedMeeting(id) {
    const meet = window.rbi_meetingsData.find(m => m.id === id);
    if (!meet) return;

    window.currentEditingMeetingId = id;
    _savedMeetingBaselineMemo = meet.memoText || '';

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
        const _bulletList = (detailsArr) => {
            const items = detailsArr.map(d => {
                let raw = String(d || '')
                    .replace(/просрочено\s+в\s+пк\s*ск\s*[·:.—–\-]?\s*/giu, '')
                    .replace(/просрочено\s+в\s+ск\s*[·:.—–\-]?\s*/giu, '');
                let count = 0;
                let reopened = false;
                raw = raw.replace(/\s·\s×(\d+)\s*$/u, (_, n) => {
                    count = parseInt(n, 10) || 0;
                    return '';
                });
                raw = raw.replace(/\s·\s↻\s*повторно\s*$/iu, () => { reopened = true; return ''; });
                raw = raw.replace(/\s·\s↻\s*$/u, () => { reopened = true; return ''; });
                const body = raw.replace(/\r\n/g, '\n').replace(/\t+/g, ' ')
                    .replace(/^[\s]*[-*•●]\s+/gm, '').trim();
                const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
                const head = (lines[0] || body).replace(/</g, '&lt;');
                const rest = lines.slice(1).map(l => ` ${l.replace(/</g, '&lt;')}`).join('');
                const meta = [
                    count > 1 ? `×${count}` : '',
                    reopened ? '↻' : ''
                ].filter(Boolean).join(' ');
                return `<li class="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">${head}${rest}${meta ? ` <span class="text-slate-500 font-semibold">${meta}</span>` : ''}</li>`;
            }).join('');
            return items ? `<ul class="mt-1.5 list-disc pl-4 space-y-0.5">${items}</ul>` : '';
        };

        const _renderSavedItemBody = (a) => {
            const reopen = a.reopened || a.kind === AGENDA_KIND.REOPENED
                ? `<span class="bg-amber-100 text-amber-800 border-amber-200 px-2 py-1 rounded border uppercase tracking-widest">↻ Повторно после решения</span>`
                : '';
            const bucket = _agendaTypeBucket(a);
            const isSk = bucket === 'SK';
            const isCarry = bucket === 'CARRY_SK' || bucket === 'CARRY_AUDIT' || a.kind === AGENDA_KIND.CARRY;
            const isB3 = bucket === 'B3';
            const isB2 = bucket === 'B2';
            let defectHtml;
            if (isCarry) {
                const vis = _carryVisual(a);
                const ok = a.originKind || (String(a.sourceKey || '').split('|')[1] || '');
                const titleRaw = String(a.title || '');
                const sm = titleRaw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
                const cat = (sm ? sm[1] : titleRaw).replace(/просрочено в пк\s*ск\s*[·:.—–-]?\s*/i, '').trim();
                const stats = sm ? sm[2] : '';
                let typeLabel = 'Незакрытый пункт';
                let catLabel = '';
                if (ok === 'B3' || /крит/i.test(titleRaw)) typeLabel = 'Крит. деф. (B3)';
                else if (ok === 'B2' || /повторяющ/i.test(titleRaw)) typeLabel = 'Повторяющиеся нарушения (B2)';
                else if (ok === 'SK' || /пк\s*ск|просрочено/i.test(titleRaw)) {
                    typeLabel = 'Проср. в ПК СК';
                    if (cat && !/долг|просрочено/i.test(cat)) catLabel = cat;
                }
                const stripNoise = (s) => String(s || '')
                    .replace(/^просрочено в пк\s*ск\s*[·:.—–-]?\s*/i, '')
                    .replace(/^пк\s*ск\s*[·:.—–-]?\s*/i, '')
                    .trim();
                const dets = (Array.isArray(a.details) && a.details.length
                    ? a.details
                    : String(a.defect || '').split('\n').map(l => l.replace(/^[\s]*[•●\-]\s*/, '').trim()))
                    .map(stripNoise)
                    .filter(l => l && !/:$/.test(l) && !/^(просрочено|пк\s*ск|долг с прошл|долг по аудит|долг пк)/i.test(l));
                const total = _totalRemarks(a, dets);
                const chips = [
                    `<span class="text-[9px] font-bold border px-1.5 py-0.5 rounded ${vis.softChip}">${typeLabel}</span>`,
                    catLabel ? `<span class="text-[9px] font-bold border px-1.5 py-0.5 rounded ${vis.catChip}">${catLabel.replace(/</g, '&lt;')}</span>` : '',
                    _countChipHtml(total, vis.tone),
                    ...(stats ? stats.split(',').map(p => p.trim()).filter(Boolean)
                        .filter(p => !/^\d+\s*шт/i.test(p) && !/замечан/i.test(p))
                        .map(p => `<span class="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">${p.replace(/</g, '&lt;')}</span>`) : [])
                ].filter(Boolean).join('');
                defectHtml = `
                    <div class="mb-2 flex flex-wrap items-center gap-1.5">
                        <span class="text-[9px] font-black border px-1.5 py-0.5 rounded ${vis.badgeSolid}">${vis.badgeShort}</span>
                        <span class="font-black">${vis.title}</span>
                        ${chips}
                    </div>
                    ${_bulletList(dets)}`;
            } else if (isSk && Array.isArray(a.details) && a.details.length > 0) {
                const t = String(a.title || '');
                const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
                const name = (m ? m[1] : t).trim().replace(/</g, '&lt;');
                const total = _totalRemarks(a, a.details);
                const extra = m ? m[2].split(',').map(p => p.trim()).filter(Boolean)
                    .filter(p => !/^\d+\s*шт/i.test(p) && !/замечан/i.test(p))
                    .map(p => `<span class="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">${p.replace(/</g, '&lt;')}</span>`).join('') : '';
                defectHtml = `<div class="mb-1 flex flex-wrap items-center gap-1.5"><span class="font-black">Проср. в ПК СК · ${name}</span>${_countChipHtml(total, 'blue')}${extra}</div>`
                    + _bulletList(a.details);
            } else if (isB3 || isB2) {
                const tone = isB3 ? 'red' : 'orange';
                const label = String(a.title || (isB3 ? 'Крит. деф. (B3)' : 'Повторяющиеся нарушения')).replace(/</g, '&lt;');
                const dets = Array.isArray(a.details) ? a.details : [];
                const total = _totalRemarks(a, dets);
                defectHtml = `<div class="mb-1 flex flex-wrap items-center gap-1.5"><span class="font-black">${label}</span>${_countChipHtml(total, tone)}</div>`
                    + (dets.length
                        ? _bulletList(dets)
                        : `<div>${String(a.defect || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>`);
            } else if (Array.isArray(a.details) && a.details.length > 0) {
                const t = a.title ? `<div class="font-bold mb-1">${String(a.title).replace(/</g, '&lt;')}</div>` : '';
                defectHtml = `${t}<ul class="list-disc pl-4 space-y-0.5"><li>${a.details.map(d => String(d).replace(/</g, '&lt;').replace(/\n/g, '<br>')).join('</li><li>')}</li></ul>`;
            } else {
                defectHtml = String(a.defect || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
            }
            return `
            <div class="border border-slate-200 dark:border-slate-700 p-3 rounded-xl mb-2 bg-slate-50/50 dark:bg-slate-900/30">
                <div class="text-[11px] text-slate-700 dark:text-slate-300 font-medium mb-2 leading-snug">${defectHtml}</div>
                <div class="flex flex-wrap gap-2 text-[9px] font-bold">
                    <span class="${a.isDone ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'} px-2 py-1 rounded border uppercase tracking-widest flex items-center gap-1">${a.isDone ? '✅ Решено' : '⏳ В работе'}</span>
                    ${reopen}
                    ${a.date ? `<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200">Срок: ${new Date(a.date).toLocaleDateString('ru-RU')}</span>` : ''}
                    ${a.resp ? `<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200">Отв: ${a.resp}</span>` : ''}
                </div>
                ${a.comment ? `<div class="text-[11px] text-slate-600 dark:text-slate-400 mt-2 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100">💬 ${a.comment}</div>` : ''}
            </div>`;
        };

        const byContr = {};
        meet.agenda.forEach(a => {
            const c = a.contr || '—';
            if (!byContr[c]) byContr[c] = [];
            byContr[c].push(a);
        });
        agendaHtml = Object.keys(byContr).map(cName => `
            <div class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-500 rounded-xl mb-3 shadow-sm overflow-hidden">
                <div class="px-3 pt-2.5 pb-2 bg-slate-100/90 dark:bg-slate-900/80 border-b border-slate-300/80 dark:border-slate-600">
                    <div class="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase">
                        <div>${String(cName).replace(/</g, '&lt;')}</div>
                        ${_contrTypeSummaryHtml(byContr[cName])}
                    </div>
                </div>
                <div class="p-3">
                    ${byContr[cName].map(_renderSavedItemBody).join('')}
                </div>
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

    const projectLabel = String(meet.projectName || meet.project || meet.project_display_name || '').trim() || 'Без объекта';
    const canBind = _meetingCanBindMeeting(meet);
    const bindBtn = canBind
        ? `<button onclick="rbi_openMeetingBindModal('${String(meet.id).replace(/'/g, "\\'")}')" class="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase active:scale-95 shrink-0">Изменить объект</button>`
        : '';

    document.getElementById('modal-body').innerHTML = `
        <div class="text-[10px] text-slate-500 mb-3 border-b border-slate-200 dark:border-slate-700 pb-3 flex flex-wrap justify-between items-center gap-2">
            <span>Автор: <b>${meet.author}</b></span>
            <span>Составлено: <b>${new Date(meet.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b></span>
        </div>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <div class="min-w-0 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest mr-1.5">Объект</span>
                <span class="truncate">${projectLabel.replace(/</g, '&lt;')}</span>
            </div>
            ${bindBtn}
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
        <textarea id="saved-memo-text" class="w-full text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 bg-white p-3 sm:p-4 rounded-xl border border-slate-300 shadow-inner whitespace-pre-wrap font-medium h-48 resize-none outline-none custom-scrollbar mb-4">${meet.memoText || ''}</textarea>

        <div class="flex gap-2">
            <button onclick="rbi_printSavedMeetingDirty('${meet.id}', 'script')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg> PDF</button>
            <button onclick="rbi_printSavedMeetingDirty('${meet.id}', 'browser')" class="flex-1 bg-slate-100 text-slate-700 border border-slate-200 py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button>
            <button onclick="copyExpertText('btn-copy-saved', 'saved-memo-text')" id="btn-copy-saved" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[10px] uppercase shadow-md active:scale-95 transition-colors flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Копировать</button>
        </div>
    `;

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

/** Печать/PDF из карточки архива с dirty-check мемо. */
export async function printSavedMeetingDirty(id, mode = 'browser') {
    const memoEl = document.getElementById('saved-memo-text');
    if (memoEl && memoEl.value !== _savedMeetingBaselineMemo) {
        if (confirm('Сохранить правки перед печатью?')) {
            await saveEditedMeeting();
            _savedMeetingBaselineMemo = memoEl.value;
        }
    }
    if (typeof window.rbi_printMeetingPdf === 'function') {
        return window.rbi_printMeetingPdf(id, mode);
    }
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
    _savedMeetingBaselineMemo = meet.memoText || '';

    showToast("✅ Правки протокола сохранены");
}

/* ── Привязка протокола к объекту (админ — любые, инженер — свои) ───────────── */

function _setMeetingWideModalLayout(on, flag = 'meetingWide') {
    const modal = document.getElementById('modal-overlay');
    const box = modal && modal.querySelector('.modal-content');
    if (!box) return;
    const defaultClose = box.querySelector(':scope > button[data-notify-action="closeModal"]');
    if (on) {
        box.style.maxWidth = 'min(960px, 96vw)';
        box.style.width = '96vw';
        box.style.maxHeight = '94vh';
        box.style.padding = '16px 16px';
        if (window.matchMedia && window.matchMedia('(min-width: 640px)').matches) {
            box.style.padding = '20px 24px';
        }
        if (defaultClose) defaultClose.style.display = 'none';
        modal.dataset[flag] = '1';
        modal.dataset.meetingPreviewWide = '1';
    } else if (modal.dataset[flag] === '1' || modal.dataset.meetingPreviewWide === '1') {
        box.style.maxWidth = '';
        box.style.width = '';
        box.style.maxHeight = '';
        box.style.padding = '';
        if (defaultClose) defaultClose.style.display = '';
        delete modal.dataset[flag];
        delete modal.dataset.meetingPreviewWide;
    }
}

export function closeMeetingBindModal() {
    _setMeetingWideModalLayout(false, 'meetingBindWide');
    if (typeof closeModal === 'function') closeModal();
}

export function openMeetingBindModal(meetingId) {
    const meet = (window.rbi_meetingsData || []).find(m => m.id === meetingId);
    if (!meet) return showToast('⚠️ Протокол не найден');
    if (!_meetingCanBindMeeting(meet)) {
        return showToast('⚠️ Нет прав менять привязку чужого протокола');
    }

    const isAdmin = _meetingIsAdmin();
    const options = _meetingSelectableBindProjectNames();
    if (!isAdmin && !options.length) {
        return showToast('⚠️ Нет закреплённых объектов — обратитесь к администратору');
    }

    const current = _meetingCurrentBindSelection(meet);
    // инженер не может оставить «Все объекты», если оно было; админ — может
    let defaultAll = isAdmin && current.isAll;
    let defaultSelected = current.selected.filter(n => options.includes(n));
    if (!isAdmin) {
        defaultAll = false;
        if (!defaultSelected.length && options.length === 1) defaultSelected = [options[0]];
    } else if (!defaultAll && !defaultSelected.length && current.isAll) {
        defaultAll = true;
    }

    const projBoxes = options.map((p) => {
        const safe = p.replace(/"/g, '&quot;');
        const checked = !defaultAll && defaultSelected.includes(p) ? 'checked' : '';
        return `
            <label class="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.99]">
                <input type="checkbox" value="${safe}" class="meet-bind-proj-cb w-5 h-5 accent-orange-600 rounded cursor-pointer" ${checked} onchange="rbi_onMeetingBindProjectChange()">
                <span class="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">${p}</span>
            </label>`;
    }).join('');

    const allBlock = isAdmin ? `
        <label class="flex items-center gap-3 p-3 mb-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl cursor-pointer border border-orange-200 dark:border-orange-800">
            <input type="checkbox" id="meet-bind-proj-all" class="w-5 h-5 accent-orange-600 rounded cursor-pointer" ${defaultAll ? 'checked' : ''} onchange="rbi_onMeetingBindProjectAllChange()">
            <span class="text-[13px] font-black text-orange-700 dark:text-orange-300">Все объекты</span>
        </label>` : '';

    const curLabel = String(meet.projectName || '').trim() || 'Без объекта';
    const safeId = String(meetingId).replace(/'/g, "\\'");

    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full gap-2">
            <span class="text-[14px] uppercase font-black text-slate-800 dark:text-white">🏗 Привязка к объекту</span>
            <button onclick="rbi_closeMeetingBindModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg shrink-0">✕</button>
        </div>`;

    document.getElementById('modal-body').innerHTML = `
        <div class="max-h-[calc(94vh-140px)] overflow-y-auto custom-scrollbar pr-0.5">
            <div class="text-[11px] text-slate-500 mb-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div class="font-bold text-slate-700 dark:text-slate-200 mb-1">${String(meet.title || 'Протокол').replace(/</g, '&lt;')}</div>
                <div>Сейчас: <b class="text-slate-800 dark:text-slate-100">${curLabel.replace(/</g, '&lt;')}</b>
                    ${isAdmin ? '' : ' · доступны только ваши объекты'}
                </div>
            </div>
            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Объект <span class="text-orange-500">*</span></label>
            ${allBlock}
            <div id="meet-bind-project-list" class="space-y-2 mb-4">
                ${projBoxes || `<div class="text-[11px] text-slate-400 font-bold py-6 text-center">Нет доступных объектов</div>`}
            </div>
            <p class="text-[10px] text-slate-400 font-bold mb-4">${isAdmin ? 'Можно выбрать все, один или несколько' : 'Выберите один или несколько своих объектов'}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 sticky bottom-0 bg-[var(--card-bg)] pt-1">
            <button onclick="rbi_closeMeetingBindModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase border border-slate-200 dark:border-slate-700">Отмена</button>
            <button onclick="rbi_saveMeetingBind('${safeId}')" class="flex-1 bg-orange-500 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">Сохранить привязку</button>
        </div>`;

    _setMeetingWideModalLayout(true, 'meetingBindWide');
    if (!window.__meetingBindCloseHooked) {
        window.__meetingBindCloseHooked = true;
        const prevClose = window.closeModal;
        window.closeModal = function () {
            _setMeetingWideModalLayout(false, 'meetingBindWide');
            if (typeof prevClose === 'function') return prevClose.apply(this, arguments);
        };
    }

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

export function onMeetingBindProjectAllChange() {
    const allCb = document.getElementById('meet-bind-proj-all');
    if (allCb && allCb.checked) {
        document.querySelectorAll('.meet-bind-proj-cb').forEach(cb => { cb.checked = false; });
    }
}

export function onMeetingBindProjectChange() {
    const any = document.querySelectorAll('.meet-bind-proj-cb:checked').length > 0;
    if (any) {
        const allCb = document.getElementById('meet-bind-proj-all');
        if (allCb) allCb.checked = false;
    }
}

export async function saveMeetingBind(meetingId) {
    if (_isDemoMode()) return showToast('В демо-режиме сохранение отключено');
    const meet = (window.rbi_meetingsData || []).find(m => m.id === meetingId);
    if (!meet) return showToast('⚠️ Протокол не найден');
    if (!_meetingCanBindMeeting(meet)) {
        return showToast('⚠️ Нет прав менять привязку чужого протокола');
    }

    const isAdmin = _meetingIsAdmin();
    const allowed = _meetingSelectableBindProjectNames();
    const allCb = document.getElementById('meet-bind-proj-all');
    const isAll = !!(isAdmin && allCb && allCb.checked);
    let selected = Array.from(document.querySelectorAll('.meet-bind-proj-cb:checked'))
        .map(cb => String(cb.value || '').trim())
        .filter(Boolean);

    if (!isAdmin) {
        selected = selected.filter(n => allowed.includes(n));
    }

    if (!isAll && selected.length === 0) {
        return showToast(isAdmin
            ? '⚠️ Выберите объект: все, один или несколько'
            : '⚠️ Выберите один или несколько своих объектов');
    }

    _meetingApplyProjectFieldsToRecord(meet, isAll, selected);
    meet.updatedAt = new Date().toISOString();
    meet.updated_at = meet.updatedAt;
    meet.source = 'local';
    meet.syncStatus = 'not_synced';
    meet.sync_status = 'not_synced';
    meet.syncBlockReason = '';
    meet.sync_block_reason = '';

    await _meetingsStorage().put(_meetingsStorage().stores().MEETINGS, meet);
    if (window.SyncQueueManager && !_isDemoMode()) {
        window.SyncQueueManager.enqueue('SAVE_MEETING', meet);
    }
    localStorage.setItem('rbi_cloud_dirty', '1');
    _meetingsSync('silent');

    closeMeetingBindModal();
    rbi_renderMeetingTab();
    showToast('✅ Объект протокола обновлён');
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

/* ── helpers: объекты в setup совещания ──────────────────────────────────────── */

function _meetingInspectionProjectLabel(c) {
    return String(c?.project_display_name || c?.projectName || c?.project || '').trim();
}

function _meetingCollectSetupProjectNames() {
    const fromInspections = _getAllInspections()
        .map(_meetingInspectionProjectLabel)
        .filter(Boolean);
    const assignedKeys = _meetingGetAssignedProjectKeys();
    const fromAssigned = assignedKeys.map((key) => _meetingResolveProjectDisplayName(key)).filter(Boolean);
    return [...new Set([...fromInspections, ...fromAssigned])].sort((a, b) => a.localeCompare(b, 'ru'));
}

function _meetingGetAssignedProjectKeys() {
    try {
        const perm = window.RBI && window.RBI.services && window.RBI.services.permissions;
        if (perm && typeof perm.getAssignedProjects === 'function') {
            const keys = perm.getAssignedProjects();
            if (Array.isArray(keys) && keys.length) return keys;
        }
    } catch (_) { /* ignore */ }
    if (typeof appSettings !== 'undefined' && Array.isArray(appSettings.assignedProjects)) {
        return appSettings.assignedProjects;
    }
    return [];
}

function _meetingResolveProjectDisplayName(key) {
    const raw = String(key || '').trim();
    if (!raw) return '';
    if (typeof ObjectDirectory !== 'undefined' && Array.isArray(ObjectDirectory.objects)) {
        const obj = ObjectDirectory.objects.find(o => o.canonical_key === raw || o.display_name === raw);
        if (obj) return String(obj.display_name || obj.canonical_key || raw).trim();
    }
    const hit = _getAllInspections().find(c =>
        c.project_canonical_key === raw
        || c.projectName === raw
        || c.project_display_name === raw
    );
    if (hit) return _meetingInspectionProjectLabel(hit) || raw;
    return raw;
}

function _meetingDefaultSelectedProjects(allNames) {
    const assignedKeys = _meetingGetAssignedProjectKeys();
    if (!assignedKeys.length) return { all: true, names: [] };
    const names = [];
    assignedKeys.forEach((key) => {
        const display = _meetingResolveProjectDisplayName(key);
        const match = allNames.find(n => n === display || n === key)
            || allNames.find(n => n.toLowerCase() === String(display).toLowerCase());
        if (match && !names.includes(match)) names.push(match);
        else if (display && allNames.includes(display) && !names.includes(display)) names.push(display);
    });
    if (!names.length) return { all: true, names: [] };
    return { all: false, names };
}

function _meetingReadSetupProjectSelection() {
    const allCb = document.getElementById('meet-setup-proj-all');
    const selected = Array.from(document.querySelectorAll('.meet-setup-proj-cb:checked'))
        .map(cb => String(cb.value || '').trim())
        .filter(Boolean);
    const isAll = !!(allCb && allCb.checked);
    return { isAll, selected };
}

function _meetingInspectionMatchesProjects(c, isAll, selected) {
    if (isAll) return true;
    if (!selected.length) return false;
    const label = _meetingInspectionProjectLabel(c);
    const key = String(c?.project_canonical_key || '').trim();
    return selected.includes(label) || (key && selected.includes(key));
}

function _meetingFormatProjectNameForSave(isAll, selected) {
    if (isAll) return 'Все объекты';
    if (selected.length === 1) return selected[0];
    return selected.join(', ');
}

/** canonical_key для колонок push (pull фильтрует по assignedProjects = keys). */
function _meetingResolveCanonicalKey(displayOrKey) {
    const raw = String(displayOrKey || '').trim();
    if (!raw || raw === 'Все объекты') return '';
    if (typeof ObjectDirectory !== 'undefined' && Array.isArray(ObjectDirectory.objects)) {
        const byKey = ObjectDirectory.objects.find(o => o.canonical_key === raw);
        if (byKey) return String(byKey.canonical_key || '').trim();
        const byName = ObjectDirectory.objects.find(o => o.display_name === raw);
        if (byName) return String(byName.canonical_key || '').trim();
    }
    const hit = _getAllInspections().find(c =>
        c.project_display_name === raw
        || c.projectName === raw
        || c.project_canonical_key === raw
    );
    if (hit) return String(hit.project_canonical_key || '').trim();
    return '';
}

/**
 * Пишет UI-поля + sync-колонки. Один объект → canonical_key;
 * «Все» / несколько → пустой key (pull считает запись «глобальной», как раньше без объекта).
 */
function _meetingApplyProjectFieldsToRecord(meet, isAll, selected) {
    const names = Array.isArray(selected) ? selected.map(s => String(s).trim()).filter(Boolean) : [];
    meet.projectName = _meetingFormatProjectNameForSave(isAll, names);
    meet.projectNames = isAll ? [] : names.slice();
    meet.project = meet.projectName;
    if (isAll) {
        meet.project_display_name = 'Все объекты';
        meet.project_canonical_key = '';
    } else if (names.length === 1) {
        meet.project_display_name = names[0];
        meet.project_canonical_key = _meetingResolveCanonicalKey(names[0]);
    } else {
        meet.project_display_name = names.join(', ');
        meet.project_canonical_key = '';
    }
}

function _meetingPermSvc() {
    return (_ctx && _ctx.permissions)
        || (window.RBI && window.RBI.services && window.RBI.services.permissions)
        || null;
}

function _meetingIsAdmin() {
    const perm = _meetingPermSvc();
    return !!(perm && typeof perm.isAdmin === 'function' && perm.isAdmin());
}

function _meetingCurrentEngineerName() {
    return (document.getElementById('inp-inspector')?.value
        || (typeof appSettings !== 'undefined' && (appSettings.inspectorName || appSettings.inspector_name))
        || '').trim();
}

function _meetingCanBindMeeting(meet) {
    if (!meet) return false;
    if (_meetingIsAdmin()) return true;
    const me = _meetingCurrentEngineerName();
    return !meet.author || !me || meet.author === me;
}

/** Список объектов для выбора: админ — все, инженер — только закреплённые. */
function _meetingSelectableBindProjectNames() {
    const all = _meetingCollectSetupProjectNames();
    if (_meetingIsAdmin()) return all;
    const assignedKeys = _meetingGetAssignedProjectKeys();
    if (!assignedKeys.length) return [];
    const names = [];
    assignedKeys.forEach((key) => {
        const display = _meetingResolveProjectDisplayName(key);
        if (display && !names.includes(display)) names.push(display);
    });
    return names.sort((a, b) => a.localeCompare(b, 'ru'));
}

function _meetingCurrentBindSelection(meet) {
    if (!meet) return { isAll: false, selected: [] };
    if (Array.isArray(meet.projectNames) && meet.projectNames.length) {
        return { isAll: false, selected: meet.projectNames.map(n => String(n).trim()).filter(Boolean) };
    }
    const raw = String(meet.projectName || meet.project || meet.project_display_name || '').trim();
    if (!raw || raw === 'Без объекта') return { isAll: false, selected: [] };
    if (raw === 'Все объекты') return { isAll: true, selected: [] };
    if (raw.includes(',')) {
        return { isAll: false, selected: raw.split(',').map(s => s.trim()).filter(Boolean) };
    }
    return { isAll: false, selected: [raw] };
}

/* ── openMeetingSetupModal ───────────────────────────────────────────────────── */

export function openMeetingSetupModal(taskId = null) {
    // Админ — все объекты; инженер — только закреплённые (как при смене привязки).
    const uniqueProjects = _meetingIsAdmin()
        ? _meetingCollectSetupProjectNames()
        : _meetingSelectableBindProjectNames();
    const defaults = _meetingDefaultSelectedProjects(
        uniqueProjects.length ? uniqueProjects : _meetingCollectSetupProjectNames()
    );
    // если у инженера есть свои объекты — не даём стартовать с «Все» по умолчанию
    if (!_meetingIsAdmin() && uniqueProjects.length) {
        defaults.all = false;
        if (!defaults.names.length) defaults.names = uniqueProjects.slice(0, 1);
        defaults.names = defaults.names.filter(n => uniqueProjects.includes(n));
        if (!defaults.names.length) defaults.names = uniqueProjects.slice(0, 1);
    }
    const projBoxes = uniqueProjects.map((p) => {
        const safe = p.replace(/"/g, '&quot;');
        const checked = !defaults.all && defaults.names.includes(p) ? 'checked' : '';
        return `
            <label class="flex items-center gap-2.5 px-2.5 py-2 bg-white dark:bg-slate-800 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.99]">
                <input type="checkbox" value="${safe}" class="meet-setup-proj-cb w-4 h-4 accent-orange-600 rounded cursor-pointer" ${checked} onchange="rbi_onMeetingSetupProjectChange()">
                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">${p}</span>
            </label>`;
    }).join('');

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-orange-200">👥</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Повестка Совещания</div>`;

    document.getElementById('modal-body').innerHTML = `
        <div class="mb-3">
            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Объект <span class="text-orange-500">*</span></label>
            ${_meetingIsAdmin() ? `
            <label class="flex items-center gap-2.5 px-2.5 py-2 mb-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-lg cursor-pointer border border-orange-200 dark:border-orange-800">
                <input type="checkbox" id="meet-setup-proj-all" class="w-4 h-4 accent-orange-600 rounded cursor-pointer" ${defaults.all ? 'checked' : ''} onchange="rbi_onMeetingSetupProjectAllChange()">
                <span class="text-[11px] font-black text-orange-700 dark:text-orange-300">Все объекты</span>
            </label>` : `
            <p class="text-[9px] text-slate-400 font-bold mb-1.5 px-0.5">Доступны только ваши закреплённые объекты</p>`}
            <div id="meet-setup-project-list" class="space-y-1 max-h-[22vh] overflow-y-auto custom-scrollbar pr-0.5 ${uniqueProjects.length ? '' : 'hidden'}">
                ${projBoxes || `<div class="text-[10px] text-slate-400 font-bold px-1 py-2">Нет объектов в проверках — доступен только «Все объекты»</div>`}
            </div>
            <p class="text-[9px] text-slate-400 font-bold mt-1 px-0.5">Обязательно: все, один или несколько</p>
        </div>
        <div class="mb-4">
            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Период</label>
            <select id="meet-setup-period" class="input-base !py-2 text-[11px] font-bold" onchange="rbi_updateMeetingSetupList()">
                <option value="WEEK" selected>Неделя</option>
                <option value="MONTH">Месяц</option>
                <option value="ALL">Всё время</option>
            </select>
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
            <button onclick="rbi_executeMeetingSetup('${taskId || ''}')" class="flex-1 bg-orange-500 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">▶ Начать разбор</button>
        </div>
    `;

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    rbi_updateMeetingSetupList();
}

export function onMeetingSetupProjectAllChange() {
    const allCb = document.getElementById('meet-setup-proj-all');
    if (allCb && allCb.checked) {
        document.querySelectorAll('.meet-setup-proj-cb').forEach(cb => { cb.checked = false; });
    }
    rbi_updateMeetingSetupList();
}

export function onMeetingSetupProjectChange() {
    const any = document.querySelectorAll('.meet-setup-proj-cb:checked').length > 0;
    if (any) {
        const allCb = document.getElementById('meet-setup-proj-all');
        if (allCb) allCb.checked = false;
    }
    rbi_updateMeetingSetupList();
}

/* ── updateMeetingSetupList ──────────────────────────────────────────────────── */

export function updateMeetingSetupList() {
    const periodEl = document.getElementById('meet-setup-period');
    const container = document.getElementById('meet-setup-checkboxes');
    if (!periodEl || !container) return;

    const { isAll, selected } = _meetingReadSetupProjectSelection();
    const period = periodEl.value;

    let baseData = _getAllInspections();
    baseData = baseData.filter(c => _meetingInspectionMatchesProjects(c, isAll, selected));

    const now = new Date();
    if (period === 'WEEK') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        baseData = baseData.filter(c => new Date(c.date) >= d);
    } else if (period === 'MONTH') {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        baseData = baseData.filter(c => new Date(c.date) >= d);
    }

    const uniqueContrs = [...new Set(baseData.map(c => c.contractorName).filter(Boolean))].sort();

    if (!isAll && selected.length === 0) {
        container.innerHTML = `<div class="text-center text-[10px] font-bold text-orange-500 py-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">Выберите объект (все / один / несколько)</div>`;
        return;
    }

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
    let { isAll, selected } = _meetingReadSetupProjectSelection();
    if (!_meetingIsAdmin()) {
        isAll = false;
        const allowed = _meetingSelectableBindProjectNames();
        selected = selected.filter(n => allowed.includes(n));
    }
    if (!isAll && selected.length === 0) {
        return showToast(_meetingIsAdmin()
            ? '⚠️ Выберите объект: все, один или несколько'
            : '⚠️ Выберите один или несколько своих объектов');
    }

    const checkedBoxes = document.querySelectorAll('.meet-setup-cb:checked');
    const selectedContrs = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedContrs.length === 0) return showToast("⚠️ Выберите хотя бы одного подрядчика!");

    const period = document.getElementById('meet-setup-period')?.value || 'WEEK';
    window._meetingSetupProject = _meetingFormatProjectNameForSave(isAll, selected);
    window._meetingSetupProjects = isAll ? ['__ALL__'] : selected.slice();

    let finalData = _getAllInspections().filter(c => selectedContrs.includes(c.contractorName));
    finalData = finalData.filter(c => _meetingInspectionMatchesProjects(c, isAll, selected));

    const now = new Date();
    if (period === 'WEEK') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        finalData = finalData.filter(c => new Date(c.date) >= d);
    } else if (period === 'MONTH') {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        finalData = finalData.filter(c => new Date(c.date) >= d);
    }

    if (typeof closeModal === 'function') closeModal();

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
        });
    }

    const agendaItems = buildMeetingAgenda({
        inspections: weekChecks,
        skRecords: _getSkRecords(),
        skContractorMap: _getSkContractorMap(),
        pastMeetings: typeof window.rbi_meetingsData !== 'undefined' ? window.rbi_meetingsData : [],
        templates: _templates(),
        getFlatList: typeof getFlatList === 'function' ? getFlatList : window.getFlatList
    });
    const skOverdueCount = agendaItems
        .filter(a => a.kind === AGENDA_KIND.SK || (a.kind === AGENDA_KIND.REOPENED && a.title && /пк\s*ск/i.test(a.title)))
        .reduce((s, a) => s + (a.count || 1), 0);

    let goodContrsHtml = goodContrs.length > 0
        ? goodContrs.map(c => `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-black mr-1 mb-1 inline-block">${c}</span>`).join('')
        : '<span class="text-[10px] text-slate-400 font-bold">Отличников нет</span>';

    let badContrsHtml = badContrs.length > 0
        ? badContrs.map(c => `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black mr-1 mb-1 inline-block">${c}</span>`).join('')
        : '<span class="text-[10px] text-slate-400 font-bold">Критических нет</span>';

    const badgeFor = (item) => {
        if (item.kind === AGENDA_KIND.B3 || (item.reopened && item.title && /b3/i.test(item.title))) {
            return '<span class="text-[9px] bg-red-600 text-white dark:bg-red-500 px-1.5 py-0.5 rounded font-black">B3</span>';
        }
        if (item.kind === AGENDA_KIND.B2) {
            return '<span class="text-[9px] bg-orange-500 text-white dark:bg-orange-500 px-1.5 py-0.5 rounded font-black">B2</span>';
        }
        if (item.kind === AGENDA_KIND.SK || (item.title && /пк\s*ск/i.test(item.title))) {
            return '<span class="text-[9px] bg-blue-600 text-white dark:bg-blue-500 px-1.5 py-0.5 rounded font-black">Проср. ПК СК</span>';
        }
        if (item.kind === AGENDA_KIND.CARRY) {
            const v = _carryVisual(item);
            return `<span class="text-[9px] ${v.badgeSolid} border px-1.5 py-0.5 rounded font-black">${v.badgeShort}</span>`;
        }
        return '<span class="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-black">↻</span>';
    };

    const borderFor = (item) => {
        if (item.kind === AGENDA_KIND.B3 || (item.reopened && item.title && /b3/i.test(item.title))) {
            return 'border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-950/40';
        }
        if (item.kind === AGENDA_KIND.B2) {
            return 'border-orange-500 bg-orange-50 dark:border-orange-400 dark:bg-orange-950/40';
        }
        if (item.kind === AGENDA_KIND.SK || (item.title && /пк\s*ск/i.test(item.title))) {
            return 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40';
        }
        if (item.kind === AGENDA_KIND.CARRY) return _carryVisual(item).border;
        return 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/40';
    };

    /** Только UI: убрать md-маркеры / табы, не меняя сохранённые данные. */
    const _escUi = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const _cleanUiText = (s) => String(s || '')
        .replace(/\r\n/g, '\n')
        .replace(/\t+/g, ' ')
        .replace(/[*_]{1,2}([^*_\n]+)[*_]{1,2}/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[\s]*[-*•●]\s+/gm, '')
        .replace(/`+/g, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

    /**
     * Пункт списком (•), без белых карточек.
     * Мета ×N / ↻ снимается только с хвоста — не режем текст по « · ».
     */
    const _renderDetailBullet = (detailLine) => {
        let raw = _stripSkNoise(String(detailLine || ''));
        let count = 0;
        let reopened = false;
        raw = raw.replace(/\s·\s×(\d+)\s*$/u, (_, n) => {
            count = parseInt(n, 10) || 0;
            return '';
        });
        raw = raw.replace(/\s·\s↻\s*повторно\s*$/iu, () => {
            reopened = true;
            return '';
        });
        raw = raw.replace(/\s·\s↻\s*$/u, () => {
            reopened = true;
            return '';
        });
        raw = _stripSkNoise(raw).replace(/просрочено\s+в\s+пк\s*ск\s*[·:.—–-]?\s*/giu, '');
        const body = _cleanUiText(raw);
        const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
        const head = lines[0] || body || 'Пункт';
        const rest = lines.slice(1).map(l => ` ${_escUi(l)}`).join('');
        const meta = [
            count > 1 ? `×${count}` : '',
            reopened ? '↻' : ''
        ].filter(Boolean).join(' ');
        return `<li class="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">${_escUi(head)}${rest}${meta ? ` <span class="text-slate-500 dark:text-slate-400 font-semibold">${_escUi(meta)}</span>` : ''}</li>`;
    };
    const _detailsBulletList = (arr) => {
        const items = (arr || []).map(_renderDetailBullet).filter(Boolean);
        return items.length
            ? `<ul class="mt-1.5 list-disc pl-4 space-y-0.5 marker:text-slate-400 dark:marker:text-slate-500">${items.join('')}</ul>`
            : '';
    };

    /** Убрать шаблон «Просрочено в ПК СК · …» (только UI; в т.ч. повтор в каждой строке). */
    const _stripSkNoise = (s) => String(s || '')
        .replace(/просрочено\s+в\s+пк\s*ск\s*[·:.—–\-]?\s*/giu, '')
        .replace(/просрочено\s+в\s+ск\s*[·:.—–\-]?\s*/giu, '')
        // одинокий префикс «ПК СК ·» в начале строки детали (не трогаем чипы заголовка)
        .replace(/^пк\s*ск\s*[·:.—–\-]\s*/imu, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    /** Явная подпись: откуда долг (B3 / B2 / ПК СК / …) — без дублей. */
    const _carryOriginMeta = (item) => {
        const ok = item.originKind
            || (String(item.sourceKey || '').split('|')[1] || '')
            || '';
        const title = String(item.title || '');
        const statsMatch = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        const catName = (statsMatch ? statsMatch[1] : title)
            .replace(/просрочено в пк\s*ск\s*[·:.—–-]?\s*/i, '')
            .trim();
        const stats = statsMatch ? statsMatch[2] : '';

        if (ok === AGENDA_KIND.B3 || /крит\.?\s*деф|^\s*b3\b/i.test(title)) {
            return { type: 'B3', label: 'Крит. деф. (B3)', cat: '', stats: '' };
        }
        if (ok === AGENDA_KIND.B2 || /повторяющ|^\s*b2\b/i.test(title)) {
            return { type: 'B2', label: 'Повторяющиеся нарушения (B2)', cat: '', stats: '' };
        }
        if (ok === AGENDA_KIND.SK || /пк\s*ск|просрочено/i.test(title) || /\|SK\|/i.test(item.sourceKey || '')) {
            const cat = catName && !/долг|прошл|просрочено/i.test(catName) ? catName : '';
            return { type: 'SK', label: 'Проср. в ПК СК', cat, stats };
        }
        if (title && !/долг с прошл/i.test(title)) {
            return { type: 'OTHER', label: catName || title, cat: '', stats };
        }
        return { type: 'OTHER', label: 'Незакрытый пункт', cat: '', stats: '' };
    };

    const _carryDetails = (item) => {
        const raw = (Array.isArray(item.details) && item.details.length)
            ? item.details.slice()
            : (() => {
                const defect = String(item.defect || '');
                if (defect.includes('•')) {
                    return defect.split('\n')
                        .map(l => l.replace(/^[\s]*[•●\-]\s*/, '').trim())
                        .filter(Boolean);
                }
                const cleaned = _cleanUiText(defect);
                return cleaned ? [cleaned] : [];
            })();

        return raw
            .map(_stripSkNoise)
            .map(l => _cleanUiText(l))
            .filter(l => l
                && !/:$/.test(l)
                && !/^(крит\.?\s*деф|повторяющ|просрочено|долг с прошл|пк\s*ск)\b/i.test(l)
                // отбросить строки, которые только повторяют категорию из title
                && l !== String(item.title || '').replace(/\s*\([^)]*\)\s*$/, '').trim());
    };

    /** Заголовок категории СК: «Проср. в ПК СК · категория» + число (+ уник./повтор.). */
    const _renderSkTitleHtml = (rawTitle, item, detailsArr) => {
        const t = String(rawTitle || 'Просроченные замечания в ПК СК');
        const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        let name = (m ? m[1] : t).trim();
        // если в title уже только категория (Отделка) — добавим явную метку
        if (name && !/пк\s*ск|просроч/i.test(name)) {
            name = `Проср. в ПК СК · ${name}`;
        } else if (!name) {
            name = 'Просроченные замечания в ПК СК';
        }
        name = _escUi(name);
        const total = _totalRemarks(item || {}, detailsArr || []);
        const extra = [];
        if (m) {
            m[2].split(',').map(p => p.trim()).filter(Boolean).forEach(p => {
                // «N шт.» / «N замечаний» уже покрыто общим чипом
                if (/^\d+\s*шт/i.test(p) || /замечан/i.test(p)) return;
                extra.push(`<span class="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 px-1.5 py-0.5 rounded">${_escUi(p)}</span>`);
            });
        }
        return `<span class="font-black text-slate-800 dark:text-slate-100">${name}</span><span class="inline-flex flex-wrap gap-1 ml-1.5 align-middle">${_countChipHtml(total, 'blue')}${extra.join('')}</span>`;
    };

    const renderAgendaRow = (item) => {
        const details = Array.isArray(item.details) ? item.details : [];
        const typeBucket = _agendaTypeBucket(item);
        const isSk = typeBucket === 'SK';
        const isCarry = typeBucket === 'CARRY_SK' || typeBucket === 'CARRY_AUDIT' || item.kind === AGENDA_KIND.CARRY;
        const isB3 = typeBucket === 'B3';
        const isB2 = typeBucket === 'B2';
        const title = item.title || '';
        let bodyHtml = '';
        let displayTitleHtml = _escUi(title || item.defect || '');
        if (isSk && details.length) {
            displayTitleHtml = _renderSkTitleHtml(title || 'Просроченные замечания в ПК СК', item, details);
            bodyHtml = _detailsBulletList(details);
        } else if (isB3 || isB2) {
            const tone = isB3 ? 'red' : 'orange';
            const label = title || (isB3 ? 'Крит. деф. (B3)' : 'Повторяющиеся нарушения');
            const total = _totalRemarks(item, details);
            displayTitleHtml = `
                <span class="font-black">${_escUi(label)}</span>
                <span class="inline-flex flex-wrap gap-1 ml-1.5 align-middle">${_countChipHtml(total, tone)}</span>`;
            bodyHtml = details.length
                ? _detailsBulletList(details)
                : (() => {
                    const lines = _cleanUiText(item.defect || '').split('\n').map(l => l.trim()).filter(Boolean);
                    return lines.length
                        ? `<ul class="mt-1.5 list-disc pl-4 space-y-0.5">${lines.map(l => `<li class="text-[11px] text-slate-700 dark:text-slate-300">${_escUi(l)}</li>`).join('')}</ul>`
                        : '';
                })();
        } else if (isCarry) {
            const vis = _carryVisual(item);
            const meta = _carryOriginMeta(item);
            const carryDetails = _carryDetails(item);
            const total = _totalRemarks(item, carryDetails);
            // происхождение + категория + общее число; заголовок различает аудит / ПК СК
            const chips = [
                `<span class="text-[9px] font-bold border px-1.5 py-0.5 rounded ${vis.softChip}">${_escUi(meta.label)}</span>`,
                meta.cat ? `<span class="text-[9px] font-bold border px-1.5 py-0.5 rounded ${vis.catChip}">${_escUi(meta.cat)}</span>` : '',
                _countChipHtml(total, vis.tone),
                ...(meta.stats ? meta.stats.split(',').map(p => p.trim()).filter(Boolean)
                    .filter(p => !/^\d+\s*шт/i.test(p) && !/замечан/i.test(p))
                    .map(p => `<span class="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">${_escUi(p)}</span>`) : [])
            ].filter(Boolean).join('');
            displayTitleHtml = `
                <span class="font-black">${_escUi(vis.title)}</span>
                <span class="inline-flex flex-wrap gap-1 ml-1.5 align-middle">${chips}</span>`;
            bodyHtml = carryDetails.length
                ? _detailsBulletList(carryDetails)
                : `<div class="mt-1 text-[10px] text-slate-500 italic">Нет детального текста пункта</div>`;
        } else if (details.length) {
            bodyHtml = `<ul class="list-disc pl-4 mt-1 space-y-0.5">${details.map(d => {
                const lines = _cleanUiText(d).split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length <= 1) return `<li>${_escUi(lines[0] || d)}</li>`;
                return `<li><span class="font-semibold">${_escUi(lines[0])}</span>${lines.slice(1).map(l => `<div class="text-[10px] text-slate-500 font-normal">${_escUi(l)}</div>`).join('')}</li>`;
            }).join('')}</ul>`;
        } else {
            const lines = _cleanUiText(item.defect || '').split('\n').map(l => l.trim()).filter(Boolean);
            bodyHtml = lines.length
                ? `<div class="mt-0.5 space-y-0.5">${lines.map(l => `<div>${_escUi(l)}</div>`).join('')}</div>`
                : '';
        }
        const defDeadline = item.date ? ` value="${String(item.date).split('T')[0]}"` : '';
        const defResp = item.resp ? ` value="${String(item.resp).replace(/"/g, '&quot;')}"` : '';
        const reopenBadge = item.reopened
            ? '<span class="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded font-bold">↻ повторно</span>'
            : '';
        const detailsJson = JSON.stringify(details).replace(/"/g, '&quot;');

        return `
                <div class="meeting-agenda-row relative">
                    <input type="hidden" class="agenda-meta-contr" value="${String(item.contr || '').replace(/"/g, '&quot;')}">
                    <input type="hidden" class="agenda-meta-defect" value="${String(item.defect || '').replace(/"/g, '&quot;')}">
                    <input type="hidden" class="agenda-meta-kind" value="${item.kind || ''}">
                    <input type="hidden" class="agenda-meta-source-key" value="${String(item.sourceKey || '').replace(/"/g, '&quot;')}">
                    <input type="hidden" class="agenda-meta-count" value="${item.count || 1}">
                    <input type="hidden" class="agenda-meta-reopened" value="${item.reopened ? '1' : '0'}">
                    <input type="hidden" class="agenda-meta-id" value="${String(item.id || '').replace(/"/g, '&quot;')}">
                    <input type="hidden" class="agenda-meta-title" value="${String(title).replace(/"/g, '&quot;')}">
                    <input type="hidden" class="agenda-meta-details" value="${detailsJson}">
                    <input type="hidden" class="agenda-meta-origin-kind" value="${String(item.originKind || '').replace(/"/g, '&quot;')}">

                    <div class="border-l-2 ${borderFor(item)} pl-2 py-1.5 rounded-r-lg">
                        <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-snug">
                            <div class="font-bold flex items-center gap-1.5 flex-wrap text-slate-800 dark:text-slate-100">${badgeFor(item)} <span class="min-w-0">${displayTitleHtml}</span> ${reopenBadge}</div>
                            ${bodyHtml}
                        </div>
                    </div>

                    <div class="mt-1.5 ml-0 rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-600 dark:bg-emerald-950/50 p-2.5 shadow-sm">
                        <div class="text-[8px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1.5">Решение · срок · ответственный</div>
                        <div class="flex flex-wrap gap-2">
                            <label class="flex items-center gap-1 text-[10px] font-bold text-emerald-900 dark:text-emerald-100 bg-white/90 dark:bg-slate-900/70 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-700 cursor-pointer active:scale-95 transition-transform">
                                <input type="checkbox" class="agenda-done-cb w-3.5 h-3.5 accent-emerald-600"> Решено
                            </label>
                            <input type="date" class="agenda-date input-base !py-1 !text-[10px] !w-auto flex-1 min-w-[90px] !bg-white dark:!bg-slate-900 !border-emerald-200 dark:!border-emerald-700"${defDeadline}>
                            <input type="text" class="agenda-resp input-base !py-1 !text-[10px] !w-auto flex-1 min-w-[90px] !bg-white dark:!bg-slate-900 !border-emerald-200 dark:!border-emerald-700" placeholder="Ответственный..."${defResp}>
                        </div>
                        <textarea class="agenda-comment input-base mt-2 h-10 resize-none text-[10px] !bg-white dark:!bg-slate-900 !border-emerald-200 dark:!border-emerald-700" placeholder="Что решили по этому блоку проблем...">${item.comment ? String(item.comment).replace(/</g, '&lt;') : ''}</textarea>
                    </div>
                </div>
            `;
    };

    // группировка строк UI по подрядчику
    const byContrUi = {};
    agendaItems.forEach(item => {
        const c = item.contr || '—';
        if (!byContrUi[c]) byContrUi[c] = [];
        byContrUi[c].push(item);
    });

    let agendaHtml = '';
    Object.keys(byContrUi).forEach(cName => {
        const items = byContrUi[cName];
        agendaHtml += `
            <div class="bg-white dark:bg-slate-800 rounded-xl mb-3 border border-slate-300 dark:border-slate-500 shadow-sm overflow-hidden">
                <div class="px-3 pt-2.5 pb-2 bg-slate-100/90 dark:bg-slate-900/80 border-b border-slate-300/80 dark:border-slate-600">
                    <div class="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase">
                        <div class="flex flex-wrap items-baseline gap-x-1">👷‍♂️ ${_escUi(cName)}</div>
                        ${_contrTypeSummaryHtml(items)}
                    </div>
                </div>
                <div class="p-3 space-y-3">
                    ${items.map(renderAgendaRow).join('')}
                </div>
            </div>`;
    });

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

        <!-- ПОДВАЛ (КНОПКИ СОХРАНЕНИЯ / PREVIEW / ИИ) -->
        <div id="meeting-footer-btn" class="p-3 sm:p-4 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/80 shrink-0 backdrop-blur-md z-10 flex gap-2">
            <button onclick="rbi_saveMeetingMemo()" class="flex-1 bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1.5">
                💾 Сохранить
            </button>
            <button onclick="rbi_previewMeetingProtocol()" class="flex-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-1.5">
                👁 PDF
            </button>
            <button onclick="window.RBI.services.ai.rbi_generateMeetingMemo()" id="btn-gen-memo" class="flex-[1.5] bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span class="truncate">Собрать (ИИ)</span>
            </button>
        </div>
    </div>`;

    container.innerHTML = html;

    const FD = window.RBIFormDraft;
    if (FD) {
        FD.unbindAutoSave(FD.KEYS.MEETING_WS);
        const decision = FD.askRestore(FD.KEYS.MEETING_WS, 'Совещание');
        if (decision === 'continue') {
            const d = FD.get(FD.KEYS.MEETING_WS);
            if (d && d.payload) _rbiApplyMeetingWsDraft(d.payload);
        }
        FD.bindAutoSave(container, FD.KEYS.MEETING_WS, _rbiCollectMeetingWsDraft);
    }
}

/** Крупное окно только для предпросмотра протокола (общий modal max-width 480px). */
function _setMeetingPreviewModalLayout(on) {
    const modal = document.getElementById('modal-overlay');
    const box = modal && modal.querySelector('.modal-content');
    if (!box) return;
    const defaultClose = box.querySelector(':scope > button[data-notify-action="closeModal"]');
    if (on) {
        box.style.maxWidth = 'min(960px, 96vw)';
        box.style.width = '96vw';
        box.style.maxHeight = '94vh';
        box.style.padding = '20px 24px';
        if (defaultClose) defaultClose.style.display = 'none';
        modal.dataset.meetingPreviewWide = '1';
    } else if (modal.dataset.meetingPreviewWide === '1') {
        box.style.maxWidth = '';
        box.style.width = '';
        box.style.maxHeight = '';
        box.style.padding = '';
        if (defaultClose) defaultClose.style.display = '';
        delete modal.dataset.meetingPreviewWide;
    }
}

function _closeMeetingPreviewModal() {
    _setMeetingPreviewModalLayout(false);
    if (typeof closeModal === 'function') closeModal();
}

/** Предпросмотр PDF без сохранения в архив. */
export async function previewMeetingProtocol() {
    const draft = collectMeetingDraftFromDom({
        memoText: document.getElementById('rbi-meeting-memo-text')?.value || ''
    });
    if (!draft.memoText) {
        draft.memoText = 'Черновик без текста мемо. Детали — в повестке ниже.';
    }
    _meetingPreviewDraft = draft;
    showToast('⏳ Формируем предпросмотр...');
    const content = await buildMeetingProtocolHtml(draft);

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full">
            <span class="text-[14px] uppercase font-black text-slate-800 dark:text-white">👁 Предпросмотр PDF</span>
            <button onclick="rbi_closeMeetingPreviewModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg">✕</button>
        </div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 max-h-[calc(94vh-140px)] overflow-y-auto custom-scrollbar text-slate-800 shadow-inner mb-3" id="meeting-preview-body">
            ${content}
        </div>
        <div class="flex gap-2 sticky bottom-0 bg-[var(--card-bg)] pt-1">
            <button onclick="rbi_closeMeetingPreviewModal()" class="flex-1 bg-slate-100 text-slate-700 border border-slate-200 py-3 rounded-xl font-bold text-[10px] uppercase">Закрыть</button>
            <button onclick="rbi_printMeetingDraftBrowser()" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase shadow-md">Печать черновика</button>
        </div>`;
    _setMeetingPreviewModalLayout(true);
    // клик по затемнению / общий closeModal — тоже сбрасываем ширину
    if (!window.__meetingPreviewCloseHooked) {
        window.__meetingPreviewCloseHooked = true;
        const prevClose = window.closeModal;
        window.closeModal = function () {
            _setMeetingPreviewModalLayout(false);
            if (typeof prevClose === 'function') return prevClose.apply(this, arguments);
        };
    }
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

export async function printMeetingDraftBrowser() {
    const draft = _meetingPreviewDraft || collectMeetingDraftFromDom({
        memoText: document.getElementById('rbi-meeting-memo-text')?.value
            || 'Черновик без текста мемо. Детали — в повестке ниже.'
    });
    const content = await buildMeetingProtocolHtml(draft);
    if (typeof printPdfShell === 'function') {
        printPdfShell(`Черновик протокола ${new Date().toLocaleDateString('ru-RU')}`, content, 'A4', 'portrait', 'browser');
    }
}

/* ── handleMeetingPhotoUpload ────────────────────────────────────────────────── */

export function handleMeetingPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("⚙️ Обработка фото...");
    window.compressImageToBase64(file, 1000, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'meet');
        const box = document.getElementById('meeting-photo-preview');
        box.dataset.photo = localUrl;
        box.classList.remove('hidden');

        const realSrc = await PhotoManager.getAsyncUrl(localUrl) || window.getPhotoSrc(localUrl);

        box.innerHTML = `<img src="${realSrc}" class="w-full h-full object-cover"><div onclick="event.stopPropagation(); document.getElementById('meeting-photo-preview').dataset.photo=''; document.getElementById('meeting-photo-preview').classList.add('hidden');" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black shadow-md cursor-pointer">✕</div>`;
        event.target.value = '';
        if (window.RBIFormDraft) {
            window.RBIFormDraft.saveNow(window.RBIFormDraft.KEYS.MEETING_WS, _rbiCollectMeetingWsDraft);
        }
    });
}

/* ── saveMeetingMemo ─────────────────────────────────────────────────────────── */

export async function saveMeetingMemo() {
    if (_isDemoMode()) return showToast("В демо-режиме сохранение отключено");
    let text = document.getElementById('rbi-meeting-memo-text').value.trim();
    if (!text) {
        text = "Протокол сохранен без генерации ИИ. Детали решений смотрите в блоке повестки.";
    }

    const agendaData = collectAgendaFromDom();
    const meetDate = new Date().toISOString();
    agendaData.forEach(a => {
        if (a.isDone && !a.resolvedAt) a.resolvedAt = meetDate;
    });

    const extraNotes = document.getElementById('rbi-meeting-notes')?.value.trim() || '';
    const author = document.getElementById('inp-inspector')?.value.trim() || 'Инженер';

    let projectName = String(window._meetingSetupProject || '').trim();
    if (!projectName) {
        // fallback, если setup ещё открыт (не должно случаться после execute)
        const sel = _meetingReadSetupProjectSelection();
        if (sel.isAll || sel.selected.length) {
            projectName = _meetingFormatProjectNameForSave(sel.isAll, sel.selected);
        }
    }
    if (!projectName) {
        return showToast('⚠️ Не выбран объект совещания — откройте повестку заново');
    }
    const isAllProjects = projectName === 'Все объекты'
        || (Array.isArray(window._meetingSetupProjects) && window._meetingSetupProjects.includes('__ALL__'));
    const projectNames = isAllProjects
        ? []
        : (Array.isArray(window._meetingSetupProjects)
            ? window._meetingSetupProjects.filter(p => p && p !== '__ALL__')
            : projectName.split(',').map(s => s.trim()).filter(Boolean));
    const meet = {
        id: 'meet_' + Date.now().toString(36),
        date: meetDate,
        author: author,
        engineer_name: author,
        inspector_name: author,
        title: `Совещание от ${new Date().toLocaleDateString('ru-RU')}`,
        memoText: text,
        agenda: agendaData,
        notes: extraNotes,
        qDayPhoto: document.getElementById('meeting-photo-preview')?.dataset?.photo || null,
        createdAt: meetDate,
        updatedAt: meetDate
    };
    _meetingApplyProjectFieldsToRecord(meet, isAllProjects, projectNames);

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
    const FD = window.RBIFormDraft;
    if (FD) {
        FD.clear(FD.KEYS.MEETING_WS);
        FD.unbindAutoSave(FD.KEYS.MEETING_WS);
    }
    _meetingDraftSkipSave = true;
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
    window.rbi_onMeetingSetupProjectAllChange = onMeetingSetupProjectAllChange;
    window.rbi_onMeetingSetupProjectChange = onMeetingSetupProjectChange;
    window.rbi_openMeetingBindModal   = openMeetingBindModal;
    window.rbi_closeMeetingBindModal  = closeMeetingBindModal;
    window.rbi_saveMeetingBind        = saveMeetingBind;
    window.rbi_onMeetingBindProjectAllChange = onMeetingBindProjectAllChange;
    window.rbi_onMeetingBindProjectChange = onMeetingBindProjectChange;
    window.rbi_executeMeetingSetup    = executeMeetingSetup;
    window.rbi_createMeeting          = createMeeting;
    window.rbi_handleMeetingPhotoUpload = handleMeetingPhotoUpload;
    window.rbi_saveMeetingMemo        = saveMeetingMemo;
    window.rbi_previewMeetingProtocol = previewMeetingProtocol;
    window.rbi_printMeetingDraftBrowser = printMeetingDraftBrowser;
    window.rbi_printSavedMeetingDirty = printSavedMeetingDirty;
    window.rbi_closeMeetingPreviewModal = _closeMeetingPreviewModal;
}

console.log('[MeetingsModule] meetings.module.js loaded (ES module, Step 35 — full business logic)');
