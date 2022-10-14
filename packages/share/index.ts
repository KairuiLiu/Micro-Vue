export function isObject(v) {
  return v !== null && typeof v === 'object';
}

export function isFunction(v) {
  return v !== null && typeof v === 'function';
}

export function testAndTransArray(v) {
  return Array.isArray(v) ? v : [v];
}

export function isUN(v) {
  return v === null || v === undefined || Number.isNaN(v);
}

export function isUNKey(k, obj) {
  return k in obj && obj[k] !== null && obj[k] !== undefined && !Number.isNaN(obj[k])
}
