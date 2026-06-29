/* Файл: js/etalon.js (Модуль Акта-Эталона) */

let currentEtalonContext = {
    contractor: '',
    templateKey: '',
    templateTitle: '',
    statusKey: '',
    elements: []
};

let etalonElementCounter = 0;
let currentEtalonUploadId = null;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
window.openEtalonConstructor = function(contractor, templateKey, templateTitle, projectName, statusKey) { // <-- ДОБАВЛЕНО projectName
    currentEtalonContext = {
        contractor: contractor,
        templateKey: templateKey,
        templateTitle: templateTitle,
        projectName: projectName, // <-- НОВОЕ ПОЛЕ
        statusKey: statusKey,
        elements: []
    };
    etalonElementCounter = 0;

    // Сброс полей
    document.getElementById('etalon-location').value = '';
    document.getElementById('etalon-participants').value = document.getElementById('inp-inspector')?.value || '';
    document.getElementById('etalon-deviations').value = '';
    document.getElementById('etalon-elements-container').innerHTML = '';

    document.getElementById('etalon-title-text').innerText = `${projectName} | ${contractor} | ${templateTitle}`;
    // === НОВОЕ: Заполняем выпадающий список видов работ ===
    const tmplSelect = document.getElementById('etalon-template');
    let tmplOpts = '<option value="" disabled selected>-- Выберите вид работ --</option>';
    
    // Сортируем системные чек-листы по алфавиту
    const sysKeys = Object.keys(SYSTEM_TEMPLATES).sort((a, b) => SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title));
    sysKeys.forEach(k => tmplOpts += `<option value="sys_${k}">[СИС] ${SYSTEM_TEMPLATES[k].title}</option>`);
    
    // Сортируем пользовательские чек-листы
    if (typeof userTemplates !== 'undefined') {
        const userKeys = Object.keys(userTemplates).sort((a, b) => userTemplates[a].title.localeCompare(userTemplates[b].title));
        userKeys.forEach(k => tmplOpts += `<option value="user_${k}">[МОЙ] ${userTemplates[k].title}</option>`);
    }
    tmplSelect.innerHTML = tmplOpts;

    // === Заполняем поля значениями ===
    document.getElementById('etalon-project').value = projectName || document.getElementById('inp-project')?.value || '';
    document.getElementById('etalon-contractor').value = contractor || '';
    if (templateKey) tmplSelect.value = templateKey;

    // Активируем умные выпадающие списки (история ввода) для Объекта и Подрядчика
    if (typeof initSmartInput === 'function') {
        initSmartInput('etalon-project', 'projectName');
        initSmartInput('etalon-contractor', 'contractorName');
    }

    // Делаем красивый заголовок в зависимости от того, откуда открыли
    if (contractor && templateTitle) {
        document.getElementById('etalon-title-text').innerText = `${projectName || 'Объект'} | ${contractor}`;
    } else {
        document.getElementById('etalon-title-text').innerText = `Новый Акт-Эталон`;
    }
    // Добавляем первый пустой элемент по умолчанию
    addEtalonElement();
    // === ДОБАВЛЯЕМ КНОПКУ ЗАГРУЗКИ PDF ===
    const pdfBlockHtml = `
        <div id="etalon-pdf-wrap" class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div class="font-black text-[10px] text-indigo-500 uppercase tracking-widest mb-2">Готовый PDF-Акт (Опционально)</div>
            <div id="etalon-pdf-preview" data-pdf="" class="hidden mb-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl flex justify-between items-center">
                <div class="min-w-0 pr-3">
                    <div class="text-[11px] font-black text-slate-800 dark:text-white truncate" id="etalon-pdf-name">doc.pdf</div>
                </div>
                <button onclick="window.removeEtalonPdf()" class="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-red-500 font-black shadow-sm border border-slate-200 active:scale-90 shrink-0">✕</button>
            </div>
            <button id="etalon-pdf-upload-btn" onclick="document.getElementById('etalon-pdf-input').click()" class="w-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">
                📄 Прикрепить готовый PDF
            </button>
            <input type="file" id="etalon-pdf-input" accept="application/pdf" class="hidden" onchange="window.handleEtalonPdfUpload(event)">
        </div>
    `;
    document.getElementById('etalon-elements-container').insertAdjacentHTML('afterend', pdfBlockHtml);
    // ИСПРАВЛЕНИЕ: Динамически внедряем кнопки "Сохранить" и "Печать"
    const headerContainer = document.getElementById('etalon-title-text').parentElement;
    headerContainer.innerHTML = `
        <button onclick="closeEtalonConstructor()" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg transition-colors shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg> Назад
        </button>
        <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest text-center flex-1 truncate px-2" id="etalon-title-text">${projectName} | ${contractor} | ${templateTitle}</div>
        <div class="flex gap-1.5 shrink-0">
            <button onclick="saveEtalonAct(false)" class="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg active:scale-95 shadow-sm transition-colors">Сохранить</button>
            <button onclick="saveEtalonAct(true)" class="text-[10px] font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg active:scale-95 shadow-md transition-colors flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button>
        </div>
    `;
    const view = document.getElementById('etalon-constructor-view');
    view.classList.remove('hidden');
    document.body.classList.add('modal-open');
    view.scrollTo(0, 0);
};

