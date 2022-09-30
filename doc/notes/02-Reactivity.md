## 实现 Reactivity

### 环境搭建

- 目录结构

    ```bash
    .
    ├── jest.config.js
    ├── package.json
    ├── packages
    │   └── reactivity
    │       ├── index.ts # 入口文件
    │       └── __tests__ # 测试文件
    │           └── index.spec.ts
    ├── README-EN.md
    ├── README.md
    └── tsconfig.json # tsc --init
    ```

- 依赖: `typescript` / `@types/node` / `jest` / `ts-jest` / `@types/jest`

### 构建基本 `effect` 与 `reactive`

**TDD**

TDD(Test-Driven Development), 是敏捷开发中的一项核心实践和技术, 也是一种设计方法论. TDD的原理是在开发功能代码之前, 先编写单元测试用例代码, 测试代码确定需要编写什么产品代码. TDD虽是敏捷方法的核心实践.

**构建基本的 `reactive`**

**需求**: 最简单的 `reactive`, 输入对象并输出对象的代理. 代理对象修改时原对象同步修改

1. 测试
  ```ts
  it('Should different', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin); // 输入对象并返回代理对象
    expect(observed).not.toBe(origin); // observed 和原来的不是一个对象
    observed.foo = 3;
    expect(observed.foo).toBe(3); // 两者同步修改
    expect(origin.foo).toBe(3);
  });
  ```
2. 实现
  只需要为对象配置一个普通代理
  ```ts
  export function reactive(origin) {
    // 就是给一个对象, 返回一个 new Proxy
    return new Proxy(origin, {
      // 语法见 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/get
      get(target, key, receiver) {
        return Reflect.get(target, key, receiver);
      },
      // 语法见 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/set
      set(target, key, value, receiver) {
        return Reflect.set(target, key, value, receiver);
      },
    });
  }
  ```
  唯一的难点就是 `Proxy` 语法
3. 重构: 无

**构建基本的 `effect`**

**需求**:
1. 输入函数, 执行函数, 当函数中被 `[GET]` 的响应式对象发生变化时重新执行函数
2. 返回一个函数 `runner`, 当执行 `runner` 时执行 `effect` 传入的函数

**需求分析**:
1. 为什么是函数中被 `[GET]` 的响应式对象变化时重新执行函数, `[SET]` 不行吗? 不行, 响应式对象被 `[SET]` 后如果执行了函数, 响应式对象会被重新 `[SET]`, 那么上一次 `[SET]` 就没用了. 同时如果函数中其他变量不变只有响应式对象被 `[SET]` 此时执行函数并不会使得函数中变量值发生变化(毕竟变化的响应式变量没有被 `[GET]`), 不会产生 sideEffect.
2. 执行流程: 开始执行函数 -> `[GET]` 响应式对象 -> 结束执行函数 -> 当响应式对象被 `[SET]` -> 执行函数
   可以发现只需要让响应式对象知道当自己变化时哪些 `effect` 需要执行就可以了, 至于 `effect` 知不知道响应式对象是谁那无所谓. 可以在函数执行期间执行依赖收集, 为 `[GET]` 的响应式对象注册 Effect Function, 在响应式对象修改时执行其注册的 Effect Function.

&nbsp;

1. 测试:
  ```ts
  describe('Effect test', () => {
    it('Should sync', () => {
      const origin = { foo: 1 };
      const observed = reactive(origin);
      let bar;
      const runner = effect(() => {
        bar = observed.foo;
      });
      expect(observed.foo).toBe(1); // origin -> observed
      expect(bar).toBe(1); // 立即执行 fn
      observed.foo = 2; // 修改有 [GET] 的响应式对象
      expect(observed.foo).toBe(2); // 响应式对象变化
      expect(origin.foo).toBe(2); // 原对象变化
      expect(bar).toBe(2); // 执行函数
    });

    it('Should return runner', () => {
      const origin = { foo: 1 };
      const observed = reactive(origin);
      console.info = jest.fn(); // 劫持 console.info
      let bar;
      const runner = effect(() => {
        console.info('I RUN');
        bar = observed.foo;
      });
      expect(console.info).toBeCalledTimes(1); // 立即执行 fn, console.info 被调用 1 次
      observed.foo = 2;
      expect(console.info).toBeCalledTimes(2); // 响应式对象发生变化执行 fn, console.info 被调用 2 次
      runner(); // 手动调用 runner, console.info 被调用 3 次
      expect(console.info).toBeCalledTimes(3);
    });
  });
  ```
2. 实现
   利用 `targetMap` 实现响应式对象 -> Key -> Effective Function 的映射. 导出 `track` 与 `trigger` 用于收集与触发依赖
  ```ts
  // target: Object => keyMap:(string=>Set)
  // keyMap: string => Set
  const targetMap: Map<any, Map<string, Set<EffectReactive>>> = new Map();
  let activeEffectFn: any = undefined;

  class EffectReactive {
    runner: (...args: any[]) => any;

    constructor(public fn) {
      this.runner = this.run.bind(this);
      activeEffectFn = this; // 全局注册当前正在收集依赖的 Effect
      this.run(); // 执行函数
      activeEffectFn = undefined; // 取消注册
    }

    run() {
      this.fn();
    }
  }

  export function effect(fn) {
    // 考虑到 effect 上动作很多, 我们将其抽离为 EffectFunction 函数
    return new EffectReactive(fn).runner;
  }

  // 依赖收集函数, 由 `[GET]` 触发, 该函数检查是否有 active 的 Effect, 有就收集依赖
  export function track(target, key) {
    if (!activeEffect) return;
    if (!targetMap.has(target)) targetMap.set(target, new Map());
    const keyMap = targetMap.get(target)!;
    if (!keyMap.has(key)) keyMap.set(key, new Set());
    const dependenceEffect = keyMap.get(key)!;
    dependenceEffect.add(activeEffect);
  }

  // 触发函数, 当响应式对象被 `[SET]` 时尝试触发其收集的所有 Effect
  export function trigger(target, key) {
    const keyMap = targetMap.get(target)!;
    if (!keyMap) return;
    const depSet = keyMap.get(key)!;
    if (!depSet) return;
    [...depSet].forEach((d) => d.run());
  }
  ```
  在 `Proxy` 上同步修改
  ```diff
  export function reactive(origin) {
    return new Proxy(origin, {
      get(target, key, receiver) {
  +     track(target, key);
        return Reflect.get(target, key, receiver);
      },
      set(target, key, value, receiver) {
  +     // 这两行顺序反了就寄了
        const res = Reflect.set(target, key, value, receiver);
  +     trigger(target, key);
        return res;
      },
    });
  }
  ```
