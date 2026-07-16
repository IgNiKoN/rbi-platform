/* Файл: js/core/bootstrap.js — App Shell: глобальный state, appSettings, DOMContentLoaded-инициализация */
/* Перенесено 1:1 из js/app.js (разделы 1, 2, 4) */

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
// state/details/photos/currentTemplateKey/currentChecklist/customExpertConclusions —
// владение перенесено в js/services/session.service.js; contractorArray —
// в js/services/inspection.service.js; etalonActsArray — в
// js/services/knowledge.service.js; reportsArray — в js/services/report.service.js
// (Реальная изоляция модулей, часть 3, Группа C, критичный шаг). Все 4 сервиса
// подключены раньше bootstrap.js в index.html и уже установили соответствующие
// window.* живые ссылки.
function assignPhotosMap(next) {
    const src = next || {};
    Object.keys(window.photos).forEach((k) => delete window.photos[k]);
    Object.assign(window.photos, src);
}
window.assignPhotosMap = assignPhotosMap;
window.activeTaskId = null; // Глобальная переменная для отслеживания текущей выполняемой задачи
// currentPhotoId — перенесена в photo-editor.utils.js
// chartInstances — владение уже полностью в js/modules/quality/features/analytics/analytics.state.js
// (AnalyticsState), подтверждено Волной 1 «части 2». Дублирующее объявление
// убрано (Реальная изоляция модулей, часть 3, Группа A).
window.twiOwnerFilter = 'ALL'; // Глобальный фильтр для TWI карт
window.nodeOwnerFilter = 'ALL'; // Глобальный фильтр для Узлов
window.docOwnerFilter = 'ALL';
window.practiceOwnerFilter = 'ALL';
// auditOriginalData — владение перенесено в js/modules/quality/features/audit/audit.state.js
// (AuditState), Реальная изоляция модулей, часть 3, Группа A. audit.state.js
// (через audit.module.js) подключается позже bootstrap.js в index.html — до
// этого момента window.auditOriginalData не читается ни одним потребителем
// (только внутри функций, вызываемых после полной загрузки всех модулей).

// currentZoom/isDragging/startX/startY/translateX/translateY — перенесены в photo-editor.utils.js

// Демо-режим
window.rbi_feedbackData = [];
let realFeedbackData = [];

// Настройки приложения (v16.0)
// appSettings — владение перенесено в js/services/settings.service.js
// (Реальная изоляция модулей, часть 3, Группа B). settings.service.js
// подключён раньше bootstrap.js в index.html и уже установил window.appSettings
// (тот же объект-литерал по умолчанию, без изменений полей). Потребители не
// меняются — appSettings никогда не переприсваивается целиком, только мутация
// свойств живого объекта (appSettings.prop = x), которая продолжает работать
// без изменений через живую ссылку window.appSettings.
// Универсальный помощник для статусов синхронизации
window.setSyncStatus = function (record, status, reason = '') {
    record.source = status === 'synced' ? 'cloud' : 'local';
    record.syncStatus = status;
    record.sync_status = status;
    record.syncBlockReason = reason;
    record.sync_block_reason = reason;
    return record;
};


