/* Файл: js/modules/quality/features/shared/multi-filter.js */
/* Мульти-фильтры (модалка Объект/Подрядчик/Инспектор/Вид работ) — общая логика для features quality/history и quality/analytics */

// === МУЛЬТИ-ФИЛЬТРЫ (ЛОГИКА МОДАЛКИ С ПРАВАМИ ДОСТУПА) ===
let _ctx = null;
function bindCtx(ctx) {
    _ctx = ctx;
    bindMultiFilterActionDelegation();
}
window.MultiFilterShared = { bindCtx: bindCtx };

// Паттерн делегирования событий для инициативы «Разбор inline onclick/onchange»
// (см. _ai/INDEX_HTML_HANDLERS_MAP.md), namespace-per-module (data-multifilter-action).
// openMultiFilterModal(type, title, context) принимает 3 аргумента одновременно —
// передаются через один JSON-атрибут data-multifilter-action-args (не 2 отдельных
// ключа/arg2-type, как в других группах, т.к. аргументов 3, а не 2).
function bindMultiFilterActionDelegation() {
    if (window.__multiFilterActionDelegationBound) return;
    window.__multiFilterActionDelegationBound = true;

    const dispatch = (el) => {
        const action = el.dataset.multifilterAction;
        const fn = window[action];
        if (typeof fn !== 'function') return;
        const argsRaw = el.dataset.multifilterActionArgs;
        if (argsRaw) {
            let args = [];
            try { args = JSON.parse(argsRaw); } catch (e) { args = []; }
            fn.apply(null, args);
        } else {
            fn();
        }
    };

    const resolveActionElement = (target) => {
        let el = target;
        while (el && el.nodeType === 1) {
            if (el.dataset && el.dataset.multifilterAction) return el;
            const inlineOnclick = el.getAttribute && el.getAttribute('onclick');
            if (inlineOnclick && inlineOnclick.includes('stopPropagation')) return null;
            el = el.parentElement;
        }
        return null;
    };

    document.addEventListener('click', (e) => {
        const el = resolveActionElement(e.target);
        if (el) dispatch(el);
    }, true);
}

function _getSkRecords() {
    if (_ctx && _ctx.sk) {
        return _ctx.sk.getRecordsSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getRecordsSync();
    }
    return Array.isArray(window.skRecords) ? window.skRecords : [];
}

function _getAllInspections() {
    if (_ctx && _ctx.inspections) {
        return _ctx.inspections.getAllSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getAllSync();
    }
    return Array.isArray(window.contractorArray) ? window.contractorArray : [];
}

let activeMultiFilters = {
    history: { project: [], contractor: [], inspector: [] },
    analytics: { project: [], contractor: [], inspector: [], template: [] }
};
window.activeMultiFilters = activeMultiFilters;
let currentFilterContext = ''; // 'history' или 'analytics'
let currentFilterType = '';    // 'project', 'contractor' и т.д.

