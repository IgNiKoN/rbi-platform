/* Файл: js/export.js */
// === МОДУЛЬ ГЕНЕРАЦИИ ОТЧЕТОВ (PDF, CSV, ПАСПОРТА) ===

// 1. Главный обработчик всплывающего меню выгрузки
// 1. Главный обработчик всплывающего меню выгрузки
// 1. Главный обработчик всплывающего меню выгрузки
function handleFabExportAction(actionType, mode = 'script') {
    closeFabExportMenu();
    const data = getFilteredAnalyticsData();
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    showToast(mode === 'script' ? '⏳ Формируем PDF файл...' : '🖨️ Подготовка к выгрузке...');
    
    setTimeout(async () => {
        if (actionType === 'current') {
            await exportPdfCurrentScreen(data, mode);
        } else if (actionType === 'full_report') {
            await exportPdfFullObjectReport(data, mode);
        } else if (actionType === 'poster') {
            await exportPdfPoster(data, mode);
        } else if (actionType === 'onepager') {
            await exportPdfOnePager(data, mode);
        } else if (actionType === 'global_onepager') {
            await exportPdfGlobalOnePager(data, mode);
        } else if (actionType === 'data') {
            exportPdfData(data, mode);
        } else if (actionType === 'tender') {
            if (mode === 'script') exportTenderPDF();
            else exportTenderCSV();
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

// Универсальный генератор сетки фотографий (Поддерживает PDF и Browser Print)
async function buildPhotoGridHTML(photos, title, titleColor, borderColor, bgCell, columns, mode) {
    const fontSizeTitle = mode === 'browser' ? '11pt' : '14px';
    const fontSizeName = mode === 'browser' ? '8pt' : '10px';
    const fontSizeContr = mode === 'browser' ? '7pt' : '9px';
    const imgHeight = mode === 'browser' ? '28mm' : '110px'; 
    const cellHeight = mode === 'browser' ? '40mm' : '160px'; 

    if (!photos || photos.length === 0) {
        return `
        <div class="no-break" style="margin-bottom: 15px; background: ${bgCell}; border-radius: 8px; padding: 10px;">
            <h3 style="margin: 0 0 10px 4px; color: ${titleColor}; font-size: ${fontSizeTitle}; text-transform: uppercase;">${title}</h3>
            <div style="text-align:center; padding:15px; color:#94a3b8; font-size:${fontSizeName}; font-weight:bold; border:1px dashed #cbd5e1; border-radius:8px; background: white;">Нет фотографий</div>
        </div>`;
    }

    const paddedArr = [...photos].slice(0, columns);
    while (paddedArr.length < columns) paddedArr.push({ empty: true });

    const colWidth = (100 / columns).toFixed(2) + '%';

    const tdsList = await Promise.all(paddedArr.map(async (p, idx) => {
        let paddingStyle = 'padding: 0 4px;';
        if (idx === 0) paddingStyle = 'padding: 0 4px 0 0;';
        if (idx === columns - 1) paddingStyle = 'padding: 0 0 0 4px;';

        if (p.empty) {
            return `<td style="width: ${colWidth}; ${paddingStyle}">
                        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; height: ${cellHeight};"></div>
                    </td>`;
        }

        // ДОСТАЕМ РЕАЛЬНУЮ КАРТИНКУ ИЗ БАЗЫ
        const imgSrc = await PhotoManager.getAsyncUrl(p.src || p.photo) || window.getPhotoSrc(p.src || p.photo);
        let contrHtml = '';
        if (p.contr) contrHtml = `<div style="font-size: ${fontSizeContr}; color: #64748b; font-weight: bold; margin-top: 2px; white-space: nowrap; overflow: hidden;">👤 ${p.contr} ${p.count ? `(${p.count} шт)` : ''}</div>`;

        return `
        <td style="width: ${colWidth}; ${paddingStyle}">
            <div style="border: 1px solid ${borderColor}; border-radius: 8px; background: white; overflow: hidden; height: ${cellHeight}; box-sizing: border-box; display: block;">
                <div style="width: 100%; height: ${imgHeight}; background: #f1f5f9; text-align: center; border-bottom: 2px solid ${titleColor}; overflow: hidden;">
                    <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                </div>
                <div style="padding: 6px; font-size: ${fontSizeName}; font-weight: bold; color: #0f172a; line-height: 1.2; height: calc(${cellHeight} - ${imgHeight}); overflow: hidden; box-sizing: border-box;">
                    <div style="overflow: hidden; max-height: calc(1.2em * 2);">${p.name || 'Дефект'}</div>
                    ${contrHtml}
                </div>
            </div>
        </td>`;
    }));
    
    const tds = tdsList.join('');

    return `
    <div class="no-break" style="margin-bottom: 15px; background: ${bgCell}; border-radius: 8px; padding: 10px;">
        <h3 style="margin: 0 0 10px 4px; color: ${titleColor}; font-size: ${fontSizeTitle}; text-transform: uppercase;">${title}</h3>
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border-spacing: 0;">
            <tr>${tds}</tr>
        </table>
    </div>`;
}

// 6. Сводный отчет для руководителя (One-Pager - Формат А3 Альбомный)
async function exportPdfOnePager(data, mode = 'script') {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    const projName = document.getElementById('inp-project')?.value || 'Не указан';
    
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
        if (prev === undefined || prev === null || prev === "" || isNaN(prev)) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '7pt' : '10px'}; font-weight:bold; background:#f1f5f9; padding:2px 4px; border-radius:4px;">Нет базы</span></div>`;
        let diff = (parseFloat(curr) - parseFloat(prev));
        if (Math.abs(diff) < 0.01) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '10pt' : '14px'}; font-weight:900;">▬ 0</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626';
        const sign = diff > 0 ? '▲' : '▼';
        return `<div style="text-align:right;"><span style="color:${color}; font-size:${mode === 'browser' ? '12pt' : '16px'}; font-weight:900;">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff)?0:2)}</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
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
                        const isB1 = foundItem && foundItem.w === 1;
                        if (isB1) return; // B1 не попадает в топ дефектов
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

    const cSpark = document.getElementById('op-sparkline-chart');
    let imgSpark = '';
    if (cSpark && cSpark.width > 0 && cSpark.height > 0) {
        try { imgSpark = `<img style="width:100%; height:100%; object-fit:cover; opacity: 0.4; display:block;" src="${cSpark.toDataURL('image/png')}">`;
        } catch(e) {}
    }

    const cLine = document.getElementById('op-line-chart');
    const imgLine = cLine ? `<img style="width:100%; height:100%; object-fit:contain;" src="${cLine.toDataURL('image/png')}">` : '';

    const pdcaTextRaw = document.getElementById('hidden_pdca_text')?.value || "Нет данных для формирования решения.";
    const pdfFormattedText = pdcaTextRaw.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 4px;">$1</div>').replace(/\n/g, '<br>');
    
    const isGlobalDanger = parseFloat(mData.IKO) >= 0.60 || sumB3 > 0;

    let ratingHtml = '';
    if (ratingData.length === 0) {
        ratingHtml = `<div style="font-size:${mode === 'browser' ? '8pt' : '10px'}; color:#94a3b8; text-align:center; padding: 20px;">Нет данных</div>`;
    } else {
        const renderRow = (r) => `
            <table style="width:100%; margin-bottom:6px; border-collapse:collapse; table-layout: fixed;">
                <tr>
                    <td style="width:40%; font-size:${mode === 'browser' ? '8pt' : '11px'}; font-weight:bold; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:10px;">${r.name}</td>
                    <td style="width:45%; vertical-align: middle;">
                        <div style="background:#e2e8f0; height:10px; border-radius:5px; border:1px solid #cbd5e1; width:100%; overflow:hidden;">
                            <div style="width:${r.val}%; background:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')}; height:100%;"></div>
                        </div>
                    </td>
                    <td style="width:15%; text-align:right; font-size:${mode === 'browser' ? '8pt' : '11px'}; font-weight:900; color:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')};">
                        ${r.val}%
                    </td>
                </tr>
            </table>`;
            
        if (ratingData.length <= 10) ratingHtml = ratingData.map(renderRow).join('');
        else ratingHtml = ratingData.slice(0, 5).map(renderRow).join('') + `<div style="text-align:center; font-size:9px; color:#94a3b8; font-weight:bold; padding:2px 0; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:2px 0;">... Скрыто ${ratingData.length - 10} ...</div>` + ratingData.slice(-5).map(renderRow).join('');
    }

    const fontSizeSmall = mode === 'browser' ? '7pt' : '9px';
        const fontSizeNum = mode === 'browser' ? '18pt' : '26px';

        const content = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
                <!-- ЛЕВАЯ КОЛОНКА (32%) -->
                <td style="width: 32%; vertical-align: top; padding-right: 15px;">
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
                        <tr>
                            <td style="padding: 0 4px 8px 0; width:50%;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fontSizeSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fontSizeNum}; font-weight: 900; color: #0f172a; line-height: 1;">${currAvgUrk}%</td><td>${renderTrend(currAvgUrk, prevAvgUrk, trendLabel)}</td></tr></table>
                                </div>
                            </td>
                            <td style="padding: 0 0 8px 4px; width:50%;">
                                <div style="background: ${parseFloat(mData.IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 10px; border-radius: 8px; border: 1px solid ${parseFloat(mData.IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fontSizeSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fontSizeNum}; font-weight: 900; color: ${pdfIkoColor}; line-height: 1;">${mData.IKO}</td><td>${renderTrend(mData.IKO, prevIko, trendLabel, true)}</td></tr></table>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 4px 8px 0;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fontSizeSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fontSizeNum}; font-weight: 900; color: #0f172a; line-height: 1;">${data.length}</td><td>${renderTrend(data.length, prevChecks, trendLabel)}</td></tr></table>
                                </div>
                            </td>
                            <td style="padding: 0 0 8px 4px;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fontSizeSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Подрядчиков</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fontSizeNum}; font-weight: 900; color: #0f172a; line-height: 1;">${currContractorsCount}</td><td>${renderTrend(currContractorsCount, prevContrsCount, trendLabel)}</td></tr></table>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 4px 0 0;">
                                <div style="background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fecaca; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fontSizeSmall}; color: #991b1b; text-transform: uppercase; font-weight: 900;">В красной зоне</div>
                                    <div style="font-size: ${fontSizeNum}; font-weight: 900; color: #dc2626; margin-top: 5px; line-height: 1;">${mData.redZonePerc}%</div>
                                </div>
                            </td>
                            <td style="padding: 0 0 0 4px;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box; position: relative; overflow: hidden;">
                                    <div style="font-size: ${fontSizeSmall}; color: #64748b; text-transform: uppercase; font-weight: 900; position:relative; z-index:2;">Тренд (6 нед)</div>
                                    <div style="position:absolute; bottom:0; left:0; width:100%; height: 50%;">${imgSpark}</div>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 10px; height: auto; min-height:${mode === 'browser' ? '50mm' : '200px'}; box-sizing: border-box;">
                        <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 5px; text-align: center;">📈 Динамика Подрядчиков</div>
                        <div style="height:${mode === 'browser' ? '40mm' : '160px'}; text-align:center; overflow: hidden;">${imgLine ? imgLine : '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}</div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; height: auto; min-height:${mode === 'browser' ? '60mm' : '250px'}; box-sizing: border-box;">
                        <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; text-align: center;">🏆 Интегральный УрК</div>
                        <div style="width: 100%;">${ratingHtml}</div>
                    </div>
                </td>

                <!-- ПРАВАЯ КОЛОНКА (68%) -->
                <td style="width: 68%; vertical-align: top;">
                    ${await buildPhotoGridHTML(topB3, '🚨 ТОП-5 Критических дефектов (B3)', '#dc2626', '#fca5a5', '#fef2f2', 5, mode)}
                    ${await buildPhotoGridHTML(topB2, '🔄 ТОП-5 Повторяющихся нарушений (B2)', '#d97706', '#fdba74', '#fff7ed', 5, mode)}
                    ${await buildPhotoGridHTML(topOK, '✅ ТОП-5 Эталонных работ (OK)', '#16a34a', '#bbf7d0', '#f0fdf4', 5, mode)}

                    <div class="no-break" style="background: ${isGlobalDanger ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${isGlobalDanger ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 8px 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; color: ${isGlobalDanger ? '#b45309' : '#166534'}; text-transform: uppercase; border-bottom: 2px solid ${isGlobalDanger ? '#fde047' : '#86efac'}; padding-bottom: 6px;">🎯 Управленческое Решение и Риски</h3>
                        <div style="font-size: ${mode === 'browser' ? '10pt' : '13px'}; line-height: 1.5; color: #1e293b; columns: 2; column-gap: 20px;">${pdfFormattedText}</div>
                    </div>
                </td>
            </tr>
        </table>
    `;

    printPdfShell("Сводка для Руководства", content, "A3", "landscape", mode);
}

// 6.5. ГЛОБАЛЬНЫЙ СВОДНЫЙ ОТЧЕТ КОМПАНИИ (Титул + Объекты a-la OnePager)
async function exportPdfGlobalOnePager(data, mode = 'script') {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    // ==========================================
    // 1. РАСЧЕТ ГЛОБАЛЬНЫХ МЕТРИК И ТРЕНДОВ
    // ==========================================
    let globalSumUrk = 0;
    data.forEach(i => { if(i.metrics) globalSumUrk += i.metrics.final; });
    const globalAvgUrk = data.length > 0 ? Math.round(globalSumUrk / data.length) : 0;
    
    const globalIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, userTemplates) : null;
    const globalIKO = globalIntMetrics ? globalIntMetrics.IKO : "0.00";
    
    let pdfIkoColorGlobal = "#64748b";
    if (globalIKO >= 0.6) pdfIkoColorGlobal = "#dc2626";
    else if (globalIKO >= 0.3) pdfIkoColorGlobal = "#d97706";
    else pdfIkoColorGlobal = "#16a34a";

    const uniqueContractorsGlobal = new Set(data.map(i => i.contractorName).filter(Boolean)).size;

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

    let prevGlobalAvgUrk = 0; let prevGlobalIko = "0.00"; let prevGlobalChecks = prevData.length; let prevGlobalContrs = 0;
    if (prevData.length > 0) {
        let pSum = 0; prevData.forEach(i => pSum += (i.metrics?.final || 0));
        prevGlobalAvgUrk = Math.round(pSum / prevData.length);
        prevGlobalContrs = new Set(prevData.map(i => i.contractorName).filter(Boolean)).size;
        const pInt = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevData, userTemplates) : null;
        if(pInt) prevGlobalIko = pInt.IKO;
    }

    const renderTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === "" || isNaN(prev)) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '7pt' : '10px'}; font-weight:bold; background:#f1f5f9; padding:2px 4px; border-radius:4px;">Нет базы</span></div>`;
        let diff = (parseFloat(curr) - parseFloat(prev));
        if (Math.abs(diff) < 0.01) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '10pt' : '14px'}; font-weight:900;">▬ 0</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626';
        const sign = diff > 0 ? '▲' : '▼';
        return `<div style="text-align:right;"><span style="color:${color}; font-size:${mode === 'browser' ? '12pt' : '16px'}; font-weight:900;">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff)?0:2)}</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
    };

    const formatTrendInline = (curr, prev, inverse = false) => {
        if (!prev || isNaN(prev)) return '';
        let diff = parseFloat(curr) - parseFloat(prev);
        if (Math.abs(diff) < 0.01) return `<span style="color:#94a3b8; font-size:${mode==='browser'?'7pt':'9px'}; margin-left:4px;">▬ 0</span>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626';
        const sign = diff > 0 ? '▲' : '▼';
        return `<span style="color:${color}; font-size:${mode==='browser'?'7pt':'9px'}; margin-left:4px;">${sign}${Math.abs(diff).toFixed(Number.isInteger(diff)?0:2)}</span>`;
    };

    // ==========================================
    // 2. ГРУППИРОВКА ПО ОБЪЕКТАМ
    // ==========================================
    const projectsMap = {};
    data.forEach(item => { const pName = item.projectName || 'Без объекта'; if (!projectsMap[pName]) projectsMap[pName] = []; projectsMap[pName].push(item); });

    const prevProjectsMap = {};
    prevData.forEach(item => { const pName = item.projectName || 'Без объекта'; if (!prevProjectsMap[pName]) prevProjectsMap[pName] = []; prevProjectsMap[pName].push(item); });

    const projectsArray = Object.keys(projectsMap).map(pName => {
        const pData = projectsMap[pName];
        let pSumUrk = 0; let redZone = 0;
        pData.forEach(i => { if(i.metrics) pSumUrk += i.metrics.final; });
        const pAvgUrk = pData.length > 0 ? Math.round(pSumUrk / pData.length) : 0;
        const pMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(pData, userTemplates) : null;
        const IKO = pMetrics ? pMetrics.IKO : "0.00";
        if (pMetrics) redZone = pMetrics.redZonePerc;

        const prevPData = prevProjectsMap[pName] || [];
        let pPrevAvgUrk = 0; let pPrevIKO = "0.00";
        if (prevPData.length > 0) {
            let ppSum = 0; prevPData.forEach(i => ppSum += (i.metrics?.final || 0));
            pPrevAvgUrk = Math.round(ppSum / prevPData.length);
            const ppMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevPData, userTemplates) : null;
            if(ppMetrics) pPrevIKO = ppMetrics.IKO;
        }
        
        let urkGrowth = pPrevAvgUrk ? (pAvgUrk - pPrevAvgUrk) : 0;
        let ikoDrop = pPrevIKO ? (parseFloat(pPrevIKO) - parseFloat(IKO)) : 0;

        return { name: pName, data: pData, avgUrk: pAvgUrk, prevAvgUrk: pPrevAvgUrk, IKO: IKO, prevIKO: pPrevIKO, urkGrowth, ikoDrop, redZone };
    });

    // ==========================================
    // 3. ПОДРЯДЧИКИ В ЗОНЕ РИСКА ПО ВСЕЙ КОМПАНИИ
    // ==========================================
    const allContrMap = {};
    data.forEach(c => {
        const cKey = `${c.contractorName} [${c.projectName || 'Без объекта'}]`;
        if(!allContrMap[cKey]) allContrMap[cKey] = [];
        allContrMap[cKey].push(c);
    });
    
    let riskContractors = [];
    for (let cKey in allContrMap) {
        if (allContrMap[cKey].length >= 3) {
            const m = getContractorMetrics(allContrMap[cKey], userTemplates);
            if (m && (m.finalC < 70 || m.n_изделий_с_B3 > 0)) {
                riskContractors.push({ name: cKey, final: m.finalC, b3: m.n_изделий_с_B3 });
            }
        }
    }
    riskContractors.sort((a, b) => a.final - b.final); // Худшие сверху

    // ==========================================
    // 4. ТИТУЛЬНЫЙ ЛИСТ
    // ==========================================
    const projectsByUrk = [...projectsArray].sort((a,b) => b.avgUrk - a.avgUrk);
    
    const topGrowth = [...projectsArray].filter(p => p.urkGrowth > 0).sort((a,b) => b.urkGrowth - a.urkGrowth).slice(0, 3);
    const topDrop = [...projectsArray].filter(p => p.urkGrowth < 0).sort((a,b) => a.urkGrowth - b.urkGrowth).slice(0, 3);

    const renderObjectTableRow = (p) => {
        const urkColor = p.avgUrk < 70 ? '#ef4444' : (p.avgUrk < 85 ? '#f59e0b' : '#22c55e');
        const ikoColor = parseFloat(p.IKO) >= 0.6 ? '#dc2626' : (parseFloat(p.IKO) >= 0.3 ? '#f59e0b' : '#16a34a');
        
        let urkTrend = "";
        if (p.prevAvgUrk) {
            const diff = p.avgUrk - p.prevAvgUrk;
            if (diff > 0) urkTrend = `<span style="color:#16a34a; font-size:${mode === 'browser'?'7pt':'9px'}; margin-left:4px;">▲${Math.abs(diff)}</span>`;
            else if (diff < 0) urkTrend = `<span style="color:#dc2626; font-size:${mode === 'browser'?'7pt':'9px'}; margin-left:4px;">▼${Math.abs(diff)}</span>`;
            else urkTrend = `<span style="color:#94a3b8; font-size:${mode === 'browser'?'7pt':'9px'}; margin-left:4px;">▬0</span>`;
        }

        let ikoTrend = "";
        if (p.prevIKO && p.prevIKO !== "0.00") {
            const diff = parseFloat(p.IKO) - parseFloat(p.prevIKO);
            if (diff < 0) ikoTrend = `<span style="color:#16a34a; font-size:${mode === 'browser'?'7pt':'9px'}; margin-left:4px;">▼${Math.abs(diff).toFixed(2)}</span>`;
            else if (diff > 0) ikoTrend = `<span style="color:#dc2626; font-size:${mode === 'browser'?'7pt':'9px'}; margin-left:4px;">▲${Math.abs(diff).toFixed(2)}</span>`;
            else ikoTrend = `<span style="color:#94a3b8; font-size:${mode === 'browser'?'7pt':'9px'}; margin-left:4px;">▬0</span>`;
        }

        return `
            <tr>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 10px 6px; font-size:${mode === 'browser' ? '10pt' : '13px'}; font-weight:bold; color:#0f172a;">${p.name}</td>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 10px 6px; text-align:center; font-size:${mode === 'browser' ? '12pt' : '16px'}; font-weight:900; color:${urkColor}; background: #f8fafc;">${p.avgUrk}% ${urkTrend}</td>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 10px 6px; text-align:center; font-size:${mode === 'browser' ? '12pt' : '16px'}; font-weight:900; color:${ikoColor};">${p.IKO} ${ikoTrend}</td>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 10px 6px; text-align:center; font-size:${mode === 'browser' ? '11pt' : '14px'}; font-weight:900; color:${p.redZone > 0 ? '#dc2626' : '#64748b'}; background: #f8fafc;">${p.redZone}%</td>
            </tr>`;
    };

    const allObjectsTableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr style="background: #e2e8f0; color: #475569; font-size: ${mode === 'browser' ? '8pt' : '11px'}; text-transform: uppercase;">
                    <th style="padding: 10px 6px; text-align: left; border-radius: 8px 0 0 0;">Наименование Объекта</th>
                    <th style="padding: 10px 6px; text-align: center; width: 22%;">Ср. УрК (+ Тренд)</th>
                    <th style="padding: 10px 6px; text-align: center; width: 22%;">ИКО (+ Тренд)</th>
                    <th style="padding: 10px 6px; text-align: center; width: 20%; border-radius: 0 8px 0 0;">В красной зоне</th>
                </tr>
            </thead>
            <tbody>
                ${projectsByUrk.length > 0 ? projectsByUrk.map(renderObjectTableRow).join('') : `<tr><td colspan="4" style="text-align:center; padding:15px; color:#64748b;">Нет данных</td></tr>`}
            </tbody>
        </table>
    `;

    const renderDynamicsCard = (p, isGrowth) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px solid ${isGrowth ? '#bbf7d0' : '#fecaca'};">
            <div style="font-size:${mode === 'browser' ? '9pt' : '12px'}; font-weight:bold; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width: 70%;">${p.name}</div>
            <div style="font-size:${mode === 'browser' ? '12pt' : '16px'}; font-weight:900; color:${isGrowth ? '#16a34a' : '#dc2626'};">${isGrowth ? '+' : ''}${p.urkGrowth}%</div>
        </div>
    `;

    const fSizeTitle = mode === 'browser' ? '24pt' : '36px';
    const fSizeNum = mode === 'browser' ? '28pt' : '42px';
    const fSizeLabel = mode === 'browser' ? '8pt' : '11px';

    let content = `
        <div class="no-break" style="text-align:center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: ${fSizeTitle}; color: #0f172a; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">СВОДНЫЙ ОТЧЕТ КОМПАНИИ</h1>
            <div style="font-size: ${mode === 'browser' ? '12pt' : '16px'}; font-weight: bold; color: #4f46e5; text-transform: uppercase; margin-top: 5px;">Статус на ${new Date().toLocaleDateString('ru-RU')}</div>
        </div>

        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="width: 25%; padding: 0 8px 0 0;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15px 10px; text-align: center; height: ${mode === 'browser' ? '30mm' : '100px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #64748b; text-transform: uppercase; font-weight: 900;">Глобальный УрК</div>
                        <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fSizeNum}; font-weight: 900; color: #0f172a; line-height: 1;">${globalAvgUrk}%</td><td>${renderTrend(globalAvgUrk, prevGlobalAvgUrk, trendLabel)}</td></tr></table>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 8px;">
                    <div style="background: ${parseFloat(globalIKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; border: 2px solid ${parseFloat(globalIKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; border-radius: 12px; padding: 15px 10px; text-align: center; height: ${mode === 'browser' ? '30mm' : '100px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска (ИКО)</div>
                        <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fSizeNum}; font-weight: 900; color: ${pdfIkoColorGlobal}; line-height: 1;">${globalIKO}</td><td>${renderTrend(globalIKO, prevGlobalIko, trendLabel, true)}</td></tr></table>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 8px;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15px 10px; text-align: center; height: ${mode === 'browser' ? '30mm' : '100px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                        <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fSizeNum}; font-weight: 900; color: #0f172a; line-height: 1;">${data.length}</td><td>${renderTrend(data.length, prevGlobalChecks, trendLabel)}</td></tr></table>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 0 0 8px;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15px 10px; text-align: center; height: ${mode === 'browser' ? '30mm' : '100px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #64748b; text-transform: uppercase; font-weight: 900;">Активных подрядчиков</div>
                        <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fSizeNum}; font-weight: 900; color: #0f172a; line-height: 1;">${uniqueContractorsGlobal}</td><td>${renderTrend(uniqueContractorsGlobal, prevGlobalContrs, trendLabel)}</td></tr></table>
                    </div>
                </td>
            </tr>
        </table>

        <!-- СРЕДНИЙ БЛОК: СВОДНАЯ ТАБЛИЦА (СЛЕВА) И ТОПЫ/РИСКИ (СПРАВА) -->
        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="width: 60%; padding-right: 15px; vertical-align: top;">
                    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; height: ${mode === 'browser' ? '120mm' : '420px'}; box-sizing: border-box; overflow: hidden;">
                        <div style="font-size: ${mode === 'browser' ? '12pt' : '16px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 8px;">🏢 Сводная таблица объектов</div>
                        ${allObjectsTableHtml}
                    </div>
                </td>
                <td style="width: 40%; vertical-align: top;">
                    
                    <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                        <div style="font-size: ${mode === 'browser' ? '10pt' : '14px'}; font-weight: 900; color: #166534; text-transform: uppercase; margin-bottom: 8px;">🚀 ТОП-3 Объектов (Рост УрК)</div>
                        ${topGrowth.length > 0 ? topGrowth.map(p => renderDynamicsCard(p, true)).join('') : `<div style="color:#166534; font-size:12px; text-align:center; padding:10px 0;">Роста не зафиксировано</div>`}
                    </div>

                    <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                        <div style="font-size: ${mode === 'browser' ? '10pt' : '14px'}; font-weight: 900; color: #9a3412; text-transform: uppercase; margin-bottom: 8px;">📉 ТОП-3 Объектов (Падение УрК)</div>
                        ${topDrop.length > 0 ? topDrop.map(p => renderDynamicsCard(p, false)).join('') : `<div style="color:#9a3412; font-size:12px; text-align:center; padding:10px 0;">Падения не зафиксировано</div>`}
                    </div>

                    <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; padding: 15px; height: auto; box-sizing: border-box;">
                        <div style="font-size: ${mode === 'browser' ? '10pt' : '14px'}; font-weight: 900; color: #991b1b; text-transform: uppercase; margin-bottom: 8px;">🚨 Зона риска: Подрядчики (УрК < 70% или B3)</div>
                        <table style="width: 100%; border-collapse: collapse;">
                            ${riskContractors.length > 0 ? riskContractors.slice(0, 5).map(r => `
                                <tr>
                                    <td style="padding: 6px 0; border-bottom: 1px solid #fecaca; font-size: ${mode === 'browser' ? '8pt' : '11px'}; font-weight: bold; color: #7f1d1d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 70%;">${r.name}</td>
                                    <td style="padding: 6px 0; border-bottom: 1px solid #fecaca; text-align: right; font-size: ${mode === 'browser' ? '9pt' : '12px'}; font-weight: 900; color: #dc2626;">${r.final}% ${r.b3 > 0 ? `(B3: ${r.b3})` : ''}</td>
                                </tr>
                            `).join('') : `<tr><td style="color: #166534; font-weight: bold; font-size: 12px; padding: 10px 0; text-align:center;">Все подрядчики компании в допустимой зоне!</td></tr>`}
                        </table>
                        ${riskContractors.length > 5 ? `<div style="font-size: 10px; color: #991b1b; font-weight: bold; text-align: center; margin-top: 8px;">...и ещё ${riskContractors.length - 5} компаний</div>` : ''}
                    </div>
                </td>
            </tr>
        </table>
    `;

    // ==========================================
    // 5. ГЕНЕРАЦИЯ ONE-PAGER ДЛЯ КАЖДОГО ОБЪЕКТА (Цикл for...of вместо forEach)
    // ==========================================
    for (let proj of projectsArray) {
        const pData = proj.data;
        
        const pChecksCount = pData.length;
        const pContractorsCount = new Set(pData.map(i => i.contractorName).filter(Boolean)).size;

        let pIkoColor = "#64748b";
        if (proj.IKO >= 0.6) pIkoColor = "#dc2626";
        else if (proj.IKO >= 0.3) pIkoColor = "#d97706";
        else pIkoColor = "#16a34a";

        const sparkLabels = []; const sparkData = [];
        for(let i=5; i>=0; i--) {
            const dStart = new Date(); dStart.setDate(now.getDate() - (i*7) - 7);
            const dEnd = new Date(); dEnd.setDate(now.getDate() - (i*7));
            const weekChecks = pData.filter(c => { const d = new Date(c.date); return d >= dStart && d < dEnd; });
            let wSum = 0; weekChecks.forEach(c => wSum += (c.metrics?.final || 0));
            sparkLabels.push(`-${i}н`);
            sparkData.push(weekChecks.length > 0 ? Math.round(wSum/weekChecks.length) : null);
        }

        const sparkUrl = generatePdfChart({
            type: 'line',
            data: { labels: sparkLabels, datasets: [{ data: sparkData, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.2)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4, spanGaps: true }] },
            options: { scales: { x: { display: false }, y: { display: false, min: 0, max: 100 } }, plugins: { legend: { display: false } }, layout: { padding: 0 } }
        }, 300, 100);
        const imgSpark = `<img style="width:100%; height:100%; object-fit:cover; opacity: 0.4; display:block;" src="${sparkUrl}">`;

        const groupedC = {};
        pData.forEach(item => { groupedC[item.contractorName] = groupedC[item.contractorName] || []; groupedC[item.contractorName].push(item); });
        const ratingData = [];
        for(let cName in groupedC) {
            if (groupedC[cName].length >= 3) {
                const m = getContractorMetrics(groupedC[cName], userTemplates);
                if (m) ratingData.push({ name: cName, val: m.finalC });
            }
        }
        ratingData.sort((a,b) => b.val - a.val);
        const topContrs = ratingData.slice(0, 10).map(r => r.name);

        const lineData = buildTrendChartData(pData, 'contractorName', topContrs, 'MONTH');
        lineData.datasets.forEach(ds => { ds.borderWidth = 2; ds.pointRadius = 2; });
        const lineUrl = generatePdfChart({
            type: 'line', data: lineData,
            options: { scales: { y: { min: 0, max: 100, ticks: { font: {size: 9} } }, x: { ticks: { font: {size: 9} } } }, plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: {size: 8} } } } }
        }, 600, 200);
        const imgLine = `<img style="width:100%; height:100%; object-fit:contain; display:block;" src="${lineUrl}">`;

        let ratingHtml = '';
        if (ratingData.length === 0) {
            ratingHtml = `<div style="font-size:${mode === 'browser' ? '8pt' : '10px'}; color:#94a3b8; text-align:center; padding: 20px;">Нет данных</div>`;
        } else {
            const renderRow = (r) => `
                <table style="width:100%; margin-bottom:6px; border-collapse:collapse; table-layout: fixed;">
                    <tr>
                        <td style="width:40%; font-size:${mode === 'browser' ? '8pt' : '11px'}; font-weight:bold; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:10px;">${r.name}</td>
                        <td style="width:45%; vertical-align: middle;">
                            <div style="background:#e2e8f0; height:10px; border-radius:5px; border:1px solid #cbd5e1; width:100%; overflow:hidden;">
                                <div style="width:${r.val}%; background:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')}; height:100%;"></div>
                            </div>
                        </td>
                        <td style="width:15%; text-align:right; font-size:${mode === 'browser' ? '8pt' : '11px'}; font-weight:900; color:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')};">${r.val}%</td>
                    </tr>
                </table>`;
            if (ratingData.length <= 10) ratingHtml = ratingData.map(renderRow).join('');
            else ratingHtml = ratingData.slice(0, 5).map(renderRow).join('') + `<div style="text-align:center; font-size:9px; color:#94a3b8; font-weight:bold; padding:2px 0; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:2px 0;">... Скрыто ${ratingData.length - 10} ...</div>` + ratingData.slice(-5).map(renderRow).join('');
        }

        let b3Map = {}; let b2Map = {}; let okMap = {}; let sumB3Obj = 0;
        pData.forEach(i => {
            if (i.metrics && i.metrics.n_B3_fail > 0) sumB3Obj += i.metrics.n_B3_fail;
            if(i.state && i.photos && i.templateKey) {
                Object.keys(i.state).forEach(id => {
                    const s = i.state[id];
                    let defName = "Дефект";
                    const flatList = getFlatList(userTemplates[i.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[i.templateKey.replace('sys_','')]?.groups);
                    const foundItem = flatList.find(x => x.id == id);
                    if(foundItem) defName = foundItem.n;
                    const photo = i.photos[id];

                    if(s === 'fail' || s === 'fail_escalated') {
                        let isB3 = (s === 'fail_escalated') || (foundItem && foundItem.w === 3);
                        if (isB3) {
                            if (!b3Map[defName]) b3Map[defName] = { count: 0, photo: null, contr: i.contractorName, name: defName };
                            b3Map[defName].count++; if (photo) b3Map[defName].photo = photo; 
                        } else {
                            const isB1 = foundItem && foundItem.w === 1;
                            if (isB1) return;
                            if (!b2Map[defName]) b2Map[defName] = { count: 0, photo: null, contr: i.contractorName, name: defName };
                            b2Map[defName].count++; if (photo) b2Map[defName].photo = photo;
                        }
                    } else if (s === 'ok' && photo) {
                        if (!okMap[defName]) okMap[defName] = { count: 0, photo: null, contr: i.contractorName, name: defName };
                        okMap[defName].count++; if (photo) okMap[defName].photo = photo;
                    }
                });
            }
        });

        const topB3 = Object.values(b3Map).sort((a,b) => b.count - a.count).slice(0, 5);
        const topB2 = Object.values(b2Map).sort((a,b) => b.count - a.count).slice(0, 5);
        const topOK = Object.values(okMap).sort((a,b) => b.count - a.count).slice(0, 5);

        // --- ВАЖНОЕ ИЗМЕНЕНИЕ ДЛЯ ФОТО: ИСПОЛЬЗУЕМ AWAIT ВНУТРИ ЦИКЛА ---
        const gridB3 = await buildPhotoGridHTML(topB3, '🚨 ТОП-5 Критических дефектов (B3)', '#dc2626', '#fca5a5', '#fef2f2', 5, mode);
        const gridB2 = await buildPhotoGridHTML(topB2, '🔄 ТОП-5 Повторяющихся нарушений (B2)', '#d97706', '#fdba74', '#fff7ed', 5, mode);
        const gridOK = await buildPhotoGridHTML(topOK, '✅ ТОП-5 Эталонных работ (OK)', '#16a34a', '#bbf7d0', '#f0fdf4', 5, mode);

        const isDanger = parseFloat(proj.IKO) >= 0.60 || sumB3Obj > 0;
        let pdcaText = `[АНАЛИТИКА ОБЪЕКТА]\nИндекс критичности объекта (ИКО): ${proj.IKO}.\nРаботы в красной зоне: ${proj.redZone}%.\nОхват: ${pChecksCount} проверок.\n\n`;
        if (isDanger) pdcaText += `1. Ограничить подписание КС-2 для подрядчиков в красной зоне.\n2. Провести аудит квалификации персонала.\n`;
        else pdcaText += `Процесс находится в управляемой зоне. Ресурсы направить на профилактику системных дефектов.\n`;
        const pdfFormattedText = pdcaText.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 4px;">$1</div>').replace(/\n/g, '<br>');

        const fsSmall = mode === 'browser' ? '7pt' : '9px';
        const fsNum = mode === 'browser' ? '18pt' : '26px';

        content += `
        <div class="pdf-page-break page-break-before"></div>
        <div style="text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 15px;">
            <h2 style="font-size: ${mode === 'browser' ? '16pt' : '20px'}; color: #0f172a; text-transform: uppercase; margin:0;">ОБЪЕКТ: ${proj.name}</h2>
        </div>
        
        <table class="no-break" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
                <td style="width: 32%; vertical-align: top; padding-right: 15px;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
                        <tr>
                            <td style="padding: 0 4px 8px 0; width:50%;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${proj.avgUrk}%</td><td>${renderTrend(proj.avgUrk, proj.prevAvgUrk, trendLabel)}</td></tr></table>
                                </div>
                            </td>
                            <td style="padding: 0 0 8px 4px; width:50%;">
                                <div style="background: ${parseFloat(proj.IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 10px; border-radius: 8px; border: 1px solid ${parseFloat(proj.IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: ${pIkoColor}; line-height: 1;">${proj.IKO}</td><td>${renderTrend(proj.IKO, proj.prevIKO, trendLabel, true)}</td></tr></table>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 4px 8px 0;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${pChecksCount}</td><td></td></tr></table>
                                </div>
                            </td>
                            <td style="padding: 0 0 8px 4px;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Подрядчиков</div>
                                    <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${pContractorsCount}</td><td></td></tr></table>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 4px 0 0;">
                                <div style="background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fecaca; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fsSmall}; color: #991b1b; text-transform: uppercase; font-weight: 900;">В красной зоне</div>
                                    <div style="font-size: ${fsNum}; font-weight: 900; color: #dc2626; margin-top: 5px; line-height: 1;">${proj.redZone}%</div>
                                </div>
                            </td>
                            <td style="padding: 0 0 0 4px;">
                                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box; position: relative; overflow: hidden;">
                                    <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900; position:relative; z-index:2;">Тренд (6 нед)</div>
                                    <div style="position:absolute; bottom:0; left:0; width:100%; height: 50%;">${imgSpark}</div>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 10px; height: auto; min-height:${mode === 'browser' ? '50mm' : '200px'}; box-sizing: border-box;">
                        <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 5px; text-align: center;">📈 Динамика Подрядчиков</div>
                        <div style="height:${mode === 'browser' ? '40mm' : '160px'}; text-align:center; overflow: hidden;">${imgLine ? imgLine : '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}</div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; height: auto; min-height:${mode === 'browser' ? '60mm' : '250px'}; box-sizing: border-box;">
                        <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; text-align: center;">🏆 Интегральный УрК</div>
                        <div style="width: 100%;">${ratingHtml}</div>
                    </div>
                </td>
                <td style="width: 68%; vertical-align: top;">
                    ${gridB3}
                    ${gridB2}
                    ${gridOK}

                    <div class="no-break" style="background: ${isDanger ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${isDanger ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 8px 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; color: ${isDanger ? '#b45309' : '#166534'}; text-transform: uppercase; border-bottom: 2px solid ${isDanger ? '#fde047' : '#86efac'}; padding-bottom: 6px;">🎯 Управленческое Решение и Риски</h3>
                        <div style="font-size: ${mode === 'browser' ? '10pt' : '13px'}; line-height: 1.5; color: #1e293b; columns: 2; column-gap: 20px;">${pdfFormattedText}</div>
                    </div>
                </td>
            </tr>
        </table>
        `;
    } // Конец цикла for...of

    printPdfShell("Сводный Отчет Компании", content, "A3", "landscape", mode);
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
// 5. Текущий экран (Детализация Подрядчика или Список А4)
async function exportPdfCurrentScreen(data, mode = 'script') {
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
                        const flatList = getFlatList(userTemplates[check.templateKey.replace('user_','')]?.groups || SYSTEM_TEMPLATES[check.templateKey.replace('sys_','')]?.groups);
                        const itemInfo = flatList.find(x => x.id == id);
                        const isB3 = s === 'fail_escalated' || (itemInfo && itemInfo.w === 3);
                        const defName = itemInfo ? itemInfo.n : 'Дефект';
                        
                        if (isB3) photosB3.push({ src: check.photos[id], name: defName, contr: check.contractorName }); 
                        else photosB2.push({ src: check.photos[id], name: defName, contr: check.contractorName });
                    }
                });
            }
        });

        const fontSizeSmall = mode === 'browser' ? '8pt' : '10px';
        const fontSizeNum = mode === 'browser' ? '28pt' : '36px';

        const content = `
            <div style="border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 20px;" class="no-break">
                <h2 style="margin:0; font-size: ${mode === 'browser' ? '18pt' : '24px'}; color:#0f172a; text-transform:uppercase;">Детализация: ${currentDetailedContractor}</h2>
                <div style="color:#64748b; font-weight:bold; margin-top:5px; font-size:${mode === 'browser' ? '10pt' : '12px'};">Вид работ: ${workType} | Выборка: ${m.count} проверок</div>
            </div>
            
            <table style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;" class="no-break">
                <tr>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:${fontSizeSmall}; color:#64748b; text-transform:uppercase; font-weight:bold;">Ср. УрК Изделий</div>
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:#0f172a;">${m.baseUrkContrPerc}%</div>
                        <div style="font-size:${fontSizeSmall}; font-weight:bold; color:#475569;">До штрафов</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:${fontSizeSmall}; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность (ИУрК)</div>
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:${m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a')};">${m.finalC}%</div>
                        <div style="font-size:${fontSizeSmall}; font-weight:bold; color:#475569;">Погрешность: ±${m.ci95_margin.toFixed(1)}%</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:${fontSizeSmall}; color:#64748b; text-transform:uppercase; font-weight:bold;">Стабильность</div>
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:#0f172a;">${m.stabilityIndex}</div>
                        <div style="font-size:${fontSizeSmall}; font-weight:bold; color:#475569; text-transform:uppercase;">${m.stabText}</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:${fontSizeSmall}; color:#64748b; text-transform:uppercase; font-weight:bold;">Дефекты B3 / B2</div>
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:#dc2626;">${m.n_изделий_с_B3} <span style="color:#d97706; font-size:${mode === 'browser' ? '18pt' : '24px'};">/ ${photosB2.length}</span></div>
                        <div style="font-size:${fontSizeSmall}; font-weight:bold; color:#475569;">Критичность: ${m.kcritC.toFixed(2)}</div>
                    </td>
                </tr>
            </table>

            ${expertText}
            
            `;
        
        const gridB3 = await buildPhotoGridHTML(photosB3, '🚨 Критические дефекты (B3)', '#dc2626', '#fca5a5', 'transparent', 5, mode);
        const gridB2 = await buildPhotoGridHTML(photosB2, '⚠️ Значимые дефекты (B2)', '#d97706', '#fde68a', 'transparent', 5, mode);
        
        content += gridB3 + gridB2;
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
            const pdfFormattedText = rawSmartText.replace(/^\[(.*?)\]/gm, `<div style="font-size: ${mode === 'browser' ? '10pt' : '12px'}; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;">$1</div>`).replace(/\n/g, '<br>');
            
            aiHtml = `
            <div class="no-break" style="margin-bottom: 20px; border: 1px solid ${isCustomText ? '#fde047' : '#cbd5e1'}; border-radius: 8px; background: ${isCustomText ? '#fefce8' : '#f8fafc'}; padding: 15px;">
                <h3 style="margin-top: 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; border-bottom: 2px solid ${isCustomText ? '#fef08a' : '#e2e8f0'}; padding-bottom: 8px; margin-bottom: 15px; color: ${isCustomText ? '#854d0e' : '#0f172a'};">
                    ${isCustomText ? '⚠️ АНАЛИЗ ЗОН РИСКА (С КОРРЕКТИРОВКАМИ ИНЖЕНЕРА)' : '🧠 АНАЛИЗ ЗОН РИСКА (АВТОМАТИЧЕСКИЙ)'}
                </h3>
                <div style="font-size: ${mode === 'browser' ? '10pt' : '12px'}; line-height: 1.5; color: #1e293b; white-space: pre-wrap;">${pdfFormattedText}</div>
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
                            <div style="font-size:${mode === 'browser' ? '11pt' : '14px'}; font-weight:900; color:#0f172a; line-height:1.2;">${c.name}</div>
                            <div style="font-size:${mode === 'browser' ? '7pt' : '9px'}; color:#64748b; text-transform:uppercase; font-weight:bold; margin-top:4px;">${c.workType}</div>
                        </td>
                        <td style="text-align:right; vertical-align: top;">
                            <div style="font-size:${mode === 'browser' ? '7pt' : '9px'}; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность</div>
                            <div style="font-size:${mode === 'browser' ? '18pt' : '24px'}; font-weight:900; color:${color}; line-height:1;">
                                ${m.count < 7 ? `<span style="font-size:${mode === 'browser' ? '10pt' : '12px'};color:#64748b;">СБОР</span>` : m.finalC + '%'}
                            </div>
                        </td>
                    </tr>
                </table>
                <table style="width: 100%; border-top:1px solid #e2e8f0; padding-top:10px; margin-top:10px; text-align: center;">
                    <tr>
                        <td>
                            <div style="color:#64748b; font-size:${mode === 'browser' ? '6pt' : '8px'}; text-transform:uppercase; font-weight:bold;">Ср. УрК</div>
                            <div style="font-weight:900; font-size:${mode === 'browser' ? '10pt' : '14px'};">${m.baseUrkContrPerc}%</div>
                        </td>
                        <td>
                            <div style="color:#64748b; font-size:${mode === 'browser' ? '6pt' : '8px'}; text-transform:uppercase; font-weight:bold;">Проверок</div>
                            <div style="font-weight:900; font-size:${mode === 'browser' ? '10pt' : '14px'};">${m.count}</div>
                        </td>
                        <td>
                            <div style="color:#64748b; font-size:${mode === 'browser' ? '6pt' : '8px'}; text-transform:uppercase; font-weight:bold;">Стабильность</div>
                            <div style="font-weight:900; font-size:${mode === 'browser' ? '10pt' : '14px'}; color:${m.count < 7 ? '#94a3b8' : '#0f172a'};">${m.count < 7 ? '-' : m.stabilityIndex}</div>
                        </td>
                        <td>
                            <div style="color:#64748b; font-size:${mode === 'browser' ? '6pt' : '8px'}; text-transform:uppercase; font-weight:bold;">B3</div>
                            <div style="font-weight:900; font-size:${mode === 'browser' ? '10pt' : '14px'}; color:${m.n_изделий_с_B3 > 0 ? '#dc2626' : '#16a34a'};">${m.n_изделий_с_B3}</div>
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

        const fontSizeSmall = mode === 'browser' ? '7pt' : '9px';
        const fontSizeNum = mode === 'browser' ? '18pt' : '24px';

        const content = `
            <div class="no-break" style="margin-bottom: 20px;">
                <h2 style="margin:0; font-size: ${mode === 'browser' ? '16pt' : '20px'}; color:#0f172a; text-transform:uppercase;">Отчет: Текущий срез подрядчиков</h2>
                <div style="font-size: ${mode === 'browser' ? '10pt' : '12px'}; color: #64748b; font-weight:bold; margin-top:5px;">Сформировано на основе активных фильтров (Всего: ${data.length} пров.)</div>
            </div>
            
            <table class="no-break" style="width: 100%; border-spacing: 10px 0; border-collapse: separate; table-layout: fixed; margin-left: -10px; margin-bottom: 20px;">
                <tr>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                        <div style="font-size:${fontSizeSmall}; color:#64748b; text-transform:uppercase; font-weight:bold;">Ср. УрК Изделий</div>
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:${avgUrkProd < 70 ? '#dc2626' : (avgUrkProd < 85 ? '#d97706' : '#16a34a')};">${avgUrkProd}%</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                        <div style="font-size:${fontSizeSmall}; color:#64748b; text-transform:uppercase; font-weight:bold;">Надежность (ИУрК)</div>
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:${avgIntegralUrk < 70 ? '#dc2626' : (avgIntegralUrk < 85 ? '#d97706' : '#16a34a')};">${validContrCount > 0 ? avgIntegralUrk+'%' : 'СБОР'}</div>
                    </td>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
                        <div style="font-size:${fontSizeSmall}; color:#64748b; text-transform:uppercase; font-weight:bold;">Дефекты B3 / B2</div>
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:#dc2626;">${sumB3} <span style="color:#d97706; font-size:${mode === 'browser' ? '12pt' : '16px'};">/ ${sumB2}</span></div>
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


