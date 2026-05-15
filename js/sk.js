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
// Текущий пользователь для ПК СК
function sk_getCurrentUserName() {
    if (window.RbiRoles && typeof window.RbiRoles.getCurrentEngineerName === 'function') {
        return window.RbiRoles.getCurrentEngineerName();
    }

    return window.syncConfig?.engineerName ||
        appSettings?.engineerName ||
        document.getElementById('inp-inspector')?.value?.trim() ||
        'Инженер';
}

// Роль текущего пользователя
function sk_getCurrentRole() {
    return window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
}

// Загружать ПК СК могут инженер, заместитель и администратор
function sk_canUploadRecords() {
    return ['engineer', 'deputy_manager', 'manager'].includes(sk_getCurrentRole());
}

// Удаление ПК СК:
// инженер удаляет только свои загруженные записи;
// заместитель и администратор удаляют любые;
// остальные не удаляют.
function sk_canDeleteRecord(record) {
    if (!record) return false;

    const role = sk_getCurrentRole();

    if (['manager', 'deputy_manager'].includes(role)) {
        return true;
    }

    if (role !== 'engineer') {
        return false;
    }

    const currentUser = sk_getCurrentUserName();

    const uploadedBy =
        record.uploaded_by ||
        record.sk_uploaded_by ||
        record.imported_by ||
        '';

    return uploadedBy === currentUser;
}
// Фильтрация записей ПК СК по текущей роли пользователя
function sk_filterRecordsByAccess(records) {
    if (!Array.isArray(records)) return [];

    const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

    const assignedProjects = window.RbiRoles
        ? window.RbiRoles.getAssignedProjects()
        : (appSettings?.assignedProjects || []);

    const currentEngineer = window.RbiRoles
        ? window.RbiRoles.getCurrentEngineerName()
        : (appSettings?.engineerName || '');

    const assignedContractor = window.RbiRoles
        ? window.RbiRoles.getAssignedContractor()
        : (appSettings?.contractorName || appSettings?.assignedContractor || '');

    // Админ, зам и директор видят всё
    if (['manager', 'deputy_manager', 'director'].includes(role)) {
        return records;
    }

    // Руководитель проекта видит все записи по своим объектам
    if (role === 'project_manager') {
        if (!assignedProjects || assignedProjects.length === 0) return [];

        return records.filter(r => {
            const recProject =
                r.project_canonical_key ||
                r.canonical_key ||
                r.projectName ||
                r.project ||
                '';

            return assignedProjects.includes(recProject);
        });
    }

    // Инженер видит только записи, которые он сам загрузил,
    // и только по своим объектам, если объекты назначены.
    if (role === 'engineer') {
        return records.filter(r => {
            const recProject =
                r.project_canonical_key ||
                r.canonical_key ||
                r.projectName ||
                r.project ||
                '';

            const uploadedBy =
                r.uploaded_by ||
                r.sk_uploaded_by ||
                r.imported_by ||
                '';

            const projectOk =
                !assignedProjects ||
                assignedProjects.length === 0 ||
                assignedProjects.includes(recProject);

            const ownerOk =
                uploadedBy === currentEngineer;

            return projectOk && ownerOk;
        });
    }

    // Подрядчик видит только свою организацию
    if (role === 'contractor') {
        if (!assignedContractor) return [];

        return records.filter(r => {
            const recContractor =
                r.contractor ||
                r.contractorName ||
                r.contractor_name ||
                '';

            const recProject =
                r.project_canonical_key ||
                r.canonical_key ||
                r.projectName ||
                r.project ||
                '';

            const contractorOk = recContractor === assignedContractor;

            const projectOk =
                !assignedProjects ||
                assignedProjects.length === 0 ||
                assignedProjects.includes(recProject);

            return contractorOk && projectOk;
        });
    }

    // Гость не видит ПК СК
    return [];
}
// === 1. ЗАГРУЗКА БАЗЫ ДАННЫХ ===
window.sk_loadData = async function () {
    // ВСТАВИТЬ ЭТУ СТРОЧКУ ДЛЯ ЗАЩИТЫ ДЕМО-РЕЖИМА:
    if (typeof isDemoMode !== 'undefined' && isDemoMode) return;

    try {
        const records = await dbGetAll(STORES.SK_RECORDS);

        if (records) {
            const activeRecords = records.filter(r => !r._deleted);
            window.skRecords = sk_filterRecordsByAccess(activeRecords);
        } else {
            window.skRecords = [];
        }

        const volumes = await dbGet(STORES.SK_VOLUMES, 'main');
        if (volumes && volumes.data) window.skVolumes = volumes.data;

        const mapping = await dbGet(STORES.SK_MAPPING, 'main');
        if (mapping && mapping.data) window.skMapping = mapping.data;

        const cmap = await dbGet(STORES.SK_CONTRACTOR_MAP, 'main');
        if (cmap && cmap.data) window.skContractorMap = cmap.data;

        const catMap = await dbGet(STORES.SK_CATEGORY_MAP, 'main');
        if (catMap && catMap.data) window.skCategoryMap = catMap.data;
    } catch (e) { console.error("Ошибка загрузки данных ПК СК", e); }
};

// === 2. ГЛАВНЫЙ РЕНДЕР ВКЛАДКИ ===
window.skCurrentPeriodFilter = 'ALL'; // Глобальная переменная для фильтра

