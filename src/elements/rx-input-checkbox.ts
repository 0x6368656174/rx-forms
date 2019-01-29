import isEqual from 'lodash-es/isEqual';
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
  Writeable,
} from './control';
import { Elements } from './elements';
import { updateAttribute } from './utils';

enum RxInputCheckboxAttributes {
  Checked = 'checked',
}

function subscribeToValueChanges(control: RxInputCheckbox): void {
  const data = getPrivate(control);

  fromEvent(control, 'change')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => {
      if (data.checked$.getValue() !== control.checked) {
        data.checked$.next(control.checked);
      }
    });
}

interface RxInputCheckboxPrivate extends ControlBehaviourSubjects {
  checked$: BehaviorSubject<boolean>;
}

const privateData: WeakMap<RxInputCheckbox, RxInputCheckboxPrivate> = new WeakMap();

function createPrivate(instance: RxInputCheckbox): RxInputCheckboxPrivate {
  const data = {
    checked$: new BehaviorSubject<boolean>(false),
    disabled$: new BehaviorSubject<boolean>(false),
    disconnected$: new Subject<void>(),
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
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

function subscribeToAttributeObservables(control: RxInputCheckbox): void {
  getPrivate(control)
    .checked$.asObservable()
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(checked => {
      if (control.checked !== checked) {
        updateAttribute(control, RxInputCheckboxAttributes.Checked, checked ? '' : null);
      }
    });
}

function subscribeToObservables(control: RxInputCheckbox): void {
  subscribeToValueChanges(control);
  subscribeToAttributeObservables(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * Чекбокс
 */
export class RxInputCheckbox extends HTMLInputElement implements Control<boolean> {
  /** Тэг */
  static readonly tagName: string = Elements.RxInputCheckbox;

  /** @internal */
  static readonly observedAttributes = [...controlObservedAttributes, RxInputCheckboxAttributes.Checked];

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

  setup(this: Writeable<RxInputCheckbox>): void {
    try {
      getPrivate(this);
      return;
    } catch (e) {
      // Приватных данных нет, поэтому создадим их
    }

    checkControlRequiredAttributes(this, RxInputCheckbox.tagName);

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

    this.rxValue = data.checked$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

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
    getPrivate(this).checked$.next(checked);
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

  getValue(): boolean {
    return getPrivate(this).checked$.getValue();
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
      case RxInputCheckboxAttributes.Checked:
        getPrivate(this).checked$.next(newValue !== null);
        break;
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxInputCheckbox.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    // TODO: После того, как Safari научится поддерживать Custom Elements v1, убрать от сюда и добавить конструктор
    this.setup();

    controlConnectedCallback(this);

    subscribeToControlObservables(this, this, RxInputCheckbox.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxInputCheckbox.tagName, RxInputCheckbox, { extends: 'input' });
