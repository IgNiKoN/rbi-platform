// === AI Module — Фаза 19 ===
// Контракт платформы. ES-модуль (type="module").
// Загружает сторонние файлы как side-effect imports, затем регистрирует модуль.

import { AIState } from './ai.state.js';
import {
  AIActions, changeAiMode, callAI, generateSmartComment, generateOnePagerForecastAi,
  generatePulseAi, generateHeatmapAi, generateContractorForecastAi, generateCultureAi,
  generateTwiDraftAi, generatePrescriptionAi, generateTaskRiskAi, generateAiRoutePlan,
  generateAiTutorAdvice, generateAiHintForDefect, extractTextFromPdf, rbi_normalizeFeedbackAi,
  openAiDocChat, closeAiDocChat, askAiDocQuestion, rbi_generateMeetingMemo,
  rbi_generatePracticeTitleAi, rbi_beautifyPracticeAi, rbi_fillFmeaWithAi, generateDefectRemediationTexts, rbi_generateWorkshop,
  rbi_generateIntroBriefing, rbi_generateFinalAcceptance, sk_aiMapColumns, sk_autoMapCategories,
  sk_generateContractorAiSummary, sk_predictRisksAi, rbi_generateGlobalAi, runSelfLearningAi,
  sk_auditTemplatesAi, gameAddContractorAliasInline, gameGenerateContractorSynonymsAI
} from './ai.actions.js';
import { AIRender } from './ai.render.js';

window.AIState = AIState;
window.AIActions = AIActions;
window.AIRender = AIRender;
window.changeAiMode = changeAiMode;
window.callAI = callAI;
window.generateSmartComment = generateSmartComment;
window.generateOnePagerForecastAi = generateOnePagerForecastAi;
window.generatePulseAi = generatePulseAi;
window.generateHeatmapAi = generateHeatmapAi;
window.generateContractorForecastAi = generateContractorForecastAi;
window.generateCultureAi = generateCultureAi;
window.generateTwiDraftAi = generateTwiDraftAi;
window.generatePrescriptionAi = generatePrescriptionAi;
window.generateTaskRiskAi = generateTaskRiskAi;
window.generateAiRoutePlan = generateAiRoutePlan;
window.generateAiTutorAdvice = generateAiTutorAdvice;
window.generateAiHintForDefect = generateAiHintForDefect;
window.extractTextFromPdf = extractTextFromPdf;
window.rbi_normalizeFeedbackAi = rbi_normalizeFeedbackAi;
window.openAiDocChat = openAiDocChat;
window.closeAiDocChat = closeAiDocChat;
window.askAiDocQuestion = askAiDocQuestion;
window.rbi_generateMeetingMemo = rbi_generateMeetingMemo;
window.rbi_generatePracticeTitleAi = rbi_generatePracticeTitleAi;
window.rbi_beautifyPracticeAi = rbi_beautifyPracticeAi;
window.rbi_fillFmeaWithAi = rbi_fillFmeaWithAi;
window.generateDefectRemediationTexts = generateDefectRemediationTexts;
window.rbi_generateWorkshop = rbi_generateWorkshop;
window.rbi_generateIntroBriefing = rbi_generateIntroBriefing;
window.rbi_generateFinalAcceptance = rbi_generateFinalAcceptance;
window.sk_aiMapColumns = sk_aiMapColumns;
window.sk_autoMapCategories = sk_autoMapCategories;
window.sk_generateContractorAiSummary = sk_generateContractorAiSummary;
window.sk_predictRisksAi = sk_predictRisksAi;
window.rbi_generateGlobalAi = rbi_generateGlobalAi;
window.runSelfLearningAi = runSelfLearningAi;
window.sk_auditTemplatesAi = sk_auditTemplatesAi;
window.gameAddContractorAliasInline = gameAddContractorAliasInline;
window.gameGenerateContractorSynonymsAI = gameGenerateContractorSynonymsAI;

