/**
 * location-directory-ui.js
 * UI справочника локаций/планов (Настройки) → service.locations.
 * Legacy ConstAdmin не используется.
 */

let _delegationBound = false;
let _selectedId = null;

function _svc() {
    return (window.RBI && window.RBI.services && window.RBI.services.locations) || null;
}

function _perm() {
    return (window.RBI && window.RBI.services && window.RBI.services.permissions) || null;
}

function _toast(msg) {
    const toastFn = window['showToast'];
    if (typeof toastFn === 'function') toastFn(msg);
}

function _escape(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _canEdit() {
    const p = _perm();
    return !!(p && (p.isAdmin?.() || p.canManageHierarchy?.()));
}

function _childType(parentType) {
    if (!parentType) return 'object';
    if (parentType === 'object') return 'building';
    if (parentType === 'building') return 'section';
    if (parentType === 'section') return 'floor';
    return null;
}

function _renderTreeHtml(svc) {
    const objects = svc.listNodes({ nodeType: 'object', parentId: null });
    if (!objects.length) {
        return '<div class="p-4 text-[11px] text-slate-400 font-bold uppercase tracking-widest text-center">Дерево пусто — создайте объект</div>';
    }
    let html = '<ul class="space-y-1 text-[12px]">';
    const walk = (nodes, depth) => {
        for (const n of nodes) {
            const sel = _selectedId === n.id ? 'bg-teal-100 dark:bg-teal-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800';
            const plan = n.nodeType === 'floor' ? svc.getPlanForFloor(n.id) : null;
            const mark = n.nodeType === 'floor' ? (plan?.pdf_url ? '📄' : '⚠️') : '';
            html += `<li>
                <button type="button" data-loc-dir-action="select" data-id="${_escape(n.id)}"
                    class="w-full text-left px-2 py-1 rounded-lg ${sel}" style="padding-left:${8 + depth * 12}px">
                    <span class="text-[9px] uppercase text-slate-400 mr-1">${_escape(n.nodeType)}</span>
                    ${mark} ${_escape(n.displayName)}
                </button>`;
            const kids = svc.getChildren(n.id);
            if (kids.length) {
                html += '<ul>';
                walk(kids, depth + 1);
                html += '</ul>';
            }
            html += '</li>';
        }
    };
    walk(objects, 0);
    html += '</ul>';
    return html;
}

function _editorHtml(svc) {
    const can = _canEdit();
    const node = _selectedId ? svc.getNode(_selectedId) : null;
    if (!node) {
        return `<div class="p-4 space-y-3">
            <p class="text-[11px] text-slate-500">Выберите узел слева или создайте корень.</p>
            ${can ? `<button type="button" data-loc-dir-action="create-root"
                class="bg-teal-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">+ Объект</button>` : ''}
            <a href="#/construction-v2" class="block text-[10px] font-black uppercase text-indigo-600 mt-2">Открыть СК (новый) →</a>
        </div>`;
    }
    const next = _childType(node.nodeType);
    const plan = node.nodeType === 'floor' ? svc.getPlanForFloor(node.id) : null;
    return `<div class="p-4 space-y-3">
        <div class="text-[10px] font-black uppercase text-teal-700">${_escape(node.nodeType)}</div>
        <input id="loc-dir-name" type="text" value="${_escape(node.displayName)}"
            class="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[12px] bg-transparent" ${can ? '' : 'disabled'} />
        ${can ? `<div class="flex flex-wrap gap-2">
            <button type="button" data-loc-dir-action="save" data-id="${_escape(node.id)}"
                class="bg-slate-800 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Сохранить</button>
            ${next ? `<button type="button" data-loc-dir-action="add-child" data-id="${_escape(node.id)}" data-child="${next}"
                class="bg-teal-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">+ ${_escape(next)}</button>` : ''}
            <button type="button" data-loc-dir-action="delete" data-id="${_escape(node.id)}"
                class="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase">Удалить</button>
        </div>` : ''}
        ${node.nodeType === 'floor' ? `
            <div class="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                <div class="text-[10px] font-black uppercase text-slate-500 mb-2">PDF-план</div>
                ${plan?.pdf_url
                    ? `<div class="text-[11px] mb-2">📄 ${_escape(plan.pdf_name || 'plan.pdf')}
                        <a href="${_escape(plan.pdf_url)}" target="_blank" class="text-indigo-600 ml-2">открыть</a></div>`
                    : '<div class="text-[11px] text-amber-600 mb-2">План не загружен</div>'}
                ${can ? `<input id="loc-dir-pdf" type="file" accept="application/pdf" class="text-[11px] w-full" />
                <button type="button" data-loc-dir-action="upload-pdf" data-id="${_escape(node.id)}"
                    class="mt-2 bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Загрузить PDF</button>` : ''}
            </div>` : ''}
        ${!_selectedId || node.nodeType === 'object' ? '' : ''}
        ${can && !_selectedId ? '' : ''}
        <button type="button" data-loc-dir-action="create-root"
            class="text-[10px] font-black uppercase text-teal-700 underline">+ ещё объект</button>
        <a href="#/construction-v2" class="block text-[10px] font-black uppercase text-indigo-600">Открыть СК (новый) →</a>
    </div>`;
}

function _bindDelegation() {
    if (_delegationBound) return;
    _delegationBound = true;
    document.addEventListener('click', async (ev) => {
        const t = ev.target;
        const el = t && t.closest ? t.closest('[data-loc-dir-action]') : null;
        if (!el) return;
        const action = el.getAttribute('data-loc-dir-action');
        const svc = _svc();
        if (!svc || !action) return;
        try {
            await svc.init();
            if (action === 'select') {
                _selectedId = el.getAttribute('data-id');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'create-root') {
                const name = prompt('Название объекта', '__SMOKE_TEST__ Object');
                if (!name) return;
                const n = await svc.createNode({ nodeType: 'object', displayName: name, parentId: null });
                _selectedId = n.id;
                _toast('Объект создан');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'add-child') {
                const parentId = el.getAttribute('data-id');
                const child = el.getAttribute('data-child');
                const name = prompt(`Название (${child})`, child === 'section' ? 'Секция 1' : child === 'floor' ? 'Этаж 1' : 'Корпус 1');
                if (!name) return;
                const n = await svc.createNode({ nodeType: child, displayName: name, parentId });
                _selectedId = n.id;
                _toast('Создано');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'save') {
                const id = el.getAttribute('data-id');
                const inp = document.getElementById('loc-dir-name');
                await svc.updateNode(id, { displayName: inp ? inp.value : '' });
                _toast('Сохранено');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'delete') {
                const id = el.getAttribute('data-id');
                if (!confirm('Удалить узел и всех потомков?')) return;
                await svc.softDeleteNode(id);
                _selectedId = null;
                _toast('Удалено');
                await mountLocationDirectoryUI();
                return;
            }
            if (action === 'upload-pdf') {
                const id = el.getAttribute('data-id');
                const fileInput = document.getElementById('loc-dir-pdf');
                const file = fileInput && fileInput.files && fileInput.files[0];
                if (!file) {
                    _toast('Выберите PDF');
                    return;
                }
                await svc.uploadFloorPdf(id, file);
                _toast('План загружен');
                await mountLocationDirectoryUI();
            }
        } catch (e) {
            console.error('[LocationDirectoryUI]', e);
            _toast(e.message || 'Ошибка');
        }
    }, true);
}

export async function mountLocationDirectoryUI() {
    _bindDelegation();
    const root = document.getElementById('location-directory-root');
    const section = document.getElementById('location-directory-section');
    if (!root) return;
    const svc = _svc();
    const canView = _canEdit() || !!(_perm() && _perm().isAdmin?.());
    if (section) {
        // Показываем admin / hierarchy managers
        const p = _perm();
        const show = !!(p && (p.isAdmin?.() || p.canManageHierarchy?.()));
        section.classList.toggle('hidden', !show);
        if (!show) return;
    }
    if (!svc) {
        root.innerHTML = '<div class="p-4 text-red-500 text-[11px]">service.locations не загружен</div>';
        return;
    }
    await svc.init();
    root.innerHTML = `<div class="flex flex-col md:flex-row min-h-[280px]">
        <div class="md:w-1/2 border-b md:border-b-0 md:border-r border-teal-200 dark:border-teal-800 p-2 overflow-y-auto max-h-[50vh]" id="loc-dir-tree">
            ${_renderTreeHtml(svc)}
        </div>
        <div class="md:w-1/2" id="loc-dir-editor">${_editorHtml(svc)}</div>
    </div>`;
}

export const LocationDirectoryUI = { mount: mountLocationDirectoryUI };
