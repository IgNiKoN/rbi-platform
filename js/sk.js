/* Файл: js/sk.js (Модуль ПК Стройконтроль) */

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ ===
window.skRecords = [];      // Загруженные замечания
window.skVolumes = {};      // Справочник объемов
window.skMapping = null;    // Сохраненный шаблон маппинга
window.skContractorMap = {};// Словарь алиасов подрядчиков
window.skCategoryMap = {};  // ИИ-Словарь "грязная категория -> чистый вид работ"
let skAiRunning = false; // Защита от параллельного запуска ИИ
const SK_FIELDS = [
    { id: 'number', name: '№ замечания' },
    { id: 'text', name: 'Текст замечания' },
    { id: 'category', name: 'Категория (Вид работ)' },
    { id: 'date_issued', name: 'Дата выдачи' },
    { id: 'contractor', name: 'Ответственная организация' },
    { id: 'deadline', name: 'Требуемый срок' },
    { id: 'status', name: 'Отметка об устранении' },
    { id: 'date_resolved', name: 'Фактическая дата устранения' },
    { id: 'structure', name: 'Элемент структуры (Зона)' },
    { id: 'inspector', name: 'Инженер (Выдал)' } // <--- НОВОЕ ПОЛЕ
];

function updateSkRecordTimestamps(record) {
    if (!record._updatedAt) record._updatedAt = new Date().toISOString();
    if (record._deleted === undefined) record._deleted = false;
    return record;
}
// === 1. ЗАГРУЗКА БАЗЫ ДАННЫХ ===
window.sk_loadData = async function() {
    try {
        const records = await dbGetAll(STORES.SK_RECORDS);
         if (records) window.skRecords = records.filter(r => !r._deleted);

        const volumes = await dbGet(STORES.SETTINGS, 'sk_volumes');
        if (volumes && volumes.data) window.skVolumes = volumes.data;

        const mapping = await dbGet(STORES.SETTINGS, 'sk_mapping');
        if (mapping && mapping.data) window.skMapping = mapping.data;

        const cmap = await dbGet(STORES.SETTINGS, 'sk_contractor_map');
        if (cmap && cmap.data) window.skContractorMap = cmap.data;

        const catMap = await dbGet(STORES.SETTINGS, 'sk_category_map');
        if (catMap && catMap.data) window.skCategoryMap = catMap.data;
    } catch (e) { console.error("Ошибка загрузки данных ПК СК", e); }
};

// === 2. ГЛАВНЫЙ РЕНДЕР ВКЛАДКИ ===
window.skCurrentPeriodFilter = 'ALL'; // Глобальная переменная для фильтра

window.sk_renderMainTab = async function() {
    await sk_loadData();
    const container = document.getElementById('sk-main-container');
    if (!container) return;

    // Вычисляем период загруженных данных
    let minD = null, maxD = null;
    window.skRecords.forEach(r => {
        if(r.date_issued) {
            const d = new Date(r.date_issued);
            if(!minD || d < minD) minD = d;
            if(!maxD || d > maxD) maxD = d;
        }
    });
    const periodStr = (minD && maxD) ? `с ${minD.toLocaleDateString('ru-RU')} по ${maxD.toLocaleDateString('ru-RU')}` : 'Не определен';

    let html = `
        <div class="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] shadow-sm mb-4">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h2 class="text-[14px] font-black uppercase text-slate-800 dark:text-white">Данные ПК Стройконтроль</h2>
                    <p class="text-[10px] text-slate-500 font-bold mt-1">Всего в базе: <b class="text-indigo-600">${window.skRecords.length}</b> позиций</p>
                    <p class="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Загруженный период: ${periodStr}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="sk_clearData()" class="w-10 h-10 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-transform" title="Очистить базу СК">
                        🗑️
                    </button>
                    <button onclick="document.getElementById('sk-excel-input').click()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95 flex items-center gap-2 h-10">
                        📥 Импорт
                    </button>
                </div>
            </div>
            
            <div class="flex items-center gap-2 border-t border-[var(--card-border)] pt-3">
                <span class="text-[9px] font-black uppercase text-slate-400">Фильтр для аналитики:</span>
                <select id="sk-period-filter" class="input-base !py-1 !text-[10px] font-bold flex-1" onchange="window.skCurrentPeriodFilter = this.value; sk_renderDashboard();">
                    <option value="ALL" ${window.skCurrentPeriodFilter === 'ALL' ? 'selected' : ''}>Анализировать всё время</option>
                    <option value="14" ${window.skCurrentPeriodFilter === '14' ? 'selected' : ''}>За последние 14 дней</option>
                    <option value="30" ${window.skCurrentPeriodFilter === '30' ? 'selected' : ''}>За последние 30 дней</option>
                </select>
            </div>
        </div>

        <div class="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
            <button onclick="sk_switchView('dashboard')" id="sk-btn-dashboard" class="shrink-0 px-4 bg-indigo-50 text-indigo-700 border border-indigo-200 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm">📊 Дашборд</button>
            <button onclick="sk_switchView('volumes')" id="sk-btn-volumes" class="shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm">📐 Объемы</button>
            <button onclick="sk_switchView('hr')" id="sk-btn-hr" class="shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm">👤 Инженеры СК</button>
        </div>

        <div id="sk-view-dashboard" class="block"></div>
        <div id="sk-view-volumes" class="hidden"></div>
        <div id="sk-view-hr" class="hidden"></div>
    `;

    container.innerHTML = html;
    sk_renderVolumes(); 
    sk_renderDashboard(); 
};

// Функция очистки данных Стройконтроля
window.sk_clearData = async function() {
    if (!confirm("Удалить ВСЕ загруженные замечания Стройконтроля? (Справочник объемов и настройки колонок сохранятся)")) return;
    
    for (let rec of window.skRecords) {
        rec._deleted = true;
        rec._updatedAt = new Date().toISOString();
        await dbPut(STORES.SK_RECORDS, rec);
    }
    window.skRecords = [];
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    showToast("🗑️ База Стройконтроля помечена на удаление. Синхронизируйтесь, чтобы очистить у команды.");
    sk_renderMainTab();
};

window.sk_switchView = function(view) {
    document.getElementById('sk-view-dashboard').classList.add('hidden');
    document.getElementById('sk-view-volumes').classList.add('hidden');
    document.getElementById('sk-view-hr').classList.add('hidden');
    
    const defaultBtnClass = "shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm";
    const activeBtnClass = "shrink-0 px-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm";

    document.getElementById('sk-btn-dashboard').className = defaultBtnClass;
    document.getElementById('sk-btn-volumes').className = defaultBtnClass;
    document.getElementById('sk-btn-hr').className = defaultBtnClass;

    document.getElementById(`sk-view-${view}`).classList.remove('hidden');
    document.getElementById(`sk-btn-${view}`).className = activeBtnClass;

    // Если открыли инженеров — рендерим их
    if (view === 'hr') sk_renderHrTab();
};

// === 3. СПРАВОЧНИК ОБЪЕМОВ ===
window.sk_renderVolumes = function() {
    const container = document.getElementById('sk-view-volumes');
    if (!container) return;

    let rowsHtml = '';
    for (let workType in window.skVolumes) {
        let v = window.skVolumes[workType];
        rowsHtml += `
            <div class="flex items-center gap-2 mb-2 bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                <div class="flex-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">${workType}</div>
                <div class="w-16 text-center text-[10px] font-black bg-[var(--card-bg)] border border-[var(--card-border)] py-1 rounded shadow-inner">${v.amount} ${v.unit}</div>
                <button onclick="sk_deleteVolume('${workType}')" class="text-red-500 bg-red-50 border border-red-200 p-1.5 rounded active:scale-90">✕</button>
            </div>
        `;
    }

    if (!rowsHtml) rowsHtml = `<div class="text-[10px] text-slate-400 text-center py-4 uppercase font-bold">Справочник пуст. Укажите объемы, чтобы система рассчитывала ИСД.</div>`;

    container.innerHTML = `
        <div class="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--card-border)] shadow-sm">
            <h3 class="text-[12px] font-black uppercase mb-3 text-slate-800 dark:text-white border-b border-[var(--card-border)] pb-2">Добавить объем</h3>
            <div class="space-y-3 mb-4">
                <input type="text" id="sk-vol-name" class="input-base text-[11px]" placeholder="Вид работ (например: Окна ПВХ)">
                <div class="flex gap-2">
                    <input type="number" id="sk-vol-amount" class="input-base text-[11px] flex-1" placeholder="Кол-во (напр: 280)">
                    <input type="text" id="sk-vol-unit" class="input-base text-[11px] w-20 text-center" placeholder="Ед. (шт)">
                </div>
                <button onclick="sk_addVolume()" class="w-full bg-green-50 text-green-700 border border-green-200 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 shadow-sm transition-transform">Сохранить</button>
            </div>
            <h3 class="text-[12px] font-black uppercase mb-3 text-slate-800 dark:text-white border-b border-[var(--card-border)] pb-2 mt-4">Текущий справочник</h3>
            <div>${rowsHtml}</div>
        </div>
    `;
};

