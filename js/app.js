/* Файл: js/app.js (БЛОК 1: Ядро, Настройки, История, Справочник) */

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let state = {}; 
let details = {}; 
let photos = {}; 
let contractorArray = []; 
let userTemplates = {};
let currentTemplateKey = ''; 
let currentChecklist = [];
let currentPhotoId = null;
let chartInstances = {};
let customExpertConclusions = {};
// Состояние мульти-фильтров
let activeMultiFilters = {
    history: { project: [], contractor: [], inspector: [] },
    analytics: { project: [], contractor: [], inspector: [], template: [] }
};
let currentFilterContext = ''; // 'history' или 'analytics'
let currentFilterType = '';    // 'project', 'contractor' и т.д.

// Переменные зума фото
let currentZoom = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;

// Демо-режим
let isDemoMode = false;
let realState = {}, realDetails = {}, realPhotos = {}, realContractorArray = [], realTemplateKey = '';

// Настройки приложения (v16.0)
let appSettings = {
    theme: 'auto',
    fontSize: 'medium',
    navPosition: 'auto',
    swipeEnabled: false,      
    autoCollapseOk: false,    
    defaultGroupsCollapsed: false, 
    fastMode: false,          
    soundEnabled: true,
    autoSave: true,
    aiEnabled: false,   
    aiAuto: false,      
    apiKey: '',
    dashboardMode: 'compact',
    anaEngPareto: true, 
    anaOpTrend: true,   
    anaOpLeader: true,
    anaEngAi: true, 
    anaEngPhotos: true,
    anaOpTopDefects: true,
    autoBackupEnabled: true,
    autoBackupDay: '5', // 5 - Пятница
    autoBackupShare: true,
    autoManagerEnabled: true,
    autoManagerDay: '5' // 5 - Пятница
};

// Звуковые эффекты (base64 для офлайна)
const audioOk = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"); 
const audioFail = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
// (В реале сюда можно вставить короткие base64 писки, сейчас они просто заглушки, чтобы не было ошибки)

// Таймер для дебаунса сохранений (оптимизация)
let __saveSessionTimer = null;

// === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadSettings();
        applySettingsToUI();
        
        // РАДАР ВЫСОТЫ ШАПКИ
        const headerEl = document.getElementById('main-header');
        window.addEventListener('resize', updateBodyPadding);
        
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 50 && currentScroll > lastScroll) {
                if(headerEl) headerEl.classList.add('header-collapsed');
            } else if (currentScroll < 50) {
                if(headerEl) headerEl.classList.remove('header-collapsed');
            }
            lastScroll = currentScroll;
        }, { passive: true });

        // ИСПРАВЛЕНИЕ: Правильная загрузка ВСЕХ созданных шаблонов из базы
        const storedTmpls = await dbGetAll(STORES.TEMPLATES);
        if (storedTmpls && storedTmpls.length > 0) {
            userTemplates = {};
            storedTmpls.forEach(t => { userTemplates[t.slug] = t.data; });
        } else {
            userTemplates = JSON.parse(localStorage.getItem('rbi_audit_user_templates_ent_v12') || '{}');
        }
        
        renderSelector();
        await restoreSession();

        if(!currentTemplateKey) {
            document.getElementById('empty-checklist-state').style.display = 'block';
            document.getElementById('audit-items').style.display = 'none';
            document.getElementById('audit-actions').style.display = 'none';
        } else {
            document.getElementById('empty-checklist-state').style.display = 'none';
            document.getElementById('audit-items').style.display = 'block';
            document.getElementById('audit-actions').style.display = 'grid';
            if (typeof render === 'function') render(); 
        }
        
        setupNavigation();
     initHorizontalMouseScroll();
    } catch (error) { console.error("Ошибка при загрузке:", error); }
});

// === СОХРАНЕНИЕ И ВОССТАНОВЛЕНИЕ СЕССИИ ===
function scheduleSessionSave() {
    clearTimeout(__saveSessionTimer);
    __saveSessionTimer = setTimeout(() => {
        saveSessionData();
    }, 500); // Debounce 500ms
}

async function saveSessionData() {
    if (isDemoMode) return;    
    try {
        await dbPut(STORES.STATE, {
            key: 'current_session',
            templateKey: currentTemplateKey,
            project: document.getElementById('inp-project') ? document.getElementById('inp-project').value : '',
            inspector: document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value : '',
            contractor: document.getElementById('inp-contractor') ? document.getElementById('inp-contractor').value : '',
            location: document.getElementById('inp-location') ? document.getElementById('inp-location').value : '',
            state, details, photos,
            customExpertConclusions  // ← ДОБАВЛЕНО: сохраняем редактуры заключений
        });
    } catch (e) {
        console.error('Ошибка сохранения в IndexedDB:', e);
        showToast('⚠️ Ошибка автосохранения!');  // ← ДОБАВЛЕНО: уведомляем пользователя
    }
}

async function restoreSession() {
    try {
        const data = await dbGet(STORES.STATE, 'current_session');
        const hist = await dbGetAll(STORES.HISTORY);
        
        contractorArray = hist || [];
        
        if (!data) return;

        if (data.templateKey) currentTemplateKey = data.templateKey;

        if (currentTemplateKey) {
            const type = currentTemplateKey.split('_')[0];
            const key = currentTemplateKey.slice(type.length + 1);
            if (type === 'sys' && SYSTEM_TEMPLATES[key]) currentChecklist = SYSTEM_TEMPLATES[key].groups;
            else if (type === 'user' && userTemplates[key]) currentChecklist = userTemplates[key].groups;
        }

        state = data.state || {};
        details = data.details || {};
        photos = data.photos || {};
        customExpertConclusions = data.customExpertConclusions || {};  // ← ДОБАВЛЕНО

        if (currentTemplateKey && document.getElementById('checklist-selector')) {
            document.getElementById('checklist-selector').value = currentTemplateKey;
        }

        if(document.getElementById('inp-project')) document.getElementById('inp-project').value = data.project || '';
        if(document.getElementById('inp-inspector')) document.getElementById('inp-inspector').value = data.inspector || '';
        if(document.getElementById('inp-contractor')) document.getElementById('inp-contractor').value = data.contractor || '';
        if(document.getElementById('inp-location')) document.getElementById('inp-location').value = data.location || '';

        if (typeof updateDataSummary === 'function') updateDataSummary();
    } catch (e) {
        console.error('Ошибка восстановления:', e);
    }
    updateDatalists();
    updateAllDynamicFilters();
    setTimeout(() => { if (typeof checkScheduledBackups === 'function') checkScheduledBackups(); }, 2000);
}
// === МУЛЬТИ-ФИЛЬТРЫ (ЛОГИКА МОДАЛКИ) ===
// === МУЛЬТИ-ФИЛЬТРЫ (ЛОГИКА МОДАЛКИ) ===
function openMultiFilterModal(type, title, context) {
    currentFilterType = type;
    currentFilterContext = context;
    document.getElementById('multi-filter-title').innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
        ${title}
    `;
    document.getElementById('multi-filter-search').value = '';

    let field = '';
    if (type === 'project') field = 'projectName';
    if (type === 'contractor') field = 'contractorName';
    if (type === 'inspector') field = 'inspectorName';
    if (type === 'template') field = 'templateKey';

    const uniqueValues = [...new Set(contractorArray.map(i => i[field]).filter(Boolean))].sort();
    const currentSelected = activeMultiFilters[context][type] || [];
    const listEl = document.getElementById('multi-filter-list');
    
    if (uniqueValues.length === 0) {
        listEl.innerHTML = `<div class="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500"><svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg><span class="text-xs font-bold uppercase tracking-wider">Нет данных</span></div>`;
    } else {
        listEl.innerHTML = uniqueValues.map(val => {
            const isChecked = currentSelected.length === 0 || currentSelected.includes(val);
            let displayVal = val;
            if (type === 'template') {
                const sample = contractorArray.find(i => i[field] === val);
                displayVal = sample ? sample.templateTitle : val;
            }
            
            return `
            <label class="filter-item-label flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all hover:border-indigo-300 dark:hover:border-indigo-600">
                <input type="checkbox" value="${val}" class="filter-modal-cb w-5 h-5 accent-indigo-600 rounded cursor-pointer" ${isChecked ? 'checked' : ''}>
                <span class="text-[13px] font-bold text-slate-700 dark:text-slate-200 filter-item-text truncate flex-1 leading-none pt-0.5">${displayVal}</span>
            </label>`;
        }).join('');
    }

    const overlay = document.getElementById('multi-filter-modal-overlay');
    const content = document.getElementById('multi-filter-modal-content');
    
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Плавное появление (снимаем классы, прячущие контент)
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        content.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    }, 10);
}

// === ЕДИНАЯ ФУНКЦИЯ ЗАКРЫТИЯ МУЛЬТИ-ФИЛЬТРА ===
function closeMultiFilterModal() {
    const overlay = document.getElementById('multi-filter-modal-overlay');
    const content = document.getElementById('multi-filter-modal-content');
    
    // Плавное исчезновение
    overlay.classList.add('opacity-0');
    content.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:scale-95');
    
    setTimeout(() => {
        if(overlay) overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

function filterMultiModalList() {
    const term = document.getElementById('multi-filter-search').value.toLowerCase();
    const labels = document.querySelectorAll('.filter-item-label');
    labels.forEach(label => {
        const text = label.querySelector('.filter-item-text').innerText.toLowerCase();
        label.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

function selectAllMultiFilter() {
    const checkboxes = document.querySelectorAll('.filter-modal-cb');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

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
        applyHistoryFilters();
    } else {
        renderCurrentAnalyticsTab();
    }
}

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
                const sample = contractorArray.find(i => i.templateKey === arr[0]);
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

// Заглушка, чтобы не ломать старый код при загрузке


// === УВЕДОМЛЕНИЯ И МОДАЛКИ (v15 100% совместимость) ===
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

function closeModal() { 
    const overlay = document.getElementById('modal-overlay');
    if(overlay) overlay.style.display = 'none'; 
    document.body.classList.remove('modal-open');
}

// === НАВИГАЦИЯ (5 ВКЛАДОК v16.0) ===
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId, this);
        });
    });
}

// === ДИНАМИЧЕСКИЕ ОТСТУПЫ ===
function updateBodyPadding() {
    const headerEl = document.getElementById('main-header');
    const navEl = document.querySelector('.bottom-nav');
    let totalTop = 0;
    
    // Проверяем, где находится навигация (сверху или снизу)
    const isNavTop = (document.body.classList.contains('nav-pos-top')) || 
                     (document.body.classList.contains('nav-pos-auto') && window.innerWidth >= 768);

    // Добавляем высоту навигации, если она сверху
    if (isNavTop && navEl) {
        totalTop += navEl.offsetHeight; 
    }

    // Проверяем, находимся ли мы на вкладке "Осмотр"
    const isAuditActive = document.getElementById('tab-audit')?.classList.contains('active');

    if (isAuditActive && headerEl && headerEl.style.display !== 'none') {
        // ВАЖНО: Вычисляем отступ по ПОЛНОМУ размеру шапки, 
        // чтобы контент больше не дергался при скролле.
        const wasCollapsed = headerEl.classList.contains('header-collapsed');
        if (wasCollapsed) headerEl.classList.remove('header-collapsed'); // Временно разворачиваем для замера
        
        totalTop += headerEl.offsetHeight;
        
        if (wasCollapsed) headerEl.classList.add('header-collapsed'); // Возвращаем как было
    }

    document.body.style.paddingTop = totalTop > 0 ? `${totalTop + 15}px` : '20px';
}

// === НАВИГАЦИЯ И ВКЛАДКИ ===
function switchTab(tabId, navElement = null) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if(targetTab) targetTab.classList.add('active');
    
    if (navElement) navElement.classList.add('active');
    else {
        const btn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if(btn) btn.classList.add('active');
    }

    const header = document.getElementById('main-header');
    if (header) header.style.display = (tabId === 'tab-audit') ? 'block' : 'none';

    if (tabId === 'tab-audit' && typeof render === 'function') {
        render(); updateUI();
    } else if (tabId === 'tab-history') {
        renderHistoryTab();
        initCollapsiblePanel('hist-sticky-panel', 'hist-panel-body', 'hist-panel-header', 'hist-panel-toggle-icon');
    } else if (tabId === 'tab-analytics' && typeof updateAnalyticsFilters === 'function') {
        updateAnalyticsFilters(); 
        if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
        else renderAnalyticsTab();
        initCollapsiblePanel('analytics-filters-block', 'analytics-panel-body', 'analytics-panel-header', 'analytics-panel-toggle-icon');
    } else if (tabId === 'tab-reference') {
        // Обновляем текущую открытую подвкладку справочника
        const activeSub = document.querySelector('.ref-sub-section:not(.hidden)');
        if (activeSub && activeSub.id === 'ref-sub-checklists' && typeof renderReferenceTab === 'function') renderReferenceTab();
        else if (activeSub && activeSub.id === 'ref-sub-docs' && typeof renderDocsList === 'function') renderDocsList();
    } else if (tabId === 'tab-settings') {
        if (typeof renderSettingsTab === 'function') renderSettingsTab();
        if (typeof updateStorageInfo === 'function') updateStorageInfo();
    }

    if (typeof updateFabButton === 'function') updateFabButton(tabId);

    setTimeout(updateBodyPadding, 50);
    window.scrollTo(0, 0);
}

// === ПЕРЕКЛЮЧАТЕЛЬ ПОДВКЛАДОК СПРАВОЧНИКА ===
function switchReferenceSubTab(tabId, btnElement) {
    document.querySelectorAll('.ref-sub-section').forEach(el => el.classList.add('hidden'));
    
    const btnContainer = document.getElementById('reference-subtabs-block');
    if (btnContainer) {
        btnContainer.querySelectorAll('.sub-tab-btn').forEach(el => {
            el.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400', 'active');
            el.classList.add('text-[var(--text-muted)]');
        });
    }
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    
    if (btnElement) {
        btnElement.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400', 'active');
        btnElement.classList.remove('text-[var(--text-muted)]');
    }

    // Инициализация контента при переключении
    if (tabId === 'ref-sub-checklists') {
        if (typeof renderReferenceTab === 'function') renderReferenceTab();
    } else if (tabId === 'ref-sub-docs') {
        if (typeof renderDocsList === 'function') renderDocsList();
    } else if (tabId === 'ref-sub-nodes') {
        // Запускаем рендер сетки узлов!
        if (typeof renderNodesList === 'function') renderNodesList();
    }
}

// === СВОРАЧИВАЕМ МИНИДАШБОРД ===
function toggleDashboardExpand() {
    const expView = document.getElementById('dash-expanded-view');
    if (!expView) return;
    expView.classList.toggle('hidden');
    // Обновляем отступ страницы
    setTimeout(() => {
        const headerEl = document.getElementById('main-header');
        if (headerEl && window.scrollY < 60) document.body.style.paddingTop = `${headerEl.offsetHeight + 10}px`;
    }, 50);
}
// === ЕДИНАЯ УМНАЯ КНОПКА FAB (СКАЧАТЬ PDF) ===
function updateFabButton(tabId) {
    const fab = document.getElementById('fab-download-btn');
    if (!fab) return;
    
    if (tabId === 'tab-analytics') {
        // ЖЕСТКАЯ ПРОВЕРКА: Если мы на вкладке Инженеров (HR) - скрываем кнопку!
        if (typeof currentActiveAnalyticsTab !== 'undefined' && currentActiveAnalyticsTab === 'sub-engineer-rating') {
            fab.classList.add('hidden');
            fab.classList.remove('fab-visible');
            fab.style.display = 'none';
        } else {
            fab.classList.remove('hidden');
            fab.classList.add('fab-visible');
            fab.style.display = 'flex';
            fab.dataset.context = typeof currentActiveAnalyticsTab !== 'undefined' ? currentActiveAnalyticsTab : 'pdf';
        }
    } else {
        fab.classList.add('hidden');
        fab.classList.remove('fab-visible');
        fab.style.display = 'none';
    }
}

function handleFabDownload() {
    const fab = document.getElementById('fab-download-btn');
    const ctx = fab?.dataset.context || 'pdf';
    const data = getFilteredAnalyticsData();

    if (data.length === 0) return showToast('Нет данных для выгрузки');

    const menuOverlay = document.getElementById('fab-export-menu-overlay');
    const menuContent = document.getElementById('fab-export-menu-content');
    const dynamicList = document.getElementById('fab-menu-dynamic-list');
    
    if(!menuOverlay || !dynamicList) return;

    // SVG Иконки
    const iconPdf = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>`;
    const iconPrint = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>`;
    const iconDoc = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>`;
    const iconChart = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg>`;
    const iconPoster = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg>`;
    const iconTable = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125-.504 1.125-1.125M3.375 8.25v-1.5c0-.621.504-1.125 1.125-1.125m17.25 2.625v-1.5c0-.621-.504-1.125-1.125-1.125m-17.25 0h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0v1.5c0 .621.504 1.125 1.125 1.125"></path></svg>`;

    const createRow = (action, title, desc, iconBg, iconColor, mainIcon) => `
        <div class="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
            <div class="flex items-center gap-3 min-w-0 pr-2">
                <div class="w-10 h-10 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">${mainIcon}</div>
                <div class="min-w-0">
                    <div class="font-bold text-[12px] text-slate-800 dark:text-white truncate">${title}</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase mt-0.5 truncate">${desc}</div>
                </div>
            </div>
            <div class="flex gap-1.5 shrink-0">
                <button onclick="handleFabExportAction('${action}', 'script')" class="w-10 h-10 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all border border-indigo-100 dark:border-indigo-800" title="Скачать PDF">
                    ${iconPdf}
                </button>
                <button onclick="handleFabExportAction('${action}', 'browser')" class="w-10 h-10 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all border border-slate-200 dark:border-slate-700" title="Напечатать">
                    ${iconPrint}
                </button>
            </div>
        </div>`;

    let contentHtml = '';

    if (ctx === 'sub-contractors') {
        contentHtml += createRow('current', 'Текущий экран', 'Детализация или список (А4)', 'bg-indigo-50 dark:bg-indigo-900/30', 'text-indigo-600 dark:text-indigo-400', iconDoc);
        contentHtml += createRow('full_report', 'Отчёт по объекту', 'Паспорта подрядчиков (А3)', 'bg-emerald-50 dark:bg-emerald-900/30', 'text-emerald-600 dark:text-emerald-400', iconChart);
        contentHtml += createRow('poster', 'Плакат качества', 'Рейтинги и фото (А3)', 'bg-orange-50 dark:bg-orange-900/30', 'text-orange-600 dark:text-orange-400', iconPoster);
    } else if (ctx === 'sub-onepager') {
        contentHtml += createRow('onepager', 'Сводный статус объекта', 'Графики и управленческие выводы (А3)', 'bg-indigo-50 dark:bg-indigo-900/30', 'text-indigo-600 dark:text-indigo-400', iconChart);
    } else if (ctx === 'sub-data') {
        contentHtml += createRow('data', 'Реестр проверок', 'Сырая база данных (А4)', 'bg-slate-100 dark:bg-slate-800', 'text-slate-600 dark:text-slate-300', iconTable);
    } else {
        contentHtml += `<div class="text-center text-sm text-slate-500 py-4 font-bold">Выгрузка для этого раздела недоступна</div>`;
    }

    dynamicList.innerHTML = contentHtml;

    // Показываем меню
    menuOverlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => { 
        menuOverlay.classList.remove('opacity-0'); 
        menuContent.classList.remove('translate-y-full'); 
    }, 10);
}

// === ВКЛАДКА: НАСТРОЙКИ ===
async function loadSettings() {
    try {
        const data = await dbGet(STORES.SETTINGS, 'user_prefs');
        if (data) appSettings = { ...appSettings, ...data };
    } catch (e) { console.error("Ошибка загрузки настроек", e); }
}

async function saveSettings(key, value) {
    appSettings[key] = value;
    applySettingsToUI();
    try { await dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings }); } 
    catch (e) { console.error("Ошибка сохранения настроек", e); }
}

function renderSettingsTab() {
    // 1. Базовые селекторы оформления
    if(document.getElementById('set-theme')) document.getElementById('set-theme').value = appSettings.theme || 'auto';
    if(document.getElementById('set-fontsize')) document.getElementById('set-fontsize').value = appSettings.fontSize || 'medium';
    if(document.getElementById('set-navpos')) document.getElementById('set-navpos').value = appSettings.navPosition || 'auto';
    if(document.getElementById('set-dashmode')) document.getElementById('set-dashmode').value = appSettings.dashboardMode || 'compact';
    
    // 2. Переключатели логики
    if(document.getElementById('set-swipe')) document.getElementById('set-swipe').checked = appSettings.swipeEnabled;
    if(document.getElementById('set-collapse')) document.getElementById('set-collapse').checked = appSettings.autoCollapseOk;
    if(document.getElementById('set-groups-col')) document.getElementById('set-groups-col').checked = appSettings.defaultGroupsCollapsed;
    if(document.getElementById('set-fast')) document.getElementById('set-fast').checked = appSettings.fastMode;
    
    // 3. Аналитика
    if(document.getElementById('set-ana-pareto')) document.getElementById('set-ana-pareto').checked = appSettings.anaEngPareto;
    if(document.getElementById('set-ana-trend')) document.getElementById('set-ana-trend').checked = appSettings.anaOpTrend;
    if(document.getElementById('set-ana-leader')) document.getElementById('set-ana-leader').checked = appSettings.anaOpLeader;
    if(document.getElementById('set-ana-ai')) document.getElementById('set-ana-ai').checked = appSettings.anaEngAi;
    if(document.getElementById('set-ana-photos')) document.getElementById('set-ana-photos').checked = appSettings.anaEngPhotos;
    if(document.getElementById('set-ana-top')) document.getElementById('set-ana-top').checked = appSettings.anaOpTopDefects;
    
    // 4. НОВЫЕ БЛОКИ: Автоматизация бэкапов
    if(document.getElementById('set-autobackup')) document.getElementById('set-autobackup').checked = appSettings.autoBackupEnabled;
    if(document.getElementById('set-autobackup-day')) document.getElementById('set-autobackup-day').value = appSettings.autoBackupDay || '5';
    if(document.getElementById('set-autobackup-share')) document.getElementById('set-autobackup-share').checked = appSettings.autoBackupShare;
    
    if(document.getElementById('set-automanager')) document.getElementById('set-automanager').checked = appSettings.autoManagerEnabled;
    if(document.getElementById('set-automanager-day')) document.getElementById('set-automanager-day').value = appSettings.autoManagerDay || '5';
}

function resetSettingsToDefault() {
    if(!confirm("Сбросить все настройки к значениям по умолчанию?")) return;
    
    // 1. Сбрасываем объект
    appSettings = {
        theme: 'auto', fontSize: 'medium', navPosition: 'auto', swipeEnabled: false,
        autoCollapseOk: false, defaultGroupsCollapsed: false, fastMode: false,
        soundEnabled: true, autoSave: true, aiEnabled: false, aiAuto: false, apiKey: '', dashboardMode: 'compact',
        anaEngPareto: true, anaOpTrend: true, anaOpLeader: true, anaEngAi: true, anaEngPhotos: true, anaOpTopDefects: true,
        autoBackupEnabled: true, autoBackupDay: '5', autoBackupShare: true, autoManagerEnabled: true, autoManagerDay: '5'
    };
    
    // 2. Сохраняем в базу
    saveSettings('dummy', 'dummy'); 
    
    // 3. Обновляем селекторы на экране
    renderSettingsTab();
    
    // 4. ПРИМЕНЯЕМ настройки к интерфейсу (Этого не хватало!)
    applySettingsToUI(); 
    
    // 5. Пересчитываем отступы шапки с небольшой задержкой и плавно скроллим наверх
    setTimeout(() => {
        updateBodyPadding(); 
        window.scrollTo({top: 0, behavior: 'smooth'});
        document.body.classList.remove('modal-open'); // На всякий случай снимаем блокировку скролла
    }, 100);
    
    showToast("Настройки сброшены!");
}

function applySettingsToUI() {
    let isDark = false;
    if (appSettings.theme === 'dark') isDark = true;
    else if (appSettings.theme === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) isDark = true;
    }

    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
    }
    
    if (appSettings.fastMode) document.body.classList.add('fast-mode');
    else document.body.classList.remove('fast-mode');

    document.documentElement.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
    document.documentElement.classList.add(`font-${appSettings.fontSize || 'medium'}`);
    
    document.body.classList.remove('nav-pos-auto', 'nav-pos-top', 'nav-pos-bottom');
    document.body.classList.add(`nav-pos-${appSettings.navPosition || 'auto'}`);
    
    const dash = document.getElementById('header-dashboard');
    const dashExp = document.getElementById('dash-expanded-view');
    const dashIcon = document.getElementById('dash-expand-icon');

    if (appSettings.dashboardMode === 'hidden') {
        if(dash) dash.style.display = 'none';
    } else if (appSettings.dashboardMode === 'expanded') {
        if(dash) dash.style.display = 'block';
        if(dashExp) dashExp.classList.remove('hidden');
        if(dashIcon) dashIcon.style.display = 'none';
    } else {
        if(dash) dash.style.display = 'block';
        if(dashExp) dashExp.classList.add('hidden');
        if(dashIcon) dashIcon.style.display = 'flex';
    }
    
    // Плавный пересчет отступов без перерисовки контента
    setTimeout(() => {
        if (typeof updateBodyPadding === 'function') updateBodyPadding();
    }, 150);

    const activeTab = document.querySelector('.view-section.active');
    if (activeTab && typeof updateFabButton === 'function') updateFabButton(activeTab.id);
}

