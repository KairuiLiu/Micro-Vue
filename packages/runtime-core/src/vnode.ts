export function createVNode(component, props = {}, children = []) {
  return {
    type: component,
    props,
    children,
    el: null,
  };
}
