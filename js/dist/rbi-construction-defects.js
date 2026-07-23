const DEFECT_CATEGORIES_V2 = ["critical", "major", "minor"];
let _items = [];
let _ready = false;
function _storage() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.storage) || null;
}
function _stores() {
  var _a;
  const s = _storage();
  const fromSvc = (_a = s == null ? void 0 : s.stores) == null ? void 0 : _a.call(s);
  if (fromSvc && fromSvc.CONST_DEFECTS_V2) return fromSvc;
  return window.STORES || {};
}
function _events() {
  var _a;
  return (_a = window.RBI) == null ? void 0 : _a.events;
}
function _now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function _uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cdef_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function _active() {
  return _items.filter((d) => d && !d.is_deleted && !d._deleted);
}
function _emit(extra) {
  var _a, _b;
  (_b = (_a = _events()) == null ? void 0 : _a.emit) == null ? void 0 : _b.call(_a, "construction-defects:changed", extra || {});
}
function _markDirty() {
  var _a, _b;
  const sync = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.sync;
  if (sync == null ? void 0 : sync.markDirty) {
    sync.markDirty(["constructionDefects"]);
  }
  if (typeof window.triggerSync === "function") {
    window.triggerSync("silent");
  }
}
function _clampPct(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
async function _persist(item) {
  const storage = _storage();
  const stores = _stores();
  if (!storage || !stores.CONST_DEFECTS_V2) {
    throw new Error("storage CONST_DEFECTS_V2 недоступен");
  }
  await storage.put(stores.CONST_DEFECTS_V2, item);
  const idx = _items.findIndex((d) => d.id === item.id);
  if (idx >= 0) _items[idx] = item;
  else _items.push(item);
}
const ConstructionDefectsService = {
  async init() {
    const storage = _storage();
    const stores = _stores();
    if (!storage || !stores.CONST_DEFECTS_V2) {
      console.warn("[constructionDefects] storage not ready");
      return false;
    }
    try {
      const rows = await storage.getAll(stores.CONST_DEFECTS_V2);
      _items = Array.isArray(rows) ? rows : [];
      _ready = true;
      return true;
    } catch (e) {
      console.error("[constructionDefects] init failed", e);
      return false;
    }
  },
  isReady() {
    return _ready;
  },
  /** Подмена in-memory после pull sync. */
  replaceCache(items) {
    _items = Array.isArray(items) ? items.slice() : [];
    _ready = true;
    _emit({ reason: "replaceCache" });
  },
  list(opts) {
    let list = (opts == null ? void 0 : opts.includeDeleted) ? _items.slice() : _active();
    if (opts == null ? void 0 : opts.locationId) {
      list = list.filter((d) => d.locationId === opts.locationId);
    }
    return list.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  },
  get(id) {
    return _active().find((d) => d.id === id) || null;
  },
  listForFloor(locationId) {
    return this.list({ locationId });
  },
  async create(input) {
    var _a;
    const locationId = String(input.locationId || "").trim();
    if (!locationId) throw new Error("locationId обязателен");
    const description = String(input.description || "").trim();
    if (!description) throw new Error("description обязателен");
    let category = String(input.category || "major").toLowerCase();
    if (!DEFECT_CATEGORIES_V2.includes(category)) {
      category = "major";
    }
    const item = {
      id: _uuid(),
      companyId: "rbi",
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
      status: input.status || "open",
      history: [],
      created_by: ((_a = window.syncConfig) == null ? void 0 : _a.engineerName) || "",
      is_deleted: false,
      deleted_at: null,
      created_at: _now(),
      updated_at: _now(),
      version: 1,
      syncStatus: "not_synced",
      source: "local"
    };
    await _persist(item);
    _markDirty();
    _emit({ reason: "create", id: item.id, locationId });
    return item;
  },
  async update(id, patch) {
    const cur = _items.find((d) => d.id === id);
    if (!cur || cur.is_deleted || cur._deleted) throw new Error("Замечание не найдено");
    let category = patch.category != null ? String(patch.category).toLowerCase() : cur.category;
    if (patch.category != null && !DEFECT_CATEGORIES_V2.includes(category)) {
      category = cur.category;
    }
    const description = patch.description != null ? String(patch.description).trim() || cur.description : cur.description;
    const next = {
      ...cur,
      description,
      text: description,
      category,
      contractorId: patch.contractorId !== void 0 ? patch.contractorId : cur.contractorId,
      status: patch.status != null ? String(patch.status) : cur.status,
      x: patch.x != null ? _clampPct(Number(patch.x)) : cur.x,
      y: patch.y != null ? _clampPct(Number(patch.y)) : cur.y,
      updated_at: _now(),
      version: (cur.version || 1) + 1,
      syncStatus: "not_synced",
      source: "local"
    };
    await _persist(next);
    _markDirty();
    _emit({ reason: "update", id, locationId: next.locationId });
    return next;
  },
  async softDelete(id) {
    const cur = _items.find((d) => d.id === id);
    if (!cur) throw new Error("Замечание не найдено");
    const next = {
      ...cur,
      is_deleted: true,
      _deleted: true,
      deleted_at: _now(),
      updated_at: _now(),
      version: (cur.version || 1) + 1,
      syncStatus: "not_synced",
      source: "local"
    };
    await _persist(next);
    _markDirty();
    _emit({ reason: "softDelete", id, locationId: next.locationId });
    return next;
  }
};
function register() {
  window.RBI = window.RBI || { services: {} };
  window.RBI.services = window.RBI.services || {};
  window.RBI.services.constructionDefects = ConstructionDefectsService;
  if (window.RBI.registry && typeof window.RBI.registry.register === "function") {
    window.RBI.registry.register("service.constructionDefects", ConstructionDefectsService);
  }
  const tryInit = () => {
    var _a, _b;
    if ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.storage) {
      ConstructionDefectsService.init().catch((e) => console.warn("[constructionDefects] init", e));
      return true;
    }
    return false;
  };
  if (!tryInit()) {
    document.addEventListener("DOMContentLoaded", () => {
      if (!tryInit()) {
        setTimeout(() => tryInit(), 500);
        setTimeout(() => tryInit(), 2e3);
      }
    });
  }
  console.info("[constructionDefects] service.constructionDefects registered");
}
register();
export {
  ConstructionDefectsService
};
//# sourceMappingURL=rbi-construction-defects.js.map
