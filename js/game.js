/* Файл: js/game.js (RBI Quality - Премиальная Геймификация + HR Аналитика) */

let gameActionLogs = []; 

// === ГРЕЙДЫ И ЦВЕТОВЫЕ ТИРЫ (РАНГИ) ===
const PI_GRADES = [
    { level: 1, name: "Grade I (Стажёр)", xpMin: 0, xpMax: 100, color: "from-slate-400 to-slate-500", ring: "ring-slate-400" },
    { level: 2, name: "Grade II (Инженер)", xpMin: 100, xpMax: 300, color: "from-slate-400 to-slate-500", ring: "ring-slate-400" },
    { level: 3, name: "Grade III (Старший инженер)", xpMin: 300, xpMax: 600, color: "from-amber-600 to-orange-500", ring: "ring-orange-500" },
    { level: 4, name: "Grade IV (Ведущий инженер)", xpMin: 600, xpMax: 1000, color: "from-amber-600 to-orange-500", ring: "ring-orange-500" },
    { level: 5, name: "Expert I (Эксперт)", xpMin: 1000, xpMax: 1500, color: "from-indigo-500 to-blue-500", ring: "ring-indigo-500" },
    { level: 6, name: "Expert II (Старший эксперт)", xpMin: 1500, xpMax: 2200, color: "from-indigo-500 to-blue-500", ring: "ring-indigo-500" },
    { level: 7, name: "Expert III (Главный эксперт)", xpMin: 2200, xpMax: 3000, color: "from-indigo-500 to-blue-500", ring: "ring-indigo-500" },
    { level: 8, name: "Master I (Мастер качества)", xpMin: 3000, xpMax: 4200, color: "from-yellow-400 to-yellow-600", ring: "ring-yellow-500" },
    { level: 9, name: "Master II (Аудитор)", xpMin: 4200, xpMax: 6000, color: "from-yellow-400 to-yellow-600", ring: "ring-yellow-500" },
    { level: 10, name: "Principal (Управляющий)", xpMin: 6000, xpMax: 999999, color: "from-rose-500 to-pink-600", ring: "ring-rose-500" }
];

