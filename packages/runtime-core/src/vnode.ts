import { getShapeFlags } from './shapeFlags';

export const typeSymbol = {
  FragmentNodeNode: Symbol('FragmentNodeNode'),
  TextNode: Symbol('TextNode'),
};

export function createVNode(component, props = {}, children = []) {
  return {
    type: component,
    props,
    children,
    shapeFlags: getShapeFlags(component, children),
    el: null,
  };
}

export function createTextVNode(text) {
  return createVNode(typeSymbol.TextNode, {}, text);
}
