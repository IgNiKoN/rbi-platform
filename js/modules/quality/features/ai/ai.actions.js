// === AI Actions — Фаза 19 ===
// Реальные реализации 33 AI-функций (перенесены 1:1 из js/ai.js, удалён 2026-07-06).
// Module-scope declarations, экспортируются через ES export; публикацию в window.*
// для обратной совместимости с потребителями и inline onclick делает ai.module.js (entry).
// AIActions — делегат, вызывающий <name> напрямую (module-scope, без window.).

function _getSetting(key) {
    return ((AIActions._ctx && AIActions._ctx.settings) || window.RBI.services.settings).get(key);
}

function _triggerSync(mode) {
    var m = mode || 'silent';
    if (AIActions._ctx && AIActions._ctx.sync) return AIActions._ctx.sync.trigger(m);
    if (window.RBI && window.RBI.services && window.RBI.services.sync) return window.RBI.services.sync.trigger(m);
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
}

function _storage() {
    if (AIActions._ctx && AIActions._ctx.storage) {
        return AIActions._ctx.storage;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
        return window.RBI.services.storage;
    }
    return {
        stores: function () { return typeof STORES !== 'undefined' ? STORES : {}; },
        get: function (store, key) { return dbGet(store, key); },
        getAll: function (store) { return dbGetAll(store); },
        put: function (store, data) { return dbPut(store, data); },
        putBatch: function (store, items) {
            if (typeof dbPutBatch === 'function') return dbPutBatch(store, items);
            return Promise.all(items.map(function (item) { return dbPut(store, item); }));
        },
        delete: function (store, key) { return dbDelete(store, key); }
    };
}

function _gameLogAction(actionType, targetId) {
    if (AIActions._ctx && AIActions._ctx.game) {
        return AIActions._ctx.game.logAction(actionType, targetId);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.logAction(actionType, targetId);
    }
    if (typeof gameLogAction === 'function') return gameLogAction(actionType, targetId);
}

function _reports() {
    if (AIActions._ctx && AIActions._ctx.reports) {
        return AIActions._ctx.reports;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.reports) {
        return window.RBI.services.reports;
    }
    return {
        setExpertConclusion: function (key, val) {
            if (typeof customExpertConclusions !== 'undefined') customExpertConclusions[key] = val;
        }
    };
}

function _defectCauses() {
    if (AIActions._ctx && AIActions._ctx.inspections) {
        return AIActions._ctx.inspections.getDefectCausesSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getDefectCausesSync();
    }
    return typeof DEFECT_CAUSES !== 'undefined' ? DEFECT_CAUSES : [];
}

function _getAllInspections() {
    return ((AIActions._ctx && AIActions._ctx.inspections) || window.RBI.services.inspections).getAllSync();
}

function _getSkRecords() {
    return ((AIActions._ctx && AIActions._ctx.sk) || window.RBI.services.sk).getRecordsSync();
}

function _getTasks() {
    return ((AIActions._ctx && AIActions._ctx.tasks) || window.RBI.services.tasks).getTasksSync();
}

function _getTwiCards() {
    return ((AIActions._ctx && AIActions._ctx.knowledge) || window.RBI.services.knowledge).getTwiCardsSync();
}

function _getCustomDocs() {
    return ((AIActions._ctx && AIActions._ctx.knowledge) || window.RBI.services.knowledge).getCustomDocsSync();
}

function _getGameActionLogs() {
    return ((AIActions._ctx && AIActions._ctx.game) || window.RBI.services.game).getGameActionLogsSync();
}

function _templates() {
    return (AIActions._ctx && AIActions._ctx.templates) || window.RBI.services.templates;
}

// === ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА AI (перенесено 1:1 из app.js) ===
function changeAiMode(mode) {
    var settingsSvc = (AIActions._ctx && AIActions._ctx.settings) || window.RBI.services.settings;
    settingsSvc.set('aiAuthMode', mode);

    const personalKeyBlock = document.getElementById('personal-key-field');
    const corporatePwdBlock = document.getElementById('corporate-pwd-field');

    if (personalKeyBlock) personalKeyBlock.classList.add('hidden');
    if (corporatePwdBlock) corporatePwdBlock.classList.add('hidden');

    if (mode === 'personal') {
        if (personalKeyBlock) personalKeyBlock.classList.remove('hidden');
    } else if (mode === 'corporate') {
        if (corporatePwdBlock) corporatePwdBlock.classList.remove('hidden');
    }
};

