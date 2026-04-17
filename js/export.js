/* Файл: js/export.js */
// === МОДУЛЬ ГЕНЕРАЦИИ ОТЧЕТОВ (PDF, CSV, ПАСПОРТА) ===

// 1. Главный обработчик всплывающего меню выгрузки
function handleFabExportAction(actionType) {
    closeFabExportMenu();
    const data = getFilteredAnalyticsData();
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    setTimeout(() => {
        if (actionType === 'current') {
            exportPdfContractorsCurrent(data);
        } else if (actionType === 'full_report') {
            exportPdfFullObjectReport(data);
        } else if (actionType === 'poster') {
            exportPdfPoster('A3');
        }
    }, 350);
}

// 2. Выгрузка текущего среза подрядчиков (А4)
function exportPdfContractorsCurrent(data) {
    const grouped = {};
    data.forEach(item => { grouped[item.contractorName] = grouped[item.contractorName] || []; grouped[item.contractorName].push(item); });

    const cList = [];
    for(let cName in grouped) {
        const m = getContractorMetrics(grouped[cName], userTemplates);
        if (m) cList.push({ name: cName, metrics: m, workType: grouped[cName][0].templateTitle });
    }
    cList.sort((a,b) => b.metrics.finalC - a.metrics.finalC);

    let rowsHtml = cList.map((c, i) => {
        const m = c.metrics;
        const color = m.finalC < 70 ? '#ef4444' : (m.finalC < 85 ? '#f59e0b' : '#22c55e');
        return `
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: white; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                <div>
                    <div style="font-size: 16px; font-weight: bold; color: #0f172a;">${i+1}. ${c.name}</div>
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">${c.workType}</div>
                </div>
                <div style="font-size: 24px; font-weight: 900; color: ${color};">${m.count < 7 ? 'Сбор' : m.finalC + '%'}</div>
            </div>
            <table style="width: 100%; text-align: center; font-size: 11px; border: none;">
                <tr>
                    <td><div style="color: #64748b;">Проверок</div><div style="font-weight: bold; font-size:14px;">${m.count}</div></td>
                    <td><div style="color: #64748b;">Стабильность</div><div style="font-weight: bold; font-size:14px; color:${m.stabColor};">${m.count < 7 ? '-' : m.stabilityIndex}</div></td>
                    <td><div style="color: #64748b;">Изделий с B3</div><div style="font-weight: bold; font-size:14px; color: ${m.n_изделий_с_B3 > 0 ? '#ef4444' : '#22c55e'};">${m.n_изделий_с_B3}</div></td>
                </tr>
            </table>
        </div>`;
    }).join('');

    const content = `
        <h2 class="section-title">Текущий срез подрядчиков</h2>
        <div style="margin-bottom: 15px; font-size: 12px; color: #64748b;">Сформировано на основе фильтров (${data.length} проверок)</div>
        ${rowsHtml}
    `;
    printPdfShell("Рейтинг: Подрядчики", content, "A4");
}

//Сводный отчет для руководителя (One-Pager)

