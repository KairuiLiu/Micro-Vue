import { ref, h } from '../micro-vue.esm.js';

export default {
  setup() {
    const count = ref(0);

    function handleClick() {
      count.value++;
    }

    return {
      count,
      handleClick,
    };
  },
  render() {
    return h('div', {}, [
      h(
        'div',
        { class: 'btn', small: true, onClick: this.handleClick },
        '点击加1: ' + this.count
      ),
    ]);
  },
};
