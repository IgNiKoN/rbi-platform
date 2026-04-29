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

window.openEtalonConstructor = function(contractor, templateKey, templateTitle, statusKey) {
    currentEtalonContext = {
        contractor: contractor,
        templateKey: templateKey,
        templateTitle: templateTitle,
        statusKey: statusKey,
        elements: []
    };
    etalonElementCounter = 0;

    // Сброс полей
    document.getElementById('etalon-location').value = '';
    document.getElementById('etalon-participants').value = document.getElementById('inp-inspector')?.value || '';
    document.getElementById('etalon-deviations').value = '';
    document.getElementById('etalon-elements-container').innerHTML = '';

    document.getElementById('etalon-title-text').innerText = `${contractor} | ${templateTitle}`;

    // Добавляем первый пустой элемент по умолчанию
    addEtalonElement();
    // ИСПРАВЛЕНИЕ: Динамически внедряем кнопки "Сохранить" и "Печать"
    const headerContainer = document.getElementById('etalon-title-text').parentElement;
    headerContainer.innerHTML = `
        <button onclick="closeEtalonConstructor()" class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 active:scale-95 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg transition-colors shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg> Назад
        </button>
        <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest text-center flex-1 truncate px-2" id="etalon-title-text">${contractor} | ${templateTitle}</div>
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
    
    container.innerHTML = `
        <div class="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 dark:bg-slate-900 mt-2">
            <img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-contain cursor-pointer active:scale-95 transition-transform" onclick="setTimeout(() => openPhotoViewer('${localUrl}'), 100)">
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
    const location = document.getElementById('etalon-location').value.trim();
    const participants = document.getElementById('etalon-participants').value.trim();
    const deviations = document.getElementById('etalon-deviations').value.trim() || 'Отклонений не выявлено';
    
    if (!location || !participants) return showToast("⚠️ Заполните локацию и участников!");

    const elements = [];
    document.querySelectorAll('.etalon-item').forEach(el => {
        const name = el.querySelector('.etalon-el-name').value.trim();
        const desc = el.querySelector('.etalon-el-desc').value.trim();
        const photo = el.querySelector('.etalon-photo-container').dataset.photo || null;
        if (name) elements.push({ name, desc, photo });
    });

    if (elements.length === 0) return showToast("⚠️ Добавьте хотя бы один элемент эталона!");

    const etalonRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000), 
        date: new Date().toISOString(), 
        projectName: document.getElementById('inp-project')?.value || "Объект", 
        inspectorName: document.getElementById('inp-inspector')?.value || "Инженер", 
        contractorName: currentEtalonContext.contractor,
        templateKey: 'sys_etalon_act', 
        templateTitle: currentEtalonContext.templateTitle, 
        location: location, 
        instanceId: "etalon", 
        stageId: 0, 
        stageName: "Акт-Эталон",
        checkedStagesInfo: ["Фиксация эталона"], 
        isCompleted: true,
        state: { '9901': 'ok' }, 
        photos: {},
        details: { participants: participants, deviations: deviations, elements: elements },
        metrics: { final: 100, baseUrkPerc: 100, checkedCount: 1, totalCount: 1, n_B1_fail: 0, n_B2_fail: 0, n_B3_fail: 0, kc: 1, kcrit: 1, statusTxt: "ЭТАЛОН", statusCls: "tag-blue" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false
    };

    etalonActsArray.push(etalonRecord); 
    await dbPut(STORES.ETALON_ACTS, etalonRecord);

    if (currentEtalonContext.statusKey && weeklyPlanData.tasks) {
        const task = weeklyPlanData.tasks.find(t => t.statusKey === currentEtalonContext.statusKey);
        if (task) {
            task.needsEtalon = false;
            if (contractorStatuses[task.statusKey]) contractorStatuses[task.statusKey].etalonCompleted = true;
            await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
        }
    }

    if (typeof gameLogAction === 'function') gameLogAction('etalon_accepted', etalonRecord.id);
    // ЗАКРЫТИЕ ПРИВЯЗАННОЙ ЗАДАЧИ ЭТАЛОНА
    if (window.activeTaskId) {
        const task = window.rbi_tasksData.find(t => t.id === window.activeTaskId);
        if (task) {
            task.status = 'done';
            task.resultComment = 'Эталон зафиксирован';
            task.updatedAt = new Date().toISOString(); // <-- НОВОЕ
            dbPut(STORES.TASKS, task);
        }
        window.activeTaskId = null;
    }
    showToast("✅ Акт-Эталон успешно сохранен!");
       localStorage.setItem('rbi_cloud_dirty', '1');
    if (typeof triggerSync === 'function') triggerSync('silent');
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
    }, 200);
};

