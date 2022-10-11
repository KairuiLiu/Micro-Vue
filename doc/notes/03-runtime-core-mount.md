## 实现 runtime-core 的 mount 部分

### 搭建环境

runtime-core 直接参与页面构建, 我们需要利用打包工具打包代码. 在打包网页时一般使用 webpack, 而在打包模块时一般使用 rollup.js. 安装 rollup 及其 TypeScript 依赖

```bash
pnpm i -D rollup @rollup/plugin-typescript tslib rollup-plugin-sourcemaps
#         ^ 本体  ^ typescript 支持          ^ TS 支持依赖
```

配置 rollup

- 创建 `/package/index.ts` 作为整个项目的出口
- 创建 rollup 配置文件 `/package/rollup.config.js`
  ```js
  import typescript from '@rollup/plugin-typescript';
  import sourceMaps from 'rollup-plugin-sourcemaps';

  export default {
    input: './packages/index.ts', // 入口文件
    output: [
      // 2种输出格式
      {
        format: 'cjs', // 输出格式
        file: './lib/micro-vue.cjs.js', // 输出路径
        sourcemap: true,
      },
      {
        format: 'es',
        file: './lib/micro-vue.esm.js',
        sourcemap: true,
      },
    ],
    plugins: [typescript(), sourceMaps()],
  };
  ```
- 执行 `rollup -c ./rollup.config.js` 打包
- 根据提示将 `tsconfig.json` 中 `"module": "commonjs"` 改为 `"module": "ESNext"`
- 在 `package.json` 中注册包的入口文件, `main` 对应 commonjs 包, `module` 对应 ESM 包
  ```json
  "main": "lib/micro-vue.cjs.js",
  "module": "lib/micro-vue.esm.js",
  ```

### 构造测试用例

我们构造一个简单的 Vue demo 并尝试构建 vue-runtime 主流程使其可以将我们的 demo 渲染出来, Vue 项目一般包含如下文件

- `index.html`: 至少包含一个挂载点
- `index.js`: 引入根组件, 将根组件挂载到挂载点
- `App.vue`: 定义根组件

SFC 需要 vue-loader 编译才能实现. 而 vue-loader 的作用是将 SFC 处理为 `render` 函数, 在此我们只能先将 `App.vue` 处理为 vue-loader 编译后函数. 定义

