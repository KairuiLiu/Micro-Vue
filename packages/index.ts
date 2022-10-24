export * from './reactivity/src/index';
export * from './runtime-dom/src/index';

import { baseCompile } from './compiler-core/src';
import * as runtimeDom from './runtime-dom/src';

export function compileToFunction(template) {
  const { code } = baseCompile(template);
  return new Function('Vue', code)(runtimeDom);
}

runtimeDom.registerRuntimeCompiler(compileToFunction);
