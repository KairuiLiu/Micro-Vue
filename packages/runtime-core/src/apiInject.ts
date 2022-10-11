import { getCurrentInstance } from './component';

export function provide(k, v) {
  const currentInstance = getCurrentInstance() as any;
  currentInstance.provides[k] = v;
}

export function inject(key, defaultValue) {
  const currentInstance = getCurrentInstance() as any;
  return currentInstance && key in currentInstance.parent.provides
    ? currentInstance.parent.provides[key]
    : defaultValue;
}
