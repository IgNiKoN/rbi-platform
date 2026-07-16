/* Файл: js/shared/touch-gestures.utils.js */

// === RBI BLOCK ANDROID PULL TO REFRESH ONLY v17.8.209 ===
// Блокирует только жест "потянуть вниз для обновления" на самом верху страницы.
// Не блокирует клики по вкладкам и обычный скролл.
(function rbiBlockAndroidPullToRefreshOnly() {
    if (window.__rbiPullToRefreshBlockReady) return;
    window.__rbiPullToRefreshBlockReady = true;

    let startY = 0;
    let startX = 0;

    function isInsideNoBlockZone(target) {
        return !!target.closest(
            '.bottom-nav, .nav-item, button, a, input, textarea, select, [contenteditable="true"], .modal, [role="dialog"]'
        );
    }

    document.addEventListener('touchstart', function (e) {
        if (!e.touches || e.touches.length !== 1) return;

        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        if (isInsideNoBlockZone(e.target)) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;

        const dy = currentY - startY;
        const dx = Math.abs(currentX - startX);

        const isPullingDown = dy > 8;
        const isMostlyVertical = Math.abs(dy) > dx;
        const isAtTop = window.scrollY <= 0 || document.documentElement.scrollTop <= 0;

        if (isAtTop && isPullingDown && isMostlyVertical) {
            e.preventDefault();
        }
    }, { passive: false });
})();
