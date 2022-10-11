import {
  h,
  provide,
  inject,
  getCurrentInstance,
} from '../../lib/micro-vue.esm.js';

const ProviderOne = {
  setup() {
    provide('foo', 'F1');
    provide('bar', 'B1');
    return () => h(ProviderTwo);
  },
};

const ProviderTwo = {
  setup() {
    provide('foo', 'F2');
    provide('baz', 'Z2');
    const i_foo = inject('foo');
    const i_bar = inject('bar');
    return () =>
      h('div', {}, [
        h('span', {}, '@ provide 2:'),
        h('span', {}, 'foo: ' + i_foo),
        h('span', {}, 'bar: ' + i_bar),
        h(Consumer),
      ]);
  },
};

const Consumer = {
  setup() {
    const t = getCurrentInstance();
    const i_foo = inject('foo');
    const i_bar = inject('bar');
    const i_baz = inject('baz');
    return () =>
      h('div', {}, [
        h('span', {}, '@ consumer:'),
        h('span', {}, 'foo: ' + i_foo),
        h('span', {}, 'bar: ' + i_bar),
        h('span', {}, 'baz: ' + i_baz),
      ]);
  },
};

export default {
  name: 'App',
  setup() {
    return () => h('div', {}, [h('p', {}, 'apiInject'), h(ProviderOne)]);
  },
};
