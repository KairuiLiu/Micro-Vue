## 实现 runtime-core 的 update 部分

在实现更新逻辑时我们也要对组件与 Element 分类讨论并谨记当前实现的是组件还是 Element

### 基本思想

- update 事件的触发者是**组件**. 响应式对象修改后会触发函数, 这个函数一定是组件上的函数, Element 上存不了函数
- 响应式对象变化后最后应该触发的是依赖组件的 `render` 函数, `render` 函数重新执行并生成新的 subTree.
- 我们不能直接将老的 subTree 删除掉替换为新的 subTree, 这样性能损耗太大, **我们希望尽可能对比新老 subTree, 根据两个 subTree 之间的变化刷新 DOM**
- 我们对比的是 vNode, 存在 Element 与组件两种 vNode, 我们要分别对不同类型 vNode 讨论更新方法

- **如何判断两个 vNode 是 "同类型" 的**

  这里的 "同类型" 是指两个 vNode 可以通过修改对应 DOM 的子元素, 修改 props 实现更新, 而不需要卸载DOM.

  - `type` 不同的 vNode 一定不是同类型的

    ```ts
    oldVnode = h('div', {}, '呀哈哈')
    newVnode1 = h('span', {}, '克洛洛')
    newVnode2 = h(HelloWorld)
    ```

    三个 vNode 的 `type` 不同这导致 DOM 标签名不同, 铁定无法不卸载元素更新

  - `props.key` 不同一定不是同类型的

    在 Vue 中我们可以指定元素的 key 作为元素的 id, 不同 id 的元素一定是不同型的

  综上我们可以通过 `vNode1.type === vNode2.type && vNode1.props.key === vNode2.props.key` 判断两个 vNode 是不是同类型的

- **如果两个 vNode 是 "同类型" 的如何更新**

  - **vNode 是 Element 型的**

    Element 型 vNode 被实实在在的渲染到了 DOM 树上, 我们希望尽量不卸载挂载 DOM 元素, 而希望在原 Element 上做更新. 我们需要更新 DOM 的属性与 children

    - 更新 props

    - 更新 children

      children 可以是字符串也可以是 vNode 数组, 我们需要分类讨论

      - Text 型到 Text 型:

        ```ts
        oldVnode = h('div', {}, '呀哈哈')
        newVnode = h('div', {}, '克洛洛')
        ```

        直接更新 textCont

      - Text 型到 Array 型:

        ```ts
        oldVnode = h('div', {}, '呀哈哈')
        newVnode = h('div', {}, [h('div', {}, '克洛洛'), h('div', {}, '卓')])
        ```

        删掉 DOM 的 textCont, patch 新 vNode 进去

      - Array 型到 Text 型:

        ```ts
        oldVnode = h('div', {}, [h('div', {}, '克洛洛'), h('div', {}, '卓')])
        newVnode = h('div', {}, '呀哈哈')
        ```

        删掉 DOM 的所有 children, 写入 textContent

      - Array 型到 Array 型: 最麻烦的, 采用双端对比法, 找到节点发生变化的区间, 删除新 vNode 中不存在的节点, 加入新 vNode 中独有节点, 调整节点顺序

  - **新 vNode 是组件型的**

    ??

- **如果两个 vNode 不是 "同类型" 的如何更新**

  如果是这种情况我们就束手无策了

  ```ts
  oldVnode1 = h('div', {}, '呀哈哈')
  newVnode1 = h('span', {}, '克洛洛')
  ```

  但是这种情况是不存在的. 若两个不同类型 vNode 要求更新, 那么前面一定调用过 `patch(vNode1, vNode2, ...)`, 在更新时哪些情况会调用 `vNode1 !== null` 的 patch 呢? 组件更新, 同类型 Element 的 Array to Array. 不同类型的节点会被双端对比算法视为不同节点而被删除 / 增加掉. 所以不可能让不同类型节点 `patch` 在一起.

### 更新 pipeline

让响应式对象支持依赖收集与触发依赖. 将整个 renderEffect 装入 effect, 这意味着每次响应式对象发生变化都会重复调用 renderEffect. 同时我们要区分是 mount 还是 update, 我们可以让 instance 记录更新前的 subTree 并默认为 null 实现这一功能

