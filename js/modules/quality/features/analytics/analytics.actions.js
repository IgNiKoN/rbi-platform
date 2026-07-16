/**
 * analytics.actions.js
 * Бизнес-действия модуля Analytics.
 *
 * Делегирует загрузку данных в analytics.service.js,
 * управляет режимом (local/cloud) и фильтрами через AnalyticsState.
 *
 * Фаза N (перенесено из analytics.legacy.js): реальная бизнес-логика
 * раздела «Аналитика» — источники данных, переключение подвкладок,
 * управление трендами графиков, экспертные заключения, архив отчётов.
 * Источник состояния — AnalyticsState.* там, где состояние изолировано
 * (mode, filters, chartInstances, activeSubTab), и window.* там, где
 * состояние остаётся в app.js/templates.js (contractorArray, userTemplates,
 * SYSTEM_TEMPLATES, activeMultiFilters, reportsArray, customExpertConclusions,
 * DEFECT_CAUSES — уже синхронизированы с window.* в app.js). trendGroupings,
 * selectedChartFilters, currentContractorsFilter, currentDetailedContractor,
 * currentEditingExpertKey, currentEditingTextAreaId и buildTrendChartData
 * физически перенесены в analytics.state.js/analytics.actions.js (этот файл),
 * доступ — через window.*, как и раньше.
 */

import { AnalyticsState } from './analytics.state.js';

// Перенесено из app.js 1:1 — умный генератор данных для трендовых графиков.
// Вызывает window.getWeekNumber (перенесена в js/shared/math.utils.js,
// classic-script, подключён раньше analytics.module.js в index.html).
function buildTrendChartData(data, fieldName, allowedCats = [], period = 'MONTH') {
    const timeMap = {}; const categoriesTotal = {};
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedData.forEach(item => {
        if (!item.metrics) return;
        const d = new Date(item.date);
        let tLabel = '';

        if (period === 'YEAR') tLabel = d.getFullYear().toString();
        else if (period === 'QUARTER') tLabel = `Q${Math.floor(d.getMonth() / 3) + 1} '${d.getFullYear().toString().slice(-2)}`;
        else if (period === 'WEEK') tLabel = `Нед.${window.getWeekNumber(d)} '${d.getFullYear().toString().slice(-2)}`;
        else tLabel = d.toLocaleString('ru-RU', { month: 'short', year: '2-digit' });

        // УМНОЕ ИМЯ: Подрядчик + Объект
        let cat = fieldName === 'TOTAL' ? 'Общий УрК' : (item[fieldName] || 'Неизвестно');
        if (fieldName === 'contractorName') {
            cat = (item.contractorName || 'Неизвестно') + ' [' + (item.projectName || 'Без объекта') + ']';
        }
        categoriesTotal[cat] = (categoriesTotal[cat] || 0) + 1;

        if (!timeMap[tLabel]) timeMap[tLabel] = {};
        if (!timeMap[tLabel][cat]) timeMap[tLabel][cat] = { sum: 0, cnt: 0 };
        timeMap[tLabel][cat].sum += Number(item.metrics.final) || 0;
        timeMap[tLabel][cat].cnt++;
    });

    let targetCats = [];
    if (fieldName === 'TOTAL') targetCats = ['Общий УрК'];
    else if (allowedCats && allowedCats.length > 0) targetCats = allowedCats.filter(c => categoriesTotal[c]);
    else targetCats = Object.keys(categoriesTotal).sort((a, b) => categoriesTotal[b] - categoriesTotal[a]).slice(0, 5);

    const labels = Object.keys(timeMap);
    const colors = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#db2777', '#d97706', '#059669', '#2563eb'];

    const datasets = targetCats.map((cat, i) => {
        const dataPoints = labels.map(l => (timeMap[l][cat] ? Math.round(timeMap[l][cat].sum / timeMap[l][cat].cnt) : null));
        return {
            label: cat.length > 20 ? cat.substring(0, 20) + '...' : cat,
            data: dataPoints,
            borderColor: fieldName === 'TOTAL' ? '#4f46e5' : colors[i % colors.length],
            backgroundColor: fieldName === 'TOTAL' ? 'rgba(79, 70, 229, 0.1)' : colors[i % colors.length],
            fill: fieldName === 'TOTAL',
            tension: 0.4, borderWidth: 3, pointRadius: 4, spanGaps: true
        };
    });

    return { labels, datasets };
}
window.buildTrendChartData = buildTrendChartData;

// ─── Приватные хелперы (перенесено из analytics.legacy.js, строки 12–91) ───

function _getSetting(key) {
    return window.RBI.services.settings.get(key);
}

function _analyticsFilters(ns) {
    // ВАЖНО: window.activeMultiFilters — единственный источник, реально обновляемый
    // модалкой мульти-фильтра (applyMultiFilter() в multi-filter.js пишет туда напрямую,
    // не вызывая AnalyticsState.setFilters()). AnalyticsState.filters — одноразовый
    // снимок, заполняемый только при инициализации модуля (analytics.module.js#init),
    // поэтому не может быть источником по умолчанию — иначе выбор объекта/подрядчика
    // в фильтре молча игнорируется при расчёте данных (баг: фильтр визуально выбран,
    // но данные показываются нефильтрованными).
    if (window.activeMultiFilters && window.activeMultiFilters[ns || 'analytics']) {
        return window.activeMultiFilters[ns || 'analytics'];
    }
    if (!ns || ns === 'analytics') {
        if (window.RBI && window.RBI.services && window.RBI.services.analytics) {
            return window.RBI.services.analytics.getAnalyticsFilters();
        }
    }
    if (window.AnalyticsState && window.AnalyticsState.filters) {
        return window.AnalyticsState.filters;
    }
    return { project: [], contractor: [], inspector: [], template: [], period: null };
}

function _analyticsMode() {
    if (window.AnalyticsState) return window.AnalyticsState.mode;
    return window.analyticsDataMode || 'local';
}

function _chartInstances() {
    if (window.AnalyticsState) return window.AnalyticsState.chartInstances;
    if (typeof window.chartInstances !== 'undefined') return window.chartInstances;
    return {};
}

function _historyFilters() {
    if (window.HistoryState && window.HistoryState.filters) {
        return window.HistoryState.filters;
    }
    if (window.activeMultiFilters && window.activeMultiFilters.history) {
        return window.activeMultiFilters.history;
    }
    return { project: [], contractor: [], inspector: [] };
}

