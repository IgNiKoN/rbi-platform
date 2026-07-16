# DATA_MIGRATION_MAP.md

Карта маппинга «старая Supabase-таблица → новая Supabase-таблица» для §38 (`PLATFORM_TARGET_ARCHITECTURE.md`), Блок 1. Документ проектирования — без единой строки SQL/кода. Старые таблицы не переименовываются и не удаляются (§38, «Принцип: старые таблицы никогда не удаляются автоматически»).

**Блок 2 (создание таблиц) — выполнен 2026-07-12.** Все 13 таблиц из карты созданы в Supabase (`sql/002_create_platform_v2_tables.sql`), пустые, RLS/grants эквивалентны старым таблицам (anon: SELECT, authenticated: полный CRUD), подтверждено проверкой через anon-ключ (`GET .../rest/v1/<table>?limit=1` → `200 []` для всех 13; старые таблицы не изменились). Статус по каждой таблице — «Блок 2 выполнен (2026-07-12)»: `issues`, `issue_items`, `sk_records_v2`, `construction_objects_v2`, `construction_buildings_v2`, `construction_floors_v2`, `construction_units_v2`, `construction_defects_v2`, `construction_acceptance_v2`, `location_nodes`, `location_node_aliases`, `contractors`, `contractor_aliases_v2`. Ничего в приложении ещё не читает/пишет в эти таблицы (Блоки 3/4 — впереди).

Источник полей старых таблиц — точечное чтение `js/sync.js`: строки 237–499 (`prepareSkRecordForCloud`/`normalizeCloudSkRecordForLocal`/`prepareContractorForCloud`/`prepareContractorAliasForCloud`/`prepareContractorQueueForCloud`), 1600–1863 (payload-ветки `const_*`/`project_object`/`object_alias`/shared-таблицы), 3601–3621 (payload `rbi_inspections`/`rbi_inspection_items`).

## Принципы

- Единый стандарт технических полей для всех новых таблиц (§18.1): `id/companyId/created_at/updated_at/deleted_at/is_deleted/created_by/version`.
- Связь с местоположением — через `locationId` на `LocationNode` (§18), не через свободные строки (`location`/`section`/`floor`/`room`/`project_loc`/`structure` и т.п.).
- Связь с подрядчиком — через `contractorId` на каноническую сущность `Contractor`, не через свободные строки (`contractor`/`contractor_name`/`contractor_raw`).
- Старые таблицы остаются как есть, переводятся в режим «только чтение» по мере миграции (Блок 4+) — этот документ не меняет ни одну существующую таблицу.
- `project_code` старой схемы → замена на ссылку `locationId` (проект/объект — верхний уровень `LocationNode`), либо `companyId`, если это глобальный уровень, не локация.

---

## Качество: `rbi_inspections` → `issues`

Источник полей: `js/sync.js:3601–3610`.

| Старое поле (`rbi_inspections`) | Новое поле (`issues`) | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1, сейчас всегда `'rbi'` |
| `project_code` | `locationId` | ссылка | заменяется на ссылку на `LocationNode` (верхний уровень — объект/проект) |
| `project_name` | — | — | выводится из эксплуатации, дублирует `project_display_name` |
| `project_canonical_key` | `locationId` | ссылка | сливается в `locationId` (каноническое имя объекта уже представлено самой ссылкой) |
| `project_display_name` | — | — | выводится из эксплуатации, значение получается через `locationId` → `LocationNode.displayName` |
| `engineer_name` | `created_by` | ссылка/текст | сливается со стандартным полем `created_by` (стандарт §18.1); было дублем `inspector_name` |
| `inspector_name` | `created_by` | ссылка/текст | дубль `engineer_name`, остаётся один источник истины — `created_by` |
| `contractor_name` | `contractorId` | ссылка | обязательный перевод свободной строки в ссылку на каноническую сущность `Contractor` (устранение технического долга §16/§2.4.1) |
| `template_key` | `template_key` | текст | остаётся без изменений |
| `template_title` | `template_title` | текст | остаётся без изменений |
| `location` | `locationId` | ссылка | сливается в `locationId` (если это было отдельным уровнем в свободной строке — детализируется через `LocationNode.parentId`-цепочку) |
| `section` | `locationId` | ссылка | сливается в `locationId` (уровень секции `LocationNode`) |
| `floor` | `locationId` | ссылка | сливается в `locationId` (уровень этажа `LocationNode`) |
| `room` | `locationId` | ссылка | сливается в `locationId` (уровень помещения `LocationNode`) |
| `inspection_date` | `inspection_date` | дата | остаётся без изменений (предметное поле, не техническое) |
| `metrics` | `metrics` | jsonb | остаётся без изменений |
| `is_completed` | `is_completed` | bool | остаётся без изменений (предметное поле) |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `deleted_at` | `deleted_at` | дата | стандарт §18.1, остаётся |
| `inspection_type` | `inspection_type` | текст | остаётся без изменений |
| `source` | — | — | выводится из эксплуатации, техническое поле старой синхронизации (`'cloud'`/`'local'`), не часть целевой модели данных |
| `sync_status` | — | — | выводится из эксплуатации, аналогично `source` — механизм синхронизации меняется вместе с переходом на новую схему |
| `sync_block_reason` | — | — | выводится из эксплуатации, аналогично `sync_status` |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `created_at` | дата | новое, стандарт §18.1 (в старой таблице отсутствовало явно — бралось из `updated_at` первой записи) |
| — | `version` | int | новое, стандарт §18.1, для conflict-detection синхронизации |

