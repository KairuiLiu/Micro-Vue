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
function isUNKey(k, obj) {
    return (k in obj && obj[k] !== null && obj[k] !== undefined && !Number.isNaN(obj[k]));
}
function LIS(s) {
    const low = [...s];
    const res = [0];
    const len = s.length;
    for (let i = 0, j; i < len; i++) {
        const cur = s[i];
        if (cur !== 0) {
            j = res[res.length - 1];
            if (s[j] < cur) {
                low[i] = j;
                res.push(i);
                continue;
            }
            let u = 0;
            let v = res.length - 1;
            while (u < v) {
                const c = (u + v) >> 1;
                if (s[res[c]] < cur)
                    u = c + 1;
                else
                    v = c;
            }
            if (cur < s[res[u]]) {
                if (u > 0)
                    low[i] = res[u - 1];
                res[u] = i;
            }
        }
    }
    let u = res.length;
    let v = res[u - 1];
    while (u-- > 0) {
        res[u] = v;
        v = low[v];
    }
    return res;
}
const isString = (value) => typeof value === 'string';
const toDisplayString = (val) => {
    return String(val);
};

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
    FragmentNode: Symbol('FragmentNode'),
    TextNode: Symbol('TextNode'),
};
function createVNode(component, props = {}, children = []) {
    return {
        type: component,
        props,
        children,
        shapeFlags: getShapeFlags(component, children),
        el: null,
        component: null,
    };
}
function createTextVNode(text) {
    return createVNode(typeSymbol.TextNode, {}, text);
}

