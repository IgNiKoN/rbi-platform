/**
 * history.state.js
 * Изолированное состояние модуля History.
 *
 * Единый источник правды для данных истории проверок.
 * Все модули читают данные через window.HistoryState.allRecords.
 */

export const HistoryState = {

    records: [],
    allRecords: [],
    selectedIds: [],

    filters: {
        period: 'all',
        contractor: '',
        object: '',
        status: '',
        searchText: ''
    },

    visibleGroupCount: 15,
    hasMore: false,

    /* ── Сеттеры ─────────────────────────────────────────────────────── */

    setRecords(arr) {
        this.allRecords = arr || [];
        this.records = this.allRecords;
    },

    setFilters(patch) {
        if (patch && typeof patch === 'object') {
            Object.assign(this.filters, patch);
        }
    },

    resetFilters() {
        this.filters = {
            period: 'all',
            contractor: '',
            object: '',
            status: '',
            searchText: ''
        };
    },

    setSelectedIds(ids) {
        this.selectedIds = Array.isArray(ids) ? ids : [];
    },

    setVisibleGroupCount(n) {
        this.visibleGroupCount = typeof n === 'number' && n > 0 ? n : 15;
    }
};

if (typeof window !== 'undefined') {
    window.HistoryState = HistoryState;
}

console.log('[HistoryState] history.state.js loaded');
