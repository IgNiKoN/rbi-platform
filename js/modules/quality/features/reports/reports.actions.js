/**
 * reports.actions.js — Фаза 16: бизнес-действия модуля Reports.
 *
 * Делегирует все действия в window.*-функции из export.js (legacy-монолит).
 * export.js не переписывается — ES-обёртка только предоставляет
 * типизированный фасад с событиями.
 *
 * Эмитит: reports:generation:started, reports:generation:completed
 */

import { ReportsState } from './reports.state.js';

function _getSetting(key) {
    if (ReportsActions._ctx && ReportsActions._ctx.settings) return ReportsActions._ctx.settings.get(key);
    return window.RBI.services.settings.get(key);
}

function _triggerSync(mode) {
    var m = mode || 'silent';
    if (ReportsActions._ctx && ReportsActions._ctx.sync) return ReportsActions._ctx.sync.trigger(m);
    if (window.RBI && window.RBI.services && window.RBI.services.sync) return window.RBI.services.sync.trigger(m);
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
}

function _storage() {
    if (ReportsActions._ctx && ReportsActions._ctx.storage) return ReportsActions._ctx.storage;
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
        return window.RBI.services.storage;
    }
    return {
        stores: function () { return typeof STORES !== 'undefined' ? STORES : {}; },
        get: function (store, key) { return dbGet(store, key); },
        getAll: function (store) { return dbGetAll(store); },
        put: function (store, data) { return dbPut(store, data); },
        delete: function (store, key) { return dbDelete(store, key); }
    };
}

function _gameLogAction(actionType, targetId) {
    if (ReportsActions._ctx && ReportsActions._ctx.game) {
        return ReportsActions._ctx.game.logAction(actionType, targetId);
    }
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.logAction(actionType, targetId);
    }
    if (typeof gameLogAction === 'function') return gameLogAction(actionType, targetId);
}

function _reports() {
    if (ReportsActions._ctx && ReportsActions._ctx.reports) {
        return ReportsActions._ctx.reports;
    }
    if (window.RBI && window.RBI.services && window.RBI.services.reports) {
        return window.RBI.services.reports;
    }
    return {
        getAllSync: function () {
            return typeof reportsArray !== 'undefined' ? reportsArray : [];
        },
        upsertSync: function (record) {
            var arr = this.getAllSync();
            var idx = arr.findIndex(function (r) { return r.id === record.id; });
            if (idx > -1) arr[idx] = record;
            else arr.unshift(record);
            return record;
        },
        getExpertConclusions: function () {
            return typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {};
        },
        getExpertConclusion: function (key) {
            return (typeof customExpertConclusions !== 'undefined' ? customExpertConclusions : {})[key];
        },
        setExpertConclusion: function (key, val) {
            if (typeof customExpertConclusions !== 'undefined') customExpertConclusions[key] = val;
        },
        deleteExpertConclusion: function (key) {
            if (typeof customExpertConclusions !== 'undefined') delete customExpertConclusions[key];
        }
    };
}

// RBI NEW (Множественные фото к пункту чек-листа, B1): единая точка нормализации
// check.photos[id] (массив/строка/undefined → всегда массив) для всех отборов
// фото под PDF/отчёты в этом файле. Использует общий window.normalizeItemPhotos
// (js/shared/photo-editor.utils.js).
function getItemPhotos(check, id) {
    return (check && check.photos) ? window.normalizeItemPhotos(check.photos[id]) : [];
}

function _defectCauses() {
    if (ReportsActions._ctx && ReportsActions._ctx.inspections) {
        return ReportsActions._ctx.inspections.getDefectCausesSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getDefectCausesSync();
    }
    return typeof DEFECT_CAUSES !== 'undefined' ? DEFECT_CAUSES : [];
}

function _callAI(messages, options) {
    if (ReportsActions._ctx && ReportsActions._ctx.ai) return ReportsActions._ctx.ai.call(messages, options);
    if (window.RBI && window.RBI.services && window.RBI.services.ai) {
        return window.RBI.services.ai.call(messages, options);
    }
    return window.callAI(messages, options);
}

function _getAllInspections() {
    if (ReportsActions._ctx && ReportsActions._ctx.inspections) {
        return ReportsActions._ctx.inspections.getAllSync();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.inspections) {
        return window.RBI.services.inspections.getAllSync();
    }
    return Array.isArray(window.contractorArray) ? window.contractorArray : [];
}

function _getSkRecords() {
    if (ReportsActions._ctx && ReportsActions._ctx.sk) return ReportsActions._ctx.sk.getRecordsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getRecordsSync();
    }
    return Array.isArray(window.skRecords) ? window.skRecords : [];
}
function _getSkVolumes() {
    if (ReportsActions._ctx && ReportsActions._ctx.sk) return ReportsActions._ctx.sk.getVolumesSync();
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getVolumesSync();
    }
    return window.skVolumes || {};
}
function _getSkContractorMap() {
    if (ReportsActions._ctx && ReportsActions._ctx.sk) return ReportsActions._ctx.sk.getContractorMapSync();
    if (window.RBI && window.RBI.services && window.RBI.services.sk) {
        return window.RBI.services.sk.getContractorMapSync();
    }
    return window.skContractorMap || {};
}

function _getTasks() {
    if (ReportsActions._ctx && ReportsActions._ctx.tasks) return ReportsActions._ctx.tasks.getTasksSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getTasksSync();
    }
    return typeof window.rbi_tasksData !== 'undefined' ? window.rbi_tasksData : [];
}
function _getSchedule() {
    if (ReportsActions._ctx && ReportsActions._ctx.tasks) return ReportsActions._ctx.tasks.getScheduleSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getScheduleSync();
    }
    return typeof window.rbi_scheduleData !== 'undefined' ? window.rbi_scheduleData : [];
}
function _getFmea() {
    if (ReportsActions._ctx && ReportsActions._ctx.tasks) return ReportsActions._ctx.tasks.getFmeaSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getFmeaSync();
    }
    return typeof window.rbi_fmeaRecords !== 'undefined' ? window.rbi_fmeaRecords : [];
}
function _getPractices() {
    if (ReportsActions._ctx && ReportsActions._ctx.tasks) return ReportsActions._ctx.tasks.getPracticesSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getPracticesSync();
    }
    return typeof window.rbi_practicesData !== 'undefined' ? window.rbi_practicesData : [];
}
function _getInterventions() {
    if (ReportsActions._ctx && ReportsActions._ctx.tasks) return ReportsActions._ctx.tasks.getInterventionsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getInterventionsSync();
    }
    return typeof window.rbi_interventionsData !== 'undefined' ? window.rbi_interventionsData : [];
}
function _getMeetings() {
    if (ReportsActions._ctx && ReportsActions._ctx.tasks) return ReportsActions._ctx.tasks.getMeetingsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.tasks) {
        return window.RBI.services.tasks.getMeetingsSync();
    }
    return typeof window.rbi_meetingsData !== 'undefined' ? window.rbi_meetingsData : [];
}

function _getTwiCards() {
    if (ReportsActions._ctx && ReportsActions._ctx.knowledge) return ReportsActions._ctx.knowledge.getTwiCardsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
        return window.RBI.services.knowledge.getTwiCardsSync();
    }
    return Array.isArray(window.customTwiCards) ? window.customTwiCards : [];
}
function _getCustomDocs() {
    if (ReportsActions._ctx && ReportsActions._ctx.knowledge) return ReportsActions._ctx.knowledge.getCustomDocsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
        return window.RBI.services.knowledge.getCustomDocsSync();
    }
    return Array.isArray(window.customDocs) ? window.customDocs : [];
}
function _getCustomNodes() {
    if (ReportsActions._ctx && ReportsActions._ctx.knowledge) return ReportsActions._ctx.knowledge.getCustomNodesSync();
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
        return window.RBI.services.knowledge.getCustomNodesSync();
    }
    return Array.isArray(window.customNodes) ? window.customNodes : [];
}
function _getEtalonActs() {
    if (ReportsActions._ctx && ReportsActions._ctx.knowledge) return ReportsActions._ctx.knowledge.getEtalonActsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
        return window.RBI.services.knowledge.getEtalonActsSync();
    }
    return Array.isArray(window.etalonActsArray) ? window.etalonActsArray : [];
}
function _getWeeklyPlan() {
    if (ReportsActions._ctx && ReportsActions._ctx.game) return ReportsActions._ctx.game.getWeeklyPlanSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.getWeeklyPlanSync();
    }
    return window.weeklyPlanData || { weekId: null, tasks: [], completed: false };
}
function _setWeeklyPlan(obj) {
    if (ReportsActions._ctx && ReportsActions._ctx.game) return ReportsActions._ctx.game.setWeeklyPlanSync(obj);
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.setWeeklyPlanSync(obj);
    }
    window.weeklyPlanData = obj;
    return window.weeklyPlanData;
}
function _getContractorStatuses() {
    if (ReportsActions._ctx && ReportsActions._ctx.game) return ReportsActions._ctx.game.getContractorStatusesSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.getContractorStatusesSync();
    }
    return window.contractorStatuses || {};
}
function _getGameActionLogs() {
    if (ReportsActions._ctx && ReportsActions._ctx.game) return ReportsActions._ctx.game.getGameActionLogsSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.getGameActionLogsSync();
    }
    return window.gameActionLogs || [];
}
function _getEngineerAbsence() {
    if (ReportsActions._ctx && ReportsActions._ctx.game) return ReportsActions._ctx.game.getEngineerAbsenceSync();
    if (window.RBI && window.RBI.services && window.RBI.services.game) {
        return window.RBI.services.game.getEngineerAbsenceSync();
    }
    return window.engineerAbsence || { isActive: false, reason: '', startDate: null, endDate: null };
}

