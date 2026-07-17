/* Файл: js/services/contractor-metrics.service.js */
/* ContractorMetricsService v0.1 — инкрементальный in-memory кэш метрик подрядчика.
 *
 * Проблема: renderContractorsSubTab/renderContractorsListOnly/renderOnePagerSubTab/
 * renderGlobalOnePager (analytics.render.js) на каждое открытие вкладки «Подрядчики»/
 * «Сводка» вызывали getContractorMetrics()/getObjectIntegralMetrics() (math.utils.js)
 * в цикле по всем группам подрядчик×объект — O(подрядчики × записи) при каждом рендере.
 *
 * Решение: держим в памяти готовый результат getContractorMetrics() на группу
 * "подрядчик [объект]" (тот же groupKey, что используется в analytics.render.js),
 * пересчитываем ТОЧЕЧНО (только затронутую группу), а не всю базу:
 *   - разовый полный пересчёт при старте приложения (после restoreSession());
 *   - точечно при save()/softDelete() одной проверки (inspection.service.js);
 *   - точечно после pull из облака — только для групп, чьи записи реально
 *     изменились в этом pull (sync-engine.core.js/sync-post-actions.js).
 *
 * Сознательное упрощение (подтверждено пользователем): кэш НЕ персистентный,
 * не переживает reload — getContractorMetrics() — чистая функция от записей
 * стора app_history, поэтому пересчёт из первоисточника гарантирует одинаковый
 * результат на разных устройствах после синхронизации, без риска рассинхрона
 * отдельного канала хранения агрегата.
 */

(function () {
    'use strict';
    if (typeof window === 'undefined') return;

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    // { [groupKey]: metrics } — groupKey = `${contractorName} [${projectLabel}]`
    // (тот же формат cKey, что в analytics.render.js renderContractorsSubTab/renderContractorsListOnly)
    var _cache = {};
    var _initialized = false;

    function projectLabelOf(item) {
        return item.project_display_name || item.projectName || item.project_canonical_key || 'Без объекта';
    }

    function groupKeyOf(item) {
        return (item.contractorName || 'Не указан') + ' [' + projectLabelOf(item) + ']';
    }

    function userTemplates() {
        if (window.RBI.services.templates) return window.RBI.services.templates.getUserTemplates();
        return typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
    }

    function sourceRecords() {
        if (window.RBI.services.inspections) return window.RBI.services.inspections.getAllForAnalyticsSync();
        return Array.isArray(window.contractorArray) ? window.contractorArray : [];
    }

    function groupByKey(records) {
        var grouped = {};
        records.forEach(function (item) {
            if (!item || item._deleted === true || item.is_deleted === true) return;
            var key = groupKeyOf(item);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });
        return grouped;
    }

    // Пересчитывает ОДНУ группу (подрядчик+объект) из текущего живого массива записей.
    function recalcGroup(groupKey) {
        var records = sourceRecords();
        var groupRecords = records.filter(function (item) {
            return item && item._deleted !== true && item.is_deleted !== true && groupKeyOf(item) === groupKey;
        });

        if (groupRecords.length === 0) {
            delete _cache[groupKey];
            return null;
        }

        var metrics = typeof window.getContractorMetrics === 'function'
            ? window.getContractorMetrics(groupRecords, userTemplates())
            : null;

        if (metrics) {
            _cache[groupKey] = metrics;
        } else {
            delete _cache[groupKey];
        }
        return metrics;
    }

    // Точечный пересчёт по одной записи (после save/softDelete/pull) — вычисляет
    // groupKey этой записи и пересчитывает только её группу.
    function recalcForRecord(record) {
        if (!record) return;
        recalcGroup(groupKeyOf(record));
    }

    var ContractorMetricsService = {

        // Разовый полный пересчёт всех групп — вызывается один раз при старте
        // приложения (после restoreSession()), НЕ при каждом открытии вкладки.
        recalcAll: function () {
            var grouped = groupByKey(sourceRecords());
            var nextCache = {};
            for (var key in grouped) {
                var metrics = typeof window.getContractorMetrics === 'function'
                    ? window.getContractorMetrics(grouped[key], userTemplates())
                    : null;
                if (metrics) nextCache[key] = metrics;
            }
            _cache = nextCache;
            _initialized = true;
            return _cache;
        },

        // Точечный пересчёт: принимает одну запись (после save/softDelete)
        // или массив записей (после pull — по затронутым записям).
        recalcTouched: function (recordOrRecords) {
            if (!_initialized) return this.recalcAll();
            if (Array.isArray(recordOrRecords)) {
                var seenKeys = {};
                recordOrRecords.forEach(function (r) {
                    if (!r) return;
                    var key = groupKeyOf(r);
                    if (!seenKeys[key]) {
                        seenKeys[key] = true;
                        recalcGroup(key);
                    }
                });
            } else {
                recalcForRecord(recordOrRecords);
            }
        },

        // Готовое значение метрик для группы (contractorName + projectLabel).
        // Если кэш ещё не инициализирован — считает разово (fallback, не должен
        // происходить в обычном потоке после старта приложения).
        getMetricsForGroup: function (groupKey) {
            if (!_initialized) this.recalcAll();
            if (_cache[groupKey] !== undefined) return _cache[groupKey];
            return recalcGroup(groupKey);
        },

        // Метрики для конкретной записи (удобный шорткат — вычисляет groupKey сам).
        getMetricsForRecord: function (record) {
            return this.getMetricsForGroup(groupKeyOf(record));
        },

        // Все текущие метрики по группам — { groupKey: metrics }. Копия, не живая ссылка.
        getAllGroupMetrics: function () {
            if (!_initialized) this.recalcAll();
            return Object.assign({}, _cache);
        },

        groupKeyOf: groupKeyOf,

        isInitialized: function () { return _initialized; }
    };

    window.RBI.services.contractorMetrics = ContractorMetricsService;
    if (window.RBI.registry) {
        window.RBI.registry.register('service.contractorMetrics', ContractorMetricsService);
    }

    console.log('[RBI Service] contractorMetrics loaded');
}());
