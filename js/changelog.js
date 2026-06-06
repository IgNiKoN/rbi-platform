/* Файл: js/changelog.js */

window.RBI_CHANGELOG = [
    {
        version: "17.10.8",
        date: "06.06.2026",
        features: [
            "Исправлена проблема с бесконечной загрузкой заставки (Splash Screen) при отсутствии интернета или недоступности сервера. Добавлен жесткий таймаут для гарантированного запуска офлайн-режима.",
            "Исправлен «скачок» интерфейса в Бэклоге при изменении статуса. Внедрен временный замок на перерисовку, позволяющий спокойно написать ответ разработчика.",
            "Исправлена синхронизация ответов разработчика и лайков в модуле обратной связи."
        ]
    },
    {
        version: "17.10.5",
        date: "05.06.2026",
        features: [
            "Внедрена «Умная Очередь Синхронизации» (Transactional Outbox): все ваши действия (сохранение проверок, задач, FMEA, практик) теперь гарантированно доставляются в облако без потерь при обрывах связи.",
            "Исправлен баг синхронизации ролей: теперь при получении прав Руководителя приложение корректно выкачивает всю историческую базу по команде.",
            "Оптимизация для iOS (PWA): внедрен механизм «самолечения» локальной базы данных и защита от зависания фоновых загрузок фото и PDF.",
            "Защита от конкурентного доступа: предотвращено затирание черновика осмотра и опыта (XP), если вы одновременно открыли приложение на ПК и телефоне.",
        ]
    },
     {
        version: "17.10.0",
        date: "04.06.2026",
        features: [
            "Обновлена безопасность облачной базы данных (RLS): исправлены права доступа для удаления и редактирования собственных записей инженерами.",
            "Умная очистка памяти: удалённые файлы и записи (включая фото) теперь навсегда стираются с устройства после успешной синхронизации с облаком.",
            "Полный переход на Offline-First архитектуру: бизнес-модули больше не зависят от прямого интернет-соединения.",
            "Централизованное управление ролями (Role Manager): единая матрица прав доступа применяется ко всем функциям и интерфейсам.",
            "Единый движок синхронизации (Sync Engine): оптимизирован сбор, упаковка и фоновая отправка данных в облако без зависаний UI.",
            "Управление справочниками (Объекты и Подрядчики): заявки на создание, слияния дубликатов и синонимы теперь работают локально с отложенной синхронизацией.",
            "Исправлен баг с бесконечным обновлением: устранено дублирование и моргание карточек задач при фоновой синхронизации."
        ]
    },
    {
        version: "17.9.0",
        date: "03.06.2026",
        features: [
            "Добавлен полноценный Календарь задач: теперь можно просматривать задачи по датам в отдельном окне.",
            "Ручные задачи теперь имеют жесткую привязку к категориям «Плановые (Текущие)» или «Будущие (Отложенные)», независимо от установленного дедлайна.",
            "В карточке дефекта при осмотре теперь можно выбрать сразу несколько коренных причин (множественный выбор галочками вместо списка).",
            "В разделе «Аналитика -> Отчеты» добавлена кнопка «Выбрать всё» для массового удаления старых отчетов в 1 клик.",
            "При создании ручного поручения руководителем в списке исполнителей теперь отображаются абсолютно все инженеры из базы, а в задачу добавлено поле «Описание».",
            "Настройки интерфейса (темы, тумблеры) теперь корректно и мгновенно загружаются после обновления страницы (F5).",
            "Исправлена проблема с удалением проверок: теперь удаленные проверки не возвращаются обратно после синхронизации.",
            "Исправлено: Браузер больше не пытается сохранить пароль в поля «Секция/Оси».",
            "Дизайн: Точная настройка корпоративных цветов RBI (Light и Dark темы) в соответствии с официальным брендбуком."
        ]
    },
    {
        version: "17.8.222",
        date: "01.06.2026",
        features: [
            "Глубокая переработка PWA и Offline-First архитектуры.",
            "Внедрен адаптивный менеджер памяти (автоматическая очистка старых кэшей).",
            "Новый модуль Стройконтроль (работа от плана, дефекты сточами на плане, заявки на сдачу, шахматка квартир, все модули в бэта тесте).",
        ]
    }
];

window.rbi_openChangelogModal = function() {
    const container = document.getElementById('changelog-list-container');
    if (!container) return;

    let html = '';
    window.RBI_CHANGELOG.forEach((log, index) => {
        const isLatest = index === 0;
        const badge = isLatest ? `<span class="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ml-2 shadow-sm">Последняя</span>` : '';
        
        html += `
        <div class="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <div class="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                <div class="font-black text-[14px] text-indigo-600 dark:text-indigo-400">v${log.version} ${badge}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${log.date}</div>
            </div>
            <ul class="space-y-2">
                ${log.features.map(f => `
                    <li class="flex items-start gap-2 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                        <svg class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        <span>${f}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        `;
    });

    container.innerHTML = html;

    const modal = document.getElementById('changelog-modal-overlay');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('translate-y-full');
    }, 10);
};

window.rbi_closeChangelogModal = function() {
    const modal = document.getElementById('changelog-modal-overlay');
    modal.classList.add('opacity-0');
    modal.querySelector('.transform').classList.add('translate-y-full');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
};