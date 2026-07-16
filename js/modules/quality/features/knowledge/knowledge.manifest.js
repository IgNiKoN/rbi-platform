/**
 * knowledge.manifest.js
 * Декларативный манифест модуля «База знаний» (БЗ). Метаданные для будущего
 * modules.manifest.js + module-loader. Не подключается никуда — см.
 * js/modules/knowledge/knowledge.module.js для реального контракта платформы.
 */

export const KnowledgeManifest = {
    id: 'knowledge',
    role: 'feature-of',
    parentModule: 'quality',
    title: 'База знаний',
    icon: 'book-open',
    version: '1.0.0',
    status: 'active',
    entry: './index.js',
    menu: { section: 'main', label: 'БЗ', order: 9 },
    company: { enabledByDefault: true },
    routes: ['/knowledge', '/knowledge/twi', '/knowledge/docs', '/knowledge/nodes', '/knowledge/etalons'],
    defaultRoute: '/knowledge'
};
