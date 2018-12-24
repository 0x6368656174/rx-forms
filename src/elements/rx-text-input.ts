import { parse } from 'json5';
import { endsWith, isEqual, isString, startsWith } from 'lodash';
import { BehaviorSubject, combineLatest, fromEvent, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { createTextMaskInputElement } from 'text-mask-core';
import { pattern, Validators } from '../validators';
import {
  bindControlObservablesToAttributes,
  bindControlObservablesToClass,
  bindControlObservablesToValidators,
  Control,
  ControlBehaviourSubjects,
  controlConnectedCallback,
  controlDisconnectedCallback,
  controlObservedAttributes,
  createControlObservables,
  removeValidator,
  setValidator,
  updateControlAttributesBehaviourSubjects,
  ValidatorsMap,
} from './control';
import { updateAttribute } from './utils';

enum RxTextInputAttributes {
  Mask = 'mask',
  Pattern = 'pattern',
}

interface RxTextInputPrivate extends ControlBehaviourSubjects<string> {
  readonly value$: BehaviorSubject<string>;
  readonly mask$: BehaviorSubject<Array<string | RegExp> | null>;
  readonly pattern$: BehaviorSubject<RegExp | null>;
  readonly validators$: BehaviorSubject<ValidatorsMap>;
  readonly pristine$: BehaviorSubject<boolean>;
  readonly untouched$: BehaviorSubject<boolean>;
  readonly name$: BehaviorSubject<string>;
  readonly readonly$: BehaviorSubject<boolean>;
  readonly required$: BehaviorSubject<boolean>;
}

/**
 * @internal
 */
export class RxTextInput extends HTMLInputElement implements Control<string> {
  /** Тэг */
  static readonly tagName: string = 'rx-text-input';

  /** @internal */
  static readonly observedAttributes = [
    ...controlObservedAttributes,
    RxTextInputAttributes.Pattern,
    RxTextInputAttributes.Mask,
  ];

  private static privateData: WeakMap<RxTextInput, RxTextInputPrivate> = new WeakMap();

  private static createPrivate(instance: RxTextInput): RxTextInputPrivate {
    const privateData = {
      mask$: new BehaviorSubject<Array<string | RegExp> | null>(null),
      name$: new BehaviorSubject<string>(''),
      pattern$: new BehaviorSubject<RegExp | null>(null),
      pristine$: new BehaviorSubject(true),
      readonly$: new BehaviorSubject<boolean>(false),
      required$: new BehaviorSubject<boolean>(false),
      untouched$: new BehaviorSubject(true),
      validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
      value$: new BehaviorSubject<string>(instance.value),
    };

    RxTextInput.privateData.set(instance, privateData);

    return privateData;
  }

  private static getPrivate(instance: RxTextInput): RxTextInputPrivate {
    const data = RxTextInput.privateData.get(instance);
    if (data === undefined) {
      throw new Error('Something wrong =(');
    }

    return data;
  }

  private static maskStringToArray(maskString: string): Array<string | RegExp> {
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

  private static stringToRegExp(stringRegExp: string): RegExp {
    if (startsWith(stringRegExp, '/') && endsWith(stringRegExp, '/')) {
      return new RegExp(stringRegExp.substr(1, stringRegExp.length - 2));
    } else {
      return new RegExp(stringRegExp);
    }
  }

  /**
   * Маска
   */
  readonly rxMask: Observable<Array<string | RegExp> | null>;
  /**
   * Паттер для валидации
   */
  readonly rxPattern: Observable<RegExp | null>;

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

  constructor() {
    super();

    const privateData = RxTextInput.createPrivate(this);

    const observables = createControlObservables(privateData);
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

    this.rxMask = RxTextInput.getPrivate(this)
      .mask$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxPattern = RxTextInput.getPrivate(this)
      .pattern$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    fromEvent(this, 'blur').subscribe(() => this.markAsTouched());

    bindControlObservablesToClass.call(this, RxTextInput.tagName, this);
    bindControlObservablesToAttributes.call(this, this);
    bindControlObservablesToValidators.call(privateData, this);

    this.bindOnInput();
    this.bindValidators();
    this.bindObservablesToAttributes();
  }

  markAsDirty(): void {
    RxTextInput.getPrivate(this).pristine$.next(false);
  }

  markAsPristine(): void {
    RxTextInput.getPrivate(this).pristine$.next(true);
  }

  markAsTouched(): void {
    RxTextInput.getPrivate(this).untouched$.next(false);
  }

  markAsUnTouched(): void {
    RxTextInput.getPrivate(this).untouched$.next(true);
  }

  removeValidator(validator: string): void {
    removeValidator.call(RxTextInput.getPrivate(this), validator);
  }

  setName(name: string): void {
    RxTextInput.getPrivate(this).name$.next(name);
  }

  setReadonly(readonly: boolean): void {
    RxTextInput.getPrivate(this).readonly$.next(readonly);
  }

  setRequired(required: boolean): void {
    RxTextInput.getPrivate(this).required$.next(required);
  }

  setValidator(name: string, validator: Observable<boolean>): void {
    setValidator.call(RxTextInput.getPrivate(this), name, validator);
  }

  setValue(value: string): void {
    RxTextInput.getPrivate(this).value$.next(value);
    this.markAsDirty();
  }

  /**
   * Устанавливает маску
   *
   * @param mask Маска
   */
  setMask(mask: Array<string | RegExp> | null) {
    RxTextInput.getPrivate(this).mask$.next(mask);
  }

  /**
   * Устанавливает паттер для валидации
   *
   * @param regExp Паттер для валидации
   */
  setValidatorPattern(regExp: RegExp | null) {
    RxTextInput.getPrivate(this).pattern$.next(regExp);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case RxTextInputAttributes.Mask:
        RxTextInput.getPrivate(this).mask$.next(newValue !== null ? RxTextInput.maskStringToArray(newValue) : null);
        break;
      case RxTextInputAttributes.Pattern:
        RxTextInput.getPrivate(this).pattern$.next(newValue !== null ? RxTextInput.stringToRegExp(newValue) : null);
        break;
      default:
        updateControlAttributesBehaviourSubjects.call(
          RxTextInput.getPrivate(this),
          name,
          RxTextInput.tagName,
          newValue,
        );
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback.call(this, RxTextInput.tagName);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback.call(this, RxTextInput.tagName);
  }

  private bindOnInput(): void {
    const privateData = RxTextInput.getPrivate(this);

    const textInputMaskElement$ = privateData.mask$.asObservable().pipe(
      map(mask => {
        if (!mask) {
          return null;
        }

        return createTextMaskInputElement({
          inputElement: this,
          mask,
        });
      }),
    );

    const onInput$ = fromEvent(this, 'input');
    combineLatest(onInput$, textInputMaskElement$).subscribe(([_, textInputMaskElement]) => {
      if (textInputMaskElement === null) {
        privateData.value$.next(this.value);
        return;
      }

      textInputMaskElement.update(this.value);
      privateData.value$.next(this.value);
    });
  }

  private bindValidators(): void {
    const privateData = RxTextInput.getPrivate(this);

    privateData.pattern$.asObservable().subscribe(regExp => {
      if (!regExp) {
        removeValidator.call(privateData, Validators.Pattern);
      } else {
        setValidator.call(privateData, Validators.Pattern, pattern(privateData.value$.asObservable(), regExp));
      }
    });
  }

  private bindObservablesToAttributes(): void {
    const privateData = RxTextInput.getPrivate(this);

    privateData.mask$.asObservable().subscribe(mask => {
      const stringMask = mask ? mask.map(element => `'${element.toString()}'`).join(', ') : null;
      updateAttribute(this, RxTextInputAttributes.Mask, stringMask ? `[${stringMask}]` : null);
    });

    privateData.pattern$.asObservable().subscribe(regExp => {
      updateAttribute(this, RxTextInputAttributes.Pattern, regExp ? regExp.toString() : null);
    });
  }
}

customElements.define('rx-text-input', RxTextInput, { extends: 'input' });
