# SERVICES_API.md — Справочник сервисов RBI Platform

> Все сервисы доступны через `ctx.services.*` (внутри модулей) или напрямую через `window.RBI.services.*`.
> Не обращаться к `dbPut`, `dbGet`, `STORES`, `triggerSync` напрямую — использовать сервисы.

---

## storage — `ctx.storage` / `window.RBI.services.storage`

Legacy wrapper над IndexedDB helpers. Регистрация: `service.storage`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `stores()` | `→ STORES{}` | Возвращает объект STORES |
| `get(store, key)` | `async → record` | Читает одну запись по ключу |
| `getAll(store)` | `async → []` | Читает все записи стора |
| `put(store, data)` | `async → void` | Сохраняет запись |
| `delete(store, key)` | `async → void` | Удаляет запись |
| `clear(store)` | `async → void` | Очищает весь стор (обёртка над `dbClear`, добавлено 2026-07-11) |
| `putBatch(store, items[])` | `async → bool` | Пакетное сохранение |
| `generateId(entityType)` | `→ string` | Генерирует ID вида `type_<ts><rand>` |
| `softDelete(store, id)` | `async → bool` | Мягкое удаление (is_deleted, _deleted, syncStatus='pending') |
| `save(store, record)` | `async → record` | Сохранение с гарантией created_at, updated_at, syncStatus |

---

## sync — `ctx.sync` / `window.RBI.services.sync`

Legacy wrapper над sync.js. Регистрация: `service.sync`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getConfig()` | `→ syncConfig` | Текущий конфиг синхронизации |
| `isEnabled()` | `→ bool` | Синхронизация включена? |
| `isSyncing()` | `→ bool` | Идёт ли синхронизация прямо сейчас? |
| `init()` | `async → bool` | Инициализация синхронизации |
| `trigger(mode?)` | `async → bool` | Запустить синхронизацию (`'silent'` по умолчанию) |
| `enqueue(type, payload)` | `→ bool` | Добавить в очередь синхронизации |
| `markDirty(flag?)` | `→ bool` | Пометить данные как «нужна синхронизация» |
| `markSynced(record)` | `→ record` | Выставить syncStatus/sync_status='synced' |
| `markPending(record)` | `→ record` | Выставить syncStatus/sync_status='pending' |
| `getStatus(record)` | `→ string` | Прочитать канонический статус синхронизации |
| `STATUS` | `Object (freeze)` | Константы: LOCAL, PENDING, SYNCED, CONFLICT, ERROR |

---

## config — `ctx.config` / `window.RBI.services.config`

Legacy wrapper над `window.APP_CONFIG` (перенесено из `js/config.js`). Регистрация: `service.config`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getSupabaseUrl()` | `→ string` | `window.APP_CONFIG.SUPABASE_URL` |
| `getSupabaseKey()` | `→ string` | `window.APP_CONFIG.SUPABASE_KEY` (anon JWT) |
| `getConfig()` | `→ window.APP_CONFIG` | Весь объект конфигурации (для совместимости с `sync.service.getConfig()`) |

---

## session — `ctx.session` / `window.RBI.services.session`

