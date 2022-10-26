import { h, provide, inject } from '../micro-vue.esm.js';

const Provider = {
  setup() {
    provide('foo', 'Ruru');
    return () =>
      h('div', { class: 'parent' }, [
        h('div', {}, '@父组件: foo = Ruru'),
        h(Consumer),
      ]);
  },
};

const Consumer = {
  setup() {
    const i_foo = inject('foo');
    return () => h('div', {class: 'son'}, [h('span', {}, '@子组件: foo = ' + i_foo)]);
  },
};

export default {
  name: 'App',
  setup() {
    return () => h('div', {}, [h(Provider)]);
  },
};
