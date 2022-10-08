import { createVNode } from './vnode';
import { render } from './render';

export function createApp(rootComponent) {
  return {
    _component: rootComponent,
    mount(container) {
      const vNode = createVNode(rootComponent);
      render(vNode, document.querySelector(container));
    },
  };
}