### `rbi_inspection_items` → `issue_items`

Источник полей: `js/sync.js:3616–3621`.

| Старое поле (`rbi_inspection_items`) | Новое поле (`issue_items`) | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `inspection_id` | `issueId` | ссылка | переименовано вслед за родительской таблицей (`issues.id`) |
| `project_code` | — | — | выводится из эксплуатации, дублирует `issues.locationId` через `issueId` — избыточно хранить на дочерней записи |
| `project_canonical_key` | — | — | выводится из эксплуатации, аналогично `project_code` — доступно через `issueId` → `issues.locationId` |
| `source` | — | — | выводится из эксплуатации (см. `rbi_inspections.source`) |
| `sync_status` | — | — | выводится из эксплуатации |
| `sync_block_reason` | — | — | выводится из эксплуатации |
| `item_id` | `item_id` | текст | остаётся без изменений (ссылка на пункт чек-листа шаблона) |
| `item_name` | `item_name` | текст | остаётся без изменений |
| `item_weight` | `item_weight` | число | остаётся без изменений |
| `status` | `status` | текст | остаётся без изменений |
| `comment` | `comment` | текст | остаётся без изменений |
| `cause_code` | `cause_code` | текст | остаётся без изменений |
| `fact_value` | `fact_value` | текст | остаётся без изменений |
| `tolerance_value` | `tolerance_value` | текст | остаётся без изменений |
| `details` | `details` | jsonb | остаётся без изменений |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `created_at` | дата | новое, стандарт §18.1 |
| — | `is_deleted` | bool | новое, стандарт §18.1 (в старой таблице отсутствовало — мягкое удаление наследовалось от родителя `rbi_inspections`) |
| — | `deleted_at` | дата | новое, стандарт §18.1, аналогично |
| — | `created_by` | ссылка | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

---

## СК: `sk_records` → `sk_records_v2`

Источник полей: `js/sync.js:240–308` (`prepareSkRecordForCloud`) и `311+` (`normalizeCloudSkRecordForLocal`). Это самая «мигрированная» по стилю старая таблица (уже содержит `*_canonical_key`), но с явным техдолгом — тройное дублирование подрядчика/проекта разными полями.

