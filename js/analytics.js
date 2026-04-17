/* Файл: js/analytics.js */
// === МОДУЛЬ АНАЛИТИКИ И ДАШБОРДОВ ===
// Задаем стартовую вкладку по умолчанию! Именно из-за этого был пустой экран при входе
let currentActiveAnalyticsTab = 'sub-contractors'; 

// ЕДИНАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ПОДВКЛАДОК АНАЛИТИКИ
function switchAnalyticsSubTab(tabId, btnElement) {
    currentActiveAnalyticsTab = tabId;
    
    // Скрываем все секции
    document.querySelectorAll('.analytics-sub-section').forEach(el => el.classList.add('hidden'));
    
    // Сбрасываем стили всех кнопок
    document.querySelectorAll('#analytics-subtabs-block .sub-tab-btn').forEach(el => {
        el.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
        el.classList.add('text-[var(--text-muted)]');
    });
    
    // Показываем нужную секцию
    const targetTab = document.getElementById(tabId);
    if(targetTab) targetTab.classList.remove('hidden');
    
    // Красим активную кнопку
    if(btnElement) {
        btnElement.classList.add('bg-white', 'shadow-sm', 'text-indigo-600', 'dark:bg-slate-700', 'dark:text-indigo-400');
        btnElement.classList.remove('text-[var(--text-muted)]');
    }

    // Запускаем рендер контента и обновляем кнопку скачивания PDF
    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
    if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');
}
// 1. Фильтрация данных для всех вкладок аналитики
function getFilteredAnalyticsData() {
    const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
    
    const fProj = activeMultiFilters.analytics.project;
    const fContr = activeMultiFilters.analytics.contractor;
    const fInsp = activeMultiFilters.analytics.inspector;
    const fTmpl = activeMultiFilters.analytics.template;
    
    let arr = contractorArray;
    const now = new Date();
    
    if (selPeriod === 'DAY') {
        arr = arr.filter(i => new Date(i.date).toDateString() === now.toDateString()); 
    } else if (selPeriod === 'MONTH') { 
        const m = new Date(); m.setDate(now.getDate()-30); 
        arr = arr.filter(i => new Date(i.date) >= m); 
    } else if (selPeriod === 'WEEK') { 
        const w = new Date(); w.setDate(now.getDate()-7); 
        arr = arr.filter(i => new Date(i.date) >= w); 
    } else if (selPeriod === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        if (dFrom) {
            const fDate = new Date(dFrom); fDate.setHours(0, 0, 0, 0); 
            arr = arr.filter(i => new Date(i.date) >= fDate);
        }
        if (dTo) {
            const tDate = new Date(dTo); tDate.setHours(23, 59, 59, 999); 
            arr = arr.filter(i => new Date(i.date) <= tDate);
        }
    }

    if (fProj.length > 0) arr = arr.filter(i => fProj.includes(i.projectName));
    if (fContr.length > 0) arr = arr.filter(i => fContr.includes(i.contractorName));
    if (fInsp.length > 0) arr = arr.filter(i => fInsp.includes(i.inspectorName));
    if (fTmpl.length > 0) arr = arr.filter(i => fTmpl.includes(i.templateKey));
    
    return arr;
}

// 2. Обновление списков в фильтрах аналитики
function updateAnalyticsFilters() {
    const selectC = document.getElementById('global-filter-contractor');
    const selectT = document.getElementById('global-filter-template');
    if(!selectC || !selectT) return;
    
    const uniqueCs = [...new Set(contractorArray.map(i => i.contractorName).filter(Boolean))];
    selectC.innerHTML = `<option value="ALL">Все подрядчики</option>` + uniqueCs.map(c => `<option value="${c}">${c}</option>`).join('');
    
    const tmplSelect = document.getElementById('checklist-selector');
    if(tmplSelect) {
        let opts = `<option value="ALL">Все виды работ</option>`;
        Array.from(tmplSelect.options).forEach(o => {
            if(o.value && o.value !== "HOME" && o.value !== "UPLOAD") opts += `<option value="${o.value}">${o.text}</option>`;
        });
        selectT.innerHTML = opts;
    }
}

function toggleDateRange() {
    const select = document.getElementById('global-filter-period');
    const period = select?.value;
    const label = document.getElementById('btn-ana-period-label');
    
    if (select && label) { label.querySelector('.truncate').innerText = select.options[select.selectedIndex].text; }

    const rangeBlock = document.getElementById('custom-date-range');
    if (!rangeBlock) return;
    
    if (period === 'CUSTOM') {
        rangeBlock.classList.remove('hidden'); rangeBlock.classList.add('grid');
    } else {
        rangeBlock.classList.add('hidden'); rangeBlock.classList.remove('grid');
    }
}

// 3. Главный рендер текущей вкладки
function renderCurrentAnalyticsTab() {
    for (const key in chartInstances) { if (chartInstances[key]) chartInstances[key].destroy(); }
    chartInstances = {};

    const data = getFilteredAnalyticsData();
    
    if (currentActiveAnalyticsTab === 'sub-contractors') renderContractorsSubTab(data);
    else if (currentActiveAnalyticsTab === 'sub-onepager') renderOnePagerSubTab(data);
    else if (currentActiveAnalyticsTab === 'sub-engineer-rating') { if(typeof gameRenderDashboard === 'function') gameRenderDashboard(); }
    else if (currentActiveAnalyticsTab === 'sub-data') renderDataSubTab(data);
    else if (currentActiveAnalyticsTab === 'sub-rating') renderRatingTab(); // Обратная совместимость
}

// 4. Подвкладка: Подрядчики (Сводка + Графики)
function renderContractorsSubTab(data) {
    const topContainer = document.getElementById('contractors-top-summary');
    if (!topContainer) return;

    if (data.length === 0) {
        topContainer.innerHTML = `<div class="text-center text-slate-500 text-sm py-10 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm">Нет данных по выбранным фильтрам</div>`;
        document.getElementById('contractors-list-container').innerHTML = '';
        document.getElementById('contractors-chips-container').style.display = 'none';
        return;
    }
    document.getElementById('contractors-chips-container').style.display = 'flex';

    let sumUrk = 0; 
    data.forEach(i => { if(i.metrics) sumUrk += i.metrics.final; });
    const avgUrk = Math.round(sumUrk / data.length);
    
    const groupedC = {};
    data.forEach(item => { groupedC[item.contractorName] = groupedC[item.contractorName] || []; groupedC[item.contractorName].push(item); });
    
    const intMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
    const IKO = intMetrics ? intMetrics.IKO : "0.00";
    const ikoColor = parseFloat(IKO) >= 0.6 ? 'text-red-600' : (parseFloat(IKO) >= 0.3 ? 'text-orange-500' : 'text-green-600');

    const getSelectHtml = (type) => `
        <select onchange="updateTrendCharts('${type}', this.value)" class="text-[9px] font-bold border border-indigo-200 text-indigo-700 bg-white rounded px-1 py-1 outline-none cursor-pointer shadow-sm">
            <option value="WEEK" ${trendGroupings[type]==='WEEK'?'selected':''}>Недели</option>
            <option value="MONTH" ${trendGroupings[type]==='MONTH'?'selected':''}>Месяцы</option>
            <option value="QUARTER" ${trendGroupings[type]==='QUARTER'?'selected':''}>Кварталы</option>
        </select>
    `;

    topContainer.innerHTML = `
        <div class="grid grid-cols-2 min-[400px]:grid-cols-4 gap-2 mb-3">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Средний УрК</div>
                <div class="text-2xl font-black ${avgUrk < 70 ? 'text-red-600' : (avgUrk < 85 ? 'text-orange-500' : 'text-slate-800 dark:text-white')}">${avgUrk}%</div>
            </div>
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Риск (ИКО)</div>
                <div class="text-2xl font-black ${ikoColor}">${IKO}</div>
            </div>
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Подрядчиков</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">${Object.keys(groupedC).length}</div>
            </div>
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Пров.</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">${data.length}</div>
            </div>
        </div>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[10px] text-[var(--text-muted)] uppercase cursor-pointer flex justify-between items-center outline-none hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg> Графики динамики и трендов</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/30">
                <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-[10px] font-black text-[var(--text-muted)] uppercase">📉 Динамика: Подрядчики</div>
                        <div class="flex gap-1">
                            <button onclick="openChartFilterModal('contrs')" class="text-[9px] font-bold border border-slate-200 text-slate-600 bg-white rounded px-2 py-1 active:scale-95 shadow-sm">⚙️ Линии</button>
                            ${getSelectHtml('contrs')}
                        </div>
                    </div>
                    <div style="height: 180px; position: relative;"><canvas id="chart_eng_trend_contrs"></canvas></div>
                </div>
                <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-[10px] font-black text-[var(--text-muted)] uppercase">📉 Динамика: Виды работ</div>
                        <div class="flex gap-1">
                            <button onclick="openChartFilterModal('works')" class="text-[9px] font-bold border border-slate-200 text-slate-600 bg-white rounded px-2 py-1 active:scale-95 shadow-sm">⚙️ Линии</button>
                            ${getSelectHtml('works')}
                        </div>
                    </div>
                    <div style="height: 180px; position: relative;"><canvas id="chart_eng_trend_works"></canvas></div>
                </div>
            </div>
        </details>
    `;

    setTimeout(() => {
        const trendContrsData = buildTrendChartData(data, 'contractorName', selectedChartFilters.contrs, trendGroupings.contrs);
        const trendWorksData = buildTrendChartData(data, 'templateTitle', selectedChartFilters.works, trendGroupings.works);

        const ctxTrendC = document.getElementById('chart_eng_trend_contrs')?.getContext('2d');
        if(ctxTrendC) chartInstances['chart_eng_trend_contrs'] = new Chart(ctxTrendC, { type: 'line', data: trendContrsData, options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 9} } } } } });
        
        const ctxTrendW = document.getElementById('chart_eng_trend_works')?.getContext('2d');
        if(ctxTrendW) chartInstances['chart_eng_trend_works'] = new Chart(ctxTrendW, { type: 'line', data: trendWorksData, options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 9} } } } } });
    }, 50);

    renderContractorsListOnly(data);
}

