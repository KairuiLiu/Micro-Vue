import { ref, h, computed } from '../micro-vue.esm.js';

export default {
  setup() {
    const text = ref('反转输入');

    const reversedText = computed(() =>
      text.value.split('').reverse().join('')
    );

    function SetValue(v) {
      text.value = v;
    }

    return {
      reversedText,
      text,
      SetValue,
    };
  },
  render() {
    return h('div', {}, [
      h('input', {
        value: this.text,
        onKeyup: (e) => this.SetValue(e.target.value),
      }),
      h('div', {}, this.reversedText.value),
    ]);
  },
};
