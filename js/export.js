/* Файл: js/export.js */
// === МОДУЛЬ ГЕНЕРАЦИИ ОТЧЕТОВ (PDF, CSV, ПАСПОРТА) ===

// 1. Главный обработчик всплывающего меню выгрузки
// 1. Главный обработчик всплывающего меню выгрузки
function handleFabExportAction(actionType, mode = 'script') {
    closeFabExportMenu();
    const data = getFilteredAnalyticsData();
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    showToast(mode === 'script' ? '⏳ Формируем PDF файл...' : '🖨️ Подготовка к печати...');
    
    setTimeout(() => {
        if (actionType === 'current') {
            exportPdfCurrentScreen(data, mode);
        } else if (actionType === 'full_report') {
            exportPdfFullObjectReport(data, mode);
        } else if (actionType === 'poster') {
            exportPdfPoster(data, mode);
        } else if (actionType === 'onepager') {
            exportPdfOnePager(data, mode);
        } else if (actionType === 'data') {
            exportPdfData(data, mode);
        }
    }, 500);
}

// Вспомогательная функция для генерации графиков "на лету" (для PDF)
function generatePdfChart(config, width = 600, height = 200) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    config.options = config.options || {};
    config.options.animation = false; // Отключаем анимацию для моментального рендера
    config.options.responsive = false;
    const chart = new Chart(canvas, config);
    const url = canvas.toDataURL('image/png');
    chart.destroy();
    return url;
}

