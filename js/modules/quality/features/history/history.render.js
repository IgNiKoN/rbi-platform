/**
 * history.render.js
 * Рендер вкладки «История» — фильтрация, группировка, генерация HTML,
 * детальный просмотр акта, пагинация групп.
 *
 * Бизнес-логика перенесена из history.legacy.js. Обратная совместимость
 * с inline-обработчиками index.html и внешними вызовами (game.js) —
 * через window.*-прокси в конце файла.
 */

import { HistoryState } from './history.state.js';

let _ctx = null;

function _getEtalonActs() {
    if (_ctx && _ctx.knowledge) {
        return _ctx.knowledge.getEtalonActsSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
        return window.RBI.services.knowledge.getEtalonActsSync();
    }
    return Array.isArray(window.etalonActsArray) ? window.etalonActsArray : [];
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
            return typeof SYSTEM_TEMPLATES !== 'undefined' ? SYSTEM_TEMPLATES : {};
        }
    };
}

// Документарный УрК записи (Два индекса УрК — физика и документация, Шаг 3).
// Старые записи (сохранённые до введения physical/documentary) не содержат
// item.metrics.documentary — досчитываем "на лету" по item.state и актуальному
// чек-листу, без изменения хранимых данных (та же lazy recalculation, что
// используется в getContractorMetrics()).
function _getDocumentaryScore(item) {
    if (!item.metrics) return null;
    if (item.metrics.documentary !== undefined) return item.metrics.documentary;
    if (typeof window.getDocumentaryScore !== 'function' || !item.state || !item.templateKey) return null;
    const type = item.templateKey.split('_')[0];
    const key = item.templateKey.replace(type + '_', '');
    const checklist = type === 'sys' && _templates().getSystemTemplates()[key] ? _templates().getSystemTemplates()[key].groups : (_templates().getUserTemplates()[key] ? _templates().getUserTemplates()[key].groups : []);
    const flatList = typeof window.getFlatList === 'function' ? window.getFlatList(checklist) : [];
    return window.getDocumentaryScore(item.state, flatList);
}

