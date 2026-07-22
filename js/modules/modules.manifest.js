/**
 * modules.manifest.js
 * Общий реестр манифестов всех платформенных модулей RBI Quality Pro.
 * Агрегирует все <module>.manifest.js в единый массив ModulesManifest.
 * Порядок строго соответствует MODULE_KEYS из js/core/app.entry.js.
 *
 * Compact Module Restructure, шаг 1: 9 переходных quality-манифестов
 * (history, audit, analytics, tasks, etalon, reports, engineer, schedule,
 * meetings) заменены одним агрегирующим QualityManifest
 * (см. _ai/COMPACT_MODULE_RESTRUCTURE_PLAN.md).
 */

import { QualityManifest }      from './quality/manifest.js';
import { SKManifest }           from './quality/features/sk/sk.manifest.js';
import { SettingsManifest }     from './quality/features/settings/settings.manifest.js';
import { KnowledgeManifest }    from './quality/features/knowledge/knowledge.manifest.js';
import { ConstructionManifest } from './construction/construction.manifest.js';
import { ConstructionV2Manifest } from './construction-v2/construction-v2.manifest.js';
import { GameManifest }         from './quality/features/gamification/game.manifest.js';
import { AIManifest }           from './quality/features/ai/ai.manifest.js';

export const ModulesManifest = [
    QualityManifest,
    SKManifest,
    SettingsManifest,
    KnowledgeManifest,
    ConstructionManifest,
    ConstructionV2Manifest,
    GameManifest,
    AIManifest
];

export function getModuleManifest(id) {
    return ModulesManifest.find(function (m) { return m.id === id; }) || null;
}