// =========================================================================
// РАЗМЕТКА МОДАЛКИ «ai-chat-modal» (перенос из index.html:1640-1693, перенос
// 30 modal/overlay-блоков #app-modals в JS-рендер, публичная граница фичи
// ai). HTML-строка 1:1 идентична прежней статичной разметке.
// =========================================================================
(function mountAiChatModalMarkup() {
  if (document.getElementById('ai-chat-modal')) return;
  var root = window.RBI && window.RBI.services && window.RBI.services.shell
    ? window.RBI.services.shell.getModalsRoot()
    : document.getElementById('app-modals');
  if (!root) return;
  root.insertAdjacentHTML('beforeend', `
    <div id="ai-chat-modal"
        class="fixed inset-0 bg-slate-900/80 z-[7000] hidden flex-col items-center justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm transition-opacity duration-300"
        data-action="closeAiDocChat">
        <div class="bg-[var(--card-bg)] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-[75vh] border border-[var(--card-border)]"
            onclick="event.stopPropagation()">
            <!-- Шапка чата -->
            <div
                class="p-4 border-b border-[var(--card-border)] flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-3xl sm:rounded-t-2xl shrink-0">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xl shadow-md">
                        🤖</div>
                    <div>
                        <div class="font-black text-[13px] uppercase tracking-tight text-slate-800 dark:text-white">База
                            Знаний (AI)</div>
                        <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Нейросеть знает все
                            загруженные ГОСТы</div>
                    </div>
                </div>
                <button data-action="closeAiDocChat"
                    class="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 active:scale-90 shadow-sm border border-slate-200 dark:border-slate-700">✕</button>
            </div>

            <!-- Окно переписки -->
            <div id="ai-chat-history"
                class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900/50 space-y-4">
                <div class="flex gap-2 w-full max-w-[85%]">
                    <div
                        class="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-[10px] shrink-0">
                        🤖</div>
                    <div
                        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none text-[12px] text-slate-700 dark:text-slate-300 shadow-sm">
                        Привет! Задай мне любой вопрос по строительным нормам. Я найду нужный СП или ГОСТ в базе
                        приложения и дам точный ответ.
                    </div>
                </div>
            </div>

            <!-- Поле ввода -->
            <div
                class="p-3 border-t border-[var(--card-border)] bg-white dark:bg-slate-800 rounded-b-3xl sm:rounded-b-2xl shrink-0 flex gap-2">
                <textarea id="ai-chat-input"
                    class="flex-1 bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] outline-none resize-none h-12 text-slate-800 dark:text-white"
                    placeholder="Например: Какое допустимое отклонение стен из газобетона?"></textarea>
                <button data-action="askAiDocQuestion" id="ai-chat-send-btn"
                    class="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 shrink-0 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8">
                        </path>
                    </svg>
                </button>
            </div>
        </div>
    </div>
`);
}());

// Паттерн делегирования событий для инициативы «Разбор inline onclick/onchange»
// (см. _ai/INDEX_HTML_HANDLERS_MAP.md). Разметка задаёт `data-action="<id>"`
// (+ опционально `data-action-arg` и `data-action-event` для onchange-случаев),
// один глобальный listener на document резолвит это в вызов window[id](arg?).
// Повторно используется последующими блоками той же инициативы для других групп владения.
function bindAiActionDelegation() {
  if (window.__aiActionDelegationBound) return;
  window.__aiActionDelegationBound = true;

  const dispatch = (el) => {
    const action = el.dataset.action;
    const fn = window[action];
    if (typeof fn !== 'function') return;
    const arg = el.dataset.actionArg;
    arg === undefined ? fn() : fn(arg);
  };

  // Ищем элемент с data-action вручную (не через closest()), воспроизводя
  // семантику реального bubble-распространения: подъём от target вверх
  // останавливается на узле с существующим inline `onclick="event.stopPropagation()"`
  // (напр. вложенный контейнер модалки ai-chat-modal, строка 4202 index.html —
  // задокументированное исключение карты, не трогается этим блоком), если
  // на этом узле не встречен свой data-action раньше. Это нужно, т.к. сам
  // делегированный listener всегда работает в capture-фазе (см. ниже) —
  // без ручной остановки на stopPropagation-узле клик внутри модалки
  // ошибочно матчился бы на data-action="closeAiDocChat" фонового бекдропа.
  const resolveActionElement = (target, wantsChange) => {
    let el = target;
    while (el && el.nodeType === 1) {
      if (el.dataset && el.dataset.action) {
        if (!!(el.dataset.actionEvent === 'change') === wantsChange) return el;
      }
      const inlineOnclick = el.getAttribute && el.getAttribute('onclick');
      if (!wantsChange && inlineOnclick && inlineOnclick.includes('stopPropagation')) return null;
      el = el.parentElement;
    }
    return null;
  };

  // Capture-фаза: гарантирует срабатывание до момента, когда реальный
  // inline `event.stopPropagation()` внутри модалки остановил бы bubble
  // (иначе делегированный listener на document, привязанный в bubble-фазе,
  // не получил бы событие для кнопок внутри такого контейнера).
  document.addEventListener('click', (e) => {
    const el = resolveActionElement(e.target, false);
    if (el) dispatch(el);
  }, true);

  document.addEventListener('change', (e) => {
    const el = resolveActionElement(e.target, true);
    if (el) dispatch(el);
  }, true);
}

const AIModule = {
  id: 'ai',
  routes: [],
  dependencies: ['storage', 'settings'],

  async init(ctx) {
    ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
    ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
    ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
    if (window.AIActions) window.AIActions.bindCtx(ctx);
    if (window.AIState) window.AIState.bindCtx(ctx);

    window.AIState.syncFromLegacy();

    bindAiActionDelegation();

    document.addEventListener('settings:changed', (e) => {
      if (e.detail?.key === 'aiEnabled' || e.detail?.key === 'aiAuthMode') {
        window.AIState.syncFromLegacy();
      }
    });

    ctx.events?.emit('ai:initialized', { enabled: window.AIState.isEnabled() });
  },

  mount(container, ctx) {
    // AI-модуль не монтирует собственный UI
  },

  unmount() {
    // Нет подписок для очистки
  }
};

window.RBI.registry.register('module.ai', AIModule);
export { AIModule };
