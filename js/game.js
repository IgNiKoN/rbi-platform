/* Файл: js/game.js (RBI Quality - Премиальная Геймификация + HR Аналитика) */

let gameActionLogs = []; 

// === ГРЕЙДЫ И ЦВЕТОВЫЕ ТИРЫ (РАНГИ) ===
const PI_GRADES = [
    { level: 1, name: "Стажёр качества", xpMin: 0, xpMax: 200, color: "from-slate-400 to-slate-500", ring: "ring-slate-400" },
    { level: 2, name: "Инженер контроля", xpMin: 200, xpMax: 600, color: "from-slate-500 to-slate-600", ring: "ring-slate-500" },
    { level: 3, name: "Старший инженер", xpMin: 600, xpMax: 1200, color: "from-amber-600 to-orange-500", ring: "ring-orange-500" },
    { level: 4, name: "Ведущий аудитор", xpMin: 1200, xpMax: 2500, color: "from-amber-600 to-orange-500", ring: "ring-orange-500" },
    { level: 5, name: "Эксперт процессов", xpMin: 2500, xpMax: 4000, color: "from-indigo-500 to-blue-500", ring: "ring-indigo-500" },
    { level: 6, name: "Главный эксперт", xpMin: 4000, xpMax: 6000, color: "from-indigo-500 to-blue-500", ring: "ring-indigo-500" },
    { level: 7, name: "Мастер качества", xpMin: 6000, xpMax: 9000, color: "from-yellow-400 to-yellow-600", ring: "ring-yellow-500" },
    { level: 8, name: "Амбассадор TWI", xpMin: 9000, xpMax: 13000, color: "from-emerald-500 to-teal-500", ring: "ring-emerald-500" },
    { level: 9, name: "Ментор-Аудитор", xpMin: 13000, xpMax: 20000, color: "from-purple-500 to-fuchsia-500", ring: "ring-purple-500" },
    { level: 10, name: "Легенда Качества", xpMin: 20000, xpMax: 999999, color: "from-rose-500 to-pink-600", ring: "ring-rose-500" }
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
    { id: "win_win", group: "Партнёрство", name: "Win-Win", desc: "Подрядчик перешёл в зелёную зону (>85%).", tiers: [1, 3, 5], maxProgress: 5 },
    { id: "champ_coach", group: "Партнёрство", name: "Тренер", desc: "Разные подрядчики улучшили рейтинг.", tiers: [1, 3, 5], maxProgress: 5 },
    { id: "reanimator", group: "Партнёрство", name: "Кризис-менеджер", desc: "Подрядчик выведен из красной зоны.", tiers: [1, 3, 5], maxProgress: 5 },
    { id: "chron_ideal", group: "Оформление", name: "Летописец", desc: "Проверки с фотофиксацией эталонов (OK).", tiers: [5, 15, 30], maxProgress: 30 },
    { id: "strategist", group: "Оформление", name: "Аналитик", desc: "Отредактированы ИИ-заключения.", tiers: [5, 15, 30], maxProgress: 30 },
    { id: "detective", group: "Оформление", name: "Детектив", desc: "Дефекты с фото и указанной причиной.", tiers: [10, 25, 50], maxProgress: 50 },
    { id: "meticulous", group: "Оформление", name: "Скрупулёзность", desc: "Серия проверок со 100% заполнением.", tiers: [10, 25, 50], maxProgress: 50 },
    { id: "mentor", group: "Обучение", name: "Наставник", desc: "Открыты TWI-карты во время инспекции.", tiers: [5, 15, 30], maxProgress: 30 },
    { id: "methodist", group: "Обучение", name: "Методолог", desc: "Созданы собственные TWI-карты.", tiers: [1, 3, 5], maxProgress: 5 },
    { id: "communicator", group: "Обучение", name: "Коммуникация", desc: "Развернутые комментарии к дефектам.", tiers: [10, 25, 50], maxProgress: 50 },
    { id: "impartial", group: "Объективность", name: "Независимость", desc: "Строгость в пределах нормы.", tiers: [20, 50, 100], maxProgress: 100 },
    { id: "stable_eng", group: "Объективность", name: "Стабильность", desc: "Низкий разброс (волатильность) оценок.", tiers: [10, 20, 40], maxProgress: 40 },
    { id: "reliable", group: "Объективность", name: "Надёжность", desc: "Непрерывная активность (недели).", tiers: [4, 8, 12], maxProgress: 12 },
    { id: "iron_will", group: "Объективность", name: "Железная воля", desc: "Высокий стрик активности (недели).", tiers: [12, 24, 48], maxProgress: 48 },
    { id: "universal", group: "Охват", name: "Универсальность", desc: "Проверки по разным видам работ.", tiers: [3, 6, 10], maxProgress: 10 },
    { id: "pathfinder", group: "Охват", name: "Полевой аудит", desc: "Проверки в различных локациях.", tiers: [10, 20, 30], maxProgress: 30 },
    { id: "perfection", group: "Редкие", name: "Педантичность", desc: "Оценка 100%, но честно зафиксирован B1.", tiers: [1, 3, 5], maxProgress: 5 },
    { id: "magic_creator", group: "Обучение", name: "Магистр TWI", desc: "Созданы карты через 'Магию TWI'.", tiers: [3, 6, 10], maxProgress: 10 }
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
window.getBadgeSvg = function(badgeId, tier, sizeCls) {
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
    switch(badgeId) {
        case 'win_win': path = `<path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>`; break;
        case 'champ_coach': path = `<path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>`; break;
        case 'reanimator': path = `<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-4.5v9m-4.5-4.5h9"/>`; break;
        case 'chron_ideal': path = `<path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"/>`; break;
        case 'strategist': path = `<path d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"/><path d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"/>`; break;
        case 'detective': path = `<path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>`; break;
        case 'meticulous': path = `<path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`; break;
        case 'mentor': path = `<path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/>`; break;
        case 'methodist': path = `<path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>`; break;
        case 'communicator': path = `<path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>`; break;
        case 'impartial': path = `<path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>`; break;
        case 'stable_eng': path = `<path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>`; break;
        case 'reliable': path = `<path d="M9 12.75L11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>`; break;
        case 'iron_will': path = `<path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>`; break;
        case 'universal': path = `<path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/>`; break;
        case 'pathfinder': path = `<path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.715V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>`; break;
        case 'perfection': path = `<path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>`; break;
        case 'magic_creator': path = `<path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>`; break;
        default: path = `<path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>`; break;
    }

    // ВАЖНО: Красим линии, а фон (fill) оставляем прозрачным!
    return `<svg class="${sizeCls} ${opacityCls} mx-auto transition-all duration-300" style="${shadow}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${defs}${path}</svg>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const storedLogs = await dbGet(STORES.SETTINGS, 'game_action_logs');
        if (storedLogs && storedLogs.data) gameActionLogs = storedLogs.data;
    } catch (e) { console.error("Ошибка загрузки логов HR-метрик", e); }
});

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
                statusKey: statusKey, project: c.projectName, contractor: c.contractorName,
                templateKey: c.templateKey, templateTitle: c.templateTitle,
                frequency: freq, instanceId: instanceId,
                totalStages: templateObj?.groups ? templateObj.groups.length : 1,
                checks: [],
                allChecksCount: contractorArray.filter(hist => hist.projectName === c.projectName && hist.contractorName === c.contractorName && hist.templateKey === c.templateKey).length
            };
        }
        pairMap[statusKey].checks.push(c);
    });

    for (let key in pairMap) {
        const pair = pairMap[key];
        
        if (!contractorStatuses[key]) {
            contractorStatuses[key] = {
                status: "active", progress: { done: 0, target: 1, deficit: 0, carryOverCount: 0 },
                milestoneProgress: { completedStages: [], totalStages: pair.totalStages },
                etalonCompleted: false, lastUpdate: new Date().toISOString()
            };
        }

        const st = contractorStatuses[key];

        // --- ЛОГИКА ЭТАЛОНА ---
        const hasAnyCheck = contractorArray.some(c => c.contractorName === pair.contractor && c.projectName === pair.project && (c.templateKey === 'sys_etalon_act' || c.templateKey === pair.templateKey));
        if (hasAnyCheck || pair.allChecksCount >= 1) st.etalonCompleted = true;
        let needsEtalon = !st.etalonCompleted;

        const isPaused = st.status === 'paused';
        const isManuallyCompleted = st.status === 'completed';

        if (pair.frequency === 'continuous') {
            let priority = "Низкий"; let priorityLvl = 1; let target = 1;
            let hasB3InLast = false;

            // --- СТРОГАЯ ЛОГИКА ТАРГЕТОВ ПО ТЗ ---
            if (pair.allChecksCount < 3) {
                priority = "Новый"; priorityLvl = 3; target = 7;
            } else {
                const m = getContractorMetrics(pair.checks, userTemplates);
                if (m) {
                    const lastCheck = pair.checks.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                    hasB3InLast = lastCheck.metrics && lastCheck.metrics.n_B3_fail > 0;

                    if (m.finalC < 70 || m.rateB3 >= 20 || m.stabilityIndex < 40 || hasB3InLast) { 
                        priority = "Критично"; priorityLvl = 4; target = 5; 
                    } else if (m.finalC >= 70 && m.finalC <= 84) { 
                        priority = "В плане"; priorityLvl = 2; target = 3; 
                    } else { 
                        priority = "Низкий"; priorityLvl = 1; target = 1; 
                    }
                }
            }

            if (hasB3InLast && priority !== "Новый") {
                target = Math.min(target * 2, 7);
                priority = "Критично (Недавний B3)"; priorityLvl = 4;
            }

            // --- ПЕРЕНОС ДОЛГОВ ---
            const oldTask = oldPlan.find(t => t.statusKey === key);
            let deficit = 0; let carryOverCount = 0;
            
            if (oldTask && oldTask.done < oldTask.target && !needsEtalon && !isPaused && !isManuallyCompleted) {
                deficit = oldTask.target - oldTask.done;
                carryOverCount = oldTask.carryOverCount ? oldTask.carryOverCount + 1 : 1;
                target = Math.min(target + deficit, 7); 
                
                if (priorityLvl < 4) {
                    priorityLvl++;
                    if (priorityLvl === 2) priority = "В плане (Долг)";
                    if (priorityLvl === 3) priority = "Критично (Долг)";
                    if (priorityLvl === 4) priority = "Критично (Старый Долг)";
                }
            }

            newTasks.push({
                id: 'task_' + Date.now().toString(36), statusKey: key, type: 'continuous',
                contractor: pair.contractor, project: pair.project, templateKey: pair.templateKey, templateTitle: pair.templateTitle,
                priority: priority, priorityLvl: priorityLvl, target: target, done: 0,
                deficit: deficit, carryOverCount: carryOverCount, needsEtalon: needsEtalon,
                isPaused: isPaused, isCompletedManually: isManuallyCompleted
            });
        } else {
            const completedLen = st.milestoneProgress.completedStages ? st.milestoneProgress.completedStages.length : 0;
            const tTotal = st.milestoneProgress.totalStages || pair.totalStages;

            newTasks.push({
                id: 'task_' + Date.now().toString(36), statusKey: key, type: 'milestone',
                contractor: pair.contractor, project: pair.project, templateKey: pair.templateKey, templateTitle: pair.templateTitle,
                priority: "Поэтапный", priorityLvl: 2, target: tTotal, done: completedLen,
                needsEtalon: needsEtalon, isPaused: isPaused, isCompletedManually: isManuallyCompleted || (completedLen >= tTotal)
            });
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

// === НОВАЯ МОДАЛКА: СПИСОК УРОВНЕЙ ИНЖЕНЕРА ===
window.gameShowLevelsModal = function() {
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
// === ЕДИНЫЙ ДАШБОРД ИНЖЕНЕРА (iOS STYLE) ===
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

    // Считаем задачи на неделю
    let totalTasks = 0, doneTasks = 0, debtTasks = 0;
    if (weeklyPlanData && weeklyPlanData.tasks) {
        totalTasks = weeklyPlanData.tasks.length;
        weeklyPlanData.tasks.forEach(t => {
            if (t.done >= t.target) doneTasks++;
            if (t.carryOverCount > 0 && !t.needsEtalon) debtTasks++;
        });
    }

    // Даты текущей недели
    const startOfWeek = getStartOfWeek();
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const weekStr = `${startOfWeek.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'})} - ${endOfWeek.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit', year:'numeric'})}`;

    // Топ очивок и квест
    let activeBadges = [];
    COMPETENCIES.forEach(b => {
        const progress = myProfile.badgesData[b.id] || 0;
        const tier = getBadgeTier(b, progress);
        if (tier > 0) activeBadges.push({ ...b, tier, progress });
    });
    activeBadges.sort((a,b) => b.tier - a.tier);
    const topBadges = activeBadges.slice(0, 3); // Оставил 3, чтобы влез квест
    const smartQuestHtml = getSmartQuest(myProfile);

    // Считаем Impact и Рейтинг для объединенных блоков
    let totalImpact = 0; let impactCount = 0;
    const contractorsSet = new Set(myProfile.rawChecks.map(c => c.contractorName));
    contractorsSet.forEach(cName => {
        const cChecks = myProfile.rawChecks.filter(c => c.contractorName === cName);
        if (cChecks.length < 6) return; 
        const templatesCount = {}; cChecks.forEach(c => templatesCount[c.templateKey] = (templatesCount[c.templateKey]||0)+1);
        const topTemplate = Object.keys(templatesCount).sort((a,b) => templatesCount[b] - templatesCount[a])[0];
        const impact = calculateImpactScore(currentInspector, cName, topTemplate);
        if (impact.score !== 0 || impact.trend !== 'Недостаточно данных') { totalImpact += impact.score; impactCount++; }
    });
    const avgImpact = impactCount > 0 ? (totalImpact / impactCount) : 0;
    let globalImpactText = "Нейтральное"; let globalImpactColor = "text-slate-600 dark:text-slate-400"; let globalImpactBg = "bg-[var(--hover-bg)]";
    let globalImpactIcon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16"></path></svg>`;
    if (avgImpact > 0.2) { globalImpactText = "Позитивное"; globalImpactColor = "text-green-600 dark:text-green-500"; globalImpactBg = "bg-green-50 dark:bg-green-900/20"; globalImpactIcon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>`; } 
    else if (avgImpact < -0.2) { globalImpactText = "Отрицательное"; globalImpactColor = "text-red-600 dark:text-red-500"; globalImpactBg = "bg-red-50 dark:bg-red-900/20"; globalImpactIcon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"></path></svg>`; }

    const allProfilesArr = Object.values(profiles).sort((a, b) => b.pi - a.pi);
    let myRank = allProfilesArr.findIndex(p => p.name === myProfile.name) + 1;
    let totalEng = allProfilesArr.length;

    let html = '';

    // ====================================================================
    // СЕКЦИЯ 1: ПРОФИЛЬ И НАГРАДЫ
    // ====================================================================
    html += `
        <div class="flex flex-col md:flex-row gap-3 mx-1 mb-4">
            <!-- КАРТОЧКА ПРОФИЛЯ -->
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-center">
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${myProfile.levelObj.color} opacity-10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div class="flex justify-between items-start mb-4 relative z-10">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${myProfile.levelObj.color} text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-lg border-2 border-white dark:border-slate-800 ring-2 ${myProfile.levelObj.ring} ring-offset-2 dark:ring-offset-slate-900">
                            ${myProfile.name.substring(0,1).toUpperCase()}
                        </div>
                        <div>
                            <!-- КЛИК ДЛЯ ИЗМЕНЕНИЯ ИМЕНИ -->
                            <div onclick="switchTab('tab-audit'); setTimeout(() => { document.getElementById('inp-inspector').focus(); }, 300)" class="cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2">
                                <div class="text-[16px] font-black text-slate-800 dark:text-white leading-tight">${myProfile.name}</div>
                                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </div>
                            <div class="text-[10px] font-bold bg-clip-text text-transparent bg-gradient-to-r ${myProfile.levelObj.color} uppercase tracking-widest mt-0.5">${myProfile.levelObj.name} <span class="text-slate-400 ml-1">Ур. ${myProfile.levelObj.level}</span></div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Стрик</div>
                        <div class="text-[14px] font-black text-slate-800 dark:text-white">${myProfile.currentStreak} нед.</div>
                    </div>
                </div>

                <div class="relative z-10 cursor-pointer active:scale-[0.98] transition-transform" onclick="gameShowLevelsModal()">
                    <div class="flex justify-between text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                        <span class="text-slate-800 dark:text-white font-black">${myProfile.pi} XP</span>
                        <span>След: ${myProfile.levelObj.xpMax === 999999 ? 'MAX' : myProfile.levelObj.xpMax}</span>
                    </div>
                    <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                        <div class="h-full bg-gradient-to-r ${myProfile.levelObj.color} transition-all duration-1000" style="width: ${piProgress}%"></div>
                    </div>
                </div>

                <!-- СЧЕТЧИКИ ЗАДАЧ ПОД ХП -->
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-[var(--card-border)]">
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">План недели: <span class="font-black ${doneTasks === totalTasks && totalTasks > 0 ? 'text-green-600' : 'text-slate-800 dark:text-white'}">${doneTasks} / ${totalTasks}</span></div>
                    ${debtTasks > 0 ? `<div class="text-[9px] font-black uppercase bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded">Долг: ${debtTasks}</div>` : `<div class="text-[9px] font-bold text-green-500 uppercase">Долгов нет</div>`}
                </div>
            </div>

            <!-- ТОП НАГРАДЫ И КВЕСТ -->
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm md:w-[45%] flex flex-col justify-between">
                <div>
                    <div class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 border-b border-[var(--card-border)] pb-2 flex justify-between items-center">
                        <span>Награды</span>
                        <button onclick="document.getElementById('badges-section').scrollIntoView({behavior: 'smooth'})" class="text-indigo-500 hover:text-indigo-600 active:scale-95 transition-colors">Все ➔</button>
                    </div>
                    <div class="flex items-center justify-start gap-3 overflow-x-auto no-scrollbar pb-2">
                        ${topBadges.length > 0 
                            ? topBadges.map(b => `
                                <div class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform w-16 shrink-0" onclick="gameShowBadgeInfo('${b.id}', ${b.progress})" title="${b.name}">
                                    ${getBadgeSvg(b.id, b.tier, "w-10 h-10")}
                                    <span class="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase mt-1 text-center truncate w-full">${b.name}</span>
                                </div>`).join('')
                            : `<div class="text-[9px] font-bold text-slate-400 uppercase">Пока пусто.</div>`
                        }
                    </div>
                </div>
                <div class="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3 shadow-sm">
                    ${smartQuestHtml}
                </div>
            </div>
        </div>
    `;

    // ====================================================================
    // СЕКЦИЯ 2: ПРОФИЛЬ НАВЫКОВ И ВЛИЯНИЕ (ОБЪЕДИНЕНЫ, СВЕРНУТЫ)
    // ====================================================================
    html += `
        <details class="mx-1 mb-4 group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">📊 Профиль навыков и Влияние</span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-[var(--hover-bg)]">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm p-4 flex flex-col justify-center relative min-h-[220px]">
                    <div style="height: 180px; width: 100%; position: relative;"><canvas id="pi-radar-chart"></canvas></div>
                </div>
                <button onclick="gameOpenImpactModal()" class="w-full text-left p-5 rounded-xl border border-[var(--card-border)] shadow-sm active:scale-95 transition-transform flex flex-col justify-between min-h-[220px] ${globalImpactBg}">
                    <div class="flex justify-between items-start w-full mb-4">
                        <div class="text-[12px] font-black uppercase text-[var(--text-muted)] tracking-widest leading-tight">Ваше влияние на<br>качество объекта</div>
                        <div class="${globalImpactColor}">${globalImpactIcon}</div>
                    </div>
                    <div>
                        <div class="text-[42px] font-black ${globalImpactColor} leading-none mb-2">${avgImpact > 0 ? '+' : ''}${avgImpact.toFixed(2)}</div>
                        <div class="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Статус: ${globalImpactText}</div>
                        <div class="text-[10px] text-slate-500 mt-3 font-medium">Impact Score показывает вашу реальную пользу. Сравнивает качество до ваших проверок и после.</div>
                    </div>
                </button>
            </div>
        </details>
    `;

    // ====================================================================
    // СЕКЦИЯ 3: ПЛАН ЗАДАЧ (ВЫДЕЛЕН ЦВЕТОМ, РАЗВЕРНУТ)
    // ====================================================================
    let taskBlockHeaderColor = engineerAbsence.isActive ? "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800" : "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800";
    let taskBlockBodyColor = engineerAbsence.isActive ? "bg-amber-50 dark:bg-amber-900/10" : "bg-indigo-50/50 dark:bg-indigo-900/10";
    
    html += `
        <details class="mx-1 mb-4 group bg-[var(--card-bg)] border-2 ${taskBlockHeaderColor} rounded-2xl shadow-md overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
            <summary class="p-4 cursor-pointer flex justify-between items-center ${taskBlockHeaderColor} transition-colors select-none border-b">
                <div>
                    <span class="text-[13px] font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                        <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        Недельный план задач
                    </span>
                    <span class="text-[10px] font-bold text-slate-600 dark:text-slate-300 tracking-wider">${weekStr} | Задач: ${doneTasks}/${totalTasks}</span>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="gameToggleAbsence(); event.stopPropagation();" class="text-[9px] font-black text-slate-600 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg active:scale-95 transition-colors uppercase shadow-sm">
                        🏖️ Отпуск/Статус
                    </button>
                    <span class="text-slate-500 shrink-0 transition-transform duration-300 group-open:rotate-180">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </div>
            </summary>
            
            <div class="p-3 ${taskBlockBodyColor}">
    `;

    if (engineerAbsence.isActive) {
        html += `<div class="bg-white/80 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center text-amber-700 dark:text-amber-400 shadow-sm">
                    <div class="text-[14px] font-black uppercase tracking-wider mb-1">Режим: ${engineerAbsence.reason}</div>
                    <div class="text-[11px] font-bold opacity-80">Задачи на эту неделю приостановлены. Отдыхайте!</div>
                 </div>`;
    } else if (!weeklyPlanData.tasks || weeklyPlanData.tasks.length === 0) {
        html += `<div class="bg-white/80 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 text-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <div class="text-[14px] font-black uppercase tracking-wider mb-1">План чист</div>
                    <div class="text-[11px] font-bold opacity-80">Все проверки выполнены или объектов в работе нет.</div>
                 </div>`;
    } else {
        const renderTaskCard = (t) => {
            const isDone = t.isCompletedManually || t.done >= t.target;
            const progressPerc = Math.min((t.done / t.target) * 100, 100);
            
            let tagClass = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400';
            let barColor = 'bg-indigo-500';
            
            if (t.isPaused) {
                tagClass = 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400';
                barColor = 'bg-slate-400';
            } else if (isDone) {
                barColor = 'bg-green-500';
            } else if (t.priorityLvl === 4) { 
                tagClass = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'; barColor = 'bg-red-500'; 
            } else if (t.priorityLvl === 3) { 
                tagClass = 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'; 
            } else if (t.priorityLvl === 2) { 
                tagClass = 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'; barColor = 'bg-orange-500'; 
            }

            const etalonBadge = t.needsEtalon ? `<span class="text-[9px] font-black uppercase flex items-center gap-1 text-blue-600"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg> Нужен Эталон</span>` : '';
            const debtBadge = (t.carryOverCount > 0 && !t.needsEtalon && !t.isPaused) ? `<span class="text-[9px] font-black uppercase flex items-center gap-1 text-red-600"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Долг</span>` : '';
            const statusBadge = t.isPaused ? `<span class="text-[9px] font-black uppercase text-orange-600">⏸ НА ПАУЗЕ</span>` : (t.isCompletedManually ? `<span class="text-[9px] font-black uppercase text-green-600">✅ ЗАВЕРШЕНО</span>` : '');

            const safeContractor = t.contractor.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeStatusKey = t.statusKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeProject = t.project.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            const onClickAction = (t.isPaused || t.isCompletedManually) ? `showToast('Управление доступно через меню (три точки)');` : `gameStartTask('${safeContractor}', '${t.templateKey}', '${safeProject}')`;
            const opacityClass = (t.isPaused || t.isCompletedManually) ? 'opacity-60' : 'opacity-100';

            return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm relative cursor-pointer active:scale-[0.98] transition-transform flex flex-col h-full ${opacityClass}" onclick="${onClickAction}">
                <div class="flex justify-between items-start mb-2 border-b border-[var(--card-border)] pb-2">
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight">${t.contractor}</div>
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate mt-0.5">${t.templateTitle}</div>
                    </div>
                    <button onclick="event.stopPropagation(); gameOpenTaskMenu('${safeStatusKey}', event)" class="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-slate-600 shrink-0 shadow-sm transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>
                </div>
                
                <div class="flex flex-wrap gap-2 items-center mb-3">
                    <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${tagClass}">${t.isPaused ? 'Остановлено' : t.priority}</span>
                    ${etalonBadge} ${debtBadge} ${statusBadge}
                </div>
                
                <div class="mt-auto">
                    <div class="flex justify-between items-end mb-1">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Прогресс</span>
                        <span class="text-[11px] font-black ${isDone ? 'text-green-500' : 'text-slate-700 dark:text-slate-300'}">${t.done} / ${t.target}</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-[var(--card-border)]">
                        <div class="h-full ${barColor} transition-all duration-500" style="width: ${progressPerc}%"></div>
                    </div>
                </div>
            </div>`;
        };

        html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">`;
        weeklyPlanData.tasks.forEach(t => { html += renderTaskCard(t); });
        html += `</div>`;
    }
    html += `</div></details>`;

    // ====================================================================
    // СЕКЦИЯ 4: АКТИВНОСТЬ И РЕЙТИНГ ИНЖЕНЕРОВ (ОБЪЕДИНЕНЫ, СВЕРНУТЫ)
    // ====================================================================
    html += `
        <details class="mx-1 mb-4 group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">🔥 Активность и Рейтинг</span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-[var(--hover-bg)]">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm p-4 flex flex-col justify-center relative min-h-[220px]">
                    <div class="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-2 absolute top-4 left-4 z-10">Активность (XP по месяцам)</div>
                    <div style="height: 160px; width: 100%; position: relative; margin-top:20px;"><canvas id="game-progress-chart"></canvas></div>
                </div>
                <button onclick="gameOpenTopModal()" class="w-full text-left p-5 rounded-xl border border-[var(--card-border)] shadow-sm active:scale-95 transition-transform flex flex-col justify-between min-h-[220px] bg-[var(--card-bg)]">
                    <div class="flex justify-between items-start w-full mb-4">
                        <div class="text-[12px] font-black uppercase text-[var(--text-muted)] tracking-widest leading-tight">Общий рейтинг<br>Инженеров</div>
                        <div class="text-indigo-500"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M21.666 4.756c.962-.203 1.934-.377 2.916-.52a6.003 6.003 0 00-5.395 4.972"></path></svg></div>
                    </div>
                    <div>
                        <div class="text-[42px] font-black text-slate-800 dark:text-white leading-none mb-2">#${myRank} <span class="text-[16px] text-[var(--text-muted)]">из ${totalEng}</span></div>
                        <div class="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ваша позиция в топе</div>
                        <div class="text-[10px] text-slate-500 mt-3 font-medium">Нажмите, чтобы увидеть таблицу лидеров и сравнить свои результаты.</div>
                    </div>
                </button>
            </div>
        </details>
    `;

    // ====================================================================
    // СЕКЦИЯ 5: ВСЕ ДОСТИЖЕНИЯ (СВЕРНУТЫ)
    // ====================================================================
    html += `
        <details id="badges-section" class="mx-1 mb-8 group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">🏅 Коллекция наград <span class="bg-white dark:bg-slate-800 border border-[var(--card-border)] px-1.5 py-0.5 rounded text-[9px] ml-1">${myProfile.earnedBadges.length}/${COMPETENCIES.length}</span></span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-y-6 gap-x-2 bg-[var(--hover-bg)]">
    `;
    COMPETENCIES.forEach(badge => {
        const progress = myProfile.badgesData[badge.id] || 0;
        const tier = getBadgeTier(badge, progress);
        
        html += `
            <div class="flex flex-col items-center cursor-pointer active:scale-95 transition-transform" onclick="gameShowBadgeInfo('${badge.id}', ${progress})" title="${badge.desc}">
                ${getBadgeSvg(badge.id, tier, "w-12 h-12")}
                <div class="font-bold text-[8px] uppercase text-center leading-tight mt-2 h-6 flex items-center ${tier > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}">${badge.name}</div>
            </div>
        `;
    });
    html += `</div></details>`; 

    container.innerHTML = html;
    
    // Вызов отрисовки графиков
    renderRadarChart();
    renderStatsCharts();
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
            const prev = recentChecks[i-1];
            
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
            const avg = contrAll.reduce((sum, x) => sum + (x.metrics?x.metrics.final:0), 0) / contrAll.length;
            if (avg < 75) {
                anomalies.push({ check: c, type: 'Завышение (Подрядчик в красной зоне)', color: 'bg-orange-100 text-orange-800 border-orange-200' });
                checkedInspectors.add(c.inspectorName);
            }
        });

        // Аномалия: B3 без доказательств
        recentChecks.forEach(c => {
            if (c.metrics && c.metrics.n_B3_fail > 0) {
                let hasPhotoOrComment = false;
                if(c.state) {
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
                if(inspChecks.length > 0) {
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
                    <span class="text-[10px] font-bold text-slate-400">#${idx+1}</span>
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
                <button onclick="document.getElementById('manager-panel-overlay').style.display='none'; showHistoryDetail(${c.id});" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-lg text-[10px] font-black uppercase active:scale-95 transition-transform border border-slate-200 dark:border-slate-600">
                    👁️ Открыть Акт
                </button>
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
    if (e) e.stopPropagation();
    
    let st = contractorStatuses[statusKey];
    if (!st) {
        st = { status: 'active' };
        contractorStatuses[statusKey] = st;
    }

    const safeStatusKeyForHtml = statusKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    let actionsHtml = '';
    if (st.status === 'active') {
        actionsHtml += `<button onclick="gameChangeTaskStatus('${safeStatusKeyForHtml}', 'paused')" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[12px] font-bold transition-colors active:scale-95 border border-transparent hover:border-orange-200">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Приостановить работы
        </button>`;
        actionsHtml += `<button onclick="gameChangeTaskStatus('${safeStatusKeyForHtml}', 'completed')" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 text-[12px] font-bold transition-colors active:scale-95 border border-transparent hover:border-green-200 mt-1">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Завершить (Сдать)
        </button>`;
    } else {
        // Если на паузе или завершена - предлагаем только возобновить
        actionsHtml += `<button onclick="gameChangeTaskStatus('${safeStatusKeyForHtml}', 'active')" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[12px] font-bold transition-colors active:scale-95 border border-transparent hover:border-indigo-200">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Возобновить работы
        </button>`;
    }
    
    document.getElementById('task-status-actions').innerHTML = actionsHtml;
    
    const header = document.querySelector('#task-status-modal .border-b');
    if(header) header.innerHTML = `<div class="flex items-center gap-2"><svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Управление задачей</div> <button onclick="document.getElementById('task-status-modal').style.display='none'" class="text-slate-400 hover:text-red-500 active:scale-90 transition-colors p-1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>`;
    
    document.getElementById('task-status-modal').style.display = 'flex';
};

function startInspectionWithValues(contractor, templateKey, statusKey = null, project = null) {
    switchTab('tab-audit'); 
    changeTemplate(templateKey);
    
    // Ждем полной очистки DOM перед вставкой
    setTimeout(() => {
        const contrInput = document.getElementById('inp-contractor');
        if (contrInput && !contrInput.hasAttribute('readonly')) { 
            contrInput.value = contractor; 
            // Без dispatchEvent, чтобы не выпадал список!
        }
        
        const projInput = document.getElementById('inp-project');
        if (projInput && !projInput.hasAttribute('readonly')) {
            if (project) {
                projInput.value = project;
            } else {
                const pastCheck = contractorArray.find(c => c.contractorName === contractor && c.templateKey === templateKey);
                if (pastCheck && pastCheck.projectName) projInput.value = pastCheck.projectName;
            }
        }
        
        const locInput = document.getElementById('inp-location');
        if (locInput) locInput.value = '';
        ['inp-section', 'inp-floor', 'inp-room'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        if (statusKey) {
            const selEl = document.getElementById('checklist-selector');
            if (selEl) selEl.dataset.pendingStatusKey = statusKey;
        }
        
        if (typeof updateDataSummary === 'function') updateDataSummary();
        window.scrollTo({top: 0, behavior: 'smooth'});
        showToast("Задача загружена. Данные заполнены!");
    }, 150);
}

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

