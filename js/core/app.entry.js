/**
 * app.entry.js
 * Единая точка инициализации модулей платформы RBI Quality Pro.
 *
 * Вызывается ПОСЛЕ initApp() из app.js — когда все сервисы уже загружены.
 * Не заменяет app.js. Работает параллельно с legacy-кодом.
 *
 * Паттерн:
 *   1. Получить ctx через RBI.createContext()
 *   2. Получить все модули из RBI.registry
 *   3. Вызвать module.init(ctx) на каждом
 *   4. Зарегистрировать себя как window.RBI.entry
 */
(function () {
    'use strict';

    var MODULE_KEYS = [
        'module.quality',
        'module.sk',
        'module.settings',
        'module.knowledge',
        'module.construction',
        'module.construction-v2',
        'module.game',
        'module.ai',
    ];

    /** Извлекает id манифеста ('quality', 'sk', ...) из registry-ключа ('module.quality'). */
    function shortIdFromKey(key) {
        return key.replace(/^module\./, '');
    }

    var initPromise = null;

    function initAllModules() {
        if (initPromise) {
            console.warn('[app.entry] init() уже выполнялся/выполняется — возвращаю существующий результат');
            return initPromise;
        }
        initPromise = runInit();
        return initPromise;
    }

    async function runInit() {
        if (!window.RBI) {
            console.error('[app.entry] RBI не инициализирован — app.entry.js загружен слишком рано');
            return;
        }

        // Фаза 54: гарантируем загрузку настроек до инициализации модулей
        if (window.RBI.services && window.RBI.services.settings &&
            typeof window.RBI.services.settings.load === 'function') {
            try { await window.RBI.services.settings.load(); } catch (e) { /* настройки загружаются и без этого через app.js */ }
        }

        var ctx = window.RBI.createContext();

        console.log('[app.entry] Инициализация модулей...');

        for (var i = 0; i < MODULE_KEYS.length; i++) {
            var key = MODULE_KEYS[i];
            var shortId = shortIdFromKey(key);
            try {
                if (window.RBI.moduleLoader && typeof window.RBI.moduleLoader.loadModule === 'function') {
                    await window.RBI.moduleLoader.loadModule(shortId, ctx);
                } else {
                    // Деградация: module-loader.js ещё не готов — старый прямой путь через registry.
                    var mod = window.RBI.registry.get(key);
                    if (!mod) {
                        console.warn('[app.entry] Модуль не найден в реестре: ' + key);
                        continue;
                    }
                    if (typeof mod.init !== 'function') {
                        console.warn('[app.entry] У модуля нет метода init(): ' + key);
                        continue;
                    }
                    await mod.init(ctx);
                }
                console.log('[app.entry] \u2705 ' + key + ' \u2014 init() \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d');
            } catch (e) {
                console.error('[app.entry] \u274c \u041e\u0448\u0438\u0431\u043a\u0430 init() \u0434\u043b\u044f ' + key + ':', e);
            }
        }

        console.log('[app.entry] \u0412\u0441\u0435 \u043c\u043e\u0434\u0443\u043b\u0438 \u0438\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u044b.');

        try {
            if (window.RBI.services && window.RBI.services.shell &&
                typeof window.RBI.services.shell.renderUserBlock === 'function' &&
                ctx.userContext && typeof ctx.userContext.getUserContext === 'function') {
                window.RBI.services.shell.renderUserBlock(ctx.userContext.getUserContext());
            }
        } catch (e) {
            console.warn('[app.entry] \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u0440\u0438\u0441\u043e\u0432\u0430\u0442\u044c renderUserBlock:', e);
        }

        if (window.RBI.events && typeof window.RBI.events.emit === 'function') {
            window.RBI.events.emit('platform:ready', { modules: MODULE_KEYS.length });
        }
    }

    window.RBI = window.RBI || {};
    window.RBI.entry = {
        init: initAllModules
    };

    console.log('[app.entry] app.entry.js \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d. \u0412\u044b\u0437\u043e\u0432\u0438\u0442\u0435 window.RBI.entry.init() \u0434\u043b\u044f \u0441\u0442\u0430\u0440\u0442\u0430.');
}());
