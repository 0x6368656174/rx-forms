import { parse } from 'json5';
import { endsWith, isString, startsWith } from 'lodash';
import { BehaviorSubject, combineLatest, fromEvent, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { createTextMaskInputElement, TextMaskInputElement } from 'text-mask-core';
import { pattern, Validators } from '../validators';
import { AbstractControl } from './abstract-control';

export class RxTextInput extends AbstractControl<string> {
  static tagName: string = 'rx-text-input';
  static get observedAttributes() {
    return [...AbstractControl.observedAttributes, 'validator-pattern', 'validator-required', 'mask'];
  }
  value: Observable<string>;

  protected value$ = new BehaviorSubject<string>('');
  private mask$ = new BehaviorSubject<Array<string | RegExp> | null>(null);
  private textInputMaskElement$: Observable<TextMaskInputElement | null>;

  private input: HTMLInputElement;

  constructor() {
    super();

    this.value = this.value$.asObservable().pipe(
      distinctUntilChanged(),
      shareReplay(1),
    );

    const foundInput = this.querySelector('input');
    if (!foundInput) {
      throw new Error(`<${RxTextInput.tagName}> not found child <input>`);
    }

    this.input = foundInput;

    this.name$.asObservable().subscribe(name => this.input.setAttribute('name', name));

    this.textInputMaskElement$ = this.mask$.asObservable().pipe(
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
    combineLatest(onInput$, this.textInputMaskElement$).subscribe(([_, textInputMaskElement]) => {
      if (textInputMaskElement === null) {
        this.value$.next(this.input.value);
        return;
      }

      textInputMaskElement.update(this.input.value);
      this.value$.next(this.input.value);
    });
  }

  setMask(mask: Array<string | RegExp> | null): void {
    this.mask$.next(mask);
  }

  setPatternValidator(regExp: RegExp | null): void {
    if (!regExp) {
      this.removeValidator(Validators.Pattern);
    } else {
      this.setValidator(Validators.Pattern, pattern(this, regExp));
    }
  }

  setRequiredValidator(required: boolean): void {
    if (!required) {
      this.removeValidator(Validators.Required);
    } else {
      const validator = this.value.pipe(map(value => value !== ''));

      this.setValidator(Validators.Required, validator);
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case 'mask':
        this.updateMaskAttribute(newValue);
        break;
      case 'validator-pattern':
        this.updateValidationPatternAttribute(newValue);
        break;
      case 'validator-required':
        this.updateValidationRequiredAttribute(newValue);
        break;
      default:
        super.attributeChangedCallback(name, oldValue, newValue);
    }
  }

  private updateMaskAttribute(mask: string | null): void {
    if (mask === null) {
      this.setMask(null);
      return;
    }

    let maskStringArray: string[];
    try {
      maskStringArray = parse(`{mask: ${mask.replace(/\\/g, '\\\\')}}`).mask;
    } catch (e) {
      throw new Error(
        `Error on parse mask "${mask}", check syntax. ` +
          `Mask must contains array of strings and RegExp's. RegExp must be in quotes ('/\\d/').`,
      );
    }

    if (maskStringArray.some(element => !isString(element))) {
      throw new Error(
        `Error on parse mask "${mask}", check syntax. ` +
          `Mask must contains array of strings and RegExp's. RegExp must be in quotes ('/\\d/').`,
      );
    }

    const maskArray = maskStringArray.map((element: string) => {
      if (startsWith(element, '/') && endsWith(element, '/')) {
        return new RegExp(element.substr(1, element.length - 2));
      }

      return element;
    });

    this.setMask(maskArray);
  }

  private updateValidationRequiredAttribute(validationRequired: string | null): void {
    this.setRequiredValidator(validationRequired !== null);
  }

  private updateValidationPatternAttribute(validationPatter: string | null): void {
    if (validationPatter) {
      let regExp: RegExp;
      if (startsWith(validationPatter, '/') && endsWith(validationPatter, '/')) {
        regExp = new RegExp(validationPatter.substr(1, validationPatter.length - 2));
      } else {
        regExp = new RegExp(validationPatter);
      }

      this.setPatternValidator(regExp);
    } else {
      this.setPatternValidator(null);
    }
  }
}

customElements.define(RxTextInput.tagName, RxTextInput);
