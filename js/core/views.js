/* Файл: js/core/views.js */

// Мягкое переключение экранов (через CSS класс)
// Мягкое переключение экранов (через CSS класс)
function switchViewNode(tabId, showHeader) {
    // 1. Скрываем все вкладки
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
    });
    
    // 2. Показываем только нужную
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
    }
    
    // 3. Управляем шапкой (основной)
    const header = document.getElementById('main-header');
    if (header) {
        // Жестко скрываем шапку на вкладках Аналитики, Настроек и т.д., чтобы не ломать верстку
        header.style.display = showHeader ? 'block' : 'none';
        
        // Если шапка видима, настраиваем её внутренности в зависимости от режима
        if (window.AppModeManager) window.AppModeManager.updateHeaderVisibility(showHeader);
    }
    
    // 4. Пересчитываем отступы
    if (typeof updateBodyPadding === 'function') setTimeout(updateBodyPadding, 50);
}

// Функция для режима-заглушки (В разработке)
function showModePlaceholder(modeName, customMessage) {
    const el = document.getElementById('tab-mode-placeholder');
    if (!el) return;

    const names = {
        'transfer': 'Передача квартир',
        'warranty': 'Гарантийное обслуживание',
        'safety': 'Охрана труда и ПБ',
        'uk': 'Управляющая компания',
        'tender': 'Тендерный отдел',
        'standards': 'Стандарты (тех. решения)',
        'schedule': 'Сроки',
        'budget': 'Бюджет'
    };

    const titleEl = el.querySelector('h2');
    if (titleEl) titleEl.innerText = `Модуль «${names[modeName] || modeName}»`;

    const messageEl = document.getElementById('placeholder-message');
    if (messageEl) {
        messageEl.innerText = customMessage ||
            'Модуль ещё не разработан. Стадия оформления концепции и наполнения.';
    }

    // showHeader=true только оставляет видимой верхнюю строку шапки
    // (переключатель режима) — безопасно для потока AppModeManager
    // (safety/warranty/uk), т.к. там currentMode уже сменился с 'quality' и
    // updateHeaderVisibility() прячет дашборд/данные объекта. Для sidebar-
    // потока (rbi_showSidebarPlaceholder) currentMode остаётся 'quality' —
    // та же функция показала бы полный дашборд аудита поверх заглушки,
    // поэтому там шапка скрывается целиком (showHeader=false).
    var keepHeader = !window.rbi_sidebarPlaceholderReturnHash;
    switchViewNode('tab-mode-placeholder', keepHeader);
}

// Единая заглушка для разделов сайдбара, не относящихся к переключению
// бизнес-режима AppModeManager (§29 п.9 — «Тендерный отдел»/«Стандарты»/
// «Сроки»/«Бюджет» и т.п.). В отличие от showModePlaceholder(...) из
// AppModeManager-потока (safety/warranty/uk), здесь НЕ меняется
// AppModeManager.currentMode/previousMode — раздел открывается «поверх»
// текущего маршрута без переключения бизнес-режима. Поэтому кнопка «Назад»
// не может полагаться на revertToPreviousMode() (no-op, если currentMode не
// менялся) — путь возврата запоминается отдельно и обрабатывается
// rbi_backFromModePlaceholder().
window.rbi_sidebarPlaceholderReturnHash = null;
window.rbi_showSidebarPlaceholder = function (moduleId) {
    window.rbi_sidebarPlaceholderReturnHash = window.location.hash || '#/quality/audit';
    showModePlaceholder(moduleId);
};

// Обработчик кнопки «Вернуться назад» на экране-заглушке (единый для обоих
// потоков): если заглушка была открыта из sidebar (см. выше) — возвращаемся
// на сохранённый маршрут через роутер; иначе (поток AppModeManager —
// safety/warranty/uk) — старое поведение revertToPreviousMode().
window.rbi_backFromModePlaceholder = function () {
    if (window.rbi_sidebarPlaceholderReturnHash) {
        var path = window.rbi_sidebarPlaceholderReturnHash;
        window.rbi_sidebarPlaceholderReturnHash = null;
        if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
            window.AppRouter.navigate(path);
        }
        return;
    }
    if (typeof window.revertToPreviousMode === 'function') window.revertToPreviousMode();
};