Фасад над window.state / window.details / window.photos / window.currentTemplateKey / window.currentChecklist. Обратная совместимость — не заменяет хранилище.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getState()` | `→ state{}` | Живая ссылка на window.state |
| `getDetails()` | `→ details{}` | Живая ссылка на window.details |
| `getPhotos()` | `→ photos{}` | Живая ссылка на window.photos |
| `getTemplateKey()` | `→ string` | window.currentTemplateKey |
| `getChecklist()` | `→ groups[]` | window.currentChecklist |
| `setState(key, val)` | `→ void` | Мутирует window.state[key] |
| `setDetail(key, val)` | `→ void` | Мутирует window.details[key] |
| `addPhoto(posKey, src)` | `→ void` | Добавляет фото в window.photos[posKey] |
| `removePhoto(posKey, idx)` | `→ void` | Удаляет фото по индексу |
| `setTemplateKey(key)` | `→ void` | Устанавливает window.currentTemplateKey |
| `setChecklist(groups)` | `→ void` | Устанавливает window.currentChecklist |
| `isSessionEmpty()` | `→ bool` | Пустая ли сессия проверки? |
| `getSessionSnapshot()` | `→ {state,details,photos,templateKey}` | Снимок сессии (глубокая копия) |
| `restoreSession()` | `→ Promise<void>` | Восстанавливает сессию/историю/эталоны/отчёты из IndexedDB при старте (перенесено из `app.js`, Шаг 2); также доступна как `window.restoreSession` (temp global-alias для legacy-вызовов) |

---

## settings — `ctx.settings` / `window.RBI.services.settings`

Обёртка над window.appSettings + STORES.SETTINGS. Испускает EventBus-событие `settings:changed`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `get(key)` | `→ value` | Получить одну настройку |
| `getAll()` | `→ {}` | Копия всех настроек |
| `set(key, val)` | `async → void` | Установить настройку + сохранить в IndexedDB |
| `getTheme()` | `→ string` | Текущая тема (auto/light/dark/rbi-light/rbi-dark) |
| `setTheme(theme)` | `async → void` | Установить тему |
| `onChange(fn)` | `→ void` | Подписаться на изменения (резервный, до EventBus) |

---

## permissions — `ctx.permissions` / `window.RBI.services.permissions`

Wrapper над window.RbiRoles.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getCurrentRole()` | `→ string` | Текущая роль пользователя |
| `getCloudStatus()` | `→ string` | Статус облака (offline/…) |
| `getPermissions(role?, companyId?)` | `→ {}` | Объект разрешений роли; `companyId?` выбирает матрицу через `COMPANY_ROLE_MATRICES`/`_getRoleMatrix` (fallback `'rbi'`) |
| `isAdmin()` | `→ bool` | Администратор? |
| `isLeadership()` | `→ bool` | Руководство? |
| `canManageSK()` | `→ bool` | Управление СК |
| `canManageHierarchy()` | `→ bool` | Управление иерархией |
| `canCreate()` | `→ bool` | Создание записей |
| `canPush()` | `→ bool` | Push-синхронизация |
| `canEdit(ownerName?)` | `→ bool` | Редактирование |
| `canDelete(ownerName?)` | `→ bool` | Удаление |
| `canManageRoles()` | `→ bool` | Управление ролями |
| `canManageObjects()` | `→ bool` | Управление объектами |
| `canEditKnowledgeBase()` | `→ bool` | Редактирование базы знаний |
| `canViewKnowledgeBase()` | `→ bool` | Просмотр базы знаний |
| `getCurrentEngineerName()` | `→ string` | Имя текущего инженера |
| `getAssignedProjects()` | `→ string[]` | Закреплённые за пользователем проекты (`appSettings.assignedProjects`) |
| `getAssignedContractor()` | `→ string` | Закреплённый подрядчик пользователя (`appSettings.contractorName`) |
| `hasNoOwnObjects(role?)` | `→ bool` | `true`, если `dataScope` роли — `'none'` или `'all'` (роль без индивидуально закреплённых объектов) |
| `getDataScope(role?, companyId?)` | `→ string` | Декларативный `dataScope` роли (`'all'\|'ownProject'\|'ownContractor'\|'ownProjectOrOwnRecords'\|'none'`) — единая точка, которую читают `sk.actions.js`/`sync-engine.core.js`/`sync-push-pull.core.js` вместо буквальных `role === 'x'`; `companyId?` выбирает матрицу (fallback `'rbi'`) |
| `getAllowedModules(role?, companyId?)` | `→ string[]` | Список id реальных бизнес-platform-модулей (`BUSINESS_MODULE_IDS = ['quality','construction']`), разрешённых роли; в `ROLE_MATRIX` сейчас у всех 7 ролей одинаковое значение (осознанное решение пользователя «не ограничивать роли сейчас», 2026-07-13, §29 п.10в закрыт) — реально подключено к welcome-экрану через `js/core/app-shell.js`; пересечение с `company.enabledModules` выполняет `user-context.service.js` |
| `getContract(role?, companyId?)` | `→ { companyId, role, permissions }` | Контракт `{companyId, role, permissions}` из §23; `companyId?` реально используется для выбора матрицы прав через `_getRoleMatrix` (fallback `'rbi'` для неизвестной/не переданной компании) — параметризация §29 п.10б выполнена 2026-07-13 |
| `getAllRoles(companyId?)` | `→ { key, label }[]` | Все роли матрицы (по умолчанию `rbi`) с человекочитаемыми именами (для админ-UI) |
| `filterByDataScope(records, fieldsConfig, role?, companyId?)` | `→ []` | Клиентская фильтрация записей по `dataScope` роли; `fieldsConfig: { projectField, contractorField, ownerField }` — семантика идентична переносимой `sk_filterRecordsByAccess`; `companyId?` выбирает матрицу (fallback `'rbi'`) |
| `applyUIConstraints()` | `→ void` | Применяет `read-only-mode`/`data-requires-create`/`data-rbi-role`/`data-rbi-cloud-status` к DOM по текущим правам |
| `can(module, action)` | `→ bool` | Универсальная точка проверки прав для новых модулей (`ctx.permissions.can('sk','manage')`); внутри — конфиг-карта на существующие методы выше, `console.warn` при неизвестной паре |

