/* Файл: js/export.js */
// === МОДУЛЬ ГЕНЕРАЦИИ ОТЧЕТОВ (PDF, CSV, ПАСПОРТА) ===

// 1. Главный обработчик всплывающего меню выгрузки
function handleFabExportAction(actionType) {
    closeFabExportMenu();
    const data = getFilteredAnalyticsData();
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    showToast('⏳ Формируем отчет, подождите...');
    
    setTimeout(() => {
        if (actionType === 'current') {
            exportPdfCurrentScreen(data);
        } else if (actionType === 'full_report') {
            exportPdfFullObjectReport(data);
        } else if (actionType === 'poster') {
            exportPdfPoster(data);
        }
    }, 500);
}

// 6. Сводный отчет для руководителя (One-Pager - Формат А3 Альбомный)
function exportPdfOnePager(data) {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    // 1. Данные шапки
    const projName = document.getElementById('inp-project')?.value || 'Не указан';
    const inspName = document.getElementById('inp-inspector')?.value || 'Не указан';

    // 2. Метрики ТЕКУЩЕГО периода
    let sumUrk = 0; let sumB3 = 0;
    data.forEach(i => { if(i.metrics) { sumUrk += i.metrics.final; sumB3 += i.metrics.n_B3_fail; } });
    const currAvgUrk = data.length > 0 ? Math.round(sumUrk / data.length) : 0;
    
    const groupedC = {};
    data.forEach(item => { 
        const cKey = item.contractorName + ' [' + (item.projectName || 'Без объекта') + ']';
        groupedC[cKey] = groupedC[cKey] || []; 
        groupedC[cKey].push(item); 
    });
    const currContractorsCount = Object.keys(groupedC).length;

    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
    const mData = currIntMetrics || { redZonePerc: 0, IKO: "0.00", ikoColor: "text-slate-500" };
    
    let pdfIkoColor = "#64748b";
    if (mData.ikoColor.includes('red')) pdfIkoColor = "#dc2626";
    else if (mData.ikoColor.includes('orange')) pdfIkoColor = "#f59e0b";
    else if (mData.ikoColor.includes('green')) pdfIkoColor = "#16a34a";

    const ratingData = [];
    for(let cName in groupedC) {
        if (groupedC[cName].length >= 3) {
            const m = getContractorMetrics(groupedC[cName], userTemplates);
            if (m) ratingData.push({ name: cName, val: m.finalC, count: m.count, isPrelim: m.count < 7 });
        }
    }
    ratingData.sort((a,b) => b.val - a.val);

    // 3. Метрики ПРОШЛОГО периода (для трендов)
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

    const renderPdfTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === "" || isNaN(prev)) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:10px; font-weight:bold; background:#f1f5f9; padding:2px 4px; border-radius:4px;">Нет базы</span></div>`;
        let diff = parseFloat(curr) - parseFloat(prev);
        if (Math.abs(diff) < 0.01) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:14px; font-weight:900;">▬ 0</span><div style="font-size:8px; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
        const color = (inverse ? diff < 0 : diff > 0) ? '#16a34a' : '#dc2626'; 
        const sign = diff > 0 ? '▲' : '▼';
        return `<div style="text-align:right;"><span style="color:${color}; font-size:16px; font-weight:900;">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff)?0:2)}</span><div style="font-size:8px; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
    };

    // 4. Фотографии дефектов
    let b3Map = {}; let b2Map = {}; let okMap = {};
    data.forEach(i => {
        if(i.state && i.details) {
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
                        if (!b3Map[defName]) b3Map[defName] = { count: 0, photo: null, contr: i.contractorName + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                        b3Map[defName].count++;
                        if (photo) b3Map[defName].photo = photo; 
                    } else {
                        if (!b2Map[defName]) b2Map[defName] = { count: 0, photo: null, contr: i.contractorName + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                        b2Map[defName].count++;
                        if (photo) b2Map[defName].photo = photo;
                    }
                } else if (s === 'ok' && photo) {
                    if (!okMap[defName]) okMap[defName] = { count: 0, photo: null, contr: i.contractorName + ' [' + (i.projectName || 'Без объекта') + ']', name: defName };
                    okMap[defName].count++;
                    if (photo) okMap[defName].photo = photo;
                }
            });
        }
    });

    const topB3 = Object.values(b3Map).sort((a,b) => b.count - a.count).slice(0, 5);
    const topB2 = Object.values(b2Map).sort((a,b) => b.count - a.count).slice(0, 5);
    const topOK = Object.values(okMap).sort((a,b) => b.count - a.count).slice(0, 5);

    // Спец-рендер для сетки 5x2 (огромные фото, минимум текста)
    const renderPhotoGridRow = (arr, type) => {
        while(arr.length < 5) { arr.push({ empty: true }); }
        let badgeColor = type === 'b3' ? '#dc2626' : (type === 'b2' ? '#d97706' : '#16a34a');
        return `<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; height:100%;">
            ${arr.slice(0, 5).map(d => {
                if (d.empty) return `<div style="border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc; height:100%;"></div>`;
                const imgHtml = d.photo ? `<img src="${d.photo}" style="width:100%; height:100%; object-fit:contain; background-color:#f1f5f9; position:absolute; inset:0;">` : `<div style="width:100%; height:100%; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#cbd5e1; font-size:12px; font-weight:bold;">НЕТ ФОТО</div>`;
                return `
                <div style="border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; background:white; box-shadow:0 2px 4px rgba(0,0,0,0.05); position:relative;">
                    <div style="position:relative; flex:1; min-height: 120px;">${imgHtml}</div>
                    <div style="padding:6px 8px; height: 50px; background: white; border-top:2px solid ${badgeColor}; display:flex; flex-direction:column; justify-content:center; z-index: 2;">
                        <div style="font-size:10px; font-weight:900; color:#0f172a; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${d.name}</div>
                        <div style="font-size:9px; color:#64748b; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:bold;">👤 ${d.contr} (${d.count} шт)</div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    };

    // 5. Забираем графики
    const cSpark = document.getElementById('op-sparkline-chart');
    const imgSpark = cSpark ? `<img style="width:100%; height:55px; object-fit:fill; opacity:0.8;" src="${cSpark.toDataURL('image/png')}">` : '';

    const cLine = document.getElementById('op-line-chart');
    const imgLine = cLine ? `<img style="max-width:100%; height:180px; object-fit:contain;" src="${cLine.toDataURL('image/png')}">` : '';

    const pdcaTextRaw = document.getElementById('hidden_pdca_text')?.value || "Нет данных для формирования решения.";
    const pdfFormattedText = pdcaTextRaw.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;">$1</div>').replace(/\n/g, '<br>');
    let periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';
    if (document.getElementById('global-filter-period')?.value === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        if (dFrom || dTo) {
            const fmt = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '...';
            periodText = `с ${fmt(dFrom)} по ${fmt(dTo)}`;
        }
    }

    // 6. Рейтинг (Диаграмма)
    let ratingHtml = '';
    if (ratingData.length === 0) {
        ratingHtml = '<div style="font-size:10px; color:#94a3b8; text-align:center; padding: 20px;">Нет данных</div>';
    } else {
        const renderRow = (r) => `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom: 6px;">
                <div style="width:100px; font-size:11px; font-weight:bold; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.name}</div>
                <div style="flex:1; background:#e2e8f0; height:12px; border-radius:6px; overflow:hidden; border:1px solid #cbd5e1;">
                    <div style="width:${r.val}%; background:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')}; height:100%; border-radius:6px;"></div>
                </div>
                <div style="width:30px; text-align:right; font-size:11px; font-weight:900; color:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')};">
                    ${r.isPrelim ? '<span style="font-size:8px;">⚠️</span>' : ''}${r.val}%
                </div>
            </div>`;
            
        if (ratingData.length <= 10) {
            ratingHtml = ratingData.map(renderRow).join('');
        } else {
            ratingHtml = ratingData.slice(0, 5).map(renderRow).join('') + 
                         `<div style="text-align:center; font-size:9px; color:#94a3b8; font-weight:bold; padding:2px 0; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:2px 0; text-transform:uppercase;">... Скрыто ${ratingData.length - 10} ...</div>` + 
                         ratingData.slice(-5).map(renderRow).join('');
        }
    }

    // 7. СБОРКА СТРАНИЦЫ (ЛЕВАЯ КОЛОНКА 28% И ПРАВАЯ 72%)
    const content = `
        <style>
            .header { display: none !important; } 
            @page { margin: 5mm; size: A3 landscape; } 
            .main-wrapper { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 270mm; box-sizing: border-box; page-break-inside: avoid; } 
            @media print {
                html, body { height: 100vh; max-height: 100vh; overflow: hidden; }
            }
        </style>
        
        <div class="main-wrapper">
            <!-- ШАПКА -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1e293b; padding-bottom:8px; margin-bottom:15px; flex-shrink: 0;">
                <div>
                    <h1 style="font-size:26px; margin:0; color:#0f172a; text-transform:uppercase; letter-spacing: -0.5px;">Сводный статус объекта: ${projName}</h1>
                    <div style="font-size:14px; font-weight:bold; color:#4f46e5; margin-top:4px;">Инженер: ${inspName} | Период: ${periodText}</div>
                </div>
                <div style="text-align:right; font-size:12px; color:#64748b; line-height:1.4;">
                    Сформировано: <b>${new Date().toLocaleString('ru-RU')}</b><br>
                    База: <b>${data.length} независимых проверок</b>
                </div>
            </div>
            
            <!-- ОСНОВНАЯ СЕТКА -->
            <div style="display: flex; gap: 20px; flex: 1; align-items: stretch; overflow: hidden;">
                
                <!-- ЛЕВАЯ КОЛОНКА (28%) -->
                <div style="width: 28%; display: flex; flex-direction: column; gap: 12px;">
                    
                    <!-- KPI (Сетка 2x3) -->
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; flex-shrink: 0;">
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">${currAvgUrk}%</span>
                                ${renderPdfTrend(currAvgUrk, prevAvgUrk, trendLabel)}
                            </div>
                        </div>
                        <div style="background: ${parseFloat(mData.IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 10px; border-radius: 8px; border: 1px solid ${parseFloat(mData.IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 26px; font-weight: 900; color: ${pdfIkoColor}; line-height: 1;">${mData.IKO}</span>
                                ${renderPdfTrend(mData.IKO, prevIko, trendLabel, true)}
                            </div>
                        </div>
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">${data.length}</span>
                                ${renderPdfTrend(data.length, prevChecks, trendLabel)}
                            </div>
                        </div>
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Подрядчиков</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">${currContractorsCount}</span>
                                ${renderPdfTrend(currContractorsCount, prevContrsCount, trendLabel)}
                            </div>
                        </div>
                        <div style="background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fecaca; position: relative;">
                            <div style="font-size: 9px; color: #991b1b; text-transform: uppercase; font-weight: 900;">В красной зоне</div>
                            <div style="font-size: 26px; font-weight: 900; color: #dc2626; margin-top: 5px; line-height: 1;">${mData.redZonePerc}%</div>
                            <div style="font-size: 8px; color: #b91c1c; margin-top: 2px; font-weight:bold;">ОТ ОБЪЕМА</div>
                        </div>
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; position: relative; overflow:hidden;">
                            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900; z-index: 10; position: relative;">Тренд УрК (6 нед)</div>
                            <div style="position: absolute; bottom: 0; left: 0; right: 0;">${imgSpark}</div>
                        </div>
                    </div>

                    <!-- График Линии -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; flex-shrink: 0;">
                        <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 5px;">📈 Динамика Подрядчиков (Среднний УРк)</div>
                        ${imgLine ? `<img style="max-width:100%; height:180px; object-fit:contain;" src="${cLine.toDataURL('image/png')}">` : '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}
                    </div>

                    <!-- Рейтинг -->
                    <div style="flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; overflow: hidden;">
                        <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; text-align: center;">🏆 Интегральный УрК</div>
                        <div style="flex: 1; overflow: hidden;">
                            ${ratingHtml}
                        </div>
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА (72%) - Фото и Выводы -->
                <div style="width: 72%; display: flex; flex-direction: column; gap: 15px;">
                    
                    <!-- БЛОК ФОТО (3 РЯДА x 5 ФОТО) -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px; min-height: 0;">
                        <div style="flex: 1; background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 10px; display: flex; flex-direction: column;">
                            <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #dc2626; text-transform: uppercase;">🚨 ТОП-5 Критических дефектов (B3)</h3>
                            <div style="flex: 1; min-height: 0;">${renderPhotoGridRow(topB3, 'b3')}</div>
                        </div>

                        <div style="flex: 1; background: #fffbeb; border: 2px solid #fde68a; border-radius: 8px; padding: 10px; display: flex; flex-direction: column;">
                            <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #d97706; text-transform: uppercase;">🔄 ТОП-5 Повторяющихся нарушений (B2)</h3>
                            <div style="flex: 1; min-height: 0;">${renderPhotoGridRow(topB2, 'b2')}</div>
                        </div>
                        
                        <div style="flex: 1; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 8px; padding: 10px; display: flex; flex-direction: column;">
                            <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #16a34a; text-transform: uppercase;">✅ ТОП-5 Эталонных работ (OK)</h3>
                            <div style="flex: 1; min-height: 0;">${renderPhotoGridRow(topOK, 'ok')}</div>
                        </div>
                    </div>

            </div>
        </div>
    `;
    
    printPdfShell("Сводка для Руководства", content, "A3");
}



// 4. Расчет данных для плаката качества
function generatePosterData() {
    const now = new Date();
    const lastWeekEnd = new Date(now);
    const day = lastWeekEnd.getDay() || 7;
    lastWeekEnd.setDate(lastWeekEnd.getDate() - day); 
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); 
    lastWeekStart.setHours(0, 0, 0, 0);

    const weekData = contractorArray.filter(i => {
        const d = new Date(i.date);
        return d >= lastWeekStart && d <= lastWeekEnd;
    });

    const grouped = {};
    weekData.forEach(item => { 
        if(!grouped[item.contractorName]) grouped[item.contractorName] = []; 
        grouped[item.contractorName].push(item); 
    });

    const candidates = [];
    let globalUrkSum = 0; let globalB3Count = 0;

    for (let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) { 
            const m = getContractorMetrics(cData, userTemplates);
            if (m) {
                let bestPhoto = null; let worstPhoto = null; let worstDefectName = '';
                cData.forEach(check => {
                    globalUrkSum += check.metrics.final;
                    globalB3Count += check.metrics.n_B3_fail;
                    if(check.photos && check.state) {
                        Object.keys(check.state).forEach(id => {
                            if(check.state[id] === 'ok' && check.photos[id]) bestPhoto = check.photos[id];
                            if((check.state[id] === 'fail' || check.state[id] === 'fail_escalated') && check.photos[id]) {
                                worstPhoto = check.photos[id];
                                const tType = check.templateKey.split('_')[0];
                                const tKey = check.templateKey.replace(tType + '_', '');
                                const cl = tType === 'sys' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (userTemplates[tKey] ? userTemplates[tKey].groups : []);
                                const foundItem = getFlatList(cl).find(x => x.id == id);
                                if(foundItem) worstDefectName = foundItem.n;
                            }
                        });
                    }
                });

                candidates.push({ name: cName, workType: cData[0].templateTitle, metrics: m, bestPhoto, worstPhoto, worstDefectName });
            }
        }
    }

    const avgObjectUrk = weekData.length > 0 ? Math.round(globalUrkSum / weekData.length) : 0;
    const ikoMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(weekData, userTemplates) : null;

    candidates.sort((a, b) => b.metrics.finalC - a.metrics.finalC);
    const leaders = candidates.filter(c => c.metrics.finalC >= 85).slice(0, 3);
    
    let antiLeaders = candidates.filter(c => c.metrics.n_изделий_с_B3 > 0 || c.metrics.finalC < 70);
    antiLeaders.sort((a, b) => {
        if (b.metrics.n_изделий_с_B3 !== a.metrics.n_изделий_с_B3) return b.metrics.n_изделий_с_B3 - a.metrics.n_изделий_с_B3;
        return a.metrics.finalC - b.metrics.finalC;
    });
    antiLeaders = antiLeaders.slice(0, 3);

    return {
        periodStr: `${lastWeekStart.toLocaleDateString('ru-RU')} — ${lastWeekEnd.toLocaleDateString('ru-RU')}`,
        activeCount: Object.keys(grouped).length,
        avgObjectUrk: avgObjectUrk,
        totalB3: globalB3Count,
        iko: ikoMetrics ? ikoMetrics.IKO : '0.00',
        leaders: leaders,
        antiLeaders: antiLeaders
    };
}

// ============================================================================
// 1. ПЕЧАТЬ ТЕКУЩЕГО ЭКРАНА (А4 Портрет)
// ============================================================================
function exportPdfCurrentScreen(data) {
    if (typeof currentDetailedContractor !== 'undefined' && currentDetailedContractor) {
        // --- РЕЖИМ 1: ДЕТАЛИЗАЦИЯ ОДНОГО ПОДРЯДЧИКА ---
        const cData = data.filter(c => `${c.contractorName} [${c.projectName || 'Без объекта'}]` === currentDetailedContractor);
        if (cData.length === 0) return showToast('Нет данных по этому подрядчику');
        
        const m = getContractorMetrics(cData, userTemplates);
        const workType = cData[0].templateTitle;
        const expertText = getExpertConclusion(m, currentDetailedContractor, workType, cData.length, 'print', customExpertConclusions).pdfHtml;

        let photosB3 = []; let photosB2 = [];
        cData.forEach(check => {
            if(check.state && check.photos) {
                Object.keys(check.state).forEach(id => {
                    const s = check.state[id];
                    if ((s === 'fail' || s === 'fail_escalated') && check.photos[id]) {
                        const isB3 = s === 'fail_escalated' || getFlatList(userTemplates[check.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[check.templateKey.replace('sys_','')]?.groups).find(x => x.id == id)?.w === 3;
                        if (isB3) photosB3.push(check.photos[id]); else photosB2.push(check.photos[id]);
                    }
                });
            }
        });

        const renderPhotoStrip = (photos, color) => {
            if(photos.length === 0) return '<div style="color:#94a3b8; font-size:12px; margin-bottom:15px;">Фотографий нет</div>';
            const paddedArr = [...photos].slice(0, 5);
            while(paddedArr.length < 5) paddedArr.push(null);
            
            return `
            <table style="width: 100%; border-spacing: 10px; table-layout: fixed; margin-left: -10px; margin-bottom: 15px;">
                <tr>
                ${paddedArr.map(src => {
                    if (!src) return `<td style="border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc; height:130px;"></td>`;
                    return `<td style="border:2px solid ${color}; border-radius:8px; background:white; overflow:hidden; padding:0; height:130px;">
                        <img src="${src}" style="width:100%; height:100%; object-fit:cover; display:block;">
                    </td>`;
                }).join('')}
                </tr>
            </table>`;
        };

        const content = `
            <div style="border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin:0; font-size: 24px; color:#0f172a; text-transform:uppercase;">Детализация: ${currentDetailedContractor}</h2>
                <div style="color:#64748b; font-weight:bold; margin-top:5px;">Вид работ: ${workType} | Выборка: ${m.count} проверок</div>
            </div>
            <div style="display:flex; gap:15px; margin-bottom:20px; page-break-inside: avoid;">
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Ср. УрК Изделий</div>
                    <div style="font-size:36px; font-weight:900; color:#0f172a;">${m.baseUrkContrPerc}%</div>
                    <div style="font-size:10px; font-weight:bold; color:#475569;">До штрафов</div>
                </div>
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность (ИУрК)</div>
                    <div style="font-size:36px; font-weight:900; color:${m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a')};">${m.finalC}%</div>
                    <div style="font-size:10px; font-weight:bold; color:#475569;">Погрешность: ±${m.ci95_margin.toFixed(1)}%</div>
                </div>
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Стабильность</div>
                    <div style="font-size:36px; font-weight:900; color:#0f172a;">${m.stabilityIndex}</div>
                    <div style="font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;">${m.stabText}</div>
                </div>
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Дефекты B3 / B2</div>
                    <div style="font-size:36px; font-weight:900; color:#dc2626;">${m.n_изделий_с_B3} <span style="color:#d97706; font-size:24px;">/ ${photosB2.length}</span></div>
                    <div style="font-size:10px; font-weight:bold; color:#475569;">Критичность: ${m.kcritC.toFixed(2)}</div>
                </div>
            </div>
            ${expertText}
            <div style="page-break-inside: avoid;">
                <h3 style="color:#dc2626; font-size:14px; text-transform:uppercase; margin-bottom:10px;">🚨 Критические дефекты (B3)</h3>
                ${renderPhotoStrip(photosB3, '#fca5a5')}
                <h3 style="color:#d97706; font-size:14px; text-transform:uppercase; margin-bottom:10px;">⚠️ Значимые дефекты (B2)</h3>
                ${renderPhotoStrip(photosB2, '#fde68a')}
            </div>
        `;
        printPdfShell(`Срез: ${currentDetailedContractor}`, content, "A4");

    } else {
        // --- РЕЖИМ 2: СПИСОК ВСЕХ ПОДРЯДЧИКОВ (С ВЕРХНЕЙ СВОДКОЙ) ---
        
        let sumUrkProd = 0, sumB1 = 0, sumB2 = 0, sumB3 = 0;
        data.forEach(i => {
            if(i.metrics) {
                sumUrkProd += i.metrics.final;
                sumB1 += i.metrics.n_B1_fail;
                sumB2 += i.metrics.n_B2_fail;
                sumB3 += i.metrics.n_B3_fail;
            }
        });
        const avgUrkProd = data.length > 0 ? Math.round(sumUrkProd / data.length) : 0;

        const grouped = {};
        data.forEach(item => { 
            const cKey = `${item.contractorName} [${item.projectName || 'Без объекта'}]`;
            grouped[cKey] = grouped[cKey] || []; 
            grouped[cKey].push(item); 
        });

        const cList = [];
        let validContrCount = 0;
        let sumIntegralUrk = 0;
        
        for(let cName in grouped) {
            const m = getContractorMetrics(grouped[cName], userTemplates);
            if (m) {
                cList.push({ name: cName, metrics: m, workType: grouped[cName][0].templateTitle });
                if (m.count >= 7) {
                    sumIntegralUrk += m.finalC;
                    validContrCount++;
                }
            }
        }
        cList.sort((a,b) => b.metrics.finalC - a.metrics.finalC);
        const avgIntegralUrk = validContrCount > 0 ? Math.round(sumIntegralUrk / validContrCount) : 0;

        // Достаем глобальный смарт анализ
        const globalKey = 'global_main_analysis';
        let rawSmartText = customExpertConclusions[globalKey];
        let aiHtml = '';
        if (rawSmartText) {
            const isCustomText = !!customExpertConclusions[globalKey];
            const pdfFormattedText = rawSmartText.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;">$1</div>').replace(/\n/g, '<br>');
            
            aiHtml = `
            <div style="margin-bottom: 20px; border: 1px solid ${isCustomText ? '#fde047' : '#cbd5e1'}; border-radius: 8px; background: ${isCustomText ? '#fefce8' : '#f8fafc'}; padding: 15px; page-break-inside: avoid;">
                <h3 style="margin-top: 0; font-size: 14px; border-bottom: 2px solid ${isCustomText ? '#fef08a' : '#e2e8f0'}; padding-bottom: 8px; margin-bottom: 15px; color: ${isCustomText ? '#854d0e' : '#0f172a'};">
                    ${isCustomText ? '⚠️ АНАЛИЗ ЗОН РИСКА (С КОРРЕКТИРОВКАМИ ИНЖЕНЕРА)' : '🧠 АНАЛИЗ ЗОН РИСКА (АВТОМАТИЧЕСКИЙ)'}
                </h3>
                <div style="font-size: 12px; line-height: 1.5; color: #1e293b; white-space: pre-wrap;">${pdfFormattedText}</div>
            </div>`;
        }

        const rowsHtml = cList.map((c) => {
            const m = c.metrics;
            const color = m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a');
            const borderColor = m.finalC < 70 ? '#fca5a5' : '#cbd5e1';
            const bg = m.finalC < 70 ? '#fef2f2' : 'white';
            
            return `
            <div style="border: 2px solid ${borderColor}; border-radius: 12px; padding: 15px; background: ${bg}; page-break-inside: avoid; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="width: 70%;">
                        <div style="font-size: 14px; font-weight: 900; color: #0f172a; line-height: 1.2;">${c.name}</div>
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight:bold; margin-top: 4px;">${c.workType}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight:bold;">Надежность</div>
                        <div style="font-size: 24px; font-weight: 900; color: ${color}; line-height: 1;">${m.count < 7 ? '<span style="font-size:12px; color:#64748b;">СБОР</span>' : m.finalC + '%'}</div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">Ср. УрК Изд.</div>
                        <div style="font-weight: 900; font-size:14px;">${m.baseUrkContrPerc}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">Проверок</div>
                        <div style="font-weight: 900; font-size:14px;">${m.count}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">Стабильность</div>
                        <div style="font-weight: 900; font-size:14px; color:${m.count < 7 ? '#94a3b8' : '#0f172a'};">${m.count < 7 ? '-' : m.stabilityIndex}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">Дефектов B3</div>
                        <div style="font-weight: 900; font-size:14px; color: ${m.n_изделий_с_B3 > 0 ? '#dc2626' : '#16a34a'};">${m.n_изделий_с_B3}</div>
                    </div>
                </div>
            </div>`;
        }).join('');

        const content = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin:0; font-size: 20px; color:#0f172a; text-transform:uppercase;">Отчет: Текущий срез подрядчиков</h2>
                <div style="font-size: 12px; color: #64748b; font-weight:bold; margin-top:5px;">Сформировано на основе активных фильтров (Всего: ${data.length} пров.)</div>
            </div>
            
            <div style="display:flex; gap:10px; margin-bottom:20px; page-break-inside: avoid;">
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                    <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Ср. УрК Изделий</div>
                    <div style="font-size:24px; font-weight:900; color:${avgUrkProd < 70 ? '#dc2626' : (avgUrkProd < 85 ? '#d97706' : '#16a34a')};">${avgUrkProd}%</div>
                </div>
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                    <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность (ИУрК)</div>
                    <div style="font-size:24px; font-weight:900; color:${avgIntegralUrk < 70 ? '#dc2626' : (avgIntegralUrk < 85 ? '#d97706' : '#16a34a')};">${validContrCount > 0 ? avgIntegralUrk+'%' : 'СБОР'}</div>
                </div>
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                    <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Дефекты B3 / B2</div>
                    <div style="font-size:24px; font-weight:900; color:#dc2626;">${sumB3} <span style="color:#d97706; font-size:16px;">/ ${sumB2}</span></div>
                </div>
            </div>
            
            ${aiHtml}
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                ${rowsHtml}
            </div>
        `;
        printPdfShell("Список подрядчиков", content, "A4");
    }
}

// ============================================================================
// 2. ПОЛНЫЙ ОТЧЕТ ПО ОБЪЕКТУ ДЛЯ СОВЕЩАНИЙ (А3 Альбомный, Табличная сетка)
// ============================================================================
function exportPdfFullObjectReport(data) {
    const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
    const now = new Date();
    let prevData = [];
    
    if (selPeriod === 'WEEK') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate()-7);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate()-7);
        prevData = contractorArray.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
    } else if (selPeriod === 'MONTH') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate()-30);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate()-30);
        prevData = contractorArray.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
    } else {
        const half = Math.floor(data.length / 2);
        const sortedData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date));
        prevData = sortedData.slice(0, half);
    }

    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
    const currIKO = currIntMetrics ? parseFloat(currIntMetrics.IKO) : 0;
    const redZonePerc = currIntMetrics ? currIntMetrics.redZonePerc : 0;

    let sumUrk = 0; data.forEach(i => { if(i.metrics) sumUrk += i.metrics.final; });
    const avgUrk = data.length > 0 ? Math.round(sumUrk / data.length) : 0;

    // Умная группировка: если объект не выбран, добавляем его название к подрядчику, чтобы данные не склеились
    const isSingleProject = activeMultiFilters.analytics.project.length === 1;
    
    const grouped = {};
    data.forEach(c => { 
        const cKey = c.contractorName + (isSingleProject ? '' : ` [${c.projectName || 'Без объекта'}]`);
        if(!grouped[cKey]) grouped[cKey] = []; 
        grouped[cKey].push(c); 
    });
    
    const pGrouped = {};
    prevData.forEach(c => { 
        const cKey = c.contractorName + (isSingleProject ? '' : ` [${c.projectName || 'Без объекта'}]`);
        if(!pGrouped[cKey]) pGrouped[cKey] = []; 
        pGrouped[cKey].push(c); 
    });

    let content = '';

    // --- СТРАНИЦА 1: ТИТУЛЬНЫЙ ЛИСТ ---
    content += `
    <div style="page-break-after: always; padding-top: 50px;">
        <div style="text-align:center; margin-bottom: 60px;">
            <h1 style="font-size: 48px; color:#0f172a; text-transform:uppercase; font-weight:900; margin:0;">Еженедельный отчет по качеству</h1>
            <div style="font-size: 24px; color:#4f46e5; font-weight:bold; margin-top:10px;">${isSingleProject ? activeMultiFilters.analytics.project[0] : 'Сводный отчет по всем объектам'}</div>
            <div style="font-size: 16px; color:#64748b; font-weight:bold; margin-top:20px;">Период формирования: ${new Date().toLocaleDateString('ru-RU')}</div>
        </div>

        <table style="width: 100%; border-spacing: 20px; margin-bottom: 40px;">
            <tr>
                <td style="width: 50%; background:#f8fafc; border:3px solid #cbd5e1; border-radius:16px; padding:30px; text-align:center;">
                    <div style="font-size:16px; color:#64748b; text-transform:uppercase; font-weight:900; margin-bottom:10px;">Ср. УрК Объекта</div>
                    <div style="font-size:64px; font-weight:900; color:#0f172a; line-height:1;">${avgUrk}%</div>
                </td>
                <td style="width: 50%; background:${currIKO >= 0.6 ? '#fef2f2' : '#f0fdf4'}; border:3px solid ${currIKO >= 0.6 ? '#fca5a5' : '#bbf7d0'}; border-radius:16px; padding:30px; text-align:center;">
                    <div style="font-size:16px; color:#64748b; text-transform:uppercase; font-weight:900; margin-bottom:10px;">Индекс Риска (ИКО)</div>
                    <div style="font-size:64px; font-weight:900; color:${currIKO >= 0.6 ? '#dc2626' : '#16a34a'}; line-height:1;">${currIKO.toFixed(2)}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 50%; background:#f8fafc; border:3px solid #cbd5e1; border-radius:16px; padding:30px; text-align:center;">
                    <div style="font-size:16px; color:#64748b; text-transform:uppercase; font-weight:900; margin-bottom:10px;">Объем проверок</div>
                    <div style="font-size:64px; font-weight:900; color:#0f172a; line-height:1;">${data.length}</div>
                </td>
                <td style="width: 50%; background:#fef2f2; border:3px solid #fecaca; border-radius:16px; padding:30px; text-align:center;">
                    <div style="font-size:16px; color:#991b1b; text-transform:uppercase; font-weight:900; margin-bottom:10px;">В красной зоне</div>
                    <div style="font-size:64px; font-weight:900; color:#dc2626; line-height:1;">${redZonePerc}%</div>
                </td>
            </tr>
        </table>

        <div style="background:#fffbeb; border:3px solid #fde68a; border-radius:16px; padding:30px;">
            <h2 style="margin:0 0 10px 0; color:#b45309; font-size:20px; text-transform:uppercase;">КРАТКОЕ РЕЗЮМЕ ПО ОБЪЕКТУ</h2>
            <p style="font-size:16px; color:#1e293b; line-height:1.5; margin:0;">
                ${currIKO >= 0.6 ? 'На объекте наблюдается критический уровень риска. Значительный объем работ выполняется с нарушениями технологии или наличием дефектов категории B3. Требуется срочное вмешательство руководства и остановка работ проблемных подрядчиков.' : 
                 (currIKO >= 0.3 ? 'Объект находится в зоне повышенного внимания. Рекомендуется усилить контроль за подрядчиками с нестабильным качеством и проработать повторяющиеся дефекты.' : 
                                   'Процесс производства работ стабилен. Риски минимальны, критических отклонений на системном уровне не зафиксировано.')}
            </p>
        </div>
    </div>
    `;

    // Текст периода для шапки подрядчика
    let periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';
    if (document.getElementById('global-filter-period')?.value === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        if (dFrom || dTo) {
            const fmt = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '...';
            periodText = `с ${fmt(dFrom)} по ${fmt(dTo)}`;
        }
    }

    // Жесткая сетка для фото. Размеры рассчитаны так, чтобы 2 ряда по 5 фото занимали ~55% высоты.
    const renderPhotoGridBox = (arr, title, titleColor) => {
        if (arr.length === 0) return '';
        const paddedArr = [...arr].slice(0, 5);
        while(paddedArr.length < 5) paddedArr.push({ empty: true });
        
        return `
        <div style="margin-bottom: 15px;">
            <h3 style="margin:0 0 5px 0; color:${titleColor}; font-size:12px; text-transform:uppercase;">${title}</h3>
            <table style="width: 100%; border-spacing: 8px; table-layout: fixed; margin-left:-8px;">
                <tr>
                ${paddedArr.map(p => {
                    if (p.empty) return `<td style="border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc; height:180px;"></td>`;
                    return `<td style="border:1px solid #cbd5e1; border-radius:8px; background:white; vertical-align:top; overflow:hidden; padding:0; height:180px;">
                        <img src="${p.src}" style="width:100%; height:130px; object-fit:cover; display:block;">
                        <div style="padding:6px; font-size:10px; font-weight:bold; color:#0f172a; line-height:1.1; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${p.name}</div>
                    </td>`;
                }).join('')}
                </tr>
            </table>
        </div>`;
    };

    // --- СЛЕДУЮЩИЕ СТРАНИЦЫ: ПО ПОДРЯДЧИКАМ ---
    // --- СЛЕДУЮЩИЕ СТРАНИЦЫ: ПО ПОДРЯДЧИКАМ ---
    for(let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length < 3) continue;

        const m = getContractorMetrics(cData, userTemplates);
        if (!m) continue;

        let mPrev = null;
        if (pGrouped[cName] && pGrouped[cName].length >= 3) mPrev = getContractorMetrics(pGrouped[cName], userTemplates);

        const colorMain = m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a');
        const bgMain = m.finalC < 70 ? '#fef2f2' : (m.finalC < 85 ? '#fffbeb' : '#f0fdf4');
        const borderMain = m.finalC < 70 ? '#fca5a5' : (m.finalC < 85 ? '#fde68a' : '#bbf7d0');

        let trendHtml = '';
        if (mPrev) {
            const diff = m.baseUrkContrPerc - mPrev.baseUrkContrPerc;
            if (diff > 0) trendHtml = `<span style="color:#16a34a; font-size:20px; font-weight:900;">▲ +${diff}%</span>`;
            else if (diff < 0) trendHtml = `<span style="color:#dc2626; font-size:20px; font-weight:900;">▼ ${diff}%</span>`;
            else trendHtml = `<span style="color:#94a3b8; font-size:20px; font-weight:900;">▬ 0%</span>`;
        } else {
            trendHtml = `<span style="color:#94a3b8; font-size:14px; font-weight:bold;">Нет истории</span>`;
        }

        // Собираем фото дефектов и эталонов (С УМНОЙ ЛОГИКОЙ ПАР)
        let photosB3 = []; let photosB2 = []; let photosOK = [];
        let defectIds = new Set(); // Запоминаем ID пунктов с браком

        cData.forEach(check => {
            if(check.state && check.photos && check.details) {
                Object.keys(check.state).forEach(id => {
                    const s = check.state[id];
                    let defName = "Дефект";
                    const flatList = getFlatList(userTemplates[check.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[check.templateKey.replace('sys_','')]?.groups);
                    const item = flatList.find(x => x.id == id);
                    if (item) defName = item.n;

                    if ((s === 'fail' || s === 'fail_escalated') && check.photos[id]) {
                        defectIds.add(id); // Запомнили, что тут есть брак
                        const comment = check.details[id]?.comment || '';
                        if (s === 'fail_escalated' || (item && item.w === 3)) photosB3.push({ id, src: check.photos[id], name: defName, comment });
                        else photosB2.push({ id, src: check.photos[id], name: defName, comment });
                    }
                });
            }
        });

        // Теперь ищем эталоны (OK) с приоритетом пар
        let okCandidates = [];
        cData.forEach(check => {
            if(check.state && check.photos) {
                Object.keys(check.state).forEach(id => {
                    if (check.state[id] === 'ok' && check.photos[id]) {
                        const isPair = defectIds.has(id); // Это фото к пункту, где был брак!
                        let defName = "Дефект";
                        const flatList = getFlatList(userTemplates[check.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[check.templateKey.replace('sys_','')]?.groups);
                        const item = flatList.find(x => x.id == id);
                        if (item) defName = item.n;

                        okCandidates.push({ src: check.photos[id], name: defName, isPair });
                    }
                });
            }
        });

        // Сортируем: сначала те, у которых есть "пара" в браке
        okCandidates.sort((a,b) => (b.isPair ? 1 : 0) - (a.isPair ? 1 : 0));
        photosOK = okCandidates.slice(0, 5);

        // Если не набралось 5 фото из проверок — добираем из TWI-карт этого вида работ!
        if (photosOK.length < 5) {
            const tmplKey = cData[0].templateKey;
            const twiOkPhotos = customTwiCards.filter(c => c.checklistKey === tmplKey && c.type === 'INSPECTOR' && c.photoGood).map(c => ({
                src: c.photoGood, name: c.title, isPair: false
            }));
            
            // Доливаем из TWI, избегая дубликатов (уникальность по src)
            twiOkPhotos.forEach(twi => {
                if (photosOK.length < 5 && !photosOK.find(x => x.src === twi.src)) {
                    photosOK.push(twi);
                }
            });
        }

        const renderPhotoGridBox = (arr, title, titleColor, bgCell, borderCell) => {
            if (arr.length === 0) return '';
            const paddedArr = [...arr].slice(0, 5);
            while(paddedArr.length < 5) paddedArr.push({ empty: true });
            
            // Внимание: height теперь 31% (так как 3 ряда)
            return `
            <div style="height: 31%; display: flex; flex-direction: column; margin-bottom: 2%;">
                <h3 style="margin:0 0 5px 0; color:${titleColor}; font-size:11px; text-transform:uppercase; flex-shrink: 0;">${title}</h3>
                <table style="width: 100%; flex: 1; border-spacing: 6px; table-layout: fixed; margin-left:-6px;">
                    <tr>
                    ${paddedArr.map(p => {
                        if (p.empty) return `<td style="border:1px dashed #cbd5e1; border-radius:6px; background:#f8fafc; height:100%;"></td>`;
                        return `<td style="border:2px solid ${borderCell}; border-radius:6px; background:${bgCell}; vertical-align:top; overflow:hidden; padding:0; height:100%;">
    <img src="${p.src}" style="width:100%; height:75%; object-fit:contain; background-color:#f1f5f9; display:block;">
    <div style="padding:4px; font-size:8px; font-weight:bold; color:#0f172a; line-height:1.1; height:25%; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${p.name}</div>
</td>`;
                    }).join('')}
                    </tr>
                </table>
            </div>`;
        };

        let expertHtml = getExpertConclusion(m, cName, cData[0].templateTitle, cData.length, 'print', customExpertConclusions).pdfHtml;
        if (!expertHtml.includes('⚠️ ЭКСПЕРТНОЕ ЗАКЛЮЧЕНИЕ (С КОРРЕКТИРОВКАМИ ИНЖЕНЕРА)')) {
            expertHtml = expertHtml.replace('🔧 Рекомендации</div>', '🔧 Рекомендации</div><div style="font-size:11px; font-weight:bold; color:#b91c1c; margin-bottom:4px;">Обратить внимание на устранение дефектов, представленных на фото справа (Ориентир — зеленые эталоны).</div>');
        }

        content += `
        <div style="page-break-after: always; padding-top: 10px;">
            
            <!-- БЛОК 1: ШАПКА И МЕТРИКИ (Занимает верхние ~25%) -->
            <div style="border-bottom: 2px solid #1e293b; padding-bottom: 6px; margin-bottom: 12px;">
                <h1 style="margin:0 0 2px 0; font-size:24px; color:#0f172a; text-transform:uppercase;">${cName}</h1>
                <div style="font-size:12px; font-weight:bold; color:#64748b; text-transform:uppercase;">Вид работ: ${cData[0].templateTitle} | Период: ${periodText}</div>
            </div>

            <table style="width: 100%; border-spacing: 10px; margin-left: -10px; margin-bottom: 15px;">
                <tr>
                    <td style="width: 30%; background:${bgMain}; border:2px solid ${borderMain}; border-radius:10px; padding:15px; text-align:center; vertical-align:middle; position:relative;">
                        <div style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:900; margin-bottom:8px;">Ср. УрК Изделий</div>
                        <div style="font-size:48px; font-weight:900; color:${colorMain}; line-height:1; display:flex; justify-content:center; align-items:center; gap:10px;">
                            ${m.baseUrkContrPerc}% ${trendHtml}
                        </div>
                    </td>
                    <td style="width: 70%; vertical-align:top; padding:0;">
                        <table style="width: 100%; border-spacing: 10px; margin-top:-10px;">
                            <tr>
                                <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; text-align:center;">
                                    <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность (ИУрК)</div>
                                    <div style="font-size:24px; font-weight:900; color:#0f172a; margin-top:4px;">${m.finalC}%</div>
                                </td>
                                <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; text-align:center;">
                                    <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Проверок</div>
                                    <div style="font-size:24px; font-weight:900; color:#0f172a; margin-top:4px;">${m.count}</div>
                                </td>
                                <td style="background:${m.maxFailRate >= 20 ? '#fffbeb' : '#f8fafc'}; border:1px solid ${m.maxFailRate >= 20 ? '#fde68a' : '#cbd5e1'}; border-radius:8px; padding:12px; text-align:center;">
                                    <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Частота B2 (Ks)</div>
                                    <div style="font-size:24px; font-weight:900; color:${m.maxFailRate >= 20 ? '#d97706' : '#0f172a'}; margin-top:4px;">${m.maxFailRate.toFixed(0)}%</div>
                                </td>
                                <td style="background:${m.n_изделий_с_B3 > 0 ? '#fef2f2' : '#f8fafc'}; border:1px solid ${m.n_изделий_с_B3 > 0 ? '#fca5a5' : '#cbd5e1'}; border-radius:8px; padding:12px; text-align:center;">
                                    <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Дефекты (B3)</div>
                                    <div style="font-size:24px; font-weight:900; color:${m.n_изделий_с_B3 > 0 ? '#dc2626' : '#16a34a'}; margin-top:4px;">${m.n_изделий_с_B3} шт</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- БЛОК 2: ЗАКЛЮЧЕНИЕ И ФОТО -->
            <table style="width: 100%; border-spacing: 15px; margin-left:-15px;">
                <tr>
                    <!-- Левая колонка (Заключение ~25%) -->
                    <td style="width: 25%; vertical-align: top; border-right: 2px dashed #e2e8f0; padding-right: 15px;">
                        <div style="font-size: 0.9em;">
                            ${expertHtml.replace(/font-size:\s*1[23]px/g, 'font-size: 11px').replace(/margin-bottom:\s*1[05]px/g, 'margin-bottom: 6px')}
                        </div>
                    </td>

                    <!-- Правая колонка (Фото ~75%) -->
                     <td style="width: 80%; vertical-align: top; padding: 0;">
                        <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
                            ${renderPhotoGridBox(photosB3, '🚨 ТОП-5 Критических дефектов (B3)', '#dc2626', '#fef2f2', '#fca5a5')}
                            ${renderPhotoGridBox(photosB2, '⚠️ ТОП-5 Повторяющихся дефектов (B2)', '#d97706', '#fffbeb', '#fde68a')}
                            ${renderPhotoGridBox(photosOK, '✅ ТОП-5 Эталонных работ (OK)', '#16a34a', '#f0fdf4', '#bbf7d0')}
                        </div>
                    </td>
                </tr>
            </table>

        </div>
        `;
    }

    printPdfShell("Еженедельный отчет по объекту", content, "A3", "landscape");
}
// ============================================================================
// 3. ПЛАКАТ КАЧЕСТВА (Жесткая одностраничная верстка)
// ============================================================================
function exportPdfPoster(data) {
    let weekData = [];
    let periodStr = '';

    if (typeof isDemoMode !== 'undefined' && isDemoMode && contractorArray.length > 0) {
        const sorted = [...contractorArray].sort((a,b) => new Date(b.date) - new Date(a.date));
        weekData = sorted.slice(0, 25);
        periodStr = 'Демонстрационный период';
    } else {
        const now = new Date();
        const lastWeekEnd = new Date(now);
        const day = lastWeekEnd.getDay() || 7;
        lastWeekEnd.setDate(lastWeekEnd.getDate() - day); 
        lastWeekEnd.setHours(23, 59, 59, 999);
        
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6); 
        lastWeekStart.setHours(0, 0, 0, 0);

        weekData = contractorArray.filter(i => {
            const d = new Date(i.date);
            return d >= lastWeekStart && d <= lastWeekEnd;
        });
        periodStr = `${lastWeekStart.toLocaleDateString('ru-RU')} — ${lastWeekEnd.toLocaleDateString('ru-RU')}`;
    }

    if (weekData.length === 0) return showToast("За выбранный период нет данных для плаката");

    const grouped = {};
    weekData.forEach(item => { 
        if(!grouped[item.contractorName]) grouped[item.contractorName] = []; 
        grouped[item.contractorName].push(item); 
    });

    const candidates = [];
    let globalUrkSum = 0; let globalB3Count = 0;
    let allWeekPhotos = [];

    for (let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) {
            const m = getContractorMetrics(cData, userTemplates);
            if (m) {
                let bestPhoto = null; let worstPhoto = null; let worstDefectName = '';
                cData.forEach(check => {
                    globalUrkSum += check.metrics.final;
                    globalB3Count += check.metrics.n_B3_fail;
                    if(check.photos && check.state) {
                        Object.keys(check.state).forEach(id => {
                            const flatList = getFlatList(userTemplates[check.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[check.templateKey.replace('sys_','')]?.groups);
                            const itemInfo = flatList.find(x => x.id == id);

                            if(check.state[id] === 'ok' && check.photos[id]) bestPhoto = check.photos[id];
                            
                            if((check.state[id] === 'fail' || check.state[id] === 'fail_escalated') && check.photos[id]) {
                                worstPhoto = check.photos[id];
                                if(itemInfo) worstDefectName = itemInfo.n;
                                allWeekPhotos.push({ src: check.photos[id], contr: cName, name: worstDefectName });
                            }
                        });
                    }
                });

                let growth = 0;
                if (!isDemoMode) {
                    const now = new Date();
                    const lastWeekEnd = new Date(now);
                    const day = lastWeekEnd.getDay() || 7;
                    lastWeekEnd.setDate(lastWeekEnd.getDate() - day); 
                    const prevStart = new Date(lastWeekEnd); prevStart.setDate(prevStart.getDate() - 13);
                    const prevEnd = new Date(lastWeekEnd); prevEnd.setDate(prevEnd.getDate() - 7);
                    const prevChecks = contractorArray.filter(i => i.contractorName === cName && new Date(i.date) >= prevStart && new Date(i.date) <= prevEnd);
                    
                    if (prevChecks.length >= 3) {
                        const mPrev = getContractorMetrics(prevChecks, userTemplates);
                        if (mPrev) growth = m.finalC - mPrev.finalC;
                    }
                } else {
                    growth = Math.floor(Math.random() * 15) + 2; 
                }

                candidates.push({ name: cName, workType: cData[0].templateTitle, metrics: m, bestPhoto, worstPhoto, worstDefectName, growth });
            }
        }
    }

    if (candidates.length === 0) return showToast("Недостаточно данных для формирования рейтинга");

    const avgObjectUrk = Math.round(globalUrkSum / weekData.length);
    const ikoMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(weekData, userTemplates) : null;
    const IKO = ikoMetrics ? ikoMetrics.IKO : '0.00';

    candidates.sort((a, b) => b.metrics.finalC - a.metrics.finalC);
    const leaders = candidates.filter(c => c.metrics.finalC >= 85).slice(0, 3);
    
    let antiLeaders = candidates.filter(c => c.metrics.n_изделий_с_B3 > 0 || c.metrics.finalC < 70);
    antiLeaders.sort((a, b) => {
        if (b.metrics.n_изделий_с_B3 !== a.metrics.n_изделий_с_B3) return b.metrics.n_изделий_с_B3 - a.metrics.n_изделий_с_B3;
        return a.metrics.finalC - b.metrics.finalC;
    });
    antiLeaders = antiLeaders.slice(0, 3);

    let breakthrough = null; let maxGrowth = 0;
    candidates.forEach(c => {
        if (c.growth > maxGrowth && c.metrics.finalC >= 70) {
            maxGrowth = c.growth; breakthrough = c;
        }
    });

    const renderPosterCard = (c, type) => {
        if (!c) return '';
        const isLeader = type === 'leader'; const isBreak = type === 'break'; const isBad = type === 'bad';
        let color = '#0f172a'; let bg = '#f8fafc'; let bd = '#cbd5e1'; let badge = '';
        
        if (isLeader) { color = '#16a34a'; bg = '#f0fdf4'; bd = '#bbf7d0'; }
        if (isBreak) { color = '#4f46e5'; bg = '#e0e7ff'; bd = '#bae6fd'; badge = `<div style="background:#4f46e5; color:white; padding:2px 4px; border-radius:4px; font-size:9px; font-weight:bold; display:inline-block; margin-bottom:2px;">🚀 +${c.growth}% к прошлой неделе</div>`; }
        if (isBad) { color = '#dc2626'; bg = '#fef2f2'; bd = '#fecaca'; }

        const photoHtml = (isLeader || isBreak) && c.bestPhoto ? `<img src="${c.bestPhoto}" style="width:100%; height:95px; object-fit:cover; border-radius:4px; margin-top:4px; border:1px solid ${bd}; display:block;">` : 
                         (isBad && c.worstPhoto ? `<img src="${c.worstPhoto}" style="width:100%; height:95px; object-fit:cover; border-radius:4px; margin-top:4px; border:1px solid #ef4444; display:block;">` : '');
        
        return `
        <div style="background: ${bg}; border: 2px solid ${bd}; padding: 6px 10px; border-radius: 8px; margin-bottom: 8px; page-break-inside: avoid; overflow:hidden;">
            ${badge}
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="vertical-align: top;">
                        <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-bottom:2px; line-height:1.1;">${c.name}</div>
                        <div style="font-size: 8px; color: #64748b; text-transform: uppercase; font-weight:bold;">${c.workType}</div>
                    </td>
                    <td style="text-align: right; width: 45px; vertical-align: top;">
                        <div style="font-size: 22px; font-weight: 900; color: ${color}; line-height:1;">${c.metrics.finalC}%</div>
                    </td>
                </tr>
            </table>
            ${isBad && c.worstDefectName ? `<div style="margin-top:4px; font-size:8px; font-weight:bold; color:#991b1b; background:#fee2e2; padding:4px; border-radius:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">❌ Брак: ${c.worstDefectName}</div>` : ''}
            ${photoHtml}
        </div>`;
    };

    allWeekPhotos = allWeekPhotos.sort(() => 0.5 - Math.random()).slice(0, 6);
    let collageHtml = '';
    if (allWeekPhotos.length > 0) {
        collageHtml = `
            <div style="margin-top: 10px; border-top:2px solid #1e293b; padding-top: 10px;">
                <h2 style="text-align:center; font-size:14px; color:#0f172a; text-transform:uppercase; margin-bottom:8px; margin-top:0;">ФОТОФИКСАЦИЯ НАРУШЕНИЙ НА ОБЪЕКТЕ</h2>
                <table style="width: 100%; border-spacing: 6px; table-layout: fixed; margin-left:-6px; margin-top:-6px;">
                    <tr>
                    ${allWeekPhotos.map(p => `
                        <td style="border:1px solid #cbd5e1; border-radius:6px; background:white; overflow:hidden; padding:0; vertical-align:top;">
                            <img src="${p.src}" style="width:100%; height:80px; object-fit:cover; display:block;">
                            <div style="padding:4px; font-size:7px; font-weight:bold; color:#0f172a; text-align:center; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${p.contr}</div>
                        </td>
                    `).join('')}
                    </tr>
                </table>
            </div>
        `;
    }

    const content = `
        <div style="page-break-inside: avoid; display: block; box-sizing: border-box;">
            
            <div style="text-align: center; margin-bottom: 10px;">
                <h1 style="font-size: 24px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900; letter-spacing:1px;">БЮЛЛЕТЕНЬ КАЧЕСТВА СТРОИТЕЛЬСТВА</h1>
                <div style="font-size: 12px; color: #4f46e5; font-weight: 900; margin-top: 2px; text-transform:uppercase;">Итоги: ${periodStr}</div>
            </div>

            <table style="width: 100%; border-spacing: 10px; margin-left: -10px; table-layout: fixed;">
                <tr>
                    <td style="vertical-align: top; width:33.3%;">
                        <h2 style="background: #16a34a; color: white; padding: 6px; border-radius: 6px; text-align: center; text-transform: uppercase; font-size:11px; margin-top:0; margin-bottom:8px;">🏆 Лидеры (УрК > 85%)</h2>
                        ${leaders.length > 0 ? leaders.map(c => renderPosterCard(c, 'leader')).join('') : '<div style="text-align:center; padding:15px; color:#64748b; font-size:11px; font-weight:bold; border:1px dashed #cbd5e1; border-radius:6px;">В зеленой зоне никого нет</div>'}
                    </td>
                    <td style="vertical-align: top; width:33.3%;">
                        <h2 style="background: #4f46e5; color: white; padding: 6px; border-radius: 6px; text-align: center; text-transform: uppercase; font-size:11px; margin-top:0; margin-bottom:8px;">🚀 Прорыв недели</h2>
                        ${breakthrough ? renderPosterCard(breakthrough, 'break') : '<div style="text-align:center; padding:15px; color:#64748b; font-size:11px; font-weight:bold; border:1px dashed #cbd5e1; border-radius:6px;">Значительного прогресса нет</div>'}
                        
                        <div style="margin-top: 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
                            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                            <div style="font-size: 32px; font-weight: 900; color: #0f172a;">${avgObjectUrk}%</div>
                        </div>
                        <div style="margin-top: 10px; background: ${parseFloat(IKO) >= 0.6 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${parseFloat(IKO) >= 0.6 ? '#fca5a5' : '#bbf7d0'}; border-radius: 6px; padding: 10px; text-align: center;">
                            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс риска (ИКО)</div>
                            <div style="font-size: 32px; font-weight: 900; color: ${parseFloat(IKO) >= 0.6 ? '#dc2626' : '#16a34a'};">${IKO}</div>
                        </div>
                    </td>
                    <td style="vertical-align: top; width:33.3%;">
                        <h2 style="background: #ef4444; color: white; padding: 6px; border-radius: 6px; text-align: center; text-transform: uppercase; font-size:11px; margin-top:0; margin-bottom:8px;">⚠️ Зона внимания</h2>
                        ${antiLeaders.length > 0 ? antiLeaders.map(c => renderPosterCard(c, 'bad')).join('') : '<div style="text-align:center; padding:15px; color:#16a34a; font-size:11px; font-weight:bold; border:1px dashed #bbf7d0; border-radius:6px; background:#f0fdf4;">Отличная работа! Отстающих нет!</div>'}
                    </td>
                </tr>
            </table>

            ${collageHtml}
        </div>
    `;

    printPdfShell("Плакат Качества", content, "A3", "landscape");
}
// 7. Выгрузка сырой базы (Data)
function exportPdfData(data) {
    if(data.length === 0) return showToast('Нет данных для выгрузки');
    const sortedData = [...data].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    let rowsHtml = sortedData.map((r, i) => {
        const d = new Date(r.date).toLocaleDateString('ru-RU');
        const m = r.metrics;
        const color = m ? (m.final < 70 ? '#dc2626' : (m.final < 85 ? '#f59e0b' : '#16a34a')) : '#475569';
        
        return `
        <tr class="avoid-break">
            <td style="text-align:center;">${i + 1}</td>
            <td>${d}</td>
            <td><b>${r.contractorName}</b></td>
            <td>${r.location}</td>
            <td>${r.stageName}</td>
            <td>${r.inspectorName || '-'}</td>
            <td style="text-align:center; font-weight:bold; color: ${color};">${m ? m.final + '%' : '-'}</td>
            <td style="text-align:center;">B1:${m.n_B1_fail} | B2:${m.n_B2_fail} | B3:${m.n_B3_fail}</td>
        </tr>`;
    }).join('');

    const content = `
        <h2 class="section-title">Сырые данные (База проверок)</h2>
        <div style="margin-bottom: 10px; font-size: 12px; color: #64748b;">Выгружено проверок: <b>${data.length} шт.</b></div>
        <table class="data-table">
            <thead>
                <tr><th>#</th><th>Дата</th><th>Подрядчик</th><th>Локация</th><th>Этап</th><th>Инспектор</th><th>УрК</th><th>Дефекты</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
    printPdfShell("База проверок", content, "A4");
}


// 9. Универсальная печатная оболочка (A3/A4)
function printPdfShell(title, content, formatSize = 'A4') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Разрешите всплывающие окна в браузере для выгрузки PDF.');

    const projName = document.getElementById('inp-project')?.value || 'Не указан';
    const inspName = document.getElementById('inp-inspector')?.value || 'Не указан';
    
    // Если A3 - делаем альбомную ориентацию, если A4 - книжную
    const pageOrientation = formatSize === 'A3' ? 'landscape' : 'portrait';
    const maxWidth = formatSize === 'A3' ? '1200px' : '800px';
    
    const html = `
    <!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        @page { size: ${formatSize} ${pageOrientation}; margin: 10mm; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 15px; background: #e2e8f0; font-size: 13px; line-height: 1.5; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        
        .preview-container { width: 100%; max-width: ${maxWidth}; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); min-height: 100vh; }
        
        /* Кнопки перенесены наверх, чтобы не прятались за интерфейсом iPhone */
        .print-controls { position: fixed; top: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 10000; opacity: 0.8; transition: opacity 0.3s; }
        .print-controls:hover { opacity: 1; }
        .btn { width: 50px; height: 50px; border-radius: 25px; display: flex; justify-content: center; align-items: center; cursor: pointer; border: none; box-shadow: 0 10px 15px rgba(0,0,0,0.2); font-size: 20px; outline: none; }
        
        @media print { 
            .print-controls { display: none !important; } 
            html, body { margin: 0; padding: 0; background: white; width: 100%; } 
            .preview-container { box-shadow: none; margin: 0; padding: 0; max-width: 100% !important; width: 100%; page-break-after: avoid; }
            .avoid-break { page-break-inside: avoid !important; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        
        .header { border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header-title { font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; }
        .header-meta { font-size: 10px; color: #64748b; text-align: right; }
        .section-title { font-size: 16px; background: #1e293b; color: white; padding: 10px 15px; border-radius: 6px; text-transform: uppercase; margin-bottom: 20px; }
        
        .data-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; }
        .data-table th { background: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; color: #475569; text-transform: uppercase; }
        .data-table td { padding: 10px; border: 1px solid #cbd5e1; }
        
    </style></head><body>
    <div class="print-controls">
        <button class="btn" style="background:#4f46e5; color:white;" onclick="window.print()" title="Печать / Сохранить в PDF">🖨️</button>
        <button class="btn" style="background:#475569; color:white;" onclick="window.close()" title="Закрыть">✖️</button>
    </div>
    <div class="preview-container">
        <div class="header avoid-break">
            <div>
                <h1 class="header-title">${title}</h1>
                <div style="font-size: 12px; margin-top: 4px; font-weight: bold; color: #475569;">Объект: ${projName} | Ваш инспектор: ${inspName}</div>
            </div>
            <div class="header-meta">Сформировано:<br>${new Date().toLocaleString('ru-RU')}<br>RBI Quality Pro</div>
        </div>
        ${content}
    </div>
    </body></html>`;
    
    printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
}

// 10. Выгрузка в Excel (Сырая база и Тендер)
function exportFilteredCsv() {
    const data = getFilteredAnalyticsData();
    if (!data || data.length === 0) return showToast('Нет данных для выгрузки');
    const csv = exportToCSV(data);
    if (csv) {
        downloadFile(csv, `RBI_Filtered_Base_${new Date().toLocaleDateString('ru-RU')}.csv`, 'text/csv');
        showToast('✅ Таблица выгружена в Excel!');
    } else {
        showToast('❌ Ошибка при формировании файла');
    }
}

function getTenderData() {
    let proj = document.getElementById('tender-project-select')?.value;
    
    // Автовыбор объекта (починит демо-режим, если пользователь забыл выбрать объект в списке)
    if (!proj) {
        const allProjects = [...new Set(contractorArray.map(c => c.projectName).filter(Boolean))].sort();
        if (allProjects.length > 0) {
            proj = allProjects[0]; 
            const selectEl = document.getElementById('tender-project-select');
            if(selectEl) selectEl.value = proj;
        } else {
            showToast('Нет доступных объектов для выгрузки!'); 
            return null;
        }
    }

    const objChecks = contractorArray.filter(c => c.projectName === proj);
    const grouped = {};
    objChecks.forEach(c => {
        if(!grouped[c.contractorName]) grouped[c.contractorName] = [];
        grouped[c.contractorName].push(c);
    });

    const tenderData = [];
    for(let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) {
            // ВАЖНО: передаем 'false' третьим аргументом, чтобы отключить плавающее окно (берем всю историю!)
            const m = getContractorMetrics(cData, userTemplates, false); 
            if (m) {
                const causes = {}; let totalFails = 0;
                cData.forEach(check => {
                    if (check.state && check.details) {
                        Object.keys(check.state).forEach(id => {
                            if (check.state[id] === 'fail' || check.state[id] === 'fail_escalated') {
                                const code = check.details[id]?.causeCode || 'C00';
                                causes[code] = (causes[code] || 0) + 1;
                                totalFails++;
                            }
                        });
                    }
                });

                let rec = "РЕКОМЕНДОВАН"; let recClass = "text-green-600"; let recDesc = "Подрядчик стабилен и показывает высокое качество работ за весь период.";
                if (m.finalC < 70 || m.rateB3 >= 20) {
                    rec = "НЕ РЕКОМЕНДОВАН"; recClass = "text-red-600"; 
                    recDesc = "Подрядчик имеет недопустимый уровень критического брака и низкую оценку. Высокие риски для компании.";
                } else if (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60) {
                    rec = "ДОПУСТИМ С ОГРАНИЧЕНИЯМИ"; recClass = "text-orange-500";
                    recDesc = "Подрядчик выполняет работы удовлетворительно, но имеет нестабильный процесс или допускал критические дефекты B3.";
                }

                const sortedDates = cData.map(c => new Date(c.date)).sort((a,b) => a - b);
                
                tenderData.push({
                    name: cName, proj: proj,
                    metrics: m, causes: causes, totalFails: totalFails,
                    rec: rec, recClass: recClass, recDesc: recDesc,
                    periodStart: sortedDates[0].toLocaleDateString('ru-RU'),
                    periodEnd: sortedDates[sortedDates.length - 1].toLocaleDateString('ru-RU')
                });
            }
        }
    }
    tenderData.sort((a,b) => b.metrics.finalC - a.metrics.finalC);
    return tenderData;
}

function exportTenderCSV() {
    const data = getTenderData();
    if (!data) return;
    if (data.length === 0) return showToast("Недостаточно данных по подрядчикам на этом объекте.");

    let csvContent = "\uFEFF"; 
    const headers = ['Подрядчик', 'Интегр. УрК', 'Средний балл', 'Проверок', 'B3 (%)', 'Стабильность', 'Системность (Ks)', 'Рекомендация'];
    csvContent += headers.join(";") + "\r\n";

    data.forEach(d => {
        const row = [ d.name, d.metrics.finalC + '%', d.metrics.baseUrkContrPerc + '%', d.metrics.count, d.metrics.rateB3.toFixed(1) + '%', d.metrics.stabilityIndex + '%', d.metrics.ks.toFixed(2), d.rec ];
        csvContent += row.join(";") + "\r\n";
    });

    downloadFile(csvContent, `Tender_Report_${data[0].proj.replace(/\W/g,'_')}.csv`, 'text/csv');
    showToast("✅ CSV файл выгружен!");
}

function exportTenderPDF() {
    const data = getTenderData();
    if (!data) return;
    if (data.length === 0) return showToast("Недостаточно данных по подрядчикам на этом объекте.");

    const projName = data[0].proj;
    let content = '';

    // Генерируем по одной странице на каждого подрядчика
    data.forEach(d => {
        const m = d.metrics;
        
        // Сортируем причины дефектов по убыванию (Топ-5)
        const sortedCauses = Object.keys(d.causes).sort((a,b) => d.causes[b] - d.causes[a]).slice(0, 5);
        let causesHtml = sortedCauses.map(code => {
            const cName = DEFECT_CAUSES.find(x => x.code === code)?.name || 'Иное';
            return `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:8px 0;">
                    <span style="color:#334155; font-size:12px;">${cName}</span>
                    <span style="font-weight:bold; color:#0f172a;">${d.causes[code]} шт.</span>
                </div>`;
        }).join('');
        
        if(!causesHtml) causesHtml = '<div style="color:#64748b; font-size:12px; padding:8px 0; text-align:center;">Дефектов не зафиксировано</div>';

        content += `
        <div style="page-break-after: always; padding-top: 20px;">
            <div style="text-align:center; border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 30px;">
                <h1 style="font-size: 28px; color:#0f172a; text-transform:uppercase; font-weight:900; margin:0;">ПАСПОРТ КАЧЕСТВА ПОДРЯДЧИКА</h1>
                <div style="font-size: 16px; color:#64748b; font-weight:bold; margin-top:8px;">Итоговая историческая справка для тендерного отдела</div>
            </div>

            <table style="width: 100%; border-spacing: 0; margin-bottom: 30px;">
                <tr>
                    <td style="width: 60%; vertical-align: top;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Организация</div>
                        <div style="font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 15px;">${d.name}</div>
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Объект выполнения работ</div>
                        <div style="font-size: 16px; font-weight: bold; color: #334155; margin-bottom: 15px;">${projName}</div>
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Глубина исторической оценки</div>
                        <div style="font-size: 14px; font-weight: bold; color: #334155;">с ${d.periodStart} по ${d.periodEnd}</div>
                    </td>
                    <td style="width: 40%; vertical-align: top;">
                        <div style="background: ${m.finalC < 70 ? '#fef2f2' : (m.finalC < 85 ? '#fffbeb' : '#f0fdf4')}; border: 2px solid ${m.finalC < 70 ? '#fca5a5' : (m.finalC < 85 ? '#fde68a' : '#bbf7d0')}; border-radius: 12px; padding: 20px; text-align: center;">
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 900;">Надежность (ИУрК)</div>
                            <div style="font-size: 64px; font-weight: 900; color: ${m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a')}; line-height: 1; margin: 10px 0;">${m.finalC}%</div>
                            <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">База: ${m.count} проверок</div>
                        </div>
                    </td>
                </tr>
            </table>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; text-align: center;">
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Ср. УрК Изделий</div>
                    <div style="font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 5px;">${m.baseUrkContrPerc}%</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; text-align: center;">
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Стабильность</div>
                    <div style="font-size: 24px; font-weight: 900; color: ${m.stabColor}; margin-top: 5px;">${m.stabilityIndex}</div>
                </div>
                <div style="background: ${m.ks < 1 ? '#fffbeb' : '#f8fafc'}; border: 1px solid ${m.ks < 1 ? '#fde68a' : '#cbd5e1'}; border-radius: 8px; padding: 15px; text-align: center;">
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Системность (Ks)</div>
                    <div style="font-size: 24px; font-weight: 900; color: ${m.ks < 1 ? '#d97706' : '#0f172a'}; margin-top: 5px;">${m.ks.toFixed(2)}</div>
                </div>
                <div style="background: ${m.n_изделий_с_B3 > 0 ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${m.n_изделий_с_B3 > 0 ? '#fca5a5' : '#cbd5e1'}; border-radius: 8px; padding: 15px; text-align: center;">
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Аварии (B3)</div>
                    <div style="font-size: 24px; font-weight: 900; color: ${m.n_изделий_с_B3 > 0 ? '#dc2626' : '#16a34a'}; margin-top: 5px;">${m.n_изделий_с_B3} шт</div>
                </div>
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                <div style="flex: 1; background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Коренные причины дефектов</h3>
                    ${causesHtml}
                </div>
            </div>

            <div style="background: ${m.finalC < 70 || m.rateB3 >= 20 ? '#fef2f2' : (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60 ? '#fffbeb' : '#f0fdf4')}; border: 2px solid ${m.finalC < 70 || m.rateB3 >= 20 ? '#fca5a5' : (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60 ? '#fde68a' : '#bbf7d0')}; border-radius: 8px; padding: 20px; page-break-inside: avoid;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; color: ${m.finalC < 70 || m.rateB3 >= 20 ? '#991b1b' : (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60 ? '#b45309' : '#166534')}; text-transform: uppercase;">ЗАКЛЮЧЕНИЕ: ${d.rec}</h3>
                <p style="font-size: 14px; color: #1e293b; line-height: 1.5; margin: 0; font-weight: bold;">
                    ${d.recDesc}
                </p>
            </div>
        </div>
        `;
    });

    printPdfShell(`Паспорта Подрядчиков | ${projName}`, content, "A4");
}

// ============================================================================
// === ИМПОРТ И ЭКСПОРТ ДАННЫХ (ЕДИНЫЙ СУПЕР-БЭКАП) ===
// ============================================================================

function handleDataExport(type) {
    if (type === 'json') {
        showToast("⚙️ Сборка полной базы данных...");
        
        // Отделяем только пользовательские документы, чтобы не дублировать системные (встроенные в код)
        const userDocsToExport = customDocs.filter(d => !String(d.id).startsWith('sys_'));

        // Собираем АБСОЛЮТНО ВСЁ в один гигантский объект
        const fullBackup = {
            type: "RBI_FULL_BACKUP",
            version: "16.5",
            timestamp: new Date().toISOString(),
            data: {
                history: contractorArray, // История проверок (ВКЛЮЧАЯ ВСЕ ФОТОГРАФИИ)
                templates: userTemplates, // Пользовательские чек-листы
                twi: customTwiCards,      // Инструкции и TWI карты (ВКЛЮЧАЯ ФОТО И PDF)
                docs: userDocsToExport,   // База НД
                expert: customExpertConclusions, // Отредактированные заключения ИИ
                gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [] // Логи Геймификации
            }
        };
        
        const dataStr = JSON.stringify(fullBackup);
        downloadFile(dataStr, `rbi_full_backup_${new Date().toLocaleDateString('ru-RU')}.json`, 'application/json');
        showToast("✅ Полный бэкап скачан!");
        
    } else if (type === 'csv') {
        // Обычная выгрузка всего массива проверок в Excel-файл
        const csv = exportToCSV(contractorArray);
        if(csv) downloadFile(csv, `rbi_full_report_${new Date().toLocaleDateString('ru-RU')}.csv`, 'text/csv');
        else showToast('Нет данных для выгрузки');
    }
}

function triggerDataImport() { 
    document.getElementById('db-import-input').click(); 
}

function processDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast("⚙️ Чтение файла и слияние баз...");
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            let addedHist = 0, addedTmpl = 0, addedTwi = 0, addedDocs = 0, addedExpert = 0;

            // СЦЕНАРИЙ 1: ЭТО НОВЫЙ СУПЕР-БЭКАП (Сборка всего)
            if (parsed.type === "RBI_FULL_BACKUP" && parsed.data) {
                
                // А. СЛИЯНИЕ ИСТОРИИ ПРОВЕРОК
                if (parsed.data.history && Array.isArray(parsed.data.history)) {
                    for(const item of parsed.data.history) {
                        // Если проверки с таким ID еще нет - добавляем. Старые не трогаем!
                        if(!contractorArray.find(x => x.id === item.id)) {
                            contractorArray.push(item);
                            await dbPut(STORES.HISTORY, item);
                            addedHist++;
                        }
                    }
                    contractorArray.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
                
                // Б. СЛИЯНИЕ ЧЕК-ЛИСТОВ (Добавляем только те, которых нет)
                if (parsed.data.templates) {
                    for(const key in parsed.data.templates) {
                        if(!userTemplates[key]) { 
                            userTemplates[key] = parsed.data.templates[key];
                            await dbPut(STORES.TEMPLATES, { slug: key, data: parsed.data.templates[key] });
                            addedTmpl++;
                        }
                    }
                }

                // В. СЛИЯНИЕ TWI КАРТ И ПРАВИЛ
                if (parsed.data.twi && Array.isArray(parsed.data.twi)) {
                    for(const item of parsed.data.twi) {
                        if(!customTwiCards.find(x => x.id === item.id)) {
                            customTwiCards.push(item);
                            addedTwi++;
                        }
                    }
                    const userCardsToSave = customTwiCards.filter(c => !String(c.id).startsWith('sys_'));
                    await dbPut(STORES.SETTINGS, { key: 'custom_twi_cards', data: userCardsToSave });
                }

                // Г. СЛИЯНИЕ БАЗЫ НОРМАТИВНЫХ ДОКУМЕНТОВ (НД)
                if (parsed.data.docs && Array.isArray(parsed.data.docs)) {
                    for(const item of parsed.data.docs) {
                        if(!customDocs.find(x => x.id === item.id)) {
                            customDocs.push(item);
                            addedDocs++;
                        }
                    }
                    const userDocsToSave = customDocs.filter(d => !String(d.id).startsWith('sys_'));
                    await dbPut(STORES.SETTINGS, { key: 'custom_docs', data: userDocsToSave });
                }

                // Д. СЛИЯНИЕ ЭКСПЕРТНЫХ ЗАКЛЮЧЕНИЙ (БЕЗ ЗАТИРАНИЯ ТВОИХ!)
                if (parsed.data.expert) {
                    for(const key in parsed.data.expert) {
                        if(!customExpertConclusions[key]) {
                            customExpertConclusions[key] = parsed.data.expert[key];
                            addedExpert++;
                        }
                    }
                    scheduleSessionSave(); 
                }

                // Е. СЛИЯНИЕ ЛОГОВ АКТИВНОСТИ (Геймификация)
                if (parsed.data.gameLogs && Array.isArray(parsed.data.gameLogs) && typeof gameActionLogs !== 'undefined') {
                    let addedLogs = 0;
                    for (const log of parsed.data.gameLogs) {
                        if (!gameActionLogs.find(x => x.id === log.id)) {
                            gameActionLogs.push(log);
                            addedLogs++;
                        }
                    }
                    if (addedLogs > 0 && typeof gameSaveLogs === 'function') gameSaveLogs();
                }

                showToast(`✅ Базы слиты!\nПров: +${addedHist} | Чек-листов: +${addedTmpl}\nTWI: +${addedTwi} | НД: +${addedDocs}`);

            } 
            // СЦЕНАРИЙ 2: ЭТО СТАРЫЙ БЭКАП (Только массив истории проверок) - Обратная совместимость
            else if (Array.isArray(parsed)) {
                for(const item of parsed) {
                    if(!contractorArray.find(x => x.id === item.id)) {
                        contractorArray.push(item);
                        await dbPut(STORES.HISTORY, item);
                        addedHist++;
                    }
                }
                contractorArray.sort((a, b) => new Date(b.date) - new Date(a.date));
                showToast(`✅ История объединена! Добавлено: ${addedHist} шт.`);
            } else {
                throw new Error("Неизвестный формат файла");
            }
            
            // ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ ВЕСЬ ИНТЕРФЕЙС
            updateAllDynamicFilters();
            renderSelector(); 
            
            if (document.getElementById('tab-history').classList.contains('active')) {
                renderHistoryTab();
            } else if (document.getElementById('tab-analytics').classList.contains('active')) {
                updateAnalyticsFilters(); 
                renderCurrentAnalyticsTab();
            } else if (document.getElementById('tab-reference').classList.contains('active')) {
                const activeSub = document.querySelector('.ref-sub-section:not(.hidden)');
                if (activeSub && activeSub.id === 'ref-sub-checklists') renderReferenceTab();
                else if (activeSub && activeSub.id === 'ref-sub-twi') renderTwiList();
                else if (activeSub && activeSub.id === 'ref-sub-docs') renderDocsList();
            }
            
        } catch (err) { 
            console.error(err);
            alert("Ошибка файла бэкапа. Проверьте формат."); 
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Сбрасываем input
}