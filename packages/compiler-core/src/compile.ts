import { generate } from './codegen';
import { baseParse } from './parse';
import { transform } from './transform';
import { transformExpression } from './transforms/transformExpression';
import { transformElement } from './transforms/transformElement';
import { transformText } from './transforms/transformText';

export function baseCompile(template, options) {
  const ast = baseParse(template);
  transform(
    ast,
    Object.assign(options, {
      nodeTransforms: [transformElement, transformText, transformExpression],
    })
  );
  return generate(ast);
}