- `index.html`: 只构造一个挂载点并引入 JS
  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>micro-vue runtime-core</title>
    </head>
    <body>
      <div id="app"></div>
      <script src="./index.js" type="model"></script>
    </body>
  </html>
  ```
- `index.js`: 先不管有没有这些函数, 平时咋写就咋写
  ```js
  import { createApp } from '../../lib/micro-vue.esm';
  import App from './App';

  createApp(App).mount('#app');
  ```
- `App.js`:
  ```js
  import { h } from '../../lib/micro-vue.esm.js';

  export default {
    setup() {},
    render() {
      return h('div', { class: 'title' }, [
        h('span', {}, "111"),
        h('span', {}, "222"),
      ]);
    },
  };
  ```

`App.js` 默认导出了一个配置对象, 该对象应该包含 SFC 中导出的 `setup` 与 vue-loader 编译得到的 `render` 函数. 其中

- `setup` 函数的返回值可以是对象, 也可以是渲染函数
- 在解析 SFC 文件时, 如果用户手动通过 `setup` 返回了渲染函数那么 vue-loader 就不编译模板, 如果没有返回则编译模板并构造渲染函数 `render`. `render` 函数描述了**这个组件里面**应该如何渲染
- `render` 中的 `h` 用于表述一个组件/元素, 语法为: `h(type, attr, children)`.
  - `type`: 描述元素或组件类型, 如果希望将目标渲染为 Element 那么 `type` 为标签名, 如果希望渲染为组件那么 `type` 为 组件配置对象
  - `attr`: 描述元素或组件上的属性(例如: `class`)
  - `children`:
    - 如果待渲染的是一个元素, 如果这个元素下面没有子元素或者子组件, 那么 `children` 为元素的 `innerText`, 如果下面还有子组件或子元素, 那么 `children` 应该是一个 `h` 函数返回值数组
    - **如果待渲染的是一个组件, `children` 属性将传入插槽而不是子元素, 这一点与模板设计是类似的**
      ```html
      <template>
        <div>
          <span>111</span>
          <span>222</span>
        </div>
      </template>
      ```
      的 `h` 函数
      ```js
      h('div', {}, [h('span', {}, '111'), h('span', {}, '222')])
      ```
      对于组件
      ```html
      <template>
        <Comp>
          <span>111</span>
          <span>222</span>
        </Comp>
      </template>
      ```
      的 `h` 函数
      ```js
      h(Comp, {}, [h('span', {}, '111'), h('span', {}, '222')])
      ```
      设计上是统一的.

上面这个例子描述了这样一个组件:

- 首先默认导出的是一个组件配置对象

- 这个组件被编译为了 `render` 函数, `render` 函数返回了一个 `h`.

  - **诶, 我要渲染一个组件, 为啥 `h` 的 `type` 是 `div` 而不是配置对象呢?** 一定注意, `render` 描述的是组件**里面**应该如何渲染, 这里的 `h` 是说, App 组件里面有一个 `div`, 如果我们这里写的是 `h(demoObj, {}, '111')` 这个意思是 App 组件里面有一个 demo 组件, 这个 demo 组件里面啥也没有, 他的 innerText 是 '111'

  - **诶, 那我们在哪里定义了 App 的 h 函数呢?** 我们没有用 `h` 函数定义 App (是利用 createApp 定义的) 至于这俩函数有什么联系后面再说

  - **诶, 那难道组件内部只能有一个一级子元素?** 是的, 在 Vue2 中我们就规定 `template` 下最多只能有一个一级子元素, 在 Vue3 中我们用语法糖解除了这个限制.
  你可能会想到对于 App 下的某个组件(如 demo), 我们通过这样的方式让这个组件有多个子元素

    ```js
    // App.js 的 render
    render() {
        return h(demoConfig, { class: 'title' }, [
            h('span', {}, "111"),
            h('span', {}, "222"),
        ]);
    }
    ```

    这是错的, 数组将作为插槽传入 demo 组件, 组件的子元素是在组件自己的 `render` 中定义的.

    ```js

    demoConfig = {
      render(){
        return h('div', {}, [
            h('span', {}, "111"),
            h('span', {}, "222"),
        ])
      }
    }

    // App.js 的 render
    render() {
        return h(demoConfig, { class: 'title' });
    }
    ```

    其实我们的疑问就是到底是他妈的谁构造了根组件 `App` 的 `h` 函数

- App 是一个组件, 这个组件内部有一个 `div` 这个 `div` 又有两个子`span`, 内容分别是 `111` 和 `222`


### 构造主流程

- `vue-runtime` 的主流程

  ```mermaid
  graph TB
  根组件配置对象 --createApp--> 一种特殊的vNode --挂载根组件--> 根组件特殊使命结束,成为普通的组件 --渲染--> 进入patch函数 --目标是Element--> Element处理函数 --新Element--> 挂载Element --没有子Element --> 写入innerText
  挂载Element --有子Element--> 每个子Element --渲染--> 进入patch函数
  Element处理函数 --老Element--> 更新Element
  进入patch函数 --目标是组件--> 组件处理函数 --新组件--> 新建组件 --> 应用配置 --> 运行render --> 每个子组件 --渲染--> 进入patch函数
  组件处理函数 --老组件--> 更新组件
  ```

- 可以看到 `createApp` 输入配置对象, `h` 函数输入 `type`(可以是string可以是配置对象), `props`, `children`. 虽然两者输入不同, 但是他们都返回了 vNode. `createApp` 的输入可以看作是没有 `props`, `children` 的 `h` 函数的组件输入, 而 `createApp` 的输出可以看作是具有特殊功能的 `h` 输出. 实际上 `createApp` 与 `h` 在底层都依赖了 `createVNode` 函数.

- vue 渲染中对象发生了如下变化:

  ```mermaid
  graph LR
  组件/元素配置对象 --> 虚拟节点vNode --> 实例对象 --> DOM
  ```

  - 组件配置对象包含了 `render`, `setup`
  - `vNode` 在配置对象的基础上加入了部分属性
  - 实例对象又在 `vNode` 的基础上加入了属性
  - 最后挂载为 DOM

`vue-runtime` 对外暴露函数只有 `createApp` 我们从这个函数入手

- `createApp` 创建了 app 组件 `vNode`, 同时这个的 `vNode` 还应该有 `mount` 函数(唯一特殊的地方)

  ```js
  // @packages/runtime-core/src/createApp.ts
  import { createVNode } from './vnode';
  import { render } from './render';

  export function createApp(rootComponent) {
    return {
      _component: rootComponent,
      mount(container) {
        const vNode = createVNode(rootComponent);
        render(vNode, document.querySelector(container));
      },
    };
  }
  ```

- `createVnode`: 收到配置对象, `props`, `children` 将他们作为一个对象存起来(API 与 `h` 函数一样)

  ```js
  // @packages/runtime-core/src/vnode.ts
  export function createVNode(component, props = {}, children = []) {
    return {
      type: component,
      props,
      children,
    };
  }
  ```

- `render` 负责渲染 `vNode`, 但是 `render` 什么都没做, 只是调用了 `patch`. 这里多此一举是为了方便之后部署子元素时递归方便

  ```js
  // @packages/runtime-core/src/render.ts
  export function render(vNode, container) {
    patch(null, vNode, container); // 第一次创建没有老元素
  }
  ```

- `patch` 函数收入更新前后节点与挂载点(新节点的挂载前节点为 `null`), 针对不同节点类型调用不同处理函数

  ```js
  // @packages/runtime-core/src/render.ts
  export function patch(vNode1, vNode2, container) {
    if (isObject(vNode2.type)) processComponent(vNode1, vNode2, container);
    else processElement(vNode1, vNode2, container);
  }
  ```

- `processComponent` 处理组件

  ```js
  // @packages/runtime-core/src/render.ts
  function processComponent(vNode1, vNode2, container) {
    if (vNode1) return updateComponent(vNode1, vNode2, container); // 老元素就 update
    return mountComponent(vNode2, container); //  新元素就挂载
  }
  ```

  `updateComponent` 暂时没有必要实现

- `mountComponent` 挂载组件. 首先明确组件自己是没有 HTML 标签的, 挂载组件实际上是挂载组件中的子元素. 而组件存在的必要是其导出的 setup 函数中存在子元素需要的变量与函数.

  我们构建组件实例在上面记录组件需要的上下文

  ```js
  // @packages/runtime-core/src/render.ts
  function mountComponent(vNode, container) {
    const instance = createComponent(vNode); // 创建实例
    setupComponent(instance); // 配置实例
    setupRenderEffect(instance.render, container); // 部署实例
  }
  ```

- `createComponent` 用于创建组件实例, 为了方便我们将组件的 type 提到实例上

  ```js
  // @packages/runtime-core/src/component.ts
  export function createComponent(vNode) {
    return {
      vNode,
      type: vNode.type, // 图方便
      render: null,
    };
  }
  ```

- `setupComponent` 用于创建实例, 配置实例, 包括初始化 props, slots, 处理 setup 导出的变量等. 这里我们先不处理 props, slot, 忽略 setup 导出的变量后的归属问题, 只解决

  - 如果有 `setup` 就执行 `setup`, 如果执行结果是对象就将导出对象绑定到 instance 上, 如果是函数就把他当成 `render` 函数
  - 如果没 `render` 就从 `vNode` 的 `type` 上读取 `render`

  ```js
  // @packages/runtime-core/src/component.ts
  export function setupComponent(instance) {
    // initProp
    // initSlot
    setupStatefulComponent(instance);
    finishComponentSetup(instance);
  }

  // 如果有 setup 就处理 setup 函数运行结果
  function setupStatefulComponent(instance) {
    if (instance.type.setup)
      handleSetupResult(instance, instance.type.setup.call(instance));
    finishComponentSetup;
  }

  // 处理 setup 函数运行结果
  function handleSetupResult(instance, res) {
    if (isFunction(res)) instance.render = res;
    else {
      instance.setupResult = res;
    }
    finishComponentSetup(instance);
  }

  // 最后兜底获取 render
  function finishComponentSetup(instance) {
    instance.render = instance.render || instance.type.render;
  }
  ```

- 构建 `instance` 之后需要将中的子元素挂载出去, 递归 `patch` 即可

  ```js
  // @packages/runtime-core/src/component.ts
  export function setupRenderEffect(render, container) {
    const subTree = render(); // render 只能返回 h 函数的结果, 所以一定是一个 vNode, 直接 patch 就行
    // !
    patch(null, subTree, container);
  }
  ```

- 类似的实现 Element 处理功能

  ```js
  // @packages/runtime-core/src/render.ts
  function processElement(vNode1, vNode2, container) {
    if (vNode1) return updateElement(vNode1, vNode2, container);
    return mountElement(vNode2, container);
  }
  ```

- 实现挂载 Element

  ```js
  // @packages/runtime-core/src/render.ts
  function mountElement(vNode, container) {
    const el = document.createElement(vNode.type) as HTMLElement; // 构造 DOM 元素
    // 添加属性
    Object.keys(vNode.props).forEach((k) => el.setAttribute(k, vNode.props[k]));
    // 有子元素
    if (isObject(vNode.children)) {
      vNode.children.forEach((d) => {
        patch(null, d, el); // 递归挂载
      });
    } else el.textContent = vNode.children; // 没子元素
    container.appendChild(el);
  }
  ```

- 最后写下 `h` 函数

  ```js
  // @packages/runtime-core/src/h.ts
  import { createVNode } from "./vnode";
  export const h = createVNode
  ```

### 实现组件实例 `Proxy`

我们想要让组件可以引用自己导出的变量

```js
export default {
  setup() {
    return {
      message: ref('micro-vue'),
    };
  },
  render() {
    return h('div', { class: 'title' }, 'hi ' + this.message);
  },
};
```

但是因为我们直接调用了 `render` 函数

```js
// @packages/runtime-core/src/component.ts
export function setupRenderEffect(render, container) {
  const subTree = render();
  // ...
}
```

所以 `render` 的 `this` 是 `global`, 我们希望 `render` 的 `this` 包括 `setup` 导出的对象与 Vue 3 文档中的[组件实例](https://cn.vuejs.org/api/component-instance.html), 所以我们需要构造一个 Proxy 同时实现访问 setup 结果与组件对象

1. 处理 setup 导出

  ```ts
  // @packages/runtime-core/src/component.ts
  function handleSetupResult(instance, res) {
    // ...
    instance.setupResult = proxyRefs(res);
    // ...
  }
  ```

2. 在结束组件初始化时构造代理对象, 将代理对象作为一个属性插入实例
  ```ts
  // @packages/runtime-core/src/component.ts
  function finishComponentSetup(instance) {
    // 声明代理对象
    instance.proxy = new Proxy({ instance }, publicInstanceProxy);
    instance.render = instance.render || instance.type.render;
  }
  ```
  将 `target` 定义为 `{ instance }` 看起来很怪, 为啥不直接用 `instance` 呢? 因为在 DEV 模式下这个对象内部应该还有很多属性, 只不过我们没有考虑
3. 定义代理
  ```ts
  // @packages/runtime-core/src/publicInstanceProxy.ts
  const specialInstanceKeyMap = {
    $el: (instance) => instance.vNode.el,
  };

  export const publicInstanceProxy = {
    get(target, key, receiver) {
      // 如果 setup 导出的对象上有就返回
      if (Reflect.has(target.instance.setupResult, key))
        return Reflect.get(target.instance.setupResult, key);
      // 从组件属性上导出属性
      if (key in specialInstanceKeyMap)
        return specialInstanceKeyMap[key](target.instance);
      return target.instance[key];
    },
  };
  ```
4. 实现 `$el`

  有很多组件实例, 我们暂时只实现 `$el`. 挂载点应该是 `vNode` 的属性, 所以我们将挂载点记录在 `vNode` 上

  ```ts
  // @packages/runtime-core/src/vnode.ts
  export function createVNode(component, props = {}, children = []) {
    return {
      // ...
      el: null,
    };
  }
  ```
  `el` 作为组件实例在组件挂载后在 vNode 上更新即可

  ```ts
  // @packages/runtime-core/src/publicInstanceProxy.ts
  export function setupRenderEffect(instance, container) {
    // ...
    instance.vNode.el = container;
  }
  ```

### 实现 `shapeFlags`

可以将组件类型判断抽出为一个变量, 通过位运算判断组件类型. 我们目前需要判断的有:

- 是否是 `Element`
- 是否是有 `setup` 的组件(也叫 stateful component)
- 子节点是 string 还是数组

实现

- 修改 `vNode` 定义
  ```ts
  export function createVNode(component, props = {}, children = []) {
    return {
      shapeFlags: getShapeFlags(component, children),
      // ...
    };
  }
  ```
- 判断函数
  ```ts
  import { isObject } from '../../share/index';

  export const enum ShapeFlags {
    ELEMENT = 1 << 0,
    STATEFUL_COMPONENT = 1 << 1,
    TEXT_CHILDREN = 1 << 2,
    ARRAY_CHILDREN = 1 << 3,
  }

  export function getShapeFlags(type, children) {
    let res = 0;
    // 注意, 这俩不是互斥的...
    if (!isObject(type)) res |= ShapeFlags.ELEMENT;
    else if (type.setup) res |= ShapeFlags.STATEFUL_COMPONENT;
    if (isObject(children)) res |= ShapeFlags.ARRAY_CHILDREN;
    else res |= ShapeFlags.TEXT_CHILDREN;
    return res;
  }
  ```
- 同步判断
  ```ts
  function setupStatefulComponent(instance) {
    if (instance.vNode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT)
    // ...
  }

  function mountElement(vNode, container) {
    const el = document.createElement(vNode.type) as HTMLElement;
    Object.keys(vNode.props).forEach((k) => el.setAttribute(k, vNode.props[k]));
    if (vNode.shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      // ...
    }
    // ...
  }

  export function patch(vNode1, vNode2, container) {
    if (vNode2.shapeFlags & ShapeFlags.ELEMENT)
      processElement(vNode1, vNode2, container);
    // ...
  }
  ```

### 实现事件注册

我们可以为 Element 传入 attribute, 但是无法传入绑定事件, 例如传入 `{ onClick: ()=>{} }` 在渲染到 DOM 时可以发现渲染结果为

```js
<div onclick="()=>{}"></div>
```

- `onClick` 的小驼峰命名没了
- value 应该是一个函数调用, 而这里只写了一个函数, 这样点击时候并不会执行函数只会右查询一下这个函数

所以我们要手动实现这样的功能: 在挂载 Element 时, 若传入的是事件, 手动绑定这个事件

```ts
function mountElement(vNode, container) {
  const el = document.createElement(vNode.type) as HTMLElement;
  Object.keys(vNode.props).forEach((k) => {
    // 通过正则判断是否为事件绑定
    if (/^on[A-Z]/.test(k))
      el.addEventListener(
        k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1)),
        vNode.props[k]
      );
    else el.setAttribute(k, vNode.props[k]);
  });
  // ...
}
```

### 实现 `props`

**需求:**

1. 将 props 输入 `setup`, 使得可以在 `setup` 中通过 `props.属性名` 调用, 同时 `props` 为 shadowReadonly
2. 在 `render` 可以通过 `this.属性名` 调用

**实现:**

- 在 setup 时构造

  ```ts
  export function setupComponent(instance) {
    // ...
    initProps(instance);
    // ...
  }
  ```

- 通过第二点我们就知道我们需要将 props 加入 componentPublicProxy

  ```ts
  export const publicInstanceProxy = {
    get(target, key, receiver) {
      // ...
      if (key in target.instance.props) return target.instance.props[key];
    	// ...
    },
  };
  ```

- 参考 Vue 的API, 对于第一点需求我们只需要修改 `handleSetupResult` 的调用, 传入时加入 shadowReadonly

  ```ts
  handleSetupResult( instance,
        instance.type.setup.call(instance, shadowReadonly(instance.props)})
  );
  ```

  为 setup 传入参数即可

  ```ts
  setup(props, { emit }) {
      props.foo++; // warn: readonly value
  }
  ```

- 我们为啥不把 shadowReadonly 写入 componentPublicProxy 呢? 这样岂不是可以保护 `render` 中调用不会修改原值? 没有必要, 我们只需要保证浅层 readOnly, 而 render 是直接拿属性名的, 不会修改 props 上的属性定义.

### 实现 `Emits`

**需求:**

通过 props 传入一堆 `onXxxXxx` 函数在 `setup` 中可以通过 `emit(xxxXxx)` 调用函数. 其中`emit` 通过 `setup(props, {emit})` 的方式传入.

**注意, 这里就是差一个 `on`**. 你说为啥他妈的你要差个 `on` 啊, 我写 Vue 的时候也没有差异啊, 这个应该是 vue-loader 为传入的 `emit` 名加上的 (如: `<comp v-on:doSth='xxx'>`, 可能会被 vue-loader 转为 `{ onDoSth: xxx }`)

**那么, 难道 `props` 上的 `onDoSth` 不会被注册成事件监听吗?** 怎么会, 我们的事件监听是为 Element 绑定的!

**实现:**

- 实现 emit 函数

  ```ts
  export function emit(instance, event, ...args) {
    let eventName = event;
    if (/-([a-z])/.test(eventName)) // 如果是 xxx-xxx 命名法, 将其转换为小驼峰
      eventName = eventName.replace(/-([a-z])/, (_, lc) => lc.toUpperCase());
    if (/[a-z].*/.test(eventName)) // 如果是小驼峰命名法, 将其转换为大驼峰
      eventName = eventName[0].toUpperCase() + eventName.slice(1);
    eventName = 'on' + eventName; // 加入 on
    instance.vNode.props[eventName] && instance.vNode.props[eventName](args);
  }
  ```

- 将函数加入实例对象 `$emit`

  ```ts
  const specialInstanceKeyMap = {
    $el: (instance) => instance.vNode.el,
    $emit: (instance) => emit.bind(null, instance),
  };

  export const publicInstanceProxy = {/*...*/};
  ```

  这里有个比较绕的点, Vue 要求 `emit` 调用方法为 `emit(名字, 函数调用参数)`, 我们这边多了一个 `instance`, 所以我们在定义 `$emit` 时为函数 bind 第一个参数

- 传入 `setup` 的调用参数

  ```ts
  handleSetupResult(
      instance,
      instance.type.setup.call(instance, shadowReadonly(instance.props), {
          emit: instance.proxy.$emit,
      })
  );
  ```

### 实现 `slot`

之前已经梳理过组件的 children 存储的是 slot. Vue 有三种 slot

- 默认 slot: 直接作为子元素写入, 在子组件中会按顺序写入
- 具名 slot: 指定元素插入什么地方
- 作用域 slot: 为具名 slot 传入参数

先考虑组件的 children 应该传入什么样的数据类型 (`h(comp, {}, children)`)

- 如果只支持默认 slot, 我们大可将数组传入 children 并将 render 函数写成下面这样

    ```ts
    const HelloWorld = {
      render() {
        // 假设 $slot 表示父组件传入的插槽数组, 让子组件在渲染时直接解构上去
        return h('div', {}, [h('span', {}, this.foo), ...$slot]);
      },
    };

    export default {
      render() {
        return h('div', { class: 'title' }, [
          h('span', {}, 'APP'),
          h(HelloWorld, { foo: 'hi' }, [
            h('div', {}, 'IM LEFT'),
            h('div', {}, 'IM RIGHT'),
          ]),
        ]);
      },
    };
