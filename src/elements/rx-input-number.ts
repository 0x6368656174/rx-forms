import { isEqual } from 'lodash';
import { BehaviorSubject, fromEvent, merge, Observable, Subject } from 'rxjs';
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
import { updateAttribute } from './utils';

enum RxInputNumberAttributes {
  Max = 'max',
  Min = 'min',
}

function throwInvalidMaxMin(attribute: RxInputNumberAttributes.Max | RxInputNumberAttributes.Min) {
  throw new Error(`Attribute "${attribute}" of <${RxInputNumber.tagName}> must be number.`);
}

function subscribeToValueChanges(control: RxInputNumber): void {
  const data = getPrivate(control);

  merge(fromEvent(control, 'change'), fromEvent(control, 'input'))
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      const controlValue: string | number = control.value.replace(',', '.');
      const value: number | null = control.value ? Number(controlValue) : null;

      data.value$.next(value);
    });
}

interface RxInputNumberPrivate extends ControlBehaviourSubjects<number | null> {
  readonly max$: BehaviorSubject<number | null>;
  readonly min$: BehaviorSubject<number | null>;
}

const privateData: WeakMap<RxInputNumber, RxInputNumberPrivate> = new WeakMap();

function createPrivate(instance: RxInputNumber): RxInputNumberPrivate {
  const value: number | null = instance.value ? Number(instance.value.replace(',', '.')) : null;

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
    value$: new BehaviorSubject<number | null>(value),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxInputNumber): RxInputNumberPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function setValidators(control: RxInputNumber): void {
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

function subscribeToAttributeObservables(control: RxInputNumber): void {
  control.rxMax.pipe(takeUntil(control.rxDisconnected)).subscribe(value => {
    updateAttribute(control, RxInputNumberAttributes.Max, value ? value.toString() : null);
  });

  control.rxMin.pipe(takeUntil(control.rxDisconnected)).subscribe(value => {
    updateAttribute(control, RxInputNumberAttributes.Min, value ? value.toString() : null);
  });
}

function subscribeToObservables(control: RxInputNumber): void {
  subscribeToValueChanges(control);
  subscribeToAttributeObservables(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * @internal
 */
export class RxInputNumber extends HTMLInputElement implements Control<number | null> {
  /** Тэг */
  static readonly tagName: string = 'rx-input-number';

  /** @internal */
  static readonly observedAttributes = [
    ...controlObservedAttributes,
    RxInputNumberAttributes.Max,
    RxInputNumberAttributes.Min,
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
  readonly rxValue: Observable<number | null>;
  readonly rxSet: Observable<boolean>;
  readonly rxEnabled: Observable<boolean>;
  readonly rxDisabled: Observable<boolean>;

  constructor() {
    super();

    checkControlRequiredAttributes(this, RxInputNumber.tagName);

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
    this.rxSet = observables.rxSet;
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

  setValue(value: number | null): void {
    getPrivate(this).value$.next(value);
    this.value = value ? value.toString() : '';
    this.markAsDirty();
  }

  setEnabled(enabled: boolean): void {
    getPrivate(this).disabled$.next(!enabled);
  }

  setDisabled(disabled: boolean): void {
    getPrivate(this).disabled$.next(disabled);
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
      case RxInputNumberAttributes.Max: {
        const value = newValue ? Number(newValue.replace(',', '.')) : null;
        if (value !== null && Number.isNaN(value)) {
          throw throwInvalidMaxMin(RxInputNumberAttributes.Max);
        }

        this.setMax(value);
        break;
      }
      case RxInputNumberAttributes.Min: {
        const value = newValue ? Number(newValue.replace(',', '.')) : null;
        if (value !== null && Number.isNaN(value)) {
          throw throwInvalidMaxMin(RxInputNumberAttributes.Min);
        }

        this.setMin(value);
        break;
      }
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxInputNumber.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this, RxInputNumber.tagName);

    subscribeToControlObservables(this, this, RxInputNumber.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this, RxInputNumber.tagName);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxInputNumber.tagName, RxInputNumber, { extends: 'input' });
