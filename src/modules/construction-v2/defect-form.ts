/**
 * Минимальная модалка create/view замечания construction-v2 (v1).
 */

import type { ConstructionDefectV2, DefectCategoryV2 } from '../../services/construction-defects/types';
import { DEFECT_CATEGORIES_V2 } from '../../services/construction-defects/types';

export type DefectFormCreateInput = {
  locationId: string;
  x: number;
  y: number;
  description: string;
  category: DefectCategoryV2;
  contractorId: string | null;
};

type ContractorOpt = { id: string; label: string };

function _escape(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _contractors(): ContractorOpt[] {
  const svc = window.RBI?.services?.contractors as { list?: () => Array<{ id?: string; display_name?: string; displayName?: string }> } | undefined;
  const rows = typeof svc?.list === 'function' ? svc.list() : [];
  return (rows || [])
    .filter((r) => r && r.id)
    .map((r) => ({
      id: String(r.id),
      label: String(r.display_name || r.displayName || r.id)
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

function _catLabel(c: string): string {
  if (c === 'critical') return 'Критичный';
  if (c === 'minor') return 'Незначительный';
  return 'Существенный';
}

function _ensureOverlay(): HTMLElement {
  let el = document.getElementById('c2-defect-modal');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'c2-defect-modal';
  el.className = 'fixed inset-0 z-[600] hidden items-center justify-center bg-black/40 p-3';
  el.innerHTML = `<div class="w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-xl p-4" data-c2-defect-panel></div>`;
  document.body.appendChild(el);
  return el;
}

export function closeDefectForm() {
  const el = document.getElementById('c2-defect-modal');
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}

export function openCreateDefectForm(
  coords: { locationId: string; x: number; y: number },
  onSave: (input: DefectFormCreateInput) => void | Promise<void>,
  onCancel?: () => void
): void {
  const root = _ensureOverlay();
  const panel = root.querySelector('[data-c2-defect-panel]') as HTMLElement;
  const opts = _contractors();
  const catOpts = DEFECT_CATEGORIES_V2.map(
    (c) => `<option value="${c}">${_escape(_catLabel(c))}</option>`
  ).join('');
  const contractorOpts =
    `<option value="">— без подрядчика —</option>` +
    opts.map((o) => `<option value="${_escape(o.id)}">${_escape(o.label)}</option>`).join('');

  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[13px] font-black uppercase tracking-tight">Новое замечание</h3>
      <button type="button" data-c2-defect-close class="text-slate-400 text-[11px] font-bold uppercase">Закрыть</button>
    </div>
    <p class="text-[10px] text-slate-400 mb-3">Координаты: ${coords.x.toFixed(1)}% × ${coords.y.toFixed(1)}%</p>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Описание *</label>
    <textarea data-c2-defect-desc rows="3"
      class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3"></textarea>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Категория</label>
    <select data-c2-defect-cat class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-3">
      ${catOpts}
    </select>
    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Подрядчик</label>
    <select data-c2-defect-contractor class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px] mb-4">
      ${contractorOpts}
    </select>
    <div class="flex gap-2 justify-end">
      <button type="button" data-c2-defect-close class="px-3 py-2 rounded-xl text-[11px] font-bold uppercase text-slate-500">Отмена</button>
      <button type="button" data-c2-defect-save class="px-4 py-2 rounded-xl text-[11px] font-black uppercase bg-indigo-600 text-white">Сохранить</button>
    </div>`;

  root.classList.remove('hidden');
  root.classList.add('flex');

  const cancel = () => {
    closeDefectForm();
    onCancel?.();
  };
  panel.querySelectorAll('[data-c2-defect-close]').forEach((btn) => {
    btn.addEventListener('click', cancel);
  });
  // клик по затемнению
  root.onclick = (ev) => {
    if (ev.target === root) cancel();
  };
  panel.querySelector('[data-c2-defect-save]')?.addEventListener('click', async () => {
    const desc = (panel.querySelector('[data-c2-defect-desc]') as HTMLTextAreaElement)?.value?.trim() || '';
    if (!desc) {
      window.showToast?.('Укажите описание замечания');
      return;
    }
    const category = ((panel.querySelector('[data-c2-defect-cat]') as HTMLSelectElement)?.value ||
      'major') as DefectCategoryV2;
    const contractorId =
      (panel.querySelector('[data-c2-defect-contractor]') as HTMLSelectElement)?.value || '';
    try {
      await onSave({
        locationId: coords.locationId,
        x: coords.x,
        y: coords.y,
        description: desc,
        category,
        contractorId: contractorId || null
      });
      closeDefectForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.showToast?.('❌ ' + (msg));
    }
  });
}

export function openViewDefectForm(
  defect: ConstructionDefectV2,
  onDelete: (id: string) => void | Promise<void>
): void {
  const root = _ensureOverlay();
  const panel = root.querySelector('[data-c2-defect-panel]') as HTMLElement;
  const contractorLabel = (() => {
    if (!defect.contractorId) return '—';
    const found = _contractors().find((c) => c.id === defect.contractorId);
    return found?.label || defect.contractorId;
  })();

  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[13px] font-black uppercase tracking-tight">Замечание</h3>
      <button type="button" data-c2-defect-close class="text-slate-400 text-[11px] font-bold uppercase">Закрыть</button>
    </div>
    <p class="text-[10px] text-slate-400 mb-2">Координаты: ${Number(defect.x).toFixed(1)}% × ${Number(defect.y).toFixed(1)}%</p>
    <div class="text-[12px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap mb-3">${_escape(defect.description)}</div>
    <div class="grid grid-cols-2 gap-2 text-[11px] mb-4">
      <div><span class="text-slate-400 font-bold uppercase text-[9px]">Категория</span><div class="font-bold">${_escape(_catLabel(String(defect.category)))}</div></div>
      <div><span class="text-slate-400 font-bold uppercase text-[9px]">Статус</span><div class="font-bold">${_escape(String(defect.status || 'open'))}</div></div>
      <div class="col-span-2"><span class="text-slate-400 font-bold uppercase text-[9px]">Подрядчик</span><div class="font-bold">${_escape(contractorLabel)}</div></div>
    </div>
    <div class="flex gap-2 justify-between">
      <button type="button" data-c2-defect-delete class="px-3 py-2 rounded-xl text-[11px] font-bold uppercase text-red-600 border border-red-200">Удалить</button>
      <button type="button" data-c2-defect-close class="px-3 py-2 rounded-xl text-[11px] font-bold uppercase text-slate-500">Закрыть</button>
    </div>`;

  root.classList.remove('hidden');
  root.classList.add('flex');

  panel.querySelectorAll('[data-c2-defect-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeDefectForm());
  });
  panel.querySelector('[data-c2-defect-delete]')?.addEventListener('click', async () => {
    if (!confirm('Удалить замечание?')) return;
    try {
      await onDelete(defect.id);
      closeDefectForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.showToast?.('❌ ' + (msg));
    }
  });
}