function _templates() {
    if (ReportsActions._ctx && ReportsActions._ctx.templates) return ReportsActions._ctx.templates;
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

function emitEvent(name, payload) {
    var events = ReportsActions._ctx && ReportsActions._ctx.events;
    if (events && typeof events.emit === 'function') {
        events.emit(name, payload || {});
    }
}

// Примечание (Фаза физического переноса G1, подшаг 1): `resolveLocalPhotosForPdf`
// перенесена вместе с `printPdfShell` (см. ниже) — раньше не переносилась,
// т.к. ждала переноса всей группы G1.

// Примечание (Фаза физического переноса G5): состояние конструктора
// PDF-шаблонов (`currentEditingPdfTemplateId`, `sortableAvailable`,
// `sortableActive`, `PDF_BLOCKS_LIBRARY`) — module-level, используется
// только internal-helper'ами этого файла (перенесено из export.js).
// `userReportTemplates` НЕ дублируется локальной переменной модуля: этот
// файл — ES-модуль, у которого нет доступа к глобальному лексическому
// scope classic-script'ов, поэтому объявить `let userReportTemplates`,
// видимую из `js/sync.js` по bare-имени, здесь невозможно. `js/sync.js`
// (строки ~3137, 3222–3223, 4140) читает/пишет `userReportTemplates`
// bare-именем — после удаления `let userReportTemplates` из export.js
// (этим блоком) это имя в non-strict classic-script коде прозрачно
// резолвится в `window.userReportTemplates` (глобальная переменная и
// свойство window — одно и то же в браузере). Поэтому единственный
// источник истины — `window.userReportTemplates`, все internal-helpers
// этого файла читают/пишут только через него.
if (typeof window !== 'undefined') {
    window.userReportTemplates = window.userReportTemplates || [];
}

let currentEditingPdfTemplateId = null;
let sortableAvailable = null;
let sortableActive = null;

const PDF_BLOCKS_LIBRARY = [
    { id: "header_metrics", name: "Макропоказатели (Шапка)", icon: "📊" },
    { id: "trend_chart", name: "График: Динамика УрК", icon: "📈" },
    { id: "contractors_rating", name: "Рейтинг подрядчиков", icon: "🏆" },
    { id: "top_b3_photos", name: "Фото: Критические B3", icon: "🚨" },
    { id: "top_b2_photos", name: "Фото: Значимые B2", icon: "⚠️" },
    { id: "top_ok_photos", name: "Фото: Эталоны OK", icon: "✅" },
    { id: "ai_summary", name: "Управленческое резюме (ИИ)", icon: "🧠" },
    { id: "pareto_causes", name: "Диаграмма причин брака", icon: "🔍" },
    { id: "hr_rating", name: "Рейтинг инженеров", icon: "👤" },
    { id: "best_practices", name: "Топ лучших практик", icon: "💡" }
];

// internal: агрегирует тендерные данные по объекту (не публичный delegate —
// вызывается только из exportTenderCSV/exportTenderPDF, перенесено из
// export.js:getTenderData, группа G5).
function getTenderData() {
    let proj = document.getElementById('tender-project-select')?.value;
    const _allInspections = _getAllInspections();

    if (!proj) {
        const allProjects = [...new Set(_allInspections.map(c => c.projectName).filter(Boolean))].sort();
        if (allProjects.length > 0) {
            proj = allProjects[0];
            const selectEl = document.getElementById('tender-project-select');
            if (selectEl) selectEl.value = proj;
        } else {
            showToast('Нет доступных объектов для выгрузки!');
            return null;
        }
    }

    const objChecks = _allInspections.filter(c => c.projectName === proj);
    const grouped = {};
    objChecks.forEach(c => {
        if (!grouped[c.contractorName]) grouped[c.contractorName] = [];
        grouped[c.contractorName].push(c);
    });

    const tenderData = [];
    for (let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) {
            // ВАЖНО: передаем 'false' третьим аргументом, чтобы отключить плавающее окно (берем всю историю!)
            const m = getContractorMetrics(cData, _templates().getUserTemplates(), false);
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

                const sortedDates = cData.map(c => new Date(c.date)).sort((a, b) => a - b);

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
    tenderData.sort((a, b) => b.metrics.finalC - a.metrics.finalC);
    return tenderData;
}

// internal: экспорт CSV-паспортов подрядчиков по тендеру. Не имеет
// собственного публичного delegate-метода в ReportsActions — единственный
// вызыватель — `handleFabExportAction` v2 (группа G6, остаётся в export.js),
// поэтому экспортируется как `window.exportTenderCSV` в конце файла (см.
// целевой результат блока G5).
function exportTenderCSV() {
    const data = getTenderData();
    if (!data) return;
    if (data.length === 0) return showToast("Недостаточно данных по подрядчикам на этом объекте.");

    let csvContent = "\uFEFF";
    const headers = ['Подрядчик', 'Интегр. УрК (физика)', 'УрК Докум.', 'Средний балл', 'Проверок', 'B3 (%)', 'Стабильность', 'Системность (Ks)', 'Рекомендация'];
    csvContent += headers.join(";") + "\r\n";

    data.forEach(d => {
        const docVal = (d.metrics.documentaryC !== null && d.metrics.documentaryC !== undefined) ? d.metrics.documentaryC + '%' : '—';
        const row = [d.name, d.metrics.finalC + '%', docVal, d.metrics.baseUrkContrPerc + '%', d.metrics.count, d.metrics.rateB3.toFixed(1) + '%', d.metrics.stabilityIndex + '%', d.metrics.ks.toFixed(2), d.rec];
        csvContent += row.join(";") + "\r\n";
    });

    downloadFile(csvContent, `Tender_Report_${data[0].proj.replace(/\W/g, '_')}.csv`, 'text/csv');
    showToast("✅ CSV файл выгружен!");
}

// internal: экспорт PDF-паспортов подрядчиков по тендеру (по одной странице
// на подрядчика). Не имеет публичного delegate-метода — см. exportTenderCSV.
function exportTenderPDF() {
    const data = getTenderData();
    if (!data) return;
    if (data.length === 0) return showToast("Недостаточно данных по подрядчикам на этом объекте.");

    const projName = data[0].proj;
    let content = '';

    data.forEach(d => {
        const m = d.metrics;

        const sortedCauses = Object.keys(d.causes).sort((a, b) => d.causes[b] - d.causes[a]).slice(0, 5);
        let causesHtml = sortedCauses.map(code => {
            const cName = _defectCauses().find(x => x.code === code)?.name || 'Иное';
            return `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:8px 0;">
                    <span style="color:#334155; font-size:12px;">${cName}</span>
                    <span style="font-weight:bold; color:#0f172a;">${d.causes[code]} шт.</span>
                </div>`;
        }).join('');

        if (!causesHtml) causesHtml = '<div style="color:#64748b; font-size:12px; padding:8px 0; text-align:center;">Дефектов не зафиксировано</div>';

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

// internal: перенесена из export.js (группа G6, физический перенос).
// Единственный вызыватель вне этого файла — bare-вызовы внутри
// exportPdfPoster (ниже, тот же файл) — теперь внутримодульный вызов,
// window.X не выставляется (Grep не подтвердил внешних вызывателей).
function _isDemoMode() {
    if (ReportsActions._ctx && ReportsActions._ctx.appMode) return ReportsActions._ctx.appMode.isDemo();
    return window.RBI.services.appMode.isDemo();
}

function _analyticsFilters() {
    if (ReportsActions._ctx && ReportsActions._ctx.analytics) {
        return ReportsActions._ctx.analytics.getAnalyticsFilters();
    }
    if (window.RBI && window.RBI.services && window.RBI.services.analytics) {
        return window.RBI.services.analytics.getAnalyticsFilters();
    }
    if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics) {
        return activeMultiFilters.analytics;
    }
    return { project: [], contractor: [], inspector: [], template: [] };
}

// internal: главный обработчик всплывающего меню выгрузки FAB. Перенесена
// из export.js (версия 2, `window.handleFabExportAction`, группа G6,
// физический перенос). Версия 1 (обычная `async function` без `window.`,
// переопределённая версией 2 до использования) — подтверждённый мёртвый
// код, не перенесена. Вызывается bare-именем из js/app.js (генерируемый
// onclick), tasks.module.js:1109 и window.handleFabExportAction ниже —
// обязателен `window.handleFabExportAction = handleFabExportAction`
// в конце файла.
async function handleFabExportAction(actionType, mode = 'script') {
    closeFabExportMenu();

    const data = getFilteredAnalyticsData();
    if (data.length === 0) return showToast('Нет данных для выгрузки');

    // Если это отчеты, которые поддерживают шаблоны, мы сначала ищем шаблон!
    if (actionType === 'onepager' || actionType === 'global_onepager') {

        // 1. Проверяем, есть ли в базе созданные шаблоны для этого типа отчета
        const tmpls = await _storage().getAll(_storage().stores().REPORT_TEMPLATES);
        window.userReportTemplates = (tmpls || []).filter(t => !t.is_deleted);
        const matchingTemplates = window.userReportTemplates.filter(t => t.report_type === actionType);

        if (matchingTemplates.length > 0) {
            // Если шаблон есть, берем самый свежий (последний)
            // В будущем здесь можно сделать модалку "Выбор шаблона", но для скорости пока берем активный
            const activeTemplate = matchingTemplates.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

            showToast(mode === 'script' ? `⏳ Формируем по шаблону: ${activeTemplate.name}...` : '🖨️ Подготовка к системной печати...');

            setTimeout(async () => {
                // Запускаем НОВУЮ функцию динамического рендера
                await renderReportFromTemplate(data, activeTemplate, actionType, mode);
            }, 500);
            return;
        }
    }

    // Если шаблонов нет или это старый тип отчета — запускаем классические (встроенные) функции
    showToast(mode === 'script' ? '⏳ Формируем PDF файл...' : '🖨️ Подготовка к выгрузке...');

    setTimeout(async () => {
        if (actionType === 'current') {
            await exportPdfCurrentScreen(data, mode);
        } else if (actionType === 'full_report') {
            await exportPdfFullObjectReport(data, mode);
        } else if (actionType === 'poster') {
            await exportPdfPoster(data, mode);
        } else if (actionType === 'onepager') {
            await exportPdfOnePager(data, mode); // Старый fallback
        } else if (actionType === 'global_onepager') {
            await exportPdfGlobalOnePager(data, mode); // Старый fallback
        } else if (actionType === 'data') {
            exportPdfData(data, mode);
        } else if (actionType === 'schedule') {
            exportPdfSchedule(mode);
        } else if (actionType === 'sk_dashboard') {
            exportPdfSK(mode);
        } else if (actionType === 'tender') {
            if (mode === 'script') exportTenderPDF();
            else exportTenderCSV();
        }
    }, 500);
}

// internal: динамический рендер отчёта на основе пользовательского
// PDF-шаблона. Перенесена из export.js (группа G6, физический перенос).
// Единственный внешний вызыватель — reports.render.js:renderFromTemplate()
// через window.renderReportFromTemplate — обязателен
// `window.renderReportFromTemplate = renderReportFromTemplate` в конце файла.
async function renderReportFromTemplate(data, template, reportType, mode) {
    const title = template.name || 'Сводный отчет';
    const layout = template.layout || 'two_uneven'; // two_uneven, two_even, one

    // Брендированная шапка (проверяем галочки из шаблона)
    let qrDataUrl = null;
    const reportId = 'rep_' + Date.now().toString(36);
    const publicToken = generatePublicReportToken();

    if (template.show_qr) {
        try {
            if (typeof QRCode !== 'undefined') {
                qrDataUrl = await generateQrCodeDataUrl(`https://app.rbi-q.ru/report.html?token=${publicToken}`);
            }
        } catch (e) { }
    }

    let logoHtml = '';
    if (template.show_logo && _getSetting('brandLogo')) {
        const logoSrc = await PhotoManager.getAsyncUrl(_getSetting('brandLogo')) || _getSetting('brandLogo');
        logoHtml = `<img src="${logoSrc}" style="height:60px; width:auto; max-width:150px; object-fit:contain;">`;
    }

    const qrHtml = qrDataUrl
        ? `<div style="width:70px; height:70px; border:2px solid ${_getSetting('brandColor') || '#4f46e5'}; padding:3px; border-radius:4px;"><img src="${qrDataUrl}" style="width:100%; height:100%;"></div>`
        : '';

    const fontSizeTitle = mode === 'browser' ? '18pt' : '22px';
    const fontSizeSub = mode === 'browser' ? '9pt' : '12px';

    const headerHtml = `
        <div class="no-break" style="border-bottom: 3px solid ${_getSetting('brandColor') || '#4f46e5'}; padding-bottom: 15px; margin-bottom: 25px;">
            <table style="width: 100%; border: none; border-spacing: 0;">
                <tr>
                    <td style="width: 20%; vertical-align: middle;">${logoHtml}</td>
                    <td style="width: 60%; vertical-align: middle; text-align: center;">
                        <h1 style="font-size:${fontSizeTitle}; font-weight:900; text-transform:uppercase; margin:0; color:#0f172a;">${title}</h1>
                        <div style="font-size:${fontSizeSub}; margin-top:5px; font-weight:bold; color:#64748b;">Сформировано: ${new Date().toLocaleString('ru-RU')}</div>
                    </td>
                    <td style="width: 20%; vertical-align: middle; text-align: right;">${qrHtml}</td>
                </tr>
            </table>
        </div>
    `;

    // Здесь мы должны сгенерировать HTML блоки в зависимости от того, какие блоки выбрал пользователь.
    // Так как математика расчетов для блоков ОЧЕНЬ сложная (мы ее писали в exportPdfOnePager), 
    // чтобы не дублировать тысячу строк кода, мы пойдем умным путем:

    // Мы сообщаем системе, что у нас запрошен кастомный рендер, и перенаправляем поток
    // обратно в базовую функцию, но с флагом, который укажет функции применить наш шаблон.

    // Пока что, чтобы завершить этот этап безопасно:
    if (reportType === 'onepager') {
        window._currentActiveTemplate = template; // Передаем как глобальный параметр
        await exportPdfOnePager(data, mode);
        window._currentActiveTemplate = null; // Очищаем после использования
    } else if (reportType === 'global_onepager') {
        window._currentActiveTemplate = template;
        await exportPdfGlobalOnePager(data, mode);
        window._currentActiveTemplate = null;
    }
}

// Экспортируется (не только internal), т.к. вызывается также из
// reports.render.js:renderTemplatesList() через прямой import — рисует
// список сохранённых PDF-шаблонов в модалке конструктора (вызывается из
// openTemplateModal/savePdfTemplate/deletePdfTemplate этого файла).
// Перенесено из export.js:renderPdfTemplatesList (группа G5, находка №3 —
// частично устранена: раньше объявлялась без `window.` в classic-script
// контексте, теперь обычная ES-функция).
export function renderPdfTemplatesList() {
    const listDiv = document.getElementById('pdf-templates-list');

    if (window.userReportTemplates.length === 0) {
        listDiv.innerHTML = `<div class="text-center py-4 text-slate-400 text-[10px] font-bold">У вас нет сохраненных шаблонов. Используются системные настройки.</div>`;
        return;
    }

    listDiv.innerHTML = window.userReportTemplates.map(t => `
        <div class="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
                <div class="text-[11px] font-black text-slate-800 dark:text-white uppercase">${t.name}</div>
                <div class="text-[9px] text-slate-500 font-bold">Тип: ${t.report_type === 'global_onepager' ? 'По компании' : 'По объекту'} | Блоков: ${t.active_blocks.length}</div>
            </div>
            <div class="flex gap-1.5">
                <button onclick="window.editPdfTemplate('${t.id}')" class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[9px] font-bold active:scale-95 border border-indigo-200">Изменить</button>
                <button onclick="window.deletePdfTemplate('${t.id}')" class="bg-red-50 text-red-500 px-2 py-1 rounded text-[9px] font-bold active:scale-95 border border-red-200">Удалить</button>
            </div>
        </div>
    `).join('');
}

// Экспортируется — вызывается из reports.render.js:closeModal() через прямой
// import. Закрывает модальное окно конструктора PDF-шаблонов и уничтожает
// экземпляры Sortable. Перенесено из export.js:closePdfTemplateModal (группа G5).
export function closePdfTemplateModal() {
    document.getElementById('pdf-template-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    if (sortableAvailable) { sortableAvailable.destroy(); sortableAvailable = null; }
    if (sortableActive) { sortableActive.destroy(); sortableActive = null; }
}

// internal: инициализация drag&drop (SortableJS) между списками доступных
// и активных блоков конструктора шаблонов. Перенесено из
// export.js:initDragAndDrop (группа G5).
function initDragAndDrop(availableIds, activeIds) {
    const availContainer = document.getElementById('pdf-blocks-available');
    const activeContainer = document.getElementById('pdf-blocks-active');

    const createItemHtml = (id) => {
        const blockDef = PDF_BLOCKS_LIBRARY.find(b => b.id === id);
        if (!blockDef) return '';
        return `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-2 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm cursor-move flex items-center gap-2" data-id="${id}">
                <span>${blockDef.icon}</span> ${blockDef.name}
            </div>
        `;
    };

    availContainer.innerHTML = availableIds.map(createItemHtml).join('');
    activeContainer.innerHTML = activeIds.map(createItemHtml).join('');

    if (sortableAvailable) { sortableAvailable.destroy(); sortableAvailable = null; }
    if (sortableActive) { sortableActive.destroy(); sortableActive = null; }

    sortableAvailable = new Sortable(availContainer, {
        group: 'shared', // позволяет перетаскивать между списками
        animation: 150,
        ghostClass: 'opacity-50'
    });

    sortableActive = new Sortable(activeContainer, {
        group: 'shared',
        animation: 150,
        ghostClass: 'opacity-50'
    });
}

// ============================================================================
// Физический перенос группы G1 (подшаг 1) + 6 helper'ов группы G4 —
// низкоуровневая PDF-инфраструктура, перенесённая 1:1 из export.js.
// Находка №4 (EXPORT_JS_MIGRATION_MAP.md, п.5): `printPdfShell`/`escapeHtml`
// вызывались bare-именем из js/game.js, tasks.module.js, analytics.actions.js,
// js/ai.js, а также самим export.js (5 exportPdf*-функций, renderReportFromTemplate).
// Обязательна обратная совместимость через window.X = X (см. конец файла) —
// иначе эти вызовы сломаются.
// ============================================================================

// Вспомогательная функция для генерации графиков "на лету" (для PDF)
// Перенесено из export.js:generatePdfChart (группа G1).
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
// Перенесено из export.js:buildPhotoGridHTML (группа G1).
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

// Расчет данных для плаката качества. Перенесено из export.js:generatePosterData (группа G1).
function generatePosterData() {
    const _allInspections = _getAllInspections();
    const now = new Date();
    const lastWeekEnd = new Date(now);
    const day = lastWeekEnd.getDay() || 7;
    lastWeekEnd.setDate(lastWeekEnd.getDate() - day);
    lastWeekEnd.setHours(23, 59, 59, 999);

    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
    lastWeekStart.setHours(0, 0, 0, 0);

    const weekData = _allInspections.filter(i => {
    });

    const grouped = {};
    weekData.forEach(item => {
        if (!grouped[item.contractorName]) grouped[item.contractorName] = [];
        grouped[item.contractorName].push(item);
    });

    const candidates = [];
    let globalUrkSum = 0; let globalB3Count = 0;

    for (let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) {
            const m = getContractorMetrics(cData, _templates().getUserTemplates());
            if (m) {
                let bestPhoto = null; let worstPhoto = null; let worstDefectName = '';
                cData.forEach(check => {
                    if (check.metrics) {
                        globalUrkSum += Number(check.metrics.final) || 0;
                        globalB3Count += Number(check.metrics.n_B3_fail) || 0;
                    }
                    if (check.photos && check.state) {
                        Object.keys(check.state).forEach(id => {
                            const idPhotos = getItemPhotos(check, id);
                            if (check.state[id] === 'ok' && idPhotos.length > 0) bestPhoto = idPhotos[0];
                            if ((check.state[id] === 'fail' || check.state[id] === 'fail_escalated') && idPhotos.length > 0) {
                                worstPhoto = idPhotos[0];
                                const tType = check.templateKey.split('_')[0];
                                const tKey = check.templateKey.replace(tType + '_', '');
                                const cl = tType === 'sys' && _templates().getSystemTemplates()[tKey] ? _templates().getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                                const foundItem = getFlatList(cl).find(x => x.id == id);
                                if (foundItem) worstDefectName = foundItem.n;
                            }
                        });
                    }
                });

                candidates.push({ name: cName, workType: cData[0].templateTitle, metrics: m, bestPhoto, worstPhoto, worstDefectName });
            }
        }
    }

    const avgObjectUrk = weekData.length > 0 ? Math.round(globalUrkSum / weekData.length) : 0;
    const ikoMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(weekData, _templates().getUserTemplates()) : null;

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

// Выгрузка сырой базы (Data). Перенесено из export.js:exportPdfData (группа G1).
function exportPdfData(data, mode = 'script') {
    if (data.length === 0) return showToast('Нет данных для выгрузки');
    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

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

// Универсальная печатная оболочка (Диспетчер потоков PDF / Print).
// Перенесено из export.js:printPdfShell (группа G1). Вызывается bare-именем
// из js/game.js, tasks.module.js, analytics.actions.js и из 10 уже
// перенесённых методов ReportsActions (printEtalon, printMeeting и др.) —
// резолвится как обычная module-level function declaration этого файла
// (hoisting), без необходимости в window.X внутри самого модуля.
// Определяет человекочитаемый вид документа по заголовку — для чипсов-фильтров
// на вкладке «Отчёты» (см. _ai/current_plan.md, блок "UI вкладки «Отчёты»").
// Аддитивное поле doc_kind, не заменяет report_type ('print'/'pdf', используется
// синком/бейджем) — только для UI-группировки. По тому же принципу, что уже
// используется чуть ниже для скрытия QR по подстроке в title (showQr).
function classifyDocKind(title) {
    if (title.includes('Протокол')) return 'Протокол совещания';
    if (title.includes('FMEA')) return 'FMEA';
    if (title.includes('TWI')) return 'TWI';
    if (title.includes('Практика')) return 'Практика';
    if (title.includes('Воркшоп')) return 'Воркшоп';
    if (title.includes('Инструктаж')) return 'Инструктаж';
    if (title.includes('КС-2')) return 'КС-2';
    if (title.includes('Акт-Эталон')) return 'Акт-эталон';
    if (title.includes('Дашборд СК')) return 'Дашборд СК';
    if (title.includes('График СМР')) return 'График СМР';
    if (title.includes('День Качества')) return 'День качества';
    if (title.includes('Плакат Качества')) return 'Плакат качества';
    if (title.includes('Паспорта Подрядчиков') || title.includes('Список подрядчиков') || title.includes('Срез:') || title.includes('Отчет для')) return 'Отчёт по подрядчику';
    if (title.includes('Сводка для Руководства') || title.includes('Полный отчет по объекту') || title.includes('База проверок')) return 'Сводный отчёт';
    return 'Прочее';
}

async function printPdfShell(title, content, formatSize = 'A4', orientation = 'portrait', mode = 'script') {
    window._pdfGenerating = true;
    const isBackground = (mode === 'background');

    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('global-loader-text');

    // Показываем лоадер ТОЛЬКО если это не фоновый режим
    if (!isBackground && loader && loaderText) {
        loaderText.innerText = mode === 'script' ? "Формируем PDF (высокое качество)..." : "Подготовка к системной печати...";
        loader.style.display = 'flex';
        setTimeout(() => loader.classList.remove('opacity-0'), 10);
    } else if (isBackground) {
        showToast('🤖 Запущена фоновая генерация отчета...');
    }

    let projName = document.getElementById('inp-project')?.value || 'Не указан';
    let inspName = document.getElementById('inp-inspector')?.value || 'Не указан';

    if (document.getElementById('tab-analytics')?.classList.contains('active')) {
        projName = _analyticsFilters().project.length > 0 ? _analyticsFilters().project.join(', ') : 'Все объекты';
        inspName = _analyticsFilters().inspector.length > 0 ? _analyticsFilters().inspector.join(', ') : 'Все инспекторы';
    }

    // Автор отчета и период — для брендированной шапки PDF
    const reportAuthor = _getSetting('engineerName') || document.getElementById('inp-inspector')?.value.trim() || 'Инженер';
    let reportPeriod = document.getElementById('btn-ana-period-label')?.innerText.trim() || 'Всё время';
    if (document.getElementById('global-filter-period')?.value === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        if (dFrom || dTo) {
            const fmt = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '...';
            reportPeriod = `с ${fmt(dFrom)} по ${fmt(dTo)}`;
        }
    }

    const MARGIN_MM = 10;
    const MM_TO_PX = 3.7795;
    const pageWidths = {
        'A4_portrait': Math.floor(210 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A4_landscape': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_portrait': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_landscape': Math.floor(420 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
    };
    const widthPx = Math.floor(pageWidths[`${formatSize}_${orientation}`] || pageWidths['A4_portrait']);
    const HIGH_QUALITY_SCALE = 2.5;

    // === НОВОЕ: Генерируем ID отчета, QR-код и Брендированную шапку ===
    const reportId = 'rep_' + Date.now().toString(36);
    const publicToken = generatePublicReportToken();

    let qrDataUrl = null;
    let showQr = true;

    // Убираем QR с технических отчетов
    if (title.includes('База проверок') || title.includes('График СМР') || title.includes('Дашборд СК') || title.includes('FMEA') || title.includes('Протокол') || title.includes('Воркшоп') || title.includes('Инструктаж') || title.includes('КС-2') || title.includes('Акт-Эталон') || title.includes('Тендер')) {
        showQr = false;
    }

    if (window._currentActiveTemplate && window._currentActiveTemplate.show_qr === false) {
        showQr = false;
    }

    if (showQr) {
        try {
            if (typeof QRCode !== 'undefined') {
                qrDataUrl = await generateQrCodeDataUrl(`https://app.rbi-q.ru/report.html?token=${publicToken}`);
            }
        } catch (e) { console.warn("QR не сгенерирован", e); }
    }

    const headerHtml = await getBrandedHeader(title, mode, qrDataUrl, reportAuthor, reportPeriod);
    const fullHtml = headerHtml + content;

    // ============================================================================
    // ПАЙПЛАЙН 1: БРАУЗЕРНАЯ ПЕЧАТЬ (window.print)
    // ============================================================================
    if (mode === 'browser') {
        const printContainer = document.getElementById('print-content');
        printContainer.setAttribute('data-no-observe', 'true');
        if (!printContainer) return;

        printContainer.innerHTML = `
            <style>
                @page { size: ${formatSize} ${orientation}; margin: 15mm 10mm; }
                #print-wrapper { width: 100%; margin: 0 auto; font-family: Arial, sans-serif; font-size: 10pt; }
                #print-wrapper img { max-width: 100%; display: block; }
                #print-wrapper table { width: 100%; table-layout: fixed; border-collapse: collapse; }
            </style>
            <div id="print-wrapper">
                ${fullHtml}
            </div>
        `;

        await resolveLocalPhotosForPdf(printContainer);

        // Для истории сохраняем настоящий PDF-Blob (тот же html2pdf-пайплайн,
        // что и в ПАЙПЛАЙНЕ 2 ниже), не текстовую заглушку — window.print()
        // (реальная печать на принтер) при этом продолжает вызываться как раньше.
        const printWrapperEl = document.getElementById('print-wrapper') || printContainer;
        const printFilename = `${title.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toLocaleDateString('ru-RU')}.pdf`;
        const printOpt = {
            margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
            filename: printFilename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: HIGH_QUALITY_SCALE,
                useCORS: true, letterRendering: true, width: widthPx, windowWidth: widthPx,
                x: 0, y: 0, scrollX: 0, scrollY: 0, logging: false, allowTaint: true, backgroundColor: '#ffffff'
            },
            jsPDF: { unit: 'mm', format: formatSize.toLowerCase(), orientation: orientation, compress: true },
            pagebreak: { mode: ['css', 'legacy'] }
        };
        let printPdfBlob;
        try {
            printPdfBlob = await html2pdf().set(printOpt).from(printWrapperEl).output('blob');
        } catch (e) {
            console.error('[PDF Error] printPdfShell (browser mode) blob generation failed', e);
            printPdfBlob = new Blob(["Отчет распечатан на принтере, цифровой PDF-копии нет."], { type: 'text/plain' });
        }
        await saveReportToLocal({
            type: 'print',
            docKind: classifyDocKind(title),
            title: title,
            blob: printPdfBlob,
            project: projName,
            period: 'Всё время',
            forcedId: reportId,
            publicToken: publicToken
        }, fullHtml);

        setTimeout(() => {
            window._pdfGenerating = false;
            window.print();
            setTimeout(() => {
                printContainer.innerHTML = '';
                if (loader) { loader.classList.add('opacity-0'); setTimeout(() => loader.style.display = 'none', 300); }
            }, 1000);
        }, 300);
        return;
    }

    // ============================================================================
    // ПАЙПЛАЙН 2: ВЫГРУЗКА PDF ЧЕРЕЗ HTML2PDF
    // ============================================================================
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.cssText = `position: absolute; left: 0; top: 0; width: ${widthPx + 50}px; background: white; z-index: -9999; opacity: 0.01; pointer-events: none;`;
    hiddenDiv.setAttribute('data-no-observe', 'true');
    document.body.appendChild(hiddenDiv);

    const styleElem = document.createElement('style');
    styleElem.textContent = `
    /* Локальные шрифты Playfair Display */
    @font-face {
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 400;
        src: url('/fonts/PlayfairDisplay-Regular.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: italic;
        font-weight: 400;
        src: url('/fonts/PlayfairDisplay-Italic.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 500;
        src: url('/fonts/PlayfairDisplay-Medium.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: italic;
        font-weight: 500;
        src: url('/fonts/PlayfairDisplay-MediumItalic.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 600;
        src: url('/fonts/PlayfairDisplay-SemiBold.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: italic;
        font-weight: 600;
        src: url('/fonts/PlayfairDisplay-SemiBoldItalic.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 700;
        src: url('/fonts/PlayfairDisplay-Bold.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: italic;
        font-weight: 700;
        src: url('/fonts/PlayfairDisplay-BoldItalic.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 800;
        src: url('/fonts/PlayfairDisplay-ExtraBold.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: italic;
        font-weight: 800;
        src: url('/fonts/PlayfairDisplay-ExtraBoldItalic.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: normal;
        font-weight: 900;
        src: url('/fonts/PlayfairDisplay-Black.woff2') format('woff2');
        font-display: swap;
    }
    @font-face {
        font-family: 'Playfair Display';
        font-style: italic;
        font-weight: 900;
        src: url('/fonts/PlayfairDisplay-BlackItalic.woff2') format('woff2');
        font-display: swap;
    }

    /* Bricolage Grotesque – только те файлы, которые есть на скрине */
    @font-face {
    font-family: 'Bricolage Grotesque';
    font-style: normal;
    font-weight: 300;
    src: url('/fonts/BricolageGrotesque-Light.woff2') format('woff2');
    }
    @font-face {
    font-family: 'Bricolage Grotesque';
    font-style: normal;
    font-weight: 400;
    src: url('/fonts/BricolageGrotesque-Regular.woff2') format('woff2');
    }
    @font-face {
    font-family: 'Bricolage Grotesque';
    font-style: normal;
    font-weight: 500;
    src: url('/fonts/BricolageGrotesque-Medium.woff2') format('woff2');
    }
    @font-face {
    font-family: 'Bricolage Grotesque';
    font-style: normal;
    font-weight: 600;
    src: url('/fonts/BricolageGrotesque-SemiBold.woff2') format('woff2');
    }
    @font-face {
    font-family: 'Bricolage Grotesque';
    font-style: normal;
    font-weight: 700;
    src: url('/fonts/BricolageGrotesque-Bold.woff2') format('woff2');
    }
    @font-face {
    font-family: 'Bricolage Grotesque';
    font-style: normal;
    font-weight: 800;
    src: url('/fonts/BricolageGrotesque-ExtraBold.woff2') format('woff2');
    }

    /* Базовые стили PDF-контейнера */
    .pdf-print-root {
        font-family: 'Bricolage Grotesque', 'Verdana', sans-serif;
        width: ${widthPx}px !important;
        margin: 0 auto !important;
        padding: 20px !important;
        background: white !important;
        color: #1c2b39 !important;
        box-sizing: border-box !important;
    }
    .pdf-print-root h1,
    .pdf-print-root h2,
    .pdf-print-root h3 {
        font-family: 'Playfair Display', 'Georgia', 'Times New Roman', serif;
        letter-spacing: 0.03em;
    }
    .pdf-print-root * { box-sizing: border-box !important; }
    .pdf-print-root img { max-width: 100% !important; display: block !important; }
    .pdf-print-root table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
    .pdf-print-root .no-break,
    .pdf-print-root tr,
    .pdf-print-root td,
    .pdf-print-root img {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
`;
    hiddenDiv.appendChild(styleElem);

    const cleanup = () => {
        window._pdfGenerating = false;
        if (!isBackground && loader) {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.style.display = 'none', 300);
        }
        if (document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv);
    };

    const filename = `${title.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toLocaleDateString('ru-RU')}.pdf`;
    const opt = {
        margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: HIGH_QUALITY_SCALE,
            useCORS: true, letterRendering: true, width: widthPx, windowWidth: widthPx,
            x: 0, y: 0, scrollX: 0, scrollY: 0, logging: false, allowTaint: true, backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: formatSize.toLowerCase(), orientation: orientation, compress: true },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    if (navigator.onLine) {
        const cloudUrls = new Set(fullHtml.match(/cloud:\/\/[^"\s]+/g) || []);
        let i = 0;
        for (const url of cloudUrls) {
            if (loaderText) loaderText.innerText = `Кэширование фото ${++i}/${cloudUrls.size}…`;
            try { await PhotoManager.getBase64(url); } catch (e) { }
        }
    }

    try {
        if (loaderText) loaderText.innerText = "Создание PDF…";
        await new Promise(r => requestAnimationFrame(r));

        const pagesHtml = fullHtml.split(/<div class=["']pdf-page-break page-break-before["']><\/div>/gi);
        const isWeakDevice = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);

        let pdfBlob;

        if ((isWeakDevice || pagesHtml.length > 1) && pagesHtml.length > 0) {
            let worker = html2pdf().set(opt);
            for (let i = 0; i < pagesHtml.length; i++) {
                if (loaderText) loaderText.innerText = `Лист ${i + 1}/${pagesHtml.length}…`;
                Array.from(hiddenDiv.children).forEach(c => { if (c.className === 'pdf-print-root') hiddenDiv.removeChild(c); });

                const pageDiv = document.createElement('div');
                pageDiv.className = 'pdf-print-root';
                pageDiv.innerHTML = pagesHtml[i];
                hiddenDiv.appendChild(pageDiv);

                await resolveLocalPhotosForPdf(pageDiv);
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

                // ИСПРАВЛЕНИЕ: создаем PDF на первом цикле
                if (i === 0) {
                    worker = worker.from(pageDiv).toPdf();
                } else {
                    worker = worker.get('pdf').then(pdf => { pdf.addPage(); return pdf; }).from(pageDiv).toContainer().toCanvas().toPdf();
                }
                await worker;
                if (isWeakDevice) await new Promise(r => setTimeout(r, 300));
            }
            // Получаем сам файл (Blob)
            pdfBlob = await worker.output('blob');

            // Если это не фоновый режим - предлагаем скачать на ПК
            if (mode !== 'background') {
                worker.save();
            }
        } else {
            const rootDiv = document.createElement('div');
            rootDiv.className = 'pdf-print-root';
            rootDiv.innerHTML = fullHtml;
            hiddenDiv.appendChild(rootDiv);

            await resolveLocalPhotosForPdf(rootDiv);
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            // Получаем сам файл (Blob)
            const worker = html2pdf().set(opt).from(rootDiv);
            pdfBlob = await worker.output('blob');

            // Если это не фоновый режим - предлагаем скачать на ПК
            if (mode !== 'background') {
                worker.save();
            }
        }

        // === НОВОЕ: Сохраняем полученный Blob (сам файл PDF) в нашу базу истории отчетов ===
        await saveReportToLocal({
            type: 'pdf',
            docKind: classifyDocKind(title),
            title: title,
            blob: pdfBlob,
            project: projName,
            period: 'Всё время',
            forcedId: reportId,
            publicToken: publicToken
        }, fullHtml);

        // Перерисовываем список отчетов, если вкладка открыта
        if (typeof renderReportsList === 'function') renderReportsList();

        cleanup();
        if (typeof showToast === 'function') {
            if (isBackground) showToast("✅ Фоновый отчет успешно создан и сохранен!");
            else showToast("✅ PDF успешно сохранён в Историю!");
        }
    } catch (err) {
        console.error('[PDF Error]', err);
        cleanup();
        if (typeof showToast === 'function') showToast("❌ Ошибка генерации. Попробуйте режим Печати.");
    }
}

/**
 * Принудительно дожидается загрузки и декодирования всех изображений в контейнере.
 * Перенесено из export.js:waitForAllImages (группа G1).
 */
async function waitForAllImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (!images.length) return;

    const loadPromises = images.map(img => {
        // Уже загружено – просто декодируем
        if (img.complete && img.naturalWidth > 0) {
            return img.decode ? img.decode().catch(() => { }) : Promise.resolve();
        }
        // Ждём загрузки, затем декодируем
        return new Promise(resolve => {
            const done = () => {
                if (img.decode) {
                    img.decode().then(resolve).catch(resolve);
                } else {
                    resolve();
                }
            };
            img.onload = done;
            img.onerror = done;
            // Защита от зависших картинок (очень редко)
            const fallback = setTimeout(() => resolve(), 15000);
            const cleanup = () => {
                clearTimeout(fallback);
                img.onload = null;
                img.onerror = null;
            };
            img.addEventListener('load', cleanup, { once: true });
            img.addEventListener('error', cleanup, { once: true });
        });
    });

    await Promise.all(loadPromises);
    // Два кадра анимации, чтобы браузер отрисовал всё до пикселя
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

// ------------------------------------------------------------------
// Экранирование HTML (безопасность). Перенесено из export.js:escapeHtml
// (группа G1). Вызывается bare-именем из js/ai.js — резолвится через
// window.escapeHtml (см. конец файла).
// ------------------------------------------------------------------
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Безопасная загрузка фото перед печатью. Перенесено из
// export.js:resolveLocalPhotosForPdf (группа G1). Вызывается только из
// printPdfShell (этот же файл).
async function resolveLocalPhotosForPdf(container) {
    const images = Array.from(container.querySelectorAll('img'));
    for (const img of images) {
        let src = img.getAttribute('data-local-src') || img.getAttribute('src');
        if (!src || src.startsWith('data:')) continue;

        let base64 = null;
        if (src.startsWith('local://') || src.startsWith('cloud://') || src.startsWith('http')) {
            base64 = await PhotoManager.getBase64(src);
        }
        if (!base64) continue;

        img.src = base64;
        img.removeAttribute('data-local-src');

        await new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
                if (img.decode) img.decode().then(resolve).catch(resolve);
                else resolve();
            } else {
                img.onload = () => {
                    if (img.decode) img.decode().then(resolve).catch(resolve);
                    else resolve();
                };
                img.onerror = resolve;
                setTimeout(resolve, 12000);
            }
        });
    }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

// Генератор брендированной шапки (По брендбуку RBI). Перенесено из
// export.js:getBrandedHeader (группа G4-helpers).
async function getBrandedHeader(title, mode, qrCodeDataUrl = null, author = null, period = null) {
    let logoHtml = '';
    const brandColor = _getSetting('brandColor') || '#1c2b39';
    const goldColor = '#c49a5f';

    if (_getSetting('brandLogo')) {
        const logoSrc = await PhotoManager.getAsyncUrl(_getSetting('brandLogo')) || _getSetting('brandLogo');
        logoHtml = `<img src="${logoSrc}" style="height:45px; width:auto; max-width:200px; object-fit:contain; background: transparent; display: block;">`;
    }

    const qrHtml = qrCodeDataUrl
        ? `<div style="width:70px; height:70px; border:2px solid ${_getSetting('brandColor') || '#4f46e5'}; padding:3px; border-radius:4px; background: white;"><img src="${qrCodeDataUrl}" style="width:100%; height:100%;"></div><div style="font-size: 6px; color: #94a3b8; text-align: center; margin-top: 2px;">После синхр.</div>`
        : '';

    const fontSizeTitle = mode === 'browser' ? '18pt' : '22px';
    const fontSizeSub = mode === 'browser' ? '9pt' : '12px';

    return `
        <style>
            /* уже определены в printPdfShell, дублировать не нужно */
        </style>
        <div class="no-break" style="border-bottom: 3px solid ${brandColor}; padding-bottom: 15px; margin-bottom: 25px;">
            <table style="width: 100%; border: none; border-spacing: 0;">
                <tr>
                    <td style="width: 25%; vertical-align: middle;">${logoHtml}</td>
                    <td style="width: 50%; vertical-align: middle; text-align: center;">
                        <h1 style="font-family: 'Playfair Display', 'Georgia', serif; font-size:${fontSizeTitle}; font-weight:normal; text-transform:uppercase; margin:0; color:${brandColor};">${title}</h1>
                        <div style="font-family: 'Bricolage Grotesque', 'Verdana', sans-serif; font-size:${fontSizeSub}; margin-top:5px; color:#4c7288;">Сформировано: ${new Date().toLocaleString('ru-RU')}${author ? ` | АВТОР: ${author}` : ''}${period ? ` | ПЕРИОД: ${period}` : ''}</div>
                    </td>
                    <td style="width: 25%; vertical-align: middle; text-align: right;">${qrHtml}</td>
                </tr>
            </table>
        </div>
    `;
}

// Генератор QR-кода. Перенесено из export.js:generateQrCodeDataUrl (группа G4-helpers).
async function generateQrCodeDataUrl(url) {
    return new Promise((resolve) => {
        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, {
            text: url,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L
        });
        setTimeout(() => {
            const canvas = tempDiv.querySelector('canvas');
            resolve(canvas.toDataURL());
        }, 100);
    });
}

// Перенесено из export.js:generatePublicReportToken (группа G4-helpers).
function generatePublicReportToken() {
    try {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        return 'rpt_' + Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch (e) {
        return 'rpt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
    }
}

// Перенесено из export.js:preparePublicReportHtml (группа G4-helpers).
async function preparePublicReportHtml(rawHtml) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute; left:-99999px; top:0; width:1180px; background:white;';
    wrapper.innerHTML = rawHtml;
    document.body.appendChild(wrapper);

    try {
        const imgs = Array.from(wrapper.querySelectorAll('img'));

        for (const img of imgs) {
            const src = img.getAttribute('src') || '';

            // QR-код и уже встроенные картинки не трогаем
            if (!src || src.startsWith('data:')) continue;

            let dataUrl = null;

            try {
                if (
                    src.startsWith('local://') ||
                    src.startsWith('cloud://') ||
                    src.startsWith('http')
                ) {
                    if (typeof PhotoManager !== 'undefined' && typeof PhotoManager.getBase64 === 'function') {
                        dataUrl = await PhotoManager.getBase64(src);
                    }
                } else if (src.startsWith('blob:')) {
                    dataUrl = await urlToDataUrl(src);
                }

                if (dataUrl) {
                    img.setAttribute('src', dataUrl);
                }
            } catch (e) {
                console.warn('[PublicReport] Не удалось встроить фото:', src, e);
            }
        }

        const publicCss = `
            <style>
                .qr-public-report {
                    width: 100%;
                    max-width: 100%;
                    margin: 0 auto;
                    background: #ffffff;
                    color: #0f172a;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    padding: 15px;
                }
                .qr-public-report * { box-sizing: border-box !important; }
                .qr-public-report img { max-width: 100%; border-radius: 8px; }

                @media (max-width: 768px) {
                    /* 1. Снимаем жесткие ограничения высоты для текста, чтобы не обрезался */
                    .qr-public-report div, 
                    .qr-public-report span,
                    .qr-public-report p {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        white-space: normal !important;
                    }

                    /* 2. Ломаем каркас главных колонок (выстраиваем вертикально) */
                    .qr-public-report > table,
                    .qr-public-report > table > tbody,
                    .qr-public-report > table > tbody > tr,
                    .qr-public-report > div > table,
                    .qr-public-report > div > table > tbody,
                    .qr-public-report > div > table > tbody > tr {
                        display: block !important;
                        width: 100% !important;
                    }

                    .qr-public-report > table > tbody > tr > td,
                    .qr-public-report > div > table > tbody > tr > td {
                        display: block !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin-bottom: 24px !important;
                        border: none !important;
                    }

                    /* 3. ФОТОГРАФИИ ДРУГ ПОД ДРУГОМ */
                    /* Разрываем ячейки с фото (которые были по 20%, 25%, 33%) в вертикальные блоки */
                    .qr-public-report td[style*="width: 20"],
                    .qr-public-report td[style*="width: 25"],
                    .qr-public-report td[style*="width: 33.3"] {
                        display: block !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin-bottom: 20px !important;
                    }

                    /* Делаем сами фотки красивыми, высокими и обрезанными по центру */
                    .qr-public-report img:not([src^="data:image/png"]) {
                        width: 100% !important;
                        height: 250px !important;
                        object-fit: cover !important;
                        display: block !important;
                        margin-bottom: 10px !important;
                    }

                    /* 4. ВОЗВРАЩАЕМ К ЖИЗНИ ГРАФИКИ */
                    /* Даем им жесткую высоту, чтобы они не схлопывались в ноль */
                    .qr-public-report img[src^="data:image/png"] {
                        height: 200px !important;
                        min-height: 200px !important;
                        width: 100% !important;
                        object-fit: contain !important;
                        display: block !important;
                        margin: 15px 0 !important;
                    }

                    /* 5. СПАСАЕМ МИНИ-ТАБЛИЦЫ (Рейтинги и цифры) */
                    /* У таблиц рейтингов margin-bottom: 6px, а у цифр margin-top: 5px */
                    /* Оставляем их горизонтальными! */
                    .qr-public-report table[style*="margin-bottom:6px"],
                    .qr-public-report table[style*="margin-top:5px"] {
                        display: table !important;
                        width: 100% !important;
                    }
                    .qr-public-report table[style*="margin-bottom:6px"] tbody,
                    .qr-public-report table[style*="margin-top:5px"] tbody { display: table-row-group !important; }
                    .qr-public-report table[style*="margin-bottom:6px"] tr,
                    .qr-public-report table[style*="margin-top:5px"] tr { display: table-row !important; }
                    .qr-public-report table[style*="margin-bottom:6px"] td,
                    .qr-public-report table[style*="margin-top:5px"] td {
                        display: table-cell !important;
                        width: auto !important;
                        padding-bottom: 8px !important;
                    }

                    /* 6. УМЕНЬШАЕМ ОГРОМНЫЕ ШРИФТЫ */
                    .qr-public-report div[style*="font-size: 64px"],
                    .qr-public-report div[style*="font-size: 48px"],
                    .qr-public-report div[style*="font-size: 42px"],
                    .qr-public-report div[style*="font-size: 36px"],
                    .qr-public-report div[style*="font-size: 32px"],
                    .qr-public-report div[style*="font-size: 28pt"],
                    .qr-public-report div[style*="font-size: 24pt"] {
                        font-size: 28px !important;
                        line-height: 1.2 !important;
                    }
                    
                    /* Шапка отчета и заголовки */
                    .qr-public-report h1 { font-size: 20px !important; line-height: 1.3 !important; margin-bottom: 8px !important; text-align: center !important;}
                    .qr-public-report h2 { font-size: 16px !important; margin-bottom: 8px !important; text-align: left !important;}
                    .qr-public-report h3 { font-size: 14px !important; margin-bottom: 8px !important; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
                }
            </style>
        `;

        return publicCss + `<div class="qr-public-report">${wrapper.innerHTML}</div>`;
    } finally {
        document.body.removeChild(wrapper);
    }
}

// Перенесено из export.js:urlToDataUrl (группа G4-helpers).
async function urlToDataUrl(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Не удалось загрузить изображение для публичного отчёта');

    const blob = await res.blob();

    return await blobToBase64(blob);
}

// Универсальное сохранение отчета в IndexedDB и облако.
// Перенесено из export.js:saveReportToLocal (группа G4-helpers).
async function saveReportToLocal(reportData, htmlContent) {
    const reportId = reportData.forcedId || 'rep_' + Date.now().toString(36);
    const publicToken = reportData.publicToken || generatePublicReportToken();

    // Пытаемся найти системный ключ объекта для правильной синхронизации
    let canonicalKey = '';
    if (typeof ObjectDirectory !== 'undefined' && reportData.project) {
        const found = ObjectDirectory.objects.find(o =>
            o.display_name === reportData.project ||
            o.canonical_key === reportData.project
        );
        if (found) canonicalKey = found.canonical_key;
    }

    // 1. ИСПРАВЛЕНИЕ: СНАЧАЛА генерируем HTML-снимок
    const publicHtmlContent = await preparePublicReportHtml(htmlContent);

    // 2. ЗАТЕМ создаем запись отчета
    const reportRecord = {
        id: reportId,
        project_code: window.syncConfig?.projectCode || 'local',

        project_canonical_key: canonicalKey || reportData.project,
        project_display_name: reportData.project,
        engineer_name: _getSetting('engineerName') || 'Инженер',

        report_type: reportData.type,
        doc_kind: reportData.docKind || 'Прочее',
        title: reportData.title,
        generated_at: new Date().toISOString(),
        file_blob: reportData.blob,
        file_size: reportData.blob ? reportData.blob.size : 0,
        file_url: reportData.file_url || '',
        mime_type: 'application/pdf',

        metadata: {
            project: reportData.project,
            period: reportData.period,
            public_token: publicToken
        },

        public_token: publicToken,
        snapshot_html: publicHtmlContent, // Теперь переменная существует!
        created_by: _getSetting('engineerName') || 'Инженер',

        source: 'local',
        sync_status: 'not_synced',
        syncStatus: 'not_synced',
        sync_block_reason: '',
        syncBlockReason: '',
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await _storage().put(_storage().stores().REPORTS, reportRecord);

    _reports().upsertSync(reportRecord);

    // Резервный старый вариант в RAM на всякий случай
    if (!window._tempSnapshots) window._tempSnapshots = {};
    window._tempSnapshots[reportId] = {
        id: 'snap_' + reportId,
        report_id: reportId,
        public_token: publicToken,
        html_content: publicHtmlContent,
        is_public: true,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null
    };

    localStorage.setItem('rbi_cloud_dirty', '1');
    _triggerSync('silent');

    return reportId;
}

// Примечание (Фаза физического переноса G1, подшаг 2 — финальный):
// 5 exportPdf*-функций ниже перенесены из export.js как есть (тела 1:1).
// Внутри них bare-вызовы printPdfShell/buildPhotoGridHTML/generatePdfChart/
// generatePosterData/exportPdfData резолвятся напрямую (обычный
// внутримодульный вызов, hoisting) — раньше резолвились через window.X,
// установленный в подшаге 1. Единственные вызыватели этих 5 функций
// (handleFabExportAction v1/v2, renderReportFromTemplate) остаются в
// export.js и продолжают вызывать их bare-именем через window.X (см. блок
// обратной совместимости ниже — эта группа завершает G1 целиком).

// 6. Сводный отчет для руководителя (One-Pager - Формат А3 Альбомный)
async function exportPdfOnePager(data, mode = 'script') {
    if (data.length === 0) return showToast('Нет данных для выгрузки');
    const _allInspections = _getAllInspections();

    let projName = document.getElementById('inp-project')?.value || 'Не указан';
    if (_analyticsFilters().project && _analyticsFilters().project.length > 0) {
        projName = _analyticsFilters().project.join(', ');
    }

    let sumUrk = 0; let sumB3 = 0; let sumDoc = 0; let cntDoc = 0;
    data.forEach(i => {
        if (i.metrics) {
            sumUrk += Number(i.metrics.final) || 0;
            sumB3 += Number(i.metrics.n_B3_fail) || 0;
            const docScore = (i.metrics.documentary !== undefined) ? i.metrics.documentary : (typeof window.getDocumentaryScore === 'function' && i.state && i.templateKey ? (() => {
                const tType = i.templateKey.split('_')[0];
                const tKey = i.templateKey.replace(tType + '_', '');
                const cl = tType === 'sys' && _templates().getSystemTemplates()[tKey] ? _templates().getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                return window.getDocumentaryScore(i.state, getFlatList(cl));
            })() : null);
            if (docScore !== null && docScore !== undefined) { sumDoc += docScore; cntDoc++; }
        }
    });
    const currAvgUrk = data.length > 0 ? Math.round(sumUrk / data.length) : 0;
    const currAvgDoc = cntDoc > 0 ? Math.round(sumDoc / cntDoc) : null;

    const groupedC = {};
    data.forEach(item => {
        const cKey = (item.contractorName || 'Неизвестно') + ' [' + (item.projectName || 'Без объекта') + ']';
        groupedC[cKey] = groupedC[cKey] || [];
        groupedC[cKey].push(item);
    });
    const currContractorsCount = Object.keys(groupedC).length;

    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, _templates().getUserTemplates()) : null;
    const mData = currIntMetrics || { redZonePerc: 0, IKO: "0.00", ikoStatus: "Мало данных", ikoColor: "text-slate-500" };
    const docGapPdfWarning = (currAvgDoc !== null && Math.abs(currAvgUrk - currAvgDoc) > 30)
        ? `<div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:8px 10px; margin-bottom:8px; font-size:${mode === 'browser' ? '8pt' : '10px'}; font-weight:900; color:#c2410c; text-align:center;">⚠️ Разрыв физика (${currAvgUrk}%) / документация (${currAvgDoc}%) — ${Math.abs(currAvgUrk - currAvgDoc)} п.п.</div>`
        : '';

    let pdfIkoColor = "#64748b";
    if (mData.ikoColor.includes('red')) pdfIkoColor = "#dc2626";
    else if (mData.ikoColor.includes('orange')) pdfIkoColor = "#f59e0b";
    else if (mData.ikoColor.includes('green')) pdfIkoColor = "#16a34a";

    const ratingData = [];
    for (let cName in groupedC) {
        if (groupedC[cName].length >= 3) {
            const m = getContractorMetrics(groupedC[cName], _templates().getUserTemplates());
            if (m) ratingData.push({ name: cName, val: m.finalC, count: m.count, b3: m.n_изделий_с_B3, isPrelim: m.count < 7 });
        }
    }
    ratingData.sort((a, b) => b.val - a.val);

    const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
    let prevData = [];
    const now = new Date();
    let trendLabel = "к 1-й пол. базы";

    if (selPeriod === 'WEEK') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 7);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 7);
        prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        trendLabel = "к прош. нед.";
    } else if (selPeriod === 'MONTH') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 30);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 30);
        prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        trendLabel = "к прош. мес.";
    } else if (selPeriod === 'CUSTOM') {
        trendLabel = "к пред. периоду";
    } else {
        const half = Math.floor(data.length / 2);
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        prevData = sortedData.slice(0, half);
    }

    let prevAvgUrk = 0; let prevIko = "0.00"; let prevChecks = prevData.length; let prevContrsCount = 0;
    if (prevData.length > 0) {
        let pSum = 0; prevData.forEach(i => pSum += (i.metrics?.final || 0));
        prevAvgUrk = Math.round(pSum / prevData.length);
        const pGrouped = {}; prevData.forEach(i => pGrouped[i.contractorName] = true);
        prevContrsCount = Object.keys(pGrouped).length;
        const pInt = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevData, _templates().getUserTemplates()) : null;
        if (pInt) prevIko = pInt.IKO;
    }

    const renderTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === "" || isNaN(prev)) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '7pt' : '10px'}; font-weight:bold; background:#f1f5f9; padding:2px 4px; border-radius:4px;">Нет базы</span></div>`;
        let diff = (parseFloat(curr) - parseFloat(prev));
        if (Math.abs(diff) < 0.01) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '10pt' : '14px'}; font-weight:900;">▬ 0</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626';
        const sign = diff > 0 ? '▲' : '▼';
        return `<div style="text-align:right;"><span style="color:${color}; font-size:${mode === 'browser' ? '12pt' : '16px'}; font-weight:900;">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff) ? 0 : 2)}</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
    };

    const sparkLabels = []; const sparkData = [];
    for (let i = 5; i >= 0; i--) {
        const dStart = new Date(); dStart.setDate(now.getDate() - (i * 7) - 7);
        const dEnd = new Date(); dEnd.setDate(now.getDate() - (i * 7));
        const weekChecks = _allInspections.filter(c => { const d = new Date(c.date); return d >= dStart && d < dEnd; });
        let wSum = 0; weekChecks.forEach(c => wSum += (c.metrics?.final || 0));
        sparkLabels.push(`-${i}н`);
        sparkData.push(weekChecks.length > 0 ? Math.round(wSum / weekChecks.length) : null);
    }

    let b3Map = {}; let b2Map = {}; let okMap = {};
    data.forEach(i => {
        if (i.state && i.details && i.templateKey) {
            Object.keys(i.state).forEach(id => {
                const s = i.state[id];
                let defName = "Дефект";
                const tType = i.templateKey.split('_')[0];
                const tKey = i.templateKey.replace(tType + '_', '');
                const cl = tType === 'sys' && _templates().getSystemTemplates()[tKey] ? _templates().getSystemTemplates()[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                const foundItem = getFlatList(cl).find(x => x.id == id);
                if (foundItem) defName = foundItem.n;
                const photo = getItemPhotos(i, id)[0] || null;

                if (s === 'fail' || s === 'fail_escalated') {
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

    const topB3 = Object.values(b3Map).sort((a, b) => b.count - a.count).slice(0, 5);
    const topB2 = Object.values(b2Map).sort((a, b) => b.count - a.count).slice(0, 5);
    const topOK = Object.values(okMap).sort((a, b) => b.count - a.count).slice(0, 5);

    const cSpark = document.getElementById('op-sparkline-chart');
    let imgSpark = '';
    if (cSpark && cSpark.width > 0 && cSpark.height > 0) {
        try {
            imgSpark = `<img style="width:100%; height:100%; object-fit:cover; opacity: 0.4; display:block;" src="${cSpark.toDataURL('image/png')}">`;
        } catch (e) { }
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
        ${docGapPdfWarning}
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
                                    ${currAvgDoc !== null ? `<div style="font-size: ${fontSizeSmall}; color: #4f46e5; font-weight: 700; margin-top: 3px;">Докум.: ${currAvgDoc}%</div>` : ''}
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
                            <td style="padding: 0 4px 8px 0;">
                                <div style="background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fecaca; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                                    <div style="font-size: ${fontSizeSmall}; color: #991b1b; text-transform: uppercase; font-weight: 900;">В красной зоне</div>
                                    <div style="font-size: ${fontSizeNum}; font-weight: 900; color: #dc2626; margin-top: 5px; line-height: 1;">${mData.redZonePerc}%</div>
                                </div>
                            </td>
                            <td style="padding: 0 0 8px 4px;">
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

async function exportPdfGlobalOnePager(data, mode = 'script') {
    if (data.length === 0) return showToast('Нет данных для выгрузки');
    const _allInspections = _getAllInspections();

    // ==========================================
    // 1. РАСЧЕТ ГЛОБАЛЬНЫХ МЕТРИК И ТРЕНДОВ
    // ==========================================
    let globalSumUrk = 0;
    data.forEach(i => { if (i.metrics) globalSumUrk += Number(i.metrics.final) || 0; });
    const globalAvgUrk = data.length > 0 ? Math.round(globalSumUrk / data.length) : 0;

    const globalIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, _templates().getUserTemplates()) : null;
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
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 7);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 7);
        prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        trendLabel = "к прош. нед.";
    } else if (selPeriod === 'MONTH') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 30);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 30);
        prevData = _allInspections.filter(i => new Date(i.date) >= startPrev && new Date(i.date) < startCurr);
        trendLabel = "к прош. мес.";
    } else if (selPeriod === 'CUSTOM') {
        trendLabel = "к пред. периоду";
    } else {
        const half = Math.floor(data.length / 2);
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        prevData = sortedData.slice(0, half);
    }

    let prevGlobalAvgUrk = 0; let prevGlobalIko = "0.00"; let prevGlobalChecks = prevData.length; let prevGlobalContrs = 0;
    if (prevData.length > 0) {
        let pSum = 0; prevData.forEach(i => pSum += (i.metrics?.final || 0));
        prevGlobalAvgUrk = Math.round(pSum / prevData.length);
        prevGlobalContrs = new Set(prevData.map(i => i.contractorName).filter(Boolean)).size;
        const pInt = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevData, _templates().getUserTemplates()) : null;
        if (pInt) prevGlobalIko = pInt.IKO;
    }

    const renderTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === "" || isNaN(prev)) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '7pt' : '10px'}; font-weight:bold; background:#f1f5f9; padding:2px 4px; border-radius:4px;">Нет базы</span></div>`;
        let diff = (parseFloat(curr) - parseFloat(prev));
        if (Math.abs(diff) < 0.01) return `<div style="text-align:right;"><span style="color:#94a3b8; font-size:${mode === 'browser' ? '10pt' : '14px'}; font-weight:900;">▬ 0</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626';
        const sign = diff > 0 ? '▲' : '▼';
        return `<div style="text-align:right;"><span style="color:${color}; font-size:${mode === 'browser' ? '12pt' : '16px'}; font-weight:900;">${sign} ${Math.abs(diff).toFixed(Number.isInteger(diff) ? 0 : 2)}</span><div style="font-size:${mode === 'browser' ? '6pt' : '8px'}; color:#94a3b8; margin-top:2px; text-transform:uppercase;">${label}</div></div>`;
    };

    const formatTrendInline = (curr, prev, inverse = false) => {
        if (!prev || isNaN(prev)) return '';
        let diff = parseFloat(curr) - parseFloat(prev);
        if (Math.abs(diff) < 0.01) return `<span style="color:#94a3b8; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">▬ 0</span>`;
        const isGood = inverse ? diff < 0 : diff > 0;
        const color = isGood ? '#16a34a' : '#dc2626';
        const sign = diff > 0 ? '▲' : '▼';
        return `<span style="color:${color}; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">${sign}${Math.abs(diff).toFixed(Number.isInteger(diff) ? 0 : 2)}</span>`;
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
        pData.forEach(i => { if (i.metrics) pSumUrk += Number(i.metrics.final) || 0; });
        const pAvgUrk = pData.length > 0 ? Math.round(pSumUrk / pData.length) : 0;
        const pMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(pData, _templates().getUserTemplates()) : null;
        const IKO = pMetrics ? pMetrics.IKO : "0.00";
        if (pMetrics) redZone = pMetrics.redZonePerc;

        const prevPData = prevProjectsMap[pName] || [];
        let pPrevAvgUrk = 0; let pPrevIKO = "0.00";
        if (prevPData.length > 0) {
            let ppSum = 0; prevPData.forEach(i => ppSum += (i.metrics?.final || 0));
            pPrevAvgUrk = Math.round(ppSum / prevPData.length);
            const ppMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(prevPData, _templates().getUserTemplates()) : null;
            if (ppMetrics) pPrevIKO = ppMetrics.IKO;
        }

        let urkGrowth = pPrevAvgUrk ? (pAvgUrk - pPrevAvgUrk) : 0;
        let ikoDrop = pPrevIKO ? (parseFloat(pPrevIKO) - parseFloat(IKO)) : 0;

        return { name: pName, data: pData, avgUrk: pAvgUrk, prevAvgUrk: pPrevAvgUrk, IKO: IKO, prevIKO: pPrevIKO, urkGrowth, ikoDrop, redZone, prevCount: prevPData.length };
    });

    // ==========================================
    // 3. ПОДРЯДЧИКИ В ЗОНЕ РИСКА ПО ВСЕЙ КОМПАНИИ
    // ==========================================
    const allContrMap = {};
    data.forEach(c => {
        const cKey = `${c.contractorName} [${c.projectName || 'Без объекта'}]`;
        if (!allContrMap[cKey]) allContrMap[cKey] = [];
        allContrMap[cKey].push(c);
    });

    let riskContractors = [];
    for (let cKey in allContrMap) {
        if (allContrMap[cKey].length >= 3) {
            const m = getContractorMetrics(allContrMap[cKey], _templates().getUserTemplates());
            if (m && (m.finalC < 70 || m.n_изделий_с_B3 > 0)) {
                riskContractors.push({ name: cKey, final: m.finalC, b3: m.n_изделий_с_B3 });
            }
        }
    }
    riskContractors.sort((a, b) => a.final - b.final); // Худшие сверху

    // ==========================================
    // 4. ТИТУЛЬНЫЙ ЛИСТ
    // ==========================================
    const projectsByUrk = [...projectsArray].sort((a, b) => b.avgUrk - a.avgUrk);

    const topGrowth = [...projectsArray].filter(p => p.urkGrowth > 0).sort((a, b) => b.urkGrowth - a.urkGrowth).slice(0, 3);
    const topDrop = [...projectsArray].filter(p => p.urkGrowth < 0).sort((a, b) => a.urkGrowth - b.urkGrowth).slice(0, 3);

    const renderObjectTableRow = (p) => {
        const urkColor = p.avgUrk < 70 ? '#ef4444' : (p.avgUrk < 85 ? '#f59e0b' : '#22c55e');
        const ikoColor = parseFloat(p.IKO) >= 0.6 ? '#dc2626' : (parseFloat(p.IKO) >= 0.3 ? '#f59e0b' : '#16a34a');

        let urkTrend = "";
        if (p.prevAvgUrk) {
            const diff = p.avgUrk - p.prevAvgUrk;
            if (diff > 0) urkTrend = `<span style="color:#16a34a; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">▲${Math.abs(diff)}</span>`;
            else if (diff < 0) urkTrend = `<span style="color:#dc2626; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">▼${Math.abs(diff)}</span>`;
            else urkTrend = `<span style="color:#94a3b8; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">▬0</span>`;
        }

        let ikoTrend = "";
        if (p.prevIKO && p.prevIKO !== "0.00") {
            const diff = parseFloat(p.IKO) - parseFloat(p.prevIKO);
            if (diff < 0) ikoTrend = `<span style="color:#16a34a; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">▼${Math.abs(diff).toFixed(2)}</span>`;
            else if (diff > 0) ikoTrend = `<span style="color:#dc2626; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">▲${Math.abs(diff).toFixed(2)}</span>`;
            else ikoTrend = `<span style="color:#94a3b8; font-size:${mode === 'browser' ? '7pt' : '9px'}; margin-left:4px;">▬0</span>`;
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
        // --- ВСТАВКА: ОПРЕДЕЛЯЕМ ЛОКАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ШАБЛОНА ---
        const currAvgUrk = proj.avgUrk;
        const prevAvgUrk = proj.prevAvgUrk;
        const prevIko = proj.prevIKO;
        const prevChecks = proj.prevCount || 0;
        const mData = {
            IKO: proj.IKO,
            redZonePerc: proj.redZone
        };
        let pdfIkoColor = '#64748b';
        if (parseFloat(mData.IKO) >= 0.6) pdfIkoColor = '#dc2626';
        else if (parseFloat(mData.IKO) >= 0.3) pdfIkoColor = '#d97706';
        else pdfIkoColor = '#16a34a';
        // ------------------------------------------------------------
        const pContractorsCount = new Set(pData.map(i => i.contractorName).filter(Boolean)).size;

        let pIkoColor = "#64748b";
        if (proj.IKO >= 0.6) pIkoColor = "#dc2626";
        else if (proj.IKO >= 0.3) pIkoColor = "#d97706";
        else pIkoColor = "#16a34a";

        const sparkLabels = []; const sparkData = [];
        for (let i = 5; i >= 0; i--) {
            const dStart = new Date(); dStart.setDate(now.getDate() - (i * 7) - 7);
            const dEnd = new Date(); dEnd.setDate(now.getDate() - (i * 7));
            const weekChecks = pData.filter(c => { const d = new Date(c.date); return d >= dStart && d < dEnd; });
            let wSum = 0; weekChecks.forEach(c => wSum += (c.metrics?.final || 0));
            sparkLabels.push(`-${i}н`);
            sparkData.push(weekChecks.length > 0 ? Math.round(wSum / weekChecks.length) : null);
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
        for (let cName in groupedC) {
            if (groupedC[cName].length >= 3) {
                const m = getContractorMetrics(groupedC[cName], _templates().getUserTemplates());
                if (m) ratingData.push({ name: cName, val: m.finalC });
            }
        }
        ratingData.sort((a, b) => b.val - a.val);
        const topContrs = ratingData.slice(0, 10).map(r => r.name);

        const lineData = buildTrendChartData(pData, 'contractorName', topContrs, 'MONTH');
        lineData.datasets.forEach(ds => { ds.borderWidth = 2; ds.pointRadius = 2; });
        const lineUrl = generatePdfChart({
            type: 'line', data: lineData,
            options: { scales: { y: { min: 0, max: 100, ticks: { font: { size: 9 } } }, x: { ticks: { font: { size: 9 } } } }, plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 8 } } } } }
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
            if (i.state && i.photos && i.templateKey) {
                Object.keys(i.state).forEach(id => {
                    const s = i.state[id];
                    let defName = "Дефект";
                    const flatList = getFlatList(_templates().getUserTemplates()[i.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[i.templateKey.replace('sys_', '')]?.groups);
                    const foundItem = flatList.find(x => x.id == id);
                    if (foundItem) defName = foundItem.n;
                    const photo = getItemPhotos(i, id)[0] || null;

                    if (s === 'fail' || s === 'fail_escalated') {
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

        const topB3 = Object.values(b3Map).sort((a, b) => b.count - a.count).slice(0, 5);
        const topB2 = Object.values(b2Map).sort((a, b) => b.count - a.count).slice(0, 5);
        const topOK = Object.values(okMap).sort((a, b) => b.count - a.count).slice(0, 5);

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

        // =========================================================
        // === СБОРКА БЛОКОВ (КУБИКОВ) ДЛЯ ШАБЛОНИЗАТОРА ===
        // =========================================================
        const blocksMap = {
            'header_metrics': `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
                <tr>
                    <td style="padding: 0 4px 8px 0; width:50%;">
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Глобальный УрК</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${globalAvgUrk}%</td><td>${renderTrend(globalAvgUrk, prevGlobalAvgUrk, trendLabel)}</td></tr></table>
                        </div>
                    </td>
                    <td style="padding: 0 0 8px 4px; width:50%;">
                        <div style="background: ${parseFloat(globalIKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 10px; border-radius: 8px; border: 1px solid ${parseFloat(globalIKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска (ИКО)</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: ${pdfIkoColorGlobal}; line-height: 1;">${globalIKO}</td><td>${renderTrend(globalIKO, prevGlobalIko, trendLabel, true)}</td></tr></table>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 0 4px 8px 0;">
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${data.length}</td><td>${renderTrend(data.length, prevGlobalChecks, trendLabel)}</td></tr></table>
                        </div>
                    </td>
                    <td style="padding: 0 0 8px 4px;">
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Подрядчиков</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${uniqueContractorsGlobal}</td><td>${renderTrend(uniqueContractorsGlobal, prevGlobalContrs, trendLabel)}</td></tr></table>
                        </div>
                    </td>
                </tr>
            </table>
            `,
            'trend_chart': `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 10px; height: auto; min-height:${mode === 'browser' ? '50mm' : '200px'}; box-sizing: border-box;">
                <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 5px; text-align: center;">📈 Динамика Подрядчиков</div>
                <div style="height:${mode === 'browser' ? '40mm' : '160px'}; text-align:center; overflow: hidden;">${imgLine ? imgLine : '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}</div>
            </div>
        `,
            'contractors_rating': `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; height: auto; min-height:${mode === 'browser' ? '60mm' : '250px'}; box-sizing: border-box;">
                <div style="font-size: ${mode === 'browser' ? '9pt' : '11px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; text-align: center;">🏆 Интегральный УрК</div>
                <div style="width: 100%;">${ratingHtml}</div>
            </div>
        `,
            'top_b3_photos': gridB3,
            'top_b2_photos': gridB2,
            'top_ok_photos': gridOK,
            'ai_summary': `
            <div class="no-break" style="background: ${isDanger ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${isDanger ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 8px 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; color: ${isDanger ? '#b45309' : '#166534'}; text-transform: uppercase; border-bottom: 2px solid ${isDanger ? '#fde047' : '#86efac'}; padding-bottom: 6px;">🎯 Управленческое Решение и Риски</h3>
                <div style="font-size: ${mode === 'browser' ? '10pt' : '13px'}; line-height: 1.5; color: #1e293b; columns: 2; column-gap: 20px;">${pdfFormattedText}</div>
            </div>
        `
        };

        let projectContent = '';

        // Если был передан активный шаблон из конструктора
        if (window._currentActiveTemplate) {
            const t = window._currentActiveTemplate;
            const activeBlocks = t.active_blocks || [];

            if (t.layout === 'one') {
                // Одна сплошная колонка
                projectContent = activeBlocks.map(b => blocksMap[b] || '').join('');
            } else {
                // Две колонки (Делим массив блоков пополам)
                const mid = Math.ceil(activeBlocks.length / 2);
                const leftBlocks = activeBlocks.slice(0, mid).map(b => blocksMap[b] || '').join('');
                const rightBlocks = activeBlocks.slice(mid).map(b => blocksMap[b] || '').join('');

                let w1 = '50%', w2 = '50%';
                if (t.layout === 'two_uneven') { w1 = '35%'; w2 = '65%'; }

                projectContent = `
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <tr>
                        <td style="width: ${w1}; vertical-align: top; padding-right: 15px;">${leftBlocks}</td>
                        <td style="width: ${w2}; vertical-align: top;">${rightBlocks}</td>
                    </tr>
                </table>
            `;
            }

            // Добавляем текст подвала (Footer), если он указан в шаблоне
            if (t.footer_text) {
                projectContent += `<div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">${t.footer_text}</div>`;
            }

        } else {
            // КЛАССИЧЕСКИЙ СТАНДАРТНЫЙ МАКЕТ (Если шаблон не выбран)
            projectContent = `
            <h2 style="font-size: ${mode === 'browser' ? '14pt' : '20px'}; color: #4f46e5; text-transform: uppercase; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Аналитика по объекту: ${proj.name}</h2>
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <tr>
                    <td style="width: 32%; vertical-align: top; padding-right: 15px;">
                        ${blocksMap['header_metrics']}
                        ${blocksMap['trend_chart']}
                        ${blocksMap['contractors_rating']}
                    </td>
                    <td style="width: 68%; vertical-align: top;">
                        ${blocksMap['top_b3_photos']}
                        ${blocksMap['top_b2_photos']}
                        ${blocksMap['top_ok_photos']}
                        ${blocksMap['ai_summary']}
                    </td>
                </tr>
            </table>
        `;
        }

        // СШИВАЕМ ОТЧЕТЫ: приклеиваем страницу текущего объекта к основному документу с разрывом страницы
        content += '<div class="pdf-page-break page-break-before"></div>' + projectContent;
    }

    // ВЫЗЫВАЕМ ПЕЧАТЬ ОДИН РАЗ ДЛЯ ВСЕГО ДОКУМЕНТА (ВНЕ ЦИКЛА)
    const finalReportName = window._currentActiveTemplate ? window._currentActiveTemplate.name : "Сводный Отчет Компании";
    printPdfShell(finalReportName, content, "A3", "landscape", mode);
}



