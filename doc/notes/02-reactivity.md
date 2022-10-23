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

### 实现基本 `effect` 与 `reactive`

**TDD**

TDD(Test-Driven Development), 是敏捷开发中的一项核心实践和技术, 也是一种设计方法论. TDD的原理是在开发功能代码之前, 先编写单元测试用例代码, 测试代码确定需要编写什么产品代码. TDD虽是敏捷方法的核心实践.

**实现基本的 `reactive`**

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

**实现基本的 `effect`**

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
3. 重构:
    上面这个代码有点问题, 我们只在构造 EffectFunction 时收集了依赖, 但是并不能收集全
  ```ts
  it('dym track', () => {
    const origin1 = { foo: 1 };
    const observe1 = reactive(origin1);
    const origin2 = { foo: 100 };
    const observe2 = reactive(origin2);
    let cnt = 0,
      ob = 0;
    effect(() => {
      if (cnt == 0) {
        ob = observe1.foo;
      } else {
        ob = observe2.foo;
      }
      cnt++;
    });
    expect(ob).toBe(1);
    observe1.foo = 2;
    expect(ob).toBe(100);
    observe2.foo = 200;
    expect(ob).toBe(200);
  });
  ```
  这个测试就无法通过, 因为 `observe2` 理论上应该在 `observe1.set` 调用 `run` 的时候收集依赖, 所以应该修改构造函数和 `run` 为
  ```ts
  constructor(public fn, options: any) {
    // ...
    this.run();
  }

  run() {
    activeEffect = this;
    const res = this.fn();
    activeEffect = undefined;
    return res;
  }
  ```
  我们知道, 所有的依赖收集都是通过 fn 中对 reactive 的 `[GET]` 实现的, 我可以保证只要执行 `fn` 在其前后都加入了依赖收集的 flag 就可以. 调用 `fn` 只可能发生在
  1. 构造函数
  2. 手动执行 `runner`
  3. reactive 执行 `[SET]` 触发 trigger

  这三部分要执行的都是 `run` 我们可以保证只要执行 `run` 就触发依赖收集

### 实现 `effect` 的 `scheduler` 选项 (`watch`)

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

### 实现 `effect` 的 `stop` 与 `onStop` 选项

