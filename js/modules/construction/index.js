/**
 * index.js — публичная точка входа модуля construction.
 * Единственный файл, через который Core и module-loader обращаются к модулю.
 * Бизнес-логика — в construction.module.js.
 */

import { ConstructionModule } from './construction.module.js';

export async function init(ctx) {
  if (typeof ConstructionModule.init === 'function') {
    return ConstructionModule.init(ctx);
  }
}

export async function mount(ctx, target) {
  if (typeof ConstructionModule.mount === 'function') {
    return ConstructionModule.mount(ctx, target);
  }
}

export async function unmount(ctx) {
  if (typeof ConstructionModule.unmount === 'function') {
    return ConstructionModule.unmount(ctx);
  }
}

export default {
  init,
  mount,
  unmount
};
