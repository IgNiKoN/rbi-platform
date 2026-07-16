# Текущий план — Удаление осиротевшего `etalon-prompt-modal`

## 1. Заголовок блока

**Обычный шаг** (не критичный — см. классификацию ниже). Удалить из `index.html` мёртвый статичный блок `etalon-prompt-modal` — последний нетронутый остаток инициативы ROADMAP «Перенос статичной разметки `quality`+31 modal-блока+sidebar» (30/31 закрыт ранее, это 31-й).

Классификация критичности (проверено против списка «Критичные шаги» `_ai/PROJECT_RULES.md`): блок не относится ни к App Shell, ни к Auth Gate, ни к Module Loader, ни к изменениям синхронизации/миграции данных. Правится только `index.html` (удаление статичной разметки без бизнес-логики) — **обычный шаг**.

## 1a. Прогресс Foundation

**13/13 пунктов §29 закрыто** (без изменений). Блок относится к `_ai/ROADMAP.md`, инициатива «Перенос статичной разметки `quality`+31 modal-блока+sidebar» — закрывает её целиком (31/31).

## 2. Контекст (проверено чтением кода/Grep перед планированием)

**Решение пользователя (этот цикл):** восстанавливать триггер `etalon-prompt-modal` не нужно — старая логика убирается, бизнес-потребность уже закрыта другим, полностью рабочим потоком. Задача — аккуратно удалить осиротевший UI, не задев рабочий поток.

**Подтверждённый рабочий поток «эталона» (не трогается этим блоком):**
- `tasks.module.js:478-486` — при генерации еженедельного плана для каждой пары подрядчик+вид работ без найденного `Акт-Эталон`-акта (`_getEtalonActs()` без `instanceId==='etalon'`+совпадением `templateKey`/`templateTitle`) создаётся задача категории `etalon`/`taskType:'Эталон'`, заголовок «Приемка Эталона».
- `tasks.module.js:890` — в модалке деталей задачи (`task-details-modal`, уже в `#app-modals`) для такой задачи рендерится кнопка «Снять Эталон» → `onclick` вызывает `openEtalonConstructor(contractor, templateKey, workTitle, project, statusKey)`.
- `openEtalonConstructor` (`etalon.actions.js:145`, экспортирован `window.openEtalonConstructor` на строке 765) — уже полноценно открывает/монтирует конструктор Акта-Эталона (в `#app-modals`, перенесён ранее в Step 41).
- Этот поток верифицирован независимо (`game.actions.js:212-224`/`341-352`, `interventions.js:931` — вызывает тот же `openEtalonConstructor('', '', '', '', '')` для ручного старта) — множественные подтверждённые точки входа, работающие без `etalon-prompt-modal`.

**Подтверждено Grep (0 точек вызова `etalon-prompt-modal` кроме себя самого):**
- `index.html:526` (`<div id="etalon-prompt-modal">`), `index.html:537` (кнопка «Позже» → `document.getElementById('etalon-prompt-modal').style.display='none'`) — обе ссылки находятся физически внутри самого блока, который удаляется целиком.
- Grep по всему `js/**` и `index.html` на `etalon-prompt-modal` — 0 упоминаний вне этих двух строк.
- Кнопка `btn-start-etalon` (`index.html:539`) не имеет `onclick`/делегированного `data-*-action` — атрибута действия нет вообще, кнопка нерабочая (осиротевший UI подтверждён, не гипотеза).
- Grep по `needsEtalon`/`hasEtalon` во всём `js/modules/**` — единственные потребители: `tasks.module.js`, `game.actions.js`, `etalon.actions.js:401` (сброс флага после сохранения акта) — ни один не читает/не открывает `etalon-prompt-modal`.

**Точные границы блока (index.html):**

```524:544:index.html
    <!-- === МОДАЛКА ТРЕБОВАНИЯ ЭТАЛОНА === -->
    <div id="etalon-prompt-modal"
        class="fixed inset-0 bg-slate-900/80 z-[6000] hidden items-center justify-center p-4 backdrop-blur-sm"
        onclick="this.style.display='none'">
        <div class="bg-[var(--card-bg)] w-full max-w-sm p-6 rounded-2xl shadow-2xl transition-transform border border-[var(--card-border)] text-center"
            onclick="event.stopPropagation()">
            <div
                class="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-blue-200">
                📐</div>
            <h3 class="font-black text-slate-800 dark:text-white text-[14px] uppercase mb-2">Требуется Акт-Эталон</h3>
            <p class="text-[11px] text-slate-500 mb-6 leading-relaxed">Это новый подрядчик или вид работ. Перед началом
                массовых проверок необходимо зафиксировать эталонный образец. Выполнить сейчас?</p>
            <div class="flex gap-2">
                <button onclick="document.getElementById('etalon-prompt-modal').style.display='none'"
                    class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase shadow-sm active:scale-95">Позже</button>
                <button id="btn-start-etalon"
                    class="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">Да,
                    начать</button>
            </div>
        </div>
    </div>
```

Строки 521-522/523 (соседние строки-заглушки уже перенесённых блоков `task-status-modal`) и строка 545 (`node-selector-modal`-заглушка) — не входят в объём, остаются как есть (уже комментарии-заглушки от Step 41).

## 3. Цель блока

