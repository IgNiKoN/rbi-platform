// etalon-v18.render.js — разметка полноэкранного конструктора «Акт-Эталон (Бета)».
// Структура полей 1:1 повторяет 11 разделов Шаблон_акта_эталона_в_18.html,
// но верстка адаптирована под мобильный/табличный UI платформы (карточки вместо
// широких таблиц с фиксированной шириной колонок) и без встроенного PNG
// регламента (~1.78 МБ) — справка вынесена в краткий текстовый блок ниже.

(function () {
  'use strict';

  function _sectionTitle(num, title, hint) {
    return '' +
      '<div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2 px-1 flex items-center gap-2 mt-5">' +
      '<span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-black shrink-0">' + num + '</span>' +
      title + '</div>' +
      (hint ? '<div class="text-[10px] text-slate-400 font-medium px-1 mb-2">' + hint + '</div>' : '');
  }

  function _tableBlock(tableId, headers, addLabel) {
    var ths = headers.map(function (h) { return '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">' + h + '</th>'; }).join('');
    return '' +
      '<div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mb-2">' +
      '<table id="' + tableId + '" class="w-full text-[11px]">' +
      '<thead><tr><th class="w-8 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700">№</th>' + ths + '</tr></thead>' +
      '<tbody></tbody>' +
      '</table></div>' +
      '<div class="flex gap-2 mb-1">' +
      '<button onclick="window.rbi_etalonV18AddRow(\'' + tableId + '\')" class="flex-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95">+ ' + addLabel + '</button>' +
      '<button onclick="window.rbi_etalonV18RemoveRow(\'' + tableId + '\')" class="px-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95">− Удалить</button>' +
      '</div>';
  }

  function _radioRow(name, options) {
    return options.map(function (o) {
      return '<label class="flex items-start gap-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">' +
        '<input type="radio" name="' + name + '" value="' + o.value + '" class="mt-0.5">' +
        '<span>' + o.label + '</span></label>';
    }).join('');
  }

  function renderMarkup() {
    var html = '';
    html += '<div id="etalon-v18-view" class="hidden bg-[var(--bg-main)] fixed inset-0 z-[3000] h-screen pb-32 overflow-y-auto custom-scrollbar">';
    html += '<div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm sticky top-0 z-40 flex justify-between items-center gap-2">';
    html += '<button onclick="closeEtalonV18Constructor()" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg transition-colors shrink-0">';
    html += '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg> Назад';
    html += '</button>';
    html += '<div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest text-center flex-1 truncate px-1" id="etv18-title-text">Акт-Эталон (Бета)</div>';
    html += '<div class="flex gap-1.5 shrink-0">';
    html += '<button onclick="saveEtalonV18Act(false)" class="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg active:scale-95 shadow-sm transition-colors">Сохранить</button>';
    html += '<button onclick="saveEtalonV18Act(true)" class="text-[10px] font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg active:scale-95 shadow-md transition-colors">Печать</button>';
    html += '</div>';
    html += '</div>';

    html += '<div class="space-y-1 px-3 max-w-3xl mx-auto">';

    html += '<div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 text-[10px] text-indigo-700 dark:text-indigo-300 font-medium mb-3">';
    html += 'Структурированный акт согласования эталонного образца (11 разделов). Заполняется по факту осмотра выполненного образца до начала массового производства аналогичных работ.';
    html += '</div>';

    // Заголовок: объект/подрядчик/вид работ (интеграция с платформой)
    html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">';
    html += '<div class="text-[12px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-1 border-b border-slate-100 dark:border-slate-700 pb-2">Привязка эталона</div>';
    html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объект *</label><input type="text" id="etv18-project" autocomplete="off" class="input-base text-[12px] font-bold"></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Подрядчик *</label><input type="text" id="etv18-contractor" autocomplete="off" class="input-base text-[12px] font-bold"></div>';
    html += '</div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Вид работ (Чек-лист) *</label><select id="etv18-template" class="input-base text-[12px] font-bold"></select></div>';
    html += '</div>';

    // Раздел 0: шапка акта (вид эталона, объект, адрес, наименование, локация, дата)
    html += _sectionTitle('0', 'Данные акта');
    html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Вид эталона</label>';
    html += '<div class="flex flex-wrap gap-3 text-[11px] font-medium">';
    html += '<label class="flex items-center gap-1"><input type="checkbox" id="etv18-type-smr"> СМР</label>';
    html += '<label class="flex items-center gap-1"><input type="checkbox" id="etv18-type-product"> изделие</label>';
    html += '<label class="flex items-center gap-1"><input type="checkbox" id="etv18-type-node"> конструктивный узел</label>';
    html += '<label class="flex items-center gap-1"><input type="checkbox" id="etv18-type-finish"> фрагмент отделки</label>';
    html += '<label class="flex items-center gap-1"><input type="checkbox" id="etv18-type-other"> иной:</label>';
    html += '</div>';
    html += '<input type="text" id="etv18-type-other-text" class="input-base text-[11px] mt-1" placeholder="например: опытный образец фасадного узла">';
    html += '</div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Адрес объекта</label><input type="text" id="etv18-address" class="input-base text-[11px]" placeholder="например: г. Санкт-Петербург, ул. Примерная, д. 10"></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объект (для листа фотофиксации)</label><input type="text" id="etv18-object" class="input-base text-[11px]"></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Наименование эталона</label><input type="text" id="etv18-name" class="input-base text-[11px]" placeholder="например: угловое безстоечное остекление витража"></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Место устройства / установки *</label><input type="text" id="etv18-location" class="input-base text-[11px]" placeholder="например: корпус 1, секция 2, 1-й этаж, оси 5–6"></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Дата осмотра</label><input type="date" id="etv18-inspection-date" class="input-base text-[11px]"></div>';
    html += '</div>';

    // Раздел 1: участники
    html += _sectionTitle('1', 'Участники рассмотрения');
    html += '<div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mb-2">';
    html += '<table id="etv18-participantsTable" class="w-full text-[11px]"><thead><tr>';
    html += '<th class="w-8 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700">№</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Организация</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Должность</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Ф.И.О.</th>';
    html += '</tr></thead><tbody></tbody></table></div>';
    html += '<div class="flex gap-2 mb-1">';
    html += '<button onclick="window.rbi_etalonV18AddParticipant()" class="flex-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95">+ Участника</button>';
    html += '<button onclick="window.rbi_etalonV18RemoveParticipant()" class="px-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95">− Удалить</button>';
    html += '</div>';

    // Раздел 2: состав, границы и область применения
    html += _sectionTitle('2', 'Состав, границы и область применения эталона');
    html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Состав и границы эталона</label><textarea id="etv18-sampleComposition" class="input-base text-[11px] h-14 resize-none" placeholder="например: стойки, ригели, стеклопакет, герметизация и все согласуемые примыкания"></textarea></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Область применения эталона</label><textarea id="etv18-applicationZone" class="input-base text-[11px] h-14 resize-none" placeholder="например: все витражи первого этажа корпусов 1–3"></textarea></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Размер / объём образца</label><input type="text" id="etv18-sampleSize" class="input-base text-[11px]" placeholder="например: 1 участок размером 3,0 × 2,8 м"></div>';
    html += '<div><label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Исключения из согласования</label><textarea id="etv18-notIncluded" class="input-base text-[11px] h-14 resize-none" placeholder="например: внутренние откосы и чистовая отделка стен"></textarea></div>';
    html += '</div>';

    // Раздел 3: исходные документы
    html += _sectionTitle('3', 'Исходные документы');
    html += _tableBlock('documentsTable', ['Документ', 'Обозначение / номер / дата'], 'документ');

    // Раздел 4: согласованное решение
    html += _sectionTitle('4', 'Согласованное техническое и визуальное решение');
    html += _tableBlock('solutionsTable', ['Элемент / параметр', 'Согласованное решение'], 'строку');

    // Раздел 5: материалы
    html += _sectionTitle('5', 'Примененные материалы, комплектующие и изделия');
    html += _tableBlock('materialsTable', ['Наименование', 'Марка/тип', 'Производитель', 'Документ качества', 'Цвет/фактура'], 'материал');

    // Раздел 6: контрольные параметры
    html += _sectionTitle('6', 'Контрольные параметры эталона', 'Должны подтверждать соответствие требованиям рабочей документации, ГОСТ, СП, стандартов компании.');
    html += '<div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mb-2">';
    html += '<table id="etv18-controlTable" class="w-full text-[11px]"><thead><tr>';
    html += '<th class="w-8 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700">№</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Критерий</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Основание</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Требование</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Факт</th>';
    html += '<th class="text-left px-2 py-1.5 font-black text-[9px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">Соотв.</th>';
    html += '</tr></thead><tbody></tbody></table></div>';
    html += '<div class="flex gap-2 mb-1">';
    html += '<button onclick="window.rbi_etalonV18AddControlRow()" class="flex-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95">+ Параметр</button>';
    html += '<button onclick="window.rbi_etalonV18RemoveControlRow()" class="px-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95">− Удалить</button>';
    html += '</div>';

    // Раздел 7: результаты испытаний
    html += _sectionTitle('7', 'Результаты осмотра и испытаний');
    html += _tableBlock('testsTable', ['Вид проверки', 'Метод / средство', 'Результат / протокол'], 'испытание');

    // Раздел 8: замечания
    html += _sectionTitle('8', 'Замечания и обязательные корректировки');
    html += _tableBlock('remarksTable', ['Замечание', 'Ответственный', 'Срок', 'Отметка об устранении'], 'замечание');

    // Раздел 9: решение комиссии
    html += _sectionTitle('9', 'Решение комиссии');
    html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">';
    html += '<div class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Итоговое решение</div>';
    html += _radioRow('etv18-decision', [
      { value: 'accepted', label: 'согласован как эталон для последующего выполнения / поставки' },
      { value: 'conditional', label: 'согласован после устранения замечаний раздела 8' },
      { value: 'rejected', label: 'не согласован, требуется повторное предъявление' }
    ]);
    html += '<div class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 mt-3">Сохранность эталона</div>';
    html += _radioRow('etv18-storage', [
      { value: 'stored', label: 'сохраняется на объекте до завершения соответствующего вида работ' },
      { value: 'removed', label: 'демонтируется после фотофиксации и оформления документации' },
      { value: 'concealed', label: 'скрывается последующими работами после фотофиксации и оформления документации' }
    ]);
    html += '<input type="text" id="etv18-storage-place" class="input-base text-[11px] mt-2" placeholder="Место хранения / расположения / ответственный">';
    html += '</div>';

    // Раздел 10: приложения
    html += _sectionTitle('10', 'Приложения');
    html += _tableBlock('attachmentsTable', ['Наименование приложения', 'Кол-во листов/файлов', 'Примечание'], 'приложение');

    // Приложение: фотофиксация (раздел 11 — подписи формируются автоматически из раздела 1 при печати)
    html += _sectionTitle('11', 'Лист фотофиксации эталонного образца');
    html += '<div id="etv18-photo-grid"></div>';
    html += '<button onclick="window.rbi_etalonV18AddPhoto()" class="w-full bg-indigo-50 border border-dashed border-indigo-300 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-400 py-4 rounded-2xl font-bold text-[11px] uppercase active:scale-95 flex items-center justify-center gap-2 transition-colors mb-6">';
    html += '+ Добавить фото';
    html += '</button>';

    html += '</div>';
    html += '</div>';

    return html;
  }

  var EtalonV18Render = {
    mount: function () {
      if (document.getElementById('etalon-v18-view')) return;
      var root = (window.RBI && window.RBI.services && window.RBI.services.shell)
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals') || document.body;
      root.insertAdjacentHTML('beforeend', renderMarkup());
    }
  };

  window.EtalonV18Render = EtalonV18Render;
}());

console.log('[EtalonV18Render] etalon-v18.render.js loaded');
