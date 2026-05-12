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
    async normalizeProjectName(inputRawName) {
        if (!inputRawName) return "Не указан";
        const rawName = inputRawName.trim();

        // 1. Проверяем кэш алиасов
        if (this.aliases[rawName]) {
            const foundObj = this.objects.find(o => o.canonical_key === this.aliases[rawName]);
            if (foundObj) return foundObj.display_name;
        }

        // 2. Ищем 100% совпадение в эталонной базе (или среди сохраненных синонимов)
        const cleanInput = this.cleanString(rawName);
        for (let obj of this.objects) {
            if (this.cleanString(obj.display_name) === cleanInput || 
                this.cleanString(obj.canonical_key) === cleanInput) {
                return obj.display_name;
            }
            if (obj.synonyms && Array.isArray(obj.synonyms)) {
                const isSynonym = obj.synonyms.some(syn => this.cleanString(syn) === cleanInput);
                if (isSynonym) return obj.display_name;
            }
        }

        // 3. Нечеткий поиск (AI-подобие)
        let bestMatch = null;
        let highestScore = 0;

        for (let obj of this.objects) {
            const score = this.getSimilarity(cleanInput, this.cleanString(obj.display_name));
            if (score > highestScore) {
                highestScore = score;
                bestMatch = obj;
            }
        }

        // Если совпадение больше 75% — автоматически привязываем
        if (highestScore > 0.75 && bestMatch) {
            // Сохраняем новый алиас в базу, чтобы больше не считать
            this.aliases[rawName] = bestMatch.canonical_key;
            
            const newAlias = {
                id: 'alias_' + Date.now().toString(36),
                raw_name: rawName,
                canonical_key: bestMatch.canonical_key,
                project_code: window.syncConfig?.projectCode || ''
            };
            if (typeof dbPut === 'function') await dbPut(STORES.OBJECT_ALIASES, newAlias);
            
            // Ставим флаг для отправки в облако
            localStorage.setItem('rbi_cloud_dirty', '1');
            
            return bestMatch.display_name;
        }

        // Если совпадений нет — возвращаем сырое имя
        return rawName;
    },

    getAssignedProjects() {
        if (typeof appSettings === 'undefined' || !appSettings.assignedProjects) return [];
        return appSettings.assignedProjects;
    },

    initUI() {
        const projInputContainer = document.getElementById('inp-project')?.parentElement;
        if (!projInputContainer) return;

        const assigned = this.getAssignedProjects();
        if (assigned.length === 0) return;

        if (document.getElementById('inp-project').tagName.toLowerCase() === 'input') {
            const selectHtml = `
            <select id="inp-project" class="input-base text-center pr-7 transition-colors" onchange="updateLocationFromStructured(); updateDataSummary();">
                <option value="" disabled selected>Выберите объект...</option>
                ${assigned.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>`;
            projInputContainer.innerHTML = selectHtml;
        } else {
            const sel = document.getElementById('inp-project');
            const currVal = sel.value;
            sel.innerHTML = `<option value="" disabled selected>Выберите объект...</option>` + assigned.map(p => `<option value="${p}">${p}</option>`).join('');
            if (assigned.includes(currVal)) sel.value = currVal;
        }

        const sel = document.getElementById('inp-project');
        if (assigned.length === 1) {
            sel.value = assigned[0];
            sel.setAttribute('disabled', 'true');
            sel.classList.add('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500');
        } else {
            sel.removeAttribute('disabled');
            sel.classList.remove('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500');
        }
    },

    // === ПАНЕЛЬ РУКОВОДИТЕЛЯ ===
    renderManagerPanel() {
        const container = document.getElementById('manager-objects-list');
        if (!container) return;

        if (this.objects.length === 0) {
            container.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-300 rounded-xl bg-white">Справочник пуст</div>`;
            return;
        }

        let html = '';
        this.objects.forEach(obj => {
            // Ищем алиасы, привязанные к этому объекту
            const objAliases = Object.keys(this.aliases).filter(k => this.aliases[k] === obj.canonical_key);
            const aliasTags = objAliases.map(a => `<span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 text-[9px] mr-1 mb-1 inline-block">${a}</span>`).join('');

            html += `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm mb-3">
                <div class="flex justify-between items-start mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <div>
                        <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase">${obj.display_name}</div>
                        <div class="text-[9px] font-mono text-slate-400">ID: ${obj.canonical_key}</div>
                    </div>
                    <div class="flex gap-1.5">
                        <button onclick="ObjectDirectory.addAliasPrompt('${obj.canonical_key}')" class="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 active:scale-95 shadow-sm transition-colors">+ Синоним</button>
                        <button onclick="ObjectDirectory.deleteObject('${obj.id}')" class="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 active:scale-95 shadow-sm transition-colors">Удалить</button>
                    </div>
                </div>
                <div>
                    <div class="text-[9px] font-bold text-slate-500 uppercase mb-1">Распознаваемые синонимы (Excel):</div>
                    <div>${aliasTags || '<span class="text-[9px] italic text-slate-400">Нет синонимов</span>'}</div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    },

    openAddObjectModal() {
        const name = prompt("Введите официальное название нового Объекта (например: ЖК 'Легенда'):");
        if (!name) return;
        
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
        dbPut(STORES.PROJECT_OBJECTS, newObj);
        
        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');

        showToast("✅ Объект добавлен в Справочник!");
        this.renderManagerPanel();
    },

    async addAliasPrompt(canonicalKey) {
        const alias = prompt("Введите синоним, который пишут прорабы в Excel (например: 'Легенда 240'):");
        if (!alias) return;

        this.aliases[alias] = canonicalKey;

        const newAlias = {
            id: 'alias_' + Date.now().toString(36),
            raw_name: alias,
            canonical_key: canonicalKey,
            project_code: window.syncConfig?.projectCode || ''
        };

        await dbPut(STORES.OBJECT_ALIASES, newAlias);
        
        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');

        showToast("🔗 Синоним привязан!");
        this.renderManagerPanel();
    },

    async deleteObject(id) {
        if (!confirm("Удалить этот объект из Справочника? Это не удалит историю проверок, но сломает авто-определение при импорте новых файлов.")) return;

        const objIndex = this.objects.findIndex(o => o.id === id);
        if (objIndex > -1) {
            this.objects[objIndex]._deleted = true;
            this.objects[objIndex].updated_at = new Date().toISOString();
            
            await dbPut(STORES.PROJECT_OBJECTS, this.objects[objIndex]);
            
            localStorage.setItem('rbi_cloud_dirty', '1');
            if (typeof triggerSync === 'function') triggerSync('silent');

            this.objects = this.objects.filter(o => !o._deleted);
            showToast("🗑️ Объект удален");
            this.renderManagerPanel();
        }
    }
}; // <-- Вот здесь закрывается объект

// Запуск инициализации справочника при старте
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { ObjectDirectory.init(); }, 1000);
});