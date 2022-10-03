import { isReactive, isReadonly, readonly, isProxy } from '../src/reactive';

describe('Readonly test', () => {
  it('Happy path', () => {
    const origin = { foo: 1 };
    const observed = readonly(origin);
    console.warn = jest.fn();
    expect(observed.foo).toBe(1);
    expect(console.warn).not.toHaveBeenCalled();
    observed.foo = 2;
    expect(console.warn).toBeCalledTimes(1);
    expect(observed.foo).toBe(1);
  });

  it('isReadonly test', () => {
    const origin = { foo: 1 };
    const observed = readonly(origin);
    expect(isReadonly(observed)).toBe(true);
    expect(isReactive(observed)).toBe(false);
    expect(isReactive(origin)).toBe(false);
    expect(isReactive(origin)).toBe(false);
  });

  it('isProxy test', () => {
    const origin = { foo: 1 };
    const observed = readonly(origin);
    expect(isProxy(observed)).toBe(true);
  });

  it('Should nested track', () => {
    const origin = {
      foo: { a: 1 },
      bar: [{ b: 2 }],
    };
    const observe = readonly(origin);
    expect(isReadonly(observe)).toBe(true);
    expect(isReadonly(observe.foo)).toBe(true);
    expect(isReadonly(observe.bar)).toBe(true);
    expect(isReadonly(observe.bar[0])).toBe(true);
  });
});