| Старое поле (`sk_records`) | Новое поле (`sk_records_v2`) | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется на ссылку на `LocationNode` |
| `sk_number` | `sk_number` | текст | остаётся без изменений (предметное поле) |
| `sk_unique_key` | `sk_unique_key` | текст | остаётся без изменений (составной ключ проект+номер, актуален и после перехода на `locationId`) |
| `row_number` | `row_number` | текст | остаётся без изменений |
| `text` | `text` | текст | остаётся без изменений |
| `category` | `category` | текст | остаётся без изменений |
| `date_issued` | `date_issued` | дата | остаётся без изменений |
| `contractor_raw` | — | — | выводится из эксплуатации; единственный источник истины после миграции — `contractorId` |
| `contractor_name` | — | — | выводится из эксплуатации, дублирует `contractor_raw`/`contractor_canonical_key`; заменяется ссылкой |
| `contractor_canonical_key` | `contractorId` | ссылка | становится единственным источником — прямой перевод в ссылку на `Contractor` (устранение техдолга §16/§2.4.1) |
| `contractor_normalization_status` | — | — | выводится из эксплуатации; в новой схеме нормализация обязана быть завершена до записи (ссылка `contractorId` невалидна без завершённой нормализации) |
| `contractor_representative` | `contractor_representative` | текст | остаётся без изменений (предметное поле, представитель подрядчика — не сама каноническая сущность) |
| `deadline` | `deadline` | дата | остаётся без изменений |
| `status_raw` | — | — | выводится из эксплуатации, дублирует `status_normalized` |
| `status_normalized` | `status` | текст | переименовано, становится единственным полем статуса |
| `is_verified_closed` | `is_verified_closed` | bool | остаётся без изменений |
| `date_resolved` | `date_resolved` | дата | остаётся без изменений |
| `issued_by` | `issued_by` | ссылка/текст | остаётся без изменений (предметное поле — кто выдал предписание, не путать с `created_by`) |
| `closed_by` | `closed_by` | ссылка/текст | остаётся без изменений |
| `structure` | `locationId` | ссылка | сливается в `locationId` |
| `project_loc` | `locationId` | ссылка | сливается в `locationId`, дублирует `project_raw_path` |
| `project_raw_path` | — | — | выводится из эксплуатации, дублирует `project_loc` |
| `project_raw_name` | — | — | выводится из эксплуатации, свободная строка-предшественник `project_canonical_key` |
| `project_canonical_key` | `locationId` | ссылка | становится источником для `locationId` вместе с `project_code` |
| `project_display_name` | — | — | выводится из эксплуатации, значение получается через `locationId` |
| `project_block` | `locationId` | ссылка | сливается в `locationId` (уровень корпуса) |
| `project_floor` | `locationId` | ссылка | сливается в `locationId` (уровень этажа) |
| `project_normalization_status` | — | — | выводится из эксплуатации, аналогично `contractor_normalization_status` |
| `uploaded_by` | `uploaded_by` | ссылка/текст | остаётся без изменений; дублирует `sk_uploaded_by`/`imported_by` — сохраняется как основное поле |
| `sk_uploaded_by` | — | — | выводится из эксплуатации, дублирует `uploaded_by` |
| `imported_by` | — | — | выводится из эксплуатации, дублирует `uploaded_by` |
| `first_uploaded_by` | `first_uploaded_by` | ссылка/текст | остаётся без изменений (история первой загрузки — не дублирует текущего `uploaded_by`) |
| `last_uploaded_by` | — | — | выводится из эксплуатации, дублирует `uploaded_by` |
| `import_batch_id` | `import_batch_id` | текст | остаётся без изменений |
| `import_count` | `import_count` | число | остаётся без изменений |
| `first_imported_at` | `first_imported_at` | дата | остаётся без изменений |
| `last_imported_at` | — | — | выводится из эксплуатации, дублирует стандартное `updated_at` |
| `source` | — | — | выводится из эксплуатации (техническое поле старой синхронизации) |
| `sync_status` | — | — | выводится из эксплуатации |
| `sync_block_reason` | — | — | выводится из эксплуатации |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `deleted_at` | `deleted_at` | дата | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `created_by` | ссылка | новое, стандарт §18.1 (в старой таблице роль частично играл `uploaded_by`, но семантика иная — «кто загрузил», не «кто создал запись») |
| — | `version` | int | новое, стандарт §18.1 |

Из `normalizeCloudSkRecordForLocal` (`js/sync.js:311+`) дополнительно подтверждается поле `contractor`/`contractorName`/`raw_contractor` — это чисто клиентские алиасы для чтения, не отдельные колонки таблицы; в карте не учитываются повторно.

---

## Стройконтроль: `construction_objects/buildings/floors/units/defects/acceptance` → целевой набор новых таблиц

Разделение по сущностям сохраняется (YAGNI — текущая схема уже разделена и работает, не сливать в одну таблицу).

### `construction_objects` → `construction_objects_v2`

Источник: `js/sync.js:1615, 1637, 1804–1812` (нет отдельной ветки payload для `const_object` — использует стандартный JSONB-формат, попадает в исключение блока «специфичных полей», строка 1816).