window.closeEtalonConstructor = function() {
    document.getElementById('etalon-constructor-view').classList.add('hidden');
    document.body.classList.remove('modal-open');
};

window.addEtalonElement = function() {
    etalonElementCounter++;
    const elId = `etalon-el-${etalonElementCounter}`;
    
    const html = `
        <div id="${elId}" class="etalon-item bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative mb-3">
            <button onclick="document.getElementById('${elId}').remove()" class="absolute top-2 right-2 text-red-400 active:scale-90 font-black text-sm px-2">✕</button>
            <div class="font-black text-[10px] text-indigo-500 uppercase tracking-widest mb-2">Элемент эталона</div>
            
            <input type="text" class="etalon-el-name input-base text-[12px] mb-2 font-bold" placeholder="Название (напр: Устройство швов)">
            <textarea class="etalon-el-desc input-base text-[11px] h-12 resize-none mb-2" placeholder="Описание выполнения..."></textarea>
            
            <div class="etalon-photo-container" data-photo="">
                <button onclick="triggerEtalonPhotoUpload('${elId}')" class="w-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">
                    📸 Прикрепить фото узла
                </button>
            </div>
        </div>
    `;
    document.getElementById('etalon-elements-container').insertAdjacentHTML('beforeend', html);
};

window.triggerEtalonPhotoUpload = function(elId) {
    currentEtalonUploadId = elId;
    window.activePhotoContext = 'etalon'; // Говорим системе, что фото идет в Эталон
    document.getElementById('photo-source-modal').style.display = 'flex'; // Открываем выбор: Камера/Галерея
};

// Функция, которая вызывается ПОСЛЕ того, как инженер порисовал на фото и нажал "Сохранить"
window.saveEtalonMarkupPhoto = async function() {
    if (!editorCanvas || !currentEtalonUploadId) return;
    
    // Получаем картинку с рисунками
    const base64 = editorCanvas.toDataURL('image/jpeg', 0.85);
    showToast("⚙️ Сохранение фото в базу...");
    
    // Мгновенно сохраняем в бинарную базу данных телефона
    const localUrl = await PhotoManager.saveLocal(base64, 'etalon');
    
    const container = document.getElementById(currentEtalonUploadId).querySelector('.etalon-photo-container');
    container.dataset.photo = localUrl;

const displayUrl = localUrl.startsWith('local://')
    ? (await PhotoManager.getAsyncUrl(localUrl) || window.getPhotoSrc(localUrl))
    : window.getPhotoSrc(localUrl);
    
container.innerHTML = `
    <div class="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 dark:bg-slate-900 mt-2">
        <img src="${displayUrl}" class="w-full h-full object-contain cursor-pointer active:scale-95 transition-transform" onclick="setTimeout(() => openPhotoViewer('${localUrl}'), 100)">
        <button onclick="removeEtalonPhoto('${currentEtalonUploadId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md active:scale-90">✕</button>
    </div>`;
        
    showToast("📸 Фото эталона сохранено!");
    cancelPhotoEditor(); // Закрываем редактор
};

