# Module Cross-Reference Map

> Снимок: 2026-07-11 (Архитектор, разведочный аудит по прямому запросу пользователя). Собрано параллельным Grep/Read-аудитом всех runtime-файлов `js/modules/**`, `js/core/**`, `js/services/**`, `js/shared/**`.

## Назначение файла

Эта карта — справочник, который заменяет повторное сканирование проекта «на всякий случай» перед каждым блоком, связанным с межмодульной изоляцией (§29 п.12, критерий готовности Foundation «каждый platform module физически изолирован»). Она отвечает на 2 вопроса без чтения кода:

1. **Что делает каждый файл** (краткий индекс по модулям/слоям).
2. **Кто на кого напрямую ссылается bare `window.*`** (нарушение целевой архитектуры — должно идти через `ctx`/`window.RBI.services.*`/EventBus) — против легитимных путей через сервисы.

**Не источник истины по публичным методам сервисов** — для этого используется `_ai/SERVICES_API.md`. Эта карта — только про то, **что** ещё вызывается bare и **где**.

## Как читать таблицы связей

- **НАРУШЕНИЕ** — прямой bare `window.*`/global вызов функции или структуры данных другого модуля, минуя `ctx`/`window.RBI.services.*`/EventBus. Кандидат на устранение в блоке физической изоляции.
- **легитимно** — вызов идёт через `window.RBI.services.*`/`ctx.*`, это целевая архитектура, трогать не нужно.
- **fallback НАРУШЕНИЕ** — основной путь идёт через сервис (легитимно), но при недоступности сервиса код проваливается в bare-глобаль — сам fallback остаётся техдолгом более низкого приоритета (сервис почти всегда доступен), но при полном устранении техдолга §16 эти fallback тоже должны исчезнуть.
- **IN_PROGRESS (план 2026-07-11)** — уже покрыто текущим активным блоком архитектора (`quality↔knowledge`, см. `_ai/current_plan.md` от 2026-07-11) — не дублировать в новом плане, эти строки обновит Исполнитель после блока.
- Внутримодульные обращения (между файлами одного и того же platform module) **не считаются нарушением** и не включены в таблицы связей.

---

## Platform module: quality

### Файлы

| Файл | Feature | Назначение |
|---|---|---|
| `js/modules/quality/quality.module.js` | quality (root) | Агрегатор feature-модулей quality: последовательно инициализирует 9 под-модулей через `window.RBI.registry` |
| `js/modules/quality/index.js` | quality (root) | Публичная точка входа модуля quality для Core и module-loader |
| `js/modules/quality/manifest.js` | quality (root) | Паспорт platform module quality: маршруты, меню, метаданные |
| `js/modules/quality/features/audit/audit.module.js` | audit | Контракт платформы feature «Аудит»: init/mount/unmount, подписки на события |
| `js/modules/quality/features/audit/audit.actions.js` | audit | Бизнес-действия вкладки «Аудит»: сохранение проверок, комментарии, эскалации |
| `js/modules/quality/features/audit/audit.state.js` | audit | Изолированное состояние сеанса аудита (ссылки на `window.state`/`details`/`photos`) |
| `js/modules/quality/features/audit/audit.render.js` | audit | Рендер дашборда и UI вкладки «Аудит» |
| `js/modules/quality/features/history/history.module.js` | history | Оркестратор feature «История»: загрузка записей, подписка на sync |
| `js/modules/quality/features/history/history.actions.js` | history | Бизнес-действия истории: загрузка, удаление, фильтрация |
| `js/modules/quality/features/history/history.state.js` | history | Единый источник правды для данных истории проверок (`HistoryState`) |
| `js/modules/quality/features/history/history.render.js` | history | Рендер списка истории: фильтрация, группировка, детальный просмотр актов |
| `js/modules/quality/features/tasks/tasks.module.js` | tasks | Полная бизнес-логика задач инженера (legacy-монолит, ~1500 строк) |
| `js/modules/quality/features/tasks/tasks.actions.js` | tasks | Тонкий фасад CRUD задач через `ctx.tasks` |
| `js/modules/quality/features/tasks/tasks.state.js` | tasks | Изолированное состояние модуля Tasks |
| `js/modules/quality/features/tasks/tasks.render.js` | tasks | Делегат рендера задач в legacy `window`-функции |
| `js/modules/quality/features/reports/reports.module.js` | reports | Контракт платформы Reports: фасад над legacy `export.js` |
| `js/modules/quality/features/reports/reports.actions.js` | reports | Бизнес-действия отчётов: генерация PDF, AI-отчёты, шаблоны |
| `js/modules/quality/features/reports/reports.state.js` | reports | Состояние модуля Reports (`activeReportType`, `reportsArray`) |
| `js/modules/quality/features/reports/reports.render.js` | reports | Диспетчер рендера отчётов, делегирует в `export.js` |
| `js/modules/quality/features/analytics/analytics.module.js` | analytics | Оркестратор аналитики: синхронизация состояния, подписка на sync |
| `js/modules/quality/features/analytics/analytics.actions.js` | analytics | Бизнес-логика аналитики: графики, фильтры, экспертные заключения |
| `js/modules/quality/features/analytics/analytics.state.js` | analytics | Изолированное состояние аналитики (режим, фильтры, графики) |
| `js/modules/quality/features/analytics/analytics.render.js` | analytics | HTML-генерация дашбордов, Chart.js, Quality Day |
| `js/modules/quality/features/etalon/etalon.module.js` | etalon | Контракт платформы Etalon: фасад над legacy `etalon.js` |
| `js/modules/quality/features/etalon/etalon.actions.js` | etalon | Бизнес-действия актов-эталонов: создание, сохранение, удаление |
| `js/modules/quality/features/etalon/etalon.state.js` | etalon | Изолированное состояние модуля Etalon |
| `js/modules/quality/features/etalon/etalon.render.js` | etalon | Диспетчер рендера: делегирует в `EtalonActions` |
| `js/modules/quality/features/engineer/engineer.module.js` | engineer | Контракт платформы Engineer: фасад вкладки инженера |
| `js/modules/quality/features/engineer/engineer.actions.js` | engineer | Делегат действий Engineer в legacy `app.js`-функции |
| `js/modules/quality/features/engineer/engineer.state.js` | engineer | Состояние вкладки инженера (подвкладка, флаг загрузки) |
| `js/modules/quality/features/engineer/engineer.render.js` | engineer | Диспетчер рендера по подвкладкам Engineer |
| `js/modules/quality/features/schedule/schedule.module.js` | schedule | Контракт платформы Schedule (график СМР) |
| `js/modules/quality/features/schedule/schedule.actions.js` | schedule | Бизнес-логика расписания: импорт Excel, CRUD этапов |
| `js/modules/quality/features/schedule/schedule.state.js` | schedule | Флаг наличия данных графика `rbi_scheduleData` |
| `js/modules/quality/features/schedule/schedule.render.js` | schedule | Рендер графика Ганта и этапов расписания |
| `js/modules/quality/features/meetings/meetings.module.js` | meetings | Полная бизнес-логика протоколов совещаний |
| `js/modules/quality/features/meetings/meetings.actions.js` | meetings | Тонкий фасад-делегат в legacy `window.rbi_*`-функции |
| `js/modules/quality/features/meetings/meetings.state.js` | meetings | Флаг наличия данных `rbi_meetingsData` |
| `js/modules/quality/features/meetings/meetings.render.js` | meetings | Делегат рендера в `rbi_renderMeetingTab` |
| `js/modules/quality/features/interventions.js` | interventions | Модуль «Воздействия и Практики»: интервенции, best practices, публикация TWI |
| `js/modules/quality/features/reference/reference.js` | reference | Справочник чек-листов: рендер, конструктор, Excel импорт/экспорт |
| `js/modules/quality/features/shared/multi-filter.js` | shared | Общая модалка мульти-фильтров для history и analytics |

### Исходящие межмодульные связи (quality → другие модули)

> **construction** — обращений к `window.ConstManager`/`ConstAcceptance`/`TransferManager`/`ConstDefectForm`/`ConstructionActions` из quality не найдено.

