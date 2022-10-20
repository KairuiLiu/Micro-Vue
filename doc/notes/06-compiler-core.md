## 实现 compiler-core

```mermaid
graph LR

string(输入string) --> parse(parse模块) --> ast1(输出AST树) --> transform(transform模块对树CRUD) --> ast2(输出AST树) --> CodeGen(CodeGen模块) --> render(输出render)
```

构建相关模块

```ts
@packages/compiler-core
├── src
│   └── index.ts
└── __tests__
```

并导出模块

```ts
export * from './reactivity/src/index';
export * from './runtime-dom/src/index';
export * from './compiler-core/src/index';
```

### parse 模块的插值解析

