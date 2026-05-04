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

    // ЖЕСТКО СКРЫВАЕМ ГЛОБАЛЬНЫЕ ФИЛЬТРЫ ДЛЯ ИСТОРИИ И ГРАФИКА
    const filtersBlock = document.getElementById('analytics-filters-block');
    if (tabId === 'sub-history' || tabId === 'sub-schedule') {
        if(filtersBlock) filtersBlock.style.display = 'none';
    } else {
        if(filtersBlock) filtersBlock.style.display = 'block';
    }

    // Обновляем кнопку FAB
    if (typeof updateFabButton === 'function') updateFabButton('tab-analytics');

    // Запускаем рендер контента
    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
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
    else if (currentActiveAnalyticsTab === 'sub-schedule') { if(typeof rbi_renderScheduleTab === 'function') rbi_renderScheduleTab(); }
    else if (currentActiveAnalyticsTab === 'sub-data') renderDataSubTab(data);
    else if (currentActiveAnalyticsTab === 'sub-history') {
        renderHistoryTab();
        initCollapsiblePanel('hist-sticky-panel', 'hist-panel-body', 'hist-panel-header', 'hist-panel-toggle-icon');
    }
    else if (currentActiveAnalyticsTab === 'sub-rating') renderRatingTab(); // Обратная совместимость
}

