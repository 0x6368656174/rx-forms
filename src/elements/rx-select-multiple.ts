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

enum RxSelectMultipleAttributes {
  Multiple = 'multiple',
}

function throwAttributeMultipleRequired(): Error {
  return new Error(`Attribute "${RxSelectMultipleAttributes.Multiple}" for <${RxSelectMultiple.tagName}> is required.`);
}

function bindOnInput(this: RxSelectMultiple): void {
  const data = getPrivate(this);

  fromEvent(this, 'change').subscribe(() => {
    data.value$.next(getSelectedOptions.call(this));
  });
}

function getSelectedOptions(this: RxSelectMultiple): string[] {
  const value: string[] = [];
  const options = this.options;

  // tslint:disable-next-line
  for (let i = 0; i < options.length; ++i) {
    const option = options[i];
    if (option.selected) {
      value.push(option.value);
    }
  }

  return value;
}

function selectOptions(this: RxSelectMultiple, selected: string[]) {
  const options = this.options;

  // tslint:disable-next-line
  for (let i = 0; i < options.length; ++i) {
    const option = options[i];

    option.selected = selected.indexOf(option.value) !== -1;
  }
}

interface RxSelectMultiplePrivate extends ControlBehaviourSubjects<string[]> {
  readonly value$: BehaviorSubject<string[]>;
  readonly validators$: BehaviorSubject<ValidatorsMap>;
  readonly pristine$: BehaviorSubject<boolean>;
  readonly untouched$: BehaviorSubject<boolean>;
  readonly name$: BehaviorSubject<string>;
  readonly readonly$: BehaviorSubject<boolean>;
  readonly required$: BehaviorSubject<boolean>;
}

const privateData: WeakMap<RxSelectMultiple, RxSelectMultiplePrivate> = new WeakMap();

function createPrivate(instance: RxSelectMultiple): RxSelectMultiplePrivate {
  const data = {
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
    value$: new BehaviorSubject<string[]>(getSelectedOptions.call(instance)),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxSelectMultiple): RxSelectMultiplePrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

/**
 * @internal
 */
export class RxSelectMultiple extends HTMLSelectElement implements Control<string[]> {
  /** Тэг */
  static readonly tagName: string = 'rx-select-multiple';

  /** @internal */
  static readonly observedAttributes = [...controlObservedAttributes, RxSelectMultipleAttributes.Multiple];

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
  readonly rxValue: Observable<string[]>;

  constructor() {
    super();

    if (!this.hasAttribute(RxSelectMultipleAttributes.Multiple)) {
      throw throwAttributeMultipleRequired();
    }

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

    prepareControl(this, RxSelectMultiple.tagName, data);

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

  setValue(value: string[]): void {
    getPrivate(this).value$.next(value);
    selectOptions.call(this, value);
    this.markAsDirty();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    const data = getPrivate(this);

    switch (name) {
      case RxSelectMultipleAttributes.Multiple:
        if (newValue === null) {
          throw throwAttributeMultipleRequired();
        }

        break;
      default:
        updateControlAttributesBehaviourSubjects(data, name, RxSelectMultiple.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this, RxSelectMultiple.tagName);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this, RxSelectMultiple.tagName);
  }
}

customElements.define(RxSelectMultiple.tagName, RxSelectMultiple, { extends: 'select' });
