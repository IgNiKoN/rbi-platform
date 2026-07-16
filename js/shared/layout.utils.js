/* Файл: js/shared/layout.utils.js */
/* Генерические DOM-утилиты компоновки — перенесено из js/app.js */

// === ДИНАМИЧЕСКИЕ ОТСТУПЫ ===
function updateBodyPadding() {
    const headerEl = document.getElementById('main-header');

    // Ищем нижнюю панель по новому ID или по классу
    const navEl = document.getElementById('main-bottom-nav') || document.querySelector('.bottom-nav');

    const isNavTop = (document.body.classList.contains('nav-pos-top')) ||
        (document.body.classList.contains('nav-pos-auto') && window.innerWidth >= 768);

    // Sidebar icon-rail (App Shell, §29 п.9, вариант A) — виден только на ПК,
    // ширина отступа задаётся CSS-переменной, синхронной с шириной #app-sidebar.
    const sidebarEl = document.getElementById('app-sidebar');
    const hasSidebar = !!sidebarEl && window.innerWidth >= 768 && getComputedStyle(sidebarEl).display !== 'none';
    document.body.classList.toggle('has-app-sidebar', hasSidebar);

    // Проверяем, активны ли вкладки, где нужна шапка
    const isAuditActive = document.getElementById('tab-audit')?.classList.contains('active');
    const isDefects = document.getElementById('tab-construction-defects')?.classList.contains('active');
    const isAcceptance = document.getElementById('tab-construction-acceptance')?.classList.contains('active');
    const isTransfer = document.getElementById('tab-transfer')?.classList.contains('active'); // <-- НОВОЕ
    const isPlaceholder = document.getElementById('tab-mode-placeholder')?.classList.contains('active');

    // Шапка нужна на любой из этих вкладок
    const needsHeader = isAuditActive || isDefects || isAcceptance || isTransfer || isPlaceholder;

    // Снимаем дефолтный отступ контента
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.classList.remove('pt-4');

    let totalTop = 0;

    if (needsHeader) {
        if (isNavTop && navEl) totalTop += navEl.offsetHeight;

        if (headerEl && headerEl.style.display !== 'none') {
            const wasCollapsed = headerEl.classList.contains('header-collapsed');
            // Временно убираем класс, чтобы браузер мог посчитать реальную высоту
            if (wasCollapsed) headerEl.classList.remove('header-collapsed');

            // Если мы в режиме стройконтроля, высота шапки будет меньше
            totalTop += headerEl.offsetHeight;

            if (wasCollapsed) headerEl.classList.add('header-collapsed');
        }

        document.body.style.paddingTop = `${totalTop + 15}px`;
        if (mainEl) mainEl.classList.add('pt-4'); // Для красоты внутри Осмотра/Дефектов
    } else {
        if (isNavTop && navEl) {
            // Навигация сверху: Высота меню (60px) + зазор 10px = 70px
            document.body.style.paddingTop = `70px`;
        } else {
            // Навигация снизу (Телефон): Жесткий безопасный отступ от верха экрана 20px
            document.body.style.paddingTop = `20px`;
        }
    }
}

// === ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ МЫШКОЙ (ДЛЯ ПК) ===
function initHorizontalMouseScroll() {
    let isDown = false;
    let startX;
    let scrollLeft;
    let slider = null;

    // Вешаем слушатели на весь документ, но фильтруем цели
    document.addEventListener('mousedown', (e) => {
        // Ищем ближайший контейнер со скроллом
        slider = e.target.closest('.overflow-x-auto, .custom-scrollbar, .no-scrollbar');

        // Запрещаем скролл мышкой, если кликнули по кнопке, инпуту или фото (чтобы не блокировать их нажатие)
        if (!slider || e.target.closest('button, input, select, a, img')) {
            slider = null;
            return;
        }

        isDown = true;
        slider.style.cursor = 'grabbing';
        slider.style.userSelect = 'none'; // Запрет выделения текста при скролле

        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    document.addEventListener('mouseleave', () => {
        if (!isDown || !slider) return;
        isDown = false;
        slider.style.cursor = '';
        slider.style.userSelect = '';
    });

    document.addEventListener('mouseup', () => {
        if (!isDown || !slider) return;
        isDown = false;
        slider.style.cursor = '';
        slider.style.userSelect = '';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDown || !slider) return;
        e.preventDefault(); // Останавливает стандартные браузерные события
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5; // Скорость прокрутки (1.5x)
        slider.scrollLeft = scrollLeft - walk;
    });
}

window.updateBodyPadding = updateBodyPadding;
window.initHorizontalMouseScroll = initHorizontalMouseScroll;