window.sk_addVolume = async function() {
    const nameInput = document.getElementById('sk-vol-name');
    const amountInput = document.getElementById('sk-vol-amount');
    const unitInput = document.getElementById('sk-vol-unit');

    const name = nameInput.value.trim();
    // Убираем пробелы из числа (если юзер ввел "1 000") и парсим
    const amount = parseFloat(amountInput.value.replace(/\s/g, '')); 
    const unit = unitInput.value.trim();

    if (!name) return showToast("⚠️ Укажите вид работ!");
    if (isNaN(amount) || amount <= 0) return showToast("⚠️ Укажите корректное количество (число)!");
    if (!unit) return showToast("⚠️ Укажите единицу измерения!");

    window.skVolumes[name] = { amount, unit };
    await dbPut(STORES.SETTINGS, { key: 'sk_volumes', data: window.skVolumes });
    
    // Очищаем поля после успешного добавления
    nameInput.value = ''; amountInput.value = ''; unitInput.value = '';
    
    showToast("✅ Объем добавлен в справочник!");
    sk_renderVolumes();
    sk_renderDashboard();
};

window.sk_deleteVolume = async function(name) {
    delete window.skVolumes[name];
    await dbPut(STORES.SETTINGS, { key: 'sk_volumes', data: window.skVolumes });
    sk_renderVolumes();
    sk_renderDashboard();
};

