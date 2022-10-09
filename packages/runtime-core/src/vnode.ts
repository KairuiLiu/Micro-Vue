import { getShapeFlags } from './shapeFlags';

export function createVNode(component, props = {}, children = []) {
  return {
    type: component,
    props,
    children,
    shapeFlags: getShapeFlags(component, children),
    el: null,
  };
}
