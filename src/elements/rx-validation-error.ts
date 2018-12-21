import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { AbstractControl } from './abstract-control';
import { CustomElement } from './custom-element';
import { RxTextInput } from './rx-text-input';

export class RxValidationError extends HTMLElement implements CustomElement {
  /** @internal */
  static get observedAttributes() {
    return ['validator'];
  }
  static tagName = 'rx-validation-error';
  private static controls: string[] = [RxTextInput.tagName];

  private static throwAttributeValidatorRequired(): Error {
    return new Error('Attribute "validator" for rx-validation-error element is required');
  }

  private validator$ = new BehaviorSubject<string>('');
  private unsubscribe$ = new Subject<void>();

  constructor() {
    super();

    if (!this.hasAttribute('validator')) {
      throw RxValidationError.throwAttributeValidatorRequired();
    }
  }

  /**
   * Устанавлиает валидатор
   *
   * @param name Название валидатора
   */
  setValidator(name: string): void {
    this.validator$.next(name);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case 'validator':
        this.updateValidatorAttribute(newValue);
        break;
    }
  }

  connectedCallback() {
    const parentControl = this.findParentControl();
    combineLatest(this.validator$, parentControl.validationErrors)
      .pipe(
        map(([validator, validationErrors]) => validationErrors.indexOf(validator) !== -1),
        takeUntil(this.unsubscribe$),
      )
      .subscribe(visible => {
        if (visible) {
          this.classList.add(`${RxValidationError.tagName}--visible`);
          this.classList.remove(`${RxValidationError.tagName}--hidden`);
        } else {
          this.classList.remove(`${RxValidationError.tagName}--visible`);
          this.classList.add(`${RxValidationError.tagName}--hidden`);
        }
      });
  }

  disconnectedCallback() {
    this.unsubscribe$.next();
  }

  private updateValidatorAttribute(name: string | null): void {
    if (!name) {
      throw RxValidationError.throwAttributeValidatorRequired();
    }

    this.setValidator(name);
  }

  private findParentControl(): AbstractControl<any> {
    const parentControl = this.closest(RxValidationError.controls.join(' '));
    if (!parentControl || !(parentControl instanceof AbstractControl)) {
      const controls = RxValidationError.controls.map(control => `<${control}>`);
      throw new Error(`<${RxValidationError.tagName}> must be child one of ${controls}`);
    }

    return parentControl;
  }
}

customElements.define(RxValidationError.tagName, RxValidationError);
