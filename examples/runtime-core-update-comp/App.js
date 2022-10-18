import { h, ref } from '../../lib/micro-vue.esm.js';

const Child = {
  setup() {},
  render() {
    return h('div', {}, 'Child' + this.value);
  },
};

export default {
  setup() {
    const selfValue = ref(1);
    const childValue = ref(1);

    window.testSelf = () => selfValue.value++;
    window.testChild = () => childValue.value++;

    return { selfValue, childValue };
  },
  render() {
    return h('div', {}, [
      h('div', {}, 'APP' + this.selfValue),
      h(Child, { value: this.childValue }),
    ]);
  },
};
