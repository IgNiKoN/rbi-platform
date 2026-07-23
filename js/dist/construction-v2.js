const ConstructionV2Manifest = {
  id: "construction-v2",
  role: "module",
  title: "Стройконтроль (новый)",
  icon: "hard-hat",
  version: "0.1.0",
  status: "active",
  entry: "./index.js",
  menu: { section: "construction", label: "СК (новый)", order: 11 },
  company: { enabledByDefault: true },
  routes: ["/construction-v2", "/construction-v2/:subTab"],
  defaultRoute: "/construction-v2"
};
function _pdfjs() {
  return window.pdfjsLib || null;
}
function _pinBg(category, status) {
  const st = String(status || "").toLowerCase();
  if (st === "closed" || st === "fixed") return "bg-green-500";
  const c = String(category || "").toLowerCase();
  if (c === "critical" || c === "b3") return "bg-red-600";
  if (c === "major" || c === "b2") return "bg-orange-500";
  return "bg-blue-500";
}
function _escapeAttr(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
class PlanViewer {
  constructor(host, handlers = {}) {
    this.wrap = null;
    this.stage = null;
    this.canvas = null;
    this.pins = null;
    this.addMode = false;
    this.destroyed = false;
    this.pdfUrl = "";
    this.host = host;
    this.handlers = handlers;
  }
  setAddMode(on) {
    this.addMode = !!on;
    if (this.wrap) {
      this.wrap.classList.toggle("cursor-crosshair", this.addMode);
      this.wrap.classList.toggle("cursor-default", !this.addMode);
    }
  }
  isAddMode() {
    return this.addMode;
  }
  destroy() {
    this.destroyed = true;
    this.host.innerHTML = "";
    this.wrap = null;
    this.stage = null;
    this.canvas = null;
    this.pins = null;
  }
  async load(pdfUrl) {
    var _a;
    this.pdfUrl = pdfUrl;
    this.destroyed = false;
    this.host.innerHTML = `
      <div class="absolute inset-0 overflow-auto bg-slate-200 dark:bg-slate-900" data-c2-plan-wrap>
        <div class="relative mx-auto my-2 shadow-lg bg-white" data-c2-plan-stage style="width:fit-content">
          <canvas data-c2-plan-canvas class="block max-w-none"></canvas>
          <div data-c2-plan-pins class="absolute inset-0 pointer-events-none"></div>
        </div>
      </div>
      <div data-c2-plan-loader class="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Загрузка плана…
      </div>`;
    this.wrap = this.host.querySelector("[data-c2-plan-wrap]");
    this.stage = this.host.querySelector("[data-c2-plan-stage]");
    this.canvas = this.host.querySelector("[data-c2-plan-canvas]");
    this.pins = this.host.querySelector("[data-c2-plan-pins]");
    const loader = this.host.querySelector("[data-c2-plan-loader]");
    if (!this.canvas || !this.stage || !this.wrap) throw new Error("plan-viewer DOM broken");
    this.wrap.addEventListener("click", (ev) => this._onClick(ev));
    const pdfjs = _pdfjs();
    if (!(pdfjs == null ? void 0 : pdfjs.getDocument)) throw new Error("pdfjsLib недоступен");
    let buf = null;
    if ((_a = window.PhotoManager) == null ? void 0 : _a.getAsyncUrl) {
      try {
        const cached = await window.PhotoManager.getAsyncUrl(pdfUrl);
        if (cached && cached.startsWith("blob:")) {
          const res = await fetch(cached);
          buf = await res.arrayBuffer();
        }
      } catch {
      }
    }
    if (!buf) {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Не удалось скачать PDF");
      buf = await res.arrayBuffer();
    }
    if (this.destroyed) return;
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const hostW = Math.max(this.host.clientWidth || 640, 320);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, Math.max(1.1, (hostW - 24) / base.width));
    const viewport = page.getViewport({ scale });
    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    this.stage.style.width = `${viewport.width}px`;
    this.stage.style.height = `${viewport.height}px`;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d недоступен");
    await page.render({ canvasContext: ctx, viewport }).promise;
    if (loader) loader.remove();
    this.setAddMode(this.addMode);
  }
  setMarkers(defects) {
    if (!this.pins) return;
    const html = defects.map((d, i) => {
      const x = Number(d.x);
      const y = Number(d.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
      const bg = _pinBg(String(d.category), String(d.status));
      const title = _escapeAttr(String(d.description || "").slice(0, 80));
      const num = i + 1;
      return `<button type="button" data-c2-pin="${_escapeAttr(d.id)}"
          class="absolute w-6 h-6 ${bg} rounded-full border-2 border-white shadow-md
                 flex items-center justify-center text-white text-[10px] font-black
                 cursor-pointer hover:scale-125 transition-transform z-20
                 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style="left:${x}%;top:${y}%;" title="${title}">${num}</button>`;
    }).join("");
    this.pins.innerHTML = html;
  }
  /** Временный пин «+» в режиме выдачи — как legacy drawTempPin. */
  drawTempPin(xPercent, yPercent) {
    if (!this.pins) return;
    this.clearTempPin();
    this.pins.insertAdjacentHTML(
      "beforeend",
      `<div id="c2-temp-pin"
        class="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg
               flex items-center justify-center text-white text-[10px] font-black z-30
               transform -translate-x-1/2 -translate-y-1/2 animate-bounce pointer-events-none"
        style="left:${xPercent}%;top:${yPercent}%;">+</div>`
    );
  }
  clearTempPin() {
    var _a, _b;
    (_b = (_a = this.pins) == null ? void 0 : _a.querySelector("#c2-temp-pin")) == null ? void 0 : _b.remove();
  }
  _onClick(ev) {
    var _a, _b, _c, _d, _e;
    const t = ev.target;
    const pin = (_a = t == null ? void 0 : t.closest) == null ? void 0 : _a.call(t, "[data-c2-pin]");
    if (pin) {
      const id = pin.getAttribute("data-c2-pin");
      if (id) (_c = (_b = this.handlers).onMarkerClick) == null ? void 0 : _c.call(_b, id);
      return;
    }
    if (!this.addMode || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPercent = (ev.clientX - rect.left) / rect.width * 100;
    const yPercent = (ev.clientY - rect.top) / rect.height * 100;
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;
    (_e = (_d = this.handlers).onPlanClick) == null ? void 0 : _e.call(_d, xPercent, yPercent);
  }
  getPdfUrl() {
    return this.pdfUrl;
  }
}
const DEFECT_CATEGORIES_V2 = ["critical", "major", "minor"];
function _escape$1(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function _contractors() {
  var _a, _b;
  const svc = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.contractors;
  const rows = typeof (svc == null ? void 0 : svc.list) === "function" ? svc.list() : [];
  return (rows || []).filter((r) => r && r.id).map((r) => ({
    id: String(r.id),
    label: String(r.display_name || r.displayName || r.id)
  })).sort((a, b) => a.label.localeCompare(b.label, "ru"));
}
function _catLabel(c) {
  if (c === "critical") return "Критичный";
  if (c === "minor") return "Незначительный";
  return "Существенный";
}
function _ensureOverlay() {
  let el = document.getElementById("c2-defect-modal");
  if (el) return el;
  el = document.createElement("div");
  el.id = "c2-defect-modal";
  el.className = "fixed inset-0 z-[600] hidden items-center justify-center bg-black/40 p-3";
  el.innerHTML = `<div class="w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-xl p-4" data-c2-defect-panel></div>`;
  document.body.appendChild(el);
  return el;
}
function closeDefectForm() {
  const el = document.getElementById("c2-defect-modal");
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
}
function openCreateDefectForm(coords, onSave, onCancel) {
  var _a;
  const root = _ensureOverlay();
  const panel = root.querySelector("[data-c2-defect-panel]");
  const opts = _contractors();
  const catOpts = DEFECT_CATEGORIES_V2.map(
    (c) => `<option value="${c}">${_escape$1(_catLabel(c))}</option>`
  ).join("");
  const contractorOpts = `<option value="">— без подрядчика —</option>` + opts.map((o) => `<option value="${_escape$1(o.id)}">${_escape$1(o.label)}</option>`).join("");
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
  root.classList.remove("hidden");
  root.classList.add("flex");
  const cancel = () => {
    closeDefectForm();
    onCancel == null ? void 0 : onCancel();
  };
  panel.querySelectorAll("[data-c2-defect-close]").forEach((btn) => {
    btn.addEventListener("click", cancel);
  });
  root.onclick = (ev) => {
    if (ev.target === root) cancel();
  };
  (_a = panel.querySelector("[data-c2-defect-save]")) == null ? void 0 : _a.addEventListener("click", async () => {
    var _a2, _b, _c, _d, _e, _f;
    const desc = ((_b = (_a2 = panel.querySelector("[data-c2-defect-desc]")) == null ? void 0 : _a2.value) == null ? void 0 : _b.trim()) || "";
    if (!desc) {
      (_c = window.showToast) == null ? void 0 : _c.call(window, "Укажите описание замечания");
      return;
    }
    const category = ((_d = panel.querySelector("[data-c2-defect-cat]")) == null ? void 0 : _d.value) || "major";
    const contractorId = ((_e = panel.querySelector("[data-c2-defect-contractor]")) == null ? void 0 : _e.value) || "";
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
      (_f = window.showToast) == null ? void 0 : _f.call(window, "❌ " + msg);
    }
  });
}
function openViewDefectForm(defect, onDelete) {
  var _a;
  const root = _ensureOverlay();
  const panel = root.querySelector("[data-c2-defect-panel]");
  const contractorLabel = (() => {
    if (!defect.contractorId) return "—";
    const found = _contractors().find((c) => c.id === defect.contractorId);
    return (found == null ? void 0 : found.label) || defect.contractorId;
  })();
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[13px] font-black uppercase tracking-tight">Замечание</h3>
      <button type="button" data-c2-defect-close class="text-slate-400 text-[11px] font-bold uppercase">Закрыть</button>
    </div>
    <p class="text-[10px] text-slate-400 mb-2">Координаты: ${Number(defect.x).toFixed(1)}% × ${Number(defect.y).toFixed(1)}%</p>
    <div class="text-[12px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap mb-3">${_escape$1(defect.description)}</div>
    <div class="grid grid-cols-2 gap-2 text-[11px] mb-4">
      <div><span class="text-slate-400 font-bold uppercase text-[9px]">Категория</span><div class="font-bold">${_escape$1(_catLabel(String(defect.category)))}</div></div>
      <div><span class="text-slate-400 font-bold uppercase text-[9px]">Статус</span><div class="font-bold">${_escape$1(String(defect.status || "open"))}</div></div>
      <div class="col-span-2"><span class="text-slate-400 font-bold uppercase text-[9px]">Подрядчик</span><div class="font-bold">${_escape$1(contractorLabel)}</div></div>
    </div>
    <div class="flex gap-2 justify-between">
      <button type="button" data-c2-defect-delete class="px-3 py-2 rounded-xl text-[11px] font-bold uppercase text-red-600 border border-red-200">Удалить</button>
      <button type="button" data-c2-defect-close class="px-3 py-2 rounded-xl text-[11px] font-bold uppercase text-slate-500">Закрыть</button>
    </div>`;
  root.classList.remove("hidden");
  root.classList.add("flex");
  panel.querySelectorAll("[data-c2-defect-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeDefectForm());
  });
  (_a = panel.querySelector("[data-c2-defect-delete]")) == null ? void 0 : _a.addEventListener("click", async () => {
    var _a2;
    if (!confirm("Удалить замечание?")) return;
    try {
      await onDelete(defect.id);
      closeDefectForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "❌ " + msg);
    }
  });
}
function _loc() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations) || null;
}
function _defects() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.constructionDefects) || null;
}
function _escape(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
let _selectedFloorId = null;
let _bound = false;
let _viewer = null;
let _addMode = false;
let _mountedPdfUrl = null;
function _root() {
  return document.getElementById("construction-v2-root");
}
function _renderTree(svc) {
  const objects = svc.listNodes({ nodeType: "object", parentId: null });
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
          const active = _selectedFloorId === fl.id ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800" : "hover:bg-slate-100 dark:hover:bg-slate-800";
          const mark = (plan == null ? void 0 : plan.pdf_url) ? "📄" : "⚠️";
          html += `<li>
            <button type="button" data-c2-floor="${_escape(fl.id)}"
              class="w-full text-left px-2 py-1 rounded-lg ${active} transition-colors">
              ${mark} ${_escape(fl.displayName)}
            </button>
          </li>`;
        }
        html += "</ul></li>";
      }
      html += "</ul></li>";
    }
    html += "</ul></li>";
  }
  html += "</ul>";
  return html;
}
function _renderPlanChrome(svc) {
  if (!_selectedFloorId) {
    return `<div class="flex items-center justify-center h-full min-h-[240px] text-slate-400 text-[11px] font-bold uppercase tracking-widest">
      Выберите этаж слева
    </div>`;
  }
  const floor = svc.getNode(_selectedFloorId);
  const plan = svc.getPlanForFloor(_selectedFloorId);
  const path = svc.getPath(_selectedFloorId).map((n) => n.displayName).join(" / ");
  if (!(plan == null ? void 0 : plan.pdf_url)) {
    return `<div class="p-6">
      <div class="text-[11px] font-bold text-slate-500 mb-2">${_escape(path)}</div>
      <div class="text-amber-600 font-black text-[12px] uppercase">Нет PDF-плана на этом этаже</div>
      <p class="text-[11px] text-slate-500 mt-2">Загрузите план в Настройках → «Объекты и планы».</p>
    </div>`;
  }
  const addCls = _addMode ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-indigo-600 border-indigo-200";
  return `<div class="flex flex-col h-full min-h-[320px]">
    <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
      <div class="text-[11px] font-bold text-slate-600 min-w-0">
        ${_escape(path || (floor == null ? void 0 : floor.displayName) || "")}
        <span class="ml-2 text-slate-400 font-normal">${_escape(plan.pdf_name || "")}</span>
      </div>
      <button type="button" data-c2-add-mode
        class="shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase ${addCls}">
        ${_addMode ? "Кликни на план…" : "+ Замечание"}
      </button>
    </div>
    <div class="flex-1 relative bg-slate-100 dark:bg-slate-900 min-h-[280px]" id="c2-plan-host"></div>
    <div class="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-2">
      <span>Клик по маркеру — просмотр / удаление. Режим «+ Замечание» — клик по плану.</span>
      <span id="c2-defect-count"></span>
    </div>
  </div>`;
}
async function _mountViewerIfNeeded(svc) {
  const host = document.getElementById("c2-plan-host");
  if (!host || !_selectedFloorId) {
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }
  const plan = svc.getPlanForFloor(_selectedFloorId);
  if (!(plan == null ? void 0 : plan.pdf_url)) {
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = null;
    _mountedPdfUrl = null;
    return;
  }
  const needReload = !_viewer || _mountedPdfUrl !== plan.pdf_url;
  if (needReload) {
    _viewer == null ? void 0 : _viewer.destroy();
    _viewer = new PlanViewer(host, {
      onPlanClick: (x, y) => {
        var _a;
        if (!_selectedFloorId) return;
        const dSvc = _defects();
        if (!dSvc) {
          (_a = window.showToast) == null ? void 0 : _a.call(window, "service.constructionDefects не загружен");
          return;
        }
        _viewer == null ? void 0 : _viewer.drawTempPin(x, y);
        openCreateDefectForm(
          { locationId: _selectedFloorId, x, y },
          async (input) => {
            var _a2;
            await dSvc.create(input);
            _addMode = false;
            _viewer == null ? void 0 : _viewer.setAddMode(false);
            _viewer == null ? void 0 : _viewer.clearTempPin();
            (_a2 = window.showToast) == null ? void 0 : _a2.call(window, "Замечание сохранено");
            await _refreshMarkersOnly();
            const addBtn = document.querySelector("[data-c2-add-mode]");
            if (addBtn) {
              addBtn.textContent = "+ Замечание";
              addBtn.className = "shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200";
            }
          },
          () => _viewer == null ? void 0 : _viewer.clearTempPin()
        );
      },
      onMarkerClick: (id) => {
        const dSvc = _defects();
        const d = dSvc == null ? void 0 : dSvc.get(id);
        if (!d || !dSvc) return;
        openViewDefectForm(d, async (defectId) => {
          var _a;
          await dSvc.softDelete(defectId);
          (_a = window.showToast) == null ? void 0 : _a.call(window, "Замечание удалено");
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
async function _refreshMarkersOnly() {
  const dSvc = _defects();
  if (!_viewer || !_selectedFloorId || !dSvc) return;
  await dSvc.init();
  const list = dSvc.listForFloor(_selectedFloorId);
  _viewer.setMarkers(list);
  const countEl = document.getElementById("c2-defect-count");
  if (countEl) countEl.textContent = `Замечаний: ${list.length}`;
}
async function renderConstructionV2() {
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
  const prevFloor = _selectedFloorId;
  _viewer == null ? void 0 : _viewer.destroy();
  _viewer = null;
  _mountedPdfUrl = null;
  root.innerHTML = `
    <div class="flex flex-col md:flex-row gap-3 h-full min-h-[420px]">
      <aside class="md:w-72 shrink-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 overflow-y-auto max-h-[70vh]">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Иерархия (v2)</div>
        <div id="c2-tree">${_renderTree(svc)}</div>
        ${!dSvc ? `<div class="mt-3 text-[10px] text-amber-600 font-bold">constructionDefects не загружен</div>` : ""}
      </aside>
      <main class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative" id="c2-plan">
        ${_renderPlanChrome(svc)}
      </main>
    </div>`;
  _bindOnce();
  if (prevFloor) _selectedFloorId = prevFloor;
  await _mountViewerIfNeeded(svc);
}
function _bindOnce() {
  if (_bound) return;
  _bound = true;
  document.addEventListener(
    "click",
    (ev) => {
      var _a, _b;
      const t = ev.target;
      const floorBtn = (_a = t == null ? void 0 : t.closest) == null ? void 0 : _a.call(t, "[data-c2-floor]");
      if (floorBtn) {
        const id = floorBtn.getAttribute("data-c2-floor");
        if (!id) return;
        _selectedFloorId = id;
        _addMode = false;
        renderConstructionV2().catch((e) => console.warn("[construction-v2] render", e));
        return;
      }
      const addBtn = (_b = t == null ? void 0 : t.closest) == null ? void 0 : _b.call(t, "[data-c2-add-mode]");
      if (addBtn) {
        _addMode = !_addMode;
        _viewer == null ? void 0 : _viewer.setAddMode(_addMode);
        addBtn.textContent = _addMode ? "Кликни на план…" : "+ Замечание";
        addBtn.className = _addMode ? "shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-indigo-600 text-white border-indigo-600" : "shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-transparent text-indigo-600 border-indigo-200";
      }
    },
    true
  );
}
function mountConstructionV2Shell() {
  var _a, _b, _c, _d;
  const content = ((_d = (_c = (_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.shell) == null ? void 0 : _c.getContentRoot) == null ? void 0 : _d.call(_c)) || document.getElementById("app-content") || document.getElementById("app-root");
  if (!content) return;
  if (document.getElementById("tab-construction-v2")) return;
  const section = document.createElement("div");
  section.id = "tab-construction-v2";
  section.className = "view-section hidden";
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
async function refreshConstructionV2Markers() {
  const tab = document.getElementById("tab-construction-v2");
  if (!tab || tab.classList.contains("hidden")) return;
  await _refreshMarkersOnly();
}
let _inited = false;
async function init(_ctx) {
  var _a, _b, _c, _d, _e, _f;
  if (_inited) {
    await renderConstructionV2();
    return { ok: true, reentered: true };
  }
  mountConstructionV2Shell();
  await renderConstructionV2();
  (_c = (_b = (_a = window.RBI) == null ? void 0 : _a.events) == null ? void 0 : _b.on) == null ? void 0 : _c.call(_b, "locations:changed", () => {
    const tab = document.getElementById("tab-construction-v2");
    if (tab && !tab.classList.contains("hidden")) {
      renderConstructionV2().catch(() => {
      });
    }
  });
  (_f = (_e = (_d = window.RBI) == null ? void 0 : _d.events) == null ? void 0 : _e.on) == null ? void 0 : _f.call(_e, "construction-defects:changed", () => {
    refreshConstructionV2Markers().catch(() => {
    });
  });
  _registerAppRouter();
  if ((location.hash || "").replace(/^#/, "").startsWith("/construction-v2")) {
    showTab();
  }
  _inited = true;
  console.info("[construction-v2] init ok");
  return { ok: true };
}
function showTab() {
  document.querySelectorAll(".view-section").forEach((el) => {
    el.classList.remove("active");
  });
  const tab = document.getElementById("tab-construction-v2");
  if (tab) {
    tab.classList.remove("hidden");
    tab.classList.add("active");
  }
  const header = document.getElementById("main-header");
  if (header) header.style.display = "none";
  const navEl = document.getElementById("main-bottom-nav");
  if (navEl) navEl.style.display = "none";
  if (typeof window.updateBodyPadding === "function") {
    setTimeout(() => {
      var _a;
      return (_a = window.updateBodyPadding) == null ? void 0 : _a.call(window);
    }, 50);
  }
  renderConstructionV2().catch(() => {
  });
}
function _registerAppRouter() {
  const router = window.AppRouter;
  if (router && typeof router.addRoute === "function") {
    router.addRoute("#/construction-v2", () => showTab());
  }
}
function registerModule() {
  var _a;
  window.RBI = window.RBI || { services: {} };
  const mod = { init, showTab, manifest: ConstructionV2Manifest, render: renderConstructionV2 };
  if ((_a = window.RBI.registry) == null ? void 0 : _a.register) {
    window.RBI.registry.register("module.construction-v2", mod);
  }
  window.ConstructionV2Module = mod;
  _registerAppRouter();
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace(/^#/, "");
    if (h.startsWith("/construction-v2")) showTab();
  });
  if ((location.hash || "").replace(/^#/, "").startsWith("/construction-v2")) {
    setTimeout(() => showTab(), 0);
  }
}
registerModule();
const index = { init, showTab, manifest: ConstructionV2Manifest };
export {
  ConstructionV2Manifest,
  index as default,
  init,
  showTab
};
//# sourceMappingURL=construction-v2.js.map
