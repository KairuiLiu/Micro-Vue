import { h, ref, renderSlots } from '../micro-vue.esm.js';

const Son = {
  setup(props, { emit }) {},
  render() {
    return h('div', { class: 'son' }, [
      h('span', {}, '@子组件 props: ' + this.foo),
      h('br', {}, ''),
      renderSlots(this.$slots, 'left'),
      h('span', {}, '😭'),
      renderSlots(this.$slots, 'right'),
    ]);
  },
};

export default {
  setup() {
    return {
      message: ref('micro-vue'),
    };
  },
  render() {
    return h('div', { class: 'parent' }, [
      h('span', {}, '@父组件, 传入 props 与两个具名插槽, 内容: p, q'),
      h(
        Son,
        { foo: 'Hi, 送你一副原道' },
        {
          left: h('span', {}, 'p'),
          right: h('span', {}, 'q'),
        }
      ),
    ]);
  },
};
