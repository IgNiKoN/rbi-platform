/**
 * settings.render.js
 * Рендер вкладки «Настройки» (owner-module). Реализация перенесена
 * 1:1 из settings.legacy.js. Источник настроек — SettingsService через
 * локальный fallback-helper (по образцу audit.render.js: render.js и
 * actions.js — независимые файлы без общего module-scope, поэтому
 * _getSetting здесь — собственная копия, не импорт из settings.actions.js).
 */

import { SettingsActions } from './settings.actions.js';

var SettingsRender = {
    // =====================================================================
    // РАЗМЕТКА ВКЛАДКИ «НАСТРОЙКИ» (перенос из index.html:445-1529, JS-рендер).
    // Возвращает HTML-строку 1:1 идентичную прежней статичной разметке
    // #tab-settings.
    // =====================================================================
    renderMarkup: function () {
        return `
        <div id="tab-settings" class="view-section">
            <div
                class="sticky-top-panel bg-[var(--card-border)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-4 z-40 flex justify-between items-center">
                <h2
                    class="text-[13px] font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z">
                        </path>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z">
                        </path>
                    </svg>
                    Настройки
                </h2>
                <div class="flex items-center gap-2">
                    <button data-game-action="gameOpenManagerPanelAuth"
                        class="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full text-slate-500 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
                        title="Панель Руководителя">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">
                            </path>
                        </svg>
                    </button>
                    <button data-settings-action="resetSettingsToDefault"
                        class="text-[9px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg uppercase tracking-widest border border-red-100 dark:border-red-800/50 shadow-sm active:scale-95 transition-colors">По умолчанию</button>
                </div>
            </div>

            <div class="space-y-3">
                <!-- СИНХРОНИЗАЦИЯ КОМАНДЫ -->
                <details
                    class="bg-[var(--card-bg)] border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden"
                    open>
                    <summary
                        class="p-4 font-black text-[12px] text-indigo-700 dark:text-indigo-400 uppercase tracking-tight cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 transition-colors select-none group-open:border-b border-indigo-200 dark:border-indigo-800 rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z">
                                </path>
                            </svg>
                            Синхронизация Команды
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-indigo-400">▼</span>
                    </summary>
                    <div id="sync-settings-block"></div>
                </details>

                <!-- AI АССИСТЕНТ -->
                <details
                    class="bg-[var(--card-bg)] border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden mb-3">
                    <summary
                        class="p-4 font-black text-[12px] text-indigo-700 dark:text-indigo-400 uppercase tracking-tight cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 transition-colors select-none group-open:border-b border-indigo-200 dark:border-indigo-800 rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z">
                                </path>
                            </svg>
                            AI-ассистент (DeepSeek)
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-indigo-400">▼</span>
                    </summary>
                    <div class="rounded-b-2xl overflow-hidden">
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Включить AI</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Интеллектуальные подсказки и
                                    аналитика</div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-ai-enabled"
                                    data-settings-action="toggleSetting" data-settings-action-key="aiEnabled" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div id="ai-settings-body" class="transition-all duration-300 hidden">
                            <div class="p-4 bg-[var(--hover-bg)]">
                                <div class="font-bold text-sm mb-3">Способ вызова нейросети</div>
                                <div class="flex flex-col gap-3">
                                    <!-- Режим 1: По роли -->
                                    <label
                                        class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                                        <input type="radio" name="ai-mode" value="role"
                                            class="w-4 h-4 accent-indigo-600" data-action="changeAiMode" data-action-arg="role" data-action-event="change">
                                        <span
                                            class="text-[12px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                                </path>
                                            </svg> Автоматически (По роли)
                                        </span>
                                    </label>

                                    <!-- Режим 2: Корпоративный пароль -->
                                    <label
                                        class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                                        <input type="radio" name="ai-mode" value="corporate"
                                            class="w-4 h-4 accent-indigo-600"
                                            data-action="changeAiMode" data-action-arg="corporate" data-action-event="change">
                                        <span
                                            class="text-[12px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">
                                                </path>
                                            </svg> Через корпоративный пароль
                                        </span>
                                    </label>
                                    <div id="corporate-pwd-field"
                                        class="hidden bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner ml-6">
                                        <form onsubmit="event.preventDefault();">
                                            <!-- ВСТАВКА: Скрытый логин -->
                                            <input type="text" autocomplete="username" style="display:none;" value="admin">
                                            
                                            <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Пароль доступа к ИИ</label>
                                            <input type="password" id="set-ai-corp-pwd" autocomplete="new-password" class="input-base font-mono text-[10px] bg-slate-50 dark:bg-slate-900" placeholder="Введите пароль..." data-settings-action="toggleSetting" data-settings-action-key="aiCorpPwd" data-settings-action-val-type="element" data-action-event="change">
                                        </form>
                                    </div>

                                    <!-- Режим 3: Личный ключ -->
                                    <label
                                        class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                                        <input type="radio" name="ai-mode" value="personal"
                                            class="w-4 h-4 accent-indigo-600"
                                            data-action="changeAiMode" data-action-arg="personal" data-action-event="change">
                                        <span
                                            class="text-[12px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z">
                                                </path>
                                            </svg> Мой персональный API-ключ
                                        </span>
                                    </label>
                                    
                                    <div id="personal-key-field"
                                        class="hidden bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner ml-6">
                                        <form onsubmit="event.preventDefault();">
                                            <!-- ВСТАВКА: Скрытый логин -->
                                            <input type="text" autocomplete="username" style="display:none;" value="admin">
                                            
                                            <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">API-ключ DeepSeek</label>
                                            <input type="password" id="set-ai-key" autocomplete="new-password" class="input-base font-mono text-[10px] bg-slate-50 dark:bg-slate-900" placeholder="sk-..." data-settings-action="toggleSetting" data-settings-action-key="apiKey" data-settings-action-val-type="element" data-action-event="change">
                                            <div class="text-[8px] text-slate-400 mt-1.5 leading-snug">Сохраняется только на вашем устройстве.</div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </details>

                <!-- БРЕНДИРОВАНИЕ И АВТО-ОТЧЕТЫ -->
                <details
                    class="bg-[var(--card-bg)] border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden mb-3">
                    <summary
                        class="p-4 font-black text-[12px] text-indigo-700 dark:text-indigo-400 uppercase tracking-tight cursor-pointer flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 transition-colors select-none group-open:border-b border-indigo-200 dark:border-indigo-800 rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01">
                                </path>
                            </svg>
                            Брендирование и Авто-Отчеты (PRO)
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-indigo-400">▼</span>
                    </summary>
                    <div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Фирменный цвет</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Цвет акцентов в PDF</div>
                            </div>
                            <input type="color" id="set-brand-color"
                                class="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                                data-settings-action="toggleSetting" data-settings-action-key="brandColor" data-settings-action-val-type="element" data-action-event="change">
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)]">
                            <div class="flex justify-between items-center mb-2">
                                <div>
                                    <div class="font-bold text-sm">Логотип компании</div>
                                    <div class="text-[10px] text-[var(--text-muted)] mt-1">Отобразится в шапке отчетов
                                    </div>
                                </div>
                                <button onclick="document.getElementById('brand-logo-upload').click()"
                                    class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95 border border-indigo-200">Загрузить</button>
                                <input type="file" id="brand-logo-upload" accept="image/png, image/jpeg" class="hidden"
                                    data-settings-action="handleLogoUpload" data-settings-action-val-type="event" data-action-event="change">
                            </div>
                            <div id="brand-logo-preview"
                                class="hidden mt-3 border border-slate-200 rounded-lg p-2 bg-slate-50 flex justify-between items-center shadow-inner">
                                <img id="brand-logo-img" src="" class="h-10 object-contain rounded">
                                <button data-settings-action="removeBrandLogo"
                                    class="text-red-500 text-[10px] font-bold px-3 py-1.5 bg-white rounded border border-red-200 shadow-sm active:scale-90">Удалить</button>
                            </div>
                            <!-- УПРАВЛЕНИЕ КОРПОРАТИВНЫМ СТИЛЕМ -->
                            <div id="corp-branding-controls" class="mt-3"></div>
                        </div>
                        <!-- НОВАЯ КНОПКА: КОНСТРУКТОР ШАБЛОНОВ -->
                        <div
                            class="p-4 border-b border-[var(--card-border)] flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/10">
                            <div>
                                <div class="font-bold text-sm text-indigo-800 dark:text-indigo-300">Шаблоны отчетов
                                    (PDF)</div>
                                <div class="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">Настройка блоков и
                                    дизайна</div>
                            </div>

                            <button data-reports-action="openPdfTemplateModal"
                                class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-md flex items-center gap-1.5">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4">
                                    </path>
                                </svg> Настроить
                            </button>
                        </div>
                        <div class="p-4 bg-[var(--hover-bg)] rounded-b-2xl">
                            <div class="flex justify-between items-center mb-3">
                                <div>
                                    <div class="font-bold text-sm text-indigo-700 dark:text-indigo-400">Фоновые отчеты
                                    </div>
                                    <div class="text-[10px] text-[var(--text-muted)] mt-1">Авто-генерация без зависаний
                                    </div>
                                </div>
                                <label class="toggle-switch"><input type="checkbox" id="set-auto-report"
                                        data-settings-action="toggleSetting" data-settings-action-key="autoReportEnabled" data-settings-action-val-type="element" data-action-event="change"><span
                                        class="toggle-slider"></span></label>
                            </div>
                            <div class="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">День месяца</div>
                                    <input type="number" id="set-auto-report-day" class="input-base text-center !py-2"
                                        min="1" max="28" data-settings-action="toggleSetting" data-settings-action-key="autoReportDay" data-settings-action-val-type="element" data-action-event="change">
                                </div>
                                <div>
                                    <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Тип отчета</div>
                                    <select id="set-auto-report-type" class="input-base !py-2 text-[11px]"
                                        data-settings-action="toggleSetting" data-settings-action-key="autoReportType" data-settings-action-val-type="element" data-action-event="change">
                                        <option value="global_onepager">По Компании</option>
                                        <option value="onepager">По Объектам</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </details>

                <!-- ИНТЕРФЕЙС И ОФОРМЛЕНИЕ -->
                <details
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden mb-3">
                    <summary
                        class="p-4 font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01">
                                </path>
                            </svg>
                            Интерфейс и управление
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-slate-400">▼</span>
                    </summary>
                    <div>
                        <!-- Настройки внешнего вида -->
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Тема приложения</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Цветовая схема</div>
                            </div>
                            <select id="set-theme" class="input-base w-40" data-settings-action="toggleSetting" data-settings-action-key="theme" data-settings-action-val-type="element" data-action-event="change">
                                <option value="auto">Системная</option>
                                <option value="light">Светлая</option>
                                <option value="dark">Тёмная</option>
                                <option value="rbi-light">RBI Светлая</option>
                                <option value="rbi-dark">RBI Тёмная</option>
                                <option value="rbi-light-v2">RBI Светлая v2</option>
                                <option value="rbi-dark-v2">RBI Тёмная v2</option>
                            </select>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Масштаб интерфейса</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Размер шрифта и кнопок</div>
                            </div>
                            <select id="set-fontsize" class="input-base w-32"
                                data-settings-action="toggleSetting" data-settings-action-key="fontSize" data-settings-action-val-type="element" data-action-event="change">
                                <option value="small">Мелкий</option>
                                <option value="medium">Средний</option>
                                <option value="large">Крупный</option>
                                <option value="xlarge">Очень крупный</option>
                            </select>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Позиция меню</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Где отображать кнопки вкладок
                                </div>
                            </div>
                            <select id="set-navpos" class="input-base w-32"
                                data-settings-action="toggleSetting" data-settings-action-key="navPosition" data-settings-action-val-type="element" data-action-event="change">
                                <option value="auto">Авто (ПК-Верх)</option>
                                <option value="top">Всегда сверху</option>
                                <option value="bottom">Всегда снизу</option>
                            </select>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Мини-дашборд</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Отображение в шапке осмотра</div>
                            </div>
                            <select id="set-dashmode" class="input-base w-32"
                                data-settings-action="toggleSetting" data-settings-action-key="dashboardMode" data-settings-action-val-type="element" data-action-event="change">
                                <option value="compact">Компактный</option>
                                <option value="expanded">Развернутый</option>
                                <option value="hidden">Отключить</option>
                            </select>
                        </div>

                        <!-- Настройки поведения -->
                        <!-- Настройки уведомлений -->
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Push-уведомления</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Оповещения о новых задачах СК
                                </div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="set-push-notifications"
                                    data-settings-action="togglePushSettings" data-settings-action-val-type="element" data-action-event="change">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Свайпы (Вправо/Влево)</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Управление жестами в Осмотре
                                </div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-swipe"
                                    data-settings-action="toggleSetting" data-settings-action-key="swipeEnabled" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Схлопывать OK</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Сворачивать пройденные карточки
                                </div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-collapse"
                                    data-settings-action="toggleSetting" data-settings-action-key="autoCollapseOk" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Группы свернуты</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Изначально скрывать пункты этапов
                                </div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-groups-col"
                                    data-settings-action="toggleSetting" data-settings-action-key="defaultGroupsCollapsed" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 flex justify-between items-center rounded-b-2xl">
                            <div>
                                <div class="font-bold text-sm">Быстрый режим</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Скрыть тексты нормативов</div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-fast"
                                    data-settings-action="toggleSetting" data-settings-action-key="fastMode" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                    </div>
                </details>

                <!-- БАЗА ЗНАНИЙ -->
                <details
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary
                        class="p-4 font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            База знаний
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-slate-400">▼</span>
                    </summary>
                    <div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">TWI</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Карточки или список</div>
                            </div>
                            <select id="set-kb-view-twi" class="input-base w-36"
                                data-settings-action="toggleSetting" data-settings-action-key="knowledgeViewModeTwi" data-settings-action-val-type="element" data-action-event="change">
                                <option value="cards">Карточки</option>
                                <option value="list">Список</option>
                            </select>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Нормативы (НД)</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Карточки или список</div>
                            </div>
                            <select id="set-kb-view-docs" class="input-base w-36"
                                data-settings-action="toggleSetting" data-settings-action-key="knowledgeViewModeDocs" data-settings-action-val-type="element" data-action-event="change">
                                <option value="cards">Карточки</option>
                                <option value="list">Список</option>
                            </select>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Узлы</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Карточки или список</div>
                            </div>
                            <select id="set-kb-view-nodes" class="input-base w-36"
                                data-settings-action="toggleSetting" data-settings-action-key="knowledgeViewModeNodes" data-settings-action-val-type="element" data-action-event="change">
                                <option value="cards">Карточки</option>
                                <option value="list">Список</option>
                            </select>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Практики</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Карточки или список</div>
                            </div>
                            <select id="set-kb-view-practices" class="input-base w-36"
                                data-settings-action="toggleSetting" data-settings-action-key="knowledgeViewModePractices" data-settings-action-val-type="element" data-action-event="change">
                                <option value="cards">Карточки</option>
                                <option value="list">Список</option>
                            </select>
                        </div>
                        <div class="p-4 flex justify-between items-center rounded-b-2xl">
                            <div>
                                <div class="font-bold text-sm">Отчёты</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Карточки или список</div>
                            </div>
                            <select id="set-kb-view-reports" class="input-base w-36"
                                data-settings-action="toggleSetting" data-settings-action-key="knowledgeViewModeReports" data-settings-action-val-type="element" data-action-event="change">
                                <option value="cards">Карточки</option>
                                <option value="list">Список</option>
                            </select>
                        </div>
                    </div>
                </details>

                <!-- ОТОБРАЖЕНИЕ АРХИВОВ (Совещания / FMEA) -->
                <details
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary
                        class="p-4 font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M4 6h16M4 10h16M4 14h10M4 18h10"></path>
                            </svg>
                            Отображение архивов
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-slate-400">▼</span>
                    </summary>
                    <div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center gap-3">
                            <div class="min-w-0">
                                <div class="font-bold text-sm">Совещания</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Карточки или список по умолчанию</div>
                            </div>
                            <select id="set-kb-view-meetings" class="input-base w-36 shrink-0"
                                data-settings-action="toggleSetting" data-settings-action-key="knowledgeViewModeMeetings" data-settings-action-val-type="element" data-action-event="change">
                                <option value="cards">Карточки</option>
                                <option value="list">Список</option>
                            </select>
                        </div>
                        <div class="p-4 flex justify-between items-center gap-3 rounded-b-2xl">
                            <div class="min-w-0">
                                <div class="font-bold text-sm">FMEA</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Карточки или список по умолчанию</div>
                            </div>
                            <select id="set-kb-view-fmea" class="input-base w-36 shrink-0"
                                data-settings-action="toggleSetting" data-settings-action-key="knowledgeViewModeFmea" data-settings-action-val-type="element" data-action-event="change">
                                <option value="cards">Карточки</option>
                                <option value="list">Список</option>
                            </select>
                        </div>
                    </div>
                </details>

                <!-- АНАЛИТИКА И ОТЧЕТЫ -->
                <details
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary
                        class="p-4 font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                                </path>
                            </svg>
                            Визуализация Аналитики
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-slate-400">▼</span>
                    </summary>
                    <div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">AI-Анализ (Детализация)</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Отображать смарт-заключение</div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-ana-ai"
                                    data-settings-action="toggleSetting" data-settings-action-key="anaEngAi" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Галереи фото (Детализация)</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Ленты эталонов и брака</div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-ana-photos"
                                    data-settings-action="toggleSetting" data-settings-action-key="anaEngPhotos" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Графики Парето</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Причины брака и структура</div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-ana-pareto"
                                    data-settings-action="toggleSetting" data-settings-action-key="anaEngPareto" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Топ-5 Дефектов (Сводка)</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Антирейтинг нарушений B2 и B3
                                </div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-ana-top"
                                    data-settings-action="toggleSetting" data-settings-action-key="anaOpTopDefects" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Тренд объекта (Сводка)</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Глобальный график УрК</div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-ana-trend"
                                    data-settings-action="toggleSetting" data-settings-action-key="anaOpTrend" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                        <div class="p-4 flex justify-between items-center">
                            <div>
                                <div class="font-bold text-sm">Лидеры / Аутсайдеры (Сводка)</div>
                                <div class="text-[10px] text-[var(--text-muted)] mt-1">Блоки зон риска и качества</div>
                            </div>
                            <label class="toggle-switch"><input type="checkbox" id="set-ana-leader"
                                    data-settings-action="toggleSetting" data-settings-action-key="anaOpLeader" data-settings-action-val-type="element" data-action-event="change"><span
                                    class="toggle-slider"></span></label>
                        </div>
                    </div>
                </details>


                <!-- РАСПИСАНИЕ ЗАДАЧ -->
                <details
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden mb-3">
                    <summary
                        class="p-4 font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                                </path>
                            </svg>
                            Расписание рутинных задач
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-slate-400">▼</span>
                    </summary>
                    <div>
                        <div
                            class="p-4 border-b border-[var(--card-border)] flex justify-between items-center bg-[var(--hover-bg)]">
                            <div>
                                <div class="font-bold text-sm">Совещание (Мемо)</div>
                            </div>
                            <select id="set-task-meeting" class="input-base w-32"
                                data-settings-action="toggleSetting" data-settings-action-key="taskMeetingDay" data-settings-action-val-type="element" data-action-event="change">
                                <option value="1">Понедельник</option>
                                <option value="2">Вторник</option>
                                <option value="3">Среда</option>
                                <option value="4">Четверг</option>
                                <option value="5">Пятница</option>
                            </select>
                        </div>
                        <div
                            class="p-4 border-b border-[var(--card-border)] flex justify-between items-center bg-[var(--hover-bg)]">
                            <div>
                                <div class="font-bold text-sm">FMEA и Плакаты</div>
                            </div>
                            <select id="set-task-fmea" class="input-base w-32"
                                data-settings-action="toggleSetting" data-settings-action-key="taskFmeaDay" data-settings-action-val-type="element" data-action-event="change">
                                <option value="1">Понедельник</option>
                                <option value="4">Четверг</option>
                                <option value="5">Пятница</option>
                            </select>
                        </div>
                        <div class="p-4 flex justify-between items-center bg-[var(--hover-bg)] rounded-b-2xl">
                            <div>
                                <div class="font-bold text-sm">Ежемесячный отчет</div>
                            </div>
                            <select id="set-task-month" class="input-base w-32"
                                data-settings-action="toggleSetting" data-settings-action-key="taskMonthReportDay" data-settings-action-val-type="element" data-action-event="change">
                                <option value="1">1-е число</option>
                                <option value="5">5-е число</option>
                                <option value="10">10-е число</option>
                            </select>
                        </div>
                    </div>
                </details>

                <!-- УПРАВЛЕНИЕ ДАННЫМИ И БЭКАПЫ -->
                <details
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden mb-3">
                    <summary
                        class="p-4 font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4">
                                </path>
                            </svg>
                            Хранилище и Резервные копии
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-slate-400">▼</span>
                    </summary>
                    <div class="bg-white dark:bg-slate-800 rounded-b-2xl">

                        <!-- Память устройства -->
                        <div class="p-4 border-b border-[var(--card-border)]">
                            <div class="flex justify-between items-center mb-3">
                                <div class="font-bold text-sm">Хранилище (IndexedDB)</div>
                                <div class="text-xs font-black text-indigo-600 dark:text-indigo-400"
                                    id="storage-percent">--%</div>
                            </div>
                            <div class="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                                <div id="storage-bar" class="h-full bg-indigo-500 transition-all" style="width: 0%">
                                </div>
                            </div>
                            <div class="flex justify-between text-[10px] text-[var(--text-muted)] font-bold mb-4">
                                <span>Исп: <span id="storage-used">--</span> МБ</span>
                                <span>Свободно: <span id="storage-free">--</span> МБ</span>
                            </div>

                            <div class="flex justify-between items-center mb-4">
                                <div>
                                    <div class="font-bold text-sm">Авто-кэш облачных файлов</div>
                                    <div class="text-[10px] text-[var(--text-muted)] mt-1">Сохранять фото и PDF для
                                        офлайна</div>
                                </div>
                                <label class="toggle-switch"><input type="checkbox" id="set-autocache"
                                        data-settings-action="toggleSetting" data-settings-action-key="autoCacheCloudFiles" data-settings-action-val-type="element" data-action-event="change"><span
                                        class="toggle-slider"></span></label>
                            </div>

                            <div class="grid grid-cols-3 gap-2 mb-3">
                                <button data-settings-action="clearPdfCache"
                                    class="bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-[10px] uppercase border border-slate-200 dark:border-slate-600 active:scale-95 transition-colors flex items-center justify-center gap-2">
                                    Очистить кэш
                                </button>
                                <button data-settings-action="previewStorageCleanup"
                                    class="w-full mt-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-[11px] font-black uppercase active:scale-95 transition-transform">
                                    Проверить автоочистку
                                </button>
                                <button onclick="emptyTrashBin()"
                                    class="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 py-3 rounded-xl font-bold text-[10px] uppercase border border-orange-200 dark:border-orange-800/50 active:scale-95 transition-colors flex items-center justify-center gap-2">
                                    Очистить мусор
                                </button>
                            </div>

                            <!-- RBI NEW: управление файловым кэшем -->
                            <div
                                class="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                                <div class="flex items-center justify-between gap-3 mb-3">
                                    <div>
                                        <div
                                            class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                            Автоочистка файлового кэша
                                        </div>
                                        <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-1">
                                            Удаляет только локальные копии файлов, которые уже есть в облаке. Проверки и
                                            несинхронизированные фото не удаляются.
                                        </div>
                                    </div>

                                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input type="checkbox" id="set-storage-auto-cleanup" class="sr-only peer"
                                            data-settings-action="saveSettings" data-settings-action-key="storageAutoCleanupEnabled" data-settings-action-val-type="checked" data-action-event="change">
                                        <div
                                            class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5">
                                        </div>
                                    </label>
                                </div>

                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">
                                    Порог автоочистки
                                </label>
                                <select id="set-storage-cleanup-threshold" class="input-base text-[11px] mb-3"
                                    data-settings-action="saveSettings" data-settings-action-key="storageCleanupThresholdPercent" data-settings-action-val-type="int" data-action-event="change">
                                    <option value="60">Мягко: при заполнении 60%</option>
                                    <option value="80">Стандарт: при заполнении 80%</option>
                                    <option value="90">Экономно: при заполнении 90%</option>
                                </select>

                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">
                                    Хранить локальные копии фото проверок
                                </label>

                                <select id="set-storage-photo-ttl" class="input-base text-[11px]"
                                    data-settings-action="saveSettings" data-settings-action-key="storageInspectionPhotoTtlDays" data-settings-action-val-type="int" data-action-event="change">
                                    <option value="30">30 дней</option>
                                    <option value="60">60 дней</option>
                                    <option value="90">90 дней</option>
                                    <option value="180">180 дней</option>
                                </select>
                                <div class="grid grid-cols-1 gap-2 mt-3">
                                    <label class="text-[10px] font-black text-slate-500 uppercase block">
                                        Хранить PDF-отчеты локально
                                    </label>
                                    <select id="set-storage-report-ttl" class="input-base text-[11px]"
                                        data-settings-action="saveSettings" data-settings-action-key="storageReportTtlDays" data-settings-action-val-type="int" data-action-event="change">
                                        <option value="7">7 дней</option>
                                        <option value="30">30 дней</option>
                                        <option value="60">60 дней</option>
                                    </select>

                                    <label class="text-[10px] font-black text-slate-500 uppercase block">
                                        Хранить документы базы знаний
                                    </label>
                                    <select id="set-storage-doc-ttl" class="input-base text-[11px]"
                                        data-settings-action="saveSettings" data-settings-action-key="storageDocTtlDays,storageKnowledgeFileTtlDays" data-settings-action-val-type="int" data-action-event="change">
                                        <option value="30">30 дней</option>
                                        <option value="60">60 дней</option>
                                        <option value="90">90 дней</option>
                                    </select>

                                    <label class="text-[10px] font-black text-slate-500 uppercase block">
                                        Хранить TWI и тех. узлы
                                    </label>
                                    <select id="set-storage-twi-node-ttl" class="input-base text-[11px]"
                                        data-settings-action="saveSettings" data-settings-action-key="storageTwiTtlDays,storageNodeTtlDays" data-settings-action-val-type="int" data-action-event="change">
                                        <option value="60">60 дней</option>
                                        <option value="90">90 дней</option>
                                        <option value="180">180 дней</option>
                                    </select>

                                    <label class="text-[10px] font-black text-slate-500 uppercase block">
                                        Хранить практики локально
                                    </label>
                                    <select id="set-storage-practice-ttl" class="input-base text-[11px]"
                                        data-settings-action="saveSettings" data-settings-action-key="storagePracticeTtlDays" data-settings-action-val-type="int" data-action-event="change">
                                        <option value="30">30 дней</option>
                                        <option value="60">60 дней</option>
                                        <option value="90">90 дней</option>
                                    </select>
                                </div>
                            </div>

                            <button onclick="downloadMissingCloudFiles()"
                                class="w-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-3 rounded-xl font-black text-[11px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2 mb-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m0 0l-3-3m3 3l3-3">
                                    </path>
                                </svg>
                                Скачать всё для Офлайна
                            </button>


                            <button data-interventions-action="exportLibraryToJsCode"
                                class="w-full bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 py-3 rounded-xl font-black text-[11px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                                </svg>
                                Выгрузить Библиотеку в код
                            </button>
                        </div>

                        <!-- Ручной экспорт -->
                        <div class="p-4 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/30">
                            <div class="font-bold text-sm mb-3">Резервные копии (Ручная выгрузка)</div>
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                <div data-reports-action="handleDataExport" data-action-arg="json" data-reports-action-arg2="incremental"
                                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer hover:border-indigo-300">
                                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15">
                                        </path>
                                    </svg>
                                    <div
                                        class="text-[10px] font-black text-slate-800 dark:text-white uppercase text-center leading-tight">
                                        Только<br>Новое</div>
                                </div>
                                <div data-reports-action="handleDataExport" data-action-arg="json" data-reports-action-arg2="full"
                                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer hover:border-indigo-300">
                                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z">
                                        </path>
                                    </svg>
                                    <div
                                        class="text-[10px] font-black text-slate-800 dark:text-white uppercase text-center leading-tight">
                                        Вся<br>База</div>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button data-reports-action="triggerDataImport"
                                    class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-1.5 transition-colors hover:bg-slate-50">
                                    <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5">
                                        </path>
                                    </svg> Загрузить файл
                                </button>
                                <button data-reports-action="openShareModal"
                                    class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-1.5 transition-colors hover:bg-indigo-700">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z">
                                        </path>
                                    </svg> Поделиться
                                </button>
                            </div>
                        </div>

                        <!-- Реестр бэкапов -->
                        <div class="p-4 border-b border-[var(--card-border)]">
                            <div class="flex justify-between items-center mb-3">
                                <div class="font-bold text-sm">История выгрузок</div>
                                <button data-reports-action="clearBackupRegistry"
                                    class="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-800/50 active:scale-95">Очистить</button>
                            </div>
                            <div
                                class="overflow-x-auto custom-scrollbar max-h-32 border border-slate-100 dark:border-slate-700 rounded-lg">
                                <table class="w-full text-left text-[9px]">
                                    <tbody id="rbi-backup-registry-list"
                                        class="divide-y divide-slate-100 dark:divide-slate-700"></tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Автоматизация -->
                        <div class="p-4 border-b border-[var(--card-border)] bg-[var(--hover-bg)]">
                            <div class="flex justify-between items-center mb-3">
                                <div>
                                    <div class="font-bold text-sm text-indigo-700 dark:text-indigo-400">Автоматический
                                        бэкап</div>
                                    <div class="text-[10px] text-[var(--text-muted)] mt-1">Регулярно сохранять базу
                                        устройства</div>
                                </div>
                                <label class="toggle-switch"><input type="checkbox" id="set-autobackup"
                                        data-settings-action="toggleSetting" data-settings-action-key="autoBackupEnabled" data-settings-action-val-type="element" data-action-event="change"><span
                                        class="toggle-slider"></span></label>
                            </div>
                            <div class="flex justify-between items-center mb-1">
                                <div class="font-bold text-sm">День автобэкапа</div>
                                <select id="set-autobackup-day" class="input-base w-32 !py-1.5"
                                    data-settings-action="toggleSetting" data-settings-action-key="autoBackupDay" data-settings-action-val-type="element" data-action-event="change">
                                    <option value="1">Понедельник</option>
                                    <option value="2">Вторник</option>
                                    <option value="3">Среда</option>
                                    <option value="4">Четверг</option>
                                    <option value="5" selected>Пятница</option>
                                    <option value="6">Суббота</option>
                                    <option value="0">Воскресенье</option>
                                </select>
                            </div>
                        </div>

                        <!-- Отправка руководителю -->
                        <div
                            class="p-4 border-b border-orange-100 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
                            <div class="flex justify-between items-center mb-3">
                                <div>
                                    <div class="font-bold text-sm text-orange-700 dark:text-orange-400">Отправка
                                        руководителю</div>
                                    <div class="text-[10px] text-orange-600 dark:text-orange-500 mt-1">Авто-вызов меню
                                        "Поделиться" с инкрементом</div>
                                </div>
                                <label class="toggle-switch"><input type="checkbox" id="set-automanager"
                                        data-settings-action="toggleSetting" data-settings-action-key="autoManagerEnabled" data-settings-action-val-type="element" data-action-event="change"><span
                                        class="toggle-slider"></span></label>
                            </div>
                            <div class="flex justify-between items-center mb-3">
                                <div class="font-bold text-sm text-orange-800 dark:text-orange-300">День отправки</div>
                                <select id="set-automanager-day"
                                    class="input-base w-32 !py-1.5 border-orange-200 dark:border-orange-800"
                                    data-settings-action="toggleSetting" data-settings-action-key="autoManagerDay" data-settings-action-val-type="element" data-action-event="change">
                                    <option value="1">Понедельник</option>
                                    <option value="2">Вторник</option>
                                    <option value="3">Среда</option>
                                    <option value="4">Четверг</option>
                                    <option value="5" selected>Пятница</option>
                                    <option value="6">Суббота</option>
                                    <option value="0">Воскресенье</option>
                                </select>
                            </div>
                            <button data-reports-action="triggerManagerShareManual"
                                class="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                                Отправить руководителю сейчас
                            </button>
                        </div>
                    </div>
                </details>
                <!-- ОБРАТНАЯ СВЯЗЬ (ФИДБЕК И ИДЕИ) -->
                <details
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden mb-3">
                    <summary
                        class="p-4 font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors select-none group-open:border-b border-[var(--card-border)] rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z">
                                </path>
                            </svg>
                            Обратная связь (Идеи)
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-slate-400">▼</span>
                    </summary>
                    <div class="p-4 bg-white dark:bg-slate-800 rounded-b-2xl">
                        <div class="mb-4 border-b border-[var(--card-border)] pb-4">
                            <label
                                class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Предложить
                                улучшение / Сообщить об ошибке</label>
                            <textarea id="feedback-input-text" class="input-base text-[12px] h-20 resize-none mb-2"
                                placeholder="Опишите, чего не хватает или что работает не так..."></textarea>
                            <button id="feedback-submit-btn" data-settings-action="rbi_submitFeedback"
                                class="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg> Отправить разработчику
                            </button>
                        </div>
                        <div class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
                            Бэклог команды</div>
                        <div id="feedback-list-container"
                            class="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                            <!-- Карточки фидбека будут здесь -->
                        </div>
                    </div>
                </details>

                 <!-- ИСТОРИЯ ИЗМЕНЕНИЙ (CHANGELOG) -->
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm p-4 flex justify-between items-center mb-3">
                    <div>
                        <div class="font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight">История обновлений</div>
                        <div class="text-[10px] text-[var(--text-muted)] mt-1">Что нового в версиях (Changelog)</div>
                    </div>
                    <button data-settings-action="rbi_openChangelogModal" class="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform shadow-sm">
                        Читать
                    </button>
                </div>

                <!-- САМООБУЧЕНИЕ СИСТЕМЫ (AI) -->
                <details id="ai-optimizer-settings"
                    class="bg-[var(--card-bg)] border border-purple-200 dark:border-purple-800 rounded-2xl shadow-sm group [&_summary::-webkit-details-marker]:hidden mb-3">
                    <summary
                        class="p-4 font-black text-[12px] text-purple-700 dark:text-purple-400 uppercase tracking-tight cursor-pointer flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 transition-colors select-none group-open:border-b border-purple-200 dark:border-purple-800 rounded-2xl group-open:rounded-b-none">
                        <span class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z">
                                </path>
                            </svg>
                            AI-Оптимизатор Системы
                        </span>
                        <span class="transition-transform group-open:rotate-180 text-purple-400">▼</span>
                    </summary>
                    <div class="p-4 bg-white dark:bg-slate-800 rounded-b-2xl">
                        <div class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                            Система проанализирует весь накопленный массив проверок и предложит корректировку
                            математической модели: жесткость порогов (Красная/Зеленая зоны), веса рисков и правило
                            "Стеклянного потолка".
                        </div>
                        <button data-action="runSelfLearningAi"
                            class="w-full bg-purple-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z">
                                </path>
                            </svg> Запустить анализ базы
                        </button>
                        <div id="ai-self-learning-result"
                            class="hidden mt-4 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap shadow-inner">
                        </div>
                    </div>
                </details>

                <!-- БАЗА ЗНАНИЙ (FAQ) -->
                <div
                    class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm p-4 flex justify-between items-center mb-3">
                    <div>
                        <div class="font-black text-[12px] text-slate-800 dark:text-white uppercase tracking-tight">
                            Методология RBI</div>
                        <div class="text-[10px] text-[var(--text-muted)] mt-1">Формулы, логика ИКО и ответы на вопросы
                        </div>
                    </div>
                    <button data-knowledge-action="openFaqModal"
                        class="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform shadow-sm">
                        Открыть FAQ
                    </button>
                </div>

                <div class="flex flex-col gap-3 items-center mt-4 mb-6">
                    <button data-shell-action="checkForUpdates"
                        class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors uppercase shadow-sm flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        Проверить обновления
                    </button>
                    <button data-settings-action="fullFactoryReset"
                        class="text-[10px] font-bold text-red-500 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 border border-red-200 transition-colors uppercase shadow-sm">⚠️
                        Полный сброс (Удалить всё)</button>
                </div>

                <div class="text-center text-[10px] text-[var(--text-muted)] pb-10">
                    <button data-settings-action="showAboutApp"
                        class="font-bold text-indigo-500 mb-2 flex items-center justify-center gap-1 mx-auto"><svg
                            class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg> О приложении и Безопасности</button><br>
                    RBI Platform PWA<br>Developed by Igor Kondratiev
                </div>
            </div>
            <!-- === КОНСТРУКТОР PDF-ШАБЛОНОВ (PRO) === -->
            <div id="pdf-template-modal"
                class="fixed inset-0 bg-slate-900/80 z-[7000] hidden items-start justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto"
                data-reports-action="closePdfTemplateModal">
                <div class="bg-[var(--bg-main)] w-full max-w-3xl mt-4 mb-10 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--card-border)]"
                    onclick="event.stopPropagation()">

                    <!-- Шапка -->
                    <div
                        class="p-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center sticky top-0 z-20 shadow-md">
                        <h3 class="font-black text-[14px] uppercase tracking-tight text-white flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Конструктор PDF отчетов
                        </h3>
                        <button data-reports-action="closePdfTemplateModal"
                            class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-sm border border-indigo-400 active:scale-90 transition-transform">✕</button>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

                        <!-- Список сохраненных шаблонов -->
                        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm">
                            <div class="flex justify-between items-center mb-3">
                                <div class="text-[11px] font-black uppercase text-slate-500">Ваши шаблоны</div>
                                <button data-reports-action="createNewPdfTemplate"
                                    class="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg active:scale-95 transition-colors">+
                                    Создать новый</button>
                            </div>
                            <div id="pdf-templates-list"
                                class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                <!-- Список рендерится через JS -->
                            </div>
                        </div>

                        <!-- Редактор (Изначально скрыт) -->
                        <div id="pdf-template-editor"
                            class="hidden space-y-4 border-t border-[var(--card-border)] pt-4">
                            <div class="text-[12px] font-black uppercase text-indigo-600 dark:text-indigo-400">Настройка
                                шаблона</div>

                            <!-- Базовые настройки -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label
                                        class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Название
                                        шаблона *</label>
                                    <input type="text" id="pdf-tmpl-name" class="input-base"
                                        placeholder="Например: Стандартный One-Pager">
                                </div>
                                <div>
                                    <label
                                        class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Тип
                                        отчета</label>
                                    <select id="pdf-tmpl-type" class="input-base">
                                        <option value="onepager">Сводка по Объекту</option>
                                        <option value="global_onepager">Глобальная сводка Компании</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Дизайн -->
                            <div
                                class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--hover-bg)] p-3 rounded-xl border border-[var(--card-border)]">
                                <div>
                                    <label
                                        class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Колонки</label>
                                    <select id="pdf-tmpl-layout" class="input-base text-[11px] !py-1.5">
                                        <option value="two_uneven">Две (40% / 60%)</option>
                                        <option value="two_even">Две (50% / 50%)</option>
                                        <option value="one">Одна колонка (100%)</option>
                                    </select>
                                </div>
                                <div class="flex flex-col justify-center">
                                    <label class="flex items-center gap-2 cursor-pointer mt-3">
                                        <input type="checkbox" id="pdf-tmpl-logo"
                                            class="w-4 h-4 accent-indigo-600 rounded">
                                        <span
                                            class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Показывать
                                            логотип</span>
                                    </label>
                                </div>
                                <div class="flex flex-col justify-center">
                                    <label class="flex items-center gap-2 cursor-pointer mt-3">
                                        <input type="checkbox" id="pdf-tmpl-qr"
                                            class="w-4 h-4 accent-indigo-600 rounded" checked>
                                        <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Вставить
                                            QR-код</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Текст в подвале -->
                            <div>
                                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Текст
                                    в подвале (Footer)</label>
                                <input type="text" id="pdf-tmpl-footer" class="input-base text-[11px]"
                                    placeholder="Например: Конфиденциально. Только для внутреннего использования.">
                            </div>

                            <!-- DRAG AND DROP БЛОКИ -->
                            <div
                                class="text-[10px] text-slate-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800 leading-snug">
                                💡 Перетаскивайте блоки из левой колонки в правую, чтобы добавить их в отчет.
                                Выстраивайте нужный порядок.
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <!-- Доступные блоки -->
                                <div
                                    class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col h-64">
                                    <div class="text-[10px] font-black uppercase text-slate-400 mb-2 text-center">
                                        Скрытые блоки</div>
                                    <div id="pdf-blocks-available"
                                        class="flex-1 overflow-y-auto space-y-2 custom-scrollbar p-1 min-h-[50px]">
                                        <!-- Рендерится через JS -->
                                    </div>
                                </div>

                                <!-- Активные блоки -->
                                <div
                                    class="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 flex flex-col h-64 shadow-inner">
                                    <div class="text-[10px] font-black uppercase text-indigo-500 mb-2 text-center">
                                        Активные (В отчете)</div>
                                    <div id="pdf-blocks-active"
                                        class="flex-1 overflow-y-auto space-y-2 custom-scrollbar p-1 min-h-[50px]">
                                        <!-- Рендерится через JS -->
                                    </div>
                                </div>
                            </div>

                            <!-- Сохранение -->
                            <div class="flex gap-2 pt-4 border-t border-[var(--card-border)]">
                                <button data-reports-action="cancelPdfTemplateEdit"
                                    class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95 border border-[var(--card-border)]">Отмена</button>
                                <button data-reports-action="savePdfTemplate"
                                    class="flex-[2] bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex justify-center items-center gap-2">💾
                                    Сохранить шаблон</button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
`;
    }
};

