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
  return (
    k in obj && obj[k] !== null && obj[k] !== undefined && !Number.isNaN(obj[k])
  );
}

export function LIS(s) {
  const low = [...s];
  const res = [0];
  const len = s.length;
  for (let i = 0, j; i < len; i++) {
    const cur = s[i];
    if (cur !== 0) {
      j = res[res.length - 1];
      if (s[j] < cur) {
        low[i] = j;
        res.push(i);
        continue;
      }
      let u = 0;
      let v = res.length - 1;
      while (u < v) {
        const c = (u + v) >> 1;
        if (s[res[c]] < cur) u = c + 1;
        else v = c;
      }
      if (cur < s[res[u]]) {
        if (u > 0) low[i] = res[u - 1];
        res[u] = i;
      }
    }
  }
  let u = res.length;
  let v = res[u - 1];
  while (u-- > 0) {
    res[u] = v;
    v = low[v];
  }
  return res;
}

export const isString = (value) => typeof value === 'string';
export const toDisplayString = (val) => {
  return String(val);
};
