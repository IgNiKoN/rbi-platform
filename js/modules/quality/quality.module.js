/**
 * quality.module.js
 * Агрегирующий модуль platform module «quality» (Compact Module Restructure,
 * шаг 1 — «мягкая» консолидация без физического переноса файлов).
 *
 * НЕ содержит бизнес-логики. Только координация: последовательно получает
 * каждый из 9 существующих переходных под-модулей из window.RBI.registry
 * (они регистрируются собственными файлами history.module.js, audit.module.js
 * и т.д., подключёнными script-тегами в index.html ДО этого файла) и вызывает
 * их init(ctx).
 *
 * interventions.module.js НЕ включён в агрегатор: у него нет отдельного ключа
 * в MODULE_KEYS (js/core/app.entry.js) и он не регистрируется в
 * window.RBI.registry как самостоятельный module.*. Владелец (quality vs
 * settings) — предмет отдельного блока (см. COMPACT_MODULE_RESTRUCTURE_PLAN.md).
 */

var SUB_MODULE_KEYS = [
    'module.history',
    'module.audit',
    'module.analytics',
    'module.tasks',
    'module.etalon',
    'module.reports',
    'module.engineer',
    'module.schedule',
    'module.meetings'
];

export const QualityModule = {
    id: 'quality',

    init: async function (ctx) {
        for (var i = 0; i < SUB_MODULE_KEYS.length; i++) {
            var key = SUB_MODULE_KEYS[i];
            var sub = window.RBI && window.RBI.registry ? window.RBI.registry.get(key) : null;
            if (!sub) {
                console.warn('[quality.module] Под-модуль не найден в реестре: ' + key);
                continue;
            }
            if (typeof sub.init !== 'function') {
                console.warn('[quality.module] У под-модуля нет метода init(): ' + key);
                continue;
            }
            try {
                await sub.init(ctx);
            } catch (e) {
                console.error('[quality.module] Ошибка init() для ' + key + ':', e);
            }
        }
        // Под-модули часто перезаписывают ctx.templates на RBI.utils.templates
        // (read-only). Для CRUD чек-листов / reference нужен services.templates.
        if (window.RBI && window.RBI.services && window.RBI.services.templates) {
            ctx.templates = window.RBI.services.templates;
        }
        if (window.ReferenceShared) window.ReferenceShared.bindCtx(ctx);
        if (window.InterventionsShared) window.InterventionsShared.bindCtx(ctx);
    }
};

window.RBI = window.RBI || {};
if (window.RBI.registry && typeof window.RBI.registry.register === 'function') {
    window.RBI.registry.register('module.quality', QualityModule);
}
