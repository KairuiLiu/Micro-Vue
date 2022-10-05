import { reactive, computed, effect } from '../src';

describe('Computed test', () => {
  it('should reactive', () => {
    let cnt = 0;
    const observed = reactive({ foo: 1 });
    const bar = computed(() => {
      cnt++;
      return observed.foo + 1;
    });
    expect(cnt).toBe(0);
    expect(bar.value).toBe(2);
    expect(cnt).toBe(1);
    observed.foo = 2;
    expect(cnt).toBe(1);
    expect(bar.value).toBe(3);
    expect(cnt).toBe(2);
    expect(bar.value).toBe(3);
    expect(bar.value).toBe(3);
    expect(cnt).toBe(2);
  });

  it('should trigger effect', () => {
    const value = reactive({});
    const cValue = computed(() => value.foo);
    let dummy;
    effect(() => {
      dummy = cValue.value;
    });
    expect(dummy).toBe(undefined);
    value.foo = 1;
    expect(dummy).toBe(1);
  });
});