// 6. Сводный отчет для руководителя (One-Pager - Формат А3 Альбомный)
function exportPdfOnePager(data) {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    // 1. Читаем данные шапки
    const projName = document.getElementById('inp-project')?.value || 'Не указан';
    const inspName = document.getElementById('inp-inspector')?.value || 'Не указан';

    // 2. Считаем метрики ТЕКУЩЕГО периода
    let sumUrk = 0; let sumB3 = 0;
    data.forEach(i => { if(i.metrics) { sumUrk += i.metrics.final; sumB3 += i.metrics.n_B3_fail; } });
    const currAvgUrk = data.length > 0 ? Math.round(sumUrk / data.length) : 0;
    
    const groupedC = {};
    data.forEach(item => { groupedC[item.contractorName] = groupedC[item.contractorName] || []; groupedC[item.contractorName].push(item); });
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

    // 3. Считаем метрики ПРОШЛОГО периода (для трендов)
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

    // ХЕЛПЕР ДЛЯ ТРЕНДОВ
    const renderPdfTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === "" || isNaN(prev)) {
            return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:10px; font-weight:bold; background:#f1f5f9; padding:2px 4px; border-radius:4px;">Нет базы</span></div>`;
        }
        let diff = parseFloat(curr) - parseFloat(prev);
        if (Math.abs(diff) < 0.01) {
            return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:14px; font-weight:900;">▬ 0</span><div style="font-size:8px; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
        }
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626'; 
        const sign = diff > 0 ? '▲' : '▼';
        return `<div style="text-align:right;"><span style="color:${color}; font-size:16px; font-weight:900;">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff)?0:2)}</span><div style="font-size:8px; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
    };

    // 4. Фотографии дефектов
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

    const renderPhotoCards = (arr, isCrit) => {
        while(arr.length < 5) { arr.push({ empty: true }); }
        return `<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; height:100%;">
            ${arr.map(d => {
                if (d.empty) return `<div style="border:1px dashed #cbd5e1; border-radius:6px; opacity:0.3; background:#f8fafc; height:100%;"></div>`;
                const imgHtml = d.photo ? `<img src="${d.photo}" style="width:100%; height:110px; object-fit:cover; border-bottom:1px solid #e2e8f0;">` : `<div style="width:100%; height:110px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#cbd5e1; font-size:10px; border-bottom:1px solid #e2e8f0;">НЕТ ФОТО</div>`;
                const badgeColor = isCrit ? '#dc2626' : '#d97706';
                const badgeBg = isCrit ? '#fef2f2' : '#fff7ed';
                return `
                <div style="background:white; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden; display:flex; flex-direction:column; height:100%;">
                    ${imgHtml}
                    <div style="padding:6px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                        <div style="font-size:9px; font-weight:bold; color:#0f172a; line-height:1.2; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${d.name}</div>
                        <div>
                            <div style="font-size:8px; color:#64748b; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">👤 ${d.contr}</div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="background:${badgeBg}; color:${badgeColor}; font-size:8px; font-weight:900; padding:2px 4px; border-radius:4px; border:1px solid ${badgeColor};">${isCrit ? 'B3' : 'B2'}</span>
                                <span style="font-size:9px; font-weight:900; color:#475569;">${d.count} шт</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    };

    // 5. Забираем графики
    const cSpark = document.getElementById('op-sparkline-chart');
    const imgSpark = cSpark ? `<img style="width:100%; height:55px; object-fit:fill; opacity:0.8;" src="${cSpark.toDataURL('image/png')}">` : '';

    const cMom = document.getElementById('op-mom-bar-chart');
    const imgMom = cMom ? `<img style="max-width:100%; height:130px; object-fit:contain;" src="${cMom.toDataURL('image/png')}">` : '';

    const pdcaTextRaw = document.getElementById('hidden_pdca_text')?.value || "Нет данных для формирования решения.";
    const pdfFormattedText = pdcaTextRaw.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: bold; color: #854d0e; text-transform: uppercase; margin-top: 10px; margin-bottom: 4px;">$1</div>').replace(/\n/g, '<br>');
    const periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';

    // 6. Подготовка рейтингов (Две колонки)
    const top5 = ratingData.slice(0, 5);
    const bottom5 = ratingData.length > 5 ? ratingData.slice(-5).reverse() : [];

    const renderMiniRow = (r) => `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom: 6px; padding: 6px; background: white; border: 1px solid #e2e8f0; border-radius: 4px;">
            <div style="flex:1; font-size:11px; font-weight:bold; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.name}</div>
            <div style="width:30px; text-align:right; font-size:12px; font-weight:900; color:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')};">
                ${r.isPrelim ? '<span style="font-size:8px;">⚠️</span>' : ''}${r.val}%
            </div>
        </div>`;

    // 7. СБОРКА СТРАНИЦЫ
    const content = `
        <style>
            .header { display: none !important; } /* Жестко отключаем системную шапку A4 */
            @page { margin: 6mm; } /* Максимум места для А3 */
            .main-wrapper { display: flex; flex-direction: column; width: 100%; height: 280mm; box-sizing: border-box; } 
        </style>
        
        <div class="main-wrapper">
            <!-- 1. НОВАЯ ШАПКА -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1e293b; padding-bottom:8px; margin-bottom:15px; flex-shrink: 0;">
                <div>
                    <h1 style="font-size:24px; margin:0; color:#0f172a; text-transform:uppercase;">Сводный статус объекта: ${projName} | Инженер: ${inspName}</h1>
                    <div style="font-size:14px; font-weight:bold; color:#4f46e5; margin-top:4px;">Период: ${periodText}</div>
                </div>
                <div style="text-align:right; font-size:12px; color:#64748b; line-height:1.4;">
                    Сформировано: <b>${new Date().toLocaleString('ru-RU')}</b> | RBI Quality<br>
                    База: <b>${data.length} независимых проверок</b>
                </div>
            </div>
            
            <!-- 2. ДВЕ КОЛОНКИ -->
            <div style="display: flex; gap: 20px; flex: 1; align-items: stretch; overflow: hidden;">
                
                <!-- ЛЕВАЯ КОЛОНКА (45%) -->
                <div style="width: 45%; display: flex; flex-direction: column; gap: 15px;">
                    
                    <!-- 2.1 Ключевые метрики (Сетка 2x3) -->
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; flex-shrink: 0;">
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1;">${currAvgUrk}%</span>
                                ${renderPdfTrend(currAvgUrk, prevAvgUrk, trendLabel)}
                            </div>
                        </div>
                        <div style="background: ${parseFloat(mData.IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 12px; border-radius: 8px; border: 1px solid ${parseFloat(mData.IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска (ИКО)</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 32px; font-weight: 900; color: ${pdfIkoColor}; line-height: 1;">${mData.IKO}</span>
                                ${renderPdfTrend(mData.IKO, prevIko, trendLabel, true)}
                            </div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1;">${data.length}</span>
                                ${renderPdfTrend(data.length, prevChecks, trendLabel)}
                            </div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Подрядчиков</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px;">
                                <span style="font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1;">${currContractorsCount}</span>
                                ${renderPdfTrend(currContractorsCount, prevContrsCount, trendLabel)}
                            </div>
                        </div>
                        <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fecaca; position: relative;">
                            <div style="font-size: 10px; color: #991b1b; text-transform: uppercase; font-weight: 900;">Работ в красной зоне</div>
                            <div style="font-size: 32px; font-weight: 900; color: #dc2626; margin-top: 5px; line-height: 1;">${mData.redZonePerc}%</div>
                            <div style="font-size: 9px; color: #b91c1c; margin-top: 5px; font-weight:bold;">ОТ ОБЪЕМА</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; position: relative; overflow:hidden;">
                            <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900; z-index: 10; position: relative;">Тренд УрК (6 нед)</div>
                            <div style="position: absolute; bottom: 0; left: 0; right: 0;">${imgSpark}</div>
                        </div>
                    </div>

                    <!-- 2.2 График MoM -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; flex-shrink: 0;">
                        <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 5px;">📊 Базовый УрК: Динамика М/М</div>
                        ${imgMom ? `<img style="max-width:100%; height:130px; object-fit:contain;" src="${cMom.toDataURL('image/png')}">` : '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}
                    </div>

                    <!-- 2.3 Рейтинг (Две колонки) -->
                    <div style="flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; overflow: hidden;">
                        <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; text-align: center;">🏆 Рейтинг Подрядчиков (Интегральный УрК)</div>
                        <div style="display: flex; gap: 15px; flex: 1;">
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <div style="font-size:11px; color:#16a34a; font-weight:bold; margin-bottom:6px; text-transform:uppercase; border-bottom:2px solid #bbf7d0; padding-bottom:4px;">Лидеры</div>
                                ${top5.length > 0 ? top5.map(renderMiniRow).join('') : '<div style="font-size:10px; color:#94a3b8;">Нет данных</div>'}
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <div style="font-size:11px; color:#dc2626; font-weight:bold; margin-bottom:6px; text-transform:uppercase; border-bottom:2px solid #fecaca; padding-bottom:4px;">Аутсайдеры</div>
                                ${bottom5.length > 0 ? bottom5.map(renderMiniRow).join('') : '<div style="font-size:10px; color:#94a3b8;">Нет данных</div>'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА (55%) -->
                <div style="width: 55%; display: flex; flex-direction: column; gap: 15px;">
                    
                    <!-- 3.1 ТОП B3 -->
                    <div style="flex: 0 0 35%; background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 12px; display: flex; flex-direction: column;">
                        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #dc2626; text-transform: uppercase;">🚨 ТОП-5 Критических дефектов (B3)</h3>
                        <div style="flex: 1; min-height: 0;">${renderPhotoCards(topB3, true)}</div>
                    </div>

                    <!-- 3.2 ТОП B2 -->
                    <div style="flex: 0 0 35%; background: #fffbeb; border: 2px solid #fde68a; border-radius: 8px; padding: 12px; display: flex; flex-direction: column;">
                        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #d97706; text-transform: uppercase;">🔄 ТОП-5 Повторяющихся нарушений (B2)</h3>
                        <div style="flex: 1; min-height: 0;">${renderPhotoCards(topB2, false)}</div>
                    </div>

                    <!-- 3.3 Решение -->
                    <div style="flex: 1; background: ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; overflow: hidden;">
                        <h3 style="margin: 0 0 10px 0; font-size: 13px; color: ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#b45309' : '#166534'}; text-transform: uppercase; border-bottom: 2px solid ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#fde047' : '#86efac'}; padding-bottom: 5px;">🎯 Управленческое Решение и Риски</h3>
                        <div style="font-size: 12px; line-height: 1.5; color: #1e293b; overflow-y: hidden;">
                            ${pdfFormattedText}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
    
    // Вызываем оболочку, принудительно передавая ей формат A3 (он автоматически делает альбомную ориентацию)
    printPdfShell("Сводка для Руководства", content, "A3");
}

// 3. Выгрузка полного отчета (Паспорта всех подрядчиков списком)
function exportPdfFullObjectReport(data) {
    const grouped = {};
    data.forEach(c => {
        if(!grouped[c.contractorName]) grouped[c.contractorName] = [];
        grouped[c.contractorName].push(c);
    });

    const tenderData = [];
    for(let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) {
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

                let rec = "РЕКОМЕНДОВАН"; let recClass = "text-green-600"; let recDesc = "Подрядчик стабилен и показывает высокое качество работ.";
                if (m.finalC < 70 || m.rateB3 >= 20) {
                    rec = "НЕ РЕКОМЕНДОВАН"; recClass = "text-red-600"; 
                    recDesc = "Подрядчик имеет недопустимый уровень критического брака и низкую оценку. Высокие риски для компании.";
                } else if (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60) {
                    rec = "ДОПУСТИМ С ОГРАНИЧЕНИЯМИ"; recClass = "text-orange-500";
                    recDesc = "Подрядчик выполняет работы удовлетворительно, но имеет нестабильный процесс или допускал критические дефекты B3.";
                }

                tenderData.push({
                    name: cName, proj: cData[0].projectName || 'Текущий фильтр',
                    workType: cData[0].templateTitle,
                    metrics: m, causes: causes, totalFails: totalFails,
                    rec: rec, recClass: recClass, recDesc: recDesc,
                    periodStart: new Date(cData.sort((a,b)=>new Date(a.date)-new Date(b.date))[0].date).toLocaleDateString('ru-RU'),
                    periodEnd: new Date(cData.sort((a,b)=>new Date(b.date)-new Date(a.date))[0].date).toLocaleDateString('ru-RU')
                });
            }
        }
    }
    tenderData.sort((a,b) => b.metrics.finalC - a.metrics.finalC);
    
    if (tenderData.length === 0) return showToast("Недостаточно данных для отчета (нужно мин. 3 проверки на подрядчика).");

    let content = '';
    tenderData.forEach((d, index) => {
        let causesHtml = '';
        if (d.totalFails > 0) {
            const sortedCauses = Object.keys(d.causes).sort((a,b) => d.causes[b] - d.causes[a]).slice(0, 3);
            causesHtml = sortedCauses.map(code => {
                const name = DEFECT_CAUSES.find(c => c.code === code)?.name || 'Иное';
                const perc = Math.round((d.causes[code] / d.totalFails) * 100);
                return `<div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:4px;"><span><b>${code}</b> – ${name}</span><span style="font-weight:bold; color:#475569;">${perc}%</span></div>`;
            }).join('');
        } else {
            causesHtml = `<div style="color:#16a34a; font-weight:bold; font-size:12px;">Дефектов не зафиксировано</div>`;
        }

        const mainColor = d.metrics.finalC < 70 ? '#ef4444' : (d.metrics.finalC < 85 ? '#f59e0b' : '#22c55e');
        const recBorderColor = d.metrics.finalC < 70 ? '#fca5a5' : (d.metrics.finalC < 85 ? '#fcd34d' : '#86efac');
        const recTextColor = d.metrics.finalC < 70 ? '#b91c1c' : (d.metrics.finalC < 85 ? '#b45309' : '#166534');
        const stabColor = d.metrics.stabilityIndex >= 80 ? '#16a34a' : (d.metrics.stabilityIndex >= 60 ? '#ca8a04' : (d.metrics.stabilityIndex >= 40 ? '#ea580c' : '#dc2626'));

        content += `
        <div style="page-break-after: ${index === tenderData.length - 1 ? 'auto' : 'always'}; margin-bottom: 20px;">
            <div style="border: 3px solid #1e293b; padding: 30px; border-radius: 12px; background: white; min-height: 900px;">
                <div style="text-align:center; border-bottom:2px solid #e2e8f0; padding-bottom:20px; margin-bottom:30px;">
                    <h1 style="margin:0 0 10px 0; color:#0f172a; font-size:28px; text-transform:uppercase; letter-spacing:1px;">ПАСПОРТ ПОДРЯДЧИКА</h1>
                    <div style="font-size:24px; font-weight:900; color:#4f46e5; margin-bottom:5px;">${d.name}</div>
                    <div style="font-size:14px; font-weight:bold; color:#64748b; margin-bottom:15px; text-transform:uppercase;">${d.workType}</div>
                    <div style="font-size:14px; color:#64748b; font-weight:bold; display:flex; justify-content:center; gap:20px;">
                        <span>Объект: <b style="color:#0f172a;">${d.proj}</b></span>
                        <span>Период: <b style="color:#0f172a;">${d.periodStart} – ${d.periodEnd}</b></span>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; padding:20px; border-radius:10px; margin-bottom:30px;">
                    <div>
                        <div style="font-size:12px; font-weight:bold; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Интегральный УрК</div>
                        <div style="font-size:48px; font-weight:900; color:${mainColor}; line-height:1;">${d.metrics.finalC}%</div>
                    </div>
                    <div style="width: 50%;">
                        <table style="width:100%; border-collapse:collapse; font-size:14px; border:none;">
                            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px 0; color:#64748b;">Средний балл проверок:</td><td style="padding:6px 0; text-align:right; font-weight:bold;">${d.metrics.baseUrkContrPerc}%</td></tr>
                            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px 0; color:#64748b;">Всего проверок:</td><td style="padding:6px 0; text-align:right; font-weight:bold;">${d.metrics.count}</td></tr>
                            <tr><td style="padding:6px 0; color:#64748b;">Проверок с B3:</td><td style="padding:6px 0; text-align:right; font-weight:bold; color:${d.metrics.rateB3 > 0 ? '#ef4444' : '#16a34a'};">${d.metrics.n_изделий_с_B3} (${d.metrics.rateB3.toFixed(1)}%)</td></tr>
                        </table>
                    </div>
                </div>
                <div style="display:flex; gap:20px; margin-bottom:30px;">
                    <div style="flex:1; background:white; border:1px solid #cbd5e1; padding:20px; border-radius:10px;">
                        <div style="font-size:11px; font-weight:bold; color:#0f172a; text-transform:uppercase; margin-bottom:15px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Профиль</div>
                        <div style="margin-bottom:10px;">
                            <div style="font-size:12px; color:#64748b; margin-bottom:2px;">Стабильность:</div>
                            <div style="font-size:16px; font-weight:900; color:${stabColor};">${d.metrics.stabilityIndex}% (${d.metrics.stabText})</div>
                        </div>
                        <div>
                            <div style="font-size:12px; color:#64748b; margin-bottom:2px;">Системный брак:</div>
                            <div style="font-size:14px; font-weight:bold; color:#0f172a;">Выявлен в ${d.metrics.maxFailRate.toFixed(1)}% проверок</div>
                        </div>
                    </div>
                    <div style="flex:1; background:white; border:1px solid #cbd5e1; padding:20px; border-radius:10px;">
                        <div style="font-size:11px; font-weight:bold; color:#0f172a; text-transform:uppercase; margin-bottom:15px; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Причины брака</div>
                        ${causesHtml}
                    </div>
                </div>
                <div style="background:#f8fafc; border:2px solid ${recBorderColor}; padding:20px; border-radius:10px;">
                    <div style="font-size:12px; font-weight:bold; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Заключение СК</div>
                    <div style="font-size:20px; font-weight:900; color:${recTextColor}; margin-bottom:10px;">${d.rec}</div>
                    <div style="font-size:14px; line-height:1.5; color:#334155;">${d.recDesc}</div>
                </div>
            </div>
        </div>`;
    });
    
    printPdfShell("Полный отчет по объекту", content, "A4");
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

// 5. Выгрузка: Плакат качества (А3/А1)
function exportPdfPoster(format) {
    const posterData = generatePosterData();
    if (!posterData || posterData.activeCount === 0) return showToast("За прошлую неделю нет проверок для плаката.");

    const renderCard = (c, isLeader) => {
        const photoHtml = c.bestPhoto && isLeader ? `<img src="${c.bestPhoto}" style="width:100%; height:160px; object-fit:cover; border-radius:6px; margin-top:10px;">` : 
                         (c.worstPhoto && !isLeader ? `<img src="${c.worstPhoto}" style="width:100%; height:160px; object-fit:cover; border-radius:6px; margin-top:10px;">` : '');
        
        const color = isLeader ? '#22c55e' : '#ef4444';
        const bg = isLeader ? '#f0fdf4' : '#fef2f2';
        const bd = isLeader ? '#bbf7d0' : '#fecaca';

        return `
        <div style="background: ${bg}; border: 2px solid ${bd}; padding: 15px; border-radius: 12px; margin-bottom: 15px; page-break-inside: avoid;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size: 16px; font-weight: 900; color: #0f172a;">${c.name}</div>
                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">${c.workType}</div>
                </div>
                <div style="font-size: 28px; font-weight: 900; color: ${color};">${c.metrics.finalC}%</div>
            </div>
            ${!isLeader && c.worstDefectName ? `<div style="margin-top:10px; font-size:11px; font-weight:bold; color:#991b1b; border-top:1px dashed ${bd}; padding-top:8px;">❌ Брак: ${c.worstDefectName}</div>` : ''}
            ${photoHtml}
        </div>`;
    };

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 36px; text-transform: uppercase; color: #0f172a; margin: 0;">Бюллетень качества</h1>
            <div style="font-size: 16px; color: #4f46e5; font-weight: bold; margin-top: 5px;">Итоги недели: ${posterData.periodStr}</div>
        </div>

        <div style="display: flex; gap: 30px;">
            <div style="flex: 1;">
                <h2 style="background: #16a34a; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase;">🏆 Лидеры недели (УрК > 85%)</h2>
                ${posterData.leaders.length > 0 ? posterData.leaders.map(c => renderCard(c, true)).join('') : '<div style="text-align:center; padding:20px; color:#64748b;">Нет подрядчиков в зеленой зоне</div>'}
            </div>
            
            <div style="flex: 1;">
                <h2 style="background: #ef4444; color: white; padding: 10px; border-radius: 8px; text-align: center; text-transform: uppercase;">🔴 Антирейтинг (Брак и УрК < 70%)</h2>
                ${posterData.antiLeaders.length > 0 ? posterData.antiLeaders.map(c => renderCard(c, false)).join('') : '<div style="text-align:center; padding:20px; color:#64748b;">Антилидеров нет! Отличная работа!</div>'}
            </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 20px;">
            <div style="flex: 1; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Индекс риска на объекте (ИКО)</div>
                <div style="font-size: 36px; font-weight: 900; color: ${posterData.iko >= 0.6 ? '#ef4444' : '#16a34a'};">${posterData.iko}</div>
            </div>
            <div style="flex: 1; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Всего критических дефектов (B3)</div>
                <div style="font-size: 36px; font-weight: 900; color: ${posterData.totalB3 > 0 ? '#ef4444' : '#16a34a'};">${posterData.totalB3} шт</div>
            </div>
        </div>
    `;
    printPdfShell("Плакат Качества", content, format);
}

// 6. Сводный отчет для руководителя (One-Pager)
function exportPdfOnePager(data) {
    if(data.length === 0) return showToast('Нет данных для выгрузки');

    let sumUrk = 0; let sumB3 = 0;
    data.forEach(i => { if(i.metrics) { sumUrk += i.metrics.final; sumB3 += i.metrics.n_B3_fail; } });
    const currAvgUrk = data.length > 0 ? Math.round(sumUrk / data.length) : 0;
    
    const groupedC = {};
    data.forEach(item => { groupedC[item.contractorName] = groupedC[item.contractorName] || []; groupedC[item.contractorName].push(item); });
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

    const renderPhotoCards = (arr, isCrit) => {
        if (arr.length === 0) return `<div style="text-align:center; padding:30px; color:#94a3b8; font-size:12px;">Нет зафиксированных дефектов</div>`;
        while(arr.length < 5) { arr.push({ empty: true }); }
        return `<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px;">
            ${arr.map(d => {
                if (d.empty) return `<div style="border:1px dashed #cbd5e1; border-radius:8px; opacity:0.3; background:#f8fafc; height:140px;"></div>`;
                const imgHtml = d.photo ? `<img src="${d.photo}" style="width:100%; height:90px; object-fit:cover; border-bottom:1px solid #e2e8f0;">` : `<div style="width:100%; height:90px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#cbd5e1; font-size:10px; border-bottom:1px solid #e2e8f0;">НЕТ ФОТО</div>`;
                const badgeColor = isCrit ? '#dc2626' : '#d97706';
                const badgeBg = isCrit ? '#fef2f2' : '#fff7ed';
                return `
                <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.05); page-break-inside: avoid; height:140px;">
                    ${imgHtml}
                    <div style="padding:6px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                        <div style="font-size:9px; font-weight:bold; color:#0f172a; line-height:1.2; margin-bottom:4px; overflow:hidden; height:22px;">${d.name}</div>
                        <div>
                            <div style="font-size:8px; color:#64748b; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">👤 ${d.contr}</div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="background:${badgeBg}; color:${badgeColor}; font-size:8px; font-weight:900; padding:2px 4px; border-radius:4px; border:1px solid ${badgeColor};">${isCrit ? 'B3' : 'B2'}</span>
                                <span style="font-size:9px; font-weight:900; color:#475569;">${d.count} шт</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    };

    const cSpark = document.getElementById('op-sparkline-chart');
    const imgSpark = cSpark ? `<img style="width:100%; height:50px; object-fit:fill; opacity:0.8;" src="${cSpark.toDataURL('image/png')}">` : '';

    const cMom = document.getElementById('op-mom-bar-chart');
    const imgMom = cMom ? `<img style="width:100%; height:180px; object-fit:contain;" src="${cMom.toDataURL('image/png')}">` : '';

    const pdcaTextRaw = document.getElementById('hidden_pdca_text')?.value || "Нет данных для формирования решения.";
    const pdfFormattedText = pdcaTextRaw.replace(/^\[(.*?)\]/gm, '<div style="font-size: 11px; font-weight: bold; color: #854d0e; text-transform: uppercase; margin-top: 10px; margin-bottom: 4px;">$1</div>').replace(/\n/g, '<br>');
    const periodText = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';

    const content = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1e293b; padding-bottom:10px; margin-bottom:15px;">
            <div>
                <h1 style="font-size:24px; margin:0; color:#0f172a; text-transform:uppercase;">Сводный статус объекта</h1>
                <p style="color:#64748b; font-size:12px; margin:4px 0 0 0; font-weight:bold;">Комплексный отчет для Руководителя</p>
            </div>
            <div style="text-align:right; font-size:12px; color:#64748b;">
                База: <b>${data.length} независимых проверок</b><br>
                Период: <b style="color:#4f46e5;">${periodText}</b>
            </div>
        </div>
        
        <div style="display: flex; gap: 20px; align-items: stretch; margin-bottom: 20px;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 15px; border-right: 2px dashed #e2e8f0; padding-right: 20px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; display:flex; flex-direction:column; justify-content:space-between;">
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК Объекта</div>
                        <div style="font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1; margin-top:5px;">${currAvgUrk}%</div>
                    </div>
                    <div style="background: ${parseFloat(mData.IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 12px; border-radius: 10px; border: 1px solid ${parseFloat(mData.IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; display:flex; flex-direction:column; justify-content:space-between;">
                        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска (ИКО)</div>
                        <div style="font-size: 32px; font-weight: 900; color: ${pdfIkoColor}; line-height: 1; margin-top:5px;">${mData.IKO}</div>
                    </div>
                    <div style="background: #fef2f2; padding: 12px; border-radius: 10px; border: 1px solid #fecaca; position: relative;">
                        <div style="font-size: 9px; color: #991b1b; text-transform: uppercase; font-weight: 900;">Работ в красной зоне</div>
                        <div style="font-size: 32px; font-weight: 900; color: #dc2626; margin-top: 5px; line-height: 1;">${mData.redZonePerc}%</div>
                        <div style="font-size: 8px; color: #b91c1c; margin-top: 5px; font-weight:bold;">ОТ ОБЪЕМА</div>
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 15px;">
                    <div style="font-size: 10px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 10px;">📊 Базовый УрК: Динамика М/М</div>
                    <div style="display: flex; align-items: center; justify-content: center;">
                        ${imgMom || '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 15px; flex: 1;">
                    <div style="font-size: 10px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 10px;">🏆 Рейтинг Подрядчиков</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${(() => {
                            if (ratingData.length === 0) return '<div style="font-size:10px; color:#94a3b8;">Недостаточно данных</div>';
                            const renderRow = (r) => `
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="width:120px; font-size:11px; font-weight:bold; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.name}</div>
                                    <div style="flex:1; background:#e2e8f0; height:14px; border-radius:7px; overflow:hidden; position:relative; border:1px solid #cbd5e1;">
                                        <div style="width:${r.val}%; background:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')}; height:100%; border-radius:7px;"></div>
                                    </div>
                                    <div style="width:35px; text-align:right; font-size:12px; font-weight:900; color:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')};">
                                        ${r.isPrelim ? '<span style="font-size:8px;">⚠️</span>' : ''} ${r.val}%
                                    </div>
                                </div>`;
                            if (ratingData.length <= 10) return ratingData.map(renderRow).join('');
                            const top4 = ratingData.slice(0, 4);
                            const bottom4 = ratingData.slice(-4);
                            return top4.map(renderRow).join('') + 
                                `<div style="text-align:center; font-size:9px; color:#94a3b8; font-weight:bold; padding:4px 0; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:2px 0; text-transform:uppercase;">... Скрыто ${ratingData.length - 8} подрядчиков ...</div>` + 
                                bottom4.map(renderRow).join('');
                        })()}
                    </div>
                </div>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; gap: 15px;">
                <div style="flex: 1; background: #fef2f2; border: 2px solid #fecaca; border-radius: 10px; padding: 15px; display: flex; flex-direction: column;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #dc2626; text-transform: uppercase; border-bottom: 1px solid #fca5a5; padding-bottom: 5px;">🚨 ТОП-5 Критических дефектов (B3)</h3>
                    <div style="flex: 1;">${renderPhotoCards(topB3, true)}</div>
                </div>
                <div style="flex: 1; background: #fffbeb; border: 2px solid #fde68a; border-radius: 10px; padding: 15px; display: flex; flex-direction: column;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #d97706; text-transform: uppercase; border-bottom: 1px solid #fde047; padding-bottom: 5px;">🔄 ТОП-5 Повторяющихся нарушений (B2)</h3>
                    <div style="flex: 1;">${renderPhotoCards(topB2, false)}</div>
                </div>
                <div style="background: ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#fde68a' : '#bbf7d0'}; border-radius: 10px; padding: 15px; flex: 0 0 auto; page-break-inside: avoid;">
                    <h3 style="margin: 0 0 8px 0; font-size: 11px; color: ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#b45309' : '#166534'}; text-transform: uppercase; border-bottom: 1px solid ${parseFloat(mData.IKO) >= 0.60 || sumB3 > 0 ? '#fde047' : '#86efac'}; padding-bottom: 4px;">🎯 Управленческое Решение и Риски</h3>
                    <div style="font-size: 12px; line-height: 1.5; color: #1e293b; display: flex; flex-direction: column; gap: 6px;">
                        <div style="white-space: pre-wrap;">${pdfFormattedText}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    printPdfShell("Сводка для Руководства", content, "A3");
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

// 8. Выгрузка рейтинга (Rating)
function exportPdfRating(data) {
    const grouped = {};
    data.forEach(item => { const cName = item.contractorName || 'Не указан'; if(!grouped[cName]) grouped[cName] = []; grouped[cName].push(item); });
    
    const ratingData = [];
    for(let cName in grouped) { const metrics = getContractorMetrics(grouped[cName], userTemplates); if (metrics) ratingData.push({ name: cName, metrics: metrics }); }
    ratingData.sort((a,b) => b.metrics.finalC - a.metrics.finalC);

    let rowsHtml = ratingData.map((r, i) => {
        const m = r.metrics;
        const color = m.finalC < 70 ? '#ef4444' : (m.finalC < 85 ? '#f59e0b' : '#22c55e');
        const isLeader = i === 0 && m.finalC >= 85;

        return `
        <div class="avoid-break" style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 15px; margin-bottom: 15px; background: #f8fafc; position: relative;">
            ${isLeader ? `<div style="position: absolute; top: 0; right: 0; background: #fde047; color: #854d0e; padding: 4px 10px; font-size: 10px; font-weight: bold; border-bottom-left-radius: 10px; text-transform: uppercase;">🏆 Лидер</div>` : ''}
            <table style="width: 100%; border: none; margin-bottom: 10px;">
                <tr>
                    <td style="width: 40px; text-align: center;"><div style="width:30px; height:30px; background:#e2e8f0; border-radius:8px; line-height:30px; font-weight:900; font-size:16px;">${i + 1}</div></td>
                    <td><div style="font-size: 16px; font-weight: 900; color: #0f172a;">${r.name}</div><div style="font-size: 10px; color: #64748b; text-transform: uppercase;">${m.confStatus} (Выборка: ${m.count})</div></td>
                    <td style="text-align: right;"><div style="font-size: 28px; font-weight: 900; color: ${color}; line-height: 1;">${m.finalC}%</div><div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${m.riskStatus==='Высокий риск'?'#ef4444':'#475569'};">${m.riskStatus}</div></td>
                </tr>
            </table>
            <div style="margin-bottom: 15px;">
                <div style="height: 10px; background: #e2e8f0; border-radius: 5px; position: relative; overflow: hidden; border: 1px solid #cbd5e1;">
                    <div style="height: 100%; width: ${m.finalC}%; background: ${color}; border-radius: 5px;"></div>
                </div>
            </div>
        </div>`;
    }).join('');

    const content = `<h2 class="section-title">Рейтинг Подрядчиков</h2><div class="mt-20">${rowsHtml}</div>`;
    printPdfShell("Рейтинг Подрядчиков", content, "A4");
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
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        @page { size: ${formatSize} ${pageOrientation}; margin: 10mm; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 15px; background: #e2e8f0; font-size: 13px; line-height: 1.5; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        
        .preview-container { width: 100%; max-width: ${maxWidth}; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); min-height: 100vh; }
        
        .print-controls { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 10000; }
        .btn { width: 50px; height: 50px; border-radius: 25px; display: flex; justify-content: center; align-items: center; cursor: pointer; border: none; box-shadow: 0 10px 15px rgba(0,0,0,0.2); font-size: 20px; outline: none; }
        
        @media print { 
            .print-controls { display: none !important; } 
            body { padding: 0; background: white; } 
            .preview-container { box-shadow: none; margin: 0; padding: 0; max-width: none; }
            .avoid-break { page-break-inside: avoid !important; } 
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
    const proj = document.getElementById('tender-project-select')?.value;
    if (!proj) { showToast('Сначала выберите объект из списка!'); return null; }

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

                let rec = "РЕКОМЕНДОВАН"; let recClass = "text-green-600"; let recDesc = "Подрядчик стабилен и показывает высокое качество работ.";
                if (m.finalC < 70 || m.rateB3 >= 20) {
                    rec = "НЕ РЕКОМЕНДОВАН"; recClass = "text-red-600"; 
                    recDesc = "Подрядчик имеет недопустимый уровень критического брака и низкую оценку. Высокие риски для компании.";
                } else if (m.finalC < 85 || m.rateB3 > 0 || m.stabilityIndex < 60) {
                    rec = "ДОПУСТИМ С ОГРАНИЧЕНИЯМИ"; recClass = "text-orange-500";
                    recDesc = "Подрядчик выполняет работы удовлетворительно, но имеет нестабильный процесс или допускал критические дефекты B3.";
                }

                const monthlyData = {};
                cData.forEach(c => {
                    const mName = new Date(c.date).toLocaleString('ru-RU', { month:'short', year:'2-digit'});
                    if(!monthlyData[mName]) monthlyData[mName] = {sum:0, cnt:0};
                    monthlyData[mName].sum += c.metrics.final;
                    monthlyData[mName].cnt++;
                });
                const spark = Object.keys(monthlyData).map(k => ({ month: k, val: Math.round(monthlyData[k].sum/monthlyData[k].cnt) }));

                tenderData.push({
                    name: cName, proj: proj,
                    metrics: m, causes: causes, totalFails: totalFails,
                    rec: rec, recClass: recClass, recDesc: recDesc, spark: spark,
                    periodStart: new Date(cData.sort((a,b)=>new Date(a.date)-new Date(b.date))[0].date).toLocaleDateString('ru-RU'),
                    periodEnd: new Date(cData.sort((a,b)=>new Date(b.date)-new Date(a.date))[0].date).toLocaleDateString('ru-RU')
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

    // Здесь мы просто используем новую универсальную функцию exportPdfFullObjectReport, 
    // передав ей проверки, относящиеся только к выбранному объекту
    const projChecks = contractorArray.filter(c => c.projectName === data[0].proj);
    exportPdfFullObjectReport(projChecks);
}

// ============================================================================
// === 10. СИСТЕМНЫЕ БЭКАПЫ И ЗАГРУЗКА БАЗ (JSON) ===
// ============================================================================

// 10.1 Выгрузка всей базы данных в JSON или CSV
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
                history: contractorArray,
                templates: userTemplates,
                twi: customTwiCards,
                docs: userDocsToExport, // База НД
                expert: customExpertConclusions,
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

// 10.2 Кнопка, которая вызывает окно выбора файла
function triggerDataImport() { 
    document.getElementById('db-import-input').click(); 
}

// 10.3 Обработчик загруженного файла и умное слияние
function processDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast("⚙️ Чтение файла и слияние баз...");
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            let addedHist = 0, addedTmpl = 0, addedTwi = 0, addedDocs = 0;

            // СЦЕНАРИЙ 1: ЭТО НОВЫЙ СУПЕР-БЭКАП (Сборка всего)
            if (parsed.type === "RBI_FULL_BACKUP" && parsed.data) {
                
                // А. СЛИЯНИЕ ИСТОРИИ ПРОВЕРОК
                if (parsed.data.history && Array.isArray(parsed.data.history)) {
                    for(const item of parsed.data.history) {
                        // Если проверки с таким ID еще нет - добавляем
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

                // Д. СЛИЯНИЕ ЭКСПЕРТНЫХ ЗАКЛЮЧЕНИЙ (Отредактированные тексты ИИ)
                if (parsed.data.expert) {
                    customExpertConclusions = { ...customExpertConclusions, ...parsed.data.expert };
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

                showToast(`✅ Базы слиты!\nПроверок: +${addedHist} | Шаблонов: +${addedTmpl}\nTWI: +${addedTwi} | Нормативов: +${addedDocs}`);

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
    event.target.value = '';
}