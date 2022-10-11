'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// target: Object => keyMap:(string=>Set)
// keyMap: string => Set
const targetMap = new Map();
let activeEffect;
class EffectReactive {
    constructor(fn, options) {
        this.fn = fn;
        this.runner = this.run.bind(this);
        this.runner.effect = this;
        this.scheduler = options.scheduler;
        this.onStop = options.onStop;
        this.deps = new Set();
        this.active = true;
        this.run();
    }
    run() {
        if (!this.active)
            return this.fn();
        activeEffect = this;
        const res = this.fn();
        activeEffect = undefined;
        return res;
    }
}
function effect(fn, options = {}) {
    return new EffectReactive(fn, options).runner;
}
function track(target, key) {
    if (!activeEffect)
        return;
    if (!targetMap.has(target))
        targetMap.set(target, new Map());
    const keyMap = targetMap.get(target);
    if (!keyMap.has(key))
        keyMap.set(key, new Set());
    trackEffect(keyMap.get(key));
}
function trackEffect(dependenceEffect) {
    // 本来只需要在 track 上判断 activeEffect 但是这个函数可能被 track 或者 RefImpl 调用, 所以还需要在判断一次
    if (!activeEffect)
        return;
    dependenceEffect.add(activeEffect);
    activeEffect.deps.add(dependenceEffect);
}
function trigger(target, key) {
    const keyMap = targetMap.get(target);
    if (!keyMap)
        return;
    const depSet = keyMap.get(key);
    if (!depSet)
        return;
    triggerEffect(depSet);
}
function triggerEffect(depSet) {
    [...depSet].forEach((d) => (d.scheduler ? d.scheduler() : d.run()));
}
function stop(runner) {
    if (!runner.effect.active)
        return;
    runner.effect.active = false;
    [...runner.effect.deps].forEach((d) => d.delete(runner.effect));
    runner.effect.onStop && runner.effect.onStop();
}

