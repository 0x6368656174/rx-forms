import isEqual from 'lodash-es/isEqual';
import { BehaviorSubject, fromEvent, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
import {
  checkControlRequiredAttributes,
  Control,
  ControlAttributes,
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
  Writeable,
} from './control';
import { Elements } from './elements';

enum RxSelectMultipleAttributes {
  Multiple = 'multiple',
}

function throwAttributeMultipleRequired(): Error {
  return new Error(`Attribute "${RxSelectMultipleAttributes.Multiple}" for <${RxSelectMultiple.tagName}> is required.`);
}

function subscribeToValueChanges(control: RxSelectMultiple): void {
  const data = getPrivate(control);

  fromEvent(control, 'change')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      data.value$.next(getSelectedOptions(control));
    });
}

function getSelectedOptions(control: RxSelectMultiple): string[] {
  const value: string[] = [];
  const options = control.options;

  // tslint:disable-next-line
  for (let i = 0; i < options.length; ++i) {
    const option = options[i];
    if (option.selected) {
      value.push(option.value);
    }
  }

  return value;
}

function selectOptions(control: RxSelectMultiple, selected: string[]) {
  const options = control.options;

  // tslint:disable-next-line
  for (let i = 0; i < options.length; ++i) {
    const option = options[i];

    option.selected = selected.indexOf(option.value) !== -1;
  }
}

interface RxSelectMultiplePrivate extends ControlBehaviourSubjects {
  readonly value$: BehaviorSubject<string[]>;
}

const privateData: WeakMap<RxSelectMultiple, RxSelectMultiplePrivate> = new WeakMap();

function createPrivate(instance: RxSelectMultiple): RxSelectMultiplePrivate {
  // Для селекта нужно иницировать опции
  const value = Array.from(instance.querySelectorAll('option:checked')).map(option => {
    if (!(option instanceof HTMLOptionElement)) {
      throw new Error('Something wrong =(');
    }

    return option.value;
  });

  const data = {
    disabled$: new BehaviorSubject<boolean>(false),
    disconnected$: new Subject<void>(),
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
    value$: new BehaviorSubject<string[]>(value),
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

function subscribeToObservables(control: RxSelectMultiple): void {
  subscribeToValueChanges(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * Множественный селект
 */
export class RxSelectMultiple extends HTMLSelectElement implements Control<string[]> {
  /** Тэг */
  static readonly tagName: string = Elements.RxSelectMultiple;

  /** @internal */
  static readonly observedAttributes = [
    ControlAttributes.Value,
    ...controlObservedAttributes,
    RxSelectMultipleAttributes.Multiple,
  ];

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
  readonly rxValue: Observable<string[]>;
  readonly rxSet: Observable<boolean>;
  readonly rxEnabled: Observable<boolean>;
  readonly rxDisabled: Observable<boolean>;

  setup(this: Writeable<RxSelectMultiple>): void {
    try {
      getPrivate(this);
      return;
    } catch (e) {
      // Приватных данных нет, поэтому создадим их
    }

    checkControlRequiredAttributes(this, RxSelectMultiple.tagName);

    if (!this.hasAttribute(RxSelectMultipleAttributes.Multiple)) {
      throw throwAttributeMultipleRequired();
    }

    const data = createPrivate(this);

    const observables = createControlObservables(data);
    this.rxDisconnected = observables.rxDisconnected;
    this.rxName = observables.rxName;
    this.rxReadonly = observables.rxReadonly;
    this.rxRequired = observables.rxRequired;
    this.rxPristine = observables.rxPristine;
    this.rxDirty = observables.rxDirty;
    this.rxUntouched = observables.rxUntouched;
    this.rxTouched = observables.rxTouched;
    this.rxValid = observables.rxValid;
    this.rxInvalid = observables.rxInvalid;
    this.rxValidationErrors = observables.rxValidationErrors;
    this.rxEnabled = observables.rxEnabled;
    this.rxDisabled = observables.rxDisabled;

    this.rxValue = data.value$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      map(value => [...value]),
      shareReplay(1),
    );

    this.rxSet = this.rxValue.pipe(
      map(value => value.length !== 0),
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

  setValue(value: string[]): void {
    getPrivate(this).value$.next(value);
    selectOptions(this, value);
    this.markAsDirty();
  }

  setEnabled(enabled: boolean): void {
    getPrivate(this).disabled$.next(!enabled);
  }

  setDisabled(disabled: boolean): void {
    getPrivate(this).disabled$.next(disabled);
  }

  getName(): string {
    return getPrivate(this).name$.getValue();
  }

  getValue(): string[] {
    return getPrivate(this).value$.getValue();
  }

  isRequired(): boolean {
    return getPrivate(this).required$.getValue();
  }

  isReadonly(): boolean {
    return getPrivate(this).readonly$.getValue();
  }

  isEnabled(): boolean {
    return !getPrivate(this).disabled$.getValue();
  }

  isDisabled(): boolean {
    return getPrivate(this).disabled$.getValue();
  }

  isTouched(): boolean {
    return !getPrivate(this).untouched$.getValue();
  }

  isUnTouched(): boolean {
    return getPrivate(this).untouched$.getValue();
  }

  isDirty(): boolean {
    return !getPrivate(this).pristine$.getValue();
  }

  isPristine(): boolean {
    return getPrivate(this).pristine$.getValue();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    // TODO: После того, как Safari научится поддерживать Custom Elements v1, убрать от сюда и добавить конструктор
    this.setup();

    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case ControlAttributes.Value:
        getPrivate(this).value$.next(getSelectedOptions(this));
        break;
      case RxSelectMultipleAttributes.Multiple:
        if (newValue === null) {
          throw throwAttributeMultipleRequired();
        }

        break;
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxSelectMultiple.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    // TODO: После того, как Safari научится поддерживать Custom Elements v1, убрать от сюда и добавить конструктор
    this.setup();

    controlConnectedCallback(this);

    subscribeToControlObservables(this, this, RxSelectMultiple.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxSelectMultiple.tagName, RxSelectMultiple, { extends: 'select' });