```ts
// @packages/runtime-core/src/component.ts
export function setupRenderEffect(instance, container) {
  effect(() => {
    const subTree = instance.render.call(instance.proxy);
    patch(instance.subTree, subTree, container, instance);
    //    ^ 第一次是 null
    instance.vNode.el = container;
    instance.subTree = subTree; // 记录当前 subTree
  });
}
```

同步修正一下 `createComponent`

```ts
export function createComponent(vNode, parent) {
  return {
    // ...
    subTree: null,
  };
}
```

之后需要实现:

- Element:
  - 更新 props
  - 更新 children
- 组件
  - 更新??

### Element 更新 props

给定更新前后的 vNode 与目标 DOM 对象, 实现 props 更新.

- 构建测试用例

  ```ts
  export default {
    setup() {
      let cnt = 1;
      const attrValue = ref(`attrValue${cnt}`);

      window.test = function() {
        attrValue.value = `attrValue${++cnt}`;
      };

      return { attrValue, htmlValue };
    },
    render() {
      return h('div', {attrValue: this.attrValue}, 'test')
    },
  };
  ```

- 先构建 `updateElement` 函数

  由于 `vNode2` 没有被 mount 所以 `vNode2.el` 不存在, 但是两个 vNode 对应的是同一个 DOM 对象, 我们可以将 `vNode1.el` 直接给到 `vNode2.el`. 同时我们定义 `patchProps` 用于实现功能

  ```ts
  function updateElement(vNode1, vNode2, container) {
    const elem = (vNode2.el = vNode1.el);
    patchProps(elem, vNode1?.props, vNode2.props);
  }
  ```

- 实现 `patchProps`

  首先要明确我们需要 patch 什么样的 props.

  - 空值当不存在: 如果 props 是 `{key: undefined / null}` 我们就不 patch 这个 key
  - value 可能是事件监听: 我们可以借助 mountElement 中的 props 实现

  先实现辅助函数判断 key 是否在 props 上. 如果 value 是 null / undefined / NaN 也当 key 不存在

  ```ts
  // @packages/share/index.ts
  export function isUNKey(k, obj) {
    return k in obj && obj[k] !== null && obj[k] !== undefined && !Number.isNaN(obj[k])
  }
  ```

  实现 `patchProps` 函数

  ```ts
  function patchProps(elem: HTMLElement, oldProps = {}, newProps = {}) {
    // 获取所有 props
    const props = [
      ...new Set([...Object.keys(oldProps), ...Object.keys(newProps)]),
    ];
    props.forEach((k) => {
      // 假设 key 是事件监听, 尝试将其转化为小驼峰
      let ek = /^on[A-Z]/.test(k)
        ? k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1))
        : undefined;
      // 如果 key 在老 vNode 中存在, 在新 vNode 中不存在: removeAttribute
      // 如果 key 在老 vNode 中存在, 是事件监听: 解除 防止监听函数变化
      // 如果 key 在老 vNode 中存在, 不是事件监听, 在新 vNode 也有: 不管
      if (isUNKey(k, oldProps) && (!isUNKey(k, newProps) || ek))
        ek ? elem.removeEventListener(ek, oldProps[k]) : elem.removeAttribute(k);
      // 不管老节点有没有, 新节点有: setAttribute / addEventListener
      else if (isUNKey(k, newProps))
        ek
          ? elem.addEventListener(ek, newProps[k])
          : elem.setAttribute(k, newProps[k]);
    });
  }
  ```

- 为什么叫 `patchProps` 不叫 `updateProps`?

  实际上这个函数也可以用于 `mountElement` 中 props 处理(令 `oldProps = {}`), 并不是 `updateElement` 专用的. 修改

  ```diff
  function mountElement(vNode, container, parent) {
    const el = (vNode.el = document.createElement(vNode.type) as HTMLElement);
  - Object.keys(vNode.props).forEach((k) => {
  -   if (/^on[A-Z]/.test(k))
  -     el.addEventListener(
  -       k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1)),
  -       vNode.props[k]
  -     );
  -   else el.setAttribute(k, vNode.props[k]);
  - });
  + patchProps(el, {}, vNode.props);
  }
  ```

