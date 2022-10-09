const specialInstanceKeyMap = {
  $el: (instance) => instance.vNode.el,
};

export const publicInstanceProxy = {
  get(target, key, receiver) {
    if (Reflect.has(target.instance.setupResult, key))
      return Reflect.get(target.instance.setupResult, key);
    if (key in specialInstanceKeyMap)
      return specialInstanceKeyMap[key](target.instance);
    return target.instance[key];
  },
};
