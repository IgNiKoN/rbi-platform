/* Файл: data/system_nodes.js */
const SYSTEM_NODES = [
    {
        id: 'node_1',
        category: 'ФАСАД',
        title: 'Узел примыкания НВФ к оконному блоку',
        desc: 'Типовое решение монтажа откоса из оцинкованной стали с полимерным покрытием с устройством противопожарной отсечки.',
        img: '',
        materials: [
            { name: 'Кронштейн несущий КН-200', qty: '2 шт/м' },
            { name: 'Утеплитель минватный 100мм', qty: '1.05 м2/м2' },
            { name: 'Дюбель фасадный 10х120', qty: '5 шт/м2' },
            { name: 'Откос стальной (t=0.55мм)', qty: 'По проекту' }
        ],
        linkedDoc: 'СП 522.1325800.2023',
        linkedTwiChecklistKey: 'sys_nvf_facade'
    }
    
];
window.SYSTEM_NODES = SYSTEM_NODES;