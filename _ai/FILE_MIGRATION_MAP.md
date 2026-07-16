# File Migration Map

> Дата: 2026-07-05 (архитектор). Снимок фактической структуры runtime-файлов на момент составления карты.

## Goal

Разобрать все runtime-файлы текущего приложения RBI Quality Pro и определить, куда каждый файл должен переехать в RBI Platform — без потери функционала, без лишних новых файлов, с учётом Compact Module Policy.

Это карта классификации, не план исполнения по функциям. Она даёт архитектору и исполнителю единый справочник: «что это», «где должно быть», «чей это модуль/фича», «что с этим делать», «насколько это рискованно».

## Classification Rules

**Target Layer:**
- `core` — платформенное ядро (`js/core/`)
- `service` — общий сервис (`js/services/*.service.js`)
- `platform module` — один из 7 целевых platform modules
- `internal feature` — внутренний раздел platform module
- `shared` — общие утилиты без бизнес-состояния
- `app-shell` — часть будущей тонкой оболочки (`index.html`/App Shell)
- `temporary proxy` — временный `window.*` мост на период миграции
- `delete after migration` — удаляется после проверки, что не используется
- `keep as infrastructure` — не трогать в рамках platform-миграции (storage/sync/sw/auth)

**Action:**
`keep` / `move` / `split` / `merge` / `convert to feature` / `convert to service` / `convert to shared` / `temporary proxy` / `remove after checks`

**Risk:** `low` / `medium` / `high` / `critical`

---

## File Classification

### Entry points / infra

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `index.html` | HTML shell + все script-теги + inline-разметка/handlers | app-shell (fat) | app-shell | — | — | split (см. INDEX_HTML раздел в APPLICATION_MIGRATION_MAP) | P2 | critical |
| `report.html` | Отдельная HTML-страница печати отчёта, свой inline `<script>` | standalone page | app-shell (отдельная точка входа) | quality | reports | keep (пока не декомпозирован) | P4 | medium |
| `sw.js` | Service Worker, кэш `urlsToCache`, offline-first | infrastructure | keep as infrastructure | — | — | keep, обновлять список путей при переносах | P1 (сопровождающий) | high |
| `manifest.webmanifest` | PWA манифест | infrastructure | keep as infrastructure | — | — | keep | — | low |
| `js/config.js` | Константы конфигурации (Supabase URL/key и т.п.) | standalone global | service (часть settings/sync config) | settings | — | **REMOVED (2026-07-07)** — перенесено 1:1 в `js/services/config.service.js` | done | — |
| `js/services/config.service.js` | `window.APP_CONFIG` + `window.RBI.services.config` (`getSupabaseUrl/getSupabaseKey/getConfig`) | service | service | settings | — | done (2026-07-07), legacy wrapper по образцу `sync.service.js` | — | low |

### Core

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `js/core/rbi-core.js` | EventBus + registry + createContext (`window.RBI`) | core | core | — | — | keep | — | low |
| `js/core/app.entry.js` | Точка инициализации модулей, вызывает `module.init(ctx)` по `MODULE_KEYS` | core | core | — | — | keep, эволюционирует к работе через module-loader | P1 | high |
| `js/core/module-loader.js` | `window.RBI.moduleLoader`: getAll/getById/getMenuItems/getRoutes | core | core | — | — | keep, подключить к реальному запуску | P1 | high |

