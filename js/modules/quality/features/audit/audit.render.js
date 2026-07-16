// ─── audit.render.js — Фаза 15: рендер вкладки «Аудит» (owner-module) ───────
// Реализация перенесена из audit.legacy.js. Источник данных — AuditState.*
// (window.state/.details/.photos/.currentTemplateKey/.currentChecklist по
// ссылке). Остальные глобалы (app.js) используются как есть (bare identifiers).

import { AuditActions } from './audit.actions.js';

(function () {
  'use strict';

  // Фаза 50-B (перенесено из audit.legacy.js): единая точка доступа к
  // настройкам через SettingsService с fallback. Нужна локально в render.js,
  // т.к. render.js и actions.js — независимые ES-модули; используют общий
  // `_ctx`, полученный через импорт `AuditActions`.
  function _getSetting(key) {
    if (AuditActions._ctx && AuditActions._ctx.settings) return AuditActions._ctx.settings.get(key);
    return window.RBI.services.settings.get(key);
  }

  function _getTwiCards() {
    if (AuditActions._ctx && AuditActions._ctx.knowledge) {
      return AuditActions._ctx.knowledge.getTwiCardsSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
      return window.RBI.services.knowledge.getTwiCardsSync();
    }
    return Array.isArray(window.customTwiCards) ? window.customTwiCards : [];
  }

  // Единая точка доступа к window.HistoryState.allRecords (без фоллбэка на
  // contractorArray — сервисный getAllSync() фоллбэкает шире, поэтому здесь
  // сохраняется точная копия текущей узкой логики updateDashboard()).
  function _getAllInspections() {
    return (window.HistoryState && window.HistoryState.allRecords) || [];
  }

  function _templates() {
    if (AuditActions._ctx && AuditActions._ctx.templates) {
      return AuditActions._ctx.templates;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.templates) {
      return window.RBI.services.templates;
    }
    return {
      getUserTemplates: function () {
        return typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
      },
      getSystemTemplates: function () {
        return typeof SYSTEM_TEMPLATES !== 'undefined' ? SYSTEM_TEMPLATES : {};
      }
    };
  }

  // Единая точка доступа к window.contractorArray (без HistoryState-фоллбэка
  // — сохраняет ровно текущую семантику showContractorDetails()).
  function _getContractorArray() {
    return Array.isArray(window.contractorArray) ? window.contractorArray : [];
  }

  // Константа причин дефектов (перенесено из audit.legacy.js, копия из app.js).
  // window._AUDIT_DEFECT_CAUSES сохранён для обратной совместимости
  // (читается в audit.actions.js: toggleCommentField/saveCommentModal).
  var _AUDIT_DEFECT_CAUSES = [
    { code: 'C01', name: 'Нарушение технологии (ППР)', group: 'Технология' },
    { code: 'C02', name: 'Отклонение от проекта/РД', group: 'Проект' },
    { code: 'C03', name: 'Некачественный материал', group: 'Материалы' },
    { code: 'C04', name: 'Низкая квалификация рабочих', group: 'Персонал' },
    { code: 'C05', name: 'Отсутствие контроля (ИТР)', group: 'Организация' },
    { code: 'C06', name: 'Спешка / Нарушение сроков', group: 'Организация' },
    { code: 'C07', name: 'Погодные условия', group: 'Внешние факторы' },
    { code: 'C00', name: 'Иное (указать в комментарии)', group: 'Другое' }
  ];
  window._AUDIT_DEFECT_CAUSES = _AUDIT_DEFECT_CAUSES;
  // Алиас для внешних потребителей (app.js legacy-имя): ai.actions.js,
  // reports.actions.js, game.actions.js, analytics.*.js — бареные/typeof-guarded
  // обращения к DEFECT_CAUSES продолжают резолвиться через этот же массив.
  window.DEFECT_CAUSES = _AUDIT_DEFECT_CAUSES;

  // Звуковые эффекты (base64 для офлайна) — перенесено из js/app.js, module-приватные
  // (единственный потребитель — audioOk.play()/audioFail.play() ниже в этом файле).
  const audioOk = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
  const audioFail = new Audio("data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
  // (В реале сюда можно вставить короткие base64 писки, сейчас они просто заглушки, чтобы не было ошибки)

  // =====================================================================
  // СВАЙПЫ (УМНАЯ ЛОГИКА И ПЛАВНОСТЬ iOS)
  // Перенесено из app.js (было app.js:708-779). Единственный вызывающий —
  // AuditRender.render() (см. ниже) — теперь в этом же файле, поэтому
  // функция остаётся module-приватной (без window.*).
  // =====================================================================
  function initSwipes() {
    const container = document.getElementById('audit-items');
    let startX = 0, currentX = 0, isDragging = false, currentCard = null, content = null;
    let bgOk = null, bgFail = null;

    container.addEventListener('touchstart', (e) => {
      if (!_getSetting('swipeEnabled')) return;
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
      if (bgOk) bgOk.style.opacity = '0';
      if (bgFail) bgFail.style.opacity = '0';
    }, { passive: true });

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
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      if (!isDragging || !currentCard || !content) return;
      isDragging = false;
      currentCard.classList.remove('swiping');

      const diff = currentX - startX;
      const id = parseInt(currentCard.dataset.id);

      // Возвращаем карточку на место
      content.style.transform = `translateX(0)`;
      if (bgOk) bgOk.style.opacity = '0';
      if (bgFail) bgFail.style.opacity = '0';

      // Отложенное срабатывание (ждем пока карточка визуально отскочит)
      if (diff > 80) {
        setTimeout(() => window.toggleOk(id), 150);
      } else if (diff < -80) {
        setTimeout(() => window.toggleFail(id), 150);
      }

      currentCard = null; content = null; bgOk = null; bgFail = null;
    });
  }

  var AuditRender = {

    // =====================================================================
    // РАЗМЕТКА ВКЛАДКИ «ОСМОТР» (перенос из index.html:433-605, JS-рендер)
    // Возвращает HTML-строку 1:1 идентичную прежней статичной разметке
    // #tab-audit (welcome-блок + пустые контейнеры #audit-items/#audit-actions
    // + скрытый #fake-checklist-selector). Заполнение контейнеров — задача
    // render()/renderSelector() ниже, не этой функции.
    // =====================================================================
    renderMarkup: function () {
      return `
        <div id="tab-audit" class="view-section active">
            <!-- Пустое состояние (Оригинальный дизайн, компактная версия) -->
            <div id="empty-checklist-state"
                class="py-3 ios-panel border border-slate-200/50 dark:border-slate-700/50 rounded-[22px] shadow-sm mb-3 mt-1 mx-1 overflow-hidden">

                <div class="px-4 text-center">
                    <div
                        class="w-11 h-11 mx-auto bg-indigo-50 dark:bg-indigo-900/30 rounded-[16px] flex items-center justify-center mb-2 border border-indigo-100 dark:border-indigo-800 shadow-sm">
                        <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"></path>
                            <path d="M9 12l2 2 4-4"></path>
                        </svg>
                    </div>

                    <div
                        class="text-[14px] font-black uppercase tracking-tight text-slate-800 dark:text-white leading-tight">
                        Добро пожаловать
                    </div>

                    <div class="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                        Выберите режим старта работы
                    </div>
                </div>

                <div class="px-3 mt-3 space-y-2">

                    <!-- ДЕМО -->
                    <button data-settings-action="startDemoMode"
                        class="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[18px] p-3 shadow-sm active:scale-[0.98] transition-all flex gap-3 items-center">
                        <div
                            class="w-9 h-9 rounded-[14px] bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14"></path>
                                <rect x="3" y="6" width="12" height="12" rx="3"></rect>
                                <path d="M7 10h4"></path>
                                <path d="M7 14h2"></path>
                            </svg>
                        </div>

                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <div
                                    class="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                    Демо-режим
                                </div>
                                <span
                                    class="text-[7px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-md dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300">
                                    безопасно
                                </span>
                            </div>
                            <div class="text-[9.5px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                Тестовые данные. Можно нажимать всё — рабочая база не меняется.
                            </div>
                        </div>

                        <svg class="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>

                    <!-- ОБУЧЕНИЕ -->
                    <button data-settings-action="startInteractiveTutorial"
                        class="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[18px] p-3 shadow-sm active:scale-[0.98] transition-all flex gap-3 items-center">
                        <div
                            class="w-9 h-9 rounded-[14px] bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M12 4h9"></path>
                                <path d="M4 9l2 2 4-4"></path>
                                <path d="M4 17l2 2 4-4"></path>
                            </svg>
                        </div>

                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <div
                                    class="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                    Обучение
                                </div>
                                <span
                                    class="text-[7px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-md dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300">
                                    Интерактивный тур
                                </span>
                            </div>
                            <div class="text-[9.5px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                Пошаговый маршрут по осмотрам, задачам, TWI, ПК СК и аналитике.
                            </div>
                        </div>

                        <svg class="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>

                    <!-- FAQ / AI -->
                    <button data-knowledge-action="openFaqModal"
                        class="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[18px] p-3 shadow-sm active:scale-[0.98] transition-all flex gap-3 items-center">
                        <div
                            class="w-9 h-9 rounded-[14px] bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 6v12"></path>
                                <path d="M5 8a4 4 0 014-4h11v14H9a4 4 0 00-4 4V8z"></path>
                                <path d="M5 8a4 4 0 00-4 4v10"></path>
                            </svg>
                        </div>

                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <div
                                    class="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                    FAQ / ИИ-помощник
                                </div>
                                <span
                                    class="text-[7px] font-black uppercase bg-violet-50 text-violet-600 border border-violet-100 px-1.5 py-0.5 rounded-md dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-300">
                                    offline + AI
                                </span>
                            </div>
                            <div class="text-[9.5px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                После первой синхронизации база доступна офлайн, при интернете отвечает ИИ.
                            </div>
                        </div>

                        <svg class="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>

                    <!-- НАЧАТЬ ПРОВЕРКУ -->
                    <div class="relative pt-1">
                        <div
                            class="w-full bg-indigo-600 text-white py-3 rounded-[18px] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 5v14"></path>
                                <path d="M5 12h14"></path>
                            </svg>
                            Начать проверку
                        </div>
                        <select id="fake-checklist-selector"
                            data-audit-action="changeTemplate" data-audit-action-val-type="value" data-action-event="change"
                            class="absolute inset-x-0 bottom-0 w-full h-11 opacity-0 cursor-pointer">
                            <option value="" disabled selected>Выбрать чек-лист</option>
                            <optgroup label="Системные" id="fake-system-group"></optgroup>
                            <optgroup label="Загруженные" id="fake-user-group"></optgroup>
                        </select>
                    </div>

                    <div class="px-2 pt-0.5 text-[9px] text-slate-400 dark:text-slate-500 leading-snug text-center">
                        Обучение — для первого входа · Демо — для тестов · FAQ — для вопросов по работе
                    </div>
                </div>
            </div>

            <!-- НОВОЕ: Горизонтальная навигация по группам -->
            <div id="audit-items"></div>

            <!-- Возвращаем кнопки действий -->
            <div class="grid grid-cols-2 gap-3 mt-8 mb-4" id="audit-actions" style="display:none;">
                <button data-audit-action="saveProductToArray" data-requires-create="true"
                    class="bg-indigo-600 text-white rounded-xl py-4 font-black text-xs uppercase shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95 transition-transform">
                    Сохранить в Историю</button>
                <button data-audit-action="resetChecklist"
                    class="bg-red-50 text-red-600 border border-red-200 rounded-xl py-4 font-black text-xs uppercase active:scale-95 transition-transform">
                    Очистить форму</button>
            </div>
        </div>`;
    },

    // =====================================================================
    // РЕНДЕР ЧЕКЛИСТА
    // Перенесено из audit.legacy.js (было в app.js, строка 2866).
    // =====================================================================
    render: function () {
      if (!AuditState.currentTemplateKey) return;
      var root = document.getElementById('audit-items');
      var navRoot = document.getElementById('audit-group-nav');
      if (!root) return;

      var html = ""; var navHtml = "";

      AuditState.currentChecklist.forEach(function (g, gIndex) {
        navHtml += `<button id="nav-btn-${gIndex}" onclick="scrollToGroup(${gIndex})" class="inline-block px-3 py-1.5 min-w-fit text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95 shrink-0">${g.group || g.title}</button>`;

        var isCollapsed = _getSetting('defaultGroupsCollapsed');
        var arrow = isCollapsed ? '▶' : '▼';
        var displayStyle = isCollapsed ? 'display: none;' : 'display: block;';

        html += `<div class="block-title flex justify-between items-center cursor-pointer select-none rounded-lg px-2 mt-4" onclick="toggleGroup(${gIndex})">
            <span id="group-title-${gIndex}">${arrow} ${g.group || g.title}</span>
            <span id="group-counter-${gIndex}" class="text-[10px] bg-[var(--card-border)] px-2 py-0.5 rounded text-[var(--text-muted)]">0/${g.items.length}</span>
        </div><div id="group_content_${gIndex}" class="transition-all origin-top" style="${displayStyle}">`;

        var itemsToRender = [...g.items];
        itemsToRender.forEach(function (i) { html += `<div id="card_wrapper_${i.id}"></div>`; });
        html += `</div>`;
      });

      root.innerHTML = html;
      if (navRoot) { navRoot.innerHTML = navHtml; navRoot.classList.remove('hidden'); }

      AuditState.currentChecklist.forEach(function (g) {
        g.items.forEach(function (i) { AuditRender.updateCardDOM(i.id, i); });
      });

      if (_getSetting('swipeEnabled')) initSwipes();
      AuditRender.updateGroupCounters();
    },

    // =====================================================================
    // РЕНДЕР СЕЛЕКТОРА ШАБЛОНОВ (ВИДА РАБОТ)
    // Перенесено из audit.legacy.js (было в app.js, строка 2699).
    // =====================================================================
    renderSelector: function () {
      var sysGroup = document.getElementById('system-group');
      var userGroup = document.getElementById('user-group');

      var refSysGroup = document.getElementById('ref-system-group');
      var refUserGroup = document.getElementById('ref-user-group');

      var fakeSysGroup = document.getElementById('fake-system-group');
      var fakeUserGroup = document.getElementById('fake-user-group');

      var _st = _templates().getSystemTemplates();
      var sysKeys = Object.keys(_st).sort(function (a, b) {
        return _st[a].title.localeCompare(_st[b].title, 'ru');
      });
      var sysHtml = sysKeys.map(function (key) {
        return '<option value="sys_' + key + '">' + _st[key].title + '</option>';
      }).join('');

      var _ut = _templates().getUserTemplates();
      var userKeys = Object.keys(_ut).sort(function (a, b) {
        return _ut[a].title.localeCompare(_ut[b].title, 'ru');
      });
      var userHtml = userKeys.length > 0
        ? userKeys.map(function (key) {
          return '<option value="user_' + key + '">' + _ut[key].title + '</option>';
        }).join('')
        : '<option disabled>Своих шаблонов нет</option>';

      if (sysGroup) sysGroup.innerHTML = sysHtml;
      if (userGroup) userGroup.innerHTML = userHtml;

      if (refSysGroup) refSysGroup.innerHTML = sysHtml;
      if (refUserGroup) refUserGroup.innerHTML = userHtml;

      if (fakeSysGroup) fakeSysGroup.innerHTML = sysHtml;
      if (fakeUserGroup) fakeUserGroup.innerHTML = userHtml;

      if (AuditState.currentTemplateKey) {
        var sel = document.getElementById('checklist-selector');
        if (sel) sel.value = AuditState.currentTemplateKey;
      }
    },

    // =====================================================================
    // ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА (метрики текущего осмотра)
    // Перенесено из audit.legacy.js (было в app.js, строка 3270).
    // =====================================================================
    updateUI: function () {
      var p = AuditState.currentTemplateKey ? getProductMetrics(AuditState.state, AuditState.currentChecklist) : null;
      var getTextColor = function (val, isDanger) {
        if (isDanger || val < 70) return 'text-white drop-shadow-md';
        if (val < 85) return 'text-slate-900';
        return 'text-white drop-shadow-md';
      };

      if (!p) {
        if (document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = "0/0";
        if (document.getElementById('dash-p-doc')) document.getElementById('dash-p-doc').innerText = "";
        if (document.getElementById('dash-p-bar')) document.getElementById('dash-p-bar').style.width = "0%";
        if (document.getElementById('dash-p-percent')) document.getElementById('dash-p-percent').innerText = "--%";
        ['dash-p-kc', 'dash-p-kcrit', 'dash-p-b2', 'dash-p-b3'].forEach(function (id) { if (document.getElementById(id)) document.getElementById(id).innerText = "-"; });
      } else {
        if (document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = `${p.checkedCount}/${p.totalCount}`;
        if (document.getElementById('dash-p-doc')) {
          document.getElementById('dash-p-doc').innerText = (p.documentary !== null && p.documentary !== undefined) ? `Док: ${p.documentary}%` : "";
        }
        if (document.getElementById('dash-p-bar')) {
          document.getElementById('dash-p-bar').style.width = `${p.final}%`;
          document.getElementById('dash-p-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${p.isDanger ? 'bg-red-500' : (p.final < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
        }
        if (document.getElementById('dash-p-percent')) {
          document.getElementById('dash-p-percent').innerText = `${p.final}%`;
          document.getElementById('dash-p-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(p.final, p.isDanger)}`;
        }
        if (document.getElementById('dash-p-kc')) document.getElementById('dash-p-kc').innerText = p.kc.toFixed(2);
        if (document.getElementById('dash-p-kcrit')) document.getElementById('dash-p-kcrit').innerText = p.kcrit.toFixed(2);
        if (document.getElementById('dash-p-b2')) document.getElementById('dash-p-b2').innerText = p.n_B2_fail;
        if (document.getElementById('dash-p-b3')) document.getElementById('dash-p-b3').innerText = p.n_B3_fail;
      }

      var currentContr = document.getElementById('inp-contractor') && document.getElementById('inp-contractor').value.trim();
      var _inspections = _getAllInspections();
      var filteredArr = currentContr ? _inspections.filter(function (i) { return i.contractorName === currentContr && i.templateKey === AuditState.currentTemplateKey; }) : [];

      if (filteredArr.length < 7) {
        if (document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${filteredArr.length}/7 пров.`;
        if (document.getElementById('dash-c-doc')) document.getElementById('dash-c-doc').innerText = "";
        if (document.getElementById('dash-c-bar')) document.getElementById('dash-c-bar').style.width = "0%";
        if (document.getElementById('dash-c-percent')) document.getElementById('dash-c-percent').innerText = "СБОР";
        ['dash-c-ks', 'dash-c-kcrit', 'dash-c-b3'].forEach(function (id) { if (document.getElementById(id)) document.getElementById(id).innerText = "-"; });
      } else {
        var _ut = _templates().getUserTemplates();
        var c = getContractorMetrics(filteredArr, _ut);
        if (c) {
          if (document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${c.count} пров.`;
          if (document.getElementById('dash-c-doc')) {
            document.getElementById('dash-c-doc').innerText = (c.documentaryC !== null && c.documentaryC !== undefined) ? `Док: ${c.documentaryC}%` : "";
          }
          if (document.getElementById('dash-c-bar')) {
            document.getElementById('dash-c-bar').style.width = `${c.finalC}%`;
            document.getElementById('dash-c-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${c.isRedZone ? 'bg-red-500' : (c.finalC < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
          }
          if (document.getElementById('dash-c-percent')) {
            document.getElementById('dash-c-percent').innerText = `${c.finalC}%`;
            document.getElementById('dash-c-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(c.finalC, c.isRedZone)}`;
          }
          if (document.getElementById('dash-c-ks')) {
            var ksEl = document.getElementById('dash-c-ks');
            ksEl.innerText = c.ks.toFixed(2);
            ksEl.className = `font-black ${c.ks < 1 ? 'text-red-500' : 'text-green-600'}`;
          }
          if (document.getElementById('dash-c-kcrit')) {
            var kcritEl = document.getElementById('dash-c-kcrit');
            kcritEl.innerText = c.kcritC.toFixed(2);
            kcritEl.className = `font-black ${c.kcritC < 1 ? 'text-red-500' : 'text-green-600'}`;
          }
          if (document.getElementById('dash-c-b3')) document.getElementById('dash-c-b3').innerText = c.n_изделий_с_B3;
        }
      }

      var selectEl = document.getElementById('checklist-selector');
      var clName = selectEl && selectEl.options[selectEl.selectedIndex] ? selectEl.options[selectEl.selectedIndex].text.replace('▼', '').trim() : 'Вид работ не выбран';
      var labelEl = document.getElementById('current-checklist-label');
      if (labelEl) labelEl.innerText = clName;

      AuditRender.updateGroupCounters();
    },

    // =====================================================================
    // ОБНОВЛЕНИЕ СТРОКИ-СВОДКИ ДАННЫХ
    // Перенесено из audit.legacy.js (было в app.js, строка 2812).
    // =====================================================================
    updateDataSummary: function () {
      var proj = document.getElementById('inp-project')?.value.trim() || 'Объект';
      var contr = document.getElementById('inp-contractor')?.value.trim() || 'Подрядчик';
      var loc = document.getElementById('inp-location')?.value.trim() || 'Локация';

      var selectEl = document.getElementById('checklist-selector');
      var clName = selectEl?.options[selectEl.selectedIndex]?.text.replace('▼', '').trim() || 'Чек-лист не выбран';

      var summary = document.getElementById('data-block-summary');
      if (summary) summary.innerText = `✏️ ${clName} | ${proj} | ${contr} | ${loc}`;

      var labelEl = document.getElementById('current-checklist-label');
      if (labelEl) labelEl.innerText = clName;
    },

    // =====================================================================
    // СВОРАЧИВАНИЕ/РАЗВОРАЧИВАНИЕ БЛОКА ДАННЫХ
    // Перенесено из audit.legacy.js (было в app.js, строка 2827).
    // =====================================================================
    toggleDataBlock: function (forceOpen) {
      var content = document.getElementById('data-block-content');
      var summary = document.getElementById('data-block-summary');
      var icon = document.getElementById('data-toggle-icon');
      if (!content || !summary) return;

      if (forceOpen || content.style.display === 'none') {
        content.style.display = 'grid'; summary.classList.add('hidden'); icon.innerText = 'СВЕРНУТЬ ▲';
      } else {
        AuditRender.updateDataSummary(); content.style.display = 'none'; summary.classList.remove('hidden'); icon.innerText = 'РАЗВЕРНУТЬ ▼';
      }
    },

    // =====================================================================
    // РЕНДЕР КАРТОЧКИ ПУНКТА ЧЕКЛИСТА В DOM
    // Перенесено из audit.legacy.js (было в app.js, строка 2986).
    // =====================================================================
    updateCardDOM: function (id, itemData) {
      if (itemData === undefined) itemData = null;
      var wrapper = document.getElementById(`card_wrapper_${id}`);
      if (!wrapper) return;

      if (!itemData) {
        var flat = getFlatList(AuditState.currentChecklist);
        itemData = flat.find(function (x) { return x.id === id; });
      }
      if (!itemData) return;

      var s = AuditState.state[id];
      var i = itemData;

      var isEscalated = s === 'fail_escalated';
      var failActive = s === 'fail' || s === 'fail_escalated';
      var okActive = s === 'ok';

      var cardBgClass = failActive ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' : (okActive ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' : '');
      var indicatorClass = `indicator-${s ? (okActive ? 'ok' : (isEscalated ? 3 : i.w)) : i.w}`;

      var collapseClass = '';
      if (okActive && _getSetting('autoCollapseOk') && !itemData._forceExpand) {
        collapseClass = 'card-collapsed';
        cardBgClass = '';
      }

      if (_getSetting('soundEnabled') && AuditState.state[id] && !itemData._justRendered) {
        if (AuditState.state[id] === 'ok') audioOk.play().catch(function () { });
        else audioFail.play().catch(function () { });
      }
      itemData._justRendered = true;

      var _twiCards = _getTwiCards();
      var inspectorCard = _twiCards.find(function (c) { return c.type === 'INSPECTOR' && String(c.itemId) === String(id); });
      var workerCard = _twiCards.find(function (c) { return c.type === 'WORKER' && c.checklistKey === AuditState.currentTemplateKey && (String(c.itemId) === String(id) || c.itemId === 'ALL'); });
      var pdfCard = _twiCards.find(function (c) { return c.type === 'PDF' && c.checklistKey === AuditState.currentTemplateKey && (String(c.itemId) === String(id) || c.itemId === 'ALL'); });

      var hasAnyHelp = inspectorCard || workerCard || pdfCard;

      var helpBtnHtml = '';
      if (hasAnyHelp) {
        var btnClass = 'text-slate-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';

        if (inspectorCard && workerCard) {
          btnClass = 'text-purple-600 bg-purple-100 border-purple-300 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800';
        } else if (inspectorCard) {
          btnClass = 'text-blue-600 bg-blue-100 border-blue-300 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800';
        } else if (workerCard) {
          btnClass = 'text-green-600 bg-green-100 border-green-300 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800';
        }

        helpBtnHtml = `
            <button onclick="window.RBI.services.knowledge.openItemHelp(${id}, event)" class="btn-status ${btnClass} !w-11 !h-11 !rounded-[12px] relative shadow-sm shrink-0" title="Инструкции и Справка">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path></svg>
            </button>
        `;
      } else {
        helpBtnHtml = `
            <button onclick="showToast('К этому пункту пока не привязаны инструкции')" class="btn-status text-slate-300 bg-transparent border-dashed border-slate-200 dark:text-slate-600 dark:border-slate-700 !w-11 !h-11 !rounded-[12px] shadow-sm shrink-0" title="Нет инструкций">
                <svg class="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path></svg>
            </button>
        `;
      }

      var mainBtnsHtml = `
        <button onclick="toggleOk(${id})" class="btn-status ${okActive ? 'bg-green-500 text-white border-green-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button onclick="toggleFail(${id})" class="btn-status ${failActive ? 'bg-red-500 text-white border-red-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;

      var auditHtml = '';

      if (window.auditOriginalData) {
        var origState = window.auditOriginalData.state[id];
        var origPhoto = window.auditOriginalData.photos ? window.auditOriginalData.photos[id] : null;

        if (origState) {
          if (window.auditOriginalData.isCrossAudit) {
            var badgeColor = origState === 'ok' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200';
            var badgeText = origState === 'ok' ? 'OK' : 'FAIL';
            var photoBlock = origPhoto ? `<img src="${window.getPhotoSrc(origPhoto)}" class="w-8 h-8 object-cover rounded cursor-pointer border border-slate-300" onclick="openPhotoViewer('${origPhoto}')">` : '';

            auditHtml = `
                    <div class="mt-2 bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 p-2 rounded-lg flex justify-between items-center w-full">
                        <div>
                            <div class="text-[8px] font-black uppercase text-slate-400 mb-0.5">Оценка инженера (${window.auditOriginalData.inspector})</div>
                            <span class="text-[9px] font-black px-1.5 py-0.5 rounded border ${badgeColor}">${badgeText}</span>
                        </div>
                        ${photoBlock}
                    </div>
                `;
          } else if (window.auditOriginalData.isEtalonCompare && (origState === 'fail' || origState === 'fail_escalated')) {
            if (origPhoto) {
              auditHtml = `
                        <div class="mt-2 bg-orange-50 dark:bg-orange-900/10 border border-dashed border-orange-200 dark:border-orange-800 p-2 rounded-lg flex items-center gap-3 w-full">
                            <img src="${window.getPhotoSrc(origPhoto)}" class="w-12 h-12 object-cover rounded cursor-pointer border border-orange-300" onclick="openPhotoViewer('${origPhoto}')">
                            <div>
                                <div class="text-[9px] font-black uppercase text-orange-600 mb-0.5">📸 Было (Брак)</div>
                                <div class="text-[9px] font-bold text-orange-800 dark:text-orange-400 leading-tight">Прикрепите новое фото "СТАЛО", чтобы зафиксировать исправление эталона.</div>
                            </div>
                        </div>
                    `;
            }
          }
        }
      }

      var contentHtml = '';

      if (failActive) {
        var hasComment = AuditState.details[id] && AuditState.details[id].comment && AuditState.details[id].comment.trim() !== "";

        var commBtn = hasComment ?
          `<div class="relative shrink-0"><button onclick="toggleCommentField(${id})" class="btn-status text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 !w-11 !h-11 !rounded-[12px] shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button><div onclick="deleteComment(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
          `<button onclick="toggleCommentField(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button>`;

        var photoBtn = AuditState.photos[id] ?
          `<div class="relative shrink-0"><img src="${window.getPhotoSrc(AuditState.photos[id])}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-indigo-200 dark:border-indigo-800 shadow-sm object-cover" onclick="openPhotoViewer('${AuditState.photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
          `<button onclick="triggerPhotoInput(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg></button>`;
        var escBtn = (i.w === 2) ? `<button onclick="toggleEscalation(${id})" class="btn-status ${isEscalated ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'text-orange-500 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'} !w-11 !h-11 !rounded-[12px] transition-all shrink-0 shadow-sm"><span class="text-[13px] font-bold">>1.5</span></button>` : '';

        var visualIndicatorHtml = isEscalated ? `<div class="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded w-fit mt-1 shadow-sm">Дефект учтен как B3</div>` : '';
        var commentBlockHtml = hasComment ? `<div class="mt-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-red-100 dark:border-red-800 shadow-sm leading-snug break-words w-full">💬 ${AuditState.details[id].comment}</div>` : '';

        contentHtml = `
            <div class="flex flex-col w-full">
                <div class="w-full pointer-events-none mb-2">
                    <div class="text-[13px] font-bold leading-snug card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    ${visualIndicatorHtml}
                    ${commentBlockHtml}
                </div>
                
                <div class="flex justify-end items-center flex-wrap gap-1.5 w-full mt-1 border-t border-red-100 dark:border-red-800 pt-3">
                    ${escBtn}
                    ${commBtn}
                    ${photoBtn}
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
      } else if (okActive) {
        var photoBtnOk = AuditState.photos[id] ?
          `<div class="relative shrink-0"><img src="${window.getPhotoSrc(AuditState.photos[id])}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-green-300 shadow-sm object-cover" onclick="openPhotoViewer('${AuditState.photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
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
      } else {
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

      var cardHtml = `
    <div class="card-audit swipe-container ${indicatorClass} ${cardBgClass} ${collapseClass}" data-id="${id}" onclick="if(this.classList.contains('card-collapsed')) expandCard(${id}, event)">
        <div class="swipe-actions-bg swipe-bg-ok"><span class="ml-4">OK</span></div>
        <div class="swipe-actions-bg swipe-bg-fail"><span class="mr-4">FAIL</span></div>
        <div class="swipe-content p-2.5 bg-inherit border-inherit rounded-inherit h-full w-full bg-[var(--card-bg)] dark:bg-slate-800 transition-colors">
            ${contentHtml}
        </div>
    </div>`;

      wrapper.innerHTML = cardHtml;
    },

    // =====================================================================
    // ОБНОВЛЕНИЕ СЧЁТЧИКОВ ГРУПП + ЦВЕТОВАЯ ИНДИКАЦИЯ НАВИГАЦИИ
    // Перенесено из audit.legacy.js (было в app.js, строка 2934).
    // =====================================================================
    updateGroupCounters: function () {
      if (!AuditState.currentTemplateKey) return;

      AuditState.currentChecklist.forEach(function (g, gIndex) {
        var answered = 0;
        var stageState = {};

        g.items.forEach(function (i) {
          if (AuditState.state[i.id]) {
            answered++;
            stageState[i.id] = AuditState.state[i.id];
          }
        });

        var counterEl = document.getElementById(`group-counter-${gIndex}`);
        var navBtnEl = document.getElementById(`nav-btn-${gIndex}`);

        if (counterEl) counterEl.innerText = `${answered}/${g.items.length}`;

        if (navBtnEl) {
          if (answered === 0) {
            navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95`;
          } else {
            var stageMetrics = getProductMetrics(stageState, [g]);
            var f = stageMetrics.final;

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
    },

    // =====================================================================
    // СВОРАЧИВАНИЕ/РАЗВОРАЧИВАНИЕ ГРУППЫ ПУНКТОВ
    // Перенесено из audit.legacy.js (было в app.js, строка 2906).
    // =====================================================================
    toggleGroup: function (index) {
      var content = document.getElementById(`group_content_${index}`);
      var title = document.getElementById(`group-title-${index}`);
      if (!content || !title) return;

      if (content.style.display === 'none') {
        content.style.display = 'block';
        title.innerText = title.innerText.replace('▶', '▼');
      } else {
        content.style.display = 'none';
        title.innerText = title.innerText.replace('▼', '▶');
      }
    },

    // =====================================================================
    // ПРОКРУТКА К ГРУППЕ ПО НАВИГАЦИИ
    // Перенесено из audit.legacy.js (было в app.js, строка 2920).
    // =====================================================================
    scrollToGroup: function (index) {
      var content = document.getElementById(`group_content_${index}`);
      if (content && content.previousElementSibling) {
        var headerEl = document.getElementById('main-header');
        var headerOffset = headerEl ? headerEl.offsetHeight + 10 : 120;

        var elementPosition = content.previousElementSibling.getBoundingClientRect().top;
        var offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    },

    // =====================================================================
    // ПРИНУДИТЕЛЬНОЕ РАЗВОРАЧИВАНИЕ КАРТОЧКИ
    // Перенесено из audit.legacy.js (было в app.js, строка 2976).
    // =====================================================================
    expandCard: function (id, event) {
      if (event) event.stopPropagation();
      var flatList = getFlatList(AuditState.currentChecklist);
      var itemData = flatList.find(function (x) { return x.id === id; });
      if (itemData) {
        itemData._forceExpand = true;
        AuditRender.updateCardDOM(id, itemData);
      }
    }
  };

  window.AuditRender = AuditRender;

  // =========================================================================
  // МОНТАЖ РАЗМЕТКИ ВКЛАДКИ «ОСМОТР» (перенос из index.html:433-605, Блок 1
  // инициативы «Перенос статичной разметки quality в JS-рендер»). Выполняется
  // синхронно на верхнем уровне модуля (deferred-скрипт, до DOMContentLoaded),
  // ДО регистрации слушателей bootstrap:selectorReady/checklistReady ниже —
  // иначе renderSelector()/render() не найдут узлы #tab-audit/#audit-items и
  // список чек-листов останется пустым при первой загрузке (см. план блока).
  // =========================================================================
  (function mountAuditMarkup() {
    if (document.getElementById('tab-audit')) return;
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
      ? window.RBI.services.shell.getContentRoot()
      : document.getElementById('app-content');
    if (!root) return;
    root.insertAdjacentHTML('afterbegin', AuditRender.renderMarkup());
  }());

  // =========================================================================
  // МОДАЛКИ РАСЧЕТОВ (По клику на мини-дашборд)
  // Перенесено из app.js (было: showProductMath/showContractorDetails +
  // DOMContentLoaded-листенер, строки ~1109-1219). Публикуются явно через
  // window.* — потребитель inline onclick в index.html:759,780 исполняется
  // в глобальном скоупе, а этот файл — ES-модуль.
  // =========================================================================
  window.showProductMath = function () {
    if (!AuditState.currentTemplateKey) return;
    var p = window.getProductMetrics(AuditState.state, AuditState.currentChecklist);
    var modal = document.getElementById('modal-overlay');
    var body = document.getElementById('modal-body');

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
  };

  window.showContractorDetails = function () {
    if (!AuditState.currentTemplateKey) return;
    var currentContr = document.getElementById('inp-contractor').value.trim();
    var filteredArr = currentContr ? _getContractorArray().filter(function (i) { return i.contractorName === currentContr && i.templateKey === AuditState.currentTemplateKey; }) : [];

    var modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl">M</div>`;
    document.getElementById('modal-title').innerText = currentContr ? `Аналитика: ${currentContr}` : "Аналитика подрядчика";
    var body = document.getElementById('modal-body');

    if (filteredArr.length < 7) {
      body.innerHTML = `<p class="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold leading-snug text-center">Сбор данных: <b class="text-lg text-indigo-600">${filteredArr.length} / 7</b><br><br>Для расчета интегрального рейтинга подрядчика и штрафных коэффициентов требуется минимум <b>7</b> независимых проверок.</p>`;
    } else {
      var c = window.getContractorMetrics(filteredArr, _templates().getUserTemplates());
      var warningHtml = ''; // Убрали предупреждение, так как до 7 проверок модалка теперь блокируется

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
  };

  // === СВОРАЧИВАЕМ МИНИДАШБОРД ===
  // Перенесено из app.js (было app.js:662-668). Публикуется на window.*, так
  // как вызывается из inline onclick="toggleDashboardExpand()" в index.html.
  window.toggleDashboardExpand = function () {
    const expView = document.getElementById('dash-expanded-view');
    if (!expView) return;
    expView.classList.toggle('hidden');
    // Обновляем отступ страницы через нашу умную функцию
    setTimeout(updateBodyPadding, 50);
  };

  // Назначаем клики на мини-дашборд (перенесено из app.js вместе с функциями,
  // т.к. слушатель бареным именем вызывал их — при переносе только функций,
  // без листенера, клики на мини-дашборд перестали бы работать).
  document.addEventListener("DOMContentLoaded", function () {
    var pCard = document.getElementById('mini-p-bar') ? document.getElementById('mini-p-bar').parentElement : null;
    var cCard = document.getElementById('mini-c-urk') ? document.getElementById('mini-c-urk').parentElement : null;

    if (pCard) pCard.addEventListener('click', window.showProductMath);
    if (cCard) cCard.addEventListener('click', window.showContractorDetails);
  });

  // =========================================================================
  // WINDOW-ПРОКСИ (обратная совместимость: index.html inline-обработчики,
  // динамически генерируемый HTML — onclick в строках выше — и app.js).
  // =========================================================================
  window.render = AuditRender.render.bind(AuditRender);
  window.renderSelector = AuditRender.renderSelector.bind(AuditRender);
  window.updateUI = AuditRender.updateUI.bind(AuditRender);
  window.updateDataSummary = AuditRender.updateDataSummary.bind(AuditRender);
  window.toggleDataBlock = AuditRender.toggleDataBlock.bind(AuditRender);
  window.updateCardDOM = AuditRender.updateCardDOM.bind(AuditRender);
  window.updateGroupCounters = AuditRender.updateGroupCounters.bind(AuditRender);
  window.toggleGroup = AuditRender.toggleGroup.bind(AuditRender);
  window.scrollToGroup = AuditRender.scrollToGroup.bind(AuditRender);
  window.expandCard = AuditRender.expandCard.bind(AuditRender);

  console.log('[RBI Module] audit.render loaded (owner-module: full render logic)');
}());
