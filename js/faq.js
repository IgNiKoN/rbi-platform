/* Файл: js/faq.js */
// Чтобы добавить новый раздел, добавьте объект в массив:
// { title: 'Название раздела', items: [ { q: 'Вопрос', a: 'Ответ' }, ... ] }

// Чтобы добавить новый раздел, добавьте объект в массив:
// { title: 'Название раздела', items: [ { q: 'Вопрос', a: 'Ответ' }, ... ] }

const FAQ_DATA = [
    {
        title: 'Философия системы и Роль QBP',
        items: [
            { q: 'В чем суть приложения RBI Quality?', a: 'RBI Quality — это риск-ориентированная система на основе данных (Data-Driven). Роль сотрудника — не просто инспектор, а Quality Business Partner (QBP). Задача QBP: выявлять системные проблемы, оценивать риски, управлять качеством подрядчика и выстраивать превентивные меры.' },
            { q: 'Нужен ли интернет для работы на площадке?', a: 'Нет. Приложение работает полностью автономно (Offline-First). Все проверки, фотографии и справочники сохраняются в изолированную базу данных устройства. Синхронизация с облаком происходит только при наличии связи и по команде QBP.' }
        ]
    },
    {
        title: 'Методология Осмотра',
        items: [
            { q: 'Как быстро проводить Осмотр?', a: 'Используйте свайпы (жесты)! Свайп карточки вправо — это OK, карточка схлопнется. Свайп влево — это Брак. Это позволяет проводить аудит на ходу одной рукой.' },
            { q: 'Что такое категории дефектов B1, B2 и B3?', a: '<b>B1 (Мелкий)</b> — эстетика, устраняется легко, не влияет на надежность (Вес: 1).<br><b>B2 (Значимый)</b> — системное нарушение технологии, требующее переделки (Вес: 2).<br><b>B3 (Критический)</b> — угроза безопасности, прочности конструкции или СТОП-работа (Вес: 3).' },
            { q: 'Что такое Правило Эскалации (>1.5)?', a: 'Если подрядчик совершил дефект (B2), но превысил допустимую норму более чем в 1.5 раза (например, завал стены 25 мм при норме 10 мм), QBP обязан нажать кнопку эскалации. Дефект автоматически переводится в Критический (B3).' }
        ]
    },
    {
        title: 'Математика УрК и Штрафы',
        items: [
            { q: 'Как считается Уровень Качества (УрК)?', a: 'Система использует многофакторную формулу:<br><code class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border font-mono text-[10px] mt-1 mb-1 block w-fit">УрК = Базовый балл × Ks × Kcrit</code><br>Где Базовый балл — это процент пройденных пунктов (с учетом их веса). Ks — штраф за системность. Kcrit — штраф за критичность.' },
            { q: 'Как работают коэффициенты Ks и Kcrit?', a: '<b>Ks (Коэффициент системности)</b> снижает оценку, если один и тот же дефект повторяется из проверки в проверку. Чем чаще повтор — тем сильнее штраф.<br><b>Kcrit (Критика)</b> режет оценку пополам (0.5), если найден хотя бы один дефект B3.' },
            { q: 'Что такое "Правило Стеклянного потолка" (Cap84)?', a: 'Жёсткое правило стройконтроля: если на объекте допущен хотя бы один системный дефект (B2) или применены штрафные коэффициенты, итоговая оценка <b>не может превышать 84%</b>, даже если остальные объемы выполнены идеально.' }
        ]
    },
    {
        title: 'Аналитика и Рейтинги Объекта',
        items: [
            { q: 'Что такое Индекс Критичности Объекта (ИКО)?', a: 'ИКО — это средневзвешенная угроза от всех подрядчиков на объекте. Оценивается от 0 до 1.<br><b>< 0.30</b> — Управляемая зона (Низкий риск)<br><b>0.30 – 0.59</b> — Требует внимания (Средний риск)<br><b>≥ 0.60</b> — Аварийная зона (Высокий риск).' },
            { q: 'Что такое Индекс Стабильности подрядчика?', a: 'Показывает разброс (волатильность) оценок подрядчика. Если УрК скачет от 40% до 100% — стабильность низкая, доверять такому подрядчику нельзя. Значение <b>> 80</b> означает, что процесс стабилен и предсказуем.' },
            { q: 'Зачем нужна Тепловая карта этапов?', a: 'Матрица рисков, которая показывает количество дефектов на пересечении "Подрядчик — Вид работ". Выделенные ячейки указывают на места, где прямо сейчас генерируется больше всего брака.' }
        ]
    },
    {
        title: 'Интеграция с ПК Стройконтроль',
        items: [
            { q: 'Что такое Индекс Соответствия (ИСД)?', a: 'ИСД — это детектор сокрытия брака. Система сопоставляет выборку из аудитов RBI с количеством реальных предписаний в системе Стройконтроля (СК). Если по статистике должно быть 20 замечаний, а в СК выдано только 5, ИСД составит 25% (Красная зона).' },
            { q: 'Что такое Индекс Зрелости (CMI)?', a: 'CMI (Control Maturity Index) оценивает дисциплину подрядчика по устранению предписаний. Формула учитывает процент замечаний, закрытых вовремя, процент просрочки и среднюю глубину (в днях) закрытия проблемы.' },
            { q: 'Как работает AI-анализ в модуле ПК СК?', a: 'ИИ анализирует тексты выданных предписаний, находит самые частые слова и формирует жесткое управленческое письмо (Мемо) для прораба, которое QBP может скопировать и отправить в мессенджер.' }
        ]
    },
    {
        title: 'Эффективность QBP (Оценка работы)',
        items: [
            { q: 'Что такое Impact Score (Влияние)?', a: 'Главная метрика QBP. Система замеряет УрК подрядчика ДО вмешательства (например, проведения планерки или выдачи TWI) и ПОСЛЕ. Если качество выросло — Impact Score становится положительным.' },
            { q: 'Как получать Опыт (XP) и уровни?', a: 'XP начисляется за профессиональную активность: проведение качественных проверок, прикрепление фото, указание коренных причин брака. Особые бонусы даются за создание TWI-инструкций, снятие Актов-Эталонов и публикацию Практик.' },
            { q: 'Зачем нужен Авто-Планировщик задач?', a: 'Система освобождает QBP от рутины. Она анализирует график СМР и рейтинги подрядчиков, выставляя задачи на неделю: у кого снять Эталон, где усилить аудит, а кому провести Воркшоп.' }
        ]
    },
    {
        title: 'База Знаний и Стандарты TWI',
        items: [
            { q: 'Что такое TWI-карты?', a: 'TWI (Training Within Industry) — визуальные стандарты. Бывают трех типов:<br>1. <b>Технадзор:</b> Фото Правильно / Брак с указанием допусков.<br>2. <b>Рабочий:</b> Пошаговый алгоритм действий.<br>3. <b>Регламент:</b> Внешний PDF документ.' },
            { q: 'Как работает "Магия TWI"?', a: 'Если в ходе осмотров вы прикрепили фото Эталона (OK) и фото Брака (FAIL) к одному и тому же пункту, система "поймает" это и предложит в 1 клик собрать из них обучающую карточку TWI.' },
            { q: 'Как пользоваться AI-чатом по нормативам?', a: 'В разделе Справочник нажмите "Спросить ИИ". Нейросеть проанализирует загруженные документы, СП и ГОСТы, чтобы выдать точную выжимку требований по вашему запросу.' }
        ]
    },
    {
        title: 'Лучшие Практики и FMEA',
        items: [
            { q: 'Что такое "Лучшая Практика"?', a: 'Если ваш Impact Score по подрядчику превысил +10% (вы решили сложную системную проблему), система предложит кристаллизовать этот опыт: описать проблему, решение и приложить фото Было/Стало для обмена опытом с другими QBP.' },
            { q: 'Что такое FMEA-анализ?', a: 'Анализ коренных причин. Система автоматически собирает в таблицу все дефекты, которые повторились более 3 раз. ИИ или QBP указывает причину, метод устранения (Fix) и метод предотвращения.' },
            { q: 'Что такое RPN в таблице FMEA?', a: 'RPN (Risk Priority Number) — приоритетное число риска от 1 до 1000. Помогает ранжировать системные проблемы: чем выше число, тем критичнее влияние дефекта на итоговый проект.' }
        ]
    }
];

