/* Файл: js/shared/sync-ui-defer.utils.js
 * Единый хелпер §5: sync не делает full-render активного экрана.
 * Модули: shouldDeferFullRender('analytics'|'history'|...) → skip paint, markDirty.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;

    window.RBI = window.RBI || {};
    window.RBI.utils = window.RBI.utils || {};

    var DEFER_END_MS = 400;

    function _elActive(id) {
        var el = document.getElementById(id);
        return !!(el && el.classList.contains('active'));
    }

    function _subVisible(id) {
        var el = document.getElementById(id);
        return !!(el && !el.classList.contains('hidden'));
    }

    function _analyticsActive() {
        return _elActive('tab-analytics');
    }

    function _engineerActive() {
        return _elActive('tab-engineer');
    }

    /** Активен ли указанный экран / подвкладка. */
    function isViewActive(viewKey) {
        var key = String(viewKey || '').trim();
        if (!key) return false;

        switch (key) {
            case 'analytics':
                return _analyticsActive();
            case 'contractors':
                return _analyticsActive() && _subVisible('sub-contractors');
            case 'onepager':
                return _analyticsActive() && _subVisible('sub-onepager');
            case 'history':
                return _analyticsActive() && _subVisible('sub-history');
            case 'sk':
                return _analyticsActive() && _subVisible('sub-sk');
            case 'schedule':
                return _analyticsActive() && _subVisible('sub-schedule');
            case 'data':
                return _analyticsActive() && _subVisible('sub-data');
            case 'rating':
                return _analyticsActive() && _subVisible('sub-rating');

            case 'engineer':
                return _engineerActive();
            case 'tasks':
                return _engineerActive() && _subVisible('eng-sub-tasks');
            case 'meetings':
                return _engineerActive() && _subVisible('eng-sub-meetings');
            case 'impact':
                return _engineerActive() && _subVisible('eng-sub-impact');
            case 'fmea':
                return _engineerActive() && _subVisible('eng-sub-fmea');
            case 'badges':
            case 'game':
                return _engineerActive() && _subVisible('eng-sub-badges');

            case 'reference':
                return _elActive('tab-reference');
            case 'settings':
                return _elActive('tab-settings');
            case 'audit':
                return _elActive('tab-audit');

            case 'construction':
                return _elActive('tab-construction-defects')
                    || _elActive('tab-construction-acceptance')
                    || _elActive('tab-transfer')
                    || _elActive('tab-construction-reports')
                    || _elActive('tab-construction-reference');
            case 'construction-defects':
                return _elActive('tab-construction-defects');
            case 'construction-acceptance':
                return _elActive('tab-construction-acceptance');
            case 'transfer':
                return _elActive('tab-transfer');

            default:
                // Произвольный id секции: tab-* / sub-*
                if (key.indexOf('tab-') === 0) return _elActive(key);
                if (key.indexOf('sub-') === 0 || key.indexOf('eng-sub-') === 0 || key.indexOf('ref-sub-') === 0) {
                    var parentOk = true;
                    if (key.indexOf('sub-') === 0) parentOk = _analyticsActive();
                    if (key.indexOf('eng-sub-') === 0) parentOk = _engineerActive();
                    return parentOk && _subVisible(key);
                }
                return false;
        }
    }

    function isDeferred() {
        return !!(window.isSyncing || window._rbiDeferActiveViewFullRender);
    }

    /**
     * true → не делать full-render этого экрана (sync идёт / только что закончился,
     * и экран сейчас на виду у пользователя).
     * @param {string|string[]} viewKeys
     */
    function shouldDeferFullRender(viewKeys) {
        if (!isDeferred()) return false;
        var keys = Array.isArray(viewKeys) ? viewKeys : [viewKeys];
        for (var i = 0; i < keys.length; i++) {
            if (isViewActive(keys[i])) return true;
        }
        return false;
    }

    function beginDefer() {
        window._rbiDeferActiveViewFullRender = true;
    }

    var _endTimer = null;
    function endDefer(delayMs) {
        if (_endTimer) {
            clearTimeout(_endTimer);
            _endTimer = null;
        }
        var ms = (delayMs === 0 || delayMs) ? delayMs : DEFER_END_MS;
        if (ms <= 0) {
            window._rbiDeferActiveViewFullRender = false;
            return;
        }
        _endTimer = setTimeout(function () {
            _endTimer = null;
            window._rbiDeferActiveViewFullRender = false;
        }, ms);
    }

    function markDirty(flagKeys) {
        if (!window.syncDirtyFlags) return;
        var keys = Array.isArray(flagKeys) ? flagKeys : [flagKeys];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (!k) continue;
            window.syncDirtyFlags[k] = true;
        }
    }

    var api = {
        beginDefer: beginDefer,
        endDefer: endDefer,
        isDeferred: isDeferred,
        isViewActive: isViewActive,
        shouldDeferFullRender: shouldDeferFullRender,
        markDirty: markDirty
    };

    window.RBI.utils.syncUi = api;
    // Удобные глобалы для legacy-вызовов
    window.shouldDeferFullRender = shouldDeferFullRender;
    window.rbiBeginSyncUiDefer = beginDefer;
    window.rbiEndSyncUiDefer = endDefer;

    // Кросс-вкладочный sync lock (BroadcastChannel) — тот же defer.
    try {
        if (window.syncChannel && typeof window.syncChannel.addEventListener === 'function') {
            window.syncChannel.addEventListener('message', function (e) {
                if (!e || !e.data) return;
                if (e.data === 'sync_started') beginDefer();
                if (e.data === 'sync_done') endDefer(DEFER_END_MS);
            });
        }
    } catch (_) { /* syncChannel может появиться позже */ }

    console.log('[RBI Utils] sync-ui-defer loaded');
}());