// === СТРОГИЕ SVG-ИКОНКИ ДЛЯ ГРУПП НАВЫКОВ ===
const SKILL_ICONS = {
    "Партнёрство": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path></svg>`,
    "Оформление": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"></path></svg>`,
    "Обучение": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"></path></svg>`,
    "Объективность": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>`,
    "Охват": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>`,
    "Редкие": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path></svg>`
};

// === КОМПЕТЕНЦИИ (АЧИВКИ) ===
const COMPETENCIES = [
    { id: "win_win", group: "Партнёрство", name: "Win-Win", desc: "Подрядчик перешёл из красной/жёлтой зоны в зелёную (>85%) после ваших 3+ проверок.", maxProgress: 1 },
    { id: "champ_coach", group: "Партнёрство", name: "Тренер", desc: "Два разных подрядчика улучшили рейтинг на 15+ пунктов.", maxProgress: 2 },
    { id: "reanimator", group: "Партнёрство", name: "Кризис-менеджер", desc: "Подрядчик поднялся из красной зоны (<50%) в допустимую (>70%).", maxProgress: 1 },
    { id: "chron_ideal", group: "Оформление", name: "Летописец", desc: "10 идеальных проверок (100%) с фотофиксацией эталонов.", maxProgress: 10 },
    { id: "strategist", group: "Оформление", name: "Аналитик", desc: "Отредактировано и скопировано 5 ИИ-заключений.", maxProgress: 5 },
    { id: "detective", group: "Оформление", name: "Доказательная база", desc: "10 проверок, где ВСЕ дефекты имеют фото и указанную причину.", maxProgress: 10 },
    { id: "meticulous", group: "Оформление", name: "Скрупулёзность", desc: "30 проверок подряд со 100% заполнением всех пунктов чек-листа.", maxProgress: 30 },
    { id: "mentor", group: "Обучение", name: "Наставничество", desc: "Открыта TWI-карта во время инспекции 10 раз.", maxProgress: 10 },
    { id: "methodist", group: "Обучение", name: "Методолог", desc: "Создана собственная TWI-карта.", maxProgress: 1 },
    { id: "bestseller", group: "Обучение", name: "Внедрение стандартов", desc: "Ваша TWI-карта открыта другими инженерами 10+ раз.", maxProgress: 10 },
    { id: "communicator", group: "Обучение", name: "Коммуникация", desc: "Оставлено 20 развернутых комментариев к дефектам.", maxProgress: 20 },
    { id: "impartial", group: "Объективность", name: "Беспристрастность", desc: "Индекс строгости в пределах нормы на 50 проверках.", maxProgress: 50 },
    { id: "stable_eng", group: "Объективность", name: "Стабильность", desc: "20 проверок подряд со стандартным отклонением оценки < 10%.", maxProgress: 20 },
    { id: "reliable", group: "Объективность", name: "Надёжность", desc: "Непрерывная активность 8 недель подряд.", maxProgress: 8 },
    { id: "iron_will", group: "Объективность", name: "Системность", desc: "Непрерывная активность 16 недель подряд.", maxProgress: 16 },
    { id: "universal", group: "Охват", name: "Универсальность", desc: "Проверки по 7 различным видам работ.", maxProgress: 7 },
    { id: "pathfinder", group: "Охват", name: "Полевой аудит", desc: "Проверки в 15 различных локациях.", maxProgress: 15 },
    { id: "know_all", group: "Охват", name: "Глубокий охват", desc: "Проведены проверки по всем активным видам работ.", maxProgress: 1 },
    { id: "perfection", group: "Редкие", name: "Внимание к деталям", desc: "Оценка 100%, но честно зафиксирован 1 мелкий дефект (B1).", maxProgress: 1 },
    { id: "quality_guru", group: "Редкие", name: "Аудитор качества", desc: "Собраны: Win-Win, Аналитик, Наставничество, Беспристрастность.", maxProgress: 4 },
    { id: "crisis_man", group: "Редкие", name: "Управление рисками", desc: "Снижен ИКО объекта с опасного до нормы.", maxProgress: 1 },
    { id: "magic_creator", group: "Обучение", name: "Магистр TWI", desc: "Создано 5 TWI-карт с использованием функции Магия TWI (фото с объекта).", maxProgress: 5 }
];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const storedLogs = await dbGet(STORES.SETTINGS, 'game_action_logs');
        if (storedLogs && storedLogs.data) gameActionLogs = storedLogs.data;
    } catch (e) { console.error("Ошибка загрузки логов HR-метрик", e); }
});

async function gameSaveLogs() {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return;
    try { await dbPut(STORES.SETTINGS, { key: 'game_action_logs', data: gameActionLogs }); } 
    catch (e) { console.error("Ошибка сохранения логов", e); }
}

window.gameLogAction = function(actionType, targetId = null) {
    const currentInspector = document.getElementById('inp-inspector')?.value.trim() || 'Неизвестный инспектор';
    if (!currentInspector) return; 
    
    if (actionType === 'ai_generate') {
        const today = new Date().toDateString();
        const hasToday = gameActionLogs.some(l => l.action === 'ai_generate' && l.inspector === currentInspector && new Date(l.date).toDateString() === today);
        if (hasToday) return; 
    }

    gameActionLogs.push({ id: Date.now().toString(36), date: new Date().toISOString(), inspector: currentInspector, action: actionType, target: targetId });
    gameSaveLogs();
    
    if (document.getElementById('sub-engineer-rating') && !document.getElementById('sub-engineer-rating').classList.contains('hidden')) {
        gameRenderDashboard();
    }
}

// === ВЫЧИСЛИТЕЛЬНОЕ ЯДРО ===
function gameCalculateAllProfiles() {
    let profiles = {};
    
    contractorArray.forEach(check => {
        const name = check.inspectorName || 'Не указан';
        if (!profiles[name]) {
            profiles[name] = { 
                name: name, pi: 0, checksCount: 0, 
                locations: new Set(), templates: new Set(),
                monthlyPI: {}, weeksActive: new Set(),
                badgesData: {}, rawChecks: [], objectName: check.projectName
            };
            COMPETENCIES.forEach(b => profiles[name].badgesData[b.id] = 0);
        }
        profiles[name].rawChecks.push(check);
        profiles[name].locations.add(check.location);
        profiles[name].templates.add(check.templateKey);
        
        const d = new Date(check.date);
        const wYear = d.getFullYear();
        const wNum = Math.ceil((((d - new Date(wYear,0,1))/86400000)+1)/7);
        profiles[name].weeksActive.add(`${wYear}-${wNum}`);
    });

    gameActionLogs.forEach(log => {
        const name = log.inspector;
        if (!profiles[name]) {
            profiles[name] = { name: name, pi: 0, checksCount: 0, locations: new Set(), templates: new Set(), monthlyPI: {}, weeksActive: new Set(), badgesData: {}, rawChecks: [], objectName: "Справочник" };
            COMPETENCIES.forEach(b => profiles[name].badgesData[b.id] = 0);
        }
    });

    for (let name in profiles) {
        let p = profiles[name];
        p.rawChecks.sort((a, b) => new Date(a.date) - new Date(b.date));
        let continuous100 = 0;

        p.rawChecks.forEach(check => {
            p.checksCount++;
            let earnedPI = 0;
            const m = check.metrics;
            const dStr = new Date(check.date).toLocaleString('ru-RU', {month:'short', year:'2-digit'});
            if(!p.monthlyPI[dStr]) p.monthlyPI[dStr] = 0;

            earnedPI += 20;

            if (check.isCompleted) { earnedPI += 10; continuous100++; } 
            else { continuous100 = 0; }

            let hasFails = false; let allFailsDocumented = true;
            if (check.state) {
                Object.keys(check.state).forEach(id => {
                    if (check.state[id] === 'fail' || check.state[id] === 'fail_escalated') {
                        hasFails = true;
                        const hasPhoto = check.photos && check.photos[id];
                        const hasCause = check.details && check.details[id] && check.details[id].causeCode;
                        if (!hasPhoto || !hasCause) allFailsDocumented = false;
                    }
                });
            }
            if (hasFails && allFailsDocumented) { earnedPI += 15; p.badgesData['detective']++; }

            const hasAnyPhoto = check.photos && Object.keys(check.photos).length > 0;
            if (m && m.final === 100 && hasAnyPhoto) { earnedPI += 25; p.badgesData['chron_ideal']++; }
            if (m && m.final === 100 && m.n_B1_fail > 0) { p.badgesData['perfection'] = 1; }

            p.badgesData['universal'] = p.templates.size;
            p.badgesData['pathfinder'] = p.locations.size;

            p.pi += earnedPI;
            p.monthlyPI[dStr] += earnedPI;
        });

        if (continuous100 >= 30) p.badgesData['meticulous'] = 30;
        else p.badgesData['meticulous'] = continuous100;

        p.currentStreak = 0;
        const sortedWeeks = Array.from(p.weeksActive).sort();
        if (sortedWeeks.length > 0) {
            p.currentStreak = 1;
            for(let i = sortedWeeks.length - 1; i > 0; i--) {
                const wCurr = parseInt(sortedWeeks[i].split('-')[1]);
                const wPrev = parseInt(sortedWeeks[i-1].split('-')[1]);
                if (wCurr - wPrev === 1 || (wCurr === 1 && wPrev >= 52)) p.currentStreak++;
                else break;
            }
        }
        if (p.currentStreak >= 8) p.badgesData['reliable'] = 8;
        if (p.currentStreak >= 16) p.badgesData['iron_will'] = 16;
    }

    gameActionLogs.forEach(log => {
        const p = profiles[log.inspector];
        if (!p) return;
        const dStr = new Date(log.date).toLocaleString('ru-RU', {month:'short', year:'2-digit'});
        if(!p.monthlyPI[dStr]) p.monthlyPI[dStr] = 0;

        if (log.action === 'ai_generate' || log.action === 'ai_copy') { p.pi += 30; p.monthlyPI[dStr] += 30; p.badgesData['strategist']++; }
        if (log.action === 'open_twi') { p.pi += 15; p.monthlyPI[dStr] += 15; p.badgesData['mentor']++; }
        if (log.action === 'create_twi') { p.pi += 100; p.monthlyPI[dStr] += 100; p.badgesData['methodist'] = 1; }
        if (log.action === 'comment_written') { p.badgesData['communicator']++; }
    });

    for (let name in profiles) {
        let p = profiles[name];
        p.levelObj = PI_GRADES[0];
        for (let i = 0; i < PI_GRADES.length; i++) {
            if (p.pi >= PI_GRADES[i].xpMin) p.levelObj = PI_GRADES[i];
        }
        p.earnedBadges = [];
        COMPETENCIES.forEach(b => { if (p.badgesData[b.id] >= b.maxProgress) p.earnedBadges.push(b); });
        
        p.radarData = {};
        const groupTotals = {}; const groupEarned = {};
        COMPETENCIES.forEach(b => {
            if(!groupTotals[b.group]) { groupTotals[b.group] = 0; groupEarned[b.group] = 0; }
            groupTotals[b.group] += b.maxProgress;
            groupEarned[b.group] += Math.min(p.badgesData[b.id] || 0, b.maxProgress);
        });
        for (let g in groupTotals) {
            p.radarData[g] = Math.round((groupEarned[g] / groupTotals[g]) * 100);
        }
    }

    return profiles;
}

// === УМНЫЕ КВЕСТЫ (МИССИИ) ===
function getSmartQuest(profile) {
    let closestBadge = null;
    let maxRatio = -1;

    COMPETENCIES.forEach(b => {
        const progress = profile.badgesData[b.id] || 0;
        if (progress > 0 && progress < b.maxProgress) {
            const ratio = progress / b.maxProgress;
            if (ratio > maxRatio) { maxRatio = ratio; closestBadge = b; }
        }
    });

    if (closestBadge) {
        return `<div class="font-black text-indigo-900 dark:text-indigo-200 mb-1 leading-tight">Прокачайте навык «${closestBadge.name}» (Выполнено на ${Math.round(maxRatio*100)}%)</div>
                <div class="text-[10px] text-indigo-700 dark:text-indigo-400"><b>Цель:</b> ${closestBadge.desc}</div>`;
    } else {
        return `<div class="font-black text-indigo-900 dark:text-indigo-200 mb-1 leading-tight">Ваш профиль сбалансирован</div>
                <div class="text-[10px] text-indigo-700 dark:text-indigo-400">Продолжайте проводить эталонные инспекции и использовать TWI для роста PI.</div>`;
    }
}

// === НЕДЕЛЬНОЕ ПЛАНИРОВАНИЕ, СТАТУСЫ И ОТПУСКА ===

let weeklyPlanData = { weekId: null, tasks: [], completed: false };
let engineerAbsence = { isActive: false, reason: 'Отпуск', startDate: null, endDate: null };
let contractorStatuses = {}; // Объект для хранения статусов (active, paused, completed)

function getWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

function getStartOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay() || 7; 
    if (day !== 1) d.setHours(-24 * (day - 1));
    d.setHours(0,0,0,0);
    return d;
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const storedPlan = await dbGet(STORES.SETTINGS, 'weekly_plan_data');
        if (storedPlan && storedPlan.data) weeklyPlanData = storedPlan.data;
        
        const storedAbsence = await dbGet(STORES.SETTINGS, 'engineer_absence');
        if (storedAbsence && storedAbsence.data) engineerAbsence = storedAbsence.data;

        const storedStatuses = await dbGet(STORES.SETTINGS, 'contractor_statuses');
        if (storedStatuses && storedStatuses.data) contractorStatuses = storedStatuses.data;
    } catch (e) { console.error("Ошибка загрузки модуля планирования", e); }
});

async function saveWeeklyPlan() {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return; 
    try { 
        await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData }); 
        await dbPut(STORES.SETTINGS, { key: 'engineer_absence', data: engineerAbsence });
        await dbPut(STORES.SETTINGS, { key: 'contractor_statuses', data: contractorStatuses });
    } catch (e) { console.error("Ошибка сохранения плана", e); }
}

function calculateImpactScore(inspector, contractor, template) {
    const checks = contractorArray.filter(c => c.inspectorName === inspector && c.contractorName === contractor && c.templateKey === template).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (checks.length < 6) return { score: 0, trend: 'Недостаточно данных', color: 'text-slate-500' };

    const baseChecks = checks.slice(0, 3);
    const currentChecks = checks.slice(-3);

    const baseMetrics = getContractorMetrics(baseChecks, userTemplates);
    const currMetrics = getContractorMetrics(currentChecks, userTemplates);

    if (!baseMetrics || !currMetrics) return { score: 0, trend: 'Ошибка расчета', color: 'text-slate-500' };

    let deltaUrk = Math.max(-1, Math.min(1, (currMetrics.finalC - baseMetrics.finalC) / 100)); 
    let deltaStab = Math.max(-1, Math.min(1, (currMetrics.stabilityIndex - baseMetrics.stabilityIndex) / 100)); 
    let deltaB3 = (baseMetrics.n_изделий_с_B3 > 0 ? 1 : 0) - (currMetrics.n_изделий_с_B3 > 0 ? 1 : 0);

    const impactScore = (deltaUrk * 0.5) + (deltaStab * 0.3) + (deltaB3 * 0.2);

    let trend = "Стабильно"; let color = "text-slate-500";
    if (impactScore > 0.2) { trend = "Улучшение"; color = "text-green-600"; }
    else if (impactScore < -0.2) { trend = "Ухудшение"; color = "text-red-600"; }

    return { score: impactScore, trend, color, baseUrk: baseMetrics.finalC, currUrk: currMetrics.finalC };
}

window.gameGenerateWeeklyPlan = function(force = false) {
    const currentInspector = document.getElementById('inp-inspector')?.value.trim();
    if (!currentInspector) return;

    const currentWeekId = getWeekId();
    if (weeklyPlanData.weekId === currentWeekId && !force) {
        gameUpdatePlanProgress();
        return;
    }

    if (engineerAbsence.isActive) return;

    const oldPlan = weeklyPlanData.tasks || [];
    let newTasks = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentChecks = contractorArray.filter(c => new Date(c.date) >= thirtyDaysAgo);

    // Группируем по уникальным связкам
    const pairMap = {};
    recentChecks.forEach(c => {
        const type = c.templateKey.split('_')[0];
        const key = c.templateKey.replace(type + '_', '');
        const templateObj = type === 'sys' ? SYSTEM_TEMPLATES[key] : userTemplates[key];
        const freq = templateObj?.checkFrequency || 'continuous';
        const instanceId = c.instanceId || 'default';
        const statusKey = `${c.projectName}::${c.contractorName}::${c.templateKey}::${instanceId}`;

        if (!pairMap[statusKey]) {
            pairMap[statusKey] = {
                statusKey: statusKey,
                project: c.projectName,
                contractor: c.contractorName,
                templateKey: c.templateKey,
                templateTitle: c.templateTitle,
                frequency: freq,
                instanceId: instanceId,
                totalStages: templateObj?.groups ? templateObj.groups.length : 1,
                checks: [],
                allChecksCount: contractorArray.filter(hist => 
                    hist.projectName === c.projectName && 
                    hist.contractorName === c.contractorName && 
                    hist.templateKey === c.templateKey
                ).length
            };
        }
        pairMap[statusKey].checks.push(c);
    });

    for (let key in pairMap) {
        const pair = pairMap[key];
        
        // 1. Инициализация статуса в БД, если его нет
        if (!contractorStatuses[key]) {
            contractorStatuses[key] = {
                status: "active",
                progress: { done: 0, target: 1, deficit: 0, carryOverCount: 0 },
                milestoneProgress: { completedStages: [], totalStages: pair.totalStages },
                etalonCompleted: pair.allChecksCount >= 3, // Если больше 3 проверок - эталон не нужен
                lastUpdate: new Date().toISOString()
            };
        }

        const st = contractorStatuses[key];
        if (st.status === 'paused' || st.status === 'completed') continue; // Пропускаем

        // 2. Требование эталона
        let needsEtalon = false;
        if (pair.allChecksCount < 3 && !st.etalonCompleted) {
            needsEtalon = true;
        }

        // 3. Формирование задачи (Continuous vs Milestone)
        if (pair.frequency === 'continuous') {
            let priority = "Низкий"; let priorityLvl = 1; let target = 1;
            let hasB3InLast = false;

            if (pair.allChecksCount < 3) {
                priority = "Новый"; priorityLvl = 3; target = 7;
            } else {
                const m = getContractorMetrics(pair.checks, userTemplates);
                if (m) {
                    const lastCheck = pair.checks.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                    hasB3InLast = lastCheck.metrics && lastCheck.metrics.n_B3_fail > 0;
                    if (m.finalC < 70 || m.rateB3 >= 20 || m.stabilityIndex < 40) { priority = "Критичный"; priorityLvl = 4; target = 5; } 
                    else if (m.finalC <= 84 || m.rateB3 >= 5 || m.stabilityIndex < 60) { priority = "Средний"; priorityLvl = 2; target = 2; }
                }
            }

            if (hasB3InLast && priority !== "Новый") {
                target = Math.min(target * 2, 7);
                priority = "Критичный (Недавний B3)"; priorityLvl = 4;
            }

            const oldTask = oldPlan.find(t => t.statusKey === key);
            let deficit = 0; let carryOverCount = 0;
            
            if (oldTask && oldTask.done < oldTask.target && !needsEtalon) {
                deficit = oldTask.target - oldTask.done;
                carryOverCount = oldTask.carryOverCount ? oldTask.carryOverCount + 1 : 1;
                target = Math.min(target + deficit, 7); 
                
                if (priorityLvl < 4) {
                    priorityLvl++;
                    if (priorityLvl === 2) priority = "Средний (Долг)";
                    if (priorityLvl === 3) priority = "Высокий (Долг)";
                    if (priorityLvl === 4) priority = "Критичный (Долг)";
                }
            }

            newTasks.push({
                id: 'task_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                statusKey: key, type: 'continuous',
                contractor: pair.contractor, project: pair.project, templateKey: pair.templateKey, templateTitle: pair.templateTitle,
                priority: priority, priorityLvl: priorityLvl, target: target, done: 0,
                deficit: deficit, carryOverCount: carryOverCount, needsEtalon: needsEtalon
            });
        } 
        else if (pair.frequency === 'milestone') {
            // Milestone (Поэтапный контроль)
            const completedLen = st.milestoneProgress.completedStages ? st.milestoneProgress.completedStages.length : 0;
            const tTotal = st.milestoneProgress.totalStages || pair.totalStages;

            if (completedLen < tTotal) {
                newTasks.push({
                    id: 'task_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    statusKey: key, type: 'milestone',
                    contractor: pair.contractor, project: pair.project, templateKey: pair.templateKey, templateTitle: pair.templateTitle,
                    priority: "Поэтапный", priorityLvl: 2, 
                    target: tTotal, done: completedLen,
                    needsEtalon: needsEtalon
                });
            } else {
                // Если все этапы завершены, закрываем статус автоматически
                st.status = 'completed';
            }
        }
    }

    newTasks.sort((a, b) => b.priorityLvl - a.priorityLvl);
    weeklyPlanData = { weekId: currentWeekId, tasks: newTasks, completed: false };
    
    saveWeeklyPlan();
    gameUpdatePlanProgress();
};

window.gameUpdatePlanProgress = function() {
    const currentInspector = document.getElementById('inp-inspector')?.value.trim();
    if (!currentInspector || !weeklyPlanData.tasks) return;

    const startOfThisWeek = getStartOfWeek();
    const myWeeklyChecks = contractorArray.filter(c => c.inspectorName === currentInspector && new Date(c.date) >= startOfThisWeek);
    let allTasksDone = true;

    weeklyPlanData.tasks.forEach(task => {
        // Игнорируем прогресс, если требуется эталон
        if (task.needsEtalon) {
            allTasksDone = false;
            return;
        }

        const matchedChecks = myWeeklyChecks.filter(c => c.contractorName === task.contractor && c.templateKey === task.templateKey);
        
        if (task.type === 'continuous') {
            let validChecksCount = 0; let sumFillRate = 0; let totalFails = 0; let failsWithPhotoOrComment = 0;

            matchedChecks.forEach(c => {
                if (c.metrics && c.metrics.checkedCount >= 3) {
                    validChecksCount++;
                    sumFillRate += (c.metrics.checkedCount / c.metrics.totalCount) * 100;
                    
                    if (c.state) {
                        Object.keys(c.state).forEach(id => {
                            if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                                totalFails++;
                                if ((c.photos && c.photos[id]) || (c.details && c.details[id] && c.details[id].comment)) failsWithPhotoOrComment++;
                            }
                        });
                    }
                }
            });

            task.done = validChecksCount;
            task.fillRate = validChecksCount > 0 ? (sumFillRate / validChecksCount) : 0;
            task.photoRate = totalFails > 0 ? (failsWithPhotoOrComment / totalFails) * 100 : 100;

            if (task.done < task.target) allTasksDone = false;
            
            // Бонус за перевыполнение критичной задачи
            if (task.priorityLvl === 4 && task.done > task.target) {
                const overCheck = matchedChecks[validChecksCount - 1]; 
                if (!gameActionLogs.find(l => l.action === 'overfulfill_bonus' && l.target === overCheck.id)) {
                    gameActionLogs.push({ id: Date.now().toString(36), date: new Date().toISOString(), inspector: currentInspector, action: 'overfulfill_bonus', target: overCheck.id });
                }
            }
            
        } else if (task.type === 'milestone') {
            // Для milestone мы обновляем completedStages
            const st = contractorStatuses[task.statusKey];
            if (st && st.milestoneProgress) {
                matchedChecks.forEach(c => {
                    if (c.checkedStagesInfo) {
                        c.checkedStagesInfo.forEach(stageName => {
                            if (!st.milestoneProgress.completedStages.includes(stageName)) {
                                st.milestoneProgress.completedStages.push(stageName);
                            }
                        });
                    }
                });
                task.done = st.milestoneProgress.completedStages.length;
                task.target = st.milestoneProgress.totalStages;
                if (task.done < task.target) allTasksDone = false;
                else st.status = 'completed'; // Закрываем, если всё пройдено
            }
        }
    });

    if (allTasksDone && weeklyPlanData.tasks.length > 0 && !weeklyPlanData.completed) {
        weeklyPlanData.completed = true;
        gameActionLogs.push({ id: Date.now().toString(36), date: new Date().toISOString(), inspector: currentInspector, action: 'plan_completed', target: weeklyPlanData.weekId });
    }

    saveWeeklyPlan();
};

// Вспомогательная модалка для отпуска
function injectAbsenceModal() {
    if (document.getElementById('absence-modal-overlay')) return;
    const html = `
    <div id="absence-modal-overlay" class="fixed inset-0 bg-slate-900/80 z-[4000] hidden items-center justify-center p-4 backdrop-blur-sm" onclick="this.style.display='none'">
        <div class="bg-[var(--card-bg)] w-full max-w-sm p-6 rounded-2xl shadow-2xl transition-transform border border-[var(--card-border)]" onclick="event.stopPropagation()">
            <div class="font-black text-[14px] uppercase tracking-tight mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                <span class="text-xl">🌴</span> Управление статусом
            </div>
            
            <div class="space-y-4 mb-6">
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Причина отсутствия</label>
                    <select id="abs-reason" class="input-base">
                        <option value="Отпуск">Отпуск</option>
                        <option value="Больничный">Больничный</option>
                        <option value="Командировка">Командировка</option>
                        <option value="Отгул">Отгул / Иное</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Начало</label>
                        <input type="date" id="abs-start" class="input-base text-[12px] !py-2">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Окончание</label>
                        <input type="date" id="abs-end" class="input-base text-[12px] !py-2">
                    </div>
                </div>
            </div>
            
            <div class="flex gap-2">
                <button onclick="document.getElementById('absence-modal-overlay').style.display='none'" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 border border-slate-200 dark:border-slate-700">Отмена</button>
                <button onclick="saveAbsencePeriod()" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-[11px] uppercase shadow-md active:scale-95">Применить</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

window.gameToggleAbsence = function() {
    if (engineerAbsence.isActive) {
        if(confirm("Прервать период отсутствия и вернуться к работе? План будет пересчитан.")) {
            engineerAbsence.isActive = false; engineerAbsence.endDate = null; saveWeeklyPlan();
            gameGenerateWeeklyPlan(true); gameRenderDashboard();
        }
    } else {
        injectAbsenceModal();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('abs-start').value = today;
        document.getElementById('abs-end').value = today;
        document.getElementById('absence-modal-overlay').style.display = 'flex';
    }
};

window.saveAbsencePeriod = function() {
    const reason = document.getElementById('abs-reason').value;
    const start = document.getElementById('abs-start').value;
    const end = document.getElementById('abs-end').value;

    if (!start || !end) return showToast("Укажите даты!");
    if (new Date(end) < new Date(start)) return showToast("Дата окончания не может быть раньше начала!");

    engineerAbsence.isActive = true; engineerAbsence.reason = reason; engineerAbsence.startDate = start;
    const endDateObj = new Date(end); endDateObj.setHours(23, 59, 59, 999); engineerAbsence.endDate = endDateObj.toISOString();

    saveWeeklyPlan();
    document.getElementById('absence-modal-overlay').style.display = 'none';
    showToast("Статус обновлен. План приостановлен.");
    gameRenderDashboard();
};

window.checkAutoExpireAbsence = function() {
    if (engineerAbsence.isActive && engineerAbsence.endDate && new Date() > new Date(engineerAbsence.endDate)) {
        engineerAbsence.isActive = false; engineerAbsence.endDate = null; saveWeeklyPlan();
        gameGenerateWeeklyPlan(true); showToast("С возвращением! План работы возобновлен.");
    }
};

window.gameForceUpdatePlan = function() {
    if(confirm("Принудительно пересчитать план на эту неделю на основе свежих рисков по объекту?")) {
        gameGenerateWeeklyPlan(true); showToast("План успешно пересчитан!"); gameRenderDashboard();
    }
};

window.gameStartTask = function(contractor, templateKey) {
    // 1. Заполняем Подрядчика
    const contrInput = document.getElementById('inp-contractor');
    if (contrInput) { 
        contrInput.value = contractor; 
        contrInput.dispatchEvent(new Event('input')); 
    }
    
    // 2. Ищем последний Объект этого подрядчика в истории и подставляем
    const pastCheck = contractorArray.find(c => c.contractorName === contractor && c.templateKey === templateKey);
    if (pastCheck) {
        const projInput = document.getElementById('inp-project');
        if (projInput && !projInput.value) {
            projInput.value = pastCheck.projectName;
            projInput.dispatchEvent(new Event('input')); 
        }
    }
    
    // 3. Очищаем локацию для новой проверки
    const locInput = document.getElementById('inp-location');
    if (locInput) locInput.value = '';

    // 4. Меняем чек-лист
    const selectEl = document.getElementById('checklist-selector');
    if (selectEl) selectEl.value = templateKey;
    
    // 5. Переходим на вкладку
    switchTab('tab-audit'); 
    changeTemplate(templateKey);
    
    // Принудительно обновляем названия в шапке
    setTimeout(() => {
        updateDataSummary();
        window.scrollTo({top: 0, behavior: 'smooth'});
        showToast("📝 Задача загружена. Данные заполнены!");
    }, 150);
};

// === РЕНДЕР ДАШБОРДА ===
let currentGameTab = 'profile';

window.switchGameTab = function(tabId) {
    currentGameTab = tabId;
    ['game-tab-profile', 'game-tab-tasks', 'game-tab-stats'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['btn-g-profile', 'btn-g-tasks', 'btn-g-stats'].forEach(id => document.getElementById(id).className = "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg text-slate-500 hover:text-slate-700 transition-all");
    
    document.getElementById(`game-tab-${tabId}`).classList.remove('hidden');
    document.getElementById(`btn-g-${tabId}`).className = "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-600 transition-all";

    if (tabId === 'profile') renderRadarChart();
    if (tabId === 'stats') renderStatsCharts();
};

window.gameRenderDashboard = function() {
    const container = document.getElementById('game-dashboard-container');
    if (!container) return;

    checkAutoExpireAbsence(); 
    if (typeof gameGenerateWeeklyPlan === 'function') gameGenerateWeeklyPlan();

    const currentInspector = document.getElementById('inp-inspector')?.value.trim() || 'Неизвестный инспектор';
    const profiles = gameCalculateAllProfiles();
    window.currentProfileData = profiles[currentInspector] || { 
        name: currentInspector, pi: 0, checksCount: 0, currentStreak: 0, 
        levelObj: PI_GRADES[0], earnedBadges: [], badgesData: {}, monthlyPI: {}, rawChecks: [], radarData: { "Оформление": 0, "Обучение": 0, "Объективность": 0, "Охват": 0, "Партнёрство": 0 }
    };
    window.allProfilesData = profiles;

    const myProfile = window.currentProfileData;
    const piProgress = myProfile.pi >= myProfile.levelObj.xpMax ? 100 : ((myProfile.pi - myProfile.levelObj.xpMin) / (myProfile.levelObj.xpMax - myProfile.levelObj.xpMin)) * 100;

    let html = `
        <div class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-inner flex gap-1 mb-4 mx-1">
            <button id="btn-g-profile" onclick="switchGameTab('profile')" class="flex-1 py-2 text-[10px] font-bold uppercase rounded-lg bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-600 transition-all">🏅 Профиль</button>
            <button id="btn-g-tasks" onclick="switchGameTab('tasks')" class="flex-1 py-2 text-[10px] font-bold uppercase rounded-lg text-slate-500 hover:text-slate-700 transition-all">📋 Задачи</button>
            <button id="btn-g-stats" onclick="switchGameTab('stats')" class="flex-1 py-2 text-[10px] font-bold uppercase rounded-lg text-slate-500 hover:text-slate-700 transition-all">📈 Рейтинг</button>
        </div>

        <!-- ПРОФИЛЬ -->
        <div id="game-tab-profile" class="hidden">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm mb-4 mx-1 relative overflow-hidden">
                <div class="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${myProfile.levelObj.color} opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                <div class="absolute top-0 right-0 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-b border-l border-slate-700 text-[9px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                    <svg class="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a7.5 7.5 0 01-5.892 5.892l-1.192.24a1 1 0 000 1.96l1.192.24a7.5 7.5 0 015.892 5.892l.24 1.192a1 1 0 001.96 0l.24-1.192a7.5 7.5 0 015.892-5.892l1.192-.24a1 1 0 000-1.96l-1.192-.24a7.5 7.5 0 01-5.892-5.892l-.24-1.192z"></path></svg>
                    СТРИК: ${myProfile.currentStreak} НЕД.
                </div>
                
                <div class="flex items-center gap-4 mb-4 mt-3 relative z-10">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${myProfile.levelObj.color} text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-lg border-2 border-white dark:border-slate-800 ring-2 ${myProfile.levelObj.ring} ring-offset-2 dark:ring-offset-slate-900">
                        ${myProfile.name.substring(0,1).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[16px] font-black text-slate-800 dark:text-white truncate leading-tight mb-0.5">${myProfile.name}</div>
                        <div class="text-[10px] font-bold bg-clip-text text-transparent bg-gradient-to-r ${myProfile.levelObj.color} uppercase tracking-widest mb-1.5">${myProfile.levelObj.name}</div>
                        
                        <div class="flex justify-between text-[9px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                            <span class="text-slate-800 dark:text-white font-black">${myProfile.pi} XP</span>
                            <span>ЦЕЛЬ: ${myProfile.levelObj.xpMax}</span>
                        </div>
                        
                        <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-inner">
                            <div class="h-full bg-gradient-to-r ${myProfile.levelObj.color} transition-all duration-1000 relative" style="width: ${piProgress}%">
                                <div class="absolute inset-0 bg-white/20 w-full h-full" style="background-image: linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent); background-size: 1rem 1rem;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 mb-4 mx-1">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm p-4 sm:w-1/2 flex flex-col justify-center">
                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">Активный Квест</div>
                    ${getSmartQuest(myProfile)}
                </div>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm p-3 sm:w-1/2 h-[180px] relative flex justify-center items-center">
                    <canvas id="pi-radar-chart"></canvas>
                </div>
            </div>

            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm mx-1 p-4 mb-8">
                <div class="font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2 flex justify-between items-center">
                    <span>Достижения</span>
                    <span class="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 shadow-sm">${myProfile.earnedBadges.length} / ${COMPETENCIES.length}</span>
                </div>
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
    `;

    COMPETENCIES.forEach(badge => {
        const progress = myProfile.badgesData[badge.id] || 0;
        const isEarned = progress >= badge.maxProgress;
        const iconSvg = SKILL_ICONS[badge.group] || SKILL_ICONS["Редкие"];
        const styleClass = isEarned ? "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md border-indigo-400/50" : "bg-[var(--hover-bg)] border-[var(--card-border)] opacity-50 grayscale";
        
        html += `
            <div class="border rounded-xl p-2 flex flex-col items-center text-center ${styleClass} cursor-pointer active:scale-95 transition-transform" onclick="gameShowBadgeInfo('${badge.id}', ${progress})">
                <div class="mb-1 ${isEarned?'text-white drop-shadow-md':'text-slate-400'} w-5 h-5">${iconSvg}</div>
                <div class="font-bold text-[7px] uppercase leading-tight ${isEarned?'text-indigo-100':'text-slate-500'} line-clamp-2 h-5 flex items-center">${badge.name}</div>
            </div>
        `;
    });

    html += `</div></div></div>`; 

    // --- ПЛАН И ЗАДАЧИ ---
    html += `<div id="game-tab-tasks" class="hidden">`;

    let absenceText = 'Активен (План работает)';
    if (engineerAbsence.isActive) {
        html += `<div class="text-center py-6 text-amber-600 font-bold text-[11px] bg-amber-50/50 rounded-xl border border-dashed border-amber-200 uppercase">План приостановлен</div>`;
    } else if (!weeklyPlanData.tasks || weeklyPlanData.tasks.length === 0) {
        html += `<div class="text-center py-6 text-slate-500 font-bold text-[11px] bg-white rounded-xl border border-dashed border-slate-200 uppercase">Все задачи завершены или приостановлены</div>`;
    } else {
        weeklyPlanData.tasks.forEach(t => {
            const progressPerc = Math.min((t.done / t.target) * 100, 100);
            const isDone = t.done >= t.target;
            let badgeClass = t.priorityLvl === 4 ? 'text-red-600 bg-red-50 border-red-200' : (t.priorityLvl >= 2 ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-slate-500 bg-slate-100 border-slate-200');
            
            // НОВОЕ: Индикаторы Эталона и Milestone
            let etalonBadge = t.needsEtalon ? `<span class="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border bg-blue-100 text-blue-700">📌 Требуется Эталон</span>` : '';
            let milestoneBadge = t.type === 'milestone' ? `<span class="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border bg-purple-100 text-purple-700">🏁 Поэтапно</span>` : '';

            // НОВОЕ: Контекстное меню (Троеточие) для статуса
            html += `
            <div class="border border-[var(--card-border)] rounded-xl p-2.5 bg-white dark:bg-slate-800 shadow-sm relative group cursor-pointer active:scale-[0.98] transition-transform" onclick="gameStartTask('${t.contractor.replace(/'/g, "\\'")}', '${t.templateKey}')">
                <div class="absolute top-2 right-2 flex items-center gap-2">
                    <div class="text-[10px] font-black text-slate-500 ${isDone?'text-green-500':''}">${t.done}/${t.target}</div>
                    <button onclick="gameOpenTaskMenu('${t.statusKey}', event)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 font-black rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">⋮</button>
                </div>
                <div class="text-[12px] font-black text-slate-800 dark:text-white truncate pr-16">${t.contractor}</div>
                <div class="text-[9px] font-bold text-slate-500 truncate mb-1.5">${t.templateTitle} [${t.project}]</div>
                <div class="flex gap-1.5 items-center mb-1.5 flex-wrap">
                    <span class="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${badgeClass}">${t.priority}</span>
                    ${milestoneBadge}
                    ${etalonBadge}
                    ${t.carryOverCount > 0 && !t.needsEtalon ? `<span class="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border bg-red-100 text-red-700">⚠️ Долг</span>` : ''}
                </div>
                <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div class="h-full ${isDone ? 'bg-green-500' : 'bg-indigo-500'}" style="width: ${progressPerc}%"></div>
                </div>
            </div>`;
        });
    }
    html += `</div></div></div>`;

    // --- РЕЙТИНГ ---
    html += `<div id="game-tab-stats" class="hidden">`;
    
    let totalImpact = 0; let impactCount = 0; let impactHtmlList = '';
    const contractorsSet = new Set(myProfile.rawChecks.map(c => c.contractorName));
    contractorsSet.forEach(cName => {
        const cChecks = myProfile.rawChecks.filter(c => c.contractorName === cName);
        if (cChecks.length < 6) return; 
        const templatesCount = {}; cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey]||0)+1);
        const topTemplate = Object.keys(templatesCount).sort((a,b) => templatesCount[b] - templatesCount[a])[0];
        const impact = calculateImpactScore(currentInspector, cName, topTemplate);
        if (impact.score !== 0 || impact.trend !== 'Недостаточно данных') {
            totalImpact += impact.score; impactCount++;
            const trendIcon = impact.score > 0.2 ? '📈' : (impact.score < -0.2 ? '📉' : '➖');
            impactHtmlList += `
                <div class="flex justify-between items-center py-2 border-b border-dashed border-slate-200 dark:border-slate-700 last:border-0">
                    <div class="min-w-0 flex-1 pr-2">
                        <div class="text-[11px] font-bold truncate">${cName}</div>
                        <div class="text-[9px] text-slate-500 truncate mt-0.5">База: ${impact.baseUrk}% ➔ Текущ: ${impact.currUrk}%</div>
                    </div>
                    <div class="text-right shrink-0 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 shadow-sm">
                        <div class="text-[10px] font-black ${impact.color}">${trendIcon} ${impact.trend}</div>
                        <div class="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Индекс: ${(impact.score).toFixed(2)}</div>
                    </div>
                </div>`;
        }
    });

    const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;
    let globalImpactText = "Нейтральное"; let globalImpactColor = "text-slate-500";
    if (avgImpact > 0.2) { globalImpactText = "Положительное"; globalImpactColor = "text-green-600"; }
    else if (avgImpact < -0.2) { globalImpactText = "Отрицательное"; globalImpactColor = "text-red-600"; }

    html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm mb-4 mx-1 p-3">
            <div class="font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-3 text-center border-b border-[var(--card-border)] pb-2">Impact Score (Влияние)</div>
            <div class="flex justify-between items-center mb-3 bg-[var(--hover-bg)] p-3 rounded-xl border border-[var(--card-border)]">
                <div class="text-[10px] font-bold text-slate-500 uppercase">Общая<br>Динамика</div>
                <div class="text-right">
                    <div class="text-[12px] font-black ${globalImpactColor} uppercase">${globalImpactText}</div>
                    <div class="text-[9px] font-bold text-slate-400 mt-0.5">Средний Индекс: ${avgImpact.toFixed(2)}</div>
                </div>
            </div>
            <div class="space-y-1">${impactHtmlList || '<div class="text-[9px] text-center text-slate-400 py-3 font-bold border border-dashed rounded-xl bg-slate-50 uppercase">Нужно минимум 6 проверок по одному подрядчику</div>'}</div>
        </div>

        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm mb-4 mx-1 p-3">
            <div class="font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2 text-center border-b border-[var(--card-border)] pb-2">📈 График Опыта</div>
            <div style="height: 140px; position: relative;"><canvas id="game-progress-chart"></canvas></div>
        </div>
    `;

    const allProfilesArr = Object.values(profiles).sort((a, b) => b.pi - a.pi);
    if (allProfilesArr.length > 1) {
        html += `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm mb-8 mx-1 overflow-hidden">
            <div class="bg-[var(--hover-bg)] border-b border-[var(--card-border)] p-2.5 flex justify-between items-center">
                <span class="font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest">🏆 Топ Инженеров</span>
            </div>
            <div class="divide-y divide-[var(--card-border)]">`;
        allProfilesArr.forEach((p, i) => {
            const isMe = p.name === myProfile.name;
            let rankBadge = `<div class="w-6 text-center font-black text-slate-400 text-[11px]">${i+1}</div>`;
            if (i === 0) rankBadge = `<div class="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm border border-yellow-200">1</div>`;
            if (i === 1) rankBadge = `<div class="w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white flex items-center justify-center font-black text-[10px] shadow-sm border border-slate-200">2</div>`;
            if (i === 2) rankBadge = `<div class="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-black text-[10px] shadow-sm border border-orange-300">3</div>`;
            html += `
                <div class="flex items-center gap-3 p-2.5 ${isMe ? 'bg-indigo-50/30' : ''}">
                    ${rankBadge}
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-[11px] truncate ${isMe?'text-indigo-600':''}">${p.name}</div>
                        <div class="text-[8px] text-[var(--text-muted)] uppercase flex gap-2 mt-0.5 font-bold"><span>Гр. ${p.levelObj.level}</span><span>Пров: ${p.checksCount}</span></div>
                    </div>
                    <span class="font-black text-[11px] ${isMe?'text-indigo-600':'text-slate-700'}">${p.pi} XP</span>
                </div>`;
        });
        html += `</div></div>`;
    }
    
    html += `</div>`; 

    container.innerHTML = html;
    switchGameTab(currentGameTab);
};

window.renderRadarChart = function() {
    setTimeout(() => {
        const ctxRadar = document.getElementById('pi-radar-chart');
        if (ctxRadar && window.currentProfileData && window.currentProfileData.radarData) {
            const labels = Object.keys(window.currentProfileData.radarData);
            const data = Object.values(window.currentProfileData.radarData);
            if (Math.max(...data) === 0) data[0] = 1; 

            if (window.piRadarChartInstance) window.piRadarChartInstance.destroy();
            window.piRadarChartInstance = new Chart(ctxRadar, {
                type: 'radar',
                data: { labels: labels, datasets: [{ data: data, backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: '#4f46e5', pointBackgroundColor: '#4f46e5', borderWidth: 2 }] },
                options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false, stepSize: 25 }, pointLabels: { font: { size: 9, family: 'Inter', weight: 'bold' }, color: '#64748b' } } }, plugins: { legend: { display: false } } }
            });
        }
    }, 50);
};

window.renderStatsCharts = function() {
    setTimeout(() => {
        const ctxBar = document.getElementById('game-progress-chart');
        if (ctxBar && window.currentProfileData && window.currentProfileData.monthlyPI) {
            const labels = Object.keys(window.currentProfileData.monthlyPI);
            const data = Object.values(window.currentProfileData.monthlyPI);
            if (window.gameChartInstance) window.gameChartInstance.destroy();
            window.gameChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: { labels: labels, datasets: [{ data: data, backgroundColor: '#4f46e5', borderRadius: 4 }] },
                options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: {font: {size: 9}} }, y: { border: { display: false }, ticks: {font: {size: 9}} } } }
            });
        }
    }, 50);
};

window.gameShowBadgeInfo = function(badgeId, progress) {
    const badge = COMPETENCIES.find(b => b.id === badgeId);
    if(!badge) return;
    
    const isEarned = progress >= badge.maxProgress;
    const iconSvg = SKILL_ICONS[badge.group] || SKILL_ICONS["Редкие"];
    
    document.getElementById('modal-icon').innerHTML = `<div class="w-16 h-16 ${isEarned ? 'bg-indigo-600 text-white shadow-lg' : 'bg-[var(--hover-bg)] text-slate-400 border border-[var(--card-border)]'} rounded-2xl flex items-center justify-center mx-auto mb-3">${iconSvg}</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center text-[16px] uppercase tracking-widest text-slate-800 dark:text-white font-black">${badge.name}</div><div class="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">${badge.group}</div>`;
    
    document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[12px] text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">${badge.desc}</div>
        <div class="bg-[var(--hover-bg)] p-4 rounded-xl border border-[var(--card-border)] shadow-inner">
            <div class="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 ${isEarned ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}">
                <span>Прогресс навыка</span>
                <span>${Math.min(progress, badge.maxProgress)} / ${badge.maxProgress}</span>
            </div>
            <div class="w-full h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
                <div class="h-full ${isEarned ? 'bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.8)]' : 'bg-slate-400'} transition-all duration-500" style="width: ${(Math.min(progress, badge.maxProgress)/badge.maxProgress)*100}%"></div>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

// === ПАНЕЛЬ РУКОВОДИТЕЛЯ ===
const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
};
const MANAGER_PIN_HASH = "1570722437";

