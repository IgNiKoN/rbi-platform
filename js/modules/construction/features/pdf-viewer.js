/* Файл: js/modules/construction/features/pdf-viewer.js */

// ============================================================================
// === УНИВЕРСАЛЬНЫЙ PDF-ПРОСМОТРЩИК С PANZOOM (ДВИЖОК ДЛЯ ЧЕРТЕЖЕЙ) ===
// ============================================================================
// ============================================================================
// === УНИВЕРСАЛЬНЫЙ PDF-ПРОСМОТРЩИК С PANZOOM И МАРКЕРАМИ ===
// ============================================================================

var _ctx = null;
function bindCtx(ctx) {
    _ctx = ctx;
    bindPdfViewerActionDelegation();
}

// Паттерн делегирования событий для инициативы «Разбор inline onclick/onchange»
// (см. _ai/INDEX_HTML_HANDLERS_MAP.md), namespace-per-module (data-pdf-viewer-action).
// Действия — методы window.UniversalPdfViewer, не bare window.*-функции.
function bindPdfViewerActionDelegation() {
    if (window.__pdfViewerActionDelegationBound) return;
    window.__pdfViewerActionDelegationBound = true;

    var dispatch = function (el) {
        var action = el.dataset.pdfViewerAction;
        var fn = window.UniversalPdfViewer && window.UniversalPdfViewer[action];
        if (typeof fn !== 'function') return;
        fn.call(window.UniversalPdfViewer);
    };

    var resolveActionElement = function (target) {
        var el = target;
        while (el && el.nodeType === 1) {
            if (el.dataset && el.dataset.pdfViewerAction) return el;
            var inlineOnclick = el.getAttribute && el.getAttribute('onclick');
            if (inlineOnclick && inlineOnclick.includes('stopPropagation')) return null;
            el = el.parentElement;
        }
        return null;
    };

    document.addEventListener('click', function (e) {
        var el = resolveActionElement(e.target);
        if (!el) return;
        // Не даём всплыть/дойти до legacy btn.onclick — иначе toggleAddMode
        // вызывается дважды за один клик (capture + onclick) и режим сразу сбрасывается.
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        dispatch(el);
    }, true);
}

function _storage() {
    if (_ctx && _ctx.storage) return _ctx.storage;
    if (window.RBI && window.RBI.services && window.RBI.services.storage) {
        return window.RBI.services.storage;
    }
    return {
        stores: function () { return typeof STORES !== 'undefined' ? STORES : {}; },
        get: function (store, key) { return dbGet(store, key); },
        getAll: function (store) { return dbGetAll(store); },
        put: function (store, data) { return dbPut(store, data); },
        delete: function (store, key) { return dbDelete(store, key); }
    };
}

function _session() {
    if (_ctx && _ctx.session) return _ctx.session;
    return window.RBI.services.session;
}

// =========================================================================
// РАЗМЕТКА МОДАЛКИ «UNIVERSAL PDF VIEWER» (перенос из index.html:1080-1130,
// перенос 30 modal/overlay-блоков #app-modals в JS-рендер). HTML-строка 1:1
// идентична прежней статичной разметке.
// =========================================================================
function renderUniversalPdfModalMarkup() {
    return `
    <div id="universal-pdf-modal"
        class="fixed inset-0 bg-slate-900/95 z-[9999] hidden flex-col transition-opacity duration-300 opacity-0">
        <!-- Шапка -->
        <div class="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-20 shrink-0">
            <div class="font-black text-sm uppercase tracking-widest truncate pr-4" id="universal-pdf-title">План этажа
            </div>
            <button data-pdf-viewer-action="close"
                class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center active:scale-90 shrink-0 border border-indigo-400 font-bold">✕</button>
        </div>

        <!-- Панель инструментов (Тут в будущем будет кнопка "Поставить дефект") -->
        <!-- Панель инструментов (Тулбар) -->
        <div id="universal-pdf-toolbar"
            class="bg-[var(--card-bg)] border-b border-[var(--card-border)] p-3 flex justify-between items-center z-20 shrink-0 shadow-sm hidden">
            <div id="pdf-add-hint"
                class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden animate-pulse">Кликните на
                чертеж ➔</div>
            <div id="pdf-normal-hint" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Режим
                просмотра</div>

            <button id="pdf-btn-add-defect" data-pdf-viewer-action="toggleAddMode"
                class="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
                </svg> Добавить дефект
            </button>
        </div>

        <!-- Контейнер для Panzoom -->
        <div class="flex-1 relative overflow-hidden touch-none" id="universal-pdf-wrapper">
            <div id="universal-pdf-container" class="absolute top-0 left-0 shadow-2xl">
                <!-- Сам рендер PDF (холст) -->
                <canvas id="universal-pdf-canvas" class="block"></canvas>
                <!-- Слой поверх PDF, куда будут падать точки (булавки) дефектов -->
                <div id="universal-pdf-pins" class="absolute inset-0 pointer-events-none"></div>
            </div>
        </div>

        <!-- Лоадер -->
        <div id="universal-pdf-loader"
            class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white z-30 hidden backdrop-blur-sm">
            <svg class="animate-spin h-10 w-10 mb-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
            </svg>
            <div class="font-bold text-xs uppercase tracking-widest animate-pulse">Загрузка чертежа...</div>
        </div>
    </div>
`;
}

(function mountUniversalPdfModalMarkup() {
    if (document.getElementById('universal-pdf-modal')) return;
    var root = window.RBI && window.RBI.services && window.RBI.services.shell
        ? window.RBI.services.shell.getModalsRoot()
        : document.getElementById('app-modals');
    if (!root) return;
    root.insertAdjacentHTML('beforeend', renderUniversalPdfModalMarkup());
}());

window.UniversalPdfViewer = {
    bindCtx: bindCtx,
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
                maxScale: 10,
                minScale: 0.3,
                step: 0.1,
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

    /** Выход из режима штампа — только через data-pdf-viewer-action (без btn.onclick). */
    endCopyMode() {
        this.setCopyMode(false);
    },

    setAddMode(isActive) {
        this.isAddMode = isActive;
        this.isCopyMode = false;
        
        const btn = document.getElementById('pdf-btn-add-defect');
        const hintAdd = document.getElementById('pdf-add-hint');
        const hintNorm = document.getElementById('pdf-normal-hint');
        const container = document.getElementById('universal-pdf-container');
        if (!btn) return;

        // Единственный путь клика — делегирование data-pdf-viewer-action.
        // btn.onclick здесь раньше давал double-toggle с capture-listener.
        btn.onclick = null;
        btn.setAttribute('data-pdf-viewer-action', 'toggleAddMode');

        if (isActive) {
            btn.className = 'bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5';
            btn.innerHTML = 'Отмена';
            hintNorm.classList.add('hidden');
            hintAdd.classList.remove('hidden');
            hintAdd.innerText = 'Кликните на чертеж ➔';
            hintAdd.className = 'text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse';
            if (container) container.style.cursor = 'crosshair';
        } else {
            btn.className = 'bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5';
            btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Добавить дефект';
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
        if (!btn) return;

        btn.onclick = null;

        if (isActive) {
            btn.setAttribute('data-pdf-viewer-action', 'endCopyMode');
            btn.className = 'bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm transition-colors flex items-center gap-1.5';
            btn.innerHTML = 'Завершить штамп';
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
        
        if (orig.photo) {
            _session().setPhotoRaw(newId, orig.photo);
        }

        window.ConstManager.defects.push(newDefect);
        await _storage().put(_storage().stores().CONST_DEFECTS, newDefect);
        
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