// generatePosterData — перенесена в reports.actions.js (группа G1,
// физический перенос, подшаг 1). Доступна как window.generatePosterData.

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

        const m = getContractorMetrics(cData, _templates().getUserTemplates());
        const workType = cData[0].templateTitle;
        const expertText = getExpertConclusion(m, currentDetailedContractor, workType, cData.length, 'print', _reports().getExpertConclusions()).pdfHtml;

        let photosB3 = []; let photosB2 = [];
        cData.forEach(check => {
            if (check.state && check.photos) {
                Object.keys(check.state).forEach(id => {
                    const s = check.state[id];
                    const idPhotos = getItemPhotos(check, id);
                    if ((s === 'fail' || s === 'fail_escalated') && idPhotos.length > 0) {
                        const flatList = getFlatList(_templates().getUserTemplates()[check.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[check.templateKey.replace('sys_', '')]?.groups);
                        const itemInfo = flatList.find(x => x.id == id);
                        const isB3 = s === 'fail_escalated' || (itemInfo && itemInfo.w === 3);
                        const defName = itemInfo ? itemInfo.n : 'Дефект';

                        idPhotos.forEach(src => {
                            if (isB3) photosB3.push({ src, name: defName, contr: check.contractorName });
                            else photosB2.push({ src, name: defName, contr: check.contractorName });
                        });
                    }
                });
            }
        });

        const fontSizeSmall = mode === 'browser' ? '8pt' : '10px';
        const fontSizeNum = mode === 'browser' ? '28pt' : '36px';

        let content = `
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
            if (i.metrics) {
                sumUrkProd += Number(i.metrics.final) || 0;
                sumB1 += Number(i.metrics.n_B1_fail) || 0;
                sumB2 += Number(i.metrics.n_B2_fail) || 0;
                sumB3 += Number(i.metrics.n_B3_fail) || 0;
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

        for (let cName in grouped) {
            const m = getContractorMetrics(grouped[cName], _templates().getUserTemplates());
            if (m) {
                cList.push({ name: cName, metrics: m, workType: grouped[cName][0].templateTitle });
                if (m.count >= 7) { sumIntegralUrk += m.finalC; validContrCount++; }
            }
        }
        cList.sort((a, b) => b.metrics.finalC - a.metrics.finalC);
        const avgIntegralUrk = validContrCount > 0 ? Math.round(sumIntegralUrk / validContrCount) : 0;

        const globalKey = 'global_main_analysis';
        let rawSmartText = _reports().getExpertConclusion(globalKey);
        let aiHtml = '';
        if (rawSmartText) {
            const isCustomText = !!_reports().getExpertConclusion(globalKey);
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
            const left = cList[i];
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
                        <div style="font-size:${fontSizeNum}; font-weight:900; color:${avgIntegralUrk < 70 ? '#dc2626' : (avgIntegralUrk < 85 ? '#d97706' : '#16a34a')};">${validContrCount > 0 ? avgIntegralUrk + '%' : 'СБОР'}</div>
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
    if (data.length === 0) return showToast('Нет данных для выгрузки');

    let projName = 'Все объекты';
    if (_analyticsFilters().project.length > 0) {
        projName = _analyticsFilters().project.join(', ');
    }

    // --- ДАННЫЕ ДЛЯ ТИТУЛЬНОГО ЛИСТА ---
    let sumUrkProd = 0;
    data.forEach(i => { if (i.metrics) { sumUrkProd += Number(i.metrics.final) || 0; } });
    const avgUrkProd = data.length > 0 ? Math.round(sumUrkProd / data.length) : 0;

    const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(data, _templates().getUserTemplates()) : null;
    const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
    const redZonePerc = currIntMetrics ? currIntMetrics.redZonePerc : 0;

    const grouped = {};
    data.forEach(item => {
        const cKey = `${item.contractorName} [${item.projectName || 'Без объекта'}]`;
        grouped[cKey] = grouped[cKey] || [];
        grouped[cKey].push(item);
    });

    const cList = [];
    for (let cName in grouped) {
        const m = getContractorMetrics(grouped[cName], _templates().getUserTemplates());
        if (m && m.count >= 3) {
            let b1 = 0, b2 = 0, b3 = 0;
            grouped[cName].forEach(i => { if (i.metrics) { b1 += Number(i.metrics.n_B1_fail) || 0; b2 += Number(i.metrics.n_B2_fail) || 0; b3 += Number(i.metrics.n_B3_fail) || 0; } });
            cList.push({ name: cName, metrics: m, workType: grouped[cName][0].templateTitle, data: grouped[cName], defects: { b1, b2, b3 } });
        }
    }
    cList.sort((a, b) => b.metrics.finalC - a.metrics.finalC);

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
        cData.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((check, i) => {
            dates.push(`#${i + 1}`); urkData.push(check.metrics.final);
        });

        const lineChartUrl = generatePdfChart({
            type: 'line',
            data: { labels: dates, datasets: [{ data: urkData, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', tension: 0.3, borderWidth: 2, fill: true, pointRadius: 2 }] },
            options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
        }, 500, 160);

        let photosB3 = []; let photosB2 = []; let photosOK = [];
        cData.forEach(check => {
            if (check.state && check.photos) {
                Object.keys(check.state).forEach(id => {
                    const s = check.state[id];
                    let defName = "Дефект";
                    const flatList = getFlatList(_templates().getUserTemplates()[check.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[check.templateKey.replace('sys_', '')]?.groups);
                    const item = flatList.find(x => x.id == id);
                    if (item) defName = item.n;

                    const idPhotos = getItemPhotos(check, id);
                    if ((s === 'fail' || s === 'fail_escalated') && idPhotos.length > 0) {
                        idPhotos.forEach(src => {
                            if (s === 'fail_escalated' || (item && item.w === 3)) photosB3.push({ src, name: defName });
                            else photosB2.push({ src, name: defName });
                        });
                    } else if (s === 'ok' && idPhotos.length > 0) {
                        idPhotos.forEach(src => photosOK.push({ src, name: defName }));
                    }
                });
            }
        });

        // Экспертное заключение
        let expertHtml = getExpertConclusion(m, cName, cObj.workType, cData.length, 'print', _reports().getExpertConclusions()).pdfHtml;
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
    const _allInspections = _getAllInspections();
    let weekData = [];
    let periodStr = '';

    if (_isDemoMode() && _allInspections.length > 0) {
        weekData = [..._allInspections].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 25);
        periodStr = 'Демонстрационный период';
    } else {
        const now = new Date();
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - (lastWeekEnd.getDay() || 7));
        lastWeekEnd.setHours(23, 59, 59, 999);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        lastWeekStart.setHours(0, 0, 0, 0);

        weekData = _allInspections.filter(i => {
            const d = new Date(i.date);
            return d >= lastWeekStart && d <= lastWeekEnd;
        });
        periodStr = `${lastWeekStart.toLocaleDateString('ru-RU')} — ${lastWeekEnd.toLocaleDateString('ru-RU')}`;
    }

    if (weekData.length === 0) return showToast("За выбранный период нет данных для плаката");

    const grouped = {};
    weekData.forEach(item => {
        if (!grouped[item.contractorName]) grouped[item.contractorName] = [];
        grouped[item.contractorName].push(item);
    });

    const candidates = [];
    let globalUrkSum = 0; let globalB3Count = 0;
    let allDefectPhotos = []; let allOkPhotos = [];

    for (let cName in grouped) {
        const cData = grouped[cName];
        if (cData.length >= 3) {
            const m = getContractorMetrics(cData, _templates().getUserTemplates());
            if (m) {
                cData.forEach(check => {
                    if (check.metrics) {
                        globalUrkSum += Number(check.metrics.final) || 0;
                        globalB3Count += Number(check.metrics.n_B3_fail) || 0;
                    }
                    if (check.photos && check.state) {
                        Object.keys(check.state).forEach(id => {
                            const flatList = getFlatList(_templates().getUserTemplates()[check.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[check.templateKey.replace('sys_', '')]?.groups);
                            const itemInfo = flatList.find(x => x.id == id);
                            const defName = itemInfo ? itemInfo.n : 'Дефект';
                            const idPhotos = getItemPhotos(check, id);

                            if (check.state[id] === 'ok') idPhotos.forEach(src => allOkPhotos.push({ src, contr: cName, name: defName }));
                            if (check.state[id] === 'fail' || check.state[id] === 'fail_escalated') idPhotos.forEach(src => allDefectPhotos.push({ src, contr: cName, name: defName }));
                        });
                    }
                });

                let growth = 0;
                if (!_isDemoMode()) {
                    const now = new Date();
                    const lastWeekEnd = new Date(now);
                    lastWeekEnd.setDate(lastWeekEnd.getDate() - (lastWeekEnd.getDay() || 7));
                    const prevStart = new Date(lastWeekEnd); prevStart.setDate(prevStart.getDate() - 13);
                    const prevEnd = new Date(lastWeekEnd); prevEnd.setDate(prevEnd.getDate() - 7);
                    const prevChecks = _allInspections.filter(i => i.contractorName === cName && new Date(i.date) >= prevStart && new Date(i.date) <= prevEnd);
                    if (prevChecks.length >= 3) {
                        const mPrev = getContractorMetrics(prevChecks, _templates().getUserTemplates());
                        if (mPrev) growth = m.finalC - mPrev.finalC;
                    }
                } else { growth = Math.floor(Math.random() * 15) + 2; }

                candidates.push({ name: cName, workType: cData[0].templateTitle, metrics: m, growth });
            }
        }
    }

    if (candidates.length === 0) return showToast("Недостаточно данных для формирования рейтинга");

    const avgObjectUrk = Math.round(globalUrkSum / weekData.length);
    const ikoMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(weekData, _templates().getUserTemplates()) : null;
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
                        ${isBad && c.metrics.n_изделий_с_B3 > 0 ? `<div style="margin-top:6px; font-size:${mode === 'browser' ? '8pt' : '10px'}; font-weight:bold; color:#991b1b; background:#fee2e2; padding:4px 6px; border-radius:4px; display:inline-block;">🚨 Крит. деф. (B3): ${c.metrics.n_изделий_с_B3} шт</div>` : ''}
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

// ============================================================================
// === ИМПОРТ И ЭКСПОРТ ДАННЫХ (ЕДИНЫЙ СУПЕР-БЭКАП, SHARE API, РЕЕСТР) ===
// Перенесено из export.js (группа G2, физический перенос, тела 1:1).
// Обратная совместимость через window.X = X (см. конец файла) обязательна:
// js/app.js:542-543 (checkScheduledBackups/checkAutoReports), index.html
// inline onclick/onchange, js/ai.js:184 (countPhotos), delegate-методы
// ReportsActions.exportData/shareBackup/openShareModal/importData (выше).
// ============================================================================

// Вспомогательная: подсчет фото в массиве проверок
function countPhotos(arr) {
    let count = 0;
    arr.forEach(c => { if (c.photos) count += Object.keys(c.photos).length; });
    return count;
}

// Генерирует объект бэкапа и возвращает объект + статистику
function generateBackupObject(mode) {
    const _allInspections = _getAllInspections();
    const userDocsToExport = _getCustomDocs().filter(d => !String(d.id).startsWith('sys_'));
    let historyToExport = Array.isArray(_allInspections) ? _allInspections.filter(i => !i._deleted) : [];

    if (mode === 'filtered') {
        historyToExport = getFilteredAnalyticsData();
    } else if (mode === 'incremental') {
        const lastFullDate = localStorage.getItem('last_full_backup_date');
        if (lastFullDate) historyToExport = _allInspections.filter(c => new Date(c.date) > new Date(lastFullDate));
    } else if (mode === 'manager') {
        const lastMgrDate = localStorage.getItem('last_share_to_manager_date');
        if (lastMgrDate) historyToExport = _allInspections.filter(c => new Date(c.date) > new Date(lastMgrDate));
    }

    historyToExport.sort((a, b) => new Date(a.date) - new Date(b.date));

    const stats = {
        checks: historyToExport.length,
        photos: countPhotos(historyToExport),
        twi: _getTwiCards().length,
        tmpl: Object.keys(_templates().getUserTemplates()).length
    };

    // ДОБАВЛЕНЫ HR ДАННЫЕ ДЛЯ ПАНЕЛИ РУКОВОДИТЕЛЯ (С Совещаниями и FMEA)
    const hrData = {
        weeklyPlanData: _getWeeklyPlan(),
        engineerAbsence: _getEngineerAbsence(),
        contractorStatuses: _getContractorStatuses(),
        schedule: _getSchedule(),
        interventions: _getInterventions(),
        practices: _getPractices(),
        meetings: _getMeetings(),
        fmea: _getFmea(),
        // --- ДОБАВЛЕНО ДЛЯ ПК СК ---
        skRecords: _getSkRecords().filter(r => !r._deleted),
        skVolumes: _getSkVolumes(),
        skContractorMap: _getSkContractorMap()
    };

    const obj = {
        type: "RBI_FULL_BACKUP",
        version: "17.4",
        timestamp: new Date().toISOString(),
        mode: mode,

        backupMeta: {
            backup_type: mode || 'local_backup',
            created_by:
                window.syncConfig?.engineerName ||
                _getSetting('engineerName') ||
                document.getElementById('inp-inspector')?.value?.trim() ||
                'Инженер',
            local_role: _getSetting('userRole') || 'engineer',
            cloud_role: _getSetting('userRole') || 'guest',
            cloud_status: _getSetting('cloudStatus') || _getSetting('cloud_status') || 'offline',
            project_code: window.syncConfig?.projectCode || '',
            device_id: window.syncConfig?.deviceId || '',
            created_at: new Date().toISOString()
        },

        data: {
            history: historyToExport,
            etalonActs: _getEtalonActs(), // НОВОЕ
            tasks: _getTasks(),          // НОВОЕ
            templates: _templates().getUserTemplates(),
            twi: _getTwiCards(),
            docs: userDocsToExport,
            nodes: _getCustomNodes(),
            expert: _reports().getExpertConclusions(),
            gameLogs: _getGameActionLogs(),
            hr: hrData
        }
    };

    return { obj, stats };
}

// Запись в реестр IndexedDB
async function logToBackupRegistry(typeStr, stats, fileName) {
    try {
        let logsObj = await _storage().get(_storage().stores().BACKUP_LOGS, 'main');
        let logs = logsObj && logsObj.data ? logsObj.data : [];

        logs.unshift({
            timestamp: new Date().toISOString(),
            dateStr: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            type: typeStr,
            stats: stats,
            fileName: fileName
        });

        if (logs.length > 50) logs = logs.slice(0, 50); // Ограничение 50 записей
        await _storage().put(_storage().stores().BACKUP_LOGS, { id: 'main', data: logs });
    } catch (e) { console.error("Ошибка записи в реестр бэкапов", e); }
}

// Очистка реестра
async function clearBackupRegistry() {
    if (!confirm("Очистить историю выгрузок? Сами данные проверок не удалятся.")) return;
    await _storage().put(_storage().stores().BACKUP_LOGS, { id: 'main', data: [] });
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
    const d2 = obj.data.history.length > 0 ? new Date(obj.data.history[obj.data.history.length - 1].date).toLocaleDateString('ru-RU') : '';
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
    const d2 = obj.data.history.length > 0 ? new Date(obj.data.history[obj.data.history.length - 1].date).toLocaleDateString('ru-RU') : '';
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
    if (_getSetting('autoBackupEnabled') && _getSetting('autoBackupDay') === dayOfWeek) {
        const lastRun = localStorage.getItem('last_auto_backup_run_date');
        if (lastRun !== todayStr) {
            console.log('Запуск автоматического полного бэкапа...');
            localStorage.setItem('last_auto_backup_run_date', todayStr);
            if (_getSetting('autoBackupShare')) {
                await shareBackupViaApi('full', true);
            } else {
                await handleDataExport('json', 'full', true);
            }
        }
    }

    // 2. Регулярная отправка руководителю (Только новые)
    if (_getSetting('autoManagerEnabled') && _getSetting('autoManagerDay') === dayOfWeek) {
        const lastRunMgr = localStorage.getItem('last_auto_manager_run_date');
        if (lastRunMgr !== todayStr) {
            console.log('Запуск регулярной отправки руководителю...');
            localStorage.setItem('last_auto_manager_run_date', todayStr);
            await shareBackupViaApi('manager', true);
        }
    }
}

// Автоматическая генерация PDF-отчетов
async function checkAutoReports() {
    if (!_getSetting('autoReportEnabled')) return;

    const today = new Date();
    const currentMonthStr = today.getFullYear() + '-' + (today.getMonth() + 1); // например, "2025-5"
    const lastRunMonth = localStorage.getItem('last_auto_report_month');

    // Проверяем: Наступил ли нужный день? И не делали ли мы уже отчет в этом месяце?
    if (today.getDate() >= parseInt(_getSetting('autoReportDay')) && lastRunMonth !== currentMonthStr) {

        console.log("Запуск автоматической фоновой генерации отчета...");
        // Ставим метку, что в этом месяце мы отчет уже сделали
        localStorage.setItem('last_auto_report_month', currentMonthStr);

        // Получаем все данные
        const data = getFilteredAnalyticsData();
        if (data.length === 0) return;

        // Запускаем генерацию в фоне
        if (_getSetting('autoReportType') === 'global_onepager') {
            await exportPdfGlobalOnePager(data, 'background');
        } else {
            await exportPdfOnePager(data, 'background');
        }
    }
}

function triggerManagerShareManual() { shareBackupViaApi('manager'); }
function triggerAutoBackupManual() {
    if (_getSetting('autoBackupShare')) shareBackupViaApi('full');
    else handleDataExport('json', 'full');
}

// Подготовка записи, импортированной из бэкапа.
// ВАЖНО: импортированный бэкап не должен автоматически попадать в облачную аналитику.
function markImportedRecordAsLocal(item, importBatchId, sourceName = 'backup') {
    const copy = { ...item };

    copy.source = 'local';
    copy.syncStatus = 'not_synced';
    copy.sync_status = 'not_synced';
    copy.syncBlockReason = '';
    copy.sync_block_reason = '';

    copy.importedFromBackup = true;
    copy.importBatchId = importBatchId;
    copy.importSource = sourceName;
    copy.importedAt = new Date().toISOString();

    // Если в старой записи нет новых полей объекта — заполняем fallback.
    if (!copy.project_canonical_key) {
        copy.project_canonical_key = copy.projectName || copy.project_name || '';
    }

    if (!copy.project_display_name) {
        copy.project_display_name = copy.projectName || copy.project_name || copy.project_canonical_key || '';
    }

    // Старое поле оставляем для совместимости.
    if (!copy.projectName && copy.project_display_name) {
        copy.projectName = copy.project_display_name;
    }

    copy.updatedAt = new Date().toISOString();

    return copy;
}
// Восстановление (Импорт) - без изменений, просто вызов существующей логики
function triggerDataImport() { document.getElementById('db-import-input').click(); }
function processDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const importBatchId = 'import_' + Date.now().toString(36);

    showToast("Чтение файла и безопасный импорт...");
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            let addedHist = 0, addedTmpl = 0, addedTwi = 0, addedDocs = 0;

            if (parsed.type === "RBI_FULL_BACKUP" && parsed.data) {
                if (parsed.data.history) {
                    const _arr = _getAllInspections();
                    for (const item of parsed.data.history) {
                        if (!_arr.find(x => x.id === item.id)) {
                            const importedItem = markImportedRecordAsLocal(item, importBatchId, 'history_backup');

                            _arr.push(importedItem);
                            await _storage().put(_storage().stores().HISTORY, importedItem);

                            addedHist++;
                        }
                    }

                    _arr.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
                if (parsed.data.tasks && Array.isArray(_getTasks())) {
                    const tasksRef1 = _getTasks();
                    for (const task of parsed.data.tasks) {
                        if (!tasksRef1.find(x => x.id === task.id)) {
                            const importedTask = markImportedRecordAsLocal(task, importBatchId, 'tasks_backup');

                            tasksRef1.push(importedTask);

                            if (typeof dbPut === 'function' && typeof STORES !== 'undefined') {
                                await _storage().put(_storage().stores().TASKS, importedTask);
                            }
                        }
                    }
                }
                if (parsed.data.templates) {
                    const _ut = _templates().getUserTemplates();
                    for (const key in parsed.data.templates) {
                        if (!_ut[key]) {
                            _ut[key] = parsed.data.templates[key];
                            await _storage().put(_storage().stores().TEMPLATES, { slug: key, data: parsed.data.templates[key] });
                            addedTmpl++;
                        }
                    }
                }
                if (parsed.data.twi) {
                    const twiContainer = _getTwiCards();
                    for (const item of parsed.data.twi) {
                        if (!twiContainer.find(x => x.id === item.id)) {
                            twiContainer.push(item);
                            await _storage().put(_storage().stores().TWI_CARDS, item); // <-- НОВОЕ ХРАНИЛИЩЕ
                            addedTwi++;
                        }
                    }
                }
                if (parsed.data.docs) {
                    const docsContainer = _getCustomDocs();
                    for (const item of parsed.data.docs) {
                        if (!docsContainer.find(x => x.id === item.id)) {
                            docsContainer.push(item);
                            addedDocs++;
                        }
                    }
                    await _storage().put(_storage().stores().SETTINGS, { key: 'custom_docs', data: docsContainer.filter(d => !String(d.id).startsWith('sys_')) });
                }
                if (parsed.data.expert) {
                    for (const key in parsed.data.expert) {
                        if (!_reports().getExpertConclusion(key)) _reports().setExpertConclusion(key, parsed.data.expert[key]);
                    }
                    if (typeof saveSessionData === 'function') saveSessionData();
                }

                // ИМПОРТ HR ДАННЫХ И НОВЫХ МОДУЛЕЙ
                if (parsed.data.hr) {
                    if (parsed.data.hr.weeklyPlanData) _setWeeklyPlan(parsed.data.hr.weeklyPlanData);
                    // engineerAbsence: единственная точка полной перезаписи, оставлена буквальной по
                    // прямому указанию плана — этот объект нигде больше не переприсваивается целиком.
                    if (parsed.data.hr.engineerAbsence && typeof engineerAbsence !== 'undefined') engineerAbsence = parsed.data.hr.engineerAbsence;

                    if (parsed.data.hr.contractorStatuses) {
                        var _contractorStatuses = _getContractorStatuses();
                        for (let k in parsed.data.hr.contractorStatuses) {
                            if (!_contractorStatuses[k]) _contractorStatuses[k] = parsed.data.hr.contractorStatuses[k];
                        }
                    }

                    // Импорт Совещаний
                    if (parsed.data.hr.meetings && Array.isArray(_getMeetings())) {
                        const meetingsRef = _getMeetings();
                        for (const item of parsed.data.hr.meetings) {
                            if (!meetingsRef.find(x => x.id === item.id)) {
                                meetingsRef.push(item);
                                await _storage().put(_storage().stores().MEETINGS, item);
                            }
                        }
                    }

                    // Импорт FMEA
                    if (parsed.data.hr.fmea && Array.isArray(_getFmea())) {
                        const fmeaRef = _getFmea();
                        for (const item of parsed.data.hr.fmea) {
                            if (!fmeaRef.find(x => x.id === item.id)) {
                                fmeaRef.push(item);
                                await _storage().put(_storage().stores().FMEA, item);
                            }
                        }
                    }

                    // <-- НОВОЕ: Импорт Воздействий (Интервенций)
                    if (parsed.data.hr.interventions && Array.isArray(_getInterventions())) {
                        const interventionsRef = _getInterventions();
                        for (const item of parsed.data.hr.interventions) {
                            if (!interventionsRef.find(x => x.id === item.id)) {
                                interventionsRef.push(item);
                                await _storage().put(_storage().stores().INTERVENTIONS, item);
                            }
                        }
                    }

                    // <-- НОВОЕ: Импорт Практик
                    if (parsed.data.hr.practices && Array.isArray(_getPractices())) {
                        const practicesRef = _getPractices();
                        for (const item of parsed.data.hr.practices) {
                            if (!practicesRef.find(x => x.id === item.id)) {
                                practicesRef.push(item);
                                await _storage().put(_storage().stores().PRACTICES, item);
                            }
                        }
                    }

                    // <-- НОВОЕ: Импорт Графика СМР
                    if (parsed.data.hr.schedule && Array.isArray(_getSchedule())) {
                        const scheduleRef = _getSchedule();
                        for (const item of parsed.data.hr.schedule) {
                            if (!scheduleRef.find(x => x.id === item.id)) {
                                scheduleRef.push(item);
                                await _storage().put(_storage().stores().SCHEDULE, item);
                            }
                        }
                    }
                }
                // <-- НОВОЕ: Импорт данных ПК СК
                if (parsed.data.hr.skRecords && Array.isArray(_getSkRecords())) {
                    const skRecordsRef = _getSkRecords();
                    for (const item of parsed.data.hr.skRecords) {
                        if (!skRecordsRef.find(x => x.id === item.id)) {
                            skRecordsRef.push(item);
                            await _storage().put(_storage().stores().SK_RECORDS, item);
                        }
                    }
                }
                if (parsed.data.hr.skVolumes && _getSkVolumes()) {
                    const skVolumesRef = _getSkVolumes();
                    for (const key in parsed.data.hr.skVolumes) {
                        skVolumesRef[key] = parsed.data.hr.skVolumes[key];
                    }
                    await _storage().put(_storage().stores().SK_VOLUMES, { id: 'main', data: skVolumesRef }); // <-- НОВОЕ ХРАНИЛИЩЕ
                }
                if (parsed.data.hr.skContractorMap && _getSkContractorMap()) {
                    const skContractorMapRef = _getSkContractorMap();
                    for (const key in parsed.data.hr.skContractorMap) {
                        skContractorMapRef[key] = parsed.data.hr.skContractorMap[key];
                    }
                    await _storage().put(_storage().stores().SK_CONTRACTOR_MAP, { id: 'main', data: skContractorMapRef }); // <-- НОВОЕ ХРАНИЛИЩЕ
                }
                // <-- НОВОЕ: ИМПОРТ ЗАДАЧ ПЛАНИРОВЩИКА
                if (parsed.data.tasks && Array.isArray(_getTasks())) {
                    const tasksRef2 = _getTasks();
                    for (const item of parsed.data.tasks) {
                        if (!tasksRef2.find(x => x.id === item.id)) {
                            tasksRef2.push(item);
                            await _storage().put(_storage().stores().TASKS, item);
                        }
                    }
                }

                // <-- НОВОЕ: ИМПОРТ ЭТАЛОНОВ
                if (parsed.data.etalonActs && typeof etalonActsArray !== 'undefined') {
                    const etalonActsContainer = _getEtalonActs();
                    for (const item of parsed.data.etalonActs) {
                        if (!etalonActsContainer.find(x => x.id === item.id)) {
                            etalonActsContainer.push(item);
                            await _storage().put(_storage().stores().ETALON_ACTS, item);
                        }
                    }
                }

                // Импорт ПК СК из полного бэкапа.
                // Такие записи становятся локальными и не попадают в облачную аналитику автоматически.
                if (parsed.data.hr && parsed.data.hr.skRecords && Array.isArray(_getSkRecords())) {
                    let addedSk = 0;
                    const skRecordsRef2 = _getSkRecords();

                    for (const rec of parsed.data.hr.skRecords) {
                        if (!skRecordsRef2.find(x => String(x.id) === String(rec.id))) {
                            const importedSk = markImportedRecordAsLocal(rec, importBatchId, 'sk_backup');

                            if (!importedSk.uploaded_by) {
                                importedSk.uploaded_by =
                                    window.syncConfig?.engineerName ||
                                    _getSetting('engineerName') ||
                                    'Импорт';
                            }

                            if (!importedSk.sk_uploaded_by) importedSk.sk_uploaded_by = importedSk.uploaded_by;
                            if (!importedSk.imported_by) importedSk.imported_by = importedSk.uploaded_by;

                            skRecordsRef2.push(importedSk);

                            if (typeof dbPut === 'function' && typeof STORES !== 'undefined') {
                                await _storage().put(_storage().stores().SK_RECORDS, importedSk);
                            }

                            addedSk++;
                        }
                    }

                    if (addedSk > 0) {
                        console.log(`[Backup] Импортировано ПК СК: ${addedSk}`);
                    }
                }

                showToast(`✅ Базы слиты!\nПров: +${addedHist} | Ч/Л: +${addedTmpl}\nTWI: +${addedTwi} | НД: +${addedDocs}`);
            } else if (Array.isArray(parsed)) {
                const _arr2 = _getAllInspections();
                for (const item of parsed) {
                    if (!_arr2.find(x => x.id === item.id)) {
                        _arr2.push(item);
                        await _storage().put(_storage().stores().HISTORY, item);
                        addedHist++;
                    }
                }
                _arr2.sort((a, b) => new Date(b.date) - new Date(a.date));
                showToast(`✅ История объединена! Добавлено: ${addedHist} шт.`);
            } else { throw new Error("Неизвестный формат"); }
            // После импорта данные остаются локальными.
            // Облако само решит при следующей синхронизации, что можно отправлять.
            localStorage.setItem('rbi_cloud_dirty', '1');

            if (typeof renderCurrentAnalyticsTab === 'function') {
                renderCurrentAnalyticsTab();
            }

            if (typeof rbi_renderTasksList === 'function') {
                rbi_renderTasksList();
            }

            if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') window.RBI.events.emit('sk:renderRequested', { view: 'dashboard' });
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

export const ReportsActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    /**
     * Основная точка входа для генерации отчётов.
     * Делегирует в window.handleFabExportAction(actionType, mode).
     */
    generateReport(actionType, mode) {
        emitEvent('reports:generation:started', { actionType: actionType, mode: mode });
        ReportsState.setGenerating(true);
        try {
            if (typeof window.handleFabExportAction === 'function') {
                window.handleFabExportAction(actionType, mode);
            } else {
                console.warn('[ReportsActions] handleFabExportAction недоступен');
            }
        } finally {
            ReportsState.setGenerating(false);
            emitEvent('reports:generation:completed', { actionType: actionType, mode: mode });
        }
    },

    /**
     * Выгрузка отфильтрованной базы проверок в CSV/Excel.
     * Перенесено из export.js:exportFilteredCsv (группа G5).
     */
    exportCsv() {
        const data = getFilteredAnalyticsData();
        if (!data || data.length === 0) return showToast('Нет данных для выгрузки');
        const csv = exportToCSV(data);
        if (csv) {
            downloadFile(csv, `RBI_Filtered_Base_${new Date().toLocaleDateString('ru-RU')}.csv`, 'text/csv');
            showToast('✅ Таблица выгружена в Excel!');
        } else {
            showToast('❌ Ошибка при формировании файла');
        }
    },

    /**
     * Персональный PDF-отчёт о качестве СМР по конкретному подрядчику.
     * Перенесено из export.js:exportPersonalContractorReport (группа G3).
     */
    async exportPersonalReport(contractorName) {
        const data = getFilteredAnalyticsData().filter(c => c.contractorName + ' [' + (c.projectName || 'Без объекта') + ']' === contractorName);
        if (data.length === 0) return showToast('Нет данных для отчета');
        if (data.length < 7) return showToast('Слишком мало данных для отчета. Проведите минимум 7 проверок.');

        showToast("⚙️ Подготовка персонального отчета...");

        const cName = contractorName.split(' [')[0];
        const workType = data[0].templateTitle;

        const m = getContractorMetrics(data, _templates().getUserTemplates());
        const colorMain = m.finalC < 70 ? '#dc2626' : (m.finalC < 85 ? '#d97706' : '#16a34a');
        const bgMain = m.finalC < 70 ? '#fef2f2' : (m.finalC < 85 ? '#fffbeb' : '#f0fdf4');
        const borderMain = m.finalC < 70 ? '#fca5a5' : (m.finalC < 85 ? '#fde68a' : '#bbf7d0');

        const dates = []; const urkData = [];
        data.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((check, i) => {
            dates.push(`#${i + 1}`); urkData.push(check.metrics.final);
        });

        const lineChartUrl = generatePdfChart({
            type: 'line',
            data: { labels: dates, datasets: [{ data: urkData, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', tension: 0.3, borderWidth: 2, fill: true, pointRadius: 2 }] },
            options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
        }, 600, 200);

        let photosB3 = []; let photosB2 = []; let photosOK = [];
        let b1 = 0, b2 = 0, b3 = 0;
        data.forEach(check => {
            if (check.metrics) { b1 += Number(check.metrics.n_B1_fail) || 0; b2 += Number(check.metrics.n_B2_fail) || 0; b3 += Number(check.metrics.n_B3_fail) || 0; }
            if (check.state && check.photos) {
                Object.keys(check.state).forEach(id => {
                    const s = check.state[id];
                    let defName = "Дефект";
                    const flatList = getFlatList(_templates().getUserTemplates()[check.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[check.templateKey.replace('sys_', '')]?.groups);
                    const item = flatList.find(x => x.id == id);
                    if (item) defName = item.n;

                    const idPhotos = getItemPhotos(check, id);
                    if ((s === 'fail' || s === 'fail_escalated') && idPhotos.length > 0) {
                        idPhotos.forEach(src => {
                            if (s === 'fail_escalated' || (item && item.w === 3)) photosB3.push({ src, name: defName });
                            else photosB2.push({ src, name: defName });
                        });
                    } else if (s === 'ok' && idPhotos.length > 0) {
                        idPhotos.forEach(src => photosOK.push({ src, name: defName }));
                    }
                });
            }
        });

        let expertHtml = getExpertConclusion(m, cName, workType, data.length, contractorName.replace(/\W/g, '_'), _reports().getExpertConclusions()).pdfHtml;
        expertHtml = expertHtml.replace(/font-size:\s*1[234]px/g, 'font-size: 11px').replace(/margin-bottom:\s*1[05]px/g, 'margin-bottom: 8px');

        const content = `
        <div class="no-break" style="border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0 0 5px 0; font-size: 24px; color: #0f172a; text-transform: uppercase;">Отчет о качестве СМР: ${cName}</h1>
            <div style="font-size: 14px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Вид работ: ${workType} | Объект: ${contractorName.split(' [')[1].replace(']', '')}</div>
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
        _gameLogAction('ai_copy', 'sent_report');
    },

    /**
     * Показывает модальное окно с предложением перейти к формированию
     * протокола совещания после генерации отчёта.
     * Перенесено из export.js:promptMeetingAfterReport (группа G3).
     * Помечено как «вероятно мёртвый код» — переносится как есть.
     */
    promptMeetingAfterReport() {
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
    },

    /**
     * Запускает флоу создания совещания (переключение на вкладку Инженера,
     * подвкладку Совещаний и открытие рабочей области совещания).
     * Перенесено из export.js:startMeetingFlow (группа G3).
     * Вызывается по глобальному bare-имени из inline onclick, сгенерированного
     * promptMeetingAfterReport — обязателен window.startMeetingFlow (см. низ файла).
     * Помечено как «вероятно мёртвый код» — переносится как есть.
     */
    startMeetingFlow() {
        switchTab('tab-engineer');
        const btns = document.querySelectorAll('#engineer-subtabs-block .sub-tab-btn');
        if (btns[2]) rbi_switchEngineerSubTab('eng-sub-meetings', btns[2]);
        setTimeout(() => { rbi_createMeeting(); }, 300);
    },

    /**
     * Печать эталонного акта приёмки с фото зафиксированных элементов.
     * Перенесено из export.js:printEtalonAct (группа G4).
     */
    async printEtalon(historyId, mode = 'script') {
        const record = _getEtalonActs().find(c => c.id === historyId);
        // Акты «Акт-Эталон (Бета)» (Блок 2 плана OCR-sync + Акт-Эталон Beta)
        // имеют другую модель данных (details.actV18) — перенаправляем без
        // изменения вызывающих мест (interventions.js, history.render.js).
        if (record && record.source_kind === 'act_v18') return ReportsActions.printEtalonV18(historyId, mode);
        // «Акт-Эталон (Бета 2, ПК)» печатается собственной формой печати
        // оригинального шаблона (см. etalon-v18b.frame.html) — не через
        // printPdfShell, а нативным window.print() внутри iframe.
        if (record && record.source_kind === 'act_v18b') return ReportsActions.printEtalonV18B(historyId, mode);
        if (!record || !record.details || !record.details.elements) return showToast("Ошибка чтения Акта");

        const d = record.details;

        let elementsHtml = '';
        for (let i = 0; i < d.elements.length; i++) {
            const el = d.elements[i];
            let realPhotoSrc = '';
            if (el.photo) {
                realPhotoSrc = await PhotoManager.getAsyncUrl(el.photo) || window.getPhotoSrc(el.photo) || el.photo;
            }

            elementsHtml += `
                <table class="no-break" style="width: 100%; border: 2px solid #e2e8f0; border-left: 6px solid #4f46e5; border-radius: 10px; background: white; margin-bottom: 20px; border-collapse: collapse; table-layout: fixed;">
                    <tr>
                        <td style="padding: 15px; vertical-align: top; width: 40%;">
                            <h3 style="color: #312e81; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase;">${i + 1}. ${el.name}</h3>
                            <p style="font-size: 12px; color: #334155; white-space: pre-wrap; margin: 0; line-height: 1.5;">${el.desc || 'Описание отсутствует'}</p>
                        </td>
                        ${realPhotoSrc ? `<td style="padding: 15px; vertical-align: top; width: 60%; text-align: center;">
                            <div style="width: 100%; height: 300px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden;">
                                <img src="${realPhotoSrc}" style="width: 100%; height: 100%; object-fit: contain; display: block; margin: 0 auto;">
                            </div>
                        </td>` : ''}
                    </tr>
                </table>
            `;
        }

        const content = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">АКТ ПРИЕМКИ ЭТАЛОННОГО ОБРАЗЦА</h1>
                <div style="font-size: 14px; color: #4f46e5; font-weight: bold; margin-top: 5px; text-transform:uppercase;">От ${new Date(record.date).toLocaleDateString('ru-RU')}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; color: #0f172a;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold; width: 30%;">Подрядная организация:</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;">${record.contractorName}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold;">Вид работ:</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;">${record.templateTitle}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold;">Участок (Локация):</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;">${record.location}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold;">Участники приемки:</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; white-space: pre-wrap;">${d.participants}</td>
                </tr>
            </table>

            <div style="background: ${d.deviations !== 'Отклонений не выявлено' ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${d.deviations !== 'Отклонений не выявлено' ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 5px 0; font-size: 12px; color: ${d.deviations !== 'Отклонений не выявлено' ? '#b45309' : '#166534'}; text-transform: uppercase;">Отклонения и допущения:</h3>
                <p style="font-size: 12px; color: #1e293b; margin: 0; font-weight: bold; white-space: pre-wrap;">${d.deviations}</p>
            </div>

            <h2 style="font-size: 16px; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px;">Зафиксированные узлы и элементы</h2>

            ${elementsHtml}

            <div style="margin-top: 40px; page-break-inside: avoid;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <tr>
                        <td style="width: 33%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">Представитель Подрядчика</td>
                        <td style="width: 33%;"></td>
                        <td style="width: 33%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">Инженер строительного контроля</td>
                    </tr>
                </table>
            </div>
        `;

        printPdfShell(`Акт-Эталон: ${record.contractorName}`, content, "A4", "portrait", mode);
    },

    /**
     * Печать структурированного акта «Акт-Эталон (Бета)» (11 разделов,
     * см. Шаблон_акта_эталона_в_18.html) — Блок 2.4 плана OCR-sync + Акт-Эталон Beta.
     * Модель данных отличается от printEtalon: record.details.actV18 вместо
     * record.details.elements (source_kind === 'act_v18').
     */
    async printEtalonV18(historyId, mode = 'script') {
        const record = _getEtalonActs().find(c => c.id === historyId);
        if (!record || !record.details || !record.details.actV18) return showToast("Ошибка чтения Акта");

        const a = record.details.actV18;
        const h = a.header || {};
        const scope = a.scope || {};
        const decision = a.decision || {};

        const rowsHtml = (rows, cols, emptyLabel) => {
            if (!rows || !rows.length) return `<tr><td colspan="${cols.length + 1}" style="padding:8px;color:#94a3b8;text-align:center;font-size:11px;">${emptyLabel}</td></tr>`;
            return rows.map((r, i) => `<tr>
                <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;font-size:11px;">${i + 1}</td>
                ${cols.map(c => `<td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;white-space:pre-wrap;">${r[c] || ''}</td>`).join('')}
            </tr>`).join('');
        };

        const controlsHtml = (a.controls || []).map((c, i) => `<tr>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;font-size:11px;">${i + 1}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${c.criterion || ''}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${c.basis || ''}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${c.requirement || ''}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${c.actual || ''}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;text-align:center;">${c.compliance === 'yes' ? 'да' : c.compliance === 'no' ? 'нет' : c.compliance === 'na' ? 'н/п' : '—'}</td>
        </tr>`).join('') || `<tr><td colspan="6" style="padding:8px;color:#94a3b8;text-align:center;font-size:11px;">Не заполнено</td></tr>`;

        const participantsHtml = (a.participants || []).map((p, i) => `<tr>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;font-size:11px;">${i + 1}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${p.organization || ''}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${p.position || ''}</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${p.name || ''}</td>
        </tr>`).join('');

        const signaturesHtml = (a.participants || []).map(p => `<tr>
            <td style="padding:8px;border:1px solid #cbd5e1;font-size:11px;">${p.organization || ''}</td>
            <td style="padding:8px;border:1px solid #cbd5e1;font-size:11px;">${p.position || ''}</td>
            <td style="padding:8px;border:1px solid #cbd5e1;font-size:11px;">${p.name || ''}</td>
            <td style="padding:8px;border:1px solid #cbd5e1;font-size:11px;"></td>
        </tr>`).join('');

        let photosHtml = '';
        const photos = a.photos || [];
        for (let i = 0; i < photos.length; i++) {
            const p = photos[i];
            let realSrc = '';
            if (p.photo) realSrc = await PhotoManager.getAsyncUrl(p.photo) || window.getPhotoSrc(p.photo) || p.photo;
            photosHtml += `<div class="no-break" style="display:inline-block;width:48%;margin:1%;vertical-align:top;border:1px solid #cbd5e1;border-radius:8px;padding:10px;">
                <div style="font-size:10px;font-weight:900;color:#312e81;margin-bottom:6px;">Фото ${i + 1}${p.desc ? ' — ' + p.desc : ''}</div>
                ${realSrc ? `<div style="width:100%;height:180px;background:#f8fafc;border-radius:6px;overflow:hidden;"><img src="${realSrc}" style="width:100%;height:100%;object-fit:contain;"></div>` : '<div style="font-size:10px;color:#94a3b8;">Нет фото</div>'}
            </div>`;
        }

        const typeLabels = [];
        if (h.typeSmr) typeLabels.push('СМР');
        if (h.typeProduct) typeLabels.push('изделие');
        if (h.typeNode) typeLabels.push('конструктивный узел');
        if (h.typeFinish) typeLabels.push('фрагмент отделки');
        if (h.typeOther && h.typeOtherText) typeLabels.push(h.typeOtherText);

        const decisionLabels = { accepted: 'Согласован как эталон для последующего выполнения / поставки', conditional: 'Согласован после устранения замечаний раздела 8', rejected: 'Не согласован, требуется повторное предъявление' };
        const storageLabels = { stored: 'Сохраняется на объекте до завершения соответствующего вида работ', removed: 'Демонтируется после фотофиксации и оформления документации', concealed: 'Скрывается последующими работами после фотофиксации и оформления документации' };

        const content = `
            <div style="text-align:center;margin-bottom:20px;">
                <h1 style="font-size:22px;text-transform:uppercase;color:#0f172a;margin:0;font-weight:900;">АКТ СОГЛАСОВАНИЯ ЭТАЛОННОГО ОБРАЗЦА</h1>
                <div style="font-size:13px;color:#4f46e5;font-weight:bold;margin-top:5px;">${record.projectName || ''} · ${new Date(record.date).toLocaleDateString('ru-RU')}</div>
                ${typeLabels.length ? `<div style="font-size:11px;color:#475569;margin-top:3px;">Вид эталона: ${typeLabels.join(', ')}</div>` : ''}
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;">
                <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;width:30%;">Подрядная организация:</td><td style="padding:8px;border:1px solid #cbd5e1;">${record.contractorName}</td></tr>
                <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Вид работ:</td><td style="padding:8px;border:1px solid #cbd5e1;">${record.templateTitle}</td></tr>
                ${h.address ? `<tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Адрес объекта:</td><td style="padding:8px;border:1px solid #cbd5e1;">${h.address}</td></tr>` : ''}
                ${h.name ? `<tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Наименование эталона:</td><td style="padding:8px;border:1px solid #cbd5e1;">${h.name}</td></tr>` : ''}
                <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Место устройства:</td><td style="padding:8px;border:1px solid #cbd5e1;">${record.location || h.location || ''}</td></tr>
                ${h.inspectionDate ? `<tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Дата осмотра:</td><td style="padding:8px;border:1px solid #cbd5e1;">${new Date(h.inspectionDate).toLocaleDateString('ru-RU')}</td></tr>` : ''}
            </table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">1. Участники рассмотрения</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Организация</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Должность</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Ф.И.О.</th>
            </tr></thead><tbody>${participantsHtml}</tbody></table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">2. Состав, границы и область применения эталона</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px;">
                <tr><td style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;width:30%;">Состав и границы</td><td style="padding:6px 8px;border:1px solid #cbd5e1;white-space:pre-wrap;">${scope.sampleComposition || '—'}</td></tr>
                <tr><td style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Область применения</td><td style="padding:6px 8px;border:1px solid #cbd5e1;white-space:pre-wrap;">${scope.applicationZone || '—'}</td></tr>
                <tr><td style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Размер / объём образца</td><td style="padding:6px 8px;border:1px solid #cbd5e1;">${scope.sampleSize || '—'}</td></tr>
                <tr><td style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:bold;">Исключения из согласования</td><td style="padding:6px 8px;border:1px solid #cbd5e1;white-space:pre-wrap;">${scope.notIncluded || '—'}</td></tr>
            </table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">3. Исходные документы</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Документ</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Обозначение / номер / дата</th>
            </tr></thead><tbody>${rowsHtml(a.documents, ['doc', 'designation'], 'Документы не указаны')}</tbody></table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">4. Согласованное техническое и визуальное решение</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Элемент / параметр</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Согласованное решение</th>
            </tr></thead><tbody>${rowsHtml(a.solutions, ['element', 'solution'], 'Решения не указаны')}</tbody></table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">5. Примененные материалы, комплектующие и изделия</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Наименование</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Марка/тип</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Производитель</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Документ качества</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Цвет/фактура</th>
            </tr></thead><tbody>${rowsHtml(a.materials, ['name', 'mark', 'manufacturer', 'qualityDoc', 'color'], 'Материалы не указаны')}</tbody></table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">6. Контрольные параметры эталона</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Критерий</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Основание</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Требование</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Факт</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Соответствие</th>
            </tr></thead><tbody>${controlsHtml}</tbody></table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">7. Результаты осмотра и испытаний</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Вид проверки</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Метод / средство</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Результат / протокол</th>
            </tr></thead><tbody>${rowsHtml(a.tests, ['type', 'method', 'result'], 'Испытания не проводились')}</tbody></table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">8. Замечания и обязательные корректировки</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Замечание</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Ответственный</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Срок</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Отметка об устранении</th>
            </tr></thead><tbody>${rowsHtml(a.remarks, ['remark', 'responsible', 'deadline', 'closure'], 'Замечаний нет')}</tbody></table>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">9. Решение комиссии</h2>
            <div class="no-break" style="background:${decision.result === 'rejected' ? '#fef2f2' : '#f0fdf4'};border:2px solid ${decision.result === 'rejected' ? '#fecaca' : '#bbf7d0'};border-radius:8px;padding:12px;margin-bottom:10px;">
                <div style="font-size:12px;font-weight:900;color:${decision.result === 'rejected' ? '#b91c1c' : '#166534'};">${decisionLabels[decision.result] || 'Решение не зафиксировано'}</div>
            </div>
            <div style="font-size:11px;color:#334155;margin-bottom:10px;"><strong>Сохранность эталона:</strong> ${storageLabels[decision.storage] || 'не указано'}${decision.storagePlace ? '. Место: ' + decision.storagePlace : ''}</div>

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">10. Приложения</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">№</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Наименование приложения</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Кол-во листов/файлов</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Примечание</th>
            </tr></thead><tbody>${rowsHtml(a.attachments, ['name', 'qty', 'note'], 'Приложения не указаны')}</tbody></table>

            ${photosHtml ? `<h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">Приложение. Лист фотофиксации</h2><div>${photosHtml}</div>` : ''}

            <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin:16px 0 8px;">11. Подписи сторон</h2>
            <table class="no-break" style="width:100%;border-collapse:collapse;margin-bottom:10px;"><thead><tr>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Организация</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Должность</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Ф.И.О.</th>
                <th style="padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-size:10px;">Подпись / дата</th>
            </tr></thead><tbody>${signaturesHtml}</tbody></table>
        `;

        printPdfShell(`Акт-Эталон (Бета): ${record.contractorName}`, content, "A4", "portrait", mode);
    },

    /**
     * Печать «Акт-Эталон (Бета 2, ПК)» — не через printPdfShell (нет своего
     * HTML-рендера содержимого), а нативной формой печати оригинального
     * Шаблон_акта_эталона_в_18.html, встроенного через iframe: открывает
     * акт на редактирование (заполняет iframe данными) и вызывает
     * window.print() внутри iframe, где уже настроены @media print и
     * зеркалирование полей (см. etalon-v18b.frame.html).
     */
    async printEtalonV18B(historyId) {
        if (window.innerWidth < 768) return showToast('⚠️ Печать «Акт-Эталон (Бета 2)» доступна только на ПК');
        if (!window.EtalonV18BActions) return showToast('❌ Модуль Акт-Эталон (Бета 2) не загружен');

        await window.EtalonV18BActions.editAct(historyId);

        var tryPrint = function (attemptsLeft) {
            var frame = document.getElementById('etv18b-frame');
            if (frame && frame.contentWindow && typeof frame.contentWindow.rbiPrintActFromBridge === 'function') {
                frame.contentWindow.rbiPrintActFromBridge();
                return;
            }
            if (attemptsLeft > 0) setTimeout(function () { tryPrint(attemptsLeft - 1); }, 300);
        };
        setTimeout(function () { tryPrint(10); }, 600);
    },

    /**
     * Печать протокола совещания (Мемо) в PDF, расширенный шаблон А4.
     * Перенесено из export.js:rbi_printMeetingPdf (группа G3).
     */
    async printMeeting(id, mode = 'browser') {
        const meet = _getMeetings().find(m => m.id === id);
        if (!meet) return;

        showToast("⏳ Формируем протокол...");

        let photoHtml = '';
        if (meet.qDayPhoto) {
            const realSrc = await PhotoManager.getAsyncUrl(meet.qDayPhoto) || window.getPhotoSrc(meet.qDayPhoto);
            photoHtml = `
                <div style="height: 250px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px;">
                    <img src="${realSrc}" style="max-width: 100%; max-height: 100%; height: auto; width: auto; display: block; margin: 0 auto;">
                </div>
            `;
        }

        let agendaHtml = '';
        if (meet.agenda && meet.agenda.length > 0) {
            agendaHtml = meet.agenda.map((a, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; page-break-inside: avoid;">
                    <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top; width: 35%;">
                        <div style="font-size: 11px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">${a.contr}</div>
                        <div style="font-size: 11px; color: #b91c1c; font-weight: bold;">${a.defect}</div>
                    </td>
                    <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top; width: 45%;">
                        <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">${a.comment || 'Решение не зафиксировано'}</div>
                        ${a.resp ? `<div style="font-size: 9px; color: #64748b; font-weight: bold;">Отв: ${a.resp}</div>` : ''}
                    </td>
                    <td style="padding: 10px; vertical-align: top; width: 20%; text-align: center;">
                        <div style="background: ${a.isDone ? '#dcfce7' : '#ffedd5'}; color: ${a.isDone ? '#166534' : '#9a3412'}; padding: 4px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid ${a.isDone ? '#bbf7d0' : '#fed7aa'}; display: inline-block; margin-bottom: 4px;">${a.isDone ? 'Решено' : 'В работе'}</div>
                        ${a.date ? `<div style="font-size: 9px; color: #475569; font-weight: bold;">Срок: ${new Date(a.date).toLocaleDateString('ru-RU')}</div>` : ''}
                    </td>
                </tr>
            `).join('');
        }

        const content = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 22px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900; letter-spacing: 1px;">ПРОТОКОЛ СОВЕЩАНИЯ</h1>
                <div style="font-size: 12px; color: #4f46e5; font-weight: bold; margin-top: 5px;">ДАТА: ${new Date(meet.date).toLocaleDateString('ru-RU')} | АВТОР: ${meet.author}</div>
            </div>

            ${photoHtml}

            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="margin-top: 0; font-size: 13px; text-transform: uppercase; color: #16a34a; border-bottom: 2px solid #bbf7d0; padding-bottom: 6px; margin-bottom: 10px;">✅ ИТОГОВОЕ РЕШЕНИЕ (МЕМО)</h3>
                <div style="font-size: 12px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-weight: 500;">${meet.memoText || 'Текст протокола отсутствует.'}</div>
            </div>

            ${meet.notes ? `
            <div style="background: #fffbeb; border: 1px solid #fde047; padding: 15px; border-radius: 8px; margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="margin-top: 0; font-size: 13px; text-transform: uppercase; color: #b45309; border-bottom: 2px solid #fef08a; padding-bottom: 6px; margin-bottom: 10px;">📌 Дополнительные тезисы</h3>
                <div style="font-size: 11px; line-height: 1.5; color: #713f12; white-space: pre-wrap;">${meet.notes}</div>
            </div>` : ''}

            <h3 style="font-size: 14px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 15px;">📋 Детальная повестка и разбор дефектов</h3>
            
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #cbd5e1;">
                <thead style="background: #e2e8f0; text-transform: uppercase; font-size: 10px; color: #475569;">
                    <tr>
                        <th style="padding: 10px; border-right: 1px solid #cbd5e1; text-align: left;">Подрядчик и Проблема</th>
                        <th style="padding: 10px; border-right: 1px solid #cbd5e1; text-align: left;">Решение и Ответственный</th>
                        <th style="padding: 10px; text-align: center;">Статус и Срок</th>
                    </tr>
                </thead>
                <tbody>
                    ${agendaHtml || `<tr><td colspan="3" style="text-align: center; padding: 15px; font-size: 11px; color: #64748b;">Повестка не заполнена</td></tr>`}
                </tbody>
            </table>

            <div style="margin-top: 40px; page-break-inside: avoid;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <tr>
                        <td style="width: 40%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">${meet.author}</td>
                        <td style="width: 20%;"></td>
                        <td style="width: 40%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">Подпись участников (Ознакомлен)</td>
                    </tr>
                </table>
            </div>
        `;

        if (typeof printPdfShell === 'function') printPdfShell(`Протокол от ${new Date(meet.date).toLocaleDateString('ru-RU')}`, content, "A4", "portrait", mode);
    },

    /**
     * Печать FMEA-анализа (альбомная ориентация A3).
     * Перенесено из export.js:rbi_printFmeaPdf (группа G3).
     */
    async printFmea(fmeaId, mode = 'browser') {
        const record = _getFmea().find(f => f.id === fmeaId);
        if (!record) return showToast("Запись не найдена");

        showToast("⏳ Формируем документ...");

        const sortedDefects = [...record.defects].sort((a, b) => (parseInt(b.rpn) || 0) - (parseInt(a.rpn) || 0));

        let rowsHtml = '';
        for (let d of sortedDefects) {
            let rpnColor = '#16a34a';
            if (d.rpn >= 300) rpnColor = '#d97706';
            if (d.rpn >= 600) rpnColor = '#dc2626';

            let photoTd = `<div style="font-size:9px; color:#94a3b8; font-style:italic; border:1px dashed #cbd5e1; padding:10px; border-radius:4px;">Нет фото</div>`;
            if (d.photo) {
                const realSrc = await PhotoManager.getAsyncUrl(d.photo) || window.getPhotoSrc(d.photo);
                photoTd = `<img src="${realSrc}" style="width:70px; height:70px; object-fit:cover; border-radius:6px; border: 1px solid #cbd5e1; display:block; margin:0 auto;">`;
            }

            rowsHtml += `
            <tr style="border-bottom: 1px solid #cbd5e1; background: white; page-break-inside: avoid;">
                <td style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">
                    ${photoTd}
                </td>
                <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top;">
                    <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">${d.workTitle}</div>
                    <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 2px;">${d.contractor}</div>
                    <div style="font-size: 11px; color: #b91c1c; font-weight: bold; margin-top: 4px;">${d.defectName} (Повторов: ${d.count})</div>
                </td>
                <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top; font-size: 11px; color: #1e293b;">
                    <div style="font-size: 9px; background: #e2e8f0; display: inline-block; padding: 2px 4px; border-radius: 4px; margin-bottom: 4px; font-weight:bold;">${d.stage}</div>
                    <div>${d.cause || '-'}</div>
                </td>
                <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top; font-size: 11px; color: #1e293b;">${d.effect || '-'}</td>
                <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top; font-size: 11px; color: #1d4ed8; background: #eff6ff;">${d.fix || '-'}</td>
                <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top; font-size: 11px; color: #166534; background: #f0fdf4;">${d.prevent || '-'}</td>
                <td style="padding: 10px; vertical-align: top; text-align: center;">
                    <div style="font-size: 20px; font-weight: 900; color: ${rpnColor};">${d.rpn || 0}</div>
                </td>
            </tr>`;
        }

        const content = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">Анализ видов и последствий отказов (FMEA)</h1>
                <div style="font-size: 14px; color: #64748b; font-weight: bold; margin-top: 5px;">Отчет: ${record.title} | Период: ${record.periodName} | Инженер: ${record.author}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 2px solid #cbd5e1; table-layout: fixed;">
                <thead style="background: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #475569;">
                    <tr>
                        <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 10%; text-align: center;">ФОТО</th>
                        <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 18%; text-align: left;">1. Проблема / Подрядчик</th>
                        <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 16%; text-align: left;">2. Коренная причина</th>
                        <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 16%; text-align: left;">3. Риски и последствия</th>
                        <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 16%; text-align: left; color: #1d4ed8;">4. Устранение</th>
                        <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 18%; text-align: left; color: #166534;">5. Предотвращение</th>
                        <th style="padding: 12px 10px; border-bottom: 2px solid #cbd5e1; width: 6%; text-align: center; color: #7e22ce;">RPN</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            
            <div style="margin-top: 15px; font-size: 10px; color: #94a3b8; text-align: right;">
                *RPN (Risk Priority Number) — приоритетное число риска. Чем выше RPN, тем опаснее дефект.
            </div>
        `;

        if (typeof printPdfShell === 'function') {
            printPdfShell(`FMEA Анализ`, content, "A3", "landscape", mode);
        }
    },

    /**
     * Открыть модальное окно конструктора PDF-шаблонов: загружает шаблоны
     * из базы, отрисовывает список, показывает модалку.
     * Перенесено из export.js:openPdfTemplateModal (группа G5).
     */
    async openTemplateModal(type, mode) {
        const tmpls = await _storage().getAll(_storage().stores().REPORT_TEMPLATES);
        window.userReportTemplates = (tmpls || []).filter(t => !t.is_deleted);

        renderPdfTemplatesList();

        document.getElementById('pdf-template-editor').classList.add('hidden');

        const modal = document.getElementById('pdf-template-modal');
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    },

    /**
     * Экспорт графика производства работ (СМР) в PDF.
     * Перенесено из export.js:exportPdfSchedule (группа G4).
     */
    exportSchedulePdf(mode = 'script') {
        if (!_getSchedule() || _getSchedule().length === 0) {
            return showToast('График СМР пуст. Нет данных для выгрузки.');
        }

        const activeData = _getSchedule().filter(s => !s._deleted).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        let rowsHtml = activeData.map((s, i) => {
            const d1 = s.startDate ? new Date(s.startDate).toLocaleDateString('ru-RU') : '';
            const d2 = s.endDate ? new Date(s.endDate).toLocaleDateString('ru-RU') : '';
            const tmplName = s.templateKey ? (_templates().getSystemTemplates()[s.templateKey.replace('sys_', '')]?.title || _templates().getUserTemplates()[s.templateKey.replace('user_', '')]?.title || s.templateKey) : 'Не привязан';

            return `
            <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="border: 1px solid #cbd5e1; padding: 8px;"><b>${s.workTitle || 'Без названия'}</b></td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${s.contractor || '-'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:center;">${d1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:center;">${d2}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; color: #4f46e5; font-weight:bold;">${tmplName}</td>
            </tr>`;
        }).join('');

        const content = `
            <div class="no-break" style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 5px 0; text-transform: uppercase;">ГРАФИК ПРОИЗВОДСТВА РАБОТ (СМР)</h2>
                <div style="font-size: 12px; color: #64748b;">Актуальных этапов: <b>${activeData.length}</b></div>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #1e293b; table-layout: fixed;">
                <thead>
                    <tr style="background-color: #e2e8f0; font-weight: bold; text-transform: uppercase;">
                        <th style="border: 1px solid #94a3b8; padding: 10px; text-align: left; width: 30%;">Вид работ</th>
                        <th style="border: 1px solid #94a3b8; padding: 10px; text-align: left; width: 25%;">Подрядчик</th>
                        <th style="border: 1px solid #94a3b8; padding: 10px; width: 10%;">Начало</th>
                        <th style="border: 1px solid #94a3b8; padding: 10px; width: 10%;">Окончание</th>
                        <th style="border: 1px solid #94a3b8; padding: 10px; text-align: left; width: 25%;">Чек-лист проверки</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
        printPdfShell("График СМР", content, "A4", "landscape", mode);
    },

    /**
     * Экспорт дашборда стройконтроля (ПК СК) в PDF.
     * Перенесено из export.js:exportPdfSK (группа G4).
     */
    exportSkPdf(mode = 'script') {
        const skRecordsList = _getSkRecords();
        if (!skRecordsList.length) {
            return showToast('Нет загруженных замечаний ПК СК.');
        }

        let totalIssues = 0; let totalOpen = 0; let totalOverdue = 0;
        const contrMap = {};

        skRecordsList.forEach(r => {
            totalIssues++;
            const isOpen = r.status && r.status.toLowerCase().includes('не устран');
            if (isOpen) totalOpen++;

            const deadline = r.deadline ? new Date(r.deadline) : null;
            if (deadline && isOpen && new Date() > deadline) totalOverdue++;

            const c = r.contractor || 'Неизвестно';
            if (!contrMap[c]) contrMap[c] = { total: 0, open: 0, overdue: 0 };

            contrMap[c].total++;
            if (isOpen) contrMap[c].open++;
            if (deadline && isOpen && new Date() > deadline) contrMap[c].overdue++;
        });

        const sortedContrs = Object.keys(contrMap).sort((a, b) => contrMap[b].total - contrMap[a].total);

        let rowsHtml = sortedContrs.map((c, i) => {
            const d = contrMap[c];
            const overdueColor = d.overdue > 0 ? '#dc2626' : '#64748b';
            return `
            <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="border: 1px solid #cbd5e1; padding: 10px; font-weight:bold;">${c}</td>
                <td style="border: 1px solid #cbd5e1; padding: 10px; text-align:center; font-weight:bold; color: #4f46e5;">${d.total}</td>
                <td style="border: 1px solid #cbd5e1; padding: 10px; text-align:center; font-weight:bold; color: ${d.open > 0 ? '#ea580c' : '#16a34a'};">${d.open}</td>
                <td style="border: 1px solid #cbd5e1; padding: 10px; text-align:center; font-weight:bold; color: ${overdueColor};">${d.overdue}</td>
            </tr>`;
        }).join('');

        const content = `
            <div class="no-break" style="margin-bottom: 20px; text-align:center;">
                <h2 style="font-size: 24px; color: #0f172a; margin: 0 0 5px 0; text-transform: uppercase;">Дашборд Стройконтроля (Выгрузка ПК СК)</h2>
            </div>

            <table style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-bottom: 30px;" class="no-break">
                <tr>
                    <td style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Всего замечаний</div>
                        <div style="font-size:32px; font-weight:900; color:#0f172a;">${totalIssues}</div>
                    </td>
                    <td style="background:#fff7ed; border:1px solid #fdba74; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:10px; color:#9a3412; text-transform:uppercase; font-weight:bold;">Открыто сейчас</div>
                        <div style="font-size:32px; font-weight:900; color:#ea580c;">${totalOpen}</div>
                    </td>
                    <td style="background:#fef2f2; border:1px solid #fca5a5; border-radius:12px; padding:15px; text-align:center;">
                        <div style="font-size:10px; color:#991b1b; text-transform:uppercase; font-weight:bold;">Просрочено</div>
                        <div style="font-size:32px; font-weight:900; color:#dc2626;">${totalOverdue}</div>
                    </td>
                </tr>
            </table>

            <h3 style="font-size: 14px; text-transform: uppercase; color: #0f172a; margin-bottom: 10px;">📊 Статистика по подрядчикам</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #1e293b; table-layout: fixed;">
                <thead>
                    <tr style="background-color: #e2e8f0; font-weight: bold; text-transform: uppercase;">
                        <th style="border: 1px solid #94a3b8; padding: 10px; text-align: left; width: 40%;">Подрядчик</th>
                        <th style="border: 1px solid #94a3b8; padding: 10px; text-align: center; width: 20%;">Выдано СК</th>
                        <th style="border: 1px solid #94a3b8; padding: 10px; text-align: center; width: 20%;">Открыто</th>
                        <th style="border: 1px solid #94a3b8; padding: 10px; text-align: center; width: 20%;">Просрочка</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
        printPdfShell("Дашборд СК", content, "A4", "portrait", mode);
    },

    /**
     * Печать TWI-карты (инструктаж по рабочему месту) — INSPECTOR/WORKER.
     * Перенесено из export.js:printCurrentTwi (группа G3).
     */
    async printTwi(mode = 'browser') {
        const twiId = document.getElementById('twi-viewer-overlay').dataset.currentTwiId;
        if (!twiId) return;
        const card = _getTwiCards().find(c => c.id === twiId);
        if (!card) return;

        let content = '';

        const fsTitle = mode === 'browser' ? '12pt' : '16px';
        const fsText = mode === 'browser' ? '9pt' : '12px';
        const imgHeight = mode === 'browser' ? '40mm' : '180px';

        let resolvedGood = card.photoGood ? await PhotoManager.getAsyncUrl(card.photoGood) || window.getPhotoSrc(card.photoGood) : null;
        let resolvedBad = card.photoBad ? await PhotoManager.getAsyncUrl(card.photoBad) || window.getPhotoSrc(card.photoBad) : null;

        if (card.type === 'INSPECTOR') {
            let compliance = "", prep = "";
            if (card.howToCheck) {
                if (card.howToCheck.includes('[Как подготовить]')) {
                    const parts = card.howToCheck.split('[Как подготовить]\n');
                    prep = parts[1] || '';
                    compliance = parts[0].replace('[Что соблюсти]\n', '').trim();
                } else {
                    compliance = card.howToCheck.replace('[Что соблюсти]\n', '').trim();
                }
            }

            content = `
                <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                    <tr>
                        <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;">
                            <div style="color: #166534; margin: 0 0 10px 0; font-size: ${fsTitle}; font-weight: 900; text-transform: uppercase;">ЭТАЛОН (ПРАВИЛЬНО)</div>
                            ${resolvedGood ? `<div style="height: ${imgHeight}; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: white;"><img src="${resolvedGood}" style="max-width: 100%; max-height: 100%; height: auto; width: auto; display: block; margin: 0 auto;"></div>` : `<div style="height: ${imgHeight}; line-height: ${imgHeight}; color: #166534;">Нет фото</div>`}
                        </td>
                        <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;">
                            <div style="color: #991b1b; margin: 0 0 10px 0; font-size: ${fsTitle}; font-weight: 900; text-transform: uppercase;">БРАК (НАРУШЕНИЕ)</div>
                            ${resolvedBad ? `<div style="height: ${imgHeight}; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: white;"><img src="${resolvedBad}" style="max-width: 100%; max-height: 100%; height: auto; width: auto; display: block; margin: 0 auto;"></div>` : `<div style="height: ${imgHeight}; line-height: ${imgHeight}; color: #991b1b;">Нет фото</div>`}
                        </td>
                    </tr>
                </table>
                
                <table class="no-break" style="width: 100%; border-collapse: separate; border-spacing: 15px 0; table-layout: fixed; margin-left: -15px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #cbd5e1; height: 100%; box-sizing: border-box;">
                                <h3 style="color: #0f172a; margin: 0 0 5px 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; text-transform: uppercase;">📌 Как подготовить:</h3>
                                <p style="font-size: ${fsText}; color: #334155; white-space: pre-wrap; margin: 0;">${prep || 'Не указано'}</p>
                            </div>
                        </td>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #cbd5e1; height: 100%; box-sizing: border-box;">
                                <h3 style="color: #0f172a; margin: 0 0 5px 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; text-transform: uppercase;">📏 Что соблюсти (Критерии):</h3>
                                <p style="font-size: ${fsText}; color: #334155; white-space: pre-wrap; margin: 0;">${compliance || 'Не указано'}</p>
                            </div>
                        </td>
                    </tr>
                </table>

                <div class="no-break" style="background: #fef2f2; padding: 15px; border-radius: 12px; border: 1px solid #fecaca; margin-top: 15px;">
                    <h3 style="color: #991b1b; margin: 0 0 5px 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; text-transform: uppercase;">🚨 Риски нарушения:</h3>
                    <p style="font-size: ${fsText}; color: #7f1d1d; margin: 0;">${card.whyImportant || 'Не указано'}</p>
                </div>
            `;
        } else if (card.type === 'WORKER') {
            content = `
                <table class="no-break" style="width: 100%; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 20px; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: middle;">
                            <div style="font-size: ${mode === 'browser' ? '8pt' : '10px'}; color: #64748b; font-weight: bold; text-transform: uppercase;">Время операции</div>
                            <div style="font-size: ${mode === 'browser' ? '16pt' : '20px'}; font-weight: 900; color: #0f172a;">~${card.totalTime} мин</div>
                        </td>
                        <td style="text-align: right; vertical-align: middle;">
                            <div style="font-size: ${mode === 'browser' ? '8pt' : '10px'}; color: #64748b; font-weight: bold; text-transform: uppercase;">Количество шагов</div>
                            <div style="font-size: ${mode === 'browser' ? '16pt' : '20px'}; font-weight: 900; color: #0f172a;">${card.steps.length}</div>
                        </td>
                    </tr>
                </table>
            `;

            const safeSteps = card.steps || [];
            for (let step of safeSteps) {
                const stepPhotos = window.normalizeItemPhotos(step.photo);
                const stepPhotoUrls = [];
                for (const p of stepPhotos) {
                    const resolved = p ? (await PhotoManager.getAsyncUrl(p) || window.getPhotoSrc(p)) : null;
                    if (resolved) stepPhotoUrls.push(resolved);
                }
                const photoCellHtml = stepPhotoUrls.map(function (url) {
                    return `<div style="width: 100%; height: ${mode === 'browser' ? '40mm' : '150px'}; background: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                                    <img src="${url}" style="max-width: 100%; max-height: 100%; height: auto; width: auto; display: block; margin: 0 auto;">
                                </div>`;
                }).join('');

                content += `
                    <table class="no-break" style="width: 100%; border: 2px solid #e2e8f0; border-left: 6px solid #10b981; border-radius: 10px; background: white; margin-bottom: 15px; border-collapse: collapse; table-layout: fixed;">
                        <tr>
                            <td style="padding: 15px; vertical-align: top;">
                                <h3 style="color: #047857; margin: 0 0 5px 0; font-size: ${mode === 'browser' ? '11pt' : '14px'}; text-transform: uppercase;">ШАГ ${step.order} ${step.time ? `<span style="color: #64748b; font-size: ${mode === 'browser' ? '9pt' : '11px'};">(⏱ ${step.time} мин)</span>` : ''}</h3>
                                <p style="font-size: ${mode === 'browser' ? '11pt' : '14px'}; font-weight: bold; color: #1e293b; white-space: pre-wrap; margin: 0;">${step.text}</p>
                            </td>
                            ${photoCellHtml ? `<td style="width: ${mode === 'browser' ? '50mm' : '200px'}; padding: 15px; vertical-align: middle; text-align: center;">
                                ${photoCellHtml}
                            </td>` : ''}
                        </tr>
                    </table>
                `;
            }
        } else {
            return showToast('Печать PDF-файлов осуществляется внешними средствами.');
        }

        const orientation = card.type === 'INSPECTOR' ? 'landscape' : 'portrait';
        printPdfShell(`TWI: ${card.title}`, content, "A4", orientation, mode);
    },

    /**
     * Печать практики (нарушение/наблюдение), формат А3 альбом.
     * Перенесено из export.js:rbi_printPracticePdf (группа G3).
     */
    async printPractice(id, mode = 'browser') {
        const p = _getPractices().find(x => x.id === id);
        if (!p) return;

        let imgBeforeHtml = '';
        let imgAfterHtml = '';

        const block1Title = p.deltaUrk > 0 ? "СУТЬ ПРОБЛЕМЫ (БЫЛО)" : "ОПИСАНИЕ ИСХОДНОЙ СИТУАЦИИ";
        const block2Title = p.deltaUrk > 0 ? "ПРИНЯТОЕ РЕШЕНИЕ (СТАЛО)" : "ПРИНЯТОЕ РЕШЕНИЕ И РЕЗУЛЬТАТ";

        const renderPracPhotosGrid = async (urls) => {
            if (!urls || urls.length === 0) {
                return `<div style="height: 400px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; line-height: 400px; color: #94a3b8; font-size: 14px;">Нет фото</div>`;
            }
            const cellHeight = urls.length > 1 ? '195px' : '400px';
            const imgs = await Promise.all(urls.map(async (url) => {
                const real = await PhotoManager.getAsyncUrl(url) || window.getPhotoSrc(url);
                return `<div style="height: ${cellHeight}; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; margin-bottom: 8px;"><img src="${real}" style="width: 100%; height: 100%; object-fit: contain;"></div>`;
            }));
            return `<div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between;">${imgs.map(html => `<div style="width: ${urls.length > 1 ? '48%' : '100%'};">${html}</div>`).join('')}</div>`;
        };

        const beforeUrls = (p.photosBefore && p.photosBefore.length > 0) ? p.photosBefore : (p.photoBefore ? [p.photoBefore] : []);
        const processUrls = p.photosProcess || [];
        const afterUrls = (p.photosAfter && p.photosAfter.length > 0) ? p.photosAfter : (p.photoAfter ? [p.photoAfter] : []);

        imgBeforeHtml = await renderPracPhotosGrid(beforeUrls);
        imgAfterHtml = await renderPracPhotosGrid(afterUrls);
        const imgProcessHtml = processUrls.length > 0 ? await renderPracPhotosGrid(processUrls) : '';

        const efficiencyHtml = p.deltaUrk > 0
            ? `<div style="font-size: 16px; color: #16a34a; font-weight: bold; margin-top: 10px;">Доказанная эффективность: Качество подрядчика выросло на +${p.deltaUrk}% УрК</div>`
            : `<div style="font-size: 16px; color: #4f46e5; font-weight: bold; margin-top: 10px;">Практический опыт, подтвержденный на строительной площадке</div>`;

        const processBlockHtml = processUrls.length > 0 ? `
            <div class="no-break" style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                <h2 style="color: #1e40af; font-size: 18px; text-transform: uppercase; margin-top: 0; border-bottom: 2px solid #93c5fd; padding-bottom: 15px; margin-bottom: 20px; font-weight: 900;">ХОД РАБОТ (ПРОЦЕСС)</h2>
                ${imgProcessHtml}
            </div>` : '';

        const docsBlockHtml = (p.docs && p.docs.length > 0) ? `
            <div class="no-break" style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #334155; font-size: 16px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; font-weight: 900;">📄 Прикрепленные документы</h2>
                ${p.docs.map(d => `<div style="font-size: 13px; color: #1e293b; padding: 4px 0;">• ${d.name}${d.desc ? ` — ${d.desc}` : ''}</div>`).join('')}
            </div>` : '';

        const content = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 32px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900; letter-spacing: 1px;">БИБЛИОТЕКА ЛУЧШИХ ПРАКТИК</h1>
                <div style="font-size: 16px; color: #64748b; font-weight: bold; margin-top: 10px; text-transform: uppercase;">ВИД РАБОТ: ${p.templateTitle} | АВТОР: ${p.author} | ДАТА: ${new Date(p.date).toLocaleDateString('ru-RU')}</div>
            </div>

            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <h2 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase;">${p.title}</h2>
                ${efficiencyHtml}
            </div>

            <table class="no-break" style="width: 100%; border-spacing: 20px 0; border-collapse: separate; table-layout: fixed; margin-left: -20px; margin-bottom: 20px;">
                <tr>
                    <td style="width: 50%; padding: 25px; border-radius: 12px; background: #ffffff; border: 2px solid #e2e8f0; vertical-align: top;">
                        <h2 style="color: #334155; font-size: 18px; text-transform: uppercase; margin-top: 0; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 20px; font-weight: 900;">${block1Title}</h2>
                        <p style="font-size: 16px; color: #1e293b; white-space: pre-wrap; line-height: 1.6; margin-bottom: 25px;">${p.problem}</p>
                        ${imgBeforeHtml}
                    </td>
                    <td style="width: 50%; padding: 25px; border-radius: 12px; background: #f0fdf4; border: 2px solid #bbf7d0; vertical-align: top;">
                        <h2 style="color: #166534; font-size: 18px; text-transform: uppercase; margin-top: 0; border-bottom: 2px solid #86efac; padding-bottom: 15px; margin-bottom: 20px; font-weight: 900;">${block2Title}</h2>
                        <p style="font-size: 16px; color: #14532d; white-space: pre-wrap; line-height: 1.6; margin-bottom: 25px;">${p.solution}</p>
                        ${imgAfterHtml}
                    </td>
                </tr>
            </table>
            ${processBlockHtml}
            ${docsBlockHtml}
        `;

        if (typeof printPdfShell === 'function') {
            printPdfShell(`Практика: ${p.title}`, content, "A3", "landscape", mode);
        }
    },

    /**
     * Печать протокола воркшопа (Toolbox Talk) со сценарием и визуальным
     * стандартом из связанной TWI-карты.
     * Перенесено из export.js:rbi_printWorkshop (группа G3).
     */
    async printWorkshop(taskId, mode = 'browser') {
        const task = _getTasks().find(t => t.id === taskId);
        const scenario = document.getElementById('workshop-ai-scenario')?.value;
        if (!scenario || scenario.includes('⏳')) return showToast("Сгенерируйте сценарий!");

        const relatedTwi = typeof customTwiCards !== 'undefined' ? _getTwiCards().find(c => c.checklistKey === task.templateKey) : null;

        let content = `
            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">Сценарий планерки (Toolbox Talk)</h2>
                <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Подрядчик: ${task.contractor} | Вид работ: ${task.templateTitle}</div>
                <div style="font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${scenario.replace(/\n/g, '<br>')}</div>
            </div>
        `;

        if (relatedTwi && relatedTwi.type === 'INSPECTOR') {
            let resolvedGood = relatedTwi.photoGood ? await PhotoManager.getAsyncUrl(relatedTwi.photoGood) || window.getPhotoSrc(relatedTwi.photoGood) : null;
            let resolvedBad = relatedTwi.photoBad ? await PhotoManager.getAsyncUrl(relatedTwi.photoBad) || window.getPhotoSrc(relatedTwi.photoBad) : null;

            content += `
                <div style="page-break-before: always; margin-top: 20px;">
                    <h2 style="font-size: 18px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ${relatedTwi.title}</h2>
                    <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                        <tr>
                            <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;">
                                <h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>
                                ${resolvedGood ? `<img src="${resolvedGood}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                            </td>
                            <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;">
                                <h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>
                                ${resolvedBad ? `<img src="${resolvedBad}" style="width: 100%; height: 250px; object-fit: contain;">` : `Нет фото`}
                            </td>
                        </tr>
                    </table>
                </div>
            `;
        }
        if (typeof printPdfShell === 'function') printPdfShell(`Воркшоп: ${task.contractor}`, content, "A4", "portrait", mode);
    },

    /**
     * Печать памятки подрядчика (вводный инструктаж инженера + допуски +
     * связанные TWI-стандарты).
     * Перенесено из export.js:rbi_printIntroBriefing (группа G3).
     */
    async printIntroBriefing(taskId, mode = 'browser') {
        const task = _getTasks().find(t => t.id === taskId);
        if (!task || !task.aiData) return showToast("Сначала сгенерируйте данные!");

        const tableRows = task.aiData.checklist.map((item, idx) => `
            <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:center;">${idx + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight:bold;">${item.n}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; color:#475569;">${item.t.replace(/<br>/g, ' ')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:center; font-weight:bold; color:${item.w === 3 ? '#dc2626' : '#0f172a'}">B${item.w}</td>
            </tr>
        `).join('');

        const linkedTwi = typeof customTwiCards !== 'undefined' ? _getTwiCards().filter(c => c.checklistKey === task.templateKey && c.type === 'INSPECTOR') : [];

        let twiHtml = '';
        for (let card of linkedTwi) {
            let resolvedGood = card.photoGood ? await PhotoManager.getAsyncUrl(card.photoGood) || window.getPhotoSrc(card.photoGood) : null;
            let resolvedBad = card.photoBad ? await PhotoManager.getAsyncUrl(card.photoBad) || window.getPhotoSrc(card.photoBad) : null;

            twiHtml += `
                <div style="page-break-before: always; margin-top: 20px;">
                    <h2 style="font-size: 16px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ${card.title}</h2>
                    <table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;">
                        <tr>
                            <td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;">
                                <h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>
                                ${resolvedGood ? `<div style="height: 200px; background: white;"><img src="${resolvedGood}" style="width: 100%; height: 100%; object-fit: contain;"></div>` : `Нет фото`}
                            </td>
                            <td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;">
                                <h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>
                                ${resolvedBad ? `<div style="height: 200px; background: white;"><img src="${resolvedBad}" style="width: 100%; height: 100%; object-fit: contain;"></div>` : `Нет фото`}
                            </td>
                        </tr>
                    </table>
                </div>
            `;
        }

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

        if (typeof printPdfShell === 'function') printPdfShell(`Инструктаж ${task.contractor}`, content, "A4", "portrait", mode);
    },

    /**
     * Печать справки о качестве СМР для КС-2 (финальная приёмка).
     * Перенесено из export.js:rbi_printFinalAcceptance (группа G4).
     */
    printFinalAcceptance(taskId) {
        const task = _getTasks().find(t => t.id === taskId);
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
    },

    /**
     * Консолидированный AI-отчёт «День Качества» за месяц (метрики
     * подрядчиков, HR/Impact команды, лучшие практики, Парето причин).
     * Перенесено из export.js:rbi_generateQualityDayReport (группа G3).
     */
    async generateQualityDayReport(taskId) {
        if (!_getSetting('aiEnabled')) {
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
            const _allInspections = _getAllInspections();
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

            // 1. БАЗА ПРОВЕРОК
            const currentData = _allInspections.filter(c => new Date(c.date) >= startOfMonth && new Date(c.date) <= endOfMonth);
            const prevData = _allInspections.filter(c => new Date(c.date) >= prevMonthStart && new Date(c.date) <= prevMonthEnd);

            let sumUrk = 0; currentData.forEach(i => { if (i.metrics) sumUrk += Number(i.metrics.final) || 0; });
            const currAvgUrk = currentData.length > 0 ? Math.round(sumUrk / currentData.length) : 0;

            const currIntMetrics = typeof getObjectIntegralMetrics === 'function' ? getObjectIntegralMetrics(currentData, _templates().getUserTemplates()) : null;
            const IKO = currIntMetrics ? currIntMetrics.IKO : "0.00";
            const redZone = currIntMetrics ? currIntMetrics.redZonePerc : 0;

            // 2. HR МЕТРИКИ (КОМАНДА)
            var _gameSvcR = (ReportsActions._ctx && ReportsActions._ctx.game) || window.RBI.services.game;
            let hrStats = _gameSvcR.calculateManagerMetrics();
            let totalImpact = 0; let totalInterventions = 0;
            hrStats.forEach(h => { totalImpact += h.avgImpact; totalInterventions += (h.improved + h.degraded); });
            const avgTeamImpact = hrStats.length > 0 ? (totalImpact / hrStats.length) : 0;
            const bestEng = hrStats.length > 0 ? hrStats.sort((a, b) => b.pi - a.pi)[0] : { name: "Нет данных" };
            // СБОР ФОТОГРАФИЙ С СОВЕЩАНИЙ ЗА МЕСЯЦ
            const monthMeetings = _getMeetings().filter(m => new Date(m.date) >= startOfMonth && m.qDayPhoto);
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
                const topPrac = [...rbi_practicesData].filter(p => new Date(p.date) >= startOfMonth).sort((a, b) => b.deltaUrk - a.deltaUrk).slice(0, 2);
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
            const sortedCauses = Object.keys(causes).sort((a, b) => causes[b] - causes[a]).slice(0, 5);
            if (sortedCauses.length > 0) {
                causesHtml = sortedCauses.map(code => {
                    const cName = (_defectCauses().find(x => x.code === code)?.name) || 'Иное';
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

            const aiSummary = await _callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.3, max_tokens: 800 });

            closeModal();

            // 6. СБОРКА HTML ДЛЯ ПЕЧАТИ (ОТКРЫВАЕТСЯ СРАЗУ В PDF ОБОЛОЧКЕ)
            const pdfContent = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="font-size: 24pt; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">КОНСОЛИДИРОВАННЫЙ ОТЧЕТ КО ДНЮ КАЧЕСТВА</h1>
                    <div style="font-size: 14pt; color: #4f46e5; font-weight: 900; margin-top: 5px; text-transform:uppercase;">ИТОГИ МЕСЯЦА: ${now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</div>
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
                                <div style="font-size: 9pt; color: #64748b;">Проверок: ${bestEng.checks} | Строгость: ${bestEng.strictness > 0 ? '+' + bestEng.strictness.toFixed(1) : bestEng.strictness?.toFixed(1)}</div>
                            </div>
                        </td>
                    </tr>
                </table>
            `;

            // Закрываем задачу (Если она была)
            if (taskId) {
                const task = _getTasks().find(t => t.id === taskId);
                if (task) {
                    task.status = 'done'; task.resultComment = 'Отчет сгенерирован';
                    await _storage().put(_storage().stores().TASKS, task);
                }
            }

            printPdfShell(`День Качества ${now.toLocaleString('ru-RU', { month: 'long' })}`, pdfContent, "A4", "landscape", "browser");

        } catch (e) {
            closeModal();
            showToast("❌ Ошибка сборки отчета: " + e.message);
        }
    },

    /**
     * Экспорт данных (backup) — делегирует в window.handleDataExport(type, mode, silent).
     */
    exportData(type, mode, silent) {
        if (typeof window.handleDataExport === 'function') {
            window.handleDataExport(type, mode || 'full', silent || false);
        } else {
            console.warn('[ReportsActions] handleDataExport недоступен');
        }
    },

    /**
     * Поделиться backup через API — делегирует в window.shareBackupViaApi(mode, silent).
     */
    shareBackup(mode, silent) {
        if (typeof window.shareBackupViaApi === 'function') {
            window.shareBackupViaApi(mode || 'full', silent || false);
        } else {
            console.warn('[ReportsActions] shareBackupViaApi недоступен');
        }
    },

    /**
     * Открыть модал шеринга — делегирует в window.openShareModal().
     */
    openShareModal() {
        if (typeof window.openShareModal === 'function') {
            window.openShareModal();
        } else {
            console.warn('[ReportsActions] openShareModal недоступен');
        }
    },

    /**
     * Запустить импорт данных — делегирует в window.triggerDataImport(file).
     */
    importData(file) {
        if (typeof window.triggerDataImport === 'function') {
            window.triggerDataImport(file);
        } else {
            console.warn('[ReportsActions] triggerDataImport недоступен');
        }
    },

    /**
     * Создать новый шаблон PDF: сброс полей редактора, инициализация
     * drag&drop со всеми блоками в списке доступных.
     * Перенесено из export.js:createNewPdfTemplate (группа G5).
     */
    createPdfTemplate() {
        currentEditingPdfTemplateId = null;

        document.getElementById('pdf-tmpl-name').value = '';
        document.getElementById('pdf-tmpl-type').value = 'onepager';
        document.getElementById('pdf-tmpl-layout').value = 'two_uneven';
        document.getElementById('pdf-tmpl-logo').checked = true;
        document.getElementById('pdf-tmpl-qr').checked = true;
        document.getElementById('pdf-tmpl-footer').value = 'Конфиденциально. Только для внутреннего использования.';

        initDragAndDrop([], PDF_BLOCKS_LIBRARY.map(b => b.id));

        document.getElementById('pdf-template-editor').classList.remove('hidden');
    },

    /**
     * Редактировать существующий шаблон PDF: заполнить поля редактора и
     * распределить блоки между доступными/активными.
     * Перенесено из export.js:editPdfTemplate (группа G5).
     */
    editPdfTemplate(id) {
        const t = window.userReportTemplates.find(x => x.id === id);
        if (!t) return;

        currentEditingPdfTemplateId = id;

        document.getElementById('pdf-tmpl-name').value = t.name;
        document.getElementById('pdf-tmpl-type').value = t.report_type;
        document.getElementById('pdf-tmpl-layout').value = t.layout || 'two_uneven';
        document.getElementById('pdf-tmpl-logo').checked = t.show_logo !== false;
        document.getElementById('pdf-tmpl-qr').checked = t.show_qr !== false;
        document.getElementById('pdf-tmpl-footer').value = t.footer_text || '';

        const activeIds = t.active_blocks || [];
        const availableIds = PDF_BLOCKS_LIBRARY.map(b => b.id).filter(id => !activeIds.includes(id));

        initDragAndDrop(availableIds, activeIds);

        document.getElementById('pdf-template-editor').classList.remove('hidden');
    },

    /**
     * Сохранить шаблон PDF: собрать порядок активных блоков, записать в
     * IndexedDB, обновить кэш в памяти, сигнализировать облаку.
     * Перенесено из export.js:savePdfTemplate (группа G5).
     */
    async savePdfTemplate() {
        const name = document.getElementById('pdf-tmpl-name').value.trim();
        if (!name) return showToast("⚠️ Укажите название шаблона!");

        const activeBlocksEls = document.getElementById('pdf-blocks-active').children;
        const activeBlocks = Array.from(activeBlocksEls).map(el => el.dataset.id);

        if (activeBlocks.length === 0) return showToast("⚠️ Добавьте хотя бы один блок в отчет!");

        const templateData = {
            id: currentEditingPdfTemplateId || 'tmpl_' + Date.now().toString(36),
            project_code: window.syncConfig?.projectCode || 'local',
            report_type: document.getElementById('pdf-tmpl-type').value,
            name: name,
            layout: document.getElementById('pdf-tmpl-layout').value,
            show_logo: document.getElementById('pdf-tmpl-logo').checked,
            show_qr: document.getElementById('pdf-tmpl-qr').checked,
            footer_text: document.getElementById('pdf-tmpl-footer').value.trim(),
            active_blocks: activeBlocks,
            created_by: _getSetting('engineerName') || 'Инженер',
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'not_synced' // Готовим к отправке в облако
        };

        await _storage().put(_storage().stores().REPORT_TEMPLATES, templateData);

        const idx = window.userReportTemplates.findIndex(x => x.id === templateData.id);
        if (idx > -1) window.userReportTemplates[idx] = templateData;
        else window.userReportTemplates.push(templateData);

        localStorage.setItem('rbi_cloud_dirty', '1');
        _triggerSync('silent');

        showToast("✅ Шаблон успешно сохранен!");
        document.getElementById('pdf-template-editor').classList.add('hidden');
        renderPdfTemplatesList();
    },

    /**
     * Удалить (мягко, is_deleted) шаблон PDF.
     * Перенесено из export.js:deletePdfTemplate (группа G5).
     */
    async deletePdfTemplate(id) {
        if (!confirm("Удалить этот шаблон?")) return;

        const idx = window.userReportTemplates.findIndex(x => x.id === id);
        if (idx > -1) {
            window.userReportTemplates[idx].is_deleted = true;
            window.userReportTemplates[idx].updated_at = new Date().toISOString();
            window.userReportTemplates[idx].sync_status = 'not_synced';

            await _storage().put(_storage().stores().REPORT_TEMPLATES, window.userReportTemplates[idx]);

            window.userReportTemplates = window.userReportTemplates.filter(x => !x.is_deleted);
            renderPdfTemplatesList();

            localStorage.setItem('rbi_cloud_dirty', '1');
            _triggerSync('silent');

            showToast("🗑️ Шаблон удален");
        }
    },

    /**
     * Отменить редактирование шаблона PDF: скрыть редактор, сбросить id.
     * Перенесено из export.js:cancelPdfTemplateEdit (группа G5).
     */
    cancelPdfTemplateEdit() {
        document.getElementById('pdf-template-editor').classList.add('hidden');
        currentEditingPdfTemplateId = null;
    },

    /**
     * Синхронизирует состояние из legacy-переменных.
     */
    syncFromLegacy() {
        ReportsState.syncFromLegacy();
    }
};

if (typeof window !== 'undefined') {
    window.ReportsActions = ReportsActions;

    // Обратная совместимость (Фаза физического переноса G3): старые
    // глобальные имена продолжают работать для inline onclick-обработчиков
    // и bare-имён, вызываемых из HTML-строк, сгенерированных другими
    // legacy-модулями (game.js, interventions.js, tasks.module.js,
    // meetings.module.js, analytics.render.js, app.js). Обязателен минимум
    // window.startMeetingFlow (вызывается по bare-имени из onclick-строки,
    // сгенерированной promptMeetingAfterReport).
    window.exportPersonalContractorReport = ReportsActions.exportPersonalReport;
    window.promptMeetingAfterReport = ReportsActions.promptMeetingAfterReport;
    window.startMeetingFlow = ReportsActions.startMeetingFlow;
    window.rbi_generateQualityDayReport = ReportsActions.generateQualityDayReport;
    window.printCurrentTwi = ReportsActions.printTwi;
    window.rbi_printMeetingPdf = ReportsActions.printMeeting;
    window.rbi_printPracticePdf = ReportsActions.printPractice;
    window.rbi_printFmeaPdf = ReportsActions.printFmea;
    window.rbi_printWorkshop = ReportsActions.printWorkshop;
    window.rbi_printIntroBriefing = ReportsActions.printIntroBriefing;

    // Обратная совместимость (Фаза физического переноса G4): следующие
    // глобальные имена вызываются по bare-имени из inline onclick-строк,
    // сгенерированных другими legacy-модулями (history.render.js,
    // etalon.actions.js, interventions.js) — обязателен window.printEtalonAct.
    window.printEtalonAct = ReportsActions.printEtalon;
    window.printEtalonActV18 = ReportsActions.printEtalonV18;
    window.printEtalonActV18B = ReportsActions.printEtalonV18B;
    window.rbi_printFinalAcceptance = ReportsActions.printFinalAcceptance;
    window.exportPdfSchedule = ReportsActions.exportSchedulePdf;
    window.exportPdfSK = ReportsActions.exportSkPdf;

    // Обратная совместимость (Фаза физического переноса G5): `exportTenderCSV`/
    // `exportTenderPDF` — internal-helpers этого файла без публичного
    // delegate-метода в ReportsActions (нет прямого UI-вызывателя). Единственный
    // вызыватель — `handleFabExportAction` v2 (группа G6, остаётся в export.js,
    // ветка `actionType === 'tender'`), вызывающий их по bare-имени — обязателен
    // `window.exportTenderCSV`/`window.exportTenderPDF` до переноса G6.
    window.exportTenderCSV = exportTenderCSV;
    window.exportTenderPDF = exportTenderPDF;

    // Обратная совместимость (Фаза физического переноса G5): index.html
    // (не редактируется этим блоком) содержит inline onclick-атрибуты,
    // вызывающие эти функции по глобальному имени напрямую
    // (`window.openPdfTemplateModal()`, `window.closePdfTemplateModal()`,
    // `window.createNewPdfTemplate()`, `window.cancelPdfTemplateEdit()`,
    // `window.savePdfTemplate()`), а `renderPdfTemplatesList` генерирует
    // кнопки с `onclick="window.editPdfTemplate(...)"` / `window.deletePdfTemplate(...)`.
    // Все шесть обязательны для сохранения работоспособности UI без правки index.html.
    window.openPdfTemplateModal = ReportsActions.openTemplateModal;
    window.closePdfTemplateModal = closePdfTemplateModal;
    window.createNewPdfTemplate = ReportsActions.createPdfTemplate;
    window.editPdfTemplate = ReportsActions.editPdfTemplate;
    window.cancelPdfTemplateEdit = ReportsActions.cancelPdfTemplateEdit;
    window.savePdfTemplate = ReportsActions.savePdfTemplate;
    window.deletePdfTemplate = ReportsActions.deletePdfTemplate;

    // Обратная совместимость (Фаза физического переноса G1, подшаг 1):
    // 14 низкоуровневых PDF-helper'ов (8 группы G1 + 6 группы G4), физически
    // перенесённых в этот файл, вызываются bare-именем из classic-script'ов
    // (js/game.js, js/ai.js, js/export.js — 5 exportPdf*-функций и
    // renderReportFromTemplate) и других ES-модулей (tasks.module.js,
    // analytics.actions.js). Находка №4 (EXPORT_JS_MIGRATION_MAP.md, п.5)
    // закрыта для printPdfShell/escapeHtml: без явного window.X = X эти
    // bare-вызовы вне данного модуля сломались бы (ES-модуль не создаёт
    // глобальных свойств window автоматически, в отличие от classic-script
    // top-level function).
    window.printPdfShell = printPdfShell;
    window.escapeHtml = escapeHtml;
    window.generatePdfChart = generatePdfChart;
    window.buildPhotoGridHTML = buildPhotoGridHTML;
    window.generatePosterData = generatePosterData;
    window.exportPdfData = exportPdfData;
    window.waitForAllImages = waitForAllImages;
    window.resolveLocalPhotosForPdf = resolveLocalPhotosForPdf;
    window.getBrandedHeader = getBrandedHeader;
    window.generateQrCodeDataUrl = generateQrCodeDataUrl;
    window.generatePublicReportToken = generatePublicReportToken;
    window.preparePublicReportHtml = preparePublicReportHtml;
    window.urlToDataUrl = urlToDataUrl;
    window.saveReportToLocal = saveReportToLocal;

    // Обратная совместимость (Фаза физического переноса G1, подшаг 2 —
    // финальный): 5 exportPdf*-функций, физически перенесённых в этот файл,
    // вызываются bare-именем из export.js (handleFabExportAction v1/v2,
    // renderReportFromTemplate — все остаются в export.js до группы G6).
    // Группа G1 закрыта этим присвоением целиком.
    window.exportPdfOnePager = exportPdfOnePager;
    window.exportPdfGlobalOnePager = exportPdfGlobalOnePager;
    window.exportPdfCurrentScreen = exportPdfCurrentScreen;
    window.exportPdfFullObjectReport = exportPdfFullObjectReport;
    window.exportPdfPoster = exportPdfPoster;

    // Обратная совместимость (Фаза физического переноса G2): 13 функций
    // backup/импорта/экспорта данных, физически перенесённых в этот файл,
    // вызываются bare-именем/через window.X из js/app.js:542-543
    // (checkScheduledBackups/checkAutoReports), index.html inline
    // onclick/onchange (processDataImport, handleDataExport, triggerDataImport,
    // openShareModal, clearBackupRegistry, triggerManagerShareManual),
    // js/ai.js:184 (countPhotos) и существующих delegate-методов
    // ReportsActions.exportData/shareBackup/openShareModal/importData (выше,
    // не изменены). Группа G2 закрыта этим присвоением целиком.
    window.countPhotos = countPhotos;
    window.generateBackupObject = generateBackupObject;
    window.logToBackupRegistry = logToBackupRegistry;
    window.clearBackupRegistry = clearBackupRegistry;
    window.handleDataExport = handleDataExport;
    window.shareBackupViaApi = shareBackupViaApi;
    window.openShareModal = openShareModal;
    window.checkScheduledBackups = checkScheduledBackups;
    window.checkAutoReports = checkAutoReports;
    window.triggerManagerShareManual = triggerManagerShareManual;
    window.triggerAutoBackupManual = triggerAutoBackupManual;
    window.markImportedRecordAsLocal = markImportedRecordAsLocal;
    window.triggerDataImport = triggerDataImport;
    window.processDataImport = processDataImport;

    // Обратная совместимость (Фаза физического переноса G6 — последняя
    // группа `EXPORT_JS_MIGRATION_MAP.md`): `handleFabExportAction`
    // (версия 2, активная) и `renderReportFromTemplate`, физически
    // перенесённые в этот файл, вызываются bare-именем/через window.X из
    // js/app.js (генерируемый onclick), tasks.module.js:1109 и
    // reports.render.js. `window._isDemoMode` не выставляется — единственный
    // вызыватель (exportPdfPoster) теперь в этом же файле. Группа G6 и весь
    // export.js закрыты этим присвоением целиком.
    window.handleFabExportAction = handleFabExportAction;
    window.renderReportFromTemplate = renderReportFromTemplate;
}

console.log('[ReportsActions] reports.actions.js loaded');