### Services (уже целевой слой)

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `js/services/storage.service.js` | Обёртка над IndexedDB (`dbPut/dbGet/...`) | service | service | — | — | keep | — | low |
| `js/services/sync.service.js` | Обёртка над Supabase sync | service | service | — | — | keep | — | low |
| `js/services/permission.service.js` | Права доступа (`window.RbiRoles`) | service | service | — | — | keep | — | low |
| `js/services/settings.service.js` | Настройки приложения | service | service | — | — | keep | — | low |
| `js/services/session.service.js` | Сессия пользователя + `restoreSession()` (перенесено из `js/app.js`, Шаг 2) | service | service | — | — | keep | — | low |
| `js/services/inspection.service.js` | CRUD истории проверок | service | service | — | — | keep | — | low |
| `js/services/report.service.js` | CRUD отчётов | service | service | — | — | keep | — | low |
| `js/services/file.service.js` | Фото/PDF/документы | service | service | — | — | keep | — | low |
| `js/services/task.service.js` | CRUD задач/расписания/встреч | service | service | — | — | keep | — | low |
| `js/services/sk.service.js` | CRUD Стройконтроля | service | service | — | — | keep | — | low |
| `js/services/knowledge.service.js` | CRUD базы знаний | service | service | — | — | keep | — | low |
| `js/services/analytics.service.js` | Расчёт метрик качества | service | service | — | — | keep | — | low |
| `js/services/ai.service.js` | Вызовы AI | service | service | — | — | keep | — | low |
| `js/services/app-mode.service.js` | Режим приложения (quality/construction) | service | service | — | — | keep | — | low |
| `js/services/masterData.service.js` | Единая точка мастер-данных | service | service | — | — | keep | — | low |
| `js/services/object-directory.service.js` | Объекты/этажи/квартиры | service | service | — | — | keep | — | low |
| `js/services/contractor-directory.service.js` | Подрядчики/виды работ | service | service | — | — | keep | — | low |
| `js/services/template.service.js` | Шаблоны проверок | service | service | — | — | keep | — | low |

### Shared

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `js/shared/math.utils.js` | Общая математика (без состояния) | shared | shared | — | — | keep | — | low |
| `js/shared/toast.utils.js` | Тосты/уведомления UI | shared | shared | — | — | keep | — | low |
| `js/shared/template.utils.js` | Утилиты шаблонов + `formatNorms(text)` (перенесена из `js/templates.js` 2026-07-07, + `window.formatNorms`) | shared | shared | — | — | keep | — | low |
| `js/shared/smart-input.utils.js` | Smart-input автокомплит: кэш последних значений (`_smartInputMemoryCache`/`smart_input_cache`) + кастомный dropdown без `<datalist>` + пересборка `inp-location` из секции/этажа/помещения, перенесено из `app.js` (2026-07-06), кросс-модульный UI-механизм без бизнес-состояния (используется `quality`, `construction`, `services/object-directory.service.js`) | shared | shared | — | — | keep | — | low |
| `js/shared/touch-gestures.utils.js` | Блокировка Android pull-to-refresh жеста (`rbiBlockAndroidPullToRefreshOnly` IIFE, флаг `window.__rbiPullToRefreshBlockReady`), перенесено из `app.js` (2026-07-07), самодостаточная DOM-утилита без бизнес-состояния, 0 внешних потребителей по имени | shared | shared | — | — | keep | — | low |
| `js/shared/photo-viewer-zoom.utils.js` | Pinch-to-zoom/Pan/Double-Tap для модалки просмотра фото (`#photo-viewer-overlay`/`#photo-viewer-img`), перенесено из инлайн-`<script>` `index.html` (2026-07-08, §29 п.8), самодостаточный DOM-механизм без бизнес-состояния, связь с остальным приложением только по DOM id (разметку/`openPhotoViewer`/`closePhotoViewer` устанавливает `photo-editor.utils.js`), 0 внешних потребителей по имени | shared | shared | — | — | keep | — | low |
| `js/shared/splash-screen.utils.js` | Show/hide сплэш-экрана (`#splash-screen`), перенесено из инлайн-`<script>` `index.html` (2026-07-08, §29 п.8), самодостаточный DOM-механизм без бизнес-состояния, связь с остальным приложением только через стандартное браузерное событие `window.load` и DOM id, 0 внешних потребителей по имени | shared | shared | — | — | keep | — | low |
| `js/shared/pwa-update.utils.js` | Регистрация Service Worker (`./sw.js`), `window.checkForUpdates`, обработчики `#pwa-update-btn`/`updatefound`/`statechange`/`controllerchange` (включая `hadControllerAtLoad`-guard), перенесено из инлайн-`<script>` `index.html` (2026-07-08, §29 п.8, завершение), app-shell PWA/SW controller, 0 внешних потребителей кроме `onclick="window.checkForUpdates()"` в `index.html` | shared (app-shell) | app-shell | — | — | keep | — | low |

