import { h, ref } from '../../lib/micro-vue.esm.js';

export default {
  setup() {
    let cnt = 1;
    const attrValue = ref(`attrValue${cnt}`);
    const htmlValue = ref(`htmlValue${cnt}`);

    const clickHandler = function() {
      ++cnt;
      attrValue.value = `attrValue${cnt}`;
      htmlValue.value = `htmlValue${cnt}`;
    };

    window.test = clickHandler;

    return { attrValue, htmlValue, clickHandler };
  },
  render() {
    // return h('div', {}, [
      // h('div', { attrValue: this.attrValue }, 'APP'),
    return h('div', {attrValue: this.attrValue}, 'HTML Context:' + this.htmlValue)
      // h('button', { onClick: this.clickHandler }, 'Click to Change'),
    // ]);
  },
};
