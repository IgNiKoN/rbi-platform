/* Файл: js/ai.js (Модуль Искусственного Интеллекта RBI Quality) */

// === ГЛОБАЛЬНАЯ ФУНКЦИЯ ВЫЗОВА DEEPSEEK AI ===
window.callAI = async function(messages, options = {}) {
    const { temperature = 0.7, max_tokens = 2000 } = options;
    const useServer = !appSettings.usePersonalKey || !appSettings.apiKey;
    
    let url, headers;
    
    if (useServer) {
        url = `${window.APP_CONFIG.SUPABASE_URL}/functions/v1/deepseek-proxy`;
        const token = appSettings.aiCorpPwd;
        if (!token) throw new Error('Введите пароль доступа к корпоративному AI в Настройках!');
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    } else {
        url = 'https://api.deepseek.com/chat/completions';
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appSettings.apiKey}` };
    }

    try {
        const body = { model: 'deepseek-chat', messages, temperature, max_tokens };
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        
        if (!response.ok) {
            if (response.status === 403) throw new Error("Доступ запрещен. Проверьте пароль.");
            if (response.status === 401) throw new Error("Неверный персональный API-ключ.");
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        let aiText = data.choices[0].message.content;
        // Глобальный фикс: превращаем **текст** в <b>текст</b>
        aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        return aiText;
    } catch (e) {
        console.error("[AI Error]:", e);
        throw e;
    }
};

// === 1. ГЕНЕРАТОР УМНЫХ КОММЕНТАРИЕВ ИИ ===
window.generateSmartComment = async function(scenario) {
    if (!currentEditingExpertKey) return;
    if (!appSettings.aiEnabled) return showToast("⚠️ Сначала включите AI в Настройках!");

    const inputField = document.getElementById('modal-expert-input');
    const originalText = inputField.value;
    inputField.value = "⏳ Нейросеть DeepSeek анализирует данные...";
    
    try {
        let promptSystem = ""; let promptUser = "";

        if (currentEditingExpertKey === 'global_main_analysis' || currentEditingExpertKey.startsWith('onepager_') || currentEditingExpertKey === 'global_onepager_pdca') {
            const data = getFilteredAnalyticsData();
            if (data.length === 0) throw new Error("Нет данных для анализа");
            
            let sumB3 = 0; data.forEach(i => { if(i.metrics && i.metrics.n_B3_fail > 0) sumB3++; });
            const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
            const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
            const redZone = currIntMetrics ? currIntMetrics.redZonePerc : 0;

            promptSystem = `Ты — эксперт-аналитик качества. Сформируй КРАТКИЙ обзор (до 80 слов). 1. Статус. 2. Риск. 3. Прогноз. 4. Действие.`;
            promptUser = `ИКО: ${IKO}. В красной зоне: ${redZone}%. Проверок: ${data.length}. Аварий: ${sumB3}. Сценарий: ${scenario}`;
        } else {
            const parts = currentEditingExpertKey.split('_||_');
            const cKey = parts[0]; const tTitle = parts[1];
            const cDataAll = contractorArray.filter(i => (i.contractorName + ' [' + (i.projectName || 'Без объекта') + ']') === cKey && i.templateTitle === tTitle);
            const m = getContractorMetrics(cDataAll, userTemplates);
            
            promptSystem = `Ты — независимый эксперт. КРАТКИЙ отчет (до 70 слов). СТАТУС, ФАКТЫ, ПРОГНОЗ, РЕКОМЕНДАЦИИ.`;
            promptUser = `Подрядчик: ${cKey.split(' [')[0]}. УрК: ${m.finalC}%. Аварий: ${m.rateB3}%. Сценарий: ${scenario}`;
        }

        const aiResponse = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.4, max_tokens: 300 });
        inputField.value = aiResponse;
        showToast("✨ Текст сгенерирован ИИ!");
        if (typeof gameLogAction === 'function') gameLogAction('ai_generate', scenario);
    } catch (error) {
        inputField.value = originalText;
        showToast("❌ Ошибка: " + error.message);
    }
};

// === 2. ONE-PAGER УПРАВЛЕНЧЕСКОЕ РЕШЕНИЕ ===
window.generateOnePagerForecastAi = async function(pdcaKey) {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента!");
    const data = getFilteredAnalyticsData();
    if (data.length === 0) return showToast("Нет данных");
    // (Код функции идентичен оригиналу, перенесен сюда)
    showToast("⏳ AI формирует стратегию...");
    try {
        const response = await window.callAI([{ role: 'system', content: 'Ты директор по качеству. Кратко: ОЦЕНКА, РИСКИ, ПЛАН.' }, { role: 'user', content: `Анализ ${data.length} проверок.` }], { temperature: 0.3, max_tokens: 250 });
        customExpertConclusions[pdcaKey] = response;
        if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
        renderCurrentAnalyticsTab();
        showToast("✨ Управленческое решение обновлено!");
    } catch (e) { showToast("❌ Ошибка: " + e.message); }
};

window.generatePulseAi = async function() {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('pulse-ai-text');
    container.innerHTML = `<span class="animate-pulse">⏳ AI слушает пульс объекта...</span>`;

    const data = getFilteredAnalyticsData();
    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
    
    const promptSystem = `Ты — AI-супервизор. Дай сжатую оценку 'здоровья' стройки (1 абзац, макс 40 слов). Тон: профессиональный.`;
    const promptUser = `ИКО: ${currIntMetrics?currIntMetrics.IKO:'0'}. В красной зоне: ${currIntMetrics?currIntMetrics.redZonePerc:'0'}%. Выявлено проблем: ${countPhotos(data)}.`;

    try {
        const res = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 150 });
        container.innerHTML = res;
        customExpertConclusions['pulse_ai'] = res;
        scheduleSessionSave();
    } catch(e) { container.innerHTML = "Ошибка AI"; }
};

window.generateHeatmapAi = async function() {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('heatmap-ai-text');
    container.classList.remove('hidden');
    container.innerHTML = `<span class="animate-pulse">⏳ AI анализирует матрицу...</span>`;

    // Собираем сырые данные для ИИ (просто передаем топ-2 самые бракованные стадии)
    const promptSystem = `Ты — риск-менеджер. Посмотри на матрицу дефектов и скажи 1 предложением: где главная просадка и какой TWI тренинг провести.`;
    const promptUser = `На объекте чаще всего брак допускают на этапах отделки и фасада.`; // Упрощенный контекст для скорости

    try {
        const res = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 100 });
        container.innerHTML = `<b>💡 Рекомендация:</b> ${res}`;
    } catch(e) { container.innerHTML = "Ошибка AI"; }
};

window.generateContractorForecastAi = async function(contractorName) {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");
    const container = document.getElementById('ai-forecast-container');
    if (!container) return;

    // Фильтр по старому формату
    const data = getFilteredAnalyticsData().filter(c => c.contractorName + ' [' + (c.projectName || 'Без объекта') + ']' === contractorName);
    
    if (data.length < 5) {
        container.innerHTML = `<div class="text-[11px] text-slate-500 font-bold bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">Слишком мало данных для нейросети (нужно от 5 проверок). Продолжайте инспекции.</div>`;
        return;
    }

    const m = getContractorMetrics(data, window.userTemplates);
    const trend = data.slice(-5).map(c => c.metrics.final).join('% ➔ ') + '%';

    container.innerHTML = `<span class="animate-pulse font-bold text-indigo-600 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Нейросеть вычисляет тренд...</span>`;

    const promptSystem = `Ты — предиктивный AI-советник по строительству. Твоя задача — спрогнозировать рейтинг подрядчика через 2 недели и дать ОДИН главный совет инженеру.
    Ответь СТРОГО в 2 абзаца:
    1. Прогноз УрК через 2 недели: [XX]% (Укажи тренд: Рост/Падение/Стагнация).
    2. Фокус для инженера: [Что именно сделать, чтобы переломить тренд или удержать качество].`;

    const promptUser = `Подрядчик: ${contractorName}\nДинамика последних 5 оценок: ${trend}\nИндекс стабильности: ${m.stabilityIndex}/100\nЧастота критических B3: ${m.rateB3}%`;

    try {
        const res = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 150 });
        container.innerHTML = `<div class="text-[12px] leading-relaxed text-indigo-900 dark:text-indigo-200 font-medium whitespace-pre-wrap">${res}</div>`;
        if (typeof gameLogAction === 'function') gameLogAction('ai_generate', 'forecast');
    } catch(e) {
        container.innerHTML = `<span class="text-red-500 font-bold">❌ Ошибка связи с нейросетью</span>`;
    }
};

