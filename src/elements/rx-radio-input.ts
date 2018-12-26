import { BehaviorSubject, combineLatest, fromEvent, Observable, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import {
  checkControlRequiredAttributes,
  Control,
  controlObservedAttributes,
  subscribeToControlObservables,
  unsubscribeFromObservables,
  updateControlAttributesBehaviourSubjects,
} from './control';
import { RadioControl } from './radio-control';
import { RadioControlRegistry } from './radio-control-registry';

function subscribeToValueChanges(control: RxRadioInput): void {
  fromEvent(control, 'change')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      control.setValue(control.value);
    });

  control.rxValue.pipe(takeUntil(control.rxDisconnected)).subscribe(value => {
    if (control.value !== value && control.checked) {
      control.checked = false;
    } else if (control.value === value && !control.checked) {
      control.checked = true;
    }
  });
}

interface RxRadioInputPrivate {
  control$: BehaviorSubject<RadioControl>;
  disconnected$: Subject<void>;
}

const privateData: WeakMap<RxRadioInput, RxRadioInputPrivate> = new WeakMap();

function createPrivate(instance: RxRadioInput): RxRadioInputPrivate {
  const data = {
    control$: new BehaviorSubject<RadioControl>(new RadioControl()),
    disconnected$: new Subject<void>(),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxRadioInput): RxRadioInputPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function getControl(instance: RxRadioInput): RadioControl {
  return getPrivate(instance).control$.getValue();
}

const registry = new RadioControlRegistry();

function subscribeToObservables(control: RxRadioInput): void {
  subscribeToValueChanges(control);

  combineLatest(fromEvent(control, 'blur'))
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * @internal
 */
export class RxRadioInput extends HTMLInputElement implements Control<string | null> {
  /** Тэг */
  static readonly tagName: string = 'rx-radio-input';

  /** @internal */
  static readonly observedAttributes = controlObservedAttributes;

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
  readonly rxValue: Observable<string | null>;

  constructor() {
    super();

    checkControlRequiredAttributes(this, RxRadioInput.tagName);

    const data = createPrivate(this);

    this.rxDisconnected = data.disconnected$.asObservable();

    this.rxName = data.control$.asObservable().pipe(switchMap(control => control.rxName));
    this.rxReadonly = data.control$.asObservable().pipe(switchMap(control => control.rxReadonly));
    this.rxRequired = data.control$.asObservable().pipe(switchMap(control => control.rxRequired));
    this.rxValue = data.control$.asObservable().pipe(switchMap(control => control.rxValue));
    this.rxPristine = data.control$.asObservable().pipe(switchMap(control => control.rxPristine));
    this.rxDirty = data.control$.asObservable().pipe(switchMap(control => control.rxDirty));
    this.rxUntouched = data.control$.asObservable().pipe(switchMap(control => control.rxUntouched));
    this.rxTouched = data.control$.asObservable().pipe(switchMap(control => control.rxTouched));
    this.rxValid = data.control$.asObservable().pipe(switchMap(control => control.rxValid));
    this.rxInvalid = data.control$.asObservable().pipe(switchMap(control => control.rxInvalid));
    this.rxValidationErrors = data.control$.asObservable().pipe(switchMap(control => control.rxValidationErrors));
  }

  markAsDirty(): void {
    getControl(this).markAsDirty();
  }

  markAsPristine(): void {
    getControl(this).markAsPristine();
  }

  markAsTouched(): void {
    getControl(this).markAsTouched();
  }

  markAsUnTouched(): void {
    getControl(this).markAsUnTouched();
  }

  removeValidator(validator: string): void {
    getControl(this).removeValidator(validator);
  }

  setName(name: string): void {
    getControl(this).setName(name);
  }

  setReadonly(readonly: boolean): void {
    getControl(this).setReadonly(readonly);
  }

  setRequired(required: boolean): void {
    getControl(this).setRequired(required);
  }

  setValidator(name: string, validator: Observable<boolean>): void {
    getControl(this).setValidator(name, validator);
  }

  setValue(value: string): void {
    getControl(this).setValue(value);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    updateControlAttributesBehaviourSubjects(this, name, RxRadioInput.tagName, newValue);
  }

  /** @internal */
  connectedCallback() {
    const data = getPrivate(this);

    // Получим текущий контрол
    const control = data.control$.getValue();
    // Зарегистрируем инпут
    const newControl = registry.add(this, control);

    // Если текущий контрол отличается от контрола, который вернул регистр, то заменим текущий контрол на
    // контрол из регистра
    if (control !== newControl) {
      data.control$.next(newControl);
    }

    subscribeToControlObservables(this, this, RxRadioInput.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    const data = getPrivate(this);

    // Удалим инпут из регистра
    registry.remove(this);

    // Создадим новый контрол
    data.control$.next(new RadioControl());

    // Отпишемся
    data.disconnected$.next();

    unsubscribeFromObservables(data);
  }
}

customElements.define(RxRadioInput.tagName, RxRadioInput, { extends: 'input' });