function isObject(v) {
    return v !== null && typeof v === 'object';
}
function isFunction(v) {
    return v !== null && typeof v === 'function';
}
function testAndTransArray(v) {
    return Array.isArray(v) ? v : [v];
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this.deps = new Set();
        this._value = isObject(value) ? reactive(value) : value;
        this.rawValue = value;
    }
    // 只需要 value 的 [SET] [GET] 就可以实现
    get value() {
        trackEffect(this.deps); // 依赖追踪
        return this._value;
    }
    set value(newValue) {
        // 重复赋值不触发, 考虑两种情况
        //   - this._value 不是 Object, 直接比较
        //   - this._value 是 Object, 此时 this._value 是一个 reactive, reactive(obj) !== obj, 必须使用原始值比较
        if (this.rawValue === newValue)
            return;
        this.rawValue = newValue;
        this._value = isObject(newValue) ? reactive(newValue) : newValue;
        triggerEffect(this.deps); // 触发依赖
    }
}
function ref(value) {
    return new RefImpl(value);
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function isRef(value) {
    return !!(value === null || value === void 0 ? void 0 : value.__v_isRef);
}
function proxyRefs(origin = {}) {
    return new Proxy(origin, proxyProxyRefConfig);
}

const reactiveFlags = {
    ["__v_isReactive" /* ReactiveFlag.IS_REACTIVE */]: true,
    ["__v_isReadonly" /* ReactiveFlag.IS_READONLY */]: false,
};
const readonlyFlags = {
    ["__v_isReactive" /* ReactiveFlag.IS_REACTIVE */]: false,
    ["__v_isReadonly" /* ReactiveFlag.IS_READONLY */]: true,
};
function get(target, key, receiver) {
    if (Object.keys(reactiveFlags).find((d) => d === key))
        return reactiveFlags[key];
    const res = Reflect.get(target, key, receiver);
    if (isObject(res))
        return reactive(res);
    track(target, key);
    return res;
}
function set(target, key, value, receiver) {
    const res = Reflect.set(target, key, value, receiver);
    trigger(target, key);
    return res;
}
function getReadonly(target, key, receiver) {
    if (Object.keys(readonlyFlags).find((d) => d === key))
        return readonlyFlags[key];
    const res = Reflect.get(target, key, receiver);
    if (isObject(res))
        return readonly(res);
    return res;
}
function getShadowReadonly(target, key, receiver) {
    if (Object.keys(readonlyFlags).find((d) => d === key))
        return readonlyFlags[key];
    // 其实就是不支持嵌套追踪的 readonly
    return Reflect.get(target, key, receiver);
}
function setReadonly(target, key, value, receiver) {
    console.warn('Can not set readonly');
    // 要返回一下设置结果, 如果返回 false 会抛出异常, 而我们只希望静默失效
    return true;
}
function getProxyRef(target, key, receiver) {
    // 不用这么麻烦
    // if (isRef(target[key])) return target[key].value;
    // return target[key];
    return unRef(target[key]);
}
function setProxyRef(target, key, value, receiver) {
    if (isRef(target[key]) && !isRef(value))
        return (target[key].value = value);
    return Reflect.set(target, key, value, receiver);
}
const proxyConfig = {
    get,
    set,
};
const proxyReadonlyConfig = {
    get: getReadonly,
    set: setReadonly,
};
const proxyShadowReadonlyConfig = {
    get: getShadowReadonly,
    set: setReadonly,
};
const proxyProxyRefConfig = {
    get: getProxyRef,
    set: setProxyRef,
};

const reactiveMap = new Map();
const readonlyMap = new Map();
const shadowReadonlyMap = new Map();
function reactive(origin) {
    if (!reactiveMap.has(origin))
        reactiveMap.set(origin, createReactiveObject(origin));
    return reactiveMap.get(origin);
}
function readonly(origin) {
    if (!readonlyMap.has(origin))
        readonlyMap.set(origin, createReactiveObject(origin, true));
    return readonlyMap.get(origin);
}
function shadowReadonly(origin) {
    if (!shadowReadonlyMap.has(origin))
        shadowReadonlyMap.set(origin, createReactiveObject(origin, true, true));
    return shadowReadonlyMap.get(origin);
}
function isReactive(value) {
    return !!value["__v_isReactive" /* ReactiveFlag.IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* ReactiveFlag.IS_READONLY */];
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function createReactiveObject(origin, readonly = false, shadow = false) {
    if (shadow && readonly)
        return new Proxy(origin, proxyShadowReadonlyConfig);
    if (readonly)
        return new Proxy(origin, proxyReadonlyConfig);
    return new Proxy(origin, proxyConfig);
}

class ComputedImpl {
    constructor(fn) {
        this.fn = fn;
        this.old = false;
        this.fst = true;
        this.dep = new Set();
    }
    get value() {
        trackEffect(this.dep);
        if (this.fst) {
            this.fst = false;
            this.effect = new EffectReactive(() => (this._value = this.fn()), {
                scheduler: () => {
                    this.old = true;
                    triggerEffect(this.dep);
                },
            });
        }
        if (this.old) {
            this.old = false;
            this._value = this.effect.runner();
            triggerEffect(this.dep);
        }
        return this._value;
    }
    set value(_) {
        console.warn('Can not set computed value');
    }
}
function computed(origin) {
    return new ComputedImpl(origin);
}

function getShapeFlags(type, children) {
    let res = 0;
    if (!isObject(type))
        res |= 1 /* ShapeFlags.ELEMENT */;
    else if (type.setup)
        res |= 2 /* ShapeFlags.STATEFUL_COMPONENT */;
    if (isObject(children))
        res |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    else
        res |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    return res;
}

const typeSymbol = {
    FragmentNodeNode: Symbol('FragmentNodeNode'),
    TextNode: Symbol('TextNode'),
};
function createVNode(component, props = {}, children = []) {
    return {
        type: component,
        props,
        children,
        shapeFlags: getShapeFlags(component, children),
        el: null,
    };
}

function emit(instance, event, ...args) {
    let eventName = event;
    if (/-([a-z])/.test(eventName))
        eventName = eventName.replace(/-([a-z])/, (_, lc) => lc.toUpperCase());
    if (/[a-z].*/.test(eventName))
        eventName = eventName[0].toUpperCase() + eventName.slice(1);
    eventName = 'on' + eventName;
    instance.vNode.props[eventName] && instance.vNode.props[eventName](args);
}

const specialInstanceKeyMap = {
    $el: (instance) => instance.vNode.el,
    $emit: (instance) => emit.bind(null, instance),
    $slots: (instance) => instance.slots,
};
const publicInstanceProxy = {
    get(target, key, receiver) {
        if (Reflect.has(target.instance.setupResult, key))
            return Reflect.get(target.instance.setupResult, key);
        if (key in target.instance.props)
            return target.instance.props[key];
        if (key in specialInstanceKeyMap)
            return specialInstanceKeyMap[key](target.instance);
        return target.instance[key];
    },
};

function initProps(instance) {
    instance.props = instance.vNode.props;
}

const h = createVNode;

function initSlot(instance) {
    instance.slots = instance.vNode.children || {};
}
function renderSlots(slots, name = 'default', ...args) {
    let rSlots = name in slots ? slots[name](...args) : [];
    rSlots = testAndTransArray(rSlots);
    return h(typeSymbol.FragmentNodeNode, {}, rSlots);
}

function createComponent(vNode) {
    return {
        vNode,
        type: vNode.type,
        render: null,
        setupResult: {},
        proxy: null,
    };
}
function setupComponent(instance) {
    instance.proxy = new Proxy({ instance }, publicInstanceProxy);
    initProps(instance);
    initSlot(instance);
    setupStatefulComponent(instance);
    finishComponentSetup(instance);
}
function setupStatefulComponent(instance) {
    if (instance.vNode.shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */)
        handleSetupResult(instance, instance.type.setup.call(instance, shadowReadonly(instance.props), {
            emit: instance.proxy.$emit,
        }));
    finishComponentSetup(instance);
}
function handleSetupResult(instance, res) {
    if (isFunction(res))
        instance.render = res;
    else
        instance.setupResult = proxyRefs(res);
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    instance.render = instance.render || instance.type.render;
}
function setupRenderEffect(instance, container) {
    const subTree = instance.render.call(instance.proxy);
    patch(null, subTree, container);
    instance.vNode.el = container;
}

function render(vNode, container) {
    patch(null, vNode, container); // 第一次创建没有老元素
}
function patch(vNode1, vNode2, container) {
    switch (vNode2.type) {
        case typeSymbol.FragmentNodeNode:
            processFragmentNode(vNode1, vNode2, container);
            break;
        case typeSymbol.TextNode:
            processTextNode(vNode1, vNode2, container);
            break;
        default:
            if (vNode2.shapeFlags & 1 /* ShapeFlags.ELEMENT */)
                processElement(vNode1, vNode2, container);
            else
                processComponent(vNode1, vNode2, container);
    }
}
function processFragmentNode(vNode1, vNode2, container) {
    if (vNode1)
        return;
    return mountFragmentNode(vNode2, container);
}
function mountFragmentNode(vNode, container) {
    vNode.children.forEach((d) => patch(null, d, container));
}
function processTextNode(vNode1, vNode2, container) {
    if (vNode1)
        return;
    return mountTextNode(vNode2, container);
}
function mountTextNode(vNode, container) {
    const elem = document.createTextNode(vNode.children);
    container.appendChild(elem);
}
function processComponent(vNode1, vNode2, container) {
    if (vNode1)
        return updateComponent();
    return mountComponent(vNode2, container);
}
function updateComponent(vNode1, vNode2, container) { }
function mountComponent(vNode, container) {
    const instance = createComponent(vNode);
    setupComponent(instance);
    setupRenderEffect(instance, container);
}
function processElement(vNode1, vNode2, container) {
    if (vNode1)
        return updateElement();
    return mountElement(vNode2, container);
}
function updateElement(vNode1, vNode2, container) { }
function mountElement(vNode, container) {
    const el = (vNode.el = document.createElement(vNode.type));
    Object.keys(vNode.props).forEach((k) => {
        if (/^on[A-Z]/.test(k))
            el.addEventListener(k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1)), vNode.props[k]);
        else
            el.setAttribute(k, vNode.props[k]);
    });
    if (vNode.shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        vNode.children.forEach((d) => {
            patch(null, d, el);
        });
    }
    else
        el.textContent = vNode.children;
    container.appendChild(el);
}

function createApp(rootComponent) {
    return {
        _component: rootComponent,
        mount(container) {
            const vNode = createVNode(rootComponent);
            render(vNode, document.querySelector(container));
        },
    };
}

exports.computed = computed;
exports.createApp = createApp;
exports.effect = effect;
exports.h = h;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.shadowReadonly = shadowReadonly;
exports.stop = stop;
exports.typeSymbol = typeSymbol;
exports.unRef = unRef;
//# sourceMappingURL=micro-vue.cjs.js.map
