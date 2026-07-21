// game.state.js — изолированное состояние модуля геймификации
//
// Слияние js/game.js (удалён): реальные реализации данных/вычислений
// геймификации (67 функций/переменных распределены между
// game.state.js/game.actions.js/game.render.js — см. _ai/CURRENT_STEP.md,
// блок «Слияние js/game.js»). Перенесено 1:1, без изменения бизнес-логики.
// Прямые обращения к dbPut/dbGet/STORES/supabaseClient — black box, как были.
//
// Module-scope declarations, экспортируются через ES export; публикацию в
// window.* для legacy-кода делает game.module.js (entry) — см.
// ARCHITECTURE_BRIEF.md «Публичная граница модуля». Исключение (намеренное,
// не техдолг): 4 персистентные переменные (gameActionLogs/weeklyPlanData/
// engineerAbsence/contractorStatuses) остаются bare на window — читаются и
// целиком переприсваиваются множеством внешних потребителей
// (game.service.js, reports.actions.js, sync-connection.actions.js,
// sync-engine.core.js, tasks.module.js, etalon.actions.js,
// app-mode-utils.js) напрямую по имени, а не через getter/setter. Дублировать
// их как module-scope переменные небезопасно — module-scope копия
// рассинхронизируется с внешним переприсваиванием window.<name> = {...}
// (см. _ai/current_plan.md, блок «Особое внимание при исполнении»).

import { calculateImpactScore, GameActions } from './game.actions.js';

function _getSetting(key) {
  if (GameActions._ctx && GameActions._ctx.settings) return GameActions._ctx.settings.get(key);
  return window.RBI.services.settings.get(key);
}

function _getAllInspections() {
  if (GameActions._ctx && GameActions._ctx.inspections) return GameActions._ctx.inspections.getAllSync();
  return window.RBI.services.inspections.getAllSync();
}

function _getTasks() {
  if (GameActions._ctx && GameActions._ctx.tasks) return GameActions._ctx.tasks.getTasksSync();
  return window.RBI.services.tasks.getTasksSync();
}

// Перенесено из js/game.js (строка 6): изоляция isDemoMode через
// AppModeService с fallback (приватный хелпер этого файла).
function _isDemoMode() {
  if (GameActions._ctx && GameActions._ctx.appMode) return GameActions._ctx.appMode.isDemo();
  return window.RBI.services.appMode.isDemo();
}