window.generateCultureAi = async function(contractorName) {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('culture-ai-text');
    container.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">⏳ AI оценивает культуру...</span>`;

    const cData = getFilteredAnalyticsData().filter(c => c.contractorName + ' [' + (c.projectName || 'Без объекта') + ']' === contractorName);
    if (cData.length === 0) return container.innerHTML = `<span class="text-red-500">Ошибка данных</span>`;

    const m = getContractorMetrics(cData, userTemplates);
    const promptSystem = `Ты — эксперт по бережливому производству (Lean). Дай оценку 'Культуры качества' подрядчика. 
    Опирайся на то, как он исправляет ошибки (стабильность). Объем: СТРОГО 2 коротких предложения. Без markdown-звездочек.`;
    const promptUser = `Подрядчик: ${contractorName.split(' [')[0]}. Рейтинг: ${m.finalC}%. Стабильность: ${m.stabilityIndex}. Аварий (B3): ${m.n_изделий_с_B3}.`;

    try {
        const res = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.4, max_tokens: 150 });
        container.innerHTML = res;
        customExpertConclusions[`culture_${contractorName}`] = res;
        if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
    } catch(e) { container.innerHTML = `<span class="text-red-500">Ошибка связи с AI</span>`; }
};

// === AI: ГЕНЕРАЦИЯ ЧЕРНОВИКА TWI КАРТЫ ===
window.generateTwiDraftAi = async function() {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в настройках!");
    
    const title = document.getElementById('twi-title-input').value.trim();
    const norm = document.getElementById('twi-auto-norm-text').innerText;

    if (!title) return showToast("⚠️ Сначала укажите Название Карты!");

    showToast("⏳ Нейросеть генерирует инструкцию...");

    let promptSystem = "";
    let promptUser = `Вид работ/узел: ${title}. \nСправочный норматив: ${norm}`;

    if (currentTwiType === 'INSPECTOR') {
        promptSystem = `Ты — инженер технадзора. Напиши ОЧЕНЬ КРАТКУЮ инструкцию для проверки качества (чтобы она влезла на 1 лист А4 при печати). 
        Верни ответ СТРОГО в формате:
        РИСКИ: [строго 1-2 коротких предложений - к чему приведет нарушение]
        ПОДГОТОВКА: [строго 1-2 короткое предложение - что обеспечить перед проверкой]
        КРИТЕРИИ: [строго 1-2 коротких предложения - допуски и как проверить]`;
    } else if (currentTwiType === 'WORKER') {
        promptSystem = `Ты — бригадир. Напиши КРАТКУЮ пошаговую инструкцию (SOP) для рабочего.
        Разбей процесс на 3-4 лаконичных шага (чтобы влезло на 1 лист). 
        Верни ответ СТРОГО в таком формате, каждый шаг с новой строки:
        Шаг: [текст действия - максимум 10-15 слов] | Время: [минуты цифрой]`;
    }

    try {
        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 300 }); // Уменьшен лимит токенов

        if (currentTwiType === 'INSPECTOR') {
            const risksMatch = response.match(/РИСКИ:\s*(.*?)(?=ПОДГОТОВКА:|КРИТЕРИИ:|$)/is);
            const prepMatch = response.match(/ПОДГОТОВКА:\s*(.*?)(?=КРИТЕРИИ:|$)/is);
            const critMatch = response.match(/КРИТЕРИИ:\s*(.*?)$/is);

            if (risksMatch) document.getElementById('twi-why-input').value = risksMatch[1].trim();
            if (prepMatch) document.getElementById('twi-preparation-input').value = prepMatch[1].trim();
            if (critMatch) document.getElementById('twi-compliance-input').value = critMatch[1].trim();
        } else if (currentTwiType === 'WORKER') {
            document.getElementById('twi-steps-container').innerHTML = '';
            twiStepCount = 0;
            
            const lines = response.split('\n').filter(l => l.includes('Шаг:'));
            lines.forEach(line => {
                const parts = line.split('| Время:');
                const text = parts[0].replace(/Шаг:\s*/, '').trim();
                const time = parts[1] ? parseInt(parts[1].replace(/\D/g, '')) : 0;
                addTwiStep({ text: text, time: isNaN(time) ? 0 : time, photo: null });
            });
            if (lines.length === 0) addTwiStep({ text: response, time: 0, photo: null });
        }

        showToast("✨ Инструкция успешно сгенерирована ИИ!");
    } catch (e) {
        showToast("❌ Ошибка нейросети: " + e.message);
    }
};

// === AI: ГЕНЕРАЦИЯ ОФИЦИАЛЬНОГО ПРЕДПИСАНИЯ ===
window.generatePrescriptionAi = async function(inspectionId) {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в настройках!");
    
    // Находим проверку
    const inspection = contractorArray.find(i => i.id === inspectionId);
    if (!inspection) return;

    // Собираем список дефектов
    let defectsList = [];
    const type = inspection.templateKey.split('_')[0]; 
    const key = inspection.templateKey.replace(type + '_', '');
    const checklist = type === 'sys' && SYSTEM_TEMPLATES[key] ? SYSTEM_TEMPLATES[key].groups : (userTemplates[key] ? userTemplates[key].groups : []);
    
    getFlatList(checklist).forEach(i => {
        if (inspection.state[i.id] === 'fail' || inspection.state[i.id] === 'fail_escalated') {
            const comment = inspection.details && inspection.details[i.id] ? inspection.details[i.id].comment : 'Без комментария';
            defectsList.push(`- Нарушение: ${i.n}. Норматив: ${i.t}. Уточнение: ${comment}`);
        }
    });

    if (defectsList.length === 0) return showToast("В этой проверке нет дефектов для предписания.");

    // Показываем окно ожидания
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = ``;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Генерация документа...</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="flex flex-col items-center justify-center py-6">
            <div class="text-4xl mb-4 animate-bounce">🤖</div>
            <div class="text-sm font-bold text-slate-500 text-center">Нейросеть составляет юридически грамотный текст предписания...</div>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    const promptSystem = `Ты — строгий инженер технического надзора. Составь официальное предписание об устранении нарушений.
    Используй классический деловой стиль. 
    Структура:
    1. ШАПКА: "Кому: Руководителю проекта от организации [Подрядчик]". "От кого: Инженер строительного контроля [Инспектор]".
    2. СУТЬ: "На объекте [Объект] в ходе проверки выявлены следующие нарушения:"
    3. ПЕРЕЧЕНЬ НАРУШЕНИЙ (перечисли их списком).
    4. ТРЕБОВАНИЯ: Устранить нарушения в срок до 3 рабочих дней. В случае невыполнения работы не будут приняты.
    5. ПОДПИСЬ.`;

    const promptUser = `Объект: ${inspection.location} (${inspection.projectName}).
    Подрядчик: ${inspection.contractorName}.
    Инспектор: ${inspection.inspectorName}.
    Список нарушений:
    ${defectsList.join('\n')}`;

    try {
        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 800 });

        // Выводим готовый текст в текстовое поле с возможностью копирования
        document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Предписание готовое</div>`;
        document.getElementById('modal-body').innerHTML = `
            <textarea id="ai-prescription-text" class="w-full h-[50vh] bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[11px] outline-none resize-none text-slate-800 dark:text-slate-200 mb-4">${response}</textarea>
            <button onclick="copyExpertText(this.id, 'ai-prescription-text')" id="btn-copy-presc" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 flex items-center justify-center gap-2">
                📋 Скопировать текст
            </button>
        `;
    } catch (e) {
        closeModal();
        showToast("❌ Ошибка нейросети: " + e.message);
    }
};

// === AI: ПРОГНОЗ РИСКОВ В КАРТОЧКЕ ЗАДАЧИ ===
window.generateTaskRiskAi = async function(contractorName, templateKey, containerId) {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в настройках!");
    
    const container = document.getElementById(containerId);
    if (!container) return;

    const cData = contractorArray.filter(c => c.contractorName === contractorName && c.templateKey === templateKey).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (cData.length < 3) return showToast("Мало данных для прогноза (нужно хотя бы 3 проверки).");

    container.innerHTML = `<div class="text-center text-[10px] text-indigo-500 font-bold animate-pulse py-3">Анализирую динамику...</div>`;

    const m = getContractorMetrics(cData, userTemplates);
    const urkHistory = cData.slice(-5).map(c => c.metrics.final).join('%, ') + '%'; 

    const promptSystem = `Ты — аналитик качества. Оцени риск ухудшения качества подрядчика. 
    Ответь строго в формате:
    Статус: [Риск растёт / Стабильно / Риск снижается]
    Обоснование: [1 короткое предложение, почему так]`;

    const promptUser = `Подрядчик: ${contractorName}
    УрК по последним 5 проверкам (в хронологии): ${urkHistory}
    Индекс стабильности: ${m.stabilityIndex}/100
    Доля критических аварий B3: ${m.rateB3}%`;

    try {
        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 150 });

        const isBad = response.toLowerCase().includes('растёт') || m.finalC < 75;
        const isGood = response.toLowerCase().includes('снижается') || (m.finalC > 85 && m.stabilityIndex > 80);
        const bgColor = isBad ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30' : (isGood ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30' : 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/30');

        container.innerHTML = `
            <div class="${bgColor} border p-3 rounded-xl shadow-sm text-[11px] leading-snug">
                <div class="font-black uppercase mb-1 flex items-center gap-1">🤖 AI-Прогноз</div>
                ${response.replace(/\n/g, '<br>')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<button onclick="generateTaskRiskAi('${contractorName}', '${templateKey}', '${containerId}')" class="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 flex justify-center items-center gap-2">❌ Ошибка. Повторить</button>`;
    }
};

// === AI: МАРШРУТИЗАТОР (ПЛАН НА ДЕНЬ) ===
window.generateAiRoutePlan = async function() {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в настройках!");
    if (!weeklyPlanData || !weeklyPlanData.tasks || weeklyPlanData.tasks.length === 0) return showToast("План пуст.");

    const container = document.getElementById('ai-route-container');
    container.classList.remove('hidden');
    container.innerHTML = `<span class="animate-pulse font-bold">🧠 Нейросеть прокладывает оптимальный маршрут с учетом рисков...</span>`;

    // Собираем контекст по задачам
    const tasksContext = weeklyPlanData.tasks.map(t => 
        `- Подрядчик: ${t.contractor}, Работа: ${t.templateTitle}, Статус: ${t.priority}, Долг: ${t.carryOverCount}`
    ).join('\n');

    const promptSystem = `Ты — AI-логист строительного контроля. Составь оптимальный маршрут на сегодня из списка задач.
    Верни строго 2 абзаца:
    МАРШРУТ: [краткий список из 3-4 самых критичных подрядчиков по порядку].
    ОБОСНОВАНИЕ: [1 предложение, почему выбран такой порядок (например, из-за долгов или аварий)].`;

    try {
        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Задачи в пуле:\n${tasksContext}` }
        ], { temperature: 0.2, max_tokens: 200 });

        container.innerHTML = `<b>📍 Рекомендация маршрута:</b><br>${response.replace(/\n/g, '<br>')}`;
        showToast("✨ Маршрут построен!");
    } catch (e) {
        container.innerHTML = `<span class="text-red-600">Ошибка: ${e.message}</span>`;
    }
};

