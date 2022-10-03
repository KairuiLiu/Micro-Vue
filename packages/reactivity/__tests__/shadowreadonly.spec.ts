import { shadowReadonly, isProxy } from '../src/reactive';

describe('Readonly test', () => {
  it('Happy path', () => {
    const origin = { foo: { bar: 2 } };
    const observed = shadowReadonly(origin);
    console.warn = jest.fn();
    expect(console.warn).not.toHaveBeenCalled();
    observed.foo = 0; // 外层禁止修改
    expect(console.warn).toBeCalledTimes(1);
    expect(observed.foo.bar).toBe(2);
    observed.foo.bar = 0; // 内部不管
    expect(observed.foo.bar).toBe(0);
    expect(console.warn).toBeCalledTimes(1);
    expect(isProxy(observed.foo)).toBe(false);
  });
});
