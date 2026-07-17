/* Файл: js/services/permission.service.js */
/* Permission Service — единая реализация ролей и прав доступа (перенесено из js/roles.js) */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    // Реальный список выбираемых бизнес-platform-модулей (не сервисов/фич —
    // sk/game/knowledge — role:'feature-of' внутри quality, settings/ai — role:'service',
    // см. PLATFORM_TARGET_ARCHITECTURE.md §31). Значение allowedModules у всех ролей
    // ниже — явное решение пользователя «не ограничивать роли сейчас» (2026-07-13,
    // §29 п.10в), не временная заглушка. Пересечение с company.enabledModules
    // остаётся на стороне user-context.service.js.
    var BUSINESS_MODULE_IDS = ['quality', 'construction'];

    // === МАТРИЦА ПРАВ ДОСТУПА ===
    // dataScope — декларативное правило видимости данных по роли (§29 п.10 «в»):
    //   'all'                   — видит все записи (текущий isLeadership()/isAdmin() приоритет);
    //   'ownProject'             — только записи назначенных проектов;
    //   'ownContractor'         — только записи назначенного подрядчика (+ фильтр по проекту, если назначен);
    //   'ownProjectOrOwnRecords' — назначенные проекты, либо (если проектов нет) только свои записи без проекта;
    //   'none'                  — 0 доступа к чужим данным.
    const ROLE_MATRIX = {
        guest: {
            canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
            canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
            isAdmin: false, isLeadership: false, canManageSK: false, canManageHierarchy: false,
            isEngineerOrAdmin: false, canViewWeeklyPlan: false,
            dataScope: 'none', allowedModules: BUSINESS_MODULE_IDS, label: 'Гость'
        },

        contractor: {
            canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
            canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
            isAdmin: false, isLeadership: false, canManageSK: false, canManageHierarchy: false,
            isEngineerOrAdmin: false, canViewWeeklyPlan: false,
            dataScope: 'ownContractor', allowedModules: BUSINESS_MODULE_IDS, label: 'Подрядчик'
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
            canManageHierarchy: false,
            isEngineerOrAdmin: true, canViewWeeklyPlan: true,
            dataScope: 'ownProjectOrOwnRecords', allowedModules: BUSINESS_MODULE_IDS, label: 'Инженер СК'
        },

        project_manager: {
            canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
            canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
            isAdmin: false, isLeadership: true, canManageSK: false, canManageHierarchy: false,
            isEngineerOrAdmin: false, canViewWeeklyPlan: true,
            dataScope: 'ownProject', allowedModules: BUSINESS_MODULE_IDS, label: 'Руководитель (РП)'
        },

        deputy_manager: {
            canCreate: true, canPush: true, canDeleteOwn: true, canDeleteAll: true,
            canManageRoles: true, canManageObjects: true, canEditKnowledgeBase: true, canViewKnowledgeBase: true,
            isAdmin: true, isLeadership: true, canManageSK: true, canManageHierarchy: true,
            isEngineerOrAdmin: true, canViewWeeklyPlan: true,
            dataScope: 'all', allowedModules: BUSINESS_MODULE_IDS, label: 'Зам. руководителя'
        },

        director: {
            canCreate: false, canPush: false, canDeleteOwn: false, canDeleteAll: false,
            canManageRoles: false, canManageObjects: false, canEditKnowledgeBase: false, canViewKnowledgeBase: true,
            isAdmin: false, isLeadership: true, canManageSK: false, canManageHierarchy: true,
            isEngineerOrAdmin: false, canViewWeeklyPlan: true,
            dataScope: 'all', allowedModules: BUSINESS_MODULE_IDS, label: 'Директор'
        },

        manager: {
            canCreate: true, canPush: true, canDeleteOwn: true, canDeleteAll: true,
            canManageRoles: true, canManageObjects: true, canEditKnowledgeBase: true, canViewKnowledgeBase: true,
            isAdmin: true, isLeadership: true, canManageSK: true, canManageHierarchy: true,
            isEngineerOrAdmin: true, canViewWeeklyPlan: true,
            dataScope: 'all', allowedModules: BUSINESS_MODULE_IDS, label: 'Админ'
        }
    };

    // COMPANY_ROLE_MATRICES — обёртка ROLE_MATRIX под ключ единственной существующей
    // компании 'rbi' (§29 п.10б). Подготовка контракта под будущий multi-tenant —
    // сама ROLE_MATRIX не меняется (0 новых ролей/полей).
    const COMPANY_ROLE_MATRICES = { rbi: ROLE_MATRIX };

    // Резолвер матрицы ролей по companyId — fallback на 'rbi' для любого
    // неизвестного/не переданного companyId (сохраняет текущее поведение 1:1).
    function _getRoleMatrix(companyId) {
        return COMPANY_ROLE_MATRICES[companyId] || COMPANY_ROLE_MATRICES.rbi;
    }

    const permissions = {
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

        // 3. Получить права по текущей (или переданной) роли, опционально для companyId.
        getPermissions(role, companyId) {
            const r = role || this.getCurrentRole();
            const matrix = _getRoleMatrix(companyId);
            return matrix[r] || matrix.guest;
        },

        // 4. ГРУППОВЫЕ ПРОВЕРКИ
        isAdmin() { return !!this.getPermissions().isAdmin; },
        isLeadership() { return !!this.getPermissions().isLeadership; },
        canManageSK() { return !!this.getPermissions().canManageSK; },
        canManageHierarchy() { return !!this.getPermissions().canManageHierarchy; },
        isEngineerOrAdmin() { return !!this.getPermissions().isEngineerOrAdmin; },
        canViewWeeklyPlan() { return !!this.getPermissions().canViewWeeklyPlan; },

        // 18. Роль без индивидуально закреплённых объектов (Group F §29 п.13):
        // guest → dataScope 'none', director/deputy_manager/manager → dataScope 'all'.
        hasNoOwnObjects(role) {
            const scope = this.getDataScope(role);
            return scope === 'none' || scope === 'all';
        },

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
            const perms = this.getPermissions();
            if (perms.canDeleteAll) return true;
            if (perms.canDeleteOwn) {
                return ownerName === this.getCurrentEngineerName();
            }
            return false;
        },

        canManageRoles() { return !!this.getPermissions().canManageRoles; },
        canManageObjects() { return !!this.getPermissions().canManageObjects; },
        canEditKnowledgeBase() { return !!this.getPermissions().canEditKnowledgeBase; },
        canViewKnowledgeBase() { return !!this.getPermissions().canViewKnowledgeBase; },

        // 13. Декларативный data-scope текущей (или переданной) роли —
        // единая точка, которую читают sk.actions.js/sync-engine.core.js/
        // sync-push-pull.core.js вместо буквальных `role === 'x'`.
        getDataScope(role, companyId) {
            const r = role || this.getCurrentRole();
            const matrix = _getRoleMatrix(companyId);
            const entry = matrix[r] || matrix.guest;
            return entry.dataScope || 'none';
        },

        // 14. Список модулей, разрешённых роли (пересечение с company.enabledModules
        // выполняет потребитель — user-context.service.js).
        getAllowedModules(role, companyId) {
            const r = role || this.getCurrentRole();
            const matrix = _getRoleMatrix(companyId);
            const entry = matrix[r] || matrix.guest;
            return (entry.allowedModules || BUSINESS_MODULE_IDS).slice();
        },

        // 15. Контракт {companyId, role, permissions} — §23.
        getContract(role, companyId) {
            const r = role || this.getCurrentRole();
            const cId = companyId || 'rbi';
            const matrix = _getRoleMatrix(cId);
            return {
                companyId: cId,
                role: r,
                permissions: matrix[r] || matrix.guest
            };
        },

        // 16. Все роли ROLE_MATRIX (или её companyId-варианта) с человекочитаемыми
        // именами (для админ-UI).
        getAllRoles(companyId) {
            const matrix = _getRoleMatrix(companyId);
            return Object.keys(matrix).map(function (key) {
                return { key: key, label: matrix[key].label || key };
            });
        },

        // 17. Единая клиентская фильтрация записей по dataScope — заменяет
        // хардкод-ветвление role === 'x' в sk_filterRecordsByAccess и т.п.
        // fieldsConfig: { projectField: [...имена полей], contractorField: [...], ownerField: [...] }
        // Семантика идентична существующей sk_filterRecordsByAccess (перенос правил, не новая логика).
        filterByDataScope(records, fieldsConfig, role, companyId) {
            if (!Array.isArray(records)) return [];
            const cfg = fieldsConfig || {};
            const projectFields = cfg.projectField || [];
            const contractorFields = cfg.contractorField || [];
            const ownerFields = cfg.ownerField || [];

            function pick(rec, fields) {
                for (let i = 0; i < fields.length; i++) {
                    const v = rec[fields[i]];
                    if (v) return v;
                }
                return '';
            }

            // Совпадение хотя бы по одному из полей группы (для contractorField,
            // где ключ-канон и человекочитаемое имя — два независимых, не приоритетных, признака).
            function matchesAny(rec, fields, target) {
                for (let i = 0; i < fields.length; i++) {
                    if (rec[fields[i]] === target) return true;
                }
                return false;
            }

            const scope = this.getDataScope(role, companyId);
            const assignedProjects = this.getAssignedProjects();
            const currentEngineer = this.getCurrentEngineerName();
            const assignedContractor = this.getAssignedContractor();

            if (scope === 'all') return records;

            if (scope === 'none') return [];

            if (scope === 'ownProject') {
                if (!assignedProjects || assignedProjects.length === 0) return [];
                return records.filter(function (r) {
                    const recProject = pick(r, projectFields);
                    return assignedProjects.includes(recProject);
                });
            }

            if (scope === 'ownProjectOrOwnRecords') {
                return records.filter(function (r) {
                    const recProject = pick(r, projectFields);
                    const uploadedBy = pick(r, ownerFields);
                    const isUnassignedProject = recProject === 'unknown' || recProject === '';
                    if (!assignedProjects || assignedProjects.length === 0) {
                        return isUnassignedProject && uploadedBy === currentEngineer;
                    }
                    if (assignedProjects.includes(recProject)) return true;
                    if (isUnassignedProject && uploadedBy === currentEngineer) return true;
                    return false;
                });
            }

            if (scope === 'ownContractor') {
                if (!assignedContractor) return [];
                const assignedContractorValue = String(assignedContractor || '').trim();
                return records.filter(function (r) {
                    const recProject = pick(r, projectFields);
                    const contractorOk = matchesAny(r, contractorFields, assignedContractorValue);
                    const projectOk = !assignedProjects || assignedProjects.length === 0 || assignedProjects.includes(recProject);
                    return contractorOk && projectOk;
                });
            }

            return [];
        },

        // 9. Получить текущего инженера
        getCurrentEngineerName() {
            if (window.syncConfig && window.syncConfig.engineerName) return window.syncConfig.engineerName;
            if (typeof appSettings !== 'undefined' && appSettings.engineerName) return appSettings.engineerName;
            return 'Инженер';
        },

        // 10. Получить закреплённые объекты.
        // Читает оба возможных поля (assignedProjects — основное, assigned_projects —
        // алиас колонки Supabase) и берёт непустой источник; пустой массив в первом
        // поле больше не блокирует fallback на второй (было: Array.isArray([]) === true
        // "съедал" реальные данные во втором поле — см. current_plan.md §2).
        getAssignedProjects() {
            if (typeof appSettings === 'undefined') return [];
            const primary = Array.isArray(appSettings.assignedProjects) ? appSettings.assignedProjects : null;
            const secondary = Array.isArray(appSettings.assigned_projects) ? appSettings.assigned_projects : null;
            if (primary && primary.length > 0) return primary;
            if (secondary && secondary.length > 0) return secondary;
            return primary || secondary || [];
        },

        // 11. Получить подрядчика пользователя
        getAssignedContractor() {
            if (typeof appSettings === 'undefined') return '';
            return appSettings.contractorName || appSettings.contractor_name || appSettings.assignedContractor || appSettings.assigned_contractor || '';
        },

        // 19. Единая точка записи привязки «объект(ы) ↔ пользователь» в профиль
        // Supabase (`rbi_engineer_profiles`) — заменяет 3 несогласованных прямых
        // update() в game.actions.js (gameSaveUserAccess/gameBlockUserAccess) и
        // object-directory.service.js (resolveRequest), которые писали только
        // одно из двух полей профиля (assigned_projects/settings.assignedProjects),
        // из-за чего они расходились (см. current_plan.md §2). Всегда обновляет
        // ОБА поля синхронно. extraFields — дополнительные колонки профиля
        // (role/cloud_status/assigned_contractor/contractor_name и т.п.),
        // settingsPatch — дополнительные ключи settings (requestedProjects и т.п.).
        async writeUserProjectAssignment(inspectorId, projectsArray, extraFields, settingsPatch) {
            if (!window.supabaseClient || !inspectorId) return { error: 'no_client_or_id' };

            const safeProjects = Array.isArray(projectsArray) ? projectsArray : [];
            const nowIso = new Date().toISOString();

            try {
                const { data: rows, error: readError } = await window.supabaseClient
                    .from('rbi_engineer_profiles')
                    .select('settings')
                    .eq('inspector_id', inspectorId)
                    .limit(1);

                if (readError) throw readError;

                const currentSettings = (rows && rows[0] && rows[0].settings) ? rows[0].settings : {};
                const newSettings = Object.assign({}, currentSettings, settingsPatch || {}, {
                    assignedProjects: safeProjects
                });

                const updatePayload = Object.assign({}, extraFields || {}, {
                    assigned_projects: safeProjects,
                    settings: newSettings,
                    updated_at: nowIso
                });

                const { error: writeError } = await window.supabaseClient
                    .from('rbi_engineer_profiles')
                    .update(updatePayload)
                    .eq('inspector_id', inspectorId);

                if (writeError) throw writeError;

                return { error: null, settings: newSettings };
            } catch (e) {
                console.error('[permission.service] writeUserProjectAssignment', e);
                return { error: e };
            }
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

    // window.RbiRoles — та же реализация, что и window.RBI.services.permissions (одна точка истины),
    // сохранена для обратной совместимости с 29 существующими потребителями.
    window.RbiRoles = permissions;

    window.RBI.services.permissions = {

        getCurrentRole: function () {
            return permissions.getCurrentRole();
        },

        getCloudStatus: function () {
            return permissions.getCloudStatus();
        },

        getPermissions: function (role, companyId) {
            return permissions.getPermissions(role, companyId);
        },

        isAdmin: function () {
            return permissions.isAdmin();
        },

        isLeadership: function () {
            return permissions.isLeadership();
        },

        canManageSK: function () {
            return permissions.canManageSK();
        },

        canManageHierarchy: function () {
            return permissions.canManageHierarchy();
        },

        isEngineerOrAdmin: function () {
            return permissions.isEngineerOrAdmin();
        },

        canViewWeeklyPlan: function () {
            return permissions.canViewWeeklyPlan();
        },

        hasNoOwnObjects: function (role) {
            return permissions.hasNoOwnObjects(role);
        },

        canCreate: function () {
            return permissions.canCreate();
        },

        canPush: function () {
            return permissions.canPush();
        },

        canEdit: function (ownerName) {
            return permissions.canEdit(ownerName || '');
        },

        canDelete: function (ownerName) {
            return permissions.canDelete(ownerName || '');
        },

        canManageRoles: function () {
            return permissions.canManageRoles();
        },

        canManageObjects: function () {
            return permissions.canManageObjects();
        },

        canEditKnowledgeBase: function () {
            return permissions.canEditKnowledgeBase();
        },

        canViewKnowledgeBase: function () {
            return permissions.canViewKnowledgeBase();
        },

        getCurrentEngineerName: function () {
            return permissions.getCurrentEngineerName();
        },

        getAssignedProjects: function () {
            return permissions.getAssignedProjects();
        },

        getAssignedContractor: function () {
            return permissions.getAssignedContractor();
        },

        writeUserProjectAssignment: function (inspectorId, projectsArray, extraFields, settingsPatch) {
            return permissions.writeUserProjectAssignment(inspectorId, projectsArray, extraFields, settingsPatch);
        },

        getDataScope: function (role, companyId) {
            return permissions.getDataScope(role, companyId);
        },

        getAllowedModules: function (role, companyId) {
            return permissions.getAllowedModules(role, companyId);
        },

        getContract: function (role, companyId) {
            return permissions.getContract(role, companyId);
        },

        getAllRoles: function (companyId) {
            return permissions.getAllRoles(companyId);
        },

        filterByDataScope: function (records, fieldsConfig, role, companyId) {
            return permissions.filterByDataScope(records, fieldsConfig, role, companyId);
        },

        applyUIConstraints: function () {
            return permissions.applyUIConstraints();
        },

        // Универсальная точка проверки прав для новых модулей.
        // Вызывать как ctx.permissions.can('sk', 'manage').
        // Внутренняя реализация (конфиг-матрица role×module×action) — отдельная фаза.
        can: function (module, action) {
            var self = this;
            var key = module + ':' + action;
            var map = {
                'sk:manage':         function () { return self.canManageSK(); },
                'hierarchy:manage':  function () { return self.canManageHierarchy(); },
                'knowledge:edit':    function () { return self.canEditKnowledgeBase(); },
                'knowledge:view':    function () { return self.canViewKnowledgeBase(); },
                'roles:manage':      function () { return self.canManageRoles(); },
                'objects:manage':    function () { return self.canManageObjects(); },
                'inspection:create': function () { return self.canCreate(); },
                'inspection:push':   function () { return self.canPush(); },
                'inspection:edit':   function () { return self.canEdit(); },
                'inspection:delete': function () { return self.canDelete(); }
            };
            var handler = map[key];
            if (typeof handler === 'function') {
                return handler();
            }
            console.warn('[RBI.permissions.can] unknown module:action =', key);
            return false;
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.permissions', window.RBI.services.permissions);
    }

    console.log('[RBI Service] permissions loaded');
}());