3. 重构: 无

### 构建 `effect` 的 `scheduler` 选项 (`watch`)

**需求**: 为 `effect` 传入第二个参数, 参数是一个对象, 其中包含 `scheduler` 函数, 当构造 Effect 时执行传入的第一个函数参数, 当响应式函数变化时执行 `scheduler` 函数. 这与 Vue 3 的 `watch` 类似

**需求分析**: 在构造 Effect 的时候传入配置并在触发的时候判断是否有 `scheduler` 函数

1. 测试

  ```ts
  it('Shound run scheduler', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    let bar;
    effect(
      () => {
        bar = observed.foo;
      },
      { // 传入配置
        scheduler() {
          bar = -observed.foo;
        },
      }
    );
    expect(bar).toBe(1); // 第一次运行 fn 函数
    observed.foo = 2;
    expect(bar).toBe(-2); // 第二次运行 scheduler 函数
  });
  ```

2. 实现
  - 修改 effect 函数, 加入配置项
    ```ts
    export function effect(fn, options = {}) {
      return new EffectReactive(fn, options).runner;
    }
    ```
  - 修改 EffectReactive 的构造函数加载配置项
    ```ts
    class EffectReactive {
      runner: (...args: any[]) => any;
      scheduler: (...args: any[]) => any | undefined;

      constructor(public fn, options: any) {
        this.scheduler = options.scheduler;
        // ...
      }

      // ...
    }
    ```
  - 修改触发函数
    ```ts
    export function trigger(target, key) {
      // ...
      [...depSet].forEach((d) => (d.scheduler ? d.scheduler() : d.run()));
    }
    ```
- 重构: 无

**什么时候尝试抽离函数 / 对象**

1. 函数上有很多动作
2. 函数作用范围广, 语义差

### 构建 `effect` 的 `stop` 与 `onStop` 选项

**需求**:
1. 定义一个外部函数 `stop` 传入 `runner` 让 `runner` 不再被响应式对象
2. `effect` 中加入 `onStop` 配置, 在 `stop` 时调用

**需求分析**: 只需要将 EffectFunction 从响应式对象的依赖表中删除即可. 但是我们之前就没记录有哪些响应式对象将 EffectFunction 作为依赖..., 所以需要开一个 Set 记录这些响应式对象. 同时, 我们不需要记录依赖的对象是什么, 只需要记录 KeyMap 对应的 Set.

1. 测试
  ```ts
  it('Should stop trigger', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    let bar;
    const runner = effect(
      () => {
        bar = observed.foo; // 立即执行
      },
      {
        onStop() {
          if (bar > 0) bar = 0; // 如果首次调用置 0
          bar--;
        },
      }
    );
    expect(bar).toBe(1); // 立即执行
    stop(runner);
    expect(bar).toBe(-1); // 停止后第一次执行为 -1
    observed.foo = 2;
    expect(bar).toBe(-1); // reactive 变化也不调用 fn
    stop(runner)
    expect(bar).toBe(-1); // 反复 stop 不反复执行 onStop
  });
  ```
2. 实现
  修正 EffectReactive
  ```ts
  class EffectReactive {
    runner: { // effect 只返回 runner, stop 函数需要根据 runner 找到 EffectReactive, 所以要在函数上加一个属性记录一下
      (...args: any[]): any;
      effect?: EffectReactive;
    };
    onStop: (...args: any[]) => any | undefined; // stop 回调
    deps: Set<Set<EffectReactive>>; // 收集了这个函数依赖的变量的依赖表集合
    active: boolean; // EffectReactive 是否运行 (stop 时置 0)
    // ...

    constructor(public fn, options: any) {
      this.runner = this.run.bind(this);
      this.runner.effect = this;
      this.onStop = options.onStop;
      this.deps = new Set();
      this.active = true;
      // ...
    }
  }
  ```
  修正依赖收集函数
  ```ts
  export function track(target, key) {
    //
    dependenceEffect.add(activeEffect);
    // 为当前正在依赖收集的 effect 的依赖上加入这个 key 的依赖表
    activeEffect.deps.add(dependenceEffect);
  }
  ```
  实现 `stop` 函数
  ```ts
  export function stop(runner) {
    // 不反复执行
    if (!runner.effect.active) return;
    runner.effect.active = false;
    // 找到所有收集过 effect 的变量, 将 effect 从依赖表中删除
    [...runner.effect.deps].forEach((d) => d.delete(runner.effect));
    // 执行 onStop
    runner.effect.onStop && runner.effect.onStop();
  }
  ```
3. 重构: 无

### 构建 `Proxy` 的 `Readonly`

### 构建其他工具函数