- `index.html` не содержит блока `etalon-prompt-modal` — заменён комментарием-заглушкой по образцу уже 30 перенесённых блоков зоны `#app-modals` (Step 41), но с формулировкой «удалён как осиротевший UI без точки вызова», не «перенесено в файл X» (в отличие от остальных 30 — здесь нет owner-файла, разметка не переезжает никуда, а физически удаляется).
- 0 регрессий рабочего потока «эталона» через задачи (`tasks.module.js`→`openEtalonConstructor`) — этот поток не трогается вовсе.
- Инициатива ROADMAP «Перенос статичной разметки `quality`+31 modal-блока+sidebar» закрывается целиком (31/31 модальных блоков обработаны — 30 перенесены, 1 удалён как мёртвый).

## 4. Файлы для создания

Нет.

## 5. Файлы для изменения

**Код (1 файл):**
1. `index.html` — удалить строки 524-544 (блок `etalon-prompt-modal` целиком, включая заголовок-комментарий строки 524), заменить одной строкой комментария-заглушки: `<!-- etalon-prompt-modal: удалён (2026-07-15) — осиротевший UI без точки вызова (btn-start-etalon не имел onclick/data-action), бизнес-поток "требуется эталон" полностью закрыт существующей задачей "Приемка Эталона" → кнопка "Снять Эталон" → openEtalonConstructor(), см. tasks.module.js/etalon.actions.js -->`.

**Документация (после успешной проверки, пишет Исполнитель):** `_ai/CURRENT_STEP.md`, `_ai/ROADMAP.md` (закрыть строку «Перенос статичной разметки `quality`+31 modal-блока+sidebar» целиком — 31/31), `_ai/MODULE_CROSS_REFERENCE_MAP.md` (если карта упоминала `etalon-prompt-modal` как открытый вопрос — сверить и обновить).

## 6. Что блок НЕ трогает

- `tasks.module.js`, `etalon.actions.js`, `game.actions.js`, `interventions.js` — рабочий поток «эталона» через задачи не меняется ни строкой.
- `js/modules/quality/features/etalon/**` целиком — конструктор/вьювер Акта-Эталона не меняются.
- Любые другие блоки `#app-modals` (уже перенесённые Step 41) — не трогаются.
- `js/core/**`, `storage.js`, `sync.js`, `sw.js`, `config.js` — не затрагиваются вовсе.
- Sidebar (Step 43, ожидает этого цикла отдельно) — не входит в этот блок.

## 7. Можно изменить / Можно создать / Нельзя трогать

**Можно изменить:** `index.html` (только удаление блока `etalon-prompt-modal` строк 524-544 + замена на комментарий-заглушку, п.5.1).

**Можно создать:** ничего.

**Нельзя трогать:** любые файлы `.js` (весь блок — чистое удаление разметки), любые другие блоки `index.html` вне указанных строк, `js/modules/quality/features/etalon/**`, `tasks.module.js`, `game.actions.js`.

## 8. Проверки

1. Grep по `index.html` на `etalon-prompt-modal`/`btn-start-etalon` — 0 совпадений (кроме, при необходимости, самого текста комментария-заглушки, если он ссылается на прежнее id для навигации будущих читателей).
2. `ReadLints` на `index.html` — 0 ошибок.
3. `check-module-boundaries.sh` — не применимо напрямую (изменения только в `index.html`, вне `js/modules/**`), но выполнить полный прогон для контроля — `OK: 0 new violations`.
4. Headless-браузер (Playwright-chromium, временная установка, http-сервер, удалить после теста) — обычная проверка (не критичный шаг, но блок трогает пользовательский поток задач):
   - Первичная загрузка — 0 `console.error`/`pageerror`/`requestfailed`/HTTP≥400; `document.getElementById('etalon-prompt-modal')` возвращает `null`.
   - Функциональная проверка рабочего потока: с демо-данными (`startDemoMode`/сид `dt3` в `app-mode-utils.js:991`, задача `needsEtalon:true`) открыть `task-details-modal` для задачи «Приемка Эталона» → кнопка «Снять Эталон» присутствует и по клику вызывает `openEtalonConstructor` без исключений (конструктор Акта-Эталона открывается в `#app-modals`).
   - `page.reload()` — повторно 0 новых ошибок, `etalon-prompt-modal` всё еще `null`.
5. Регресс-навигация по 6 маршрутам (`#/quality/audit`→`settings`, `#/construction/defects`→`acceptance`→`transfer`, обратно `#/quality/audit`) — 0 новых ошибок (блок не должен влиять на навигацию вовсе, проверка по прецеденту предыдущих блоков той же инициативы).

## 9. Откат

Восстановить сохранённую версию `index.html` до правки (репозиторий не под git — откат вручную по этому плану при `TEST_FAILED`). Откат тривиален и безопасен — блок правит 1 файл, 1 непрерывный диапазон строк, без изменения кода `.js`.

## 10. Следующий блок (не в объёме, зафиксировано для будущих циклов)

После закрытия этого блока инициатива ROADMAP «Перенос статичной разметки `quality`+31 modal-блока+sidebar» закрыта целиком (31/31 + sidebar подтверждён пользователем в этом же цикле архитектора). Следующий шаг цикла — architect выбирает новую инициативу ROADMAP (единый справочник подрядчиков, переход на новые Supabase-таблицы §38 — оба сейчас отложены по прямому указанию пользователя до отдельного явного запроса) или переходит к разделу «Будущие этапы» §29/`PROJECT_CARD.md` по фиксированному порядку источников (см. правила архитектора).

---
STATUS: PLAN_READY
