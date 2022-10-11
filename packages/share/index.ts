export function isObject(v) {
  return v !== null && typeof v === 'object';
}

export function isFunction(v) {
  return v !== null && typeof v === 'function';
}

export function testAndTransArray(v) {
  return Array.isArray(v) ? v : [v];
}