// 6. Выгрузка Полного отчета по объекту (Паспорта подрядчиков А3)
async function exportPdfFullObjectReport(data, mode = 'script') {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    let projName = 'Все объекты';
    if (activeMultiFilters.analytics.project.length > 0) {
        projName = activeMultiFilters.analytics.project.join(', ');
    }
    
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
    const imgLineGlobal = cLine ? `<img style="width:100%; height:${mode === 'browser' ? '50mm' : '180px'}; object-fit:contain; display:block;" src="${cLine.toDataURL('image/png')}">` : '';

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

    const fSizeTitle = mode === 'browser' ? '24pt' : '36px';
    const fSizeSub = mode === 'browser' ? '12pt' : '18px';
    const fSizeNum = mode === 'browser' ? '32pt' : '42px';
    const fSizeLabel = mode === 'browser' ? '9pt' : '12px';

    // --- СБОРКА ТИТУЛЬНОГО ЛИСТА ---
    let content = `
        <div class="no-break" style="text-align:center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: ${fSizeTitle}; color: #0f172a; text-transform: uppercase; font-weight: 900;">СВОДНЫЙ ОТЧЕТ ПО КАЧЕСТВУ</h1>
            <div style="font-size: ${fSizeSub}; font-weight: bold; color: #4f46e5; text-transform: uppercase; margin-top: 10px;">ОБЪЕКТ: ${projName}</div>
            <div style="font-size: ${fSizeLabel}; color: #64748b; font-weight: bold; margin-top: 5px;">Сформировано на основе ${data.length} проверок</div>
        </div>

        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
                <td style="width: 25%; padding: 0 10px 0 0;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; height: ${mode === 'browser' ? '35mm' : '120px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                        <div style="font-size: ${fSizeNum}; font-weight: 900; color: #0f172a; margin-top: 10px;">${avgUrkProd}%</div>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 10px;">
                    <div style="background: ${parseFloat(IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; border: 2px solid ${parseFloat(IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; border-radius: 12px; padding: 20px; text-align: center; height: ${mode === 'browser' ? '35mm' : '120px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска (ИКО)</div>
                        <div style="font-size: ${fSizeNum}; font-weight: 900; color: ${parseFloat(IKO) >= 0.6 ? '#dc2626' : (parseFloat(IKO) >= 0.3 ? '#d97706' : '#16a34a')}; margin-top: 10px;">${IKO}</div>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 10px;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; height: ${mode === 'browser' ? '35mm' : '120px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                        <div style="font-size: ${fSizeNum}; font-weight: 900; color: #0f172a; margin-top: 10px;">${data.length}</div>
                    </div>
                </td>
                <td style="width: 25%; padding: 0 0 0 10px;">
                    <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; padding: 20px; text-align: center; height: ${mode === 'browser' ? '35mm' : '120px'}; box-sizing: border-box;">
                        <div style="font-size: ${fSizeLabel}; color: #991b1b; text-transform: uppercase; font-weight: 900;">В красной зоне</div>
                        <div style="font-size: ${fSizeNum}; font-weight: 900; color: #dc2626; margin-top: 10px;">${redZonePerc}%</div>
                    </div>
                </td>
            </tr>
        </table>

        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="width: 50%; padding: 0 10px 0 0; vertical-align: top;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15px; height: ${mode === 'browser' ? '75mm' : '260px'}; box-sizing: border-box;">
                        <div style="font-size: ${mode === 'browser' ? '11pt' : '14px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 10px; text-align: center;">📈 Динамика (Ср. УрК)</div>
                        <div style="text-align: center; height: ${mode === 'browser' ? '55mm' : '200px'}; overflow: hidden;">${imgLineGlobal || '<span style="color:#94a3b8;">Нет графика</span>'}</div>
                    </div>
                </td>
                <td style="width: 50%; padding: 0 0 0 10px; vertical-align: top;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 15px; height: ${mode === 'browser' ? '75mm' : '260px'}; box-sizing: border-box;">
                        <div style="font-size: ${mode === 'browser' ? '11pt' : '14px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 10px; text-align: center;">📊 Сравнение Подрядчиков (ИУрК)</div>
                        <div style="text-align: center; height: ${mode === 'browser' ? '55mm' : '200px'}; overflow: hidden;">
                            <img src="${barChartUrlGlobal}" style="width:100%; height:100%; object-fit:contain; display:block;">
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    `;

    // --- ГЕНЕРАЦИЯ ПАСПОРТОВ ПОДРЯДЧИКОВ ---
    for (let cObj of cList) {
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

        // Экспертное заключение
        let expertHtml = getExpertConclusion(m, cName, cObj.workType, cData.length, 'print', customExpertConclusions).pdfHtml;
        if (mode === 'browser') {
            expertHtml = expertHtml.replace(/font-size:\s*1[234]px/g, 'font-size: 9pt').replace(/margin-bottom:\s*1[05]px/g, 'margin-bottom: 6px');
        } else {
            expertHtml = expertHtml.replace(/font-size:\s*1[234]px/g, 'font-size: 10px').replace(/margin-bottom:\s*1[05]px/g, 'margin-bottom: 6px');
        }

        const fsBoxNum = mode === 'browser' ? '22pt' : '36px';
        const fsBoxLabel = mode === 'browser' ? '7pt' : '10px';
        const hBox = mode === 'browser' ? '28mm' : '95px';

        content += `
        <div class="pdf-page-break page-break-before"></div>
        <div class="no-break" style="border-bottom: 2px solid #1e293b; padding-bottom: 6px; margin-bottom: 12px;">
            <h1 style="margin: 0 0 4px 0; font-size: ${mode === 'browser' ? '16pt' : '20px'}; color: #0f172a; text-transform: uppercase;">Паспорт: ${cName}</h1>
            <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; font-weight: bold; color: #64748b; text-transform: uppercase;">Вид работ: ${cObj.workType}</div>
        </div>

        <!-- БЛОК 1: МЕТРИКИ И ГРАФИК ПАСПОРТА -->
        <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 12px;">
            <tr>
                <td style="width: 25%; padding: 0 6px 0 0;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; height: ${hBox}; box-sizing: border-box;">
                        <div style="font-size: ${fsBoxLabel}; color: #64748b; text-transform: uppercase; font-weight: 900; margin-bottom: 6px;">Ср. УрК Изделий</div>
                        <div style="font-size: ${fsBoxNum}; font-weight: 900; color: #0f172a; line-height: 1;">${m.baseUrkContrPerc}%</div>
                    </div>
                </td>
                <td style="width: 15%; padding: 0 6px;">
                    <div style="background: ${bgMain}; border: 2px solid ${borderMain}; border-radius: 8px; padding: 12px; text-align: center; height: ${hBox}; box-sizing: border-box;">
                        <div style="font-size: ${fsBoxLabel}; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">Надежность</div>
                        <div style="font-size: ${mode === 'browser' ? '18pt' : '26px'}; font-weight: 900; color: ${colorMain}; line-height: 1;">${m.finalC}%</div>
                    </div>
                </td>
                <td style="width: 15%; padding: 0 6px;">
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; height: ${hBox}; box-sizing: border-box;">
                        <div style="font-size: ${fsBoxLabel}; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">Проверок</div>
                        <div style="font-size: ${mode === 'browser' ? '18pt' : '26px'}; font-weight: 900; color: #0f172a; line-height: 1;">${m.count}</div>
                    </div>
                </td>
                <td style="width: 15%; padding: 0 6px;">
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; height: ${hBox}; box-sizing: border-box;">
                        <div style="font-size: ${fsBoxLabel}; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 6px;">B1/B2/B3</div>
                        <div style="font-size: ${mode === 'browser' ? '12pt' : '16px'}; font-weight: 900; color: #0f172a; line-height: 1.5;">
                            <span style="color:#3b82f6">${defs.b1}</span> / <span style="color:#d97706">${defs.b2}</span> / <span style="color:#dc2626">${defs.b3}</span>
                        </div>
                    </div>
                </td>
                <td style="width: 30%; padding: 0 0 0 6px;">
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; height: ${hBox}; box-sizing: border-box;">
                        <div style="font-size: ${fsBoxLabel}; color: #0f172a; text-transform: uppercase; font-weight: bold; text-align:center;">Динамика проверок</div>
                        <div style="height: ${mode === 'browser' ? '18mm' : '60px'}; text-align: center; margin-top: 4px;"><img src="${lineChartUrl}" style="width: 100%; height: 100%; object-fit: contain;"></div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- БЛОК 2: ЗАКЛЮЧЕНИЕ И ФОТО -->
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
            <tr>
                <td style="width: 25%; vertical-align: top; padding-right: 12px;">
                    ${expertHtml}
                </td>
                <td style="width: 75%; vertical-align: top; padding: 0;">
                    ${await buildPhotoGridHTML(photosB3, '🚨 Критические дефекты (B3)', '#dc2626', '#fca5a5', '#fef2f2', 5, mode)}
                    ${await buildPhotoGridHTML(photosB2, '⚠️ Повторяющиеся дефекты (B2)', '#d97706', '#fdba74', '#fff7ed', 5, mode)}
                    ${await buildPhotoGridHTML(photosOK, '✅ Эталоны качества (OK)', '#16a34a', '#bbf7d0', '#f0fdf4', 5, mode)}
                </td>
            </tr>
        </table>
        `;
    } // Конец цикла for...of

    printPdfShell("Полный отчет по объекту", content, "A3", "landscape", mode);
}

