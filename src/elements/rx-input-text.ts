import { parse } from 'json5';
import { endsWith, isEqual, isString, startsWith } from 'lodash';
import { BehaviorSubject, combineLatest, fromEvent, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
import { createTextMaskInputElement } from 'text-mask-core';
import { maxLength, minLength, pattern, Validators } from '../validators';
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

enum RxInputTextAttributes {
  Mask = 'mask',
  Pattern = 'pattern',
  MaxLength = 'maxlength',
  MinLength = 'minlength',
}

function throwInvalidMaxLength() {
  throw new Error(`Attribute "${RxInputTextAttributes.MaxLength}" of <${RxInputText.tagName}> must be number.`);
}

function throwInvalidMinLength() {
  throw new Error(`Attribute "${RxInputTextAttributes.MinLength}" of <${RxInputText.tagName}> must be number.`);
}

function subscribeToValueChanges(control: RxInputText): void {
  const data = getPrivate(control);

  const textInputMaskElement$ = control.rxMask.pipe(
    map(mask => {
      if (!mask) {
        return null;
      }

      return createTextMaskInputElement({
        inputElement: control,
        mask,
      });
    }),
  );

  const onInput$ = fromEvent(control, 'input');
  combineLatest(onInput$, textInputMaskElement$)
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(([_, textInputMaskElement]) => {
      if (textInputMaskElement === null) {
        data.value$.next(control.value);
        return;
      }

      textInputMaskElement.update(control.value);
      data.value$.next(control.value);
    });
}

function setValidators(control: RxInputText): void {
  control.rxPattern.pipe(takeUntil(control.rxDisconnected)).subscribe(regExp => {
    if (!regExp) {
      control.removeValidator(Validators.Pattern);
    } else {
      control.setValidator(Validators.Pattern, pattern(control.rxValue, regExp));
    }
  });

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

function subscribeToAttributeObservables(control: RxInputText): void {
  control.rxMask.pipe(takeUntil(control.rxDisconnected)).subscribe(mask => {
    const stringMask = mask ? mask.map(element => `'${element.toString()}'`).join(', ') : null;
    updateAttribute(control, RxInputTextAttributes.Mask, stringMask ? `[${stringMask}]` : null);
  });

  control.rxPattern.pipe(takeUntil(control.rxDisconnected)).subscribe(regExp => {
    if (regExp === null) {
      updateAttribute(control, RxInputTextAttributes.Pattern, null);
    } else {
      const patternStr = regExp.toString();
      const patternSubStr = patternStr.substr(1, patternStr.length - 2);
      updateAttribute(control, RxInputTextAttributes.Pattern, patternSubStr);
    }
  });

  control.rxMaxLength.pipe(takeUntil(control.rxDisconnected)).subscribe(length => {
    updateAttribute(control, RxInputTextAttributes.MaxLength, length ? length.toString() : null);
  });

  control.rxMinLength.pipe(takeUntil(control.rxDisconnected)).subscribe(length => {
    updateAttribute(control, RxInputTextAttributes.MinLength, length ? length.toString() : null);
  });
}

function maskStringToArray(maskString: string): Array<string | RegExp> {
  let maskStringArray: string[];

  const throwSyntaxError = (mask: string) => {
    return new Error(
      `Error on parse mask "${mask}", check syntax. ` +
        `Mask must contains array of strings and RegExp's. RegExp must be in quotes ('/\\d/').`,
    );
  };

  try {
    maskStringArray = parse(`{mask: ${maskString.replace(/\\/g, '\\\\')}}`).mask;
  } catch (e) {
    throw throwSyntaxError(maskString);
  }

  if (maskStringArray.some(element => !isString(element))) {
    throw throwSyntaxError(maskString);
  }

  return maskStringArray.map((element: string) => {
    if (startsWith(element, '/') && endsWith(element, '/')) {
      return new RegExp(element.substr(1, element.length - 2));
    }

    return element;
  });
}

function stringToRegExp(stringRegExp: string): RegExp {
  if (startsWith(stringRegExp, '/') && endsWith(stringRegExp, '/')) {
    return new RegExp(stringRegExp.substr(1, stringRegExp.length - 2));
  } else {
    return new RegExp(stringRegExp);
  }
}

interface RxInputTextPrivate extends ControlBehaviourSubjects<string> {
  readonly value$: BehaviorSubject<string>;
  readonly mask$: BehaviorSubject<Array<string | RegExp> | null>;
  readonly pattern$: BehaviorSubject<RegExp | null>;
  readonly maxLength$: BehaviorSubject<number | null>;
  readonly minLength$: BehaviorSubject<number | null>;
}

const privateData: WeakMap<RxInputText, RxInputTextPrivate> = new WeakMap();

function createPrivate(instance: RxInputText): RxInputTextPrivate {
  const data = {
    disabled$: new BehaviorSubject<boolean>(false),
    disconnected$: new Subject<void>(),
    mask$: new BehaviorSubject<Array<string | RegExp> | null>(null),
    maxLength$: new BehaviorSubject<number | null>(null),
    minLength$: new BehaviorSubject<number | null>(null),
    name$: new BehaviorSubject<string>(''),
    pattern$: new BehaviorSubject<RegExp | null>(null),
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

function getPrivate(instance: RxInputText): RxInputTextPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function subscribeToObservables(control: RxInputText): void {
  subscribeToValueChanges(control);
  subscribeToAttributeObservables(control);

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * Поле ввода текста
 */
export class RxInputText extends HTMLInputElement implements Control<string> {
  /** Тэг */
  static readonly tagName: string = 'rx-input-text';

  /** @internal */
  static readonly observedAttributes = [
    ...controlObservedAttributes,
    RxInputTextAttributes.Pattern,
    RxInputTextAttributes.Mask,
    RxInputTextAttributes.MaxLength,
    RxInputTextAttributes.MinLength,
  ];

  /**
   * Маска
   */
  readonly rxMask: Observable<Array<string | RegExp> | null>;
  /**
   * Паттер для валидации
   */
  readonly rxPattern: Observable<RegExp | null>;
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

    checkControlRequiredAttributes(this, RxInputText.tagName);

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

    this.rxMask = getPrivate(this)
      .mask$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxPattern = getPrivate(this)
      .pattern$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

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
   * Устанавливает маску
   *
   * @param mask Маска
   */
  setMask(mask: Array<string | RegExp> | null) {
    getPrivate(this).mask$.next(mask);
  }

  /**
   * Устанавливает паттер для валидации
   *
   * @param regExp Паттер для валидации
   */
  setPattern(regExp: RegExp | null) {
    getPrivate(this).pattern$.next(regExp);
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
      case RxInputTextAttributes.Mask:
        this.setMask(newValue !== null ? maskStringToArray(newValue) : null);
        break;
      case RxInputTextAttributes.Pattern:
        this.setPattern(newValue !== null ? stringToRegExp(newValue) : null);
        break;
      case RxInputTextAttributes.MaxLength: {
        const length = newValue ? Number(newValue) : null;
        if (length !== null && Number.isNaN(length)) {
          throw throwInvalidMaxLength();
        }

        this.setMaxLength(length);
        break;
      }
      case RxInputTextAttributes.MinLength: {
        const length = newValue ? Number(newValue) : null;
        if (length !== null && Number.isNaN(length)) {
          throw throwInvalidMinLength();
        }

        this.setMinLength(length);
        break;
      }
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxInputText.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this, RxInputText.tagName);

    subscribeToControlObservables(this, this, RxInputText.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxInputText.tagName, RxInputText, { extends: 'input' });
