import { createRenderer } from '../../lib/micro-vue.esm.js';
export * from '../../lib/micro-vue.esm.js';

export const createElement = (v) => {
  const rect = new PIXI.Graphics();
  rect.beginFill(0xff0000);
  rect.drawRect(0, 0, 100, 100);
  rect.endFill();
  return rect;
};

export const insert = (el, parent, anchor) => parent.addChild(el);

export function patchProps(elem, oldProps = {}, newProps = {}) {
  const props = [
    ...new Set([...Object.keys(oldProps), ...Object.keys(newProps)]),
  ];
  props.forEach((k) => {
    elem[k] = newProps[k];
  });
}

let renderer;

function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer({
      createElement,
      createText: null,
      setText: null,
      setElementText: null,
      patchProps,
      insert,
      remove: null,
    }))
  );
}

export const createApp = (...args) => {
  return ensureRenderer().createApp(...args);
};

const game = new PIXI.Application({ width: 640, height: 360 });

document.body.append(game.view);
export const el = game.stage;
