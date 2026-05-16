/* Файл: js/roles.js (Модуль ролей и прав доступа - МАТРИЦА) */

// === МАТРИЦА ПРАВ ДОСТУПА ===
// ВАЖНО:
// canCreate — можно создавать проектные данные в интерфейсе.
// canPush — можно отправлять проектные данные в облако.
// canDeleteOwn — можно удалять свои записи.
// canDeleteAll — можно удалять все записи.
// canManageRoles — можно управлять ролями пользователей.
// canManageObjects — можно управлять справочником объектов.
// canEditKnowledgeBase — можно редактировать базу знаний.

const ROLE_MATRIX = {
    guest: {
        canCreate: false,
        canPush: false,
        canDeleteOwn: false,
        canDeleteAll: false,
        canManageRoles: false,
        canManageObjects: false,
        canEditKnowledgeBase: false,
        canViewKnowledgeBase: true
    },

    contractor: {
        canCreate: false,
        canPush: false,
        canDeleteOwn: false,
        canDeleteAll: false,
        canManageRoles: false,
        canManageObjects: false,
        canEditKnowledgeBase: false,
        canViewKnowledgeBase: true
    },

    engineer: {
        canCreate: true,
        canPush: true,
        canDeleteOwn: true,
        canDeleteAll: false,
        canManageRoles: false,
        canManageObjects: false,
        canEditKnowledgeBase: true,
        canViewKnowledgeBase: true
    },

    project_manager: {
        canCreate: false,
        canPush: false,
        canDeleteOwn: false,
        canDeleteAll: false,
        canManageRoles: false,
        canManageObjects: false,
        canEditKnowledgeBase: false,
        canViewKnowledgeBase: true
    },

    deputy_manager: {
        canCreate: true,
        canPush: true,
        canDeleteOwn: true,
        canDeleteAll: true,
        canManageRoles: true,
        canManageObjects: true,
        canEditKnowledgeBase: true,
        canViewKnowledgeBase: true
    },

    director: {
        canCreate: false,
        canPush: false,
        canDeleteOwn: false,
        canDeleteAll: false,
        canManageRoles: false,
        canManageObjects: false,
        canEditKnowledgeBase: false,
        canViewKnowledgeBase: true
    },

    manager: {
        canCreate: true,
        canPush: true,
        canDeleteOwn: true,
        canDeleteAll: true,
        canManageRoles: true,
        canManageObjects: true,
        canEditKnowledgeBase: true,
        canViewKnowledgeBase: true
    }
};