// 5. Список Подрядчиков (Чипсы)
function filterContractorsList(filter, btnElement) {
    currentContractorsFilter = filter;
    document.querySelectorAll('.contr-chip').forEach(btn => {
        btn.className = "contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap transition-colors";
    });
    btnElement.className = "contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap transition-colors";
    renderContractorsListOnly(getFilteredAnalyticsData());
}

function renderContractorsListOnly(data) {
    const listContainer = document.getElementById('contractors-list-container');
    if (!listContainer) return;

    const groupedC = {};
    data.forEach(item => { groupedC[item.contractorName] = groupedC[item.contractorName] || []; groupedC[item.contractorName].push(item); });

    const cList = [];
    for(let cName in groupedC) {
        const cData = groupedC[cName];
        const m = getContractorMetrics(cData, userTemplates);
        if (m) cList.push({ name: cName, data: cData, metrics: m, workType: cData[0].templateTitle });
    }

    let filteredList = cList;
    if (currentContractorsFilter === 'CRITICAL') filteredList = cList.filter(c => c.metrics.finalC < 70 || c.metrics.n_изделий_с_B3 > 0);
    else if (currentContractorsFilter === 'WARNING') filteredList = cList.filter(c => (c.metrics.finalC >= 70 && c.metrics.finalC < 85) || c.metrics.stabilityIndex < 60);
    else if (currentContractorsFilter === 'STABLE') filteredList = cList.filter(c => c.metrics.finalC >= 85 && c.metrics.n_изделий_с_B3 === 0);
    else if (currentContractorsFilter === 'NEW') filteredList = cList.filter(c => c.metrics.count < 7);

    filteredList.sort((a,b) => {
        if (a.metrics.count < 7 && b.metrics.count >= 7) return 1;
        if (b.metrics.count < 7 && a.metrics.count >= 7) return -1;
        return a.metrics.finalC - b.metrics.finalC;
    });

    if (filteredList.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-6 text-slate-400 font-bold text-[11px] uppercase bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">В этой категории никого нет</div>`;
        return;
    }

    let html = '';
    filteredList.forEach((c) => {
        const m = c.metrics;
        const isPrelim = m.count < 7;
        const colorClass = m.finalC < 70 ? 'text-red-600' : (m.finalC < 85 ? 'text-orange-500' : 'text-green-600');
        const borderClass = m.finalC < 70 ? 'border-red-200 dark:border-red-900/50' : 'border-[var(--card-border)]';

        html += `
        <div class="bg-[var(--card-bg)] border ${borderClass} rounded-xl p-3.5 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform" onclick="showContractorDetailView('${c.name.replace(/'/g, "\\'")}')">
            ${isPrelim ? '<div class="absolute top-0 right-0 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase">Сбор данных</div>' : ''}
            <div class="flex justify-between items-start mb-2 pr-12">
                <div class="min-w-0 flex-1">
                    <div class="text-[13px] font-black text-slate-800 dark:text-white leading-tight truncate mb-0.5">${c.name}</div>
                    <div class="text-[10px] font-bold text-[var(--text-muted)] truncate">${c.workType}</div>
                </div>
                <div class="text-right shrink-0 ml-2">
                    <div class="text-3xl font-black leading-none ${colorClass}">${isPrelim ? '--' : m.finalC}<span class="text-lg">%</span></div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--card-border)]">
                <div class="text-center">
                    <div class="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-0.5">Выборка</div>
                    <div class="text-[11px] font-black text-slate-700 dark:text-slate-300">${m.count} пров.</div>
                </div>
                <div class="text-center border-l border-[var(--card-border)]">
                    <div class="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-0.5">Стабильность</div>
                    <div class="text-[11px] font-black ${isPrelim ? 'text-slate-400' : m.stabColor}">${isPrelim ? '-' : m.stabilityIndex}</div>
                </div>
                <div class="text-center border-l border-[var(--card-border)]">
                    <div class="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-0.5">Критич. B3</div>
                    <div class="text-[11px] font-black ${m.n_изделий_с_B3 > 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/30 rounded' : 'text-green-600'}">${m.n_изделий_с_B3 > 0 ? m.n_изделий_с_B3+' шт' : 'Нет'}</div>
                </div>
            </div>
        </div>`;
    });

    listContainer.innerHTML = html;
}