window.openFaqModal = function() {
    renderFaqList();
    const modal = document.getElementById('faq-modal-overlay');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('translate-y-full');
    }, 10);
};

window.closeFaqModal = function() {
    const modal = document.getElementById('faq-modal-overlay');
    modal.classList.add('opacity-0');
    modal.querySelector('.transform').classList.add('translate-y-full');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
};

window.filterFaq = function() {
    const term = document.getElementById('faq-search-input').value.toLowerCase();
    renderFaqList(term);
};

window.toggleFaqAnswer = function(element) {
    const content = element.nextElementSibling;
    const icon = element.querySelector('.faq-icon');
    if (content.style.maxHeight === '0px' || !content.style.maxHeight) {
        content.style.maxHeight = '500px';
        content.style.paddingTop = '12px';
        content.style.paddingBottom = '12px';
        content.style.opacity = '1';
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.style.maxHeight = '0px';
        content.style.paddingTop = '0px';
        content.style.paddingBottom = '0px';
        content.style.opacity = '0';
        icon.style.transform = 'rotate(0deg)';
    }
};

function renderFaqList(searchTerm = '') {
    const container = document.getElementById('faq-list-container');
    let html = '';

    FAQ_DATA.forEach((section, sIdx) => {
        // Фильтруем вопросы внутри раздела
        const filteredItems = section.items.filter(item => 
            item.q.toLowerCase().includes(searchTerm) || 
            item.a.toLowerCase().includes(searchTerm) ||
            section.title.toLowerCase().includes(searchTerm)
        );

        if (filteredItems.length === 0) return;

        html += `
        <details class="mb-3 group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden" ${searchTerm ? 'open' : ''}>
            <summary class="font-black cursor-pointer p-4 text-[12px] uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 transition-colors flex justify-between items-center select-none">
                <span>${section.title}</span>
                <span class="transition-transform group-open:rotate-180 text-indigo-500">▼</span>
            </summary>
            <div class="p-2 bg-slate-50 dark:bg-slate-900/50">
        `;

        filteredItems.forEach((item, iIdx) => {
            html += `
                <div class="mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div class="p-3 text-[11px] font-bold text-slate-800 dark:text-white cursor-pointer flex justify-between items-center active:bg-slate-50 dark:active:bg-slate-700 transition-colors" onclick="toggleFaqAnswer(this)">
                        <span class="pr-4 leading-snug">${item.q}</span>
                        <svg class="w-4 h-4 text-slate-400 faq-icon transition-transform duration-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    <div class="px-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700" style="max-height: 0px; opacity: 0; overflow: hidden; transition: all 0.3s ease;">
                        ${item.a}
                    </div>
                </div>
            `;
        });

        html += `</div></details>`;
    });

    if (!html) html = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest">Ничего не найдено</div>`;
    container.innerHTML = html;
}

