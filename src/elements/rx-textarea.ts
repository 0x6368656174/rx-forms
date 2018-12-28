import isEqual from 'lodash-es/isEqual';
import { BehaviorSubject, fromEvent, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
import { maxLength, minLength, Validators } from '../validators';
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
import { Elements } from './elements';
import { updateAttribute } from './utils';

enum RxTextareaAttributes {
  MaxLength = 'maxlength',
  MinLength = 'minlength',
}

function throwInvalidMaxLength() {
  throw new Error(`Attribute "${RxTextareaAttributes.MaxLength}" of <${RxTextarea.tagName}> must be number.`);
}

function throwInvalidMinLength() {
  throw new Error(`Attribute "${RxTextareaAttributes.MinLength}" of <${RxTextarea.tagName}> must be number.`);
}

function subscribeToValueChanges(control: RxTextarea): void {
  const data = getPrivate(control);

  fromEvent(control, 'input')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      data.value$.next(control.value);
    });
}

interface RxTextareaPrivate extends ControlBehaviourSubjects<string> {
  readonly maxLength$: BehaviorSubject<number | null>;
  readonly minLength$: BehaviorSubject<number | null>;
}

const privateData: WeakMap<RxTextarea, RxTextareaPrivate> = new WeakMap();

function createPrivate(instance: RxTextarea): RxTextareaPrivate {
  const data = {
    disabled$: new BehaviorSubject<boolean>(false),
    disconnected$: new Subject<void>(),
    maxLength$: new BehaviorSubject<number | null>(null),
    minLength$: new BehaviorSubject<number | null>(null),
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

function getPrivate(instance: RxTextarea): RxTextareaPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function setValidators(control: RxTextarea): void {
  control.rxMaxLength.pipe(takeUntil(control.rxDisconnected)).subscribe(length => {
    if (!length) {
      control.removeValidator(Validators.MaxLength);
    } else {
      control.setValidator(Validators.MaxLength, maxLength(control.rxValue, length));
    }
  });

  control.rxMinLength.pipe(takeUntil(control.rxDisconnected)).subscribe(length => {
    if (!length) {
      control.removeValidator(Validators.MinLength);
    } else {
      control.setValidator(Validators.MinLength, minLength(control.rxValue, length));
    }
  });
}

function subscribeToAttributeObservables(control: RxTextarea): void {
  control.rxMaxLength.pipe(takeUntil(control.rxDisconnected)).subscribe(length => {
    updateAttribute(control, RxTextareaAttributes.MaxLength, length ? length.toString() : null);
  });

  control.rxMinLength.pipe(takeUntil(control.rxDisconnected)).subscribe(length => {
    updateAttribute(control, RxTextareaAttributes.MinLength, length ? length.toString() : null);
  });
}

function subscribeToObservables(control: RxTextarea): void {
  subscribeToValueChanges(control);
  subscribeToAttributeObservables(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * @internal
 */
export class RxTextarea extends HTMLTextAreaElement implements Control<string> {
  /** Тэг */
  static readonly tagName: string = Elements.RxTextarea;

  /** @internal */
  static readonly observedAttributes = [
    ...controlObservedAttributes,
    RxTextareaAttributes.MaxLength,
    RxTextareaAttributes.MinLength,
  ];

  /**
   * Максимальная длина
   */
  readonly rxMaxLength: Observable<number | null>;
  /**
   * Минимальная длина
   */
  readonly rxMinLength: Observable<number | null>;

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
  readonly rxSet: Observable<boolean>;
  readonly rxEnabled: Observable<boolean>;
  readonly rxDisabled: Observable<boolean>;

  constructor() {
    super();

    checkControlRequiredAttributes(this, RxTextarea.tagName);

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

    this.rxMaxLength = getPrivate(this)
      .maxLength$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxMinLength = getPrivate(this)
      .minLength$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxSet = this.rxValue.pipe(
      map(value => value.length !== 0),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    setValidators(this);
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

  setEnabled(enabled: boolean): void {
    getPrivate(this).disabled$.next(!enabled);
  }

  setDisabled(disabled: boolean): void {
    getPrivate(this).disabled$.next(disabled);
  }

  getName(): string {
    return getPrivate(this).name$.getValue();
  }

  getValue(): string {
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

  /**
   * Устанавливает максимальную длину
   *
   * @param length Максимальная длина
   */
  setMaxLength(length: number | null) {
    getPrivate(this).maxLength$.next(length);
  }

  /**
   * Устанавливает минимальную длину
   *
   * @param length Минимальная длина
   */
  setMinLength(length: number | null) {
    getPrivate(this).minLength$.next(length);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case RxTextareaAttributes.MaxLength: {
        const length = newValue ? Number(newValue) : null;
        if (length !== null && Number.isNaN(length)) {
          throw throwInvalidMaxLength();
        }

        this.setMaxLength(length);
        break;
      }
      case RxTextareaAttributes.MinLength: {
        const length = newValue ? Number(newValue) : null;
        if (length !== null && Number.isNaN(length)) {
          throw throwInvalidMinLength();
        }

        this.setMinLength(length);
        break;
      }
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxTextarea.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this);

    subscribeToControlObservables(this, this, RxTextarea.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxTextarea.tagName, RxTextarea, { extends: 'textarea' });
