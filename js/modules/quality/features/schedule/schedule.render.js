// schedule.render.js — Блок 29/31: рендер модуля Schedule
//
// Шаг 31 (10-шаговый цикл очистки, раздел 15 PLATFORM_TARGET_ARCHITECTURE.md):
// бизнес-логика рендера физически перенесена сюда из app.js (была там до Step 31).
// window.rbi_renderScheduleTab / window.rbi_addScheduleRow присваиваются здесь
// напрямую (синхронно при загрузке скрипта), чтобы inline onclick в HTML,
// сгенерированном этой же функцией, и в index.html продолжали работать
// без изменений.

(function () {
  var _ctx = null;

  function _getTasks() {
    if (_ctx && _ctx.tasks) {
      return _ctx.tasks.getTasksSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
      return window.RBI.services.tasks.getTasksSync();
    }
    return typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : [];
  }

  function _templates() {
    if (_ctx && _ctx.templates) {
      return _ctx.templates;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.templates) {
      return window.RBI.services.templates;
    }
    return {
      getUserTemplates: function () {
        return typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
      },
      getSystemTemplates: function () {
        return typeof window.SYSTEM_TEMPLATES !== 'undefined' ? window.SYSTEM_TEMPLATES : {};
      }
    };
  }

  function _isDemoMode() {
    return (_ctx && _ctx.appMode) ? _ctx.appMode.isDemo() : window.RBI.services.appMode.isDemo();
  }

  // Главный рендер графика (С визуализацией Ганта и задачами)
  window.rbi_renderScheduleTab = async function (skipLoad = false) {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    if (!skipLoad && !_isDemoMode()) {
        await rbi_loadData();
    }
    if (!window.rbi_scheduleData) window.rbi_scheduleData = [];

    // 1. Собираем чек-листы для селектора
    let clOptions = '<option value="">-- Не привязан --</option>';
    const _st = _templates().getSystemTemplates();
    const sysKeys = Object.keys(_st).sort((a, b) => _st[a].title.localeCompare(_st[b].title));
    sysKeys.forEach(key => { clOptions += `<option value="sys_${key}">[СИС] ${_st[key].title}</option>`; });

    const _ut = _templates().getUserTemplates();
    const userKeys = Object.keys(_ut).sort((a, b) => _ut[a].title.localeCompare(_ut[b].title));
    userKeys.forEach(key => { clOptions += `<option value="user_${key}">[МОЙ] ${_ut[key].title}</option>`; });

    // 2. Генерируем строки редактора (таблицы)
    let activeData = window.rbi_scheduleData.filter(s => !s._deleted);
    let rowsHtml = activeData.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0)).map(s => {
        const d1 = s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '';
        const d2 = s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '';
        let currentSelect = clOptions.replace(`value="${s.templateKey}"`, `value="${s.templateKey}" selected`);

        return `
            <tr class="sched-row hover:bg-[var(--hover-bg)] transition-colors" data-id="${s.id}">
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-work font-bold" value="${s.workTitle || ''}" placeholder="Вид работ"></td>
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-contr" value="${s.contractor || ''}" placeholder="Подрядчик"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-start" value="${d1}"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-end" value="${d2}"></td>
                <td class="p-1"><select class="input-base !py-1.5 text-[10px] w-full sched-tmpl">${currentSelect}</select></td>
                <td class="p-1 text-center">
                    <button onclick="rbi_deleteScheduleRow('${s.id}')" class="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-200 active:scale-90 flex items-center justify-center mx-auto transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </td>
            </tr>`;
    }).join('');

    if (activeData.length === 0) {
        rowsHtml = `<tr><td colspan="6" class="text-center py-6 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-dashed border-slate-300">В графике нет этапов.</td></tr>`;
    }

    // 3. ГЕНЕРИРУЕМ ВИЗУАЛЬНЫЙ ТАЙМЛАЙН (СТРОГИЙ, КОМПАКТНЫЙ СТИЛЬ)
    let ganttHtml = '';
    if (activeData.length > 0) {
        // Находим крайние точки проекта для масштаба (+5% отступы по краям)
        let minDateMs = Math.min(...activeData.map(s => new Date(s.startDate).getTime()));
        let maxDateMs = Math.max(...activeData.map(s => new Date(s.endDate).getTime()));
        const paddingTime = (maxDateMs - minDateMs) * 0.05;

        const globalStart = minDateMs - paddingTime;
        const globalEnd = maxDateMs + paddingTime;
        let totalDuration = globalEnd - globalStart;
        if (totalDuration === 0) totalDuration = 1;

        // Положение линии "СЕГОДНЯ"
        const nowTime = new Date().getTime();
        let todayPerc = ((nowTime - globalStart) / totalDuration) * 100;
        todayPerc = Math.max(0, Math.min(100, todayPerc));

        let rowsHtml = '';

        activeData.forEach(s => {
            const sStart = new Date(s.startDate).getTime();
            const sEnd = new Date(s.endDate).getTime();

            let leftPerc = ((sStart - globalStart) / totalDuration) * 100;
            let widthPerc = ((sEnd - sStart) / totalDuration) * 100;
            if (widthPerc < 1) widthPerc = 1;

            // Ищем привязанные задачи к этому этапу
            const linkedTasks = _getTasks().filter(t =>
                t.source === 'schedule' && t.stageId === s.id && !t._deleted
            );

            // Отрисовка кружочков-задач (вех)
            let tasksDots = linkedTasks.map(t => {
                const tDate = new Date(t.date).getTime();
                let tLeft = ((tDate - sStart) / (sEnd - sStart)) * 100; // Позиция внутри самой полоски
                if (tLeft < 0) tLeft = 0; if (tLeft > 100) tLeft = 100;

                const isDone = t.status === 'done';
                const dotClass = isDone ? 'bg-green-500 border-green-700 z-20' : 'bg-white dark:bg-slate-700 border-indigo-500 z-10';
                // Берем первую букву из типа задачи
                const initial = t.taskType ? t.taskType.charAt(0).toUpperCase() : '';

                return `
                    <div class="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${dotClass} cursor-pointer group hover:scale-150 transition-transform flex items-center justify-center text-[7px] font-black" style="left: ${tLeft}%; transform: translate(-50%, -50%);">
                        ${isDone ? '✓' : initial}
                        <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 font-normal">
                            ${t.taskType}<br><span class="${isDone ? 'text-green-400' : 'text-slate-300'}">${new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                `;

            }).join('');

            rowsHtml += `
                <div class="relative py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex items-center group">
                    <div class="w-1/3 pr-2 shrink-0">
                        <div class="text-[10px] font-black text-slate-800 dark:text-white truncate" title="${s.workTitle}">${s.workTitle}</div>
                        <div class="text-[8px] font-bold text-slate-500 truncate" title="${s.contractor}">${s.contractor}</div>
                    </div>
                    <div class="w-2/3 h-5 relative shrink-0 border-l border-slate-200 dark:border-slate-700 pl-2">
                        <!-- Фон полосы -->
                        <div class="absolute h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full top-1/2 -translate-y-1/2 left-2 right-2"></div>
                        <!-- Активная заливка этапа -->
                        <div class="absolute h-1.5 bg-indigo-500 rounded-full top-1/2 -translate-y-1/2" style="left: calc(8px + ${leftPerc}% * 0.95); width: calc(${widthPerc}% * 0.95);">
                            ${tasksDots}
                        </div>
                    </div>
                </div>
            `;
        });

        const todayStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

        ganttHtml = `
            <!-- Легенда и правила генерации задач (Аккордеон) -->
            <details class="mb-3 group bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none">
                    <span class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Логика автоматических вех (Справка)
                    </span>
                    <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="p-3 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] leading-relaxed space-y-1.5 font-medium bg-white dark:bg-slate-800">
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">П</span> <span><b>ППР (-14 дн):</b> Задача на проверку и утверждение технологических карт до начала работ.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">И</span> <span><b>Инструктаж (-7 дн):</b> Сбор бригадиров, выдача TWI-инструкций и допусков.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">Э</span> <span><b>Эталон (-3 дн):</b> Комиссионная приемка первого образца работы.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">С</span> <span><b>Старт (0 дн):</b> Первая проверка выполненной работы на объекте в день старта этапа.</span></div>
                    <div class="flex items-start gap-2"><span class="w-4 h-4 bg-slate-100 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black text-indigo-600 dark:text-indigo-400">Ф</span> <span><b>Финал (-3 дн от конца):</b> Итоговая инспекция перед закрытием объемов (КС-2), передачей фронта работ и подписания итогового акта.</span></div>
                </div>
            </details>

            <!-- Диаграмма Ганта -->

            <!-- Диаграмма Ганта -->
            <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl p-3 shadow-sm relative overflow-hidden">
                <!-- Вертикальная линия "СЕГОДНЯ" -->
                <div class="absolute top-0 bottom-0 w-px bg-red-500/50 z-0 pointer-events-none" style="left: calc(33.333% + 8px + ${todayPerc}% * 0.63);"></div>
                <div class="absolute top-0 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-b z-10 uppercase tracking-wide" style="left: calc(33.333% + 8px + ${todayPerc}% * 0.63); transform: translateX(-50%);">${todayStr}</div>
                
                <div class="mt-4 relative z-10">
                    ${rowsHtml}
                </div>
                
                <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>${new Date(minDateMs).toLocaleDateString('ru-RU')}</span>
                    <span>${new Date(maxDateMs).toLocaleDateString('ru-RU')}</span>
                </div>
            </div>

            
        `;
    } else {
        ganttHtml = `<div class="text-center py-8 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-2xl border border-dashed border-[var(--card-border)] mt-4">График пуст</div>`;
    }

    // 4. СБОРКА ИТОГОВОГО HTML

    // 4. СБОРКА ИТОГОВОГО HTML (Кнопки + Свернутый редактор + Визуал)
    let html = `
        <div class="flex gap-2 mb-4 px-1">
            <button onclick="rbi_importScheduleExcel()" class="flex-1 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 py-3.5 rounded-xl font-black text-[10px] text-green-700 dark:text-green-500 uppercase tracking-widest active:scale-95 shadow-sm transition-transform flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path></svg> Загрузить Excel
            </button>
            <button onclick="window.rbi_generateAutoTasks()" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сгенерировать задачи
            </button>
        </div>

        <!-- РЕДАКТОР ГРАФИКА (СВЕРНУТ ПО УМОЛЧАНИЮ) -->
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm mb-6 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                <span class="font-black text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg> Редактор (Ручной ввод)</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                <div class="flex justify-end gap-2 mb-3">
                    <button onclick="rbi_clearSchedule()" class="bg-white dark:bg-slate-800 text-red-600 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-[9px] font-bold uppercase shadow-sm active:scale-95 transition-transform flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Очистить всё</button>
                    <button onclick="rbi_saveSchedule()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[9px] font-bold uppercase shadow-md active:scale-95 transition-transform flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Сохранить правки</button>
                </div>
                <div class="overflow-x-auto custom-scrollbar bg-white dark:bg-slate-800 rounded-xl border border-[var(--card-border)] shadow-sm mb-3">
                    <table class="w-full text-left text-[10px] whitespace-nowrap min-w-[800px]">
                        <thead class="bg-[var(--hover-bg)] text-[var(--text-muted)] border-b border-[var(--card-border)] uppercase tracking-wider font-bold">
                            <tr><th class="p-2 pl-3 w-1/4">Вид работ</th><th class="p-2 w-1/5">Подрядчик</th><th class="p-2 w-32">Начало</th><th class="p-2 w-32">Окончание</th><th class="p-2 w-1/4">Чек-лист (Привязка)</th><th class="p-2 w-10 text-center">Удал.</th></tr>
                        </thead>
                        <tbody id="sched-tbody" class="divide-y divide-[var(--card-border)]">${rowsHtml}</tbody>
                    </table>
                </div>
                <button onclick="rbi_addScheduleRow()" class="w-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 py-3.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-600 text-[10px] font-bold uppercase active:scale-95 transition-colors flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Добавить строку
                </button>
            </div>
        </details>

        <!-- ВИЗУАЛЬНЫЙ ТАЙМЛАЙН -->
        <div class="px-1">
            <h3 class="text-[12px] font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5 tracking-tight"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg> Визуализация задач</h3>
            <div class="text-[9px] text-slate-500 font-bold mt-1 mb-2">Наведите мышку (или нажмите) на круглые узлы, чтобы увидеть запланированные задачи.</div>
            ${ganttHtml}
        </div>
    `;
    container.innerHTML = html;
  };

  // Добавление строки без перерисовки всей страницы
  window.rbi_addScheduleRow = function () {
    if (!window.rbi_scheduleData) window.rbi_scheduleData = [];
    const newId = 'sch_' + Date.now().toString(36);

    // Получаем список чек-листов для выпадающего списка
    let clOptions = '<option value="">-- Не привязан --</option>';
    const _st2 = _templates().getSystemTemplates();
    const sysKeys = Object.keys(_st2).sort((a, b) => _st2[a].title.localeCompare(_st2[b].title));
    sysKeys.forEach(key => { clOptions += `<option value="sys_${key}">[СИС] ${_st2[key].title}</option>`; });
    const _ut2 = _templates().getUserTemplates();
    const userKeys = Object.keys(_ut2).sort((a, b) => _ut2[a].title.localeCompare(_ut2[b].title));
    userKeys.forEach(key => { clOptions += `<option value="user_${key}">[МОЙ] ${_ut2[key].title}</option>`; });

    const today = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('sched-tbody');

    if (tbody) {
        // Убираем заглушку "Нет этапов", если она есть
        if (tbody.innerHTML.includes('В графике нет этапов')) tbody.innerHTML = '';

        const tr = `
            <tr class="sched-row hover:bg-[var(--hover-bg)] transition-colors" data-id="${newId}">
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-work font-bold" value="" placeholder="Вид работ"></td>
                <td class="p-1"><input type="text" class="input-base !py-1.5 text-[10px] w-full sched-contr" value="" placeholder="Подрядчик"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-start" value="${today}"></td>
                <td class="p-1"><input type="date" class="input-base !py-1.5 text-[10px] w-full sched-end" value="${today}"></td>
                <td class="p-1"><select class="input-base !py-1.5 text-[10px] w-full sched-tmpl">${clOptions}</select></td>
                <td class="p-1 text-center">
                    <button onclick="this.closest('tr').remove()" class="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-200 active:scale-90 flex items-center justify-center mx-auto transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', tr);
    }
  };

  var ScheduleRender = {

    bindCtx: function (ctx) {
      _ctx = ctx;
    },

    /**
     * Отрендерить блок «Расписание СМР» (#schedule-container).
     * Делегирует в window.rbi_renderScheduleTab(skipLoad) (реализация выше в этом файле).
     */
    render: function (skipLoad) {
      if (window.ScheduleActions) {
        window.ScheduleActions.renderScheduleTab(skipLoad);
      } else if (typeof window.rbi_renderScheduleTab === 'function') {
        window.rbi_renderScheduleTab(skipLoad);
      } else {
        console.warn('[ScheduleRender] rbi_renderScheduleTab недоступен');
      }
    }
  };

  window.ScheduleRender = ScheduleRender;
})();

console.log('[ScheduleRender] schedule.render.js loaded');
