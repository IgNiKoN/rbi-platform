/* Файл: js/modules/settings/features/tutorial.js */
// Перенесено из js/app.js (internal feature owner-модуля settings).
// Classic-script (не type="module") — startInteractiveTutorial/stopTutorial/nextTutorialStep
// вызываются из index.html через бареные inline onclick, без window.*.
// ============================================================================
// === БЛОК: ИНТЕРАКТИВНЫЙ 28-ШАГОВЫЙ ТУТОРИАЛ (АБСОЛЮТНО ВСЕ ФУНКЦИИ) ===
// ============================================================================
let currentTutStep = 0;
let tutOverlay, tutHighlightBox, tutTooltip, tutText, tutStepNum, tutNextBtn;

let _ctx = null;
function bindCtx(ctx) { _ctx = ctx; }
window.TutorialShared = { bindCtx: bindCtx };

function _isDemoMode() {
    var svc = (_ctx && _ctx.appMode) || window.RBI.services.appMode;
    return svc.isDemo();
}
// ============================================================================
// === RBI: ОБУЧАЮЩИЕ КАРТОЧКИ ДЛЯ ИСТОРИИ В АНАЛИТИКЕ ========================
// ============================================================================

window.rbiShowTutorialHistoryCard = function (mode = 'history') {
    // История у нас живёт внутри аналитики, а не как отдельная tab-history
    if (typeof switchTab === 'function') {
        switchTab('tab-analytics');
    }

    setTimeout(() => {
        // Открываем подвкладку История в аналитике
        const historyBtn =
            Array.from(document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn'))
                .find(b => String(b.getAttribute('onclick') || '').includes('sub-history'));

        if (historyBtn && typeof switchAnalyticsSubTab === 'function') {
            switchAnalyticsSubTab('sub-history', historyBtn);
        } else {
            // fallback, если кнопка не найдена
            document.querySelectorAll('.analytics-sub-section').forEach(s => s.classList.add('hidden'));
            const subHistory = document.getElementById('sub-history');
            if (subHistory) subHistory.classList.remove('hidden');
            window.currentActiveAnalyticsTab = 'sub-history';
        }

        setTimeout(() => {
            if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('history:renderRequested', {});
            if (typeof initCollapsiblePanel === 'function') {
                initCollapsiblePanel('hist-sticky-panel', 'hist-panel-body', 'hist-panel-header', 'hist-panel-toggle-icon');
            }

            const subHistory = document.getElementById('sub-history');
            const list = document.getElementById('history-list');
            const checksView = document.getElementById('history-checks-view');
            const emptyMsg = document.getElementById('hist-empty-msg');

            // Главная защита: если history-list пустой/не найден, всё равно вставляем карточку в sub-history
            const host = list || checksView || subHistory;
            if (!host) {
                console.warn('[Tutorial] Не найден контейнер истории: sub-history/history-list/history-checks-view');
                return;
            }

            document.querySelectorAll('.tutorial-history-card').forEach(el => el.remove());
            if (emptyMsg) emptyMsg.style.display = 'none';

            const cards = {
                sync: {
                    id: 'tutorial-history-sync-card',
                    badge: 'офлайн → облако',
                    title: 'Как данные попадают в историю',
                    text: 'После сохранения осмотр сначала появляется на устройстве. Затем при наличии интернета, прав доступа и успешной синхронизации он отправляется в облако.',
                    points: [
                        'Осмотр сохраняется локально',
                        'Фото могут загружаться дольше текста',
                        'После синхронизации данные видны другим пользователям по ролям'
                    ],
                    color: 'indigo'
                },
                history: {
                    id: 'tutorial-history-list-card',
                    badge: 'история проверок',
                    title: 'Что смотреть в истории',
                    text: 'История — это не просто архив. Здесь видно, какие проверки были проведены, где зафиксированы дефекты, какие фото приложены и как менялось качество подрядчика.',
                    points: [
                        'Проверяйте объект, подрядчика и локацию',
                        'Открывайте карточку проверки для деталей',
                        'Используйте историю для повторяемости, отчётов и разбора'
                    ],
                    color: 'blue'
                },
                day: {
                    id: 'tutorial-history-day-card',
                    badge: 'конец дня',
                    title: 'Как правильно завершить рабочий день',
                    text: 'В конце дня важно убедиться, что проверки сохранены, фото прикреплены, черновики не забыты, а синхронизация выполнена.',
                    points: [
                        'Проверьте сохранённые осмотры',
                        'Убедитесь, что фото открываются',
                        'Запустите синхронизацию перед закрытием дня'
                    ],
                    color: 'emerald'
                }
            };

            const card = cards[mode] || cards.history;

            const colorMap = {
                indigo: {
                    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
                    text: 'text-indigo-600 dark:text-indigo-300',
                    border: 'border-indigo-100 dark:border-indigo-800',
                    solid: 'bg-indigo-600'
                },
                blue: {
                    bg: 'bg-blue-50 dark:bg-blue-900/30',
                    text: 'text-blue-600 dark:text-blue-300',
                    border: 'border-blue-100 dark:border-blue-800',
                    solid: 'bg-blue-600'
                },
                emerald: {
                    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
                    text: 'text-emerald-600 dark:text-emerald-300',
                    border: 'border-emerald-100 dark:border-emerald-800',
                    solid: 'bg-emerald-600'
                }
            };

            const c = colorMap[card.color] || colorMap.indigo;

            const html = `
                <div id="${card.id}"
                    class="tutorial-history-card mx-1 mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[24px] shadow-sm overflow-hidden">

                    <div class="p-4 ${c.bg} border-b ${c.border}">
                        <div class="flex items-start gap-3">
                            <div class="w-12 h-12 rounded-2xl ${c.solid} text-white flex items-center justify-center shrink-0 shadow-sm">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9 11l3 3L22 4"></path>
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                                </svg>
                            </div>

                            <div class="min-w-0 flex-1">
                                <div class="text-[9px] font-black uppercase tracking-widest ${c.text} mb-1">
                                    ${card.badge}
                                </div>
                                <div class="text-[15px] font-black text-slate-800 dark:text-white leading-tight">
                                    ${card.title}
                                </div>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                                    ${card.text}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 space-y-2">
                        ${card.points.map(p => `
                            <div class="flex items-start gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-snug">
                                <span class="w-5 h-5 rounded-full ${c.bg} ${c.text} border ${c.border} flex items-center justify-center shrink-0 mt-[-2px]">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </span>
                                <span>${p}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            host.insertAdjacentHTML('afterbegin', html);

            const el = document.getElementById(card.id);
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 80);
            }
        }, 180);
    }, 120);
};
const tutorialSteps = [
    {
        title: "1. Что такое RBI Quality Pro",
        text: "RBI Quality Pro не заменяет ПК СК. ПК СК ведёт официальный контур замечаний, а RBI Quality помогает инженеру по качеству видеть риски, повторяемость дефектов, работу подрядчиков и действия для предотвращения брака.",
        targetId: "empty-checklist-state",
        action: () => { switchTab('tab-audit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    },
    {
        title: "2. Обучение проходит в демо",
        text: "Тур автоматически включает демо-режим. Можно нажимать кнопки и изучать модули — рабочие данные не меняются.",
        targetId: "fab-exit-demo",
        action: () => { if (!_isDemoMode() && typeof startDemoMode === 'function') startDemoMode(true); }
    },
    {
        title: "3. Осмотр",
        text: "Осмотр — фактическая проверка качества по чек-листу. От правильного выбора объекта, подрядчика и статусов зависит УрК, отчёты и аналитика.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-audit']",
        action: () => { switchTab('tab-audit'); }
    },
    {
        title: "4. Данные проверки",
        text: "Заполните объект, подрядчика и локацию. Эти данные нужны для ролей, отчётов, рейтинга, ПК СК и аналитики.",
        targetId: "header-data-block",
        action: () => { switchTab('tab-audit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    },
    {
        title: "5. Мини-дашборд",
        text: "В шапке видно качество текущего осмотра и накопленную надёжность подрядчика. Это быстрый индикатор риска.",
        targetId: "header-dashboard",
        action: () => {
            const icon = document.getElementById('dash-expand-icon');
            if (icon && document.getElementById('dash-expanded-view')?.classList.contains('hidden')) icon.click();
        }
    },
    {
        title: "6. Статусы пунктов",
        text: "Соответствует — только если реально проверено. Не соответствует — если есть дефект. Не проверялось — если проверить нельзя. Не применимо — если пункт не относится к зоне.",
        targetId: "card_wrapper_108",
        action: () => {
            switchTab('tab-audit');
            const el = document.getElementById('card_wrapper_108');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },
    {
        title: "7. B1 / B2 / B3",
        text: "B1 — мелкая доработка, B2 — значимый технологический дефект, B3 — критический риск. B2 и B3 сильно влияют на УрК, задачи и управленческие выводы.",
        targetId: "card_wrapper_109",
        action: () => {
            const el = document.getElementById('card_wrapper_109');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },
    {
        title: "8. Фото и комментарии",
        text: "Хорошее замечание содержит место, суть дефекта, требуемое действие и фото. Делайте общий вид, крупный план и фото после устранения.",
        targetId: "card_wrapper_109",
        action: () => {
            const el = document.getElementById('card_wrapper_109');
            if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },
    {
        title: "9. TWI прямо из пункта",
        text: "Если к пункту привязана TWI-карта, инженер может сразу показать прорабу правильный пример, брак и методику проверки.",
        targetSelector: "#card_wrapper_109 .btn-status.text-blue-600, #card_wrapper_109 .btn-status.text-purple-600",
        action: () => { }
    },
    {
        title: "10. Сохранение и офлайн",
        text: "Приложение работает Offline-First: сначала сохраняет данные на устройстве, потом отправляет в облако при наличии интернета и прав. Здесь показано, почему после обхода важно дождаться синхронизации.",
        targetId: "tutorial-history-sync-card",
        action: () => {
            if (typeof window.rbiShowTutorialHistoryCard === 'function') {
                window.rbiShowTutorialHistoryCard('sync');
            }
        }
    },
    {
        title: "11. История проверок",
        text: "История нужна для анализа: какие дефекты были, где повторяются, какие фото приложены и как менялось качество. Открывайте проверки из истории, чтобы смотреть детали, фото и УрК.",
        targetId: "tutorial-history-list-card",
        action: () => {
            if (typeof window.rbiShowTutorialHistoryCard === 'function') {
                window.rbiShowTutorialHistoryCard('history');
            }
        }
    },
    {
        title: "12. Инженер",
        text: "Раздел инженера показывает профиль, задачи, совещания, Impact Score, FMEA и практики.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-engineer']",
        action: () => { switchTab('tab-engineer'); }
    },
    {
        title: "13. Задачи",
        text: "Планировщик задач — это карта рисков. Он подсказывает, где нужен аудит, TWI, FMEA, эталон, совещание или анализ ПК СК.",
        targetSelector: "button[onclick*='eng-sub-tasks']",
        action: () => {
            switchTab('tab-engineer');
            setTimeout(() => {
                const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
                const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-tasks')) || btns[1];
                if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-tasks', btn);
            }, 100);
        }
    },
    {
        title: "14. Задача — не слепой приказ",
        text: "Задача показывает риск, но инженер учитывает реальную ситуацию: доступность зоны, готовность работ, безопасность и график.",
        targetSelector: "button[onclick*='eng-sub-tasks']",
        action: () => { }
    },
    {
        title: "15. Совещания",
        text: "Совещание должно завершаться решениями: ответственный, срок, повторный контроль, TWI, FMEA или эталон.",
        targetSelector: "button[onclick*='eng-sub-meetings']",
        action: () => {
            const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-meetings'));
            if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-meetings', btn);
        }
    },
    {
        title: "16. Impact Score",
        text: "Эффективность инженера — не количество найденных дефектов, а влияние на снижение повторяемости и улучшение процесса.",
        targetSelector: "button[onclick*='eng-sub-impact']",
        action: () => {
            const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-impact'));
            if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-impact', btn);
        }
    },
    {
        title: "17. FMEA",
        text: "FMEA нужен, когда дефект повторяется или риск слишком серьёзный. Результатом должны быть действия: TWI, чек-лист, эталон, обучение или повторный контроль.",
        targetSelector: "button[onclick*='eng-sub-fmea']",
        action: () => {
            const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('eng-sub-fmea'));
            if (btn && typeof rbi_switchEngineerSubTab === 'function') rbi_switchEngineerSubTab('eng-sub-fmea', btn);
        }
    },
    {
        title: "18. Аналитика",
        text: "Аналитика превращает проверки в управленческие выводы: УрК, ИУрК, ИКО, стабильность, повторяемость и зоны риска.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-analytics']",
        action: () => {
            switchTab('tab-analytics');
            setTimeout(() => {
                const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
                if (btns[0] && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-contractors', btns[0]);
            }, 100);
        }
    },
    {
        title: "19. Красная / жёлтая / зелёная зона",
        text: "Цвет подрядчика — сигнал риска. Красная зона требует действий: усиленный контроль, TWI, FMEA, эталон или совещание.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-analytics']",
        action: () => { switchTab('tab-analytics'); }
    },
    {
        title: "20. One-Pager",
        text: "One-Pager — короткий управленческий отчёт для руководителя: риски, подрядчики, дефекты, метрики и действия.",
        targetSelector: "button[onclick*='sub-onepager']",
        action: () => {
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('sub-onepager')) || btns[1];
            if (btn && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-onepager', btn);
        }
    },
    {
        title: "21. График СМР",
        text: "График СМР помогает планировать контроль: старт работ, ППР, инструктаж, финал и зоны будущего риска.",
        targetSelector: "button[onclick*='sub-schedule']",
        action: () => {
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('sub-schedule')) || btns[2];
            if (btn && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-schedule', btn);
        }
    },
    {
        title: "22. ПК СК",
        text: "RBI Quality не заменяет ПК СК. Здесь данные ПК СК используются для анализа: просрочки, CMI, ИСД, формальные закрытия и расхождения.",
        targetSelector: "button[onclick*='sub-sk']",
        action: () => {
            const btns = document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('sub-sk')) || btns[3];
            if (btn && typeof switchAnalyticsSubTab === 'function') switchAnalyticsSubTab('sub-sk', btn);
        }
    },
    {
        title: "23. Справочник",
        text: "Справочник — база знаний инженера: чек-листы, документы, TWI, узлы, практики, эталоны и FAQ.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-reference']",
        action: () => {
            switchTab('tab-reference');
            setTimeout(() => {
                const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
                if (btns[0] && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-checklists', btns[0]);
            }, 100);
        }
    },
    {
        title: "24. TWI",
        text: "TWI — короткая инструкция на рабочем месте. Она нужна, чтобы обучить подрядчика и не допустить повторения дефекта.",
        targetSelector: "button[onclick*='ref-sub-twi']",
        action: () => {
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('ref-sub-twi')) || btns[2];
            if (btn && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-twi', btn);
        }
    },
    {
        title: "25. Узлы и документы",
        text: "Узлы и документы помогают обосновать требования, объяснить правильное решение и снизить споры с подрядчиком.",
        targetSelector: "button[onclick*='ref-sub-docs']",
        action: () => {
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('ref-sub-docs')) || btns[1];
            if (btn && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-docs', btn);
        }
    },
    {
        title: "26. Практики",
        text: "Практики сохраняют рабочие решения, которые помогли снизить брак. Хорошую практику можно превратить в TWI или стандарт.",
        targetSelector: "button[onclick*='ref-sub-practices']",
        action: () => {
            const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
            const btn = Array.from(btns).find(b => String(b.getAttribute('onclick') || '').includes('ref-sub-practices')) || btns[4];
            if (btn && typeof switchReferenceSubTab === 'function') switchReferenceSubTab('ref-sub-practices', btn);
        }
    },
    {
        title: "27. FAQ / ИИ-помощник",
        text: "FAQ — справочник по приложению и методологии. После первой синхронизации база помощника доступна офлайн, а при интернете и включённом AI можно задавать вопросы свободным текстом.",
        targetSelector: "button[onclick*='openFaqModal']",
        action: () => { switchTab('tab-reference'); }
    },
    {
        title: "28. Отчёты",
        text: "Отчёт нужен не только для архива. Это инструмент совещания: показать факты, фото, риски и решения.",
        targetId: "fab-download-btn",
        action: () => {
            if (typeof closeFabExportMenu === 'function') closeFabExportMenu();
            const fab = document.getElementById('fab-download-btn');
            if (fab) {
                fab.style.display = 'flex';
                fab.classList.add('fab-visible');
            }
        }
    },
    {
        title: "29. Синхронизация",
        text: "После важных обходов запускайте синхронизацию. Пока фото или проверки только локальные, их нельзя удалять вместе с данными приложения.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-settings']",
        action: () => {
            if (typeof closeFabExportMenu === 'function') closeFabExportMenu();
            switchTab('tab-settings');
        }
    },
    {
        title: "30. Роли и доступ",
        text: "Пользователь видит данные по роли и закреплениям. Инженер, руководитель, подрядчик, директор и администратор видят разный объём данных.",
        targetSelector: ".bottom-nav .nav-item[data-tab='tab-settings']",
        action: () => { switchTab('tab-settings'); }
    },
    {
        title: "31. Завершение дня",
        text: "В конце дня проверьте: осмотры сохранены, фото прикреплены, черновики не забыты, синхронизация выполнена, критичные дефекты вынесены в отчёт или задачу.",
        targetId: "tutorial-history-day-card",
        action: () => {
            if (typeof window.rbiShowTutorialHistoryCard === 'function') {
                window.rbiShowTutorialHistoryCard('day');
            }
        }
    },
    {
        title: "32. Финал",
        text: "Главная логика: RBI Quality помогает инженеру по качеству быть Business Quality Partner — видеть риски, предотвращать дефекты и улучшать процесс, а не просто вести второй журнал замечаний.",
        targetId: "empty-checklist-state",
        action: () => { switchTab('tab-audit'); },
        isEnd: true
    }
];

function startInteractiveTutorial() {
    if (!_isDemoMode() && typeof startDemoMode === 'function') {
        startDemoMode(true);
    }

    setTimeout(() => {
        currentTutStep = 0;
        tutOverlay = document.getElementById('tutorial-overlay');
        tutHighlightBox = document.getElementById('tut-highlight-box');
        tutTooltip = document.getElementById('tutorial-tooltip');
        tutText = document.getElementById('tut-text');
        tutStepNum = document.getElementById('tut-step');
        tutNextBtn = document.getElementById('tut-next-btn');

        document.getElementById('tut-total').innerText = tutorialSteps.length;

        tutOverlay.classList.remove('hidden');
        tutTooltip.classList.remove('hidden');

        showTutorialStep();
    }, 500);
}
window.startInteractiveTutorial = startInteractiveTutorial;

function showTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    if (!step) return stopTutorial();

    // Экшен (переключение вкладок)
    if (step.action) step.action();

    setTimeout(() => {
        let target = step.targetId ? document.getElementById(step.targetId) : document.querySelector(step.targetSelector);

        // === ЖЕЛЕЗОБЕТОННОЕ ПОЗИЦИОНИРОВАНИЕ РАМКИ ===
        if (target) {
            const rect = target.getBoundingClientRect();
            // Используем fixed позиционирование (прямо по координатам viewport)
            tutHighlightBox.style.top = `${rect.top - 4}px`;
            tutHighlightBox.style.left = `${rect.left - 4}px`;
            tutHighlightBox.style.width = `${rect.width + 8}px`;
            tutHighlightBox.style.height = `${rect.height + 8}px`;
            tutHighlightBox.style.opacity = '1';
        } else {
            tutHighlightBox.style.opacity = '0';
        }

        tutStepNum.innerText = currentTutStep + 1;
        tutText.innerHTML = `<strong class="block text-[14px] mb-2 text-indigo-700 dark:text-indigo-400">${step.title}</strong><span class="text-slate-600 dark:text-slate-300 leading-relaxed">${step.text}</span>`;

        // === УМНОЕ ЦЕНТРИРОВАНИЕ ТУЛТИПА ПО ЭКРАНУ ===
        requestAnimationFrame(() => {
            const screenH = window.innerHeight;

            tutTooltip.style.top = 'auto';
            tutTooltip.style.bottom = 'auto';

            if (target) {
                const targetRect = target.getBoundingClientRect();
                const targetCenter = targetRect.top + (targetRect.height / 2);

                // Если элемент в верхней половине -> тултип вниз, иначе наверх
                if (targetCenter < screenH / 2) {
                    tutTooltip.style.bottom = '60px'; // Отступ от нижнего меню
                } else {
                    tutTooltip.style.top = '90px'; // Отступ от верхней шапки
                }
            } else {
                // Если нет элемента, строго по центру
                tutTooltip.style.top = '40%';
            }

            if (step.isEnd) {
                tutNextBtn.innerText = "Завершить 🚀";
                tutNextBtn.className = "bg-green-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-green-500 active:scale-95 transition-all";
            } else {
                tutNextBtn.innerText = "Далее ➔";
                tutNextBtn.className = "bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-indigo-500 active:scale-95 transition-all";
            }

            tutTooltip.classList.add('tut-active');
        });
    }, 700); // 700мс - гарантированно дожидаемся окончания скролла и отрисовки графиков
}

function nextTutorialStep() {
    const step = tutorialSteps[currentTutStep];
    tutTooltip.classList.remove('tut-active');
    tutHighlightBox.style.opacity = '0';

    setTimeout(() => {
        if (step.isEnd) {
            stopTutorial();
        } else {
            currentTutStep++;
            showTutorialStep();
        }
    }, 400); // Время на затухание
}
window.nextTutorialStep = nextTutorialStep;

function stopTutorial() {
    tutTooltip.classList.remove('tut-active');
    tutHighlightBox.style.opacity = '0';

    // Закрываем всё лишнее
    const expView = document.getElementById('dash-expanded-view');
    if (expView && !expView.classList.contains('hidden')) expView.classList.add('hidden');
    const dashIcon = document.getElementById('dash-expand-icon');
    if (dashIcon) dashIcon.innerText = '▼';

    const fab = document.getElementById('fab-download-btn');
    if (fab) { fab.classList.remove('fab-visible'); setTimeout(() => fab.style.display = 'none', 300); }
    if (typeof closeTwiConstructor === 'function') closeTwiConstructor();
    switchTab('tab-audit');

    setTimeout(() => {
        tutOverlay.classList.add('hidden');
        tutTooltip.classList.add('hidden');

        if (_isDemoMode()) {
            const fabExit = document.getElementById('fab-exit-demo');
            if (fabExit) {
                fabExit.classList.remove('hidden');
                fabExit.style.display = 'flex';
            }
        }

        const manageBody = document.getElementById('ref-manage-body');
        if (manageBody && manageBody.style.maxHeight !== '0px') toggleManagePanel();

        if (typeof updateBodyPadding === 'function') updateBodyPadding();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
}
window.stopTutorial = stopTutorial;
// === КОНЕЦ ВСТАВКИ ===

// =========================================================================
// РАЗМЕТКА tutorial-overlay + tutorial-tooltip (перенос из index.html,
// под-инициатива 1 «Полная очистка index.html»). HTML 1:1 идентична
// прежней статичной разметке. Паттерн — как changelog.js.
// =========================================================================
(function mountTutorialMarkup() {
    if (document.getElementById('tutorial-overlay')) return;
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals');
    if (!root) return;
    root.insertAdjacentHTML('beforeend', `
    <div id="tutorial-overlay" class="fixed inset-0 z-[9998] hidden pointer-events-auto overflow-hidden">
        <!-- Летающая рамка-вырез (затемняет всё вокруг себя) -->
        <div id="tut-highlight-box"
            class="absolute shadow-[0_0_0_9999px_rgba(15,23,42,0.85)] border-2 border-indigo-500 rounded-xl transition-all duration-500 ease-in-out pointer-events-none">
        </div>
    </div>

    <!-- Тултип (подсказка) -->
    <div id="tutorial-tooltip"
        class="fixed z-[9999] bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-5 rounded-2xl shadow-2xl max-w-[280px] w-[90%] transition-all duration-500 ease-in-out transform scale-90 opacity-0 hidden border border-slate-200 dark:border-slate-700">
        <div
            class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex justify-between items-center">
            Обучение (<span id="tut-step">1</span>/<span id="tut-total">10</span>)
            <button data-settings-action="stopTutorial"
                class="text-slate-400 hover:text-red-500 active:scale-90 text-lg leading-none">✕</button>
        </div>
        <div id="tut-text" class="text-[12px] font-bold leading-relaxed mb-5">Текст подсказки</div>
        <div class="flex justify-between items-center pt-2">
            <button data-settings-action="stopTutorial"
                class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Пропустить</button>
            <button id="tut-next-btn" data-settings-action="nextTutorialStep"
                class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-indigo-500 active:scale-95 transition-all">Далее
                ➔</button>
        </div>
        <div id="tut-arrow"
            class="absolute w-4 h-4 bg-white dark:bg-slate-800 border-l border-t border-slate-200 dark:border-slate-700 transform rotate-45 transition-all duration-500 hidden">
        </div>
    </div>
`);
}());
