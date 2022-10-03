import { effect } from '../src/effect';
import { isRef, unRef, ref } from '../src/ref';
import { reactive } from '../src/reactive';

describe('ref', () => {
  it('should be reactive', () => {
    const a = ref(1);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value;
    });
    expect(calls).toBe(1); // 构造 EffectFunction 执行一次
    expect(dummy).toBe(1);
    a.value = 2; // ref 也支持依赖收集与触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    a.value = 2; // 同值不触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
  });

  it('should convert to reactive', () => {
    const origin = { foo: 1 };
    const a = ref(origin);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value.foo ? a.value.foo : a.value;
    });
    expect(calls).toBe(1); // 构造 EffectFunction 执行一次
    expect(dummy).toBe(1);
    a.value.foo = 2; // ref 也支持依赖收集与触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    a.value = origin; // 同值不触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    a.value = { foo: 1 }; // 同值不触发
    expect(calls).toBe(3);
    expect(dummy).toBe(1);
    a.value = 5; // 变为非对象
    expect(calls).toBe(4);
    expect(dummy).toBe(5);
  });

  it('isRef', () => {
    const origin1 = 1;
    const origin2 = { foo: 1 };
    const observed1 = ref(origin1);
    const observed2 = ref(origin2);
    expect(isRef(origin1)).toBe(false);
    expect(isRef(origin2)).toBe(false);
    expect(isRef(observed1)).toBe(true);
    expect(isRef(observed2)).toBe(true);
  });

  it('unRef', () => {
    const origin1 = 1;
    const origin2 = { foo: 1 };
    const observed1 = ref(origin1);
    const observed2 = ref(origin2);
    expect(unRef(observed1)).toBe(origin1);
    expect(unRef(observed2)).not.toBe(origin2);
    expect(unRef(observed2)).toStrictEqual(origin2);
    expect(unRef(observed2)).toBe(reactive(origin2));
  });
});
