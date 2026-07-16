// app-shell.js — App Shell, Шаг 1 (§29, п.9): формализация существующей оболочки.
//
// ShellService — тонкие обёртки над уже существующими DOM-точками App Shell.
// Не переносит логику из views.js/app-mode-utils.js/layout.utils.js/notify.utils.js —
// только читает те же DOM-узлы / делегирует в существующие глобальные функции.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var SELECTED_MODULES_KEY = 'rbi_selected_business_modules';
  var BUSINESS_MODULES = [
    { id: 'quality', label: 'Качество' },
    { id: 'construction', label: 'Стройконтроль' }
  ];
  var PLACEHOLDER_MODULES = [
    { id: 'safety', label: 'Безопасность' },
    { id: 'warranty', label: 'Гарантия' },
    { id: 'tender', label: 'Тендерный отдел' },
    { id: 'standards', label: 'Стандарты (тех. решения)' },
    { id: 'schedule', label: 'Сроки' },
    { id: 'budget', label: 'Бюджет' }
  ];
  var pendingModuleSelection = null;

  function defaultBusinessModuleIds() {
    return BUSINESS_MODULES.map(function (m) { return m.id; });
  }

  function isValidBusinessModuleId(id) {
    return BUSINESS_MODULES.some(function (m) { return m.id === id; });
  }

  // Реальный список бизнес-модулей, разрешённых текущей роли (§29 п.10в) —
  // читает permission.service.js, fallback на весь список BUSINESS_MODULES,
  // если сервис недоступен (не должно происходить в норме).
  function getRoleAllowedBusinessModuleIds() {
    if (window.RBI && window.RBI.services && window.RBI.services.permissions &&
      typeof window.RBI.services.permissions.getAllowedModules === 'function') {
      return window.RBI.services.permissions.getAllowedModules();
    }
    return defaultBusinessModuleIds();
  }

  var ShellService = {
    getContentRoot: function () {
      return document.getElementById('app-content');
    },
    getModalsRoot: function () {
      return document.getElementById('app-modals');
    },
    getHeaderEl: function () {
      return document.getElementById('main-header');
    },
    getBottomNavEl: function () {
      return document.getElementById('main-bottom-nav');
    },
    showToast: function (message) {
      if (typeof window.showToast === 'function') {
        return window.showToast(message);
      }
    },
    isOnline: function () {
      return navigator.onLine;
    },
    onOnlineStatusChange: function (handler) {
      if (typeof handler !== 'function') return;
      window.addEventListener('online', function () { handler(true); });
      window.addEventListener('offline', function () { handler(false); });
    },
    getSyncStatusEl: function () {
      return document.getElementById('header-sync-status');
    },
    getUserBlockEl: function () {
      return document.getElementById('header-user-block');
    },
    renderUserBlock: function (userContext) {
      var el = this.getUserBlockEl();
      if (!el || !userContext) return;
      el.textContent = userContext.name + ' \u00b7 ' + userContext.role;
    },
    renderCompanyBlock: function () {
      var header = this.getHeaderEl();
      var el = document.getElementById('header-company-block');
      if (!header || !el) return;
      var company = (window.RBI.services.company && typeof window.RBI.services.company.getCompany === 'function')
        ? window.RBI.services.company.getCompany()
        : null;
      if (!company) return;

      var syncEl = this.getSyncStatusEl();
      var online = this.isOnline();
      var suffix = online ? '' : ' \u00b7 \u043e\u0444\u043b\u0430\u0439\u043d';
      el.textContent = company.name + suffix;
      if (syncEl) el.dataset.hasSyncIndicator = '1';
    },
    shouldShowAuthGate: function () {
      return !localStorage.getItem('rbi_auth_gate_seen');
    },
    showAuthGate: function () {
      var el = document.getElementById('auth-gate-overlay');
      if (el) el.classList.remove('hidden');
    },
    hideAuthGate: function () {
      var el = document.getElementById('auth-gate-overlay');
      if (el) el.classList.add('hidden');
      localStorage.setItem('rbi_auth_gate_seen', '1');
    },
    showPlatformEntry: function () {
      var el = document.getElementById('platform-entry-modal');
      if (el) el.classList.remove('hidden');
      this.renderModuleSelection();
    },
    hidePlatformEntry: function () {
      var el = document.getElementById('platform-entry-modal');
      if (el) el.classList.add('hidden');
    },
    getSelectedModules: function () {
      var raw = localStorage.getItem(SELECTED_MODULES_KEY);
      if (!raw) return defaultBusinessModuleIds();
      try {
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return defaultBusinessModuleIds();
        var filtered = parsed.filter(isValidBusinessModuleId);
        return filtered.length > 0 ? filtered : defaultBusinessModuleIds();
      } catch (e) {
        return defaultBusinessModuleIds();
      }
    },
    setSelectedModules: function (ids) {
      var valid = (Array.isArray(ids) ? ids : []).filter(isValidBusinessModuleId);
      if (valid.length === 0) valid = defaultBusinessModuleIds();
      localStorage.setItem(SELECTED_MODULES_KEY, JSON.stringify(valid));
      this._updateModeSelectorOptions(valid);
      return valid;
    },
    // Sidebar icon-rail (App Shell, §29 п.9, вариант A) — вертикальный список иконок
    // переключения бизнес-модуля, видим только на ПК (>=768px, см. css/style.css).
    // Переиспользует те же данные, что renderModuleSelection(), другой рендер
    // (иконки+подпись, не grid карточек), 0 новой бизнес-логики переключения —
    // клик делегирует в существующую window.changeAppMode(id).
    renderSidebar: function () {
      var container = document.getElementById('app-sidebar');
      if (!container) return;

      var selected = this.getSelectedModules();
      var roleAllowedIds = getRoleAllowedBusinessModuleIds();
      var currentMode = (window.AppModeManager && window.AppModeManager.currentMode) || null;

      var icons = {
        quality: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>',
        construction: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>'
      };

      var html = '';
      BUSINESS_MODULES.forEach(function (mod) {
        if (roleAllowedIds.indexOf(mod.id) === -1) return;
        if (selected.indexOf(mod.id) === -1) return;
        var isActive = currentMode === mod.id;
        html += '<button type="button" data-sidebar-module-id="' + mod.id + '"' +
          ' onclick="window.changeAppMode(\'' + mod.id + '\')"' +
          ' class="app-sidebar-item' + (isActive ? ' active' : '') + '" title="' + mod.label + '">' +
          '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">' + icons[mod.id] + '</svg>' +
          '<span class="app-sidebar-item-label">' + mod.label + '</span>' +
          '</button>';
      });
      PLACEHOLDER_MODULES.forEach(function (mod) {
        html += '<button type="button" data-shell-action="showPlaceholderModule" data-shell-action-arg="' + mod.id + '"' +
          ' class="app-sidebar-item app-sidebar-item--placeholder" title="' + mod.label + ' \u2014 \u0432 \u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0435">' +
          '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><circle cx="12" cy="12" r="9"></circle></svg>' +
          '<span class="app-sidebar-item-label">' + mod.label + '</span>' +
          '</button>';
      });
      container.innerHTML = html;
    },
    renderModuleSelection: function () {
      var container = document.getElementById('platform-entry-modules');
      if (!container) return;

      var selected = pendingModuleSelection || this.getSelectedModules();
      pendingModuleSelection = selected.slice();
      var roleAllowedIds = getRoleAllowedBusinessModuleIds();

      var html = '';
      BUSINESS_MODULES.forEach(function (mod) {
        if (roleAllowedIds.indexOf(mod.id) === -1) {
          html += '<div class="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase text-center text-slate-400 dark:text-slate-500">' +
            mod.label + '</div>';
          return;
        }
        var isActive = selected.indexOf(mod.id) !== -1;
        html += '<button type="button" data-module-id="' + mod.id + '" onclick="window.RBI.services.shell.toggleModuleSelection(\'' + mod.id + '\')"' +
          ' class="platform-entry-card p-3 rounded-xl border text-[11px] font-bold uppercase text-center transition-colors ' +
          (isActive
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700') +
          '">' + mod.label + '</button>';
      });
      PLACEHOLDER_MODULES.forEach(function (mod) {
        html += '<div class="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase text-center text-slate-400 dark:text-slate-500 relative">' +
          mod.label +
          '<span class="block mt-1 text-[8px] font-black text-indigo-400 normal-case">Скоро</span></div>';
      });
      container.innerHTML = html;
    },
    toggleModuleSelection: function (moduleId) {
      if (!isValidBusinessModuleId(moduleId)) return;
      if (getRoleAllowedBusinessModuleIds().indexOf(moduleId) === -1) return;
      var current = pendingModuleSelection || this.getSelectedModules();
      var idx = current.indexOf(moduleId);
      if (idx !== -1) {
        if (current.length <= 1) return;
        current.splice(idx, 1);
      } else {
        current.push(moduleId);
      }
      pendingModuleSelection = current;
      this.renderModuleSelection();
    },
    applyModuleSelection: function () {
      var selection = pendingModuleSelection || this.getSelectedModules();
      this.setSelectedModules(selection);
      this.hidePlatformEntry();
      this.renderSidebar();
    },
    // Клик по disabled-разделу sidebar (§29 п.9, PLACEHOLDER_MODULES) — единая
    // заглушка "модуль не разработан" (js/core/views.js#showModePlaceholder),
    // без переключения AppModeManager.currentMode (см. rbi_showSidebarPlaceholder).
    showPlaceholderModule: function (moduleId) {
      if (typeof window.rbi_showSidebarPlaceholder === 'function') {
        window.rbi_showSidebarPlaceholder(moduleId);
      }
    },
    _updateModeSelectorOptions: function (selectedIds) {
      var select = document.getElementById('app-mode-selector');
      var container = document.getElementById('app-mode-selector-container');
      if (!select) return;

      var labels = { quality: 'Качество', construction: 'Стройконтроль' };
      var currentValue = select.value;
      select.innerHTML = '';
      selectedIds.forEach(function (id) {
        var opt = document.createElement('option');
        opt.value = id;
        opt.textContent = labels[id] || id;
        select.appendChild(opt);
      });

      if (selectedIds.indexOf(currentValue) !== -1) {
        select.value = currentValue;
      } else {
        select.value = selectedIds[0];
      }

      if (container) {
        container.style.display = selectedIds.length > 1 ? 'flex' : 'none';
      }
    },
    submitAuthGateConnect: function () {
      var self = this;
      function copyField(gateId, targetId) {
        var gateEl = document.getElementById(gateId);
        var targetEl = document.getElementById(targetId);
        if (!targetEl) {
          targetEl = document.createElement('input');
          targetEl.type = 'hidden';
          targetEl.id = targetId;
          document.body.appendChild(targetEl);
        }
        targetEl.value = gateEl ? gateEl.value : '';
      }
      copyField('gate-sync-name', 'sync-name');
      copyField('gate-sync-code', 'sync-code');
      copyField('gate-sync-pin', 'sync-pin');

      if (typeof window.initCloudConnection !== 'function') return;
      var result = window.initCloudConnection();
      if (result && typeof result.then === 'function') {
        result.then(function () { self.hideAuthGate(); }).catch(function () { self.hideAuthGate(); });
      } else {
        self.hideAuthGate();
      }
    },
  };

  window.RBI = window.RBI || {};
  window.RBI.services = window.RBI.services || {};
  window.RBI.services.shell = ShellService;
  if (window.RBI.registry && window.RBI.registry.register) {
    window.RBI.registry.register('core.shell', ShellService);
  }

  // Паттерн делегирования событий для инициативы «Разбор inline onclick/onchange»
  // (см. _ai/INDEX_HTML_HANDLERS_MAP.md), namespace-per-module (data-shell-action).
  // Действия — методы window.RBI.services.shell, кроме checkForUpdates (bare window.*).
  // Файл сам себя инициализирует (IIFE) — биндится сразу здесь, без отдельного init(ctx).
  function bindShellActionDelegation() {
    if (window.__shellActionDelegationBound) return;
    window.__shellActionDelegationBound = true;

    var dispatch = function (el) {
      var action = el.dataset.shellAction;
      var fn = ShellService[action] || window[action];
      if (typeof fn !== 'function') return;
      var thisArg = ShellService[action] ? ShellService : window;
      var arg = el.dataset.shellActionArg;
      if (arg !== undefined) fn.call(thisArg, arg);
      else fn.call(thisArg);
    };

    var resolveActionElement = function (target) {
      var el = target;
      while (el && el.nodeType === 1) {
        if (el.dataset && el.dataset.shellAction) return el;
        var inlineOnclick = el.getAttribute && el.getAttribute('onclick');
        if (inlineOnclick && inlineOnclick.includes('stopPropagation')) return null;
        el = el.parentElement;
      }
      return null;
    };

    document.addEventListener('click', function (e) {
      var el = resolveActionElement(e.target);
      if (el) dispatch(el);
    }, true);
  }
  bindShellActionDelegation();
  ShellService.renderSidebar();

  console.log('[ShellService] app-shell.js loaded');
}());
