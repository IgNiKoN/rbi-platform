/**
 * report-preview.js — print-first превью One-Pager 2.0.
 * Содержимое берётся из buildOnePagerV2Html({ forPreview: true }),
 * тумблеры включают/выключают секции OP2, печать — window.print.
 */

const SECTION_DEFS = [
    { id: 'kpi', label: 'KPI' },
    { id: 'chartUrk', label: 'График УрК' },
    { id: 'chartRel', label: 'График надёжн.' },
    { id: 'audit', label: 'Аудиты' },
    { id: 'sk', label: 'ПК СК' },
    { id: 'skLists', label: 'Списки СК' },
    { id: 'help', label: 'Пояснения' }
];

const _sectionsOn = {
    kpi: true,
    chartUrk: true,
    chartRel: true,
    audit: true,
    sk: true,
    skLists: true,
    help: true
};

let _previewData = [];
let _builtTitle = 'One-Pager 2.0';
let _rendering = false;

function _esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _ensureOverlay() {
    let el = document.getElementById('rbi-report-preview');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'rbi-report-preview';
    el.className = 'rbi-report-preview hidden';
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('role', 'dialog');
    el.innerHTML = [
        '<div class="rbi-report-preview-chrome">',
        '  <div class="rbi-report-preview-head">',
        '    <div>',
        '      <div class="rbi-report-preview-title">Сводка к печати · One-Pager 2.0</div>',
        '      <div class="rbi-report-preview-sub">Те же блоки, что в PDF OP2 — включайте разделы и печатайте системной печатью</div>',
        '    </div>',
        '    <div class="rbi-report-preview-actions">',
        '      <button type="button" class="rbi-rp-btn rbi-rp-btn-secondary" data-rp-action="legacy">Старый PDF</button>',
        '      <button type="button" class="rbi-rp-btn rbi-rp-btn-primary" data-rp-action="print">Печать</button>',
        '      <button type="button" class="rbi-rp-btn rbi-rp-btn-ghost" data-rp-action="close">Закрыть</button>',
        '    </div>',
        '  </div>',
        '  <div class="rbi-report-preview-toggles" id="rbi-rp-toggles"></div>',
        '</div>',
        '<div class="rbi-report-preview-scroll">',
        '  <div class="rbi-report-preview-sheet rbi-report-preview-sheet-op2" id="rbi-rp-sheet">',
        '    <div class="rbi-rp-loading">Собираем One-Pager 2.0…</div>',
        '  </div>',
        '</div>'
    ].join('');
    document.body.appendChild(el);

    el.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-rp-action]');
        if (!btn) return;
        const act = btn.getAttribute('data-rp-action');
        if (act === 'close') closeReportPreview();
        else if (act === 'print') printReportPreview();
        else if (act === 'legacy') {
            closeReportPreview();
            if (typeof window.handleFabExportAction === 'function') {
                window.handleFabExportAction('onepager_v2', 'script');
            }
        }
    });

    el.querySelector('#rbi-rp-toggles').addEventListener('click', function (e) {
        const chip = e.target.closest('[data-rp-section]');
        if (!chip) return;
        const id = chip.getAttribute('data-rp-section');
        _sectionsOn[id] = !_sectionsOn[id];
        _renderToggles();
        _applySectionVisibility();
    });

    return el;
}

function _renderToggles() {
    const box = document.getElementById('rbi-rp-toggles');
    if (!box) return;
    box.innerHTML = SECTION_DEFS.map(function (s) {
        const on = !!_sectionsOn[s.id];
        return '<button type="button" class="rbi-rp-chip' + (on ? ' is-on' : '') + '" data-rp-section="' + s.id + '">' +
            _esc(s.label) + '</button>';
    }).join('');
}

function _applySectionVisibility() {
    const sheet = document.getElementById('rbi-rp-sheet');
    if (!sheet) return;
    sheet.querySelectorAll('[data-op2-sec]').forEach(function (sec) {
        const id = sec.getAttribute('data-op2-sec');
        sec.style.display = _sectionsOn[id] === false ? 'none' : '';
    });
}

async function _renderSheet() {
    const sheet = document.getElementById('rbi-rp-sheet');
    if (!sheet) return;
    if (typeof window.buildOnePagerV2Html !== 'function') {
        sheet.innerHTML = '<div class="rbi-rp-loading">buildOnePagerV2Html недоступен — обновите страницу (SW).</div>';
        return;
    }
    sheet.innerHTML = '<div class="rbi-rp-loading">Собираем One-Pager 2.0…</div>';
    _rendering = true;
    try {
        const built = await window.buildOnePagerV2Html(_previewData, { forPreview: true });
        if (!built || !built.content) {
            sheet.innerHTML = '<div class="rbi-rp-loading">Нет данных для сводки</div>';
            return;
        }
        _builtTitle = built.shellTitle || 'One-Pager 2.0';
        sheet.innerHTML = [
            '<header class="rbi-rp-doc-head">',
            '  <div class="rbi-rp-doc-title">' + _esc(_builtTitle) + '</div>',
            '  <div class="rbi-rp-doc-meta">Превью One-Pager 2.0 · печать системная (без html2pdf)</div>',
            '</header>',
            built.content
        ].join('');
        _applySectionVisibility();
    } catch (err) {
        console.warn('[report-preview] OP2 build failed', err);
        sheet.innerHTML = '<div class="rbi-rp-loading">Ошибка сборки: ' + _esc(err && err.message ? err.message : String(err)) + '</div>';
    } finally {
        _rendering = false;
    }
}

export async function openReportPreview(data) {
    _previewData = Array.isArray(data) ? data : [];
    if (!_previewData.length) {
        if (typeof showToast === 'function') showToast('Нет данных для выгрузки');
        return;
    }
    const el = _ensureOverlay();
    _renderToggles();
    el.classList.remove('hidden');
    document.body.classList.add('rbi-report-preview-open', 'modal-open');
    await _renderSheet();
}

export function closeReportPreview() {
    const el = document.getElementById('rbi-report-preview');
    if (el) el.classList.add('hidden');
    document.body.classList.remove('rbi-report-preview-open', 'modal-open');
}

export function printReportPreview() {
    const el = document.getElementById('rbi-report-preview');
    if (!el || el.classList.contains('hidden') || _rendering) return;
    setTimeout(function () { window.print(); }, 50);
}

window.openReportPreview = openReportPreview;
window.closeReportPreview = closeReportPreview;
window.printReportPreview = printReportPreview;