| Файл:строки | Целевой модуль | Что вызывается | Тип |
|---|---|---|---|
| audit.actions.js:22–24 | settings | `window.RBI.services.settings.get` | легитимно (2026-07-11, fallback устранён) |
| audit.actions.js:28–30 | settings | `window.RBI.services.settings.set` | легитимно (2026-07-11, fallback устранён) |
| audit.actions.js:55–57 | settings/app-mode | `window.RBI.services.appMode.isDemo` | легитимно (2026-07-11, fallback устранён) |
| audit.actions.js:41–44 | gamification | `window.RBI.services.game.logAction` / fallback `gameLogAction()` | легитимно (fallback НАРУШЕНИЕ) |
| audit.actions.js:350, 386 | core (permissions) | `window.RBI.services.permissions.canCreate()`, `getCurrentRole()` | легитимно (2026-07-11) |
| audit.actions.js:478, 481, 862 | gamification | `_gameLogAction(...)` | через хелпер (сервис + bare fallback) |
| audit.actions.js:670–671 | quality (intramodule, tasks feature) | `gameGenerateWeeklyPlan(true)` | не межмодульное (см. `current_plan.md` блок 2026-07-11) |
| audit.actions.js:672–673 | gamification | `window.RBI.services.game.updatePlanProgress()` | легитимно (2026-07-11) |
| audit.actions.js:926 | settings/app-mode | `window.isDemoMode` | НАРУШЕНИЕ |
| audit.render.js:12–14 | settings | `window.RBI.services.settings.get` | легитимно (2026-07-11, fallback устранён) |
| audit.render.js:20–23 | knowledge | `getTwiCardsSync` / fallback `window.customTwiCards` | легитимно (fallback НАРУШЕНИЕ) |
| audit.render.js:416 | knowledge | `window.RBI.services.knowledge.openItemHelp(id, event)` | легитимно |
| audit.render.js (mountAuditMarkup, IIFE верхнего уровня) | core (app-shell) | `window.RBI.services.shell.getContentRoot()` (fallback `document.getElementById('app-content')`) | легитимно (2026-07-15, Блок 1/N «перенос статичной разметки quality в JS-рендер» — монтаж `#tab-audit` в App Shell content root) |
| history.actions.js:55–57 | core (inspections) | `ctx.inspections.getAll()` | легитимно |
| history.actions.js:161, 163, 173 | core (permissions) | `_permissions(ctx).canCreate()`, `canDelete(ownerName)` | легитимно (2026-07-14, `_ctx.permissions` приоритет, fallback `window.RBI.services.permissions` устранён из первичного пути) |
| history.actions.js:222 | quality (intramodule, tasks feature) | `gameForceUpdatePlan(true)` | не межмодульное (см. `current_plan.md` блок 2026-07-11) |
| history.render.js:16–21 | knowledge | `_ctx.knowledge.getEtalonActsSync()` / fallback `window.RBI.services.knowledge` / `window.etalonActsArray` | легитимно (2026-07-14, `_ctx` приоритет, fallback НАРУШЕНИЕ на нижнем уровне) |
| tasks.module.js:17–19 | settings | `window.RBI.services.settings.get` | легитимно (2026-07-11, fallback устранён) |
| tasks.module.js:21–23 | settings/app-mode | `window.RBI.services.appMode.isDemo` | легитимно (2026-07-11, fallback устранён) |
| tasks.module.js:77–80 | ai | `window.RBI.services.ai.call` / fallback `window.callAI(...)` | легитимно (fallback НАРУШЕНИЕ) |
| tasks.module.js:93–96 | knowledge | `getTwiCardsSync` / fallback `window.customTwiCards` | легитимно (fallback НАРУШЕНИЕ) |
| tasks.module.js:100–103 | knowledge | `getEtalonActsSync` / fallback `window.etalonActsArray` | легитимно (fallback НАРУШЕНИЕ) |
| tasks.module.js:107–118 | gamification | `getWeeklyPlanSync`/`setWeeklyPlanSync` / fallback `window.weeklyPlanData` | легитимно (fallback НАРУШЕНИЕ) |
| tasks.module.js:122–125 | gamification | `getEngineerAbsenceSync` / fallback `window.engineerAbsence` | легитимно (fallback НАРУШЕНИЕ) |
| tasks.module.js:193–194, 325–326, 331, 356, 633, 635, 637, 642, 682, 892, 897, 969, 991 | core (permissions) | `window.RBI.services.permissions.*` (роли, права, фильтры) | легитимно (2026-07-11) |
| tasks.module.js:523–524 | knowledge | `getMagicTwiCandidates()` | легитимно |
| tasks.module.js:604–605 | gamification | `window.RBI.services.game.saveWeeklyPlan()`, `updatePlanProgress()` | легитимно (2026-07-11) |
| tasks.module.js:858 | knowledge | `renderDocsList()` (inline onclick) | легитимно |
| tasks.module.js:864, 884 | ai / gamification | `rbi_generateWorkshop`, `game.startInspection` | легитимно |
| tasks.module.js:1391–1392 | quality (intramodule, self) | `gameGenerateWeeklyPlan(false)` (собственная window-published функция того же файла) | не межмодульное |
| tasks.module.js:1402 | gamification | `window.RBI.services.game.renderDashboard()` | легитимно (2026-07-11) |
| reports.actions.js:13–15 | settings | `window.RBI.services.settings.get` | легитимно (2026-07-11, fallback устранён) |
| reports.actions.js:40–44 | gamification | `game.logAction` / fallback `gameLogAction()` | легитимно (fallback НАРУШЕНИЕ) |
| reports.actions.js:85–88 | ai | `ai.call` / fallback `window.callAI` | легитимно (fallback НАРУШЕНИЕ) |
| reports.actions.js:99–114 | sk | `sk.getRecordsSync`/`getVolumesSync`/`getContractorMapSync` / fallback `window.sk*` | легитимно (fallback НАРУШЕНИЕ) |
| reports.actions.js:155–170 | knowledge | `getTwiCardsSync`/`getCustomDocsSync`/`getCustomNodesSync` / fallback | легитимно (fallback НАРУШЕНИЕ) |
| reports.actions.js:173–176 | knowledge | `getEtalonActsSync` / fallback `window.etalonActsArray` | легитимно (fallback НАРУШЕНИЕ) |
| reports.actions.js:179–207 | gamification | `getWeeklyPlanSync`, `setWeeklyPlanSync`, `getContractorStatusesSync`, `getGameActionLogsSync`, `getEngineerAbsenceSync` / fallback | легитимно (fallback НАРУШЕНИЕ) |
| reports.actions.js:460–462 | settings/app-mode | `appMode.isDemo` | легитимно (2026-07-11, fallback устранён) |
| reports.actions.js:3922 | gamification | `_gameLogAction('ai_copy', 'sent_report')` | через хелпер |
| reports.actions.js:4754 | gamification | `window.RBI.services.game.calculateManagerMetrics()` | легитимно (2026-07-11) |
| analytics.actions.js:80–82 | settings | `settings.get` | легитимно (2026-07-11, fallback устранён) |
| analytics.actions.js:128–129 | core (inspections) | `inspections.getAllForAnalyticsSync()` | легитимно |
| analytics.actions.js:149–152 | gamification | `game.logAction` / fallback `gameLogAction()` | легитимно (fallback НАРУШЕНИЕ) |
| analytics.actions.js:186–189 | ai | `ai.call` / fallback `window.callAI` | легитимно (fallback НАРУШЕНИЕ) |
| analytics.actions.js:210–211 | core (tasks) | `tasks.getTasksSync()` | легитимно |
| analytics.actions.js:630 | gamification | `_gameLogAction('ai_copy', 'clipboard')` | через хелпер |
| analytics.actions.js:639–658 | knowledge | `requireEditRight`, `openTwiConstructor`, `populateTwiItemSelect`, `changeTwiType`, `renderGoodPhoto`, `renderBadPhoto` | легитимно |
| analytics.actions.js:796–797 | core (permissions) | `window.RBI.services.permissions.getCurrentRole()`, `isAdmin()` | легитимно (2026-07-11) |
| analytics.actions.js:982 | gamification | `window.RBI.services.game.calculateManagerMetrics()` | легитимно (2026-07-11) |
| analytics.render.js:14–16 | settings | `settings.get` | легитимно (2026-07-11, fallback устранён) |
| analytics.render.js:27–36 | sk | `sk.getRecordsSync`/`getContractorMapSync` / fallback `window.sk*` | легитимно (fallback НАРУШЕНИЕ) |
| analytics.render.js:76–77 | core (analytics) | `analytics.setAnalyticsFilters(...)` | легитимно |
| analytics.render.js:1404–1405 | gamification | `window.RBI.services.game.calculateManagerMetrics()` | легитимно (2026-07-11) |
| etalon.actions.js:20–22 | settings | `settings.get` | легитимно (2026-07-11, fallback устранён) |
| etalon.actions.js:35–38 | gamification | `game.logAction` / fallback `gameLogAction()` | легитимно (fallback НАРУШЕНИЕ) |
| etalon.actions.js:62–72 | gamification | `getWeeklyPlanSync`/`getContractorStatusesSync` / fallback | легитимно (fallback НАРУШЕНИЕ) |
| etalon.actions.js:385 | gamification | `_gameLogAction('etalon_accepted', ...)` | через хелпер |
| etalon.actions.js:418–419 | gamification | `window.RBI.services.game.calculateAllProfiles()`, `renderDashboard()` | легитимно (2026-07-11) |
| etalon.actions.js:551 | core (permissions) | `window.RBI.services.permissions.canDelete(...)` | легитимно (2026-07-11) |
| engineer.state.js:11–14 | settings | `_ctx.settings.get` / fallback `window.RBI.services.settings` | легитимно (2026-07-14, `_ctx` приоритет добавлен) |
| engineer.state.js:18–23 | core (tasks) | `_ctx.tasks.getTasksSync()` / fallback `window.RBI.services.tasks` | легитимно (2026-07-14, `_ctx` приоритет добавлен) |
| engineer.render.js:45–47 | gamification | `(_ctx.game \|\| window.RBI.services.game).renderDashboard()` | легитимно (2026-07-14, `_ctx` приоритет добавлен) |
| schedule.actions.js:34–37 | settings/app-mode | `ScheduleActions._ctx.appMode.isDemo` / fallback `window.RBI.services.appMode` | легитимно (2026-07-14, `_ctx` приоритет добавлен) |
| schedule.render.js:40–41 | settings/app-mode | `_ctx.appMode.isDemo` / fallback `window.RBI.services.appMode` | легитимно (2026-07-14, `_ctx` приоритет добавлен) |
| meetings.module.js:33–35 | settings/app-mode | `appMode.isDemo` | легитимно (2026-07-11, fallback устранён) |
| meetings.module.js:51–53 | settings | `settings.get` | легитимно (2026-07-11, fallback устранён) |
| meetings.module.js:64–80 | sk | `sk.getRecordsSync`/`getContractorMapSync` / fallback `window.sk*` | легитимно (fallback НАРУШЕНИЕ) |
| meetings.module.js:71–74 | gamification | `game.logAction` / fallback `gameLogAction()` | легитимно (fallback НАРУШЕНИЕ) |
| meetings.module.js:293 | core (permissions) | `window.RBI.services.permissions.canDelete(author)` | легитимно (2026-07-11) |
| meetings.module.js:311 | quality (intramodule, tasks feature) | `gameGenerateWeeklyPlan(true)` | не межмодульное (см. `current_plan.md` блок 2026-07-11) |
| meetings.module.js:826 | gamification | `_gameLogAction('meeting_memo_created', ...)` | через хелпер |
| interventions.js:17–19 | settings | `settings.get` | легитимно (2026-07-11, fallback устранён) |
| interventions.js:21–23 | settings/app-mode | `appMode.isDemo` | легитимно (2026-07-11, fallback устранён) |
| interventions.js:65–86 | knowledge | `getTwiCardsSync`, `getCustomDocsSync`, `getCustomNodesSync`, `getEtalonActsSync` / fallback | легитимно (fallback НАРУШЕНИЕ) |
| interventions.js:89–92 | gamification | `getGameActionLogsSync` / fallback `window.gameActionLogs` | легитимно (fallback НАРУШЕНИЕ) |
| interventions.js:101–104 | gamification | `game.logAction` / fallback `gameLogAction()` | легитимно (fallback НАРУШЕНИЕ) |
| interventions.js:107–110 | gamification | `game.calculateImpact` / fallback `calculateImpactScore()` | легитимно (fallback НАРУШЕНИЕ) |
| interventions.js:246 | gamification | `window.RBI.services.game.calculateAllProfiles()` | легитимно (2026-07-11) |
| interventions.js:658, 682, 875 | knowledge | `requireEditRight`, `canDeleteItem`, `reloadReferenceMemory` | легитимно |
| interventions.js:943 | core (permissions) | `window.RBI.services.permissions.isAdmin()` | легитимно (2026-07-11) |
| interventions.js:1099–1113 | knowledge | `openTwiViewer`, `openTwiConstructor`, `openNodeViewer`, `openNodeConstructor`, `openDocViewer`, `deleteCustomDoc` | легитимно |
| reference.js:6–8 | settings | `settings.get` | легитимно (2026-07-11, fallback устранён) |
| reference.js:34–43 | knowledge | `getTwiCardsSync`, `getCustomDocsSync` / fallback | легитимно (fallback НАРУШЕНИЕ) |
| reference.js:110, 155, 158, 232, 280–285 | knowledge | `openTwiViewer`, `openDocViewer`, `renderDocsList`, `renderNodesList`, `renderTwiList` | легитимно |
| reference.js:557, 674, 823, 931 | core (templates) | `templates.saveUserTemplate`, `deleteUserTemplate` | легитимно |
| multi-filter.js:9–15 | sk | `_ctx.sk.getRecordsSync()` / fallback `window.RBI.services.sk` / `window.skRecords` | легитимно (2026-07-14, `_ctx` приоритет, fallback НАРУШЕНИЕ на нижнем уровне) |
| multi-filter.js:19–26 | core (inspections) | `_ctx.inspections.getAllSync()` / fallback `window.RBI.services.inspections` / `window.HistoryState`/`window.contractorArray` | легитимно (2026-07-14, `_ctx` приоритет, fallback НАРУШЕНИЕ на нижнем уровне) |
| multi-filter.js:52–55 | core (permissions) | `permSvc.getCurrentRole()`, `getAssignedProjects()`, `canManageHierarchy()` | легитимно (2026-07-14, `_ctx.permissions` приоритет, fallback `window.RBI.services.permissions` устранён из первичного пути) |

