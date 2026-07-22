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
            return typeof window.SYSTEM_TEMPLATES !== 'undefined' ? window.SYSTEM_TEMPLATES : {};
        }
    };
}

// Документарный УрК записи (Два индекса УрК — физика и документация, Шаг 3).
// Старые записи (сохранённые до введения physical/documentary) не содержат
// item.metrics.documentary — досчитываем "на лету" по item.state и актуальному
// чек-листу, без изменения хранимых данных (та же lazy recalculation, что
// используется в getContractorMetrics()).
/**
 * Сохраняет раскрытые аккордеоны Объект/Подрядчик до перерисовки списка.
 * Ключи — отображаемые имена (стабильнее index-based id hist-group-N).
 */
// Сколько проверок у подрядчика показывать сразу (без «Показать еще»).
const HIST_CONTRACTOR_VISIBLE = 10;

function _escAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function _histCollator() {
    return new Intl.Collator('ru');
}

function _projectNameOf(item) {
    return (item && item.projectName) || 'Без объекта';
}

function _contractorNameOf(item) {
    return (item && item.contractorName) || 'Не указан';
}

function _filterHistoryRecords(allRecords) {
    const fSearch = document.getElementById('hist-search-text')?.value.toLowerCase() || '';
    const fPeriod = document.getElementById('hist-filter-period')?.value || 'ALL';
    const fPhoto = document.getElementById('hist-filter-photo')?.checked;
    const fB3 = document.getElementById('hist-filter-b3')?.checked;
    const _histMultiFilters = (window.activeMultiFilters && window.activeMultiFilters.history) || {};
    const fProj = _histMultiFilters.project || [];
    const fContr = _histMultiFilters.contractor || [];
    const fInsp = _histMultiFilters.inspector || [];

    let filteredArr = allRecords || [];
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

    return filteredArr;
}

let _histGroupSeq = 0;

function _nextHistGroupId() {
    return 'hist-group-' + (_histGroupSeq++);
}

