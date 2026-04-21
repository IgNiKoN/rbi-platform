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

    // ЖЕСТКО СКРЫВАЕМ ФИЛЬТРЫ И КНОПКУ НА ВКЛАДКЕ HR
    const filtersBlock = document.getElementById('analytics-filters-block');
    if (tabId === 'sub-engineer-rating') {
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
    else if (currentActiveAnalyticsTab === 'sub-engineer-rating') { if(typeof gameRenderDashboard === 'function') gameRenderDashboard(); }
    else if (currentActiveAnalyticsTab === 'sub-data') renderDataSubTab(data);
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
    if (ratingData.length <= 10) {
        defaultChartContrs = ratingData.map(r => r.name);
    } else {
        defaultChartContrs = [...ratingData.slice(0, 5).map(r => r.name), ...ratingData.slice(-5).map(r => r.name)];
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
        if (arr.length === 0) return `<div class="text-center py-6 text-[var(--text-muted)] text-[11px] bg-[var(--hover-bg)] rounded-lg border border-dashed border-[var(--card-border)]">${isOk ? 'Эталонов нет' : 'Дефектов не зафиксировано'}</div>`;
        return `<div class="grid grid-cols-5 gap-1.5 min-[400px]:gap-2">
            ${arr.map(d => {
                const imgHtml = d.photo ? `<img src="${d.photo}" class="w-full h-14 min-[400px]:h-20 object-cover border-b border-[var(--card-border)] cursor-pointer active:scale-95" onclick="openPhotoViewer(this.src)">` : `<div class="w-full h-14 min-[400px]:h-20 bg-[var(--hover-bg)] flex items-center justify-center text-[var(--card-border)] text-[8px] border-b border-[var(--card-border)] text-center px-1">НЕТ ФОТО</div>`;
                let badgeColor = isCrit ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200';
                let badgeText = isCrit ? 'B3' : 'B2';
                if (isOk) { badgeColor = 'text-green-700 bg-green-100 border-green-200'; badgeText = 'OK'; }
                return `
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-hidden flex flex-col shadow-sm">
                    ${imgHtml}
                    <div class="p-1 flex-1 flex flex-col justify-between">
                        <div class="text-[7px] min-[400px]:text-[8px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-2 mb-1" title="${d.name}">${d.name}</div>
                        <div>
                            <div class="text-[6px] min-[400px]:text-[7px] text-[var(--text-muted)] mb-0.5 truncate w-full" title="${d.contr}">👤 ${d.contr}</div>
                            <div class="flex justify-between items-center"><span class="${badgeColor} text-[6px] min-[400px]:text-[7px] font-black px-1 rounded border">${badgeText}</span><span class="text-[7px] font-black text-[var(--text-muted)]">${d.count} шт</span></div>
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
                    <div class="flex justify-between items-center mb-2">
                        <div class="text-[10px] font-black text-[var(--text-muted)] uppercase">Динамика Подрядчиков (Средний УРк)</div>
                        <button onclick="openChartFilterModal('onepager')" class="text-[9px] font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 rounded px-2 py-1 active:scale-95 shadow-sm">⚙️ Фильтр линий</button>
                    </div>
                    <div style="height: 180px; position: relative;"><canvas id="op-line-chart"></canvas></div>
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

                <div class="flex-1 bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800/50 rounded-xl p-3 shadow-sm flex flex-col">
                    <h3 class="margin-0 mb-3 font-black text-[10px] text-green-700 dark:text-green-500 uppercase border-b border-green-200 dark:border-green-800 pb-2">
                        ✅ ТОП-5 Эталонных работ (OK)
                    </h3>
                    <div class="flex-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        ${renderUIPhotoCards(topOK, false, true)}
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

        const ctxLine = document.getElementById('op-line-chart');
        if (ctxLine) {
            const trendData = buildTrendChartData(data, 'contractorName', activeLineFilters, trendGroupings.onepager || 'MONTH');
            trendData.datasets.forEach(ds => { ds.borderWidth = 2; ds.pointRadius = 2; });
            
            if (chartInstances['op-line-chart']) chartInstances['op-line-chart'].destroy();
            chartInstances['op-line-chart'] = new Chart(ctxLine.getContext('2d'), {
                type: 'line',
                data: trendData,
                options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { font: {size: 9} } }, x: { ticks: { font: {size: 9} } } }, plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: {size: 8} } } } }
            });
        }
    }, 100);
}

