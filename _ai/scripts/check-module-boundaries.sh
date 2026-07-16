#!/usr/bin/env bash
# check-module-boundaries.sh
#
# Проверяет, что window.<Namespace> = ... присваивания в каждом platform-модуле
# встречаются только в его разрешённых entry-файлах (index.js / <module>.module.js).
# Сравнивает найденные нарушения с baseline (known-boundary-debt.txt) и завершается
# с кодом 1 только если есть НОВЫЕ нарушения сверх baseline.
#
# Список модулей — хардкод (не парсит modules.manifest.js динамически, YAGNI).
# При добавлении 8-го модуля — добавить вручную новую строку в MODULES/DIRS/ENTRIES/EXCLUDES ниже.
#
# Использование:
#   _ai/scripts/check-module-boundaries.sh                  — обычная проверка (сравнение с baseline)
#   _ai/scripts/check-module-boundaries.sh --generate-baseline — печатает текущий список нарушений
#                                                                в формате путь:номер (для сохранения в baseline)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BASELINE_FILE="$SCRIPT_DIR/known-boundary-debt.txt"

cd "$REPO_ROOT"

# Модули: name|dir|entries(space-separated basenames)|excludes(space-separated relative subdir prefixes, may be empty)
MODULES=(
  "quality|js/modules/quality|index.js quality.module.js|js/modules/quality/features/sk js/modules/quality/features/settings js/modules/quality/features/knowledge js/modules/quality/features/gamification js/modules/quality/features/ai"
  "construction|js/modules/construction|index.js construction.module.js|"
  "sk|js/modules/quality/features/sk|index.js sk.module.js|"
  "settings|js/modules/quality/features/settings|index.js settings.module.js|"
  "knowledge|js/modules/quality/features/knowledge|index.js knowledge.module.js|"
  "gamification|js/modules/quality/features/gamification|index.js game.module.js|"
  "ai|js/modules/quality/features/ai|index.js ai.module.js|"
)

MODE="check"
if [[ "${1:-}" == "--generate-baseline" ]]; then
  MODE="generate"
fi

is_excluded() {
  local path="$1"
  shift
  local ex
  for ex in "$@"; do
    [[ -z "$ex" ]] && continue
    if [[ "$path" == "$ex"/* ]]; then
      return 0
    fi
  done
  return 1
}

is_entry() {
  local path="$1"
  shift
  local base
  base="$(basename "$path")"
  local e
  for e in "$@"; do
    if [[ "$base" == "$e" ]]; then
      return 0
    fi
  done
  return 1
}

VIOLATIONS_FILE="$(mktemp)"
trap 'rm -f "$VIOLATIONS_FILE"' EXIT

for entry in "${MODULES[@]}"; do
  IFS='|' read -r name dir entries_raw excludes_raw <<< "$entry"
  [[ -d "$dir" ]] || continue

  entries_arr=($entries_raw)
  excludes_arr=($excludes_raw)

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    file_path="${line%%:*}"
    rest="${line#*:}"
    line_no="${rest%%:*}"

    if is_excluded "$file_path" ${excludes_arr[@]+"${excludes_arr[@]}"}; then
      continue
    fi
    if is_entry "$file_path" ${entries_arr[@]+"${entries_arr[@]}"}; then
      continue
    fi

    echo "${file_path}:${line_no}" >> "$VIOLATIONS_FILE"
  done < <(grep -rn --include='*.js' -E 'window\.[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' "$dir" | sed -E 's/^([^:]+):([0-9]+):.*/\1:\2/')
done

sort -u -o "$VIOLATIONS_FILE" "$VIOLATIONS_FILE"

if [[ "$MODE" == "generate" ]]; then
  cat "$VIOLATIONS_FILE"
  exit 0
fi

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "ERROR: baseline file not found: $BASELINE_FILE" >&2
  echo "Запусти '$0 --generate-baseline > $BASELINE_FILE' для создания baseline." >&2
  exit 1
fi

NEW_VIOLATIONS="$(comm -23 "$VIOLATIONS_FILE" <(sort -u "$BASELINE_FILE") || true)"

if [[ -z "$NEW_VIOLATIONS" ]]; then
  echo "OK: 0 new violations"
  exit 0
else
  echo "НОВЫЕ нарушения публичной границы модуля (window.* вне entry-файла), не входящие в baseline:"
  echo "$NEW_VIOLATIONS"
  exit 1
fi
