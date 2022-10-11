import { isObject, testAndTransArray } from '../../share/index';
import { h } from './h';
import { typeSymbol } from './vnode';

export function initSlot(instance) {
  instance.slots = instance.vNode.children || {};
}

export function renderSlots(slots, name = 'default', ...args) {
  let rSlots = name in slots ? slots[name] : [];
  rSlots = isObject(rSlots) ? rSlots : rSlots(...args);
  rSlots = testAndTransArray(rSlots);
  return h(typeSymbol.FragmentNodeNode, {}, rSlots);
}
