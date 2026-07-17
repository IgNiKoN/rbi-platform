/**
 * analytics.render.js
 * Рендер-диспетчер модуля Analytics.
 *
 * Фаза N (перенесено из analytics.legacy.js): реальная HTML-генерация
 * дашбордов, фильтров, детального вида подрядчика, тренд-графиков
 * (Chart.js), TWI-карт, фотогалерей, Quality Day отчёта, архива отчётов.
 * Источник данных — AnalyticsState.* там, где состояние изолировано, и
 * window.* там, где состояние остаётся в app.js/templates.js.
 */

import { AnalyticsState } from './analytics.state.js';

function _getSetting(key) {
    return window.RBI.services.settings.get(key);
}

function _analyticsMode() {
    if (window.AnalyticsState) return window.AnalyticsState.mode;
    return window.analyticsDataMode || 'local';
}

// Инкрементальный кэш метрик подрядчика (contractor-metrics.service.js) —
// избегает пересчёта getContractorMetrics() по всей группе при каждом рендере
// вкладок «Подрядчики»/«Сводка». cData — уже сгруппированный по groupKey массив
// записей ("подрядчик [объект]", тот же ключ, что использует сервис); если
// переданный массив cData реально совпадает с группой в кэше — читаем готовое
// значение, иначе (нестандартная группировка — например detail-view с фильтром
// по периоду) считаем напрямую через getContractorMetrics, не трогая сервис.
function _contractorMetricsCached(groupKey, cData) {
    var svc = window.RBI && window.RBI.services && window.RBI.services.contractorMetrics;
    if (svc) {
        var cached = svc.getMetricsForGroup(groupKey);
        if (cached) return cached;
    }
    return getContractorMetrics(cData, _templates().getUserTemplates());
}

function _getSkRecords() {
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getRecordsSync();
    }
    return Array.isArray(window.skRecords) ? window.skRecords : [];
}
function _getSkContractorMap() {
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getContractorMapSync();
    }
    return window.skContractorMap || {};
}

function _chartInstances() {
    if (window.AnalyticsState) return window.AnalyticsState.chartInstances;
    if (typeof window.chartInstances !== 'undefined') return window.chartInstances;
    return {};
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

function _getSystemTemplates() {
    return _templates().getSystemTemplates();
}

// Градиентная раскраска УрК: непрерывный переход цвета внутри каждой из 3 зон риска
// (0-69 красный..бордовый, 70-84 жёлтый/янтарный, 85-100 зелёный..тёмно-зелёный),
// с более тёмным/насыщенным цветом на краях диапазона (0 — бордовый, 100 — темно-зелёный).
// Используется вместо плоских text-red-600/text-orange-500/text-green-600 там, где
// нужна быстрая визуальная оценка "на глаз" (карточки подрядчиков).
function _urkGradientColor(val) {
    const v = Math.max(0, Math.min(100, Number(val) || 0));
    const stops = [
        { p: 0, c: [127, 29, 29] },   // бордовый (красный-900)
        { p: 69, c: [220, 38, 38] },  // красный-600
        { p: 70, c: [217, 119, 6] },  // янтарный-600
        { p: 84, c: [245, 158, 11] }, // янтарный-500
        { p: 85, c: [34, 197, 94] },  // зелёный-500
        { p: 100, c: [20, 83, 45] }   // темно-зелёный (зелёный-900)
    ];
    for (let i = 0; i < stops.length - 1; i++) {
        if (v >= stops[i].p && v <= stops[i + 1].p) {
            const range = stops[i + 1].p - stops[i].p || 1;
            const t = (v - stops[i].p) / range;
            const c = stops[i].c.map((ch, idx) => Math.round(ch + t * (stops[i + 1].c[idx] - ch)));
            return `rgb(${c[0]},${c[1]},${c[2]})`;
        }
    }
    return `rgb(${stops[stops.length - 1].c.join(',')})`;
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

// inline onclick в карточке объекта («Показатели по объектам») не может звать
// локальную функцию модуля напрямую — маленькая window.*-обёртка, вызывающая сервис.
function rbi_setAnalyticsProjectFilter(name) {
    if (window.RBI && window.RBI.services && window.RBI.services.analytics) {
        window.RBI.services.analytics.setAnalyticsFilters({ project: [name] });
    } else if (window.activeMultiFilters && window.activeMultiFilters.analytics) {
        window.activeMultiFilters.analytics.project = [name];
    }
}
if (typeof window !== 'undefined') window.rbi_setAnalyticsProjectFilter = rbi_setAnalyticsProjectFilter;

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

function _reports() {
    if (AnalyticsRender._ctx && AnalyticsRender._ctx.reports) {
        return AnalyticsRender._ctx.reports;
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
        }
    };
}

function _defectCauses() {
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getDefectCausesSync();
    }
    return typeof DEFECT_CAUSES !== 'undefined' ? DEFECT_CAUSES : [];
}

function _syncConfig() {
    if (window.RBI && window.RBI.services && window.RBI.services.sync &&
        typeof window.RBI.services.sync.getConfig === 'function') {
        return window.RBI.services.sync.getConfig();
    }
    return window.syncConfig || {};
}

// Перенесено из analytics.legacy.js: модульная переменная фотогалерей
// (аналог window._AUDIT_DEFECT_CAUSES из audit.render.js) — с зеркалом
// window.rbiPhotoGalleries для обратной совместимости.
var rbiPhotoGalleries = {};
if (typeof window !== 'undefined') window.rbiPhotoGalleries = rbiPhotoGalleries;

// Перенесено из app.js 1:1 (текстуально идентична приватной копии в
// history.render.js:15) — приватная, module-scope, НЕ на window.*, по
// образцу history.render.js (не плодит второй глобальный window.getSyncBadgeHtml).
// Генерирует SVG-бейдж статуса синхронизации для карточки отчёта в архиве.
function getSyncBadgeHtml(item) {
    const source = item.source || '';
    const syncStatus = item.syncStatus || item.sync_status || '';

    // Заготовки SVG иконок
    const iconLocal = `<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"></path></svg>`;
    const iconCloud = `<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"></path></svg>`;
    const iconBlocked = `<svg class="w-2.5 h-2.5 inline-block mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

    if (syncStatus === 'blocked') {
        const reason = item.syncBlockReason || item.sync_block_reason || 'Отправка запрещена';
        return `<button onclick="event.stopPropagation(); showToast('Причина: ${String(reason).replace(/'/g, "\\'")}')" class="px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">${iconBlocked}Заблок.</button>`;
    }
    if (source === 'cloud' || syncStatus === 'synced') {
        return `<span class="px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">${iconCloud}</span>`;
    }
    return `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-[7px] font-bold uppercase ml-1 flex items-center shadow-sm">${iconLocal}</span>`;
}

// Документарный УрК записи (Два индекса УрК — физика и документация, Шаг 3).
// Старые записи без сохранённого item.metrics.documentary — досчитываем "на лету"
// по item.state и актуальному чек-листу (та же lazy recalculation, что в
// getContractorMetrics()/history.render.js), без изменения хранимых данных.
function _getDocumentaryScoreForItem(item) {
    if (!item.metrics) return null;
    if (item.metrics.documentary !== undefined) return item.metrics.documentary;
    if (typeof window.getDocumentaryScore !== 'function' || !item.state || !item.templateKey) return null;
    const type = item.templateKey.split('_')[0];
    const key = item.templateKey.replace(type + '_', '');
    const checklist = type === 'sys' && _getSystemTemplates()[key] ? _getSystemTemplates()[key].groups : (_templates().getUserTemplates()[key] ? _templates().getUserTemplates()[key].groups : []);
    const flatList = getFlatList(checklist);
    return window.getDocumentaryScore(item.state, flatList);
}

function getFilteredAnalyticsData() {
    if (window.AnalyticsActions && typeof window.AnalyticsActions.getFilteredAnalyticsData === 'function') {
        return window.AnalyticsActions.getFilteredAnalyticsData();
    }
    return typeof window.getFilteredAnalyticsData === 'function' ? window.getFilteredAnalyticsData() : [];
}

