// game.render.js — рендер-диспетчер модуля геймификации
//
// Слияние js/game.js (удалён): реальные реализации DOM-отрисовки/модалок
// геймификации (см. _ai/CURRENT_STEP.md, блок «Слияние js/game.js»).
// Перенесено 1:1, без изменения вёрстки/DOM ID. Прямые обращения к
// dbPut/dbGet/STORES/supabaseClient — black box, как были.
//
// Module-scope declarations, экспортируются через ES export; публикацию в
// window.* для legacy-кода делает game.module.js (entry). currentProfileData/
// allProfilesData дополнительно зеркалятся на window (читаются снаружи
// interventions.js/game.service.js, не переприсваиваются извне — подтверждено
// Grep). piRadarChartInstance/gameChartInstance — чистый module-scope, без
// внешних потребителей.

import { PI_GRADES, COMPETENCIES, gameCalculateAllProfiles, getSmartQuest, gameCalculateManagerMetrics } from './game.state.js';
import { checkAutoExpireAbsence, calculateImpactScore, gameLoadRoles, gameLoadContractorDirectory, gameLoadContractorRequests, gameLoadAiKb, GameActions } from './game.actions.js';

let currentProfileData = null;
let allProfilesData = null;
let piRadarChartInstance = null;
let gameChartInstance = null;

  function _getSetting(key) {
    if (GameActions._ctx && GameActions._ctx.settings) return GameActions._ctx.settings.get(key);
    return window.RBI.services.settings.get(key);
  }

  function _getAllInspections() {
    if (GameActions._ctx && GameActions._ctx.inspections) return GameActions._ctx.inspections.getAllSync();
    return window.RBI.services.inspections.getAllSync();
  }

  function _getFmea() {
    if (GameActions._ctx && GameActions._ctx.tasks) return GameActions._ctx.tasks.getFmeaSync();
    return window.RBI.services.tasks.getFmeaSync();
  }

  function _templates() {
    if (GameActions._ctx && GameActions._ctx.templates) return GameActions._ctx.templates;
    return window.RBI.services.templates;
  }

  function _setSetting(key, value) {
    if (GameActions._ctx && GameActions._ctx.settings) return GameActions._ctx.settings.set(key, value);
    return window.RBI.services.settings.set(key, value);
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

  // Перенесено из js/game.js (строка 66).
  function getBadgeTier(badge, progress) {
    if (progress >= badge.maxProgress) return 5;
    if (progress >= badge.tiers[2]) return 4;
    if (progress >= badge.tiers[1]) return 3;
    if (progress >= badge.tiers[0]) return 2;
    if (progress > 0) return 1;
    return 0;
  }

  // Перенесено из js/game.js (строка 77).
  function getBadgeSvg(badgeId, tier, sizeCls) {
    const uid = Math.random().toString(36).substring(2, 8) + '_' + badgeId;

    const defs = `
        <defs>
            <linearGradient id="g1_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#94a3b8"/></linearGradient>
            <linearGradient id="g2_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d97706"/><stop offset="100%" stop-color="#b45309"/></linearGradient>
            <linearGradient id="g3_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#4338ca"/></linearGradient>
            <linearGradient id="g4_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#a16207"/></linearGradient>
            <linearGradient id="g5_${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#be185d"/></linearGradient>
        </defs>`;

    let strokeColor = "currentColor";
    let opacityCls = "opacity-40 text-slate-400";
    let shadow = "";

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
  };

  // === МОДАЛКА: ОТСУТСТВИЕ ИНЖЕНЕРА ===
  // Перенесено из js/game.js (строка 616).
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
  };

  // === НОВАЯ МОДАЛКА: СПИСОК УРОВНЕЙ ИНЖЕНЕРА ===
  // Перенесено из js/game.js (строка 699).
  function gameShowLevelsModal() {
    const myPi = currentProfileData ? currentProfileData.pi : 0;

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

  // === ЕДИНЫЙ ДАШБОРД ИНЖЕНЕРА ===
  // Перенесено из js/game.js (строка 738).
  function gameRenderDashboard() {
    const container = document.getElementById('game-dashboard-container');
    if (!container) return;

    checkAutoExpireAbsence();
    var _tasksSvcR1 = (GameActions._ctx && GameActions._ctx.tasks) || window.RBI.services.tasks;
    _tasksSvcR1.generateWeeklyPlan();

    let savedName = localStorage.getItem('force_eng_name');
    if (savedName && typeof appSettings !== 'undefined') _setSetting('engineerName', savedName);

    const currentInspector = document.getElementById('inp-inspector')?.value.trim() || _getSetting('engineerName') || 'Неизвестный инспектор';

    if (!currentInspector || currentInspector === 'Неизвестный инспектор') {
      document.getElementById('profile-name-edit-container')?.classList.remove('hidden');
      document.getElementById('profile-title-text')?.classList.add('hidden');
    } else {
      document.getElementById('profile-name-edit-container')?.classList.add('hidden');
      document.getElementById('profile-title-text')?.classList.remove('hidden');
    }

    const profiles = gameCalculateAllProfiles();
    currentProfileData = profiles[currentInspector] || {
      name: currentInspector, pi: 0, checksCount: 0, currentStreak: 0,
      levelObj: PI_GRADES[0], earnedBadges: [], badgesData: {}, monthlyPI: {}, rawChecks: [], radarData: { "Оформление": 0, "Обучение": 0, "Объективность": 0, "Охват": 0, "Партнёрство": 0 }
    };
    allProfilesData = profiles;
    window.currentProfileData = currentProfileData;
    window.allProfilesData = allProfilesData;

    const myProfile = currentProfileData;
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

    let html = `
        <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <!-- Декоративный круг -->
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${myProfile.levelObj.color} opacity-10 rounded-full blur-3xl pointer-events-none"></div>
                
                <!-- ШАПКА: Аватар + Имя (Сбалансированный перенос) -->
                <div class="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 relative z-10 w-full">
                    <!-- АВАТАР: Оптимальный размер (чуть больше оригинала) -->
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${myProfile.levelObj.color} text-white flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 shadow-md border-2 border-white ring-2 ${myProfile.levelObj.ring}">
                        ${myProfile.name === 'Неизвестный инспектор' ? '?' : myProfile.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <!-- ИМЯ: Перенос максимум на 2 строки -->
                        <div class="text-[13px] sm:text-[15px] font-black text-slate-800 dark:text-white leading-tight break-words whitespace-normal line-clamp-2 cursor-pointer" 
                             onmousedown="profileNameLockStart(event)" ontouchstart="profileNameLockStart(event)" onmouseup="profileNameLockCancel()" onmouseleave="profileNameLockCancel()" ontouchend="profileNameLockCancel()" title="Удерживайте, чтобы изменить имя">
                            ${myProfile.name === 'Неизвестный инспектор' ? 'Имя не задано' : myProfile.name}
                        </div>
                        <!-- УРОВЕНЬ: Компактный перенос -->
                        <div class="text-[9px] sm:text-[10px] font-bold bg-clip-text text-transparent bg-gradient-to-r ${myProfile.levelObj.color} uppercase tracking-widest mt-1 break-words whitespace-normal leading-tight">
                            ${myProfile.levelObj.name} <span class="text-slate-400 whitespace-nowrap">Ур. ${myProfile.levelObj.level}</span>
                        </div>
                    </div>
                </div>

                <!-- ПРОГРЕСС И СТРИК (Внизу) -->
                <div class="relative z-10 cursor-pointer active:scale-[0.98] transition-transform" onclick="gameShowLevelsModal()">
                    <div class="flex justify-between items-end text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                        <div>
                            <span class="text-slate-800 dark:text-white font-black">${myProfile.pi} XP</span>
                            <span class="lowercase text-slate-400 ml-1">/ ${myProfile.levelObj.xpMax === 999999 ? 'MAX' : myProfile.levelObj.xpMax}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-indigo-500 font-black flex items-center gap-1">
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"></path></svg>
    ${myProfile.currentStreak} нед.
</span>
                        </div>
                    </div>
                    <!-- ПОЛОСКА XP: Золотая середина (h-2) -->
                    <div class="w-full h-2 sm:h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
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
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"></path></svg>
                    Профиль навыков и Влияние
                </span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-2 sm:p-3 grid grid-cols-2 gap-2 sm:gap-3 bg-[var(--hover-bg)]">
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm p-4 flex flex-col justify-center relative min-h-[220px]">
                    <div style="height: 160px; width: 100%; position: relative;"><canvas id="pi-radar-chart"></canvas></div>
                    <button onclick="window.RBI.services.ai.generateAiTutorAdvice()" class="mt-3 w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-[9px] font-black uppercase py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 active:scale-95 transition-transform shadow-sm flex items-center justify-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> AI-Наставник</button>
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
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    Активность и Рейтинг
                </span>
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
                <!-- ИСПРАВЛЕНИЕ: Счетчик наград (используем activeBadges.length вместо earnedBadges.length) -->
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path></svg>
                    Коллекция наград <span class="bg-white dark:bg-slate-800 border border-[var(--card-border)] px-1.5 py-0.5 rounded text-[9px] ml-1">${activeBadges.length}/${COMPETENCIES.length}</span>
                </span>
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
  // Перенесено из js/game.js (строка 956).
  let profileLockTimer = null;
  function profileNameLockStart(e) {
    if (e) e.preventDefault();

    if (window.syncConfig && window.syncConfig.enabled && _getSetting('cloudStatus') === 'approved') {
      if (typeof showToast === 'function') showToast("Имя заблокировано администратором (Облако активно)");
      return;
    }

    profileLockTimer = setTimeout(() => {
      document.getElementById('profile-name-edit-container').classList.remove('hidden');
      document.getElementById('profile-title-text').classList.add('hidden');
      const inp = document.getElementById('profile-name-input');
      if (inp) {
        inp.value = _getSetting('engineerName') || '';
        inp.focus();
      }
    }, 800);
  };
  function profileNameLockCancel() {
    if (profileLockTimer) clearTimeout(profileLockTimer);
  };

  // Перенесено из js/game.js (строка 1002).
  function renderRadarChart() {
    setTimeout(() => {
      const ctxRadar = document.getElementById('pi-radar-chart');
      if (ctxRadar && currentProfileData && currentProfileData.radarData) {
        const labels = Object.keys(currentProfileData.radarData);
        const data = Object.values(currentProfileData.radarData);
        if (Math.max(...data) === 0) data[0] = 1;

        if (piRadarChartInstance) piRadarChartInstance.destroy();
        piRadarChartInstance = new Chart(ctxRadar, {
          type: 'radar',
          data: { labels: labels, datasets: [{ data: data, backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: '#4f46e5', pointBackgroundColor: '#4f46e5', borderWidth: 2 }] },
          options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false, stepSize: 25 }, pointLabels: { font: { size: 9, family: 'Inter', weight: 'bold' }, color: '#64748b' } } }, plugins: { legend: { display: false } } }
        });
      }
    }, 50);
  };

  // Перенесено из js/game.js (строка 1020).
  function renderStatsCharts() {
    setTimeout(() => {
      const ctxBar = document.getElementById('game-progress-chart');
      if (ctxBar && currentProfileData && currentProfileData.monthlyPI) {
        const labels = Object.keys(currentProfileData.monthlyPI);
        const data = Object.values(currentProfileData.monthlyPI);
        if (gameChartInstance) gameChartInstance.destroy();
        gameChartInstance = new Chart(ctxBar, {
          type: 'bar',
          data: { labels: labels, datasets: [{ data: data, backgroundColor: '#4f46e5', borderRadius: 4 }] },
          options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { border: { display: false }, ticks: { font: { size: 9 } } } } }
        });
      }
    }, 50);
  };

  // Перенесено из js/game.js (строка 1036).
  function gameShowBadgeInfo(badgeId, progress) {
    const badge = COMPETENCIES.find(b => b.id === badgeId);
    if (!badge) return;

    const tier = getBadgeTier(badge, progress);

    let target = badge.tiers[0];
    let levelName = "Заблокировано";
    let color = "text-slate-400";
    let bg = "bg-slate-300";

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
      progress = target;
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

  // === ПАНЕЛЬ РУКОВОДИТЕЛЯ: инъекция модалок ===
  // Перенесено из js/game.js (строка 1126).
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

    <!-- Полноэкранная панель (как TWI-конструктор), не модалка -->
    <div id="manager-panel-overlay" class="hidden bg-[var(--bg-main)] fixed inset-0 z-[2000] h-screen flex-col overflow-hidden">
            <!-- Шапка -->
            <div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4 shadow-sm sticky top-0 z-40 flex justify-between items-center shrink-0">
                <button type="button" onclick="closeManagerPanel()" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg> Назад
                </button>
                <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest truncate px-2">Панель Руководителя</div>
                <span class="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800 shrink-0">Admin</span>
            </div>
            
            <!-- Навигация (Тумблеры iOS Style - Адаптивные) -->
            <div class="p-2 sm:p-3 bg-[var(--bg-main)] z-10 shrink-0 border-b border-[var(--card-border)]">
                <div class="flex gap-1 p-1 bg-[var(--card-border)]/80 backdrop-blur-md rounded-xl overflow-x-auto no-scrollbar whitespace-nowrap text-center shadow-sm">
                    <button onclick="switchManagerTab('hr')" id="btn-man-hr" class="manager-tab-btn flex-1 min-w-[40px] sm:min-w-[70px] py-2 text-[10px] font-bold uppercase rounded-md bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 flex flex-col items-center gap-1 transition-all active">
                        <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        <span class="tab-text inline sm:inline">HR Аналитика</span>
                    </button>
                    <button onclick="switchManagerTab('audit')" id="btn-man-audit" class="manager-tab-btn flex-1 min-w-[40px] sm:min-w-[70px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1 transition-all">
                        <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        <span class="tab-text hidden sm:inline">Аудиты</span>
                    </button>
                    <button onclick="switchManagerTab('team')" id="btn-man-team" class="manager-tab-btn flex-1 min-w-[40px] sm:min-w-[70px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1 transition-all">
                        <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <span class="tab-text hidden sm:inline">Объекты / Роли</span>
                    </button>
                    <button onclick="switchManagerTab('dev')" id="btn-man-dev" class="manager-tab-btn flex-1 min-w-[40px] sm:min-w-[70px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1 transition-all">
                        <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
                        <span class="tab-text hidden sm:inline">Бэклог</span>
                    </button>
                    <button onclick="switchManagerTab('ai')" id="btn-man-ai" class="manager-tab-btn flex-1 min-w-[40px] sm:min-w-[70px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1 transition-all">
                        <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        <span class="tab-text hidden sm:inline">База ИИ</span>
                    </button>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-[var(--bg-main)] relative">
                <!-- Вкладка 1: HR -->
                <div id="manager-tab-hr" class="block">
                    <div id="manager-panel-content"></div>
                </div>
                
                <!-- Вкладка 2: АУДИТ -->
                <div id="manager-tab-audit" class="hidden">
                    <div class="flex justify-between items-center mb-4 bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--card-border)] shadow-sm">
                        <div>
                            <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white mb-1">Маршрут Перекрестных Проверок</h2>
                            <p class="text-[10px] text-[var(--text-muted)] font-bold leading-snug">Алгоритм отбирает аномальные проверки.</p>
                        </div>
                        <button onclick="gameGenerateAuditPlan()" class="bg-indigo-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 shrink-0 whitespace-nowrap transition-transform">Сформировать</button>
                    </div>
                    <div id="manager-audit-list">
                        <div class="text-center py-10 text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest">Нажмите "Сформировать"</div>
                    </div>
                </div>

                <!-- Вкладка 3: КОМАНДА И ОБЪЕКТЫ (РЕДИЗАЙН) -->
                <div id="manager-tab-team" class="hidden space-y-4">

                    <!-- 1. ЗАЯВКИ НА ОБЪЕКТЫ -->
                    <details class="bg-[var(--card-bg)] border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                        <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none bg-orange-50 dark:bg-orange-900/20 rounded-xl group-open:rounded-b-none group-open:border-b border-orange-200 dark:border-orange-800">
                            <div>
                                <h2 class="text-[11px] font-black uppercase text-orange-600 dark:text-orange-400 mb-0.5">Заявки на Объекты</h2>
                                <p class="text-[9px] text-orange-700/70 dark:text-orange-500 font-bold leading-snug">Из ПК СК и от инженеров</p>
                            </div>
                            <button onclick="event.preventDefault(); ObjectDirectory.loadRequests(); this.closest('details').open = true;" class="bg-white dark:bg-slate-800 text-orange-600 border border-orange-200 dark:border-orange-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 shadow-sm">Проверить</button>
                        </summary>
                        <div id="obj-requests-list" class="p-2 max-h-[40vh] overflow-y-auto custom-scrollbar bg-[var(--hover-bg)] rounded-b-xl">
                            <div class="text-center py-4 text-xs text-[var(--text-muted)]">Нажмите "Проверить"</div>
                        </div>
                    </details>

                    <!-- 2. СПРАВОЧНИК ОБЪЕКТОВ -->
                    <details class="bg-[var(--card-bg)] border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                        <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none bg-blue-50 dark:bg-blue-900/20 rounded-xl group-open:rounded-b-none group-open:border-b border-blue-200 dark:border-blue-800">
                            <div>
                                <h2 class="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 mb-0.5">Справочник Объектов</h2>
                                <p class="text-[9px] text-blue-700/70 dark:text-blue-500 font-bold leading-snug">База эталонных названий</p>
                            </div>
                            <span class="text-blue-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
                        </summary>
                        <div class="p-2 bg-[var(--hover-bg)] rounded-b-xl">
                            <div class="flex gap-2 mb-3">
                                <input type="text" id="inline-new-obj-name" class="input-base !py-2 text-[10px] bg-white dark:bg-slate-800" placeholder="Новый объект (напр: ЖК Легенда)">
                                <button onclick="ObjectDirectory.addNewObjectInline()" class="bg-blue-600 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 shrink-0">Создать</button>
                            </div>
                            <div id="manager-objects-list" class="max-h-[50vh] overflow-y-auto custom-scrollbar"></div>
                        </div>
                    </details>

                    <!-- 3. УПРАВЛЕНИЕ КОМАНДОЙ (РОЛИ) -->
                    <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden" open>
                        <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none bg-slate-50 dark:bg-slate-800/50 rounded-xl group-open:rounded-b-none group-open:border-b border-[var(--card-border)]">
                            <div>
                                <h2 class="text-[11px] font-black uppercase text-slate-800 dark:text-white mb-0.5">Команда (Доступы)</h2>
                                <p class="text-[9px] text-slate-500 font-bold leading-snug">Назначение ролей и объектов</p>
                            </div>
                            <button onclick="event.preventDefault(); gameLoadRoles(); this.closest('details').open = true;" class="bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-[var(--card-border)] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 shadow-sm">Обновить</button>
                        </summary>
                        <div class="p-2 bg-[var(--hover-bg)] rounded-b-xl">
                            <details class="mb-2 group/sub [&_summary::-webkit-details-marker]:hidden" open>
                                <summary class="text-[10px] font-black uppercase text-orange-500 mb-2 cursor-pointer flex justify-between items-center select-none bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg border border-orange-100 dark:border-orange-800">
                                    <span>Заявки на доступ</span>
                                    <span class="text-orange-400 transition-transform duration-300 group-open/sub:rotate-180">▼</span>
                                </summary>
                                <div id="manager-access-requests-list" class="space-y-2">
                                    <div class="text-center py-4 text-xs text-[var(--text-muted)]">Загрузка...</div>
                                </div>
                            </details>
                            
                            <details class="group/sub [&_summary::-webkit-details-marker]:hidden" open>
                                <summary class="text-[10px] font-black uppercase text-slate-500 mb-2 cursor-pointer flex justify-between items-center select-none bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span>Активные пользователи</span>
                                    <span class="text-slate-400 transition-transform duration-300 group-open/sub:rotate-180">▼</span>
                                </summary>
                                <div id="manager-team-list" class="space-y-2">
                                    <div class="text-center py-4 text-xs text-[var(--text-muted)]">Загрузка...</div>
                                </div>
                            </details>
                            <div id="manager-roles-list" class="hidden"></div>
                        </div>
                    </details>

                    <!-- 4. ЗАЯВКИ НА ПОДРЯДЧИКОВ -->
                    <details class="bg-[var(--card-bg)] border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                        <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none bg-yellow-50 dark:bg-yellow-900/20 rounded-xl group-open:rounded-b-none group-open:border-b border-yellow-200 dark:border-yellow-800">
                            <div>
                                <h2 class="text-[11px] font-black uppercase text-yellow-600 dark:text-yellow-400 mb-0.5">Заявки на Подрядчиков</h2>
                                <p class="text-[9px] text-yellow-700/70 dark:text-yellow-500 font-bold leading-snug">Из ПК СК и ручного ввода</p>
                            </div>
                            <button onclick="event.preventDefault(); gameLoadContractorRequests(); this.closest('details').open = true;" class="bg-white dark:bg-slate-800 text-yellow-600 border border-yellow-200 dark:border-yellow-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 shadow-sm">Проверить</button>
                        </summary>
                        <div id="manager-contractor-requests-list" class="p-2 max-h-[40vh] overflow-y-auto custom-scrollbar bg-[var(--hover-bg)] rounded-b-xl">
                            <div class="text-center py-4 text-xs text-[var(--text-muted)]">Загрузка...</div>
                        </div>
                    </details>

                    <!-- 5. СПРАВОЧНИК ПОДРЯДЧИКОВ -->
                    <details class="bg-[var(--card-bg)] border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                        <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-open:rounded-b-none group-open:border-b border-emerald-200 dark:border-emerald-800">
                            <div>
                                <h2 class="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-0.5">Справочник Подрядчиков</h2>
                                <p class="text-[9px] text-emerald-700/70 dark:text-emerald-500 font-bold leading-snug">База эталонных названий</p>
                            </div>
                            <div class="flex gap-1.5 shrink-0">
                                <button onclick="event.preventDefault(); gameFindContractorDuplicates();" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 shadow-md flex items-center gap-1">🤖 Поиск дублей</button>
                                <button onclick="event.preventDefault(); gameLoadContractorDirectory(); this.closest('details').open = true;" class="bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-200 dark:border-emerald-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 shadow-sm">Обновить</button>
                            </div>
                        </summary>
                        <div id="manager-contractor-directory-list" class="p-2 max-h-[40vh] overflow-y-auto custom-scrollbar bg-[var(--hover-bg)] rounded-b-xl">
                            <div class="text-center py-4 text-xs text-[var(--text-muted)]">Загрузка...</div>
                        </div>
                    </details>
                    </div>
                
                
                <!-- Вкладка 4: БЭКЛОГ И ПЛАНЫ (Бывшая вкладка Разработчика) -->
                <div id="manager-tab-dev" class="hidden">
                    <!-- ПЛАНЫ РАЗРАБОТЧИКА -->
                    <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl shadow-sm mb-4">
                        <h2 class="text-[12px] font-black uppercase text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Опубликовать планы (Roadmap)</h2>
                        <div class="flex gap-2">
                            <input type="text" id="dev-roadmap-input" class="input-base text-[11px] !py-3 flex-1" placeholder="Напр: Добавить темную тему в PDF отчеты...">
                            <button onclick="rbi_addRoadmapItem()" class="bg-indigo-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform">Опубликовать</button>
                        </div>
                    </div>
                    <div id="manager-roadmap-list" class="space-y-2 mb-6"></div>

                    <!-- ОБРАТНАЯ СВЯЗЬ ОТ ЮЗЕРОВ -->
                    <div class="flex justify-between items-center mb-4 bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--card-border)] shadow-sm">
                        <div>
                            <h2 class="text-[13px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">Бэклог (Идеи команды)</h2>
                            <p class="text-[10px] text-[var(--text-muted)] font-bold leading-snug">Запросы и идеи от пользователей.</p>
                        </div>
                        <button onclick="rbi_exportFeedbackJson()" class="bg-[var(--hover-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm active:scale-95 transition-colors">↓ JSON</button>
                    </div>
                    <div id="manager-dev-list" class="space-y-3 pb-8"></div>
                </div>
                <!-- Вкладка 5: БАЗА ЗНАНИЙ ИИ -->
                <div id="manager-tab-ai" class="hidden space-y-4">
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-xl shadow-sm">
                        <div class="flex justify-between items-center mb-3">
                            <div>
                                <h2 class="text-[13px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-1">База знаний AI-Помощника</h2>
                                <p class="text-[10px] text-[var(--text-muted)] font-bold leading-snug">Загружайте сюда инструкции и правила работы.</p>
                            </div>
                            <button onclick="gameOpenAiKbModal()" class="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 shrink-0 transition-transform">Добавить</button>
                        </div>
                        
                        <!-- НОВАЯ СТРОКА ПОИСКА В АДМИНКЕ -->
                        <div class="relative mb-3">
                            <span class="absolute left-3 top-2.5 text-slate-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></span>
                            <input type="text" id="admin-ai-search" class="input-base pl-9 text-[11px] !py-2" placeholder="Поиск по статьям..." oninput="gameLoadAiKb()">
                        </div>

                        <div id="manager-ai-kb-list" class="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1"></div>
                    </div>
                </div>
            </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  };

  function closeManagerPanel() {
    const view = document.getElementById('manager-panel-overlay');
    if (view) {
      view.classList.add('hidden');
      view.classList.remove('flex');
      view.style.display = '';
    }
    document.body.classList.remove('modal-open');
    if (window.GameState && typeof window.GameState.setManagerPanelOpen === 'function') {
      window.GameState.setManagerPanelOpen(false);
    }
  }

  function openManagerPanelView() {
    const view = document.getElementById('manager-panel-overlay');
    if (!view) return;
    view.classList.remove('hidden');
    view.classList.add('flex');
    view.style.display = '';
    document.body.classList.add('modal-open');
    if (window.GameState && typeof window.GameState.setManagerPanelOpen === 'function') {
      window.GameState.setManagerPanelOpen(true);
    }
    const scroller = view.querySelector('.overflow-y-auto');
    if (scroller && typeof scroller.scrollTo === 'function') scroller.scrollTo(0, 0);
  }

  // Перенесено из js/game.js (строка 1358).
  function gameOpenManagerPanelAuth() {
    gameInjectManagerModals();
    document.getElementById('manager-pin-input').value = '';
    document.getElementById('manager-auth-modal').style.display = 'flex';
  };

  // Перенесено из js/game.js (строка 1384).
  function switchManagerTab(tab) {
    const tabs = ['hr', 'audit', 'team', 'dev', 'ai'];
    const colors = {
      'hr': 'text-indigo-600 dark:text-indigo-400',
      'audit': 'text-indigo-600 dark:text-indigo-400',
      'team': 'text-indigo-600 dark:text-indigo-400',
      'dev': 'text-emerald-600 dark:text-emerald-400',
      'ai': 'text-indigo-600 dark:text-indigo-400'
    };

    tabs.forEach(t => {
      const btn = document.getElementById(`btn-man-${t}`);
      const content = document.getElementById(`manager-tab-${t}`);
      if (!btn || !content) return;

      const textSpan = btn.querySelector('.tab-text');

      if (t === tab) {
        content.classList.remove('hidden');
        btn.className = `manager-tab-btn flex-1 min-w-[40px] sm:min-w-[70px] py-2 text-[10px] font-bold uppercase rounded-md bg-white dark:bg-slate-800 shadow-sm flex flex-col items-center gap-1 transition-all active ${colors[t]}`;
        if (textSpan) {
          textSpan.classList.remove('hidden');
          textSpan.classList.add('inline');
        }
      } else {
        content.classList.add('hidden');
        btn.className = `manager-tab-btn flex-1 min-w-[40px] sm:min-w-[70px] py-2 text-[10px] font-bold uppercase rounded-md text-[var(--text-muted)] flex flex-col items-center gap-1 transition-all bg-transparent shadow-none`;
        if (textSpan) {
          textSpan.classList.add('hidden');
          textSpan.classList.remove('inline');
        }
      }
    });

    if (tab === 'team') {
      gameLoadRoles();

      if (typeof ObjectDirectory !== 'undefined') {
        ObjectDirectory.renderManagerPanel();
        const reqList = document.getElementById('obj-requests-list');
        if (reqList) reqList.innerHTML = '<div class="text-center py-4 text-xs text-[var(--text-muted)] animate-pulse">Загрузка заявок...</div>';
        ObjectDirectory.loadRequests();
      }

      if (typeof gameLoadContractorDirectory === 'function') {
        gameLoadContractorDirectory();
      }

      if (typeof gameLoadContractorRequests === 'function') {
        gameLoadContractorRequests();
      }
    } else if (tab === 'dev') {
      rbi_renderDevFeedbackTab();
      ObjectDirectory.loadRequests();
    } else if (tab === 'ai') {
      gameLoadAiKb();
    }
  };

  // Перенесено из js/game.js (строка 1688).
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
  };

  // Перенесено из js/game.js (строка 1788).
  function gameOpenTaskDetails(statusKey, e) {
    const _allInspections = _getAllInspections();
    if (e) e.stopPropagation();

    const weeklyPlanData = window.weeklyPlanData;
    const contractorStatuses = window.contractorStatuses;

    const task = weeklyPlanData.tasks.find(t => t.statusKey === statusKey);
    if (!task) return;

    let st = contractorStatuses[statusKey];
    if (!st) { st = { status: 'active' }; contractorStatuses[statusKey] = st; }

    const safeStatusKeyForHtml = statusKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeContractor = task.contractor.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeProject = task.project.replace(/'/g, "\\'").replace(/"/g, '&quot;');

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

    let actionsHtml = '';
    if (st.status === 'active') {
      actionsHtml += `
            <div id="ai-task-risk-${task.id}" class="mb-3">
                <button onclick="window.RBI.services.ai.generateTaskRiskAi('${safeContractor}', '${task.templateKey}', 'ai-task-risk-${task.id}')" class="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform flex justify-center items-center gap-2 shadow-sm">
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

  // === ТАБЛИЦА ЛИДЕРОВ (РЕЙТИНГ ИНЖЕНЕРОВ) ===
  // Перенесено из js/game.js (строка 2006).
  function gameOpenTopModal() {
    let sortedProfiles = [];
    const myName = document.getElementById('inp-inspector')?.value.trim() || 'Неизвестный инспектор';

    if (window.serverGlobalRating && Array.isArray(window.serverGlobalRating)) {
      sortedProfiles = window.serverGlobalRating.sort((a, b) => b.pi - a.pi);
    } else if (allProfilesData) {
      sortedProfiles = Object.values(allProfilesData).sort((a, b) => b.pi - a.pi);
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

      let badgesHtml = '';
      if (p.badgesData) {
        let activeBadges = [];
        COMPETENCIES.forEach(b => {
          const progress = p.badgesData[b.id] || 0;
          const tier = getBadgeTier(b, progress);
          if (tier > 0) activeBadges.push({ id: b.id, tier });
        });
        activeBadges.sort((a, b) => b.tier - a.tier);
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
  // Перенесено из js/game.js (строка 2078).
  function gameOpenImpactModal() {
    if (!currentProfileData) return;

    const myProfile = currentProfileData;
    let totalImpact = 0; let impactCount = 0;
    const detailsHtml = [];

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

  // === КОНСОЛИДИРОВАННЫЙ ОТЧЕТ КО ДНЮ КАЧЕСТВА: настройка периода ===
  // Перенесено из js/game.js (строка 2178).
  function rbi_openQualityDaySettings(taskId) {
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

  // === FMEA: РЕЕСТР И ПРОСМОТР ===
  // Перенесено из js/game.js (строка 2431).
  function rbi_renderFmeaHistory() {
    const container = document.getElementById('rbi-fmea-container');
    if (!container) return;

    const toggleHtml = (typeof window.kbViewModeToggleHtml === 'function')
      ? window.kbViewModeToggleHtml('fmea')
      : '';

    let headerHtml = `
        <div class="sticky-top-panel bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 z-40 w-full">
            <div class="flex flex-wrap justify-between items-center gap-2 mb-3 border-b border-[var(--card-border)] pb-2">
                <h2 class="text-[13px] font-black uppercase text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5 min-w-0">
                    <svg class="w-4 h-4 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span class="truncate">Архив FMEA</span>
                </h2>
                <div class="flex flex-wrap items-center gap-2">
                    <div id="fmea-view-mode-toggle">${toggleHtml}</div>
                    <button onclick="rbi_createEmptyFmea()" class="bg-white text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg shadow-sm active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Пустой бланк
                    </button>
                </div>
            </div>
            
            <div class="flex flex-wrap gap-2 items-center">
                <div class="flex-1 min-w-[160px]">
                    <select id="fmea-period-select" class="input-base !py-2 text-[10px] font-bold w-full">
                        <option value="WEEK">Дефекты за 7 дней (Неделя)</option>
                        <option value="MONTH">Дефекты за 30 дней (Месяц)</option>
                        <option value="QUARTER">Дефекты за 90 дней (Квартал)</option>
                    </select>
                </div>
                <button onclick="rbi_generateFmeaTable()" class="bg-purple-600 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase shadow-md active:scale-95 transition-transform flex items-center gap-1.5 shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Сформировать
                </button>
            </div>
        </div>
        
        <div id="fmea-workspace" class="mb-4"></div>
        <div id="fmea-registry-list" class="pb-8"></div>
    `;

    container.innerHTML = headerHtml;
    rbi_renderFmeaRegistry();
  };

  // Перенесено из js/game.js (строка 2472).
  function rbi_renderFmeaRegistry() {
    const listContainer = document.getElementById('fmea-registry-list');
    if (!listContainer) return;

    const toggleHost = document.getElementById('fmea-view-mode-toggle');
    if (toggleHost && typeof window.kbViewModeToggleHtml === 'function') {
      toggleHost.innerHTML = window.kbViewModeToggleHtml('fmea');
    }

    if (!_getFmea() || _getFmea().length === 0) {
      listContainer.innerHTML = `<div class="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)]">Архив пуст</div>`;
      return;
    }

    const currentEngineer = _getSetting('engineerName') || 'Инженер';
    const sorted = [..._getFmea()]
      .filter(f => f && f.id && !f._deleted && f.date && f.title && f.defects)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!sorted.length) {
      listContainer.innerHTML = `<div class="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)]">Архив пуст</div>`;
      return;
    }

    const isListView = (typeof window.getKnowledgeViewMode === 'function'
      ? window.getKnowledgeViewMode('fmea')
      : 'cards') === 'list';
    const itemsWrapClass = isListView
      ? 'flex flex-col gap-1.5'
      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3';

    const fmeaGroupLabels = (f) => {
      if (Array.isArray(f.projectNames) && f.projectNames.length) {
        return [...new Set(f.projectNames.map(n => String(n).trim()).filter(Boolean))];
      }
      const raw = String(f.project_display_name || f.projectName || f.project_canonical_key || f.project || '').trim();
      if (!raw) return ['Без объекта'];
      if (raw === 'Все объекты') return [raw];
      if (raw.includes(',')) {
        const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) return [...new Set(parts)];
      }
      return [raw];
    };

    const renderFmeaItem = (f) => {
      const isOwner = !f.author || f.author === currentEngineer;
      const safeTitle = String(f.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const authorShort = f.author ? f.author.split(' ')[0] : 'Инженер';
      const dateStr = new Date(f.date).toLocaleDateString('ru-RU');
      const defectN = (f.defects || []).length;
      const photos = (f.defects || []).map(d => d.photo).filter(Boolean);
      const thumb = photos.length > 0
        ? `<img src="${window.getPhotoSrc(photos[0])}" class="w-full h-full object-cover">`
        : `<div class="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;

      if (isListView) {
        return `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm flex items-center gap-2.5 p-2 active:scale-[0.99] transition-transform relative cursor-pointer" onclick="rbi_viewFmea('${f.id}')">
            <div class="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[var(--card-border)]">${thumb}</div>
            <div class="min-w-0 flex-1">
                <div class="text-[12px] font-bold text-slate-800 dark:text-white truncate leading-tight">${f.title}</div>
                <div class="text-[9px] font-bold text-slate-400 truncate mt-0.5">${f.periodName || 'FMEA'} · ${defectN} деф. · ${authorShort} · ${dateStr}</div>
            </div>
            <button onclick="event.stopPropagation(); openUniversalActionSheet('${f.id}', 'fmea', '${safeTitle}', ${isOwner})" class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-[var(--hover-bg)] active:scale-90">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
            </button>
        </div>`;
      }

      const previewHtml = photos.length > 0
        ? `<img src="${window.getPhotoSrc(photos[0])}" class="w-full h-full object-cover">`
        : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;

      return `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="rbi_viewFmea('${f.id}')">
            <div class="h-24 sm:h-28 border-b border-[var(--card-border)] relative">
                ${previewHtml}
                <button onclick="event.stopPropagation(); openUniversalActionSheet('${f.id}', 'fmea', '${safeTitle}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
                <div class="absolute bottom-2 left-2 bg-purple-600 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-md">${f.periodName || 'FMEA'}</div>
            </div>
            <div class="p-3 flex flex-col flex-1 min-w-0">
                <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-1">${f.title}</div>
                <div class="text-[9px] text-slate-500 font-bold mb-2">Разобрано дефектов: ${defectN} шт.</div>
                <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center gap-2">
                    <div class="text-[9px] font-bold text-[var(--text-muted)] truncate min-w-0">
                        <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${authorShort}
                    </div>
                    <div class="text-[9px] font-black text-slate-400 shrink-0">${dateStr}</div>
                </div>
            </div>
        </div>`;
    };

    const grouped = {};
    sorted.forEach((f) => {
      fmeaGroupLabels(f).forEach((pName) => {
        if (!grouped[pName]) grouped[pName] = [];
        grouped[pName].push(f);
      });
    });
    const collator = new Intl.Collator('ru');
    const groupKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Без объекта') return 1;
      if (b === 'Без объекта') return -1;
      if (a === 'Все объекты') return 1;
      if (b === 'Все объекты') return -1;
      return collator.compare(a, b);
    });

    let groupIndex = 0;
    listContainer.innerHTML = groupKeys.map((pName) => {
      const items = grouped[pName];
      const safeGroupId = `fmea-group-${groupIndex++}`;
      const cardsHtml = items.map(renderFmeaItem).join('');
      return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[14px] shadow-sm mb-2 overflow-hidden">
                <div class="flex justify-between items-center p-2.5 cursor-pointer active:bg-[var(--hover-bg)] transition-colors select-none" onclick="
                    const body = document.getElementById('${safeGroupId}');
                    const icon = this.querySelector('.chevron-icon');
                    if (body.classList.contains('hidden')) {
                        body.classList.remove('hidden');
                        icon.style.transform = 'rotate(180deg)';
                    } else {
                        body.classList.add('hidden');
                        icon.style.transform = 'rotate(0deg)';
                    }
                ">
                    <div class="flex items-center gap-2.5 min-w-0 pr-2">
                        <div class="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-[10px] flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        </div>
                        <div class="min-w-0">
                            <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight">${String(pName).replace(/</g, '&lt;')}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0 pl-1">
                        <span class="text-[9px] font-bold text-slate-500 bg-[var(--hover-bg)] px-1.5 py-0.5 rounded-md border border-[var(--card-border)]">${items.length} шт</span>
                        <svg class="w-4 h-4 text-slate-400 transition-transform duration-300 transform rotate-0 chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                <div id="${safeGroupId}" class="hidden border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30 p-2.5">
                    <div class="${itemsWrapClass}">${cardsHtml}</div>
                </div>
            </div>`;
    }).join('');
  };

  function _setFmeaViewModalLayout(on) {
    const modal = document.getElementById('modal-overlay');
    const box = modal && modal.querySelector('.modal-content');
    if (!box) return;
    const defaultClose = box.querySelector(':scope > button[data-notify-action="closeModal"]');
    if (on) {
      box.style.maxWidth = 'min(960px, 96vw)';
      box.style.width = '96vw';
      box.style.maxHeight = '94vh';
      box.style.padding = (window.innerWidth < 480) ? '16px' : '20px 24px';
      if (defaultClose) defaultClose.style.display = 'none';
      modal.dataset.fmeaViewWide = '1';
    } else if (modal.dataset.fmeaViewWide === '1') {
      box.style.maxWidth = '';
      box.style.width = '';
      box.style.maxHeight = '';
      box.style.padding = '';
      if (defaultClose) defaultClose.style.display = '';
      delete modal.dataset.fmeaViewWide;
    }
  }

  // Перенесено из js/game.js (строка 2551).
  async function rbi_viewFmea(fmeaId) {
    const record = _getFmea().find(f => f.id === fmeaId);
    if (!record) return showToast("Запись не найдена");

    const sortedDefects = [...record.defects].sort((a, b) => (parseInt(b.rpn) || 0) - (parseInt(a.rpn) || 0));

    let rowsHtml = '';
    for (let d of sortedDefects) {
      let rpnColor = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      if (d.rpn >= 300) rpnColor = 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
      if (d.rpn >= 600) rpnColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';

      let photoHtml = `<div class="text-[9px] text-slate-400 italic border border-dashed border-slate-300 dark:border-slate-600 p-2 rounded text-center">Нет фото</div>`;
      if (d.photo) {
        const realSrc = await PhotoManager.getAsyncUrl(d.photo) || window.getPhotoSrc(d.photo);
        photoHtml = `<img src="${realSrc}" class="w-14 h-14 object-cover rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer" onclick="openPhotoViewer('${d.photo}')">`;
      }

      rowsHtml += `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm mb-3">
            <div class="flex gap-3 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                <div class="shrink-0">${photoHtml}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-[9px] font-bold text-slate-500 uppercase truncate">${d.workTitle || ''}</div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white leading-tight truncate">${d.contractor || ''}</div>
                    <div class="text-[11px] font-bold text-red-600 mt-0.5">${d.defectName || ''} (Повторов: ${d.count || 0})</div>
                </div>
                <div class="shrink-0 text-center">
                    <div class="text-[8px] font-black text-slate-400 uppercase mb-1">RPN</div>
                    <div class="text-[14px] font-black px-2 py-0.5 rounded border ${rpnColor}">${d.rpn || 0}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                <div class="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span class="font-black text-slate-500 uppercase block mb-1">Причина (${d.stage || '-'}):</span>
                    <span class="text-slate-700 dark:text-slate-300 break-words">${d.cause || '-'}</span>
                </div>
                <div class="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span class="font-black text-slate-500 uppercase block mb-1">Последствия (Риски):</span>
                    <span class="text-slate-700 dark:text-slate-300 break-words">${d.effect || '-'}</span>
                </div>
                <div class="bg-blue-50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    <span class="font-black text-blue-600 uppercase block mb-1">Как устранить (Fix):</span>
                    <span class="text-blue-900 dark:text-blue-200 break-words">${d.fix || '-'}</span>
                </div>
                <div class="bg-green-50 dark:bg-green-900/10 p-2 rounded-lg border border-green-100 dark:border-green-800/50">
                    <span class="font-black text-green-600 uppercase block mb-1">Предотвращение:</span>
                    <span class="text-green-900 dark:text-green-200 break-words">${d.prevent || '-'}</span>
                </div>
            </div>
        </div>`;
    }

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full gap-2">
            <span class="text-[13px] sm:text-[14px] uppercase font-black text-slate-800 dark:text-white flex items-center gap-2 min-w-0 truncate">📊 FMEA Отчет</span>
            <button onclick="rbi_closeFmeaViewModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg shrink-0">✕</button>
        </div>
    `;
    const projectLabel = String(record.project_display_name || record.projectName || record.project || '').trim() || 'Без объекта';
    const canBind = _fmeaCanBindRecord(record);
    const bindBtn = canBind
      ? `<button onclick="rbi_openFmeaBindModal('${String(record.id).replace(/'/g, "\\'")}')" class="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase active:scale-95 shrink-0">Изменить объект</button>`
      : '';

    document.getElementById('modal-body').innerHTML = `
        <div class="text-[11px] font-bold text-slate-500 mb-3 border-b border-slate-200 dark:border-slate-700 pb-3 flex flex-wrap justify-between items-center gap-2">
            <span class="truncate">Инженер: <b>${record.author || '—'}</b></span>
            <span class="truncate">Период: <b>${record.periodName || '—'}</b></span>
        </div>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <div class="min-w-0 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest mr-1.5">Объект</span>
                <span class="truncate">${projectLabel.replace(/</g, '&lt;')}</span>
            </div>
            ${bindBtn}
        </div>
        <div class="max-h-[calc(94vh-200px)] overflow-y-auto custom-scrollbar pr-1 pb-4">
            ${rowsHtml}
        </div>
        <div class="flex flex-col sm:flex-row gap-2 mt-2">
            <button onclick="rbi_exportFmeaExcel('${record.id}')" class="w-full sm:flex-[0.5] bg-green-50 text-green-700 border border-green-200 py-3 sm:py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5"><svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> В Excel</button>
            <button onclick="rbi_printFmeaPdf('${record.id}', 'script')" class="w-full sm:flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 sm:py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5"><svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path></svg> В PDF</button>
            <button onclick="rbi_printFmeaPdf('${record.id}', 'browser')" class="w-full sm:flex-1 bg-indigo-600 text-white py-3 sm:py-3.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"><svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button>
        </div>
    `;
    _setFmeaViewModalLayout(true);
    if (!window._fmeaWideModalHooked) {
      window._fmeaWideModalHooked = true;
      const prevClose = window.closeModal;
      window.closeModal = function () {
        _setFmeaViewModalLayout(false);
        if (typeof prevClose === 'function') return prevClose.apply(this, arguments);
      };
    }
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
  };

  function rbi_closeFmeaViewModal() {
    _setFmeaViewModalLayout(false);
    if (typeof closeModal === 'function') closeModal();
  }

  /* ── FMEA: привязка к объекту (админ — любые, инженер — свои) ─────────────── */

  function _fmeaIsDemoMode() {
    if (GameActions._ctx && GameActions._ctx.appMode) return GameActions._ctx.appMode.isDemo();
    return window.RBI?.services?.appMode?.isDemo?.() === true;
  }

  function _fmeaTriggerSync(mode) {
    const m = mode || 'silent';
    if (GameActions._ctx && GameActions._ctx.sync) return GameActions._ctx.sync.trigger(m);
    if (window.RBI?.services?.sync) return window.RBI.services.sync.trigger(m);
    if (typeof triggerSync === 'function') return triggerSync(m);
    return Promise.resolve(false);
  }

  function _fmeaPermSvc() {
    return (GameActions._ctx && GameActions._ctx.permissions)
      || window.RBI?.services?.permissions
      || null;
  }

  function _fmeaIsAdmin() {
    const perm = _fmeaPermSvc();
    return !!(perm && typeof perm.isAdmin === 'function' && perm.isAdmin());
  }

  function _fmeaCurrentEngineerName() {
    return String(_getSetting('engineerName')
      || document.getElementById('inp-inspector')?.value
      || '').trim();
  }

  function _fmeaCanBindRecord(rec) {
    if (!rec) return false;
    if (_fmeaIsAdmin()) return true;
    const me = _fmeaCurrentEngineerName();
    return !rec.author || !me || rec.author === me;
  }

  function _fmeaGetAssignedKeys() {
    const perm = _fmeaPermSvc();
    if (perm && typeof perm.getAssignedProjects === 'function') {
      const keys = perm.getAssignedProjects();
      if (Array.isArray(keys) && keys.length) return keys;
    }
    if (typeof appSettings !== 'undefined' && Array.isArray(appSettings.assignedProjects)) {
      return appSettings.assignedProjects;
    }
    return [];
  }

  function _fmeaResolveDisplayName(key) {
    const raw = String(key || '').trim();
    if (!raw) return '';
    if (typeof ObjectDirectory !== 'undefined' && Array.isArray(ObjectDirectory.objects)) {
      const obj = ObjectDirectory.objects.find(o => o.canonical_key === raw || o.display_name === raw);
      if (obj) return String(obj.display_name || obj.canonical_key || raw).trim();
    }
    const hit = _getAllInspections().find(c =>
      c.project_canonical_key === raw
      || c.projectName === raw
      || c.project_display_name === raw
    );
    if (hit) return String(hit.project_display_name || hit.projectName || raw).trim();
    return raw;
  }

  function _fmeaResolveCanonicalKey(displayOrKey) {
    const raw = String(displayOrKey || '').trim();
    if (!raw || raw === 'Все объекты') return '';
    if (typeof ObjectDirectory !== 'undefined' && Array.isArray(ObjectDirectory.objects)) {
      const byKey = ObjectDirectory.objects.find(o => o.canonical_key === raw);
      if (byKey) return String(byKey.canonical_key || '').trim();
      const byName = ObjectDirectory.objects.find(o => o.display_name === raw);
      if (byName) return String(byName.canonical_key || '').trim();
    }
    const hit = _getAllInspections().find(c =>
      c.project_display_name === raw
      || c.projectName === raw
      || c.project_canonical_key === raw
    );
    if (hit) return String(hit.project_canonical_key || '').trim();
    return '';
  }

  function _fmeaCollectAllProjectNames() {
    const fromInsp = _getAllInspections()
      .map(c => String(c.project_display_name || c.projectName || '').trim())
      .filter(Boolean);
    const fromAssigned = _fmeaGetAssignedKeys().map(_fmeaResolveDisplayName).filter(Boolean);
    const fromFmea = (_getFmea() || [])
      .map(f => String(f.project_display_name || f.projectName || '').trim())
      .filter(Boolean)
      .filter(n => n !== 'Все объекты' && !n.includes(','));
    return [...new Set([...fromInsp, ...fromAssigned, ...fromFmea])].sort((a, b) => a.localeCompare(b, 'ru'));
  }

  function _fmeaSelectableProjectNames() {
    const all = _fmeaCollectAllProjectNames();
    if (_fmeaIsAdmin()) return all;
    const names = [];
    _fmeaGetAssignedKeys().forEach((key) => {
      const display = _fmeaResolveDisplayName(key);
      if (display && !names.includes(display)) names.push(display);
    });
    return names.sort((a, b) => a.localeCompare(b, 'ru'));
  }

  function _fmeaCurrentBindSelection(rec) {
    if (!rec) return { isAll: false, selected: [] };
    if (Array.isArray(rec.projectNames) && rec.projectNames.length) {
      return { isAll: false, selected: rec.projectNames.map(n => String(n).trim()).filter(Boolean) };
    }
    const raw = String(rec.project_display_name || rec.projectName || rec.project || '').trim();
    if (!raw || raw === 'Без объекта') return { isAll: false, selected: [] };
    if (raw === 'Все объекты') return { isAll: true, selected: [] };
    if (raw.includes(',')) {
      return { isAll: false, selected: raw.split(',').map(s => s.trim()).filter(Boolean) };
    }
    return { isAll: false, selected: [raw] };
  }

  function _fmeaApplyProjectFields(rec, isAll, selected) {
    const names = Array.isArray(selected) ? selected.map(s => String(s).trim()).filter(Boolean) : [];
    if (isAll) {
      rec.projectName = 'Все объекты';
      rec.projectNames = [];
      rec.project = 'Все объекты';
      rec.project_display_name = 'Все объекты';
      rec.project_canonical_key = '';
    } else if (names.length === 1) {
      rec.projectName = names[0];
      rec.projectNames = names.slice();
      rec.project = names[0];
      rec.project_display_name = names[0];
      rec.project_canonical_key = _fmeaResolveCanonicalKey(names[0]);
    } else {
      rec.projectName = names.join(', ');
      rec.projectNames = names.slice();
      rec.project = rec.projectName;
      rec.project_display_name = rec.projectName;
      rec.project_canonical_key = '';
    }
  }

  function rbi_closeFmeaBindModal() {
    _setFmeaViewModalLayout(false);
    if (typeof closeModal === 'function') closeModal();
  }

  function rbi_openFmeaBindModal(fmeaId) {
    const rec = _getFmea().find(f => String(f.id) === String(fmeaId));
    if (!rec) return showToast('⚠️ FMEA не найден');
    if (!_fmeaCanBindRecord(rec)) {
      return showToast('⚠️ Нет прав менять привязку чужого FMEA');
    }

    const isAdmin = _fmeaIsAdmin();
    const options = _fmeaSelectableProjectNames();
    if (!isAdmin && !options.length) {
      return showToast('⚠️ Нет закреплённых объектов — обратитесь к администратору');
    }

    const current = _fmeaCurrentBindSelection(rec);
    let defaultAll = isAdmin && current.isAll;
    let defaultSelected = current.selected.filter(n => options.includes(n));
    if (!isAdmin) {
      defaultAll = false;
      if (!defaultSelected.length && options.length === 1) defaultSelected = [options[0]];
    }

    const projBoxes = options.map((p) => {
      const safe = p.replace(/"/g, '&quot;');
      const checked = !defaultAll && defaultSelected.includes(p) ? 'checked' : '';
      return `
            <label class="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm active:scale-[0.99]">
                <input type="checkbox" value="${safe}" class="fmea-bind-proj-cb w-5 h-5 accent-orange-600 rounded cursor-pointer" ${checked} onchange="rbi_onFmeaBindProjectChange()">
                <span class="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">${p}</span>
            </label>`;
    }).join('');

    const allBlock = isAdmin ? `
        <label class="flex items-center gap-3 p-3 mb-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl cursor-pointer border border-orange-200 dark:border-orange-800">
            <input type="checkbox" id="fmea-bind-proj-all" class="w-5 h-5 accent-orange-600 rounded cursor-pointer" ${defaultAll ? 'checked' : ''} onchange="rbi_onFmeaBindProjectAllChange()">
            <span class="text-[13px] font-black text-orange-700 dark:text-orange-300">Все объекты</span>
        </label>` : '';

    const curLabel = String(rec.project_display_name || rec.projectName || '').trim() || 'Без объекта';
    const safeId = String(fmeaId).replace(/'/g, "\\'");

    document.getElementById('modal-icon').innerHTML = '';
    document.getElementById('modal-title').innerHTML = `
        <div class="flex justify-between items-center w-full gap-2">
            <span class="text-[14px] uppercase font-black text-slate-800 dark:text-white">🏗 Привязка FMEA к объекту</span>
            <button onclick="rbi_closeFmeaBindModal()" class="text-slate-400 hover:text-red-500 active:scale-90 px-2 text-lg shrink-0">✕</button>
        </div>`;

    document.getElementById('modal-body').innerHTML = `
        <div class="max-h-[calc(94vh-140px)] overflow-y-auto custom-scrollbar pr-0.5">
            <div class="text-[11px] text-slate-500 mb-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div class="font-bold text-slate-700 dark:text-slate-200 mb-1">${String(rec.title || 'FMEA').replace(/</g, '&lt;')}</div>
                <div>Сейчас: <b class="text-slate-800 dark:text-slate-100">${curLabel.replace(/</g, '&lt;')}</b>
                    ${isAdmin ? '' : ' · доступны только ваши объекты'}
                </div>
            </div>
            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Объект <span class="text-orange-500">*</span></label>
            ${allBlock}
            <div class="space-y-2 mb-4">
                ${projBoxes || `<div class="text-[11px] text-slate-400 font-bold py-6 text-center">Нет доступных объектов</div>`}
            </div>
            <p class="text-[10px] text-slate-400 font-bold mb-4">${isAdmin ? 'Можно выбрать все, один или несколько' : 'Выберите один или несколько своих объектов'}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 sticky bottom-0 bg-[var(--card-bg)] pt-1">
            <button onclick="rbi_closeFmeaBindModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase border border-slate-200 dark:border-slate-700">Отмена</button>
            <button onclick="rbi_saveFmeaBind('${safeId}')" class="flex-1 bg-orange-500 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">Сохранить привязку</button>
        </div>`;

    _setFmeaViewModalLayout(true);
    if (!window._fmeaWideModalHooked) {
      window._fmeaWideModalHooked = true;
      const prevClose = window.closeModal;
      window.closeModal = function () {
        _setFmeaViewModalLayout(false);
        if (typeof prevClose === 'function') return prevClose.apply(this, arguments);
      };
    }

    const modal = document.getElementById('modal-overlay');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
  }

  function rbi_onFmeaBindProjectAllChange() {
    const allCb = document.getElementById('fmea-bind-proj-all');
    if (allCb && allCb.checked) {
      document.querySelectorAll('.fmea-bind-proj-cb').forEach(cb => { cb.checked = false; });
    }
  }

  function rbi_onFmeaBindProjectChange() {
    const any = document.querySelectorAll('.fmea-bind-proj-cb:checked').length > 0;
    if (any) {
      const allCb = document.getElementById('fmea-bind-proj-all');
      if (allCb) allCb.checked = false;
    }
  }

  async function rbi_saveFmeaBind(fmeaId) {
    if (_fmeaIsDemoMode()) return showToast('В демо-режиме сохранение отключено');
    const rec = _getFmea().find(f => String(f.id) === String(fmeaId));
    if (!rec) return showToast('⚠️ FMEA не найден');
    if (!_fmeaCanBindRecord(rec)) {
      return showToast('⚠️ Нет прав менять привязку чужого FMEA');
    }

    const isAdmin = _fmeaIsAdmin();
    const allowed = _fmeaSelectableProjectNames();
    const allCb = document.getElementById('fmea-bind-proj-all');
    const isAll = !!(isAdmin && allCb && allCb.checked);
    let selected = Array.from(document.querySelectorAll('.fmea-bind-proj-cb:checked'))
      .map(cb => String(cb.value || '').trim())
      .filter(Boolean);
    if (!isAdmin) selected = selected.filter(n => allowed.includes(n));

    if (!isAll && selected.length === 0) {
      return showToast(isAdmin
        ? '⚠️ Выберите объект: все, один или несколько'
        : '⚠️ Выберите один или несколько своих объектов');
    }

    _fmeaApplyProjectFields(rec, isAll, selected);
    rec.updatedAt = new Date().toISOString();
    rec.updated_at = rec.updatedAt;
    rec.source = 'local';
    rec.syncStatus = 'not_synced';
    rec.sync_status = 'not_synced';
    rec.syncBlockReason = '';
    rec.sync_block_reason = '';

    await _storage().put(_storage().stores().FMEA, rec);
    if (!_fmeaIsDemoMode()) {
      if (GameActions._ctx && GameActions._ctx.sync) {
        GameActions._ctx.sync.enqueue('SAVE_FMEA', rec);
      } else if (window.RBI?.services?.sync) {
        window.RBI.services.sync.enqueue('SAVE_FMEA', rec);
      } else if (window.SyncQueueManager) {
        window.SyncQueueManager.enqueue('SAVE_FMEA', rec);
      }
    }
    localStorage.setItem('rbi_cloud_dirty', '1');
    _fmeaTriggerSync('silent');

    rbi_closeFmeaBindModal();
    rbi_renderFmeaRegistry();
    showToast('✅ Объект FMEA обновлён');
  }

  // === FMEA: ГЕНЕРАЦИЯ МЕГА-ТАБЛИЦЫ И РУЧНАЯ СТРОКА ===
  // Перенесено из js/game.js (строка 2737).
  function rbi_generateFmeaTable() {
    const _allInspections = _getAllInspections();
    const workspace = document.getElementById('fmea-workspace');
    const periodVal = document.getElementById('fmea-period-select').value;

    let days = 7; let periodName = "Неделя";
    if (periodVal === 'MONTH') { days = 30; periodName = "Месяц"; }
    if (periodVal === 'QUARTER') { days = 90; periodName = "Квартал"; }

    const d = new Date();
    const startDate = new Date(d); startDate.setDate(startDate.getDate() - days);

    const periodChecks = _allInspections.filter(c => new Date(c.date) >= startDate);

    let defectsCountMap = {};
    let defectsDataMap = {};

    periodChecks.forEach(c => {
      if (c.state && c.templateKey) {
        Object.keys(c.state).forEach(id => {
          if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
            const flat = getFlatList(_templates().getUserTemplates()[c.templateKey.replace('user_', '')]?.groups || _templates().getSystemTemplates()[c.templateKey.replace('sys_', '')]?.groups);
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
              if (c.photos && c.photos[id]) defectsDataMap[uniqueKey].photo = c.photos[id];
            }
          }
        });
      }
    });

    const FMEA_THRESHOLD = 3;

    const finalDefects = [];
    for (let key in defectsCountMap) {
      if (defectsCountMap[key] >= FMEA_THRESHOLD) {
        const def = defectsDataMap[key];
        def.count = defectsCountMap[key];

        def.isRepeated = false;
        _getFmea().forEach(f => {
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

    finalDefects.sort((a, b) => b.count - a.count);

    let rowsHtml = finalDefects.map((def, idx) => {
      let photoHtml = '';
      if (def.photo) {
        photoHtml = `
            <div class="relative w-16 h-16 mt-2 group">
                <img src="${window.getPhotoSrc(def.photo)}" class="w-full h-full object-cover rounded-lg border border-slate-300 cursor-pointer" onclick="openPhotoViewer('${def.photo}')">
                <button onclick="rbi_removeFmeaPhoto(this)" class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md">✕</button>
            </div>`;
      } else {
        photoHtml = `
            <div class="mt-2 w-16">
                <div class="text-[9px] text-slate-400 italic mb-1 text-center border border-dashed border-slate-300 rounded p-1">Нет фото</div>
                <button onclick="document.getElementById('fmea-photo-upload').click(); window.currentFmeaRowIdx=${idx};" class="w-full bg-slate-100 text-slate-500 py-1 rounded border border-slate-300 text-[9px] font-bold uppercase active:scale-95 transition-colors">📷 Добавить</button>
            </div>`;
      }
      const repeatedTag = def.isRepeated ? `<div class="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded uppercase font-black w-fit mt-1 animate-pulse">Повторный</div>` : '';

      return `
        <tr class="fmea-row bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" data-idx="${idx}">
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
                ${repeatedTag}
                ${photoHtml}
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[120px]">
                <select class="f-stage input-base !py-1.5 !text-[10px] font-bold w-full bg-slate-50 dark:bg-slate-900 dark:text-slate-200">
                    <option value="Ошибки СМР" ${def.stage === 'Ошибки СМР' ? 'selected' : ''}>Ошибки СМР</option>
                    <option value="Проект" ${def.stage === 'Проект' ? 'selected' : ''}>Проектная ошибка</option>
                    <option value="Материалы" ${def.stage === 'Материалы' ? 'selected' : ''}>Материалы / Завод</option>
                    <option value="Условия" ${def.stage === 'Условия' ? 'selected' : ''}>Внешние условия</option>
                </select>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-cause input-base w-full h-20 resize-none text-[10px] p-2 dark:bg-slate-900 dark:text-slate-200" placeholder="Коренная причина...">${def.cause || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-effect input-base w-full h-20 resize-none text-[10px] p-2 dark:bg-slate-900 dark:text-slate-200" placeholder="Последствия (Риски)...">${def.effect || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-fix input-base w-full h-20 resize-none text-[10px] p-2 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-200" placeholder="Как устранить сейчас...">${def.fix || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]">
                <textarea class="f-prevent input-base w-full h-20 resize-none text-[10px] p-2 bg-green-50 dark:bg-green-900/20 dark:text-green-200" placeholder="Системное предотвращение...">${def.prevent || ''}</textarea>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[80px]">
                <div class="text-center">
                    <div class="text-[8px] font-bold text-slate-400 mb-1">RPN</div>
                    <input type="number" class="f-rpn input-base text-center font-black text-lg text-purple-700 dark:text-purple-400 !py-2 dark:bg-slate-900" placeholder="0" value="${def.rpn || 0}">
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
                <button onclick="window.RBI.services.ai.rbi_fillFmeaWithAi()" id="btn-fmea-ai" class="bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Автозаполнение (ИИ)
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
            <button onclick="rbi_addManualFmeaRow()" class="w-full mt-3 bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase border border-slate-300 active:scale-95 transition-colors flex items-center justify-center gap-2">
                ➕ Добавить строку вручную
            </button>
            <button onclick="rbi_saveFmea('${periodName}')" class="w-full mt-4 bg-purple-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                💾 Сохранить отчет в Систему
            </button>
        </div>
    `;
  };

  // Перенесено из js/game.js (строка 3061).
  function rbi_addManualFmeaRow() {
    const tbody = document.querySelector('#fmea-workspace tbody');
    if (!tbody) return;
    const idx = tbody.children.length;
    const newRow = `
        <tr class="fmea-row bg-white hover:bg-purple-50/30 transition-colors" data-idx="${idx}">
            <input type="hidden" class="f-contr" value="Ручной ввод">
            <input type="hidden" class="f-work" value="Ручной ввод">
            <input type="hidden" class="f-defect" value="Ручной ввод">
            <input type="hidden" class="f-photo" value="">
            <input type="hidden" class="f-count" value="1">
            
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[150px]">
                <input type="text" class="f-work-input input-base !py-1 !text-[10px] font-bold mb-1" placeholder="Вид работ" onchange="this.closest('tr').querySelector('.f-work').value = this.value">
                <input type="text" class="f-contr-input input-base !py-1 !text-[10px] font-black mb-1" placeholder="Подрядчик" onchange="this.closest('tr').querySelector('.f-contr').value = this.value">
                <input type="text" class="f-defect-input input-base !py-1 !text-[10px] font-bold text-red-600" placeholder="Опишите дефект" onchange="this.closest('tr').querySelector('.f-defect').value = this.value">
                <div class="mt-2 w-16">
                    <div class="text-[9px] text-slate-400 italic mb-1 text-center border border-dashed border-slate-300 rounded p-1">Нет фото</div>
                    <button onclick="document.getElementById('fmea-photo-upload').click(); window.currentFmeaRowIdx=${idx};" class="w-full bg-slate-100 text-slate-500 py-1 rounded border border-slate-300 text-[9px] font-bold uppercase active:scale-95 transition-colors">📷 Добавить</button>
                </div>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[120px]">
                <select class="f-stage input-base !py-1.5 !text-[10px] font-bold w-full bg-slate-50">
                    <option value="Ошибки СМР">Ошибки СМР</option>
                    <option value="Проект">Проектная ошибка</option>
                    <option value="Материалы">Материалы / Завод</option>
                    <option value="Условия">Внешние условия</option>
                </select>
            </td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]"><textarea class="f-cause input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed" placeholder="Коренная причина..."></textarea></td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]"><textarea class="f-effect input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed" placeholder="Последствия (Риски)..."></textarea></td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]"><textarea class="f-fix input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed bg-blue-50" placeholder="Как устранить сейчас..."></textarea></td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[180px]"><textarea class="f-prevent input-base w-full h-20 resize-none text-[10px] p-2 leading-relaxed bg-green-50" placeholder="Системное предотвращение..."></textarea></td>
            <td class="p-2 border border-slate-200 dark:border-slate-700 align-top min-w-[80px]">
                <div class="text-center">
                    <div class="text-[8px] font-bold text-slate-400 mb-1">RPN</div>
                    <input type="number" class="f-rpn input-base text-center font-black text-lg text-purple-700 !py-2" placeholder="0" min="1" max="1000">
                </div>
                <button onclick="this.closest('tr').remove()" class="mt-2 w-full text-red-500 bg-red-50 py-1 rounded text-[9px] font-bold uppercase border border-red-200">Удалить</button>
            </td>
        </tr>`;
    tbody.insertAdjacentHTML('beforeend', newRow);
  };

  // === ПАНЕЛЬ РУКОВОДИТЕЛЯ: чипы закреплённых объектов (рендер) ===
  // Перенесено из js/game.js (строка 3549).
  function gameRenderAssignedProjectChips(domId) {
    const input = document.getElementById(`proj_input_${domId}`);
    const box = document.getElementById(`proj_chips_${domId}`);
    if (!input || !box) return;

    let projectsArray = [];
    try { projectsArray = JSON.parse(input.value || '[]'); } catch (e) { projectsArray = []; }

    if (projectsArray.length === 0) {
      box.innerHTML = '<span class="text-[8px] text-slate-400 font-bold">Объекты не назначены</span>';
      return;
    }

    box.innerHTML = projectsArray.map(key => {
      let displayName = key;
      if (typeof ObjectDirectory !== 'undefined' && ObjectDirectory.objects) {
        const obj = ObjectDirectory.objects.find(o => o.canonical_key === key);
        if (obj) displayName = obj.display_name;
      }

      const safeKey = String(key).replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const safeName = String(displayName).replace(/</g, '&lt;').replace(/>/g, '&gt;');

      return `
        <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-1 text-[9px] font-black shadow-sm">
            ${safeName}
            <button onclick="event.preventDefault(); gameRemoveAssignedProjectChip('${domId}', '${safeKey}')" class="text-red-500 hover:text-red-700 font-black leading-none ml-1 active:scale-90">✕</button>
        </span>
        `;
    }).join('');
  };

  // === БАЗА ЗНАНИЙ AI: модалка добавления/редактирования ===
  // Перенесено из js/game.js (строка 4172).
  async function gameOpenAiKbModal(editId = null) {
    let q = '', a = '', tags = '';

    if (editId) {
      const kbItems = await _storage().getAll('app_assistant_kb') || [];
      const item = kbItems.find(i => i.id === editId);
      if (item) {
        q = item.question;
        a = item.answer;
        tags = (item.tags || []).join(', ');
      }
    }

    const html = `
    <div id="ai-kb-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm" onclick="this.remove()">
        <div class="bg-[var(--card-bg)] w-full max-w-md p-6 rounded-2xl shadow-2xl border border-[var(--card-border)] flex flex-col max-h-[90vh]" onclick="event.stopPropagation()">
            <div class="font-black text-[13px] uppercase tracking-tight mb-4 text-slate-800 dark:text-white flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0">
                <span>${editId ? 'Редактировать статью' : 'Добавить материал для ИИ'}</span>
                <button onclick="document.getElementById('ai-kb-modal').remove()" class="text-slate-400 hover:text-red-500 px-2 text-lg">✕</button>
            </div>
            
            <div class="space-y-3 mb-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Тема или частый вопрос</label>
                    <input type="text" id="ai-kb-q" class="input-base text-[12px]" value="${q.replace(/"/g, '&quot;')}" placeholder="Напр: Инструкция по созданию TWI карты">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Текст инструкции (Контекст)</label>
                    <textarea id="ai-kb-a" class="input-base text-[12px] h-48 resize-none leading-relaxed" placeholder="Вставьте сюда часть документа (до 3-4 абзацев)...">${a}</textarea>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Ключевые слова (через запятую)</label>
                    <input type="text" id="ai-kb-tags" class="input-base text-[11px]" value="${tags}" placeholder="Напр: twi, инструкция, обучение">
                </div>
            </div>
            
            <div class="flex gap-2 pt-2 shrink-0">
                <button onclick="document.getElementById('ai-kb-modal').remove()" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-[11px] uppercase border border-slate-200 dark:border-slate-700 active:scale-95 transition-colors">Отмена</button>
                <button onclick="gameSaveAiKb('${editId || ''}')" class="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 transition-transform">💾 Сохранить</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
  };

  const GameRender = {
    renderDashboard() {
      if (typeof gameRenderDashboard === 'function') {
        gameRenderDashboard();
      } else {
        console.warn('[GameRender] gameRenderDashboard not found');
      }
    },

    renderRadarChart() {
      if (typeof renderRadarChart === 'function') {
        renderRadarChart();
      } else {
        console.warn('[GameRender] renderRadarChart not found');
      }
    },

    renderStatsCharts() {
      if (typeof renderStatsCharts === 'function') {
        renderStatsCharts();
      } else {
        console.warn('[GameRender] renderStatsCharts not found');
      }
    },

    renderFmeaHistory() {
      if (typeof rbi_renderFmeaHistory === 'function') {
        rbi_renderFmeaHistory();
      } else {
        console.warn('[GameRender] rbi_renderFmeaHistory not found');
      }
    },

    renderFmeaRegistry() {
      if (typeof rbi_renderFmeaRegistry === 'function') {
        rbi_renderFmeaRegistry();
      } else {
        console.warn('[GameRender] rbi_renderFmeaRegistry not found');
      }
    },

    openManagerPanel() {
      if (typeof gameOpenManagerPanelAuth === 'function') {
        gameOpenManagerPanelAuth();
      } else {
        console.warn('[GameRender] gameOpenManagerPanelAuth not found');
      }
    },

    showLevelsModal() {
      if (typeof gameShowLevelsModal === 'function') {
        gameShowLevelsModal();
      } else {
        console.warn('[GameRender] gameShowLevelsModal not found');
      }
    }
  };

export {
  getBadgeTier, getBadgeSvg, injectAbsenceModal, gameShowLevelsModal, gameRenderDashboard,
  profileNameLockStart, profileNameLockCancel, renderRadarChart, renderStatsCharts, gameShowBadgeInfo,
  gameInjectManagerModals, gameOpenManagerPanelAuth, closeManagerPanel, openManagerPanelView,
  switchManagerTab, gameRenderManagerAnalytics,
  gameOpenTaskDetails, gameOpenTopModal, gameOpenImpactModal, rbi_openQualityDaySettings,
  rbi_renderFmeaHistory, rbi_renderFmeaRegistry, rbi_viewFmea, rbi_closeFmeaViewModal,
  rbi_openFmeaBindModal, rbi_closeFmeaBindModal, rbi_saveFmeaBind,
  rbi_onFmeaBindProjectAllChange, rbi_onFmeaBindProjectChange,
  rbi_generateFmeaTable,
  rbi_addManualFmeaRow, gameRenderAssignedProjectChips, gameOpenAiKbModal, GameRender
};
