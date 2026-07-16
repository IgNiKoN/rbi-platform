// etalon.actions.js — Фаза 18+: бизнес-действия модуля Etalon (owner-module)
//
// Реализация перенесена из js/etalon.js (удалён). Источник состояния —
// window.etalonActsArray/window.weeklyPlanData/window.contractorStatuses
// (синхронизированы в js/app.js/js/game.js). Остальные глобалы (app.js) —
// как есть (bare identifiers через typeof-guard, по паттерну audit.actions.js).
// Эмитит: etalon:act:saved, etalon:act:deleted, etalon:initialized.

(function () {
  'use strict';

  function emit(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
    var events = EtalonActions._ctx && EtalonActions._ctx.events;
    if (events && typeof events.emit === 'function') {
      events.emit(eventName, detail || {});
    }
  }

  function _getSetting(key) {
    if (EtalonActions._ctx && EtalonActions._ctx.settings) return EtalonActions._ctx.settings.get(key);
    return window.RBI.services.settings.get(key);
  }

  function _triggerSync(mode) {
    var m = mode || 'silent';
    if (EtalonActions._ctx && EtalonActions._ctx.sync) return EtalonActions._ctx.sync.trigger(m);
    if (window.RBI && window.RBI.services && window.RBI.services.sync) return window.RBI.services.sync.trigger(m);
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
  }

  function _gameLogAction(actionType, targetId) {
    if (EtalonActions._ctx && EtalonActions._ctx.game) {
      return EtalonActions._ctx.game.logAction(actionType, targetId);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
      return window.RBI.services.game.logAction(actionType, targetId);
    }
    if (typeof gameLogAction === 'function') return gameLogAction(actionType, targetId);
  }

  function _storage() {
    if (EtalonActions._ctx && EtalonActions._ctx.storage) return EtalonActions._ctx.storage;
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
      return window.RBI.services.storage;
    }
    return {
      stores: function () { return typeof STORES !== 'undefined' ? STORES : {}; },
      get: function (store, key) { return dbGet(store, key); },
      getAll: function (store) { return dbGetAll(store); },
      put: function (store, data) { return dbPut(store, data); },
      delete: function (store, key) { return dbDelete(store, key); }
    };
  }

  function _getTasks() {
    if (EtalonActions._ctx && EtalonActions._ctx.tasks) return EtalonActions._ctx.tasks.getTasksSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
      return window.RBI.services.tasks.getTasksSync();
    }
    return typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : [];
  }

  function _getWeeklyPlan() {
    if (EtalonActions._ctx && EtalonActions._ctx.game) return EtalonActions._ctx.game.getWeeklyPlanSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
      return window.RBI.services.game.getWeeklyPlanSync();
    }
    return window.weeklyPlanData || { weekId: null, tasks: [], completed: false };
  }

  function _getContractorStatuses() {
    if (EtalonActions._ctx && EtalonActions._ctx.game) return EtalonActions._ctx.game.getContractorStatusesSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
      return window.RBI.services.game.getContractorStatusesSync();
    }
    return window.contractorStatuses || {};
  }

  // Приватное состояние модуля (было currentEtalonContext/etalonElementCounter/
  // currentEtalonUploadId — top-level let в etalon.js).
  var _context = {
    contractor: '',
    templateKey: '',
    templateTitle: '',
    statusKey: '',
    elements: []
  };
  var _elementCounter = 0;
  var _uploadId = null;

  function _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // Перенесено 1:1 из etalon.js (Фаза 76: изоляция userTemplates через
  // TemplateService с fallback).
  function _templates() {
    if (EtalonActions._ctx && EtalonActions._ctx.templates) return EtalonActions._ctx.templates;
    if (window.RBI && window.RBI.services && window.RBI.services.templates) {
      return window.RBI.services.templates;
    }
    return {
      getUserTemplates: function () {
        return typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
      },
      getByKey: function (key) {
        var ut = typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
        return ut[key] || null;
      },
      getSystemTemplates: function () {
        return typeof SYSTEM_TEMPLATES !== 'undefined' ? SYSTEM_TEMPLATES : {};
      }
    };
  }

  // Единая точка доступа к window.etalonActsArray через KnowledgeService
  // (приоритет EtalonActions._ctx.knowledge → window.RBI.services.knowledge →
  // bare window.etalonActsArray).
  function _etalonActs() {
    if (EtalonActions._ctx && EtalonActions._ctx.knowledge && typeof EtalonActions._ctx.knowledge.ensureEtalonActsSync === 'function') {
      return EtalonActions._ctx.knowledge.ensureEtalonActsSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge && typeof window.RBI.services.knowledge.ensureEtalonActsSync === 'function') {
      return window.RBI.services.knowledge.ensureEtalonActsSync();
    }
    if (!Array.isArray(window.etalonActsArray)) window.etalonActsArray = [];
    return window.etalonActsArray;
  }

  var EtalonActions = {

    _ctx: null,
    bindCtx: function (ctx) { this._ctx = ctx; },

    // =====================================================================
    // ОТКРЫТИЕ КОНСТРУКТОРА АКТА-ЭТАЛОНА
    // Перенесено из etalon.js (было window.openEtalonConstructor, строка 39).
    // =====================================================================
    openConstructor: function (contractor, templateKey, templateTitle, projectName, statusKey) {
      _context = {
        contractor: contractor,
        templateKey: templateKey,
        templateTitle: templateTitle,
        projectName: projectName,
        statusKey: statusKey,
        elements: []
      };
      _elementCounter = 0;

      document.getElementById('etalon-location').value = '';
      document.getElementById('etalon-participants').value = document.getElementById('inp-inspector')?.value || '';
      document.getElementById('etalon-deviations').value = '';
      document.getElementById('etalon-elements-container').innerHTML = '';

      document.getElementById('etalon-title-text').innerText = `${projectName} | ${contractor} | ${templateTitle}`;
      // === Заполняем выпадающий список видов работ ===
      const tmplSelect = document.getElementById('etalon-template');
      let tmplOpts = '<option value="" disabled selected>-- Выберите вид работ --</option>';

      const _st = _templates().getSystemTemplates();
      const sysKeys = Object.keys(_st).sort((a, b) => _st[a].title.localeCompare(_st[b].title));
      sysKeys.forEach(k => tmplOpts += `<option value="sys_${k}">[СИС] ${_st[k].title}</option>`);

      const _ut = _templates().getUserTemplates();
      if (Object.keys(_ut).length > 0) {
        const userKeys = Object.keys(_ut).sort((a, b) => _ut[a].title.localeCompare(_ut[b].title));
        userKeys.forEach(k => tmplOpts += `<option value="user_${k}">[МОЙ] ${_ut[k].title}</option>`);
      }
      tmplSelect.innerHTML = tmplOpts;

      // === Заполняем поля значениями ===
      document.getElementById('etalon-project').value = projectName || document.getElementById('inp-project')?.value || '';
      document.getElementById('etalon-contractor').value = contractor || '';
      if (templateKey) tmplSelect.value = templateKey;

      if (typeof initSmartInput === 'function') {
        initSmartInput('etalon-project', 'projectName');
        initSmartInput('etalon-contractor', 'contractorName');
      }

      if (contractor && templateTitle) {
        document.getElementById('etalon-title-text').innerText = `${projectName || 'Объект'} | ${contractor}`;
      } else {
        document.getElementById('etalon-title-text').innerText = `Новый Акт-Эталон`;
      }
      // Добавляем первый пустой элемент по умолчанию
      EtalonActions.addElement();
      // === ДОБАВЛЯЕМ КНОПКУ ЗАГРУЗКИ PDF ===
      const pdfBlockHtml = `
        <div id="etalon-pdf-wrap" class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div class="font-black text-[10px] text-indigo-500 uppercase tracking-widest mb-2">Готовый PDF-Акт (Опционально)</div>
            <div id="etalon-pdf-preview" data-pdf="" class="hidden mb-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex justify-between items-center">
                <div class="min-w-0 pr-3">
                    <div class="text-[11px] font-black text-slate-800 dark:text-white truncate" id="etalon-pdf-name">doc.pdf</div>
                </div>
                <button onclick="window.removeEtalonPdf()" class="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-red-500 font-black shadow-sm border border-slate-200 active:scale-90 shrink-0">✕</button>
            </div>
            <button id="etalon-pdf-upload-btn" onclick="document.getElementById('etalon-pdf-input').click()" class="w-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">
                📄 Прикрепить готовый PDF
            </button>
            <input type="file" id="etalon-pdf-input" accept="application/pdf" class="hidden" onchange="window.handleEtalonPdfUpload(event)">
        </div>
      `;
      document.getElementById('etalon-elements-container').insertAdjacentHTML('afterend', pdfBlockHtml);
      // Динамически внедряем кнопки "Сохранить" и "Печать"
      const headerContainer = document.getElementById('etalon-title-text').parentElement;
      headerContainer.innerHTML = `
        <button onclick="closeEtalonConstructor()" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg transition-colors shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg> Назад
        </button>
        <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest text-center flex-1 truncate px-2" id="etalon-title-text">${projectName} | ${contractor} | ${templateTitle}</div>
        <div class="flex gap-1.5 shrink-0">
            <button onclick="saveEtalonAct(false)" class="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg active:scale-95 shadow-sm transition-colors">Сохранить</button>
            <button onclick="saveEtalonAct(true)" class="text-[10px] font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg active:scale-95 shadow-md transition-colors flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button>
        </div>
      `;
      const view = document.getElementById('etalon-constructor-view');
      view.classList.remove('hidden');
      document.body.classList.add('modal-open');
      view.scrollTo(0, 0);
    },

    // =====================================================================
    // ЗАКРЫТИЕ КОНСТРУКТОРА
    // Перенесено из etalon.js (было window.closeEtalonConstructor, строка 127).
    // =====================================================================
    closeConstructor: function () {
      document.getElementById('etalon-constructor-view').classList.add('hidden');
      document.body.classList.remove('modal-open');
    },

    // =====================================================================
    // ДОБАВЛЕНИЕ ЭЛЕМЕНТА ЭТАЛОНА
    // Перенесено из etalon.js (было window.addEtalonElement, строка 132).
    // =====================================================================
    addElement: function () {
      _elementCounter++;
      const elId = `etalon-el-${_elementCounter}`;

      const html = `
        <div id="${elId}" class="etalon-item bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative mb-3">
            <button onclick="document.getElementById('${elId}').remove()" class="absolute top-2 right-2 text-red-400 active:scale-90 font-black text-sm px-2">✕</button>
            <div class="font-black text-[10px] text-indigo-500 uppercase tracking-widest mb-2">Элемент эталона</div>
            
            <input type="text" class="etalon-el-name input-base text-[12px] mb-2 font-bold" placeholder="Название (напр: Устройство швов)">
            <textarea class="etalon-el-desc input-base text-[11px] h-12 resize-none mb-2" placeholder="Описание выполнения..."></textarea>
            
            <div class="etalon-photo-container" data-photo="">
                <button onclick="triggerEtalonPhotoUpload('${elId}')" class="w-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">
                    📸 Прикрепить фото узла
                </button>
            </div>
        </div>
      `;
      document.getElementById('etalon-elements-container').insertAdjacentHTML('beforeend', html);
    },

    // =====================================================================
    // ЗАПУСК ЗАГРУЗКИ ФОТО УЗЛА
    // Перенесено из etalon.js (было window.triggerEtalonPhotoUpload, строка 154).
    // =====================================================================
    triggerPhotoUpload: function (elId) {
      _uploadId = elId;
      window.activePhotoContext = 'etalon'; // Говорим системе, что фото идет в Эталон
      document.getElementById('photo-source-modal').style.display = 'flex'; // Открываем выбор: Камера/Галерея
    },

    // =====================================================================
    // СОХРАНЕНИЕ ОТМЕЧЕННОГО ФОТО (после редактора)
    // Перенесено из etalon.js (было window.saveEtalonMarkupPhoto, строка 161).
    // =====================================================================
    saveMarkupPhoto: async function () {
      if (!editorCanvas || !_uploadId) return;

      // Получаем картинку с рисунками
      const base64 = editorCanvas.toDataURL('image/jpeg', 0.85);
      showToast("⚙️ Сохранение фото в базу...");

      // Мгновенно сохраняем в бинарную базу данных телефона
      const localUrl = await PhotoManager.saveLocal(base64, 'etalon');

      const container = document.getElementById(_uploadId).querySelector('.etalon-photo-container');
      container.dataset.photo = localUrl;

      const displayUrl = localUrl.startsWith('local://')
        ? (await PhotoManager.getAsyncUrl(localUrl) || window.getPhotoSrc(localUrl))
        : window.getPhotoSrc(localUrl);

      container.innerHTML = `
    <div class="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 dark:bg-slate-900 mt-2">
        <img src="${displayUrl}" class="w-full h-full object-contain cursor-pointer active:scale-95 transition-transform" onclick="setTimeout(() => openPhotoViewer('${localUrl}'), 100)">
        <button onclick="removeEtalonPhoto('${_uploadId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md active:scale-90">✕</button>
    </div>`;

      showToast("📸 Фото эталона сохранено!");
      cancelPhotoEditor(); // Закрываем редактор
    },

    // =====================================================================
    // УДАЛЕНИЕ ФОТО УЗЛА
    // Перенесено из etalon.js (было window.removeEtalonPhoto, строка 188).
    // =====================================================================
    removePhotoEl: function (elId) {
      const container = document.getElementById(elId).querySelector('.etalon-photo-container');
      container.dataset.photo = '';
      container.innerHTML = `
        <button onclick="triggerEtalonPhotoUpload('${elId}')" class="w-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">
            📸 Прикрепить фото (Камера / Галерея)
        </button>`;
    },

    // =====================================================================
    // ОЖИДАНИЕ ГОТОВНОСТИ ЛОКАЛЬНЫХ ФАЙЛОВ ПЕРЕД СИНХРОНИЗАЦИЕЙ
    // Устраняет гонку: PhotoManager.saveLocal() кладёт файл в IndexedDB
    // асинхронно, а saveAct() раньше запускал sync через фиксированный
    // setTimeout(800ms) "на удачу". Здесь мы опрашиваем dbGet до тех пор,
    // пока каждый local:// файл акта (PDF + фото элементов) не станет
    // читаемым, либо не истечёт разумный лимит попыток.
    // =====================================================================
    _waitForLocalFilesReady: async function (etalonRecord, maxAttempts = 20, delayMs = 150) {
      var urls = [];
      var d = etalonRecord && etalonRecord.details || {};
      if (d.pdfData) urls.push(d.pdfData);
      (d.elements || []).forEach(function (el) {
        if (el && el.photo) urls.push(el.photo);
      });
      urls = urls.filter(function (u) { return typeof u === 'string' && u.startsWith('local://'); });
      if (urls.length === 0) return;

      var storage = _storage();
      for (var i = 0; i < maxAttempts; i++) {
        var pending = [];
        for (var u of urls) {
          var rec = await storage.get(storage.stores().PHOTOS, u);
          if (!rec || !rec.data) pending.push(u);
        }
        if (pending.length === 0) return;
        urls = pending;
        await new Promise(function (r) { setTimeout(r, delayMs); });
      }
      console.warn('[EtalonActions] Не все локальные файлы акта дозаписались в IndexedDB перед синхронизацией:', urls);
    },

    // =====================================================================
    // СОХРАНЕНИЕ АКТА-ЭТАЛОНА
    // Перенесено из etalon.js (было window.saveEtalonAct, строка 198).
    // =====================================================================
    saveAct: async function (printAfter = false) {
      // Считываем значения из новых полей
      const selProject = document.getElementById('etalon-project').value.trim();
      const selContractor = document.getElementById('etalon-contractor').value.trim();
      const selTemplateKey = document.getElementById('etalon-template').value;
      const selTemplateTitle = document.getElementById('etalon-template').options[document.getElementById('etalon-template').selectedIndex]?.text.replace(/\[.*?\]\s*/, '') || '';

      const location = document.getElementById('etalon-location').value.trim();
      const participants = document.getElementById('etalon-participants').value.trim();
      const deviations = document.getElementById('etalon-deviations').value.trim() || 'Отклонений не выявлено';
      const myName = _getSetting('engineerName') || 'Инженер';

      if (!selProject || !selContractor || !selTemplateKey) return showToast("⚠️ Укажите Объект, Подрядчика и Вид работ!");
      if (!location || !participants) return showToast("⚠️ Заполните локацию и участников!");

      const elements = [];
      document.querySelectorAll('.etalon-item').forEach(el => {
        const name = el.querySelector('.etalon-el-name').value.trim();
        const desc = el.querySelector('.etalon-el-desc').value.trim();
        const photo = el.querySelector('.etalon-photo-container').dataset.photo || null;
        if (name) elements.push({ name, desc, photo });
      });

      if (elements.length === 0) return showToast("⚠️ Добавьте хотя бы один элемент эталона!");

      let etalonId = window.currentEditingEtalonId || String(Date.now() + Math.floor(Math.random() * 1000));

      const etalonRecord = {
        id: etalonId,
        owner: myName, // Для синхронизации прав
        date: new Date().toISOString(),
        projectName: selProject, // Строго берем из поля Объект
        inspectorName: myName,
        contractorName: selContractor, // Строго берем из поля Подрядчик
        templateKey: selTemplateKey,
        templateTitle: selTemplateTitle,
        location: location,
        instanceId: "etalon",
        stageId: 0,
        stageName: "Акт-Эталон",
        checkedStagesInfo: ["Фиксация эталона"],
        isCompleted: true,
        state: { '9901': 'ok' },
        photos: {},
        details: {
          participants: participants,
          deviations: deviations,
          elements: elements,
          pdfData: document.getElementById('etalon-pdf-preview')?.dataset.pdf || null,
          pdfName: document.getElementById('etalon-pdf-name')?.innerText || ''
        },
        metrics: { final: 100, baseUrkPerc: 100, checkedCount: 1, totalCount: 1, n_B1_fail: 0, n_B2_fail: 0, n_B3_fail: 0, kc: 1, kcrit: 1, statusTxt: "ЭТАЛОН", statusCls: "tag-blue" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'local',
        syncStatus: 'not_synced',
        sync_status: 'not_synced',
        syncBlockReason: '',
        sync_block_reason: '',
        is_deleted: false,
        _deleted: false
      };

      // Сохраняем ТОЛЬКО в массив эталонов
      const etalonActs1 = _etalonActs();
      const idx = etalonActs1.findIndex(x => String(x.id) === String(etalonId));
      if (idx !== -1) {
        etalonActs1[idx] = etalonRecord;
      } else {
        etalonActs1.push(etalonRecord);
      }
      await _storage().put(_storage().stores().ETALON_ACTS, etalonRecord);
      window.currentEditingEtalonId = null; // Сбрасываем ID

      if (_context.statusKey && _getWeeklyPlan().tasks) {
        const task = _getWeeklyPlan().tasks.find(t => t.statusKey === _context.statusKey);
        if (task) {
          task.needsEtalon = false;
          if (_getContractorStatuses()[task.statusKey]) _getContractorStatuses()[task.statusKey].etalonCompleted = true;
          await _storage().put(_storage().stores().SETTINGS, { key: 'weekly_plan_data', data: _getWeeklyPlan() });
        }
      }

      _gameLogAction('etalon_accepted', etalonRecord.id);
      // АВТОЗАКРЫТИЕ ЗАДАЧИ ЭТАЛОНА
      if (Array.isArray(_getTasks())) {
        const etalTasks = _getTasks().filter(t =>
          (t.taskType === 'Эталон' || t.title.includes('Эталон')) &&
          t.contractor === etalonRecord.contractorName &&
          (t.templateKey === etalonRecord.templateKey || t.templateTitle === etalonRecord.templateTitle || t.workTitle === etalonRecord.templateTitle) &&
          t.status === 'pending'
        );
        for (let t of etalTasks) {
          t.status = 'done';
          t.done = 1;
          t.resultComment = 'Акт-Эталон сохранен';
          t.updatedAt = new Date().toISOString();
          if (typeof dbPut === 'function') await _storage().put(_storage().stores().TASKS, t);
        }
        if (etalTasks.length > 0 && typeof rbi_renderTasksList === 'function') {
          rbi_renderTasksList();
        }
      }
      showToast("✅ Акт-Эталон успешно сохранен!");
      localStorage.setItem('rbi_cloud_dirty', '1');
      // RBI FIX (гонка "PDF/фото Акта-Эталона не синхронизируется"): раньше здесь был
      // фиксированный setTimeout(800ms) "на удачу" — на медленном устройстве или при
      // большом PDF запись в IndexedDB могла не успеть завершиться к этому моменту,
      // sync уходил без файла, а сама запись сразу помечалась "синхронизировано" без
      // повторных попыток. Теперь перед запуском синхронизации явно подтверждаем,
      // что все local:// файлы этого акта (PDF + фото элементов) реально читаются
      // из IndexedDB, с повторными попытками — и только затем запускаем sync.
      EtalonActions._waitForLocalFilesReady(etalonRecord)
        .then(() => _triggerSync('silent'))
        .catch(function (e) { console.warn('[EtalonActions] Не удалось подтвердить готовность файлов перед синхронизацией:', e); });

      // Если нажали кнопку "Печать" — открываем PDF
      if (printAfter) {
        setTimeout(() => { window.printEtalonAct(etalonRecord.id); }, 500);
      } else {
        EtalonActions.closeConstructor();
      }

      // Принудительно обновляем все кэши, чтобы Эталон мгновенно появился везде!
      setTimeout(() => {
        var gameSvc = (EtalonActions._ctx && EtalonActions._ctx.game) || (window.RBI && window.RBI.services && window.RBI.services.game);
        if (gameSvc) {
          gameSvc.calculateAllProfiles();
          gameSvc.renderDashboard();
        }
        if (typeof rbi_renderImpactTab === 'function') rbi_renderImpactTab();
        if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();
        if (typeof rbi_renderPracticesTab === 'function') rbi_renderPracticesTab();
      }, 200);

      emit('etalon:act:saved', { id: etalonRecord.id, printAfter: !!printAfter });
    },

    // =====================================================================
    // ПРОСМОТР АКТА-ЭТАЛОНА
    // Перенесено из etalon.js (было window.openEtalonViewer, строка 326).
    // =====================================================================
    openViewer: async function (id, retries = 3) {
      // Пытаемся получить из IndexedDB
      let record = await _storage().get(_storage().stores().ETALON_ACTS, id);
      if (!record && retries > 0) {
        await new Promise(r => setTimeout(r, 150));
        return EtalonActions.openViewer(id, retries - 1);
      }
      const etalonActs2 = _etalonActs();
      if (!record) {
        record = etalonActs2.find(c => String(c.id) === String(id));
        if (!record) {
          showToast("❌ Ошибка: Эталон не найден в базе данных");
          return;
        }
      }

      // Акты, созданные через конструктор «Акт-Эталон (Бета)» (11 разделов,
      // Блок 2 плана OCR-sync + Акт-Эталон Beta), имеют иную модель данных
      // (details.actV18 вместо details.elements) — просмотр/редактирование
      // делегируется полноэкранному конструктору v18 вместо этого модального окна.
      if (record.source_kind === 'act_v18' && window.EtalonV18Actions) {
        return window.EtalonV18Actions.editAct(id);
      }

      // «Акт-Эталон (Бета 2, ПК)» (см. etalon-v18b.actions.js) — точная копия
      // исходной формы v18 через iframe, доступна только на ПК.
      if (record.source_kind === 'act_v18b' && window.EtalonV18BActions) {
        return window.EtalonV18BActions.editAct(id);
      }

      // Обновляем массив
      const idx = etalonActs2.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) etalonActs2[idx] = record;
      else etalonActs2.push(record);

      const d = record.details || {};
      const elements = d.elements || [];

      let elementsHtml = '';
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        let realPhoto = null;
        if (el.photo) {
          if (el.photo.startsWith('cloud://') || el.photo.startsWith('local://')) {
            realPhoto = await PhotoManager.getAsyncUrl(el.photo);
          } else {
            realPhoto = window.getPhotoSrc(el.photo);
          }
        }
        let photoHtml = realPhoto
          ? `<img src="${realPhoto}" class="w-full h-48 object-contain rounded-lg border border-slate-200 cursor-pointer mt-2 bg-slate-50" onclick="openPhotoViewer('${el.photo}')">`
          : '<div class="text-xs text-slate-400 mt-2">Нет фото</div>';

        elementsHtml += `
            <div class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-3">
                <div class="font-black text-[12px] text-slate-800 dark:text-white uppercase mb-1">${i + 1}. ${_escapeHtml(el.name || 'Без названия')}</div>
                <div class="text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-medium">${_escapeHtml(el.desc || 'Нет описания')}</div>
                ${photoHtml}
            </div>
        `;
      }

      const bodyHtml = `
        <div class="text-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div class="text-[12px] font-bold text-slate-500 uppercase leading-tight mb-0.5">${_escapeHtml(record.projectName || 'Без проекта')}</div>
            <div class="text-[14px] font-black text-slate-800 dark:text-white uppercase leading-tight mb-1">${_escapeHtml(record.contractorName)}</div>
            <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">${_escapeHtml(record.templateTitle)}</div>
            <div class="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">${new Date(record.date).toLocaleString('ru-RU')}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Локация</div>
                <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">${_escapeHtml(record.location || '-')}</div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Участники</div>
                <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">${_escapeHtml(d.participants || '-')}</div>
            </div>
        </div>

        <div class="bg-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-50 p-3 rounded-xl border border-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-200 mb-4">
            <div class="text-[10px] font-black uppercase text-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-700 mb-1 tracking-widest">Отклонения и допущения:</div>
            <div class="text-[11px] font-medium text-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-900 whitespace-pre-wrap">${_escapeHtml(d.deviations)}</div>
        </div>

        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Зафиксированные элементы</h3>
        ${elementsHtml}
      `;

      document.getElementById('etalon-view-body').innerHTML = bodyHtml;
      // Если прикреплен PDF, выводим кнопку для его открытия
      if (d.pdfData) {
        const pdfBtnHtml = `
            <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex justify-between items-center cursor-pointer active:scale-95 transition-transform" onclick="document.getElementById('etalon-view-modal').style.display='none'; document.body.classList.remove('modal-open'); setTimeout(() => { window.openFakePdfViewer('${d.pdfData}', '${d.pdfName}'); }, 300);">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black">PDF</div>
                    <div>
                        <div class="text-[11px] font-bold text-slate-800 dark:text-white">${d.pdfName}</div>
                        <div class="text-[9px] text-slate-500">Внешний Акт-Эталон</div>
                    </div>
                </div>
                <span class="text-[10px] font-bold text-red-600 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-red-200">Открыть</span>
            </div>
        `;
        document.getElementById('etalon-view-body').insertAdjacentHTML('beforeend', pdfBtnHtml);
      }

      // БЕЗОПАСНАЯ ВСТАВКА 3-Х КНОПОК (БЕЗ ОШИБКИ НА ВТОРОЙ КЛИК)
      const footerDiv = document.getElementById('etalon-view-body').nextElementSibling;
      if (footerDiv) {
        footerDiv.innerHTML = `
            <div class="flex gap-2 w-full">
                <button onclick="editEtalonAct('${id}')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-sm active:scale-95">✏️ Изменить</button>
                <button onclick="document.getElementById('etalon-view-modal').style.display='none'; document.body.classList.remove('modal-open'); printEtalonAct('${id}');" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95">🖨️ PDF</button>
                <button onclick="deleteEtalonAct('${id}')" class="bg-red-50 text-red-600 border border-red-200 px-4 py-3.5 rounded-xl font-black text-lg active:scale-95 shadow-sm">🗑️</button>
            </div>
        `;
      }

      const modal = document.getElementById('etalon-view-modal');
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    },

    // =====================================================================
    // УДАЛЕНИЕ АКТА-ЭТАЛОНА
    // Перенесено из etalon.js (было window.deleteEtalonAct, строка 435).
    // =====================================================================
    deleteAct: async function (id) {
      const etalonActs3 = _etalonActs();
      const record = etalonActs3.find(c => String(c.id) === String(id));
      // Проверяем права по owner или по inspectorName
      var permSvc = (EtalonActions._ctx && EtalonActions._ctx.permissions) || (window.RBI && window.RBI.services && window.RBI.services.permissions);
      if (record && permSvc && !permSvc.canDelete(record.owner || record.inspectorName)) return showToast("⚠️ Нет прав на удаление чужого эталона!");

      if (!confirm("Удалить этот Акт-Эталон?")) return;
      if (record) {
        record._deleted = true;
        record.is_deleted = true; // ЖЕСТКИЙ ФЛАГ ДЛЯ ОБЛАКА
        record.updatedAt = new Date().toISOString();
        record.updated_at = record.updatedAt;

        // Переводим в статус "Не синхронизировано", чтобы улетело в облако
        record.source = 'local';
        record.syncStatus = 'not_synced';
        record.sync_status = 'not_synced';

        await _storage().put(_storage().stores().ETALON_ACTS, record);

        // ЖЕСТКАЯ ОЧИСТКА МАССИВА В ОЗУ ДЛЯ МГНОВЕННОГО ОБНОВЛЕНИЯ ЭКРАНА
        // Мутация на месте (не переприсваивание) — сохраняет живую ссылку,
        // на которую полагается EtalonState.getActs() (по прецеденту reportsArray).
        var filtered = etalonActs3.filter(function (e) { return !e._deleted; });
        etalonActs3.length = 0;
        Array.prototype.push.apply(etalonActs3, filtered);

        localStorage.setItem('rbi_cloud_dirty', '1');
        _triggerSync('silent');
      }
      document.getElementById('etalon-view-modal').style.display = 'none';
      document.body.classList.remove('modal-open');
      showToast("🗑️ Эталон удален");

      // Обновляем экраны (Теперь эталоны живут в Практиках)
      if (typeof rbi_renderPracticesTab === 'function') rbi_renderPracticesTab();
      if (typeof renderHistoryTab === 'function') renderHistoryTab();

      emit('etalon:act:deleted', { id: id });
    },

    // =====================================================================
    // РЕДАКТИРОВАНИЕ АКТА-ЭТАЛОНА
    // Перенесено из etalon.js (было window.editEtalonAct, строка 469).
    // =====================================================================
    editAct: async function (id) {
      document.getElementById('etalon-view-modal').style.display = 'none';
      const record = _etalonActs().find(c => String(c.id) === String(id));
      if (!record) return;

      window.currentEditingEtalonId = id; // Глобально запоминаем ID
      EtalonActions.openConstructor(record.contractorName, record.templateKey, record.templateTitle, record.projectName, null);

      // Заполняем поля
      document.getElementById('etalon-location').value = record.location || '';
      document.getElementById('etalon-participants').value = record.details.participants || '';
      document.getElementById('etalon-deviations').value = record.details.deviations || '';

      // Очищаем и заполняем элементы
      document.getElementById('etalon-elements-container').innerHTML = '';
      _elementCounter = 0;

      for (let el of record.details.elements) {
        EtalonActions.addElement();
        const elId = `etalon-el-${_elementCounter}`;
        const node = document.getElementById(elId);
        node.querySelector('.etalon-el-name').value = el.name || '';
        node.querySelector('.etalon-el-desc').value = el.desc || '';

        if (el.photo) {
          const realPhotoSrc = await PhotoManager.getAsyncUrl(el.photo) || window.getPhotoSrc(el.photo);
          const container = node.querySelector('.etalon-photo-container');
          container.dataset.photo = el.photo;
          container.innerHTML = `
                <div class="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 dark:bg-slate-900 mt-2">
                    <img src="${realPhotoSrc}" class="w-full h-full object-contain cursor-pointer" onclick="setTimeout(() => openPhotoViewer('${el.photo}'), 100)">
                    <button onclick="removeEtalonPhoto('${elId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md active:scale-90">✕</button>
                </div>`;
        }
      }
    },

    // =====================================================================
    // ЗАГРУЗКА ГОТОВОГО PDF-АКТА
    // Перенесено из etalon.js (было window.handleEtalonPdfUpload, строка 506).
    // =====================================================================
    handlePdfUpload: function (event) {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { event.target.value = ''; return showToast("Файл слишком большой! Максимум 5 МБ."); }

      showToast("⚙️ Сохранение PDF...");
      const reader = new FileReader();
      reader.onload = async function (e) {
        const localUrl = await PhotoManager.saveLocal(e.target.result, 'etalon_pdf');

        const cont = document.getElementById('etalon-pdf-preview');
        cont.dataset.pdf = localUrl;
        document.getElementById('etalon-pdf-name').innerText = file.name;

        cont.classList.remove('hidden');
        document.getElementById('etalon-pdf-upload-btn').classList.add('hidden');
        event.target.value = '';
      }
      reader.readAsDataURL(file);
    },

    // =====================================================================
    // УДАЛЕНИЕ ПРИКРЕПЛЁННОГО PDF
    // Перенесено из etalon.js (было window.removeEtalonPdf, строка 527).
    // =====================================================================
    removePdf: function () {
      const cont = document.getElementById('etalon-pdf-preview');
      cont.dataset.pdf = '';
      cont.classList.add('hidden');
      document.getElementById('etalon-pdf-upload-btn').classList.remove('hidden');
    },

    /**
     * Синхронизирует состояние из legacy-переменных.
     */
    syncFromLegacy: function () {
      if (window.EtalonState) {
        window.EtalonState.syncFromLegacy();
      }
    }
  };

  window.EtalonActions = EtalonActions;

  // =========================================================================
  // РАЗМЕТКА МОДАЛКИ ETALON-VIEW (перенос из index.html:2045-2081, перенос
  // 30 modal/overlay-блоков #app-modals в JS-рендер). HTML-строка 1:1
  // идентична прежней статичной разметке.
  // =========================================================================
  function renderEtalonViewModalMarkup() {
    return `
    <div id="etalon-view-modal"
        class="fixed inset-0 bg-slate-900/80 z-[7000] hidden items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
        onclick="this.style.display='none'; document.body.classList.remove('modal-open');">
        <div class="bg-[var(--card-bg)] w-full max-w-2xl max-h-[95vh] rounded-2xl shadow-2xl border border-[var(--card-border)] flex flex-col overflow-hidden"
            onclick="event.stopPropagation()">
            <div
                class="p-4 border-b border-[var(--card-border)] bg-[var(--hover-bg)] flex justify-between items-center shrink-0">
                <div
                    class="font-black text-[13px] uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                        </path>
                    </svg>
                    Акт-Эталон
                </div>
                <button
                    onclick="document.getElementById('etalon-view-modal').style.display='none'; document.body.classList.remove('modal-open');"
                    class="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 active:scale-90 shadow-sm border border-slate-200 dark:border-slate-700">✕</button>
            </div>
            <div id="etalon-view-body" class="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <!-- Контент генерируется JS -->
            </div>
            <div class="p-4 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <button id="etalon-view-print-btn"
                    class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z">
                        </path>
                    </svg>
                    Скачать / Распечатать (PDF)
                </button>
            </div>
        </div>
    </div>
`;
  }

  (function mountEtalonViewModalMarkup() {
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
      ? window.RBI.services.shell.getModalsRoot()
      : document.getElementById('app-modals');
    if (!root) return;
    if (!document.getElementById('etalon-view-modal')) {
      root.insertAdjacentHTML('beforeend', renderEtalonViewModalMarkup());
    }
  }());

  // =========================================================================
  // WINDOW-ПРОКСИ (обратная совместимость: index.html inline-обработчики,
  // динамически генерируемый HTML, knowledge.legacy.js, interventions.js,
  // history.render.js, tasks.module.js, audit.actions.js:722).
  // =========================================================================
  window.openEtalonConstructor    = EtalonActions.openConstructor.bind(EtalonActions);
  window.closeEtalonConstructor   = EtalonActions.closeConstructor.bind(EtalonActions);
  window.addEtalonElement         = EtalonActions.addElement.bind(EtalonActions);
  window.triggerEtalonPhotoUpload = EtalonActions.triggerPhotoUpload.bind(EtalonActions);
  window.saveEtalonMarkupPhoto    = EtalonActions.saveMarkupPhoto.bind(EtalonActions);
  window.removeEtalonPhoto        = EtalonActions.removePhotoEl.bind(EtalonActions);
  window.saveEtalonAct            = EtalonActions.saveAct.bind(EtalonActions);
  window.openEtalonViewer         = EtalonActions.openViewer.bind(EtalonActions);
  window.deleteEtalonAct          = EtalonActions.deleteAct.bind(EtalonActions);
  window.editEtalonAct            = EtalonActions.editAct.bind(EtalonActions);
  window.handleEtalonPdfUpload    = EtalonActions.handlePdfUpload.bind(EtalonActions);
  window.removeEtalonPdf          = EtalonActions.removePdf.bind(EtalonActions);

  console.log('[EtalonActions] etalon.actions.js loaded (owner-module: full business logic)');
}());
