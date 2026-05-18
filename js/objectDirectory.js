/* Файл: js/objectDirectory.js (Справочник объектов и нормализация) */

window.ObjectDirectory = {
    objects: [], // Эталонный массив объектов из БД
    aliases: {}, // Кэш алиасов (кривое название -> эталон)

    // Загрузка эталонного справочника из IndexedDB
    async init() {
        try {
            // 1. Сначала грузим из локальной базы для мгновенного отображения
            if (typeof dbGetAll !== 'undefined') {
                const storedObjs = await dbGetAll('project_objects');
                if (storedObjs) this.objects = storedObjs.filter(o => !o._deleted);

                const storedAliases = await dbGetAll('object_aliases');
                if (storedAliases) {
                    storedAliases.forEach(a => {
                        this.aliases[a.raw_name] = a.canonical_key;
                    });
                }
            }

            // 2. Затем тихо тянем свежак из Supabase (если есть интернет и мы авторизованы)
            if (navigator.onLine && window.supabaseClient && window.syncConfig?.projectCode) {
                const { data: cloudObjs } = await window.supabaseClient
                    .from('project_objects')
                    .select('*')
                    .eq('project_code', window.syncConfig.projectCode);

                if (cloudObjs) {
                    for (let cObj of cloudObjs) {
                        const localObj = this.objects.find(o => o.id === cObj.id);
                        const cTime = new Date(cObj.updated_at || 0).getTime();
                        const lTime = localObj ? new Date(localObj.updated_at || 0).getTime() : 0;

                        if (!localObj || cTime > lTime) {
                            cObj._deleted = cObj.is_deleted;
                            await dbPut('project_objects', cObj);

                            const idx = this.objects.findIndex(o => o.id === cObj.id);
                            if (idx >= 0) this.objects[idx] = cObj;
                            else this.objects.push(cObj);
                        }
                    }
                    this.objects = this.objects.filter(o => !o._deleted);
                }
            }
        } catch (e) {
            console.error("[ObjectDirectory] Ошибка инициализации:", e);
        }
    },

    // Очистка строки перед сравнением
    cleanString(str) {
        if (!str) return "";
        return str.toLowerCase()
            .replace(/['"«»]/g, '')
            .replace(/жк\s+/gi, '') // убираем приставку ЖК
            .trim();
    },

    // Расчет процента совпадения (расстояние Левенштейна)
    getSimilarity(s1, s2) {
        if (!s1 || !s2) return 0;
        let longer = s1; let shorter = s2;
        if (s1.length < s2.length) { longer = s2; shorter = s1; }
        let longerLength = longer.length;
        if (longerLength === 0) return 1.0;

        let costs = new Array();
        for (let i = 0; i <= shorter.length; i++) costs[i] = i;
        for (let i = 1; i <= longer.length; i++) {
            let costsTemp = costs[0]; costs[0] = i; let nw = i - 1;
            for (let j = 1; j <= shorter.length; j++) {
                let cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), shorter[j - 1] === longer[i - 1] ? nw : nw + 1);
                nw = costs[j]; costs[j] = cj;
            }
        }
        return (longerLength - costs[shorter.length]) / parseFloat(longerLength);
    },

    // Умная нормализация названия
    // Умная нормализация названия объекта
    async normalizeProjectName(inputRawName) {
        if (!inputRawName) {
            return {
                status: 'empty',
                canonical_key: '',
                display_name: 'Не указан',
                raw_name: ''
            };
        }

        const rawName = String(inputRawName).trim();
        const cleanInput = this.cleanString(rawName);

        // 1. Проверяем кэш алиасов
        if (this.aliases[rawName]) {
            const foundObj = this.objects.find(o => o.canonical_key === this.aliases[rawName]);
            if (foundObj) {
                return {
                    status: 'matched',
                    canonical_key: foundObj.canonical_key,
                    display_name: foundObj.display_name,
                    raw_name: rawName,
                    match_type: 'alias',
                    score: 1
                };
            }
        }

        // 2. Точное совпадение по display_name / canonical_key / synonyms
        for (let obj of this.objects) {
            const objDisplay = this.cleanString(obj.display_name || '');
            const objKey = this.cleanString(obj.canonical_key || '');

            if (objDisplay === cleanInput || objKey === cleanInput) {
                return {
                    status: 'matched',
                    canonical_key: obj.canonical_key,
                    display_name: obj.display_name,
                    raw_name: rawName,
                    match_type: 'exact',
                    score: 1
                };
            }

            if (Array.isArray(obj.synonyms)) {
                const isSynonym = obj.synonyms.some(syn => this.cleanString(syn) === cleanInput);

                if (isSynonym) {
                    return {
                        status: 'matched',
                        canonical_key: obj.canonical_key,
                        display_name: obj.display_name,
                        raw_name: rawName,
                        match_type: 'synonym',
                        score: 1
                    };
                }
            }
        }

        // 3. Нечёткий поиск по display_name, canonical_key и synonyms
        let matches = [];

        for (let obj of this.objects) {
            let scores = [];

            scores.push(this.getSimilarity(cleanInput, this.cleanString(obj.display_name || '')));
            scores.push(this.getSimilarity(cleanInput, this.cleanString(obj.canonical_key || '')));

            if (Array.isArray(obj.synonyms)) {
                obj.synonyms.forEach(syn => {
                    scores.push(this.getSimilarity(cleanInput, this.cleanString(syn || '')));
                });
            }

            const bestScore = Math.max(...scores);

            if (bestScore > 0.75) {
                matches.push({
                    obj,
                    score: bestScore
                });
            }
        }

        matches.sort((a, b) => b.score - a.score);

        // 4. Если найдено несколько близких совпадений — пока выбираем лучший,
        // но помечаем, что были альтернативы. Интерфейс выбора добавим позже.
        if (matches.length > 0) {
            const bestMatch = matches[0].obj;
            const bestScore = matches[0].score;

            this.aliases[rawName] = bestMatch.canonical_key;

            const newAlias = {
                id: 'alias_' + Date.now().toString(36),
                raw_name: rawName,
                canonical_key: bestMatch.canonical_key,
                project_code: window.syncConfig?.projectCode || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (typeof dbPut === 'function' && typeof STORES !== 'undefined') {
                await dbPut(STORES.OBJECT_ALIASES, newAlias);
            }

            localStorage.setItem('rbi_cloud_dirty', '1');

            return {
                status: matches.length > 1 ? 'multiple_matched_auto_best' : 'matched',
                canonical_key: bestMatch.canonical_key,
                display_name: bestMatch.display_name,
                raw_name: rawName,
                match_type: 'fuzzy',
                score: bestScore,
                alternatives: matches.slice(1, 5).map(m => ({
                    canonical_key: m.obj.canonical_key,
                    display_name: m.obj.display_name,
                    score: m.score
                }))
            };
        }

        // 5. Если совпадений нет — отправляем заявку руководителю на подтверждение
        const newKey = this.cleanString(rawName);

        if (typeof appSettings !== 'undefined') {
            if (!Array.isArray(appSettings.pendingAssignedProjects)) appSettings.pendingAssignedProjects = [];

            // Добавляем в очередь инженера
            const exists = appSettings.pendingAssignedProjects.some(p => p.raw_name === rawName);
            if (!exists) {
                const reqObj = {
                    raw_name: rawName,
                    canonical_key: newKey,
                    display_name: rawName,
                    status: 'pending',
                    created_at: new Date().toISOString()
                };

                appSettings.pendingAssignedProjects.push(reqObj);
                if (typeof dbPut === 'function') dbPut('app_settings', { key: 'user_prefs', ...appSettings });

                // Немедленно пушим заявку в профиль Supabase, чтобы Админ увидел её в Ролях
                // Немедленно пушим заявку в профиль Supabase, чтобы Админ увидел её в панели
                if (typeof window.pushObjectRequestToCloud === 'function') {
                    window.pushObjectRequestToCloud(reqObj).catch(e => {
                        console.warn('[ObjectDirectory] Не удалось отправить заявку на объект:', e);
                        localStorage.setItem('rbi_cloud_dirty', '1');
                    });
                }
            }
        }

        return {
            status: 'not_normalized',
            canonical_key: newKey, // Временный системный ключ для связи дефектов
            display_name: rawName,
            raw_name: rawName,
            match_type: 'none',
            score: 0
        };
    },

    // Получить объект по canonical_key
    getObjectByKey(canonicalKey) {
        if (!canonicalKey) return null;

        return this.objects.find(o =>
            String(o.canonical_key) === String(canonicalKey)
        ) || null;
    },

    // Получить красивое название по canonical_key
    getDisplayNameByKey(canonicalKey) {
        const obj = this.getObjectByKey(canonicalKey);
        return obj ? obj.display_name : canonicalKey;
    },

    // Получить закреплённые объекты как полноценные объекты справочника
    getAssignedProjectObjects() {
        const assigned = this.getAssignedProjects();

        return assigned.map(key => {
            const obj = this.getObjectByKey(key);

            if (obj) {
                return {
                    canonical_key: obj.canonical_key,
                    display_name: obj.display_name
                };
            }

            return {
                canonical_key: key,
                display_name: key
            };
        });
    },
    getAssignedProjects() {
        if (typeof appSettings === 'undefined' || !appSettings.assignedProjects) return [];
        return appSettings.assignedProjects;
    },

    initUI() {
        const projectEl = document.getElementById('inp-project');
        const projInputContainer = projectEl?.parentElement;

        if (!projInputContainer) return;

        const currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isManagerRole = ['director', 'project_manager', 'deputy_manager', 'manager'].includes(currentRole);
        const currentValue = projectEl ? (projectEl.dataset.displayName || projectEl.value || '') : '';

        // 1. ДЛЯ РУКОВОДИТЕЛЕЙ: Всегда свободный текстовый ввод с подсказками
        if (isManagerRole) {
            let datalistHtml = `<datalist id="all-objects-list">`;
            this.objects.forEach(o => { datalistHtml += `<option value="${o.display_name}"></option>`; });
            datalistHtml += `</datalist>`;

            const inputHtml = `
                <input type="text" id="inp-project" list="all-objects-list" class="input-base text-center pr-7 transition-colors" placeholder="Объект *" autocomplete="off" value="${currentValue}">
                ${datalistHtml}
                <span id="lock-inp-project" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-50 hidden pointer-events-none">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"></path></svg>
                </span>
            `;
            if (projectEl.tagName.toLowerCase() === 'select') projInputContainer.innerHTML = inputHtml;
            if (typeof initSmartInput === 'function') initSmartInput('inp-project', 'projectName');
            return;
        }

        // 2. ДЛЯ ИНЖЕНЕРА: Смотрим на закрепленные объекты в памяти телефона
        const assignedObjects = this.getAssignedProjectObjects();

        if (assignedObjects.length === 0) {
            // Если объектов нет - разрешаем ручной ввод для отправки заявки
            if (projectEl.tagName.toLowerCase() === 'select') {
                projInputContainer.innerHTML = `<input type="text" id="inp-project" class="input-base text-center pr-7 transition-colors" placeholder="Впишите объект для доступа..." autocomplete="off" value="${currentValue}">
                <span class="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" title="Введите объект и сохраните акт для отправки заявки"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></span>`;
            } else {
                projectEl.placeholder = "Впишите объект для доступа...";
                projectEl.removeAttribute('readonly');
                projectEl.classList.remove('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed', 'pointer-events-none');
            }
            return;
        }

        // Если объекты есть - ЖЕСТКО делаем выпадающий список (даже без интернета)
        const optionsHtml = assignedObjects.map(obj => {
            const selected = (currentValue === obj.canonical_key || currentValue === obj.display_name) ? 'selected' : '';
            return `<option value="${obj.canonical_key}" data-display-name="${obj.display_name}" ${selected}>${obj.display_name}</option>`;
        }).join('');

        const selectHtml = `
            <select id="inp-project" class="input-base text-center transition-colors appearance-none font-bold text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" style="text-align-last:center;"
                onchange="
                    const opt = this.options[this.selectedIndex];
                    this.dataset.displayName = opt ? opt.dataset.displayName : this.value;
                    if(typeof updateLocationFromStructured === 'function') updateLocationFromStructured();
                    if(typeof updateDataSummary === 'function') updateDataSummary();
                ">
                <option value="" disabled ${currentValue ? '' : 'selected'}>Выберите объект...</option>
                ${optionsHtml}
            </select>
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
            </span>
        `;

        if (projectEl.tagName.toLowerCase() === 'input') {
            projInputContainer.innerHTML = selectHtml;
        } else {
            projectEl.outerHTML = selectHtml;
        }

        const sel = document.getElementById('inp-project');
        if (!sel) return;

        const matched = assignedObjects.find(obj => obj.canonical_key === currentValue || obj.display_name === currentValue);
        if (matched) {
            sel.value = matched.canonical_key;
            sel.dataset.displayName = matched.display_name;
        }

        if (assignedObjects.length === 1) {
            sel.value = assignedObjects[0].canonical_key;
            sel.dataset.displayName = assignedObjects[0].display_name;
            sel.setAttribute('disabled', 'true');
            sel.classList.add('opacity-80');
        }
    },

    renderManagerPanel() {
        const container = document.getElementById('manager-objects-list');
        if (!container) return;

        let html = `
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-xl mb-4 text-[10px] text-blue-800 dark:text-blue-300 shadow-sm leading-relaxed">
            <b>Как это работает:</b><br>
            1. Создайте здесь эталонный объект (например, <i>ЖК Ромашка</i>). Система присвоит ему ID.<br>
            2. Впишите этот ID (ключ) в профиль инженера во вкладке "Роли" (через запятую, если объектов несколько).<br>
            3. Если в Excel-файлах Стройконтроля прорабы пишут "Ромашка 1 очередь", добавьте это как Синоним.
        </div>`;

        if (this.objects.length === 0) {
            html += `<div class="text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-300 rounded-xl bg-white dark:bg-slate-800">Справочник пуст</div>`;
        } else {
            this.objects.forEach(obj => {
                const objAliases = Object.keys(this.aliases).filter(k => this.aliases[k] === obj.canonical_key);

                // Рендерим синонимы с кнопкой удаления крестиком (если потребуется)
                const aliasTags = objAliases.map(a => `
                    <span class="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-[9px] mr-1 mb-1 inline-flex items-center gap-1">
                        ${a}
                    </span>
                `).join('');

                html += `
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 shadow-sm mb-3">
                    <div class="flex justify-between items-start mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <div class="min-w-0 pr-2">
                            <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase truncate">${obj.display_name}</div>
                            <div class="text-[9px] font-mono text-slate-400 mt-0.5 truncate">Ключ: <span class="text-indigo-500 font-bold">${obj.canonical_key}</span></div>
                        </div>
                        <div class="shrink-0">
                            <button onclick="ObjectDirectory.deleteObject('${obj.id}')" class="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-1.5 rounded-lg border border-red-200 active:scale-95 shadow-sm transition-colors">Удалить</button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Привязанные синонимы (Excel):</div>
                        <div class="flex flex-wrap gap-1 mb-2">${aliasTags || '<span class="text-[9px] italic text-slate-400">Нет синонимов</span>'}</div>
                        
                        <!-- Инлайн добавление синонима -->
                        <div class="flex gap-1.5">
                            <input type="text" id="alias_input_${obj.canonical_key}" class="input-base !py-1.5 text-[10px] flex-1" placeholder="Напр: Ромашка 1 оч">
                            <button onclick="ObjectDirectory.addAliasInline('${obj.canonical_key}')" class="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border border-slate-200 dark:border-slate-600 active:scale-95 transition-transform shrink-0">+ Синоним</button>
                        </div>
                    </div>
                </div>`;
            });
        }

        container.innerHTML = html;
    },

    // Применение решения Админа по заявке
    async resolveRequest(inspectorId, reqIdx, rawName, action) {
        if (action === 'ignore') return showToast('Заявка оставлена в ожидании');

        showToast('Обработка заявки...');
        try {
            const pCode = window.syncConfig?.projectCode || 'RBI';

            const { data: user, error: fetchErr } = await window.supabaseClient
                .from('rbi_engineer_profiles')
                .select('settings, assigned_projects')
                .eq('inspector_id', inspectorId)
                .single();

            if (fetchErr) throw fetchErr;

            let assigned = user.assigned_projects || [];
            let settings = user.settings || {};
            let reqs = settings.requestedProjects || [];

            if (action === 'create') {
                const newKey = this.cleanString(rawName);

                await window.supabaseClient.from('project_objects').upsert({
                    id: 'obj_' + Date.now().toString(36),
                    project_code: pCode,
                    canonical_key: newKey,
                    display_name: rawName,
                    synonyms: [],
                    created_by: window.syncConfig.engineerName,
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });

                if (!assigned.includes(newKey)) assigned.push(newKey);
                showToast('✅ Объект создан и выдан доступ!');
            }
            else if (action.startsWith('link_')) {
                const canonicalKey = action.replace('link_', '');
                if (!assigned.includes(canonicalKey)) assigned.push(canonicalKey);

                const { data: objRows } = await window.supabaseClient.from('project_objects').select('id, synonyms').eq('project_code', pCode).eq('canonical_key', canonicalKey).limit(1);
                if (objRows && objRows.length > 0) {
                    const oldSynonyms = Array.isArray(objRows[0].synonyms) ? objRows[0].synonyms : [];
                    if (!oldSynonyms.includes(rawName)) {
                        await window.supabaseClient.from('project_objects').update({
                            synonyms: [...oldSynonyms, rawName], updated_at: new Date().toISOString()
                        }).eq('id', objRows[0].id);

                        await window.supabaseClient.from('object_aliases').upsert({
                            project_code: pCode, raw_name: rawName, canonical_key: canonicalKey, updated_at: new Date().toISOString()
                        }, { onConflict: 'project_code,raw_name' });
                    }
                }
                showToast('✅ Объект связан, доступ выдан!');
            }
            else if (action === 'reject') {
                showToast('❌ Заявка отклонена');
            }

            reqs.splice(reqIdx, 1);
            settings.requestedProjects = reqs;

            await window.supabaseClient.from('rbi_engineer_profiles').update({
                assigned_projects: assigned,
                settings: settings,
                updated_at: new Date().toISOString()
            }).eq('inspector_id', inspectorId);

            // Обновляем панель
            await this.init();
            this.renderManagerPanel();
            this.loadRequests(); // Перерисовываем список заявок
            if (typeof gameLoadRoles === 'function') gameLoadRoles(); // Перерисовываем список ролей, так как у пользователя обновились объекты

        } catch (e) {
            console.error(e);
            showToast('❌ Ошибка обработки заявки');
        }
    },

    // НОВАЯ ФУНКЦИЯ: Загрузка заявок из Supabase
    async loadRequests() {
        const listEl = document.getElementById('obj-requests-list');
        if (!listEl || !window.supabaseClient) {
            if (listEl) listEl.innerHTML = '<div class="text-slate-400 text-[10px] text-center font-bold">Облако не подключено</div>';
            return;
        }

        try {
            const pCode = window.syncConfig?.projectCode || 'RBI';
            const { data, error } = await window.supabaseClient
                .from('rbi_engineer_profiles')
                .select('inspector_id, engineer_name, settings')
                .eq('project_code', pCode);

            if (error) throw error;
                        // 1. Заявки на добавление объектов в справочник из ПК СК.
            // Эти заявки не принадлежат пользователю и не должны выдавать доступ.
            const { data: directoryQueue, error: queueError } = await window.supabaseClient
                .from('object_normalization_queue')
                .select('id, project_code, raw_name, suggested_canonical_key, source_table, created_by, status, admin_comment, created_at, updated_at')
                .eq('project_code', pCode)
                .neq('status', 'linked')
                .neq('status', 'resolved')
                .neq('status', 'rejected')
                .order('updated_at', { ascending: false });

            if (queueError) throw queueError;

            let requestsHtml = '';
                        if (Array.isArray(directoryQueue) && directoryQueue.length > 0) {
                requestsHtml += `
                    <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 shadow-sm mb-3">
                        <div class="text-[10px] font-black text-indigo-700 uppercase mb-2 border-b border-indigo-200 pb-1">
                            Заявки из ПК СК на добавление в справочник объектов
                        </div>

                        ${directoryQueue.map(q => {
                            const raw = String(q.raw_name || '').replace(/"/g, '&quot;');
                            const qid = String(q.id || '').replace(/"/g, '&quot;');
                            const selectId = `obj_queue_action_${qid}`;

                            return `
                                <div class="mb-2 bg-white p-3 rounded-xl border border-indigo-200 shadow-sm">
                                    <div class="text-[12px] font-black text-slate-800 mb-1">
                                        Объект: <span class="text-indigo-600">"${raw}"</span>
                                    </div>
                                    <div class="text-[9px] text-slate-400 mb-2">
                                        Источник: ${q.source_table || 'ПК СК'} · Автор загрузки: ${q.created_by || 'не указан'}
                                    </div>

                                    <div class="flex gap-2 items-center">
                                        <select id="${selectId}" class="input-base !py-1.5 !text-[10px] font-bold flex-1">
                                            <option value="create">Создать новый объект в справочнике</option>
                                            ${allObjsOptions}
                                            <option value="reject">Отклонить</option>
                                        </select>

                                        <button onclick="
                                            const action = document.getElementById('${selectId}').value;
                                            ObjectDirectory.resolveDirectoryRequest('${qid}', '${raw}', action);
                                        " class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 shrink-0 transition-transform">
                                            Сохранить
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
            // Формируем список существующих объектов для привязки (Без эмодзи!)
            let allObjsOptions = this.objects.map(o => `<option value="link_${o.canonical_key}">Связать с: ${o.display_name}</option>`).join('');

            data.forEach(user => {
                const reqs = user.settings?.requestedProjects || [];
                if (reqs.length === 0) return;

                const safeEng = String(user.engineer_name || user.inspector_id).replace(/"/g, '&quot;');

                requestsHtml += `
                <div class="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm mb-3">
                    <div class="text-[10px] font-black text-slate-800 uppercase mb-2 border-b border-orange-200 pb-1 flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        Автор заявки: ${safeEng}
                    </div>
                    ${reqs.map((req, idx) => {
                    const raw = String(req.raw_name || '').replace(/"/g, '&quot;');
                    const selectId = `req_action_${user.inspector_id}_${idx}`;
                    return `
                            <div class="mb-2 bg-white p-3 rounded-xl border border-orange-200 shadow-sm">
                                <div class="text-[12px] font-black text-slate-800 mb-3 border-b border-slate-100 pb-2">
                                    Объект: <span class="text-indigo-600">"${raw}"</span>
                                </div>
                                
                                <div class="flex gap-2 mb-3">
                                    <button onclick="ObjectDirectory.resolveRequest('${user.inspector_id}', ${idx}, '${raw}', 'create')" class="flex-1 bg-green-500 text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-transform">✨ Создать как новый</button>
                                    <button onclick="ObjectDirectory.resolveRequest('${user.inspector_id}', ${idx}, '${raw}', 'reject')" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-transform">❌ Отклонить</button>
                                </div>
                                
                                <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <div class="text-[9px] font-bold text-slate-500 uppercase mb-1">Или связать с существующим:</div>
                                    <div class="flex gap-2 items-center">
                                        <select id="${selectId}" class="input-base !py-1.5 !text-[10px] font-bold flex-1">
                                            <option value="" disabled selected>-- Выберите объект --</option>
                                            ${allObjsOptions}
                                        </select>
                                        <button onclick="
                                            const sel = document.getElementById('${selectId}').value;
                                            if(!sel) return showToast('Выберите объект из списка!');
                                            ObjectDirectory.resolveRequest('${user.inspector_id}', ${idx}, '${raw}', sel);
                                        " class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 shrink-0 transition-transform">🔗 Связать</button>
                                    </div>
                                </div>
                            </div>
                        `;
                }).join('')}
                </div>`;
            });

            if (!requestsHtml) {
                listEl.innerHTML = '<div class="text-slate-500 text-[10px] font-bold text-center bg-white p-4 rounded-xl border border-dashed border-slate-300">Новых заявок на объекты нет</div>';
            } else {
                listEl.innerHTML = requestsHtml;
            }
        } catch (e) {
            console.error(e);
            listEl.innerHTML = '<div class="text-red-500 text-[10px] font-bold text-center">Ошибка загрузки заявок</div>';
        }
    },
        // Применение решения Админа по справочной заявке из ПК СК.
    // ВАЖНО: не закрепляет объект ни за кем, только добавляет/связывает справочник.
    async resolveDirectoryRequest(queueId, rawName, action) {
        if (!queueId || !rawName) return showToast('Некорректная заявка');
        if (action === 'ignore') return showToast('Заявка оставлена в ожидании');

        showToast('Обработка заявки справочника...');

        try {
            const pCode = window.syncConfig?.projectCode || 'RBI';
            const nowIso = new Date().toISOString();

            if (action === 'create') {
                const newKey = this.cleanString(rawName);

                await window.supabaseClient.from('project_objects').upsert({
                    project_code: pCode,
                    canonical_key: newKey,
                    display_name: rawName,
                    synonyms: [],
                    created_by: window.syncConfig?.engineerName || '',
                    updated_at: nowIso,
                    is_deleted: false
                }, {
                    onConflict: 'project_code,canonical_key'
                });

                await window.supabaseClient.from('object_aliases').upsert({
                    project_code: pCode,
                    raw_name: rawName,
                    canonical_key: newKey,
                    updated_at: nowIso
                }, {
                    onConflict: 'project_code,raw_name'
                });

                await window.supabaseClient
                    .from('object_normalization_queue')
                    .update({
                        status: 'linked',
                        suggested_canonical_key: newKey,
                        admin_comment: 'Создан объект в справочнике из заявки ПК СК',
                        updated_at: nowIso
                    })
                    .eq('id', queueId);

                showToast('✅ Объект добавлен в справочник');
            }

            else if (action.startsWith('link_')) {
                const canonicalKey = action.replace('link_', '');

                const { data: objRows } = await window.supabaseClient
                    .from('project_objects')
                    .select('id, synonyms')
                    .eq('project_code', pCode)
                    .eq('canonical_key', canonicalKey)
                    .limit(1);

                if (objRows && objRows.length > 0) {
                    const oldSynonyms = Array.isArray(objRows[0].synonyms) ? objRows[0].synonyms : [];

                    if (!oldSynonyms.includes(rawName)) {
                        await window.supabaseClient.from('project_objects').update({
                            synonyms: [...oldSynonyms, rawName],
                            updated_at: nowIso
                        }).eq('id', objRows[0].id);
                    }
                }

                await window.supabaseClient.from('object_aliases').upsert({
                    project_code: pCode,
                    raw_name: rawName,
                    canonical_key: canonicalKey,
                    updated_at: nowIso
                }, {
                    onConflict: 'project_code,raw_name'
                });

                await window.supabaseClient
                    .from('object_normalization_queue')
                    .update({
                        status: 'linked',
                        suggested_canonical_key: canonicalKey,
                        admin_comment: 'Связано с существующим объектом',
                        updated_at: nowIso
                    })
                    .eq('id', queueId);

                showToast('✅ Объект связан со справочником');
            }

            else if (action === 'reject') {
                await window.supabaseClient
                    .from('object_normalization_queue')
                    .update({
                        status: 'rejected',
                        admin_comment: 'Отклонено администратором',
                        updated_at: nowIso
                    })
                    .eq('id', queueId);

                showToast('❌ Заявка отклонена');
            }

            await this.init();
            this.renderManagerPanel();
            this.loadRequests();

            localStorage.setItem('rbi_cloud_dirty', '1');

        } catch (e) {
            console.error('[ObjectDirectory.resolveDirectoryRequest]', e);
            showToast('❌ Ошибка обработки справочной заявки');
        }
    }, 
    // НОВАЯ ФУНКЦИЯ: Применение решения Админа по заявке
    async resolveRequest(inspectorId, reqIdx, rawName, action) {
        if (action === 'ignore') return showToast('Заявка оставлена в ожидании');

        showToast('Обработка заявки...');
        try {
            const pCode = window.syncConfig?.projectCode || 'RBI';

            // 1. Получаем профиль инженера
            const { data: user, error: fetchErr } = await window.supabaseClient
                .from('rbi_engineer_profiles')
                .select('settings, assigned_projects')
                .eq('inspector_id', inspectorId)
                .single();

            if (fetchErr) throw fetchErr;

            let assigned = user.assigned_projects || [];
            let settings = user.settings || {};
            let reqs = settings.requestedProjects || [];

            // 2. Логика по действиям
            if (action === 'create') {
                const newKey = this.cleanString(rawName);

                // Создаем в общей базе Supabase
                await window.supabaseClient.from('project_objects').upsert({
                    id: 'obj_' + Date.now().toString(36),
                    project_code: pCode,
                    canonical_key: newKey,
                    display_name: rawName,
                    synonyms: [],
                    created_by: window.syncConfig.engineerName,
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });

                if (!assigned.includes(newKey)) assigned.push(newKey);
                showToast('Создан новый объект и выдан доступ!');
            }
            else if (action.startsWith('link_')) {
                const canonicalKey = action.replace('link_', '');
                if (!assigned.includes(canonicalKey)) assigned.push(canonicalKey);

                // Добавляем Синоним к эталонному объекту
                const { data: objRows } = await window.supabaseClient.from('project_objects').select('id, synonyms').eq('project_code', pCode).eq('canonical_key', canonicalKey).limit(1);
                if (objRows && objRows.length > 0) {
                    const oldSynonyms = Array.isArray(objRows[0].synonyms) ? objRows[0].synonyms : [];
                    if (!oldSynonyms.includes(rawName)) {
                        await window.supabaseClient.from('project_objects').update({
                            synonyms: [...oldSynonyms, rawName], updated_at: new Date().toISOString()
                        }).eq('id', objRows[0].id);

                        await window.supabaseClient.from('object_aliases').upsert({
                            project_code: pCode, raw_name: rawName, canonical_key: canonicalKey, updated_at: new Date().toISOString()
                        }, { onConflict: 'project_code,raw_name' });
                    }
                }
                showToast('Объект связан, доступ выдан!');
            }
            else if (action === 'reject') {
                showToast('Заявка отклонена');
            }

            // 3. Удаляем заявку из массива инженера
            reqs.splice(reqIdx, 1);
            settings.requestedProjects = reqs;

            // 4. Сохраняем обновленный профиль инженера в Supabase
            await window.supabaseClient.from('rbi_engineer_profiles').update({
                assigned_projects: assigned,
                settings: settings,
                updated_at: new Date().toISOString()
            }).eq('inspector_id', inspectorId);

            // Обновляем панель
            await this.init(); // Подтягиваем обновления справочника
            this.renderManagerPanel();

        } catch (e) {
            console.error(e);
            showToast('Ошибка обработки заявки');
        }
    },

    // Новое добавление объекта (Инлайн)
    addNewObjectInline() {
        const inputEl = document.getElementById('inline-new-obj-name');
        const name = inputEl ? inputEl.value.trim() : '';
        if (!name) return showToast("⚠️ Введите название объекта!");

        const canonical = this.cleanString(name);
        if (this.objects.find(o => o.canonical_key === canonical)) {
            return showToast("⚠️ Объект с таким названием уже существует!");
        }

        const newObj = {
            id: 'obj_' + Date.now().toString(36),
            canonical_key: canonical,
            display_name: name,
            synonyms: [],
            project_code: window.syncConfig?.projectCode || '',
            created_by: window.appSettings?.engineerName || 'Админ',
            updated_at: new Date().toISOString(),
            _deleted: false
        };

        this.objects.push(newObj);
        if (typeof dbPut === 'function') dbPut('project_objects', newObj);

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');

        showToast("✅ Объект добавлен в Справочник!");
        inputEl.value = ''; // Очищаем поле
        this.renderManagerPanel();
    },

    // Новое добавление синонима (Инлайн)
    async addAliasInline(canonicalKey) {
        const inputEl = document.getElementById(`alias_input_${canonicalKey}`);
        const alias = inputEl ? inputEl.value.trim() : '';
        if (!alias) return showToast("⚠️ Введите текст синонима!");

        // Проверяем, не занят ли синоним
        if (this.aliases[alias]) {
            return showToast("⚠️ Такой синоним уже привязан к другому объекту!");
        }

        this.aliases[alias] = canonicalKey;

        const newAlias = {
            id: 'alias_' + Date.now().toString(36),
            raw_name: alias,
            canonical_key: canonicalKey,
            project_code: window.syncConfig?.projectCode || ''
        };

        if (typeof dbPut === 'function') await dbPut('object_aliases', newAlias);

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');

        showToast("🔗 Синоним привязан!");
        this.renderManagerPanel();
    },

    async deleteObject(id) {
        if (!confirm("Удалить этот объект из Справочника? Это не удалит историю проверок, но сломает авто-определение при импорте новых файлов.")) return;

        const objIndex = this.objects.findIndex(o => o.id === id);
        if (objIndex > -1) {
            const targetObj = this.objects[objIndex];

            // Ставим все флаги "мертв"
            targetObj._deleted = true;
            targetObj.is_deleted = true;
            targetObj.sync_status = 'not_synced';
            targetObj.updated_at = new Date().toISOString();

            try {
                // 1. Сохраняем в локальную БД телефона
                if (typeof dbPut === 'function') await dbPut('project_objects', targetObj);

                // 2. БРОНЕБОЙНО: Мгновенно бьем в облако (Supabase), чтобы он не вернулся при пулле!
                if (navigator.onLine && window.supabaseClient) {
                    await window.supabaseClient.from('project_objects')
                        .update({ is_deleted: true, updated_at: new Date().toISOString() })
                        .eq('id', id);
                }

                // 3. Жестко вырезаем объект из оперативной памяти
                this.objects.splice(objIndex, 1);

                showToast("🗑️ Объект удален");
                this.renderManagerPanel(); // Перерисовываем список на экране

                localStorage.setItem('rbi_cloud_dirty', '1');
            } catch (e) {
                console.error("Ошибка удаления:", e);
                showToast("❌ Ошибка при удалении объекта");
            }
        }
    }
}; // <-- Вот здесь закрывается объект

// Запуск инициализации справочника при старте
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { ObjectDirectory.init(); }, 1000);
});