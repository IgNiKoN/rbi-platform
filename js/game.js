/* Файл: js/game.js (RBI Quality - Премиальная Геймификация + HR Аналитика) */

let gameActionLogs = [];

// === ГРЕЙДЫ И ЦВЕТОВЫЕ ТИРЫ (РАНГИ - БАЛАНС 1 ГОД) ===
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
const SKILL_ICONS = {
    "Партнёрство": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path></svg>`,
    "Оформление": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"></path></svg>`,
    "Обучение": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"></path></svg>`,
    "Объективность": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>`,
    "Охват": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>`,
    "Редкие": `<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path></svg>`
};

// === КОМПЕТЕНЦИИ (МНОГОУРОВНЕВЫЕ АЧИВКИ) ===
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

// Функция определения уровня (Тира)
// Функция определения уровня (Тира) с 5 уровнями редкости
function getBadgeTier(badge, progress) {
    if (progress >= badge.maxProgress) return 5; // Мифический
    if (progress >= badge.tiers[2]) return 4;    // Легендарный
    if (progress >= badge.tiers[1]) return 3;    // Эпический
    if (progress >= badge.tiers[0]) return 2;    // Редкий
    if (progress > 0) return 1;                  // Обычный
    return 0;                                    // Заблокирован
}

// Генератор SVG Медалей
// Генератор SVG Медалей (Строго по ТЗ, градиент ложится на обводку, а не на фон)
window.getBadgeSvg = function (badgeId, tier, sizeCls) {
    const uid = Math.random().toString(36).substring(2, 8) + '_' + badgeId;

    // Градиенты для ОБВОДКИ (stroke)
    const defs = `
        <defs>
            <linearGradient id="g1_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#94a3b8"/></linearGradient>
            <linearGradient id="g2_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d97706"/><stop offset="100%" stop-color="#b45309"/></linearGradient>
            <linearGradient id="g3_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#4338ca"/></linearGradient>
            <linearGradient id="g4_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#a16207"/></linearGradient>
            <linearGradient id="g5_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#be185d"/></linearGradient>
        </defs>`;

    let strokeColor = "currentColor"; // По умолчанию
    let opacityCls = "opacity-40 text-slate-400";
    let shadow = "";

    // Применяем градиенты именно к линиям (stroke)
    if (tier === 1) { strokeColor = `url(#g1_${uid})`; opacityCls = "opacity-100"; shadow = "filter: drop-shadow(0 2px 4px rgba(100,116,139,0.3));"; }
    if (tier === 2) { strokeColor = `url(#g2_${uid})`; opacityCls = "opacity-100"; shadow = "filter: drop-shadow(0 2px 4px rgba(217,119,6,0.3));"; }
    if (tier === 3) { strokeColor = `url(#g3_${uid})`; opacityCls = "opacity-100"; shadow = "filter: drop-shadow(0 2px 6px rgba(99,102,241,0.4));"; }
    if (tier === 4) { strokeColor = `url(#g4_${uid})`; opacityCls = "opacity-100"; shadow = "filter: drop-shadow(0 4px 6px rgba(234,179,8,0.5));"; }
    if (tier >= 5) { strokeColor = `url(#g5_${uid})`; opacityCls = "opacity-100"; shadow = "filter: drop-shadow(0 4px 8px rgba(236,72,153,0.5));"; }

    let path = "";
    switch (badgeId) {
        case 'win_win': path = `<path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>`; break;
        case 'champ_coach': path = `<path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/><path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"/>`; break;
        case 'reanimator': path = `<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-4.5v9m-4.5-4.5h9"/>`; break;
        case 'chron_ideal': path = `<path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>`; break;
        case 'strategist': path = `<path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>`; break;
        case 'detective': path = `<path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/><path d="M10.5 7.5v6m3-3h-6"/>`; break;
        case 'meticulous': path = `<path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`; break;
        case 'mentor': path = `<path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/>`; break;
        case 'methodist': path = `<path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>`; break;
        case 'communicator': path = `<path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>`; break;
        case 'impartial': path = `<path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>`; break;
        case 'stable_eng': path = `<path d="M3 13h2.25l2.25-6 4.5 12 2.25-6H21"/>`; break;
        case 'reliable': path = `<path d="M9 12.75L11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>`; break;
        case 'iron_will': path = `<path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>`; break;
        case 'universal': path = `<path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/>`; break;
        case 'pathfinder': path = `<path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>`; break;
        case 'perfection': path = `<path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>`; break;
        case 'magic_creator': path = `<path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>`; break;
        case 'fmea_master': path = `<path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/><path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.496 1.508 1.333 1.508 2.316V18"/>`; break;
        case 'meeting_master': path = `<path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>`; break;
        case 'impact_maker': path = `<path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>`; break;
        case 'initiator': path = `<path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.496 1.508 1.333 1.508 2.316V18"/>`; break;
        case 'discipline': path = `<path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`; break;
        default: path = `<path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>`; break;
    }

    return `<svg class="${sizeCls} ${opacityCls} mx-auto transition-all duration-300" style="${shadow}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${defs}${path}</svg>`;
}

async function gameSaveLogs() {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return;
    try { await dbPut(STORES.SETTINGS, { key: 'game_action_logs', data: gameActionLogs }); }
    catch (e) { console.error("Ошибка сохранения логов", e); }
}