### app.js — центральный legacy-монолит

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `js/app.js` — **УДАЛЁН (2026-07-07, Шаг 2)** | Был остаточный монолит (424 стр., 4 раздела). Физически перенесён 1:1 без изменения логики: раздел 1 (глобальные переменные+`appSettings`) и раздел 2 (`DOMContentLoaded`-инициализация) + раздел 4 (fallback-стаб `module.engineer`) → `js/core/bootstrap.js` (новый App Shell файл); раздел 3 (`restoreSession()`) → метод `SessionService.restoreSession` в `js/services/session.service.js` (+ `window.restoreSession`-алиас для 3 внешних вызывающих мест: `sync.js` ×2, `app-mode-utils.js` ×1, без изменений в них). `index.html`/`sw.js` обновлены на `js/core/bootstrap.js`. Файл `app.js` физически удалён, 0 остатка. | legacy monolith | core/app-shell (bootstrap.js) + service (session.service.js) | — | — | removed — перенесено в bootstrap.js + session.service.js | — | — |

### Standalone legacy JS, подключённые напрямую в index.html

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `js/ai.js` | **REMOVED (2026-07-06)** — 33 функции перенесены 1:1 в `js/modules/quality/features/ai/ai.actions.js` (существующий целевой файл, без создания `features/ai-assistant.js`), файл удалён, тег `index.html`/запись `sw.js` убраны | removed | done | ai | ai-assistant | removed — logic migrated into ai/ai.actions.js | — | — |
| `js/export.js` | Экспорт отчётов (PDF/Excel), UI печати | **REMOVED (2026-07-06)** — все 6 групп (G1–G6, 58/58 функций) перенесены 1:1 в `reports.actions.js`/`reports.render.js`, файл удалён, тег `index.html`/запись `sw.js` убраны | removed | quality | reports | removed — logic migrated into reports.actions.js/reports.render.js | — | — |
| `js/etalon.js` | **REMOVED (2026-07-05)** — 12 функций перенесены 1:1 в `etalon.actions.js` как методы `EtalonActions`, файл удалён, тег `index.html`/запись `sw.js` убраны | removed | done | quality | etalon | removed — logic migrated into etalon.actions.js | — | — |
| `js/game.js` | **REMOVED (2026-07-06)** — 67 функций/переменных/констант перенесены 1:1 в `js/modules/quality/features/gamification/{game.state.js, game.actions.js, game.render.js}` (существующие целевые файлы, дублирования не было — делегаты были тонкими), файл удалён, тег `index.html`/запись `sw.js` убраны | removed | done | gamification | — | removed — logic migrated into gamification/game.state.js, game.actions.js, game.render.js | — | — |
| `js/faq.js` (664 стр.) | **REMOVED (2026-07-06)** — код перенесён 1:1 в `js/modules/quality/features/knowledge/features/faq.js` (ES-модуль, side-effect `import` из `knowledge.module.js`), файл удалён, тег `index.html`/запись `sw.js` убраны | removed | done | knowledge | faq | removed — logic migrated into knowledge/features/faq.js | — | — |
| `js/changelog.js` (204 стр.) | **REMOVED (2026-07-06)** — код перенесён 1:1 в `js/modules/quality/features/settings/features/changelog.js` (ES-модуль, `window.RBI_CHANGELOG`/`rbi_openChangelogModal`/`rbi_closeChangelogModal` без изменений), файл удалён, тег `index.html` обновлён (`sw.js` не затронут — не входил в `urlsToCache`) | standalone legacy JS | internal feature модуля `settings` | settings | changelog | removed — logic migrated into settings/features/changelog.js | — | — |
| `js/router.js` (70 стр.) | **REMOVED (2026-07-06)** — код перенесён 1:1 в `js/core/router.js` (classic script, `window.AppRouter` без изменений), файл удалён, тег `index.html`/запись `sw.js` обновлены | standalone legacy JS | core | — | — | removed — logic migrated into core/router.js | — | — |
| `js/views.js` (206 стр.) | **REMOVED (2026-07-07)** — код перенесён 1:1 в `js/core/views.js` (classic script, `window.AppViews`/`switchViewNode`/`showModePlaceholder`/регистрация 13 маршрутов без изменений), файл удалён, тег `index.html`/запись `sw.js` обновлены | standalone legacy JS | core | — | — | removed — logic migrated into core/views.js | — | — |
| `js/templates.js` (1287 стр.) | **REMOVED (2026-07-07)** — `formatNorms()` перенесён в `js/shared/template.utils.js` (+ `window.formatNorms`), `SYSTEM_TEMPLATES`/`CONFIG_MAP`/цикл настройки/пристройка `etalon_act` перенесены 1:1 в новый `data/system_templates.js`, файл удалён, тег `index.html`/запись `sw.js` обновлены (порядок: `template.utils.js` перед `system_templates.js`) | standalone legacy JS | shared + data | quality / settings | templates | removed — split into shared/template.utils.js + data/system_templates.js | — | — |
| `data/system_templates.js` (1281 стр., новый) | Системные мастер-данные `SYSTEM_TEMPLATES`/`CONFIG_MAP`/`etalon_act` (перенесены 1:1 из `js/templates.js`) | data | data | quality / settings | templates | keep | — | low |
| `js/math.js` (521 стр.) | **REMOVED (2026-07-06)** — код перенесён 1:1 в `js/shared/math.utils.js` (реальная реализация вместо делегата, `window.*` сохранены для 9+ потребителей), файл удалён, тег `index.html`/запись `sw.js` убраны | removed | done | — | — | removed — logic migrated into shared/math.utils.js | — | — |
| `js/roles.js` (171 стр.) | Роли и права | **REMOVED (2026-07-06)**, слит в `js/services/permission.service.js` | service | — | — | done | — | — |
| `js/objectDirectory.js` (1041 стр.) | Справочник объектов | **REMOVED (2026-07-06)**, слит в `js/services/object-directory.service.js` | service | — | — | done | — | — |
| `js/contractorDirectory.js` (300 стр.) | Справочник подрядчиков | **REMOVED (2026-07-06)**, слит в `js/services/contractor-directory.service.js` | service | — | — | done | — | — |
| `js/storage.js` (2944 стр.) | Прямая работа с IndexedDB (`dbPut/dbGet/dbGetAll/dbDelete/STORES`) | standalone legacy JS, **infrastructure** | keep as infrastructure | — | — | keep (не трогать без отдельного блока) | — | critical |
| `js/sync.js` (5237 стр.) | Прямая работа с Supabase sync (`triggerSync`, `syncConfig`) | standalone legacy JS, **infrastructure** | keep as infrastructure | — | — | keep (не трогать без отдельного блока) | — | critical |
| `data/system_docs.js`, `data/system_nodes.js`, `data/system_twi.js` | Статические справочные данные для базы знаний | standalone data | shared / internal feature данных `knowledge` | knowledge | knowledge-seed-data | keep (данные, не код-долг) | — | low |