**Внутримодульно (не включено):** `window.HistoryState`, `window.contractorArray`, `window.rbi_tasksData`, `window.rbi_interventionsData`, `window.rbi_meetingsData`, `window.rbi_scheduleData` между features одного модуля quality.

**Без внешних связей:** `quality.module.js`, `index.js`, `manifest.js`, `audit.module.js`, `audit.state.js`, `tasks.actions.js`, `tasks.state.js`, `tasks.render.js`, `reports.module.js`, `reports.state.js`, `reports.render.js`, `analytics.module.js`, `analytics.state.js`, `etalon.module.js`, `etalon.state.js`, `etalon.render.js`, `engineer.module.js`, `engineer.actions.js`, `schedule.module.js`, `schedule.state.js`, `meetings.actions.js`, `meetings.state.js`, `meetings.render.js`.

---

## Platform module: construction

### Файлы

| Файл | Назначение |
|---|---|
| `construction.module.js` | Контракт платформы Construction: init/mount/unmount, подписки на sync/audit-события; единственная точка модуля, публикующая `ConstructionState`/`ConstructionActions`/`ConstructionRender` на `window.*` (2026-07-13, миграция публичной границы Блок 6/6) |
| `construction.actions.js` | Бизнес-действия: инициализация legacy-менеджеров, обработчики событий; ES export `ConstructionActions`, не публикует на `window` сам; 26 прокси `constManager_*`/`constAcceptance_*`/`transferManager_*` — приватные module-scope функции (0 внешних/межфайловых потребителей, не экспортируются) |
| `construction.state.js` | Изолированное состояние модуля с геттерами из `ConstManager`/`ConstAcceptance`/`TransferManager`; ES export `ConstructionState`, публикацию на `window.ConstructionState` делает `construction.module.js` (2026-07-13) |
| `construction.render.js` | Рендер-диспетчер подвкладок defects/acceptance/transfer; ES export `ConstructionRender`, не публикует на `window` сам; 10 прокси `constManager_render*`/`constAcceptance_renderList`/`transferManager_*` — приватные module-scope функции (0 внешних/межфайловых потребителей, не экспортируются) |
| `construction.manifest.js` | Декларативный манифест метаданных (не подключён) |
| `index.js` | Публичная точка входа для Core и module-loader |
| `features/construction-core.js` | Ядро стройконтроля: `ConstManager` — объекты, корпуса, этажи, дефекты |
| `features/defect-form.js` | Форма дефекта и отрисовка булавок на планах (`ConstDefectForm`) |
| `features/pdf-viewer.js` | Универсальный PDF-просмотрщик с panzoom и маркерами (`UniversalPdfViewer`) |
| `features/admin.js` | Администрирование иерархии объектов/корпусов/этажей (`ConstAdmin`) |
| `features/acceptance.js` | Журнал заявок приёмки работ (`ConstAcceptance`) |
| `features/transfer.js` | Передача квартир и шахматка (`TransferManager`) |

### Исходящие межмодульные связи (construction → другие модули)

| Файл:строки | Целевой модуль | Что вызывается | Тип |
|---|---|---|---|
| `features/defect-form.js:11` | settings/app-mode | `window.RBI.services.appMode.isDemo` (`_isDemoMode`) | легитимно (2026-07-11, fallback устранён) |
| `features/defect-form.js:34–42` | quality | `window.RBI.services.inspections.getAllSync()` (`_getAllInspections`) | легитимно (2026-07-11, fallback устранён) |
| `features/defect-form.js:44–50` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён) |
| `features/defect-form.js:52–54` | quality | `window.RBI.services.session` (`_session`) | легитимно (2026-07-11, fallback устранён) |
| `features/pdf-viewer.js:10–12` | quality | `window.RBI.services.session` (`_session`) | легитимно (2026-07-11, fallback устранён) |
| `features/admin.js:7–8, 15–16` | settings | `window.RBI.services.settings.get`/`.set` (`_getSetting`/`_setSetting`) | легитимно (2026-07-11, fallback устранён) |
| `features/acceptance.js:23–25` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён) |
| `features/construction-core.js:16–18` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён) |
| `features/construction-core.js:20–22` | quality | `window.RBI.services.session` (`_session`) | легитимно (2026-07-11, fallback устранён) |

