#!/usr/bin/env node
/**
 * generate-sw-precache.mjs
 *
 * Строит реальный граф JS-файлов, физически нужных для офлайн-запуска
 * приложения (по <script src> из index.html + рекурсивным ES-import-цепочкам
 * + entry-путям platform-модулей из js/modules/modules.manifest.js, т.к. они
 * грузятся динамически через module-loader.js#loadModule, не статическим
 * import), и сравнивает результат с текущим urlsToCache в sw.js.
 *
 * Не пишет в sw.js — только печатает diff (безопаснее для критичного файла,
 * решение о принятии изменений — за исполнителем/архитектором).
 *
 * Запуск: node _ai/scripts/generate-sw-precache.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');

// Ручные исключения — файлы, которые кодогенератор физически не может
// обнаружить статическим анализом (не <script>, не ES import), но реально
// используются в рантайме. См. план блока, п.2.C.
const MANUAL_EXCLUSIONS = [
  'libs/pdfjs/pdf.worker.min.js' // назначается через pdfjsLib.GlobalWorkerOptions.workerSrc
];

function toRepoPath(absPath) {
  return relative(REPO_ROOT, absPath).split('\\').join('/');
}

function readRepoFile(repoRelPath) {
  return readFileSync(join(REPO_ROOT, repoRelPath), 'utf8');
}

/** Извлекает пути из <script src="..."> (classic и type="module") в index.html. */
function extractScriptSrcs(html) {
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/** Извлекает относительные пути из статических import ... from '...'; вызовов. */
function extractImportPaths(source) {
  const out = [];
  const re = /import\s+(?:[^'"]+?\s+from\s+)?['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function normalizeToRepoPath(fromRepoRelDir, importPath) {
  let p = join(fromRepoRelDir, importPath).split('\\').join('/');
  // normalize away ../ and ./ segments handled by join/resolve
  p = relative(REPO_ROOT, resolve(REPO_ROOT, p)).split('\\').join('/');
  return p;
}

function collectGraph(roots) {
  const visited = new Set();
  const missing = new Set();
  const queue = [...roots];

  while (queue.length) {
    const repoPath = queue.shift();
    if (visited.has(repoPath)) continue;
    visited.add(repoPath);

    const absPath = join(REPO_ROOT, repoPath);
    if (!existsSync(absPath)) {
      missing.add(repoPath);
      continue;
    }
    if (!repoPath.endsWith('.js')) continue; // не парсим не-JS корни (index.html обработан отдельно)

    const source = readRepoFile(repoPath);
    const importPaths = extractImportPaths(source);
    const fromDir = dirname(repoPath);
    for (const imp of importPaths) {
      const resolved = normalizeToRepoPath(fromDir, imp);
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  return { visited, missing };
}

function parseCurrentUrlsToCache(swSource) {
  const startIdx = swSource.indexOf('const urlsToCache = [');
  const endIdx = swSource.indexOf('];', startIdx);
  const block = swSource.slice(startIdx, endIdx);
  const re = /'\.\/([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function isJsPath(p) {
  return p.endsWith('.js');
}

function main() {
  const indexHtml = readRepoFile('index.html');
  const scriptSrcs = extractScriptSrcs(indexHtml)
    .filter((s) => !s.startsWith('http') && !s.startsWith('//'))
    .map((s) => s.replace(/^\.\//, ''));

  const manifestSource = readRepoFile('js/modules/modules.manifest.js');
  const manifestImportPaths = extractImportPaths(manifestSource);
  const manifestDir = 'js/modules';
  const manifestRoots = manifestImportPaths.map((p) => normalizeToRepoPath(manifestDir, p));

  // Для каждого манифеста добавляем manifest.entry как корень обхода —
  // module-loader.js делает динамический import(), не статический,
  // поэтому этот путь не попадёт в граф иначе (см. план блока, п.2.C).
  const entryRoots = [];
  for (const manifestPath of manifestRoots) {
    if (!existsSync(join(REPO_ROOT, manifestPath))) continue;
    const src = readRepoFile(manifestPath);
    const entryMatch = src.match(/entry:\s*['"](\.[^'"]+)['"]/);
    if (entryMatch) {
      const entryDir = dirname(manifestPath);
      entryRoots.push(normalizeToRepoPath(entryDir, entryMatch[1]));
    }
  }

  const jsScriptRoots = scriptSrcs.filter(isJsPath);
  const allRoots = [...new Set([...jsScriptRoots, ...manifestRoots, ...entryRoots])];

  const { visited, missing } = collectGraph(allRoots);

  const reachableJs = [...visited].filter(isJsPath).sort();

  const swSource = readRepoFile('sw.js');
  const currentList = parseCurrentUrlsToCache(swSource);
  const currentJsList = currentList.filter(isJsPath);
  const currentJsSet = new Set(currentJsList);
  const reachableJsSet = new Set(reachableJs);

  const missingFromSw = reachableJs.filter((p) => !currentJsSet.has(p));
  const candidatesForRemoval = currentJsList.filter(
    (p) => !reachableJsSet.has(p) && !MANUAL_EXCLUSIONS.includes(p)
  );

  console.log('=== (а) Отсутствуют в sw.js urlsToCache, но реально используются ===');
  if (missingFromSw.length === 0) {
    console.log('(нет)');
  } else {
    missingFromSw.forEach((p) => console.log('  ' + p));
  }
  console.log('\nВсего: ' + missingFromSw.length);

  console.log('\n=== (б) Присутствуют в sw.js, но не найдены в графе (проверить вручную перед удалением) ===');
  if (candidatesForRemoval.length === 0) {
    console.log('(нет)');
  } else {
    candidatesForRemoval.forEach((p) => console.log('  ' + p));
  }
  console.log('\nВсего: ' + candidatesForRemoval.length);

  if (missing.size > 0) {
    console.log('\n=== ПРЕДУПРЕЖДЕНИЕ: пути из графа, которые физически не существуют на диске ===');
    [...missing].sort().forEach((p) => console.log('  ' + p));
  }

  console.log('\n=== (в) Итоговый предлагаемый список JS-файлов для urlsToCache (для ручной вставки) ===');
  reachableJs.forEach((p) => console.log("  './" + p + "',"));
  console.log('\nВсего JS-файлов в графе: ' + reachableJs.length);
  console.log(
    '\nРучные исключения (не выводятся графом, оставить в sw.js как есть): ' +
      MANUAL_EXCLUSIONS.join(', ')
  );
}

main();