window.sk_renderMainTab = async function () {
    await sk_loadData();
    const container = document.getElementById('sk-main-container');
    if (!container) return;

    // Вычисляем период загруженных данных
    let minD = null, maxD = null;
    window.skRecords.forEach(r => {
        if (r.date_issued) {
            const d = new Date(r.date_issued);
            if (!minD || d < minD) minD = d;
            if (!maxD || d > maxD) maxD = d;
        }
    });
    const periodStr = (minD && maxD) ? `с ${minD.toLocaleDateString('ru-RU')} по ${maxD.toLocaleDateString('ru-RU')}` : 'Не определен';

    // --- ПРОВЕРКА ПРАВ ДЛЯ ВКЛАДКИ HR ---
    const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
    const isManagement = ['project_manager', 'deputy_manager', 'director', 'manager'].includes(role);
    const canUploadSk = ['engineer', 'deputy_manager', 'manager'].includes(role);

    const hrBtnHtml = isManagement ? `<button onclick="sk_switchView('hr')" id="sk-btn-hr" class="shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Инженеры СК</button>` : '';

    let html = `
        <!-- ... Шапка дашборда СК (оставляем как есть, меняем только кнопки) ... -->
        <div class="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] shadow-sm mb-4">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h2 class="text-[13px] font-bold uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Данные ПК Стройконтроль
                    </h2>
                    <p class="text-[10px] text-slate-500 font-bold mt-1">Всего в базе: <b class="text-indigo-600">${window.skRecords.length}</b> позиций</p>
                    <p class="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Период: ${periodStr}</p>
                </div>
                <div class="flex gap-2">
                ${canUploadSk ? `
                   <button onclick="sk_clearData()" class="w-10 h-10 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-transform" title="Очистить базу СК">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <button onclick="document.getElementById('sk-excel-input').click()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase shadow-md active:scale-95 flex items-center gap-1.5 h-10">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path></svg> Импорт
                   </button>
                            ` : `
                    <div class="text-[9px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-[var(--card-border)]">
                  Только просмотр
                    </div>
    `}
</div>
            </div>
            
            <div class="flex items-center gap-2 border-t border-[var(--card-border)] pt-3">
                <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Фильтр:</span>
                <select id="sk-period-filter" class="input-base !py-1 !text-[10px] font-bold flex-1" onchange="window.skCurrentPeriodFilter = this.value; sk_renderDashboard();">
                    <option value="ALL" ${window.skCurrentPeriodFilter === 'ALL' ? 'selected' : ''}>Анализировать всё время</option>
                    <option value="14" ${window.skCurrentPeriodFilter === '14' ? 'selected' : ''}>За последние 14 дней</option>
                    <option value="30" ${window.skCurrentPeriodFilter === '30' ? 'selected' : ''}>За последние 30 дней</option>
                </select>
            </div>
        </div>

        <div class="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
            <button onclick="sk_switchView('dashboard')" id="sk-btn-dashboard" class="shrink-0 px-4 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg> Дашборд</button>
            <button onclick="sk_switchView('volumes')" id="sk-btn-volumes" class="shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Объемы</button>
            ${hrBtnHtml}
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
window.sk_clearData = async function () {
    const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
    if (!['manager', 'deputy_manager'].includes(role)) {
        return showToast("⛔ Недостаточно прав для очистки ПК СК");
    }
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

window.sk_switchView = function (view) {
    document.getElementById('sk-view-dashboard').classList.add('hidden');
    document.getElementById('sk-view-volumes').classList.add('hidden');
    document.getElementById('sk-view-hr').classList.add('hidden');

    const defaultBtnClass = "shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5";
    const activeBtnClass = "shrink-0 px-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5";

    document.getElementById('sk-btn-dashboard').className = defaultBtnClass;
    document.getElementById('sk-btn-volumes').className = defaultBtnClass;
    document.getElementById('sk-btn-hr').className = defaultBtnClass;

    document.getElementById(`sk-view-${view}`).classList.remove('hidden');
    document.getElementById(`sk-btn-${view}`).className = activeBtnClass;

    // Если открыли инженеров — рендерим их
    if (view === 'hr') sk_renderHrTab();
};

// === 3. СПРАВОЧНИК ОБЪЕМОВ ===
window.sk_renderVolumes = function () {
    const container = document.getElementById('sk-view-volumes');
    if (!container) return;

    let rowsHtml = '';
    for (let workType in window.skVolumes) {
        let v = window.skVolumes[workType];
        rowsHtml += `
            <div class="flex items-center gap-2 mb-2 bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                <div class="flex-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">${workType}</div>
                <div class="w-16 text-center text-[10px] font-black bg-[var(--card-bg)] border border-[var(--card-border)] py-1 rounded shadow-inner">${v.amount} ${v.unit}</div>
                <button onclick="sk_deleteVolume('${workType}')" class="text-red-500 bg-red-50 border border-red-200 w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
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

window.sk_addVolume = async function () {
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
    await dbPut(STORES.SK_VOLUMES, { id: 'main', data: window.skVolumes });

    // Очищаем поля после успешного добавления
    nameInput.value = ''; amountInput.value = ''; unitInput.value = '';

    showToast("✅ Объем добавлен в справочник!");
    sk_renderVolumes();
    sk_renderDashboard();
};

window.sk_deleteVolume = async function (name) {
    delete window.skVolumes[name];
    await dbPut(STORES.SK_VOLUMES, { id: 'main', data: window.skVolumes });
    sk_renderVolumes();
    sk_renderDashboard();
};

// === 5. ИМПОРТ EXCEL (Чтение файла) ===
window.sk_handleExcelImport = async function (event) {
    const file = event.target.files[0];
    if (!sk_canUploadRecords()) {
        event.target.value = '';
        return showToast("⛔ Загружать ПК СК могут только инженер, заместитель или администратор");
    }
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
window.sk_showMappingModal = function (fileHeaders, sampleRow) {
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
            const sampleText = sampleRow[idx] ? ` (напр: ${String(sampleRow[idx]).substring(0, 15)})` : '';
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
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Угадать через ИИ (DeepSeek)
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

// === ПАРСЕР ПРОСТРАНСТВЕННОГО РАСПОЛОЖЕНИЯ ===
async function sk_parseLocation(rawStr) {
    if (!rawStr) return { canonical_key: 'unknown', display_name: 'Не указан', block: 'Неизвестно', floor: '?' };

    // Разбиваем строку по слешам (стандарт выгрузки ПК СК)
    const parts = rawStr.split('/').map(s => s.trim());

    if (parts.length < 2) return { canonical_key: 'unknown', display_name: rawStr, block: 'Общее', floor: '?' };

    // Сегмент 2: Название объекта
    const rawProject = parts.length > 1 ? parts[1] : parts[0];
    let normalizedProject = rawProject;
    let canonical = 'unknown';

    if (typeof ObjectDirectory !== 'undefined') {
        const matchResult = await ObjectDirectory.normalizeProjectName(rawProject);
        normalizedProject = matchResult.display_name; // Берем красивое имя из объекта
        canonical = matchResult.canonical_key;        // Берем системный ключ из объекта
    }

    // Сегмент 3: Корпус/Секция
    const block = parts.length > 2 ? parts[2] : 'Общее';

    // Сегмент 4: Этаж (вытягиваем только цифры, включая минусовые паркинги)
    let floor = '?';
    if (parts.length > 3) {
        const floorMatch = parts[3].match(/-?\d+/);
        if (floorMatch) floor = floorMatch[0];
        else floor = parts[3];
    }

    return { canonical_key: canonical, display_name: normalizedProject, block: block, floor: floor };
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
window.sk_executeImport = async function () {
    // Сохраняем маппинг колонок
    const currentMapping = {};
    document.querySelectorAll('.sk-mapping-select').forEach(select => {
        currentMapping[select.dataset.field] = parseInt(select.value);
    });
    window.skMapping = currentMapping;
    await dbPut(STORES.SK_MAPPING, { id: 'main', data: currentMapping });

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
window.sk_showNormalizationModal = function () {
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
                <button onclick="sk_resolvePair(${idx}, false)" class="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 border border-slate-200">Разные</button>
                <button onclick="sk_resolvePair(${idx}, true)" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 shadow-sm">Объединить</button>
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

window.sk_resolvePair = function (idx, isMatch) {
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
window.sk_finalizeImport = async function () {
    showToast("⏳ Сохраняем данные в базу...");

    await dbPut(STORES.SK_CONTRACTOR_MAP, { id: 'main', data: window.skContractorMap });

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

        const rawLoc = getVal('structure') ? String(getVal('structure')).trim() : '';
        const parsedLoc = await sk_parseLocation(rawLoc);

        // ИЗВЛЕЧЕНИЕ НОРМАТИВОВ
        const rawText = getVal('text') ? String(getVal('text')).trim() : '';
        const extractedStandards = sk_extractStandards(rawText);

        const record = {
            id: 'sk_' + number,
            number: number,
            text: rawText,
            category: getVal('category') ? String(getVal('category')).trim() : 'Без категории',
            date_issued: sk_parseExcelDate(getVal('date_issued')),
            contractor: cleanContractor,
            raw_contractor: rawContractor,
            inspector: getVal('inspector') ? String(getVal('inspector')).trim() : 'Неизвестно',
            deadline: sk_parseExcelDate(getVal('deadline')),
            status: getVal('status') ? String(getVal('status')).trim() : '',
            date_resolved: sk_parseExcelDate(getVal('date_resolved')),

            standards: extractedStandards,

            // Новые поля для пространственного анализа
            structure: rawLoc,
            raw_location: rawLoc,
            canonical_key: parsedLoc.canonical_key,
            display_name: parsedLoc.display_name,
            block: parsedLoc.block,
            floor: parsedLoc.floor,
            uploaded_by: sk_getCurrentUserName(),
            sk_uploaded_by: sk_getCurrentUserName(),
            imported_by: sk_getCurrentUserName(),

            source: 'local',
            syncStatus: 'not_synced',
            sync_status: 'not_synced',
            syncBlockReason: '',
            sync_block_reason: '',
            updated_at: new Date().toISOString(),
            _updatedAt: new Date().toISOString(),
            _deleted: false
        };

        const existingIdx = window.skRecords.findIndex(r => r.id === record.id);

if (existingIdx !== -1) {
    const existing = window.skRecords[existingIdx];

    const existingOwner =
        existing.uploaded_by ||
        existing.sk_uploaded_by ||
        existing.imported_by ||
        '';

    const role = sk_getCurrentRole();
    const isAdminSk = ['manager', 'deputy_manager'].includes(role);

    // Инженер не может перезаписать запись, которую загрузил другой пользователь.
    // Заместитель и администратор могут.
    if (!isAdminSk && existingOwner && existingOwner !== sk_getCurrentUserName()) {
        continue;
    }

    const existingTime = existing._updatedAt ? new Date(existing._updatedAt).getTime() : 0;
    const newTime = new Date(record._updatedAt).getTime();

    if (newTime > existingTime || isAdminSk) {
        // Если запись уже имела владельца — сохраняем его.
        // Если записи владельца не было — ставим текущего загрузившего.
        record.uploaded_by = existingOwner || sk_getCurrentUserName();
        record.sk_uploaded_by = existingOwner || sk_getCurrentUserName();
        record.imported_by = existingOwner || sk_getCurrentUserName();

        window.skRecords[existingIdx] = record;
        updatedRecordsCount++;
    } else {
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
    // Закрываем задачу на загрузку ПК СК
    if (typeof window.rbi_tasksData !== 'undefined') {
        const skTask = window.rbi_tasksData.find(t =>
            t.title === 'Загрузить выгрузку ПК СК' && t.status === 'pending'
        );
        if (skTask) {
            skTask.status = 'done';
            skTask.done = 1;
            skTask.resultComment = 'Файл загружен';
            skTask.updatedAt = new Date().toISOString();
            if (typeof dbPut === 'function') dbPut(STORES.TASKS, skTask);
        }
    }

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




// === 6. РЕНДЕР ДАШБОРДА (СМАРТ-МАТРИЦА ИСД И ЕДИНАЯ ЗАДАЧА) ===
window.sk_renderDashboard = function () {
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
        cutoffDate.setHours(0, 0, 0, 0);

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

    // <-- ИСПРАВЛЕНО: Защита от пустых имен (Cannot read properties of undefined)
    const rbiContractors = [...new Set(contractorArray.map(c => c.contractorName ? c.contractorName.toLowerCase().trim() : ''))];

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
    let standardsMap = {}; // Для подсчета частых ГОСТов
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
        // Подсчет нормативов
        if (r.standards && Array.isArray(r.standards)) {
            r.standards.forEach(std => {
                standardsMap[std] = (standardsMap[std] || 0) + 1;
            });
        }
        const c = r.contractor;
        totalIssues++;

        const isOpen = isIssueOpen(r);
        if (isOpen) totalOpen++;

        // Если ИИ исправил категорию, доверяем ему больше
        const effectiveCategory = r.category_corrected && r.ai_category ? r.ai_category : r.category;
        const rawCats = effectiveCategory ? effectiveCategory.split(',').map(s => s.trim()).filter(Boolean) : ['Без категории'];
        rawCats.forEach(raw => {
            let strippedRaw = raw.replace(/^\d+[\.,]\s*/, '').trim();
            let cleanCat = window.skCategoryMap[strippedRaw] || strippedRaw;
            if (cleanCat.trim() === '') cleanCat = 'Без категории';

            const matrixKey = `${c}_||_${cleanCat}`;
            if (!matrixMap[matrixKey]) matrixMap[matrixKey] = { contractor: c, category: cleanCat, total: 0, open: 0, overdue: 0, closingDays: [] };

            matrixMap[matrixKey].total++;
            if (isOpen) matrixMap[matrixKey].open++;
            // Расчет просрочек и времени для матрицы
            const issued = r.date_issued ? new Date(r.date_issued) : null;
            const deadline = r.deadline ? new Date(r.deadline) : null;
            const resolved = r.date_resolved ? new Date(r.date_resolved) : null;
            const now = new Date();

            if (deadline) {
                if (isOpen && now > deadline) {
                    matrixMap[matrixKey].overdue++;
                } else if (!isOpen && resolved && resolved > deadline) {
                    matrixMap[matrixKey].overdue++;
                }
            }
            if (!isOpen && issued && resolved) {
                const daysToClose = Math.ceil((resolved - issued) / (1000 * 60 * 60 * 24));
                if (daysToClose >= 0) matrixMap[matrixKey].closingDays.push(daysToClose);
            }
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

        // Проверяем, связан ли подрядчик с базой RBI (строгая нормализация)
        const isLinkedContr = rbiContractors.includes(contrName.toLowerCase().trim()) ||
            Object.values(window.skContractorMap).map(v => v.toLowerCase().trim()).includes(contrName.toLowerCase().trim());

        matrixByContr[contrName].sort((a, b) => b.total - a.total).forEach(mData => {
            let isdHtml = '<span class="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Объем не задан</span>';
            let statusBadge = '<span class="text-slate-400 text-[10px] font-bold">Недостаточно данных</span>';
            let expectedHtml = '<span class="text-slate-400">-</span>';

            if (mData.category !== 'Без категории') {
                if (!isLinkedContr) {
                    // Если подрядчик не связан с RBI, расчет не производим
                    isdHtml = '<span class="text-[9px] text-slate-400 font-bold uppercase border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded bg-white dark:bg-slate-800">Нет базы RBI</span>';
                    statusBadge = '<span class="text-slate-400 text-[10px] font-bold">Не связан</span>';
                } else if (window.skVolumes) {
                    const volKey = Object.keys(window.skVolumes).find(k => k.toLowerCase().trim() === mData.category.toLowerCase().trim());
                    if (volKey) {
                        // Если связан и есть объемы - считаем!
                        const vol = window.skVolumes[volKey].amount;
                        const rbiRate = getRbiDefectRate(mData.contractor, mData.category);

                        let expected = Math.round(vol * rbiRate);
                        if (expected < 1) expected = 1;
                    }
                    expectedHtml = `<span class="text-slate-700 dark:text-slate-300 font-black">${expected}</span>`;

                    let isd = Math.round((mData.total / expected) * 100);

                    let colorClass = 'text-green-600 bg-green-50 border-green-200';
                    statusBadge = '<span class="text-green-600 font-bold text-[9px] uppercase flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Прозрачно</span>';

                    if (isd < 20) {
                        colorClass = 'text-red-600 bg-red-50 border-red-200';
                        statusBadge = '<span class="text-red-600 font-bold text-[9px] uppercase flex items-center justify-center gap-1 animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Скрывают брак</span>';
                        skIssues.isd.push(`${mData.contractor} (${mData.category})`);
                    }
                    else if (isd < 60) {
                        colorClass = 'text-orange-500 bg-orange-50 border-orange-200';
                        statusBadge = '<span class="text-orange-500 font-bold text-[9px] uppercase flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Подозрительно</span>';
                    }

                    if (isd > 100) {
                        isdHtml = `<span class="font-black ${colorClass} px-2 py-0.5 rounded border text-[11px]">100% <span class="text-[8px] opacity-70">(Избыточно)</span></span>`;
                    } else {
                        isdHtml = `<span class="font-black ${colorClass} px-2 py-0.5 rounded border text-[12px]">${isd}%</span>`;
                    }
                }
            }

            // Вычисляем среднее время
            const avgClose = mData.closingDays.length > 0 ? Math.round(mData.closingDays.reduce((a, b) => a + b, 0) / mData.closingDays.length) : 0;
            const overColor = mData.overdue > 0 ? 'text-red-600' : 'text-slate-500';
            const avgColor = avgClose > 14 ? 'text-orange-500' : 'text-slate-500';
            // Ищем наихудший прогноз ИИ для этой группы
            const groupRecords = activeRecords.filter(r => r.contractor === mData.contractor && r.category === mData.category && r.predicted_risk);
            let aiBadge = '';
            if (groupRecords.length > 0) {
                const hasHigh = groupRecords.some(r => r.predicted_risk === 'High');
                const hasMed = groupRecords.some(r => r.predicted_risk === 'Medium');
                if (hasHigh) aiBadge = `<span class="bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ml-1" title="ИИ прогнозирует срыв сроков">🔮 Риск</span>`;
                else if (hasMed) aiBadge = `<span class="bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ml-1">🔮 Внимание</span>`;
            }
            matrixRows += `
                <tr class="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    <td class="p-2.5 pl-4 text-[10px] font-bold ${mData.category === 'Без категории' ? 'text-slate-400 italic' : 'text-slate-600 dark:text-slate-300'} truncate max-w-[120px]" title="${mData.category}">↳ ${mData.category} ${aiBadge}</td>
                    <td class="p-2.5 text-center text-[10px]"><span class="font-black text-indigo-600">${mData.total}</span> / ${expectedHtml}</td>
                    <td class="p-2.5 text-center align-middle">${isdHtml}</td>
                    <td class="p-2.5 text-center align-middle">${statusBadge}</td>
                    <td class="p-2.5 text-center text-[10px] font-bold align-middle whitespace-nowrap">
                        <span class="text-slate-500" title="Открыто">О: ${mData.open}</span> | 
                        <span class="${overColor}" title="Просрочено">П: ${mData.overdue}</span> | 
                        <span class="${avgColor}" title="Ср. дней на закрытие">С: ${avgClose}</span>
                    </td>
                </tr>
            `;
        });
    });

    let linkedHtml = '';
    let unlinkedHtml = '';
    const sortedContrs = Object.keys(contrMap).sort((a, b) => contrMap[b].total - contrMap[a].total);

    sortedContrs.forEach(cName => {
        const data = contrMap[cName];
        const isLinked = rbiContractors.includes(cName.toLowerCase().trim()) || Object.values(window.skContractorMap).includes(cName);

        const linkBadge = isLinked
            ? `<span class="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1 w-fit"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"></path></svg> Связан с RBI</span>`
            : `<span class="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit"><svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> Без связи</span>`;

        const overduePerc = data.total > 0 ? Math.round((data.overdueCount / data.total) * 100) : 0;
        const avgOverdueDepth = data.overdueDaysArr.length > 0 ? Math.round(data.overdueDaysArr.reduce((a, b) => a + b, 0) / data.overdueDaysArr.length) : 0;
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

        const topDefects = Object.keys(data.defects).map(text => ({ text, count: data.defects[text] })).sort((a, b) => b.count - a.count).slice(0, 3);
        let topDefectsHtml = topDefects.length > 0 && topDefects[0].count > 1
            ? topDefects.filter(d => d.count > 1).map(d => {
                // Ищем норматив для этого текста в исходных записях
                const recMatch = activeRecords.find(r => r.contractor === cName && r.text && r.text.toLowerCase().includes(d.text.replace('...', '').toLowerCase()));
                const stdBadge = (recMatch && recMatch.standards && recMatch.standards.length > 0)
                    ? `<div class="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded w-fit mt-1">${recMatch.standards.join(', ')}</div>`
                    : '';
                return `<div class="flex items-start gap-2 mb-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5"><span class="bg-orange-100 text-orange-700 px-1.5 rounded text-[9px] font-black shrink-0 mt-0.5">${d.count} раз</span><div class="flex-1 min-w-0"><span class="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">${d.text}</span>${stdBadge}</div></div>`;
            }).join('')
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
    // === АВТОЗАКРЫТИЕ ЗАДАЧИ "Анализ проблем ПК СК" (Если сигналов больше нет) ===
    if (skIssues.isd.length === 0 && skIssues.open.length === 0 && skIssues.cmi.length === 0) {
        if (typeof window.rbi_tasksData !== 'undefined') {
            const staleTask = window.rbi_tasksData.find(t =>
                t.title === 'Анализ проблем ПК СК' && t.status === 'pending'
            );
            if (staleTask) {
                staleTask.status = 'done';
                staleTask.done = 1;
                staleTask.resultComment = 'Показатели в норме';
                staleTask.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') dbPut(STORES.TASKS, staleTask);
            }
        }
    }
    // === КОНСОЛИДАЦИЯ ЗАДАЧ (СОЗДАНИЕ ОДНОЙ ЕДИНОЙ) ===
    // Если сигналов нет — закрываем задачу если она висит
    if (skIssues.isd.length === 0 && skIssues.open.length === 0 && skIssues.cmi.length === 0) {
        if (typeof window.rbi_tasksData !== 'undefined') {
            const staleTask = window.rbi_tasksData.find(t =>
                t.title === 'Анализ проблем ПК СК' && t.status === 'pending'
            );
            if (staleTask) {
                staleTask.status = 'done';
                staleTask.done = 1;
                staleTask.resultComment = 'Показатели в норме';
                staleTask.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') dbPut(STORES.TASKS, staleTask);
            }
        }
    }
    if ((skIssues.isd.length > 0 || skIssues.open.length > 0 || skIssues.cmi.length > 0) && typeof window.rbi_tasksData !== 'undefined') {
        const taskTitle = 'Анализ проблем ПК СК';
        // --- УДАЛЯЕМ СТАРЫЕ АКТИВНЫЕ ЗАДАЧИ ЭТОГО ТИПА ПЕРЕД СОЗДАНИЕМ НОВОЙ ---
        window.rbi_tasksData.forEach(t => {
            if (t.title === taskTitle && t.status === 'pending') {
                t._deleted = true;
                t.updatedAt = new Date().toISOString();
                if (typeof dbPut === 'function') dbPut('rbi_tasks', t);
            }
        });
        window.rbi_tasksData = window.rbi_tasksData.filter(t => !t._deleted);
        // -----------------------------------------------------------------------


        let promptLines = [];
        if (skIssues.isd.length > 0) promptLines.push(`🚨 Низкий ИСД (скрывают брак):\n- ${[...new Set(skIssues.isd)].join('\n- ')}`);
        if (skIssues.open.length > 0) promptLines.push(`⚠️ Много открытых замечаний:\n- ${[...new Set(skIssues.open)].join('\n- ')}`);
        if (skIssues.cmi.length > 0) promptLines.push(`⏱ Низкий Индекс Зрелости (срывы сроков):\n- ${[...new Set(skIssues.cmi)].join('\n- ')}`);

        const fullPrompt = "Выявлены проблемы по СВЯЗАННЫМ подрядчикам в Стройконтроле:\n\n" + promptLines.join('\n\n');

        const newTask = {
            id: 'tsk_sk_cons_' + Date.now().toString(36),
            type: 'auto', category: 'meeting',
            engineerName: document.getElementById('inp-inspector')?.value.trim() || 'Инженер', // <-- ДОБАВЛЕНО
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
        if (typeof dbPut === 'function') dbPut('rbi_tasks', newTask);

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    }
    // --- ПРОСТРАНСТВЕННЫЙ АНАЛИЗ (ПО ЭТАЖАМ И СЕКЦИЯМ) ---
    const spatialMap = {};
    activeRecords.forEach(r => {
        if (!r.block || !r.floor || r.canonical_key === 'unknown') return; // Игнорируем нераспарсенные

        const objKey = r.display_name;
        if (!spatialMap[objKey]) spatialMap[objKey] = {};
        if (!spatialMap[objKey][r.block]) spatialMap[objKey][r.block] = {};
        if (!spatialMap[objKey][r.block][r.floor]) spatialMap[objKey][r.block][r.floor] = { total: 0, open: 0, overdue: 0 };

        const cell = spatialMap[objKey][r.block][r.floor];
        cell.total++;
        if (isIssueOpen(r)) cell.open++;
        const deadline = r.deadline ? new Date(r.deadline) : null;
        if (deadline && isIssueOpen(r) && new Date() > deadline) cell.overdue++;
    });

    let spatialHtml = '';
    Object.keys(spatialMap).forEach(objKey => {
        spatialHtml += `<div class="text-[11px] font-black uppercase text-slate-800 dark:text-white mt-4 mb-2 border-b border-[var(--card-border)] pb-1">🏢 Объект: ${objKey}</div>`;

        Object.keys(spatialMap[objKey]).sort().forEach(blockName => {
            const blockData = spatialMap[objKey][blockName];

            // Собираем этажи и сортируем как числа (учитывая минусовые)
            const floors = Object.keys(blockData).sort((a, b) => {
                const numA = parseInt(a); const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) return numB - numA; // Сверху вниз
                return a.localeCompare(b);
            });

            let tableRows = '';
            floors.forEach(floor => {
                const cell = blockData[floor];
                let bgColor = 'bg-green-50 text-green-700'; // Мало замечаний
                if (cell.total > 15) bgColor = 'bg-red-100 text-red-800 font-black'; // Много
                else if (cell.total > 5) bgColor = 'bg-yellow-50 text-yellow-700 font-bold'; // Средне

                tableRows += `
                <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-[var(--hover-bg)]">
                    <td class="p-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 text-center w-16">Эт. ${floor}</td>
                    <td class="p-2 text-center text-[11px] ${bgColor}">${cell.total}</td>
                    <td class="p-2 text-center text-[10px] font-bold text-slate-500">О: ${cell.open} | <span class="${cell.overdue > 0 ? 'text-red-500' : 'text-slate-400'}">П: ${cell.overdue}</span></td>
                </tr>`;
            });

            spatialHtml += `
            <div class="mb-3 bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden">
                <div class="bg-[var(--hover-bg)] p-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 border-b border-[var(--card-border)]">${blockName}</div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left whitespace-nowrap">
                        <thead class="bg-slate-50 dark:bg-slate-900/50 text-[9px] text-slate-400 uppercase">
                            <tr>
                                <th class="p-2 text-center border-r border-slate-100 dark:border-slate-800">Уровень</th>
                                <th class="p-2 text-center">Всего замечаний</th>
                                <th class="p-2 text-center">Открыто / Просрочено</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>`;
        });
    });

    if (!spatialHtml) spatialHtml = '<div class="text-center py-4 text-slate-400 text-[10px] font-bold uppercase">Данные о расположении отсутствуют. При импорте убедитесь, что колонка "Элемент структуры" связана корректно.</div>';
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center">
                <div class="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1">Всего замечаний СК</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">${totalIssues}</div>
            </div>
            <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 p-3 rounded-xl shadow-sm text-center">
                <div class="text-[9px] font-bold uppercase text-red-600 dark:text-red-400 tracking-widest mb-1">Открыто сейчас</div>
                <div class="text-2xl font-black text-red-600 dark:text-red-400">${totalOpen}</div>
            </div>
        </div>
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 p-4">
            <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5"><svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Самые нарушаемые нормативы</h3>
            <div class="flex flex-wrap gap-2">
                ${Object.keys(standardsMap).length > 0
            ? Object.keys(standardsMap).sort((a, b) => standardsMap[b] - standardsMap[a]).slice(0, 8).map(std => `
                        <div class="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-lg cursor-pointer active:scale-95 transition-transform" onclick="switchTab('tab-reference'); setTimeout(() => { const btns = document.querySelectorAll('.sub-tab-btn'); if (btns[1]) switchReferenceSubTab('ref-sub-docs', btns[1]); const s = document.getElementById('doc-search-input'); if(s) {s.value='${std}'; renderDocsList();} }, 300);">
                            <span class="text-[11px] font-black text-blue-700 dark:text-blue-400">${std}</span>
                            <span class="text-[9px] font-bold bg-white dark:bg-slate-800 text-slate-500 px-1.5 rounded-md shadow-sm border border-blue-100 dark:border-blue-900">${standardsMap[std]}</span>
                        </div>
                    `).join('')
            : '<div class="text-[10px] font-bold text-slate-400">В текстах замечаний нет ссылок на ГОСТ/СП.</div>'
        }
            </div>
        </div>
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg> Матрица Рисков (ИСД) <button onclick="event.stopPropagation(); sk_showInfoModal('isd')" class="text-indigo-400 hover:text-indigo-600 active:scale-95 transition-transform ml-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button></span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="overflow-x-auto custom-scrollbar max-h-[60vh]">
                <table class="w-full text-left whitespace-nowrap">
                    <thead class="bg-slate-50 dark:bg-slate-900 text-[9px] text-[var(--text-muted)] uppercase sticky top-0 shadow-sm z-10 font-bold">
                        <tr>
                            <th class="p-2.5 pl-4">Подрядчик / Вид работ</th>
                            <th class="p-2.5 text-center" title="Сколько выдали СК / Сколько ожидаем по статистике">Факт / Ожидание</th>
                            <th class="p-2.5 text-center">ИСД</th>
                            <th class="p-2.5 text-center">Вывод</th>
                            <th class="p-2.5 text-center" title="О: Открыто | П: Просрочено | С: Ср.дней закрытия">Статус исполнения</th>
                        </tr>
                    </thead>
                    <tbody>${matrixRows}</tbody>
                </table>
            </div>
        </details>
        
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> Пространственный анализ (Этажи)</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                ${spatialHtml}
            </div>
        </details>
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg> Тренд открытых замечаний</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-3" style="height: 180px; position: relative; width: 100%;">
                <canvas id="sk-trend-chart"></canvas>
            </div>
        </details>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"></path></svg> Связано с проверками RBI</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50">
                ${linkedHtml || `<div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Связанных подрядчиков не найдено</div>`}
            </div>
        </details>

        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><svg class="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> Изолированный анализ (Без связи)</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50">
                ${unlinkedHtml || `<div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Все подрядчики связаны с RBI</div>`}
            </div>
        </details>
    `;

    setTimeout(() => {
        const ctxTrend = document.getElementById('sk-trend-chart');
        if (ctxTrend) {
            // 1. Собираем уникальные месяцы из date_issued
            const monthsSet = new Set();
            activeRecords.forEach(r => {
                if (r.date_issued) {
                    const d = new Date(r.date_issued);
                    const monthKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
                    monthsSet.add(monthKey);
                }
            });
            const sortedMonths = Array.from(monthsSet).sort();

            const labels = [];
            const dataOpen = []; // Сколько висело открытых на конец месяца
            const dataNew = [];  // Сколько было выдано за месяц

            sortedMonths.forEach(mKey => {
                // Конец месяца
                const [year, month] = mKey.split('-');
                const endOfMonth = new Date(year, month, 0, 23, 59, 59);
                const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);

                // Красивый лейбл: "Янв '24"
                labels.push(endOfMonth.toLocaleString('ru-RU', { month: 'short', year: '2-digit' }));

                let openCount = 0;
                let newCount = 0;

                activeRecords.forEach(r => {
                    if (!r.date_issued) return;
                    const issued = new Date(r.date_issued);
                    const resolved = r.date_resolved ? new Date(r.date_resolved) : null;

                    // Новые за этот месяц
                    if (issued >= startOfMonth && issued <= endOfMonth) newCount++;

                    // Открытые на конец этого месяца
                    // (Выданы до конца месяца И (Ещё не закрыты ИЛИ закрыты после конца месяца))
                    if (issued <= endOfMonth && (!resolved || resolved > endOfMonth)) {
                        openCount++;
                    }
                });

                dataOpen.push(openCount);
                dataNew.push(newCount);
            });

            if (window.skTrendChartInstance) window.skTrendChartInstance.destroy();
            window.skTrendChartInstance = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Открыто на конец мес.',
                            data: dataOpen,
                            borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3
                        },
                        {
                            label: 'Выдано новых',
                            data: dataNew,
                            borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0)',
                            borderWidth: 2, borderDash: [5, 5], pointRadius: 3, fill: false, tension: 0.3
                        }
                    ]
                },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }, 100);
};

// === ИЗВЛЕЧЕНИЕ НОРМАТИВОВ (ГОСТ, СП, СНиП) ===
function sk_extractStandards(text) {
    if (!text) return [];
    // Ищем паттерны: СП 70.13330, ГОСТ Р 12345-2000, СНиП 3.03.01-87
    const regex = /(СП\s*\d+(\.\d+)*|ГОСТ\s*[Р]?\s*\d+(-\d+)?|СНиП\s*\d+(\.\d+)*(-\d+)?)/gi;
    const matches = text.match(regex);
    if (!matches) return [];

    // Очищаем от лишних пробелов и уникализируем
    const unique = [...new Set(matches.map(m => m.replace(/\s+/g, ' ').toUpperCase()))];
    return unique;
}

// === HR-ПАНЕЛЬ ИНЖЕНЕРОВ СК ===
// === HR-ПАНЕЛЬ ИНЖЕНЕРОВ СК ===
window.sk_renderHrTab = function () {
    const container = document.getElementById('sk-view-hr');
    if (!container) return;
    // --- ПРОВЕРКА РОЛИ ---
    const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
    const isManagement = ['project_manager', 'deputy_manager', 'director', 'manager'].includes(role);
    if (!isManagement) {
        container.innerHTML = `<div class="text-center py-6 text-red-500 text-[11px] font-bold uppercase border border-red-200 bg-red-50 rounded-xl">Доступно только руководству</div>`;
        return;
    }

    if (window.skRecords.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold uppercase border border-dashed border-[var(--card-border)] rounded-xl">Нет данных</div>`;
        return;
    }

    // Собираем статистику по инженерам СК
    const engMap = {};
    window.skRecords.forEach(r => {
        let baseName = r.inspector && r.inspector.trim() !== '' ? r.inspector.trim() : 'Не указан в выгрузке';
        const engName = baseName.toLowerCase().includes('технадзор') ? baseName : `${baseName} (Технадзор)`;

        if (!engMap[engName]) {
            engMap[engName] = { total: 0, open: 0, overdue: 0, withCategory: 0, closingTimes: [], contractors: new Set() };
        }

        const data = engMap[engName];
        data.total++;
        if (r.contractor) data.contractors.add(r.contractor);

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

    // Расчет корреляции с RBI (выявляем проблемных подрядчиков из RBI)
    const rbiBadContractors = new Set();
    const groupedRBI = {};
    contractorArray.forEach(c => { groupedRBI[c.contractorName] = groupedRBI[c.contractorName] || []; groupedRBI[c.contractorName].push(c); });

    for (let cName in groupedRBI) {
        const m = getContractorMetrics(groupedRBI[cName], typeof userTemplates !== 'undefined' ? userTemplates : {});
        if (m && (m.finalC < 85 || m.n_изделий_с_B3 > 0)) {
            rbiBadContractors.add(cName.toLowerCase()); // Подрядчик в желтой или красной зоне
        }
    }

    const engArray = Object.keys(engMap).map(name => {
        const d = engMap[name];
        const avgTime = d.closingTimes.length > 0 ? Math.round(d.closingTimes.reduce((a, b) => a + b, 0) / d.closingTimes.length) : 0;
        const overduePerc = d.total > 0 ? Math.round((d.overdue / d.total) * 100) : 0;
        const catPerc = d.total > 0 ? Math.round((d.withCategory / d.total) * 100) : 0;

        // Корреляция с RBI (сколько выданных замечаний приходится на проблемных подрядчиков)
        let rbiHits = 0;
        d.contractors.forEach(c => {
            const linkedName = window.skContractorMap[c] || c;
            if (rbiBadContractors.has(linkedName.toLowerCase())) rbiHits++;
        });
        const correlation = d.contractors.size > 0 ? Math.round((rbiHits / d.contractors.size) * 100) : 0;

        let kpi = Math.max(0, 100 - overduePerc + (catPerc === 100 ? 10 : 0));
        return { name, total: d.total, open: d.open, overduePerc, catPerc, avgTime, kpi, correlation };
    });

    engArray.sort((a, b) => b.kpi - a.kpi);

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
            <td class="p-2 text-center text-[11px] font-bold ${e.correlation >= 70 ? 'text-green-600' : (e.correlation >= 40 ? 'text-orange-500' : 'text-red-500')}">${e.correlation}%</td>
            <td class="p-2 text-center text-[12px] font-black ${e.kpi >= 80 ? 'text-green-600' : 'text-red-500'}">${e.kpi}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4">
            <div class="p-3 bg-[var(--hover-bg)] border-b border-[var(--card-border)] flex items-center justify-between">
                <div>
                    <div class="font-black text-[12px] uppercase text-slate-800 dark:text-white flex items-center gap-1">Рейтинг инженеров СК (KPI)</div>
                    <div class="text-[9px] text-slate-500 mt-1">
                        Оценка на основе официальных предписаний: <br>
                        <b>KPI = 100 - %Просрочки + Бонусы.</b><br>
                        Колонка <b>"Связь с RBI"</b> показывает, насколько фокус инженера СК совпадает с "красными зонами", которые выявила ваша система аудитов.
                    </div>
                </div>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left whitespace-nowrap">
                    <thead class="bg-slate-50 dark:bg-slate-900 text-[9px] text-[var(--text-muted)] uppercase">
                        <tr>
                            <th class="p-2.5">Инженер</th>
                            <th class="p-2.5 text-center" title="Сколько всего замечаний выдал">Выдал</th>
                            <th class="p-2.5 text-center" title="Доля просроченных замечаний">Просрочка</th>
                            <th class="p-2.5 text-center" title="В среднем дней на устранение">Ср. Время</th>
                            <th class="p-2.5 text-center" title="Насколько совпадает фокус инженера СК с риск-зонами, которые выявила система RBI">Связь с RBI</th>
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
window.sk_showInfoModal = function (type) {
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
    const record = window.skRecords.find(r => String(r.id) === String(recordId));
    if (!record) return;

    if (!sk_canDeleteRecord(record)) {
        return showToast("⚠️ Инженер может удалить только свои записи ПК СК. Остальные роли не имеют права удаления.");
    }

    const role = sk_getCurrentRole();
    const confirmText = ['manager', 'deputy_manager'].includes(role)
        ? "Удалить это замечание ПК СК? У вас есть право удалить любую запись."
        : "Удалить это замечание ПК СК? Вы можете удалять только свои загруженные записи.";

    if (!confirm(confirmText)) return;

    record._deleted = true;
    record._updatedAt = new Date().toISOString();
    record.updated_at = record._updatedAt;

    record.source = 'local';
    record.syncStatus = 'not_synced';
    record.sync_status = 'not_synced';

    await dbPut(STORES.SK_RECORDS, record);

    window.skRecords = window.skRecords.filter(r => String(r.id) !== String(recordId));

    sk_renderDashboard();

    localStorage.setItem('rbi_cloud_dirty', '1');

    if (typeof triggerSync === 'function') {
        triggerSync('silent');
    }

    showToast("🗑️ Замечание ПК СК удалено");
};