*Без нарушений: `construction.module.js`, `construction.actions.js`, `construction.state.js`, `construction.render.js`, `construction.manifest.js`, `index.js`, `features/transfer.js`. Primary path для storage/settings/inspections везде — `window.RBI.services.*`.*

---

## Platform module: sk

### Файлы

| Файл | Назначение |
|---|---|
| `sk.module.js` | Контракт платформы ПК СК: init/mount/unmount, загрузка данных, подписка на sync; единственная точка модуля, публикующая 28 функций (`sk.actions.js`+`sk.render.js`) и `SKState` на `window.*` (2026-07-13, миграция публичной границы Блок 4/6) |
| `sk.actions.js` | Бизнес-действия: CRUD, импорт Excel, аналитика, фасады `skModule`/`SKActions`; ES-экспорты, не публикует функции на `window` сам (кроме 8 принятых исключений — переменные `window.skRecords`/`skVolumes`/`skMapping`/`skContractorMap`/`skCategoryMap`/`skCurrentSubTab`/`skHrSortBy`/`skHrSortDesc`) |
| `sk.state.js` | Изолированное состояние records/volumes/maps с синхронизацией в `window.sk*`; `SKState` — ES export, публикацию на `window.SKState` делает `sk.module.js` (2026-07-13) |
| `sk.render.js` | Рендер dashboard/HR/volumes и модальных окон; ES-экспорты, не публикует функции на `window` сам, циклический импорт с `sk.actions.js` (2026-07-13) |
| `sk.manifest.js` | Декларативный манифест метаданных (не подключён) |
| `index.js` | Публичная точка входа для Core и module-loader |

### Исходящие межмодульные связи (sk → другие модули)

| Файл:строки | Целевой модуль | Что вызывается | Тип |
|---|---|---|---|
| `sk.actions.js:31` | settings | `window.RBI.services.settings.get` (`_getSetting`) | легитимно (2026-07-11, fallback устранён) |
| `sk.actions.js:36` | settings/app-mode | `window.RBI.services.appMode.isDemo` (`_isDemoMode`) | легитимно (2026-07-11, fallback устранён) |
| `sk.actions.js:40` | gamification | `gameLogAction()` (bare fallback) | НАРУШЕНИЕ (не в объёме этого блока) |
| `sk.actions.js:49` | quality | `window.RBI.services.inspections.getAllSync()` (`_inspections`) | легитимно (2026-07-11, fallback устранён) |
| `sk.actions.js:86` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён) |
| `sk.actions.js:82, 90` | tasks | `window.RBI.services.tasks.getTasksSync()`/`.setTasksSync()` (`_getTasks`/`_setTasks`) | легитимно (2026-07-11, fallback устранён) |
| `sk.render.js:15` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён) |
| `sk.render.js:47` | quality | `window.RBI.services.inspections.getAllSync()` (`_inspections`) | легитимно (2026-07-11, fallback устранён) |
| `sk.render.js:953` | ai | `window.sk_auditTemplatesAi()` (onclick в HR-вкладке) | легитимно (2026-07-12, переклассифицировано — вызов уже опубликованной публичной функции через inline onclick, не bare-обращение к состоянию) |

*Primary path: `_gameLogAction`→`game.logAction` (легитимно); `_inspections`→`inspections`-сервис (легитимно). `sk.module.js`, `sk.state.js`, `sk.manifest.js`, `index.js` — без нарушений.*

---

## Platform module: ai

### Файлы

| Файл | Назначение |
|---|---|
| `ai.module.js` | Контракт платформы AI: init, bindCtx, подписка на `settings:changed`; единственная точка публичной границы модуля — импортирует именованные экспорты `ai.actions.js`/`ai.state.js`/`ai.render.js` и присваивает их на `window.*` (2026-07-13, устранение техдолга публичной границы, блок 1/6) |
| `ai.actions.js` | 33 AI-функции, module-scope `export` (не пишет `window.*` — публикацию делает `ai.module.js`, 2026-07-13) |
| `ai.state.js` | Изолированное состояние `aiEnabled`/`authMode`/processing, module-scope `export` |
| `ai.render.js` | Тонкий рендер-диспетчер `openDocChat`/`closeDocChat`, module-scope `export`, импортирует `AIActions` из `ai.actions.js` |
| `ai.manifest.js` | Декларативный манифест сквозного AI-сервиса (не подключён) |
| `index.js` | Публичная точка входа для Core и module-loader |

### Исходящие межмодульные связи (ai → другие модули)

