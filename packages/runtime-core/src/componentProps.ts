import { shadowReadonly } from '../../index';

export function initProps(instance) {
  instance.props = instance.vNode.props;
}
