/* Файл: js/services/inspection.service.js */
/* Inspection Service v0.1 — legacy wrapper над STORES.HISTORY */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    /* Владение contractorArray (Реальная изоляция модулей, часть 3, Группа C,
       критичный шаг): перенесено 1:1 из js/core/bootstrap.js — сервис теперь
       единственный владелец объявления, window.contractorArray остаётся
       синхронизированной живой ссылкой для всех существующих потребителей
       (большинство модулей читают bare window.contractorArray напрямую). */
    window.contractorArray = window.contractorArray || [];

    function getHistoryStore() {
        if (typeof STORES !== 'undefined' && STORES.HISTORY) return STORES.HISTORY;
        return 'app_history';
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function markSyncDirty() {
        if (window.RBI.services.sync && typeof window.RBI.services.sync.markDirty === 'function') {
            window.RBI.services.sync.markDirty('history');
        }
    }

    window.RBI.services.inspections = {

        normalize: function (record) {
            if (!record || typeof record !== 'object') return record;

            var isDeleted = record._deleted === true || record.is_deleted === true;
            var syncStatus = record.syncStatus || record.sync_status || 'not_synced';
            var updatedAt = record.updatedAt || record.updated_at || nowIso();

            return Object.assign({}, record, {
                module: record.module || 'quality',
                entityType: record.entityType || 'inspection',
                _deleted: isDeleted,
                is_deleted: isDeleted,
                syncStatus: syncStatus,
                sync_status: syncStatus,
                updatedAt: updatedAt,
                updated_at: updatedAt
            });
        },

        getAll: async function () {
            if (!window.RBI.services.storage) throw new Error('[RBI.inspections] storage service недоступен');
            var arr = await window.RBI.services.storage.getAll(getHistoryStore());
            var self = this;
            return Array.isArray(arr) ? arr.map(function (i) { return self.normalize(i); }) : [];
        },

        getAllSync: function () {
            if (window.HistoryState && Array.isArray(window.HistoryState.allRecords)) {
                return window.HistoryState.allRecords;
            }
            return Array.isArray(window.contractorArray) ? window.contractorArray : [];
        },

        pushSync: function (item) {
            if (window.HistoryState && Array.isArray(window.HistoryState.allRecords)) {
                window.HistoryState.allRecords.push(item);
                return true;
            }
            if (Array.isArray(window.contractorArray)) {
                window.contractorArray.push(item);
                return true;
            }
            return false;
        },

        setAllSync: function (arr) {
            var safeArr = Array.isArray(arr) ? arr : [];
            // ВАЖНО (найдено смоук-тестом): большинство модулей (sk/construction/
            // tasks/analytics/audit/meetings/interventions/knowledge/smart-input и др.)
            // читают bare window.contractorArray напрямую, без HistoryState-фоллбэка —
            // писать нужно в оба места, не только в HistoryState.
            window.contractorArray = safeArr;
            if (window.HistoryState) {
                window.HistoryState.setRecords(safeArr);
            }
            return window.contractorArray;
        },

        getAllForAnalyticsSync: function () {
            if (window.HistoryState && Array.isArray(window.HistoryState.allRecords) && window.HistoryState.allRecords.length > 0) {
                return window.HistoryState.allRecords;
            }
            return Array.isArray(window.contractorArray) ? window.contractorArray : [];
        },

        getDefectCausesSync: function () {
            return Array.isArray(window.DEFECT_CAUSES) ? window.DEFECT_CAUSES : [];
        },

        getActive: async function () {
            var arr = await this.getAll();
            return arr.filter(function (i) {
                return i && i._deleted !== true && i.is_deleted !== true;
            });
        },

        getById: async function (id) {
            var arr = await this.getAll();
            return arr.find(function (i) { return i.id === id; }) || null;
        },

        save: async function (record) {
            if (!window.RBI.services.storage) throw new Error('[RBI.inspections] storage service недоступен');
            var now = nowIso();
            var normalized = this.normalize(Object.assign({}, record, {
                updatedAt: now,
                updated_at: now,
                source: 'local',
                syncStatus: 'not_synced',
                sync_status: 'not_synced'
            }));
            await window.RBI.services.storage.put(getHistoryStore(), normalized);
            markSyncDirty();
            return normalized;
        },

        softDelete: async function (id) {
            var item = await this.getById(id);
            if (!item) return false;
            var now = nowIso();
            var deleted = this.normalize(Object.assign({}, item, {
                _deleted: true,
                is_deleted: true,
                deleted_at: now,
                updatedAt: now,
                updated_at: now,
                source: 'local',
                syncStatus: 'deleted_pending_sync',
                sync_status: 'deleted_pending_sync'
            }));
            await window.RBI.services.storage.put(getHistoryStore(), deleted);
            markSyncDirty();
            return deleted;
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.inspections', window.RBI.services.inspections);
    }

    console.log('[RBI Service] inspections loaded');
}());