window.SettingsRender = SettingsRender;

// =========================================================================
// МОНТАЖ РАЗМЕТКИ ВКЛАДКИ «НАСТРОЙКИ» (перенос из index.html:445-1529, Блок
// 4/N инициативы «Перенос статичной разметки quality в JS-рендер»). По
// прецеденту Блоков 1/N-3/N — на верхнем уровне модуля, до
// DOMContentLoaded. Grep подтвердил отсутствие top-level bootstrap:*-
// подписок в файлах фичи — тайминг здесь не критичен, но паттерн
// сохранён для консистентности.
// =========================================================================
(function mountSettingsMarkup() {
    if (document.getElementById('tab-settings')) return;
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getContentRoot()
        : document.getElementById('app-content');
    if (!root) return;
    root.insertAdjacentHTML('beforeend', SettingsRender.renderMarkup());
}());

console.log('[SettingsRender] settings.render.js markup mounted');

(function () {
    'use strict';

    // Фаза 141 (копия из settings.actions.js — см. комментарий в шапке файла):
    // единая точка чтения настроек через SettingsService или fallback.
    function _getSetting(key) {
        var svc = (SettingsActions._ctx && SettingsActions._ctx.settings) ||
                  (window.RBI && window.RBI.services && window.RBI.services.settings);
        if (svc) {
            return svc.get(key);
        }
        return window.appSettings ? window.appSettings[key] : undefined;
    }
    function _renderSettingsTab() {
        // 1. Базовые селекторы оформления
        if (document.getElementById('set-theme')) document.getElementById('set-theme').value = _getSetting('theme') || 'auto';
        if (document.getElementById('set-fontsize')) document.getElementById('set-fontsize').value = _getSetting('fontSize') || 'medium';
        if (document.getElementById('set-navpos')) document.getElementById('set-navpos').value = _getSetting('navPosition') || 'auto';
        if (document.getElementById('set-dashmode')) document.getElementById('set-dashmode').value = _getSetting('dashboardMode') || 'compact';
        var _kbViewGet = window.getKnowledgeViewMode;
        var _kbViewFallback = _getSetting('knowledgeViewMode') || 'cards';
        var _kbViewVal = function (scope, key) {
            if (typeof _kbViewGet === 'function') return _kbViewGet(scope);
            return _getSetting(key) || _kbViewFallback;
        };
        if (document.getElementById('set-kb-view-twi')) document.getElementById('set-kb-view-twi').value = _kbViewVal('twi', 'knowledgeViewModeTwi');
        if (document.getElementById('set-kb-view-docs')) document.getElementById('set-kb-view-docs').value = _kbViewVal('docs', 'knowledgeViewModeDocs');
        if (document.getElementById('set-kb-view-nodes')) document.getElementById('set-kb-view-nodes').value = _kbViewVal('nodes', 'knowledgeViewModeNodes');
        if (document.getElementById('set-kb-view-practices')) document.getElementById('set-kb-view-practices').value = _kbViewVal('practices', 'knowledgeViewModePractices');
        if (document.getElementById('set-kb-view-reports')) document.getElementById('set-kb-view-reports').value = _kbViewVal('reports', 'knowledgeViewModeReports');
        if (document.getElementById('set-kb-view-meetings')) document.getElementById('set-kb-view-meetings').value = _kbViewVal('meetings', 'knowledgeViewModeMeetings');
        if (document.getElementById('set-kb-view-fmea')) document.getElementById('set-kb-view-fmea').value = _kbViewVal('fmea', 'knowledgeViewModeFmea');

        // 2. Переключатели логики
        if (document.getElementById('set-swipe')) document.getElementById('set-swipe').checked = _getSetting('swipeEnabled');
        if (document.getElementById('set-collapse')) document.getElementById('set-collapse').checked = _getSetting('autoCollapseOk');
        if (document.getElementById('set-groups-col')) document.getElementById('set-groups-col').checked = _getSetting('defaultGroupsCollapsed');
        if (document.getElementById('set-fast')) document.getElementById('set-fast').checked = _getSetting('fastMode');

        if (document.getElementById('set-storage-auto-cleanup')) {
            document.getElementById('set-storage-auto-cleanup').checked = _getSetting('storageAutoCleanupEnabled') !== false;
        }
        if (document.getElementById('set-storage-cleanup-threshold')) {
            document.getElementById('set-storage-cleanup-threshold').value = String(_getSetting('storageCleanupThresholdPercent') || 80);
        }
        if (document.getElementById('set-storage-photo-ttl')) {
            document.getElementById('set-storage-photo-ttl').value = String(_getSetting('storageInspectionPhotoTtlDays') || 60);
        }
        if (document.getElementById('set-storage-report-ttl')) {
            document.getElementById('set-storage-report-ttl').value = String(_getSetting('storageReportTtlDays') || 30);
        }
        if (document.getElementById('set-storage-doc-ttl')) {
            document.getElementById('set-storage-doc-ttl').value = String(_getSetting('storageDocTtlDays') || _getSetting('storageKnowledgeFileTtlDays') || 60);
        }
        if (document.getElementById('set-storage-twi-node-ttl')) {
            document.getElementById('set-storage-twi-node-ttl').value = String(_getSetting('storageTwiTtlDays') || _getSetting('storageNodeTtlDays') || 90);
        }
        if (document.getElementById('set-storage-practice-ttl')) {
            document.getElementById('set-storage-practice-ttl').value = String(_getSetting('storagePracticeTtlDays') || 60);
        }

        // 3. Аналитика
        if (document.getElementById('set-ana-pareto')) document.getElementById('set-ana-pareto').checked = _getSetting('anaEngPareto');
        if (document.getElementById('set-ana-trend')) document.getElementById('set-ana-trend').checked = _getSetting('anaOpTrend');
        if (document.getElementById('set-ana-leader')) document.getElementById('set-ana-leader').checked = _getSetting('anaOpLeader');
        if (document.getElementById('set-ana-ai')) document.getElementById('set-ana-ai').checked = _getSetting('anaEngAi');
        if (document.getElementById('set-ana-photos')) document.getElementById('set-ana-photos').checked = _getSetting('anaEngPhotos');
        if (document.getElementById('set-ana-top')) document.getElementById('set-ana-top').checked = _getSetting('anaOpTopDefects');
        if (document.getElementById('set-task-meeting')) document.getElementById('set-task-meeting').value = _getSetting('taskMeetingDay') || '1';
        if (document.getElementById('set-task-fmea')) document.getElementById('set-task-fmea').value = _getSetting('taskFmeaDay') || '5';
        if (document.getElementById('set-task-month')) document.getElementById('set-task-month').value = _getSetting('taskMonthReportDay') || '1';

        // 3.5. AI-настройки
        if (document.getElementById('set-ai-enabled')) {
            document.getElementById('set-ai-enabled').checked = _getSetting('aiEnabled');
            document.getElementById('ai-settings-body').style.display = _getSetting('aiEnabled') ? 'block' : 'none';
        }
        if (document.getElementById('set-ai-key')) document.getElementById('set-ai-key').value = _getSetting('apiKey') || '';
        if (document.getElementById('set-ai-corp-pwd')) document.getElementById('set-ai-corp-pwd').value = _getSetting('aiCorpPwd') || '';

        var aiModes = document.getElementsByName('ai-mode');
        if (aiModes.length > 0) {
            var mode = _getSetting('aiAuthMode') || 'role';
            document.getElementById('corporate-pwd-field').classList.add('hidden');
            document.getElementById('personal-key-field').classList.add('hidden');

            if (mode === 'role') {
                aiModes[0].checked = true;
            } else if (mode === 'corporate') {
                aiModes[1].checked = true;
                document.getElementById('corporate-pwd-field').classList.remove('hidden');
            } else if (mode === 'personal') {
                aiModes[2].checked = true;
                document.getElementById('personal-key-field').classList.remove('hidden');
            }
        }

        // 4. Автоматизация бэкапов
        if (document.getElementById('set-autocache')) document.getElementById('set-autocache').checked = _getSetting('autoCacheCloudFiles');
        if (document.getElementById('set-autobackup')) document.getElementById('set-autobackup').checked = _getSetting('autoBackupEnabled');
        if (document.getElementById('set-autobackup-day')) document.getElementById('set-autobackup-day').value = _getSetting('autoBackupDay') || '5';
        if (document.getElementById('set-autobackup-share')) document.getElementById('set-autobackup-share').checked = _getSetting('autoBackupShare');
        if (document.getElementById('set-automanager')) document.getElementById('set-automanager').checked = _getSetting('autoManagerEnabled');
        if (document.getElementById('set-automanager-day')) document.getElementById('set-automanager-day').value = _getSetting('autoManagerDay') || '5';

        // 5. Брендирование и Авто-отчёты
        if (document.getElementById('set-brand-color')) document.getElementById('set-brand-color').value = _getSetting('brandColor') || '#4f46e5';
        if (document.getElementById('set-auto-report')) document.getElementById('set-auto-report').checked = _getSetting('autoReportEnabled');
        if (document.getElementById('set-auto-report-day')) document.getElementById('set-auto-report-day').value = _getSetting('autoReportDay') || '1';
        if (document.getElementById('set-auto-report-type')) document.getElementById('set-auto-report-type').value = _getSetting('autoReportType') || 'global_onepager';

        var logoPreview = document.getElementById('brand-logo-preview');
        var logoImg = document.getElementById('brand-logo-img');
        if (logoPreview && logoImg) {
            if (_getSetting('brandLogo')) {
                logoImg.src = _getSetting('brandLogo');
                logoPreview.classList.remove('hidden');
            } else {
                logoPreview.classList.add('hidden');
            }
        }

        if (typeof window.renderSyncUI === 'function') window.renderSyncUI();

        var brandControls = document.getElementById('corp-branding-controls');
        if (brandControls) {
            var _permSvc = (SettingsActions._ctx && SettingsActions._ctx.permissions) || window.RBI.services.permissions;
            var currentRole = _permSvc ? _permSvc.getCurrentRole() : 'guest';
            var isAdmin = _permSvc ? _permSvc.canManageHierarchy() : ['manager', 'deputy_manager', 'director'].includes(currentRole);
            var controlsHtml = '';

            if (isAdmin) {
                controlsHtml += '<div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex justify-between items-center mb-2 shadow-sm">' +
                    '<div>' +
                    '<div class="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase">Для всей команды</div>' +
                    '<div class="text-[9px] text-slate-500">Сделать стилем компании</div>' +
                    '</div>' +
                    '<button onclick="window.publishCorporateBranding()" class="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[9px] font-bold active:scale-95 shadow-md uppercase">Опубликовать</button>' +
                    '</div>';
            }

            if (_getSetting('isBrandingCustomized')) {
                controlsHtml += '<button onclick="window.resetToCorporateBranding()" class="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-2.5 rounded-lg text-[10px] font-bold active:scale-95 shadow-sm uppercase flex items-center justify-center gap-2">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>' +
                    'Вернуть корпоративный стиль' +
                    '</button>';
            }

            brandControls.innerHTML = controlsHtml;
        }
    }

    function _applySettingsToUI() {
        var theme = _getSetting('theme') || 'auto';

        if (theme === 'auto') {
            var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }

        if (!['light', 'dark', 'rbi-light', 'rbi-dark', 'rbi-light-v2', 'rbi-dark-v2'].includes(theme)) {
            theme = 'light';
        }

        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.remove('light', 'dark', 'rbi-light', 'rbi-dark', 'rbi-light-v2', 'rbi-dark-v2');
        document.documentElement.classList.add(theme);

        if (theme === 'dark' || theme === 'rbi-dark' || theme === 'rbi-dark-v2') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }

        if (_getSetting('fastMode')) document.body.classList.add('fast-mode');
        else document.body.classList.remove('fast-mode');

        document.documentElement.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
        document.documentElement.classList.add('font-' + (_getSetting('fontSize') || 'medium'));

        document.body.classList.remove('nav-pos-auto', 'nav-pos-top', 'nav-pos-bottom');
        document.body.classList.add('nav-pos-' + (_getSetting('navPosition') || 'auto'));

        var dash = document.getElementById('header-dashboard');
        var dashExp = document.getElementById('dash-expanded-view');
        var dashIcon = document.getElementById('dash-expand-icon');

        if (_getSetting('dashboardMode') === 'hidden') {
            if (dash) dash.style.display = 'none';
        } else if (_getSetting('dashboardMode') === 'expanded') {
            if (dash) dash.style.display = 'block';
            if (dashExp) dashExp.classList.remove('hidden');
            if (dashIcon) dashIcon.style.display = 'none';
        } else {
            if (dash) dash.style.display = 'block';
            if (dashExp) dashExp.classList.add('hidden');
            if (dashIcon) dashIcon.style.display = 'flex';
        }

        setTimeout(function () {
            if (typeof window.updateBodyPadding === 'function') window.updateBodyPadding();
        }, 150);

        var activeTab = document.querySelector('.view-section.active');
        if (activeTab && typeof window.updateFabButton === 'function') window.updateFabButton(activeTab.id);

        var aiBody = document.getElementById('ai-settings-body');
        if (aiBody) aiBody.style.display = _getSetting('aiEnabled') ? 'block' : 'none';

        var personalKeyBlock = document.getElementById('personal-key-field');
        if (personalKeyBlock) {
            if (_getSetting('usePersonalKey')) personalKeyBlock.classList.remove('hidden');
            else personalKeyBlock.classList.add('hidden');
        }

        var _permSvc2 = (SettingsActions._ctx && SettingsActions._ctx.permissions) || window.RBI.services.permissions;
        if (typeof _permSvc2 !== 'undefined') _permSvc2.applyUIConstraints();
        if (typeof window.ObjectDirectory !== 'undefined') window.ObjectDirectory.initUI();

        var themeSelect = document.getElementById('set-theme');
        if (themeSelect && themeSelect.value !== (_getSetting('theme') || 'auto')) {
            themeSelect.value = _getSetting('theme') || 'auto';
        }
    }

    window.renderSettingsTab = _renderSettingsTab;
    window.applySettingsToUI = _applySettingsToUI;

    console.log('[settings.render.js] window-proxies installed (renderSettingsTab, applySettingsToUI)');

}());