export const AnalyticsRender = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    // =====================================================================
    // РАЗМЕТКА ВКЛАДКИ «АНАЛИТИКА» (перенос из index.html:619-974, JS-
    // рендер). Возвращает HTML-строку 1:1 идентичную прежней статичной
    // разметке #tab-analytics: блок подвкладок, глобальные фильтры и 5
    // контейнеров подвкладок (Подрядчики/Сводка/График/ПК СК/История).
    // Заполнение контейнеров — задача существующих функций заполнения
    // (renderContractorsSubTab и т.д.), не этой функции.
    // =====================================================================
    renderMarkup() {
        return `
        <div id="tab-analytics" class="view-section">

            <!-- БЛОК ПОДВКЛАДОК (Прыгает вниз на смартфонах, прилипает наверх на ПК) -->
            <!-- БЛОК ПОДВКЛАДОК (Исправлены отступы) -->
            <!-- БЛОК ПОДВКЛАДОК (Прыгает вниз на смартфонах, прилипает наверх на ПК) -->
            <div id="analytics-subtabs-block" class="z-[45] transition-all duration-300 w-full max-w-4xl mx-auto py-2">
                <div
                    class="flex gap-1 p-1 bg-[var(--card-border)]/80 backdrop-blur-md rounded-xl overflow-x-auto no-scrollbar whitespace-nowrap text-center shadow-sm border border-[var(--card-border)] mx-1">
                    <button data-analytics-action="switchAnalyticsSubTab" data-action-arg="sub-contractors" data-analytics-action-arg2-type="element"
                        class="sub-tab-btn flex-1 min-w-[80px] py-2 text-[10px] font-bold uppercase rounded-md bg-white shadow-sm text-indigo-600 flex flex-col items-center gap-1 active">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                            </path>
                        </svg>
                        Подрядчики
                    </button>
                    <button data-analytics-action="switchAnalyticsSubTab" data-action-arg="sub-onepager" data-analytics-action-arg2-type="element"
                        class="sub-tab-btn flex-1 min-w-[80px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                            </path>
                        </svg>
                        Сводка
                    </button>
                    <button data-analytics-action="switchAnalyticsSubTab" data-action-arg="sub-schedule" data-analytics-action-arg2-type="element"
                        class="sub-tab-btn flex-1 min-w-[80px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                            </path>
                        </svg>
                        График
                    </button>
                    <button data-analytics-action="switchAnalyticsSubTab" data-action-arg="sub-sk" data-analytics-action-arg2-type="element"
                        class="sub-tab-btn flex-1 min-w-[80px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                            </path>
                        </svg>
                        ПК СК
                    </button>
                    <button data-analytics-action="switchAnalyticsSubTab" data-action-arg="sub-history" data-analytics-action-arg2-type="element"
                        class="sub-tab-btn flex-1 min-w-[80px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        История
                    </button>

                </div>
            </div>

            <!-- БЛОК ФИЛЬТРОВ (Прилипает всегда) -->
            <div id="analytics-filters-block"
                class="sticky-top-panel bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-2 no-print mx-1">
                <div id="analytics-panel-header"
                    class="text-[10px] font-black text-slate-400 uppercase mb-2 flex justify-between items-center cursor-pointer">
                    <span class="flex items-center gap-1"><span id="analytics-panel-toggle-icon"
                            style="display:inline-block; transition: transform 0.3s">▾</span> Глобальные фильтры</span>

                    <!-- Правый блок: Тумблер + Иконка облака -->
                    <div class="flex items-center gap-2">
                        <div id="analytics-global-mode-toggle" class="hidden"></div>
                        <div id="analytics-status-icon-container"></div>
                    </div>
                </div>
                <div id="analytics-panel-body"
                    style="transition: max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease; max-height: 200px; overflow: hidden;">

                    <!-- СТРОКА 1: Объект, Подрядчик, Инспектор (Мультивыбор) -->
                    <div class="grid grid-cols-3 gap-2 mb-2">
                        <button id="btn-ana-project" data-multifilter-action="openMultiFilterModal" data-multifilter-action-args='["project","Объекты","analytics"]'
                            class="input-base text-[9px] min-[400px]:text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm"><span
                                class="truncate">Все объекты</span><svg class="w-3 h-3 opacity-50 shrink-0" fill="none"
                                stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                            </svg></button>
                        <button id="btn-ana-contractor"
                            data-multifilter-action="openMultiFilterModal" data-multifilter-action-args='["contractor","Подрядчики","analytics"]'
                            class="input-base text-[9px] min-[400px]:text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm"><span
                                class="truncate">Все подрядчики</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                            </svg></button>
                        <button id="btn-ana-inspector"
                            data-multifilter-action="openMultiFilterModal" data-multifilter-action-args='["inspector","Инспекторы","analytics"]'
                            class="input-base text-[9px] min-[400px]:text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm"><span
                                class="truncate">Все инспекторы</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                            </svg></button>
                    </div>

                    <!-- СТРОКА 2: Вид работ, Период и Источник данных -->
                    <div class="grid grid-cols-3 gap-2 mb-2">
                        <button id="btn-ana-template"
                            data-multifilter-action="openMultiFilterModal" data-multifilter-action-args='["template","Виды работ","analytics"]'
                            class="input-base text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm"><span
                                class="truncate">Все виды работ</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                            </svg></button>

                        <div class="relative w-full">
                            <select id="global-filter-period"
                                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                data-analytics-action="toggleDateRange,renderCurrentAnalyticsTab" data-action-event="change">
                                <option value="ALL">Всё время</option>
                                <option value="DAY">Сегодня</option>
                                <option value="WEEK">За 7 дней</option>
                                <option value="MONTH">За 30 дней</option>
                                <option value="CUSTOM">Свой период...</option>
                            </select>
                            <button id="btn-ana-period-label"
                                class="input-base text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm w-full"><span
                                    class="truncate">Всё время</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                                </svg></button>
                        </div>

                        <!-- Сюда JS вставит переключатель Аналитики -->
                        <div id="analytics-mode-container" class="flex flex-col justify-center items-end"></div>
                    </div>

                    <!-- КАЛЕНДАРЬ (СКРЫТ ПО УМОЛЧАНИЮ) -->
                    <div id="custom-date-range"
                        class="hidden grid-cols-2 gap-2 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <div class="flex items-center gap-1">
                            <span class="text-[9px] font-bold text-slate-500 uppercase">С:</span>
                            <input type="date" id="filter-date-from" class="input-base text-[10px] !py-1"
                                data-analytics-action="renderCurrentAnalyticsTab" data-action-event="change">
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-[9px] font-bold text-slate-500 uppercase">По:</span>
                            <input type="date" id="filter-date-to" class="input-base text-[10px] !py-1"
                                data-analytics-action="renderCurrentAnalyticsTab" data-action-event="change">
                        </div>
                    </div>

                </div>
            </div>

            <!-- Контейнеры подвкладок -->
            <div id="sub-contractors" class="analytics-sub-section">
                <!-- Главный экран вкладки (Сводка + Список) -->
                <div id="contractors-main-view">
                    <div id="contractors-top-summary" class="mx-1 mb-4 space-y-4"></div>

                    <!-- Фильтры-чипсы над списком -->
                    <div class="mx-1 mb-3 flex gap-2 overflow-x-auto no-scrollbar pb-1"
                        id="contractors-chips-container">
                        <button data-analytics-action="filterContractorsList" data-action-arg="ALL" data-analytics-action-arg2-type="element"
                            class="contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap transition-colors">Все</button>
                        <button data-analytics-action="filterContractorsList" data-action-arg="CRITICAL" data-analytics-action-arg2-type="element"
                            class="contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap transition-colors">🔴
                            Критичные</button>
                        <button data-analytics-action="filterContractorsList" data-action-arg="WARNING" data-analytics-action-arg2-type="element"
                            class="contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap transition-colors">🟡
                            Внимания</button>
                        <button data-analytics-action="filterContractorsList" data-action-arg="STABLE" data-analytics-action-arg2-type="element"
                            class="contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap transition-colors">🟢
                            Стабильные</button>
                        <button data-analytics-action="filterContractorsList" data-action-arg="NEW" data-analytics-action-arg2-type="element"
                            class="contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap transition-colors">⚪
                            Новые (Сбор)</button>
                    </div>

                    <div id="contractors-list-container" class="mx-1 pb-8 space-y-3"></div>
                </div>

                <!-- Режим детализации подрядчика (Скрыт по умолчанию) -->
                <div id="contractor-detail-view" class="hidden">
                    <div id="contractor-detail-header"
                        class="z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-[var(--card-border)] p-3 mx-1 mt-2 mb-4 rounded-xl shadow-sm flex items-center justify-between">
                        <button data-analytics-action="hideContractorDetailView"
                            class="text-[11px] font-bold text-slate-500 flex items-center gap-1 active:scale-95 px-2 py-1 bg-[var(--hover-bg)] rounded-lg">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 19l-7-7 7-7"></path>
                            </svg> Назад
                        </button>
                        <div class="font-black text-[12px] uppercase text-indigo-600 dark:text-indigo-400 truncate max-w-[60%] text-right"
                            id="detail-view-title">Подрядчик</div>
                    </div>
                    <div id="contractor-detail-content" class="mx-1 pb-8 space-y-4"></div>
                </div>
            </div>
            <div id="sub-onepager" class="analytics-sub-section hidden">
                <div id="onepager-content-container" class="pb-8"></div>
            </div>
            <!-- ИСТОРИЯ ПЕРЕНЕСЕНА СЮДА -->
            <div id="sub-history" class="analytics-sub-section hidden mx-1 mt-2">

                <!-- ОБЩАЯ "ЛИПКАЯ" ПАНЕЛЬ ФИЛЬТРОВ (ТЕПЕРЬ СНАРУЖИ ВЬЮХ) -->
                <div id="hist-sticky-panel"
                    class="bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-2xl border border-[var(--card-border)] mb-4 shadow-sm">

                    <!-- Заголовок с встроенным тумблером (iOS Style) -->
                    <div id="hist-panel-header" class="flex justify-between items-center mb-2">
                        <span
                            class="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1 cursor-pointer">
                            <span id="hist-panel-toggle-icon">▾</span>
                            База и Отчеты
                        </span>

                        <div class="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-full shadow-inner cursor-pointer border border-slate-300 dark:border-slate-600"
                            onclick="event.stopPropagation();">
                            <div id="btn-hist-checks" data-analytics-action="switchHistoryView" data-action-arg="checks"
                                class="px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all duration-300 bg-white dark:bg-slate-800 text-indigo-600 shadow-sm">
                                Проверки</div>
                            <div id="btn-hist-reports" data-analytics-action="switchHistoryView" data-action-arg="reports"
                                class="px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all duration-300 text-slate-500 dark:text-slate-400">
                                Отчеты</div>
                        </div>
                    </div>

                    <!-- Тело панели фильтров (сворачиваемое) -->
                    <div id="hist-panel-body"
                        style="transition: max-height 0.3s ease, opacity 0.3s ease; max-height: 400px; overflow: hidden;">
                        <!-- Строка поиска -->
                        <div class="relative mb-2">
                            <span class="absolute left-3 top-2.5 text-[12px] text-[var(--text-muted)]">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </span>
                            <input type="text" id="hist-search-text" class="input-base pl-9 text-[11px]"
                                placeholder="Поиск..." oninput="applyHistoryFilters()">
                        </div>

                        <!-- Мульти-фильтры -->
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <button id="btn-hist-project"
                                data-multifilter-action="openMultiFilterModal" data-multifilter-action-args='["project","Объекты","history"]'
                                class="input-base text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm"><span
                                    class="truncate">Все объекты</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                                </svg></button>
                            <button id="btn-hist-contractor"
                                data-multifilter-action="openMultiFilterModal" data-multifilter-action-args='["contractor","Подрядчики","history"]'
                                class="input-base text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm"><span
                                    class="truncate">Все подрядчики</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                                </svg></button>
                            <button id="btn-hist-inspector"
                                data-multifilter-action="openMultiFilterModal" data-multifilter-action-args='["inspector","Инспекторы","history"]'
                                class="input-base text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm"><span
                                    class="truncate">Все инспекторы</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                                </svg></button>

                            <div class="relative w-full">
                                <select id="hist-filter-period"
                                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    data-history-action="applyHistoryFilters" data-action-event="change">
                                    <option value="ALL">Всё время</option>
                                    <option value="DAY">Сегодня</option>
                                    <option value="WEEK">Неделя</option>
                                    <option value="MONTH">Месяц</option>
                                </select>
                                <button id="btn-hist-period-label"
                                    class="input-base text-[10px] !py-2 text-left flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm w-full"><span
                                        class="truncate">Всё время</span><svg class="w-3 h-3 opacity-50 shrink-0"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                                    </svg></button>
                            </div>
                        </div>

                        <!-- Нижняя строка (Чекбоксы + Кнопки) -->
                        <div id="hist-checks-actions-row"
                            class="flex justify-between items-center px-1 border-t border-[var(--card-border)] pt-2 mt-1">
                            <div class="flex gap-4">
                                <label
                                    class="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] cursor-pointer">
                                    <input type="checkbox" id="hist-filter-photo" class="accent-indigo-600 w-3.5 h-3.5"
                                        data-history-action="applyHistoryFilters" data-action-event="change"> С фото
                                </label>
                                <label
                                    class="flex items-center gap-1.5 text-[10px] font-bold text-red-500 cursor-pointer">
                                    <input type="checkbox" id="hist-filter-b3" class="accent-red-500 w-3.5 h-3.5"
                                        data-history-action="applyHistoryFilters" data-action-event="change"> Только B3
                                </label>
                            </div>
                            <div class="flex items-center gap-2">
                                <label
                                    class="flex items-center gap-1 text-[10px] font-bold text-indigo-600 cursor-pointer">
                                    <input type="checkbox" id="hist-select-all" class="w-3.5 h-3.5 accent-indigo-600"
                                        data-history-action="toggleAllHistory" data-history-action-val-type="element" data-action-event="change"> Все
                                </label>
                                <button data-history-action="exportSelectedCsv"
                                    class="text-green-600 bg-green-50 p-1.5 rounded-md active:scale-90"
                                    title="Выгрузить CSV"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                    </svg></button>
                                <button data-history-action="deleteSelectedHistory"
                                    class="text-red-600 bg-red-50 p-1.5 rounded-md active:scale-90"
                                    title="Удалить выбранные"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                                        </path>
                                    </svg></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ВЬЮХА 1: КЛАССИЧЕСКАЯ ИСТОРИЯ ПРОВЕРОК -->
                <div id="history-checks-view">
                    <div id="hist-empty-msg" class="text-center py-8 text-sm text-[var(--text-muted)]">История пуста.
                    </div>
                    <div id="history-list"></div>
                </div>

                <!-- ВЬЮХА 2: АРХИВ ОТЧЕТОВ -->
                <div id="history-reports-view" class="hidden">
                    <!-- ВСТАВКА: Панель массового удаления отчетов -->
                    <div id="hist-reports-actions-row" class="flex justify-between items-center px-1 pb-3 mb-3 border-b border-[var(--card-border)]">
                        <label class="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 cursor-pointer">
                            <input type="checkbox" id="reports-select-all" class="w-4 h-4 accent-indigo-600 rounded" data-analytics-action="toggleAllReports" data-analytics-action-val-type="element" data-action-event="change"> Выбрать всё
                        </label>
                        <button data-analytics-action="deleteSelectedReports" class="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg active:scale-90 flex items-center gap-1 text-[10px] font-black uppercase border border-red-200 shadow-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Удалить выбранные
                        </button>
                    </div>
                    <div id="reports-list" class="pb-8"></div>
                </div>
            </div>

            <!-- НОВЫЙ БЛОК: ГРАФИК РАБОТ -->
            <div id="sub-schedule" class="analytics-sub-section hidden mx-1 mt-2">
                <div id="schedule-container">
                    <!-- Сюда JS загрузит интерфейс -->
                </div>
            </div>
            <!-- КОНЕЦ БЛОКА: РЕЙТИНГ ИНЖЕНЕРА -->
            <!-- НОВЫЙ БЛОК: ПК СТРОЙКОНТРОЛЬ -->
            <div id="sub-sk" class="analytics-sub-section hidden mx-1 mt-2">
                <div id="sk-main-container" class="pb-8"></div>
            </div>
        </div>
      `;
    },

    /**
     * Диспетчер по текущей подвкладке.
     * Делегирует в window.renderCurrentAnalyticsTab из legacy.
     */
    render(subTab) {
        const tab = subTab || AnalyticsState.activeSubTab || 'sub-contractors';
        if (typeof window.renderCurrentAnalyticsTab === 'function') {
            window.renderCurrentAnalyticsTab(tab);
        }
    },

    /**
     * Обновить переключатель режима (local/cloud).
     */
    renderModeSwitcher() {
        AnalyticsRender.renderAnalyticsModeSwitcher();
    },

    /**
     * Обновить только панель фильтров без полной перерисовки.
     */
    renderFilters() {
        AnalyticsRender.updateAnalyticsFilters();
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: главный рендер текущей вкладки.
    // =========================================================================
    renderCurrentAnalyticsTab() {
        for (const key in _chartInstances()) { if (_chartInstances()[key]) _chartInstances()[key].destroy(); }
        AnalyticsState.setChartInstances({});
        AnalyticsRender.renderAnalyticsModeSwitcher();
        AnalyticsRender.renderOnePagerModeToggle();

        const data = getFilteredAnalyticsData();
        // В оригинале (analytics.legacy.js) `currentActiveAnalyticsTab` объявлялась
        // с дефолтом 'sub-contractors'; AnalyticsState.activeSubTab по умолчанию null
        // (до первого switchAnalyticsSubTab/восстановления из localStorage) — сохраняем
        // тот же дефолт, чтобы renderCurrentAnalyticsTab() работал сразу при первом
        // открытии вкладки «Аналитика».
        if (!AnalyticsState.activeSubTab) {
            AnalyticsState.setActiveSubTab('sub-contractors');
            window.currentActiveAnalyticsTab = 'sub-contractors';
        }
        const activeTab = AnalyticsState.activeSubTab;

        if (activeTab === 'sub-contractors') {
            AnalyticsRender.renderContractorsSubTab(data);
            // Если была открыта детализация — восстанавливаем с пересозданием графика
            if (window.currentDetailedContractor) {
                AnalyticsRender.showContractorDetailView(window.currentDetailedContractor);
            }
        }
        else if (activeTab === 'sub-onepager') AnalyticsRender.renderOnePagerSubTab(data);
        else if (activeTab === 'sub-schedule') { if (typeof rbi_renderScheduleTab === 'function') rbi_renderScheduleTab(); }
        else if (activeTab === 'sub-data') { if (typeof renderDataSubTab === 'function') renderDataSubTab(data); }
        else if (activeTab === 'sub-history') {
            renderHistoryTab();
            initCollapsiblePanel('hist-sticky-panel', 'hist-panel-body', 'hist-panel-header', 'hist-panel-toggle-icon');
        }
        else if (activeTab === 'sub-sk') {
            // Гарантированно запускаем пайплайн ПК СК, он сам внутри разберется с кэшем
            if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('sk:renderRequested', { view: 'mainTab' });
        }
        else if (activeTab === 'sub-rating') AnalyticsRender.renderRatingTab(); // Обратная совместимость
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: переключатель источника
    // аналитики (Идеальное выравнивание iOS Style).
    // =========================================================================
    renderAnalyticsModeSwitcher() {
        const container = document.getElementById('analytics-mode-container');
        const headerIconContainer = document.getElementById('analytics-status-icon-container');

        // Если облако отключено — прячем элементы
        if (!_syncConfig().enabled) {
            if (container) container.innerHTML = '';
            if (headerIconContainer) headerIconContainer.innerHTML = '';
            return;
        }

        const mode = _analyticsMode();
        const isCloud = mode === 'cloud';

        // Добавляем глобальную функцию для тумблера, если её нет
        if (!window.toggleAnalyticsMode) {
            window.toggleAnalyticsMode = function () {
                const current = _analyticsMode();
                window.setAnalyticsDataMode(current === 'cloud' ? 'local' : 'cloud');
                AnalyticsRender.renderCurrentAnalyticsTab();
            };
        }

        if (container) {
            const html = `
                <div onclick="window.toggleAnalyticsMode()" class="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg flex p-0.5 shadow-sm cursor-pointer active:scale-95 transition-transform" style="height: 34px;">
                    <div title="Данные с телефона" class="flex-1 rounded-md text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5 pointer-events-none ${!isCloud ? 'bg-[var(--hover-bg)] text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400 opacity-70'}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"></path></svg>
                        <span class="hidden min-[450px]:inline">Телефон</span>
                    </div>
                    <div title="Данные с сервера" class="flex-1 rounded-md text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5 pointer-events-none ${isCloud ? 'bg-[var(--hover-bg)] text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400 opacity-70'}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"></path></svg>
                        <span class="hidden min-[450px]:inline">Облако</span>
                    </div>
                </div>
            `;
            container.className = "w-full";
            container.innerHTML = html;
        }
        // 2. Рендерим иконку в шапке панели
        if (headerIconContainer) {
            let iconHtml = '';
            let iconClass = 'text-slate-400';

            if (isCloud) {
                if (window.isSyncing) {
                    iconClass = 'text-indigo-500 animate-pulse';
                    iconHtml = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"></path></svg>`;
                } else {
                    iconClass = 'text-green-500';
                    iconHtml = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"></path></svg>`;
                }
            } else {
                iconHtml = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"></path></svg>`;
            }

            headerIconContainer.innerHTML = `<div class="flex items-center ${iconClass} transition-colors duration-300" title="Источник: ${isCloud ? 'Облако' : 'Устройство'}">${iconHtml}</div>`;
        }
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: тумблер «Объект / Компания»
    // в заголовке фильтров.
    // =========================================================================
    renderOnePagerModeToggle() {
        const container = document.getElementById('analytics-global-mode-toggle');
        if (!container) return;

        // Показываем тумблер ТОЛЬКО на вкладке "Сводка"
        if (AnalyticsState.activeSubTab !== 'sub-onepager') {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        if (typeof window.onepagerMode === 'undefined') window.onepagerMode = 'local';
        const isGlobal = window.onepagerMode === 'global';

        // event.stopPropagation() нужен, чтобы при клике на тумблер не сворачивалась панель фильтров
        container.innerHTML = `
            <div class="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-full shadow-inner cursor-pointer border border-slate-300 dark:border-slate-600" onclick="event.stopPropagation(); window.onepagerMode = '${isGlobal ? 'local' : 'global'}'; renderCurrentAnalyticsTab();">
                <div class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase transition-all duration-300 ${!isGlobal ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}">Объект</div>
                <div class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase transition-all duration-300 ${isGlobal ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}">Компания</div>
            </div>
        `;
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: обновление списков в фильтрах
    // аналитики.
    // =========================================================================
    updateAnalyticsFilters() {
        const selectC = document.getElementById('global-filter-contractor');
        const selectT = document.getElementById('global-filter-template');
        if (!selectC || !selectT) return;

        var _allInspections = _inspections();
        const uniqueCs = [...new Set(_allInspections.map(i => i.contractorName).filter(Boolean))];
        selectC.innerHTML = `<option value="ALL">Все подрядчики</option>` + uniqueCs.map(c => `<option value="${c}">${c}</option>`).join('');

        const tmplSelect = document.getElementById('checklist-selector');
        if (tmplSelect) {
            let opts = `<option value="ALL">Все виды работ</option>`;
            Array.from(tmplSelect.options).forEach(o => {
                if (o.value && o.value !== "HOME" && o.value !== "UPLOAD") opts += `<option value="${o.value}">${o.text}</option>`;
            });
            selectT.innerHTML = opts;
        }
        if (typeof updateFilterButtonLabels === 'function') {
            updateFilterButtonLabels();
        }
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: подвкладка «Подрядчики»
    // (Сводка + Графики + Аккордеоны + Магия TWI).
    // =========================================================================
    renderContractorsSubTab(data) {
        const topContainer = document.getElementById('contractors-top-summary');
        if (!topContainer) return;

        if (data.length === 0) {
            topContainer.innerHTML = `<div class="text-center text-slate-500 text-sm py-10 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm">Нет данных по выбранным фильтрам</div>`;
            document.getElementById('contractors-list-container').innerHTML = '';
            document.getElementById('contractors-chips-container').style.display = 'none';
            return;
        }
        document.getElementById('contractors-chips-container').style.display = 'flex';

        let sumUrkProd = 0, sumB1 = 0, sumB2 = 0, sumB3 = 0;
        let sumDocProd = 0, cntDocProd = 0;
        const groupedC = {};
        const causesCount = {};

        // Глобальные массивы для фотогалерей
        let allPhotosB3 = []; let allPhotosB2 = []; let allPhotosOK = [];

        data.forEach(i => {
            if (i.metrics) {
                sumUrkProd += Number(i.metrics.final) || 0;
                sumB1 += Number(i.metrics.n_B1_fail) || 0;
                sumB2 += Number(i.metrics.n_B2_fail) || 0;
                sumB3 += Number(i.metrics.n_B3_fail) || 0;
                const docScore = _getDocumentaryScoreForItem(i);
                if (docScore !== null && docScore !== undefined) { sumDocProd += docScore; cntDocProd++; }
            }
            const projectLabel = i.project_display_name || i.projectName || i.project_canonical_key || 'Без объекта';
            const cKey = i.contractorName + ' [' + projectLabel + ']';
            groupedC[cKey] = groupedC[cKey] || [];
            groupedC[cKey].push(i);

            if (i.state) {
                Object.keys(i.state).forEach(id => {
                    const s = i.state[id];

                    if (s === 'fail' || s === 'fail_escalated') {
                        let code = i.details && i.details[id] ? i.details[id].causeCode || 'C00' : 'C00';
                        causesCount[code] = (causesCount[code] || 0) + 1;
                    }

                    const photo = (i.photos && i.photos[id]) ? i.photos[id] : null;
                    if (photo) {
                        let defName = "Дефект";
                        const tType = i.templateKey ? i.templateKey.split('_')[0] : '';
                        const tKey = i.templateKey ? i.templateKey.replace(tType + '_', '') : '';
                        const cl = tType === 'sys' && _getSystemTemplates()[tKey] ? _getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                        const foundItem = getFlatList(cl).find(x => String(x.id) === String(id));
                        if (foundItem) defName = foundItem.n;

                        const photoObj = { photo: photo, name: defName, contr: i.contractorName, date: new Date(i.date).toLocaleDateString('ru-RU') };

                        if (s === 'fail' || s === 'fail_escalated') {
                            let isB3 = (s === 'fail_escalated') || (foundItem && foundItem.w === 3);
                            if (isB3) allPhotosB3.push(photoObj);
                            else allPhotosB2.push(photoObj);
                        } else if (s === 'ok') {
                            allPhotosOK.push(photoObj);
                        }
                    }
                });
            }
        });

        const avgUrkProd = Math.round(sumUrkProd / data.length);
        const avgDocProd = cntDocProd > 0 ? Math.round(sumDocProd / cntDocProd) : null;
        const contrCount = Object.keys(groupedC).length;

        let sumIntegralUrk = 0; let validContrCount = 0;
        let defaultSmartText = '';
        let cList = [];

        for (let cName in groupedC) {
            const cData = groupedC[cName];
            const m = _contractorMetricsCached(cName, cData);
            if (m) {
                cList.push({ name: cName, metrics: m });
                if (m.count >= 7) { sumIntegralUrk += m.finalC; validContrCount++; }
            }
        }

        const avgIntegralUrk = validContrCount > 0 ? Math.round(sumIntegralUrk / validContrCount) : 0;
        if (defaultSmartText === '') defaultSmartText = 'Все подрядчики в зеленой зоне. Вмешательство не требуется.';

        const globalKey = 'global_main_analysis';
        const rawSmartText = _reports().getExpertConclusion(globalKey) || defaultSmartText;
        const uiSmartText = rawSmartText.replace(/\n/g, '<br>');
        const isCustomText = !!_reports().getExpertConclusion(globalKey);

        const getSelectHtml = (type) => `
            <select onchange="updateTrendCharts('${type}', this.value)" class="text-[9px] font-semibold border border-indigo-200 text-indigo-700 bg-white rounded px-1 py-1 outline-none cursor-pointer shadow-sm">
                <option value="WEEK" ${window.trendGroupings[type] === 'WEEK' ? 'selected' : ''}>Недели</option>
                <option value="MONTH" ${window.trendGroupings[type] === 'MONTH' ? 'selected' : ''}>Месяцы</option>
            </select>
        `;

        const docGapWarning = (avgDocProd !== null && Math.abs(avgUrkProd - avgDocProd) > 30)
            ? `<div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-2 shadow-sm text-center text-[10px] font-bold text-orange-700 dark:text-orange-400 flex items-center justify-center gap-1.5 mb-2">
                ⚠️ Большой разрыв между физикой (${avgUrkProd}%) и документацией (${avgDocProd}%) — ${Math.abs(avgUrkProd - avgDocProd)} п.п. Проверьте комплектность документов.
            </div>`
            : '';

        topContainer.innerHTML = `
            <div class="grid grid-cols-3 min-[500px]:grid-cols-5 gap-2 mb-2">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-sm flex flex-col justify-center min-w-0">
                    <div class="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 truncate" title="Средний физический УрК всех изделий">Ср. УрК Изд.</div>
                    <div class="text-lg font-bold leading-none ${avgUrkProd < 70 ? 'text-red-600' : (avgUrkProd < 85 ? 'text-orange-500' : 'text-green-600')}">${avgUrkProd}%</div>
                </div>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-sm flex flex-col justify-center min-w-0">
                    <div class="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 truncate" title="Средний УрК документации">Ср. УрК Докум.</div>
                    <div class="text-lg font-bold leading-none ${avgDocProd === null ? 'text-slate-400' : (avgDocProd < 70 ? 'text-red-600' : (avgDocProd < 85 ? 'text-orange-500' : 'text-indigo-600'))}">${avgDocProd === null ? '—' : avgDocProd + '%'}</div>
                </div>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-sm flex flex-col justify-center min-w-0">
                    <div class="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 truncate" title="Средний Интегральный рейтинг подрядчиков">Надежность</div>
                    <div class="text-lg font-bold leading-none ${avgIntegralUrk < 70 ? 'text-red-600' : (avgIntegralUrk < 85 ? 'text-orange-500' : 'text-indigo-600')}">${validContrCount > 0 ? avgIntegralUrk + '%' : 'СБОР'}</div>
                </div>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-sm flex flex-col justify-center min-w-0">
                    <div class="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 truncate">Подрядчиков</div>
                    <div class="text-lg font-bold leading-none text-slate-800 dark:text-white">${contrCount}</div>
                </div>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-sm flex flex-col justify-center min-w-0">
                    <div class="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 truncate">Проверок</div>
                    <div class="text-lg font-bold leading-none text-slate-800 dark:text-white">${data.length}</div>
                </div>
            </div>
            <div class="mb-3">
                ${docGapWarning}
                <div class="bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-inner flex justify-around text-center">
                    <div><span class="text-[9px] font-semibold text-slate-400 uppercase block">Мелкие (B1)</span><span class="font-bold text-blue-600">${sumB1}</span></div>
                    <div class="w-px bg-[var(--card-border)]"></div>
                    <div><span class="text-[9px] font-semibold text-slate-400 uppercase block">Значимые (B2)</span><span class="font-bold text-orange-500">${sumB2}</span></div>
                    <div class="w-px bg-[var(--card-border)]"></div>
                    <div><span class="text-[9px] font-semibold text-slate-400 uppercase block">Критичные (B3)</span><span class="font-bold text-red-600">${sumB3}</span></div>
                </div>
            </div>

            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-bold text-[11px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 transition-colors">
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        Анализ зон риска (AI)
                    </span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-white dark:bg-slate-800 relative">
                    <button onclick="editExpertText('${globalKey}', 'hidden_global_analysis')" class="absolute top-3 right-3 text-[9px] font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded shadow-sm active:scale-95 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Изменить
                    </button>
                    <div class="text-[10px] text-slate-500 uppercase font-semibold mb-3 border-b border-slate-100 pb-2 pr-20">Статус выборки: проанализировано ${validContrCount} подрядчиков</div>
                    ${isCustomText ? `<div class="text-[9px] font-semibold text-yellow-700 uppercase mb-2 bg-yellow-100 w-fit px-2 py-0.5 rounded flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Скорректировано инженером</div>` : ''}
                    <div class="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        ${uiSmartText}
                    </div>
                    <textarea id="hidden_global_analysis" class="hidden">${rawSmartText}</textarea>
                </div>
            </details>

            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                        Динамика и Тренды
                    </span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                    <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-3">
                        <div class="flex justify-between items-center mb-2">
                            <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase">Динамика: Подрядчики (Топ-10)</div>
                            <div class="flex gap-1">
                                <button onclick="openChartFilterModal('contrs')" class="text-[9px] font-semibold border border-slate-200 text-slate-600 bg-white rounded px-2 py-1 shadow-sm flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Линии
                                </button>
                                ${getSelectHtml('contrs')}
                            </div>
                        </div>
                        <div style="height: 180px; position: relative;"><canvas id="chart_eng_trend_contrs"></canvas></div>
                    </div>
                </div>
            </details>

            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        Причины и Сравнение
                    </span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Коренные причины дефектов</div>
                        <div style="height: 180px; position: relative;"><canvas id="chart_eng_causes"></canvas></div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Сравнение Подрядчиков (Интегр. УрК)</div>
                        <div style="height: 180px; position: relative;"><canvas id="chart_eng_compare"></canvas></div>
                    </div>
                </div>
            </details>

            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                        Фотогалерея (Брак и Эталоны)
                    </span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 space-y-4">
                    <div>
                        <h3 class="text-[10px] font-bold text-red-600 uppercase mb-2">Критический брак (B3)</h3>
                        ${AnalyticsRender.initPhotoGallery('main_b3', allPhotosB3, true)}
                    </div>
                    <div>
                        <h3 class="text-[10px] font-bold text-orange-600 uppercase mb-2">Значимые дефекты (B2)</h3>
                        ${AnalyticsRender.initPhotoGallery('main_b2', allPhotosB2, false)}
                    </div>
                    <div>
                        <h3 class="text-[10px] font-bold text-green-600 uppercase mb-2">Эталонные работы (OK)</h3>
                        ${AnalyticsRender.initPhotoGallery('main_ok', allPhotosOK, false, 'text-green-700 bg-green-100 border-green-200', 'OK')}
                    </div>
                </div>
            </details>
        `;

        setTimeout(() => {
            const trendContrsData = window.buildTrendChartData(data, 'contractorName', window.selectedChartFilters.contrs, window.trendGroupings.contrs);
            const ctxTrendC = document.getElementById('chart_eng_trend_contrs')?.getContext('2d');
            if (ctxTrendC) {
                if (_chartInstances()['chart_eng_trend_contrs']) _chartInstances()['chart_eng_trend_contrs'].destroy();
                _chartInstances()['chart_eng_trend_contrs'] = new Chart(ctxTrendC, { type: 'line', data: trendContrsData, options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 9 } } } } } });
            }

            let causesLabels = []; let causesData = [];
            Object.keys(causesCount).sort((a, b) => causesCount[b] - causesCount[a]).forEach(code => {
                const name = _defectCauses().find(c => c.code === code)?.name || 'Иное';
                causesLabels.push(name.substring(0, 15)); causesData.push(causesCount[code]);
            });
            const ctxCauses = document.getElementById('chart_eng_causes')?.getContext('2d');
            if (ctxCauses && causesData.length > 0) {
                if (_chartInstances()['chart_eng_causes']) _chartInstances()['chart_eng_causes'].destroy();
                _chartInstances()['chart_eng_causes'] = new Chart(ctxCauses, { type: 'bar', indexAxis: 'y', data: { labels: causesLabels, datasets: [{ data: causesData, backgroundColor: '#f59e0b', borderRadius: 4 }] }, options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
            }

            cList.sort((a, b) => b.metrics.finalC - a.metrics.finalC);
            const compLabels = cList.map(c => c.name.length > 10 ? c.name.substring(0, 10) + '...' : c.name);
            const compData = cList.map(c => c.metrics.finalC);
            const compColors = compData.map(v => v < 70 ? '#ef4444' : (v < 85 ? '#f59e0b' : '#22c55e'));

            const ctxComp = document.getElementById('chart_eng_compare')?.getContext('2d');
            if (ctxComp && compData.length > 0) {
                if (_chartInstances()['chart_eng_compare']) _chartInstances()['chart_eng_compare'].destroy();
                _chartInstances()['chart_eng_compare'] = new Chart(ctxComp, { type: 'bar', data: { labels: compLabels, datasets: [{ data: compData, backgroundColor: compColors, borderRadius: 4 }] }, options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } } });
            }
        }, 100);

        AnalyticsRender.renderContractorsListOnly(data);
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: список Подрядчиков (Мини-карточки
    // сеткой 2 и 3 в ряд).
    // =========================================================================
    renderContractorsListOnly(data) {
        const listContainer = document.getElementById('contractors-list-container');
        if (!listContainer) return;

        const groupedC = {};
        data.forEach(item => {
            const projectLabel = item.project_display_name || item.projectName || item.project_canonical_key || 'Без объектa';
            const cKey = item.contractorName + ' [' + projectLabel + ']';
            groupedC[cKey] = groupedC[cKey] || [];
            groupedC[cKey].push(item);
        });

        const cList = [];
        for (let cName in groupedC) {
            const cData = groupedC[cName];
            const m = _contractorMetricsCached(cName, cData);

            // Считаем B1 и B2 для вывода в карточку
            let sumB1 = 0, sumB2 = 0;
            cData.forEach(i => { if (i.metrics) { sumB1 += Number(i.metrics.n_B1_fail) || 0; sumB2 += Number(i.metrics.n_B2_fail) || 0; } });

            if (m) cList.push({ name: cName, data: cData, metrics: m, workType: cData[0].templateTitle, b1: sumB1, b2: sumB2 });
        }

        let filteredList = cList;
        if (window.currentContractorsFilter === 'CRITICAL') filteredList = cList.filter(c => c.metrics.finalC < 70 || c.metrics.n_изделий_с_B3 > 0);
        else if (window.currentContractorsFilter === 'WARNING') filteredList = cList.filter(c => (c.metrics.finalC >= 70 && c.metrics.finalC < 85) || c.metrics.stabilityIndex < 60);
        else if (window.currentContractorsFilter === 'STABLE') filteredList = cList.filter(c => c.metrics.finalC >= 85 && c.metrics.n_изделий_с_B3 === 0);
        else if (window.currentContractorsFilter === 'NEW') filteredList = cList.filter(c => c.metrics.count < 7);

        filteredList.sort((a, b) => {
            if (a.metrics.count < 7 && b.metrics.count >= 7) return 1;
            if (b.metrics.count < 7 && a.metrics.count >= 7) return -1;
            return b.metrics.finalC - a.metrics.finalC;
        });

        if (filteredList.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-6 text-slate-400 font-bold text-[11px] uppercase bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">В этой категории никого нет</div>`;
            return;
        }

        // Сетка: 2 колонки на мобильных, 3 на планшетах/ПК
        let html = '<div class="grid grid-cols-2 md:grid-cols-3 gap-3">';

        filteredList.forEach((c) => {
            const m = c.metrics;
            const isPrelim = m.count < 7;
            const borderClass = m.finalC < 70 ? 'border-red-300 dark:border-red-800' : 'border-[var(--card-border)]';
            const relColor = isPrelim ? '#94a3b8' : _urkGradientColor(m.finalC);
            const urkColor = _urkGradientColor(m.baseUrkContrPerc);
            const hasDoc = m.documentaryC !== null && m.documentaryC !== undefined;
            const docColor = hasDoc ? _urkGradientColor(m.documentaryC) : '';
            const docGapWarn = (hasDoc && !isPrelim && Math.abs(m.baseUrkContrPerc - m.documentaryC) > 30) ? ` <span title="Большой разрыв между физикой и документацией (>30%)">⚠️</span>` : '';

            // Защита от поломки HTML из-за кавычек в названиях
            const safeName = c.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

            html += `
            <div class="bg-[var(--card-bg)] border ${borderClass} rounded-xl p-3 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform flex flex-col justify-between" onclick="showContractorDetailView('${safeName}')">
                ${isPrelim ? '<div class="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase" title="Нужно больше проверок">Сбор</div>' : ''}
                
                <div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white leading-snug mb-1 pr-6 break-words">${c.name}</div>
                    <div class="text-[9px] font-bold text-[var(--text-muted)] truncate mb-2">${c.workType}</div>

                    <div class="flex items-stretch gap-3 mb-2">
                        <div class="flex-1 flex flex-col">
                            <div class="text-[8px] uppercase text-slate-400 font-bold">Надежность</div>
                            <div class="text-2xl font-black leading-none" style="color:${relColor}">${isPrelim ? '--' : m.finalC}<span class="text-sm">%</span></div>
                            <div class="text-[8px] text-slate-400 font-bold mt-0.5">± ${isPrelim ? '-' : m.ci95_margin.toFixed(1)}%</div>
                            <span class="text-[7px] ${m.confCls} border rounded px-1 font-bold uppercase mt-1 self-start" title="Достоверность рейтинга (N=${m.count})">${m.confStatus}</span>
                        </div>
                        <div class="flex-1 flex flex-col border-l border-[var(--card-border)] pl-3">
                            <div class="text-[8px] uppercase text-slate-400 font-bold">Ур. качества</div>
                            <div class="text-2xl font-black leading-none" style="color:${urkColor}">${m.baseUrkContrPerc}<span class="text-sm">%</span></div>
                            <div class="text-[10px] font-bold mt-0.5" style="color:${hasDoc ? docColor : 'transparent'}">${hasDoc ? `Док ${m.documentaryC}%${docGapWarn}` : '&nbsp;'}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Информационная панель (Счетчики дефектов) -->
                <div class="flex justify-between items-center bg-[var(--hover-bg)] rounded-md px-2 py-1.5 mb-2 border border-[var(--card-border)]">
                    <div class="text-[8px] font-black text-slate-500 uppercase">Дефекты:</div>
                    <div class="flex gap-1">
                        <span class="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1 rounded" title="B1">B1: ${c.b1}</span>
                        <span class="text-[8px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-1 rounded" title="B2">B2: ${c.b2}</span>
                        <span class="text-[8px] font-black text-red-600 bg-red-50 border border-red-100 px-1 rounded" title="B3">B3: ${m.n_изделий_с_B3}</span>
                    </div>
                </div>

                <!-- Информационная панель (Коэффициенты) -->
                <div class="grid grid-cols-4 gap-1 pt-2 border-t border-[var(--card-border)] text-center">
                    <div>
                        <div class="text-[7px] text-slate-500 uppercase font-bold" title="Выборка">Пров.</div>
                        <div class="text-[10px] font-black text-slate-800 dark:text-white">${m.count}</div>
                    </div>
                    <div class="border-l border-slate-200 dark:border-slate-700">
                        <div class="text-[7px] text-slate-500 uppercase font-bold" title="Стабильность">Стаб.</div>
                        <div class="text-[10px] font-black ${isPrelim ? 'text-slate-400' : m.stabColor}">${isPrelim ? '-' : m.stabilityIndex}</div>
                    </div>
                    <div class="border-l border-slate-200 dark:border-slate-700">
                        <div class="text-[7px] text-slate-500 uppercase font-bold" title="Системность (Ks)">Ks</div>
                        <div class="text-[10px] font-black ${m.ks < 1 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">${m.ks.toFixed(2)}</div>
                    </div>
                    <div class="border-l border-slate-200 dark:border-slate-700">
                        <div class="text-[7px] text-slate-500 uppercase font-bold" title="Критичность (Kcrit)">Kcrit</div>
                        <div class="text-[10px] font-black ${m.kcritC < 1 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">${m.kcritC.toFixed(2)}</div>
                    </div>
                </div>
            </div>`;
        });

        html += '</div>';
        listContainer.innerHTML = html;
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: подвкладка «Сводка» (One-Pager).
    // =========================================================================
    renderOnePagerSubTab(data) {
        var _allInspections = _inspections();
        const container = document.getElementById('onepager-content-container');

        // Инициализация режима по умолчанию
        if (typeof window.onepagerMode === 'undefined') window.onepagerMode = 'local';

        // Если выбран глобальный режим — передаем управление новой функции!
        if (window.onepagerMode === 'global') {
            return AnalyticsRender.renderGlobalOnePager(data, container);
        }
        if (data.length === 0) {
            container.innerHTML = `<div class="text-center text-slate-500 text-sm py-10 border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm mx-1">Нет данных для анализа</div>`;
            return;
        }

        let sumUrk = 0; let sumB3 = 0; let sumDoc = 0; let cntDoc = 0;
        data.forEach(i => {
            if (i.metrics) {
                sumUrk += Number(i.metrics.final) || 0;
                sumB3 += Number(i.metrics.n_B3_fail) || 0;
                const docScore = _getDocumentaryScoreForItem(i);
                if (docScore !== null && docScore !== undefined) { sumDoc += docScore; cntDoc++; }
            }
        });
        const currAvgUrk = data.length > 0 ? Math.round(sumUrk / data.length) : 0;
        const currAvgDoc = cntDoc > 0 ? Math.round(sumDoc / cntDoc) : null;

        const groupedC = {};
        data.forEach(item => {
            const cKey = (item.contractorName || 'Неизвестно') + ' [' + (item.projectName || 'Без объекта') + ']';
            groupedC[cKey] = groupedC[cKey] || [];
            groupedC[cKey].push(item);
        });
        const currContractorsCount = Object.keys(groupedC).length;

        const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, _templates().getUserTemplates()) : null;
        const mData = currIntMetrics || { redZonePerc: 0, IKO: "0.00", ikoStatus: "Мало данных", ikoColor: "text-slate-500" };

        const ratingData = [];
        for (let cName in groupedC) {
            if (groupedC[cName].length >= 3) {
                const m = _contractorMetricsCached(cName, groupedC[cName]);
                if (m) ratingData.push({ name: cName, val: m.finalC, count: m.count, b3: m.n_изделий_с_B3, isPrelim: m.count < 7 });
            }
        }
        ratingData.sort((a, b) => b.val - a.val);

        const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
        let prevData = [];
        const now = new Date();
        let trendLabel = "к 1-й пол. базы";

        if (selPeriod === 'WEEK') {
            const startCurr = new Date(now); startCurr.setDate(now.getDate() - 7);
            const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 7);
            prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
            trendLabel = "к прош. нед.";
        } else if (selPeriod === 'MONTH') {
            const startCurr = new Date(now); startCurr.setDate(now.getDate() - 30);
            const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 30);
            prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
            trendLabel = "к прош. мес.";
        } else if (selPeriod === 'CUSTOM') {
            trendLabel = "к пред. периоду";
        } else {
            const half = Math.floor(data.length / 2);
            const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
            prevData = sortedData.slice(0, half);
        }

        let prevAvgUrk = 0; let prevIko = "0.00"; let prevChecks = prevData.length; let prevContrsCount = 0;
        if (prevData.length > 0) {
            let pSum = 0; prevData.forEach(i => pSum += (i.metrics?.final || 0));
            prevAvgUrk = Math.round(pSum / prevData.length);
            const pGrouped = {}; prevData.forEach(i => pGrouped[i.contractorName] = true);
            prevContrsCount = Object.keys(pGrouped).length;
            const pInt = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevData, _templates().getUserTemplates()) : null;
            if (pInt) prevIko = pInt.IKO;
        }

        const renderTrend = (curr, prev, label, inverse = false) => {
            if (prev === undefined || prev === null || prev === "") return `<span class="text-slate-400 text-[8px] font-bold bg-slate-100 dark:bg-slate-700 px-1.5 rounded">Нет базы</span>`;
            let diff = (parseFloat(curr) - parseFloat(prev));
            if (Math.abs(diff) < 0.01) return `<div class="text-right"><span class="text-slate-400 text-[10px] font-bold">▬ 0</span><div class="text-[7px] text-slate-400 mt-0.5 uppercase tracking-wider">${label}</div></div>`;
            const isGood = inverse ? diff < 0 : diff > 0;
            const color = isGood ? 'text-green-500' : 'text-red-500';
            const sign = diff > 0 ? '▲' : '▼';
            return `<div class="text-right"><span class="${color} text-[11px] font-black">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff) ? 0 : 2)}</span><div class="text-[7px] text-slate-400 mt-0.5 uppercase tracking-wider">${label}</div></div>`;
        };

        const sparkLabels = []; const sparkData = [];
        for (let i = 5; i >= 0; i--) {
            const dStart = new Date(); dStart.setDate(now.getDate() - (i * 7) - 7);
            const dEnd = new Date(); dEnd.setDate(now.getDate() - (i * 7));
            const weekChecks = _allInspections.filter(c => { const d = new Date(c.date); return d >= dStart && d < dEnd; });
            let wSum = 0; weekChecks.forEach(c => wSum += (c.metrics?.final || 0));
            sparkLabels.push(`-${i}н`);
            sparkData.push(weekChecks.length > 0 ? Math.round(wSum / weekChecks.length) : null);
        }

        let defaultChartContrs = [];
        let isTruncatedForChart = false;
        if (ratingData.length <= 10) {
            defaultChartContrs = ratingData.map(r => r.name);
        } else {
            defaultChartContrs = [...ratingData.slice(0, 5).map(r => r.name), ...ratingData.slice(-5).map(r => r.name)];
            isTruncatedForChart = true;
        }

        if (!window.selectedChartFilters.onepager) window.selectedChartFilters.onepager = [];
        const activeLineFilters = window.selectedChartFilters.onepager.length > 0 ? window.selectedChartFilters.onepager : defaultChartContrs;

        // Сбор всех фото (B3, B2, OK)
        let b3Map = {}; let b2Map = {}; let okMap = {};
        data.forEach(i => {
            if (i.state && i.details && i.templateKey) {
                Object.keys(i.state).forEach(id => {
                    const s = i.state[id];
                    let defName = "Дефект";
                    const tType = i.templateKey.split('_')[0];
                    const tKey = i.templateKey.replace(tType + '_', '');
                    const cl = tType === 'sys' && _getSystemTemplates()[tKey] ? _getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                    const foundItem = getFlatList(cl).find(x => x.id == id);
                    if (foundItem) defName = foundItem.n;

                    const photo = (i.photos && i.photos[id]) ? i.photos[id] : null;

                    if (s === 'fail' || s === 'fail_escalated') {
                        let isB3 = (s === 'fail_escalated') || (foundItem && foundItem.w === 3);
                        if (isB3) {
                            if (!b3Map[defName]) b3Map[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно') + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                            b3Map[defName].count++;
                            if (photo) b3Map[defName].photo = photo;
                        } else {
                            const isB1 = foundItem && foundItem.w === 1;
                            if (isB1) return; // B1 не попадает в топ дефектов
                            if (!b2Map[defName]) b2Map[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно') + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                            b2Map[defName].count++;
                            if (photo) b2Map[defName].photo = photo;
                        }
                    } else if (s === 'ok' && photo) {
                        if (!okMap[defName]) okMap[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно') + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                        okMap[defName].count++;
                        if (photo) okMap[defName].photo = photo;
                    }
                });
            }
        });

        const topB3 = Object.values(b3Map).sort((a, b) => b.count - a.count).slice(0, 5);
        const topB2 = Object.values(b2Map).sort((a, b) => b.count - a.count).slice(0, 5);
        const topOK = Object.values(okMap).sort((a, b) => b.count - a.count).slice(0, 5);

        const renderUIPhotoCards = (arr, isCrit, isOk = false) => {
            if (arr.length === 0) return `<div class="text-center py-6 text-[var(--text-muted)] text-[11px] bg-[var(--card-bg)] rounded-lg border border-dashed border-[var(--card-border)]">${isOk ? 'Эталонов нет' : 'Дефектов не зафиксировано'}</div>`;
            return `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                ${arr.map(d => {
                const imgHtml = d.photo ? `<img src="${window.getPhotoSrc(d.photo)}" class="w-full h-24 object-cover border-b border-[var(--card-border)] cursor-pointer active:scale-95" onclick="openPhotoViewer('${d.photo}')">` : `<div class="w-full h-24 bg-[var(--hover-bg)] flex items-center justify-center text-[var(--card-border)] text-[10px] border-b border-[var(--card-border)] text-center px-1">НЕТ ФОТО</div>`;
                let badgeColor = isCrit ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200';
                let badgeText = isCrit ? 'B3' : 'B2';
                if (isOk) { badgeColor = 'text-green-700 bg-green-100 border-green-200'; badgeText = 'OK'; }
                return `
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden flex flex-col shadow-sm">
                        ${imgHtml}
                        <div class="p-2 flex-1 flex flex-col justify-between">
                            <div class="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 mb-1" title="${d.name}">${d.name}</div>
                            <div>
                                <div class="text-[8px] text-[var(--text-muted)] mb-1 truncate w-full" title="${d.contr}">👤 ${d.contr}</div>
                                <div class="flex justify-between items-center"><span class="${badgeColor} text-[8px] font-black px-1.5 rounded border">${badgeText}</span><span class="text-[9px] font-black text-[var(--text-muted)]">${d.count} шт</span></div>
                            </div>
                        </div>
                    </div>`;
            }).join('')}
            </div>`;
        };

        let periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';
        if (document.getElementById('global-filter-period')?.value === 'CUSTOM') {
            const dFrom = document.getElementById('filter-date-from')?.value;
            const dTo = document.getElementById('filter-date-to')?.value;
            if (dFrom || dTo) {
                const fmt = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '...';
                periodText = `с ${fmt(dFrom)} по ${fmt(dTo)}`;
            }
        }
        const isGlobalDanger = parseFloat(mData.IKO) >= 0.60 || sumB3 > 0;

        const pdcaKey = 'global_onepager_pdca';
        let rawPdcaText = _reports().getExpertConclusion(pdcaKey) || "";
        if (!_reports().getExpertConclusion(pdcaKey)) {
            rawPdcaText = `[АНАЛИТИКА ДАШБОРДА]\nИндекс критичности объекта (ИКО): ${mData.IKO}.\nРаботы в красной зоне: ${mData.redZonePerc}%.\nОхват: ${data.length} проверок.\n\n`;

            const topDefectsForPdca = [...topB3, ...topB2].sort((a, b) => b.count - a.count).slice(0, 3);
            if (topDefectsForPdca.length > 0) {
                rawPdcaText += `[КЛЮЧЕВЫЕ ПРОБЛЕМЫ]\n` + topDefectsForPdca.map((d, idx) => `${idx + 1}. ${d.name} (${d.count} случ., ${d.contr})`).join('\n') + `\n\n`;
            }

            const worstContractors = ratingData.filter(r => r.val < 85).slice(0, 3);
            if (worstContractors.length > 0) {
                rawPdcaText += `[ПРОБЛЕМНЫЕ ПОДРЯДЧИКИ]\n` + worstContractors.map((r, idx) => `${idx + 1}. ${r.name} — ${r.val}%`).join('\n') + `\n\n`;
            }

            rawPdcaText += `[ПЛАН ДЕЙСТВИЙ]\n`;
            if (isGlobalDanger) {
                rawPdcaText += `1. Ограничить подписание КС-2 для подрядчиков в красной зоне.\n2. Провести аудит квалификации персонала.\n`;
                if (worstContractors.length > 0) rawPdcaText += `3. Назначить внеплановый разбор по подрядчикам: ${worstContractors.map(r => r.name).join(', ')}.\n`;
                if (topDefectsForPdca.length > 0) rawPdcaText += `4. Провести точечный контроль по дефекту-лидеру: «${topDefectsForPdca[0].name}».\n`;
            } else {
                rawPdcaText += `Процесс находится в управляемой зоне. Ресурсы направить на профилактику системных дефектов.\n`;
                if (topDefectsForPdca.length > 0) rawPdcaText += `Приоритет — предупреждение повторения дефекта «${topDefectsForPdca[0].name}».\n`;
            }
        }
        let uiPdcaText = rawPdcaText.replace(/\n/g, '<br>').replace(/^\[(.*?)\]/gm, '<b class="text-slate-800 dark:text-white text-[11px] block mt-2 mb-1">$1</b>');

        // --- ТЕПЛОВАЯ КАРТА (МАТРИЦА РИСКОВ) ---
        const heatmapStages = {};
        const contrCheckCounts = {}; // Считаем проверки для вывода в топы матрицы

        data.forEach(check => {
            if (!check.metrics) return;

            // Бронебойная защита от отсутствия названия
            const stage = check.templateTitle || check.templateKey || 'Неизвестный этап';
            const contr = check.contractorName || 'Неизвестно';

            contrCheckCounts[contr] = (contrCheckCounts[contr] || 0) + 1;

            if (!heatmapStages[stage]) heatmapStages[stage] = {};
            if (!heatmapStages[stage][contr]) heatmapStages[stage][contr] = { checks: 0, defects: 0 };

            heatmapStages[stage][contr].checks++;
            heatmapStages[stage][contr].defects += ((Number(check.metrics.n_B2_fail) || 0) + (Number(check.metrics.n_B3_fail) || 0));
        });

        let heatmapHtml = '';
        const stageNames = Object.keys(heatmapStages).sort();

        // Берем топ-5 самых проверяемых подрядчиков ИМЕННО из текущей выборки
        const topMatrixContrs = Object.keys(contrCheckCounts)
            .sort((a, b) => contrCheckCounts[b] - contrCheckCounts[a])
            .slice(0, 5);

        if (stageNames.length > 0 && topMatrixContrs.length > 0) {
            heatmapHtml = `<div class="overflow-x-auto custom-scrollbar pb-2"><table class="w-full text-left border-collapse text-[10px]">
                <thead class="bg-[var(--hover-bg)] text-[var(--text-muted)] uppercase"><tr><th class="p-2 border border-[var(--card-border)] font-black">Вид работ / Подрядчик</th>`;

            topMatrixContrs.forEach(c => heatmapHtml += `<th class="p-2 border border-[var(--card-border)] text-center font-bold truncate max-w-[80px]" title="${c}">${c.substring(0, 10)}</th>`);
            heatmapHtml += `</tr></thead><tbody>`;

            stageNames.forEach(stage => {
                heatmapHtml += `<tr><td class="p-2 border border-[var(--card-border)] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title="${stage}">${stage}</td>`;
                topMatrixContrs.forEach(contr => {
                    const cell = heatmapStages[stage][contr];
                    if (!cell) {
                        heatmapHtml += `<td class="p-2 border border-[var(--card-border)] text-center bg-[var(--hover-bg)] text-slate-400 dark:text-slate-600">-</td>`;
                    } else {
                        const defectRate = cell.defects / cell.checks;
                        let bgColor = 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800';
                        if (defectRate > 1.5) bgColor = 'bg-red-100 text-red-800 border-red-300 font-black dark:bg-red-900/40 dark:border-red-700';
                        else if (defectRate > 0.5) bgColor = 'bg-yellow-50 text-yellow-700 border-yellow-200 font-bold dark:bg-yellow-900/20 dark:border-yellow-800';
                        heatmapHtml += `<td class="p-2 border border-[var(--card-border)] text-center ${bgColor}">${cell.defects} деф.</td>`;
                    }
                });
                heatmapHtml += `</tr>`;
            });
            heatmapHtml += `</tbody></table></div>`;
        } else {
            heatmapHtml = `<div class="text-center text-slate-400 py-6 text-[10px] font-bold uppercase bg-[var(--hover-bg)] rounded-lg border border-dashed border-[var(--card-border)]">Недостаточно дефектов для карты</div>`;
        }

        // --- ИНДЕКС ЗДОРОВЬЯ (ПУЛЬС) ---
        const healthIndex = Math.max(0, Math.min(100, Math.round(100 - (parseFloat(mData.IKO) * 50) - (mData.redZonePerc * 0.5) - (sumB3 * 2))));
        let healthColor = healthIndex > 80 ? 'text-green-500' : (healthIndex > 50 ? 'text-orange-500' : 'text-red-500');

        // ==========================================
        // СБОРКА ИТОГОВОГО HTML (ОДИН СПИСОК АККОРДЕОНОВ - iOS STYLE)
        // ==========================================
        container.innerHTML = `
            <div class="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 mx-1 mt-2 flex justify-between items-center">
                <div>
                    <h2 class="text-[12px] font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        Сводный статус объекта
                    </h2>
                    <div class="text-[9px] font-bold text-[var(--text-muted)] mt-1">Охват: ${data.length} проверок &bull; Период: <span class="text-indigo-500">${periodText}</span></div>
                </div>
            </div>
            
            <div class="space-y-3 mx-1">
                
                <!-- АККОРДЕОН 1: ГЛАВНЫЕ МЕТРИКИ И РЕЙТИНГ -->
                <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                    <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg>
                            Статистика и Тренды
                        </span>
                        <span class="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 flex flex-col gap-3 rounded-b-2xl">
                        
                        ${(currAvgDoc !== null && Math.abs(currAvgUrk - currAvgDoc) > 30) ? `<div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-2.5 shadow-sm text-center text-[10px] font-bold text-orange-700 dark:text-orange-400 flex items-center justify-center gap-1.5">⚠️ Разрыв между физикой (${currAvgUrk}%) и документацией (${currAvgDoc}%) по объекту — ${Math.abs(currAvgUrk - currAvgDoc)} п.п.</div>` : ''}
                        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ур. качества (физика/докум.)</div>
                                <div class="flex justify-between items-end">
                                    <span class="flex items-baseline gap-1.5">
                                        <span class="text-2xl font-black leading-none" style="color:${_urkGradientColor(currAvgUrk)}">${currAvgUrk}%</span>
                                        <span class="text-[13px] font-black leading-none ${currAvgDoc === null ? 'text-slate-400' : ''}" style="${currAvgDoc === null ? '' : 'color:' + _urkGradientColor(currAvgDoc)}">${currAvgDoc === null ? '—' : 'Док ' + currAvgDoc + '%'}</span>
                                    </span>
                                    ${renderTrend(currAvgUrk, prevAvgUrk, trendLabel)}
                                </div>
                            </div>
                            <div class="bg-[var(--card-bg)] border ${parseFloat(mData.IKO) >= 0.6 ? 'border-red-300 bg-red-50/50' : 'border-[var(--card-border)]'} rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Индекс Риска (ИКО)</div>
                                <div class="flex justify-between items-end">
                                    <span class="text-2xl font-black ${mData.ikoColor} leading-none">${mData.IKO}</span>
                                    ${renderTrend(mData.IKO, prevIko, trendLabel, true)}
                                </div>
                            </div>
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Объем проверок</div>
                                <div class="flex justify-between items-end">
                                    <span class="text-2xl font-black text-slate-800 dark:text-white leading-none">${data.length}</span>
                                    ${renderTrend(data.length, prevChecks, trendLabel)}
                                </div>
                            </div>
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Акт. Подрядчиков</div>
                                <div class="flex justify-between items-end">
                                    <span class="text-2xl font-black text-slate-800 dark:text-white leading-none">${currContractorsCount}</span>
                                    ${renderTrend(currContractorsCount, prevContrsCount, trendLabel)}
                                </div>
                            </div>
                            <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                                <div class="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">В красной зоне</div>
                                <div class="flex justify-between items-end">
                                    <span class="text-2xl font-black text-red-600 dark:text-red-400 leading-none">${mData.redZonePerc}%</span>
                                    <span class="text-[9px] font-bold text-red-700/70">от объема</span>
                                </div>
                            </div>
                            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 z-10">Тренд УрК (6 нед)</div>
                                <div class="absolute bottom-0 left-0 right-0 h-[40px] opacity-70"><canvas id="op-sparkline-chart"></canvas></div>
                            </div>
                        </div>

                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col">
                            <div class="flex justify-between items-center mb-2">
                                <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase">Динамика Подрядчиков (Ср. УРк)</div>
                                <button onclick="openChartFilterModal('onepager')" class="text-[9px] font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 rounded px-2 py-1 active:scale-95 shadow-sm flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Фильтр
                                </button>
                            </div>
                            <div style="height: 180px; position: relative;"><canvas id="op-line-chart"></canvas></div>
                        </div>

                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col">
                            <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-1.5">
                                <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg> 
                                Рейтинг Подрядчиков (ИУрК)
                            </div>
                            <div class="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                ${ratingData.map(r => `
                                    <div class="flex items-center gap-2">
                                        <div class="w-24 text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title="${r.name}">${r.name}</div>
                                        <div class="flex-1 h-2.5 bg-[var(--hover-bg)] rounded-full overflow-hidden border border-[var(--card-border)] relative">
                                            <div class="h-full ${r.val < 70 ? 'bg-red-500' : (r.val < 85 ? 'bg-orange-500' : 'bg-green-500')}" style="width:${r.val}%"></div>
                                        </div>
                                        <div class="w-14 flex items-center justify-end gap-1 shrink-0">
                                            ${r.isPrelim ? '<span class="text-[8px] text-slate-400 font-bold border border-slate-300 rounded px-1" title="Предварительный рейтинг">СБОР</span>' : ''}
                                            <span class="text-[11px] font-black ${r.val < 70 ? 'text-red-500' : (r.val < 85 ? 'text-orange-500' : 'text-green-500')}">${r.val}%</span>
                                        </div>
                                    </div>
                                `).join('') || '<div class="text-[10px] text-[var(--text-muted)] text-center py-2">Недостаточно данных</div>'}
                            </div>
                        </div>
                    </div>
                </details>

                <!-- АККОРДЕОН 2: ПУЛЬС ОБЪЕКТА -->
                <details class="bg-[var(--card-bg)] border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary class="p-3.5 font-bold text-[11px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl hover:bg-indigo-100 transition-colors select-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> 
                            Пульс объекта (AI) 
                            <button onclick="event.preventDefault(); showToast('Индекс Здоровья рассчитывается на основе Индекса Риска (ИКО), процента красной зоны и аварий B3. ИИ анализирует эти данные и дает краткое заключение.')" class="text-indigo-400 hover:text-indigo-600 active:scale-95 transition-colors ml-1" title="Справка">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </button>
                        </span>
                        <span class="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div class="p-4 border-t border-indigo-100 dark:border-indigo-800 bg-white dark:bg-slate-800 rounded-b-2xl">
                        <div class="flex justify-between items-center mb-4">
                            <div class="text-[10px] font-bold uppercase text-slate-400">Индекс Здоровья</div>
                            <div class="text-4xl font-black ${healthColor}">${healthIndex}<span class="text-lg text-slate-400">/100</span></div>
                        </div>
                        <div class="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-medium" id="pulse-ai-text">
                            ${_reports().getExpertConclusion('pulse_ai') || 'Нажмите кнопку ниже для генерации пульса.'}
                        </div>
                        <button onclick="window.RBI.services.ai.generatePulseAi()" class="mt-3 w-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 shadow-sm flex items-center justify-center gap-1.5 transition-transform">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Обновить Пульс
                        </button>
                    </div>
                </details>

                <!-- АККОРДЕОН 3: ТЕПЛОВАЯ КАРТА -->
                <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                            Тепловая карта этапов
                        </span>
                        <span class="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div class="p-4 border-t border-[var(--card-border)] bg-white dark:bg-slate-800 rounded-b-2xl">
                        ${heatmapHtml}
                        <button onclick="window.RBI.services.ai.generateHeatmapAi()" class="mt-3 w-full bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-600 transition-transform">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Анализ Рисков (ИИ)
                        </button>
                        <div id="heatmap-ai-text" class="hidden mt-3 text-[11px] leading-relaxed text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-200 dark:border-red-800 font-medium"></div>
                    </div>
                </details>

                <!-- АККОРДЕОН 4: ТОП ФОТО -->
                ${_getSetting('anaOpTopDefects') ? `
                <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></circle></svg>
                            ТОП-5 Дефектов и Эталонов
                        </span>
                        <span class="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 flex flex-col gap-3 rounded-b-2xl">
                        <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                            <h3 class="margin-0 mb-3 font-bold text-[10px] text-red-600 dark:text-red-400 uppercase border-b border-red-200 dark:border-red-800 pb-2 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Критические дефекты (B3)</h3>
                            ${renderUIPhotoCards(topB3, true)}
                        </div>
                        <div class="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                            <h3 class="margin-0 mb-3 font-bold text-[10px] text-orange-600 dark:text-orange-400 uppercase border-b border-orange-200 dark:border-orange-800 pb-2 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Повторяющиеся нарушения (B2)</h3>
                            ${renderUIPhotoCards(topB2, false)}
                        </div>
                        <div class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                            <h3 class="margin-0 mb-3 font-bold text-[10px] text-green-600 dark:text-green-400 uppercase border-b border-green-200 dark:border-green-800 pb-2 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Эталонные работы (OK)</h3>
                            ${renderUIPhotoCards(topOK, false, true)}
                        </div>
                    </div>
                </details>
                ` : ''}

                <!-- АККОРДЕОН 5: УПРАВЛЕНЧЕСКОЕ РЕШЕНИЕ -->
                <details class="${isGlobalDanger ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'} border rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                    <summary class="p-3.5 font-bold text-[11px] ${isGlobalDanger ? 'text-orange-800 dark:text-orange-500' : 'text-green-800 dark:text-green-500'} uppercase tracking-widest cursor-pointer flex justify-between items-center rounded-2xl transition-colors select-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
                            Управленческое Решение
                        </span>
                        <span class="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div class="p-4 border-t ${isGlobalDanger ? 'border-orange-200 dark:border-orange-800' : 'border-green-200 dark:border-green-800'} rounded-b-2xl">
                        <div class="flex justify-between items-center mb-3">
                            <div class="text-[10px] font-bold uppercase opacity-70">Стратегия действий</div>
                            <div class="flex gap-2">
                                <button onclick="window.RBI.services.ai.generateOnePagerForecastAi('${pdcaKey}')" class="text-[9px] font-bold bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded shadow-sm active:scale-95 flex items-center gap-1.5"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> AI-Анализ</button>
                                <button onclick="editExpertText('${pdcaKey}', 'hidden_pdca_text')" class="text-[9px] font-bold bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded shadow-sm active:scale-95 flex items-center gap-1.5"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Изменить</button>
                            </div>
                        </div>
                        <textarea id="hidden_pdca_text" class="hidden">${rawPdcaText}</textarea>
                        <div class="text-[12px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">${uiPdcaText}</div>
                    </div>
                </details>

            </div>
        `;

        setTimeout(() => {
            const ctxSpark = document.getElementById('op-sparkline-chart');
            if (ctxSpark) {
                if (_chartInstances()['op-sparkline-chart']) _chartInstances()['op-sparkline-chart'].destroy();
                _chartInstances()['op-sparkline-chart'] = new Chart(ctxSpark.getContext('2d'), {
                    type: 'line',
                    data: { labels: sparkLabels, datasets: [{ data: sparkData, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.2)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4, spanGaps: true }] },
                    options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } }, layout: { padding: 0 } }
                });
            }

            const ctxLine = document.getElementById('op-line-chart');
            if (ctxLine) {
                const trendData = window.buildTrendChartData(data, 'contractorName', activeLineFilters, window.trendGroupings.onepager || 'MONTH');
                trendData.datasets.forEach(ds => { ds.borderWidth = 2; ds.pointRadius = 2; });

                if (_chartInstances()['op-line-chart']) _chartInstances()['op-line-chart'].destroy();
                _chartInstances()['op-line-chart'] = new Chart(ctxLine.getContext('2d'), {
                    type: 'line',
                    data: trendData,
                    options: {
                        animation: false,
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { min: 0, max: 100, ticks: { font: { size: 9 } } },
                            x: { ticks: { font: { size: 9 } } }
                        },
                        plugins: {
                            legend: { position: 'right', labels: { boxWidth: 8, font: { size: 8 } } },
                            title: {
                                display: isTruncatedForChart,
                                text: 'Отображен ТОП-5 лучших и ТОП-5 худших подрядчиков',
                                color: '#94a3b8',
                                font: { size: 10, weight: 'bold' },
                                padding: { bottom: 5 }
                            }
                        }
                    }
                });
            }
        }, 100);
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: глобальная сводка (Company
    // Dashboard с трендами и ПК СК).
    // =========================================================================
    renderGlobalOnePager(data, container) {
        var _allInspections = _inspections();
        if (data.length === 0) {
            container.innerHTML = `<div class="text-center text-slate-500 text-sm py-10 border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm mx-1">Нет данных для анализа компании</div>`;
            return;
        }

        let periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';

        // --- 1. РАСЧЕТ ПРЕДЫДУЩЕГО ПЕРИОДА ДЛЯ ТРЕНДОВ ---
        const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
        let prevData = [];
        const now = new Date();

        if (selPeriod === 'WEEK') {
            const startCurr = new Date(now); startCurr.setDate(now.getDate() - 7);
            const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 7);
            prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        } else if (selPeriod === 'MONTH') {
            const startCurr = new Date(now); startCurr.setDate(now.getDate() - 30);
            const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 30);
            prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        } else {
            // Если "Все время" или кастомный - берем первую половину базы как "прошлое"
            const half = Math.floor(data.length / 2);
            const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
            prevData = sortedData.slice(0, half);
        }

        // Вспомогательная функция для отрисовки мини-тренда
        const formatTrendInline = (curr, prev, inverse = false) => {
            if (!prev || isNaN(prev)) return '';
            let diff = parseFloat(curr) - parseFloat(prev);
            if (Math.abs(diff) < 0.01) return `<span class="text-slate-400 text-[9px] ml-1 font-black">▬ 0</span>`;
            const isGood = inverse ? diff < 0 : diff > 0;
            const color = isGood ? 'text-green-500' : 'text-red-500';
            const sign = diff > 0 ? '▲' : '▼';
            return `<span class="${color} text-[9px] ml-1 font-black">${sign}${Math.abs(diff).toFixed(Number.isInteger(diff) ? 0 : 2)}</span>`;
        };

        // --- 2. АГРЕГАЦИЯ ДАННЫХ ПО ОБЪЕКТАМ ---
        const projectsMap = {};
        data.forEach(item => { const pName = item.projectName || 'Без объекта'; if (!projectsMap[pName]) projectsMap[pName] = []; projectsMap[pName].push(item); });

        const prevProjectsMap = {};
        prevData.forEach(item => { const pName = item.projectName || 'Без объекта'; if (!prevProjectsMap[pName]) prevProjectsMap[pName] = []; prevProjectsMap[pName].push(item); });

        const projectsArray = Object.keys(projectsMap).map(pName => {
            const pData = projectsMap[pName];
            let pSumUrk = 0; let redZone = 0; let b3Found = 0; let pSumDoc = 0; let pCntDoc = 0;
            pData.forEach(i => {
                if (i.metrics) {
                    pSumUrk += Number(i.metrics.final) || 0;
                    b3Found += Number(i.metrics.n_B3_fail) || 0;
                    const docScore = _getDocumentaryScoreForItem(i);
                    if (docScore !== null && docScore !== undefined) { pSumDoc += docScore; pCntDoc++; }
                }
            });
            const pAvgUrk = pData.length > 0 ? Math.round(pSumUrk / pData.length) : 0;
            const pAvgDoc = pCntDoc > 0 ? Math.round(pSumDoc / pCntDoc) : null;
            const pMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(pData, _templates().getUserTemplates()) : null;
            const IKO = pMetrics ? pMetrics.IKO : "0.00";
            if (pMetrics) redZone = pMetrics.redZonePerc;

            // Данные прошлого периода
            const prevPData = prevProjectsMap[pName] || [];
            let pPrevAvgUrk = 0; let pPrevIKO = "0.00";
            if (prevPData.length > 0) {
                let ppSum = 0; prevPData.forEach(i => ppSum += (i.metrics?.final || 0));
                pPrevAvgUrk = Math.round(ppSum / prevPData.length);
                const ppMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevPData, _templates().getUserTemplates()) : null;
                if (ppMetrics) pPrevIKO = ppMetrics.IKO;
            }

            return { name: pName, data: pData, avgUrk: pAvgUrk, avgDoc: pAvgDoc, prevAvgUrk: pPrevAvgUrk, IKO: IKO, prevIKO: pPrevIKO, redZone, b3Found, count: pData.length };
        });

        projectsArray.sort((a, b) => parseFloat(b.IKO) - parseFloat(a.IKO)); // Худшие по ИКО наверх

        // --- 3. КАРТОЧКИ ОБЪЕКТОВ С ТРЕНДАМИ ---
        let cardsHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 mx-1">';
        projectsArray.forEach(p => {
            const ikoColor = parseFloat(p.IKO) >= 0.6 ? 'text-red-600 bg-red-50 border-red-200' : (parseFloat(p.IKO) >= 0.3 ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-green-600 bg-green-50 border-green-200');
            const urkColor = _urkGradientColor(p.avgUrk);
            const hasDoc = p.avgDoc !== null && p.avgDoc !== undefined;
            const docColor = hasDoc ? _urkGradientColor(p.avgDoc) : '';
            const docGap = hasDoc ? Math.abs(p.avgUrk - p.avgDoc) : 0;
            const docGapWarn = (hasDoc && docGap > 30) ? ` <span title="Большой разрыв между физикой и документацией (>30%)">⚠️</span>` : '';

            cardsHtml += `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm p-4 flex flex-col justify-between hover:border-indigo-300 transition-colors cursor-pointer active:scale-[0.98]" onclick="
                window.rbi_setAnalyticsProjectFilter('${p.name}');
                updateFilterButtonLabels();
                window.onepagerMode = 'local';
                renderCurrentAnalyticsTab();
            ">
                <div class="flex justify-between items-start mb-3">
                    <div class="text-[13px] font-black uppercase text-slate-800 dark:text-white leading-tight pr-2 break-words">${p.name}</div>
                    <div class="text-[10px] font-black px-2 py-0.5 rounded border ${ikoColor} shadow-sm shrink-0 flex items-center">
                        ИКО ${p.IKO} ${formatTrendInline(p.IKO, p.prevIKO, true)}
                    </div>
                </div>
                <div class="flex justify-between items-stretch mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div class="flex-1">
                        <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ур. качества (физика)</div>
                        <div class="text-2xl font-black leading-none flex items-center" style="color:${urkColor}">
                            ${p.avgUrk}% ${formatTrendInline(p.avgUrk, p.prevAvgUrk, false)}
                        </div>
                        <div class="text-[10px] font-bold mt-0.5" style="color:${hasDoc ? docColor : 'transparent'}">${hasDoc ? `Док ${p.avgDoc}%${docGapWarn}` : '&nbsp;'}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-[9px] font-bold text-slate-500 uppercase">Проверок: ${p.count}</div>
                        <div class="text-[9px] font-bold ${p.b3Found > 0 ? 'text-red-500' : 'text-slate-400'} uppercase mt-1">Крит. деф. (B3): ${p.b3Found}</div>
                    </div>
                </div>
            </div>`;
        });
        cardsHtml += '</div>';

        // --- 4. РЕЙТИНГ ИНЖЕНЕРОВ ПК СТРОЙКОНТРОЛЬ ---
        let skHrHtml = '';
        const skHrRecordsList = _getSkRecords();
        if (skHrRecordsList.length > 0) {
            const engMap = {};
            skHrRecordsList.forEach(r => {
                let baseName = r.inspector && r.inspector.trim() !== '' ? r.inspector.trim() : 'Не указан';
                if (!engMap[baseName]) engMap[baseName] = { total: 0, open: 0, overdue: 0, withCategory: 0 };

                engMap[baseName].total++;
                const isOpen = r.status && r.status.toLowerCase().includes('не устран');
                if (isOpen) engMap[baseName].open++;
                if (r.category && r.category !== 'Без категории') engMap[baseName].withCategory++;

                const deadline = r.deadline ? new Date(r.deadline) : null;
                if (deadline && isOpen && new Date() > deadline) engMap[baseName].overdue++;
            });

            const skEngArray = Object.keys(engMap).map(name => {
                const d = engMap[name];
                const overduePerc = d.total > 0 ? Math.round((d.overdue / d.total) * 100) : 0;
                const catPerc = d.total > 0 ? Math.round((d.withCategory / d.total) * 100) : 0;
                const kpi = Math.max(0, 100 - overduePerc + (catPerc === 100 ? 10 : 0));
                return { name, total: d.total, open: d.open, overduePerc, kpi };
            });

            skEngArray.sort((a, b) => b.kpi - a.kpi);

            skHrHtml = skEngArray.map((e, idx) => `
                <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div class="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${idx === 0 ? 'bg-orange-400 text-white shadow-sm' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'} shrink-0">${idx + 1}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">${e.name}</div>
                        <div class="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Выдано: ${e.total} | Просрочка: ${e.overduePerc}%</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">KPI</div>
                        <div class="text-[12px] font-black ${e.kpi >= 80 ? 'text-green-500' : (e.kpi >= 50 ? 'text-orange-500' : 'text-red-500')}">${e.kpi}</div>
                    </div>
                </div>
            `).join('');
        } else {
            skHrHtml = '<div class="text-[10px] text-center text-slate-400 py-4">Данные Стройконтроля не загружены</div>';
        }

        // --- 5. ГЛОБАЛЬНЫЕ РЕЙТИНГИ ПОДРЯДЧИКОВ И ИНЖЕНЕРОВ RBI ---
        const allContrMap = {};
        data.forEach(c => {
            const cKey = `${c.contractorName} [${c.projectName || 'Без объекта'}]`;
            if (!allContrMap[cKey]) allContrMap[cKey] = [];
            allContrMap[cKey].push(c);
        });

        let ratingData = [];
        for (let cKey in allContrMap) {
            if (allContrMap[cKey].length >= 3) {
                const m = _contractorMetricsCached(cKey, allContrMap[cKey]);
                if (m) ratingData.push({ name: cKey, val: m.finalC, isPrelim: m.count < 7 });
            }
        }
        ratingData.sort((a, b) => b.val - a.val);

        let hrHtml = '';
        {
            const hrStats = window.RBI.services.game.calculateManagerMetrics();
            hrHtml = hrStats.map((s, idx) => `
                <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div class="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${idx === 0 ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'} shrink-0">${idx + 1}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">${s.name}</div>
                        <div class="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Опыт: ${s.pi} XP | Инспекций: ${s.checks}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Impact</div>
                        <div class="text-[12px] font-black ${s.avgImpact > 0 ? 'text-green-500' : (s.avgImpact < 0 ? 'text-red-500' : 'text-slate-500')}">${s.avgImpact > 0 ? '+' : ''}${s.avgImpact.toFixed(1)}</div>
                    </div>
                </div>
            `).join('');
        }

        // --- 6. СБОРКА HTML (Аккордеоны) ---
        container.innerHTML = `
            <div class="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 mx-1 mt-2 flex justify-between items-center">
                <div>
                    <h2 class="text-[12px] font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Глобальная сводка (Компания)
                    </h2>
                    <div class="text-[9px] font-bold text-[var(--text-muted)] mt-1">Охват: ${data.length} проверок &bull; Период: <span class="text-indigo-500">${periodText}</span></div>
                </div>
            </div>

            ${cardsHtml}

            <div class="space-y-3 mx-1 pb-4">
                
                <!-- АНАЛИЗ ИИ -->
                <details class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                    <summary class="p-3.5 font-bold text-[11px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-indigo-100 transition-colors rounded-2xl select-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> 
                            Анализ портфеля (AI)
                        </span>
                        <span class="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div class="p-4 border-t border-indigo-100 dark:border-indigo-800 bg-white dark:bg-slate-800 rounded-b-2xl">
                        <div id="global-ai-text" class="text-[12px] leading-relaxed text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
                            ${_reports().getExpertConclusion('global_portfolio_ai') || 'Нажмите кнопку ниже для генерации отчета по всей компании.'}
                        </div>
                        <button onclick="window.RBI.services.ai.rbi_generateGlobalAi()" class="mt-4 w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сгенерировать резюме
                        </button>
                    </div>
                </details>
                <!-- ДВА РЕЙТИНГА ОБЪЕКТОВ РЯДОМ -->
                
                    
                    <!-- РЕЙТИНГ ОБЪЕКТОВ (Ср. УрК) -->
                    <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                        <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                            <span class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg> 
                                Рейтинг Объектов (УрК)
                            </span>
                            <span class="transition-transform group-open:rotate-180">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                            </span>
                        </summary>
                        <div class="p-4 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                            <div class="space-y-3 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                                ${[...projectsArray].sort((a, b) => b.avgUrk - a.avgUrk).map(p => `
                                    <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <div class="flex-1 min-w-0 pr-2">
                                            <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate" title="${p.name}">${p.name}</div>
                                            <div class="w-full h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden mt-1.5">
                                                <div class="h-full" style="width:${p.avgUrk}%; background-color:${_urkGradientColor(p.avgUrk)}"></div>
                                            </div>
                                        </div>
                                        <div class="text-right shrink-0 flex flex-col items-end justify-center">
                                            <div class="text-[14px] font-black leading-none" style="color:${_urkGradientColor(p.avgUrk)}">${p.avgUrk}%</div>
                                            <div class="flex items-center justify-end mt-1 h-3">${formatTrendInline(p.avgUrk, p.prevAvgUrk, false)}</div>
                                            ${(p.avgDoc !== null && p.avgDoc !== undefined) ? `<div class="text-[10px] font-bold" style="color:${_urkGradientColor(p.avgDoc)}">Док ${p.avgDoc}%</div>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </details>

                    <!-- АНТИРЕЙТИНГ ОБЪЕКТОВ (ИКО) -->
                    <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                        <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                            <span class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> 
                                Антирейтинг (ИКО)
                            </span>
                            <span class="transition-transform group-open:rotate-180">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                            </span>
                        </summary>
                        <div class="p-4 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                            <div class="space-y-3 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                                ${[...projectsArray].sort((a, b) => parseFloat(b.IKO) - parseFloat(a.IKO)).map(p => `
                                    <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <div class="flex-1 min-w-0 pr-2">
                                            <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate" title="${p.name}">${p.name}</div>
                                            <div class="text-[8px] font-bold text-slate-400 mt-1 uppercase">Крит. деф. (B3): ${p.b3Found} шт.</div>
                                        </div>
                                        <div class="text-right shrink-0 flex flex-col items-end justify-center">
                                            <div class="text-[14px] font-black leading-none ${parseFloat(p.IKO) >= 0.6 ? 'text-red-500' : (parseFloat(p.IKO) >= 0.3 ? 'text-orange-500' : 'text-green-500')}">${p.IKO}</div>
                                            <div class="flex items-center justify-end mt-1 h-3">${formatTrendInline(p.IKO, p.prevIKO, true)}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </details>
                    
                
                <!-- ГЛОБАЛЬНЫЕ ПОДРЯДЧИКИ -->
                <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> 
                            Глобальные Подрядчики (ИУрК)
                        </span>
                        <span class="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div class="p-4 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                        <div class="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                            ${ratingData.map(r => `
                                <div class="flex items-center gap-2">
                                    <div class="w-32 text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title="${r.name}">${r.name}</div>
                                    <div class="flex-1 h-2.5 bg-[var(--hover-bg)] rounded-full overflow-hidden border border-[var(--card-border)] relative">
                                        <div class="h-full ${r.val < 70 ? 'bg-red-500' : (r.val < 85 ? 'bg-orange-500' : 'bg-green-500')}" style="width:${r.val}%"></div>
                                    </div>
                                    <div class="w-10 text-right text-[11px] font-black ${r.val < 70 ? 'text-red-500' : (r.val < 85 ? 'text-orange-500' : 'text-green-500')}">${r.val}%</div>
                                </div>
                            `).join('') || '<div class="text-[10px] text-center text-slate-400">Нет данных</div>'}
                        </div>
                    </div>
                </details>

                <!-- ДВА РЕЙТИНГА ИНЖЕНЕРОВ РЯДОМ -->
                
                    
                    <!-- ИНЖЕНЕРЫ RBI -->
                    <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                        <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                            <span class="flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> 
                                Рейтинг Аудиторов RBI
                            </span>
                            <span class="transition-transform group-open:rotate-180">▼</span>
                        </summary>
                        <div class="p-4 border-t border-[var(--card-border)] bg-white dark:bg-slate-800 rounded-b-2xl">
                            ${hrHtml || '<div class="text-[10px] text-center text-slate-400">Нет данных по команде</div>'}
                        </div>
                    </details>

                    <!-- ИНЖЕНЕРЫ ПК СТРОЙКОНТРОЛЬ -->
                    <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                        <summary class="p-3.5 font-bold text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-2xl select-none">
                            <span class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> 
                                Рейтинг Инженеров (ПК СК)
                            </span>
                            <span class="transition-transform group-open:rotate-180">▼</span>
                        </summary>
                        <div class="p-4 border-t border-[var(--card-border)] bg-white dark:bg-slate-800 rounded-b-2xl">
                            ${skHrHtml}
                        </div>
                    </details>

                

            </div>
        `;
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: подвкладка «Детализация
    // подрядчика» (с Предиктивным ИИ).
    // =========================================================================
    showContractorDetailView(contractorName) {
        window.currentDetailedContractor = contractorName;
        document.getElementById('contractors-main-view').classList.add('hidden');
        document.getElementById('contractor-detail-view').classList.remove('hidden');
        document.getElementById('detail-view-title').innerText = contractorName;
        window.scrollTo(0, 0);

        const container = document.getElementById('contractor-detail-content');
        const data = getFilteredAnalyticsData().filter(c => {
            const projectLabel = c.project_display_name || c.projectName || c.project_canonical_key || 'Без объекта';
            return c.contractorName + ' [' + projectLabel + ']' === contractorName;
        });

        if (data.length === 0) { container.innerHTML = 'Ошибка данных'; return; }

        const m = getContractorMetrics(data, _templates().getUserTemplates());
        const workType = data[0].templateTitle;

        let cStageData = {}; let cFailCounts = {}; let cB3Counts = {};
        let sumB1 = 0, sumB2 = 0, sumB3 = 0;
        let allPhotosB3 = []; let allPhotosB2 = []; let allPhotosOK = [];

        data.forEach(unit => {
            if (unit.metrics) {
                sumB1 += Number(unit.metrics.n_B1_fail) || 0;
                sumB2 += Number(unit.metrics.n_B2_fail) || 0;
                sumB3 += Number(unit.metrics.n_B3_fail) || 0;
            }

            const tType = unit.templateKey ? unit.templateKey.split('_')[0] : '';
            const tKey = unit.templateKey ? unit.templateKey.replace(tType + '_', '') : '';
            const clGroups = tType === 'sys' && _getSystemTemplates()[tKey] ? _getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);

            if (unit.state) {
                Object.keys(unit.state).forEach(id => {
                    const s = unit.state[id];
                    let defName = "Дефект";
                    let parentStage = 'Прочее'; // Дефолтное имя, если не найдем

                    // Ищем реальную группу из чек-листа
                    clGroups.forEach(group => {
                        const found = group.items.find(x => String(x.id) === String(id));
                        if (found) { defName = found.n; parentStage = group.group || group.title || 'Прочее'; }
                    });

                    if (!cStageData[parentStage]) {
                        cStageData[parentStage] = { checks: 0, sumUrk: 0, ok: 0, fail: 0, b1: 0, b2: 0, b3: 0, _countedUnits: new Set() };
                    }

                    // Считаем уникальные проверки (чтобы не плюсовать УрК за каждый дефект)
                    if (!cStageData[parentStage]._countedUnits.has(unit.id)) {
                        cStageData[parentStage]._countedUnits.add(unit.id);
                        cStageData[parentStage].checks++;
                        cStageData[parentStage].sumUrk += (unit.metrics ? (Number(unit.metrics.final) || 0) : 0);
                    }

                    const photo = (unit.photos && unit.photos[id]) ? unit.photos[id] : null;

                    if (s === 'ok') {
                        cStageData[parentStage].ok++;
                        if (photo) allPhotosOK.push({ photo: photo, name: defName, contr: contractorName, date: new Date(unit.date).toLocaleDateString('ru-RU') });
                    }

                    if (s === 'fail' || s === 'fail_escalated') {
                        cStageData[parentStage].fail++;
                        const flatList = getFlatList(clGroups);
                        const foundItem = flatList.find(x => String(x.id) === String(id));
                        let isB3 = (s === 'fail_escalated') || (foundItem && foundItem.w === 3);

                        if (isB3) {
                            cStageData[parentStage].b3++;
                            if (!cB3Counts[defName]) cB3Counts[defName] = { count: 0, photo: null, name: defName };
                            cB3Counts[defName].count++;
                            if (photo) allPhotosB3.push({ photo: photo, name: defName, contr: contractorName, date: new Date(unit.date).toLocaleDateString('ru-RU') });
                        } else {
                            cStageData[parentStage].b2++;
                            if (!cFailCounts[defName]) cFailCounts[defName] = { count: 0, photo: null, name: defName };
                            cFailCounts[defName].count++;
                            if (photo) allPhotosB2.push({ photo: photo, name: defName, contr: contractorName, date: new Date(unit.date).toLocaleDateString('ru-RU') });
                        }
                    }
                });
            }
        });

        let stagesUIHtml = Object.keys(cStageData).map(k => {
            const d = cStageData[k];
            const avgUrk = Math.round(d.sumUrk / d.checks);
            return `<tr class="border-b border-[var(--card-border)] hover:bg-[var(--hover-bg)]">
                <td class="p-2 text-[10px] font-bold whitespace-normal">${k}</td>
                <td class="p-2 text-center text-[11px]">${d.checks}</td>
                <td class="p-2 text-center text-[11px] font-black ${avgUrk < 70 ? 'text-red-500' : (avgUrk < 85 ? 'text-orange-500' : 'text-green-600')}">${avgUrk}%</td>
                <td class="p-2 text-center text-[11px] text-green-600 font-bold">${d.ok}</td>
                <td class="p-2 text-center text-[11px] text-orange-500">${d.b2}</td>
                <td class="p-2 text-center text-[11px] text-red-600 font-black">${d.b3}</td>
            </tr>`;
        }).join('');
        // --- Генерируем HTML для списка дефектов ---
        let defectsListHtml = '';
        const allDefectsForList = [];
        Object.keys(cB3Counts).forEach(k => allDefectsForList.push({ name: k, count: cB3Counts[k].count, type: 'B3' }));
        Object.keys(cFailCounts).forEach(k => allDefectsForList.push({ name: k, count: cFailCounts[k].count, type: 'B2' }));

        allDefectsForList.sort((a, b) => b.count - a.count); // Сортируем по частоте

        if (allDefectsForList.length > 0) {
            defectsListHtml = allDefectsForList.map(d => `
                <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 py-2 last:border-0">
                    <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 pr-4 leading-snug">${d.name}</div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="text-[9px] font-black px-1.5 py-0.5 rounded ${d.type === 'B3' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}">${d.type}</span>
                        <span class="text-[11px] font-black text-slate-500 w-8 text-right">${d.count} шт</span>
                    </div>
                </div>
            `).join('');
        } else {
            defectsListHtml = '<div class="text-center text-slate-400 text-[10px] font-bold py-2">Дефектов B2 и B3 не зафиксировано</div>';
        }
        const totalDefects = sumB1 + sumB2 + sumB3;
        const pB1 = totalDefects > 0 ? Math.round((sumB1 / totalDefects) * 100) : 0;
        const pB2 = totalDefects > 0 ? Math.round((sumB2 / totalDefects) * 100) : 0;
        const pB3 = totalDefects > 0 ? Math.round((sumB3 / totalDefects) * 100) : 0;

        let mathBreakdown = `
            <div class="text-[11px] space-y-2 text-slate-700 dark:text-slate-300">
                <p>Система рассчитала Интегральный УрК на основе ${data.length} последних проверок.</p>
                <div class="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                    Средний балл по изделиям (до штрафов): <b>${m.baseUrkContrPerc}%</b>
                </div>
                <p><b>Применены следующие штрафные коэффициенты:</b></p>
                <ul class="list-disc pl-4 space-y-1">
                    <li><span class="${m.ks < 1 ? 'text-red-500 font-bold' : 'text-green-600'}">Ks = ${m.ks.toFixed(2)}</span> (Системность). Отражает повторяемость одного и того же дефекта B2. В данном случае максимальная частота повтора: ${m.maxFailRate.toFixed(1)}%.</li>
                    <li><span class="${m.kcritC < 1 ? 'text-red-500 font-bold' : 'text-green-600'}">KB3 = ${m.kcritC.toFixed(2)}</span> (Критичность). Отражает частоту появления аварийных дефектов B3. Доля проверок с B3: ${m.rateB3.toFixed(1)}%.</li>
                </ul>
                ${(m.ks < 1 || m.kcritC < 1) && m.finalC === 84 ? `<div class="bg-orange-50 text-orange-800 p-2 rounded mt-2 border border-orange-200">⚠️ Сработало правило "Стеклянного потолка" (Cap84). Из-за наличия системных или критических нарушений, итоговая оценка обрезана до 84%.</div>` : ''}
                <p class="mt-2 border-t pt-2 border-slate-200"><b>Вывод для инженера:</b> ${m.reason}</p>
            </div>
        `;

        const expertObj = getExpertConclusion(m, contractorName, workType, data.length, contractorName.replace(/\W/g, '_'), _reports().getExpertConclusions());
        const expertUiHtml = expertObj.uiHtml;
        const safeContractorNameForHtml = contractorName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        // --- РАСЧЕТ ДАННЫХ ПК СТРОЙКОНТРОЛЬ ДЛЯ ДАННОГО ПОДРЯДЧИКА ---
        let skTotal = 0, skOpen = 0, skOverdue = 0;
        let skHtmlBlock = '';
        const skDetailRecordsList = _getSkRecords();
        if (skDetailRecordsList.length > 0) {
            const cleanCName = contractorName.split(' [')[0];
            const skDetailContractorMap = _getSkContractorMap();
            const cRecords = skDetailRecordsList.filter(r =>
                r.contractor === cleanCName ||
                r.raw_contractor === cleanCName ||
                (skDetailContractorMap && skDetailContractorMap[r.raw_contractor] === cleanCName)
            );
            skTotal = cRecords.length;
            cRecords.forEach(r => {
                const isOpen = r.status && r.status.toLowerCase().includes('не устран');
                if (isOpen) skOpen++;
                if (r.deadline && new Date() > new Date(r.deadline) && isOpen) skOverdue++;
            });
            if (skTotal > 0) {
                const overdueColor = skOverdue > 3 ? 'text-red-600' : (skOverdue > 0 ? 'text-orange-500' : 'text-green-600');
                skHtmlBlock = `
                    <div class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-3 shadow-sm mb-4">
                        <div class="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">📑 Данные ПК Стройконтроль</div>
                        <div class="flex justify-between items-center bg-white dark:bg-slate-800 rounded-lg p-2 border border-blue-100 dark:border-blue-800">
                            <div class="text-center flex-1 border-r border-slate-100">
                                <div class="text-[9px] font-bold text-slate-400 uppercase mb-1">Всего замеч.</div>
                                <div class="text-xl font-black text-slate-700 dark:text-slate-300">${skTotal}</div>
                            </div>
                            <div class="text-center flex-1 border-r border-slate-100">
                                <div class="text-[9px] font-bold text-slate-400 uppercase mb-1">Открыто</div>
                                <div class="text-xl font-black ${skOpen > 0 ? 'text-red-500' : 'text-green-500'}">${skOpen}</div>
                            </div>
                            <div class="text-center flex-1">
                                <div class="text-[9px] font-bold text-slate-400 uppercase mb-1">Просрочено</div>
                                <div class="text-xl font-black ${overdueColor}">${skOverdue}</div>
                            </div>
                        </div>
                    </div>`;
            }
        }

        container.innerHTML = `
        ${skHtmlBlock}
            <!-- КНОПКА ПЕЧАТИ С ЗАЩИТОЙ -->
            ${m.count < 7
                ? `<button onclick="showToast('Слишком мало данных для отчета. Проведите минимум 7 проверок.')" class="w-full mb-4 bg-slate-300 text-slate-500 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-none cursor-not-allowed flex justify-center items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> Отчет недоступен (Мало данных)
                   </button>`
                : `<button onclick="exportPersonalContractorReport('${safeContractorNameForHtml}')" class="w-full mb-4 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"></path></svg> Отправить Отчет Подрядчику
                   </button>`
            }

            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm mb-4">
                <div class="flex justify-between items-start mb-3 border-b border-[var(--card-border)] pb-3">
                    <div class="bg-[var(--hover-bg)] p-2 rounded-xl border border-[var(--card-border)] shadow-sm flex flex-col justify-center min-h-[70px]">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">Надежность (ИУрК)</div>
                        ${m.count < 7
                ? `<div class="text-[12px] font-black text-slate-500 uppercase leading-tight">Проведите минимум 7 проверок<br><span class="text-indigo-500">Собрано: ${m.count} из 7</span></div>`
                : `<div class="text-5xl font-black leading-none ${m.finalC < 70 ? 'text-red-600' : (m.finalC < 85 ? 'text-orange-500' : 'text-green-600')}">${m.finalC}%</div>`
            }
                    </div>
                    <div class="text-right">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block border border-[var(--card-border)] px-1.5 py-0.5 rounded mb-1 ${m.confCls}">${m.confStatus}</span>
                        <span class="text-[12px] font-black text-slate-700 dark:text-slate-300 block">Ср. УрК Изд: ${m.baseUrkContrPerc}%</span>
                        ${(m.documentaryC !== null && m.documentaryC !== undefined) ? `<span class="text-[12px] font-black text-indigo-500 block">УрК Докум: ${m.documentaryC}%</span>` : ''}
                        <div class="text-[10px] font-bold text-slate-500 mt-1">Погрешность: ± ${m.ci95_margin.toFixed(1)}%</div>
                    </div>
                </div>
                ${(m.count >= 7 && m.documentaryC !== null && m.documentaryC !== undefined && Math.abs(m.finalC - m.documentaryC) > 30) ? `<div class="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-[10px] font-bold p-2 rounded-lg border border-orange-200 dark:border-orange-800 mb-3 flex items-center gap-1.5">⚠️ Разрыв между физикой (${m.finalC}%) и документацией (${m.documentaryC}%) — ${Math.abs(m.finalC - m.documentaryC)} п.п.</div>` : ''}
                
                <div class="grid grid-cols-4 gap-2 mb-3 text-center">
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Выборка</div><div class="font-black text-sm">${m.count}</div></div>
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Стаб-ть</div><div class="font-black text-sm ${m.stabColor}">${m.stabilityIndex}</div></div>
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Ks</div><div class="font-black text-sm ${m.ks < 1 ? 'text-red-500' : 'text-slate-700'}">${m.ks.toFixed(2)}</div></div>
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Kcrit</div><div class="font-black text-sm ${m.kcritC < 1 ? 'text-red-500' : 'text-slate-700'}">${m.kcritC.toFixed(2)}</div></div>
                </div>

                <div class="flex h-3 rounded-full overflow-hidden border border-[var(--card-border)]">
                    <div class="bg-blue-500" style="width: ${pB1}%"></div>
                    <div class="bg-orange-500" style="width: ${pB2}%"></div>
                    <div class="bg-red-500" style="width: ${pB3}%"></div>
                </div>
                <div class="flex justify-between text-[9px] font-bold text-slate-500 mt-1.5 px-1 uppercase tracking-wider">
                    <span class="bg-blue-50 text-blue-700 px-2 rounded border border-blue-100">B1: ${sumB1}</span>
                    <span class="bg-orange-50 text-orange-700 px-2 rounded border border-orange-100">B2: ${sumB2}</span>
                    <span class="bg-red-50 text-red-700 px-2 rounded border border-red-100">B3: ${sumB3}</span>
                </div>
            </div>
            
            <!-- НОВЫЙ БЛОК: ПРЕДИКТИВНЫЙ ИИ ПРОГНОЗ -->
            <details class="bg-[var(--card-bg)] border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[11px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 transition-colors">
                    <span class="flex items-center gap-2">🔮 Предиктивный прогноз (AI)</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="border-t border-indigo-100 dark:border-indigo-800 p-4 bg-white dark:bg-slate-800">
                    <div id="ai-forecast-container">
                        <button onclick="window.RBI.services.ai.generateContractorForecastAi('${safeContractorNameForHtml}')" class="w-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm border border-slate-200 dark:border-slate-600 transition-transform">🤖 Рассчитать прогноз на 2 недели</button>
                    </div>
                </div>
            </details>

            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">📝 Классическое заключение (PDCA)</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="border-t border-[var(--card-border)] p-1">
                    ${expertUiHtml}
                </div>
            </details>
            
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">🏅 Культура качества (AI)</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                    <button onclick="window.RBI.services.ai.generateCultureAi('${safeContractorNameForHtml}')" class="w-full bg-white border border-indigo-200 text-indigo-700 py-2.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 mb-2">🤖 Оценить вовлеченность</button>
                    <div id="culture-ai-text" class="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                        ${_reports().getExpertConclusion(`culture_${contractorName}`) || 'Нажмите кнопку для генерации оценки вовлеченности подрядчика.'}
                    </div>
                </div>
            </details>

            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">⚙️ Разбор оценки от Системы</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                    ${mathBreakdown}
                </div>
            </details>

            <div class="flex flex-col gap-4 mb-4">
                <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary class="p-3 font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                        <span>📉 Динамика по проверкам</span><span>▼</span>
                    </summary>
                    <div class="p-3 border-t border-[var(--card-border)]">
                        <div style="height: 160px; position: relative;"><canvas id="chart_detail_line"></canvas></div>
                    </div>
                </details>
                
                <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary class="p-3 font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                        <span>📑 Качество по этапам СМР</span><span>▼</span>
                    </summary>
                    <div class="overflow-x-auto border-t border-[var(--card-border)]">
                        <table class="w-full text-left whitespace-nowrap">
                            <thead class="bg-slate-50 dark:bg-slate-900/50 text-[9px] text-[var(--text-muted)] border-b border-[var(--card-border)] uppercase tracking-wider">
                                <tr><th class="p-2 pl-3">Этап</th><th class="p-2 text-center">Пров.</th><th class="p-2 text-center">УрК</th><th class="p-2 text-center text-green-600">OK</th><th class="p-2 text-center text-orange-500">B2</th><th class="p-2 text-center text-red-600">B3</th></tr>
                            </thead>
                            <tbody class="divide-y divide-[var(--card-border)]">${stagesUIHtml}</tbody>
                        </table>
                    </div>
                </details>
            </div>
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">📋 Реестр частых дефектов</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                    ${defectsListHtml}
                </div>
            </details>
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span class="flex items-center gap-2">📸 Фотогалереи (Брак и Эталоны)</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 space-y-4">
                    <div>
                        <h3 class="text-[10px] font-black text-red-600 uppercase mb-2">Критический брак (B3)</h3>
                        ${allPhotosB3.length > 0 ? AnalyticsRender.initPhotoGallery('det_b3', allPhotosB3, true) : '<div class="text-xs text-slate-400">Нет фото B3</div>'}
                    </div>
                    <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <h3 class="text-[10px] font-black text-orange-600 uppercase mb-2">Значимые дефекты (B2)</h3>
                        ${allPhotosB2.length > 0 ? AnalyticsRender.initPhotoGallery('det_b2', allPhotosB2, false) : '<div class="text-xs text-slate-400">Нет фото B2</div>'}
                    </div>
                    <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <h3 class="text-[10px] font-black text-green-600 uppercase mb-2">Эталонные работы (OK)</h3>
                        ${allPhotosOK.length > 0 ? AnalyticsRender.initPhotoGallery('det_ok', allPhotosOK, false, 'text-green-700 bg-green-100 border-green-200', 'OK') : '<div class="text-xs text-slate-400">Нет фото эталонов</div>'}
                    </div>
                </div>
            </details>
            
        `;

        setTimeout(() => {
            const ctxL = document.getElementById('chart_detail_line')?.getContext('2d');
            if (ctxL) {
                _chartInstances()['chart_detail_line'] = new Chart(ctxL, {
                    type: 'line',
                    data: { labels: data.map((_, i) => `#${i + 1}`), datasets: [{ data: data.map(item => item.metrics.final), borderColor: '#4f46e5', backgroundColor: '#4f46e5', tension: 0.3, borderWidth: 2, pointRadius: 3 }] },
                    options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } },
                    plugins: [{
                        id: 'targetZone',
                        beforeDraw: (chart) => {
                            const { ctx, chartArea: { left, right }, scales: { y } } = chart;
                            ctx.save();
                            ctx.fillStyle = 'rgba(34, 197, 94, 0.08)'; ctx.fillRect(left, y.getPixelForValue(100), right - left, y.getPixelForValue(85) - y.getPixelForValue(100));
                            ctx.fillStyle = 'rgba(234, 179, 8, 0.08)'; ctx.fillRect(left, y.getPixelForValue(85), right - left, y.getPixelForValue(70) - y.getPixelForValue(85));
                            ctx.restore();
                        }
                    }]
                });
            }
        }, 50);
    },

    hideContractorDetailView() {
        window.currentDetailedContractor = null;
        document.getElementById('contractors-main-view').classList.remove('hidden');
        document.getElementById('contractor-detail-view').classList.add('hidden');
        window.scrollTo(0, 0);
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: старый рейтинг (оставлен для
    // совместимости, если где-то вызывается).
    // =========================================================================
    renderRatingTab() {
        const listDiv = document.getElementById('rating-list');
        const emptyMsg = document.getElementById('rating-empty-msg');
        if (!listDiv) return;

        const data = getFilteredAnalyticsData();

        if (data.length === 0) { listDiv.innerHTML = ''; emptyMsg.style.display = 'block'; return; }
        emptyMsg.style.display = 'none';

        const grouped = {};
        data.forEach(item => { const cName = item.contractorName || 'Не указан'; if (!grouped[cName]) grouped[cName] = []; grouped[cName].push(item); });

        const ratingData = [];
        for (let cName in grouped) {
            const metrics = getContractorMetrics(grouped[cName], _templates().getUserTemplates());
            if (metrics) ratingData.push({ name: cName, metrics: metrics });
        }

        if (ratingData.length === 0) {
            listDiv.innerHTML = '<p class="text-sm text-[var(--text-muted)] text-center bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-xl shadow-sm">Недостаточно данных. Для рейтинга нужно минимум 3 проверки по одному виду работ.</p>';
            return;
        }

        ratingData.sort((a, b) => {
            if (b.metrics.finalC !== a.metrics.finalC) return b.metrics.finalC - a.metrics.finalC;
            if (b.metrics.stabilityIndex !== a.metrics.stabilityIndex) return b.metrics.stabilityIndex - a.metrics.stabilityIndex;
            return a.metrics.rateB3 - b.metrics.rateB3;
        });

        listDiv.innerHTML = ratingData.map((r, index) => {
            const isGold = index === 0; const isSilver = index === 1; const isBronze = index === 2;
            const rankClass = isGold ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-500' : (isSilver ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-400' : (isBronze ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'));

            return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 mb-4 shadow-sm relative overflow-hidden">
                ${isGold ? '<div class="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[8px] font-black px-3 py-1 rounded-bl-lg uppercase shadow-sm z-10">🏆 Лидер</div>' : ''}
                <div class="flex items-start gap-3 border-b border-[var(--card-border)] pb-3 mb-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-inner shrink-0 border ${rankClass}">${index + 1}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[14px] font-black leading-tight truncate text-slate-800 dark:text-white">${r.name}</div>
                        <span class="${r.metrics.confCls} mt-1 inline-block px-1.5 py-0.5 rounded border text-[8px] uppercase tracking-wide">${r.metrics.confStatus} (Выборка: ${r.metrics.count})</span>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-3xl font-black leading-none ${r.metrics.finalC < 70 ? 'text-red-600' : (r.metrics.finalC < 85 ? 'text-orange-500' : 'text-green-600')}">${r.metrics.finalC}%</div>
                        ${(r.metrics.documentaryC !== null && r.metrics.documentaryC !== undefined) ? `<div class="text-[10px] font-black text-indigo-500 leading-none mt-0.5">Док: ${r.metrics.documentaryC}%</div>` : ''}
                        <span class="${r.metrics.riskCls} text-[9px] uppercase block mt-1 font-bold">${r.metrics.riskStatus}</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[10px] font-bold mb-3 pb-3 border-b border-[var(--card-border)]">
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center"><span class="text-[var(--text-muted)]">Доля B3:</span> <span class="${r.metrics.rateB3 > 0 ? 'text-red-600' : 'text-green-600'}">${r.metrics.rateB3.toFixed(1)}%</span></div>
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center"><span class="text-[var(--text-muted)]">Повтор B2:</span> <span class="${r.metrics.maxFailRate >= 20 ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'}">${r.metrics.maxFailRate.toFixed(1)}%</span></div>
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center cursor-help" title="${r.metrics.stabDesc}"><span class="text-[var(--text-muted)] border-b border-dashed border-slate-300">Индекс стаб.:</span> <span class="font-black ${r.metrics.stabColor}">${r.metrics.stabilityIndex} <span class="text-[8px] uppercase font-bold">(${r.metrics.stabText})</span></span></div>
                    <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center"><span class="text-[var(--text-muted)]">Волатильность:</span> <span class="${r.metrics.volatility > 15 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}">${r.metrics.volatility.toFixed(1)}</span></div>
                </div>
                <div class="text-[10px] font-bold ${r.metrics.finalC < 70 || r.metrics.n_изделий_с_B3 > 0 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20' : (r.metrics.finalC < 85 ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20' : 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20')} p-2.5 rounded-lg border shadow-sm leading-snug">
                    <span class="uppercase text-[9px] block mb-0.5 opacity-70">Основание:</span> ${r.metrics.reason}
                </div>
            </div>`;
        }).join('');
    },

    // =========================================================================
    // Перенесено из analytics.legacy.js: система фотогалерей
    // (горизонтальная лента с поддержкой ОК).
    // =========================================================================
    initPhotoGallery(galleryId, photosArray, isCrit, customBadgeClass = null, customBadgeText = null) {
        if (!photosArray || photosArray.length === 0) return '<div class="text-xs text-slate-400">Нет фото</div>';

        const badgeColor = customBadgeClass ? customBadgeClass : (isCrit ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200');
        const badgeText = customBadgeText ? customBadgeText : (isCrit ? 'B3' : 'B2');

        const cardsHtml = photosArray.map(d => `
            <div class="snap-start shrink-0 w-36 sm:w-48 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden flex flex-col shadow-sm">
                <img src="${d.photo}" class="w-full h-24 sm:h-32 object-cover border-b border-[var(--card-border)] cursor-pointer active:scale-95 transition-transform" onclick="openPhotoViewer('${d.photo}')" loading="lazy">
                <div class="p-2 flex-1 flex flex-col justify-between">
                    <div class="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 mb-1.5" title="${d.name}">${d.name}</div>
                    <div>
                        <div class="text-[8px] text-[var(--text-muted)] mb-1 truncate w-full" title="${d.contr}">👤 ${d.contr}</div>
                        <div class="flex justify-between items-center">
                            <span class="${badgeColor} text-[8px] font-black px-1.5 rounded border">${badgeText}</span>
                            <span class="text-[8px] font-bold text-slate-400">${d.date}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div id="gallery-wrap-${galleryId}" class="w-full relative">
                <div class="flex gap-3 overflow-x-auto snap-x custom-scrollbar pb-4 pt-1">
                    ${cardsHtml}
                </div>
            </div>
        `;
    },

    // Пустая заглушка, чтобы не сломать старые HTML-кнопки (если они где-то остались в истории)
    loadMorePhotos() { },

    // =========================================================================
    // Перенесено из analytics.legacy.js: список отчётов (архив, вкладка
    // История → Отчёты).
    // =========================================================================
    renderReportsList() {
        const listDiv = document.getElementById('reports-list');
        if (!listDiv) return;

        if (_reports().getAllSync().length === 0) {
            listDiv.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] shadow-sm">Сохраненных отчетов пока нет.</div>`;
            return;
        }

        // Считываем текущие глобальные фильтры
        const fSearch = document.getElementById('hist-search-text')?.value.toLowerCase() || '';
        const fPeriod = document.getElementById('hist-filter-period')?.value || 'ALL';

        const fProj = _historyFilters().project || [];
        const fContr = _historyFilters().contractor || [];
        const fInsp = _historyFilters().inspector || [];

        // Применяем фильтры
        let filteredArr = [..._reports().getAllSync()].filter(r => !r.is_deleted);
        const now = new Date();

        if (fSearch) {
            filteredArr = filteredArr.filter(r =>
                (r.title && r.title.toLowerCase().includes(fSearch)) ||
                (r.metadata?.project && r.metadata.project.toLowerCase().includes(fSearch))
            );
        }

        if (fProj.length > 0) {
            filteredArr = filteredArr.filter(r => {
                const p = r.metadata?.project || '';
                // Отчет может быть "Все объекты" или конкретный. Если "Все", показываем, иначе сверяем.
                return p.includes('Все объекты') || fProj.includes(p) || fProj.some(proj => p.includes(proj));
            });
        }

        if (fContr.length > 0) {
            // Подрядчик обычно пишется в названии отчета
            filteredArr = filteredArr.filter(r => {
                const t = r.title || '';
                return fContr.some(c => t.includes(c));
            });
        }

        if (fInsp.length > 0) {
            // Ищем по автору отчета
            filteredArr = filteredArr.filter(r => fInsp.includes(r.created_by));
        }

        if (fPeriod === 'DAY') filteredArr = filteredArr.filter(i => new Date(i.generated_at).toDateString() === now.toDateString());
        else if (fPeriod === 'WEEK') { const w = new Date(); w.setDate(now.getDate() - 7); filteredArr = filteredArr.filter(i => new Date(i.generated_at) >= w); }
        else if (fPeriod === 'MONTH') { const m = new Date(); m.setDate(now.getDate() - 30); filteredArr = filteredArr.filter(i => new Date(i.generated_at) >= m); }

        if (filteredArr.length === 0) {
            listDiv.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] shadow-sm">По выбранным фильтрам отчетов не найдено.</div>`;
            return;
        }

        // Сортировка по дате (самые свежие сверху)
        const sorted = filteredArr.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));

        // Сетка: 2 колонки на телефоне, 3-4 на ПК
        listDiv.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">` + sorted.map(r => {
            const syncBadge = getSyncBadgeHtml(r);
            const isOwner = !r.created_by || r.created_by === (_getSetting('engineerName') || 'Инженер');

            return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openReport('${r.id}')">
            <!-- Чекбокс для массового удаления -->
                <input type="checkbox" class="report-checkbox absolute top-2 left-2 w-5 h-5 accent-indigo-600 rounded cursor-pointer z-10" value="${r.id}" onclick="event.stopPropagation()">
                
                <div class="h-24 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    <div class="w-12 h-14 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-1.5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 right-0 h-4 bg-indigo-500 flex items-center justify-center"><span class="text-[7px] text-white font-black tracking-widest">PDF</span></div>
                        <div class="space-y-1 mt-5">
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                        </div>
                    </div>
                    
                    <!-- Меню 3 точки -->
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${r.id}', 'report', '${r.title.replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-transform">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                </div>
                
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 truncate">${r.metadata?.project || 'Сводный Отчет'}</div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white leading-tight mb-2 line-clamp-2">${r.title}</div>
                    <div class="text-[9px] font-bold text-slate-400 truncate mb-0.5">👤 ${r.created_by || 'Инженер'}</div>
                    ${r.metadata?.period ? `<div class="text-[9px] font-bold text-slate-400 truncate mb-1">📅 ${r.metadata.period}</div>` : ''}

                    <div class="mt-auto pt-2 flex justify-between items-center">
                        <div class="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                            ${((r.file_size || 0) / 1024 / 1024).toFixed(2)} MB
                            ${syncBadge}
                        </div>
                        <div class="text-[9px] font-black text-slate-400">${new Date(r.generated_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                </div>
                
            </div>
            `;
        }).join('') + `</div>`;
    }
};

if (typeof window !== 'undefined') {
    window.AnalyticsRender = AnalyticsRender;

    // =========================================================================
    // МОНТАЖ РАЗМЕТКИ ВКЛАДКИ «АНАЛИТИКА» (перенос из index.html:619-974,
    // Блок 2 инициативы «Перенос статичной разметки quality в JS-рендер»).
    // По прецеденту Блока 1/N (`audit`) — на верхнем уровне модуля, до
    // DOMContentLoaded. Grep подтвердил отсутствие top-level bootstrap:*-
    // подписок в файлах фичи — тайминг здесь не критичен, но паттерн
    // сохранён для консистентности.
    // =========================================================================
    (function mountAnalyticsMarkup() {
        if (document.getElementById('tab-analytics')) return;
        var root = window.RBI && window.RBI.services && window.RBI.services.shell
            ? window.RBI.services.shell.getContentRoot()
            : document.getElementById('app-content');
        if (!root) return;
        root.insertAdjacentHTML('beforeend', AnalyticsRender.renderMarkup());
    }());

    // =========================================================================
    // WINDOW-ПРОКСИ (обратная совместимость: index.html inline-обработчики,
    // динамически генерируемый HTML — onclick в строках, генерируемых
    // renderContractorsSubTab/showContractorDetailView/renderReportsList).
    // =========================================================================
    window.renderCurrentAnalyticsTab = AnalyticsRender.renderCurrentAnalyticsTab.bind(AnalyticsRender);
    window.renderAnalyticsModeSwitcher = AnalyticsRender.renderAnalyticsModeSwitcher.bind(AnalyticsRender);
    window.renderOnePagerModeToggle = AnalyticsRender.renderOnePagerModeToggle.bind(AnalyticsRender);
    window.updateAnalyticsFilters = AnalyticsRender.updateAnalyticsFilters.bind(AnalyticsRender);
    window.renderContractorsSubTab = AnalyticsRender.renderContractorsSubTab.bind(AnalyticsRender);
    window.renderContractorsListOnly = AnalyticsRender.renderContractorsListOnly.bind(AnalyticsRender);
    window.renderOnePagerSubTab = AnalyticsRender.renderOnePagerSubTab.bind(AnalyticsRender);
    window.renderGlobalOnePager = AnalyticsRender.renderGlobalOnePager.bind(AnalyticsRender);
    window.showContractorDetailView = AnalyticsRender.showContractorDetailView.bind(AnalyticsRender);
    window.hideContractorDetailView = AnalyticsRender.hideContractorDetailView.bind(AnalyticsRender);
    window.renderRatingTab = AnalyticsRender.renderRatingTab.bind(AnalyticsRender);
    window.initPhotoGallery = AnalyticsRender.initPhotoGallery.bind(AnalyticsRender);
    window.loadMorePhotos = AnalyticsRender.loadMorePhotos.bind(AnalyticsRender);
    window.renderReportsList = AnalyticsRender.renderReportsList.bind(AnalyticsRender);
}

console.log('[AnalyticsRender] analytics.render.js loaded (owner-module: full render logic)');