// 6. Сводный отчет для руководителя (One-Pager - Формат А3 Альбомный)
function exportPdfOnePager(data, mode = 'script') {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    const projName = document.getElementById('inp-project')?.value || 'Не указан';
    const inspName = document.getElementById('inp-inspector')?.value || 'Не указан';

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
    
    let pdfIkoColor = "#64748b";
    if (mData.ikoColor.includes('red')) pdfIkoColor = "#dc2626";
    else if (mData.ikoColor.includes('orange')) pdfIkoColor = "#f59e0b";
    else if (mData.ikoColor.includes('green')) pdfIkoColor = "#16a34a";

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
        if (prev === undefined || prev === null || prev === "" || isNaN(prev)) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:10px; font-weight:bold; background:#f1f5f9; padding:2px 4px; border-radius:4px;">Нет базы</span></div>`;
        let diff = (parseFloat(curr) - parseFloat(prev));
        if (Math.abs(diff) < 0.01) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:14px; font-weight:900;">▬ 0</span><div style="font-size:8px; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626';
        const sign = diff > 0 ? '▲' : '▼';
        return `<div style="text-align:right;"><span style="color:${color}; font-size:16px; font-weight:900;">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff)?0:2)}</span><div style="font-size:8px; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
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
                        if (!b3Map[defName]) b3Map[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно'), name: defName };
                        b3Map[defName].count++;
                        if (photo) b3Map[defName].photo = photo; 
                    } else {
                        if (!b2Map[defName]) b2Map[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно'), name: defName };
                        b2Map[defName].count++;
                        if (photo) b2Map[defName].photo = photo;
                    }
                } else if (s === 'ok' && photo) {
                    if (!okMap[defName]) okMap[defName] = { count: 0, photo: null, contr: (i.contractorName || 'Неизвестно'), name: defName };
                    okMap[defName].count++;
                    if (photo) okMap[defName].photo = photo;
                }
            });
        }
    });

    const topB3 = Object.values(b3Map).sort((a,b) => b.count - a.count).slice(0, 5);
    const topB2 = Object.values(b2Map).sort((a,b) => b.count - a.count).slice(0, 5);
    const topOK = Object.values(okMap).sort((a,b) => b.count - a.count).slice(0, 5);

    // ЖЕЛЕЗОБЕТОННАЯ СЕТКА ФОТОГРАФИЙ ЧЕРЕЗ ТАБЛИЦУ
    const renderPhotoGridRow = (arr, type) => {
        while(arr.length < 5) { arr.push({ empty: true }); }
        let badgeColor = type === 'b3' ? '#dc2626' : (type === 'b2' ? '#d97706' : '#16a34a');
        return `
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; table-layout: fixed;">
            <tr>
            ${arr.slice(0, 5).map(d => {
                if (d.empty) return `<td style="border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc; height:155px;"></td>`;
                return `
                <td style="border:1px solid #cbd5e1; border-radius:8px; background:white; vertical-align:top; overflow:hidden; padding:0; height:155px;">
                    <div style="width:100%; height:95px; background:#f1f5f9; text-align:center;">
                        ${d.photo ? `<img src="${d.photo}" style="width:100%; height:100%; object-fit:cover; display:block;">` : `<span style="color:#cbd5e1; font-size:12px; font-weight:bold; line-height:95px;">НЕТ ФОТО</span>`}
                    </div>
                    <div style="padding:6px; height:60px; background:white; border-top:2px solid ${badgeColor};">
                        <div style="font-size:10px; font-weight:900; color:#0f172a; line-height:1.2; overflow:hidden; height:24px;">${d.name}</div>
                        <div style="font-size:9px; color:#64748b; font-weight:bold; margin-top:2px; white-space:nowrap; overflow:hidden;">👤 ${d.contr} (${d.count} шт)</div>
                    </div>
                </td>`;
            }).join('')}
            </tr>
        </table>`;
    };

    const cSpark = document.getElementById('op-sparkline-chart');
    let imgSpark = '';
    if (cSpark && cSpark.width > 0 && cSpark.height > 0) {
        try { imgSpark = `<img style="width:100%; height:55px; object-fit:fill;" src="${cSpark.toDataURL('image/png')}">`;
        } catch(e) {}
    }

    const cLine = document.getElementById('op-line-chart');
    const imgLine = cLine ? `<img style="width:100%; height:100%; object-fit:contain;" src="${cLine.toDataURL('image/png')}">` : '';

    const pdcaTextRaw = document.getElementById('hidden_pdca_text')?.value || "Нет данных для формирования решения.";
    const pdfFormattedText = pdcaTextRaw.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 4px;">$1</div>').replace(/\n/g, '<br>');
    
    let periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';
    const isGlobalDanger = parseFloat(mData.IKO) >= 0.60 || sumB3 > 0;

    let ratingHtml = '';
    if (ratingData.length === 0) {
        ratingHtml = '<div style="font-size:10px; color:#94a3b8; text-align:center; padding: 20px;">Нет данных</div>';
    } else {
        const renderRow = (r) => `
            <table style="width:100%; margin-bottom:6px; border-collapse:collapse;">
                <tr>
                    <td style="width:100px; font-size:11px; font-weight:bold; color:#334155; overflow:hidden;">${r.name}</td>
                    <td style="background:#e2e8f0; height:12px; border-radius:6px; padding:0; border:1px solid #cbd5e1; width:auto;">
                        <div style="width:${r.val}%; background:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')}; height:100%; border-radius:6px;"></div>
                    </td>
                    <td style="width:30px; text-align:right; font-size:11px; font-weight:900; color:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')};">
                        ${r.val}%
                    </td>
                </tr>
            </table>`;
            
        if (ratingData.length <= 10) ratingHtml = ratingData.map(renderRow).join('');
        else ratingHtml = ratingData.slice(0, 5).map(renderRow).join('') + `<div style="text-align:center; font-size:9px; color:#94a3b8; font-weight:bold; padding:2px 0; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:2px 0;">... Скрыто ${ratingData.length - 10} ...</div>` + ratingData.slice(-5).map(renderRow).join('');
    }

    const content = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
                <!-- ЛЕВАЯ КОЛОНКА (30%) -->
                <td style="width: 32%; vertical-align: top; padding-right: 15px;">
                    
                    <table style="width: 100%; border-spacing: 8px 8px; border-collapse: separate; margin-left:-8px; margin-top:-8px;">
                        <tr>
                            <td style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; width:50%;">
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                                <table style="width:100%; margin-top:5px;"><tr><td style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">${currAvgUrk}%</td><td>${renderTrend(currAvgUrk, prevAvgUrk, trendLabel)}</td></tr></table>
                            </td>
                            <td style="background: ${parseFloat(mData.IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 10px; border-radius: 8px; border: 1px solid ${parseFloat(mData.IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; width:50%;">
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска</div>
                                <table style="width:100%; margin-top:5px;"><tr><td style="font-size: 26px; font-weight: 900; color: ${pdfIkoColor}; line-height: 1;">${mData.IKO}</td><td>${renderTrend(mData.IKO, prevIko, trendLabel, true)}</td></tr></table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                                <table style="width:100%; margin-top:5px;"><tr><td style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">${data.length}</td><td>${renderTrend(data.length, prevChecks, trendLabel)}</td></tr></table>
                            </td>
                            <td style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Подрядчиков</div>
                                <table style="width:100%; margin-top:5px;"><tr><td style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">${currContractorsCount}</td><td>${renderTrend(currContractorsCount, prevContrsCount, trendLabel)}</td></tr></table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fecaca;">
                                <div style="font-size: 9px; color: #991b1b; text-transform: uppercase; font-weight: 900;">В красной зоне</div>
                                <div style="font-size: 26px; font-weight: 900; color: #dc2626; margin-top: 5px; line-height: 1;">${mData.redZonePerc}%</div>
                            </td>
                            <td style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; position: relative;">
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900; position:relative; z-index:2;">Тренд (6 нед)</div>
                                <div style="position:absolute; bottom:0; left:0; width:100%;">${imgSpark}</div>
                            </td>
                        </tr>
                    </table>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 10px; height:200px;">
                        <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 5px; text-align: center;">📈 Динамика Подрядчиков</div>
                        <div style="height:160px; text-align:center;">${imgLine ? imgLine : '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}</div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; height:250px;">
                        <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; text-align: center;">🏆 Интегральный УрК</div>
                        <div>${ratingHtml}</div>
                    </div>
                </td>

                <!-- ПРАВАЯ КОЛОНКА (68%) -->
                <td style="width: 68%; vertical-align: top;">
                    <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 10px; margin-bottom:10px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #dc2626; text-transform: uppercase;">🚨 ТОП-5 Критических дефектов (B3)</h3>
                        ${renderPhotoGridRow(topB3, 'b3')}
                    </div>

                    <div style="background: #fffbeb; border: 2px solid #fde68a; border-radius: 8px; padding: 10px; margin-bottom:10px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #d97706; text-transform: uppercase;">🔄 ТОП-5 Повторяющихся нарушений (B2)</h3>
                        ${renderPhotoGridRow(topB2, 'b2')}
                    </div>
                    
                    <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 8px; padding: 10px; margin-bottom:10px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #16a34a; text-transform: uppercase;">✅ ТОП-5 Эталонных работ (OK)</h3>
                        ${renderPhotoGridRow(topOK, 'ok')}
                    </div>

                    <div style="background: ${isGlobalDanger ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${isGlobalDanger ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: ${isGlobalDanger ? '#b45309' : '#166534'}; text-transform: uppercase; border-bottom: 2px solid ${isGlobalDanger ? '#fde047' : '#86efac'}; padding-bottom: 6px;">🎯 Управленческое Решение и Риски</h3>
                        <div style="font-size: 13px; line-height: 1.5; color: #1e293b; columns: 2; column-gap: 20px;">${pdfFormattedText}</div>
                    </div>
                </td>
            </tr>
        </table>
    `;

    printPdfShell("Сводка для Руководства", content, "A3", "landscape", mode);
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
// 5. Текущий экран (Детализация Подрядчика или Список А4)
function exportPdfCurrentScreen(data, mode = 'script') {
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
            <table style="width: 100%; border-spacing: 10px 0; border-collapse: separate; table-layout: fixed; margin-left: -10px; margin-bottom: 15px;">
                <tr>
                ${paddedArr.map(src => {
                    if (!src) return `<td style="border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc; height:130px;"></td>`;
                    return `<td style="border:2px solid ${color}; border-radius:8px; background:white; padding:0; height:130px;">
                        <img src="${src}" style="width:100%; height:100%; object-fit:cover; display:block;">
                    </td>`;
                }).join('')}
                </tr>
            </table>`;
        };

        const content = `
            <div style="border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 20px;" class="no-break">
                <h2 style="margin:0; font-size: 24px; color:#0f172a; text-transform:uppercase;">Детализация: ${currentDetailedContractor}</h2>
                <div style="color:#64748b; font-weight:bold; margin-top:5px;">Вид работ: ${workType} | Выборка: ${m.count} проверок</div>
            </div>
            
            <table style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;" class="no-break">
                <tr>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Ср. УрК Изделий</div>
                        <div style="font-size:36px; font-weight:900; color:#0f172a;">${m.baseUrkContrPerc}%</div>
                        <div style="font-size:10px; font-weight:bold; color:#475569;">До штрафов</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность (ИУрК)</div>
                        <div style="font-size:36px; font-weight:900; color:${m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a')};">${m.finalC}%</div>
                        <div style="font-size:10px; font-weight:bold; color:#475569;">Погрешность: ±${m.ci95_margin.toFixed(1)}%</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Стабильность</div>
                        <div style="font-size:36px; font-weight:900; color:#0f172a;">${m.stabilityIndex}</div>
                        <div style="font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;">${m.stabText}</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Дефекты B3 / B2</div>
                        <div style="font-size:36px; font-weight:900; color:#dc2626;">${m.n_изделий_с_B3} <span style="color:#d97706; font-size:24px;">/ ${photosB2.length}</span></div>
                        <div style="font-size:10px; font-weight:bold; color:#475569;">Критичность: ${m.kcritC.toFixed(2)}</div>
                    </td>
                </tr>
            </table>

            ${expertText}
            
            <div class="no-break">
                <h3 style="color:#dc2626; font-size:14px; text-transform:uppercase; margin-bottom:10px;">🚨 Критические дефекты (B3)</h3>
                ${renderPhotoStrip(photosB3, '#fca5a5')}
            </div>
            
            <div class="no-break">
                <h3 style="color:#d97706; font-size:14px; text-transform:uppercase; margin-bottom:10px;">⚠️ Значимые дефекты (B2)</h3>
                ${renderPhotoStrip(photosB2, '#fde68a')}
            </div>
        `;
        printPdfShell(`Срез: ${currentDetailedContractor}`, content, "A4", "portrait", mode);

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
                if (m.count >= 7) { sumIntegralUrk += m.finalC; validContrCount++; }
            }
        }
        cList.sort((a,b) => b.metrics.finalC - a.metrics.finalC);
        const avgIntegralUrk = validContrCount > 0 ? Math.round(sumIntegralUrk / validContrCount) : 0;

        const globalKey = 'global_main_analysis';
        let rawSmartText = customExpertConclusions[globalKey];
        let aiHtml = '';
        if (rawSmartText) {
            const isCustomText = !!customExpertConclusions[globalKey];
            const pdfFormattedText = rawSmartText.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;">$1</div>').replace(/\n/g, '<br>');
            
            aiHtml = `
            <div class="no-break" style="margin-bottom: 20px; border: 1px solid ${isCustomText ? '#fde047' : '#cbd5e1'}; border-radius: 8px; background: ${isCustomText ? '#fefce8' : '#f8fafc'}; padding: 15px;">
                <h3 style="margin-top: 0; font-size: 14px; border-bottom: 2px solid ${isCustomText ? '#fef08a' : '#e2e8f0'}; padding-bottom: 8px; margin-bottom: 15px; color: ${isCustomText ? '#854d0e' : '#0f172a'};">
                    ${isCustomText ? '⚠️ АНАЛИЗ ЗОН РИСКА (С КОРРЕКТИРОВКАМИ ИНЖЕНЕРА)' : '🧠 АНАЛИЗ ЗОН РИСКА (АВТОМАТИЧЕСКИЙ)'}
                </h3>
                <div style="font-size: 12px; line-height: 1.5; color: #1e293b; white-space: pre-wrap;">${pdfFormattedText}</div>
            </div>`;
        }

        const renderContractorCard = (c) => {
            if (!c) return '';
            const m = c.metrics;
            const color = m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a');
            const borderColor = m.finalC < 70 ? '#fca5a5' : '#cbd5e1';
            const bg = m.finalC < 70 ? '#fef2f2' : 'white';
            
            return `
            <div class="no-break" style="border:2px solid ${borderColor}; border-radius:12px; padding:15px; background:${bg}; margin-bottom: 15px;">
                <table style="width: 100%; border: none;">
                    <tr>
                        <td style="width:70%; vertical-align: top;">
                            <div style="font-size:14px; font-weight:900; color:#0f172a; line-height:1.2;">${c.name}</div>
                            <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold; margin-top:4px;">${c.workType}</div>
                        </td>
                        <td style="text-align:right; vertical-align: top;">
                            <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность</div>
                            <div style="font-size:24px; font-weight:900; color:${color}; line-height:1;">
                                ${m.count < 7 ? '<span style="font-size:12px;color:#64748b;">СБОР</span>' : m.finalC + '%'}
                            </div>
                        </td>
                    </tr>
                </table>
                <table style="width: 100%; border-top:1px solid #e2e8f0; padding-top:10px; margin-top:10px; text-align: center;">
                    <tr>
                        <td>
                            <div style="color:#64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">Ср. УрК</div>
                            <div style="font-weight:900; font-size:14px;">${m.baseUrkContrPerc}%</div>
                        </td>
                        <td>
                            <div style="color:#64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">Проверок</div>
                            <div style="font-weight:900; font-size:14px;">${m.count}</div>
                        </td>
                        <td>
                            <div style="color:#64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">Стабильность</div>
                            <div style="font-weight:900; font-size:14px; color:${m.count < 7 ? '#94a3b8' : '#0f172a'};">${m.count < 7 ? '-' : m.stabilityIndex}</div>
                        </td>
                        <td>
                            <div style="color:#64748b; font-size:8px; text-transform:uppercase; font-weight:bold;">B3</div>
                            <div style="font-weight:900; font-size:14px; color:${m.n_изделий_с_B3 > 0 ? '#dc2626' : '#16a34a'};">${m.n_изделий_с_B3}</div>
                        </td>
                    </tr>
                </table>
            </div>`;
        };

        const tableRows = [];
        for (let i = 0; i < cList.length; i += 2) {
            const left  = cList[i];
            const right = cList[i + 1];
            tableRows.push(`
                <tr class="no-break">
                    <td style="width:50%; vertical-align:top; padding-right:8px;">${renderContractorCard(left)}</td>
                    <td style="width:50%; vertical-align:top; padding-left:8px;">${right ? renderContractorCard(right) : ''}</td>
                </tr>
            `);
        }

        const content = `
            <div class="no-break" style="margin-bottom: 20px;">
                <h2 style="margin:0; font-size: 20px; color:#0f172a; text-transform:uppercase;">Отчет: Текущий срез подрядчиков</h2>
                <div style="font-size: 12px; color: #64748b; font-weight:bold; margin-top:5px;">Сформировано на основе активных фильтров (Всего: ${data.length} пров.)</div>
            </div>
            
            <table class="no-break" style="width: 100%; border-spacing: 10px 0; border-collapse: separate; table-layout: fixed; margin-left: -10px; margin-bottom: 20px;">
                <tr>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                        <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Ср. УрК Изделий</div>
                        <div style="font-size:24px; font-weight:900; color:${avgUrkProd < 70 ? '#dc2626' : (avgUrkProd < 85 ? '#d97706' : '#16a34a')};">${avgUrkProd}%</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                        <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность (ИУрК)</div>
                        <div style="font-size:24px; font-weight:900; color:${avgIntegralUrk < 70 ? '#dc2626' : (avgIntegralUrk < 85 ? '#d97706' : '#16a34a')};">${validContrCount > 0 ? avgIntegralUrk+'%' : 'СБОР'}</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                        <div style="font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold;">Дефекты B3 / B2</div>
                        <div style="font-size:24px; font-weight:900; color:#dc2626;">${sumB3} <span style="color:#d97706; font-size:16px;">/ ${sumB2}</span></div>
                    </td>
                </tr>
            </table>
            
            ${aiHtml}
            
            <table style="width:100%; border-collapse:collapse; border-spacing:0; table-layout: fixed;">
                ${tableRows.join('')}
            </table>
        `;
        printPdfShell("Список подрядчиков", content, "A4", "portrait", mode);
    }
}


// ============================================================================
// 2. ПОЛНЫЙ ОТЧЕТ ПО ОБЪЕКТУ ДЛЯ СОВЕЩАНИЙ (А3 Альбомный, Табличная сетка)
// ============================================================================
// 6. Выгрузка Полного отчета по объекту (Паспорта подрядчиков А3)
function exportPdfFullObjectReport(data, mode = 'script') {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    const projName = document.getElementById('inp-project')?.value || 'Не указан';
    
    // --- ДАННЫЕ ДЛЯ ТИТУЛЬНОГО ЛИСТА ---
    let sumUrkProd = 0;
    data.forEach(i => { if(i.metrics) { sumUrkProd += i.metrics.final; } });
    const avgUrkProd = data.length > 0 ? Math.round(sumUrkProd / data.length) : 0;

    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
    const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
    const redZonePerc = currIntMetrics ? currIntMetrics.redZonePerc : 0;

    const grouped = {};
    data.forEach(item => { 
        const cKey = `${item.contractorName} [${item.projectName || 'Без объекта'}]`;
        grouped[cKey] = grouped[cKey] || []; 
        grouped[cKey].push(item); 
    });

    const cList = [];
    for(let cName in grouped) {
        const m = getContractorMetrics(grouped[cName], userTemplates);
        if (m && m.count >= 3) {
            let b1 = 0, b2 = 0, b3 = 0;
            grouped[cName].forEach(i => { if(i.metrics) { b1 += i.metrics.n_B1_fail; b2 += i.metrics.n_B2_fail; b3 += i.metrics.n_B3_fail; } });
            cList.push({ name: cName, metrics: m, workType: grouped[cName][0].templateTitle, data: grouped[cName], defects: {b1, b2, b3} });
        }
    }
    cList.sort((a,b) => b.metrics.finalC - a.metrics.finalC);

    if (cList.length === 0) return showToast('Слишком мало данных для отчета по подрядчикам');

    // Графики для титульника
    const cLine = document.getElementById('op-line-chart');
    const imgLineGlobal = cLine ? `<img style="width:100%; height:180px; object-fit:contain; display:block;" src="${cLine.toDataURL('image/png')}">` : '';

    const barChartUrlGlobal = generatePdfChart({
        type: 'bar',
        data: {
            labels: cList.map(r => r.name.substring(0, 15) + '...'),
            datasets: [{
                data: cList.map(r => r.metrics.finalC),
                backgroundColor: cList.map(r => r.metrics.finalC < 70 ? '#ef4444' : (r.metrics.finalC < 85 ? '#f59e0b' : '#22c55e')),
                borderRadius: 4
            }]
        },
        options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
    }, 800, 250);

    // ГЕНЕРАТОР ТАБЛИЦ ФОТОГРАФИЙ ДЛЯ ПАСПОРТОВ
    const renderPhotoTable = (arr, title, titleColor, bgCell, borderCell) => {
        const paddedArr = [...arr].slice(0, 4); // По 4 фото (т.к. 80% ширины)
        while(paddedArr.length < 4) paddedArr.push({ empty: true });
        
        let tds = paddedArr.map((p, idx) => {
            let paddingStyle = 'padding: 0 4px;';
            if (idx === 0) paddingStyle = 'padding: 0 4px 0 0;';
            if (idx === 3) paddingStyle = 'padding: 0 0 0 4px;';

            if (p.empty) return `<td style="width: 25%; ${paddingStyle}"><div style="border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; height: 160px;"></div></td>`;
            return `
            <td style="width: 25%; ${paddingStyle}">
                <div style="border: 1px solid ${borderCell}; border-radius: 8px; background: white; overflow: hidden; height: 160px; box-sizing: border-box;">
                    <div style="width: 100%; height: 110px; background: #f1f5f9; text-align: center; border-bottom: 2px solid ${titleColor}; overflow: hidden;">
                        <img src="${p.src}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    </div>
                    <div style="padding: 6px; font-size: 10px; font-weight: bold; color: #0f172a; line-height: 1.2; height: 50px; overflow: hidden; box-sizing: border-box;">${p.name}</div>
                </div>
            </td>`;
        }).join('');

        return `
        <div class="no-break" style="margin-bottom: 12px; background: ${bgCell}; border-radius: 8px; padding: 6px;">
            <h3 style="margin: 0 0 6px 4px; color: ${titleColor}; font-size: 12px; text-transform: uppercase;">${title}</h3>
            <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
                <tr>${tds}</tr>
            </table>
        </div>`;
    };

    // --- СБОРКА ТИТУЛЬНОГО ЛИСТА ---
    let content = `
        <div class="no-break" style="text-align:center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 36px; color: #0f172a; text-transform: uppercase; font-weight: 900;">СВОДНЫЙ ОТЧЕТ ПО КАЧЕСТВУ</h1>
            <div style="font-size: 18px; font-weight: bold; color: #4f46e5; text-transform: uppercase; margin-top: 10px;">ОБЪЕКТ: ${projName}</div>
            <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-top: 5px;">Сформировано на основе ${data.length} проверок</div>
        </div>

        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
                <td style="width: 25%; padding: 0 10px 0 0;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; height: 120px; box-sizing: border-box;">
                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                        <div style="font-size: 42px; font-weight: 900; color: #0f172a; margin-top: 10px;">${avgUrkProd}%</div>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 10px;">
                    <div style="background: ${parseFloat(IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; border: 2px solid ${parseFloat(IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; border-radius: 12px; padding: 20px; text-align: center; height: 120px; box-sizing: border-box;">
                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска (ИКО)</div>
                        <div style="font-size: 42px; font-weight: 900; color: ${parseFloat(IKO) >= 0.6 ? '#dc2626' : (parseFloat(IKO) >= 0.3 ? '#d97706' : '#16a34a')}; margin-top: 10px;">${IKO}</div>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 10px;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; height: 120px; box-sizing: border-box;">
                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                        <div style="font-size: 42px; font-weight: 900; color: #0f172a; margin-top: 10px;">${data.length}</div>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 0 0 10px;">
                    <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; padding: 20px; text-align: center; height: 120px; box-sizing: border-box;">
                        <div style="font-size: 12px; color: #991b1b; text-transform: uppercase; font-weight: 900;">В красной зоне</div>
                        <div style="font-size: 42px; font-weight: 900; color: #dc2626; margin-top: 10px;">${redZonePerc}%</div>
                    </div>
                </td>
            </tr>
        </table>

        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="width: 50%; padding: 0 10px 0 0; vertical-align: top;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15px; height: 260px; box-sizing: border-box;">
                        <div style="font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 10px; text-align: center;">📈 Динамика (Ср. УрК)</div>
                        <div style="text-align: center; height: 200px; overflow: hidden;">${imgLineGlobal || '<span style="color:#94a3b8;">Нет графика</span>'}</div>
                    </div>
                </td>
                <td style="width: 50%; padding: 0 0 0 10px; vertical-align: top;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15px; height: 260px; box-sizing: border-box;">
                        <div style="font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 10px; text-align: center;">📊 Сравнение Подрядчиков (ИУрК)</div>
                        <div style="text-align: center; height: 200px; overflow: hidden;">
                            <img src="${barChartUrlGlobal}" style="width:100%; height:100%; object-fit:contain; display:block;">
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    `;

    // --- ГЕНЕРАЦИЯ ПАСПОРТОВ ПОДРЯДЧИКОВ ---
    cList.forEach((cObj) => {
        const cName = cObj.name;
        const cData = cObj.data;
        const m = cObj.metrics;
        const defs = cObj.defects;

        const colorMain = m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a');
        const bgMain = m.finalC < 70 ? '#fef2f2' : (m.finalC < 85 ? '#fffbeb' : '#f0fdf4');
        const borderMain = m.finalC < 70 ? '#fca5a5' : (m.finalC < 85 ? '#fde68a' : '#bbf7d0');

        // График для подрядчика
        const dates = []; const urkData = [];
        cData.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach((check, i) => {
            dates.push(`#${i+1}`); urkData.push(check.metrics.final);
        });

        const lineChartUrl = generatePdfChart({
            type: 'line',
            data: { labels: dates, datasets: [{ data: urkData, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', tension: 0.3, borderWidth: 2, fill: true, pointRadius: 2 }] },
            options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
        }, 500, 160);

        let photosB3 = []; let photosB2 = []; let photosOK = [];
        cData.forEach(check => {
            if(check.state && check.photos) {
                Object.keys(check.state).forEach(id => {
                    const s = check.state[id];
                    let defName = "Дефект";
                    const flatList = getFlatList(userTemplates[check.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[check.templateKey.replace('sys_','')]?.groups);
                    const item = flatList.find(x => x.id == id);
                    if (item) defName = item.n;

                    if ((s === 'fail' || s === 'fail_escalated') && check.photos[id]) {
                        if (s === 'fail_escalated' || (item && item.w === 3)) photosB3.push({ src: check.photos[id], name: defName });
                        else photosB2.push({ src: check.photos[id], name: defName });
                    } else if (s === 'ok' && check.photos[id]) {
                        photosOK.push({ src: check.photos[id], name: defName });
                    }
                });
            }
        });

        let expertHtml = getExpertConclusion(m, cName, cObj.workType, cData.length, 'print', customExpertConclusions).pdfHtml;
        expertHtml = expertHtml.replace(/font-size:\s*1[23]px/g, 'font-size: 10px').replace(/margin-bottom:\s*1[05]px/g, 'margin-bottom: 6px');

        content += `
        <div class="pdf-page-break"></div>
        <div class="no-break" style="border-bottom: 2px solid #1e293b; padding-bottom: 6px; margin-bottom: 12px;">
            <h1 style="margin: 0 0 4px 0; font-size: 20px; color: #0f172a; text-transform: uppercase;">Паспорт: ${cName}</h1>
            <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Вид работ: ${cObj.workType}</div>
        </div>

        <!-- БЛОК 1: МЕТРИКИ И ГРАФИК ПАСПОРТА -->
        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 12px;">
            <tr>
                <!-- Ср. УрК Изделия (ГЛАВНАЯ МЕТРИКА) -->
                <td style="width: 25%; padding: 0 6px 0 0;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; height: 95px; box-sizing: border-box;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900; margin-bottom: 6px;">Ср. УрК Изделий</div>
                        <div style="font-size: 36px; font-weight: 900; color: #0f172a; line-height: 1;">${m.baseUrkContrPerc}%</div>
                    </div>
                </td>
                <!-- Надежность -->
                <td style="width: 15%; padding: 0 6px;">
                    <div style="background: ${bgMain}; border: 2px solid ${borderMain}; border-radius: 8px; padding: 12px; text-align: center; height: 95px; box-sizing: border-box;">
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">Надежность</div>
                        <div style="font-size: 26px; font-weight: 900; color: ${colorMain}; line-height: 1;">${m.finalC}%</div>
                    </div>
                </td>
                <!-- Проверок -->
                <td style="width: 15%; padding: 0 6px;">
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; height: 95px; box-sizing: border-box;">
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">Проверок</div>
                        <div style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">${m.count}</div>
                    </div>
                </td>
                <!-- Дефекты -->
                <td style="width: 15%; padding: 0 6px;">
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; height: 95px; box-sizing: border-box;">
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">Дефекты B1/B2/B3</div>
                        <div style="font-size: 16px; font-weight: 900; color: #0f172a; line-height: 1.5;">
                            <span style="color:#3b82f6">${defs.b1}</span> / <span style="color:#d97706">${defs.b2}</span> / <span style="color:#dc2626">${defs.b3}</span>
                        </div>
                    </div>
                </td>
                <!-- График -->
                <td style="width: 30%; padding: 0 0 0 6px;">
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; height: 95px; box-sizing: border-box;">
                        <div style="font-size: 9px; color: #0f172a; text-transform: uppercase; font-weight: bold; text-align:center;">Динамика проверок</div>
                        <div style="height: 60px; text-align: center; margin-top: 4px;"><img src="${lineChartUrl}" style="width: 100%; height: 100%; object-fit: contain;"></div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- БЛОК 2: ЗАКЛЮЧЕНИЕ И ФОТО -->
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
            <tr>
                <td style="width: 20%; vertical-align: top; padding-right: 12px;">
                    ${expertHtml}
                </td>
                <td style="width: 80%; vertical-align: top; padding: 0;">
                    ${renderPhotoTable(photosB3, '🚨 Критические дефекты (B3)', '#dc2626', '#fef2f2', '#fca5a5')}
                    ${renderPhotoTable(photosB2, '⚠️ Повторяющиеся дефекты (B2)', '#d97706', '#fffbeb', '#fde68a')}
                    ${renderPhotoTable(photosOK, '✅ Эталоны качества (OK)', '#16a34a', '#f0fdf4', '#bbf7d0')}
                </td>
            </tr>
        </table>
        `;
    });

    printPdfShell("Полный отчет по объекту", content, "A3", "landscape", mode);
}
// ============================================================================
// 3. ПЛАКАТ КАЧЕСТВА (Жесткая одностраничная верстка)
// ============================================================================
// 3. ПЛАКАТ КАЧЕСТВА (Жесткая одностраничная верстка, красивые коллажи)
// 4. Плакат Качества (A3 Альбом)
function exportPdfPoster(data, mode = 'script') {
    let weekData = [];
    let periodStr = '';

    if (typeof isDemoMode !== 'undefined' && isDemoMode && contractorArray.length > 0) {
        weekData = [...contractorArray].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 25);
        periodStr = 'Демонстрационный период';
    } else {
        const now = new Date();
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - (lastWeekEnd.getDay() || 7)); 
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
    let allDefectPhotos = []; let allOkPhotos = [];

    for (let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) {
            const m = getContractorMetrics(cData, userTemplates);
            if (m) {
                cData.forEach(check => {
                    globalUrkSum += check.metrics.final;
                    globalB3Count += check.metrics.n_B3_fail;
                    if(check.photos && check.state) {
                        Object.keys(check.state).forEach(id => {
                            const flatList = getFlatList(userTemplates[check.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[check.templateKey.replace('sys_','')]?.groups);
                            const itemInfo = flatList.find(x => x.id == id);
                            const defName = itemInfo ? itemInfo.n : 'Дефект';

                            if(check.state[id] === 'ok' && check.photos[id]) allOkPhotos.push({ src: check.photos[id], contr: cName, name: defName });
                            if((check.state[id] === 'fail' || check.state[id] === 'fail_escalated') && check.photos[id]) allDefectPhotos.push({ src: check.photos[id], contr: cName, name: defName });
                        });
                    }
                });

                let growth = 0;
                if (!isDemoMode) {
                    const now = new Date();
                    const lastWeekEnd = new Date(now);
                    lastWeekEnd.setDate(lastWeekEnd.getDate() - (lastWeekEnd.getDay() || 7)); 
                    const prevStart = new Date(lastWeekEnd); prevStart.setDate(prevStart.getDate() - 13);
                    const prevEnd = new Date(lastWeekEnd); prevEnd.setDate(prevEnd.getDate() - 7);
                    const prevChecks = contractorArray.filter(i => i.contractorName === cName && new Date(i.date) >= prevStart && new Date(i.date) <= prevEnd);
                    if (prevChecks.length >= 3) {
                        const mPrev = getContractorMetrics(prevChecks, userTemplates);
                        if (mPrev) growth = m.finalC - mPrev.finalC;
                    }
                } else { growth = Math.floor(Math.random() * 15) + 2; }

                candidates.push({ name: cName, workType: cData[0].templateTitle, metrics: m, growth });
            }
        }
    }

    if (candidates.length === 0) return showToast("Недостаточно данных для формирования рейтинга");

    const avgObjectUrk = Math.round(globalUrkSum / weekData.length);
    const ikoMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(weekData, userTemplates) : null;
    const IKO = ikoMetrics ? ikoMetrics.IKO : '0.00';

    candidates.sort((a, b) => b.metrics.finalC - a.metrics.finalC);
    const leaders = candidates.filter(c => c.metrics.finalC >= 85).slice(0, 3);
    let antiLeaders = candidates.filter(c => c.metrics.n_изделий_с_B3 > 0 || c.metrics.finalC < 70).sort((a, b) => {
        if (b.metrics.n_изделий_с_B3 !== a.metrics.n_изделий_с_B3) return b.metrics.n_изделий_с_B3 - a.metrics.n_изделий_с_B3;
        return a.metrics.finalC - b.metrics.finalC;
    }).slice(0, 3);

    let breakthrough = null; let maxGrowth = 0;
    candidates.forEach(c => { if (c.growth > maxGrowth && c.metrics.finalC >= 70) { maxGrowth = c.growth; breakthrough = c; } });

    const renderPosterCard = (c, type) => {
        if (!c) return '';
        const isLeader = type === 'leader'; const isBreak = type === 'break'; const isBad = type === 'bad';
        let color = '#0f172a'; let bg = '#f8fafc'; let bd = '#cbd5e1'; let badge = '';
        
        if (isLeader) { color = '#16a34a'; bg = '#f0fdf4'; bd = '#bbf7d0'; }
        if (isBreak) { color = '#4f46e5'; bg = '#e0e7ff'; bd = '#bae6fd'; badge = `<div style="background:#4f46e5; color:white; padding:2px 4px; border-radius:4px; font-size:10px; font-weight:bold; display:inline-block; margin-bottom:4px;">🚀 +${c.growth}% к прошлой неделе</div>`; }
        if (isBad) { color = '#dc2626'; bg = '#fef2f2'; bd = '#fecaca'; }
        
        return `
        <div class="no-break" style="background: ${bg}; border: 2px solid ${bd}; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            ${badge}
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="vertical-align: top;">
                        <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom:4px; line-height:1.2;">${c.name}</div>
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight:bold;">${c.workType}</div>
                        ${isBad && c.metrics.n_изделий_с_B3 > 0 ? `<div style="margin-top:6px; font-size:10px; font-weight:bold; color:#991b1b; background:#fee2e2; padding:4px 6px; border-radius:4px; display:inline-block;">🚨 Аварий (B3): ${c.metrics.n_изделий_с_B3} шт</div>` : ''}
                    </td>
                    <td style="text-align: right; width: 60px; vertical-align: top;">
                        <div style="font-size: 32px; font-weight: 900; color: ${color}; line-height:1;">${c.metrics.finalC}%</div>
                    </td>
                </tr>
            </table>
        </div>`;
    };

    allDefectPhotos = allDefectPhotos.sort(() => 0.5 - Math.random()).slice(0, 4);
    allOkPhotos = allOkPhotos.sort(() => 0.5 - Math.random()).slice(0, 4);

    const renderCollage = (arr, title, titleColor, borderColor, bgCell) => {
        if (arr.length === 0) return `<div style="text-align:center; padding:20px; color:#94a3b8; font-size:12px; font-weight:bold; border:1px dashed #cbd5e1; border-radius:8px;">Нет фотографий</div>`;
        const paddedArr = [...arr];
        while(paddedArr.length < 4) paddedArr.push({ empty: true });

        return `
            <div class="no-break" style="margin-bottom: 20px;">
                <h3 style="text-align:center; font-size:16px; color:${titleColor}; text-transform:uppercase; margin:0 0 10px 0; font-weight:900;">${title}</h3>
                <table style="width: 100%; border-spacing: 10px 0; border-collapse: separate; table-layout: fixed; margin-left:-10px;">
                    <tr>
                    ${paddedArr.map(p => {
                        if (p.empty) return `<td style="border:1px dashed #cbd5e1; border-radius:8px; background:#f8fafc; height:180px;"></td>`;
                        return `
                        <td style="border:2px solid ${borderColor}; border-radius:8px; background:${bgCell}; padding:0; height:180px; vertical-align:top;">
                            <div style="width:100%; height:130px; background:#f1f5f9; text-align:center;">
                                <img src="${p.src}" style="width:100%; height:100%; object-fit:cover; display:block;">
                            </div>
                            <div style="padding:6px; height:50px; border-top:1px solid ${borderColor};">
                                <div style="font-size:9px; font-weight:900; color:#0f172a; line-height:1.2; overflow:hidden; height:22px;">${p.name}</div>
                                <div style="font-size:8px; color:#475569; font-weight:bold; white-space:nowrap; overflow:hidden;">👤 ${p.contr}</div>
                            </div>
                        </td>`;
                    }).join('')}
                    </tr>
                </table>
            </div>
        `;
    };

    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 32px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900; letter-spacing:1px;">БЮЛЛЕТЕНЬ КАЧЕСТВА СТРОИТЕЛЬСТВА</h1>
            <div style="font-size: 16px; color: #4f46e5; font-weight: 900; margin-top: 4px; text-transform:uppercase;">Итоги: ${periodStr}</div>
        </div>

        <table style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 10px;">
            <tr>
                <td style="vertical-align: top; width:33.3%;">
                    <h2 style="background: #16a34a; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase; font-size:14px; margin-top:0; margin-bottom:12px;">🏆 Лидеры (УрК > 85%)</h2>
                    ${leaders.length > 0 ? leaders.map(c => renderPosterCard(c, 'leader')).join('') : '<div style="text-align:center; padding:20px; color:#64748b; font-size:12px; font-weight:bold; border:1px dashed #cbd5e1; border-radius:8px;">В зеленой зоне никого нет</div>'}
                </td>
                <td style="vertical-align: top; width:33.3%;">
                    <h2 style="background: #4f46e5; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase; font-size:14px; margin-top:0; margin-bottom:12px;">🚀 Прорыв недели</h2>
                    ${breakthrough ? renderPosterCard(breakthrough, 'break') : '<div style="text-align:center; padding:20px; color:#64748b; font-size:12px; font-weight:bold; border:1px dashed #cbd5e1; border-radius:8px;">Значительного прогресса нет</div>'}
                    
                    <div style="margin-top: 20px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 15px; text-align: center;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                        <div style="font-size: 48px; font-weight: 900; color: #0f172a; margin-top:5px;">${avgObjectUrk}%</div>
                    </div>
                    <div style="margin-top: 15px; background: ${parseFloat(IKO) >= 0.6 ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${parseFloat(IKO) >= 0.6 ? '#fca5a5' : '#bbf7d0'}; border-radius: 8px; padding: 15px; text-align: center;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс риска (ИКО)</div>
                        <div style="font-size: 48px; font-weight: 900; color: ${parseFloat(IKO) >= 0.6 ? '#dc2626' : '#16a34a'}; margin-top:5px;">${IKO}</div>
                    </div>
                </td>
                <td style="vertical-align: top; width:33.3%;">
                    <h2 style="background: #ef4444; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase; font-size:14px; margin-top:0; margin-bottom:12px;">⚠️ Зона внимания</h2>
                    ${antiLeaders.length > 0 ? antiLeaders.map(c => renderPosterCard(c, 'bad')).join('') : '<div style="text-align:center; padding:20px; color:#16a34a; font-size:12px; font-weight:bold; border:1px dashed #bbf7d0; border-radius:8px; background:#f0fdf4;">Отличная работа! Отстающих нет!</div>'}
                </td>
            </tr>
        </table>

        <div style="border-top: 3px solid #1e293b; padding-top: 20px; margin-top: 10px;">
            <table style="width: 100%; border-spacing: 20px 0; border-collapse: separate; table-layout: fixed; margin-left:-20px;">
                <tr>
                    <td style="vertical-align:top; width:50%;">
                        ${renderCollage(allOkPhotos, '✅ Эталоны качества (OK)', '#16a34a', '#bbf7d0', '#f0fdf4')}
                    </td>
                    <td style="vertical-align:top; width:50%;">
                        ${renderCollage(allDefectPhotos, '❌ Выявленные нарушения (FAIL)', '#dc2626', '#fca5a5', '#fef2f2')}
                    </td>
                </tr>
            </table>
        </div>
    `;

    printPdfShell("Плакат Качества", content, "A3", "landscape", mode);
}

// 7. Выгрузка сырой базы (Data)
function exportPdfData(data, mode = 'script') {
    if(data.length === 0) return showToast('Нет данных для выгрузки');
    const sortedData = [...data].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    let rowsHtml = sortedData.map((r, i) => {
        const d = new Date(r.date).toLocaleDateString('ru-RU');
        const m = r.metrics;
        const color = m ? (m.final < 70 ? '#dc2626' : (m.final < 85 ? '#f59e0b' : '#16a34a')) : '#475569';
        
        return `
        <tr class="avoid-break" style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align:center;">${i + 1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${d}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;"><b>${r.contractorName}</b></td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.location}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.stageName}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.inspectorName || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align:center; font-weight:bold; color: ${color};">${m ? m.final + '%' : '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align:center;">B1:${m.n_B1_fail} | B2:${m.n_B2_fail} | B3:${m.n_B3_fail}</td>
        </tr>`;
    }).join('');

    const content = `
        <div class="no-break">
            <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 5px 0; text-transform: uppercase;">Сырые данные (База проверок)</h2>
            <div style="margin-bottom: 15px; font-size: 12px; color: #64748b;">Выгружено проверок: <b>${data.length} шт.</b></div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #1e293b;">
            <thead>
                <tr style="background-color: #e2e8f0; font-weight: bold; text-transform: uppercase;">
                    <th style="border: 1px solid #94a3b8; padding: 8px;">#</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Дата</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Подрядчик</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Локация</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Этап</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left;">Инспектор</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px;">УрК</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px;">Дефекты</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
    printPdfShell("База проверок", content, "A4", "portrait", mode);
}