```

- 如果需要支持具名插槽, 我们可以传入数组, 并在每个元素上打上 `name`. 但是这样每次放入元素都需要 $O(n)$ 查找. 可以考虑将传入的 `children` 做成对象, Key 为具名插槽名字, Value 可以是 vNode 数组也可以是 vNode.

  ```ts
  import { h, ref, renderSlots } from '../../lib/micro-vue.esm.js';

  const HelloWorld = {
    render() {
      return h('div', {}, [
        // 由于 this.$slots[key] 不知道是数组还是对象, 我们用一个函数辅助处理
        renderSlots(this.$slots, 'left'),
        h('span', {}, this.foo),
        renderSlots(this.$slots, 'right'),
        h('span', {}, 'OK'),
        renderSlots(this.$slots), // 调用默认插槽
      ]);
    },
  };

  export default {
    render() {
      return h('div', { class: 'title' }, [
        h('span', {}, 'APP'),
        h(HelloWorld, { foo: 'hi' }, {
          left: h('div', {}, 'IM LEFT'), // left 插槽
          right: h('div', {}, 'IM RIGHT'), // right 插槽
          default: [h('div', {}, 'IM D1'),h('div', {}, 'IM D2')] // 默认插槽
        }),
      ]);
    },
  };
  ```

  这里 Vue 引入了 `renderSlots` 函数, 我以为其作用就是找到插槽并转换为数组, 就像下面这样

  ```ts
  function renderSlots(slots, key = 'default') {
    let rSlots = slots[key] ? slots[key] : [];
    return isObject(slots[key]) ? [rSlots] : rSlots;
  }
  ```

  但是实际上这个函数的返回值是一个 vNode, Vue 会直接将一个或多个 vNode 打包成一个 vNode 返回从而规避数组解构

  ```ts
  // @packages/runtime-core/src/componentSlots.ts
  function renderSlots(slots, name = 'default') {
      let rSlots = name in slots ? slots[name] : [];
      rSlots = testAndTransArray(rSlots);
      return h('div', {}, rSlots);
  }
  ```

  不知道为什么要这么做😟

- 继续考虑作用域插槽, 为了实现作用域变量传递, 我们需要将插槽定义为函数, 并在调用 `renderSolts` 时传入参数

  ```js
  const HelloWorld = {
    render() {
      return h('div', {}, [
        renderSlots(this.$slots, 'left'),
        h('span', {}, this.foo),
        renderSlots(this.$slots, 'right', 'wuhu'), // 作用域 slot 传入参数
        h('span', {}, 'OK'),
        renderSlots(this.$slots, 'default', 'wula'),
      ]);
    },
  };

  export default {
    render() {
      return h('div', { class: 'title' }, [
        h('span', {}, 'APP'),
        h(
          HelloWorld,
          { foo: 'hi' },
          {
            left: () => h('div', {}, 'IM LEFT'),
            right: (foo) => h('div', {}, foo),
            default: (foo) => [h('div', {}, 'IM ' + foo), h('div', {}, 'IM D2')],
          }
        ),
      ]);
    },
  };
  ```

  只需要在 `renderSlots` 中判断 value 是对象还是函数并分类讨论即可.

  ```ts
  // @packages/runtime-core/src/componentSlots.ts
  function renderSlots(slots, name = 'default', ...args) {
      let rSlots = name in slots ? slots[name] : []; // 防止给无效 Key
      // 如果是对象 / 数组就不管, 函数就调用
      rSlots = isObject(rSlots) ? rSlots : rSlots(...args);
      // 尝试转为数组
      rSlots = testAndTransArray(rSlots);
      return h(typeSymbol.FragmentNode, {}, rSlots);
  }

  // @packages/share/index.ts
  export function testAndTransArray(v) {
    return Array.isArray(v) ? v : [v];
  }
  ```

至此, 我们实现了插槽的渲染, 再实现一些外围方法

- 实现 `initSlot`

  ```ts
  // @packages/runtime-core/src/componentSlots.ts
  export function initSlot(instance) {
    instance.slots = instance.vNode.children || {};
  }
  ```

- 添加 `$slot` 定义

  ```ts
  // @packages/runtime-core/src/componentPublicInstance.ts
  const specialInstanceKeyMap = {
    $el: (instance) => instance.vNode.el,
    $emit: (instance) => emit.bind(null, instance),
    $slots: (instance) => instance.slots,
  };
  ```

### 实现 `FragmentNode`

在实现 `renderSolts` 时我们为将多个 vNode 打包成一个 vNode 采用 `h('div', {}, rSlots)` 将多个插槽放入了一个 `div` 下. 然而我们希望在 HTML 中不现实这个多余的 `div`, 此时就需要 `Fragment` 标签, 它相当于 Vue 插槽中的 `<template></template>` 标签, 永不会被渲染. 其实现的原理就是在 mount 时不挂载父节点, 直接将子节点挂载到 container 上

- 先用 Symbol 定义标签名

  ```ts
  // @packages/runtime-core/src/vnode.ts
  export const typeSymbol = {
    FragmentNode: Symbol('FragmentNode'),
  };
  ```

- 在 `patch` 时特判 `Fragment` (因为 `Fragment` 与 component, Element 判断条件不同, 我们没法把他们放入用三个 `case` 中)

  ```ts
  // @packages/runtime-core/src/render.ts
  export function patch(vNode1, vNode2, container) {
    switch (vNode2.type) {
      case typeSymbol.FragmentNode:
        processFragmentNode(vNode1, vNode2, container); // 特判 Fragment
        break;
      default:
        if (vNode2.shapeFlags & ShapeFlags.ELEMENT)
          processElement(vNode1, vNode2, container);
        else processComponent(vNode1, vNode2, container);
    }
  }

  function processFragmentNode(vNode1, vNode2, container) {
    if (vNode1) return;
    return mountFragmentNode(vNode2, container);
  }

  function mountFragmentNode(vNode, container) {
    // 不挂载父节点直接将子节点挂载到 container 上
    vNode.children.forEach((d) => patch(null, d, container));
  }
  ```

- 修改 `renderSlots`

  ```ts
  // @packages/runtime-core/src/componentSlots.ts
  export function renderSlots(slots, name = 'default', ...args) {
    let rSlots = name in slots ? slots[name](...args) : [];
    rSlots = testAndTransArray(rSlots);
    return h(typeSymbol.FragmentNode, {}, rSlots);
    //       ^ 小改一下
  }
  ```

### 实现 `TextNode`

我们还希望在 HTML 中不使用 `span` 就写入文字, 就像

```html
<div>
  <span>我想写 span 就写 span</span>
  想直接写就直接写