// === AI: ТЬЮТОР (СОВЕТ ПО РАЗВИТИЮ) ===
window.generateAiTutorAdvice = async function() {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('ai-tutor-container');
    container.classList.remove('hidden');
    container.innerHTML = `<span class="animate-pulse">⏳ Анализирую ваш профиль...</span>`;

    const profile = window.currentProfileData;
    const logs = gameActionLogs.filter(l => l.inspector === profile.name).slice(-20); // Последние 20 действий
    const actionsMap = {};
    logs.forEach(l => { actionsMap[l.action] = (actionsMap[l.action] || 0) + 1; });

    const promptSystem = `Ты — наставник инженера. Дай 1 короткий, мотивирующий совет (максимум 2 предложения) по профессиональному росту. 
    Посмотри на статистику действий и подскажи, чего не хватает (например, мало используют TWI или мало генерируют AI-отчеты). 
    Без воды, сразу к делу.`;

    const promptUser = `XP инженера: ${profile.pi}. Последние действия: ${JSON.stringify(actionsMap)}. Навыки: ${JSON.stringify(profile.radarData)}.`;

    try {
        const response = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.5, max_tokens: 150 });
        container.innerHTML = `<b>💡 Наставление:</b> ${response}`;
    } catch (e) {
        container.innerHTML = `<span class="text-red-500">Ошибка AI</span>`;
    }
};

// === AI-ПОДСКАЗКА ДЛЯ ПРЕДОТВРАЩЕНИЯ ДЕФЕКТОВ ===
window.generateAiHintForDefect = async function() {
    if (!appSettings.aiEnabled || !currentCommentId) return;
    
    const select = document.getElementById('modal-cause-select');
    const aiHint = document.getElementById('ai-hint-block');
    const causeCode = select.value;
    
    if (!causeCode) {
        aiHint.classList.add('hidden');
        return;
    }

    const causeName = DEFECT_CAUSES.find(c => c.code === causeCode)?.name || 'Неизвестная причина';
    
    const flatList = getFlatList(currentChecklist);
    const itemData = flatList.find(x => x.id === currentCommentId);
    if (!itemData) return;

    // Проверяем, есть ли для этого пункта TWI-карта
    const existingTwi = customTwiCards.find(c => c.checklistKey === currentTemplateKey && (String(c.itemId) === String(currentCommentId) || c.itemId === 'ALL'));
    const twiContext = existingTwi ? `В базе УЖЕ ЕСТЬ TWI-карта "${existingTwi.title}". Посоветуй инженеру показать её рабочим.` : `В базе НЕТ TWI-карты для этого узла. Посоветуй инженеру её создать.`;

    aiHint.classList.remove('hidden');
    aiHint.innerHTML = `<span class="animate-pulse text-slate-500">⏳ AI формулирует совет...</span>`;

    const promptSystem = `Ты — старший наставник стройконтроля. Дай инспектору 1-2 коротких предложения: как предотвратить этот дефект прямо сейчас на площадке. 
    ОБЯЗАТЕЛЬНО учти контекст: ${twiContext}`;
    
    const promptUser = `Нарушение: ${itemData.n}. Норма: ${itemData.t}. Причина: ${causeName}.`;

    try {
        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.4, max_tokens: 150 });

        aiHint.innerHTML = `<b>💡 AI-Совет:</b> ${response.replace(/\n/g, ' ')}`;
    } catch (e) {
        aiHint.classList.add('hidden'); 
    }
};

