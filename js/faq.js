/* Файл: js/faq.js */
// Чтобы добавить новый раздел, добавьте объект в массив:
// { title: 'Название раздела', items: [ { q: 'Вопрос', a: 'Ответ' }, ... ] }

const FAQ_DATA = [
    {
        title: 'Философия RBI Quality',
        items: [
            { q: 'В чем суть приложения?', a: 'RBI Quality — это риск-ориентированная система на основе данных (Data-Driven). Роль инженера — не «человек с рулеткой», а независимый аудитор. Задача: проводить выборочные проверки, выявлять системные проблемы и обучать подрядчиков.' },
            { q: 'Нужен ли интернет?', a: 'Нет. Приложение работает полностью автономно (Offline-First). Все данные сохраняются в память устройства и отправляются в облако только при наличии связи.' }
        ]
    },
    {
        title: 'Математика УрК и Штрафы',
        items: [
            { q: 'Как считается Уровень Качества (УрК)?', a: 'УрК = База × Kc × Kcrit. База — процент пройденных проверок. Kc — штраф за системный брак. Kcrit — штраф за критические аварии.' },
            { q: 'Что такое B1, B2 и B3?', a: '<b>B1</b> (Мелкий) — эстетика, вес 1.<br><b>B2</b> (Значимый) — нарушение технологии, вес 2.<br><b>B3</b> (Критический) — угроза безопасности (СТОП), вес 3.' },
            { q: 'Что такое "Правило Стеклянного потолка" (Cap84)?', a: 'Если есть хотя бы один дефект B2 или B3, итоговая оценка не может превышать 84%, даже если всё остальное идеально.' }
        ]
    },
    {
        title: 'Аналитика и Дашборды',
        items: [
            { q: 'Что такое Индекс Критичности Объекта (ИКО)?', a: 'ИКО — средневзвешенная «угроза» всех подрядчиков на объекте.<br>🟢 < 0.30 — Низкий риск<br>🟡 0.30 – 0.60 — Повышенный риск<br>🔴 ≥ 0.60 — Высокий риск' },
            { q: 'Что такое Индекс Стабильности?', a: 'Показывает, насколько ровно работает подрядчик. Если оценки скачут от 40% до 100% — стабильность низкая, доверять подрядчику нельзя.' }
        ]
    }
];

window.openFaqModal = function() {
    renderFaqList();
    const modal = document.getElementById('faq-modal-overlay');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('translate-y-full');
    }, 10);
};

window.closeFaqModal = function() {
    const modal = document.getElementById('faq-modal-overlay');
    modal.classList.add('opacity-0');
    modal.querySelector('.transform').classList.add('translate-y-full');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
};

window.filterFaq = function() {
    const term = document.getElementById('faq-search-input').value.toLowerCase();
    renderFaqList(term);
};

window.toggleFaqAnswer = function(element) {
    const content = element.nextElementSibling;
    const icon = element.querySelector('.faq-icon');
    if (content.style.maxHeight === '0px' || !content.style.maxHeight) {
        content.style.maxHeight = '500px';
        content.style.paddingTop = '12px';
        content.style.paddingBottom = '12px';
        content.style.opacity = '1';
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.style.maxHeight = '0px';
        content.style.paddingTop = '0px';
        content.style.paddingBottom = '0px';
        content.style.opacity = '0';
        icon.style.transform = 'rotate(0deg)';
    }
};

function renderFaqList(searchTerm = '') {
    const container = document.getElementById('faq-list-container');
    let html = '';

    FAQ_DATA.forEach((section, sIdx) => {
        // Фильтруем вопросы внутри раздела
        const filteredItems = section.items.filter(item => 
            item.q.toLowerCase().includes(searchTerm) || 
            item.a.toLowerCase().includes(searchTerm) ||
            section.title.toLowerCase().includes(searchTerm)
        );

        if (filteredItems.length === 0) return;

        html += `
        <details class="mb-3 group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden" ${searchTerm ? 'open' : ''}>
            <summary class="font-black cursor-pointer p-4 text-[12px] uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 transition-colors flex justify-between items-center select-none">
                <span>${section.title}</span>
                <span class="transition-transform group-open:rotate-180 text-indigo-500">▼</span>
            </summary>
            <div class="p-2 bg-slate-50 dark:bg-slate-900/50">
        `;

        filteredItems.forEach((item, iIdx) => {
            html += `
                <div class="mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div class="p-3 text-[11px] font-bold text-slate-800 dark:text-white cursor-pointer flex justify-between items-center active:bg-slate-50 dark:active:bg-slate-700 transition-colors" onclick="toggleFaqAnswer(this)">
                        <span class="pr-4 leading-snug">${item.q}</span>
                        <svg class="w-4 h-4 text-slate-400 faq-icon transition-transform duration-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    <div class="px-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700" style="max-height: 0px; opacity: 0; overflow: hidden; transition: all 0.3s ease;">
                        ${item.a}
                    </div>
                </div>
            `;
        });

        html += `</div></details>`;
    });

    if (!html) html = `<div class="text-center py-10 text-slate-400 font-bold text-[11px] uppercase tracking-widest">Ничего не найдено</div>`;
    container.innerHTML = html;
}