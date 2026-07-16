// etalon-v18b.render.js — оболочка (шапка привязки к платформе + iframe) для
// «Акт-Эталон (Бета 2, только ПК)». Сама форма акта — оригинальный файл
// etalon-v18b.frame.html, встроенный без изменений через <iframe>, поэтому
// здесь верстается только небольшая шапка платформы (объект/подрядчик/вид
// работ) над iframe и приём сообщений от него (см. etalon-v18b.actions.js).

(function () {
  'use strict';

  function renderMarkup() {
    var html = '';
    html += '<div id="etalon-v18b-view" class="hidden bg-slate-100 dark:bg-slate-900 fixed inset-0 z-[3000] h-screen flex flex-col">';

    html += '<div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 shadow-sm flex flex-wrap items-center gap-3 shrink-0">';
    html += '<button onclick="closeEtalonV18BConstructor()" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg transition-colors shrink-0">';
    html += '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg> Назад';
    html += '</button>';
    html += '<div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest truncate flex-1 min-w-[160px]" id="etv18b-title-text">Акт-Эталон (Бета 2, ПК)</div>';

    html += '<div class="flex flex-wrap items-end gap-2">';
    html += '<div><label class="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-0.5 block">Объект *</label><input type="text" id="etv18b-project" autocomplete="off" class="input-base text-[11px] font-bold" style="min-width:140px"></div>';
    html += '<div><label class="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-0.5 block">Подрядчик *</label><input type="text" id="etv18b-contractor" autocomplete="off" class="input-base text-[11px] font-bold" style="min-width:140px"></div>';
    html += '<div><label class="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-0.5 block">Вид работ *</label><select id="etv18b-template" class="input-base text-[11px] font-bold" style="min-width:160px"></select></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="flex-1 min-h-0" id="etv18b-frame-host"></div>';
    html += '</div>';
    return html;
  }

  function bindFrameMessages() {
    if (window.__etalonV18BBridgeBound) return;
    window.__etalonV18BBridgeBound = true;

    window.addEventListener('message', function (event) {
      var msg = event.data;
      if (!msg || msg.source !== 'rbi-etalon-v18b') return;

      if (msg.type === 'frame-ready') {
        if (window.EtalonV18BActions) window.EtalonV18BActions.onFrameReady();
      } else if (msg.type === 'act-save-request') {
        if (window.EtalonV18BActions) window.EtalonV18BActions.onSaveRequest(msg.payload.data, msg.payload.closeAfter);
      }
      // 'act-saved' (браузерный localStorage внутри iframe) — информационный,
      // платформа не обязана на него реагировать: реальное сохранение в RBI
      // происходит только через явный 'act-save-request'.
    });
  }

  var EtalonV18BRender = {
    mount: function (frameSrc) {
      bindFrameMessages();

      if (!document.getElementById('etalon-v18b-view')) {
        var root = (window.RBI && window.RBI.services && window.RBI.services.shell)
          ? window.RBI.services.shell.getModalsRoot()
          : document.getElementById('app-modals') || document.body;
        root.insertAdjacentHTML('beforeend', renderMarkup());
      }

      var host = document.getElementById('etv18b-frame-host');
      if (host && !document.getElementById('etv18b-frame')) {
        var iframe = document.createElement('iframe');
        iframe.id = 'etv18b-frame';
        iframe.src = frameSrc;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.style.display = 'block';
        host.appendChild(iframe);
      }
    }
  };

  window.EtalonV18BRender = EtalonV18BRender;
}());

console.log('[EtalonV18BRender] etalon-v18b.render.js loaded');
