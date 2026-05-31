/* Файл: js/views.js */

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
function showModePlaceholder(modeName) {
    const el = document.getElementById('tab-mode-placeholder');
    if (!el) return;
    
    const names = {
        'transfer': 'Передача квартир',
        'warranty': 'Гарантийное обслуживание',
        'safety': 'Охрана труда и ПБ',
        'uk': 'Управляющая компания'
    };

    const titleEl = el.querySelector('h2');
    if (titleEl) titleEl.innerText = `Модуль «${names[modeName] || modeName}»`;

    switchViewNode('tab-mode-placeholder', true);
}

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
        switchViewNode('tab-analytics', false); // ТУТ FALSE
        if (typeof updateAnalyticsFilters === 'function') updateAnalyticsFilters();
        if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
        if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');
    },

    renderReference() {
        
        switchViewNode('tab-reference', false); // ТУТ FALSE
        if (typeof updateFabButton === 'function') updateFabButton('tab-reference');

        if (window.syncDirtyFlags && window.syncDirtyFlags.reference) {
            if (typeof window.rbi_reloadReferenceMemory === 'function') {
                window.rbi_reloadReferenceMemory().then(() => {
                    window.syncDirtyFlags.reference = false;
                    const activeSub = document.querySelector('.ref-sub-section:not(.hidden)');
                    if (activeSub && activeSub.id === 'ref-sub-twi' && typeof renderTwiList === 'function') renderTwiList();
                });
            }
        }
    },

    renderSettings() {
        switchViewNode('tab-settings', false); // ТУТ FALSE
        if (typeof updateStorageInfo === 'function') updateStorageInfo();
        if (typeof updateFabButton === 'function') updateFabButton('tab-settings');
    },

    // === РАЗДЕЛ 2: СТРОЙКОНТРОЛЬ (НОВЫЙ) ===
    renderConstructionDefects() { 
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        switchViewNode('tab-construction-defects', true); // ТУТ TRUE (нужна шапка с режимами)
        
        // Запуск логики отрисовки планов СК
        if (window.ConstManager && typeof window.ConstManager.init === 'function') {
            window.ConstManager.init();
        }
    },
    renderConstructionAcceptance() { 
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        switchViewNode('tab-construction-acceptance', true); 
        if (window.ConstAcceptance && typeof window.ConstAcceptance.init === 'function') window.ConstAcceptance.init(); 
    },
    
    
    renderConstructionReports() { showModePlaceholder('construction_reports'); },
    
    // === РАЗДЕЛЫ-ЗАГЛУШКИ ===
    renderTransfer() { 
        // Если мы не в Стройконтроле, переключаемся на Стройконтроль
        if (AppModeManager.currentMode !== 'construction') AppModeManager.changeMode('construction');
        
        switchViewNode('tab-transfer', true); 
        
        if (window.TransferManager && typeof window.TransferManager.init === 'function') {
            window.TransferManager.init();
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
    
    // Заглушки
    AppRouter.addRoute('#/warranty/placeholder', window.AppViews.renderWarranty);
    AppRouter.addRoute('#/uk/placeholder', window.AppViews.renderUk);
    AppRouter.addRoute('#/safety/placeholder', window.AppViews.renderSafety); // <-- ДОБАВИЛИ ЭТУ СТРОКУ
    
    AppRouter.addRoute('*', window.AppViews.renderNotFound);
    
    // Инициализация менеджера режимов перед роутером
    AppModeManager.init();
    AppRouter.init();
});