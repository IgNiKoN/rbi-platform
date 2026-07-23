/**
 * Рабочий UI construction-v2: дерево локаций + интерактивный план + замечания на координатах.
 */

import type { FloorPlan, LocationNode } from '../../services/locations/types';
import type { ConstructionDefectV2 } from '../../services/construction-defects/types';
import { PlanViewer } from './plan-viewer';
import { openCreateDefectForm, openViewDefectForm } from './defect-form';

type LocSvc = {
  init: () => Promise<boolean>;
  listNodes: (opts?: { nodeType?: string; parentId?: string | null }) => LocationNode[];
  getChildren: (parentId: string | null) => LocationNode[];
  getNode: (id: string) => LocationNode | null;
  getPlanForFloor: (id: string) => FloorPlan | null;
  getPath: (id: string) => LocationNode[];
};

type DefectsSvc = {
  init: () => Promise<boolean>;
  listForFloor: (locationId: string) => ConstructionDefectV2[];
  get: (id: string) => ConstructionDefectV2 | null;
  create: (input: {
    locationId: string;
    x: number;
    y: number;
    description: string;
    category?: string;
    contractorId?: string | null;
  }) => Promise<ConstructionDefectV2>;
  softDelete: (id: string) => Promise<ConstructionDefectV2>;
};

function _loc(): LocSvc | null {
  return (window.RBI?.services?.locations as LocSvc) || null;
}

function _defects(): DefectsSvc | null {
  return (window.RBI?.services?.constructionDefects as DefectsSvc) || null;
}

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let _selectedFloorId: string | null = null;
let _bound = false;
let _viewer: PlanViewer | null = null;
let _addMode = false;
let _mountedPdfUrl: string | null = null;

function _root(): HTMLElement | null {
  return document.getElementById('construction-v2-root');
}

function _renderTree(svc: LocSvc): string {
  const objects = svc.listNodes({ nodeType: 'object', parentId: null });
  if (!objects.length) {
    return `<div class="p-6 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest">
      Нет объектов. Создайте иерархию в Настройках → «Объекты и планы».
    </div>`;
  }
  let html = '<ul class="space-y-1 text-[12px]">';
  for (const obj of objects) {
    html += `<li class="font-black text-slate-700 dark:text-slate-200">${_escape(obj.displayName)}`;
    const buildings = svc.getChildren(obj.id);
    html += '<ul class="ml-3 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">';
    for (const b of buildings) {
      html += `<li><span class="font-bold text-slate-600 dark:text-slate-300">${_escape(b.displayName)}</span>`;
      const sections = svc.getChildren(b.id);
      html += '<ul class="ml-2 mt-0.5 space-y-0.5">';
      for (const sec of sections) {
        html += `<li class="text-slate-500">${_escape(sec.displayName)}`;
        const floors = svc.getChildren(sec.id);
        html += '<ul class="ml-2">';
        for (const fl of floors) {
          const plan = svc.getPlanForFloor(fl.id);
          const active =
            _selectedFloorId === fl.id
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800';
          const mark = plan?.pdf_url ? '📄' : '⚠️';
          html += `<li>
            <button type="button" data-c2-floor="${_escape(fl.id)}"
              class="w-full text-left px-2 py-1 rounded-lg ${active} transition-colors">
              ${mark} ${_escape(fl.displayName)}
            </button>
          </li>`;
        }
        html += '</ul></li>';
      }
      html += '</ul></li>';
    }
    html += '</ul></li>';
  }
  html += '</ul>';
  return html;
}

function _renderPlanChrome(svc: LocSvc): string {
  if (!_selectedFloorId) {
    return `<div class="flex items-center justify-center h-full min-h-[240px] text-slate-400 text-[11px] font-bold uppercase tracking-widest">
      Выберите этаж слева
    </div>`;
  }
  const floor = svc.getNode(_selectedFloorId);
  const plan = svc.getPlanForFloor(_selectedFloorId);
  const path = svc
    .getPath(_selectedFloorId)
    .map((n) => n.displayName)
    .join(' / ');
  if (!plan?.pdf_url) {
    return `<div class="p-6">
      <div class="text-[11px] font-bold text-slate-500 mb-2">${_escape(path)}</div>
      <div class="text-amber-600 font-black text-[12px] uppercase">Нет PDF-плана на этом этаже</div>
      <p class="text-[11px] text-slate-500 mt-2">Загрузите план в Настройках → «Объекты и планы».</p>
    </div>`;
  }
  const addCls = _addMode
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-transparent text-indigo-600 border-indigo-200';
  return `<div class="flex flex-col h-full min-h-[320px]">
    <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
      <div class="text-[11px] font-bold text-slate-600 min-w-0">
        ${_escape(path || floor?.displayName || '')}
        <span class="ml-2 text-slate-400 font-normal">${_escape(plan.pdf_name || '')}</span>
      </div>
      <button type="button" data-c2-add-mode
        class="shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase ${addCls}">
        ${_addMode ? 'Кликни на план…' : '+ Замечание'}
      </button>
    </div>
    <div class="flex-1 relative bg-slate-100 dark:bg-slate-900 min-h-[280px]" id="c2-plan-host"></div>
    <div class="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-2">
      <span>Клик по маркеру — просмотр / удаление. Режим «+ Замечание» — клик по плану.</span>
      <span id="c2-defect-count"></span>
    </div>
  </div>`;
}