function _inspections() {
    // HistoryState.allRecords заполняется только после mount() History-модуля
    // (переход на вкладку «История»); до этого момента остаётся пустым []
    // по умолчанию — используем его, только если оно реально непусто, иначе
    // единственный актуальный источник данных проверок — window.contractorArray.
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getAllForAnalyticsSync();
    }
    if (window.HistoryState && Array.isArray(window.HistoryState.allRecords) && window.HistoryState.allRecords.length > 0) {
        return window.HistoryState.allRecords;
    }
    if (Array.isArray(window.contractorArray)) return window.contractorArray;
    return [];
}

function _storage() {
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
        return window.RBI.services.storage;
    }
    return {
        stores: function () { return typeof STORES !== 'undefined' ? STORES : {}; },
        put: function (store, data) { return dbPut(store, data); }
    };
}

function _gameLogAction(actionType, targetId) {
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.logAction(actionType, targetId);
    }
    if (typeof gameLogAction === 'function') return gameLogAction(actionType, targetId);
}

function _reports() {
    if (AnalyticsActions._ctx && AnalyticsActions._ctx.reports) {
        return AnalyticsActions._ctx.reports;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.reports) {
        return window.RBI.services.reports;
    }
    return {
        getAllSync: function () {
            return Array.isArray(window.reportsArray) ? window.reportsArray : [];
        },
        getExpertConclusions: function () {
            return window.customExpertConclusions || {};
        },
        getExpertConclusion: function (key) {
            return (window.customExpertConclusions || {})[key];
        },
        setExpertConclusion: function (key, val) {
            if (window.customExpertConclusions) window.customExpertConclusions[key] = val;
        },
        deleteExpertConclusion: function (key) {
            if (window.customExpertConclusions) delete window.customExpertConclusions[key];
        }
    };
}

function _defectCauses() {
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getDefectCausesSync();
    }
    return typeof DEFECT_CAUSES !== 'undefined' ? DEFECT_CAUSES : [];
}

function _callAI(messages, options) {
    if (window.RBI && window.RBI.services && window.RBI.services.ai) {
        return window.RBI.services.ai.call(messages, options);
    }
    return window.callAI(messages, options);
}

function _syncConfig() {
    if (window.RBI && window.RBI.services && window.RBI.services.sync &&
        typeof window.RBI.services.sync.getConfig === 'function') {
        return window.RBI.services.sync.getConfig();
    }
    return window.syncConfig || {};
}

function _sync(mode) {
    var m = mode || 'silent';
    if (window.RBI && window.RBI.services && window.RBI.services.sync) {
        return window.RBI.services.sync.trigger(m);
    }
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
}

function _getTasks() {
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getTasksSync();
    }
    return typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : [];
}
function _getPractices() {
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getPracticesSync();
    }
    return typeof window.rbi_practicesData !== 'undefined' ? window.rbi_practicesData : [];
}

