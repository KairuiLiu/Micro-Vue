import { h, ref } from '../../lib/micro-vue.esm.js';

const T2T = {
  setup() {
    const ot = ref(false);
    window.test = () => {
      ot.value = true;
    };
    return { ot };
  },
  render() {
    return this.ot ? h('div', {}, 'after') : h('div', {}, 'before');
  },
};

const A2T = {
  setup() {
    const ot = ref(false);
    window.test = () => {
      ot.value = true;
    };
    return { ot };
  },
  render() {
    return this.ot
      ? h('div', {}, 'after')
      : h('div', {}, [h('div', {}, 'before'), h('div', {}, 'before')]);
  },
};

const T2A = {
  setup() {
    const ot = ref(false);
    window.test = () => {
      ot.value = true;
    };
    return { ot };
  },
  render() {
    return this.ot
      ? h('div', {}, [h('div', {}, 'after'), h('div', {}, 'after')])
      : h('div', {}, 'before');
  },
};

const after_A_left_check_add = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
];

const before_A_left_check_add = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'E' }, 'E'),
];

const after_A_left_check_remove = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'E' }, 'E'),
];

const before_A_left_check_remove = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
];

const before_A_right_check_add = [...before_A_left_check_add].reverse();
const after_A_right_check_add = [...after_A_left_check_add].reverse();

const before_A_right_check_remove = [...before_A_left_check_remove].reverse();
const after_A_right_check_remove = [...after_A_left_check_remove].reverse();

const A2A = {
  setup() {
    const ot = ref(false);
    window.test = () => {
      ot.value = true;
    };
    return { ot };
  },
  render() {
    return this.ot
      ? h('div', {}, before_A_right_check_remove)
      : h('div', {}, after_A_right_check_remove);
  },
};

export default {
  setup() {},
  render() {
    return h(A2A);
  },
};
