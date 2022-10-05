import { effect } from './effect';

class ComputedImpl {
  old: boolean;
  fst: boolean;
  _value: any;
  runner: () => any;

  constructor(public fn) {
    this.old = false;
    this.fst = true;
    this.runner = () => undefined;
  }

  get value() {
    if (this.fst) {
      this.fst = false;
      this.runner = effect(() => (this._value = this.fn()), {
        scheduler: () => (this.old = true),
      });
    }
    if (this.old) {
      this.old = false;
      this._value = this.runner();
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