---

## inspections — `ctx.inspections` / `window.RBI.services.inspections`

Wrapper над STORES.HISTORY. Регистрация: `service.inspections`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `normalize(record)` | `→ record` | Нормализация полей (module, entityType, _deleted, syncStatus) |
| `getAll()` | `async → []` | Все записи истории проверок (нормализованные) |
| `getActive()` | `async → []` | Только не удалённые |
| `getById(id)` | `async → record\|null` | По ID |
| `save(record)` | `async → record` | Сохранить проверку (updated_at, source='local', syncStatus='not_synced') |
| `softDelete(id)` | `async → record\|false` | Мягкое удаление |
| `getAllSync()` | `sync → []` | Живой in-memory массив (`HistoryState.allRecords` либо `window.contractorArray`) |
| `pushSync(item)` | `sync → bool` | Добавить запись в живой массив |
| `setAllSync(arr)` | `sync → []` | Заменить весь живой массив целиком — пишет **одновременно** в `window.contractorArray` и `HistoryState` (если он есть), т.к. большинство модулей (`sk`/`construction`/`tasks`/`analytics`/`audit`/`meetings`/`interventions`/`knowledge`/`smart-input`) читают bare `window.contractorArray` без `HistoryState`-фоллбэка. Используется демо-режимом (`app-mode-utils.js`) и `_clearHistory()` (`settings.actions.js`) |
| `getAllForAnalyticsSync()` | `sync → []` | Живой массив для аналитики |
| `getDefectCausesSync()` | `sync → []` | `window.DEFECT_CAUSES` |

---

## tasks — `ctx.tasks` / `window.RBI.services.tasks`