// === 5. ИМПОРТ EXCEL (Чтение файла) ===
window.sk_handleExcelImport = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("⚙️ Читаем Excel файл...");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rows.length < 2) throw new Error("Файл пуст или не содержит данных");

            const headers = rows[0].map(h => h ? h.toString().trim() : '');
            
            window.skTempRawHeaders = headers;
            window.skTempRawRows = rows;
            
            sk_showMappingModal(headers, rows[1] || []);

        } catch (err) {
            console.error(err);
            alert("Ошибка чтения Excel: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; 
};

// === 6. МОДАЛКА МАППИНГА КОЛОНОК (С ИИ) ===
window.sk_showMappingModal = function(fileHeaders, sampleRow) {
    const modal = document.getElementById('modal-overlay');
    
    // Базовая эвристика (если ИИ отключен)
    const heuristics = {
        'number': ['замечания', 'номер', 'id', '№'],
        'text': ['замечание', 'текст', 'описание', 'дефект', 'нарушение'],
        'category': ['категория', 'вид работ', 'тип работ', 'раздел'],
        'date_issued': ['дата выдачи', 'выдано', 'создано', 'дата создания'],
        'contractor': ['ответственная организация', 'подрядчик', 'исполнитель', 'организация'],
        'deadline': ['требуемый срок', 'срок устранения', 'дедлайн', 'срок'],
        'status': ['отметка об устранении', 'статус', 'состояние'],
        'date_resolved': ['фактическая дата', 'дата устранения', 'устранено'],
        'structure': ['элемент структуры', 'зона', 'место', 'расположение'],
        'inspector': ['инспектор', 'инженер', 'выдал', 'автор', 'представитель'] // <--- НОВОЕ
    };

    let mappingHtml = SK_FIELDS.map(field => {
        let bestMatchIdx = -1;
        if (window.skMapping && window.skMapping[field.id] !== undefined) {
            bestMatchIdx = window.skMapping[field.id];
        } else {
            const keywords = heuristics[field.id] || [];
            bestMatchIdx = fileHeaders.findIndex(h => keywords.some(kw => h.toLowerCase().includes(kw)));
        }

        let options = '<option value="-1">-- Пропустить (Не загружать) --</option>';
        fileHeaders.forEach((h, idx) => {
            if (!h) return;
            const sampleText = sampleRow[idx] ? ` (напр: ${String(sampleRow[idx]).substring(0,15)})` : '';
            const selected = (idx === bestMatchIdx) ? 'selected' : '';
            options += `<option value="${idx}" ${selected}>${h}${sampleText}</option>`;
        });

        return `
            <div class="mb-3 bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] shadow-sm">
                <div class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1">${field.name}</div>
                <select class="sk-mapping-select input-base !py-1.5 text-[11px]" data-field="${field.id}">
                    ${options}
                </select>
            </div>
        `;
    }).join('');

    document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2 border border-indigo-200">🔗</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Связь колонок</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[10px] text-slate-500 mb-2 leading-relaxed">
            Система угадала назначение колонок. Проверьте правильность и нажмите "Загрузить".
        </div>
        <button onclick="sk_aiMapColumns()" id="btn-ai-mapping" class="w-full bg-slate-100 text-indigo-600 border border-indigo-200 py-2 rounded-lg font-bold text-[10px] uppercase mb-4 active:scale-95 transition-colors flex justify-center items-center gap-1.5">
            🤖 Угадать через ИИ (DeepSeek)
        </button>
        <div class="max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 mb-4">
            ${mappingHtml}
        </div>
        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 transition-colors border border-[var(--card-border)]">Отмена</button>
            <button onclick="sk_executeImport()" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex justify-center items-center gap-2">
                ▶ Загрузить
            </button>
        </div>
    `;

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

// === 7. AI-МАППИНГ КОЛОНОК ===
window.sk_aiMapColumns = async function() {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");
    
    const btn = document.getElementById('btn-ai-mapping');
    btn.innerHTML = `<span class="animate-pulse">⏳ ИИ думает...</span>`;
    btn.disabled = true;

    const headersList = window.skTempRawHeaders.map((h, i) => `${i}: "${h}"`).join(', ');
    
    const promptSystem = `Ты помощник интеграции данных. Тебе даны заголовки Excel-файла (с их индексами). Твоя задача — сопоставить их с системными полями: number, text, category, date_issued, contractor, deadline, status, date_resolved, structure.
    Верни СТРОГО JSON-объект, где ключ - это системное поле, а значение - индекс (число) колонки из Excel. Если колонки нет, верни -1. Без лишнего текста и комментариев.`;
    
    try {
        // Используем глобальную функцию callAI (которая у нас уже есть в ai.js)
        const res = await window.callAI([{role: 'system', content: promptSystem}, {role: 'user', content: headersList}], {temperature: 0.1, max_tokens: 300});
        
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const aiMap = JSON.parse(jsonMatch[0]);
            Object.keys(aiMap).forEach(key => {
                const select = document.querySelector(`.sk-mapping-select[data-field="${key}"]`);
                if (select) select.value = aiMap[key];
            });
            showToast("✨ ИИ успешно распознал колонки!");
        }
    } catch(e) {
        showToast("❌ Ошибка ИИ: " + e.message);
    } finally {
        btn.innerHTML = `🤖 Угадать через ИИ (DeepSeek)`;
        btn.disabled = false;
    }
};

// === 8. ПАРСЕР ДАТ ИЗ EXCEL (ИСПРАВЛЕНИЕ БАГА С ПРОСРОЧКАМИ) ===
// === 8. ПАРСЕР ДАТ ИЗ EXCEL (С ПОДДЕРЖКОЙ DD.MM.YYYY) ===
function sk_parseExcelDate(val) {
    if (val === undefined || val === null || val === '') return null;
    
    if (typeof val === 'number') {
        return new Date((val - 25569) * 86400 * 1000).toISOString();
    } 
    
    if (typeof val === 'string') {
        const cleanVal = val.trim();
        // Проверка формата DD.MM.YYYY или DD/MM/YYYY
        const parts = cleanVal.split(/[.,/ -]/);
        if (parts.length === 3) {
            let day = parts[0].padStart(2, '0');
            let month = parts[1].padStart(2, '0');
            let year = parts[2];
            if (year.length === 2) year = "20" + year;
            
            // ISO формат: YYYY-MM-DD
            const isoString = `${year}-${month}-${day}T12:00:00Z`;
            const d = new Date(isoString);
            return isNaN(d.getTime()) ? null : d.toISOString();
        }
        const d = new Date(cleanVal);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
}

// === 9. НОРМАЛИЗАЦИЯ ИМЕН ПОДРЯДЧИКОВ (АЛИАСЫ) ===
function sk_cleanContractorName(name) {
    if (!name) return 'Неизвестно';
    let clean = name.toLowerCase();
    // Удаляем орг. формы и кавычки
    clean = clean.replace(/\b(ооо|ао|зао|пао|ип|ск|ук|гк)\b/gi, '');
    clean = clean.replace(/["'«»]/g, '');
    // Оставляем только буквы, цифры и пробелы
    clean = clean.replace(/[^a-zа-яё0-9\s]/gi, '').trim().replace(/\s+/g, ' ');
    // Делаем первую букву заглавной
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Алгоритм нечеткого сравнения строк (Расстояние Левенштейна)
function sk_similarity(s1, s2) {
    if (!s1 || !s2) return 0;
    let longer = s1.toLowerCase(); let shorter = s2.toLowerCase();
    if (s1.length < s2.length) { longer = s2.toLowerCase(); shorter = s1.toLowerCase(); }
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
}

// === 10. ЗАПУСК ИМПОРТА И ПОИСК СХОДСТВ ===
window.sk_executeImport = async function() {
    // Сохраняем маппинг колонок
    const currentMapping = {};
    document.querySelectorAll('.sk-mapping-select').forEach(select => {
        currentMapping[select.dataset.field] = parseInt(select.value);
    });
    window.skMapping = currentMapping;
    await dbPut(STORES.SETTINGS, { key: 'sk_mapping', data: currentMapping });

    const rows = window.skTempRawRows;
    const contrIdx = currentMapping['contractor'];
    
    // 1. Вытаскиваем всех уникальных подрядчиков из загружаемого файла
    const rawContractorsInFile = new Set();
    for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][contrIdx]) rawContractorsInFile.add(String(rows[i][contrIdx]).trim());
    }

    // 2. Получаем эталонные имена подрядчиков из базы RBI
    const rbiContractors = [...new Set(contractorArray.map(c => c.contractorName))].filter(Boolean);

    // 3. Ищем сходства
    const pairsToConfirm = []; // То, что покажем инженеру
    window.skTempContractorMatches = {}; // Сюда сложим 100% совпадения

    rawContractorsInFile.forEach(rawName => {
        const cleanName = sk_cleanContractorName(rawName);
        
        // Если уже есть в словаре алиасов - берем без вопросов
        if (window.skContractorMap[rawName]) {
            window.skTempContractorMatches[rawName] = window.skContractorMap[rawName];
            return;
        }

        // Ищем лучшее совпадение в базе RBI
        let bestMatch = null;
        let highestScore = 0;

        rbiContractors.forEach(rbiName => {
            const cleanRbi = sk_cleanContractorName(rbiName);
            const score = sk_similarity(cleanName, cleanRbi);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = rbiName;
            }
        });

        // Порог > 85% = автослияние
        if (highestScore >= 0.85) {
            window.skTempContractorMatches[rawName] = bestMatch;
            window.skContractorMap[rawName] = bestMatch; // Запоминаем на будущее
        } 
        // Порог 60-85% = спрашиваем юзера
        else if (highestScore >= 0.60 && highestScore < 0.85) {
            pairsToConfirm.push({ raw: rawName, target: bestMatch, score: Math.round(highestScore * 100) });
        } 
        // Меньше 60% = считаем, что это новый подрядчик
        else {
            window.skTempContractorMatches[rawName] = rawName; 
        }
    });

    // 4. Если есть "серые зоны", показываем модалку подтверждения
    if (pairsToConfirm.length > 0) {
        window.skTempPairsToConfirm = pairsToConfirm;
        sk_showNormalizationModal();
    } else {
        // Если все понятно, сразу грузим
        sk_finalizeImport();
    }
};

// === 11. МОДАЛКА РУЧНОГО ПОДТВЕРЖДЕНИЯ АЛИАСОВ ===
window.sk_showNormalizationModal = function() {
    const modal = document.getElementById('modal-overlay');
    
    let pairsHtml = window.skTempPairsToConfirm.map((pair, idx) => `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-sm mb-3" id="norm-pair-${idx}">
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-2 text-center">Сходство: ${pair.score}%</div>
            <div class="flex justify-between items-center gap-2 mb-3">
                <div class="flex-1 bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-200 text-center">
                    <div class="text-[8px] uppercase text-red-500 font-bold mb-0.5">Новое из Excel:</div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white leading-tight">${pair.raw}</div>
                </div>
                <div class="text-slate-400">➡️</div>
                <div class="flex-1 bg-green-50 dark:bg-green-900/10 p-2 rounded border border-green-200 text-center">
                    <div class="text-[8px] uppercase text-green-600 font-bold mb-0.5">В базе RBI:</div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white leading-tight">${pair.target}</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="sk_resolvePair(${idx}, false)" class="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 border border-slate-200">❌ Разные</button>
                <button onclick="sk_resolvePair(${idx}, true)" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 shadow-sm">✅ Объединить</button>
            </div>
        </div>
    `).join('');

    document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2 border border-orange-200">🤝</div>`;
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Одинаковые организации?</div>`;
    document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[10px] text-slate-500 mb-4 leading-relaxed">
            Система нашла похожие названия компаний. Подтвердите, чтобы в отчетах они не разваливались на две разные строки.
        </div>
        <div class="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 mb-4" id="norm-pairs-container">
            ${pairsHtml}
        </div>
    `;

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

window.sk_resolvePair = function(idx, isMatch) {
    const pair = window.skTempPairsToConfirm[idx];
    if (isMatch) {
        window.skTempContractorMatches[pair.raw] = pair.target;
        window.skContractorMap[pair.raw] = pair.target; // Сохраняем в словарь
    } else {
        window.skTempContractorMatches[pair.raw] = pair.raw; // Оставляем как есть
    }

    // Скрываем плашку
    document.getElementById(`norm-pair-${idx}`).style.display = 'none';

    // Проверяем, остались ли еще неподтвержденные
    const container = document.getElementById('norm-pairs-container');
    const remaining = container.querySelectorAll('div[id^="norm-pair-"]:not([style*="display: none"])');
    
    if (remaining.length === 0) {
        closeModal();
        sk_finalizeImport(); // Переходим к сохранению
    }
};

// === 12. ФИНАЛЬНОЕ СОХРАНЕНИЕ ДАННЫХ В БД ===
window.sk_finalizeImport = async function() {
    showToast("⏳ Сохраняем данные в базу...");
    
    await dbPut(STORES.SETTINGS, { key: 'sk_contractor_map', data: window.skContractorMap });

    const rows = window.skTempRawRows;
    let newRecordsCount = 0;
    let updatedRecordsCount = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const getVal = (field) => {
            const idx = window.skMapping[field];
            if (idx === -1 || idx === undefined || row[idx] === undefined) return '';
            if ((field.includes('date') || field === 'deadline') && typeof row[idx] === 'number') {
                return new Date((row[idx] - 25569) * 86400 * 1000).toISOString();
            }
            return row[idx];
        };

        const number = getVal('number');
        if (!number) continue;

        const rawContractor = getVal('contractor') ? String(getVal('contractor')).trim() : 'Неизвестно';
        const cleanContractor = window.skTempContractorMatches[rawContractor] || rawContractor;

        const record = {
            id: 'sk_' + number,
            number: number,
            text: getVal('text') ? String(getVal('text')).trim() : '',
            category: getVal('category') ? String(getVal('category')).trim() : 'Без категории',
            date_issued: sk_parseExcelDate(getVal('date_issued')),
            contractor: cleanContractor,
            raw_contractor: rawContractor,
            inspector: getVal('inspector') ? String(getVal('inspector')).trim() : 'Неизвестно',
            deadline: sk_parseExcelDate(getVal('deadline')),
            status: getVal('status') ? String(getVal('status')).trim() : '',
            date_resolved: sk_parseExcelDate(getVal('date_resolved')),
            structure: getVal('structure') ? String(getVal('structure')).trim() : '',
            updated_at: new Date().toISOString(),
            // НОВЫЕ ПОЛЯ ДЛЯ ВЕРСИОНИРОВАНИЯ
            _updatedAt: new Date().toISOString(),
            _deleted: false
        };

        const existingIdx = window.skRecords.findIndex(r => r.id === record.id);
        if (existingIdx !== -1) {
            const existing = window.skRecords[existingIdx];
            const existingTime = existing._updatedAt ? new Date(existing._updatedAt).getTime() : 0;
            const newTime = new Date(record._updatedAt).getTime();
            if (newTime > existingTime) {
                window.skRecords[existingIdx] = record;
                updatedRecordsCount++;
            } else {
                // локальная версия новее – пропускаем
                continue;
            }
        } else {
            window.skRecords.push(record);
            newRecordsCount++;
        }
        
        await dbPut(STORES.SK_RECORDS, record);
    }

    const importLog = { id: 'imp_' + Date.now(), date: new Date().toISOString(), added: newRecordsCount, updated: updatedRecordsCount };
    await dbPut(STORES.SK_IMPORTS, importLog);

    // Геймификация: Начисляем очки за своевременную сверку!
    if (typeof gameLogAction === 'function') gameLogAction('sk_import_done', importLog.id);

         showToast(`✅ Импорт завершен! Добавлено: ${newRecordsCount}, Обновлено: ${updatedRecordsCount}.`);
    
    // Запускаем синхронизацию сразу, не дожидаясь ИИ
    if (typeof triggerSync === 'function' && window.isSyncEnabled && window.isSyncEnabled()) {
        localStorage.setItem('rbi_cloud_dirty', '1');
        setTimeout(() => triggerSync('manual'), 500);
    }
    
    // Запускаем ИИ в фоне (без await) – только если ещё не запущен
    if (typeof sk_autoMapCategories === 'function' && !skAiRunning) {
        skAiRunning = true;
        sk_autoMapCategories(false).finally(() => {
            skAiRunning = false;
            // После обработки ИИ – снова помечаем dirty и тихо синхронизируем, чтобы подтянуть категории в облако
            if (typeof triggerSync === 'function' && window.isSyncEnabled && window.isSyncEnabled()) {
                localStorage.setItem('rbi_cloud_dirty', '1');
                setTimeout(() => triggerSync('silent'), 1000);
            }
        });
    }

    closeModal();
    sk_renderDashboard();
    // Убедитесь, что внизу нет повторного вызова sk_autoMapCategories()

};

// === 13. ИИ АВТО-МАППИНГ КАТЕГОРИЙ ПО ТЕКСТУ ЗАМЕЧАНИЯ ===
window.sk_autoMapCategories = async function(silent = false) {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) {
        if (!silent) showToast("⚠️ Включите AI для авто-распределения категорий!");
        return 0;
    }

    if (!silent && !skAiRunning) showToast("🤖 ИИ в фоне обрабатывает категории...");

    const allowedCleanCats = [];
    if (typeof SYSTEM_TEMPLATES !== 'undefined') {
        Object.keys(SYSTEM_TEMPLATES).forEach(k => allowedCleanCats.push(SYSTEM_TEMPLATES[k].title));
    }
    if (typeof userTemplates !== 'undefined') {
        Object.keys(userTemplates).forEach(k => allowedCleanCats.push(userTemplates[k].title));
    }
    if (allowedCleanCats.length === 0) allowedCleanCats.push("Общестроительные работы");

    const recordsToFix = window.skRecords.filter(r => 
        !r.category || 
        r.category === 'Без категории' || 
        r.category.trim() === '' || 
        /^\d+$/.test(r.category)
    );
    
    const uniqueTexts = [...new Set(recordsToFix.map(r => r.text).filter(t => t && t.length > 5))];
    
    if (uniqueTexts.length === 0) {
        if (!silent) showToast("✅ Все замечания уже распределены по категориям.");
        return 0;
    }

    const BATCH_SIZE = 50;
    let totalUpdated = 0;
    let currentIndex = 0;
    const totalBatches = Math.ceil(uniqueTexts.length / BATCH_SIZE);

    for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
        const batch = uniqueTexts.slice(currentIndex, currentIndex + BATCH_SIZE);
        const batchStr = batch.map((t, idx) => `${idx}: "${t.substring(0, 200)}"`).join('\n');
        
        const promptSystem = `Ты — инженер стройконтроля. Прочитай тексты дефектов.
Верни ТОЛЬКО JSON-объект: ключ - индекс (0..${batch.length-1}), значение - один из видов работ: [${allowedCleanCats.join(', ')}].
Если не уверен, верни "Без категории". Без пояснений.`;

        try {
            const res = await window.callAI([
                { role: 'system', content: promptSystem },
                { role: 'user', content: batchStr }
            ], { temperature: 0.1, max_tokens: 2000 });
            
            const jsonMatch = res.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiMap = JSON.parse(jsonMatch[0]);
                let updatedInBatch = 0;
                for (let i = 0; i < batch.length; i++) {
                    const cleanVal = aiMap[i] || aiMap[String(i)];
                    if (cleanVal && cleanVal !== 'Без категории' && allowedCleanCats.includes(cleanVal)) {
                        const targetRecords = window.skRecords.filter(r => r.text === batch[i]);
                        for (let rec of targetRecords) {
                            rec.category = cleanVal;
                            rec._updatedAt = new Date().toISOString();
                            await dbPut(STORES.SK_RECORDS, rec);
                            updatedInBatch++;
                        }
                    }
                }
                totalUpdated += updatedInBatch;
            }
        } catch (e) {
            console.warn("Ошибка ИИ в пакете", batchNum, e);
            if (!silent) showToast(`⚠️ Ошибка в пакете ${batchNum}`);
        }
        
        currentIndex += BATCH_SIZE;
        if (currentIndex < uniqueTexts.length) await new Promise(r => setTimeout(r, 500));
    }

    if (!silent && totalUpdated > 0) {
        showToast(`✨ ИИ обработал ${totalUpdated} записей (в фоне)`);
    }
    return totalUpdated;
};