### Element 更新 children 前三种情况

- Text to Text

  ```ts
  const T2T = {
    setup() {
      const ot = ref(false);
      window.test = () => {
        ot.value = true;
      };
      return { ot };
    },
    render() {
      return this.ot ? h('div', {}, 'after') : h('div', {}, 'before');
    },
  };

  export default {
    setup() {},
    render() {
      return h(T2T);
    },
  };
  ```

  只需修改 DOM 内部 textContent, 如果内容不变就不修改

  ```ts
  function updateChildren(vNode1, vNode2, container, parent) {
    if (vNode2.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      if (vNode1.shapeFlags & ShapeFlags.TEXT_CHILDREN)
  	  if (vNode2.children !== vNode1.children)
  	    container.textContent = vNode2.children;
    }
  }
  ```

- Array to Text

  ```ts
  const A2T = {
    setup() {
      const ot = ref(false);
      window.test = () => {
        ot.value = true;
      };
      return { ot };
    },
    render() {
      return this.ot
        ? h('div', {}, 'after')
        : h('div', {}, [h('div', {}, 'before'), h('div', {}, 'before')]);
    },
  };
  ```

  将 DOM 中所有 Element 都删除, 写入 conteneText

  ```ts
  function updateChildren(vNode1, vNode2, container, parent) {
    if (vNode2.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      if (vNode1.shapeFlags & ShapeFlags.ARRAY_CHILDREN)
        [...container.children].forEach((d) => d.remove());
      // 这里合并了下代码, 如果是 Array to Text, 那么 Array !== string 一定成立
      if (vNode2.children !== vNode1.children)
        container.textContent = vNode2.children;
    }
  }
  ```

- Text to Array

  ```ts
  const T2A = {
    setup() {
      const ot = ref(false);
      window.test = () => {
        ot.value = true;
      };
      return { ot };
    },
    render() {
      return this.ot
        ? h('div', {}, [h('div', {}, 'after'), h('div', {}, 'after')])
        : h('div', {}, 'before');
    },
  };
  ```

  删除内部 textContent 插入 vNode 数组

  ```ts
  function updateChildren(vNode1, vNode2, container, parent) {
    if (vNode2.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      if (vNode1.shapeFlags & ShapeFlags.ARRAY_CHILDREN)
        [...container.children].forEach((d) => d.remove());
      if (vNode2.children !== vNode1.children)
        container.textContent = vNode2.children;
    } else {
      if (vNode1.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = '';
        vNode2.children.forEach((element) => {
          patch(null, element, container, parent);
        });
      }
    }
  }
  ```

- 为 Array to Array 预留函数调用 `patchKeyedChildren`

  ```ts
  function updateChildren(vNode1, vNode2, container, parent) {
    if (vNode2.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      if (vNode1.shapeFlags & ShapeFlags.ARRAY_CHILDREN)
        [...container.children].forEach((d) => d.remove());
      if (vNode2.children !== vNode1.children)
        container.textContent = vNode2.children;
    } else {
      if (vNode1.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = '';
        vNode2.children.forEach((element) => {
          patch(null, element, container, parent);
        });
      } else {
        patchKeyedChildren(vNode1.children, vNode2.children, container, parent);
      }
    }
  }
  ```



### Element 更新 children 的双端对比法

**基本思想**

分别从左边右边对比元素, 找到发生变化的区间, 例如前后两个 Array 分别为

```ts
[ a b c d e f g h ]
[ a b e d i g h ]
```

从左边找找到只有 `a b` 是相同的

```ts
[ a b | c d e f g h ]
[ a b | e d i g h ]
```

从右边找找到只有 `g h` 是相同的

```ts
[ a b | c d e f | g h ]
[ a b | e d i | g h ]
```

最后我们找到变化区间(`[c d e f] -> [e d i]`)

将老 vNode 独有的子 vNode 移除(`[c f]`), 将新 vNode 独有的子 vNode patch上(`[i]`), 调整子 vNode 的顺序. 可以使用 `insertBefore` 调整顺序.

