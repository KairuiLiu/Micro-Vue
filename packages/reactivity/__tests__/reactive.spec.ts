import { reactive } from '../src/reactive';

describe('Reactive test', () => {
  it('Should different', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    expect(observed).not.toBe(origin);
    observed.foo = 3;
    expect(observed.foo).toBe(3);
    expect(origin.foo).toBe(3);
  });
});