function _renderHistoryRowHtml(item) {
    const photoIcon = (item.photos && Object.keys(item.photos).length > 0) ? `📸` : '';
    const syncBadge = getSyncBadgeHtml(item);
    const docScore = _getDocumentaryScore(item);
    const tTitle = item.templateTitle || 'Неизвестный вид работ';
    const when = new Date(item.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const insp = item.inspectorName || 'Не указан';
    const metaLine = when + ' · ' + tTitle + ' · ' + insp;
    const ts = new Date(item.date).getTime() || 0;
    const idAttr = _escAttr(item.id);
    const statusCls = (item.metrics && item.metrics.statusCls) || 'tag-blue';
    const finalPct = (item.metrics && item.metrics.final != null) ? item.metrics.final : '—';

    return `
                <div class="flex items-center gap-1.5 mb-1.5 min-w-0 w-full max-w-full" data-hist-id="${idAttr}" data-hist-date="${ts}">
                    <input type="checkbox" class="hist-checkbox w-4 h-4 accent-indigo-600 rounded shrink-0 cursor-pointer" value="${idAttr}">
                    <div class="flex-1 min-w-0 overflow-hidden bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors active:scale-[0.98]" onclick="showHistoryDetail('${String(item.id).replace(/'/g, "\\'")}')">
                        <div class="flex justify-between items-start gap-2 min-w-0">
                            <div class="min-w-0 flex-1 overflow-hidden">
                                <div class="flex items-center gap-1 min-w-0">
                                    <div class="text-[10px] font-bold text-slate-800 dark:text-white truncate leading-tight min-w-0 flex-1">${item.location || ''}${photoIcon ? ' ' + photoIcon : ''}</div>
                                    <div class="shrink-0 self-center">${syncBadge}</div>
                                </div>
                                <div class="text-[8px] text-slate-400 truncate font-medium mt-0.5 min-w-0">${metaLine}</div>
                            </div>
                            <div class="flex flex-col items-end gap-0.5 shrink-0">
                                <span class="status-tag ${statusCls} !text-[9px] !px-1.5 !py-0.5 shadow-sm">${finalPct}%</span>
                                ${(docScore !== null && docScore !== undefined) ? `<span class="text-[9px] font-bold text-indigo-400 whitespace-nowrap" title="Документарный УрК">Док: ${docScore}%</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
}

function _renderContractorBlockHtml(safeGroupName, cName, cIndex, items) {
    const safeContractorName = `${safeGroupName}-contr-${cIndex}`;
    const contrAvgUrk = _avgFinalUrk(items);
    const contrUrkHtml = (contrAvgUrk !== null)
        ? `<span class="status-tag ${_avgUrkStatusCls(contrAvgUrk)} !text-[9px] !px-1.5 !py-0.5 shadow-sm" data-hist-urk-contr title="Средний УрК по подрядчику">${contrAvgUrk}%</span>`
        : `<span class="hidden" data-hist-urk-contr></span>`;
    const reversed = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
    const visibleItems = reversed.slice(0, HIST_CONTRACTOR_VISIBLE);
    const hiddenItems = reversed.slice(HIST_CONTRACTOR_VISIBLE);
    const cEsc = _escAttr(cName);
    const hiddenGroupId = `${safeGroupName}-hidden-${String(cName).replace(/\W/g, '')}`;

    let html = `<div class="mb-1.5 ml-1 mt-1.5 flex justify-between items-center gap-2 cursor-pointer select-none" data-hist-contractor-head="${cEsc}" onclick="
                    const body = document.getElementById('${safeContractorName}');
                    const icon = this.querySelector('.chevron-icon-sm');
                    if (body.classList.contains('hidden')) {
                        body.classList.remove('hidden');
                        icon.style.transform = 'rotate(180deg)';
                    } else {
                        body.classList.add('hidden');
                        icon.style.transform = 'rotate(0deg)';
                    }
                ">
                    <div class="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1 min-w-0">
                        <svg class="w-3 h-3 text-indigo-400 transition-transform duration-300 chevron-icon-sm shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
                        <span class="truncate">${cName}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        ${contrUrkHtml}
                        <span class="text-[9px] font-bold text-slate-500 bg-[var(--hover-bg)] px-1.5 py-0.5 rounded-md border border-[var(--card-border)]" data-hist-count-contr>${items.length} шт</span>
                    </div>
                </div>`;
    html += `<div id="${safeContractorName}" class="hidden min-w-0" data-hist-contractor="${cEsc}">`;
    html += visibleItems.map(_renderHistoryRowHtml).join('');
    if (hiddenItems.length > 0) {
        html += `<div id="${hiddenGroupId}" class="hidden" data-hist-hidden>${hiddenItems.map(_renderHistoryRowHtml).join('')}</div>`;
        html += `<button type="button" data-hist-show-more onclick="document.getElementById('${hiddenGroupId}').classList.remove('hidden'); this.style.display='none'" class="w-full bg-[var(--hover-bg)] text-slate-500 dark:text-slate-400 py-2 mt-1 mb-2 rounded-lg text-[9px] font-bold uppercase active:scale-95 transition-colors border border-dashed border-[var(--card-border)]">Показать еще проверки (${hiddenItems.length})</button>`;
    }
    html += `</div>`;
    return html;
}

function _renderProjectGroupHtml(pName, contractorsMap) {
    const safeGroupName = _nextHistGroupId();
    const collator = _histCollator();
    const contractorNames = Object.keys(contractorsMap).sort(collator.compare);
    const allObjectItems = [];
    contractorNames.forEach(cName => {
        const arr = contractorsMap[cName];
        for (let i = 0; i < arr.length; i++) allObjectItems.push(arr[i]);
    });
    const totalChecksInGroup = allObjectItems.length;
    const objAvgUrk = _avgFinalUrk(allObjectItems);
    const objUrkHtml = (objAvgUrk !== null)
        ? `<span class="status-tag ${_avgUrkStatusCls(objAvgUrk)} !text-[9px] !px-1.5 !py-0.5 shadow-sm" data-hist-urk-obj title="Средний УрК по объекту">${objAvgUrk}%</span>`
        : `<span class="hidden" data-hist-urk-obj></span>`;
    const pEsc = _escAttr(pName);

    let groupHtml = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[14px] shadow-sm mb-2 overflow-hidden" data-hist-project="${pEsc}">
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
                        <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight">${pName}</div>
                        <div class="text-[9px] font-bold text-slate-400 truncate mt-[1px]" data-hist-contractor-count>${contractorNames.length} подрядч.</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 pl-1">
                    ${objUrkHtml}
                    <span class="text-[9px] font-bold text-slate-500 bg-[var(--hover-bg)] px-1.5 py-0.5 rounded-md border border-[var(--card-border)]" data-hist-count-obj>${totalChecksInGroup} шт</span>
                    <svg class="w-4 h-4 text-slate-400 transition-transform duration-300 transform rotate-0 chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
            
            <div id="${safeGroupName}" class="hidden border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 p-2 min-w-0 overflow-x-hidden" data-hist-project-body>`;

    contractorNames.forEach((cName, cIndex) => {
        groupHtml += _renderContractorBlockHtml(safeGroupName, cName, cIndex, contractorsMap[cName]);
    });
    groupHtml += `</div></div>`;
    return groupHtml;
}

function _captureExpandedHistory(listDiv) {
    const projects = new Set();
    const contractors = new Set();
    if (!listDiv) return { projects, contractors };

    listDiv.querySelectorAll('[data-hist-project]').forEach((card) => {
        const pName = card.getAttribute('data-hist-project');
        const pBody = card.querySelector('[data-hist-project-body]');
        if (!pName || !pBody || pBody.classList.contains('hidden')) return;
        projects.add(pName);
        pBody.querySelectorAll('[data-hist-contractor]').forEach((cBody) => {
            if (cBody.classList.contains('hidden')) return;
            const cName = cBody.getAttribute('data-hist-contractor');
            if (cName) contractors.add(pName + '\0' + cName);
        });
    });
    return { projects, contractors };
}

function _restoreExpandedHistory(listDiv, expanded) {
    if (!listDiv || !expanded || !expanded.projects || expanded.projects.size === 0) return;

    listDiv.querySelectorAll('[data-hist-project]').forEach((card) => {
        const pName = card.getAttribute('data-hist-project');
        if (!pName || !expanded.projects.has(pName)) return;

        const pBody = card.querySelector('[data-hist-project-body]');
        if (!pBody) return;
        pBody.classList.remove('hidden');
        const pIcon = card.querySelector('.chevron-icon');
        if (pIcon) pIcon.style.transform = 'rotate(180deg)';

        pBody.querySelectorAll('[data-hist-contractor]').forEach((cBody) => {
            const cName = cBody.getAttribute('data-hist-contractor');
            if (!cName || !expanded.contractors.has(pName + '\0' + cName)) return;
            cBody.classList.remove('hidden');
            const head = cBody.previousElementSibling;
            const cIcon = head && head.querySelector('.chevron-icon-sm');
            if (cIcon) cIcon.style.transform = 'rotate(180deg)';
        });
    });
}

function _findHistCard(listDiv, pName) {
    if (!listDiv || !pName) return null;
    const esc = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(pName) : pName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return listDiv.querySelector('[data-hist-project="' + esc + '"]');
}

function _findHistContractorBody(card, cName) {
    if (!card || !cName) return null;
    const esc = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(cName) : cName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return card.querySelector('[data-hist-contractor="' + esc + '"]');
}

function _enforceContractorVisibleLimit(cBody) {
    if (!cBody) return;
    const rows = [...cBody.querySelectorAll('[data-hist-id]')];
    rows.sort((a, b) => (Number(b.getAttribute('data-hist-date')) || 0) - (Number(a.getAttribute('data-hist-date')) || 0));

    let hiddenWrap = cBody.querySelector('[data-hist-hidden]');
    let showMoreBtn = cBody.querySelector('[data-hist-show-more]');

    if (rows.length <= HIST_CONTRACTOR_VISIBLE) {
        rows.forEach((row) => cBody.insertBefore(row, hiddenWrap || showMoreBtn || null));
        if (hiddenWrap) hiddenWrap.remove();
        if (showMoreBtn) showMoreBtn.remove();
        return;
    }

    if (!hiddenWrap) {
        hiddenWrap = document.createElement('div');
        hiddenWrap.className = 'hidden';
        hiddenWrap.setAttribute('data-hist-hidden', '');
        hiddenWrap.id = (cBody.id || 'hist') + '-hidden';
        cBody.appendChild(hiddenWrap);
    }
    if (!showMoreBtn) {
        showMoreBtn = document.createElement('button');
        showMoreBtn.type = 'button';
        showMoreBtn.setAttribute('data-hist-show-more', '');
        showMoreBtn.className = 'w-full bg-[var(--hover-bg)] text-slate-500 dark:text-slate-400 py-2 mt-1 mb-2 rounded-lg text-[9px] font-bold uppercase active:scale-95 transition-colors border border-dashed border-[var(--card-border)]';
        showMoreBtn.onclick = function () {
            hiddenWrap.classList.remove('hidden');
            showMoreBtn.style.display = 'none';
        };
        cBody.appendChild(showMoreBtn);
    }

    rows.slice(0, HIST_CONTRACTOR_VISIBLE).forEach((row) => cBody.insertBefore(row, hiddenWrap));
    rows.slice(HIST_CONTRACTOR_VISIBLE).forEach((row) => hiddenWrap.appendChild(row));
    cBody.appendChild(hiddenWrap);
    cBody.appendChild(showMoreBtn);
    const wasExpanded = !hiddenWrap.classList.contains('hidden') || showMoreBtn.style.display === 'none';
    showMoreBtn.textContent = 'Показать еще проверки (' + (rows.length - HIST_CONTRACTOR_VISIBLE) + ')';
    if (wasExpanded) {
        hiddenWrap.classList.remove('hidden');
        showMoreBtn.style.display = 'none';
    }
}

function _patchUrkEl(el, avg, title) {
    if (!el) return;
    if (avg === null || avg === undefined) {
        el.className = 'hidden';
        el.textContent = '';
        return;
    }
    el.className = 'status-tag ' + _avgUrkStatusCls(avg) + ' !text-[9px] !px-1.5 !py-0.5 shadow-sm';
    el.setAttribute('title', title || '');
    el.textContent = avg + '%';
}

function _updateProjectCardStats(card, pName, filteredArr) {
    if (!card) return;
    const objItems = filteredArr.filter(i => _projectNameOf(i) === pName);
    const countObj = card.querySelector('[data-hist-count-obj]');
    if (countObj) countObj.textContent = objItems.length + ' шт';
    _patchUrkEl(card.querySelector('[data-hist-urk-obj]'), _avgFinalUrk(objItems), 'Средний УрК по объекту');

    const contractors = new Set(objItems.map(_contractorNameOf));
    const cCount = card.querySelector('[data-hist-contractor-count]');
    if (cCount) cCount.textContent = contractors.size + ' подрядч.';

    card.querySelectorAll('[data-hist-contractor]').forEach((cBody) => {
        const cName = cBody.getAttribute('data-hist-contractor');
        const items = objItems.filter(i => _contractorNameOf(i) === cName);
        const head = cBody.previousElementSibling;
        const countContr = head && head.querySelector('[data-hist-count-contr]');
        if (countContr) countContr.textContent = items.length + ' шт';
        _patchUrkEl(head && head.querySelector('[data-hist-urk-contr]'), _avgFinalUrk(items), 'Средний УрК по подрядчику');
    });
}

function _syncLoadMoreFooter(listDiv) {
    if (!listDiv) return;
    const existingBtn = document.getElementById('load-more-history-page-btn');
    const existingSentinel = document.getElementById('history-load-sentinel');
    if (!HistoryState.pageHasMore) {
        if (existingBtn) existingBtn.remove();
        if (existingSentinel) existingSentinel.remove();
        if (HistoryRender._sentinelObserver) {
            HistoryRender._sentinelObserver.disconnect();
            HistoryRender._sentinelObserver = null;
        }
        return;
    }
    if (!existingBtn) {
        listDiv.insertAdjacentHTML('beforeend', `<button id="load-more-history-page-btn" onclick="window.loadMoreHistoryPage()" class="w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 py-3 mt-1 mb-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm">
            Загрузить более старые проверки
        </button>
        <div id="history-load-sentinel" class="h-2 -mt-2"></div>`);
    } else if (!existingSentinel) {
        existingBtn.insertAdjacentHTML('afterend', `<div id="history-load-sentinel" class="h-2 -mt-2"></div>`);
    }
    HistoryRender._observeLoadSentinel();
}

function _insertProjectCardSorted(listDiv, cardHtml, pName) {
    const collator = _histCollator();
    const cards = [...listDiv.querySelectorAll(':scope > [data-hist-project]')];
    let inserted = false;
    for (let i = 0; i < cards.length; i++) {
        const other = cards[i].getAttribute('data-hist-project') || '';
        if (collator.compare(pName, other) < 0) {
            cards[i].insertAdjacentHTML('beforebegin', cardHtml);
            inserted = true;
            break;
        }
    }
    if (!inserted) {
        const btn = document.getElementById('load-more-history-page-btn');
        if (btn) btn.insertAdjacentHTML('beforebegin', cardHtml);
        else listDiv.insertAdjacentHTML('beforeend', cardHtml);
    }
}

function _ensureContractorBlock(card, cName) {
    let cBody = _findHistContractorBody(card, cName);
    if (cBody) return cBody;

    const pBody = card.querySelector('[data-hist-project-body]');
    if (!pBody) return null;
    const safeGroupName = pBody.id || _nextHistGroupId();
    const cIndex = pBody.querySelectorAll('[data-hist-contractor]').length;
    const blockHtml = _renderContractorBlockHtml(safeGroupName, cName, cIndex, []);
    const collator = _histCollator();
    const heads = [...pBody.querySelectorAll(':scope > [data-hist-contractor-head]')];
    let placed = false;
    for (let i = 0; i < heads.length; i++) {
        const other = heads[i].getAttribute('data-hist-contractor-head') || '';
        if (collator.compare(cName, other) < 0) {
            heads[i].insertAdjacentHTML('beforebegin', blockHtml);
            placed = true;
            break;
        }
    }
    if (!placed) pBody.insertAdjacentHTML('beforeend', blockHtml);
    return _findHistContractorBody(card, cName);
}

function _insertRowIntoContractor(cBody, item) {
    if (!cBody || !item || item.id == null) return false;
    const idStr = String(item.id);
    if (cBody.querySelector('[data-hist-id="' + ((typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(idStr) : idStr.replace(/"/g, '\\"')) + '"]')) {
        return false;
    }

    const newTs = new Date(item.date).getTime() || 0;
    const rowHtml = _renderHistoryRowHtml(item);
    const rows = [...cBody.querySelectorAll('[data-hist-id]')];
    let insertBefore = null;
    for (let i = 0; i < rows.length; i++) {
        const ts = Number(rows[i].getAttribute('data-hist-date')) || 0;
        if (ts < newTs) {
            insertBefore = rows[i];
            break;
        }
    }
    if (insertBefore) {
        insertBefore.insertAdjacentHTML('beforebegin', rowHtml);
    } else {
        const hiddenWrap = cBody.querySelector('[data-hist-hidden]');
        const showMoreBtn = cBody.querySelector('[data-hist-show-more]');
        if (hiddenWrap) hiddenWrap.insertAdjacentHTML('beforeend', rowHtml);
        else if (showMoreBtn) showMoreBtn.insertAdjacentHTML('beforebegin', rowHtml);
        else cBody.insertAdjacentHTML('beforeend', rowHtml);
    }
    _enforceContractorVisibleLimit(cBody);
    return true;
}

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

// Средний итоговый УрК по списку проверок (для свёрнутых заголовков
// объекта/подрядчика). null — если ни у одной записи нет metrics.final.
function _avgFinalUrk(items) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < items.length; i++) {
        const m = items[i] && items[i].metrics;
        if (m && m.final !== undefined && m.final !== null) {
            sum += Number(m.final) || 0;
            n++;
        }
    }
    if (!n) return null;
    return Math.round(sum / n);
}

// Класс цветного status-tag по порогам той же шкалы, что и у отдельной
// проверки (math.utils.js: ≥85 зелёный, 70–84 жёлтый, <70 красный).
function _avgUrkStatusCls(avg) {
    if (avg === null || avg === undefined) return 'tag-blue';
    if (avg < 70) return 'tag-red';
    if (avg >= 85) return 'tag-green';
    return 'tag-yellow';
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

        // Preserve open Object/Contractor accordions across full re-render
        // (sync dirty path, filters) — same idea as Tasks UI restore.
        const expanded = _captureExpandedHistory(listDiv);
        _histGroupSeq = 0;

        if (HistoryState.allRecords.length === 0) {
            listDiv.innerHTML = '';
            if (emptyMsg) emptyMsg.style.display = 'block';
            if (countEl) countEl.innerText = '0';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        // Фильтры: activeMultiFilters.history + DOM period/search (см. multi-filter).
        const filteredArr = _filterHistoryRecords(HistoryState.allRecords);
        if (countEl) countEl.innerText = filteredArr.length;

        if (filteredArr.length === 0) {
            listDiv.innerHTML = `<div class="text-sm text-slate-500 text-center bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">По заданным фильтрам проверок не найдено.</div>`;
            return;
        }

        // Объект → Подрядчик (алфавит) → проверки по дате (новые сверху).
        const grouped = {};
        filteredArr.forEach(item => {
            const pName = _projectNameOf(item);
            const cName = _contractorNameOf(item);
            if (!grouped[pName]) grouped[pName] = {};
            if (!grouped[pName][cName]) grouped[pName][cName] = [];
            grouped[pName][cName].push(item);
        });

        const groupKeys = Object.keys(grouped).sort(_histCollator().compare);
        let html = groupKeys.map((pName) => _renderProjectGroupHtml(pName, grouped[pName])).join('');

        if (HistoryState.pageHasMore) {
            html += `<button id="load-more-history-page-btn" onclick="window.loadMoreHistoryPage()" class="w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 py-3 mt-1 mb-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-colors border border-indigo-200 dark:border-indigo-800 shadow-sm">
            Загрузить более старые проверки
        </button>
        <div id="history-load-sentinel" class="h-2 -mt-2"></div>`;
        }

        listDiv.innerHTML = html;
        _restoreExpandedHistory(listDiv, expanded);
        HistoryRender._observeLoadSentinel();
    },

    /**
     * Догрузка страницы без полной пересборки списка: вставляет только новые
     * строки/группы, сохраняет скролл, чекбоксы и раскрытые аккордеоны.
     * Fallback на render(), если DOM ещё без data-hist-* (пустой/фильтр-empty).
     */
    appendPage(newItems) {
        const listDiv = document.getElementById('history-list');
        const countEl = document.getElementById('hist-count-total');
        const emptyMsg = document.getElementById('hist-empty-msg');
        if (!listDiv) return;

        const filteredAll = _filterHistoryRecords(HistoryState.allRecords);
        if (countEl) countEl.innerText = filteredAll.length;
        if (emptyMsg && HistoryState.allRecords.length > 0) emptyMsg.style.display = 'none';

        if (!listDiv.querySelector('[data-hist-project]')) {
            HistoryRender.render();
            return;
        }

        const incoming = _filterHistoryRecords(newItems || []);
        if (incoming.length === 0) {
            _syncLoadMoreFooter(listDiv);
            return;
        }

        const touchedProjects = new Set();
        const byProject = {};
        incoming.forEach((item) => {
            const pName = _projectNameOf(item);
            const cName = _contractorNameOf(item);
            if (!byProject[pName]) byProject[pName] = {};
            if (!byProject[pName][cName]) byProject[pName][cName] = [];
            byProject[pName][cName].push(item);
        });

        Object.keys(byProject).forEach((pName) => {
            let card = _findHistCard(listDiv, pName);
            if (!card) {
                _insertProjectCardSorted(listDiv, _renderProjectGroupHtml(pName, byProject[pName]), pName);
                touchedProjects.add(pName);
                return;
            }

            Object.keys(byProject[pName]).forEach((cName) => {
                const cBody = _ensureContractorBlock(card, cName);
                if (!cBody) return;
                byProject[pName][cName].forEach((item) => {
                    _insertRowIntoContractor(cBody, item);
                });
            });
            touchedProjects.add(pName);
        });

        touchedProjects.forEach((pName) => {
            _updateProjectCardStats(_findHistCard(listDiv, pName), pName, filteredAll);
        });

        _syncLoadMoreFooter(listDiv);
    },

    /**
     * Автопагинация по скроллу: следит за сентинелом в конце списка через
     * IntersectionObserver и, когда он попадает в область видимости (пользователь
     * доскроллил почти до конца), запускает ту же докачку страницы, что и кнопка
     * "Загрузить более старые проверки" — без дублирования логики загрузки.
     * Наблюдатель пересоздаётся при каждом render() (сентинел — новый DOM-узел).
     */
    _observeLoadSentinel() {
        if (HistoryRender._sentinelObserver) {
            HistoryRender._sentinelObserver.disconnect();
            HistoryRender._sentinelObserver = null;
        }

        const sentinel = document.getElementById('history-load-sentinel');
        if (!sentinel || typeof IntersectionObserver !== 'function') return;

        const observer = new IntersectionObserver((entries) => {
            const isVisible = entries.some(e => e.isIntersecting);
            if (isVisible && HistoryState.pageHasMore && !HistoryState.isLoadingPage) {
                window.loadMoreHistoryPage();
            }
        }, { root: null, rootMargin: '600px 0px 0px 0px', threshold: 0 });

        observer.observe(sentinel);
        HistoryRender._sentinelObserver = observer;
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
            const itemPhotos = item.photos ? window.normalizeItemPhotos(item.photos[i.id]) : [];
            if (itemPhotos.length > 0) {
                photoHtml = itemPhotos.map(rawPhotoSrc => {
                    const safePhotoSrc = window.rbiEscapeAttr(rawPhotoSrc);
                    return `
        <img 
            src="${window.rbiPhotoPlaceholder}"
            data-local-src="${safePhotoSrc}"
            class="mt-2 mr-2 w-20 h-20 object-cover rounded border border-slate-200 shadow-sm cursor-pointer"
            onclick="openPhotoViewer('${safePhotoSrc}')"
        >`;
                }).join('');
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
                : `<button onclick="closeModal(); setTimeout(() => window.printInspectionAct('${item.id}', 'browser'), 300)" class="w-full mb-2 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2">
                   🖨️ Печать акта осмотра (PDF)
               </button>
               <button onclick="closeModal(); setTimeout(() => window.RBI.services.ai.generatePrescriptionAi('${item.id}'), 300)" class="w-full mb-4 bg-slate-800 text-white dark:bg-white dark:text-slate-800 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2">
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
