import { isReactive, isReadonly, readonly } from '../src/reactive';

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
  });
});