function gameInjectManagerModals() {
    if (document.getElementById('manager-auth-modal')) return;

    const html = `
    <!-- ИСПРАВЛЕНИЕ: maxlength="6" -->
    <div id="manager-auth-modal" class="fixed inset-0 bg-slate-900/80 z-[4000] hidden items-center justify-center p-4 backdrop-blur-sm" onclick="this.style.display='none'">
        <div class="bg-[var(--card-bg)] w-full max-w-xs p-6 rounded-2xl shadow-2xl transition-transform border border-[var(--card-border)]" onclick="event.stopPropagation()">
            <div class="text-center mb-4">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-3 border border-indigo-100 dark:border-indigo-800">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 class="font-black text-[13px] uppercase tracking-tight text-slate-800 dark:text-white">Доступ руководителя</h3>
                <p class="text-[10px] text-slate-500 mt-1">Введите ПИН-код для доступа к HR-аналитике</p>
            </div>
            <input type="password" id="manager-pin-input" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-center text-xl font-black tracking-widest outline-none mb-4 text-slate-800 dark:text-white focus:border-indigo-500 transition-colors" placeholder="••••••" maxlength="6">
            <button onclick="gameVerifyManagerPin()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform">Войти</button>
        </div>
    </div>

    <div id="manager-panel-overlay" class="fixed inset-0 bg-slate-100 dark:bg-slate-900 z-[3500] hidden flex-col transition-opacity duration-300" onclick="document.getElementById('manager-panel-overlay').style.display='none'; document.body.classList.remove('modal-open');">
        <div class="bg-[var(--bg-main)] w-full h-full max-w-6xl mx-auto flex flex-col shadow-2xl overflow-hidden relative" onclick="event.stopPropagation()">
            <div class="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
                <div class="flex flex-col min-w-0 pr-4">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-white/30">СЕКРЕТНО</span>
                        <span class="text-[10px] font-bold text-indigo-200 uppercase tracking-widest truncate">Панель Руководителя</span>
                    </div>
                </div>
                <button onclick="document.getElementById('manager-panel-overlay').style.display='none'; document.body.classList.remove('modal-open');" class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center font-black active:scale-90 border border-indigo-400 shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 shadow-sm">
                <button onclick="switchManagerTab('hr')" id="btn-man-hr" class="flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 transition-colors">Эффективность (HR)</button>
                <button onclick="switchManagerTab('audit')" id="btn-man-audit" class="flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors">Аудит Инженеров</button>
            </div>
            <div class="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900 relative">
                <div id="manager-tab-hr" class="block"><div id="manager-panel-content"></div></div>
                <div id="manager-tab-audit" class="hidden">
                    <div class="flex justify-between items-center mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div>
                            <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white mb-1">Маршрут Перекрестных Проверок</h2>
                            <p class="text-[10px] text-slate-500 font-bold">Алгоритм отбирает подозрительные (аномальные) проверки инженеров за прошлый месяц для выезда и перепроверки на месте.</p>
                        </div>
                        <button onclick="gameGenerateAuditPlan()" class="bg-indigo-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 shrink-0 whitespace-nowrap">Сформировать План</button>
                    </div>
                    <div id="manager-audit-list"><div class="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest">Нажмите "Сформировать План"</div></div>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

window.gameOpenManagerPanelAuth = function() {
    gameInjectManagerModals();
    document.getElementById('manager-pin-input').value = '';
    document.getElementById('manager-auth-modal').style.display = 'flex';
};

window.gameVerifyManagerPin = function() {
    const pin = document.getElementById('manager-pin-input').value;
    if (hashString(pin) === MANAGER_PIN_HASH) {
        document.getElementById('manager-auth-modal').style.display = 'none';
        document.getElementById('manager-panel-overlay').style.display = 'flex';
        document.body.classList.add('modal-open');
        gameRenderManagerAnalytics();
    } else {
        showToast('❌ Неверный ПИН-код');
    }
};

window.switchManagerTab = function(tab) {
    const btnHr = document.getElementById('btn-man-hr');
    const btnAudit = document.getElementById('btn-man-audit');
    const tabHr = document.getElementById('manager-tab-hr');
    const tabAudit = document.getElementById('manager-tab-audit');

    if (tab === 'hr') {
        btnHr.className = "flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 transition-colors";
        btnAudit.className = "flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors";
        tabHr.classList.remove('hidden'); tabAudit.classList.add('hidden');
    } else {
        btnAudit.className = "flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 transition-colors";
        btnHr.className = "flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors";
        tabAudit.classList.remove('hidden'); tabHr.classList.add('hidden');
    }
}

window.gameGenerateAuditPlan = function() {
    showToast("⚙️ Нейросеть анализирует аномалии за прошлый месяц...");
    setTimeout(() => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const recentChecks = contractorArray.filter(c => {
            const d = new Date(c.date);
            return d >= lastMonth && d < thisMonth;
        });

        if (recentChecks.length === 0) {
            document.getElementById('manager-audit-list').innerHTML = `<div class="text-center py-10 text-slate-500 font-bold text-xs uppercase bg-white dark:bg-slate-800 rounded-xl border border-slate-200">За прошлый месяц проверок не найдено</div>`;
            return;
        }

        const anomalies = [];
        const checkedInspectors = new Set();
        const checkedContractors = new Set();

        const perfectChecks = recentChecks.filter(c => c.metrics && c.metrics.final === 100);
        perfectChecks.forEach(c => {
            const contrAll = recentChecks.filter(x => x.contractorName === c.contractorName);
            const avg = contrAll.reduce((sum, x) => sum + (x.metrics?x.metrics.final:0), 0) / contrAll.length;
            if (avg < 80) {
                anomalies.push({ check: c, type: 'Завышение (Подрядчик проблемный, но тут 100%)', color: 'bg-orange-100 text-orange-800 border-orange-200' });
                checkedInspectors.add(c.inspectorName); checkedContractors.add(c.contractorName);
            }
        });

        recentChecks.forEach(c => {
            if (c.metrics && c.metrics.n_B3_fail > 0) {
                let hasPhoto = false;
                if(c.state && c.photos) {
                    Object.keys(c.state).forEach(id => { if ((c.state[id] === 'fail' || c.state[id] === 'fail_escalated') && c.photos[id]) hasPhoto = true; });
                }
                if (!hasPhoto) {
                    anomalies.push({ check: c, type: 'B3 без фото (Возможен вымысел)', color: 'bg-red-100 text-red-800 border-red-200' });
                    checkedInspectors.add(c.inspectorName); checkedContractors.add(c.contractorName);
                }
            }
        });

        recentChecks.forEach(c => {
            if (c.metrics && c.metrics.final < 40 && c.metrics.n_B3_fail === 0) {
                anomalies.push({ check: c, type: 'Сверхстрогость (УрК < 40% без B3)', color: 'bg-blue-100 text-blue-800 border-blue-200' });
                checkedInspectors.add(c.inspectorName);
            }
        });

        const allInspectors = [...new Set(recentChecks.map(c => c.inspectorName))];
        allInspectors.forEach(insp => {
            if (!checkedInspectors.has(insp)) {
                const inspChecks = recentChecks.filter(c => c.inspectorName === insp);
                if(inspChecks.length > 0) {
                    const randCheck = inspChecks[Math.floor(Math.random() * inspChecks.length)];
                    anomalies.push({ check: randCheck, type: 'Случайная выборка (Плановый аудит)', color: 'bg-slate-100 text-slate-700 border-slate-300' });
                }
            }
        });

        let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">`;
        const finalPlan = anomalies.sort(() => 0.5 - Math.random()).slice(0, 20);

        finalPlan.forEach((item, idx) => {
            const c = item.check;
            html += `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col cursor-pointer hover:border-indigo-400 transition-colors" onclick="showHistoryDetail(${c.id})">
                <div class="flex justify-between items-start mb-2">
                    <span class="px-2 py-1 rounded text-[9px] font-black uppercase border ${item.color}">${item.type}</span>
                    <span class="text-[10px] font-bold text-slate-400">#${idx+1}</span>
                </div>
                <div class="text-[14px] font-black text-slate-800 dark:text-white mb-1 leading-tight">${c.contractorName}</div>
                <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-3">${c.location} | ${c.templateTitle}</div>
                
                <div class="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800 flex justify-between items-center mt-auto">
                    <div>
                        <div class="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Кого проверяем:</div>
                        <div class="text-[12px] font-black text-slate-700 dark:text-slate-300">${c.inspectorName || 'Неизвестно'}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Оценка инженера:</div>
                        <div class="text-[16px] font-black ${c.metrics.final < 70 ? 'text-red-500' : (c.metrics.final < 85 ? 'text-orange-500' : 'text-green-600')}">${c.metrics.final}%</div>
                    </div>
                </div>
            </div>`;
        });

        html += `</div>`;
        document.getElementById('manager-audit-list').innerHTML = html;
        showToast("✅ Маршрут перекрестных аудитов сформирован!");
    }, 800); 
};

