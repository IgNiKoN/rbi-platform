# Аудит «Реальная изоляция модулей, часть 3»: физический перенос владения 13 переменных `bootstrap.js` в сервисы

**Тип документа:** аудит без кода (архитектор), по прямому запросу пользователя 2026-07-14, выполняется параллельно с исполнением Волны 3 «часть 2». Ни один файл кода не менялся.

## Метод
Для каждой из 13 переменных `js/core/bootstrap.js` (`let X = ...; window.X = X;`) найдены Grep-ом:
1. Все bare-переприсваивания (`X = ...` без `window.`/`let`/`const`) вне `bootstrap.js` — это код, который перестанет работать, если `let X` уберут из `bootstrap.js` (module-scope перестанет существовать) **и** порядок загрузки в конкретный момент вызова не гарантирует, что `window.X` уже установлен предыдущим кодом.
2. Реальный смок-тест (headless Chromium) подтвердил: сейчас 0 ошибок — механизм безопасен только благодаря порядку исполнения (top-level `bootstrap.js` выполняется раньше, чем любая из этих функций вызывается через `DOMContentLoaded`/события).

## Ключевая находка (риск класса 4, подтверждённый живым тестом)

**Исправление (2026-07-14, повторная точная проверка):** первый проход Grep был анкорирован к началу строки (`^\s*VAR\s*=`) и пропустил переприсваивания внутри `if (cond) VAR = ...;` на той же строке. Повторная проверка регулярным выражением без анкора к началу строки нашла дополнительные места для `currentTemplateKey`/`currentChecklist`/`contractorArray`/`etalonActsArray`, которые в первой версии этого файла были ошибочно отнесены к «0 сторонних мест» (Группа A). Таблица ниже — исправленная, актуальная версия.

Bare-переприсваивания существуют не только для `auditOriginalData`/`chartInstances` (как было ранее зафиксировано в ROADMAP при ES-import миграции), а шире:

| Переменная | Файлы с bare-переприсваиванием (вне `bootstrap.js`) | Комментарий |
|---|---|---|
| `state` | `session.service.js` (restoreSession, L134), `game.actions.js` (2 места, L654/680) | критично — session-восстановление и повтор проверки |
| `details` | `session.service.js` (L135), `game.actions.js` (2 места, L655/681) | то же |
| `photos` | `game.actions.js` (2 места, L656/682) | `photos` дополнительно имеет собственную функцию-обёртку `assignPhotosMap()` в `bootstrap.js` — уже частичный сервис-паттерн |
| `contractorArray` | `sync-post-actions.js` (2), `sync-engine.core.js` (1), `sync-connection.actions.js` (1, L430 — сброс при logout/смене компании), `session.service.js` (1), `app-mode-utils.js` (1) | **5 файлов** — самый widely spread, включая 3 критичных sync-файла |
| `etalonActsArray` | `sync-engine.core.js` (3, включая L864/1193/2901), `sync-connection.actions.js` (1, L431), `session.service.js` (1) | критичный sync, 3 файла |
| `userTemplates` | нет bare-переприсваиваний вне `bootstrap.js` (только `window.userTemplates=`) | низкий риск — подтверждено повторной точной проверкой |
| `reportsArray` | `sync-engine.core.js` (1), `session.service.js` (1) | критичный sync |
| `currentTemplateKey` | **`session.service.js` (L123: `if (data.templateKey) currentTemplateKey = data.templateKey;`)** | ⚠️ переклассифицировано из Группы A в Группу C — риск есть, хоть и 1 файл |
| `currentChecklist` | **`session.service.js` (2 места, L129-130, внутри `if/else if`)** | ⚠️ переклассифицировано из Группы A в Группу C — тот же файл, что и выше |
| `chartInstances` | нет (уже изолирован в `AnalyticsState`, подтверждено Волной 1) | закрыт — остаётся в Группе A |
| `customExpertConclusions` | `session.service.js` (1, L139) | средний риск — 1 файл, не в sync |
| `auditOriginalData` | нет bare-переприсваиваний (везде `window.auditOriginalData =`) | низкий риск — остаётся в Группе A, подтверждено повторной проверкой |
| `appSettings` | **никогда не переприсваивается целиком** — везде мутация `appSettings.prop = x` (живая ссылка на объект) | структурно другой случай — риска класса 4 нет вообще, только вопрос доступа/владения, не reassignment |

**Важный вывод из исправления:** `session.service.js` — единственный файл, который содержит bare-переприсваивание **9 из 13** переменных (`state`/`details`/`photos`(через assignPhotosMap, косвенно)/`contractorArray`/`etalonActsArray`/`reportsArray`/`currentTemplateKey`/`currentChecklist`/`customExpertConclusions`) внутри одной функции `restoreSession()`. Это означает, что при переносе владения **любой** из этих 9 переменных первой правкой в любом блоке всегда будет `session.service.js#restoreSession()` — его придётся трогать почти в каждом критичном блоке части 3, а не один раз.

## Вывод по объёму и порядку (исправлено после повторной точной проверки)

Переменные делятся на 3 явные группы риска:

**Группа A — низкий риск, можно первой:**
`userTemplates`, `chartInstances`, `auditOriginalData` — 0 bare-переприсваиваний вне `bootstrap.js` (подтверждено дважды), перенос владения не потребует правки в других файлах, кроме самого `bootstrap.js` + сервиса-владельца. `chartInstances` уже фактически закрыт (владение в `AnalyticsState`).

**Группа B — структурно другой случай, самый простой технически:**
`appSettings` — никогда не переприсваивается целиком (только мутация свойств живого объекта). Перенос владения = перенос самого объявления `let appSettings` в сервис, без правки потребителей.

**Группа C — высокий риск, требует критичного под-блока с реальной проверкой синхронизации:**
`state`/`details`/`photos`/`contractorArray`/`etalonActsArray`/`reportsArray`/`customExpertConclusions`/**`currentTemplateKey`**/**`currentChecklist`** (переклассифицированы после исправления) — bare-переприсваивание существует в `session.service.js` и/или файлах `sync/**` (`sync-engine.core.js`, `sync-post-actions.js`, `sync-connection.actions.js`) и/или `game.actions.js`/`app-mode-utils.js`. Перенос владения этих переменных **обязательно** требует одновременной правки всех перечисленных bare-мест на `window.X =` (или на вызов сеттера сервиса) — иначе после переноса код тихо начнёт писать в потерянную module-scope переменную, оторванную от `window.X` (самый опасный класс регрессии — не throw, а silent data loss). **9 из 13 переменных объединены общей точкой риска — `session.service.js#restoreSession()`.**

## Рекомендация по порядку блоков части 3 (для решения пользователя, план — по решению)

1. **Блок 1 (некритичный, самый безопасный старт):** Группа A — `userTemplates`/`chartInstances`/`auditOriginalData` (3 переменные, 0 сторонних bare-мест).
2. **Блок 2 (некритичный, структурно простой):** `appSettings` — перенос объявления, 0 правок потребителей.
3. **Блок 3+ (критичные, с реальной Supabase-проверкой):** Группа C, 9 переменных — рекомендуется единый критичный блок на всю «session»-группу (`state`/`details`/`photos`/`currentTemplateKey`/`currentChecklist`/`customExpertConclusions`, всё точечно завязано на `session.service.js`), затем отдельный критичный блок на «inspection/knowledge/reports»-группу (`contractorArray`/`etalonActsArray`/`reportsArray`, всё в `sync/**`).

**Ни один из этих блоков не начат.** Это только аудит-оценка для планирования, актуальная классификация рисков зафиксирована здесь и в `_ai/ROADMAP.md`.
