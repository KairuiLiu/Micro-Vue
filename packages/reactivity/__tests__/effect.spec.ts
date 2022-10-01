import { effect, stop } from '../src/effect';
import { reactive } from '../src/reactive';

describe('Effect test', () => {
  it('Should sync', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    let bar;
    const runner = effect(() => {
      bar = observed.foo;
    });
    expect(observed.foo).toBe(1);
    expect(bar).toBe(1);
    observed.foo = 2;
    expect(observed.foo).toBe(2);
    expect(origin.foo).toBe(2);
    expect(bar).toBe(2);
  });

  it('Should return runner', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    console.info = jest.fn();
    let bar;
    const runner = effect(() => {
      console.info('I RUN');
      bar = observed.foo;
    });
    expect(console.info).toBeCalledTimes(1);
    observed.foo = 2;
    expect(console.info).toBeCalledTimes(2);
    runner();
    expect(console.info).toBeCalledTimes(3);
  });

  it('Should run scheduler', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    let bar;
    effect(
      () => {
        bar = observed.foo;
      },
      {
        scheduler() {
          bar = -observed.foo;
        },
      }
    );
    expect(bar).toBe(1);
    observed.foo = 2;
    expect(bar).toBe(-2);
  });

  it('Should stop trigger', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    let bar;
    const runner = effect(
      () => {
        bar = observed.foo;
      },
      {
        onStop() {
          if (bar > 0) bar = 0;
          bar--;
        },
      }
    );
    expect(bar).toBe(1);
    stop(runner);
    expect(bar).toBe(-1);
    observed.foo = 2;
    expect(bar).toBe(-1);
    stop(runner);
    observed.foo++;
    expect(bar).toBe(-1);
    runner();
    expect(bar).toBe(3);
  });

  it('dym track', () => {
    const origin1 = { foo: 1 };
    const observe1 = reactive(origin1);
    const origin2 = { foo: 100 };
    const observe2 = reactive(origin2);
    let cnt = 0,
      ob = 0;
    const runner = effect(() => {
      if (cnt == 0) {
        ob = observe1.foo;
      } else {
        ob = observe2.foo;
      }
      cnt++;
    });
    expect(ob).toBe(1);
    runner();
    observe1.foo = 2;
    expect(ob).toBe(100);
    observe2.foo = 200;
    expect(ob).toBe(200);
  });
});
