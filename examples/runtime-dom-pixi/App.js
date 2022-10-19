import { h, ref } from '../../lib/micro-vue.esm.js';

export default {
  setup() {
    const x = ref(0);
    const y = ref(0);
    window.test = (x1, y1) => {
      x.value = x1;
      y.value = y1;
    };
    return { x, y };
  },
  render() {
    return h('div', { x: this.x, y: this.y });
  },
};