// 6. Подвкладка: Сводка (One-Pager)
function renderOnePagerSubTab(data) {
    const container = document.getElementById('onepager-content-container');
    if(data.length === 0) { 
        container.innerHTML = `<div class="text-center text-slate-500 text-sm py-10 border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm mx-1">Нет данных для анализа</div>`; 
        return; 
    }

    let sumUrk = 0; let sumB3 = 0;
    data.forEach(i => { if(i.metrics) { sumUrk += i.metrics.final; sumB3 += i.metrics.n_B3_fail; } });
    const currAvgUrk = data.length > 0 ? Math.round(sumUrk / data.length) : 0;
    
    const groupedC = {};
    data.forEach(item => { groupedC[item.contractorName] = groupedC[item.contractorName] || []; groupedC[item.contractorName].push(item); });
    const currContractorsCount = Object.keys(groupedC).length;

    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
    const mData = currIntMetrics || { redZonePerc: 0, IKO: "0.00", ikoStatus: "Мало данных", ikoColor: "text-slate-500" };

    const ratingData = [];
    for(let cName in groupedC) {
        if (groupedC[cName].length >= 3) {
            const m = getContractorMetrics(groupedC[cName], userTemplates);
            if (m) ratingData.push({ name: cName, val: m.finalC, count: m.count, b3: m.n_изделий_с_B3, isPrelim: m.count < 7 });
        }
    }
    ratingData.sort((a,b) => b.val - a.val);

    const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
    let prevData = [];
    const now = new Date();
    let trendLabel = "к 1-й пол. базы"; 
    
    if (selPeriod === 'WEEK') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate()-7);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate()-7);
        prevData = contractorArray.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        trendLabel = "к прош. нед.";
    } else if (selPeriod === 'MONTH') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate()-30);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate()-30);
        prevData = contractorArray.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        trendLabel = "к прош. мес.";
    } else if (selPeriod === 'CUSTOM') {
        trendLabel = "к пред. периоду";
    } else {
        const half = Math.floor(data.length / 2);
        const sortedData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date));
        prevData = sortedData.slice(0, half);
    }

    let prevAvgUrk = 0; let prevIko = "0.00"; let prevChecks = prevData.length; let prevContrsCount = 0;
    if (prevData.length > 0) {
        let pSum = 0; prevData.forEach(i => pSum += (i.metrics?.final || 0));
        prevAvgUrk = Math.round(pSum / prevData.length);
        const pGrouped = {}; prevData.forEach(i => pGrouped[i.contractorName] = true);
        prevContrsCount = Object.keys(pGrouped).length;
        const pInt = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevData, userTemplates) : null;
        if(pInt) prevIko = pInt.IKO;
    }

    const renderTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === "") return `<span class="text-slate-400 text-[8px] font-bold bg-slate-100 dark:bg-slate-700 px-1.5 rounded">Нет базы</span>`;
        let diff = (parseFloat(curr) - parseFloat(prev));
        if (Math.abs(diff) < 0.01) return `<div class="text-right"><span class="text-slate-400 text-[10px] font-bold">▬ 0</span><div class="text-[7px] text-slate-400 mt-0.5 uppercase tracking-wider">${label}</div></div>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? 'text-green-500' : 'text-red-500';
        const sign = diff > 0 ? '▲' : '▼';
        return `<div class="text-right"><span class="${color} text-[11px] font-black">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff)?0:2)}</span><div class="text-[7px] text-slate-400 mt-0.5 uppercase tracking-wider">${label}</div></div>`;
    };

    const sparkLabels = []; const sparkData = [];
    for(let i=5; i>=0; i--) {
        const dStart = new Date(); dStart.setDate(now.getDate() - (i*7) - 7);
        const dEnd = new Date(); dEnd.setDate(now.getDate() - (i*7));
        const weekChecks = contractorArray.filter(c => { const d = new Date(c.date); return d >= dStart && d < dEnd; });
        let wSum = 0; weekChecks.forEach(c => wSum += (c.metrics?.final || 0));
        sparkLabels.push(`-${i}н`);
        sparkData.push(weekChecks.length > 0 ? Math.round(wSum/weekChecks.length) : null);
    }

    let rawForMom = contractorArray;
    const fProj = activeMultiFilters.analytics.project;
    const fContr = activeMultiFilters.analytics.contractor;
    const fInsp = activeMultiFilters.analytics.inspector;
    const fTmpl = activeMultiFilters.analytics.template;
    
    if (fProj.length > 0) rawForMom = rawForMom.filter(i => fProj.includes(i.projectName));
    if (fContr.length > 0) rawForMom = rawForMom.filter(i => fContr.includes(i.contractorName));
    if (fInsp.length > 0) rawForMom = rawForMom.filter(i => fInsp.includes(i.inspectorName));
    if (fTmpl.length > 0) rawForMom = rawForMom.filter(i => fTmpl.includes(i.templateKey));

    const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const contrMoM = {};
    rawForMom.forEach(c => {
        if (!c.metrics) return;
        const d = new Date(c.date);
        const cName = c.contractorName || 'Не указан';
        if(!contrMoM[cName]) contrMoM[cName] = { curr: {sum:0, cnt:0}, prev: {sum:0, cnt:0} };
        
        if(d >= currMonthStart) {
            contrMoM[cName].curr.sum += c.metrics.final; 
            contrMoM[cName].curr.cnt++;
        } else if(d >= prevMonthStart && d <= prevMonthEnd) {
            contrMoM[cName].prev.sum += c.metrics.final;
            contrMoM[cName].prev.cnt++;
        }
    });

    const topContrsForChart = Object.keys(contrMoM)
        .filter(c => contrMoM[c].curr.cnt > 0 || contrMoM[c].prev.cnt > 0)
        .sort((a,b) => (contrMoM[b].curr.cnt + contrMoM[b].prev.cnt) - (contrMoM[a].curr.cnt + contrMoM[a].prev.cnt))
        .slice(0, 6);

    const labelsMoM = topContrsForChart.map(c => c.length > 12 ? c.substring(0,12)+'...' : c);
    const dataPrevMoM = topContrsForChart.map(c => contrMoM[c].prev.cnt > 0 ? Math.round(contrMoM[c].prev.sum / contrMoM[c].prev.cnt) : 0);
    const dataCurrMoM = topContrsForChart.map(c => contrMoM[c].curr.cnt > 0 ? Math.round(contrMoM[c].curr.sum / contrMoM[c].curr.cnt) : 0);
    
    const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
    const prevMonthName = monthNames[prevMonthStart.getMonth()];
    const currMonthName = monthNames[currMonthStart.getMonth()];

    let b3Map = {}; let b2Map = {}; 
    data.forEach(i => {
        if(i.state && i.details) {
            Object.keys(i.state).forEach(id => {
                const s = i.state[id];
                if(s === 'fail' || s === 'fail_escalated') {
                    let defName = "Дефект";
                    const tType = i.templateKey.split('_')[0];
                    const tKey = i.templateKey.replace(tType + '_', '');
                    const cl = tType === 'sys' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (userTemplates[tKey] ? userTemplates[tKey].groups : []);
                    const foundItem = getFlatList(cl).find(x => x.id == id);
                    if(foundItem) defName = foundItem.n;

                    const photo = (i.photos && i.photos[id]) ? i.photos[id] : null;
                    if (s === 'fail_escalated' || (i.metrics && i.metrics.n_B3_fail > 0)) {
                        if (!b3Map[defName]) b3Map[defName] = { count: 0, photo: null, contr: i.contractorName, name: defName };
                        b3Map[defName].count++;
                        if (photo) b3Map[defName].photo = photo; 
                    } else {
                        if (!b2Map[defName]) b2Map[defName] = { count: 0, photo: null, contr: i.contractorName, name: defName };
                        b2Map[defName].count++;
                        if (photo) b2Map[defName].photo = photo;
                    }
                }
            });
        }
    });

    const topB3 = Object.values(b3Map).sort((a,b) => b.count - a.count).slice(0, 5);
    const topB2 = Object.values(b2Map).sort((a,b) => b.count - a.count).slice(0, 5);

    const renderUIPhotoCards = (arr, isCrit) => {
        if (arr.length === 0) return `<div class="text-center py-6 text-[var(--text-muted)] text-[11px] bg-[var(--hover-bg)] rounded-lg border border-dashed border-[var(--card-border)]">Дефектов не зафиксировано</div>`;
        return `<div class="grid grid-cols-5 gap-1.5 min-[400px]:gap-2">
            ${arr.map(d => {
                const imgHtml = d.photo ? `<img src="${d.photo}" class="w-full h-14 min-[400px]:h-20 object-cover border-b border-[var(--card-border)] cursor-pointer active:scale-95" onclick="openPhotoViewer('${d.photo}')">` : `<div class="w-full h-14 min-[400px]:h-20 bg-[var(--hover-bg)] flex items-center justify-center text-[var(--card-border)] text-[8px] border-b border-[var(--card-border)] text-center px-1">НЕТ ФОТО</div>`;
                const badgeColor = isCrit ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200';
                return `
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-hidden flex flex-col shadow-sm">
                    ${imgHtml}
                    <div class="p-1 flex-1 flex flex-col justify-between">
                        <div class="text-[7px] min-[400px]:text-[8px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 mb-1">${d.name}</div>
                        <div>
                            <div class="text-[6px] min-[400px]:text-[7px] text-[var(--text-muted)] mb-0.5 truncate w-full">👤 ${d.contr}</div>
                            <div class="flex justify-between items-center"><span class="${badgeColor} text-[6px] min-[400px]:text-[7px] font-black px-1 rounded border">${isCrit ? 'B3' : 'B2'}</span><span class="text-[7px] font-black text-[var(--text-muted)]">${d.count} шт</span></div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    };

    const periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';
    const isGlobalDanger = parseFloat(mData.IKO) >= 0.60 || sumB3 > 0;
    
    const pdcaKey = 'global_onepager_pdca';
    let rawPdcaText = customExpertConclusions[pdcaKey] || "";
    if (!customExpertConclusions[pdcaKey]) {
        rawPdcaText = `[АНАЛИТИКА ДАШБОРДА]\nИндекс критичности объекта (ИКО): ${mData.IKO}.\nРаботы в красной зоне: ${mData.redZonePerc}%.\nОхват: ${data.length} проверок.\n\n`;
        if (isGlobalDanger) {
            rawPdcaText += `1. Ограничить подписание КС-2 для подрядчиков в красной зоне.\n2. Провести аудит квалификации персонала.\n`;
        } else {
            rawPdcaText += `Процесс находится в управляемой зоне. Ресурсы направить на профилактику системных дефектов.\n`;
        }
    }
    let uiPdcaText = rawPdcaText.replace(/\n/g, '<br>').replace(/^\[(.*?)\]/gm, '<b class="text-slate-800 dark:text-white text-[11px] block mt-2 mb-1">$1</b>');

    container.innerHTML = `
        <div class="text-center sm:text-left border-b border-[var(--card-border)] pb-3 mb-4">
            <h2 class="text-[16px] min-[400px]:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Сводный статус объекта</h2>
            <div class="text-[10px] font-bold text-[var(--text-muted)] mt-1">Охват: ${data.length} независимых проверок &bull; Период: <span class="text-indigo-500">${periodText}</span></div>
        </div>
        
        <div class="flex flex-col md:flex-row gap-4 items-stretch">
            <div class="flex-1 flex flex-col gap-3 md:w-1/2 md:border-r md:border-dashed md:border-[var(--card-border)] md:pr-4">
                
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ср. УрК Объекта</div>
                        <div class="flex justify-between items-end">
                            <span class="text-2xl font-black text-slate-800 dark:text-white leading-none">${currAvgUrk}%</span>
                            ${renderTrend(currAvgUrk, prevAvgUrk, trendLabel)}
                        </div>
                    </div>
                    <div class="bg-[var(--card-bg)] border ${parseFloat(mData.IKO) >= 0.6 ? 'border-red-300 bg-red-50/50' : 'border-[var(--card-border)]'} rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Индекс Риска (ИКО)</div>
                        <div class="flex justify-between items-end">
                            <span class="text-2xl font-black ${mData.ikoColor} leading-none">${mData.IKO}</span>
                            ${renderTrend(mData.IKO, prevIko, trendLabel, true)}
                        </div>
                    </div>
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Объем проверок</div>
                        <div class="flex justify-between items-end">
                            <span class="text-2xl font-black text-slate-800 dark:text-white leading-none">${data.length}</span>
                            ${renderTrend(data.length, prevChecks, trendLabel)}
                        </div>
                    </div>
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Акт. Подрядчиков</div>
                        <div class="flex justify-between items-end">
                            <span class="text-2xl font-black text-slate-800 dark:text-white leading-none">${currContractorsCount}</span>
                            ${renderTrend(currContractorsCount, prevContrsCount, trendLabel)}
                        </div>
                    </div>
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                        <div class="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">В красной зоне</div>
                        <div class="flex justify-between items-end">
                            <span class="text-2xl font-black text-red-600 dark:text-red-400 leading-none">${mData.redZonePerc}%</span>
                            <span class="text-[9px] font-bold text-red-700/70">от объема</span>
                        </div>
                    </div>
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-2.5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 z-10">Тренд УрК (6 нед)</div>
                        <div class="absolute bottom-0 left-0 right-0 h-[40px] opacity-70"><canvas id="op-sparkline-chart"></canvas></div>
                    </div>
                </div>

                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col mt-1">
                    <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">📊 Базовый УрК: Динамика М/М</div>
                    <div style="height: 160px; position: relative;"><canvas id="op-mom-bar-chart"></canvas></div>
                </div>

                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex-1 flex flex-col mt-1">
                    <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-3 flex justify-between items-center">
                        🏆 Рейтинг Подрядчиков (Интегральный УрК)
                    </div>
                    <div class="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 flex-1">
                        ${ratingData.map(r => `
                            <div class="flex items-center gap-2">
                                <div class="w-24 text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title="${r.name}">${r.name}</div>
                                <div class="flex-1 h-2.5 bg-[var(--hover-bg)] rounded-full overflow-hidden border border-[var(--card-border)] relative">
                                    <div class="h-full ${r.val < 70 ? 'bg-red-500' : (r.val < 85 ? 'bg-orange-500' : 'bg-green-500')}" style="width:${r.val}%"></div>
                                </div>
                                <div class="w-14 flex items-center justify-end gap-1 shrink-0">
                                    ${r.isPrelim ? '<span class="text-[8px]" title="Предварительный рейтинг (Мало проверок)">⚠️</span>' : ''}
                                    <span class="text-[11px] font-black ${r.val < 70 ? 'text-red-500' : (r.val < 85 ? 'text-orange-500' : 'text-green-500')}">${r.val}%</span>
                                </div>
                            </div>
                        `).join('') || '<div class="text-[10px] text-[var(--text-muted)] text-center py-2">Недостаточно данных</div>'}
                    </div>
                </div>
            </div>

            <div class="flex-1 flex flex-col gap-4 md:w-1/2">
                ${appSettings.anaOpTopDefects ? `
                <div class="flex-1 bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                    <h3 class="margin-0 mb-3 font-black text-[10px] text-red-700 dark:text-red-500 uppercase border-b border-red-200 dark:border-red-800 pb-2">
                        🚨 ТОП-5 Критических дефектов (B3)
                    </h3>
                    <div class="flex-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        ${renderUIPhotoCards(topB3, true)}
                    </div>
                </div>

                <div class="flex-1 bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-200 dark:border-orange-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                    <h3 class="margin-0 mb-3 font-black text-[10px] text-orange-700 dark:text-orange-500 uppercase border-b border-orange-200 dark:border-orange-800 pb-2">
                        🔄 ТОП-5 Повторяющихся нарушений (B2)
                    </h3>
                    <div class="flex-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        ${renderUIPhotoCards(topB2, false)}
                    </div>
                </div>
                ` : ''}

                <div class="${isGlobalDanger ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'} border-2 rounded-xl p-3 shadow-sm flex-none relative">
                    <div class="flex justify-between items-center border-b ${isGlobalDanger ? 'border-orange-200 dark:border-orange-800' : 'border-green-200 dark:border-green-800'} pb-2 mb-2">
                        <h3 class="margin-0 font-black text-[10px] ${isGlobalDanger ? 'text-orange-800 dark:text-orange-500' : 'text-green-800 dark:text-green-500'} uppercase">
                            🎯 Управленческое Решение и Риски
                        </h3>
                        <button onclick="editExpertText('${pdcaKey}', 'hidden_pdca_text')" class="text-[9px] font-bold bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 px-2 py-1 rounded shadow-sm active:scale-95 text-slate-700 dark:text-slate-300">✏️ Изменить</button>
                    </div>
                    <textarea id="hidden_pdca_text" class="hidden">${rawPdcaText}</textarea>
                    <div class="text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 flex flex-col gap-1">
                        <div class="whitespace-pre-wrap">${uiPdcaText}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const ctxSpark = document.getElementById('op-sparkline-chart');
        if (ctxSpark) {
            if (chartInstances['op-sparkline-chart']) chartInstances['op-sparkline-chart'].destroy();
            chartInstances['op-sparkline-chart'] = new Chart(ctxSpark.getContext('2d'), {
                type: 'line',
                data: { labels: sparkLabels, datasets: [{ data: sparkData, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.2)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4, spanGaps: true }] },
                options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } }, layout: { padding: 0 } }
            });
        }

        const ctxMom = document.getElementById('op-mom-bar-chart');
        if (ctxMom && labelsMoM.length > 0) {
            if (chartInstances['op-mom-bar-chart']) chartInstances['op-mom-bar-chart'].destroy();
            chartInstances['op-mom-bar-chart'] = new Chart(ctxMom.getContext('2d'), {
                type: 'bar',
                data: { labels: labelsMoM, datasets: [ { label: prevMonthName, data: dataPrevMoM, backgroundColor: '#cbd5e1', borderRadius: 4 }, { label: currMonthName, data: dataCurrMoM, backgroundColor: '#4f46e5', borderRadius: 4 } ] },
                options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { font: {size: 9} } }, x: { ticks: { font: {size: 9} } } }, plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, font: {size: 9} } } } }
            });
        }
    }, 100);
}

