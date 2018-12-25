import { BehaviorSubject, fromEvent, Observable } from 'rxjs';
import {
  Control,
  ControlBehaviourSubjects,
  controlConnectedCallback,
  controlDisconnectedCallback,
  controlObservedAttributes,
  createControlObservables,
  prepareControl,
  removeValidator,
  setValidator,
  updateControlAttributesBehaviourSubjects,
  ValidatorsMap,
} from './control';
import { updateAttribute } from './utils';

function bindOnInput(this: RxCheckboxInput): void {
  const data = getPrivate(this);

  fromEvent(this, 'change').subscribe(() => {
    data.value$.next(this.checked);
  });
}

interface RxCheckboxInputPrivate extends ControlBehaviourSubjects<boolean> {
  readonly value$: BehaviorSubject<boolean>;
  readonly validators$: BehaviorSubject<ValidatorsMap>;
  readonly pristine$: BehaviorSubject<boolean>;
  readonly untouched$: BehaviorSubject<boolean>;
  readonly name$: BehaviorSubject<string>;
  readonly readonly$: BehaviorSubject<boolean>;
  readonly required$: BehaviorSubject<boolean>;
}

const privateData: WeakMap<RxCheckboxInput, RxCheckboxInputPrivate> = new WeakMap();

function createPrivate(instance: RxCheckboxInput): RxCheckboxInputPrivate {
  const data = {
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

function getPrivate(instance: RxCheckboxInput): RxCheckboxInputPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

/**
 * @internal
 */
export class RxCheckboxInput extends HTMLInputElement implements Control<boolean> {
  /** Тэг */
  static readonly tagName: string = 'rx-checkbox-input';

  /** @internal */
  static readonly observedAttributes = controlObservedAttributes;

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
  readonly rxValue: Observable<boolean>;

  constructor() {
    super();

    const data = createPrivate(this);

    const observables = createControlObservables(data);
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

    fromEvent(this, 'blur').subscribe(() => this.markAsTouched());

    prepareControl(this, RxCheckboxInput.tagName, data);

    bindOnInput.call(this);
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

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    const data = getPrivate(this);

    updateControlAttributesBehaviourSubjects(data, name, RxCheckboxInput.tagName, newValue);
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this, RxCheckboxInput.tagName);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this, RxCheckboxInput.tagName);
  }
}

customElements.define(RxCheckboxInput.tagName, RxCheckboxInput, { extends: 'input' });
