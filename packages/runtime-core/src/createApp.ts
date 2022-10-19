import { isObject } from '../../share';
import { createVNode } from './vnode';

export function createApp(render, rootComponent) {
  return {
    _component: rootComponent,
    mount(container) {
      const vNode = createVNode(rootComponent);
      render(
        vNode,
        isObject(container)
          ? container
          : document.querySelector(container)
      );
    },
  };
}