// 7. Подвкладка: База данных (Таблица)
function renderDataSubTab(data) {
    const container = document.getElementById('sub-data');
    if(!container) return;

    const allProjects = [...new Set(contractorArray.map(c => c.projectName).filter(Boolean))].sort();
    const projOptions = allProjects.map(p => `<option value="${p}">${p}</option>`).join('');

    container.innerHTML = `
        <div class="space-y-6 mx-1 pb-8 mt-2">
            <div class="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-5 shadow-sm">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded-xl flex items-center justify-center shadow-sm">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                    </div>
                    <div>
                        <h2 class="font-black text-[14px] uppercase tracking-tight text-indigo-900 dark:text-indigo-300">Системный Бэкап</h2>
                        <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">Создание и загрузка резервных копий (.json)</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 no-print mt-4">
                    <button onclick="handleDataExport('json')" class="bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 flex items-center justify-center gap-2 shadow-md transition-transform">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> 
                        Скачать базу
                    </button>
                    <button onclick="triggerDataImport()" class="bg-white text-indigo-700 border border-indigo-200 dark:bg-slate-800 dark:border-indigo-800/50 dark:text-indigo-300 py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 flex items-center justify-center gap-2 shadow-sm transition-transform">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> 
                        Загрузить базу
                    </button>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-800/50 rounded-2xl shadow-sm overflow-hidden">
                <div class="bg-emerald-50 dark:bg-emerald-900/20 p-4 border-b border-emerald-100 dark:border-emerald-800/50 flex items-center gap-3">
                    <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div>
                        <h2 class="font-black text-[13px] uppercase tracking-tight text-emerald-800 dark:text-emerald-400">Тендерный отдел</h2>
                        <p class="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold leading-snug mt-0.5">Выгрузка паспортов качества для допуска к торгам</p>
                    </div>
                </div>
                <div class="p-5">
                    <label class="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Выберите объект для выгрузки:</label>
                    <select id="tender-project-select" class="input-base mb-5 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 !py-3">
                        <option value="" disabled selected>-- Нажмите, чтобы выбрать объект --</option>
                        ${projOptions}
                    </select>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="exportTenderPDF()" class="bg-emerald-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-md flex items-center justify-center gap-2 transition-transform">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> 
                            Паспорта (PDF)
                        </button>
                        <button onclick="exportTenderCSV()" class="bg-white text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-2 transition-transform">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> 
                            Сводка (Excel)
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div class="bg-[var(--hover-bg)] p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                    <div>
                        <h2 class="font-black text-[13px] uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                            Реестр проверок
                        </h2>
                        <div class="text-[10px] font-bold text-slate-500 mt-1">Отображено: ${data.length} записей (с учетом фильтров выше)</div>
                    </div>
                    <button onclick="exportFilteredCsv()" class="bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 px-3 py-2 rounded-lg font-bold text-[9px] uppercase active:scale-95 shadow-sm transition-transform flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> 
                        В Excel
                    </button>
                </div>
                
                <div class="overflow-x-auto max-h-[400px] custom-scrollbar bg-white dark:bg-slate-800">
                    <table class="w-full text-left text-[10px] whitespace-nowrap">
                        <thead class="bg-slate-50 dark:bg-slate-900 text-[var(--text-muted)] border-b border-[var(--card-border)] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="p-3 pl-4 font-black uppercase tracking-wider">Дата</th>
                                <th class="p-3 font-black uppercase tracking-wider">Подрядчик</th>
                                <th class="p-3 font-black uppercase tracking-wider">Локация</th>
                                <th class="p-3 font-black uppercase tracking-wider">Инспектор</th>
                                <th class="p-3 text-center font-black uppercase tracking-wider">УрК</th>
                                <th class="p-3 text-center font-black uppercase tracking-wider">Дефекты (B2/B3)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[var(--card-border)]">
                            ${data.length === 0 ? `<tr><td colspan="6" class="p-10 text-center text-[var(--text-muted)] font-bold text-[12px]">Нет данных по выбранным фильтрам</td></tr>` : 
                              [...data].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 100).map(r => {
                                const m = r.metrics;
                                const color = m ? (m.final < 70 ? 'text-red-500' : (m.final < 85 ? 'text-orange-500' : 'text-green-600')) : '';
                                return `<tr class="hover:bg-[var(--hover-bg)] cursor-pointer transition-colors" onclick="showHistoryDetail(${r.id})">
                                    <td class="p-3 pl-4 text-slate-500 font-medium">${new Date(r.date).toLocaleDateString('ru-RU')}</td>
                                    <td class="p-3 max-w-[120px] truncate font-bold text-slate-800 dark:text-slate-200" title="${r.contractorName}">${r.contractorName}</td>
                                    <td class="p-3 max-w-[120px] truncate text-slate-600 dark:text-slate-400" title="${r.location}">${r.location}</td>
                                    <td class="p-3 max-w-[100px] truncate text-slate-500" title="${r.inspectorName || 'Не указан'}">${r.inspectorName || '-'}</td>
                                    <td class="p-3 text-center font-black text-[12px] ${color}">${m ? m.final+'%' : '-'}</td>
                                    <td class="p-3 text-center font-bold">
                                        <span class="bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-900/20 dark:border-orange-800 px-2 py-0.5 rounded mr-1" title="Дефекты B2">${m?m.n_B2_fail:'0'}</span>
                                        <span class="bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-800 px-2 py-0.5 rounded" title="Критические дефекты B3">${m?m.n_B3_fail:'0'}</span>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 8. Подвкладка: Детализация подрядчика (Ранее "Инженерия")
function showContractorDetailView(contractorName) {
    currentDetailedContractor = contractorName;
    document.getElementById('contractors-main-view').classList.add('hidden');
    document.getElementById('contractor-detail-view').classList.remove('hidden');
    document.getElementById('detail-view-title').innerText = contractorName;
    window.scrollTo(0,0);

    const container = document.getElementById('contractor-detail-content');
    const data = getFilteredAnalyticsData().filter(c => c.contractorName === contractorName);
    
    if (data.length === 0) { container.innerHTML = 'Ошибка данных'; return; }

    const m = getContractorMetrics(data, userTemplates);
    const workType = data[0].templateTitle;

    let cStageData = {}; let cFailCounts = {}; let cB3Counts = {}; let causesCount = {};
    
    data.forEach(unit => {
        const stName = unit.stageName || 'Этап не указан';
        if(!cStageData[stName]) cStageData[stName] = { checks: 0, sumUrk: 0, ok: 0, fail: 0, b1: 0, b2: 0, b3: 0 };
        cStageData[stName].checks++;

        if(unit.metrics) { 
            cStageData[stName].sumUrk += unit.metrics.final;
            cStageData[stName].b1 += unit.metrics.n_B1_fail;
            cStageData[stName].b2 += unit.metrics.n_B2_fail;
            cStageData[stName].b3 += unit.metrics.n_B3_fail;
        }
        if(unit.state) {
            Object.keys(unit.state).forEach(id => {
                const s = unit.state[id];
                if (s === 'ok') cStageData[stName].ok++;
                if (s === 'fail' || s === 'fail_escalated') {
                    cStageData[stName].fail++;
                    
                    let causeCode = unit.details[id]?.causeCode || 'C00';
                    causesCount[causeCode] = (causesCount[causeCode] || 0) + 1;

                    let defName = "Дефект";
                    const tType = unit.templateKey.split('_')[0];
                    const tKey = unit.templateKey.replace(tType + '_', '');
                    const cl = tType === 'sys' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (userTemplates[tKey] ? userTemplates[tKey].groups : []);
                    const foundItem = getFlatList(cl).find(x => x.id == id);
                    if(foundItem) defName = foundItem.n;

                    const photo = (unit.photos && unit.photos[id]) ? unit.photos[id] : null;

                    if (s === 'fail_escalated' || (unit.metrics && unit.metrics.n_B3_fail > 0 && s==='fail')) {
                        if(!cB3Counts[defName]) cB3Counts[defName] = { count: 0, photo: null, name: defName };
                        cB3Counts[defName].count++;
                        if(photo) cB3Counts[defName].photo = photo;
                    } else {
                        if(!cFailCounts[defName]) cFailCounts[defName] = { count: 0, photo: null, name: defName };
                        cFailCounts[defName].count++;
                        if(photo) cFailCounts[defName].photo = photo;
                    }
                }
            });
        }
    });

    let causesChartLabels = []; let causesChartData = [];
    Object.keys(causesCount).sort((a,b) => causesCount[b] - causesCount[a]).forEach(code => {
        const name = DEFECT_CAUSES.find(c => c.code === code)?.name || 'Иное';
        causesChartLabels.push(name.substring(0,20)); causesChartData.push(causesCount[code]);
    });

    const cTopB3 = Object.values(cB3Counts).sort((a,b) => b.count - a.count).slice(0, 5);
    const cTopB2 = Object.values(cFailCounts).sort((a,b) => b.count - a.count).slice(0, 5);

    let stagesUIHtml = Object.keys(cStageData).map(k => {
        const d = cStageData[k];
        const avgUrk = Math.round(d.sumUrk / d.checks);
        return `<tr class="border-b border-[var(--card-border)] hover:bg-[var(--hover-bg)]">
            <td class="p-2 text-[10px] font-bold whitespace-normal">${k}</td>
            <td class="p-2 text-center text-[11px]">${d.checks}</td>
            <td class="p-2 text-center text-[11px] font-black ${avgUrk<70?'text-red-500':(avgUrk<85?'text-orange-500':'text-green-600')}">${avgUrk}%</td>
            <td class="p-2 text-center text-[11px] text-green-600 font-bold">${d.ok}</td>
            <td class="p-2 text-center text-[11px] text-orange-500">${d.b2}</td>
            <td class="p-2 text-center text-[11px] text-red-600 font-black">${d.b3}</td>
        </tr>`;
    }).join('');

    const renderPhotoGallery = (arr, isCrit) => {
        if(arr.length === 0) return '<p class="text-xs text-slate-400 py-3 text-center">Дефектов не зафиксировано</p>';
        return `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${arr.map(d => {
            const imgHtml = d.photo ? `<img src="${d.photo}" class="w-full h-24 object-cover cursor-pointer rounded-t-lg" onclick="openPhotoViewer('${d.photo}')">` : `<div class="w-full h-24 bg-[var(--hover-bg)] flex items-center justify-center text-[var(--card-border)] text-[8px] rounded-t-lg">НЕТ ФОТО</div>`;
            return `<div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-sm flex flex-col"><div class="flex-1">${imgHtml}</div><div class="p-2 text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2">${d.name} <span class="text-slate-500 block mt-0.5">(${d.count} шт)</span></div></div>`;
        }).join('')}</div>`;
    };

    const expert = getExpertConclusion(m, contractorName, workType, data.length, 'detail', customExpertConclusions);

    container.innerHTML = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm mb-4">
            <div class="flex justify-between items-start mb-3 border-b border-[var(--card-border)] pb-3">
                <div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Интегральный УрК</div>
                    <div class="text-5xl font-black leading-none ${m.finalC < 70 ? 'text-red-600' : (m.finalC < 85 ? 'text-orange-500' : 'text-green-600')}">${m.finalC}%</div>
                </div>
                <div class="text-right">
                    <span class="status-tag ${m.statusCls} !text-[9px] block mb-1">${m.statusTxt}</span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block border border-[var(--card-border)] px-1.5 py-0.5 rounded">${m.confStatus}</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                    <span class="text-[var(--text-muted)] block mb-0.5">Системный брак (Ks):</span> 
                    <span class="${m.ks < 1 ? 'text-red-500' : 'text-green-600'} text-[14px]">${m.ks.toFixed(2)}</span> 
                </div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                    <span class="text-[var(--text-muted)] block mb-0.5">Критичность (Kcrit):</span> 
                    <span class="${m.kcritC < 1 ? 'text-red-500' : 'text-green-600'} text-[14px]">${m.kcritC.toFixed(2)}</span> 
                </div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                    <span class="text-[var(--text-muted)] block mb-0.5">Стабильность:</span> 
                    <span class="${m.stabColor} text-[14px]">${m.stabilityIndex}</span> 
                </div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                    <span class="text-[var(--text-muted)] block mb-0.5">Доля B3:</span> 
                    <span class="${m.rateB3 > 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'} text-[14px]">${m.rateB3.toFixed(1)}%</span> 
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm">
                <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">График качества по проверкам</div>
                <div style="height: 160px; position: relative;"><canvas id="chart_detail_line"></canvas></div>
            </div>
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm">
                <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Причины брака (Парето)</div>
                <div style="height: 160px; position: relative;"><canvas id="chart_detail_causes"></canvas></div>
            </div>
        </div>

        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm mb-4">
            <div class="bg-[var(--hover-bg)] p-3 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest border-b border-[var(--card-border)] cursor-pointer flex justify-between" onclick="document.getElementById('det-stages').classList.toggle('hidden')">
                <span>Детализация по этапам СМР</span><span>▼</span>
            </div>
            <div id="det-stages" class="hidden overflow-x-auto">
                <table class="w-full text-left whitespace-nowrap">
                    <thead class="bg-slate-50 dark:bg-slate-900/50 text-[9px] text-[var(--text-muted)] border-b border-[var(--card-border)] uppercase tracking-wider">
                        <tr><th class="p-2">Этап</th><th class="p-2 text-center">Пров.</th><th class="p-2 text-center">УрК</th><th class="p-2 text-center text-green-600">OK</th><th class="p-2 text-center text-orange-500">B2</th><th class="p-2 text-center text-red-600">B3</th></tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--card-border)]">${stagesUIHtml}</tbody>
                </table>
            </div>
        </div>

        <div class="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-900/50 rounded-xl p-3 shadow-sm mb-4">
            <div class="text-[11px] font-black text-red-600 uppercase mb-2 flex items-center gap-1.5"><span>🚨</span> Критические дефекты (B3 / >1.5x)</div>
            ${renderPhotoGallery(cTopB3, true)}
        </div>

        <div class="bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-200 dark:border-orange-900/50 rounded-xl p-3 shadow-sm mb-4">
            <div class="text-[11px] font-black text-orange-600 uppercase mb-2 flex items-center gap-1.5"><span>🔄</span> Повторяющиеся нарушения (B2)</div>
            ${renderPhotoGallery(cTopB2, false)}
        </div>

        ${expert.uiHtml}
    `;

    setTimeout(() => {
        const ctxL = document.getElementById('chart_detail_line')?.getContext('2d');
        if (ctxL) {
            chartInstances['chart_detail_line'] = new Chart(ctxL, {
                type: 'line', 
                data: { labels: data.map((_, i) => `#${i+1}`), datasets: [{ data: data.map(item => item.metrics.final), borderColor: '#4f46e5', backgroundColor: '#4f46e5', tension: 0.3, borderWidth: 2, pointRadius: 3 }] },
                options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } },
                plugins: [{ 
                    id: 'targetZone', 
                    beforeDraw: (chart) => {
                        const { ctx, chartArea: { left, right }, scales: { y } } = chart; 
                        ctx.save();
                        ctx.fillStyle = 'rgba(34, 197, 94, 0.08)'; ctx.fillRect(left, y.getPixelForValue(100), right - left, y.getPixelForValue(85) - y.getPixelForValue(100));
                        ctx.fillStyle = 'rgba(234, 179, 8, 0.08)'; ctx.fillRect(left, y.getPixelForValue(85), right - left, y.getPixelForValue(70) - y.getPixelForValue(85));
                        ctx.restore();
                    }
                }]
            });
        }
        
        const ctxB = document.getElementById('chart_detail_causes')?.getContext('2d');
        if (ctxB && causesChartData.length > 0) {
            chartInstances['chart_detail_causes'] = new Chart(ctxB, { 
                type: 'bar', indexAxis: 'y', 
                data: { labels: causesChartLabels, datasets: [{ data: causesChartData, backgroundColor: '#6366f1', borderRadius: 4 }] }, 
                options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } 
            });
        }
    }, 50);
}

