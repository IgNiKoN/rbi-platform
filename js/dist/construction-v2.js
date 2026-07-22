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
function _svc() {
  var _a, _b;
  return ((_b = (_a = window.RBI) == null ? void 0 : _a.services) == null ? void 0 : _b.locations) || null;
}
function _escape(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
let _selectedFloorId = null;
let _bound = false;
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
function _renderPlanPane(svc) {
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
  return `<div class="flex flex-col h-full min-h-[320px]">
    <div class="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600">
      ${_escape(path || (floor == null ? void 0 : floor.displayName) || "")}
      <span class="ml-2 text-slate-400 font-normal">${_escape(plan.pdf_name || "")}</span>
    </div>
    <div class="flex-1 bg-slate-100 dark:bg-slate-900 relative">
      <iframe title="floor-plan" src="${_escape(plan.pdf_url)}"
        class="absolute inset-0 w-full h-full border-0"></iframe>
    </div>
    <div class="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700">
      Рабочий контур v2: просмотр плана. Выдача замечаний на координатах — следующий инкремент.
    </div>
  </div>`;
}
async function renderConstructionV2() {
  const root = _root();
  if (!root) return;
  const svc = _svc();
  if (!svc) {
    root.innerHTML = `<div class="p-6 text-red-500 text-[12px] font-bold">service.locations не загружен</div>`;
    return;
  }
  await svc.init();
  root.innerHTML = `
    <div class="flex flex-col md:flex-row gap-3 h-full min-h-[420px]">
      <aside class="md:w-72 shrink-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 overflow-y-auto max-h-[70vh]">
        <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Иерархия (v2)</div>
        <div id="c2-tree">${_renderTree(svc)}</div>
      </aside>
      <main class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative" id="c2-plan">
        ${_renderPlanPane(svc)}
      </main>
    </div>`;
  _bindOnce();
}
function _bindOnce() {
  if (_bound) return;
  _bound = true;
  document.addEventListener(
    "click",
    (ev) => {
      var _a;
      const t = ev.target;
      const btn = (_a = t == null ? void 0 : t.closest) == null ? void 0 : _a.call(t, "[data-c2-floor]");
      if (!btn) return;
      const id = btn.getAttribute("data-c2-floor");
      if (!id) return;
      _selectedFloorId = id;
      renderConstructionV2().catch((e) => console.warn("[construction-v2] render", e));
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
let _inited = false;
async function init(_ctx) {
  var _a, _b, _c;
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
  _inited = true;
  console.info("[construction-v2] init ok");
  return { ok: true };
}
function showTab() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.add("hidden"));
  const tab = document.getElementById("tab-construction-v2");
  if (tab) tab.classList.remove("hidden");
  renderConstructionV2().catch(() => {
  });
}
function registerModule() {
  var _a;
  window.RBI = window.RBI || { services: {} };
  const mod = { init, showTab, manifest: ConstructionV2Manifest, render: renderConstructionV2 };
  if ((_a = window.RBI.registry) == null ? void 0 : _a.register) {
    window.RBI.registry.register("module.construction-v2", mod);
  }
  window.ConstructionV2Module = mod;
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