async function _mountViewerIfNeeded(svc: LocSvc): Promise<void> {
  const host = document.getElementById('c2-plan-host');
  if (!host || !_selectedFloorId) {
    _viewer?.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }
  const plan = svc.getPlanForFloor(_selectedFloorId);
  if (!plan?.pdf_url) {
    _viewer?.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }

  const needReload = !_viewer || _mountedPdfUrl !== plan.pdf_url;
  if (needReload) {
    _viewer?.destroy();
    _viewer = new PlanViewer(host, {
      onPlanClick: (x, y) => {
        if (!_selectedFloorId) return;
        const dSvc = _defects();
        if (!dSvc) {
          window.showToast?.('service.constructionDefects не загружен');
          return;
        }
        _viewer?.drawTempPin(x, y);
        openCreateDefectForm(
          { locationId: _selectedFloorId, x, y },
          async (input) => {
            await dSvc.create(input);
            _addMode = false;
            _viewer?.setAddMode(false);
            _viewer?.clearTempPin();
            window.showToast?.('Замечание сохранено');
            await _refreshMarkersOnly();
            const addBtn = document.querySelector('[data-c2-add-mode]') as HTMLElement | null;
            if (addBtn) {
              addBtn.textContent = '+ Замечание';
              addBtn.className =
                'shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200';
            }
          },
          () => _viewer?.clearTempPin()
        );
      },
      onMarkerClick: (id) => {
        const dSvc = _defects();
        const d = dSvc?.get(id);
        if (!d || !dSvc) return;
        openViewDefectForm(d, async (defectId) => {
          await dSvc.softDelete(defectId);
          window.showToast?.('Замечание удалено');
          await _refreshMarkersOnly();
        });
      }
    });
    try {
      await _viewer.load(plan.pdf_url);
      _mountedPdfUrl = plan.pdf_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      host.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">Ошибка плана: ${_escape(msg)}</div>`;
      _viewer = null;
      _mountedPdfUrl = null;
      return;
    }
  }

  if (_viewer) _viewer.setAddMode(_addMode);
  await _refreshMarkersOnly();
}

async function _refreshMarkersOnly(): Promise<void> {
  const dSvc = _defects();
  if (!_viewer || !_selectedFloorId || !dSvc) return;
  await dSvc.init();
  const list = dSvc.listForFloor(_selectedFloorId);
  _viewer.setMarkers(list);
  const countEl = document.getElementById('c2-defect-count');
  if (countEl) countEl.textContent = `Замечаний: ${list.length}`;
}

export async function renderConstructionV2(): Promise<void> {
  const root = _root();
  if (!root) return;
  const svc = _loc();
  if (!svc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">service.locations не загружен</div>`;
    return;
  }
  const dSvc = _defects();
  await svc.init();
  if (dSvc) await dSvc.init();

  // Сохраняем viewer, если тот же этаж/URL — не убиваем canvas при полном re-render дерева
  const prevFloor = _selectedFloorId;
  const prevUrl = _mountedPdfUrl;
  _viewer?.destroy();
  _viewer = null;
  _mountedPdfUrl = null;

  root.innerHTML = `
    <div class="flex flex-col md:flex-row gap-3 h-full min-h-[420px]">
      <aside class="md:w-72 shrink-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 overflow-y-auto max-h-[70vh]">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Иерархия (v2)</div>
        <div id="c2-tree">${_renderTree(svc)}</div>
        ${
          !dSvc
            ? `<div class="mt-3 text-[10px] text-amber-600 font-bold">constructionDefects не загружен</div>`
            : ''
        }
      </aside>
      <main class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative" id="c2-plan">
        ${_renderPlanChrome(svc)}
      </main>
    </div>`;
  _bindOnce();

  // restore selection context for mount
  if (prevFloor) _selectedFloorId = prevFloor;
  void prevUrl;
  await _mountViewerIfNeeded(svc);
}

function _bindOnce() {
  if (_bound) return;
  _bound = true;
  document.addEventListener(
    'click',
    (ev) => {
      const t = ev.target as HTMLElement | null;
      const floorBtn = t?.closest?.('[data-c2-floor]') as HTMLElement | null;
      if (floorBtn) {
        const id = floorBtn.getAttribute('data-c2-floor');
        if (!id) return;
        _selectedFloorId = id;
        _addMode = false;
        renderConstructionV2().catch((e) => console.warn('[construction-v2] render', e));
        return;
      }
      const addBtn = t?.closest?.('[data-c2-add-mode]') as HTMLElement | null;
      if (addBtn) {
        _addMode = !_addMode;
        _viewer?.setAddMode(_addMode);
        addBtn.textContent = _addMode ? 'Кликни на план…' : '+ Замечание';
        addBtn.className = _addMode
          ? 'shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-indigo-600 text-white border-indigo-600'
          : 'shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200';
      }
    },
    true
  );
}

export function mountConstructionV2Shell(): void {
  const content =
    window.RBI?.services?.shell?.getContentRoot?.() ||
    document.getElementById('app-content') ||
    document.getElementById('app-root');
  if (!content) return;
  if (document.getElementById('tab-construction-v2')) return;

  const section = document.createElement('div');
  section.id = 'tab-construction-v2';
  section.className = 'view-section hidden';
  section.innerHTML = `
    <div class="p-3 sm:p-4">
      <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <h2 class="text-[14px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Стройконтроль (новый)</h2>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Параллельный модуль · legacy не затронут</p>
        </div>
        <a href="#/construction" class="text-[10px] font-black uppercase text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-xl">Открыть старый (демо)</a>
      </div>
      <div id="construction-v2-root"></div>
    </div>`;
  content.appendChild(section);
}

/** Точечное обновление маркеров без полного re-render (после sync/CRUD). */
export async function refreshConstructionV2Markers(): Promise<void> {
  const tab = document.getElementById('tab-construction-v2');
  if (!tab || tab.classList.contains('hidden')) return;
  await _refreshMarkersOnly();
}
