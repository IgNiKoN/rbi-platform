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

        // Если объекты есть - Создаем кастомный Dropdown
        let displayValue = currentValue;
        const matched = assignedObjects.find(obj => obj.canonical_key === currentValue || obj.display_name === currentValue);
        if (matched) displayValue = matched.display_name;
        if (assignedObjects.length === 1) displayValue = assignedObjects[0].display_name;

        const optionsHtml = assignedObjects.map(obj => {
            return `
            <div class="p-3 text-[12px] font-bold border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-slate-800 dark:text-slate-200"
                onmousedown="
                    const inp = document.getElementById('inp-project');
                    inp.value = '${obj.display_name}';
                    inp.dataset.displayName = '${obj.display_name}';
                    inp.dataset.canonicalKey = '${obj.canonical_key}';
                    document.getElementById('dd_inp-project-custom').classList.add('hidden');
                    if(typeof updateLocationFromStructured === 'function') updateLocationFromStructured();
                    if(typeof updateDataSummary === 'function') updateDataSummary();
                ">
                ${obj.display_name}
            </div>`;
        }).join('');

        // Формируем чистый HTML
        const selectHtml = `
            <input type="text" id="inp-project" 
                class="input-base text-center pr-7 transition-colors cursor-pointer font-bold text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" 
                placeholder="Выберите объект..." autocomplete="off" value="${displayValue}" readonly
                data-display-name="${displayValue}"
                data-canonical-key="${matched ? matched.canonical_key : ''}"
                onmousedown="document.getElementById('dd_inp-project-custom').classList.toggle('hidden')">
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
            </span>
            <div id="dd_inp-project-custom" class="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl mt-1 z-[5000] hidden max-h-48 overflow-y-auto custom-scrollbar text-left">
                ${optionsHtml}
            </div>
        `;

        // ЖЕСТКАЯ ОЧИСТКА: просто заменяем всё содержимое контейнера разом, чтобы не было дублей
        projInputContainer.innerHTML = selectHtml;

        // Если объект только один, блокируем меню выбора
        if (assignedObjects.length === 1) {
            const newInp = document.getElementById('inp-project');
            if (newInp) {
                newInp.classList.add('opacity-80');
                newInp.onmousedown = null; // Отключаем клик
                newInp.dataset.canonicalKey = assignedObjects[0].canonical_key;
                newInp.dataset.displayName = assignedObjects[0].display_name;
            }
        }

        // Вешаем глобальный слушатель клика, чтобы меню закрывалось, если кликнуть мимо
        if (!window._ddProjectListenerAdded) {
            document.addEventListener('mousedown', function _closeDd(e) {
                const dd = document.getElementById('dd_inp-project-custom');
                if (dd && !dd.classList.contains('hidden') && !e.target.closest('#dd_inp-project-custom') && e.target.id !== 'inp-project') {
                    dd.classList.add('hidden');
                }
            });
            window._ddProjectListenerAdded = true;
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

                // Рендерим синонимы
                const aliasTags = objAliases.map(a => `
                    <span class="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-[9px] mr-1 mb-1 inline-flex items-center gap-1">
                        ${a}
                    </span>
                `).join('');

                // Безопасное имя для кнопок (замена кавычек)
                const safeName = String(obj.display_name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

                html += `
                <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl mb-2 shadow-sm group [&_summary::-webkit-details-marker]:hidden">
                    <summary class="p-2 sm:p-3 cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded-xl group-open:rounded-b-none">
                        <div class="flex items-center gap-3 min-w-0 pr-2">
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0 border border-blue-100 dark:border-blue-800 shadow-sm">
                                🏢
                            </div>
                            <div class="min-w-0 flex flex-col justify-center">
                                <div class="font-black text-[11px] sm:text-[12px] text-slate-800 dark:text-white uppercase truncate leading-tight">${obj.display_name}</div>
                                <div class="text-[8px] font-mono text-slate-400 mt-1 truncate">ID: ${obj.canonical_key} | Синонимов: ${objAliases.length}</div>
                            </div>
                        </div>
                        <div class="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </summary>
                    
                    <div class="p-3 bg-[var(--hover-bg)] rounded-b-xl">
                        <div class="bg-[var(--card-bg)] p-2 rounded-lg border border-[var(--card-border)] mb-3 shadow-sm">
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="text-[8px] font-bold text-slate-500 uppercase">Привязанные синонимы:</span>
                                <button onclick="ObjectDirectory.generateObjectSynonymsAI('${obj.canonical_key}', '${safeName}')" class="text-indigo-500 hover:text-indigo-700 font-black flex items-center gap-1 active:scale-95 transition-transform bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-200 text-[8px] uppercase"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> AI-Генерация</button>
                            </div>
                            <div class="flex flex-wrap gap-1 mb-2">${aliasTags || '<span class="text-[9px] italic text-slate-400">Нет синонимов</span>'}</div>
                            
                            <div class="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <input type="text" id="alias_input_${obj.canonical_key}" class="input-base !py-1.5 text-[10px] flex-1 bg-slate-50 dark:bg-slate-900" placeholder="Напр: Ромашка 1 оч">
                                <button onclick="ObjectDirectory.addAliasInline('${obj.canonical_key}')" class="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border border-blue-200 dark:border-blue-800 active:scale-95 transition-transform shrink-0">+ Добавить</button>
                            </div>
                        </div>
                        <button onclick="ObjectDirectory.deleteObject('${obj.id}')" class="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform">Удалить объект</button>
                    </div>
                </details>`;
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

            // 1. Получаем профили (заявки от инженеров на доступ)
            const { data: usersData, error: usersError } = await window.supabaseClient
                .from('rbi_engineer_profiles')
                .select('inspector_id, engineer_name, settings')
                .eq('project_code', pCode);

            if (usersError) throw usersError;

            // 2. Получаем заявки из ПК СК (на добавление в справочник)
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

            // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Формируем опции селекта ДО того, как их используем!
            let allObjsOptions = this.objects.map(o => `<option value="link_${o.canonical_key}">Связать с: ${o.display_name}</option>`).join('');

            // --- РЕНДЕР ЗАЯВОК ИЗ ПК СК ---
            if (Array.isArray(directoryQueue) && directoryQueue.length > 0) {
                requestsHtml += `
                    <div class="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase mb-2 mt-2 flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> 
                        Заявки из ПК СК (Excel)
                    </div>
                    ${directoryQueue.map(q => {
                    const raw = String(q.raw_name || '').replace(/"/g, '&quot;');
                    const qid = String(q.id || '').replace(/"/g, '&quot;');
                    const selectId = 'obj_queue_action_' + qid;
                    return `
                            <div class="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-2">
                                <div class="text-[11px] font-black text-slate-800 dark:text-white mb-1 uppercase truncate">${raw}</div>
                                <div class="text-[8px] text-slate-400 mb-2 font-bold">Автор загрузки: ${q.created_by || 'Система'}</div>
                                <div class="flex flex-col gap-2">
                                    <select id="${selectId}" class="input-base !py-1.5 !text-[10px] font-bold w-full bg-[var(--hover-bg)]">
                                        <option value="create">✨ Создать новый объект</option>
                                        <optgroup label="Связать со справочником:">${allObjsOptions}</optgroup>
                                        <option value="reject">❌ Отклонить</option>
                                    </select>
                                    <button onclick="const action = document.getElementById('${selectId}').value; ObjectDirectory.resolveDirectoryRequest('${qid}', '${raw}', action);" class="bg-indigo-600 text-white py-2 rounded-lg text-[10px] font-black uppercase shadow-sm active:scale-95 transition-transform w-full">Сохранить решение</button>
                                </div>
                            </div>
                        `;
                }).join('')}
                `;
            }

            // --- РЕНДЕР ЗАЯВОК ОТ ИНЖЕНЕРОВ ---
            if (usersData && usersData.length > 0) {
                usersData.forEach(user => {
                    const reqs = user.settings?.requestedProjects || [];
                    if (reqs.length === 0) return;

                    const safeEng = String(user.engineer_name || user.inspector_id).replace(/"/g, '&quot;');

                    requestsHtml += `
                    <div class="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase mb-2 mt-4 flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> 
                        Заявки на доступ: ${safeEng}
                    </div>
                    ${reqs.map((req, idx) => {
                        const raw = String(req.raw_name || '').replace(/"/g, '&quot;');
                        const selectId = 'req_action_' + user.inspector_id + '_' + idx;
                        return `
                            <div class="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--card-border)] shadow-sm mb-2">
                                <div class="text-[11px] font-black text-slate-800 dark:text-white mb-2 uppercase truncate">${raw}</div>
                                <div class="flex gap-2 mb-2">
                                    <button onclick="ObjectDirectory.resolveRequest('${user.inspector_id}', ${idx}, '${raw}', 'create')" class="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-transform">Создать новый</button>
                                    <button onclick="ObjectDirectory.resolveRequest('${user.inspector_id}', ${idx}, '${raw}', 'reject')" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-transform">Отклонить</button>
                                </div>
                                <div class="flex items-center gap-1">
                                    <select id="${selectId}" class="input-base !py-1.5 !text-[9px] font-bold flex-1 bg-[var(--hover-bg)]">
                                        <option value="" disabled selected>Или связать с...</option>
                                        ${allObjsOptions}
                                    </select>
                                    <button onclick="const sel = document.getElementById('${selectId}').value; if(!sel) return showToast('Выберите объект!'); ObjectDirectory.resolveRequest('${user.inspector_id}', ${idx}, '${raw}', sel);" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 shrink-0 transition-transform">Связать</button>
                                </div>
                            </div>
                        `;
                    }).join('')}`;
                });
            }

            if (!requestsHtml) {
                listEl.innerHTML = '<div class="text-slate-500 text-[10px] font-bold text-center bg-[var(--card-bg)] p-4 rounded-xl border border-dashed border-[var(--card-border)]">Новых заявок на объекты нет</div>';
            } else {
                listEl.innerHTML = requestsHtml;
            }

        } catch (e) {
            console.error('[ObjectDirectory] Ошибка loadRequests:', e);
            listEl.innerHTML = '<div class="text-red-500 text-[10px] font-bold text-center">Ошибка загрузки заявок</div>';
        }
    },
    // Применение решения Админа по справочной заявке из ПК СК.
    // ВАЖНО: не закрепляет объект ни за кем, только добавляет/связывает справочник.
    // Применение решения Админа по справочной заявке из ПК СК.
    async resolveDirectoryRequest(queueId, rawName, action) {
        if (!queueId || !rawName) return showToast('Некорректная заявка');
        if (action === 'ignore') return showToast('Заявка оставлена в ожидании');

        showToast('Обработка заявки справочника...');

        try {
            const pCode = window.syncConfig?.projectCode || 'RBI';
            const nowIso = new Date().toISOString();

            if (action === 'create') {
                const newKey = this.cleanString(rawName);

                // 1. Создаем объект ЛОКАЛЬНО
                const newObj = {
                    id: 'obj_' + Date.now().toString(36),
                    project_code: pCode,
                    canonical_key: newKey,
                    display_name: rawName,
                    synonyms: [],
                    created_by: window.syncConfig?.engineerName || '',
                    updated_at: nowIso,
                    is_deleted: false,
                    source: 'local',
                    sync_status: 'not_synced'
                };

                this.objects.push(newObj);
                if (typeof dbPut === 'function') await dbPut('project_objects', newObj);

                // 2. Создаем алиас ЛОКАЛЬНО
                const newAlias = {
                    id: 'alias_' + Date.now().toString(36),
                    project_code: pCode,
                    raw_name: rawName,
                    canonical_key: newKey,
                    updated_at: nowIso,
                    source: 'local',
                    sync_status: 'not_synced'
                };
                this.aliases[rawName] = newKey;
                if (typeof dbPut === 'function') await dbPut('object_aliases', newAlias);

                showToast('✅ Объект добавлен в справочник');
            }
            else if (action.startsWith('link_')) {
                const canonicalKey = action.replace('link_', '');

                // Обновляем синонимы ЛОКАЛЬНО
                const objIndex = this.objects.findIndex(o => o.canonical_key === canonicalKey);
                if (objIndex > -1) {
                    if (!this.objects[objIndex].synonyms) this.objects[objIndex].synonyms = [];
                    if (!this.objects[objIndex].synonyms.includes(rawName)) {
                        this.objects[objIndex].synonyms.push(rawName);
                        this.objects[objIndex].updated_at = nowIso;
                        this.objects[objIndex].sync_status = 'not_synced';
                        if (typeof dbPut === 'function') await dbPut('project_objects', this.objects[objIndex]);
                    }
                }

                // Добавляем алиас ЛОКАЛЬНО
                const newAlias = {
                    id: 'alias_' + Date.now().toString(36),
                    project_code: pCode,
                    raw_name: rawName,
                    canonical_key: canonicalKey,
                    updated_at: nowIso,
                    source: 'local',
                    sync_status: 'not_synced'
                };
                this.aliases[rawName] = canonicalKey;
                if (typeof dbPut === 'function') await dbPut('object_aliases', newAlias);

                showToast('✅ Объект связан со справочником');
            }

            // 3. Обновляем статус самой заявки в облаке (тут прямой запрос допустим, так как таблица простая)
            if (window.supabaseClient) {
                let qStatus = action === 'reject' ? 'rejected' : 'linked';
                await window.supabaseClient.from('object_normalization_queue').update({
                    status: qStatus,
                    admin_comment: action === 'reject' ? 'Отклонено' : 'Обработано',
                    updated_at: nowIso
                }).eq('id', queueId);
            }

            // Перерисовываем интерфейс
            this.renderManagerPanel();
            this.loadRequests();

            // Даем команду синхронизатору выгрузить наши локальные правки
            localStorage.setItem('rbi_cloud_dirty', '1');
            if (typeof triggerSync === 'function') triggerSync('silent');

        } catch (e) {
            console.error('[ObjectDirectory.resolveDirectoryRequest]', e);
            showToast('❌ Ошибка обработки справочной заявки');
        }
    },
    // НОВАЯ ФУНКЦИЯ: Применение решения Админа по заявке
    // НОВАЯ ФУНКЦИЯ: Применение решения Админа по заявке от Инженера
    async resolveRequest(inspectorId, reqIdx, rawName, action) {
        if (action === 'ignore') return showToast('Заявка оставлена в ожидании');

        showToast('Обработка заявки...');
        try {
            const pCode = window.syncConfig?.projectCode || 'RBI';
            const nowIso = new Date().toISOString();

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

                // Создаем ЛОКАЛЬНО
                const newObj = {
                    id: 'obj_' + Date.now().toString(36),
                    project_code: pCode,
                    canonical_key: newKey,
                    display_name: rawName,
                    synonyms: [],
                    created_by: window.syncConfig?.engineerName || '',
                    updated_at: nowIso,
                    is_deleted: false,
                    source: 'local',
                    sync_status: 'not_synced'
                };

                this.objects.push(newObj);
                if (typeof dbPut === 'function') await dbPut('project_objects', newObj);

                if (!assigned.includes(newKey)) assigned.push(newKey);
                showToast('Создан новый объект и выдан доступ!');
            }
            else if (action.startsWith('link_')) {
                const canonicalKey = action.replace('link_', '');
                if (!assigned.includes(canonicalKey)) assigned.push(canonicalKey);

                // Обновляем ЛОКАЛЬНО
                const objIndex = this.objects.findIndex(o => o.canonical_key === canonicalKey);
                if (objIndex > -1) {
                    if (!this.objects[objIndex].synonyms) this.objects[objIndex].synonyms = [];
                    if (!this.objects[objIndex].synonyms.includes(rawName)) {
                        this.objects[objIndex].synonyms.push(rawName);
                        this.objects[objIndex].updated_at = nowIso;
                        this.objects[objIndex].sync_status = 'not_synced';
                        if (typeof dbPut === 'function') await dbPut('project_objects', this.objects[objIndex]);
                    }
                }
                const newAlias = {
                    id: 'alias_' + Date.now().toString(36),
                    project_code: pCode,
                    raw_name: rawName,
                    canonical_key: canonicalKey,
                    updated_at: nowIso,
                    source: 'local',
                    sync_status: 'not_synced'
                };
                this.aliases[rawName] = canonicalKey;
                if (typeof dbPut === 'function') await dbPut('object_aliases', newAlias);

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
                updated_at: nowIso
            }).eq('inspector_id', inspectorId);

            // Обновляем панель
            this.renderManagerPanel();
            this.loadRequests();

            localStorage.setItem('rbi_cloud_dirty', '1');
            if (typeof triggerSync === 'function') triggerSync('silent');

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

    // Новое добавление синонима (Инлайн + Поддержка ИИ)
    async addAliasInline(canonicalKey, predefinedValue = null) {
        const inputEl = document.getElementById(`alias_input_${canonicalKey}`);
        const alias = predefinedValue || (inputEl ? inputEl.value.trim() : '');

        if (!alias) return showToast("⚠️ Введите текст синонима!");

        // Проверяем, не занят ли синоним
        if (this.aliases[alias]) {
            if (!predefinedValue) showToast("⚠️ Такой синоним уже привязан к другому объекту!");
            return;
        }

        if (!predefinedValue) showToast("⏳ Сохранение синонима...");

        try {
            const pCode = window.syncConfig?.projectCode || 'RBI';
            const currentUser = window.syncConfig?.engineerName || 'Админ';
            const nowIso = new Date().toISOString();

            // 1. Обновляем локальные словари
            this.aliases[alias] = canonicalKey;

            const objIndex = this.objects.findIndex(o => o.canonical_key === canonicalKey);
            if (objIndex > -1) {
                if (!this.objects[objIndex].synonyms) this.objects[objIndex].synonyms = [];
                this.objects[objIndex].synonyms.push(alias);
            }

            // 2. Отправляем в Supabase (Обновляем массив синонимов у объекта)
            if (window.supabaseClient) {
                const { data: primaryData } = await window.supabaseClient
                    .from('project_objects')
                    .select('synonyms')
                    .eq('project_code', pCode)
                    .eq('canonical_key', canonicalKey)
                    .single();

                let newSynonyms = Array.isArray(primaryData?.synonyms) ? primaryData.synonyms : [];
                if (!newSynonyms.includes(alias)) newSynonyms.push(alias);

                await window.supabaseClient
                    .from('project_objects')
                    .update({ synonyms: newSynonyms, updated_at: nowIso })
                    .eq('project_code', pCode)
                    .eq('canonical_key', canonicalKey);

                // 3. Создаем запись в таблице алиасов
                await window.supabaseClient.from('object_aliases').upsert({
                    project_code: pCode, raw_name: alias, canonical_key: canonicalKey, created_by: currentUser, created_at: nowIso, updated_at: nowIso
                }, { onConflict: 'project_code,raw_name' });
            }

            // 4. Локальное сохранение
            const newAlias = {
                id: 'alias_' + Date.now().toString(36),
                raw_name: alias,
                canonical_key: canonicalKey,
                project_code: pCode
            };
            if (typeof dbPut === 'function') await dbPut('object_aliases', newAlias);

            // Если это ручной ввод, очищаем инпут и показываем тост
            if (!predefinedValue) {
                if (inputEl) inputEl.value = '';
                showToast("🔗 Синоним привязан!");
                this.renderManagerPanel();
                localStorage.setItem('rbi_cloud_dirty', '1');
                if (typeof triggerSync === 'function') triggerSync('silent');
            }
        } catch (e) {
            console.error('[addAliasInline]', e);
            if (!predefinedValue) showToast("❌ Ошибка при добавлении синонима");
        }
    },

    // ИИ Генерация синонимов для объекта
    // ИИ Генерация синонимов для объекта (Пакетное сохранение)
    async generateObjectSynonymsAI(canonicalKey, displayName) {
        if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в настройках!");

        showToast("🧠 DeepSeek придумывает возможные опечатки...");

        const promptSystem = `Ты — эксперт по строительному документообороту. Твоя задача — сгенерировать 5-6 самых вероятных вариантов, как инженеры могут сократить или написать с опечаткой название строительного объекта (ЖК) "${displayName}" в отчетах. (например, без слова ЖК, сокращенно, слитное написание очередей).
        Верни СТРОГО список через запятую. Никаких других слов, нумерации или приветствий.`;

        try {
            const response = await window.callAI([
                { role: 'system', content: promptSystem },
                { role: 'user', content: `Сгенерируй синонимы для объекта: ${displayName}` }
            ], { temperature: 0.4, max_tokens: 150 });

            const aiSynonyms = response.split(',').map(s => s.trim().replace(/['"«»]/g, '')).filter(Boolean);

            if (aiSynonyms.length === 0) throw new Error("ИИ вернул пустой список");

            showToast(`✨ ИИ придумал ${aiSynonyms.length} синонимов. Сохраняем...`);

            const pCode = window.syncConfig?.projectCode || 'RBI';
            const currentUser = window.syncConfig?.engineerName || 'Админ';
            const nowIso = new Date().toISOString();

            // Получаем объект
            const objIndex = this.objects.findIndex(o => o.canonical_key === canonicalKey);
            if (objIndex > -1) {
                if (!this.objects[objIndex].synonyms) this.objects[objIndex].synonyms = [];
                
                let addedCount = 0;
                for (let syn of aiSynonyms) {
                    if (!this.aliases[syn]) {
                        this.aliases[syn] = canonicalKey;
                        this.objects[objIndex].synonyms.push(syn);

                        // Сохраняем локально
                        const newAlias = { id: 'alias_' + Date.now().toString(36) + Math.random().toString(36).substring(2,5), raw_name: syn, canonical_key: canonicalKey, project_code: pCode };
                        if (typeof dbPut === 'function') await dbPut('object_aliases', newAlias);
                        
                        // Сохраняем в облако
                        if (window.supabaseClient) {
                            await window.supabaseClient.from('object_aliases').upsert({
                                project_code: pCode, raw_name: syn, canonical_key: canonicalKey, created_by: currentUser, created_at: nowIso, updated_at: nowIso
                            }, { onConflict: 'project_code,raw_name' });
                            addedCount++;
                        }
                    }
                }

                // Обновляем массив синонимов самого объекта в облаке
                if (window.supabaseClient && addedCount > 0) {
                    await window.supabaseClient.from('project_objects')
                        .update({ synonyms: this.objects[objIndex].synonyms, updated_at: nowIso })
                        .eq('project_code', pCode).eq('canonical_key', canonicalKey);
                }

                showToast("✅ Синонимы от ИИ успешно привязаны!");
                this.renderManagerPanel();
                localStorage.setItem('rbi_cloud_dirty', '1');
                if (typeof triggerSync === 'function') triggerSync('silent');
            }

        } catch (e) {
            console.error('[generateObjectSynonymsAI]', e);
            showToast("❌ Ошибка ИИ: " + e.message);
        }
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