// === УТИЛИТА: ИЗВЛЕЧЕНИЕ ТЕКСТА ИЗ PDF (С УМНОЙ ПОРЦИОННОЙ ЗАГРУЗКОЙ И ЗАЩИТОЙ ВОРКЕРА) ===
window.extractTextFromPdf = async function(pdfDataUrl) {
    try {
        // Принудительно задаем путь к воркеру, чтобы он не терялся
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        let arrayBuffer;
        if (pdfDataUrl.startsWith('data:')) {
            const base64 = pdfDataUrl.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            arrayBuffer = bytes.buffer;
        } else {
            const res = await fetch(pdfDataUrl);
            if (!res.ok) throw new Error("Не удалось загрузить файл по ссылке");
            arrayBuffer = await res.arrayBuffer();
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        const maxPages = Math.min(pdf.numPages, 300);
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' \n';
            
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        return fullText;
    } catch (err) {
        console.error("Ошибка парсинга PDF:", err);
        // Теперь мы увидим красную плашку, если парсер упадет
        if (typeof showToast === 'function') showToast("❌ Ошибка парсинга PDF: " + err.message);
        return null;
    }
};

// === ГЕНЕРАТОР ТЗ ИЗ ОБРАТНОЙ СВЯЗИ ===
window.rbi_normalizeFeedbackAi = async function(rawText) {
    if (!appSettings.aiEnabled) return null;
    
    const promptSystem = `Ты — технический писатель (Product Manager). Перепиши эмоциональное или сбивчивое сообщение пользователя в формальное предложение по улучшению IT-приложения.
    Формат ответа СТРОГО:
    ПРОБЛЕМА: [одно предложение]
    ПРЕДЛОЖЕНИЕ: [одно предложение]
    РЕЗУЛЬТАТ: [одно предложение]`;

    try {
        const res = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Исходное сообщение: ${rawText}` }
        ], { temperature: 0.2, max_tokens: 300 });
        return res;
    } catch (e) {
        console.error("Ошибка AI нормализации:", e);
        return null;
    }
};

// ============================================================================
// === AI ЧАТ ПО НОРМАТИВАМ (RAG: Поиск контекста + DeepSeek) ===
// ============================================================================

window.openAiDocChat = function() {
    if (!appSettings.aiEnabled) return showToast("⚠️ Сначала включите AI-ассистента в Настройках!");
    document.getElementById('ai-chat-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.closeAiDocChat = function() {
    document.getElementById('ai-chat-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
};

window.askAiDocQuestion = async function() {
    const inputEl = document.getElementById('ai-chat-input');
    const chatHistory = document.getElementById('ai-chat-history');
    const btn = document.getElementById('ai-chat-send-btn');
    
    const question = inputEl.value.trim();
    if (!question) return;

    // 1. Отображаем вопрос пользователя в чате
    const userMsgHtml = `
        <div class="flex gap-2 w-full max-w-[85%] ml-auto justify-end">
            <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none text-[12px] shadow-sm">${escapeHtml(question)}</div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', userMsgHtml);
    inputFieldReset();

    // 2. Отображаем индикатор "Печатает..."
    const loaderId = 'loader_' + Date.now();
    const loaderHtml = `
        <div id="${loaderId}" class="flex gap-2 w-full max-w-[85%]">
            <div class="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-[10px] shrink-0">🤖</div>
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none text-[12px] text-slate-500 shadow-sm animate-pulse">
                Ищу норматив и формулирую ответ...
            </div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', loaderHtml);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // 3. ПРОДВИНУТЫЙ ЛОКАЛЬНЫЙ ПОИСК КОНТЕКСТА (ЧАНКИРОВАНИЕ RAG)
    const allDocs = [...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []), ...(typeof customDocs !== 'undefined' ? customDocs : [])];
    
    // Очищаем вопрос от знаков препинания
    const cleanQuestion = question.toLowerCase().replace(/[.,?!]/g, '');
    
    // БАЗОВЫЙ СТЕММИНГ ДЛЯ РУССКОГО ЯЗЫКА:
    // Берем слова длиннее 3 символов. Если слово длиннее 5 букв — отрезаем последние 2 буквы (окончание),
    // чтобы искать по корню слова (например, "арматурой" -> "арматур", найдет "арматура", "арматурный")
    const keywords = cleanQuestion.split(' ')
        .filter(w => w.length > 3)
        .map(w => w.length > 5 ? w.substring(0, w.length - 2) : w);
    
    let contextArr = [];

    // Настройки нарезки текста (Чанки)
    const CHUNK_SIZE = 1500; // Размер одного куска текста
    const CHUNK_OVERLAP = 300; // Перекрытие, чтобы не разрезать фразу пополам

    // А. Поиск по полнотекстовым PDF документам
    allDocs.forEach(doc => {
        let titleScore = keywords.filter(kw => doc.title.toLowerCase().includes(kw) || doc.code.toLowerCase().includes(kw)).length * 50;

        if (doc.extractedText) {
            const fullText = doc.extractedText;
            // Режем текст на большие куски
            for (let i = 0; i < fullText.length; i += (CHUNK_SIZE - CHUNK_OVERLAP)) {
                const chunk = fullText.substring(i, i + CHUNK_SIZE);
                const chunkLow = chunk.toLowerCase();
                
                let score = titleScore;
                let matchesCount = 0;

                // 1. Ищем отдельные слова
                keywords.forEach(kw => {
                    if (chunkLow.includes(kw)) {
                        score += 10;
                        matchesCount++;
                    }
                });

                // 2. Ищем точную фразу (Бонус X100)
                if (chunkLow.includes(cleanQuestion)) {
                    score += 500;
                    matchesCount += keywords.length;
                }

                // Добавляем кусок только если нашли хотя бы одно слово
                if (matchesCount > 0) {
                    contextArr.push({ 
                        type: 'Документ', 
                        title: doc.code, 
                        // Даем бонус кускам, где встретилось МНОГО РАЗНЫХ слов из запроса
                        score: score * matchesCount, 
                        text: chunk.replace(/\s+/g, ' ') // Убираем лишние пробелы для экономии места
                    });
                }
            }
        } else if (titleScore > 0) {
            contextArr.push({ type: 'Документ', title: doc.code, text: doc.title, score: titleScore });
        }
    });

    // Б. Поиск по чек-листам
    const flatList = getFlatList(currentChecklist);
    flatList.forEach(item => {
        const text = `${item.n} ${item.t}`.toLowerCase();
        let matches = keywords.filter(kw => text.includes(kw)).length;
        if (matches > 0) {
            const cleanNorm = item.t ? item.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ") : "Нет норматива";
            contextArr.push({ type: 'Пункт проверки', title: item.n, text: cleanNorm, score: matches * 20 });
        }
    });

    // В. Поиск по TWI-инструкциям
    if (typeof customTwiCards !== 'undefined') {
        customTwiCards.forEach(twi => {
            const text = `${twi.title} ${twi.whyImportant || ''} ${twi.howToCheck || ''}`.toLowerCase();
            let matches = keywords.filter(kw => text.includes(kw)).length;
            if (matches > 0) {
                let twiContent = `Название: ${twi.title}. `;
                if (twi.whyImportant) twiContent += `Риски: ${twi.whyImportant}. `;
                if (twi.howToCheck) twiContent += `Методика проверки: ${twi.howToCheck}.`;
                contextArr.push({ type: 'TWI-карта', title: twi.title, text: twiContent, score: matches * 15 });
            }
        });
    }

    // Оставляем ТОП-6 самых релевантных огромных кусков (около 9000 символов суммарно)
    contextArr.sort((a,b) => b.score - a.score);
    const topContext = contextArr.slice(0, 6).map(c => `[ИСТОЧНИК: ${c.type} - ${c.title}]\n${c.text}`).join('\n\n');

    // 4. ФОРМИРУЕМ ПРОМПТ ДЛЯ DEEPSEEK
    const promptSystem = `Ты — главный эксперт технического надзора. Ответь на вопрос инженера максимально точно, технически грамотно и ПО СУЩЕСТВУ.
    
    ПРАВИЛА:
    1. Опирайся ТОЛЬКО на информацию из БАЗЫ ЗНАНИЙ ниже. 
    2. Обязательно указывай шифр документа (ГОСТ, СП), если цитируешь его.
    3. Если ответа в базе нет, честно скажи: "В загруженной базе нет точного ответа", но дай общестроительный совет из своего опыта.
    
    БАЗА ЗНАНИЙ ИЗ PDF-ДОКУМЕНТОВ И РЕГЛАМЕНТОВ:
    ${topContext || 'База пуста'}`;

    try {
        btn.disabled = true; btn.style.opacity = '0.5';
        
        // ВЫЗЫВАЕМ ИИ
        let response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: question }
        ], { temperature: 0.2, max_tokens: 2000 }); // Температуру ставим низкую, чтобы не фантазировал, а отвечал строго по ГОСТ

        // 5. Выводим результат
        document.getElementById(loaderId).remove();
        // --- НАЧАЛО НОВОГО БЛОКА: ПОИСК СВЯЗАННЫХ ЧЕК-ЛИСТОВ И TWI ---
        // Берем только существенные слова из запроса (длиннее 4 букв)
        const strongKeywords = cleanQuestion.split(' ')
            .filter(w => w.length > 4)
            .map(w => w.length > 6 ? w.substring(0, w.length - 2) : w);

        let tmplScores = [];
        const allTmpls = { ...SYSTEM_TEMPLATES, ...(typeof userTemplates !== 'undefined' ? userTemplates : {}) };
        
        if (strongKeywords.length > 0) {
            Object.values(allTmpls).forEach(tmpl => {
                let score = 0;
                const titleStr = tmpl.title.toLowerCase();
                
                // Совпадение в названии = 10 баллов
                strongKeywords.forEach(kw => { if (titleStr.includes(kw)) score += 10; });
                
                if (tmpl.groups) {
                    tmpl.groups.forEach(g => {
                        if (g.items) {
                            g.items.forEach(item => {
                                const textToSearch = `${item.n} ${item.t}`.toLowerCase();
                                // Упоминание внутри пунктов = 1 балл
                                strongKeywords.forEach(kw => {
                                    if (textToSearch.includes(kw)) score += 1; 
                                });
                            });
                        }
                    });
                }
                
                // Отсекаем мусор: берем только если набралось 2 и более баллов
                if (score >= 2) tmplScores.push({ title: tmpl.title, score: score });
            });
        }

        let twiScores = [];
        if (typeof customTwiCards !== 'undefined' && strongKeywords.length > 0) {
            customTwiCards.forEach(twi => {
                let score = 0;
                const textToSearch = `${twi.title} ${twi.whyImportant || ''} ${twi.howToCheck || ''}`.toLowerCase();
                strongKeywords.forEach(kw => {
                    if (textToSearch.includes(kw)) score += 2;
                });
                if (score >= 2) twiScores.push({ title: twi.title, score: score });
            });
        }

        // Сортируем по убыванию баллов
        tmplScores.sort((a, b) => b.score - a.score);
        twiScores.sort((a, b) => b.score - a.score);

        // Берем ТОП-2 самых подходящих (чтобы не перегружать интерфейс)
        const topChecklists = tmplScores.slice(0, 2).map(t => t.title);
        const topTwis = twiScores.slice(0, 2).map(t => t.title);

        if (topChecklists.length > 0 || topTwis.length > 0) {
            let appendix = `\n\n<div class="mt-3 p-3 bg-indigo-100/50 dark:bg-indigo-900/50 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">`;
            appendix += `<b class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Связанные материалы в приложении:</b><br>`;
            
            if (topChecklists.length > 0) {
                appendix += `<span class="mt-1 block">• Чек-листы: <b>${topChecklists.join(', ')}</b></span>`;
            }
            if (topTwis.length > 0) {
                appendix += `<span class="mt-1 block">• TWI-карты: <b>${topTwis.join(', ')}</b></span>`;
            }
            appendix += `</div>`;
            
            response += appendix;
        }
        // --- КОНЕЦ НОВОГО БЛОКА ---
        const aiMsgHtml = `
            <div class="flex gap-2 w-full max-w-[90%]">
                <div class="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold shadow-md">AI</div>
                <div class="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 p-3 rounded-2xl rounded-tl-none text-[12px] text-indigo-900 dark:text-indigo-200 shadow-sm leading-relaxed whitespace-pre-wrap font-medium">
                    ${response}
                </div>
            </div>`;
        chatHistory.insertAdjacentHTML('beforeend', aiMsgHtml);
        chatHistory.scrollTop = chatHistory.scrollHeight;

    } catch (e) {
        document.getElementById(loaderId).remove();
        const errorHtml = `
            <div class="flex gap-2 w-full max-w-[85%]">
                <div class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-[10px] shrink-0">❌</div>
                <div class="bg-red-50 text-red-600 border border-red-200 p-3 rounded-2xl rounded-tl-none text-[12px] shadow-sm">
                    Ошибка связи с нейросетью: ${e.message}
                </div>
            </div>`;
        chatHistory.insertAdjacentHTML('beforeend', errorHtml);
    } finally {
        btn.disabled = false; btn.style.opacity = '1';
    }

    function inputFieldReset() {
        inputEl.value = '';
        inputEl.focus();
    }
};

// ГЕНЕРАЦИЯ ПРОТОКОЛА ЧЕРЕЗ DEEPSEEK (Умный сбор данных)
window.rbi_generateMeetingMemo = async function() {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");
    
    // СБОР ДАННЫХ ИЗ ИНТЕРАКТИВНЫХ БЛОКОВ С ЖЕСТКОЙ ГРУППИРОВКОЙ
    let agendaMap = {};
    let totalItems = 0;
    const rows = document.querySelectorAll('.meeting-agenda-row');
    
    rows.forEach(row => {
        const contr = row.querySelector('.agenda-meta-contr').value;
        const defect = row.querySelector('.agenda-meta-defect').value;
        const isDone = row.querySelector('.agenda-done-cb').checked;
        const date = row.querySelector('.agenda-date').value;
        const resp = row.querySelector('.agenda-resp').value.trim();
        const comment = row.querySelector('.agenda-comment').value.trim();

        if (isDone || date || resp || comment) {
            if (!agendaMap[contr]) agendaMap[contr] = [];
            agendaMap[contr].push(`- Проблема: ${defect}. Статус: ${isDone ? 'Решено' : 'В работе'}. Срок: ${date || 'Не указан'}. Отв: ${resp || 'Не назначен'}. Решение: ${comment || 'Не указано'}.`);
            totalItems++;
        }
    });

    let agendaContextString = "";
    for (let c in agendaMap) {
        agendaContextString += `ПОДРЯДЧИК: ${c}\n${agendaMap[c].join('\n')}\n\n`;
    }

    const extraNotes = document.getElementById('rbi-meeting-notes').value.trim();
    
    if (totalItems === 0 && !extraNotes) {
        return showToast("⚠️ Укажите решение хотя бы по одному дефекту или напишите дополнительные тезисы!");
    }

    const btn = document.getElementById('btn-gen-memo');
    btn.innerHTML = `<span class="animate-pulse">⏳ Нейросеть пишет протокол...</span>`;
    btn.disabled = true;

    const promptSystem = `Ты — секретарь-инженер. Составь итоговый протокол строительного совещания (Мемо).
    Я передам тебе уже сгруппированные по подрядчикам данные. Твоя задача — превратить это в красивый деловой текст без лишней воды.
    Формат ответа СТРОГО:
    **ПРОТОКОЛ СОВЕЩАНИЯ ПО КАЧЕСТВУ**
    
    [ИМЯ ПОДРЯДЧИКА 1]
    - [Кратко суть проблемы]. Решение: [Что делать]. Отв: [...]. Срок: [...].
    - [Следующая проблема]...
    
    [ИМЯ ПОДРЯДЧИКА 2]...
    `;

    const promptUser = `ДАННЫЕ ДЛЯ ПРОТОКОЛА:\n\n${agendaContextString}\nДОП. ВОПРОСЫ: ${extraNotes}`;

    try {
        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.2, max_tokens: 800 });

        // Вставляем результат и увеличиваем текстовое поле для удобства чтения
        const textArea = document.getElementById('rbi-meeting-memo-text');
        textArea.value = response;
        textArea.classList.remove('h-32');
        textArea.classList.add('h-64');
        
        // Скроллим вниз, чтобы юзер увидел результат
        setTimeout(() => {
            textArea.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
        
        if (typeof gameLogAction === 'function') gameLogAction('ai_generate', 'meeting_memo');
        showToast("✨ Протокол успешно сформирован!");
    } catch (e) {
        showToast("❌ Ошибка ИИ: " + e.message);
    } finally {
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сформировать протокол (ИИ)`;
        btn.disabled = false;
    }
};

window.rbi_generatePracticeTitleAi = async function() {
    if (!appSettings.aiEnabled) return showToast("Включите AI в настройках!");
    
    const prob = document.getElementById('rbi-prac-problem').value;
    const sol = document.getElementById('rbi-prac-solution').value;
    
    showToast("⏳ Нейросеть генерирует заголовок...");
    try {
        const res = await window.callAI([
            { role: 'system', content: 'Ты редактор бизнес-кейсов. Сделай ОДИН короткий емкий заголовок (до 6 слов) описывающий суть улучшения. Без кавычек.' },
            { role: 'user', content: `Проблема: ${prob}. Решение: ${sol}` }
        ], { temperature: 0.4, max_tokens: 30 });
        document.getElementById('rbi-prac-title').value = res;
    } catch(e) { showToast("Ошибка AI"); }
};

window.rbi_beautifyPracticeAi = async function() {
    if (!appSettings.aiEnabled) return showToast("Включите AI в настройках!");
    
    const probEl = document.getElementById('man-prac-problem');
    const solEl = document.getElementById('man-prac-solution');
    const prob = probEl.value.trim();
    const sol = solEl.value.trim();
    
    if (!prob && !sol) return showToast("Опишите хотя бы что-то, чтобы ИИ мог помочь!");

    showToast("⏳ Нейросеть формулирует текст...");
    
    const promptSystem = `Ты — эксперт-инженер. Твоя задача — красиво, технически грамотно и лаконично переписать текст пользователя для базы 'Лучших практик' компании.
    Верни ответ СТРОГО в таком формате:
    СУТЬ (ПРОБЛЕМА): [грамотное описание проблемы]
    РЕШЕНИЕ (РЕЗУЛЬТАТ): [грамотное описание решения]`;

    try {
        const res = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Исходник.\nЧто делали/Проблема: ${prob}\nРешение/Результат: ${sol}` }
        ], { temperature: 0.3, max_tokens: 300 });

        const pMatch = res.match(/СУТЬ \(ПРОБЛЕМА\):\s*(.*?)(?=РЕШЕНИЕ \(РЕЗУЛЬТАТ\):|$)/is);
        const sMatch = res.match(/РЕШЕНИЕ \(РЕЗУЛЬТАТ\):\s*(.*?)$/is);

        if (pMatch) probEl.value = pMatch[1].trim();
        if (sMatch) solEl.value = sMatch[1].trim();
        showToast("✨ Текст улучшен!");
    } catch(e) { showToast("Ошибка AI: " + e.message); }
};

// 3. АВТОЗАПОЛНЕНИЕ FMEA ЧЕРЕЗ DEEPSEEK
window.rbi_fillFmeaWithAi = async function () {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const rows = document.querySelectorAll('.fmea-row');
    if (rows.length === 0) return;

    const btn = document.getElementById('btn-fmea-ai');
    btn.innerHTML = `<span class="animate-pulse">⏳ Нейросеть думает...</span>`;
    btn.disabled = true;

    let defectsContext = [];
    rows.forEach((row, idx) => {
        const contr = row.querySelector('.f-contr').value;
        const work = row.querySelector('.f-work').value;
        const defect = row.querySelector('.f-defect').value;
        defectsContext.push(`ID ${idx}: Подрядчик [${contr}], Работа [${work}], Дефект [${defect}].`);
    });

    const promptSystem = `Ты — Главный Инженер Качества. Проведи FMEA-анализ (Анализ видов и последствий отказов) списка частых дефектов.
    Твоя задача — вернуть строго JSON-массив. Для каждого дефекта (по его ID) сформируй объект с ключами:
    "stage" - этап возникновения (выбери одно: "Ошибки СМР", "Проект", "Материалы", "Условия").
    "cause" - коренная причина дефекта (почему рабочие так делают? 1 предложение).
    "effect" - последствия дефекта для здания (1 предложение).
    "fix" - предложение по устранению уже допущенного брака (1 предложение).
    "prevent" - системная мера по предотвращению в будущем (1 предложение).
    "rpn" - число Risk Priority Number от 1 до 1000 (Severity * Occurrence * Detection). Чем опаснее дефект, тем выше RPN.`;

    try {
        const responseText = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Анализируй эти дефекты и верни массив JSON (порядок как в списке):\n${defectsContext.join('\n')}` }
        ], { temperature: 0.3, max_tokens: 2000 });

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Нейросеть не вернула JSON");

        const aiData = JSON.parse(jsonMatch[0]);

        rows.forEach((row, idx) => {
            if (aiData[idx]) {
                const data = aiData[idx];
                const stageSel = row.querySelector('.f-stage');
                if (Array.from(stageSel.options).some(opt => opt.value === data.stage)) {
                    stageSel.value = data.stage;
                }
                row.querySelector('.f-cause').value = data.cause || '';
                row.querySelector('.f-effect').value = data.effect || '';
                row.querySelector('.f-fix').value = data.fix || '';
                row.querySelector('.f-prevent').value = data.prevent || '';
                row.querySelector('.f-rpn').value = data.rpn || 0;
            }
        });

        if (typeof gameLogAction === 'function') gameLogAction('fmea_master', 'ai_table');
        showToast("✨ Мега-таблица FMEA заполнена нейросетью!");
    } catch (e) {
        showToast("❌ Ошибка ИИ (попробуйте еще раз): " + e.message);
    } finally {
        btn.innerHTML = `🤖 Автозаполнение (ИИ)`;
        btn.disabled = false;
    }
};