function _storage() {
  if (GameActions._ctx && GameActions._ctx.storage) return GameActions._ctx.storage;
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

// === ГРЕЙДЫ И ЦВЕТОВЫЕ ТИРЫ (РАНГИ - БАЛАНС 1 ГОД) ===
// Перенесено из js/game.js (строка 14).
const PI_GRADES = [
  { level: 1, name: "Стажёр качества", xpMin: 0, xpMax: 500, color: "from-slate-400 to-slate-500", ring: "ring-slate-400" },
  { level: 2, name: "Инженер контроля", xpMin: 500, xpMax: 1500, color: "from-slate-500 to-slate-600", ring: "ring-slate-500" },
  { level: 3, name: "Старший инженер", xpMin: 1500, xpMax: 3500, color: "from-amber-600 to-orange-500", ring: "ring-orange-500" },
  { level: 4, name: "Ведущий аудитор", xpMin: 3500, xpMax: 6000, color: "from-amber-600 to-orange-500", ring: "ring-orange-500" },
  { level: 5, name: "Эксперт процессов", xpMin: 6000, xpMax: 10000, color: "from-indigo-500 to-blue-500", ring: "ring-indigo-500" },
  { level: 6, name: "Главный эксперт", xpMin: 10000, xpMax: 15000, color: "from-indigo-500 to-blue-500", ring: "ring-indigo-500" },
  { level: 7, name: "Мастер качества", xpMin: 15000, xpMax: 21000, color: "from-yellow-400 to-yellow-600", ring: "ring-yellow-500" },
  { level: 8, name: "Амбассадор TWI", xpMin: 21000, xpMax: 28000, color: "from-emerald-500 to-teal-500", ring: "ring-emerald-500" },
  { level: 9, name: "Ментор-Аудитор", xpMin: 28000, xpMax: 36000, color: "from-purple-500 to-fuchsia-500", ring: "ring-purple-500" },
  { level: 10, name: "Легенда Качества", xpMin: 36000, xpMax: 999999, color: "from-rose-500 to-pink-600", ring: "ring-rose-500" }
];

// === СТРОГИЕ SVG-ИКОНКИ ДЛЯ ГРУПП НАВЫКОВ ===
// Перенесено из js/game.js (строка 28).
const SKILL_ICONS = {
  "Партнёрство": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path></svg>`,
  "Оформление": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"></path></svg>`,
  "Обучение": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"></path></svg>`,
  "Объективность": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>`,
  "Охват": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>`,
  "Редкие": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path></svg>`
};

// === КОМПЕТЕНЦИИ (МНОГОУРОВНЕВЫЕ АЧИВКИ) ===
// Перенесено из js/game.js (строка 38).
const COMPETENCIES = [
  { id: "win_win", group: "Партнёрство", name: "Win-Win", desc: "Подрядчик перешёл в зелёную зону (>85%).", tiers: [1, 3, 5, 10, 20], maxProgress: 20 },
  { id: "champ_coach", group: "Партнёрство", name: "Тренер", desc: "Разные подрядчики улучшили рейтинг.", tiers: [1, 3, 5, 10, 20], maxProgress: 20 },
  { id: "reanimator", group: "Партнёрство", name: "Кризис-менеджер", desc: "Подрядчик выведен из красной зоны.", tiers: [1, 3, 5, 10, 20], maxProgress: 20 },
  { id: "chron_ideal", group: "Оформление", name: "Летописец", desc: "Проверки с фотофиксацией эталонов (OK).", tiers: [5, 15, 30, 50, 100], maxProgress: 100 },
  { id: "strategist", group: "Оформление", name: "Аналитик", desc: "Отредактированы ИИ-заключения.", tiers: [5, 15, 30, 50, 100], maxProgress: 100 },
  { id: "detective", group: "Оформление", name: "Детектив", desc: "Дефекты с фото и указанной причиной.", tiers: [10, 25, 50, 70, 100], maxProgress: 100 },
  { id: "meticulous", group: "Оформление", name: "Скрупулёзность", desc: "Серия проверок со 100% заполнением.", tiers: [10, 25, 50, 100, 150], maxProgress: 150 },
  { id: "mentor", group: "Обучение", name: "Наставник", desc: "Открыты TWI-карты во время инспекции.", tiers: [5, 15, 30, 45, 70], maxProgress: 70 },
  { id: "methodist", group: "Обучение", name: "Методолог", desc: "Созданы собственные TWI-карты.", tiers: [1, 3, 5, 25, 50], maxProgress: 50 },
  { id: "communicator", group: "Обучение", name: "Коммуникация", desc: "Развернутые комментарии к дефектам.", tiers: [10, 25, 50, 75, 100], maxProgress: 100 },
  { id: "impartial", group: "Объективность", name: "Независимость", desc: "Строгость в пределах нормы.", tiers: [20, 50, 100, 150, 200], maxProgress: 200 },
  { id: "stable_eng", group: "Объективность", name: "Стабильность", desc: "Низкий разброс (волатильность) оценок.", tiers: [10, 20, 40, 70, 100], maxProgress: 100 },
  { id: "reliable", group: "Объективность", name: "Надёжность", desc: "Непрерывная активность (недели).", tiers: [4, 8, 12, 16, 20], maxProgress: 20 },
  { id: "iron_will", group: "Объективность", name: "Железная воля", desc: "Высокий стрик активности (недели).", tiers: [12, 24, 48, 65, 80], maxProgress: 80 },
  { id: "universal", group: "Охват", name: "Универсальность", desc: "Проверки по разным видам работ.", tiers: [3, 6, 10, 15, 30], maxProgress: 30 },
  { id: "pathfinder", group: "Охват", name: "Полевой аудит", desc: "Проверки в различных локациях.", tiers: [10, 20, 30, 40, 50], maxProgress: 50 },
  { id: "perfection", group: "Редкие", name: "Педантичность", desc: "Оценка 100%, но честно зафиксирован B1.", tiers: [1, 3, 5, 10, 25], maxProgress: 25 },
  { id: "magic_creator", group: "Обучение", name: "Магистр TWI", desc: "Созданы карты через 'Магию TWI'.", tiers: [3, 6, 10, 25, 50], maxProgress: 50 },
  { id: "fmea_master", group: "Оформление", name: "Мастер FMEA", desc: "Заполнены FMEA таблицы с помощью ИИ.", tiers: [2, 5, 10, 25, 50], maxProgress: 50 },
  { id: "meeting_master", group: "Обучение", name: "Meeting Master", desc: "Проведены совещания и созданы ИИ-мемо.", tiers: [3, 8, 15, 45, 70], maxProgress: 70 },
  { id: "impact_maker", group: "Партнёрство", name: "Impact Maker", desc: "Зафиксировано улучшение подрядчиков (Impact > 0.2).", tiers: [2, 5, 10, 20, 25], maxProgress: 25 },
  { id: "initiator", group: "Охват", name: "Инициатор", desc: "Успешно опубликованы лучшие практики.", tiers: [1, 3, 5, 10, 25], maxProgress: 25 },
  { id: "discipline", group: "Объективность", name: "Дисциплина", desc: "Закрытие всех плановых задач без долгов.", tiers: [5, 15, 30, 45, 70], maxProgress: 70 },
];

// === ГЕЙМИФИКАЦИЯ: ЛОГИ ДЕЙСТВИЙ И НЕДЕЛЬНОЕ ПЛАНИРОВАНИЕ ===
// Перенесено из js/game.js (строки 3, 348-352). Мутируются по ссылке
// (push/forEach) в game.actions.js/game.render.js через window.*, поэтому
// повторной синхронизации при чтении не требуется — только при
// переприсваивании (см. DOMContentLoaded ниже). Намеренное исключение из
// правила публичной границы — см. комментарий в начале файла.
window.gameActionLogs = window.gameActionLogs || [];
window.weeklyPlanData = window.weeklyPlanData || { weekId: null, tasks: [], completed: false };
window.engineerAbsence = window.engineerAbsence || { isActive: false, reason: 'Отпуск', startDate: null, endDate: null };
window.contractorStatuses = window.contractorStatuses || {}; // Объект для хранения статусов (active, paused, completed)

// Перенесено из js/game.js (строка 132).
async function gameSaveLogs() {
  if (_isDemoMode()) return;
  try { await _storage().put(_storage().stores().GAME_LOGS, { id: 'main', data: window.gameActionLogs }); }
  catch (e) { console.error("Ошибка сохранения логов", e); }
}

// === ВЫЧИСЛИТЕЛЬНОЕ ЯДРО ===
// Перенесено из js/game.js (строка 157).
function gameCalculateAllProfiles() {
  const _allInspections = _getAllInspections();
  let profiles = {};

  _allInspections.forEach(check => {
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
    const wNum = Math.ceil((((d - new Date(wYear, 0, 1)) / 86400000) + 1) / 7);
    profiles[name].weeksActive.add(`${wYear}-${wNum}`);
  });

  window.gameActionLogs.forEach(log => {
    const name = log.inspector;
    if (!profiles[name]) {
      profiles[name] = { name: name, pi: 0, checksCount: 0, locations: new Set(), templates: new Set(), monthlyPI: {}, weeksActive: new Set(), badgesData: {}, rawChecks: [], objectName: "Справочник" };
      COMPETENCIES.forEach(b => profiles[name].badgesData[b.id] = 0);
    }
  });

  let derivedLogsAdded = false;

  for (let name in profiles) {
    let p = profiles[name];
    p.rawChecks.sort((a, b) => new Date(a.date) - new Date(b.date));
    let continuous100 = 0;

    p.rawChecks.forEach(check => {
      const m = check.metrics;
      // НАЧИСЛЯЕМ ОПЫТ ТОЛЬКО ЕСЛИ ПРОВЕРЕНО 3 И БОЛЕЕ ПУНКТОВ
      if (!m || m.checkedCount < 3) return;

      p.checksCount++;
      let earnedPI = 0;
      const dStr = new Date(check.date).toLocaleString('ru-RU', { month: 'short', year: '2-digit' });
      if (!p.monthlyPI[dStr]) p.monthlyPI[dStr] = 0;

      earnedPI += 20; // Базовый опыт за нормальную проверку

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
      for (let i = sortedWeeks.length - 1; i > 0; i--) {
        const wCurr = parseInt(sortedWeeks[i].split('-')[1]);
        const wPrev = parseInt(sortedWeeks[i - 1].split('-')[1]);
        if (wCurr - wPrev === 1 || (wCurr === 1 && wPrev >= 52)) p.currentStreak++;
        else break;
      }
    }
    if (p.currentStreak >= 8) p.badgesData['reliable'] = 8;
    if (p.currentStreak >= 16) p.badgesData['iron_will'] = 16;

    // Объективность: независимость (адекватный УрК проверки) и стабильность (низкий разброс)
    const urkValues = [];
    let impartialCount = 0;
    p.rawChecks.forEach(check => {
      const m = check.metrics;
      if (!m || m.checkedCount < 3 || typeof m.final !== 'number') return;
      urkValues.push(m.final);
      // В пределах нормы: не «всегда 100», не «всегда разгром»
      if (m.final >= 55 && m.final <= 98) impartialCount++;
    });
    p.badgesData['impartial'] = impartialCount;
    if (urkValues.length >= 5) {
      const avgUrkLocal = urkValues.reduce((a, b) => a + b, 0) / urkValues.length;
      const variance = urkValues.reduce((acc, val) => acc + Math.pow(val - avgUrkLocal, 2), 0) / (urkValues.length - 1);
      const volatility = Math.sqrt(variance);
      if (volatility < 12) p.badgesData['stable_eng'] = Math.min(p.checksCount, 100);
      else if (volatility < 20) p.badgesData['stable_eng'] = Math.min(Math.floor(p.checksCount * 0.6), 100);
      else if (volatility < 28) p.badgesData['stable_eng'] = Math.min(Math.floor(p.checksCount * 0.3), 100);
      else p.badgesData['stable_eng'] = Math.min(Math.floor(p.checksCount * 0.1), 100);
    } else {
      p.badgesData['stable_eng'] = 0;
    }

    // ВЛИЯНИЕ IMPACT SCORE НА РЕЙТИНГ ИНЖЕНЕРА (Бонус и Штраф) + бейджи партнёрства
    let totalImpact = 0; let impactCount = 0;
    let improvedContrs = 0; let winWinCount = 0; let reanimatorCount = 0;
    const derivedZoneLogs = [];
    const contractorsSet = new Set(p.rawChecks.map(c => c.contractorName));
    contractorsSet.forEach(cName => {
      const cChecks = p.rawChecks.filter(c => c.contractorName === cName);
      if (cChecks.length < 6) return;
      const templatesCount = {}; cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey] || 0) + 1);
      const topTemplate = Object.keys(templatesCount).sort((a, b) => templatesCount[b] - templatesCount[a])[0];
      const impact = calculateImpactScore(p.name, cName, topTemplate);
      if (impact.score !== 0 || impact.trend !== 'Недостаточно данных') { totalImpact += impact.score; impactCount++; }
      if (impact.score > 0.2) improvedContrs++;
      if (typeof impact.baseUrk === 'number' && typeof impact.currUrk === 'number') {
        // Зоны: зелёная ≥85, красная <70 (как в аналитике/AI)
        if (impact.baseUrk < 85 && impact.currUrk >= 85) winWinCount++;
        if (impact.baseUrk < 70 && impact.currUrk >= 70) reanimatorCount++;

        // XP за смену зоны подрядчика (один раз на подрядчика)
        if (impact.baseUrk < 70 && impact.currUrk >= 85) {
          derivedZoneLogs.push({ action: 'sk_zone_green', target: cName });
        } else if (impact.baseUrk < 70 && impact.currUrk >= 70 && impact.currUrk < 85) {
          derivedZoneLogs.push({ action: 'sk_zone_yellow', target: cName });
        } else if (impact.baseUrk >= 70 && impact.baseUrk < 85 && impact.currUrk >= 85) {
          derivedZoneLogs.push({ action: 'sk_zone_green', target: cName });
        }
      }
    });
    const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;
    if (avgImpact > 0.2) p.pi += 50;
    else if (avgImpact < -0.2) p.pi = Math.max(0, p.pi - 30);

    p.badgesData['impact_maker'] = improvedContrs;
    p.badgesData['champ_coach'] = improvedContrs;
    p.badgesData['win_win'] = winWinCount;
    p.badgesData['reanimator'] = reanimatorCount;

    // Пишем производные логи ДО общего forEach — чтобы XP начислился в этом же проходе
    const ensureDerivedLog = (action, target) => {
      const logs = window.gameActionLogs || [];
      if (logs.some(l => l.action === action && l.target === target && l.inspector === p.name)) return;
      logs.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: new Date().toISOString(),
        inspector: p.name,
        action,
        target
      });
      window.gameActionLogs = logs;
      derivedLogsAdded = true;
    };
    derivedZoneLogs.forEach(item => ensureDerivedLog(item.action, item.target));
    if (improvedContrs >= 10) ensureDerivedLog('impact_bonus_10', 'ten_improved');
  }

  if (derivedLogsAdded && typeof gameSaveLogs === 'function') {
    try { gameSaveLogs(); } catch (e) { /* silent */ }
  }

  window.gameActionLogs.forEach(log => {
    const p = profiles[log.inspector];
    if (!p) return;
    const dStr = new Date(log.date).toLocaleString('ru-RU', { month: 'short', year: '2-digit' });
    if (!p.monthlyPI[dStr]) p.monthlyPI[dStr] = 0;

    // --- БАЗОВЫЕ НАВЫКИ ---
    if (log.action === 'ai_generate' || log.action === 'ai_copy') { p.pi += 30; p.monthlyPI[dStr] += 30; p.badgesData['strategist']++; }

    // --- МЕТРИКИ ПК СТРОЙКОНТРОЛЬ ---
    if (log.action === 'sk_import_done') { p.pi += 5; p.monthlyPI[dStr] += 5; p.badgesData['discipline']++; } // Загрузка в срок (+5 XP)
    if (log.action === 'sk_red_isd_found') { p.pi += 15; p.monthlyPI[dStr] += 15; } // Найден красный ИСД (+15 XP)
    if (log.action === 'sk_message_sent') { p.pi += 10; p.monthlyPI[dStr] += 10; } // Отправлено письмо команде (+10 XP)
    if (log.action === 'sk_isd_improved') { p.pi += 40; p.monthlyPI[dStr] += 40; p.badgesData['win_win']++; } // Рост ИСД после работы (+40 XP)
    if (log.action === 'sk_zone_yellow') { p.pi += 25; p.monthlyPI[dStr] += 25; } // Выход из красной в желтую (+25 XP)
    if (log.action === 'sk_zone_green') { p.pi += 35; p.monthlyPI[dStr] += 35; } // Выход в зеленую (+35 XP)
    if (log.action === 'open_twi') { p.pi += 15; p.monthlyPI[dStr] += 15; p.badgesData['mentor']++; }
    if (log.action === 'create_twi') { p.pi += 100; p.monthlyPI[dStr] += 100; p.badgesData['methodist']++; }
    if (log.action === 'magic_creator') { p.pi += 100; p.monthlyPI[dStr] += 100; p.badgesData['magic_creator']++; p.badgesData['methodist']++; }
    if (log.action === 'comment_written') { p.badgesData['communicator']++; }
    if (log.action === 'overfulfill_bonus') { p.pi += 50; p.monthlyPI[dStr] += 50; }

    // --- НОВЫЕ НАВЫКИ ИЗ ТЗ ---
    if (log.action === 'escalation_bonus') { p.pi += 10; p.monthlyPI[dStr] += 10; }
    if (log.action === 'intervention_logged') { p.pi += 30; p.monthlyPI[dStr] += 30; }
    if (log.action === 'impact_bonus_10') { p.pi += 80; p.monthlyPI[dStr] += 80; p.badgesData['win_win']++; }
    if (log.action === 'meeting_memo_created') { p.pi += 40; p.monthlyPI[dStr] += 40; p.badgesData['meeting_master']++; }
    if (log.action === 'fmea_master') { p.pi += 40; p.monthlyPI[dStr] += 40; p.badgesData['fmea_master']++; }
    if (log.action === 'practice_created') { p.pi += 120; p.monthlyPI[dStr] += 120; }
    if (log.action === 'practice_published') { p.pi += 50; p.monthlyPI[dStr] += 50; p.badgesData['initiator']++; }
    if (log.action === 'task_completed_on_time') { p.pi += 15; p.monthlyPI[dStr] += 15; p.badgesData['discipline']++; }
    if (log.action === 'etalon_accepted') { p.pi += 25; p.monthlyPI[dStr] += 25; }
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
      if (!groupTotals[b.group]) { groupTotals[b.group] = 0; groupEarned[b.group] = 0; }
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
// Перенесено из js/game.js (строка 325).
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
    return `<div class="text-[10px] sm:text-[11px] lg:text-[13px] font-black text-indigo-900 dark:text-indigo-200 mb-0.5 lg:mb-1 leading-tight">Прокачайте «${closestBadge.name}» (${Math.round(maxRatio * 100)}%)</div>
              <div class="text-[9px] sm:text-[10px] lg:text-[11px] text-indigo-700 dark:text-indigo-400 leading-snug"><b>Цель:</b> ${closestBadge.desc}</div>`;
  } else {
    return `<div class="text-[10px] sm:text-[11px] lg:text-[13px] font-black text-indigo-900 dark:text-indigo-200 mb-0.5 lg:mb-1 leading-tight">Профиль сбалансирован</div>
              <div class="text-[9px] sm:text-[10px] lg:text-[11px] text-indigo-700 dark:text-indigo-400 leading-snug">Инспектируйте и применяйте TWI для роста XP.</div>`;
  }
}

// === НЕДЕЛЬНОЕ ПЛАНИРОВАНИЕ, СТАТУСЫ И ОТПУСКА ===
// Перенесено из js/game.js (строка 354).
function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

// Перенесено из js/game.js (строка 363).
function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setHours(-24 * (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Перенесено из js/game.js (строка 371): загрузка сохранённого недельного
// плана / отпуска / статусов подрядчиков из IndexedDB при старте.
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const storedPlan = await _storage().get(_storage().stores().STATE, 'weekly_plan_data');
    if (storedPlan && storedPlan.data) {
      window.weeklyPlanData = storedPlan.data;
    }

    const storedAbsence = await _storage().get(_storage().stores().STATE, 'engineer_absence');
    if (storedAbsence && storedAbsence.data) {
      window.engineerAbsence = storedAbsence.data;
    }

    const storedStatuses = await _storage().get(_storage().stores().STATE, 'contractor_statuses');
    if (storedStatuses && storedStatuses.data) {
      window.contractorStatuses = storedStatuses.data;
    }
  } catch (e) { console.error("Ошибка загрузки модуля планирования", e); }
});

// === HR-АНАЛИТИКА РУКОВОДИТЕЛЯ (расчёт метрик команды) ===
// Перенесено из js/game.js (строка 1572).
function gameCalculateManagerMetrics() {
  const profiles = gameCalculateAllProfiles();
  let globalUrkSum = 0; let globalChecksCount = 0;

  Object.values(profiles).forEach(p => {
    p.rawChecks.forEach(c => {
      if (c.metrics) { globalUrkSum += Number(c.metrics.final) || 0; globalChecksCount++; }
    });
  });
  const globalAvgUrk = globalChecksCount > 0 ? (globalUrkSum / globalChecksCount) : 0;

  const managerStats = [];

  // Определяем начало текущей недели для анализа долгов
  const now = new Date();
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(now.getDate() - 14);

  Object.values(profiles).forEach(p => {
    if (p.checksCount === 0) return;

    let sumUrk = 0; let checksWithFails = 0; let checksWithFailsAndPhotos = 0;
    let sumCompleteness = 0; let urkValues = []; let b3Found = 0;
    let continuousDone = 0, continuousTarget = 0;
    let milestoneDone = 0, milestoneTarget = 0;
    let totalDebt = 0;
    let oldDebtWarning = false;

    p.rawChecks.forEach(c => {
      if (c.metrics) {
        const cFinal = Number(c.metrics.final) || 0;
        sumUrk += cFinal; urkValues.push(cFinal); b3Found += Number(c.metrics.n_B3_fail) || 0;
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

    // СБОР ДАННЫХ ИЗ ПЛАНА (Если он загрузился вместе с бэкапом)
    // Примечание: так как мы смотрим данные всех инженеров, в реале каждый присылает свой бэкап. 
    // Мы будем симулировать расчет долга по истории проверок (если нет прямых данных плана).
    // Мы ищем подрядчиков, которые проверялись инженером, но не проверялись последние 2 недели.
    const contrsChecked = new Set();
    const contrsRecent = new Set();
    p.rawChecks.forEach(c => {
      contrsChecked.add(c.contractorName);
      if (new Date(c.date) >= twoWeeksAgo) contrsRecent.add(c.contractorName);
    });

    // Очень грубая оценка долга: сколько подрядчиков были заброшены
    totalDebt = contrsChecked.size - contrsRecent.size;
    if (totalDebt > 15) oldDebtWarning = true;

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
      cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey] || 0) + 1);
      const topTemplate = Object.keys(templatesCount).sort((a, b) => templatesCount[b] - templatesCount[a])[0];

      const impact = calculateImpactScore(p.name, cName, topTemplate);
      if (impact.trend !== 'Недостаточно данных') {
        totalImpact += impact.score; impactCount++;
        if (impact.score > 0.2) improvedContrs++;
        if (impact.score < -0.2) degradedContrs++;
      }
    });

    const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;

    // НОВОЕ: Подсчет задач инженера из глобального массива
    let engTasks = _getTasks().filter(t => t.engineerName === p.name || t.inspectorName === p.name || t.contractor === p.name /* legacy fallback */);
    let tasksDone = engTasks.filter(t => t.status === 'done').length;
    let tasksPending = engTasks.filter(t => t.status === 'pending').length;

    managerStats.push({
      name: p.name, pi: p.pi, level: p.levelObj.level,
      checks: p.checksCount, avgUrk: avgUrk, strictness: strictness,
      volatility: volatility, photoRate: photoRate, completeness: completeness,
      b3Found: b3Found, avgImpact: avgImpact, improved: improvedContrs, degraded: degradedContrs,
      totalDebt: totalDebt, oldDebtWarning: oldDebtWarning,
      tasksDone: tasksDone, tasksPending: tasksPending, // <-- Добавили в объект
      isVacation: (window.engineerAbsence.isActive && p.name === (document.getElementById('inp-inspector')?.value.trim() || ''))
    });
  });

  return managerStats.sort((a, b) => b.pi - a.pi);
}

let _profiles = [];
let _currentEngineerName = '';
let _isManagerPanelOpen = false;

const GameState = {
  getGameActionLogs() {
    return window.gameActionLogs;
  },

  getProfiles() {
    return _profiles;
  },

  getCurrentEngineerName() {
    return _currentEngineerName;
  },

  isManagerPanelOpen() {
    return _isManagerPanelOpen;
  },

  setManagerPanelOpen(val) {
    _isManagerPanelOpen = !!val;
  },

  syncFromLegacy() {
    var _name = _getSetting('engineerName');
    if (_name !== undefined) {
      _currentEngineerName = _name;
    }
    try {
      _profiles = gameCalculateAllProfiles() || [];
    } catch (e) {
      console.warn('[GameState] gameCalculateAllProfiles failed:', e);
      _profiles = [];
    }
  }
};

export {
  PI_GRADES, SKILL_ICONS, COMPETENCIES, gameSaveLogs, gameCalculateAllProfiles,
  getSmartQuest, getWeekId, getStartOfWeek, gameCalculateManagerMetrics, GameState
};
