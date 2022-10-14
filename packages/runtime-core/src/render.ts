import { isUNKey } from '../../share';
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

export function patch(vNode1, vNode2, container, parent = null) {
  switch (vNode2.type) {
    case typeSymbol.FragmentNode:
      processFragmentNode(vNode1, vNode2, container);
      break;
    case typeSymbol.TextNode:
      processTextNode(vNode1, vNode2, container);
      break;
    default:
      if (vNode2.shapeFlags & ShapeFlags.ELEMENT)
        processElement(vNode1, vNode2, container, parent);
      else processComponent(vNode1, vNode2, container, parent);
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

function processComponent(vNode1, vNode2, container, parent) {
  if (vNode1) return updateComponent(vNode1, vNode2, container);
  return mountComponent(vNode2, container, parent);
}

function updateComponent(vNode1, vNode2, container) {
  debugger;
}

function mountComponent(vNode, container, parent) {
  const instance = createComponent(vNode, parent);
  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function processElement(vNode1, vNode2, container, parent) {
  if (vNode1) return updateElement(vNode1, vNode2, container);
  return mountElement(vNode2, container, parent);
}

function updateElement(vNode1, vNode2, container) {
  const elem = (vNode2.el = vNode1.el);
  patchProps(elem, vNode1?.props, vNode2.props);
  updateChildren(elem, vNode1, vNode2);
}

function updateChildren(elem, vNode1, vNode2) {
  if (
    vNode1.shapeFlags & ShapeFlags.TEXT_CHILDREN &&
    vNode2.shapeFlags & ShapeFlags.TEXT_CHILDREN
  ) {
    elem.textContent = vNode2.children;
  } else if (
    vNode1.shapeFlags & ShapeFlags.ARRAY_CHILDREN &&
    vNode2.shapeFlags & ShapeFlags.TEXT_CHILDREN
  ) {
    [...elem].forEach((d) => d.remove());
    elem.textContent = vNode2.children;
  } else if (
    vNode1.shapeFlags & ShapeFlags.TEXT_CHILDREN &&
    vNode2.shapeFlags & ShapeFlags.ARRAY_CHILDREN
  ) {
    elem.textContent = '';
    vNode2.children.forEach((element) => {
      patch(null, element, vNode1.el, vNode2.parent);
    });
  } else if (
    vNode1.shapeFlags & ShapeFlags.ARRAY_CHILDREN &&
    vNode2.shapeFlags & ShapeFlags.ARRAY_CHILDREN
  ) {
    console.log('FUCK');
  }
}

function mountElement(vNode, container, parent) {
  const el = (vNode.el = document.createElement(vNode.type) as HTMLElement);
  patchProps(el, {}, vNode.props);
  if (vNode.shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
    vNode.children.forEach((d) => {
      patch(null, d, el, parent);
    });
  } else el.textContent = vNode.children;
  container.appendChild(el);
}

function patchProps(elem: HTMLElement, oldProps = {}, newProps = {}) {
  const props = [
    ...new Set([...Object.keys(oldProps), ...Object.keys(newProps)]),
  ];
  props.forEach((k) => {
    let ek = /^on[A-Z]/.test(k)
      ? k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1))
      : undefined;
    if (isUNKey(k, oldProps) && (!isUNKey(k, newProps) || ek))
      ek ? elem.removeEventListener(ek, oldProps[k]) : elem.removeAttribute(k);
    else if (isUNKey(k, newProps))
      ek
        ? elem.addEventListener(ek, newProps[k])
        : elem.setAttribute(k, newProps[k]);
  });
}
