import { testAndTransArray } from '../../share/index';
import { h } from './h';

export function initSlot(instance) {
  instance.slots = instance.vNode.children || {};
}

export function renderSlots(slots, name = 'default', ...args) {
  let rSlots = name in slots ? slots[name](...args) : [];
  rSlots = testAndTransArray(rSlots);
  return h('div', {}, rSlots);
}
