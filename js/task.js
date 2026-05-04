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

    document.getElementById('manual-task-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.rbi_closeTaskModal = function() {
    document.getElementById('manual-task-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
};

window.rbi_saveManualTask = async function() {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return showToast("В демо-режиме сохранение отключено");
    const title = document.getElementById('manual-task-title').value.trim();
    const typeCat = document.getElementById('manual-task-type').value; 
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
        type: 'manual', 
        category: typeCat,
        icon: iconType,
        contractor: contr || "Служебная",
        project: document.getElementById('inp-project')?.value || "Все",
        templateKey: '', 
        workTitle: 'Поручение',
        title: title, 
        prompt: 'Создано инженером вручную.',
        status: 'pending', 
        priorityLvl: 2, 
        date: tDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false
    };

    window.rbi_tasksData.unshift(newTask);
    if (typeof dbPut === 'function') await dbPut(STORES.TASKS, newTask);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    showToast("✅ Задача добавлена в план!");
    rbi_closeTaskModal();
    rbi_renderTasksList();
};

window.gameForceUpdatePlan = async function() {
    showToast("🧠 ИИ анализирует базу и перестраивает план...");
    await gameGenerateWeeklyPlan(true);
    rbi_renderTasksList();
    
    // Даем команду облаку забрать удаленные задачи
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
};