// Вывод списка пользовательских шаблонов для управления (Удаления)
    const templatesList = document.getElementById('settings-user-templates-list');
    if (templatesList) {
        // ИСПРАВЛЕНИЕ: Сортировка своих шаблонов по алфавиту перед выводом
        const customKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru'));
        
        if (customKeys.length === 0) {
            templatesList.innerHTML = `<div class="text-[10px] text-slate-400 italic py-2 text-center">Созданных чек-листов пока нет</div>`;
        } else {
            templatesList.innerHTML = customKeys.map(key => `
                <div class="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg">
                    <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate pr-2 flex-1">📋 ${userTemplates[key].title}</div>
                    <button onclick="deleteUserTemplate('${key}')" class="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded border border-red-100 dark:border-red-900 shadow-sm active:scale-95">УДАЛИТЬ</button>
                </div>
            `).join('');
        }
    }

function toggleSetting(settingKey, element) {
    let val = element.type === 'checkbox' ? element.checked : element.value;
    
    // Мы удалили старую строчку, которая ломала выбор темы
    
    appSettings[settingKey] = val;
    saveSettings(settingKey, val);
}

// НОВАЯ ФУНКЦИЯ: Очистка кэша (заглушка для будущего функционала PDF)
function clearPdfCache() {
    if(confirm('Удалить скачанные нормативы из памяти телефона?')) {
        showToast('Кэш PDF очищен');
        updateStorageInfo();
    }
}

