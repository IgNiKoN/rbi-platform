/* Файл: js/construction/constructionManager.js */

window.ConstManager = {
    objects: [],
    buildings: [],
    floors: [],
    defects: [], // <-- ДОБАВИЛИ МАССИВ ДЛЯ ДЕФЕКТОВ НА ПЛАНАХ

    currentObjId: null,
    currentBldId: null,
    currentFlrId: null,

    // --- НОВОЕ: Переменные фильтров и видов ---
    currentView: 'plan', // 'plan' или 'list'
    currentFilterStatus: 'ALL',
    currentFilterCategory: 'ALL',

    // 1. Инициализация (загрузка данных из БД)
    async init() {
        console.log('[ConstManager] Загрузка иерархии планов...');
        try {
            // Грузим из локальной IndexedDB
            if (typeof dbGetAll !== 'undefined') {
                const o = await dbGetAll(STORES.CONST_OBJECTS);
                this.objects = (o || []).filter(x => !x._deleted);

                const b = await dbGetAll(STORES.CONST_BUILDINGS);
                this.buildings = (b || []).filter(x => !x._deleted);

                const f = await dbGetAll(STORES.CONST_FLOORS);
                this.floors = (f || []).filter(x => !x._deleted);
            }
        } catch (e) {
            console.error('[ConstManager] Ошибка загрузки БД:', e);
        }

        this.renderAdminPanel();
        this.renderSelectors();
    },

    // 2. Отрисовка кнопки "Администрирование" (Только для Админа)
    renderAdminPanel() {
        const adminContainer = document.getElementById('const-admin-btn-container');
        if (!adminContainer) return;

        // Проверяем роль (в будущем добавится engineer_sk)
        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isManager = ['manager', 'director', 'deputy_manager'].includes(role);

        if (isManager) {
            adminContainer.innerHTML = `
                <button onclick="window.ConstAdmin.openModal()" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1 transition-transform">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Управление иерархией
                </button>
            `;
        } else {
            adminContainer.innerHTML = '';
        }
    },

    // 3. Заполнение селекторов (выпадающих списков)
    renderSelectors() {
        const objSel = document.getElementById('const-object-select');
        const bldSel = document.getElementById('const-building-select');
        const flrSel = document.getElementById('const-floor-select');

        if (!objSel || !bldSel || !flrSel) return;

        // --- ОБЪЕКТЫ ---
        let objHtml = '<option value="">-- Выберите объект --</option>';
        if (this.objects.length === 0) {
            objHtml = '<option value="">Нет объектов</option>';
        } else {
            this.objects.sort((a, b) => a.name.localeCompare(b.name)).forEach(o => {
                objHtml += `<option value="${o.id}">${o.name}</option>`;
            });
        }
        objSel.innerHTML = objHtml;
        if (this.currentObjId && this.objects.find(o => o.id === this.currentObjId)) {
            objSel.value = this.currentObjId;
        } else {
            this.currentObjId = null;
            objSel.value = '';
        }

        // --- КОРПУСА ---
        this.updateBuildingSelector();

        // --- ЭТАЖИ ---
        this.updateFloorSelector();
    },

    updateBuildingSelector() {
        const bldSel = document.getElementById('const-building-select');
        if (!bldSel) return;

        if (!this.currentObjId) {
            bldSel.innerHTML = '<option value="">Сначала выберите объект</option>';
            bldSel.disabled = true;
            this.currentBldId = null;
            return;
        }

        const validBlds = this.buildings.filter(b => b.object_id === this.currentObjId);

        if (validBlds.length === 0) {
            bldSel.innerHTML = '<option value="">Корпусов нет</option>';
            bldSel.disabled = true;
            this.currentBldId = null;
            return;
        }

        let html = '<option value="">-- Выберите корпус --</option>';
        validBlds.sort((a, b) => a.sort_order - b.sort_order).forEach(b => {
            html += `<option value="${b.id}">${b.name}</option>`;
        });

        bldSel.innerHTML = html;
        bldSel.disabled = false;

        if (this.currentBldId && validBlds.find(b => b.id === this.currentBldId)) {
            bldSel.value = this.currentBldId;
        } else {
            this.currentBldId = null;
            bldSel.value = '';
        }
    },

    updateFloorSelector() {
        const flrSel = document.getElementById('const-floor-select');
        if (!flrSel) return;

        if (!this.currentBldId) {
            flrSel.innerHTML = '<option value="">Сначала выберите корпус</option>';
            flrSel.disabled = true;
            this.currentFlrId = null;
            this.clearPdfView();
            return;
        }

        const validFlrs = this.floors.filter(f => f.building_id === this.currentBldId);

        if (validFlrs.length === 0) {
            flrSel.innerHTML = '<option value="">Этажей нет</option>';
            flrSel.disabled = true;
            this.currentFlrId = null;
            this.clearPdfView();
            return;
        }

        let html = '<option value="">-- Выберите этаж --</option>';
        validFlrs.sort((a, b) => a.sort_order - b.sort_order).forEach(f => {
            html += `<option value="${f.id}">${f.name}</option>`;
        });

        flrSel.innerHTML = html;
        flrSel.disabled = false;

        if (this.currentFlrId && validFlrs.find(f => f.id === this.currentFlrId)) {
            flrSel.value = this.currentFlrId;
            // Если этаж выбран, нужно показать его план
            this.loadPdfForFloor(this.currentFlrId);
        } else {
            this.currentFlrId = null;
            flrSel.value = '';
            this.clearPdfView();
        }
    },

    // 4. Обработчики изменений (onchange)
    onObjectChange() {
        this.currentObjId = document.getElementById('const-object-select').value;
        this.currentBldId = null;
        this.currentFlrId = null;
        this.updateBuildingSelector();
        this.updateFloorSelector();
    },

    onBuildingChange() {
        this.currentBldId = document.getElementById('const-building-select').value;
        this.currentFlrId = null;
        this.updateFloorSelector();
    },

    onFloorChange() {
        this.currentFlrId = document.getElementById('const-floor-select').value;
        if (this.currentFlrId) {
            this.loadPdfForFloor(this.currentFlrId);
        } else {
            this.clearPdfView();
        }
    },

    // 5. Логика отображения PDF
    clearPdfView() {
        const placeholder = document.getElementById('const-plan-placeholder');
        const renderArea = document.getElementById('const-pdf-render-area');

        if (placeholder) placeholder.classList.remove('hidden');
        if (renderArea) {
            renderArea.classList.add('hidden');
            renderArea.innerHTML = '';
        }
    },

    async loadPdfForFloor(floorId) {
        const placeholder = document.getElementById('const-plan-placeholder');
        const renderArea = document.getElementById('const-pdf-render-area');

        if (!placeholder || !renderArea) return;

        const floor = this.floors.find(f => f.id === floorId);
        if (!floor || !floor.pdf_url) {
            this.clearPdfView();
            if (typeof showToast === 'function') showToast('⚠️ У этого этажа нет загруженного плана');
            return;
        }

        // Показываем лоадер
        placeholder.innerHTML = `<div class="animate-pulse">Загрузка PDF плана...</div>`;
        placeholder.classList.remove('hidden');
        renderArea.classList.add('hidden');
        renderArea.innerHTML = '';

        try {
            // 1. Достаем файл (из кэша или скачиваем)
            let pdfArrayBuffer = null;
            if (typeof PhotoManager !== 'undefined' && typeof PhotoManager.getAsyncUrl === 'function') {
                const cachedUrl = await PhotoManager.getAsyncUrl(floor.pdf_url);
                if (cachedUrl && cachedUrl.startsWith('blob:')) {
                    const res = await fetch(cachedUrl);
                    pdfArrayBuffer = await res.arrayBuffer();
                }
            }
            if (!pdfArrayBuffer) {
                if (!navigator.onLine) throw new Error('Нет интернета, а план не кэширован');
                const res = await fetch(floor.pdf_url);
                if (!res.ok) throw new Error('Не удалось скачать файл');
                pdfArrayBuffer = await res.arrayBuffer();
            }

            // 2. Рендерим PDF
            const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
            const page = await pdf.getPage(1);

            const containerWidth = renderArea.clientWidth || window.innerWidth - 40;
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / baseViewport.width;
            const viewport = page.getViewport({ scale: scale * 1.5 }); // Хорошее качество

            const canvas = document.createElement('canvas');
            canvas.className = 'w-full h-auto object-contain';
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            // 3. Добавляем холст в контейнер
            renderArea.appendChild(canvas);

            // 3.5. Отрисовываем уже существующие на этом этаже точки (если они есть)
            window.ConstManager.currentFlrId = floorId;
            setTimeout(() => window.ConstDefectForm.renderAllPins(floorId), 100);

            // 4. Добавляем ПЛАВАЮЩУЮ кнопку поверх чертежа
            const safeName = floor.name.replace(/'/g, "\\'");
            const btnHtml = `
                <div class="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <button onclick="window.UniversalPdfViewer.open('${floor.pdf_url}', 'План: ${safeName}', '${floor.id}')" class="pointer-events-auto bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-[0_5px_15px_rgba(79,70,229,0.4)] active:scale-95 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-transform border border-indigo-400">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        Интерактивный план
                    </button>
                </div>
            `;
            renderArea.insertAdjacentHTML('beforeend', btnHtml);

            // 5. Показываем результат
            placeholder.classList.add('hidden');
            renderArea.classList.remove('hidden');

        } catch (e) {
            console.error('[ConstManager] Ошибка рендера PDF:', e);
            placeholder.innerHTML = `<div class="text-red-500 font-bold text-[10px] uppercase text-center p-4">❌ Ошибка загрузки PDF<br><span class="text-slate-500 lowercase normal-case font-normal mt-1 block">${e.message}</span></div>`;
        }
    },
    // === НОВОЕ: Переключение видов и фильтры ===
    switchView(view) {
        this.currentView = view;
        const btnPlan = document.getElementById('const-btn-view-plan');
        const btnList = document.getElementById('const-btn-view-list');
        const planCont = document.getElementById('const-plan-container');
        const listCont = document.getElementById('const-list-container');

        if (!btnPlan || !btnList || !planCont || !listCont) return;

        if (view === 'plan') {
            btnPlan.className = "flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all bg-white dark:bg-slate-800 text-indigo-600 shadow-sm";
            btnList.className = "flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all text-slate-500 dark:text-slate-400";
            planCont.classList.remove('hidden');
            listCont.classList.add('hidden');
            // Перерисовываем точки на плане с учетом фильтров
            if (this.currentFlrId && window.ConstDefectForm && typeof window.ConstDefectForm.renderAllPins === 'function') {
                window.ConstDefectForm.renderAllPins(this.currentFlrId, {
                    status: this.currentFilterStatus,
                    category: this.currentFilterCategory
                });
            }
        } else {
            btnList.className = "flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all bg-white dark:bg-slate-800 text-indigo-600 shadow-sm";
            btnPlan.className = "flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all text-slate-500 dark:text-slate-400";
            planCont.classList.add('hidden');
            listCont.classList.remove('hidden');
            this.renderDefectsList(); // Рисуем список при переключении
        }
    },

    applyFilters() {
        const statusEl = document.getElementById('const-filter-status');
        const categoryEl = document.getElementById('const-filter-category');
        if (statusEl) this.currentFilterStatus = statusEl.value;
        if (categoryEl) this.currentFilterCategory = categoryEl.value;

        if (this.currentView === 'plan') {
            if (this.currentFlrId && window.ConstDefectForm && typeof window.ConstDefectForm.renderAllPins === 'function') {
                window.ConstDefectForm.renderAllPins(this.currentFlrId, {
                    status: this.currentFilterStatus,
                    category: this.currentFilterCategory
                });
            }
        } else {
            this.renderDefectsList();
        }
    },

    renderDefectsList() {
        const container = document.getElementById('const-list-container');
        if (!container) return;

        if (!this.currentFlrId) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Выберите этаж для просмотра замечаний</div>`;
            return;
        }

        if (!this.defects || !Array.isArray(this.defects)) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Ошибка загрузки данных</div>`;
            return;
        }

        // Фильтруем дефекты текущего этажа
        let filtered = this.defects.filter(d => d.floorId === this.currentFlrId);

        if (this.currentFilterStatus !== 'ALL') filtered = filtered.filter(d => d.status === this.currentFilterStatus);
        if (this.currentFilterCategory !== 'ALL') filtered = filtered.filter(d => d.category === this.currentFilterCategory);

        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">По выбранным фильтрам замечаний нет</div>`;
            return;
        }

        // Сортировка: Сначала красные (B3), потом новые
        filtered.sort((a, b) => {
            if (a.category === 'B3' && b.category !== 'B3') return -1;
            if (b.category === 'B3' && a.category !== 'B3') return 1;
            const dateA = a.created_at ? new Date(a.created_at) : 0;
            const dateB = b.created_at ? new Date(b.created_at) : 0;
            return dateB - dateA;
        });

        const statusNames = { 'issued': 'Выдано', 'fixed': 'Устранено', 'closed': 'Закрыто' };
        const statusColors = {
            'issued': 'text-red-600 bg-red-50 border-red-200',
            'fixed': 'text-yellow-600 bg-yellow-50 border-yellow-200',
            'closed': 'text-green-600 bg-green-50 border-green-200'
        };

        container.innerHTML = filtered.map(d => {
            const photoHtml = d.photo ?
                `<img src="${typeof window.getPhotoSrc === 'function' ? window.getPhotoSrc(d.photo) : d.photo}" class="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer shadow-sm shrink-0" onclick="event.stopPropagation(); typeof openPhotoViewer === 'function' && openPhotoViewer('${d.photo}')">` :
                `<div class="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[8px] text-slate-400 font-bold uppercase shrink-0 text-center leading-tight">Нет<br>фото</div>`;

            let catColor = 'bg-blue-500';
            if (d.category === 'B2') catColor = 'bg-orange-500';
            if (d.category === 'B3') catColor = 'bg-red-600';

            const deadlineText = d.deadline ? new Date(d.deadline).toLocaleDateString('ru-RU') : 'Не указан';

            return `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex gap-3 cursor-pointer hover:border-indigo-400 transition-colors" onclick="window.ConstDefectForm && window.ConstDefectForm.openExisting && window.ConstDefectForm.openExisting('${d.id}')">
                ${photoHtml}
                <div class="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight flex items-center gap-1.5">
                                <span class="${catColor} text-white px-1.5 py-0.5 rounded text-[8px] tracking-widest">${d.category}</span>
                                <span class="truncate">${d.itemName}</span>
                            </div>
                            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded border ${statusColors[d.status]} shrink-0">${statusNames[d.status] || d.status}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 truncate font-medium">${d.contractor || 'Подрядчик не указан'}</div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-slate-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> До: ${deadlineText}</div>
                        <div class="text-[9px] font-bold text-slate-400">${new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
};

// ============================================================================
// === МОДУЛЬ АДМИНИСТРИРОВАНИЯ ИЕРАРХИИ СК ===
// ============================================================================

window.ConstAdmin = {
    openModal() {
        let html = `
        <div id="const-admin-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] hidden items-start justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto" onclick="window.ConstAdmin.closeModal()">
            <div class="bg-[var(--bg-main)] w-full max-w-3xl mt-4 mb-10 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--card-border)] min-h-[60vh]" onclick="event.stopPropagation()">
                
                <!-- Шапка модалки -->
                <div class="p-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center sticky top-0 z-20 shadow-md">
                    <h3 class="font-black text-[14px] uppercase tracking-tight text-white flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        Редактор иерархии объектов
                    </h3>
                    <button onclick="window.ConstAdmin.closeModal()" class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-sm border border-indigo-400 active:scale-90 transition-transform">✕</button>
                </div>

                <div class="flex flex-col md:flex-row flex-1 p-4 gap-4">
                    <!-- Левая колонка: Дерево -->
                    <div class="w-full md:w-1/3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm h-fit max-h-[50vh] overflow-y-auto custom-scrollbar">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Дерево</span>
                            <button onclick="window.ConstAdmin.createObject()" class="text-indigo-600 font-black text-lg active:scale-90" title="Добавить Объект">+</button>
                        </div>
                        <div id="const-admin-tree" class="space-y-1">
                            <!-- Дерево рендерится здесь -->
                        </div>
                    </div>

                    <!-- Правая колонка: Редактор выбранного элемента -->
                    <div class="w-full md:w-2/3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm" id="const-admin-editor">
                        <div class="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest">
                            Выберите элемент в дереве слева
                        </div>
                    </div>
                </div>

            </div>
        </div>`;

        // Удаляем старую модалку, если она залипла
        const oldModal = document.getElementById('const-admin-modal');
        if (oldModal) oldModal.remove();

        document.body.insertAdjacentHTML('beforeend', html);

        this.renderTree();

        const modal = document.getElementById('const-admin-modal');
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    },

    closeModal() {
        const modal = document.getElementById('const-admin-modal');
        if (modal) modal.remove();
        document.body.classList.remove('modal-open');

        // После закрытия админки - перерисовываем главные селекторы на экране
        if (window.ConstManager) window.ConstManager.renderSelectors();
    },

    // ==========================================
    // 1. Отрисовка Дерева
    // ==========================================
    renderTree() {
        const treeContainer = document.getElementById('const-admin-tree');
        if (!treeContainer) return;

        let html = '';
        const objects = window.ConstManager.objects;
        const buildings = window.ConstManager.buildings;
        const floors = window.ConstManager.floors;

        if (objects.length === 0) {
            treeContainer.innerHTML = `<div class="text-[9px] text-slate-400 italic text-center">Пусто. Нажмите +</div>`;
            return;
        }

        // Сортируем объекты по алфавиту
        objects.sort((a, b) => a.name.localeCompare(b.name)).forEach(obj => {
            html += `
                <div class="border-l-2 border-indigo-200 ml-1 pl-2 pb-2">
                    <div class="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 rounded cursor-pointer hover:bg-indigo-100" onclick="window.ConstAdmin.editElement('object', '${obj.id}')">
                        <span class="text-[11px] font-black text-indigo-700 dark:text-indigo-400 truncate w-32" title="${obj.name}">${obj.name}</span>
                        <button onclick="event.stopPropagation(); window.ConstAdmin.createBuilding('${obj.id}')" class="text-[9px] text-indigo-600 font-bold bg-white px-1.5 rounded shadow-sm">+ К</button>
                    </div>
            `;

            const objBlds = buildings.filter(b => b.object_id === obj.id).sort((a, b) => a.sort_order - b.sort_order);
            objBlds.forEach(bld => {
                html += `
                    <div class="border-l border-emerald-200 ml-3 pl-2 mt-1 pb-1">
                        <div class="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded cursor-pointer hover:bg-emerald-100" onclick="window.ConstAdmin.editElement('building', '${bld.id}')">
                            <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 truncate w-24" title="${bld.name}">${bld.name}</span>
                            <button onclick="event.stopPropagation(); window.ConstAdmin.createFloor('${bld.id}')" class="text-[9px] text-emerald-600 font-bold bg-white px-1.5 rounded shadow-sm">+ Э</button>
                        </div>
                `;

                const bldFlrs = floors.filter(f => f.building_id === bld.id).sort((a, b) => a.sort_order - b.sort_order);
                bldFlrs.forEach(flr => {
                    const hasPdf = flr.pdf_url ? '📄' : '⚠️';
                    html += `
                        <div class="ml-3 mt-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded text-[9px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 flex justify-between" onclick="window.ConstAdmin.editElement('floor', '${flr.id}')">
                            <span>${flr.name}</span>
                            <span>${hasPdf}</span>
                        </div>
                    `;
                });
                html += `</div>`; // Конец Корпуса
            });
            html += `</div>`; // Конец Объекта
        });

        treeContainer.innerHTML = html;
    },

    // ==========================================
    // 2. Редактор элементов
    // ==========================================
    editElement(type, id) {
        const editor = document.getElementById('const-admin-editor');
        if (!editor) return;

        let el = null;
        let titleHtml = '';
        let formHtml = '';

        if (type === 'object') {
            el = window.ConstManager.objects.find(x => x.id === id);
            titleHtml = `🏢 Объект: ${el.name}`;
            formHtml = `
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Название объекта</label>
                <input type="text" id="edit-name" class="input-base mb-3" value="${el.name.replace(/"/g, '&quot;')}">
                
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Описание (опционально)</label>
                <textarea id="edit-desc" class="input-base h-20 mb-4">${el.description || ''}</textarea>
            `;
        }
        else if (type === 'building') {
            el = window.ConstManager.buildings.find(x => x.id === id);
            titleHtml = `🏗️ Корпус: ${el.name}`;
            formHtml = `
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Название Корпуса / Секции</label>
                <input type="text" id="edit-name" class="input-base mb-3" value="${el.name.replace(/"/g, '&quot;')}">
                
                <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Порядок сортировки (Число)</label>
                <input type="number" id="edit-sort" class="input-base mb-4" value="${el.sort_order || 0}">
            `;
        }
        else if (type === 'floor') {
            el = window.ConstManager.floors.find(x => x.id === id);
            titleHtml = `🪜 Этаж: ${el.name}`;

            const pdfStatus = el.pdf_url
                ? `<div class="bg-green-50 text-green-700 p-2 rounded-lg text-[10px] font-bold mb-3 border border-green-200">✅ План загружен (${el.pdf_size || 'Размер неизвестен'})</div>`
                : `<div class="bg-red-50 text-red-600 p-2 rounded-lg text-[10px] font-bold mb-3 border border-red-200">❌ PDF план не загружен</div>`;

            formHtml = `
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Название этажа</label>
                        <input type="text" id="edit-name" class="input-base" value="${el.name.replace(/"/g, '&quot;')}">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Порядок сортировки</label>
                        <input type="number" id="edit-sort" class="input-base" value="${el.sort_order || 0}">
                    </div>
                </div>

                ${pdfStatus}

                <div class="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                    <label class="text-[10px] font-bold text-indigo-600 uppercase mb-2 block">Загрузка чертежа (PDF)</label>
                    <input type="file" id="edit-pdf-file" accept="application/pdf" class="hidden" onchange="window.ConstAdmin.handlePdfSelect(event, '${id}')">
                    <button onclick="document.getElementById('edit-pdf-file').click()" class="w-full bg-slate-100 text-slate-700 border border-slate-300 py-3 rounded-lg text-[11px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path></svg>
                        Выбрать новый PDF (До 20 МБ)
                    </button>
                    <div id="pdf-upload-progress" class="text-[10px] font-bold text-indigo-600 mt-2 text-center hidden animate-pulse">Загрузка в облако... Пожалуйста, подождите.</div>
                </div>
            `;
        }

        if (!el) return;

        editor.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                <div class="font-black text-[13px] text-slate-800 dark:text-white">${titleHtml}</div>
                <button onclick="window.ConstAdmin.deleteElement('${type}', '${id}')" class="text-red-500 font-black text-sm px-2" title="Удалить">🗑️</button>
            </div>
            
            ${formHtml}
            
            <button onclick="window.ConstAdmin.saveElement('${type}', '${id}')" class="w-full mt-4 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2">
                💾 Сохранить изменения
            </button>
        `;
    },

    // ==========================================
    // 3. Создание базовых элементов
    // ==========================================
    async createObject() {
        const name = prompt('Введите название нового Объекта:');
        if (!name) return;

        const newObj = {
            id: 'c_obj_' + Date.now().toString(36),
            name: name,
            description: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _deleted: false,
            source: 'local',
            sync_status: 'not_synced'
        };

        window.ConstManager.objects.push(newObj);
        await dbPut(STORES.CONST_OBJECTS, newObj);
        this.triggerSync();
        this.renderTree();
    },

    async createBuilding(objId) {
        const name = prompt('Введите название Корпуса/Секции:');
        if (!name) return;

        const newBld = {
            id: 'c_bld_' + Date.now().toString(36),
            object_id: objId,
            name: name,
            sort_order: window.ConstManager.buildings.filter(b => b.object_id === objId).length + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _deleted: false,
            source: 'local',
            sync_status: 'not_synced'
        };

        window.ConstManager.buildings.push(newBld);
        await dbPut(STORES.CONST_BUILDINGS, newBld);
        this.triggerSync();
        this.renderTree();
    },

    async createFloor(bldId) {
        const name = prompt('Введите номер или название Этажа (например: 5 этаж):');
        if (!name) return;

        const newFlr = {
            id: 'c_flr_' + Date.now().toString(36),
            building_id: bldId,
            name: name,
            sort_order: window.ConstManager.floors.filter(f => f.building_id === bldId).length + 1,
            pdf_url: '',
            pdf_name: '',
            pdf_size: '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _deleted: false,
            source: 'local',
            sync_status: 'not_synced'
        };

        window.ConstManager.floors.push(newFlr);
        await dbPut(STORES.CONST_FLOORS, newFlr);
        this.triggerSync();
        this.renderTree();
    },

    // ==========================================
    // 4. Сохранение и Удаление
    // ==========================================
    async saveElement(type, id) {
        const nameInput = document.getElementById('edit-name');
        if (!nameInput || !nameInput.value.trim()) return alert("Имя не может быть пустым!");

        if (type === 'object') {
            const obj = window.ConstManager.objects.find(x => x.id === id);
            obj.name = nameInput.value.trim();
            obj.description = document.getElementById('edit-desc').value.trim();
            obj.updated_at = new Date().toISOString();
            obj.sync_status = 'not_synced';
            await dbPut(STORES.CONST_OBJECTS, obj);
        }
        else if (type === 'building') {
            const bld = window.ConstManager.buildings.find(x => x.id === id);
            bld.name = nameInput.value.trim();
            bld.sort_order = parseInt(document.getElementById('edit-sort').value) || 0;
            bld.updated_at = new Date().toISOString();
            bld.sync_status = 'not_synced';
            await dbPut(STORES.CONST_BUILDINGS, bld);
        }
        else if (type === 'floor') {
            const flr = window.ConstManager.floors.find(x => x.id === id);
            flr.name = nameInput.value.trim();
            flr.sort_order = parseInt(document.getElementById('edit-sort').value) || 0;
            flr.updated_at = new Date().toISOString();
            flr.sync_status = 'not_synced';
            await dbPut(STORES.CONST_FLOORS, flr);
        }

        this.triggerSync();
        this.renderTree();
        if (typeof showToast === 'function') showToast("✅ Сохранено!");
    },

    async deleteElement(type, id) {
        if (!confirm('Удалить элемент? Внимание: каскадное удаление.')) return;

        const now = new Date().toISOString();

        if (type === 'object') {
            const obj = window.ConstManager.objects.find(x => x.id === id);
            obj._deleted = true; obj.sync_status = 'not_synced'; obj.updated_at = now;
            await dbPut(STORES.CONST_OBJECTS, obj);

            // Каскад
            window.ConstManager.buildings.filter(b => b.object_id === id).forEach(async b => {
                b._deleted = true; b.sync_status = 'not_synced'; b.updated_at = now;
                await dbPut(STORES.CONST_BUILDINGS, b);

                window.ConstManager.floors.filter(f => f.building_id === b.id).forEach(async f => {
                    f._deleted = true; f.sync_status = 'not_synced'; f.updated_at = now;
                    await dbPut(STORES.CONST_FLOORS, f);
                });
            });
        }
        else if (type === 'building') {
            const bld = window.ConstManager.buildings.find(x => x.id === id);
            bld._deleted = true; bld.sync_status = 'not_synced'; bld.updated_at = now;
            await dbPut(STORES.CONST_BUILDINGS, bld);

            // Каскад
            window.ConstManager.floors.filter(f => f.building_id === id).forEach(async f => {
                f._deleted = true; f.sync_status = 'not_synced'; f.updated_at = now;
                await dbPut(STORES.CONST_FLOORS, f);
            });
        }
        else if (type === 'floor') {
            // В будущем здесь будет проверка: "Есть ли на этаже дефекты?"
            const flr = window.ConstManager.floors.find(x => x.id === id);
            flr._deleted = true; flr.sync_status = 'not_synced'; flr.updated_at = now;
            await dbPut(STORES.CONST_FLOORS, flr);
        }

        // Обновляем ОЗУ массивы (убираем удаленные)
        window.ConstManager.objects = window.ConstManager.objects.filter(x => !x._deleted);
        window.ConstManager.buildings = window.ConstManager.buildings.filter(x => !x._deleted);
        window.ConstManager.floors = window.ConstManager.floors.filter(x => !x._deleted);

        this.triggerSync();
        this.renderTree();
        document.getElementById('const-admin-editor').innerHTML = '<div class="text-center py-10 text-slate-400">Удалено</div>';
    },

    triggerSync() {
        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');
    },

    // ==========================================
    // 5. Загрузка PDF в облако (Supabase)
    // ==========================================
    async handlePdfSelect(event, floorId) {
        const file = event.target.files[0];
        if (!file) return;

        // Лимит 20 МБ
        if (file.size > 20 * 1024 * 1024) {
            alert('Файл слишком большой! Максимум 20 МБ.');
            event.target.value = '';
            return;
        }

        if (!window.supabaseClient) {
            alert('Нет подключения к облаку! Загрузка файлов невозможна.');
            return;
        }

        const progressEl = document.getElementById('pdf-upload-progress');
        if (progressEl) progressEl.classList.remove('hidden');

        try {
            // 1. Формируем путь в бакете `construction-plans`
            // Папка: projectCode / objectId / buildingId / floor_xxx.pdf
            const pCode = window.syncConfig?.projectCode || 'local';
            const floor = window.ConstManager.floors.find(x => x.id === floorId);
            const bld = window.ConstManager.buildings.find(x => x.id === floor.building_id);

            // Чтобы браузер не кэшировал старые планы, добавляем timestamp к имени файла
            const safeName = `plan_${Date.now()}.pdf`;
            const filePath = `${pCode}/${bld.object_id}/${bld.id}/${floorId}/${safeName}`;

            // 2. Отправляем в Supabase
            const { data, error } = await window.supabaseClient.storage
                .from('construction-plans')
                .upload(filePath, file, {
                    cacheControl: '31536000',
                    upsert: true,
                    contentType: 'application/pdf'
                });

            if (error) throw error;

            // 3. Получаем публичную ссылку
            const { data: urlData } = window.supabaseClient.storage
                .from('construction-plans')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            // 4. Локально кэшируем файл (чтобы работал офлайн)
            // Возьмем существующий функционал PhotoManager для локального кэша
            if (typeof PhotoManager !== 'undefined') {
                await PhotoManager.downloadForOffline(publicUrl);
            }

            // 5. Сохраняем ссылку в БД этажа
            floor.pdf_url = publicUrl;
            floor.pdf_name = file.name;
            floor.pdf_size = (file.size / 1024 / 1024).toFixed(1) + ' МБ';
            floor.updated_at = new Date().toISOString();
            floor.sync_status = 'not_synced';

            await dbPut(STORES.CONST_FLOORS, floor);
            this.triggerSync();

            if (typeof showToast === 'function') showToast("✅ План успешно загружен!");

            // Обновляем редактор, чтобы показать успех
            this.editElement('floor', floorId);

        } catch (e) {
            console.error('[ConstAdmin] Ошибка загрузки PDF:', e);
            alert('Ошибка загрузки файла в облако. Проверьте консоль.');
        } finally {
            if (progressEl) progressEl.classList.add('hidden');
            event.target.value = '';
        }
    }
};