window.AppViews = {
    // === РАЗДЕЛ 1: КАЧЕСТВО (СУЩЕСТВУЮЩИЙ) ===
    renderAudit() {
        if (AppModeManager.currentMode !== 'quality') AppModeManager.changeMode('quality');
        switchViewNode('tab-audit', true); // ТУТ TRUE (шапка нужна)
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateFabButton === 'function') updateFabButton('tab-audit');
    },
    
    renderEngineer() {
        if (AppModeManager.currentMode !== 'quality') AppModeManager.changeMode('quality');
        switchViewNode('tab-engineer', false); // ТУТ FALSE
        if (typeof rbi_renderEngineerTab === 'function') rbi_renderEngineerTab();
        if (typeof updateFabButton === 'function') updateFabButton('tab-engineer');
    },

    renderAnalytics() {
        if (AppModeManager.currentMode !== 'quality') AppModeManager.changeMode('quality');
        switchViewNode('tab-analytics', false); // Шапка скрыта
        if (typeof updateAnalyticsFilters === 'function') updateAnalyticsFilters();

        // Внутренняя функция: выполнить рендер активной подвкладки
        function _doRender() {
            if (typeof currentActiveAnalyticsTab !== 'undefined') {
                var btn = document.querySelector(`button[onclick*="switchAnalyticsSubTab('${currentActiveAnalyticsTab}')"]`);
                if (btn && typeof switchAnalyticsSubTab === 'function') {
                    switchAnalyticsSubTab(currentActiveAnalyticsTab, btn);
                } else if (typeof renderCurrentAnalyticsTab === 'function') {
                    renderCurrentAnalyticsTab();
                }
            } else if (typeof renderCurrentAnalyticsTab === 'function') {
                renderCurrentAnalyticsTab();
            }
            if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');
        }

        // Первый рендер сразу (данные могут уже быть, если переключаем вкладки)
        _doRender();

        // Страховочный повторный рендер после загрузки данных из IndexedDB.
        // При F5 app.js заполняет contractorArray асинхронно (await restoreSession).
        // Опрашиваем каждые 200 мс, пока данные не появятся или не истечёт 5 сек.
        var _retryCount = 0;
        var _retryMax = 25; // 25 × 200 мс = 5 сек максимум
        var _retryTimer = setInterval(function () {
            _retryCount++;
            var activeSection = document.querySelector('.view-section.active');
            // Прекращаем, если ушли с вкладки аналитики
            if (!activeSection || activeSection.id !== 'tab-analytics') {
                clearInterval(_retryTimer);
                return;
            }
            // Данные появились — рендерим и останавливаем опрос
            var _inspections = window.RBI.services.inspections.getAllForAnalyticsSync();
            if (_inspections.length > 0) {
                clearInterval(_retryTimer);
                if (typeof updateAnalyticsFilters === 'function') updateAnalyticsFilters();
                _doRender();
                return;
            }
            // Превысили таймаут — останавливаем
            if (_retryCount >= _retryMax) {
                clearInterval(_retryTimer);
            }
        }, 200);

        // ВОЗВРАЩАЕМ ЛОГИКУ СВОРАЧИВАНИЯ ФИЛЬТРОВ
        if (typeof initCollapsiblePanel === 'function') {
            initCollapsiblePanel('analytics-filters-block', 'analytics-panel-body', 'analytics-panel-header', 'analytics-panel-toggle-icon');
        }
    },

    renderReference() {
        
        switchViewNode('tab-reference', false); // ТУТ FALSE
        if (typeof updateFabButton === 'function') updateFabButton('tab-reference');

        if (window.syncDirtyFlags && window.syncDirtyFlags.reference) {
            if (typeof window.rbi_reloadReferenceMemory === 'function') {
                window.RBI.services.knowledge.reloadReferenceMemory().then(() => {
                    window.syncDirtyFlags.reference = false;
                    const activeSub = document.querySelector('.ref-sub-section:not(.hidden)');
                    if (activeSub && activeSub.id === 'ref-sub-twi' && typeof renderTwiList === 'function') renderTwiList();
                });
            }
        }
    },

    renderSettings() {
        switchViewNode('tab-settings', false); // ТУТ FALSE
        if (typeof renderSettingsTab === 'function') renderSettingsTab(); // <-- ВСТАВКА: Отрисовка данных из памяти
        if (typeof updateStorageInfo === 'function') updateStorageInfo();
        if (typeof updateFabButton === 'function') updateFabButton('tab-settings');
    },

    // === РАЗДЕЛ 2: СТРОЙКОНТРОЛЬ (НОВЫЙ) ===
    renderConstructionDefects() { 
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        switchViewNode('tab-construction-defects', true); // ТУТ TRUE (нужна шапка с режимами)
        
        // Запуск логики отрисовки планов СК
        if (window.ConstructionActions && typeof window.ConstructionActions.init === 'function') {
            window.ConstructionActions.init();
        }
    },
    renderConstructionAcceptance() { 
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        switchViewNode('tab-construction-acceptance', true); 
        if (window.ConstructionActions && typeof window.ConstructionActions.initAcceptance === 'function') window.ConstructionActions.initAcceptance(); 
    },
    
    
    renderConstructionReports() { showModePlaceholder('construction_reports'); },

    renderConstructionReference() {
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        window.AppViews.renderReference();
    },
    
    // === РАЗДЕЛЫ-ЗАГЛУШКИ ===
    renderTransfer() { 
        // Если мы не в Стройконтроле, переключаемся на Стройконтроль
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        
        switchViewNode('tab-transfer', true); 
        
        if (window.ConstructionActions && typeof window.ConstructionActions.initTransfer === 'function') {
            window.ConstructionActions.initTransfer();
        }
    },
    renderWarranty() { showModePlaceholder('warranty'); },
    renderSafety() { showModePlaceholder('safety'); }, // <-- ДОБАВИЛИ ЭТУ СТРОКУ
    renderUk() { showModePlaceholder('uk'); },

    renderNotFound() { showModePlaceholder('404'); }
};