window.removeEtalonPhoto = function(elId) {
    const container = document.getElementById(elId).querySelector('.etalon-photo-container');
    container.dataset.photo = '';
    container.innerHTML = `
        <button onclick="triggerEtalonPhotoUpload('${elId}')" class="w-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">
            📸 Прикрепить фото (Камера / Галерея)
        </button>`;
};


window.saveEtalonAct = async function(printAfter = false) {
    // Считываем значения из новых полей
    const selProject = document.getElementById('etalon-project').value.trim();
    const selContractor = document.getElementById('etalon-contractor').value.trim();
    const selTemplateKey = document.getElementById('etalon-template').value;
    const selTemplateTitle = document.getElementById('etalon-template').options[document.getElementById('etalon-template').selectedIndex]?.text.replace(/\[.*?\]\s*/, '') || '';

    const location = document.getElementById('etalon-location').value.trim();
    const participants = document.getElementById('etalon-participants').value.trim();
    const deviations = document.getElementById('etalon-deviations').value.trim() || 'Отклонений не выявлено';
    const myName = typeof appSettings !== 'undefined' ? (appSettings.engineerName || 'Инженер') : 'Инженер';
    
    if (!selProject || !selContractor || !selTemplateKey) return showToast("⚠️ Укажите Объект, Подрядчика и Вид работ!");
    if (!location || !participants) return showToast("⚠️ Заполните локацию и участников!");

    const elements = [];
    document.querySelectorAll('.etalon-item').forEach(el => {
        const name = el.querySelector('.etalon-el-name').value.trim();
        const desc = el.querySelector('.etalon-el-desc').value.trim();
        const photo = el.querySelector('.etalon-photo-container').dataset.photo || null;
        if (name) elements.push({ name, desc, photo });
    });

    if (elements.length === 0) return showToast("⚠️ Добавьте хотя бы один элемент эталона!");

    let etalonId = window.currentEditingEtalonId || String(Date.now() + Math.floor(Math.random() * 1000));

    const etalonRecord = {
        id: etalonId,
        owner: myName, // Для синхронизации прав
        date: new Date().toISOString(), 
        projectName: selProject, // Строго берем из поля Объект
        inspectorName: myName, 
        contractorName: selContractor, // Строго берем из поля Подрядчик
        templateKey: selTemplateKey, 
        templateTitle: selTemplateTitle, 
        location: location, 
        instanceId: "etalon", 
        stageId: 0, 
        stageName: "Акт-Эталон",
        checkedStagesInfo: ["Фиксация эталона"], 
        isCompleted: true,
        state: { '9901': 'ok' }, 
        photos: {},
        details: { 
            participants: participants, 
            deviations: deviations, 
            elements: elements,
            pdfData: document.getElementById('etalon-pdf-preview')?.dataset.pdf || null,
            pdfName: document.getElementById('etalon-pdf-name')?.innerText || ''
        },
        metrics: { final: 100, baseUrkPerc: 100, checkedCount: 1, totalCount: 1, n_B1_fail: 0, n_B2_fail: 0, n_B3_fail: 0, kc: 1, kcrit: 1, statusTxt: "ЭТАЛОН", statusCls: "tag-blue" },
        source: 'local',
        syncStatus: 'not_synced',
        sync_status: 'not_synced',
        syncBlockReason: '',
        sync_block_reason: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        is_deleted: false,
        _deleted: false
    };

    // Сохраняем ТОЛЬКО в массив эталонов
    const idx = etalonActsArray.findIndex(x => String(x.id) === String(etalonId));
    if (idx !== -1) {
        etalonActsArray[idx] = etalonRecord;
    } else {
        etalonActsArray.push(etalonRecord);
    }
    await dbPut(STORES.ETALON_ACTS, etalonRecord);
    window.currentEditingEtalonId = null; // Сбрасываем ID
    
    if (currentEtalonContext.statusKey && weeklyPlanData.tasks) {
        const task = weeklyPlanData.tasks.find(t => t.statusKey === currentEtalonContext.statusKey);
        if (task) {
            task.needsEtalon = false;
            if (contractorStatuses[task.statusKey]) contractorStatuses[task.statusKey].etalonCompleted = true;
            await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
        }
    }

    if (typeof gameLogAction === 'function') gameLogAction('etalon_accepted', etalonRecord.id);
    // АВТОЗАКРЫТИЕ ЗАДАЧИ ЭТАЛОНА
    if (typeof window.rbi_tasksData !== 'undefined') {
        const etalTasks = window.rbi_tasksData.filter(t => 
            (t.taskType === 'Эталон' || t.title.includes('Эталон')) && 
            t.contractor === etalonRecord.contractorName && 
            (t.templateKey === etalonRecord.templateKey || t.templateTitle === etalonRecord.templateTitle || t.workTitle === etalonRecord.templateTitle) &&
            t.status === 'pending'
        );
        for (let t of etalTasks) {
            t.status = 'done';
            t.done = 1;
            t.resultComment = 'Акт-Эталон сохранен';
            t.updatedAt = new Date().toISOString();
            if (typeof dbPut === 'function') await dbPut(STORES.TASKS, t);
        }
        if (etalTasks.length > 0 && typeof rbi_renderTasksList === 'function') {
            rbi_renderTasksList();
        }
    }
             showToast("✅ Акт-Эталон успешно сохранен!");
    localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') {
        setTimeout(() => triggerSync('silent'), 800); // даём время фото сохраниться в IndexedDB
    }
    
    // Если нажали кнопку "Печать" — открываем PDF
    if (printAfter) {
        setTimeout(() => { printEtalonAct(etalonRecord.id); }, 500);
    } else {
        closeEtalonConstructor();
    }
    
    // ИСПРАВЛЕНИЕ: Принудительно обновляем все кэши, чтобы Эталон мгновенно появился везде!
    setTimeout(() => {
        if (typeof gameCalculateAllProfiles === 'function') gameCalculateAllProfiles();
        if (typeof gameRenderDashboard === 'function') gameRenderDashboard();
        if (typeof rbi_renderImpactTab === 'function') rbi_renderImpactTab();
        if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
        if (typeof renderHistoryTab === 'function') renderHistoryTab();
        if (typeof rbi_renderPracticesTab === 'function') rbi_renderPracticesTab(); // <-- ВОТ ЭТА СТРОКА
    }, 200);
};