function hideContractorDetailView() {
    currentDetailedContractor = null;
    document.getElementById('contractors-main-view').classList.remove('hidden');
    document.getElementById('contractor-detail-view').classList.add('hidden');
    window.scrollTo(0,0);
}

// 9. Старый рейтинг (Оставлен для совместимости, если где-то вызывается)
function renderRatingTab() {
    const listDiv = document.getElementById('rating-list'); 
    const emptyMsg = document.getElementById('rating-empty-msg');
    if(!listDiv) return;

    const data = getFilteredAnalyticsData();

    if (data.length === 0) { listDiv.innerHTML = ''; emptyMsg.style.display = 'block'; return; }
    emptyMsg.style.display = 'none';

    const grouped = {};
    data.forEach(item => { const cName = item.contractorName || 'Не указан'; if(!grouped[cName]) grouped[cName] = []; grouped[cName].push(item); });
    
    const ratingData = [];
    for(let cName in grouped) { 
        const metrics = getContractorMetrics(grouped[cName], userTemplates); 
        if (metrics) ratingData.push({ name: cName, metrics: metrics }); 
    }
    
    if (ratingData.length === 0) { 
        listDiv.innerHTML = '<p class="text-sm text-[var(--text-muted)] text-center bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-xl shadow-sm">Недостаточно данных. Для рейтинга нужно минимум 3 проверки по одному виду работ.</p>'; 
        return; 
    }

    ratingData.sort((a,b) => {
        if (b.metrics.finalC !== a.metrics.finalC) return b.metrics.finalC - a.metrics.finalC;
        if (b.metrics.stabilityIndex !== a.metrics.stabilityIndex) return b.metrics.stabilityIndex - a.metrics.stabilityIndex;
        return a.metrics.rateB3 - b.metrics.rateB3;
    });

    listDiv.innerHTML = ratingData.map((r, index) => {
        const isGold = index === 0; const isSilver = index === 1; const isBronze = index === 2;
        const rankClass = isGold ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-500' : (isSilver ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-400' : (isBronze ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'));
        
        return `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 mb-4 shadow-sm relative overflow-hidden">
            ${isGold ? '<div class="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[8px] font-black px-3 py-1 rounded-bl-lg uppercase shadow-sm z-10">🏆 Лидер</div>' : ''}
            <div class="flex items-start gap-3 border-b border-[var(--card-border)] pb-3 mb-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-inner shrink-0 border ${rankClass}">${index + 1}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-[14px] font-black leading-tight truncate text-slate-800 dark:text-white">${r.name}</div>
                    <span class="${r.metrics.confCls} mt-1 inline-block px-1.5 py-0.5 rounded border text-[8px] uppercase tracking-wide">${r.metrics.confStatus} (Выборка: ${r.metrics.count})</span>
                </div>
                <div class="text-right shrink-0">
                    <div class="text-3xl font-black leading-none ${r.metrics.finalC < 70 ? 'text-red-600' : (r.metrics.finalC < 85 ? 'text-orange-500' : 'text-green-600')}">${r.metrics.finalC}%</div>
                    <span class="${r.metrics.riskCls} text-[9px] uppercase block mt-1 font-bold">${r.metrics.riskStatus}</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[10px] font-bold mb-3 pb-3 border-b border-[var(--card-border)]">
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center"><span class="text-[var(--text-muted)]">Доля B3:</span> <span class="${r.metrics.rateB3 > 0 ? 'text-red-600' : 'text-green-600'}">${r.metrics.rateB3.toFixed(1)}%</span></div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center"><span class="text-[var(--text-muted)]">Повтор B2:</span> <span class="${r.metrics.maxFailRate >= 20 ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'}">${r.metrics.maxFailRate.toFixed(1)}%</span></div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center cursor-help" title="${r.metrics.stabDesc}"><span class="text-[var(--text-muted)] border-b border-dashed border-slate-300">Индекс стаб.:</span> <span class="font-black ${r.metrics.stabColor}">${r.metrics.stabilityIndex} <span class="text-[8px] uppercase font-bold">(${r.metrics.stabText})</span></span></div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] flex justify-between items-center"><span class="text-[var(--text-muted)]">Волатильность:</span> <span class="${r.metrics.volatility > 15 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}">${r.metrics.volatility.toFixed(1)}</span></div>
            </div>
            <div class="text-[10px] font-bold ${r.metrics.finalC < 70 || r.metrics.n_изделий_с_B3 > 0 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20' : (r.metrics.finalC < 85 ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20' : 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20')} p-2.5 rounded-lg border shadow-sm leading-snug">
                <span class="uppercase text-[9px] block mb-0.5 opacity-70">Основание:</span> ${r.metrics.reason}
            </div>
        </div>`;
    }).join('');
}

// 10. Управление трендами (Линии на графиках)
function openChartFilterModal(type) {
    const data = getFilteredAnalyticsData();
    const field = type === 'contrs' ? 'contractorName' : 'templateTitle';
    const title = type === 'contrs' ? 'Линии: Подрядчики' : 'Линии: Виды работ';
    
    const counts = {};
    data.forEach(i => { if(i[field]) counts[i[field]] = (counts[i[field]]||0)+1; });
    const uniqueItems = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);

    const isAuto = selectedChartFilters[type].length === 0;

    let html = `<div class="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar mb-4 pr-1">`;
    html += `<label class="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl mb-3 font-bold cursor-pointer text-indigo-800 dark:text-indigo-300">
        <input type="checkbox" id="chart-filter-auto" class="w-5 h-5 accent-indigo-600" onchange="if(this.checked) document.querySelectorAll('.chart-filter-cb').forEach(cb => cb.checked = false)" ${isAuto ? 'checked' : ''}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        Автовыбор (ТОП-5)
    </label>`;

    uniqueItems.forEach(item => {
        const isChecked = !isAuto && selectedChartFilters[type].includes(item);
        html += `<label class="flex items-center gap-3 p-3 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer border border-[var(--card-border)] transition-colors">
            <input type="checkbox" value="${item}" class="chart-filter-cb w-5 h-5 accent-indigo-600" ${isChecked ? 'checked' : ''} onchange="document.getElementById('chart-filter-auto').checked = false">
            <span class="text-[12px] truncate flex-1">${item}</span>
            <span class="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-bold">${counts[item]} шт</span>
        </label>`;
    });
    html += `</div>
    <div class="flex gap-2">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold uppercase active:scale-95 border border-slate-200 dark:border-slate-700">Отмена</button>
        <button onclick="saveChartFilters('${type}')" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase shadow-md active:scale-95">Применить</button>
    </div>`;

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = ''; 
    document.getElementById('modal-title').innerHTML = `<div class="flex items-center gap-2"><svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg> ${title}</div>`;
    document.getElementById('modal-body').innerHTML = html;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

function saveChartFilters(type) {
    const isAuto = document.getElementById('chart-filter-auto').checked;
    if (isAuto) { selectedChartFilters[type] = []; } 
    else {
        const checked = Array.from(document.querySelectorAll('.chart-filter-cb:checked')).map(cb => cb.value);
        if(checked.length === 0) return showToast('Выберите линии или включите Авто');
        selectedChartFilters[type] = checked;
    }
    closeModal(); updateTrendCharts(type);
}

function updateTrendCharts(type, period) {
    if (period) trendGroupings[type] = period;
    const data = getFilteredAnalyticsData();

    if (currentActiveAnalyticsTab === 'sub-contractors') {
        if (type === 'contrs' && chartInstances['chart_eng_trend_contrs']) {
            chartInstances['chart_eng_trend_contrs'].data = buildTrendChartData(data, 'contractorName', selectedChartFilters.contrs, trendGroupings.contrs);
            chartInstances['chart_eng_trend_contrs'].update();
        }
        if (type === 'works' && chartInstances['chart_eng_trend_works']) {
            chartInstances['chart_eng_trend_works'].data = buildTrendChartData(data, 'templateTitle', selectedChartFilters.works, trendGroupings.works);
            chartInstances['chart_eng_trend_works'].update();
        }
    } else if (currentActiveAnalyticsTab === 'sub-onepager') {
        if (type === 'global' && chartInstances['chart_onepager_trend']) {
            chartInstances['chart_onepager_trend'].data = buildTrendChartData(data, 'TOTAL', [], trendGroupings.global);
            chartInstances['chart_onepager_trend'].update();
        }
    }
}

// 11. Логика ИИ заключений (PDCA)
function editExpertText(expertKey, textAreaId) {
    currentEditingExpertKey = expertKey;
    currentEditingTextAreaId = textAreaId;
    const textArea = document.getElementById(textAreaId);
    const modalInput = document.getElementById('modal-expert-input');
    const overlay = document.getElementById('expert-modal-overlay');
    if(!textArea || !modalInput || !overlay) return;
    
    modalInput.value = textArea.value;
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function cancelExpertEdit() {
    const overlay = document.getElementById('expert-modal-overlay');
    if(overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
    currentEditingExpertKey = null; currentEditingTextAreaId = null;
}

function resetExpertEdit() {
    if(!currentEditingExpertKey) return;
    if(confirm('Сбросить текст до оригинального заключения ИИ? Ваша редакция будет удалена.')) {
        delete customExpertConclusions[currentEditingExpertKey];
        cancelExpertEdit(); scheduleSessionSave();
        if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
        showToast('Текст сброшен к исходному');
    }
}

function saveExpertEdit() {
    const modalInput = document.getElementById('modal-expert-input');
    if(!modalInput || !currentEditingExpertKey) return;
    const newText = modalInput.value.trim();
    if(newText === "") return showToast('Текст не может быть пустым!');
    
    customExpertConclusions[currentEditingExpertKey] = newText;
    cancelExpertEdit(); scheduleSessionSave();
    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
    showToast('Изменения сохранены!');
}

function copyExpertText(btnId, textAreaId) {
    const textArea = document.getElementById(textAreaId);
    const btn = document.getElementById(btnId);
    if(!textArea || !btn) return;
    
    navigator.clipboard.writeText(textArea.value).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '✅<span class="hidden min-[400px]:inline"> Скопировано</span>';
        btn.classList.add('bg-green-50', 'text-green-700', 'border-green-200');
        setTimeout(() => { btn.innerHTML = originalHtml; btn.classList.remove('bg-green-50', 'text-green-700', 'border-green-200'); }, 2000);
        showToast('Текст скопирован в буфер!');
        if (typeof gameLogAction === 'function') gameLogAction('ai_copy', 'clipboard');
    }).catch(() => showToast('Ошибка копирования'));
}

function generateSmartComment(scenario) {
    if(!currentEditingExpertKey) return;
    const parts = currentEditingExpertKey.split('_||_');
    const cName = parts[0]; const tTitle = parts[1];
    
    const cDataAll = contractorArray.filter(i => i.contractorName === cName && i.templateTitle === tTitle);
    if(cDataAll.length < 7) return showToast("Мало данных для генерации (нужно минимум 7 изделий)");
    
    const metrics = getContractorMetrics(cDataAll, userTemplates);
    const text = buildSmartText(scenario, metrics, cName, tTitle, cDataAll.length);
    document.getElementById('modal-expert-input').value = text;
    showToast("Текст успешно сгенерирован!");
    if (typeof gameLogAction === 'function') gameLogAction('ai_generate', scenario);
}

function buildSmartText(scenario, c, cName, tTitle, count) {
    const hasB3 = c.n_изделий_с_B3 > 0;
    const isRed = c.finalC < 70 || hasB3; 
    const isYellow = c.finalC >= 70 && c.finalC < 85 && !hasB3;
    
    const b3Str = hasB3 ? `🚨 КРИТИЧЕСКИЙ БРАК (B3): выявлено в ${c.n_изделий_с_B3} из ${count} проверок. Это блокирует дальнейшие операции!` : `Критический брак (B3) отсутствует.`;
    
    switch(scenario) {
        case 'strict': return `ОФИЦИАЛЬНАЯ ПРЕТЕНЗИЯ (ПРЕДПИСАНИЕ)\n\nКому: Руководителю проекта от организации "${cName}".\nКасательно: Неудовлетворительное качество работ по виду "${tTitle}".\n\nПо результатам независимого строительного контроля (база: ${count} проверок) Интегральный Уровень Качества (УрК) составил ${c.finalC}%.\n\n${isRed ? '❌ ПОКАЗАТЕЛЬ НИЖЕ 70% ИЛИ ВЫЯВЛЕН B3. ПРОДОЛЖЕНИЕ РАБОТ ЗАПРЕЩЕНО.\nТребуется немедленная остановка СМР.' : (isYellow ? '⚠️ ПОКАЗАТЕЛЬ 70-84%. СТАТУС: "УСЛОВНО ВЫПОЛНЕНО".\nКачество в допустимом диапазоне для этапа СМР, однако финишная приемка невозможна до устранения дефектов.' : '✅ ПОКАЗАТЕЛЬ > 85%. РАБОТЫ ПРИНИМАЮТСЯ.')}\n\nФакты нарушений:\n- ${b3Str}\n- Системный повтор дефектов: в ${c.maxFailRate.toFixed(1)}% проверок.\n\nТРЕБОВАНИЯ:\n1. Устранить все критические (B3) и значимые (B2) замечания.\n2. Предъявить исправленные объемы повторно к сдаче.\nВ случае неустранения, применить компенсационные удержания.`;
        case 'tech': return `ТЕХНИЧЕСКИЙ АУДИТ КАЧЕСТВА (МЕТОДИКА 70/85)\n\nПодрядчик: ${cName}\nРаздел: ${tTitle}\nВыборка: ${count} независимых проверок\n\n[МЕТРИКИ ИНЖИНИРИНГА]\n• Итоговый УрК: ${c.finalC}% (Погрешность: ±${c.ci95_margin.toFixed(1)}%)\n• Коэф. системного брака (Ks): ${c.ks.toFixed(2)} (макс. частота дефекта ${c.maxFailRate.toFixed(1)}%)\n• Коэф. критичности (Kcrit): ${c.kcritC.toFixed(2)} (доля проверок с B3: ${c.rateB3.toFixed(1)}%)\n• Стабильность процесса: ${c.stabilityIndex}/100\n\n[СТАТУС И ВЫВОДЫ]\n${isRed ? '🔴 ПРОЦЕСС ЗАБЛОКИРОВАН (УрК < 70% или есть B3).' : (isYellow ? '🟡 ОПЕРАЦИОННЫЙ КОМПРОМИСС (УрК 70-84%).' : '🟢 ЦЕЛЕВОЙ ПОКАЗАТЕЛЬ (УрК >= 85%).')}`;
        case 'boss': return `ИНФОРМАЦИОННАЯ СПРАВКА ДЛЯ РУКОВОДСТВА\n\n🏗 Подрядчик: ${cName}\n📊 Бизнес-прогноз: ${isRed ? '🔴 ВЫСОКИЙ РИСК СРЫВА ПЕРЕДАЧИ КЛИЕНТУ' : (isYellow ? '🟡 ТРЕБУЮТСЯ ДОРАБОТКИ ПЕРЕД ФИНИШЕМ' : '🟢 ВЫСОКАЯ ВЕРОЯТНОСТЬ СДАЧИ С 1-ГО РАЗА')}\n📉 Интегральный УрК: ${c.finalC}%\n\nКлючевые тезисы:\n1. ${b3Str}\n2. ${isRed ? 'Работы остановлены. Идет развитие опасных дефектов.' : (isYellow ? 'Этап СМР продолжается, но на финише возможен "дефектный хвост".' : 'Отличный результат.')}`;
        case 'action_plan': return `ПЛАН КОРРЕКТИРУЮЩИХ МЕРОПРИЯТИЙ (PDCA)\n\nПодрядчик: ${cName} | УрК: ${c.finalC}% (Цель: >85%)\n\nШАГ 1. БЛОКИРОВКА (${b3Str})\n- ${hasB3 ? 'Остановить работы на участках с B3 до устранения.' : 'Ограничений по B3 нет.'}\n\nШАГ 2. ПЕРЕХОД ИЗ СМР В ФИНИШ (Текущий статус: ${isYellow ? 'Условно выполнено' : (isRed ? 'Не принято' : 'Принято')})\n- Устранить все дефекты B2. Наличие не устраненного B2 блокирует подписание финального акта.\n\nШАГ 3. ПРОФИЛАКТИКА СИСТЕМНОГО БРАКА (Частота: ${c.maxFailRate.toFixed(1)}%)\n- Провести аудит квалификации исполнителей.`;
        case 'finance': return `СЛУЖЕБНАЯ ЗАПИСКА (ОПЛАТА И КС-2)\n\nПодрядчик: ${cName}\nВид работ: ${tTitle} | Итоговый УрК: ${c.finalC}%\n\nЗАКЛЮЧЕНИЕ СТРОИТЕЛЬНОГО КОНТРОЛЯ:\n${isRed ? '🔴 ЗАПРЕТ НА ПОДПИСАНИЕ КС-2. УрК ниже 70% или выявлен критический дефект. Применить компенсационные удержания.' : (isYellow ? '🟡 УСЛОВНЫЙ ДОПУСК К КС-2 (Этап СМР). Разрешается частичная оплата, но финальный расчет заблокирован до доведения УрК до 85%.' : '🟢 ОПЛАТА БЕЗ ОГРАНИЧЕНИЙ. УрК >= 85%.')}\n\n${b3Str}`;
        default: return `ЭКСПЕРТНОЕ ЗАКЛЮЧЕНИЕ\n\nКачество работ подрядчика "${cName}" оценивается на ${c.finalC}%.\n\n[Бизнес-метрика]\n${isRed ? 'Остановка работ (<70%).' : (isYellow ? 'Условный допуск СМР (70-84%).' : 'Готовность к сдаче клиенту с 1-го раза (>=85%).')}\n\n[Проблемы]\n• ${c.maxFailRate >= 20 ? `Системный брак: в ${c.maxFailRate.toFixed(1)}% проверок.` : 'Системных отклонений не выявлено.'}\n• ${b3Str}\n\n[Вывод]\n${isRed ? 'Требуется полная переделка.' : (isYellow ? 'Устранить B2 перед финишем.' : 'Работы приняты.')}`;
    }
}