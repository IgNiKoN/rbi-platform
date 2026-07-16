// etalon.render.js — Фаза 18: рендер-диспетчер модуля Etalon
//
// Примечание: etalon.js не содержит отдельных render-функций —
// вся отрисовка встроена в openEtalonConstructor и openEtalonViewer.
// EtalonRender делегирует в EtalonActions (тонкий диспетчер).

(function () {
  const EtalonRender = {

    /**
     * Открыть конструктор эталона.
     * Делегирует в EtalonActions.openConstructor().
     */
    openConstructor(params) {
      if (window.EtalonActions) {
        var p = params || {};
        window.EtalonActions.openConstructor(
          p.contractor,
          p.templateKey,
          p.templateTitle,
          p.projectName,
          p.statusKey
        );
      } else {
        console.warn('[EtalonRender] EtalonActions недоступен');
      }
    },

    /**
     * Открыть просмотр акта.
     * Делегирует в EtalonActions.openViewer().
     */
    openViewer(id) {
      if (window.EtalonActions) {
        window.EtalonActions.openViewer(id);
      } else {
        console.warn('[EtalonRender] EtalonActions недоступен');
      }
    }
  };

  window.EtalonRender = EtalonRender;
})();

console.log('[EtalonRender] etalon.render.js loaded');