// === ГЛОБАЛЬНАЯ ФУНКЦИЯ ВЫЗОВА DEEPSEEK AI ===
async function callAI(messages, options = {}) {
    const { temperature = 0.7, max_tokens = 2000 } = options;
    const mode = _getSetting('aiAuthMode') || 'corporate';   // по умолчанию corporate

    let url, headers, body;

    if (mode === 'personal') {
        if (!_getSetting('apiKey')) throw new Error('Введите ваш API-ключ в Настройках!');
        url = 'https://api.deepseek.com/chat/completions';
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_getSetting('apiKey')}` };
        body = { model: 'deepseek-chat', messages, temperature, max_tokens };
    } else {
        url = `${window.APP_CONFIG.SUPABASE_URL}/functions/v1/deepseek-proxy`;
        headers = { 'Content-Type': 'application/json' };
        body = {
            model: 'deepseek-chat',
            messages,
            temperature,
            max_tokens,
            mode: mode,
            engineer_name: window.syncConfig?.engineerName || '',
            project_code: window.syncConfig?.projectCode || '',
            password: _getSetting('aiCorpPwd') || ''
        };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            let errorMsg = `Ошибка сервера: ${response.status}`;
            try {
                const errData = await response.json();
                if (errData.error) errorMsg = errData.error;
            } catch (e) { }
            if (response.status === 403) throw new Error("Доступ запрещен. Проверьте пароль.");
            if (response.status === 401) throw new Error("Неверный персональный API-ключ.");
            throw new Error(errorMsg);
        }

        const data = await response.json();
        let aiText = data.choices[0].message.content;
        aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        return aiText;
    } catch (e) {
        console.error("[AI Error]:", e);
        throw e;
    }
};
// === 1. ГЕНЕРАТОР УМНЫХ КОММЕНТАРИЕВ ИИ ===
async function generateSmartComment(scenario) {
    const _allInspections = _getAllInspections();
    if (!currentEditingExpertKey) return;
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Сначала включите AI в Настройках!");

    const inputField = document.getElementById('modal-expert-input');
    const originalText = inputField.value;

    // Сценарий "Улучшить мой текст": стилистическая правка черновика инженера, без обращения к аналитике
    if (scenario === 'improve') {
        if (!originalText || !originalText.trim()) return showToast("⚠️ Сначала напишите черновик текста!");
        inputField.value = "⏳ Нейросеть улучшает ваш текст...";
        try {
            const promptSystem = `Ты — редактор технических текстов стройконтроля. Стилистически улучши текст инженера: убери воду, сделай формулировки четче и профессиональнее, сохрани структуру и все факты/цифры без изменений. Не добавляй новых утверждений. Верни только исправленный текст без пояснений.`;
            const aiResponse = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: originalText }], { temperature: 0.3, max_tokens: 600 });
            inputField.value = aiResponse;
            showToast("✨ Текст улучшен ИИ!");
            _gameLogAction('ai_generate', scenario);
        } catch (error) {
            inputField.value = originalText;
            showToast("❌ Ошибка: " + error.message);
        }
        return;
    }

    inputField.value = "⏳ Нейросеть DeepSeek анализирует данные...";

    const toneDescMap = {
        strict: 'Тон: жёсткий, официально-претензионный, с указанием на риски для приемки.',
        boss: 'Тон: сжатый управленческий доклад для руководства, только суть и решения.',
        action_plan: 'Тон: структурированный план действий с конкретными шагами и сроками.',
        tech: 'Тон: технический аудит, ссылки на нормативы (СП/ГОСТ), без эмоций.',
        standard: 'Тон: нейтральный, деловой, фактологический.'
    };
    const toneDesc = toneDescMap[scenario] || toneDescMap.standard;

    try {
        let promptSystem = ""; let promptUser = "";

        if (currentEditingExpertKey === 'global_main_analysis' || currentEditingExpertKey.startsWith('onepager_') || currentEditingExpertKey === 'global_onepager_pdca') {
            const data = getFilteredAnalyticsData();
            if (data.length === 0) throw new Error("Нет данных для анализа");

            let sumB3 = 0; data.forEach(i => { if (i.metrics && i.metrics.n_B3_fail > 0) sumB3++; });
            const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, _templates().getUserTemplates()) : null;
            const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
            const redZone = currIntMetrics ? currIntMetrics.redZonePerc : 0;

            const defectsCountMap = {};
            data.forEach(i => {
                if (i.metrics && (i.metrics.n_B2_fail > 0 || i.metrics.n_B3_fail > 0)) {
                    const stage = i.templateTitle || i.templateKey || 'Неизвестный этап';
                    defectsCountMap[stage] = (defectsCountMap[stage] || 0) + i.metrics.n_B2_fail + i.metrics.n_B3_fail;
                }
            });
            const top3Defects = Object.keys(defectsCountMap).sort((a, b) => defectsCountMap[b] - defectsCountMap[a]).slice(0, 3)
                .map(s => `${s} (${defectsCountMap[s]})`).join(', ') || 'значимых дефектов нет';

            promptSystem = `Ты — эксперт-аналитик качества. Сформируй КРАТКИЙ обзор (до 80 слов). 1. Статус. 2. Риск. 3. Прогноз. 4. Действие. ${toneDesc} ЗАПРЕЩЕНО использовать слово "авария"/"аварийный" — используй формулировку "критический дефект вес 3".`;
            promptUser = `ИКО: ${IKO}. В красной зоне: ${redZone}%. Проверок: ${data.length}. Критических дефектов (вес 3): ${sumB3}. ТОП дефектов: ${top3Defects}. Сценарий: ${scenario}`;
        } else {
            const parts = currentEditingExpertKey.split('_||_');
            const cKey = parts[0]; const tTitle = parts[1];
            const cDataAll = _allInspections.filter(i => (i.contractorName + ' [' + (i.projectName || 'Без объекта') + ']') === cKey && i.templateTitle === tTitle);
            const m = getContractorMetrics(cDataAll, _templates().getUserTemplates());

            promptSystem = `Ты — независимый эксперт. КРАТКИЙ отчет (до 70 слов). СТАТУС, ФАКТЫ, ПРОГНОЗ, РЕКОМЕНДАЦИИ. ${toneDesc} ЗАПРЕЩЕНО использовать слово "авария"/"аварийный" — используй формулировку "критический дефект вес 3".`;
            promptUser = `Подрядчик: ${cKey.split(' [')[0]}. УрК: ${m.finalC}%. Доля критических дефектов (вес 3): ${m.rateB3}%. Сценарий: ${scenario}`;
        }

        const aiResponse = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.4, max_tokens: 300 });
        inputField.value = aiResponse;
        showToast("✨ Текст сгенерирован ИИ!");
        _gameLogAction('ai_generate', scenario);
    } catch (error) {
        inputField.value = originalText;
        showToast("❌ Ошибка: " + error.message);
    }
};

// === 2. ONE-PAGER УПРАВЛЕНЧЕСКОЕ РЕШЕНИЕ ===
async function generateOnePagerForecastAi(pdcaKey) {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента!");
    const data = getFilteredAnalyticsData();
    if (data.length === 0) return showToast("Нет данных");
    showToast("⏳ AI формирует стратегию...");
    try {
        let sumB3 = 0; data.forEach(i => { if (i.metrics && i.metrics.n_B3_fail > 0) sumB3++; });
        const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, _templates().getUserTemplates()) : null;
        const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
        const redZone = currIntMetrics ? currIntMetrics.redZonePerc : 0;

        const contrGroups = {};
        data.forEach(i => {
            const cKey = (i.contractorName || 'Неизвестно') + ' [' + (i.projectName || 'Без объекта') + ']';
            (contrGroups[cKey] = contrGroups[cKey] || []).push(i);
        });
        const worstContrs = Object.keys(contrGroups)
            .filter(k => contrGroups[k].length >= 3)
            .map(k => ({ name: k, m: getContractorMetrics(contrGroups[k], _templates().getUserTemplates()) }))
            .filter(x => x.m && x.m.finalC < 85)
            .sort((a, b) => a.m.finalC - b.m.finalC)
            .slice(0, 3)
            .map(x => `${x.name} (${x.m.finalC}%)`)
            .join(', ') || 'нет';

        const promptSystem = 'Ты директор по качеству. Кратко (до 100 слов): ОЦЕНКА, РИСКИ, ПЛАН ИЗ 3 ПУНКТОВ. ЗАПРЕЩЕНО использовать слово "авария"/"аварийный" — используй формулировку "критический дефект вес 3".';
        const promptUser = `Анализ ${data.length} проверок. ИКО: ${IKO}. В красной зоне: ${redZone}%. Критических дефектов (вес 3): ${sumB3}. Проблемные подрядчики: ${worstContrs}.`;

        const response = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 350 });
        _reports().setExpertConclusion(pdcaKey, response);
        if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
        if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('analytics:renderRequested', {});
        showToast("✨ Управленческое решение обновлено!");
    } catch (e) { showToast("❌ Ошибка: " + e.message); }
};

async function generatePulseAi() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('pulse-ai-text');
    container.innerHTML = `<span class="animate-pulse">⏳ AI слушает пульс объекта...</span>`;

    const data = getFilteredAnalyticsData();
    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, _templates().getUserTemplates()) : null;

    const promptSystem = `Ты — AI-супервизор. Дай сжатую оценку 'здоровья' стройки (1 абзац, макс 40 слов). Тон: профессиональный.`;
    const promptUser = `ИКО: ${currIntMetrics ? currIntMetrics.IKO : '0'}. В красной зоне: ${currIntMetrics ? currIntMetrics.redZonePerc : '0'}%. Выявлено проблем: ${countPhotos(data)}.`;

    try {
        const res = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 150 });
        container.innerHTML = res;
        _reports().setExpertConclusion('pulse_ai', res);
        scheduleSessionSave();
    } catch (e) { container.innerHTML = "Ошибка AI"; }
};

// === AI: АНАЛИЗ ТЕПЛОВОЙ КАРТЫ (МАТРИЦА РИСКОВ) ===
async function generateHeatmapAi() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('heatmap-ai-text');
    container.classList.remove('hidden');
    container.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">⏳ AI анализирует реальную матрицу дефектов...</span>`;

    // 1. Получаем РЕАЛЬНЫЕ данные с учетом фильтров
    const data = typeof getFilteredAnalyticsData === 'function' ? getFilteredAnalyticsData() : [];
    if (data.length === 0) {
        container.innerHTML = `<span class="text-slate-500">Нет данных для анализа.</span>`;
        return;
    }

    // 2. Считаем реальные дефекты по видам работ
    const stagesDefects = {};
    data.forEach(check => {
        if (check.metrics && (check.metrics.n_B2_fail > 0 || check.metrics.n_B3_fail > 0)) {
            const stage = check.templateTitle || check.templateKey || 'Неизвестный этап';
            stagesDefects[stage] = (stagesDefects[stage] || 0) + check.metrics.n_B2_fail + check.metrics.n_B3_fail;
        }
    });

    // 3. Выбираем ТОП-3 самых проблемных видов работ
    const topStages = Object.keys(stagesDefects)
        .sort((a, b) => stagesDefects[b] - stagesDefects[a])
        .slice(0, 3);

    let promptUser = "";
    if (topStages.length > 0) {
        const listStr = topStages.map(s => `"${s}" (${stagesDefects[s]} дефектов)`).join(', ');
        promptUser = `Реальная статистика (Топ проблемных этапов): ${listStr}.`;
    } else {
        promptUser = `Значимых дефектов B2 и B3 не зафиксировано. Все этапы в норме.`;
    }

    const promptSystem = `Ты — риск-менеджер строительного контроля. Посмотри на переданную статистику дефектов и ответь 1-2 короткими предложениями: 
    Где главная просадка по качеству и какой обучающий TWI-тренинг (мастер-класс) стоит провести для рабочих? 
    Если дефектов нет, просто похвали команду за идеальное качество.`;

    try {
        const res = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 150 });

        container.innerHTML = `<b>💡 Рекомендация:</b> ${res}`;
        _gameLogAction('ai_generate', 'heatmap');
    } catch (e) {
        container.innerHTML = `<span class="text-red-500 font-bold">❌ Ошибка связи с нейросетью</span>`;
    }
};

async function generateContractorForecastAi(contractorName) {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");
    const container = document.getElementById('ai-forecast-container');
    if (!container) return;

    // Фильтр по старому формату
    const data = getFilteredAnalyticsData().filter(c => c.contractorName + ' [' + (c.projectName || 'Без объекта') + ']' === contractorName);

    if (data.length < 5) {
        container.innerHTML = `<div class="text-[11px] text-slate-500 font-bold bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">Слишком мало данных для нейросети (нужно от 5 проверок). Продолжайте инспекции.</div>`;
        return;
    }

    const m = getContractorMetrics(data, _templates().getUserTemplates());
    const trend = data.slice(-5).map(c => c.metrics.final).join('% ➔ ') + '%';

    container.innerHTML = `<span class="animate-pulse font-bold text-indigo-600 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Нейросеть вычисляет тренд...</span>`;

    const promptSystem = `Ты — предиктивный AI-советник по строительству. Твоя задача — спрогнозировать рейтинг подрядчика через 2 недели и дать ОДИН главный совет инженеру.
    Ответь СТРОГО в 2 абзаца:
    1. Прогноз УрК через 2 недели: [XX]% (Укажи тренд: Рост/Падение/Стагнация).
    2. Фокус для инженера: [Что именно сделать, чтобы переломить тренд или удержать качество].`;

    const promptUser = `Подрядчик: ${contractorName}\nДинамика последних 5 оценок: ${trend}\nИндекс стабильности: ${m.stabilityIndex}/100\nЧастота критических B3: ${m.rateB3}%`;

    try {
        const res = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 150 });
        container.innerHTML = `<div class="text-[12px] leading-relaxed text-indigo-900 dark:text-indigo-200 font-medium whitespace-pre-wrap">${res}</div>`;
        _gameLogAction('ai_generate', 'forecast');
    } catch (e) {
        container.innerHTML = `<span class="text-red-500 font-bold">❌ Ошибка связи с нейросетью</span>`;
    }
};

async function generateCultureAi(contractorName) {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('culture-ai-text');
    container.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold">⏳ AI оценивает культуру...</span>`;

    const cData = getFilteredAnalyticsData().filter(c => c.contractorName + ' [' + (c.projectName || 'Без объекта') + ']' === contractorName);
    if (cData.length === 0) return container.innerHTML = `<span class="text-red-500">Ошибка данных</span>`;

    const m = getContractorMetrics(cData, _templates().getUserTemplates());
    const promptSystem = `Ты — эксперт по бережливому производству (Lean). Дай оценку 'Культуры качества' подрядчика. 
    Опирайся на то, как он исправляет ошибки (стабильность). Объем: СТРОГО 2 коротких предложения. Без markdown-звездочек.`;
    const promptUser = `Подрядчик: ${contractorName.split(' [')[0]}. Рейтинг: ${m.finalC}%. Стабильность: ${m.stabilityIndex}. Критических дефектов (вес 3): ${m.n_изделий_с_B3}.`;

    try {
        const res = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.4, max_tokens: 150 });
        container.innerHTML = res;
        _reports().setExpertConclusion(`culture_${contractorName}`, res);
        if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
    } catch (e) { container.innerHTML = `<span class="text-red-500">Ошибка связи с AI</span>`; }
};

