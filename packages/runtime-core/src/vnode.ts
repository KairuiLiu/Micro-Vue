import { getShapeFlags } from './shapeFlags';

export const typeSymbol = {
  FragmentNode: Symbol('FragmentNode'),
  TextNode: Symbol('TextNode'),
};

export function createVNode(component, props = {}, children = []) {
  return {
    type: component,
    props,
    children,
    shapeFlags: getShapeFlags(component, children),
    el: null,
    component: null,
  };
}

export function createTextVNode(text) {
  return createVNode(typeSymbol.TextNode, {}, text);
}