Wrapper над STORES.TASKS, STORES.SCHEDULE, STORES.MEETINGS.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getAllTasks()` | `async → []` | Все задачи |
| `getTask(id)` | `async → record` | Задача по ID |
| `saveTask(task)` | `async → record` | Сохранить задачу (updated_at, markDirty('tasks')) |
| `deleteTask(id)` | `async → bool` | Мягкое удаление задачи |
| `getAllSchedule()` | `async → []` | Все этапы графика |
| `getAllMeetings()` | `async → []` | Все совещания |
| `getTasksSync()`/`ensureTasksSync()`/`setTasksSync(arr)` | `sync → []` | Живой in-memory `window.rbi_tasksData` |
| `getScheduleSync()`/`ensureScheduleSync()`/`setScheduleSync(arr)` | `sync → []` | Живой in-memory `window.rbi_scheduleData` |
| `getFmeaSync()`/`ensureFmeaSync()`/`setFmeaSync(arr)` | `sync → []` | Живой in-memory `window.rbi_fmeaRecords` |
| `getPracticesSync()`/`ensurePracticesSync()`/`setPracticesSync(arr)` | `sync → []` | Живой in-memory `window.rbi_practicesData` |
| `getInterventionsSync()`/`ensureInterventionsSync()`/`setInterventionsSync(arr)` | `sync → []` | Живой in-memory `window.rbi_interventionsData` |
| `getMeetingsSync()`/`ensureMeetingsSync()`/`setMeetingsSync(arr)` | `sync → []` | Живой in-memory `window.rbi_meetingsData` |

---

## templates — `ctx.templates` / `window.RBI.services.templates`

Единая точка доступа к шаблонам проверок. CRUD для пользовательских шаблонов с делегированием в app.js + эмит events.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getUserTemplates()` | `→ {}` | Пользовательские шаблоны (объект по `slug`) |
| `getSystemTemplates()` | `→ {}` | Системные шаблоны |
| `getByKey(key)` | `→ template\|null` | Шаблон по ключу (system + user) |
| `getAll()` | `→ []` | Все шаблоны (system + user) |
| `isSystemTemplate(key)` | `→ bool` | Является ли системным |
| `saveUserTemplate(data)` | `→ void` | Сохранить/обновить пользовательский шаблон |
| `deleteUserTemplate(key)` | `→ void` | Удалить пользовательский шаблон |
| `replaceUserTemplates(obj)` | `→ {}` | Заменить весь объект пользовательских шаблонов целиком (используется при первичной загрузке из IndexedDB/localStorage; сервис теперь физический владелец `userTemplates`, перенесено из `js/core/bootstrap.js`) |

---

## masterData — `ctx.masterData` / `window.RBI.services.masterData`

Агрегатор мастер-данных (SYSTEM_TEMPLATES, SYSTEM_DOCS, SYSTEM_NODES, SYSTEM_TWI, FAQ_DATA).

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getSystemTemplates()` | `→ {}` | Системные шаблоны |
| `getUserTemplates()` | `→ {}` | Пользовательские шаблоны (объект по `slug`) |
| `getTemplateByKey(key)` | `→ template\|null` | Шаблон по ключу |
| `getSystemDocs()` | `→ []` | Системные документы (база знаний) |
| `getSystemNodes()` | `→ {}` | Системные узлы |
| `getSystemTwi()` | `→ []` | TWI-карточки |
| `getFaqData()` | `→ []` | FAQ |

---

## analytics — `ctx.analytics` / `window.RBI.services.analytics`

Обёртка над глобальными функциями аналитики (analytics.js, app.js, math.js).

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getAnalyticsDataSource(mode)` | `→ []` | Данные по режиму 'local'\|'cloud' |
| `getFilteredAnalyticsData()` | `→ []` | Отфильтрованные данные |
| `getContractorAnalytics(data, filters)` | `→ object\|null` | Аналитика по подрядчику |
| `getAnalyticsFilters()` | `→ filters` | Текущие активные фильтры |

---