function gameCalculateManagerMetrics() {
    const profiles = gameCalculateAllProfiles();
    let globalUrkSum = 0; let globalChecksCount = 0;

    Object.values(profiles).forEach(p => {
        p.rawChecks.forEach(c => {
            if (c.metrics) { globalUrkSum += c.metrics.final; globalChecksCount++; }
        });
    });
    const globalAvgUrk = globalChecksCount > 0 ? (globalUrkSum / globalChecksCount) : 0;

    const managerStats = [];

    Object.values(profiles).forEach(p => {
        if (p.checksCount === 0) return;

        let sumUrk = 0; let checksWithFails = 0; let checksWithFailsAndPhotos = 0;
        let sumCompleteness = 0; let urkValues = []; let b3Found = 0;

        p.rawChecks.forEach(c => {
            if (c.metrics) {
                sumUrk += c.metrics.final; urkValues.push(c.metrics.final); b3Found += c.metrics.n_B3_fail;
                sumCompleteness += (c.metrics.checkedCount / c.metrics.totalCount) * 100;

                if (c.metrics.n_B1_fail > 0 || c.metrics.n_B2_fail > 0 || c.metrics.n_B3_fail > 0) {
                    checksWithFails++;
                    let hasPhotoAndCause = false;
                    if (c.state && c.details) {
                        Object.keys(c.state).forEach(id => {
                            if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                                if (c.photos && c.photos[id] && c.details[id]?.causeCode) hasPhotoAndCause = true;
                            }
                        });
                    }
                    if (hasPhotoAndCause) checksWithFailsAndPhotos++;
                }
            }
        });

        const avgUrk = sumUrk / p.checksCount;
        const strictness = globalAvgUrk - avgUrk; 
        
        let volatility = 0;
        if (urkValues.length > 1) {
            const variance = urkValues.reduce((acc, val) => acc + Math.pow(val - avgUrk, 2), 0) / (urkValues.length - 1);
            volatility = Math.sqrt(variance);
        }

        const photoRate = checksWithFails > 0 ? (checksWithFailsAndPhotos / checksWithFails) * 100 : 100;
        const completeness = sumCompleteness / p.checksCount;
        
        let totalImpact = 0; let impactCount = 0; let improvedContrs = 0; let degradedContrs = 0;
        const contractorsSet = new Set(p.rawChecks.map(c => c.contractorName));
        
        contractorsSet.forEach(cName => {
            const cChecks = p.rawChecks.filter(c => c.contractorName === cName);
            if (cChecks.length < 6) return; 
            
            const templatesCount = {};
            cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey]||0)+1);
            const topTemplate = Object.keys(templatesCount).sort((a,b) => templatesCount[b] - templatesCount[a])[0];

            if (typeof calculateImpactScore === 'function') {
                const impact = calculateImpactScore(p.name, cName, topTemplate);
                if (impact.trend !== 'Недостаточно данных') {
                    totalImpact += impact.score; impactCount++;
                    if (impact.score > 0.2) improvedContrs++;
                    if (impact.score < -0.2) degradedContrs++;
                }
            }
        });

        const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;
        
        // НОВОЕ: Влияние Impact на PI (Опыт)
        if (avgImpact > 0.2) p.pi += 50;
        else if (avgImpact < -0.2) p.pi = Math.max(0, p.pi - 30);

        managerStats.push({ 
            name: p.name, pi: p.pi, level: p.levelObj.level, 
            checks: p.checksCount, avgUrk: avgUrk, strictness: strictness, 
            volatility: volatility, photoRate: photoRate, completeness: completeness, 
            b3Found: b3Found, avgImpact: avgImpact, improved: improvedContrs, degraded: degradedContrs 
        });
    });

    return managerStats.sort((a,b) => b.pi - a.pi);
}