function openMultiFilterModal(type, title, context) {
    currentFilterType = type;
    currentFilterContext = context;

    document.getElementById('multi-filter-title').innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
        ${title}
    `;

    document.getElementById('multi-filter-search').value = '';

    // 1. ОПРЕДЕЛЯЕМ РОЛЬ И ДОСТУПЫ ПОЛЬЗОВАТЕЛЯ
    var permSvc = (_ctx && _ctx.permissions) || (window.RBI && window.RBI.services && window.RBI.services.permissions);
    const role = permSvc ? permSvc.getCurrentRole() : 'guest';
    const assignedProjects = permSvc ? permSvc.getAssignedProjects() : [];
    const isManager = permSvc ? permSvc.canManageHierarchy() : ['director', 'deputy_manager', 'manager'].includes(role);
    // dataScope роли, обязанной иметь индивидуально закреплённые объекты
    // (не 'all'/'none' — т.е. без hasNoOwnObjects): 'ownProject'/'ownProjectOrOwnRecords'/
    // 'ownContractor'. Раньше пустой assignedProjects у такой роли трактовался
    // как "фильтр не применяется" (показать все объекты компании) — согласовано
    // с filterByDataScope/push-guard, где пустой список НЕ значит "доступ ко
    // всему" (см. current_plan.md §2/§3).
    const requiresOwnObjects = permSvc ? !permSvc.hasNoOwnObjects(role) : !['guest', 'director', 'deputy_manager', 'manager'].includes(role);

    // 2. БАЗЫ ДАННЫХ (RBI и ПК СК)
    let accessibleRbi = _getAllInspections();
    let accessibleSk = _getSkRecords();

    // 3. ПРИМЕНЯЕМ ПРАВА ДОСТУПА (Если не админ — режем массивы по закрепленным объектам)
    if (!isManager && role !== 'guest') {
        if (assignedProjects.length > 0) {
            accessibleRbi = accessibleRbi.filter(i => {
                const p = i.project_canonical_key || i.project_display_name || i.projectName;
                return assignedProjects.includes(p);
            });
            accessibleSk = accessibleSk.filter(r => {
                const p = r.project_canonical_key || r.project_display_name || r.display_name;
                return assignedProjects.includes(p);
            });
        } else if (requiresOwnObjects) {
            // Роль обязана иметь назначенные объекты, но их пока 0 — не
            // показывать полный список объектов компании (было доступно всё).
            accessibleRbi = [];
            accessibleSk = [];
        }
    }

    let uniqueValues = [];
    let field = '';

    // 4. КАСКАДНАЯ ФИЛЬТРАЦИЯ (Связываем Объект, Подрядчика и Инспектора)
    let filteredRbi = accessibleRbi;
    let filteredSk = accessibleSk;

    // Если открыт НЕ фильтр Объектов, но Объект уже выбран — сужаем базу
    if (type !== 'project' && activeMultiFilters[context].project && activeMultiFilters[context].project.length > 0) {
        const fProj = activeMultiFilters[context].project;
        filteredRbi = filteredRbi.filter(i => fProj.includes(i.project_display_name) || fProj.includes(i.project_canonical_key) || fProj.includes(i.projectName));
        filteredSk = filteredSk.filter(r => fProj.includes(r.project_display_name) || fProj.includes(r.project_canonical_key) || fProj.includes(r.display_name));
    }

    // Если открыт НЕ фильтр Подрядчиков, но Подрядчик уже выбран — сужаем базу
    if (type !== 'contractor' && activeMultiFilters[context].contractor && activeMultiFilters[context].contractor.length > 0) {
        const fContr = activeMultiFilters[context].contractor;
        filteredRbi = filteredRbi.filter(i => fContr.includes(i.contractorName));
        filteredSk = filteredSk.filter(r => fContr.includes(r.contractor_name) || fContr.includes(r.contractor));
    }

    // Если открыт НЕ фильтр Инспекторов, но Инспектор уже выбран — сужаем базу
    if (type !== 'inspector' && activeMultiFilters[context].inspector && activeMultiFilters[context].inspector.length > 0) {
        const fInsp = activeMultiFilters[context].inspector;
        filteredRbi = filteredRbi.filter(i => fInsp.includes(i.inspectorName));
        filteredSk = filteredSk.filter(r => fInsp.includes(r.issued_by) || fInsp.includes(r.inspector));
    }

    // 5. СОБИРАЕМ ДАННЫЕ ИЗ УЖЕ ОТФИЛЬТРОВАННОЙ БАЗЫ
    if (type === 'project') {
        const rbiProjs = filteredRbi.map(i => i.project_display_name || i.projectName || i.project_canonical_key);
        const skProjs = filteredSk.map(r => r.project_display_name || r.display_name || r.canonical_key);
        uniqueValues = [...new Set([...rbiProjs, ...skProjs].filter(Boolean))].sort();
    }
    else if (type === 'contractor') {
        const rbiContrs = filteredRbi.map(i => i.contractorName);
        const skContrs = filteredSk.map(r => r.contractor_name || r.contractor);
        uniqueValues = [...new Set([...rbiContrs, ...skContrs].filter(Boolean))].sort();
    }
    else if (type === 'inspector') {
        // Берем ТОЛЬКО Инженеров по Качеству (из истории RBI аудитов), исключая инженеров СК
        const rbiEngs = filteredRbi.map(i => i.inspectorName);
        uniqueValues = [...new Set(rbiEngs.filter(name => name && name !== 'Система' && name !== 'Системная'))].sort();
    }
    else if (type === 'template') {
        const rbiTmpls = filteredRbi.map(i => i.templateTitle);
        const skTmpls = filteredSk.map(r => r.category && r.category !== 'Без категории' ? r.category : null);
        uniqueValues = [...new Set([...rbiTmpls, ...skTmpls].filter(Boolean))].sort();
    }

    const currentSelected = activeMultiFilters[context][type] || [];
    const listEl = document.getElementById('multi-filter-list');

    if (uniqueValues.length === 0) {
        listEl.innerHTML = `<div class="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500"><svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg><span class="text-xs font-bold uppercase tracking-wider">Нет данных</span></div>`;
    } else {
        // ИСПРАВЛЕНИЕ UX (см. current_plan.md, блок "Мультифильтры неудобны"):
        // раньше был единый <label>, оборачивающий чекбокс+текст — клик В ЛЮБОЕ
        // место строки лишь переключал чекбокс, реальное применение требовало
        // отдельного нажатия «Применить». Теперь это НЕ <label> (нет неявной
        // чекбокс-привязки): клик по тексту — applyMultiFilterSingle(val), сразу
        // выбирает только это значение и закрывает модалку; клик по чекбоксу —
        // обычное нативное переключение (без действия из delegation, состояние
        // читается только при "Выбрать всё"/"Применить"), не закрывает модалку,
        // позволяя набрать несколько значений.
        listEl.innerHTML = uniqueValues.map(val => {
            const isChecked = currentSelected.length === 0 || currentSelected.includes(val);
            let displayVal = val;
            const singleArgs = JSON.stringify([val]).replace(/'/g, '&#39;');

            return `
            <div class="filter-item-row flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-600">
                <input type="checkbox" value="${val}" class="filter-modal-cb w-5 h-5 accent-indigo-600 rounded cursor-pointer shrink-0" ${isChecked ? 'checked' : ''}>
                <span class="text-[13px] font-bold text-slate-700 dark:text-slate-200 filter-item-text truncate flex-1 leading-none pt-0.5 cursor-pointer active:scale-[0.98] transition-transform"
                    data-multifilter-action="applyMultiFilterSingle" data-multifilter-action-args='${singleArgs}'>${displayVal}</span>
            </div>`;
        }).join('');
    }

    const overlay = document.getElementById('multi-filter-modal-overlay');
    const content = document.getElementById('multi-filter-modal-content');

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');

    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        content.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    }, 10);
}
window.openMultiFilterModal = openMultiFilterModal;

// === ЕДИНАЯ ФУНКЦИЯ ЗАКРЫТИЯ МУЛЬТИ-ФИЛЬТРА ===
function closeMultiFilterModal() {
    const overlay = document.getElementById('multi-filter-modal-overlay');
    const content = document.getElementById('multi-filter-modal-content');

    // Плавное исчезновение
    overlay.classList.add('opacity-0');
    content.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');

    setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}
window.closeMultiFilterModal = closeMultiFilterModal;

function filterMultiModalList() {
    const term = document.getElementById('multi-filter-search').value.toLowerCase();
    const rows = document.querySelectorAll('.filter-item-row');
    rows.forEach(row => {
        const text = row.querySelector('.filter-item-text').innerText.toLowerCase();
        row.style.display = text.includes(term) ? 'flex' : 'none';
    });
}
window.filterMultiModalList = filterMultiModalList;

function selectAllMultiFilter() {
    const checkboxes = document.querySelectorAll('.filter-modal-cb');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}
window.selectAllMultiFilter = selectAllMultiFilter;

function applyMultiFilter() {
    const checkboxes = document.querySelectorAll('.filter-modal-cb');
    const total = checkboxes.length;
    const checkedValues = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    // Если выбраны все или не выбран ни один -> сбрасываем фильтр (означает "Все")
    if (checkedValues.length === total || checkedValues.length === 0) {
        activeMultiFilters[currentFilterContext][currentFilterType] = [];
    } else {
        activeMultiFilters[currentFilterContext][currentFilterType] = checkedValues;
    }

    updateFilterButtonLabels();
    closeMultiFilterModal();

    // Запускаем рендер нужной вкладки
    if (currentFilterContext === 'history') {
        window.applyHistoryFilters();
    } else {
        window.renderCurrentAnalyticsTab();
    }
}
window.applyMultiFilter = applyMultiFilter;

// Клик по ТЕКСТУ строки фильтра (см. current_plan.md, блок "Мультифильтры
// неудобны"): выбирает ТОЛЬКО это значение (сбрасывает остальные), сразу
// применяет фильтр и закрывает модалку — быстрый однозначный выбор без
// отдельного нажатия «Применить». Отдельная функция от applyMultiFilter(),
// т.к. читает не DOM-чекбоксы (это же действие может быть вызвано при любом
// текущем состоянии чекбоксов), а сам переданный value.
function applyMultiFilterSingle(val) {
    activeMultiFilters[currentFilterContext][currentFilterType] = [val];

    updateFilterButtonLabels();
    closeMultiFilterModal();

    if (currentFilterContext === 'history') {
        window.applyHistoryFilters();
    } else {
        window.renderCurrentAnalyticsTab();
    }
}
window.applyMultiFilterSingle = applyMultiFilterSingle;

function updateFilterButtonLabels() {
    const updateBtn = (btnId, arr, defaultText) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const textEl = btn.querySelector('.truncate');
        if (arr.length === 0) {
            textEl.innerText = defaultText;
            textEl.classList.remove('text-indigo-600', 'font-black');
        } else if (arr.length === 1) {
            // Если выбран 1, показываем его имя (для шаблона придется искать имя)
            let display = arr[0];
            if (btnId.includes('template')) {
                const sample = _getAllInspections().find(i => i.templateKey === arr[0]);
                if (sample) display = sample.templateTitle;
            }
            textEl.innerText = display;
            textEl.classList.add('text-indigo-600', 'font-black');
        } else {
            textEl.innerText = `Выбрано: ${arr.length}`;
            textEl.classList.add('text-indigo-600', 'font-black');
        }
    };

    updateBtn('btn-hist-project', activeMultiFilters.history.project, 'Все объекты');
    updateBtn('btn-hist-contractor', activeMultiFilters.history.contractor, 'Все подрядчики');
    updateBtn('btn-hist-inspector', activeMultiFilters.history.inspector, 'Все инспекторы');

    updateBtn('btn-ana-project', activeMultiFilters.analytics.project, 'Все объекты');
    updateBtn('btn-ana-contractor', activeMultiFilters.analytics.contractor, 'Все подрядчики');
    updateBtn('btn-ana-inspector', activeMultiFilters.analytics.inspector, 'Все инспекторы');
    updateBtn('btn-ana-template', activeMultiFilters.analytics.template, 'Все виды работ');
}

// =========================================================================
// РАЗМЕТКА МОДАЛКИ «multi-filter-modal-overlay» (перенос из
// index.html:1360-1418, перенос 30 modal/overlay-блоков #app-modals в
// JS-рендер). HTML-строка 1:1 идентична прежней статичной разметке.
// =========================================================================
(function mountMultiFilterModalOverlayMarkup() {
    if (document.getElementById('multi-filter-modal-overlay')) return;
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals');
    if (!root) return;
    root.insertAdjacentHTML('beforeend', `
    <div id="multi-filter-modal-overlay"
        class="fixed inset-0 bg-slate-900/70 z-[3000] hidden items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm transition-opacity duration-300 opacity-0"
        data-multifilter-action="closeMultiFilterModal">
        <div class="bg-[var(--bg-main)] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl transition-transform duration-300 transform translate-y-full sm:translate-y-4 sm:scale-95 flex flex-col max-h-[85vh] border border-slate-200/50 dark:border-slate-700/50"
            id="multi-filter-modal-content" onclick="event.stopPropagation()">

            <div
                class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-t-3xl z-10">
                <div class="font-black text-[13px] uppercase tracking-tight text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
                    id="multi-filter-title">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z">
                        </path>
                    </svg>
                    Фильтр
                </div>
                <div class="flex gap-3 items-center">
                    <button data-multifilter-action="selectAllMultiFilter"
                        class="text-[10px] font-bold text-slate-500 hover:text-indigo-500 uppercase active:scale-95 transition-colors">Выбрать
                        всё</button>
                    <button data-multifilter-action="closeMultiFilterModal"
                        class="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 shadow-sm border border-slate-200 dark:border-slate-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div
                class="p-3 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm z-10 relative">
                <span class="absolute left-6 top-5 text-slate-400"><svg class="w-4 h-4" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg></span>
                <input type="text" id="multi-filter-search"
                    class="input-base text-[12px] !py-2.5 pl-10 bg-white dark:bg-slate-900 shadow-inner"
                    placeholder="Быстрый поиск..." oninput="filterMultiModalList()">
            </div>

            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-slate-50 dark:bg-slate-900/50"
                id="multi-filter-list">
                <!-- Чекбоксы генерируются здесь -->
            </div>

            <div
                class="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-b-3xl shrink-0 z-10">
                <button data-multifilter-action="applyMultiFilter"
                    class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Применить
                </button>
            </div>
        </div>
    </div>
`);
}());
window.updateFilterButtonLabels = updateFilterButtonLabels;