## appMode — `ctx.appMode` / `window.RBI.services.appMode`

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getMode()` | `→ string` | Текущий режим (по умолчанию 'quality') |
| `setMode(mode)` | `→ void` | Сменить режим + эмит `appMode:changed` |
| `isDemo()` | `→ bool` | Демо-режим? |
| `isOffline()` | `→ bool` | Нет сети? |

---

## shell — `ctx.shell` / `window.RBI.services.shell`

App Shell, Шаг 1 (§29, п.9) + App Shell Блок 2 (§29, п.9, multi-select выбора рабочих модулей + company block, 2026-07-13). Тонкие обёртки над существующими DOM-точками — не переносит и не дублирует логику `views.js`/`app-mode-utils.js`/`layout.utils.js`/`notify.utils.js`/`sync.js`. Регистрация: `core.shell` (в `js/core/`, не `js/services/` — часть Core по целевой цепочке).

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getContentRoot()` | `→ HTMLElement\|null` | `#app-content` |
| `getModalsRoot()` | `→ HTMLElement\|null` | `#app-modals` |
| `getHeaderEl()` | `→ HTMLElement\|null` | `#main-header` |
| `getBottomNavEl()` | `→ HTMLElement\|null` | `#main-bottom-nav` |
| `showToast(message)` | `→ void` | Делегирует в существующий `window.showToast` |
| `isOnline()` | `→ bool` | Делегирует в `navigator.onLine` |
| `onOnlineStatusChange(handler)` | `→ void` | Подписка на `window` `online`/`offline` (тонкая обёртка, не заменяет прямые слушатели в `bootstrap.js`/`sync.js`) |
| `getSyncStatusEl()` | `→ HTMLElement\|null` | `#header-sync-status` (`sync.js` продолжает писать туда напрямую) |
| `getUserBlockEl()` | `→ HTMLElement\|null` | `#header-user-block` (новый узел, App Shell Шаг 2, 2026-07-08) |
| `renderUserBlock(userContext)` | `→ void` | Устанавливает `textContent = "<name> · <role>"` в `#header-user-block`, если узел и `userContext` существуют. Единственный реальный вызов — из `js/core/app.entry.js` после `platform:ready`, с `ctx.userContext.getUserContext()`. |
| `getSelectedModules()` | `→ string[]` | Читает `localStorage.rbi_selected_business_modules`; fallback (пусто/невалидно) — `['quality','construction']` (оба текущих бизнес-модуля, 0 регрессии для существующих пользователей) |
| `setSelectedModules(ids)` | `→ string[]` | Валидирует `ids` (только `quality`/`construction`), сохраняет в localStorage, обновляет `<option>` `#app-mode-selector` и видимость `#app-mode-selector-container`. Возвращает применённый список |
| `renderModuleSelection()` | `→ void` | Рендерит 10 карточек в `#platform-entry-modules`: 2 toggle-карточки бизнес-модулей (`quality`/`construction`) + 8 disabled-карточек §20 placeholder-направлений (без `onclick`, не выбираемые) |
| `toggleModuleSelection(moduleId)` | `→ void` | Переключает `moduleId` в текущем (несохранённом) выборе экрана выбора модулей; не даёт снять последний выбранный модуль |
| `applyModuleSelection()` | `→ void` | Сохраняет текущий выбор экрана через `setSelectedModules()`, закрывает `#platform-entry-modal`, вызывает `renderSidebar()` |
| `renderCompanyBlock()` | `→ void` | Пишет `CompanyService.getCompany().name` (+ индикатор офлайн через `isOnline()`) в `#header-company-block` |
| `renderSidebar()` | `→ void` | Sidebar-навигация, icon-rail, вариант A (§29 п.9, 2026-07-15). Рендерит в `#app-sidebar` (fixed, виден только ≥768px, см. CSS) вертикальный список: разрешённые ролью + включённые пользователем бизнес-модули (`quality`/`construction`, иконка+подпись, клик → `window.changeAppMode(id)`) + 8 disabled-заглушек §20. Подсвечивает активный модуль (`.active`) по `AppModeManager.currentMode`. Вызывается при загрузке `app-shell.js`, из `applyModuleSelection()` и из `AppModeManager.init()`/`changeMode()` (`app-mode-utils.js`) |

---

## userContext — `ctx.userContext` / `window.RBI.services.userContext`

