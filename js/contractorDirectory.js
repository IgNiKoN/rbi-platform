/* Файл: js/contractorDirectory.js */
/* Справочник подрядчиков и нормализация названий для ПК СК и проверок RBI */

window.ContractorDirectory = {
    contractors: [],
    aliases: {},

    // Загрузка эталонного справочника ТОЛЬКО из локальной базы (Offline-First)
    async init() {
        try {
            if (typeof dbGetAll === 'function' && typeof STORES !== 'undefined') {
                const storedContractors = await dbGetAll(STORES.CONTRACTOR_DIRECTORY);
                if (storedContractors) {
                    this.contractors = storedContractors.filter(c => !c._deleted && !c.is_deleted);
                }

                const storedAliases = await dbGetAll(STORES.CONTRACTOR_ALIASES);
                if (storedAliases) {
                    storedAliases.forEach(a => {
                        if (a.raw_name && a.canonical_key) {
                            this.aliases[this.cleanString(a.raw_name)] = a.canonical_key;
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('[ContractorDirectory] Ошибка инициализации:', e);
        }
    },

    cleanString(str) {
        if (!str) return '';

        return String(str)
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/["'«»„“”]/g, '')
            .replace(/\b(ооо|оао|зао|пао|ао|ип|общество с ограниченной ответственностью)\b/gi, '')
            .replace(/[.,;:()№]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    makeCanonicalKey(str) {
        const clean = this.cleanString(str);

        return clean
            .replace(/[^a-zа-я0-9]+/gi, '_')
            .replace(/^_+|_+$/g, '') || 'unknown_contractor';
    },

    getSimilarity(s1, s2) {
        if (!s1 || !s2) return 0;

        let longer = s1;
        let shorter = s2;

        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }

        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;

        const costs = [];
        for (let i = 0; i <= shorter.length; i++) costs[i] = i;

        for (let i = 1; i <= longer.length; i++) {
            let costsTemp = costs[0];
            costs[0] = i;
            let nw = i - 1;

            for (let j = 1; j <= shorter.length; j++) {
                const cj = Math.min(
                    1 + Math.min(costs[j], costs[j - 1]),
                    shorter[j - 1] === longer[i - 1] ? nw : nw + 1
                );

                nw = costs[j];
                costs[j] = cj;
            }
        }

        return (longerLength - costs[shorter.length]) / parseFloat(longerLength);
    },

    async normalizeContractorName(rawName) {
        const raw = String(rawName || '').trim();

        if (!raw) {
            return {
                status: 'empty',
                raw_name: '',
                canonical_key: '',
                display_name: 'Не указан',
                cleaned_name: ''
            };
        }

        const clean = this.cleanString(raw);

        // 1. Алиасы
        if (this.aliases[clean]) {
            const found = this.contractors.find(c => c.canonical_key === this.aliases[clean]);

            if (found) {
                return {
                    status: 'matched',
                    raw_name: raw,
                    canonical_key: found.canonical_key,
                    display_name: found.display_name,
                    cleaned_name: clean,
                    match_type: 'alias',
                    score: 1
                };
            }
        }

        // 2. Точное совпадение
        for (const c of this.contractors) {
            const displayClean = this.cleanString(c.display_name || '');
            const keyClean = this.cleanString(c.canonical_key || '');

            if (displayClean === clean || keyClean === clean) {
                return {
                    status: 'matched',
                    raw_name: raw,
                    canonical_key: c.canonical_key,
                    display_name: c.display_name,
                    cleaned_name: clean,
                    match_type: 'exact',
                    score: 1
                };
            }

            if (Array.isArray(c.synonyms)) {
                const synMatch = c.synonyms.some(s => this.cleanString(s) === clean);

                if (synMatch) {
                    return {
                        status: 'matched',
                        raw_name: raw,
                        canonical_key: c.canonical_key,
                        display_name: c.display_name,
                        cleaned_name: clean,
                        match_type: 'synonym',
                        score: 1
                    };
                }
            }
        }

        // 3. Нечёткое совпадение
        let matches = [];

        for (const c of this.contractors) {
            const scores = [];

            scores.push(this.getSimilarity(clean, this.cleanString(c.display_name || '')));
            scores.push(this.getSimilarity(clean, this.cleanString(c.canonical_key || '')));

            if (Array.isArray(c.synonyms)) {
                c.synonyms.forEach(s => scores.push(this.getSimilarity(clean, this.cleanString(s || ''))));
            }

            const best = Math.max(...scores);

            if (best >= 0.82) {
                matches.push({
                    contractor: c,
                    score: best
                });
            }
        }

        matches.sort((a, b) => b.score - a.score);

        if (matches.length > 0) {
            const best = matches[0].contractor;

            // Автоматически сохраняем алиас, если совпадение достаточно уверенное
            if (matches[0].score >= 0.90) {
                await this.saveAlias(raw, best.canonical_key);
            }

            return {
                status: matches.length > 1 ? 'multiple_matched_auto_best' : 'matched',
                raw_name: raw,
                canonical_key: best.canonical_key,
                display_name: best.display_name,
                cleaned_name: clean,
                match_type: 'fuzzy',
                score: matches[0].score,
                alternatives: matches.slice(1, 5).map(m => ({
                    canonical_key: m.contractor.canonical_key,
                    display_name: m.contractor.display_name,
                    score: m.score
                }))
            };
        }

        // 4. Не нашли — создаём кандидата в очередь
        const suggestedKey = this.makeCanonicalKey(raw);

        await this.createQueueItem(raw, suggestedKey);

        return {
            status: 'pending',
            raw_name: raw,
            canonical_key: '',
            suggested_canonical_key: suggestedKey,
            display_name: raw,
            cleaned_name: clean,
            match_type: 'none',
            score: 0
        };
    },

    async saveAlias(rawName, canonicalKey) {
        if (!rawName || !canonicalKey) return false;

        const pCode = window.syncConfig?.projectCode || '';
        const cleanRaw = this.cleanString(rawName);

        this.aliases[cleanRaw] = canonicalKey;

        const alias = {
            id: 'contractor_alias_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
            project_code: pCode,
            raw_name: rawName,
            canonical_key: canonicalKey,
            created_by: window.RbiRoles?.getCurrentEngineerName?.() || window.syncConfig?.engineerName || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (typeof dbPut === 'function') {
            await dbPut(STORES.CONTRACTOR_ALIASES, alias);
            // Сигнализируем синхронизатору, что появились новые данные
            localStorage.setItem('rbi_cloud_dirty', '1');
            if (typeof triggerSync === 'function') triggerSync('silent');
        }

        return true;
    },

    async createQueueItem(rawName, suggestedKey = '') {
        if (!rawName) return false;

        const pCode = window.syncConfig?.projectCode || '';
        const clean = this.cleanString(rawName);
        const rawTrimmed = String(rawName || '').trim();

        // 1. Проверяем, нет ли уже такой заявки локально
        if (typeof dbGetAll === 'function' && typeof STORES !== 'undefined' && STORES.CONTRACTOR_QUEUE) {
            const existingQueue = await dbGetAll(STORES.CONTRACTOR_QUEUE) || [];

            const existing = existingQueue.find(q =>
                String(q.project_code || '') === String(pCode || '') &&
                this.cleanString(q.raw_name || '') === clean &&
                q.status !== 'resolved' &&
                q.status !== 'rejected'
            );

            if (existing) {
                return false;
            }
        }

        const queueItem = {
            id: 'contractor_queue_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
            project_code: pCode,
            raw_name: rawTrimmed,
            cleaned_name: clean,
            suggested_canonical_key: suggestedKey || this.makeCanonicalKey(rawTrimmed),
            source_table: 'sk_records',
            source_record_id: '',
            created_by: window.RbiRoles?.getCurrentEngineerName?.() || window.syncConfig?.engineerName || '',
            status: 'pending',
            admin_comment: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updatedAt: new Date().toISOString(),

            source: 'local',
            syncStatus: 'not_synced',
            sync_status: 'not_synced',
            syncBlockReason: '',
            sync_block_reason: ''
        };

        if (typeof dbPut === 'function') {
            await dbPut(STORES.CONTRACTOR_QUEUE, queueItem);
        }

        localStorage.setItem('rbi_cloud_dirty', '1');

        return true;
    }
};