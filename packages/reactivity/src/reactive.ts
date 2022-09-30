import { proxyConfig, proxyReadonlyConfig } from './basicHandler';

export const enum ReactiveFlag {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
}

export function reactive(origin) {
  return createReactiveObject(origin);
}

export function readonly(origin) {
  return createReactiveObject(origin, true);
}

export function isReactive(value) {
  return value[ReactiveFlag.IS_REACTIVE];
}

export function isReadonly(value) {
  return value[ReactiveFlag.IS_READONLY];
}

function createReactiveObject(origin, readonly = false) {
  if (readonly) return new Proxy(origin, proxyReadonlyConfig);
  return new Proxy(origin, proxyConfig);
}
