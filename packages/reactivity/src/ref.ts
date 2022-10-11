import { proxyProxyRefConfig } from './basicHandler';
import { isObject } from '../../share';
import { EffectReactive, trackEffect, triggerEffect } from './effect';
import { reactive } from './reactive';

class RefImpl {
  // 这里我们不使用全局的 targetMap 原因是
  //   - 我们这里的 Key 可以不是对象, 两个值相同的 ref 会被判定为同一个 key
  //   - 只存在一个 Key: value, 所以没有必要使用两个 Map, 只需要一个 Set 就可以存储所有的 EffectReactive
  private deps: Set<EffectReactive>;
  private _value;
  private rawValue;
  public __v_isRef = true;
  constructor(value) {
    this.deps = new Set();
    this._value = isObject(value) ? reactive(value) : value;
    this.rawValue = value;
  }

  // 只需要 value 的 [SET] [GET] 就可以实现
  get value() {
    trackEffect(this.deps); // 依赖追踪
    return this._value;
  }

  set value(newValue) {
    // 重复赋值不触发, 考虑两种情况
    //   - this._value 不是 Object, 直接比较
    //   - this._value 是 Object, 此时 this._value 是一个 reactive, reactive(obj) !== obj, 必须使用原始值比较
    if (this.rawValue === newValue) return;
    this.rawValue = newValue;
    this._value = isObject(newValue) ? reactive(newValue) : newValue;
    triggerEffect(this.deps); // 触发依赖
  }
}

export function ref(value) {
  return new RefImpl(value);
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function isRef(value) {
  return !!value?.__v_isRef;
}

export function proxyRefs(origin = {}) {
  return new Proxy(origin, proxyProxyRefConfig);
}