// === AI: ГЕНЕРАЦИЯ ЧЕРНОВИКА TWI КАРТЫ ===
async function generateTwiDraftAi() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в настройках!");

    const title = document.getElementById('twi-title-input').value.trim();
    const norm = document.getElementById('twi-auto-norm-text').innerText;

    if (!title) return showToast("⚠️ Сначала укажите Название Карты!");

    showToast("⏳ Нейросеть генерирует инструкцию...");

    var knowledgeSvc = (AIActions._ctx && AIActions._ctx.knowledge) || window.RBI.services.knowledge;
    let promptSystem = "";
    let promptUser = `Вид работ/узел: ${title}. \nСправочный норматив: ${norm}`;

    if (knowledgeSvc.getTwiTypeSync() === 'INSPECTOR') {
        promptSystem = `Ты — инженер технадзора. Напиши ОЧЕНЬ КРАТКУЮ инструкцию для проверки качества (чтобы она влезла на 1 лист А4 при печати). 
        Верни ответ СТРОГО в формате:
        РИСКИ: [строго 1-2 коротких предложений - к чему приведет нарушение]
        ПОДГОТОВКА: [строго 1-2 короткое предложение - что обеспечить перед проверкой]
        КРИТЕРИИ: [строго 1-2 коротких предложения - допуски и как проверить]`;
    } else if (knowledgeSvc.getTwiTypeSync() === 'WORKER') {
        promptSystem = `Ты — бригадир. Напиши КРАТКУЮ пошаговую инструкцию (SOP) для рабочего.
        Разбей процесс на 3-4 лаконичных шага (чтобы влезло на 1 лист). 
        Верни ответ СТРОГО в таком формате, каждый шаг с новой строки:
        Шаг: [текст действия - максимум 10-15 слов] | Время: [минуты цифрой]`;
    }

    try {
        const response = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 300 }); // Уменьшен лимит токенов

        if (knowledgeSvc.getTwiTypeSync() === 'INSPECTOR') {
            const risksMatch = response.match(/РИСКИ:\s*(.*?)(?=ПОДГОТОВКА:|КРИТЕРИИ:|$)/is);
            const prepMatch = response.match(/ПОДГОТОВКА:\s*(.*?)(?=КРИТЕРИИ:|$)/is);
            const critMatch = response.match(/КРИТЕРИИ:\s*(.*?)$/is);

            if (risksMatch) document.getElementById('twi-why-input').value = risksMatch[1].trim();
            if (prepMatch) document.getElementById('twi-preparation-input').value = prepMatch[1].trim();
            if (critMatch) document.getElementById('twi-compliance-input').value = critMatch[1].trim();
        } else if (knowledgeSvc.getTwiTypeSync() === 'WORKER') {
            document.getElementById('twi-steps-container').innerHTML = '';
            knowledgeSvc.setTwiStepCountSync(0);

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
async function generatePrescriptionAi(inspectionId) {
    const _allInspections = _getAllInspections();
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в настройках!");

    // Находим проверку
    const inspection = _allInspections.find(i => i.id === inspectionId);
    if (!inspection) return;

    // Собираем список дефектов
    let defectsList = [];
    const type = inspection.templateKey.split('_')[0];
    const key = inspection.templateKey.replace(type + '_', '');
    const checklist = type === 'sys' && _templates().getSystemTemplates()[key] ? _templates().getSystemTemplates()[key].groups : (_templates().getUserTemplates()[key] ? _templates().getUserTemplates()[key].groups : []);

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
        const response = await callAI([
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
async function generateTaskRiskAi(contractorName, templateKey, containerId) {
    const _allInspections = _getAllInspections();
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в настройках!");

    const container = document.getElementById(containerId);
    if (!container) return;

    const cData = _allInspections.filter(c => c.contractorName === contractorName && c.templateKey === templateKey).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (cData.length < 3) return showToast("Мало данных для прогноза (нужно хотя бы 3 проверки).");

    container.innerHTML = `<div class="text-center text-[10px] text-indigo-500 font-bold animate-pulse py-3">Анализирую динамику...</div>`;

    const m = getContractorMetrics(cData, _templates().getUserTemplates());
    const urkHistory = cData.slice(-5).map(c => c.metrics.final).join('%, ') + '%';

    const promptSystem = `Ты — аналитик качества. Оцени риск ухудшения качества подрядчика. 
    Ответь строго в формате:
    Статус: [Риск растёт / Стабильно / Риск снижается]
    Обоснование: [1 короткое предложение, почему так]`;

    const promptUser = `Подрядчик: ${contractorName}
    УрК по последним 5 проверкам (в хронологии): ${urkHistory}
    Индекс стабильности: ${m.stabilityIndex}/100
    Доля критических дефектов (вес 3): ${m.rateB3}%`;

    try {
        const response = await callAI([
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
// === AI: МАРШРУТИЗАТОР И ПРИОРИТЕТЫ (ПЛАН НА ДЕНЬ) ===
async function generateAiRoutePlan() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в настройках!");

    // Берем задачи из глобального массива, фильтруя те, что в статусе "pending"
    const activeTasks = _getTasks().filter(t => t.status === 'pending' && !t._deleted);

    if (activeTasks.length === 0) return showToast("Нет активных задач для маршрутизации.");

    const container = document.getElementById('ai-route-container');
    if (!container) return;

    container.classList.remove('hidden');
    container.innerHTML = `<span class="animate-pulse text-indigo-600 font-bold flex items-center gap-2"><svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Нейросеть прокладывает оптимальный маршрут...</span>`;

    // 1. Собираем умный контекст по каждой задаче для ИИ
    const tasksContext = activeTasks.map(t => {
        let riskFlag = t.priorityLvl === 4 ? " [🔴 КРИТИЧЕСКИЙ РИСК]" : "";
        let overdueFlag = new Date(t.date) < new Date() ? " [⚠️ ПРОСРОЧЕНА]" : "";
        let debtFlag = t.carryOverCount > 0 ? ` [🕰 Долг: ${t.carryOverCount} нед.]` : "";

        return `- ${t.taskType || t.title} | Подрядчик: ${t.contractor} | Объект: ${t.project_display_name || t.project || 'Общий'}${riskFlag}${overdueFlag}${debtFlag}. (Причина: ${t.prompt})`;
    }).join('\n');

    // 2. Инструктируем ИИ, как отвечать
    const promptSystem = `Ты — AI-шеф-инженер строительного контроля. Твоя задача — проанализировать пулл открытых задач инженера и составить оптимальный план действий на сегодня.
    
    Твои приоритеты:
    1. КРИТИЧЕСКИЙ РИСК (критические дефекты вес 3). Это нужно решать немедленно.
    2. ПРОСРОЧЕННЫЕ И ДОЛГОВЫЕ ЗАДАЧИ.
    3. Системные рутинные проверки (Сбор данных, Воркшопы).
    
    Верни ответ СТРОГО в таком формате:
    <b style="color:#b91c1c;">🚨 ПРИОРИТЕТ 1 (Сделать срочно):</b>
    [Перечисли 1-2 самые горящие задачи и 1 коротким предложением объясни ПОЧЕМУ они важны, опираясь на переданные риски].
    
    <b style="color:#d97706;">⚠️ ПРИОРИТЕТ 2 (В течение дня):</b>
    [Перечисли остальные важные задачи или долги, объяснив их влияние на процесс].
    
    <b style="color:#0f172a;">💡 СОВЕТ ИНЖЕНЕРУ:</b>
    [1 короткое, бодрое мотивационное предложение о том, как закрытие этого плана повлияет на Индекс Здоровья Объекта].`;

    try {
        const response = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Задачи инженера на сегодня:\n${tasksContext}` }
        ], { temperature: 0.3, max_tokens: 600 });

        container.innerHTML = `<div class="text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">${response.replace(/\n/g, '<br>')}</div>`;
        showToast("✨ Маршрут и приоритеты расставлены!");

        // Логируем в геймификацию
        _gameLogAction('ai_generate', 'route_plan');

    } catch (e) {
        container.innerHTML = `<span class="text-red-600 font-bold">❌ Ошибка связи с нейросетью: ${e.message}</span>`;
    }
};

// === AI: ТЬЮТОР (СОВЕТ ПО РАЗВИТИЮ) ===
async function generateAiTutorAdvice() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента!");
    const container = document.getElementById('ai-tutor-container');
    container.classList.remove('hidden');
    container.innerHTML = `<span class="animate-pulse">⏳ Анализирую ваш профиль...</span>`;

    var gameSvc = (AIActions._ctx && AIActions._ctx.game) || window.RBI.services.game;
    const profile = gameSvc.getCurrentProfileDataSync();
    const logs = _getGameActionLogs().filter(l => l.inspector === profile.name).slice(-20); // Последние 20 действий
    const actionsMap = {};
    logs.forEach(l => { actionsMap[l.action] = (actionsMap[l.action] || 0) + 1; });

    const promptSystem = `Ты — наставник инженера. Дай 1 короткий, мотивирующий совет (максимум 2 предложения) по профессиональному росту. 
    Посмотри на статистику действий и подскажи, чего не хватает (например, мало используют TWI или мало генерируют AI-отчеты). 
    Без воды, сразу к делу.`;

    const promptUser = `XP инженера: ${profile.pi}. Последние действия: ${JSON.stringify(actionsMap)}. Навыки: ${JSON.stringify(profile.radarData)}.`;

    try {
        const response = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.5, max_tokens: 150 });
        container.innerHTML = `<b>💡 Наставление:</b> ${response}`;
    } catch (e) {
        container.innerHTML = `<span class="text-red-500">Ошибка AI</span>`;
    }
};

// === AI-ПОДСКАЗКА ДЛЯ ПРЕДОТВРАЩЕНИЯ ДЕФЕКТОВ ===
async function generateAiHintForDefect() {
    if (!_getSetting('aiEnabled') || !window._auditCurrentCommentId) return;

    const select = document.getElementById('modal-cause-select');
    const aiHint = document.getElementById('ai-hint-block');
    const causeCode = select.value;

    if (!causeCode) {
        aiHint.classList.add('hidden');
        return;
    }

    const causeName = _defectCauses().find(c => c.code === causeCode)?.name || 'Неизвестная причина';

    const flatList = getFlatList(window.AuditState.currentChecklist);
    const itemData = flatList.find(x => x.id === window._auditCurrentCommentId);
    if (!itemData) return;

    // Проверяем, есть ли для этого пункта TWI-карта
    const existingTwi = _getTwiCards().find(c => c.checklistKey === window.AuditState.currentTemplateKey && (String(c.itemId) === String(window._auditCurrentCommentId) || c.itemId === 'ALL'));
    const twiContext = existingTwi ? `В базе УЖЕ ЕСТЬ TWI-карта "${existingTwi.title}". Посоветуй инженеру показать её рабочим.` : `В базе НЕТ TWI-карты для этого узла. Посоветуй инженеру её создать.`;

    aiHint.classList.remove('hidden');
    aiHint.innerHTML = `<span class="animate-pulse text-slate-500">⏳ AI формулирует совет...</span>`;

    const promptSystem = `Ты — старший наставник стройконтроля. Дай инспектору 1-2 коротких предложения: как предотвратить этот дефект прямо сейчас на площадке. 
    ОБЯЗАТЕЛЬНО учти контекст: ${twiContext}`;

    const promptUser = `Нарушение: ${itemData.n}. Норма: ${itemData.t}. Причина: ${causeName}.`;

    try {
        const response = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.4, max_tokens: 150 });

        aiHint.innerHTML = `<b>💡 AI-Совет:</b> ${response.replace(/\n/g, ' ')}`;
    } catch (e) {
        aiHint.classList.add('hidden');
    }
};

// === УТИЛИТА: ИЗВЛЕЧЕНИЕ ТЕКСТА ИЗ PDF (С УМНОЙ ПОРЦИОННОЙ ЗАГРУЗКОЙ И ЗАЩИТОЙ ВОРКЕРА) ===
async function extractTextFromPdf(pdfDataUrl) {
    try {
        // Принудительно задаем путь к воркеру, чтобы он не терялся
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = './libs/pdfjs/pdf.worker.min.js';
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

        // ДОБАВЛЕНО: Очищаем текст от невидимого мусора, который ломает базу
        fullText = fullText.replace(/[\0\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

        return fullText;
    } catch (err) {
        console.error("Ошибка парсинга PDF:", err);
        // Теперь мы увидим красную плашку, если парсер упадет
        if (typeof showToast === 'function') showToast("❌ Ошибка парсинга PDF: " + err.message);
        return null;
    }
};

// === ГЕНЕРАТОР ТЗ ИЗ ОБРАТНОЙ СВЯЗИ ===
async function rbi_normalizeFeedbackAi(rawText) {
    if (!_getSetting('aiEnabled')) return null;

    const promptSystem = `Ты — технический писатель (Product Manager). Перепиши эмоциональное или сбивчивое сообщение пользователя в формальное предложение по улучшению IT-приложения.
    Формат ответа СТРОГО:
    ПРОБЛЕМА: [одно предложение]
    ПРЕДЛОЖЕНИЕ: [одно предложение]
    РЕЗУЛЬТАТ: [одно предложение]`;

    try {
        const res = await callAI([
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

function openAiDocChat() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Сначала включите AI-ассистента в Настройках!");
    document.getElementById('ai-chat-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

function closeAiDocChat() {
    document.getElementById('ai-chat-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
};

async function askAiDocQuestion() {
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
    const allDocs = [...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []), ..._getCustomDocs()];

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
    const flatList = getFlatList(window.AuditState.currentChecklist);
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
        _getTwiCards().forEach(twi => {
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
    contextArr.sort((a, b) => b.score - a.score);
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
        let response = await callAI([
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
        const allTmpls = { ..._templates().getSystemTemplates(), ..._templates().getUserTemplates() };

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
            _getTwiCards().forEach(twi => {
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
async function rbi_generateMeetingMemo() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");

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
        const response = await callAI([
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

        _gameLogAction('ai_generate', 'meeting_memo');
        showToast("✨ Протокол успешно сформирован!");
    } catch (e) {
        showToast("❌ Ошибка ИИ: " + e.message);
    } finally {
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сформировать протокол (ИИ)`;
        btn.disabled = false;
    }
};

async function rbi_generatePracticeTitleAi() {
    if (!_getSetting('aiEnabled')) return showToast("Включите AI в настройках!");

    const prob = document.getElementById('rbi-prac-problem').value;
    const sol = document.getElementById('rbi-prac-solution').value;

    showToast("⏳ Нейросеть генерирует заголовок...");
    try {
        const res = await callAI([
            { role: 'system', content: 'Ты редактор бизнес-кейсов. Сделай ОДИН короткий емкий заголовок (до 6 слов) описывающий суть улучшения. Без кавычек.' },
            { role: 'user', content: `Проблема: ${prob}. Решение: ${sol}` }
        ], { temperature: 0.4, max_tokens: 30 });
        document.getElementById('rbi-prac-title').value = res;
    } catch (e) { showToast("Ошибка AI"); }
};

async function rbi_beautifyPracticeAi() {
    if (!_getSetting('aiEnabled')) return showToast("Включите AI в настройках!");

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
        const res = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Исходник.\nЧто делали/Проблема: ${prob}\nРешение/Результат: ${sol}` }
        ], { temperature: 0.3, max_tokens: 300 });

        const pMatch = res.match(/СУТЬ \(ПРОБЛЕМА\):\s*(.*?)(?=РЕШЕНИЕ \(РЕЗУЛЬТАТ\):|$)/is);
        const sMatch = res.match(/РЕШЕНИЕ \(РЕЗУЛЬТАТ\):\s*(.*?)$/is);

        if (pMatch) probEl.value = pMatch[1].trim();
        if (sMatch) solEl.value = sMatch[1].trim();
        showToast("✨ Текст улучшен!");
    } catch (e) { showToast("Ошибка AI: " + e.message); }
};

// 3. АВТОЗАПОЛНЕНИЕ FMEA ЧЕРЕЗ DEEPSEEK
async function rbi_fillFmeaWithAi() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");

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
        const responseText = await callAI([
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

        _gameLogAction('fmea_master', 'ai_table');
        showToast("✨ Мега-таблица FMEA заполнена нейросетью!");
    } catch (e) {
        showToast("❌ Ошибка ИИ (попробуйте еще раз): " + e.message);
    } finally {
        btn.innerHTML = `🤖 Автозаполнение (ИИ)`;
        btn.disabled = false;
    }
};

// 3. ВОРКШОП С БРИГАДОЙ (Обновленный функционал с добавлением Фото)
async function rbi_generateWorkshop(taskId) {
    if (!_getSetting('aiEnabled')) return showToast("Включите AI-ассистента!");
    const task = _getTasks().find(t => t.id === taskId);
    const txtArea = document.getElementById('workshop-ai-scenario');
    txtArea.classList.remove('hidden');
    txtArea.value = "⏳ ИИ пишет сценарий...";

    document.getElementById('workshop-actions').classList.remove('hidden');

    const relatedTwi = typeof customTwiCards !== 'undefined' ? _getTwiCards().find(c => c.checklistKey === task.templateKey) : null;
    let twiContext = relatedTwi ? `Упомяни, что мы разберем TWI-инструкцию "${relatedTwi.title}".` : ``;

    const promptSystem = `Ты — старший инженер стройконтроля. Напиши сценарий для жесткой 5-минутной планерки с бригадой (toolbox talk) СТРОГО по виду работ "${task.templateTitle}".
    ЗАПРЕЩЕНО писать про каски, СИЗ и ТБ! Говорим ТОЛЬКО про технологию работ и качество!
    ЗАПРЕЩЕНО упоминать материалы, операции или инструменты, не относящиеся к виду работ "${task.templateTitle}" — весь текст должен быть привязан только к этому виду работ.
    1. 🎯 Цель: [Обозначить проблему качества].
    2. ⚠️ Суть ошибки: [Как они косячат технологически].
    3. 🛠 Как правильно: [Допуски из ГОСТ/СНиП].
    4. 💡 Итог: Мотивация.`;

    try {
        const res = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: `Подрядчик: ${task.contractor}. Работа: ${task.templateTitle}. ${twiContext}` }], { temperature: 0.3, max_tokens: 500 });
        txtArea.value = res;
    } catch (e) { txtArea.value = "❌ Ошибка ИИ."; }
};

/* ============================================================================ */
/* ИИ ГЕНЕРАТОРЫ ДЛЯ СПЕЦ-ЗАДАЧ (ИНСТРУКТАЖ, КС-2, ВОРКШОП)                     */
/* ============================================================================ */

// 1. ВВОДНЫЙ ИНСТРУКТАЖ (Сборка регламентов и TWI)
async function rbi_generateIntroBriefing(taskId) {
    if (!_getSetting('aiEnabled')) return showToast("Включите AI-ассистента в настройках!");

    const task = _getTasks().find(t => t.id === taskId);
    const btn = document.getElementById('btn-gen-intro');
    btn.innerHTML = '⏳ AI пишет...'; btn.disabled = true;

    // Достаем пункты чек-листа (требования)
    let checklistData = [];
    const tType = task.templateKey.split('_')[0];
    const key = task.templateKey.replace(tType + '_', '');
    const cl = tType === 'sys' && _templates().getSystemTemplates()[key] ? _templates().getSystemTemplates()[key].groups : (_templates().getUserTemplates()[key] ? _templates().getUserTemplates()[key].groups : []);
    const flatList = getFlatList(cl);

    // Формируем выжимку требований для ИИ
    const requirements = flatList.slice(0, 15).map(i => `- ${i.n}. Норматив: ${i.t.replace(/<\/?[^>]+(>|$)/g, "")}`).join('\n');

    const promptSystem = `Ты старший инженер по качеству. Напиши короткую и строгую приветственную речь-инструктаж (3 абзаца) для бригадиров подрядчика перед началом работ.
    Цель: обозначить, что контроль будет строгим, и перечислить главные точки внимания.
    Используй переданные требования. Без воды.`;

    try {
        const speech = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: `Вид работ: ${task.templateTitle}.\nТребования:\n${requirements}` }], { temperature: 0.3, max_tokens: 400 });

        // Сохраняем результат в задачу для последующей печати
        task.aiData = { speech: speech, checklist: flatList };
        await _storage().put(_storage().stores().TASKS, task);

        document.getElementById('intro-result-box').classList.remove('hidden');
        showToast("✨ Инструктаж сформирован!");
    } catch (e) {
        showToast("❌ Ошибка ИИ");
    } finally {
        btn.innerHTML = 'Собрать базу (AI)'; btn.disabled = false;
    }
};


// 2. ФИНАЛЬНАЯ ПРИЕМКА (Анализ перед КС-2)
async function rbi_generateFinalAcceptance(taskId) {
    const _allInspections = _getAllInspections();
    if (!_getSetting('aiEnabled')) return showToast("Включите AI-ассистента в настройках!");

    const task = _getTasks().find(t => t.id === taskId);
    const btn = document.getElementById('btn-gen-final');
    btn.innerHTML = '⏳ AI пишет...'; btn.disabled = true;

    // Собираем ВСЕ проверки по этому подрядчику и виду работ
    const cChecks = _allInspections.filter(c => c.contractorName === task.contractor && c.templateKey === task.templateKey).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (cChecks.length === 0) {
        btn.innerHTML = 'Анализ (AI)'; btn.disabled = false;
        return showToast("Нет данных проверок для анализа!");
    }

    const m = getContractorMetrics(cChecks, _templates().getUserTemplates());

    // Собираем дефекты
    const defects = {};
    cChecks.forEach(c => {
        if (c.state) {
            Object.keys(c.state).forEach(id => {
                if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                    const flat = getFlatList(_templates().getUserTemplates()[c.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[c.templateKey.replace('sys_', '')]?.groups);
                    const item = flat.find(x => String(x.id) === String(id));
                    if (item) defects[item.n] = (defects[item.n] || 0) + 1;
                }
            });
        }
    });

    const defectStr = Object.keys(defects).sort((a, b) => defects[b] - defects[a]).map(k => `${k} (${defects[k]} раз)`).join(', ');

    const promptSystem = `Ты — Директор по строительству. Напиши официальную резолюцию для подписания КС-2 (Акта выполненных работ).
    Укажи:
    1. Итоговый УрК и надежность.
    2. Главные косяки за период.
    3. Вывод: Подписать в полном объеме, С удержанием % (за брак), или Отказать в приемке до устранения.`;

    const promptUser = `Подрядчик: ${task.contractor}. Работа: ${task.templateTitle}. Проверок: ${cChecks.length}. Финальный УрК: ${m.finalC}%. Критических дефектов (вес 3): ${m.n_изделий_с_B3}. Частые дефекты: ${defectStr}`;

    try {
        const text = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 500 });
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
async function sk_aiMapColumns() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const btn = document.getElementById('btn-ai-mapping');
    btn.innerHTML = `<span class="animate-pulse">⏳ ИИ думает...</span>`;
    btn.disabled = true;

    var skSvc = (AIActions._ctx && AIActions._ctx.sk) || window.RBI.services.sk;
    const headersList = skSvc.getTempRawHeadersSync().map((h, i) => `${i}: "${h}"`).join(', ');

    const promptSystem = `Ты помощник интеграции данных. Тебе даны заголовки Excel-файла (с их индексами). Твоя задача — сопоставить их с системными полями: number, text, category, date_issued, contractor, deadline, status, date_resolved, structure.
    Верни СТРОГО JSON-объект, где ключ - это системное поле, а значение - индекс (число) колонки из Excel. Если колонки нет, верни -1. Без лишнего текста и комментариев.`;

    try {
        // Используем глобальную функцию callAI (которая у нас уже есть в ai.js)
        const res = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: headersList }], { temperature: 0.1, max_tokens: 300 });

        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const aiMap = JSON.parse(jsonMatch[0]);
            Object.keys(aiMap).forEach(key => {
                const select = document.querySelector(`.sk-mapping-select[data-field="${key}"]`);
                if (select) select.value = aiMap[key];
            });
            showToast("✨ ИИ успешно распознал колонки!");
        }
    } catch (e) {
        showToast("❌ Ошибка ИИ: " + e.message);
    } finally {
        btn.innerHTML = `🤖 Угадать через ИИ (DeepSeek)`;
        btn.disabled = false;
    }
};

// === 13. ИИ АВТО-МАППИНГ КАТЕГОРИЙ ПО ТЕКСТУ ЗАМЕЧАНИЯ ===
// === 13. ИИ АВТО-МАППИНГ КАТЕГОРИЙ ПО ТЕКСТУ ЗАМЕЧАНИЯ ===
// Добавили второй параметр forceAll
async function sk_autoMapCategories(silent = false, forceAll = false) {
    if (!_getSetting('aiEnabled')) {
        if (!silent) showToast("⚠️ Включите AI для авто-распределения категорий!");
        return 0;
    }

    if (forceAll && !silent) {
        if (!confirm("Внимание! ИИ заново проанализирует ВСЕ замечания в базе (кроме тех, что вы привязали вручную). Это может занять около минуты. Продолжить?")) return 0;
    }

    if (!silent && !skAiRunning) showToast("🤖 ИИ запускает анализ категорий...");

    const allowedCleanCats = [];
    const _stClean = _templates().getSystemTemplates();
    Object.keys(_stClean).forEach(k => allowedCleanCats.push(_stClean[k].title));
    if (allowedCleanCats.length === 0) allowedCleanCats.push("Общестроительные работы");

    // Ищем записи для обработки
    let recordsToFix = [];
    if (forceAll) {
        // Если нажали "Перепроверить всё" - берем все живые записи, КРОМЕ тех, что инженер исправил руками (category_corrected)
        recordsToFix = _getSkRecords().filter(r => !r._deleted && !r.is_deleted && !r.category_corrected);
    } else {
        // Старая логика: берем только "Без категории" и мусорные
        recordsToFix = _getSkRecords().filter(r =>
            !r.category ||
            r.category === 'Без категории' ||
            r.category.trim() === '' ||
            /^\d+$/.test(r.category)
        );
    }

    // Собираем уникальные связки: Подрядчик + Локация + Текст
    const uniqueTexts = [...new Set(recordsToFix.map(r => {
        const loc = r.project_loc || r.structure || 'Локация не указана';
        return `${r.contractor} ||| ${loc} ||| ${r.text}`;
    }).filter(t => t && t.length > 10))];

    if (uniqueTexts.length === 0) {
        if (!silent) showToast("✅ Все замечания уже распределены по категориям.");
        return 0;
    }

    const BATCH_SIZE = 200;
    let totalUpdated = 0;
    const totalBatches = Math.ceil(uniqueTexts.length / BATCH_SIZE);

    for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
        // Визуальный прогресс
        if (!silent) showToast(`🤖 ИИ обрабатывает пакет ${batchNum} из ${totalBatches}...`);

        const startIndex = (batchNum - 1) * BATCH_SIZE;
        const batch = uniqueTexts.slice(startIndex, startIndex + BATCH_SIZE);
        const batchStr = batch.map((t, idx) => `${idx}: "${t.substring(0, 200)}"`).join('\n');

        const promptSystem = `Ты — Главный эксперт строительного контроля. Твоя задача — классифицировать дефекты строго по утвержденному списку видов работ.
Доступные виды работ (Категории): [${allowedCleanCats.join(', ')}].

Тебе передан список в формате: "Имя подрядчика ||| Локация ||| Текст замечания".
Верни ТОЛЬКО JSON-объект: ключ - индекс (0..${batch.length - 1}), значение - строго одно название из списка выше.

ПРАВИЛА ЖЕСТКОЙ ЛОГИКИ:
1. ИМЯ ПОДРЯДЧИКА — это ГЛАВНАЯ подсказка. Если подрядчик обычно ставит окна, то "мусор" или "пена" от него — это категория "Окна ПВХ".
2. ЛОКАЦИЯ — вторая подсказка. Если локация "Кровля", ищи кровельные категории. Если "Фасад" — фасадные.
3. АССОЦИАЦИИ: "Арматура, бетон, пилон" -> Монолитные работы. "Кронштейн, утеплитель, вата" -> Фасад. "Профиль, стекло, пена" -> Окна/Витражи. "Шпаклевка, краска, линолеум, обои" -> Отделка.
4. ЗАПРЕЩЕНО придумывать свои категории. Используй ТОЛЬКО названия из списка. Без пояснений и маркдауна.`;

        try {
            const res = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: batchStr }], { temperature: 0.1, max_tokens: 5000 });
            const jsonMatch = res.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const aiMap = JSON.parse(jsonMatch[0]);
                let batchRecordsToUpdate = [];

                for (let i = 0; i < batch.length; i++) {
                    const cleanVal = aiMap[i] || aiMap[String(i)];
                    if (cleanVal && allowedCleanCats.includes(cleanVal)) {
                        // Разбираем строку обратно
                        const parts = batch[i].split(' ||| ');
                        const cName = parts[0];
                        const locName = parts[1];
                        const tText = parts[2];

                        // Находим все записи и обновляем
                        const targetRecords = _getSkRecords().filter(r => 
                            r.contractor === cName && 
                            r.text === tText &&
                            (r.project_loc === locName || r.structure === locName || (locName === 'Локация не указана'))
                        );
                        targetRecords.forEach(rec => {
                            rec.ai_category = cleanVal;
                            // Жестко заменяем категорию
                            if (rec.category !== cleanVal) {
                                rec.category = cleanVal;
                                rec.category_corrected = true;
                            }
                            rec._updatedAt = new Date().toISOString();
                            rec.updated_at = rec._updatedAt;
                            rec.updatedAt = rec._updatedAt;
                            
                            // ВАЖНО: Сбрасываем статус, чтобы улетело в облако!
                            rec.source = 'local';
                            rec.syncStatus = 'not_synced';
                            rec.sync_status = 'not_synced';
                            
                            batchRecordsToUpdate.push(rec);
                        });
                    }
                }

                // Сохраняем пачку
                if (batchRecordsToUpdate.length > 0) {
                    await _storage().putBatch(_storage().stores().SK_RECORDS, batchRecordsToUpdate);
                    totalUpdated += batchRecordsToUpdate.length;
                }
            }
        } catch (e) {
            console.warn("Ошибка ИИ в пакете", batchNum, e);
            if (!silent) showToast(`⚠️ Ошибка API на пакете ${batchNum}. Ждем и продолжаем...`);
        }

        // ВАЖНО: Задержка 2.5 секунды между пакетами, чтобы API DeepSeek не забанил нас за спам
        if (batchNum < totalBatches) {
            await new Promise(r => setTimeout(r, 2500));
        }
    }

    if (!silent && totalUpdated > 0) {
        showToast(`✨ ИИ успешно распределил ${totalUpdated} записей!`);
        if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('sk:renderRequested', { view: 'dashboard' }); // Перерисовываем экран

        localStorage.setItem('rbi_cloud_dirty', '1');
        _triggerSync('silent');
    }
    return totalUpdated;
};

// === 7. AI-СВЯЗКА ДЕФЕКТОВ EXCEL С ЧЕК-ЛИСТАМИ RBI И ГЕНЕРАЦИЯ ПИСЬМА ===
async function sk_generateContractorAiSummary(cName, safeId) {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const btn = document.getElementById(`btn-sk-ai-${safeId}`);
    const resBox = document.getElementById(`sk-ai-res-${safeId}`);

    btn.innerHTML = `<span class="animate-pulse">⏳ DeepSeek анализирует дефекты...</span>`;
    btn.disabled = true;
    resBox.classList.remove('hidden');
    resBox.innerHTML = `<div class="text-center text-indigo-500 font-bold animate-pulse">ИИ сопоставляет замечания с чек-листами RBI...</div>`;

    let total = 0, open = 0, overdue = 0;
    const defectsFreq = {};
    _getSkRecords().filter(r => r.contractor === cName).forEach(r => {
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

    const topDefects = Object.keys(defectsFreq).sort((a, b) => defectsFreq[b] - defectsFreq[a]).slice(0, 5);
    const defectListStr = topDefects.map(d => `- ${d} (${defectsFreq[d]} раз)`).join('\n');

    const availableChecklists = [];
    const _stChecklists = _templates().getSystemTemplates();
    Object.keys(_stChecklists).forEach(k => availableChecklists.push(_stChecklists[k].title));
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
        const response = await callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.2, max_tokens: 800 });

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
        _gameLogAction('ai_generate', 'sk_contractor_analysis');
        // === АВТОЗАКРЫТИЕ ЗАДАЧИ ПРИ ФОРМИРОВАНИИ ПИСЬМА ===
        {
            const skTask = _getTasks().find(t => t.title === 'Анализ проблем ПК СК' && t.status === 'pending');
            if (skTask) {
                skTask.status = 'done';
                skTask.done = 1;
                skTask.resultComment = 'Письмо отправлено';
                skTask.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') _storage().put(_storage().stores().TASKS, skTask);
                window.RBI.events.emit('tasks:refresh', {});
            }
        }
    } catch (e) {
        resBox.innerHTML = `<span class="text-red-500 font-bold">❌ Ошибка ИИ: ${e.message}</span>`;
    } finally {
        btn.innerHTML = `🤖 AI-Анализ и Письмо прорабу`;
        btn.disabled = false;
    }
};

// === ПРЕДИКТИВНЫЙ ИИ: ПРОГНОЗ СРЫВА СРОКОВ ===
async function sk_predictRisksAi(silent = false) {
    if (!_getSetting('aiEnabled')) {
        if (!silent) showToast("⚠️ Включите AI-ассистента в Настройках!");
        return;
    }

    // Ищем только открытые замечания, у которых еще нет прогноза
    const openRecords = _getSkRecords().filter(r => {
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
            const res = await callAI([
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
                        batch[j].updated_at = batch[j]._updatedAt;
                        batch[j].updatedAt = batch[j]._updatedAt;
                        
                        // ВАЖНО: Сбрасываем статус, чтобы улетело в облако!
                        batch[j].source = 'local';
                        batch[j].syncStatus = 'not_synced';
                        batch[j].sync_status = 'not_synced';
                        
                        await _storage().put(_storage().stores().SK_RECORDS, batch[j]);
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
        _triggerSync('silent');
        if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('sk:renderRequested', { view: 'dashboard' });
        if (!silent) showToast(`✨ ИИ рассчитал риски для ${processed} замечаний!`);
    }
};

async function rbi_generateGlobalAi() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const container = document.getElementById('global-ai-text');
    if (!container) return;

    const data = getFilteredAnalyticsData();
    if (data.length === 0) return showToast("Нет данных для анализа");

    container.innerHTML = `<span class="animate-pulse text-indigo-600 font-bold">🧠 DeepSeek анализирует весь портфель объектов...</span>`;

    let sumB3 = 0;
    const projectsMap = {};
    data.forEach(item => {
        if (item.metrics) sumB3 += item.metrics.n_B3_fail;
        const pName = item.projectName || 'Без объекта';
        if (!projectsMap[pName]) projectsMap[pName] = [];
        projectsMap[pName].push(item);
    });

    const pStats = Object.keys(projectsMap).map(p => {
        const pData = projectsMap[p];
        const m = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(pData, _templates().getUserTemplates()) : null;
        return `${p} (ИКО: ${m ? m.IKO : 0})`;
    }).join('; ');

    const promptSystem = `Ты — Директор по строительству. Сформируй КРАТКОЕ управленческое резюме по всему портфелю проектов компании.
    Структура: 
    1. Оценка ИКО по объектам (где всё хорошо, где катастрофа). 
    2. Главные риски.
    Отвечай СТРОГО в 2-3 коротких абзаца. Тон жесткий, деловой. Без воды.`;

    const promptUser = `Объекты: ${pStats}. Всего проверок: ${data.length}. Найдено критических дефектов (вес 3): ${sumB3}.`;

    try {
        const response = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 400 });

        container.innerHTML = response;
        _reports().setExpertConclusion('global_portfolio_ai', response);
        if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
    } catch (e) {
        container.innerHTML = `<span class="text-red-500">❌ Ошибка AI: ${e.message}</span>`;
    }
};


// === AI: САМООБУЧЕНИЕ СИСТЕМЫ (ОПТИМИЗАТОР ПАРАМЕТРОВ) ===
// Защита от двойного запуска (module-scope — раньше файл был classic-script
// с неявным window-глобалом, в ES-модуле strict-mode необъявленное
// присваивание бросает ReferenceError).
var _selfLearningRunning = false;

async function runSelfLearningAi() {
    const _allInspections = _getAllInspections();
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");
    var permSvc = (AIActions._ctx && AIActions._ctx.permissions) || window.RBI.services.permissions;
    if (permSvc && !permSvc.isAdmin()) {
        return showToast("⛔ Доступно только Администратору");
    }

    // Защита от двойного запуска
    if (_selfLearningRunning) return showToast("⏳ Уже выполняется...");
    _selfLearningRunning = true;

    const container = document.getElementById('ai-self-learning-result');
    if (!container) {
        _selfLearningRunning = false;
        return showToast("Контейнер #ai-self-learning-result не найден");
    }

    const data = _allInspections.filter(c => !c._deleted && c.metrics);
    if (data.length < 50) {
        _selfLearningRunning = false;
        return showToast("Слишком мало данных. Нужно хотя бы 50 проверок для машинного анализа.");
    }

    container.classList.remove('hidden');
    container.innerHTML = `<span class="animate-pulse text-purple-600 font-bold">🧠 ИИ сканирует массив данных и калибрует математическую модель...</span>`;

    try {
        // 1. Собираем расширенную статистику
        let sumUrk = 0, sumKc = 0, kcAppliedCount = 0, kcritAppliedCount = 0;
        let b1 = 0, b2 = 0, b3 = 0;
        let redCount = 0, greenCount = 0;
        let lastMonthRed = 0, lastMonthTotal = 0;
        const oneMonthAgo = new Date(); oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

        for (const c of data) {
            const m = c.metrics;
            sumUrk += m.final;
            if (m.final < 70) redCount++;
            if (m.final >= 85) greenCount++;
            b1 += m.n_B1_fail; b2 += m.n_B2_fail; b3 += m.n_B3_fail;

            if (m.kc < 1.0) {
                kcAppliedCount++;
                sumKc += m.kc;
            }
            if (m.kcrit < 1.0) kcritAppliedCount++;

            const cDate = new Date(c.date);
            if (cDate >= oneMonthAgo) {
                lastMonthTotal++;
                if (m.final < 70) lastMonthRed++;
            }
        }

        const avgUrk = (sumUrk / data.length).toFixed(1);
        const avgKc = kcAppliedCount ? (sumKc / kcAppliedCount).toFixed(2) : 1.0;
        const greenPerc = (greenCount / data.length * 100).toFixed(1);
        const redPerc = (redCount / data.length * 100).toFixed(1);
        const recentRedPerc = lastMonthTotal ? (lastMonthRed / lastMonthTotal * 100).toFixed(1) : "0";

        // 2. Промпт для ИИ (без требования JSON, просто текст)
        const promptSystem = `Ты — Архитектор систем управления качеством (QMS) и Data Scientist. Твоя задача: адаптировать и откалибровать математическую модель приложения под реальные условия стройки.
Текущие пороги: Зеленая зона > 85%, Красная зона < 70%. Правило Стеклянного потолка: при наличии системных дефектов балл режется до 84%.
Штрафные коэффициенты: за частоту B2 (Kc): при >20% повторений = 0.85, при >50% = 0.70; за наличие B3 (Kcrit) = 0.50.

Проанализируй полученные цифры:
- Если зеленой зоны слишком много (> 60%) — значит требования слишком мягкие, предложи поднять пороги.
- Если красной зоны в последний месяц выросла — модель недооценивает риск, предложи ужесточить.
- Если средний Kc < 0.9 при редких повторениях B2 — штраф избыточен, предложи повысить.
- Также оцени баланс дефектов B1/B2/B3.

Верни ответ СТРОГО в 3 абзаца:
1. ДИАГНОЗ: Оценка жесткости текущей модели и её адекватности.
2. АНОМАЛИИ: Дисбаланс между типами дефектов (B1/B2/B3) и динамика красной зоны.
3. РЕКОМЕНДАЦИЯ: Конкретные цифры. Какие пороги УрК изменить (новые значения green/red) и нужно ли изменить штрафные коэффициенты Kc и Kcrit.`;

        const promptUser = `Всего проверок: ${data.length}. Средний УрК: ${avgUrk}%. 
Попадание в зоны: Зеленая (≥85%): ${greenPerc}%, Красная (<70%): ${redPerc}% (за последний месяц красная зона: ${recentRedPerc}%).
Штраф Kc применялся в ${kcAppliedCount} проверках (${((kcAppliedCount / data.length) * 100).toFixed(1)}%), средний Kc = ${avgKc}.
Выявлено дефектов: B1 (${b1}), B2 (${b2}), B3 (${b3}).
Требуется: оценить, нужно ли поднять порог зеленой зоны, опустить порог красной, изменить Kc или Kcrit.`;

        const response = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.2, max_tokens: 800 });

        // 3. Вывод результата
        container.innerHTML = `<div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-200 shadow-sm mt-2">
            <div class="flex justify-between items-center mb-2">
                <b class="text-purple-700">🧠 Рекомендации ИИ (DeepSeek)</b>
                <button onclick="document.getElementById('ai-self-learning-result').innerHTML = ''; document.getElementById('ai-self-learning-result').classList.add('hidden')" class="text-slate-400 hover:text-red-500 text-lg leading-none">✕</button>
            </div>
            <div class="text-sm leading-relaxed whitespace-pre-wrap">${response}</div>
            <div class="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">ℹ️ Рекомендации носят аналитический характер. Изменить пороги можно вручную в настройках проекта (будет добавлено позже).</div>
        </div>`;

        _gameLogAction('ai_generate', 'system_optimization');
    } catch (e) {
        console.error("[SelfLearning AI]", e);
        container.innerHTML = `<span class="text-red-500">❌ Ошибка: ${e.message}</span>`;
    } finally {
        _selfLearningRunning = false;
    }
};

// === ИИ-ТРЕНЕР: РАЗБОР ОШИБОК И ГАРАНТИЙНЫХ РИСКОВ ===
async function sk_auditTemplatesAi() {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const resBox = document.getElementById('sk-ai-templates-res');
    if (!resBox) return;

    var skSvc = (AIActions._ctx && AIActions._ctx.sk) || window.RBI.services.sk;
    if (skSvc.getBadRemarksSync().length === 0) {
        resBox.classList.remove('hidden');
        resBox.innerHTML = `<div class="text-green-600 font-black flex items-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Ошибок в формулировках не найдено. Команда пишет предписания идеально!</div>`;
        return;
    }

    resBox.classList.remove('hidden');
    resBox.innerHTML = `<span class="animate-pulse text-indigo-500 font-bold flex items-center gap-2"><svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> DeepSeek готовит материал для планерки...</span>`;

    // Берем 3 случайных плохих замечания
    const sample = skSvc.getBadRemarksSync().sort(() => 0.5 - Math.random()).slice(0, 3).map(r => `- ${r.eng}: "${r.text}"`);

    const promptSystem = `Ты — Директор по качеству. Твоя задача — провести короткий, жесткий, но конструктивный мастер-класс для инженеров стройконтроля по правильному написанию предписаний.
    Замечание ОБЯЗАТЕЛЬНО должно содержать конкретный измеримый допуск (мм, см), либо ссылку на ГОСТ/СП/лист проекта. Общие фразы ("криво", "не по проекту") недопустимы, так как их легко оспорить в суде или при гарантийном случае через 3 года.

    Сформируй ответ строго в 3 блока (используй HTML-теги <b>, <ul>, <li>, <br> для красоты, не используй Markdown-звездочки):
    <b style="color:#b91c1c;">1. ГАРАНТИЙНЫЕ РИСКИ</b><br>[Объясни 1 абзацем, почему "отсебятина" и отсутствие цифр убьет позицию компании в суде с генподрядчиком или при жалобе дольщика.]<br><br>
    <b style="color:#0369a1;">2. РАЗБОР РЕАЛЬНЫХ ОШИБОК ИЗ БАЗЫ</b><br>[Возьми переданные примеры инженеров. Для каждого напиши "Как написано:" и "Как нужно писать:" (придумай реалистичные оси, листы РД и цифры допусков для примера).]<br><br>
    <b style="color:#15803d;">3. ПЛАН ДЕЙСТВИЙ</b><br>[Призыв к руководителю разобрать эти кейсы на ближайшей планерке.]`;

    const promptUser = `Вот реальные ошибки моих инженеров из Стройконтроля:\n${sample.join('\n')}`;

    try {
        const response = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 800 });

        resBox.innerHTML = response;
        _gameLogAction('ai_generate', 'sk_coaching');
    } catch (e) {
        resBox.innerHTML = `<span class="text-red-500 font-bold">❌ Ошибка ИИ: ${e.message}</span>`;
    }
};

// === Панель руководителя: Добавить синоним подрядчику ВРУЧНУЮ ===
async function gameAddContractorAliasInline(canonicalKey, predefinedValue = null) {
    const inputEl = document.getElementById(`alias_contr_input_${canonicalKey}`);
    const aliasName = predefinedValue || (inputEl ? inputEl.value.trim() : '');

    if (!aliasName) return showToast("⚠️ Введите синоним!");

    showToast("⏳ Сохранение синонима...");

    try {
        const pCode = window.syncConfig?.projectCode || 'RBI';
        const currentUser = window.syncConfig?.engineerName || 'Админ';
        const nowIso = new Date().toISOString();

        // 1. Получаем текущие данные подрядчика
        const { data: primaryData } = await window.supabaseClient
            .from('contractor_directory')
            .select('synonyms')
            .eq('project_code', pCode)
            .eq('canonical_key', canonicalKey)
            .single();

        let newSynonyms = Array.isArray(primaryData?.synonyms) ? primaryData.synonyms : [];

        // Защита от дублей
        if (newSynonyms.includes(aliasName)) {
            if (!predefinedValue) showToast("⚠️ Такой синоним уже есть");
            return;
        }
        newSynonyms.push(aliasName);

        // 2. Обновляем массив синонимов у основного подрядчика
        await window.supabaseClient
            .from('contractor_directory')
            .update({ synonyms: newSynonyms, updated_at: nowIso })
            .eq('project_code', pCode)
            .eq('canonical_key', canonicalKey);

        // 3. Создаем запись в таблице алиасов
        await window.supabaseClient.from('contractor_aliases').upsert({
            project_code: pCode, raw_name: aliasName, canonical_key: canonicalKey, created_by: currentUser, created_at: nowIso, updated_at: nowIso
        }, { onConflict: 'project_code,raw_name' });

        // Если это ручной ввод, очищаем инпут и показываем тост
        if (!predefinedValue) {
            if (inputEl) inputEl.value = '';
            showToast("✅ Синоним добавлен!");
            gameLoadContractorDirectory(); // Перерисовываем список
            localStorage.setItem('rbi_cloud_dirty', '1');
            _triggerSync('silent');
        }

    } catch (e) {
        console.error('[gameAddContractorAliasInline]', e);
        if (!predefinedValue) showToast("❌ Ошибка при добавлении синонима");
    }
};

// === Панель руководителя: ИИ ГЕНЕРАЦИЯ СИНОНИМОВ ===
// === Панель руководителя: ИИ ГЕНЕРАЦИЯ СИНОНИМОВ (Пакетное сохранение) ===
async function gameGenerateContractorSynonymsAI(canonicalKey, displayName) {
    if (!_getSetting('aiEnabled')) return showToast("⚠️ Включите AI-ассистента в настройках!");

    showToast("🧠 DeepSeek придумывает возможные опечатки...");

    const promptSystem = `Ты — эксперт по строительному документообороту. Твоя задача — сгенерировать 5-6 самых вероятных вариантов, как инженеры могут написать название компании "${displayName}" в отчетах (сокращения, без кавычек, без формы собственности, частые опечатки).
    Верни СТРОГО список через запятую. Никаких других слов, нумерации или приветствий.`;

    try {
        const response = await callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Сгенерируй синонимы для: ${displayName}` }
        ], { temperature: 0.4, max_tokens: 150 });

        const aiSynonyms = response.split(',').map(s => s.trim().replace(/['"«»]/g, '')).filter(Boolean);
        if (aiSynonyms.length === 0) throw new Error("ИИ вернул пустой список");

        showToast(`✨ ИИ придумал ${aiSynonyms.length} синонимов. Сохраняем...`);

        const pCode = window.syncConfig?.projectCode || 'RBI';
        const currentUser = window.syncConfig?.engineerName || 'Админ';
        const nowIso = new Date().toISOString();

        // 1. Получаем текущие данные подрядчика из облака
        const { data: primaryData } = await window.supabaseClient
            .from('contractor_directory')
            .select('synonyms')
            .eq('project_code', pCode)
            .eq('canonical_key', canonicalKey)
            .single();

        let newSynonyms = Array.isArray(primaryData?.synonyms) ? primaryData.synonyms : [];
        let addedCount = 0;

        for (let syn of aiSynonyms) {
            if (!newSynonyms.includes(syn)) {
                newSynonyms.push(syn);

                // Добавляем в облако алиас (без вызова тостов)
                await window.supabaseClient.from('contractor_aliases').upsert({
                    project_code: pCode, raw_name: syn, canonical_key: canonicalKey, created_by: currentUser, created_at: nowIso, updated_at: nowIso
                }, { onConflict: 'project_code,raw_name' });
                addedCount++;
            }
        }

        if (addedCount > 0) {
            // Обновляем массив синонимов у основного подрядчика
            await window.supabaseClient
                .from('contractor_directory')
                .update({ synonyms: newSynonyms, updated_at: nowIso })
                .eq('project_code', pCode)
                .eq('canonical_key', canonicalKey);
        }

        showToast("✅ Синонимы от ИИ успешно привязаны!");
        gameLoadContractorDirectory();

        localStorage.setItem('rbi_cloud_dirty', '1');
        _triggerSync('silent');

    } catch (e) {
        console.error('[gameGenerateContractorSynonymsAI]', e);
        showToast("❌ Ошибка ИИ: " + e.message);
    }
};

function _call(name, fn, args) {
  if (typeof fn !== 'function') {
    console.warn('[AIActions] функция не найдена: ' + name);
    return;
  }
  return fn.apply(window, args);
}

const AIActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    // ── Ядро ──────────────────────────────────────────────────────────────
    call(messages, options) {
      var aiSvc = this._ctx && this._ctx.ai;
      if (aiSvc) {
        return aiSvc.call(messages, options);
      }
      return _call('callAI', callAI, [messages, options]);
    },
    generateSmartComment(scenario) {
      return _call('generateSmartComment', generateSmartComment, [scenario]);
    },
    extractTextFromPdf(dataUrl) {
      return _call('extractTextFromPdf', extractTextFromPdf, [dataUrl]);
    },

    // ── Аналитика ─────────────────────────────────────────────────────────
    generatePulse() {
      return _call('generatePulseAi', generatePulseAi, []);
    },
    generateHeatmap() {
      return _call('generateHeatmapAi', generateHeatmapAi, []);
    },
    generateContractorForecast(contractorName) {
      return _call('generateContractorForecastAi', generateContractorForecastAi, [contractorName]);
    },
    generateOnePagerForecast(pdcaKey) {
      return _call('generateOnePagerForecastAi', generateOnePagerForecastAi, [pdcaKey]);
    },
    generateGlobal() {
      return _call('rbi_generateGlobalAi', rbi_generateGlobalAi, []);
    },

    // ── Задачи / FMEA / практики ──────────────────────────────────────────
    generatePrescription(inspectionId) {
      return _call('generatePrescriptionAi', generatePrescriptionAi, [inspectionId]);
    },
    generateTaskRisk(contractorName, templateKey, contains) {
      return _call('generateTaskRiskAi', generateTaskRiskAi, [contractorName, templateKey, contains]);
    },
    fillFmea() {
      return _call('rbi_fillFmeaWithAi', rbi_fillFmeaWithAi, []);
    },
    generateWorkshop(taskId) {
      return _call('rbi_generateWorkshop', rbi_generateWorkshop, [taskId]);
    },
    generateIntroBriefing(taskId) {
      return _call('rbi_generateIntroBriefing', rbi_generateIntroBriefing, [taskId]);
    },
    generateFinalAcceptance(taskId) {
      return _call('rbi_generateFinalAcceptance', rbi_generateFinalAcceptance, [taskId]);
    },
    generateMeetingMemo() {
      return _call('rbi_generateMeetingMemo', rbi_generateMeetingMemo, []);
    },
    generatePracticeTitle() {
      return _call('rbi_generatePracticeTitleAi', rbi_generatePracticeTitleAi, []);
    },
    beautifyPractice() {
      return _call('rbi_beautifyPracticeAi', rbi_beautifyPracticeAi, []);
    },

    // ── База знаний ───────────────────────────────────────────────────────
    generateTwiDraft() {
      return _call('generateTwiDraftAi', generateTwiDraftAi, []);
    },
    normalizeFeedback(rawText) {
      return _call('rbi_normalizeFeedbackAi', rbi_normalizeFeedbackAi, [rawText]);
    },

    // ── Чат с документом ─────────────────────────────────────────────────
    openDocChat() {
      return _call('openAiDocChat', openAiDocChat, []);
    },
    closeDocChat() {
      return _call('closeAiDocChat', closeAiDocChat, []);
    },
    askDocQuestion() {
      return _call('askAiDocQuestion', askAiDocQuestion, []);
    },

    // ── СК-специфичные ────────────────────────────────────────────────────
    skMapColumns() {
      return _call('sk_aiMapColumns', sk_aiMapColumns, []);
    },
    skAutoMapCategories(silent, forceAll) {
      return _call('sk_autoMapCategories', sk_autoMapCategories, [silent, forceAll]);
    },
    skContractorSummary(contractorName, safeId) {
      return _call('sk_generateContractorAiSummary', sk_generateContractorAiSummary, [contractorName, safeId]);
    },
    skPredictRisks(silent) {
      return _call('sk_predictRisksAi', sk_predictRisksAi, [silent]);
    },
    skAuditTemplates() {
      return _call('sk_auditTemplatesAi', sk_auditTemplatesAi, []);
    },

    // ── Геймификация ──────────────────────────────────────────────────────
    gameAddContractorAlias(canonicalKey, predefinedValue) {
      return _call('gameAddContractorAliasInline', gameAddContractorAliasInline, [canonicalKey, predefinedValue]);
    },
    gameContractorSynonyms(canonicalKey, displayName) {
      return _call('gameGenerateContractorSynonymsAI', gameGenerateContractorSynonymsAI, [canonicalKey, displayName]);
    },

    // ── Утилиты ───────────────────────────────────────────────────────────
    runSelfLearning() {
      return _call('runSelfLearningAi', runSelfLearningAi, []);
    },
    generateRoutePlan() {
      return _call('generateAiRoutePlan', generateAiRoutePlan, []);
    },
    generateTutorAdvice() {
      return _call('generateAiTutorAdvice', generateAiTutorAdvice, []);
    },
    generateHintForDefect() {
      return _call('generateAiHintForDefect', generateAiHintForDefect, []);
    },
    generateCultureAnalysis(contractorName) {
      return _call('generateCultureAi', generateCultureAi, [contractorName]);
    }
};

export {
  changeAiMode, callAI, generateSmartComment, generateOnePagerForecastAi,
  generatePulseAi, generateHeatmapAi, generateContractorForecastAi, generateCultureAi,
  generateTwiDraftAi, generatePrescriptionAi, generateTaskRiskAi, generateAiRoutePlan,
  generateAiTutorAdvice, generateAiHintForDefect, extractTextFromPdf, rbi_normalizeFeedbackAi,
  openAiDocChat, closeAiDocChat, askAiDocQuestion, rbi_generateMeetingMemo,
  rbi_generatePracticeTitleAi, rbi_beautifyPracticeAi, rbi_fillFmeaWithAi, rbi_generateWorkshop,
  rbi_generateIntroBriefing, rbi_generateFinalAcceptance, sk_aiMapColumns, sk_autoMapCategories,
  sk_generateContractorAiSummary, sk_predictRisksAi, rbi_generateGlobalAi, runSelfLearningAi,
  sk_auditTemplatesAi, gameAddContractorAliasInline, gameGenerateContractorSynonymsAI,
  AIActions
};
