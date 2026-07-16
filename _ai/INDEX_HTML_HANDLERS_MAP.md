# index.html Inline `onclick`/`onchange` Handlers Map

> Дата: 2026-07-06 (исполнитель). Полная, подтверждённая инвентаризация всех inline `onclick=`/`onchange=` атрибутов `index.html`. Не гипотеза — каждая строка проверена `grep -rn` по фактическому определению в `js/**/*.js`.

## Метод построения

1. `grep -oE 'onclick="[^"]*"' index.html` / `onchange=...` → извлечены все 265 + 94 значений атрибутов.
2. Каждое значение атрибута разбито по `;` на отдельные statements (многие атрибуты содержат несколько вызовов через `;`).
3. Для каждого statement определён тип:
   - `CALL` — вызов функции/метода (включая `if (window.X) window.X.method()` — гвард снят, взят вызов);
   - `STOPPROP` — буквально `event.stopPropagation()`;
   - `INLINE` — голое DOM-выражение без вызова бизнес-функции (`document.getElementById(...)...`, `this.style...`, `document.body.classList.remove(...)`).
4. Уникальные идентификаторы (union `onclick` ∪ `onchange`, пересечений между списками нет) прогнаны через `grep -rn` по `js/**/*.js` для поиска фактического определения (`function name`, `window.name =`, `Namespace.method(` внутри `window.Namespace = {...}` блоков).
5. Owner module/feature взят из `_ai/FILE_MIGRATION_MAP.md` по файлу, где функция определена — классификация файлов не менялась.

## Итоговые числа

- `onclick=` атрибутов: **265** (проверено повторно, совпадает с планом).
- `onchange=` атрибутов: **94** (проверено повторно, совпадает с планом).
- `onclick`, содержащих голый `event.stopPropagation()` (учитывается отдельно от вызовов): **31** statement-вхождений.
- `onclick`, являющихся чистым inline DOM-выражением без вызова функции (`document.getElementById(...)...`, `this.style...`, `document.body.classList.remove(...)`): **27** statement-вхождений (включая 4 вхождения `document.body.classList.remove(...)` как часть составных `onclick`, посчитанные один раз в сводной строке).
- `onchange`, являющихся inline DOM-выражением: **1** (`window.twiOwnerFilter = ...; document.getElementById(...)...` — часть составного атрибута наряду с вызовом `renderTwiList()`, который учтён как CALL).
- Уникальных вызываемых идентификаторов (union `onclick` + `onchange`, без пересечений): **186** бизнес-идентификаторов + 1 сводная категория `document.body.classList.remove` (счётчик DOM-паттерна, не бизнес-функция) = **187** строк идентификаторов ниже (без учёта двух сводных строк `event.stopPropagation()`/прочие inline-выражения).
  - Из них в `onclick`: 136 бизнес-идентификаторов (209 вызовов) + `document.body.classList.remove` (4 вхождения, DOM-паттерн).
  - Из них в `onchange`: 50 бизнес-идентификаторов (97 вызовов).
- Черновая гипотеза архитектора (138 в `onclick`/43 в `onchange`) была приблизительной: фактически **136 уникальных бизнес-идентификаторов в `onclick`** (не 138 — 2 расхождения из-за того, что архитектор не разделял `if(window.X) window.X.method()`-конструкции по вызываемому методу отдельно от общего числа, и не выделял `document.body.classList.remove` как отдельный DOM-паттерн) и **50 в `onchange`** (не 43 — начальный grep не учёл 7 `if(window.X) window.X.method()`-конструкций в блоках Стройконтроля/Передачи как отдельные идентификаторы). Итоговая карта — по факту grep, не по черновой оценке.
- Строк с owner-плейсхолдером «ожидает удаления app.js» (историческое значение колонки Owner Module до 2026-07-08): **0** (было 29 на момент первой инвентаризации 2026-07-06; актуализировано 2026-07-08 после физического удаления `js/app.js` 2026-07-07 — см. раздел «Расхождения с черновой гипотезой архитектора», пункт 8).

## Навигация верхнего уровня — подтверждение гипотезы

**Подтверждено**: верхнеуровневая навигация (`<nav id="main-bottom-nav">`, 5 элементов `.nav-item` с `data-path="#/quality/*"`) **не использует inline `onclick`** — переключение идёт через `data-path` + делегированный listener (`js/core/router.js`/`AppRouter`, ранее `js/router.js`). Ни один из 265 `onclick`/94 `onchange` не относится к этому блоку навигации. Блок «Навигация/переключение вкладок» из карты `APPLICATION_MIGRATION_MAP.md` не содержит риска сотен inline handlers.

## Сводные строки (не handler-функции)

| Identifier | Occurrences | Defined In | Owner Module | Owner Feature | Target | Notes |
|---|---|---|---|---|---|---|
| `event.stopPropagation()` | onclick x31 | — (встроенный метод DOM Event) | — | — | остаётся inline при переносе разметки | Не бизнес-функция, всегда остаётся inline-выражением в любом render.js |
| Голые DOM-выражения (`document.getElementById(...)...`, `this.style...`, `if(...) ...` без вызова функции) | onclick x27 (включая `document.body.classList.remove(...)` x4), onchange x1 (часть составного атрибута с `renderTwiList()`) | — | — | — | остаются inline при переносе разметки | Не вызовы бизнес-функций — прямые манипуляции DOM в разметке |

## Таблица идентификаторов

Колонки: `Identifier | Occurrences | Defined In (file) | Owner Module | Owner Feature | Target | Notes`

