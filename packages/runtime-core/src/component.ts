import { publicInstanceProxy } from './componentPublicInstance';
import { effect, proxyRefs, shadowReadonly } from '../../reactivity/src';
import { isFunction } from '../../share/index';
import { ShapeFlags } from './shapeFlags';
import { initProps } from './componentProps';
import { initSlot } from './componentSlots';

let currentInstance = undefined;

export function createComponent(vNode, parent) {
  return {
    vNode,
    type: vNode.type, // 图方便
    render: null,
    setupResult: {},
    proxy: null,
    slots: {},
    parent,
    provides: parent ? Object.create(parent.provides) : {},
    subTree: null,
    runner: null,
    next: null,
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
  instance.render = instance.render || instance.type.render || compiler(instance.type.template);
}

export function isSameProps(props1 = {}, props2 = {}) {
  let res = true;
  const props = [...new Set([...Object.keys(props1), ...Object.keys(props2)])];
  props.forEach((k) => props1[k] !== props2[k] && (res = false));
  return res;
}

export function nextTick(e) {
  return Promise.resolve().then(e);
}

function componentUpdateFn(instance, container, anchor, patch) {
  const subTree = instance.render.call(instance.proxy, instance.proxy);
  if (instance.next) {
    instance.vNode = instance.next;
    instance.props = instance.next.props;
    instance.next = null;
  }
  patch(instance.subTree, subTree, container, instance, anchor);
  instance.vNode.el = container;
  instance.subTree = subTree;
}

const jobs: Set<any> = new Set();

function insertJob(instance) {
  jobs.add(instance);
  if (jobs.size <= 1)
    nextTick(() => [...jobs].forEach((d) => jobs.delete(d) && d()));
}

export function setupRenderEffect(instance, container, anchor, patch) {
  instance.runner = effect(
    () => componentUpdateFn(instance, container, anchor, patch),
    {
      scheduler: () => {
        insertJob(instance.runner);
      },
    }
  );
}

export function getCurrentInstance() {
  return currentInstance;
}

let compiler;

export function registerRuntimeCompiler(_compiler){
  compiler = _compiler;
}
