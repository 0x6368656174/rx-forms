import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, shareReplay, switchMap, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Control } from './control';
import { CustomElement } from './custom-element';
import { RxFormField } from './rx-form-field';
import { updateAttribute } from './utils';

function findParentFormField(this: RxError): RxFormField<any> {
  const parentFormFiled = this.closest(RxFormField.tagName);
  if (!parentFormFiled || !(parentFormFiled instanceof RxFormField)) {
    throw new Error(`<${RxError.tagName}> must be child of <${RxFormField.tagName}>`);
  }

  return parentFormFiled;
}

function bindObservablesToAttributes(this: RxError): void {
  getPrivate(this)
    .validator$.asObservable()
    .subscribe(validator => {
      updateAttribute(this, RxErrorAttributes.Validator, validator);
    });
}

function throwAttributeValidatorRequired(): Error {
  return new Error(`Attribute "${RxErrorAttributes.Validator}"` + ` for <${RxError.tagName}> is required`);
}

export enum RxErrorAttributes {
  Validator = 'validator',
}

interface RxErrorPrivate {
  readonly unsubscribe$: Subject<void>;
  readonly validator$: BehaviorSubject<string>;
}

const privateData: WeakMap<RxError, RxErrorPrivate> = new WeakMap();

function createPrivate(instance: RxError): RxErrorPrivate {
  const data = {
    unsubscribe$: new Subject<void>(),
    validator$: new BehaviorSubject<string>(''),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxError): RxErrorPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

export class RxError extends HTMLElement implements CustomElement {
  /** @internal */
  static readonly observedAttributes = [RxErrorAttributes.Validator];
  /** Тег */
  static readonly tagName = 'rx-error';
  /**
   * Валидатор
   */
  rxValidator: Observable<string>;

  constructor() {
    super();

    const data = createPrivate(this);

    this.rxValidator = data.validator$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    if (!this.hasAttribute(RxErrorAttributes.Validator)) {
      throw throwAttributeValidatorRequired();
    }

    bindObservablesToAttributes.call(this);
  }

  /**
   * Устанавлиает валидатор
   *
   * @param name Название валидатора
   */
  setValidator(name: string): void {
    getPrivate(this).validator$.next(name);
  }

  /** @internal */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case RxErrorAttributes.Validator:
        if (!newValue) {
          throw throwAttributeValidatorRequired();
        }

        this.setValidator(newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    const data = getPrivate(this);

    findParentFormField
      .call(this)
      .rxControl.pipe(
        filter((control): control is Control<any> => !!control),
        switchMap(control => combineLatest(control.rxValidationErrors, control.rxDirty, control.rxTouched)),
        withLatestFrom(getPrivate(this).validator$),
        map(([[validationErrors, dirty, touched], validator]) => {
          // Если контрол не меняли, то ошибка валидации отображена не должна
          if (!dirty && !touched) {
            return false;
          }

          return validationErrors.indexOf(validator) !== -1;
        }),
        takeUntil(data.unsubscribe$),
      )
      .subscribe(visible => {
        if (visible) {
          this.classList.add(`${RxError.tagName}--visible`);
          this.classList.remove(`${RxError.tagName}--hidden`);
        } else {
          this.classList.remove(`${RxError.tagName}--visible`);
          this.classList.add(`${RxError.tagName}--hidden`);
        }
      });
  }

  /** @internal */
  disconnectedCallback() {
    getPrivate(this).unsubscribe$.next();
  }
}

customElements.define(RxError.tagName, RxError);
