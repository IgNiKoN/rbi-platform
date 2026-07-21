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
import { buildMeetingProtocolHtml } from '../meetings/meetings.protocol.js';

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

    // Превью пар фото — без тоста «Формируем PDF»
    if (actionType === 'defect_remediation') {
        showToast('Подбор повторяющихся дефектов…');
        setTimeout(async () => {
            await openDefectRemediationPreview(data, mode);
        }, 200);
        return;
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
        } else if (actionType === 'onepager_v2') {
            await exportPdfOnePagerV2(data, mode);
        } else if (actionType === 'global_onepager_v2') {
            await exportPdfGlobalOnePagerV2(data, mode);
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
        ? `<div style="width:70px; height:70px; border:2px solid ${_getSetting('brandColor') || '#4f46e5'}; padding:3px; border-radius:4px;"><img class="report-qr" alt="qr" src="${qrDataUrl}" style="width:100%; height:100%;"></div>`
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
    if (title.includes('Повторяющиеся дефекты')) return 'Повторяющиеся дефекты';
    if (title.includes('Паспорта Подрядчиков') || title.includes('Список подрядчиков') || title.includes('Срез:') || title.includes('Отчет для')) return 'Отчёт по подрядчику';
    if (title.includes('Сводка для Руководства') || title.includes('One-Pager 2.0') || title.includes('Сводный отчет по объект') || title.includes('Полный отчет по объекту') || title.includes('База проверок')) return 'Сводный отчёт';
    return 'Прочее';
}

/** Период выгрузки для шапки PDF и карточки архива: «с ДД.ММ.ГГГГ по ДД.ММ.ГГГГ». */
function resolveExportPeriodLabel(overridePeriod) {
    if (overridePeriod != null && String(overridePeriod).trim()) {
        return String(overridePeriod).trim();
    }
    const fmt = (d) => {
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '…';
        return d.toLocaleDateString('ru-RU');
    };
    const range = (from, to) => `с ${fmt(from)} по ${fmt(to)}`;
    const sel = document.getElementById('global-filter-period')?.value || 'ALL';
    const now = new Date();

    if (sel === 'DAY') {
        return range(now, now);
    }
    if (sel === 'WEEK') {
        const from = new Date(now);
        from.setDate(from.getDate() - 7);
        return range(from, now);
    }
    if (sel === 'MONTH') {
        const from = new Date(now);
        from.setDate(from.getDate() - 30);
        return range(from, now);
    }
    if (sel === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        if (dFrom || dTo) {
            const from = dFrom ? new Date(dFrom) : null;
            const to = dTo ? new Date(dTo) : null;
            return `с ${from ? fmt(from) : '…'} по ${to ? fmt(to) : '…'}`;
        }
    }
    return 'Всё время';
}

/** Период документа по дате сохранения и типу периода (FMEA «Неделя»/«Месяц»). */
function resolveDocPeriodLabel(dateIso, periodName) {
    const fmt = (d) => d.toLocaleDateString('ru-RU');
    const to = dateIso ? new Date(dateIso) : new Date();
    if (Number.isNaN(to.getTime())) return periodName || 'Всё время';
    const name = String(periodName || '');
    const from = new Date(to);
    if (/месяц/i.test(name)) from.setDate(from.getDate() - 30);
    else if (/недел/i.test(name)) from.setDate(from.getDate() - 7);
    const label = `с ${fmt(from)} по ${fmt(to)}`;
    if (name && !/недел|месяц|день|сегодня|ручн/i.test(name)) {
        return `${name} (${label})`;
    }
    return label;
}