function _templates() {
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

export const AnalyticsActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    /**
     * Загрузить данные аналитики через analytics.service.js.
     * Эмитит 'analytics:loaded' после успешной загрузки.
     */
    async loadData() {
        try {
            const svc = this._ctx && this._ctx.analytics;
            if (!svc) {
                console.warn('[AnalyticsActions] analytics service недоступен');
                return;
            }
            const data = svc.getFilteredAnalyticsData();
            AnalyticsState.setDataSource(data || []);

            const events = this._ctx && this._ctx.events;
            if (events && typeof events.emit === 'function') {
                events.emit('analytics:loaded', { count: AnalyticsState.dataSource.length });
            }
        } catch (e) {
            console.error('[AnalyticsActions] ошибка загрузки данных:', e);
        }
    },

    /**
     * Переключить режим источника данных (local/cloud).
     */
    setMode(mode) {
        AnalyticsState.setMode(mode);
        const svc = this._ctx && this._ctx.analytics;
        if (svc && typeof svc.setAnalyticsMode === 'function') {
            svc.setAnalyticsMode(mode);
        }
    },

    /**
     * Обновить фильтры аналитики.
     */
    setFilters(filters) {
        AnalyticsState.setFilters(filters);
        const svc = this._ctx && this._ctx.analytics;
        if (svc && typeof svc.setAnalyticsFilters === 'function') {
            svc.setAnalyticsFilters(filters);
        }
    },

    /**
     * Сбросить все фильтры аналитики к пустым значениям.
     */
    resetFilters() {
        const empty = {
            project: [],
            contractor: [],
            inspector: [],
            template: [],
            period: null
        };
        AnalyticsState.setFilters(empty);
        const svc = this._ctx && this._ctx.analytics;
        if (svc && typeof svc.setAnalyticsFilters === 'function') {
            svc.setAnalyticsFilters(empty);
        }
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: единый выбор источника данных
    // для аналитики (было в js/analytics.js).
    // =========================================================================
    getAnalyticsDataSource(mode) {
        var _allInspections = _inspections();
        const arr = Array.isArray(_allInspections) ? _allInspections : [];

        if (mode === 'cloud') {
            return arr.filter(i =>
                i &&
                i._deleted !== true &&
                (
                    i.source === 'cloud' ||
                    i.syncStatus === 'synced' ||
                    i.sync_status === 'synced'
                )
            );
        }

        // Локальная аналитика показывает всё, что есть на устройстве,
        // кроме мягко удалённых записей.
        return arr.filter(i => i && i._deleted !== true);
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: фильтрация данных для всех
    // вкладок аналитики.
    // =========================================================================
    getFilteredAnalyticsData() {
        const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';

        const fProj = _analyticsFilters('analytics').project;
        const fContr = _analyticsFilters('analytics').contractor;
        const fInsp = _analyticsFilters('analytics').inspector;
        const fTmpl = _analyticsFilters('analytics').template;

        let arr = AnalyticsActions.getAnalyticsDataSource(_analyticsMode());
        const now = new Date();
        // Жёстко отсекаем проверки Стройконтроля из аналитики качества.
        arr = arr.filter(i => i.inspection_type !== 'sk_acceptance');

        if (selPeriod === 'DAY') {
            arr = arr.filter(i => new Date(i.date).toDateString() === now.toDateString());
        } else if (selPeriod === 'MONTH') {
            const m = new Date(); m.setDate(now.getDate() - 30);
            arr = arr.filter(i => new Date(i.date) >= m);
        } else if (selPeriod === 'WEEK') {
            const w = new Date(); w.setDate(now.getDate() - 7);
            arr = arr.filter(i => new Date(i.date) >= w);
        } else if (selPeriod === 'CUSTOM') {
            const dFrom = document.getElementById('filter-date-from')?.value;
            const dTo = document.getElementById('filter-date-to')?.value;
            if (dFrom) {
                const fDate = new Date(dFrom); fDate.setHours(0, 0, 0, 0);
                arr = arr.filter(i => new Date(i.date) >= fDate);
            }
            if (dTo) {
                const tDate = new Date(dTo); tDate.setHours(23, 59, 59, 999);
                arr = arr.filter(i => new Date(i.date) <= tDate);
            }
        }

        if (fProj.length > 0) {
            arr = arr.filter(i => {
                const p = i.project_display_name || i.projectName || i.project_canonical_key || '';
                return fProj.includes(p) || fProj.includes(i.project_canonical_key);
            });
        }
        if (fContr.length > 0) arr = arr.filter(i => fContr.includes(i.contractorName));
        if (fInsp.length > 0) arr = arr.filter(i => fInsp.includes(i.inspectorName));
        if (fTmpl.length > 0) arr = arr.filter(i => fTmpl.includes(i.templateTitle));

        return arr;
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: window.setAnalyticsDataMode.
    // =========================================================================
    setAnalyticsDataMode(mode) {
        window.analyticsDataMode = mode === 'cloud' ? 'cloud' : 'local';
        AnalyticsState.setMode(mode);
        if (typeof window.renderCurrentAnalyticsTab === 'function') window.renderCurrentAnalyticsTab();
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: единая функция переключения
    // подвкладок аналитики.
    // =========================================================================
    switchAnalyticsSubTab(tabId, btnElement) {
        AnalyticsState.setActiveSubTab(tabId);
        window.currentActiveAnalyticsTab = tabId;

        // Скрываем все секции
        document.querySelectorAll('.analytics-sub-section').forEach(el => el.classList.add('hidden'));

        // Сбрасываем стили всех кнопок
        document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn').forEach(el => {
            el.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
            el.classList.add('text-[var(--text-muted)]');
        });

        // Показываем нужную секцию
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.remove('hidden');

        // Красим активную кнопку
        if (btnElement) {
            btnElement.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
            btnElement.classList.remove('text-[var(--text-muted)]');
        }

        // Скрываем глобальные фильтры только для Истории и Графика. ПК СК их использует.
        const filtersBlock = document.getElementById('analytics-filters-block');
        if (tabId === 'sub-history' || tabId === 'sub-schedule') {
            if (filtersBlock) filtersBlock.style.display = 'none';
        } else {
            if (filtersBlock) filtersBlock.style.display = 'block';
        }

        // Обновляем кнопку FAB
        if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');

        // Единый безопасный рендер активной подвкладки аналитики.
        // ПК СК должен запускаться через renderCurrentAnalyticsTab(), т.к. там
        // sk_renderMainTab() вызывается гарантированно.
        if (typeof window.renderCurrentAnalyticsTab === 'function') {
            window.renderCurrentAnalyticsTab();
        }
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: переключатель произвольного
    // диапазона дат в фильтрах аналитики.
    // =========================================================================
    toggleDateRange() {
        const select = document.getElementById('global-filter-period');
        const period = select?.value;
        const label = document.getElementById('btn-ana-period-label');

        if (select && label) { label.querySelector('.truncate').innerText = select.options[select.selectedIndex].text; }

        const rangeBlock = document.getElementById('custom-date-range');
        if (!rangeBlock) return;

        if (period === 'CUSTOM') {
            rangeBlock.classList.remove('hidden'); rangeBlock.classList.add('grid');
        } else {
            rangeBlock.classList.add('hidden'); rangeBlock.classList.remove('grid');
        }
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: фильтрация списка подрядчиков
    // по чипсам.
    // =========================================================================
    filterContractorsList(filterType, btnElement) {
        window.currentContractorsFilter = filterType;

        // Сбрасываем стили всех чипсов
        const container = document.getElementById('contractors-chips-container');
        if (container) {
            container.querySelectorAll('.contr-chip').forEach(el => {
                el.className = "contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap transition-colors";
            });
        }

        // Красим активный чипс
        if (btnElement) {
            btnElement.className = "contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap transition-colors";
        }

        // Перерисовываем список
        if (typeof window.renderContractorsListOnly === 'function') {
            window.renderContractorsListOnly(AnalyticsActions.getFilteredAnalyticsData());
        }
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: управление трендами (линии
    // на графиках) — открытие модала выбора линий.
    // =========================================================================
    openChartFilterModal(type) {
        const data = AnalyticsActions.getFilteredAnalyticsData();
        const field = type === 'contrs' ? 'contractorName' : 'templateTitle';
        const title = type === 'contrs' ? 'Линии: Подрядчики' : 'Линии: Виды работ';

        const counts = {};
        data.forEach(i => { if (i[field]) counts[i[field]] = (counts[i[field]] || 0) + 1; });
        const uniqueItems = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

        const isAuto = window.selectedChartFilters[type].length === 0;

        let html = `<div class="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar mb-4 pr-1">`;
        html += `<label class="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl mb-3 font-bold cursor-pointer text-indigo-800 dark:text-indigo-300">
            <input type="checkbox" id="chart-filter-auto" class="w-5 h-5 accent-indigo-600" onchange="if(this.checked) document.querySelectorAll('.chart-filter-cb').forEach(cb => cb.checked = false)" ${isAuto ? 'checked' : ''}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Автовыбор (ТОП-5)
        </label>`;

        uniqueItems.forEach(item => {
            const isChecked = !isAuto && window.selectedChartFilters[type].includes(item);
            html += `<label class="flex items-center gap-3 p-3 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer border border-[var(--card-border)] transition-colors">
                <input type="checkbox" value="${item}" class="chart-filter-cb w-5 h-5 accent-indigo-600" ${isChecked ? 'checked' : ''} onchange="document.getElementById('chart-filter-auto').checked = false">
                <span class="text-[12px] truncate flex-1">${item}</span>
                <span class="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-bold">${counts[item]} шт</span>
            </label>`;
        });
        html += `</div>
        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold uppercase active:scale-95 border border-slate-200 dark:border-slate-700">Отмена</button>
            <button onclick="saveChartFilters('${type}')" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase shadow-md active:scale-95">Применить</button>
        </div>`;

        const modal = document.getElementById('modal-overlay');
        document.getElementById('modal-icon').innerHTML = '';
        document.getElementById('modal-title').innerHTML = `<div class="flex items-center gap-2"><svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg> ${title}</div>`;
        document.getElementById('modal-body').innerHTML = html;
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: сохранение выбранных линий графика.
    // =========================================================================
    saveChartFilters(type) {
        const isAuto = document.getElementById('chart-filter-auto').checked;
        if (isAuto) { window.selectedChartFilters[type] = []; }
        else {
            const checked = Array.from(document.querySelectorAll('.chart-filter-cb:checked')).map(cb => cb.value);
            if (checked.length === 0) return showToast('Выберите линии или включите Авто');
            window.selectedChartFilters[type] = checked;
        }
        closeModal(); AnalyticsActions.updateTrendCharts(type);
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: обновление трендовых графиков
    // без полной перерисовки вкладки.
    // =========================================================================
    updateTrendCharts(type, period) {
        if (period) window.trendGroupings[type] = period;
        const data = AnalyticsActions.getFilteredAnalyticsData();

        if (AnalyticsState.activeSubTab === 'sub-contractors') {
            if (type === 'contrs' && _chartInstances()['chart_eng_trend_contrs']) {
                _chartInstances()['chart_eng_trend_contrs'].data = window.buildTrendChartData(data, 'contractorName', window.selectedChartFilters.contrs, window.trendGroupings.contrs);
                _chartInstances()['chart_eng_trend_contrs'].update();
            }
            if (type === 'works' && _chartInstances()['chart_eng_trend_works']) {
                _chartInstances()['chart_eng_trend_works'].data = window.buildTrendChartData(data, 'templateTitle', window.selectedChartFilters.works, window.trendGroupings.works);
                _chartInstances()['chart_eng_trend_works'].update();
            }
        } else if (AnalyticsState.activeSubTab === 'sub-onepager') {
            if (type === 'global' && _chartInstances()['chart_onepager_trend']) {
                _chartInstances()['chart_onepager_trend'].data = window.buildTrendChartData(data, 'TOTAL', [], window.trendGroupings.global);
                _chartInstances()['chart_onepager_trend'].update();
            }
        }
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: логика ИИ заключений (PDCA).
    // =========================================================================
    editExpertText(expertKey, textAreaId) {
        window.currentEditingExpertKey = expertKey;
        window.currentEditingTextAreaId = textAreaId;
        const textArea = document.getElementById(textAreaId);
        const modalInput = document.getElementById('modal-expert-input');
        const overlay = document.getElementById('expert-modal-overlay');
        if (!textArea || !modalInput || !overlay) return;

        modalInput.value = textArea.value;
        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
    },

    cancelExpertEdit() {
        const overlay = document.getElementById('expert-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        window.currentEditingExpertKey = null; window.currentEditingTextAreaId = null;
    },

    resetExpertEdit() {
        if (!window.currentEditingExpertKey) return;
        if (confirm('Сбросить текст до оригинального заключения ИИ? Ваша редакция будет удалена.')) {
            _reports().deleteExpertConclusion(window.currentEditingExpertKey);
            AnalyticsActions.cancelExpertEdit(); scheduleSessionSave();
            if (window.currentDetailedContractor) {
                if (typeof window.showContractorDetailView === 'function') window.showContractorDetailView(window.currentDetailedContractor);
            } else if (typeof window.renderCurrentAnalyticsTab === 'function') {
                window.renderCurrentAnalyticsTab();
            }
            showToast('Текст сброшен к исходному');
        }
    },

    saveExpertEdit() {
        const modalInput = document.getElementById('modal-expert-input');
        if (!modalInput || !window.currentEditingExpertKey) return;
        const newText = modalInput.value.trim();
        if (newText === "") return showToast('Текст не может быть пустым!');

        _reports().setExpertConclusion(window.currentEditingExpertKey, newText);
        AnalyticsActions.cancelExpertEdit(); scheduleSessionSave();

        if (window.currentDetailedContractor) {
            if (typeof window.showContractorDetailView === 'function') window.showContractorDetailView(window.currentDetailedContractor);
        } else if (typeof window.renderCurrentAnalyticsTab === 'function') {
            window.renderCurrentAnalyticsTab();
        }
        showToast('Изменения сохранены!');
    },

    copyExpertText(btnId, textAreaId) {
        const textArea = document.getElementById(textAreaId);
        const btn = document.getElementById(btnId);
        if (!textArea || !btn) return;

        navigator.clipboard.writeText(textArea.value).then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '✅<span class="hidden min-[400px]:inline"> Скопировано</span>';
            btn.classList.add('bg-green-50', 'text-green-700', 'border-green-200');
            setTimeout(() => { btn.innerHTML = originalHtml; btn.classList.remove('bg-green-50', 'text-green-700', 'border-green-200'); }, 2000);
            showToast('Текст скопирован в буфер!');
            _gameLogAction('ai_copy', 'clipboard');
        }).catch(() => showToast('Ошибка копирования'));
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: глобальная функция вызова
    // «Магии TWI» из карточки дефекта аналитики.
    // =========================================================================
    createMagicTwi(checklistKey, itemId, photoGood, photoBad, title) {
        if (!window.RBI.services.knowledge.requireEditRight()) return;
        switchTab('tab-reference');
        setTimeout(() => {
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            if (btns[2]) switchReferenceSubTab('ref-sub-twi', btns[2]);

            window.RBI.services.knowledge.openTwiConstructor(); // Открываем пустой конструктор

            setTimeout(() => {
                document.getElementById('twi-title-input').value = title;
                document.getElementById('twi-checklist-select').value = checklistKey;

                // Запускаем перерисовку селектора пунктов
                window.RBI.services.knowledge.populateTwiItemSelect(itemId);

                window.RBI.services.knowledge.changeTwiType('INSPECTOR');

                // Вставляем фото
                window.RBI.services.knowledge.renderGoodPhoto(photoGood);
                window.RBI.services.knowledge.renderBadPhoto(photoBad);

                showToast('✨ Магия сработала! Допишите текст и сохраните.');
            }, 300);
        }, 100);
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: управление архивом отчётов
    // (вкладка История → Отчёты).
    // =========================================================================
    switchHistoryView(view) {
        const btnChecks = document.getElementById('btn-hist-checks');
        const btnReports = document.getElementById('btn-hist-reports');
        const viewChecks = document.getElementById('history-checks-view');
        const viewReports = document.getElementById('history-reports-view');
        const actionsRow = document.getElementById('hist-checks-actions-row');

        const actClass = "px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all duration-300 bg-white dark:bg-slate-800 text-indigo-600 shadow-sm";
        const inactClass = "px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all duration-300 text-slate-500 dark:text-slate-400";

        // Сохраняем стейт в глобальную переменную, чтобы фильтры понимали, что перерисовывать
        window.currentHistoryViewMode = view;

        if (view === 'checks') {
            btnChecks.className = actClass;
            btnReports.className = inactClass;
            viewChecks.classList.remove('hidden');
            viewReports.classList.add('hidden');
            if (actionsRow) actionsRow.style.display = 'flex'; // Показываем чекбоксы (С фото, С B3 и тд)
            renderHistoryTab();
        } else {
            btnReports.className = actClass;
            btnChecks.className = inactClass;
            viewChecks.classList.add('hidden');
            viewReports.classList.remove('hidden');
            if (actionsRow) actionsRow.style.display = 'none'; // Скрываем чекбоксы, они не нужны отчетам
            if (typeof window.renderReportsList === 'function') window.renderReportsList();
        }
    },

    async openReport(id) {
        const r = _reports().getAllSync().find(x => x.id === id);
        if (!r) return showToast('Файл отчета не найден');

        // 1. ПРИОРИТЕТ 1: Файл физически кэширован в браузере (Blob)
        if (r.file_blob) {
            const url = URL.createObjectURL(r.file_blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 5000); // Даем время на открытие
            return;
        }

        // 2. ПРИОРИТЕТ 2: Файла локально нет (очистили кэш), пытаемся скачать по ссылке и сохранить
        if (r.file_url && r.file_url.startsWith('http')) {
            if (!navigator.onLine) {
                return showToast('❌ Отчет не кэширован на устройстве. Нужен интернет для скачивания.');
            }
            showToast('⏳ Скачиваем файл из облака в память...');
            try {
                const response = await fetch(r.file_url);
                if (!response.ok) throw new Error("Не удалось скачать файл");
                const blob = await response.blob();

                // Сохраняем в кэш навсегда
                r.file_blob = blob;
                await _storage().put(_storage().stores().REPORTS, r);

                // Открываем
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                return;
            } catch (e) {
                console.error("Ошибка скачивания отчета", e);
                // ПРИОРИТЕТ 3 (Фолбэк): Просто открываем ссылку в новой вкладке
                window.open(r.file_url, '_blank');
                return;
            }
        }

        showToast('❌ Ошибка: Файл отчета пуст или поврежден.');
    },

    async shareReport(id) {
        const r = _reports().getAllSync().find(x => x.id === id);
        if (!r) return showToast('Файл отчета не найден');

        try {
            let fileToShare = null;

            // Если файл есть локально
            if (r.file_blob) {
                fileToShare = new File([r.file_blob], r.title + '.pdf', { type: 'application/pdf' });
            }
            // Если файла локально нет, но есть ссылка (прилетел из облака)
            else if (r.file_url && r.file_url.startsWith('http')) {
                showToast('⏳ Скачиваем файл из облака для отправки...');
                const response = await fetch(r.file_url);
                if (!response.ok) throw new Error("Не удалось скачать файл");
                const blob = await response.blob();
                fileToShare = new File([blob], r.title + '.pdf', { type: 'application/pdf' });
            }

            if (!fileToShare) return showToast('❌ Не удалось подготовить файл к отправке');

            // Отправка через системное меню Share
            if (navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
                await navigator.share({
                    title: r.title,
                    text: 'Отчет: ' + r.title,
                    files: [fileToShare]
                });
            } else {
                // Резервный вариант для ПК (просто скачивание)
                const url = URL.createObjectURL(fileToShare);
                const a = document.createElement('a');
                a.href = url;
                a.download = r.title + '.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('✅ Файл сохранен на устройство');
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("Ошибка при отправке файла:", e);
                showToast('❌ Ошибка при отправке файла');
            }
        }
    },

    async deleteReport(id) {
        const record = _reports().getAllSync().find(x => x.id === id);

        // Проверяем права: удалить может либо автор, либо Админ/Зам
        const currentEngineer = _getSetting('engineerName') || 'Инженер';
        const role = window.RBI.services.permissions ? window.RBI.services.permissions.getCurrentRole() : 'guest';
        const isManager = window.RBI.services.permissions ? window.RBI.services.permissions.isAdmin() : ['manager', 'deputy_manager'].includes(role);

        if (record.created_by && record.created_by !== currentEngineer && !isManager) {
            return showToast("⚠️ Вы можете удалять только свои отчеты!");
        }

        if (!confirm('Удалить этот отчет?')) return;

        const idx = _reports().getAllSync().findIndex(x => x.id === id);
        if (idx > -1) {
            // Ставим железобетонные метки удаления
            _reports().getAllSync()[idx].is_deleted = true;
            _reports().getAllSync()[idx]._deleted = true;
            _reports().getAllSync()[idx]._deletedAt = new Date().toISOString();
            _reports().getAllSync()[idx].deleted_at = _reports().getAllSync()[idx]._deletedAt;

            _reports().getAllSync()[idx].updated_at = new Date().toISOString();
            _reports().getAllSync()[idx].updatedAt = _reports().getAllSync()[idx].updated_at;

            // Возвращаем статус в not_synced, чтобы облако увидело изменение
            _reports().getAllSync()[idx].source = 'local';
            _reports().getAllSync()[idx].sync_status = 'not_synced';
            _reports().getAllSync()[idx].syncStatus = 'not_synced';

            await _storage().put(_storage().stores().REPORTS, _reports().getAllSync()[idx]); // Мягкое удаление локально
        }

        // Мутация массива на месте (не переприсваивание) — сохраняет живую
        // ссылку, на которую полагаются app.js/ReportsState.getReports()/export.js.
        var _filtered = _reports().getAllSync().filter(x => !x.is_deleted && !x._deleted);
        _reports().getAllSync().length = 0;
        Array.prototype.push.apply(_reports().getAllSync(), _filtered);

        if (typeof window.renderReportsList === 'function') window.renderReportsList();

        // Команда синхронизатору
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
    },

    toggleAllReports(checkbox) {
        const checkboxes = document.querySelectorAll('.report-checkbox');
        checkboxes.forEach(cb => cb.checked = checkbox.checked);
    },

    async deleteSelectedReports() {
        const checkboxes = document.querySelectorAll('.report-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => cb.value);

        if (ids.length === 0) return showToast('Выберите отчеты для удаления');
        if (!confirm(`Удалить выбранные отчеты (${ids.length} шт)?`)) return;

        for (let id of ids) {
            const record = _reports().getAllSync().find(x => x.id === id);
            if (record) {
                record.is_deleted = true;
                record._deleted = true;
                record._deletedAt = new Date().toISOString();
                record.updated_at = new Date().toISOString();
                record.updatedAt = record.updated_at;
                record.source = 'local';
                record.sync_status = 'not_synced';
                record.syncStatus = 'not_synced';

                await _storage().put(_storage().stores().REPORTS, record);
            }
        }

        // Мутация массива на месте (не переприсваивание) — см. deleteReport().
        var _filtered = _reports().getAllSync().filter(x => !x.is_deleted && !x._deleted);
        _reports().getAllSync().length = 0;
        Array.prototype.push.apply(_reports().getAllSync(), _filtered);

        document.getElementById('reports-select-all').checked = false;
        if (typeof window.renderReportsList === 'function') window.renderReportsList();

        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');

        showToast(`✅ Удалено отчетов: ${ids.length}`);
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: консолидированный отчёт ко
    // Дню Качества (настройки периода + генерация PDF через DeepSeek AI).
    // =========================================================================
    rbi_openQualityDaySettings(taskId) {
        const modal = document.getElementById('modal-overlay');
        document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200">📅</div>`;
        document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Настройки Отчета</div>`;

        document.getElementById('modal-body').innerHTML = `
            <div class="text-center text-[12px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Выберите период для формирования Мега-Отчета. Система агрегирует метрики всех подрядчиков, выберет лучшие практики и запросит ИИ-резюме.
            </div>
            
            <div class="mb-6">
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Отчетный период</label>
                <select id="qday-period-select" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none">
                    <option value="current_month">За текущий месяц</option>
                    <option value="last_month">За прошлый месяц</option>
                    <option value="quarter">За последние 3 месяца (Квартал)</option>
                    <option value="all_time">За всё время</option>
                </select>
            </div>

            <div class="flex gap-2">
                <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm">
                    Отмена
                </button>
                <button onclick="closeModal(); rbi_executeQualityDayReport('${taskId}')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">
                    🚀 Сгенерировать
                </button>
            </div>
        `;

        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    },

    async rbi_executeQualityDayReport(taskId) {
        var _allInspections = _inspections();
        if (!_getSetting('aiEnabled')) {
            return showToast("⚠️ Для формирования отчета требуется включить DeepSeek AI в настройках!");
        }

        const periodValue = document.getElementById('qday-period-select').value;

        // Показываем лоадер
        const modal = document.getElementById('modal-overlay');
        document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200 animate-pulse">🤖</div>`;
        document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Сборка Дня Качества</div>`;
        document.getElementById('modal-body').innerHTML = `
            <div class="flex flex-col items-center justify-center py-4">
                <div class="text-[11px] font-bold text-slate-500 text-center space-y-2">
                    <div>📥 Агрегируем метрики подрядчиков...</div>
                    <div>📊 Рассчитываем Impact Score команды...</div>
                    <div>🏆 Выбираем лучшие практики...</div>
                    <div class="text-indigo-600 font-black mt-2">DeepSeek пишет управленческое резюме...</div>
                </div>
            </div>
        `;
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';

        try {
            const now = new Date();
            let startDate, endDate;
            let periodTitle = "";

            if (periodValue === 'current_month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                periodTitle = `ИТОГИ: ${now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}`;
            } else if (periodValue === 'last_month') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                periodTitle = `ИТОГИ: ${startDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}`;
            } else if (periodValue === 'quarter') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                endDate = new Date();
                periodTitle = `КВАРТАЛЬНЫЙ ОТЧЕТ`;
            } else {
                startDate = new Date(2000, 1, 1);
                endDate = new Date();
                periodTitle = `ОТЧЕТ ЗА ВСЁ ВРЕМЯ`;
            }

            // 1. БАЗА ПРОВЕРОК
            const currentData = _allInspections.filter(c => new Date(c.date) >= startDate && new Date(c.date) <= endDate);

            if (currentData.length === 0) {
                closeModal();
                return showToast("⚠️ За выбранный период нет данных для отчета!");
            }

            let sumUrk = 0; currentData.forEach(i => { if (i.metrics) sumUrk += Number(i.metrics.final) || 0; });
            const currAvgUrk = Math.round(sumUrk / currentData.length);

            const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(currentData, _templates().getUserTemplates()) : null;
            const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
            const redZone = currIntMetrics ? currIntMetrics.redZonePerc : 0;

            // 2. HR МЕТРИКИ (КОМАНДА)
            let hrStats = window.RBI.services.game.calculateManagerMetrics();
            let totalImpact = 0;
            hrStats.forEach(h => { totalImpact += h.avgImpact; });
            const avgTeamImpact = hrStats.length > 0 ? (totalImpact / hrStats.length) : 0;
            const bestEng = hrStats.length > 0 ? hrStats.sort((a, b) => b.pi - a.pi)[0] : { name: "Нет данных", checks: 0 };

            // 3. ТОП ПРАКТИК
            let topPracticesHtml = `<div style="color:#64748b; font-size:10px;">Практик в этом периоде не публиковалось.</div>`;
            if (Array.isArray(_getPractices()) && _getPractices().length > 0) {
                const topPrac = [..._getPractices()].filter(p => new Date(p.date) >= startDate && new Date(p.date) <= endDate).sort((a, b) => b.deltaUrk - a.deltaUrk).slice(0, 2);
                if (topPrac.length > 0) {
                    topPracticesHtml = topPrac.map(p => `
                        <div style="border:1px solid #cbd5e1; border-left:4px solid #16a34a; padding:10px; border-radius:6px; margin-bottom:10px; background:white; page-break-inside: avoid;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <strong style="font-size:12px; color:#0f172a;">${p.title}</strong>
                                <span style="color:#16a34a; font-weight:900;">+${p.deltaUrk}% УрК</span>
                            </div>
                            <div style="font-size:10px; color:#64748b; margin-bottom:5px;">Автор: ${p.author} | ${p.templateTitle}</div>
                            <table style="width:100%; border-collapse:collapse; font-size:10px;">
                                <tr>
                                    <td style="width:50%; vertical-align:top; padding-right:5px;">
                                        <div style="color:#dc2626; font-weight:bold; margin-bottom:2px;">❌ Проблема:</div>
                                        <div style="color:#1e293b;">${p.problem}</div>
                                    </td>
                                    <td style="width:50%; vertical-align:top; padding-left:5px;">
                                        <div style="color:#16a34a; font-weight:bold; margin-bottom:2px;">✅ Решение:</div>
                                        <div style="color:#1e293b;">${p.solution}</div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    `).join('');
                }
            }

            // 4. КОРЕННЫЕ ПРИЧИНЫ (Парето)
            const causes = {};
            currentData.forEach(c => {
                if (c.state && c.details) {
                    Object.keys(c.state).forEach(id => {
                        if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                            const code = c.details[id]?.causeCode || 'C00';
                            causes[code] = (causes[code] || 0) + 1;
                        }
                    });
                }
            });

            let causesHtml = '';
            const sortedCauses = Object.keys(causes).sort((a, b) => causes[b] - causes[a]).slice(0, 5);
            if (sortedCauses.length > 0) {
                causesHtml = sortedCauses.map(code => {
                    const cName = (_defectCauses().find(x => x.code === code)?.name) || 'Иное';
                    return `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:6px 0; font-size:11px;">
                        <span style="color:#334155;">${cName}</span>
                        <span style="font-weight:bold; color:#0f172a;">${causes[code]} шт.</span>
                    </div>`;
                }).join('');
            } else {
                causesHtml = `<div style="color:#64748b; font-size:10px;">Дефектов не выявлено.</div>`;
            }

            // 5. DEEPSEEK - АНАЛИЗ ДЛЯ РЕЗЮМЕ
            const promptSystem = `Ты — Директор по качеству (CQC). Сформируй официальное управленческое резюме для отчета "День Качества" за выбранный период.
            Тон: деловой, объективный, строгий. Формат: текст, разбитый на абзацы. Без воды.
            Отрази 3 вещи: 1. Оценку ИКО и тренда. 2. Оценку работы инженеров (Impact Score). 3. Главный риск следующего периода.`;

            const promptUser = `ИКО: ${IKO}. Красная зона: ${redZone}%. Средний Impact команды: ${avgTeamImpact.toFixed(2)}. Проверок за период: ${currentData.length}. ТОП проблема: ${sortedCauses.length > 0 ? sortedCauses[0] : 'Нет данных'}.`;

            const aiSummary = await _callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 800 });

            closeModal();

            // 6. СБОРКА HTML ДЛЯ ПЕЧАТИ
            const pdfContent = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="font-size: 24pt; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">КОНСОЛИДИРОВАННЫЙ ОТЧЕТ КО ДНЮ КАЧЕСТВА</h1>
                    <div style="font-size: 14pt; color: #4f46e5; font-weight: 900; margin-top: 5px; text-transform:uppercase;">${periodTitle}</div>
                </div>

                <!-- БЛОК 1: AI-РЕЗЮМЕ -->
                <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 14pt; text-transform: uppercase;">🧠 УПРАВЛЕНЧЕСКОЕ РЕЗЮМЕ (DEEPSEEK AI)</h2>
                    <div style="font-size: 11pt; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-weight: 500;">${aiSummary}</div>
                </div>

                <!-- БЛОК 2: МАКРОПОКАЗАТЕЛИ -->
                <table style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                    <tr>
                        <td style="background:#f8fafc; border:2px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                            <div style="font-size:9pt; color:#64748b; text-transform:uppercase; font-weight:bold;">Индекс Риска (ИКО)</div>
                            <div style="font-size:28pt; font-weight:900; color:${parseFloat(IKO) >= 0.6 ? '#dc2626' : '#16a34a'};">${IKO}</div>
                        </td>
                        <td style="background:#fef2f2; border:2px solid #fca5a5; border-radius:12px; padding:15px; text-align:center;">
                            <div style="font-size:9pt; color:#991b1b; text-transform:uppercase; font-weight:bold;">Объем Красной Зоны</div>
                            <div style="font-size:28pt; font-weight:900; color:#dc2626;">${redZone}%</div>
                        </td>
                        <td style="background:#f0fdf4; border:2px solid #bbf7d0; border-radius:12px; padding:15px; text-align:center;">
                            <div style="font-size:9pt; color:#166534; text-transform:uppercase; font-weight:bold;">Impact Score Команды</div>
                            <div style="font-size:28pt; font-weight:900; color:#16a34a;">${avgTeamImpact > 0 ? '+' : ''}${avgTeamImpact.toFixed(2)}</div>
                        </td>
                    </tr>
                </table>

                <div style="page-break-before: always;"></div>

                <!-- БЛОК 3: ПРАКТИКИ И ПРИЧИНЫ -->
                <table style="width: 100%; border-spacing: 20px 0; border-collapse: separate; table-layout: fixed; margin-left: -20px; margin-bottom: 20px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">🏆 Лучшие практики периода</h2>
                            ${topPracticesHtml}
                        </td>
                        <td style="width: 50%; vertical-align: top;">
                            <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">🔍 Топ причин брака (Парето)</h2>
                            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px;">
                                ${causesHtml}
                            </div>
                            
                            <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 25px; margin-bottom: 15px;">👤 Рейтинг Инженеров</h2>
                            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px;">
                                <div style="font-size: 11pt; font-weight: bold; color: #1e293b; margin-bottom: 5px;">Лучший по Опыту (XP): <span style="color:#4f46e5;">${bestEng.name}</span></div>
                                <div style="font-size: 9pt; color: #64748b;">Проверок: ${bestEng.checks} | Строгость: ${bestEng.strictness > 0 ? '+' + bestEng.strictness.toFixed(1) : bestEng.strictness?.toFixed(1)}</div>
                            </div>
                        </td>
                    </tr>
                </table>
            `;

            // Закрываем задачу в планировщике, так как отчет сформирован
            if (taskId) {
                const task = _getTasks().find(t => t.id === taskId);
                if (task) {
                    task.status = 'done';
                    task.resultComment = 'Отчет сгенерирован';
                    await _storage().put(_storage().stores().TASKS, task);
                    rbi_renderTasksList(); // Обновляем списки задач на экране
                }
            }

            // Запускаем печать. Передаем "browser", чтобы открылось системное окно печати/сохранения PDF
            printPdfShell(`День Качества`, pdfContent, "A4", "landscape", "browser");

        } catch (e) {
            closeModal();
            showToast("❌ Ошибка сборки отчета: " + e.message);
        }
    }
};

if (typeof window !== 'undefined') {
    window.AnalyticsActions = AnalyticsActions;

    // =========================================================================
    // WINDOW-ПРОКСИ (обратная совместимость: index.html inline-обработчики,
    // динамически генерируемый HTML — onclick в строках, генерируемых
    // analytics.render.js — и вызовы из js/export.js/js/ai.js/js/sync.js).
    // =========================================================================
    window.getAnalyticsDataSource = AnalyticsActions.getAnalyticsDataSource.bind(AnalyticsActions);
    window.getFilteredAnalyticsData = AnalyticsActions.getFilteredAnalyticsData.bind(AnalyticsActions);
    window.setAnalyticsDataMode = AnalyticsActions.setAnalyticsDataMode.bind(AnalyticsActions);
    window.switchAnalyticsSubTab = AnalyticsActions.switchAnalyticsSubTab.bind(AnalyticsActions);
    window.toggleDateRange = AnalyticsActions.toggleDateRange.bind(AnalyticsActions);
    window.filterContractorsList = AnalyticsActions.filterContractorsList.bind(AnalyticsActions);
    window.openChartFilterModal = AnalyticsActions.openChartFilterModal.bind(AnalyticsActions);
    window.saveChartFilters = AnalyticsActions.saveChartFilters.bind(AnalyticsActions);
    window.updateTrendCharts = AnalyticsActions.updateTrendCharts.bind(AnalyticsActions);
    window.editExpertText = AnalyticsActions.editExpertText.bind(AnalyticsActions);
    window.cancelExpertEdit = AnalyticsActions.cancelExpertEdit.bind(AnalyticsActions);
    window.resetExpertEdit = AnalyticsActions.resetExpertEdit.bind(AnalyticsActions);
    window.saveExpertEdit = AnalyticsActions.saveExpertEdit.bind(AnalyticsActions);
    window.copyExpertText = AnalyticsActions.copyExpertText.bind(AnalyticsActions);
    window.createMagicTwi = AnalyticsActions.createMagicTwi.bind(AnalyticsActions);
    window.switchHistoryView = AnalyticsActions.switchHistoryView.bind(AnalyticsActions);
    window.openReport = AnalyticsActions.openReport.bind(AnalyticsActions);
    window.shareReport = AnalyticsActions.shareReport.bind(AnalyticsActions);
    window.deleteReport = AnalyticsActions.deleteReport.bind(AnalyticsActions);
    window.toggleAllReports = AnalyticsActions.toggleAllReports.bind(AnalyticsActions);
    window.deleteSelectedReports = AnalyticsActions.deleteSelectedReports.bind(AnalyticsActions);
    window.rbi_openQualityDaySettings = AnalyticsActions.rbi_openQualityDaySettings.bind(AnalyticsActions);
    window.rbi_executeQualityDayReport = AnalyticsActions.rbi_executeQualityDayReport.bind(AnalyticsActions);
}

// =========================================================================
// РАЗМЕТКА МОДАЛКИ «expert-modal-overlay» (перенос из index.html:1144-1222,
// перенос 30 modal/overlay-блоков #app-modals в JS-рендер). HTML-строка 1:1
// идентична прежней статичной разметке.
// =========================================================================
function renderExpertModalOverlayMarkup() {
    return `
    <div id="expert-modal-overlay"
        class="fixed inset-0 bg-slate-900/70 z-[1600] hidden items-center justify-center p-4 backdrop-blur-sm"
        data-analytics-action="cancelExpertEdit">
        <div class="bg-[var(--card-bg)] w-full max-w-2xl p-6 rounded-2xl shadow-2xl transition-transform"
            id="expert-modal-content" onclick="event.stopPropagation()">
            <div
                class="flex justify-between items-center mb-4 border-b border-[var(--card-border)] pb-3 text-slate-800 dark:text-white">
                <h3 class="font-black text-[13px] uppercase tracking-tight flex items-center gap-2">
                    <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z">
                        </path>
                    </svg>
                    Редактировать заключение
                </h3>
                <div class="w-8 h-8 bg-[var(--hover-bg)] rounded-full flex items-center justify-center cursor-pointer text-slate-500"
                    data-analytics-action="cancelExpertEdit"><svg class="w-4 h-4" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                    </svg></div>
            </div>
            <!-- КНОПКИ ГЕНЕРАТОРА СЦЕНАРИЕВ -->
            <div class="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-2 border-b border-[var(--card-border)]">
                <button data-action="generateSmartComment" data-action-arg="standard"
                    class="shrink-0 flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 active:scale-95"><svg
                        class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
                        </path>
                    </svg> Базовый</button>
                <button data-action="generateSmartComment" data-action-arg="strict"
                    class="shrink-0 flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 active:scale-95"><svg
                        class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg> Претензия</button>
                <button data-action="generateSmartComment" data-action-arg="tech"
                    class="shrink-0 flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 active:scale-95"><svg
                        class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z">
                        </path>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z">
                        </path>
                    </svg> Тех.аудит</button>
                <button data-action="generateSmartComment" data-action-arg="boss"
                    class="shrink-0 flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400 active:scale-95"><svg
                        class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
                        </path>
                    </svg> Руководству</button>
                <button data-action="generateSmartComment" data-action-arg="action_plan"
                    class="shrink-0 flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 active:scale-95"><svg
                        class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01">
                        </path>
                    </svg> План действий</button>
                <button data-action="generateSmartComment" data-action-arg="improve"
                    class="shrink-0 flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400 active:scale-95"><svg
                        class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z">
                        </path>
                    </svg> ✨ Улучшить мой текст</button>
            </div>
            <textarea id="modal-expert-input"
                class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-4 text-[12px] outline-none h-[50vh] resize-none text-slate-800 dark:text-slate-200"></textarea>
            <div class="flex gap-2 mt-4">
                <button data-analytics-action="resetExpertEdit"
                    class="bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 px-4 py-3.5 rounded-xl font-bold text-[10px] uppercase active:scale-95">Сброс
                    к ИИ</button>
                <button data-analytics-action="saveExpertEdit"
                    class="flex-1 bg-indigo-600 text-white px-4 py-3.5 rounded-xl font-bold text-[11px] uppercase shadow-md active:scale-95">Сохранить
                    правки</button>
            </div>
        </div>
    </div>
`;
}

(function mountExpertModalOverlayMarkup() {
    if (document.getElementById('expert-modal-overlay')) return;
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals');
    if (!root) return;
    root.insertAdjacentHTML('beforeend', renderExpertModalOverlayMarkup());
}());

console.log('[AnalyticsActions] analytics.actions.js loaded (owner-module: full business logic)');
