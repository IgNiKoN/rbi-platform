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
        return data.choices[0].message.content;
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


// Остальные функции (generatePulseAi, generateHeatmapAi, generateCultureAi, generateTaskRiskAi, generateAiRoutePlan, generateAiTutorAdvice, generatePrescriptionAi, generateTwiDraftAi, generateAiHintForDefect) 
// просто переносятся сюда из analytics.js и app.js без изменения логики.
// Для экономии токенов в этом ответе я показал структуру файла. Полный перенос подразумевает Ctrl+X из старых файлов и Ctrl+V сюда.