// ============================================================================
// === УНИВЕРСАЛЬНЫЙ PDF-ПРОСМОТРЩИК С PANZOOM (ДВИЖОК ДЛЯ ЧЕРТЕЖЕЙ) ===
// ============================================================================
// ============================================================================
// === УНИВЕРСАЛЬНЫЙ PDF-ПРОСМОТРЩИК С PANZOOM И МАРКЕРАМИ ===
// ============================================================================
window.UniversalPdfViewer = {
    panzoomInstance: null,
    isAddMode: false,
    currentFloorId: null, // Запоминаем этаж, к которому привязываем дефект

    async open(pdfUrl, title, floorId = null) {
        this.currentFloorId = floorId;

        const modal = document.getElementById('universal-pdf-modal');
        const titleEl = document.getElementById('universal-pdf-title');
        const loader = document.getElementById('universal-pdf-loader');
        const wrapper = document.getElementById('universal-pdf-wrapper');
        const container = document.getElementById('universal-pdf-container');
        const canvas = document.getElementById('universal-pdf-canvas');
        const toolbar = document.getElementById('universal-pdf-toolbar'); // Тулбар

        if (!modal || !canvas) return;

        titleEl.innerText = title || 'Просмотр документа';

        // Если передан floorId, значит мы открыли план этажа -> показываем тулбар
        if (floorId) {
            toolbar.classList.remove('hidden');
        } else {
            toolbar.classList.add('hidden');
        }

        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);

        loader.classList.remove('hidden');
        container.style.visibility = 'hidden';

        if (this.panzoomInstance) {
            this.panzoomInstance.destroy();
            this.panzoomInstance = null;
        }

        // Отключаем режим добавления при новом открытии
        this.setAddMode(false);

        try {
            let pdfArrayBuffer = null;
            if (typeof PhotoManager !== 'undefined' && typeof PhotoManager.getAsyncUrl === 'function') {
                const cachedUrl = await PhotoManager.getAsyncUrl(pdfUrl);
                if (cachedUrl && cachedUrl.startsWith('blob:')) {
                    const res = await fetch(cachedUrl);
                    pdfArrayBuffer = await res.arrayBuffer();
                }
            }
            if (!pdfArrayBuffer) {
                const res = await fetch(pdfUrl);
                if (!res.ok) throw new Error('Не удалось скачать файл');
                pdfArrayBuffer = await res.arrayBuffer();
            }

            const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 2.5 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            container.style.width = `${viewport.width}px`;
            container.style.height = `${viewport.height}px`;

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            const scaleX = wrapper.clientWidth / viewport.width;
            const scaleY = wrapper.clientHeight / viewport.height;
            const initialScale = Math.min(scaleX, scaleY) * 0.95;

            const startX = (wrapper.clientWidth - (viewport.width * initialScale)) / 2;
            const startY = (wrapper.clientHeight - (viewport.height * initialScale)) / 2;

            container.style.visibility = 'visible';
            this.panzoomInstance = Panzoom(container, {
                maxScale: 5,
                minScale: initialScale * 0.5,
                startScale: initialScale,
                startX: startX,
                startY: startY,
                contain: 'outside',
                step: 0.3
            });

            wrapper.parentElement.addEventListener('wheel', this.panzoomInstance.zoomWithWheel);

            // === ВЕШАЕМ КЛИК ДЛЯ ПОСТАНОВКИ ТОЧКИ ===
            container.onclick = (e) => this.handleCanvasClick(e);

            // === ОТРИСОВКА СУЩЕСТВУЮЩИХ ТОЧЕК НА БОЛЬШОМ ЭКРАНЕ ===
            if (floorId) {
                setTimeout(() => {
                    window.ConstDefectForm.renderAllPins(floorId, {
                        status: this.currentFilterStatus,
                        category: this.currentFilterCategory
                    });
                }, 100);
            }

        } catch (e) {
            console.error('[UniversalPdfViewer] Ошибка:', e);
            if (typeof showToast === 'function') showToast('❌ Ошибка: ' + e.message);
        } finally {
            loader.classList.add('hidden');
        }
    },

    // Включение/Отключение режима добавления точки
    toggleAddMode() {
        this.setAddMode(!this.isAddMode);
    },

    setAddMode(isActive) {
        this.isAddMode = isActive;
        const btn = document.getElementById('pdf-btn-add-defect');
        const hintAdd = document.getElementById('pdf-add-hint');
        const hintNorm = document.getElementById('pdf-normal-hint');
        const container = document.getElementById('universal-pdf-container');

        if (isActive) {
            btn.classList.replace('bg-red-50', 'bg-red-600');
            btn.classList.replace('text-red-600', 'text-white');
            btn.innerHTML = 'Отмена';
            hintNorm.classList.add('hidden');
            hintAdd.classList.remove('hidden');
            // Меняем курсор на прицел
            if (container) container.style.cursor = 'crosshair';
        } else {
            btn.classList.replace('bg-red-600', 'bg-red-50');
            btn.classList.replace('text-white', 'text-red-600');
            btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Добавить дефект';
            hintNorm.classList.remove('hidden');
            hintAdd.classList.add('hidden');
            // Обычный курсор для панорамирования
            if (container) container.style.cursor = 'grab';
        }
    },

    // Обработка клика по чертежу
    handleCanvasClick(e) {
        if (!this.isAddMode) return; // Если не в режиме добавления - игнорируем

        // Считаем координаты клика В ПРОЦЕНТАХ относительно холста
        // e.offsetX / e.offsetY работают идеально, так как мы кликаем по внутреннему элементу (canvas)
        const container = document.getElementById('universal-pdf-container');
        const xPercent = (e.offsetX / container.offsetWidth) * 100;
        const yPercent = (e.offsetY / container.offsetHeight) * 100;

        // Отключаем режим добавления
        this.setAddMode(false);

        // Показываем координаты (для теста)
        if (typeof showToast === 'function') showToast(`Точка: X=${xPercent.toFixed(1)}%, Y=${yPercent.toFixed(1)}%`);

        // Рисуем временную булавку
        this.drawTempPin(xPercent, yPercent);

        // Вызываем модалку создания дефекта
        window.ConstDefectForm.openNew(xPercent, yPercent);
    },

    drawTempPin(xPercent, yPercent) {
        const pinsContainer = document.getElementById('universal-pdf-pins');
        if (!pinsContainer) return;

        // Очищаем старую временную булавку, если есть
        const oldTemp = document.getElementById('temp-pin');
        if (oldTemp) oldTemp.remove();

        // Красивая пульсирующая булавка
        const pinHtml = `
            <div id="temp-pin" class="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black z-30 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" style="left: ${xPercent}%; top: ${yPercent}%;">
                +
            </div>
        `;
        pinsContainer.insertAdjacentHTML('beforeend', pinHtml);
    },

    close() {
        const modal = document.getElementById('universal-pdf-modal');
        const wrapper = document.getElementById('universal-pdf-wrapper');
        const pins = document.getElementById('universal-pdf-pins');

        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            if (pins) pins.innerHTML = ''; // Очищаем булавки при закрытии

            if (this.panzoomInstance) {
                wrapper.parentElement.removeEventListener('wheel', this.panzoomInstance.zoomWithWheel);
                this.panzoomInstance.destroy();
                this.panzoomInstance = null;
            }
        }, 300);
    }
};

