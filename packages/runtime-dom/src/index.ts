import { createRenderer } from '../../runtime-core/src/render';
import { isUNKey } from '../../share';

export const createElement = document.createElement.bind(document);

export const createText = document.createTextNode.bind(document);

export const remove = (el) => el.parent && el.parent.remove(el);

export const insert = (el, parent, anchor) => parent.insertBefore(el, anchor);

export const setText = (el, text) => (el.nodeValue = text);

export const setElementText = (el, text) => (el.textContent = text);

export function patchProps(elem: HTMLElement, oldProps = {}, newProps = {}) {
  oldProps ??= {};
  newProps ??= {};
  const props = [
    ...new Set([...Object.keys(oldProps), ...Object.keys(newProps)]),
  ];
  props.forEach((k) => {
    let ek = /^on[A-Z]/.test(k)
      ? k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1))
      : undefined;
    if (isUNKey(k, oldProps) && !isUNKey(k, newProps))
      ek ? elem.removeEventListener(ek, oldProps[k]) : elem.removeAttribute(k);
    else if (isUNKey(k, newProps))
      ek
        ? elem.addEventListener(ek, newProps[k])
        : elem.setAttribute(k, newProps[k]);
  });
}

let renderer;

function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer({
      createElement,
      createText,
      setText,
      setElementText,
      patchProps,
      insert,
      remove,
    }))
  );
}

export const createApp = (...args) => {
  return ensureRenderer().createApp(...args);
};

export * from '../../runtime-core/src';
