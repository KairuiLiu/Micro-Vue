import { h, ref } from '../../lib/micro-vue.esm.js';

export default {
  setup() {
    const message = ref('micro-vue');
    window.test = () => (message.value = 'hihi');
    return {
      message,
    };
  },
  template: `<div>hi, {{message}}</div>`,
};