window.gameLogAction = function (actionType, targetId = null) {
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
        const wNum = Math.ceil((((d - new Date(wYear, 0, 1)) / 86400000) + 1) / 7);
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

        // ВЛИЯНИЕ IMPACT SCORE НА РЕЙТИНГ ИНЖЕНЕРА (Бонус и Штраф)
        let totalImpact = 0; let impactCount = 0;
        const contractorsSet = new Set(p.rawChecks.map(c => c.contractorName));
        contractorsSet.forEach(cName => {
            const cChecks = p.rawChecks.filter(c => c.contractorName === cName);
            if (cChecks.length < 6) return;
            const templatesCount = {}; cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey] || 0) + 1);
            const topTemplate = Object.keys(templatesCount).sort((a, b) => templatesCount[b] - templatesCount[a])[0];
            const impact = calculateImpactScore(p.name, cName, topTemplate);
            if (impact.score !== 0 || impact.trend !== 'Недостаточно данных') { totalImpact += impact.score; impactCount++; }
        });
        const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;
        if (avgImpact > 0.2) p.pi += 50;
        else if (avgImpact < -0.2) p.pi = Math.max(0, p.pi - 30);
    }

    gameActionLogs.forEach(log => {
        const p = profiles[log.inspector];
        if (!p) return;
        const dStr = new Date(log.date).toLocaleString('ru-RU', { month: 'short', year: '2-digit' });
        if (!p.monthlyPI[dStr]) p.monthlyPI[dStr] = 0;

        // --- БАЗОВЫЕ НАВЫКИ ---
        if (log.action === 'ai_generate' || log.action === 'ai_copy') { p.pi += 30; p.monthlyPI[dStr] += 30; p.badgesData['strategist']++; }
        if (log.action === 'ai_generate' || log.action === 'ai_copy') { p.pi += 30; p.monthlyPI[dStr] += 30; p.badgesData['strategist']++; }
        
        // --- МЕТРИКИ ПК СТРОЙКОНТРОЛЬ ---
        if (log.action === 'sk_import_done') { p.pi += 5; p.monthlyPI[dStr] += 5; p.badgesData['discipline']++; } // Загрузка в срок (+5 XP)
        if (log.action === 'sk_red_isd_found') { p.pi += 15; p.monthlyPI[dStr] += 15; } // Найден красный ИСД (+15 XP)
        if (log.action === 'sk_message_sent') { p.pi += 10; p.monthlyPI[dStr] += 10; } // Отправлено письмо команде (+10 XP)
        if (log.action === 'sk_isd_improved') { p.pi += 40; p.monthlyPI[dStr] += 40; p.badgesData['win_win']++; } // Рост ИСД после работы (+40 XP)
        if (log.action === 'sk_zone_yellow') { p.pi += 25; p.monthlyPI[dStr] += 25; } // Выход из красной в желтую (+25 XP)
        if (log.action === 'sk_zone_green') { p.pi += 35; p.monthlyPI[dStr] += 35; } // Выход в зеленую (+35 XP)
        if (log.action === 'open_twi') { p.pi += 15; p.monthlyPI[dStr] += 15; p.badgesData['mentor']++; }
        if (log.action === 'create_twi') { p.pi += 100; p.monthlyPI[dStr] += 100; p.badgesData['methodist'] = 1; }
        if (log.action === 'comment_written') { p.badgesData['communicator']++; }
        if (log.action === 'overfulfill_bonus') { p.pi += 50; p.monthlyPI[dStr] += 50; }

        // --- НОВЫЕ НАВЫКИ ИЗ ТЗ ---
        if (log.action === 'escalation_bonus') { p.pi += 10; p.monthlyPI[dStr] += 10; }
        if (log.action === 'intervention_logged') { p.pi += 30; p.monthlyPI[dStr] += 30; }
        if (log.action === 'impact_bonus_10') { p.pi += 80; p.monthlyPI[dStr] += 80; p.badgesData['win_win']++; }
        if (log.action === 'meeting_memo_created') { p.pi += 40; p.monthlyPI[dStr] += 40; }
        if (log.action === 'practice_created') { p.pi += 120; p.monthlyPI[dStr] += 120; }
        if (log.action === 'practice_published') { p.pi += 50; p.monthlyPI[dStr] += 50; }
        if (log.action === 'task_completed_on_time') { p.pi += 15; p.monthlyPI[dStr] += 15; }
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

let weeklyPlanData = { weekId: null, tasks: [], completed: false };
let engineerAbsence = { isActive: false, reason: 'Отпуск', startDate: null, endDate: null };
let contractorStatuses = {}; // Объект для хранения статусов (active, paused, completed)

function getWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

function getStartOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    if (day !== 1) d.setHours(-24 * (day - 1));
    d.setHours(0, 0, 0, 0);
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


window.gameUpdatePlanProgress = function () {
    const currentInspector = document.getElementById('inp-inspector')?.value.trim();
    if (!currentInspector || !weeklyPlanData.tasks) return;

    const startOfThisWeek = getStartOfWeek();
    const myWeeklyChecks = contractorArray.filter(c => c.inspectorName === currentInspector && new Date(c.date) >= startOfThisWeek);
    let allTasksDone = true;
    
    // ТРЕКЕР: Запоминаем, какие задачи мы закроем на этом прогоне
    let newlyClosedTasks = [];

    weeklyPlanData.tasks.forEach(task => {
        const st = contractorStatuses[task.statusKey];

        // АВТОМАТИЧЕСКОЕ СНЯТИЕ ЭТАЛОНА
        if (task.needsEtalon) {
            const hasEtalonCheck = etalonActsArray.some(c =>
                c.contractorName === task.contractor &&
                c.templateKey === 'sys_etalon_act'
            );
            if (hasEtalonCheck) {
                task.needsEtalon = false;
                if (st) st.etalonCompleted = true;
            } else {
                allTasksDone = false;
                return; // Блокируем прогресс, если эталон всё еще нужен
            }
        }

        const matchedChecks = myWeeklyChecks.filter(c => c.contractorName === task.contractor && c.templateKey === task.templateKey);

        if ((task.category === 'control' || task.type === 'continuous') && task.taskType !== 'Эталон') {
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

            // УМНЫЙ ПОДСЧЕТ: Для новых подрядчиков считаем ВСЕ исторические проверки
            if (task.target >= 7) {
                const allTimeMatched = contractorArray.filter(c => c.inspectorName === currentInspector && c.contractorName === task.contractor && c.templateKey === task.templateKey);
                task.done = allTimeMatched.filter(c => c.metrics && c.metrics.checkedCount >= 3).length;
            } else {
                task.done = validChecksCount;
            }
            
            task.fillRate = validChecksCount > 0 ? (sumFillRate / validChecksCount) : 0;
            task.photoRate = totalFails > 0 ? (failsWithPhotoOrComment / totalFails) * 100 : 100;

            // АВТОЗАКРЫТИЕ: Если проверка выполнена (даже ручным переходом в Осмотр), закрываем задачу!
            if (task.done >= task.target && task.status === 'pending') {
                task.status = 'done';
                task.resultComment = `Выполнено (${task.done}/${task.target})`;
                task.updatedAt = new Date().toISOString();
                // Запоминаем название подрядчика для уведомления
                newlyClosedTasks.push(task.contractor);
            }

            if (task.done < task.target) allTasksDone = false;

            if (task.priorityLvl === 4 && task.done > task.target) {
                const overCheck = matchedChecks[validChecksCount - 1];
                if (!gameActionLogs.find(l => l.action === 'overfulfill_bonus' && l.target === overCheck.id)) {
                    gameActionLogs.push({ id: Date.now().toString(36), date: new Date().toISOString(), inspector: currentInspector, action: 'overfulfill_bonus', target: overCheck.id });
                }
            }

        } else if (task.type === 'milestone') {
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
                
                if (task.done >= task.target && task.status === 'pending') {
                    st.status = 'completed';
                    task.status = 'done';
                    task.updatedAt = new Date().toISOString();
                    newlyClosedTasks.push(task.contractor);
                } else if (task.done < task.target) {
                    allTasksDone = false;
                }
            }
        }
    });

    // ПОКАЗЫВАЕМ УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЮ
    if (newlyClosedTasks.length > 0) {
        setTimeout(() => {
            // Убираем дубли имен, если закрылось несколько задач по одному подрядчику
            const uniqueNames = [...new Set(newlyClosedTasks)];
            showToast(`✅ Автозакрытие по истории: ${uniqueNames.join(', ')}`);
            rbi_renderTasksList(); // Перерисовываем список, чтобы задачи улетели вниз
        }, 1000);
    }
    // --- УМНОЕ АВТОЗАКРЫТИЕ (СВЕРКА С БАЗОЙ ДАННЫХ) ---
    weeklyPlanData.tasks.forEach(task => {
        if (task.status !== 'pending') return;
        
        const taskCreateDate = new Date(task.createdAt || task.date);
        // Отступаем 1 день назад, чтобы засчитывать документы, сделанные накануне
        taskCreateDate.setDate(taskCreateDate.getDate() - 1); 

        // 1. Проверяем Совещания (Мемо)
        if (task.category === 'meeting' || task.title.includes('Совещание')) {
            const hasMemo = (typeof window.rbi_meetingsData !== 'undefined') && window.rbi_meetingsData.some(m => new Date(m.date) >= taskCreateDate);
            if (hasMemo) {
                task.status = 'done'; task.resultComment = 'Автозакрытие (найден протокол)'; task.updatedAt = new Date().toISOString();
                newlyClosedTasks.push(task.title);
                dbPut(STORES.TASKS, task);
            }
        }
        
        // 2. Проверяем FMEA
        if (task.title.includes('FMEA')) {
            const hasFmea = (typeof window.rbi_fmeaRecords !== 'undefined') && window.rbi_fmeaRecords.some(f => new Date(f.date) >= taskCreateDate);
            if (hasFmea) {
                task.status = 'done'; task.resultComment = 'Автозакрытие (сохранен FMEA)'; task.updatedAt = new Date().toISOString();
                newlyClosedTasks.push('FMEA Анализ');
                dbPut(STORES.TASKS, task);
            }
        }
        // 3. Проверяем Эталоны
        if (task.taskType === 'Эталон' || task.title.includes('Эталон')) {
            // Ищем в массиве Эталонов совпадение по подрядчику и виду работ
            const hasEtalonRecord = (typeof etalonActsArray !== 'undefined') && etalonActsArray.some(e => 
                e.contractorName === task.contractor && 
                (e.templateTitle === task.templateTitle || e.templateTitle === task.workTitle)
            );
            
            if (hasEtalonRecord) {
                task.status = 'done'; 
                task.resultComment = 'Автозакрытие (Акт-Эталон найден в базе)'; 
                task.updatedAt = new Date().toISOString();
                newlyClosedTasks.push('Приемка Эталона');
                dbPut(STORES.TASKS, task);
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
            <div class="font-black text-[14px] uppercase tracking-tight mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center justify-between text-slate-800 dark:text-white">
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"></path></svg>
                    Статус инженера
                </div>
            </div>
            
            <div class="space-y-4 mb-6">
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Причина отсутствия</label>
                    <select id="abs-reason" class="input-base">
                        <option value="Отпуск">Отпуск</option>
                        <option value="Больничный">Больничный</option>
                        <option value="Командировка">Командировка</option>
                        <option value="Отгул">Отгул / Иное</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Начало</label>
                        <input type="date" id="abs-start" class="input-base text-[12px] !py-2">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Окончание</label>
                        <input type="date" id="abs-end" class="input-base text-[12px] !py-2">
                    </div>
                </div>
            </div>
            
            <div class="flex gap-2">
                <button onclick="document.getElementById('absence-modal-overlay').style.display='none'" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest active:scale-95 border border-slate-200 dark:border-slate-700 transition-colors">Отмена</button>
                <button onclick="saveAbsencePeriod()" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform">Применить</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

window.gameToggleAbsence = function () {
    if (engineerAbsence.isActive) {
        if (confirm("Прервать период отсутствия и вернуться к работе? План будет пересчитан.")) {
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

window.saveAbsencePeriod = function () {
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

window.checkAutoExpireAbsence = function () {
    if (engineerAbsence.isActive && engineerAbsence.endDate && new Date() > new Date(engineerAbsence.endDate)) {
        engineerAbsence.isActive = false; engineerAbsence.endDate = null; saveWeeklyPlan();
        gameGenerateWeeklyPlan(true); showToast("С возвращением! План работы возобновлен.");
    }
};

// === НОВАЯ МОДАЛКА: СПИСОК УРОВНЕЙ ИНЖЕНЕРА ===
window.gameShowLevelsModal = function () {
    const myPi = window.currentProfileData ? window.currentProfileData.pi : 0;

    let html = `<div class="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">`;

    PI_GRADES.forEach((grade, idx) => {
        const isCurrent = myPi >= grade.xpMin && myPi < grade.xpMax;
        const isPassed = myPi >= grade.xpMax;
        const isMaxLevel = (idx === PI_GRADES.length - 1) && myPi >= grade.xpMin;

        let statusIcon = isPassed ? `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
            : (isCurrent || isMaxLevel ? `<span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>`
                : `<svg class="w-5 h-5 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`);

        let bgClass = isCurrent || isMaxLevel ? `bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600 shadow-sm transform scale-[1.02]` : `bg-[var(--card-bg)] border-[var(--card-border)] opacity-${isPassed ? '60' : '100'}`;

        html += `
        <div class="p-3 border rounded-xl flex items-center justify-between transition-all ${bgClass}">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${grade.color} text-white font-black flex items-center justify-center text-xs shadow-sm">${grade.level}</div>
                <div>
                    <div class="font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight">${grade.name}</div>
                    <div class="text-[10px] font-bold text-slate-400">${grade.xpMin} — ${grade.xpMax === 999999 ? '∞' : grade.xpMax} XP</div>
                </div>
            </div>
            <div class="shrink-0 flex items-center justify-center w-8">${statusIcon}</div>
        </div>`;
    });
    html += `</div>`;

    document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg></div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Карьерная лестница</div>`;
    document.getElementById('modal-body').innerHTML = html;

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};
// === ЕДИНЫЙ ДАШБОРД ИНЖЕНЕРА (БЕЗ ЗАДАЧ - ПЕРЕНЕСЕНО) ===
window.gameRenderDashboard = function () {
    const container = document.getElementById('game-dashboard-container');
    if (!container) return;

    checkAutoExpireAbsence();
    if (typeof gameGenerateWeeklyPlan === 'function') gameGenerateWeeklyPlan();

    // ЖЕСТКОЕ ВОССТАНОВЛЕНИЕ ИМЕНИ
    let savedName = localStorage.getItem('force_eng_name');
    if (savedName && typeof appSettings !== 'undefined') appSettings.engineerName = savedName;

    const currentInspector = document.getElementById('inp-inspector')?.value.trim() || appSettings.engineerName || 'Неизвестный инспектор';

    // Логика показа/скрытия поля ввода имени
    if (!currentInspector || currentInspector === 'Неизвестный инспектор') {
        document.getElementById('profile-name-edit-container')?.classList.remove('hidden');
        document.getElementById('profile-title-text')?.classList.add('hidden');
    } else {
        document.getElementById('profile-name-edit-container')?.classList.add('hidden');
        document.getElementById('profile-title-text')?.classList.remove('hidden');
    }

    const profiles = gameCalculateAllProfiles();
    window.currentProfileData = profiles[currentInspector] || {
        name: currentInspector, pi: 0, checksCount: 0, currentStreak: 0,
        levelObj: PI_GRADES[0], earnedBadges: [], badgesData: {}, monthlyPI: {}, rawChecks: [], radarData: { "Оформление": 0, "Обучение": 0, "Объективность": 0, "Охват": 0, "Партнёрство": 0 }
    };
    window.allProfilesData = profiles;

    const myProfile = window.currentProfileData;
    const piProgress = myProfile.pi >= myProfile.levelObj.xpMax ? 100 : ((myProfile.pi - myProfile.levelObj.xpMin) / (myProfile.levelObj.xpMax - myProfile.levelObj.xpMin)) * 100;

    let activeBadges = [];
    COMPETENCIES.forEach(b => {
        const progress = myProfile.badgesData[b.id] || 0;
        const tier = getBadgeTier(b, progress);
        if (tier > 0) activeBadges.push({ ...b, tier, progress });
    });
    activeBadges.sort((a, b) => b.tier - a.tier);
    const topBadges = activeBadges.slice(0, 3);
    const smartQuestHtml = getSmartQuest(myProfile);

    // Считаем Impact
    let totalImpact = 0; let impactCount = 0;
    const contractorsSet = new Set(myProfile.rawChecks.map(c => c.contractorName));
    contractorsSet.forEach(cName => {
        const cChecks = myProfile.rawChecks.filter(c => c.contractorName === cName);
        if (cChecks.length < 6) return;
        const templatesCount = {}; cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey] || 0) + 1);
        const topTemplate = Object.keys(templatesCount).sort((a, b) => templatesCount[b] - templatesCount[a])[0];
        const impact = calculateImpactScore(currentInspector, cName, topTemplate);
        if (impact.score !== 0 || impact.trend !== 'Недостаточно данных') { totalImpact += impact.score; impactCount++; }
    });
    const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;

    let globalImpactText = "Нейтральное"; let globalImpactColor = "text-slate-600 dark:text-slate-400"; let globalImpactBg = "bg-[var(--hover-bg)]";
    let globalImpactIcon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16"></path></svg>`;
    if (avgImpact > 0.2) { globalImpactText = "Позитивное"; globalImpactColor = "text-green-600 dark:text-green-500"; globalImpactBg = "bg-green-50 dark:bg-green-900/20"; globalImpactIcon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>`; }
    else if (avgImpact < -0.2) { globalImpactText = "Отрицательное"; globalImpactColor = "text-red-600 dark:text-red-500"; globalImpactBg = "bg-red-50 dark:bg-red-900/20"; globalImpactIcon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"></path></svg>`; }

    let myRank = 1; let totalEng = 1;
    if (window.serverGlobalRating && Array.isArray(window.serverGlobalRating)) {
        const sortedServer = window.serverGlobalRating.sort((a, b) => b.pi - a.pi);
        myRank = sortedServer.findIndex(p => p.name === myProfile.name) + 1;
        totalEng = sortedServer.length;
        if (myRank === 0) myRank = '-';
    } else {
        const allProfilesArr = Object.values(profiles).sort((a, b) => b.pi - a.pi);
        myRank = allProfilesArr.findIndex(p => p.name === myProfile.name) + 1;
        totalEng = allProfilesArr.length;
    }

    // РЕНДЕР HTML (БЕЗ БЛОКА ЗАДАЧ)
    let html = `
        <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-center">
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${myProfile.levelObj.color} opacity-10 rounded-full blur-3xl pointer-events-none"></div>
                
                <!-- БЛОК СТРИКА УЛЕТАЕТ В ПРАВЫЙ ВЕРХНИЙ УГОЛ (ABSOLUTE) -->
                <div class="absolute top-3 sm:top-5 right-3 sm:right-5 text-right z-20">
                    <div class="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Стрик</div>
                    <div class="text-[12px] sm:text-[14px] font-black text-slate-800 dark:text-white leading-tight">${myProfile.currentStreak} нед.</div>
                </div>

                <div class="flex justify-start items-start mb-4 sm:mb-5 relative z-10 pr-14 sm:pr-16">
                    <div class="flex items-center gap-2.5 sm:gap-4 min-w-0 w-full">
                        <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${myProfile.levelObj.color} text-white flex items-center justify-center font-black text-lg sm:text-2xl shrink-0 shadow-md border-2 border-white ring-2 ${myProfile.levelObj.ring}">
                            ${myProfile.name === 'Неизвестный инспектор' ? '?' : myProfile.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-[13px] sm:text-[16px] font-black text-slate-800 dark:text-white leading-tight break-words whitespace-normal cursor-pointer" 
                                 onmousedown="profileNameLockStart(event)" ontouchstart="profileNameLockStart(event)" onmouseup="profileNameLockCancel()" onmouseleave="profileNameLockCancel()" ontouchend="profileNameLockCancel()" title="Удерживайте, чтобы изменить имя">
                                ${myProfile.name === 'Неизвестный инспектор' ? 'Имя не задано' : myProfile.name}
                            </div>
                            <div class="text-[9px] sm:text-[10px] font-bold bg-clip-text text-transparent bg-gradient-to-r ${myProfile.levelObj.color} uppercase tracking-widest mt-1 leading-tight whitespace-normal">${myProfile.levelObj.name} <span class="text-slate-400">Ур. ${myProfile.levelObj.level}</span></div>
                        </div>
                    </div>
                </div>

                <div class="relative z-10 cursor-pointer active:scale-[0.98] transition-transform" onclick="gameShowLevelsModal()">
                    <div class="flex justify-between text-[8px] sm:text-[10px] font-bold text-[var(--text-muted)] mb-1 sm:mb-2 uppercase tracking-wider">
                        <span class="text-slate-800 dark:text-white font-black">${myProfile.pi} XP</span>
                        <span>След: ${myProfile.levelObj.xpMax === 999999 ? 'MAX' : myProfile.levelObj.xpMax}</span>
                    </div>
                    <div class="w-full h-1.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                        <div class="h-full bg-gradient-to-r ${myProfile.levelObj.color} transition-all duration-1000" style="width: ${piProgress}%"></div>
                    </div>
                </div>
            </div>

            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm flex flex-col justify-between w-full">
                <div>
                    <div class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2 flex justify-between items-center">
                        <span>Награды</span>
                        <button onclick="document.getElementById('badges-section').scrollIntoView({behavior: 'smooth'})" class="text-indigo-500 hover:text-indigo-600 active:scale-95 transition-colors">Все ➔</button>
                    </div>
                    <div class="flex items-center justify-start gap-3 overflow-x-auto no-scrollbar pb-2">
                        ${topBadges.length > 0
            ? topBadges.map(b => `<div class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform w-16 shrink-0" onclick="gameShowBadgeInfo('${b.id}', ${b.progress})" title="${b.name}">${getBadgeSvg(b.id, b.tier, "w-10 h-10")}<span class="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase mt-1 text-center truncate w-full">${b.name}</span></div>`).join('')
            : `<div class="text-[9px] font-bold text-slate-400 uppercase">Пока пусто.</div>`
        }
                    </div>
                </div>
                <div class="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3 shadow-sm">
                    ${smartQuestHtml}
                </div>
            </div>
        </div>

        <details class="mb-4 group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">📊 Профиль навыков и Влияние</span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-2 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3 bg-[var(--hover-bg)]">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm p-4 flex flex-col justify-center relative min-h-[220px]">
                    <div style="height: 160px; width: 100%; position: relative;"><canvas id="pi-radar-chart"></canvas></div>
                    <button onclick="generateAiTutorAdvice()" class="mt-3 w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-[9px] font-black uppercase py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 active:scale-95 transition-transform shadow-sm">🧠 AI-Наставник</button>
                    <div id="ai-tutor-container" class="hidden mt-2 text-[10px] leading-snug text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-2"></div>
                </div>
                <button onclick="gameOpenImpactModal()" class="w-full text-left p-5 rounded-xl border border-[var(--card-border)] shadow-sm active:scale-95 transition-transform flex flex-col justify-between min-h-[220px] ${globalImpactBg}">
                    <div class="flex justify-between items-start w-full mb-4">
                        <div class="text-[10px] sm:text-[12px] font-black uppercase text-[var(--text-muted)] tracking-widest leading-tight">Ваше влияние на<br>качество</div>
                        <div class="${globalImpactColor}">${globalImpactIcon}</div>
                    </div>
                    <div>
                        <div class="text-[42px] font-black ${globalImpactColor} leading-none mb-2">${avgImpact > 0 ? '+' : ''}${avgImpact.toFixed(2)}</div>
                        <div class="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Статус: ${globalImpactText}</div>
                        <div class="text-[10px] text-slate-500 mt-3 font-medium">Impact Score оценивает качество "до" и "после" ваших инспекций.</div>
                    </div>
                </button>
            </div>
        </details>

        <details class="mb-4 group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">🔥 Активность и Рейтинг</span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-2 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3 bg-[var(--hover-bg)]">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm p-4 flex flex-col justify-center relative min-h-[220px]">
                    <div class="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-2 absolute top-4 left-4 z-10">Активность (XP по месяцам)</div>
                    <div style="height: 160px; width: 100%; position: relative; margin-top:20px;"><canvas id="game-progress-chart"></canvas></div>
                </div>
                <button onclick="gameOpenTopModal()" class="w-full text-left p-5 rounded-xl border border-[var(--card-border)] shadow-sm active:scale-95 transition-transform flex flex-col justify-between min-h-[220px] bg-[var(--card-bg)]">
                    <div class="flex justify-between items-start w-full mb-4">
                        <div class="text-[10px] sm:text-[12px] font-black uppercase text-[var(--text-muted)] tracking-widest leading-tight">Рейтинг<br>Инженеров</div>
                        <div class="text-indigo-500"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M21.666 4.756c.962-.203 1.934-.377 2.916-.52a6.003 6.003 0 00-5.395 4.972"></path></svg></div>
                    </div>
                    <div>
                        <div class="text-[42px] font-black text-slate-800 dark:text-white leading-none mb-2">#${myRank} <span class="text-[16px] text-[var(--text-muted)]">из ${totalEng}</span></div>
                        <div class="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ваша позиция в топе</div>
                    </div>
                </button>
            </div>
        </details>

        <details id="badges-section" class="mb-8 group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">🏅 Коллекция наград <span class="bg-white dark:bg-slate-800 border border-[var(--card-border)] px-1.5 py-0.5 rounded text-[9px] ml-1">${myProfile.earnedBadges.length}/${COMPETENCIES.length}</span></span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-y-6 gap-x-2 bg-[var(--hover-bg)]">
                ${COMPETENCIES.map(badge => {
            const progress = myProfile.badgesData[badge.id] || 0;
            const tier = getBadgeTier(badge, progress);
            return `<div class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform" onclick="gameShowBadgeInfo('${badge.id}', ${progress})" title="${badge.desc}">${getBadgeSvg(badge.id, tier, "w-12 h-12")}<div class="font-bold text-[8px] uppercase text-center leading-tight mt-2 h-6 flex items-center ${tier > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}">${badge.name}</div></div>`;
        }).join('')}
            </div>
        </details>
    `;

    container.innerHTML = html;
    renderRadarChart();
    renderStatsCharts();
};

// Функция жесткого сохранения и блокировки имени
let profileLockTimer = null;
window.profileNameLockStart = function (e) {
    if (e) e.preventDefault();
    profileLockTimer = setTimeout(() => {
        document.getElementById('profile-name-edit-container').classList.remove('hidden');
        document.getElementById('profile-title-text').classList.add('hidden');
        const inp = document.getElementById('profile-name-input');
        if (inp) {
            inp.value = appSettings.engineerName || '';
            inp.focus();
        }
    }, 800); // Долгое нажатие
};
window.profileNameLockCancel = function () {
    if (profileLockTimer) clearTimeout(profileLockTimer);
};
window.saveEngineerNameForce = function (name) {
    const cleanName = name.trim();
    if (!cleanName) return showToast("⚠️ Имя не может быть пустым!");

    appSettings.engineerName = cleanName;
    dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
    localStorage.setItem('force_eng_name', cleanName); // Жесткий бэкап

    const inpInspector = document.getElementById('inp-inspector');
    if (inpInspector) inpInspector.value = cleanName;

    if (typeof window.syncConfig !== 'undefined') {
        window.syncConfig.engineerName = cleanName;
        localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    }

    document.getElementById('profile-name-edit-container').classList.add('hidden');
    document.getElementById('profile-title-text').classList.remove('hidden');

    showToast("✅ Имя зафиксировано!");
    gameRenderDashboard();
};

window.renderRadarChart = function () {
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

window.renderStatsCharts = function () {
    setTimeout(() => {
        const ctxBar = document.getElementById('game-progress-chart');
        if (ctxBar && window.currentProfileData && window.currentProfileData.monthlyPI) {
            const labels = Object.keys(window.currentProfileData.monthlyPI);
            const data = Object.values(window.currentProfileData.monthlyPI);
            if (window.gameChartInstance) window.gameChartInstance.destroy();
            window.gameChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: { labels: labels, datasets: [{ data: data, backgroundColor: '#4f46e5', borderRadius: 4 }] },
                options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { border: { display: false }, ticks: { font: { size: 9 } } } } }
            });
        }
    }, 50);
};

window.gameShowBadgeInfo = function (badgeId, progress) {
    const badge = COMPETENCIES.find(b => b.id === badgeId);
    if (!badge) return;

    const tier = getBadgeTier(badge, progress);

    // По умолчанию (Уровень 0 - Заблокировано)
    let target = badge.tiers[0];
    let levelName = "Заблокировано";
    let color = "text-slate-400";
    let bg = "bg-slate-300";

    // Синхронизируем цвета и названия со стилями SVG медалей
    if (tier === 1) {
        target = badge.tiers[0];
        levelName = "Обычная";
        color = "text-slate-500";
        bg = "bg-slate-400";
    }
    else if (tier === 2) {
        target = badge.tiers[1];
        levelName = "Редкая";
        color = "text-amber-600";
        bg = "bg-amber-500";
    }
    else if (tier === 3) {
        target = badge.tiers[2];
        levelName = "Эпическая";
        color = "text-indigo-500";
        bg = "bg-indigo-500";
    }
    else if (tier === 4) {
        target = badge.maxProgress;
        levelName = "Легендарная";
        color = "text-yellow-600";
        bg = "bg-yellow-500";
    }
    else if (tier >= 5) {
        target = badge.maxProgress;
        levelName = "Мифическая";
        color = "text-pink-600";
        bg = "bg-pink-500";
        progress = target; // Визуально ограничиваем прогресс-бар, чтобы он не вылезал за 100%
    }

    const perc = Math.min((progress / target) * 100, 100);

    document.getElementById('modal-icon').innerHTML = `
        <div class="w-24 h-24 flex items-center justify-center mx-auto mb-2">
            ${getBadgeSvg(badge.id, tier, "w-20 h-20")}
        </div>
    `;

    document.getElementById('modal-title').innerHTML = `
        <div class="text-center text-[18px] uppercase tracking-tight text-slate-800 dark:text-white font-black">${badge.name}</div>
        <div class="text-center text-[10px] ${color} font-bold uppercase tracking-widest mt-1.5 flex justify-center items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${bg}"></span> ${levelName}
        </div>
    `;

    document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[13px] text-slate-600 dark:text-slate-300 mb-6 leading-relaxed px-4">${badge.desc}</div>
        <div class="bg-[var(--hover-bg)] p-4 rounded-2xl border border-[var(--card-border)] shadow-inner">
            <div class="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3 ${tier > 0 ? color : 'text-slate-500'}">
                <span>Прогресс уровня</span>
                <span>${progress} / ${target}</span>
            </div>
            <div class="w-full h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
                <div class="h-full ${tier > 0 ? bg : 'bg-slate-400'} transition-all duration-700 ease-out" style="width: ${perc}%"></div>
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

window.gameOpenManagerPanelAuth = function () {
    gameInjectManagerModals();
    document.getElementById('manager-pin-input').value = '';
    document.getElementById('manager-auth-modal').style.display = 'flex';
};

window.gameVerifyManagerPin = function () {
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

window.switchManagerTab = function (tab) {
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

window.gameGenerateAuditPlan = function () {
    showToast("⚙️ Нейросеть анализирует аномалии (протыкивания, завышения)...");
    setTimeout(() => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Берем проверки за последние 30 дней для актуальности
        const recentChecks = contractorArray.filter(c => new Date(c.date) >= lastMonth);

        if (recentChecks.length === 0) {
            document.getElementById('manager-audit-list').innerHTML = `<div class="text-center py-10 text-slate-500 font-bold text-xs uppercase bg-white dark:bg-slate-800 rounded-xl border border-slate-200">Проверок не найдено</div>`;
            return;
        }

        const anomalies = [];
        const checkedInspectors = new Set();

        // Сортируем по дате, чтобы искать "быстрые протыкивания"
        recentChecks.sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 1; i < recentChecks.length; i++) {
            const curr = recentChecks[i];
            const prev = recentChecks[i - 1];

            // Если один и тот же инспектор сдал 2 разные проверки с разницей меньше 60 секунд = "Протыкивание"
            if (curr.inspectorName === prev.inspectorName && curr.location !== prev.location) {
                const timeDiff = (new Date(curr.date) - new Date(prev.date)) / 1000; // в секундах
                if (timeDiff > 0 && timeDiff < 60 && curr.metrics.final >= 85) {
                    anomalies.push({ check: curr, type: '⚠️ Быстрое заполнение (<60 сек)', color: 'bg-purple-100 text-purple-800 border-purple-200' });
                    checkedInspectors.add(curr.inspectorName);
                }
            }
        }

        // Аномалия: 100% у проблемного подрядчика
        const perfectChecks = recentChecks.filter(c => c.metrics && c.metrics.final === 100);
        perfectChecks.forEach(c => {
            const contrAll = recentChecks.filter(x => x.contractorName === c.contractorName);
            const avg = contrAll.reduce((sum, x) => sum + (x.metrics ? x.metrics.final : 0), 0) / contrAll.length;
            if (avg < 75) {
                anomalies.push({ check: c, type: 'Завышение (Подрядчик в красной зоне)', color: 'bg-orange-100 text-orange-800 border-orange-200' });
                checkedInspectors.add(c.inspectorName);
            }
        });

        // Аномалия: B3 без доказательств
        recentChecks.forEach(c => {
            if (c.metrics && c.metrics.n_B3_fail > 0) {
                let hasPhotoOrComment = false;
                if (c.state) {
                    Object.keys(c.state).forEach(id => {
                        if (c.state[id] === 'fail_escalated' || (c.state[id] === 'fail' && c.photos && c.photos[id])) hasPhotoOrComment = true;
                        if (c.details && c.details[id] && c.details[id].comment) hasPhotoOrComment = true;
                    });
                }
                if (!hasPhotoOrComment) {
                    anomalies.push({ check: c, type: 'B3 без фото и комментария', color: 'bg-red-100 text-red-800 border-red-200' });
                    checkedInspectors.add(c.inspectorName);
                }
            }
        });

        // Разбавляем случайными аудитами для профилактики
        const allInspectors = [...new Set(recentChecks.map(c => c.inspectorName))];
        allInspectors.forEach(insp => {
            if (!checkedInspectors.has(insp)) {
                const inspChecks = recentChecks.filter(c => c.inspectorName === insp);
                if (inspChecks.length > 0) {
                    const randCheck = inspChecks[Math.floor(Math.random() * inspChecks.length)];
                    anomalies.push({ check: randCheck, type: 'Плановый перекрёстный аудит', color: 'bg-slate-100 text-slate-700 border-slate-300' });
                }
            }
        });

        let html = `<div class="grid grid-cols-1 gap-3 pb-8">`;
        // Убираем дубликаты
        const uniqueAnomalies = Array.from(new Set(anomalies.map(a => a.check.id)))
            .map(id => anomalies.find(a => a.check.id === id))
            .sort(() => 0.5 - Math.random()).slice(0, 15);

        uniqueAnomalies.forEach((item, idx) => {
            const c = item.check;
            html += `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col hover:border-indigo-400 transition-colors">
                <div class="flex justify-between items-start mb-2">
                    <span class="px-2 py-1 rounded text-[9px] font-black uppercase border ${item.color}">${item.type}</span>
                    <span class="text-[10px] font-bold text-slate-400">#${idx + 1}</span>
                </div>
                <div class="text-[14px] font-black text-slate-800 dark:text-white mb-1 leading-tight">${c.contractorName}</div>
                <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-3">${c.location} | ${c.templateTitle}</div>
                
                <div class="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800 flex justify-between items-center mt-auto mb-3">
                    <div>
                        <div class="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Кого проверяем:</div>
                        <div class="text-[12px] font-black text-slate-700 dark:text-slate-300">${c.inspectorName || 'Неизвестно'}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Оценка инженера:</div>
                        <div class="text-[16px] font-black ${c.metrics.final < 70 ? 'text-red-500' : (c.metrics.final < 85 ? 'text-orange-500' : 'text-green-600')}">${c.metrics.final}%</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('manager-panel-overlay').style.display='none'; showHistoryDetail('${c.id}');" class="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg text-[10px] font-black uppercase active:scale-95 border border-slate-200">
                        👁️ Открыть Акт
                    </button>
                    <button onclick="document.getElementById('manager-panel-overlay').style.display='none'; document.body.classList.remove('modal-open'); startInspectionWithValues('${c.contractorName.replace(/'/g, "\\'")}', '${c.templateKey}', null, '${c.projectName.replace(/'/g, "\\'")}', ${c.id});" class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-md">
    ⚖️ Провести аудит
</button>
                </div>
            </div>`;
        });

        html += `</div>`;
        document.getElementById('manager-audit-list').innerHTML = html;
        showToast("✅ План аудита сформирован! Найдены аномалии.");
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

        // НОВОЕ: Подсчет задач инженера из глобального массива
        let engTasks = window.rbi_tasksData ? window.rbi_tasksData.filter(t => t.engineerName === p.name || t.inspectorName === p.name || t.contractor === p.name /* legacy fallback */) : [];
        let tasksDone = engTasks.filter(t => t.status === 'done').length;
        let tasksPending = engTasks.filter(t => t.status === 'pending').length;

        managerStats.push({
            name: p.name, pi: p.pi, level: p.levelObj.level,
            checks: p.checksCount, avgUrk: avgUrk, strictness: strictness,
            volatility: volatility, photoRate: photoRate, completeness: completeness,
            b3Found: b3Found, avgImpact: avgImpact, improved: improvedContrs, degraded: degradedContrs,
            totalDebt: totalDebt, oldDebtWarning: oldDebtWarning,
            tasksDone: tasksDone, tasksPending: tasksPending, // <-- Добавили в объект
            isVacation: (typeof engineerAbsence !== 'undefined' && engineerAbsence.isActive && p.name === (document.getElementById('inp-inspector')?.value.trim() || ''))
        });
    });

    return managerStats.sort((a, b) => b.pi - a.pi);
}

function gameRenderManagerAnalytics() {
    const stats = gameCalculateManagerMetrics();
    const container = document.getElementById('manager-panel-content');

    if (stats.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-500 font-bold text-xs uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">Соберите данные от инженеров (через загрузку бэкапа), чтобы увидеть аналитику</div>`;
        return;
    }

    let html = `
        <div class="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div>
                <h2 class="text-indigo-800 font-black uppercase tracking-widest text-[11px] mb-1">Оценка эффективности (HR)</h2>
                <p class="text-[10px] text-indigo-600 leading-snug max-w-lg">
                    Данные об инженерах. Столбец <b>Долги</b> показывает количество забытых подрядчиков (без проверок более 2 недель).
                </p>
            </div>
            <div class="flex gap-2 shrink-0">
                <div class="bg-white px-3 py-2 rounded-lg border border-indigo-100 text-center shadow-sm">
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Инженеров в базе</div>
                    <div class="text-lg font-black text-indigo-600">${stats.length}</div>
                </div>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div class="overflow-x-auto custom-scrollbar pb-2">
                <table class="w-full text-left text-[10px] whitespace-nowrap">
                    <thead class="bg-slate-100 text-slate-500 border-b border-slate-200 font-black uppercase tracking-wider">
                        <tr>
                            <th class="p-3 sticky left-0 bg-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Инженер</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Влияние на качество подрядчиков">Impact Score</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Подрядчиков: Улучшил / Ухудшил">Динамика</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Оценочные долги по задачам">Заброшенные П-ки</th>
                            <th class="p-3 text-center border-l border-slate-200 text-indigo-600" title="Задачи: Выполнено / В ожидании">Задачи (✅/🕒)</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Профессиональный Индекс (XP)">PI (Опыт)</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Количество инспекций">Объем</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Фото+Причина при дефекте">Доказательность</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Отклонение от среднего УрК. (+) - строгий">Строгость</th>
                            <th class="p-3 text-center border-l border-slate-200" title="Процент заполненных пунктов">Полнота</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
    `;

    stats.forEach(s => {
        const getColorClass = (val, thresholds, inverse = false) => {
            if (!inverse) {
                if (val >= thresholds[0]) return 'bg-green-50 text-green-700';
                if (val >= thresholds[1]) return 'bg-orange-50 text-orange-700';
                return 'bg-red-50 text-red-700 font-black';
            } else {
                if (val <= thresholds[0]) return 'bg-green-50 text-green-700';
                if (val <= thresholds[1]) return 'bg-orange-50 text-orange-700';
                return 'bg-red-50 text-red-700 font-black';
            }
        };

        const strictAbs = Math.abs(s.strictness);
        const strictClass = strictAbs <= 5 ? 'bg-green-50 text-green-700' : (strictAbs <= 10 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700 font-black');
        const strictText = s.strictness > 0 ? `+${s.strictness.toFixed(1)}` : `${s.strictness.toFixed(1)}`;

        const impactClass = s.avgImpact > 0.2 ? 'text-green-600 bg-green-50' : (s.avgImpact < -0.2 ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50');
        const impactIcon = s.avgImpact > 0.2 ? '📈' : (s.avgImpact < -0.2 ? '📉' : '➖');

        // Красим должников
        const debtClass = s.oldDebtWarning ? 'bg-red-50 text-red-700 border-red-300 font-black animate-pulse' : (s.totalDebt > 5 ? 'bg-orange-50 text-orange-700' : 'text-green-600');
        const vacationBadge = s.isVacation ? `<span class="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[8px] ml-1">ОТПУСК</span>` : '';

        html += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div class="font-black text-[12px] text-slate-800 truncate">${s.name} ${vacationBadge}</div>
                    <div class="text-[8px] font-bold text-slate-400 uppercase">Грейд ${s.level} | B3: ${s.b3Found} шт.</div>
                </td>
                <td class="p-3 text-center border-l border-slate-100 font-black ${impactClass}">
                    <div class="flex items-center justify-center gap-1">${impactIcon} ${s.avgImpact.toFixed(2)}</div>
                </td>
                <td class="p-3 text-center border-l border-slate-100 font-bold text-[11px]">
                    <span class="text-green-600" title="Улучшил подрядчиков">${s.improved}</span> / <span class="text-red-500" title="Ухудшил подрядчиков">${s.degraded}</span>
                </td>
                <td class="p-3 text-center border-l border-slate-100 font-bold ${debtClass}">
                    ${s.totalDebt}
                </td>
                <td class="p-3 text-center border-l border-slate-100 font-bold">
                    <span class="text-green-600">${s.tasksDone}</span> / <span class="text-slate-500">${s.tasksPending}</span>
                </td>
                <td class="p-3 text-center border-l border-slate-100 font-black text-indigo-600">${s.pi}</td>
                <td class="p-3 text-center border-l border-slate-100 font-bold text-slate-600">${s.checks}</td>
                <td class="p-3 text-center border-l border-slate-100 font-bold ${getColorClass(s.photoRate, [80, 50])}">${s.photoRate.toFixed(0)}%</td>
                <td class="p-3 text-center border-l border-slate-100 font-bold ${strictClass}">${strictText}</td>
                <td class="p-3 text-center border-l border-slate-100 font-bold ${getColorClass(s.completeness, [90, 70])}">${s.completeness.toFixed(0)}%</td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

window.gameOpenTaskDetails = function (statusKey, e) {
    if (e) e.stopPropagation();

    // Ищем задачу в плане
    const task = weeklyPlanData.tasks.find(t => t.statusKey === statusKey);
    if (!task) return;

    let st = contractorStatuses[statusKey];
    if (!st) { st = { status: 'active' }; contractorStatuses[statusKey] = st; }

    const safeStatusKeyForHtml = statusKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeContractor = task.contractor.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeProject = task.project.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    // Определяем тексты объяснений в зависимости от приоритета
    let logicTitle = ""; let logicDesc = ""; let logicColor = "";
    if (task.priorityLvl === 4) {
        logicTitle = "Критический риск (Авария)"; logicColor = "text-red-600 bg-red-50 border-red-200";
        logicDesc = "Подрядчик находится в красной зоне (УрК < 70%) или недавно допустил критический дефект B3. Система назначила максимальное количество проверок для жесткого контроля.";
    } else if (task.priorityLvl === 3) {
        logicTitle = "Новый подрядчик (Сбор данных)"; logicColor = "text-blue-600 bg-blue-50 border-blue-200";
        logicDesc = "Менее 7 проверок в базе. Система требует провести минимум 7 инспекций, чтобы рассчитать достоверный рейтинг надежности.";
    } else if (task.priorityLvl === 2) {
        logicTitle = "Желтая зона (Нестабильно)"; logicColor = "text-orange-600 bg-orange-50 border-orange-200";
        logicDesc = "УрК от 70% до 84%. Подрядчик допускает системный брак (повторение дефектов B2). Требуется умеренный контроль.";
    } else {
        logicTitle = "Зеленая зона (Стабильно)"; logicColor = "text-green-600 bg-green-50 border-green-200";
        logicDesc = "Высокое качество и стабильность. Достаточно 1 профилактической проверки в неделю.";
    }

    let pauseInfo = "";
    if (st.status === 'active') {
        pauseInfo = `<div class="text-[10px] text-slate-500 italic mb-4 text-center">Вы можете приостановить задачу, если подрядчик временно не работает на объекте.</div>`;
    }

    // Кнопки управления
    let actionsHtml = '';
    if (st.status === 'active') {
        actionsHtml += `
            <div id="ai-task-risk-${task.id}" class="mb-3">
                <button onclick="generateTaskRiskAi('${safeContractor}', '${task.templateKey}', 'ai-task-risk-${task.id}')" class="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform flex justify-center items-center gap-2 shadow-sm">
                    🔮 Оценить риски (ИИ)
                </button>
            </div>
            <button onclick="document.getElementById('task-details-modal').style.display='none'; gameStartTask('${safeContractor}', '${task.templateKey}')" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-95 transition-transform flex justify-center items-center gap-2 mb-3">
                ▶ Приступить к проверке
            </button>
            <div class="flex gap-2">
                <button onclick="gameChangeTaskStatus('${safeStatusKeyForHtml}', 'paused')" class="flex-1 flex justify-center items-center gap-2 p-3 rounded-xl bg-orange-50 text-orange-600 font-bold text-[10px] uppercase active:scale-95 border border-orange-200">
                    ⏸ Пауза
                </button>
                <button onclick="gameChangeTaskStatus('${safeStatusKeyForHtml}', 'completed')" class="flex-1 flex justify-center items-center gap-2 p-3 rounded-xl bg-green-50 text-green-600 font-bold text-[10px] uppercase active:scale-95 border border-green-200">
                    ✅ Завершить
                </button>
            </div>
        `;
    } else {
        actionsHtml += `
            <div class="text-[10px] text-slate-500 italic mb-4 text-center">Задача находится в архиве (на паузе или завершена вручную).</div>
            <button onclick="gameChangeTaskStatus('${safeStatusKeyForHtml}', 'active')" class="w-full bg-slate-100 text-slate-700 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform border border-slate-300">
                🔄 Возобновить задачу
            </button>
        `;
    }

    const html = `
        <div class="mb-4 text-center">
            <div class="text-[14px] font-black text-slate-800 dark:text-white leading-tight mb-1">${task.contractor}</div>
            <div class="text-[11px] font-bold text-slate-500">${task.templateTitle}</div>
        </div>

        <div class="bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 mb-4 flex justify-between items-center">
            <div>
                <div class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Прогресс выполнения</div>
                <div class="text-[14px] font-black text-slate-700 dark:text-slate-300"><span class="${task.done >= task.target ? 'text-green-500' : 'text-indigo-600'}">${task.done}</span> из ${task.target}</div>
            </div>
            <div class="text-right">
                <div class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Долги</div>
                <div class="text-[14px] font-black ${task.carryOverCount > 0 ? 'text-red-500' : 'text-green-500'}">${task.carryOverCount}</div>
            </div>
        </div>

        <div class="border border-[var(--card-border)] rounded-xl p-3 mb-4">
            <div class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Обоснование системы</div>
            <div class="text-[10px] font-black px-2 py-1 rounded border uppercase w-fit mb-2 ${logicColor}">${logicTitle}</div>
            <div class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">${logicDesc}</div>
        </div>

        ${pauseInfo}
        ${actionsHtml}
    `;

    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `<div class="flex justify-between items-center"><span>📋 Детали задачи</span><button onclick="document.getElementById('task-details-modal').style.display='none'" class="text-slate-400 hover:text-red-500 px-2 active:scale-90">✕</button></div>`;
    document.getElementById('task-details-body').innerHTML = html;

    document.getElementById('task-details-modal').style.display = 'flex';
};

// Функция запуска инспекции (с предзаполнением)
window.startInspectionWithValues = function (contractor, templateKey, statusKey = null, project = null, originalAuditId = null) {
    switchTab('tab-audit');
    changeTemplate(templateKey);

    // ИСПРАВЛЕНИЕ: Снимаем блокировку скролла от модальных окон!
    document.body.classList.remove('modal-open');

    // Очищаем предыдущий аудит
    auditOriginalData = null;

    setTimeout(async () => {
        const contrInput = document.getElementById('inp-contractor');
        if (contrInput && !contrInput.hasAttribute('readonly')) contrInput.value = contractor;

        const projInput = document.getElementById('inp-project');
        if (projInput && !projInput.hasAttribute('readonly')) {
            if (project) {
                projInput.value = project;
            } else {
                const pastCheck = contractorArray.find(c => c.contractorName === contractor && c.templateKey === templateKey);
                if (pastCheck && pastCheck.projectName) projInput.value = pastCheck.projectName;
            }
        }

        ['inp-location', 'inp-section', 'inp-floor', 'inp-room'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

        if (statusKey) {
            const selEl = document.getElementById('checklist-selector');
            if (selEl) selEl.dataset.pendingStatusKey = statusKey;

            const task = weeklyPlanData?.tasks?.find(t => t.statusKey === statusKey);

            // 1. ЛОГИКА ЭТАПНЫХ ЗАДАЧ (MILESTONE) - Предзаполнение галочек
            if (task && task.type === 'milestone') {
                const instanceId = task.priority.replace('Этап (', '').replace(')', '');
                const parts = instanceId.split(' ');
                if (parts.length >= 2) {
                    const secInput = document.getElementById('inp-section');
                    const floorInput = document.getElementById('inp-floor');
                    if (secInput) secInput.value = parts[0];
                    if (floorInput) floorInput.value = parts[1];
                    updateLocationFromStructured();

                    const lastCheck = contractorArray.find(c => c.contractorName === contractor && c.templateKey === templateKey && c.instanceId === `${parts[0].replace(/\D/g, '')}_${parts[1].replace(/\D/g, '')}`);
                    if (lastCheck && lastCheck.state) {
                        state = JSON.parse(JSON.stringify(lastCheck.state));
                        details = JSON.parse(JSON.stringify(lastCheck.details || {}));
                        photos = JSON.parse(JSON.stringify(lastCheck.photos || {}));
                        showToast("📥 Предзагружены данные прошлого обхода этого этапа");
                    }
                }
            }

            // 2. ЛОГИКА ЭТАЛОНА ("Было/Стало")
            if (task && task.needsEtalon) {
                // Ищем, был ли БРАК у этого подрядчика по этому виду работ раньше
                const pastFailCheck = contractorArray.find(c => c.contractorName === contractor && c.templateKey === templateKey && c.metrics && c.metrics.n_B3_fail > 0);
                if (pastFailCheck) {
                    auditOriginalData = { isEtalonCompare: true, photos: pastFailCheck.photos, state: pastFailCheck.state };
                    showToast("🔍 Режим Эталона: Подгружены старые фото брака для сравнения 'Было/Стало'");
                }
            }
        }

        // 3. ЛОГИКА ПЕРЕКРЕСТНОГО АУДИТА (Панель Руководителя)
        if (originalAuditId) {
            const originalCheck = contractorArray.find(c => c.id === originalAuditId);
            if (originalCheck) {
                auditOriginalData = { isCrossAudit: true, state: originalCheck.state, photos: originalCheck.photos, inspector: originalCheck.inspectorName };

                // Предзаполняем локацию, чтобы аудит был в том же месте
                ['inp-section', 'inp-floor', 'inp-room'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && originalCheck[id.replace('inp-', '')]) el.value = originalCheck[id.replace('inp-', '')];
                });
                updateLocationFromStructured();

                showToast(`⚖️ Режим Аудита: Вы проверяете работу инспектора ${originalCheck.inspectorName}`);
            }
        }

        render();
        if (typeof updateDataSummary === 'function') updateDataSummary();

        setTimeout(() => {
            const headerEl = document.getElementById('main-header');
            const offset = headerEl ? headerEl.offsetHeight : 140;
            window.scrollTo({ top: offset - 60, behavior: 'smooth' });
            if (typeof updateBodyPadding === 'function') updateBodyPadding();
        }, 50);
    }, 150);
};

window.gameChangeTaskStatus = function (statusKey, newStatus) {
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
// Интеграция старта задачи
window.gameStartTask = function (contractor, templateKey) {
    // Обычный старт задачи (без блокировки эталоном)
    startInspectionWithValues(contractor, templateKey);
};

// === ТАБЛИЦА ЛИДЕРОВ (РЕЙТИНГ ИНЖЕНЕРОВ) ===
window.gameOpenTopModal = function () {
    let sortedProfiles = [];
    const myName = document.getElementById('inp-inspector')?.value.trim() || 'Неизвестный инспектор';

    if (window.serverGlobalRating && Array.isArray(window.serverGlobalRating)) {
        sortedProfiles = window.serverGlobalRating.sort((a, b) => b.pi - a.pi);
    } else if (window.allProfilesData) {
        sortedProfiles = Object.values(window.allProfilesData).sort((a, b) => b.pi - a.pi);
    }

    if (sortedProfiles.length === 0) return showToast('Нет данных для рейтинга');

    let html = `<div class="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">`;

    if (window.serverGlobalRating) {
        html += `<div class="text-[10px] text-center text-slate-500 font-bold mb-3 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 py-1 rounded">Глобальный рейтинг сервера</div>`;
    }

    sortedProfiles.forEach((p, idx) => {
        const isMe = p.name === myName;
        const isGold = idx === 0; const isSilver = idx === 1; const isBronze = idx === 2;

        let rankClass = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        if (isGold) rankClass = 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-500 shadow-md';
        else if (isSilver) rankClass = 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-400 shadow-sm';
        else if (isBronze) rankClass = 'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-600 shadow-sm';

        let bgClass = isMe ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600 shadow-sm' : 'bg-[var(--card-bg)] border-[var(--card-border)]';

        // ИСПРАВЛЕНИЕ: Ищем ТОП-3 бейджа этого инженера
        let badgesHtml = '';
        if (p.badgesData) {
            let activeBadges = [];
            COMPETENCIES.forEach(b => {
                const progress = p.badgesData[b.id] || 0;
                const tier = getBadgeTier(b, progress);
                if (tier > 0) activeBadges.push({ id: b.id, tier });
            });
            activeBadges.sort((a, b) => b.tier - a.tier); // Самые редкие вперед
            badgesHtml = activeBadges.slice(0, 3).map(b => `<div class="w-5 h-5" title="Тир ${b.tier}">${getBadgeSvg(b.id, b.tier, "w-5 h-5")}</div>`).join('');
        }

        html += `
        <div class="p-3 border rounded-xl flex items-center justify-between transition-all ${bgClass}">
            <div class="flex items-center gap-3 min-w-0 pr-2">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 border ${rankClass}">${idx + 1}</div>
                <div class="min-w-0">
                    <div class="font-black text-[12px] text-slate-800 dark:text-white truncate ${isMe ? 'text-indigo-700 dark:text-indigo-400' : ''}">${p.name} ${isMe ? '(Вы)' : ''}</div>
                    <div class="flex items-center gap-1.5 mt-0.5">
                        <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">${p.levelObj.name}</div>
                        <div class="flex gap-0.5 ml-2 border-l border-slate-300 dark:border-slate-600 pl-2">${badgesHtml}</div>
                    </div>
                </div>
            </div>
            <div class="shrink-0 text-right">
                <div class="text-[14px] font-black text-indigo-600 dark:text-indigo-400 leading-none">${p.pi}</div>
                <div class="text-[8px] font-bold text-slate-400 uppercase mt-1">XP</div>
            </div>
        </div>`;
    });
    html += `</div>`;

    document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl">🏆</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Таблица лидеров</div>`;
    document.getElementById('modal-body').innerHTML = html;

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

// === МОДАЛКА ДЕТАЛИЗАЦИИ ВЛИЯНИЯ (IMPACT SCORE) ===
window.gameOpenImpactModal = function () {
    if (!window.currentProfileData) return;

    const myProfile = window.currentProfileData;
    let totalImpact = 0; let impactCount = 0;
    const detailsHtml = [];

    // Собираем детализацию по каждому подрядчику инженера
    const contractorsSet = new Set(myProfile.rawChecks.map(c => c.contractorName));
    contractorsSet.forEach(cName => {
        const cChecks = myProfile.rawChecks.filter(c => c.contractorName === cName);
        if (cChecks.length < 6) return;

        const templatesCount = {};
        cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey] || 0) + 1);
        const topTemplate = Object.keys(templatesCount).sort((a, b) => templatesCount[b] - templatesCount[a])[0];
        const templateTitle = cChecks.find(c => c.templateKey === topTemplate)?.templateTitle || 'Вид работ';

        const impact = calculateImpactScore(myProfile.name, cName, topTemplate);
        if (impact.score !== 0 || impact.trend !== 'Недостаточно данных') {
            totalImpact += impact.score;
            impactCount++;

            let badge = impact.score > 0 ? 'bg-green-100 text-green-700 border-green-200' : (impact.score < 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200');
            let icon = impact.score > 0 ? '📈' : (impact.score < 0 ? '📉' : '➖');

            detailsHtml.push(`
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl mb-2 flex justify-between items-center shadow-sm">
                    <div class="min-w-0 flex-1 pr-2">
                        <div class="text-[12px] font-black text-slate-800 dark:text-white truncate">${cName}</div>
                        <div class="text-[9px] text-slate-500 font-bold uppercase truncate">${templateTitle}</div>
                        <div class="text-[10px] text-slate-600 dark:text-slate-400 mt-1">Базовый УрК: <b>${impact.baseUrk}%</b> ➔ Стал: <b>${impact.currUrk}%</b></div>
                    </div>
                    <div class="shrink-0 text-right">
                        <div class="text-[14px] font-black ${impact.color}">${impact.score > 0 ? '+' : ''}${impact.score.toFixed(2)}</div>
                        <div class="text-[9px] font-bold px-1.5 py-0.5 rounded border mt-1 ${badge}">${icon} ${impact.trend}</div>
                    </div>
                </div>
            `);
        }
    });

    const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;

    let html = `
        <div class="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl mb-4 shadow-sm text-indigo-900 dark:text-indigo-200 text-[11px] leading-relaxed">
            <b>Impact Score</b> оценивает вашу эффективность как инженера. Система сравнивает качество работы подрядчика на первых 3-х ваших проверках и на 3-х последних.<br><br>Если после ваших предписаний и TWI-карт УрК и стабильность подрядчика выросли, а доля брака B3 упала — ваш счет растет.
        </div>
        
        <div class="flex justify-between items-center bg-[var(--hover-bg)] p-3 rounded-xl border border-[var(--card-border)] mb-4">
            <div class="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Средний показатель:</div>
            <div class="text-[18px] font-black ${avgImpact > 0 ? 'text-green-600' : (avgImpact < 0 ? 'text-red-600' : 'text-slate-600')}">${avgImpact > 0 ? '+' : ''}${avgImpact.toFixed(2)}</div>
        </div>

        <div class="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-2 pl-1 border-b border-[var(--card-border)] pb-2">Детализация по подрядчикам</div>
        <div class="max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
            ${detailsHtml.length > 0 ? detailsHtml.join('') : '<div class="text-center text-slate-400 font-bold text-[10px] uppercase py-4">Слишком мало данных. Нужно проверить одного подрядчика минимум 6 раз.</div>'}
        </div>
    `;

    document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl">🎯</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Ваше влияние (Impact)</div>`;
    document.getElementById('modal-body').innerHTML = html;

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

// Функция обновления единого имени инженера из Профиля
window.gameUpdateEngineerName = function (newName) {
    const cleanName = newName.trim();
    if (!cleanName) return showToast("⚠️ Имя не может быть пустым!");

    // Сохраняем глобально
    if (typeof appSettings !== 'undefined') {
        appSettings.engineerName = cleanName;
        dbPut(STORES.SETTINGS, { key: 'user_prefs', ...appSettings });
    }

    // Обновляем скрытое поле в шапке осмотра
    const inpInspector = document.getElementById('inp-inspector');
    if (inpInspector) inpInspector.value = cleanName;

    // Обновляем в настройках синхронизации
    if (typeof window.syncConfig !== 'undefined') {
        window.syncConfig.engineerName = cleanName;
        localStorage.setItem('rbi_sync_config', JSON.stringify(window.syncConfig));
    }

    showToast("✅ Профиль обновлен!");

    // Перерисовываем дашборд, чтобы обновилась аватарка (буква имени)
    setTimeout(() => { gameRenderDashboard(); }, 200);
};

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

/* ============================================================================ */
/* RBI NEW: МОДУЛЬ FMEA-АНАЛИЗА (МЕГА-ТАБЛИЦА И РЕЕСТР)                         */
/* ============================================================================ */

// 1. РЕЕСТР FMEA И ПАНЕЛЬ УПРАВЛЕНИЯ
window.rbi_renderFmeaHistory = function () {
    const container = document.getElementById('rbi-fmea-container');
    if (!container) return;

    // Кнопки управления и фильтры
    let headerHtml = `
        <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-2xl p-4 shadow-sm mb-4">
            <div class="flex justify-between items-center mb-3">
                <div>
                    <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white">Новый FMEA-Анализ</h2>
                    <p class="text-[10px] text-slate-500 font-bold mt-0.5">В таблицу попадут только дефекты B2/B3, повторившиеся более 3 раз за выбранный период.</p>
                </div>
            </div>
            <div class="flex gap-2 items-end">
                <div class="flex-1">
                    <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Период анализа</label>
                    <select id="fmea-period-select" class="input-base !py-2.5 text-[11px] font-bold">
                        <option value="WEEK">За последние 7 дней (Неделя)</option>
                        <option value="MONTH">За последние 30 дней (Месяц)</option>
                        <option value="QUARTER">За последние 90 дней (Квартал)</option>
                    </select>
                </div>
                <button onclick="rbi_generateFmeaTable()" class="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> 
                    Сформировать таблицу
                </button>
            </div>
        </div>
        
        <div id="fmea-workspace" class="mb-4"></div>

        <div class="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Архив проведенных FMEA</div>
        <div id="fmea-registry-list" class="space-y-3 pb-8"></div>
    `;

    container.innerHTML = headerHtml;
    rbi_renderFmeaRegistry();
};

window.rbi_renderFmeaRegistry = function() {
    const listContainer = document.getElementById('fmea-registry-list');
    if (!listContainer) return;

    if (!window.rbi_fmeaRecords || window.rbi_fmeaRecords.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Архив пуст</div>`;
        return;
    }

    // Скрываем удаленные, отсекаем призраков и чужие объекты
    const sorted = [...window.rbi_fmeaRecords]
        .filter(f => f && f.id && !f._deleted && f.date && f.title && f.defects) // <-- Строго проверяем, что это FMEA
        .sort((a,b) => new Date(b.date) - new Date(a.date));
    listContainer.innerHTML = sorted.map(f => `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex flex-col gap-2">
            <div class="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg flex items-center justify-center font-black text-sm">📊</div>
                    <div>
                        <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight">${f.title}</div>
                        <div class="text-[9px] font-bold text-slate-500">Период: ${f.periodName} | Разобрано дефектов: ${(f.defects || []).length}</div>
                    </div>
                </div>
                <div class="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                    ${new Date(f.date).toLocaleDateString('ru-RU')}
                </div>
            </div>
            <div class="flex gap-2 pt-1">
                <button onclick="rbi_printFmeaPdf('${f.id}')" class="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center justify-center gap-1">👁️ Просмотр</button>
                <button onclick="rbi_loadFmeaToWorkspace('${f.id}')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center justify-center gap-1">✏️ Изменить</button>
                <button onclick="rbi_deleteFmea('${f.id}')" class="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg active:scale-95 shadow-sm transition-colors">🗑️</button>
            </div>
        </div>
        </div>
    `).join('');
};

window.rbi_deleteFmea = async function(id) {
    if(!confirm("Удалить этот FMEA отчет?")) return;
    const record = window.rbi_fmeaRecords.find(m => String(m.id) === String(id));
    if (record) {
        record._deleted = true;
        record.updatedAt = new Date().toISOString();
        await dbPut(STORES.FMEA, record);
        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    }
    rbi_renderFmeaRegistry();
    showToast("🗑️ Отчет удален");
};

// НОВАЯ ФУНКЦИЯ: Загрузка FMEA в черновик для редактирования
window.rbi_loadFmeaToWorkspace = function(id) {
    const record = window.rbi_fmeaRecords.find(m => m.id === id);
    if (!record) return;
    
    window.currentEditingFmeaId = id; // Глобально запоминаем ID

    let rowsHtml = record.defects.map((def, idx) => {
        const photoHtml = def.photo ? `<img src="${window.getPhotoSrc(def.photo)}" class="w-12 h-12 object-cover rounded border border-slate-300 mt-1 cursor-pointer" onclick="openPhotoViewer('${def.photo}')">` : '';
        return `
        <tr class="fmea-row bg-white hover:bg-purple-50/30 transition-colors" data-idx="${idx}">
            <input type="hidden" class="f-contr" value="${def.contractor}">
            <input type="hidden" class="f-work" value="${def.workTitle}">
            <input type="hidden" class="f-defect" value="${def.defectName}">
            <input type="hidden" class="f-photo" value="${def.photo || ''}">
            <input type="hidden" class="f-count" value="${def.count}">
            
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[150px]">
                <div class="text-[9px] font-bold text-slate-400 uppercase leading-tight mb-0.5">${def.workTitle}</div>
                <div class="text-[11px] font-black text-slate-800 dark:text-white leading-tight mb-1">${def.contractor}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-snug">
                    <b>${def.defectName}</b> (${def.count} раз)
                </div>
                ${photoHtml}
            </td>
            <td class="p-2 border border-slate-200 align-top min-w-[120px]">
                <select class="f-stage input-base !py-1.5 !text-[10px] font-bold w-full bg-slate-50">
                    <option value="Ошибки СМР" ${def.stage === 'Ошибки СМР' ? 'selected' : ''}>Ошибки СМР</option>
                    <option value="Проект" ${def.stage === 'Проект' ? 'selected' : ''}>Проектная ошибка</option>
                    <option value="Материалы" ${def.stage === 'Материалы' ? 'selected' : ''}>Материалы / Завод</option>
                    <option value="Условия" ${def.stage === 'Условия' ? 'selected' : ''}>Внешние условия</option>
                </select>
            </td>
            <td class="p-2 border border-slate-200 align-top min-w-[180px]">
                <textarea class="f-cause input-base w-full h-20 resize-none text-[10px] p-2" placeholder="Коренная причина...">${def.cause || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 align-top min-w-[180px]">
                <textarea class="f-effect input-base w-full h-20 resize-none text-[10px] p-2" placeholder="Последствия (Риски)...">${def.effect || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 align-top min-w-[180px]">
                <textarea class="f-fix input-base w-full h-20 resize-none text-[10px] p-2 bg-blue-50" placeholder="Как устранить сейчас...">${def.fix || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 align-top min-w-[180px]">
                <textarea class="f-prevent input-base w-full h-20 resize-none text-[10px] p-2 bg-green-50" placeholder="Системное предотвращение...">${def.prevent || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 align-top min-w-[80px]">
                <div class="text-center">
                    <div class="text-[8px] font-bold text-slate-400 mb-1">RPN</div>
                    <input type="number" class="f-rpn input-base text-center font-black text-lg text-purple-700 !py-2" placeholder="0" value="${def.rpn || 0}">
                </div>
            </td>
        </tr>`;
    }).join('');

    const workspace = document.getElementById('fmea-workspace');
    workspace.innerHTML = `
        <div class="bg-white border border-purple-300 rounded-2xl shadow-sm p-4 mb-4">
            <div class="flex justify-between items-center mb-3">
                <div class="text-[11px] font-black text-purple-700 uppercase tracking-widest">
                    Редактирование: ${record.title}
                </div>
            </div>
            <div class="overflow-x-auto custom-scrollbar border border-slate-200 rounded-xl">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-500 uppercase text-[9px] font-bold">
                            <th class="p-2 border border-slate-200">1. Подрядчик / Проблема</th>
                            <th class="p-2 border border-slate-200">2. Этап возникновения</th>
                            <th class="p-2 border border-slate-200">3. Коренная причина</th>
                            <th class="p-2 border border-slate-200">4. Последствия</th>
                            <th class="p-2 border border-slate-200 text-blue-600">5. Устранение (Fix)</th>
                            <th class="p-2 border border-slate-200 text-green-600">6. Предотвращение</th>
                            <th class="p-2 border border-slate-200 text-purple-600 text-center">7. RPN</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            <button onclick="rbi_saveFmea('${record.periodName}')" class="w-full mt-4 bg-purple-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                💾 Сохранить изменения
            </button>
        </div>
    `;
    
    rbi_renderFmeaRegistry(); // Перерисовываем архив, чтобы убрать открытый файл
    window.scrollTo({top: 0, behavior: 'smooth'});
    showToast("Отчет открыт для редактирования");
};

// 2. ГЕНЕРАЦИЯ МЕГА-ТАБЛИЦЫ
window.rbi_generateFmeaTable = function () {
    const workspace = document.getElementById('fmea-workspace');
    const periodVal = document.getElementById('fmea-period-select').value;
    
    let days = 7; let periodName = "Неделя";
    if (periodVal === 'MONTH') { days = 30; periodName = "Месяц"; }
    if (periodVal === 'QUARTER') { days = 90; periodName = "Квартал"; }

    const d = new Date();
    const startDate = new Date(d); startDate.setDate(startDate.getDate() - days);
    
    // Фильтруем проверки за период
    const periodChecks = contractorArray.filter(c => new Date(c.date) >= startDate);

    let defectsCountMap = {}; // Считаем повторения
    let defectsDataMap = {};  // Храним данные для рендера

    periodChecks.forEach(c => {
        if (c.state && c.templateKey) {
            Object.keys(c.state).forEach(id => {
                if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                    const flat = getFlatList(userTemplates[c.templateKey.replace('user_', '')]?.groups || SYSTEM_TEMPLATES[c.templateKey.replace('sys_', '')]?.groups);
                    const item = flat.find(x => x.id == id);
                    
                    if (item && (item.w === 3 || item.w === 2 || c.state[id] === 'fail_escalated')) {
                        const uniqueKey = `${c.contractorName}_${item.n}`;
                        
                        if (!defectsCountMap[uniqueKey]) {
                            defectsCountMap[uniqueKey] = 0;
                            defectsDataMap[uniqueKey] = {
                                contractor: c.contractorName,
                                workTitle: c.templateTitle,
                                defectName: item.n,
                                isB3: c.state[id] === 'fail_escalated' || item.w === 3,
                                photo: c.photos && c.photos[id] ? c.photos[id] : null
                            };
                        }
                        defectsCountMap[uniqueKey]++;
                        // Обновляем фото, если появилось новое
                        if (c.photos && c.photos[id]) defectsDataMap[uniqueKey].photo = c.photos[id];
                    }
                }
            });
        }
    });

    const FMEA_THRESHOLD = 3; // Порог повторений для попадания в FMEA
    
    const finalDefects = [];
    for (let key in defectsCountMap) {
        if (defectsCountMap[key] >= FMEA_THRESHOLD) {
            const def = defectsDataMap[key];
            def.count = defectsCountMap[key];
            
            // Проверка на "Повторный" (Был ли он уже в архивных FMEA?)
            def.isRepeated = false;
            window.rbi_fmeaRecords.forEach(f => {
                if (f.defects.some(d => d.contractor === def.contractor && d.defectName === def.defectName)) {
                    def.isRepeated = true;
                }
            });

            finalDefects.push(def);
        }
    }

    if (finalDefects.length === 0) {
        workspace.innerHTML = `<div class="text-center py-6 text-green-600 font-bold text-[11px] uppercase bg-green-50 rounded-xl border border-green-200 shadow-sm mb-4">Системных дефектов (>${FMEA_THRESHOLD} повторений) за период не найдено. Идеально!</div>`;
        return;
    }

    finalDefects.sort((a, b) => b.count - a.count); // Самые частые сверху

    // Рендер строк мега-таблицы
    let rowsHtml = finalDefects.map((def, idx) => {
        const photoHtml = def.photo ? `<img src="${window.getPhotoSrc(def.photo)}" class="w-12 h-12 object-cover rounded border border-slate-300 mt-1 cursor-pointer" onclick="openPhotoViewer('${def.photo}')">` : '';
        const repeatedTag = def.isRepeated ? `<div class="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded uppercase font-black w-fit mt-1 animate-pulse">Повторный</div>` : '';
        
        return `
        <tr class="fmea-row bg-white hover:bg-purple-50/30 transition-colors" data-idx="${idx}">
            <input type="hidden" class="f-contr" value="${def.contractor}">
            <input type="hidden" class="f-work" value="${def.workTitle}">
            <input type="hidden" class="f-defect" value="${def.defectName}">
            <input type="hidden" class="f-photo" value="${def.photo || ''}">
            <input type="hidden" class="f-count" value="${def.count}">
            
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[150px]">
                <div class="text-[9px] font-bold text-slate-400 uppercase leading-tight mb-0.5">${def.workTitle}</div>
                <div class="text-[11px] font-black text-slate-800 dark:text-white leading-tight mb-1">${def.contractor}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-snug">
                    ${def.isB3 ? '<span class="bg-red-600 text-white px-1 rounded mr-1 font-bold">B3</span>' : ''}
                    <b>${def.defectName}</b> (${def.count} раз)
                </div>
                ${repeatedTag}
                ${photoHtml}
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[120px]">
                <select class="f-stage input-base !py-1.5 !text-[10px] font-bold w-full bg-slate-50">
                    <option value="Ошибки СМР">Ошибки СМР</option>
                    <option value="Проект">Проектная ошибка</option>
                    <option value="Материалы">Материалы / Завод</option>
                    <option value="Условия">Внешние условия</option>
                </select>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-cause input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed" placeholder="Коренная причина..."></textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-effect input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed" placeholder="Последствия (Риски)..."></textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-fix input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed bg-blue-50" placeholder="Как устранить сейчас..."></textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-prevent input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed bg-green-50" placeholder="Системное предотвращение..."></textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[80px]">
                <div class="text-center">
                    <div class="text-[8px] font-bold text-slate-400 mb-1">RPN (1-1000)</div>
                    <input type="number" class="f-rpn input-base text-center font-black text-lg text-purple-700 !py-2" placeholder="0" min="1" max="1000">
                </div>
            </td>
        </tr>
    `;
    }).join('');

    workspace.innerHTML = `
        <div class="bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-2xl shadow-sm p-4 animate-fadeIn mb-4">
            <div class="flex justify-between items-center mb-3">
                <div class="text-[11px] font-black text-purple-700 uppercase tracking-widest">
                    Черновик FMEA (${periodName})
                </div>
                <button onclick="rbi_fillFmeaWithAi()" id="btn-fmea-ai" class="bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform flex items-center gap-1.5">
                    🤖 Автозаполнение (ИИ)
                </button>
            </div>
            
            <div class="overflow-x-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-xl">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase text-[9px] font-bold tracking-wider">
                            <th class="p-2 border border-slate-200 dark:border-slate-700">1. Подрядчик / Проблема</th>
                            <th class="p-2 border border-slate-200 dark:border-slate-700">2. Этап возникновения</th>
                            <th class="p-2 border border-slate-200 dark:border-slate-700">3. Коренная причина</th>
                            <th class="p-2 border border-slate-200 dark:border-slate-700">4. Последствия (Риски)</th>
                            <th class="p-2 border border-slate-200 dark:border-slate-700 text-blue-600">5. Устранение (Fix)</th>
                            <th class="p-2 border border-slate-200 dark:border-slate-700 text-green-600">6. Предотвращение</th>
                            <th class="p-2 border border-slate-200 dark:border-slate-700 text-purple-600 text-center">7. RPN</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            
            <button onclick="rbi_saveFmea('${periodName}')" class="w-full mt-4 bg-purple-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                💾 Сохранить отчет в Систему
            </button>
        </div>
    `;
};

// 3. АВТОЗАПОЛНЕНИЕ FMEA ЧЕРЕЗ DEEPSEEK
window.rbi_fillFmeaWithAi = async function () {
    if (!appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const rows = document.querySelectorAll('.fmea-row');
    if (rows.length === 0) return;

    const btn = document.getElementById('btn-fmea-ai');
    btn.innerHTML = `<span class="animate-pulse">⏳ Нейросеть думает...</span>`;
    btn.disabled = true;

    let defectsContext = [];
    rows.forEach((row, idx) => {
        const contr = row.querySelector('.f-contr').value;
        const work = row.querySelector('.f-work').value;
        const defect = row.querySelector('.f-defect').value;
        defectsContext.push(`ID ${idx}: Подрядчик [${contr}], Работа [${work}], Дефект [${defect}].`);
    });

    const promptSystem = `Ты — Главный Инженер Качества. Проведи FMEA-анализ (Анализ видов и последствий отказов) списка частых дефектов.
    Твоя задача — вернуть строго JSON-массив. Для каждого дефекта (по его ID) сформируй объект с ключами:
    "stage" - этап возникновения (выбери одно: "Ошибки СМР", "Проект", "Материалы", "Условия").
    "cause" - коренная причина дефекта (почему рабочие так делают? 1 предложение).
    "effect" - последствия дефекта для здания (1 предложение).
    "fix" - предложение по устранению уже допущенного брака (1 предложение).
    "prevent" - системная мера по предотвращению в будущем (1 предложение).
    "rpn" - число Risk Priority Number от 1 до 1000 (Severity * Occurrence * Detection). Чем опаснее дефект, тем выше RPN.`;

    try {
        const responseText = await window.callAI([
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Анализируй эти дефекты и верни массив JSON (порядок как в списке):\n${defectsContext.join('\n')}` }
        ], { temperature: 0.3, max_tokens: 2000 });

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Нейросеть не вернула JSON");

        const aiData = JSON.parse(jsonMatch[0]);

        rows.forEach((row, idx) => {
            if (aiData[idx]) {
                const data = aiData[idx];
                const stageSel = row.querySelector('.f-stage');
                if (Array.from(stageSel.options).some(opt => opt.value === data.stage)) {
                    stageSel.value = data.stage;
                }
                row.querySelector('.f-cause').value = data.cause || '';
                row.querySelector('.f-effect').value = data.effect || '';
                row.querySelector('.f-fix').value = data.fix || '';
                row.querySelector('.f-prevent').value = data.prevent || '';
                row.querySelector('.f-rpn').value = data.rpn || 0;
            }
        });

        if (typeof gameLogAction === 'function') gameLogAction('fmea_master', 'ai_table');
        showToast("✨ Мега-таблица FMEA заполнена нейросетью!");
    } catch (e) {
        showToast("❌ Ошибка ИИ (попробуйте еще раз): " + e.message);
    } finally {
        btn.innerHTML = `🤖 Автозаполнение (ИИ)`;
        btn.disabled = false;
    }
};

// 4. СОХРАНЕНИЕ FMEA В БАЗУ
window.rbi_saveFmea = async function(periodName) {
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return showToast("В демо-режиме сохранение отключено");
    
    const rows = document.querySelectorAll('.fmea-row');
    const defects = [];
    
    rows.forEach(row => {
        defects.push({
            contractor: row.querySelector('.f-contr').value,
            workTitle: row.querySelector('.f-work').value,
            defectName: row.querySelector('.f-defect').value,
            photo: row.querySelector('.f-photo').value,
            count: row.querySelector('.f-count').value,
            stage: row.querySelector('.f-stage').value,
            cause: row.querySelector('.f-cause').value.trim(),
            effect: row.querySelector('.f-effect').value.trim(),
            fix: row.querySelector('.f-fix').value.trim(),
            prevent: row.querySelector('.f-prevent').value.trim(),
            rpn: row.querySelector('.f-rpn').value
        });
    });

    let fmeaId = window.currentEditingFmeaId || ('fmea_' + Date.now().toString(36));

    const fmeaRecord = {
        id: fmeaId,
        date: new Date().toISOString(),
        author: document.getElementById('inp-inspector')?.value || 'Инженер',
        title: `FMEA Анализ от ${new Date().toLocaleDateString('ru-RU')}`,
        periodName: periodName,
        defects: defects,
        updatedAt: new Date().toISOString()
    };

    // Обновляем массив без дубликатов
    const idx = window.rbi_fmeaRecords.findIndex(x => String(x.id) === String(fmeaId));
    if (idx >= 0) window.rbi_fmeaRecords[idx] = fmeaRecord;
    else window.rbi_fmeaRecords.push(fmeaRecord);

    await dbPut(STORES.FMEA, fmeaRecord);
    window.currentEditingFmeaId = null; // Сбрасываем ID

    window.rbi_fmeaRecords.push(fmeaRecord);
    await dbPut(STORES.FMEA, fmeaRecord);
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    
    document.getElementById('fmea-workspace').innerHTML = '';
    
    // АВТОЗАКРЫТИЕ ЗАДАЧИ FMEA В ПЛАНИРОВЩИКЕ
    if (typeof window.rbi_tasksData !== 'undefined') {
        const fmeaTask = window.rbi_tasksData.find(t => t.title.includes('FMEA') && t.status === 'pending');
        if (fmeaTask) {
            fmeaTask.status = 'done';
            fmeaTask.resultComment = 'Отчет сохранен в базу';
            fmeaTask.updatedAt = new Date().toISOString();
            await dbPut('rbi_tasks', fmeaTask);
        }
    }

    showToast("💾 FMEA Отчет сохранен! Задача выполнена.");
    rbi_renderFmeaRegistry();
    if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
};

// 5. ПЕЧАТЬ FMEA В PDF (АЛЬБОМНАЯ ОРИЕНТАЦИЯ A3)
window.rbi_printFmeaPdf = function(fmeaId) {
    const record = window.rbi_fmeaRecords.find(f => f.id === fmeaId);
    if (!record) return showToast("Запись не найдена");

    // Сортируем по RPN (Самые опасные сверху)
    const sortedDefects = [...record.defects].sort((a,b) => (parseInt(b.rpn) || 0) - (parseInt(a.rpn) || 0));

    let rowsHtml = sortedDefects.map(d => {
        let photoHtml = d.photo ? `<div style="margin-top:5px; height:60px; overflow:hidden; border-radius:4px;"><img src="${window.getPhotoSrc(d.photo)}" style="width:100%; height:100%; object-fit:cover;"></div>` : '';
        
        let rpnColor = '#16a34a'; // Зеленый
        if (d.rpn >= 300) rpnColor = '#d97706'; // Оранжевый
        if (d.rpn >= 600) rpnColor = '#dc2626'; // Красный

        return `
        <tr style="border-bottom: 1px solid #cbd5e1; background: white;">
            <td style="padding: 10px; border-right: 1px solid #e2e8f0; vertical-align: top;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">${d.workTitle}</div>
                <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 2px;">${d.contractor}</div>
                <div style="font-size: 11px; color: #b91c1c; font-weight: bold; margin-top: 4px;">${d.defectName} (Повторов: ${d.count})</div>
                ${photoHtml}
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
    }).join('');

    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">Анализ видов и последствий отказов (FMEA)</h1>
            <div style="font-size: 14px; color: #64748b; font-weight: bold; margin-top: 5px;">Отчет: ${record.title} | Период: ${record.periodName} | Инженер: ${record.author}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid #cbd5e1;">
            <thead style="background: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #475569;">
                <tr>
                    <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 18%; text-align: left;">1. Проблема / Подрядчик</th>
                    <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 18%; text-align: left;">2. Коренная причина</th>
                    <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 18%; text-align: left;">3. Риски и последствия</th>
                    <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 18%; text-align: left; color: #1d4ed8;">4. Устранение</th>
                    <th style="padding: 12px 10px; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; width: 20%; text-align: left; color: #166534;">5. Системное Предотвращение</th>
                    <th style="padding: 12px 10px; border-bottom: 2px solid #cbd5e1; width: 8%; text-align: center; color: #7e22ce;">RPN</th>
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

    printPdfShell(`FMEA Анализ`, content, "A3", "landscape", "browser");
};