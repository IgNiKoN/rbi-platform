// etalon-v18b.actions.js — «Акт-Эталон (Бета 2, только ПК)»: точная (1:1) копия
// исходного Шаблон_акта_эталона_в_18.html — внешний вид, справка (RU/EN/SR),
// one-pager с картинкой, форма печати — без изменений, через <iframe>.
// Отличие от etalon-v18.actions.js (Блок 2, мобильно-адаптированный конструктор):
// здесь оригинальный файл встраивается целиком, платформа только обменивается
// данными с ним через postMessage и сохраняет их в тот же стор rbi_etalon_acts
// (source_kind = 'act_v18b'). Доступно только на ПК (ширина >= 768px) —
// оригинальная вёрстка рассчитана на десктоп и печать A4, на телефоне неприменима.
(function () {
  'use strict';

  var FRAME_SRC = './js/modules/quality/features/etalon/etalon-v18b.frame.html';
  var _v18b = {
    editingId: null,
    frameReady: false,
    pendingPrefill: null
  };
  function _storage() {
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
      return window.RBI.services.storage;
    }
    return {
      stores: function () { return typeof STORES !== 'undefined' ? STORES : {}; },
      put: function (store, data) { return dbPut(store, data); }
    };
  }
  function _triggerSync(mode) {
    if (window.RBI && window.RBI.services && window.RBI.services.sync) return window.RBI.services.sync.trigger(mode || 'silent');
    if (typeof triggerSync === 'function') return triggerSync(mode || 'silent');
    return Promise.resolve(false);
  }

  function _etalonActs() {
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge && typeof window.RBI.services.knowledge.ensureEtalonActsSync === 'function') {
      return window.RBI.services.knowledge.ensureEtalonActsSync();
    }
    if (!Array.isArray(window.etalonActsArray)) window.etalonActsArray = [];
    return window.etalonActsArray;
  }

  function _isDesktop() {
    return window.innerWidth >= 768;
  }

  function _frame() {
    return document.getElementById('etv18b-frame');
  }

  function _postToFrame(type, payload) {
    var frame = _frame();
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ target: 'rbi-etalon-v18b', type: type, payload: payload }, '*');
  }

  // Преобразует хранимую в акте модель (record.details.actV18b) в плоский
  // набор data-field полей + структурированные таблицы для префилла iframe.
  function _buildPrefillFromRecord(record) {
    var a = (record && record.details && record.details.actV18b) || {};
    var h = a.header || {};
    return {
      fields: {
        typeSmr: !!h.typeSmr,
        typeProduct: !!h.typeProduct,
        typeNode: !!h.typeNode,
        typeFinish: !!h.typeFinish,
        typeOther: !!h.typeOther,
        typeOtherText: h.typeOtherText || '',
        object: h.object || '',
        address: h.address || '',
        name: h.name || '',
        location: h.location || '',
        inspectionDate: h.inspectionDate || '',
        sampleComposition: (a.scope || {}).sampleComposition || '',
        applicationZone: (a.scope || {}).applicationZone || '',
        sampleSize: (a.scope || {}).sampleSize || '',
        notIncluded: (a.scope || {}).notIncluded || '',
        decisionAccepted: (a.decision || {}).result === 'accepted',
        decisionConditional: (a.decision || {}).result === 'conditional',
        decisionRejected: (a.decision || {}).result === 'rejected',
        sampleStored: (a.decision || {}).storage === 'stored',
        sampleRemoved: (a.decision || {}).storage === 'removed',
        sampleConcealed: (a.decision || {}).storage === 'concealed',
        storagePlace: (a.decision || {}).storagePlace || '',
        photoObject: h.object || '',
        photoName: h.name || ''
      },
      onePager: a.onePager || { html: '', hasFile: false },
      language: a.language || 'ru',
      photos: (a.photos || []).map(function (p) { return { photo: p._displayUrl || p.photo || '', desc: p.desc || '', date: p.date || '' }; }),
      participants: a.participants || [],
      controls: a.controls || [],
      tables: a.tables || {}
    };
  }

  async function _hydratePhotoDisplayUrls(a) {
    var photos = (a && a.photos) || [];
    for (var i = 0; i < photos.length; i++) {
      var p = photos[i];
      if (p.photo && String(p.photo).indexOf('local://') === 0) {
        p._displayUrl = await PhotoManager.getAsyncUrl(p.photo) || window.getPhotoSrc(p.photo);
      } else {
        p._displayUrl = p.photo;
      }
    }
  }

  // Загружает data-URL фото из iframe (base64) в PhotoManager и заменяет
  // на local:// id — как во всей остальной платформе, ничего не пишем
  // напрямую в IndexedDB как base64.
  async function _persistPhotosFromBridge(photos) {
    var result = [];
    for (var i = 0; i < (photos || []).length; i++) {
      var p = photos[i];
      var photoRef = p.photo || '';
      if (photoRef && photoRef.indexOf('data:') === 0) {
        photoRef = await PhotoManager.saveLocal(photoRef, 'etalon_v18b');
      }
      result.push({ photo: photoRef, desc: p.desc || '', date: p.date || '' });
    }
    return result;
  }

  var EtalonV18BActions = {

    /**
     * Открывает полноэкранный просмотр с iframe-конструктором (только ПК).
     * @param {Object} prefill — { contractor, templateKey, templateTitle, projectName }
     */
    openConstructor: function (prefill) {
      if (!_isDesktop()) {
        showToast('⚠️ «Акт-Эталон (Бета 2)» доступен только на ПК (ширина экрана ≥ 768px)');
        return;
      }
      var p = prefill || {};
      _v18b = { editingId: null, frameReady: false, pendingPrefill: null };

      if (window.EtalonV18BRender) window.EtalonV18BRender.mount(FRAME_SRC);

      var inpProject = document.getElementById('inp-project');
      document.getElementById('etv18b-project').value = p.projectName || (inpProject ? inpProject.value : '') || '';
      document.getElementById('etv18b-contractor').value = p.contractor || '';

      var tmplSelect = document.getElementById('etv18b-template');
      var tmplOpts = '<option value="" disabled selected>-- Выберите вид работ --</option>';
      var st = (window.RBI && window.RBI.services && window.RBI.services.templates) ? window.RBI.services.templates.getSystemTemplates() : (typeof SYSTEM_TEMPLATES !== 'undefined' ? SYSTEM_TEMPLATES : {});
      var sysKeys = Object.keys(st).sort(function (a, b) { return st[a].title.localeCompare(st[b].title); });
      sysKeys.forEach(function (k) { tmplOpts += '<option value="sys_' + k + '">[СИС] ' + st[k].title + '</option>'; });
      tmplSelect.innerHTML = tmplOpts;
      if (p.templateKey) tmplSelect.value = p.templateKey;

      if (typeof initSmartInput === 'function') {
        initSmartInput('etv18b-project', 'projectName');
        initSmartInput('etv18b-contractor', 'contractorName');
      }

      var titleEl = document.getElementById('etv18b-title-text');
      if (titleEl) titleEl.innerText = 'Акт-Эталон (Бета 2, ПК) — ' + (p.projectName || 'Новый Акт');

      var view = document.getElementById('etalon-v18b-view');
      if (view) {
        view.classList.remove('hidden');
        document.body.classList.add('modal-open');
      }

      // Пустой префилл для нового акта — iframe сам инициализирует форму
      // при загрузке (см. frame-ready ниже), явный prefill не требуется.
    },

    closeConstructor: function () {
      var view = document.getElementById('etalon-v18b-view');
      if (view) view.classList.add('hidden');
      document.body.classList.remove('modal-open');
      var host = document.getElementById('etv18b-frame-host');
      if (host) host.innerHTML = '';
      _v18b.frameReady = false;
    },

    /**
     * Загружает существующий акт act_v18b для редактирования.
     */
    editAct: async function (id) {
      if (!_isDesktop()) {
        showToast('⚠️ «Акт-Эталон (Бета 2)» доступен только на ПК (ширина экрана ≥ 768px)');
        return;
      }
      var record = _etalonActs().find(function (a) { return String(a.id) === String(id); });
      if (!record || !record.details || !record.details.actV18b) return showToast('❌ Акт не найден');

      EtalonV18BActions.openConstructor({
        projectName: record.projectName,
        contractor: record.contractorName,
        templateKey: record.templateKey,
        templateTitle: record.templateTitle
      });
      _v18b.editingId = id;

      var a = record.details.actV18b;
      await _hydratePhotoDisplayUrls(a);
      _v18b.pendingPrefill = _buildPrefillFromRecord(record);

      // Если iframe уже прислал frame-ready — префилл применяется немедленно,
      // иначе он ждётся в обработчике onFrameMessage (см. render.js#_bindFrameMessages).
      if (_v18b.frameReady) {
        _postToFrame('prefill', _v18b.pendingPrefill);
        _v18b.pendingPrefill = null;
      }

      var titleEl = document.getElementById('etv18b-title-text');
      if (titleEl) titleEl.innerText = 'Акт-Эталон (Бета 2, ПК) — ' + record.projectName + ' | ' + record.contractorName;
    },

    /**
     * Вызывается при получении frame-ready — применяет отложенный префилл
     * (см. editAct) и помечает мост готовым к сохранению.
     */
    onFrameReady: function () {
      _v18b.frameReady = true;
      if (_v18b.pendingPrefill) {
        _postToFrame('prefill', _v18b.pendingPrefill);
        _v18b.pendingPrefill = null;
      }
    },

    /**
     * Обрабатывает данные, присланные iframe при клике «Сохранить в RBI».
     * @param {Object} data — collectBridgeData() из etalon-v18b.frame.html
     * @param {Boolean} closeAfter
     */
    onSaveRequest: async function (data, closeAfter) {
      var selProject = document.getElementById('etv18b-project').value.trim();
      var selContractor = document.getElementById('etv18b-contractor').value.trim();
      var selTemplateKey = document.getElementById('etv18b-template').value;
      var tmplSelect = document.getElementById('etv18b-template');
      var selectedOption = tmplSelect.options[tmplSelect.selectedIndex];
      var selTemplateTitle = selectedOption ? selectedOption.text.replace(/\[.*?\]\s*/, '') : '';
      var fields = data.fields || {};
      var location = fields.location || '';

      if (!selProject || !selContractor || !selTemplateKey) return showToast('⚠️ Укажите Объект, Подрядчика и Вид работ в верхней панели!');
      if (!location) return showToast('⚠️ Заполните «Место устройства / установки» в разделе акта!');

      showToast('⚙️ Сохранение фото...');
      var photos = await _persistPhotosFromBridge(data.photos);

      var actV18b = {
        header: {
          typeSmr: !!fields.typeSmr,
          typeProduct: !!fields.typeProduct,
          typeNode: !!fields.typeNode,
          typeFinish: !!fields.typeFinish,
          typeOther: !!fields.typeOther,
          typeOtherText: fields.typeOtherText || '',
          object: fields.object || '',
          address: fields.address || '',
          name: fields.name || '',
          location: location,
          inspectionDate: fields.inspectionDate || ''
        },
        participants: data.participants || [],
        scope: {
          sampleComposition: fields.sampleComposition || '',
          applicationZone: fields.applicationZone || '',
          sampleSize: fields.sampleSize || '',
          notIncluded: fields.notIncluded || ''
        },
        tables: data.tables || {},
        controls: data.controls || [],
        decision: {
          result: fields.decisionAccepted ? 'accepted' : (fields.decisionConditional ? 'conditional' : (fields.decisionRejected ? 'rejected' : '')),
          storage: fields.sampleStored ? 'stored' : (fields.sampleRemoved ? 'removed' : (fields.sampleConcealed ? 'concealed' : '')),
          storagePlace: fields.storagePlace || ''
        },
        onePager: data.onePager || { html: '', hasFile: false },
        language: data.language || 'ru',
        photos: photos
      };

      var etalonId = _v18b.editingId || String(Date.now() + Math.floor(Math.random() * 1000));
      var myName = 'Инженер';
      if (window.RBI && window.RBI.services && window.RBI.services.settings) {
        myName = window.RBI.services.settings.get('engineerName') || myName;
      }

      var participantsSummary = (actV18b.participants || []).map(function (p) {
        return p.organization + (p.position ? ', ' + p.position : '') + (p.name ? ' — ' + p.name : '');
      }).join('; ');

      var record = {
        id: etalonId,
        owner: myName,
        date: new Date().toISOString(),
        projectName: selProject,
        inspectorName: myName,
        contractorName: selContractor,
        templateKey: selTemplateKey,
        templateTitle: selTemplateTitle,
        location: location,
        instanceId: 'etalon',
        stageId: 0,
        stageName: 'Акт-Эталон (Бета 2, ПК)',
        checkedStagesInfo: ['Фиксация эталона (полная копия конструктора v18, ПК)'],
        isCompleted: true,
        state: { '9901': 'ok' },
        photos: {},
        source_kind: 'act_v18b',
        details: {
          participants: participantsSummary,
          deviations: (actV18b.tables && actV18b.tables.remarksTable && actV18b.tables.remarksTable.length) ? 'См. раздел «Замечания и корректировки»' : 'Отклонений не выявлено',
          elements: [], // Совместимость со старым просмотрщиком/печатью (см. printEtalon) — пусто для act_v18b.
          actV18b: actV18b
        },
        metrics: { final: 100, baseUrkPerc: 100, checkedCount: 1, totalCount: 1, n_B1_fail: 0, n_B2_fail: 0, n_B3_fail: 0, kc: 1, kcrit: 1, statusTxt: 'ЭТАЛОН', statusCls: 'tag-blue' },
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

      var acts = _etalonActs();
      var idx = acts.findIndex(function (a) { return String(a.id) === String(etalonId); });
      if (idx !== -1) {
        record.createdAt = acts[idx].createdAt || record.createdAt;
        acts[idx] = record;
      } else {
        acts.push(record);
      }

      await _storage().put(_storage().stores().ETALON_ACTS, record);
      _v18b.editingId = etalonId;
      showToast('✅ Акт-Эталон (Бета 2) успешно сохранён!');
      localStorage.setItem('rbi_cloud_dirty', '1');
      setTimeout(function () { _triggerSync('silent'); }, 800);

      if (closeAfter) {
        EtalonV18BActions.closeConstructor();
      }

      setTimeout(function () {
        if (typeof rbi_renderPracticesTab === 'function') rbi_renderPracticesTab();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();
      }, 200);

      document.dispatchEvent(new CustomEvent('etalon:act:saved', { detail: { id: record.id, printAfter: false, sourceKind: 'act_v18b' } }));
    }
  };

  window.EtalonV18BActions = EtalonV18BActions;
  window.openEtalonV18BConstructor = EtalonV18BActions.openConstructor.bind(EtalonV18BActions);
  window.closeEtalonV18BConstructor = EtalonV18BActions.closeConstructor.bind(EtalonV18BActions);
  window.editEtalonV18BAct = EtalonV18BActions.editAct.bind(EtalonV18BActions);

  console.log('[EtalonV18BActions] etalon-v18b.actions.js loaded');
}());
