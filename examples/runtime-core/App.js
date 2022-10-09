import { h, ref } from '../../lib/micro-vue.esm.js';

export default {
  setup() {
    return {
      message: ref('micro-vue'),
    };
  },
  render() {
    return h('div', { class: 'title' }, 'hi' + this.message);
  },
};
