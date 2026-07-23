/**
 * Platform entry: construction-v2 (Vite bundle).
 * Legacy js/modules/construction/** не импортируется и не изменяется.
 */

import { ConstructionV2Manifest } from './manifest';
import { mountConstructionV2Shell, refreshConstructionV2Markers, renderConstructionV2 } from './ui';

let _inited = false;

async function init(_ctx?: Record<string, unknown>) {
  if (_inited) {
    await renderConstructionV2();
    return { ok: true, reentered: true };
  }
  mountConstructionV2Shell();
  await renderConstructionV2();

  window.RBI?.events?.on?.('locations:changed', () => {
    const tab = document.getElementById('tab-construction-v2');
    if (tab && !tab.classList.contains('hidden')) {
      renderConstructionV2().catch(() => {});
    }
  });

  window.RBI?.events?.on?.('construction-defects:changed', () => {
    refreshConstructionV2Markers().catch(() => {});
  });

  _registerAppRouter();
  if ((location.hash || '').replace(/^#/, '').startsWith('/construction-v2')) {
    showTab();
  }

  _inited = true;
  console.info('[construction-v2] init ok');
  return { ok: true };
}

function showTab() {
  // App Shell / AppRouter переключают вкладки через .active (не .hidden)
  document.querySelectorAll('.view-section').forEach((el) => {
    el.classList.remove('active');
  });
  const tab = document.getElementById('tab-construction-v2');
  if (tab) {
    tab.classList.remove('hidden');
    tab.classList.add('active');
  }
  const header = document.getElementById('main-header');
  if (header) header.style.display = 'none';
  const navEl = document.getElementById('main-bottom-nav');
  if (navEl) navEl.style.display = 'none';
  if (typeof window.updateBodyPadding === 'function') {
    setTimeout(() => window.updateBodyPadding?.(), 50);
  }
  renderConstructionV2().catch(() => {});
}

function _registerAppRouter() {
  const router = (window as unknown as { AppRouter?: { addRoute?: (p: string, fn: () => void) => void } }).AppRouter;
  if (router && typeof router.addRoute === 'function') {
    router.addRoute('#/construction-v2', () => showTab());
  }
}

/** Регистрация модуля в registry (как classic modules). */
function registerModule() {
  window.RBI = window.RBI || ({ services: {} } as Window['RBI']);
  const mod = { init, showTab, manifest: ConstructionV2Manifest, render: renderConstructionV2 };
  if (window.RBI.registry?.register) {
    window.RBI.registry.register('module.construction-v2', mod);
  }
  (window as unknown as { ConstructionV2Module?: typeof mod }).ConstructionV2Module = mod;

  _registerAppRouter();

  // Hash-роутинг без ломки legacy #/construction
  window.addEventListener('hashchange', () => {
    const h = (location.hash || '').replace(/^#/, '');
    if (h.startsWith('/construction-v2')) showTab();
  });
  if ((location.hash || '').replace(/^#/, '').startsWith('/construction-v2')) {
    // после mount (и после возможного раннего AppRouter → 404-заглушки)
    setTimeout(() => showTab(), 0);
  }
}

registerModule();

export { init, showTab, ConstructionV2Manifest };
export default { init, showTab, manifest: ConstructionV2Manifest };