window.openEtalonViewer = async function(id, retries = 3) {
    // Пытаемся получить из IndexedDB
    let record = await dbGet(STORES.ETALON_ACTS, id);
    if (!record && retries > 0) {
        await new Promise(r => setTimeout(r, 150));
        return openEtalonViewer(id, retries - 1);
    }
    if (!record) {
        record = etalonActsArray.find(c => String(c.id) === String(id));
        if (!record) {
            showToast("❌ Ошибка: Эталон не найден в базе данных");
            return;
        }
    }
    // Обновляем массив
    const idx = etalonActsArray.findIndex(c => String(c.id) === String(id));
    if (idx !== -1) etalonActsArray[idx] = record;
    else etalonActsArray.push(record);

    const d = record.details || {};
    const elements = d.elements || [];

    let elementsHtml = '';
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        let realPhoto = null;
if (el.photo) {
    if (el.photo.startsWith('cloud://') || el.photo.startsWith('local://')) {
        realPhoto = await PhotoManager.getAsyncUrl(el.photo);
    } else {
        realPhoto = window.getPhotoSrc(el.photo);
    }
}
        let photoHtml = realPhoto 
            ? `<img src="${realPhoto}" class="w-full h-48 object-contain rounded-lg border border-slate-200 cursor-pointer mt-2 bg-slate-50" onclick="openPhotoViewer('${el.photo}')">` 
            : '<div class="text-xs text-slate-400 mt-2">Нет фото</div>';
        
        elementsHtml += `
            <div class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-3">
                <div class="font-black text-[12px] text-slate-800 dark:text-white uppercase mb-1">${i + 1}. ${escapeHtml(el.name || 'Без названия')}</div>
                <div class="text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-medium">${escapeHtml(el.desc || 'Нет описания')}</div>
                ${photoHtml}
            </div>
        `;
    }

    const bodyHtml = `
        <div class="text-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div class="text-[12px] font-bold text-slate-500 uppercase leading-tight mb-0.5">${escapeHtml(record.projectName || 'Без проекта')}</div>
            <div class="text-[14px] font-black text-slate-800 dark:text-white uppercase leading-tight mb-1">${escapeHtml(record.contractorName)}</div>
            <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">${escapeHtml(record.templateTitle)}</div>
            <div class="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">${new Date(record.date).toLocaleString('ru-RU')}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Локация</div>
                <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">${escapeHtml(record.location || '-')}</div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Участники</div>
                <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">${escapeHtml(d.participants || '-')}</div>
            </div>
        </div>

        <div class="bg-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-50 p-3 rounded-xl border border-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-200 mb-4">
            <div class="text-[10px] font-black uppercase text-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-700 mb-1 tracking-widest">Отклонения и допущения:</div>
            <div class="text-[11px] font-medium text-${d.deviations !== 'Отклонений не выявлено' ? 'orange' : 'green'}-900 whitespace-pre-wrap">${escapeHtml(d.deviations)}</div>
        </div>

        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Зафиксированные элементы</h3>
        ${elementsHtml}
    `;

    document.getElementById('etalon-view-body').innerHTML = bodyHtml;
    // Если прикреплен PDF, выводим кнопку для его открытия
    if (d.pdfData) {
        const pdfBtnHtml = `
            <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex justify-between items-center cursor-pointer active:scale-95 transition-transform" onclick="document.getElementById('etalon-view-modal').style.display='none'; document.body.classList.remove('modal-open'); setTimeout(() => { window.openFakePdfViewer('${d.pdfData}', '${d.pdfName}'); }, 300);">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black">PDF</div>
                    <div>
                        <div class="text-[11px] font-bold text-slate-800 dark:text-white">${d.pdfName}</div>
                        <div class="text-[9px] text-slate-500">Внешний Акт-Эталон</div>
                    </div>
                </div>
                <span class="text-[10px] font-bold text-red-600 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-red-200">Открыть</span>
            </div>
        `;
        document.getElementById('etalon-view-body').insertAdjacentHTML('beforeend', pdfBtnHtml);
    }
    
    // БЕЗОПАСНАЯ ВСТАВКА 3-Х КНОПОК (БЕЗ ОШИБКИ НА ВТОРОЙ КЛИК)
    const footerDiv = document.getElementById('etalon-view-body').nextElementSibling;
    if (footerDiv) {
        footerDiv.innerHTML = `
            <div class="flex gap-2 w-full">
                <button onclick="editEtalonAct('${id}')" class="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-sm active:scale-95">✏️ Изменить</button>
                <button onclick="document.getElementById('etalon-view-modal').style.display='none'; document.body.classList.remove('modal-open'); printEtalonAct('${id}');" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95">🖨️ PDF</button>
                <button onclick="deleteEtalonAct('${id}')" class="bg-red-50 text-red-600 border border-red-200 px-4 py-3.5 rounded-xl font-black text-lg active:scale-95 shadow-sm">🗑️</button>
            </div>
        `;
    }

    const modal = document.getElementById('etalon-view-modal');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
};