// 4. Плакат Качества (A3 Альбом)
async function exportPdfPoster(data, mode = 'script') {
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
        if (isBreak) { color = '#4f46e5'; bg = '#e0e7ff'; bd = '#bae6fd'; badge = `<div style="background:#4f46e5; color:white; padding:2px 4px; border-radius:4px; font-size:${mode === 'browser' ? '7pt' : '10px'}; font-weight:bold; display:inline-block; margin-bottom:4px;">🚀 +${c.growth}% к прошлой неделе</div>`; }
        if (isBad) { color = '#dc2626'; bg = '#fef2f2'; bd = '#fecaca'; }
        
        return `
        <div class="no-break" style="background: ${bg}; border: 2px solid ${bd}; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            ${badge}
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="vertical-align: top;">
                        <div style="font-size: ${mode === 'browser' ? '12pt' : '16px'}; font-weight: 900; color: #0f172a; margin-bottom:4px; line-height:1.2;">${c.name}</div>
                        <div style="font-size: ${mode === 'browser' ? '8pt' : '10px'}; color: #64748b; text-transform: uppercase; font-weight:bold;">${c.workType}</div>
                        ${isBad && c.metrics.n_изделий_с_B3 > 0 ? `<div style="margin-top:6px; font-size:${mode === 'browser' ? '8pt' : '10px'}; font-weight:bold; color:#991b1b; background:#fee2e2; padding:4px 6px; border-radius:4px; display:inline-block;">🚨 Аварий (B3): ${c.metrics.n_изделий_с_B3} шт</div>` : ''}
                    </td>
                    <td style="text-align: right; width: ${mode === 'browser' ? '20mm' : '60px'}; vertical-align: top;">
                        <div style="font-size: ${mode === 'browser' ? '24pt' : '32px'}; font-weight: 900; color: ${color}; line-height:1;">${c.metrics.finalC}%</div>
                    </td>
                </tr>
            </table>
        </div>`;
    };

    allDefectPhotos = allDefectPhotos.sort(() => 0.5 - Math.random()).slice(0, 4);
    allOkPhotos = allOkPhotos.sort(() => 0.5 - Math.random()).slice(0, 4);

    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: ${mode === 'browser' ? '24pt' : '32px'}; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900; letter-spacing:1px;">БЮЛЛЕТЕНЬ КАЧЕСТВА СТРОИТЕЛЬСТВА</h1>
            <div style="font-size: ${mode === 'browser' ? '12pt' : '16px'}; color: #4f46e5; font-weight: 900; margin-top: 4px; text-transform:uppercase;">Итоги: ${periodStr}</div>
        </div>

        <table style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 10px;">
            <tr>
                <td style="vertical-align: top; width:33.3%;">
                    <h2 style="background: #16a34a; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase; font-size:${mode === 'browser' ? '11pt' : '14px'}; margin-top:0; margin-bottom:12px;">🏆 Лидеры (УрК > 85%)</h2>
                    ${leaders.length > 0 ? leaders.map(c => renderPosterCard(c, 'leader')).join('') : `<div style="text-align:center; padding:20px; color:#64748b; font-size:${mode === 'browser' ? '9pt' : '12px'}; font-weight:bold; border:1px dashed #cbd5e1; border-radius:8px;">В зеленой зоне никого нет</div>`}
                </td>
                <td style="vertical-align: top; width:33.3%;">
                    <h2 style="background: #4f46e5; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase; font-size:${mode === 'browser' ? '11pt' : '14px'}; margin-top:0; margin-bottom:12px;">🚀 Прорыв недели</h2>
                    ${breakthrough ? renderPosterCard(breakthrough, 'break') : `<div style="text-align:center; padding:20px; color:#64748b; font-size:${mode === 'browser' ? '9pt' : '12px'}; font-weight:bold; border:1px dashed #cbd5e1; border-radius:8px;">Значительного прогресса нет</div>`}
                    
                    <div style="margin-top: 20px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 15px; text-align: center;">
                        <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                        <div style="font-size: ${mode === 'browser' ? '36pt' : '48px'}; font-weight: 900; color: #0f172a; margin-top:5px;">${avgObjectUrk}%</div>
                    </div>
                    <div style="margin-top: 15px; background: ${parseFloat(IKO) >= 0.6 ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${parseFloat(IKO) >= 0.6 ? '#fca5a5' : '#bbf7d0'}; border-radius: 8px; padding: 15px; text-align: center;">
                        <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс риска (ИКО)</div>
                        <div style="font-size: ${mode === 'browser' ? '36pt' : '48px'}; font-weight: 900; color: ${parseFloat(IKO) >= 0.6 ? '#dc2626' : '#16a34a'}; margin-top:5px;">${IKO}</div>
                    </div>
                </td>
                <td style="vertical-align: top; width:33.3%;">
                    <h2 style="background: #ef4444; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase; font-size:${mode === 'browser' ? '11pt' : '14px'}; margin-top:0; margin-bottom:12px;">⚠️ Зона внимания</h2>
                    ${antiLeaders.length > 0 ? antiLeaders.map(c => renderPosterCard(c, 'bad')).join('') : `<div style="text-align:center; padding:20px; color:#16a34a; font-size:${mode === 'browser' ? '9pt' : '12px'}; font-weight:bold; border:1px dashed #bbf7d0; border-radius:8px; background:#f0fdf4;">Отличная работа! Отстающих нет!</div>`}
                </td>
            </tr>
        </table>

        <div style="border-top: 3px solid #1e293b; padding-top: 20px; margin-top: 10px;">
            <table style="width: 100%; border-spacing: 20px 0; border-collapse: separate; table-layout: fixed; margin-left:-20px;">
                <tr>
                    <td style="vertical-align:top; width:50%;">
                        ${await buildPhotoGridHTML(allOkPhotos, '✅ Эталоны качества (OK)', '#16a34a', '#bbf7d0', '#f0fdf4', 4, mode)}
                    </td>
                    <td style="vertical-align:top; width:50%;">
                        ${await buildPhotoGridHTML(allDefectPhotos, '❌ Выявленные нарушения (FAIL)', '#dc2626', '#fca5a5', '#fef2f2', 4, mode)}
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
    
    // Динамические шрифты под режим (pt для принтера, px для PDF)
    const fSizeTitle = mode === 'browser' ? '14pt' : '18px';
    const fSizeSub = mode === 'browser' ? '9pt' : '12px';
    const fSizeTable = mode === 'browser' ? '8pt' : '10px';
    
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
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align:center;">B1:${m ? m.n_B1_fail : 0} | B2:${m ? m.n_B2_fail : 0} | B3:${m ? m.n_B3_fail : 0}</td>
        </tr>`;
    }).join('');

    const content = `
        <div class="no-break" style="margin-bottom: 15px;">
            <h2 style="font-size: ${fSizeTitle}; color: #0f172a; margin: 0 0 5px 0; text-transform: uppercase;">Сырые данные (База проверок)</h2>
            <div style="font-size: ${fSizeSub}; color: #64748b;">Выгружено проверок: <b>${data.length} шт.</b></div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: ${fSizeTable}; color: #1e293b; table-layout: fixed;">
            <thead>
                <tr style="background-color: #e2e8f0; font-weight: bold; text-transform: uppercase;">
                    <th style="border: 1px solid #94a3b8; padding: 8px; width: 5%;">#</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left; width: 10%;">Дата</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left; width: 20%;">Подрядчик</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left; width: 15%;">Локация</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left; width: 20%;">Этап</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; text-align: left; width: 10%;">Инспектор</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; width: 5%;">УрК</th>
                    <th style="border: 1px solid #94a3b8; padding: 8px; width: 15%;">Дефекты</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
    printPdfShell("База проверок", content, "A4", "portrait", mode);
}


