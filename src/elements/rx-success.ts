import { combineLatest, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { Control } from './control';
import { CustomElement } from './custom-element';
import { RxFormField } from './rx-form-field';

function findParentFormField(this: RxSuccess): RxFormField<any> {
  const parentFormFiled = this.closest(RxFormField.tagName);
  if (!parentFormFiled || !(parentFormFiled instanceof RxFormField)) {
    throw new Error(`<${RxSuccess.tagName}> must be child of <${RxFormField.tagName}>`);
  }

  return parentFormFiled;
}

interface RxSuccessPrivate {
  readonly unsubscribe$: Subject<void>;
}

const privateData: WeakMap<RxSuccess, RxSuccessPrivate> = new WeakMap();

function createPrivate(instance: RxSuccess): RxSuccessPrivate {
  const data = {
    unsubscribe$: new Subject<void>(),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxSuccess): RxSuccessPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

export class RxSuccess extends HTMLElement implements CustomElement {
  /** Тег */
  static readonly tagName = 'rx-success';

  constructor() {
    super();

    createPrivate(this);
  }

  /** @internal */
  connectedCallback() {
    findParentFormField
      .call(this)
      .rxControl.pipe(
        filter((control): control is Control<any> => !!control),
        switchMap(control => combineLatest(control.rxValid, control.rxDirty, control.rxTouched)),
        map(([valid, dirty, touched]) => {
          // Если контрол не меняли, то успех валидации отображена не должен
          if (!dirty && !touched) {
            return false;
          }

          return valid;
        }),
        takeUntil(getPrivate(this).unsubscribe$),
      )
      .subscribe(visible => {
        if (visible) {
          this.classList.add(`${RxSuccess.tagName}--visible`);
          this.classList.remove(`${RxSuccess.tagName}--hidden`);
        } else {
          this.classList.remove(`${RxSuccess.tagName}--visible`);
          this.classList.add(`${RxSuccess.tagName}--hidden`);
        }
      });
  }

  /** @internal */
  disconnectedCallback() {
    getPrivate(this).unsubscribe$.next();
  }
}

customElements.define(RxSuccess.tagName, RxSuccess);