Auth Gate + User Context, Шаг 1 (§29, п.10). Read-only снимок, агрегирует существующие источники (`permission.service.js`, `app-mode.service.js`, `window.syncConfig.projectCode`, `company.service.js`), не создаёт нового состояния и ничего не пишет в них. Регистрация: `service.userContext`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getUserContext()` | `→ { id, name, role, companyId, projectCode, availableModules, defaultModule }` | Новый объект при каждом вызове (не живая ссылка). `id`/`name` — `permissions.getCurrentEngineerName()`; `role` — `permissions.getCurrentRole()`; `companyId` — делегирует в `company.getCompany().id` (2026-07-08, §29 п.11; fallback на константу `'rbi'`, если `company`-сервис не загружен); `projectCode` — `window.syncConfig.projectCode` (только чтение); `availableModules` — делегирует в `company.getCompany().enabledModules` (fallback на статический список 7 id, если `company`-сервис не загружен); `defaultModule` — `appMode.getMode()` |

---

## company — `ctx.company` / `window.RBI.services.company`

Minimal Company Context (§29, п.11, 2026-07-08). Read-only config/context-объект (не сервис с бизнес-логикой, не multi-tenant engine — см. §17 `PLATFORM_TARGET_ARCHITECTURE.md`). Единственная существующая компания (single-tenant). Регистрация: `service.company`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getCompany()` | `→ { id, name, enabledModules }` | Новый объект при каждом вызове (не живая ссылка). `id: 'rbi'`, `name: 'RBI'`, `enabledModules` — статический список 7 текущих platform-модулей (`['quality','sk','settings','knowledge','construction','game','ai']`). Единственный текущий потребитель — `UserContextService.getUserContext()` (`availableModules`/`companyId`). Ни один бизнес-модуль (`js/modules/**`) не потребляет `ctx.company` (YAGNI). |

---

## files — `ctx.files` / `window.RBI.services.files`

Wrapper над PhotoManager, rbiHydrateLocalImages. Регистрация: `service.files`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getPhotoUrl(src)` | `async → string` | Асинхронный URL фото |
| `hydrateLocalImages(root?)` | `async → void` | Подставить локальные изображения в DOM |
| `placeholder()` | `→ string` | Placeholder-URL для фото |

---

## reports — `ctx.reports` / `window.RBI.services.reports`

Wrapper над STORES.REPORTS.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getAll()` | `async → []` | Все отчёты |
| `getActive()` | `async → []` | Не удалённые |
| `save(report)` | `async → record` | Сохранить отчёт |
| `softDelete(id)` | `async → bool` | Мягкое удаление |
| `getAllSync()` | `sync → []` | Живой in-memory `window.reportsArray` |
| `upsertSync(record)` | `sync → record` | Обновить/добавить запись в живой `window.reportsArray` |
| `getExpertConclusions()` | `→ {}` | Живой `window.customExpertConclusions` |
| `getExpertConclusion(key)` | `→ value` | Одно значение из `customExpertConclusions` |
| `setExpertConclusion(key, val)` | `→ void` | Мутирует `window.customExpertConclusions[key]` |
| `deleteExpertConclusion(key)` | `→ void` | Удаляет ключ из `window.customExpertConclusions` |

---

## knowledge — `ctx.knowledge` / `window.RBI.services.knowledge`