### js/construction/* — старые manager/facade-файлы

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `js/modules/construction/features/construction-core.js` (785 стр., было `js/construction/constructionManager.js`) | Facade-менеджер стройконтроля/строительства (`window.ConstManager`, 1 объект), UI + бизнес-логика | internal feature модуля `construction` (physically moved 2026-07-07) | internal feature модуля `construction` | construction | construction-core | **done** (move-only, логика не менялась; `js/construction/` удалена, раздел `construction`-legacy полностью закрыт) | P3 | high |
| `js/modules/construction/features/transfer.js` (196 стр., было `js/construction/transferManager.js`) | Facade передачи объектов (`window.TransferManager`) | internal feature модуля `construction` (physically moved 2026-07-07) | internal feature модуля `construction` | construction | transfer | **done** (move-only, логика не менялась) | P3 | high |
| `js/modules/construction/features/acceptance.js` (594 стр., было диапазон 2450–3036 в `js/construction/constructionManager.js`) | Facade журнала заявок на приёмку работ (`window.ConstAcceptance`) | internal feature модуля `construction` (physically moved 2026-07-07) | internal feature модуля `construction` | construction | acceptance | **done** (move-only, логика не менялась) | P3 | high |
| `js/modules/construction/features/admin.js` (501 стр., было диапазон 791–1285 в `js/construction/constructionManager.js`) | CRUD-фасад редактора иерархии объектов/корпусов/этажей (`window.ConstAdmin`), мутирует `window.ConstManager.objects/buildings/floors` | internal feature модуля `construction` (physically moved 2026-07-07) | internal feature модуля `construction` | construction | construction-admin | **done** (move-only, логика не менялась, `triggerSync()` не поднимался в общий слой) | P3 | medium |
| `js/modules/construction/features/pdf-viewer.js` (388 стр., было диапазон 787–1172 в `js/construction/constructionManager.js`) | Универсальный PDF-просмотрщик с panzoom и маркерами дефектов/зон (`window.UniversalPdfViewer`), пишет `window.ConstManager.currentFlrId/defects`, вызывает `window.ConstDefectForm.renderAllPins/openNew`/`window.ConstAcceptance.openNewRequestModal` | internal feature модуля `construction` (physically moved 2026-07-07) | internal feature модуля `construction` | construction | pdf-viewer | **done** (move-only, логика не менялась) | P3 | medium |
| `js/modules/construction/features/defect-form.js` (770 стр., было диапазон 788–1555 в `js/construction/constructionManager.js`) | Управление формой дефекта и отрисовка булавок на планах (`window.ConstDefectForm`, 17 методов), мутирует `window.ConstManager.defects`, читает `window.UniversalPdfViewer.panzoomInstance`/`window.ConstAcceptance.requests` | internal feature модуля `construction` (physically moved 2026-07-07) | internal feature модуля `construction` | construction | defect-form | **done** (move-only, логика не менялась) | P3 | medium |