| Identifier | Occurrences | Defined In | Owner Module | Owner Feature | Target | Notes |
|---|---|---|---|---|---|---|
| `addBuilderGroup` | onclick x1 | `js/modules/quality/features/reference/reference.js:383` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `addEtalonElement` | onclick x1 | `js/modules/quality/features/etalon/etalon.actions.js` (`window.addEtalonElement = EtalonActions.addElement`) | quality | etalon | etalon.render.js | |
| `addNodeMaterialRow` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1143` | knowledge | nodes | knowledge.module.js (уже там) | |
| `addTwiStep` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:694` | knowledge | twi | knowledge.module.js (уже там) | |
| `applyHistoryFilters` | onchange x3 | `js/modules/quality/features/history/history.render.js:412` (`window.applyHistoryFilters = HistoryRender.applyFilters`) | quality | history | history.render.js (уже там) | |
| `applyMultiFilter` | onclick x1 | `js/modules/quality/features/shared/multi-filter.js:161` | quality | history/analytics (shared) | multi-filter.js (уже там) | |
| `askAiDocQuestion` | onclick x1 | `js/modules/ai/ai.actions.js:702` | ai | ai-assistant | ai.actions.js (уже там) | |
| `askAppAssistant` | onclick x1 | `js/modules/quality/features/knowledge/features/faq.js:507` | knowledge | faq | faq.js (уже там) | |
| `autoFillTwiNorm` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:433` | knowledge | twi | knowledge.module.js (уже там) | |
| `cancelExpertEdit` | onclick x2 | `js/modules/quality/features/analytics/analytics.actions.js:1015` (`window.cancelExpertEdit = AnalyticsActions.cancelExpertEdit`) | quality | analytics | analytics.actions.js (уже там) | |
| `cancelPhotoEditor` | onclick x1 | `js/shared/photo-editor.utils.js:206` | shared | — | photo-editor.utils.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08); общий shared-утиль для нескольких features |
| `changeRefTemplate` | onchange x1 | `js/modules/quality/features/reference/reference.js:210` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `changeTemplate` | onchange x2 | `js/modules/quality/features/audit/audit.actions.js:862` (`window.changeTemplate = AuditActions.changeTemplate`) | quality | audit | audit.render.js | второе вхождение — `#fake-checklist-selector`, тот же handler |
| `changeTwiType` | onclick x3 | `js/modules/quality/features/knowledge/knowledge.module.js:374` | knowledge | twi | knowledge.module.js (уже там) | |
| `clearBackupRegistry` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:3038` | quality | reports | reports.render.js | |
| `clearPdfCache` | onclick x1 | `js/modules/settings/settings.actions.js:167` (`window.clearPdfCache = _clearPdfCache`, строка 498) | settings | — | settings.render.js | уже в actions.js |
| `clearPhotoEditor` | onclick x1 | `js/shared/photo-editor.utils.js:158` | shared | — | photo-editor.utils.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08); общий shared-утиль для нескольких features |
| `closeAddDocModal` | onclick x2 | `js/modules/quality/features/knowledge/knowledge.module.js:2069` | knowledge | docs | knowledge.module.js (уже там) | уже там |
| `closeAiDocChat` | onclick x2 | `js/modules/ai/ai.actions.js:697` | ai | ai-assistant | ai.actions.js (уже там) | |
| `closeAppAssistantChat` | onclick x2 | `js/modules/quality/features/knowledge/features/faq.js:196` | knowledge | faq | faq.js (уже там) | |
| `closeCommentModal` | onclick x2 | `js/modules/quality/features/audit/audit.actions.js:868` (`window.closeCommentModal = AuditActions.closeCommentModal`) | quality | audit | audit.render.js | |
| `closeEtalonConstructor` | onclick x1 | `js/modules/quality/features/etalon/etalon.actions.js:624` (`window.closeEtalonConstructor = EtalonActions.closeConstructor`) | quality | etalon | etalon.render.js | |
| `closeFabExportMenu` | onclick x2 | `js/shared/fab-export.utils.js:101` | shared | — | fab-export.utils.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `closeFaqModal` | onclick x2 | `js/modules/quality/features/knowledge/features/faq.js:101` | knowledge | faq | faq.js (уже там) | |
| `closeItemHelpMenu` | onclick x2 | `js/modules/quality/features/knowledge/knowledge.module.js:1388` | knowledge | — | knowledge.module.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `closeModal` | onclick x2 | `js/shared/notify.utils.js:15` | shared | — | notify.utils.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08); общий для многих модалок |
| `closeMultiFilterModal` | onclick x2 | `js/modules/quality/features/shared/multi-filter.js:129` | quality | history/analytics (shared) | multi-filter.js (уже там) | |
| `closeNodeConstructor` | onclick x2 | `js/modules/quality/features/knowledge/knowledge.module.js:1136` | knowledge | nodes | knowledge.module.js (уже там) | |
| `closeNodeSelectorModal` | onclick x2 | `js/modules/quality/features/knowledge/knowledge.module.js:519` | knowledge | nodes | knowledge.module.js (уже там) | |
| `closeNodeViewer` | onclick x2 | `js/modules/quality/features/knowledge/knowledge.module.js:1344` | knowledge | nodes | knowledge.module.js (уже там) | |
| `closePhotoViewer` | onclick x2 | `js/shared/photo-editor.utils.js:323` | shared | — | photo-editor.utils.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `closeTemplateBuilder` | onclick x3 | `js/modules/quality/features/reference/reference.js:378` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `closeTwiActionSheet` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:296` | knowledge | twi | knowledge.module.js (уже там) | |
| `closeTwiConstructor` | onclick x2 | `js/modules/quality/features/knowledge/knowledge.module.js:603` | knowledge | twi | knowledge.module.js (уже там) | |
| `closeTwiViewer` | onclick x3 | `js/modules/quality/features/knowledge/knowledge.module.js:1291` | knowledge | twi | knowledge.module.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `closeUniversalActionSheet` | onclick x2 | `js/modules/quality/features/interventions.js:1008` | quality | interventions | interventions.js (уже там) | |
| `deleteSelectedHistory` | onclick x1 | `js/modules/quality/features/history/history.actions.js:235` (`window.deleteSelectedHistory = HistoryActions.deleteSelectedHistory`) | quality | history | history.render.js | |
| `downloadMissingCloudFiles` | onclick x2 | `js/storage.js:2609` | keep as infrastructure | — | не переносится | Определено в `storage.js` — инфраструктура, не трогать |
| `emptyTrashBin` | onclick x1 | `js/storage.js:2848` | keep as infrastructure | — | не переносится | Определено в `storage.js` — инфраструктура, не трогать |
| `exitDemoMode` | onclick x1 | `js/modules/settings/features/app-mode-utils.js:919` | settings | app-mode-utils | app-mode-utils.js (уже там) | |
| `exportAllTemplatesJson` | onclick x1 | `js/modules/quality/features/reference/reference.js:831` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `exportDocsJsCode` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:2023` | knowledge | docs | knowledge.module.js (уже там) | уже там |
| `exportLibraryToJsCode` | onclick x1 | `js/modules/quality/features/interventions.js:794` | quality | interventions | interventions.js (уже там) | |
| `exportNodeJsCode` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:878` | knowledge | nodes | knowledge.module.js (уже там) | |
| `exportNodeJson` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:870` | knowledge | nodes | knowledge.module.js (уже там) | |
| `exportSelectedCsv` | onclick x1 | `js/modules/quality/features/history/history.actions.js:234` (`window.exportSelectedCsv = HistoryActions.exportSelectedCsv`) | quality | history | history.render.js | |
| `exportTwiJson` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:202` | knowledge | twi | knowledge.module.js (уже там) | |
| `filterContractorsList` | onclick x5 | `js/modules/quality/features/analytics/analytics.actions.js:1010` (`window.filterContractorsList = AnalyticsActions.filterContractorsList`) | quality | analytics | analytics.actions.js (уже там) | |
| `filterDocs` | onclick x4 | `js/modules/quality/features/knowledge/knowledge.module.js:2048` | knowledge | docs | knowledge.module.js (уже там) | уже там |
| `fullFactoryReset` | onclick x1 | `js/modules/settings/settings.actions.js:504` | settings | — | settings.actions.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `gameOpenManagerPanelAuth` | onclick x2 | `js/modules/quality/features/gamification/game.render.js:747` | gamification | — | game.render.js (уже там) | |
| `generateAiHintForDefect` | onchange x1 | `js/modules/ai/ai.actions.js:573` | ai | ai-assistant | ai.actions.js (уже там) | |
| `generateSmartComment` | onclick x6 | `js/modules/ai/ai.actions.js:62` | ai | ai-assistant | ai.actions.js (уже там) | |
| `generateTwiDraftAi` | onclick x2 | `js/modules/ai/ai.actions.js:307` | ai | ai-assistant | ai.actions.js (уже там) | |
| `handleDataExport` | onclick x2 | `js/modules/quality/features/reports/reports.actions.js:3046` | quality | reports | reports.render.js (уже там) | |
| `handleDocPdfUpload` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:2075` | knowledge | docs | knowledge.module.js (уже там) | уже там |
| `handleExcelImport` | onchange x1 | `js/modules/quality/features/reference/reference.js:720` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `handleFabDownload` | onclick x1 | `js/shared/fab-export.utils.js:28` | shared | — | fab-export.utils.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `handleFileUpload` | onchange x1 | `js/modules/quality/features/reference/reference.js` (новая функция) | quality | reference | reference.js (уже там) | восстановлен блоком «Устранение DEAD REFERENCE» (2026-07-08), был DEAD REFERENCE |
| `handleNodeFileUpload` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1194` | knowledge | nodes | knowledge.module.js (уже там) | |
| `handlePhotoUpload` | onchange x2 | `js/modules/quality/features/audit/audit.actions.js:864` (`window.handlePhotoUpload = AuditActions.handlePhotoUpload`) | quality | audit | audit.render.js | Расследовано (2026-07-08) — не конфликт: единственное присваивание `window.handlePhotoUpload`, одноимённые методы `ConstDefectForm`/`meetings.actions.js` — неймспейсированы, не пересекаются, см. раздел «Namespace-конфликт handlePhotoUpload» |
| `handleTwiAction` | onclick x4 | `js/modules/quality/features/knowledge/knowledge.module.js:307` | knowledge | twi | knowledge.module.js (уже там) | |
| `handleTwiBadPhotoUpload` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:554` | knowledge | twi | knowledge.module.js (уже там) | |
| `handleTwiGoodPhotoUpload` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:553` | knowledge | twi | knowledge.module.js (уже там) | |
| `handleTwiPdfUpload` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:666` | knowledge | twi | knowledge.module.js (уже там) | |
| `handleTwiPhotoUpload` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:555` | knowledge | twi | knowledge.module.js (уже там) | |
| `hideContractorDetailView` | onclick x1 | `js/modules/quality/features/analytics/analytics.render.js:2083` (`window.hideContractorDetailView = AnalyticsRender.hideContractorDetailView`) | quality | analytics | analytics.render.js (уже там) | |
| `nextTutorialStep` | onclick x1 | `js/modules/settings/features/tutorial.js:546` | settings | tutorial | tutorial.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `openAddDocModal` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:2060` | knowledge | docs | knowledge.module.js (уже там) | уже там |
| `openAiDocChat` | onclick x1 | `js/modules/ai/ai.actions.js:691` | ai | ai-assistant | ai.actions.js (уже там) | |
| `openAppAssistantChat` | onclick x1 | `js/modules/quality/features/knowledge/features/faq.js:182` | knowledge | faq | faq.js (уже там) | |
| `openFaqModal` | onclick x2 | `js/modules/quality/features/knowledge/features/faq.js:90` | knowledge | faq | faq.js (уже там) | |
| `openMultiFilterModal` | onclick x7 | `js/modules/quality/features/shared/multi-filter.js:13` | quality | history/analytics (shared) | multi-filter.js (уже там) | |
| `openNodeConstructor` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1060` | knowledge | nodes | knowledge.module.js (уже там) | |
| `openNodeSelectorModal` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:483` | knowledge | nodes | knowledge.module.js (уже там) | |
| `openShareModal` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:3152` | quality | reports | reports.render.js (уже там) | |
| `openTemplateBuilder` | onclick x1 | `js/modules/quality/features/reference/reference.js:365` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `openTwiConstructor` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1654` | knowledge | twi | knowledge.module.js (уже там) | |
| `populateTwiItemSelect` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:392` | knowledge | twi | knowledge.module.js (уже там) | |
| `previewStorageCleanup` | onclick x1 | `js/modules/settings/settings.actions.js:186` (`window.previewStorageCleanup = _previewStorageCleanup`, строка 499) | settings | — | settings.render.js | уже в actions.js |
| `processDataImport` | onchange x1 | `js/modules/quality/features/reports/reports.actions.js:3286` | quality | reports | reports.render.js (уже там) | |
| `processNodeImport` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:903` | knowledge | nodes | knowledge.module.js (уже там) | |
| `processTwiImport` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:212` | knowledge | twi | knowledge.module.js (уже там) | |
| `rbi_beautifyPracticeAi` | onclick x1 | `js/modules/ai/ai.actions.js:1041` | ai | ai-assistant | ai.actions.js (уже там) | |
| `rbi_changeCalendarMonth` | onclick x2 | `js/modules/quality/features/tasks/tasks.module.js:1465` | quality | tasks/schedule | tasks.module.js (уже там) | |
| `rbi_closeCalendarModal` | onclick x2 | `js/modules/quality/features/tasks/tasks.module.js:1464` | quality | tasks/schedule | tasks.module.js (уже там) | |
| `rbi_closeChangelogModal` | onclick x2 | `js/modules/settings/features/changelog.js:197` | settings | changelog | changelog.js (уже там) | |
| `rbi_closeInterventionModal` | onclick x2 | `js/modules/quality/features/interventions.js:100` | quality | interventions | interventions.js (уже там) | |
| `rbi_closeManualPracticeModal` | onclick x2 | `js/modules/quality/features/interventions.js:665` | quality | interventions | interventions.js (уже там) | |
| `rbi_closePracticeModal` | onclick x2 | `js/modules/quality/features/interventions.js:538` | quality | interventions | interventions.js (уже там) | |
| `rbi_closeTaskModal` | onclick x2 | `js/modules/quality/features/tasks/tasks.module.js:1436` | quality | tasks | tasks.module.js (уже там) | |
| `rbi_createMeeting` | onclick x1 | `js/modules/quality/features/meetings/meetings.module.js:852` | quality | meetings | meetings.module.js (уже там) | |
| `rbi_generatePracticeTitleAi` | onclick x1 | `js/modules/ai/ai.actions.js:1025` | ai | ai-assistant | ai.actions.js (уже там) | |
| `rbi_handleFmeaPhotoUpload` | onchange x1 | `js/modules/quality/features/gamification/game.actions.js:1110` | gamification | — | game.actions.js (уже там) | Не совпадает с гипотезой архитектора (ожидалось `quality/interventions` — FMEA относится к геймификации, реальный owner) |
| `rbi_handleMeetingPhotoUpload` | onchange x1 | `js/modules/quality/features/meetings/meetings.module.js:853` | quality | meetings | meetings.module.js (уже там) | |
| `rbi_handlePracDocMulti` | onchange x1 | `js/modules/quality/features/interventions.js:710` | quality | interventions | interventions.js (уже там) | |
| `rbi_handlePracPhotoMulti` | onchange x3 | `js/modules/quality/features/interventions.js:677` | quality | interventions | interventions.js (уже там) | |
| `rbi_handlePracticePhoto` | onchange x2 | `js/modules/quality/features/interventions.js:543` | quality | interventions | interventions.js (уже там) | |
| `rbi_handleScheduleImport` | onchange x1 | `js/modules/quality/features/schedule/schedule.actions.js:200` | quality | schedule | schedule.actions.js (уже там) | |
| `rbi_handleTaskCompletionPhoto` | onchange x1 | `js/modules/quality/features/tasks/tasks.module.js:1455` | quality | tasks | tasks.module.js (уже там) | |
| `rbi_openChangelogModal` | onclick x1 | `js/modules/settings/features/changelog.js:152` | settings | changelog | changelog.js (уже там) | |
| `rbi_openInterventionModal` | onclick x1 | `js/modules/quality/features/interventions.js:76` | quality | interventions | interventions.js (уже там) | |
| `rbi_saveIntervention` | onclick x1 | `js/modules/quality/features/interventions.js:122` | quality | interventions | interventions.js (уже там) | |
| `rbi_saveManualPractice` | onclick x1 | `js/modules/quality/features/interventions.js:744` | quality | interventions | interventions.js (уже там) | |
| `rbi_saveManualTask` | onclick x1 | `js/modules/quality/features/tasks/tasks.module.js:1437` | quality | tasks | tasks.module.js (уже там) | |
| `rbi_savePractice` | onclick x1 | `js/modules/quality/features/interventions.js:554` | quality | interventions | interventions.js (уже там) | |
| `rbi_submitFeedback` | onclick x1 | `js/modules/settings/features/feedback.js:143` | settings | feedback | feedback.js (уже там) | |
| `rbi_switchEngineerSubTab` | onclick x5 | `js/modules/quality/features/tasks/tasks.module.js:1470` | quality | engineer | tasks.module.js (уже там) | Не совпадает с гипотезой архитектора (ожидалось `engineer.actions.js` — реальный делегат живёт в `tasks.module.js`) |
| `rbi_updateInterventionTemplates` | onchange x1 | `js/modules/quality/features/interventions.js:106` | quality | interventions | interventions.js (уже там) | |
| `removeDocPdf` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:2098` | knowledge | docs | knowledge.module.js (уже там) | уже там |
| `removeTwiPdf` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:687` | knowledge | twi | knowledge.module.js (уже там) | |
| `renderCurrentAnalyticsTab` | onchange x3 | `js/modules/quality/features/analytics/analytics.render.js:2074` (`window.renderCurrentAnalyticsTab = AnalyticsRender.renderCurrentAnalyticsTab`) | quality | analytics | analytics.render.js (уже там) | |
| `renderTwiList` | onchange x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1477` | knowledge | twi | knowledge.module.js (уже там) | |
| `resetChecklist` | onclick x1 | `js/modules/quality/features/audit/audit.actions.js:863` (`window.resetChecklist = AuditActions.resetChecklist`) | quality | audit | audit.render.js | |
| `resetExpertEdit` | onclick x1 | `js/modules/quality/features/analytics/analytics.actions.js:1016` (`window.resetExpertEdit = AnalyticsActions.resetExpertEdit`) | quality | analytics | analytics.actions.js (уже там) | |
| `resetSettingsToDefault` | onclick x1 | `js/modules/settings/settings.actions.js:112` (`window.resetSettingsToDefault = _resetSettingsToDefault`, строка 497) | settings | — | settings.render.js | уже в actions.js |
| `saveCommentModal` | onclick x1 | `js/modules/quality/features/audit/audit.actions.js:869` (`window.saveCommentModal = AuditActions.saveCommentModal`) | quality | audit | audit.render.js | |
| `saveCustomDoc` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:2108` | knowledge | docs | knowledge.module.js (уже там) | уже там |
| `saveCustomTemplate` | onclick x1 | `js/modules/quality/features/reference/reference.js:450` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `saveEditedPhoto` | onclick x1 | `js/shared/photo-editor.utils.js:214` | shared | — | photo-editor.utils.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `saveEngineerNameForce` | onchange x1 | `js/modules/quality/features/gamification/game.actions.js:323` | gamification | — | game.actions.js (уже там) | |
| `saveEtalonAct` | onclick x1 | `js/modules/quality/features/etalon/etalon.actions.js:629` (`window.saveEtalonAct = EtalonActions.saveAct`) | quality | etalon | etalon.render.js | |
| `saveExpertEdit` | onclick x1 | `js/modules/quality/features/analytics/analytics.actions.js:1017` (`window.saveExpertEdit = AnalyticsActions.saveExpertEdit`) | quality | analytics | analytics.actions.js (уже там) | |
| `saveNodeCard` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1233` | knowledge | nodes | knowledge.module.js (уже там) | |
| `saveProductToArray` | onclick x1 | `js/modules/quality/features/audit/audit.actions.js:861` (`window.saveProductToArray = AuditActions.saveProductToArray`) | quality | audit | audit.render.js | |
| `saveSettings` | onchange x9 | `js/modules/settings/settings.actions.js:84` (`window.saveSettings = _saveSettings`, строка 495) | settings | — | settings.render.js | уже в actions.js |
| `saveTwiCard` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1752` | knowledge | twi | knowledge.module.js (уже там) | |
| `searchNormFromTwi` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:458` | knowledge | twi | knowledge.module.js (уже там) | |
| `selectAllMultiFilter` | onclick x1 | `js/modules/quality/features/shared/multi-filter.js:154` | quality | history/analytics (shared) | multi-filter.js (уже там) | |
| `showAboutApp` | onclick x1 | `js/modules/settings/settings.actions.js:502` | settings | — | settings.actions.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `showContractorDetails` | onclick x1 | `js/modules/quality/features/audit/audit.render.js:664` | quality | audit | audit.render.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `showExcelHelp` | onclick x1 | `js/modules/quality/features/reference/reference.js:683` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `showProductMath` | onclick x1 | `js/modules/quality/features/audit/audit.render.js:625` | quality | audit | audit.render.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `showTwiPrintOptions` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:1400` | knowledge | twi | knowledge.module.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `sk_handleExcelImport` | onchange x1 | `js/modules/sk/sk.actions.js` | sk | — | sk.actions.js | done (2026-07-07) — legacy-файл удалён, функция перенесена 1:1 |
| `startDemoMode` | onclick x1 | `js/modules/settings/features/app-mode-utils.js:724` | settings | app-mode-utils | app-mode-utils.js (уже там) | |
| `startInteractiveTutorial` | onclick x1 | `js/modules/settings/features/tutorial.js:462` | settings | tutorial | tutorial.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `stopTutorial` | onclick x2 | `js/modules/settings/features/tutorial.js:561` | settings | tutorial | tutorial.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `switchAnalyticsSubTab` | onclick x5 | `js/modules/quality/features/analytics/analytics.actions.js:1008` (`window.switchAnalyticsSubTab = AnalyticsActions.switchAnalyticsSubTab`) | quality | analytics | analytics.render.js | |
| `switchHistoryView` | onclick x2 | `js/modules/quality/features/analytics/analytics.actions.js:1020` (`window.switchHistoryView = AnalyticsActions.switchHistoryView`) | quality | analytics/history | analytics.actions.js (уже там) | Не совпадает с гипотезой архитектора (ожидалось `history`-owner напрямую, реальный делегат — в `analytics.actions.js`) |
| `switchReferenceSubTab` | onclick x5 | `js/modules/quality/features/reference/reference.js:217` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `toggleAllHistory` | onchange x1 | `js/modules/quality/features/history/history.actions.js:233` (`window.toggleAllHistory = HistoryActions.toggleAllHistory`) | quality | history | history.render.js | |
| `toggleDashboardExpand` | onclick x1 | `js/modules/quality/features/audit/audit.render.js:731` | quality | audit | audit.render.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `toggleDateRange` | onchange x1 | `js/modules/quality/features/analytics/analytics.actions.js:1009` (`window.toggleDateRange = AnalyticsActions.toggleDateRange`) | quality | analytics | analytics.render.js | |
| `toggleManagePanel` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:771` | knowledge | twi | knowledge.module.js (уже там) | |
| `toggleNodeManagePanel` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:852` | knowledge | nodes | knowledge.module.js (уже там) | |
| `toggleSetting` | onchange x29 | `js/modules/settings/settings.actions.js:100` (`window.toggleSetting = _toggleSetting`, строка 496) | settings | — | settings.render.js | уже в actions.js; крупнейшая группа по количеству вхождений |
| `toggleTwiManagePanel` | onclick x1 | `js/modules/quality/features/knowledge/knowledge.module.js:184` | knowledge | twi | knowledge.module.js (уже там) | |
| `triggerDataImport` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:3285` | quality | reports | reports.render.js (уже там) | |
| `triggerExcelImport` | onclick x1 | `js/modules/quality/features/reference/reference.js:679` | quality | reference | reference.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `triggerManagerShareManual` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:3244` | quality | reports | reports.render.js (уже там) | |
| `triggerTwiMarkupUpload` | onclick x2 | `js/modules/quality/features/knowledge/knowledge.module.js:540` | knowledge | twi | knowledge.module.js (уже там) | |
| `window.ConstAcceptance.openNewRequestModal` | onclick x1 | `js/modules/construction/features/acceptance.js:134` (`window.ConstAcceptance = {...}` объявлен на строке 9) | construction | acceptance | acceptance.js (уже там) | |
| `window.ConstAcceptance.renderList` | onchange x1 | `js/modules/construction/features/acceptance.js:36` | construction | acceptance | acceptance.js (уже там) | |
| `window.ConstDefectForm.close` | onclick x2 | `js/modules/construction/features/defect-form.js:311` (`window.ConstDefectForm = {...}` объявлен на строке 9) | construction | defect-form | defect-form.js (уже там) | |
| `window.ConstDefectForm.handlePhotoUpload` | onchange x1 | `js/modules/construction/features/defect-form.js:727` | construction | defect-form | defect-form.js (уже там) | |
| `window.ConstDefectForm.onTemplateChange` | onchange x1 | `js/modules/construction/features/defect-form.js:50` | construction | defect-form | defect-form.js (уже там) | |
| `window.ConstDefectForm.openDefectPhoto` | onclick x1 | `js/modules/construction/features/defect-form.js:382` | construction | defect-form | defect-form.js (уже там) | |
| `window.ConstDefectForm.removePhoto` | onclick x1 | `js/modules/construction/features/defect-form.js:749` | construction | defect-form | defect-form.js (уже там) | |
| `window.ConstManager.applyFilters` | onchange x1 | `js/modules/construction/features/construction-core.js:417` (`window.ConstManager = {...}` объявлен на строке 3) | construction | construction-core | construction-core.js (уже там) | |
| `window.ConstManager.exportDefectsToExcel` | onclick x1 | `js/modules/construction/features/construction-core.js:434` | construction | construction-core | construction-core.js (уже там) | |
| `window.ConstManager.onBuildingChange` | onchange x1 | `js/modules/construction/features/construction-core.js:236` | construction | construction-core | construction-core.js (уже там) | |
| `window.ConstManager.onFloorChange` | onchange x1 | `js/modules/construction/features/construction-core.js:243` | construction | construction-core | construction-core.js (уже там) | |
| `window.ConstManager.onLayerChange` | onchange x1 | `js/modules/construction/features/construction-core.js:257` | construction | construction-core | construction-core.js (уже там) | |
| `window.ConstManager.onObjectChange` | onchange x1 | `js/modules/construction/features/construction-core.js:227` | construction | construction-core | construction-core.js (уже там) | |
| `window.ConstManager.switchView` | onclick x2 | `js/modules/construction/features/construction-core.js:387` | construction | construction-core | construction-core.js (уже там) | |
| `window.TransferManager.onBuildingChange` | onchange x1 | `js/modules/construction/features/transfer.js:76` (`window.TransferManager = {...}` объявлен на строке 3) | construction | transfer | transfer.js (уже там) | |
| `window.TransferManager.onObjectChange` | onchange x1 | `js/modules/construction/features/transfer.js:70` | construction | transfer | transfer.js (уже там) | |
| `window.UniversalPdfViewer.close` | onclick x1 | `js/modules/construction/features/pdf-viewer.js:369` (`window.UniversalPdfViewer = {...}` объявлен на строке 9) | construction | pdf-viewer (общий UI-виджет) | pdf-viewer.js (уже там) | |
| `window.UniversalPdfViewer.toggleAddMode` | onclick x1 | `js/modules/construction/features/pdf-viewer.js:170` | construction | pdf-viewer | pdf-viewer.js (уже там) | |
| `window.cancelPdfTemplateEdit` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:4919` (`window.cancelPdfTemplateEdit = ReportsActions.cancelPdfTemplateEdit`) | quality | reports | reports.render.js (уже там) | |
| `window.changeAiMode` | onchange x3 | `js/modules/ai/ai.actions.js:7` | ai | ai-assistant | ai.actions.js (уже там) | app.js удалён (2026-07-07), owner актуализирован (2026-07-08) |
| `window.changeAppMode` | onchange x1 | `js/modules/settings/features/app-mode-utils.js:381` (также guard в `js/services/app-mode.service.js:40-43`) | settings | app-mode-utils | app-mode-utils.js (уже там) | Дублирующее определение-guard в `app-mode.service.js` — сервис только проверяет наличие функции, не переопределяет её, если она уже задана |
| `window.checkForUpdates` | onclick x1 | `js/shared/pwa-update.utils.js:5` (перенесено из inline `<script>` `index.html` 2026-07-08) | app-shell | — | pwa-update.utils.js (уже там) | Физическое расположение перенесено из `index.html` в файл; owner (app-shell, PWA/SW controller) не изменился |
| `window.closePdfTemplateModal` | onclick x2 | `js/modules/quality/features/reports/reports.actions.js:421` (`export function closePdfTemplateModal()`) | quality | reports | reports.render.js (уже там) | |
| `window.createNewPdfTemplate` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:4917` (`window.createNewPdfTemplate = ReportsActions.createPdfTemplate`) | quality | reports | reports.render.js (уже там) | |
| `window.deleteSelectedReports` | onclick x1 | `js/modules/quality/features/analytics/analytics.actions.js:1025` (`window.deleteSelectedReports = AnalyticsActions.deleteSelectedReports`) | quality | analytics/reports | analytics.actions.js (уже там) | Не совпадает с гипотезой архитектора (ожидалось `reports`-owner напрямую, реальный делегат — в `analytics.actions.js`) |
| `window.handleLogoUpload` | onchange x1 | `js/modules/settings/features/app-mode-utils.js:59` | settings | app-mode-utils | app-mode-utils.js (уже там) | |
| `window.openPdfTemplateModal` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:4915` (`window.openPdfTemplateModal = ReportsActions.openTemplateModal`) | quality | reports | reports.render.js (уже там) | |
| `window.removeBrandLogo` | onclick x1 | `js/modules/settings/features/app-mode-utils.js:96` | settings | app-mode-utils | app-mode-utils.js (уже там) | |
| `window.revertToPreviousMode` | onclick x1 | `js/modules/settings/features/app-mode-utils.js:385` | settings | app-mode-utils | app-mode-utils.js (уже там) | |
| `window.runSelfLearningAi` | onclick x1 | `js/modules/ai/ai.actions.js:1659` | ai | ai-assistant | ai.actions.js (уже там) | |
| `window.savePdfTemplate` | onclick x1 | `js/modules/quality/features/reports/reports.actions.js:4920` (`window.savePdfTemplate = ReportsActions.savePdfTemplate`) | quality | reports | reports.render.js (уже там) | |
| `window.toggleAllReports` | onchange x1 | `js/modules/quality/features/analytics/analytics.actions.js:1024` (`window.toggleAllReports = AnalyticsActions.toggleAllReports`) | quality | analytics/reports | analytics.actions.js (уже там) | Не совпадает с гипотезой архитектора (ожидалось `reports`-owner напрямую, реальный делегат — в `analytics.actions.js`) |
| `window.togglePushSettings` | onchange x1 | `js/modules/settings/features/app-mode-utils.js:393` | settings | app-mode-utils | app-mode-utils.js (уже там) | |

## DEAD REFERENCE

Список закрыт (2026-07-08): обе найденные ранее находки (`handleEtalonPhotoUpload`, `handleFileUpload`) устранены блоком «Устранение 2 DEAD REFERENCE (handleFileUpload, handleEtalonPhotoUpload) + документационная коррекция мнимого Namespace-конфликта handlePhotoUpload» — см. `_ai/CURRENT_STEP.md`. `handleEtalonPhotoUpload` был недостижимой мёртвой разметкой (input `etalon-photo-input` удалён из `index.html`, реальный поток фото эталона идёт через `photo-input-camera`/`photo-input-gallery` → общий `handlePhotoUpload`). `handleFileUpload` был реально сломанным функционалом (input `json-input` был достижим через `UPLOAD` в селекторе чек-листа) — восстановлен как новая функция в `reference.js`, сохраняющая пользовательский чек-лист через `window.RBI.services.templates.saveUserTemplate`.

`window.checkForUpdates` **не** является DEAD REFERENCE — определение существует, но живёт прямо в `index.html` (inline `<script>`), не в `js/**`.

## Расхождения с черновой гипотезой архитектора

Инвентаризация подтвердила гипотезу для большинства групп (`Twi*`→knowledge/twi, `Node*`→knowledge/nodes, `Doc*`→knowledge/docs как TBD, `rbi_*`→quality features, `Const*`→construction). Найдены следующие расхождения:

1. `closeTwiViewer`, `showTwiPrintOptions` — на момент первой инвентаризации (2026-07-06) ожидались как уже перенесённые в `knowledge.module.js`, но были ещё в `js/app.js` (TBD); уточнено 2026-07-08 — `js/app.js` физически удалён (2026-07-07), обе функции подтверждены Grep фактически в `js/modules/quality/features/knowledge/knowledge.module.js` (`window.closeTwiViewer`/`window.showTwiPrintOptions`), расхождение закрыто.
2. `rbi_handleFmeaPhotoUpload` — ожидался owner `quality/interventions`, фактический owner — `gamification` (`game.actions.js`).
3. `rbi_switchEngineerSubTab` — ожидался owner `quality/engineer` через `engineer.actions.js`, фактический делегат живёт в `tasks.module.js`.
4. `switchHistoryView`, `window.deleteSelectedReports`, `window.toggleAllReports` — ожидались напрямую в owner-фичах (`history`/`reports`), фактические делегаты живут в `analytics.actions.js` (общий контроллер для history/reports UI).
5. `window.changeAiMode` — не входил в черновой список архитектора вообще, на момент первой инвентаризации (2026-07-06) найден в `js/app.js` (TBD, вероятный owner `ai`); уточнено 2026-07-08 — `js/app.js` физически удалён (2026-07-07), функция подтверждена Grep фактически в `js/modules/ai/ai.actions.js` (`window.changeAiMode`), owner `ai` подтверждён.
6. `handleEtalonPhotoUpload`, `handleFileUpload` — DEAD REFERENCE, архитектор не выделял их отдельно от общего списка `handleEtalonPhotoUpload`/`handlePhotoUpload`.
7. `window.checkForUpdates` — черновой список отнёс к `settings`, фактическое определение живёт в самом `index.html` (app-shell), не в `js/modules/settings/**`.
8. **Закрытие исторического списка owner-плейсхолдера «ожидает удаления app.js» (2026-07-08):** на момент первой инвентаризации (2026-07-06) 29 строк таблицы имели этот owner-плейсхолдер, поскольку соответствующие функции физически ещё находились в `js/app.js`. После удаления `js/app.js` блоком «`js/app.js` — Шаг 2» (2026-07-07) все 29 функций подтверждены (Grep) реально переехавшими в целевые модульные/shared-файлы в рамках более ранних блоков («Справочник → Чек-листы», «Фоторедактор», «Единый FAB-механизм», «Интерактивный тур», «Хвост Настроек/AI/TWI», `js/app.js` Шаг 1/2). Строки таблицы выше обновлены на актуальные owner/файлы инвентаризационной сверкой §29 от 2026-07-08 — открытых вопросов по `app.js` в этой карте больше не остаётся.
9. **Актуализация группы `construction` (18 идентификаторов, 2026-07-08):** ссылки на `js/construction/constructionManager.js`/`transferManager.js`/`construction.legacy.js` заменены на реальные файлы `js/modules/construction/features/{construction-core,defect-form,acceptance,transfer,pdf-viewer}.js` по факту переноса, закрытого блоком «`construction.legacy.js` — REMOVED (2026-07-07)» (см. `APPLICATION_MIGRATION_MAP.md`). Точечная документационная правка, без изменения кода — исправлена архитектором напрямую, без отдельного цикла Исполнитель/Тестер.
9. **Актуализация группы `construction` (18 строк, `window.ConstAcceptance.*`/`window.ConstDefectForm.*`/`window.ConstManager.*`/`window.TransferManager.*`/`window.UniversalPdfViewer.*`) (2026-07-08):** карта продолжала ссылаться на давно удалённые `js/construction/constructionManager.js`/`js/construction/transferManager.js` и путь `construction.legacy.js → construction.actions.js`, хотя весь код `ConstManager`/`ConstDefectForm`/`ConstAcceptance`/`UniversalPdfViewer`/`TransferManager` перенесён 1:1 в `js/modules/construction/features/{construction-core,defect-form,pdf-viewer,acceptance,transfer}.js` ещё блоком «`construction.legacy.js` — REMOVED (2026-07-07)»; карта handlers не была обновлена при том переносе. 18 строк актуализированы (Grep построчно подтверждён) на реальные файлы/номера строк, каталог `js/construction/` в этой карте больше не упоминается.

## Namespace-конфликт handlePhotoUpload — уточнение: конфликта нет

Расследовано (2026-07-08): гипотеза о конфликте резолвинга `window.handlePhotoUpload` по порядку `<script>`-тегов **не подтвердилась**. Grep `window\.handlePhotoUpload\s*=` по всему `js/**` даёт ровно 1 совпадение: `js/modules/quality/features/audit/audit.actions.js` (`window.handlePhotoUpload = AuditActions.handlePhotoUpload.bind(AuditActions);`). Остальные три «конфликтующих» определения из первоначальной карты — не глобальные переопределения, а неймспейсированные методы разных объектов:

- `js/modules/quality/features/meetings/meetings.actions.js` — `Meetings.handlePhotoUpload`, вызывается только как `Meetings.handlePhotoUpload(...)`, использует отдельный `_call('rbi_handleMeetingPhotoUpload', ...)`, не присваивается `window.*`.
- `js/modules/construction/features/defect-form.js` — `ConstDefectForm.handlePhotoUpload`, вызывается из `index.html` как `window.ConstDefectForm.handlePhotoUpload(event)`; тело метода само делегирует в `window.handlePhotoUpload(event)`, а не переопределяет его.
- `js/services/session.service.js` — первоначальная карта ошибочно указала этот файл как источник ещё одного `handlePhotoUpload`; такого метода там нет.

Вывод: единственная точка присваивания `window.handlePhotoUpload` в проекте, остальные объекты используют разные, не пересекающиеся имена методов на своих неймспейсах (один из них сознательно делегирует в тот же глобальный обработчик). Риска для будущего переноса порядка `<script>`-тегов, связанного именно с этим идентификатором, не существует.

STATUS: DOCUMENTED