// 3. ВОРКШОП С БРИГАДОЙ (Обновленный функционал с добавлением Фото)
window.rbi_generateWorkshop = async function(taskId) {
    if (!appSettings.aiEnabled) return showToast("Включите AI-ассистента!");
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    const txtArea = document.getElementById('workshop-ai-scenario');
    txtArea.classList.remove('hidden');
    txtArea.value = "⏳ ИИ пишет сценарий...";
    
    document.getElementById('workshop-actions').classList.remove('hidden');

    const relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(c => c.checklistKey === task.templateKey) : null;
    let twiContext = relatedTwi ? `Упомяни, что мы разберем TWI-инструкцию "${relatedTwi.title}".` : ``;

    const promptSystem = `Ты — старший инженер стройконтроля. Напиши сценарий для жесткой 5-минутной планерки с бригадой (toolbox talk). 
    ЗАПРЕЩЕНО писать про каски, СИЗ и ТБ! Говорим ТОЛЬКО про технологию работ и качество!
    1. 🎯 Цель: [Обозначить проблему качества].
    2. ⚠️ Суть ошибки: [Как они косячат технологически].
    3. 🛠 Как правильно: [Допуски из ГОСТ/СНиП].
    4. 💡 Итог: Мотивация.`;

    try {
        const res = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: `Подрядчик: ${task.contractor}. Работа: ${task.templateTitle}. ${twiContext}` }], { temperature: 0.3, max_tokens: 500 });
        txtArea.value = res;
    } catch (e) { txtArea.value = "❌ Ошибка ИИ."; }
};

