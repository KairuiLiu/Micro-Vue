import { h, ref, renderSlots } from '../../lib/micro-vue.esm.js';

const HelloWorld = {
  setup(props, { emit }) {},
  render() {
    return h('div', {}, [
      renderSlots(this.$slots, 'left'),
      h('span', {}, this.foo),
      renderSlots(this.$slots, 'right'),
      h('span', {}, 'OK'),
      renderSlots(this.$slots),
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
    return h('div', { class: 'title' }, [
      h('span', {}, 'APP'),
      h(HelloWorld, { foo: 'hi' }, {
        left: h('div', {}, 'IM LEFT'),
        right: h('div', {}, 'IM RIGHT'),
        default: [h('div', {}, 'IM D1'),h('div', {}, 'IM D2')]
      }),
    ]);
  },
};
