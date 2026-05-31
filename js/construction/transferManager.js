/* Файл: js/transferManager.js (Модуль "Передача квартир" и Шахматка) */

window.TransferManager = {
    units: [],
    currentObjId: null,
    currentBldId: null,

    // 1. Инициализация
    async init() {
        // Убеждаемся, что справочник объектов и корпусов из Стройконтроля загружен
        if (typeof window.ConstManager !== 'undefined' && window.ConstManager.objects.length === 0) {
            await window.ConstManager.init();
        }

        try {
            if (typeof dbGetAll !== 'undefined') {
                const u = await dbGetAll(STORES.CONST_UNITS); // Пока используем эту таблицу
                this.units = (u || []).filter(x => !x._deleted);
            }
        } catch (e) {
            console.error('[TransferManager] Ошибка загрузки помещений:', e);
        }
        this.renderSelectors();
    },

    // 2. Отрисовка селекторов
    renderSelectors() {
        const objSel = document.getElementById('transfer-object-select');
        const bldSel = document.getElementById('transfer-building-select');
        if (!objSel || !bldSel) return;

        let objHtml = '<option value="">-- Выберите объект --</option>';
        if (window.ConstManager && window.ConstManager.objects) {
            window.ConstManager.objects.sort((a, b) => a.name.localeCompare(b.name)).forEach(o => {
                objHtml += `<option value="${o.id}">${o.name}</option>`;
            });
        }
        
        objSel.innerHTML = objHtml;
        objSel.value = this.currentObjId || '';
        this.updateBuildingSelector();
    },

    updateBuildingSelector() {
        const bldSel = document.getElementById('transfer-building-select');
        if (!bldSel) return;

        if (!this.currentObjId) {
            bldSel.innerHTML = '<option value="">Сначала выберите объект</option>';
            bldSel.disabled = true;
            this.currentBldId = null;
            this.renderGrid();
            return;
        }

        const validBlds = window.ConstManager.buildings.filter(b => b.object_id === this.currentObjId);
        
        let html = '<option value="">-- Выберите корпус --</option>';
        validBlds.sort((a, b) => a.sort_order - b.sort_order).forEach(b => {
            html += `<option value="${b.id}">${b.name}</option>`;
        });
        
        bldSel.innerHTML = html;
        bldSel.disabled = false;
        bldSel.value = this.currentBldId || '';
        this.renderGrid();
    },

    // 3. Обработка изменений
    onObjectChange() {
        this.currentObjId = document.getElementById('transfer-object-select').value;
        this.currentBldId = null;
        this.updateBuildingSelector();
    },

    onBuildingChange() {
        this.currentBldId = document.getElementById('transfer-building-select').value;
        this.renderGrid();
    },

    // 4. Отрисовка сетки помещений (Шахматки)
    renderGrid() {
        const container = document.getElementById('transfer-grid-container');
        if (!container) return;

        if (!this.currentBldId) {
            container.innerHTML = '<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">Выберите корпус для просмотра шахматки</div>';
            return;
        }

        const floors = window.ConstManager.floors.filter(f => f.building_id === this.currentBldId).sort((a, b) => b.sort_order - a.sort_order);
        
        if (floors.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">В этом корпусе еще не созданы этажи</div>';
            return;
        }

        const bldUnits = this.units.filter(u => u.building_id === this.currentBldId);

        let html = `
            <div class="flex flex-wrap gap-3 mb-4 justify-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-white border border-slate-300 dark:bg-slate-700 dark:border-slate-600"></span><span class="text-[9px] font-bold text-slate-500 uppercase">Черновая</span></div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span><span class="text-[9px] font-bold text-slate-500 uppercase">В отделке</span></div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-100 border border-red-300"></span><span class="text-[9px] font-bold text-slate-500 uppercase">Дефекты</span></div>
                <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span><span class="text-[9px] font-bold text-slate-500 uppercase">Передана</span></div>
            </div>
            <div class="overflow-x-auto pb-4 custom-scrollbar">
                <div class="min-w-max flex flex-col gap-1.5">
        `;
        
        floors.forEach(floor => {
            const floorUnits = bldUnits.filter(u => u.floor_id === floor.id).sort((a, b) => a.sort_order - b.sort_order);
            
            html += `
                <div class="flex items-center gap-2">
                    <div class="w-12 shrink-0 text-center font-black text-[10px] text-slate-400 bg-[var(--hover-bg)] py-3 rounded-lg border border-[var(--card-border)] uppercase tracking-tight">${floor.name}</div>
                    <div class="flex gap-1.5 flex-1">`;
            
            if (floorUnits.length === 0) {
                 html += `<div class="text-[9px] text-slate-300 italic py-3">Помещений нет</div>`;
            } else {
                floorUnits.forEach(u => {
                    let bg = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                    if (u.status === 'accepted') bg = 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:border-green-800';
                    if (u.status === 'defects') bg = 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:border-red-800';
                    if (u.status === 'ready') bg = 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:border-blue-800';

                    html += `
                        <div class="${bg} border rounded-lg w-[46px] h-[46px] flex flex-col items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform active:scale-95" onclick="showToast('Квартира ${u.name}. Скоро здесь откроется карточка дефектовки!')">
                            <span class="text-[12px] font-black">${u.name}</span>
                            <span class="text-[8px] opacity-60 font-bold">${u.type || 'КВ'}</span>
                        </div>`;
                });
            }
            html += `</div></div>`;
        });

        html += '</div></div>';

        const role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        const isManager = ['manager', 'deputy_manager', 'director'].includes(role);
        
        if (isManager && bldUnits.length === 0) {
             html += `
                <button onclick="window.TransferManager.generateDemoGrid()" class="mt-4 w-full bg-indigo-50 text-indigo-600 border border-indigo-200 py-3.5 rounded-xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    Сгенерировать сетку квартир (Автоматически)
                </button>`;
        }

        container.innerHTML = html;
    },

    async generateDemoGrid() {
        if (!this.currentBldId) return;
        const floors = window.ConstManager.floors.filter(f => f.building_id === this.currentBldId).sort((a, b) => a.sort_order - b.sort_order);
        if (floors.length === 0) return showToast("Сначала создайте этажи через Администрирование!");

        if (!confirm("Сгенерировать по 8 квартир на каждом этаже?")) return;

        showToast("⏳ Генерируем помещения...");
        let count = 1;
        let addedCount = 0;
        
        for (let f of floors) {
            for (let i = 1; i <= 8; i++) {
                const statusRand = Math.random();
                let st = 'none';
                if (statusRand > 0.85) st = 'defects';
                else if (statusRand > 0.70) st = 'ready';
                else if (statusRand > 0.50) st = 'accepted';

                const newUnit = {
                    id: 'unit_' + Date.now().toString(36) + '_' + count,
                    building_id: this.currentBldId,
                    floor_id: f.id,
                    name: String(count),
                    type: 'КВ',
                    sort_order: i,
                    status: st,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    _deleted: false,
                    source: 'local',
                    sync_status: 'not_synced'
                };
                this.units.push(newUnit);
                if (typeof dbPut === 'function') await dbPut(STORES.CONST_UNITS, newUnit);
                count++;
                addedCount++;
            }
        }
        
        this.renderGrid();
        showToast(`✅ Сгенерировано ${addedCount} помещений!`);
    }
};