| Файл:строки | Целевой модуль | Что вызывается | Тип |
|---|---|---|---|
| `ai.state.js:8` | settings | `window.RBI.services.settings.get` (`_getSetting`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:6` | settings | `window.RBI.services.settings.get` (`_getSetting`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:37` | gamification | `gameLogAction()` (bare fallback) | НАРУШЕНИЕ (не в объёме этого блока — `_gameLogAction`, не в детальном перечне плана) |
| `ai.actions.js:55–56` | quality | `window.RBI.services.inspections.getAllSync()` (`_getAllInspections`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:62` | sk | `window.RBI.services.sk.getRecordsSync()` (`_getSkRecords`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:69` | tasks | `window.RBI.services.tasks.getTasksSync()` (`_getTasks`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:76, 83` | knowledge | `window.RBI.services.knowledge.getTwiCardsSync()`/`getCustomDocsSync()` (`_getTwiCards`/`_getCustomDocs`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:90` | gamification | `window.RBI.services.game.getGameActionLogsSync()` (`_getGameActionLogs`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:97` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён) |
| `ai.actions.js:413–451` | knowledge | `window.RBI.services.knowledge.getTwiTypeSync()`/`.setTwiStepCountSync()` | легитимно (2026-07-12, fallback устранён) |
| `ai.actions.js:677` | gamification | `window.RBI.services.game.getCurrentProfileDataSync()` | легитимно (2026-07-12, fallback устранён) |
| `ai.actions.js:684–689` | quality (audit) | `window.AuditState.currentChecklist`/`.currentTemplateKey` | легитимно (2026-07-12, fallback устранён — по образцу принятого паттерна `AuditState`) |
| `ai.actions.js:667, 681, 685` | quality (audit) | `window._auditCurrentCommentId` | принято постоянным исключением (решение архитектора, блок 2026-07-12 «устранение fallback-стаба module.engineer») — read-only ID активной модалки, не персистентная сущность, создание сервисного метода на 1 read-only ID нарушает YAGNI |
| `ai.actions.js:891` | quality (audit) | `window.AuditState.currentChecklist` | легитимно (2026-07-12, fallback устранён) |
| `ai.actions.js:1367` | sk | `window.RBI.services.sk.getTempRawHeadersSync()` | легитимно (2026-07-12, fallback устранён) |
| `ai.actions.js:1869, 1879` | sk | `window.RBI.services.sk.getBadRemarksSync()` | легитимно (2026-07-12, fallback устранён) |

*Primary path для inspections/sk/knowledge/game — `window.RBI.services.*` (легитимно). `ai.module.js`, `ai.render.js`, `ai.manifest.js`, `index.js` — без нарушений. Обращений к construction нет.*

---

## Platform module: gamification

### Файлы

| Файл | Назначение |
|---|---|
| `game.module.js` | Контракт платформы геймификации: init/mount/unmount, подписки на sync/inspection |
| `game.actions.js` | Бизнес-действия: профиль инженера, недельный план, FMEA, алиасы подрядчиков |
| `game.state.js` | Данные профилей, `weeklyPlanData`, achievements, `gameActionLogs` |
| `game.render.js` | DOM-отрисовка профиля инженера, достижений, FMEA и модалок |
| `game.manifest.js` | Декларативный манифест метаданных (не подключён) |
| `index.js` | Публичная точка входа для Core и module-loader |

### Исходящие межмодульные связи (gamification → другие модули)

| Файл:строки | Целевой модуль | Что вызывается | Тип |
|---|---|---|---|
| `game.state.js:24–26` | settings | `window.RBI.services.settings.get` (`_getSetting`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6 — точка вызова та же) |
| `game.state.js:28–30` | quality | `window.RBI.services.inspections.getAllSync()` (`_getAllInspections`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.state.js:32–34` | tasks | `window.RBI.services.tasks.getTasksSync()` (`_getTasks`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.state.js:38–40` | settings/app-mode | `window.RBI.services.appMode.isDemo` (`_isDemoMode`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.actions.js:24–26` | settings/app-mode | `window.RBI.services.appMode.isDemo` (`_isDemoMode`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.actions.js:28–34` | settings | `window.RBI.services.settings.get`/`.set` | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.actions.js:36–38` | quality | `window.RBI.services.inspections.getAllSync()` (`_getAllInspections`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.actions.js:40–46` | tasks | `window.RBI.services.tasks.getTasksSync()`/`getFmeaSync()` (`_getTasks`/`_getFmea`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.actions.js:76–78` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.render.js:23–24` | settings | `window.RBI.services.settings.get`/`.set` | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.render.js:27–28` | quality | `window.RBI.services.inspections.getAllSync()` (`_getAllInspections`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.render.js:31–32` | tasks | `window.RBI.services.tasks.getFmeaSync()` (`_getFmea`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |
| `game.render.js:35–36` | quality | `window.RBI.services.templates` (`_templates`) | легитимно (2026-07-11, fallback устранён; line shift 2026-07-13 блок 2/6) |

*`window.gameActionLogs`/`window.weeklyPlanData` внутри gamification — внутримодульные, не включены. Обращений к construction нет. `game.module.js`, `game.manifest.js`, `index.js` — без нарушений.*

---

## Platform module: knowledge

### Файлы

| Файл | Назначение |
|---|---|
| `js/modules/quality/features/knowledge/knowledge.module.js` | Основной ES-модуль «База знаний»: бизнес-логика TWI/документов/узлов/эталонов; legacy `window.rbi_*`/`window.*` API |
| `js/modules/quality/features/knowledge/knowledge.actions.js` | Фасад `KnowledgeActions`: CRUD через сервис, обновление `KnowledgeState`, эмит событий |
| `js/modules/quality/features/knowledge/knowledge.state.js` | Изолированное состояние `KnowledgeState` с зеркалированием в `window.custom*` |
| `js/modules/quality/features/knowledge/knowledge.render.js` | `KnowledgeRender`: отрисовка списков TWI/документов/узлов из `KnowledgeState` |
| `js/modules/quality/features/knowledge/knowledge.manifest.js` | Декларативный манифест модуля (не подключён) |
| `js/modules/quality/features/knowledge/index.js` | Публичная точка входа: `init`/`mount`/`unmount`, делегирует в `KnowledgeModule` |
| `js/modules/quality/features/knowledge/features/faq.js` | FAQ и чат AI-ассистента: модалки, поиск, offline/online ответы |

### Исходящие межмодульные связи (knowledge → другие модули)

| Файл:строки | Целевой модуль | Что вызывается | Тип |
|---|---|---|---|
| `knowledge.module.js:82` | quality | `contractorArray` (bare fallback `_getAllInspections`) | НАРУШЕНИЕ |
| `knowledge.module.js:19–20` | settings | `window.RBI.services.settings.get` (`_getSetting`) | легитимно (2026-07-11, fallback устранён) |
| `knowledge.module.js:26–27` | settings/app-mode | `window.RBI.services.appMode.isDemo` (`_isDemoMode`) | легитимно (2026-07-11, fallback устранён) |
| `knowledge.module.js:98` | tasks | `window.rbi_tasksData` (fallback `_getTasks`) | НАРУШЕНИЕ |
| `knowledge.module.js:197–214` | quality | `window.userTemplates` (явное присвоение, исправлено 2026-07-11 — было bare-присвоение лексической переменной, риск рассинхронизации с сервисом) | легитимно (fallback-путь, аналогично bootstrap.js) |
| `knowledge.module.js:299` | quality | `_templates().getSystemTemplates()`/`getUserTemplates()`, `getFlatList()` | легитимно (fallback уже существующего хелпера, план 2026-07-11) |
| `knowledge.module.js:450–451, 489` | quality | `_templates().getSystemTemplates()`/`getUserTemplates()`, `getFlatList()` | легитимно (план 2026-07-11) |
| `knowledge.module.js:830–860` | quality | `_templates().getUserTemplates()`/`getSystemTemplates()` (UI панели управления шаблонами) | легитимно (план 2026-07-11) |
| `knowledge.module.js:~840` | quality | `cloneSystemTemplateToCustom()` (inline onclick) | НАРУШЕНИЕ |
| `knowledge.module.js:~1026` | quality | `(window.AuditState && window.AuditState.currentChecklist) || currentChecklist`, `getFlatList()` | легитимно (план 2026-07-11, тот же паттерн что 1341-1353) |
| `knowledge.module.js:1341–1353` | quality | `openItemHelpMenu`: `window.AuditState.currentChecklist/currentTemplateKey` + fallback bare | легитимно (fallback-путь, тот же паттерн что 1020) |
| `knowledge.module.js:~1570` | quality | `switchTab('tab-audit')`, `window.changeTemplate(...)` (inline onclick) | НАРУШЕНИЕ |
| `knowledge.module.js:1624–1625` | quality | `_templates().getSystemTemplates()`/`getUserTemplates()` | легитимно (план 2026-07-11) |
| `knowledge.module.js:1898` | quality | `_templates().getSystemTemplates()` (регистрация в `_knowledgeRegistry`) | легитимно (план 2026-07-11) |
| `knowledge.module.js:1909–1920, 1964–1981` | quality (etalon) | `window.openEtalonConstructor`, `closeEtalonConstructor`, `saveEtalonAct`, `openEtalonViewer`, `deleteEtalonAct`, `editEtalonAct` и др. | НАРУШЕНИЕ (**мёртвый код**, 0 живых вызывающих мест — см. `current_plan.md` 2026-07-11) |
| `knowledge.module.js:2203–2211` | quality | `_templates().getSystemTemplates()`/`getUserTemplates()` | легитимно (план 2026-07-11) |
| `knowledge.module.js:68, 971–972` | gamification | `gameLogAction` (bare fallback) | НАРУШЕНИЕ |
| `knowledge.module.js:67–69` | ai | `window.RBI.services.ai.extractTextFromPdf()` (`_extractTextFromPdf`) | легитимно (2026-07-12, fallback устранён) |
| `features/faq.js:21–23` | ai | `window.RBI.services.ai.call()` (`_callAI`) | легитимно (2026-07-12, fallback устранён) |
| `features/faq.js:615` | ai | `window.RBI.services.ai.isAvailable()` | легитимно (2026-07-12, fallback устранён) |
| `features/faq.js:4` | settings | `window.RBI.services.settings.get` (`_getSetting`) | легитимно (2026-07-11, fallback устранён) |

*Без внешних связей: `knowledge.actions.js`, `knowledge.state.js`, `knowledge.render.js`, `knowledge.manifest.js`, `index.js`. Связей с construction/reportsArray/HistoryState (кроме указанного) не найдено.*

---

## Platform module: settings

### Файлы

| Файл | Назначение |
|---|---|
| `js/modules/quality/features/settings/settings.module.js` | Оркестратор модуля настроек: контракт платформы, подписки на EventBus и `SettingsService`; единственная точка публичной границы для `features/changelog.js`/`features/feedback.js`/`features/app-mode-utils.js` — импортирует их именованные экспорты и присваивает на `window.*` (2026-07-13, устранение техдолга публичной границы, блок 5/6). `features/tutorial.js`/`settings.actions.js`/`settings.render.js` остаются classic-script, не входят в эту точку (отдельная ROADMAP-инициатива). `init(ctx)` также вызывает `window.FeedbackShared.bindCtx(ctx)`/`window.TutorialShared.bindCtx(ctx)`/`window.AppModeUtilsShared.bindCtx(ctx)` — новые точки привязки `_ctx` для `features/feedback.js`/`features/tutorial.js`/`features/app-mode-utils.js` (2026-07-14, «Реальная изоляция модулей, часть 1», финальный блок) |
| `js/modules/quality/features/settings/settings.actions.js` | Бизнес-логика настроек: загрузка/сохранение/сброс, очистка истории, factory reset |
| `js/modules/quality/features/settings/settings.render.js` | Отрисовка вкладки «Настройки» и применение настроек к UI |
| `js/modules/quality/features/settings/settings.manifest.js` | Декларативный манифест модуля (не подключён) |
| `js/modules/quality/features/settings/index.js` | Публичная точка входа: `init`/`mount`/`unmount`, делегирует в `SettingsModule` |
| `js/modules/quality/features/settings/features/feedback.js` | Обратная связь: идеи, лайки, статусы, dev-roadmap, экспорт JSON |
| `js/modules/quality/features/settings/features/app-mode-utils.js` | Переключение режимов приложения, демо-режим, брендинг, push, purge данных |
| `js/modules/quality/features/settings/features/tutorial.js` | Интерактивный 28-шаговый туториал и обучающие карточки |
| `js/modules/quality/features/settings/features/changelog.js` | Статический массив `window.RBI_CHANGELOG` и модалка истории версий |

### Исходящие межмодульные связи (settings → другие модули)

| Файл:строки | Целевой модуль | Что вызывается | Тип |
|---|---|---|---|
| `settings.actions.js:34–37` | gamification | `window.RBI.services.game.setGameActionLogsSync()` (`_setGameActionLogs`) | легитимно (2026-07-12, fallback устранён) |
| `settings.actions.js:296–301` (`_clearHistory`) | quality/knowledge | `window.RBI.services.inspections.setAllSync([])`, `window.RBI.services.knowledge.setEtalonActsSync([])` | устранено (2026-07-11, блок «изоляция quality↔settings») |
| `settings.actions.js:305–306` (`_clearHistory`) | storage | `_storage().clear(...)` (`dbClear` через сервис) | легитимно (2026-07-12, `storage.service.js.clear()` добавлен, прямой `dbClear` устранён) |
| `settings.actions.js:312–313` | gamification | `window.RBI.services.game.setGameActionLogsSync([])`/`getGameActionLogsSync()` | легитимно (2026-07-12, guard `typeof gameActionLogs !== 'undefined'` — недостижимый в ES-модуле — убран, fallback устранён) |
| `settings.actions.js:322` | quality | `window.updateDataSummary()` | НАРУШЕНИЕ |
| `settings.render.js:118` | sync (service) | `window.renderSyncUI()` | легитимно (публичный `window.*` API sync-сервиса, не внутреннее состояние; подтверждено структурной проверкой блока 2026-07-11) |
| `settings.render.js:213` | object-directory (service) | `window.ObjectDirectory.initUI()` | легитимно (публичный `window.*` API сервиса; подтверждено структурной проверкой блока 2026-07-11) |
| `features/app-mode-utils.js:42–51` | quality (audit session) | `window.state`, `window.details`, `window.photos`, `window.currentTemplateKey`, `window.currentChecklist` | принято постоянным исключением (решение архитектора, блок 2026-07-12) — `_session()` architecturally корректный фасад (внутренний definition, не bare-обращение снаружи модуля) |
| `features/app-mode-utils.js:73, 76` | quality | `window.userTemplates`, `SYSTEM_TEMPLATES` (fallback `_templates`) | принято постоянным исключением (решение архитектора, блок 2026-07-12) — `_templates()` architecturally корректный фасад |
| `features/app-mode-utils.js:329` (`applyContractorAliasToInspectionHistory`) | quality | `contractorArray` (bare, вне демо-блока) | принято постоянным исключением (решение архитектора, блок 2026-07-12) — точечный bare-вызов низкого риска, не персистентное состояние |
| `features/app-mode-utils.js` (`_getWeeklyPlan/_setWeeklyPlan/_getGameActionLogs/_setGameActionLogs`) | quality (history) | `window.updateAllDynamicFilters()` | НАРУШЕНИЕ (не тронуто, отдельная точка) |
| `features/app-mode-utils.js:355` (`openNodeAttachmentPdf`) | knowledge | `window.rbiOpenPdfInTwiViewer(...)` | легитимно (публичный `window.*` API `knowledge.module.js`; подтверждено структурной проверкой блока 2026-07-11) |
| `features/app-mode-utils.js` (демо-режим start/exit) | quality | `window.RBI.services.inspections.setAllSync(...)` (демо snapshot/seed/restore) | устранено (2026-07-11) — `setAllSync` пишет одновременно в `window.contractorArray` и `HistoryState` (см. `SERVICES_API.md`), т.к. большинство читателей (`sk`/`construction`/`tasks`/`analytics`/`audit`/`meetings`/`interventions`/`knowledge`/`smart-input`) используют bare `window.contractorArray` без `HistoryState`-фоллбэка |
| `features/app-mode-utils.js` (`_getTasks/_ensureTasks/_setTasks`) | tasks | `window.RBI.services.tasks.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getSchedule/_ensureSchedule/_setSchedule`) | tasks | `window.RBI.services.tasks.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getFmea/_ensureFmea/_setFmea`) | tasks | `window.RBI.services.tasks.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getPractices/_ensurePractices/_setPractices`) | tasks | `window.RBI.services.tasks.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getInterventions/_ensureInterventions/_setInterventions`) | tasks | `window.RBI.services.tasks.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getMeetings/_ensureMeetings/_setMeetings`) | tasks | `window.RBI.services.tasks.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getSkRecords/_ensureSkRecords/_setSkRecords/_getSkVolumes/_setSkVolumes/_getSkContractorMap/_setSkContractorMap`) | sk | `window.RBI.services.sk.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getTwiCards/_ensureTwiCards/_setTwiCards/_getCustomDocs/_setCustomDocs/_getCustomNodes/_setCustomNodes`) | knowledge | `window.RBI.services.knowledge.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (`_getWeeklyPlan/_setWeeklyPlan/_getGameActionLogs/_setGameActionLogs`) | gamification | `window.RBI.services.game.*Sync` | устранено (2026-07-11), fallback-ветка убрана |
| `features/app-mode-utils.js` (демо-логи `window.gameActionLogs.push(...)` после `_setGameActionLogs([])`) | gamification | `window.gameActionLogs` (bare push в storage-переменную сервиса) | легитимно (переменная-хранилище сервиса `game.service.js`, не bare fallback чтения/записи — не входит в объём этого блока) |
| `features/app-mode-utils.js:1054` (`window.updateDataSummary()`) | quality | `window.updateDataSummary()` | принято постоянным исключением (решение архитектора, блок 2026-07-12) — точечный bare-вызов низкого риска, не персистентное состояние |
| `features/app-mode-utils.js` (`AppModeManager.init()`/`changeMode()`) | core (`js/core/app-shell.js`) | `window.RBI.services.shell.getSelectedModules/setSelectedModules/onOnlineStatusChange/renderCompanyBlock/renderSidebar` | легитимно (App Shell Блок 2 §29 п.9 2026-07-13; `renderSidebar` добавлен блоком «Sidebar-навигация, вариант A» 2026-07-15) — фильтрация `#app-mode-selector`/sidebar по выбору пользователя и company block, все через `window.RBI.services.*` |
| `features/app-mode-utils.js` (`exitDemoMode`, `switchTab('tab-audit')`, `window.changeTemplate('HOME')`) | quality | публичный `window.*` API (`switchTab`/`changeTemplate`) | легитимно (публичный API `router.js`/`quality`, не внутреннее состояние) |
| `features/tutorial.js:24, 188, 200, 206, 222, 464, 581` | quality | `switchTab('tab-audit')` | легитимно (публичный `window.*` API `router.js`; подтверждено структурной проверкой блока 2026-07-11) |
| `features/tutorial.js:24, 331, 342` | quality (analytics) | `switchTab('tab-analytics')` | легитимно (см. выше) |
| `features/tutorial.js:40` | quality (analytics) | `window.currentActiveAnalyticsTab = 'sub-history'` | принято постоянным исключением (решение архитектора, блок 2026-07-12) — точечный bare-вызов низкого риска, не персистентное состояние |
| `features/tutorial.js:275, 282` | tasks/engineer | `switchTab('tab-engineer')` | легитимно (см. выше) |
| `features/tutorial.js:379, 420` | knowledge | `switchTab('tab-reference')` | легитимно (см. выше) |

*Без внешних связей: `settings.module.js`, `settings.manifest.js`, `index.js`, `features/changelog.js`. В `features/feedback.js` AI вызывается через сервис (легитимно). Связей с construction не найдено.*

**Примечание архитектора (актуализировано 2026-07-11):** кластер `quality↔settings` (демо-режим) закрыт — устранены fallback-ветки ~26 data-хелперов и bare-мутации `window.contractorArray` в демо-режиме/`_clearHistory`. Сознательно оставлены: `_storage`/`_session`/`_templates`-фасады (полноценные, не однострочный fallback), `applyContractorAliasToInspectionHistory` (не входил в объём), `window.currentActiveAnalyticsTab` (не публичный API), `settings.actions.js:38–39/314–315` (gamification bare, не в объёме).

---

## Слой: core (`js/core/`)

### Файлы

| Файл | Назначение |
|---|---|
| `bootstrap.js` | App Shell: глобальный state (`window.state/details/photos`), `appSettings`, инициализация на `DOMContentLoaded`, fallback-регистрация `module.engineer` |
| `rbi-core.js` | Базовый namespace `window.RBI`: EventBus, registry, `createContext()` — без бизнес-логики |
| `app-shell.js` | `ShellService`: тонкие обёртки над DOM App Shell, Auth Gate, toast, online/offline |
| `app.entry.js` | Единая точка старта platform-модулей: `settings.load()` → `moduleLoader.loadModule()`/`registry.get()` → `platform:ready` |
| `router.js` | Hash-роутер `window.AppRouter`: маршруты, `navigate`, legacy `window.switchTab` |
| `module-loader.js` | ES-модуль: динамический `import()` по `modules.manifest.js`, регистрирует `window.RBI.moduleLoader` |
| `views.js` | `window.AppViews`: render-функции вкладок/маршрутов, переключение `.view-section` |

## Слой: services (`js/services/`)

| Файл | Сервис (регистрация) | Назначение |
|---|---|---|
| `storage.service.js` | `service.storage` | Legacy-фасад над IndexedDB helpers |
| `sync.service.js` | `service.sync` | Legacy-фасад над глобалами синхронизации |
| `config.service.js` | `service.config` | Доступ к `window.APP_CONFIG` |
| `session.service.js` | `service.session` | Фасад над живой сессией проверки |
| `settings.service.js` | `service.settings` | Настройки пользователя, тема, EventBus `settings:changed` |
| `permission.service.js` | `service.permissions` | Роли и права (`ROLE_MATRIX`), также `window.RbiRoles` |
| `inspection.service.js` | `service.inspections` | CRUD истории проверок |
| `task.service.js` | `service.tasks` | Задачи, график, совещания + in-memory sync-глобалы |
| `analytics.service.js` | `service.analytics` | Делегирование в legacy-функции аналитики |
| `report.service.js` | `service.reports` | CRUD PDF-отчётов |
| `template.service.js` | `service.templates` | Шаблоны проверок: system/user CRUD |
| `masterData.service.js` | `service.masterData` | Агрегатор мастер-данных |
| `knowledge.service.js` | `service.knowledge` | CRUD базы знаний (TWI, docs, nodes, etalon) |
| `sk.service.js` | `service.sk` | CRUD записей СК и связанных сторов |
| `object-directory.service.js` | `service.objects` (+ legacy `window.ObjectDirectory`) | Справочник объектов |
| `contractor-directory.service.js` | `service.contractors` (+ legacy `window.ContractorDirectory`) | Справочник подрядчиков |
| `file.service.js` | `service.files` | Фото/файлы |
| `ai.service.js` | `service.ai` | Passthrough-мост к legacy AI-функциям |
| `game.service.js` | `service.game` | In-memory геймификация |
| `company.service.js` | `service.company` | Read-only контекст компании |
| `user-context.service.js` | `service.userContext` | Агрегатор user context для Auth Gate |
| `app-mode.service.js` | *(без `registry.register`)* | Фасад режима приложения (`window.RBI.services.appMode`) |
| `sync/sync-core.state.js` | фрагмент `service.sync` | Состояние sync |
| `sync/sync-engine.core.js` | фрагмент `service.sync` | Главный движок push/pull/merge |
| `sync/sync-auth.js` | фрагмент `service.sync` | Auth Supabase |
| `sync/sync-push-pull.core.js` | фрагмент `service.sync` | Загрузка/скачивание ассетов |
| `sync/sync-connection.actions.js` | фрагмент `service.sync` | Подключение к облаку, заявки на объекты |
| `sync/sync-post-actions.js` | фрагмент `service.sync` | Пост-обработка после sync |
| `sync/sync-ui.render.js` | фрагмент `service.sync` | UI синхронизации |
| `sync/sync-cloud-prepare.utils.js` | фрагмент `service.sync` | Подготовка записей к отправке в Supabase |
| `storage/storage-db.core.js` | фрагмент `service.storage` | Ядро IndexedDB |
| `storage/storage-cache-manager.js` | фрагмент `service.storage` | Адаптивная очистка файлового кэша |
| `storage/storage-photo-manager.js` | фрагмент `service.storage` | `PhotoManager` |
| `storage/storage-file-queue.actions.js` | фрагмент `service.storage` | Очередь файлового кэша |
| `storage/storage-diagnostics.render.js` | фрагмент `service.storage` | UI диагностики хранилища |
| `storage/storage-converters.utils.js` | фрагмент `service.storage` | Конвертеры Base64 ↔ Blob ↔ ArrayBuffer |

> Полные сигнатуры методов каждого сервиса — см. `_ai/SERVICES_API.md`, не эту карту.

## Слой: shared (`js/shared/`)

| Файл | Назначение |
|---|---|
| `notify.utils.js` | Toast и закрытие модалок |
| `toast.utils.js` | Обёртка `window.RBI.utils.toast` |
| `layout.utils.js` | Динамические отступы body, скролл табов |
| `splash-screen.utils.js` | Splash-screen при старте |
| `pwa-update.utils.js` | PWA: проверка обновлений SW, reload |
| `error-log.utils.js` | Отправка ошибок в Supabase + глобальные error handlers |
| `template.utils.js` | Подсветка норм в тексте + `window.RBI.utils.templates` |
| `math.utils.js` | Метрики качества/аналитики + `window.RBI.utils.math` |
| `smart-input.utils.js` | Умные автозаполнения локации/подрядчика/объекта |
| `photo-editor.utils.js` | Фоторедактор и гидратация фото в DOM |
| `photo-viewer-zoom.utils.js` | Zoom/pan фотовьюера |
| `touch-gestures.utils.js` | Блокировка Android pull-to-refresh |
| `fab-export.utils.js` | Умная FAB-кнопка экспорта PDF |

## Инфраструктура (`js/storage.js`, `js/sync.js`, `sw.js`)

| Файл | Назначение |
|---|---|
| `js/storage.js` | Отсутствует — логика перенесена в `js/services/storage/*.js` |
| `js/sync.js` | Отсутствует — логика перенесена в `js/services/sync/*.js` |
| `sw.js` | Service Worker PWA: пре-кэш статики/библиотек, офлайн, стратегии fetch |

## Найденные обращения core/shared → конкретные platform-модули (bare `window.*`)

| Файл:строки | Целевой модуль | Что вызывается | Статус |
|---|---|---|---|
| `js/core/views.js:102` | quality (analytics) | `window.RBI.services.inspections.getAllForAnalyticsSync()` | известная связь (блок 2026-07-11, сервисный вызов) |
| `js/core/views.js:127–129` | knowledge | `window.RBI.services.knowledge.reloadReferenceMemory()`, `window.syncDirtyFlags.reference` | известная связь (блок 2026-07-11, сервисный вызов; `syncDirtyFlags` — состояние sync, не в этом кластере) |
| `js/core/views.js:150–151` | construction | `window.ConstructionActions.init()` | известная связь (блок 2026-07-10, легитимный мост) |
| `js/core/views.js:157` | construction | `window.ConstructionActions.initAcceptance()` | известная связь (блок 2026-07-10) |
| `js/core/views.js:170–171` | construction | `window.ConstructionActions.initTransfer()` | известная связь (блок 2026-07-10) |
| `js/core/bootstrap.js:198` | quality | событие `bootstrap:selectorReady` → `audit.module.js` подписка на верхнем уровне → `AuditRender.renderSelector()` | известная связь (блок 2026-07-11, EventBus-мост) |
| `js/core/bootstrap.js:244` | quality | событие `bootstrap:checklistReady` → `audit.module.js` подписка на верхнем уровне → `AuditRender.render()` | известная связь (блок 2026-07-11, EventBus-мост) |
| `js/core/bootstrap.js:328–331` | quality (engineer) | `window.EngineerActions.renderEngineerTab()` (fallback `module.engineer`, bare `window.rbi_renderEngineerTab()` — только последний fallback) | ✅ закрыт (блок 2026-07-12 «устранение fallback-стаба module.engineer») — первый путь теперь публичный `window.EngineerActions.renderEngineerTab()` (по образцу `ConstructionActions.init()`), bare-вызов остаётся только как fallback на случай, если `engineer.actions.js` ещё не загружен |
| `js/shared/photo-editor.utils.js:239, 242` | construction | `window.currentDefectFixId`, событие `sharedPhotoEditor:defectFixSaved` | активная связь (легитимный EventBus-мост, блок 2026-07-10) |
| `js/shared/photo-editor.utils.js:262–263` | quality | событие `sharedPhotoEditor:photoSaved` → `audit.module.js` подписка → `AuditRender.updateCardDOM()`/`AuditActions.scheduleSessionSave()` | известная связь (блок 2026-07-11, EventBus-мост, по образцу `sharedPhotoEditor:defectFixSaved`) |
| `js/shared/smart-input.utils.js:47` | quality | событие `sharedSmartInput:locationUpdated` → `audit.module.js` подписка → `AuditRender.updateUI()` | известная связь (блок 2026-07-11, EventBus-мост) |
| `js/shared/smart-input.utils.js:200–205, 291–292` | quality (через directory-сервисы) | `window.ContractorDirectory.*`, `window.ObjectDirectory.*` | legacy alias сервисов (легитимно) |
| `js/shared/fab-export.utils.js:11, 19` | quality (analytics) | `window.RBI.services.analytics.getActiveSubTab()` | известная связь (блок 2026-07-11, сервисный вызов) |

**Не найдено** прямых bare `window.*` обращений core/shared к gamification/sk/ai/settings.

**Примечание (`views.js`, вызовы без `window.` — та же категория coupling, вне формального критерия «bare `window.*`»):** строки 54, 61, 68, 73–77, 105–106, 131, 139–140, 146/155/166 — `updateUI`, `rbi_renderEngineerTab`, `updateAnalyticsFilters`, `switchAnalyticsSubTab`, `renderCurrentAnalyticsTab`, `renderTwiList`, `renderSettingsTab`, `updateStorageInfo`, `AppModeManager.changeMode(...)`.

---

## Сводка по кластерам нарушений (для планирования следующих блоков §29 п.12)

| Кластер | Примерный объём | Статус |
|---|---|---|
| Core/shared → construction | 2 файла-источника, 4 файла правки | ✅ закрыт (блок 2026-07-10) |
| Core/shared → platform-модули (quality/knowledge, кроме construction) | `views.js`/`bootstrap.js`/`photo-editor.utils.js`/`smart-input.utils.js`/`fab-export.utils.js` — 9 точек | ✅ закрыт полностью (блок 2026-07-12 «устранение fallback-стаба module.engineer» — последняя точка `bootstrap.js:328-331` переведена на `window.EngineerActions.renderEngineerTab()`; предыдущие 8 точек закрыты блоком 2026-07-11 «закрытие кластера `core/shared → platform-модули»`) — вызов через сервис (`inspections.getAllForAnalyticsSync`/`knowledge.reloadReferenceMemory`/`analytics.getActiveSubTab`), событие (`bootstrap:selectorReady`/`bootstrap:checklistReady`/`sharedPhotoEditor:photoSaved`/`sharedSmartInput:locationUpdated`) или публичный API модуля (`EngineerActions.renderEngineerTab`). |
| quality ↔ knowledge | ~7 файлов quality + `knowledge.module.js` | ✅ закрыт (блок 2026-07-11, «Физическая изоляция кластера `quality ↔ knowledge`») |
| quality/construction/sk/ai/gamification/knowledge/settings ↔ permissions (`window.RbiRoles`) | 23+3 файла | ✅ закрыт везде (блок 2026-07-11 «закрытие открытого вопроса 5 оставшихся `RbiRoles`»): `js/services/sk.service.js:161-162`, `js/services/contractor-directory.service.js:239,285`, `js/modules/quality/features/knowledge/knowledge.module.js:31` — все 5 заменены на `window.RBI.services.permissions.*` (кроме `knowledge.module.js`, где сознательно оставлен `\|\| window.RbiRoles` как defensive safety-net fallback — недостижим на практике, не «живое обращение»). Единственные оставшиеся упоминания в кодовой базе — этот fallback и определение алиаса `permission.service.js:325`. |
| */settings (`appSettings`/`isDemoMode` fallback) | 28 файлов, десятки fallback-точек across всех модулей | ✅ закрыт (блок 2026-07-11) — bare-fallback ветка убрана во всех 28 файлах, единственный путь теперь сервис |
| quality ↔ settings (демо-режим, `app-mode-utils.js`/`settings.actions.js`) | 3 файла (`app-mode-utils.js`, `settings.actions.js`, `inspection.service.js`) с ~29 точками на 6 модулей | ✅ закрыт (блок 2026-07-11, «Физическая изоляция кластера `quality ↔ settings`») — кроме сознательно оставленных `_storage`/`_session`/`_templates`-фасадов и `window.currentActiveAnalyticsTab` |
| sk/ai/gamification/construction/knowledge → quality (`HistoryState`/`contractorArray`/`userTemplates`/`SYSTEM_TEMPLATES`/`currentChecklist`/`window.photos`/`rbi_tasksData`/`rbi_fmeaRecords`) | ~15 файлов across модулей | закрыт (план 2026-07-11): `knowledge.module.js` (блок 2026-07-11 ранний), `sk.actions.js`/`sk.render.js`, `ai.actions.js`, `game.state.js`/`game.actions.js`/`game.render.js`, `construction/features/{defect-form,pdf-viewer,acceptance,construction-core}.js` (блок 2026-07-11 финальный) — во всех 10 файлах fallback-ветка устранена, единственный путь — вызов сервиса. Сознательно вне объёма (остаются НАРУШЕНИЕ): `sk.actions.js:39`/`ai.actions.js:37` (`gameLogAction()` bare fallback, не в детальном перечне плана) |
| ai ↔ sk (`window.skTempRawHeaders`/`window.skBadRemarks`) | 3 файла (`sk.service.js`, `sk.actions.js`, `sk.render.js`, `ai.actions.js`) | ✅ закрыт (блок 2026-07-12, «завершение §29 п.12») — новые методы `sk.service.js.getTempRawHeadersSync/setTempRawHeadersSync/getBadRemarksSync/setBadRemarksSync`, все bare `window.skTempRawHeaders`/`window.skBadRemarks` в `ai.actions.js` заменены на вызов через сервис; `sk.render.js:969` переклассифицирован как легитимный публичный API (не входил в это нарушение) |
| ai ↔ knowledge (`window.currentTwiType`/`window.twiStepCount`, `callAI`/`extractTextFromPdf` fallback) | 4 файла (`knowledge.service.js`, `ai.actions.js`, `knowledge.module.js`, `features/faq.js`) | ✅ закрыт (блок 2026-07-12) — новые методы `knowledge.service.js.getTwiTypeSync/getTwiStepCountSync/setTwiStepCountSync`; fallback-ветки `_extractTextFromPdf`/`_callAI`/`typeof window.callAI` устранены (единственный путь — сервис `ai.service.js`) |
| ai ↔ gamification/audit (`window.currentProfileData`, `currentChecklist`/`currentTemplateKey` bare) | 2 файла (`game.service.js`, `ai.actions.js`) | ✅ закрыт (блок 2026-07-12) — новый метод `game.service.js.getCurrentProfileDataSync`; bare `currentChecklist`/`currentTemplateKey` заменены на `window.AuditState.*`. `ai.actions.js:667,681,685` (`window._auditCurrentCommentId`) — принято постоянным исключением (решение архитектора, блок 2026-07-12 «устранение fallback-стаба module.engineer»): read-only ID активной модалки комментария, не пригоден для CRUD-сервиса, YAGNI |
| quality ↔ settings, остаток (`gameActionLogs` bare, `dbClear` минуя `_storage()`) | 2 файла (`game.service.js`-потребитель `settings.actions.js`, `storage.service.js`) | ✅ закрыт (блок 2026-07-12) — `_setGameActionLogs`/`_clearHistory` в `settings.actions.js` больше не читают bare `gameActionLogs`; новый метод `storage.service.js.clear()`, `dbClear`×2 заменены на `_storage().clear(...)` |
| `dbPutBatch` вне обёртки (5 call-site) | 3 файла (`sk.actions.js`, `sk.render.js`, `ai.actions.js`) | ✅ закрыт (блок 2026-07-12) — локальные `_storage().putBatch` в `sk.actions.js`/`sk.render.js` делегируют в `window.RBI.services.storage.putBatch()`; `ai.actions.js` получил `putBatch` в локальном `_storage()`-фасаде, прямой `dbPutBatch` (строка ~1509) заменён на `_storage().putBatch(...)` |
| Решено архитектором (2026-07-12): `js/shared/smart-input.utils.js:106,160` (`dbGetAll('contractor_directory')`/`dbGetAll('project_objects')`) | 1 файл, 2 точки | техдолг §16, устраняется блоком `current_plan.md` (2026-07-12) — заменяется на `window.RBI.services.storage.getAll(...)` (прямой bare-вызов без единого фасада, не «полноценный `_storage()` с fallback») |
| Решено архитектором (2026-07-12): `js/core/bootstrap.js:189,232` (`dbGetAll(STORES.TEMPLATES)`/`dbGetAll(STORES.FEEDBACK_LIST)`) | 1 файл (App Shell), 2 точки | техдолг §16, устраняется блоком `current_plan.md` (2026-07-12) — классифицировано НЕ как App Shell-инфраструктура (в отличие от `restoreSession()`, это точечное чтение стора, а не оркестрация сессии) — заменяется на `window.RBI.services.storage.getAll(...)` |
| Решено архитектором (2026-07-12): классификация bare-fallback внутри `_storage()`/`_triggerSync()`-фасадов | ~24 файла (`_storage()`) / ~17 файлов (`_triggerSync()`) across всех 7 модулей | ✅ принятое архитектурное исключение везде (не техдолг) — распространено с line 411 (`app-mode-utils.js`) на все файлы платформы с идентичной формой: основной путь — вызов сервиса, fallback внутри самого фасада на bare `dbGet`/`dbPut`/`dbGetAll`/`dbDelete`/`triggerSync` при недоступности сервиса. Критерий отличия от техдолга — форма (полноценная обёртка-фасад с делегированием как основной путь), а не количество файлов. `game.render.js:35-38` закрыт этим решением без правки кода. Решение НЕ применяется к двум строкам выше (`bootstrap.js`/`smart-input.utils.js`) — там нет фасада вообще, это прямой bare-вызов. |

STATUS: живой документ, актуализируется Исполнителем (см. `_ai/agents/implementer.rule.md`) после каждого блока, меняющего межмодульные связи.