</div>
```

除非使用 `FragmentNode` 我们无法不渲染一段内容的标签, 但是 `FragmentNode` 标签的 `children` 也必须是 vNode, 所以我们还需要定义一个特殊标签, 它本身会渲染为 TextNode

- 定义类型

  ```ts
  // @packages/runtime-core/src/vnode.ts
  export const typeSymbol = {
    FragmentNode: Symbol('FragmentNode'),
    TextNode: Symbol('TextNode'),
  };
  ```

- 特判类型

  ```ts
  // @packages/runtime-core/src/render.ts
  export function patch(vNode1, vNode2, container) {
    switch (vNode2.type) {
      case typeSymbol.FragmentNode:
        processFragmentNode(vNode1, vNode2, container);
        break;
      case typeSymbol.TextNode: // 特判 TextNode
        processTextNode(vNode1, vNode2, container);
        break;
      default:
        if (vNode2.shapeFlags & ShapeFlags.ELEMENT)
          processElement(vNode1, vNode2, container);
        else processComponent(vNode1, vNode2, container);
    }
  }

  function processTextNode(vNode1, vNode2, container) {
    if (vNode1) return;
    return mountTextNode(vNode2, container);
  }

  function mountTextNode(vNode, container) {
    const elem = document.createTextNode(vNode.children); // 通过 createTextNode 创建
    container.appendChild(elem);
  }
  ```

- 向外部暴露接口

  ```ts
  // @packages/runtime-core/src/vnode.ts
  export function createTextVNode(text) {
    return createVNode(typeSymbol.TextNode, {}, text);
  }
  ```

- 使用

  ```ts
  render() {
      return h('div', { class: 'title' }, [
          createTextVNode('im text'),
      ]);
  },
  ```

### 实现工具函数 `getCurrentInstance`

该函数用于在 setup 中获取当前 setup 所在的 instance. 只须在全局变量上打个标记就可以实现

```ts
// @packages/runtime-core/src/component.ts
let currentInstance = undefined;

function setupStatefulComponent(instance) {
  if (instance.vNode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    currentInstance = instance; // 打个标记再执行
    handleSetupResult(
      instance,
      instance.type.setup(shadowReadonly(instance.props), {
        emit: instance.proxy.$emit,
      })
    );
    currentInstance = undefined; // 删除标记
  }
  finishComponentSetup(instance);
}

export function getCurrentInstance() {
  return currentInstance;
}
```

