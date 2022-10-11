import {
  createComponent,
  setupComponent,
  setupRenderEffect,
} from './component';
import { ShapeFlags } from './shapeFlags';
import { typeSymbol } from './vnode';

export function render(vNode, container) {
  patch(null, vNode, container); // 第一次创建没有老元素
}

export function patch(vNode1, vNode2, container) {
  switch (vNode2.type) {
    case typeSymbol.FragmentNodeNode:
      processFragmentNode(vNode1, vNode2, container);
      break;
    case typeSymbol.TextNode:
      processTextNode(vNode1, vNode2, container);
      break;
    default:
      if (vNode2.shapeFlags & ShapeFlags.ELEMENT)
        processElement(vNode1, vNode2, container);
      else processComponent(vNode1, vNode2, container);
  }
}

function processFragmentNode(vNode1, vNode2, container) {
  if (vNode1) return;
  return mountFragmentNode(vNode2, container);
}

function mountFragmentNode(vNode, container) {
  vNode.children.forEach((d) => patch(null, d, container));
}

function processTextNode(vNode1, vNode2, container) {
  if (vNode1) return;
  return mountTextNode(vNode2, container);
}

function mountTextNode(vNode, container) {
  const elem = document.createTextNode(vNode.children);
  container.appendChild(elem);
}

function processComponent(vNode1, vNode2, container) {
  if (vNode1) return updateComponent(vNode1, vNode2, container);
  return mountComponent(vNode2, container);
}

function updateComponent(vNode1, vNode2, container) {}

function mountComponent(vNode, container) {
  const instance = createComponent(vNode);
  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function processElement(vNode1, vNode2, container) {
  if (vNode1) return updateElement(vNode1, vNode2, container);
  return mountElement(vNode2, container);
}

function updateElement(vNode1, vNode2, container) {}

function mountElement(vNode, container) {
  const el = (vNode.el = document.createElement(vNode.type) as HTMLElement);
  Object.keys(vNode.props).forEach((k) => {
    if (/^on[A-Z]/.test(k))
      el.addEventListener(
        k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1)),
        vNode.props[k]
      );
    else el.setAttribute(k, vNode.props[k]);
  });
  if (vNode.shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
    vNode.children.forEach((d) => {
      patch(null, d, el);
    });
  } else el.textContent = vNode.children;
  container.appendChild(el);
}
