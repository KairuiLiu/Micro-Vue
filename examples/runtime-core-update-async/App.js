import {
  nextTick,
  getCurrentInstance,
  h,
  ref,
  createTextVNode,
} from '../../lib/micro-vue.esm.js';

export default {
  setup() {
    let cnt = ref(1);

    const instance = getCurrentInstance();

    window.test = () => {
      for (; cnt.value < 100; cnt.value++);
      console.log('1', instance.vNode.el.innerHTML);
      nextTick(() => {
        console.log('2', instance.vNode.el.innerHTML);
      });
    };

    return { cnt };
  },
  render() {
    return h('div', {}, 'HTML Context:' + this.cnt);
    // return createTextVNode('HTML Context:' + this.cnt);
  },
};