// Регистрируем маршруты
document.addEventListener('DOMContentLoaded', () => {
    // Качество (База)
    AppRouter.addRoute('#/quality/audit', window.AppViews.renderAudit);
    AppRouter.addRoute('#/quality/engineer', window.AppViews.renderEngineer);
    AppRouter.addRoute('#/quality/analytics', window.AppViews.renderAnalytics);
    AppRouter.addRoute('#/quality/reference', window.AppViews.renderReference);
    AppRouter.addRoute('#/quality/settings', window.AppViews.renderSettings);
    
   // Стройконтроль
    AppRouter.addRoute('#/construction/defects', window.AppViews.renderConstructionDefects);
    AppRouter.addRoute('#/construction/acceptance', window.AppViews.renderConstructionAcceptance);
    AppRouter.addRoute('#/construction/reports', window.AppViews.renderConstructionReports);
    AppRouter.addRoute('#/construction/transfer', window.AppViews.renderTransfer);
    AppRouter.addRoute('#/construction/reference', window.AppViews.renderConstructionReference);
    
    // Заглушки
    AppRouter.addRoute('#/warranty/placeholder', window.AppViews.renderWarranty);
    AppRouter.addRoute('#/uk/placeholder', window.AppViews.renderUk);
    AppRouter.addRoute('#/safety/placeholder', window.AppViews.renderSafety); // <-- ДОБАВИЛИ ЭТУ СТРОКУ
    
    AppRouter.addRoute('*', window.AppViews.renderNotFound);
    
    // Инициализация менеджера режимов перед роутером
    AppModeManager.init();
    AppRouter.init();
});
