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
// =====================================================
// УМНЫЙ ПОИСК ПО БАЗЕ ИИ-ПОМОЩНИКА RBI QUALITY
// =====================================================

window.RBI_ASSISTANT_SYNONYMS = {
    // Общие действия
    'фото': ['фотки', 'фотография', 'изображение', 'картинка', 'снимок', 'фотка', 'фотографии'],
    'синхронизация': ['синхрон', 'синхронит', 'синхронизировать', 'облако', 'не ушло', 'не улетело', 'обновить данные'],
    'отчет': ['отчёт', 'pdf', 'пдф', 'qr', 'куар', 'html', 'ссылка', 'снимок отчета', 'снапшот'],
    'ошибка': ['не работает', 'сломалось', 'не открывается', 'не видно', 'пропало', 'не грузится', 'зависло'],
    'пользователь': ['юзер', 'сотрудник', 'инженер', 'аккаунт', 'учетка', 'учётка', 'доступ'],

    // Роли
    'инженер': ['инженер качества', 'qbp', 'quality business partner', 'проверяющий', 'сотрудник качества'],
    'руководитель': ['рп', 'рук', 'менеджер проекта', 'пм', 'начальник', 'директор'],
    'подрядчик': ['контрагент', 'исполнитель', 'субподрядчик', 'бригада', 'прораб'],
    'администратор': ['админ', 'manager', 'управляющий', 'ответственный за систему'],

    // Модули
    'пкс': ['пк ск', 'пк/ск', 'стройконтроль', 'строительный контроль', 'ск', 'предписания', 'официальные замечания'],
    'twi': ['тви', 'инструкция', 'инструктаж', 'карта', 'обучение', 'training within industry'],
    'fmea': ['фмеа', 'анализ причин', 'коренная причина', 'причина дефекта', 'разбор причины'],
    'эталон': ['образец', 'акт эталон', 'акт-эталон', 'пример правильного выполнения'],
    'чеклист': ['чек лист', 'чек-лист', 'проверочный лист', 'осмотр', 'проверка'],

    // Метрики
    'урк': ['уровень качества', 'оценка качества', 'процент качества'],
    'иурк': ['интегральный уровень качества', 'рейтинг подрядчика', 'оценка подрядчика'],
    'ико': ['индекс критичности объекта', 'риск объекта', 'критичность объекта'],
    'исд': ['индекс соответствия данных', 'сокрытие брака', 'расхождение с пк ск'],
    'cmi': ['сиэмай', 'цми', 'индекс зрелости', 'дисциплина устранения', 'просрочки'],
    'impact': ['impact score', 'влияние инженера', 'эффективность инженера'],

    // Дефекты
    'дефект': ['брак', 'замечание', 'нарушение', 'несоответствие', 'косяк', 'проблема'],
    'b1': ['б1', 'мелкий дефект', 'мелкое замечание'],
    'b2': ['б2', 'значимый дефект', 'технологический дефект'],
    'b3': ['б3', 'критический дефект', 'аварийный дефект', 'стоп работа', 'стоп-работа'],
    'просрочка': ['просрочено', 'срок прошел', 'не закрыто в срок', 'задержка устранения'],

    // Частые пользовательские фразы
    'не видно': ['не отображается', 'не показывает', 'пусто', 'пропало'],
    'не открывается': ['не грузится', 'ошибка открытия', 'ссылка не работает'],
    'красная зона': ['красный подрядчик', 'подрядчик красный', 'высокий риск'],
    'желтая зона': ['жёлтая зона', 'желтый подрядчик', 'жёлтый подрядчик', 'средний риск'],
    'зеленая зона': ['зелёная зона', 'зеленый подрядчик', 'зелёный подрядчик', 'низкий риск']
};

