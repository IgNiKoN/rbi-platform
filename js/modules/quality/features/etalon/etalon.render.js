// etalon.render.js — Фаза 18: рендер-диспетчер модуля Etalon
//
// Примечание: etalon.js не содержит отдельных render-функций —
// вся отрисовка встроена в openEtalonConstructor и openEtalonViewer.
// EtalonRender делегирует в EtalonActions (тонкий диспетчер).

(function () {
  const EtalonRender = {

    /**
     * Открыть конструктор эталона.
     * Делегирует в EtalonActions.openConstructor().
     */
    openConstructor(params) {
      if (window.EtalonActions) {
        var p = params || {};
        window.EtalonActions.openConstructor(
          p.contractor,
          p.templateKey,
          p.templateTitle,
          p.projectName,
          p.statusKey
        );
      } else {
        console.warn('[EtalonRender] EtalonActions недоступен');
      }
    },

    /**
     * Открыть просмотр акта.
     * Делегирует в EtalonActions.openViewer().
     */
    openViewer(id) {
      if (window.EtalonActions) {
        window.EtalonActions.openViewer(id);
      } else {
        console.warn('[EtalonRender] EtalonActions недоступен');
      }
    }
  };

  window.EtalonRender = EtalonRender;
})();

console.log('[EtalonRender] etalon.render.js loaded');

// Разметка #etalon-constructor-view перенесена из index.html (под-инициатива 1
// «Полная очистка index.html») — HTML 1:1, eager-монтаж в #app-modals.
function renderConstructorMarkup() {
  return `
    <div id="etalon-constructor-view"
        class="hidden bg-[var(--bg-main)] fixed inset-0 z-[3000] h-screen pb-32 overflow-y-auto custom-scrollbar">
        <div
            class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm sticky top-0 z-40 flex justify-between items-center">
            <button data-etalon-action="closeEtalonConstructor"
                class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
                </svg> Назад
            </button>
            <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest text-center"
                id="etalon-title-text">Акт-Эталон</div>
            <button data-etalon-action="saveEtalonAct"
                class="text-[11px] font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg active:scale-95 shadow-md transition-colors">Сохранить</button>
        </div>

        <div class="space-y-4 px-3 max-w-2xl mx-auto">
            <!-- БЛОК 1: Основные данные и Привязка -->
            <div
                class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">
                <div
                    class="text-[12px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-1 border-b border-slate-100 dark:border-slate-700 pb-2">
                    Привязка эталона</div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объект
                            *</label>
                        <div class="relative"><input type="text" id="etalon-project" autocomplete="off"
                                class="input-base text-[12px] font-bold text-slate-800 dark:text-white"
                                placeholder="Название объекта..."></div>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Подрядчик
                            *</label>
                        <div class="relative"><input type="text" id="etalon-contractor" autocomplete="off"
                                class="input-base text-[12px] font-bold text-slate-800 dark:text-white"
                                placeholder="ООО Ромашка..."></div>
                    </div>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Вид работ
                        (Чек-лист) *</label>
                    <select id="etalon-template"
                        class="input-base text-[12px] font-bold text-slate-800 dark:text-white"></select>
                </div>

                <div
                    class="text-[12px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-1 border-b border-slate-100 dark:border-slate-700 pb-2 mt-4 pt-3">
                    Расположение и Участники</div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Локация (Оси,
                        Этаж) *</label>
                    <input type="text" id="etalon-location" class="input-base text-[12px]"
                        placeholder="Напр: Секция 1, Этаж 5, Оси А-Б">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Комиссия
                        (Участники) *</label>
                    <textarea id="etalon-participants" class="input-base text-[11px] h-14 resize-none"
                        placeholder="ФИО, Должности представителей..."></textarea>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Допущения (Если
                        есть)</label>
                    <textarea id="etalon-deviations" class="input-base text-[11px] h-14 resize-none"
                        placeholder="Отклонений не выявлено"></textarea>
                </div>
            </div>

            <!-- БЛОК 2: Элементы эталона -->
            <div>
                <div
                    class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z">
                        </path>
                    </svg> Фиксация узлов
                </div>
                <div id="etalon-elements-container"></div>
                <button data-etalon-action="addEtalonElement"
                    class="w-full bg-indigo-50 border border-dashed border-indigo-300 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-400 py-4 rounded-2xl font-bold text-[11px] uppercase active:scale-95 flex items-center justify-center gap-2 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
                    </svg> Добавить узел эталона
                </button>
            </div>
        </div>
    </div>
`;
}

if (window.EtalonRender) {
  window.EtalonRender.renderConstructorMarkup = renderConstructorMarkup;
}

(function mountEtalonConstructorViewMarkup() {
  if (document.getElementById('etalon-constructor-view')) return;
  var root = window.RBI && window.RBI.services && window.RBI.services.shell
    ? window.RBI.services.shell.getModalsRoot()
    : document.getElementById('app-modals') || document.body;
  if (!root) return;
  root.insertAdjacentHTML('beforeend', renderConstructorMarkup());
}());