function gameRenderManagerAnalytics() {
    const stats = gameCalculateManagerMetrics();
    const container = document.getElementById('manager-panel-content');
    
    if (stats.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-500 font-bold text-xs uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">Соберите данные от инженеров (через загрузку бэкапа), чтобы увидеть аналитику</div>`;
        return;
    }

    let html = `
        <div class="mb-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div>
                <h2 class="text-indigo-800 dark:text-indigo-300 font-black uppercase tracking-widest text-[11px] mb-1">Оценка реального влияния</h2>
                <p class="text-[10px] text-indigo-600 dark:text-indigo-400 leading-snug max-w-lg">
                    Здесь собрана аналитика по каждому инженеру. <b>Impact Score</b> показывает, насколько инженер улучшил качество у подрядчиков. <span class="font-bold text-green-600">Зеленые зоны</span> — целевые показатели.
                </p>
            </div>
            <div class="flex gap-2 shrink-0">
                <div class="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-700 text-center shadow-sm">
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Всего инженеров</div>
                    <div class="text-lg font-black text-indigo-600 dark:text-indigo-400">${stats.length}</div>
                </div>
            </div>
        </div>

        <div class="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div class="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer select-none active:bg-slate-100 dark:active:bg-slate-800 transition-colors" 
                 onclick="document.getElementById('manager-help-content').classList.toggle('hidden'); document.getElementById('manager-help-icon').classList.toggle('rotate-180');">
                <div class="font-black text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <span class="text-lg">📖</span> Как читать эти метрики? (Справка)
                </div>
                <div id="manager-help-icon" class="text-slate-400 transition-transform duration-300 font-black">▼</div>
            </div>
            <div id="manager-help-content" class="hidden p-4 bg-white dark:bg-slate-800">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                    <div class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <b class="text-indigo-600 dark:text-indigo-400 uppercase text-[10px] block mb-1">📈 Impact Score (Влияние)</b>
                        Показывает <b>реальную пользу</b> от инженера. Сравнивает первые и последние 3 проверки.
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <b class="text-indigo-600 dark:text-indigo-400 uppercase text-[10px] block mb-1">⚖️ Строгость</b>
                        Отклонение от среднего УрК. Зеленый (+) — инженер строже. Красный (-) — лояльный, завышает оценки.
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div class="overflow-x-auto custom-scrollbar pb-2">
                <table class="w-full text-left text-[10px] whitespace-nowrap">
                    <thead class="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-black uppercase tracking-wider">
                        <tr>
                            <th class="p-3 sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Инженер</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Влияние на качество подрядчиков (от -1 до +1)">Impact Score</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Подрядчики: Улучшил / Ухудшил">Динамика</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Профессиональный Индекс (XP)">PI (Опыт)</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Количество проведенных инспекций">Объем (Пров.)</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Доля дефектов, к которым прикреплено фото и указана причина (>80%)">Доказательность</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Отклонение от среднего УрК по объекту. Положительное - строгий, Отрицательное - лояльный">Строгость</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Процент заполненных пунктов в чек-листах (>90%)">Полнота Ч/Л</th>
                            <th class="p-3 text-center border-l border-slate-200 dark:border-slate-700" title="Волатильность оценок (<15)">Разброс</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
    `;

    stats.forEach(s => {
        const getColorClass = (val, thresholds, inverse = false) => {
            if (!inverse) {
                if (val >= thresholds[0]) return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                if (val >= thresholds[1]) return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-black';
            } else {
                if (val <= thresholds[0]) return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                if (val <= thresholds[1]) return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-black';
            }
        };

        const strictAbs = Math.abs(s.strictness);
        const strictClass = strictAbs <= 5 ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : (strictAbs <= 10 ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-black');
        const strictText = s.strictness > 0 ? `+${s.strictness.toFixed(1)}` : `${s.strictness.toFixed(1)}`;

        const impactClass = s.avgImpact > 0.2 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : (s.avgImpact < -0.2 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800');
        const impactIcon = s.avgImpact > 0.2 ? '📈' : (s.avgImpact < -0.2 ? '📉' : '➖');

        html += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="p-3 sticky left-0 bg-white dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div class="font-black text-[12px] text-slate-800 dark:text-white truncate">${s.name}</div>
                    <div class="text-[8px] font-bold text-slate-400 uppercase">Грейд ${s.level} | B3: ${s.b3Found} шт.</div>
                </td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-black ${impactClass}">
                    <div class="flex items-center justify-center gap-1">${impactIcon} ${s.avgImpact.toFixed(2)}</div>
                </td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-bold text-[11px]">
                    <span class="text-green-600" title="Улучшил подрядчиков">${s.improved}</span> / <span class="text-red-500" title="Ухудшил подрядчиков">${s.degraded}</span>
                </td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-black text-indigo-600 dark:text-indigo-400">${s.pi}</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">${s.checks}</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-bold ${getColorClass(s.photoRate, [80, 50])}">${s.photoRate.toFixed(0)}%</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-bold ${strictClass}">${strictText}</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-bold ${getColorClass(s.completeness, [90, 70])}">${s.completeness.toFixed(0)}%</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-700 font-bold ${getColorClass(s.volatility, [15, 20], true)}">${s.volatility.toFixed(1)}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm mt-4 p-4">
            <div class="font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2 text-center">📈 Динамика строгости инженеров</div>
            <div style="height: 200px; position: relative;"><canvas id="manager-strictness-chart"></canvas></div>
        </div>
            </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-4 text-[9px] font-bold text-slate-500 justify-center uppercase tracking-widest">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-green-200 dark:bg-green-900 border border-green-300"></span> Целевая зона</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900 border border-orange-300"></span> Зона внимания</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-200 dark:bg-red-900 border border-red-300"></span> Зона риска</span>
        </div>
    `;

    container.innerHTML = html;
setTimeout(() => {
        const ctxS = document.getElementById('manager-strictness-chart');
        if (ctxS) {
            // Рисуем график строгости по инженерам (по оси X - инженеры, по оси Y - строгость)
            if (window.mgrStrictnessChart) window.mgrStrictnessChart.destroy();
            window.mgrStrictnessChart = new Chart(ctxS, {
                type: 'bar',
                data: { 
                    labels: stats.map(s => s.name.substring(0, 10)), 
                    datasets: [{ 
                        data: stats.map(s => s.strictness), 
                        backgroundColor: stats.map(s => s.strictness > 5 ? '#22c55e' : (s.strictness < -5 ? '#ef4444' : '#f59e0b')),
                        borderRadius: 4
                    }] 
                },
                options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
    }, 100);
}

window.gameOpenTaskMenu = function(statusKey, e) {
    e.stopPropagation();
    const st = contractorStatuses[statusKey];
    if (!st) return;

    let actionsHtml = '';
    if (st.status === 'active') {
        actionsHtml += `<button onclick="gameChangeTaskStatus('${statusKey}', 'paused')" class="w-full text-left p-3 rounded-lg hover:bg-orange-50 hover:text-orange-700 text-sm font-bold border border-transparent hover:border-orange-200 transition-colors">⏸ Приостановить работы</button>`;
        actionsHtml += `<button onclick="gameChangeTaskStatus('${statusKey}', 'completed')" class="w-full text-left p-3 rounded-lg hover:bg-green-50 hover:text-green-700 text-sm font-bold border border-transparent hover:border-green-200 transition-colors">✅ Завершить работы (Сдать)</button>`;
    } else if (st.status === 'paused') {
        actionsHtml += `<button onclick="gameChangeTaskStatus('${statusKey}', 'active')" class="w-full text-left p-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-sm font-bold border border-transparent hover:border-indigo-200 transition-colors">▶ Возобновить работы</button>`;
        actionsHtml += `<button onclick="gameChangeTaskStatus('${statusKey}', 'completed')" class="w-full text-left p-3 rounded-lg hover:bg-green-50 hover:text-green-700 text-sm font-bold border border-transparent hover:border-green-200 transition-colors">✅ Завершить (Отказ от работ)</button>`;
    }
    
    document.getElementById('task-status-actions').innerHTML = actionsHtml;
    document.getElementById('task-status-modal').style.display = 'flex';
};

window.gameChangeTaskStatus = function(statusKey, newStatus) {
    if (contractorStatuses[statusKey]) {
        contractorStatuses[statusKey].status = newStatus;
        saveWeeklyPlan();
        gameGenerateWeeklyPlan(true); // Принудительный пересчет плана без этой задачи
        gameRenderDashboard();
        showToast(`Статус изменен на: ${newStatus}`);
    }
    document.getElementById('task-status-modal').style.display = 'none';
};

// Интеграция Требования Эталона при нажатии на задачу
window.gameStartTask = function(contractor, templateKey) {
    // Проверка на потребность в эталоне
    const task = weeklyPlanData.tasks.find(t => t.contractor === contractor && t.templateKey === templateKey);
    if (task && task.needsEtalon) {
        document.getElementById('etalon-prompt-modal').style.display = 'flex';
        document.getElementById('btn-start-etalon').onclick = () => {
            document.getElementById('etalon-prompt-modal').style.display = 'none';
            // Запускаем системный акт-эталон
            startInspectionWithValues(contractor, 'sys_etalon_act', task.statusKey);
        };
        return; // Блокируем обычный старт
    }
    startInspectionWithValues(contractor, templateKey);
};

function startInspectionWithValues(contractor, templateKey, statusKey = null) {
    const contrInput = document.getElementById('inp-contractor');
    if (contrInput) { contrInput.value = contractor; contrInput.dispatchEvent(new Event('input')); }
    
    // Если это эталон, передаем ключ статуса через скрытый атрибут, чтобы потом обновить
    const selEl = document.getElementById('checklist-selector');
    if (selEl) {
        selEl.value = templateKey;
        selEl.dataset.pendingStatusKey = statusKey || ''; // Запоминаем для обновления
    }
    
    switchTab('tab-audit'); changeTemplate(templateKey);
    setTimeout(() => {
        updateDataSummary(); window.scrollTo({top: 0, behavior: 'smooth'});
    }, 150);
}