Wrapper над Knowledge-сторами (TWI_CARDS, CUSTOM_DOCS, CUSTOM_NODES, ETALON_ACTS, ETALON_DRAFT).

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getAllTwiCards()` | `async → []` | TWI-карточки |
| `getAllCustomDocs()` | `async → []` | Пользовательские документы |
| `getAllCustomNodes()` | `async → []` | Пользовательские узлы |
| `getAllEtalonActs()` | `async → []` | Эталонные акты (два вида в одном сторе ETALON_ACTS, различаются полем `record.source_kind`: `'act_v18'` — структурированный акт из конструктора «Акт-Эталон (Бета)», отсутствие поля/любое другое значение — старый упрощённый акт из `openEtalonConstructor`) |
| `getAllEtalonDraft()` | `async → []` | Черновики эталонов |
| `saveCustomDoc(doc)` | `async → record` | Сохранить документ |
| `deleteCustomDoc(id)` | `async → bool` | Мягкое удаление документа (тонкий мост над `window.deleteCustomDoc`) |
| `openTwiViewer(id)` | `→ void` | Тонкий мост над `window.openTwiViewer` |
| `renderTwiList()` / `renderDocsList()` / `renderNodesList()` | `→ void` | Тонкие мосты над одноимёнными `window.*` рендер-функциями `knowledge.module.js` |
| `openTwiConstructor(editId?)` / `openNodeViewer(id)` / `openNodeConstructor(id)` | `→ void` | Тонкие мосты над одноимёнными `window.*` |
| `reloadReferenceMemory()` | `async → void` | Тонкий мост над `window.rbi_reloadReferenceMemory` |
| `getMagicTwiCandidates()` | `→ []` | Тонкий мост над `window.getMagicTwiCandidates` |
| `populateTwiItemSelect(itemId)` / `changeTwiType(type)` / `renderGoodPhoto(src)` / `renderBadPhoto(src)` | `→ void` | Тонкие мосты над одноимёнными `window.*` (используются в конструкторе TWI) |
| `openItemHelp(id, event)` | `→ void` | Тонкий мост над `window.openItemHelpMenu` |
| `requireEditRight()` | `→ bool` | Проверка `permissions.canEditKnowledgeBase()`, при отказе показывает toast (эквивалент бывшего `rbi_requireKnowledgeEditRight`) |
| `canDeleteItem(ownerName)` | `→ bool` | Делегирует в `permissions.canDelete(ownerName)` (эквивалент бывшего `rbi_canDeleteKnowledgeItem`) |
| `getTwiTypeSync()` | `sync → string` | Живой in-memory `window.currentTwiType` (`'INSPECTOR'`\|`'WORKER'`\|`'PDF'`, добавлено 2026-07-11) |
| `getTwiStepCountSync()`/`setTwiStepCountSync(n)` | `sync → number` | Живой in-memory `window.twiStepCount` (счётчик шагов конструктора TWI, добавлено 2026-07-11) |

---

## sk — `ctx.sk` / `window.RBI.services.sk`

Wrapper над SK-сторами (SK_RECORDS, SK_VOLUMES, SK_IMPORT_BATCHES, SK_CONTRACTOR_MAP, SK_CATEGORY_MAP, SK_MAPPING, SK_ISD_HISTORY).

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getSkRecords()` | `async → []` | Все СК-записи (`STORES.SK_RECORDS`) |
| `getSkRecord(id)` | `async → record` | СК-запись по ID |
| `saveSkRecord(record)` | `async → record` | Сохранить СК-запись |
| `deleteSkRecord(id)` | `async → record\|false` | Мягкое удаление |
| `getSkVolumes()` | `async → []` | Объёмы СК |
| `getImportBatches()` | `async → []` | Пакеты импорта Excel |
| `getContractorMap()` | `async → []` | Карта подрядчиков (персистентная, IndexedDB) |
| `getCategoryMap()` | `async → []` | Карта категорий |
| `getSkMapping()` | `async → []` | Маппинг полей импорта |
| `getIsdHistory()` | `async → []` | История ИСД |
| `getRecordsSync()`/`setRecordsSync(arr)`/`ensureRecordsSync()` | `sync → []` | Живой in-memory `window.skRecords` |
| `getVolumesSync()`/`setVolumesSync(obj)` | `sync → {}` | Живой in-memory `window.skVolumes` |
| `getContractorMapSync()`/`setContractorMapSync(obj)` | `sync → {}` | Живой in-memory `window.skContractorMap` (не путать с персистентным `getContractorMap()` выше) |
| `getTempRawHeadersSync()`/`setTempRawHeadersSync(arr)` | `sync → []` | Живой in-memory `window.skTempRawHeaders` — временный буфер заголовков Excel-импорта на время активной сессии импорта (добавлено 2026-07-11) |
| `getBadRemarksSync()`/`setBadRemarksSync(arr)` | `sync → []` | Живой in-memory `window.skBadRemarks` — замечания без нормативной ссылки, собираются при рендере HR-вкладки (добавлено 2026-07-11) |
| `canManageSK()` | `→ bool` | Делегирует в `permissions.canManageSK()` |

---

## game — `ctx.game` / `window.RBI.services.game`

