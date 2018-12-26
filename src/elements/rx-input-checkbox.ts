import { isEqual } from 'lodash';
import { BehaviorSubject, fromEvent, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, shareReplay, takeUntil } from 'rxjs/operators';
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
import { updateAttribute } from './utils';

function subscribeToValueChanges(control: RxInputCheckbox): void {
  const data = getPrivate(control);

  fromEvent(control, 'change')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      data.value$.next(control.checked);
    });
}

type RxInputCheckboxPrivate = ControlBehaviourSubjects<boolean>;

const privateData: WeakMap<RxInputCheckbox, RxInputCheckboxPrivate> = new WeakMap();

function createPrivate(instance: RxInputCheckbox): RxInputCheckboxPrivate {
  const data = {
    disabled$: new BehaviorSubject<boolean>(false),
    disconnected$: new Subject<void>(),
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
    value$: new BehaviorSubject<boolean>(instance.checked),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxInputCheckbox): RxInputCheckboxPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function subscribeToObservables(control: RxInputCheckbox): void {
  subscribeToValueChanges(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * Чекбокс
 */
export class RxInputCheckbox extends HTMLInputElement implements Control<boolean> {
  /** Тэг */
  static readonly tagName: string = 'rx-input-checkbox';

  /** @internal */
  static readonly observedAttributes = controlObservedAttributes;

  readonly rxDirty: Observable<boolean>;
  readonly rxDisconnected: Observable<void>;
  readonly rxInvalid: Observable<boolean>;
  readonly rxName: Observable<string>;
  readonly rxPristine: Observable<boolean>;
  readonly rxReadonly: Observable<boolean>;
  readonly rxRequired: Observable<boolean>;
  readonly rxTouched: Observable<boolean>;
  readonly rxUntouched: Observable<boolean>;
  readonly rxValid: Observable<boolean>;
  readonly rxValidationErrors: Observable<string[]>;
  readonly rxValue: Observable<boolean>;
  readonly rxSet: Observable<boolean>;
  readonly rxEnabled: Observable<boolean>;
  readonly rxDisabled: Observable<boolean>;

  constructor() {
    super();

    checkControlRequiredAttributes(this, RxInputCheckbox.tagName);

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
    this.rxEnabled = observables.rxEnabled;
    this.rxDisabled = observables.rxDisabled;

    this.rxSet = this.rxValue.pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
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

  setValue(checked: boolean): void {
    getPrivate(this).value$.next(checked);
    updateAttribute(this, 'checked', checked ? '' : null);
    this.markAsDirty();
  }

  setEnabled(enabled: boolean): void {
    getPrivate(this).disabled$.next(!enabled);
  }

  setDisabled(disabled: boolean): void {
    getPrivate(this).disabled$.next(disabled);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    updateControlAttributesBehaviourSubjects(this, name, RxInputCheckbox.tagName, newValue);
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this, RxInputCheckbox.tagName);

    subscribeToControlObservables(this, this, RxInputCheckbox.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this, RxInputCheckbox.tagName);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxInputCheckbox.tagName, RxInputCheckbox, { extends: 'input' });
