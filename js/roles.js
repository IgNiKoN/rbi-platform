/* Файл: js/roles.js (Модуль ролей и прав доступа - МАТРИЦА) */

// === МАТРИЦА ПРАВ ДОСТУПА ===
const ROLE_MATRIX = {
    guest: {
        canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
        canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
        isAdmin: false, isLeadership: false, canManageSK: false, canManageHierarchy: false
    },

    contractor: {
        canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
        canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
        isAdmin: false, isLeadership: false, canManageSK: false, canManageHierarchy: false
    },

    engineer: {
        canCreate: true,
        canPush: true,
        canDeleteOwn: true,
        canDeleteAll: false,
        canManageRoles: false,
        canManageObjects: false,
        canEditKnowledgeBase: true,
        canViewKnowledgeBase: true,
        isAdmin: false,
        isLeadership: false,
        canManageSK: true,
        canManageHierarchy: false
    },

    project_manager: {
        canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
        canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
        isAdmin: false, isLeadership: true, canManageSK: false, canManageHierarchy: false
    },

    deputy_manager: {
        canCreate: true, canPush: true, canDeleteOwn: true, canDeleteAll: true,
        canManageRoles: true, canManageObjects: true, canEditKnowledgeBase: true, canViewKnowledgeBase: true,
        isAdmin: true, isLeadership: true, canManageSK: true, canManageHierarchy: true
    },

    director: {
        canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
        canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
        isAdmin: false, isLeadership: true, canManageSK: false, canManageHierarchy: true
    },

    manager: {
        canCreate: true, canPush: true, canDeleteOwn: true, canDeleteAll: true,
        canManageRoles: true, canManageObjects: true, canEditKnowledgeBase: true, canViewKnowledgeBase: true,
        isAdmin: true, isLeadership: true, canManageSK: true, canManageHierarchy: true
    }
};

window.RbiRoles = {
    // 1. Получить текущую роль пользователя
    getCurrentRole() {
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
        return appSettings.cloudStatus || appSettings.cloud_status || 'pending';
    },

    // 3. Получить права по текущей роли
    getPermissions() {
        const role = this.getCurrentRole();
        return ROLE_MATRIX[role] || ROLE_MATRIX.guest;
    },

    // 4. ГРУППОВЫЕ ПРОВЕРКИ (НОВЫЕ ФУНКЦИИ)
    isAdmin() { return !!this.getPermissions().isAdmin; },
    isLeadership() { return !!this.getPermissions().isLeadership; },
    canManageSK() { return !!this.getPermissions().canManageSK; },
    canManageHierarchy() { return !!this.getPermissions().canManageHierarchy; },

    // 5. Можно ли создавать проектные данные
    canCreate() {
        if (!window.syncConfig || !window.syncConfig.enabled) return true;
        if (this.getCloudStatus() !== 'approved') return true;
        return !!this.getPermissions().canCreate;
    },

    // 6. Можно ли отправлять данные в облако
    canPush() {
        if (!window.syncConfig || !window.syncConfig.enabled) return false;
        if (this.getCloudStatus() !== 'approved') return false;
        return !!this.getPermissions().canPush;
    },

    // 7. Можно ли редактировать проектные данные
    canEdit(ownerName = '') {
        if (this.isAdmin()) return true;
        if (this.getCurrentRole() === 'engineer') {
            const currentEngineerName = this.getCurrentEngineerName();
            return !ownerName || ownerName === currentEngineerName;
        }
        return false;
    },

    // 8. Можно ли удалить конкретную запись
    canDelete(ownerName) {
        const permissions = this.getPermissions();
        if (permissions.canDeleteAll) return true;
        if (permissions.canDeleteOwn) {
            return ownerName === this.getCurrentEngineerName();
        }
        return false;
    },

    canManageRoles() { return !!this.getPermissions().canManageRoles; },
    canManageObjects() { return !!this.getPermissions().canManageObjects; },
    canEditKnowledgeBase() { return !!this.getPermissions().canEditKnowledgeBase; },
    canViewKnowledgeBase() { return !!this.getPermissions().canViewKnowledgeBase; },

    // 9. Получить текущего инженера
    getCurrentEngineerName() {
        if (window.syncConfig && window.syncConfig.engineerName) return window.syncConfig.engineerName;
        if (typeof appSettings !== 'undefined' && appSettings.engineerName) return appSettings.engineerName;
        return 'Инженер';
    },

    // 10. Получить закреплённые объекты
    getAssignedProjects() {
        if (typeof appSettings !== 'undefined' && Array.isArray(appSettings.assignedProjects)) return appSettings.assignedProjects;
        if (typeof appSettings !== 'undefined' && Array.isArray(appSettings.assigned_projects)) return appSettings.assigned_projects;
        return [];
    },

    // 11. Получить подрядчика пользователя
    getAssignedContractor() {
        if (typeof appSettings === 'undefined') return '';
        return appSettings.contractorName || appSettings.contractor_name || appSettings.assignedContractor || appSettings.assigned_contractor || '';
    },

    // 12. Применить визуальные ограничения интерфейса
    applyUIConstraints() {
        if (this.canCreate()) {
            document.body.classList.remove('read-only-mode');
        } else {
            document.body.classList.add('read-only-mode');
        }

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

        const aiOpt = document.getElementById('ai-optimizer-settings');
        if (aiOpt) {
            aiOpt.style.display = this.isAdmin() ? 'block' : 'none';
        }
    }
};