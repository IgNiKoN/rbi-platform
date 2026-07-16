# Compact Module Restructure Plan

> Дата: 2026-07-05 (архитектор). Связанные документы: `_ai/FILE_MIGRATION_MAP.md`, `_ai/APPLICATION_MIGRATION_MAP.md`.

## Goal

Сократить избыточную модульность и привести структуру `js/modules/quality/*` к Compact Module Policy: один platform module `quality` с internal features, вместо девяти отдельных переходных platform modules.

## Current Issue

На фактический момент (2026-07-05) в `js/modules/quality/` существуют **9 отдельных наборов** `manifest.js` + `index.js` + `*.module.js`/`.state.js`/`.actions.js`/`.render.js`, каждый зарегистрирован в `js/modules/modules.manifest.js` как самостоятельный platform module:

`audit`, `history`, `analytics`, `tasks`, `reports`, `etalon`, `engineer` (папка `engineer/`), `schedule` (папка `schedule/`), `meetings` (папка `meetings/`).

Дополнительно есть `interventions.module.js` — уже физически перенесённый из `app.js` блок без собственного manifest/index (это правильное направление). `feedback`/`app-mode-utils` уже физически перенесены под `settings/features/*` как internal features `settings` (owner зафиксирован и физически закрыт).

Это **не ошибка предыдущих шагов** — это результат последовательной, безопасной декомпозиции `app.js` блок за блоком (Steps 29–39), выполненной по принципу wrapper/strangler fig. Но с точки зрения Compact Module Policy это **переходное состояние**, которое нужно консолидировать: `quality` должен быть одним platform module, а 9 разделов — его internal features.

**Ничего из существующих 9 manifest.js/index.js не удаляется прямо сейчас.** Это отдельный будущий крупный шаг (не текущий блок).

## Target

> **Статус (2026-07-05): достигнуто и зафиксировано как финальное.** Ниже — фактическая структура, а не гипотетическая цель. Общие `quality.state.js`/`.actions.js`/`.render.js` в корне **не создаются** — см. «Порядок предполагаемой консолидации», пункт 5.1 (архитектурное решение: слияние 9 features в общие файлы не выполняется).

```
js/modules/quality/
  manifest.js            — один паспорт platform module quality
  index.js                — одна публичная точка входа
  quality.module.js       — общий жизненный цикл (агрегирует features)

  features/
    audit/     (audit.module.js + .state.js + .actions.js + .render.js)
    history/   (аналогично)
    analytics/ (аналогично)
    tasks/     (аналогично)
    reports/   (аналогично)
    etalon/    (аналогично)
    engineer/  (аналогично)
    schedule/  (аналогично)
    meetings/  (аналогично)
    interventions.js  (один файл, без под-папки — маленькая фича)
    reference/  (reference.js — один файл, без .state/.actions/.render — небольшая фича)
```

Общий `quality.state.js`/`.actions.js`/`.render.js` в корне создаются в будущем только по факту реальной общей потребности нескольких features (например, общий каркас переключения вкладок) — не заранее (YAGNI).

Правила Compact Module Policy применяются без исключений:
- `manifest.js` + `index.js` — только для platform module `quality` целиком, не для отдельных features.
- Internal features не получают собственный manifest/index.
- Пустые `state`/`actions`/`render` не создаются — если feature небольшая, она остаётся одним файлом в `features/`.
- Разделение `feature.js` на `feature/feature.state.js` / `.actions.js` / `.render.js` — только если feature реально большая (по аналогии с текущими `audit.state.js` и т.п., которые уже большие и есть смысл сохранить разделение внутри `features/audit/`).

## Current → Target Mapping

