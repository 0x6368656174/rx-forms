import isEqual from 'lodash-es/isEqual';
import { BehaviorSubject, fromEvent, merge, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
import { maxNumber, minNumber, Validators } from '../validators';
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

enum RxInputRangeAttributes {
  Max = 'max',
  Min = 'min',
}

function throwInvalidMaxMin(attribute: RxInputRangeAttributes.Max | RxInputRangeAttributes.Min) {
  throw new Error(`Attribute "${attribute}" of <${RxInputRange.tagName}> must be number.`);
}

function subscribeToValueChanges(control: RxInputRange): void {
  const data = getPrivate(control);

  merge(fromEvent(control, 'change'), fromEvent(control, 'input'))
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      const value: number = Number(control.value);

      data.value$.next(value);
    });
}

interface RxInputRangePrivate extends ControlBehaviourSubjects<number> {
  readonly max$: BehaviorSubject<number | null>;
  readonly min$: BehaviorSubject<number | null>;
}

const privateData: WeakMap<RxInputRange, RxInputRangePrivate> = new WeakMap();

function createPrivate(instance: RxInputRange): RxInputRangePrivate {
  const data = {
    disabled$: new BehaviorSubject<boolean>(false),
    disconnected$: new Subject<void>(),
    max$: new BehaviorSubject<number | null>(null),
    min$: new BehaviorSubject<number | null>(null),
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
    value$: new BehaviorSubject<number>(Number(instance.value)),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxInputRange): RxInputRangePrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function setValidators(control: RxInputRange): void {
  const data = getPrivate(control);

  const validator = control.rxValue.pipe(map(value => (value !== null ? !Number.isNaN(value) : true)));

  setValidator(data, Validators.Format, validator);

  control.rxMax.pipe(takeUntil(control.rxDisconnected)).subscribe(max => {
    if (!max) {
      control.removeValidator(Validators.Max);
    } else {
      control.setValidator(Validators.Max, maxNumber(control.rxValue, max));
    }
  });

  control.rxMin.pipe(takeUntil(control.rxDisconnected)).subscribe(min => {
    if (!min) {
      control.removeValidator(Validators.Min);
    } else {
      control.setValidator(Validators.Min, minNumber(control.rxValue, min));
    }
  });
}

function subscribeToAttributeObservables(control: RxInputRange): void {
  control.rxMax.pipe(takeUntil(control.rxDisconnected)).subscribe(value => {
    updateAttribute(control, RxInputRangeAttributes.Max, value ? value.toString() : null);
  });

  control.rxMin.pipe(takeUntil(control.rxDisconnected)).subscribe(value => {
    updateAttribute(control, RxInputRangeAttributes.Min, value ? value.toString() : null);
  });
}

function subscribeToObservables(control: RxInputRange): void {
  subscribeToValueChanges(control);
  subscribeToAttributeObservables(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * @internal
 */
export class RxInputRange extends HTMLInputElement implements Control<number> {
  /** Тэг */
  static readonly tagName: string = Elements.RxInputRange;

  /** @internal */
  static readonly observedAttributes = [
    ...controlObservedAttributes,
    RxInputRangeAttributes.Max,
    RxInputRangeAttributes.Min,
  ];

  /**
   * Максимальное значение
   */
  readonly rxMax: Observable<number | null>;
  /**
   * Минимальное значение
   */
  readonly rxMin: Observable<number | null>;

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
  readonly rxValue: Observable<number>;
  readonly rxSet: Observable<boolean>;
  readonly rxEnabled: Observable<boolean>;
  readonly rxDisabled: Observable<boolean>;

  constructor() {
    super();

    checkControlRequiredAttributes(this, RxInputRange.tagName);

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
    this.rxSet = of(true);
    this.rxEnabled = observables.rxEnabled;
    this.rxDisabled = observables.rxDisabled;

    this.rxMax = getPrivate(this)
      .max$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxMin = getPrivate(this)
      .min$.asObservable()
      .pipe(
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

  setValue(value: number): void {
    getPrivate(this).value$.next(value);
    this.value = value.toString();
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

  getValue(): number {
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
   * Устанавливает максимальное значение
   *
   * @param max Максимальная длина
   */
  setMax(max: number | null) {
    getPrivate(this).max$.next(max);
  }

  /**
   * Устанавливает минимальное значение
   *
   * @param min Минимальная длина
   */
  setMin(min: number | null) {
    getPrivate(this).min$.next(min);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case RxInputRangeAttributes.Max: {
        const value = newValue ? Number(newValue.replace(',', '.')) : null;
        if (value !== null && Number.isNaN(value)) {
          throw throwInvalidMaxMin(RxInputRangeAttributes.Max);
        }

        this.setMax(value);
        break;
      }
      case RxInputRangeAttributes.Min: {
        const value = newValue ? Number(newValue.replace(',', '.')) : null;
        if (value !== null && Number.isNaN(value)) {
          throw throwInvalidMaxMin(RxInputRangeAttributes.Min);
        }

        this.setMin(value);
        break;
      }
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxInputRange.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this);

    subscribeToControlObservables(this, this, RxInputRange.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxInputRange.tagName, RxInputRange, { extends: 'input' });