### js/modules/construction/*

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `construction.manifest.js` | Паспорт platform module | platform module manifest | platform module | construction | — | keep | — | low |
| `construction.module.js` / `.state.js` / `.actions.js` / `.render.js` | Внутренний жизненный цикл/состояние/действия/рендер | internal module files | internal feature(s) | construction | construction-core | keep, наполнять по мере переноса из `constructionManager.js`; `.actions.js`/`.render.js` уже содержат 36 перенесённых `window.const*_*`-прокси (2026-07-07) | P3 | medium |
| `construction.legacy.js` | Прокси/фасад совместимости на старый `ConstManager`/`TransferManager` | temporary proxy | temporary proxy | construction | — | **removed (2026-07-07)** — перенесён 1:1 в `construction.actions.js`/`.render.js` | — | done |
| `index.js` | Публичная точка входа модуля | platform module entry | platform module | construction | — | keep | — | low |

### js/modules/quality/features/knowledge/*

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `knowledge.manifest.js`, `index.js` | Паспорт + публичный вход | platform module | platform module | knowledge | — | keep | — | low |
| `knowledge.module.js` / `.state.js` / `.actions.js` / `.render.js` | Внутренняя логика (TWI/узлы/документы, ~700 строк, перенесено в Step 38) | internal module files | internal feature(s) (`twi`, `nodes`, `docs`) | knowledge | twi / nodes / docs | keep, при разрастании — разложить на `features/*` | P4 | medium |
| `knowledge.legacy.js` | REMOVED (2026-07-06), содержал живой код (TWI/докс/узлы рендер+конструктор), перенесён в `knowledge.module.js` | — | — | knowledge | — | removed | — | — |

