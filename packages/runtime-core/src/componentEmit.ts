export function emit(instance, event, ...args) {
  let eventName = event;
  if (/-([a-z])/.test(eventName))
    eventName = eventName.replace(/-([a-z])/, (_, lc) => lc.toUpperCase());
  if (/[a-z].*/.test(eventName))
    eventName = eventName[0].toUpperCase() + eventName.slice(1);
  eventName = 'on' + eventName;
  instance.vNode.props[eventName] && instance.vNode.props[eventName](args);
}