window.deleteEtalonAct = async function(id) {
    const record = etalonActsArray.find(c => String(c.id) === String(id));
    // Проверяем права по owner или по inspectorName
    if (record && !RbiRoles.canDelete(record.owner || record.inspectorName)) return showToast("⚠️ Нет прав на удаление чужого эталона!");

    if(!confirm("Удалить этот Акт-Эталон?")) return;
    if (record) {
        record._deleted = true;
        record.is_deleted = true; // <-- ЖЕСТКИЙ ФЛАГ ДЛЯ ОБЛАКА
        record.updatedAt = new Date().toISOString();
        record.updated_at = record.updatedAt;
        
        // Переводим в статус "Не синхронизировано", чтобы улетело в облако
        record.source = 'local';
        record.syncStatus = 'not_synced';
        record.sync_status = 'not_synced';

        await dbPut(STORES.ETALON_ACTS, record);
        
        // ЖЕСТКАЯ ОЧИСТКА МАССИВОВ В ОЗУ ДЛЯ МГНОВЕННОГО ОБНОВЛЕНИЯ ЭКРАНА
        etalonActsArray = etalonActsArray.filter(e => !e._deleted);

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    }
    document.getElementById('etalon-view-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    showToast("🗑️ Эталон удален");
    
    // Обновляем экраны (Теперь эталоны живут в Практиках)
    if (typeof rbi_renderPracticesTab === 'function') rbi_renderPracticesTab();
    if (typeof renderHistoryTab === 'function') renderHistoryTab();
};

window.editEtalonAct = async function(id) {
    document.getElementById('etalon-view-modal').style.display = 'none';
    const record = etalonActsArray.find(c => String(c.id) === String(id));
    if (!record) return;

    window.currentEditingEtalonId = id; // Глобально запоминаем ID
    openEtalonConstructor(record.contractorName, record.templateKey, record.templateTitle, record.projectName, null); // <-- ПЕРЕДАЕМ projectName

    // Заполняем поля
    document.getElementById('etalon-location').value = record.location || '';
    document.getElementById('etalon-participants').value = record.details.participants || '';
    document.getElementById('etalon-deviations').value = record.details.deviations || '';

    // Очищаем и заполняем элементы
    document.getElementById('etalon-elements-container').innerHTML = '';
    etalonElementCounter = 0;
    
    for (let el of record.details.elements) {
        addEtalonElement();
        const elId = `etalon-el-${etalonElementCounter}`;
        const node = document.getElementById(elId);
        node.querySelector('.etalon-el-name').value = el.name || '';
        node.querySelector('.etalon-el-desc').value = el.desc || '';
        
        if (el.photo) {
            const realPhotoSrc = await PhotoManager.getAsyncUrl(el.photo) || window.getPhotoSrc(el.photo);
            const container = node.querySelector('.etalon-photo-container');
            container.dataset.photo = el.photo;
            container.innerHTML = `
                <div class="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 dark:bg-slate-900 mt-2">
                    <img src="${realPhotoSrc}" class="w-full h-full object-contain cursor-pointer" onclick="setTimeout(() => openPhotoViewer('${el.photo}'), 100)">
                    <button onclick="removeEtalonPhoto('${elId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md active:scale-90">✕</button>
                </div>`;
        }
    }
};

window.handleEtalonPdfUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { event.target.value = ''; return showToast("Файл слишком большой! Максимум 5 МБ."); }
    
    showToast("⚙️ Сохранение PDF...");
    const reader = new FileReader();
    reader.onload = async function (e) {
        const localUrl = await PhotoManager.saveLocal(e.target.result, 'etalon_pdf');
        
        const cont = document.getElementById('etalon-pdf-preview');
        cont.dataset.pdf = localUrl;
        document.getElementById('etalon-pdf-name').innerText = file.name;
        
        cont.classList.remove('hidden');
        document.getElementById('etalon-pdf-upload-btn').classList.add('hidden');
        event.target.value = '';
    }
    reader.readAsDataURL(file);
};

window.removeEtalonPdf = function () {
    const cont = document.getElementById('etalon-pdf-preview');
    cont.dataset.pdf = '';
    cont.classList.add('hidden');
    document.getElementById('etalon-pdf-upload-btn').classList.remove('hidden');
};