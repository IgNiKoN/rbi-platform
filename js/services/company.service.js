// company.service.js — Minimal Company Context (§29, п.11)
//
// Read-only сервис данных о компании. Единственная существующая
// компания (single-tenant) — не multi-tenant engine, не матрица прав,
// без UI. enabledModules — статический список текущих platform-модулей
// (дублирует MODULE_KEYS из js/core/app.entry.js, изменяется редко).

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var ENABLED_MODULES = ['quality', 'sk', 'settings', 'knowledge', 'construction', 'game', 'ai'];

  var CompanyService = {
    getCompany: function () {
      return {
        id: 'rbi',
        name: 'RBI',
        enabledModules: ENABLED_MODULES.slice()
      };
    }
  };

  window.RBI = window.RBI || {};
  window.RBI.services = window.RBI.services || {};
  window.RBI.services.company = CompanyService;
  if (window.RBI.registry && window.RBI.registry.register) {
    window.RBI.registry.register('service.company', CompanyService);
  }

  console.log('[CompanyService] company.service.js loaded');
}());