window.rbiAssistantNormalizeText = function (value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/й/g, 'и')
        .replace(/[.,!?;:()[\]{}"'`«»]/g, ' ')
        .replace(/[\/\\_\-–—]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

window.rbiAssistantStem = function (word) {
    word = String(word || '').trim();
    if (word.length <= 4) return word;

    return word
        .replace(/(иями|ями|ами|его|ого|ему|ому|ыми|ими|ой|ый|ий|ая|ое|ые|ую|юю|ах|ях|ам|ям|ом|ем|ою|ею|ов|ев|ия|ие|ии|ых|их|ого|ему|ами|ями|ить|ать|ять|ется|ются|ого|его)$/i, '')
        .replace(/(а|я|ы|и|е|у|ю|о|й)$/i, '');
};

window.rbiAssistantTokenize = function (text) {
    const normalized = window.rbiAssistantNormalizeText(text);
    return normalized
        .split(' ')
        .map(w => w.trim())
        .filter(w => w.length > 1)
        .map(w => window.rbiAssistantStem(w))
        .filter(w => w.length > 1);
};

window.rbiAssistantExpandQuery = function (question) {
    const baseText = window.rbiAssistantNormalizeText(question);
    const expanded = new Set();

    window.rbiAssistantTokenize(baseText).forEach(t => expanded.add(t));

    Object.entries(window.RBI_ASSISTANT_SYNONYMS || {}).forEach(([main, variants]) => {
        const all = [main, ...(variants || [])].map(window.rbiAssistantNormalizeText);
        const matched = all.some(v => {
            if (!v) return false;
            return baseText.includes(v) || window.rbiAssistantTokenize(v).some(t => baseText.includes(t));
        });

        if (matched) {
            all.forEach(v => {
                window.rbiAssistantTokenize(v).forEach(t => expanded.add(t));
            });
        }
    });

    return Array.from(expanded).filter(Boolean);
};

window.rbiAssistantCharSimilarity = function (a, b) {
    a = window.rbiAssistantNormalizeText(a);
    b = window.rbiAssistantNormalizeText(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.82;

    const grams = (s) => {
        const arr = [];
        const clean = ` ${s} `;
        for (let i = 0; i < clean.length - 2; i++) arr.push(clean.substring(i, i + 3));
        return arr;
    };

    const aSet = new Set(grams(a));
    const bSet = new Set(grams(b));
    let inter = 0;
    aSet.forEach(x => { if (bSet.has(x)) inter++; });
    const union = aSet.size + bSet.size - inter;

    return union ? inter / union : 0;
};

window.rbiAssistantDetectIntentBoost = function (question, item) {
    const q = window.rbiAssistantNormalizeText(question);
    const itemText = window.rbiAssistantNormalizeText(
        `${item.question || ''} ${(Array.isArray(item.tags) ? item.tags.join(' ') : item.tags || '')}`
    );

    let boost = 0;

    const rules = [
        { keys: ['что делать', 'как быть', 'куда нажать', 'как исправить'], targets: ['что делать', 'как', 'сценарий', 'ошибка'] },
        { keys: ['почему', 'из за чего', 'зачем'], targets: ['почему', 'зачем', 'что означает'] },
        { keys: ['что такое', 'объясни', 'простыми словами'], targets: ['что такое', 'простыми словами'] },
        { keys: ['не видно', 'не открывается', 'пропало', 'не синхронит'], targets: ['ошибка', 'что делать', 'не видно', 'не открывается', 'пропало'] },
        { keys: ['совещание', 'руководител', 'директор'], targets: ['совещание', 'руководитель', 'директор', 'управленческий вывод'] },
        { keys: ['подрядчик', 'прораб', 'бригада'], targets: ['подрядчик', 'прораб', 'бригада', 'twi'] }
    ];

    rules.forEach(rule => {
        const hasKey = rule.keys.some(k => q.includes(k));
        if (!hasKey) return;
        if (rule.targets.some(t => itemText.includes(t))) boost += 18;
    });

    return boost;
};

window.rbiAssistantScoreItem = function (question, item) {
    const expandedTokens = window.rbiAssistantExpandQuery(question);
    const rawQuestion = window.rbiAssistantNormalizeText(question);

    const itemQuestion = window.rbiAssistantNormalizeText(item.question || '');
    const itemAnswer = window.rbiAssistantNormalizeText(item.answer || '');
    const itemTags = window.rbiAssistantNormalizeText(Array.isArray(item.tags) ? item.tags.join(' ') : item.tags || '');

    const questionTokens = window.rbiAssistantTokenize(itemQuestion);
    const answerTokens = window.rbiAssistantTokenize(itemAnswer);
    const tagTokens = window.rbiAssistantTokenize(itemTags);

    let score = 0;
    const matched = new Set();

    if (itemQuestion === rawQuestion) score += 120;
    if (itemQuestion.includes(rawQuestion) && rawQuestion.length > 5) score += 70;
    if (rawQuestion.includes(itemQuestion) && itemQuestion.length > 5) score += 45;

    expandedTokens.forEach(token => {
        if (!token || token.length < 2) return;

        if (tagTokens.includes(token)) {
            score += 28;
            matched.add(token);
        }

        if (questionTokens.includes(token)) {
            score += 22;
            matched.add(token);
        }

        if (answerTokens.includes(token)) {
            score += 7;
            matched.add(token);
        }

        // Мягкое совпадение для опечаток и разных форм слов
        const fuzzyQuestion = questionTokens.some(t => window.rbiAssistantCharSimilarity(token, t) >= 0.72);
        const fuzzyTags = tagTokens.some(t => window.rbiAssistantCharSimilarity(token, t) >= 0.74);

        if (fuzzyTags) {
            score += 14;
            matched.add(token);
        }

        if (fuzzyQuestion) {
            score += 10;
            matched.add(token);
        }
    });

    // Бонус за покрытие нескольких слов запроса
    if (matched.size >= 2) score += matched.size * 8;
    if (matched.size >= 4) score += 20;

    score += window.rbiAssistantDetectIntentBoost(question, item);

    return {
        score,
        matched: Array.from(matched)
    };
};

window.rbiAssistantFindContext = function (question, kbItems, options = {}) {
    const minScore = options.minScore || 18;
    const maxItems = options.maxItems || 7;

    const activeItems = (kbItems || []).filter(i =>
        i &&
        !i._deleted &&
        !i.is_deleted &&
        i.enabled !== false &&
        i.question &&
        i.answer
    );

    const scored = activeItems
        .map(item => {
            const result = window.rbiAssistantScoreItem(question, item);
            return { ...item, score: result.score, matched: result.matched };
        })
        .filter(item => item.score >= minScore)
        .sort((a, b) => b.score - a.score);

    return scored.slice(0, maxItems);
};

window.rbiAssistantBuildContextText = function (items) {
    const MAX_CONTEXT_LENGTH = 6500;
    let text = '';

    (items || []).forEach((item, idx) => {
        let answer = String(item.answer || '').trim();
        if (answer.length > 1800) answer = answer.substring(0, 1800) + '...';

        text += `Источник ${idx + 1}\n`;
        text += `Тема: ${item.question || ''}\n`;
        text += `Теги: ${Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')}\n`;
        text += `Инструкция: ${answer}\n\n`;
    });

    if (text.length > MAX_CONTEXT_LENGTH) {
        text = text.substring(0, MAX_CONTEXT_LENGTH) + '\n\n[Контекст сокращён]';
    }

    return text;
};

window.rbiAssistantOfflineAnswer = function (question, contextArr) {
    if (!contextArr || contextArr.length === 0) {
        return 'Я не нашёл точного ответа в базе помощника. Уточните вопрос: укажите модуль, роль пользователя и что именно нужно сделать.';
    }

    const best = contextArr[0];
    const related = contextArr.slice(1, 4)
        .map(x => `• ${x.question}`)
        .join('\n');

    let answer = String(best.answer || '').trim();

    if (related) {
        answer += `\n\nПохожие темы, которые могут помочь:\n${related}`;
    }

    return answer;
};

window.rbiAssistantRenderMessage = function (chatHistory, html, type = 'ai') {
    const isError = type === 'error';
    const isInfo = type === 'info';

    const avatarClass = isError ? 'bg-red-200' : isInfo ? 'bg-slate-300 text-white' : 'bg-indigo-600 text-white';
    const boxClass = isError
        ? 'bg-red-50 text-red-600 border border-red-200'
        : isInfo
            ? 'bg-slate-50 text-slate-700 border border-slate-200'
            : 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200';

    const icon = isError ? '❌' : isInfo ? 'AI' : 'AI';

    const msgHtml = `
        <div class="flex gap-2 w-full max-w-[90%] mb-4">
            <div class="w-6 h-6 ${avatarClass} rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold shadow-md">${icon}</div>
            <div class="${boxClass} p-3 rounded-2xl rounded-tl-none text-[12px] shadow-sm leading-relaxed whitespace-pre-wrap font-medium">
                ${html}
            </div>
        </div>`;

    chatHistory.insertAdjacentHTML('beforeend', msgHtml);
    chatHistory.scrollTop = chatHistory.scrollHeight;
};

window.askAppAssistant = async function () {
    const inputEl = document.getElementById('app-assistant-input');
    const chatHistory = document.getElementById('app-assistant-history');
    const btn = document.getElementById('app-assistant-send-btn');

    const question = inputEl.value.trim();
    if (!question) return;

    const userMsgHtml = `
        <div class="flex gap-2 w-full max-w-[85%] ml-auto justify-end mb-4">
            <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none text-[12px] shadow-sm font-medium leading-relaxed">${escapeHtml(question)}</div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', userMsgHtml);

    inputEl.value = '';
    inputEl.focus();

    const loaderId = 'loader_' + Date.now();
    const loaderHtml = `
        <div id="${loaderId}" class="flex gap-2 w-full max-w-[85%] mb-4">
            <div class="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-[10px] shrink-0">🤖</div>
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none text-[12px] text-slate-500 shadow-sm animate-pulse">
                Ищу по базе помощника...
            </div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', loaderHtml);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        btn.disabled = true;
        btn.style.opacity = '0.5';

        let kbItems = [];

        if (typeof dbGetAll === 'function') {
            kbItems = await dbGetAll('app_assistant_kb') || [];
        }

        if ((!kbItems || kbItems.length === 0) && Array.isArray(window.appAssistantData)) {
            kbItems = window.appAssistantData;
        }

        kbItems = (kbItems || []).filter(i =>
            i &&
            !i._deleted &&
            !i.is_deleted &&
            i.enabled !== false &&
            (
                !window.syncConfig?.projectCode ||
                !i.project_code ||
                i.project_code === window.syncConfig.projectCode
            )
        );

        const contextArr = window.rbiAssistantFindContext(question, kbItems, {
            minScore: 18,
            maxItems: 8
        });

        const loader = document.getElementById(loaderId);
        if (loader) loader.remove();

        if (contextArr.length === 0) {
            window.rbiAssistantRenderMessage(
                chatHistory,
                `Я не нашёл точного ответа в базе помощника.

Попробуйте уточнить вопрос:
• укажите модуль: осмотр, TWI, отчёт, ПК СК, задачи, синхронизация;
• укажите роль: инженер, руководитель, подрядчик, администратор;
• опишите действие: что хотите сделать или какая ошибка возникла.

Примеры:
• "фото не видно в QR-отчёте"
• "как применить TWI"
• "что делать если низкий ИСД"
• "почему подрядчик красный"`,
                'info'
            );
            return;
        }

        const isOnline = navigator.onLine !== false;
        const hasAI =
            typeof window.callAI === 'function' &&
            typeof appSettings !== 'undefined' &&
            appSettings.aiEnabled === true &&
            isOnline;

        // OFFLINE-режим: отвечаем прямо из базы, без DeepSeek
        if (!hasAI) {
            const offlineAnswer = window.rbiAssistantOfflineAnswer(question, contextArr);
            window.rbiAssistantRenderMessage(chatHistory, escapeHtml(offlineAnswer), 'ai');
            return;
        }

        const topContext = window.rbiAssistantBuildContextText(contextArr);

        const promptSystem = `Ты — встроенный помощник приложения RBI Quality Pro.

Твоя задача — помогать пользователям приложения: инженерам по качеству, руководителям, администраторам, подрядчикам, прорабам и технадзору.

ВАЖНО:
1. Отвечай только на основе блока "ОФИЦИАЛЬНАЯ БАЗА ПОМОЩНИКА".
2. Не придумывай кнопки, функции, таблицы и процессы, которых нет в базе.
3. RBI Quality Pro не заменяет ПК СК. ПК СК — официальный контур замечаний. RBI Quality Pro — контур анализа рисков, качества, TWI, FMEA, эталонов, отчётов и работы инженера по качеству как Business Quality Partner.
4. Если вопрос звучит разговорно, пойми намерение пользователя и дай практический ответ.
5. Если пользователь спрашивает "что делать", дай пошаговый ответ.
6. Если данных недостаточно, скажи, что в базе нет точной инструкции, и предложи уточнить модуль/роль/ситуацию.
7. Отвечай коротко, по делу, без технических деталей для разработчика.
8. Не упоминай SQL, Service Worker, GitHub, sw.js, CACHE_NAME и внутреннюю админку, если пользователь явно не спрашивает об администрировании.

ОФИЦИАЛЬНАЯ БАЗА ПОМОЩНИКА:
${topContext}`;

        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: question }
        ], {
            temperature: 0.15,
            max_tokens: 900
        });

        window.rbiAssistantRenderMessage(chatHistory, response, 'ai');

    } catch (e) {
        const loader = document.getElementById(loaderId);
        if (loader) loader.remove();

        // Если AI упал, но контекст был найден — отвечаем офлайн из базы.
        try {
            let kbItems = [];
            if (typeof dbGetAll === 'function') kbItems = await dbGetAll('app_assistant_kb') || [];
            if ((!kbItems || kbItems.length === 0) && Array.isArray(window.appAssistantData)) kbItems = window.appAssistantData;

            const contextArr = window.rbiAssistantFindContext(question, kbItems, {
                minScore: 18,
                maxItems: 5
            });

            if (contextArr.length > 0) {
                const offlineAnswer = window.rbiAssistantOfflineAnswer(question, contextArr);
                window.rbiAssistantRenderMessage(
                    chatHistory,
                    escapeHtml(`Связь с AI недоступна, отвечаю по локальной базе:\n\n${offlineAnswer}`),
                    'ai'
                );
                return;
            }
        } catch (innerError) {
            console.warn('[Assistant fallback error]', innerError);
        }

        window.rbiAssistantRenderMessage(
            chatHistory,
            `Не удалось получить ответ: ${escapeHtml(e.message || 'ошибка связи')}`,
            'error'
        );

    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
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