- 删除老 vNode 独有子元素

  为新 vNode 变化区间上的元素编号, 建立 `key -> index` 的映射. 遍历老节点, 如果没有查到 key 就删除节点

- 创建新 vNode 独有的子元素: 在调整位置时一并处理

- 调整位置

  可以通过之前建立的 `key -> index` 映射一股脑的将 DOM 调整到正常位置, 但是调整 DOM 的代价太高了, 我们希望尽可能少的减少 `insertBefore` 操作.

  ```ts
  [l1 l2 l3 ( a b c d e f g h i ) r1 r2 r3]
  [l1 l2 l3 ( i a b c d e f g h ) r1 r2 r3]
  ```

  如果采用一般方法, 我们需要分别将 `a - h` 移动到 `r1` 前面. 这明显不如将 `i` 移动到 `a` 前面划算.

  我们可以在原 vNode 的子 vNode 数组中定义一个稳定串, 保证稳定串中的元素相对位置符合新 vNode 设定, 我们只需要遍历新 vNode 的子元素, 如果该元素没有在老 vNode 中出现就创建并将其 patch 到指定位置, 如果在非稳定串中出现我们就将其 `insetBefore` 到指定位置. 考虑到我们只有 `insertBefore` 没有 `insertAfter` 函数, 我们还需要保证一个元素在 `insertBefore` 前他后一个的元素已经就位了. 所以我们需要倒着遍历新 vNode.

  在上面的例子中, 可以将 `a b c d e f g h ` 视作稳定串, 调整 `i` 到 `a` 前即可

- 将 vNode patch 到指定位置

  想要将 Element 调整到指定 Element 前面, 我们可以采用 `container.insertBefore(elem, target)`, 如果 `target == null` 就将元素调整到 container 尾部.

  但是如果想将新 vNode 调整到指定 Element 前面就需要调用 patch 了, 我们需要为 patch 加入一个锚点参数指定将 vNode patch 到哪里: `patch(vNode1, vNode2, container, parent = null, anchor = null)`

- 寻找稳定串

  寻找稳定串其实就是寻找相对位置正确的尽可能长的子串, 我们又已知道老节点对应的新节点有一个 `key -> index` 的映射, 在新节点中, index 严格递增, 所以可以获取每个老节点对应的 index 并查找 LIS. 例如

  ```ts
  oldIndex:  0  1  2    4 5 6 7 8 9 10 11 3   12 13 14
  oldVNode: [l1 l2 l3 ( a b c d e f g  h  i ) r1 r2 r3]
  newVNode: [l1 l2 l3 ( i a b c d e f  g  h ) r1 r2 r3]
  newIndex:  0  1  2    3 4 5 6 7 8 9  10 11  12 13 14
  ```

  可以得到 `lis = [a b c d e f g h]`

**特殊情况**

可以针对部分特殊情况特殊处理避免计算 LIS

- 新 vNode 只在最右边加了一堆元素: 只需要 patch 多出来的部分

  ```ts
  old: [a b c]
  new: [a b c d e f]
  ```

- 新 vNode 只在最左边加了一堆元素: 只需要 patch 多出来的部分

  ```ts
  old: [      d e f]
  new: [a b c d e f]
  ```

- 新 vNode 只最右边少了一堆元素: remove 多余 vNode 的 DOM 元素. 注意这里 remove 的不能是 vNode, 这样不管子 vNode 是 Element 还是组件类型的都可以一键卸载(因为 ELement 或 组件类型的 vNode 对应的 DOM 树都一定只有一个根 Element)

  ```ts
  old: [a b c d e f]
  new: [a b c]
  ```

- 新 vNode 只最左边少了一堆元素: remove 多余 vNode 的 DOM 元素

  ```ts
  old: [a b c d e f]
  new: [      d e f]
  ```

**我的部分实现**

定义

- `c1, c2`: 更新前后 vNode 的 children 数组
- `anchor`: 锚点
- `i`: 变化区间的左边界(包括)
- `e1, e2`: 变化区间对应 `c1, c2` 的右边界(包括)

