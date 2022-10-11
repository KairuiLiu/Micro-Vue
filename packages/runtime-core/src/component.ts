import { publicInstanceProxy } from './componentPublicInstance';
import { proxyRefs, shadowReadonly } from '../../index';
import { isFunction } from '../../share/index';
import { patch } from './render';
import { ShapeFlags } from './shapeFlags';
import { initProps } from './componentProps';
import { initSlot } from './componentSlots';

let currentInstance = undefined;

export function createComponent(vNode) {
  return {
    vNode,
    type: vNode.type, // 图方便
    render: null,
    setupResult: {},
    proxy: null,
    slots: {},
  };
}

export function setupComponent(instance) {
  instance.proxy = new Proxy({ instance }, publicInstanceProxy);
  initProps(instance);
  initSlot(instance);
  setupStatefulComponent(instance);
  finishComponentSetup(instance);
}

function setupStatefulComponent(instance) {
  if (instance.vNode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    currentInstance = instance;
    handleSetupResult(
      instance,
      instance.type.setup(shadowReadonly(instance.props), {
        emit: instance.proxy.$emit,
      })
    );
    currentInstance = undefined;
  }
  finishComponentSetup(instance);
}

function handleSetupResult(instance, res) {
  if (isFunction(res)) instance.render = res;
  else instance.setupResult = proxyRefs(res);
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  instance.render = instance.render || instance.type.render;
}

export function setupRenderEffect(instance, container) {
  const subTree = instance.render.call(instance.proxy);
  patch(null, subTree, container);
  instance.vNode.el = container;
}

export function getCurrentInstance() {
  return currentInstance;
}
