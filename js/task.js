/* Файл: js/task.js (Единый модуль управления задачами) */

window.rbi_scheduleData = []; 
window.rbi_tasksData = []; // ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ ВСЕХ ЗАДАЧ

const RBI_TASK_ICONS = {
    'ППР': `<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
    'Инструктаж': `<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
    'Эталон': `<svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
    'Контроль': `<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>`,
    'Совещание': `<svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
    'Развитие': `<svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
    'Отчет': `<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
};

// ==========================================
// 1. УПРАВЛЕНИЕ РУЧНЫМИ ЗАДАЧАМИ
// ==========================================
window.rbi_openTaskModal = function() {
    const cSelect = document.getElementById('manual-task-contractor');
    if (cSelect) {
        const uniqueContrs = [...new Set(contractorArray.map(c => c.contractorName).filter(Boolean))].sort();
        cSelect.innerHTML = `<option value="">-- Общая задача --</option>` + uniqueContrs.map(c => `<option value="${c.replace(/"/g, '&quot;')}">${c}</option>`).join('');
    }
    document.getElementById('manual-task-title').value = '';
    document.getElementById('manual-task-date').value = new Date().toISOString().split('T')[0];

    const modal = document.getElementById('manual-task-modal');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.rbi_closeTaskModal = function() {
    document.getElementById('manual-task-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
};

window.rbi_saveManualTask = async function() {
      if (typeof isDemoMode !== 'undefined' && isDemoMode) return showToast("В демо-режиме сохранение отключено");
    const title = document.getElementById('manual-task-title').value.trim();
    const typeCat = document.getElementById('manual-task-type').value; // 'control', 'method', 'meeting', 'dev', 'report'
    const contr = document.getElementById('manual-task-contractor').value;
    const dateStr = document.getElementById('manual-task-date').value;

    if (!title) return showToast("⚠️ Укажите название задачи!");

    const tDate = dateStr ? new Date(dateStr) : new Date();
    tDate.setHours(12,0,0,0);

    let iconType = 'Контроль';
    if(typeCat === 'method') iconType = 'ППР';
    if(typeCat === 'meeting') iconType = 'Совещание';

    const newTask = {
        id: 'task_man_' + Date.now().toString(36),
        type: 'manual', // Идентификатор ручной задачи
        category: typeCat,
        icon: iconType,
        contractor: contr || "Служебная",
        project: document.getElementById('inp-project')?.value || "Все",
        templateKey: '', 
        workTitle: 'Поручение',
        title: title, 
        prompt: 'Создано инженером вручную.',
        status: 'pending', // pending, done, rescheduled, blocked
        priorityLvl: 2, 
        date: tDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false
    };

    window.rbi_tasksData.unshift(newTask);
    await dbPut(STORES.TASKS, newTask);
    
    showToast("✅ Задача добавлена в план!");
    rbi_closeTaskModal();
    rbi_renderTasksList();
};

// ==========================================
// 2. РАБОТА СО СТАТУСАМИ (ВЫПОЛНЕНИЕ / ПЕРЕНОС / БЛОКИРОВКА)
// ==========================================


window.rbi_startMeetingTask = function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if(task) { 
        // НЕ отмечаем как done! Запоминаем taskId!
        window.activeTaskId = taskId;
    }
    
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    
    switchTab('tab-engineer');
    setTimeout(() => {
        const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
        if (btns[2]) rbi_switchEngineerSubTab('eng-sub-meetings', btns[2]);
        setTimeout(() => { rbi_createMeeting(); }, 200);
    }, 100);
};

// ==========================================
// 3. УМНЫЙ ГЕНЕРАТОР ЗАДАЧ (ENTERPRISE LOGIC)
// ==========================================
window.gameForceUpdatePlan = async function() {
    showToast("🧠 ИИ анализирует базу и перестраивает план...");
    await gameGenerateWeeklyPlan(true);
    rbi_renderTasksList();
}

window.gameGenerateWeeklyPlan = async function(force = false) {
    const currentInspector = document.getElementById('inp-inspector')?.value.trim() || 'Инженер';
    if (!currentInspector) return;

    if (typeof engineerAbsence !== 'undefined' && engineerAbsence.isActive) return;

    // Считаем начало и конец текущей недели
    const now = new Date();
    const startOfThisWeek = getStartOfWeek(now);
    const endOfThisWeek = new Date(startOfThisWeek); 
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
    endOfThisWeek.setHours(23, 59, 59, 999);

    // Берем все проверки инспектора за месяц для анализа
     const allMyChecks = contractorArray.filter(c => c.inspectorName === currentInspector);

    // БЕЗОПАСНАЯ ОЧИСТКА ЗАДАЧ: Удаляем только просроченные АВТО задачи со статусом pending. Не делаем dbClear!
    const tasksToDelete = window.rbi_tasksData.filter(t => 
        t.type === 'auto' && 
        t.status === 'pending' && 
        new Date(t.date).toDateString() !== now.toDateString()
    );
    
    // Удаляем их из базы по одной
    for (let t of tasksToDelete) {
        await dbDelete(STORES.TASKS, t.id);
    }
    
    // Оставляем в памяти только те, что не удалили
    window.rbi_tasksData = window.rbi_tasksData.filter(t => !tasksToDelete.includes(t));

    let newTasksCount = 0;

    // Вспомогательная функция добавления задачи
    const addTask = (idSuffix, cat, icon, title, workTitle, contractor, prompt, lvl, tDate, tmplKey = '') => {
        // Проверка: нет ли уже такой задачи на сегодня?
        const exists = window.rbi_tasksData.find(t => t.title === title && t.contractor === contractor && new Date(t.date).toDateString() === tDate.toDateString());
        if (exists) return;

        const task = {
            id: 'tsk_' + Date.now().toString(36) + idSuffix + Math.floor(Math.random()*1000),
            type: 'auto', category: cat, icon: icon,
            contractor: contractor, project: document.getElementById('inp-project')?.value || "Все",
            templateKey: tmplKey, workTitle: workTitle,
            title: title, prompt: prompt,
            status: 'pending', priorityLvl: lvl, date: tDate.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _deleted: false
        };
        window.rbi_tasksData.push(task);
        task.updatedAt = new Date().toISOString();
        dbPut(STORES.TASKS, task);
        newTasksCount++;
    };

    // --- ЛОГИКА 1: ПЛАНОВЫЕ ПРОВЕРКИ И ЭТАЛОНЫ (По подрядчикам) ---
    const pairMap = {};
    allMyChecks.forEach(c => {
        let key = `${c.projectName}::${c.contractorName}::${c.templateKey}`;
        if (!pairMap[key]) {
            pairMap[key] = {
                project: c.projectName, contractor: c.contractorName,
                templateKey: c.templateKey, templateTitle: c.templateTitle, checks: [],
                allTimeCount: contractorArray.filter(hist => hist.projectName === c.projectName && hist.contractorName === c.contractorName && hist.templateKey === c.templateKey).length,
                checksThisWeek: contractorArray.filter(hist => hist.contractorName === c.contractorName && hist.templateKey === c.templateKey && new Date(hist.date) >= startOfThisWeek).length
            };
        }
        pairMap[key].checks.push(c);
    });

    for (let key in pairMap) {
        const pair = pairMap[key];
        
        // 1. Потребность в Эталоне (Если нет ни одной проверки 'sys_etalon_act' по этому подрядчику)
        const hasEtalon = etalonActsArray.some(c => c.contractorName === pair.contractor && c.templateKey === 'sys_etalon_act');
        if (!hasEtalon && pair.allTimeCount > 0) {
            addTask('etalon', 'control', 'Эталон', `Запросить Акт-Эталон`, pair.templateTitle, pair.contractor, `Новый подрядчик. Перед массовым контролем проведите совместную приемку эталонного узла.`, 4, now, pair.templateKey);
        }

        // 2. Расчет частоты аудитов по УрК
        const m = getContractorMetrics(pair.checks, userTemplates);
        if (m) {
            let requiredChecksPerWeek = 1;
            let promptText = "Плановый поддерживающий контроль (Зеленая зона).";
            let lvl = 1;

            if (pair.allTimeCount < 3) {
                requiredChecksPerWeek = 3; promptText = "Сбор данных. Нужно провести аудит для формирования рейтинга надежности."; lvl = 2;
            } else if (m.finalC < 70 || m.n_изделий_с_B3 > 0) {
                requiredChecksPerWeek = 5; promptText = "Красная зона! Обязательный ежедневный аудит. При наличии B3 - останавливайте работы."; lvl = 4;
            } else if (m.finalC >= 70 && m.finalC <= 84) {
                requiredChecksPerWeek = 2; promptText = "Желтая зона. Подрядчик допускает системный брак. Проверьте выполнение предписаний."; lvl = 3;
            }

            // Создаем задачи только если квота на неделю еще не выполнена!
            const deficit = requiredChecksPerWeek - pair.checksThisWeek;
            if (deficit > 0) {
                // Раскидываем задачи по оставшимся дням недели
                for (let i = 0; i < deficit; i++) {
                    let taskDate = new Date(now);
                    taskDate.setDate(now.getDate() + i); // Каждый следующий день
                    if (taskDate > endOfThisWeek) taskDate = new Date(now); // Если вылезаем за неделю, кидаем в сегодня
                    
                    addTask(`aud_${i}`, 'control', 'Контроль', `Инспекция: ${pair.contractor}`, pair.templateTitle, pair.contractor, promptText, lvl, taskDate, pair.templateKey);
                }
            }

            // --- ЛОГИКА 2: ИНТЕРВЕНЦИИ И ОБУЧЕНИЕ (Мягкая сила) ---
            if (m.n_изделий_с_B3 > 2) {
                addTask('def_meet', 'meeting', 'Совещание', `Совещание по дефектам`, pair.templateTitle, pair.contractor, `Зафиксировано ${m.n_изделий_с_B3} критических дефектов. Соберите штаб, используйте материалы из Истории.`, 4, now);
            }
            if (m.maxFailRate >= 20) {
                addTask('workshop', 'dev', 'Развитие', `Воркшоп с бригадой`, pair.templateTitle, pair.contractor, `Системный брак B2 повторяется в ${m.maxFailRate.toFixed(0)}% случаев. Проведите обучение на объекте.`, 3, now);
            }
            if (pair.templateTitle.toLowerCase().includes('окн') || pair.templateTitle.toLowerCase().includes('двер')) {
                // Раз в месяц заводской контроль
                if (now.getDate() <= 7) {
                    addTask('factory', 'method', 'ППР', `Заводской контроль`, pair.templateTitle, pair.contractor, `Выездная проверка производства перед отправкой партии на объект.`, 2, now);
                }
            }
        }
    }

    // --- ЛОГИКА 3: РУТИНА И ОТЧЕТНОСТЬ ---
    // --- ЛОГИКА 3: РУТИНА И ОТЧЕТНОСТЬ ---
    const dayOfWeek = now.getDay(); // 0 = Sun, 5 = Fri
    const isFirstDayOfMonth = now.getDate() <= 3; // Первые числа месяца
    
    // Вычисляем за 3 дня до конца месяца для "Дня Качества"
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isEndOfMonth = now.getDate() >= (daysInMonth - 3) && now.getDate() <= daysInMonth;

    if (dayOfWeek === 5) { // Пятница
        addTask('fmea_weekly', 'method', 'ППР', 'Заполнить FMEA таблицу', 'Аналитика', 'Системная', 'Зайдите в Инженер -> FMEA и позвольте ИИ проанализировать коренные причины брака за неделю.', 3, now);
        addTask('poster_weekly', 'report', 'Отчет', 'Распечатать Плакат качества', 'Отчетность', 'Системная', 'Сформируйте в Аналитике плакат А3 и повесьте в штабе подрядчиков.', 2, now);
    }
    if (dayOfWeek === 1 || dayOfWeek === 2) { // Понедельник-Вторник
        addTask('meeting_weekly', 'meeting', 'Совещание', 'Еженедельный разбор качества', 'Коммуникация', 'Системная', 'Откройте вкладку Совещания. Система уже собрала повестку по худшим подрядчикам.', 4, now);
    }
    if (isFirstDayOfMonth) {
        addTask('op_m', 'report', 'Отчет', 'Ежемесячный One-Pager', 'Отчетность', 'Системная', 'Отправьте руководителю выгрузку Сводного статуса объекта за 30 дней.', 3, now);
    }
    
    // НОВАЯ ЛОГИКА: Подготовка к Дню Качества
    if (isEndOfMonth) {
        addTask('q_day_report', 'report', 'Отчет', 'Консолидированный отчет: День Качества', 'Аналитика Руководителя', 'Системная', 'Приближается дата Дня Качества. Система автоматически сгенерирует мега-отчет за месяц (Влияние инженеров, Метрики, Практики, FMEA).', 4, now);
    }

    if (force) showToast(`✅ План актуализирован. Добавлено ${newTasksCount} задач.`);
};

// ==========================================
// 4. UI РЕНДЕР: Вкладка "Задачи"
// ==========================================
// ==========================================
// 4. UI РЕНДЕР: Вкладка "Задачи" (С АРХИВОМ)
// ==========================================
window.rbi_renderTasksList = async function() {
    const container = document.getElementById('rbi-tasks-container');
    if (!container) return;

    const activeTasks = window.rbi_tasksData;

    const today = new Date(); 
    today.setHours(0,0,0,0);
    const startW = getStartOfWeek(today);
    const endW = new Date(startW); endW.setDate(startW.getDate() + 6); endW.setHours(23,59,59,999);
    const endM = new Date(today.getFullYear(), today.getMonth() + 1, 0); endM.setHours(23,59,59,999);
    
    const weekNumEl = document.getElementById('rbi-week-number');
    const weekDatesEl = document.getElementById('rbi-week-dates');
    if (weekNumEl) weekNumEl.innerText = getWeekNumber(today);
    if (weekDatesEl) weekDatesEl.innerText = `${startW.toLocaleDateString('ru-RU', {day:'numeric', month:'short'})} — ${endW.toLocaleDateString('ru-RU', {day:'numeric', month:'short', year:'numeric'})}`;

    let globalActionsHtml = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <button onclick="gameForceUpdatePlan()" class="bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Обновить план</button>
            <button onclick="rbi_openTaskModal()" class="bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg> Вручную</button>
            <button onclick="generateAiRoutePlan()" class="bg-purple-50 text-purple-700 border border-purple-200 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5">🧠 AI-Маршрут</button>
            <button onclick="gameToggleAbsence()" class="bg-amber-50 text-amber-700 border border-amber-200 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5">🏖️ Отпуск</button>
        </div>
        <div id="ai-route-container" class="hidden mb-4 bg-purple-50 border border-purple-200 rounded-xl p-3 text-[11px] text-purple-900 leading-relaxed shadow-inner"></div>
    `;

    if (typeof engineerAbsence !== 'undefined' && engineerAbsence.isActive) {
        container.innerHTML = globalActionsHtml + `<div class="bg-white border border-amber-200 rounded-xl p-6 text-center text-amber-700 shadow-sm"><div class="font-black uppercase mb-1 text-lg">🏖️ Режим: ${engineerAbsence.reason}</div>Задачи приостановлены. Хорошего отдыха!</div>`;
        return;
    }

    let overdue = []; let todayTasks = []; let weekTasks = []; let monthTasks = [];
    let archiveTasks = []; 
    let weekTotal = 0; let weekDone = 0;

    activeTasks.forEach(t => {
        if (t._deleted) return;

        if (t.status !== 'pending') {
            archiveTasks.push(t);
            if (t.status === 'done') { weekTotal++; weekDone++; }
            return; 
        }
        
        const tDate = t.date ? new Date(t.date) : new Date();
        tDate.setHours(0,0,0,0);
        
        if (tDate.getTime() < today.getTime()) { overdue.push(t); weekTotal++; } 
        else if (tDate.getTime() === today.getTime()) { todayTasks.push(t); weekTotal++; } 
        else if (tDate.getTime() > today.getTime() && tDate.getTime() <= endW.getTime()) { weekTasks.push(t); weekTotal++; } 
        else if (tDate.getTime() > endW.getTime() && tDate.getTime() <= endM.getTime()) { monthTasks.push(t); weekTotal++; }
    });

    const progText = document.getElementById('rbi-tasks-progress-text');
    const progBar = document.getElementById('rbi-tasks-progress-bar');
    if (progText) progText.innerText = `${weekDone}/${weekTotal}`;
    if (progBar) progBar.style.width = weekTotal > 0 ? `${(weekDone/weekTotal)*100}%` : '0%';

    // ИСПРАВЛЕНИЕ: Карточка стала кликабельной целиком (2-й уровень - модалка)
    const renderCard = (t, isOverdue, isArchive = false) => {
        const icon = t.icon ? (RBI_TASK_ICONS[t.icon] || RBI_TASK_ICONS['Контроль']) : RBI_TASK_ICONS['Контроль'];
        const dateStr = t.date ? new Date(t.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'}) : 'Без даты';
        const dateTag = isOverdue ? `<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Проср: ${dateStr}</span>` : `<span class="text-[10px] text-slate-400 font-bold">${dateStr}</span>`;
        
        let borderClass = isOverdue ? 'border-red-300 shadow-md' : 'border-[var(--card-border)] shadow-sm';
        let opacityClass = isArchive ? 'opacity-60 grayscale' : '';
        
        let priorityColor = 'text-green-600 bg-green-50 border-green-200';
        if (t.priorityLvl === 4) priorityColor = 'text-red-600 bg-red-50 border-red-200';
        if (t.priorityLvl === 3) priorityColor = 'text-orange-600 bg-orange-50 border-orange-200';

        let statusBadge = '';
        if (isArchive) {
            if (t.status === 'done') statusBadge = '<div class="absolute top-2 right-2 text-green-600 font-black text-[10px] uppercase bg-green-50 px-2 py-1 rounded">✅ Выполнено</div>';
            if (t.status === 'blocked') statusBadge = '<div class="absolute top-2 right-2 text-red-600 font-black text-[10px] uppercase bg-red-50 px-2 py-1 rounded">🚧 Отменено</div>';
        }

        return `
        <div data-category="${t.category || 'other'}" onclick="rbi_openTaskAction('${t.id}')" class="task-card-item cursor-pointer w-full bg-[var(--card-bg)] border ${borderClass} rounded-xl p-3 flex flex-col gap-2 relative transition-transform active:scale-[0.98] hover:border-indigo-300 ${opacityClass}">
            ${isOverdue && !isArchive ? '<div class="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl"></div>' : ''}
            ${statusBadge}
            <div class="flex items-center gap-2 mb-1 min-w-0 pr-16">
                <div class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] flex items-center justify-center border border-[var(--card-border)] shrink-0">${icon}</div>
                <div class="min-w-0">
                    <div class="text-[13px] font-black text-slate-800 dark:text-white leading-tight truncate">${t.contractor}</div>
                    <div class="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 truncate">${t.title}</div>
                </div>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug mb-1 line-clamp-2">${t.prompt}</div>
            <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-end">
                <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${priorityColor}">Уровень: ${t.priorityLvl}</span>
                ${dateTag}
            </div>
        </div>`;
    };

    const filterHtml = `
        <div class="flex gap-1.5 mb-4 pb-2 overflow-x-auto no-scrollbar" id="hub-filters">
            <button onclick="rbi_filterTaskHub('all', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm transition-colors shrink-0">Все</button>
            <button onclick="rbi_filterTaskHub('control', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0">Контроль</button>
            <button onclick="rbi_filterTaskHub('method', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0">Методика</button>
            <button onclick="rbi_filterTaskHub('meeting', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0">Встречи</button>
        </div>
    `;

    let accordionsHtml = '';
    if (overdue.length > 0) accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden" open><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-red-600 uppercase tracking-widest">🚨 ПРОСРОЧЕНО (${overdue.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">${overdue.map(t => renderCard(t, true)).join('')}</div></details>`;
    if (todayTasks.length > 0) accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden" open><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-indigo-600 uppercase tracking-widest">📌 СЕГОДНЯ (${todayTasks.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">${todayTasks.map(t => renderCard(t, false)).join('')}</div></details>`;
    if (weekTasks.length > 0) accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-600 uppercase tracking-widest">🔜 ЭТА НЕДЕЛЯ (${weekTasks.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">${weekTasks.map(t => renderCard(t, false)).join('')}</div></details>`;
    if (monthTasks.length > 0) accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-500 uppercase tracking-widest">🗓 ДО КОНЦА МЕСЯЦА (${monthTasks.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">${monthTasks.map(t => renderCard(t, false)).join('')}</div></details>`;
    
    if (archiveTasks.length > 0) {
        const recentArchive = archiveTasks.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">✅ ВЫПОЛНЕНО И ЗАКРЫТО (${archiveTasks.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">${recentArchive.map(t => renderCard(t, false, true)).join('')}</div></details>`;
    }

    if (weekTotal === 0 && archiveTasks.length === 0) {
        container.innerHTML = globalActionsHtml + `<div class="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center shadow-sm mt-4"><div class="text-[14px] font-black text-slate-700 uppercase tracking-wider mb-1">План чист</div><div class="text-[11px] text-slate-500 font-medium">Сделайте проверку или обновите план.</div></div>`;
        return;
    }

    container.innerHTML = globalActionsHtml + filterHtml + accordionsHtml;
};

window.rbi_filterTaskHub = function(category, btnElement) {
    const container = document.getElementById('hub-filters');
    if (container) {
        container.querySelectorAll('.hub-filter-btn').forEach(btn => {
            btn.className = "hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0";
        });
    }
    if (btnElement) {
        btnElement.className = "hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm transition-colors shrink-0";
    }

    const cards = document.querySelectorAll('.task-card-item');
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'flex'; 
        } else {
            card.style.display = 'none';
        }
    });
};

// ==========================================
// 5. ИНТЕГРАЦИЯ УМНЫХ КНОПОК ИЗ КАРТОЧЕК ЗАДАЧ
// ==========================================

// Фоновая отметка задачи выполненной (без модалок)
window.rbi_markTaskDone = function(taskId, silent = false) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if(task) {
        task.status = 'done';
        task.resultComment = 'Выполнено из быстрого действия';
        task.updatedAt = new Date().toISOString();
        dbPut(STORES.TASKS, task);
        if (!silent) {
            showToast("✅ Задача выполнена!");
            rbi_renderTasksList();
        }
    }
};

// ==========================================
// 5. ИНТЕГРАЦИЯ УМНЫХ КНОПОК И ДЕТАЛИЗАЦИЯ (V2.0)
// ==========================================

let currentTaskContext = null;

window.rbi_openTaskAction = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('task-details-header-title').innerHTML = `📋 ${task.title}`;
    const body = document.getElementById('task-details-body');
    const footer = document.getElementById('task-details-footer');

    // 1. АНАЛИТИКА: Собираем данные
    const cData = contractorArray.filter(c => c.contractorName === task.contractor && c.templateKey === task.templateKey);
    const m = getContractorMetrics(cData, userTemplates);
    
    let analyticsHtml = '';
    if (m) {
        const defCounts = {}; const okCounts = {};
        cData.forEach(c => {
            if(c.state) {
                Object.keys(c.state).forEach(id => {
                    const flat = getFlatList(userTemplates[c.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[c.templateKey.replace('sys_','')]?.groups);
                    const item = flat.find(x => String(x.id) === String(id));
                    if (item) {
                        if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') defCounts[item.n] = (defCounts[item.n] || 0) + 1;
                        if (c.state[id] === 'ok') okCounts[item.n] = (okCounts[item.n] || 0) + 1;
                    }
                });
            }
        });

        const defectsList = Object.keys(defCounts).sort((a,b) => defCounts[b] - defCounts[a]).slice(0, 3);
        const praiseList = Object.keys(okCounts).sort((a,b) => okCounts[b] - okCounts[a]).slice(0, 3);

        const defHtml = defectsList.length > 0 
            ? defectsList.map(d => `<div class="text-[10px] text-red-800 dark:text-red-300 font-bold border-l-2 border-red-500 pl-2 mb-1">${d}</div>`).join('') 
            : '<div class="text-[10px] text-slate-500">Дефектов не найдено</div>';
            
        const praiseHtml = praiseList.length > 0 
            ? praiseList.map(p => `<div class="text-[10px] text-green-800 dark:text-green-300 font-bold border-l-2 border-green-500 pl-2 mb-1">${p}</div>`).join('') 
            : '<div class="text-[10px] text-slate-500">Пока хвалить не за что</div>';

        analyticsHtml = `
            <div class="grid grid-cols-2 gap-2 mb-2">
                <div class="bg-[var(--hover-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center">
                    <div class="text-[9px] font-black text-slate-400 uppercase">Текущий УрК</div>
                    <div class="text-2xl font-black ${m.finalC < 70 ? 'text-red-500' : (m.finalC < 85 ? 'text-orange-500' : 'text-green-500')}">${m.finalC}%</div>
                </div>
                <div class="bg-[var(--hover-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center">
                    <div class="text-[9px] font-black text-slate-400 uppercase">Аварий B3</div>
                    <div class="text-2xl font-black ${m.n_изделий_с_B3 > 0 ? 'text-red-500' : 'text-green-500'}">${m.n_изделий_с_B3}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                    <div class="text-[10px] font-black text-red-600 uppercase mb-2">🚨 Зоны риска (Системный брак)</div>
                    ${defHtml}
                </div>
                <div class="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-3 rounded-xl">
                    <div class="text-[10px] font-black text-green-600 uppercase mb-2">✅ За что похвалить (Эталоны)</div>
                    ${praiseHtml}
                </div>
            </div>
        `;
    }

    // 2. БЛОК СЦЕНАРИЯ ИИ (Только для Воркшопов)
    let aiWorkshopHtml = '';
    if (task.category === 'dev' || task.title.includes('Воркшоп')) {
        currentTaskContext = task; // Для ИИ-генератора
        aiWorkshopHtml = `
            <div class="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-3 rounded-xl mb-2">
                <div class="flex justify-between items-center mb-2">
                    <div class="text-[10px] font-black text-purple-700 uppercase">🧠 AI-Сценарий Воркшопа</div>
                    <button onclick="rbi_generateTaskScenario()" class="bg-purple-600 text-white px-3 py-1 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm">Сгенерировать</button>
                </div>
                <textarea id="task-ai-scenario" class="hidden w-full h-32 text-[11px] p-2 rounded-lg border border-purple-200 resize-none outline-none leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-slate-800 shadow-inner" placeholder="..."></textarea>
            </div>
        `;
    }

    body.innerHTML = `
        <div class="text-center mb-3">
            <div class="text-[14px] font-black text-slate-800 dark:text-white">${task.contractor}</div>
            <div class="text-[11px] font-bold text-slate-500">${task.templateTitle || task.workTitle}</div>
            <div class="text-[11px] italic text-slate-600 mt-2 bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">${task.prompt}</div>
        </div>
        ${analyticsHtml}
        ${aiWorkshopHtml}
    `;

    // ==========================================
    // 4. КНОПКИ В ПОДВАЛЕ (Ветвление логики)
    // ==========================================
    const safeContractor = task.contractor.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeStatusKeyForHtml = task.statusKey ? task.statusKey.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';

    let actionButtonsHtml = '';

    // Если задача уже закрыта (Архив, Пауза, Отменена)
    if (task.status !== 'pending') {
        let historyHtml = task.history ? `<div class="text-[9px] text-slate-400 mt-2 text-left bg-slate-50 p-2 rounded-lg max-h-20 overflow-y-auto">${task.history.join('<br>')}</div>` : '';
        actionButtonsHtml = `
            <div class="text-[10px] text-slate-500 font-bold mb-2 text-center w-full">Статус: ${task.status.toUpperCase()} ${task.resultComment ? `(${task.resultComment})` : ''}</div>
            ${historyHtml}
            <button onclick="rbi_resumeTask('${task.id}')" class="w-full mt-2 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform border border-slate-300 shadow-sm flex justify-center items-center gap-2">
                🔄 Возобновить задачу для правок
            </button>
        `;
    } else {
        // Задача активна - Ветвление по типам задач

        // А) ЭТАЛОН
        if (task.needsEtalon || task.taskType === 'Эталон') {
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); window.activeTaskId = '${task.id}'; openEtalonConstructor('${safeContractor}', '${task.templateKey}', '${task.workTitle || task.templateTitle}', '${safeStatusKeyForHtml}');" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📐 Снять Эталон
                </button>
            `;
        } 
        // Б) СОВЕЩАНИЯ
        else if (task.category === 'meeting') {
            actionButtonsHtml += `
                <button onclick="rbi_startMeetingTask('${task.id}')" class="w-full bg-orange-500 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📅 Открыть Протокол (Мемо)
                </button>
            `;
        } 
        // В) ВОРКШОП С БРИГАДОЙ (ИИ)
        else if (task.category === 'dev' || task.title.includes('Воркшоп')) {
            actionButtonsHtml += `
                <div class="flex gap-2 mb-2 w-full">
                    <button onclick="rbi_printTaskScenario()" class="w-1/3 bg-white text-purple-700 border border-purple-200 py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm">🖨️ Печать</button>
                    <button onclick="rbi_completeTaskWithPhoto('${task.id}')" class="w-2/3 bg-purple-600 text-white py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center gap-1">✅ Завершить Воркшоп</button>
                </div>
            `;
        } 
        // Г) СПЕЦ. ОТЧЕТ: ДЕНЬ КАЧЕСТВА
        else if (task.id.includes('q_day')) {
            actionButtonsHtml += `
                <button onclick="rbi_generateQualityDayReport('${task.id}')" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📊 Собрать Отчет Руководству (AI)
                </button>
            `;
        }
        // Д) ОБЫЧНЫЙ АУДИТ / ИНСПЕКЦИЯ
        else if (task.category === 'control' && task.templateKey) {
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); window.activeTaskId = '${task.id}'; startInspectionWithValues('${safeContractor}', '${task.templateKey}', '${safeStatusKeyForHtml}', '${task.project}');" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    ▶ Провести инспекцию
                </button>
            `;
        } 
        // Е) ПРОСТАЯ ЗАДАЧА (ВРУЧНУЮ ИЛИ БЕЗ ПЕРЕХОДОВ)
        else {
            actionButtonsHtml += `
                <button onclick="rbi_completeTaskWithPhoto('${task.id}')" class="w-full bg-green-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                    ✅ Отметить выполненной
                </button>
            `;
        }

        // ОБЩИЙ БЛОК УПРАВЛЕНИЯ ЗАДАЧЕЙ (ПЕРЕНОС / ПАУЗА / ОТМЕНА)
        let postponeCountHtml = task.postponeCount > 0 ? `<span class="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black">${task.postponeCount}</span>` : '';
        
        actionButtonsHtml += `
            <div class="grid grid-cols-3 gap-2 w-full mt-2 pt-2 border-t border-[var(--card-border)]">
                <button onclick="rbi_postponeTask('${task.id}')" class="relative flex flex-col justify-center items-center p-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-[9px] uppercase active:scale-95 border border-blue-200">
                    <span class="text-sm mb-0.5">➡️</span> Сдвинуть
                    ${postponeCountHtml}
                </button>
                <button onclick="rbi_pauseTask('${task.id}')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-orange-50 text-orange-700 font-bold text-[9px] uppercase active:scale-95 border border-orange-200">
                    <span class="text-sm mb-0.5">⏸</span> Пауза
                </button>
                <button onclick="rbi_cancelTask('${task.id}')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-red-50 text-red-700 font-bold text-[9px] uppercase active:scale-95 border border-red-200">
                    <span class="text-sm mb-0.5">🚫</span> Отменить
                </button>
            </div>
        `;
    }

    footer.innerHTML = actionButtonsHtml;
    document.getElementById('task-details-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

// Функция переброса в Совещания
window.rbi_startMeetingTask = function(taskId) {
    window.activeTaskId = taskId; // Сохраняем ID, чтобы закрыть при создании мемо
    
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    
    switchTab('tab-engineer');
    setTimeout(() => {
        const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
        if (btns[2]) rbi_switchEngineerSubTab('eng-sub-meetings', btns[2]);
        setTimeout(() => { rbi_createMeeting(); }, 200);
    }, 100);
};

// ГЕНЕРАЦИЯ СЦЕНАРИЯ ИИ
window.rbi_generateTaskScenario = async function() {
    if (!appSettings.aiEnabled) return showToast("Включите AI-ассистента!");
    const t = currentTaskContext;
    const txtArea = document.getElementById('task-ai-scenario');
    txtArea.classList.remove('hidden');
    txtArea.value = "⏳ ИИ пишет сценарий...";

    // Ищем TWI-карту
    const relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(c => c.checklistKey === t.templateKey) : null;
    let twiContext = relatedTwi ? `Упомяни, что мы разберем TWI-инструкцию "${relatedTwi.title}".` : ``;

    const promptSystem = `Ты — старший инженер стройконтроля. Напиши сценарий для жесткой 5-минутной планерки с бригадой (toolbox talk). 
    ЗАПРЕЩЕНО писать про каски, СИЗ и ТБ! Говорим ТОЛЬКО про технологию работ и качество!
    1. 🎯 Цель: [Обозначить проблему качества].
    2. ⚠️ Суть ошибки: [Как они косячат технологически].
    3. 🛠 Как правильно: [Допуски из ГОСТ/СНиП].
    4. 💡 Итог: Мотивация.`;

    try {
        const res = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: `Подрядчик: ${t.contractor}. Работа: ${t.templateTitle}. ${twiContext}` }], { temperature: 0.3, max_tokens: 500 });
        txtArea.value = res;
    } catch (e) {
        txtArea.value = "❌ Ошибка ИИ.";
    }
};

// ЗАГРУЗКА ФОТО ВЫПОЛНЕНИЯ ЗАДАЧИ
window.rbi_handleTaskCompletionPhoto = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast("⚙️ Обработка фото...");
    compressImageToBase64(file, 1000, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'task');
        const box = document.getElementById('task-completion-photo-box');
        box.dataset.photo = localUrl;
        box.innerHTML = `<img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-cover rounded-lg"><div onclick="event.stopPropagation(); document.getElementById('task-completion-photo-box').dataset.photo=''; document.getElementById('task-completion-photo-box').innerHTML='+ Прикрепить фото'" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black">✕</div>`;
        event.target.value = '';
    });
};

// ФИНАЛЬНОЕ ЗАВЕРШЕНИЕ ЗАДАЧИ С ФОТО И СЦЕНАРИЕМ
window.rbi_completeTaskWithPhoto = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;

    const photo = document.getElementById('task-completion-photo-box').dataset.photo;
    const scenario = document.getElementById('task-ai-scenario')?.value;

    task.status = 'done';
    task.completionPhoto = photo || null;
    task.aiScenario = scenario || null;
    task.updatedAt = new Date().toISOString();
    await dbPut(STORES.TASKS, task);
    
    // Записываем в логи, чтобы потом вывести в Эффективности
    if (typeof gameLogAction === 'function') gameLogAction('task_completed_on_time', task.id);

    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    showToast("🏆 Задача успешно закрыта! Опыт начислен.");
    rbi_renderTasksList();
};

// ПЕЧАТЬ ВОРКШОПА И TWI
window.rbi_printTaskScenario = function() {
    const scenario = document.getElementById('task-ai-scenario')?.value;
    if (!scenario || scenario.includes('⏳')) return showToast("Сгенерируйте сценарий!");

    const t = currentTaskContext;
    const relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(c => c.checklistKey === t.templateKey) : null;

    let content = `
        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">Сценарий планерки</h2>
            <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Подрядчик: ${t.contractor} | Вид работ: ${t.templateTitle}</div>
            <div style="font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${scenario}</div>
        </div>
    `;

    if (relatedTwi && relatedTwi.type === 'INSPECTOR') {
        content += `
            <div style="page-break-before: always; margin-top: 20px;">
                <h2 style="font-size: 18px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ</h2>
                <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px;">
                    <tr>
                        <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4;">
                            <h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>
                            ${relatedTwi.photoGood ? `<img src="${window.getPhotoSrc(relatedTwi.photoGood)}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                        </td>
                        <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2;">
                            <h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>
                            ${relatedTwi.photoBad ? `<img src="${window.getPhotoSrc(relatedTwi.photoBad)}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                        </td>
                    </tr>
                </table>
            </div>
        `;
    }

    if (typeof printPdfShell === 'function') {
        printPdfShell(`Воркшоп: ${t.contractor}`, content, "A4", "portrait", "browser");
    }
};
// ГЕНЕРАТОР ВОРКШОПА И TWI
window.rbi_startWorkshopTask = async function(taskId) {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");
    
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if(!task) return;

    // Ищем TWI-карту по этому виду работ
    const relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(c => c.checklistKey === task.templateKey) : null;
    let twiContextText = relatedTwi ? `В базе есть инструкция "${relatedTwi.title}". Упомяни, что рабочие должны с ней ознакомиться.` : `Обучающих карт пока нет, просто дай советы.`;

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-purple-200">🧠</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">AI-Сценарий Воркшопа</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="flex flex-col items-center justify-center py-6">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
            <div class="text-[11px] font-bold text-slate-500 text-center">Генерирую план 5-минутной беседы с бригадой...</div>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

     const defectMatch = task.prompt.match(/Дефект "(.*?)"/);
    const specificDefect = defectMatch ? defectMatch[1] : "Системные нарушения";

    const promptSystem = `Ты — компетентный инженер строительного контроля. Напиши сценарий для жесткой, но конструктивной 5-минутной планерки (toolbox talk) с бригадой строителей. 
    
    ВНИМАНИЕ: СТРОЖАЙШЕ ЗАПРЕЩЕНО говорить про технику безопасности, каски, СИЗ и прочую охрану труда! Твоя тема ТОЛЬКО технология производства работ и КАЧЕСТВО.
    
    Структура ответа:
    1. 🎯 Цель: [1 предложение. Обозначить проблему].
    2. ⚠️ Суть ошибки: [Какие именно проблемы в этом дефекте].
    3. 🛠 Как делать правильно: [2-3 конкретных технологических совета/допуска из СНиП или здравого смысла].
    4. 💡 Итог: Мотивирующая фраза.`;

    const promptUser = `Подрядчик: ${task.contractor}. Вид работ: ${task.templateTitle}. 
    ГЛАВНАЯ ПРОБЛЕМА (Тема воркшопа): ${specificDefect}. 
    Контекст: ${twiContextText}`;

    try {
        const response = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: promptUser }
        ], { temperature: 0.3, max_tokens: 600 });

        // Сохраняем сценарий в глобальную переменную для функции печати
        window.currentWorkshopScript = response;
        window.currentWorkshopTwi = relatedTwi;
        window.currentWorkshopTask = task;

        const formattedResponse = response.replace(/\n/g, '<br>');

        document.getElementById('modal-body').innerHTML = `
            <div class="text-[11px] bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed font-medium mb-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                ${formattedResponse}
            </div>
            ${relatedTwi ? `<div class="text-[10px] bg-green-50 text-green-700 p-2 rounded-lg border border-green-200 font-bold mb-4 flex items-center gap-2"><span>📎</span> Найдена TWI-карта: ${relatedTwi.title} (будет приложена к печати)</div>` : ''}
            <div class="grid grid-cols-2 gap-2">
                <button onclick="rbi_printWorkshop()" class="bg-purple-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex justify-center items-center gap-2">
                    🖨️ В печать (А4)
                </button>
                <button onclick="rbi_markTaskDone('${task.id}'); closeModal();" class="bg-green-50 text-green-600 border border-green-200 py-3 rounded-xl font-black text-[11px] uppercase shadow-sm active:scale-95">
                    ✅ Завершить задачу
                </button>
            </div>
        `;
    } catch (e) {
        closeModal();
        showToast("❌ Ошибка генерации: " + e.message);
    }
};

// Функция печати (Склеиваем AI сценарий и TWI карту в один PDF)
window.rbi_printWorkshop = function() {
    const scriptText = window.currentWorkshopScript.replace(/\n/g, '<br>');
    const task = window.currentWorkshopTask;
    const twi = window.currentWorkshopTwi;

    let content = `
        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid;">
            <h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">Сценарий планерки (Toolbox Talk)</h2>
            <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                Подрядчик: ${task.contractor} | Вид работ: ${task.templateTitle}
            </div>
            <div style="font-size: 14px; line-height: 1.6; color: #1e293b;">
                ${scriptText}
            </div>
        </div>
    `;

    // Если есть привязанная TWI карта (типа ИНСПЕКТОР) - лепим её картинки ниже
    if (twi && twi.type === 'INSPECTOR') {
        let compliance = twi.howToCheck || '';
        content += `
            <div style="page-break-before: always; margin-top: 20px;">
                <h2 style="font-size: 18px; text-align: center; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ${twi.title}</h2>
                <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                    <tr>
                        <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;">
                            <h2 style="color: #166534; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН (ПРАВИЛЬНО)</h2>
                            ${twi.photoGood ? `<div style="height: 200px; overflow: hidden; border-radius: 8px; background: white;"><img src="${window.getPhotoSrc(twi.photoGood)}" style="width: 100%; height: 100%; object-fit: contain;"></div>` : `<div style="height: 200px; line-height: 200px; color: #166534;">Нет фото</div>`}
                        </td>
                        <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;">
                            <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">❌ БРАК (НАРУШЕНИЕ)</h2>
                            ${twi.photoBad ? `<div style="height: 200px; overflow: hidden; border-radius: 8px; background: white;"><img src="${window.getPhotoSrc(twi.photoBad)}" style="width: 100%; height: 100%; object-fit: contain;"></div>` : `<div style="height: 200px; line-height: 200px; color: #991b1b;">Нет фото</div>`}
                        </td>
                    </tr>
                </table>
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #cbd5e1;">
                    <h3 style="color: #0f172a; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;">📏 Критерии:</h3>
                    <p style="font-size: 12px; color: #334155; white-space: pre-wrap; margin: 0;">${compliance}</p>
                </div>
            </div>
        `;
    }

    // Отправляем в наш универсальный генератор из export.js (режим browser для системной печати принтера)
    if (typeof printPdfShell === 'function') {
        printPdfShell(`Материалы к Воркшопу: ${task.contractor}`, content, "A4", "portrait", "browser");
    }
};

// ==========================================
// ЛОГИКА УПРАВЛЕНИЯ СТАТУСАМИ ЗАДАЧ
// ==========================================

window.rbi_resumeTask = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    task.status = 'pending';
    task.resultComment = '';
    
    if(!task.history) task.history = [];
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Задача возобновлена инженером.`);
    task.updatedAt = new Date().toISOString();
    await dbPut(STORES.TASKS, task);
    showToast("🔄 Задача снова активна");
    
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    rbi_renderTasksList();
};

window.rbi_pauseTask = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    task.status = 'paused';
    task.resultComment = 'На паузе';
    
    if(!task.history) task.history = [];
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Поставлена на паузу.`);
    task.updatedAt = new Date().toISOString();
    await dbPut(STORES.TASKS, task);
    showToast("⏸ Задача скрыта в архив (Пауза)");
    
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    rbi_renderTasksList();
};

window.rbi_cancelTask = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    const reason = prompt("Укажите причину досрочной отмены задачи:");
    if (reason === null) return; // Нажал отмену
    if (reason.trim() === "") return showToast("⚠️ Причина обязательна!");

    task.status = 'blocked';
    task.resultComment = `Отменена: ${reason}`;
    
    if(!task.history) task.history = [];
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Отменена: ${reason}`);
    task.updatedAt = new Date().toISOString();
    await dbPut(STORES.TASKS, task);
    showToast("🚫 Задача отменена");
    
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    rbi_renderTasksList();
};