```ts
function patchKeyedChildren(c1, c2, container, parent, anchor) {
  let i = 0,
    e1 = c1.length - 1,
    e2 = c2.length - 1;
  // 从左往右看, 如果类型不同或者 key 不同就退出, 否则递归更新子节点
  for (; i <= Math.min(e1, e2); i += 1) {
    if (c1[i].type !== c2[i].type || c1[i].props.key !== c2[i].props.key) break;
    else patch(c1[i], c2[i], container, parent, anchor);
  }
  // 从右往左看, 如果类型不同或者 key 不同就退出, 否则递归更新子节点
  for (; e1 >= 0 && e2 >= 0; e1 -= 1, e2 -= 1)
    if (c1[e1].type !== c2[e2].type || c1[e1].props.key !== c2[e2].props.key)
      break;
    else patch(c1[e1], c2[e2], container, parent, anchor);
  // 右侧有新节点
  if (i === c1.length)
    c2.slice(i).forEach((d) =>
      patch(null, d, container, parent, i >= c2.length ? null : c2[i].el)
    );
  // 右侧有老节点
  //     传入的是 vNode 要加上 el 找到 DOM 对象
  if (i === c2.length) c1.slice(i).forEach((d) => d.el.remove());
  // 左侧有新节点
  if (e1 === -1 && e2 !== -1)
    c2.slice(0, e2 + 1).forEach((d) =>
      patch(null, d, container, parent, c1[0].el)
    );
  // 左侧有老节点
  if (e2 === -1 && e1 !== -1) c1.slice(0, e1).forEach((d) => d.el.remove());
  // 中间
  if (i <= Math.min(e1, e2)) {
    const newRange = c2.slice(i, e2 + 1);
    const oldRange = c1.slice(i, e1 + 1);
    const k2iNew = new Map(newRange.map((d, idx) => [d.props.key, i + idx]));
    const k2iOld = new Set(oldRange.map((d) => d.props.key));

    oldRange.forEach((d) => {
       // 新的有, 老的有 直接更新
      if (k2iNew.has(d.props.key)) {
        patch(
          d,
          c2[k2iNew.get(d.props.key) as number],
          container,
          parent,
          anchor
        );
      // 新的没有, 老的有 直接删除
      } else if (!k2iNew.has(d.props.key)) {
        d.el.remove();
        k2iOld.delete(d.props.key);
      }
    });
    // 新的有老的没有 新建到问题区间的尾部
    newRange.forEach((d) => {
      if (!k2iOld.has(d.props.key)) {
        patch(
          null,
          c2[k2iNew.get(d.props.key) as number],
          container,
          parent,
          e2 + 1 < c2.length ? c2[e2 + 1].el : null
        );
        k2iOld.add(d.props.key);
      }
    });
    // ... 调整位置
  }
}
```

**存在的问题**

- 在中间对比时: 新的有老的没有的情况可以合并到调整位置上

- 为只用四个 if 考虑了特殊情况, 没有考虑特殊情况的的扩展

  ```ts
  old = [a b c d e f]
  new = [a b     e f]
  ```

  既然从左往右看 `[a b]` 一样, 我们可以假装消掉 `[a b]` 把 `[c d]` 看成只有左侧有多于元素的情况此时直接消除 `[c d]` 即可, 类似的还有

  ```ts
  old = [a b     e f]
  new = [a b c d e f]
  ```

  如果可以特判这种情况就爽死了

**别个的实现**

mini-vue 的实现和原版的差不多

```ts
function patchKeyedChildren( c1, c2, container, parentAnchor, parentComponent) {
  let i = 0;
  const l2 = c2.length;
  let e1 = c1.length - 1;
  let e2 = l2 - 1;

  const isSameVNodeType = (n1, n2) => {
    return n1.type === n2.type && n1.key === n2.key;
  };

  // ... 求 i e1 e2
  // 人家在这里是比较了 e1 e2 i 的关系, 这样变相的 "消除" 掉了前后置元素
  if (i > e1 && i <= e2) {
    const nextPos = e2 + 1;
    const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
    while (i <= e2) {
      patch(null, c2[i], container, anchor, parentComponent);
      i++;
    }
  } else if (i > e2 && i <= e1) {
    while (i <= e1) {
      hostRemove(c1[i].el);
      i++;
    }
  } else {
    // ... 中间对比
  }
}
```