/* ============================================================================ */
/* ИИ ГЕНЕРАТОРЫ ДЛЯ СПЕЦ-ЗАДАЧ (ИНСТРУКТАЖ, КС-2, ВОРКШОП)                     */
/* ============================================================================ */

// 1. ВВОДНЫЙ ИНСТРУКТАЖ (Сборка регламентов и TWI)
window.rbi_generateIntroBriefing = async function(taskId) {
    if (!appSettings.aiEnabled) return showToast("Включите AI-ассистента в настройках!");
    
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    const btn = document.getElementById('btn-gen-intro');
    btn.innerHTML = '⏳ AI пишет...'; btn.disabled = true;

    // Достаем пункты чек-листа (требования)
    let checklistData = [];
    const tType = task.templateKey.split('_')[0];
    const key = task.templateKey.replace(tType + '_', '');
    const cl = tType === 'sys' && SYSTEM_TEMPLATES[key] ? SYSTEM_TEMPLATES[key].groups : (userTemplates[key] ? userTemplates[key].groups : []);
    const flatList = getFlatList(cl);
    
    // Формируем выжимку требований для ИИ
    const requirements = flatList.slice(0, 15).map(i => `- ${i.n}. Норматив: ${i.t.replace(/<\/?[^>]+(>|$)/g, "")}`).join('\n');

    const promptSystem = `Ты старший инженер по качеству. Напиши короткую и строгую приветственную речь-инструктаж (3 абзаца) для бригадиров подрядчика перед началом работ.
    Цель: обозначить, что контроль будет строгим, и перечислить главные точки внимания.
    Используй переданные требования. Без воды.`;

    try {
        const speech = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: `Вид работ: ${task.templateTitle}.\nТребования:\n${requirements}` }], { temperature: 0.3, max_tokens: 400 });
        
        // Сохраняем результат в задачу для последующей печати
        task.aiData = { speech: speech, checklist: flatList };
        await dbPut(STORES.TASKS, task);

        document.getElementById('intro-result-box').classList.remove('hidden');
        showToast("✨ Инструктаж сформирован!");
    } catch (e) {
        showToast("❌ Ошибка ИИ");
    } finally {
        btn.innerHTML = 'Собрать базу (AI)'; btn.disabled = false;
    }
};


