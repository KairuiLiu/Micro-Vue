import { reactive } from '../src/reactive';
import { computed } from '../src/computed';

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
});
