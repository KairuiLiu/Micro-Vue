## 实现 runtime-dom

我们的 Vue 默认是渲染在 HTML 上面的, 如果我们向将组件渲染在 canvas 上(DOM 标签变为 canvas 上的一个元素)就需要重写所有 DOM API 相关的函数调用.

我们希望将这些 API 抽象出来 (例如 `document.createElement` 抽象为 `create` 函数). 当我们需要将 Vue 组件渲染在 HTML 时只需要为 runtime-core 传入 `create` 函数即可.

至此我们的组件依赖关系由 `vue > runtime-core > reactivity` 变为 `vue > runtime-dom > runtime-core > reactivity`, runtime-dom 就是为 Vue 提供 HTML 渲染能力的组件

实现 runtime-dom API (将 runtime-core 中调用 DOM API 的地方全写出来)

```ts
import { createRenderer } from '../../runtime-core/src/render';
import { isUNKey } from '../../share';

export const createElement = (v) => document.createElement(v);

export const createText = (v) => document.createTextNode(v);

export const remove = (el) => el.parent && el.parent.remove(el);

export const insert = (el, parent, anchor) => parent.insertBefore(el, anchor);

export const setText = (el, text) => (el.nodeValue = text);

export const setElementText = (el, text) => (el.textContent = text);

export function patchProps(elem: HTMLElement, oldProps = {}, newProps = {}) {
  const props = [
    ...new Set([...Object.keys(oldProps), ...Object.keys(newProps)]),
  ];
  props.forEach((k) => {
    let ek = /^on[A-Z]/.test(k)
      ? k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1))
      : undefined;
    if (isUNKey(k, oldProps) && (!isUNKey(k, newProps) || ek))
      ek ? elem.removeEventListener(ek, oldProps[k]) : elem.removeAttribute(k);
    else if (isUNKey(k, newProps))
      ek
        ? elem.addEventListener(ek, newProps[k])
        : elem.setAttribute(k, newProps[k]);
  });
}
```

我们还需要将 runtime-core 接入 runtime-dom, 因为我们要为 runtime-core 传入刚刚定义的渲染函数, 调用这些渲染函数的文件只有 `render.ts`. 之前 `render.ts` 是通过导出函数向外暴露 API 的, 但是因为我们也要传入函数, 我们只能将 `render.ts` 外部包裹一个函数, 让该函数传入 runtime-dom 定义的渲染函数最后返回原本需要导出的函数

```ts
let renderer;

// 创建可用 DOM API 的 render
function ensureRenderer() {
  return (
    renderer || // 如果创建过了就不重复创建
    (renderer = createRenderer({
      createElement,
      createText,
      setText,
      setElementText,
      patchProps,
      insert,
      remove,
    }))
  );
}

// 创建可用 DOM API 的 createApp
export const createApp = (...args) => {
  return ensureRenderer().createApp(...args);
};

export * from '../../runtime-core/src';
```

修改 `render.ts` 的构造方式

```ts
export function createRenderer({
  createElement,
  createText,
  remove,
  insert,
  setText,
  setElementText,
  patchProps,
}) {
  function render(vNode, container) {
  // ... 将调用 DOM API 的地方改为调用传入的渲染函数
  // ... 将原本所有 export 的函数改为 return {该函数}
  return {
    render,
    createApp: createApp.bind(null, render),
  };
}
```

`createApp` 函数需要 render, 但是我们的 render 也是动态构建的, 所以我们只能为 createApp 传入 render, 并在 `render.ts` 中先传入这一参数

```ts
export function createApp(render, rootComponent) {
  return {
    _component: rootComponent,
    mount(container) {
      const vNode = createVNode(rootComponent);
      render(
        vNode,
        isObject(container)
          ? container
          : document.querySelector(container)
      );
    },
  };
}
```

最后修改导出

```diff
export * from './reactivity/src/index';
- export * from './runtime-core/src/index';
+ export * from './runtime-dom/src/index';
```

**测试**

实现一个 `runtime-PIXI`, PIXI.js 是一个基于 canvas 的游戏库, 完成了对 canvas 的封装. 我们希望通过对 PIXI.js API 的二次封装实现利用 Vue 操作 canvas

我们希望实现执行 `test` 修改正方形位置

```ts
export default {
  setup() {
    const x = ref(0);
    const y = ref(0);
    window.test = (x1, y1) => {
      x.value = x1;
      y.value = y1;
    };
    return { x, y };
  },
  render() {
    return h('div', { x: this.x, y: this.y });
  },
};

```

为了将测试代码写在一起, 我们将 runtime-dom 完全引入了测试用例并重写 runtime-dom. 这样做可以免去将重新编译 Vue

```ts
// modify to export createRenderer (cause the export level is different from vue runtime-dom)
import { createRenderer } from '../../lib/micro-vue.esm.js';
export * from '../../lib/micro-vue.esm.js';

// 创建元素
export const createElement = (v) => {
  const rect = new PIXI.Graphics();
  rect.beginFill(0xff0000);
  rect.drawRect(0, 0, 100, 100);
  rect.endFill();
  return rect;
};

// 插入
export const insert = (el, parent, anchor) => parent.addChild(el);

// 修改属性
export function patchProps(elem, oldProps = {}, newProps = {}) {
  const props = [
    ...new Set([...Object.keys(oldProps), ...Object.keys(newProps)]),
  ];
  props.forEach((k) => {
    elem[k] = newProps[k];
  });
}

let renderer;

// 与测试无关的 API 直接给 NULL
function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer({
      createElement,
      createText: null,
      setText: null,
      setElementText: null,
      patchProps,
      insert,
      remove: null,
    }))
  );
}

export const createApp = (...args) => {
  return ensureRenderer().createApp(...args);
};

// 创建 game
const game = new PIXI.Application({ width: 640, height: 360 });

// 挂载 canvas
document.body.append(game.view);
// 在 PIXI 中 canvas DOM 不用于挂载元素, 新元素是挂载到 game.stage 上的
export const el = game.stage;
```