| Старое поле | Новое поле | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `data` (jsonb, весь объект целиком) | — | — | выводится из эксплуатации; в новой схеме объект хранится через явные предметные поля, не единый blob — находка исполнителя (см. «Риски» в отчёте) |
| — | `name` | текст | новое, извлекается из `data.name` при миграции истории (Блок 5) |
| — | `locationId` | ссылка | новое — верхний уровень `LocationNode` для этого объекта стройконтроля |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `deleted_at` | `deleted_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `created_at` | дата | новое, стандарт §18.1 |
| — | `created_by` | ссылка | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

### `construction_buildings` → `construction_buildings_v2`

Источник: `js/sync.js:1735–1749`.

| Старое поле | Новое поле | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется ссылкой на `LocationNode` (уровень объекта) |
| `object_id` | `parentLocationId`/`locationId` | ссылка | связь с родительским объектом стройконтроля через иерархию `LocationNode.parentId`, отдельное поле не нужно — сливается в `locationId`-цепочку |
| `name` | `name` | текст | остаётся без изменений |
| `sort_order` | `sort_order` | число | остаётся без изменений |
| `owner` | — | — | выводится из эксплуатации, дублирует `created_by` |
| `created_by` | `created_by` | ссылка | стандарт §18.1, остаётся, становится единственным источником (замена `owner`) |
| `source` | — | — | выводится из эксплуатации |
| `sync_status` | — | — | выводится из эксплуатации |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `deleted_at` | дата | новое, стандарт §18.1 (в старой таблице отсутствовало отдельно от `is_deleted`) |
| — | `version` | int | новое, стандарт §18.1 |

### `construction_floors` → `construction_floors_v2`

Источник: `js/sync.js:1750–1768`.

| Старое поле | Новое поле | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется ссылкой |
| `building_id` | `parentLocationId`/`locationId` | ссылка | связь с корпусом через иерархию `LocationNode`, аналогично `construction_buildings.object_id` |
| `name` | `name` | текст | остаётся без изменений |
| `sort_order` | `sort_order` | число | остаётся без изменений |
| `pdf_url` | `pdf_url` | текст | остаётся без изменений (ссылка на файл плана этажа — предметное поле) |
| `pdf_name` | `pdf_name` | текст | остаётся без изменений |
| `pdf_size` | `pdf_size` | текст/число | остаётся без изменений |
| `is_active` | `is_active` | bool | остаётся без изменений (предметное поле, не путать с `is_deleted`) |
| `owner` | — | — | выводится из эксплуатации, дублирует `created_by` |
| `created_by` | `created_by` | ссылка | стандарт §18.1, остаётся |
| `source` | — | — | выводится из эксплуатации |
| `sync_status` | — | — | выводится из эксплуатации |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

### `construction_units` → `construction_units_v2`

Источник: `js/sync.js:1721–1734`.

| Старое поле | Новое поле | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется ссылкой |
| `building_id` | `parentLocationId`/`locationId` | ссылка | связь с корпусом через иерархию `LocationNode` |
| `floor_id` | `parentLocationId`/`locationId` | ссылка | связь с этажом через иерархию `LocationNode` |
| `name` | `name` | текст | остаётся без изменений |
| `type` | `type` | текст | остаётся без изменений (предметное поле — тип помещения) |
| `sort_order` | `sort_order` | число | остаётся без изменений |
| `status` | `status` | текст | остаётся без изменений (предметное поле — статус приёмки помещения) |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `created_by` | ссылка | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

### `construction_defects` → `construction_defects_v2`

Источник: `js/sync.js:1675–1698`. Ключевая находка §16/§2.4.1 — свободная строка `contractor`.

| Старое поле | Новое поле | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется ссылкой (верхний уровень) |
| `floor_id` | `locationId` | ссылка | сливается в `locationId` (уровень этажа, наиболее точный уровень локации дефекта) |
| `x` | `x` | число | остаётся без изменений (координата на плане этажа — предметное поле) |
| `y` | `y` | число | остаётся без изменений |
| `template_key` | `template_key` | текст | остаётся без изменений |
| `item_id` | `item_id` | текст | остаётся без изменений |
| `item_name` | `item_name` | текст | остаётся без изменений |
| `norm_text` | `norm_text` | текст | остаётся без изменений |
| `text` | `text` | текст | остаётся без изменений |
| `category` | `category` | текст | остаётся без изменений |
| `deadline` | `deadline` | дата | остаётся без изменений |
| `contractor` | `contractorId` | ссылка | **обязательный перевод свободной строки в ссылку на `Contractor`** — прямая цель блока (устранение техдолга §16/§2.4.1) |
| `description` | `description` | текст | остаётся без изменений |
| `photo` | `photo` | текст/jsonb | остаётся без изменений (ссылка на файл в Storage) |
| `status` | `status` | текст | остаётся без изменений |
| `history` | `history` | jsonb | остаётся без изменений (журнал изменений дефекта — предметное поле) |
| `created_by` | `created_by` | ссылка | стандарт §18.1, остаётся |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

### `construction_acceptance` → `construction_acceptance_v2`

Источник: `js/sync.js:1699–1720`. Вторая таблица со свободной строкой `contractor`.

| Старое поле | Новое поле | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется ссылкой |
| `object_id` | `locationId` | ссылка | сливается в `locationId` |
| `floor_id` | `locationId` | ссылка | сливается в `locationId` (наиболее точный уровень) |
| `zone` | `zone` | jsonb/текст | остаётся без изменений (предметное поле — зона приёмки на плане) |
| `template_key` | `template_key` | текст | остаётся без изменений |
| `work_type` | `work_type` | текст | остаётся без изменений |
| `location` | — | — | выводится из эксплуатации, дублирует `locationId`-цепочку (`object_id`/`floor_id`/`section`/`floor`/`room`) |
| `section` | `locationId` | ссылка | сливается в `locationId` |
| `floor` | `locationId` | ссылка | сливается в `locationId` (не путать с `floor_id` — здесь свободная строка-дубль) |
| `room` | `locationId` | ссылка | сливается в `locationId` |
| `volume` | `volume` | текст | остаётся без изменений |
| `requested_date` | `requested_date` | дата | остаётся без изменений |
| `requested_time` | `requested_time` | текст | остаётся без изменений |
| `contractor` | `contractorId` | ссылка | **обязательный перевод свободной строки в ссылку на `Contractor`** (устранение техдолга §16/§2.4.1) |
| `status` | `status` | текст | остаётся без изменений |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `created_by` | ссылка | новое, стандарт §18.1 (в старой таблице отсутствовало — не было явного автора записи приёмки) |
| — | `version` | int | новое, стандарт §18.1 |

---

## Сквозные сущности

### `project_objects` + `object_aliases` → `LocationNode` (таблицы: `location_nodes` + `location_node_aliases`)

> Имя новой Supabase-таблицы зафиксировано архитектором 2026-07-12 (документационное уточнение, без кода) — при первой фиксации Блока 1 (2026-07-07) для этой сквозной сущности не было явно указано целевое имя таблицы, в отличие от остальных сущностей (`issues`, `sk_records_v2` и т.п.). `location_nodes` — основная таблица (аналог `project_objects`), `location_node_aliases` — дочерняя таблица алиасов (аналог `object_aliases`), т.к. `_v2`-суффикс неприменим (нет таблицы с таким же именем в старой схеме).

Источник: `js/sync.js:1782–1803`; справочно `ctx.objects` (`SERVICES_API.md:251–260`).

| Старое поле (`project_objects`) | Новое поле (`LocationNode`) | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | — | — | выводится из эксплуатации; `project_code` был единицей группировки-предшественником самого верхнего уровня `LocationNode`, после миграции каждый `project_objects` становится корневым `LocationNode` без родителя (`parentId = null`) |
| `canonical_key` | `canonical_key` | текст | остаётся без изменений (уникальный ключ узла, используется как естественный идентификатор наравне с `id`) |
| `display_name` | `displayName` | текст | переименовано в стиле camelCase целевой модели (§18) |
| `synonyms` | `synonyms` | jsonb | остаётся без изменений (предметное поле, не техническое) |
| `created_by` | `created_by` | ссылка | стандарт §18.1, остаётся |
| `_deleted` | — | — | выводится из эксплуатации, дублирует `is_deleted` (историческое дублирующее поле старой схемы) |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `parentId` | ссылка | новое — ключевое поле целевой модели (§18): плоское дерево через `parentId`, не все уровни обязательны |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

| Старое поле (`object_aliases`) | Новое поле (`LocationNode`, дочерняя структура алиасов) | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| `project_code` | — | — | выводится из эксплуатации (см. выше) |
| `raw_name` | `raw_name` | текст | остаётся без изменений (алиас, ведущий к каноническому `LocationNode`) |
| `canonical_key` | `locationId` | ссылка | заменяется прямой ссылкой на `LocationNode.id` вместо связи через строку `canonical_key` |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `companyId` | текст | новое, стандарт §18.1 |
| — | `is_deleted` | bool | новое, стандарт §18.1 (в старой таблице отсутствовало — алиасы не удалялись мягко) |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `created_by` | ссылка | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

Таблица `object_normalization_queue` (очередь нормализации, `js/sync.js:1621`) — рабочая/временная таблица процесса нормализации, не хранит финальные данные сущности `LocationNode`. В карту целевой схемы не включается: остаётся служебной таблицей существующего процесса нормализации без изменений до отдельного решения по этому механизму (вне рамок этого блока).

### `contractor_directory` + `contractor_aliases` → `Contractor` (таблицы: `contractors` + `contractor_aliases_v2`)

> Имя новой Supabase-таблицы зафиксировано архитектором 2026-07-12 (документационное уточнение, без кода), аналогично `LocationNode` выше. `contractors` — основная таблица (не совпадает с именем ни одной старой таблицы, суффикс `_v2` не нужен). `contractor_aliases_v2` — дочерняя таблица алиасов, здесь суффикс `_v2` обязателен: имя `contractor_aliases` уже занято старой таблицей.

Источник: `js/sync.js:408–468` (`prepareContractorForCloud`/`prepareContractorAliasForCloud`); справочно `ctx.contractors` (`SERVICES_API.md:264–273`).

| Старое поле (`contractor_directory`) | Новое поле (`Contractor`) | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| — | `companyId` | текст | новое, стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется ссылкой на `LocationNode` — подрядчик привязывается к проекту/объекту через локацию, а не свободный код проекта |
| `canonical_key` | `canonical_key` | текст | остаётся без изменений (уникальный ключ подрядчика) |
| `display_name` | `displayName` | текст | переименовано в стиле camelCase (§18) |
| `synonyms` | `synonyms` | jsonb | остаётся без изменений |
| `inn` | `inn` | текст | остаётся без изменений (предметное поле — ИНН подрядчика) |
| `created_by` | `created_by` | ссылка | стандарт §18.1, остаётся |
| `is_deleted` | `is_deleted` | bool | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

**Расширение карточки подрядчика (согласовано с пользователем 2026-07-12, отдельный блок сверх Блока 2 §38 — таблица `contractors` уже создана пустой, расширяется через `ALTER TABLE`, не через новый `CREATE TABLE`):** старая таблица `contractor_directory` не содержала юридического набора полей сверх `inn` — это новые поля, не перенос старых:

| Новое поле (`contractors`) | Тип | Примечание |
|---|---|---|
| `legal_name` | текст | полное юридическое наименование (отличается от `displayName` — короткое отображаемое имя) |
| `legal_form` | текст | ОГРН/ОГРНИП (согласовано как одно поле — конкретное значение зависит от типа лица, не разделяется на 2 колонки) |
| `legal_address` | текст | юридический адрес |
| `contact_person` | текст | контактное лицо |
| `contact_phone` | текст | контактный телефон |
| `contact_email` | текст | контактный email |

Договорные данные (номер/дата/вид работ/статус договора) — **не поля `contractors`**, отдельная новая таблица `contracts` (1 подрядчик может иметь несколько договоров — 1:N):

| Поле (`contracts`, новая таблица) | Тип | Примечание |
|---|---|---|
| `id` | текст/uuid | стандарт §18.1 |
| `companyId` | текст | стандарт §18.1 |
| `contractorId` | ссылка | обязательная связь на `contractors.id` |
| `contract_number` | текст | номер договора |
| `contract_date` | date | дата договора |
| `work_type` | текст | вид работ по договору |
| `status` | текст | статус договора (`active`/`completed` — конкретный набор значений определяется Исполнителем по аналогии с существующими текстовыми статусами других таблиц, не enum на уровне схемы) |
| `created_by` | ссылка | стандарт §18.1 |
| `is_deleted` | bool | стандарт §18.1 |
| `deleted_at` | timestamptz | стандарт §18.1 |
| `created_at` | timestamptz | стандарт §18.1 |
| `updated_at` | timestamptz | стандарт §18.1 |
| `version` | int | стандарт §18.1 |

Обе доработки — часть отдельного SQL-блока (не Блока 2, который уже выполнен и закрыт) — см. `sql/003_extend_contractors_and_contracts.sql`. Таблицы пустые/не используются приложением на момент этого изменения — не критичный шаг. **Выполнено 2026-07-12**: `contractors` содержит 6 новых колонок (`legal_name`/`legal_form`/`legal_address`/`contact_person`/`contact_phone`/`contact_email`), таблица `contracts` создана и пуста, RLS/grants эквивалентны `contractors` (anon: SELECT, authenticated: полный CRUD), подтверждено проверкой через anon-ключ и OpenAPI-схему. Ничего в приложении ещё не читает/пишет ни одну из этих колонок/таблицу.

| Старое поле (`contractor_aliases`) | Новое поле (`Contractor`, дочерняя структура алиасов) | Тип | Примечание |
|---|---|---|---|
| `id` | `id` | текст/uuid | стандарт §18.1 |
| `project_code` | `locationId` | ссылка | заменяется ссылкой, аналогично `contractor_directory` |
| `raw_name` | `raw_name` | текст | остаётся без изменений (свободная строка-алиас, ведущая к каноническому `Contractor`) |
| `canonical_key` | `contractorId` | ссылка | заменяется прямой ссылкой на `Contractor.id` вместо связи через строку `canonical_key` |
| `created_by` | `created_by` | ссылка | стандарт §18.1, остаётся |
| `created_at` | `created_at` | дата | стандарт §18.1, остаётся |
| `updated_at` | `updated_at` | дата | стандарт §18.1, остаётся |
| — | `companyId` | текст | новое, стандарт §18.1 |
| — | `is_deleted` | bool | новое, стандарт §18.1 (в старой таблице отсутствовало) |
| — | `deleted_at` | дата | новое, стандарт §18.1 |
| — | `version` | int | новое, стандарт §18.1 |

Таблица `contractor_normalization_queue` (`js/sync.js:470–498`) — рабочая/временная таблица процесса нормализации, аналогично `object_normalization_queue`. В карту целевой схемы не включается: остаётся служебной таблицей существующего процесса без изменений до отдельного решения (вне рамок этого блока).

---

## Итог по устранению технического долга §16/§2.4.1

Все обнаруженные свободные строковые ссылки на подрядчика получили явный маппинг на `contractorId`:
- `rbi_inspections.contractor_name` → `issues.contractorId`;
- `sk_records.contractor_raw`/`contractor_name`/`contractor_canonical_key` → `sk_records_v2.contractorId` (единственный источник истины — бывший `contractor_canonical_key`);
- `construction_defects.contractor` → `construction_defects_v2.contractorId`;
- `construction_acceptance.contractor` → `construction_acceptance_v2.contractorId`;
- `contractor_aliases.canonical_key` (строка) → прямая ссылка `Contractor.id`.

Ни одно поле-держатель подрядчика как свободной строки не осталось без маппинга на ссылку.

---

## Находки вне рамок блока (зафиксировано, не выполняется)

1. `construction_objects` в старой схеме хранит данные полностью через JSONB-колонку `data` (нет отдельной ветки payload в `js/sync.js`, в отличие от `buildings`/`floors`/`units`/`defects`/`acceptance`) — единственная из семейства "стройконтроль"-таблиц без явных предметных колонок. При проектировании `construction_objects_v2` это означает дополнительную работу на Блоке 5 (миграция истории) — разбор `data`-blob на явные поля. Не выполняется в этом блоке (документирование, не код).
2. `object_normalization_queue`/`contractor_normalization_queue` — обе служебные таблицы процесса нормализации не входят в целевую модель (18.1) как таковые (не предметные сущности), но упомянуты для полноты картины. Решение об их судьбе (остаются как временный служебный механизм / переезжают в новую схему) не принято — вне рамок Блока 1, не блокирует его.
