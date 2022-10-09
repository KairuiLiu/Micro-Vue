import { h, ref } from '../../lib/micro-vue.esm.js';

const HelloWorld = {
  setup(props, { emit }) {
    props.foo++;
    return {
      handleClick: () => {
        emit('ask');
        emit('ask-me');
      },
    };
  },
  render() {
    return h('div', {}, [
      h('span', {}, this.foo),
      h('button', { onClick: this.handleClick }, 'click to emit'),
    ]);
  },
};

export default {
  setup() {
    return {
      message: ref('micro-vue'),
    };
  },
  render() {
    return h('div', { class: 'title' }, [
      h('span', {}, 'APP'),
      h(
        HelloWorld,
        {
          foo: 'hi',
          onAsk: () => console.log('You Clicked'),
          onAskMe: () => console.log('You Clicked 2'),
        },
        [h('span', {}, '不会渲染')]
      ),
    ]);
  },
};
