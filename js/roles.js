/* Файл: js/roles.js (Модуль ролей и прав доступа - МАТРИЦА) */

// === МАТРИЦА ПРАВ ДОСТУПА ===
// true - разрешено, false - запрещено
const ROLE_MATRIX = {
    'guest':           { canPush: false, canDeleteOwn: false, canDeleteAll: false },
    'contractor':      { canPush: true,  canDeleteOwn: false, canDeleteAll: false }, // Подрядчик может отправлять свои проверки, но не может удалять
    'engineer':        { canPush: true,  canDeleteOwn: true,  canDeleteAll: false }, // Инженер может удалять только свои проверки
    'universal':       { canPush: true,  canDeleteOwn: true,  canDeleteAll: true  }, // Универсальный боец (может всё)
    'project_manager': { canPush: false, canDeleteOwn: false, canDeleteAll: false }, // РП только смотрит дашборды
    'deputy_manager':  { canPush: true,  canDeleteOwn: true,  canDeleteAll: true  }, // Зам. руководителя может всё
    'director':        { canPush: false, canDeleteOwn: false, canDeleteAll: false }, // Директор только смотрит
    'manager':         { canPush: true,  canDeleteOwn: true,  canDeleteAll: true  }  // Админ может всё
};

window.RbiRoles = {
    // 1. Получить текущую роль пользователя
    getCurrentRole() {
        if (typeof appSettings === 'undefined' || !appSettings.userRole) return 'guest';
        return appSettings.userRole;
    },

    // 2. Проверка: может ли пользователь отправлять данные (Синхронизация)
    canPush() {
        const role = this.getCurrentRole();
        return ROLE_MATRIX[role] ? ROLE_MATRIX[role].canPush : false;
    },

    // 3. Проверка: может ли пользователь удалить конкретную запись
    canDelete(ownerName) {
        const role = this.getCurrentRole();
        const permissions = ROLE_MATRIX[role] || ROLE_MATRIX['guest'];
        
        // Если роли разрешено удалять абсолютно всё
        if (permissions.canDeleteAll) return true;
        
        // Если роли разрешено удалять только свои записи
        if (permissions.canDeleteOwn) {
            const currentEngineerName = (typeof appSettings !== 'undefined' ? appSettings.engineerName : 'Инженер');
            return ownerName === currentEngineerName;
        }
        
        // Иначе запрещено
        return false;
    },

    // 4. Получить список разрешенных объектов (для фильтрации при скачивании)
    getAssignedProjects() {
        if (typeof appSettings !== 'undefined' && appSettings.assignedProjects) {
            return appSettings.assignedProjects;
        }
        return [];
    },

    // 5. Применить визуальную блокировку кнопок (CSS)
    applyUIConstraints() {
        if (this.canPush()) {
            document.body.classList.remove('read-only-mode');
        } else {
            document.body.classList.add('read-only-mode');
        }
    }
};