// 9. Универсальная печатная оболочка (Диспетчер потоков PDF / Print)
async function printPdfShell(title, content, formatSize = 'A4', orientation = 'portrait', mode = 'script') {
    window._pdfGenerating = true;
    // 1. Управление лоадером
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('global-loader-text');
    
    if (loader && loaderText) {
        loaderText.innerText = mode === 'script' ? "Формируем PDF (высокое качество)..." : "Подготовка к системной печати...";
        loader.style.display = 'flex';
        setTimeout(() => loader.classList.remove('opacity-0'), 10);
    }

    let projName = document.getElementById('inp-project')?.value || 'Не указан';
    let inspName = document.getElementById('inp-inspector')?.value || 'Не указан';

    // Умная подстановка для вкладки Аналитики (учитываем мульти-фильтры)
    if (document.getElementById('tab-analytics')?.classList.contains('active')) {
        projName = activeMultiFilters.analytics.project.length > 0 ? activeMultiFilters.analytics.project.join(', ') : 'Все объекты';
        inspName = activeMultiFilters.analytics.inspector.length > 0 ? activeMultiFilters.analytics.inspector.join(', ') : 'Все инспекторы';
    }

    // Константы для PDF режима (в Print режиме они не используются, там работают pt и mm)
    const MARGIN_MM = 10;
    const MM_TO_PX = 3.7795;
    const pageWidths = {
        'A4_portrait':  Math.floor(210 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A4_landscape': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_portrait':  Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_landscape': Math.floor(420 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
    };
    const widthPx = Math.floor(pageWidths[`${formatSize}_${orientation}`] || pageWidths['A4_portrait']);
    const HIGH_QUALITY_SCALE = 2.5;

    // Универсальная шапка (Пока используем единую, на следующих этапах для браузера будем дублировать её программно)
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

    // ============================================================================
    // ПАЙПЛАЙН 1: БРАУЗЕРНАЯ ПЕЧАТЬ (window.print)
    // ============================================================================
    if (mode === 'browser') {
        const printContainer = document.getElementById('print-content');
        printContainer.setAttribute('data-no-observe', 'true');
        if (!printContainer) {
            console.error('Контейнер #print-content не найден!');
            return;
        }

        // В Print-режиме задаем размеры страницы через @page, а контенту отдаем 100% ширины
        printContainer.innerHTML = `
            <style>
                @page { 
                    size: ${formatSize} ${orientation}; 
                    margin: 15mm 10mm; 
                }
                #print-wrapper { 
                    width: 100%; 
                    margin: 0 auto; 
                    font-family: Arial, sans-serif; 
                    font-size: 10pt; /* Используем pt для печати */
                }
                #print-wrapper img { max-width: 100%; display: block; }
                #print-wrapper table { width: 100%; table-layout: fixed; border-collapse: collapse; }
            </style>
            <div id="print-wrapper">
                ${header}
                ${content}
            </div>
        `;
        
        // Дожидаемся загрузки всех картинок перед вызовом диалога печати
       // 1. Превращаем local:// в blob:
        await resolveLocalPhotosForPdf(printContainer);
        // 2. Ждем физической отрисовки
        await waitForPdfImages(printContainer, 5000);
        
        setTimeout(() => {
            window._pdfGenerating = false;
            window.print();
            // Очищаем DOM и убираем лоадер после закрытия окна печати
            setTimeout(() => {
                printContainer.innerHTML = '';
                if (loader) { loader.classList.add('opacity-0'); setTimeout(() => loader.style.display = 'none', 300); }
            }, 1000);
        }, 500); // 500ms пауза критична для iOS Safari
        return;
    }

    // ============================================================================
    // ПАЙПЛАЙН 2: ВЫГРУЗКА PDF ЧЕРЕЗ HTML2PDF (Постраничный рендер)
    // ============================================================================
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isWeakDevice = isMobile || (navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);

    const hiddenDiv = document.createElement('div');
    // Держим блок в координатах экрана с opacity: 0.01, чтобы агрессивный сборщик мусора iOS Safari не удалил его из оперативной памяти
    hiddenDiv.style.cssText = `position: absolute; left: 0; top: 0; width: ${widthPx + 100}px; background: white; z-index: -9999; opacity: 0.01; pointer-events: none;`;
    hiddenDiv.setAttribute('data-no-observe', 'true');
    document.body.appendChild(hiddenDiv);

    const styleElem = document.createElement('style');
    styleElem.textContent = `
        .pdf-print-root { width: ${widthPx}px !important; margin: 0 auto !important; padding: 20px !important; background: white !important; font-family: Arial, sans-serif !important; color: black !important; box-sizing: border-box !important; }
        .pdf-print-root * { box-sizing: border-box !important; }
        .pdf-print-root img { max-width: 100% !important; display: block !important; }
        .pdf-print-root table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
        .pdf-print-root .no-break, .pdf-print-root tr, .pdf-print-root td, .pdf-print-root img { page-break-inside: avoid !important; break-inside: avoid !important; }
    `;
    hiddenDiv.appendChild(styleElem);

    const cleanup = () => {
        window._pdfGenerating = false;
        if (loader) { loader.classList.add('opacity-0'); setTimeout(() => loader.style.display = 'none', 300); }
        if (document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv);
        
        // ЗАКРЫВАЕМ ЗАДАЧУ ТОЛЬКО ПОСЛЕ УСПЕШНОЙ ВЫГРУЗКИ PDF
        if (window.activeTaskId) {
            const task = window.rbi_tasksData?.find(t => t.id === window.activeTaskId);
            // Закрываем, если это задача отчета (Плакат или One-Pager)
            if (task && task.taskType === 'Отчет' && task.status === 'pending') {
                task.status = 'done';
                task.resultComment = 'Файл сгенерирован';
                task.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') dbPut(STORES.TASKS, task);
                if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
            }
            window.activeTaskId = null; // Сбрасываем
        }
    };

    const opt = {
        margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
        filename: `${title.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toLocaleDateString('ru-RU')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },   
        html2canvas: {
            scale: HIGH_QUALITY_SCALE, // Качество сохраняем максимальным (2.5)  
            useCORS: true,
            letterRendering: true,
            width: widthPx,
            windowWidth: widthPx,
            x: 0, y: 0, scrollX: 0, scrollY: 0,
            logging: false, allowTaint: true, backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: formatSize.toLowerCase(), orientation: orientation, compress: true },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
        if (loaderText) loaderText.innerText = "Создание PDF (Высокое качество)...";
         await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // Разделяем контент на отдельные страницы по маркеру разрыва
        const pagesHtml = (header + content).split(/<div class=["']pdf-page-break page-break-before["']><\/div>/gi);
        
        // Если устройство слабое ИЛИ страниц несколько - рендерим постранично с очисткой RAM!
        if ((isWeakDevice || pagesHtml.length > 1) && pagesHtml.length > 0) {
            let worker = html2pdf().set(opt);
            
            for (let i = 0; i < pagesHtml.length; i++) {
                if (loaderText) loaderText.innerText = `Обработка листа ${i + 1} из ${pagesHtml.length}...`;
                
                const pageDiv = document.createElement('div');
                pageDiv.className = 'pdf-print-root';
                pageDiv.innerHTML = pagesHtml[i];
                
                // Очищаем скрытый контейнер от предыдущей страницы (Освобождаем DOM)
                Array.from(hiddenDiv.children).forEach(c => { if (c.className === 'pdf-print-root') hiddenDiv.removeChild(c); });
                hiddenDiv.appendChild(pageDiv);

                // Ждем загрузки картинок ИМЕННО ЭТОЙ страницы
                await resolveLocalPhotosForPdf(pageDiv);
                await waitForPdfImages(pageDiv, isMobile ? 8000 : 5000);

                // Рендерим страницу и добавляем в PDF (API html2pdf.js)
                if (i === 0) {
                    worker = worker.from(pageDiv).toPdf();
                } else {
                    worker = worker.get('pdf').then(pdf => { pdf.addPage(); }).from(pageDiv).toContainer().toCanvas().toPdf();
                }
                
                await worker; // Ждем окончания рендера канваса
                
                // На слабых устройствах даем сборщику мусора (GC) 800мс на очистку памяти от тяжелого канваса
                if (isWeakDevice) {
                    await new Promise(resolve => setTimeout(resolve, 700)); 
                }
            }
            await worker.save();
        } else {
            // Обычный рендер одним куском (если страница всего одна и устройство мощное)
            const rootDiv = document.createElement('div');
            rootDiv.className = 'pdf-print-root';
            rootDiv.innerHTML = header + content;
            hiddenDiv.appendChild(rootDiv);
            
            await resolveLocalPhotosForPdf(rootDiv);
            await waitForPdfImages(rootDiv, isMobile ? 8000 : 5000);
            
            await html2pdf().set(opt).from(rootDiv).save();
        }
        
        cleanup();
        if (typeof showToast === 'function') showToast("✅ PDF высокого качества сохранён!");
    } catch (err) {
        console.error('[PDF Error]', err);
        cleanup();
        if (typeof showToast === 'function') showToast("❌ Ошибка генерации. Попробуйте режим Печати.");
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

    historyToExport.sort((a, b) => new Date(a.date) - new Date(b.date));

    const stats = {
        checks: historyToExport.length,
        photos: countPhotos(historyToExport),
        twi: customTwiCards.length,
        tmpl: Object.keys(userTemplates).length
    };

    // ДОБАВЛЕНЫ HR ДАННЫЕ ДЛЯ ПАНЕЛИ РУКОВОДИТЕЛЯ
    // ДОБАВЛЕНЫ HR ДАННЫЕ ДЛЯ ПАНЕЛИ РУКОВОДИТЕЛЯ (С Совещаниями и FMEA)
    const hrData = {
        weeklyPlanData: typeof weeklyPlanData !== 'undefined' ? weeklyPlanData : null,
        engineerAbsence: typeof engineerAbsence !== 'undefined' ? engineerAbsence : null,
        contractorStatuses: typeof contractorStatuses !== 'undefined' ? contractorStatuses : null,
        schedule: typeof window.rbi_scheduleData !== 'undefined' ? window.rbi_scheduleData : [],
        interventions: typeof window.rbi_interventionsData !== 'undefined' ? window.rbi_interventionsData : [],
        practices: typeof window.rbi_practicesData !== 'undefined' ? window.rbi_practicesData : [],
        meetings: typeof window.rbi_meetingsData !== 'undefined' ? window.rbi_meetingsData : [],
        fmea: typeof window.rbi_fmeaRecords !== 'undefined' ? window.rbi_fmeaRecords : [],
        // --- ДОБАВЛЕНО ДЛЯ ПК СК ---
        skRecords: typeof window.skRecords !== 'undefined' ? window.skRecords : [],
        skVolumes: typeof window.skVolumes !== 'undefined' ? window.skVolumes : {},
        skContractorMap: typeof window.skContractorMap !== 'undefined' ? window.skContractorMap : {}
    };

    const obj = {
        type: "RBI_FULL_BACKUP",
        version: "17.4",
        timestamp: new Date().toISOString(),
        mode: mode,
        data: {
            history: historyToExport, 
            etalonActs: typeof etalonActsArray !== 'undefined' ? etalonActsArray : [], // НОВОЕ
            tasks: typeof rbi_tasksData !== 'undefined' ? rbi_tasksData : [],          // НОВОЕ
            templates: userTemplates, 
            twi: customTwiCards,      
            docs: userDocsToExport,   
            nodes: typeof customNodes !== 'undefined' ? customNodes : [],
            expert: customExpertConclusions, 
            gameLogs: typeof gameActionLogs !== 'undefined' ? gameActionLogs : [],
            hr: hrData
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
            let addedHist = 0, addedTmpl = 0, addedTwi = 0, addedDocs = 0;

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
                
                // ИМПОРТ HR ДАННЫХ И НОВЫХ МОДУЛЕЙ
                if (parsed.data.hr) {
                    if (parsed.data.hr.weeklyPlanData && typeof weeklyPlanData !== 'undefined') weeklyPlanData = parsed.data.hr.weeklyPlanData;
                    if (parsed.data.hr.engineerAbsence && typeof engineerAbsence !== 'undefined') engineerAbsence = parsed.data.hr.engineerAbsence;
                    
                    if (parsed.data.hr.contractorStatuses && typeof contractorStatuses !== 'undefined') {
                        for (let k in parsed.data.hr.contractorStatuses) {
                            if (!contractorStatuses[k]) contractorStatuses[k] = parsed.data.hr.contractorStatuses[k];
                        }
                    }

                    // Импорт Совещаний
                    if (parsed.data.hr.meetings && typeof window.rbi_meetingsData !== 'undefined') {
                        for (const item of parsed.data.hr.meetings) {
                            if (!window.rbi_meetingsData.find(x => x.id === item.id)) {
                                window.rbi_meetingsData.push(item);
                                await dbPut(STORES.MEETINGS, item);
                            }
                        }
                    }

                    // Импорт FMEA
                    if (parsed.data.hr.fmea && typeof window.rbi_fmeaRecords !== 'undefined') {
                        for (const item of parsed.data.hr.fmea) {
                            if (!window.rbi_fmeaRecords.find(x => x.id === item.id)) {
                                window.rbi_fmeaRecords.push(item);
                                await dbPut(STORES.FMEA, item);
                            }
                        }
                    }

                    // <-- НОВОЕ: Импорт Воздействий (Интервенций)
                    if (parsed.data.hr.interventions && typeof window.rbi_interventionsData !== 'undefined') {
                        for (const item of parsed.data.hr.interventions) {
                            if (!window.rbi_interventionsData.find(x => x.id === item.id)) {
                                window.rbi_interventionsData.push(item);
                                await dbPut(STORES.INTERVENTIONS, item);
                            }
                        }
                    }

                    // <-- НОВОЕ: Импорт Практик
                    if (parsed.data.hr.practices && typeof window.rbi_practicesData !== 'undefined') {
                        for (const item of parsed.data.hr.practices) {
                            if (!window.rbi_practicesData.find(x => x.id === item.id)) {
                                window.rbi_practicesData.push(item);
                                await dbPut(STORES.PRACTICES, item);
                            }
                        }
                    }

                    // <-- НОВОЕ: Импорт Графика СМР
                    if (parsed.data.hr.schedule && typeof window.rbi_scheduleData !== 'undefined') {
                        for (const item of parsed.data.hr.schedule) {
                            if (!window.rbi_scheduleData.find(x => x.id === item.id)) {
                                window.rbi_scheduleData.push(item);
                                await dbPut(STORES.SCHEDULE, item);
                            }
                        }
                    }
                }
                // <-- НОВОЕ: Импорт данных ПК СК
                    if (parsed.data.hr.skRecords && typeof window.skRecords !== 'undefined') {
                        for (const item of parsed.data.hr.skRecords) {
                            if (!window.skRecords.find(x => x.id === item.id)) {
                                window.skRecords.push(item);
                                await dbPut(STORES.SK_RECORDS, item);
                            }
                        }
                    }
                    if (parsed.data.hr.skVolumes && typeof window.skVolumes !== 'undefined') {
                        for (const key in parsed.data.hr.skVolumes) {
                            window.skVolumes[key] = parsed.data.hr.skVolumes[key];
                        }
                        await dbPut(STORES.SETTINGS, { key: 'sk_volumes', data: window.skVolumes });
                    }
                    if (parsed.data.hr.skContractorMap && typeof window.skContractorMap !== 'undefined') {
                        for (const key in parsed.data.hr.skContractorMap) {
                            window.skContractorMap[key] = parsed.data.hr.skContractorMap[key];
                        }
                        await dbPut(STORES.SETTINGS, { key: 'sk_contractor_map', data: window.skContractorMap });
                    }
                // <-- НОВОЕ: ИМПОРТ ЗАДАЧ ПЛАНИРОВЩИКА
                if (parsed.data.tasks && typeof window.rbi_tasksData !== 'undefined') {
                    for (const item of parsed.data.tasks) {
                        if (!window.rbi_tasksData.find(x => x.id === item.id)) {
                            window.rbi_tasksData.push(item);
                            await dbPut(STORES.TASKS, item);
                        }
                    }
                }

                // <-- НОВОЕ: ИМПОРТ ЭТАЛОНОВ
                if (parsed.data.etalonActs && typeof etalonActsArray !== 'undefined') {
                    for (const item of parsed.data.etalonActs) {
                        if (!etalonActsArray.find(x => x.id === item.id)) {
                            etalonActsArray.push(item);
                            await dbPut(STORES.ETALON_ACTS, item);
                        }
                    }
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

window.exportPersonalContractorReport = async function(contractorName) {
    const data = getFilteredAnalyticsData().filter(c => c.contractorName + ' [' + (c.projectName || 'Без объекта') + ']' === contractorName);
    if (data.length === 0) return showToast('Нет данных для отчета');
    if (data.length < 7) return showToast('Слишком мало данных для отчета. Проведите минимум 7 проверок.');
    
    showToast("⚙️ Подготовка персонального отчета...");

    const cName = contractorName.split(' [')[0];
    const workType = data[0].templateTitle;
    
    const m = getContractorMetrics(data, userTemplates);
    const colorMain = m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a');
    const bgMain = m.finalC < 70 ? '#fef2f2' : (m.finalC < 85 ? '#fffbeb' : '#f0fdf4');
    const borderMain = m.finalC < 70 ? '#fca5a5' : (m.finalC < 85 ? '#fde68a' : '#bbf7d0');

    const dates = []; const urkData = [];
    data.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach((check, i) => {
        dates.push(`#${i+1}`); urkData.push(check.metrics.final);
    });

    const lineChartUrl = generatePdfChart({
        type: 'line',
        data: { labels: dates, datasets: [{ data: urkData, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', tension: 0.3, borderWidth: 2, fill: true, pointRadius: 2 }] },
        options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
    }, 600, 200);

    let photosB3 = []; let photosB2 = []; let photosOK = [];
    let b1 = 0, b2 = 0, b3 = 0;
    data.forEach(check => {
        if(check.metrics) { b1 += check.metrics.n_B1_fail; b2 += check.metrics.n_B2_fail; b3 += check.metrics.n_B3_fail; }
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

    let expertHtml = getExpertConclusion(m, cName, workType, data.length, contractorName.replace(/\W/g, '_'), customExpertConclusions).pdfHtml;
    expertHtml = expertHtml.replace(/font-size:\s*1[234]px/g, 'font-size: 11px').replace(/margin-bottom:\s*1[05]px/g, 'margin-bottom: 8px');

    const content = `
    <div class="no-break" style="border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0 0 5px 0; font-size: 24px; color: #0f172a; text-transform: uppercase;">Отчет о качестве СМР: ${cName}</h1>
        <div style="font-size: 14px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Вид работ: ${workType} | Объект: ${contractorName.split(' [')[1].replace(']','')}</div>
    </div>

    <table class="no-break" style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="width: 25%; padding: 0 8px 0 0;">
                <div style="background: ${bgMain}; border: 2px solid ${borderMain}; border-radius: 12px; padding: 15px; text-align: center; height: 110px; box-sizing: border-box;">
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900; margin-bottom: 8px;">Рейтинг Надежности</div>
                    <div style="font-size: 32px; font-weight: 900; color: ${colorMain}; line-height: 1;">${m.finalC}%</div>
                </div>
            </td>
            <td style="width: 20%; padding: 0 8px;">
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; text-align: center; height: 110px; box-sizing: border-box;">
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">Ср. УрК Изделий</div>
                    <div style="font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1;">${m.baseUrkContrPerc}%</div>
                </div>
            </td>
            <td style="width: 20%; padding: 0 8px;">
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; text-align: center; height: 110px; box-sizing: border-box;">
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">Стабильность</div>
                    <div style="font-size: 24px; font-weight: 900; color: ${m.stabColor}; line-height: 1;">${m.stabilityIndex}</div>
                </div>
            </td>
            <td style="width: 35%; padding: 0 0 0 8px;">
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px; height: 110px; box-sizing: border-box;">
                    <div style="font-size: 10px; color: #0f172a; text-transform: uppercase; font-weight: bold; text-align:center;">Динамика проверок</div>
                    <div style="height: 70px; text-align: center; margin-top: 5px;"><img src="${lineChartUrl}" style="width: 100%; height: 100%; object-fit: contain;"></div>
                </div>
            </td>
        </tr>
    </table>

    <table style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="width: 40%; vertical-align: top; padding-right: 15px;">
                ${expertHtml}
                <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-top: 15px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #334155;">Статистика дефектов</h3>
                    <div style="font-size: 14px; font-weight: bold;">Всего проверок: ${m.count}</div>
                    <div style="margin-top: 10px; display:flex; justify-content: space-between; font-size:12px; font-weight:bold;">
                        <span style="color:#3b82f6">B1: ${b1} шт.</span>
                        <span style="color:#d97706">B2: ${b2} шт.</span>
                        <span style="color:#dc2626">B3: ${b3} шт.</span>
                    </div>
                </div>
            </td>
            <td style="width: 60%; vertical-align: top; padding: 0;">
                ${buildPhotoGridHTML(photosB3, '🚨 Критические нарушения (B3)', '#dc2626', '#fca5a5', '#fef2f2', 3, 'script')}
                ${buildPhotoGridHTML(photosB2, '⚠️ Системные дефекты (B2)', '#d97706', '#fdba74', '#fff7ed', 3, 'script')}
                ${buildPhotoGridHTML(photosOK, '✅ Принятые работы (OK)', '#16a34a', '#bbf7d0', '#f0fdf4', 3, 'script')}
            </td>
        </tr>
    </table>
    `;

    await printPdfShell(`Отчет для ${cName}`, content, "A4", "landscape", "script");
    if (typeof gameLogAction === 'function') gameLogAction('ai_copy', 'sent_report'); 
};

window.promptMeetingAfterReport = function() {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200">📅</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Отчет сформирован!</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[12px] text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            Данные по объекту собраны. Хотите перейти к формированию протокола (Мемо) для еженедельного совещания с подрядчиками? Система автоматически подтянет все нерешенные задачи и дефекты.
        </div>
        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm">
                Позже
            </button>
            <button onclick="closeModal(); startMeetingFlow();" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">
                Начать совещание
            </button>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

window.startMeetingFlow = function() {
    // 1. Перекидываем пользователя на вкладку Инженера
    switchTab('tab-engineer');
    // 2. Переключаем на подвкладку Совещаний
    const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
    if (btns[2]) rbi_switchEngineerSubTab('eng-sub-meetings', btns[2]);
    // 3. Открываем рабочую область совещания
    setTimeout(() => { rbi_createMeeting(); }, 300);
};

// ============================================================================
// НОВЫЙ МОДУЛЬ: КОНСОЛИДИРОВАННЫЙ ОТЧЕТ КО ДНЮ КАЧЕСТВА (Мега-отчет)
// ============================================================================

window.rbi_generateQualityDayReport = async function(taskId) {
    if (!appSettings.aiEnabled) {
        showToast("⚠️ Для формирования отчета Дня Качества требуется включить DeepSeek AI в настройках!");
        return;
    }

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = `<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200 animate-pulse">🤖</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Сборка Дня Качества</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="flex flex-col items-center justify-center py-4">
            <div class="text-[11px] font-bold text-slate-500 text-center space-y-2">
                <div>📥 Агрегируем метрики подрядчиков...</div>
                <div>📊 Рассчитываем Impact Score команды...</div>
                <div>🏆 Выбираем лучшие практики месяца...</div>
                <div class="text-indigo-600 font-black mt-2">DeepSeek пишет управленческое резюме...</div>
            </div>
        </div>
    `;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // 1. БАЗА ПРОВЕРОК
        const currentData = contractorArray.filter(c => new Date(c.date) >= startOfMonth && new Date(c.date) <= endOfMonth);
        const prevData = contractorArray.filter(c => new Date(c.date) >= prevMonthStart && new Date(c.date) <= prevMonthEnd);
        
        let sumUrk = 0; currentData.forEach(i => { if(i.metrics) sumUrk += i.metrics.final; });
        const currAvgUrk = currentData.length > 0 ? Math.round(sumUrk / currentData.length) : 0;
        
        const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(currentData, userTemplates) : null;
        const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
        const redZone = currIntMetrics ? currIntMetrics.redZonePerc : 0;

        // 2. HR МЕТРИКИ (КОМАНДА)
        let hrStats = [];
        if (typeof gameCalculateManagerMetrics === 'function') hrStats = gameCalculateManagerMetrics();
        let totalImpact = 0; let totalInterventions = 0;
        hrStats.forEach(h => { totalImpact += h.avgImpact; totalInterventions += (h.improved + h.degraded); });
        const avgTeamImpact = hrStats.length > 0 ? (totalImpact / hrStats.length) : 0;
        const bestEng = hrStats.length > 0 ? hrStats.sort((a,b) => b.pi - a.pi)[0] : { name: "Нет данных" };
        // СБОР ФОТОГРАФИЙ С СОВЕЩАНИЙ ЗА МЕСЯЦ
        const monthMeetings = window.rbi_meetingsData.filter(m => new Date(m.date) >= startOfMonth && m.qDayPhoto);
        let meetingPhotosHtml = '';
        if (monthMeetings.length > 0) {
            meetingPhotosHtml = `
            <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; margin-top: 20px;">📸 Жизнь объекта (Совещания и обходы)</h2>
            <table style="width: 100%; border-spacing: 10px 0; border-collapse: separate; margin-left:-10px;">
                <tr>
                    ${monthMeetings.slice(0, 3).map(m => `
                        <td style="width:33.3%; vertical-align:top;">
                            <div style="height: 150px; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1;">
                                <img src="${window.getPhotoSrc(m.qDayPhoto)}" style="width:100%; height:100%; object-fit:cover;">
                            </div>
                            <div style="font-size:9px; color:#64748b; font-weight:bold; margin-top:4px; text-align:center;">${m.title}</div>
                        </td>
                    `).join('')}
                </tr>
            </table>`;
        }
        // 3. ТОП ПРАКТИК (Отбираем 2 лучшие)
        let topPracticesHtml = `<div style="color:#64748b; font-size:10px;">Практик в этом месяце не публиковалось.</div>`;
        if (typeof rbi_practicesData !== 'undefined' && rbi_practicesData.length > 0) {
            const topPrac = [...rbi_practicesData].filter(p => new Date(p.date) >= startOfMonth).sort((a,b) => b.deltaUrk - a.deltaUrk).slice(0, 2);
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
        const promptSystem = `Ты — Директор по качеству (CQC). Сформируй официальное управленческое резюме для отчета "День Качества" за месяц.
        Тон: деловой, объективный, строгий. Формат: текст, разбитый на абзацы. Без воды.
        Отрази 3 вещи: 1. Оценку ИКО и тренда. 2. Оценку работы инженеров (Impact Score). 3. Главный риск следующего месяца.`;
        
        const promptUser = `ИКО: ${IKO}. Красная зона: ${redZone}%. Средний Impact команды: ${avgTeamImpact.toFixed(2)}. Проверок за месяц: ${currentData.length}. ТОП проблема: ${sortedCauses.length > 0 ? sortedCauses[0] : 'Нет данных'}.`;

        const aiSummary = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 800 });

        closeModal();

        // 6. СБОРКА HTML ДЛЯ ПЕЧАТИ (ОТКРЫВАЕТСЯ СРАЗУ В PDF ОБОЛОЧКЕ)
        const pdfContent = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 24pt; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">КОНСОЛИДИРОВАННЫЙ ОТЧЕТ КО ДНЮ КАЧЕСТВА</h1>
                <div style="font-size: 14pt; color: #4f46e5; font-weight: 900; margin-top: 5px; text-transform:uppercase;">ИТОГИ МЕСЯЦА: ${now.toLocaleString('ru-RU', {month: 'long', year: 'numeric'})}</div>
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
                        <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">🏆 Лучшие практики месяца</h2>
                        ${topPracticesHtml}
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <h2 style="font-size: 14pt; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">🏆 Лучшие практики месяца</h2>
                        ${topPracticesHtml}
                        ${meetingPhotosHtml} <!-- ВСТАВИЛИ ФОТО С СОВЕЩАНИЙ -->
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

        // Закрываем задачу (Если она была)
        if (taskId) {
            const task = window.rbi_tasksData.find(t => t.id === taskId);
            if(task) { 
                task.status = 'done'; task.resultComment = 'Отчет сгенерирован'; 
                await dbPut(STORES.TASKS, task); 
            }
        }

        printPdfShell(`День Качества ${now.toLocaleString('ru-RU', {month:'long'})}`, pdfContent, "A4", "landscape", "browser");

    } catch (e) {
        closeModal();
        showToast("❌ Ошибка сборки отчета: " + e.message);
    }
};

// --- НОВЫЙ БЛОК: Безопасная загрузка фото перед печатью ---

// Интеллектуальный загрузчик фото для PDF (прямое чтение из базы)
async function resolveLocalPhotosForPdf(container) {
    const images = Array.from(container.querySelectorAll('img'));
    const promises = [];

    for (let img of images) {
        let src = img.getAttribute('data-local-src') || img.getAttribute('src');
        if (!src || src.startsWith('data:')) continue;

        // 1. Находим, как файл записан в базе данных (по реверс-кэшу)
        if (src.startsWith('blob:') && typeof PhotoManager !== 'undefined' && PhotoManager.reverseCache && PhotoManager.reverseCache[src]) {
            src = PhotoManager.reverseCache[src];
        }

        promises.push((async () => {
            try {
                let base64 = null;
                
                // 2. Идеальный сценарий: извлекаем напрямую из БД телефона (МОМЕНТАЛЬНО)
                if ((src.startsWith('local://') || src.startsWith('cloud://') || src.startsWith('http')) && typeof PhotoManager !== 'undefined') {
                    base64 = await PhotoManager.getBase64(src);
                }

                // 3. Запасной план: если это всё еще неизвестный blob (из памяти)
                if (!base64 && src.startsWith('blob:')) {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    base64 = await new Promise(r => {
                        const reader = new FileReader();
                        reader.onloadend = () => r(reader.result);
                        reader.readAsDataURL(blob);
                    });
                }

                // Вставляем чистый код картинки
                if (base64 && base64.startsWith('data:')) {
                    img.src = base64;
                    img.removeAttribute('data-local-src');
                } else {
                    throw new Error("Не удалось получить base64");
                }
            } catch(e) {
                console.warn('[PDF] Фото пропущено:', src, e);
                // Заглушка, чтобы программа не зависла навсегда
                img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="%23f1f5f9"/></svg>';
            }
        })());
    }

    // Защита от бесконечного ожидания (максимум 15 секунд)
    await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 15000))
    ]);
}

// Ждет, пока браузер физически отрисует все картинки
async function waitForPdfImages(container, maxMs = 4000) {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) return;

    const promises = images.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    });

    await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, maxMs))
    ]);
    
    // Даем процессору 300 мс на рендер
    await new Promise(r => setTimeout(r, 300));
}

// Ждет, пока браузер физически отрисует все картинки
async function waitForPdfImages(container, maxMs = 5000) {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) return;

    const promises = images.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
            // Принудительная распаковка фото в видеопамять (критично для iPhone)
            if (img.decode) {
                img.decode().then(resolve).catch(() => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            } else {
                img.onload = resolve;
                img.onerror = resolve;
            }
        });
    });

    await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, maxMs))
    ]);
    
    // Даем процессору телефона 800 мс, чтобы гарантированно нарисовать всё на канвасе
    await new Promise(r => setTimeout(r, 800));
}