/**
 * reports.render.js — Фаза 16: рендер-диспетчер модуля Reports.
 *
 * Делегирует рендер в window.*-функции из export.js (legacy-монолит).
 * При отсутствии legacy-функции — console.warn (не бросает исключений).
 *
 * Примечание (Фаза физического переноса G5): `renderPdfTemplatesList` и
 * `closePdfTemplateModal` физически перенесены в `reports.actions.js`
 * (рядом с состоянием конструктора PDF-шаблонов — `sortableAvailable`,
 * `sortableActive`, `window.userReportTemplates`) и импортируются сюда
 * напрямую как обычные ES-функции — находка №3 (объявление без `window.` в
 * classic-script контексте) частично устранена для `renderPdfTemplatesList`
 * этим блоком; `renderReportFromTemplate` остаётся нерешённой до переноса G6.
 */

import { renderPdfTemplatesList, closePdfTemplateModal } from './reports.actions.js';

export const ReportsRender = {

    /**
     * Отрисовка списка шаблонов PDF — вызывает internal-функцию
     * renderPdfTemplatesList() из reports.actions.js.
     */
    renderTemplatesList() {
        renderPdfTemplatesList();
    },

    /**
     * Открытие модального окна шаблона — делегирует в window.openReportTemplateModal(type, mode).
     */
    openModal(type, mode) {
        if (typeof window.openReportTemplateModal === 'function') {
            window.openReportTemplateModal(type, mode);
        } else if (window.ReportsActions && typeof window.ReportsActions.openTemplateModal === 'function') {
            window.ReportsActions.openTemplateModal(type, mode);
        } else {
            console.warn('[ReportsRender] openReportTemplateModal / ReportsActions.openTemplateModal недоступен');
        }
    },

    /**
     * Закрытие модального окна конструктора PDF-шаблонов.
     * Перенесено из export.js:closePdfTemplateModal (группа G5).
     */
    closeModal() {
        closePdfTemplateModal();
    },

    /**
     * Рендер отчёта из шаблона — делегирует в window.renderReportFromTemplate(templateId, data).
     */
    renderFromTemplate(templateId, data) {
        if (typeof window.renderReportFromTemplate === 'function') {
            window.renderReportFromTemplate(templateId, data);
        } else {
            console.warn('[ReportsRender] renderReportFromTemplate недоступен');
        }
    }
};

if (typeof window !== 'undefined') {
    window.ReportsRender = ReportsRender;
}

console.log('[ReportsRender] reports.render.js loaded');
