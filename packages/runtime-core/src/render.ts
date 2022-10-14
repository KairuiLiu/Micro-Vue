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
  if (vNode1) return updateElement(vNode1, vNode2, container, parent);
  return mountElement(vNode2, container, parent);
}

function updateElement(vNode1, vNode2, container, parent) {
  const elem = (vNode2.el = vNode1.el);
  patchProps(elem, vNode1?.props, vNode2.props);
  updateChildren(elem, vNode1, vNode2, container, parent);
}

function updateChildren(elem, vNode1, vNode2, container, parent) {
  if (vNode2.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
    if (vNode1.shapeFlags & ShapeFlags.ARRAY_CHILDREN)
      [...elem.children].forEach((d) => d.remove());
    if (vNode2.children !== vNode1.children) elem.textContent = vNode2.children;
  } else {
    if (vNode1.shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      elem.remove();
      vNode2.children.forEach((element) => {
        patch(null, element, container, parent);
      });
    } else {
      patchKeyedChildren(vNode1.children, vNode2.children, container, parent);
    }
  }
}

function patchKeyedChildren(c1, c2, container, parent) {
  let i = 0,
    e1 = c1.length - 1,
    e2 = c2.length - 1;
  for (; i <= Math.min(e1, e2); i += 1)
    if (c1[i].type !== c2[i].type || c1[i].props.key !== c2[i].props.key) break;
  for (; e1 >= 0 && e2 >= 0; e1 -= 1, e2 -= 1)
    if (c1[e1].type !== c2[e2].type || c1[e1].props.key !== c2[e2].props.key)
      break;
  // 右侧有新节点
  if (i === c1.length)
    c2.slice(i).forEach((d) => patch(null, d, container, parent));
  // 右侧有老节点
  //     传入的是 vNode 要加上 el 找到 DOM 对象
  if (i === c2.length) c1.slice(i).forEach((d) => d.el.remove());
  // 左侧有新节点
  debugger;
  if (e1 === -1 && e2 !== -1)
    c2.slice(0, e2 + 1).forEach((d) => patch(null, d, container, parent));
  // 左侧有老节点
  if (e2 === -1 && e1 !== -1) c1.slice(0, e1).forEach((d) => d.el.remove());
  // 中间
  if (i <= Math.min(e1, e2)) {
    console.log('MID DIFF');
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
