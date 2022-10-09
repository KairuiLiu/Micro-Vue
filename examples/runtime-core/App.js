import { h, ref } from '../../lib/micro-vue.esm.js';

const HelloWorld = {
  setup() {
    return {};
  },
  render() {
    return h('span', {}, 'HWD');
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
      h(HelloWorld, {}, [h('span', {}, '不会渲染')]),
    ]);
  },
};