window.printEtalonAct = async function(historyId) {
    const record = etalonActsArray.find(c => c.id === historyId);
    if (!record || !record.details || !record.details.elements) return showToast("Ошибка чтения Акта");

    const mode = 'script'; 
    const d = record.details;

    // АСИНХРОННОЕ ИЗВЛЕЧЕНИЕ ФОТО: Дожидаемся, пока все фотки выгрузятся из БД в оперативную память
    let elementsHtml = '';
    for (let i = 0; i < d.elements.length; i++) {
        const el = d.elements[i];
        let realPhotoSrc = '';
        if (el.photo) {
            // Если фото лежит в БД, достаем его физический URL
            realPhotoSrc = await PhotoManager.getAsyncUrl(el.photo) || window.getPhotoSrc(el.photo) || el.photo;
        }

        elementsHtml += `
            <table class="no-break" style="width: 100%; border: 2px solid #e2e8f0; border-left: 6px solid #4f46e5; border-radius: 10px; background: white; margin-bottom: 20px; border-collapse: collapse; table-layout: fixed;">
                <tr>
                    <!-- Колонка для текста: 40% ширины -->
                    <td style="padding: 15px; vertical-align: top; width: 40%;">
                        <h3 style="color: #312e81; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase;">${i + 1}. ${el.name}</h3>
                        <p style="font-size: 12px; color: #334155; white-space: pre-wrap; margin: 0; line-height: 1.5;">${el.desc || 'Описание отсутствует'}</p>
                    </td>
                    <!-- Колонка для фото: 60% ширины, высота 300px -->
                    ${realPhotoSrc ? `<td style="padding: 15px; vertical-align: top; width: 60%; text-align: center;">
                        <div style="width: 100%; height: 300px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden;">
                            <img src="${realPhotoSrc}" style="width: 100%; height: 100%; object-fit: contain; display: block; margin: 0 auto;">
                        </div>
                    </td>` : ''}
                </tr>
            </table>
        `;
    }

    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24px; text-transform: uppercase; color: #0f172a; margin: 0; font-weight:900;">АКТ ПРИЕМКИ ЭТАЛОННОГО ОБРАЗЦА</h1>
            <div style="font-size: 14px; color: #4f46e5; font-weight: bold; margin-top: 5px; text-transform:uppercase;">От ${new Date(record.date).toLocaleDateString('ru-RU')}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; color: #0f172a;">
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold; width: 30%;">Подрядная организация:</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${record.contractorName}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold;">Вид работ:</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${record.templateTitle}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold;">Участок (Локация):</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${record.location}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold;">Участники приемки:</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; white-space: pre-wrap;">${d.participants}</td>
            </tr>
        </table>

        <div style="background: ${d.deviations !== 'Отклонений не выявлено' ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${d.deviations !== 'Отклонений не выявлено' ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 5px 0; font-size: 12px; color: ${d.deviations !== 'Отклонений не выявлено' ? '#b45309' : '#166534'}; text-transform: uppercase;">Отклонения и допущения:</h3>
            <p style="font-size: 12px; color: #1e293b; margin: 0; font-weight: bold; white-space: pre-wrap;">${d.deviations}</p>
        </div>

        <h2 style="font-size: 16px; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px;">Зафиксированные узлы и элементы</h2>
        
        ${elementsHtml}

        <div style="margin-top: 40px; page-break-inside: avoid;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr>
                    <td style="width: 33%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">Представитель Подрядчика</td>
                    <td style="width: 33%;"></td>
                    <td style="width: 33%; text-align: center; border-top: 1px solid #000; padding-top: 5px;">Инженер строительного контроля</td>
                </tr>
            </table>
        </div>
    `;

    printPdfShell(`Акт-Эталон: ${record.contractorName}`, content, "A4", "portrait", mode);
};