// Приватная функция — перенесена из history.legacy.js (изначально app.js, строка 3971).
// Генерирует SVG-бейдж статуса синхронизации для записи истории.
function getSyncBadgeHtml(item) {
    var source = item.source || '';
    var syncStatus = item.syncStatus || item.sync_status || '';

    var iconLocal = '<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"></path></svg>';
    var iconCloud = '<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"></path></svg>';
    var iconBlocked = '<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';

    if (syncStatus === 'blocked') {
        var reason = item.syncBlockReason || item.sync_block_reason || 'Отправка запрещена';
        return '<button onclick="event.stopPropagation(); showToast(\'Причина: ' + String(reason).replace(/'/g, "\\'") + '\')" class="px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">' + iconBlocked + 'Заблок.</button>';
    }
    if (source === 'cloud' || syncStatus === 'synced') {
        return '<span class="px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">' + iconCloud + '</span>';
    }
    return '<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">' + iconLocal + '</span>';
}

export const HistoryRender = {

    bindCtx(ctx) {
        _ctx = ctx;
    },

    /**
     * Рендер вкладки История — фильтрация, группировка, генерация HTML.
     * Перенесено из history.legacy.js (изначально app.js, строка 3990).
     * Оригинальный синтаксис сохранён.
     * Зависимости: HistoryState.allRecords/filters, getSyncBadgeHtml — приватная
     *              функция модуля, DOM IDs: history-list, hist-empty-msg,
     *              hist-count-total, hist-search-text, hist-filter-period,
     *              hist-filter-photo, hist-filter-b3
     */
    render() {
        const listDiv = document.getElementById('history-list');
        const emptyMsg = document.getElementById('hist-empty-msg');
        const countEl = document.getElementById('hist-count-total');
        if (!listDiv) return;

        if (HistoryState.allRecords.length === 0) {
            listDiv.innerHTML = '';
            if (emptyMsg) emptyMsg.style.display = 'block';
            if (countEl) countEl.innerText = '0';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        const fSearch = document.getElementById('hist-search-text')?.value.toLowerCase() || '';
        const fPeriod = document.getElementById('hist-filter-period')?.value || 'ALL';
        const fPhoto = document.getElementById('hist-filter-photo')?.checked;
        const fB3 = document.getElementById('hist-filter-b3')?.checked;

        // ИСПРАВЛЕНИЕ (см. current_plan.md, блок "Глобальные фильтры истории не
        // работают"): applyMultiFilter() (multi-filter.js) пишет выбор объекта/
        // подрядчика/инспектора в window.activeMultiFilters.history, а не в
        // HistoryState.filters — тот же split-brain, что уже был обойдён в
        // analytics.render.js через _historyFilters(). HistoryState.filters
        // никогда не заполняется этими тремя ключами (только period/searchText
        // из DOM выше), поэтому чтение из него делало мультифильтр "визуально
        // выбран, но не применяется". Источник правды — activeMultiFilters.
        const _histMultiFilters = (window.activeMultiFilters && window.activeMultiFilters.history) || {};
        const fProj = _histMultiFilters.project || [];
        const fContr = _histMultiFilters.contractor || [];
        const fInsp = _histMultiFilters.inspector || [];

        let filteredArr = HistoryState.allRecords;
        const now = new Date();

        if (fSearch) {
            filteredArr = filteredArr.filter(i => {
                const projectText = i.project_display_name || i.projectName || i.project_canonical_key || '';
                return (
                    (i.location && i.location.toLowerCase().includes(fSearch)) ||
                    (projectText && projectText.toLowerCase().includes(fSearch)) ||
                    (i.inspectorName && i.inspectorName.toLowerCase().includes(fSearch)) ||
                    (i.contractorName && i.contractorName.toLowerCase().includes(fSearch))
                );
            });
        }

        if (fProj.length > 0) {
            filteredArr = filteredArr.filter(i => {
                const p = i.project_display_name || i.projectName || i.project_canonical_key || '';
                return fProj.includes(p) || fProj.includes(i.project_canonical_key);
            });
        }
        if (fContr.length > 0) filteredArr = filteredArr.filter(i => fContr.includes(i.contractorName));
        if (fInsp.length > 0) filteredArr = filteredArr.filter(i => fInsp.includes(i.inspectorName));

        if (fPeriod === 'DAY') filteredArr = filteredArr.filter(i => new Date(i.date).toDateString() === now.toDateString());
        else if (fPeriod === 'WEEK') { const w = new Date(); w.setDate(now.getDate() - 7); filteredArr = filteredArr.filter(i => new Date(i.date) >= w); }
        else if (fPeriod === 'MONTH') { const m = new Date(); m.setDate(now.getDate() - 30); filteredArr = filteredArr.filter(i => new Date(i.date) >= m); }

        if (fPhoto) filteredArr = filteredArr.filter(i => i.photos && Object.keys(i.photos).length > 0);
        if (fB3) filteredArr = filteredArr.filter(i => i.metrics && i.metrics.n_B3_fail > 0);

        if (countEl) countEl.innerText = filteredArr.length;

        if (filteredArr.length === 0) {
            listDiv.innerHTML = `<div class="text-sm text-slate-500 text-center bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">По заданным фильтрам проверок не найдено.</div>`;
            return;
        }

        const grouped = {};
        filteredArr.forEach(item => {
            const cName = item.contractorName || 'Не указан';
            const pName = item.projectName || 'Без объекта';
            const groupKey = `${cName}_||_${pName}`;
            const tTitle = item.templateTitle || 'Неизвестный вид работ';
            if (!grouped[groupKey]) grouped[groupKey] = {};
            if (!grouped[groupKey][tTitle]) grouped[groupKey][tTitle] = [];
            grouped[groupKey][tTitle].push(item);
        });

        const groupKeys = Object.keys(grouped);
        groupKeys.sort((a, b) => {
            const newestA = Math.max(...Object.values(grouped[a]).flat().map(c => new Date(c.date).getTime()));
            const newestB = Math.max(...Object.values(grouped[b]).flat().map(c => new Date(c.date).getTime()));
            return newestB - newestA;
        });

        let html = '';
        let groupIndex = 0;

        const renderGroup = (gKey) => {
            const parts = gKey.split('_||_');
            const cName = parts[0];
            const pName = parts[1];
            const safeGroupName = `hist-group-${groupIndex++}`;

            let totalChecksInGroup = 0;
            Object.values(grouped[gKey]).forEach(arr => totalChecksInGroup += arr.length);

            let groupHtml = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[14px] shadow-sm mb-2 overflow-hidden">
            <div class="flex justify-between items-center p-2.5 cursor-pointer active:bg-[var(--hover-bg)] transition-colors select-none" onclick="
                const body = document.getElementById('${safeGroupName}');
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
                    <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight">${cName}</div>
                        <div class="text-[9px] font-bold text-slate-400 truncate mt-[1px]">${pName}</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 pl-1">
                    <span class="text-[9px] font-bold text-slate-500 bg-[var(--hover-bg)] px-1.5 py-0.5 rounded-md border border-[var(--card-border)]">${totalChecksInGroup} шт</span>
                    <svg class="w-4 h-4 text-slate-400 transition-transform duration-300 transform rotate-0 chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
            
            <div id="${safeGroupName}" class="hidden border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 p-2">`;

            for (let tTitle in grouped[gKey]) {
                groupHtml += `<div class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1 mt-1.5 flex items-center gap-1"><svg class="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg> ${tTitle} <span class="opacity-70 font-bold">(${grouped[gKey][tTitle].length})</span></div>`;
                const reversed = [...grouped[gKey][tTitle]].sort((a, b) => new Date(b.date) - new Date(a.date));

                const visibleItems = reversed.slice(0, 10);
                const hiddenItems = reversed.slice(10);

                const renderRow = (item) => {
                    const photoIcon = (item.photos && Object.keys(item.photos).length > 0) ? `📸` : '';
                    const syncBadge = getSyncBadgeHtml(item);
                    const docScore = _getDocumentaryScore(item);

                    return `
                <div class="flex items-center gap-1.5 mb-1.5">
                    <input type="checkbox" class="hist-checkbox w-4 h-4 accent-indigo-600 rounded shrink-0 cursor-pointer" value="${item.id}">
                    <div class="flex-1 bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors active:scale-[0.98]" onclick="showHistoryDetail('${item.id}')">
                        <div class="flex justify-between items-center">
                            <div class="min-w-0 pr-2">
                                <div class="text-[10px] font-bold text-slate-800 dark:text-white truncate leading-tight">${item.location} <span class="text-[9px] ml-1">${photoIcon}</span></div>
                                <div class="text-[8px] text-slate-400 mt-0.5 truncate font-medium flex items-center">
                                    ${new Date(item.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} | Инсп: ${item.inspectorName || 'Не указан'}
                                    ${syncBadge}
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-0.5 shrink-0">
                                <span class="status-tag ${item.metrics.statusCls} !text-[9px] !px-1.5 !py-0.5 shadow-sm">${item.metrics.final}%</span>
                                ${(docScore !== null && docScore !== undefined) ? `<span class="text-[9px] font-bold text-indigo-400" title="Документарный УрК">Док: ${docScore}%</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
                };

                groupHtml += visibleItems.map(renderRow).join('');

                if (hiddenItems.length > 0) {
                    const hiddenGroupId = `${safeGroupName}-hidden-${tTitle.replace(/\W/g, '')}`;
                    groupHtml += `<div id="${hiddenGroupId}" class="hidden">${hiddenItems.map(renderRow).join('')}</div>`;
                    groupHtml += `<button onclick="document.getElementById('${hiddenGroupId}').classList.remove('hidden'); this.style.display='none'" class="w-full bg-[var(--hover-bg)] text-slate-500 dark:text-slate-400 py-2 mt-1 mb-2 rounded-lg text-[9px] font-bold uppercase active:scale-95 transition-colors border border-dashed border-[var(--card-border)]">Показать еще проверки (${hiddenItems.length})</button>`;
                }
            }
            groupHtml += `</div></div>`;
            return groupHtml;
        };

        const VISIBLE_GROUPS = 15;
        const visibleGroupKeys = groupKeys.slice(0, VISIBLE_GROUPS);

        window._hiddenHistoryGroups = groupKeys.slice(VISIBLE_GROUPS);
        window._historyRenderGroupFunc = renderGroup;

        html += visibleGroupKeys.map(renderGroup).join('');

        if (window._hiddenHistoryGroups.length > 0) {
            html += `<div id="hidden-contractor-groups"></div>`;
            html += `<button id="load-more-history-btn" onclick="window.loadMoreHistoryGroups()" class="w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 py-3 mt-1 mb-6 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm">
            Загрузить остальные объекты (${window._hiddenHistoryGroups.length})
        </button>`;
        } else if (HistoryState.pageHasMore) {
            // Уже показаны все загруженные в память группы — но в базе (за курсором
            // by_date) есть ещё записи. Кнопка тянет следующую страницу через
            // IndexedDB-курсор (HistoryActions.loadNextPage), а не весь стор целиком.
            html += `<button id="load-more-history-page-btn" onclick="window.loadMoreHistoryPage()" class="w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 py-3 mt-1 mb-6 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm">
            Загрузить более старые проверки
        </button>`;
        }

        listDiv.innerHTML = html;
    },

    /**
     * Применяет фильтры к вкладке История (или Отчёты).
     * Перенесено из history.legacy.js (изначально app.js, строка 3956).
     * Вызывается из index.html через onchange/onclick inline-обработчиков.
     */
    applyFilters() {
        var periodSelect = document.getElementById('hist-filter-period');
        var periodLabel = document.getElementById('btn-hist-period-label');
        if (periodSelect && periodLabel) {
            periodLabel.querySelector('.truncate').innerText =
                periodSelect.options[periodSelect.selectedIndex].text;
        }

        if (window.currentHistoryViewMode === 'reports') {
            if (typeof renderReportsList === 'function') renderReportsList();
        } else {
            HistoryRender.render();
        }
    },

    /**
     * Обновляет надписи на кнопках мульти-фильтров.
     * Перенесено из history.legacy.js (изначально app.js, строка 3949).
     */
    updateFilters() {
        if (typeof updateFilterButtonLabels === 'function') {
            updateFilterButtonLabels();
        }
    },

    /**
     * Дозагружает следующую порцию групп подрядчиков в список истории.
     * Перенесено из history.legacy.js (изначально app.js, строка 4177).
     * Вызывается из кнопки «Загрузить остальные объекты».
     * Инкрементальный DOM-паттерн (insertAdjacentHTML), без полного re-render —
     * отдельный от HistoryActions.loadMore() механизм пагинации (см. отчёт).
     */
    loadMoreGroups() {
        var container = document.getElementById('hidden-contractor-groups');
        var btn = document.getElementById('load-more-history-btn');
        if (!container || !window._hiddenHistoryGroups || !window._historyRenderGroupFunc) return;

        var nextBatch = window._hiddenHistoryGroups.slice(0, 15);
        window._hiddenHistoryGroups = window._hiddenHistoryGroups.slice(15);

        container.insertAdjacentHTML('beforeend', nextBatch.map(window._historyRenderGroupFunc).join(''));

        if (window._hiddenHistoryGroups.length > 0) {
            btn.innerText = 'Загрузить остальные объекты (' + window._hiddenHistoryGroups.length + ')';
        } else {
            btn.style.display = 'none';
        }
    },

    /**
     * Открывает модальное окно с деталями проверки.
     * Перенесено из history.legacy.js (изначально app.js, строка 2576).
     * Оригинальный синтаксис (template literals) сохранён — конвертация создаёт риск ошибок.
     * Зависимости: HistoryState.allRecords, etalonActsArray, SYSTEM_TEMPLATES, userTemplates,
     *              getFlatList, openEtalonViewer, rbiEscapeAttr, rbiPhotoPlaceholder,
     *              openPhotoViewer, closeModal, generatePrescriptionAi, printEtalonAct,
     *              rbiHydrateLocalImages, modal-overlay, modal-title, modal-body DOM IDs
     */
    renderDetail(id) {
        let sortedArray = [...HistoryState.allRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
        let currIdx = sortedArray.findIndex(x => String(x.id) === String(id));

        if (currIdx === -1) {
            sortedArray = [..._getEtalonActs()].sort((a, b) => new Date(b.date) - new Date(a.date));
            currIdx = sortedArray.findIndex(x => String(x.id) === String(id));
        }

        if (currIdx === -1) return;

        const item = sortedArray[currIdx];
        const newerId = currIdx > 0 ? sortedArray[currIdx - 1].id : null;
        const olderId = currIdx < sortedArray.length - 1 ? sortedArray[currIdx + 1].id : null;

        if (item.templateKey === 'sys_etalon_act') {
            if (typeof openEtalonViewer === 'function') {
                setTimeout(() => openEtalonViewer(item.id), 200);
                return;
            }
        }

        const type = item.templateKey.split('_')[0];
        const key = item.templateKey.replace(type + '_', '');
        const specificChecklist = type === 'sys' && _templates().getSystemTemplates()[key] ? _templates().getSystemTemplates()[key].groups : (_templates().getUserTemplates()[key] ? _templates().getUserTemplates()[key].groups : []);
        const detailDocScore = _getDocumentaryScore(item);

        let nOk = 0, nTotal = 0;

        const resultItems = getFlatList(specificChecklist).filter(i => item.state[i.id]).map(i => {
            nTotal++;
            let stTxt = 'OK', stCls = 'tag-green', cat = `B${i.w}`;
            if (item.state[i.id] === 'ok') nOk++;
            if (item.state[i.id] === 'fail') { stTxt = 'FAIL'; stCls = 'tag-red'; }
            if (item.state[i.id] === 'fail_escalated') { stTxt = '>1.5x (B3)'; stCls = 'tag-red shadow-sm'; cat = 'B3'; }

            let photoHtml = '';
            if (item.photos && item.photos[i.id]) {
                const rawPhotoSrc = item.photos[i.id];
                const safePhotoSrc = window.rbiEscapeAttr(rawPhotoSrc);
                photoHtml = `
        <img 
            src="${window.rbiPhotoPlaceholder}"
            data-local-src="${safePhotoSrc}"
            class="mt-2 w-20 h-20 object-cover rounded border border-slate-200 shadow-sm cursor-pointer"
            onclick="openPhotoViewer('${safePhotoSrc}')"
        >`;
            }

            let extraData = '';
            if (item.details && item.details[i.id]) {
                const d = item.details[i.id];
                if (d.fact && d.tol) extraData += `<div class="text-[10px] font-bold text-orange-600 mt-1">Факт: ${d.fact}${d.unit} при допуске ${d.tol}${d.unit} (Превышение ${(d.fact / d.tol).toFixed(1)}x)</div>`;
                if (d.comment) extraData += `<div class="text-[10px] text-slate-500 italic mt-1">${d.comment}</div>`;
            }

            return `<div class="border-b border-slate-100 dark:border-slate-700 py-2.5"><div class="flex items-start justify-between gap-3"><div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-snug"><span class="weight-tag wt-${i.w}">${cat}</span> ${i.n}${extraData}</div><span class="status-tag ${stCls}">${stTxt}</span></div>${photoHtml}</div>`;
        }).join('');

        const modal = document.getElementById('modal-overlay');
        document.getElementById('modal-title').innerHTML = `
    <div class="flex justify-between items-center w-full">
        <button class="p-2 -ml-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 active:scale-90" ${newerId ? `onclick="showHistoryDetail('${newerId}')"` : 'disabled'}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg></button>
        <div class="text-center truncate flex-1 px-2 text-lg dark:text-white">${item.location}</div>
        <button class="p-2 -mr-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 active:scale-90" ${olderId ? `onclick="showHistoryDetail('${olderId}')"` : 'disabled'}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg></button>
    </div>`;

        document.getElementById('modal-body').innerHTML = `
        <div class="text-xs font-bold text-slate-500 mb-1">${item.contractorName}</div>
        <div class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">${item.templateTitle}</div>
        ${item.checkedStagesInfo ? `<div class="text-[9px] bg-slate-100 dark:bg-slate-800 p-2 rounded mt-2 mb-2 text-slate-500 dark:text-slate-400 font-bold leading-snug"><span class="text-slate-400 uppercase tracking-widest block mb-1">Проверенные этапы:</span> ${item.checkedStagesInfo.join('<br>')}</div>` : ''}
        <div class="text-[10px] text-slate-400 mb-4">${new Date(item.date).toLocaleString('ru-RU')}</div>
        
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">УрК Изделия (физика)</div>
                <div class="text-3xl font-black ${item.metrics.isDanger ? 'text-red-600' : (item.metrics.final < 85 ? 'text-orange-500' : 'text-green-600')}">${item.metrics.final}%</div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">УрК Документации</div>
                <div class="text-3xl font-black ${detailDocScore === null ? 'text-slate-400' : (detailDocScore < 70 ? 'text-red-600' : (detailDocScore < 85 ? 'text-orange-500' : 'text-green-600'))}">${detailDocScore === null ? '—' : detailDocScore + '%'}</div>
            </div>
        </div>
        
        ${item.metrics.reason ? `<div class="text-[10px] font-bold text-red-600 mb-3 bg-red-50 p-3 rounded-lg border border-red-100 shadow-sm">${item.metrics.reason}</div>` : ''}
        
        ${item.templateKey === 'sys_etalon_act'
                ? `<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 text-center shadow-sm">
                   <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Это Акт-Эталон</div>
                   <button onclick="closeModal(); setTimeout(() => window.printEtalonAct('${item.id}'), 300)" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2">
                       🖨️ РАСПЕЧАТАТЬ (PDF)
                   </button>
               </div>`
                : `<button onclick="closeModal(); setTimeout(() => window.RBI.services.ai.generatePrescriptionAi('${item.id}'), 300)" class="w-full mb-4 bg-slate-800 text-white dark:bg-white dark:text-slate-800 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2">
                   📄 Создать предписание (ИИ)
               </button>`
            }
        
        <div class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4">
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Инженерный breakdown</div>
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                <div>Проверено: <b>${nTotal} из ${item.metrics.totalCount}</b></div>
                <div>Соответствует: <b class="text-green-600">${nOk}</b></div>
                <div>Нарушения: <b class="text-red-600">${nTotal - nOk}</b></div>
                <div class="col-span-2 text-[10px] mt-1">B1: <b>${item.metrics.n_B1_fail}</b> | B2: <b>${item.metrics.n_B2_fail}</b> | B3: <b>${item.metrics.n_B3_fail}</b></div>
                <div class="col-span-2 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded mt-1 text-center font-bold">Формула: ${item.metrics.baseUrkPerc}% × ${item.metrics.kc.toFixed(2)} × ${item.metrics.kcrit.toFixed(2)} = ${item.metrics.final}%</div>
            </div>
        </div>
        <div class="text-[11px] font-bold text-slate-400 uppercase mb-2 mt-6">Детализация проверки</div>
        <div class="pb-6">${resultItems}</div>
    `;

        document.body.classList.add('modal-open');
        modal.style.display = 'flex';

        if (typeof window.rbiHydrateLocalImages === 'function') {
            setTimeout(() => {
                window.rbiHydrateLocalImages(document.getElementById('modal-body'));
            }, 50);
        }
    }
};

if (typeof window !== 'undefined') {
    window.HistoryRender = HistoryRender;

    // Прокси для обратной совместимости: inline-обработчики index.html
    // и внешние вызовы из game.js/export.js/sync.js используют глобальные имена.
    window.renderHistoryTab = HistoryRender.render;
    window.showHistoryDetail = HistoryRender.renderDetail;
    window.applyHistoryFilters = HistoryRender.applyFilters;
    window.updateAllDynamicFilters = HistoryRender.updateFilters;
    window.loadMoreHistoryGroups = HistoryRender.loadMoreGroups;
    // Постраничная (курсорная) дозагрузка Журнала — делегирует в HistoryActions
    // (window-глобал, не ES import — history.actions.js уже импортирует
    // HistoryRender, обратный импорт создал бы цикл).
    window.loadMoreHistoryPage = function () {
        if (window.HistoryActions && typeof window.HistoryActions.loadNextPage === 'function') {
            return window.HistoryActions.loadNextPage();
        }
    };
}

console.log('[HistoryRender] history.render.js loaded');