window.gameGenerateWeeklyPlan = async function(force = false) {
    const currentInspector = document.getElementById('inp-inspector')?.value.trim() || 'Инженер';
    if (!currentInspector) return;

    if (typeof engineerAbsence !== 'undefined' && engineerAbsence.isActive) return;

    const now = new Date();
    const currentWeekId = getWeekId(now);
    const startOfThisWeek = getStartOfWeek(now);

    // ОБНОВЛЕНИЕ ПЛАНА (Чистим старые авто-задачи ТОЛЬКО при ручном нажатии кнопки)
    // Используем мягкое удаление (_deleted = true), чтобы облако стерло их у себя!
    if (force) {
        const tasksToDelete = window.rbi_tasksData.filter(t => t.type === 'auto' && t.status === 'pending');
        for (let t of tasksToDelete) {
            t._deleted = true;
            t.updatedAt = new Date().toISOString();
            if (typeof dbPut === 'function') await dbPut(STORES.TASKS, t);
        }
        window.rbi_tasksData = window.rbi_tasksData.filter(t => !t._deleted);
    }

    let newTasksCount = 0;

    const addTask = (idSuffix, cat, icon, title, workTitle, contractor, prompt, lvl, tDate, tmplKey = '', taskType = '') => {
        const exists = window.rbi_tasksData.find(t => 
            t.title === title && 
            t.contractor === contractor && 
            t.templateKey === tmplKey &&
            (t.status === 'pending' || t.status === 'paused')
        );
        if (exists) return; // Если уже есть активная или на паузе — не плодим клонов!

        const task = {
            id: 'tsk_' + Date.now().toString(36) + idSuffix + Math.floor(Math.random()*1000),
            source: 'ai', type: 'auto', category: cat, icon: icon, taskType: taskType,
            contractor: contractor, project: document.getElementById('inp-project')?.value || "Все",
            templateKey: tmplKey, workTitle: workTitle,
            title: title, prompt: prompt,
            status: 'pending', priorityLvl: lvl, date: tDate.toISOString(),
            target: 1, done: 0, carryOverCount: 0,
            history: [`[${new Date().toLocaleDateString('ru-RU')}] Задача создана системой.`],
            updatedAt: new Date().toISOString()
        };
        window.rbi_tasksData.push(task);
        if (typeof dbPut === 'function') dbPut(STORES.TASKS, task);
        newTasksCount++;
    };

    const allMyChecks = contractorArray.filter(c => c.inspectorName === currentInspector);
    const pairMap = {};
    
    allMyChecks.forEach(c => {
        if (c.templateKey === 'sys_etalon_act') return;
        let key = `${c.projectName}::${c.contractorName}::${c.templateKey}`;
        if (!pairMap[key]) {
            pairMap[key] = { project: c.projectName, contractor: c.contractorName, templateKey: c.templateKey, templateTitle: c.templateTitle, checks: [], allTimeCount: 0, checksThisWeek: 0, lastCheckDate: new Date(0) };
        }
        pairMap[key].checks.push(c);
        pairMap[key].allTimeCount++;
        const cDate = new Date(c.date);
        if (cDate > pairMap[key].lastCheckDate) pairMap[key].lastCheckDate = cDate;
        if (cDate >= startOfThisWeek) pairMap[key].checksThisWeek++;
    });

    for (let key in pairMap) {
        const pair = pairMap[key];
        
        // 1. Создаем спец-задачу "Эталон", если его нет. Она больше не помечает обычные аудиты флагом needsEtalon.
        const hasEtalon = etalonActsArray.some(c => c.contractorName === pair.contractor && c.templateKey === 'sys_etalon_act' && c.templateTitle === pair.templateTitle);
        if (!hasEtalon) {
            addTask('etalon', 'control', 'Эталон', `Приемка Эталона`, pair.templateTitle, pair.contractor, `Отсутствует Акт-Эталон. Перед массовым контролем проведите совместную приемку эталонного узла.`, 4, now, pair.templateKey, 'Эталон');
        }

        const m = pair.allTimeCount > 0 ? getContractorMetrics(pair.checks, userTemplates) : null;
        let requiredChecksPerWeek = 1;
        let promptText = "Плановый поддерживающий контроль (Зеленая зона).";
        let lvl = 1;

        if (pair.allTimeCount === 0) {
            requiredChecksPerWeek = 4; promptText = "Новый этап работ. Проведите первые инспекции."; lvl = 3;
        } else if (pair.allTimeCount < 7) {
            requiredChecksPerWeek = 4; promptText = "Новый подрядчик. Собираем базу для рейтинга надежности. Цель: 7 проверок."; lvl = 3;
        } else if (m && (m.finalC < 70 || m.n_изделий_с_B3 > 0)) {
            requiredChecksPerWeek = 5; promptText = "Красная зона! Обязательный аудит. При наличии B3 - останавливайте работы."; lvl = 4;
        } else if (m && m.finalC >= 70 && m.finalC <= 84) {
            requiredChecksPerWeek = 2; promptText = "Желтая зона. Подрядчик допускает системный брак. Проверьте выполнение предписаний."; lvl = 3;
        }

        const daysSinceLastCheck = pair.lastCheckDate.getTime() > 0 ? (now - pair.lastCheckDate) / (1000 * 60 * 60 * 24) : 0;
        if (pair.allTimeCount > 0 && daysSinceLastCheck > 14) {
            promptText = `⚠️ ПОДРЯДЧИК ЗАБРОШЕН! Последняя проверка была ${Math.floor(daysSinceLastCheck)} дней назад. Срочно проведите аудит.`;
            lvl = 4;
            requiredChecksPerWeek = Math.max(requiredChecksPerWeek, 2);
        }

        // Считаем, сколько задач мы уже поставили на паузу по этому подрядчику
        const pausedTasksCount = window.rbi_tasksData.filter(t => 
            t.contractor === pair.contractor && 
            t.templateKey === pair.templateKey && 
            t.status === 'paused'
        ).length;

        // Вычитаем задачи на паузе из плана, чтобы ИИ успокоился и не требовал их снова
        const deficit = requiredChecksPerWeek - pair.checksThisWeek - pausedTasksCount;
        
        if (deficit > 0) {
            for (let i = 0; i < deficit; i++) {
                let taskDate = new Date(now);
                if (daysSinceLastCheck > 14) { taskDate.setDate(now.getDate() - 1); } 
                else { taskDate.setDate(now.getDate() + i); } 
                
                // Создаем ОБЫЧНУЮ задачу аудита.
                addTask(`aud_${i}`, 'control', 'Контроль', `Инспекция: ${pair.contractor}`, pair.templateTitle, pair.contractor, promptText, lvl, taskDate, pair.templateKey, 'Аудит');
            }
        }

        if (m) {
            if (m.n_изделий_с_B3 > 2) addTask('def_meet', 'meeting', 'Совещание', `Разбор критического брака`, pair.templateTitle, pair.contractor, `Зафиксировано ${m.n_изделий_с_B3} дефектов B3. Срочно соберите штаб.`, 4, now, pair.templateKey, 'Совещание');
            if (m.maxFailRate >= 20 && pair.allTimeCount >= 5) {
                addTask('workshop', 'dev', 'Развитие', `Воркшоп с бригадой`, pair.templateTitle, pair.contractor, `Системный брак B2 повторяется часто. Проведите обучение на объекте.`, 3, now, pair.templateKey, 'Воркшоп');
            }
        }
    }

    // --- ЛОГИКА 2: РУТИНА И ОТЧЕТНОСТЬ (Будущие даты) ---
    const getNextTargetDate = (targetDayNumStr) => {
        const targetDay = parseInt(targetDayNumStr) === 0 ? 7 : parseInt(targetDayNumStr);
        const d = new Date(now);
        const currentDay = d.getDay() === 0 ? 7 : d.getDay();
        let diff = targetDay - currentDay;
        if (diff < 0) diff += 7; 
        d.setDate(d.getDate() + diff);
        d.setHours(12, 0, 0, 0);
        return d;
    };

    const fmeaDate = getNextTargetDate(appSettings.taskFmeaDay || '5');
    addTask('fmea_w', 'method', 'ППР', 'Заполнить FMEA таблицу', 'Аналитика', 'Системная', 'Позвольте ИИ проанализировать коренные причины брака.', 3, fmeaDate, '', 'Отчет');
    
    const posterDate = getNextTargetDate(appSettings.taskFmeaDay || '5'); 
    addTask('post_w', 'report', 'Отчет', 'Распечатать Плакат качества', 'Отчетность', 'Системная', 'Сформируйте плакат А3 и повесьте в штабе подрядчиков.', 2, posterDate, '', 'Отчет');

    const meetingDate = getNextTargetDate(appSettings.taskMeetingDay || '1');
    addTask('meet_w', 'meeting', 'Совещание', 'Еженедельный разбор качества', 'Коммуникация', 'Системная', 'Откройте вкладку Совещания. Система уже собрала повестку.', 4, meetingDate, '', 'Совещание');

    const reportDay = parseInt(appSettings.taskMonthReportDay || '1');
    const monthlyReportDate = new Date(now.getFullYear(), now.getMonth(), reportDay, 12, 0, 0, 0);
    if (now > monthlyReportDate) monthlyReportDate.setMonth(monthlyReportDate.getMonth() + 1);
    addTask('op_m', 'report', 'Отчет', 'Ежемесячный One-Pager', 'Отчетность', 'Системная', 'Отправьте руководителю выгрузку Сводного статуса.', 3, monthlyReportDate, '', 'Отчет');
    
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let qDayDate = new Date(now.getFullYear(), now.getMonth(), daysInMonth - 2, 12, 0, 0, 0);
    if (now > qDayDate) {
        const daysInNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
        qDayDate = new Date(now.getFullYear(), now.getMonth() + 1, daysInNextMonth - 2, 12, 0, 0, 0);
    }
    addTask('qd_m', 'report', 'Отчет', 'Отчет: День Качества', 'Аналитика', 'Системная', 'Приближается дата Дня Качества. Система сгенерирует мега-отчет за месяц.', 4, qDayDate, '', 'Отчет');

    weeklyPlanData = { weekId: currentWeekId, tasks: window.rbi_tasksData, completed: false };
    if (typeof saveWeeklyPlan === 'function') saveWeeklyPlan();

    if (force) showToast(`✅ План актуализирован!`);
};

