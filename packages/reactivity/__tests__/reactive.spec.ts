import { reactive, isReactive, isReadonly, isProxy } from '../src/reactive';

describe('Reactive test', () => {
  it('Should different', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    expect(observed).not.toBe(origin);
    observed.foo = 3;
    expect(observed.foo).toBe(3);
    expect(origin.foo).toBe(3);
  });

  it('isReactive test', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    expect(isReadonly(observed)).toBe(false);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(origin)).toBe(false);
    expect(isReactive(origin)).toBe(false);
  });

  it('isProxy test', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    expect(isProxy(observed)).toBe(true);
  });

  it('Should nested track', () => {
    const origin = {
      foo: { a: 1 },
      bar: [{ b: 2 }],
    };
    const observe = reactive(origin);
    expect(isReactive(observe)).toBe(true);
    expect(isReactive(observe.foo)).toBe(true);
    expect(isReactive(observe.bar)).toBe(true);
    expect(isReactive(observe.bar[0])).toBe(true);
  });

  it('Should nested track cache', () => {
    const origin = {
      foo: { a: 1 },
      bar: [{ b: 2 }],
    };
    const observe = reactive(origin);
    expect(observe.foo).toBe(observe.foo);
  });
});
