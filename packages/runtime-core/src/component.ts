import { publicInstanceProxy } from './componentPublicInstance';
import { proxyRefs, shadowReadonly } from '../../index';
import { isFunction } from '../../share/index';
import { patch } from './render';
import { ShapeFlags } from './shapeFlags';
import { initProps } from './componentProps';
import { initSlot } from './componentSlots';

export function createComponent(vNode) {
  return {
    vNode,
    type: vNode.type, // 图方便
    render: null,
    setupResult: {},
    proxy: null,
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
  if (instance.vNode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT)
    handleSetupResult(
      instance,
      instance.type.setup.call(instance, shadowReadonly(instance.props), {
        emit: instance.proxy.$emit,
      })
    );
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
