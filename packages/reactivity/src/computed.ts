import {
  EffectReactive,
  trackEffect,
  triggerEffect,
} from './effect';

class ComputedImpl {
  old: boolean;
  fst: boolean;
  _value: any;
  dep: Set<EffectReactive>;
  effect!: EffectReactive;

  constructor(public fn) {
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

export function computed(origin) {
  return new ComputedImpl(origin);
}
