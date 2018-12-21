import { parse } from 'json5';
import { endsWith, isEqual, isString, startsWith } from 'lodash';
import { BehaviorSubject, combineLatest, fromEvent, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { createTextMaskInputElement } from 'text-mask-core';
import { pattern, Validators } from '../validators';
import { AbstractControl } from './abstract-control';
import { updateAttribute } from './utils';

export enum RxTextInputAttributes {
  Mask = 'mask',
  ValidatorPattern = 'validator-pattern',
}

export class RxTextInput extends AbstractControl<string> {
  /**
   * Маска
   */
  get mask(): Observable<Array<string | RegExp> | null> {
    return this.mask$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }

  /**
   * Паттера для валидации
   */
  get validatorPattern(): Observable<RegExp | null> {
    return this.validatorPattern$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }

  static readonly tagName: string = 'rx-text-input';
  get tagName(): string {
    return RxTextInput.tagName;
  }

  static readonly observedAttributes = [
    ...AbstractControl.observedAttributes,
    RxTextInputAttributes.ValidatorPattern,
    RxTextInputAttributes.Mask,
  ];

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

  protected readonly value$ = new BehaviorSubject<string>('');
  private readonly mask$ = new BehaviorSubject<Array<string | RegExp> | null>(null);
  private readonly validatorPattern$ = new BehaviorSubject<RegExp | null>(null);

  private readonly input: HTMLInputElement;

  constructor() {
    super();

    const foundInput = this.querySelector('input');
    if (!foundInput) {
      throw new Error(`<${RxTextInput.tagName}> not found child <input>`);
    }

    this.input = foundInput;

    fromEvent(this.input, 'blur').subscribe(() => this.markAsTouched());

    this.bindObservablesToInputAttributes();
    this.bindOnInput();
    this.bindValidators();
    this.bindObservablesToAttributes();
  }

  /**
   * Устанавлиает маску
   *
   * @param mask Маска
   */
  setMask(mask: Array<string | RegExp> | null) {
    this.mask$.next(mask);
  }

  /**
   * Устанавлиает паттер для валидации
   *
   * @param regExp Паттер для валидации
   */
  setValidatorPattern(regExp: RegExp | null) {
    this.validatorPattern$.next(regExp);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case RxTextInputAttributes.Mask:
        this.mask$.next(newValue !== null ? RxTextInput.maskStringToArray(newValue) : null);
        break;
      case RxTextInputAttributes.ValidatorPattern:
        this.validatorPattern$.next(newValue !== null ? RxTextInput.stringToRegExp(newValue) : null);
        break;
      default:
        super.attributeChangedCallback(name, oldValue, newValue);
    }
  }

  private bindObservablesToInputAttributes(): void {
    this.name$.asObservable().subscribe(name => updateAttribute(this.input, 'name', name));
    this.readonly$.asObservable().subscribe(readonly => updateAttribute(this.input, 'readonly', readonly ? '' : null));
  }

  private bindOnInput(): void {
    const textInputMaskElement$ = this.mask$.asObservable().pipe(
      map(mask => {
        if (!mask) {
          return null;
        }

        return createTextMaskInputElement({
          inputElement: this.input,
          mask,
        });
      }),
    );

    const onInput$ = fromEvent(this.input, 'input');
    combineLatest(onInput$, textInputMaskElement$).subscribe(([_, textInputMaskElement]) => {
      if (textInputMaskElement === null) {
        this.value$.next(this.input.value);
        return;
      }

      textInputMaskElement.update(this.input.value);
      this.value$.next(this.input.value);
    });
  }

  private bindValidators(): void {
    this.validatorPattern$.asObservable().subscribe(regExp => {
      if (!regExp) {
        this.removeValidator(Validators.Pattern);
      } else {
        this.setValidator(Validators.Pattern, pattern(this, regExp));
      }
    });

    this.validatorRequired$.asObservable().subscribe(required => {
      if (!required) {
        this.removeValidator(Validators.Required);
      } else {
        const validator = this.value.pipe(map(value => value !== ''));

        this.setValidator(Validators.Required, validator);
      }
    });
  }

  private bindObservablesToAttributes(): void {
    this.mask$.asObservable().subscribe(mask => {
      const stringMask = mask ? mask.map(element => `'${element.toString()}'`).join(', ') : null;
      this.updateAttribute(RxTextInputAttributes.Mask, stringMask ? `[${stringMask}]` : null);
    });

    this.validatorPattern$.asObservable().subscribe(regExp => {
      this.updateAttribute(RxTextInputAttributes.ValidatorPattern, regExp ? regExp.toString() : null);
    });
  }
}

customElements.define(RxTextInput.tagName, RxTextInput);