// 4. Подвкладка: Подрядчики (Сводка + Графики + Аккордеоны)
// 4. Подвкладка: Подрядчики (Сводка + Графики + Аккордеоны)
// 4. Подвкладка: Подрядчики (Сводка + Графики + Аккордеоны + Магия TWI)
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

    let sumUrkProd = 0, sumB1 = 0, sumB2 = 0, sumB3 = 0;
    const groupedC = {};
    const causesCount = {};

    data.forEach(i => { 
        if(i.metrics) { 
            sumUrkProd += i.metrics.final; 
            sumB1 += i.metrics.n_B1_fail;
            sumB2 += i.metrics.n_B2_fail;
            sumB3 += i.metrics.n_B3_fail;
        }
        const cKey = i.contractorName + ' [' + (i.projectName || 'Без объекта') + ']';
        groupedC[cKey] = groupedC[cKey] || []; 
        groupedC[cKey].push(i);

        if(i.state && i.details) {
            Object.keys(i.state).forEach(id => {
                if (i.state[id] === 'fail' || i.state[id] === 'fail_escalated') {
                    let code = i.details[id]?.causeCode || 'C00';
                    causesCount[code] = (causesCount[code] || 0) + 1;
                }
            });
        }
    });

    const avgUrkProd = Math.round(sumUrkProd / data.length);
    const contrCount = Object.keys(groupedC).length;
    
    let sumIntegralUrk = 0; let validContrCount = 0;
    let defaultSmartText = '';
    let cList = [];
    
    // Списки для фотогалерей
    let allPhotosB3 = []; let allPhotosB2 = []; let allPhotosOK = [];
    
    // Словарь для поиска "Магии TWI" (совпадение OK и FAIL по одному пункту)
    let twiMagicMap = {}; // Формат: { "sys_okna_101": { ok: url, fail: url, title: name, tmpl: sys_okna, itemId: 101 } }

    for(let cName in groupedC) {
        const cData = groupedC[cName];
        if (cData.length >= 7) {
            const m = getContractorMetrics(cData, userTemplates);
            if (m) {
                sumIntegralUrk += m.finalC;
                validContrCount++;
                cList.push({ name: cName, metrics: m, workType: cData[0].templateTitle });

                if (m.finalC < 70 || m.n_изделий_с_B3 > 0) {
                    defaultSmartText += `🚨 ${cName} (${m.finalC}%): Допущено ${m.n_изделий_с_B3} B3. Системность: ${m.maxFailRate.toFixed(1)}%. Действие: Остановить приемку.\n`;
                } else if (m.finalC < 85 || m.stabilityIndex < 60) {
                    defaultSmartText += `⚠️ ${cName} (${m.finalC}%): Условный допуск. Стабильность: ${m.stabilityIndex}. Действие: Усилить технадзор.\n`;
                }
            }
        }

        cData.forEach(check => {
            if(check.state && check.photos) {
                Object.keys(check.state).forEach(id => {
                    const s = check.state[id];
                    if (check.photos[id]) {
                        const tType = check.templateKey.split('_')[0];
                        const tKey = check.templateKey.replace(tType + '_', '');
                        const cl = tType === 'sys' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (userTemplates[tKey] ? userTemplates[tKey].groups : []);
                        const foundItem = getFlatList(cl).find(x => x.id == id);
                        let defName = foundItem ? foundItem.n : "Дефект";
                        let photoObj = { photo: check.photos[id], name: defName, contr: cName, date: new Date(check.date).toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'}) };
                        
                        // Запись для Магии TWI
                        const magicKey = check.templateKey + '_' + id;
                        if (!twiMagicMap[magicKey]) twiMagicMap[magicKey] = { ok: null, fail: null, title: defName, tmplKey: check.templateKey, itemId: id };

                        if (s === 'ok') {
                            allPhotosOK.push(photoObj);
                            twiMagicMap[magicKey].ok = check.photos[id];
                        } else if (s === 'fail' || s === 'fail_escalated') {
                            let isB3 = (s === 'fail_escalated') || (foundItem && foundItem.w === 3);
                            if (isB3) allPhotosB3.push(photoObj); else allPhotosB2.push(photoObj);
                            twiMagicMap[magicKey].fail = check.photos[id];
                        }
                    }
                });
            }
        });
    }

    allPhotosB3.sort(() => Math.random() - 0.5);
    allPhotosB2.sort(() => Math.random() - 0.5);
    allPhotosOK.sort(() => Math.random() - 0.5);

    // ГЕНЕРАЦИЯ БЛОКА "МАГИЯ TWI"
    let magicTwiHtml = '';
    const magicCandidates = Object.values(twiMagicMap).filter(m => m.ok && m.fail);
    
    // Проверяем: нет ли УЖЕ созданной карты Технадзора (INSPECTOR) для этого пункта в этом шаблоне?
    const newMagicCandidates = magicCandidates.filter(m => {
        const existing = customTwiCards.find(c => c.checklistKey === m.tmplKey && String(c.itemId) === String(m.itemId) && c.type === 'INSPECTOR');
        return !existing;
    });

    if (newMagicCandidates.length > 0) {
        magicTwiHtml = `
            <div id="twi-magic-block" class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm mb-3 text-white overflow-hidden relative magic-collapsed" style="transition: padding 0.3s ease;">
                <div onclick="document.getElementById('twi-magic-block').classList.toggle('magic-collapsed')" class="cursor-pointer p-2.5 px-3">
                    <button class="absolute top-2.5 right-3 text-white/50 hover:text-white/100 transition-colors pointer-events-none">
                        <svg class="w-4 h-4 magic-arrow transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                    </button>
                    <div class="flex items-center gap-1.5 font-black uppercase tracking-widest text-[10px] drop-shadow-md">
                        <span class="text-sm animate-pulse">✨</span> Магия TWI (Найдено: ${newMagicCandidates.length})
                    </div>
                </div>
                
                <div class="magic-content-wrapper px-3">
                    <div class="magic-content">
                        <div class="text-[10px] font-medium text-indigo-100 mb-2 leading-snug">
                            Система нашла эталоны (OK) и брак (FAIL) для одних и тех же пунктов. За создание TWI-карты начислен <b class="text-yellow-300">Бонус XP!</b>
                        </div>
                        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-3">
                            ${newMagicCandidates.map((m, i) => `
                                <div class="bg-white/10 border border-white/20 p-2 rounded-lg shrink-0 w-40 flex flex-col justify-between">
                                    <div class="text-[8px] font-bold leading-tight line-clamp-2 mb-2" title="${m.title}">${m.title}</div>
                                    <button onclick="window.createMagicTwi('${m.tmplKey}', '${m.itemId}', '${m.ok}', '${m.fail}', '${m.title.replace(/'/g, "\\'")}')" class="w-full bg-white text-indigo-600 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm">Создать (+100 XP)</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <style>
                #twi-magic-block.magic-collapsed { padding-bottom: 0px; }
                #twi-magic-block.magic-collapsed .magic-arrow { transform: rotate(180deg); }
                .magic-content-wrapper { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.3s ease-out; }
                #twi-magic-block.magic-collapsed .magic-content-wrapper { grid-template-rows: 0fr; }
                .magic-content { overflow: hidden; }
            </style>
        `;
    }

    const avgIntegralUrk = validContrCount > 0 ? Math.round(sumIntegralUrk / validContrCount) : 0;
    if (defaultSmartText === '') defaultSmartText = '✅ Все подрядчики в зеленой зоне. Вмешательство не требуется.';

    const globalKey = 'global_main_analysis';
    const rawSmartText = customExpertConclusions[globalKey] || defaultSmartText;
    const uiSmartText = rawSmartText.replace(/\n/g, '<br>');
    const isCustomText = !!customExpertConclusions[globalKey];

    const getSelectHtml = (type) => `
        <select onchange="updateTrendCharts('${type}', this.value)" class="text-[9px] font-bold border border-indigo-200 text-indigo-700 bg-white rounded px-1 py-1 outline-none cursor-pointer shadow-sm">
            <option value="WEEK" ${trendGroupings[type]==='WEEK'?'selected':''}>Недели</option>
            <option value="MONTH" ${trendGroupings[type]==='MONTH'?'selected':''}>Месяцы</option>
        </select>
    `;

    topContainer.innerHTML = `
        <div class="grid grid-cols-2 min-[400px]:grid-cols-4 gap-2 mb-3">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1" title="Средний УрК всех изделий">Ср. УрК Изд.</div>
                <div class="text-2xl font-black ${avgUrkProd < 70 ? 'text-red-600' : (avgUrkProd < 85 ? 'text-orange-500' : 'text-green-600')}">${avgUrkProd}%</div>
            </div>
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1" title="Средний Интегральный рейтинг подрядчиков">Надежность (ИУрК)</div>
                <div class="text-2xl font-black ${avgIntegralUrk < 70 ? 'text-red-600' : (avgIntegralUrk < 85 ? 'text-orange-500' : 'text-indigo-600')}">${validContrCount > 0 ? avgIntegralUrk+'%' : 'СБОР'}</div>
            </div>
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Подрядчиков</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">${contrCount}</div>
            </div>
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Проверок</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">${data.length}</div>
            </div>
            <div class="col-span-2 min-[400px]:col-span-4 bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-2 shadow-inner flex justify-around text-center">
                <div><span class="text-[9px] font-bold text-slate-400 uppercase block">Мелкие (B1)</span><span class="font-black text-blue-600">${sumB1}</span></div>
                <div class="w-px bg-[var(--card-border)]"></div>
                <div><span class="text-[9px] font-bold text-slate-400 uppercase block">Значимые (B2)</span><span class="font-black text-orange-500">${sumB2}</span></div>
                <div class="w-px bg-[var(--card-border)]"></div>
                <div><span class="text-[9px] font-bold text-slate-400 uppercase block">Критичные (B3)</span><span class="font-black text-red-600">${sumB3}</span></div>
            </div>
        </div>

        ${magicTwiHtml}

        <!-- РЕДАКТИРУЕМЫЙ СМАРТ АНАЛИЗ СИСТЕМЫ -->
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 transition-colors">
                <span class="flex items-center gap-2">🧠 Анализ зон риска (AI)</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-white dark:bg-slate-800 relative">
                <button onclick="editExpertText('${globalKey}', 'hidden_global_analysis')" class="absolute top-3 right-3 text-[9px] font-bold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded shadow-sm active:scale-95 text-slate-600 dark:text-slate-300">✏️ Изменить</button>
                <div class="text-[10px] text-slate-500 uppercase font-bold mb-3 border-b border-slate-100 pb-2 pr-20">Статус выборки: проанализировано ${validContrCount} подрядчиков</div>
                ${isCustomText ? `<div class="text-[9px] font-bold text-yellow-700 uppercase mb-2 bg-yellow-100 w-fit px-2 py-0.5 rounded">⚠️ Скорректировано инженером</div>` : ''}
                <div class="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    ${uiSmartText}
                </div>
                <textarea id="hidden_global_analysis" class="hidden">${rawSmartText}</textarea>
            </div>
        </details>

        <!-- АККОРДЕОН 2: ГРАФИКИ ДИНАМИКИ -->
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2">📈 Динамика и Тренды</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-[10px] font-black text-[var(--text-muted)] uppercase">Динамика: Подрядчики (Топ-10)</div>
                        <div class="flex gap-1">
                            <button onclick="openChartFilterModal('contrs')" class="text-[9px] font-bold border border-slate-200 text-slate-600 bg-white rounded px-2 py-1 shadow-sm">⚙️ Линии</button>
                            ${getSelectHtml('contrs')}
                        </div>
                    </div>
                    <div style="height: 180px; position: relative;"><canvas id="chart_eng_trend_contrs"></canvas></div>
                </div>
            </div>
        </details>

        <!-- АККОРДЕОН 3: ПРИЧИНЫ И СРАВНЕНИЕ -->
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2">📊 Причины и Сравнение</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Коренные причины дефектов</div>
                    <div style="height: 180px; position: relative;"><canvas id="chart_eng_causes"></canvas></div>
                </div>
                <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Сравнение Подрядчиков (Интегр. УрК)</div>
                    <div style="height: 180px; position: relative;"><canvas id="chart_eng_compare"></canvas></div>
                </div>
            </div>
        </details>

        <!-- АККОРДЕОН 4: ФОТОГАЛЕРЕЯ (ТЕПЕРЬ С ЭТАЛОНАМИ) -->
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2">📸 Фотогалерея (Брак и Эталоны)</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 space-y-4">
                <div>
                    <h3 class="text-[10px] font-black text-red-600 uppercase mb-2">Критический брак (B3)</h3>
                    ${window.initPhotoGallery ? window.initPhotoGallery('main_b3', allPhotosB3, true) : '<div class="text-xs">Загрузка...</div>'}
                </div>
                <div>
                    <h3 class="text-[10px] font-black text-orange-600 uppercase mb-2">Значимые дефекты (B2)</h3>
                    ${window.initPhotoGallery ? window.initPhotoGallery('main_b2', allPhotosB2, false) : '<div class="text-xs">Загрузка...</div>'}
                </div>
                <div>
                    <h3 class="text-[10px] font-black text-green-600 uppercase mb-2">Эталонные работы (OK)</h3>
                    ${window.initPhotoGallery ? window.initPhotoGallery('main_ok', allPhotosOK, false, 'text-green-700 bg-green-100 border-green-200', 'OK') : '<div class="text-xs">Загрузка...</div>'}
                </div>
            </div>
        </details>
    `;

    setTimeout(() => {
        const trendContrsData = buildTrendChartData(data, 'contractorName', selectedChartFilters.contrs, trendGroupings.contrs);
        const ctxTrendC = document.getElementById('chart_eng_trend_contrs')?.getContext('2d');
        if(ctxTrendC) {
            chartInstances['chart_eng_trend_contrs'] = new Chart(ctxTrendC, { type: 'line', data: trendContrsData, options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: {size: 9} } } } } });
        }

        let causesLabels = []; let causesData = [];
        Object.keys(causesCount).sort((a,b) => causesCount[b] - causesCount[a]).forEach(code => {
            const name = DEFECT_CAUSES.find(c => c.code === code)?.name || 'Иное';
            causesLabels.push(name.substring(0,15)); causesData.push(causesCount[code]);
        });
        const ctxCauses = document.getElementById('chart_eng_causes')?.getContext('2d');
        if(ctxCauses && causesData.length > 0) {
            chartInstances['chart_eng_causes'] = new Chart(ctxCauses, { type: 'bar', indexAxis: 'y', data: { labels: causesLabels, datasets: [{ data: causesData, backgroundColor: '#f59e0b', borderRadius: 4 }] }, options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
        }

        cList.sort((a,b) => b.metrics.finalC - a.metrics.finalC);
        const compLabels = cList.map(c => c.name.length > 10 ? c.name.substring(0,10)+'...' : c.name);
        const compData = cList.map(c => c.metrics.finalC);
        const compColors = compData.map(v => v < 70 ? '#ef4444' : (v < 85 ? '#f59e0b' : '#22c55e'));
        
        const ctxComp = document.getElementById('chart_eng_compare')?.getContext('2d');
        if(ctxComp && compData.length > 0) {
            chartInstances['chart_eng_compare'] = new Chart(ctxComp, { type: 'bar', data: { labels: compLabels, datasets: [{ data: compData, backgroundColor: compColors, borderRadius: 4 }] }, options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } } });
        }
    }, 100);

    renderContractorsListOnly(data);
}

// ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ВЫЗОВА МАГИИ TWI
window.createMagicTwi = function(checklistKey, itemId, photoGood, photoBad, title) {
    switchTab('tab-reference');
    setTimeout(() => {
        const btns = document.querySelectorAll('#reference-subtabs-block .sub-tab-btn');
        if(btns[2]) switchReferenceSubTab('ref-sub-twi', btns[2]);
        
        openTwiConstructor(); // Открываем пустой конструктор
        
        setTimeout(() => {
            document.getElementById('twi-title-input').value = title;
            document.getElementById('twi-checklist-select').value = checklistKey;
            
            // Запускаем перерисовку селектора пунктов
            populateTwiItemSelect(itemId);
            
            changeTwiType('INSPECTOR');
            
            // Вставляем фото
            renderGoodPhoto(photoGood);
            renderBadPhoto(photoBad);
            
            showToast('✨ Магия сработала! Допишите текст и сохраните.');
        }, 300);
    }, 100);
};
// === ФИЛЬТРАЦИЯ СПИСКА ПОДРЯДЧИКОВ ПО ЧИПСАМ ===
window.filterContractorsList = function(filterType, btnElement) {
    currentContractorsFilter = filterType;
    
    // Сбрасываем стили всех чипсов
    const container = document.getElementById('contractors-chips-container');
    if (container) {
        container.querySelectorAll('.contr-chip').forEach(el => {
            el.className = "contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 active:scale-95 whitespace-nowrap transition-colors";
        });
    }
    
    // Красим активный чипс
    if (btnElement) {
        btnElement.className = "contr-chip px-3 py-1.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm active:scale-95 whitespace-nowrap transition-colors";
    }

    // Перерисовываем список
    renderContractorsListOnly(getFilteredAnalyticsData());
};
// 5. Список Подрядчиков (Мини-карточки сеткой 2 и 3 в ряд)
function renderContractorsListOnly(data) {
    const listContainer = document.getElementById('contractors-list-container');
    if (!listContainer) return;

    const groupedC = {};
    data.forEach(item => { 
        const cKey = item.contractorName + ' [' + (item.projectName || 'Без объекта') + ']';
        groupedC[cKey] = groupedC[cKey] || []; 
        groupedC[cKey].push(item); 
    });

    const cList = [];
    for(let cName in groupedC) {
        const cData = groupedC[cName];
        const m = getContractorMetrics(cData, userTemplates);
        
        // Считаем B1 и B2 для вывода в карточку
        let sumB1 = 0, sumB2 = 0;
        cData.forEach(i => { if(i.metrics) { sumB1 += i.metrics.n_B1_fail; sumB2 += i.metrics.n_B2_fail; } });

        if (m) cList.push({ name: cName, data: cData, metrics: m, workType: cData[0].templateTitle, b1: sumB1, b2: sumB2 });
    }

    let filteredList = cList;
    if (currentContractorsFilter === 'CRITICAL') filteredList = cList.filter(c => c.metrics.finalC < 70 || c.metrics.n_изделий_с_B3 > 0);
    else if (currentContractorsFilter === 'WARNING') filteredList = cList.filter(c => (c.metrics.finalC >= 70 && c.metrics.finalC < 85) || c.metrics.stabilityIndex < 60);
    else if (currentContractorsFilter === 'STABLE') filteredList = cList.filter(c => c.metrics.finalC >= 85 && c.metrics.n_изделий_с_B3 === 0);
    else if (currentContractorsFilter === 'NEW') filteredList = cList.filter(c => c.metrics.count < 7);

    filteredList.sort((a,b) => {
        if (a.metrics.count < 7 && b.metrics.count >= 7) return 1;
        if (b.metrics.count < 7 && a.metrics.count >= 7) return -1;
        return b.metrics.finalC - a.metrics.finalC;
    });

    if (filteredList.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-6 text-slate-400 font-bold text-[11px] uppercase bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">В этой категории никого нет</div>`;
        return;
    }

    // Сетка: 2 колонки на мобильных, 3 на планшетах/ПК
    let html = '<div class="grid grid-cols-2 md:grid-cols-3 gap-3">';
    
    filteredList.forEach((c) => {
        const m = c.metrics;
        const isPrelim = m.count < 7;
        const colorClass = m.finalC < 70 ? 'text-red-600' : (m.finalC < 85 ? 'text-orange-500' : 'text-green-600');
        const borderClass = m.finalC < 70 ? 'border-red-300 dark:border-red-800' : 'border-[var(--card-border)]';
        
        // Защита от поломки HTML из-за кавычек в названиях
        const safeName = c.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

        html += `
        <div class="bg-[var(--card-bg)] border ${borderClass} rounded-xl p-3 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform flex flex-col justify-between" onclick="showContractorDetailView('${safeName}')">
            ${isPrelim ? '<div class="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase" title="Нужно больше проверок">Сбор</div>' : ''}
            
            <div>
                <div class="flex justify-between items-start gap-1 mb-1">
                    <div class="text-[11px] font-black text-slate-800 dark:text-white leading-tight line-clamp-2 pr-6">${c.name}</div>
                </div>
                <div class="text-[9px] font-bold text-[var(--text-muted)] truncate mb-2">${c.workType}</div>
                
                <div class="flex items-end justify-between mb-2">
                    <div>
                        <div class="text-[8px] uppercase text-slate-400 font-bold">Надежность</div>
                        <div class="text-2xl font-black leading-none ${colorClass}">${isPrelim ? '--' : m.finalC}<span class="text-sm">%</span></div>
                        <div class="text-[8px] text-slate-400 font-bold mt-0.5">± ${isPrelim ? '-' : m.ci95_margin.toFixed(1)}%</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[8px] uppercase text-slate-400 font-bold">Ср. УрК Изд.</div>
                        <div class="text-lg font-black text-slate-700 dark:text-slate-300 leading-none">${m.baseUrkContrPerc}%</div>
                        <div class="text-[7px] ${m.confCls} border rounded px-1 mt-1 font-bold uppercase inline-block">${m.confStatus}</div>
                    </div>
                </div>
            </div>
            
            <!-- Информационная панель (Счетчики дефектов) -->
            <div class="flex justify-between items-center bg-[var(--hover-bg)] rounded-md px-2 py-1.5 mb-2 border border-[var(--card-border)]">
                <div class="text-[8px] font-black text-slate-500 uppercase">Дефекты:</div>
                <div class="flex gap-1">
                    <span class="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1 rounded" title="B1">B1: ${c.b1}</span>
                    <span class="text-[8px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-1 rounded" title="B2">B2: ${c.b2}</span>
                    <span class="text-[8px] font-black text-red-600 bg-red-50 border border-red-100 px-1 rounded" title="B3">B3: ${m.n_изделий_с_B3}</span>
                </div>
            </div>

            <!-- Информационная панель (Коэффициенты) -->
            <div class="grid grid-cols-4 gap-1 pt-2 border-t border-[var(--card-border)] text-center">
                <div>
                    <div class="text-[7px] text-slate-500 uppercase font-bold" title="Выборка">Пров.</div>
                    <div class="text-[10px] font-black text-slate-800 dark:text-white">${m.count}</div>
                </div>
                <div class="border-l border-slate-200 dark:border-slate-700">
                    <div class="text-[7px] text-slate-500 uppercase font-bold" title="Стабильность">Стаб.</div>
                    <div class="text-[10px] font-black ${isPrelim ? 'text-slate-400' : m.stabColor}">${isPrelim ? '-' : m.stabilityIndex}</div>
                </div>
                <div class="border-l border-slate-200 dark:border-slate-700">
                    <div class="text-[7px] text-slate-500 uppercase font-bold" title="Системность (Ks)">Ks</div>
                    <div class="text-[10px] font-black ${m.ks < 1 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">${m.ks.toFixed(2)}</div>
                </div>
                <div class="border-l border-slate-200 dark:border-slate-700">
                    <div class="text-[7px] text-slate-500 uppercase font-bold" title="Критичность (Kcrit)">Kcrit</div>
                    <div class="text-[10px] font-black ${m.kcritC < 1 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">${m.kcritC.toFixed(2)}</div>
                </div>
            </div>
        </div>`;
    });

    html += '</div>';
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
    data.forEach(item => { 
        const cKey = (item.contractorName || 'Неизвестно') + ' [' + (item.projectName || 'Без объекта') + ']';
        groupedC[cKey] = groupedC[cKey] || []; 
        groupedC[cKey].push(item); 
    });
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

    let defaultChartContrs = [];
    let isTruncatedForChart = false;
    if (ratingData.length <= 10) {
        defaultChartContrs = ratingData.map(r => r.name);
    } else {
        defaultChartContrs = [...ratingData.slice(0, 5).map(r => r.name), ...ratingData.slice(-5).map(r => r.name)];
        isTruncatedForChart = true;
    }
    
    if (!selectedChartFilters.onepager) selectedChartFilters.onepager = [];
    const activeLineFilters = selectedChartFilters.onepager.length > 0 ? selectedChartFilters.onepager : defaultChartContrs;

    // Сбор всех фото (B3, B2, OK)
    let b3Map = {}; let b2Map = {}; let okMap = {};
    data.forEach(i => {
        if(i.state && i.details && i.templateKey) {
            Object.keys(i.state).forEach(id => {
                const s = i.state[id];
                let defName = "Дефект";
                const tType = i.templateKey.split('_')[0];
                const tKey = i.templateKey.replace(tType + '_', '');
                const cl = tType === 'sys' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (userTemplates[tKey] ? userTemplates[tKey].groups : []);
                const foundItem = getFlatList(cl).find(x => x.id == id);
                if(foundItem) defName = foundItem.n;

                const photo = (i.photos && i.photos[id]) ? i.photos[id] : null;

                if(s === 'fail' || s === 'fail_escalated') {
                    let isB3 = (s === 'fail_escalated') || (foundItem && foundItem.w === 3);
                    if (isB3) {
                        if (!b3Map[defName]) b3Map[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно') + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                        b3Map[defName].count++;
                        if (photo) b3Map[defName].photo = photo; 
                    } else {
                        if (!b2Map[defName]) b2Map[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно') + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                        b2Map[defName].count++;
                        if (photo) b2Map[defName].photo = photo;
                    }
                } else if (s === 'ok' && photo) {
                    if (!okMap[defName]) okMap[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно') + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                    okMap[defName].count++;
                    if (photo) okMap[defName].photo = photo;
                }
            });
        }
    });

    const topB3 = Object.values(b3Map).sort((a,b) => b.count - a.count).slice(0, 5);
    const topB2 = Object.values(b2Map).sort((a,b) => b.count - a.count).slice(0, 5);
    const topOK = Object.values(okMap).sort((a,b) => b.count - a.count).slice(0, 5);

    const renderUIPhotoCards = (arr, isCrit, isOk = false) => {
        if (arr.length === 0) return `<div class="text-center py-6 text-[var(--text-muted)] text-[11px] bg-[var(--card-bg)] rounded-lg border border-dashed border-[var(--card-border)]">${isOk ? 'Эталонов нет' : 'Дефектов не зафиксировано'}</div>`;
        return `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            ${arr.map(d => {
                const imgHtml = d.photo ? `<img src="${window.getPhotoSrc(d.photo)}" class="w-full h-24 object-cover border-b border-[var(--card-border)] cursor-pointer active:scale-95" onclick="openPhotoViewer('${d.photo}')">` : `<div class="w-full h-24 bg-[var(--hover-bg)] flex items-center justify-center text-[var(--card-border)] text-[10px] border-b border-[var(--card-border)] text-center px-1">НЕТ ФОТО</div>`;
                let badgeColor = isCrit ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200';
                let badgeText = isCrit ? 'B3' : 'B2';
                if (isOk) { badgeColor = 'text-green-700 bg-green-100 border-green-200'; badgeText = 'OK'; }
                return `
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden flex flex-col shadow-sm">
                    ${imgHtml}
                    <div class="p-2 flex-1 flex flex-col justify-between">
                        <div class="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 mb-1" title="${d.name}">${d.name}</div>
                        <div>
                            <div class="text-[8px] text-[var(--text-muted)] mb-1 truncate w-full" title="${d.contr}">👤 ${d.contr}</div>
                            <div class="flex justify-between items-center"><span class="${badgeColor} text-[8px] font-black px-1.5 rounded border">${badgeText}</span><span class="text-[9px] font-black text-[var(--text-muted)]">${d.count} шт</span></div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    };

    let periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';
    if (document.getElementById('global-filter-period')?.value === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        if (dFrom || dTo) {
            const fmt = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '...';
            periodText = `с ${fmt(dFrom)} по ${fmt(dTo)}`;
        }
    }
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

    // --- ТЕПЛОВАЯ КАРТА (МАТРИЦА РИСКОВ) ---
    // --- ТЕПЛОВАЯ КАРТА (МАТРИЦА РИСКОВ) ---
    // --- ТЕПЛОВАЯ КАРТА (МАТРИЦА РИСКОВ) ---
    const heatmapStages = {};
    const contrCheckCounts = {}; // Считаем проверки для вывода в топы матрицы

    data.forEach(check => {
        if (!check.metrics) return; 
        
        // Бронебойная защита от отсутствия названия
        const stage = check.templateTitle || check.templateKey || 'Неизвестный этап';
        const contr = check.contractorName || 'Неизвестно';
        
        contrCheckCounts[contr] = (contrCheckCounts[contr] || 0) + 1;

        if (!heatmapStages[stage]) heatmapStages[stage] = {};
        if (!heatmapStages[stage][contr]) heatmapStages[stage][contr] = { checks: 0, defects: 0 };
        
        heatmapStages[stage][contr].checks++;
        heatmapStages[stage][contr].defects += (check.metrics.n_B2_fail + check.metrics.n_B3_fail);
    });

    let heatmapHtml = '';
    const stageNames = Object.keys(heatmapStages).sort();
    
    // ИСПРАВЛЕНИЕ: Берем топ-5 самых проверяемых подрядчиков ИМЕННО из текущей выборки (без лимита в 3 проверки)
    const topMatrixContrs = Object.keys(contrCheckCounts)
        .sort((a, b) => contrCheckCounts[b] - contrCheckCounts[a])
        .slice(0, 5);

    if (stageNames.length > 0 && topMatrixContrs.length > 0) {
        heatmapHtml = `<div class="overflow-x-auto custom-scrollbar pb-2"><table class="w-full text-left border-collapse text-[10px]">
            <thead class="bg-[var(--hover-bg)] text-[var(--text-muted)] uppercase"><tr><th class="p-2 border border-[var(--card-border)] font-black">Вид работ / Подрядчик</th>`;
        
        topMatrixContrs.forEach(c => heatmapHtml += `<th class="p-2 border border-[var(--card-border)] text-center font-bold truncate max-w-[80px]" title="${c}">${c.substring(0,10)}</th>`);
        heatmapHtml += `</tr></thead><tbody>`;

        stageNames.forEach(stage => {
            heatmapHtml += `<tr><td class="p-2 border border-[var(--card-border)] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title="${stage}">${stage}</td>`;
            topMatrixContrs.forEach(contr => {
                const cell = heatmapStages[stage][contr];
                if (!cell) {
                    heatmapHtml += `<td class="p-2 border border-[var(--card-border)] text-center bg-[var(--hover-bg)] text-slate-400 dark:text-slate-600">-</td>`;
                } else {
                    const defectRate = cell.defects / cell.checks;
                    let bgColor = 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800'; 
                    if (defectRate > 1.5) bgColor = 'bg-red-100 text-red-800 border-red-300 font-black dark:bg-red-900/40 dark:border-red-700'; 
                    else if (defectRate > 0.5) bgColor = 'bg-yellow-50 text-yellow-700 border-yellow-200 font-bold dark:bg-yellow-900/20 dark:border-yellow-800';
                    heatmapHtml += `<td class="p-2 border border-[var(--card-border)] text-center ${bgColor}">${cell.defects} деф.</td>`;
                }
            });
            heatmapHtml += `</tr>`;
        });
        heatmapHtml += `</tbody></table></div>`;
    } else {
        heatmapHtml = `<div class="text-center text-slate-400 py-6 text-[10px] font-bold uppercase bg-[var(--hover-bg)] rounded-lg border border-dashed border-[var(--card-border)]">Недостаточно дефектов для карты</div>`;
    }

    // --- ИНДЕКС ЗДОРОВЬЯ (ПУЛЬС) ---
    const healthIndex = Math.max(0, Math.min(100, Math.round(100 - (parseFloat(mData.IKO) * 50) - (mData.redZonePerc * 0.5) - (sumB3 * 2))));
    let healthColor = healthIndex > 80 ? 'text-green-500' : (healthIndex > 50 ? 'text-orange-500' : 'text-red-500');

    // ==========================================
    // СБОРКА ИТОГОВОГО HTML (ОДИН СПИСОК АККОРДЕОНОВ)
    // ==========================================
    container.innerHTML = `
        <div class="text-center sm:text-left border-b border-[var(--card-border)] pb-3 mb-4 mx-1">
            <h2 class="text-[16px] min-[400px]:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Сводный статус объекта</h2>
            <div class="text-[10px] font-bold text-[var(--text-muted)] mt-1">Охват: ${data.length} независимых проверок &bull; Период: <span class="text-indigo-500">${periodText}</span></div>
        </div>
        
        <div class="space-y-3 mx-1">
            
            <!-- АККОРДЕОН 1: ГЛАВНЫЕ МЕТРИКИ И РЕЙТИНГ -->
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="p-3 font-black text-[12px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl select-none">
                    <span class="flex items-center gap-2">📊 Статистика и Тренды</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 flex flex-col gap-4">
                    
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

                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col">
                        <div class="flex justify-between items-center mb-2">
                            <div class="text-[10px] font-black text-[var(--text-muted)] uppercase">Динамика Подрядчиков (Ср. УРк)</div>
                            <button onclick="openChartFilterModal('onepager')" class="text-[9px] font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 rounded px-2 py-1 active:scale-95 shadow-sm">⚙️ Фильтр линий</button>
                        </div>
                        <div style="height: 180px; position: relative;"><canvas id="op-line-chart"></canvas></div>
                    </div>

                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm flex flex-col">
                        <div class="text-[10px] font-black text-[var(--text-muted)] uppercase mb-3 flex justify-between items-center">
                            🏆 Рейтинг Подрядчиков (Интегральный УрК)
                        </div>
                        <div class="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
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
            </details>

            <!-- АККОРДЕОН 2: ПУЛЬС ОБЪЕКТА -->
            <details class="bg-[var(--card-bg)] border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[12px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 transition-colors select-none">
                    <span class="flex items-center gap-2">❤️ Пульс объекта (AI)</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-4 border-t border-indigo-100 dark:border-indigo-800 bg-white dark:bg-slate-800">
                    <div class="flex justify-between items-center mb-4">
                        <div class="text-[10px] font-black uppercase text-slate-400">Индекс Здоровья</div>
                        <div class="text-4xl font-black ${healthColor}">${healthIndex}<span class="text-lg text-slate-400">/100</span></div>
                    </div>
                    <div class="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-medium" id="pulse-ai-text">
                        ${customExpertConclusions['pulse_ai'] || 'Нажмите кнопку ниже для генерации пульса.'}
                    </div>
                    <button onclick="generatePulseAi()" class="mt-3 w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-md flex items-center justify-center gap-2 transition-transform">
                        🤖 Обновить Пульс
                    </button>
                </div>
            </details>

            <!-- АККОРДЕОН 3: ТЕПЛОВАЯ КАРТА -->
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[12px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl select-none">
                    <span class="flex items-center gap-2">🗺️ Тепловая карта этапов</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-4 border-t border-[var(--card-border)] bg-white dark:bg-slate-800">
                    ${heatmapHtml}
                    <button onclick="generateHeatmapAi()" class="mt-3 w-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 transition-transform">
                        🤖 Анализ Рисков (ИИ)
                    </button>
                    <div id="heatmap-ai-text" class="hidden mt-3 text-[11px] leading-relaxed text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 font-medium"></div>
                </div>
            </details>

            <!-- АККОРДЕОН 4: ТОП ФОТО -->
            ${appSettings.anaOpTopDefects ? `
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[12px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl select-none">
                    <span class="flex items-center gap-2">📸 ТОП-5 Дефектов и Эталонов</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 flex flex-col gap-3">
                    <div class="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                        <h3 class="margin-0 mb-3 font-black text-[10px] text-red-700 dark:text-red-500 uppercase border-b border-red-200 dark:border-red-800 pb-2">🚨 ТОП-5 Критических дефектов (B3)</h3>
                        ${renderUIPhotoCards(topB3, true)}
                    </div>
                    <div class="bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-200 dark:border-orange-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                        <h3 class="margin-0 mb-3 font-black text-[10px] text-orange-700 dark:text-orange-500 uppercase border-b border-orange-200 dark:border-orange-800 pb-2">🔄 ТОП-5 Повторяющихся нарушений (B2)</h3>
                        ${renderUIPhotoCards(topB2, false)}
                    </div>
                    <div class="bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                        <h3 class="margin-0 mb-3 font-black text-[10px] text-green-700 dark:text-green-500 uppercase border-b border-green-200 dark:border-green-800 pb-2">✅ ТОП-5 Эталонных работ (OK)</h3>
                        ${renderUIPhotoCards(topOK, false, true)}
                    </div>
                </div>
            </details>
            ` : ''}

            <!-- АККОРДЕОН 5: УПРАВЛЕНЧЕСКОЕ РЕШЕНИЕ -->
            <details class="${isGlobalDanger ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'} border-2 rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="p-3 font-black text-[12px] ${isGlobalDanger ? 'text-orange-800 dark:text-orange-500' : 'text-green-800 dark:text-green-500'} uppercase tracking-widest cursor-pointer flex justify-between items-center rounded-xl transition-colors select-none">
                    <span class="flex items-center gap-2">🎯 Управленческое Решение</span>
                    <span class="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div class="p-4 border-t ${isGlobalDanger ? 'border-orange-200 dark:border-orange-800' : 'border-green-200 dark:border-green-800'}">
                    <div class="flex justify-between items-center mb-3">
                        <div class="text-[10px] font-black uppercase opacity-70">Стратегия действий</div>
                        <div class="flex gap-2">
                            <button onclick="generateOnePagerForecastAi('${pdcaKey}')" class="text-[9px] font-bold bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded shadow-sm active:scale-95 flex items-center gap-1">🤖 AI-Анализ</button>
                            <button onclick="editExpertText('${pdcaKey}', 'hidden_pdca_text')" class="text-[9px] font-bold bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded shadow-sm active:scale-95 flex items-center gap-1">✏️ Изменить</button>
                        </div>
                    </div>
                    <textarea id="hidden_pdca_text" class="hidden">${rawPdcaText}</textarea>
                    <div class="text-[12px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">${uiPdcaText}</div>
                </div>
            </details>

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

        const ctxLine = document.getElementById('op-line-chart');
        if (ctxLine) {
            const trendData = buildTrendChartData(data, 'contractorName', activeLineFilters, trendGroupings.onepager || 'MONTH');
            trendData.datasets.forEach(ds => { ds.borderWidth = 2; ds.pointRadius = 2; });
            
            if (chartInstances['op-line-chart']) chartInstances['op-line-chart'].destroy();
            chartInstances['op-line-chart'] = new Chart(ctxLine.getContext('2d'), {
                type: 'line',
                data: trendData,
                options: { 
                    animation: false, 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        y: { min: 0, max: 100, ticks: { font: {size: 9} } }, 
                        x: { ticks: { font: {size: 9} } } 
                    }, 
                    plugins: { 
                        legend: { position: 'right', labels: { boxWidth: 8, font: {size: 8} } },
                        title: {
                            display: isTruncatedForChart,
                            text: 'Отображен ТОП-5 лучших и ТОП-5 худших подрядчиков',
                            color: '#94a3b8',
                            font: { size: 10, weight: 'bold' },
                            padding: { bottom: 5 }
                        }
                    } 
                }
            });
        }
    }, 100);
}

// 7. Подвкладка: База данных (Таблица)


// 8. Подвкладка: Детализация подрядчика
// 8. Подвкладка: Детализация подрядчика (с Предиктивным ИИ)
function showContractorDetailView(contractorName) {
    currentDetailedContractor = contractorName;
    document.getElementById('contractors-main-view').classList.add('hidden');
    document.getElementById('contractor-detail-view').classList.remove('hidden');
    document.getElementById('detail-view-title').innerText = contractorName;
    window.scrollTo(0,0);

    const container = document.getElementById('contractor-detail-content');
    const data = getFilteredAnalyticsData().filter(c => c.contractorName + ' [' + (c.projectName || 'Без объекта') + ']' === contractorName);
    
    if (data.length === 0) { container.innerHTML = 'Ошибка данных'; return; }

    const m = getContractorMetrics(data, userTemplates);
    const workType = data[0].templateTitle;

    let cStageData = {}; let cFailCounts = {}; let cB3Counts = {}; 
    let sumB1 = 0, sumB2 = 0, sumB3 = 0;
    let allPhotosB3 = []; let allPhotosB2 = []; let allPhotosOK = [];
    
    data.forEach(unit => {
        const stagesArray = (unit.checkedStagesInfo && unit.checkedStagesInfo.length > 0) ? unit.checkedStagesInfo : [unit.stageName || 'Этап не указан'];
        stagesArray.forEach(stName => {
            if(!cStageData[stName]) cStageData[stName] = { checks: 0, sumUrk: 0, ok: 0, fail: 0, b1: 0, b2: 0, b3: 0 };
            cStageData[stName].checks++;

            if(unit.metrics) { 
                cStageData[stName].sumUrk += unit.metrics.final;
                cStageData[stName].b1 += unit.metrics.n_B1_fail;
                cStageData[stName].b2 += unit.metrics.n_B2_fail;
                cStageData[stName].b3 += unit.metrics.n_B3_fail;
                
                if (stagesArray.indexOf(stName) === 0) {
                    sumB1 += unit.metrics.n_B1_fail; sumB2 += unit.metrics.n_B2_fail; sumB3 += unit.metrics.n_B3_fail;
                }
            }
        });

        if(unit.state) {
            Object.keys(unit.state).forEach(id => {
                const s = unit.state[id];
                let defName = "Дефект";
                let parentStage = 'Этап не указан';
                const tType = unit.templateKey.split('_')[0];
                const tKey = unit.templateKey.replace(tType + '_', '');
                const cl = tType === 'sys' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (userTemplates[tKey] ? userTemplates[tKey].groups : []);
                
                cl.forEach(group => {
                    const found = group.items.find(x => x.id == id);
                    if (found) { defName = found.n; parentStage = group.group || group.title; }
                });

                const photo = (unit.photos && unit.photos[id]) ? unit.photos[id] : null;

                if (s === 'ok' && cStageData[parentStage]) {
                    cStageData[parentStage].ok++;
                    if (photo) allPhotosOK.push({ photo: photo, name: defName, contr: contractorName, date: new Date(unit.date).toLocaleDateString('ru-RU') });
                }
                if ((s === 'fail' || s === 'fail_escalated') && cStageData[parentStage]) {
                    cStageData[parentStage].fail++;
                    const flatList = getFlatList(cl);
                    const foundItem = flatList.find(x => x.id == id);
                    let isB3 = (s === 'fail_escalated') || (foundItem && foundItem.w === 3);

                    if (isB3) {
                        if(!cB3Counts[defName]) cB3Counts[defName] = { count: 0, photo: null, name: defName };
                        cB3Counts[defName].count++;
                        if(photo) allPhotosB3.push({ photo: photo, name: defName, contr: contractorName, date: new Date(unit.date).toLocaleDateString('ru-RU') });
                    } else {
                        if(!cFailCounts[defName]) cFailCounts[defName] = { count: 0, photo: null, name: defName };
                        cFailCounts[defName].count++;
                        if(photo) allPhotosB2.push({ photo: photo, name: defName, contr: contractorName, date: new Date(unit.date).toLocaleDateString('ru-RU') });
                    }
                }
            });
        }
    });

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

    const totalDefects = sumB1 + sumB2 + sumB3;
    const pB1 = totalDefects > 0 ? Math.round((sumB1 / totalDefects) * 100) : 0;
    const pB2 = totalDefects > 0 ? Math.round((sumB2 / totalDefects) * 100) : 0;
    const pB3 = totalDefects > 0 ? Math.round((sumB3 / totalDefects) * 100) : 0;

    let mathBreakdown = `
        <div class="text-[11px] space-y-2 text-slate-700 dark:text-slate-300">
            <p>Система рассчитала Интегральный УрК на основе ${data.length} последних проверок.</p>
            <div class="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                Средний балл по изделиям (до штрафов): <b>${m.baseUrkContrPerc}%</b>
            </div>
            <p><b>Применены следующие штрафные коэффициенты:</b></p>
            <ul class="list-disc pl-4 space-y-1">
                <li><span class="${m.ks < 1 ? 'text-red-500 font-bold' : 'text-green-600'}">Ks = ${m.ks.toFixed(2)}</span> (Системность). Отражает повторяемость одного и того же дефекта B2. В данном случае максимальная частота повтора: ${m.maxFailRate.toFixed(1)}%.</li>
                <li><span class="${m.kcritC < 1 ? 'text-red-500 font-bold' : 'text-green-600'}">KB3 = ${m.kcritC.toFixed(2)}</span> (Критичность). Отражает частоту появления аварийных дефектов B3. Доля проверок с B3: ${m.rateB3.toFixed(1)}%.</li>
            </ul>
            ${(m.ks < 1 || m.kcritC < 1) && m.finalC === 84 ? `<div class="bg-orange-50 text-orange-800 p-2 rounded mt-2 border border-orange-200">⚠️ Сработало правило "Стеклянного потолка" (Cap84). Из-за наличия системных или критических нарушений, итоговая оценка обрезана до 84%.</div>` : ''}
            <p class="mt-2 border-t pt-2 border-slate-200"><b>Вывод для инженера:</b> ${m.reason}</p>
        </div>
    `;

    const expertObj = getExpertConclusion(m, contractorName, workType, data.length, contractorName.replace(/\W/g, '_'), customExpertConclusions);
    const expertUiHtml = expertObj.uiHtml;
    const safeContractorNameForHtml = contractorName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    container.innerHTML = `
        <!-- НОВАЯ КНОПКА: ПЕРСОНАЛЬНЫЙ ОТЧЕТ -->
        <button onclick="exportPersonalContractorReport('${safeContractorNameForHtml}')" class="w-full mb-4 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-95 transition-transform flex justify-center items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"></path></svg> Отправить Отчет Подрядчику
        </button>

        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm mb-4">
            <div class="flex justify-between items-start mb-3 border-b border-[var(--card-border)] pb-3">
                <div onclick="openContractorMathModal('${safeContractorNameForHtml}')" class="cursor-pointer active:scale-95 transition-transform bg-[var(--hover-bg)] p-2 rounded-xl border border-[var(--card-border)] shadow-sm">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">Надежность (ИУрК)</div>
                    <div class="text-5xl font-black leading-none ${m.finalC < 70 ? 'text-red-600' : (m.finalC < 85 ? 'text-orange-500' : 'text-green-600')}">${m.finalC}%</div>
                </div>
                <div class="text-right">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block border border-[var(--card-border)] px-1.5 py-0.5 rounded mb-1 ${m.confCls}">${m.confStatus}</span>
                    <span class="text-[12px] font-black text-slate-700 dark:text-slate-300 block">Ср. УрК Изд: ${m.baseUrkContrPerc}%</span>
                    <div class="text-[10px] font-bold text-slate-500 mt-1">Погрешность: ± ${m.ci95_margin.toFixed(1)}%</div>
                </div>
            </div>
            
            <div class="grid grid-cols-4 gap-2 mb-3 text-center">
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Выборка</div><div class="font-black text-sm">${m.count}</div></div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Стаб-ть</div><div class="font-black text-sm ${m.stabColor}">${m.stabilityIndex}</div></div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Ks</div><div class="font-black text-sm ${m.ks < 1 ? 'text-red-500' : 'text-slate-700'}">${m.ks.toFixed(2)}</div></div>
                <div class="bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]"><div class="text-[8px] text-slate-400 uppercase font-bold">Kcrit</div><div class="font-black text-sm ${m.kcritC < 1 ? 'text-red-500' : 'text-slate-700'}">${m.kcritC.toFixed(2)}</div></div>
            </div>

            <div class="flex h-3 rounded-full overflow-hidden border border-[var(--card-border)]">
                <div class="bg-blue-500" style="width: ${pB1}%"></div>
                <div class="bg-orange-500" style="width: ${pB2}%"></div>
                <div class="bg-red-500" style="width: ${pB3}%"></div>
            </div>
            <div class="flex justify-between text-[9px] font-bold text-slate-500 mt-1.5 px-1 uppercase tracking-wider">
                <span class="bg-blue-50 text-blue-700 px-2 rounded border border-blue-100">B1: ${sumB1}</span>
                <span class="bg-orange-50 text-orange-700 px-2 rounded border border-orange-100">B2: ${sumB2}</span>
                <span class="bg-red-50 text-red-700 px-2 rounded border border-red-100">B3: ${sumB3}</span>
            </div>
        </div>

        <!-- НОВЫЙ БЛОК: ПРЕДИКТИВНЫЙ ИИ ПРОГНОЗ -->
        <details class="bg-[var(--card-bg)] border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden" open>
            <summary class="p-3 font-black text-[11px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 transition-colors">
                <span class="flex items-center gap-2">🔮 Предиктивный прогноз (AI)</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="border-t border-indigo-100 dark:border-indigo-800 p-4 bg-white dark:bg-slate-800">
                <div id="ai-forecast-container">
                    <button onclick="generateContractorForecastAi('${safeContractorNameForHtml}')" class="w-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-sm border border-slate-200 dark:border-slate-600 transition-transform">🤖 Рассчитать прогноз на 2 недели</button>
                </div>
            </div>
        </details>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2">📝 Классическое заключение (PDCA)</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="border-t border-[var(--card-border)] p-1">
                ${expertUiHtml}
            </div>
        </details>
        
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2">🏅 Культура качества (AI)</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                <button onclick="generateCultureAi('${safeContractorNameForHtml}')" class="w-full bg-white border border-indigo-200 text-indigo-700 py-2.5 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 mb-2">🤖 Оценить вовлеченность</button>
                <div id="culture-ai-text" class="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                    ${customExpertConclusions[`culture_${contractorName}`] || 'Нажмите кнопку для генерации оценки вовлеченности подрядчика.'}
                </div>
            </div>
        </details>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2">⚙️ Разбор оценки от Системы</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                ${mathBreakdown}
            </div>
        </details>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                <summary class="p-3 font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span>📉 Динамика по проверкам</span><span>▼</span>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)]">
                    <div style="height: 160px; position: relative;"><canvas id="chart_detail_line"></canvas></div>
                </div>
            </details>
            
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                    <span>📑 Качество по этапам СМР</span><span>▼</span>
                </summary>
                <div class="overflow-x-auto border-t border-[var(--card-border)]">
                    <table class="w-full text-left whitespace-nowrap">
                        <thead class="bg-slate-50 dark:bg-slate-900/50 text-[9px] text-[var(--text-muted)] border-b border-[var(--card-border)] uppercase tracking-wider">
                            <tr><th class="p-2 pl-3">Этап</th><th class="p-2 text-center">Пров.</th><th class="p-2 text-center">УрК</th><th class="p-2 text-center text-green-600">OK</th><th class="p-2 text-center text-orange-500">B2</th><th class="p-2 text-center text-red-600">B3</th></tr>
                        </thead>
                        <tbody class="divide-y divide-[var(--card-border)]">${stagesUIHtml}</tbody>
                    </table>
                </div>
            </details>
        </div>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden" open>
            <summary class="p-3 font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer flex justify-between items-center hover:bg-[var(--hover-bg)] transition-colors rounded-xl">
                <span class="flex items-center gap-2">📸 Фотогалереи (Брак и Эталоны)</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 space-y-4">
                <div>
                    <h3 class="text-[10px] font-black text-red-600 uppercase mb-2">Критический брак (B3)</h3>
                    ${allPhotosB3.length > 0 ? window.initPhotoGallery('det_b3', allPhotosB3, true) : '<div class="text-xs text-slate-400">Нет фото B3</div>'}
                </div>
                <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h3 class="text-[10px] font-black text-orange-600 uppercase mb-2">Значимые дефекты (B2)</h3>
                    ${allPhotosB2.length > 0 ? window.initPhotoGallery('det_b2', allPhotosB2, false) : '<div class="text-xs text-slate-400">Нет фото B2</div>'}
                </div>
                <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h3 class="text-[10px] font-black text-green-600 uppercase mb-2">Эталонные работы (OK)</h3>
                    ${allPhotosOK.length > 0 ? window.initPhotoGallery('det_ok', allPhotosOK, false, 'text-green-700 bg-green-100 border-green-200', 'OK') : '<div class="text-xs text-slate-400">Нет фото эталонов</div>'}
                </div>
            </div>
        </details>
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

// === СИСТЕМА ФОТОГАЛЕРЕЙ (ГОРИЗОНТАЛЬНАЯ ЛЕНТА С ПОДДЕРЖКОЙ ОК) ===
window.rbiPhotoGalleries = {};

window.initPhotoGallery = function(galleryId, photosArray, isCrit, customBadgeClass = null, customBadgeText = null) {
    if (!photosArray || photosArray.length === 0) return '<div class="text-xs text-slate-400">Нет фото</div>';
    
    const badgeColor = customBadgeClass ? customBadgeClass : (isCrit ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200');
    const badgeText = customBadgeText ? customBadgeText : (isCrit ? 'B3' : 'B2');

    const cardsHtml = photosArray.map(d => `
        <div class="snap-start shrink-0 w-36 sm:w-48 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden flex flex-col shadow-sm">
            <img src="${window.getPhotoSrc(d.photo)}" class="w-full h-24 sm:h-32 object-cover border-b border-[var(--card-border)] cursor-pointer active:scale-95 transition-transform" onclick="openPhotoViewer('${d.photo}')" loading="lazy">
            <div class="p-2 flex-1 flex flex-col justify-between">
                <div class="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 mb-1.5" title="${d.name}">${d.name}</div>
                <div>
                    <div class="text-[8px] text-[var(--text-muted)] mb-1 truncate w-full" title="${d.contr}">👤 ${d.contr}</div>
                    <div class="flex justify-between items-center">
                        <span class="${badgeColor} text-[8px] font-black px-1.5 rounded border">${badgeText}</span>
                        <span class="text-[8px] font-bold text-slate-400">${d.date}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    return `
        <div id="gallery-wrap-${galleryId}" class="w-full relative">
            <div class="flex gap-3 overflow-x-auto snap-x custom-scrollbar pb-4 pt-1">
                ${cardsHtml}
            </div>
        </div>
    `;
};

// Пустая заглушка, чтобы не сломать старые HTML-кнопки (если они где-то остались в истории)
window.loadMorePhotos = function() {};


// ============================================================================
// НОВЫЙ МОДУЛЬ: КОНСОЛИДИРОВАННЫЙ ОТЧЕТ КО ДНЮ КАЧЕСТВА (С ВЫБОРОМ ПЕРИОДА)
// ============================================================================

window.rbi_openQualityDaySettings = function(taskId) {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200">📅</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Настройки Отчета</div>`;
    
    document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[12px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            Выберите период для формирования Мега-Отчета. Система агрегирует метрики всех подрядчиков, выберет лучшие практики и запросит ИИ-резюме.
        </div>
        
        <div class="mb-6">
            <label class="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Отчетный период</label>
            <select id="qday-period-select" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none">
                <option value="current_month">За текущий месяц</option>
                <option value="last_month">За прошлый месяц</option>
                <option value="quarter">За последние 3 месяца (Квартал)</option>
                <option value="all_time">За всё время</option>
            </select>
        </div>

        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm">
                Отмена
            </button>
            <button onclick="closeModal(); rbi_executeQualityDayReport('${taskId}')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">
                🚀 Сгенерировать
            </button>
        </div>
    `;
    
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

window.rbi_executeQualityDayReport = async function(taskId) {
    if (!appSettings.aiEnabled) {
        return showToast("⚠️ Для формирования отчета требуется включить DeepSeek AI в настройках!");
    }

    const periodValue = document.getElementById('qday-period-select').value;

    // Показываем лоадер
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200 animate-pulse">🤖</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Сборка Дня Качества</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="flex flex-col items-center justify-center py-4">
            <div class="text-[11px] font-bold text-slate-500 text-center space-y-2">
                <div>📥 Агрегируем метрики подрядчиков...</div>
                <div>📊 Рассчитываем Impact Score команды...</div>
                <div>🏆 Выбираем лучшие практики...</div>
                <div class="text-indigo-600 font-black mt-2">DeepSeek пишет управленческое резюме...</div>
            </div>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    try {
        const now = new Date();
        let startDate, endDate;
        let periodTitle = "";

        if (periodValue === 'current_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            periodTitle = `ИТОГИ: ${now.toLocaleString('ru-RU', {month: 'long', year: 'numeric'})}`;
        } else if (periodValue === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            periodTitle = `ИТОГИ: ${startDate.toLocaleString('ru-RU', {month: 'long', year: 'numeric'})}`;
        } else if (periodValue === 'quarter') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            endDate = new Date();
            periodTitle = `КВАРТАЛЬНЫЙ ОТЧЕТ`;
        } else {
            startDate = new Date(2000, 1, 1);
            endDate = new Date();
            periodTitle = `ОТЧЕТ ЗА ВСЁ ВРЕМЯ`;
        }

        // 1. БАЗА ПРОВЕРОК
        const currentData = contractorArray.filter(c => new Date(c.date) >= startDate && new Date(c.date) <= endDate);
        
        if (currentData.length === 0) {
            closeModal();
            return showToast("⚠️ За выбранный период нет данных для отчета!");
        }

        let sumUrk = 0; currentData.forEach(i => { if(i.metrics) sumUrk += i.metrics.final; });
        const currAvgUrk = Math.round(sumUrk / currentData.length);
        
        const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(currentData, userTemplates) : null;
        const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
        const redZone = currIntMetrics ? currIntMetrics.redZonePerc : 0;

        // 2. HR МЕТРИКИ (КОМАНДА)
        let hrStats = [];
        if (typeof gameCalculateManagerMetrics === 'function') hrStats = gameCalculateManagerMetrics();
        let totalImpact = 0; 
        hrStats.forEach(h => { totalImpact += h.avgImpact; });
        const avgTeamImpact = hrStats.length > 0 ? (totalImpact / hrStats.length) : 0;
        const bestEng = hrStats.length > 0 ? hrStats.sort((a,b) => b.pi - a.pi)[0] : { name: "Нет данных", checks: 0 };

        // 3. ТОП ПРАКТИК
        let topPracticesHtml = `<div style="color:#64748b; font-size:10px;">Практик в этом периоде не публиковалось.</div>`;
        if (typeof window.rbi_practicesData !== 'undefined' && window.rbi_practicesData.length > 0) {
            const topPrac = [...window.rbi_practicesData].filter(p => new Date(p.date) >= startDate && new Date(p.date) <= endDate).sort((a,b) => b.deltaUrk - a.deltaUrk).slice(0, 2);
            if (topPrac.length > 0) {
                topPracticesHtml = topPrac.map(p => `
                    <div style="border:1px solid #cbd5e1; border-left:4px solid #16a34a; padding:10px; border-radius:6px; margin-bottom:10px; background:white; page-break-inside: avoid;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <strong style="font-size:12px; color:#0f172a;">${p.title}</strong>
                            <span style="color:#16a34a; font-weight:900;">+${p.deltaUrk}% УрК</span>
                        </div>
                        <div style="font-size:10px; color:#64748b; margin-bottom:5px;">Автор: ${p.author} | ${p.templateTitle}</div>
                        <table style="width:100%; border-collapse:collapse; font-size:10px;">
                            <tr>
                                <td style="width:50%; vertical-align:top; padding-right:5px;">
                                    <div style="color:#dc2626; font-weight:bold; margin-bottom:2px;">❌ Проблема:</div>
                                    <div style="color:#1e293b;">${p.problem}</div>
                                </td>
                                <td style="width:50%; vertical-align:top; padding-left:5px;">
                                    <div style="color:#16a34a; font-weight:bold; margin-bottom:2px;">✅ Решение:</div>
                                    <div style="color:#1e293b;">${p.solution}</div>
                                </td>
                            </tr>
                        </table>
                    </div>
                `).join('');
            }
        }

        // 4. КОРЕННЫЕ ПРИЧИНЫ (Парето)
        const causes = {};
        currentData.forEach(c => {
            if (c.state && c.details) {
                Object.keys(c.state).forEach(id => {
                    if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                        const code = c.details[id]?.causeCode || 'C00';
                        causes[code] = (causes[code] || 0) + 1;
                    }
                });
            }
        });
        
        let causesHtml = '';
        const sortedCauses = Object.keys(causes).sort((a,b) => causes[b] - causes[a]).slice(0, 5);
        if (sortedCauses.length > 0) {
            causesHtml = sortedCauses.map(code => {
                const cName = (typeof DEFECT_CAUSES !== 'undefined' ? DEFECT_CAUSES.find(x => x.code === code)?.name : 'Причина') || 'Иное';
                return `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:6px 0; font-size:11px;">
                    <span style="color:#334155;">${cName}</span>
                    <span style="font-weight:bold; color:#0f172a;">${causes[code]} шт.</span>
                </div>`;
            }).join('');
        } else {
            causesHtml = `<div style="color:#64748b; font-size:10px;">Дефектов не выявлено.</div>`;
        }

        // 5. DEEPSEEK - АНАЛИЗ ДЛЯ РЕЗЮМЕ
        const promptSystem = `Ты — Директор по качеству (CQC). Сформируй официальное управленческое резюме для отчета "День Качества" за выбранный период.
        Тон: деловой, объективный, строгий. Формат: текст, разбитый на абзацы. Без воды.
        Отрази 3 вещи: 1. Оценку ИКО и тренда. 2. Оценку работы инженеров (Impact Score). 3. Главный риск следующего периода.`;
        
        const promptUser = `ИКО: ${IKO}. Красная зона: ${redZone}%. Средний Impact команды: ${avgTeamImpact.toFixed(2)}. Проверок за период: ${currentData.length}. ТОП проблема: ${sortedCauses.length > 0 ? sortedCauses[0] : 'Нет данных'}.`;

        const aiSummary = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 800 });

        closeModal();

        // 6. СБОРКА HTML ДЛЯ ПЕЧАТИ
        const pdfContent = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 24pt; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">КОНСОЛИДИРОВАННЫЙ ОТЧЕТ КО ДНЮ КАЧЕСТВА</h1>
                <div style="font-size: 14pt; color: #4f46e5; font-weight: 900; margin-top: 5px; text-transform:uppercase;">${periodTitle}</div>
            </div>

            <!-- БЛОК 1: AI-РЕЗЮМЕ -->
            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 14pt; text-transform: uppercase;">🧠 УПРАВЛЕНЧЕСКОЕ РЕЗЮМЕ (DEEPSEEK AI)</h2>
                <div style="font-size: 11pt; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-weight: 500;">${aiSummary}</div>
            </div>

            <!-- БЛОК 2: МАКРОПОКАЗАТЕЛИ -->
            <table style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                <tr>
                    <td style="background:#f8fafc; border:2px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:9pt; color:#64748b; text-transform:uppercase; font-weight:bold;">Индекс Риска (ИКО)</div>
                        <div style="font-size:28pt; font-weight:900; color:${parseFloat(IKO) >= 0.6 ? '#dc2626' : '#16a34a'};">${IKO}</div>
                    </td>
                    <td style="background:#fef2f2; border:2px solid #fca5a5; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:9pt; color:#991b1b; text-transform:uppercase; font-weight:bold;">Объем Красной Зоны</div>
                        <div style="font-size:28pt; font-weight:900; color:#dc2626;">${redZone}%</div>
                    </td>
                    <td style="background:#f0fdf4; border:2px solid #bbf7d0; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:9pt; color:#166534; text-transform:uppercase; font-weight:bold;">Impact Score Команды</div>
                        <div style="font-size:28pt; font-weight:900; color:#16a34a;">${avgTeamImpact > 0 ? '+' : ''}${avgTeamImpact.toFixed(2)}</div>
                    </td>
                </tr>
            </table>

            <div style="page-break-before: always;"></div>

            <!-- БЛОК 3: ПРАКТИКИ И ПРИЧИНЫ -->
            <table style="width: 100%; border-spacing: 20px 0; border-collapse: separate; table-layout: fixed; margin-left: -20px; margin-bottom: 20px;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">🏆 Лучшие практики периода</h2>
                        ${topPracticesHtml}
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">🔍 Топ причин брака (Парето)</h2>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px;">
                            ${causesHtml}
                        </div>
                        
                        <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 25px; margin-bottom: 15px;">👤 Рейтинг Инженеров</h2>
                        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px;">
                            <div style="font-size: 11pt; font-weight: bold; color: #1e293b; margin-bottom: 5px;">Лучший по Опыту (XP): <span style="color:#4f46e5;">${bestEng.name}</span></div>
                            <div style="font-size: 9pt; color: #64748b;">Проверок: ${bestEng.checks} | Строгость: ${bestEng.strictness > 0 ? '+'+bestEng.strictness.toFixed(1) : bestEng.strictness?.toFixed(1)}</div>
                        </div>
                    </td>
                </tr>
            </table>
        `;

        // Закрываем задачу в планировщике, так как отчет сформирован
        if (taskId) {
            const task = window.rbi_tasksData.find(t => t.id === taskId);
            if(task) { 
                task.status = 'done'; 
                task.resultComment = 'Отчет сгенерирован'; 
                await dbPut(STORES.TASKS, task); 
                rbi_renderTasksList(); // Обновляем списки задач на экране
            }
        }

        // Запускаем печать. Передаем "browser", чтобы открылось системное окно печати/сохранения PDF
        printPdfShell(`День Качества`, pdfContent, "A4", "landscape", "browser");

    } catch (e) {
        closeModal();
        showToast("❌ Ошибка сборки отчета: " + e.message);
    }
};