// 7. Подвкладка: База данных (Таблица)
async function renderDataSubTab(data) {
    const container = document.getElementById('sub-data');
    if(!container) return;

    // Читаем логи из IndexedDB (через обертку)
    let logs = [];
    try {
        const logsObj = await dbGet(STORES.SETTINGS, 'backup_logs');
        if (logsObj && logsObj.data) logs = logsObj.data;
    } catch(e) {}

    let logsHtml = logs.length === 0 ? 
        `<tr><td colspan="4" class="text-center py-4 text-[10px] text-slate-400 italic">Реестр пуст</td></tr>` : 
        logs.map(l => `
            <tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <td class="py-2 pr-2 text-[9px] text-slate-500 whitespace-nowrap">${l.dateStr}</td>
                <td class="py-2 px-2 text-[10px] font-bold text-slate-800 dark:text-slate-200">${l.type}</td>
                <td class="py-2 px-2 text-[9px] text-slate-500 text-center">${l.stats?.checks || 0}</td>
                <td class="py-2 pl-2 text-[8px] text-slate-400 truncate max-w-[100px]" title="${l.fileName}">${l.fileName}</td>
            </tr>
        `).join('');

    // Сбор статистики для кнопок
    const statsFull = { checks: contractorArray.length, photos: countPhotos(contractorArray), twi: customTwiCards.length, tmpl: Object.keys(userTemplates).length };
    
    const lastFullDate = localStorage.getItem('last_full_backup_date');
    const incArray = lastFullDate ? contractorArray.filter(c => new Date(c.date) > new Date(lastFullDate)) : contractorArray;
    const statsInc = { checks: incArray.length, photos: countPhotos(incArray), twi: customTwiCards.length, tmpl: Object.keys(userTemplates).length };

    const filteredArray = getFilteredAnalyticsData();
    const statsFilt = { checks: filteredArray.length, photos: countPhotos(filteredArray), twi: customTwiCards.length, tmpl: Object.keys(userTemplates).length };

    const btnStyle = "flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform cursor-pointer hover:border-indigo-300";
    const iconStyle = "w-6 h-6 text-indigo-500";

    container.innerHTML = `
        <div class="space-y-5 mx-1 pb-8 mt-2">
            
            <!-- БЛОК 1: СКАЧАТЬ БЭКАП -->
            <div>
                <div class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 pl-1">Скачать бэкап</div>
                <div class="flex gap-2">
                    <div onclick="handleDataExport('json', 'incremental')" class="${btnStyle} ${statsInc.checks === 0 ? 'opacity-50 pointer-events-none' : ''}">
                        <svg class="${iconStyle}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg>
                        <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase">Новое</div>
                        <div class="text-[8px] font-bold text-slate-500 text-center leading-tight">${statsInc.checks} пров.<br>${statsInc.photos} фото</div>
                    </div>
                    <div onclick="handleDataExport('json', 'full')" class="${btnStyle}">
                        <svg class="${iconStyle}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"></path></svg>
                        <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase">Всё</div>
                        <div class="text-[8px] font-bold text-slate-500 text-center leading-tight">${statsFull.checks} пров.<br>${statsFull.photos} фото</div>
                    </div>
                    <div onclick="handleDataExport('json', 'filtered')" class="${btnStyle}">
                        <svg class="${iconStyle}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"></path></svg>
                        <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase">По фильтру</div>
                        <div class="text-[8px] font-bold text-slate-500 text-center leading-tight">${statsFilt.checks} пров.<br>${statsFilt.photos} фото</div>
                    </div>
                </div>
            </div>

            <!-- БЛОК 2: ВОССТАНОВЛЕНИЕ И ОТПРАВКА -->
            <div>
                <div class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 pl-1">Восстановление и отправка</div>
                <div class="flex gap-2">
                    <button onclick="triggerDataImport()" class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3.5 rounded-xl font-black text-[10px] text-slate-700 dark:text-slate-300 uppercase active:scale-95 shadow-sm transition-transform flex items-center justify-center gap-2">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path></svg>
                        Загрузить файл
                    </button>
                    <button onclick="openShareModal()" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 shadow-md transition-transform flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"></path></svg>
                        Отправить бэкап
                    </button>
                </div>
            </div>

            <!-- БЛОК 3: РЕЕСТР -->
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <div class="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg> Реестр выгруженных бэкапов</div>
                    <button onclick="clearBackupRegistry()" class="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-800 active:scale-95 uppercase">Очистить историю</button>
                </div>
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse">
                        <thead class="border-b border-slate-200 dark:border-slate-700 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            <tr><th class="py-2 pr-2">Дата и время</th><th class="py-2 px-2">Тип операции</th><th class="py-2 px-2 text-center">Пров.</th><th class="py-2 pl-2">Имя файла</th></tr>
                        </thead>
                        <tbody>${logsHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 8. Подвкладка: Детализация подрядчика
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
    
    // ВАЖНО: Инициализируем все 3 массива фотографий
    let allPhotosB3 = []; let allPhotosB2 = []; let allPhotosOK = [];
    
    data.forEach(unit => {
        const stagesArray = (unit.checkedStagesInfo && unit.checkedStagesInfo.length > 0) 
                            ? unit.checkedStagesInfo 
                            : [unit.stageName || 'Этап не указан'];
        
        stagesArray.forEach(stName => {
            if(!cStageData[stName]) cStageData[stName] = { checks: 0, sumUrk: 0, ok: 0, fail: 0, b1: 0, b2: 0, b3: 0 };
            cStageData[stName].checks++;

            if(unit.metrics) { 
                cStageData[stName].sumUrk += unit.metrics.final;
                cStageData[stName].b1 += unit.metrics.n_B1_fail;
                cStageData[stName].b2 += unit.metrics.n_B2_fail;
                cStageData[stName].b3 += unit.metrics.n_B3_fail;
                
                if (stagesArray.indexOf(stName) === 0) {
                    sumB1 += unit.metrics.n_B1_fail;
                    sumB2 += unit.metrics.n_B2_fail;
                    sumB3 += unit.metrics.n_B3_fail;
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
                    // Собираем фото эталонов
                    if (photo) {
                        allPhotosOK.push({ photo: photo, name: defName, contr: contractorName, date: new Date(unit.date).toLocaleDateString('ru-RU') });
                    }
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

    container.innerHTML = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm mb-4">
            <div class="flex justify-between items-start mb-3 border-b border-[var(--card-border)] pb-3">
                <div onclick="openContractorMathModal('${contractorName.replace(/'/g, "\\'")}')" class="cursor-pointer active:scale-95 transition-transform bg-[var(--hover-bg)] p-2 rounded-xl border border-[var(--card-border)] shadow-sm">
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

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 font-black text-[11px] text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 transition-colors">
                <span class="flex items-center gap-2">📝 Экспертное заключение ИИ</span>
                <span class="transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div class="border-t border-[var(--card-border)] p-1">
                ${expertUiHtml}
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
            <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
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

        <!-- ГАЛЕРЕИ (С ЭТАЛОНАМИ OK) -->
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

// === СИСТЕМА ФОТОГАЛЕРЕЙ (ГОРИЗОНТАЛЬНАЯ ЛЕНТА С ПОДДЕРЖКОЙ ОК) ===
window.rbiPhotoGalleries = {};

window.initPhotoGallery = function(galleryId, photosArray, isCrit, customBadgeClass = null, customBadgeText = null) {
    if (!photosArray || photosArray.length === 0) return '<div class="text-xs text-slate-400">Нет фото</div>';
    
    const badgeColor = customBadgeClass ? customBadgeClass : (isCrit ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200');
    const badgeText = customBadgeText ? customBadgeText : (isCrit ? 'B3' : 'B2');

    const cardsHtml = photosArray.map(d => `
        <div class="snap-start shrink-0 w-36 sm:w-48 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden flex flex-col shadow-sm">
            <img src="${d.photo}" class="w-full h-24 sm:h-32 object-cover border-b border-[var(--card-border)] cursor-pointer active:scale-95 transition-transform" onclick="openPhotoViewer(this.src)" loading="lazy">
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