Синхронная обёртка над живыми in-memory глобалами геймификации (`game.state.js`/`game.actions.js`/`game.render.js`). Регистрация: `service.game`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `getWeeklyPlanSync()`/`setWeeklyPlanSync(obj)` | `sync → {weekId, tasks, completed}` | Живой in-memory `window.weeklyPlanData` |
| `getContractorStatusesSync()`/`ensureContractorStatusesSync()` | `sync → {}` | Живой in-memory `window.contractorStatuses` |
| `getGameActionLogsSync()`/`setGameActionLogsSync(arr)` | `sync → []` | Живой in-memory `window.gameActionLogs` |
| `getEngineerAbsenceSync()` | `sync → {isActive, reason, startDate, endDate}` | Живой in-memory `window.engineerAbsence` |
| `getCurrentProfileDataSync()` | `sync → object\|null` | Живой in-memory `window.currentProfileData` (профиль текущего инженера, заполняется `gameRenderDashboard()`, добавлено 2026-07-11) |
| `logAction(actionType, targetId)` | `→ void` | Делегирует в `window.gameLogAction` |
| `calculateImpact(inspector, contractor, template)` | `→ number` | Делегирует в `window.calculateImpactScore` |
| `startInspection(contractor, templateKey, statusKey, project, originalAuditId)` | `→ void` | Делегирует в `window.startInspectionWithValues` |
| `calculateAllProfiles()` | `→ {}` | Делегирует в `window.gameCalculateAllProfiles` |
| `calculateManagerMetrics()` | `→ []` | Делегирует в `window.gameCalculateManagerMetrics` |
| `renderDashboard()` | `→ void` | Делегирует в `window.gameRenderDashboard` |
| `updatePlanProgress()` | `→ void` | Делегирует в `window.gameUpdatePlanProgress` |
| `toggleAbsence()` | `→ void` | Делегирует в `window.gameToggleAbsence` |
| `saveWeeklyPlan()` | `→ void` | Делегирует в `window.saveWeeklyPlan` |
| `getWeekId(date)` | `→ string\|null` | Делегирует в `window.getWeekId` |
| `getStartOfWeek(date)` | `→ Date\|null` | Делегирует в `window.getStartOfWeek` |

---

## objects — `ctx.objects` / `window.RBI.services.objects`

Wrapper над window.ObjectDirectory. Регистрация: `service.objects`.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `init()` | `async → bool` | Инициализация каталога объектов |
| `list()` | `→ []` | Список объектов |
| `aliases()` | `→ {}` | Алиасы объектов |
| `normalize(rawName, opts?)` | `async → {status, raw_name, canonical_key, display_name}` | Нормализация названия объекта |

---

## contractors — `ctx.contractors` / `window.RBI.services.contractors`

Wrapper над window.ContractorDirectory.

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `init()` | `async → bool` | Инициализация каталога подрядчиков |
| `list()` | `→ []` | Список подрядчиков |
| `aliases()` | `→ {}` | Алиасы подрядчиков |
| `normalize(rawName)` | `async → {status, raw_name, canonical_key, display_name}` | Нормализация названия подрядчика |

---

## ai — `ctx.ai` / `window.RBI.services.ai`

Единая точка доступа к AI (обёртка над window.callAI).

| Метод | Сигнатура | Описание |
|-------|-----------|---------|
| `call(messages, options?)` | `async → response` | Вызов AI (делегирует в window.callAI) |
| `isEnabled()` | `→ bool` | AI включён в настройках? |
| `getAuthMode()` | `→ string` | Режим аутентификации ('corporate' по умолчанию) |
| `isAvailable()` | `→ bool` | window.callAI доступен прямо сейчас? |
| `extractTextFromPdf(url)` и 18 других bridged-имён (`generatePulseAi`, `generateHeatmapAi`, `rbi_generateMeetingMemo`, `sk_aiMapColumns`, `rbi_normalizeFeedbackAi` и т.д.) | `→ passthrough` | Ленивый passthrough-мост к одноимённой `window.<name>` (владелец `ai.actions.js`) — полный список имён см. `BRIDGED_NAMES` в `js/services/ai.service.js`, не дублировать здесь построчно |

---

## Использование в модулях

```js
// В init(ctx) модуля:
const storage = ctx.services.storage;
const sync    = ctx.services.sync;

// Сохранить запись:
await storage.save(STORES.TASKS, record);
sync.markDirty('tasks');

// Читать:
const items = await storage.getAll(STORES.TASKS);
```
