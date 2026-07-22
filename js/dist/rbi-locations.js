const NODE_TYPES = ["object", "building", "section", "floor"];
const CHILD_OF = {
  object: null,
  building: "object",
  section: "building",
  floor: "section"
};
let _nodes = [];
let _plans = [];
let _ready = false;
function _storage() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.storage) || null;
}
function _stores() {
  var _a;
  const s = _storage();
  const fromSvc = (_a = s == null ? void 0 : s.stores) == null ? void 0 : _a.call(s);
  if (fromSvc && fromSvc.LOCATION_NODES) return fromSvc;
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
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function _activeNodes() {
  return _nodes.filter((n) => n && !n.is_deleted && !n._deleted);
}
function _activePlans() {
  return _plans.filter((p) => p && !p.is_deleted && !p._deleted);
}
function _emit(extra) {
  var _a, _b;
  (_b = (_a = _events()) == null ? void 0 : _a.emit) == null ? void 0 : _b.call(_a, "locations:changed", extra || {});
}
function _markDirty() {
  var _a, _b;
  const sync = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.sync;
  if (sync == null ? void 0 : sync.markDirty) {
    sync.markDirty(["locations"]);
  }
  if (typeof window.triggerSync === "function") {
    window.triggerSync("silent");
  }
}
function _assertParent(nodeType, parentId) {
  const expected = CHILD_OF[nodeType];
  if (expected === null) {
    if (parentId) throw new Error("object не должен иметь parentId");
    return;
  }
  if (!parentId) throw new Error(`${nodeType} требует parentId`);
  const parent = _activeNodes().find((n) => n.id === parentId);
  if (!parent) throw new Error("Родитель не найден");
  if (parent.nodeType !== expected) {
    throw new Error(`${nodeType} должен висеть на ${expected}, сейчас parent=${parent.nodeType}`);
  }
}
async function _persistNode(node) {
  const storage = _storage();
  const stores = _stores();
  if (!storage || !stores.LOCATION_NODES) throw new Error("storage LOCATION_NODES недоступен");
  await storage.put(stores.LOCATION_NODES, node);
  const idx = _nodes.findIndex((n) => n.id === node.id);
  if (idx >= 0) _nodes[idx] = node;
  else _nodes.push(node);
}
async function _persistPlan(plan) {
  const storage = _storage();
  const stores = _stores();
  if (!storage || !stores.CONST_FLOORS_V2) throw new Error("storage CONST_FLOORS_V2 недоступен");
  await storage.put(stores.CONST_FLOORS_V2, plan);
  const idx = _plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) _plans[idx] = plan;
  else _plans.push(plan);
}
const LocationsService = {
  async init() {
    const storage = _storage();
    const stores = _stores();
    if (!storage || !stores.LOCATION_NODES) {
      console.warn("[locations] storage not ready");
      return false;
    }
    try {
      const nodes = await storage.getAll(stores.LOCATION_NODES);
      const plans = stores.CONST_FLOORS_V2 ? await storage.getAll(stores.CONST_FLOORS_V2) : [];
      _nodes = Array.isArray(nodes) ? nodes : [];
      _plans = Array.isArray(plans) ? plans : [];
      _ready = true;
      return true;
    } catch (e) {
      console.error("[locations] init failed", e);
      return false;
    }
  },
  isReady() {
    return _ready;
  },
  /** Подмена in-memory после pull sync. */
  replaceCache(nodes, plans) {
    _nodes = Array.isArray(nodes) ? nodes.slice() : [];
    _plans = Array.isArray(plans) ? plans.slice() : [];
    _ready = true;
    _emit({ reason: "replaceCache" });
  },
  listNodes(opts) {
    let list = (opts == null ? void 0 : opts.includeDeleted) ? _nodes.slice() : _activeNodes();
    if (opts && "parentId" in (opts || {})) {
      const pid = opts.parentId ?? null;
      list = list.filter((n) => (n.parentId ?? null) === pid);
    }
    if (opts == null ? void 0 : opts.nodeType) list = list.filter((n) => n.nodeType === opts.nodeType);
    return list.slice().sort((a, b) => a.sort_order - b.sort_order || String(a.displayName).localeCompare(String(b.displayName), "ru"));
  },
  getNode(id) {
    return _activeNodes().find((n) => n.id === id) || null;
  },
  getChildren(parentId) {
    return this.listNodes({ parentId });
  },
  getPath(id) {
    const path = [];
    let cur = this.getNode(id);
    const guard = /* @__PURE__ */ new Set();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      path.unshift(cur);
      cur = cur.parentId ? this.getNode(cur.parentId) : null;
    }
    return path;
  },
  async createNode(input) {
    var _a;
    if (!NODE_TYPES.includes(input.nodeType)) throw new Error("Некорректный nodeType");
    const name = String(input.displayName || "").trim();
    if (!name) throw new Error("displayName обязателен");
    const parentId = input.parentId ?? null;
    _assertParent(input.nodeType, parentId);
    const siblings = this.listNodes({ parentId });
    const node = {
      id: _uuid(),
      companyId: "rbi",
      nodeType: input.nodeType,
      parentId,
      displayName: name,
      canonical_key: input.canonical_key || "",
      sort_order: input.sort_order != null ? input.sort_order : siblings.length + 1,
      synonyms: [],
      created_by: ((_a = window.syncConfig) == null ? void 0 : _a.engineerName) || "",
      is_deleted: false,
      deleted_at: null,
      created_at: _now(),
      updated_at: _now(),
      version: 1,
      syncStatus: "not_synced",
      source: "local"
    };
    await _persistNode(node);
    _markDirty();
    _emit({ reason: "create", id: node.id });
    return node;
  },
  async updateNode(id, patch) {
    const cur = _nodes.find((n) => n.id === id);
    if (!cur || cur.is_deleted || cur._deleted) throw new Error("Узел не найден");
    const next = {
      ...cur,
      displayName: patch.displayName != null ? String(patch.displayName).trim() || cur.displayName : cur.displayName,
      sort_order: patch.sort_order != null ? patch.sort_order : cur.sort_order,
      canonical_key: patch.canonical_key != null ? patch.canonical_key : cur.canonical_key,
      updated_at: _now(),
      version: (cur.version || 1) + 1,
      syncStatus: "not_synced",
      source: "local"
    };
    await _persistNode(next);
    _markDirty();
    _emit({ reason: "update", id });
    return next;
  },
  async softDeleteNode(id) {
    const cur = _nodes.find((n) => n.id === id);
    if (!cur) throw new Error("Узел не найден");
    const kids = this.getChildren(id);
    for (const k of kids) {
      await this.softDeleteNode(k.id);
    }
    if (cur.nodeType === "floor") {
      const plan = this.getPlanForFloor(id);
      if (plan) await this.softDeletePlan(plan.id);
    }
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
    await _persistNode(next);
    _markDirty();
    _emit({ reason: "softDelete", id });
    return next;
  },
  listPlans() {
    return _activePlans().slice();
  },
  getPlan(id) {
    return _activePlans().find((p) => p.id === id) || null;
  },
  getPlanForFloor(floorLocationId) {
    return _activePlans().find((p) => p.locationId === floorLocationId && p.is_active !== false) || null;
  },
  async attachPlan(input) {
    var _a;
    const floor = this.getNode(input.locationId);
    if (!floor || floor.nodeType !== "floor") throw new Error("План можно прикрепить только к floor");
    const url = String(input.pdf_url || "").trim();
    if (!url) throw new Error("pdf_url обязателен");
    const existing = this.getPlanForFloor(input.locationId);
    if (existing) {
      const next = {
        ...existing,
        pdf_url: url,
        pdf_name: input.pdf_name || existing.pdf_name || "",
        pdf_size: input.pdf_size || existing.pdf_size || "",
        name: input.name || existing.name || floor.displayName,
        is_active: true,
        updated_at: _now(),
        version: (existing.version || 1) + 1,
        syncStatus: "not_synced",
        source: "local"
      };
      await _persistPlan(next);
      _markDirty();
      _emit({ reason: "attachPlan", id: next.id });
      return next;
    }
    const plan = {
      id: _uuid(),
      companyId: "rbi",
      locationId: input.locationId,
      name: input.name || floor.displayName,
      sort_order: 1,
      pdf_url: url,
      pdf_name: input.pdf_name || "",
      pdf_size: input.pdf_size || "",
      is_active: true,
      created_by: ((_a = window.syncConfig) == null ? void 0 : _a.engineerName) || "",
      is_deleted: false,
      deleted_at: null,
      created_at: _now(),
      updated_at: _now(),
      version: 1,
      syncStatus: "not_synced",
      source: "local"
    };
    await _persistPlan(plan);
    _markDirty();
    _emit({ reason: "attachPlan", id: plan.id });
    return plan;
  },
  async softDeletePlan(id) {
    const cur = _plans.find((p) => p.id === id);
    if (!cur) throw new Error("План не найден");
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
    await _persistPlan(next);
    _markDirty();
    _emit({ reason: "softDeletePlan", id });
    return next;
  },
  /** Загрузка PDF в Supabase Storage (bucket custom-assets) + attachPlan. */
  async uploadFloorPdf(locationId, file) {
    var _a;
    const floor = this.getNode(locationId);
    if (!floor || floor.nodeType !== "floor") throw new Error("Нужен узел floor");
    const client = window.supabaseClient;
    if (!(client == null ? void 0 : client.storage)) throw new Error("supabaseClient недоступен (нужен онлайн для первой загрузки)");
    const safeName = `plan_${Date.now()}.pdf`;
    let path = `location_plans/${locationId}/${safeName}`;
    const sanitize = window.sanitizeStoragePath;
    if (typeof sanitize === "function") {
      path = sanitize(path);
    } else {
      path = path.replace(/[^a-zA-Z0-9.\-_/]/g, "_");
    }
    const { error } = await client.storage.from("custom-assets").upload(path, file, {
      upsert: true,
      contentType: file.type || "application/pdf"
    });
    if (error) throw new Error(error.message || "upload failed");
    const pub = client.storage.from("custom-assets").getPublicUrl(path);
    const publicUrl = ((_a = pub == null ? void 0 : pub.data) == null ? void 0 : _a.publicUrl) || "";
    if (!publicUrl) throw new Error("Не получен publicUrl");
    return this.attachPlan({
      locationId,
      pdf_url: publicUrl,
      pdf_name: file.name || safeName,
      pdf_size: String(file.size || ""),
      name: floor.displayName
    });
  }
};
function register() {
  window.RBI = window.RBI || { services: {} };
  window.RBI.services = window.RBI.services || {};
  window.RBI.services.locations = LocationsService;
  if (window.RBI.registry && typeof window.RBI.registry.register === "function") {
    window.RBI.registry.register("service.locations", LocationsService);
  }
  const tryInit = () => {
    var _a, _b;
    if ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.storage) {
      LocationsService.init().catch((e) => console.warn("[locations] init", e));
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
  console.info("[locations] service.locations registered");
}
register();
export {
  LocationsService
};
//# sourceMappingURL=rbi-locations.js.map