### js/modules/quality/* — целевая консолидация в один platform module

> Полная карта переходной консолидации — в `_ai/COMPACT_MODULE_RESTRUCTURE_PLAN.md`. Здесь — построчная классификация текущих файлов.

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `audit.manifest.js`, `audit/index.js`, `audit.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние) | platform module (transitional) | internal feature | quality | audit | merge → convert to feature (см. Compact Restructure Plan) | P5 | medium |
| `audit.legacy.js` | **DELETED (2026-07-05)** — бизнес-логика перенесена в `audit.actions.js`/`audit.render.js` как реальные методы (owner-module), источник данных — `AuditState.*`; файл удалён физически, теги `index.html`/`sw.js` убраны | legacy (removed) | done | quality | audit | done — logic migrated into audit.actions.js/audit.render.js | P5 | medium |
| `history.manifest.js`, `history/index.js`, `history.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние) | platform module (transitional) | internal feature | quality | history | merge → convert to feature | P5 | medium |
| `history.legacy.js` | **DELETED** (2026-07-05) — бизнес-логика перенесена в `history.actions.js`/`history.render.js`, файл удалён, тег `index.html`/запись `sw.js` убраны | removed | — | quality | history | done — logic migrated into actions/render, file removed | — | — |
| `analytics.manifest.js`, `analytics/index.js`, `analytics.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние) | platform module (transitional) | internal feature | quality | analytics | merge → convert to feature | P5 | medium |
| `analytics.legacy.js` | **REMOVED** (2026-07-05) — бизнес-логика перенесена в `analytics.actions.js`/`analytics.render.js` 1:1, файл удалён, тег в `index.html` и запись в `sw.js` убраны | — | done | quality | analytics | removed — logic migrated into actions/render | — | — |
| `tasks.manifest.js`, `tasks/index.js`, `tasks.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние), уже физически перенесён из `app.js` (Step 36) | platform module (transitional) | internal feature | quality | tasks | merge → convert to feature | P5 | medium |
| `tasks.legacy.js` | **done — удалён** (Шаг 6, 2026-07-05) — подтверждён no-op (4 строки, только комментарий), был подключён в `index.html`/`sw.js`, оба подключения убраны | — (удалено) | deleted | quality | tasks | removed | P5 | low |
| `reports.manifest.js`, `reports/index.js`, `reports.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние), без legacy-обёртки | platform module (transitional) | internal feature | quality | reports | merge → convert to feature | P5 | medium |
| `etalon.manifest.js`, `etalon/index.js`, `etalon.module.js/.state/.render` | Отдельный platform module (переходное состояние) | platform module (transitional) | internal feature | quality | etalon | merge → convert to feature | P5 | medium |
| `etalon.actions.js` | **DONE (2026-07-05)** — бизнес-логика перенесена из `js/etalon.js` как реальные методы `EtalonActions` (owner-module), источник состояния — `window.etalonActsArray`/`window.weeklyPlanData`/`window.contractorStatuses`; перенос завершён, `js/etalon.js` удалён физически, тег `index.html`/запись `sw.js` убраны | internal module file | done | quality | etalon | done — logic migrated into etalon.actions.js | P5 | — |
| `engineer/engineer.manifest.js`, `engineer/index.js`, `engineer.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние) | platform module (transitional) | internal feature | quality | engineer | merge → convert to feature | P5 | medium |
| `schedule/schedule.manifest.js`, `schedule/index.js`, `schedule.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние), перенесено Step 31 | platform module (transitional) | internal feature | quality | schedule | merge → convert to feature | P5 | medium |
| `meetings/meetings.manifest.js`, `meetings/index.js`, `meetings.module.js/.state/.actions/.render` | Отдельный platform module (переходное состояние), перенесено Step 32-34 | platform module (transitional) | internal feature | quality | meetings | merge → convert to feature | P5 | medium |
| `meetings.legacy.js` | **done — удалён** (Шаг 6, 2026-07-05) — не был подключён ни в `index.html`, ни в `sw.js`; `window.rbi_*` accessors уже дублировались в `meetings.module.js` | — (удалено) | deleted | quality | meetings | removed | P5 | low |
| `interventions.module.js` | Воздействия/Impact/Practices/FMEA, физически перенесено из `app.js` (Step 37), без manifest/index (правильно — это future internal feature, не отдельный platform module) | internal module file (без manifest) | internal feature | quality | interventions | convert to feature (переместить в `features/interventions.js` при консолидации) | P5 | medium |
| `shared/multi-filter.js` | Модалка мульти-фильтра (Объект/Подрядчик/Инспектор/Вид работ), перенесено из `app.js` (2026-07-06), общая логика для features `history`+`analytics`, без manifest/index (internal-feature-shared utility) | internal module file (без manifest) | internal feature (shared) | quality | history, analytics | done | — | low |

### js/modules/quality/features/settings/*, js/modules/quality/features/sk/*, js/modules/quality/features/ai/*, js/modules/quality/features/gamification/*

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `settings.manifest.js`, `settings/index.js`, `settings.module.js` | Паспорт + вход + жизненный цикл | platform module | platform module | settings | — | keep | — | low |
| `settings.actions.js` | Действия (уже подключается напрямую как отдельный `<script>` в index.html, не через модуль) | internal module file, но подключён отдельным script-тегом (тех.долг подключения) | internal feature | settings | settings-actions | keep, исправить подключение (грузить через `settings.module.js`, а не отдельным тегом) | P4 | medium |
| `settings.legacy.js` | **REMOVED (2026-07-07)**. Логика перенесена в `settings.render.js` (новый, DOM-отрисовка) + `settings.actions.js` (остальное, реальные функции вместо делегатов) | legacy (удалён) | done — deleted | settings | — | removed after checks | — | low |
| `sk.manifest.js`, `sk/index.js`, `sk.module.js/.state/.actions/.render` | Platform module Стройконтроля | platform module | platform module | sk | — | keep | — | low |
| `sk.legacy.js` | **REMOVED (2026-07-07)** | legacy (удалён) | done | sk | `sk.actions.js`/`sk.render.js` | removed after checks | P4 | low |
| `ai/ai.manifest.js`, `ai/index.js`, `ai.module.js/.state/.actions/.render` | Platform module AI (`js/ai.js` удалён 2026-07-06, вся логика перенесена в `ai.actions.js`) | platform module | platform module | ai | — | keep | — | low |
| `gamification/game.manifest.js`, `gamification/index.js`, `game.module.js/.state/.actions/.render` | Platform module геймификации (`js/game.js` удалён 2026-07-06, вся логика перенесена в `game.state.js`/`game.actions.js`/`game.render.js`) | platform module | platform module | gamification | — | keep | — | low |

### js/modules/quality/features/settings/features/feedback.js, js/modules/quality/features/settings/features/app-mode-utils.js

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `settings/features/feedback.js` | Обратная связь/идеи/roadmap, перенесено из `app.js` (Step 39), физически перемещено из `feedback/feedback.module.js` | internal feature (без manifest, как у quality-features) | internal feature | settings | feedback | done | — | low |
| `settings/features/app-mode-utils.js` | Логотип/режимы приложения/push/purge, перенесено из `app.js` (Step 39), физически перемещено из `app-utils/app-utils.module.js` целиком (YAGNI: без split в `app-mode.service.js`) | internal feature (без manifest, как у quality-features) | internal feature | settings | app-mode-utils | done | — | low |

### modules.manifest.js

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `js/modules/modules.manifest.js` | Агрегирует все `*.manifest.js` | core-adjacent registry | core-adjacent registry (module loader input) | — | — | keep, обновлять по мере консолидации quality-манифестов | P1 | high |

### CSS

| File | Current Role | Current Layer | Target Layer | Owner Module | Owner Feature | Action | Priority | Risk |
|---|---|---|---|---|---|---|---|---|
| `css/style.css` | Единый монолитный стиль всего приложения | standalone legacy CSS | app-shell / shared (будущий `css/platform.*.css`, не начинать сейчас) | — | — | keep (не декомпозировать в текущем блоке — см. раздел «Что не делать сейчас») | — | low |

---

## Итог по количеству файлов

- Актуальное число runtime JS-файлов (`js` + `data`, без `libs/`, `_backup/`, `node_modules`; подтверждено `find js data -name "*.js" ... | wc -l` на 2026-07-07): **129**. Устаревшее число 144 (снимок 2026-07-05, до закрытия `js/templates.js`/раздела `construction`/9 `*.legacy.js`-прокси) больше не актуально.
- Раскладка по зонам на 2026-07-07:
  - `js/*.js` (корень, вне модулей): 4 — `app.js` (657 стр., application shell + global-state слой), `config.js` (4 стр.), `storage.js` (2944 стр.), `sync.js` (5237 стр.). Последние 3 защищены правилом «не трогать без отдельного блока».
  - `js/core/*`: 5 (`app.entry.js`, `module-loader.js`, `rbi-core.js`, `router.js`, `views.js`).
  - `js/services/*`: 18 — целевой слой, не разбирается.
  - `js/shared/*`: 9 — целевой слой, не разбирается.
  - `js/modules/quality/*`: 42 — 9 features (по 4 файла `.module/.state/.actions/.render`: audit/history/analytics/tasks/reports/etalon/engineer/schedule/meetings) + `interventions.js` + `reference/reference.js` + `shared/multi-filter.js` + `manifest.js`/`index.js`/`quality.module.js`. Финальная структура — слияние features в общие файлы решено НЕ выполнять (YAGNI, см. `COMPACT_MODULE_RESTRUCTURE_PLAN.md`, п. 5.1).
  - `js/modules/quality/features/sk/*`: 6. `js/modules/quality/features/ai/*`: 6. `js/modules/quality/features/gamification/*`: 6. Все компактные, `keep`.
  - `js/modules/construction/*`: 12 — 6 features (`construction-core`/`transfer`/`acceptance`/`admin`/`pdf-viewer`/`defect-form`) + `manifest.js`/`index.js`/`construction.module.js/.state/.actions/.render`. Раздел закрыт (`js/construction/` удалена).
  - `js/modules/quality/features/knowledge/*`: 7. `js/modules/quality/features/settings/*`: 9. `js/modules/modules.manifest.js`: 1.
  - `data/*.js`: 4 (`system_docs.js`, `system_nodes.js`, `system_twi.js`, `system_templates.js`) — данные, не код-долг.
- Дальнейшее физическое сокращение числа файлов не является самостоятельной целью — целостность/изоляция features (9 quality-features, 6 construction-features) важнее формального попадания в диапазон ориентира. Ориентир скорректирован в `ARCHITECTURE_BRIEF.md` на «~125–135 runtime-файлов».
- Вся классификация из этой карты переведена в физические изменения — весь standalone legacy JS и `construction`-legacy закрыты. Карта остаётся справочником для будущих блоков (`app.js`, `window.*`-прокси, Tracked deferred items).
