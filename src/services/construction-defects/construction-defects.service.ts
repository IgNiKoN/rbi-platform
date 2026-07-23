/**
 * service.constructionDefects — замечания construction-v2 на координатах плана.
 * Не использует ConstManager / legacy construction_defects.
 */

import type { ConstructionDefectV2, DefectCategoryV2 } from './types';
import { DEFECT_CATEGORIES_V2 } from './types';

let _items: ConstructionDefectV2[] = [];
let _ready = false;

function _storage() {
  return window.RBI?.services?.storage || null;
}

function _stores() {
  const s = _storage();
  const fromSvc = s?.stores?.();
  if (fromSvc && fromSvc.CONST_DEFECTS_V2) return fromSvc;
  return (window.STORES || {}) as Record<string, string>;
}

function _events() {
  return window.RBI?.events;
}

function _now() {
  return new Date().toISOString();
}

function _uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cdef_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function _active() {
  return _items.filter((d) => d && !d.is_deleted && !d._deleted);
}

function _emit(extra?: Record<string, unknown>) {
  _events()?.emit?.('construction-defects:changed', extra || {});
}

function _markDirty() {
  const sync = window.RBI?.services?.sync as { markDirty?: (k: string | string[]) => void } | undefined;
  if (sync?.markDirty) {
    sync.markDirty(['constructionDefects']);
  }
  if (typeof window.triggerSync === 'function') {
    window.triggerSync('silent');
  }
}

function _clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

async function _persist(item: ConstructionDefectV2) {
  const storage = _storage();
  const stores = _stores();
  if (!storage || !stores.CONST_DEFECTS_V2) {
    throw new Error('storage CONST_DEFECTS_V2 недоступен');
  }
  await storage.put(stores.CONST_DEFECTS_V2, item);
  const idx = _items.findIndex((d) => d.id === item.id);
  if (idx >= 0) _items[idx] = item;
  else _items.push(item);
}

export const ConstructionDefectsService = {
  async init(): Promise<boolean> {
    const storage = _storage();
    const stores = _stores();
    if (!storage || !stores.CONST_DEFECTS_V2) {
      console.warn('[constructionDefects] storage not ready');
      return false;
    }
    try {
      const rows = (await storage.getAll(stores.CONST_DEFECTS_V2)) as ConstructionDefectV2[];
      _items = Array.isArray(rows) ? rows : [];
      _ready = true;
      return true;
    } catch (e) {
      console.error('[constructionDefects] init failed', e);
      return false;
    }
  },

  isReady(): boolean {
    return _ready;
  },

  /** Подмена in-memory после pull sync. */
  replaceCache(items: ConstructionDefectV2[]) {
    _items = Array.isArray(items) ? items.slice() : [];
    _ready = true;
    _emit({ reason: 'replaceCache' });
  },

  list(opts?: { locationId?: string; includeDeleted?: boolean }): ConstructionDefectV2[] {
    let list = opts?.includeDeleted ? _items.slice() : _active();
    if (opts?.locationId) {
      list = list.filter((d) => d.locationId === opts.locationId);
    }
    return list.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  },

  get(id: string): ConstructionDefectV2 | null {
    return _active().find((d) => d.id === id) || null;
  },

  listForFloor(locationId: string): ConstructionDefectV2[] {
    return this.list({ locationId });
  },

  async create(input: {
    locationId: string;
    x: number;
    y: number;
    description: string;
    category?: DefectCategoryV2 | string;
    contractorId?: string | null;
    status?: string;
  }): Promise<ConstructionDefectV2> {
    const locationId = String(input.locationId || '').trim();
    if (!locationId) throw new Error('locationId обязателен');
    const description = String(input.description || '').trim();
    if (!description) throw new Error('description обязателен');

    let category = String(input.category || 'major').toLowerCase();
    if (!DEFECT_CATEGORIES_V2.includes(category as DefectCategoryV2)) {
      category = 'major';
    }

    const item: ConstructionDefectV2 = {
      id: _uuid(),
      companyId: 'rbi',
      locationId,
      x: _clampPct(Number(input.x)),
      y: _clampPct(Number(input.y)),
      template_key: null,
      item_id: null,
      item_name: null,
      norm_text: null,
      text: description,
      category,
      deadline: null,
      contractorId: input.contractorId || null,
      description,
      photo: null,
      status: input.status || 'open',
      history: [],
      created_by: window.syncConfig?.engineerName || '',
      is_deleted: false,
      deleted_at: null,
      created_at: _now(),
      updated_at: _now(),
      version: 1,
      syncStatus: 'not_synced',
      source: 'local'
    };
    await _persist(item);
    _markDirty();
    _emit({ reason: 'create', id: item.id, locationId });
    return item;
  },

  async update(
    id: string,
    patch: Partial<Pick<ConstructionDefectV2, 'description' | 'category' | 'contractorId' | 'status' | 'x' | 'y'>>
  ): Promise<ConstructionDefectV2> {
    const cur = _items.find((d) => d.id === id);
    if (!cur || cur.is_deleted || cur._deleted) throw new Error('Замечание не найдено');

    let category = patch.category != null ? String(patch.category).toLowerCase() : cur.category;
    if (patch.category != null && !DEFECT_CATEGORIES_V2.includes(category as DefectCategoryV2)) {
      category = cur.category;
    }

    const description =
      patch.description != null ? String(patch.description).trim() || cur.description : cur.description;

    const next: ConstructionDefectV2 = {
      ...cur,
      description,
      text: description,
      category,
      contractorId: patch.contractorId !== undefined ? patch.contractorId : cur.contractorId,
      status: patch.status != null ? String(patch.status) : cur.status,
      x: patch.x != null ? _clampPct(Number(patch.x)) : cur.x,
      y: patch.y != null ? _clampPct(Number(patch.y)) : cur.y,
      updated_at: _now(),
      version: (cur.version || 1) + 1,
      syncStatus: 'not_synced',
      source: 'local'
    };
    await _persist(next);
    _markDirty();
    _emit({ reason: 'update', id, locationId: next.locationId });
    return next;
  },

  async softDelete(id: string): Promise<ConstructionDefectV2> {
    const cur = _items.find((d) => d.id === id);
    if (!cur) throw new Error('Замечание не найдено');
    const next: ConstructionDefectV2 = {
      ...cur,
      is_deleted: true,
      _deleted: true,
      deleted_at: _now(),
      updated_at: _now(),
      version: (cur.version || 1) + 1,
      syncStatus: 'not_synced',
      source: 'local'
    };
    await _persist(next);
    _markDirty();
    _emit({ reason: 'softDelete', id, locationId: next.locationId });
    return next;
  }
};

export type ConstructionDefectsServiceApi = typeof ConstructionDefectsService;