document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (window.RBI && window.RBI.services && window.RBI.services.shell && window.RBI.services.shell.shouldShowAuthGate()) {
            window.RBI.services.shell.showAuthGate();
        }
        // --- НОВОЕ: Автоматическая синхронизация при появлении интернета ---
        window.addEventListener('online', () => {
            if (window.syncConfig && window.syncConfig.enabled) {
                if (typeof showToast === 'function') showToast("🌐 Интернет восстановлен. Синхронизируем...");
                if (typeof triggerSync === 'function') triggerSync('silent');
            }
        });
        // -------------------------------------------------------------------
        
        // Мгновенное сохранение черновика при сворачивании браузера / переключении вкладок
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (typeof saveSessionData === 'function') window.saveSessionData();
            }
        });

        // -------------------------------------------------------------------
        // Запускаем облако до загрузки остальных настроек
        if (typeof initSync === 'function') await initSync();
        if (
            window.syncConfig &&
            window.syncConfig.enabled &&
            !localStorage.getItem('rbi_sync_last_pull_at')
        ) {
            localStorage.setItem('rbi_force_full_pull', '1');
            localStorage.setItem('rbi_cloud_dirty', '1');

            setTimeout(() => {
                if (typeof triggerSync === 'function') triggerSync('manual');
            }, 1500);
        }

        await loadSettings();
        applySettingsToUI();

        // РАДАР ВЫСОТЫ ШАПКИ
        const headerEl = document.getElementById('main-header');
        window.addEventListener('resize', updateBodyPadding);

        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 50 && currentScroll > lastScroll) {
                if (headerEl) headerEl.classList.add('header-collapsed');
            } else if (currentScroll < 50) {
                if (headerEl) headerEl.classList.remove('header-collapsed');
            }
            lastScroll = currentScroll;
        }, { passive: true });

        // ИСПРАВЛЕНИЕ: Правильная загрузка ВСЕХ созданных шаблонов из базы
        // Владение userTemplates — js/services/template.service.js (Реальная
        // изоляция модулей, часть 3, Группа A). Запись идёт через сеттер сервиса,
        // не через bare `userTemplates=`.
        const storedTmpls = await window.RBI.services.storage.getAll(STORES.TEMPLATES);
        if (storedTmpls && storedTmpls.length > 0) {
            const loadedTemplates = {};
            storedTmpls.forEach(t => { loadedTemplates[t.slug] = t.data; });
            window.RBI.services.templates.replaceUserTemplates(loadedTemplates);
        } else {
            window.RBI.services.templates.replaceUserTemplates(
                JSON.parse(localStorage.getItem('rbi_audit_user_templates_ent_v12') || '{}')
            );
        }

        document.dispatchEvent(new CustomEvent('bootstrap:selectorReady'));
        await restoreSession();
        // RBI NEW: мягкий запуск менеджера хранилища
        try {
            if (window.RbiStorageManager) {
                await window.RbiStorageManager.requestPersistentStorageOnce();
                await window.RbiStorageManager.syncFileRegistryFromCloud();

                if (typeof window.RbiStorageManager.backfillLocalFileRegistryCache === 'function') {
                    await window.RbiStorageManager.backfillLocalFileRegistryCache();
                }

                setTimeout(async () => {
                    try {
                        if (
                            window.RbiStorageManager &&
                            typeof window.RbiStorageManager.getStorageSnapshot === 'function' &&
                            typeof window.RbiStorageManager.runAdaptiveStorageCleanup === 'function'
                        ) {
                            const snap = await window.RbiStorageManager.getStorageSnapshot();

                            if (snap && snap.mode && snap.mode !== 'keep_all') {
                                window.RbiStorageManager.runAdaptiveStorageCleanup('app_start');
                            }
                        }
                    } catch (e) {
                        console.warn('[StorageManager] Ошибка мягкой проверки памяти при старте:', e);
                    }
                }, 3000);
            }
        } catch (e) {
            console.warn('[StorageManager] Ошибка запуска:', e);
        }
        // Загрузка фидбека из новой таблицы
        const storedFb = await window.RBI.services.storage.getAll(STORES.FEEDBACK_LIST);
        if (storedFb) window.rbi_feedbackData = storedFb.filter(f => !f._deleted);
        if (typeof rbi_renderFeedbackTab === 'function') rbi_renderFeedbackTab();

        if (!window.currentTemplateKey) {
            document.getElementById('empty-checklist-state').style.display = 'block';
            document.getElementById('audit-items').style.display = 'none';
            document.getElementById('audit-actions').style.display = 'none';
        } else {
            document.getElementById('empty-checklist-state').style.display = 'none';
            document.getElementById('audit-items').style.display = 'block';
            document.getElementById('audit-actions').style.display = 'grid';
            document.dispatchEvent(new CustomEvent('bootstrap:checklistReady'));
        }

        initHorizontalMouseScroll();
        // ОПТИМИЗАЦИЯ: Ленивая загрузка фото через IntersectionObserver и легкий MutationObserver
        // ОПТИМИЗАЦИЯ: Умная ленивая загрузка фото без утечек памяти
        let localImgObserver = null;

        function initImageObserver() {
            if (localImgObserver) localImgObserver.disconnect(); // Убиваем старого наблюдателя, чтобы не текла память

            localImgObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(async entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-local-src');
                        if (src) {
                            observer.unobserve(img); // Перестаем следить после загрузки
                            const realUrl = await PhotoManager.getAsyncUrl(src);
                            if (realUrl) {
                                img.src = realUrl;
                                img.removeAttribute('data-local-src');
                            }
                        }
                    }
                });
            }, { rootMargin: "200px" });
        }

        initImageObserver();

        let imgDebounceTimer = null;
        const domObserver = new MutationObserver((mutations) => {
            let hasNewNodes = false;
            for (let i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) {
                    hasNewNodes = true; break;
                }
            }
            if (hasNewNodes) {
                clearTimeout(imgDebounceTimer);
                imgDebounceTimer = setTimeout(() => {
                    initImageObserver(); // Перезапускаем чистого наблюдателя

                    const imgs = Array.from(document.querySelectorAll(
                        'img[src^="local://"]:not([data-local-src]), img[src^="cloud://"]:not([data-local-src])'
                    )).filter(img => !img.closest('[data-no-observe]'));

                    for (let i = 0; i < imgs.length; i++) {
                        const img = imgs[i];
                        img.setAttribute('data-local-src', img.src);
                        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="100%" height="100%" fill="%23f1f5f9"/></svg>';
                        localImgObserver.observe(img);
                    }
                }, 150);
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
        // <-- ВСТАВКА: Принудительно отрисовываем тумблеры после загрузки всех данных
        setTimeout(() => {
            if (typeof renderSettingsTab === 'function') renderSettingsTab();
        }, 500);
    } catch (error) { console.error("Ошибка при загрузке:", error); }
});

// rbiBlockAndroidPullToRefreshOnly — перенесена в js/shared/touch-gestures.utils.js

/* ============================================================================ */
/* БЛОК 20 — Engineer Module: fallback-регистрация (legacy-заглушка)            */
/* Если ES-модуль engineer.module.js не загрузился — регистрируем заглушку.     */
/* ES-модуль перезапишет её при загрузке (_isLegacyStub будет отсутствовать).   */
/* ============================================================================ */
(function () {
  if (typeof window === 'undefined') return;
  if (!window.RBI || !window.RBI.registry) return;
  if (window.RBI.registry.has('module.engineer')) return;

  window.RBI.registry.register('module.engineer', {
    id: 'engineer',
    _isLegacyStub: true,
    routes: ['/engineer', '/engineer/:subTab'],
    dependencies: ['storage', 'tasks', 'game', 'analytics'],
    init: function () {},
    mount: function () {
      if (window.EngineerActions && typeof window.EngineerActions.renderEngineerTab === 'function') {
        window.EngineerActions.renderEngineerTab();
      } else if (typeof window.rbi_renderEngineerTab === 'function') {
        window.rbi_renderEngineerTab();
      }
    },
    unmount: function () {}
  });
})();
