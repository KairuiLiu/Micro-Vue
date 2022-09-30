import { track, trigger } from './effect';

export function reactive(origin) {
  return new Proxy(origin, {
    // 语法见 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get
    get(target, key, receiver) {
      // 为啥 get 要收集, set 要trim
      track(target, key);
      return Reflect.get(target, key, receiver);
    },
    // 语法见 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/set
    set(target, key, value, receiver) {
      // 这两个顺序反了就寄了
      const res = Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return res;
    },
  });
}