**需求**:
1. 定义一个外部函数 `stop`. 传入 `runner` 让 `runner` 不再被响应式对象 trigger
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

    run() {
      // 如果用户手动执行 runner 那么只执行 fn, 不追踪依赖, 放置依赖追踪给已经解除依赖的元素再绑定上依赖
      if (!this.active) return this.fn();
      activeEffect = this;
      const res = this.fn();
      activeEffect = undefined;
      return res;
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


### 实现 `Proxy` 的 `Readonly`

**需求**: `readonly` 与 `reactive` 类似, 不过不支持 `set`

**需求分析**: 一个元素不支持 `set` 也就不可能触发依赖, 所以也没有必要做依赖收集. 所以只需要精简一下 `reactive`. 可以发现, 不同权限的变量只是在构造的时候采用不同的 `[GET]` 与 `[SET]` 策略. 可以将 `[GET]` 与 `[SET]` 抽离出来

1. 测试
  ```ts
  it('Happy path', () => {
    const origin = { foo: 1 };
    const observed = readonly(origin);
    console.warn = jest.fn();
    expect(observed.foo).toBe(1); // 将原始对象包装为只读对象
    expect(console.warn).not.toHaveBeenCalled(); // 最开始不报错
    observed.foo = 2; // 修改, 静默失效, 报 warning
    expect(console.warn).toBeCalledTimes(1); // warning 被调用一次
    expect(observed.foo).toBe(1); // readOnly 静默失效
  });
  ```
2. 实现
    抽离 `[GET]` 与 `[SET]`
  ```ts
  // reactive 的 [GET]
  function get(target, key, receiver) {
    track(target, key);
    return Reflect.get(target, key, receiver);
  }

  // reactive 的 [SET]
  function set(target, key, value, receiver) {
    const res = Reflect.set(target, key, value, receiver);
    trigger(target, key);
    return res;
  }

  function getReadonly(target, key, receiver) {
    return Reflect.get(target, key, receiver);
  }

  function setReadonly(target, key, value, receiver) {
    console.warn('Can not set readonly');
    // 要返回一下设置结果, 如果返回 false 会抛出异常, 而我们只希望静默失效
    return true;
  }

  export const proxyConfig = {
    get,
    set,
  };

  export const proxyReadonlyConfig = {
    get: getReadonly,
    set: setReadonly,
  };
  ```
  抽离对象创建函数
  ```ts
  function createReactiveObject(origin, readonly = false) {
    if (readonly) return new Proxy(origin, proxyReadonlyConfig);
    return new Proxy(origin, proxyConfig);
  }
  ```
  重写 `reactive` 实现 `readonly`
  ```ts
  export function reactive(origin) {
    return createReactiveObject(origin);
  }

  export function readonly(origin) {
    return createReactiveObject(origin, true);
  }
  ```
3. 重构: 上面的就是重构后的代码

### 实现工具函数 `isReadonly`, `isReactive`, `isProxy`

**需求**: 实现工具函数, `isReadonly`, `isReactive`, `isProxy`(前两个函数二选一).

**需求分析**: 只需要在 `[GET]` 上特判即可

1. 测试
  ```ts
  it('isReadonly test', () => {
    const origin = { foo: 1 };
    const observed = readonly(origin);
    expect(isReadonly(observed)).toBe(true);
    expect(isReactive(observed)).toBe(false);
  });

  it('isReactive test', () => {
    const origin = { foo: 1 };
    const observed = reactive(origin);
    expect(isReadonly(observed)).toBe(false);
    expect(isReactive(observed)).toBe(true);
  });

  it('isProxy test', () => {
    const origin = { foo: 1 };
    const observed = readonly(origin);
    expect(isProxy(observed)).toBe(true);
  });
  ```
2. 实现
    构造个枚举
  ```ts
  export const enum ReactiveFlag {
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly',
  }
  ```
  实现函数
  ```ts
  export function isReactive(value) {
    // 要转一下 Boolean 因为非 reactive 对象会返回 undefined
    return !!value[ReactiveFlag.IS_REACTIVE];
  }

  export function isReadonly(value) {
    return !!value[ReactiveFlag.IS_READONLY];
  }

  export function isProxy(value) {
    return isReactive(value) || isReadonly(value);
  }
  ```
  修改 `[GET]`
  ```ts
  const reactiveFlags = {
    [ReactiveFlag.IS_REACTIVE]: true,
    [ReactiveFlag.IS_READONLY]: false,
  };

  const readonlyFlags = {
    [ReactiveFlag.IS_REACTIVE]: false,
    [ReactiveFlag.IS_READONLY]: true,
  };

  function get(target, key, receiver) {
    if (Object.keys(reactiveFlags).find(d=>d===key)) return reactiveFlags[key];
    // ...
  }

  function getReadonly(target, key, receiver) {
    if (Object.keys(readonlyFlags).find(d=>d===key)) return readonlyFlags[key];
    // ...
  }
  ```
3. 重构: 无

### 实现 `reactive` / `readonly` 嵌套

**需求:** 若 `reactive` / `readonly` 内部 value 为对象, 那么该对象也应该是 `reactive` / `readonly`

**需求分析:** 我最开始的想法是在构造 `reactive` 的时候遍历所有属性, 然后为这些属性配置 `reactive`. 然而, 这无法将动态添加的对象转为 `reactive`. 考虑需求, 我们希望让内层对象支持 reactive, 实际上是希望让内层对象也支持依赖收集等 `reactive` 功能, 而这些功能都是在对象被 `[GET]` 的时候被激活的. 也就是说我们最晚可以在首次访问属性的将内层对象转换为 `reactive`.

1. 测试(只写了 `reactive` 的)
  ```ts
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
  ```
2. 实现
    只需要在 `[GET]` 的时候判断属性是否是对象, 如果是对象那么返回包装后的 `reactive`

  ```ts
  function get(target, key, receiver) {
    if (Object.keys(reactiveFlags).find((d) => d === key))
      return reactiveFlags[key];
    const res = Reflect.get(target, key, receiver); // 获取结果
    if (isObject(res)) return reactive(res); // 如果结果是对象, 将其包装为 reactive
    track(target, key);
    return res;
  }

  function getReadonly(target, key, receiver) {
    if (Object.keys(readonlyFlags).find((d) => d === key))
      return readonlyFlags[key];
    const res = Reflect.get(target, key, receiver); // 获取结果
    if (isObject(res)) return readonly(res); // 如果结果是对象, 将其包装为 readonly
    return res;
  }
  ```
  在 `packages/share/index.ts` 中构造工具函数判断输入是否是对象
  ```ts
  export function isObject(v) {
    return v !== null && typeof v === 'object';
  }
  ```
3. 改进: 我们并没有实现内层 reactive 的持久化, 也就是说每次 reactive 的结果是不同的... 实现内层对象持久化
  ```ts
  const reactiveMap = new Map();
  const readonlyMap = new Map();

  export function reactive(origin) {
    if (!reactiveMap.has(origin))
      reactiveMap.set(origin, createReactiveObject(origin));
    return reactiveMap.get(origin)!;
  }

  export function readonly(origin) {
    if (!readonlyMap.has(origin))
      readonlyMap.set(origin, createReactiveObject(origin, true));
    return readonlyMap.get(origin)!;
  }
  ```

**注意**

1. **JS是动态语言, 不要尝试做静态代码分析**: 我们在实现功能的时候应该考虑什么时候完成工作不晚, 不遗漏而不是相静态语言一样想什么时候可以操作数据
2. **实现功能时想想这个功能希望我们对外表现为什么样子**: 思考是什么而不是怎么做, 比如内层 reactive 的第一版代码并没有实现将对象转为 reactive 并附着在对象上, 而是考虑如果一个内层对象是 reactive, 那么我们应该在 `[GET]` 的时候表现的与原始对象不同. 这就启发我们只需要在 `[GET]` 的时候处理数据就可以而不需要在构造对象的时候实现这一功能.

### 实现 `shadowReadonly`

**需求:** `shadowReadonly` 就是只对对象外层实现 readonly, 内部对象不管, 不 Proxy

**需求分析:** 实际上就是不支持嵌套的 readonly

1. 测试
  ```ts
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
  ```
2. 实现
  ```ts
  function getShadowReadonly(target, key, receiver) {
    if (Object.keys(readonlyFlags).find((d) => d === key))
      return readonlyFlags[key];
    // 其实就是不支持嵌套追踪的 readonly. shadowReadonly 的元素一定是非 reactive 对象, 所以直接返回
    return Reflect.get(target, key, receiver);
  }

  export const proxyShadowReadonlyConfig = {
    get: getShadowReadonly,
    set: setReadonly,
  };
  ```
  实现 shadowReadonly
  ```ts
  const shadowReadonlyMap = new Map();

  function createReactiveObject(origin, readonly = false, shadow = false) {
    if (shadow && readonly) return new Proxy(origin, proxyShadowReadonlyConfig);
    if (readonly) return new Proxy(origin, proxyReadonlyConfig);
    return new Proxy(origin, proxyConfig);
  }

  export function shadowReadonly(origin) {
    if (!shadowReadonlyMap.has(origin))
      shadowReadonlyMap.set(origin, createReactiveObject(origin, true, true));
    return shadowReadonlyMap.get(origin)!;
  }
  ```
3. 重构


### 实现 `ref`

**需求**: 实现 `ref`
  - 如果 `ref(value)` 输入的是不是对象, 那么可以
    - 通过 `.value` 访问值
    - 通过 `.value` 更新值, 如果赋值时新值与旧值一样则什么都不做
    - 支持类似 `reactive` 的依赖收集与触发
  - 如果 `ref(value)` 输入的是对象, 那么可以
    - 在上面的基础上对要求对象支持 `reactive`

**需求分析**:

  - 我最开始想到的是 `ref = (value) => reactive({value})` 但是如果只是这么简单实现, 那么 `ref` 的非 `value` 属性也将变为 `reactive`. 同时可以预见这样实现的 `ref` 性能不及标准 `ref`.
  - `ref` 的特点是**外层有且只有** `value` 一个 `key`, 这意味我们在实现时
    - 不用使用全局 `targetMap` (只有一个depSet)
    - 不用像 `reactive` 一样实现一个 Proxy, 可以只实现一个 `[GET]` & `[SET]`.
  - 考虑到 `ref` 的**输入可能是对象或非对象**
    - 我们能不使用全局的 `targetMap`, 否则两个值相同的 `ref` 会被判定为同一个 `keyMap`
    - 若输入为对象, 在对比赋值时新值与旧值一样不能简单的比较 `_value === newValue`. 若输入为对象, 那么 `reactive(obj) !== obj`. 我们还需要保存输入的原始值

1. 测试
    `ref` 非对象时
  ```ts
  it('should be reactive', () => {
    const a = ref(1);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value;
    });
    expect(calls).toBe(1); // 构造 EffectFunction 执行一次
    expect(dummy).toBe(1);
    a.value = 2; // ref 也支持依赖收集与触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    a.value = 2; // 同值不触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
  });
  ```
  `ref` 对象时要把内层对象变为 `reactive`, 对象也可以变为非对象
  ```ts
  it('should convert to reactive', () => {
    const origin = { foo: 1 };
    const a = ref(origin);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value.foo ? a.value.foo : a.value;
    });
    expect(calls).toBe(1); // 构造 EffectFunction 执行一次
    expect(dummy).toBe(1);
    a.value.foo = 2; // ref 也支持依赖收集与触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    a.value = origin; // 同值不触发
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    a.value = { foo: 1 }; // 同值不触发
    expect(calls).toBe(3);
    expect(dummy).toBe(1);
    a.value = 5; // 变为非对象
    expect(calls).toBe(4);
    expect(dummy).toBe(5);
  });
  ```

2. 实现

  ```ts
  // 与 reactive 直接返回一个 Proxy 不同, 我们只有 value 一个属性, 所以要手动实现一个对象
  class RefImpl {
    // 这里我们不使用全局的 targetMap 原因是
    //   - 我们这里的 Key 可以不是对象, 两个值相同的 ref 会被判定为同一个 key
    //   - 只存在一个 Key: value, 所以没有必要使用两个 Map, 只需要一个 Set 就可以存储所有的 EffectReactive
    private deps: Set<EffectReactive>;
    private _value;
    private rawValue;
    constructor(value) {
      this.deps = new Set();
      this._value = isObject(value) ? reactive(value) : value;
      this.rawValue = value;
    }

    // 只需要 value 的 [SET] [GET] 就可以实现
    get value() {
      trackEffect(this.deps); // 依赖追踪
      return this._value;
    }

    set value(newValue) {
      // 重复赋值不触发, 考虑两种情况
      //   - this._value 不是 Object, 直接比较
      //   - this._value 是 Object, 此时 this._value 是一个 reactive, reactive(obj) !== obj, 必须使用原始值比较
      if (this.rawValue === newValue) return;
      this.rawValue = newValue;
      this._value = isObject(newValue) ? reactive(newValue) : newValue;
      triggerEffect(this.deps); // 触发依赖
    }
  }

  export function ref(value) {
    return new RefImpl(value);
  }
  ```
  在这里, `trackEffect` 与 `triggerEffect` 相当于不需要查 `Set` 的 `track` 与 `trigger`(因为只有一个 `Set`). 我们可以将原来的 `track` 与 `trigger` 拆开

  ```ts
  export function track(target, key) {
    if (!activeEffect) return;
    if (!targetMap.has(target)) targetMap.set(target, new Map());
    const keyMap = targetMap.get(target)!;
    if (!keyMap.has(key)) keyMap.set(key, new Set());
    // 抽成一个函数
    trackEffect(keyMap.get(key)!);
  }

  export function trackEffect(dependenceEffect) {
    // 本来只需要在 track 上判断 activeEffect 但是这个函数可能被 track 或者 RefImpl 调用, 所以还需要在判断一次
    if (!activeEffect) return;
    dependenceEffect.add(activeEffect);
    activeEffect.deps.add(dependenceEffect);
  }

  export function trigger(target, key) {
    const keyMap = targetMap.get(target)!;
    if (!keyMap) return;
    const depSet = keyMap.get(key)!;
    if (!depSet) return;
    // 抽成一个函数
    triggerEffect(depSet);
  }

  export function triggerEffect(depSet) {
    [...depSet].forEach((d) => (d.scheduler ? d.scheduler() : d.run()));
  }
  ```

### 实现工具函数 `isRef` & `unRef` & `proxyRefs`

**需求**:
  - `isRef`: 判断输入是不是 `ref`
  - `unRef`: 返回 `ref` 的 `value`
  - `proxyRefs`: 模拟 Vue3 的 setup 函数, 通过该函数返回的对象中的 `ref` 在模板字符串中无需 `.value` 即可访问与赋值. 简单来说就是输入对象, 在访问对象中浅层 `ref` 的 `Key` 时无需 `.value` 即可访问

**需求分析**:
  - `isRef`: 加一个 flag 即可
  - `unRef`: 判断是不是 `ref`, 是就返回 `ref.value`
  - `proxyRefs`: 构造一个代理, 在读写是判断读写目标是不是 `ref` 如果是就返回 `ref.value`. 同时, 在 `[SET]` 时, 如果新旧值都是 `ref` 那么直接替换掉旧 `ref`

1. 测试
  ```ts
  it('isRef', () => {
    const origin1 = 1;
    const origin2 = { foo: 1 };
    const observed1 = ref(origin1);
    const observed2 = ref(origin2);
    expect(isRef(origin1)).toBe(false);
    expect(isRef(origin2)).toBe(false);
    expect(isRef(observed1)).toBe(true);
    expect(isRef(observed2)).toBe(true);
  });

  it('unRef', () => {
    const origin1 = 1;
    const origin2 = { foo: 1 };
    const observed1 = ref(origin1);
    const observed2 = ref(origin2);
    expect(unRef(observed1)).toBe(origin1);
    expect(unRef(observed2)).not.toBe(origin2);
    expect(unRef(observed2)).toStrictEqual(origin2);
    expect(unRef(observed2)).toBe(reactive(origin2));
  });

  it('proxyRefs', () => {
    const user = {
      sampleRef: ref(10),
      sampleStr: 'demo',
    };
    const proxyUser = proxyRefs(user);
    expect(user.sampleRef.value).toBe(10);
    expect(proxyUser.sampleRef).toBe(10);
    expect(proxyUser.sampleStr).toBe('demo');

    (proxyUser as any).sampleRef = 20;
    expect(proxyUser.sampleRef).toBe(20);
    expect(user.sampleRef.value).toBe(20);

    proxyUser.sampleRef = ref(10);
    expect(proxyUser.sampleRef).toBe(10);
    expect(user.sampleRef.value).toBe(10);
  });
  ```

2. 实现

  打flag
  ```ts
  class RefImpl {
    public __v_isRef = true;
  }
  ```
  实现 `isRef` 与 `unRef`
  ```ts
  export function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
  }

  export function isRef(value) {
    return !!value?.__v_isRef;
  }
  ```
  实现 `proxyRef`
  ```ts
  export function proxyRefs(origin) {
    return new Proxy(origin, proxyProxyRefConfig);
  }

  function getProxyRef(target, key, receiver) {
    // 不用这么麻烦
    // if (isRef(target[key])) return target[key].value;
    // return target[key];
    return unRef(target[key]);
  }

  function setProxyRef(target, key, value, receiver) {
    // 只特判 ref <- 普通值
    if (isRef(target[key]) && !isRef(value)) return (target[key].value = value);
    return Reflect.set(target, key, value, receiver);
  }

  export const proxyProxyRefConfig = {
    get: getProxyRef,
    set: setProxyRef,
  };
  ```
3. 重构: 无

### 实现 `computed`

**需求:**
1. 输入一个函数, 返回一个对象, 可以通过 `.value` 获取函数返回值, 当函数内部 `reactive` 变化时, 返回值也要变化.
2. 支持 Lazy, 即:
   1. 在 `computed` 内部 `reactive` 变化时不触发 `computed` 传入函数
   2. 在 `[GET]` 时才触发 `computed` 传入函数
   3. 若内部 `reactive` 不变, 重复触发 `[GET]` 不重复触发传入函数
3. 返回值也是一个 `reactive` 对象, 即 `.value` 变化时要触发依赖

**需求分析:**



1. 测试
  ```ts
  it('should reactive', () => {
    let cnt = 0;
    const observed = reactive({ foo: 1 });
    const bar = computed(() => {
      cnt++;
      return observed.foo + 1;
    });
    expect(cnt).toBe(0); // Lazy
    expect(bar.value).toBe(2);
    expect(cnt).toBe(1);
    observed.foo = 2;
    expect(cnt).toBe(1); // Lazy
    expect(bar.value).toBe(3);
    expect(cnt).toBe(2);
    expect(bar.value).toBe(3);
    expect(bar.value).toBe(3); // Lazy
    expect(cnt).toBe(2);
  });

  // 返回值也可以收集依赖
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
  ```
2. 实现

  - 构造一个 `old`, 当内部 reactive 变化时修改, 如果内部不变就直接使用原 `_value`
  - 类似构造 `ref` 的 `dep` 收集 `.value` 的依赖
  - 我们希望在第一次 `[GET]` 的时候收集依赖, 这可以使用 `EffectReactive` 实现, 但是为了实现 Lazy 我们又不希望每次内部 `reactive` 变化都触发依赖. 我们可以采用 `scheduler` 解决, 每次内部 `reactive` 变化时候打下标记(`old`), 并通知 `computed` 要触发依赖了. 如果 `computed` 没有依赖那这次就 Lazy 过去了, 如果有那在触发依赖时其他函数会调用计算属性的 `[GET]` 此时完成刷新

  ```ts
  import {
    effect,
    EffectReactive,
    trackEffect,
    triggerEffect,
  } from './effect';

  class ComputedImpl {
    old: boolean;
    fst: boolean;
    _value: any;
    dep: Set<EffectReactive>;
    effect!: EffectReactive;

    constructor(public fn) {
      this.old = false;
      this.fst = true;
      this.dep = new Set();
    }

    get value() {
      trackEffect(this.dep);
      // 为啥人家的代码没 fst 呢? 因为人家的 EffectReactive 每在构造函数的时候 run. 人家可以在构造函数里面注册这个 effect
      if (this.fst) {
        this.fst = false;
        this.effect = new EffectReactive(() => (this._value = this.fn()), {
          scheduler: () => {
            this.old = true;
            triggerEffect(this.dep);
          },
        });
      }
      if (this.old) {
        this.old = false;
        this._value = this.effect.runner();
        triggerEffect(this.dep);
      }
      return this._value;
    }

    set value(_) {
      console.warn('Can not set computed value');
    }
  }

  export function computed(origin) {
    return new ComputedImpl(origin);
  }
  ```
- 重构: 考虑修改 `EffectReactive` 构造函数

### 小结

- 实现 `Reactivity` 的核心就是一个 `Proxy`. 通过修改 `[GET]` & `[SET]` 实现不同权限
- 时刻谨记 JavaScript 是动态语言, 对象上的属性随时在变化, 不要想在某一个对对象上的属性做特殊处理, 很容易遗漏, 我们可以想想什么时候外部需要我们特殊处理的特性, 在出口处"围追堵截"
- 注意我们应该在什么时候抽象函数
  - 语义上可以抽象时候
  - 功能重复时
- 当函数功能部分重叠时要敢于拆分函数
- `ref` 相当于是一个整体功能弱化的 `reactive`, 所以我们没有使用全局 `targetMap`
- `computed` 的实现比较巧妙, 运用了一个 effect 的配置项, 我们在实现工具函数的时候也可以想想是否可以通过配置项将两个功能类似的类合并成一个类.