function createApp$1(render, rootComponent) {
    return {
        _component: rootComponent,
        mount(container) {
            const vNode = createVNode(rootComponent);
            render(vNode, isObject(container)
                ? container
                : document.querySelector(container));
        },
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
    let rSlots = name in slots ? slots[name] : [];
    rSlots = isObject(rSlots) ? rSlots : rSlots(...args);
    rSlots = testAndTransArray(rSlots);
    return h(typeSymbol.FragmentNode, {}, rSlots);
}

let currentInstance = undefined;
function createComponent(vNode, parent) {
    return {
        vNode,
        type: vNode.type,
        render: null,
        setupResult: {},
        proxy: null,
        slots: {},
        parent,
        provides: parent ? Object.create(parent.provides) : {},
        subTree: null,
        runner: null,
        next: null,
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
    if (instance.vNode.shapeFlags & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        currentInstance = instance;
        handleSetupResult(instance, instance.type.setup(shadowReadonly(instance.props), {
            emit: instance.proxy.$emit,
        }));
        currentInstance = undefined;
    }
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
    instance.render = instance.render || instance.type.render || compiler(instance.type.template);
}
function isSameProps(props1 = {}, props2 = {}) {
    let res = true;
    const props = [...new Set([...Object.keys(props1), ...Object.keys(props2)])];
    props.forEach((k) => props1[k] !== props2[k] && (res = false));
    return res;
}
function nextTick(e) {
    return Promise.resolve().then(e);
}
function componentUpdateFn(instance, container, anchor, patch) {
    const subTree = instance.render.call(instance.proxy, instance.proxy);
    if (instance.next) {
        instance.vNode = instance.next;
        instance.props = instance.next.props;
        instance.next = null;
    }
    patch(instance.subTree, subTree, container, instance, anchor);
    instance.vNode.el = container;
    instance.subTree = subTree;
}
const jobs = new Set();
function insertJob(instance) {
    jobs.add(instance);
    if (jobs.size <= 1)
        nextTick(() => [...jobs].forEach((d) => jobs.delete(d) && d()));
}
function setupRenderEffect(instance, container, anchor, patch) {
    instance.runner = effect(() => componentUpdateFn(instance, container, anchor, patch), {
        scheduler: () => {
            insertJob(instance.runner);
        },
    });
}
function getCurrentInstance() {
    return currentInstance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function createRenderer({ createElement, createText, remove, insert, setText, setElementText, patchProps, }) {
    function render(vNode, container) {
        patch(null, vNode, container); // 第一次创建没有老元素
    }
    function patch(vNode1, vNode2, container, parent = null, anchor = null) {
        switch (vNode2.type) {
            case typeSymbol.FragmentNode:
                processFragmentNode(vNode1, vNode2, container, parent, anchor);
                break;
            case typeSymbol.TextNode:
                processTextNode(vNode1, vNode2, container, anchor);
                break;
            default:
                if (vNode2.shapeFlags & 1 /* ShapeFlags.ELEMENT */)
                    processElement(vNode1, vNode2, container, parent, anchor);
                else
                    processComponent(vNode1, vNode2, container, parent, anchor);
        }
    }
    function processFragmentNode(vNode1, vNode2, container, parent, anchor) {
        if (vNode1)
            return;
        return mountFragmentNode(vNode2, container, parent, anchor);
    }
    function mountFragmentNode(vNode, container, parent, anchor) {
        vNode.children.forEach((d) => patch(null, d, container, parent, anchor));
    }
    function processTextNode(vNode1, vNode2, container, anchor) {
        if (vNode1)
            return setText(vNode1.el, vNode2.children);
        return mountTextNode(vNode2, container, anchor);
    }
    function mountTextNode(vNode, container, anchor) {
        const elem = (vNode.el = createText(vNode.children));
        insert(elem, container, anchor);
    }
    function processComponent(vNode1, vNode2, container, parent, anchor) {
        if (vNode1)
            return updateComponent(vNode1, vNode2);
        return mountComponent(vNode2, container, parent, anchor);
    }
    function updateComponent(vNode1, vNode2, container, parent, anchor) {
        var _a;
        vNode2.el = vNode1.el;
        vNode2.component = vNode1.component;
        if (isSameProps(vNode1.props, vNode2.props)) {
            vNode1.component.vNode = vNode2;
        }
        else {
            vNode1.component.next = vNode2;
            ((_a = vNode1.component) === null || _a === void 0 ? void 0 : _a.runner) && vNode1.component.runner();
        }
    }
    function mountComponent(vNode, container, parent, anchor) {
        const instance = createComponent(vNode, parent);
        vNode.component = instance;
        setupComponent(instance);
        setupRenderEffect(instance, container, anchor, patch);
    }
    function processElement(vNode1, vNode2, container, parent, anchor) {
        if (vNode1)
            return updateElement(vNode1, vNode2, container, parent, anchor);
        return mountElement(vNode2, container, parent, anchor);
    }
    function updateElement(vNode1, vNode2, container, parent, anchor) {
        const elem = (vNode2.el = vNode1.el);
        patchProps(elem, vNode1 === null || vNode1 === void 0 ? void 0 : vNode1.props, vNode2.props);
        updateChildren(vNode1, vNode2, elem, parent, anchor);
    }
    function updateChildren(vNode1, vNode2, container, parent, anchor) {
        if (vNode2.shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (vNode1.shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */)
                [...container.children].forEach((d) => remove(d));
            if (vNode2.children !== vNode1.children)
                setElementText(container, vNode2.children);
        }
        else {
            if (vNode1.shapeFlags & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                setElementText(container, '');
                vNode2.children.forEach((element) => {
                    patch(null, element, container, parent, null);
                });
            }
            else {
                patchKeyedChildren(vNode1.children, vNode2.children, container, parent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parent, anchor) {
        let i = 0, e1 = c1.length - 1, e2 = c2.length - 1;
        const isSameType = (v1, v2) => v1.type === v2.type && v1.props.key === v2.props.key;
        // 找到区间
        for (; i <= Math.min(e1, e2); i += 1)
            if (!isSameType(c1[i], c2[i]))
                break;
            else
                patch(c1[i], c2[i], container, parent, anchor);
        for (; e1 >= 0 && e2 >= 0; e1 -= 1, e2 -= 1)
            if (!isSameType(c1[e1], c2[e2]))
                break;
            else
                patch(c1[e1], c2[e2], container, parent, anchor);
        // 特判
        if (e2 < i && i <= e1)
            c1.slice(i, e1 + 1).forEach((d) => remove(d.el));
        else if (e1 < i && i <= e2)
            c2.slice(i, e2 + 1).forEach((d) => patch(null, d, container, parent, e1 + 1 >= c1.length ? null : c1[e1 + 1].el));
        // 中间
        else if (i <= Math.min(e1, e2)) {
            const newRange = c2.slice(i, e2 + 1);
            const oldRange = c1.slice(i, e1 + 1);
            const new2oldIndex = new Map();
            const key2indexNew = new Map(newRange.map((d, idx) => [d.props.key, i + idx]));
            oldRange.forEach((vnode, idx) => {
                if (key2indexNew.has(vnode.props.key)) {
                    new2oldIndex.set(key2indexNew.get(vnode.props.key), idx);
                }
                else
                    remove(vnode.el);
            });
            const lis = LIS([...new2oldIndex.keys()]);
            newRange.reduceRight((prev, cur, curIndex) => {
                const oldVnode = oldRange[new2oldIndex.get(curIndex + i)];
                if (lis.includes(curIndex + i))
                    return patch(oldVnode, cur, container, parent, prev === null || prev === void 0 ? void 0 : prev.el);
                if (new2oldIndex.has(curIndex + i)) {
                    insert(oldVnode.el, container, prev === null || prev === void 0 ? void 0 : prev.el);
                    patch(oldVnode, cur, container, parent, prev === null || prev === void 0 ? void 0 : prev.el);
                }
                else
                    patch(null, cur, container, parent, prev === null || prev === void 0 ? void 0 : prev.el);
                return cur;
            }, e2 + 1 >= c2.length ? null : c2[e2 + 1]);
        }
    }
    function mountElement(vNode, container, parent, anchor) {
        const el = (vNode.el = createElement(vNode.type));
        patchProps(el, {}, vNode.props);
        if (vNode.shapeFlags & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            vNode.children.forEach((d) => {
                patch(null, d, el, parent, anchor);
            });
        }
        else
            setElementText(el, vNode.children);
        insert(el, container, anchor);
    }
    return {
        render,
        createApp: createApp$1.bind(null, render),
    };
}

function provide(k, v) {
    const currentInstance = getCurrentInstance();
    currentInstance.provides[k] = v;
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    return currentInstance && key in currentInstance.parent.provides
        ? currentInstance.parent.provides[key]
        : defaultValue;
}

const createElement = document.createElement.bind(document);
const createText = document.createTextNode.bind(document);
const remove = (el) => el.parent && el.parent.remove(el);
const insert = (el, parent, anchor) => parent.insertBefore(el, anchor);
const setText = (el, text) => (el.nodeValue = text);
const setElementText = (el, text) => (el.textContent = text);
function patchProps(elem, oldProps = {}, newProps = {}) {
    oldProps !== null && oldProps !== void 0 ? oldProps : (oldProps = {});
    newProps !== null && newProps !== void 0 ? newProps : (newProps = {});
    const props = [
        ...new Set([...Object.keys(oldProps), ...Object.keys(newProps)]),
    ];
    props.forEach((k) => {
        let ek = /^on[A-Z]/.test(k)
            ? k.replace(/^on([A-Z].*)/, (_, e) => e[0].toLowerCase() + e.slice(1))
            : undefined;
        if (isUNKey(k, oldProps) && !isUNKey(k, newProps))
            ek ? elem.removeEventListener(ek, oldProps[k]) : elem.removeAttribute(k);
        else if (isUNKey(k, newProps))
            ek
                ? elem.addEventListener(ek, newProps[k])
                : elem.setAttribute(k, newProps[k]);
    });
}
let renderer;
function ensureRenderer() {
    return (renderer ||
        (renderer = createRenderer({
            createElement,
            createText,
            setText,
            setElementText,
            patchProps,
            insert,
            remove,
        })));
}
const createApp = (...args) => {
    return ensureRenderer().createApp(...args);
};

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createElement: createElement,
    createText: createText,
    remove: remove,
    insert: insert,
    setText: setText,
    setElementText: setElementText,
    patchProps: patchProps,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    nextTick: nextTick,
    registerRuntimeCompiler: registerRuntimeCompiler,
    toDisplayString: toDisplayString,
    provide: provide,
    inject: inject
});

const TO_DISPLAY_STRING = Symbol(`toDisplayString`);
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperNameMap = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode"
};

function generate(ast) {
    const context = createCodegenContext();
    genFunctionPreamble(ast, context);
    const functionName = 'render';
    const args = ['_ctx', '_cache'];
    const signature = args.join(', ');
    context.push(`function ${functionName}(${signature}){`);
    context.push('return ');
    genNode(ast.codegenNode, context);
    context.push('}');
    return {
        code: context.code,
    };
}
function genFunctionPreamble(ast, context) {
    const VueBinging = 'Vue';
    const aliasHelper = (s) => `${helperNameMap[s]}:_${helperNameMap[s]}`;
    if (ast.helpers.length > 0)
        context.push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`);
    context.push('\n');
    context.push('return ');
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperNameMap[key]}`;
        },
    };
    return context;
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    for (let child of node.children)
        if (isString(child))
            context.push(child);
        else
            genNode(child, context);
}
function genElement(node, context) {
    context.push(`${context.helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([node.tag, node.props, node.children]), context);
    context.push(')');
}
function genNodeList(nodes, context) {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node))
            context.push(node);
        else
            genNode(node, context);
        if (i < nodes.length - 1)
            context.push(', ');
    }
}
function genNullable(args) {
    return args.map((arg) => arg || 'null');
}
function genExpression(node, context) {
    context.push(`${node.content}`);
}
function genInterpolation(node, context) {
    context.push(`${context.helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    context.push(')');
}
function genText(node, context) {
    context.push(`'${node.content}'`);
}

function createParserContext(content) {
    return {
        source: content,
    };
}
function createRoot(children) {
    return {
        type: 4 /* NodeTypes.ROOT */,
        children,
        helpers: [],
    };
}
function parseChildren(context) {
    const nodes = [];
    let node = null;
    while (context.source) {
        if (context.source.startsWith('{{'))
            node = parseInterpolation(context);
        else if (/^<[a-zA-Z]/.test(context.source))
            node = parseElement(context);
        else
            node = parseText(context);
        nodes.push(node);
    }
    return nodes;
}
function parseText(context) {
    let content = context.source;
    if (~content.indexOf('{{')) {
        content = content.slice(0, content.indexOf('{{'));
    }
    else if (/<\/?[a-zA-Z].+/.test(content)) {
        content = content.slice(0, content.length - content.match(/<\/?[a-zA-Z].+/).length);
    }
    adviceBy(context, content.length);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content,
    };
}
function parseElement(context) {
    const tagMatch = context.source.match(/^<([a-zA-Z]*)>(.*)<\/\1>/);
    const tag = tagMatch[1];
    adviceBy(context, tagMatch[0].length);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        children: parseChildren(createParserContext(tagMatch[2])),
    };
}
function parseInterpolation(context) {
    const closeDelimiter = '}}';
    const openDelimiter = '{{';
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    adviceBy(context, openDelimiter.length);
    const content = context.source
        .slice(0, closeIndex - openDelimiter.length)
        .trim();
    adviceBy(context, closeIndex);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content,
        },
    };
}
function adviceBy(context, length) {
    context.source = context.source.slice(length);
}
function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context));
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers.push(...context.helpers.keys());
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
function traverseNode(node, context) {
    const exitFns = [];
    for (let i of context.nodeTransforms) {
        const onExit = i(node, context);
        onExit && exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--)
        exitFns[i]();
}
function traverseChildren(node, context) {
    for (let child of node.children)
        traverseNode(child, context);
}
function createRootCodegen(root, context) {
    const { children } = root;
    const child = children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */ && child.codegenNode) {
        const codegenNode = child.codegenNode;
        root.codegenNode = codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function isText(node) {
    return node.type === 0 /* NodeTypes.INTERPOLATION */ || node.type === 3 /* NodeTypes.TEXT */;
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer)
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template, options = {}) {
    const ast = baseParse(template);
    transform(ast, Object.assign(options, {
        nodeTransforms: [transformElement, transformText, transformExpression],
    }));
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompile(template);
    return new Function('Vue', code)(runtimeDom);
}
registerRuntimeCompiler(compileToFunction);

exports.compileToFunction = compileToFunction;
exports.computed = computed;
exports.createApp = createApp;
exports.createElement = createElement;
exports.createElementVNode = createVNode;
exports.createText = createText;
exports.createTextVNode = createTextVNode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.insert = insert;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.nextTick = nextTick;
exports.patchProps = patchProps;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.remove = remove;
exports.renderSlots = renderSlots;
exports.setElementText = setElementText;
exports.setText = setText;
exports.shadowReadonly = shadowReadonly;
exports.stop = stop;
exports.toDisplayString = toDisplayString;
exports.unRef = unRef;
//# sourceMappingURL=micro-vue.cjs.js.map