这个明显不如四个 if 来的直观, 但是顺道处理了特殊情况的扩展情况. 有一说一 vuejs/core 在这一段中代码的注释中也没有提起这种情况, 但是通过这个泛泛的判断条件我们确实捕获到了这种情况. 看起来这是一个无意为之的优化?

**最终实现**

- 实现 diff

    ```ts
    // @packages/runtime-core/src/render.ts
    function patchKeyedChildren(c1: any[], c2: any[], container, parent, anchor) {
      let i = 0,
        e1 = c1.length - 1,
        e2 = c2.length - 1;
      const isSameType = (v1, v2) =>
        v1.type === v2.type && v1.props.key === v2.props.key;
      // 找到区间
      for (; i <= Math.min(e1, e2); i += 1)
        if (!isSameType(c1[i], c2[i])) break;
        else patch(c1[i], c2[i], container, parent, anchor);
      for (; e1 >= 0 && e2 >= 0; e1 -= 1, e2 -= 1)
        if (!isSameType(c1[e1], c2[e2])) break;
        else patch(c1[e1], c2[e2], container, parent, anchor);
      // 特判
      if (e2 < i && i <= e1) c1.slice(i, e1 + 1).forEach((d) => d.el.remove());
      else if (e1 < i && i <= e2)
        c2.slice(i, e2 + 1).forEach((d) =>
          patch(
            null,
            d,
            container,
            parent,
            e1 + 1 >= c1.length ? null : c1[e1 + 1].el
          )
        );
      // 中间
      else if (i <= Math.min(e1, e2)) {
        const newRange = c2.slice(i, e2 + 1);
        const oldRange = c1.slice(i, e1 + 1);
        const new2oldIndex = new Map(); // 新节点 index -> 老节点 index
        const key2indexNew = new Map( // 新节点 key -> 新节点 index
          newRange.map((d, idx) => [d.props.key, i + idx])
        );
        // 如果老节点在新节点中存在 构造 新节点 index -> 老节点 index
        //                     不存在 删除老节点
        oldRange.forEach((vnode, idx) => {
          if (key2indexNew.has(vnode.props.key)) {
            new2oldIndex.set(key2indexNew.get(vnode.props.key), idx);
          } else vnode.el.remove();
        });
        const lis = LIS([...new2oldIndex.keys()]); // 构建稳定序列
        newRange.reduceRight(
          (prev, cur, curIndex) => {
            const oldVnode = oldRange[new2oldIndex.get(curIndex + i)]; // 对应老节点(如果存在)
            if (lis.includes(curIndex + i)) // 处于稳定序列就只更新
              return patch(oldVnode, cur, container, parent, prev?.el);
            if (new2oldIndex.has(curIndex + i)) { // 不在就移动节点
              container.insertBefore(oldVnode.el, prev?.el);
              patch(oldVnode, cur, container, parent, prev?.el);
            } else patch(null, cur, container, parent, prev?.el); // 没有老节点就加入
            return cur;
          },
          e2 + 1 >= c2.length ? null : c2[e2 + 1]
        );
      }
    }
    ```

- 实现 LIS

  定义 `low` 数组, `low[i]` 表示长度为 `i` 的LIS结尾元素的最小值. 对于一个上升子序列，显然其结尾元素越小, 越有利于在后面接其他的元素, 也就越可能变得更长. 因此, 我们只需要维护 `low` 数组，对于每一个 `s[i]`，如果 `s[i] > low[当前最长的LIS长度]`，就把 `a[i]` 接到当前最长的 LIS 后面，即 `low[++当前最长的LIS长度] = a[i]`
  对于每一个 `s[i]` ，如果 `s[i]` 能接到 LIS 后面，就接上去. 否则，就用 `s[i]` 取更新 `low` 数组。具体方法是, 在 `low` 数组中找到第一个大于等于 `s[i]` 的元素 `low[j]`, 用 `s[i]` 去更新 `low[j]`. 如果从头到尾扫一遍 `low` 数组的话，时间复杂度仍是 $O(n^2)$. 我们注意到 `low` 数组内部一定是单调不降的. 所有我们可以二分 `low` 数组，找出第一个大于等于 `s[i]` 的元素. 总时间复杂度为 $O(n \log n)$

  ```ts
  // @packages/share/index.ts
  export function LIS(s) {
    const low = [...s];
    const res = [0];
    const len = s.length;
    for (let i = 0, j; i < len; i++) {
      const cur = s[i];
      if (cur !== 0) {
        j = res[res.length - 1];
        if (s[j] < cur) {
          low[i] = j;
          res.push(i);
          continue;
        }
        let u = 0;
        let v = res.length - 1;
        while (u < v) {
          const c = (u + v) >> 1;
          if (s[res[c]] < cur) u = c + 1;
          else v = c;
        }
        if (cur < s[res[u]]) {
          if (u > 0) low[i] = res[u - 1];
          res[u] = i;
        }
      }
    }
    let u = res.length;
    let v = res[u - 1];
    while (u-- > 0) {
      res[u] = v;
      v = low[v];
    }
    return res;
  }
  ```

