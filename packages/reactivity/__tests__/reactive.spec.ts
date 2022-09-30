import { reactive, isReactive, isReadonly } from '../src/reactive';

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
  });
});