// 9. Универсальная печатная оболочка (Идеальная математика пикселей и Iframe)
// 9. Универсальная печатная оболочка (Идеальная математика пикселей и Iframe)
async function printPdfShell(title, content, formatSize = 'A4', orientation = 'portrait', mode = 'script') {
    // ------------------------------------------------------------------
    // 1. Элементы загрузчика
    // ------------------------------------------------------------------
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('global-loader-text');
    
    if (loader && loaderText) {
        loaderText.innerText = mode === 'script' ? "Формируем PDF. Пожалуйста, подождите..." : "Подготовка к печати...";
        loader.style.display = 'flex';
        setTimeout(() => loader.classList.remove('opacity-0'), 10);
    }

    // ------------------------------------------------------------------
    // 2. Данные проекта и настройки качества
    // ------------------------------------------------------------------
    const projName = document.getElementById('inp-project')?.value || 'Не указан';
    const inspName = document.getElementById('inp-inspector')?.value || 'Не указан';

    const MARGIN_MM = 10;
    const MM_TO_PX = 3.7795;

    const pageWidths = {
        'A4_portrait':  Math.floor(210 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A4_landscape': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_portrait':  Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_landscape': Math.floor(420 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
    };
    const widthPx = Math.floor(pageWidths[`${formatSize}_${orientation}`] || pageWidths['A4_portrait']);

    // ⭐ ВЫСОКОЕ КАЧЕСТВО: scale 2.5 (можно поставить 2 или 3)
    const HIGH_QUALITY_SCALE = 2.5;

    const header = `
        <div class="no-break" style="border-bottom:3px solid #1e293b; padding-bottom:15px; margin-bottom:25px;">
            <table style="width: 100%; border: none; border-spacing: 0;">
                <tr>
                    <td style="vertical-align: bottom;">
                        <h1 style="font-size:24px; font-weight:900; text-transform:uppercase; margin:0; color:#0f172a;">${escapeHtml(title)}</h1>
                        <div style="font-size:14px; margin-top:4px; font-weight:bold; color:#475569;">
                            Объект: ${escapeHtml(projName)} | Инспектор: ${escapeHtml(inspName)}
                        </div>
                    </td>
                    <td style="vertical-align: bottom; text-align: right;">
                        <div style="font-size:12px; color:#64748b; font-weight:bold;">
                            Сформировано:<br>${new Date().toLocaleString('ru-RU')}<br>RBI Quality
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    `;

    // ------------------------------------------------------------------
    // 3. Режим системной печати (browser) – для случаев, когда скрипт не нужен
    // ------------------------------------------------------------------
    if (mode === 'browser') {
        const printContainer = document.getElementById('native-print-container');
        if (printContainer) {
            const browserWidths = {
                'A4_portrait':  '190mm', 'A4_landscape': '277mm',
                'A3_portrait':  '277mm', 'A3_landscape': '400mm',
            };
            const bodyWidth = browserWidths[`${formatSize}_${orientation}`] || '190mm';

            printContainer.innerHTML = `
                <style>
                    @page { size: ${formatSize} ${orientation}; margin: ${MARGIN_MM}mm; }
                    #print-body { width: ${bodyWidth}; margin: 0 auto; font-family: Arial, sans-serif; color: black; background: white; box-sizing: border-box; }
                    #print-body * { box-sizing: border-box !important; }
                    #print-body img { max-width: 100%; display: block; }
                    #print-body table { width: 100%; table-layout: fixed; border-collapse: collapse; }
                    .pdf-page-break { page-break-before: always; break-before: page; display: block; height: 0; width: 100%; }
                    .no-break, tr, td, img { page-break-inside: avoid; break-inside: avoid; }
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
                <div id="print-body">
                    ${header}
                    ${content}
                </div>
            `;
            
            const images = printContainer.querySelectorAll('img');
            const imgPromises = Array.from(images).map(img => {
                if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
                return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 3000); });
            });

            await Promise.all(imgPromises);
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    printContainer.innerHTML = '';
                    if (loader) { loader.classList.add('opacity-0'); setTimeout(() => loader.style.display = 'none', 300); }
                }, 1000);
            }, 500);
        }
        return;
    }

    // ------------------------------------------------------------------
    // 4. Режим скрипта (html2pdf) – СКРЫТЫЙ DIV, БЕЗ IFRAME
    // ------------------------------------------------------------------
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Создаём скрытый div
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.cssText = `
        position: fixed;
        left: -10000px;
        top: -10000px;
        width: ${widthPx + 100}px;
        background: white;
        z-index: -1;
        display: block;
        visibility: visible;
        opacity: 1;
    `;
    document.body.appendChild(hiddenDiv);

    // Стили изоляции (без all: initial)
    const styleElem = document.createElement('style');
    styleElem.textContent = `
        #pdf-print-root {
            width: ${widthPx}px !important;
            margin: 0 auto !important;
            padding: 20px !important;
            background: white !important;
            font-family: Arial, sans-serif !important;
            color: black !important;
            box-sizing: border-box !important;
        }
        #pdf-print-root * {
            box-sizing: border-box !important;
        }
        #pdf-print-root img {
            max-width: 100% !important;
            display: block !important;
        }
        #pdf-print-root table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
        }
        #pdf-print-root .pdf-page-break {
            page-break-before: always !important;
            break-before: page !important;
            display: block !important;
            height: 1px;
            clear: both;
        }
        #pdf-print-root .no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        #pdf-print-root tr, #pdf-print-root td, #pdf-print-root img {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
    `;
    hiddenDiv.appendChild(styleElem);

    const rootDiv = document.createElement('div');
    rootDiv.id = 'pdf-print-root';
    rootDiv.innerHTML = header + content;
    hiddenDiv.appendChild(rootDiv);

    const cleanup = () => {
        if (loader) {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.style.display = 'none', 300);
        }
        if (document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv);
    };

    // Дожидаемся изображений
    const images = hiddenDiv.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 5000);
        });
    });

    const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();
    
    if (loaderText) loaderText.innerText = "Загрузка изображений...";
    await Promise.all([fontPromise, ...imagePromises]);
    
    if (loaderText) loaderText.innerText = "Создание PDF (высокое качество)...";
    
    // Небольшая задержка для полного рендеринга (на iOS чуть дольше)
    await new Promise(resolve => setTimeout(resolve, isIOS ? 500 : 200));

    // ------------------------------------------------------------------
    // 5. Настройки html2pdf с ВЫСОКИМ scale
    // ------------------------------------------------------------------
    const opt = {
        margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
        filename: `${title.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toLocaleDateString('ru-RU')}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },   // максимальное качество
        html2canvas: {
            scale: HIGH_QUALITY_SCALE,   // 2.5 (или 2, или 3)
            useCORS: !isIOS,             // на iOS отключаем CORS для скорости
            letterRendering: true,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            width: widthPx,
            windowWidth: widthPx,
            logging: false,
            allowTaint: isIOS ? true : false,
            backgroundColor: '#ffffff'
        },
        jsPDF: {
            unit: 'mm',
            format: formatSize.toLowerCase(),
            orientation: orientation,
            compress: true
        },
        pagebreak: {
            mode: ['css', 'legacy'],
            before: '.pdf-page-break',
            avoid: ['.no-break', 'tr', 'td', 'img', '.avoid-break']
        }
    };

    try {
        await html2pdf().set(opt).from(rootDiv).save();
        cleanup();
        if (typeof showToast === 'function') showToast("✅ PDF высокого качества сохранён!");
    } catch (err) {
        console.error('[PDF Error]', err);
        cleanup();
        if (typeof showToast === 'function') showToast("❌ Ошибка при генерации PDF. Попробуйте режим печати.");
    }
}

// ------------------------------------------------------------------
// Экранирование HTML (безопасность)
// ------------------------------------------------------------------
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
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

            <div class="no-break" style="background: ${m.finalC < 70 || m.rateB3 >= 20 ? '#fef2f2' : (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60 ? '#fffbeb' : '#f0fdf4')}; border: 2px solid ${m.finalC < 70 || m.rateB3 >= 20 ? '#fca5a5' : (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60 ? '#fde68a' : '#bbf7d0')}; border-radius: 8px; padding: 20px;">
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
// === ИМПОРТ И ЭКСПОРТ ДАННЫХ (ЕДИНЫЙ СУПЕР-БЭКАП, SHARE API, РЕЕСТР) ===
// ============================================================================

// Вспомогательная: подсчет фото в массиве проверок
function countPhotos(arr) {
    let count = 0;
    arr.forEach(c => { if(c.photos) count += Object.keys(c.photos).length; });
    return count;
}

// Генерирует объект бэкапа и возвращает объект + статистику
function generateBackupObject(mode) {
    const userDocsToExport = customDocs.filter(d => !String(d.id).startsWith('sys_'));
    let historyToExport = contractorArray;

    if (mode === 'filtered') {
        historyToExport = getFilteredAnalyticsData();
    } else if (mode === 'incremental') {
        const lastFullDate = localStorage.getItem('last_full_backup_date');
        if (lastFullDate) historyToExport = contractorArray.filter(c => new Date(c.date) > new Date(lastFullDate));
    } else if (mode === 'manager') {
        const lastMgrDate = localStorage.getItem('last_share_to_manager_date');
        if (lastMgrDate) historyToExport = contractorArray.filter(c => new Date(c.date) > new Date(lastMgrDate));
    }

    // Сортируем по дате
    historyToExport.sort((a, b) => new Date(a.date) - new Date(b.date));

    const stats = {
        checks: historyToExport.length,
        photos: countPhotos(historyToExport),
        twi: customTwiCards.length,
        tmpl: Object.keys(userTemplates).length
    };

    const obj = {
        type: "RBI_FULL_BACKUP",
        version: "16.5",
        timestamp: new Date().toISOString(),
        mode: mode,
        data: {
            history: historyToExport, 
            templates: userTemplates, 
            twi: customTwiCards,      
            docs: userDocsToExport,   
            expert: customExpertConclusions, 
            gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [] 
        }
    };

    return { obj, stats };
}

// Запись в реестр IndexedDB
async function logToBackupRegistry(typeStr, stats, fileName) {
    try {
        let logsObj = await dbGet(STORES.SETTINGS, 'backup_logs');
        let logs = logsObj && logsObj.data ? logsObj.data : [];
        
        logs.unshift({
            timestamp: new Date().toISOString(),
            dateStr: new Date().toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}),
            type: typeStr,
            stats: stats,
            fileName: fileName
        });

        if (logs.length > 50) logs = logs.slice(0, 50); // Ограничение 50 записей
        await dbPut(STORES.SETTINGS, { key: 'backup_logs', data: logs });
    } catch(e) { console.error("Ошибка записи в реестр бэкапов", e); }
}

// Очистка реестра
async function clearBackupRegistry() {
    if(!confirm("Очистить историю выгрузок? Сами данные проверок не удалятся.")) return;
    await dbPut(STORES.SETTINGS, { key: 'backup_logs', data: [] });
    if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
    showToast("Реестр очищен");
}

// Универсальная функция загрузки файла
async function handleDataExport(type, mode = 'full', silent = false) {
    if (type !== 'json') return;
    if (!silent) showToast("Сборка базы данных...");
    
    const { obj, stats } = generateBackupObject(mode);
    if ((mode === 'incremental' || mode === 'manager') && stats.checks === 0) {
        if (!silent) showToast('Нет новых проверок для выгрузки.');
        return false;
    }

    const dataStr = JSON.stringify(obj, null, 2); 
    const insp = document.getElementById('inp-inspector')?.value.trim() || 'Инженер';
    const safeInsp = insp.replace(/[^a-zA-Zа-яА-Я0-9_]/g, '_');
    
    let prefix = 'Full';
    let logName = 'Полный бэкап';
    if (mode === 'incremental') { prefix = 'Inc'; logName = 'Инкрементальный'; }
    if (mode === 'filtered') { prefix = 'Filtered'; logName = 'По фильтрам'; }
    if (mode === 'manager') { prefix = 'Manager'; logName = 'Отправка руководителю'; }
    
    const d1 = obj.data.history.length > 0 ? new Date(obj.data.history[0].date).toLocaleDateString('ru-RU') : '';
    const d2 = obj.data.history.length > 0 ? new Date(obj.data.history[obj.data.history.length-1].date).toLocaleDateString('ru-RU') : '';
    const dateSuffix = d1 && d2 && d1 !== d2 ? `${d1}_${d2}` : new Date().toLocaleDateString('ru-RU');

    const fName = `RBI_${prefix}_${safeInsp}_${dateSuffix}.json`;
    
    downloadFile(dataStr, fName, 'application/json');
    
    await logToBackupRegistry(logName, stats, fName);

    if (mode === 'full' || mode === 'incremental') localStorage.setItem('last_full_backup_date', new Date().toISOString());
    if (mode === 'manager') localStorage.setItem('last_share_to_manager_date', new Date().toISOString());

    if (!silent) {
        showToast(`Успешно скачан: ${logName}`);
        if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
    }
    return true;
}

// Отправка через Web Share API с Fallback
async function shareBackupViaApi(mode = 'full', silent = false) {
    if (!silent) showToast("Подготовка файла для отправки...");
    
    const { obj, stats } = generateBackupObject(mode);
    if ((mode === 'incremental' || mode === 'manager') && stats.checks === 0) {
        if (!silent) showToast('Нет новых проверок для отправки.');
        return false;
    }

    const dataStr = JSON.stringify(obj, null, 2);
    const insp = document.getElementById('inp-inspector')?.value.trim() || 'Инженер';
    const safeInsp = insp.replace(/[^a-zA-Zа-яА-Я0-9_]/g, '_');
    
    let prefix = 'Full'; let logName = 'Полный бэкап (Share)';
    if (mode === 'incremental') { prefix = 'Inc'; logName = 'Инкрементальный (Share)'; }
    if (mode === 'filtered') { prefix = 'Filtered'; logName = 'По фильтрам (Share)'; }
    if (mode === 'manager') { prefix = 'Manager'; logName = 'Отправка руководителю (Share)'; }

    const d1 = obj.data.history.length > 0 ? new Date(obj.data.history[0].date).toLocaleDateString('ru-RU') : '';
    const d2 = obj.data.history.length > 0 ? new Date(obj.data.history[obj.data.history.length-1].date).toLocaleDateString('ru-RU') : '';
    const dateSuffix = d1 && d2 && d1 !== d2 ? `${d1}_${d2}` : new Date().toLocaleDateString('ru-RU');

    const fName = `RBI_${prefix}_${safeInsp}_${dateSuffix}.json`;
    const file = new File([dataStr], fName, { type: 'application/json' });
    
    const projs = [...new Set(obj.data.history.map(c => c.projectName).filter(Boolean))].join(', ');
    
    let textMsg = `Синхронизация базы RBI Quality.\nИнспектор: ${insp}\nПериод: с ${d1 || '-'} по ${d2 || '-'}\nОбъекты: ${projs || 'Не указаны'}\nВыгружено проверок: ${stats.checks} шт.\nФайл прикреплен.`;
    
    const shareData = { title: 'Бэкап базы RBI Quality', text: textMsg, files: [file] };

    try {
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            await logToBackupRegistry(logName, stats, fName);
            if (mode === 'full' || mode === 'incremental') localStorage.setItem('last_full_backup_date', new Date().toISOString());
            if (mode === 'manager') localStorage.setItem('last_share_to_manager_date', new Date().toISOString());
            
            if (!silent) {
                showToast("Файл успешно передан в меню отправки!");
                if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
            }
            return true;
        } else {
            throw new Error("Share API not supported");
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            // FALLBACK
            downloadFile(dataStr, fName, 'application/json');
            await logToBackupRegistry(logName + ' (Fallback)', stats, fName);
            if (mode === 'full' || mode === 'incremental') localStorage.setItem('last_full_backup_date', new Date().toISOString());
            if (mode === 'manager') localStorage.setItem('last_share_to_manager_date', new Date().toISOString());
            
            if (!silent) {
                showToast("Файл сохранён. Вы можете отправить его вручную через почту или мессенджер.");
                if (typeof renderCurrentAnalyticsTab === 'function') renderCurrentAnalyticsTab();
            }
            return true;
        }
        return false;
    }
}

// Модалка выбора типа отправки
function openShareModal() {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-200 mx-auto"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg></div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center">Отправить бэкап</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="space-y-2">
            <button onclick="closeModal(); shareBackupViaApi('incremental')" class="w-full text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                <div class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>
                <div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Только Новое</div>
                    <div class="text-[9px] text-slate-500 font-bold mt-0.5">Всё, что было после последней выгрузки</div>
                </div>
            </button>
            <button onclick="closeModal(); shareBackupViaApi('full')" class="w-full text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                <div class="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg></div>
                <div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Полная база (Всё)</div>
                    <div class="text-[9px] text-slate-500 font-bold mt-0.5">Весь архив за всё время работы</div>
                </div>
            </button>
            <button onclick="closeModal(); shareBackupViaApi('filtered')" class="w-full text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 active:scale-95 transition-transform">
                <div class="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg></div>
                <div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wide">По фильтрам экрана</div>
                    <div class="text-[9px] text-slate-500 font-bold mt-0.5">Только то, что сейчас отфильтровано</div>
                </div>
            </button>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
}

// Логика автоматических расписаний
async function checkScheduledBackups() {
    const today = new Date();
    const dayOfWeek = today.getDay().toString(); // 0 = Sunday, 1 = Monday, etc.
    const todayStr = today.toDateString();

    // 1. Автоматический полный бэкап
    if (appSettings.autoBackupEnabled && appSettings.autoBackupDay === dayOfWeek) {
        const lastRun = localStorage.getItem('last_auto_backup_run_date');
        if (lastRun !== todayStr) {
            console.log('Запуск автоматического полного бэкапа...');
            localStorage.setItem('last_auto_backup_run_date', todayStr);
            if (appSettings.autoBackupShare) {
                await shareBackupViaApi('full', true);
            } else {
                await handleDataExport('json', 'full', true);
            }
        }
    }

    // 2. Регулярная отправка руководителю (Только новые)
    if (appSettings.autoManagerEnabled && appSettings.autoManagerDay === dayOfWeek) {
        const lastRunMgr = localStorage.getItem('last_auto_manager_run_date');
        if (lastRunMgr !== todayStr) {
            console.log('Запуск регулярной отправки руководителю...');
            localStorage.setItem('last_auto_manager_run_date', todayStr);
            await shareBackupViaApi('manager', true);
        }
    }
}

function triggerManagerShareManual() { shareBackupViaApi('manager'); }
function triggerAutoBackupManual() {
    if (appSettings.autoBackupShare) shareBackupViaApi('full');
    else handleDataExport('json', 'full');
}

// Восстановление (Импорт) - без изменений, просто вызов существующей логики
function triggerDataImport() { document.getElementById('db-import-input').click(); }
function processDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    showToast("Чтение файла и слияние баз...");
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            let addedHist = 0, addedTmpl = 0, addedTwi = 0, addedDocs = 0, addedExpert = 0;

            if (parsed.type === "RBI_FULL_BACKUP" && parsed.data) {
                if (parsed.data.history) {
                    for(const item of parsed.data.history) {
                        if(!contractorArray.find(x => x.id === item.id)) {
                            contractorArray.push(item);
                            await dbPut(STORES.HISTORY, item);
                            addedHist++;
                        }
                    }
                    contractorArray.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
                if (parsed.data.templates) {
                    for(const key in parsed.data.templates) {
                        if(!userTemplates[key]) { 
                            userTemplates[key] = parsed.data.templates[key];
                            await dbPut(STORES.TEMPLATES, { slug: key, data: parsed.data.templates[key] });
                            addedTmpl++;
                        }
                    }
                }
                if (parsed.data.twi) {
                    for(const item of parsed.data.twi) {
                        if(!customTwiCards.find(x => x.id === item.id)) {
                            customTwiCards.push(item);
                            addedTwi++;
                        }
                    }
                    await dbPut(STORES.SETTINGS, { key: 'custom_twi_cards', data: customTwiCards.filter(c => !String(c.id).startsWith('sys_')) });
                }
                if (parsed.data.docs) {
                    for(const item of parsed.data.docs) {
                        if(!customDocs.find(x => x.id === item.id)) {
                            customDocs.push(item);
                            addedDocs++;
                        }
                    }
                    await dbPut(STORES.SETTINGS, { key: 'custom_docs', data: customDocs.filter(d => !String(d.id).startsWith('sys_')) });
                }
                if (parsed.data.expert) {
                    for(const key in parsed.data.expert) {
                        if(!customExpertConclusions[key]) customExpertConclusions[key] = parsed.data.expert[key];
                    }
                    if (typeof saveSessionData === 'function') saveSessionData(); 
                }
                showToast(`✅ Базы слиты!\nПров: +${addedHist} | Ч/Л: +${addedTmpl}\nTWI: +${addedTwi} | НД: +${addedDocs}`);
            } else if (Array.isArray(parsed)) {
                for(const item of parsed) {
                    if(!contractorArray.find(x => x.id === item.id)) {
                        contractorArray.push(item);
                        await dbPut(STORES.HISTORY, item);
                        addedHist++;
                    }
                }
                contractorArray.sort((a, b) => new Date(b.date) - new Date(a.date));
                showToast(`✅ История объединена! Добавлено: ${addedHist} шт.`);
            } else { throw new Error("Неизвестный формат"); }
            
            updateAllDynamicFilters();
            if (typeof renderSelector === 'function') renderSelector(); 
            if (document.getElementById('tab-analytics').classList.contains('active')) renderCurrentAnalyticsTab();
        } catch (err) { 
            alert("Ошибка файла бэкапа. Проверьте формат."); 
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}