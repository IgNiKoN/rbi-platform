/* Файл: js/core/router.js */

window.AppRouter = {
    routes: {},
    scrollPositions: {}, // Память прокрутки для каждой вкладки
    
    init() {
        console.log("Умный Роутер запущен");
        
        window.addEventListener('popstate', () => this.renderRoute());
        
        document.body.addEventListener('click', (e) => {
            const navItem = e.target.closest('[data-path]');
            if (navItem) {
                e.preventDefault();
                this.navigate(navItem.dataset.path);
            }
        });

        if (!window.location.hash || window.location.hash === '#/') {
            this.navigate('#/quality/audit', true);
        } else {
            this.renderRoute();
        }
    },

    addRoute(path, renderFunction) {
        this.routes[path] = renderFunction;
    },

    navigate(path, replace = false) {
        // 1. Запоминаем скролл текущей вкладки перед уходом
        const currentPath = window.location.hash || '#/quality/audit';
        this.scrollPositions[currentPath] = window.scrollY;

        // 2. Делаем тихий переход
        if (replace) {
            window.history.replaceState(null, '', path);
        } else {
            window.history.pushState(null, '', path);
        }
        this.renderRoute();
    },

    renderRoute() {
        let path = window.location.hash || '#/quality/audit';
        const renderFunction = this.routes[path] || this.routes['*'];
        
        if (renderFunction) {
            renderFunction();
            this.updateNavHighlight(path);

            // 3. Восстанавливаем скролл. 
            // Ждем 60мс, чтобы скрипт шапки успел пересчитать отступы (padding)
            setTimeout(() => {
                const savedScroll = this.scrollPositions[path] || 0;
                window.scrollTo(0, savedScroll);
            }, 60);
        }
    },

    updateNavHighlight(path) {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            if (item.dataset.path === path) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
};

window.switchTab = function (tabId, navElement = null) {
    const routeMap = {
        'tab-audit': '#/quality/audit',
        'tab-engineer': '#/quality/engineer',
        'tab-analytics': '#/quality/analytics',
        'tab-reference': '#/quality/reference',
        'tab-settings': '#/quality/settings'
    };

    if (routeMap[tabId]) {
        AppRouter.navigate(routeMap[tabId]);
    }
};