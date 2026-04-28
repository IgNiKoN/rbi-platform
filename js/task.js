/* Файл: js/task.js (Модуль управления задачами) */

// Глобальные переменные модуля переносятся из app.js
window.rbi_tasksData = []; 
window.rbi_scheduleData = []; 

const RBI_TASK_ICONS = {
    'ППР': `<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
    'Инструктаж': `<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"></path></svg>`,
    'Эталон': `<svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
    'Старт': `<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`,
    'Плановая': `<svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>`,
    'Финал': `<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"></path></svg>`
};

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
    const title = document.getElementById('manual-task-title').value.trim();
    const typeCat = document.getElementById('manual-task-type').value;
    const contr = document.getElementById('manual-task-contractor').value;
    const dateStr = document.getElementById('manual-task-date').value;

    if (!title) return showToast("⚠️ Укажите название задачи!");

    const tDate = dateStr ? new Date(dateStr) : new Date();
    tDate.setHours(12,0,0,0);

    const newTask = {
        id: 'task_man_' + Date.now().toString(36),
        statusKey: 'man_' + Date.now().toString(36),
        type: 'manual',
        taskType: typeCat === 'meeting' ? 'Инструктаж' : (typeCat === 'method' ? 'ППР' : 'Плановая'),
        contractor: contr || "Общая",
        project: document.getElementById('inp-project')?.value || "Все",
        templateKey: '', templateTitle: 'Поручение',
        title: title, desc: 'Создано инженером вручную.',
        priority: "Ручная", priorityLvl: 3, target: 1, done: 0,
        carryOverCount: 0, needsEtalon: false, isPaused: false, isCompletedManually: false,
        date: tDate.toISOString()
    };

    if (!weeklyPlanData.tasks) weeklyPlanData.tasks = [];
    weeklyPlanData.tasks.unshift(newTask);
    await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
    
    showToast("✅ Задача добавлена в план!");
    rbi_closeTaskModal();
    rbi_renderTasksList();
};

window.rbi_markTaskSuccess = async function(taskId) {
    const taskIndex = weeklyPlanData.tasks.findIndex(t => t.id === taskId);
    if(taskIndex === -1) return;
    
    // ИСПРАВЛЕНИЕ: Защита от спама кнопкой
    if (weeklyPlanData.tasks[taskIndex].status === 'done') {
        return showToast("✅ Задача уже выполнена!");
    }

    weeklyPlanData.tasks[taskIndex].status = 'done';
    await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
    
    if (typeof gameLogAction === 'function') gameLogAction('overfulfill_bonus', taskId);
    
    showToast("🎉 Успех отмечен! Начислено +XP");
    rbi_renderTasksList();
};