| Current Module/File | Target Module | Target Feature | Action | Risk | Notes |
|---|---|---|---|---|---|
| `quality/audit.manifest.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4b) | medium | Заменяется одним общим `quality/manifest.js` |
| `quality/audit/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4b) | medium | Заменяется одним общим `quality/index.js` |
| `quality/audit.module.js`, `.state.js`, `.actions.js`, `.render.js` | quality | audit | **done** — перенесено в `quality/features/audit/` (2026-07-05, Шаг 4b) | medium | Логика не переписывается, только путь и подключение (`index.html`/`sw.js`) |
| `quality/audit.legacy.js` | quality | audit | **done** — перенесено в `quality/features/audit/` (2026-07-05, Шаг 4b) | low | Содержимое не читалось/не менялось, только путь |
| `quality/history.manifest.js`, `history/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4b) | medium | То же, что audit |
| `quality/history.module.js/.state/.actions/.render` | quality | history | **done** — перенесено в `quality/features/history/` (2026-07-05, Шаг 4b) | medium | Разделение сохранено |
| `quality/history.legacy.js` | quality | history | **done** — перенесено в `quality/features/history/` (2026-07-05, Шаг 4b); бизнес-логика перенесена в `history.actions.js`/`history.render.js`, файл удалён (2026-07-05) | low | — |
| `quality/analytics.manifest.js`, `analytics/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4b) | medium | — |
| `quality/analytics.module.js/.state/.actions/.render` | quality | analytics | **done** — перенесено в `quality/features/analytics/` (2026-07-05, Шаг 4b) | medium | — |
| `quality/analytics.legacy.js` | quality | analytics | **done** — перенесено в `quality/features/analytics/` (2026-07-05, Шаг 4b) | low | — |
| `quality/tasks.manifest.js`, `tasks/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4a) | low | tasks уже физически без бизнес-логики в legacy |
| `quality/tasks.module.js/.state/.actions/.render` | quality | tasks | **done** — перенесено в `quality/features/tasks/` (2026-07-05, Шаг 4a) | medium | — |
| `quality/tasks.legacy.js` | quality | tasks | **done** — перенесено в `quality/features/tasks/` (no-op) (2026-07-05, Шаг 4a) | low | Уже no-op (Step 36) |
| `quality/reports.manifest.js`, `reports/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4a) | low | Без legacy-обёртки — самый простой случай |
| `quality/reports.module.js/.state/.actions/.render` | quality | reports | **done** — перенесено в `quality/features/reports/` (2026-07-05, Шаг 4a) | low | Учесть объединение с `js/export.js` (см. Application Migration Map) — не входило в этот блок |
| `quality/etalon.manifest.js`, `etalon/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4a) | low | — |
| `quality/etalon.module.js/.state/.actions/.render` | quality | etalon | **done** — перенесено в `quality/features/etalon/` (2026-07-05, Шаг 4a) | low | Учесть объединение с `js/etalon.js` — не входило в этот блок |
| `quality/engineer/engineer.manifest.js`, `engineer/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4c) | low | — |
| `quality/engineer/engineer.module.js/.state/.actions/.render` | quality | engineer | **done** — перенесено в `quality/features/engineer/` (2026-07-05, Шаг 4c) | low | — |
| `quality/schedule/schedule.manifest.js`, `schedule/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4c) | low | — |
| `quality/schedule/schedule.module.js/.state/.actions/.render` | quality | schedule | **done** — перенесено в `quality/features/schedule/` (2026-07-05, Шаг 4c) | low | — |
| `quality/meetings/meetings.manifest.js`, `meetings/index.js` | quality | — (удалено) | **done** — удалено (2026-07-05, Шаг 4c) | low | — |
| `quality/meetings/meetings.module.js/.state/.actions/.render` | quality | meetings | **done** — перенесено в `quality/features/meetings/` (2026-07-05, Шаг 4c) | low | — |
| `quality/meetings/meetings.legacy.js` | quality | meetings | **done** — перенесено в `quality/features/meetings/` (2026-07-05, Шаг 4c) | low | Файл не подключён отдельным `<script>`-тегом в `index.html` (не было и раньше) — не менялось в рамках этого блока |
| `quality/interventions.module.js` | quality | interventions | **done** — перенесено в `quality/features/interventions.js` (2026-07-05, Шаг 4c) | low | Уже не имел manifest/index — перенесён напрямую в `features/`; в агрегатор `SUB_MODULE_KEYS` не добавлен (вне рамок блока) |
| `js/modules/modules.manifest.js` | — | — | move (обновить содержимое) | high | Заменить 9 импортов quality-манифестов на 1 импорт `quality/manifest.js` |
| `js/core/app.entry.js` (`MODULE_KEYS`) | — | — | move (обновить содержимое) | critical | Заменить 9 отдельных ключей quality-модулей на 1 ключ `quality`, который внутри себя инициализирует все features |
| `js/modules/settings/features/feedback.js` | settings | feedback | done — перенесён из `js/modules/feedback/feedback.module.js` | low | Owner `settings` зафиксирован, т.к. обратная связь — часть управления приложением, не качества |
| `js/modules/settings/features/app-mode-utils.js` | settings | app-mode-utils | done — перенесён из `js/modules/app-utils/app-utils.module.js` целиком (YAGNI: split в `app-mode.service.js` не выполнялся, не требуется текущими задачами) | low | Часть функций (AppModeManager) может стать частью `app-mode.service.js` в будущем, если появится реальная потребность нескольких модулей |
| `js/app.js` (раздел «Справочник → Чек-листы») | quality | reference | done — перенесено в `quality/features/reference/reference.js` (2026-07-06), 10-я internal feature | low | Один файл без под-папки (по аналогии с `interventions.js`) — не большая фича, не требует `.state.js`/`.actions.js`/`.render.js` |
| `js/app.js` (раздел «Интерактивный тур») | settings | tutorial | done — перенесено в `js/modules/settings/features/tutorial.js` (2026-07-06) | low | Classic-script (не `type="module"`, в отличие от `feedback.js`/`app-mode-utils.js`) — inline `onclick` в `index.html` требуют бареных глобальных идентификаторов `startInteractiveTutorial`/`stopTutorial`/`nextTutorialStep`, не `window.*` |

## Rules

- Не удалять текущие manifest/index без проверки загрузки (проверить, что `modules.manifest.js` и `app.entry.js` продолжают инициализировать все 9 разделов через новый единый `quality` module).
- Сначала создать карту (этот документ) — не начинать физическое слияние в текущем блоке.
- Затем консолидировать по одному крупному направлению за раз (например: сначала `tasks` + `reports` + `etalon` как самые безопасные (без активного legacy), потом `audit`/`history`/`analytics`/`meetings` (с legacy-изоляцией), последним — `interventions`/`engineer`/`schedule`).
- Сохранять совместимость через temporary proxy/fallback (`window.rbi_*` accessor-функции остаются на весь переходный период).
- Обновлять `sw.js` при изменении путей (пути `js/modules/quality/features/*.js` заменят текущие пути `js/modules/quality/*.module.js` в `urlsToCache`, если они там перечислены явно).
- Каждый шаг консолидации — отдельный крупный исполнительский блок с обязательным smoke-тестом, не микрошаг.

## Порядок предполагаемой консолидации (для будущего планирования, не выполнять сейчас)

1. ~~Создать единый `quality/manifest.js` + `quality/index.js` + `quality.module.js`, который агрегирует существующие 9 модулей как есть (без физического переноса файлов) — «мягкая» консолидация на уровне регистрации.~~ **Выполнено (2026-07-05)** — см. `_ai/CURRENT_STEP.md`, раздел «Compact Module Restructure — Шаг 1».
2. ~~Обновить `modules.manifest.js` и `app.entry.js` на использование одного ключа `quality`.~~ **Выполнено (2026-07-05)** — `ModulesManifest`/`MODULE_KEYS`: 15 → 7.
3. Smoke-тест: все 9 разделов качества работают через единую точку входа. **Выполнено (2026-07-06), TEST_PASSED** — см. `_ai/CURRENT_STEP.md`, раздел «Tester smoke-check — Compact Module Restructure Шаг 3 (единая точка входа `quality`)».
4. ~~Физическое перемещение файлов из `quality/*.module.js` в `quality/features/*` (по одному разделу за раз).~~ **Выполнено (2026-07-05)** — Шаг 4a: `tasks`/`reports`/`etalon`; Шаг 4b: `audit`/`history`/`analytics`; Шаг 4c: `engineer`/`schedule`/`meetings`/`interventions`. Итого перенесено 9 из 9 features + `interventions` — 100%.
5. ~~Удаление старых `manifest.js`/`index.js` каждого раздела после переноса и проверки.~~ **Выполнено (2026-07-05)** — Шаг 4c закрыл последнюю группу (`engineer`/`schedule`/`meetings`); в корне `js/modules/quality/` не осталось «голых» `<name>.module.js`/`manifest.js`/`index.js`, кроме самого агрегатора (`quality.module.js`, `manifest.js`, `index.js`).
5.1. **Шаг 7 (слияние `features/*/*.state.js`/`.actions.js`/`.render.js` в единые `quality.state.js`/`.actions.js`/`.render.js`) — РЕШЕНО НЕ ВЫПОЛНЯТЬ (архитектурное решение 2026-07-05).** Текущая структура (`manifest.js` + `index.js` + `quality.module.js`-агрегатор в корне, 9 фич с собственными `state/actions/render` в `features/<name>/`) уже полностью соответствует Compact Module Policy на уровне внешнего контракта платформы — `modules.manifest.js` видит один модуль `quality`, не 9. Физическое слияние кода 9 разных бизнес-фич в 3 больших файла даёт только формальное сходство с изначальным чертежом раздела «Target», но:
   - увеличивает размер файлов до тысяч строк без архитектурной пользы (прямое нарушение цели рефакторинга — маленькие управляемые файлы);
   - создаёт конфликты имён между фичами (`render()`, `init()` и т.п. в разных фичах), требующие чисто механических переименований;
   - ухудшает изоляцию и тестируемость фич друг от друга;
   - несёт риск регрессии (перенос тысяч строк кода) без новой функциональности, что прямо противоречит принципу «модули должны быть изолированы», а не смешаны в общие файлы.
   Текущая структура `features/*` с собственным `state/actions/render` на фичу считается **финальной** для `quality`. Общий `quality.render.js`/`.actions.js`/`.state.js` в корне создаются в будущем только если появится реально общая для нескольких фич логика (например, общий каркас переключения вкладок) — не заранее, по факту конкретной потребности (YAGNI).
6. Удаление `*.legacy.js` файлов после подтверждения нулевых внешних зависимостей. **Частично выполнено (2026-07-05, Шаг 6)**:
   - `tasks.legacy.js` — **DELETE, выполнено**. Подтверждён no-op (4 строки, только комментарий, Step 36). Удалён физически; убраны `<script>`-тег в `index.html` и запись в `sw.js`.
   - `meetings.legacy.js` — **DELETE, выполнено**. Не был подключён ни в `index.html`, ни в `sw.js` (preexisting факт); `window.rbi_*` accessors дублировались в `meetings.module.js`. Удалён физически, подключений менять не требовалось.
   - `audit.legacy.js` — **DONE (2026-07-05)**. Бизнес-логика перенесена в `audit.actions.js`/`audit.render.js` как реальные методы (не делегаты): `AuditActions.saveSession/scheduleSessionSave/toggleOk/toggleFail/toggleEscalation/saveProductToArray/changeTemplate/resetChecklist/handlePhotoUpload/getSessionPhotosForSync/triggerPhotoInput/removePhoto/toggleCommentField/closeCommentModal/saveCommentModal/deleteComment` и `AuditRender.render/renderSelector/updateUI/updateDataSummary/toggleDataBlock/updateCardDOM/updateGroupCounters/toggleGroup/scrollToGroup/expandCard`. Источник данных — `AuditState.state/.details/.photos/.currentTemplateKey/.currentChecklist` вместо голых идентификаторов; мутации через `AuditState.setState/.setDetail/.setTemplate/.setChecklist/.resetSession`. Константа `_AUDIT_DEFECT_CAUSES` перенесена в `audit.render.js` (с `window._AUDIT_DEFECT_CAUSES` для обратной совместимости). Registry-запись `quality.audit` не перенесена (Grep подтвердил 0 внешних чтений — YAGNI). Fallback-регистрация `module.audit` (Блок 14 Integration) не перенесена — избыточна, `audit.module.js` уже безусловно регистрирует. Файл `audit.legacy.js` удалён физически, тег `index.html`/запись `sw.js` убраны.
   - `history.legacy.js` — **DONE (2026-07-05)**. Бизнес-логика перенесена в `history.actions.js`/`history.render.js` как реальные методы (не делегаты); `window.renderHistoryTab`, `window.applyHistoryFilters`, `window.deleteSelectedHistory`, `window.exportSelectedCsv`, `window.showHistoryDetail`, `window.toggleAllHistory`, `window.getSelectedHistoryIds`, `window.updateAllDynamicFilters`, `window.loadMoreHistoryGroups`, `window.loadHistoryData` теперь выставляются из `.actions.js`/`.render.js`. Файл `history.legacy.js` удалён, тег `index.html`/запись `sw.js` убраны.
   - `analytics.legacy.js` — **REMOVED (2026-07-05)**. Бизнес-логика (~2924 строки, ~35 функций) перенесена 1:1 в `analytics.actions.js`/`analytics.render.js`, по аналогии с уже выполненным для `history.legacy.js`/`audit.legacy.js`. Файл удалён, тег в `index.html` и запись в `sw.js` убраны. Последний `KEEP`-файл секции «Аналитика» закрыт — раздел полностью перенесён на целевую архитектуру.
   - `settings.legacy.js` — **REMOVED (2026-07-07)**. Бизнес-логика (670 строк) перенесена: `_renderSettingsTab`/`_applySettingsToUI` (чистая DOM-отрисовка) — в новый `js/modules/settings/settings.render.js` (classic-script), остальные 12 функций (`_storage/_setSetting/_getSetting/_rbiGetSavedThemePreference/_rbiSaveThemePreference/_loadSettings/_saveSettings/_toggleSetting/_resetSettingsToDefault/_clearPdfCache/_previewStorageCleanup/_showAboutApp/_clearHistory/_fullFactoryReset/_rbi_renderBackupRegistry`) — в существующий `settings.actions.js` (тип файла не менялся, остался ES-модулем), заменив делегат-методы `SettingsActions.loadSettings/get/set` на прямые вызовы. `settingsModule`/`window.*`-прокси (14 идентификаторов) перенесены в `settings.actions.js`, кроме `renderSettingsTab`/`applySettingsToUI`, которые теперь выставляются из `settings.render.js`. Файл `settings.legacy.js` удалён, тег в `index.html` заменён на `settings.render.js`, запись в `sw.js` заменена аналогично.
   - `sk.legacy.js` — **REMOVED (2026-07-07)**. Бизнес-логика (2124 строки) разнесена по владению между существующими ES-модулями `sk.actions.js`/`sk.render.js` (типы файлов не менялись): рендер-функции (`sk_renderContractorQueueBanner/sk_renderMainTab/sk_renderVolumes/sk_showMappingModal/sk_showNormalizationModal/sk_renderDashboard/sk_renderHrTab/sk_showInfoModal/sk_openCategoryLinkModal/sk_closeContractorLinkModal/sk_fillContractorSuggestion` — 11 функций) — в `sk.render.js`, заменив 4 делегата на реальные функции; CRUD/импорт/аналитика/доступ (`sk_extractStandards/sk_normalizeCategoryKey/sk_sortHrTable/sk_loadData/sk_clearData/sk_switchView/sk_addVolume/sk_deleteVolume/sk_handleExcelImport/sk_executeImport/sk_resolvePair/sk_finalizeImport/sk_deleteRecord/sk_saveCategoryLink/sk_openContractorLinkModal/sk_saveContractorLink/sk_generateAnomalyTasks` — 16 функций + внутренние утилиты) — в `sk.actions.js`, заменив делегат `window.sk_loadData()` на прямой внутрифайловый вызов. Итого 27 `window.sk_*`-идентификаторов распределены без дублей. Объект `skModule` (реестр `'sk'`) и fallback-заглушка `'module.sk'` — перенесены в `sk.actions.js`. `_storage()`/`_inspections()`/`sk_getPendingContractorsQueue()`/`SK_FIELDS` продублированы как локальные копии в обоих файлах (по прецеденту `settings.render.js`/`settings.actions.js` — независимые файлы без общего module-scope). Файл `sk.legacy.js` удалён, тег `<script src="js/modules/sk/sk.legacy.js">` убран из `index.html`, запись `'./js/modules/sk/sk.legacy.js'` убрана из `sw.js` (`sk.actions.js`/`sk.render.js` уже были в `urlsToCache`).
   - `construction.legacy.js` — **REMOVED (2026-07-07)**. Чистый прокси/фасад-генератор (133 строки, не владелец бизнес-логики) — 36 `window.const*_*`-идентификаторов (16 `constManager_*` + 13 `constAcceptance_*` + 7 `transferManager_*`, пересчитано по факту) разнесены по владению между `construction.actions.js`/`construction.render.js` (типы файлов не менялись, classic-script): HTML-формирующие (`constManager_renderAdminPanel/renderSelectors/updateBuildingSelector/updateFloorSelector/renderDefectsList/updateStatusChips`, `constAcceptance_renderList`, `transferManager_renderSelectors/updateBuildingSelector/renderGrid` — 10 идентификаторов) — в `construction.render.js`; CRUD/навигация/фильтры/экспорт/lifecycle (`constManager_init/onObjectChange/onBuildingChange/onFloorChange/onLayerChange/clearPdfView/loadPdfForFloor/switchView/applyFilters/exportDefectsToExcel`, `constAcceptance_init/filter/openNewRequestModal/onObjChange/onBldChange/goDrawZone/saveNewRequest/openRequestDetails/changeStatus/deleteRequest/focusOnZone/startInspection`, `transferManager_init/onObjectChange/onBuildingChange/generateDemoGrid` — 26 идентификаторов) — в `construction.actions.js`. Итого 10+26=36, без дублей. Регистрация реестра (`'constManager'`/`'constAcceptance'`/`'transferManager'`) и захват `_origCM`/`_origCA`/`_origTM` (свои копии в обоих файлах) — в `construction.actions.js`; fallback-заглушка `'module.construction'` — также в `construction.actions.js`. `js/construction/constructionManager.js` (3037 строк)/`transferManager.js` (196 строк) — **не тронуты, байт-в-байт как были** (не владельцы этого блока, отдельный будущий крупный блок разбора на features). Файл `construction.legacy.js` удалён, тег `<script src="js/modules/construction/construction.legacy.js">` убран из `index.html`, запись `'./js/modules/construction/construction.legacy.js'` убрана из `sw.js` (`construction.actions.js`/`.render.js`/`.module.js`/`.state.js` уже были в `urlsToCache`). Все 9 `*.legacy.js`-прокси-файлов из раздела 6 закрыты.
   - Архитекторская инвентаризация состава `js/construction/constructionManager.js`/`transferManager.js` (5+1 window-объектов, граф зависимостей, черновой целевой состав `features/*`) — см. `_ai/CONSTRUCTION_LEGACY_INVENTORY.md` (2026-07-07). Реальный перенос кода не выполнен — следующий блок.
