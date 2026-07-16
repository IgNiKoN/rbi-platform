/* Файл: js/services/masterData.service.js */
/* Master Data Service v0.1 — агрегатор мастер-данных */
/* Единая точка доступа к SYSTEM_TEMPLATES, SYSTEM_DOCS, SYSTEM_NODES, SYSTEM_TWI, FAQ_DATA */
/* Паттерн ленивых ссылок: каждый геттер читает актуальное значение window.* в момент вызова */

(function () {
    'use strict';

    if (typeof window === 'undefined') { return; }

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    window.RBI.services.masterData = {

        /* ── Шаблоны проверок ── */

        getSystemTemplates: function () {
            return (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
        },

        getUserTemplates: function () {
            return (window.userTemplates && typeof window.userTemplates === 'object') ? window.userTemplates : {};
        },

        getTemplateByKey: function (key) {
            var sys = (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
            if (sys[key] !== undefined) { return sys[key]; }
            var user = (window.userTemplates && typeof window.userTemplates === 'object') ? window.userTemplates : {};
            return user[key] !== undefined ? user[key] : null;
        },

        /* ── База знаний — системные данные ── */

        getSystemDocs: function () {
            return Array.isArray(window.SYSTEM_DOCS) ? window.SYSTEM_DOCS : [];
        },

        getSystemNodes: function () {
            return Array.isArray(window.SYSTEM_NODES) ? window.SYSTEM_NODES : [];
        },

        getSystemTwi: function () {
            return Array.isArray(window.SYSTEM_TWI) ? window.SYSTEM_TWI : [];
        },

        /* ── FAQ ── */

        getFaq: function () {
            return Array.isArray(window.FAQ_DATA) ? window.FAQ_DATA : [];
        },

        /* ── Справочники (делегирует в существующие сервисы) ── */

        getObjects: function () {
            if (window.RBI && window.RBI.services && window.RBI.services.objects &&
                    typeof window.RBI.services.objects.getAll === 'function') {
                return window.RBI.services.objects.getAll();
            }
            if (window.ObjectDirectory && Array.isArray(window.ObjectDirectory.objects)) {
                return window.ObjectDirectory.objects;
            }
            return [];
        },

        getContractors: function () {
            if (window.RBI && window.RBI.services && window.RBI.services.contractors &&
                    typeof window.RBI.services.contractors.getAll === 'function') {
                return window.RBI.services.contractors.getAll();
            }
            if (window.ContractorDirectory && Array.isArray(window.ContractorDirectory.contractors)) {
                return window.ContractorDirectory.contractors;
            }
            return [];
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.masterData', window.RBI.services.masterData);
    }

    console.log('[RBI Service] masterData loaded');
}());