async function printPdfShell(title, content, formatSize = 'A4', orientation = 'portrait', mode = 'script', meta = null) {
    window._pdfGenerating = true;
    const isBackground = (mode === 'background');
    const exportMeta = (meta && typeof meta === 'object') ? meta : null;

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

    // Автор и период — в шапку PDF и в карточку архива (всегда)
    const reportAuthor = String(
        exportMeta?.author
        || _getSetting('engineerName')
        || document.getElementById('inp-inspector')?.value
        || 'Инженер'
    ).trim() || 'Инженер';
    const reportPeriod = resolveExportPeriodLabel(exportMeta?.period);

    const MARGIN_MM = 10;
    const MM_TO_PX = 3.7795;
    const pageWidths = {
        'A4_portrait': Math.floor(210 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A4_landscape': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_portrait': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_landscape': Math.floor(420 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
    };
    const widthPx = Math.floor(pageWidths[`${formatSize}_${orientation}`] || pageWidths['A4_portrait']);
    // Высота печатной области (мм→px) — клип на постраничной сборке, чтобы лист не растекался во 2-й
    const pageHeights = {
        'A4_portrait': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A4_landscape': Math.floor(210 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_portrait': Math.floor(420 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
        'A3_landscape': Math.floor(297 * MM_TO_PX) - (MARGIN_MM * 2 * MM_TO_PX),
    };
    const heightPx = Math.floor(pageHeights[`${formatSize}_${orientation}`] || pageHeights['A4_portrait']);
    const HIGH_QUALITY_SCALE = 2.5;

    // === НОВОЕ: Генерируем ID отчета, QR-код и Брендированную шапку ===
    const reportId = exportMeta?.forcedId || ('rep_' + Date.now().toString(36));
    // Один токен на отчёт: если шапка собрана снаружи (skipShellHeader) — передайте meta.publicToken,
    // иначе QR на листе и public_token в архиве разъедутся.
    const publicToken = exportMeta?.publicToken || generatePublicReportToken();

    let qrDataUrl = null;
    let showQr = true;

    // Убираем QR с технических отчетов (если не форсировали)
    if (exportMeta?.forceShowQr !== true) {
        if (title.includes('База проверок') || title.includes('График СМР') || title.includes('Дашборд СК') || title.includes('FMEA') || title.includes('Протокол') || title.includes('Воркшоп') || title.includes('Инструктаж') || title.includes('КС-2') || title.includes('Акт-Эталон') || title.includes('Тендер')) {
            showQr = false;
        }
        if (window._currentActiveTemplate && window._currentActiveTemplate.show_qr === false) {
            showQr = false;
        }
    }
    if (exportMeta?.forceHideQr === true) showQr = false;

    if (showQr && !exportMeta?.skipShellHeader) {
        try {
            if (typeof QRCode !== 'undefined') {
                qrDataUrl = await generateQrCodeDataUrl(`https://app.rbi-q.ru/report.html?token=${publicToken}`);
            }
        } catch (e) { console.warn("QR не сгенерирован", e); }
    }

    const headerHtml = exportMeta?.skipShellHeader
        ? ''
        : await getBrandedHeader(title, mode, qrDataUrl, reportAuthor, reportPeriod, exportMeta?.headerOpts || null);
    const fullHtml = headerHtml + content;

    // ============================================================================
    // ПАЙПЛАЙН 1: БРАУЗЕРНАЯ ПЕЧАТЬ (window.print)
    // ============================================================================
    if (mode === 'browser') {
        const printContainer = document.getElementById('print-content');
        printContainer.setAttribute('data-no-observe', 'true');
        if (!printContainer) return;

        // Как в PDF-сохранении: поля 10mm через padding контейнера, @page margin:0.
        // Раньше inline @page 15mm + padding 10mm сжимали лист → пустой хвост.
        // Хвостовые pdf-page-break тоже дают пустую страницу в системной печати.
        const printHtml = String(fullHtml || '')
            .replace(/(?:<div class=["']pdf-page-break page-break-before["']><\/div>\s*)+$/gi, '');

        printContainer.innerHTML = `
            <style>
                @page { size: ${formatSize} ${orientation}; margin: 0; }
                #print-content.print-only { padding: 10mm !important; box-sizing: border-box !important; }
                #print-wrapper { width: 100%; margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 10pt; }
                #print-wrapper img { max-width: 100%; display: block; }
                #print-wrapper table { width: 100%; table-layout: fixed; border-collapse: collapse; }
                #print-wrapper .pdf-page-break.page-break-before {
                    display: block;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: 0 !important;
                    page-break-before: always;
                    break-before: page;
                }
                #print-wrapper .pdf-page-break.page-break-before:first-child,
                #print-wrapper .pdf-page-break.page-break-before:last-child {
                    page-break-before: auto;
                    break-before: auto;
                    display: none;
                }
                /* Логический лист не должен вылезать за высоту бумаги (лишний QR/шапка → 2-й лист) */
                #print-wrapper .print-logical-page {
                    max-height: ${(heightPx / MM_TO_PX).toFixed(1)}mm;
                    overflow: hidden;
                    box-sizing: border-box;
                }
            </style>
            <div id="print-wrapper">
                ${printHtml
                    .split(/<div class=["']pdf-page-break page-break-before["']><\/div>/gi)
                    .map((html) => String(html || '').trim())
                    .filter((html) => html.length > 0)
                    .map((html) => `<div class="print-logical-page">${html}</div>`)
                    .join('<div class="pdf-page-break page-break-before"></div>')}
            </div>
        `;

        await resolveLocalPhotosForPdf(printContainer);

        // Для истории — тот же постраничный пайплайн, что и при сохранении PDF
        // (иначе в архиве снова появляется пустой хвост).
        const printWrapperEl = document.getElementById('print-wrapper') || printContainer;
        const printFilename = `${title.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toLocaleDateString('ru-RU')}.pdf`;
        const printPagesHtml = printHtml
            .split(/<div class=["']pdf-page-break page-break-before["']><\/div>/gi)
            .map((html) => String(html || '').trim())
            .filter((html) => html.length > 0);
        const printOptBase = {
            margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
            filename: printFilename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: HIGH_QUALITY_SCALE,
                useCORS: true, letterRendering: true, width: widthPx, windowWidth: widthPx,
                x: 0, y: 0, scrollX: 0, scrollY: 0, logging: false, allowTaint: true, backgroundColor: '#ffffff'
            },
            jsPDF: { unit: 'mm', format: formatSize.toLowerCase(), orientation: orientation, compress: true },
            pagebreak: { mode: ['avoid-all'] }
        };
        let printPdfBlob;
        try {
            if (printPagesHtml.length > 1) {
                const hiddenPrint = document.createElement('div');
                hiddenPrint.style.cssText = `position:absolute;left:0;top:0;width:${widthPx + 50}px;background:white;z-index:-9999;opacity:0.01;pointer-events:none;`;
                hiddenPrint.setAttribute('data-no-observe', 'true');
                document.body.appendChild(hiddenPrint);
                let worker = html2pdf().set(printOptBase);
                for (let i = 0; i < printPagesHtml.length; i++) {
                    Array.from(hiddenPrint.children).forEach((c) => hiddenPrint.removeChild(c));
                    const pageDiv = document.createElement('div');
                    pageDiv.className = 'pdf-print-root';
                    pageDiv.style.cssText = `width:${widthPx}px;max-width:${widthPx}px;max-height:${heightPx}px;overflow:hidden;padding:14px 16px;box-sizing:border-box;background:white;`;
                    pageDiv.innerHTML = printPagesHtml[i];
                    hiddenPrint.appendChild(pageDiv);
                    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                    if (i === 0) worker = worker.from(pageDiv).toPdf();
                    else worker = worker.get('pdf').then((pdf) => { pdf.addPage(); return pdf; }).from(pageDiv).toContainer().toCanvas().toPdf();
                    await worker;
                }
                await worker.get('pdf').then((pdf) => {
                    while (pdf.internal.getNumberOfPages() > printPagesHtml.length) {
                        pdf.deletePage(pdf.internal.getNumberOfPages());
                    }
                });
                printPdfBlob = await worker.output('blob');
                if (document.body.contains(hiddenPrint)) document.body.removeChild(hiddenPrint);
            } else {
                printPdfBlob = await html2pdf().set(printOptBase).from(printWrapperEl).output('blob');
            }
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
            period: reportPeriod,
            author: reportAuthor,
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
        padding: 14px 16px !important;
        background: white !important;
        color: #1c2b39 !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
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

        // Постраничная сборка: раньше на КАЖДОМ листе снова resolveLocalPhotosForPdf
        // (последовательно по всем img) — на отчёте компании это N×дорого при том же качестве.
        // Резолвим фото один раз до split; дальше в листах уже data:-src.
        const preResolveRoot = document.createElement('div');
        preResolveRoot.innerHTML = fullHtml;
        if (loaderText) loaderText.innerText = "Подготовка изображений…";
        await resolveLocalPhotosForPdf(preResolveRoot);
        const resolvedHtml = preResolveRoot.innerHTML;

        // Пустые куски после split (хвостовой/лишний pdf-page-break) → пустой лист в конце.
        const pagesHtml = resolvedHtml
            .split(/<div class=["']pdf-page-break page-break-before["']><\/div>/gi)
            .map((html) => String(html || '').trim())
            .filter((html) => html.length > 0);
        const isWeakDevice = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);

        let pdfBlob;

        if ((isWeakDevice || pagesHtml.length > 1) && pagesHtml.length > 0) {
            // Листы уже разрезаны вручную: css/legacy pagebreak даёт лишнюю пустую страницу в хвосте.
            const multiOpt = { ...opt, pagebreak: { mode: ['avoid-all'] } };
            let worker = html2pdf().set(multiOpt);
            for (let i = 0; i < pagesHtml.length; i++) {
                if (loaderText) loaderText.innerText = `Лист ${i + 1}/${pagesHtml.length}…`;
                Array.from(hiddenDiv.children).forEach(c => { if (c.className === 'pdf-print-root') hiddenDiv.removeChild(c); });

                const pageDiv = document.createElement('div');
                pageDiv.className = 'pdf-print-root';
                // Жёсткий клип по высоте листа: иначе при чуть большей шапке html2pdf рвёт логический лист на 2
                pageDiv.style.cssText = `width:${widthPx}px;max-width:${widthPx}px;max-height:${heightPx}px;overflow:hidden;box-sizing:border-box;`;
                pageDiv.innerHTML = pagesHtml[i];
                hiddenDiv.appendChild(pageDiv);

                // Фото уже data: — повторный полный resolve не нужен.
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
            // Страховка: html2pdf иногда всё же дописывает пустой хвост.
            await worker.get('pdf').then((pdf) => {
                const expected = pagesHtml.length;
                while (pdf.internal.getNumberOfPages() > expected) {
                    pdf.deletePage(pdf.internal.getNumberOfPages());
                }
            });
            pdfBlob = await worker.output('blob');
            if (mode !== 'background') {
                worker.save();
            }
        } else {
            const rootDiv = document.createElement('div');
            rootDiv.className = 'pdf-print-root';
            rootDiv.innerHTML = resolvedHtml;
            hiddenDiv.appendChild(rootDiv);

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
            period: reportPeriod,
            author: reportAuthor,
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
    // Параллельно по img: результат тот же (data: в src), без изменения качества PDF.
    await Promise.all(images.map(async (img) => {
        let src = img.getAttribute('data-local-src') || img.getAttribute('src');
        if (!src || src.startsWith('data:')) return;

        let base64 = null;
        if (src.startsWith('local://') || src.startsWith('cloud://') || src.startsWith('http')) {
            base64 = await PhotoManager.getBase64(src);
        }
        if (!base64) return;

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
    }));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

// Генератор брендированной шапки (По брендбуку RBI). Перенесено из
// export.js:getBrandedHeader (группа G4-helpers).
async function getBrandedHeader(title, mode, qrCodeDataUrl = null, author = null, period = null, opts = null) {
    let logoHtml = '';
    const brandColor = _getSetting('brandColor') || '#1c2b39';
    const headerOpts = opts && typeof opts === 'object' ? opts : {};
    const dense = !!headerOpts.dense;
    const logoH = Number(headerOpts.logoH) || 45;
    const logoMaxW = Number(headerOpts.logoMaxW) || (dense ? 200 : 220);
    const qrPx = Number(headerOpts.qrPx) || 70;
    const marginBottom = headerOpts.marginBottom != null ? Number(headerOpts.marginBottom) : 25;
    const paddingBottom = headerOpts.paddingBottom != null ? Number(headerOpts.paddingBottom) : 15;
    const borderW = dense ? 2 : 3;
    const qrPad = dense ? 2 : 4;
    const qrCaptionMt = dense ? 1 : 3;
    const subMt1 = dense ? 2 : 5;
    const subMt2 = dense ? 1 : 4;
    // dense: по умолчанию одна строка + ellipsis (отчёты). wrapTitle — полный текст с переносом (TWI).
    const titleClamp = headerOpts.wrapTitle
        ? 'white-space:normal;overflow:visible;word-wrap:break-word;overflow-wrap:anywhere;max-width:100%;'
        : (dense
            ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;'
            : '');

    if (_getSetting('brandLogo')) {
        const logoSrc = await PhotoManager.getAsyncUrl(_getSetting('brandLogo')) || _getSetting('brandLogo');
        logoHtml = `<img src="${logoSrc}" style="height:${logoH}px; width:auto; max-width:${logoMaxW}px; object-fit:contain; background: transparent; display: block;">`;
    }

    const qrHtml = qrCodeDataUrl
        ? `<div style="display:inline-block; text-align:center;">
            <div style="width:${qrPx}px; height:${qrPx}px; border:2px solid ${brandColor}; padding:${qrPad}px; border-radius:6px; background: white; box-sizing:border-box;">
                <img class="report-qr" alt="qr" src="${qrCodeDataUrl}" style="width:100%; height:100%; image-rendering:pixelated;">
            </div>
            <div style="font-size: ${dense ? 6 : 7}px; color: #64748b; text-align: center; margin-top: ${qrCaptionMt}px; font-weight:700;">Скан · публичный отчёт</div>
           </div>`
        : '';

    const fontSizeTitle = mode === 'browser' ? '18pt' : (headerOpts.titlePx ? `${headerOpts.titlePx}px` : '22px');
    const fontSizeSub = mode === 'browser' ? '9pt' : (dense ? '10px' : '12px');

    return `
        <style>
            /* уже определены в printPdfShell, дублировать не нужно */
        </style>
        <div class="no-break" style="border-bottom: ${borderW}px solid ${brandColor}; padding-bottom: ${paddingBottom}px; margin-bottom: ${marginBottom}px;">
            <table style="width: 100%; border: none; border-spacing: 0;">
                <tr>
                    <td style="width: 22%; vertical-align: middle;">${logoHtml}</td>
                    <td style="width: 56%; vertical-align: middle; text-align: center;">
                        <h1 style="font-family: 'Playfair Display', 'Georgia', serif; font-size:${fontSizeTitle}; font-weight:normal; text-transform:uppercase; margin:0; line-height:1.1; color:${brandColor};${titleClamp}" title="${String(headerOpts.titleTooltip || title || '').replace(/"/g, '&quot;')}">${title}</h1>
                        <div style="font-family: 'Bricolage Grotesque', 'Verdana', sans-serif; font-size:${fontSizeSub}; margin-top:${subMt1}px; color:#4c7288;">Сформировано: ${new Date().toLocaleString('ru-RU')}</div>
                        <div style="font-family: 'Bricolage Grotesque', 'Verdana', sans-serif; font-size:${fontSizeSub}; margin-top:${subMt2}px; color:#1c2b39; font-weight:700;">АВТОР: ${author || 'Инженер'} &nbsp;|&nbsp; ПЕРИОД: ${period || 'Всё время'}</div>
                    </td>
                    <td style="width: 22%; vertical-align: middle; text-align: right;">${qrHtml}</td>
                </tr>
            </table>
        </div>
    `;
}

// Генератор QR-кода. Перенесено из export.js:generateQrCodeDataUrl (группа G4-helpers).
async function generateQrCodeDataUrl(url) {
    return new Promise((resolve) => {
        if (typeof QRCode === 'undefined') {
            resolve(null);
            return;
        }
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position:absolute;left:-99999px;top:0;';
        document.body.appendChild(tempDiv);
        try {
            new QRCode(tempDiv, {
                text: String(url || ''),
                width: 128,
                height: 128,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.L
            });
        } catch (e) {
            if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
            resolve(null);
            return;
        }
        setTimeout(() => {
            try {
                const canvas = tempDiv.querySelector('canvas');
                if (canvas && typeof canvas.toDataURL === 'function') {
                    resolve(canvas.toDataURL('image/png'));
                    return;
                }
                const img = tempDiv.querySelector('img');
                if (img && img.src) {
                    resolve(img.src);
                    return;
                }
                resolve(null);
            } catch (e) {
                resolve(null);
            } finally {
                if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
            }
        }, 120);
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
                .qr-public-report img.report-qr { border-radius: 0; max-width: 100%; height: auto !important; }

                /* HTML-просмотр: снимаем PDF-бюджеты (1 лист), иначе текст/блоки обрезаются */
                .qr-public-report .no-break,
                .qr-public-report [style*="overflow:hidden"],
                .qr-public-report [style*="overflow: hidden"] {
                    overflow: visible !important;
                    max-height: none !important;
                    height: auto !important;
                }
                .qr-public-report .pdf-page-break,
                .qr-public-report .page-break-before {
                    display: block !important;
                    height: 0 !important;
                    margin: 28px 0 !important;
                    padding: 0 !important;
                    border: 0 !important;
                    border-top: 2px dashed #cbd5e1 !important;
                    background: transparent !important;
                }

                @media (max-width: 768px) {
                    /* A3 PDF → телефон: flex-поток, плитки 2 в ряд, без наезда текста */
                    .qr-public-report {
                        padding: 8px !important;
                        overflow-x: hidden !important;
                    }

                    .qr-public-report table,
                    .qr-public-report thead,
                    .qr-public-report tbody {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }

                    .qr-public-report tr {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        width: 100% !important;
                        gap: 8px;
                        margin: 0 0 8px 0 !important;
                    }

                    .qr-public-report td,
                    .qr-public-report th {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-sizing: border-box !important;
                    }

                    .qr-public-report td[style*="width:16"],
                    .qr-public-report td[style*="width:20"],
                    .qr-public-report td[style*="width:25"],
                    .qr-public-report td[style*="width:33"] {
                        width: calc(50% - 4px) !important;
                        flex: 0 0 calc(50% - 4px) !important;
                    }

                    .qr-public-report td[style*="width:32"],
                    .qr-public-report td[style*="width:35"],
                    .qr-public-report td[style*="width:46"],
                    .qr-public-report td[style*="width:50"],
                    .qr-public-report td[style*="width: 50"],
                    .qr-public-report td[style*="width:60"],
                    .qr-public-report td[style*="width:65"],
                    .qr-public-report td[style*="width:68"] {
                        width: 100% !important;
                        flex: 0 0 100% !important;
                    }

                    .qr-public-report td > div {
                        height: auto !important;
                        max-height: none !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        white-space: normal !important;
                    }

                    .qr-public-report [style*="columns:"] {
                        columns: 1 !important;
                        -webkit-columns: 1 !important;
                    }

                    .qr-public-report [style*="display: grid"],
                    .qr-public-report [style*="display:grid"] {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 10px !important;
                    }

                    .qr-public-report [style*="position:absolute"],
                    .qr-public-report [style*="position: absolute"] {
                        position: relative !important;
                        inset: auto !important;
                        height: auto !important;
                    }

                    .qr-public-report table:has(th) {
                        display: block !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch;
                        margin-bottom: 12px !important;
                    }
                    .qr-public-report table:has(th) thead,
                    .qr-public-report table:has(th) tbody {
                        display: table !important;
                        width: 100% !important;
                        min-width: 560px;
                    }
                    .qr-public-report table:has(th) tr {
                        display: table-row !important;
                        flex-wrap: nowrap !important;
                        gap: 0 !important;
                        margin: 0 !important;
                    }
                    .qr-public-report table:has(th) th,
                    .qr-public-report table:has(th) td {
                        display: table-cell !important;
                        width: auto !important;
                        flex: none !important;
                        padding: 4px 3px !important;
                        white-space: nowrap !important;
                    }

                    .qr-public-report img:not(.report-qr):not([alt="qr"]) {
                        max-width: 100% !important;
                        height: auto !important;
                        object-fit: contain !important;
                        display: block !important;
                        margin: 8px auto !important;
                    }
                    .qr-public-report img.report-qr,
                    .qr-public-report img[alt="qr"] {
                        width: 72px !important;
                        max-width: 72px !important;
                        height: auto !important;
                        margin: 0 !important;
                    }

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

                    .qr-public-report h1 { font-size: 18px !important; line-height: 1.25 !important; margin-bottom: 8px !important; text-align: center !important; }
                    .qr-public-report h2 { font-size: 15px !important; margin-bottom: 8px !important; }
                    .qr-public-report h3 { font-size: 13px !important; margin-bottom: 8px !important; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
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
        engineer_name: reportData.author || _getSetting('engineerName') || 'Инженер',

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
            period: reportData.period || 'Всё время',
            author: reportData.author || _getSetting('engineerName') || 'Инженер',
            public_token: publicToken
        },

        public_token: publicToken,
        snapshot_html: publicHtmlContent, // Теперь переменная существует!
        created_by: reportData.author || _getSetting('engineerName') || 'Инженер',

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
        const cKey = (typeof window.trendContractorKey === 'function')
            ? window.trendContractorKey(item)
            : ((item.contractorName || 'Неизвестно') + ' [' + (item.project_display_name || item.projectName || 'Без объекта') + ']');
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
            if (m) ratingData.push({ name: cName, val: m.finalC, count: m.count, b3: m.n_изделий_с_B3, isPrelim: m.count < 7, prevVal: null });
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

    const currProjectsPdf = new Set(data.map(i => i.project_canonical_key || i.project_display_name || i.projectName).filter(Boolean));
    const prevGroupedPdf = {};
    prevData.forEach(item => {
        const p = item.project_canonical_key || item.project_display_name || item.projectName;
        if (currProjectsPdf.size && p && !currProjectsPdf.has(p)) return;
        const cKey = (typeof window.trendContractorKey === 'function')
            ? window.trendContractorKey(item)
            : ((item.contractorName || 'Неизвестно') + ' [' + (item.projectName || 'Без объекта') + ']');
        (prevGroupedPdf[cKey] = prevGroupedPdf[cKey] || []).push(item);
    });
    ratingData.forEach(r => {
        const prevItems = prevGroupedPdf[r.name];
        if (prevItems && prevItems.length >= 3) {
            const pm = getContractorMetrics(prevItems, _templates().getUserTemplates());
            if (pm) r.prevVal = pm.finalC;
        }
    });

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

    const OP_PDCA_MAX_CHARS = 500;
    let pdcaTextRaw = document.getElementById('hidden_pdca_text')?.value || "Нет данных для формирования решения.";
    pdcaTextRaw = String(pdcaTextRaw).trim();
    if (pdcaTextRaw.length > OP_PDCA_MAX_CHARS) pdcaTextRaw = pdcaTextRaw.slice(0, OP_PDCA_MAX_CHARS - 1).trimEnd() + '…';
    const pdfFormattedText = pdcaTextRaw.replace(/^\[(.*?)\]/gm, '<div style="font-size: 12px; font-weight: 900; color: #854d0e; text-transform: uppercase; margin-top: 8px; margin-bottom: 4px;">$1</div>').replace(/\n/g, '<br>');

    const isGlobalDanger = parseFloat(mData.IKO) >= 0.60 || sumB3 > 0;

    // Печать: строки рейтинга строго однострочные + потолок по высоте блока.
    // После правок UI (wrap имён / ▲▼ отдельной строкой) левая колонка раздувалась
    // и html2pdf уводил весь onepager на 2-ю страницу.
    let ratingHtml = '';
    if (ratingData.length === 0) {
        ratingHtml = `<div style="font-size:${mode === 'browser' ? '8pt' : '10px'}; color:#94a3b8; text-align:center; padding: 12px;">Нет данных</div>`;
    } else {
        const renderRow = (r) => {
            let delta = '<span style="font-size:8px;color:#94a3b8;font-weight:bold;margin-left:4px;">—</span>';
            if (r.prevVal !== null && r.prevVal !== undefined) {
                const diff = r.val - r.prevVal;
                if (Math.abs(diff) < 0.5) delta = '<span style="font-size:8px;color:#94a3b8;font-weight:bold;margin-left:4px;">▬0</span>';
                else {
                    const good = diff > 0;
                    delta = `<span style="font-size:8px;font-weight:900;color:${good ? '#22c55e' : '#ef4444'};margin-left:4px;">${diff > 0 ? '▲' : '▼'}${Math.abs(Math.round(diff))}</span>`;
                }
            }
            return `
            <table style="width:100%; margin-bottom:3px; border-collapse:collapse; table-layout: fixed;">
                <tr>
                    <td style="width:46%; font-size:${mode === 'browser' ? '7pt' : '9px'}; font-weight:bold; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:6px; vertical-align:middle;" title="${String(r.name).replace(/"/g, '&quot;')}">${r.name}</td>
                    <td style="width:30%; vertical-align: middle;">
                        <div style="background:#e2e8f0; height:7px; border-radius:4px; border:1px solid #cbd5e1; width:100%; overflow:hidden;">
                            <div style="width:${r.val}%; background:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')}; height:100%;"></div>
                        </div>
                    </td>
                    <td style="width:24%; text-align:right; font-size:${mode === 'browser' ? '7.5pt' : '10px'}; font-weight:900; color:${r.val < 70 ? '#ef4444' : (r.val < 85 ? '#f59e0b' : '#22c55e')}; vertical-align:middle; white-space:nowrap;">
                        ${r.val}%${delta}
                    </td>
                </tr>
            </table>`;
        };

        // На A3-листе держим компактный топ, иначе левая колонка выталкивает страницу.
        const pdfRating = ratingData.length <= 8
            ? ratingData
            : [...ratingData.slice(0, 4), null, ...ratingData.slice(-3)];
        ratingHtml = pdfRating.map(r => {
            if (!r) {
                return `<div style="text-align:center; font-size:8px; color:#94a3b8; font-weight:bold; padding:1px 0; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:1px 0;">… ещё ${ratingData.length - 7} …</div>`;
            }
            return renderRow(r);
        }).join('');
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

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; margin-bottom: 8px; height: ${mode === 'browser' ? '48mm' : '190px'}; box-sizing: border-box; overflow: hidden;">
                        <div style="font-size: ${mode === 'browser' ? '8pt' : '10px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 4px; text-align: center;">📈 Динамика уровня качества</div>
                        <div style="height:${mode === 'browser' ? '36mm' : '145px'}; text-align:center; overflow: hidden;">${imgLine ? imgLine : '<span style="color:#94a3b8; font-size:12px;">График не сформирован</span>'}</div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; height: ${mode === 'browser' ? '52mm' : '210px'}; box-sizing: border-box; overflow: hidden;">
                        <div style="font-size: ${mode === 'browser' ? '8pt' : '10px'}; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; text-align: center;">🏆 Рейтинг по надежности</div>
                        <div style="width: 100%; max-height: ${mode === 'browser' ? '42mm' : '170px'}; overflow: hidden;">${ratingHtml}</div>
                    </div>
                </td>

                <!-- ПРАВАЯ КОЛОНКА (68%) -->
                <td style="width: 68%; vertical-align: top;">
                    ${await buildPhotoGridHTML(topB3, '🚨 ТОП-5 Критических дефектов (B3)', '#dc2626', '#fca5a5', '#fef2f2', 5, mode)}
                    ${await buildPhotoGridHTML(topB2, '🔄 ТОП-5 Повторяющихся нарушений (B2)', '#d97706', '#fdba74', '#fff7ed', 5, mode)}
                    ${await buildPhotoGridHTML(topOK, '✅ ТОП-5 Эталонных работ (OK)', '#16a34a', '#bbf7d0', '#f0fdf4', 5, mode)}

                    <div class="no-break" style="background: ${isGlobalDanger ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${isGlobalDanger ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 10px; max-height: ${mode === 'browser' ? '38mm' : '145px'}; overflow: hidden; box-sizing: border-box;">
                        <h3 style="margin: 0 0 4px 0; font-size: ${mode === 'browser' ? '9pt' : '11px'}; color: ${isGlobalDanger ? '#b45309' : '#166534'}; text-transform: uppercase; border-bottom: 1px solid ${isGlobalDanger ? '#fde047' : '#86efac'}; padding-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">🎯 Аналитика качества (вывод инженера)</h3>
                        <div style="font-size: ${mode === 'browser' ? '8.5pt' : '11px'}; line-height: 1.35; color: #1e293b; columns: 2; column-gap: 14px;">${pdfFormattedText}</div>
                    </div>
                </td>
            </tr>
        </table>
    `;

    printPdfShell("Сводка для Руководства", content, "A3", "landscape", mode);
}

/**
 * One-Pager 2.0 — сборка HTML одного листа (без printPdfShell).
 * opts.forceProjectName — принудительный заголовок «по объекту …» (сшивка company v2).
 * opts.mode — 'script'|'browser' для getBrandedHeader на вложенных страницах (не обязателен).
 */
async function buildOnePagerV2Html(data, opts = {}) {
    if (!data || data.length === 0) return null;
    const _allInspections = _getAllInspections();
    const DAY_MS = 86400000;
    const projectKeyOf = (i) => i.project_display_name || i.projectName || i.project_name || 'Без объекта';
    const matchesForcedProject = (item) => {
        if (!opts.forceProjectName) return true;
        const name = opts.forceProjectName;
        const keys = [
            item.project_display_name,
            item.projectName,
            item.project_name,
            item.display_name,
            item.project_canonical_key
        ].filter(Boolean);
        return keys.includes(name) || projectKeyOf(item) === name;
    };

    const resolveDocScore = (i) => {
        if (!i || !i.metrics) return null;
        if (i.metrics.documentary !== undefined && i.metrics.documentary !== null) return Number(i.metrics.documentary);
        if (typeof window.getDocumentaryScore !== 'function' || !i.state || !i.templateKey) return null;
        const tType = i.templateKey.split('_')[0];
        const tKey = i.templateKey.replace(tType + '_', '');
        const cl = tType === 'sys' && _templates().getSystemTemplates()[tKey]
            ? _templates().getSystemTemplates()[tKey].groups
            : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
        return window.getDocumentaryScore(i.state, getFlatList(cl));
    };
    let sumUrk = 0, sumDoc = 0, cntDoc = 0;
    data.forEach(i => {
        sumUrk += Number(i.metrics?.final) || 0;
        const ds = resolveDocScore(i);
        if (ds !== null && ds !== undefined && !Number.isNaN(ds)) { sumDoc += ds; cntDoc++; }
    });
    const currAvgUrk = Math.round(sumUrk / data.length);
    const currAvgDoc = cntDoc > 0 ? Math.round(sumDoc / cntDoc) : null;
    const currInt = typeof getObjectIntegralMetrics === 'function'
        ? getObjectIntegralMetrics(data, _templates().getUserTemplates())
        : null;
    const mData = currInt || { redZonePerc: 0, IKO: '0.00' };

    const groupedC = {};
    data.forEach(item => {
        const cKey = (typeof window.trendContractorKey === 'function')
            ? window.trendContractorKey(item)
            : ((item.contractorName || 'Неизвестно') + ' [' + (item.project_display_name || item.projectName || 'Без объекта') + ']');
        (groupedC[cKey] = groupedC[cKey] || []).push(item);
    });
    const currContrCount = Object.keys(groupedC).length;

    const dominantWorkType = (items) => {
        const counts = {};
        items.forEach(i => {
            const t = i.templateTitle || i.workTitle || i.checklistName || '—';
            counts[t] = (counts[t] || 0) + 1;
        });
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || '—';
    };

    let sumRel = 0, relN = 0;
    const ratingRel = [];
    for (const cName in groupedC) {
        const m = getContractorMetrics(groupedC[cName], _templates().getUserTemplates());
        if (!m) continue;
        ratingRel.push({
            name: cName,
            val: m.finalC,
            count: m.count,
            doc: m.documentaryC != null ? m.documentaryC : null,
            workType: dominantWorkType(groupedC[cName])
        });
        if (m.count >= 7) { sumRel += m.finalC; relN++; }
    }
    ratingRel.sort((a, b) => b.val - a.val);
    const avgReliability = relN > 0 ? Math.round(sumRel / relN) : null;
    // Подрядчики с надёжностью в провале (ИУрК < 70%) — среди тех, у кого уже N≥7
    const redContrCount = ratingRel.filter(r => r.count >= 7 && r.val < 70).length;
    const redContrPerc = relN > 0 ? Math.round((redContrCount / relN) * 100) : null;

    const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
    const now = new Date();
    let prevData = [];
    let trendLabel = 'к 1-й пол.';
    if (selPeriod === 'WEEK') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 7);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 7);
        prevData = _allInspections.filter(i => { const d = new Date(i.date); return d >= startPrev && d < startCurr; });
        trendLabel = 'к прош. нед.';
    } else if (selPeriod === 'MONTH') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 30);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 30);
        prevData = _allInspections.filter(i => { const d = new Date(i.date); return d >= startPrev && d < startCurr; });
        trendLabel = 'к прош. мес.';
    } else {
        const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        prevData = sorted.slice(0, Math.floor(sorted.length / 2));
    }
    // Company stitch: тренды только по этому объекту (не по всей компании)
    if (opts.forceProjectName) {
        prevData = prevData.filter(matchesForcedProject);
    }

    let prevAvgUrk = 0, prevAvgDoc = null, prevIko = '0.00', prevChecks = prevData.length, prevContrs = 0, prevRel = null, prevRedContrCount = null;
    if (prevData.length > 0) {
        const pSum = prevData.reduce((s, i) => s + (Number(i.metrics?.final) || 0), 0);
        prevAvgUrk = Math.round(pSum / prevData.length);
        let pSumDoc = 0, pCntDoc = 0;
        prevData.forEach(i => {
            const ds = resolveDocScore(i);
            if (ds !== null && ds !== undefined && !Number.isNaN(ds)) { pSumDoc += ds; pCntDoc++; }
        });
        if (pCntDoc > 0) prevAvgDoc = Math.round(pSumDoc / pCntDoc);
        prevContrs = new Set(prevData.map(i => i.contractorName).filter(Boolean)).size;
        const pInt = typeof getObjectIntegralMetrics === 'function'
            ? getObjectIntegralMetrics(prevData, _templates().getUserTemplates()) : null;
        if (pInt) prevIko = pInt.IKO;
        const pGrouped = {};
        prevData.forEach(item => {
            const cKey = (typeof window.trendContractorKey === 'function')
                ? window.trendContractorKey(item)
                : ((item.contractorName || 'Неизвестно') + ' [' + (item.project_display_name || item.projectName || 'Без объекта') + ']');
            (pGrouped[cKey] = pGrouped[cKey] || []).push(item);
        });
        let ps = 0, pn = 0, pred = 0;
        for (const k in pGrouped) {
            if (pGrouped[k].length < 7) continue;
            const m = getContractorMetrics(pGrouped[k], _templates().getUserTemplates());
            if (m) {
                ps += m.finalC;
                pn++;
                if (m.finalC < 70) pred++;
            }
        }
        if (pn > 0) {
            prevRel = Math.round(ps / pn);
            prevRedContrCount = pred;
        }
    }

    // Подпись тренда — в одной строке с ▲/▼, чтобы не вылезала из плитки KPI
    const renderTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === '' || Number.isNaN(parseFloat(prev))) {
            return `<div style="text-align:center;line-height:1.1;overflow:hidden;"><span style="color:#94a3b8;font-size:8px;font-weight:700;">нет базы</span></div>`;
        }
        const diff = parseFloat(curr) - parseFloat(prev);
        if (Math.abs(diff) < 0.01) {
            return `<div style="text-align:center;line-height:1.1;overflow:hidden;white-space:nowrap;"><span style="color:#94a3b8;font-size:11px;font-weight:900;">▬0</span> <span style="font-size:8px;color:#94a3b8;text-transform:uppercase;">${label}</span></div>`;
        }
        const good = inverse ? diff < 0 : diff > 0;
        return `<div style="text-align:center;line-height:1.1;overflow:hidden;white-space:nowrap;"><span style="color:${good ? '#16a34a' : '#dc2626'};font-size:11px;font-weight:900;">${diff > 0 ? '▲' : '▼'}${Math.abs(diff).toFixed(Number.isInteger(diff) ? 0 : 2)}</span> <span style="font-size:8px;color:#94a3b8;text-transform:uppercase;">${label}</span></div>`;
    };

    // Вертикальные столбцы по подрядчикам: текущее значение + Δ к пред. интервалу
    const chartPeriod = (selPeriod === 'WEEK' || selPeriod === 'DAY') ? 'WEEK' : 'MONTH';
    const bucketKeys = [];
    if (chartPeriod === 'WEEK') {
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i * 7);
            const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
            monday.setHours(0, 0, 0, 0);
            const end = new Date(monday); end.setDate(monday.getDate() + 7);
            bucketKeys.push({ start: monday, end });
        }
    } else {
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            bucketKeys.push({
                start: new Date(d.getFullYear(), d.getMonth(), 1),
                end: new Date(d.getFullYear(), d.getMonth() + 1, 1)
            });
        }
    }
    const cleanContrName = (name) => String(name || '').replace(/\s*\[.*?\]\s*$/, '').trim() || String(name || '');
    const wrapToWidth = (ctx, text, maxWidth, maxLines) => {
        const words = String(text || '—').replace(/\s+/g, ' ').trim().split(' ');
        const lines = [];
        let cur = '';
        const push = (s) => { if (s) lines.push(s); };
        for (let wi = 0; wi < words.length; wi++) {
            const w = words[wi];
            const test = cur ? `${cur} ${w}` : w;
            if (ctx.measureText(test).width <= maxWidth) {
                cur = test;
                continue;
            }
            if (cur) push(cur);
            if (lines.length >= maxLines - 1) {
                // остаток текста целиком в последнюю строку (без обрезки «…»)
                push([w].concat(words.slice(wi + 1)).join(' '));
                cur = '';
                break;
            }
            // слишком длинное слово — дробим по символам, но без потери хвоста
            if (ctx.measureText(w).width > maxWidth) {
                let chunk = '';
                for (const ch of w) {
                    const t2 = chunk + ch;
                    if (ctx.measureText(t2).width > maxWidth && chunk) {
                        push(chunk);
                        chunk = ch;
                        if (lines.length >= maxLines - 1) {
                            push(chunk + w.slice(w.indexOf(ch) + 1) + (words.slice(wi + 1).length ? ' ' + words.slice(wi + 1).join(' ') : ''));
                            chunk = '';
                            wi = words.length;
                            break;
                        }
                    } else chunk = t2;
                }
                cur = chunk;
            } else {
                cur = w;
            }
        }
        if (cur && lines.length < maxLines) push(cur);
        else if (cur) lines[lines.length - 1] = (lines[lines.length - 1] || '') + ' ' + cur;
        return lines.length ? lines : ['—'];
    };
    const bucketAvgUrk = (items, start, end) => {
        const slice = items.filter(i => { const d = new Date(i.date); return d >= start && d < end; });
        if (slice.length < 1) return null;
        const sum = slice.reduce((s, i) => s + (Number(i.metrics?.final) || 0), 0);
        return Math.round(sum / slice.length);
    };
    const bucketIurk = (items, start, end) => {
        const slice = items.filter(i => { const d = new Date(i.date); return d >= start && d < end; });
        if (slice.length < 1) return null;
        const metrics = getContractorMetrics(slice, _templates().getUserTemplates(), false);
        return metrics ? metrics.finalC : null;
    };
    const deltaForContractor = (items, valueFn) => {
        for (let i = bucketKeys.length - 1; i >= 1; i--) {
            const curV = valueFn(items, bucketKeys[i].start, bucketKeys[i].end);
            const prevV = valueFn(items, bucketKeys[i - 1].start, bucketKeys[i - 1].end);
            if (curV != null && prevV != null) return { last: curV, prev: prevV, delta: curV - prevV };
        }
        return null;
    };
    const growthHint = chartPeriod === 'WEEK'
        ? 'Δ к предыдущей неделе, п.п.'
        : 'Δ к предыдущему месяцу, п.п.';

    const makeVerticalContractorBars = (rows) => {
        if (!rows.length) return null;
        const n = rows.length;
        const values = rows.map(r => (r.isGap ? 0 : r.value));
        const colors = rows.map(r => {
            if (r.isGap) return 'rgba(148,163,184,0.2)';
            return (r.value < 70 ? '#ef4444' : (r.value < 85 ? '#f59e0b' : '#22c55e'));
        });
        const barMax = Math.max(10, Math.min(36, Math.floor(780 / Math.max(n, 1))));
        const fontMain = n > 12 ? 9 : 11;
        const fontDelta = n > 12 ? 10 : 12;
        const chartW = Math.max(980, n * 92);
        const labelPlugin = {
            id: 'op2BarLabelsFull',
            afterDatasetsDraw(chart) {
                const { ctx, chartArea } = chart;
                const meta0 = chart.getDatasetMeta(0);
                if (!meta0 || !meta0.data) return;
                const slotW = Math.max(48, (chartArea.right - chartArea.left) / n - 6);
                meta0.data.forEach((bar, i) => {
                    const r = rows[i];
                    if (!r || !bar) return;
                    const x = bar.x;
                    ctx.save();
                    ctx.textAlign = 'center';
                    if (r.isGap) {
                        // Маркер «не показано N» между топом и низом
                        const midY = (chartArea.top + chartArea.bottom) / 2;
                        ctx.fillStyle = '#94a3b8';
                        ctx.strokeStyle = '#cbd5e1';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x, chartArea.top + 8);
                        ctx.lineTo(x, chartArea.bottom - 4);
                        ctx.stroke();
                        ctx.font = 'bold 8px Verdana, sans-serif';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#64748b';
                        wrapToWidth(ctx, r.name || '', Math.max(52, slotW + 8), 5).forEach((line, li) => {
                            ctx.fillText(line, x, midY - 12 + li * 10);
                        });
                        ctx.textBaseline = 'top';
                        ctx.font = '7px Verdana, sans-serif';
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillText(r.workType || '', x, chartArea.bottom + 6);
                        ctx.restore();
                        return;
                    }
                    const top = bar.y;
                    const h = Math.abs(bar.base - top);
                    const dTxt = (r.delta == null || Number.isNaN(r.delta))
                        ? 'н/д'
                        : ((r.delta > 0 ? '+' : '') + r.delta);
                    const dColor = (r.delta == null || Number.isNaN(r.delta))
                        ? '#94a3b8'
                        : (r.delta > 0 ? '#15803d' : (r.delta < 0 ? '#b91c1c' : '#64748b'));
                    ctx.textBaseline = 'middle';
                    ctx.font = `bold ${fontMain}px Verdana, sans-serif`;
                    ctx.fillStyle = '#0f172a';
                    ctx.fillText(String(r.value) + '%', x, top - 10);
                    ctx.font = `bold ${fontDelta}px Verdana, sans-serif`;
                    if (h >= 24) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(dTxt, x, top + h * 0.45);
                    } else {
                        ctx.fillStyle = dColor;
                        ctx.fillText(dTxt, x, top - 20);
                    }
                    // Подписи под столбцом: подрядчик + вид работ с переносом, без «…»
                    ctx.textBaseline = 'top';
                    let y = chartArea.bottom + 4;
                    ctx.font = `bold ${n > 10 ? 7.5 : 8.5}px Verdana, sans-serif`;
                    ctx.fillStyle = '#0f172a';
                    wrapToWidth(ctx, cleanContrName(r.name), slotW, 4).forEach(line => {
                        ctx.fillText(line, x, y);
                        y += n > 10 ? 9 : 10;
                    });
                    ctx.font = `${n > 10 ? 7 : 8}px Verdana, sans-serif`;
                    ctx.fillStyle = '#64748b';
                    wrapToWidth(ctx, r.workType || '—', slotW, 4).forEach(line => {
                        ctx.fillText(line, x, y);
                        y += n > 10 ? 8 : 9;
                    });
                    ctx.restore();
                });
            }
        };
        return generatePdfChart({
            type: 'bar',
            data: {
                labels: rows.map(() => ''),
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 3,
                    maxBarThickness: barMax
                }]
            },
            options: {
                layout: { padding: { top: 26, bottom: 78, left: 4, right: 4 } },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { font: { size: 8 }, stepSize: 20 },
                        grid: { color: '#e2e8f0' }
                    },
                    x: {
                        ticks: { display: false },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const r = rows[items[0].dataIndex];
                                return `${cleanContrName(r.name)}\n${r.workType || ''}`;
                            },
                            label: (ctx) => {
                                const r = rows[ctx.dataIndex];
                                const d = (r.delta == null) ? 'н/д' : ((r.delta > 0 ? '+' : '') + r.delta + ' п.п.');
                                return `${r.value}% · Δ ${d}`;
                            }
                        }
                    }
                }
            },
            plugins: [labelPlugin]
        }, chartW, 300);
    };

    // Все подрядчики выборки, у которых есть проверки
    const chartRows = Object.keys(groupedC).map(cName => {
        const items = groupedC[cName] || [];
        if (!items.length) return null;
        const urkNow = Math.round(items.reduce((s, i) => s + (Number(i.metrics?.final) || 0), 0) / items.length);
        const m = getContractorMetrics(items, _templates().getUserTemplates());
        const dUrk = deltaForContractor(items, bucketAvgUrk);
        const dIurk = deltaForContractor(items, bucketIurk);
        return {
            name: cName,
            workType: dominantWorkType(items),
            urk: { value: urkNow, delta: dUrk ? dUrk.delta : null },
            iurk: { value: m ? m.finalC : urkNow, delta: dIurk ? dIurk.delta : null }
        };
    }).filter(Boolean).sort((a, b) => b.urk.value - a.urk.value);

    // Графики: ≤20 столбцов; если больше — топ-10 и низ-10 по метрике графика + маркер «не показано»
    const CHART_CAP = 20;
    const CHART_HEAD = 10;
    const CHART_TAIL = 10;
    const trimBarRowsForPdf = (rows) => {
        if (rows.length <= CHART_CAP) return rows;
        const skipped = rows.length - CHART_HEAD - CHART_TAIL;
        return [
            ...rows.slice(0, CHART_HEAD),
            {
                name: `··· не показано ${skipped} ···`,
                workType: `из ${rows.length}`,
                value: 0,
                delta: null,
                isGap: true
            },
            ...rows.slice(-CHART_TAIL)
        ];
    };
    const urkBarRows = trimBarRowsForPdf(chartRows.map(r => ({
        name: r.name, workType: r.workType, value: r.urk.value, delta: r.urk.delta
    })));
    // Надёжность — свой порядок по ИУрК (не по УрК)
    const iurkBarRows = trimBarRowsForPdf(
        [...chartRows]
            .sort((a, b) => (b.iurk.value - a.iurk.value) || (b.urk.value - a.urk.value))
            .map(r => ({
                name: r.name, workType: r.workType, value: r.iurk.value, delta: r.iurk.delta
            }))
    );
    const imgUrk = makeVerticalContractorBars(urkBarRows);
    const imgRel = makeVerticalContractorBars(iurkBarRows);
    const chartTrimNote = chartRows.length > CHART_CAP
        ? ` Показаны топ-${CHART_HEAD} и низ-${CHART_TAIL} из ${chartRows.length}.`
        : '';

    // ── ПК СК (без детализации) за период фильтра выгрузки ───────────────
    let skRecords = (_getSkRecords() || []).filter(r => !r._deleted);
    let lastSkLoad = null;
    skRecords.forEach(r => {
        const loadTs = r.last_imported_at || r.first_imported_at || r.imported_at || r.synced_at || r.updated_at;
        if (!loadTs) return;
        const d = new Date(loadTs);
        if (!Number.isNaN(d.getTime()) && (!lastSkLoad || d > lastSkLoad)) lastSkLoad = d;
    });
    let periodDays = 30;
    if (selPeriod === 'DAY') {
        periodDays = 1;
        skRecords = skRecords.filter(r => r.date_issued && new Date(r.date_issued).toDateString() === now.toDateString());
    } else if (selPeriod === 'WEEK') {
        periodDays = 7;
        const w = new Date(now); w.setDate(now.getDate() - 7);
        skRecords = skRecords.filter(r => r.date_issued && new Date(r.date_issued) >= w);
    } else if (selPeriod === 'MONTH') {
        periodDays = 30;
        const m = new Date(now); m.setDate(now.getDate() - 30);
        skRecords = skRecords.filter(r => r.date_issued && new Date(r.date_issued) >= m);
    } else if (selPeriod === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        const fromD = dFrom ? new Date(dFrom) : null;
        const toD = dTo ? new Date(dTo) : now;
        if (dTo) toD.setHours(23, 59, 59, 999);
        if (fromD && toD) periodDays = Math.max(1, Math.ceil((toD - fromD) / DAY_MS));
        if (dFrom) skRecords = skRecords.filter(r => r.date_issued && new Date(r.date_issued) >= new Date(dFrom));
        if (dTo) {
            const tDate = new Date(dTo); tDate.setHours(23, 59, 59, 999);
            skRecords = skRecords.filter(r => r.date_issued && new Date(r.date_issued) <= tDate);
        }
    } else {
        const dates = skRecords.map(r => r.date_issued ? new Date(r.date_issued).getTime() : NaN).filter(n => !Number.isNaN(n));
        if (dates.length) {
            periodDays = Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / DAY_MS) || 1);
        }
    }
    const fProj = _analyticsFilters().project || [];
    const fContr = _analyticsFilters().contractor || [];
    if (opts.forceProjectName) {
        // Лист объекта в company v2: ПК СК и инженеры только этого объекта
        skRecords = skRecords.filter(matchesForcedProject);
    } else if (fProj.length) {
        skRecords = skRecords.filter(r =>
            fProj.includes(r.project_display_name) || fProj.includes(r.project_canonical_key) || fProj.includes(r.display_name) || fProj.includes(r.projectName));
    }
    if (fContr.length) {
        skRecords = skRecords.filter(r =>
            fContr.includes(r.contractor_name) || fContr.includes(r.contractor) || fContr.includes(r.contractor_canonical_key));
    }

    const isSkOpen = (r) => !(r.is_verified_closed === true
        || r.status_normalized === 'verified'
        || String(r.status || '').toLowerCase().trim() === 'проверено');

    let skOpen = 0, skOverdue = 0, skOpenOverdue = 0, skClosedLate = 0;
    let skOnTimeClosed = 0, skWithDeadlineClosed = 0, skNoDeadline = 0;
    const overdueDepths = [];
    const closingTimes = [];
    const overdueContrSet = new Set();
    skRecords.forEach(r => {
        const open = isSkOpen(r);
        if (open) skOpen++;
        const issued = r.date_issued ? new Date(r.date_issued) : null;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        const resolved = r.date_resolved ? new Date(r.date_resolved) : null;
        if (issued && resolved && !Number.isNaN(issued.getTime()) && !Number.isNaN(resolved.getTime()) && resolved >= issued) {
            closingTimes.push(Math.max(0, Math.ceil((resolved - issued) / DAY_MS)));
        }
        if (!deadline || Number.isNaN(deadline.getTime())) {
            skNoDeadline++;
            return;
        }
        const contr = r.contractor_name || r.contractor || 'Не указан';
        if (open && now > deadline) {
            skOverdue++;
            skOpenOverdue++;
            overdueContrSet.add(contr);
            overdueDepths.push(Math.max(0, Math.ceil((now - deadline) / DAY_MS)));
        } else if (!open && resolved && resolved > deadline) {
            skOverdue++;
            skClosedLate++;
            overdueContrSet.add(contr);
            overdueDepths.push(Math.max(0, Math.ceil((resolved - deadline) / DAY_MS)));
        }
        if (!open && resolved && !Number.isNaN(resolved.getTime())) {
            skWithDeadlineClosed++;
            if (resolved <= deadline) skOnTimeClosed++;
        }
    });
    const skTotal = skRecords.length;
    const skClosed = skTotal - skOpen;
    const skResolved = skRecords.filter(r => !!r.date_resolved).length;
    const avgOverdueDepth = overdueDepths.length
        ? Math.round(overdueDepths.reduce((a, b) => a + b, 0) / overdueDepths.length)
        : 0;
    const maxOverdueDepth = overdueDepths.length ? Math.max(...overdueDepths) : 0;
    const avgResolveDays = closingTimes.length
        ? Math.round(closingTimes.reduce((a, b) => a + b, 0) / closingTimes.length)
        : null;
    const skOverduePerc = skTotal ? Math.round((skOverdue / skTotal) * 100) : 0;
    const skClosePerc = skTotal ? Math.round((skClosed / skTotal) * 100) : 0;
    const skOnTimePerc = skWithDeadlineClosed
        ? Math.round((skOnTimeClosed / skWithDeadlineClosed) * 100)
        : null;
    const skOverdueContrCount = overdueContrSet.size;
    const weeksInPeriod = Math.max(periodDays / 7, 0.14);
    const skIssuePace = Math.round((skTotal / weeksInPeriod) * 10) / 10;
    const skClosePace = Math.round((skResolved / weeksInPeriod) * 10) / 10;
    const skNetPace = Math.round((skIssuePace - skClosePace) * 10) / 10;
    const lastSkLoadLabel = lastSkLoad
        ? lastSkLoad.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'не зафиксирована';
    const skPeriodHint = selPeriod === 'ALL' ? 'весь период'
        : (selPeriod === 'DAY' ? 'сегодня'
            : (selPeriod === 'WEEK' ? '7 дней'
                : (selPeriod === 'MONTH' ? '30 дней' : 'свой период')));

    // ── Нижняя часть: сводка аудитов + ПК СК списки + справка ─────────────
    const escPdf = (s) => String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const urkTone = (v) => (v < 70 ? '#ef4444' : (v < 85 ? '#f59e0b' : '#22c55e'));
    const riskTone = (v) => (v >= 20 ? '#ef4444' : (v > 0 ? '#f59e0b' : '#22c55e'));
    const numCell = (color, label) =>
        `<div style="font-size:12px;font-weight:900;color:${color};text-align:center;line-height:1.1;white-space:nowrap;">${label}</div>`;
    const contrStatsAll = chartRows.map(r => {
        const items = groupedC[r.name] || [];
        let sumB1 = 0, sumB2 = 0, sumB3 = 0, checksWithB3 = 0;
        items.forEach(i => {
            if (!i.metrics) return;
            sumB1 += Number(i.metrics.n_B1_fail) || 0;
            sumB2 += Number(i.metrics.n_B2_fail) || 0;
            sumB3 += Number(i.metrics.n_B3_fail) || 0;
            if (i.metrics.b3_found || (Number(i.metrics.n_B3_fail) || 0) > 0) checksWithB3++;
        });
        const n = items.length;
        const hasRel = n >= 7;
        const m = getContractorMetrics(items, _templates().getUserTemplates(), false);
        const percCrit = n ? Math.round((checksWithB3 / n) * 100) : 0;
        const rB2 = m ? Math.round(m.maxFailRate) : 0;
        return {
            key: r.name,
            name: cleanContrName(r.name),
            workType: r.workType || '—',
            n,
            hasRel,
            urk: r.urk.value,
            // ИУрК / надёжность только при N≥7
            iurk: hasRel && m ? m.finalC : null,
            defects: sumB1 + sumB2 + sumB3,
            b1: sumB1,
            b2: sumB2,
            b3: sumB3,
            rB2,
            percCrit
        };
    });

    // Ранжирование по ИУрК только среди N≥7; остальные — по УрК в хвосте полного списка
    const withRel = contrStatsAll.filter(c => c.hasRel).sort((a, b) => (b.iurk - a.iurk) || (b.urk - a.urk) || (b.n - a.n));
    const withoutRel = contrStatsAll.filter(c => !c.hasRel).sort((a, b) => b.urk - a.urk || b.n - a.n);
    const byRank = [...withRel, ...withoutRel];
    const contrStatsTotal = byRank.length;
    // Топ-5 + худшие-5 без пересечений: нужно ≥10 с ИУрК (N≥7).
    // Если подрядчиков всего >10, но с надёжностью меньше 10 — одна общая
    // таблица (иначе «худшие» урезались бы до 1–4 или дублировали «лучших»).
    const useTopBottom = contrStatsTotal > 10 && withRel.length >= 10;
    let displaySections;
    if (!contrStatsTotal) {
        displaySections = [];
    } else if (!useTopBottom) {
        displaySections = [{ title: null, rows: byRank }];
    } else {
        const best = withRel.slice(0, 5);
        const bestKeys = new Set(best.map(c => c.key));
        const worst = [...withRel].reverse().filter(c => !bestKeys.has(c.key)).slice(0, 5);
        displaySections = [
            { title: `Лучшие по надёжности · топ-5 из ${withRel.length}`, rows: best, tone: 'good' },
            { title: `Худшие по надёжности · топ-5 из ${withRel.length}`, rows: worst, tone: 'bad' }
        ];
    }
    const renderContrRow = (c, idx) => {
        const uC = urkTone(c.urk);
        const critC = riskTone(c.percCrit);
        const rb2C = c.rB2 >= 40 ? '#ef4444' : (c.rB2 >= 20 ? '#f59e0b' : '#64748b');
        const bg = idx % 2 ? '#f8fafc' : '#fff';
        const iurkCell = c.hasRel && c.iurk != null
            ? numCell(urkTone(c.iurk), c.iurk + '%')
            : `<div style="font-size:10px;font-weight:900;color:#94a3b8;text-align:center;">СБОР</div>`;
        return `<tr style="background:${bg};">
            <td style="padding:3px 4px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">
                <div style="font-size:11px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15;">${escPdf(c.name)}</div>
                <div style="font-size:8px;font-weight:600;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1;">${escPdf(c.workType)}</div>
            </td>
            <td style="padding:3px 2px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:12px;font-weight:900;color:#334155;">${c.n}</td>
            <td style="padding:3px 2px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${numCell(uC, c.urk + '%')}</td>
            <td style="padding:3px 2px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${iurkCell}</td>
            <td style="padding:3px 2px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${numCell('#0f172a', String(c.defects))}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:900;color:#64748b;">${c.b1}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:900;color:#c2410c;">${c.b2}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:900;color:#b91c1c;">${c.b3}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${numCell(rb2C, c.rB2 + '%')}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${numCell(critC, c.percCrit + '%')}</td>
        </tr>`;
    };

    let rowIdx = 0;
    const contrStatsRows = displaySections.map(sec => {
        const head = sec.title
            ? `<tr><td colspan="10" style="padding:3px 4px;background:${sec.tone === 'good' ? '#ecfdf5' : '#fef2f2'};border-bottom:1px solid #e2e8f0;font-size:9px;font-weight:900;color:${sec.tone === 'good' ? '#047857' : '#b91c1c'};text-transform:uppercase;">${sec.title}</td></tr>`
            : '';
        return head + sec.rows.map(c => renderContrRow(c, rowIdx++)).join('');
    }).join('');

    const auditTableHtml = `
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:3px 4px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:left;">Подрядчик / вид работ</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:4%;">N</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:9%;">УрК</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:9%;">ИУрК</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:7%;">Деф.</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:4%;">B1</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:4%;">B2</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:4%;">B3</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:9%;">Повт.B2</th>
                <th style="padding:3px 2px;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:center;width:9%;">% B3</th>
            </tr></thead>
            <tbody>${contrStatsRows || `<tr><td colspan="10" style="padding:6px;text-align:center;font-size:12px;color:#94a3b8;">Нет подрядчиков</td></tr>`}</tbody>
        </table>`;

    // Пояснения: прежний текст, приглушённые цвета; блок закреплён у низа левой колонки листа
    // Бюджет A3 landscape: страница 297mm − поля 10+10 ≈ 1047px; root padding 14+14; шапка dense ≈ 80–90
    // → тело ~930px. Раньше брали ~832 — снизу пусто, а справку резали overflow.
    const A3_PAGE_H = Math.floor(297 * 3.7795);       // ~1122
    const A3_MARGIN_H = Math.floor(20 * 3.7795);      // 10+10 mm
    const A3_ROOT_PAD_H = 28;                         // padding top+bottom pdf-print-root
    const A3_HEADER_BUDGET = 88;                      // dense header + QR
    const OP2_BODY_MAX = Math.max(860, A3_PAGE_H - A3_MARGIN_H - A3_ROOT_PAD_H - A3_HEADER_BUDGET); // ~931
    const OP2_KPI_H = 62;                             // KPI row + margin
    const OP2_COLS_H = OP2_BODY_MAX - OP2_KPI_H;
    const OP2_CHART_H = 200;
    const OP2_SK_MINI_H = 148;
    // Справка и списки СК — по контенту (не height:100%), иначе рамки тянутся в пустоту и низ обрезается
    // Списки ПК СК (читаемый шрифт): до 18; иначе топ-8 + низ-8
    const LIST_CAP = 18;
    const LIST_HEAD = 8;
    const LIST_TAIL = 8;
    const helpFormula = (txt) => `
        <div style="font-family:Consolas,'Courier New',monospace;font-size:7px;font-weight:700;color:#475569;background:#f1f5f9;border:1px solid #dbe3f0;border-radius:2px;padding:1px 3px;margin:1px 0;text-align:center;line-height:1.15;">${txt}</div>`;
    const helpNote = (txt) => `
        <div style="font-size:6.5px;line-height:1.15;color:#64748b;margin:0 0 1px;">${txt}</div>`;
    const helpThreshLine = (label, items) => `
        <div style="font-size:6.5px;line-height:1.15;margin:0;color:#475569;">
            <b style="color:#64748b;font-weight:700;">${label}:</b>
            ${items.map(([c, v]) => `<span style="white-space:nowrap;margin-left:1px;">${c}→<b style="color:#475569;font-weight:700;">${v}</b></span>`).join('<span style="color:#cbd5e1;"> · </span>')}
        </div>`;
    const helpCard = (title, border, accent, body) => `
        <div style="background:#fff;border:1px solid ${border};border-left:2px solid ${accent};border-radius:3px;padding:2px 3px;box-sizing:border-box;">
            <div style="font-size:7.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.01em;margin-bottom:0;line-height:1.1;">${title}</div>
            <div style="font-size:7px;line-height:1.2;color:#475569;">${body}</div>
        </div>`;
    const deltaPeriodLabel = chartPeriod === 'WEEK' ? 'недельный' : 'месячный';
    const metricsHelpHtml = `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 3px;box-sizing:border-box;">
            <div style="font-size:8px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:1px;line-height:1.05;">Пояснения · как читать и считать показатели</div>
            <div style="font-size:6.5px;line-height:1.15;color:#92400e;font-weight:600;background:#fffbeb;border:1px solid #fde68a;border-radius:2px;padding:1px 3px;margin-bottom:1px;">
                УрК — <b>снимок на дату осмотра</b> (поздние устранения не меняют). B1/B2/B3 — лёгкий / средний / критичный; fail_escalated = B3.
            </div>
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                <tr>
                    <td style="width:50%;padding:0 1px 1px 0;vertical-align:top;">
                        ${helpCard('1. Одна проверка: физика и документация', '#e0e7ff', '#a5b4fc', `
                            В одной проверке две оценки; в KPI рядом: <b>физ. · док.</b>
                            <div style="margin-top:1px;padding:1px 2px;background:#f5f7ff;border-radius:2px;border:1px solid #e0e7ff;">
                                <b style="color:#6366f1;">УрК физики</b> — насколько «ок» выполнены физические пункты.<br>
                                Считают долю «ок» с весами (B1=1, B2=2, B3=3), затем штрафуют за системные B2 и за критику.
                                ${helpFormula('УрК = round( Urk_base × Kc × Kcrit ) ≤ 84')}
                                ${helpNote('Urk_base — доля ок по весам. Kc — штраф за частоту fail среди B2. Kcrit — штраф, если есть B3. Потолок 84 — если есть B2/B3 или штрафы.')}
                                ${helpThreshLine('Kc', [['нет fail', '1'], ['&lt;20%', '0,95'], ['20–50%', '0,85'], ['≥50%', '0,70']])}
                                ${helpThreshLine('Kcrit', [['есть B3', '0,50'], ['нет B3', '1']])}
                            </div>
                            <div style="margin-top:1px;padding:1px 2px;background:#f7fdf9;border-radius:2px;border:1px solid #dcfce7;">
                                <b style="color:#16a34a;">Документация</b> — то же для пунктов documentary, <b>без</b> штрафов и потолка 84.
                                ${helpFormula('Doc = (W<sub>ok doc</sub> / W<sub>tot doc</sub>) × 100')}
                            </div>
                        `)}
                    </td>
                    <td style="width:50%;padding:0 0 1px 1px;vertical-align:top;">
                        ${helpCard('2. ИУрК — надёжность подрядчика', '#e0f2fe', '#7dd3fc', `
                            Не одна проверка, а <b>насколько стабильно</b> держит качество со временем.
                            <div style="margin:1px 0;padding:1px 2px;background:#f0f9ff;border:1px solid #e0f2fe;border-radius:2px;font-size:6.5px;font-weight:600;color:#0284c7;">
                                В ИУрК идёт <b>только физика</b>. Документация не входит.
                            </div>
                            Берут ср. УрК физики за последние проверки (до 15) и снижают за повторяющиеся B2 и частые B3.
                            Показывают при <b>N≥7</b>; иначе «СБОР». При штрафах — потолок 84.
                            ${helpFormula('ИУрК = round( УрК<sub>ср. физики</sub> × Ks × KB3 )')}
                            ${helpNote('Ks — штраф, если один и тот же B2-пункт часто «краснеет». KB3 — штраф, если много проверок с критикой.')}
                            ${helpThreshLine('Ks (повтор B2)', [['&lt;10%', '1'], ['≥10%', '0,95'], ['≥20%', '0,85'], ['≥40%', '0,70'], ['≥60%', '0,50']])}
                            ${helpThreshLine('KB3 (доля пр. с B3)', [['0%', '1'], ['&gt;0%', '0,95'], ['≥5%', '0,90'], ['≥10%', '0,85'], ['≥20%', '0,70'], ['≥30%', '0,50']])}
                        `)}
                    </td>
                </tr>
                <tr>
                    <td style="width:50%;padding:0 1px 0 0;vertical-align:top;">
                        ${helpCard('3. ИКО · подрядчики в провале · Δ · сводка', '#fef3c7', '#fcd34d', `
                            <b>ИКО — индекс риска объекта</b> (от 0 до 1). Отвечает на вопрос: <b>насколько «опасно» качество на объекте в целом</b>.
                            Чем <b>выше</b> ИКО — тем хуже (больше риск). Считается только по подрядчикам с N≥7.
                            Для каждого такого подрядчика считают свой риск K<sub>op</sub> (чем ниже УрК и стабильность и чем чаще B3 — тем K<sub>op</sub> выше), затем берут взвешенное среднее.
                            ${helpFormula('K<sub>op</sub> = 1 − (urk/100)×(stab/100)×(1 − 0,5·hasB3)')}
                            ${helpFormula('ИКО = Σ(K<sub>op</sub> × Wr) / Σ(Wr)')}
                            ${helpNote('urk — УрК; stab — стабильность; hasB3=1 если был B3; Wr — вес подрядчика. Пример: ИКО 0,2 — спокойно; 0,6+ — зона внимания.')}
                            <b>Подрядчики с ИУрК&lt;70%</b> — сколько подрядчиков уже с надёжностью (N≥7) и при этом в провале. Рядом доля от всех с N≥7. Это масштаб проблемы «по людям», а не по проверкам.<br>
                            <b>Δ</b> — рост/спад к предыдущему ${deltaPeriodLabel === 'недельный' ? 'недельному' : 'месячному'} интервалу (п.п.).<br>
                            <b>Сводка:</b> N · Деф.=B1+B2+B3 · B1/B2/B3 · Повт.B2 · %B3. При &gt;10 подрядчиках и ≥10 с ИУрК — топ-5 лучших и топ-5 худших без пересечений.
                        `)}
                    </td>
                    <td style="width:50%;padding:0 0 0 1px;vertical-align:top;">
                        ${helpCard('4. ПК СК · просрочка · точность', '#fecaca', '#fca5a5', `
                            Замечания стройконтроля с <b>датой выдачи</b> в периоде «${skPeriodHint}».
                            <b>Открыто</b> — ещё не «проверено»; <b>закрыто</b> = всего−открыто; <b>устранено</b> — есть date_resolved.<br>
                            <b>Просрочка</b> — срок уже вышел (ещё открыто или закрыли поздно).
                            ${helpFormula('Доля просрочки = просрочено / всего')}
                            ${helpFormula('Точность инженера = замечания со ссылкой на норму / всего')}
                            ${helpNote('«Со ссылкой» — в тексте есть СП / ГОСТ / ППР / чертёж и т.п. Глубина — ср. и макс. дни опоздания. Темп — выдача и закрытие за неделю.')}
                            Списки: до ${LIST_CAP} строк; если больше — топ-${LIST_HEAD} и низ-${LIST_TAIL}.
                        `)}
                    </td>
                </tr>
            </table>
        </div>`;

    // Рейтинг подрядчиков по просрочке ПК СК (в PDF: ≤35 или топ-17 + низ-17)
    const skContrMap = {};
    skRecords.forEach(r => {
        const c = r.contractor_name || r.contractor || 'Не указан';
        if (!skContrMap[c]) skContrMap[c] = { total: 0, overdue: 0, depths: [] };
        skContrMap[c].total++;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        if (!deadline || Number.isNaN(deadline.getTime())) return;
        const open = isSkOpen(r);
        const resolved = r.date_resolved ? new Date(r.date_resolved) : null;
        if (open && now > deadline) {
            skContrMap[c].overdue++;
            skContrMap[c].depths.push(Math.max(0, Math.ceil((now - deadline) / DAY_MS)));
        } else if (!open && resolved && resolved > deadline) {
            skContrMap[c].overdue++;
            skContrMap[c].depths.push(Math.max(0, Math.ceil((resolved - deadline) / DAY_MS)));
        }
    });
    const skContrRating = Object.keys(skContrMap).map(name => {
        const d = skContrMap[name];
        const avgDepth = d.depths.length ? Math.round(d.depths.reduce((a, b) => a + b, 0) / d.depths.length) : 0;
        const maxDepth = d.depths.length ? Math.max(...d.depths) : 0;
        const overduePerc = d.total > 0 ? Math.round((d.overdue / d.total) * 100) : 0;
        return { name, overdue: d.overdue, overduePerc, avgDepth, maxDepth, total: d.total };
    }).filter(x => x.overdue > 0).sort((a, b) => b.overdue - a.overdue || b.avgDepth - a.avgDepth || b.maxDepth - a.maxDepth);

    const engMap = {};
    const normRe = /(сп\s*\d|гост|ПУЭ|снип|шифр|тр\s|тк\s|ппр|\d+\s*(мм|см|м|%|град)|(лист|л\.|узел|уз\.|пункт|п\.|приказ[а-я]*)\s*(№\s*|от\s*)?\d+)/i;
    skRecords.forEach(r => {
        const name = (r.inspector && r.inspector.trim()) ? r.inspector.trim() : 'Не указан';
        if (!engMap[name]) engMap[name] = { total: 0, matched: 0 };
        engMap[name].total++;
        const textLower = r.text ? String(r.text).toLowerCase() : '';
        if (normRe.test(textLower)) engMap[name].matched++;
    });
    const engAccuracy = Object.keys(engMap).map(name => {
        const d = engMap[name];
        return {
            name,
            total: d.total,
            matched: d.matched,
            accuracy: d.total ? Math.round((d.matched / d.total) * 100) : 0
        };
    }).filter(e => e.total >= 1).sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);

    const ikoColor = parseFloat(mData.IKO) >= 0.6 ? '#dc2626' : (parseFloat(mData.IKO) >= 0.3 ? '#d97706' : '#16a34a');
    const urkPhysColor = urkTone(currAvgUrk);
    const relColor = avgReliability != null ? urkTone(avgReliability) : '#94a3b8';
    const redContrColor = redContrCount >= 3 || (redContrPerc != null && redContrPerc >= 20)
        ? '#dc2626'
        : (redContrCount > 0 ? '#d97706' : '#16a34a');
    const redContrKpiValue = relN > 0
        ? `<span style="color:${redContrColor}">${redContrCount}</span><span style="color:#94a3b8;font-size:11px;"> · </span><span style="color:${redContrColor};font-size:13px;">${redContrPerc}%</span>`
        : '<span style="color:#94a3b8">СБОР</span>';
    const urkKpiValue = currAvgDoc != null
        ? `<span style="color:${urkPhysColor};">${currAvgUrk}%</span><span style="color:#94a3b8;font-size:12px;"> · </span><span style="color:#4f46e5;">${currAvgDoc}%</span>`
        : `<span style="color:${urkPhysColor};">${currAvgUrk}%</span>`;
    const urkTrendHtml = (() => {
        const tPhys = renderTrend(currAvgUrk, prevAvgUrk, 'физика');
        if (currAvgDoc == null) return renderTrend(currAvgUrk, prevAvgUrk, trendLabel);
        const tDoc = renderTrend(currAvgDoc, prevAvgDoc, 'докум.');
        return `<table style="width:100%;border-collapse:collapse;"><tr><td style="width:50%;">${tPhys}</td><td style="width:50%;">${tDoc}</td></tr></table>`;
    })();
    const kpiCard = (label, valueHtml, trendHtml, extraStyle = '') => `
        <td style="width:16.66%; padding:0 2px; vertical-align:top;">
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:7px;padding:3px 4px 2px;height:58px;box-sizing:border-box;text-align:center;overflow:hidden;${extraStyle}">
                <div style="font-size:8px;color:#64748b;text-transform:uppercase;font-weight:900;letter-spacing:0.01em;line-height:1.15;max-height:1.4em;overflow:hidden;">${label}</div>
                <div style="font-size:18px;font-weight:900;color:#0f172a;line-height:1.05;margin-top:1px;">${valueHtml}</div>
                <div style="margin-top:1px;overflow:hidden;">${trendHtml}</div>
            </div>
        </td>`;

    const th = (txt, w = '') => `<th style="padding:2px 3px;border-bottom:1px solid #cbd5e1;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:left;${w ? `width:${w};` : ''}">${txt}</th>`;
    const thR = (txt, w = '') => `<th style="padding:2px 3px;border-bottom:1px solid #cbd5e1;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;text-align:right;${w ? `width:${w};` : ''}">${txt}</th>`;

    // Градиент риск: 0 = зелёный, 0.5 = жёлтый, 1 = красный
    const riskGrad = (t) => {
        const x = Math.max(0, Math.min(1, Number(t) || 0));
        const stops = [[22, 163, 74], [217, 119, 6], [220, 38, 38]];
        const seg = x < 0.5 ? 0 : 1;
        const u = x < 0.5 ? x * 2 : (x - 0.5) * 2;
        const a = stops[seg];
        const b = stops[seg + 1];
        const rgb = a.map((c, i) => Math.round(c + (b[i] - c) * u));
        return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    };
    const riskByPerc = (p) => riskGrad(Math.min(1, (Number(p) || 0) / 50)); // 0% зел. → 50%+ красн.
    const riskByDays = (d) => riskGrad(Math.min(1, (Number(d) || 0) / 28)); // 0 дн зел. → 28+ красн.
    const goodByPerc = (p) => riskGrad(1 - Math.min(1, (Number(p) || 0) / 100)); // выше % = зеленее

    const splitListForPdf = (arr) => {
        if (!arr.length) return { mode: 'empty' };
        if (arr.length <= LIST_CAP) {
            return { mode: 'full', rows: arr.map((item, i) => ({ item, rank: i + 1 })) };
        }
        const skipped = arr.length - LIST_HEAD - LIST_TAIL;
        return {
            mode: 'split',
            total: arr.length,
            skipped,
            head: arr.slice(0, LIST_HEAD).map((item, i) => ({ item, rank: i + 1 })),
            tail: arr.slice(-LIST_TAIL).map((item, i) => ({ item, rank: arr.length - LIST_TAIL + i + 1 }))
        };
    };
    const gapRowHtml = (colspan, skipped, total) => `
            <tr>
                <td colspan="${colspan}" style="padding:3px 4px;border-bottom:1px solid #e2e8f0;background:#f8fafc;text-align:center;font-size:8px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.02em;">
                    ··· не показано ${skipped} из ${total} ···
                </td>
            </tr>`;

    const skContrSplit = splitListForPdf(skContrRating);
    const renderSkContrRow = ({ item: r, rank }) => `
            <tr>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:800;color:#94a3b8;">${rank}</td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:700;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escPdf(r.name)}</td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:800;text-align:right;white-space:nowrap;overflow:hidden;color:${riskByPerc(r.overduePerc)};">${r.overdue}<span style="color:#94a3b8;font-weight:600;">/${r.total}</span></td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:800;text-align:right;overflow:hidden;color:${riskByPerc(r.overduePerc)};">${r.overduePerc}%</td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:800;text-align:right;overflow:hidden;color:${riskByDays(r.avgDepth)};">${r.avgDepth}</td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:800;text-align:right;overflow:hidden;color:${riskByDays(r.maxDepth)};">${r.maxDepth}</td>
            </tr>`;
    const skContrRows = skContrSplit.mode === 'empty'
        ? `<tr><td colspan="6" style="padding:3px;text-align:center;font-size:12px;color:#16a34a;font-weight:700;">Просрочек нет</td></tr>`
        : (skContrSplit.mode === 'full'
            ? skContrSplit.rows.map(renderSkContrRow).join('')
            : skContrSplit.head.map(renderSkContrRow).join('')
                + gapRowHtml(6, skContrSplit.skipped, skContrSplit.total)
                + skContrSplit.tail.map(renderSkContrRow).join(''));

    const engSplit = splitListForPdf(engAccuracy);
    const renderEngRow = ({ item: e, rank }) => {
        const accColor = e.accuracy >= 80 ? '#16a34a' : (e.accuracy >= 50 ? '#d97706' : '#dc2626');
        return `
            <tr>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:800;color:#94a3b8;">${rank}</td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:700;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escPdf(e.name)}</td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:10px;font-weight:800;text-align:right;white-space:nowrap;overflow:hidden;">${e.matched}/${e.total}</td>
                <td style="padding:1px 2px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:900;color:${accColor};text-align:right;overflow:hidden;">${e.accuracy}%</td>
            </tr>`;
    };
    const engRows = engSplit.mode === 'empty'
        ? `<tr><td colspan="4" style="padding:3px;text-align:center;font-size:12px;color:#94a3b8;font-weight:700;">Нет данных ПК СК</td></tr>`
        : (engSplit.mode === 'full'
            ? engSplit.rows.map(renderEngRow).join('')
            : engSplit.head.map(renderEngRow).join('')
                + gapRowHtml(4, engSplit.skipped, engSplit.total)
                + engSplit.tail.map(renderEngRow).join(''));

    const tempoBalance = skClosePace >= skIssuePace ? 'закрытие ≥ выдачи' : 'долг растёт';
    const tempoBalanceColor = skClosePace >= skIssuePace ? '#16a34a' : '#dc2626';

    const blockHead = (title, what) => `
        <div style="margin-bottom:2px;">
            <div style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;line-height:1.15;">${title}</div>
            <div style="font-size:8px;color:#64748b;font-weight:600;line-height:1.2;margin-top:1px;max-height:2.4em;overflow:hidden;">${what}</div>
        </div>`;

    const chartBox = (title, what, img) => `
        <div style="background:#fff;border:1px solid #cbd5e1;border-radius:7px;padding:4px 6px;height:${OP2_CHART_H}px;box-sizing:border-box;overflow:hidden;">
            ${blockHead(title, what)}
            <div style="height:${OP2_CHART_H - 42}px;">${img
                ? `<img src="${img}" style="width:100%;height:100%;object-fit:contain;display:block;">`
                : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;font-weight:700;text-align:center;">Недостаточно данных</div>`}</div>
        </div>`;

    // Ширины числовых колонок подогнаны под 4-значные значения (probe: 128/1543 ≈ 55px)
    const skOverdueBlock = `
        <div style="background:#fff;border:1px solid #fecaca;border-radius:6px;padding:3px 4px;box-sizing:border-box;">
            ${blockHead('Просрочка подрядчиков', `Срыв сроков за «${skPeriodHint}». До ${LIST_CAP}; иначе топ-${LIST_HEAD}+низ-${LIST_TAIL}.`)}
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                <thead><tr>
                    ${th('№', '18px')}${th('Подрядчик')}${thR('Проср.', '58px')}${thR('Доля', '38px')}${thR('Ср.', '34px')}${thR('Макс', '34px')}
                </tr></thead>
                <tbody>${skContrRows}</tbody>
            </table>
        </div>`;

    const skEngBlock = `
        <div style="background:#fff;border:1px solid #c7d2fe;border-radius:6px;padding:3px 4px;box-sizing:border-box;">
            ${blockHead('Точность инженеров СК', `Ссылка на норму. «${skPeriodHint}». До ${LIST_CAP}; иначе топ-${LIST_HEAD}+низ-${LIST_TAIL}.`)}
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                <thead><tr>
                    ${th('№', '18px')}${th('Инженер')}${thR('Норм/вс.', '64px')}${thR('Точн.', '42px')}
                </tr></thead>
                <tbody>${engRows}</tbody>
            </table>
        </div>`;

    // Плитка фиксированной высоты: tip только в title
    const skMetricCell = (label, tip, valueHtml) => `
        <td style="width:25%;padding:1px 2px;vertical-align:top;">
            <div title="${escPdf(tip)}" style="background:#fff;border:1px solid #bfdbfe;border-radius:5px;padding:3px 4px;box-sizing:border-box;height:40px;overflow:hidden;">
                <div style="font-size:8px;font-weight:800;color:#64748b;text-transform:uppercase;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</div>
                <div style="font-size:15px;font-weight:900;color:#0f172a;line-height:1.05;margin-top:2px;text-align:right;white-space:nowrap;overflow:hidden;">${valueHtml}</div>
            </div>
        </td>`;

    const skMiniBlock = `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:4px 6px;box-sizing:border-box;margin-bottom:3px;">
            ${blockHead('Сводка ПК СК', `Ключевые цифры стройконтроля за «${skPeriodHint}» (по дате выдачи). Загрузка: ${lastSkLoadLabel}.${skNoDeadline ? ` Без срока: ${skNoDeadline}.` : ''}`)}
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:2px;">
                <tr>
                    ${skMetricCell('Всего выдано', 'Все замечания за период фильтра', `${skTotal}`)}
                    ${skMetricCell('Открыто / закрыто', 'Ещё в работе / уже закрыты (% закрытия)', `<span style="color:${riskByPerc(100 - skClosePerc)}">${skOpen}</span> / ${skClosed} <span style="font-size:11px;color:#64748b;">(${skClosePerc}%)</span>`)}
                    ${skMetricCell('Устранено', 'Есть дата устранения у подрядчика', `<span style="color:#16a34a">${skResolved}</span>`)}
                    ${skMetricCell('Ср. срок устран.', 'Средние дни от выдачи до устранения', avgResolveDays != null ? `<span style="color:${riskByDays(avgResolveDays)}">${avgResolveDays} дн.</span>` : '—')}
                </tr>
            </table>
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:2px;">
                <tr>
                    ${skMetricCell('Просрочено', 'Срок прошёл: открытые или закрытые с опозданием', `<span style="color:${riskByPerc(skOverduePerc)}">${skOverdue}</span> <span style="font-size:11px;color:${riskByPerc(skOverduePerc)};">(${skOverduePerc}%)</span>`)}
                    ${skMetricCell('Открытых проср.', 'Горящий долг: ещё не закрыты и уже просрочены', `<span style="color:${riskByPerc(skTotal ? Math.round((skOpenOverdue / skTotal) * 100) : 0)}">${skOpenOverdue}</span>`)}
                    ${skMetricCell('Закрыто с опозд.', 'Уже закрыли, но позже deadline', `${skClosedLate}`)}
                    ${skMetricCell('Вовремя закрыто', 'Доля закрытий не позже срока (из закрытых с deadline)', skOnTimePerc != null ? `<span style="color:${goodByPerc(skOnTimePerc)}">${skOnTimePerc}%</span>` : '—')}
                </tr>
            </table>
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                <tr>
                    ${skMetricCell('Глубина ср. / макс.', 'Среднее и худшее опоздание в днях', `<span style="color:${riskByDays(avgOverdueDepth)}">${avgOverdueDepth}</span> / <span style="color:${riskByDays(maxOverdueDepth)}">${maxOverdueDepth}</span> дн.`)}
                    ${skMetricCell('Подр. с просрочкой', 'Сколько подрядчиков имеют хотя бы одну просрочку', `<span style="color:${riskByPerc(skOverdueContrCount * 10)}">${skOverdueContrCount}</span>`)}
                    ${skMetricCell('Темп выд. / закр.', 'Сколько выдают и устраняют в среднем за неделю', `${skIssuePace} / ${skClosePace} <span style="font-size:10px;color:#94a3b8;">нед</span>`)}
                    ${skMetricCell('Баланс темпа', 'Закрытие успевает за выдачей или долг растёт', `<span style="color:${tempoBalanceColor};font-size:12px;">${tempoBalance}</span><span style="font-size:10px;color:#94a3b8;font-weight:700;"> · Δ ${skNetPace > 0 ? '+' : ''}${skNetPace}</span>`)}
                </tr>
            </table>
        </div>`;

    const OP2_LISTS_MAX = Math.max(180, OP2_COLS_H - OP2_CHART_H - OP2_SK_MINI_H);
    const content = `
    <div class="no-break" style="font-family:'Bricolage Grotesque',Verdana,sans-serif;height:${OP2_BODY_MAX}px;max-height:${OP2_BODY_MAX}px;overflow:hidden;overflow-x:hidden;width:100%;box-sizing:border-box;">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:4px;">
            <tr>
                ${kpiCard('Средний УрК · физика / документация', urkKpiValue, urkTrendHtml)}
                ${kpiCard('Средняя надёжность', avgReliability != null ? `<span style="color:${relColor}">${avgReliability}%</span>` : '<span style="color:#94a3b8">СБОР</span>', renderTrend(avgReliability, prevRel, trendLabel))}
                ${kpiCard('ИКО · индекс риска', `<span style="color:${ikoColor}">${mData.IKO}</span>`, renderTrend(mData.IKO, prevIko, trendLabel, true), parseFloat(mData.IKO) >= 0.6 ? 'background:#fef2f2;border-color:#fca5a5;' : '')}
                ${kpiCard('Число подрядчиков', `${currContrCount}`, renderTrend(currContrCount, prevContrs, trendLabel))}
                ${kpiCard('Число проверок', `${data.length}`, renderTrend(data.length, prevChecks, trendLabel))}
                ${kpiCard(
                    'Подрядчики с ИУрК&nbsp;&lt;&nbsp;70%',
                    redContrKpiValue,
                    relN > 0
                        ? `<div style="line-height:1.1;">${renderTrend(redContrCount, prevRedContrCount, trendLabel, true)}<div style="font-size:8px;color:#94a3b8;">${redContrCount} из ${relN} с надёжностью (N≥7)</div></div>`
                        : `<div style="font-size:8px;color:#94a3b8;line-height:1.15;">ещё нет подрядчиков с N≥7</div>`,
                    redContrCount > 0 ? 'background:#fef2f2;border-color:#fecaca;' : ''
                )}
            </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;height:${OP2_COLS_H}px;max-height:${OP2_COLS_H}px;">
            <tr>
                <td style="width:50%;padding-right:4px;vertical-align:top;height:${OP2_COLS_H}px;overflow:hidden;">
                    <table style="width:100%;border-collapse:collapse;table-layout:fixed;height:100%;">
                        <tr style="height:100%;">
                            <td style="vertical-align:top;padding:0;overflow:hidden;">
                                <div style="margin-bottom:3px;">
                                    ${chartBox(
                                        'Уровень качества',
                                        `Средний УрК физики по подрядчику · Δ (${growthHint}). До ${CHART_CAP} столбцов.${chartTrimNote}`,
                                        imgUrk
                                    )}
                                </div>
                                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:3px 5px;box-sizing:border-box;overflow:hidden;">
                                    ${blockHead(
                                        'Сводка по аудитам',
                                        useTopBottom
                                            ? `Топ-5 лучших и топ-5 худших по ИУрК из ${withRel.length} с надёжностью.`
                                            : `Подрядчики выборки${contrStatsTotal ? ` (${contrStatsTotal})` : ''}: проверки, качество, дефекты.`
                                    )}
                                    ${auditTableHtml}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="vertical-align:bottom;padding:0;height:1px;">
                                ${metricsHelpHtml}
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width:50%;padding-left:4px;vertical-align:top;height:${OP2_COLS_H}px;max-height:${OP2_COLS_H}px;overflow:hidden;">
                    <div style="margin-bottom:3px;">
                        ${chartBox(
                            'Надёжность',
                            `ИУрК по подрядчику · Δ (${growthHint}). До ${CHART_CAP} столбцов.${chartTrimNote}`,
                            imgRel
                        )}
                    </div>
                    ${skMiniBlock}
                    <div style="max-height:${OP2_LISTS_MAX}px;overflow:hidden;">
                        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                            <tr>
                                <td style="width:50%;padding-right:2px;vertical-align:top;">${skOverdueBlock}</td>
                                <td style="width:50%;padding-left:2px;vertical-align:top;">${skEngBlock}</td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>
        </table>
    </div>`;

    // Заголовок шапки (одна строка, высота шапки не растёт):
    // все объекты → «по всем»; один → имя; несколько → «по N объектам: …» (сколько влезет)
    const escTitle = (s) => String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    // ~56% ширины A3 landscape под заголовок при 14px uppercase ≈ 95–100 символов
    const TITLE_MAX_CHARS = 96;
    const fitOp2Title = (projects, all) => {
        if (all || !projects.length) {
            return { title: 'Сводный отчет по всем объектам', tip: 'Сводный отчет по всем объектам' };
        }
        if (projects.length === 1) {
            const name = String(projects[0]);
            const tip = `Сводный отчет по объекту «${name}»`;
            if (tip.length <= TITLE_MAX_CHARS) return { title: tip, tip };
            const budget = Math.max(8, TITLE_MAX_CHARS - 'Сводный отчет по объекту «…»'.length);
            return { title: `Сводный отчет по объекту «${name.slice(0, budget)}…»`, tip };
        }
        const n = projects.length;
        const prefix = `Сводный отчет по ${n} объектам: `;
        const tip = prefix + projects.join(', ');
        const fitted = [];
        for (let i = 0; i < projects.length; i++) {
            const trial = prefix + [...fitted, projects[i]].join(', ');
            const needEllipsis = i < projects.length - 1;
            if ((needEllipsis ? trial + '…' : trial).length <= TITLE_MAX_CHARS) {
                fitted.push(projects[i]);
            } else {
                break;
            }
        }
        if (!fitted.length) {
            const budget = Math.max(4, TITLE_MAX_CHARS - prefix.length - 1);
            return { title: prefix + String(projects[0]).slice(0, budget) + '…', tip };
        }
        const title = fitted.length < n
            ? prefix + fitted.join(', ') + '…'
            : prefix + fitted.join(', ');
        return { title, tip };
    };

    let op2Head;
    if (opts.forceProjectName) {
        op2Head = fitOp2Title([opts.forceProjectName], false);
    } else {
        const filterProjs = [...new Set((_analyticsFilters().project || []).filter(Boolean))];
        const allKnownProjects = [...new Set(
            (_getAllInspections() || []).map(i => i.project_display_name || i.projectName || i.project_name).filter(Boolean)
        )];
        const isAllProjects = filterProjs.length === 0
            || (allKnownProjects.length > 0 && filterProjs.length >= allKnownProjects.length
                && allKnownProjects.every(p => filterProjs.includes(p)));
        let op2Projects = [];
        if (!isAllProjects) {
            op2Projects = filterProjs.length
                ? filterProjs
                : [...new Set(data.map(i => i.project_display_name || i.projectName || i.project_name).filter(Boolean))]
                    .sort((a, b) => String(a).localeCompare(String(b), 'ru'));
        }
        op2Head = fitOp2Title(op2Projects, isAllProjects);
    }
    const op2Title = escTitle(op2Head.title);
    const op2TitleTip = escTitle(op2Head.tip);
    const headerOpts = {
        qrPx: 68, logoH: 56, logoMaxW: 200, marginBottom: 2, paddingBottom: 2, titlePx: 14, dense: true,
        titleTooltip: op2TitleTip
    };
    return { shellTitle: op2Title, content, headerOpts };
}

/**
 * One-Pager 2.0 — один лист A3 landscape для руководства.
 * Старый onepager не трогаем: отдельный actionType `onepager_v2`.
 */
async function exportPdfOnePagerV2(data, mode = 'script') {
    const built = await buildOnePagerV2Html(data);
    if (!built) return showToast('Нет данных для выгрузки');
    printPdfShell(built.shellTitle, built.content, 'A3', 'landscape', mode, {
        headerOpts: built.headerOpts
    });
}

/**
 * Сводный отчет по компании 2.0: титул (KPI + оглавление) + One-Pager 2.0 по каждому объекту.
 * Старый `global_onepager` не трогаем.
 */
async function exportPdfGlobalOnePagerV2(data, mode = 'script') {
    if (!data || data.length === 0) return showToast('Нет данных для выгрузки');

    const projectKey = (i) => i.project_display_name || i.projectName || i.project_name || 'Без объекта';
    const projectsMap = {};
    data.forEach(item => {
        const key = projectKey(item);
        (projectsMap[key] = projectsMap[key] || []).push(item);
    });

    const resolveDocScore = (i) => {
        if (!i || !i.metrics) return null;
        if (i.metrics.documentary !== undefined && i.metrics.documentary !== null) return Number(i.metrics.documentary);
        if (typeof window.getDocumentaryScore !== 'function' || !i.state || !i.templateKey) return null;
        const tType = i.templateKey.split('_')[0];
        const tKey = i.templateKey.replace(tType + '_', '');
        const cl = tType === 'sys' && _templates().getSystemTemplates()[tKey]
            ? _templates().getSystemTemplates()[tKey].groups
            : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
        return window.getDocumentaryScore(i.state, getFlatList(cl));
    };

    const contractorBucketMetrics = (items) => {
        const groupedC = {};
        items.forEach(item => {
            const cKey = (typeof window.trendContractorKey === 'function')
                ? window.trendContractorKey(item)
                : ((item.contractorName || 'Неизвестно') + ' [' + projectKey(item) + ']');
            (groupedC[cKey] = groupedC[cKey] || []).push(item);
        });
        let sumRel = 0, relN = 0, redContrCount = 0;
        for (const cName in groupedC) {
            const m = getContractorMetrics(groupedC[cName], _templates().getUserTemplates());
            if (!m) continue;
            if (m.count >= 7) {
                sumRel += m.finalC;
                relN++;
                if (m.finalC < 70) redContrCount++;
            }
        }
        return {
            contrCount: Object.keys(groupedC).length,
            avgReliability: relN > 0 ? Math.round(sumRel / relN) : null,
            relN,
            redContrCount,
            redContrPerc: relN > 0 ? Math.round((redContrCount / relN) * 100) : null
        };
    };

    // ── KPI компании (те же 6 плиток, что OP2) ───────────────────────────
    let sumUrk = 0, sumDoc = 0, cntDoc = 0;
    data.forEach(i => {
        sumUrk += Number(i.metrics?.final) || 0;
        const ds = resolveDocScore(i);
        if (ds !== null && ds !== undefined && !Number.isNaN(ds)) { sumDoc += ds; cntDoc++; }
    });
    const currAvgUrk = Math.round(sumUrk / data.length);
    const currAvgDoc = cntDoc > 0 ? Math.round(sumDoc / cntDoc) : null;
    const mData = (typeof getObjectIntegralMetrics === 'function'
        ? getObjectIntegralMetrics(data, _templates().getUserTemplates())
        : null) || { IKO: '0.00' };
    const companyContr = contractorBucketMetrics(data);

    const _allInspections = _getAllInspections();
    const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
    const now = new Date();
    let prevData = [];
    let trendLabel = 'к 1-й пол.';
    if (selPeriod === 'WEEK') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 7);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 7);
        prevData = _allInspections.filter(i => { const d = new Date(i.date); return d >= startPrev && d < startCurr; });
        trendLabel = 'к прош. нед.';
    } else if (selPeriod === 'MONTH') {
        const startCurr = new Date(now); startCurr.setDate(now.getDate() - 30);
        const startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 30);
        prevData = _allInspections.filter(i => { const d = new Date(i.date); return d >= startPrev && d < startCurr; });
        trendLabel = 'к прош. мес.';
    } else {
        const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        prevData = sorted.slice(0, Math.floor(sorted.length / 2));
    }

    let prevAvgUrk = 0, prevAvgDoc = null, prevIko = '0.00', prevChecks = prevData.length;
    let prevContrs = 0, prevRel = null, prevRedContrCount = null;
    if (prevData.length > 0) {
        const pSum = prevData.reduce((s, i) => s + (Number(i.metrics?.final) || 0), 0);
        prevAvgUrk = Math.round(pSum / prevData.length);
        let pSumDoc = 0, pCntDoc = 0;
        prevData.forEach(i => {
            const ds = resolveDocScore(i);
            if (ds !== null && ds !== undefined && !Number.isNaN(ds)) { pSumDoc += ds; pCntDoc++; }
        });
        if (pCntDoc > 0) prevAvgDoc = Math.round(pSumDoc / pCntDoc);
        prevContrs = contractorBucketMetrics(prevData).contrCount;
        const pInt = typeof getObjectIntegralMetrics === 'function'
            ? getObjectIntegralMetrics(prevData, _templates().getUserTemplates()) : null;
        if (pInt) prevIko = pInt.IKO;
        const pC = contractorBucketMetrics(prevData);
        prevRel = pC.avgReliability;
        prevRedContrCount = pC.relN > 0 ? pC.redContrCount : null;
    }

    const renderTrend = (curr, prev, label, inverse = false) => {
        if (prev === undefined || prev === null || prev === '' || Number.isNaN(parseFloat(prev))) {
            return `<div style="text-align:center;line-height:1.1;overflow:hidden;"><span style="color:#94a3b8;font-size:8px;font-weight:700;">нет базы</span></div>`;
        }
        const diff = parseFloat(curr) - parseFloat(prev);
        if (Math.abs(diff) < 0.01) {
            return `<div style="text-align:center;line-height:1.1;overflow:hidden;white-space:nowrap;"><span style="color:#94a3b8;font-size:11px;font-weight:900;">▬0</span> <span style="font-size:8px;color:#94a3b8;text-transform:uppercase;">${label}</span></div>`;
        }
        const good = inverse ? diff < 0 : diff > 0;
        return `<div style="text-align:center;line-height:1.1;overflow:hidden;white-space:nowrap;"><span style="color:${good ? '#16a34a' : '#dc2626'};font-size:11px;font-weight:900;">${diff > 0 ? '▲' : '▼'}${Math.abs(diff).toFixed(Number.isInteger(diff) ? 0 : 2)}</span> <span style="font-size:8px;color:#94a3b8;text-transform:uppercase;">${label}</span></div>`;
    };
    const urkTone = (v) => (v < 70 ? '#ef4444' : (v < 85 ? '#f59e0b' : '#22c55e'));
    const escPdf = (s) => String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const ikoColor = parseFloat(mData.IKO) >= 0.6 ? '#dc2626' : (parseFloat(mData.IKO) >= 0.3 ? '#d97706' : '#16a34a');
    const urkPhysColor = urkTone(currAvgUrk);
    const relColor = companyContr.avgReliability != null ? urkTone(companyContr.avgReliability) : '#94a3b8';
    const redContrColor = companyContr.redContrCount >= 3 || (companyContr.redContrPerc != null && companyContr.redContrPerc >= 20)
        ? '#dc2626'
        : (companyContr.redContrCount > 0 ? '#d97706' : '#16a34a');
    const redContrKpiValue = companyContr.relN > 0
        ? `<span style="color:${redContrColor}">${companyContr.redContrCount}</span><span style="color:#94a3b8;font-size:11px;"> · </span><span style="color:${redContrColor};font-size:13px;">${companyContr.redContrPerc}%</span>`
        : '<span style="color:#94a3b8">СБОР</span>';
    const urkKpiValue = currAvgDoc != null
        ? `<span style="color:${urkPhysColor};">${currAvgUrk}%</span><span style="color:#94a3b8;font-size:12px;"> · </span><span style="color:#4f46e5;">${currAvgDoc}%</span>`
        : `<span style="color:${urkPhysColor};">${currAvgUrk}%</span>`;
    const urkTrendHtml = (() => {
        const tPhys = renderTrend(currAvgUrk, prevAvgUrk, 'физика');
        if (currAvgDoc == null) return renderTrend(currAvgUrk, prevAvgUrk, trendLabel);
        const tDoc = renderTrend(currAvgDoc, prevAvgDoc, 'докум.');
        return `<table style="width:100%;border-collapse:collapse;"><tr><td style="width:50%;">${tPhys}</td><td style="width:50%;">${tDoc}</td></tr></table>`;
    })();

    // ── Объекты + динамика (как старая сводка) + метрики OP2 ─────────────
    const prevProjectsMap = {};
    prevData.forEach(item => {
        const key = projectKey(item);
        (prevProjectsMap[key] = prevProjectsMap[key] || []).push(item);
    });

    const TITLE_MIN_CHECKS = 10;
    const projectsArray = Object.keys(projectsMap).map(name => {
        const pData = projectsMap[name];
        const pSum = pData.reduce((s, i) => s + (Number(i.metrics?.final) || 0), 0);
        const avgUrk = pData.length ? Math.round(pSum / pData.length) : 0;
        let sumDocP = 0, cntDocP = 0;
        pData.forEach(i => {
            const ds = resolveDocScore(i);
            if (ds !== null && ds !== undefined && !Number.isNaN(ds)) { sumDocP += ds; cntDocP++; }
        });
        const avgDoc = cntDocP > 0 ? Math.round(sumDocP / cntDocP) : null;
        const pInt = typeof getObjectIntegralMetrics === 'function'
            ? getObjectIntegralMetrics(pData, _templates().getUserTemplates()) : null;
        const IKO = pInt ? pInt.IKO : '0.00';
        const c = contractorBucketMetrics(pData);
        const prevPData = prevProjectsMap[name] || [];
        let prevAvgUrk = null;
        let prevAvgDoc = null;
        let prevIKO = null;
        let prevRel = null;
        let prevRedContrCount = null;
        let prevContrCount = null;
        if (prevPData.length > 0) {
            const ppSum = prevPData.reduce((s, i) => s + (Number(i.metrics?.final) || 0), 0);
            prevAvgUrk = Math.round(ppSum / prevPData.length);
            let ppDoc = 0, ppCnt = 0;
            prevPData.forEach(i => {
                const ds = resolveDocScore(i);
                if (ds !== null && ds !== undefined && !Number.isNaN(ds)) { ppDoc += ds; ppCnt++; }
            });
            if (ppCnt > 0) prevAvgDoc = Math.round(ppDoc / ppCnt);
            const ppInt = typeof getObjectIntegralMetrics === 'function'
                ? getObjectIntegralMetrics(prevPData, _templates().getUserTemplates()) : null;
            if (ppInt) prevIKO = ppInt.IKO;
            const pc = contractorBucketMetrics(prevPData);
            prevRel = pc.avgReliability;
            prevRedContrCount = pc.relN > 0 ? pc.redContrCount : null;
            prevContrCount = pc.contrCount;
        }
        const urkGrowth = (prevAvgUrk != null) ? (avgUrk - prevAvgUrk) : 0;
        const ikoGrowth = (prevIKO != null && prevIKO !== '')
            ? (parseFloat(IKO) - parseFloat(prevIKO))
            : null;
        const b3Found = pData.reduce((s, i) => s + (Number(i.metrics?.n_B3_fail) || 0), 0);
        // Подрядчики с низким УрК на объекте (среднее по проверкам < 70, N≥2)
        const byContr = {};
        pData.forEach(i => {
            const cn = i.contractorName || i.contractor || 'Неизвестно';
            (byContr[cn] = byContr[cn] || []).push(i);
        });
        let lowUrkContrCount = 0;
        Object.keys(byContr).forEach(cn => {
            const arr = byContr[cn];
            if (arr.length < 2) return;
            const avg = arr.reduce((s, i) => s + (Number(i.metrics?.final) || 0), 0) / arr.length;
            if (avg < 70) lowUrkContrCount++;
        });
        return {
            name,
            data: pData,
            n: pData.length,
            avgUrk,
            avgDoc,
            prevAvgUrk,
            prevAvgDoc,
            avgIurk: c.avgReliability,
            prevIurk: prevRel,
            IKO,
            prevIKO,
            urkGrowth,
            ikoGrowth,
            b3Found,
            contrCount: c.contrCount,
            prevContrCount,
            redContrCount: c.redContrCount,
            redContrPerc: c.redContrPerc,
            relN: c.relN,
            prevRedContrCount,
            lowUrkContrCount
        };
    }).filter(p => p.n > 0)
        .sort((a, b) => parseFloat(b.IKO) - parseFloat(a.IKO) || a.name.localeCompare(b.name, 'ru'));

    if (!projectsArray.length) return showToast('Нет объектов с проверками за период');

    // Титул: только объекты с ≥10 проверками (мало данных не показываем)
    const projectsForTitle = projectsArray.filter(p => p.n >= TITLE_MIN_CHECKS);

    // Титул A3: KPI + графики УрК/надёжность + сводка объектов + сводка ПК СК по компании (как OP2)
    const kpiCard = (label, valueHtml, trendHtml, extraStyle = '') => `
        <td style="width:16.66%; padding:0 3px; vertical-align:top;">
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:4px 5px 3px;height:60px;box-sizing:border-box;text-align:center;overflow:hidden;${extraStyle}">
                <div style="font-size:8px;color:#64748b;text-transform:uppercase;font-weight:900;letter-spacing:0.02em;line-height:1.15;max-height:1.4em;overflow:hidden;">${label}</div>
                <div style="font-size:20px;font-weight:900;color:#0f172a;line-height:1.05;margin-top:1px;">${valueHtml}</div>
                <div style="margin-top:1px;overflow:hidden;">${trendHtml}</div>
            </div>
        </td>`;

    const deltaInline = (curr, prev, inverse = false) => {
        if (prev === undefined || prev === null || prev === '' || Number.isNaN(parseFloat(prev))) {
            return '';
        }
        const diff = parseFloat(curr) - parseFloat(prev);
        if (Math.abs(diff) < 0.01) return '<span style="color:#94a3b8;">▬ 0</span>';
        const good = inverse ? diff < 0 : diff > 0;
        const digits = Math.abs(diff - Math.round(diff)) < 0.01 ? 0 : 2;
        return `<span style="color:${good ? '#16a34a' : '#dc2626'};">${diff > 0 ? '▲' : '▼'}${Math.abs(diff).toFixed(digits)}</span>`;
    };
    // Значение и Δ столбиком — иначе в узкой колонке всё слипается в одну кучу
    const metricCell = (mainHtml, deltaHtml) => `
        <div style="text-align:right;line-height:1.05;padding:0 2px;">
            <div style="font-size:16px;font-weight:900;white-space:nowrap;">${mainHtml}</div>
            <div style="font-size:11px;font-weight:700;margin-top:2px;min-height:13px;white-space:nowrap;">${deltaHtml || '&nbsp;'}</div>
        </div>`;

    // ── ПК СК по компании (те же метрики, что в One-Pager 2.0) ───────────
    const DAY_MS = 86400000;
    const isSkOpen = (r) => !(r.is_verified_closed === true
        || r.status_normalized === 'verified'
        || String(r.status || '').toLowerCase().trim() === 'проверено');
    const riskByPerc = (v) => (v >= 20 ? '#dc2626' : (v > 0 ? '#d97706' : '#16a34a'));
    const riskByDays = (d) => {
        const n = Number(d) || 0;
        if (n <= 3) return '#16a34a';
        if (n <= 14) return '#d97706';
        return '#dc2626';
    };
    const goodByPerc = (v) => (v >= 80 ? '#16a34a' : (v >= 50 ? '#d97706' : '#dc2626'));

    let skTitleRecords = (_getSkRecords() || []).filter(r => !r._deleted && !r.is_deleted);
    let periodDays = 30;
    let lastSkLoad = null;
    if (selPeriod === 'DAY') {
        periodDays = 1;
        skTitleRecords = skTitleRecords.filter(r => r.date_issued && new Date(r.date_issued).toDateString() === now.toDateString());
    } else if (selPeriod === 'WEEK') {
        periodDays = 7;
        const w = new Date(now); w.setDate(now.getDate() - 7);
        skTitleRecords = skTitleRecords.filter(r => r.date_issued && new Date(r.date_issued) >= w);
    } else if (selPeriod === 'MONTH') {
        periodDays = 30;
        const m = new Date(now); m.setDate(now.getDate() - 30);
        skTitleRecords = skTitleRecords.filter(r => r.date_issued && new Date(r.date_issued) >= m);
    } else if (selPeriod === 'CUSTOM') {
        const dFrom = document.getElementById('filter-date-from')?.value;
        const dTo = document.getElementById('filter-date-to')?.value;
        if (dFrom) skTitleRecords = skTitleRecords.filter(r => r.date_issued && new Date(r.date_issued) >= new Date(dFrom));
        if (dTo) {
            const tDate = new Date(dTo); tDate.setHours(23, 59, 59, 999);
            skTitleRecords = skTitleRecords.filter(r => r.date_issued && new Date(r.date_issued) <= tDate);
        }
        const fromD = dFrom ? new Date(dFrom) : null;
        const toD = dTo ? new Date(dTo) : null;
        if (fromD && toD) periodDays = Math.max(1, Math.ceil((toD - fromD) / DAY_MS));
    } else {
        const dates = skTitleRecords.map(r => r.date_issued && new Date(r.date_issued).getTime()).filter(Boolean);
        if (dates.length) periodDays = Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / DAY_MS) || 1);
    }

    let skOpen = 0, skOverdue = 0, skOpenOverdue = 0, skClosedLate = 0;
    let skOnTimeClosed = 0, skWithDeadlineClosed = 0, skNoDeadline = 0;
    const overdueDepths = [];
    const closingTimes = [];
    const overdueContrSet = new Set();
    skTitleRecords.forEach(r => {
        const loadTs = r.last_imported_at || r.first_imported_at || r.imported_at || r.synced_at || r.updated_at;
        if (loadTs) {
            const d = new Date(loadTs);
            if (!Number.isNaN(d.getTime()) && (!lastSkLoad || d > lastSkLoad)) lastSkLoad = d;
        }
        const open = isSkOpen(r);
        if (open) skOpen++;
        const issued = r.date_issued ? new Date(r.date_issued) : null;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        const resolved = r.date_resolved ? new Date(r.date_resolved) : null;
        if (issued && resolved && !Number.isNaN(issued.getTime()) && !Number.isNaN(resolved.getTime()) && resolved >= issued) {
            closingTimes.push(Math.max(0, Math.ceil((resolved - issued) / DAY_MS)));
        }
        if (!deadline || Number.isNaN(deadline.getTime())) {
            skNoDeadline++;
            return;
        }
        const contr = r.contractor_name || r.contractor || 'Не указан';
        if (open && now > deadline) {
            skOverdue++;
            skOpenOverdue++;
            overdueContrSet.add(contr);
            overdueDepths.push(Math.max(0, Math.ceil((now - deadline) / DAY_MS)));
        } else if (!open && resolved && resolved > deadline) {
            skOverdue++;
            skClosedLate++;
            overdueContrSet.add(contr);
            overdueDepths.push(Math.max(0, Math.ceil((resolved - deadline) / DAY_MS)));
        }
        if (!open && resolved && !Number.isNaN(resolved.getTime())) {
            skWithDeadlineClosed++;
            if (resolved <= deadline) skOnTimeClosed++;
        }
    });
    const skTotal = skTitleRecords.length;
    const skClosed = skTotal - skOpen;
    const skResolved = skTitleRecords.filter(r => !!r.date_resolved).length;
    const avgOverdueDepth = overdueDepths.length
        ? Math.round(overdueDepths.reduce((a, b) => a + b, 0) / overdueDepths.length) : 0;
    const maxOverdueDepth = overdueDepths.length ? Math.max(...overdueDepths) : 0;
    const avgResolveDays = closingTimes.length
        ? Math.round(closingTimes.reduce((a, b) => a + b, 0) / closingTimes.length) : null;
    const skOverduePerc = skTotal ? Math.round((skOverdue / skTotal) * 100) : 0;
    const skClosePerc = skTotal ? Math.round((skClosed / skTotal) * 100) : 0;
    const skOnTimePerc = skWithDeadlineClosed
        ? Math.round((skOnTimeClosed / skWithDeadlineClosed) * 100) : null;
    const skOverdueContrCount = overdueContrSet.size;
    const weeksInPeriod = Math.max(periodDays / 7, 0.14);
    const skIssuePace = Math.round((skTotal / weeksInPeriod) * 10) / 10;
    const skClosePace = Math.round((skResolved / weeksInPeriod) * 10) / 10;
    const skNetPace = Math.round((skIssuePace - skClosePace) * 10) / 10;
    const tempoBalance = skNetPace > 0.5 ? 'долг растёт' : (skNetPace < -0.5 ? 'долг снижается' : 'в балансе');
    const tempoBalanceColor = skNetPace > 0.5 ? '#dc2626' : (skNetPace < -0.5 ? '#16a34a' : '#64748b');
    const lastSkLoadLabel = lastSkLoad
        ? lastSkLoad.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'не зафиксирована';
    const skPeriodHint = selPeriod === 'ALL' ? 'весь период'
        : (selPeriod === 'DAY' ? 'сегодня'
            : (selPeriod === 'WEEK' ? '7 дней'
                : (selPeriod === 'MONTH' ? '30 дней' : 'свой период')));

    // Сводка: читаемые однострочные строки (~26px) — до 15 объектов на лист
    const tocRows = projectsForTitle.map((p, idx) => {
        const urkC = urkTone(p.avgUrk);
        const ikoC = parseFloat(p.IKO) >= 0.6 ? '#dc2626' : (parseFloat(p.IKO) >= 0.3 ? '#d97706' : '#16a34a');
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const band = idx % 2 === 0 ? '#fafafa' : '#f1f5f9';
        const urkCell = metricCell(`<span style="color:${urkC};">${p.avgUrk}%</span>`, deltaInline(p.avgUrk, p.prevAvgUrk));
        const docCell = metricCell(
            p.avgDoc != null ? `<span style="color:#4f46e5;">${p.avgDoc}%</span>` : '<span style="color:#cbd5e1;">—</span>',
            deltaInline(p.avgDoc, p.prevAvgDoc)
        );
        const iurkCell = p.avgIurk != null
            ? metricCell(`<span style="color:${urkTone(p.avgIurk)};">${p.avgIurk}%</span>`, deltaInline(p.avgIurk, p.prevIurk))
            : metricCell('<span style="color:#94a3b8;font-size:11px;">сбор</span>', '');
        const ikoCell = metricCell(`<span style="color:${ikoC};">${p.IKO}</span>`, deltaInline(p.IKO, p.prevIKO, true));
        const contrCell = metricCell(`<span style="color:#0f172a;">${p.contrCount}</span>`, deltaInline(p.contrCount, p.prevContrCount));
        const redCell = p.relN > 0
            ? metricCell(
                `<span style="color:${p.redContrCount > 0 ? '#dc2626' : '#16a34a'};">${p.redContrCount}</span><span style="color:#94a3b8;font-size:10px;font-weight:700;">/${p.relN}</span>`,
                deltaInline(p.redContrCount, p.prevRedContrCount, true)
            )
            : metricCell('<span style="color:#94a3b8;font-size:11px;">сбор</span>', '');
        return `
            <tr style="background:${bg};">
                <td style="padding:7px 8px 7px 10px;border-bottom:1px solid #e2e8f0;border-left:4px solid ${ikoC};vertical-align:middle;overflow:hidden;">
                    <div style="font-size:12px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15;">${escPdf(p.name)}</div>
                    <div style="font-size:8px;font-weight:700;color:#94a3b8;margin-top:2px;line-height:1.1;">${p.n} пров.</div>
                </td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle;background:${band};">${urkCell}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle;background:${band};">${docCell}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${iurkCell}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${ikoCell}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle;background:${band};">${contrCell}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle;background:${band};">${redCell}</td>
            </tr>`;
    }).join('');

    // ── Графики: средний УрК и средняя надёжность подрядчиков по объектам ──
    const shortLbl = (s, max = 16) => {
        const t = String(s || '—');
        return t.length <= max ? t : t.slice(0, max - 1) + '…';
    };
    const fmtDelta = (diff, inverse = false, digits = 0) => {
        if (diff == null || Number.isNaN(diff)) return { text: '', color: '#94a3b8' };
        if (Math.abs(diff) < 0.005) return { text: '▬0', color: '#94a3b8' };
        const good = inverse ? diff < 0 : diff > 0;
        return {
            text: (diff > 0 ? '▲' : '▼') + Math.abs(diff).toFixed(digits),
            color: good ? '#16a34a' : '#dc2626'
        };
    };
    const barValueDeltaPlugin = (getMeta) => ({
        id: 'titleBarValueDelta',
        afterDatasetsDraw(chart) {
            const meta = chart.getDatasetMeta(0);
            const { ctx } = chart;
            const horiz = chart.options.indexAxis === 'y';
            meta.data.forEach((el, i) => {
                const info = getMeta(i);
                if (!info) return;
                const { valueText, delta } = info;
                const x = el.x;
                const y = el.y;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (horiz) {
                    ctx.font = 'bold 10px Verdana, sans-serif';
                    ctx.fillStyle = '#0f172a';
                    ctx.textAlign = 'left';
                    ctx.fillText(valueText, x + 6, y);
                    if (delta && delta.text) {
                        ctx.font = 'bold 9px Verdana, sans-serif';
                        ctx.fillStyle = delta.color;
                        ctx.fillText(delta.text, x + 6 + ctx.measureText(valueText).width + 5, y);
                    }
                } else {
                    ctx.font = 'bold 10px Verdana, sans-serif';
                    ctx.fillStyle = '#0f172a';
                    ctx.fillText(valueText, x, y - 14);
                    if (delta && delta.text) {
                        ctx.font = 'bold 9px Verdana, sans-serif';
                        ctx.fillStyle = delta.color;
                        ctx.fillText(delta.text, x, y - 3);
                    }
                }
                ctx.restore();
            });
        }
    });

    const chartProjects = projectsForTitle.slice(0, 15);
    const barThick = chartProjects.length > 10 ? 20 : 28;
    const pctBarChart = (getVal, getColor, yTitle, getMeta) => chartProjects.length
        ? generatePdfChart({
            type: 'bar',
            data: {
                labels: chartProjects.map(p => shortLbl(p.name, 14)),
                datasets: [{
                    data: chartProjects.map(getVal),
                    backgroundColor: chartProjects.map(getColor),
                    borderRadius: 3,
                    maxBarThickness: barThick
                }]
            },
            options: {
                layout: { padding: { top: 22, bottom: 2 } },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { font: { size: 9 }, stepSize: 25 },
                        grid: { color: '#e2e8f0' },
                        title: { display: true, text: yTitle, font: { size: 9 }, color: '#64748b' }
                    },
                    x: { ticks: { font: { size: 9 }, maxRotation: 35, minRotation: 0 }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            },
            plugins: [barValueDeltaPlugin(getMeta)]
        }, 720, 280)
        : null;

    const imgUrkByProject = pctBarChart(
        p => p.avgUrk,
        p => urkTone(p.avgUrk),
        'УрК %',
        (i) => {
            const p = chartProjects[i];
            if (!p) return null;
            return {
                valueText: p.avgUrk + '%',
                delta: fmtDelta(p.prevAvgUrk != null ? p.urkGrowth : null, false, 0)
            };
        }
    );
    const imgRelByProject = pctBarChart(
        p => (p.avgIurk != null ? p.avgIurk : 0),
        p => (p.avgIurk != null ? urkTone(p.avgIurk) : '#cbd5e1'),
        'Надёжность %',
        (i) => {
            const p = chartProjects[i];
            if (!p) return null;
            if (p.avgIurk == null) return { valueText: '—', delta: { text: '', color: '#94a3b8' } };
            const relDiff = (p.prevIurk != null) ? (p.avgIurk - p.prevIurk) : null;
            return {
                valueText: p.avgIurk + '%',
                delta: fmtDelta(relDiff, false, 0)
            };
        }
    );

    const chartBox = (title, tip, img, h) => `
        <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;box-sizing:border-box;height:${h}px;overflow:hidden;">
            <div style="font-size:12px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.02em;line-height:1.15;">${title}</div>
            <div style="font-size:8px;color:#64748b;font-weight:600;margin:2px 0 6px;line-height:1.3;">${tip}</div>
            ${img
                ? `<img src="${img}" style="width:100%;height:${h - 44}px;object-fit:contain;display:block;">`
                : `<div style="height:${h - 44}px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;font-weight:700;">Нет объектов с ≥${TITLE_MIN_CHECKS} проверками</div>`}
        </div>`;

    // Плитки СК одной высоты: всегда 2 строки значения (вторая может быть пустой)
    const skVal = (mainHtml, subHtml = '') => `
        <div style="height:36px;overflow:hidden;text-align:right;">
            <div style="font-size:16px;font-weight:900;color:#0f172a;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mainHtml}</div>
            <div style="font-size:10px;font-weight:700;line-height:1.2;margin-top:2px;height:12px;overflow:hidden;white-space:nowrap;">${subHtml || '&nbsp;'}</div>
        </div>`;
    const skCoCell = (label, tip, valueHtml) => `
        <td style="width:25%;padding:2px;vertical-align:top;">
            <div title="${escPdf(tip)}" style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:5px 6px;box-sizing:border-box;height:64px;overflow:hidden;">
                <div style="font-size:8px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.03em;line-height:1.15;height:18px;overflow:hidden;">${label}</div>
                <div style="margin-top:4px;">${valueHtml}</div>
            </div>
        </td>`;

    // Руководитель: пульс → графики объектов → сводка объектов + сводка ПК СК по компании
    // max-height: один лист A3 (тело после шапки), иначе html2pdf рвёт на несколько страниц
    const titleBody = `
    <div class="no-break" style="font-family:'Bricolage Grotesque',Verdana,sans-serif;max-height:960px;overflow:hidden;overflow-x:hidden;width:100%;box-sizing:border-box;">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
            <tr>
                ${kpiCard('Средний УрК · физика / документация', urkKpiValue, urkTrendHtml)}
                ${kpiCard('Средняя надёжность', companyContr.avgReliability != null ? `<span style="color:${relColor}">${companyContr.avgReliability}%</span>` : '<span style="color:#94a3b8">СБОР</span>', renderTrend(companyContr.avgReliability, prevRel, trendLabel))}
                ${kpiCard('ИКО · индекс риска', `<span style="color:${ikoColor}">${mData.IKO}</span>`, renderTrend(mData.IKO, prevIko, trendLabel, true), parseFloat(mData.IKO) >= 0.6 ? 'background:#fef2f2;border-color:#fca5a5;' : '')}
                ${kpiCard('Число подрядчиков', `${companyContr.contrCount}`, renderTrend(companyContr.contrCount, prevContrs, trendLabel))}
                ${kpiCard('Число проверок', `${data.length}`, renderTrend(data.length, prevChecks, trendLabel))}
                ${kpiCard(
                    'Подрядчики с ИУрК&nbsp;&lt;&nbsp;70%',
                    redContrKpiValue,
                    companyContr.relN > 0
                        ? `<div style="line-height:1.1;">${renderTrend(companyContr.redContrCount, prevRedContrCount, trendLabel, true)}<div style="font-size:8px;color:#94a3b8;">${companyContr.redContrCount} из ${companyContr.relN} с надёжностью (N≥7)</div></div>`
                        : `<div style="font-size:8px;color:#94a3b8;line-height:1.15;">ещё нет подрядчиков с N≥7</div>`,
                    companyContr.redContrCount > 0 ? 'background:#fef2f2;border-color:#fecaca;' : ''
                )}
            </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:8px;">
            <tr>
                <td style="width:50%;padding-right:5px;vertical-align:top;">
                    ${chartBox(
                        'Средний уровень качества по объектам',
                        `≥${TITLE_MIN_CHECKS} проверок. На столбце — УрК и Δ (${escPdf(trendLabel)}). Зелёный ≥85% · красный &lt;70%.`,
                        imgUrkByProject,
                        230
                    )}
                </td>
                <td style="width:50%;padding-left:5px;vertical-align:top;">
                    ${chartBox(
                        'Средняя надёжность подрядчиков по объектам',
                        `≥${TITLE_MIN_CHECKS} проверок. Средний ИУрК подрядчиков объекта и Δ (${escPdf(trendLabel)}). «—» — ещё сбор (N&lt;7).`,
                        imgRelByProject,
                        230
                    )}
                </td>
            </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <tr>
                <td style="width:50%;padding-right:7px;vertical-align:top;">
                    <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;box-sizing:border-box;">
                        <div style="margin-bottom:6px;">
                            <div style="font-size:12px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.02em;">Сводка по объектам</div>
                            <div style="font-size:8px;color:#64748b;font-weight:600;margin-top:2px;line-height:1.35;">≥${TITLE_MIN_CHECKS} проверок · по ИКО сверху · число сверху, Δ снизу · полоска слева = риск.</div>
                        </div>
                        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                            <thead>
                                <tr style="background:#e2e8f0;">
                                    <th style="padding:7px 8px;text-align:left;font-size:8px;font-weight:900;color:#475569;text-transform:uppercase;">Объект</th>
                                    <th style="padding:7px 6px;text-align:right;font-size:8px;font-weight:900;color:#475569;text-transform:uppercase;width:72px;background:#eef2ff;">УрК</th>
                                    <th style="padding:7px 6px;text-align:right;font-size:8px;font-weight:900;color:#475569;text-transform:uppercase;width:64px;background:#eef2ff;">Док</th>
                                    <th style="padding:7px 6px;text-align:right;font-size:8px;font-weight:900;color:#475569;text-transform:uppercase;width:72px;">ИУрК</th>
                                    <th style="padding:7px 6px;text-align:right;font-size:8px;font-weight:900;color:#475569;text-transform:uppercase;width:68px;">ИКО</th>
                                    <th style="padding:7px 6px;text-align:right;font-size:8px;font-weight:900;color:#475569;text-transform:uppercase;width:58px;background:#faf5ff;">Подр.</th>
                                    <th style="padding:7px 6px;text-align:right;font-size:8px;font-weight:900;color:#475569;text-transform:uppercase;width:68px;background:#faf5ff;">&lt;70%</th>
                                </tr>
                            </thead>
                            <tbody>${tocRows || `<tr><td colspan="7" style="padding:14px;text-align:center;font-size:12px;font-weight:800;color:#64748b;">Нет объектов с ≥${TITLE_MIN_CHECKS} проверками за период</td></tr>`}</tbody>
                        </table>
                    </div>
                </td>
                <td style="width:50%;padding-left:7px;vertical-align:top;">
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 10px 8px;box-sizing:border-box;">
                        <div style="font-size:12px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.02em;margin-bottom:2px;">ПК СК · сводка по компании</div>
                        <div style="font-size:8px;color:#64748b;font-weight:600;margin-bottom:8px;line-height:1.35;">Период «${escPdf(skPeriodHint)}» · по дате выдачи · загрузка: ${escPdf(lastSkLoadLabel)}.${skNoDeadline ? ` Без срока: ${skNoDeadline}.` : ''}</div>
                        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:0;">
                            <tr>
                                ${skCoCell('Всего выдано', 'Замечания за период фильтра', skVal(String(skTotal)))}
                                ${skCoCell('Открыто / закрыто', 'В работе / закрыты (% закрытия)', skVal(
                                    `<span style="color:${riskByPerc(100 - skClosePerc)}">${skOpen}</span><span style="color:#94a3b8;font-weight:700;"> / </span>${skClosed}`,
                                    `<span style="color:#64748b;">${skClosePerc}% закр.</span>`
                                ))}
                                ${skCoCell('Устранено', 'Есть дата устранения у подрядчика', skVal(`<span style="color:#16a34a">${skResolved}</span>`))}
                                ${skCoCell('Ср. срок устран.', 'Дни от выдачи до устранения', skVal(
                                    avgResolveDays != null ? `<span style="color:${riskByDays(avgResolveDays)}">${avgResolveDays} дн.</span>` : '—'
                                ))}
                            </tr>
                            <tr>
                                ${skCoCell('Просрочено', 'Срок прошёл: открытые или закрытые поздно', skVal(
                                    `<span style="color:${riskByPerc(skOverduePerc)}">${skOverdue}</span>`,
                                    `<span style="color:${riskByPerc(skOverduePerc)};">${skOverduePerc}%</span>`
                                ))}
                                ${skCoCell('Открытых проср.', 'Горящий долг: не закрыты и уже просрочены', skVal(
                                    `<span style="color:${riskByPerc(skTotal ? Math.round((skOpenOverdue / skTotal) * 100) : 0)}">${skOpenOverdue}</span>`
                                ))}
                                ${skCoCell('Закрыто с опозд.', 'Закрыли позже deadline', skVal(String(skClosedLate)))}
                                ${skCoCell('Вовремя закрыто', 'Доля закрытий не позже срока', skVal(
                                    skOnTimePerc != null ? `<span style="color:${goodByPerc(skOnTimePerc)}">${skOnTimePerc}%</span>` : '—'
                                ))}
                            </tr>
                            <tr>
                                ${skCoCell('Глубина ср. / макс.', 'Среднее и худшее опоздание, дни', skVal(
                                    `<span style="color:${riskByDays(avgOverdueDepth)}">${avgOverdueDepth}</span><span style="color:#94a3b8;font-weight:700;"> / </span><span style="color:${riskByDays(maxOverdueDepth)}">${maxOverdueDepth}</span>`,
                                    '<span style="color:#64748b;">дн.</span>'
                                ))}
                                ${skCoCell('Подр. с просрочкой', 'Подрядчики хотя бы с одной просрочкой', skVal(
                                    `<span style="color:${riskByPerc(skOverdueContrCount * 10)}">${skOverdueContrCount}</span>`
                                ))}
                                ${skCoCell('Темп выд. / закр.', 'В среднем за неделю', skVal(
                                    `${skIssuePace}<span style="color:#94a3b8;font-weight:700;"> / </span>${skClosePace}`,
                                    '<span style="color:#94a3b8;">в неделю</span>'
                                ))}
                                ${skCoCell('Баланс темпа', 'Успевает ли закрытие за выдачей', skVal(
                                    `<span style="color:${tempoBalanceColor};font-size:14px;">${tempoBalance}</span>`,
                                    `<span style="color:#94a3b8;">Δ ${skNetPace > 0 ? '+' : ''}${skNetPace}</span>`
                                ))}
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>
        </table>
    </div>`;

    const denseHeaderOpts = {
        qrPx: 60, logoH: 50, logoMaxW: 180, marginBottom: 2, paddingBottom: 2, titlePx: 14, dense: true
    };
    const reportAuthor = String(
        _getSetting('engineerName')
        || document.getElementById('inp-inspector')?.value
        || 'Инженер'
    ).trim() || 'Инженер';
    const reportPeriod = resolveExportPeriodLabel(null);

    // Один токен на весь PDF (QR на титуле = public_token в архиве).
    // На листах объектов QR не ставим: +60–70px к шапке раздувает A3 и рвёт каждый лист на 2.
    const publicToken = generatePublicReportToken();
    let qrDataUrl = null;
    try {
        if (typeof QRCode !== 'undefined') {
            qrDataUrl = await generateQrCodeDataUrl(`https://app.rbi-q.ru/report.html?token=${publicToken}`);
        }
    } catch (e) { console.warn('QR не сгенерирован (company v2)', e); }

    const titleHeader = await getBrandedHeader(
        'Сводный отчет по компании',
        mode,
        qrDataUrl,
        reportAuthor,
        reportPeriod,
        { ...denseHeaderOpts, titleTooltip: 'Сводный отчет по компании' }
    );

    let content = titleHeader + titleBody;
    for (const proj of projectsArray) {
        const built = await buildOnePagerV2Html(proj.data, { forceProjectName: proj.name, mode });
        if (!built) continue;
        const pageHeader = await getBrandedHeader(
            built.shellTitle,
            mode,
            null,
            reportAuthor,
            reportPeriod,
            built.headerOpts
        );
        content += '<div class="pdf-page-break page-break-before"></div>' + pageHeader + built.content;
    }

    printPdfShell('Сводный отчет по компании', content, 'A3', 'landscape', mode, {
        skipShellHeader: true,
        headerOpts: denseHeaderOpts,
        publicToken
    });
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
        const pPrevContrsCount = new Set((prevProjectsMap[proj.name] || []).map(i => i.contractorName).filter(Boolean)).size;

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
        // Метрики — ПО ОБЪЕКТУ (раньше ошибочно подставлялись global*).
        // =========================================================
        const blocksMap = {
            'header_metrics': `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
                <tr>
                    <td style="padding: 0 4px 8px 0; width:50%;">
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Ср. УрК объекта</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${currAvgUrk}%</td><td>${renderTrend(currAvgUrk, prevAvgUrk, trendLabel)}</td></tr></table>
                        </div>
                    </td>
                    <td style="padding: 0 0 8px 4px; width:50%;">
                        <div style="background: ${parseFloat(mData.IKO) >= 0.6 ? '#fef2f2' : '#f8fafc'}; padding: 10px; border-radius: 8px; border: 1px solid ${parseFloat(mData.IKO) >= 0.6 ? '#fca5a5' : '#cbd5e1'}; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Индекс Риска (ИКО)</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: ${pdfIkoColor}; line-height: 1;">${mData.IKO}</td><td>${renderTrend(mData.IKO, prevIko, trendLabel, true)}</td></tr></table>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 0 4px 8px 0;">
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Объем проверок</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${pChecksCount}</td><td>${renderTrend(pChecksCount, prevChecks, trendLabel)}</td></tr></table>
                        </div>
                    </td>
                    <td style="padding: 0 0 8px 4px;">
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; height: ${mode === 'browser' ? '23mm' : '85px'}; box-sizing: border-box;">
                            <div style="font-size: ${fsSmall}; color: #64748b; text-transform: uppercase; font-weight: 900;">Подрядчиков</div>
                            <table style="width:100%; margin-top:5px; border-collapse: collapse;"><tr><td style="font-size: ${fsNum}; font-weight: 900; color: #0f172a; line-height: 1;">${pContractorsCount}</td><td>${renderTrend(pContractorsCount, pPrevContrsCount, trendLabel)}</td></tr></table>
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
// =============================================================================
// Отчёт «Повторяющиеся дефекты» (брак / устранение) — сборщик, превью, PDF
// =============================================================================

const DEFECT_REMEDIATION_THRESHOLD = 3;

function _defectRemediationFlatList(templateKey) {
    if (!templateKey) return [];
    const groups = _templates().getUserTemplates()?.[String(templateKey).replace('user_', '')]?.groups
        || _templates().getSystemTemplates()?.[String(templateKey).replace('sys_', '')]?.groups
        || [];
    return typeof getFlatList === 'function' ? getFlatList(groups) : [];
}

function _defectRemediationPhotoSrc(src) {
    if (!src) return '';
    try {
        if (typeof window.getPhotoSrc === 'function') return window.getPhotoSrc(src) || src;
    } catch (_) { /* ignore */ }
    return src;
}

/** Убрать HTML из текста пункта чек-листа / комментария (иначе в поля лезут span и т.п.). */
function _defectRemediationPlainText(str) {
    return String(str || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function _defectRemediationProjectKey(item) {
    if (!item) return 'Без объекта';
    const name = item.project || item.project_display_name || item.projectName || item.project_name || '';
    const s = String(name).trim();
    return s || 'Без объекта';
}

/**
 * Короткие метрики объекта: период с 1-й проверки → сегодня,
 * число проверок, fail B2/B3, карточек отчёта, подрядчиков с повторами.
 */
function _defectRemediationProjectMetrics(projectName, projectCards) {
    const key = String(projectName || 'Без объекта');
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const all = _getAllInspections() || [];
    const inspections = all.filter((i) => {
        if (_defectRemediationProjectKey(i) !== key) return false;
        const d = i.date ? new Date(i.date) : null;
        if (!d || Number.isNaN(d.getTime())) return true;
        return d <= today;
    });

    let firstDate = null;
    let failB2 = 0;
    let failB3 = 0;
    let failEsc = 0;
    const contractors = new Set();

    inspections.forEach((check) => {
        const d = check.date ? new Date(check.date) : null;
        if (d && !Number.isNaN(d.getTime())) {
            if (!firstDate || d < firstDate) firstDate = d;
        }
        const cName = String(check.contractorName || check.contractor || '').trim();
        if (cName) contractors.add(cName);
        if (!check.state || !check.templateKey) return;
        const flat = _defectRemediationFlatList(check.templateKey);
        Object.keys(check.state).forEach((id) => {
            const st = check.state[id];
            if (st !== 'fail' && st !== 'fail_escalated') return;
            if (st === 'fail_escalated') { failEsc += 1; return; }
            const item = flat.find((x) => String(x.id) === String(id));
            const w = item ? Number(item.w) : 0;
            if (w === 3) failB3 += 1;
            else if (w === 2) failB2 += 1;
        });
    });

    const cards = Array.isArray(projectCards) ? projectCards : [];
    const cardContr = new Set(cards.map((c) => c.contractor).filter(Boolean));
    const repeatsSum = cards.reduce((s, c) => s + (Number(c.count) || 0), 0);
    const dateTo = new Date();
    const fmt = (d) => (d ? d.toLocaleDateString('ru-RU') : '—');

    return {
        projectName: key,
        periodFrom: fmt(firstDate),
        periodTo: fmt(dateTo),
        periodLabel: firstDate
            ? `${fmt(firstDate)} — ${fmt(dateTo)}`
            : `по ${fmt(dateTo)}`,
        checks: inspections.length,
        failB2,
        failB3,
        failEsc,
        failTotal: failB2 + failB3 + failEsc,
        contractors: contractors.size,
        reportCards: cards.length,
        reportRepeats: repeatsSum,
        reportContractors: cardContr.size,
    };
}

function _defectRemediationTwiCards() {
    try {
        if (ReportsActions._ctx && ReportsActions._ctx.knowledge) {
            return ReportsActions._ctx.knowledge.getTwiCardsSync() || [];
        }
        if (window.RBI && window.RBI.services && window.RBI.services.knowledge) {
            return window.RBI.services.knowledge.getTwiCardsSync() || [];
        }
    } catch (_) { /* ignore */ }
    return Array.isArray(window.rbi_twiCards) ? window.rbi_twiCards : [];
}

function _defectRemediationFindTwi(templateKey, itemId) {
    const cards = _defectRemediationTwiCards();
    const exact = cards.find((c) =>
        c && c.type === 'INSPECTOR'
        && String(c.checklistKey) === String(templateKey)
        && String(c.itemId) === String(itemId)
        && c.photoGood
    );
    if (exact) return exact;
    return cards.find((c) =>
        c && c.type === 'INSPECTOR'
        && String(c.checklistKey) === String(templateKey)
        && (String(c.itemId) === String(itemId) || c.itemId === 'ALL')
        && c.photoGood
    ) || null;
}

/**
 * Агрегация fail ≥3 по подрядчику+templateKey+itemId; пара фото fail / later-ok|TWI.
 * @returns {Array<object>}
 */
function collectRecurringDefectCards(inspections, opts = {}) {
    const threshold = Number(opts.threshold) > 0 ? Number(opts.threshold) : DEFECT_REMEDIATION_THRESHOLD;
    const list = Array.isArray(inspections) ? inspections : [];
    const groups = new Map();

    list.forEach((check) => {
        if (!check || !check.state || !check.templateKey) return;
        const contractor = String(check.contractorName || check.contractor || 'Подрядчик').trim() || 'Подрядчик';
        const templateKey = String(check.templateKey);
        const workType = String(check.templateTitle || check.workType || 'Вид работ');
        const project = _defectRemediationProjectKey(check);
        const checkDate = check.date ? new Date(check.date) : null;
        const flat = _defectRemediationFlatList(templateKey);

        Object.keys(check.state).forEach((id) => {
            const st = check.state[id];
            const item = flat.find((x) => String(x.id) === String(id));
            const isFail = st === 'fail' || st === 'fail_escalated';
            const isOk = st === 'ok';
            if (!isFail && !isOk) return;
            if (isFail && item && !(item.w === 2 || item.w === 3 || st === 'fail_escalated')) return;

            // Группа включает объект — иначе дефекты с разных объектов схлопнутся
            const key = `${project}|${contractor}|${templateKey}|${id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    contractor,
                    templateKey,
                    itemId: id,
                    defectName: item ? _defectRemediationPlainText(item.n || 'Дефект') : 'Дефект',
                    itemText: item ? _defectRemediationPlainText(item.t || item.req || item.norm || '') : '',
                    workType,
                    project,
                    failEvents: [],
                    okEvents: [],
                });
            }
            const g = groups.get(key);
            if (item && item.n) g.defectName = _defectRemediationPlainText(item.n);
            if (item && (item.t || item.req || item.norm)) {
                g.itemText = _defectRemediationPlainText(item.t || item.req || item.norm || '');
            }
            if (workType) g.workType = workType;
            const photos = getItemPhotos(check, id);
            const comment = (check.details && check.details[id] && check.details[id].comment)
                ? _defectRemediationPlainText(check.details[id].comment)
                : '';
            const ev = {
                date: checkDate && !Number.isNaN(checkDate.getTime()) ? checkDate : null,
                dateIso: check.date || null,
                photos,
                comment,
                inspectionId: check.id || check.local_id || null,
            };
            if (isFail) g.failEvents.push(ev);
            if (isOk) g.okEvents.push(ev);
        });
    });

    const cards = [];
    groups.forEach((g) => {
        if (g.failEvents.length < threshold) return;

        g.failEvents.sort((a, b) => (b.date || 0) - (a.date || 0));
        g.okEvents.sort((a, b) => (a.date || 0) - (b.date || 0));

        const failWithPhoto = g.failEvents.find((e) => e.photos && e.photos.length) || g.failEvents[0];
        const leftSrc = failWithPhoto && failWithPhoto.photos && failWithPhoto.photos[0]
            ? failWithPhoto.photos[0]
            : null;
        const leftDate = failWithPhoto ? failWithPhoto.date : null;

        let rightSrc = null;
        let rightSource = 'none';
        let rightCaption = 'Нет эталона';
        const laterOk = g.okEvents.find((e) => {
            if (!e.photos || !e.photos.length) return false;
            if (!leftDate || !e.date) return true;
            return e.date > leftDate;
        });
        if (laterOk) {
            rightSrc = laterOk.photos[0];
            rightSource = 'ok';
            rightCaption = laterOk.date
                ? `Устранение · ${laterOk.date.toLocaleDateString('ru-RU')}`
                : 'Устранение (ok в проверке)';
        } else {
            const twi = _defectRemediationFindTwi(g.templateKey, g.itemId);
            if (twi && twi.photoGood) {
                rightSrc = twi.photoGood;
                rightSource = 'twi';
                rightCaption = `Эталон TWI · ${twi.title || 'карта'}`;
            }
        }

        const failPhotoSet = [];
        g.failEvents.forEach((e) => (e.photos || []).forEach((p) => {
            if (p && !failPhotoSet.includes(p)) failPhotoSet.push(p);
        }));
        const okPhotoSet = [];
        g.okEvents.forEach((e) => (e.photos || []).forEach((p) => {
            if (p && !okPhotoSet.includes(p)) okPhotoSet.push(p);
        }));
        const twi = _defectRemediationFindTwi(g.templateKey, g.itemId);
        const rightCandidates = okPhotoSet.slice();
        if (twi && twi.photoGood && !rightCandidates.includes(twi.photoGood)) {
            rightCandidates.push(twi.photoGood);
        }

        const dates = g.failEvents
            .map((e) => e.date)
            .filter(Boolean)
            .sort((a, b) => a - b);
        const commentHint = _defectRemediationPlainText((failWithPhoto && failWithPhoto.comment) || '');
        const descFromChecklist = [g.defectName, g.itemText].filter(Boolean).join('. ');
        const description = _defectRemediationPlainText(commentHint
            ? `${descFromChecklist}${descFromChecklist ? ' ' : ''}Комментарий: ${commentHint}`.trim()
            : (descFromChecklist || g.defectName));

        cards.push({
            id: `dr_${cards.length}_${Date.now().toString(36)}`,
            key: g.key,
            contractor: g.contractor,
            workType: g.workType,
            project: g.project,
            templateKey: g.templateKey,
            itemId: g.itemId,
            defectName: g.defectName,
            itemText: g.itemText || '',
            count: g.failEvents.length,
            included: true,
            leftSrc,
            leftCaption: leftDate
                ? `Брак · ${leftDate.toLocaleDateString('ru-RU')}`
                : 'Брак',
            leftCandidates: failPhotoSet,
            rightSrc,
            rightSource,
            rightCaption,
            rightCandidates,
            dateFrom: dates[0] ? dates[0].toLocaleDateString('ru-RU') : '—',
            dateTo: dates.length ? dates[dates.length - 1].toLocaleDateString('ru-RU') : '—',
            commentHint,
            fields: {
                description,
                causeRisk: '',
                fix: '',
                prevention: '',
                deadline: '',
                responsible: '',
            },
        });
    });

    cards.sort((a, b) => {
        const p = String(a.project || '').localeCompare(String(b.project || ''), 'ru');
        if (p !== 0) return p;
        const c = String(a.contractor).localeCompare(String(b.contractor), 'ru');
        if (c !== 0) return c;
        return b.count - a.count;
    });
    return cards;
}

function _defectRemediationFilterSummary() {
    const parts = [];
    parts.push(resolveExportPeriodLabel(null));
    try {
        const filters = _analyticsFilters() || {};
        const proj = filters.project || [];
        const contr = filters.contractor || [];
        const insp = filters.inspector || [];
        const tmpl = filters.template || [];
        if (proj.length) parts.push(`объект: ${proj.slice(0, 2).join(', ')}${proj.length > 2 ? '…' : ''}`);
        if (contr.length) parts.push(`подрядчик: ${contr.slice(0, 2).join(', ')}${contr.length > 2 ? '…' : ''}`);
        if (insp.length) parts.push(`инспектор: ${insp.slice(0, 2).join(', ')}${insp.length > 2 ? '…' : ''}`);
        if (tmpl.length) parts.push(`категория: ${tmpl.slice(0, 2).join(', ')}${tmpl.length > 2 ? '…' : ''}`);
    } catch (_) { /* ignore */ }
    return parts.join(' · ');
}

function _ensureDefectRemediationModal() {
    let overlay = document.getElementById('defect-remediation-modal');
    if (overlay) return overlay;
    const root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals');
    if (!root) return null;
    root.insertAdjacentHTML('beforeend', `
    <div id="defect-remediation-modal" class="fixed inset-0 bg-slate-900/60 z-[9100] hidden items-end sm:items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onclick="if(event.target===this)closeDefectRemediationPreview()">
        <div class="bg-[var(--card-bg)] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh]" onclick="event.stopPropagation()">
            <div class="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2 shrink-0">
                <div class="min-w-0">
                    <div class="font-black text-[12px] uppercase tracking-tight text-slate-800 dark:text-white">Повторяющиеся дефекты · А3</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase mt-0.5 leading-snug" id="defect-remediation-modal-sub">Фильтры аналитики</div>
                </div>
                <button type="button" onclick="closeDefectRemediationPreview()" class="shrink-0 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95" aria-label="Закрыть">✕</button>
            </div>
            <div id="defect-remediation-list" class="p-2 sm:p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1"></div>
            <div class="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="defect-remediation-ai-draft-btn" onclick="runDefectRemediationAi('draft')" class="flex-1 min-w-[140px] py-2.5 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-bold text-[10px] uppercase tracking-widest active:scale-95">Черновик ИИ</button>
                    <button type="button" id="defect-remediation-ai-improve-btn" onclick="runDefectRemediationAi('improve')" class="flex-1 min-w-[140px] py-2.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-[10px] uppercase tracking-widest active:scale-95">Улучшить мой текст</button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="closeDefectRemediationPreview()" class="flex-1 min-w-[100px] py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] uppercase tracking-widest active:scale-95">Отмена</button>
                    <button type="button" onclick="confirmDefectRemediationExport('browser')" class="flex-1 min-w-[100px] py-3 rounded-xl bg-slate-700 text-white font-bold text-[11px] uppercase tracking-widest active:scale-95">Печать</button>
                    <button type="button" onclick="confirmDefectRemediationExport('script')" class="flex-[1.2] min-w-[120px] py-3 rounded-xl bg-indigo-600 text-white font-bold text-[11px] uppercase tracking-widest active:scale-95 shadow-md">Скачать PDF</button>
                </div>
            </div>
            <input type="file" id="defect-remediation-photo-input" accept="image/*" class="hidden">
        </div>
    </div>`);
    const fileInput = document.getElementById('defect-remediation-photo-input');
    if (fileInput && !fileInput.dataset.bound) {
        fileInput.dataset.bound = '1';
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            const ctx = window._defectRemediationUpload;
            e.target.value = '';
            if (!file || !ctx) return;
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const state = window._defectRemediationState;
                const card = state && state.cards[ctx.idx];
                if (!card) return;
                if (ctx.side === 'left') {
                    card.leftSrc = dataUrl;
                    card.leftCaption = 'Брак (загружено)';
                    if (!card.leftCandidates.includes(dataUrl)) card.leftCandidates.push(dataUrl);
                } else {
                    card.rightSrc = dataUrl;
                    card.rightSource = 'upload';
                    card.rightCaption = 'Устранение / эталон (загружено)';
                    if (!card.rightCandidates.includes(dataUrl)) card.rightCandidates.push(dataUrl);
                }
                _syncDefectRemediationFieldsFromDom();
                _renderDefectRemediationPreviewList();
            };
            reader.readAsDataURL(file);
        });
    }
    return document.getElementById('defect-remediation-modal');
}

function _syncDefectRemediationFieldsFromDom() {
    const state = window._defectRemediationState;
    if (!state) return;
    (state.cards || []).forEach((card, idx) => {
        if (!card.fields) card.fields = {};
        const root = document.querySelector(`[data-dr-idx="${idx}"]`);
        if (!root) return;
        ['description', 'causeRisk', 'fix', 'prevention', 'deadline', 'responsible'].forEach((key) => {
            const el = root.querySelector(`[data-dr-field="${key}"]`);
            if (el) card.fields[key] = _defectRemediationPlainText(el.value);
        });
        const chk = root.querySelector('[data-dr-include]');
        if (chk) card.included = !!chk.checked;
    });
}

function _renderDefectRemediationPreviewList() {
    const state = window._defectRemediationState;
    const list = document.getElementById('defect-remediation-list');
    if (!state || !list) return;
    const cards = state.cards || [];
    if (!cards.length) {
        list.innerHTML = `<div class="text-center py-8 text-[11px] font-bold text-slate-500 uppercase">Нет дефектов с ≥${DEFECT_REMEDIATION_THRESHOLD} повторениями по текущим фильтрам</div>`;
        return;
    }

    const field = (idx, key, label, rows = 2) => {
        const val = _defectRemediationPlainText((cards[idx].fields && cards[idx].fields[key]) || '');
        return `
            <label class="block">
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest">${label}</span>
                <textarea data-dr-field="${key}" rows="${rows}" class="mt-0.5 w-full text-[12px] font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-indigo-400 resize-y min-h-[2.75rem] leading-snug">${escapeHtml(val)}</textarea>
            </label>`;
    };

    list.innerHTML = cards.map((card, idx) => {
        const leftThumb = card.leftSrc
            ? `<img src="${escapeHtml(_defectRemediationPhotoSrc(card.leftSrc))}" class="w-full h-full object-cover" alt="">`
            : `<div class="w-full h-full flex flex-col items-center justify-center gap-1 text-[9px] font-bold text-slate-400 uppercase px-2 text-center">Нет фото<br><span class="text-indigo-500 normal-case font-black">нажмите · загрузить</span></div>`;
        const rightThumb = card.rightSrc
            ? `<img src="${escapeHtml(_defectRemediationPhotoSrc(card.rightSrc))}" class="w-full h-full object-cover" alt="">`
            : `<div class="w-full h-full flex flex-col items-center justify-center gap-1 text-[9px] font-bold text-amber-600/80 uppercase px-2 text-center">Нет эталона<br><span class="text-indigo-500 normal-case font-black">нажмите · загрузить</span></div>`;
        const rightBadge = card.rightSource === 'ok' ? 'ok' : (card.rightSource === 'twi' ? 'TWI' : (card.rightSource === 'upload' ? 'файл' : '—'));
        return `
        <div class="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900/40 ${card.included ? '' : 'opacity-50'}" data-dr-idx="${idx}">
            <div class="flex items-start gap-2 mb-2">
                <label class="flex items-center gap-2 cursor-pointer shrink-0 pt-0.5">
                    <input type="checkbox" data-dr-include class="w-4 h-4 accent-indigo-600" ${card.included ? 'checked' : ''} onchange="toggleDefectRemediationCard(${idx}, this.checked)">
                </label>
                <div class="min-w-0 flex-1">
                    <div class="text-[12px] font-black text-slate-800 dark:text-white leading-snug">${escapeHtml(card.defectName)}</div>
                    <div class="text-[9px] font-bold text-indigo-600/80 dark:text-indigo-300 uppercase mt-0.5">${escapeHtml(_defectRemediationProjectKey(card))}</div>
                    <div class="text-[9px] font-bold text-slate-500 uppercase mt-0.5">${escapeHtml(card.contractor)} · ${escapeHtml(card.workType)}</div>
                    <div class="text-[9px] font-bold text-rose-600 mt-0.5">${card.count}× · ${escapeHtml(card.dateFrom)} — ${escapeHtml(card.dateTo)}</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 mb-2">
                <div>
                    <div class="text-[9px] font-black uppercase text-slate-400 mb-1.5 flex justify-between items-center gap-1">
                        <span>Брак</span>
                        <span class="flex gap-1.5">
                            <button type="button" class="min-w-[2.75rem] h-10 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 text-[16px] font-black active:scale-95 border border-slate-200 dark:border-slate-600" onclick="event.stopPropagation();cycleDefectRemediationPhoto(${idx}, 'left')" title="Сменить из кандидатов">↻</button>
                            <button type="button" class="min-w-[2.75rem] h-10 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[16px] font-black active:scale-95 border border-indigo-200 dark:border-indigo-700" onclick="event.stopPropagation();uploadDefectRemediationPhoto(${idx}, 'left')" title="Загрузить своё">↑</button>
                        </span>
                    </div>
                    <div class="aspect-[4/3] rounded-lg overflow-hidden border border-rose-200 bg-slate-50 dark:bg-slate-800 cursor-pointer" onclick="onDefectRemediationPhotoClick(${idx}, 'left')">${leftThumb}</div>
                    <div class="text-[9px] font-bold text-slate-400 mt-1 truncate">${escapeHtml(card.leftCaption || '')}</div>
                </div>
                <div>
                    <div class="text-[9px] font-black uppercase text-slate-400 mb-1.5 flex justify-between items-center gap-1">
                        <span>Устранение · ${escapeHtml(rightBadge)}</span>
                        <span class="flex gap-1.5">
                            <button type="button" class="min-w-[2.75rem] h-10 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 text-[16px] font-black active:scale-95 border border-slate-200 dark:border-slate-600" onclick="event.stopPropagation();cycleDefectRemediationPhoto(${idx}, 'right')" title="Сменить из кандидатов">↻</button>
                            <button type="button" class="min-w-[2.75rem] h-10 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[16px] font-black active:scale-95 border border-indigo-200 dark:border-indigo-700" onclick="event.stopPropagation();uploadDefectRemediationPhoto(${idx}, 'right')" title="Загрузить своё">↑</button>
                        </span>
                    </div>
                    <div class="aspect-[4/3] rounded-lg overflow-hidden border border-emerald-200 bg-slate-50 dark:bg-slate-800 cursor-pointer" onclick="onDefectRemediationPhotoClick(${idx}, 'right')">${rightThumb}</div>
                    <div class="text-[8px] font-bold text-slate-400 mt-1 truncate">${escapeHtml(card.rightCaption || '')}</div>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${field(idx, 'description', 'Описание дефекта', 2)}
                ${field(idx, 'causeRisk', 'Причины возникновения и риски', 2)}
                ${field(idx, 'fix', 'Меры по устранению', 2)}
                ${field(idx, 'prevention', 'Меры по предотвращению', 2)}
                ${field(idx, 'deadline', 'Срок', 1)}
                ${field(idx, 'responsible', 'Ответственный', 1)}
            </div>
        </div>`;
    }).join('');
}

async function openDefectRemediationPreview(data, mode = 'script') {
    // data уже из getFilteredAnalyticsData() (период / объект / подрядчик / инспектор / шаблон)
    const cards = collectRecurringDefectCards(data);
    if (!cards.length) {
        return showToast(`Нет дефектов с ≥${DEFECT_REMEDIATION_THRESHOLD} повторениями (B2/B3) по текущим фильтрам`);
    }

    const projectNames = [...new Set(cards.map((c) => c.project).filter(Boolean))];
    const filterSummary = _defectRemediationFilterSummary();
    window._defectRemediationState = {
        cards,
        mode,
        periodLabel: resolveExportPeriodLabel(null),
        filterSummary,
        projectLabel: projectNames.length === 1
            ? projectNames[0]
            : (projectNames.length ? `${projectNames.length} объектов` : 'Объект'),
    };

    const overlay = _ensureDefectRemediationModal();
    if (!overlay) return showToast('Не удалось открыть превью');

    const sub = document.getElementById('defect-remediation-modal-sub');
    if (sub) {
        sub.textContent = `${cards.length} карточек · фильтры: ${filterSummary}`;
    }
    _renderDefectRemediationPreviewList();

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeDefectRemediationPreview() {
    const overlay = document.getElementById('defect-remediation-modal');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
}

function toggleDefectRemediationCard(idx, checked) {
    const state = window._defectRemediationState;
    if (!state || !state.cards[idx]) return;
    _syncDefectRemediationFieldsFromDom();
    state.cards[idx].included = !!checked;
    _renderDefectRemediationPreviewList();
}

function cycleDefectRemediationPhoto(idx, side) {
    const state = window._defectRemediationState;
    const card = state && state.cards[idx];
    if (!card) return;
    _syncDefectRemediationFieldsFromDom();
    if (side === 'left') {
        const list = card.leftCandidates || [];
        if (list.length < 2) {
            if (!card.leftSrc) return uploadDefectRemediationPhoto(idx, 'left');
            return;
        }
        const cur = Math.max(0, list.indexOf(card.leftSrc));
        card.leftSrc = list[(cur + 1) % list.length];
        card.leftCaption = 'Брак (выбран вручную)';
    } else {
        const list = card.rightCandidates || [];
        if (!list.length) return uploadDefectRemediationPhoto(idx, 'right');
        const cur = Math.max(0, list.indexOf(card.rightSrc));
        const next = list[(cur + 1) % list.length];
        card.rightSrc = next;
        const twi = _defectRemediationFindTwi(card.templateKey, card.itemId);
        if (twi && twi.photoGood === next) {
            card.rightSource = 'twi';
            card.rightCaption = `Эталон TWI · ${twi.title || 'карта'}`;
        } else if (String(next).startsWith('data:')) {
            card.rightSource = 'upload';
            card.rightCaption = 'Устранение / эталон (загружено)';
        } else {
            card.rightSource = 'ok';
            card.rightCaption = 'Устранение / эталон (выбран вручную)';
        }
    }
    _renderDefectRemediationPreviewList();
}

function uploadDefectRemediationPhoto(idx, side) {
    window._defectRemediationUpload = { idx, side };
    const input = document.getElementById('defect-remediation-photo-input');
    if (input) input.click();
}

function onDefectRemediationPhotoClick(idx, side) {
    const state = window._defectRemediationState;
    const card = state && state.cards[idx];
    if (!card) return;
    const src = side === 'left' ? card.leftSrc : card.rightSrc;
    const candidates = side === 'left' ? card.leftCandidates : card.rightCandidates;
    if (!src) return uploadDefectRemediationPhoto(idx, side);
    if (candidates && candidates.length > 1) return cycleDefectRemediationPhoto(idx, side);
    return uploadDefectRemediationPhoto(idx, side);
}

async function runDefectRemediationAi(mode) {
    const state = window._defectRemediationState;
    if (!state) return;
    _syncDefectRemediationFieldsFromDom();
    const selected = (state.cards || []).filter((c) => c.included);
    if (!selected.length) return showToast('Выберите хотя бы одну карточку');

    const draftBtn = document.getElementById('defect-remediation-ai-draft-btn');
    const improveBtn = document.getElementById('defect-remediation-ai-improve-btn');
    const setAiBusy = (busy, label) => {
        if (draftBtn) {
            draftBtn.disabled = !!busy;
            draftBtn.textContent = busy ? (label || '⏳ Ждём ИИ…') : 'Черновик ИИ';
        }
        if (improveBtn) {
            improveBtn.disabled = !!busy;
            improveBtn.textContent = busy ? (label || '⏳ Ждём ИИ…') : 'Улучшить мой текст';
        }
    };
    setAiBusy(true, '⏳ Пакет 1…');
    showToast(mode === 'improve' ? 'ИИ улучшает текст пакетами…' : 'ИИ готовит черновик пакетами…');

    try {
        if (typeof window.generateDefectRemediationTexts !== 'function') {
            return showToast('ИИ недоступен');
        }
        const textsMap = await window.generateDefectRemediationTexts(selected, {
            mode,
            onProgress: (batchNum, totalBatches) => {
                setAiBusy(true, `⏳ ${batchNum}/${totalBatches}`);
                showToast(`🤖 ИИ: пакет ${batchNum} из ${totalBatches}…`);
            },
        }) || {};
        let filled = 0;
        let cardsFilled = 0;
        selected.forEach((card, selIdx) => {
            const allIdx = state.cards.indexOf(card);
            const t = textsMap[card.id]
                || textsMap[String(card.id)]
                || textsMap[`idx_${selIdx}`]
                || textsMap[`idx_${allIdx}`];
            if (!t) return;
            if (!card.fields) card.fields = {};
            let cardGot = 0;
            const apply = (key, val) => {
                const plain = _defectRemediationPlainText(val);
                if (plain) { card.fields[key] = plain; filled += 1; cardGot += 1; }
            };
            apply('description', t.description);
            apply('causeRisk', t.causeRisk || t.impact);
            apply('fix', t.fix);
            apply('prevention', t.prevention);
            apply('deadline', t.deadline);
            apply('responsible', t.responsible);
            if (cardGot) cardsFilled += 1;
        });
        _renderDefectRemediationPreviewList();
        if (!filled) {
            showToast('ИИ ответил, но поля не распознаны — попробуйте ещё раз');
        } else {
            showToast(mode === 'improve'
                ? `Текст улучшен (${cardsFilled} карт.)`
                : `Черновик заполнен (${cardsFilled} карт.)`);
        }
    } catch (e) {
        console.warn('[defect_remediation AI]', e);
        showToast('Ошибка ИИ: ' + (e.message || e));
    } finally {
        setAiBusy(false);
    }
}

async function confirmDefectRemediationExport(modeOverride) {
    const state = window._defectRemediationState;
    if (!state) return;
    _syncDefectRemediationFieldsFromDom();
    const selected = (state.cards || []).filter((c) => c.included);
    if (!selected.length) return showToast('Выберите хотя бы одну карточку');

    const mode = modeOverride || state.mode || 'script';
    closeDefectRemediationPreview();
    await exportPdfDefectRemediation(selected, mode, {
        periodLabel: state.periodLabel,
        projectLabel: state.projectLabel,
        filterSummary: state.filterSummary,
    });
}

async function exportPdfDefectRemediation(cards, mode = 'script', meta = {}) {
    if (!cards || !cards.length) return showToast('Нет карточек для отчёта');

    const periodLabel = meta.periodLabel || resolveExportPeriodLabel(null);
    const projectLabel = meta.projectLabel || 'Объект';
    const filterSummary = meta.filterSummary || periodLabel;
    const title = 'Повторяющиеся дефекты';
    const publicToken = generatePublicReportToken();

    let qrDataUrl = null;
    try {
        if (typeof QRCode !== 'undefined') {
            qrDataUrl = await generateQrCodeDataUrl(`https://app.rbi-q.ru/report.html?token=${publicToken}`);
        }
    } catch (e) { console.warn('QR (defect remediation)', e); }

    // Группировка: объект → подрядчик → карточки
    const byProject = [];
    const projMap = new Map();
    cards.forEach((c) => {
        const pKey = _defectRemediationProjectKey(c);
        if (!projMap.has(pKey)) {
            const bucket = { project: pKey, byContr: [], contrMap: new Map() };
            projMap.set(pKey, bucket);
            byProject.push(bucket);
        }
        const pb = projMap.get(pKey);
        const cKey = c.contractor || 'Подрядчик';
        if (!pb.contrMap.has(cKey)) {
            const cb = { contractor: cKey, cards: [] };
            pb.contrMap.set(cKey, cb);
            pb.byContr.push(cb);
        }
        pb.contrMap.get(cKey).cards.push(c);
    });
    byProject.sort((a, b) => String(a.project).localeCompare(String(b.project), 'ru'));

    const reportAuthor = String(
        meta.author
        || _getSetting('engineerName')
        || document.getElementById('inp-inspector')?.value
        || 'Инженер'
    ).trim() || 'Инженер';

    const titleHeader = await getBrandedHeader(
        title,
        mode,
        qrDataUrl,
        reportAuthor,
        periodLabel,
        { dense: true, titleTooltip: `${title} · ${projectLabel}` }
    );

    const titleBody = `
    <div class="no-break" style="font-family:'Bricolage Grotesque',Verdana,sans-serif;padding:6px 0 2px;">
        <div style="font-size:16px;font-weight:900;color:#0f172a;text-transform:uppercase;">${escapeHtml(projectLabel)}</div>
        <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:4px;">Фильтры: ${escapeHtml(filterSummary)}</div>
        <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:2px;">
            Порог ≥${DEFECT_REMEDIATION_THRESHOLD} повторов (B2/B3) · объектов: ${byProject.length} · карточек: ${cards.length} · А3 альбом
        </div>
        <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-top:8px;">Далее — титул каждого объекта и дефекты этого объекта</div>
    </div>`;

    let content = titleHeader + titleBody;
    let pageIndex = 0;

    const metricTile = (label, value, tone) => `
        <td style="width:16.66%;padding:4px;vertical-align:top;">
            <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 8px;text-align:center;background:#fff;">
                <div style="font-size:22px;font-weight:900;color:${tone || '#0f172a'};line-height:1.1;">${value}</div>
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-top:4px;letter-spacing:0.04em;">${label}</div>
            </div>
        </td>`;

    for (const section of byProject) {
        const allCards = section.byContr.flatMap((c) => c.cards);
        const m = _defectRemediationProjectMetrics(section.project, allCards);
        pageIndex += 1;

        const projHeader = await getBrandedHeader(
            section.project,
            mode,
            null,
            reportAuthor,
            m.periodLabel,
            {
                dense: true,
                wrapTitle: true,
                marginBottom: 4,
                paddingBottom: 4,
                titlePx: 20,
                titleTooltip: `Объект · ${section.project}`,
            }
        );

        const projectTitlePage = `
        <div class="no-break" style="font-family:'Bricolage Grotesque',Verdana,sans-serif;max-height:980px;overflow:hidden;box-sizing:border-box;">
            ${projHeader}
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;margin:0 0 10px;">
                Повторяющиеся дефекты · титул объекта
            </div>
            <div style="font-size:28px;font-weight:900;color:#0f172a;line-height:1.15;margin-bottom:8px;">
                ${escapeHtml(section.project)}
            </div>
            <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:14px;">
                Период сбора: ${escapeHtml(m.periodLabel)}
                <span style="color:#94a3b8;font-weight:600;"> · с 1-й проверки по текущую дату</span>
            </div>
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:14px;">
                <tr>
                    ${metricTile('Проверок', m.checks, '#0f172a')}
                    ${metricTile('Дефектов B2', m.failB2, '#d97706')}
                    ${metricTile('Дефектов B3', m.failB3, '#dc2626')}
                    ${metricTile('Всего fail', m.failTotal, '#e11d48')}
                    ${metricTile('Подрядчиков', m.contractors, '#4f46e5')}
                    ${metricTile('В отчёте', m.reportCards, '#0f172a')}
                </tr>
            </table>
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#f8fafc;margin-bottom:10px;">
                <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:6px;">В этом отчёте по объекту</div>
                <div style="font-size:13px;font-weight:700;color:#1e293b;line-height:1.45;">
                    Карточек повторов (≥${DEFECT_REMEDIATION_THRESHOLD}): <b>${m.reportCards}</b>
                    · сумма повторов: <b>${m.reportRepeats}</b>
                    · подрядчиков с повторами: <b>${m.reportContractors}</b>
                </div>
            </div>
            <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;">
                <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;padding:8px 12px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">
                    Повторяющиеся дефекты · кратко
                </div>
                <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="text-align:left;padding:7px 10px;font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;width:26%;border-bottom:1px solid #e2e8f0;">Подрядчик</th>
                            <th style="text-align:left;padding:7px 10px;font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;width:22%;border-bottom:1px solid #e2e8f0;">Вид работ</th>
                            <th style="text-align:left;padding:7px 10px;font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;width:42%;border-bottom:1px solid #e2e8f0;">Дефект</th>
                            <th style="text-align:right;padding:7px 10px;font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;width:10%;border-bottom:1px solid #e2e8f0;">Раз</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...allCards]
                            .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0)
                                || String(a.contractor || '').localeCompare(String(b.contractor || ''), 'ru'))
                            .map((card, i) => `
                        <tr style="background:${i % 2 ? '#f8fafc' : '#fff'};">
                            <td style="padding:6px 10px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;vertical-align:top;">${escapeHtml(card.contractor || '—')}</td>
                            <td style="padding:6px 10px;font-size:12px;font-weight:600;color:#334155;border-bottom:1px solid #f1f5f9;vertical-align:top;">${escapeHtml(card.workType || '—')}</td>
                            <td style="padding:6px 10px;font-size:12px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;vertical-align:top;">${escapeHtml(_defectRemediationPlainText(card.defectName) || '—')}</td>
                            <td style="padding:6px 10px;font-size:13px;font-weight:900;color:#e11d48;text-align:right;border-bottom:1px solid #f1f5f9;vertical-align:top;white-space:nowrap;">${Number(card.count) || 0}×</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                <div style="font-size:11px;font-weight:600;color:#94a3b8;padding:8px 12px;">
                    Далее — фото и меры по каждому дефекту
                </div>
            </div>
            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-align:right;margin-top:12px;">Лист ${pageIndex}</div>
        </div>`;

        content += '<div class="pdf-page-break page-break-before"></div>' + projectTitlePage;

        for (const contrSection of section.byContr) {
            for (const card of contrSection.cards) {
                pageIndex += 1;
                const pageHeader = await getBrandedHeader(
                    card.defectName,
                    mode,
                    null,
                    reportAuthor,
                    m.periodLabel,
                    {
                        dense: true,
                        wrapTitle: true,
                        marginBottom: 2,
                        paddingBottom: 2,
                        titlePx: 16,
                        titleTooltip: `${section.project} · ${card.contractor} · ${card.defectName}`,
                    }
                );
                const leftImg = card.leftSrc
                    ? `<img src="${escapeHtml(card.leftSrc)}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="брак">`
                    : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;font-weight:800;">Нет фото брака</div>`;
                const rightImg = card.rightSrc
                    ? `<img src="${escapeHtml(card.rightSrc)}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="эталон">`
                    : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#d97706;font-size:14px;font-weight:800;text-align:center;padding:8px;">Нет фото устранения / эталона</div>`;
                const f = card.fields || {};
                const textBlock = (label, body, border) => `
                    <div style="background:#fff;border:1px solid ${border};border-radius:8px;padding:8px 10px;height:100%;box-sizing:border-box;">
                        <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:4px;">${label}</div>
                        <div style="font-size:12px;font-weight:600;color:#1e293b;line-height:1.4;">${escapeHtml(_defectRemediationPlainText(body) || '—')}</div>
                    </div>`;

                const page = `
                <div class="no-break" style="font-family:'Bricolage Grotesque',Verdana,sans-serif;max-height:980px;overflow:hidden;box-sizing:border-box;">
                    ${pageHeader}
                    <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;margin:0 0 6px;">
                        ${escapeHtml(section.project)} · ${escapeHtml(card.contractor)} · ${escapeHtml(card.workType)}
                        <span style="color:#e11d48;margin-left:8px;">${card.count}×</span>
                        <span style="color:#94a3b8;margin-left:8px;font-weight:700;">${escapeHtml(card.dateFrom)} — ${escapeHtml(card.dateTo)}</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:8px;">
                        <tr>
                            <td style="width:50%;padding-right:6px;vertical-align:top;">
                                <div style="border:2px solid #fecaca;border-radius:10px;overflow:hidden;background:#fef2f2;">
                                    <div style="height:480px;background:#f1f5f9;">${leftImg}</div>
                                    <div style="padding:6px 10px;font-size:12px;font-weight:800;color:#991b1b;text-transform:uppercase;">${escapeHtml(card.leftCaption || 'Брак')}</div>
                                </div>
                            </td>
                            <td style="width:50%;padding-left:6px;vertical-align:top;">
                                <div style="border:2px solid #bbf7d0;border-radius:10px;overflow:hidden;background:#f0fdf4;">
                                    <div style="height:480px;background:#f1f5f9;">${rightImg}</div>
                                    <div style="padding:6px 10px;font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;">${escapeHtml(card.rightCaption || 'Устранение / эталон')}</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                        <tr>
                            <td style="width:50%;padding:0 4px 6px 0;vertical-align:top;">${textBlock('Описание дефекта', f.description, '#e2e8f0')}</td>
                            <td style="width:50%;padding:0 0 6px 4px;vertical-align:top;">${textBlock('Причины возникновения и риски', f.causeRisk, '#fed7aa')}</td>
                        </tr>
                        <tr>
                            <td style="width:50%;padding:0 4px 6px 0;vertical-align:top;">${textBlock('Меры по устранению', f.fix, '#bbf7d0')}</td>
                            <td style="width:50%;padding:0 0 6px 4px;vertical-align:top;">${textBlock('Меры по предотвращению', f.prevention, '#c7d2fe')}</td>
                        </tr>
                        <tr>
                            <td style="width:50%;padding:0 4px 0 0;vertical-align:top;">${textBlock('Срок', f.deadline, '#e2e8f0')}</td>
                            <td style="width:50%;padding:0 0 0 4px;vertical-align:top;">${textBlock('Ответственный', f.responsible, '#e2e8f0')}</td>
                        </tr>
                    </table>
                    <div style="font-size:10px;color:#94a3b8;font-weight:700;text-align:right;margin-top:4px;">Лист ${pageIndex} · ${escapeHtml(section.project)}</div>
                </div>`;

                content += '<div class="pdf-page-break page-break-before"></div>' + page;
            }
        }
    }

    await printPdfShell(title, content, 'A3', 'landscape', mode, {
        skipShellHeader: true,
        publicToken,
        period: periodLabel,
        author: reportAuthor,
        forceShowQr: false,
    });
}

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

        {
            const d = record.date ? new Date(record.date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU');
            printPdfShell(`Акт-Эталон: ${record.contractorName}`, content, "A4", "portrait", mode, {
                author: record.inspectorName || record.author || _getSetting('engineerName') || 'Инженер',
                period: `с ${d} по ${d}`
            });
        }
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

        {
            const d = record.date ? new Date(record.date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU');
            printPdfShell(`Акт-Эталон (Бета): ${record.contractorName}`, content, "A4", "portrait", mode, {
                author: record.inspectorName || record.author || _getSetting('engineerName') || 'Инженер',
                period: `с ${d} по ${d}`
            });
        }
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
        const content = await buildMeetingProtocolHtml(meet);
        if (typeof printPdfShell === 'function') {
            const meetDate = meet.date ? new Date(meet.date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU');
            printPdfShell(
                `Протокол от ${meetDate}`,
                content,
                "A4",
                "portrait",
                mode,
                {
                    author: meet.author || _getSetting('engineerName') || 'Инженер',
                    period: `с ${meetDate} по ${meetDate}`
                }
            );
        }
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
            printPdfShell(
                `FMEA Анализ`,
                content,
                "A3",
                "landscape",
                mode,
                {
                    author: record.author || _getSetting('engineerName') || 'Инженер',
                    period: resolveDocPeriodLabel(record.date, record.periodName)
                }
            );
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
     * Учитывает те же активные фильтры, что экран дашборда ПК СК
     * (период / объект / подрядчик / инспектор / категория + режим cloud).
     */
    exportSkPdf(mode = 'script') {
        let skRecordsList = (_getSkRecords() || []).filter(r => !r._deleted && !r.is_deleted);
        if (!skRecordsList.length) {
            return showToast('Нет загруженных замечаний ПК СК.');
        }

        // Как в sk_renderDashboard — печать = то, что видит пользователь на экране.
        if (window.analyticsDataMode === 'cloud') {
            skRecordsList = skRecordsList.filter(r =>
                r.source === 'cloud' || r.syncStatus === 'synced' || r.sync_status === 'synced');
        }

        const selPeriod = document.getElementById('global-filter-period')?.value || 'ALL';
        const now = new Date();
        if (selPeriod === 'DAY') {
            skRecordsList = skRecordsList.filter(r => r.date_issued && new Date(r.date_issued).toDateString() === now.toDateString());
        } else if (selPeriod === 'WEEK') {
            const w = new Date(now); w.setDate(now.getDate() - 7);
            skRecordsList = skRecordsList.filter(r => r.date_issued && new Date(r.date_issued) >= w);
        } else if (selPeriod === 'MONTH') {
            const m = new Date(now); m.setDate(now.getDate() - 30);
            skRecordsList = skRecordsList.filter(r => r.date_issued && new Date(r.date_issued) >= m);
        } else if (selPeriod === 'CUSTOM') {
            const dFrom = document.getElementById('filter-date-from')?.value;
            const dTo = document.getElementById('filter-date-to')?.value;
            if (dFrom) skRecordsList = skRecordsList.filter(r => r.date_issued && new Date(r.date_issued) >= new Date(dFrom));
            if (dTo) {
                const tDate = new Date(dTo); tDate.setHours(23, 59, 59, 999);
                skRecordsList = skRecordsList.filter(r => r.date_issued && new Date(r.date_issued) <= tDate);
            }
        }

        const f = _analyticsFilters() || {};
        const fProj = f.project || [];
        const fContr = f.contractor || [];
        const fInsp = f.inspector || [];
        const fTmpl = (f.template || []).map(t => String(t).toLowerCase());
        if (fProj.length) {
            skRecordsList = skRecordsList.filter(r =>
                fProj.includes(r.project_display_name) || fProj.includes(r.project_canonical_key)
                || fProj.includes(r.display_name) || fProj.includes(r.projectName));
        }
        if (fContr.length) {
            skRecordsList = skRecordsList.filter(r =>
                fContr.includes(r.contractor_name) || fContr.includes(r.contractor)
                || fContr.includes(r.contractor_canonical_key));
        }
        if (fInsp.length) {
            skRecordsList = skRecordsList.filter(r =>
                fInsp.includes(r.issued_by) || fInsp.includes(r.inspector));
        }
        if (fTmpl.length) {
            skRecordsList = skRecordsList.filter(r => fTmpl.includes(String(r.category || '').toLowerCase()));
        }

        if (!skRecordsList.length) {
            return showToast('По активным фильтрам замечаний ПК СК нет.');
        }

        const isSkOpen = (r) => !(r.is_verified_closed === true
            || r.status_normalized === 'verified'
            || String(r.status || r.status_raw || '').toLowerCase().trim() === 'проверено');

        let totalIssues = 0; let totalOpen = 0; let totalOverdue = 0;
        const contrMap = {};

        skRecordsList.forEach(r => {
            totalIssues++;
            const isOpen = isSkOpen(r);
            if (isOpen) totalOpen++;

            const deadline = r.deadline ? new Date(r.deadline) : null;
            const overdueOpen = !!(deadline && isOpen && now > deadline);
            if (overdueOpen) totalOverdue++;

            const c = r.contractor_name || r.contractor || 'Неизвестно';
            if (!contrMap[c]) contrMap[c] = { total: 0, open: 0, overdue: 0 };

            contrMap[c].total++;
            if (isOpen) contrMap[c].open++;
            if (overdueOpen) contrMap[c].overdue++;
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

        const periodLabel = typeof resolveExportPeriodLabel === 'function'
            ? resolveExportPeriodLabel(null)
            : 'Всё время';
        const filterBits = [];
        if (fProj.length) filterBits.push(`объекты: ${fProj.join(', ')}`);
        if (fContr.length) filterBits.push(`подрядчики: ${fContr.join(', ')}`);
        if (fInsp.length) filterBits.push(`инспекторы: ${fInsp.join(', ')}`);
        if (fTmpl.length) filterBits.push(`категории: ${(f.template || []).join(', ')}`);
        const filterLine = filterBits.length
            ? filterBits.join(' · ')
            : 'фильтры: все объекты / подрядчики';

        const content = `
            <div class="no-break" style="margin-bottom: 20px; text-align:center;">
                <h2 style="font-size: 24px; color: #0f172a; margin: 0 0 5px 0; text-transform: uppercase;">Дашборд Стройконтроля (Выгрузка ПК СК)</h2>
                <div style="font-size: 11px; color: #64748b; font-weight: 700;">Период: ${periodLabel}</div>
                <div style="font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 2px;">${filterLine}</div>
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
     * INSPECTOR: одностраничная A4 landscape «карта для подрядчика».
     */
    async printTwi(mode = 'browser') {
        const twiId = document.getElementById('twi-viewer-overlay')?.dataset?.currentTwiId;
        if (!twiId) return;
        const card = _getTwiCards().find(c => c.id === twiId);
        if (!card) return;

        const esc = (s) => escapeHtml(String(s ?? ''));
        const stripHtml = (s) => String(s || '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?[^>]+(>|$)/g, '')
            .trim();

        const author = card.author || card.owner || _getSetting('engineerName') || 'Инженер';
        const cardDate = card.date || card.createdAt || card.updatedAt
            ? new Date(card.date || card.createdAt || card.updatedAt).toLocaleDateString('ru-RU')
            : new Date().toLocaleDateString('ru-RU');

        let content = '';

        if (card.type === 'INSPECTOR') {
            const resolvedGood = card.photoGood
                ? (await PhotoManager.getAsyncUrl(card.photoGood) || window.getPhotoSrc(card.photoGood))
                : null;
            const resolvedBad = card.photoBad
                ? (await PhotoManager.getAsyncUrl(card.photoBad) || window.getPhotoSrc(card.photoBad))
                : null;

            // Норматив и название пункта — как в viewer / autoFillTwiNorm
            let itemName = '';
            let normText = 'Норматив не указан';
            try {
                const ck = String(card.checklistKey || '');
                if (ck && card.itemId != null && card.itemId !== '' && card.itemId !== 'ALL') {
                    const type = ck.split('_')[0];
                    const key = ck.replace(type + '_', '');
                    const groups = type === 'sys' && _templates().getSystemTemplates()[key]
                        ? _templates().getSystemTemplates()[key].groups
                        : (_templates().getUserTemplates()[key] ? _templates().getUserTemplates()[key].groups : []);
                    const itemInfo = typeof getFlatList === 'function'
                        ? getFlatList(groups || []).find(i => String(i.id) === String(card.itemId))
                        : null;
                    if (itemInfo) {
                        itemName = itemInfo.n || '';
                        if (itemInfo.t) normText = stripHtml(itemInfo.t) || normText;
                    }
                }
            } catch (e) { /* норматив справочный — печать не падает */ }

            const howToCheck = stripHtml(card.howToCheck) || 'Методика не заполнена';
            const whyImportant = stripHtml(card.whyImportant) || 'Обоснование не заполнено';
            const checklistName = card.checklistName || card.category || 'Чек-лист';
            const metaParts = [
                checklistName,
                itemName || (card.itemId != null && card.itemId !== '' && card.itemId !== 'ALL' ? `п. ${card.itemId}` : ''),
                author
            ].filter(Boolean);

            // Один лист A4 landscape: жёсткий бюджет тела (шапка shell с wrapTitle чуть выше)
            const PHOTO_H = mode === 'browser' ? '88mm' : '260px';
            const TEXT_H = mode === 'browser' ? '40mm' : '120px';
            const BODY_MAX = mode === 'browser' ? '162mm' : '500px';

            const photoCell = (src, label, border, accent, bg, fg) => `
                <td style="width:50%;padding:0 4px;vertical-align:top;">
                    <div style="border:2px solid ${border};border-radius:8px;overflow:hidden;background:${bg};box-sizing:border-box;">
                        <div style="background:${accent};color:#fff;font-size:${mode === 'browser' ? '9pt' : '12px'};font-weight:800;letter-spacing:0.06em;text-transform:uppercase;padding:5px 10px;line-height:1.2;">${label}</div>
                        ${src
                            ? `<div style="height:${PHOTO_H};background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:6px;box-sizing:border-box;">
                                    <img src="${src}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;">
                               </div>`
                            : `<div style="height:${PHOTO_H};display:flex;align-items:center;justify-content:center;border-top:1px dashed ${border};color:${fg};font-size:${mode === 'browser' ? '9pt' : '12px'};font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Нет фото</div>`}
                    </div>
                </td>`;

            const textCol = (title, accent, body) => `
                <td style="width:33.33%;padding:0 3px;vertical-align:top;">
                    <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${accent};border-radius:6px;padding:8px 10px;height:${TEXT_H};max-height:${TEXT_H};overflow:hidden;box-sizing:border-box;">
                        <div style="font-size:${mode === 'browser' ? '8pt' : '10px'};font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;line-height:1.15;">${title}</div>
                        <div style="font-size:${mode === 'browser' ? '9pt' : '11px'};line-height:1.35;color:#334155;white-space:pre-wrap;margin:0;">${esc(body)}</div>
                    </div>
                </td>`;

            content = `
            <div class="no-break" style="font-family:'Bricolage Grotesque',Verdana,sans-serif;max-height:${BODY_MAX};overflow:hidden;box-sizing:border-box;">
                <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
                    <div style="margin-bottom:3px;">
                        <span style="display:inline-block;background:#1e40af;color:#fff;font-size:${mode === 'browser' ? '7pt' : '9px'};font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:3px 8px;border-radius:4px;line-height:1.2;">TWI · Технадзор</span>
                    </div>
                    <div style="font-size:${mode === 'browser' ? '8pt' : '11px'};font-weight:600;color:#64748b;line-height:1.3;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;">${esc(metaParts.join(' · '))}</div>
                </div>

                <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;margin-bottom:8px;">
                    <tr>
                        ${photoCell(resolvedGood, 'Эталон · правильно', '#16a34a', '#16a34a', '#f0fdf4', '#166534')}
                        ${photoCell(resolvedBad, 'Брак · нарушение', '#dc2626', '#dc2626', '#fef2f2', '#991b1b')}
                    </tr>
                </table>

                <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;margin-bottom:6px;">
                    <tr>
                        ${textCol('Почему это важно · риски', '#dc2626', whyImportant)}
                        ${textCol('Как проверять · методика', '#4f46e5', howToCheck)}
                        ${textCol('Норматив · СНиП / ГОСТ', '#0f766e', normText)}
                    </tr>
                </table>

                <div style="font-size:${mode === 'browser' ? '7pt' : '9px'};font-weight:600;color:#94a3b8;text-align:center;letter-spacing:0.02em;border-top:1px solid #e2e8f0;padding-top:4px;">
                    Карта качества · к пункту чек-листа · для передачи подрядчику · ${esc(cardDate)}
                </div>
            </div>`;
        } else if (card.type === 'WORKER') {
            // Несколько страниц допустимы: шаги с page-break-inside:avoid, без общего max-height.
            const steps = card.steps || [];
            const stepCount = steps.length;
            const checklistName = card.checklistName || card.category || '';

            content = `
            <div style="font-family:'Bricolage Grotesque',Verdana,sans-serif;box-sizing:border-box;">
                <div class="no-break" style="margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #1e293b;">
                    <div style="margin-bottom:4px;">
                        <span style="display:inline-block;background:#c2410c;color:#fff;font-size:${mode === 'browser' ? '7pt' : '9px'};font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:3px 8px;border-radius:4px;">TWI · Инструкция</span>
                    </div>
                    <div style="font-family:'Playfair Display',Georgia,serif;font-size:${mode === 'browser' ? '14pt' : '20px'};font-weight:700;color:#0f172a;line-height:1.2;text-transform:uppercase;margin-bottom:6px;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;">${esc(card.title || 'Пошаговая инструкция')}</div>
                    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                        <tr>
                            <td style="width:33%;padding:0 4px 0 0;vertical-align:top;">
                                <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:10px 12px;">
                                    <div style="font-size:${mode === 'browser' ? '7pt' : '9px'};font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em;">Время</div>
                                    <div style="font-size:${mode === 'browser' ? '14pt' : '20px'};font-weight:900;color:#0f172a;line-height:1.1;margin-top:2px;">~${esc(card.totalTime || 0)} мин</div>
                                </div>
                            </td>
                            <td style="width:33%;padding:0 4px;vertical-align:top;">
                                <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;">
                                    <div style="font-size:${mode === 'browser' ? '7pt' : '9px'};font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Шагов</div>
                                    <div style="font-size:${mode === 'browser' ? '14pt' : '20px'};font-weight:900;color:#0f172a;line-height:1.1;margin-top:2px;">${stepCount}</div>
                                </div>
                            </td>
                            <td style="width:34%;padding:0 0 0 4px;vertical-align:top;">
                                <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;">
                                    <div style="font-size:${mode === 'browser' ? '7pt' : '9px'};font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Контекст</div>
                                    <div style="font-size:${mode === 'browser' ? '8pt' : '11px'};font-weight:700;color:#334155;line-height:1.3;margin-top:2px;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;">${esc(checklistName || '—')}</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            `;

            const photoH = mode === 'browser' ? '55mm' : '200px';
            const photoW = mode === 'browser' ? '62mm' : '230px';

            for (const step of steps) {
                const stepPhotos = typeof window.normalizeItemPhotos === 'function'
                    ? window.normalizeItemPhotos(step.photo)
                    : (step.photo ? [step.photo] : []);
                const stepPhotoUrls = [];
                for (const p of stepPhotos) {
                    const resolved = p ? (await PhotoManager.getAsyncUrl(p) || window.getPhotoSrc(p)) : null;
                    if (resolved) stepPhotoUrls.push(resolved);
                }
                const photoCellHtml = stepPhotoUrls.length
                    ? stepPhotoUrls.map((url) => `
                        <div style="width:100%;height:${photoH};background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;padding:4px;box-sizing:border-box;">
                            <img src="${url}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;">
                        </div>`).join('')
                    : '';

                content += `
                    <table class="no-break" style="width:100%;border:1px solid #e2e8f0;border-left:5px solid #ea580c;border-radius:8px;background:#fff;margin-bottom:12px;border-collapse:collapse;table-layout:fixed;">
                        <tr>
                            <td style="padding:12px 14px;vertical-align:top;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                    <span style="display:inline-block;background:#fff7ed;color:#c2410c;font-size:${mode === 'browser' ? '8pt' : '10px'};font-weight:800;letter-spacing:0.06em;text-transform:uppercase;padding:3px 8px;border-radius:4px;">Шаг ${esc(step.order)}</span>
                                    ${step.time ? `<span style="font-size:${mode === 'browser' ? '8pt' : '10px'};font-weight:700;color:#64748b;">${esc(step.time)} мин</span>` : ''}
                                </div>
                                <p style="font-size:${mode === 'browser' ? '10pt' : '13px'};font-weight:700;color:#1e293b;white-space:pre-wrap;margin:0;line-height:1.4;">${esc(step.text || '')}</p>
                            </td>
                            ${photoCellHtml ? `<td style="width:${photoW};padding:12px;vertical-align:middle;text-align:center;">${photoCellHtml}</td>` : ''}
                        </tr>
                    </table>`;
            }

            content += `
                <div style="font-size:${mode === 'browser' ? '7pt' : '9px'};font-weight:600;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:6px;margin-top:4px;">
                    TWI-инструкция · ${esc(author)} · ${esc(cardDate)}
                </div>
            </div>`;
        } else {
            return showToast('Печать PDF-файлов осуществляется внешними средствами.');
        }

        const orientation = card.type === 'INSPECTOR' ? 'landscape' : 'portrait';
        const shellTitle = `TWI: ${card.title || 'Карта качества'}`;
        printPdfShell(shellTitle, content, 'A4', orientation, mode, {
            author,
            period: `с ${cardDate} по ${cardDate}`,
            headerOpts: {
                qrPx: card.type === 'INSPECTOR' ? 48 : 52,
                logoH: card.type === 'INSPECTOR' ? 40 : 44,
                logoMaxW: card.type === 'INSPECTOR' ? 140 : 150,
                marginBottom: card.type === 'INSPECTOR' ? 4 : 8,
                paddingBottom: card.type === 'INSPECTOR' ? 4 : 6,
                titlePx: card.type === 'INSPECTOR' ? 13 : 14,
                dense: true,
                wrapTitle: true,
                titleTooltip: shellTitle
            }
        });
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
            const d = p.date ? new Date(p.date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU');
            printPdfShell(`Практика: ${p.title}`, content, "A3", "landscape", mode, {
                author: p.author || _getSetting('engineerName') || 'Инженер',
                period: `с ${d} по ${d}`
            });
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
    window.exportPdfOnePagerV2 = exportPdfOnePagerV2;
    window.exportPdfGlobalOnePager = exportPdfGlobalOnePager;
    window.exportPdfGlobalOnePagerV2 = exportPdfGlobalOnePagerV2;
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
    window.collectRecurringDefectCards = collectRecurringDefectCards;
    window.openDefectRemediationPreview = openDefectRemediationPreview;
    window.closeDefectRemediationPreview = closeDefectRemediationPreview;
    window.toggleDefectRemediationCard = toggleDefectRemediationCard;
    window.cycleDefectRemediationPhoto = cycleDefectRemediationPhoto;
    window.confirmDefectRemediationExport = confirmDefectRemediationExport;
    window.exportPdfDefectRemediation = exportPdfDefectRemediation;
    window.runDefectRemediationAi = runDefectRemediationAi;
    window.uploadDefectRemediationPhoto = uploadDefectRemediationPhoto;
    window.onDefectRemediationPhotoClick = onDefectRemediationPhotoClick;
    window.renderReportFromTemplate = renderReportFromTemplate;
}

console.log('[ReportsActions] reports.actions.js loaded');
