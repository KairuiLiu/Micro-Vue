import { isObject } from '../../share';
import { track, trigger } from './effect';
import { reactive, ReactiveFlag, readonly } from './reactive';

const reactiveFlags = {
  [ReactiveFlag.IS_REACTIVE]: true,
  [ReactiveFlag.IS_READONLY]: false,
};

const readonlyFlags = {
  [ReactiveFlag.IS_REACTIVE]: false,
  [ReactiveFlag.IS_READONLY]: true,
};

function get(target, key, receiver) {
  if (Object.keys(reactiveFlags).find((d) => d === key))
    return reactiveFlags[key];
  const res = Reflect.get(target, key, receiver);
  if (isObject(res)) return reactive(res);
  track(target, key);
  return res;
}

function set(target, key, value, receiver) {
  const res = Reflect.set(target, key, value, receiver);
  trigger(target, key);
  return res;
}

function getReadonly(target, key, receiver) {
  if (Object.keys(readonlyFlags).find((d) => d === key))
    return readonlyFlags[key];
  const res = Reflect.get(target, key, receiver);
  if (isObject(res)) return readonly(res);
  return res;
}

function getShadowReadonly(target, key, receiver) {
  if (Object.keys(readonlyFlags).find((d) => d === key))
    return readonlyFlags[key];
  // 其实就是不支持嵌套追踪的 readonly
  return Reflect.get(target, key, receiver);
}

function setReadonly(target, key, value, receiver) {
  console.warn('Can not set readonly');
  // 要返回一下设置结果, 如果返回 false 会抛出异常, 而我们只希望静默失效
  return true;
}

export const proxyConfig = {
  get,
  set,
};

export const proxyReadonlyConfig = {
  get: getReadonly,
  set: setReadonly,
};

export const proxyShadowReadonlyConfig = {
  get: getShadowReadonly,
  set: setReadonly,
};