// === ВКЛАДКА: СПРАВОЧНИК (ПОДВКЛАДКА 1 - ЧЕК-ЛИСТЫ И СВЯЗИ) ===
function renderReferenceTab() {
    const root = document.getElementById('reference-items');
    const refSelect = document.getElementById('ref-checklist-selector');
    if (!root || !refSelect) return;

    const selectedKey = refSelect.value;
    if (!selectedKey) return;

    let checklist = [];
    const type = selectedKey.split('_')[0];
    const key = selectedKey.replace(type + '_', '');
    if (type === 'sys' && SYSTEM_TEMPLATES[key]) checklist = SYSTEM_TEMPLATES[key].groups;
    else if (type === 'user' && userTemplates[key]) checklist = userTemplates[key].groups;

    const searchTerm = document.getElementById('ref-search')?.value.toLowerCase() || "";
    
    // --- СОРТИРОВКА ПРИВЯЗАННЫХ КАРТ ---
    const linkedTwiCards = customTwiCards.filter(c => c.checklistKey === selectedKey);
    // Карты, привязанные ко всему виду работ (ALL)
    const globalCards = linkedTwiCards.filter(c => c.itemId === 'ALL' || !c.itemId);
    // Карты, привязанные к конкретным пунктам
    const itemCards = linkedTwiCards.filter(c => c.itemId && c.itemId !== 'ALL');

    let html = '';

    // --- ШАПКА: СТАТИСТИКА И ОБЩИЕ ИНСТРУКЦИИ ---
    html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm mb-4 relative overflow-hidden">
            <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Требования по виду работ</div>
            <div class="text-[14px] font-black text-slate-800 dark:text-white leading-tight mb-3">${refSelect.options[refSelect.selectedIndex].text.replace('▼', '').trim()}</div>
            
            <div class="flex gap-4 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div class="text-[10px] font-bold text-slate-600 dark:text-slate-400"><span class="text-indigo-600 text-[12px] font-black">${globalCards.length}</span> инстр. к разделу</div>
                <div class="text-[10px] font-bold text-slate-600 dark:text-slate-400"><span class="text-orange-600 text-[12px] font-black">${itemCards.length}</span> инстр. к пунктам</div>
            </div>
    `;

    if (globalCards.length > 0) {
        html += `<div class="space-y-2">`;
        globalCards.forEach(c => {
            const icon = c.type === 'PDF' ? '📄' : '🛠';
            const typeName = c.type === 'PDF' ? 'Внешний PDF-Регламент' : 'Пошаговое руководство (TWI)';
            html += `
                <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2.5 flex items-center justify-between cursor-pointer active:scale-95 transition-transform" onclick="openTwiViewer('${c.id}')">
                    <div class="flex items-center gap-3 min-w-0 pr-2">
                        <div class="w-8 h-8 bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded flex items-center justify-center text-lg shrink-0">${icon}</div>
                        <div class="min-w-0">
                            <div class="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">${typeName}</div>
                            <div class="text-[11px] font-black text-indigo-900 dark:text-indigo-200 truncate">${c.title}</div>
                        </div>
                    </div>
                    <div class="text-indigo-400 font-black">➔</div>
                </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `<div class="text-[10px] text-slate-400 font-bold italic">Общих инструкций к разделу пока нет</div>`;
    }
    html += `</div>`;

    // --- СПИСОК ПУНКТОВ ИЗ ЧЕК-ЛИСТА ---
    checklist.forEach(g => {
        const filteredItems = g.items.filter(i => 
            i.n.toLowerCase().includes(searchTerm) || 
            (i.t && i.t.toLowerCase().includes(searchTerm))
        );

        if (filteredItems.length === 0) return;

        html += `
        <div class="mb-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden shadow-sm">
            <div class="bg-[var(--hover-bg)] p-3 text-[11px] font-black text-[var(--text-muted)] uppercase border-b border-[var(--card-border)] tracking-tight">
                ${g.group || g.title}
            </div>
            <div class="p-2 space-y-2">`;
        
        filteredItems.forEach(i => {
            const safeNormText = (i.t || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            // Ищем карты, привязанные ТОЛЬКО к этому конкретному пункту
            const specificItemCards = itemCards.filter(c => String(c.itemId) === String(i.id));
            const twiBtnClass = specificItemCards.length > 0 
                ? "bg-indigo-600 text-white shadow-md border-indigo-700" 
                : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-70";
            const twiBtnAction = specificItemCards.length > 0 
                ? `openTwiViewer('${specificItemCards[0].id}')` 
                : `showToast('Для этого пункта еще не создана TWI-карта')`;
            const twiIcon = specificItemCards.length > 0 ? "🗺️" : "🚫";
            
            html += `
                <div class="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white mb-2 leading-snug">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    <div class="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed mb-3">
                        ${i.t || 'Норматив не указан'}
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5" onclick="findAndOpenND('${safeNormText}')">
                            <span class="text-sm">📚</span> Норматив
                        </button>
                        <button class="${twiBtnClass} py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5" onclick="${twiBtnAction}">
                            <span class="text-sm">${twiIcon}</span> TWI Карта
                        </button>
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    });

    root.innerHTML = html || `<div class="text-center py-8 text-slate-500 text-sm font-bold bg-[var(--hover-bg)] rounded-xl border border-[var(--card-border)]">Ничего не найдено по запросу "${searchTerm}"</div>`;
}

// === ЛОГИКА ОТКРЫТИЯ СВЯЗАННЫХ ДОКУМЕНТОВ ===

// 1. Умный поиск Норматива
// Умный поиск Норматива (С промежуточным окном)
function findAndOpenND(normText) {
    if (!normText) return showToast('Норматив не указан');
    
    // Пытаемся вытащить ГОСТ или СП из текста для последующего поиска
    const match = normText.match(/(СП\s?\d+(\.\d+)*|ГОСТ\s?(Р\s)?\d+(-\d+)?)/i);
    const searchString = match ? match[0] : normText.substring(0, 15);

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-[14px] flex items-center justify-center border border-blue-100 dark:border-blue-800 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>`;
    document.getElementById('modal-title').innerText = "Нормативное требование";
    
    document.getElementById('modal-body').innerHTML = `
        <div class="text-[12px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 whitespace-pre-wrap">
            ${normText}
        </div>
        
        <div class="text-[10px] text-slate-500 font-bold mb-2 uppercase text-center border-t border-slate-100 dark:border-slate-700 pt-3">Нужно больше информации?</div>
        
        <button onclick="closeModal(); switchToNdSearch('${searchString}')" class="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm flex items-center justify-center gap-2">
            🔍 Искать полный документ в Базе НД
        </button>
    `;
    
    document.body.classList.add('modal-open'); 
    modal.style.display = 'flex';
}

// Вспомогательная функция для перехода в Справочник -> База НД
function switchToNdSearch(searchString) {
    switchTab('tab-reference');
    setTimeout(() => {
        const btns = document.querySelectorAll('.sub-tab-btn');
        if (btns[1]) switchReferenceSubTab('ref-sub-docs', btns[1]);
        
        const searchInput = document.getElementById('doc-search-input');
        if (searchInput) {
            searchInput.value = searchString;
            currentDocFilter = 'ALL';
            renderDocsList();
            showToast(`🔍 Ищем в базе: ${searchString}`);
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 150);
}

// === 2. ОТКРЫТИЕ УНИВЕРСАЛЬНОЙ ЧИТАЛКИ ИНСТРУКЦИЙ (БЕЗ ЭМОДЗИ) ===
function openTwiViewer(twiId) {
    
    const card = customTwiCards.find(c => c.id === twiId);
    if (!card) return showToast('Ошибка: Инструкция не найдена');
    if (typeof gameLogAction === 'function') {
        gameLogAction('open_twi', twiId);
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

        let photoGoodHtml = card.photoGood ? `
            <div class="relative rounded-xl overflow-hidden shadow-sm border-2 border-green-500 cursor-pointer active:scale-95 transition-transform bg-slate-50 dark:bg-slate-900" onclick="openPhotoViewer('${card.photoGood}')">
                <div class="absolute top-0 left-0 w-full bg-gradient-to-b from-green-600/90 to-transparent p-2 text-white font-black text-[10px] uppercase tracking-widest drop-shadow-md flex items-center gap-1.5 z-10"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Правильно</div>
                <img src="${card.photoGood}" class="w-full h-48 md:h-64 object-contain">
            </div>` : `<div class="h-48 md:h-64 rounded-xl border-2 border-dashed border-green-300 flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500"><svg class="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="font-bold text-[9px] uppercase">Нет фото эталона</span></div>`;

        let photoBadHtml = card.photoBad ? `
            <div class="relative rounded-xl overflow-hidden shadow-sm border-2 border-red-500 cursor-pointer active:scale-95 transition-transform bg-slate-50 dark:bg-slate-900" onclick="openPhotoViewer('${card.photoBad}')">
                <div class="absolute top-0 left-0 w-full bg-gradient-to-b from-red-600/90 to-transparent p-2 text-white font-black text-[10px] uppercase tracking-widest drop-shadow-md flex items-center gap-1.5 z-10"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg> Брак</div>
                <img src="${card.photoBad}" class="w-full h-48 md:h-64 object-contain">
            </div>` : `<div class="h-48 md:h-64 rounded-xl border-2 border-dashed border-red-300 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500"><svg class="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="font-bold text-[9px] uppercase">Нет фото брака</span></div>`;

        let normText = 'Норматив не указан';
        const flatList = getFlatList(currentChecklist.length > 0 ? currentChecklist : []);
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
            card.steps.forEach(step => {
                const photoHtml = step.photo ? `
                    <div class="mt-3 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative group" onclick="openPhotoViewer('${step.photo}')">
                        <img src="${step.photo}" class="w-full h-40 object-cover active:scale-95 transition-transform origin-center cursor-pointer">
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
            });
        } else {
            stepsHtml += `<div class="text-center text-slate-500 text-sm font-bold py-10">Шаги не заполнены</div>`;
        }
        stepsHtml += '</div>';
        content.innerHTML = stepsHtml;
    } 
    // === ТИП 3: ВНЕШНИЙ PDF-ДОКУМЕНТ ===
    else if (card.type === 'PDF') {
        badgeEl.innerText = 'PDF-Файл';
        badgeEl.className = 'bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
        infoPanel.classList.add('hidden');
        footer.classList.add('hidden');
        content.classList.add('p-0');

        if (card.pdfData) {
            try {
                const byteCharacters = atob(card.pdfData.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], {type: 'application/pdf'});
                const blobUrl = URL.createObjectURL(blob);

                content.innerHTML = `
                    <div class="w-full h-full flex flex-col relative bg-slate-100 dark:bg-slate-900">
                        <iframe src="${blobUrl}#toolbar=0" class="w-full flex-1 border-none bg-white dark:bg-slate-800" style="min-height: 60vh;"></iframe>
                        <div class="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10">
                            <div class="min-w-0 pr-3">
                                <div class="text-[11px] font-black text-slate-800 dark:text-white truncate">${card.pdfName}</div>
                                <div class="text-[9px] font-bold text-slate-500">${card.pdfSize}</div>
                            </div>
                            <a href="${blobUrl}" target="_blank" download="${card.pdfName}" class="bg-red-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center gap-1.5 shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Скачать
                            </a>
                        </div>
                    </div>
                `;
                content.dataset.blobUrl = blobUrl;
            } catch (err) {
                console.error(err);
                content.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-6 text-center"><svg class="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class="text-sm font-bold text-slate-500">Не удалось открыть PDF.<br>Возможно, файл поврежден.</div></div>`;
            }
        } else {
            content.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-6 text-center"><svg class="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><div class="text-sm font-bold text-slate-500">PDF файл отсутствует.</div></div>`;
        }
    }

    const overlay = document.getElementById('twi-viewer-overlay');
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => { overlay.classList.remove('opacity-0'); }, 10);
}

function closeTwiViewer() {
    const overlay = document.getElementById('twi-viewer-overlay');
    const content = document.getElementById('viewer-twi-content');
    
    if (content.dataset.blobUrl) {
        URL.revokeObjectURL(content.dataset.blobUrl);
        content.dataset.blobUrl = '';
    }

    overlay.classList.add('opacity-0');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        content.innerHTML = ''; 
    }, 300);
}

// === МЕНЮ СПРАВКИ В КАРТОЧКЕ ДЕФЕКТА (БЕЗ ЭМОДЗИ) ===
function openItemHelpMenu(id, event) {
    if (event) event.stopPropagation();

    const flat = getFlatList(currentChecklist);
    const itemData = flat.find(x => x.id === id);
    if (!itemData) return;

    document.getElementById('help-modal-title').innerText = itemData.n;

    const inspectorCard = customTwiCards.find(c => c.type === 'INSPECTOR' && String(c.itemId) === String(id));
    const generalCards = customTwiCards.filter(c => 
        (c.type === 'WORKER' || c.type === 'PDF') && 
        c.checklistKey === currentTemplateKey && 
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
}

function closeItemHelpMenu() {
    const overlay = document.getElementById('item-help-modal-overlay');
    const content = document.getElementById('item-help-modal-content');
    
    content.classList.add('translate-y-full');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

// === ВКЛАДКА: ИСТОРИЯ (С ФИЛЬТРАМИ v16.0) ===

// --- УМНОЕ ОБНОВЛЕНИЕ ФИЛЬТРОВ (ЧТОБЫ НЕ СБРАСЫВАЛСЯ ВЫБОР) ---
function populateSelect(id, values, defaultText) {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value; // Запоминаем, что выбрано сейчас
    el.innerHTML = `<option value="ALL">${defaultText}</option>` + values.map(v => `<option value="${v}">${v}</option>`).join('');
    if (values.includes(currentVal)) el.value = currentVal; // Восстанавливаем выбор
    else el.value = "ALL";
}


function applyHistoryFilters() {
    // Обновление лейбла кнопки времени
    const periodSelect = document.getElementById('hist-filter-period');
    const periodLabel = document.getElementById('btn-hist-period-label');
    if (periodSelect && periodLabel) {
        periodLabel.querySelector('.truncate').innerText = periodSelect.options[periodSelect.selectedIndex].text;
    }
    
    // Запуск фильтрации и отрисовки
    renderHistoryTab();
}


// === МАССОВЫЕ ОПЕРАЦИИ (ИСТОРИЯ) ===
function toggleAllHistory(checkbox) {
    const checkboxes = document.querySelectorAll('.hist-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

function getSelectedHistoryIds() {
    return Array.from(document.querySelectorAll('.hist-checkbox:checked')).map(cb => parseInt(cb.value));
}

async function deleteSelectedHistory() {
    const ids = getSelectedHistoryIds();
    if (ids.length === 0) return showToast('Выберите элементы для удаления');
    if (!confirm(`Удалить выбранные проверки (${ids.length} шт)?`)) return;

    contractorArray = contractorArray.filter(i => !ids.includes(i.id));
    
    // Удаляем из базы
    for (let id of ids) { await dbDelete(STORES.HISTORY, id); }
    
    document.getElementById('hist-select-all').checked = false;
    renderHistoryTab();
    showToast('Удалено успешно');
}

function exportSelectedCsv() {
    const ids = getSelectedHistoryIds();
    if (ids.length === 0) return showToast('Выберите элементы для выгрузки');
    
    const selectedData = contractorArray.filter(i => ids.includes(i.id));
    const csv = exportToCSV(selectedData);
    if(csv) downloadFile(csv, `rbi_selected_${new Date().toLocaleDateString()}.csv`, 'text/csv');
}

// 100% СОВМЕСТИМАЯ МОДАЛКА ИСТОРИИ ИЗ v15
function showHistoryDetail(id) {
    const sortedArray = [...contractorArray].sort((a, b) => new Date(b.date) - new Date(a.date));
    const currIdx = sortedArray.findIndex(x => x.id === id);
    if (currIdx === -1) return;
    
    const item = sortedArray[currIdx];
    const newerId = currIdx > 0 ? sortedArray[currIdx - 1].id : null;
    const olderId = currIdx < sortedArray.length - 1 ? sortedArray[currIdx + 1].id : null;

    const type = item.templateKey.split('_')[0]; 
    const key = item.templateKey.replace(type + '_', '');
    const specificChecklist = type === 'sys' && SYSTEM_TEMPLATES[key] ? SYSTEM_TEMPLATES[key].groups : (userTemplates[key] ? userTemplates[key].groups : []);
    
    let nOk = 0, nTotal = 0;

    const resultItems = getFlatList(specificChecklist).filter(i => item.state[i.id]).map(i => {
        nTotal++;
        let stTxt = 'OK', stCls = 'tag-green', cat = `B${i.w}`;
        if (item.state[i.id] === 'ok') nOk++;
        if (item.state[i.id] === 'fail') { stTxt = 'FAIL'; stCls = 'tag-red'; }
        if (item.state[i.id] === 'fail_escalated') { stTxt = '>1.5x (B3)'; stCls = 'tag-red shadow-sm'; cat = 'B3'; }
        
        let photoHtml = (item.photos && item.photos[i.id]) ? `<img src="${item.photos[i.id]}" class="mt-2 w-20 h-20 object-cover rounded border border-slate-200 shadow-sm cursor-pointer" onclick="openPhotoViewer(this.src)">` : '';
        
        let extraData = '';
        if(item.details && item.details[i.id]) {
            const d = item.details[i.id];
            if(d.fact && d.tol) extraData += `<div class="text-[10px] font-bold text-orange-600 mt-1">Факт: ${d.fact}${d.unit} при допуске ${d.tol}${d.unit} (Превышение ${(d.fact/d.tol).toFixed(1)}x)</div>`;
            if(d.comment) extraData += `<div class="text-[10px] text-slate-500 italic mt-1">${d.comment}</div>`;
        }

        return `<div class="border-b border-slate-100 dark:border-slate-700 py-2.5"><div class="flex items-start justify-between gap-3"><div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-snug"><span class="weight-tag wt-${i.w}">${cat}</span> ${i.n}${extraData}</div><span class="status-tag ${stCls}">${stTxt}</span></div>${photoHtml}</div>`;
    }).join('');

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full">
            <button class="p-2 -ml-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 active:scale-90" ${newerId ? `onclick="showHistoryDetail(${newerId})"` : 'disabled'}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg></button>
            <div class="text-center truncate flex-1 px-2 text-lg dark:text-white">${item.location}</div>
            <button class="p-2 -mr-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 active:scale-90" ${olderId ? `onclick="showHistoryDetail(${olderId})"` : 'disabled'}><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg></button>
        </div>`;
    
    document.getElementById('modal-body').innerHTML = `
        <div class="text-xs font-bold text-slate-500 mb-1">${item.contractorName}</div>
        <div class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">${item.templateTitle}</div>
        ${item.checkedStagesInfo ? `<div class="text-[9px] bg-slate-100 dark:bg-slate-800 p-2 rounded mt-2 mb-2 text-slate-500 dark:text-slate-400 font-bold leading-snug"><span class="text-slate-400 uppercase tracking-widest block mb-1">Проверенные этапы:</span> ${item.checkedStagesInfo.join('<br>')}</div>` : ''}
        <div class="text-[10px] text-slate-400 mb-4">${new Date(item.date).toLocaleString('ru-RU')}</div>
        
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">УрК Изделия</div>
                <div class="text-3xl font-black ${item.metrics.isDanger ? 'text-red-600' : (item.metrics.final < 85 ? 'text-orange-500' : 'text-green-600')}">${item.metrics.final}%</div>
            </div>
        </div>
        
        ${item.metrics.reason ? `<div class="text-[10px] font-bold text-red-600 mb-3 bg-red-50 p-3 rounded-lg border border-red-100 shadow-sm">${item.metrics.reason}</div>` : ''}
        
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
}
/* Файл: js/app.js (БЛОК 2: Инспекция, Свайпы, Аналитика, Данные) */

// === ШАПКА И ВЫБОР ЧЕК-ЛИСТА ===
// === ШАПКА И ВЫБОР ЧЕК-ЛИСТА ===
function renderSelector() {
    // Селекторы в шапке
    const sysGroup = document.getElementById('system-group');
    const userGroup = document.getElementById('user-group');
    
    // Селекторы в Справочнике
    const refSysGroup = document.getElementById('ref-system-group');
    const refUserGroup = document.getElementById('ref-user-group');

    // Селекторы на стартовом экране (Фейковые)
    const fakeSysGroup = document.getElementById('fake-system-group');
    const fakeUserGroup = document.getElementById('fake-user-group');

    // ИСПРАВЛЕНИЕ: Сортировка по алфавиту (по названию)
    let sysKeys = Object.keys(SYSTEM_TEMPLATES).sort((a, b) => SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title, 'ru'));
    let sysHtml = sysKeys.map(key => `<option value="sys_${key}">${SYSTEM_TEMPLATES[key].title}</option>`).join('');

    let userKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru'));
    let userHtml = userKeys.length > 0 ? userKeys.map(key => `<option value="user_${key}">${userTemplates[key].title}</option>`).join('') : `<option disabled>Своих шаблонов нет</option>`;

    if(sysGroup) sysGroup.innerHTML = sysHtml;
    if(userGroup) userGroup.innerHTML = userHtml;
    
    if(refSysGroup) refSysGroup.innerHTML = sysHtml;
    if(refUserGroup) refUserGroup.innerHTML = userHtml;

    if(fakeSysGroup) fakeSysGroup.innerHTML = sysHtml;
    if(fakeUserGroup) fakeUserGroup.innerHTML = userHtml;

    if(currentTemplateKey) {
        const sel = document.getElementById('checklist-selector');
        if(sel) sel.value = currentTemplateKey;
    }
}

// Изменение селектора ТОЛЬКО в Справочнике
function changeRefTemplate(selectEl) {
    const label = document.getElementById('ref-selector-label');
    if (label) label.innerHTML = `${selectEl.options[selectEl.selectedIndex].text} <span>▼</span>`;
    renderReferenceTab();
}

// === НАЧАЛО ЗАМЕНЫ 1: УМНЫЙ СБРОС ПОЛЕЙ === //
function changeTemplate(val) {
    if (val === 'HOME') {
        currentTemplateKey = ''; 
        if(document.getElementById('checklist-selector')) document.getElementById('checklist-selector').value = ''; 
        state = {}; details = {}; photos = {};
        
        // Умный сброс (Инспектор остается)
        if(document.getElementById('inp-project')) document.getElementById('inp-project').value = '';
        if(document.getElementById('inp-contractor')) document.getElementById('inp-contractor').value = '';
        if(document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

        switchTab('tab-audit');
        document.getElementById('empty-checklist-state').style.display = 'block';
        document.getElementById('audit-items').style.display = 'none';
        document.getElementById('audit-actions').style.display = 'none';
        
        const nav = document.getElementById('audit-group-nav');
        if(nav) { nav.innerHTML = ''; nav.classList.add('hidden'); }
        
        document.getElementById('data-block-summary')?.classList.add('hidden');
        if(document.getElementById('current-checklist-label')) document.getElementById('current-checklist-label').innerText = 'Вид работ не выбран';
        
        saveSessionData();
        return;
    }

    if (val === 'UPLOAD') {
        document.getElementById('json-input').click();
        document.getElementById('checklist-selector').value = currentTemplateKey || "";
        return;
    }

    currentTemplateKey = val;
    const type = val.split('_')[0];
    const key = val.replace(type + '_', '');
    
    if (type === 'sys' && SYSTEM_TEMPLATES[key]) currentChecklist = SYSTEM_TEMPLATES[key].groups;
    else if (type === 'user' && userTemplates[key]) currentChecklist = userTemplates[key].groups;
    
    // Сброс ответов при смене листа
    state = {}; details = {}; photos = {}; 
    
    // Умный сброс полей ввода (Инспектор остается!)
    if(document.getElementById('inp-project')) document.getElementById('inp-project').value = '';
    if(document.getElementById('inp-contractor')) document.getElementById('inp-contractor').value = '';
    if(document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

    saveSessionData(); 
    
    // ИСПРАВЛЕНИЕ ЗАДАЧИ 2: Синхронизируем главный селектор перед обновлением шапки
    if (document.getElementById('checklist-selector')) {
        document.getElementById('checklist-selector').value = val;
    }
    updateDataSummary();
    
    document.getElementById('empty-checklist-state').style.display = 'none';
    document.getElementById('audit-items').style.display = 'block';
    document.getElementById('audit-actions').style.display = 'grid';

    if(document.getElementById('tab-audit').classList.contains('active')) { render(); updateUI(); }
}
// === КОНЕЦ ЗАМЕНЫ 1 === //

function updateDataSummary() {
    const proj = document.getElementById('inp-project')?.value.trim() || 'Объект';
    const contr = document.getElementById('inp-contractor')?.value.trim() || 'Подрядчик';
    const loc = document.getElementById('inp-location')?.value.trim() || 'Локация';
    
    const selectEl = document.getElementById('checklist-selector');
    const clName = selectEl?.options[selectEl.selectedIndex]?.text.replace('▼', '').trim() || 'Чек-лист не выбран';
    
    const summary = document.getElementById('data-block-summary');
    if(summary) summary.innerText = `✏️ ${clName} | ${proj} | ${contr} | ${loc}`;
    
    const labelEl = document.getElementById('current-checklist-label');
    if(labelEl) labelEl.innerText = clName;
}

function toggleDataBlock(forceOpen = false) {
    const content = document.getElementById('data-block-content');
    const summary = document.getElementById('data-block-summary');
    const icon = document.getElementById('data-toggle-icon');
    if(!content || !summary) return;
    
    if (forceOpen || content.style.display === 'none') {
        content.style.display = 'grid'; summary.classList.add('hidden'); icon.innerText = 'СВЕРНУТЬ ▲';
    } else {
        updateDataSummary(); content.style.display = 'none'; summary.classList.remove('hidden'); icon.innerText = 'РАЗВЕРНУТЬ ▼';
    }
}

// === ЛОГИКА ВЗАИМОДЕЙСТВИЯ (ОТКАЗ ОТ ПОЛНОЙ ПЕРЕРИСОВКИ) ===
function toggleOk(id) {
    if (state[id] === 'ok') { 
        state[id] = null; delete photos[id]; delete details[id]; 
    } else { 
        state[id] = 'ok'; delete details[id]; // Фото не удаляем!
    }
    updateCardDOM(id); updateUI(); scheduleSessionSave();
}

function toggleFail(id) {
    if (state[id] === 'fail' || state[id] === 'fail_escalated') { 
        state[id] = null; delete photos[id]; delete details[id]; 
    } else { 
        state[id] = 'fail'; delete details[id]; // Фото не удаляем!
    }
    updateCardDOM(id); updateUI(); scheduleSessionSave();
}

function toggleEscalation(id) {
    if (state[id] === 'fail_escalated') state[id] = 'fail';
    else if (state[id] === 'fail') state[id] = 'fail_escalated';
    updateCardDOM(id); updateUI(); scheduleSessionSave();
}

// === РЕНДЕР ОСМОТРА ===
function render() {
    if(!currentTemplateKey) return;
    const root = document.getElementById('audit-items');
    const navRoot = document.getElementById('audit-group-nav');
    if(!root) return;

    let html = ""; let navHtml = "";

    currentChecklist.forEach((g, gIndex) => {
        navHtml += `<button id="nav-btn-${gIndex}" onclick="scrollToGroup(${gIndex})" class="inline-block px-3 py-1.5 min-w-fit text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95 shrink-0">${g.group || g.title}</button>`;

        // Проверяем настройку свернутости по умолчанию
        const isCollapsed = appSettings.defaultGroupsCollapsed;
        const arrow = isCollapsed ? '▶' : '▼';
        const displayStyle = isCollapsed ? 'display: none;' : 'display: block;';

        html += `<div class="block-title flex justify-between items-center cursor-pointer select-none rounded-lg px-2 mt-4" onclick="toggleGroup(${gIndex})">
            <span id="group-title-${gIndex}">${arrow} ${g.group || g.title}</span>
            <span id="group-counter-${gIndex}" class="text-[10px] bg-[var(--card-border)] px-2 py-0.5 rounded text-[var(--text-muted)]">0/${g.items.length}</span>
        </div><div id="group_content_${gIndex}" class="transition-all origin-top" style="${displayStyle}">`;
        
        // Рендерим пункты как есть (сортировку ошибок наверх убрали)
        let itemsToRender = [...g.items];
        
        itemsToRender.forEach((i) => { html += `<div id="card_wrapper_${i.id}"></div>`; });
        html += `</div>`;
    });

    root.innerHTML = html;
    if (navRoot) { navRoot.innerHTML = navHtml; navRoot.classList.remove('hidden'); }

    // Рендер карточек
    currentChecklist.forEach(g => {
        g.items.forEach(i => updateCardDOM(i.id, i));
    });

    if (appSettings.swipeEnabled) initSwipes();
    updateGroupCounters();
}

function toggleGroup(index) {
    const content = document.getElementById(`group_content_${index}`);
    const title = document.getElementById(`group-title-${index}`);
    if (!content || !title) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        title.innerText = title.innerText.replace('▶', '▼');
    } else {
        content.style.display = 'none';
        title.innerText = title.innerText.replace('▼', '▶');
    }
}

function scrollToGroup(index) {
    const content = document.getElementById(`group_content_${index}`);
    if (content && content.previousElementSibling) {
        // Динамически вычисляем высоту текущей шапки
        const headerEl = document.getElementById('main-header');
        const headerOffset = headerEl ? headerEl.offsetHeight + 10 : 120; 
        
        const elementPosition = content.previousElementSibling.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
}

// === КНОПКИ ЭТАПОВ (РАСКРАСКА ПО КАЧЕСТВУ) ===
function updateGroupCounters() {
    if(!currentTemplateKey) return;
    
    currentChecklist.forEach((g, gIndex) => {
        let answered = 0;
        let stageState = {};
        
        // Собираем стейт только для этого этапа
        g.items.forEach(i => {
            if (state[i.id]) {
                answered++;
                stageState[i.id] = state[i.id];
            }
        });
        
        const counterEl = document.getElementById(`group-counter-${gIndex}`);
        const navBtnEl = document.getElementById(`nav-btn-${gIndex}`);
        
        if (counterEl) counterEl.innerText = `${answered}/${g.items.length}`;
        
        if (navBtnEl) {
            // Если этап не начали проверять
            if (answered === 0) {
                navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95`;
            } else {
                // Если начали, считаем его УрК
                const stageMetrics = getProductMetrics(stageState, [g]);
                const f = stageMetrics.final;
                
                // Тонкий iOS-стиль (border вместо border-2, font-bold вместо font-black)
                if (f < 70 || stageMetrics.isDanger) {
                    navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 active:scale-95`;
                } else if (f < 85) {
                    navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400 active:scale-95`;
                } else {
                    navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 active:scale-95`;
                }
            }
        }
    });
}
// Функция принудительного разворачивания карточки без потери статуса OK
window.expandCard = function(id, event) {
    if(event) event.stopPropagation();
    const flatList = getFlatList(currentChecklist);
    const itemData = flatList.find(x => x.id === id);
    if(itemData) {
        itemData._forceExpand = true; // Ставим метку, что юзер хочет видеть ее развернутой
        updateCardDOM(id, itemData);
    }
};

function updateCardDOM(id, itemData = null) {
    const wrapper = document.getElementById(`card_wrapper_${id}`);
    if(!wrapper) return;

    if (!itemData) {
        const flat = getFlatList(currentChecklist);
        itemData = flat.find(x => x.id === id);
    }
    if(!itemData) return;

    const s = state[id];
    const i = itemData;
    
    let isEscalated = s === 'fail_escalated';
    let failActive = s === 'fail' || s === 'fail_escalated';
    let okActive = s === 'ok';

    let cardBgClass = failActive ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' : (okActive ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' : '');
    let indicatorClass = `indicator-${s ? (okActive ? 'ok' : (isEscalated ? 3 : i.w)) : i.w}`;
    
    let collapseClass = '';
    if (okActive && appSettings.autoCollapseOk && !itemData._forceExpand) {
        collapseClass = 'card-collapsed';
        cardBgClass = ''; 
    }

    if (appSettings.soundEnabled && state[id] && !itemData._justRendered) {
        if (state[id] === 'ok') audioOk.play().catch(()=>{});
        else audioFail.play().catch(()=>{});
    }
    itemData._justRendered = true; 

    // === ИЩЕМ ПРИВЯЗАННЫЕ ИНСТРУКЦИИ (КНОПКА СПРАВКИ) ===
    // === ИЩЕМ ПРИВЯЗАННЫЕ ИНСТРУКЦИИ (КНОПКА СПРАВКИ) ===
    const inspectorCard = customTwiCards.find(c => c.type === 'INSPECTOR' && String(c.itemId) === String(id));
    const generalCards = customTwiCards.filter(c => 
        (c.type === 'WORKER' || c.type === 'PDF') && 
        c.checklistKey === currentTemplateKey && 
        (String(c.itemId) === String(id) || c.itemId === 'ALL' || !c.itemId)
    );
    const hasAnyHelp = inspectorCard || generalCards.length > 0;
    
    let helpBtnHtml = '';
    if (hasAnyHelp) {
        const btnClass = inspectorCard 
            ? 'text-blue-600 bg-blue-100 border-blue-300 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800' 
            : 'text-slate-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';
        
        helpBtnHtml = `
            <button onclick="openItemHelpMenu(${id}, event)" class="btn-status ${btnClass} !w-10 !h-10 !rounded-md relative shadow-sm shrink-0" title="Инструкции и Справка">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ${inspectorCard ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>' : ''}
            </button>
        `;
    } else {
        helpBtnHtml = `
            <button onclick="showToast('К этому пункту пока не привязаны инструкции')" class="btn-status text-slate-300 bg-transparent border-dashed border-slate-200 dark:text-slate-600 dark:border-slate-700 !w-10 !h-10 !rounded-md shadow-sm shrink-0" title="Нет инструкций">
                <svg class="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
        `;
    }

    // === ОСНОВНЫЕ КНОПКИ (OK / FAIL) iOS Style ===
    let mainBtnsHtml = `
        <button onclick="toggleOk(${id})" class="btn-status ${okActive ? 'bg-green-500 text-white border-green-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button onclick="toggleFail(${id})" class="btn-status ${failActive ? 'bg-red-500 text-white border-red-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;

    let contentHtml = '';

    // === 1. МАКЕТ ПРИ FAIL (Двухуровневый: Текст сверху, Кнопки снизу) ===
    if (failActive) {
        let hasComment = details[id]?.comment && details[id].comment.trim() !== "";
        
        let commBtn = hasComment ? 
            `<div class="relative shrink-0"><button onclick="toggleCommentField(${id})" class="btn-status text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 !w-11 !h-11 !rounded-[12px] shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button><div onclick="deleteComment(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` : 
            `<button onclick="toggleCommentField(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button>`;
        
        let photoBtn = photos[id] ? 
            `<div class="relative shrink-0"><img src="${photos[id]}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-indigo-200 dark:border-indigo-800 shadow-sm object-cover" onclick="openPhotoViewer('${photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` : 
            `<button onclick="triggerPhotoInput(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg></button>`;

        let escBtn = (i.w === 2) ? `<button onclick="toggleEscalation(${id})" class="btn-status ${isEscalated ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'text-orange-500 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'} !w-11 !h-11 !rounded-[12px] transition-all shrink-0 shadow-sm"><span class="text-[13px] font-bold">>1.5</span></button>` : '';

        let visualIndicatorHtml = isEscalated ? `<div class="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded w-fit mt-1 shadow-sm">Дефект учтен как B3</div>` : '';
        let commentBlockHtml = hasComment ? `<div class="mt-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-red-100 dark:border-red-800 shadow-sm leading-snug break-words w-full">💬 ${details[id].comment}</div>` : '';

        contentHtml = `
            <div class="flex flex-col w-full">
                <!-- Верх: Название дефекта (Нормы скрыты) -->
                <div class="w-full pointer-events-none mb-2">
                    <div class="text-[13px] font-bold leading-snug card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    ${visualIndicatorHtml}
                    ${commentBlockHtml}
                </div>
                
                <!-- Низ: Разделенный Тулбар -->
                <div class="flex justify-between items-center w-full mt-1 border-t border-red-100 dark:border-red-800 pt-3">
                    
                    <!-- Левая сторона: Фото, Коммент, 1.5x -->
                    <div class="flex items-center gap-1.5 shrink-0">
                        ${photoBtn}
                        ${commBtn}
                        ${escBtn}
                    </div>
                    
                    <!-- Правая сторона: Справка, OK, FAIL -->
                    <div class="flex items-center gap-1.5 shrink-0">
                        ${helpBtnHtml}
                        ${mainBtnsHtml}
                    </div>
                </div>
            </div>
        `;
    } 
    // === 2. МАКЕТ ПРИ OK (Нормы скрыты, добавлено фото эталона) ===
    else if (okActive) {
        let photoBtnOk = photos[id] ? 
            `<div class="relative shrink-0"><img src="${photos[id]}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-green-300 shadow-sm object-cover" onclick="openPhotoViewer('${photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` : 
            `<button onclick="triggerPhotoInput(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm text-green-600 bg-green-50 border-green-200" title="Добавить фото эталона"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg></button>`;

        contentHtml = `
            <div class="flex justify-between items-center w-full min-h-[44px]">
                <div class="flex-1 mr-3 min-w-0 pointer-events-none">
                    <div class="text-[13px] font-bold leading-snug card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${photoBtnOk}
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
    }
    // === 3. НЕЙТРАЛЬНЫЙ МАКЕТ (Видно всё) ===
    else {
        contentHtml = `
            <div class="flex justify-between items-center w-full min-h-[44px]">
                <div class="flex-1 mr-3 min-w-0 pointer-events-none">
                    <div class="text-[13px] font-bold leading-snug mb-1 card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    <div class="text-[11px] text-[var(--text-muted)] leading-snug norm-desc-text">${i.t}</div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
    }

    const cardHtml = `
    <div class="card-audit swipe-container ${indicatorClass} ${cardBgClass} ${collapseClass}" data-id="${id}" onclick="if(this.classList.contains('card-collapsed')) expandCard(${id}, event)">
        <div class="swipe-actions-bg swipe-bg-ok"><span class="ml-4">OK</span></div>
        <div class="swipe-actions-bg swipe-bg-fail"><span class="mr-4">FAIL</span></div>
        <div class="swipe-content p-2.5 bg-inherit border-inherit rounded-inherit h-full w-full bg-[var(--card-bg)] dark:bg-slate-800 transition-colors">
            ${contentHtml}
        </div>
    </div>`;
    
    wrapper.innerHTML = cardHtml;
}

// === СВАЙПЫ (ЛОГИКА) ===
// === СВАЙПЫ (УМНАЯ ЛОГИКА И ПЛАВНОСТЬ iOS) ===
function initSwipes() {
    const container = document.getElementById('audit-items');
    let startX = 0, currentX = 0, isDragging = false, currentCard = null, content = null;
    let bgOk = null, bgFail = null;

    container.addEventListener('touchstart', (e) => {
        if (!appSettings.swipeEnabled) return;
        const target = e.target.closest('.swipe-container');
        if (!target || e.target.closest('.btn-status') || e.target.closest('.photo-thumb')) return; 
        
        currentCard = target;
        content = currentCard.querySelector('.swipe-content');
        bgOk = currentCard.querySelector('.swipe-bg-ok');
        bgFail = currentCard.querySelector('.swipe-bg-fail');
        
        startX = e.touches[0].clientX;
        isDragging = true;
        currentCard.classList.add('swiping');
        
        // Сбрасываем стили
        if(bgOk) bgOk.style.opacity = '0';
        if(bgFail) bgFail.style.opacity = '0';
    }, {passive: true});

    container.addEventListener('touchmove', (e) => {
        if (!isDragging || !currentCard || !content) return;
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        
        // Ограничитель с эффектом "резинки"
        const maxSwipe = 100;
        let moveX = diff;
        if (diff > maxSwipe) moveX = maxSwipe + (diff - maxSwipe) * 0.2; 
        if (diff < -maxSwipe) moveX = -maxSwipe + (diff + maxSwipe) * 0.2;
        
        content.style.transform = `translateX(${moveX}px)`;

        // Плавное проявление цвета подложки (Opacity)
        if (diff > 0 && bgOk && bgFail) {
            bgOk.style.zIndex = 1; bgFail.style.zIndex = 0;
            bgOk.style.opacity = Math.min(diff / 80, 1).toString();
            bgFail.style.opacity = '0';
        } else if (diff < 0 && bgOk && bgFail) {
            bgOk.style.zIndex = 0; bgFail.style.zIndex = 1;
            bgFail.style.opacity = Math.min(Math.abs(diff) / 80, 1).toString();
            bgOk.style.opacity = '0';
        }
    }, {passive: true});

    container.addEventListener('touchend', (e) => {
        if (!isDragging || !currentCard || !content) return;
        isDragging = false;
        currentCard.classList.remove('swiping');
        
        const diff = currentX - startX;
        const id = parseInt(currentCard.dataset.id);

        // Возвращаем карточку на место
        content.style.transform = `translateX(0)`;
        if(bgOk) bgOk.style.opacity = '0';
        if(bgFail) bgFail.style.opacity = '0';

        // Отложенное срабатывание (ждем пока карточка визуально отскочит)
        if (diff > 80) {
            setTimeout(() => toggleOk(id), 150);
        } else if (diff < -80) {
            setTimeout(() => toggleFail(id), 150);
        }
        
        currentCard = null; content = null; bgOk = null; bgFail = null;
    });
}

// === ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА ===
// === ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА ===
// === ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА ===
function updateUI() {
    const p = currentTemplateKey ? getProductMetrics(state, currentChecklist) : null;
    const getTextColor = (val, isDanger) => {
        if(isDanger || val < 70) return 'text-white drop-shadow-md';
        if(val < 85) return 'text-slate-900'; 
        return 'text-white drop-shadow-md'; 
    };

    // Обновление метрик текущего осмотра
    if (!p) {
        if(document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = "0/0";
        if(document.getElementById('dash-p-bar')) document.getElementById('dash-p-bar').style.width = "0%";
        if(document.getElementById('dash-p-percent')) document.getElementById('dash-p-percent').innerText = "--%";
        ['dash-p-kc', 'dash-p-kcrit', 'dash-p-b2', 'dash-p-b3'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerText = "-"; });
    } else {
        if(document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = `${p.checkedCount}/${p.totalCount}`;
        if(document.getElementById('dash-p-bar')) {
            document.getElementById('dash-p-bar').style.width = `${p.final}%`;
            document.getElementById('dash-p-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${p.isDanger ? 'bg-red-500' : (p.final < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
        }
        if(document.getElementById('dash-p-percent')) {
            document.getElementById('dash-p-percent').innerText = `${p.final}%`;
            document.getElementById('dash-p-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(p.final, p.isDanger)}`;
        }
        if(document.getElementById('dash-p-kc')) document.getElementById('dash-p-kc').innerText = p.kc.toFixed(2);
        if(document.getElementById('dash-p-kcrit')) document.getElementById('dash-p-kcrit').innerText = p.kcrit.toFixed(2);
        if(document.getElementById('dash-p-b2')) document.getElementById('dash-p-b2').innerText = p.n_B2_fail;
        if(document.getElementById('dash-p-b3')) document.getElementById('dash-p-b3').innerText = p.n_B3_fail;
    }

    // Обновление интегральных метрик подрядчика
    const currentContr = document.getElementById('inp-contractor')?.value.trim();
    const filteredArr = currentContr ? contractorArray.filter(i => i.contractorName === currentContr && i.templateKey === currentTemplateKey) : [];
    
    // Модель 4.0: Порог старта расчета - 7 независимых проверок
    if (filteredArr.length < 7) { 
        if(document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${filteredArr.length}/7 пров.`;
        if(document.getElementById('dash-c-bar')) document.getElementById('dash-c-bar').style.width = "0%";
        if(document.getElementById('dash-c-percent')) document.getElementById('dash-c-percent').innerText = "СБОР";
        ['dash-c-ks', 'dash-c-kcrit', 'dash-c-b3'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerText = "-"; });
    } else {
        const c = getContractorMetrics(filteredArr, userTemplates);
        if(c) {
            if(document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${c.count} пров.`;
            if(document.getElementById('dash-c-bar')) {
                document.getElementById('dash-c-bar').style.width = `${c.finalC}%`;
                document.getElementById('dash-c-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${c.isRedZone ? 'bg-red-500' : (c.finalC < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
            }
            if(document.getElementById('dash-c-percent')) {
                document.getElementById('dash-c-percent').innerText = `${c.finalC}%`;
                document.getElementById('dash-c-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(c.finalC, c.isRedZone)}`;
            }
            if(document.getElementById('dash-c-ks')) {
                const ksEl = document.getElementById('dash-c-ks');
                ksEl.innerText = c.ks.toFixed(2);
                ksEl.className = `font-black ${c.ks < 1 ? 'text-red-500' : 'text-green-600'}`;
            }
            if(document.getElementById('dash-c-kcrit')) {
                const kcritEl = document.getElementById('dash-c-kcrit');
                kcritEl.innerText = c.kcritC.toFixed(2);
                kcritEl.className = `font-black ${c.kcritC < 1 ? 'text-red-500' : 'text-green-600'}`;
            }
            if(document.getElementById('dash-c-b3')) document.getElementById('dash-c-b3').innerText = c.n_изделий_с_B3;
        }
    }
    
    const selectEl = document.getElementById('checklist-selector');
    const clName = selectEl?.options[selectEl.selectedIndex]?.text.replace('▼', '').trim() || 'Вид работ не выбран';
    const labelEl = document.getElementById('current-checklist-label');
    if(labelEl) labelEl.innerText = clName;

    updateGroupCounters();
}

// === СОХРАНЕНИЕ / ОЧИСТКА ===
function saveProductToArray() {
    const projInput = document.getElementById('inp-project');
    const inspInput = document.getElementById('inp-inspector');
    const contrInput = document.getElementById('inp-contractor');
    const locInput = document.getElementById('inp-location');

    let hasError = false;
    
    // Жесткая проверка: если поле пустое, красим в красный
    [projInput, inspInput, contrInput, locInput].forEach(el => {
        if (el && !el.value.trim()) {
            el.classList.add('border-red-500', 'bg-red-50');
            setTimeout(() => el.classList.remove('border-red-500', 'bg-red-50'), 3000);
            hasError = true;
        }
    });

    if (hasError) {
        showToast('⚠️ Заполните все поля (Объект, Проверяющий, Подрядчик, Локация)!');
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        return;
    }
    // --- ЗАЩИТА ОТ ДУБЛИКАТОВ ---
    const locVal = locInput.value.trim();
    const projVal = projInput.value.trim();
    const contrVal = contrInput.value.trim();

    const isDuplicate = contractorArray.some(item => 
        item.projectName === projVal &&
        item.contractorName === contrVal &&
        item.templateKey === currentTemplateKey &&
        item.location === locVal
    );

    if (isDuplicate) {
        return showToast('⚠️ Проверка с такой локацией уже существует в Истории!');
    }
    // ----------------------------

    let mergedState = {};
    let mergedDetails = {};
    let mergedPhotos = {};
    let checkedStageNames = [];
    let stagesToMetric = [];

    currentChecklist.forEach(group => {
        let hasAnswersInStage = false;
        group.items.forEach(item => {
            if (state[item.id]) {
                mergedState[item.id] = state[item.id];
                if (details[item.id]) mergedDetails[item.id] = details[item.id];
                if (photos[item.id]) mergedPhotos[item.id] = photos[item.id];
                hasAnswersInStage = true;
            }
        });

        if (hasAnswersInStage) {
            checkedStageNames.push(group.group || group.title);
            stagesToMetric.push(group);
        }
    });

    if (checkedStageNames.length === 0) {
        return showToast('⚠️ Чек-лист пуст. Заполните хотя бы один пункт.');
    }

    const finalMetrics = getProductMetrics(mergedState, stagesToMetric);
    const isFullCheck = checkedStageNames.length === currentChecklist.length;
    const stageNameLabel = isFullCheck ? 'Полная проверка' : 'Частичная проверка';
    
    const selectEl = document.getElementById('checklist-selector');
    const tTitle = selectEl.options[selectEl.selectedIndex].text.replace('▼', '').trim();

    const newItem = { 
        id: Date.now() + Math.floor(Math.random() * 1000), 
        date: new Date().toISOString(), 
        projectName: projInput.value.trim(), 
        inspectorName: inspInput.value.trim(), 
        contractorName: contrInput.value.trim(),
        templateKey: currentTemplateKey, 
        templateTitle: tTitle,
        location: locInput.value.trim(), 
        stageId: 0, 
        stageName: stageNameLabel,
        checkedStagesInfo: checkedStageNames, 
        isCompleted: isFullCheck,
        state: JSON.parse(JSON.stringify(mergedState)), 
        details: JSON.parse(JSON.stringify(mergedDetails)), 
        photos: JSON.parse(JSON.stringify(mergedPhotos)), 
        metrics: finalMetrics 
    };

    contractorArray.push(newItem);
    if (!isDemoMode) {
        dbPut(STORES.HISTORY, newItem); // ЗАЩИТА: не пишем в БД в демо-режиме
    }
    
    // Очищаем стейт ответов
    state = {}; details = {}; photos = {}; 
    
    // СБРОС ТОЛЬКО ПОЛЯ ЛОКАЦИЯ
    locInput.value = '';
    
    scheduleSessionSave(); 
    
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast(`✅ Сохранено в Историю!`);
    
    // ИСПРАВЛЕНИЕ БАГА: Принудительно обновляем память полей и фильтры сразу после сохранения!
    updateDatalists();
    updateAllDynamicFilters();
    
    render(); 
    updateUI();
// АВТОБЭКАП (Раз в 10 проверок)
    let checksSaved = parseInt(localStorage.getItem('auto_backup_counter') || '0') + 1;
    localStorage.setItem('auto_backup_counter', checksSaved);
    if (checksSaved >= 10 && !isDemoMode) {
        localStorage.setItem('auto_backup_counter', '0');
        showToast('🔄 Выполняется фоновое автосохранение...');
        // Генерируем и кладем в IndexedDB спец. ключ
        if (typeof generateBackupObject === 'function') {
            const autoObj = generateBackupObject('full');
            dbPut(STORES.SETTINGS, { key: 'auto_backup_latest', data: autoObj }).then(() => {
                console.log('Автобэкап сохранен в БД');
            });
        }
    }
}

// === ОБНОВЛЕНИЕ ПАМЯТИ ПОЛЕЙ ВВОДА (АВТОКОМПЛИТ) ===
function updateDatalists() {
    if (!contractorArray || contractorArray.length === 0) return;
    
    // Получаем последние 15 уникальных значений для каждого поля
    const getTopRecent = (field) => {
        const sorted = [...contractorArray].sort((a,b) => new Date(b.date) - new Date(a.date));
        return [...new Set(sorted.map(i => i[field]).filter(Boolean))].slice(0, 15);
    };

    const buildOptions = (arr) => arr.map(v => `<option value="${v}">`).join('');

    const dlProj = document.getElementById('dl-projects');
    const dlInsp = document.getElementById('dl-inspectors');
    const dlContr = document.getElementById('dl-contractors');
    const dlLoc = document.getElementById('dl-locations');

    if(dlProj) dlProj.innerHTML = buildOptions(getTopRecent('projectName'));
    if(dlInsp) dlInsp.innerHTML = buildOptions(getTopRecent('inspectorName'));
    if(dlContr) dlContr.innerHTML = buildOptions(getTopRecent('contractorName'));
    if(dlLoc) dlLoc.innerHTML = buildOptions(getTopRecent('location'));
}

function resetChecklist() {
    if(!confirm('Очистить только текущий чек-лист?')) return;
    state = {}; details = {}; photos = {}; document.getElementById('inp-location').value = ''; 
    saveSessionData(); render(); updateUI();
}

async function clearHistory() {
    if(!confirm('Удалить всю историю проверок?')) return;
    contractorArray = []; await dbClear(STORES.HISTORY); renderHistoryTab();
}

async function fullFactoryReset() {
    if(!confirm('УДАЛИТЬ ВООБЩЕ ВСЁ? Это действие необратимо!')) return;
    await dbClear(STORES.HISTORY);
    await dbClear(STORES.STATE);
    await dbClear(STORES.SETTINGS);
    await dbClear(STORES.TEMPLATES);
    localStorage.clear();
    location.reload();
}

// === АНАЛИТИКА И ОТЧЕТЫ ===


function renderAnalyticsTab() {
    const container = document.getElementById('analytics-contractors-container');
    if(!container) return;
    for (const key in chartInstances) { if (chartInstances[key]) chartInstances[key].destroy(); }
    chartInstances = {};

    if (contractorArray.length === 0) {
        container.innerHTML = `<p class="text-center py-6 text-slate-500 text-sm">Нет данных для аналитики.</p>`; return;
    }

    let baseArray = contractorArray;
    const fContr = document.getElementById('analytics-contractor-select')?.value || 'ALL';
    if(fContr !== "ALL") baseArray = baseArray.filter(i => i.contractorName === fContr);

    if (baseArray.length === 0) {
        container.innerHTML = `<p class="text-center py-6 text-slate-500 text-sm">По выбранным фильтрам нет данных.</p>`; return;
    }

    // Сокращенная версия генерации дашборда для совместимости с v15 (графики и эксперт)
    let sumUrk = 0; baseArray.forEach(i => sumUrk += i.metrics.final);
    const avgUrk = Math.round(sumUrk / baseArray.length);

    let html = `
    <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div class="text-[10px] text-slate-400 font-bold uppercase mb-2">Общая сводка</div>
        <div class="flex justify-between items-center mb-4">
            <div>Средний УрК: <b class="text-2xl">${avgUrk}%</b></div>
            <div>Проверок: <b>${baseArray.length}</b></div>
        </div>
    </div>`;

    // Генерация карточек по подрядчикам
    const uniqueCs = [...new Set(baseArray.map(i => i.contractorName))];
    uniqueCs.forEach(cName => {
        const cData = baseArray.filter(i => i.contractorName === cName);
        const uniqueTs = [...new Set(cData.map(i => i.templateKey))];
        
        uniqueTs.forEach(tKey => {
            const tData = cData.filter(i => i.templateKey === tKey);
            const tmplTitle = tData[0].templateTitle;
            const safeId = cName.replace(/\W/g, '_') + '_' + tKey;
            
            let expHtml = "";
            if (tData.length >= 7) {
                const metrics = getContractorMetrics(tData, userTemplates);
                const expert = getExpertConclusion(metrics, cName, tmplTitle, tData.length, safeId, customExpertConclusions);
                expHtml = expert.uiHtml;
            } else {
                expHtml = `<div class="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-[10px] mt-4 mb-4">Собрано ${tData.length} изд. Для расчета УрК нужно минимум 7.</div>`;
            }

            html += `
            <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <div class="font-black text-sm uppercase mb-1">${cName}</div>
                <div class="text-[10px] text-slate-500 mb-2 border-b pb-2">${tmplTitle}</div>
                ${expHtml}
            </div>`;
        });
    });

    container.innerHTML = html;
}

// === УМНЫЕ МУЛЬТИ-ФИЛЬТРЫ И ИСТОРИЯ ===
function updateAllDynamicFilters() {
    // Обновляем надписи на кнопках мульти-фильтров
    if (typeof updateFilterButtonLabels === 'function') {
        updateFilterButtonLabels();
    }
}

function applyHistoryFilters() {
    const periodSelect = document.getElementById('hist-filter-period');
    const periodLabel = document.getElementById('btn-hist-period-label');
    if (periodSelect && periodLabel) {
        periodLabel.querySelector('.truncate').innerText = periodSelect.options[periodSelect.selectedIndex].text;
    }
    renderHistoryTab();
}

function renderHistoryTab() {
    const listDiv = document.getElementById('history-list'); 
    const emptyMsg = document.getElementById('hist-empty-msg');
    const countEl = document.getElementById('hist-count-total');
    if(!listDiv) return;

    if (contractorArray.length === 0) { 
        listDiv.innerHTML = ''; 
        if(emptyMsg) emptyMsg.style.display = 'block'; 
        if(countEl) countEl.innerText = '0';
        return; 
    }
    if(emptyMsg) emptyMsg.style.display = 'none';

    const fSearch = document.getElementById('hist-search-text')?.value.toLowerCase() || '';
    const fPeriod = document.getElementById('hist-filter-period')?.value || 'ALL';
    const fPhoto = document.getElementById('hist-filter-photo')?.checked;
    const fB3 = document.getElementById('hist-filter-b3')?.checked;

    const fProj = activeMultiFilters.history.project || [];
    const fContr = activeMultiFilters.history.contractor || [];
    const fInsp = activeMultiFilters.history.inspector || [];

    let filteredArr = contractorArray;
    const now = new Date();
    
    if (fSearch) {
        filteredArr = filteredArr.filter(i => 
            (i.location && i.location.toLowerCase().includes(fSearch)) ||
            (i.projectName && i.projectName.toLowerCase().includes(fSearch)) ||
            (i.inspectorName && i.inspectorName.toLowerCase().includes(fSearch)) ||
            (i.contractorName && i.contractorName.toLowerCase().includes(fSearch))
        );
    }
    
    if (fProj.length > 0) filteredArr = filteredArr.filter(i => fProj.includes(i.projectName));
    if (fContr.length > 0) filteredArr = filteredArr.filter(i => fContr.includes(i.contractorName));
    if (fInsp.length > 0) filteredArr = filteredArr.filter(i => fInsp.includes(i.inspectorName));
    
    if (fPeriod === 'DAY') filteredArr = filteredArr.filter(i => new Date(i.date).toDateString() === now.toDateString());
    else if (fPeriod === 'WEEK') { const w = new Date(); w.setDate(now.getDate()-7); filteredArr = filteredArr.filter(i => new Date(i.date) >= w); }
    else if (fPeriod === 'MONTH') { const m = new Date(); m.setDate(now.getDate()-30); filteredArr = filteredArr.filter(i => new Date(i.date) >= m); }

    if (fPhoto) filteredArr = filteredArr.filter(i => i.photos && Object.keys(i.photos).length > 0);
    if (fB3) filteredArr = filteredArr.filter(i => i.metrics && i.metrics.n_B3_fail > 0);

    if(countEl) countEl.innerText = filteredArr.length;

    if (filteredArr.length === 0) {
        listDiv.innerHTML = `<div class="text-sm text-slate-500 text-center bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">По заданным фильтрам проверок не найдено.</div>`;
        return;
    }

    const grouped = {};
    filteredArr.forEach(item => {
        // УМНАЯ СВЯЗКА: Подрядчик + Объект
        const cName = `${item.contractorName || 'Не указан'} [${item.projectName || 'Без объекта'}]`; 
        const tTitle = item.templateTitle || 'Неизвестный вид работ';
        if (!grouped[cName]) grouped[cName] = {}; 
        if (!grouped[cName][tTitle]) grouped[cName][tTitle] = [];
        grouped[cName][tTitle].push(item);
    });

    let html = '';
    let groupIndex = 0;
    for (let cName in grouped) {
        const safeGroupName = `hist-group-${groupIndex++}`;
        // Сделали панель тонкой (py-2), скругленной со всех сторон (rounded-xl) и убрали эмодзи
        html += `<div class="font-black text-slate-700 dark:text-slate-300 text-[11px] mt-3 mb-2 uppercase tracking-tight px-3 border-l-4 border-indigo-500 cursor-pointer flex justify-between items-center bg-[var(--card-bg)] border border-[var(--card-border)] py-2 rounded-xl shadow-sm hover:border-indigo-300 transition-colors" onclick="document.getElementById('${safeGroupName}').classList.toggle('hidden')">
            <span class="truncate pr-2">${cName}</span>
            <span class="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 shrink-0">РАЗВЕРНУТЬ ▼</span>
        </div><div id="${safeGroupName}" class="hidden transition-all duration-300 origin-top">`;
        
        for (let tTitle in grouped[cName]) {
            html += `<div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 ml-2 mt-2">${tTitle} (${grouped[cName][tTitle].length} изд.)</div>`;
            const reversed = [...grouped[cName][tTitle]].sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // ПАГИНАЦИЯ: Показываем 15, остальные прячем
            const visibleItems = reversed.slice(0, 15);
            const hiddenItems = reversed.slice(15);
            
            const renderRow = (item) => {
                const photoIcon = (item.photos && Object.keys(item.photos).length > 0) ? `📸` : '';
                return `
                <div class="flex items-center gap-2 mb-2">
                    <input type="checkbox" class="hist-checkbox w-5 h-5 accent-indigo-600 rounded shrink-0" value="${item.id}">
                    <div class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors active:scale-[0.98]" onclick="showHistoryDetail(${item.id})">
                        <div class="flex justify-between items-start mb-1">
                            <div class="min-w-0 pr-2">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">${item.location} <span class="text-[10px] ml-1">${photoIcon}</span></div>
                                <div class="text-[9px] text-slate-400 mt-0.5 truncate">${new Date(item.date).toLocaleString('ru-RU')} | Инсп: ${item.inspectorName || 'Не указан'}</div>
                            </div>
                            <span class="status-tag ${item.metrics.statusCls} shrink-0">${item.metrics.final}%</span>
                        </div>
                    </div>
                </div>`;
            };

            html += visibleItems.map(renderRow).join('');
            
            if (hiddenItems.length > 0) {
                const hiddenGroupId = `${safeGroupName}-hidden-${tTitle.replace(/\W/g, '')}`;
                html += `<div id="${hiddenGroupId}" class="hidden">${hiddenItems.map(renderRow).join('')}</div>`;
                html += `<button onclick="document.getElementById('${hiddenGroupId}').classList.remove('hidden'); this.style.display='none'" class="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 py-2 mt-1 mb-3 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors border border-dashed border-slate-300 dark:border-slate-600">Показать еще (${hiddenItems.length})</button>`;
            }
        }
        html += `</div>`; 
    }
    listDiv.innerHTML = html;
}
// === ФОТО И КОММЕНТАРИИ (СОВМЕСТИМОСТЬ v15) ===
// === ФОТО И КОММЕНТАРИИ (С ПРИЧИНАМИ ДЕФЕКТОВ) ===
const DEFECT_CAUSES = [
    { code: 'C01', name: 'Нарушение технологии (ППР)', group: 'Технология' },
    { code: 'C02', name: 'Отклонение от проекта/РД', group: 'Проект' },
    { code: 'C03', name: 'Некачественный материал', group: 'Материалы' },
    { code: 'C04', name: 'Низкая квалификация рабочих', group: 'Персонал' },
    { code: 'C05', name: 'Отсутствие контроля (ИТР)', group: 'Организация' },
    { code: 'C06', name: 'Спешка / Нарушение сроков', group: 'Организация' },
    { code: 'C07', name: 'Погодные условия', group: 'Внешние факторы' },
    { code: 'C00', name: 'Иное (указать в комментарии)', group: 'Другое' }
];

let currentCommentId = null;

function toggleCommentField(id) {
    currentCommentId = id;
    const select = document.getElementById('modal-cause-select');
    const textarea = document.getElementById('modal-cause-comment');
    
    // Заполняем селектор причин один раз
    if(select.options.length === 0) {
        let html = '<option value="">Не выбрано (Без причины)</option>';
        DEFECT_CAUSES.forEach(c => html += `<option value="${c.code}">${c.name}</option>`);
        select.innerHTML = html;
    }
    
    const currentData = details[id] || {};
    select.value = currentData.causeCode || '';
    
    // Если комментарий содержит причину в скобках [Причина], вырезаем её для чистого отображения в textarea
    let pureComment = currentData.comment || '';
    if(pureComment.startsWith('[')) {
        pureComment = pureComment.replace(/^\[.*?\]\s*/, '');
    }
    textarea.value = pureComment;
    
    document.getElementById('comment-modal-overlay').style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeCommentModal() {
    document.getElementById('comment-modal-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    currentCommentId = null;
}

function saveCommentModal() {
    if(!currentCommentId) return;
    const code = document.getElementById('modal-cause-select').value;
    const text = document.getElementById('modal-cause-comment').value.trim();
    
    details[currentCommentId] = details[currentCommentId] || {};
    details[currentCommentId].causeCode = code;
    
    let causeName = code ? DEFECT_CAUSES.find(c => c.code === code)?.name : '';
    // Формируем красивый итоговый комментарий для карточки
    let finalComment = text;
    if(causeName) {
        finalComment = text ? `[${causeName}] ${text}` : `[${causeName}]`;
    }
    
    details[currentCommentId].comment = finalComment;
    
    updateCardDOM(currentCommentId);
    saveSessionData();
    
    // ---> НАЧАЛО ВСТАВКИ ДЛЯ ГЕЙМИФИКАЦИИ <---
    // Если длина комментария больше 15 символов, считаем его развернутым
    if (typeof gameLogAction === 'function' && text.length > 15) {
        gameLogAction('comment_written', currentCommentId);
    }
    // ---> КОНЕЦ ВСТАВКИ <---

    closeCommentModal();
}

function deleteComment(id, e) {
    if(e) e.stopPropagation();
    if(details[id]) {
        details[id].comment = "";
        details[id].causeCode = "";
    }
    updateCardDOM(id); saveSessionData();
}

function triggerPhotoInput(id) {
    currentPhotoId = id;
    // Вместо прямого клика, открываем наше новое окно выбора
    document.getElementById('photo-source-modal').style.display = 'flex';
}
function removePhoto(id, e) {
    if(e) e.stopPropagation();
    if(!confirm('Удалить фото?')) return;
    delete photos[id];
    updateCardDOM(id); saveSessionData();
}

// Обработка загрузки фото (Конвертация в сжатый формат для экономии IndexedDB)
// Обработка загрузки фото (Повышенное качество для презентаций)
// === ФОТОРЕДАКТОР (ЗАГРУЗКА И РИСОВАНИЕ) ===
let editorCanvas, editorCtx, isDrawing = false;
let editorImgElement = null; // Оригинальное изображение для сброса

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentPhotoId) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        editorImgElement = new Image();
        editorImgElement.onload = function() {
            // Открываем оверлей редактора
            document.getElementById('photo-editor-overlay').style.display = 'flex';
            document.body.classList.add('modal-open');
            
            initPhotoEditor();
        }
        editorImgElement.src = e.target.result;
    }
    reader.readAsDataURL(file);
    event.target.value = ''; // Сброс инпута
}

function initPhotoEditor() {
    editorCanvas = document.getElementById('drawing-canvas');
    editorCtx = editorCanvas.getContext('2d');
    
    // Оптимизируем размер (HD качество, но не гигантское)
    const MAX_WIDTH = 1280; const MAX_HEIGHT = 1280;
    let width = editorImgElement.width; 
    let height = editorImgElement.height;

    if (width > height) { 
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } 
    } else { 
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } 
    }

    editorCanvas.width = width; 
    editorCanvas.height = height;
    
    // Рисуем картинку на холсте
    clearPhotoEditor();

    // Настраиваем кисть
    editorCtx.strokeStyle = '#ef4444'; // Красный цвет
    editorCtx.lineWidth = Math.max(4, width / 150); // Толщина зависит от размера фото
    editorCtx.lineCap = 'round';
    editorCtx.lineJoin = 'round';

    // Привязываем события рисования
    editorCanvas.onmousedown = startDrawing;
    editorCanvas.onmousemove = draw;
    editorCanvas.onmouseup = stopDrawing;
    editorCanvas.onmouseout = stopDrawing;

    editorCanvas.ontouchstart = startDrawing;
    editorCanvas.ontouchmove = draw;
    editorCanvas.ontouchend = stopDrawing;
}

function clearPhotoEditor() {
    if (!editorCtx || !editorImgElement) return;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(editorImgElement, 0, 0, editorCanvas.width, editorCanvas.height);
}

function getCanvasCoordinates(e) {
    const rect = editorCanvas.getBoundingClientRect();
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getCanvasCoordinates(e);
    editorCtx.beginPath();
    editorCtx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasCoordinates(e);
    editorCtx.lineTo(pos.x, pos.y);
    editorCtx.stroke();
}

function stopDrawing(e) {
    if(e) e.preventDefault();
    isDrawing = false;
    editorCtx.closePath();
}

function cancelPhotoEditor() {
    document.getElementById('photo-editor-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    currentPhotoId = null;
    editorImgElement = null;
}

function saveEditedPhoto() {
    if (!currentPhotoId || !editorCanvas) return;
    
    // Добавляем штамп времени на финальное фото
    const now = new Date();
    const timestamp = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
    
    const w = editorCanvas.width;
    const h = editorCanvas.height;
    const fontSize = Math.max(16, Math.floor(w / 35)); // Адаптивный шрифт
    
    editorCtx.fillStyle = 'rgba(0,0,0,0.6)'; 
    editorCtx.fillRect(15, h - (fontSize + 20), fontSize * 10, fontSize + 15);
    editorCtx.font = `bold ${fontSize}px Arial`; 
    editorCtx.fillStyle = 'white'; 
    editorCtx.fillText(timestamp, 25, h - 20);

    // Сохраняем как сжатый JPEG (0.85 качество)
    photos[currentPhotoId] = editorCanvas.toDataURL('image/jpeg', 0.85);
    showToast("📸 Фото с пометками сохранено!");
    
    updateCardDOM(currentPhotoId); 
    scheduleSessionSave();
    cancelPhotoEditor();
}

function openPhotoViewer(src) {
    // Открытие модалки с фото (как в v15)
    // Разметка будет в HTML
    const viewer = document.getElementById('photo-viewer-overlay');
    const img = document.getElementById('photo-viewer-img');
    if(viewer && img) {
        img.src = src; viewer.style.display = 'flex';
    }
}
/* Файл: js/app.js (БЛОК 3: Демо-режим, Справки, Модалки расчетов) */

// === НАЧАЛО БЛОКА: ПРОДВИНУТЫЙ ДЕМО-РЕЖИМ === //
let realTwiCards = [];
let realGameLogs = []; 
let realWeeklyPlan = {};
let realAbsence = {};

function startDemoMode(silent = false) {
    realState = JSON.parse(JSON.stringify(state));
    realDetails = JSON.parse(JSON.stringify(details));
    realPhotos = JSON.parse(JSON.stringify(photos));
    realContractorArray = JSON.parse(JSON.stringify(contractorArray));
    realTwiCards = JSON.parse(JSON.stringify(customTwiCards));
    realTemplateKey = currentTemplateKey;

    isDemoMode = true;
    document.body.classList.add('demo-mode');
    
    const fabExit = document.getElementById('fab-exit-demo');
    if(fabExit && !silent) { fabExit.classList.remove('hidden'); fabExit.style.display = 'flex'; }
    
    contractorArray = generateDemoHistory();

    const demoPhotoGood = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='%23f0fdf4'/><path d='M250 300 L350 400 L550 200' stroke='%2322c55e' stroke-width='40' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='400' y='520' font-family='Arial' font-size='36' font-weight='bold' fill='%23166534' text-anchor='middle'>ЭТАЛОН (ВЕРНО)</text></svg>";
    const demoPhotoBad = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='%23fef2f2'/><path d='M250 200 L550 400 M250 400 L550 200' stroke='%23ef4444' stroke-width='40' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='400' y='520' font-family='Arial' font-size='36' font-weight='bold' fill='%23991b1b' text-anchor='middle'>БРАК (НАРУШЕНИЕ)</text></svg>";

    customTwiCards = [
        {
            id: "demo_twi_1", title: "Контроль установки кронштейнов", checklistKey: "sys_nvf_facade", checklistName: "Вент. фасад", type: "INSPECTOR", itemId: "109", 
            whyImportant: "Превышение допуска приводит к перекосу подсистемы и невозможности ровно смонтировать облицовку.",
            howToCheck: "Замерять рулеткой отклонение от оси. Допуск ±10 мм.", photoGood: demoPhotoGood, photoBad: demoPhotoBad
        }
    ];

    document.getElementById('inp-project').value = 'ЖК "Демонстрационный"';
    document.getElementById('inp-inspector').value = 'Иванов И.И. (Демо)';
    document.getElementById('inp-contractor').value = 'ООО "Фасад-Мастер"';
    document.getElementById('inp-location').value = 'Секция 2, Ось А-В';

    currentTemplateKey = 'sys_nvf_facade'; // Выбрали Вент.Фасад
    if(document.getElementById('checklist-selector')) document.getElementById('checklist-selector').value = currentTemplateKey;
    currentChecklist = SYSTEM_TEMPLATES['nvf_facade'].groups;
    
    state = {}; details = {}; photos = {};
    
    // Пункт 108 (Краевая зона) - OK и фото эталона
    state['108'] = 'ok'; photos['108'] = demoPhotoGood; 
    
    // Пункт 109 (Отклонение кронштейнов, B2) - Брак, есть 1.5х, есть фото
    state['109'] = 'fail'; details['109'] = { causeCode: 'C01', comment: '[Технология] Отклонение кронштейна на 18мм' }; photos['109'] = demoPhotoBad; 
    
    // Пункт 110 - Оставляем пустым для демонстрации свайпа
    state['110'] = null; 
    
    if (typeof gameActionLogs !== 'undefined') {
        gameActionLogs = [
            { id: 'l1', date: new Date().toISOString(), inspector: 'Иванов И.И. (Демо)', action: 'create_twi' },
            { id: 'l2', date: new Date().toISOString(), inspector: 'Иванов И.И. (Демо)', action: 'ai_generate' },
            { id: 'l3', date: new Date().toISOString(), inspector: 'Иванов И.И. (Демо)', action: 'comment_written' },
            { id: 'l4', date: new Date().toISOString(), inspector: 'Иванов И.И. (Демо)', action: 'comment_written' }
        ];
    }

    updateDataSummary();
    document.getElementById('empty-checklist-state').style.display = 'none';
    document.getElementById('audit-items').style.display = 'block';
    document.getElementById('audit-actions').style.display = 'grid';
    
    // Обновляем фильтры, чтобы они увидели демо-объекты
    updateDatalists(); 
    updateAllDynamicFilters();
    
    render(); updateUI(); renderHistoryTab(); renderCurrentAnalyticsTab(); renderTwiList();
    
    if(!silent) {
        showToast('🎮 Демо-режим активирован!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function exitDemoMode() {
    state = {}; details = {}; photos = {};
    
    state = JSON.parse(JSON.stringify(realState));
    details = JSON.parse(JSON.stringify(realDetails));
    photos = JSON.parse(JSON.stringify(realPhotos));
    contractorArray = JSON.parse(JSON.stringify(realContractorArray));
    customTwiCards = JSON.parse(JSON.stringify(realTwiCards));
    if (typeof gameActionLogs !== 'undefined') gameActionLogs = [];
    
    isDemoMode = false;
    document.body.classList.remove('demo-mode');
    
    const fabExit = document.getElementById('fab-exit-demo');
    if(fabExit) { fabExit.classList.add('hidden'); fabExit.style.display = 'none'; }
    
    document.getElementById('inp-project').value = '';
    document.getElementById('inp-inspector').value = '';
    document.getElementById('inp-contractor').value = '';
    document.getElementById('inp-location').value = '';
    
    if (realTemplateKey) changeTemplate(realTemplateKey);
    else changeTemplate('HOME');

    switchTab('tab-audit');
    updateDataSummary();
    renderHistoryTab(); 
    renderTwiList();
    showToast('Возврат к реальным данным');
}

function generateDemoHistory() {
    let mockArray = [];
    const now = new Date();
    
    const demoPhotoGood = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='%23f0fdf4'/><path d='M250 300 L350 400 L550 200' stroke='%2322c55e' stroke-width='40' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='400' y='520' font-family='Arial' font-size='36' font-weight='bold' fill='%23166534' text-anchor='middle'>ЭТАЛОН (ВЕРНО)</text></svg>";
    const demoPhotoBad = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='%23fef2f2'/><path d='M250 200 L550 400 M250 400 L550 200' stroke='%23ef4444' stroke-width='40' stroke-linecap='round' stroke-linejoin='round' fill='none'/><text x='400' y='520' font-family='Arial' font-size='36' font-weight='bold' fill='%23991b1b' text-anchor='middle'>БРАК (НАРУШЕНИЕ)</text></svg>";

    const randomDay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const createRecord = (id, daysAgo, proj, insp, contr, tmplKey, tmplTitle, loc, stageId, stageName, states, detailsData, photoData, m) => {
        let d = new Date(now); d.setDate(now.getDate() - daysAgo);
        return {
            id: id + Math.floor(Math.random() * 1000), date: d.toISOString(), projectName: proj, inspectorName: insp,
            contractorName: contr, templateKey: tmplKey, templateTitle: tmplTitle, location: loc,
            stageId, stageName, isCompleted: true, state: states, details: detailsData, photos: photoData, metrics: m
        };
    };

    const metric = (f, b1, b2, b3) => ({
        final: f, baseUrkPerc: f, checkedCount: 6, totalCount: 6, n_B1_fail: b1, n_B2_fail: b2, n_B3_fail: b3, b3_found: b3>0, kc: b2>2?0.85:1.0, kcrit: b3>0?0.5:1.0, isDanger: b3>0
    });

    // --- ОБЪЕКТ 1: ЖК "Демонстрационный" ---
    
    // Подрядчик 1: Отличник (ООО "Фасад-Мастер") - Стабильно зеленый, много проверок
    for(let i=0; i<35; i++) {
        let day = randomDay(2, 110);
        let hasDefect = (i % 7 === 0); // Редкий брак
        mockArray.push(createRecord(100+i, day, 'ЖК "Демонстрационный"', 'Иванов И.И. (Демо)', 'ООО "Фасад-Мастер"', 'sys_nvf_facade', 'Вент. фасад', `Секция 1, Ось ${i+1}`, 
            2, "3. Монтаж кронштейнов", {'108':'ok', '109':hasDefect?'fail':'ok', '110':'ok', '111':'ok', '112':'ok'}, 
            hasDefect ? {'109': {causeCode: 'C06', comment: '[Спешка] Смещение'}} : {}, 
            hasDefect ? {'109': demoPhotoBad} : {'108': demoPhotoGood}, // Магия TWI
            metric(hasDefect?80:100, 0, hasDefect?1:0, 0)));
    }

    // Подрядчик 2: Середнячок, скатывающийся в желтую зону (ООО "Окна-Про")
    for(let i=0; i<28; i++) {
        let day = randomDay(2, 100);
        let hasDefect = day < 40; // Последний месяц начал косячить
        mockArray.push(createRecord(200+i, day, 'ЖК "Демонстрационный"', 'Смирнов А.А. (Демо)', 'ООО "Окна-Про"', 'sys_okna_pvh', 'Окна ПВХ', `Секция 2, Кв. ${i+1}`, 
            1, "2. Монтаж окон", {'1610':hasDefect?'fail':'ok', '1615':'ok', '1617':'ok'}, 
            hasDefect ? {'1610': {causeCode: 'C04', comment: '[Персонал] Отклонение рамы'}} : {}, 
            hasDefect ? {'1610': demoPhotoBad} : {}, 
            metric(hasDefect?75:100, 0, hasDefect?1:0, 0)));
    }

    // Подрядчик 3: Двоечник с критическими ошибками (ИП Петров)
    for(let i=0; i<18; i++) {
        let day = randomDay(5, 90);
        let hasB3 = (day < 60 && i % 2 === 0); // Постоянные B3 дефекты
        mockArray.push(createRecord(300+i, day, 'ЖК "Демонстрационный"', 'Иванов И.И. (Демо)', 'ИП Петров (Бетон)', 'sys_monolit', 'Монолитные работы', `Пилон П-${i+1}`, 
            2, "2. Стены", {'1011':'fail', '1014':hasB3?'fail_escalated':'ok'}, 
            hasB3 ? {'1014': {causeCode: 'C01', comment: '[Технология] Обнажение арматуры'}} : {'1011': {causeCode: 'C01', comment: 'Смещение'}}, 
            hasB3 ? {'1014': demoPhotoBad} : {'1011': demoPhotoBad}, 
            metric(hasB3?45:80, 0, 1, hasB3?1:0)));
    }

    // --- ОБЪЕКТ 2: БЦ "Восточный" ---

    // Подрядчик 4: Прорыв недели (ООО "Кровля-Инвест") - был двоечником, стал отличником
    for(let i=0; i<20; i++) {
        let day = randomDay(1, 100);
        let hasDefect = day > 30; // Раньше косячил, последний месяц идеален
        mockArray.push(createRecord(400+i, day, 'БЦ "Восточный"', 'Смирнов А.А. (Демо)', 'ООО "Кровля-Инвест"', 'sys_krovlya', 'Устройство кровли', `Участок К-${i+1}`, 
            2, "3. Пароизоляция", {'909':hasDefect?'fail':'ok', '910':'ok'}, 
            hasDefect ? {'909': {causeCode: 'C01', comment: 'Нет нахлеста'}} : {}, 
            hasDefect ? {'909': demoPhotoBad} : {'909': demoPhotoGood}, // Магия TWI
            metric(hasDefect?70:100, 0, hasDefect?2:0, 0)));
    }

    // Подрядчик 5: Стабильный хорошист (СМУ-15)
    for(let i=0; i<40; i++) {
        let day = randomDay(1, 120);
        let hasDefect = (i % 5 === 0);
        mockArray.push(createRecord(500+i, day, 'БЦ "Восточный"', 'Петров В.В. (Демо)', 'СМУ-15', 'sys_armature', 'Арматура', `Перекрытие ${i+1}`, 
            1, "2. Монтаж", {'204':hasDefect?'fail':'ok', '206':'ok', '210':'ok'}, 
            hasDefect ? {'204': {causeCode: 'C04', comment: 'Шаг нарушен'}} : {}, 
            hasDefect ? {'204': demoPhotoBad} : {}, 
            metric(hasDefect?84:100, 0, hasDefect?1:0, 0)));
    }

    return mockArray.sort((a, b) => new Date(b.date) - new Date(a.date));
}
// === КОНЕЦ БЛОКА === //
// === КОНЕЦ ЗАМЕНЫ 4 === //

// === ПОДСКАЗКИ СПРАВКИ (v15) ===
function showHelp(type) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    document.getElementById('modal-icon').innerHTML = ``;

    if (type === 'contractor') {
        title.innerText = "Краткая инфо-справка об УрК";
        body.innerHTML = `
        <div class="space-y-3 text-sm leading-6">
            <div class="rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-sky-500"></div><p class="font-semibold text-sky-900 dark:text-sky-300">Что считает система</p></div>
                <div class="space-y-2 text-sky-900 dark:text-sky-400">
                    <p><b>УрК изделия</b> — качество конкретного узла или участка работ.</p>
                    <p><b>УрК подрядчика</b> — качество подрядчика по массиву однотипных проверок.</p>
                    <p class="text-sky-800 dark:text-sky-200"><b>Чем выше процент, тем выше качество.</b></p>
                </div>
            </div>
            <div class="rounded-2xl border border-violet-200 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-violet-500"></div><p class="font-semibold text-violet-900 dark:text-violet-300">Категории дефектов</p></div>
                <div class="grid grid-cols-1 gap-2 text-violet-900 dark:text-violet-400">
                    <div class="rounded-xl border border-violet-100 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3"><b>B1</b> — незначительный дефект</div>
                    <div class="rounded-xl border border-violet-100 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3"><b>B2</b> — значительный дефект</div>
                    <div class="rounded-xl border border-violet-100 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3"><b>B3</b> — критический дефект</div>
                </div>
                <div class="mt-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-slate-800 p-3 text-violet-800 dark:text-violet-300">
                    <p class="font-medium mb-1">Правило 1.5</p><p>Если дефект относится к <b>B2</b>, но отклонение превышает допустимое более чем в <b>1.5 раза</b>, он переводится в <b>B3</b>.</p>
                </div>
            </div>
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-emerald-500"></div><p class="font-semibold text-emerald-900 dark:text-emerald-300">УрК изделия</p></div>
                <div class="space-y-3 text-emerald-900 dark:text-emerald-400">
                    <p>Считается базовый процент качества, затем применяются штрафы за концентрацию дефектов и за критичность.</p>
                    <code class="inline-block rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 px-2 py-1 text-xs">УрК = Базовый УрК × Kc × Kcrit</code>
                </div>
            </div>
            <div class="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
                <div class="flex items-center gap-2 mb-2"><div class="h-2.5 w-2.5 rounded-full bg-amber-500"></div><p class="font-semibold text-amber-900 dark:text-amber-300">Ключевые правила</p></div>
                <div class="space-y-2">
                    <div class="rounded-xl border border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-slate-800 p-3 text-amber-900 dark:text-amber-400">Если есть <b>B2</b> или штрафы, итог <b>не выше 84%</b>.</div>
                    <div class="rounded-xl border border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-slate-800 p-3 text-amber-900 dark:text-amber-400">Если есть <b>B3</b>, изделие считается <b>непринятым</b>.</div>
                </div>
            </div>
        </div>`;
    } else if (type === 'analytics' || type === 'rating') {
        title.innerText = "Справка по Аналитике";
        body.innerHTML = `<div class="space-y-3 text-sm leading-relaxed">
            <p>В этом разделе отображается статистика на основе сохраненных проверок.</p>
            <ul class="list-disc pl-4 space-y-2 text-xs">
                <li><b>Рейтинг</b> строится только если подрядчик имеет <b>минимум 7 проверок</b> по одному виду работ.</li>
                <li>Учитывается не только балл, но и стабильность качества (волатильность).</li>
                <li>Вы можете выгрузить графики и отчеты в PDF для отправки руководству.</li>
            </ul>
        </div>`;
    }

    document.body.classList.add('modal-open'); 
    modal.style.display = 'flex';
}

// === МОДАЛКИ РАСЧЕТОВ (По клику на мини-дашборд) ===
// Назначаем клики на мини-дашборд
document.addEventListener("DOMContentLoaded", () => {
    const pCard = document.getElementById('mini-p-bar')?.parentElement;
    const cCard = document.getElementById('mini-c-urk')?.parentElement;
    
    if(pCard) pCard.addEventListener('click', showProductMath);
    if(cCard) cCard.addEventListener('click', showContractorDetails);
});

// === МОДАЛКИ РАСЧЕТОВ ===
function showProductMath() {
    if(!currentTemplateKey) return;
    const p = getProductMetrics(state, currentChecklist);
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[14px] flex items-center justify-center border border-indigo-100 dark:border-indigo-800 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="8" y="8" width="8" height="2"></rect><line x1="8" y1="14" x2="8.01" y2="14"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="16" y1="14" x2="16.01" y2="14"></line></svg></div>`;
    document.getElementById('modal-title').innerText = "Расчет УрК Осмотра";

    if (!p) {
        body.innerHTML = "<p>Проверьте хотя бы один пункт для отображения оценки.</p>";
    } else {
        body.innerHTML = `
        <div class="bg-[var(--hover-bg)] p-4 rounded-xl border border-[var(--card-border)] mb-4">
            <div class="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-2">Формула (Текущий осмотр)</div>
            <div class="text-sm font-black font-mono bg-[var(--card-bg)] p-2 rounded border border-[var(--card-border)] text-center">УрК = База × Kc × Kcrit</div>
            <div class="text-center mt-2 text-2xl font-black ${p.final < 70 ? 'text-red-600' : (p.final < 85 ? 'text-orange-500' : 'text-green-600')}">${p.final}%</div>
        </div>
        <ul class="text-sm space-y-3 mb-4">
            <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                <span><b>Базовый балл</b><br><span class="text-[10px] text-[var(--text-muted)]">Доля пройденных пунктов (по весам)</span></span>
                <span class="font-black text-lg">${p.baseUrkPerc}%</span>
            </li>
            <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                <span><b>Концентрация (Kc)</b><br><span class="text-[10px] text-[var(--text-muted)]">Штраф за долю брака B2</span></span>
                <span class="font-black text-lg ${p.kc < 1 ? 'text-red-500' : 'text-green-600'}">${p.kc.toFixed(2)}</span>
            </li>
            <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                <span><b>Критичность (Kcrit)</b><br><span class="text-[10px] text-[var(--text-muted)]">Штраф за наличие B3</span></span>
                <span class="font-black text-lg ${p.kcrit < 1 ? 'text-red-500' : 'text-green-600'}">${p.kcrit.toFixed(2)}</span>
            </li>
        </ul>
        <div class="text-[11px] font-bold ${p.final > 84 && (p.kc < 1 || p.kcrit < 1 || p.n_B2_fail > 0) ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'} p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm leading-relaxed">
            <b>Правило потолка (Cap84):</b> Если допущен B2 или применены штрафы, итоговый балл не может превышать 84%.
        </div>`;
    }
    document.body.classList.add('modal-open'); modal.style.display = 'flex';
}

function showContractorDetails() {
    if(!currentTemplateKey) return;
    const currentContr = document.getElementById('inp-contractor').value.trim();
    const filteredArr = currentContr ? contractorArray.filter(i => i.contractorName === currentContr && i.templateKey === currentTemplateKey) : [];
    
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl">M</div>`;
    document.getElementById('modal-title').innerText = currentContr ? `Аналитика: ${currentContr}` : "Аналитика подрядчика";
    const body = document.getElementById('modal-body');

    if (filteredArr.length < 7) {
        body.innerHTML = `<p class="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold leading-snug text-center">Сбор данных: <b class="text-lg text-indigo-600">${filteredArr.length} / 7</b><br><br>Для расчета интегрального рейтинга подрядчика и штрафных коэффициентов требуется минимум <b>7</b> независимых проверок.</p>`;
    } else {
        const c = getContractorMetrics(filteredArr, userTemplates);
        let warningHtml = ''; // Убрали предупреждение, так как до 7 проверок модалка теперь блокируется

        body.innerHTML = `
            ${warningHtml}
            <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 mb-5 shadow-sm relative overflow-hidden">
                <div class="text-[10px] uppercase font-bold text-indigo-500 mb-2 flex justify-between items-center">
                    <span>УрК Подрядчика</span>
                    <span class="text-[9px] font-bold ${c.confCls} px-2 py-0.5 rounded border uppercase">${c.confStatus}</span>
                </div>
                <div class="flex items-center justify-between mt-1">
                    <div class="text-5xl font-black text-indigo-700 dark:text-indigo-400">${c.finalC}%</div>
                    <div class="text-right">
                        <span class="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded uppercase block w-fit ml-auto border border-indigo-200">${c.statusTxt}</span>
                        <div class="text-[9px] text-indigo-500 mt-1 font-bold">Выборка: ${c.count} пров.</div>
                    </div>
                </div>
            </div>
            
            <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Штрафные коэффициенты</div>
            <ul class="text-[13px] space-y-3 mb-5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm">
                <li class="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                    <span class="leading-snug"><b>Системный брак (Ks)</b><br><span class="text-[10px] text-[var(--text-muted)] mt-0.5">Повтор дефекта в ${c.maxFailRate.toFixed(1)}% проверок</span></span>
                    <span class="font-black text-lg ${c.ks < 1 ? 'text-red-500' : 'text-green-600'}">${c.ks.toFixed(2)}</span>
                </li>
                <li class="flex justify-between items-center pb-1">
                    <span class="leading-snug"><b>Критичность (KB3)</b><br><span class="text-[10px] text-[var(--text-muted)] mt-0.5">Доля проверок с B3: ${c.rateB3.toFixed(1)}%</span></span>
                    <span class="font-black text-lg ${c.kcritC < 1 ? 'text-red-500' : 'text-green-600'}">${c.kcritC.toFixed(2)}</span>
                </li>
            </ul>

            <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Достоверность и Стабильность</div>
            <div class="grid grid-cols-2 gap-2 mb-5">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center">
                    <div class="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1" title="Доверительный интервал 95%">Погрешность (±E)</div>
                    <div class="text-xl font-black text-slate-700 dark:text-slate-300">± ${c.ci95_margin.toFixed(1)}%</div>
                </div>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center cursor-help" title="${c.stabDesc}">
                    <div class="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 border-b border-dashed border-slate-300 pb-1 inline-block">Индекс стаб.</div>
                    <div class="text-xl font-black ${c.stabColor} leading-none">${c.stabilityIndex}</div>
                    <div class="text-[8px] font-bold uppercase mt-1 ${c.stabColor}">${c.stabText}</div>
                </div>
            </div>

            <div class="text-[11px] font-bold ${c.finalC < 70 ? 'text-red-700 bg-red-50 border-red-200' : (c.finalC < 85 ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-green-700 bg-green-50 border-green-200')} mt-2 p-3 rounded-xl border shadow-sm leading-snug">
                <span class="uppercase text-[9px] block mb-1 opacity-70">Основание / Вывод</span>${c.reason}
            </div>`;
    }
    document.body.classList.add('modal-open'); modal.style.display = 'flex';
}

// === ПЕРЕКЛЮЧАТЕЛЬ ПОДВКЛАДОК СПРАВОЧНИКА ===
function switchReferenceSubTab(tabId, btnElement) {
    // Скрываем все подвкладки справочника
    document.querySelectorAll('.ref-sub-section').forEach(el => el.classList.add('hidden'));
    
    // Сбрасываем стили всех кнопок
    const btnContainer = document.getElementById('reference-subtabs-block');
    if (btnContainer) {
        btnContainer.querySelectorAll('.sub-tab-btn').forEach(el => {
            el.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400', 'active');
            el.classList.add('text-[var(--text-muted)]');
        });
    }
    
    // Показываем нужную вкладку
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');
    
    // Подкрашиваем активную кнопку
    if (btnElement) {
        btnElement.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400', 'active');
        btnElement.classList.remove('text-[var(--text-muted)]');
    }
}
// === АНАЛИТИКА И ОТЧЕТЫ (ПРО 4.0) ===

function closeFabExportMenu() {
    document.getElementById('fab-export-menu-overlay').classList.add('opacity-0');
    document.getElementById('fab-export-menu-content').classList.add('translate-y-full');
    setTimeout(() => {
        document.getElementById('fab-export-menu-overlay').style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

// --- ЯДРО ГРАФИКОВ ТРЕНДОВ И ФИЛЬТРОВ ---

// --- ЯДРО ГРАФИКОВ ТРЕНДОВ И ФИЛЬТРОВ ---

let trendGroupings = { contrs: 'MONTH', works: 'MONTH', global: 'MONTH', onepager: 'MONTH' }; 
let selectedChartFilters = { contrs: [], works: [], onepager: [] }; // Пустой массив = Авто

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
}

// === УМНЫЙ ГЕНЕРАТОР ДАННЫХ ДЛЯ ТРЕНДОВ ===
function buildTrendChartData(data, fieldName, allowedCats = [], period = 'MONTH') {
    const timeMap = {}; const categoriesTotal = {}; 
    const sortedData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date));

    sortedData.forEach(item => {
        if (!item.metrics) return;
        const d = new Date(item.date);
        let tLabel = '';

        if (period === 'YEAR') tLabel = d.getFullYear().toString();
        else if (period === 'QUARTER') tLabel = `Q${Math.floor(d.getMonth() / 3) + 1} '${d.getFullYear().toString().slice(-2)}`;
        else if (period === 'WEEK') tLabel = `Нед.${getWeekNumber(d)} '${d.getFullYear().toString().slice(-2)}`;
        else tLabel = d.toLocaleString('ru-RU', { month: 'short', year: '2-digit' });

        // УМНОЕ ИМЯ: Подрядчик + Объект
        let cat = fieldName === 'TOTAL' ? 'Общий УрК' : (item[fieldName] || 'Неизвестно');
        if (fieldName === 'contractorName') {
            cat = (item.contractorName || 'Неизвестно') + ' [' + (item.projectName || 'Без объекта') + ']';
        }
        categoriesTotal[cat] = (categoriesTotal[cat] || 0) + 1;

        if (!timeMap[tLabel]) timeMap[tLabel] = {};
        if (!timeMap[tLabel][cat]) timeMap[tLabel][cat] = { sum: 0, cnt: 0 };
        timeMap[tLabel][cat].sum += item.metrics.final;
        timeMap[tLabel][cat].cnt++;
    });

    let targetCats = [];
    if (fieldName === 'TOTAL') targetCats = ['Общий УрК'];
    else if (allowedCats && allowedCats.length > 0) targetCats = allowedCats.filter(c => categoriesTotal[c]); 
    else targetCats = Object.keys(categoriesTotal).sort((a,b) => categoriesTotal[b] - categoriesTotal[a]).slice(0, 5);

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

// === ФУНКЦИИ РЕДАКТИРОВАНИЯ ЗАКЛЮЧЕНИЯ ИИ ===
let currentEditingExpertKey = null;
let currentEditingTextAreaId = null;

// === УМНЫЕ ПРИЛИПАЮЩИЕ ПАНЕЛИ ПОИСКА (История / Справочник) ===
// Работают как мини-дашборд: сворачиваются при скролле вниз, разворачиваются вверх

function initCollapsibleSearchPanel(panelId, bodyId, headerId) {
    let lastScrollY = 0;
    let isCollapsed = false;

    const panel = document.getElementById(panelId);
    const body  = document.getElementById(bodyId);
    if (!panel || !body) return;

    // Клик по заголовку — принудительный тоггл
    const header = document.getElementById(headerId);
    if (header) {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            applyPanelState(body, isCollapsed);
        });
    }

    // Скролл — авто-сворачивание
    window.addEventListener('scroll', () => {
        const currentY = window.scrollY; // ИСПРАВЛЕНО: убрана опечатка currentYF
        if (currentY > lastScrollY + 10 && currentY > 60 && !isCollapsed) {
            isCollapsed = true;
            applyPanelState(body, true);
        } else if (currentY < lastScrollY - 10 && isCollapsed) {
            isCollapsed = false;
            applyPanelState(body, false);
        }
        lastScrollY = currentY;
    }, { passive: true });
}

function applyPanelState(bodyEl, collapsed) {
    // Находим иконку-стрелку (ищем в ближайшем родителе)
    const panel = bodyEl.closest('[id$="-sticky-panel"]') || bodyEl.parentElement;
    const icon = panel?.querySelector('[id$="-panel-toggle-icon"]');

    if (collapsed) {
        bodyEl.style.maxHeight  = '0px';
        bodyEl.style.opacity    = '0';
        bodyEl.style.overflow   = 'hidden';
        bodyEl.style.marginBottom = '0';
        if (icon) icon.style.transform = 'rotate(-90deg)';
    } else {
        bodyEl.style.maxHeight  = '400px';
        bodyEl.style.opacity    = '1';
        bodyEl.style.overflow   = '';
        bodyEl.style.marginBottom = '';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

// ============================================================================
// === НОВАЯ ВКЛАДКА: ПОДРЯДЧИКИ И ДЕТАЛИЗАЦИЯ (v16.5) ===
// ============================================================================

let currentContractorsFilter = 'ALL'; // Состояние чипсов (Все, Критичные и т.д.)
let currentDetailedContractor = null; // Какой подрядчик сейчас открыт

// === ОКНО "О ПРИЛОЖЕНИИ" ===
function showAboutApp() {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[14px] flex items-center justify-center border border-slate-200 dark:border-slate-700 mx-auto"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>`;
    document.getElementById('modal-title').innerText = "RBI Quality v.16.0";
    
    document.getElementById('modal-body').innerHTML = `
        <div class="space-y-4 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
            
            <div class="text-center font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                Система управления качеством на основе данных <br> (Data-Driven Quality)
            </div>

            <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-xl shadow-sm">
                <h4 class="font-black text-indigo-800 dark:text-indigo-300 mb-2 uppercase tracking-wider flex items-center gap-1.5"><span class="text-lg"></span> Архитектура и Безопасность</h4>
                <p class="mb-2">Приложение построено по технологии <b>PWA (Progressive Web App)</b> и работает полностью автономно.</p>
                <ul class="list-disc pl-4 space-y-1.5 text-[11px] text-indigo-900 dark:text-indigo-200 mb-3">
                    <li><b>Offline-First:</b> Приложение является "клиентским контейнером". Все проверки, фотографии, PDF-файлы и созданные справочники сохраняются <b>исключительно в изолированной базе данных (IndexedDB) вашего устройства</b>.</li>
                    <li><b>Локальные вычисления:</b> Вся сложная математика, генерация аналитики и сборка PDF-отчетов происходит за счет процессора вашего телефона/ПК. Данные не передаются на сторонние серверы для обработки.</li>
                </ul>
                <div class="bg-white/60 dark:bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-700/50 text-[10px] font-bold leading-snug text-indigo-800 dark:text-indigo-300">
                    🔒 <b>О размещении на GitHub:</b> Так как это моя личная разработка, приложение базируется на публичном бесплатном сервисе GitHub Pages и не планируется к переносу на иные коммерческие серверы. Это абсолютно безопасно для корпоративного использования, так как сервер отдает только программный "каркас" (HTML/CSS/JS). Демо-данные и встроенные чек-листы скомпилированы из открытых источников (ГОСТ, СП). Реальные коммерческие данные со строек <b>никогда не покидают ваше устройство</b>.
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                <h4 class="font-black text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-1.5"><span class="text-lg">📊</span> Функциональные модули</h4>
                
                <div class="space-y-3 text-[11px]">
                    <div>
                        <b class="text-slate-900 dark:text-white text-[12px]">1. Модуль Осмотра:</b><br>
                        Алгоритмизированный процесс фиксации дефектов (B1/B2/B3). Внедрено жесткое правило <b>Эскалации >1.5х</b> (перевод значимого брака в критический при грубом превышении допуска).
                    </div>
                    <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
                        <b class="text-slate-900 dark:text-white text-[12px]">2. Математика УрК (Уровень Качества):</b><br>
                        Многофакторная оценка качества. Применяются штрафы за концентрацию (Kc) и критичность (Kcrit). Для оценки подрядчиков рассчитываются Индекс стабильности и Волатильность (скачки качества).
                    </div>
                    <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
                        <b class="text-slate-900 dark:text-white text-[12px]">3. BI Аналитика и Отчеты:</b><br>
                        Динамические графики Трендов, диаграммы Парето для поиска корневых причин брака. Автоматическая генерация управленческого решения (PDCA) и выгрузка готового презентационного отчета (One-Pager) в формат PDF (А3).
                    </div>
                    <div class="border-t border-slate-100 dark:border-slate-700 pt-2">
                        <b class="text-slate-900 dark:text-white text-[12px]">4. Интегрированная База Знаний:</b><br>
                        Модуль визуальных стандартов TWI (Training Within Industry) и библиотека Технических узлов. Справочники намертво привязаны к чек-листам для обучения прямо на стройплощадке.
                    </div>
                </div>
            </div>

            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-xl shadow-sm">
                <h4 class="font-black text-amber-800 dark:text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-1.5"><span class="text-lg">🚀</span> Ближайшее развитие (Roadmap)</h4>
                <ul class="list-disc pl-4 text-[11px] text-amber-900 dark:text-amber-200 space-y-1.5">
                    <li><b>Завершение Beta-тестирования:</b> Обкатка приложения на реальных строительных объектах, выявление и исправление "плавающих" багов.</li>
                    <li><b>Глубокая оптимизация:</b> Ускорение рендеринга интерфейса при огромных массивах данных, улучшение алгоритмов сжатия загружаемых фотографий.</li>
                    <li><b>Наполнение Базы Знаний:</b> Масштабная оцифровка нормативной документации (СП, ГОСТ), создание системных чек-листов, библиотеки узлов и эталонных TWI-карт для всех основных видов СМР.</li>
                </ul>
            </div>
            
            <div class="text-center text-[9px] text-slate-400 uppercase tracking-widest font-black mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                Спроектировано и разработано для профессионального управления качеством<br>
            </div>
        </div>
    `;
    document.body.classList.add('modal-open'); 
    modal.style.display = 'flex';
}

// === СВОРАЧИВАЕМЫЕ ПАНЕЛИ (УМНАЯ ЛОГИКА БЕЗ ПРЫЖКОВ) ===
function initCollapsiblePanel(panelId, bodyId, headerId, iconId) {
    const panel  = document.getElementById(panelId);
    const body   = document.getElementById(bodyId);
    const header = document.getElementById(headerId);
    const icon   = document.getElementById(iconId);
    if (!panel || !body) return;
    if (panel.dataset.inited) return;
    panel.dataset.inited = '1';

    let collapsed = false;
    let isAnimating = false; // Блокировка от дребезга

    function setCollapsed(val) {
        if (collapsed === val || isAnimating) return;
        collapsed = val;
        isAnimating = true;
        
        body.style.maxHeight  = collapsed ? '0px'   : '400px';
        body.style.opacity    = collapsed ? '0'     : '1';
        body.style.overflow   = collapsed ? 'hidden': 'visible';
        body.style.marginTop  = collapsed ? '0px'   : '8px';
        if (icon) icon.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        
        setTimeout(() => { isAnimating = false; }, 400); // Ждем конца CSS анимации
    }

    if (header) {
        header.addEventListener('click', () => setCollapsed(!collapsed));
    }

    window.addEventListener('scroll', () => {
        // Если панель не на активной вкладке - игнорируем
        if (!panel.closest('.view-section.active') && !panel.closest('.active')) return;
        
        // ЗАЩИТА ОТ ПРЫЖКОВ: Если страница короткая, не сворачиваем вообще!
        if (document.body.scrollHeight <= window.innerHeight + 250) {
            setCollapsed(false);
            return;
        }

        const y = window.scrollY;
        // Используем абсолютные пороги с "мертвой зоной", чтобы исключить цикличность
        if (y > 100 && !collapsed) setCollapsed(true);
        else if (y < 40 && collapsed) setCollapsed(false);
    }, { passive: true });
}
// === НОВЫЙ ПОЛНОЦЕННЫЙ ТУТОРИАЛ ===
let currentTutStep = 0;
let tutOverlay, tutHighlightBox, tutTooltip, tutText, tutStepNum, tutNextBtn;

const tutorialSteps = [
    {
        text: "Добро пожаловать в <b>RBI Quality 16.5!</b> 👋<br><br>Я загрузил мощную базу <b>Демо-данных</b> на 130 проверок, чтобы показать весь масштаб аналитики.<br><br>Первый шаг инженера на стройке — выбрать <b>вид работ</b>. Это делается здесь.",
        targetSelector: ".header-top-row .relative.flex", 
        action: () => { switchTab('tab-audit'); window.scrollTo({top: 0, behavior: 'smooth'}); }
    },
    {
        text: "Заполняем шапку: <b>Объект, Подрядчик и Локация</b>.<br><i>Система сама запоминает последние вводы, чтобы вы не печатали одно и то же.</i>",
        targetId: "header-data-block",
        action: () => { }
    },
    {
        text: "Это <b>Умный Дашборд</b>. Он в реальном времени считает <b>УрК (Уровень Качества)</b> осмотра и выводит Надежность Подрядчика. Кликните по нему, чтобы увидеть формулы штрафов.",
        targetId: "header-dashboard",
        action: () => { document.getElementById('dash-expand-icon').click(); }
    },
    {
        text: "Смотрите, вот карточка контроля.<br>Свайп вправо или зеленая кнопка ставит <b>OK</b>. Карточка моментально сжимается в тонкую полоску, убирая текст СНиПа.",
        targetId: "card_wrapper_110", 
        action: () => {
            const el = document.getElementById('card_wrapper_110');
            if(el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
        }
    },
    {
        text: "<b>Важная фишка: Эталон!</b><br>Фото можно прикреплять не только к браку, но и к эталонным работам (<b>OK</b>)! Это нужно для обучения рабочих.<br>Мы уже прикрепили зеленое демо-фото к пункту 108.",
        targetId: "card_wrapper_108",
        action: () => {
            const el = document.getElementById('card_wrapper_108');
            if(el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
        }
    },
    {
        text: "А вот так выглядит <b>Брак (FAIL)</b>.<br>Открылась нижняя панель. Здесь можно выбрать причину дефекта (💬) или загрузить фото. Мы заранее поставили красный крест на пункт 109.",
        targetId: "card_wrapper_109",
        action: () => {
            const el = document.getElementById('card_wrapper_109');
            if(el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
        }
    },
    {
        text: "Обратите внимание на желтую кнопку <b>>1.5</b> в карточке 109!<br>Если дефект значимый (B2), но допуск сильно превышен — вы обязаны нажать её. Это <b>Эскалация</b>: дефект перейдет в статус Критического (B3).",
        targetSelector: "#card_wrapper_109 button.text-orange-500",
        action: () => { }
    },
    {
        text: "💡 <b>СВЯЗЬ СО СПРАВОЧНИКОМ:</b><br>Если кнопка Справки <b>синяя</b> — значит к пункту привязана <b>TWI-карта</b>. Нажмите её, и рабочий сразу увидит эталон, фото брака и методику проверки.",
        targetSelector: "#card_wrapper_109 .btn-status.text-blue-600",
        action: () => { } 
    },
    {
        text: "После осмотра нажимаем Сохранить. Акт улетает в базу устройства.<br>Переходим во вкладку <b>История</b>.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-history']",
        action: () => { switchTab('tab-history'); }
    },
    {
        text: "В Истории хранятся все 130 демо-проверок. Группы автоматически свернуты по <b>Подрядчикам и Объектам</b>. Внутри работает пагинация (Показать еще), чтобы телефон не зависал.",
        targetId: "hist-sticky-panel",
        action: () => { window.scrollTo({top: 0, behavior: 'smooth'}); }
    },
    {
        text: "Переходим в <b>Аналитику</b>. Здесь система сама обрабатывает сырые проверки, строит графики и пишет выводы.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-analytics']",
        action: () => { switchTab('tab-analytics'); }
    },
    {
        text: "✨ <b>Магия TWI!</b><br>Система заметила, что в базе есть и фото Эталона, и фото Брака для одного и того же узла. Она сама предлагает в 1 клик сгенерировать обучающую инструкцию (TWI). За это дают огромный бонус XP!",
        targetId: "twi-magic-block",
        action: () => { 
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            if(btns[0]) switchAnalyticsSubTab('sub-contractors', btns[0]);
            window.scrollTo({top: 0, behavior: 'smooth'}); 
            const magicBlock = document.getElementById('twi-magic-block');
            if (magicBlock && magicBlock.classList.contains('magic-collapsed')) magicBlock.classList.remove('magic-collapsed');
        }
    },
    {
        text: "Откроем <b>Сводку</b>. Это готовый отчет для директора. Здесь собраны главные риски: Индекс ИКО, Динамика и ТОП-5 самых частых дефектов.",
        targetSelector: "button[onclick=\"switchAnalyticsSubTab('sub-onepager', this)\"]",
        action: () => { 
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            if(btns[1]) switchAnalyticsSubTab('sub-onepager', btns[1]);
        }
    },
    {
        text: "Перейдем в раздел <b>Инженеры (HR)</b>. Это модуль вашей личной эффективности и геймификации.",
        targetSelector: "button[onclick=\"switchAnalyticsSubTab('sub-engineer-rating', this)\"]",
        action: () => { 
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            if(btns[2]) switchAnalyticsSubTab('sub-engineer-rating', btns[2]);
        }
    },
    {
        text: "Проводя качественные проверки, вы зарабатываете <b>XP (Опыт)</b>, открываете достижения и растете от Стажера до Эксперта. Система сама формирует вам план задач на неделю.",
        targetId: "game-tab-profile",
        action: () => { }
    },
    {
        text: "Любой дашборд можно в 1 клик превратить в красивый отчет. Кнопка <b>Скачать PDF</b> вызовет меню выгрузки. Попробуйте выгрузить <b>Плакат Качества А3</b> для штаба стройки!",
        targetId: "fab-download-btn",
        action: () => {
            const fab = document.getElementById('fab-download-btn');
            if(fab) { fab.style.display = 'flex'; window.scrollTo({top: 200, behavior: 'smooth'}); }
        }
    },
    {
        text: "В <b>Справочнике</b> находится вся База Знаний: ГОСТы, Конструктор Чек-листов (можно грузить из Excel!) и Конструктор TWI-карт.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-reference']",
        action: () => { switchTab('tab-reference'); }
    },
    {
        text: "В <b>Чек-листах</b> можно собирать свои шаблоны. А при импорте бэкапа система теперь умно связывает <b>Подрядчика и Объект</b>, чтобы аналитика не смешивалась.",
        targetId: "ref-filters-block",
        action: () => { 
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            if(btns[0]) switchReferenceSubTab('ref-sub-checklists', btns[0]); 
            window.scrollTo({top: 0, behavior: 'smooth'});
            const manageBody = document.getElementById('ref-manage-body');
            if (manageBody && manageBody.style.maxHeight === '0px') toggleManagePanel();
        }
    },
    {
        text: "Если забудете логику работы или формулы — откройте вкладку <b>FAQ</b>. Там подробно расписана вся методология.<br><br>🚀 <b>Обучение завершено! Можете продолжить изучать демо-режим.</b>",
        targetSelector: "button[onclick=\"switchReferenceSubTab('ref-sub-faq', this)\"]", 
        action: () => { 
            closeTwiConstructor(); 
            setTimeout(() => { 
                const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
                if(btns[4]) switchReferenceSubTab('ref-sub-faq', btns[4]); 
                window.scrollTo({top: 0, behavior: 'smooth'});
            }, 300); 
        },
        isEnd: true
    }
];

function startInteractiveTutorial() {
    if (!isDemoMode && typeof startDemoMode === 'function') {
        startDemoMode(true); 
    }

    setTimeout(() => {
        currentTutStep = 0;
        tutOverlay = document.getElementById('tutorial-overlay');
        tutHighlightBox = document.getElementById('tut-highlight-box');
        tutTooltip = document.getElementById('tutorial-tooltip');
        tutText = document.getElementById('tut-text');
        tutStepNum = document.getElementById('tut-step');
        tutNextBtn = document.getElementById('tut-next-btn');
        
        document.getElementById('tut-total').innerText = tutorialSteps.length;

        tutOverlay.classList.remove('hidden');
        tutTooltip.classList.remove('hidden');
        
        showTutorialStep();
    }, 500);
}

function showTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    if(!step) return stopTutorial();

    if(step.action) step.action();

    setTimeout(() => {
        let target = step.targetId ? document.getElementById(step.targetId) : document.querySelector(step.targetSelector);
        
        if(target) {
            const rect = target.getBoundingClientRect();
            tutHighlightBox.style.top = `${rect.top - 4}px`;
            tutHighlightBox.style.left = `${rect.left - 4}px`;
            tutHighlightBox.style.width = `${rect.width + 8}px`;
            tutHighlightBox.style.height = `${rect.height + 8}px`;
        } else {
            tutHighlightBox.style.width = '0px';
            tutHighlightBox.style.height = '0px';
        }

        tutStepNum.innerText = currentTutStep + 1;
        tutText.innerHTML = step.text;
        
        requestAnimationFrame(() => {
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;
            
            tutTooltip.style.left = '50%';
            tutTooltip.style.transform = 'translate(-50%, 0)';
            const tRect = tutTooltip.getBoundingClientRect();
            
            if(target) {
                const targetRect = target.getBoundingClientRect();
                if (targetRect.top > screenH / 2) {
                    let topPos = targetRect.top - tRect.height - 20;
                    if (topPos < 10) topPos = 10; 
                    tutTooltip.style.top = `${topPos}px`;
                } else {
                    let topPos = targetRect.bottom + 20;
                    if (topPos + tRect.height > screenH - 10) topPos = screenH - tRect.height - 10; 
                    tutTooltip.style.top = `${topPos}px`;
                }
            } else {
                tutTooltip.style.top = `${(screenH - tRect.height) / 2}px`;
            }
            
            if (tRect.width > screenW - 20) {
                tutTooltip.style.width = `${screenW - 20}px`; 
            }

            if(step.isEnd) {
                tutNextBtn.innerText = "Завершить 🚀";
                tutNextBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
                tutNextBtn.classList.add('bg-green-600', 'hover:bg-green-500');
            } else {
                tutNextBtn.innerText = "Далее ➔";
                tutNextBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
                tutNextBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
            }

            tutTooltip.classList.remove('scale-90', 'opacity-0');
        });
    }, 700);
}

function nextTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    tutTooltip.classList.add('scale-90', 'opacity-0');
    
    setTimeout(() => {
        if(step.isEnd) {
            stopTutorial();
        } else {
            currentTutStep++;
            showTutorialStep();
        }
    }, 300);
}

function stopTutorial() {
    tutTooltip.classList.add('scale-90', 'opacity-0');
    tutOverlay.style.opacity = '0';
    
    const expView = document.getElementById('dash-expanded-view');
    if (expView && !expView.classList.contains('hidden')) {
        expView.classList.add('hidden');
    }
    const dashIcon = document.getElementById('dash-expand-icon');
    if (dashIcon) dashIcon.innerText = '▼';
    
    switchTab('tab-audit');
    
    setTimeout(() => { 
        tutOverlay.classList.add('hidden'); 
        tutTooltip.classList.add('hidden');
        tutOverlay.style.opacity = '1'; 
        
        const fab = document.getElementById('fab-download-btn');
        if(fab) fab.style.display = 'none';

        if (isDemoMode) {
            const fabExit = document.getElementById('fab-exit-demo');
            if (fabExit) {
                fabExit.classList.remove('hidden');
                fabExit.style.display = 'flex';
            }
        }
        
        const manageBody = document.getElementById('ref-manage-body');
        if (manageBody && manageBody.style.maxHeight !== '0px') toggleManagePanel();
        
        if (typeof updateBodyPadding === 'function') updateBodyPadding();
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 500);
}

// === БЫСТРЫЙ ПЕРЕХОД В FAQ С ГЛАВНОГО ЭКРАНА ===
function goToFAQ() {
    switchTab('tab-reference');
    setTimeout(() => {
        const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
        if(btns[4]) switchReferenceSubTab('ref-sub-faq', btns[4]);
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 150);
}
function startInteractiveTutorial() {
    // 1. Включаем демо-режим тихо (silent = true), если он еще не включен
    if (!isDemoMode && typeof startDemoMode === 'function') {
        startDemoMode(true); 
    }

    // 2. Ждем полсекунды, чтобы демо-данные успели отрисоваться на экране
    setTimeout(() => {
        currentTutStep = 0;
        tutOverlay = document.getElementById('tutorial-overlay');
        tutHighlightBox = document.getElementById('tut-highlight-box');
        tutTooltip = document.getElementById('tutorial-tooltip');
        tutText = document.getElementById('tut-text');
        tutStepNum = document.getElementById('tut-step');
        tutNextBtn = document.getElementById('tut-next-btn');
        
        document.getElementById('tut-total').innerText = tutorialSteps.length;

        tutOverlay.classList.remove('hidden');
        tutTooltip.classList.remove('hidden');
        
        showTutorialStep();
    }, 500);
}

function showTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    if(!step) return stopTutorial();

    // Выполняем действие для подготовки экрана (скролл, переключение вкладок)
    if(step.action) step.action();

    // Ждем 700мс, чтобы интерфейс переключился и плавно проскроллился
    setTimeout(() => {
        let target = step.targetId ? document.getElementById(step.targetId) : document.querySelector(step.targetSelector);
        
        if(target) {
            const rect = target.getBoundingClientRect();
            tutHighlightBox.style.top = `${rect.top - 4}px`;
            tutHighlightBox.style.left = `${rect.left - 4}px`;
            tutHighlightBox.style.width = `${rect.width + 8}px`;
            tutHighlightBox.style.height = `${rect.height + 8}px`;
        } else {
            tutHighlightBox.style.width = '0px';
            tutHighlightBox.style.height = '0px';
        }

        tutStepNum.innerText = currentTutStep + 1;
        tutText.innerHTML = step.text;
        
        // Даем браузеру отрисовать текст, чтобы узнать реальную высоту тултипа
        requestAnimationFrame(() => {
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;
            
            // Сбрасываем позицию для замера
            tutTooltip.style.left = '50%';
            tutTooltip.style.transform = 'translate(-50%, 0)';
            
            // Читаем размеры самого тултипа
            const tRect = tutTooltip.getBoundingClientRect();
            
            if(target) {
                const targetRect = target.getBoundingClientRect();
                
                // Проверяем, куда лучше поставить: сверху или снизу от цели
                if (targetRect.top > screenH / 2) {
                    // Цель в нижней половине экрана -> тултип ставим СВЕРХУ
                    let topPos = targetRect.top - tRect.height - 20;
                    if (topPos < 10) topPos = 10; // Защита: не даем улететь за верхний край
                    tutTooltip.style.top = `${topPos}px`;
                } else {
                    // Цель в верхней половине -> тултип ставим СНИЗУ
                    let topPos = targetRect.bottom + 20;
                    if (topPos + tRect.height > screenH - 10) topPos = screenH - tRect.height - 10; // Защита: не даем улететь за нижний край
                    tutTooltip.style.top = `${topPos}px`;
                }
            } else {
                tutTooltip.style.top = `${(screenH - tRect.height) / 2}px`;
            }
            
            // Если текст слишком широкий и вылез за левый/правый край экрана:
            if (tRect.width > screenW - 20) {
                tutTooltip.style.width = `${screenW - 20}px`; // Сжимаем
            }

            if(step.isEnd) {
                tutNextBtn.innerText = "Завершить 🚀";
                tutNextBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
                tutNextBtn.classList.add('bg-green-600', 'hover:bg-green-500');
            } else {
                tutNextBtn.innerText = "Далее ➔";
                tutNextBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
                tutNextBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
            }

            tutTooltip.classList.remove('scale-90', 'opacity-0');
        });
    }, 700);
}

function nextTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    tutTooltip.classList.add('scale-90', 'opacity-0');
    
    setTimeout(() => {
        if(step.isEnd) {
            stopTutorial();
        } else {
            currentTutStep++;
            showTutorialStep();
        }
    }, 300);
}

function stopTutorial() {
    tutTooltip.classList.add('scale-90', 'opacity-0');
    tutOverlay.style.opacity = '0';
    
    // Принудительно сворачиваем дашборд, если он был развернут
    const expView = document.getElementById('dash-expanded-view');
    if (expView && !expView.classList.contains('hidden')) {
        expView.classList.add('hidden');
    }
    const dashIcon = document.getElementById('dash-expand-icon');
    if (dashIcon) dashIcon.innerText = '▼';
    
    // Возвращаем на вкладку Осмотра
    switchTab('tab-audit');
    
    setTimeout(() => { 
        tutOverlay.classList.add('hidden'); 
        tutTooltip.classList.add('hidden');
        tutOverlay.style.opacity = '1'; 
        
        const fab = document.getElementById('fab-download-btn');
        if(fab) fab.style.display = 'none';

        // ИСПРАВЛЕНИЕ: ВОЗВРАЩАЕМ КНОПКУ ВЫХОДА ИЗ ДЕМО-РЕЖИМА
        if (isDemoMode) {
            const fabExit = document.getElementById('fab-exit-demo');
            if (fabExit) {
                fabExit.classList.remove('hidden');
                fabExit.style.display = 'flex';
            }
        }
        
        const manageBody = document.getElementById('ref-manage-body');
        if (manageBody && manageBody.style.maxHeight !== '0px') toggleManagePanel();
        
        if (typeof updateBodyPadding === 'function') updateBodyPadding();
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, 500);
}

// === КОНСТРУКТОР СВОИХ ЧЕК-ЛИСТОВ ===
let builderGroupCount = 0;
let builderItemCount = 0;

function openTemplateBuilder() {
    const overlay = document.getElementById('template-builder-overlay');
    document.getElementById('builder-title').value = '';
    document.getElementById('builder-groups').innerHTML = '';
    builderGroupCount = 0;
    builderItemCount = 0;
    
    addBuilderGroup(); // Добавляем первую пустую группу по умолчанию
    
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeTemplateBuilder() {
    document.getElementById('template-builder-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
}

function addBuilderGroup() {
    builderGroupCount++;
    const groupId = `builder-group-${builderGroupCount}`;
    const html = `
        <div id="${groupId}" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative">
            <button onclick="document.getElementById('${groupId}').remove()" class="absolute top-2 right-2 w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-bold text-xs active:scale-95 border border-red-100">✕</button>
            <label class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1 block">Название этапа (Группы)</label>
            <input type="text" class="input-base text-xs mb-3 group-title-input" placeholder="Например: 1. Подготовительные работы" value="Этап ${builderGroupCount}">
            
            <div id="${groupId}-items" class="space-y-2 mb-3 pl-2 border-l-2 border-indigo-100 dark:border-indigo-800">
                <!-- Сюда будут падать пункты -->
            </div>
            
            <button onclick="addBuilderItem('${groupId}-items')" class="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg active:scale-95 transition-colors uppercase dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400">
                + Добавить пункт контроля
            </button>
        </div>
    `;
    document.getElementById('builder-groups').insertAdjacentHTML('beforeend', html);
    addBuilderItem(`${groupId}-items`); // Сразу добавляем 1 пустой пункт
}

function addBuilderItem(containerId) {
    builderItemCount++;
    const itemId = `builder-item-${builderItemCount}`;
    const html = `
        <div id="${itemId}" class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] relative">
            <button onclick="document.getElementById('${itemId}').remove()" class="absolute top-2 right-2 text-red-500 font-black text-sm px-2">✕</button>
            
            <div class="pr-8 mb-2">
                <input type="text" class="input-base text-xs item-name-input" placeholder="Текст нарушения (Напр: Отклонение от вертикали)">
            </div>
            
            <div class="grid grid-cols-3 gap-2 mb-2">
                <div class="col-span-1">
                    <select class="input-base text-[10px] !py-1 item-weight-select bg-white">
                        <option value="1">B1 (Мелкий)</option>
                        <option value="2" selected>B2 (Значимый)</option>
                        <option value="3">B3 (Критич.)</option>
                    </select>
                </div>
                <div class="col-span-2">
                    <input type="text" class="input-base text-[10px] !py-1 item-norm-input" placeholder="СНиП / Допуск (Напр: ±2 мм)">
                </div>
            </div>
        </div>
    `;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

async function saveCustomTemplate() {
    const titleInput = document.getElementById('builder-title').value.trim();
    if (!titleInput) return showToast("Введите название чек-листа!");

    const groupsEl = document.getElementById('builder-groups').children;
    if (groupsEl.length === 0) return showToast("Добавьте хотя бы один этап!");

    const newTemplate = {
        title: titleInput,
        templateVersion: "1.0",
        groups: []
    };

    let isValid = true;

    Array.from(groupsEl).forEach(groupEl => {
        const groupTitle = groupEl.querySelector('.group-title-input').value.trim();
        const itemsContainer = groupEl.querySelector('div[id$="-items"]');
        const itemsEl = itemsContainer.children;
        
        if (!groupTitle || itemsEl.length === 0) isValid = false;

        const groupData = { group: groupTitle || "Без названия", items: [] };

        Array.from(itemsEl).forEach(itemEl => {
            const name = itemEl.querySelector('.item-name-input').value.trim();
            const weight = parseInt(itemEl.querySelector('.item-weight-select').value);
            const norm = itemEl.querySelector('.item-norm-input').value.trim();

            if (!name) isValid = false;

            // Генерируем уникальный ID для пункта (чтобы не пересекался с системными)
            const uniqueId = Date.now() % 100000 + Math.floor(Math.random() * 1000);

            groupData.items.push({
                id: uniqueId,
                n: name || "Пустой пункт",
                w: weight,
                t: formatNorms(norm || "Без норматива")
            });
        });

        newTemplate.groups.push(groupData);
    });

    if (!isValid) return showToast("Заполните все пустые поля и пункты!");

    // Генерируем slug (ключ) для шаблона
    const slug = "cstm_" + Date.now().toString(36);
    
    // Сохраняем в глобальный объект
    userTemplates[slug] = newTemplate;

    // Сохраняем в IndexedDB
    try {
        await dbPut(STORES.TEMPLATES, { slug: slug, data: newTemplate });
        showToast("✅ Шаблон успешно сохранен!");
        closeTemplateBuilder();
        
        // Обновляем списки селекторов и список в настройках
        renderSelector();
        renderSettingsTab();
        
    } catch (e) {
        console.error(e);
        showToast("Ошибка сохранения шаблона!");
    }
}

// Функция для удаления пользовательских шаблонов
async function deleteUserTemplate(slug) {
    if (!confirm("Удалить этот чек-лист? Вы не сможете проводить по нему новые проверки.")) return;
    
    delete userTemplates[slug];
    try {
        await dbDelete(STORES.TEMPLATES, slug);
        showToast("🗑️ Чек-лист удален");
        renderSelector();
        renderSettingsTab();
        
        // Если удалили тот, что был выбран - сбрасываем на HOME
        if (currentTemplateKey === `user_${slug}`) {
            changeTemplate('HOME');
        }
    } catch (e) {
        console.error(e);
        showToast("Ошибка при удалении");
    }
}
// === АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ШАБЛОНОВ ИЗ EXCEL ===

function triggerExcelImport() {
    document.getElementById('excel-template-input').click();
}

function showExcelHelp() {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="text-4xl mb-2">📊</div>`;
    document.getElementById('modal-title').innerText = "Как загрузить Excel";
    document.getElementById('modal-body').innerHTML = `
        <div class="text-sm leading-relaxed space-y-3">
            <p>Система автоматически превратит вашу таблицу в чек-лист. Файл должен быть формата <b>.xlsx</b>.</p>
            <p class="font-bold text-indigo-600 dark:text-indigo-400 mt-2">Структура таблицы (строго 4 столбца):</p>
            <table class="w-full text-left border-collapse border border-slate-300 mt-2 text-[10px] bg-white dark:bg-slate-800">
                <tr class="bg-slate-100 dark:bg-slate-700">
                    <th class="border border-slate-300 p-1">Столбец A</th>
                    <th class="border border-slate-300 p-1">Столбец B</th>
                    <th class="border border-slate-300 p-1">Столбец C</th>
                    <th class="border border-slate-300 p-1">Столбец D</th>
                </tr>
                <tr>
                    <td class="border border-slate-300 p-1"><b>Название этапа (Группы)</b></td>
                    <td class="border border-slate-300 p-1"><b>Название дефекта/пункта</b></td>
                    <td class="border border-slate-300 p-1"><b>Категория (1, 2 или 3)</b></td>
                    <td class="border border-slate-300 p-1"><b>Текст норматива / ГОСТ</b></td>
                </tr>
                <tr>
                    <td class="border border-slate-300 p-1 text-slate-500">Подготовка поверхности</td>
                    <td class="border border-slate-300 p-1 text-slate-500">Грязь, пыль на бетоне</td>
                    <td class="border border-slate-300 p-1 text-slate-500">2</td>
                    <td class="border border-slate-300 p-1 text-slate-500">СП 70.13330 очистить до основания</td>
                </tr>
            </table>
            <div class="bg-yellow-50 text-yellow-800 border border-yellow-200 p-3 rounded-lg text-[11px] mt-3">
                ⚠️ <b>Важно:</b> Первая строка таблицы (заголовки столбцов) игнорируется при загрузке. Данные должны начинаться со 2-й строки.
            </div>
        </div>
    `;
    document.body.classList.add('modal-open'); 
    modal.style.display = 'flex';
}

async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Показываем уведомление о начале загрузки
    showToast("⚙️ Обработка Excel файла...");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // Читаем Excel файл
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Берем первый лист
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Переводим в формат массива массивов
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rows.length < 2) throw new Error("Файл пуст или не содержит данных со 2-й строки");

            // Имя файла становится названием чек-листа
            const templateTitle = file.name.replace(/\.[^/.]+$/, ""); 
            const newTemplate = {
                title: templateTitle,
                templateVersion: "1.0",
                groups: []
            };

            let currentGroupTitle = "";
            let currentGroupItems = [];

            // Пропускаем 1-ю строку (rows[0]), так как это заголовки
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue; // Пропуск пустых строк

                // Считываем ячейки (Колонка A, B, C, D)
                const groupCol = row[0] ? row[0].toString().trim() : null;
                const itemCol = row[1] ? row[1].toString().trim() : null;
                const weightCol = row[2];
                const normCol = row[3] ? row[3].toString().trim() : null;

                // Если есть название группы и оно отличается от предыдущего - создаем новый блок
                if (groupCol && groupCol !== currentGroupTitle) {
                    if (currentGroupTitle && currentGroupItems.length > 0) {
                        newTemplate.groups.push({ group: currentGroupTitle, items: currentGroupItems });
                    }
                    currentGroupTitle = groupCol;
                    currentGroupItems = [];
                }

                // Если есть название дефекта
                if (itemCol) {
                    // Проверка категории
                    let weight = parseInt(weightCol);
                    if (isNaN(weight) || weight < 1 || weight > 3) weight = 2; // По умолчанию B2

                    currentGroupItems.push({
                        id: Date.now() % 100000 + Math.floor(Math.random() * 10000) + i,
                        n: itemCol,
                        w: weight,
                        t: formatNorms(normCol ? normCol : "Без норматива")
                    });
                }
            }

            // Не забываем добавить последнюю группу после цикла
            if (currentGroupTitle && currentGroupItems.length > 0) {
                newTemplate.groups.push({ group: currentGroupTitle, items: currentGroupItems });
            }

            if (newTemplate.groups.length === 0) throw new Error("Не удалось найти данные в таблице. Проверьте формат по инструкции (Кнопка '?').");

            // Генерируем уникальный ключ
            const slug = "cstm_" + Date.now().toString(36);
            
            // Сохраняем в память
            userTemplates[slug] = newTemplate;
            await dbPut(STORES.TEMPLATES, { slug: slug, data: newTemplate });

            showToast(`✅ Чек-лист "${templateTitle}" успешно загружен!`);
            
            // Перерисовываем интерфейс, чтобы шаблон сразу появился в списках
            renderSelector();
            renderSettingsTab();

        } catch (err) {
            console.error(err);
            alert("Ошибка загрузки: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    
    // Сбрасываем инпут, чтобы можно было выбрать тот же файл снова
    event.target.value = '';
}
// === ЭКСПОРТ ЧЕК-ЛИСТОВ В EXCEL И JSON ===

// Вспомогательная функция очистки HTML-тегов для выгрузки
// (Убирает красные и синие подсветки нормативов, чтобы в Excel был чистый текст)
function stripHtmlTags(str) {
    if (!str) return "";
    // Заменяем <br> на реальные переносы строк для Excel
    let text = str.replace(/<br\s*[\/]?>/gi, "\n");
    // Удаляем все остальные HTML-теги
    return text.replace(/<\/?[^>]+(>|$)/g, "");
}

function exportAllTemplatesJson() {
    showToast("⚙️ Формирование кода для templates.js...");
    
    // Объединяем системные и пользовательские чек-листы
    const allTemplates = { ...SYSTEM_TEMPLATES, ...userTemplates };
    
    // Вспомогательная функция очистки HTML для формирования чистого кода
    function cleanForCode(str) {
        if (!str) return "";
        // Убираем HTML теги, но сохраняем переносы строк как \n
        let text = str.replace(/<br\s*[\/]?>/gi, "\\n");
        text = text.replace(/<\/?[^>]+(>|$)/g, ""); 
        // Экранируем двойные кавычки
        return text.replace(/"/g, '\\"');
    }

    // Начинаем собирать строку, которая выглядит в точности как файл templates.js
    let jsCode = "/* Сгенерировано из RBI Quality */\n\n";
    jsCode += "const SYSTEM_TEMPLATES = {\n";

    const templateKeys = Object.keys(allTemplates);
    
    templateKeys.forEach((tKey, tIndex) => {
        const tmpl = allTemplates[tKey];
        jsCode += `    "${tKey}": {\n`;
        jsCode += `        title: "${tmpl.title}",\n`;
        jsCode += `        templateVersion: "${tmpl.templateVersion || '1.0'}",\n`;
        jsCode += `        groups: [\n`;

        if (tmpl.groups && Array.isArray(tmpl.groups)) {
            tmpl.groups.forEach((g, gIdx) => {
                jsCode += `            { group: "${g.group || g.title}", items: [\n`;
                
                if (g.items && Array.isArray(g.items)) {
                    g.items.forEach((i, iIdx) => {
                        const comma = iIdx < g.items.length - 1 ? ',' : '';
                        const cleanT = cleanForCode(i.t);
                        const cleanN = (i.n || "").replace(/"/g, '\\"');
                        
                        // Оборачиваем текст норматива обратно в функцию formatNorms!
                        jsCode += `                { id: ${i.id}, n: "${cleanN}", w: ${i.w}, t: formatNorms("${cleanT}") }${comma}\n`;
                    });
                }
                
                const gComma = gIdx < tmpl.groups.length - 1 ? ',' : '';
                jsCode += `            ]}${gComma}\n`;
            });
        }

        const tComma = tIndex < templateKeys.length - 1 ? ',' : '';
        jsCode += `        ]\n    }${tComma}\n`;
    });

    jsCode += "};\n";

    // Скачиваем файл как .js
    downloadFile(jsCode, `rbi_templates_code_${new Date().toLocaleDateString('ru-RU')}.js`, 'application/javascript');
    showToast("✅ Готовый код для templates.js скачан!");
}


// ==========================================
// БЛОК: БАЗА НОРМАТИВНЫХ ДОКУМЕНТОВ (НД)
// ==========================================

// Системные предустановленные нормативы

let customDocs = []; // Пользовательские документы
let currentDocFilter = 'ALL';

// Загрузка пользовательских документов при старте приложения
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const storedDocs = await dbGet(STORES.SETTINGS, 'custom_docs');
        if (storedDocs && storedDocs.data) {
            customDocs = storedDocs.data;
        }
    } catch (e) {
        console.error("Ошибка загрузки пользовательских НД", e);
    }
});

// Рендер списка документов
function renderDocsList() {
    const container = document.getElementById('docs-list-container');
    const searchInput = document.getElementById('doc-search-input')?.value.toLowerCase() || '';
    if (!container) return;

    // Объединяем системные и пользовательские
    const allDocs = [...SYSTEM_DOCS, ...customDocs];
    
    // Фильтрация
    let filtered = allDocs.filter(doc => {
        const matchSearch = doc.code.toLowerCase().includes(searchInput) || doc.title.toLowerCase().includes(searchInput);
        const matchFilter = currentDocFilter === 'ALL' || doc.type === currentDocFilter;
        return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-500 text-sm font-bold bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">По вашему запросу документы не найдены</div>`;
        return;
    }

    let html = '';
    filtered.forEach(doc => {
        const isSystem = String(doc.id).startsWith('sys_');
        const tagColor = doc.type === 'СП' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300' : 
                        (doc.type === 'ГОСТ' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300' : 
                        'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-700 dark:text-slate-300');

        html += `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col gap-2">
            ${isSystem ? '<div class="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">Системный</div>' : ''}
            
            <div class="flex items-start justify-between pr-16">
                <div>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded border ${tagColor} uppercase tracking-wider">${doc.type}</span>
                    <div class="text-[13px] font-black text-slate-800 dark:text-white mt-1.5 leading-tight">${doc.code}</div>
                </div>
            </div>
            
            <div class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">${doc.title}</div>
            
            <div class="flex gap-2 mt-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button onclick="openDocLink('${doc.link}')" class="flex-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1 active:scale-95 transition-colors">
                    📄 Читать текст
                </button>
                ${!isSystem ? `<button onclick="deleteCustomDoc('${doc.id}')" class="w-10 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg flex items-center justify-center font-bold text-sm active:scale-95 border border-red-100 dark:border-red-800">🗑️</button>` : ''}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// Заглушка для открытия ссылки
function openDocLink(link) {
    if (link && link.trim() !== '') {
        window.open(link, '_blank');
    } else {
        showToast('📄 Полный текст норматива сейчас недоступен (Демо-режим)');
    }
}

// Переключение кнопок-фильтров
function filterDocs(type, btnElement) {
    currentDocFilter = type;
    
    // Сбрасываем цвета всех кнопок
    const container = document.getElementById('doc-filters-container');
    container.querySelectorAll('.doc-filter-btn').forEach(btn => {
        btn.className = "doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700";
    });

    // Подкрашиваем активную
    btnElement.className = "doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap border border-indigo-600";
    
    renderDocsList();
}

// Модалка: Открыть
function openAddDocModal() {
    document.getElementById('add-doc-modal-overlay').style.display = 'flex';
    document.body.classList.add('modal-open');
    // Сброс полей
    document.getElementById('new-doc-code').value = '';
    document.getElementById('new-doc-title').value = '';
    document.getElementById('new-doc-link').value = '';
}

// Модалка: Закрыть
function closeAddDocModal() {
    document.getElementById('add-doc-modal-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Модалка: Сохранить
async function saveCustomDoc() {
    const type = document.getElementById('new-doc-type').value;
    const code = document.getElementById('new-doc-code').value.trim();
    const title = document.getElementById('new-doc-title').value.trim();
    const link = document.getElementById('new-doc-link').value.trim();

    if (!code || !title) {
        return showToast('⚠️ Заполните шифр и название документа');
    }

    const newDoc = {
        id: 'usr_doc_' + Date.now().toString(36),
        type: type,
        code: code,
        title: title,
        link: link,
        isSystem: false
    };

    customDocs.push(newDoc);
    
    try {
        await dbPut(STORES.SETTINGS, { key: 'custom_docs', data: customDocs });
        showToast('✅ Норматив успешно добавлен!');
        closeAddDocModal();
        renderDocsList();
    } catch (e) {
        console.error(e);
        showToast('❌ Ошибка сохранения');
    }
}

// Удаление своего норматива
async function deleteCustomDoc(id) {
    if (!confirm('Удалить этот документ из базы?')) return;
    
    customDocs = customDocs.filter(d => d.id !== id);
    try {
        await dbPut(STORES.SETTINGS, { key: 'custom_docs', data: customDocs });
        showToast('🗑️ Документ удален');
        renderDocsList();
    } catch (e) {
        console.error(e);
        showToast('❌ Ошибка удаления');
    }
}

// ==========================================
// БЛОК: TWI КАРТЫ И КОНСТРУКТОР (ЭТАП 1: БД и UI)
// ==========================================

let customTwiCards = [];
let twiStepCount = 0;
let currentEditingTwiId = null;
let currentTwiStepUploadId = null;
let currentTwiType = 'INSPECTOR'; 

// === 1. ВШИТЫЕ СИСТЕМНЫЕ TWI КАРТЫ (ИХ НЕЛЬЗЯ УДАЛИТЬ) ===
// Сюда ты можешь вставлять код карт, выгруженных через кнопку "В код (Экспорт)"

// Загрузка TWI карт при старте и слияние с системными
// === 1. ВШИТЫЕ СИСТЕМНЫЕ TWI КАРТЫ (ИХ НЕЛЬЗЯ УДАЛИТЬ) ===
// Сюда ты можешь вставлять код карт, выгруженных через кнопку "В код (Экспорт)"

// Загрузка TWI карт при старте и слияние с системными
document.addEventListener("DOMContentLoaded", async () => {
    try {
        let loadedCards = [];
        const storedTwi = await dbGet(STORES.SETTINGS, 'custom_twi_cards');
        if (storedTwi && storedTwi.data) {
            loadedCards = storedTwi.data.map(card => {
                if (!card.type) card.type = 'WORKER'; 
                return card;
            });
        }
        
        // СЛИЯНИЕ БАЗ: Системные + Пользовательские
        const systemIds = SYSTEM_TWI_CARDS.map(c => c.id);
        const filteredUserCards = loadedCards.filter(c => !systemIds.includes(c.id));
        
        customTwiCards = [...SYSTEM_TWI_CARDS, ...filteredUserCards];

        // ИСПРАВЛЕНИЕ: Принудительно отрисовываем карты после загрузки
        if (typeof renderTwiList === 'function') {
            renderTwiList();
        }

    } catch (e) { console.error("Ошибка загрузки TWI", e); }
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
    // Выгружаем ТОЛЬКО пользовательские карты (системные и так уже в коде)
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
            
            let addedCount = 0;
            for(const item of data) {
                // Если карты с таким ID еще нет, добавляем
                if(!customTwiCards.find(x => x.id === item.id)) {
                    customTwiCards.push(item);
                    addedCount++;
                }
            }
            
            // Сохраняем в базу (опять же, только пользовательские)
            const userCardsToSave = customTwiCards.filter(c => !c.id.startsWith('sys_'));
            await dbPut(STORES.SETTINGS, { key: 'custom_twi_cards', data: userCardsToSave });
            
            showToast(`✅ Импорт завершен! Добавлено карт: ${addedCount}`);
            renderTwiList();
        } catch (err) { 
            console.error(err);
            alert("Ошибка импорта. Проверьте формат файла."); 
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
// 1. РЕНДЕР СПИСКА TWI КАРТ (С бейджиками типов)
function renderTwiList() {
    const container = document.getElementById('twi-cards-container');
    const searchInput = document.getElementById('twi-search-input')?.value.toLowerCase() || '';
    if (!container) return;

    const filtered = customTwiCards.filter(card => 
        card.title.toLowerCase().includes(searchInput) || 
        card.checklistName.toLowerCase().includes(searchInput)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-sm font-bold bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">Инструкций пока нет. Создайте первую!</div>`;
        return;
    }

    container.innerHTML = filtered.map(card => {
        let typeBadge = '';
        if (card.type === 'INSPECTOR') typeBadge = '🕵️‍♂️ Карта Технадзора';
        else if (card.type === 'WORKER') typeBadge = '🛠 TWI Рабочего';
        else if (card.type === 'PDF') typeBadge = '📄 PDF Документ';

        let infoText = '';
        if (card.type === 'WORKER') infoText = `⏱️ ${(card.totalTime || 0)} мин | 📝 ${card.steps?.length || 0} шагов`;
        else if (card.type === 'INSPECTOR') infoText = `🔍 Привязан к пункту ID: ${card.itemId}`;
        else if (card.type === 'PDF') infoText = `📎 Внешний файл (Офлайн)`;

        return `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <div class="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded uppercase truncate max-w-[60%]">
                        ${card.checklistName}
                    </div>
                    <div class="text-[8px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded whitespace-nowrap border border-slate-200 dark:border-slate-600">
                        ${typeBadge}
                    </div>
                </div>
                <div class="text-[13px] font-black leading-tight text-slate-800 dark:text-white mb-2">${card.title}</div>
                <div class="text-[10px] font-bold text-slate-500 mb-3">${infoText}</div>
            </div>
            <div class="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button onclick="openTwiViewer('${card.id}')" class="flex-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors border border-indigo-100 dark:border-indigo-800">👁️ Смотреть</button>
                <button onclick="openTwiConstructor('${card.id}')" class="flex-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors border border-slate-200 dark:border-slate-600">✏️ Редак.</button>
                <button onclick="deleteTwiCard('${card.id}')" class="w-10 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg flex items-center justify-center font-bold text-sm active:scale-95 border border-red-100 dark:border-red-800 transition-colors">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

// 2. ОТКРЫТИЕ КОНСТРУКТОРА И ПЕРЕКЛЮЧЕНИЕ ТИПОВ
function changeTwiType(type) {
    currentTwiType = type;
    
    // Сбрасываем стили кнопок
    const btns = ['inspector', 'worker', 'pdf'];
    btns.forEach(b => {
        const btnEl = document.getElementById(`twi-type-btn-${b}`);
        if(btnEl) {
            btnEl.className = "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg text-slate-500 hover:text-slate-700 transition-all bg-transparent border border-transparent shadow-none";
        }
    });

    // Красим активную
    const activeBtn = document.getElementById(`twi-type-btn-${type.toLowerCase()}`);
    if (activeBtn) {
        activeBtn.className = "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg bg-indigo-50 shadow-sm text-indigo-600 border border-indigo-200 transition-all";
    }

    // Показываем нужный блок
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
        return;
    }

    // Ищем массив пунктов (напрямую из глобальных объектов, чтобы работало всегда)
    let checklistGroups = [];
    const type = checklistKey.split('_')[0];
    const key = checklistKey.replace(type + '_', '');
    
    if (type === 'sys' && SYSTEM_TEMPLATES[key]) {
        checklistGroups = SYSTEM_TEMPLATES[key].groups;
    } else if (type === 'user' && userTemplates[key]) {
        checklistGroups = userTemplates[key].groups;
    }

    if (checklistGroups.length === 0) {
        itemSelect.innerHTML = '<option value="" disabled selected>Чек-лист пуст...</option>';
        return;
    }

    let optionsHtml = '<option value="ALL" class="font-bold text-indigo-600">📘 Привязать ко всему виду работ (Общая)</option>';
optionsHtml += '<option value="" disabled>--- Или выберите конкретный пункт ---</option>';
    
    checklistGroups.forEach(g => {
        optionsHtml += `<optgroup label="${g.group || g.title}">`;
        g.items.forEach(i => {
            optionsHtml += `<option value="${i.id}">[B${i.w}] ${i.n}</option>`;
        });
        optionsHtml += `</optgroup>`;
    });

    itemSelect.innerHTML = optionsHtml;
    
    if (selectedItemId) {
        // Убеждаемся, что значение приводится к строке, так как id в HTML option всегда строка
        itemSelect.value = String(selectedItemId);
    }
}

function openTwiConstructor(editId = null) {
    document.getElementById('twi-list-view').classList.add('hidden');
    document.getElementById('twi-constructor-view').classList.remove('hidden');
    window.scrollTo(0, 0);

    const selectEl = document.getElementById('twi-checklist-select');
    let options = '<option value="" disabled selected>Выберите вид работ...</option>';
    
    // ИСПРАВЛЕНИЕ: Сортируем по алфавиту для Конструктора TWI
    const sysKeys = Object.keys(SYSTEM_TEMPLATES).sort((a, b) => SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title, 'ru'));
    sysKeys.forEach(key => {
        options += `<option value="sys_${key}">${SYSTEM_TEMPLATES[key].title}</option>`;
    });

    const userKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru'));
    userKeys.forEach(key => {
        options += `<option value="user_${key}">${userTemplates[key].title}</option>`;
    });
    
    selectEl.innerHTML = options;

    // Сброс всех полей
    document.getElementById('twi-title-input').value = '';
    document.getElementById('twi-steps-container').innerHTML = '';
    document.getElementById('twi-why-input').value = '';
    document.getElementById('twi-how-input').value = '';
    removeTwiGoodPhoto();
    removeTwiBadPhoto();
    removeTwiPdf();
    twiStepCount = 0;
    currentEditingTwiId = editId;

    if (editId) {
        const card = customTwiCards.find(c => c.id === editId);
        if (card) {
            document.getElementById('twi-title-input').value = card.title;
            selectEl.value = card.checklistKey;
            
            if(card.type === 'INSPECTOR') populateTwiItemSelect(card.itemId);
            else populateTwiItemSelect();

            changeTwiType(card.type || 'WORKER');

            if (card.type === 'INSPECTOR') {
                document.getElementById('twi-why-input').value = card.whyImportant || '';
                document.getElementById('twi-how-input').value = card.howToCheck || '';
                if(card.photoGood) renderGoodPhoto(card.photoGood);
                if(card.photoBad) renderBadPhoto(card.photoBad);
            } else if (card.type === 'PDF') {
                if (card.pdfData) renderPdfFile(card.pdfName, card.pdfSize, card.pdfData);
            } else {
                card.steps.forEach(step => addTwiStep(step));
            }
        }
    } else {
        changeTwiType('INSPECTOR');
        addTwiStep(); 
        populateTwiItemSelect();
    }
}

function closeTwiConstructor() {
    document.getElementById('twi-list-view').classList.remove('hidden');
    document.getElementById('twi-constructor-view').classList.add('hidden');
    currentEditingTwiId = null;
    renderTwiList();
}

// 3. ОБРАБОТКА ФОТО И PDF (ИНСПЕКТОР)
function compressImageToBase64(file, maxWidth, quality, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width; let height = img.height;
            if (width > height && width > maxWidth) { height *= maxWidth / width; width = maxWidth; } 
            else if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', quality));
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function handleTwiGoodPhotoUpload(event) {
    if (!event.target.files[0]) return;
    compressImageToBase64(event.target.files[0], 800, 0.8, (base64) => {
        renderGoodPhoto(base64);
        event.target.value = '';
    });
}
function renderGoodPhoto(base64) {
    const cont = document.getElementById('twi-photo-good-container');
    cont.dataset.photo = base64;
    // ИСПРАВЛЕНО: h-40 md:h-64 object-contain
    cont.innerHTML = `<div class="relative w-full h-40 md:h-64 rounded-lg overflow-hidden border border-green-300 shadow-sm mt-1 bg-slate-50 dark:bg-slate-900"><img src="${base64}" class="w-full h-full object-contain"><button onclick="removeTwiGoodPhoto()" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
}
function removeTwiGoodPhoto() {
    const cont = document.getElementById('twi-photo-good-container');
    cont.dataset.photo = '';
    cont.innerHTML = `<button onclick="document.getElementById('twi-photo-good-input').click()" class="w-full h-full min-h-[80px] bg-white dark:bg-slate-800 border border-dashed border-green-300 py-4 rounded-lg text-[10px] font-bold text-green-600 active:scale-95 transition-all">➕ Загрузить фото</button>`;
}

function handleTwiBadPhotoUpload(event) {
    if (!event.target.files[0]) return;
    compressImageToBase64(event.target.files[0], 800, 0.8, (base64) => {
        renderBadPhoto(base64);
        event.target.value = '';
    });
}
function renderBadPhoto(base64) {
    const cont = document.getElementById('twi-photo-bad-container');
    cont.dataset.photo = base64;
    // ИСПРАВЛЕНО: h-40 md:h-64 object-contain
    cont.innerHTML = `<div class="relative w-full h-40 md:h-64 rounded-lg overflow-hidden border border-red-300 shadow-sm mt-1 bg-slate-50 dark:bg-slate-900"><img src="${base64}" class="w-full h-full object-contain"><button onclick="removeTwiBadPhoto()" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
}
function removeTwiBadPhoto() {
    const cont = document.getElementById('twi-photo-bad-container');
    cont.dataset.photo = '';
    cont.innerHTML = `<button onclick="document.getElementById('twi-photo-bad-input').click()" class="w-full h-full min-h-[80px] bg-white dark:bg-slate-800 border border-dashed border-red-300 py-4 rounded-lg text-[10px] font-bold text-red-600 active:scale-95 transition-all">➕ Загрузить фото</button>`;
}

function handleTwiPdfUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        event.target.value = '';
        return alert("Файл слишком большой! Максимум 5 МБ для оффлайн БД.");
    }
    
    showToast("⚙️ Загружаем PDF в память...");
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        renderPdfFile(file.name, (file.size / 1024 / 1024).toFixed(1) + ' MB', base64);
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
    cont.nextElementSibling.classList.add('hidden'); // прячем кнопку выбора
}
function removeTwiPdf() {
    const cont = document.getElementById('twi-pdf-container');
    cont.dataset.pdf = '';
    cont.classList.add('hidden');
    cont.nextElementSibling.classList.remove('hidden'); // показываем кнопку выбора
}

// 4. ДОБАВЛЕНИЕ ШАГА (ДЛЯ РАБОЧЕГО TWI)
function addTwiStep(data = null) {
    twiStepCount++;
    const stepId = `twi-step-${twiStepCount}`;
    const text = data ? data.text : '';
    const time = data ? data.time : '';
    const photoSrc = data ? data.photo : null;
    
    const photoHtml = photoSrc ? 
        `<div class="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm mt-2"><img src="${photoSrc}" class="w-full h-full object-cover" id="img-${stepId}"><button onclick="removeTwiPhoto('${stepId}')" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shadow-md">✕</button></div>` : 
        `<button onclick="triggerTwiPhotoUpload('${stepId}')" class="w-full mt-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2" id="btn-photo-${stepId}">📸 Прикрепить фото/схему</button>`;

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
            <div class="twi-photo-container" data-photo="${photoSrc || ''}">${photoHtml}</div>
        </div>`;
    document.getElementById('twi-steps-container').insertAdjacentHTML('beforeend', html);
}

function triggerTwiPhotoUpload(stepId) { currentTwiStepUploadId = stepId; document.getElementById('twi-photo-input').click(); }

function handleTwiPhotoUpload(event) {
    if (!event.target.files[0] || !currentTwiStepUploadId) return;
    compressImageToBase64(event.target.files[0], 800, 0.8, (base64) => {
        const container = document.getElementById(currentTwiStepUploadId).querySelector('.twi-photo-container');
        container.dataset.photo = base64;
        // ИСПРАВЛЕНО: h-48 md:h-64 object-contain
        container.innerHTML = `<div class="relative w-full h-48 md:h-64 rounded-lg overflow-hidden border border-slate-200 shadow-sm mt-2 bg-slate-50 dark:bg-slate-900"><img src="${base64}" class="w-full h-full object-contain"><button onclick="removeTwiPhoto('${currentTwiStepUploadId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">✕</button></div>`;
        event.target.value = '';
    });
}

function removeTwiPhoto(stepId) {
    const container = document.getElementById(stepId).querySelector('.twi-photo-container');
    container.dataset.photo = '';
    container.innerHTML = `<button onclick="triggerTwiPhotoUpload('${stepId}')" class="w-full mt-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">📸 Прикрепить фото/схему</button>`;
}

// 5. СОХРАНЕНИЕ TWI КАРТЫ С УЧЕТОМ ТИПОВ
async function saveTwiCard() {
    const title = document.getElementById('twi-title-input').value.trim();
    const select = document.getElementById('twi-checklist-select');
    const checklistKey = select.value;
    const checklistName = select.options[select.selectedIndex]?.text || 'Без привязки';

    if (!title || !checklistKey) return showToast("⚠️ Укажите название и привязку к чек-листу!");

    let cardData = {
        id: currentEditingTwiId || 'twi_' + Date.now().toString(36),
        title: title,
        checklistKey: checklistKey,
        checklistName: checklistName,
        type: currentTwiType // 'INSPECTOR', 'WORKER', 'PDF'
    };

    if (currentTwiType === 'INSPECTOR') {
        const itemId = document.getElementById('twi-item-select').value;
        const why = document.getElementById('twi-why-input').value.trim();
        const how = document.getElementById('twi-how-input').value.trim();
        const pGood = document.getElementById('twi-photo-good-container').dataset.photo;
        const pBad = document.getElementById('twi-photo-bad-container').dataset.photo;

        if (!itemId) return showToast("⚠️ Выберите конкретный пункт контроля!");
        if (!why || !how) return showToast("⚠️ Заполните описания (Почему важно / Как проверять)!");

        cardData.itemId = parseInt(itemId);
        cardData.whyImportant = why;
        cardData.howToCheck = how;
        cardData.photoGood = pGood || null;
        cardData.photoBad = pBad || null;

    } else if (currentTwiType === 'WORKER') {
        const stepEls = document.getElementById('twi-steps-container').querySelectorAll('.twi-step-item');
        if (stepEls.length === 0) return showToast("⚠️ Добавьте хотя бы один шаг!");

        const steps = []; let totalTime = 0; let isValid = true;
        stepEls.forEach((el, index) => {
            const text = el.querySelector('.twi-step-text').value.trim();
            const time = parseInt(el.querySelector('.twi-step-time').value) || 0;
            const photo = el.querySelector('.twi-photo-container').dataset.photo || null;
            if (!text) isValid = false;
            totalTime += time;
            steps.push({ order: index + 1, text: text, time: time, photo: photo });
        });

        if (!isValid) return showToast("⚠️ Заполните текст во всех шагах!");
        cardData.totalTime = totalTime;
        cardData.steps = steps;

    } else if (currentTwiType === 'PDF') {
        const pdfData = document.getElementById('twi-pdf-container').dataset.pdf;
        if (!pdfData) return showToast("⚠️ Загрузите PDF-файл!");
        cardData.pdfData = pdfData;
        cardData.pdfName = document.getElementById('twi-pdf-name').innerText;
        cardData.pdfSize = document.getElementById('twi-pdf-size').innerText;
    }

    if (currentEditingTwiId) {
        const index = customTwiCards.findIndex(c => c.id === currentEditingTwiId);
        if (index !== -1) customTwiCards[index] = cardData;
    } else {
        customTwiCards.push(cardData);
    }

    try {
        await dbPut(STORES.SETTINGS, { key: 'custom_twi_cards', data: customTwiCards });
        showToast("✅ Инструкция успешно сохранена!");
        
        // ---> НАЧАЛО ВСТАВКИ ДЛЯ ГЕЙМИФИКАЦИИ <---
         if (typeof gameLogAction === 'function' && !currentEditingTwiId) {
            // Проверяем, была ли это Магия TWI (если в id есть слово magic)
            if (cardData.id.includes('magic')) {
                gameLogAction('magic_creator', cardData.id); // Бонусная ачивка!
                gameLogAction('create_twi', cardData.id);    // И обычная
            } else {
                gameLogAction('create_twi', cardData.id);
            }
        }
        // ---> КОНЕЦ ВСТАВКИ <---

        closeTwiConstructor();
    } catch (e) {
        console.error(e);
        showToast("❌ Ошибка при сохранении. Возможно файл слишком большой.");
    }
}

// 6. УДАЛЕНИЕ КАРТЫ
async function deleteTwiCard(id) {
    if (id.startsWith('sys_')) {
        return showToast("⚠️ Системные инструкции удалить нельзя!");
    }
    if (!confirm('Удалить эту инструкцию безвозвратно?')) return;
    customTwiCards = customTwiCards.filter(c => c.id !== id);
    try {
        const userCardsToSave = customTwiCards.filter(c => !c.id.startsWith('sys_'));
        await dbPut(STORES.SETTINGS, { key: 'custom_twi_cards', data: userCardsToSave });
        showToast("🗑️ Инструкция удалена");
        renderTwiList();
    } catch (e) { showToast("❌ Ошибка удаления"); }
}

// === УПРАВЛЕНИЕ АККОРДЕОНАМИ (СПРАВОЧНИК) ===
function toggleManagePanel() {
    const body = document.getElementById('ref-manage-body');
    const icon = document.getElementById('ref-manage-toggle-icon');
    
    if (!body || !icon) return;

    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
        // Открываем панель управления
        body.style.maxHeight = '400px';
        body.style.opacity = '1';
        body.style.marginTop = '12px';
        icon.style.transform = 'rotate(0deg)';
        
        // Рендерим список шаблонов, если он пуст
        if (typeof renderSettingsTab === 'function') {
            renderSettingsTab();
        }
    } else {
        // Скрываем панель управления
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.marginTop = '0px';
        icon.style.transform = 'rotate(-90deg)';
    }
}
// ==========================================
// БЛОК: БИБЛИОТЕКА ТЕХНИЧЕСКИХ УЗЛОВ
// ==========================================

let currentNodeFilter = 'ALL';

function renderNodesList() {
    const container = document.getElementById('nodes-list-container');
    const searchInput = document.getElementById('node-search-input')?.value.toLowerCase() || '';
    if (!container) return;

    let filtered = SYSTEM_NODES.filter(node => {
        const matchSearch = node.title.toLowerCase().includes(searchInput) || node.desc.toLowerCase().includes(searchInput);
        const matchFilter = currentNodeFilter === 'ALL' || node.category === currentNodeFilter;
        return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-sm font-bold bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">Узлы не найдены</div>`;
        return;
    }

    container.innerHTML = filtered.map(node => `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm flex flex-col cursor-pointer active:scale-[0.98] transition-transform" onclick="openNodeViewer('${node.id}')">
            <div class="h-28 bg-white dark:bg-slate-800 border-b border-[var(--card-border)] p-2">
                <img src="${node.img}" class="w-full h-full object-contain opacity-90">
            </div>
            <div class="p-3 flex-1 flex flex-col">
                <div class="text-[8px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded w-fit mb-1.5 uppercase">${node.category}</div>
                <div class="text-[11px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">${node.title}</div>
            </div>
        </div>
    `).join('');
}

function filterNodes(category, btnElement) {
    currentNodeFilter = category;
    const container = document.getElementById('node-filters-container');
    container.querySelectorAll('.node-filter-btn').forEach(btn => {
        btn.className = "node-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700";
    });
    btnElement.className = "node-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap border border-indigo-600";
    renderNodesList();
}

function openNodeViewer(nodeId) {
    const node = SYSTEM_NODES.find(n => n.id === nodeId);
    if (!node) return;

    // Безопасно заполняем текстовые поля
    const titleEl = document.getElementById('viewer-node-title');
    if (titleEl) titleEl.innerText = node.title;

    const descEl = document.getElementById('viewer-node-desc');
    if (descEl) descEl.innerText = node.desc;

    const imgEl = document.getElementById('viewer-node-img');
    if (imgEl) imgEl.src = node.img;

    const catEl = document.getElementById('viewer-node-category');
    if (catEl) catEl.innerText = node.category;

    const badgeEl = document.getElementById('viewer-node-badge');
    if (badgeEl) {
        badgeEl.innerText = 'УЗЕЛ';
        badgeEl.className = 'bg-indigo-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm';
    }

    // Таблица материалов
    const matTbody = document.getElementById('viewer-node-materials');
    if (matTbody) {
        matTbody.innerHTML = node.materials.map(m => `
            <tr class="border-b border-slate-100 dark:border-slate-700">
                <td class="p-2 font-medium text-slate-700 dark:text-slate-300 text-[11px]">${m.name}</td>
                <td class="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap text-[11px]">${m.qty}</td>
            </tr>
        `).join('');
    }

    // Ищем привязанную TWI карту ко ВСЕМУ чек-листу
    const linkedTwi = customTwiCards.find(c => c.checklistKey === node.linkedTwiChecklistKey && (c.itemId === 'ALL' || !c.itemId));
    const twiBtnHtml = linkedTwi 
        ? `<button onclick="closeNodeViewer(); setTimeout(()=>openTwiViewer('${linkedTwi.id}'), 300)" class="bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400 py-3 rounded-xl text-[10px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-1.5"><span>🛠️</span> TWI Монтажа</button>`
        : `<div class="bg-slate-50 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 py-3 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 opacity-70"><span>🚫</span> Нет TWI</div>`;

    const linksEl = document.getElementById('viewer-node-links');
    if (linksEl) {
        linksEl.innerHTML = `
            <button onclick="closeNodeViewer(); setTimeout(()=>findAndOpenND('${node.linkedDoc}'), 300)" class="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 py-3 rounded-xl text-[10px] font-bold uppercase shadow-sm active:scale-95 flex items-center justify-center gap-1.5">
                <span>📚</span> Норматив
            </button>
            ${twiBtnHtml}
        `;
    }

    // Показываем окно
    const overlay = document.getElementById('node-viewer-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    }
}

function closeNodeViewer() {
    const overlay = document.getElementById('node-viewer-overlay');
    overlay.classList.add('opacity-0');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

// === ПЕЧАТЬ TWI КАРТЫ ДЛЯ РАБОЧИХ ===
function printCurrentTwi() {
    const twiId = document.getElementById('twi-viewer-overlay').dataset.currentTwiId;
    if (!twiId) return;
    const card = customTwiCards.find(c => c.id === twiId);
    if (!card) return;

    let content = '';

    if (card.type === 'INSPECTOR') {
        content = `
            <div style="display:flex; gap:20px; margin-bottom:20px; page-break-inside: avoid;">
                <div style="flex:1; border:3px solid #22c55e; padding:10px; border-radius:10px; text-align:center; background:#f0fdf4;">
                    <h2 style="color:#166534; margin-top:0;">✅ ПРАВИЛЬНО (ЭТАЛОН)</h2>
                    ${card.photoGood ? `<img src="${card.photoGood}" style="max-height:300px; width:100%; object-fit:cover; border-radius:5px;">` : 'Нет фото'}
                </div>
                <div style="flex:1; border:3px solid #ef4444; padding:10px; border-radius:10px; text-align:center; background:#fef2f2;">
                    <h2 style="color:#991b1b; margin-top:0;">❌ БРАК (НЕ ДОПУСКАЕТСЯ)</h2>
                    ${card.photoBad ? `<img src="${card.photoBad}" style="max-height:300px; width:100%; object-fit:cover; border-radius:5px;">` : 'Нет фото'}
                </div>
            </div>
            <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #cbd5e1; margin-bottom:15px; page-break-inside: avoid;">
                <h3 style="color:#0f172a; margin-top:0;">⚠️ Почему это важно (Риски):</h3>
                <p style="font-size:14px;">${card.whyImportant || 'Не указано'}</p>
            </div>
            <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #cbd5e1; page-break-inside: avoid;">
                <h3 style="color:#0f172a; margin-top:0;">🔧 Как проверять (Методика):</h3>
                <p style="font-size:14px;">${card.howToCheck || 'Не указано'}</p>
            </div>
        `;
    } else if (card.type === 'WORKER') {
        content = `
            <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #cbd5e1; margin-bottom:20px;">
                <h3 style="margin:0;">Параметры операции:</h3>
                <p>Время выполнения: ~<b>${card.totalTime} мин</b> | Количество шагов: <b>${card.steps.length}</b></p>
            </div>
            <div style="display:flex; flex-direction:column; gap:15px;">
        `;
        card.steps.forEach(step => {
            content += `
                <div style="border:2px solid #e2e8f0; border-left:5px solid #f59e0b; padding:15px; border-radius:8px; page-break-inside: avoid; display:flex; gap:15px; align-items:center;">
                    <div style="flex:1;">
                        <h3 style="color:#d97706; margin-top:0;">ШАГ ${step.order} ${step.time ? `(⏱ ${step.time} мин)` : ''}</h3>
                        <p style="font-size:16px; font-weight:bold;">${step.text}</p>
                    </div>
                    ${step.photo ? `<div style="flex:1; text-align:right;"><img src="${step.photo}" style="max-height:200px; max-width:100%; object-fit:contain; border-radius:5px; border:1px solid #cbd5e1;"></div>` : ''}
                </div>
            `;
        });
        content += `</div>`;
    } else {
        return showToast('Печать PDF-файлов осуществляется внешними средствами.');
    }

    printPdfShell(`ИНСТРУКЦИЯ: ${card.title} (${card.checklistName})`, content);
}

// === ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ МЫШКОЙ (ДЛЯ ПК) ===
function initHorizontalMouseScroll() {
    let isDown = false;
    let startX;
    let scrollLeft;
    let slider = null;

    // Вешаем слушатели на весь документ, но фильтруем цели
    document.addEventListener('mousedown', (e) => {
        // Ищем ближайший контейнер со скроллом
        slider = e.target.closest('.overflow-x-auto, .custom-scrollbar, .no-scrollbar');
        
        // Запрещаем скролл мышкой, если кликнули по кнопке, инпуту или фото (чтобы не блокировать их нажатие)
        if (!slider || e.target.closest('button, input, select, a, img')) {
            slider = null;
            return;
        }

        isDown = true;
        slider.style.cursor = 'grabbing';
        slider.style.userSelect = 'none'; // Запрет выделения текста при скролле
        
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    document.addEventListener('mouseleave', () => {
        if (!isDown || !slider) return;
        isDown = false;
        slider.style.cursor = '';
        slider.style.userSelect = '';
    });

    document.addEventListener('mouseup', () => {
        if (!isDown || !slider) return;
        isDown = false;
        slider.style.cursor = '';
        slider.style.userSelect = '';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDown || !slider) return;
        e.preventDefault(); // Останавливает стандартные браузерные события
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5; // Скорость прокрутки (1.5x)
        slider.scrollLeft = scrollLeft - walk;
    });
}

