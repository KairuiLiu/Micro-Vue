import { isString } from '../../share';
import { NodeTypes } from './ast';
import {
  CREATE_ELEMENT_VNODE,
  helperNameMap,
  TO_DISPLAY_STRING,
} from './runtimeHelpers';

export function generate(ast) {
  const context = createCodegenContext();
  genFunctionPreamble(ast, context);
  const functionName = 'render';
  const args = ['_ctx', '_cache'];
  const signature = args.join(', ');
  context.push(`function ${functionName}(${signature}){`);
  context.push('return ');
  genNode(ast.codegenNode, context);
  context.push('}');
  return {
    code: context.code,
  };
}

function genFunctionPreamble(ast, context) {
  const VueBinging = 'Vue';
  const aliasHelper = (s) => `${helperNameMap[s]}:_${helperNameMap[s]}`;
  if (ast.helpers.length > 0)
    context.push(
      `const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`
    );
  context.push('\n');
  context.push('return ');
}

function createCodegenContext(): any {
  const context = {
    code: '',
    push(source) {
      context.code += source;
    },
    helper(key) {
      return `_${helperNameMap[key]}`;
    },
  };

  return context;
}

function genNode(node: any, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;
    default:
      break;
  }
}

function genCompoundExpression(node: any, context: any) {
  for (let child of node.children)
    if (isString(child)) context.push(child);
    else genNode(child, context);
}

function genElement(node: any, context: any) {
  context.push(`${context.helper(CREATE_ELEMENT_VNODE)}(`);
  genNodeList(genNullable([node.tag, node.props, node.children]), context);
  context.push(')');
}

function genNodeList(nodes, context) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node)) context.push(node);
    else genNode(node, context);
    if (i < nodes.length - 1) context.push(', ');
  }
}

function genNullable(args: any) {
  return args.map((arg) => arg || 'null');
}

function genExpression(node: any, context: any) {
  context.push(`${node.content}`);
}

function genInterpolation(node: any, context: any) {
  context.push(`${context.helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  context.push(')');
}

function genText(node: any, context: any) {
  context.push(`'${node.content}'`);
}
