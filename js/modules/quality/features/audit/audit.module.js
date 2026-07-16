// ─── audit.module.js — Фаза 14: контракт платформы для модуля Аудит ─────────
// ES-модуль. Зависит от audit.state.js / audit.actions.js / audit.render.js,
// которые загружаются раньше через <script> (не ES-import).

import './audit.state.js';
import './audit.actions.js';
import './audit.render.js';

var _listeners = [];

function on(target, event, handler) {
  target.addEventListener(event, handler);
  _listeners.push({ target: target, event: event, handler: handler });
}

function off() {
  _listeners.forEach(function (l) {
    l.target.removeEventListener(l.event, l.handler);
  });
  _listeners = [];
}

// Подписки на верхнем уровне модуля (не внутри init()): bootstrap.js эмитит эти
// события во время DOMContentLoaded, значительно раньше, чем AuditModule.init()
// вызывается через app.entry.js (на событии load) — слушатель должен быть готов
// уже к моменту исполнения этого файла (ES-модуль, script type="module").
document.addEventListener('bootstrap:selectorReady', function () {
  if (window.AuditRender) {
    window.AuditRender.renderSelector();
  }
});

document.addEventListener('bootstrap:checklistReady', function () {
  if (window.AuditRender) {
    window.AuditRender.render();
  }
});

// Паттерн делегирования событий для инициативы «Разбор inline onclick/onchange»
// (см. _ai/INDEX_HTML_HANDLERS_MAP.md), namespace-per-module по прецеденту
// settings.module.js/knowledge.module.js — отдельный атрибут data-audit-action
// (не data-action, используемый ai.module.js).
function bindAuditActionDelegation() {
  if (window.__auditActionDelegationBound) return;
  window.__auditActionDelegationBound = true;

  var readArg = function (el, valType, evt) {
    switch (valType) {
      case 'element': return el;
      case 'event': return evt;
      case 'checked': return el.checked;
      case 'int': return parseInt(el.value, 10);
      case 'value': return el.value;
      default: return undefined;
    }
  };

  var dispatch = function (el, evt) {
    var action = el.dataset.auditAction;
    var fn = window[action];
    if (typeof fn !== 'function') return;
    var valType = el.dataset.auditActionValType;
    var arg = valType ? readArg(el, valType, evt) : el.dataset.actionArg;
    if (arg === undefined) {
      fn();
    } else {
      fn(arg);
    }
  };

  var resolveActionElement = function (target, wantsChange) {
    var el = target;
    while (el && el.nodeType === 1) {
      if (el.dataset && el.dataset.auditAction) {
        if (!!(el.dataset.actionEvent === 'change') === wantsChange) return el;
      }
      var inlineOnclick = el.getAttribute && el.getAttribute('onclick');
      if (!wantsChange && inlineOnclick && inlineOnclick.includes('stopPropagation')) return null;
      el = el.parentElement;
    }
    return null;
  };

  document.addEventListener('click', function (e) {
    var el = resolveActionElement(e.target, false);
    if (el) dispatch(el, e);
  }, true);

  document.addEventListener('change', function (e) {
    var el = resolveActionElement(e.target, true);
    if (el) dispatch(el, e);
  }, true);
}

var AuditModule = {
  id: 'audit',
  routes: ['/audit', '/audit/:id'],
  dependencies: ['storage', 'inspections'],

  init: function (ctx) {
    // Синхронизация AuditState с уже живущими window.* объектами из app.js.
    // Геттеры в audit.state.js читают window.* по ссылке — дополнительная
    // синхронизация нужна только если нужно убедиться, что объекты уже есть.
    if (!window.state)   window.state   = {};
    if (!window.details) window.details = {};
    if (!window.photos)  window.photos  = {};

    // Подключить SessionService через ctx
    ctx.session = window.RBI && window.RBI.services && window.RBI.services.session
      ? window.RBI.services.session
      : null;

    ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
    ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
    ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
    if (window.AuditActions) window.AuditActions.bindCtx(ctx);
    if (window.AuditState) window.AuditState.bindCtx(ctx);

    bindAuditActionDelegation();

    // sync:completed → автосохранение сеанса
    on(document, 'sync:completed', function () {
      if (window.AuditActions) {
        window.AuditActions.scheduleSessionSave();
      }
    });

    // inspection:created → обновить рендер
    on(document, 'inspection:created', function (e) {
      if (window.AuditRender) {
        window.AuditRender.updateUI();
      }
    });

    // sharedPhotoEditor:photoSaved → обычное (не defect_fix) фото сохранено в редакторе
    on(document, 'sharedPhotoEditor:photoSaved', function (e) {
      var photoId = e.detail && e.detail.photoId;
      if (window.AuditRender) {
        window.AuditRender.updateCardDOM(photoId);
      }
      if (window.AuditActions) {
        window.AuditActions.scheduleSessionSave();
      }
    });

    // sharedSmartInput:locationUpdated → структурированный адрес обновил локацию
    on(document, 'sharedSmartInput:locationUpdated', function () {
      if (window.AuditRender) {
        window.AuditRender.updateUI();
      }
    });

    document.dispatchEvent(new CustomEvent('audit:initialized'));
    document.dispatchEvent(new CustomEvent('session:initialized'));
    console.log('[RBI Module] audit.module initialized');
  },

  mount: function (container, ctx) {
    if (window.AuditRender) {
      window.AuditRender.render();
    }
  },

  unmount: function () {
    off();
  }
};

// Регистрация: перезапишет legacy stub, зарегистрированный в audit.legacy.js
if (window.RBI && window.RBI.registry) {
  window.RBI.registry.register('module.audit', AuditModule);
} else {
  document.addEventListener('rbi:ready', function () {
    if (window.RBI && window.RBI.registry) {
      window.RBI.registry.register('module.audit', AuditModule);
    }
  }, { once: true });
}

window.AuditModule = AuditModule;
export default AuditModule;
