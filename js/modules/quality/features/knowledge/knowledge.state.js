/**
 * knowledge.state.js
 * Изолированное состояние модуля Knowledge.
 *
 * Единый источник правды для данных базы знаний.
 * Глобальные переменные window.customTwiCards, window.customDocs, window.customNodes
 * остаются для обратной совместимости, но заполняются через этот объект.
 */

function _getSetting(key) {
    return window.RBI.services.settings.get(key);
}

export const KnowledgeState = {

    twiCards:   [],
    customDocs: [],
    customNodes: [],
    etalonActs: [],

    filters: {
        twiOwner:  'ALL',
        docOwner:  'ALL',
        nodeOwner: 'ALL',
        docType:   'ALL'
    },

    /* ── Сеттеры ─────────────────────────────────────────────────────── */

    setTwiCards(arr) {
        this.twiCards = arr || [];
        // Обратная совместимость
        window.customTwiCards = this.twiCards;
        if (window.twiOwnerFilter === undefined) {
            window.twiOwnerFilter = this.filters.twiOwner;
        } else {
            this.filters.twiOwner = window.twiOwnerFilter;
        }
    },

    setDocs(arr) {
        this.customDocs = arr || [];
        window.customDocs = this.customDocs;
        if (window.docOwnerFilter === undefined) {
            window.docOwnerFilter = this.filters.docOwner;
        } else {
            this.filters.docOwner = window.docOwnerFilter;
        }
        if (window.currentDocFilter === undefined) {
            window.currentDocFilter = this.filters.docType;
        } else {
            this.filters.docType = window.currentDocFilter;
        }
    },

    setNodes(arr) {
        this.customNodes = arr || [];
        window.customNodes = this.customNodes;
        if (window.nodeOwnerFilter === undefined) {
            window.nodeOwnerFilter = this.filters.nodeOwner;
        } else {
            this.filters.nodeOwner = window.nodeOwnerFilter;
        }
    },

    setEtalons(arr) {
        this.etalonActs = arr || [];
        window.etalonActs = this.etalonActs;
    },

    /* ── Геттеры с фильтрацией ───────────────────────────────────────── */

    getFilteredTwiCards(searchTerm) {
        var search = (searchTerm || '').toLowerCase();
        var ownerFilter = window.twiOwnerFilter || this.filters.twiOwner;
        var currentEngineer = _getSetting('engineerName') || 'Инженер';

        return this.twiCards.filter(function (card) {
            var title = String(card.title || card.name || (card.data && card.data.title) || '').toLowerCase();
            var checklistName = String(card.checklistName || card.category || (card.data && card.data.checklistName) || '').toLowerCase();
            var type = String(card.type || (card.data && card.data.type) || '').toLowerCase();
            var owner = card.owner || (card.data && card.data.owner) || '';

            var matchSearch = !search
                || title.includes(search)
                || checklistName.includes(search)
                || type.includes(search);

            var matchOwner = ownerFilter === 'ALL' || owner === currentEngineer;

            return matchSearch && matchOwner;
        });
    },

    getFilteredDocs(searchTerm) {
        var search = (searchTerm || '').toLowerCase();
        var ownerFilter = window.docOwnerFilter || this.filters.docOwner;
        var typeFilter  = window.currentDocFilter || this.filters.docType;
        var currentEngineer = _getSetting('engineerName') || 'Инженер';

        var systemDocs = typeof window.SYSTEM_DOCS !== 'undefined' ? window.SYSTEM_DOCS : [];
        var allDocs = systemDocs.concat(this.customDocs);

        return allDocs.filter(function (doc) {
            var code  = String(doc.code  || (doc.data && doc.data.code)  || '').toLowerCase();
            var title = String(doc.title || doc.name || (doc.data && doc.data.title) || '').toLowerCase();
            var type  = doc.type || (doc.data && doc.data.type) || '';
            var owner = doc.owner || (doc.data && doc.data.owner) || '';

            var matchSearch = !search || code.includes(search) || title.includes(search);
            var matchType   = typeFilter === 'ALL' || type === typeFilter;
            var matchOwner  = ownerFilter === 'ALL' || doc.isSystem || owner === currentEngineer;

            return matchSearch && matchType && matchOwner;
        });
    },

    getFilteredNodes(searchTerm) {
        var search = (searchTerm || '').toLowerCase();
        var ownerFilter = window.nodeOwnerFilter || this.filters.nodeOwner;
        var currentEngineer = _getSetting('engineerName') || 'Инженер';

        var systemNodes = typeof window.SYSTEM_NODES !== 'undefined' ? window.SYSTEM_NODES : [];
        var allNodes = systemNodes.concat(this.customNodes);
        var customIds = this.customNodes.map(function (n) { return n.id; });

        return allNodes.filter(function (node) {
            var title    = String(node.title || node.name || (node.data && node.data.title) || '').toLowerCase();
            var desc     = String(node.desc || node.description || (node.data && node.data.desc) || '').toLowerCase();
            var category = String(node.category || (node.data && node.data.category) || '').toLowerCase();
            var owner    = node.owner || (node.data && node.data.owner) || '';
            var isSystem = customIds.indexOf(node.id) === -1;

            var matchSearch = !search
                || title.includes(search)
                || desc.includes(search)
                || category.includes(search);

            var matchOwner = ownerFilter === 'ALL' || isSystem || owner === currentEngineer;

            return matchSearch && matchOwner;
        });
    }
};

// Публикация в window для доступа из консоли и legacy-кода
if (typeof window !== 'undefined') {
    window.KnowledgeState = KnowledgeState;
}

console.log('[KnowledgeState] knowledge.state.js loaded');