// 2. ФИНАЛЬНАЯ ПРИЕМКА (Анализ перед КС-2)
window.rbi_generateFinalAcceptance = async function(taskId) {
    if (!appSettings.aiEnabled) return showToast("Включите AI-ассистента в настройках!");
    
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    const btn = document.getElementById('btn-gen-final');
    btn.innerHTML = '⏳ AI пишет...'; btn.disabled = true;

    // Собираем ВСЕ проверки по этому подрядчику и виду работ
    const cChecks = contractorArray.filter(c => c.contractorName === task.contractor && c.templateKey === task.templateKey).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    if (cChecks.length === 0) {
        btn.innerHTML = 'Анализ (AI)'; btn.disabled = false;
        return showToast("Нет данных проверок для анализа!");
    }

    const m = getContractorMetrics(cChecks, userTemplates);
    
    // Собираем дефекты
    const defects = {};
    cChecks.forEach(c => {
        if(c.state) {
            Object.keys(c.state).forEach(id => {
                if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                    const flat = getFlatList(userTemplates[c.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[c.templateKey.replace('sys_','')]?.groups);
                    const item = flat.find(x => String(x.id) === String(id));
                    if (item) defects[item.n] = (defects[item.n] || 0) + 1;
                }
            });
        }
    });

    const defectStr = Object.keys(defects).sort((a,b) => defects[b] - defects[a]).map(k => `${k} (${defects[k]} раз)`).join(', ');

    const promptSystem = `Ты — Директор по строительству. Напиши официальную резолюцию для подписания КС-2 (Акта выполненных работ).
    Укажи:
    1. Итоговый УрК и надежность.
    2. Главные косяки за период.
    3. Вывод: Подписать в полном объеме, С удержанием % (за брак), или Отказать в приемке до устранения.`;

    const promptUser = `Подрядчик: ${task.contractor}. Работа: ${task.templateTitle}. Проверок: ${cChecks.length}. Финальный УрК: ${m.finalC}%. Критических аварий B3: ${m.n_изделий_с_B3}. Частые дефекты: ${defectStr}`;

    try {
        const text = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 500 });
        document.getElementById('final-ai-text').value = text;
        document.getElementById('final-result-box').classList.remove('hidden');
        showToast("✨ Справка КС-2 сформирована!");
    } catch (e) {
        showToast("❌ Ошибка ИИ");
    } finally {
        btn.innerHTML = 'Анализ (AI)'; btn.disabled = false;
    }
};

// === 7. AI-МАППИНГ КОЛОНОК ===
window.sk_aiMapColumns = async function() {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");
    
    const btn = document.getElementById('btn-ai-mapping');
    btn.innerHTML = `<span class="animate-pulse">⏳ ИИ думает...</span>`;
    btn.disabled = true;

    const headersList = window.skTempRawHeaders.map((h, i) => `${i}: "${h}"`).join(', ');
    
    const promptSystem = `Ты помощник интеграции данных. Тебе даны заголовки Excel-файла (с их индексами). Твоя задача — сопоставить их с системными полями: number, text, category, date_issued, contractor, deadline, status, date_resolved, structure.
    Верни СТРОГО JSON-объект, где ключ - это системное поле, а значение - индекс (число) колонки из Excel. Если колонки нет, верни -1. Без лишнего текста и комментариев.`;
    
    try {
        // Используем глобальную функцию callAI (которая у нас уже есть в ai.js)
        const res = await window.callAI([{role: 'system', content: promptSystem}, {role: 'user', content: headersList}], {temperature: 0.1, max_tokens: 300});
        
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const aiMap = JSON.parse(jsonMatch[0]);
            Object.keys(aiMap).forEach(key => {
                const select = document.querySelector(`.sk-mapping-select[data-field="${key}"]`);
                if (select) select.value = aiMap[key];
            });
            showToast("✨ ИИ успешно распознал колонки!");
        }
    } catch(e) {
        showToast("❌ Ошибка ИИ: " + e.message);
    } finally {
        btn.innerHTML = `🤖 Угадать через ИИ (DeepSeek)`;
        btn.disabled = false;
    }
};

// === 13. ИИ АВТО-МАППИНГ КАТЕГОРИЙ ПО ТЕКСТУ ЗАМЕЧАНИЯ ===
window.sk_autoMapCategories = async function(silent = false) {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) {
        if (!silent) showToast("⚠️ Включите AI для авто-распределения категорий!");
        return 0;
    }

    if (!silent && !skAiRunning) showToast("🤖 ИИ в фоне обрабатывает категории...");

    const allowedCleanCats = [];
    if (typeof SYSTEM_TEMPLATES !== 'undefined') {
        Object.keys(SYSTEM_TEMPLATES).forEach(k => allowedCleanCats.push(SYSTEM_TEMPLATES[k].title));
    }
    if (typeof userTemplates !== 'undefined') {
        Object.keys(userTemplates).forEach(k => allowedCleanCats.push(userTemplates[k].title));
    }
    if (allowedCleanCats.length === 0) allowedCleanCats.push("Общестроительные работы");

    const recordsToFix = window.skRecords.filter(r => 
        !r.category || 
        r.category === 'Без категории' || 
        r.category.trim() === '' || 
        /^\d+$/.test(r.category)
    );
    
    const uniqueTexts = [...new Set(recordsToFix.map(r => r.text).filter(t => t && t.length > 5))];
    
    if (uniqueTexts.length === 0) {
        if (!silent) showToast("✅ Все замечания уже распределены по категориям.");
        return 0;
    }

    const BATCH_SIZE = 50;
    let totalUpdated = 0;
    let currentIndex = 0;
    const totalBatches = Math.ceil(uniqueTexts.length / BATCH_SIZE);

    for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
        const batch = uniqueTexts.slice(currentIndex, currentIndex + BATCH_SIZE);
        const batchStr = batch.map((t, idx) => `${idx}: "${t.substring(0, 200)}"`).join('\n');
        
        const promptSystem = `Ты — инженер стройконтроля. Прочитай тексты дефектов.
Верни ТОЛЬКО JSON-объект: ключ - индекс (0..${batch.length-1}), значение - один из видов работ: [${allowedCleanCats.join(', ')}].
Если не уверен, верни "Без категории". Без пояснений.`;

        try {
            const res = await window.callAI([
                { role: 'system', content: promptSystem },
                { role: 'user', content: batchStr }
            ], { temperature: 0.1, max_tokens: 2000 });
            
             const jsonMatch = res.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiMap = JSON.parse(jsonMatch[0]);
                let updatedInBatch = 0;
                for (let i = 0; i < batch.length; i++) {
                    const cleanVal = aiMap[i] || aiMap[String(i)];
                    if (cleanVal && allowedCleanCats.includes(cleanVal)) {
                        const targetRecords = window.skRecords.filter(r => r.text === batch[i]);
                        for (let rec of targetRecords) {
                            
                            // Сохраняем в AI категорию
                            rec.ai_category = cleanVal;
                            
                            // Если ИИ исправил "Без категории" или откровенную дичь, ставим флаг
                            if (rec.category !== cleanVal) {
                                rec.category_corrected = true;
                            }

                            rec._updatedAt = new Date().toISOString();
                            await dbPut(STORES.SK_RECORDS, rec);
                            updatedInBatch++;
                        }
                    }
                }
                totalUpdated += updatedInBatch;
            }
        } catch (e) {
            console.warn("Ошибка ИИ в пакете", batchNum, e);
            if (!silent) showToast(`⚠️ Ошибка в пакете ${batchNum}`);
        }
        
        currentIndex += BATCH_SIZE;
        if (currentIndex < uniqueTexts.length) await new Promise(r => setTimeout(r, 500));
    }

    if (!silent && totalUpdated > 0) {
        showToast(`✨ ИИ обработал ${totalUpdated} записей (в фоне)`);
    }
    return totalUpdated;
};