// ==========================================
// 3. UI РЕНДЕР: Вкладка "Задачи"
// ==========================================
window.rbi_renderTasksList = async function() {
    const container = document.getElementById('rbi-tasks-container');
    if (!container) return;

    const activeTasks = window.rbi_tasksData;

    const today = new Date(); 
    today.setHours(0,0,0,0);
    const startW = getStartOfWeek(today);
    const endW = new Date(startW); endW.setDate(startW.getDate() + 6); endW.setHours(23,59,59,999);
    
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

        if (t.status === 'done' || t.status === 'blocked') {
            archiveTasks.push(t);
            if (t.status === 'done') { weekTotal++; weekDone++; }
            return; 
        }
        
        // Если задача на паузе, отправляем её в нижний блок (Будущие задачи)
        if (t.status === 'paused') {
            monthTasks.push(t);
            weekTotal++;
            return;
        }
        
        const tDate = t.date ? new Date(t.date) : new Date();
        tDate.setHours(0,0,0,0);
        
        if (tDate.getTime() < today.getTime()) { overdue.push(t); weekTotal++; } 
        else if (tDate.getTime() === today.getTime()) { todayTasks.push(t); weekTotal++; } 
        else if (tDate.getTime() > today.getTime() && tDate.getTime() <= endW.getTime()) { weekTasks.push(t); weekTotal++; } 
        else if (tDate.getTime() > endW.getTime()) { monthTasks.push(t); weekTotal++; }
    });

    const progText = document.getElementById('rbi-tasks-progress-text');
    const progBar = document.getElementById('rbi-tasks-progress-bar');
    if (progText) progText.innerText = `${weekDone}/${weekTotal}`;
    if (progBar) progBar.style.width = weekTotal > 0 ? `${(weekDone/weekTotal)*100}%` : '0%';

    const renderCard = (t, isOverdue, isArchive = false) => {
        const icon = t.icon ? (RBI_TASK_ICONS[t.icon] || RBI_TASK_ICONS['Контроль']) : RBI_TASK_ICONS['Контроль'];
        const dateStr = t.date ? new Date(t.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'}) : 'Без даты';
        const dateTag = isOverdue ? `<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-sm">Проср: ${dateStr}</span>` : `<span class="text-[10px] text-slate-400 font-bold">${dateStr}</span>`;
        
        let borderClass = isOverdue ? 'border-red-400 shadow-md' : 'border-[var(--card-border)] shadow-sm';
        let opacityClass = isArchive ? 'opacity-60 grayscale' : '';
        
        let priorityColor = 'text-green-600 bg-green-50 border-green-200';
        if (t.priorityLvl === 4) priorityColor = 'text-red-600 bg-red-50 border-red-200';
        if (t.priorityLvl === 3) priorityColor = 'text-orange-600 bg-orange-50 border-orange-200';

        let statusBadge = '';
        if (isArchive) {
            if (t.status === 'done') statusBadge = '<div class="absolute top-2 right-2 text-green-600 font-black text-[10px] uppercase bg-green-50 px-2 py-1 rounded border border-green-200">✅ Выполнено</div>';
            if (t.status === 'blocked') statusBadge = '<div class="absolute top-2 right-2 text-red-600 font-black text-[10px] uppercase bg-red-50 px-2 py-1 rounded border border-red-200">🚧 Отменено</div>';
        }

        let progressHtml = '';
        if (t.target > 1) {
            const isDone = t.done >= t.target;
            progressHtml = `<div class="text-[10px] font-black ${isDone ? 'text-green-600' : 'text-indigo-600'} bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">${t.done} / ${t.target}</div>`;
        }

        return `
        <div data-category="${t.category || 'other'}" onclick="rbi_openTaskAction('${t.id}')" class="task-card-item cursor-pointer w-full bg-[var(--card-bg)] border ${borderClass} rounded-xl p-3 flex flex-col gap-2 relative transition-transform active:scale-[0.98] hover:border-indigo-300 ${opacityClass}">
            ${isOverdue && !isArchive ? '<div class="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-xl"></div>' : ''}
            ${statusBadge}
            <div class="flex items-center gap-2 mb-1 min-w-0 pr-2">
                <div class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] flex items-center justify-center border border-[var(--card-border)] shrink-0">${icon}</div>
                <div class="min-w-0 flex-1">
                    <div class="text-[12px] font-black text-slate-800 dark:text-white leading-tight truncate">${t.contractor}</div>
                    <div class="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 truncate">${t.title}</div>
                </div>
                ${progressHtml}
            </div>
            <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-snug mb-1 line-clamp-2">${t.prompt}</div>
            <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
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
    
    const activeToday = [...overdue.map(t => renderCard(t, true)), ...todayTasks.map(t => renderCard(t, false))];

    if (activeToday.length > 0) accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden" open><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-indigo-600 uppercase tracking-widest">📌 СЕГОДНЯ И ПРОСРОЧЕНО (${activeToday.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-2">${activeToday.join('')}</div></details>`;
    if (weekTasks.length > 0) accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-600 uppercase tracking-widest">🔜 ДО КОНЦА НЕДЕЛИ (${weekTasks.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-2">${weekTasks.map(t => renderCard(t, false)).join('')}</div></details>`;
    if (monthTasks.length > 0) accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-500 uppercase tracking-widest">🗓 БУДУЩИЕ ЗАДАЧИ (${monthTasks.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-2">${monthTasks.map(t => renderCard(t, false)).join('')}</div></details>`;
    
    if (archiveTasks.length > 0) {
        const recentArchive = archiveTasks.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        accordionsHtml += `<details class="mb-3 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">✅ ВЫПОЛНЕНО И ЗАКРЫТО (${archiveTasks.length})</span><span class="text-slate-400 group-open:rotate-180">▼</span></summary><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-2">${recentArchive.map(t => renderCard(t, false, true)).join('')}</div></details>`;
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
// 4. ДЕТАЛИЗАЦИЯ И УПРАВЛЕНИЕ СТАТУСАМИ
// ==========================================
let currentTaskContext = null;

window.rbi_openTaskAction = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('task-details-header-title').innerHTML = `📋 ${task.title}`;
    const body = document.getElementById('task-details-body');
    const footer = document.getElementById('task-details-footer');

    // АНАЛИТИКА: Собираем данные
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

    let aiWorkshopHtml = '';
    // Мы убрали дублирующий верхний блок воркшопа

    let logicTitle = ""; let logicColor = ""; let logicDesc = "";
    if (task.priorityLvl === 4) {
        logicTitle = "Критический риск"; logicColor = "text-red-600 bg-red-50 border-red-200";
        logicDesc = "Подрядчик в красной зоне или допустил B3.";
    } else if (task.priorityLvl === 3) {
        logicTitle = "Внимание (Меры)"; logicColor = "text-blue-600 bg-blue-50 border-blue-200";
        logicDesc = "Требуется проведение рутинного мероприятия или сбор данных.";
    } else if (task.priorityLvl === 2) {
        logicTitle = "Желтая зона"; logicColor = "text-orange-600 bg-orange-50 border-orange-200";
        logicDesc = "Системный брак B2. Умеренный контроль.";
    } else {
        logicTitle = "Зеленая зона"; logicColor = "text-green-600 bg-green-50 border-green-200";
        logicDesc = "Высокое качество. Профилактика.";
    }

    body.innerHTML = `
        <div class="text-center mb-3">
            <div class="text-[14px] font-black text-slate-800 dark:text-white">${task.contractor}</div>
            <div class="text-[11px] font-bold text-slate-500">${task.templateTitle || task.workTitle}</div>
            <div class="text-[11px] italic text-slate-600 mt-2 bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">${task.prompt}</div>
        </div>
        ${analyticsHtml}
        ${aiWorkshopHtml}
        <div class="border border-[var(--card-border)] rounded-xl p-3 mb-4">
            <div class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Обоснование системы</div>
            <div class="text-[10px] font-black px-2 py-1 rounded border uppercase w-fit mb-2 ${logicColor}">${logicTitle}</div>
            <div class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">${logicDesc}</div>
        </div>
    `;

    const safeContractor = task.contractor.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeStatusKeyForHtml = task.statusKey ? task.statusKey.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';

    let actionButtonsHtml = '';

    if (task.status !== 'pending') {
        let historyHtml = task.history ? `<div class="text-[9px] text-slate-400 mt-2 text-left bg-slate-50 p-2 rounded-lg max-h-20 overflow-y-auto">${task.history.join('<br>')}</div>` : '';
        actionButtonsHtml = `
            <div class="text-[10px] text-slate-500 font-bold mb-2 text-center w-full">Статус: ${task.status.toUpperCase()} ${task.resultComment ? `(${task.resultComment})` : ''}</div>
            ${historyHtml}
            <button onclick="rbi_resumeTask('${task.id}')" class="w-full mt-2 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform border border-slate-300 shadow-sm flex justify-center items-center gap-2">
                🔄 Возобновить задачу
            </button>
        `;
    } else {
        // === РОУТИНГ КНОПОК ПО ТИПАМ ЗАДАЧ ===
        if (task.type === 'manual') {
            // РУЧНЫЕ ЗАДАЧИ С ФОТОФИКСАЦИЕЙ
            let photoPreviewHtml = task.completionPhoto 
                ? `<div class="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm"><img src="${window.getPhotoSrc(task.completionPhoto)}" class="w-full h-full object-cover"></div>` 
                : `<div id="task-photo-preview" class="hidden mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div>`;
                
            actionButtonsHtml += `
                <div class="mb-3">
                    <button onclick="document.getElementById('task-photo-upload').click(); window.currentTaskPhotoId='${task.id}';" class="w-full bg-indigo-50 dark:bg-slate-800 border border-dashed border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2">
                        📸 Прикрепить фото (День Качества)
                    </button>
                    ${photoPreviewHtml}
                </div>
                <button onclick="rbi_markTaskDone('${task.id}');" class="w-full bg-green-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                    ✅ Отметить выполненной
                </button>`;
        }
        if (task.title.includes('Вводный инструктаж')) {
            // 1. ВВОДНЫЙ ИНСТРУКТАЖ (Сборка регламентов и TWI)
            actionButtonsHtml += `
                <div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-xl mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-[10px] font-black text-blue-700 uppercase">🧠 Подготовка материалов</div>
                        <button onclick="rbi_generateIntroBriefing('${task.id}')" id="btn-gen-intro" class="bg-blue-600 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm">Собрать базу (AI)</button>
                    </div>
                    <div id="intro-result-box" class="hidden">
                        <div class="text-[10px] text-blue-800 dark:text-blue-300 mb-2 font-medium">Система сформировала речь, собрала допуски и подтянула TWI-карты. Вы можете скачать PDF для выдачи подрядчику.</div>
                        <div class="flex gap-2 mb-2">
                            <button onclick="rbi_printIntroBriefing('${task.id}')" class="w-1/2 bg-white text-blue-700 border border-blue-200 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm">🖨️ В PDF</button>
                            <button onclick="rbi_markTaskDone('${task.id}');" class="w-1/2 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-md">✅ Проведено</button>
                        </div>
                    </div>
                </div>`;
        }
        else if (task.title.includes('Финальная приемка')) {
            // 2. ФИНАЛЬНАЯ ПРИЕМКА (Анализ перед КС-2)
            actionButtonsHtml += `
                <div class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-3 rounded-xl mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">📑 Справка для КС-2</div>
                        <button onclick="rbi_generateFinalAcceptance('${task.id}')" id="btn-gen-final" class="bg-slate-700 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm">Анализ (AI)</button>
                    </div>
                    <div id="final-result-box" class="hidden">
                        <textarea id="final-ai-text" class="w-full h-40 text-[11px] p-2 rounded-lg border border-slate-300 dark:border-slate-600 resize-none outline-none leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-slate-900 shadow-inner mb-2" placeholder="Здесь будет справка..."></textarea>
                        <div class="flex gap-2">
                            <button onclick="rbi_printFinalAcceptance('${task.id}')" class="w-1/2 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-500 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm">🖨️ Скачать</button>
                            <button onclick="rbi_saveFinalAndClose('${task.id}')" class="w-1/2 bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-md">💾 Сохранить</button>
                        </div>
                    </div>
                </div>`;
        }
        else if (task.category === 'dev' || task.title.includes('Воркшоп')) {
            // 3. ВОРКШОП С БРИГАДОЙ (С фотофиксацией факта проведения)
            actionButtonsHtml += `
                <div class="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-3 rounded-xl mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-[10px] font-black text-purple-700 uppercase">🧠 AI-Сценарий Воркшопа</div>
                        <button onclick="rbi_generateWorkshop('${task.id}')" id="btn-gen-workshop" class="bg-purple-600 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm">Сгенерировать</button>
                    </div>
                    <textarea id="workshop-ai-scenario" class="hidden w-full h-32 text-[11px] p-2 rounded-lg border border-purple-200 resize-none outline-none leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-slate-800 shadow-inner mb-2" placeholder="..."></textarea>
                    
                    <div id="workshop-actions" class="hidden">
                        <div class="mb-3">
                            <button onclick="document.getElementById('task-photo-upload').click(); window.currentTaskPhotoId='${task.id}';" class="w-full bg-white dark:bg-slate-800 border border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2">
                                📸 Добавить фото (для отчета)
                            </button>
                            <div id="task-photo-preview" class="hidden mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="rbi_printWorkshop('${task.id}', 'script')" class="w-1/2 bg-white text-purple-700 border border-purple-200 py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm">📥 PDF</button>
                            <button onclick="rbi_printWorkshop('${task.id}', 'browser')" class="w-1/2 bg-white text-purple-700 border border-purple-200 py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm">🖨️ Печать</button>
                            <button onclick="rbi_finishWorkshop('${task.id}')" class="w-1/2 bg-purple-600 text-white py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center">✅ Завершить</button>
                        </div>
                    </div>
                </div>`;
        } 
        else if (task.taskType === 'Эталон' || task.icon === 'Эталон' || task.title.includes('Эталон')) {
            // ЭТАЛОН
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); window.activeTaskId = '${task.id}'; openEtalonConstructor('${safeContractor}', '${task.templateKey}', '${task.workTitle || task.templateTitle}', '${safeStatusKeyForHtml}');" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📐 Снять Эталон
                </button>`;
        } 
        else if (task.category === 'meeting' && !task.title.includes('Воркшоп')) {
            // СОВЕЩАНИЯ (Презентация для экрана + Протокол)
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); rbi_openReportSettingsModal('full_report', 'browser', '${task.id}', false);" class="w-full bg-blue-50 text-blue-700 border border-blue-200 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📊 1. Подготовить отчет (PDF)
                </button>
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); rbi_openMeetingSetupModal('${task.id}');" class="w-full bg-orange-500 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📅 2. Открыть Протокол (Мемо)
                </button>
                <div class="text-[9px] text-slate-500 text-center mb-2 leading-tight">Сначала скачайте отчет для вывода на экран, затем проведите встречу и зафиксируйте протокол.</div>`;
        } 
        else if (task.id.includes('q_day') || task.title.includes('День Качества')) {
            // ДЕНЬ КАЧЕСТВА
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); rbi_openQualityDaySettings('${task.id}');" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📊 Собрать Отчет (AI)
                </button>`;
        } 
        else if (task.title.includes('Плакат')) {
            // 5. ПЛАКАТ КАЧЕСТВА (Вызов модалки настроек с флагом закрытия задачи = true)
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); rbi_openReportSettingsModal('poster', 'browser', '${task.id}', true);" class="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    🖨️ Сгенерировать Плакат
                </button>`;
        } 
        else if (task.title.includes('One-Pager')) {
            // 6. ONE-PAGER (Вызов модалки настроек с флагом закрытия задачи = true)
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); rbi_openReportSettingsModal('global_onepager', 'script', '${task.id}', true);" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    📄 Скачать One-Pager
                </button>`;
        }
        else if (task.title.includes('FMEA')) {
            // FMEA АНАЛИЗ
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); switchTab('tab-engineer'); setTimeout(() => { const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn'); if (btns[4]) rbi_switchEngineerSubTab('eng-sub-fmea', btns[4]); rbi_markTaskDone('${task.id}', true); }, 300);" class="w-full bg-slate-700 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    🔍 Перейти к FMEA
                </button>`;
        } 
        else if (task.category === 'control' && task.templateKey) {
            // ИНСПЕКЦИИ (Старт, Плановая)
            actionButtonsHtml += `
                <button onclick="document.getElementById('task-details-modal').style.display='none'; document.body.classList.remove('modal-open'); window.activeTaskId = '${task.id}'; startInspectionWithValues('${safeContractor}', '${task.templateKey}', '${safeStatusKeyForHtml}', '${task.project}');" class="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2">
                    ▶ Провести инспекцию
                </button>`;
        } 
        
        // Блок нижних кнопок управления задачей (Сдвинуть, Пауза, Отменить)
        let postponeCountHtml = task.postponeCount > 0 ? `<span class="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black">${task.postponeCount}</span>` : '';
        actionButtonsHtml += `
            <div class="grid grid-cols-3 gap-2 w-full mt-2 pt-2 border-t border-[var(--card-border)]">
                <button onclick="rbi_postponeTask('${task.id}')" class="relative flex flex-col justify-center items-center p-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-[9px] uppercase active:scale-95 border border-blue-200"><span class="text-sm mb-0.5">➡️</span> Сдвинуть${postponeCountHtml}</button>
                <button onclick="rbi_pauseTask('${task.id}')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-orange-50 text-orange-700 font-bold text-[9px] uppercase active:scale-95 border border-orange-200"><span class="text-sm mb-0.5">⏸</span> Пауза</button>
                <button onclick="rbi_cancelTask('${task.id}')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-red-50 text-red-700 font-bold text-[9px] uppercase active:scale-95 border border-red-200"><span class="text-sm mb-0.5">🚫</span> Отменить</button>
            </div>
        `;
    }

    footer.innerHTML = actionButtonsHtml;
    document.getElementById('task-details-modal').style.display = 'flex';
    document.body.classList.add('modal-open');
};

