import {
  proxyConfig,
  proxyReadonlyConfig,
  proxyShadowReadonlyConfig,
} from './basicHandler';
const reactiveMap = new Map();
const readonlyMap = new Map();
const shadowReadonlyMap = new Map();

export const enum ReactiveFlag {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
}

export function reactive(origin) {
  if (!reactiveMap.has(origin))
    reactiveMap.set(origin, createReactiveObject(origin));
  return reactiveMap.get(origin)!;
}

export function readonly(origin) {
  if (!readonlyMap.has(origin))
    readonlyMap.set(origin, createReactiveObject(origin, true));
  return readonlyMap.get(origin)!;
}

export function shadowReadonly(origin) {
  if (!shadowReadonlyMap.has(origin))
    shadowReadonlyMap.set(origin, createReactiveObject(origin, true, true));
  return shadowReadonlyMap.get(origin)!;
}

export function isReactive(value) {
  return !!value[ReactiveFlag.IS_REACTIVE];
}

export function isReadonly(value) {
  return !!value[ReactiveFlag.IS_READONLY];
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}

function createReactiveObject(origin, readonly = false, shadow = false) {
  if (shadow && readonly) return new Proxy(origin, proxyShadowReadonlyConfig);
  if (readonly) return new Proxy(origin, proxyReadonlyConfig);
  return new Proxy(origin, proxyConfig);
}