// ==========================================
// AI-ПОМОЩНИК ПО ПРИЛОЖЕНИЮ (АДМИНСКАЯ БАЗА)
// ==========================================

window.openAppAssistantChat = function() {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) {
        return showToast("⚠️ Сначала включите AI-ассистента в Настройках!");
    }
    
    // Закрываем основное окно FAQ
    closeFaqModal();
    
    const modal = document.getElementById('app-assistant-modal');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => { modal.classList.remove('opacity-0'); }, 10);
};

window.closeAppAssistantChat = function() {
    const modal = document.getElementById('app-assistant-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
};

window.askAppAssistant = async function() {
    const inputEl = document.getElementById('app-assistant-input');
    const chatHistory = document.getElementById('app-assistant-history');
    const btn = document.getElementById('app-assistant-send-btn');
    
    const question = inputEl.value.trim();
    if (!question) return;

    // 1. Отображаем вопрос пользователя
    const userMsgHtml = `
        <div class="flex gap-2 w-full max-w-[85%] ml-auto justify-end mb-4">
            <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none text-[12px] shadow-sm font-medium leading-relaxed">${escapeHtml(question)}</div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', userMsgHtml);
    inputEl.value = '';
    inputEl.focus();

    // 2. Отображаем лоадер
    const loaderId = 'loader_' + Date.now();
    const loaderHtml = `
        <div id="${loaderId}" class="flex gap-2 w-full max-w-[85%] mb-4">
            <div class="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-[10px] shrink-0">🤖</div>
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none text-[12px] text-slate-500 shadow-sm animate-pulse">
                Ищу инструкции в базе...
            </div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', loaderHtml);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        btn.disabled = true; btn.style.opacity = '0.5';

        // 3. Достаем базу знаний из памяти устройства
        let kbItems = [];
        if (typeof dbGetAll === 'function') {
            kbItems = await dbGetAll('app_assistant_kb') || [];
        } else {
            kbItems = window.appAssistantData || [];
        }
        kbItems = kbItems.filter(i => !i._deleted && !i.is_deleted);

        // УМНЫЙ ПОИСК (Убираем окончания слов для лучшего совпадения)
        const cleanQuestion = question.toLowerCase().replace(/[.,?!]/g, '');
        const keywords = cleanQuestion.split(' ')
            .filter(w => w.length > 3)
            .map(w => w.length > 5 ? w.substring(0, w.length - 2) : w);
        
        let contextArr = [];
        kbItems.forEach(item => {
            let score = 0;
            const textToSearch = (item.question + ' ' + item.answer + ' ' + (item.tags || []).join(' ')).toLowerCase();
            
            keywords.forEach(kw => {
                if (textToSearch.includes(kw)) score += 10;
            });
            
            // Если нашли точное совпадение слова
            if (score > 0) {
                contextArr.push({ ...item, score });
            }
        });

        // 4. ЖЕСТКАЯ БЛОКИРОВКА ФАНТАЗИЙ
        // Если в нашей базе вообще нет похожих слов — даже не отправляем запрос к нейросети!
        if (contextArr.length === 0) {
            document.getElementById(loaderId).remove();
            const fallbackHtml = `
                <div class="flex gap-2 w-full max-w-[90%] mb-4">
                    <div class="w-6 h-6 bg-slate-300 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold shadow-md">AI</div>
                    <div class="bg-slate-50 border border-slate-200 p-3 rounded-2xl rounded-tl-none text-[12px] text-slate-700 shadow-sm leading-relaxed whitespace-pre-wrap font-medium">
                        К сожалению, в моей базе знаний пока нет информации по этому вопросу. Сформулируйте иначе или обратитесь к разработчику.
                    </div>
                </div>`;
            chatHistory.insertAdjacentHTML('beforeend', fallbackHtml);
            chatHistory.scrollTop = chatHistory.scrollHeight;
            return; // Прерываем выполнение
        }

        contextArr.sort((a,b) => b.score - a.score);
        
        // ОПТИМИЗАЦИЯ КОНТЕКСТА: Обрезаем слишком длинные статьи
        let topContext = '';
        const MAX_CONTEXT_LENGTH = 3000; // Безопасный лимит символов
        
        for (let i = 0; i < Math.min(contextArr.length, 3); i++) {
            let article = contextArr[i].answer;
            // Если статья гигантская, берем только первые 1500 символов
            if (article.length > 1500) {
                article = article.substring(0, 1500) + '... (текст сокращен)';
            }
            topContext += `Тема: ${contextArr[i].question}\nИнструкция: ${article}\n\n`;
            
            if (topContext.length > MAX_CONTEXT_LENGTH) break; // Защита от перегруза
        }

        // 5. ЖЕСТКИЙ ПРОМПТ ДЛЯ DEEPSEEK

        // 5. ЖЕСТКИЙ ПРОМПТ ДЛЯ DEEPSEEK
        const promptSystem = `Ты — строгий технический суппорт приложения "RBI Quality Pro". 
        
        ПРАВИЛО №1: ИСПОЛЬЗУЙ ТОЛЬКО ИНФОРМАЦИЮ ИЗ БЛОКА "ОФИЦИАЛЬНАЯ БАЗА ЗНАНИЙ".
        ПРАВИЛО №2: КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО придумывать функции, кнопки или процессы, которых нет в тексте ниже.
        ПРАВИЛО №3: Если вопрос пользователя не связан с текстом ниже, ответь СТРОГО одной фразой: "Я не знаю ответ на этот вопрос, так как его нет в моей базе инструкций."
        
        ОФИЦИАЛЬНАЯ БАЗА ЗНАНИЙ:
        ${topContext}`;

        // Вызов DeepSeek 
        let response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: question }
        ], { temperature: 0.1, max_tokens: 500 }); // Температура 0.1 делает ИИ "скучным" и точным

        // 6. Вывод ответа
        document.getElementById(loaderId).remove();
        const aiMsgHtml = `
            <div class="flex gap-2 w-full max-w-[90%] mb-4">
                <div class="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold shadow-md">AI</div>
                <div class="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 p-3 rounded-2xl rounded-tl-none text-[12px] text-indigo-900 dark:text-indigo-200 shadow-sm leading-relaxed whitespace-pre-wrap font-medium">
                    ${response}
                </div>
            </div>`;
        chatHistory.insertAdjacentHTML('beforeend', aiMsgHtml);
        chatHistory.scrollTop = chatHistory.scrollHeight;

    } catch (e) {
        document.getElementById(loaderId).remove();
        chatHistory.insertAdjacentHTML('beforeend', `
            <div class="flex gap-2 w-full max-w-[85%] mb-4">
                <div class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-[10px] shrink-0">❌</div>
                <div class="bg-red-50 text-red-600 border border-red-200 p-3 rounded-2xl rounded-tl-none text-[12px] shadow-sm">
                    Ошибка связи с сервером: ${e.message}
                </div>
            </div>`);
    } finally {
        btn.disabled = false; btn.style.opacity = '1';
    }
};

// Функция эскейпа (на случай если её нет в скоупе faq.js)
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}