window.RbiRoles = {
    // 1. Получить текущую роль пользователя
    getCurrentRole() {
        // Если облако не подключено — работаем локально как инженер,
        // чтобы приложение не было урезано в офлайн-режиме.
        if (!window.syncConfig || !window.syncConfig.enabled) {
            return 'engineer';
        }

        if (typeof appSettings === 'undefined' || !appSettings.userRole) {
            return 'guest';
        }

        return appSettings.userRole;
    },

    // 2. Получить облачный статус доступа
    getCloudStatus() {
        if (typeof appSettings === 'undefined') return 'offline';

        return appSettings.cloudStatus ||
            appSettings.cloud_status ||
            'pending';
    },

    // 3. Получить права по текущей роли
    getPermissions() {
        const role = this.getCurrentRole();
        return ROLE_MATRIX[role] || ROLE_MATRIX.guest;
    },

    // 4. Можно ли создавать проектные данные в интерфейсе
    canCreate() {
        // Без облака — разрешаем локальную работу инженера.
        if (!window.syncConfig || !window.syncConfig.enabled) return true;

        const cloudStatus = this.getCloudStatus();

        // Если пользователь ожидает подтверждения или доступ ограничен,
        // локально он всё равно может продолжать работу.
        // Но в облако эти данные не уйдут.
        if (cloudStatus !== 'approved') return true;

        return !!this.getPermissions().canCreate;
    },

    // 5. Можно ли отправлять данные в облако
    canPush() {
        if (!window.syncConfig || !window.syncConfig.enabled) return false;

        const cloudStatus = this.getCloudStatus();

        // Push разрешён только после подтверждения администратором.
        if (cloudStatus !== 'approved') return false;

        return !!this.getPermissions().canPush;
    },

    // 6. Можно ли редактировать проектные данные
    canEdit(ownerName = '') {
        const role = this.getCurrentRole();

        if (role === 'manager' || role === 'deputy_manager') return true;

        if (role === 'engineer') {
            const currentEngineerName = this.getCurrentEngineerName();
            return !ownerName || ownerName === currentEngineerName;
        }

        return false;
    },

    // 7. Можно ли удалить конкретную запись
    canDelete(ownerName) {
        const permissions = this.getPermissions();

        if (permissions.canDeleteAll) return true;

        if (permissions.canDeleteOwn) {
            const currentEngineerName = this.getCurrentEngineerName();
            return ownerName === currentEngineerName;
        }

        return false;
    },

    // 8. Можно ли управлять ролями
    canManageRoles() {
        return !!this.getPermissions().canManageRoles;
    },

    // 9. Можно ли управлять объектами
    canManageObjects() {
        return !!this.getPermissions().canManageObjects;
    },

    // 10. Можно ли редактировать базу знаний
    canEditKnowledgeBase() {
        return !!this.getPermissions().canEditKnowledgeBase;
    },

    // 11. Можно ли смотреть базу знаний
    canViewKnowledgeBase() {
        return !!this.getPermissions().canViewKnowledgeBase;
    },

    // 12. Получить текущего инженера
    getCurrentEngineerName() {
        if (window.syncConfig && window.syncConfig.engineerName) {
            return window.syncConfig.engineerName;
        }

        if (typeof appSettings !== 'undefined' && appSettings.engineerName) {
            return appSettings.engineerName;
        }

        return 'Инженер';
    },

    // 13. Получить закреплённые объекты
    getAssignedProjects() {
        if (typeof appSettings !== 'undefined' && Array.isArray(appSettings.assignedProjects)) {
            return appSettings.assignedProjects;
        }

        if (typeof appSettings !== 'undefined' && Array.isArray(appSettings.assigned_projects)) {
            return appSettings.assigned_projects;
        }

        return [];
    },

    // 14. Получить подрядчика пользователя
    getAssignedContractor() {
        if (typeof appSettings === 'undefined') return '';

        return appSettings.contractorName ||
            appSettings.contractor_name ||
            appSettings.assignedContractor ||
            appSettings.assigned_contractor ||
            '';
    },

    // 15. Применить визуальные ограничения интерфейса
    applyUIConstraints() {
        // ВАЖНО:
        // read-only-mode включаем только для ролей, которым нельзя создавать
        // после подтверждения роли.
        // Локальный офлайн и pending не блокируем, чтобы инженер мог работать.
        if (this.canCreate()) {
            document.body.classList.remove('read-only-mode');
        } else {
            document.body.classList.add('read-only-mode');
        }
        // Скрываем элементы, требующие права создания.
        // Это только визуальное ограничение. Основная защита есть в функциях сохранения.
        document.querySelectorAll('[data-requires-create="true"]').forEach(el => {
            if (this.canCreate()) {
                el.classList.remove('hidden');
                el.removeAttribute('disabled');
            } else {
                el.classList.add('hidden');
                el.setAttribute('disabled', 'true');
            }
        });

        document.body.setAttribute('data-rbi-role', this.getCurrentRole());
        document.body.setAttribute('data-rbi-cloud-status', this.getCloudStatus());
    // Скрытие AI-Оптимизатора для всех, кроме руководства
        const aiOpt = document.getElementById('ai-optimizer-settings');
        if (aiOpt) {
            const role = this.getCurrentRole();
            aiOpt.style.display = ['manager', 'deputy_manager'].includes(role) ? 'block' : 'none';
        }
    }
};