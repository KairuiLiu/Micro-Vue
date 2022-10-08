import { isFunction, isObject } from '../../share/index';
import { patch } from './render';

export function createComponent(vNode) {
  return {
    vNode,
    type: vNode.type, // 图方便
    render: null,
  };
}

export function setupComponent(instance) {
  // initProp
  // initSlot
  setupStatefulComponent(instance);
  finishComponentSetup(instance);
}

function setupStatefulComponent(instance) {
  if (instance.type.setup)
    handleSetupResult(instance, instance.type.setup.call(instance));
  finishComponentSetup;
}

// !
function handleSetupResult(instance, res) {
  if (isFunction(res)) instance.render = res;
  else {
    instance.setupResult = res;
  }
  finishComponentSetup(instance);
}

//!
function finishComponentSetup(instance) {
  instance.render = instance.render || instance.type.render;
}

// !
export function setupRenderEffect(render, container) {
  const subTree = render();
  // !
  patch(null, subTree, container);
}