// ==========================================
// ИНТЕГРАЦИЯ УМНЫХ КНОПОК ИЗ КАРТОЧЕК ЗАДАЧ
// ==========================================

// Фоновая отметка задачи выполненной (без модалок)
// Фоновая отметка задачи выполненной (без модалок)
window.rbi_markTaskDone = async function(taskId, silent = false) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if(task) {
        task.status = 'done';
        task.resultComment = 'Выполнено из быстрого действия';
        task.updatedAt = new Date().toISOString();
        if (typeof dbPut === 'function') await dbPut(STORES.TASKS, task);
        
        // ЖЕСТКО ЗАКРЫВАЕМ МОДАЛКУ, ЧТОБЫ НЕ ЗАВИСАЛИ КНОПКИ
        document.getElementById('task-details-modal').style.display = 'none';
        document.body.classList.remove('modal-open');

        if (!silent) {
            showToast("✅ Задача выполнена!");
            rbi_renderTasksList();
        }
    }
};

// ==========================================
// 5. ФУНКЦИИ СТАТУСОВ (ПЕРЕНОС И ПР.)
// ==========================================
// ==========================================
// 5. ФУНКЦИИ СТАТУСОВ (ПЕРЕНОС И ПР.)
// ==========================================
window.rbi_resumeTask = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    task.status = 'pending'; task.resultComment = '';
    if(!task.history) task.history = [];
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Возобновлена инженером.`);
    task.updatedAt = new Date().toISOString();
    if (typeof dbPut === 'function') await dbPut(STORES.TASKS, task);
    showToast("🔄 Задача снова активна");
    
    // ИСПРАВЛЕНИЕ: Жестко закрываем окно
    document.getElementById('task-details-modal').style.display = 'none'; 
    document.body.classList.remove('modal-open');
    rbi_renderTasksList();
};

window.rbi_pauseTask = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    const reason = prompt("Укажите причину паузы:");
    if (reason === null) return; 
    if (reason.trim() === "") return showToast("⚠️ Причина обязательна!");

    task.status = 'paused'; task.resultComment = `На паузе: ${reason}`;
    if(!task.history) task.history = [];
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Пауза: ${reason}`);
    task.updatedAt = new Date().toISOString();
    
    if (typeof dbPut === 'function') await dbPut(STORES.TASKS, task);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    
    showToast("⏸ Задача скрыта в архив (Пауза)");
    document.getElementById('task-details-modal').style.display = 'none'; 
    document.body.classList.remove('modal-open');
    rbi_renderTasksList();
};