**为什么要用双端对比法**

- 双端对比法的理论性能可能并不是最优秀的, 但是其用于前端 vNode list 的对比很优秀, 因为前端 DOM 的修改很少涉及全局修改, 一般都是一两个元素的增减调换, 双端对比法可以快速锁定修改区间, 忽略不变部分, LIS 可以保证在较少插入次数下实现位置调整
- 为什么要讨论特殊情况, 明明可以直接利用最后的通用算法求解. 首先这个特判会让单次 update 快很多, 同时考虑前端应用场景, update 单个头尾 / 中部元素比较频繁, 这个特判会被特别多次调用

### 组件更新

组件 vNode 更新时 `setupRenderEffect` 会触发 `patch(组件vNode, ...)` 最后 `updateComponent`

不管组件有多复杂我们更新的都是组件挂载的 DOM, 组件的 render 返回的是一个 `h` 也就是说组件最多有一个根 DOM, 我们可以直接更新这个 DOM.

我们更新的时候拿到的是 vNode, 但是为组件传入的 props 还在 instance 上, 我们需要为 vNode 绑定 instance (使用 `.component` 属性)

```ts
// @packages/runtime-core/src/render.ts
function updateComponent(vNode1, vNode2, container, parent, anchor) {
  vNode2.el = vNode1.el; // 绑定 DOM
  vNode2.component = vNode1.component; // 绑定 instance
  // 判断 props 一不一样: 一样就不更新 (说明是父节点触发了, 递归到子节点)
  //                      不一样就重新渲染这个组件下的 vNode
  if (isSameProps(vNode1.props, vNode2.props)) {
    vNode1.component.vNode = vNode2;
  } else {
    // 我们要手动触发这个唯一的子 vNode 的render, 所以还需要保存每个 vNode 的 render 函数
    // 保存在 `.runner`
    // 同时记录 .next 为新 vNode
    vNode1.component.next = vNode2;
    // 调用老 vNode 的渲染函数
    vNode1.component?.runner && vNode1.component.runner();
  }
}
```

判断组件是否有必要更新(`props` 一不一样)

```ts
// @packages/runtime-core/src/component.ts
export function isSameProps(props1 = {}, props2 = {}) {
  let res = true;
  const props = [...new Set([...Object.keys(props1), ...Object.keys(props2)])];
  props.forEach((k) => props1[k] !== props2[k] && (res = false));
  return res;
}
```

在挂载组件时同步记录 instance

```diff
// @packages/runtime-core/src/render.ts
function mountComponent(vNode, container, parent, anchor) {
  const instance = createComponent(vNode, parent);
+ vNode.component = instance;
  setupComponent(instance);
  setupRenderEffect(instance, container, anchor);
}
```

在重新渲染组件时迁移 props

```diff
// @packages/runtime-core/src/component.ts
export function setupRenderEffect(instance, container, anchor) {
+ instance.runner = effect(() => {
    const subTree = instance.render.call(instance.proxy);
+   if (instance.next) {
+     instance.vNode = instance.next;
+     instance.props = instance.next.props;
+     instance.next = null;
+   }
    patch(instance.subTree, subTree, container, instance, anchor);
    instance.vNode.el = container;
    instance.subTree = subTree;
  });
}
```
