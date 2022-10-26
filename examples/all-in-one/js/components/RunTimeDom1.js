import { ref, h, computed } from '../micro-vue.esm.js';

export default {
  setup() {
    const color = ref('#fff0');

    function toRed() {
      color.value = '#ff0000';
    }

    function toGreen() {
      color.value = '#00ff00';
    }

    function toReset() {
      color.value = '#fff0';
    }

    return {
      color,
      toRed,
      toGreen,
      toReset,
    };
  },
  render() {
    return h('div', {}, [
      h('div', { style: 'background-color: ' + this.color }, '点击变换背景色'),
      h('br', {}),
      h(
        'button',
        { onClick: this.toRed, class: 'btn mr', small: true },
        '变为红色'
      ),
      h(
        'button',
        { onClick: this.toGreen, class: 'btn mr', small: true },
        '变为绿色'
      ),
      h('button', { onClick: this.toReset, class: 'btn', small: true }, '恢复'),
    ]);
  },
};
