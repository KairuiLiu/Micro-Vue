import { isObject } from '../../share/index';

export const enum ShapeFlags {
  ELEMENT = 1 << 0,
  STATEFUL_COMPONENT = 1 << 1,
  TEXT_CHILDREN = 1 << 2,
  ARRAY_CHILDREN = 1 << 3,
}

export function getShapeFlags(type, children) {
  let res = 0;
  if (!isObject(type)) res |= ShapeFlags.ELEMENT;
  else if (type.setup) res |= ShapeFlags.STATEFUL_COMPONENT;
  if (isObject(children)) res |= ShapeFlags.ARRAY_CHILDREN;
  else res |= ShapeFlags.TEXT_CHILDREN;
  return res;
}
