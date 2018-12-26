import { BehaviorSubject, fromEvent, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  checkControlRequiredAttributes,
  Control,
  ControlBehaviourSubjects,
  controlConnectedCallback,
  controlDisconnectedCallback,
  controlObservedAttributes,
  createControlObservables,
  removeValidator,
  setValidator,
  subscribeToControlObservables,
  unsubscribeFromObservables,
  updateControlAttributesBehaviourSubjects,
  ValidatorsMap,
} from './control';
import { RxSelectMultiple } from './rx-select-multiple';

enum RxSelectAttributes {
  Multiple = 'multiple',
}

function subscribeToValueChanges(control: RxSelect): void {
  fromEvent(control, 'change')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      control.setValue(control.value);
    });
}

function throwAttributeMultipleNotSupported(): Error {
  return new Error(
    `Attribute "${RxSelectAttributes.Multiple}" not supported by <${RxSelect.tagName}>, use <${
      RxSelectMultiple.tagName
    }> instead.`,
  );
}

type RxSelectPrivate = ControlBehaviourSubjects<string>;

const privateData: WeakMap<RxSelect, RxSelectPrivate> = new WeakMap();

function createPrivate(instance: RxSelect): RxSelectPrivate {
  const data = {
    disconnected$: new Subject<void>(),
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
    value$: new BehaviorSubject<string>(instance.value),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxSelect): RxSelectPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function subscribeToObservables(control: RxSelect): void {
  subscribeToValueChanges(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * Селект
 */
export class RxSelect extends HTMLSelectElement implements Control<string> {
  /** Тэг */
  static readonly tagName: string = 'rx-select';

  /** @internal */
  static readonly observedAttributes = [...controlObservedAttributes, RxSelectAttributes.Multiple];

  readonly rxDisconnected: Observable<void>;
  readonly rxDirty: Observable<boolean>;
  readonly rxInvalid: Observable<boolean>;
  readonly rxName: Observable<string>;
  readonly rxPristine: Observable<boolean>;
  readonly rxReadonly: Observable<boolean>;
  readonly rxRequired: Observable<boolean>;
  readonly rxTouched: Observable<boolean>;
  readonly rxUntouched: Observable<boolean>;
  readonly rxValid: Observable<boolean>;
  readonly rxValidationErrors: Observable<string[]>;
  readonly rxValue: Observable<string>;

  constructor() {
    super();

    checkControlRequiredAttributes(this, RxSelect.tagName);

    if (this.hasAttribute(RxSelectAttributes.Multiple)) {
      throw throwAttributeMultipleNotSupported();
    }

    const data = createPrivate(this);

    const observables = createControlObservables(data);
    this.rxDisconnected = observables.rxDisconnected;
    this.rxName = observables.rxName;
    this.rxReadonly = observables.rxReadonly;
    this.rxRequired = observables.rxRequired;
    this.rxValue = observables.rxValue;
    this.rxPristine = observables.rxPristine;
    this.rxDirty = observables.rxDirty;
    this.rxUntouched = observables.rxUntouched;
    this.rxTouched = observables.rxTouched;
    this.rxValid = observables.rxValid;
    this.rxInvalid = observables.rxInvalid;
    this.rxValidationErrors = observables.rxValidationErrors;
  }

  markAsDirty(): void {
    getPrivate(this).pristine$.next(false);
  }

  markAsPristine(): void {
    getPrivate(this).pristine$.next(true);
  }

  markAsTouched(): void {
    getPrivate(this).untouched$.next(false);
  }

  markAsUnTouched(): void {
    getPrivate(this).untouched$.next(true);
  }

  removeValidator(validator: string): void {
    removeValidator(getPrivate(this), validator);
  }

  setName(name: string): void {
    getPrivate(this).name$.next(name);
  }

  setReadonly(readonly: boolean): void {
    getPrivate(this).readonly$.next(readonly);
  }

  setRequired(required: boolean): void {
    getPrivate(this).required$.next(required);
  }

  setValidator(name: string, validator: Observable<boolean>): void {
    setValidator(getPrivate(this), name, validator);
  }

  setValue(value: string): void {
    getPrivate(this).value$.next(value);
    this.value = value;
    this.markAsDirty();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case RxSelectAttributes.Multiple:
        if (newValue !== null) {
          throw throwAttributeMultipleNotSupported();
        }

        break;
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxSelectMultiple.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this, RxSelect.tagName);

    subscribeToControlObservables(this, this, RxSelect.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this, RxSelect.tagName);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxSelect.tagName, RxSelect, { extends: 'select' });