// ============================================================================
// === УПРАВЛЕНИЕ ФОРМОЙ ДЕФЕКТА И ОТРИСОВКА БУЛАВОК НА ПЛАНАХ ===
// ============================================================================
// ============================================================================
// === УПРАВЛЕНИЕ ФОРМОЙ ДЕФЕКТА И ОТРИСОВКА БУЛАВОК НА ПЛАНАХ ===
// ============================================================================
window.ConstDefectForm = {
    // --- Вспомогательная: получить плоский список пунктов из групп чек-листа ---
    getFlatItemsFromGroups(groups) {
        let items = [];
        groups.forEach(g => {
            if (g.items) items.push(...g.items);
        });
        return items;
    },

    // --- Заполнение выпадающих списков (чекс-листы и подрядчики) ---
    populateDropdowns() {
        // 1. Чек-листы
        const tmplSelect = document.getElementById('const-defect-template');
        let tmplHtml = '<option value="">-- Выберите вид работ --</option>';
        Object.keys(SYSTEM_TEMPLATES).sort().forEach(k => {
            tmplHtml += `<option value="sys_${k}">[СИС] ${SYSTEM_TEMPLATES[k].title}</option>`;
        });
        if (typeof userTemplates !== 'undefined') {
            Object.keys(userTemplates).sort().forEach(k => {
                tmplHtml += `<option value="user_${k}">[МОЙ] ${userTemplates[k].title}</option>`;
            });
        }
        tmplSelect.innerHTML = tmplHtml;

        // 2. Подрядчики (из справочника или истории)
        const contrSelect = document.getElementById('const-defect-contractor');
        let contrHtml = '<option value="">-- Выберите подрядчика --</option>';
        let uniqueContrs = [];
        if (typeof ContractorDirectory !== 'undefined' && ContractorDirectory.contractors.length > 0) {
            uniqueContrs = ContractorDirectory.contractors.map(c => c.display_name);
        } else if (typeof contractorArray !== 'undefined') {
            uniqueContrs = [...new Set(contractorArray.map(c => c.contractorName).filter(Boolean))];
        }
        uniqueContrs.sort().forEach(c => {
            contrHtml += `<option value="${c.replace(/"/g, '&quot;')}">${c}</option>`;
        });
        contrSelect.innerHTML = contrHtml;
    },

    // --- Выбран чек-лист → загружаем пункты нарушений ---
    onTemplateChange(tmplKey) {
        const itemSelect = document.getElementById('const-defect-item');
        const normBlock = document.getElementById('const-defect-norm-block');
        normBlock.classList.add('hidden');

        if (!tmplKey) {
            itemSelect.innerHTML = '<option value="">Сначала выберите вид работ...</option>';
            return;
        }

        const type = tmplKey.split('_')[0];
        const key = tmplKey.replace(type + '_', '');
        let groups = [];
        if (type === 'sys' && SYSTEM_TEMPLATES[key]) groups = SYSTEM_TEMPLATES[key].groups;
        else if (type === 'user' && userTemplates[key]) groups = userTemplates[key].groups;

        let optionsHtml = '<option value="">-- Выберите нарушение --</option>';
        groups.forEach(g => {
            optionsHtml += `<optgroup label="${g.group || g.title}">`;
            (g.items || []).forEach(i => {
                const safeNorm = (i.t || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                optionsHtml += `<option value="${i.id}" data-weight="${i.w}" data-norm="${safeNorm}" data-text="${i.n.replace(/"/g, '&quot;')}">${i.n}</option>`;
            });
            optionsHtml += `</optgroup>`;
        });
        itemSelect.innerHTML = optionsHtml;
    },

    // --- Выбран пункт → показать норматив, установить категорию, подставить название нарушения ---
    onItemChange(itemId) {
        const select = document.getElementById('const-defect-item');
        const option = select.querySelector(`option[value="${itemId}"]`);
        if (!option) return;

        const normBlock = document.getElementById('const-defect-norm-block');
        const normText = option.getAttribute('data-norm');
        const weight = parseInt(option.getAttribute('data-weight'));
        const itemName = option.getAttribute('data-text');

        if (normText && normText.trim()) {
            document.getElementById('const-defect-norm-text').innerHTML = normText;
            normBlock.classList.remove('hidden');
        } else {
            normBlock.classList.add('hidden');
        }

        // Автоматически ставим категорию по весу пункта
        const catSelect = document.getElementById('const-defect-category');
        if (weight === 1) catSelect.value = 'B1';
        else if (weight === 2) catSelect.value = 'B2';
        else if (weight === 3) catSelect.value = 'B3';

        // Сохраняем название пункта в hidden-поле (для последующего сохранения)
        document.getElementById('const-defect-item-name').value = itemName;
    },

    // --- Открыть форму для нового дефекта ---
        openNew(xPercent, yPercent) {
        // Генерируем постоянный ID для нового дефекта
        const newId = 'def_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
        
        this.populateDropdowns();

        document.getElementById('const-defect-id').value = newId;
        document.getElementById('const-defect-x').value = xPercent;
        document.getElementById('const-defect-y').value = yPercent;
        document.getElementById('const-defect-template').value = '';
        document.getElementById('const-defect-item').innerHTML = '<option value="">Сначала выберите вид работ...</option>';
        document.getElementById('const-defect-item-name').value = '';
        document.getElementById('const-defect-norm-block').classList.add('hidden');
        document.getElementById('const-defect-category').value = 'B2';
        document.getElementById('const-defect-deadline').value = '';
        document.getElementById('const-defect-contractor').value = '';
        document.getElementById('const-defect-desc').value = '';
        
        // Очищаем превью фото
        this.removePhoto();

        document.getElementById('const-defect-modal-title').innerText = 'Новое замечание';
        document.getElementById('const-defect-actions').innerHTML = `
            <button onclick="window.ConstDefectForm.close()" class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-[11px] font-bold uppercase active:scale-95 border border-slate-200">Отмена</button>
            <button onclick="window.ConstDefectForm.save()" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">💾 Сохранить</button>
        `;

        document.getElementById('const-defect-modal').style.display = 'flex';
    },

    // --- Открыть форму для редактирования существующего дефекта ---
    openExisting(id) {
        const defect = window.ConstManager.defects.find(d => d.id === id);
        if (!defect) return;

        this.populateDropdowns();

        document.getElementById('const-defect-id').value = defect.id;
        document.getElementById('const-defect-x').value = defect.x;
        document.getElementById('const-defect-y').value = defect.y;
        document.getElementById('const-defect-template').value = defect.templateKey || '';
        // После выбора чек-листа нужно подгрузить пункты
        this.onTemplateChange(defect.templateKey);
        // Небольшая задержка, чтобы пункты успели отрисоваться
        setTimeout(() => {
            document.getElementById('const-defect-item').value = defect.itemId || '';
            this.onItemChange(defect.itemId);
        }, 50);
        document.getElementById('const-defect-item-name').value = defect.itemName || '';
        document.getElementById('const-defect-category').value = defect.category || 'B2';
        document.getElementById('const-defect-deadline').value = defect.deadline || '';
        document.getElementById('const-defect-contractor').value = defect.contractor || '';
        document.getElementById('const-defect-desc').value = defect.description || '';

        // Загружаем фото из глобального хранилища, если оно есть
        if (window.photos && window.photos[defect.id]) {
            this.tempPhoto = window.photos[defect.id];
            const previewDiv = document.getElementById('const-defect-photo-preview');
            const imgEl = document.getElementById('const-defect-img');
            if (previewDiv && imgEl) {
                imgEl.src = window.photos[defect.id];
                previewDiv.classList.remove('hidden');
                const btn = document.getElementById('const-defect-photo-btn');
                if (btn) btn.innerHTML = '📷 Изменить фото';
            }
        } else {
            this.removePhoto(); // если фото нет – очищаем превью
        }
        document.getElementById('const-defect-modal-title').innerText = 'Редактирование замечания';
        document.getElementById('const-defect-actions').innerHTML = `
            <button onclick="window.ConstDefectForm.delete('${defect.id}')" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-[11px] font-bold uppercase active:scale-95 border border-red-200">🗑️ Удалить</button>
            <button onclick="window.ConstDefectForm.save()" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">💾 Обновить</button>
        `;

        document.getElementById('const-defect-modal').style.display = 'flex';
    },

    // --- Закрыть форму ---
    close() {
        document.getElementById('const-defect-modal').style.display = 'none';
        const tempPin = document.getElementById('temp-pin');
        if (tempPin) tempPin.remove();
    },

    // --- Сохранить дефект (новый или обновление) ---
            save() {
        const id = document.getElementById('const-defect-id').value;
        const x = parseFloat(document.getElementById('const-defect-x').value);
        const y = parseFloat(document.getElementById('const-defect-y').value);
        const floorId = window.ConstManager.currentFlrId;
        const templateKey = document.getElementById('const-defect-template').value;
        const itemId = document.getElementById('const-defect-item').value;
        const itemName = document.getElementById('const-defect-item-name').value;
        const normText = document.getElementById('const-defect-norm-text').innerHTML;
        const category = document.getElementById('const-defect-category').value;
        const deadline = document.getElementById('const-defect-deadline').value;
        const contractor = document.getElementById('const-defect-contractor').value;
        const description = document.getElementById('const-defect-desc').value.trim();

        if (!templateKey) return showToast('⚠️ Выберите вид работ!');
        if (!itemId) return showToast('⚠️ Выберите нарушение!');
        if (!contractor) return showToast('⚠️ Выберите ответственного подрядчика!');

        // Получаем фото из глобального хранилища
        let photo = (window.photos && window.photos[id]) ? window.photos[id] : null;

        // Если фото нет, но есть временный ключ (перенос из temp, если использовался)
        if (!photo && window.tempDefectPhotoKey && window.photos && window.photos[window.tempDefectPhotoKey]) {
            photo = window.photos[window.tempDefectPhotoKey];
            window.photos[id] = photo;
            delete window.photos[window.tempDefectPhotoKey];
            window.tempDefectPhotoKey = null;
        }

        const now = new Date().toISOString();
        const defectData = {
            id: id,
            floorId: floorId,
            x: x,
            y: y,
            templateKey: templateKey,
            itemId: itemId,
            itemName: itemName,
            normText: normText,
            text: itemName,
            category: category,
            deadline: deadline,
            contractor: contractor,
            description: description,
            photo: photo,
            status: 'issued',
            created_at: now,
            updated_at: now,
            created_by: window.syncConfig?.engineerName || 'Инженер'
        };

        const existingIndex = window.ConstManager.defects.findIndex(d => d.id === id);
        if (existingIndex !== -1) {
            window.ConstManager.defects[existingIndex] = { ...window.ConstManager.defects[existingIndex], ...defectData };
        } else {
            window.ConstManager.defects.push(defectData);
        }

        if (typeof dbPut === 'function' && STORES.CONST_DEFECTS) {
            dbPut(STORES.CONST_DEFECTS, defectData).catch(e => console.warn('Ошибка сохранения дефекта', e));
        }

        this.close();
        showToast('✅ Замечание сохранено на плане!');
        this.renderAllPins(floorId, {
            status: window.ConstManager.currentFilterStatus,
            category: window.ConstManager.currentFilterCategory
        });
    },

    // --- Удалить дефект ---
    delete(id) {
        if (!confirm('Удалить это замечание с плана?')) return;
        window.ConstManager.defects = window.ConstManager.defects.filter(d => d.id !== id);
        if (typeof dbDelete === 'function' && STORES.CONST_DEFECTS) {
            dbDelete(STORES.CONST_DEFECTS, id).catch(e => console.warn('Ошибка удаления дефекта', e));
        }
        this.close();
        this.renderAllPins(window.ConstManager.currentFlrId);
        showToast('🗑️ Замечание удалено');
    },

    // --- Отрисовать все булавки на текущем плане ---
    // --- Отрисовать все булавки на текущем плане с учётом фильтров ---
    renderAllPins(floorId, filters = {}) {
        if (!floorId) return;
        let defects = window.ConstManager.defects.filter(d => d.floorId === floorId);

        // Применяем фильтры, если они переданы
        if (filters.status && filters.status !== 'ALL') {
            defects = defects.filter(d => d.status === filters.status);
        }
        if (filters.category && filters.category !== 'ALL') {
            defects = defects.filter(d => d.category === filters.category);
        }

        // Генерируем HTML для точек
        const pinsHtml = defects.map((d, index) => {
            let bgColor = 'bg-blue-500';  // B1
            if (d.category === 'B2') bgColor = 'bg-orange-500';
            if (d.category === 'B3') bgColor = 'bg-red-600';
            return `
            <div onclick="window.ConstDefectForm.openExisting('${d.id}')" 
                 class="absolute w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-black cursor-pointer hover:scale-125 transition-transform z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto ${bgColor}" 
                 style="left: ${d.x}%; top: ${d.y}%;" 
                 title="${d.itemName} (${d.category})">
                ${index + 1}
            </div>
        `;
        }).join('');

        // 1. Универсальный контейнер (используется при открытом pdf-просмотрщике)
        const universalPinsContainer = document.getElementById('universal-pdf-pins');
        if (universalPinsContainer) {
            universalPinsContainer.innerHTML = pinsHtml;
        }

        // 2. Контейнер на странице администрирования (мини-превью)
        const previewRenderArea = document.getElementById('const-pdf-render-area');
        if (previewRenderArea && !previewRenderArea.classList.contains('hidden')) {
            let previewPinsContainer = document.getElementById('preview-pdf-pins');
            if (!previewPinsContainer) {
                previewPinsContainer = document.createElement('div');
                previewPinsContainer.id = 'preview-pdf-pins';
                previewPinsContainer.className = 'absolute inset-0 pointer-events-none overflow-hidden';
                previewRenderArea.appendChild(previewPinsContainer);
            }
            previewPinsContainer.innerHTML = pinsHtml;
        }
    },
    // --- Используем существующую глобальную систему фото ---
        handlePhotoUpload(event) {
        let defectId = document.getElementById('const-defect-id').value;
        if (!defectId) {
            // Защита: если ID нет (не должно случиться, но на всякий случай)
            defectId = 'def_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
            document.getElementById('const-defect-id').value = defectId;
        }
        // Запоминаем ID для переноса (на случай, если он изменится, но у нас постоянный)
        window.tempDefectPhotoKey = null;
        window.currentPhotoId = defectId;
        window.activePhotoContext = 'defect';
        if (typeof window.handlePhotoUpload === 'function') {
            window.handlePhotoUpload(event);
        } else {
            console.error('window.handlePhotoUpload not found');
        }
    },

    removePhoto() {
        const defectId = document.getElementById('const-defect-id').value;
        if (defectId && window.photos) {
            delete window.photos[defectId];  // удаляем фото из глобального хранилища
        }
        // Скрываем превью
        const previewDiv = document.getElementById('const-defect-photo-preview');
        if (previewDiv) previewDiv.classList.add('hidden');
        const imgEl = document.getElementById('const-defect-img');
        if (imgEl) imgEl.src = '';
        const btn = document.getElementById('const-defect-photo-btn');
        if (btn) btn.innerHTML = '📷 Прикрепить фото';
        const fileInput = document.getElementById('const-defect-photo-input');
        if (fileInput) fileInput.value = '';
        window.currentPhotoId = null;
        window.activePhotoContext = null;
    },
};