window.rbi_openTaskAction = function(taskId) {
    currentActionTaskId = taskId;
    const task = window.rbi_tasksData.find(t => t.id === taskId) || weeklyPlanData.tasks.find(t => t.id === taskId);
    if(!task) return;

    document.getElementById('rbi-task-modal-desc').innerHTML = `<b>${task.title}</b><br>${task.workTitle || task.templateTitle} • ${task.contractor}`;
    
    document.getElementById('rbi-task-mode-complete').classList.remove('hidden');
    document.getElementById('rbi-task-mode-reschedule').classList.remove('hidden');
    
    document.getElementById('rbi-task-comment').value = '';
    document.getElementById('rbi-task-new-date').value = '';

    const modal = document.getElementById('rbi-task-action-modal');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.rbi_closeTaskActionModal = function() {
    document.getElementById('rbi-task-action-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    currentActionTaskId = null;
};

window.rbi_saveTaskComplete = async function() {
    if(!currentActionTaskId) return;
    
    // Ищем задачу либо в авто-базе, либо в недельном плане
    let isAutoTask = true;
    let taskIndex = window.rbi_tasksData.findIndex(t => t.id === currentActionTaskId);
    if(taskIndex === -1) {
        taskIndex = weeklyPlanData.tasks.findIndex(t => t.id === currentActionTaskId);
        isAutoTask = false;
    }
    if(taskIndex === -1) return;

    if (isAutoTask) {
        window.rbi_tasksData[taskIndex].status = 'done';
        window.rbi_tasksData[taskIndex].resultComment = document.getElementById('rbi-task-comment').value;
        await dbPut(STORES.TASKS, window.rbi_tasksData[taskIndex]);
    } else {
        if (weeklyPlanData.tasks[taskIndex].status === 'done') return showToast("Уже выполнена!");
        weeklyPlanData.tasks[taskIndex].status = 'done';
        weeklyPlanData.tasks[taskIndex].resultComment = document.getElementById('rbi-task-comment').value;
        await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
    }

    if (typeof gameLogAction === 'function') gameLogAction('task_completed_on_time', currentActionTaskId);
    showToast("✅ Задача выполнена!");
    rbi_closeTaskActionModal();
    rbi_renderTasksList();
};

window.rbi_saveTaskReschedule = async function() {
    if(!currentActionTaskId) return;
    
    let isAutoTask = true;
    let taskIndex = window.rbi_tasksData.findIndex(t => t.id === currentActionTaskId);
    if(taskIndex === -1) {
        taskIndex = weeklyPlanData.tasks.findIndex(t => t.id === currentActionTaskId);
        isAutoTask = false;
    }
    if(taskIndex === -1) return;

    const newDate = document.getElementById('rbi-task-new-date').value;
    if(!newDate) return showToast("⚠️ Укажите новую дату!");

    if (isAutoTask) {
        window.rbi_tasksData[taskIndex].date = new Date(newDate).toISOString();
        window.rbi_tasksData[taskIndex].rescheduleReason = document.getElementById('rbi-task-reschedule-reason').value;
        await dbPut(STORES.TASKS, window.rbi_tasksData[taskIndex]);
    } else {
        weeklyPlanData.tasks[taskIndex].date = new Date(newDate).toISOString();
        weeklyPlanData.tasks[taskIndex].rescheduleReason = document.getElementById('rbi-task-reschedule-reason').value;
        await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
    }
    
    showToast("🔄 Задача перенесена!");
    rbi_closeTaskActionModal();
    rbi_renderTasksList();
};

window.rbi_startTaskAudit = function(taskId) {
    const task = window.rbi_tasksData.find(t => t.id === taskId) || weeklyPlanData.tasks.find(t => t.id === taskId);
    if(!task || !task.templateKey) return showToast("Нет привязанного чек-листа!");

    // Снимаем класс модалки (чтобы не было зависания скролла при переходе)
    document.body.classList.remove('modal-open');

    switchTab('tab-audit'); 
    changeTemplate(task.templateKey);
    
    setTimeout(() => {
        const contrInput = document.getElementById('inp-contractor');
        if (contrInput && !contrInput.hasAttribute('readonly')) contrInput.value = task.contractor; 
        
        task.status = 'done';
        if (task.type === 'manual' || weeklyPlanData.tasks.find(t => t.id === taskId)) {
             dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
        } else {
             dbPut(STORES.TASKS, task);
        }
        
        showToast("🚀 Чек-лист загружен. Начинаем аудит!");
    }, 150);
};

window.rbi_renderTasksList = async function() {
    const container = document.getElementById('rbi-tasks-container');
    if (!container) return;

    const activeTasks = (weeklyPlanData && weeklyPlanData.tasks) ? weeklyPlanData.tasks : [];

    const today = new Date(); 
    today.setHours(0,0,0,0);
    
    // Границы времени
    const startW = getStartOfWeek(today);
    const endW = new Date(startW); 
    endW.setDate(startW.getDate() + 6); 
    endW.setHours(23,59,59,999);

    const endM = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endM.setHours(23,59,59,999);
    
    document.getElementById('rbi-week-number').innerText = getWeekNumber(today);
    document.getElementById('rbi-week-dates').innerText = `${startW.toLocaleDateString('ru-RU', {day:'numeric', month:'short'})} — ${endW.toLocaleDateString('ru-RU', {day:'numeric', month:'short', year:'numeric'})}`;

    // Верхняя панель управления (дубликат кнопки "Добавить вручную" ниже удален)
    let globalActionsHtml = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <button onclick="gameForceUpdatePlan()" class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm transition-transform flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Обновить план
            </button>
            <button onclick="rbi_openTaskModal()" class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm transition-transform flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg> + Задача
            </button>
            <button onclick="generateAiRoutePlan()" class="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm transition-transform flex items-center justify-center gap-1.5">
                🧠 AI-Маршрут
            </button>
            <button onclick="gameToggleAbsence()" class="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm transition-transform flex items-center justify-center gap-1.5">
                🏖️ Отпуск/Статус
            </button>
        </div>
        <div id="ai-route-container" class="hidden mb-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed shadow-inner"></div>
    `;

    if (engineerAbsence.isActive) {
        container.innerHTML = globalActionsHtml + `<div class="bg-white/80 dark:bg-slate-800/80 border border-amber-200 rounded-xl p-6 text-center text-amber-700">Отдыхайте! Задачи приостановлены.</div>`;
        return;
    }

    if (activeTasks.length === 0) {
        container.innerHTML = globalActionsHtml + `<div class="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center shadow-sm mt-4"><div class="text-[14px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">План чист</div><div class="text-[11px] text-slate-500 font-medium">Сделайте хотя бы одну проверку или загрузите график СМР.</div></div>`;
        document.getElementById('rbi-tasks-progress-text').innerText = `0/0`;
        document.getElementById('rbi-tasks-progress-bar').style.width = `0%`;
        return;
    }

    let todayTasks = []; let weekTasks = []; let monthTasks = [];
    let weekTotal = 0; let weekDone = 0;

    // Группировка по датам
    activeTasks.forEach(t => {
        if (t.isCompletedManually || t.done >= t.target || t.status === 'done') {
            weekTotal++; weekDone++; return; 
        }
        
        const tDate = t.date ? new Date(t.date) : new Date();
        tDate.setHours(0,0,0,0);
        
        // Сегодня (и просроченные тоже падают в сегодня)
        if (tDate.getTime() <= today.getTime()) { 
            todayTasks.push(t); weekTotal++; 
        } 
        // На этой неделе (строго больше сегодня, но меньше конца недели)
        else if (tDate.getTime() > today.getTime() && tDate.getTime() <= endW.getTime()) { 
            weekTasks.push(t); weekTotal++; 
        } 
        // В этом месяце
        else if (tDate.getTime() > endW.getTime() && tDate.getTime() <= endM.getTime()) {
            monthTasks.push(t); weekTotal++;
        }
    });

    document.getElementById('rbi-tasks-progress-text').innerText = `${weekDone}/${weekTotal}`;
    document.getElementById('rbi-tasks-progress-bar').style.width = weekTotal > 0 ? `${(weekDone/weekTotal)*100}%` : '0%';

    const renderCard = (t, isOverdue) => {
        const icon = RBI_TASK_ICONS[t.taskType] || RBI_TASK_ICONS['Плановая'];
        const dateStr = t.date ? new Date(t.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'}) : 'Без даты';
        const dateTag = isOverdue ? `<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Проср: ${dateStr}</span>` : `<span class="text-[10px] text-slate-400 font-bold">${dateStr}</span>`;
        
        let tagClass = 'text-green-600 bg-green-50 border-green-200';
        let barColor = 'bg-indigo-500';

        if (t.isPaused) { tagClass = 'text-orange-600 bg-orange-50 border-orange-200'; barColor = 'bg-slate-400'; } 
        else if (t.priorityLvl === 4) { tagClass = 'text-red-600 bg-red-50 border-red-200'; barColor = 'bg-red-500'; } 
        else if (t.priorityLvl === 3) { tagClass = 'text-blue-600 bg-blue-50 border-blue-200'; } 
        else if (t.priorityLvl === 2) { tagClass = 'text-orange-600 bg-orange-50 border-orange-200'; barColor = 'bg-orange-500'; }

        // Точное назначение категорий для фильтров
        let filterCat = 'control'; 
        if (t.taskType === 'ППР' || t.taskType === 'Входной контроль' || t.taskType === 'fmea_weekly' || t.taskType === 'onepager_monthly' || t.taskType === 'handover_warranty') filterCat = 'method';
        if (t.taskType === 'Инструктаж' || t.taskType === 'meeting_weekly') filterCat = 'meeting';

        const progressPerc = Math.min((t.done / t.target) * 100, 100);
        const opacityClass = (t.isPaused || t.isCompletedManually) ? 'opacity-60' : 'opacity-100';

        // Кнопка "Успех" удалена
        let actionButtonsHtml = '';
        if (['Эталон', 'Старт', 'Плановая', 'Финал'].includes(t.taskType)) {
            actionButtonsHtml += `<button onclick="rbi_startTaskAudit('${t.id}')" class="flex-1 bg-indigo-600 text-white border border-indigo-700 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-md flex justify-center items-center gap-1.5">📋 Проверить</button>`;
        } else {
            actionButtonsHtml += `<button onclick="rbi_openTaskAction('${t.id}')" class="flex-1 bg-white text-indigo-600 dark:bg-slate-700 dark:text-indigo-400 border border-indigo-200 dark:border-slate-600 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 flex justify-center items-center gap-1.5 shadow-sm">✅ Решить</button>`;
        }

        // ВАЖНО: Добавлен класс w-full для сетки
        return `
        <div data-category="${filterCat}" class="task-card-item w-full bg-[var(--card-bg)] border ${isOverdue ? 'border-red-300 shadow-md' : 'border-[var(--card-border)] shadow-sm'} rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden transition-all duration-300 ${opacityClass}">
            ${isOverdue ? '<div class="absolute top-0 left-0 w-1 h-full bg-red-500"></div>' : ''}
            
            <div class="flex items-center gap-2 mb-1 min-w-0 pl-1 border-b border-[var(--card-border)] pb-2">
                <div class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] flex items-center justify-center border border-[var(--card-border)] shrink-0">${icon}</div>
                <div class="min-w-0">
                    <div class="text-[12px] font-black text-slate-800 dark:text-white leading-tight truncate">${t.title || 'Задача'}</div>
                    <div class="text-[9px] font-bold text-[var(--text-muted)] mt-0.5 truncate">${t.templateTitle || 'Методика'} • ${t.contractor || 'Организация'}</div>
                </div>
            </div>
            
            <div class="flex flex-wrap gap-1 items-center">
                <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${tagClass}">${t.isPaused ? 'ПАУЗА' : t.priority}</span>
                ${t.needsEtalon ? '<span class="text-[8px] bg-blue-100 text-blue-600 px-1 rounded font-black border border-blue-200">ЭТАЛОН</span>' : ''}
                ${t.carryOverCount > 0 ? '<span class="text-[8px] bg-red-100 text-red-600 px-1 rounded font-black border border-red-200">ДОЛГ</span>' : ''}
            </div>

            <div class="mt-auto">
                <div class="flex justify-between items-end mb-1">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${dateTag}</span>
                    <span class="text-[11px] font-black ${t.done >= t.target ? 'text-green-500' : 'text-slate-700 dark:text-slate-300'}">${t.done} / ${t.target}</span>
                </div>
                <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-[var(--card-border)] mb-2">
                    <div class="h-full ${barColor} transition-all duration-500" style="width: ${progressPerc}%"></div>
                </div>
                
                <div class="flex gap-1.5 w-full">
                    ${actionButtonsHtml}
                    <button onclick="rbi_openTaskAction('${t.id}')" class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] text-slate-400 hover:text-indigo-600 flex items-center justify-center shrink-0 border border-[var(--card-border)] active:scale-90" title="Управление / Перенос">⚙️</button>
                </div>
            </div>
        </div>`;
    };

    const filterHtml = `
        <div class="flex gap-1.5 mb-4 pb-2 overflow-x-auto no-scrollbar" id="hub-filters">
            <button onclick="rbi_filterTaskHub('all', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm transition-colors shrink-0">Все</button>
            <button onclick="rbi_filterTaskHub('control', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-colors shrink-0 border border-slate-200 dark:border-slate-700">Контроль</button>
            <button onclick="rbi_filterTaskHub('method', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-colors shrink-0 border border-slate-200 dark:border-slate-700">Методика</button>
            <button onclick="rbi_filterTaskHub('meeting', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-colors shrink-0 border border-slate-200 dark:border-slate-700">Встречи</button>
        </div>
    `;

    // ГЕНЕРАЦИЯ СВОРАЧИВАЕМЫХ СПИСКОВ (АККОРДЕОНОВ)
    let accordionsHtml = '';

    if (todayTasks.length > 0) {
        const hasOverdue = todayTasks.some(t => {
            const d = t.date ? new Date(t.date) : new Date(); d.setHours(0,0,0,0);
            return d < today;
        });
        
        accordionsHtml += `
        <details class="mb-3 group [&_summary::-webkit-details-marker]:hidden" open>
            <summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2">
                <span class="text-[11px] font-black ${hasOverdue ? 'text-red-600' : 'text-indigo-600'} uppercase tracking-widest flex items-center gap-1.5">
                    ${hasOverdue ? '🚨 СЕГОДНЯ + ПРОСРОЧКА' : '📌 СЕГОДНЯ'} (${todayTasks.length})
                </span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">▼</span>
            </summary>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pb-2 pt-1">
                ${todayTasks.map(t => {
                    const d = t.date ? new Date(t.date) : new Date(); d.setHours(0,0,0,0);
                    return renderCard(t, d < today);
                }).join('')}
            </div>
        </details>`;
    }

    if (weekTasks.length > 0) {
        accordionsHtml += `
        <details class="mb-3 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2">
                <span class="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    🔜 НА ЭТОЙ НЕДЕЛЕ (${weekTasks.length})
                </span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">▼</span>
            </summary>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pb-2 pt-1">
                ${weekTasks.map(t => renderCard(t, false)).join('')}
            </div>
        </details>`;
    }

    if (monthTasks.length > 0) {
        accordionsHtml += `
        <details class="mb-3 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="cursor-pointer flex justify-between items-center mb-2 select-none border-b border-[var(--card-border)] pb-2">
                <span class="text-[11px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    🗓️ ДО КОНЦА МЕСЯЦА (${monthTasks.length})
                </span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">▼</span>
            </summary>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pb-2 pt-1">
                ${monthTasks.map(t => renderCard(t, false)).join('')}
            </div>
        </details>`;
    }

    container.innerHTML = globalActionsHtml + filterHtml + accordionsHtml;
};

// Функция фильтрации карточек без поломки Grid-сетки Tailwind
window.rbi_filterTaskHub = function(category, btnElement) {
    const container = document.getElementById('hub-filters');
    if (container) {
        container.querySelectorAll('.hub-filter-btn').forEach(btn => {
            btn.className = "hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-colors shrink-0 border border-slate-200 dark:border-slate-700";
        });
    }
    if (btnElement) {
        btnElement.className = "hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm transition-colors shrink-0";
    }

    // Ищем все карточки. Наш renderCard генерирует div.task-card-item
    const cards = document.querySelectorAll('.task-card-item');
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'flex'; 
        } else {
            card.style.display = 'none';
        }
    });
};

window.rbi_handleScheduleImport = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast("⚙️ Чтение графика Excel...");
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            let importedCount = 0;
            // Очищаем старый график перед загрузкой нового
            await dbClear(STORES.SCHEDULE);
            window.rbi_scheduleData = [];

            // Строка 0 - Заголовки (Вид работ | Начало | Окончание | Подрядчик(опц))
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r || !r[0]) continue;
                
                const wTitle = r[0].toString().trim();
                const startDate = parseExcelDate(r[1]);
                const endDate = parseExcelDate(r[2]);
                const contractor = r[3] ? r[3].toString().trim() : "Не назначен";
                
                if (!startDate || !endDate) continue;

                const tmplKey = findTemplateKey(wTitle);

                const stageObj = {
                    id: 'sch_' + Date.now().toString(36) + '_' + i,
                    workTitle: wTitle,
                    templateKey: tmplKey,
                    contractor: contractor,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                };

                window.rbi_scheduleData.push(stageObj);
                await dbPut(STORES.SCHEDULE, stageObj);
                importedCount++;
            }

            showToast(`✅ График загружен! Распознано этапов: ${importedCount}`);
            // Сразу генерируем задачи
            await rbi_generateAutoTasks();
            
            if (currentActiveAnalyticsTab === 'sub-schedule') rbi_renderScheduleTab();
            if (currentActiveEngineerTab === 'eng-sub-tasks') rbi_renderTasksList();

        } catch (err) {
            console.error(err);
            alert("Ошибка чтения Excel. Формат: 'Вид работ | Начало | Окончание'.");
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
};