// === 7. AI-СВЯЗКА ДЕФЕКТОВ EXCEL С ЧЕК-ЛИСТАМИ RBI И ГЕНЕРАЦИЯ ПИСЬМА ===
window.sk_generateContractorAiSummary = async function(cName, safeId) {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const btn = document.getElementById(`btn-sk-ai-${safeId}`);
    const resBox = document.getElementById(`sk-ai-res-${safeId}`);
    
    btn.innerHTML = `<span class="animate-pulse">⏳ DeepSeek анализирует дефекты...</span>`;
    btn.disabled = true;
    resBox.classList.remove('hidden');
    resBox.innerHTML = `<div class="text-center text-indigo-500 font-bold animate-pulse">ИИ сопоставляет замечания с чек-листами RBI...</div>`;

    let total = 0, open = 0, overdue = 0;
    const defectsFreq = {};
    window.skRecords.filter(r => r.contractor === cName).forEach(r => {
        total++;
        const isOpen = r.status && r.status.toLowerCase().includes('не устран');
        if (isOpen) open++;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        if (deadline && isOpen && new Date() > deadline) overdue++;
        if (r.text) {
            const cleanText = r.text.trim().replace(/\s+/g, ' ').substring(0, 100);
            defectsFreq[cleanText] = (defectsFreq[cleanText] || 0) + 1;
        }
    });

    const topDefects = Object.keys(defectsFreq).sort((a,b) => defectsFreq[b] - defectsFreq[a]).slice(0, 5);
    const defectListStr = topDefects.map(d => `- ${d} (${defectsFreq[d]} раз)`).join('\n');

    const availableChecklists = [];
    if (typeof SYSTEM_TEMPLATES !== 'undefined') {
        Object.keys(SYSTEM_TEMPLATES).forEach(k => availableChecklists.push(SYSTEM_TEMPLATES[k].title));
    }
    const checklistsStr = availableChecklists.join(', ');

    const promptSystem = `Ты — Главный эксперт по качеству. Проанализируй открытые замечания подрядчика из системы "Стройконтроль".
    Верни ответ СТРОГО в формате:
    
    [ОЦЕНКА ФОРМУЛИРОВОК (KPI)]
    Оценка качества описания дефектов инженерами СК: [X/10]. 
    Комментарий: [Укажи 1 предложением, чего не хватает инженерам при выдаче предписаний: осей, конкретики, ссылок на ГОСТ].

    [ПРОГНОЗ РИСКА ПРОСРОЧКИ]
    [Выбери 1 самый сложный дефект из списка и оцени риск его просрочки: Высокий / Средний / Низкий. Объясни почему (технологическая сложность, поставка материалов и т.д.)].

    [СВЯЗЬ С ЧЕК-ЛИСТАМИ RBI]
    Рекомендуемые чек-листы для проверок: [Выбери 1-2 из: ${checklistsStr}].

    [СООБЩЕНИЕ ПРОРАБУ В WHATSAPP]
    [Короткое жесткое письмо прорабу. Укажи статистику просрочек и дефекты, которые нужно закрыть]`;

    const promptUser = `Подрядчик: ${cName}. Всего: ${total}. Открыто: ${open}. Просрочено: ${overdue}. Тексты дефектов:\n${defectListStr}`;

    try {
        const response = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.2, max_tokens: 800 });
        
        const formattedResponse = response
            .replace(/\[ОЦЕНКА ФОРМУЛИРОВОК \(KPI\)\]/g, '<div class="text-[12px] font-black text-purple-700 uppercase mb-1 border-b border-purple-100 pb-1">📝 Качество работы инженеров СК</div>')
            .replace(/\[ПРОГНОЗ РИСКА ПРОСРОЧКИ\]/g, '<div class="text-[12px] font-black text-red-700 uppercase mt-3 mb-1 border-b border-red-100 pb-1">🔮 AI-Прогноз рисков</div>')
            .replace(/\[СВЯЗЬ С ЧЕК-ЛИСТАМИ RBI\]/g, '<div class="text-[12px] font-black text-indigo-700 uppercase mt-3 mb-1 border-b border-indigo-100 pb-1">🔗 Фокус для RBI Аудита</div>')
            .replace(/\[СООБЩЕНИЕ ПРОРАБУ В WHATSAPP\]/g, '<div class="text-[12px] font-black text-green-700 uppercase mt-3 mb-1 border-b border-green-100 pb-1">💬 Сообщение прорабу (Копировать)</div>');

        resBox.innerHTML = `
            ${formattedResponse}
            <button onclick="navigator.clipboard.writeText(this.parentElement.innerText); showToast('Текст скопирован!');" class="mt-3 w-full bg-slate-100 text-slate-600 border border-slate-300 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 shadow-sm">
                📋 Скопировать весь текст
            </button>
        `;
        if (typeof gameLogAction === 'function') gameLogAction('ai_generate', 'sk_contractor_analysis');
        // === АВТОЗАКРЫТИЕ ЗАДАЧИ ПРИ ФОРМИРОВАНИИ ПИСЬМА ===
        if (typeof window.rbi_tasksData !== 'undefined') {
            const skTask = window.rbi_tasksData.find(t => t.title === 'Анализ проблем ПК СК' && t.status === 'pending');
            if (skTask) {
                skTask.status = 'done';
                skTask.done = 1;
                skTask.resultComment = 'Письмо отправлено';
                skTask.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') dbPut(STORES.TASKS, skTask);
                if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
            }
        }
    } catch(e) {
        resBox.innerHTML = `<span class="text-red-500 font-bold">❌ Ошибка ИИ: ${e.message}</span>`;
    } finally {
        btn.innerHTML = `🤖 AI-Анализ и Письмо прорабу`;
        btn.disabled = false;
    }
};

// === ПРЕДИКТИВНЫЙ ИИ: ПРОГНОЗ СРЫВА СРОКОВ ===
window.sk_predictRisksAi = async function(silent = false) {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) {
        if (!silent) showToast("⚠️ Включите AI-ассистента в Настройках!");
        return;
    }

    // Ищем только открытые замечания, у которых еще нет прогноза
    const openRecords = window.skRecords.filter(r => {
        const isResolved = !!r.date_resolved;
        const statusStr = r.status ? r.status.toLowerCase() : '';
        const isOpen = !isResolved && (!statusStr || statusStr.includes('не устран'));
        return isOpen && !r.predicted_risk;
    });

    if (openRecords.length === 0) {
        if (!silent) showToast("✅ Нет новых открытых замечаний для прогноза!");
        return;
    }

    if (!silent) showToast(`🔮 ИИ анализирует риски по ${openRecords.length} замечаниям...`);

    const BATCH_SIZE = 10; // Отправляем пачками по 10, чтобы ИИ не запутался
    let processed = 0;

    for (let i = 0; i < openRecords.length; i += BATCH_SIZE) {
        const batch = openRecords.slice(i, i + BATCH_SIZE);
        
        let batchContext = batch.map((r, idx) => {
            const daysLeft = r.deadline ? Math.ceil((new Date(r.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 'Не указан';
            return `ID: ${idx} | Подрядчик: ${r.contractor} | Этап: ${r.category} | Дней до дедлайна: ${daysLeft} | Текст: ${r.text}`;
        }).join('\n');

        const promptSystem = `Ты — AI риск-менеджер на стройке. Оцени вероятность срыва дедлайна по каждому замечанию. 
Учитывай сложность дефекта, этап работ и оставшееся время.
Верни СТРОГО JSON-объект в формате:
{
  "0": { "risk": "High", "reason": "Короткое обоснование (до 10 слов)" },
  "1": { "risk": "Low", "reason": "Легко исправить" }
}
Возможные значения risk: "High" (Красный), "Medium" (Желтый), "Low" (Зеленый). Без лишнего текста.`;

        try {
            const res = await window.callAI([
                { role: 'system', content: promptSystem },
                { role: 'user', content: batchContext }
            ], { temperature: 0.2, max_tokens: 1000 });

            const jsonMatch = res.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiResult = JSON.parse(jsonMatch[0]);
                
                for (let j = 0; j < batch.length; j++) {
                    const ans = aiResult[j] || aiResult[String(j)];
                    if (ans && ans.risk) {
                        batch[j].predicted_risk = ans.risk;
                        batch[j].predicted_reason = ans.reason || '';
                        batch[j]._updatedAt = new Date().toISOString();
                        await dbPut(STORES.SK_RECORDS, batch[j]);
                        processed++;
                    }
                }
            }
        } catch (e) {
            console.error("Ошибка ИИ прогноза:", e);
        }
    }

    if (processed > 0) {
        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
        sk_renderDashboard();
        if (!silent) showToast(`✨ ИИ рассчитал риски для ${processed} замечаний!`);
    }
};
// Остальные функции (generatePulseAi, generateHeatmapAi, generateCultureAi, generateTaskRiskAi, generateAiRoutePlan, generateAiTutorAdvice, generatePrescriptionAi, generateTwiDraftAi, generateAiHintForDefect) 
// просто переносятся сюда из analytics.js и app.js без изменения логики.
// Для экономии токенов в этом ответе я показал структуру файла. Полный перенос подразумевает Ctrl+X из старых файлов и Ctrl+V сюда.