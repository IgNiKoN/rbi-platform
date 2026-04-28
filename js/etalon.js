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
    document.getElementById('etalon-photo-input').click();
};

window.handleEtalonPhotoUpload = function(event) {
    if (!event.target.files[0] || !currentEtalonUploadId) return;
    
    showToast("Обработка фото...");
    
    compressImageToBase64(event.target.files[0], 1000, 0.8, async (base64) => {
        const localUrl = await PhotoManager.saveLocal(base64, 'etalon');
        const container = document.getElementById(currentEtalonUploadId).querySelector('.etalon-photo-container');
        container.dataset.photo = localUrl;
        container.innerHTML = `
            <div class="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 dark:bg-slate-900">
                <img src="${window.getPhotoSrc(localUrl)}" class="w-full h-full object-cover cursor-pointer" onclick="openPhotoViewer('${localUrl}')">
                <button onclick="removeEtalonPhoto('${currentEtalonUploadId}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md active:scale-90">✕</button>
            </div>`;
        event.target.value = '';
    });
};

window.removeEtalonPhoto = function(elId) {
    const container = document.getElementById(elId).querySelector('.etalon-photo-container');
    container.dataset.photo = '';
    container.innerHTML = `
        <button onclick="triggerEtalonPhotoUpload('${elId}')" class="w-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 font-bold text-[10px] uppercase active:scale-95 transition-colors flex items-center justify-center gap-2">
            📸 Прикрепить фото узла
        </button>`;
};

window.saveEtalonAct = async function() {
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

    // Сохраняем Эталон в общую историю как спец-проверку (чтобы работали фильтры и аналитика)
    const etalonRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000), 
        date: new Date().toISOString(), 
        projectName: document.getElementById('inp-project')?.value || "Объект", 
        inspectorName: document.getElementById('inp-inspector')?.value || "Инженер", 
        contractorName: currentEtalonContext.contractor,
        templateKey: 'sys_etalon_act', // Спец-ключ для логики
        templateTitle: currentEtalonContext.templateTitle, // Настоящее название работы
        location: location, 
        instanceId: "etalon", 
        stageId: 0, 
        stageName: "Акт-Эталон",
        checkedStagesInfo: ["Фиксация эталона"], 
        isCompleted: true,
        // Специальные данные акта
        state: { '9901': 'ok' }, // Фейковый успешный пункт для аналитики
        photos: {},
        details: {
            participants: participants,
            deviations: deviations,
            elements: elements
        },
        metrics: { final: 100, baseUrkPerc: 100, checkedCount: 1, totalCount: 1, n_B1_fail: 0, n_B2_fail: 0, n_B3_fail: 0, kc: 1, kcrit: 1, statusTxt: "ЭТАЛОН", statusCls: "tag-blue" }
    };

    contractorArray.push(etalonRecord); 
    await dbPut(STORES.HISTORY, etalonRecord);

    // Закрываем задачу в Плане
    if (currentEtalonContext.statusKey && weeklyPlanData.tasks) {
        const task = weeklyPlanData.tasks.find(t => t.statusKey === currentEtalonContext.statusKey);
        if (task) {
            task.needsEtalon = false;
            if (contractorStatuses[task.statusKey]) contractorStatuses[task.statusKey].etalonCompleted = true;
            await dbPut(STORES.SETTINGS, { key: 'weekly_plan_data', data: weeklyPlanData });
        }
    }

    if (typeof gameLogAction === 'function') gameLogAction('etalon_accepted', etalonRecord.id);

    showToast("✅ Акт-Эталон успешно сохранен!");
    closeEtalonConstructor();
    
    // Предлагаем сразу распечатать
    setTimeout(() => { printEtalonAct(etalonRecord.id); }, 500);
    
    // Перезагружаем интерфейс
    if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
};

window.printEtalonAct = function(historyId) {
    const record = contractorArray.find(c => c.id === historyId);
    if (!record || !record.details || !record.details.elements) return showToast("Ошибка чтения Акта");

    const mode = 'script'; // Всегда генерируем PDF для скачивания
    const d = record.details;

    let elementsHtml = d.elements.map((el, idx) => `
        <table class="no-break" style="width: 100%; border: 2px solid #e2e8f0; border-left: 6px solid #4f46e5; border-radius: 10px; background: white; margin-bottom: 15px; border-collapse: collapse; table-layout: fixed;">
            <tr>
                <td style="padding: 15px; vertical-align: top;">
                    <h3 style="color: #312e81; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;">${idx + 1}. ${el.name}</h3>
                    <p style="font-size: 12px; color: #334155; white-space: pre-wrap; margin: 0;">${el.desc || 'Описание отсутствует'}</p>
                </td>
                ${el.photo ? `<td style="width: 200px; padding: 15px; vertical-align: top; text-align: right;">
                    <div style="width: 100%; height: 150px; background: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1; overflow: hidden;">
                        <img src="${window.getPhotoSrc(el.photo)}" style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                </td>` : ''}
            </tr>
        </table>
    `).join('');

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