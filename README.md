<div align="center">
  <img src="./doc/image/logo.svg" width="128" height="128"/>
  <h2>micro-vue</h2>
  <p>
    <strong>极其简易的 Vue.js 实现</strong>
  </p>
  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=TypeScript&logoColor=white"/>
    <img alt="jest" src="https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=Jest&logoColor=white"/>
    <img alt="jest" src="https://img.shields.io/badge/rollup.js-EC4A3F?style=flat-square&logo=rollup.js&logoColor=white"/>
  </p>
  <h4>
    <a href="">Live Demo</a>
    <span> | </span>
    <a href="https://github.com/KairuiLiu/micro-vue/blob/master/README-EN.md">English</a>
    <span> | </span>
    <a href="https://github.com/KairuiLiu/micro-vue/blob/master/README.md">简体中文</a>
  </h4>
</div>

### ✨ 实现模块

- reactivity
  - reactive
  - effect (stop, scheduler, runner)
  - Readonly
  - isReadonly, isReactive, isProxy
  - ref
  - isRef & unRef & proxyRefs
  - computed
- runtime-core
  - Component & Element & shapeFlags & TextNode
  - props & emit
  - slots
  - nextTick
  - getCurrentInstance
  - provide & inject
  - component-instance
- runtime-dom
- compiler-core
  - Element
  - Text
  - Interpolation

### 🛠️ 安装

```bash
pnpm install
pnpm build
```

### 📃 文档

- [overall](./doc/notes/01-overall.md)
- [reactivity](./doc/notes/02-reactivity.md)
- [runtime-core-mount](./doc/notes/03-runtime-core-mount.md)
- [runtime-core-update](./doc/notes/04-runtime-core-update.md)
- [runtime-dom](./doc/notes/05-runtime-dom.md)
- [compiler-core](./doc/notes/06-compiler-core.md)

### 🥰 参考

- GitHub. 2022. *GitHub - [cuixiaorui/mini-vue](https://github.com/cuixiaorui/mini-vue): 实现最简 vue3 模型( Help you learn more efficiently vue3 source code )*. [online]
- 霍, 春阳., 2022. *Vue.js 设计与实现*. 北京: 人民邮电出版社.