// === 6. РЕНДЕР ДАШБОРДА (СМАРТ-МАТРИЦА ИСД И ЕДИНАЯ ЗАДАЧА) ===
window.sk_renderDashboard = function() {
    const container = document.getElementById('sk-view-dashboard');
    if (!container) return;

    if (window.skRecords.length === 0) {
        container.innerHTML = `<div class="text-center py-10 bg-[var(--card-bg)] rounded-xl border border-dashed border-slate-300 text-slate-400 text-[11px] font-bold uppercase tracking-widest shadow-sm">Нет данных. Загрузите файл Excel.</div>`;
        return;
    }

    // --- 0. ПРИМЕНЕНИЕ ФИЛЬТРОВ ---
    let activeRecords = window.skRecords;
    if (window.skCurrentPeriodFilter !== 'ALL') {
        const days = parseInt(window.skCurrentPeriodFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDate.setHours(0,0,0,0);

        activeRecords = activeRecords.filter(r => {
            const isIssuedRecently = r.date_issued && new Date(r.date_issued) >= cutoffDate;
            const isResolvedRecently = r.date_resolved && new Date(r.date_resolved) >= cutoffDate;
            const isOpen = r.status && r.status.toLowerCase().includes('не устран');
            return isIssuedRecently || isResolvedRecently || isOpen;
        });
    }

    if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics && activeMultiFilters.analytics.contractor.length > 0) {
        const allowedContrs = activeMultiFilters.analytics.contractor.map(c => c.toLowerCase());
        activeRecords = activeRecords.filter(r => allowedContrs.includes(r.contractor.toLowerCase()));
    }

    if (activeRecords.length === 0) {
        container.innerHTML = `<div class="text-center py-10 bg-[var(--card-bg)] rounded-xl border border-dashed border-slate-300 text-slate-400 text-[11px] font-bold uppercase tracking-widest shadow-sm">За выбранный период и фильтрам замечаний нет.</div>`;
        return;
    }

    const rbiContractors = [...new Set(contractorArray.map(c => c.contractorName.toLowerCase().trim()))];

    const getRbiDefectRate = (contractor, cleanCategory) => {
        const relevantChecks = contractorArray.filter(c => 
            c.contractorName === contractor && 
            c.templateTitle === cleanCategory
        );
        if (relevantChecks.length === 0) return 0.05; 

        let totalItemsChecked = 0; let totalDefectsFound = 0;
        relevantChecks.forEach(c => {
            if (c.metrics) {
                totalItemsChecked += c.metrics.checkedCount || 10;
                totalDefectsFound += (c.metrics.n_B2_fail + c.metrics.n_B3_fail);
            }
        });
        if (totalItemsChecked === 0) return 0.05;
        return totalDefectsFound / totalItemsChecked;
    };

    const contrMap = {};
    const matrixMap = {}; 
    let totalIssues = 0;
    let totalOpen = 0;
    
    // Сюда будем собирать проблемы ТОЛЬКО для связанных подрядчиков
    let skIssues = { isd: [], open: [], cmi: [] };

    // Определяем, открыто ли замечание (Учитываем статусы из реального Excel)
    const isIssueOpen = (record) => {
        if (record.date_resolved) return false; // Если есть дата фактического устранения - точно закрыто
        if (!record.status) return true; // Если статус пустой - открыто
        const s = record.status.toLowerCase().trim();
        // В ПК СК закрытые статусы обычно: "проверено", "устранено", "закрыто", "снято"
        if (s === 'проверено' || s === 'устранено' || s === 'закрыто' || s === 'снято') return false;
        return true;
    };

    activeRecords.forEach(r => {
        const c = r.contractor;
        totalIssues++;
        
        const isOpen = isIssueOpen(r);
        if (isOpen) totalOpen++;

        const rawCats = r.category ? r.category.split(',').map(s => s.trim()).filter(Boolean) : ['Без категории'];
        rawCats.forEach(raw => {
            let strippedRaw = raw.replace(/^\d+[\.,]\s*/, '').trim();
            let cleanCat = window.skCategoryMap[strippedRaw] || strippedRaw;
            if (cleanCat.trim() === '') cleanCat = 'Без категории';

            const matrixKey = `${c}_||_${cleanCat}`;
            if (!matrixMap[matrixKey]) matrixMap[matrixKey] = { contractor: c, category: cleanCat, total: 0, open: 0 };
            
            matrixMap[matrixKey].total++;
            if (isOpen) matrixMap[matrixKey].open++;
        });

        if (!contrMap[c]) contrMap[c] = { total: 0, open: 0, overdueCount: 0, closingTimes: [], defects: {}, overdueDaysArr: [], closedCount: 0, closedOnTimeCount: 0 };
        const data = contrMap[c];
        data.total++;
        if (isOpen) data.open++;

        if (r.text) {
            let cleanText = r.text.toLowerCase().trim();
            cleanText = cleanText.replace(/(в осях|оси|отм\.|на отметке|кв\.|квартира)[\s\dа-яa-z\.\-\,\+]+/g, '');
            cleanText = cleanText.replace(/\d+[\.,]\d+[\.,]\d+/g, '').replace(/\d+/g, '');
            cleanText = cleanText.replace(/согласно ппр|согласно рд|по проекту|нарушение/g, '').trim();
            if (cleanText.length < 5) cleanText = r.text.substring(0, 40); 
            cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1, 50) + (cleanText.length > 50 ? '...' : '');
            data.defects[cleanText] = (data.defects[cleanText] || 0) + 1;
        }

        const issued = r.date_issued ? new Date(r.date_issued) : null;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        const resolved = r.date_resolved ? new Date(r.date_resolved) : null;
        const now = new Date();

        if (resolved && !isOpen) data.closedCount++;
        if (deadline) {
            if (isOpen && now > deadline) {
                data.overdueCount++;
                data.overdueDaysArr.push(Math.floor((now - deadline) / (1000 * 60 * 60 * 24)));
            } else if (!isOpen && resolved) {
                if (resolved > deadline) {
                    data.overdueCount++;
                    data.overdueDaysArr.push(Math.floor((resolved - deadline) / (1000 * 60 * 60 * 24)));
                } else {
                    data.closedOnTimeCount++; 
                }
            }
        }
        if (!isOpen && issued && resolved) {
            const daysToClose = Math.ceil((resolved - issued) / (1000 * 60 * 60 * 24));
            if (daysToClose >= 0) data.closingTimes.push(daysToClose);
        }
    });

    // --- РЕНДЕР МАТРИЦЫ ИСД (УМНАЯ ГРУППИРОВКА) ---
    let matrixRows = '';
    
    // Группируем данные матрицы по подрядчикам для красивого вывода
    const matrixByContr = {};
    Object.keys(matrixMap).forEach(key => {
        const mData = matrixMap[key];
        if (!matrixByContr[mData.contractor]) matrixByContr[mData.contractor] = [];
        matrixByContr[mData.contractor].push(mData);
    });

    const sortedMatrixContrs = Object.keys(matrixByContr).sort();

    sortedMatrixContrs.forEach(contrName => {
        matrixRows += `
            <tr class="bg-[var(--hover-bg)] border-b border-t border-[var(--card-border)]">
                <td colspan="5" class="p-2 pl-3 text-[11px] font-black text-slate-800 dark:text-white uppercase">${contrName}</td>
            </tr>
        `;

        // Проверяем, связан ли подрядчик с базой RBI
        const isLinkedContr = rbiContractors.includes(contrName.toLowerCase().trim()) || Object.values(window.skContractorMap).includes(contrName);

        matrixByContr[contrName].sort((a,b) => b.total - a.total).forEach(mData => {
            let isdHtml = '<span class="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Объем не задан</span>';
            let statusBadge = '<span class="text-slate-400 text-[10px] font-bold">Недостаточно данных</span>';
            let expectedHtml = '<span class="text-slate-400">-</span>';
            
            if (mData.category !== 'Без категории') {
                if (!isLinkedContr) {
                    // Если подрядчик не связан с RBI, расчет не производим
                    isdHtml = '<span class="text-[9px] text-slate-400 font-bold uppercase border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded bg-white dark:bg-slate-800">Нет базы RBI</span>';
                    statusBadge = '<span class="text-slate-400 text-[10px] font-bold">Не связан</span>';
                } else if (window.skVolumes && window.skVolumes[mData.category]) {
                    // Если связан и есть объемы - считаем!
                    const vol = window.skVolumes[mData.category].amount;
                    const rbiRate = getRbiDefectRate(mData.contractor, mData.category); 
                    
                    let expected = Math.round(vol * rbiRate); 
                    if (expected < 1) expected = 1;
                    
                    expectedHtml = `<span class="text-slate-700 dark:text-slate-300 font-black">${expected}</span>`;

                    let isd = Math.round((mData.total / expected) * 100);
                    
                    let colorClass = 'text-green-600 bg-green-50 border-green-200'; 
                    statusBadge = '<span class="text-green-600 font-black text-[9px] uppercase">🟢 Прозрачно</span>';
                    
                    if (isd < 20) { 
                        colorClass = 'text-red-600 bg-red-50 border-red-200'; 
                        statusBadge = '<span class="text-red-600 font-black text-[9px] uppercase animate-pulse">🔴 Скрывают брак</span>';
                        skIssues.isd.push(`${mData.contractor} (${mData.category})`);
                    }
                    else if (isd < 60) { 
                        colorClass = 'text-orange-500 bg-orange-50 border-orange-200'; 
                        statusBadge = '<span class="text-orange-500 font-black text-[9px] uppercase">🟡 Подозрительно</span>'; 
                    }

                    if (isd > 100) {
                        isdHtml = `<span class="font-black ${colorClass} px-2 py-0.5 rounded border text-[11px]">100% <span class="text-[8px] opacity-70">(Избыточно)</span></span>`;
                    } else {
                        isdHtml = `<span class="font-black ${colorClass} px-2 py-0.5 rounded border text-[12px]">${isd}%</span>`;
                    }
                }
            }

            matrixRows += `
                <tr class="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    <td class="p-2.5 pl-4 text-[10px] font-bold ${mData.category === 'Без категории' ? 'text-slate-400 italic' : 'text-slate-600 dark:text-slate-300'} truncate max-w-[120px]" title="${mData.category}">↳ ${mData.category}</td>
                    <td class="p-2.5 text-center text-[10px]"><span class="font-black text-indigo-600">${mData.total}</span> / ${expectedHtml}</td>
                    <td class="p-2.5 text-center align-middle">${isdHtml}</td>
                    <td class="p-2.5 text-center align-middle">${statusBadge}</td>
                    <td class="p-2.5 text-center text-[10px] font-bold align-middle"><span class="text-red-600">${mData.open}</span> / ${mData.total}</td>
                </tr>
            `;
        });
    });

    let linkedHtml = '';
    let unlinkedHtml = '';
    const sortedContrs = Object.keys(contrMap).sort((a,b) => contrMap[b].total - contrMap[a].total);

    sortedContrs.forEach(cName => {
        const data = contrMap[cName];
        const isLinked = rbiContractors.includes(cName.toLowerCase().trim()) || Object.values(window.skContractorMap).includes(cName);
        
        const linkBadge = isLinked 
            ? `<span class="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">🔗 Связан с RBI</span>`
            : `<span class="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">⚪ Без связи</span>`;

        const overduePerc = data.total > 0 ? Math.round((data.overdueCount / data.total) * 100) : 0;
        const avgOverdueDepth = data.overdueDaysArr.length > 0 ? Math.round(data.overdueDaysArr.reduce((a,b)=>a+b,0) / data.overdueDaysArr.length) : 0;
        const onTimePerc = data.closedCount > 0 ? Math.round((data.closedOnTimeCount / data.closedCount) * 100) : 100;
        
        let cmi = 0;
        if (data.total > 0) {
            cmi = Math.round((onTimePerc * 0.6) + ((100 - overduePerc) * 0.4) - Math.min(avgOverdueDepth, 30));
            cmi = Math.max(0, Math.min(100, cmi)); 
            if (data.closedCount === 0 && data.overdueCount === 0) cmi = 100; 
        }

        // === ТОЛЬКО СОБИРАЕМ ДАННЫЕ В МАССИВЫ (БЕЗ СОЗДАНИЯ ЗАДАЧ ЗДЕСЬ) ===
        if (isLinked) {
            if (data.open > 5) skIssues.open.push(cName);
            if (cmi < 40 && data.total > 5) skIssues.cmi.push(cName);
        }

        let cmiColor = cmi >= 70 ? 'text-green-600' : (cmi >= 40 ? 'text-orange-500' : 'text-red-600');
        let overdueColor = overduePerc > 30 ? 'text-red-600' : (overduePerc > 10 ? 'text-orange-500' : 'text-green-600');

        const topDefects = Object.keys(data.defects).map(text => ({ text, count: data.defects[text] })).sort((a,b) => b.count - a.count).slice(0, 3);
        let topDefectsHtml = topDefects.length > 0 && topDefects[0].count > 1 
            ? topDefects.filter(d => d.count > 1).map(d => `<div class="flex items-start gap-2 mb-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5"><span class="bg-orange-100 text-orange-700 px-1.5 rounded text-[9px] font-black shrink-0 mt-0.5">${d.count} раз</span><span class="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">${d.text}</span></div>`).join('')
            : '<div class="text-[10px] text-slate-400 font-bold">Явно выраженных повторений нет</div>';

        const safeId = cName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '');
        const safeCName = cName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        const cardHtml = `
            <details class="bg-white dark:bg-slate-800 border ${isLinked ? 'border-indigo-200 dark:border-indigo-800' : 'border-[var(--card-border)]'} rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none">
                    <div class="flex-1 min-w-0 pr-3">
                        <div class="mb-1.5">${linkBadge}</div>
                        <div class="text-[12px] font-black text-slate-800 dark:text-white truncate mb-1">${cName}</div>
                        <div class="flex gap-2 text-[9px] font-bold">
                            <span class="text-slate-500 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Всего: ${data.total}</span>
                            <span class="text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">Открыто: ${data.open}</span>
                        </div>
                    </div>
                    <div class="text-right shrink-0 flex flex-col items-end">
                        <div class="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Просрочка</div>
                        <div class="text-[16px] font-black ${overdueColor}">${overduePerc}%</div>
                    </div>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50">
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-[var(--card-border)] shadow-sm text-center">
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1 cursor-pointer" onclick="sk_showInfoModal('cmi')">Индекс CMI ❓</div>
                            <div class="text-[16px] font-black ${cmiColor}">${cmi}</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-[var(--card-border)] shadow-sm text-center">
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1" title="% закрытых вовремя">В срок</div>
                            <div class="text-[16px] font-black text-slate-700 dark:text-slate-300">${onTimePerc}%</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-[var(--card-border)] shadow-sm text-center">
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1" title="Средняя задержка в днях">Глубина</div>
                            <div class="text-[16px] font-black ${avgOverdueDepth > 5 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">${avgOverdueDepth} дн.</div>
                        </div>
                    </div>
                    <div class="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 p-2.5 rounded-lg shadow-sm mb-3">
                        <div class="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">🔄 Типовые дефекты (Из Excel)</div>
                        ${topDefectsHtml}
                    </div>
                    <button onclick="sk_generateContractorAiSummary('${safeCName}', '${safeId}')" id="btn-sk-ai-${safeId}" class="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2">
                        🤖 AI-Анализ и Письмо прорабу
                    </button>
                    <div id="sk-ai-res-${safeId}" class="hidden mt-3 p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner"></div>
                </div>
            </details>
        `;

        if (isLinked) linkedHtml += cardHtml; else unlinkedHtml += cardHtml;
    });

    // === ЖЕСТКОЕ УДАЛЕНИЕ СТАРЫХ МНОЖЕСТВЕННЫХ ЗАДАЧ ИЗ БАЗЫ ===
    if (typeof window.rbi_tasksData !== 'undefined') {
        let tasksDeleted = false;
        window.rbi_tasksData.forEach(t => {
            if (t.status === 'pending' && (t.title.includes('Низкая зрелость СК:') || t.title.includes('Просрочки ПК СК:') || t.title.includes('Низкий ИСД:'))) {
                t._deleted = true;
                if (typeof dbPut === 'function') dbPut(STORES.TASKS, t);
                tasksDeleted = true;
            }
        });
        if (tasksDeleted) {
            window.rbi_tasksData = window.rbi_tasksData.filter(t => !t._deleted);
        }
    }

    // === КОНСОЛИДАЦИЯ ЗАДАЧ (СОЗДАНИЕ ОДНОЙ ЕДИНОЙ) ===
    if ((skIssues.isd.length > 0 || skIssues.open.length > 0 || skIssues.cmi.length > 0) && typeof window.rbi_tasksData !== 'undefined') {
        const taskTitle = 'Анализ проблем ПК СК';
        const exists = window.rbi_tasksData.find(x => x.title === taskTitle && x.status === 'pending');
        
        let promptLines = [];
        if (skIssues.isd.length > 0) promptLines.push(`🚨 Низкий ИСД (скрывают брак):\n- ${[...new Set(skIssues.isd)].join('\n- ')}`);
        if (skIssues.open.length > 0) promptLines.push(`⚠️ Много открытых замечаний:\n- ${[...new Set(skIssues.open)].join('\n- ')}`);
        if (skIssues.cmi.length > 0) promptLines.push(`⏱ Низкий Индекс Зрелости (срывы сроков):\n- ${[...new Set(skIssues.cmi)].join('\n- ')}`);
        
        const fullPrompt = "Выявлены проблемы по СВЯЗАННЫМ подрядчикам в Стройконтроле:\n\n" + promptLines.join('\n\n');

        if (!exists) {
            const newTask = {
                id: 'tsk_sk_cons_' + Date.now().toString(36),
                type: 'auto', category: 'meeting',
                icon: 'Совещание', taskType: 'Аналитика СК',
                contractor: 'Служебная', project: document.getElementById('inp-project')?.value || "Все",
                templateKey: '', workTitle: 'Аналитика СК',
                title: taskTitle, prompt: fullPrompt,
                status: 'pending', priorityLvl: 3, date: new Date().toISOString(),
                target: 1, done: 0, carryOverCount: 0,
                history: [`[${new Date().toLocaleDateString('ru-RU')}] Задача создана модулем ПК СК.`],
                updatedAt: new Date().toISOString()
            };
            window.rbi_tasksData.push(newTask);
            if (typeof dbPut === 'function') dbPut(STORES.TASKS, newTask);
            
            localStorage.setItem('rbi_cloud_dirty', '1');
            if (typeof triggerSync === 'function') triggerSync('silent');
        } else {
            if (exists.prompt !== fullPrompt) {
                exists.prompt = fullPrompt;
                exists.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') dbPut(STORES.TASKS, exists);
            }
        }
    }

    container.innerHTML = `
        <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center">
                <div class="text-[9px] font-black uppercase text-slate-400 mb-1">Всего замечаний СК</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">${totalIssues}</div>
            </div>
            <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 p-3 rounded-xl shadow-sm text-center">
                <div class="text-[9px] font-black uppercase text-red-600 dark:text-red-400 mb-1">Открыто сейчас</div>
                <div class="text-2xl font-black text-red-600 dark:text-red-400">${totalOpen}</div>
            </div>
        </div>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-black text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1">📊 Матрица Рисков (ИСД) <button onclick="event.stopPropagation(); sk_showInfoModal('isd')" class="text-indigo-500 hover:scale-110 active:scale-95 transition-transform text-lg ml-1">❓</button></span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">▼</span>
            </summary>
            <div class="overflow-x-auto custom-scrollbar max-h-[60vh]">
                <table class="w-full text-left whitespace-nowrap">
                    <thead class="bg-slate-50 dark:bg-slate-900 text-[9px] text-[var(--text-muted)] uppercase sticky top-0 shadow-sm z-10">
                        <tr>
                            <th class="p-2.5 pl-4">Подрядчик / Вид работ</th>
                            <th class="p-2.5 text-center" title="Сколько выдали СК / Сколько ожидаем по статистике">Факт / Ожидание</th>
                            <th class="p-2.5 text-center">ИСД</th>
                            <th class="p-2.5 text-center">Вывод</th>
                            <th class="p-2.5 text-center" title="Сколько сейчас открыто">Открыто / Выдано</th>
                        </tr>
                    </thead>
                    <tbody>${matrixRows}</tbody>
                </table>
            </div>
        </details>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-black text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300">📉 Тренд доли открытых замечаний</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3" style="height: 180px; position: relative; width: 100%;">
                <canvas id="sk-trend-chart"></canvas>
            </div>
        </details>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-black text-[11px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400">🔗 Связано с проверками RBI</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50">
                ${linkedHtml || `<div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase">Связанных подрядчиков не найдено</div>`}
            </div>
        </details>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-black text-[11px] uppercase tracking-widest text-slate-500">⚪ Изолированный анализ (Без связи)</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">▼</span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50">
                ${unlinkedHtml || `<div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase">Все подрядчики связаны с RBI</div>`}
            </div>
        </details>
    `;

    setTimeout(() => {
        const ctxTrend = document.getElementById('sk-trend-chart');
        if (ctxTrend) {
            const trendMap = {};
            activeRecords.forEach(r => {
                if (r.date_issued) {
                    const d = new Date(r.date_issued);
                    const monthKey = d.toLocaleString('ru-RU', { month: 'short', year: '2-digit' });
                    if (!trendMap[monthKey]) trendMap[monthKey] = { total: 0, open: 0 };
                    trendMap[monthKey].total++;
                    if (r.status && r.status.toLowerCase().includes('не устран')) trendMap[monthKey].open++;
                }
            });

            const labels = []; const dataPoints = [];
            Object.keys(trendMap).forEach(k => {
                labels.push(k);
                const perc = Math.round((trendMap[k].open / trendMap[k].total) * 100);
                dataPoints.push(perc);
            });

            if (window.skTrendChartInstance) window.skTrendChartInstance.destroy();
            window.skTrendChartInstance = new Chart(ctxTrend, {
                type: 'line',
                data: { 
                    labels: labels, 
                    datasets: [{ 
                        label: '% Открытых',
                        data: dataPoints, 
                        borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3 
                    }] 
                },
                options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
            });
        }
    }, 100);
};

// === 7. AI-СВЯЗКА ДЕФЕКТОВ EXCEL С ЧЕК-ЛИСТАМИ RBI И ГЕНЕРАЦИЯ ПИСЬМА ===
window.sk_generateContractorAiSummary = async function(cName, safeId) {
    if (typeof appSettings === 'undefined' || !appSettings.aiEnabled) return showToast("⚠️ Включите AI-ассистента в Настройках!");

    const btn = document.getElementById(`btn-sk-ai-${safeId}`);
    const resBox = document.getElementById(`sk-ai-res-${safeId}`);
    
    btn.innerHTML = `<span class="animate-pulse">⏳ DeepSeek анализирует дефекты...</span>`;
    btn.disabled = true;
    resBox.classList.remove('hidden');
    resBox.innerHTML = `<div class="text-center text-indigo-500 font-bold animate-pulse">ИИ сопоставляет замечания с чек-листами RBI...</div>`;

    let total = 0, open = 0, overdue = 0;
    const defectsFreq = {};
    window.skRecords.filter(r => r.contractor === cName).forEach(r => {
        total++;
        const isOpen = r.status && r.status.toLowerCase().includes('не устран');
        if (isOpen) open++;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        if (deadline && isOpen && new Date() > deadline) overdue++;
        if (r.text) {
            const cleanText = r.text.trim().replace(/\s+/g, ' ').substring(0, 100);
            defectsFreq[cleanText] = (defectsFreq[cleanText] || 0) + 1;
        }
    });

    const topDefects = Object.keys(defectsFreq).sort((a,b) => defectsFreq[b] - defectsFreq[a]).slice(0, 5);
    const defectListStr = topDefects.map(d => `- ${d} (${defectsFreq[d]} раз)`).join('\n');

    const availableChecklists = [];
    if (typeof SYSTEM_TEMPLATES !== 'undefined') {
        Object.keys(SYSTEM_TEMPLATES).forEach(k => availableChecklists.push(SYSTEM_TEMPLATES[k].title));
    }
    const checklistsStr = availableChecklists.join(', ');

    const promptSystem = `Ты — Главный эксперт по качеству. Проанализируй открытые замечания подрядчика из системы "Стройконтроль".
    Верни ответ СТРОГО в формате:
    
    [ОЦЕНКА ФОРМУЛИРОВОК (KPI)]
    Оценка качества описания дефектов инженерами СК: [X/10]. 
    Комментарий: [Укажи 1 предложением, чего не хватает инженерам при выдаче предписаний: осей, конкретики, ссылок на ГОСТ].

    [ПРОГНОЗ РИСКА ПРОСРОЧКИ]
    [Выбери 1 самый сложный дефект из списка и оцени риск его просрочки: Высокий / Средний / Низкий. Объясни почему (технологическая сложность, поставка материалов и т.д.)].

    [СВЯЗЬ С ЧЕК-ЛИСТАМИ RBI]
    Рекомендуемые чек-листы для проверок: [Выбери 1-2 из: ${checklistsStr}].

    [СООБЩЕНИЕ ПРОРАБУ В WHATSAPP]
    [Короткое жесткое письмо прорабу. Укажи статистику просрочек и дефекты, которые нужно закрыть]`;

    const promptUser = `Подрядчик: ${cName}. Всего: ${total}. Открыто: ${open}. Просрочено: ${overdue}. Тексты дефектов:\n${defectListStr}`;

    try {
        const response = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: promptUser }], { temperature: 0.2, max_tokens: 800 });
        
        const formattedResponse = response
            .replace(/\[ОЦЕНКА ФОРМУЛИРОВОК \(KPI\)\]/g, '<div class="text-[12px] font-black text-purple-700 uppercase mb-1 border-b border-purple-100 pb-1">📝 Качество работы инженеров СК</div>')
            .replace(/\[ПРОГНОЗ РИСКА ПРОСРОЧКИ\]/g, '<div class="text-[12px] font-black text-red-700 uppercase mt-3 mb-1 border-b border-red-100 pb-1">🔮 AI-Прогноз рисков</div>')
            .replace(/\[СВЯЗЬ С ЧЕК-ЛИСТАМИ RBI\]/g, '<div class="text-[12px] font-black text-indigo-700 uppercase mt-3 mb-1 border-b border-indigo-100 pb-1">🔗 Фокус для RBI Аудита</div>')
            .replace(/\[СООБЩЕНИЕ ПРОРАБУ В WHATSAPP\]/g, '<div class="text-[12px] font-black text-green-700 uppercase mt-3 mb-1 border-b border-green-100 pb-1">💬 Сообщение прорабу (Копировать)</div>');

        resBox.innerHTML = `
            ${formattedResponse}
            <button onclick="navigator.clipboard.writeText(this.parentElement.innerText); showToast('Текст скопирован!');" class="mt-3 w-full bg-slate-100 text-slate-600 border border-slate-300 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 shadow-sm">
                📋 Скопировать весь текст
            </button>
        `;
        if (typeof gameLogAction === 'function') gameLogAction('ai_generate', 'sk_contractor_analysis');
    } catch(e) {
        resBox.innerHTML = `<span class="text-red-500 font-bold">❌ Ошибка ИИ: ${e.message}</span>`;
    } finally {
        btn.innerHTML = `🤖 AI-Анализ и Письмо прорабу`;
        btn.disabled = false;
    }
};

// === HR-ПАНЕЛЬ ИНЖЕНЕРОВ СК ===
// === HR-ПАНЕЛЬ ИНЖЕНЕРОВ СК ===
window.sk_renderHrTab = function() {
    const container = document.getElementById('sk-view-hr');
    if (!container) return;

    if (window.skRecords.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold uppercase border border-dashed border-[var(--card-border)] rounded-xl">Нет данных</div>`;
        return;
    }

    // Собираем статистику по инженерам
    const engMap = {};
    window.skRecords.forEach(r => {
        let baseName = r.inspector && r.inspector.trim() !== '' ? r.inspector.trim() : 'Не указан в выгрузке';
        // ЖЕСТКО приписываем (Технадзор), если этого слова еще нет в имени
        const engName = baseName.toLowerCase().includes('технадзор') ? baseName : `${baseName} (Технадзор)`;

        if (!engMap[engName]) {
            engMap[engName] = { total: 0, open: 0, overdue: 0, withCategory: 0, closingTimes: [] };
        }
        
        const data = engMap[engName];
        data.total++;
        
        const isOpen = r.status && r.status.toLowerCase().includes('не устран');
        if (isOpen) data.open++;

        if (r.category && r.category !== 'Без категории') data.withCategory++;

        const issued = r.date_issued ? new Date(r.date_issued) : null;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        const resolved = r.date_resolved ? new Date(r.date_resolved) : null;
        const now = new Date();

        if (deadline) {
            if (isOpen && now > deadline) data.overdue++;
            else if (!isOpen && resolved && resolved > deadline) data.overdue++;
        }

        if (!isOpen && issued && resolved) {
            const daysToClose = Math.ceil((resolved - issued) / (1000 * 60 * 60 * 24));
            if (daysToClose >= 0) data.closingTimes.push(daysToClose);
        }
    });

    const engArray = Object.keys(engMap).map(name => {
        const d = engMap[name];
        const avgTime = d.closingTimes.length > 0 ? Math.round(d.closingTimes.reduce((a,b)=>a+b,0)/d.closingTimes.length) : 0;
        const overduePerc = d.total > 0 ? Math.round((d.overdue / d.total) * 100) : 0;
        const catPerc = d.total > 0 ? Math.round((d.withCategory / d.total) * 100) : 0;
        
        // Оценка полноты работы инженера (KPI)
        let kpi = Math.max(0, 100 - overduePerc + (catPerc === 100 ? 10 : 0));
        return { name, total: d.total, open: d.open, overduePerc, catPerc, avgTime, kpi };
    });

    engArray.sort((a,b) => b.kpi - a.kpi);

    const rowsHtml = engArray.map((e, idx) => {
        const rankColor = idx === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-500';
        return `
        <tr class="border-b border-[var(--card-border)] hover:bg-[var(--hover-bg)]">
            <td class="p-2 flex items-center gap-2">
                <div class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${rankColor} shrink-0">${idx + 1}</div>
                <div class="font-bold text-[11px] text-slate-800 dark:text-white truncate max-w-[120px]" title="${e.name}">${e.name}</div>
            </td>
            <td class="p-2 text-center text-[11px] font-black text-indigo-600">${e.total}</td>
            <td class="p-2 text-center text-[11px] font-bold ${e.overduePerc > 20 ? 'text-red-600' : 'text-green-600'}">${e.overduePerc}%</td>
            <td class="p-2 text-center text-[11px] font-bold text-slate-600">${e.avgTime} дн.</td>
            <td class="p-2 text-center text-[11px] font-bold ${e.catPerc < 80 ? 'text-orange-500' : 'text-slate-600'}">${e.catPerc}%</td>
            <td class="p-2 text-center text-[12px] font-black ${e.kpi >= 80 ? 'text-green-600' : 'text-red-500'}">${e.kpi}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4">
            <div class="p-3 bg-[var(--hover-bg)] border-b border-[var(--card-border)] flex items-center justify-between">
                <div>
                    <div class="font-black text-[12px] uppercase text-slate-800 dark:text-white flex items-center gap-1">Рейтинг инженеров СК (KPI) <button onclick="sk_showInfoModal('hr')" class="text-indigo-500 hover:scale-110 active:scale-95 transition-transform text-lg ml-1">❓</button></div>
                    <div class="text-[9px] text-slate-500 mt-1">Учитывает просрочки по выданным замечаниям и заполняемость категорий.</div>
                </div>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left whitespace-nowrap">
                    <thead class="bg-slate-50 dark:bg-slate-900 text-[9px] text-[var(--text-muted)] uppercase">
                        <tr>
                            <th class="p-2.5">Инженер</th>
                            <th class="p-2.5 text-center">Выдал</th>
                            <th class="p-2.5 text-center">Просрочка</th>
                            <th class="p-2.5 text-center">Ср. Время</th>
                            <th class="p-2.5 text-center">С категорией</th>
                            <th class="p-2.5 text-center text-indigo-600">Оценка KPI</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </div>
    `;
};

// === 14. СПРАВОЧНЫЕ МОДАЛКИ (ФОРМУЛЫ ИСД, CMI, KPI) ===
window.sk_showInfoModal = function(type) {
    let title = "", body = "";
    if (type === 'cmi') {
        title = "Индекс Зрелости (CMI)";
        body = `
            <div class="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-3">
                <p><b>CMI (Control Maturity Index)</b> оценивает дисциплину подрядчика при устранении предписаний Стройконтроля.</p>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-center">
                    CMI = (%Вовремя × 0.6) + ((100 - %Просрочки) × 0.4) - Глубина
                </div>
                <div class="bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500 p-2 text-[10px]">
                    <b>Пример:</b> У подрядчика 10 замечаний. 8 закрыто вовремя, 2 просрочено (в среднем на 5 дней).<br>
                    CMI = (80% × 0.6) + ((100 - 20%) × 0.4) - 5 дней = 48 + 32 - 5 = <b>75 баллов</b>.
                </div>
                <p>Штраф за "Глубину" (дни задержки) ограничен максимумом в 30 баллов, чтобы индекс не уходил в минус.</p>
                <p>🟢 <b>≥ 70</b> — Отлично.<br>🟡 <b>40 – 69</b> — Средне.<br>🔴 <b>< 40</b> — Срыв сроков.</p>
            </div>
        `;
    } else if (type === 'isd') {
        title = "Индекс Соответствия (ИСД)";
        body = `
            <div class="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-3">
                <p><b>ИСД</b> — это детектор сокрытия брака. Он сравнивает, сколько замечаний инженеры выдали в СК, с тем, сколько <b>реально</b> должны были выдать.</p>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-center">
                    ИСД = (Факт в ПК СК / Ожидаемый Брак) × 100%
                </div>
                <ul class="list-disc pl-4 space-y-1 text-[11px]">
                    <li><b>Факт:</b> Выданные замечания в СК по этому подрядчику и виду работ.</li>
                    <li><b>Ожидание:</b> (Общий объем работ) × (Процент брака B2/B3 из твоих аудитов RBI).</li>
                </ul>
                <div class="bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500 p-2 text-[10px]">
                    <b>Пример:</b> Объем кладки 1000 м3. В приложении RBI твои аудиты показывают, что у этого подрядчика брак в 2% случаев. Ожидаем: 20 замечаний. А в СК их всего 5.<br>
                    ИСД = (5 / 20) × 100% = <b>25%</b>. Подрядчик скрывает дефекты!
                </div>
                <p>🔴 <b>ИСД < 20%</b> — Аномалия. Обязательный выезд на объект.</p>
            </div>
        `;
    } else if (type === 'hr') {
        title = "KPI Инженеров СК";
        body = `
            <div class="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-3">
                <p><b>KPI</b> оценивает качество ведения Стройконтроля конкретным инженером.</p>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-center">
                    KPI = 100 - %Просрочки + Бонус (10)
                </div>
                <ul class="list-disc pl-4 space-y-1 text-[11px]">
                    <li><b>Штраф:</b> Минус 1 балл за каждый процент просроченных замечаний.</li>
                    <li><b>Бонус:</b> +10 баллов, если у 100% выданных замечаний корректно указан "Вид работ".</li>
                </ul>
                <div class="bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500 p-2 text-[10px]">
                    <b>Пример:</b> Инженер выдал 20 замечаний. 4 из них просрочены (20%). Все замечания с категориями (+10 бонус).<br>
                    KPI = 100 - 20 + 10 = <b>90 баллов</b>.
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-icon').innerHTML = ''; // Убрали лишнюю иконку
    
    // В заголовке нет крестика, чистый текст
    document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg text-indigo-600 dark:text-indigo-400">${title}</div>`;
    
    // ОДНА кнопка снизу
    document.getElementById('modal-body').innerHTML = body + `
        <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button onclick="closeModal()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase shadow-md active:scale-95 transition-transform">Понятно</button>
        </div>
    `;
    
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
};

window.sk_deleteRecord = async function(recordId) {
    if (!confirm("Удалить это замечание? Оно исчезнет у всех членов команды после синхронизации.")) return;
    const record = window.skRecords.find(r => r.id === recordId);
    if (!record) return;
    record._deleted = true;
    record._updatedAt = new Date().toISOString();
    await dbPut(STORES.SK_RECORDS, record);
    window.skRecords = window.skRecords.filter(r => r.id !== recordId);
    sk_renderDashboard();
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
    showToast("🗑️ Замечание удалено. Синхронизируйтесь, чтобы обновить команду.");
};