window.rbi_postponeTask = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;

    const days = prompt("На сколько дней перенести задачу? (введите число)", "1");
    if (days === null) return;
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0) return showToast("⚠️ Введите корректное число дней!");

    const oldDateStr = new Date(task.date).toLocaleDateString('ru-RU');
    
    const newDate = new Date(task.date);
    newDate.setDate(newDate.getDate() + daysNum);
    task.date = newDate.toISOString();

    task.postponeCount = (task.postponeCount || 0) + 1;
    
    if(!task.history) task.history = [];
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Перенос с ${oldDateStr} на ${daysNum} дн. (Перенос №${task.postponeCount})`);

    // ЛОГИКА: Если перенесли больше 2 раз - жестко повышаем приоритет до критического
    if (task.postponeCount > 2) {
        task.priorityLvl = 4;
        task.history.unshift(`[СИСТЕМА] Приоритет повышен до критического из-за частых переносов!`);
        showToast("⚠️ Задача переносилась слишком часто. Приоритет повышен до Критического!");
    } else {
        showToast(`➡️ Задача перенесена на ${newDate.toLocaleDateString('ru-RU')}`);
    }
    task.updatedAt = new Date().toISOString();
    await dbPut(STORES.TASKS, task);
    
    document.getElementById('task-details-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    rbi_renderTasksList(); // Перерисовка скроет задачу, если она перенеслась на будущее
};