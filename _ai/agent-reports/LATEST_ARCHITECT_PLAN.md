# Краткий план — Удаление осиротевшего `etalon-prompt-modal`

Обычный шаг (не критичный — не App Shell/Auth Gate/Module Loader/sync/storage). §29: 13/13 без изменений. Блок относится к `_ai/ROADMAP.md` — закрывает инициативу «Перенос статичной разметки `quality`+31 modal-блока+sidebar» целиком (31/31).

**Предыстория:** пользователь подтвердил sidebar-навигацию (вариант A, icon-rail, ПК ≥768px) как выполненную (критичный шаг, `LATEST_EXECUTOR_REPORT.md`). Из 2 открытых направлений выбрал `etalon-prompt-modal`. На вопрос о триггере и действии кнопки ответил: старая логика убирается, спроектировать самостоятельно аккуратно.

**Находка при планировании:** `etalon-prompt-modal` — полностью осиротевший UI. Кнопка `btn-start-etalon` не имеет `onclick`/`data-action` — не вызывает ничего. Ничто в коде не открывает саму модалку (0 вызовов `document.getElementById('etalon-prompt-modal').style.display=...` кроме кнопки «Позже» внутри самого блока). Бизнес-поток «требуется эталон» уже полностью реализован другим путём: `tasks.module.js` генерирует задачу «Приемка Эталона» для пар подрядчик+вид работ без Акта-Эталона → в `task-details-modal` кнопка «Снять Эталон» → `openEtalonConstructor()` (уже подключена, работает). Решение — не восстанавливать триггер, а удалить мёртвую разметку.

## Файлы
- **Изменить:** `index.html` — удалить блок `etalon-prompt-modal` (строки 524-544), заменить комментарием-заглушкой.
- **Не трогать:** `js/modules/quality/features/etalon/**`, `tasks.module.js`, `game.actions.js`, `interventions.js`, любой другой код `.js`.

## Проверки
1. Grep `index.html` на `etalon-prompt-modal`/`btn-start-etalon` — 0 (кроме текста заглушки).
2. `ReadLints` — 0 ошибок.
3. `check-module-boundaries.sh` полный прогон — `OK: 0 new violations`.
4. Headless-браузер: `document.getElementById('etalon-prompt-modal') === null`, функциональная проверка «Приемка Эталона» → «Снять Эталон» → `openEtalonConstructor` без исключений, `page.reload()` — 0 новых ошибок.
5. Регресс-навигация по 6 маршрутам.

## Откат
Восстановить сохранённую версию `index.html` (репозиторий не под git).

Полный план — `_ai/current_plan.md`.

STATUS: PLAN_READY
