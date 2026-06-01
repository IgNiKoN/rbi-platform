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
    activeStatusFilters: [], // Пустой массив = выбраны все
    currentFilterCategory: 'ALL',

    // 1. Инициализация (загрузка данных из БД)
    async init() {
        console.log('[ConstManager] Загрузка иерархии планов...');
        try {
            // Грузим из локальной IndexedDB
            if (typeof dbGetAll !== 'undefined') {
                // ЕДИНЫЙ СПРАВОЧНИК ОБЪЕКТОВ (Интеграция со всем приложением)
                const storedObjs = await dbGetAll('project_objects');
                const validObjs = (storedObjs || []).filter(o => !o._deleted && !o.is_deleted);
                this.objects = validObjs.map(obj => ({
                    id: obj.canonical_key,
                    name: obj.display_name
                }));

                const b = await dbGetAll(STORES.CONST_BUILDINGS);
                this.buildings = (b || []).filter(x => !x._deleted);

                const f = await dbGetAll(STORES.CONST_FLOORS);
                this.floors = (f || []).filter(x => !x._deleted);

                const d = await dbGetAll(STORES.CONST_DEFECTS);
                this.defects = (d || []).filter(x => !x._deleted);

                // --- Загрузка заявок на приемку ---
                if (window.ConstAcceptance && typeof window.ConstAcceptance.init === 'function') {
                    // Запуск модуля приемки происходит асинхронно при открытии вкладки,
                    // но мы можем подстраховаться и загрузить базу здесь
                    const reqs = await dbGetAll(STORES.CONST_ACCEPTANCE);
                    if (reqs) window.ConstAcceptance.requests = reqs.filter(x => !x._deleted);
                }

                for (const def of this.defects) {
                    if (!def.id || !def.photo) continue;

                    if (String(def.photo).startsWith('data:') && typeof window.ensureLocalPhotoRef === 'function') {
                        def.photo = await window.ensureLocalPhotoRef(def.photo, 'const', {
                            entityType: 'construction_defect',
                            entityId: def.id
                        });
                        if (typeof dbPut === 'function') {
                            await dbPut(STORES.CONST_DEFECTS, def);
                        }
                    }

                    if (window.photos) {
                        window.photos[def.id] = def.photo;
                    }
                }
            }
        } catch (e) {
            console.error('[ConstManager] Ошибка загрузки БД:', e);
        }

        this.renderAdminPanel();
        this.renderSelectors();
        this.updateStatusChips(); // <-- ДОБАВИЛИ ЭТО
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
        const layerSel = document.getElementById('const-layer-select');
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
        // --- СЛОИ ---
        if (layerSel) {
            // Если он пустой, инициализируем
            if (layerSel.options.length === 0) {
                layerSel.innerHTML = `
                    <option value="ALL">Слой: Все дефекты</option>
                    <option value="SMR">Слой: Только СМР (Строительство)</option>
                    <option value="OT">Слой: Охрана труда и ПБ</option>
                    <option value="ZONES">Слой: Зоны приемки работ</option>
                `;
            }
            // Запоминаем выбранный слой
            if (!this.currentLayer) this.currentLayer = 'ALL';
            layerSel.value = this.currentLayer;
        }
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
            // Учитываем текущий вид (План или Реестр)
            if (this.currentView === 'plan') {
                this.loadPdfForFloor(this.currentFlrId);
            } else {
                this.renderDefectsList();
            }
        } else {
            this.currentFlrId = null;
            flrSel.value = '';
            this.clearPdfView();
            if (this.currentView === 'list') this.renderDefectsList();
        }
    },

    // 4. Обработчики изменений (onchange)
    onObjectChange() {
        this.currentObjId = document.getElementById('const-object-select').value;
        this.currentBldId = null;
        this.currentFlrId = null;
        this.updateBuildingSelector();
        this.updateFloorSelector();
        this.updateStatusChips(); // <-- ДОБАВИЛИ
    },

    onBuildingChange() {
        this.currentBldId = document.getElementById('const-building-select').value;
        this.currentFlrId = null;
        this.updateFloorSelector();
        this.updateStatusChips(); // <-- ДОБАВИЛИ
    },

    onFloorChange() {
        this.currentFlrId = document.getElementById('const-floor-select').value;
        if (this.currentFlrId) {
            if (this.currentView === 'plan') {
                this.loadPdfForFloor(this.currentFlrId);
            } else {
                this.renderDefectsList();
            }
        } else {
            this.clearPdfView();
            if (this.currentView === 'list') this.renderDefectsList();
        }
        this.updateStatusChips(); // <-- ДОБАВИЛИ
    },
    onLayerChange() {
        const layerSel = document.getElementById('const-layer-select');
        if (!layerSel) return;
        this.currentLayer = layerSel.value;
        
        // Перерисовываем точки с учетом нового слоя
        if (this.currentFlrId) {
            window.ConstDefectForm.renderAllPins(this.currentFlrId, {
                status: this.currentFilterStatus,
                category: this.currentFilterCategory
            });
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

        // Показываем лоадер и разрешаем скролл
        placeholder.innerHTML = `<div class="animate-pulse">Загрузка PDF плана...</div>`;
        placeholder.classList.remove('hidden');
        renderArea.classList.add('hidden');
        renderArea.innerHTML = '';
        renderArea.classList.remove('touch-none'); // Разрешаем скроллить план пальцем!

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

            // ЖЕСТКАЯ ПРИВЯЗКА КООРДИНАТ: Создаем обертку строго по размеру холста
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'relative w-full';
            wrapperDiv.style.lineHeight = '0'; // Убираем пустое пространство под картинкой

            const canvas = document.createElement('canvas');
            canvas.className = 'w-full h-auto'; // План занимает 100% ширины
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            wrapperDiv.appendChild(canvas);

            // КОНТЕЙНЕР БУЛАВОК (Находится внутри жесткой обертки, точки 100% не съедут)
            const pinsContainer = document.createElement('div');
            pinsContainer.id = 'preview-pdf-pins';
            pinsContainer.className = 'absolute top-0 left-0 w-full h-full pointer-events-none';
            wrapperDiv.appendChild(pinsContainer);

            // 3. Добавляем всё это в область рендера
            renderArea.appendChild(wrapperDiv);

            // 3.5. Отрисовываем уже существующие на этом этаже точки (с небольшой задержкой)
            window.ConstManager.currentFlrId = floorId;
            setTimeout(() => window.ConstDefectForm.renderAllPins(floorId, {
                status: this.currentFilterStatus,
                category: this.currentFilterCategory
            }), 100);

            // 4. Плавающая кнопка Интерактивного плана
            const safeName = floor.name.replace(/'/g, "\\'");
            const oldBtn = document.getElementById('interactive-plan-btn');
            if (oldBtn) oldBtn.remove();

            // Сжимаем область чертежа снизу на 70px, чтобы освободить место для кнопки и избежать перекрытия
            renderArea.style.bottom = '70px';

            const btnHtml = `
                <div id="interactive-plan-btn" class="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <button onclick="window.UniversalPdfViewer.open('${floor.pdf_url}', 'План: ${safeName}', '${floor.id}')" class="pointer-events-auto bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-[0_5px_15px_rgba(79,70,229,0.4)] active:scale-95 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-transform border border-indigo-400">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        Интерактивный план
                    </button>
                </div>
            `;
            // Добавляем кнопку к главному контейнеру
            document.getElementById('const-plan-container').insertAdjacentHTML('beforeend', btnHtml);

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
        const categoryEl = document.getElementById('const-filter-category');
        if (categoryEl) this.currentFilterCategory = categoryEl.value;

        if (this.currentView === 'plan') {
            if (this.currentFlrId && window.ConstDefectForm && typeof window.ConstDefectForm.renderAllPins === 'function') {
                window.ConstDefectForm.renderAllPins(this.currentFlrId, {
                    statuses: this.activeStatusFilters.length > 0 ? this.activeStatusFilters : ['issued', 'in_progress', 'fixed', 'closed', 'rejected'],
                    category: this.currentFilterCategory
                });
            }
        } else {
            this.renderDefectsList();
        }
        this.updateStatusChips(); // Обновляем счетчики при смене категории
    },

    exportDefectsToExcel() {
        let filtered = this.defects;
        let fileNamePrefix = "Все_Объекты";

        // Фильтрация по иерархии
        if (this.currentFlrId) {
            filtered = filtered.filter(d => d.floorId === this.currentFlrId);
            fileNamePrefix = this.floors.find(f => f.id === this.currentFlrId)?.name || 'Этаж';
        } else if (this.currentBldId) {
            const bldFloors = this.floors.filter(f => f.building_id === this.currentBldId).map(f => f.id);
            filtered = filtered.filter(d => bldFloors.includes(d.floorId));
            fileNamePrefix = this.buildings.find(b => b.id === this.currentBldId)?.name || 'Корпус';
        } else if (this.currentObjId) {
            const objBuildings = this.buildings.filter(b => b.object_id === this.currentObjId).map(b => b.id);
            const objFloors = this.floors.filter(f => objBuildings.includes(f.building_id)).map(f => f.id);
            filtered = filtered.filter(d => objFloors.includes(d.floorId));
            fileNamePrefix = this.objects.find(o => o.id === this.currentObjId)?.name || 'Объект';
        }

        // Умная фильтрация перед выгрузкой (по статусу и категории)
        // Умная фильтрация перед выгрузкой (по статусу и категории)
        if (this.activeStatusFilters.length > 0) {
            filtered = filtered.filter(d => this.activeStatusFilters.includes(d.status));
        }
        if (this.currentFilterCategory && this.currentFilterCategory !== 'ALL') {
            filtered = filtered.filter(d => d.category === this.currentFilterCategory);
        }

        if (filtered.length === 0) return showToast('⚠️ Нет данных для выгрузки');

        const statusNames = { 'issued': 'Выдано', 'in_progress': 'В работе', 'fixed': 'Устранено (Ждет СК)', 'closed': 'Закрыто', 'rejected': 'Отклонено СК' };

        // Собираем данные со всей историей статусов
        const dataToExport = filtered.map((d, index) => {
            let dateFixed = '-';
            let dateClosed = '-';
            let commentsArr = [];

            if (d.history && d.history.length > 0) {
                const fixedRecord = d.history.find(h => h.status === 'fixed');
                if (fixedRecord) dateFixed = new Date(fixedRecord.date).toLocaleString('ru-RU');

                const closedRecord = d.history.find(h => h.status === 'closed');
                if (closedRecord) dateClosed = new Date(closedRecord.date).toLocaleString('ru-RU');

                d.history.forEach(h => {
                    if (h.comment) commentsArr.push(`[${statusNames[h.status] || h.status}] ${h.user}: ${h.comment}`);
                });
            }

            // Ищем привязки по ID этажа
            const flr = window.ConstManager.floors.find(f => f.id === d.floorId);
            const bld = flr ? window.ConstManager.buildings.find(b => b.id === flr.building_id) : null;
            const obj = bld ? window.ConstManager.objects.find(o => o.id === bld.object_id) : null;

            return {
                "№": index + 1,
                "Объект": obj?.name || '-',
                "Корпус": bld?.name || '-',
                "Этаж": flr?.name || '-',
                "Координаты (X, Y)": `${parseFloat(d.x).toFixed(1)}%, ${parseFloat(d.y).toFixed(1)}%`,
                "Статус": statusNames[d.status] || d.status,
                "Категория": d.category,
                "Ответственный подрядчик": d.contractor || '-',
                "Вид работ": d.templateKey ? (SYSTEM_TEMPLATES[d.templateKey.replace('sys_', '')]?.title || userTemplates[d.templateKey.replace('user_', '')]?.title || d.templateKey) : '-',
                "Нарушение": d.itemName,
                "Норматив": d.normText ? d.normText.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, "\n") : '-',
                "Уточнение": d.description || '-',
                "Срок устранения": d.deadline ? new Date(d.deadline).toLocaleDateString('ru-RU') : '-',
                "Дата выдачи": new Date(d.created_at).toLocaleString('ru-RU'),
                "Дата устранения (Факт)": dateFixed,
                "Дата закрытия": dateClosed,
                "Автор": d.created_by || '-',
                "История комментариев": commentsArr.join('\n')
            };
        });

        try {
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Реестр");
            
            // Безопасное имя файла
            const safeName = fileNamePrefix.replace(/[/\\?%*:|"<>]/g, '-');
            XLSX.writeFile(workbook, `Реестр_СК_${safeName}_${new Date().toLocaleDateString('ru-RU')}.xlsx`);
            showToast("✅ Полный реестр успешно выгружен в Excel!");
        } catch (e) {
            console.error(e);
            showToast("❌ Ошибка при формировании Excel файла");
        }
    },

    renderDefectsList() {
        const container = document.getElementById('const-list-container');
        if (!container) return;

        if (!this.defects || !Array.isArray(this.defects)) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Ошибка загрузки данных</div>`;
            return;
        }

        // --- УМНАЯ ФИЛЬТРАЦИЯ ИЕРАРХИИ ---
        let filtered = this.defects;
        let locationTitle = "Все объекты";

        // Если выбран этаж - показываем только этот этаж
        if (this.currentFlrId) {
            filtered = filtered.filter(d => d.floorId === this.currentFlrId);
            const flrName = this.floors.find(f => f.id === this.currentFlrId)?.name || 'Этаж';
            locationTitle = `Уровень: ${flrName}`;
        } 
        // Если выбран только корпус - показываем все этажи корпуса
        else if (this.currentBldId) {
            const bldFloors = this.floors.filter(f => f.building_id === this.currentBldId).map(f => f.id);
            filtered = filtered.filter(d => bldFloors.includes(d.floorId));
            const bldName = this.buildings.find(b => b.id === this.currentBldId)?.name || 'Корпус';
            locationTitle = `Уровень: ${bldName} (Все этажи)`;
        } 
        // Если выбран только объект - показываем все корпуса объекта
        else if (this.currentObjId) {
            const objBuildings = this.buildings.filter(b => b.object_id === this.currentObjId).map(b => b.id);
            const objFloors = this.floors.filter(f => objBuildings.includes(f.building_id)).map(f => f.id);
            filtered = filtered.filter(d => objFloors.includes(d.floorId));
            const objName = this.objects.find(o => o.id === this.currentObjId)?.name || 'Объект';
            locationTitle = `Уровень: ${objName} (Весь объект)`;
        }

        // --- СЧЕТЧИКИ СТАТУСОВ ---
        let countOpen = 0, countFixed = 0, countClosed = 0, countRejected = 0;
        filtered.forEach(d => {
            if (d.status === 'issued' || d.status === 'in_progress') countOpen++;
            else if (d.status === 'fixed') countFixed++;
            else if (d.status === 'closed') countClosed++;
            else if (d.status === 'rejected') countRejected++;
        });

        // HTML заглушка для шапки реестра
        const statsHtml = `
            <div class="flex justify-between items-center mb-3">
                <div class="text-[10px] font-black uppercase text-slate-500 tracking-widest">${locationTitle}</div>
            </div>
        `;

        // --- ПРИМЕНЕНИЕ ВЫБРАННЫХ ФИЛЬТРОВ ---
        if (this.activeStatusFilters.length > 0) {
            filtered = filtered.filter(d => this.activeStatusFilters.includes(d.status));
        }
        if (this.currentFilterCategory && this.currentFilterCategory !== 'ALL') {
            filtered = filtered.filter(d => d.category === this.currentFilterCategory);
        }

        // Сортировка: Сначала красные (B3), потом новые

        // Сортировка: Сначала красные (B3), потом новые
        // Вычисляем порядковые номера (от самых старых к новым), чтобы они совпадали с планом
        const allDefectsForFloor = this.defects.filter(d => d.floorId === this.currentFlrId);
        const originalIndexes = new Map();
        allDefectsForFloor.forEach((d, i) => originalIndexes.set(d.id, i + 1));
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
            const photoRef = d.photo || '';
            const needsHydrate = photoRef.startsWith('local://') || photoRef.startsWith('cloud://');
            const photoSrc = photoRef ? (typeof window.getPhotoSrc === 'function' ? window.getPhotoSrc(photoRef) : photoRef) : '';
            const localAttr = needsHydrate ? ` data-local-src="${photoRef}"` : '';
            const photoHtml = photoSrc ?
                `<img src="${photoSrc}"${localAttr} class="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer shadow-sm shrink-0" onclick="event.stopPropagation(); window.ConstDefectForm.openDefectPhoto('${d.id}')">` :
                `<div class="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[8px] text-slate-400 font-bold uppercase shrink-0 text-center leading-tight">Нет<br>фото</div>`;

            let catColor = 'bg-blue-500';
            if (d.category === 'B2') catColor = 'bg-orange-500';
            if (d.category === 'B3') catColor = 'bg-red-600';

            const deadlineText = d.deadline ? new Date(d.deadline).toLocaleDateString('ru-RU') : 'Не указан';

            return `
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex flex-col cursor-pointer hover:border-indigo-400 transition-colors" onclick="window.ConstDefectForm && window.ConstDefectForm.openExisting && window.ConstDefectForm.openExisting('${d.id}')">
                <div class="flex gap-3 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                    ${photoHtml}
                    <div class="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                            <div class="flex items-start justify-between gap-2 mb-1">
                                <div class="text-[12px] font-black text-slate-800 dark:text-white truncate leading-tight flex items-center gap-1.5">
                                    <span class="${catColor} text-white px-1.5 py-0.5 rounded text-[8px] tracking-widest">${d.category}</span>
                                    <span class="truncate">№${originalIndexes.get(d.id)}: ${d.itemName}</span>
                                </div>
                                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded border ${statusColors[d.status]} shrink-0">${statusNames[d.status] || d.status}</span>
                            </div>
                            <div class="text-[10px] text-slate-500 truncate font-medium">${d.contractor || 'Подрядчик не указан'}</div>
                        </div>
                        <div class="mt-1 flex justify-between items-center">
                            <div class="text-[9px] font-bold text-slate-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> До: ${deadlineText}</div>
                            <div class="text-[9px] font-bold text-slate-400">${new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
                        </div>
                    </div>
                </div>
                
                <!-- НОВАЯ КНОПКА ПОИСКА НА ПЛАНЕ -->
                <div class="flex justify-end mt-1">
                    <button onclick="event.stopPropagation(); window.ConstManager.focusOnPin('${d.id}')" class="bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-transform shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        Показать на плане
                    </button>
                </div>
            </div>`;
        }).join('');

        if (typeof window.rbiHydrateLocalImages === 'function') {
            window.rbiHydrateLocalImages(container);
        }
    },
    // --- Поиск и фокусировка на конкретной точке на интерактивном плане ---
    // --- Поиск и фокусировка на конкретной точке на интерактивном плане ---
    focusOnPin(defectId) {
        const defect = this.defects.find(d => d.id === defectId);
        if (!defect) return;

        if (this.currentFlrId !== defect.floorId) {
            const floor = this.floors.find(f => f.id === defect.floorId);
            if (floor) {
                this.currentObjId = this.buildings.find(b => b.id === floor.building_id)?.object_id;
                this.currentBldId = floor.building_id;
                this.currentFlrId = floor.id;
                this.renderSelectors();
            }
        }

        this.switchView('plan');
        const floor = this.floors.find(f => f.id === defect.floorId);
        if (!floor) return;

        const safeName = floor.name.replace(/'/g, "\\'");
        
        // НОВОЕ: Передаем defectId четвертым параметром прямо в просмотрщик!
        window.UniversalPdfViewer.open(floor.pdf_url, `План: ${safeName}`, floor.id, defectId);
    },
    // ==========================================
    // ИНТЕРАКТИВНЫЕ ЧИПСЫ СТАТУСОВ (iOS STYLE)
    // ==========================================
    updateStatusChips() {
        const container = document.getElementById('const-status-chips-container');
        if (!container) return;

        // 1. Собираем базу дефектов по текущей иерархии
        let baseDefects = this.defects;
        if (this.currentFlrId) {
            baseDefects = baseDefects.filter(d => d.floorId === this.currentFlrId);
        } else if (this.currentBldId) {
            const bldFloors = this.floors.filter(f => f.building_id === this.currentBldId).map(f => f.id);
            baseDefects = baseDefects.filter(d => bldFloors.includes(d.floorId));
        } else if (this.currentObjId) {
            const objBuildings = this.buildings.filter(b => b.object_id === this.currentObjId).map(b => b.id);
            const objFloors = this.floors.filter(f => objBuildings.includes(f.building_id)).map(f => f.id);
            baseDefects = baseDefects.filter(d => objFloors.includes(d.floorId));
        }

        // Если применен фильтр категорий (B1/B2/B3), учитываем его в счетчиках
        if (this.currentFilterCategory && this.currentFilterCategory !== 'ALL') {
            baseDefects = baseDefects.filter(d => d.category === this.currentFilterCategory);
        }

        // 2. Считаем количество
        const counts = { issued: 0, in_progress: 0, fixed: 0, closed: 0, rejected: 0 };
        baseDefects.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });

        // 3. Стили для iOS дизайна (Мягкие тона для активных, белые для неактивных)
        const STYLES = {
            issued: {
                active: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400',
                badgeActive: 'bg-red-600 text-white',
            },
            in_progress: {
                active: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
                badgeActive: 'bg-blue-600 text-white',
            },
            fixed: {
                active: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400',
                badgeActive: 'bg-orange-500 text-white',
            },
            closed: {
                active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
                badgeActive: 'bg-green-600 text-white',
            },
            rejected: {
                active: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300',
                badgeActive: 'bg-slate-500 text-white',
            }
        };

        const inactiveClass = 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        const inactiveBadgeClass = 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500 border border-slate-200 dark:border-slate-700';

        // 4. Рисуем кнопки
        const createChip = (statusKey, label) => {
            const isActive = this.activeStatusFilters.includes(statusKey);
            const isAllMode = this.activeStatusFilters.length === 0;
            const visuallyActive = isAllMode || isActive;
            
            const btnClass = visuallyActive ? STYLES[statusKey].active : inactiveClass;
            const badgeClass = visuallyActive ? STYLES[statusKey].badgeActive : inactiveBadgeClass;
            const shadow = visuallyActive ? 'shadow-sm' : '';

            return `
                <button onclick="window.ConstManager.toggleStatusFilter('${statusKey}')" 
                        class="shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 active:scale-95 ${btnClass} ${shadow}">
                    ${label} 
                    <span class="${badgeClass} px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-widest min-w-[20px] text-center">
                        ${counts[statusKey] || 0}
                    </span>
                </button>
            `;
        };

        container.innerHTML = `
            ${createChip('issued', 'Выдано')}
            ${createChip('in_progress', 'В работе')}
            ${createChip('fixed', 'На проверке')}
            ${createChip('closed', 'Закрыто')}
            ${createChip('rejected', 'Отклонено')}
        `;
    },

    toggleStatusFilter(statusKey) {
        const idx = this.activeStatusFilters.indexOf(statusKey);
        if (idx > -1) {
            this.activeStatusFilters.splice(idx, 1); // Выключаем
        } else {
            this.activeStatusFilters.push(statusKey); // Включаем
        }
        
        // Если выбрали все 5, сбрасываем фильтр (режим "Все")
        if (this.activeStatusFilters.length === 5) {
            this.activeStatusFilters = [];
        }

        this.updateStatusChips();
        this.applyFilters();
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
        if (!name || name.trim() === '') return;

        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isManager = ['manager', 'deputy_manager', 'director'].includes(role);

        if (isManager) {
            // Прямое добавление для администраторов
            if (window.ObjectDirectory) {
                const canonical = window.ObjectDirectory.cleanString(name);
                if (window.ObjectDirectory.objects.find(o => o.canonical_key === canonical)) {
                    return showToast("⚠️ Объект с таким названием уже существует!");
                }
                const newObj = {
                    id: 'obj_' + Date.now().toString(36),
                    canonical_key: canonical,
                    display_name: name.trim(),
                    synonyms: [],
                    project_code: window.syncConfig?.projectCode || '',
                    created_by: window.appSettings?.engineerName || 'Админ',
                    updated_at: new Date().toISOString(),
                    _deleted: false,
                    source: 'local',
                    sync_status: 'not_synced'
                };
                window.ObjectDirectory.objects.push(newObj);
                if (typeof dbPut === 'function') dbPut('project_objects', newObj);

                localStorage.setItem('rbi_cloud_dirty', '1');
                if (typeof triggerSync === 'function') triggerSync('silent');

                this.objects.push({ id: canonical, name: name.trim() });
                this.renderTree();
                showToast("✅ Объект добавлен в общий Справочник!");
            }
        } else {
            // Создание заявки для инженера (Как в основном приложении)
            if (typeof appSettings !== 'undefined') {
                if (!appSettings.pendingAssignedProjects) appSettings.pendingAssignedProjects = [];

                const requestedProject = {
                    raw_name: name.trim(),
                    canonical_key: window.ObjectDirectory ? window.ObjectDirectory.cleanString(name) : name.trim().toLowerCase(),
                    display_name: name.trim(),
                    status: 'pending',
                    request_type: 'directory',
                    created_at: new Date().toISOString()
                };

                appSettings.pendingAssignedProjects.push(requestedProject);
                if (typeof dbPut === 'function') dbPut('app_settings', { key: 'user_prefs', ...appSettings });

                if (typeof window.pushObjectRequestToCloud === 'function') {
                    window.pushObjectRequestToCloud(requestedProject);
                }
                showToast("📨 Заявка на создание объекта отправлена руководителю!");
            }
        }
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
            updatedAt: new Date().toISOString(),
            _deleted: false,
            source: 'local',
            sync_status: 'not_synced',
            syncStatus: 'not_synced'
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
            updatedAt: new Date().toISOString(),
            _deleted: false,
            source: 'local',
            sync_status: 'not_synced',
            syncStatus: 'not_synced'
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
            const rawFilePath = `${pCode}/${bld.object_id}/${bld.id}/${floorId}/${safeName}`;

            // ОЧИСТКА ПУТИ: переводим кириллицу в латиницу, убираем скобки и пробелы
            let filePath = rawFilePath;
            if (typeof window.sanitizeStoragePath === 'function') {
                filePath = window.sanitizeStoragePath(rawFilePath);
            } else {
                // Если глобальная функция недоступна, делаем жесткую очистку
                filePath = rawFilePath.replace(/[^a-zA-Z0-9.\-_/]/g, '_');
            }

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
    currentFloorId: null,
    isCopyMode: false,
    copyTemplateDefect: null,
    _zoomListener: null,
    
    // НОВОЕ ДЛЯ ЗОН ПРИЕМКИ
    isZoneMode: false,
    zoneClicks: [], // Добавили переменную для слушателя зума

    async open(pdfUrl, title, floorId = null, highlightDefectId = null) {
        this.currentFloorId = floorId;
        window.ConstManager.currentFlrId = floorId; // Дублируем в менеджер для надежности

        const modal = document.getElementById('universal-pdf-modal');
        const titleEl = document.getElementById('universal-pdf-title');
        const loader = document.getElementById('universal-pdf-loader');
        const wrapper = document.getElementById('universal-pdf-wrapper');
        const container = document.getElementById('universal-pdf-container');
        const canvas = document.getElementById('universal-pdf-canvas');
        const toolbar = document.getElementById('universal-pdf-toolbar');

        if (!modal || !canvas) return;

        titleEl.innerText = title || 'Просмотр документа';

        // Если передан floorId, значит мы открыли план этажа -> показываем тулбар
        if (floorId) {
            toolbar.classList.remove('hidden');
            
            // Динамически добавляем кнопку "Выделить зону", если её еще нет
            if (!document.getElementById('pdf-btn-add-zone')) {
                const btnContainer = toolbar.querySelector('button').parentElement;
                btnContainer.insertAdjacentHTML('afterbegin', `
                    <button id="pdf-btn-add-zone" onclick="window.UniversalPdfViewer.toggleZoneMode()" class="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5 mr-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Выделить зону
                    </button>
                `);
            }
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

            // Вычисляем размеры для масштаба
            const cw = wrapper.clientWidth || window.innerWidth;
            const ch = wrapper.clientHeight || window.innerHeight;
            
            const scaleX = cw / viewport.width;
            const scaleY = ch / viewport.height;
            const initialScale = Math.min(scaleX, scaleY) * 0.95;

            // БРОНЕБОЙНОЕ ЦЕНТРИРОВАНИЕ ЧЕРЕЗ CSS
            // 1. Отвязываем контейнер от левого верхнего угла
            container.classList.remove('top-0', 'left-0');
            
            // 2. Ставим центр чертежа ровно в центр экрана
            container.style.left = '50%';
            container.style.top = '50%';
            container.style.marginLeft = `-${viewport.width / 2}px`;
            container.style.marginTop = `-${viewport.height / 2}px`;
            
            // 3. Возвращаем стандартный центр для правильного зума к курсору
            container.style.transformOrigin = '50% 50%';

            // Инициализация Panzoom. Теперь координаты startX и startY = 0, 
            // так как CSS уже идеально отцентрировал холст!
            this.panzoomInstance = Panzoom(container, {
                maxScale: 15,
                minScale: 0.05,
                step: 0.3,
                startScale: initialScale,
                startX: 0,
                startY: 0
            });

            // Показываем контейнер
            container.style.visibility = 'visible';

            // Рендерим точки дефектов
            if (this.currentFloorId) {
                window.ConstDefectForm.renderAllPins(this.currentFloorId, {
                    status: window.ConstManager.currentFilterStatus,
                    category: window.ConstManager.currentFilterCategory
                }, initialScale, highlightDefectId);
            }

            // --- ОБРАБОТЧИК ЗУМА ДЛЯ КЛАСТЕРОВ ---
            if (this._zoomListener) {
                container.removeEventListener('panzoomzoom', this._zoomListener);
            }
            
            let zoomTimeout;
            this._zoomListener = (e) => {
                clearTimeout(zoomTimeout);
                // Дебаунс 30мс, чтобы план не лагал при активном скролле мышки
                zoomTimeout = setTimeout(() => {
                    const currentScale = e.detail.scale;
                    if (this.currentFloorId) {
                        window.ConstDefectForm.renderAllPins(this.currentFloorId, {
                            status: window.ConstManager.currentFilterStatus,
                            category: window.ConstManager.currentFilterCategory
                        }, currentScale, highlightDefectId);
                    }
                }, 30);
            };
            container.addEventListener('panzoomzoom', this._zoomListener);

            wrapper.parentElement.addEventListener('wheel', this.panzoomInstance.zoomWithWheel);
            container.onclick = (e) => this.handleCanvasClick(e);

        } catch (e) {
            console.error('[UniversalPdfViewer] Ошибка:', e);
            if (typeof showToast === 'function') showToast('❌ Ошибка: ' + e.message);
        } finally {
            loader.classList.add('hidden');
        }
    },

    toggleAddMode() {
        this.setAddMode(!this.isAddMode);
    },

    setAddMode(isActive) {
        this.isAddMode = isActive;
        this.isCopyMode = false;
        
        const btn = document.getElementById('pdf-btn-add-defect');
        const hintAdd = document.getElementById('pdf-add-hint');
        const hintNorm = document.getElementById('pdf-normal-hint');
        const container = document.getElementById('universal-pdf-container');

        if (isActive) {
            btn.className = 'bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5';
            btn.innerHTML = 'Отмена';
            btn.onclick = () => this.toggleAddMode();
            hintNorm.classList.add('hidden');
            hintAdd.classList.remove('hidden');
            hintAdd.innerText = 'Кликните на чертеж ➔';
            hintAdd.className = 'text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse';
            if (container) container.style.cursor = 'crosshair';
        } else {
            btn.className = 'bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5';
            btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Добавить дефект';
            btn.onclick = () => this.toggleAddMode();
            hintNorm.classList.remove('hidden');
            hintAdd.classList.add('hidden');
            if (container) container.style.cursor = 'grab';
        }
    },

    setCopyMode(isActive, templateDefect = null) {
        this.isCopyMode = isActive;
        this.copyTemplateDefect = templateDefect;
        this.isAddMode = false;
        
        const btn = document.getElementById('pdf-btn-add-defect');
        const hintAdd = document.getElementById('pdf-add-hint');
        const hintNorm = document.getElementById('pdf-normal-hint');
        const container = document.getElementById('universal-pdf-container');

        if (isActive) {
            btn.className = 'bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5';
            btn.innerHTML = 'Завершить штамп';
            btn.onclick = () => this.setCopyMode(false);
            hintNorm.classList.add('hidden');
            hintAdd.classList.remove('hidden');
            hintAdd.innerText = 'Кликайте для вставки копий ➔';
            hintAdd.className = 'text-[10px] font-bold text-blue-500 uppercase tracking-widest animate-pulse';
            if (container) container.style.cursor = 'crosshair';
        } else {
            this.setAddMode(false);
        }
    },
    toggleZoneMode() {
        this.setZoneMode(!this.isZoneMode);
    },

    setZoneMode(isActive) {
        this.isZoneMode = isActive;
        this.isAddMode = false;
        this.isCopyMode = false;
        this.zoneClicks = []; // Сбрасываем клики
        
        const btnAdd = document.getElementById('pdf-btn-add-defect');
        const btnZone = document.getElementById('pdf-btn-add-zone');
        const container = document.getElementById('universal-pdf-container');

        // Глобальный баннер-подсказка
        let helperBanner = document.getElementById('pdf-zone-helper');
        if (!helperBanner) {
            helperBanner = document.createElement('div');
            helperBanner.id = 'pdf-zone-helper';
            helperBanner.className = 'absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 text-[12px] font-black uppercase tracking-widest text-center transition-all duration-300 pointer-events-none opacity-0 translate-y-[-20px]';
            document.getElementById('universal-pdf-modal').appendChild(helperBanner);
        }

        const tempZone = document.getElementById('temp-zone-marker');
        if (tempZone) tempZone.remove();

        if (isActive) {
            if (btnZone) {
                btnZone.className = 'bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5 mr-2';
                btnZone.innerHTML = 'Отмена';
            }
            if (btnAdd) btnAdd.classList.add('hidden'); 
            
            // Показываем красивый баннер
            helperBanner.innerHTML = '👆 Клик 1: Левый верхний угол зоны';
            helperBanner.classList.remove('opacity-0', 'translate-y-[-20px]');
            
            if (container) container.style.cursor = 'crosshair';
        } else {
            if (btnZone) {
                btnZone.className = 'bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5 mr-2';
                btnZone.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Выделить зону';
            }
            if (btnAdd) btnAdd.classList.remove('hidden');
            
            // Прячем баннер
            helperBanner.classList.add('opacity-0', 'translate-y-[-20px]');
            
            if (container) container.style.cursor = 'grab';
        }
    },
    handleCanvasClick(e) {
        if (!this.isAddMode && !this.isCopyMode && !this.isZoneMode) return; 

        const container = document.getElementById('universal-pdf-container');
        const xPercent = (e.offsetX / container.offsetWidth) * 100;
        const yPercent = (e.offsetY / container.offsetHeight) * 100;

        // РЕЖИМ 1: РИСОВАНИЕ ЗОНЫ ПРИЕМКИ (2 Клика)
        if (this.isZoneMode) {
            this.zoneClicks.push({ x: xPercent, y: yPercent });
            const helperBanner = document.getElementById('pdf-zone-helper');
            
            if (this.zoneClicks.length === 1) {
                if (helperBanner) helperBanner.innerHTML = '👇 Клик 2: Правый нижний угол зоны';
                const pinsContainer = document.getElementById('universal-pdf-pins');
                pinsContainer.insertAdjacentHTML('beforeend', `<div id="temp-zone-marker" class="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] transform -translate-x-1/2 -translate-y-1/2 animate-pulse" style="left: ${xPercent}%; top: ${yPercent}%;"></div>`);
            } 
            else if (this.zoneClicks.length === 2) {
                if (helperBanner) helperBanner.innerHTML = '✅ Зона зафиксирована!';
                
                const p1 = this.zoneClicks[0];
                const p2 = this.zoneClicks[1];
                const x = Math.min(p1.x, p2.x);
                const y = Math.min(p1.y, p2.y);
                const w = Math.abs(p1.x - p2.x);
                const h = Math.abs(p1.y - p2.y);
                
                const pinsContainer = document.getElementById('universal-pdf-pins');
                document.getElementById('temp-zone-marker')?.remove();
                pinsContainer.insertAdjacentHTML('beforeend', `<div id="temp-zone-rect" class="absolute bg-blue-500/30 border-2 border-blue-500 shadow-inner" style="left: ${x}%; top: ${y}%; width: ${w}%; height: ${h}%;"></div>`);
                
                setTimeout(() => {
                    this.setZoneMode(false);
                    this.close(); 
                    // ВОТ ТУТ МЫ ПЕРЕДАЕМ ВЕРНУВШИЕСЯ ДАННЫЕ ВМЕСТЕ С ПАМЯТЬЮ ФОРМЫ (если она была)
                    window.ConstAcceptance.openNewRequestModal(this.currentFloorId, {x, y, w, h}, window.tempAcceptanceContext);
                }, 800); // Даем 800мс полюбоваться результатом
            }
            return;
        }

        // РЕЖИМ 2: ШТАМП КОПИЙ
        if (this.isCopyMode && this.copyTemplateDefect) {
            this.massCopyDefect(xPercent, yPercent);
            return; 
        }

        // РЕЖИМ 3: ОБЫЧНАЯ ТОЧКА ДЕФЕКТА
        this.setAddMode(false);
        this.drawTempPin(xPercent, yPercent);
        window.ConstDefectForm.openNew(xPercent, yPercent);
    },

    async massCopyDefect(x, y) {
        const orig = this.copyTemplateDefect;
        const newId = 'def_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
        
        const newDefect = JSON.parse(JSON.stringify(orig));
        newDefect.id = newId;
        newDefect.x = x;
        newDefect.y = y;
        newDefect.status = 'issued';
        newDefect.history = [];
        newDefect.created_at = new Date().toISOString();
        newDefect.updated_at = new Date().toISOString();
        
        if (orig.photo && window.photos) {
            window.photos[newId] = orig.photo; 
        }

        window.ConstManager.defects.push(newDefect);
        if (typeof dbPut === 'function') await dbPut(STORES.CONST_DEFECTS, newDefect);
        
        window.ConstDefectForm.renderAllPins(window.ConstManager.currentFlrId, {
            status: window.ConstManager.currentFilterStatus,
            category: window.ConstManager.currentFilterCategory
        }, this.panzoomInstance ? this.panzoomInstance.getScale() : 1);
        
        if (navigator.vibrate) navigator.vibrate(30);
    },

    drawTempPin(xPercent, yPercent) {
        const pinsContainer = document.getElementById('universal-pdf-pins');
        if (!pinsContainer) return;
        const oldTemp = document.getElementById('temp-pin');
        if (oldTemp) oldTemp.remove();
        pinsContainer.insertAdjacentHTML('beforeend', `
            <div id="temp-pin" class="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black z-30 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" style="left: ${xPercent}%; top: ${yPercent}%;">
                +
            </div>
        `);
    },

    close() {
        this.setCopyMode(false);
        const modal = document.getElementById('universal-pdf-modal');
        const wrapper = document.getElementById('universal-pdf-wrapper');
        const pins = document.getElementById('universal-pdf-pins');

        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            if (pins) pins.innerHTML = ''; 

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

    // --- Выбран чек-лист → подготавливаем базу для поиска ---
    onTemplateChange(tmplKey) {
        document.getElementById('const-defect-item').value = '';
        document.getElementById('const-defect-item-search').value = '';
        document.getElementById('const-defect-item-name').value = '';
        document.getElementById('const-defect-norm-block').classList.add('hidden');
        document.getElementById('dd-const-defect-item').classList.add('hidden');
    },

    // --- Умный поиск нарушений ---
    handleItemSearch(query) {
        const tmplKey = document.getElementById('const-defect-template').value;
        const dropdown = document.getElementById('dd-const-defect-item');

        if (!tmplKey) {
            dropdown.innerHTML = '<div class="p-3 text-[10px] text-slate-500 font-bold text-center">Сначала выберите вид работ выше</div>';
            dropdown.classList.remove('hidden');
            return;
        }

        const type = tmplKey.split('_')[0];
        const key = tmplKey.replace(type + '_', '');
        let groups = [];
        if (type === 'sys' && SYSTEM_TEMPLATES[key]) groups = SYSTEM_TEMPLATES[key].groups;
        else if (type === 'user' && userTemplates[key]) groups = userTemplates[key].groups;

        const flatItems = this.getFlatItemsFromGroups(groups);

        // Фильтруем по тексту
        const q = query.toLowerCase().trim();
        const matched = flatItems.filter(i => i.n.toLowerCase().includes(q) || (i.t && i.t.toLowerCase().includes(q)));

        if (matched.length === 0) {
            dropdown.innerHTML = '<div class="p-3 text-[10px] text-slate-500 font-bold text-center">Ничего не найдено</div>';
            dropdown.classList.remove('hidden');
            return;
        }

        // Рендерим результаты
        dropdown.innerHTML = matched.map(i => {
            const safeNorm = (i.t || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            const safeName = i.n.replace(/"/g, '&quot;').replace(/'/g, "\\'");
            return `
                <div class="p-2 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                     onmousedown="window.ConstDefectForm.selectItem('${i.id}', '${safeName}', ${i.w}, '${safeNorm}')">
                    <div class="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
                        <span class="text-[9px] font-black text-white bg-slate-400 px-1 rounded mr-1">B${i.w}</span>${i.n}
                    </div>
                </div>
            `;
        }).join('');

        dropdown.classList.remove('hidden');
    },

    // --- Обработка клика по найденному пункту ---
    selectItem(id, name, weight, norm) {
        document.getElementById('const-defect-item-search').value = name;
        document.getElementById('const-defect-item-name').value = name;
        document.getElementById('const-defect-item').value = id;
        document.getElementById('dd-const-defect-item').classList.add('hidden');

        // Показываем норматив (очищенный от HTML для текстового поля)
        let cleanNorm = norm ? norm.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ") : "";
        const normBlock = document.getElementById('const-defect-norm-block');

        if (norm && norm.trim()) {
            document.getElementById('const-defect-norm-text').innerHTML = norm;
            normBlock.classList.remove('hidden');
        } else {
            normBlock.classList.add('hidden');
        }

        // Авто-формирование текста замечания (Нарушение + Норматив)
        let autoText = `Нарушение: ${name}.`;
        if (cleanNorm && cleanNorm !== 'Без норматива') {
            autoText += ` Требования: ${cleanNorm}`;
        }
        document.getElementById('const-defect-desc').value = autoText;

        // Автокатегория (Блокируем от ручного изменения)
        const catSelect = document.getElementById('const-defect-category');
        if (weight === 1) catSelect.value = 'B1';
        else if (weight === 2) catSelect.value = 'B2';
        else if (weight === 3) catSelect.value = 'B3';

        catSelect.setAttribute('disabled', 'true');
        catSelect.classList.add('opacity-60', 'cursor-not-allowed');
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
        // Ставим срок по умолчанию: +14 дней от сегодня
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        document.getElementById('const-defect-deadline').value = futureDate.toISOString().split('T')[0];
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
    async openExisting(id) {
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
            document.getElementById('const-defect-item-search').value = defect.itemName || '';

            // Восстанавливаем блок норматива
            const normBlock = document.getElementById('const-defect-norm-block');
            if (defect.normText && defect.normText.trim()) {
                document.getElementById('const-defect-norm-text').innerHTML = defect.normText;
                normBlock.classList.remove('hidden');
            } else {
                normBlock.classList.add('hidden');
            }
        }, 50);
        document.getElementById('const-defect-item-name').value = defect.itemName || '';
        document.getElementById('const-defect-category').value = defect.category || 'B2';
        document.getElementById('const-defect-deadline').value = defect.deadline || '';
        document.getElementById('const-defect-contractor').value = defect.contractor || '';
        document.getElementById('const-defect-desc').value = defect.description || '';

        // Загружаем фото: сначала из памяти осмотра, иначе из сохранённого дефекта
        const defectPhoto = (window.photos && window.photos[defect.id]) || defect.photo || null;
        if (defectPhoto) {
            if (window.photos) window.photos[defect.id] = defectPhoto;
            if (typeof updateConstDefectPhotoPreview === 'function') {
                await updateConstDefectPhotoPreview(defect.id);
            }
        } else {
            this.removePhoto(); // если фото нет – очищаем превью
        }
        document.getElementById('const-defect-modal-title').innerText = 'Редактирование замечания';
        // --- НОВАЯ ЛОГИКА СТАТУСОВ И КНОПОК ПО РОЛЯМ ---
        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isEngineer = ['engineer', 'manager', 'deputy_manager'].includes(role);
        const isContractor = role === 'contractor';

        // Гарантируем, что статус есть
        if (!defect.status) defect.status = 'issued';

        let actionBtns = '';

        if (defect.status === 'issued') {
            if (isContractor) {
                actionBtns = `
                    <button onclick="window.ConstDefectForm.changeStatus('${defect.id}', 'in_progress')" class="flex-1 bg-blue-50 text-blue-600 border border-blue-200 py-3 rounded-xl text-[11px] font-bold uppercase active:scale-95">В работу</button>
                    <button onclick="window.ConstDefectForm.changeStatus('${defect.id}', 'fixed')" class="flex-[1.5] bg-green-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">Устранено (Фото)</button>
                `;
            } else if (isEngineer) {
                actionBtns = `
                    <button onclick="window.ConstDefectForm.delete('${defect.id}')" class="bg-red-50 text-red-600 py-3 px-3 rounded-xl text-[11px] font-bold uppercase active:scale-95 border border-red-200" title="Удалить">🗑️</button>
                    <button onclick="window.ConstDefectForm.duplicate('${defect.id}')" class="bg-blue-50 text-blue-600 py-3 px-3 rounded-xl text-[11px] font-bold uppercase active:scale-95 border border-blue-200" title="Копировать">📋</button>
                    <button onclick="window.ConstDefectForm.save()" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">💾 Обновить</button>
                `;
            }
        } else if (defect.status === 'in_progress') {
            if (isContractor) {
                actionBtns = `<button onclick="window.ConstDefectForm.changeStatus('${defect.id}', 'fixed')" class="w-full bg-green-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">Устранено (Приложить фото)</button>`;
            } else {
                actionBtns = `<div class="text-center w-full text-[11px] font-bold text-blue-500 py-3">Подрядчик взял в работу</div>`;
            }
        } else if (defect.status === 'fixed') {
            if (isEngineer) {
                actionBtns = `
                    <button onclick="window.ConstDefectForm.changeStatus('${defect.id}', 'rejected')" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl text-[11px] font-bold uppercase active:scale-95">❌ Отклонить</button>
                    <button onclick="window.ConstDefectForm.changeStatus('${defect.id}', 'closed')" class="flex-1 bg-green-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">✅ Принять (Закрыть)</button>
                 `;
            } else {
                actionBtns = `<div class="text-center w-full text-[11px] font-bold text-green-500 py-3">Ожидает проверки Инженером СК</div>`;
            }
        } else if (defect.status === 'closed') {
            actionBtns = `<div class="text-center w-full text-[11px] font-black text-green-600 py-3">Дефект закрыт</div>`;
        } else if (defect.status === 'rejected') {
            if (isContractor) {
                actionBtns = `<button onclick="window.ConstDefectForm.changeStatus('${defect.id}', 'fixed')" class="w-full bg-orange-500 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">Повторно предъявить (Фото)</button>`;
            } else if (isEngineer) {
                actionBtns = `
                    <button onclick="window.ConstDefectForm.save()" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">💾 Обновить</button>
                 `;
            }
        }

        // Рендер истории статусов
        let historyHtml = '';
        if (defect.history && defect.history.length > 0) {
            historyHtml = `<div class="w-full mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar">`;
            [...defect.history].reverse().forEach(h => {
                const statusNames = { 'issued': 'Выдано', 'in_progress': 'В работе', 'fixed': 'Устранено', 'closed': 'Закрыто', 'rejected': 'Отклонено' };
                const stName = statusNames[h.status] || h.status;
                const dDate = new Date(h.date).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

                let histPhoto = '';
                if (h.photo) {
                    histPhoto = `<img src="${window.getPhotoSrc(h.photo)}" class="w-10 h-10 object-cover rounded border cursor-pointer mt-1" onclick="openPhotoViewer('${h.photo}')">`;
                }

                historyHtml += `
                    <div class="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
                        <div class="flex justify-between font-bold mb-1"><span class="text-indigo-600">${stName}</span><span class="text-slate-400">${dDate}</span></div>
                        <div class="text-slate-600 dark:text-slate-300">${h.user} ${h.comment ? `— <i>${h.comment}</i>` : ''}</div>
                        ${histPhoto}
                    </div>
                `;
            });
            historyHtml += `</div>`;
        }

        document.getElementById('const-defect-actions').innerHTML = actionBtns;

        // Вставляем историю прямо над кнопками
        const actionsContainer = document.getElementById('const-defect-actions');
        const existingHistory = document.getElementById('const-defect-history');
        if (existingHistory) existingHistory.remove();

        if (historyHtml) {
            const histDiv = document.createElement('div');
            histDiv.id = 'const-defect-history';
            histDiv.className = 'w-full px-4 pb-2 bg-[var(--card-bg)]';
            histDiv.innerHTML = historyHtml;
            actionsContainer.parentNode.insertBefore(histDiv, actionsContainer);
        }

        document.getElementById('const-defect-modal').style.display = 'flex';
    },

    // --- Закрыть форму ---
    close() {
        document.getElementById('const-defect-modal').style.display = 'none';
        const tempPin = document.getElementById('temp-pin');
        if (tempPin) tempPin.remove();
    },

    async changeStatus(id, newStatus) {
        const defect = window.ConstManager.defects.find(d => d.id === id);
        if (!defect) return;

        const userName = window.syncConfig?.engineerName || 'Пользователь';
        let comment = '';

        // Инженер отклоняет
        if (newStatus === 'rejected') {
            comment = prompt('Укажите причину отклонения:');
            if (!comment) return showToast('⚠️ Для отклонения нужен комментарий!');
        }

        // Подрядчик устраняет (Требуется фото!)
        if (newStatus === 'fixed') {
            comment = prompt('Краткий комментарий об устранении:');
            if (comment === null) return;

            // Настраиваем фоторедактор специально для "устранения"
            window.activePhotoContext = 'defect_fix';
            window.currentDefectFixId = id;
            window.currentDefectFixComment = comment;

            // Вызываем окно добавления фото
            document.getElementById('photo-source-modal').style.display = 'flex';
            return; // Прерываем функцию, она продолжится автоматически после рисования на фото
        }

        this.applyStatusChange(defect, newStatus, userName, comment, null);
    },

    async applyStatusChange(defect, newStatus, userName, comment, photoUrl) {
        defect.status = newStatus;
        if (!defect.history) defect.history = [];

        // Добавляем запись в историю
        defect.history.push({
            status: newStatus,
            date: new Date().toISOString(),
            user: userName,
            comment: comment,
            photo: photoUrl
        });

        defect.updated_at = new Date().toISOString();

        if (typeof dbPut === 'function') await dbPut(STORES.CONST_DEFECTS, defect);

        localStorage.setItem('rbi_cloud_dirty', '1');
        if (typeof triggerSync === 'function') triggerSync('silent');

        showToast('✅ Статус обновлен!');
        this.openExisting(defect.id); // Перерисовываем модалку, чтобы показать новые кнопки

        // Обновляем булавки на плане (чтобы сменить цвет)
        if (window.ConstManager.currentView === 'plan') {
            window.ConstDefectForm.renderAllPins(window.ConstManager.currentFlrId, {
                status: window.ConstManager.currentFilterStatus,
                category: window.ConstManager.currentFilterCategory
            });
        } else {
            window.ConstManager.renderDefectsList();
        }
    },

    openDefectPhoto(defectId) {
        const defect = window.ConstManager.defects.find(d => d.id === defectId);
        const src = (window.photos && window.photos[defectId]) || defect?.photo;
        if (src && typeof openPhotoViewer === 'function') {
            openPhotoViewer(src);
        }
    },

    // --- Сохранить дефект (новый или обновление) ---
    async save() {
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

        // Убираем старую подсветку
        ['const-defect-template', 'const-defect-item-search', 'const-defect-contractor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('border-red-500', 'bg-red-50');
        });

        // Проверяем и подсвечиваем пустые обязательные поля
        let hasError = false;
        if (!templateKey) {
            document.getElementById('const-defect-template').classList.add('border-red-500', 'bg-red-50');
            hasError = true;
        }
        if (!itemId) {
            document.getElementById('const-defect-item-search').classList.add('border-red-500', 'bg-red-50');
            hasError = true;
        }
        if (!contractor) {
            document.getElementById('const-defect-contractor').classList.add('border-red-500', 'bg-red-50');
            hasError = true;
        }

        if (hasError) {
            return showToast('⚠️ Заполните все поля, выделенные красным!');
        }

        // Получаем фото из глобального хранилища
        let photo = (window.photos && window.photos[id]) ? window.photos[id] : null;

        // Если фото нет, но есть временный ключ (перенос из temp, если использовался)
        if (!photo && window.tempDefectPhotoKey && window.photos && window.photos[window.tempDefectPhotoKey]) {
            photo = window.photos[window.tempDefectPhotoKey];
            window.photos[id] = photo;
            delete window.photos[window.tempDefectPhotoKey];
            window.tempDefectPhotoKey = null;
        }

        if (photo && String(photo).startsWith('data:') && typeof window.ensureLocalPhotoRef === 'function') {
            photo = await window.ensureLocalPhotoRef(photo, 'const', {
                entityType: 'construction_defect',
                entityId: id
            });
            window.photos[id] = photo;
        }

        const now = new Date().toISOString();
        const existingIndex = window.ConstManager.defects.findIndex(d => d.id === id);
        const prevDefect = existingIndex !== -1 ? window.ConstManager.defects[existingIndex] : null;

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
            status: prevDefect?.status || 'issued',
            created_at: prevDefect?.created_at || now,
            updated_at: now,
            created_by: prevDefect?.created_by || window.syncConfig?.engineerName || 'Инженер'
        };

        if (existingIndex !== -1) {
            window.ConstManager.defects[existingIndex] = { ...window.ConstManager.defects[existingIndex], ...defectData };
        } else {
            window.ConstManager.defects.push(defectData);
        }

        if (photo && window.photos) {
            window.photos[id] = photo;
        }

        if (typeof dbPut === 'function' && STORES.CONST_DEFECTS) {
            try {
                await dbPut(STORES.CONST_DEFECTS, defectData);
            } catch (e) {
                console.warn('Ошибка сохранения дефекта', e);
                showToast('⚠️ Замечание не сохранено в память устройства');
                return;
            }
        }

        this.close();
        showToast('✅ Замечание сохранено на плане!');
        
        // Безопасно получаем текущий масштаб, если открыт интерактивный план
        let currentScale = 1;
        if (window.UniversalPdfViewer && window.UniversalPdfViewer.panzoomInstance) {
            currentScale = window.UniversalPdfViewer.panzoomInstance.getScale();
        }

        // Перерисовываем точки с правильным масштабом
        this.renderAllPins(floorId, {
            status: window.ConstManager.currentFilterStatus,
            category: window.ConstManager.currentFilterCategory
        }, currentScale);
        
        // Если был открыт реестр (хотя мы ставим точки на плане, но вдруг)
        if (window.ConstManager.currentView === 'list') {
            window.ConstManager.renderDefectsList();
        }
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
    // --- Копировать (дублировать) дефект ---
    // --- Массовое копирование (Штамп) ---
    duplicate(id) {
        const orig = window.ConstManager.defects.find(d => d.id === id);
        if (!orig) return;

        this.close(); // Закрываем модалку дефекта
        showToast('📋 Режим штампа. Кликайте по чертежу, чтобы расставить копии.');

        // Передаем данные оригинала в просмотрщик PDF и включаем режим копирования
        window.UniversalPdfViewer.setCopyMode(true, orig);
    },

    // --- Отрисовать все булавки на текущем плане ---
    // --- Отрисовать все булавки на текущем плане с учётом фильтров ---
    renderAllPins(floorId, filters = {}, currentScale = 1, highlightDefectId = null) {
        if (!floorId) return;
        
        // 1. Сначала скрываем ВСЕ нарисованные зоны приемок (если они были)
        document.querySelectorAll('.zone-marker-layer').forEach(el => el.remove());

        // 2. Получаем текущий слой из Менеджера
        const layer = window.ConstManager.currentLayer || 'ALL';

        let defects = [];

        // 3. Логика слоев для ДЕФЕКТОВ
        if (layer === 'ZONES') {
            // Если выбран слой зон приемки, дефекты СМР мы вообще не показываем!
            defects = []; 
        } else {
            // Берем дефекты этажа
            defects = window.ConstManager.defects.filter(d => d.floorId === floorId);

            // Фильтр по слою ОТ и ПБ (Ищем ключевые слова в названии чеклиста)
            if (layer === 'OT') {
                defects = defects.filter(d => {
                    const tName = d.templateKey ? (SYSTEM_TEMPLATES[d.templateKey.replace('sys_', '')]?.title || userTemplates[d.templateKey.replace('user_', '')]?.title || '') : '';
                    return tName.toLowerCase().includes('охран') || tName.toLowerCase().includes('безопас') || tName.toLowerCase().includes('тб');
                });
            } else if (layer === 'SMR') {
                // Если СМР, убираем Охрану труда
                defects = defects.filter(d => {
                    const tName = d.templateKey ? (SYSTEM_TEMPLATES[d.templateKey.replace('sys_', '')]?.title || userTemplates[d.templateKey.replace('user_', '')]?.title || '') : '';
                    return !(tName.toLowerCase().includes('охран') || tName.toLowerCase().includes('безопас') || tName.toLowerCase().includes('тб'));
                });
            }

            // Умные фильтры по массиву статусов (из чипсов)
            if (filters.statuses && filters.statuses.length > 0) {
                defects = defects.filter(d => filters.statuses.includes(d.status));
            }
            if (filters.category && filters.category !== 'ALL') {
                defects = defects.filter(d => d.category === filters.category);
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // --- АЛГОРИТМ КЛАСТЕРИЗАЦИИ (ГРУППИРОВКИ) ---

        // --- АЛГОРИТМ КЛАСТЕРИЗАЦИИ (ГРУППИРОВКИ) ---
        // Чем больше зум (currentScale), тем меньше радиус захвата
        const threshold = 4 / currentScale;

        let clusters = [];
        let unclustered = [...defects];
        let originalIndexes = new Map();
        defects.forEach((d, i) => originalIndexes.set(d.id, i + 1));

        while (unclustered.length > 0) {
            let base = unclustered.shift();
            let currentCluster = [base];
            let i = 0;
            
            while (i < unclustered.length) {
                let p = unclustered[i];
                let dist = Math.sqrt(Math.pow(base.x - p.x, 2) + Math.pow(base.y - p.y, 2));
                
                if (dist < threshold) {
                    currentCluster.push(p);
                    unclustered.splice(i, 1);
                } else {
                    i++;
                }
            }
            clusters.push(currentCluster);
        }

        const pinsHtml = clusters.map(cluster => {
            if (cluster.length === 1) {
                const d = cluster[0];
                const indexNum = originalIndexes.get(d.id);

                let bgColor = 'bg-blue-500';  
                if (d.category === 'B2') bgColor = 'bg-orange-500';
                if (d.category === 'B3') bgColor = 'bg-red-600';
                if (d.status === 'closed') bgColor = 'bg-green-500';

                let overdueClass = '';
                if (d.deadline && d.status !== 'closed' && d.status !== 'fixed') {
                    const dl = new Date(d.deadline);
                    dl.setHours(0, 0, 0, 0);
                    if (dl < today) overdueClass = 'ring-4 ring-red-500/80 animate-pulse';
                }
                // Если мы искали именно эту точку с Реестра - делаем её ОГРОМНОЙ и пульсирующей
                if (highlightDefectId === d.id) {
                    return `
                    <div class="absolute z-50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto" style="left: ${d.x}%; top: ${d.y}%;">
                        <!-- Эффект радара (синие расходящиеся круги) -->
                        <div class="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-75"></div>
                        <!-- Сама увеличенная кнопка с жирной синей рамкой -->
                        <div onclick="window.ConstDefectForm.openExisting('${d.id}')" 
                             class="relative w-10 h-10 rounded-full border-4 border-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.8)] flex items-center justify-center text-white text-[16px] font-black cursor-pointer bg-indigo-500" 
                             title="${d.itemName} (${d.category})">
                            ${indexNum}
                        </div>
                    </div>`;
                }

                return `
                <div onclick="window.ConstDefectForm.openExisting('${d.id}')" 
                     class="absolute w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-black cursor-pointer hover:scale-125 transition-transform z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto ${bgColor} ${overdueClass}" 
                     style="left: ${d.x}%; top: ${d.y}%;" 
                     title="${d.itemName} (${d.category})">
                    ${indexNum}
                </div>`;

                
            } else {
                const total = cluster.length;
                const avgX = cluster.reduce((sum, p) => sum + p.x, 0) / total;
                const avgY = cluster.reduce((sum, p) => sum + p.y, 0) / total;

                let red = 0, orange = 0, blue = 0, green = 0;
                cluster.forEach(d => {
                    if (d.status === 'closed') green++;
                    else if (d.category === 'B3') red++;
                    else if (d.category === 'B2') orange++;
                    else blue++;
                });

                const cRed = (red / total) * 360;
                const cOrange = cRed + (orange / total) * 360;
                const cBlue = cOrange + (blue / total) * 360;
                const cGreen = cBlue + (green / total) * 360;

                const grad = `conic-gradient(from 0deg, #ef4444 0deg ${cRed}deg, #f97316 ${cRed}deg ${cOrange}deg, #3b82f6 ${cOrange}deg ${cBlue}deg, #22c55e ${cBlue}deg 360deg)`;

                return `
                <div class="absolute w-8 h-8 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.3)] flex items-center justify-center cursor-pointer z-30 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform hover:scale-110"
                     style="left: ${avgX}%; top: ${avgY}%; background: ${grad}; padding: 3px;"
                     onclick="showToast('Приблизьте чертеж, чтобы увидеть ${total} дефектов')" title="Скрыто дефектов: ${total}">
                    <div class="w-full h-full bg-white text-slate-800 rounded-full flex items-center justify-center text-[12px] font-black border border-slate-200">
                        ${total}
                    </div>
                </div>`;
            }
        }).join('');

        const universalPinsContainer = document.getElementById('universal-pdf-pins');
        if (universalPinsContainer) universalPinsContainer.innerHTML = pinsHtml;

        const previewRenderArea = document.getElementById('const-pdf-render-area');
        if (previewRenderArea && !previewRenderArea.classList.contains('hidden')) {
            let previewPinsContainer = document.getElementById('preview-pdf-pins');
            if (previewPinsContainer) previewPinsContainer.innerHTML = pinsHtml;
        }
        // --- 4. ОТРИСОВКА ЗОН ПРИЕМОК (ЕСЛИ СЛОЙ ALL ИЛИ ZONES) ---
        if (layer === 'ALL' || layer === 'ZONES') {
            const reqs = window.ConstAcceptance?.requests?.filter(r => r.floorId === floorId && r.zone) || [];
            
            const zonesHtml = reqs.map(req => {
                const z = req.zone;
                let zoneColor = 'bg-blue-500/20 border-blue-500';
                let labelColor = 'bg-blue-600';
                
                if (req.status === 'rejected') { zoneColor = 'bg-red-500/20 border-red-500'; labelColor = 'bg-red-600'; }
                if (req.status === 'accepted') { zoneColor = 'bg-green-500/20 border-green-500'; labelColor = 'bg-green-600'; }

                return `
                <div class="zone-marker-layer absolute border-2 ${zoneColor} shadow-inner z-10 flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors" 
                     style="left: ${z.x}%; top: ${z.y}%; width: ${z.w}%; height: ${z.h}%;"
                     onclick="window.ConstAcceptance.openRequestDetails('${req.id}')"
                     title="Заявка: ${req.contractor} (${req.workType})">
                     <span class="${labelColor} text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-80 uppercase tracking-widest text-center leading-tight shadow-md">${req.workType}</span>
                </div>`;
            }).join('');

            if (universalPinsContainer) universalPinsContainer.insertAdjacentHTML('afterbegin', zonesHtml);
            if (previewRenderArea && !previewRenderArea.classList.contains('hidden')) {
                const previewPinsContainer = document.getElementById('preview-pdf-pins');
                if (previewPinsContainer) previewPinsContainer.insertAdjacentHTML('afterbegin', zonesHtml);
            }
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
        if (typeof syncPhotoTargetId === 'function') {
            syncPhotoTargetId(defectId);
        } else {
            window.currentPhotoId = defectId;
        }
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
        if (typeof syncPhotoTargetId === 'function') {
            syncPhotoTargetId(null);
        } else {
            window.currentPhotoId = null;
        }
        window.activePhotoContext = null;
    },
};


// ============================================================================
// === МОДУЛЬ ПРИЕМКИ РАБОТ (ЖУРНАЛ ЗАЯВОК) ===
// ============================================================================
// ============================================================================
// === МОДУЛЬ ПРИЕМКИ РАБОТ (ЖУРНАЛ ЗАЯВОК) ===
// ============================================================================
window.ConstAcceptance = {
    requests: [],
    currentFilter: 'pending',

    // 1. Инициализация
    async init() {
        if (window.ConstManager.objects.length === 0) {
            await window.ConstManager.init();
        }
        try {
            if (typeof dbGetAll !== 'undefined') {
                const reqs = await dbGetAll(STORES.CONST_ACCEPTANCE);
                this.requests = (reqs || []).filter(x => !x._deleted);
            }
        } catch (e) {
            console.error('[ConstAcceptance] Ошибка загрузки заявок:', e);
        }
        this.renderList();
    },

    // 2. Управление фильтрами (оставляем для совместимости, но кнопки мы удалили)
    filter(status, btnEl) {
        this.currentFilter = status;
        this.renderList();
    },

    // 3. Отрисовка списка заявок (Канбан)
    renderList() {
        const container = document.getElementById('acceptance-list-container');
        const objFilterEl = document.getElementById('acc-global-obj-filter');
        if (!container) return;

        // Заполняем фильтр объектов один раз
        if (objFilterEl && objFilterEl.options.length === 1) {
            let opts = '<option value="ALL">Все объекты</option>';
            window.ConstManager.objects.sort((a,b)=>a.name.localeCompare(b.name)).forEach(o => {
                opts += `<option value="${o.id}">${o.name}</option>`;
            });
            objFilterEl.innerHTML = opts;
        }

        const selectedObj = objFilterEl ? objFilterEl.value : 'ALL';
        
        // Фильтруем общую базу по объекту
        let baseReqs = this.requests;
        if (selectedObj !== 'ALL') {
            baseReqs = baseReqs.filter(r => r.objectId === selectedObj);
        }

        if (baseReqs.length === 0) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] shadow-sm mt-4 mx-1">Заявок пока нет</div>`;
            return;
        }

        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isEngineer = ['engineer', 'manager', 'deputy_manager'].includes(role);

        const pending = baseReqs.filter(r => r.status === 'pending').sort((a, b) => new Date(a.requestedDate) - new Date(b.requestedDate));
        const rejected = baseReqs.filter(r => r.status === 'rejected').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const accepted = baseReqs.filter(r => r.status === 'accepted').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15); 

        const renderKanbanCard = (r) => {
            const objName = window.ConstManager.objects.find(o => o.id === r.objectId)?.name || 'Объект';
            const reqDate = r.requestedDate ? new Date(r.requestedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '-';
            const isOverdue = r.status === 'pending' && new Date(r.requestedDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);

            return `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 mb-3 shadow-sm cursor-pointer hover:border-indigo-400 transition-colors active:scale-[0.98]" onclick="window.ConstAcceptance.openRequestDetails('${r.id}')">
                <div class="flex justify-between items-start mb-2 border-b border-[var(--card-border)] pb-2">
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5 truncate">${objName}</div>
                        <div class="text-[12px] font-black text-slate-800 dark:text-white uppercase truncate leading-tight">${r.workType}</div>
                    </div>
                </div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-snug font-medium space-y-0.5 mb-2">
                    <div class="truncate"><span class="font-bold text-slate-400">Локация:</span> ${r.location}</div>
                    <div class="truncate"><span class="font-bold text-slate-400">Подрядчик:</span> ${r.contractor}</div>
                </div>
                <div class="flex justify-between items-center bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                    <div class="flex items-center gap-1.5 ${isOverdue ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span class="text-[10px] font-black">${reqDate} | ${r.requestedTime || '--:--'}</span>
                    </div>
                    ${isEngineer && r.status === 'pending' ? `<button onclick="event.stopPropagation(); window.ConstAcceptance.focusOnZone('${r.id}')" class="text-indigo-600 bg-white border border-indigo-200 px-2 py-1 rounded text-[9px] font-bold active:scale-90 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> План</button>` : ''}
                    ${r.status === 'rejected' ? `<button onclick="event.stopPropagation(); window.ConstAcceptance.focusOnZone('${r.id}')" class="text-red-600 bg-white border border-red-200 px-2 py-1 rounded text-[9px] font-bold active:scale-90 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Дефекты</button>` : ''}
                </div>
            </div>`;
        };

        container.innerHTML = `
            <div class="flex overflow-x-auto snap-x custom-scrollbar gap-4 px-1 pb-4 pt-2 w-full h-[70vh]">
                <div class="shrink-0 w-[85vw] sm:w-80 snap-start flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-[var(--card-border)] overflow-hidden">
                    <div class="p-3 border-b border-[var(--card-border)] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-black text-[11px] uppercase tracking-widest flex justify-between items-center shrink-0">
                        <span>⏳ Ждут проверки</span>
                        <span class="bg-white dark:bg-slate-800 text-blue-600 px-1.5 py-0.5 rounded shadow-sm border border-blue-200">${pending.length}</span>
                    </div>
                    <div class="p-3 overflow-y-auto flex-1 custom-scrollbar">
                        ${pending.length > 0 ? pending.map(renderKanbanCard).join('') : '<div class="text-center py-4 text-[10px] font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">Заявок нет</div>'}
                    </div>
                </div>

                <div class="shrink-0 w-[85vw] sm:w-80 snap-start flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-[var(--card-border)] overflow-hidden">
                    <div class="p-3 border-b border-[var(--card-border)] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-black text-[11px] uppercase tracking-widest flex justify-between items-center shrink-0">
                        <span>❌ Отклонено СК</span>
                        <span class="bg-white dark:bg-slate-800 text-red-600 px-1.5 py-0.5 rounded shadow-sm border border-red-200">${rejected.length}</span>
                    </div>
                    <div class="p-3 overflow-y-auto flex-1 custom-scrollbar">
                        ${rejected.length > 0 ? rejected.map(renderKanbanCard).join('') : '<div class="text-center py-4 text-[10px] font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">Брака нет</div>'}
                    </div>
                </div>

                <div class="shrink-0 w-[85vw] sm:w-80 snap-start flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-[var(--card-border)] overflow-hidden">
                    <div class="p-3 border-b border-[var(--card-border)] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-black text-[11px] uppercase tracking-widest flex justify-between items-center shrink-0">
                        <span>✅ Принято</span>
                        <span class="bg-white dark:bg-slate-800 text-green-600 px-1.5 py-0.5 rounded shadow-sm border border-green-200">${accepted.length}</span>
                    </div>
                    <div class="p-3 overflow-y-auto flex-1 custom-scrollbar">
                        ${accepted.length > 0 ? accepted.map(renderKanbanCard).join('') : '<div class="text-center py-4 text-[10px] font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl">История пуста</div>'}
                    </div>
                </div>
            </div>
        `;
    },

    // 4. Открытие модального окна (УМНОЕ - помнит контекст!)
    openNewRequestModal(floorId = null, zoneInfo = null, restoreContext = null) {
        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        if (role === 'guest') return showToast('⚠️ Гости не могут предъявлять работы');

        if (window.ConstManager.objects.length === 0) {
            return showToast('⚠️ Сначала создайте объект в разделе "Дефекты -> Управление иерархией"');
        }

        // --- ВОССТАНОВЛЕНИЕ КОНТЕКСТА ---
        let preObj = '', preBld = '', preFlr = '', preWork = '', preRoom = '', preVol = '', preDate = '', preTime = '';
        if (restoreContext) {
            preObj = restoreContext.obj; preBld = restoreContext.bld; preFlr = restoreContext.flr;
            preWork = restoreContext.work; preRoom = restoreContext.room; preVol = restoreContext.vol;
            preDate = restoreContext.date; preTime = restoreContext.time;
        } else if (floorId && typeof floorId === 'string') {
            // Если пришли с плана (Сценарий А)
            const floor = window.ConstManager.floors.find(f => f.id === floorId);
            preFlr = floor?.id || '';
            preBld = floor?.building_id || '';
            preObj = window.ConstManager.buildings.find(b => b.id === preBld)?.object_id || '';
        }

        // Запоминаем зону для сохранения
        window.tempAcceptanceZone = zoneInfo;

        const objOptions = window.ConstManager.objects.map(o => `<option value="${o.id}" ${o.id === preObj ? 'selected' : ''}>${o.name}</option>`).join('');

        let tmplOptions = '<option value="">-- Выберите вид работ --</option>';
        Object.keys(SYSTEM_TEMPLATES).sort().forEach(k => { tmplOptions += `<option value="sys_${k}" ${preWork === 'sys_'+k ? 'selected':''}>[СИС] ${SYSTEM_TEMPLATES[k].title}</option>`; });
        if (typeof userTemplates !== 'undefined') {
            Object.keys(userTemplates).sort().forEach(k => { tmplOptions += `<option value="user_${k}" ${preWork === 'user_'+k ? 'selected':''}>[МОЙ] ${userTemplates[k].title}</option>`; });
        }

        const html = `
        <div id="acc-request-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm" onclick="this.remove()">
            <div class="bg-[var(--card-bg)] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--card-border)] animate-fadeIn" onclick="event.stopPropagation()">
                <div class="p-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center">
                    <h3 class="font-black text-[13px] uppercase text-white flex items-center gap-2">📝 Заявка на приемку</h3>
                    <button onclick="document.getElementById('acc-request-modal').remove()" class="text-indigo-200 hover:text-white active:scale-90 font-black text-lg leading-none">✕</button>
                </div>
                <div class="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    
                    <div class="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label class="text-[10px] font-black text-indigo-500 uppercase mb-2 block flex justify-between items-center">
                            <span>1. Локация</span>
                            ${zoneInfo ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[8px] font-black shadow-sm border border-blue-200">✅ Зона выделена</span>` : `<button onclick="window.ConstAcceptance.goDrawZone()" class="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm">🗺️ Выделить на плане</button>`}
                        </label>
                        <select id="req-obj" class="input-base text-[12px] font-bold mb-2" onchange="window.ConstAcceptance.onObjChange(this.value)">
                            <option value="">-- Объект --</option>${objOptions}
                        </select>
                        <select id="req-bld" class="input-base text-[12px] font-bold mb-2" ${preObj ? '' : 'disabled'} onchange="window.ConstAcceptance.onBldChange(this.value)">
                            <option value="">-- Корпус / Секция --</option>
                        </select>
                        <select id="req-flr" class="input-base text-[12px] font-bold" ${preBld ? '' : 'disabled'}>
                            <option value="">-- План Этажа --</option>
                        </select>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-indigo-500 uppercase mb-1 block">2. Данные о работах *</label>
                        <select id="req-work" class="input-base text-[12px] font-bold mb-2 border-indigo-300">
                            ${tmplOptions}
                        </select>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Оси / Захватка</label>
                                <input type="text" id="req-room" class="input-base text-[12px]" placeholder="Напр: Оси А-Б" value="${preRoom}">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">Объем</label>
                                <input type="text" id="req-vol" class="input-base text-[12px]" placeholder="Напр: 45 м2" value="${preVol}">
                            </div>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label class="text-[10px] font-black text-indigo-500 uppercase mb-2 block">3. Когда готовы сдать?</label>
                        <div class="grid grid-cols-2 gap-2">
                            <input type="date" id="req-date" class="input-base text-[12px] font-bold" value="${preDate}">
                            <select id="req-time" class="input-base text-[12px] font-bold">
                                <option value="09:00" ${preTime==='09:00'?'selected':''}>09:00 - 10:00</option>
                                <option value="10:00" ${preTime==='10:00'?'selected':''}>10:00 - 11:00</option>
                                <option value="11:00" ${preTime==='11:00'?'selected':''}>11:00 - 12:00</option>
                                <option value="13:00" ${preTime==='13:00'?'selected':''}>13:00 - 14:00</option>
                                <option value="14:00" ${preTime==='14:00'?'selected':''}>14:00 - 15:00</option>
                                <option value="15:00" ${preTime==='15:00'?'selected':''}>15:00 - 16:00</option>
                                <option value="16:00" ${preTime==='16:00'?'selected':''}>16:00 - 17:00</option>
                            </select>
                        </div>
                    </div>

                </div>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                    <button onclick="document.getElementById('acc-request-modal').remove()" class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-[11px] font-bold uppercase active:scale-95 border border-slate-200">Отмена</button>
                    <button onclick="window.ConstAcceptance.saveNewRequest()" class="flex-[1.5] bg-indigo-600 text-white py-3 rounded-xl text-[11px] font-black uppercase shadow-md active:scale-95">Отправить Инженеру</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Восстанавливаем каскадные селекторы, если объект был предвыбран
        if (preObj) this.onObjChange(preObj, preBld);
        if (preBld) this.onBldChange(preBld, preFlr);

        // Ставим завтрашний день, если даты нет
        if (!preDate) {
            const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
            document.getElementById('req-date').value = tmr.toISOString().split('T')[0];
        }
    },

    // Вспомогательные функции для каскадных списков в модалке
    onObjChange(objId, preSelectBld = null) {
        const bldSel = document.getElementById('req-bld');
        const flrSel = document.getElementById('req-flr');
        if (!bldSel || !flrSel) return;

        flrSel.innerHTML = '<option value="">-- План Этажа --</option>';
        flrSel.disabled = true;

        if (!objId) {
            bldSel.innerHTML = '<option value="">-- Корпус / Секция --</option>';
            bldSel.disabled = true;
            return;
        }

        const validBlds = window.ConstManager.buildings.filter(b => b.object_id === objId);
        bldSel.innerHTML = '<option value="">-- Корпус / Секция --</option>' + 
            validBlds.map(b => `<option value="${b.id}" ${b.id === preSelectBld ? 'selected' : ''}>${b.name}</option>`).join('');
        bldSel.disabled = false;
    },

    onBldChange(bldId, preSelectFlr = null) {
        const flrSel = document.getElementById('req-flr');
        if (!flrSel) return;

        if (!bldId) {
            flrSel.innerHTML = '<option value="">-- План Этажа --</option>';
            flrSel.disabled = true;
            return;
        }

        const validFlrs = window.ConstManager.floors.filter(f => f.building_id === bldId);
        flrSel.innerHTML = '<option value="">-- План Этажа --</option>' + 
            validFlrs.map(f => `<option value="${f.id}" ${f.id === preSelectFlr ? 'selected' : ''}>${f.name}</option>`).join('');
        flrSel.disabled = false;
    },

    // Кнопка "Выделить на плане" изнутри заявки
    goDrawZone() {
        const obj = document.getElementById('req-obj').value;
        const bld = document.getElementById('req-bld').value;
        const flr = document.getElementById('req-flr').value;

        if (!obj || !bld || !flr) return showToast('⚠️ Сначала выберите Объект, Корпус и Этаж!');

        // Сохраняем введенный текст, чтобы он не пропал
        window.tempAcceptanceContext = {
            obj, bld, flr,
            work: document.getElementById('req-work').value,
            room: document.getElementById('req-room').value,
            vol: document.getElementById('req-vol').value,
            date: document.getElementById('req-date').value,
            time: document.getElementById('req-time').value
        };

        document.getElementById('acc-request-modal').remove();
        
        window.ConstManager.switchView('plan');
        window.ConstManager.currentFlrId = flr;
        window.ConstManager.renderSelectors();
        
        const floorData = window.ConstManager.floors.find(f => f.id === flr);
        if (!floorData) return;

        window.UniversalPdfViewer.open(floorData.pdf_url, `Выделение зоны`, flr);
        setTimeout(() => { window.UniversalPdfViewer.setZoneMode(true); }, 800);
    },

    // 5. Сохранение новой заявки
    async saveNewRequest() {
        const objId = document.getElementById('req-obj').value;
        const bldId = document.getElementById('req-bld').value;
        const flrId = document.getElementById('req-flr').value;
        
        const workSelect = document.getElementById('req-work');
        const workKey = workSelect.value;
        const workTitle = workKey ? workSelect.options[workSelect.selectedIndex].text.replace(/\[.*?\]\s*/, '') : '';
        
        const rm = document.getElementById('req-room').value.trim();
        const vol = document.getElementById('req-vol').value.trim();
        const dateStr = document.getElementById('req-date').value;
        const timeStr = document.getElementById('req-time').value;

        if (!objId || !bldId || !flrId || !workKey || !dateStr) return showToast('⚠️ Заполните все поля со звездочкой!');

        // Берем данные, переданные с плана
        const zoneInfo = window.tempAcceptanceZone;
        const floor = window.ConstManager.floors.find(f => f.id === flrId);
        const bld = window.ConstManager.buildings.find(b => b.id === bldId);
        const loc = [bld?.name, `Этаж ${floor?.name}`, rm].filter(Boolean).join(', ');

        const newReq = {
            id: 'acc_' + Date.now().toString(36),
            objectId: objId,
            floorId: flrId, 
            zone: zoneInfo, // Сохраняем прямоугольник: x, y, w, h
            templateKey: workKey,
            workType: workTitle,
            location: loc,
            section: bld?.name, 
            floor: floor?.name,
            room: rm,
            volume: vol,
            requestedDate: dateStr,
            requestedTime: timeStr,
            contractor: window.syncConfig?.engineerName || 'Подрядчик',
            status: 'pending',
            created_at: new Date().toISOString(),
            _deleted: false
        };

        this.requests.push(newReq);
        if (typeof dbPut === 'function') await dbPut(STORES.CONST_ACCEPTANCE, newReq);

        document.getElementById('acc-request-modal').remove();
        showToast('✅ Заявка отправлена инженеру!');
        
        // Очищаем переменные
        window.tempAcceptanceZone = null;
        window.tempAcceptanceFloor = null;
        window.tempAcceptanceObject = null;
        window.tempAcceptanceContext = null;

        this.renderList();
    },

    // 6. Детализация заявки
    openRequestDetails(id) {
        const req = this.requests.find(r => r.id === id);
        if (!req) return;

        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isEngineer = ['engineer', 'manager', 'deputy_manager'].includes(role);

        const objName = window.ConstManager.objects.find(o => o.id === req.objectId)?.name || 'Неизвестный объект';

        let actionBtns = '';

        if (req.status === 'pending') {
            if (isEngineer) {
                actionBtns = `
                    <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-[var(--card-border)]">
                        <button onclick="document.getElementById('acc-details-modal').remove(); window.ConstAcceptance.focusOnZone('${req.id}')" class="w-full bg-slate-100 text-slate-700 border border-slate-300 py-3 rounded-xl font-black text-[11px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2">
                            🗺️ Показать на плане
                        </button>
                        <button onclick="window.ConstAcceptance.startInspection('${req.id}')" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            Начать проверку (Чек-лист)
                        </button>
                        <div class="flex gap-2">
                            <button onclick="window.ConstAcceptance.changeStatus('${req.id}', 'accepted')" class="flex-1 bg-green-50 text-green-600 border border-green-200 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm">✅ Принять (без ЦК)</button>
                            <button onclick="window.ConstAcceptance.changeStatus('${req.id}', 'rejected')" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm">❌ Отклонить</button>
                        </div>
                    </div>
                `;
            } else {
                actionBtns = `
                    <div class="mt-4 pt-4 border-t border-[var(--card-border)] text-center">
                        <div class="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-3 animate-pulse">⏳ Инженер проверяет заявку...</div>
                        <button onclick="window.ConstAcceptance.deleteRequest('${req.id}')" class="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 border border-red-200">Отозвать заявку</button>
                    </div>
                `;
            }
        } else {
            let engineerOverrideBtn = isEngineer ? `<button onclick="window.ConstAcceptance.changeStatus('${req.id}', 'pending')" class="w-full mt-2 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 border border-slate-200">Вернуть в работу (Служебная)</button>` : '';
            
            actionBtns = `
                <div class="mt-4 pt-4 border-t border-[var(--card-border)] text-center">
                    <div class="text-[12px] font-black uppercase tracking-widest mb-1 ${req.status === 'accepted' ? 'text-green-600' : 'text-red-600'}">${req.status === 'accepted' ? '✅ Работы Приняты' : '❌ Работы Отклонены'}</div>
                    ${req.status === 'rejected' ? '<div class="text-[10px] text-slate-500 mb-3">Дефекты перенесены в Реестр замечаний. Устраните их и подайте заявку заново.</div>' : ''}
                    ${engineerOverrideBtn}
                </div>
            `;
        }

        const html = `
        <div id="acc-details-modal" class="fixed inset-0 bg-slate-900/80 z-[6000] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" onclick="this.remove()">
            <div class="bg-[var(--card-bg)] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--card-border)] animate-fadeIn" onclick="event.stopPropagation()">
                <div class="p-4 bg-[var(--hover-bg)] border-b border-[var(--card-border)] flex justify-between items-center">
                    <h3 class="font-black text-[13px] uppercase text-slate-800 dark:text-white flex items-center gap-2">📋 Детали заявки</h3>
                    <button onclick="document.getElementById('acc-details-modal').remove()" class="text-slate-400 hover:text-red-500 active:scale-90 font-black text-lg leading-none">✕</button>
                </div>
                <div class="p-5">
                    <div class="text-[10px] font-black uppercase text-indigo-500 mb-1">${objName}</div>
                    <div class="text-[16px] font-black text-slate-800 dark:text-white leading-tight mb-4">${req.workType}</div>
                    
                    <div class="space-y-2 text-[12px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div class="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                            <span class="font-bold text-slate-400">Локация:</span>
                            <span class="font-medium text-right">${req.location}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                            <span class="font-bold text-slate-400">Подрядчик:</span>
                            <span class="font-medium text-right">${req.contractor}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                            <span class="font-bold text-slate-400">Объём:</span>
                            <span class="font-medium text-right">${req.volume || '-'}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                            <span class="font-bold text-slate-400">Слот:</span>
                            <span class="font-medium text-right">${req.requestedDate ? new Date(req.requestedDate).toLocaleDateString('ru-RU') : ''} | ${req.requestedTime || ''}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-bold text-slate-400">Создано:</span>
                            <span class="font-medium text-right">${new Date(req.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                    </div>
                    
                    ${actionBtns}
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
    },

    async changeStatus(id, newStatus) {
        const req = this.requests.find(r => r.id === id);
        if (req) {
            req.status = newStatus;
            if (typeof dbPut === 'function') await dbPut(STORES.CONST_ACCEPTANCE, req);
            
            const modal = document.getElementById('acc-details-modal');
            if (modal) modal.remove();
            
            showToast(`Статус заявки изменен на: ${newStatus === 'accepted' ? 'Принято' : (newStatus === 'rejected' ? 'Отклонено' : 'В работе')}`);
            this.renderList();
        }
    },

    async deleteRequest(id) {
        if(!confirm('Отозвать и удалить заявку?')) return;
        const req = this.requests.find(r => r.id === id);
        if (req) {
            req._deleted = true;
            if (typeof dbPut === 'function') await dbPut(STORES.CONST_ACCEPTANCE, req);
            this.requests = this.requests.filter(r => r.id !== id);
            
            const modal = document.getElementById('acc-details-modal');
            if (modal) modal.remove();
            
            showToast('🗑️ Заявка отозвана');
            this.renderList();
        }
    },

    // --- Поиск и фокусировка на Зоне приемки на интерактивном плане ---
    focusOnZone(reqId) {
        const req = this.requests.find(r => r.id === reqId);
        if (!req || !req.floorId || !req.zone) return showToast('⚠️ Для этой заявки не была выделена зона на плане');

        document.getElementById('acc-details-modal')?.remove();

        if (window.ConstManager.currentFlrId !== req.floorId) {
            const floor = window.ConstManager.floors.find(f => f.id === req.floorId);
            if (floor) {
                window.ConstManager.currentObjId = window.ConstManager.buildings.find(b => b.id === floor.building_id)?.object_id;
                window.ConstManager.currentBldId = floor.building_id;
                window.ConstManager.currentFlrId = floor.id;
                window.ConstManager.renderSelectors();
            }
        }

        window.ConstManager.switchView('plan');
        const floor = window.ConstManager.floors.find(f => f.id === req.floorId);
        if (!floor) return;

        const safeName = floor.name.replace(/'/g, "\\'");
        window.UniversalPdfViewer.open(floor.pdf_url, `Приемка: ${safeName}`, floor.id);

        setTimeout(() => {
            const pz = window.UniversalPdfViewer.panzoomInstance;
            if (!pz) return;

            const wrapper = document.getElementById('universal-pdf-wrapper');
            const container = document.getElementById('universal-pdf-container');
            const pinsContainer = document.getElementById('universal-pdf-pins');
            
            const z = req.zone;
            let zoneColor = 'bg-blue-500/20 border-blue-500';
            let labelColor = 'bg-blue-600';
            if (req.status === 'rejected') { zoneColor = 'bg-red-500/20 border-red-500'; labelColor = 'bg-red-600'; }
            if (req.status === 'accepted') { zoneColor = 'bg-green-500/20 border-green-500'; labelColor = 'bg-green-600'; }

            const zoneHtml = `
                <div class="absolute border-2 ${zoneColor} shadow-inner z-10 flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors" 
                     style="left: ${z.x}%; top: ${z.y}%; width: ${z.w}%; height: ${z.h}%;"
                     onclick="window.ConstAcceptance.openRequestDetails('${req.id}')">
                     <span class="${labelColor} text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-80 uppercase tracking-widest text-center leading-tight shadow-md">${req.workType}</span>
                </div>
            `;
            pinsContainer.insertAdjacentHTML('beforeend', zoneHtml);

            const centerX_percent = z.x + (z.w / 2);
            const centerY_percent = z.y + (z.h / 2);

            const cw = wrapper.clientWidth;
            const ch = wrapper.clientHeight;
            
            const zoneWidthPx = (z.w / 100) * container.offsetWidth;
            let targetScale = (cw / zoneWidthPx) * 0.6; 
            if (targetScale > 4) targetScale = 4;
            if (targetScale < 1) targetScale = 1;

            const pointX_px = (centerX_percent / 100) * container.offsetWidth;
            const pointY_px = (centerY_percent / 100) * container.offsetHeight;

            const panX = (cw / 2) - (pointX_px * targetScale);
            const panY = (ch / 2) - (pointY_px * targetScale);

            pz.zoom(targetScale, { animate: true });
            setTimeout(() => {
                pz.pan(panX, panY, { animate: true, force: true });
                showToast("📍 Зона сдачи подсвечена на плане!");
            }, 50);

        }, 600);
    },

    startInspection(id) {
        const req = this.requests.find(r => r.id === id);
        if (!req) return;

        const modal = document.getElementById('acc-details-modal');
        if (modal) modal.remove();

        const objName = window.ConstManager.objects.find(o => o.id === req.objectId)?.name || '';

        window.activeAcceptanceRequestId = id;

        if (typeof startInspectionWithValues === 'function') {
            startInspectionWithValues(req.contractor, req.templateKey, null, objName);
        }

        setTimeout(() => {
            const secInp = document.getElementById('inp-section');
            const flrInp = document.getElementById('inp-floor');
            const rmInp = document.getElementById('inp-room');

            if (secInp) secInp.value = req.section || '';
            if (flrInp) flrInp.value = req.floor || '';
            if (rmInp) rmInp.value = req.room || '';
            
            if(typeof updateLocationFromStructured === 'function') updateLocationFromStructured();
            
            showToast('📋 Режим приёмки активирован!');
        }, 300);
    }
    
};

