import { publicInstanceProxy } from './publicInstanceProxy';
import { proxyRefs } from '../../index';
import { isFunction } from '../../share/index';
import { patch } from './render';

export function createComponent(vNode) {
  return {
    vNode,
    type: vNode.type, // 图方便
    render: null,
    setupResult: null,
    proxy: null,
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
  finishComponentSetup(instance);
}

function handleSetupResult(instance, res) {
  if (isFunction(res)) instance.render = res;
  else {
    instance.setupResult = proxyRefs(res);
  }
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  instance.proxy = new Proxy({ instance }, publicInstanceProxy);
  instance.render = instance.render || instance.type.render;
}

export function setupRenderEffect(instance, container) {
  const subTree = instance.render.call(instance.proxy);
  patch(null, subTree, container);
  instance.vNode.el = container;
}
