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

const after_A_left_check_remove = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
];

const before_A_left_check_remove = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'E' }, 'E'),
];

const after_A_left_check_add = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'E' }, 'E'),
];

const before_A_left_check_add = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
];

const before_A_right_check_add = [...before_A_left_check_add].reverse();
const after_A_right_check_add = [...after_A_left_check_add].reverse();

const before_A_right_check_remove = [...before_A_left_check_remove].reverse();
const after_A_right_check_remove = [...after_A_left_check_remove].reverse();

const before_special_extend_remove = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'D' }, 'D'),
  h('div', { key: 'E' }, 'E'),
];

const after_special_extend_remove = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'E' }, 'E'),
];

// !bug
const after_special_extend_add = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'D' }, 'D'),
  h('div', { key: 'E' }, 'E'),
];

const before_special_extend_add = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'E' }, 'E'),
];

const before_mid_diff = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'D' }, 'D'),
  h('div', { key: 'E' }, 'E'),
  h('div', { key: 'F' }, 'F'),
];

const after_mid_diff = [
  h('div', { key: 'A' }, 'A2'),
  h('div', { key: 'C' }, 'C2'),
  h('div', { key: 'D' }, 'D2'),
  h('div', { key: 'B' }, 'B2'),
  h('div', { key: 'G' }, 'G2'),
  h('div', { key: 'F' }, 'F2'),
];

const diffs = [
  [before_A_left_check_remove, after_A_left_check_remove],
  [before_A_left_check_add, after_A_left_check_add],
  [before_A_right_check_add, after_A_right_check_add],
  [before_A_right_check_remove, after_A_right_check_remove],
  [before_special_extend_remove, after_special_extend_remove],
  [before_special_extend_add, after_special_extend_add],
  [before_mid_diff, after_mid_diff],
];

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
      ? h('div', {}, diffs[6][1])
      : h('div', {}, diffs[6][0]);
  },
};

export default {
  setup() {},
  render() {
    return h(A2A);
  },
};