window.rbi_cancelTask = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    const reason = prompt("Укажите причину отмены задачи:");
    if (reason === null) return; 
    if (reason.trim() === "") return showToast("⚠️ Причина обязательна!");

    task.status = 'blocked'; task.resultComment = `Отменена: ${reason}`;
    if(!task.history) task.history = [];
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Отменена: ${reason}`);
    task.updatedAt = new Date().toISOString();
    
    if (typeof dbPut === 'function') await dbPut(STORES.TASKS, task);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    
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
    task.history.unshift(`[${new Date().toLocaleDateString('ru-RU')}] Перенос с ${oldDateStr} на ${daysNum} дн.`);

    if (task.postponeCount > 2) {
        task.priorityLvl = 4;
        task.history.unshift(`[СИСТЕМА] Приоритет повышен до критического из-за частых переносов!`);
        showToast("⚠️ Приоритет повышен до Критического!");
    } else {
        showToast(`➡️ Задача перенесена на ${newDate.toLocaleDateString('ru-RU')}`);
    }
    task.updatedAt = new Date().toISOString();
    
    if (typeof dbPut === 'function') await dbPut(STORES.TASKS, task);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    
    document.getElementById('task-details-modal').style.display = 'none'; 
    document.body.classList.remove('modal-open');
    rbi_renderTasksList(); 
};

// ==========================================
// 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ИИ В ЗАДАЧАХ
// ==========================================
window.rbi_generateTaskScenario = async function() {
    if (!appSettings.aiEnabled) return showToast("Включите AI-ассистента!");
    const t = currentTaskContext;
    const txtArea = document.getElementById('task-ai-scenario');
    txtArea.classList.remove('hidden');
    txtArea.value = "⏳ ИИ пишет сценарий...";

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
    } catch (e) { txtArea.value = "❌ Ошибка ИИ."; }
};

window.rbi_printTaskScenario = function() {
    const scenario = document.getElementById('task-ai-scenario')?.value;
    if (!scenario || scenario.includes('⏳')) return showToast("Сгенерируйте сценарий!");
    const t = currentTaskContext;
    const relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(c => c.checklistKey === t.templateKey) : null;

    let content = `
        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">Сценарий планерки (Toolbox Talk)</h2>
            <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Подрядчик: ${t.contractor} | Вид работ: ${t.templateTitle}</div>
            <div style="font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${scenario.replace(/\n/g, '<br>')}</div>
        </div>
    `;

    if (relatedTwi && relatedTwi.type === 'INSPECTOR') {
        content += `
            <div style="page-break-before: always; margin-top: 20px;">
                <h2 style="font-size: 18px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ${relatedTwi.title}</h2>
                <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                    <tr>
                        <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;">
                            <h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>
                            ${relatedTwi.photoGood ? `<img src="${window.getPhotoSrc(relatedTwi.photoGood)}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                        </td>
                        <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;">
                            <h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>
                            ${relatedTwi.photoBad ? `<img src="${window.getPhotoSrc(relatedTwi.photoBad)}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                        </td>
                    </tr>
                </table>
            </div>
        `;
    }
    if (typeof printPdfShell === 'function') printPdfShell(`Воркшоп: ${t.contractor}`, content, "A4", "portrait", "browser");
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

window.rbi_printIntroBriefing = function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task || !task.aiData) return showToast("Сначала сгенерируйте данные!");

    // Собираем таблицу требований
    const tableRows = task.aiData.checklist.map((item, idx) => `
        <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:center;">${idx + 1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight:bold;">${item.n}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; color:#475569;">${item.t.replace(/<br>/g, ' ')}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:center; font-weight:bold; color:${item.w===3?'#dc2626':'#0f172a'}">B${item.w}</td>
        </tr>
    `).join('');

    // Ищем TWI карты, привязанные к этому виду работ
    const linkedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.filter(c => c.checklistKey === task.templateKey && c.type === 'INSPECTOR') : [];
    
    let twiHtml = '';
    linkedTwi.forEach(card => {
        twiHtml += `
            <div style="page-break-before: always; margin-top: 20px;">
                <h2 style="font-size: 16px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ${card.title}</h2>
                <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                    <tr>
                        <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;">
                            <h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>
                            ${card.photoGood ? `<div style="height: 200px; background: white;"><img src="${window.getPhotoSrc(card.photoGood)}" style="width: 100%; height: 100%; object-fit: contain;"></div>` : `Нет фото`}
                        </td>
                        <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;">
                            <h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>
                            ${card.photoBad ? `<div style="height: 200px; background: white;"><img src="${window.getPhotoSrc(card.photoBad)}" style="width: 100%; height: 100%; object-fit: contain;"></div>` : `Нет фото`}
                        </td>
                    </tr>
                </table>
            </div>
        `;
    });

    const content = `
        <div style="text-align:center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase;">Памятка Подрядчика</h1>
            <div style="font-size: 14px; color: #4f46e5; font-weight: bold; margin-top: 5px;">${task.contractor} | ${task.templateTitle}</div>
        </div>
        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #0f172a;">Вводный инструктаж инженера</h3>
            <div style="font-size: 12px; line-height: 1.6;">${task.aiData.speech.replace(/\n/g, '<br>')}</div>
        </div>
        <h3 style="color: #0f172a; text-transform: uppercase;">Требования к качеству и допуски</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px;">
            <thead style="background-color: #e2e8f0;">
                <tr>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; width: 5%;">#</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; width: 35%;">Параметр контроля</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; width: 50%;">Допуск / Норматив</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; width: 10%;">Риск</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
        ${twiHtml}
    `;

    if (typeof printPdfShell === 'function') printPdfShell(`Инструктаж ${task.contractor}`, content, "A4", "portrait", "browser");
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

window.rbi_saveFinalAndClose = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    const text = document.getElementById('final-ai-text').value;
    task.aiData = { finalReport: text };
    
    task.status = 'done';
    task.resultComment = 'Справка КС-2 сохранена';
    task.updatedAt = new Date().toISOString();
    
    await dbPut(STORES.TASKS, task);
    document.getElementById('task-details-modal').style.display='none'; 
    document.body.classList.remove('modal-open');
    showToast("✅ Задача финальной приемки закрыта!");
    rbi_renderTasksList();
};

window.rbi_printFinalAcceptance = function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    const text = document.getElementById('final-ai-text').value;
    
    const content = `
        <div style="text-align:center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase;">Справка о качестве СМР (для КС-2)</h1>
            <div style="font-size: 14px; color: #4f46e5; font-weight: bold; margin-top: 5px;">${task.contractor} | ${task.templateTitle}</div>
        </div>
        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px;">
            <h3 style="margin-top: 0; color: #0f172a;">Резолюция Инженера Технадзора</h3>
            <div style="font-size: 12px; line-height: 1.6; white-space: pre-wrap;">${text}</div>
        </div>
        <div style="margin-top: 50px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr>
                    <td style="width: 50%; text-align: center; border-top: 1px solid #000; padding-top: 5px; margin-right:20px;">Подпись инженера</td>
                    <td style="width: 10%;"></td>
                    <td style="width: 40%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">Дата</td>
                </tr>
            </table>
        </div>
    `;

    if (typeof printPdfShell === 'function') printPdfShell(`КС-2: ${task.contractor}`, content, "A4", "portrait", "browser");
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

window.rbi_handleTaskCompletionPhoto = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast("⚙️ Прикрепляю фото факта проведения...");
    compressImageToBase64(file, 1000, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'task');
        
        const taskId = window.currentTaskPhotoId;
        const task = window.rbi_tasksData.find(t => t.id === taskId);
        if (task) {
            task.completionPhoto = localUrl;
            await dbPut(STORES.TASKS, task);
        }

        const box = document.getElementById('task-photo-preview');
        box.dataset.photo = localUrl;
        box.classList.remove('hidden');
        box.innerHTML = `<img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-cover"><div onclick="event.stopPropagation(); document.getElementById('task-photo-preview').dataset.photo=''; document.getElementById('task-photo-preview').classList.add('hidden');" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black shadow-md cursor-pointer">✕</div>`;
        event.target.value = '';
    });
};

window.rbi_printWorkshop = function(taskId, mode = 'browser') {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    const scenario = document.getElementById('workshop-ai-scenario')?.value;
    if (!scenario || scenario.includes('⏳')) return showToast("Сгенерируйте сценарий!");
    
    const relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(c => c.checklistKey === task.templateKey) : null;

    let content = `
        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">Сценарий планерки (Toolbox Talk)</h2>
            <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Подрядчик: ${task.contractor} | Вид работ: ${task.templateTitle}</div>
            <div style="font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${scenario.replace(/\n/g, '<br>')}</div>
        </div>
    `;

    if (relatedTwi && relatedTwi.type === 'INSPECTOR') {
        content += `
            <div style="page-break-before: always; margin-top: 20px;">
                <h2 style="font-size: 18px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ${relatedTwi.title}</h2>
                <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                    <tr>
                        <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;">
                            <h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>
                            ${relatedTwi.photoGood ? `<img src="${window.getPhotoSrc(relatedTwi.photoGood)}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                        </td>
                        <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;">
                            <h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>
                            ${relatedTwi.photoBad ? `<img src="${window.getPhotoSrc(relatedTwi.photoBad)}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                        </td>
                    </tr>
                </table>
            </div>
        `;
    }
    if (typeof printPdfShell === 'function') printPdfShell(`Воркшоп: ${task.contractor}`, content, "A4", "portrait", mode);
};

window.rbi_finishWorkshop = async function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    // Передаем данные об обучении (Impact Score) - в реальности запишем интервенцию
    const myName = document.getElementById('inp-inspector')?.value.trim();
    if (typeof window.rbi_interventionsData !== 'undefined') {
        const item = {
            id: 'int_' + Date.now().toString(36),
            date: new Date().toISOString(),
            inspector: myName,
            contractor: task.contractor,
            templateKey: task.templateKey,
            templateTitle: task.templateTitle || 'Вид работ',
            typeText: 'Разбор с бригадой (TWI-сессия)',
            typeCoef: 1.5,
            comment: 'Проведен воркшоп из планировщика задач',
            baseUrk: 0 // Упрощенно
        };
        window.rbi_interventionsData.push(item);
        if (typeof dbPut === 'function') await dbPut(STORES.INTERVENTIONS, item);
    }

    rbi_markTaskDone(taskId);
};

/* ============================================================================ */
/* УНИВЕРСАЛЬНЫЙ СБОРЩИК НАСТРОЕК ОТЧЕТА ИЗ ЗАДАЧ (ДЛЯ СОВЕЩАНИЙ И ПЛАКАТОВ)  */
/* ============================================================================ */

window.rbi_openReportSettingsModal = function(actionType, mode, taskId, closeTask = true) {
    const modal = document.getElementById('modal-overlay');
    
    // Собираем уникальные объекты из истории проверок
    const uniqueProjects = [...new Set(contractorArray.map(c => c.projectName).filter(Boolean))].sort();
    
    let projOptions = `<option value="ALL">Все объекты компании (Глобально)</option>`;
    uniqueProjects.forEach(p => {
        projOptions += `<option value="${p.replace(/"/g, '&quot;')}">${p}</option>`;
    });

    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200">⚙️</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Настройки Отчета</div>`;
    
    // Текст меняется в зависимости от того, закрывается ли задача
    const taskInfoText = closeTask 
        ? "Выберите параметры для формирования выгрузки. Система автоматически закроет эту задачу после скачивания файла."
        : "Выберите объект и период для формирования презентации. После скачивания вернитесь в задачу для заполнения протокола.";

    document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[12px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            ${taskInfoText}
        </div>
        
        <div class="space-y-3 mb-6">
            <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Объект</label>
                <select id="task-rep-project" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none">
                    ${projOptions}
                </select>
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Период Анализа</label>
                <select id="task-rep-period" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none">
                    <option value="WEEK">За последние 7 дней (Неделя)</option>
                    <option value="MONTH">За последние 30 дней (Месяц)</option>
                    <option value="ALL">За всё время</option>
                </select>
            </div>
        </div>

        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700">
                Отмена
            </button>
            <button onclick="closeModal(); rbi_executeTaskReport('${actionType}', '${mode}', '${taskId}', ${closeTask})" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">
                🚀 Скачать PDF
            </button>
        </div>
    `;
    
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

window.rbi_executeTaskReport = function(actionType, mode, taskId, closeTask) {
    const proj = document.getElementById('task-rep-project').value;
    const period = document.getElementById('task-rep-period').value;

    // 1. Применяем фильтры глобально
    if (proj === 'ALL') {
        activeMultiFilters.analytics.project = [];
    } else {
        activeMultiFilters.analytics.project = [proj];
    }

    const periodSelect = document.getElementById('global-filter-period');
    if (periodSelect) {
        periodSelect.value = period;
        const periodLabel = document.getElementById('btn-ana-period-label');
        if (periodLabel) {
            periodLabel.querySelector('.truncate').innerText = periodSelect.options[periodSelect.selectedIndex].text;
        }
    }

    // 2. Закрываем задачу ТОЛЬКО если closeTask === true (для совещания он false)
    if (taskId && closeTask) {
        rbi_markTaskDone(taskId, true); 
    }

    // 3. Запускаем формирование самого PDF отчета
    setTimeout(() => {
        handleFabExportAction(actionType, mode);
    }, 300);
};