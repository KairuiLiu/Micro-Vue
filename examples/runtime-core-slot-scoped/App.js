import {
  createTextVNode,
  h,
  ref,
  renderSlots,
} from '../../lib/micro-vue.esm.js';

const HelloWorld = {
  setup(props, { emit }) {},
  render() {
    return h('div', {}, [
      renderSlots(this.$slots, 'left'),
      h('span', {}, this.foo),
      renderSlots(this.$slots, 'right', 'wuhu'),
      h('span', {}, 'OK'),
      renderSlots(this.$slots, 'default', 'wula'),
    ]);
  },
};

export default {
  setup() {
    debugger;
    return {
      message: ref('micro-vue'),
    };
  },
  render() {
    return h('div', { class: 'title' }, [
      h('span', {}, 'APP'),
      createTextVNode('im text'),
      h(
        HelloWorld,
        { foo: 'hi' },
        {
          left: () => h('div', {}, 'IM LEFT'),
          right: (foo) => h('div', {}, foo),
          default: (foo) => [h('div', {}, 'IM ' + foo), h('div', {}, 'IM D2')],
        }
      ),
    ]);
  },
};
