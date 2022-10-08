import { h } from '../../lib/micro-vue.esm.js';

export default {
  setup() {},
  render() {
    return h('div', { class: 'title' }, [
      h('span', {class: 'left'}, "111"),
      h('span', {class: 'right'}, "222"),
    ]);
  },
};
