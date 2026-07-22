// ─── audit.actions.js — Фаза 15: бизнес-действия вкладки «Аудит» (owner-module) ─
// Реализация перенесена из audit.legacy.js. Источник данных — AuditState.*
// (window.state/.details/.photos/.currentTemplateKey/.currentChecklist по
// ссылке). Остальные глобалы (app.js) используются как есть (bare identifiers).
// Эмитит кастомные события для межмодульной коммуникации (сохранён паттерн
// делегатора, существовавший ранее в этом файле).

(function () {
  'use strict';

  function emit(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {
      console.warn('[AuditActions] emit error:', e);
    }
  }

  // Фаза 50-B (перенесено из audit.legacy.js): единая точка доступа к
  // настройкам через SettingsService с fallback.
  function _getSetting(key) {
    if (AuditActions._ctx && AuditActions._ctx.settings) return AuditActions._ctx.settings.get(key);
    return window.RBI.services.settings.get(key);
  }

  // Фаза 131 (перенесено из audit.legacy.js): единая точка записи настроек
  // через SettingsService или fallback.
  function _setSetting(key, value) {
    if (AuditActions._ctx && AuditActions._ctx.settings) return AuditActions._ctx.settings.set(key, value);
    return window.RBI.services.settings.set(key, value);
  }

  // Единая точка вызова gameLogAction через GameService (owner: gamification)
  // с fallback на bare-обращение.
  function _gameLogAction(actionType, targetId) {
    if (AuditActions._ctx && AuditActions._ctx.game) {
      return AuditActions._ctx.game.logAction(actionType, targetId);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
      return window.RBI.services.game.logAction(actionType, targetId);
    }
    if (typeof gameLogAction === 'function') return gameLogAction(actionType, targetId);
  }

  // Межмодульное чтение customExpertConclusions (owner: quality/reports) через
  // ReportService с fallback на bare-обращение.
  function _reports() {
    if (AuditActions._ctx && AuditActions._ctx.reports) {
      return AuditActions._ctx.reports;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.reports) {
      return window.RBI.services.reports;
    }
    return {
      getExpertConclusions: function () {
        return typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {};
      }
    };
  }

  // Фаза 59 (перенесено из audit.legacy.js): изоляция isDemoMode через
  // AppModeService с fallback.
  function _isDemoMode() {
    if (AuditActions._ctx && AuditActions._ctx.appMode) return AuditActions._ctx.appMode.isDemo();
    return window.RBI.services.appMode.isDemo();
  }

  // Фаза 65 (перенесено из audit.legacy.js): изоляция SyncQueueManager через
  // SyncService с fallback.
  function _syncEnqueue(action, payload) {
    if (AuditActions._ctx && AuditActions._ctx.sync &&
      typeof AuditActions._ctx.sync.enqueue === 'function') {
      AuditActions._ctx.sync.enqueue(action, payload);
      return;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.sync &&
      typeof window.RBI.services.sync.enqueue === 'function') {
      window.RBI.services.sync.enqueue(action, payload);
      return;
    }
    if (window.SyncQueueManager && typeof window.SyncQueueManager.enqueue === 'function') {
      window.SyncQueueManager.enqueue(action, payload);
    }
  }

  // Фаза 74 (перенесено из audit.legacy.js): изоляция userTemplates через
  // TemplateService с fallback.
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
      getByKey: function (key) {
        var ut = typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
        return ut[key] || null;
      },
      getSystemTemplates: function () {
        return typeof window.SYSTEM_TEMPLATES !== 'undefined' ? window.SYSTEM_TEMPLATES : {};
      }
    };
  }

  // Фаза 88 (перенесено из audit.legacy.js): единая точка доступа к
  // syncConfig через SyncService или fallback.
  function _syncConfig() {
    if (AuditActions._ctx && AuditActions._ctx.sync &&
      typeof AuditActions._ctx.sync.getConfig === 'function') {
      return AuditActions._ctx.sync.getConfig();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.sync &&
      typeof window.RBI.services.sync.getConfig === 'function') {
      return window.RBI.services.sync.getConfig();
    }
    return window.syncConfig || {};
  }

  // Фаза 101 (перенесено из audit.legacy.js): единая точка доступа к
  // IndexedDB через StorageService или fallback.
  function _storage() {
    if (AuditActions._ctx && AuditActions._ctx.storage) {
      return AuditActions._ctx.storage;
    }
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
    if (AuditActions._ctx && AuditActions._ctx.tasks) {
      return AuditActions._ctx.tasks.getTasksSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
      return window.RBI.services.tasks.getTasksSync();
    }
    return typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : [];
  }

  function _getAllInspections() {
    if (AuditActions._ctx && AuditActions._ctx.inspections) {
      return AuditActions._ctx.inspections.getAllSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
      return window.RBI.services.inspections.getAllSync();
    }
    return Array.isArray(window.contractorArray) ? window.contractorArray : [];
  }

  function _pushInspection(item) {
    if (AuditActions._ctx && AuditActions._ctx.inspections) {
      return AuditActions._ctx.inspections.pushSync(item);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
      return window.RBI.services.inspections.pushSync(item);
    }
    if (Array.isArray(window.contractorArray)) {
      window.contractorArray.push(item);
      return true;
    }
    return false;
  }

  // Фаза 122 (перенесено из audit.legacy.js): единая точка вызова
  // синхронизации через SyncService или fallback.
  function _sync(mode) {
    var m = mode || 'silent';
    if (AuditActions._ctx && AuditActions._ctx.sync) {
      return AuditActions._ctx.sync.trigger(m);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.sync) {
      return window.RBI.services.sync.trigger(m);
    }
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
  }

  // Примечание («Что разобрать» п.3 плана): _session() из audit.legacy.js не
  // вызывался нигде внутри самого файла (подтверждено Grep) — мёртвый код,
  // не переносится (YAGNI).

  var AuditActions = {
    _ctx: null,
    bindCtx: function (ctx) { this._ctx = ctx; },

    // =====================================================================
    // АВТОСОХРАНЕНИЕ ЧЕРНОВИКА (debounce)
    // Перенесено из audit.legacy.js (было в app.js, строка 437).
    // =====================================================================
    scheduleSessionSave: function () {
      localStorage.setItem('rbi_cloud_dirty', '1');
      clearTimeout(window.__saveSessionTimer);
      window.__saveSessionTimer = setTimeout(function () {
        AuditActions.saveSession();
      }, 500);
    },

    // =====================================================================
    // СОХРАНЕНИЕ СЕССИИ В IndexedDB
    // Перенесено из audit.legacy.js (было в app.js, строка 457).
    // =====================================================================
    saveSession: async function () {
      if (_isDemoMode()) return;
      try {
        await _storage().put(_storage().stores().STATE, {
          key: 'current_session',
          timestamp: Date.now(),
          templateKey: AuditState.currentTemplateKey,
          project: document.getElementById('inp-project') ? document.getElementById('inp-project').value : '',
          inspector: document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value : '',
          contractor: document.getElementById('inp-contractor') ? document.getElementById('inp-contractor').value : '',
          location: document.getElementById('inp-location') ? document.getElementById('inp-location').value : '',
          state: AuditState.state, details: AuditState.details, photos: AuditActions.getSessionPhotosForSync(),
          customExpertConclusions: _reports().getExpertConclusions()
        });
        emit('audit:session:saved');
      } catch (e) {
        console.error('Ошибка сохранения в IndexedDB:', e);
        showToast('⚠️ Ошибка автосохранения!');
      }
    },

    // =====================================================================
    // ПОЛУЧЕНИЕ ФОТО СЕССИИ БЕЗ ФОТО ДЕФЕКТОВ СК
    // Перенесено из audit.legacy.js (было в app.js, строка 448).
    // =====================================================================
    getSessionPhotosForSync: function () {
      var sessionPhotos = {};
      var photos = AuditState.photos;
      Object.keys(photos || {}).forEach(function (key) {
        if (String(key).startsWith('def_')) return;
        sessionPhotos[key] = AuditState.photos[key];
      });
      return sessionPhotos;
    },

    // =====================================================================
    // ПЕРЕКЛЮЧЕНИЕ СТАТУСА OK
    // Перенесено из audit.legacy.js (было в app.js, строка 2841).
    // =====================================================================
    toggleOk: function (id) {
      if (AuditState.state[id] === 'ok') {
        AuditState.setState(id, null); delete AuditState.photos[id]; delete AuditState.details[id];
      } else {
        AuditState.setState(id, 'ok'); delete AuditState.details[id];
      }
      window.updateCardDOM(id); window.updateUI(); AuditActions.scheduleSessionSave();
      emit('audit:state:changed', { posId: id, action: 'ok' });
    },

    // =====================================================================
    // ПЕРЕКЛЮЧЕНИЕ СТАТУСА FAIL
    // Перенесено из audit.legacy.js (было в app.js, строка 2850).
    // =====================================================================
    toggleFail: function (id) {
      if (AuditState.state[id] === 'fail' || AuditState.state[id] === 'fail_escalated') {
        AuditState.setState(id, null); delete AuditState.photos[id]; delete AuditState.details[id];
      } else {
        AuditState.setState(id, 'fail'); delete AuditState.details[id];
      }
      window.updateCardDOM(id); window.updateUI(); AuditActions.scheduleSessionSave();
      emit('audit:state:changed', { posId: id, action: 'fail' });
    },

    // =====================================================================
    // ПЕРЕКЛЮЧЕНИЕ ЭСКАЛАЦИИ (B2 → B3)
    // Перенесено из audit.legacy.js (было в app.js, строка 2859).
    // =====================================================================
    toggleEscalation: function (id) {
      if (AuditState.state[id] === 'fail_escalated') AuditState.setState(id, 'fail');
      else if (AuditState.state[id] === 'fail') AuditState.setState(id, 'fail_escalated');
      window.updateCardDOM(id); window.updateUI(); AuditActions.scheduleSessionSave();
      emit('audit:state:changed', { posId: id, action: 'escalation' });
    },

    // =====================================================================
    // СМЕНА ШАБЛОНА (ВИДА РАБОТ)
    // Перенесено из audit.legacy.js (было в app.js, строка 2742).
    // Вызывается из index.html: onchange="changeTemplate(this.value)"
    // =====================================================================
    changeTemplate: function (val) {
      if (val === 'HOME') {
        AuditState.setTemplate('');
        if (document.getElementById('checklist-selector')) document.getElementById('checklist-selector').value = '';
        AuditState.resetSession(); assignPhotosMap({});

        var pInp = document.getElementById('inp-project');
        var cInp = document.getElementById('inp-contractor');
        if (pInp && !pInp.hasAttribute('readonly') && !pInp.disabled) pInp.value = '';
        if (cInp && !cInp.hasAttribute('readonly')) cInp.value = '';
        if (document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

        switchTab('tab-audit');
        document.getElementById('empty-checklist-state').style.display = 'block';
        document.getElementById('audit-items').style.display = 'none';
        document.getElementById('audit-actions').style.display = 'none';

        var nav = document.getElementById('audit-group-nav');
        if (nav) { nav.innerHTML = ''; nav.classList.add('hidden'); }

        document.getElementById('data-block-summary')?.classList.add('hidden');
        if (document.getElementById('current-checklist-label')) document.getElementById('current-checklist-label').innerText = 'Вид работ не выбран';

        AuditActions.saveSession();
        if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
        emit('audit:state:changed', { action: 'template', key: val });
        return;
      }

      if (val === 'UPLOAD') {
        document.getElementById('json-input').click();
        document.getElementById('checklist-selector').value = AuditState.currentTemplateKey || "";
        return;
      }

      AuditState.setTemplate(val);
      var type = val.split('_')[0];
      var key = val.replace(type + '_', '');

      if (type === 'sys' && _templates().getSystemTemplates()[key]) AuditState.setChecklist(_templates().getSystemTemplates()[key].groups);
      else if (type === 'user' && _templates().getUserTemplates()[key]) AuditState.setChecklist(_templates().getUserTemplates()[key].groups);

      AuditState.resetSession(); assignPhotosMap({});

      var pInp2 = document.getElementById('inp-project');
      var cInp2 = document.getElementById('inp-contractor');
      if (pInp2 && !pInp2.hasAttribute('readonly') && !pInp2.disabled) pInp2.value = '';
      if (cInp2 && !cInp2.hasAttribute('readonly')) cInp2.value = '';
      if (document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

      AuditActions.saveSession();

      if (document.getElementById('checklist-selector')) {
        document.getElementById('checklist-selector').value = val;
      }
      window.updateDataSummary();

      document.getElementById('empty-checklist-state').style.display = 'none';
      document.getElementById('audit-items').style.display = 'block';
      document.getElementById('audit-actions').style.display = 'grid';

      if (document.getElementById('tab-audit').classList.contains('active')) { window.render(); window.updateUI(); }
      if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
      emit('audit:state:changed', { action: 'template', key: val });
    },

    // =====================================================================
    // СБРОС ТЕКУЩЕГО ЧЕКЛИСТА
    // Перенесено из audit.legacy.js (было в app.js, строка 3779).
    // Вызывается из index.html: onclick="resetChecklist()"
    // =====================================================================
    resetChecklist: function () {
      if (!confirm('Очистить только текущий чек-лист?')) return;
      AuditState.resetSession(); assignPhotosMap({}); document.getElementById('inp-location').value = '';
      AuditActions.saveSession(); window.render(); window.updateUI();
      emit('audit:state:changed', { action: 'reset' });
    },

    // =====================================================================
    // СОХРАНЕНИЕ ПРОВЕРКИ В ИСТОРИЮ
    // Перенесено из audit.legacy.js (было в app.js, строка 3347).
    // Вызывается из index.html: onclick="saveProductToArray()"
    // =====================================================================
    saveProductToArray: async function () {
      var _permSvc = (AuditActions._ctx && AuditActions._ctx.permissions) || window.RBI.services.permissions;
      if (_permSvc && !_permSvc.canCreate()) {
        return showToast("⛔ Ваша роль не позволяет создавать проверки");
      }
      var projInput = document.getElementById('inp-project');
      var inspInput = document.getElementById('inp-inspector');
      var contrInput = document.getElementById('inp-contractor');
      var secInput = document.getElementById('inp-section');
      var floorInput = document.getElementById('inp-floor');
      var roomInput = document.getElementById('inp-room');
      var locHidden = document.getElementById('inp-location');

      if (_getSetting('engineerName')) {
        if (inspInput) inspInput.value = _getSetting('engineerName');
      }

      if (!inspInput || !inspInput.value.trim()) {
        return showToast('⚠️ Укажите ваше Имя во вкладке "Инженер -> Профиль" перед сохранением!');
      }

      var hasError = false;

      [projInput, contrInput, secInput].forEach(function (el) {
        if (el && !el.value.trim()) {
          el.classList.add('border-red-500', 'bg-red-50');
          setTimeout(function () { el.classList.remove('border-red-500', 'bg-red-50'); }, 3000);
          hasError = true;
        }
      });

      if (hasError) {
        showToast('⚠️ Заполните все поля со звездочкой (Объект, Подрядчик, Секция)!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      var isCloudConnected = _syncConfig().enabled && _syncConfig().projectCode;
      var _permSvc2 = (AuditActions._ctx && AuditActions._ctx.permissions) || window.RBI.services.permissions;
      var currentRole = _permSvc2 ? _permSvc2.getCurrentRole() : 'guest';

      if (isCloudConnected && currentRole === 'engineer' && projInput.tagName.toLowerCase() === 'input') {
        var newObjName = projInput.value.trim();

        if (!_getSetting('pendingAssignedProjects')) _setSetting('pendingAssignedProjects', []);
        var exists = (_getSetting('pendingAssignedProjects') || []).some(function (p) { return p.raw_name === newObjName; });

        if (!exists) {
          var _pap = _getSetting('pendingAssignedProjects') || [];
          _pap.push({
            raw_name: newObjName,
            status: 'pending',
            created_at: new Date().toISOString()
          });
          _setSetting('pendingAssignedProjects', _pap);

          // Единый путь отправки заявки на привязку инженера к объекту
          // (симметрично window.addAssignedProject) — раньше здесь был отдельный
          // прямой update() без request_type, из-за чего заявка не попадала под
          // фильтр панели «Команда» согласованно с остальными путями, и ошибки
          // сети/RLS проглатывались молча (не было .catch()). См. current_plan.md §2.2.
          if (typeof window.pushObjectRequestToCloud === 'function') {
            window.pushObjectRequestToCloud({
              raw_name: newObjName,
              canonical_key: '',
              display_name: newObjName,
              status: 'pending',
              request_type: 'profile_only',
              created_at: new Date().toISOString()
            }).catch(function (e) {
              console.warn('[AuditActions] Не удалось отправить заявку на объект:', e);
              localStorage.setItem('rbi_cloud_dirty', '1');
            });
          }
          showToast(`🏢 Объект "${newObjName}" отправлен на согласование руководителю.`);
        }
      }

      var locVal = locHidden.value.trim();
      var projVal = projInput.value.trim();
      var contrVal = contrInput.value.trim();

      var _inspections = _getAllInspections();
      var isDuplicate = _inspections.some(function (item) {
        return item.projectName === projVal &&
          item.contractorName === contrVal &&
          item.templateKey === AuditState.currentTemplateKey &&
          item.location === locVal;
      });

      if (isDuplicate) {
        return showToast('⚠️ Проверка с такой локацией уже существует в Истории!');
      }

      var settingsChanged = false;
      if (!_getSetting('defaultProject') && projInput.value.trim()) {
        _setSetting('defaultProject', projInput.value.trim());
        settingsChanged = true;
      }
      if (settingsChanged && !_isDemoMode()) {
        applySmartLocks();
      }

      var mergedState = {};
      var mergedDetails = {};
      var mergedPhotos = {};
      var checkedStageNames = [];
      var stagesToMetric = [];

      AuditState.currentChecklist.forEach(function (group) {
        var hasAnswersInStage = false;
        group.items.forEach(function (item) {
          if (AuditState.state[item.id]) {
            mergedState[item.id] = AuditState.state[item.id];
            if (AuditState.details[item.id]) mergedDetails[item.id] = AuditState.details[item.id];
            if (AuditState.photos[item.id]) mergedPhotos[item.id] = AuditState.photos[item.id];
            hasAnswersInStage = true;
          }
        });

        if (hasAnswersInStage) {
          checkedStageNames.push(group.group || group.title);
          stagesToMetric.push(group);
        }
      });

      if (checkedStageNames.length === 0) {
        return showToast('⚠️ Чек-лист пуст. Заполните хотя бы один пункт.');
      }

      var finalMetrics = getProductMetrics(mergedState, stagesToMetric);
      var isFullCheck = checkedStageNames.length === AuditState.currentChecklist.length;
      var stageNameLabel = isFullCheck ? 'Полная проверка' : 'Частичная проверка';

      if (finalMetrics.escalated_found) {
        _gameLogAction('escalation_bonus', 'esc');
      }
      if (AuditState.currentTemplateKey === 'sys_etalon_act' && Object.keys(mergedPhotos).length > 0) {
        _gameLogAction('etalon_accepted', 'etalon');
      }

      var selectEl = document.getElementById('checklist-selector');
      var tTitle = selectEl.options[selectEl.selectedIndex].text.replace('▼', '').trim();

      var instanceId = "default";
      if (secInput.value && floorInput.value) instanceId = `${secInput.value.replace(/[^\d-]/g, '')}_${floorInput.value.replace(/[^\d-]/g, '')}`;

      var dbPhotos = {};
      for (var photoId in mergedPhotos) {
        var photoArr = window.normalizeItemPhotos(mergedPhotos[photoId]);
        var savedArr = [];
        for (var pi = 0; pi < photoArr.length; pi++) {
          var photoData = photoArr[pi];
          if (photoData && photoData.startsWith('data:image')) {
            savedArr.push(await PhotoManager.saveLocal(photoData, 'hist'));
          } else {
            savedArr.push(photoData);
          }
        }
        dbPhotos[photoId] = savedArr;
      }

      var rawProjectValue = projInput.value.trim();
      var rawProjectName = (projInput.dataset && projInput.dataset.displayName) ? projInput.dataset.displayName : rawProjectValue;

      var projectCanonicalKey = rawProjectValue;
      var projectDisplayName = rawProjectName;

      if (typeof ObjectDirectory !== 'undefined' && Array.isArray(ObjectDirectory.objects)) {
        var clean = ObjectDirectory.cleanString
          ? ObjectDirectory.cleanString(rawProjectName)
          : rawProjectName.toLowerCase().trim();

        var foundObj = ObjectDirectory.objects.find(function (o) {
          var displayClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(o.display_name || '') : String(o.display_name || '').toLowerCase().trim();
          var keyClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(o.canonical_key || '') : String(o.canonical_key || '').toLowerCase().trim();

          var synonymMatch = Array.isArray(o.synonyms)
            ? o.synonyms.some(function (syn) {
              var synClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(syn) : String(syn).toLowerCase().trim();
              return synClean === clean;
            })
            : false;

          return displayClean === clean || keyClean === clean || synonymMatch;
        });

        if (foundObj) {
          projectCanonicalKey = foundObj.canonical_key || '';
          projectDisplayName = foundObj.display_name || rawProjectName;
        }
      }

      if (!projectCanonicalKey) {
        projectCanonicalKey = rawProjectValue || rawProjectName;
      }

      var contractorNormalized = typeof window.normalizeInspectionContractorBeforeSave === 'function'
        ? await window.normalizeInspectionContractorBeforeSave()
        : {
          contractor_raw_name: contrInput.value.trim(),
          contractor_name: contrInput.value.trim(),
          contractor_canonical_key: '',
          contractor_normalization_status: 'pending',
          contractorId: ''
        };

      var _appMode = (AuditActions._ctx && AuditActions._ctx.appMode)
        ? AuditActions._ctx.appMode.getMode()
        : (window.RBI && window.RBI.services && window.RBI.services.appMode)
          ? window.RBI.services.appMode.getMode()
          : (window.AppModeManager ? window.AppModeManager.currentMode : 'quality');
      var isConstructionMode = (_appMode === 'construction') || window.activeAcceptanceRequestId;
      var inspType = isConstructionMode ? 'sk_acceptance' : 'rbi_audit';

      var initialSyncStatus = isConstructionMode ? 'blocked' : 'not_synced';
      var initialSyncReason = isConstructionMode ? 'Модуль СК временно отключен от облака' : '';

      var newItem = {
        id: String(Date.now() + Math.floor(Math.random() * 1000)),
        date: new Date().toISOString(),
        projectName: projectDisplayName,
        project_canonical_key: projectCanonicalKey,
        project_display_name: projectDisplayName,
        inspectorName: inspInput.value.trim(),
        contractorName: contractorNormalized.contractor_name || contrInput.value.trim(),
        contractor_name: contractorNormalized.contractor_name || contrInput.value.trim(),
        contractor_raw_name: contractorNormalized.contractor_raw_name || contrInput.value.trim(),
        contractor_canonical_key: contractorNormalized.contractor_canonical_key || '',
        contractor_normalization_status: contractorNormalized.contractor_normalization_status || 'pending',
        contractorId: contractorNormalized.contractorId || '',
        templateKey: AuditState.currentTemplateKey,
        templateTitle: tTitle,
        section: secInput.value.trim(),
        floor: floorInput.value.trim(),
        room: roomInput.value.trim(),
        location: locHidden.value.trim(),
        instanceId: instanceId,
        stageId: 0,
        stageName: stageNameLabel,
        checkedStagesInfo: checkedStageNames,
        isCompleted: isFullCheck,
        state: JSON.parse(JSON.stringify(mergedState)),
        details: JSON.parse(JSON.stringify(mergedDetails)),
        photos: dbPhotos,
        metrics: finalMetrics,
        inspection_type: inspType,
        source: 'local',
        syncStatus: initialSyncStatus,
        sync_status: initialSyncStatus,
        syncBlockReason: initialSyncReason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      _pushInspection(newItem);
      if (!_isDemoMode()) {
        await _storage().put(_storage().stores().HISTORY, newItem);
        _syncEnqueue('SAVE_INSPECTION', newItem);
      }

      if (isConstructionMode) {
        var createdDefects = [];

        var futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        var defaultDeadline = futureDate.toISOString().split('T')[0];

        for (var itemId in mergedState) {
          var stateVal = mergedState[itemId];
          if (stateVal === 'fail' || stateVal === 'fail_escalated') {
            var flatList = getFlatList(AuditState.currentChecklist);
            var itemInfo = flatList.find(function (x) { return String(x.id) === String(itemId); });
            if (!itemInfo) continue;

            var cleanNorm = itemInfo.t ? itemInfo.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ") : "";
            var desc = `Нарушение: ${itemInfo.n}.`;
            if (cleanNorm && cleanNorm !== 'Без норматива') desc += ` Требования: ${cleanNorm}`;

            if (mergedDetails[itemId] && mergedDetails[itemId].comment) {
              desc += `\nУточнение инженера: ${mergedDetails[itemId].comment}`;
            }

            var category = 'B2';
            if (stateVal === 'fail_escalated' || itemInfo.w === 3) category = 'B3';
            else if (itemInfo.w === 1) category = 'B1';

            var newDefectId = 'def_auto_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);

            // Дефект СК — своя однофото-семантика (не входит в этот блок): берём
            // первое фото пункта чек-листа из массива (mergedPhotos[itemId]).
            var defectPhoto = window.normalizeItemPhotos(mergedPhotos[itemId])[0] || null;
            if (defectPhoto && AuditState.photos) {
              AuditState.photos[newDefectId] = defectPhoto;
            }

            var newDefect = {
              id: newDefectId,
              x: 50, y: 50,
              templateKey: AuditState.currentTemplateKey,
              itemId: String(itemId),
              itemName: itemInfo.n,
              normText: itemInfo.t,
              text: itemInfo.n,
              category: category,
              deadline: defaultDeadline,
              contractor: contractorNormalized.contractor_name || contrInput.value.trim(),
              contractorId: contractorNormalized.contractorId || '',
              description: desc,
              photo: defectPhoto,
              status: 'issued',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: inspInput.value.trim() || 'Инженер',
              locationDesc: locHidden.value.trim()
            };

            createdDefects.push(newDefect);
          }
        }

        if (createdDefects.length > 0) {
          setTimeout(function () {
            emit('audit:defectsCreated', { defects: createdDefects });
          }, 1000);
        }
      }

      updateSmartInputCache('projectName', projInput.value.trim());
      updateSmartInputCache('contractorName', contractorNormalized.contractor_name || contrInput.value.trim());
      updateSmartInputCache('section', secInput.value.trim());
      updateSmartInputCache('floor', floorInput.value.trim());
      updateSmartInputCache('room', roomInput.value.trim());

      var _inspectionsForPast = _getAllInspections();
      var pastChecks = _inspectionsForPast.filter(function (c) {
        return c.contractorName === (contractorNormalized.contractor_name || contrInput.value.trim()) &&
          c.templateKey === AuditState.currentTemplateKey;
      });
      if (pastChecks.length === 1 && typeof gameGenerateWeeklyPlan === 'function') {
        gameGenerateWeeklyPlan(true);
      } else {
        var _gameSvc = (AuditActions._ctx && AuditActions._ctx.game) || window.RBI.services.game;
        _gameSvc.updatePlanProgress();
      }

      if (window.activeTaskId) {
        var task = _getTasks().find(function (t) { return t.id === window.activeTaskId; });
        if (task) {
          task.done = (task.done || 0) + 1;
          task.updatedAt = new Date().toISOString();

          if (task.done >= task.target) {
            task.status = 'done';
            task.resultComment = `Выполнено (${task.done}/${task.target})`;
          } else {
            task.resultComment = `В процессе (${task.done}/${task.target})`;
          }
          _storage().put(_storage().stores().TASKS, task);
        }
        window.activeTaskId = null;
      }

      if (window.activeAcceptanceRequestId) {
        var _acceptanceStatus = (finalMetrics.isDanger || finalMetrics.final < 85) ? 'rejected' : 'accepted';
        if (_acceptanceStatus === 'rejected') {
          showToast("❌ Работы отклонены по результатам чек-листа");
        } else {
          showToast("✅ Работы успешно приняты!");
        }
        emit('audit:acceptanceStatusChanged', { requestId: window.activeAcceptanceRequestId, status: _acceptanceStatus });
        window.activeAcceptanceRequestId = null;
      }

      AuditState.resetSession(); assignPhotosMap({});
      secInput.value = ''; floorInput.value = ''; roomInput.value = ''; locHidden.value = '';

      AuditActions.scheduleSessionSave();

      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast(`✅ Сохранено в Историю!`);

      window.render();
      window.updateUI();
      localStorage.setItem('rbi_cloud_dirty', '1');

      if (_syncConfig().enabled) {
        _sync('silent');
      }

      emit('audit:session:saved');
    },

    // =====================================================================
    // ОТКРЫТИЕ МОДАЛА ВЫБОРА ИСТОЧНИКА ФОТО
    // Перенесено из audit.legacy.js (было в app.js, строка 4288).
    // Вызывается из динамически генерируемого HTML: onclick="triggerPhotoInput(id)"
    // =====================================================================
    triggerPhotoInput: function (id) {
      syncPhotoTargetId(id);
      document.getElementById('photo-source-modal').style.display = 'flex';
    },

    // =====================================================================
    // ОБРАБОТКА ЗАГРУЗКИ ФОТО ИЗ ФАЙЛОВОГО ИНПУТА
    // Перенесено из audit.legacy.js (было в app.js, строка 4353).
    // Вызывается из index.html: onchange="handlePhotoUpload(event)"
    // =====================================================================
    handlePhotoUpload: function (event) {
      var file = event.target.files[0];
      if (!file) return;

      var photoId = resolvePhotoTargetId();
      if (window.activePhotoContext !== 'etalon' && !photoId) return;
      syncPhotoTargetId(photoId);

      var reader = new FileReader();
      reader.onload = function (e) {
        window.editorImgElement = new Image();
        window.editorImgElement.onload = function () {
          document.getElementById('photo-editor-overlay').style.display = 'flex';
          document.body.classList.add('modal-open');

          initPhotoEditor();

          var saveBtn = document.querySelector('#photo-editor-overlay button.text-green-400');
          if (window.activePhotoContext === 'etalon') {
            saveBtn.onclick = window.saveEtalonMarkupPhoto;
          } else {
            saveBtn.onclick = saveEditedPhoto;
          }
        };
        window.editorImgElement.src = e.target.result;
      };
      reader.readAsDataURL(file);
      event.target.value = '';
      emit('audit:state:changed', { action: 'photo' });
    },

    // =====================================================================
    // УДАЛЕНИЕ ФОТО
    // Перенесено из audit.legacy.js (было в app.js, строка 4293).
    // Вызывается из динамически генерируемого HTML: onclick="removePhoto(id, event, index)"
    // index — позиция в массиве photos[id] (Множественные фото, B1). Без
    // index (undefined) удаляет весь набор фото пункта (обратная совместимость
    // со старыми вызовами/старым форматом photos[id] как строки).
    // =====================================================================
    removePhoto: function (id, e, index) {
      if (e) e.stopPropagation();
      if (!confirm('Удалить фото?')) return;

      if (index === undefined || index === null) {
        delete AuditState.photos[id];
      } else {
        var arr = window.normalizeItemPhotos(AuditState.photos[id]);
        arr.splice(index, 1);
        if (arr.length === 0) delete AuditState.photos[id];
        else AuditState.photos[id] = arr;
      }

      window.updateCardDOM(id);
      AuditActions.saveSession();
    },

    // =====================================================================
    // ОТКРЫТИЕ МОДАЛА КОММЕНТАРИЯ/ПРИЧИНЫ ДЕФЕКТА
    // Перенесено из audit.legacy.js (было в app.js, строка 4209).
    // Вызывается из динамически генерируемого HTML: onclick="toggleCommentField(id)"
    // =====================================================================
    toggleCommentField: function (id) {
      window._auditCurrentCommentId = id;
      var container = document.getElementById('modal-cause-checkboxes');
      var textarea = document.getElementById('modal-cause-comment');

      var currentData = AuditState.details[id] || {};
      var savedCodes = currentData.causeCode ? currentData.causeCode.split(',') : [];

      var DEFECT_CAUSES = window._AUDIT_DEFECT_CAUSES || [];
      var html = '';
      DEFECT_CAUSES.forEach(function (c) {
        var isChecked = savedCodes.includes(c.code) ? 'checked' : '';
        html += '<label class="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" value="' + c.code + '" class="cause-checkbox w-4 h-4 accent-indigo-600 rounded cursor-pointer" ' + isChecked + '> ' + c.name + '</label>';
      });
      if (container) container.innerHTML = html;

      var pureComment = currentData.comment || '';
      if (pureComment.startsWith('[')) {
        pureComment = pureComment.replace(/^\[.*?\]\s*/, '');
      }
      if (textarea) textarea.value = pureComment;

      var aiHint = document.getElementById('ai-hint-block');
      if (aiHint) { aiHint.innerHTML = ''; aiHint.classList.add('hidden'); }
      var overlay = document.getElementById('comment-modal-overlay');
      if (overlay) { overlay.style.display = 'flex'; document.body.classList.add('modal-open'); }
    },

    // =====================================================================
    // ЗАКРЫТИЕ МОДАЛА КОММЕНТАРИЯ
    // Перенесено из audit.legacy.js (было в app.js, строка 4238).
    // Вызывается из index.html: onclick="closeCommentModal()"
    // =====================================================================
    closeCommentModal: function () {
      var overlay = document.getElementById('comment-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      document.body.classList.remove('modal-open');
      window._auditCurrentCommentId = null;
    },

    // =====================================================================
    // СОХРАНЕНИЕ КОММЕНТАРИЯ ИЗ МОДАЛА
    // Перенесено из audit.legacy.js (было в app.js, строка 4244).
    // Вызывается из index.html: onclick="saveCommentModal()"
    // =====================================================================
    saveCommentModal: function () {
      var id = window._auditCurrentCommentId;
      if (!id) return;

      var DEFECT_CAUSES = window._AUDIT_DEFECT_CAUSES || [];
      var checkboxes = document.querySelectorAll('.cause-checkbox:checked');
      var checkedCodes = Array.from(checkboxes).map(function (cb) { return cb.value; });
      var code = checkedCodes.join(',');

      var textarea = document.getElementById('modal-cause-comment');
      var text = textarea ? textarea.value.trim() : '';

      AuditState.details[id] = AuditState.details[id] || {};
      AuditState.details[id].causeCode = code;

      var causeNames = checkedCodes.map(function (cCode) {
        var found = DEFECT_CAUSES.find(function (c) { return c.code === cCode; });
        return found ? found.name : null;
      }).filter(Boolean).join(', ');

      var finalComment = text;
      if (causeNames) {
        finalComment = text ? '[' + causeNames + '] ' + text : '[' + causeNames + ']';
      }
      AuditState.details[id].comment = finalComment;

      window.updateCardDOM(id);
      AuditActions.saveSession();

      if (text.length > 15) {
        _gameLogAction('comment_written', id);
      }
      window.closeCommentModal();
    },

    // =====================================================================
    // УДАЛЕНИЕ КОММЕНТАРИЯ
    // Перенесено из audit.legacy.js (было в app.js, строка 4279).
    // Вызывается из динамически генерируемого HTML: onclick="deleteComment(id, event)"
    // =====================================================================
    deleteComment: function (id, e) {
      if (e) e.stopPropagation();
      if (AuditState.details[id]) {
        AuditState.details[id].comment = '';
        AuditState.details[id].causeCode = '';
      }
      window.updateCardDOM(id);
      AuditActions.saveSession();
    }
  };

  window.AuditActions = AuditActions;

  // =========================================================================
  // УМНАЯ ФИКСАЦИЯ ПОЛЕЙ
  // Перенесено из app.js (было app.js:1114-1166). startSmartLock/
  // cancelSmartLock не имеют найденных вызывающих в разметке (проверено
  // Grep по index.html/js/**) — перенесены 1:1 без удаления, решение об
  // удалении мёртвого кода — предмет отдельного будущего блока.
  // =========================================================================
  let smartLockTimer = null;

  function startSmartLock(e, inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.hasAttribute('readonly')) return;

    smartLockTimer = setTimeout(() => {
      if (confirm('Разблокировать поле для изменения значения?')) {
        unlockSmartField(inputId);
        // Если разблокировали инспектора, убираем из настроек
        if (inputId === 'inp-inspector') { _setSetting('engineerName', ''); }
        if (inputId === 'inp-project') { _setSetting('defaultProject', ''); }
      }
    }, 800); // 800 мс долгого нажатия
  }

  function cancelSmartLock() {
    if (smartLockTimer) clearTimeout(smartLockTimer);
  }

  function unlockSmartField(inputId) {
    const input = document.getElementById(inputId);
    const lock = document.getElementById(`lock-${inputId}`);
    if (!input) return;

    input.removeAttribute('readonly');
    input.classList.remove('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed');
    if (lock) {
      lock.classList.add('hidden');
    }
    input.focus();
  }

  window.applySmartLocks = function () {
    if (window.isDemoMode) return;

    const inspInput = document.getElementById('inp-inspector');

    // 1. Блокировка имени инспектора (всегда)
    if (inspInput && _getSetting('engineerName')) {
      inspInput.value = _getSetting('engineerName');
      inspInput.setAttribute('readonly', 'true');
      inspInput.classList.add('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed', 'pointer-events-none');
      document.getElementById('lock-inp-inspector')?.classList.remove('hidden');
    } else if (inspInput) {
      inspInput.classList.remove('pointer-events-none');
    }

    // Блокировку объекта мы полностью делегировали в ObjectDirectory.initUI()
    if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
  };

  // =========================================================================
  // WINDOW-ПРОКСИ (обратная совместимость: index.html inline-обработчики,
  // динамически генерируемый HTML — onclick в строках, генерируемых
  // updateCardDOM/render — и вызовы из app.js/export.js).
  // =========================================================================
  window.saveSessionData = AuditActions.saveSession.bind(AuditActions);
  window.scheduleSessionSave = AuditActions.scheduleSessionSave.bind(AuditActions);
  window.getSessionPhotosForSync = AuditActions.getSessionPhotosForSync.bind(AuditActions);
  window.toggleOk = AuditActions.toggleOk.bind(AuditActions);
  window.toggleFail = AuditActions.toggleFail.bind(AuditActions);
  window.toggleEscalation = AuditActions.toggleEscalation.bind(AuditActions);
  window.saveProductToArray = AuditActions.saveProductToArray.bind(AuditActions);
  window.changeTemplate = AuditActions.changeTemplate.bind(AuditActions);
  window.resetChecklist = AuditActions.resetChecklist.bind(AuditActions);
  window.handlePhotoUpload = AuditActions.handlePhotoUpload.bind(AuditActions);
  window.triggerPhotoInput = AuditActions.triggerPhotoInput.bind(AuditActions);
  window.removePhoto = AuditActions.removePhoto.bind(AuditActions);
  window.toggleCommentField = AuditActions.toggleCommentField.bind(AuditActions);
  window.closeCommentModal = AuditActions.closeCommentModal.bind(AuditActions);
  window.saveCommentModal = AuditActions.saveCommentModal.bind(AuditActions);
  window.deleteComment = AuditActions.deleteComment.bind(AuditActions);

  // Внутренний ID текущего комментария в модалке (UI-состояние, не сессионные
  // данные аудита — не оборачивается в AuditState, см. план «Что разобрать» п.2).
  window._auditCurrentCommentId = window._auditCurrentCommentId || null;

  console.log('[RBI Module] audit.actions loaded (owner-module: full business logic)');
}());

// =========================================================================
// РАЗМЕТКА МОДАЛКИ «comment-modal-overlay» (перенос из index.html:1224-1263,
// перенос 30 modal/overlay-блоков #app-modals в JS-рендер). HTML-строка 1:1
// идентична прежней статичной разметке.
// =========================================================================
function renderCommentModalOverlayMarkup() {
  return `
    <div id="comment-modal-overlay"
        class="fixed inset-0 bg-slate-900/70 z-[1600] hidden items-center justify-center p-4 backdrop-blur-sm"
        data-audit-action="closeCommentModal">
        <div class="bg-[var(--card-bg)] w-full max-w-md p-6 rounded-2xl shadow-2xl transition-transform"
            onclick="event.stopPropagation()">
            <div
                class="font-black text-[13px] uppercase tracking-tight mb-4 border-b border-[var(--card-border)] pb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                    </path>
                </svg>
                Детали дефекта
            </div>
            <div class="mb-4">
                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 block">Причины дефекта
                    (Можно выбрать несколько)</label>
                <!-- ВСТАВКА: Контейнер для чекбоксов вместо селекта -->
                <div id="modal-cause-checkboxes" class="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-2 bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl" data-action="generateAiHintForDefect" data-action-event="change"></div>
                <!-- Сюда будет падать ответ нейросети -->
                <div id="ai-hint-block"
                    class="mt-2 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-2 hidden shadow-inner leading-snug">
                </div>
            </div>
            <div class="mb-5">
                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 block">Уточняющий
                    комментарий</label>
                <textarea id="modal-cause-comment"
                    class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] outline-none h-24 resize-none text-slate-800 dark:text-slate-200"
                    placeholder="Напишите детали (величину отклонения, размеры и т.д.)..."></textarea>
            </div>
            <div class="flex gap-2">
                <button data-audit-action="closeCommentModal"
                    class="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 flex-1">Отмена</button>
                <button data-audit-action="saveCommentModal"
                    class="flex-1 bg-indigo-600 text-white px-4 py-3.5 rounded-xl font-bold text-[11px] uppercase shadow-md active:scale-95">Сохранить</button>
            </div>
        </div>
    </div>
`;
}

(function mountCommentModalOverlayMarkup() {
  if (document.getElementById('comment-modal-overlay')) return;
  var root = window.RBI && window.RBI.services && window.RBI.services.shell
    ? window.RBI.services.shell.getModalsRoot()
    : document.getElementById('app-modals');
  if (!root) return;
  root.insertAdjacentHTML('beforeend', renderCommentModalOverlayMarkup());
}());

export const AuditActions = window.AuditActions;
