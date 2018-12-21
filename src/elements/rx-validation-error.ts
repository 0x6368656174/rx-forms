import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
import { AbstractControl } from './abstract-control';
import { CustomElement } from './custom-element';
import { RxTextInput } from './rx-text-input';
import { updateAttribute } from './utils';

export enum RxValidationErrorAttributes {
  Validator = 'validator',
}

export class RxValidationError extends HTMLElement implements CustomElement {
  /**
   * Валидатор
   */
  get validator(): Observable<string> {
    return this.validator$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }
  static observedAttributes = [RxValidationErrorAttributes.Validator];
  static tagName = 'rx-validation-error';
  private static controls: string[] = [RxTextInput.tagName];

  private static throwAttributeValidatorRequired(): Error {
    return new Error(
      `Attribute "${RxValidationErrorAttributes.Validator}"` + ` for <${RxValidationError.tagName}> is required`,
    );
  }

  private validator$ = new BehaviorSubject<string>('');
  private unsubscribe$ = new Subject<void>();

  constructor() {
    super();

    if (!this.hasAttribute(RxValidationErrorAttributes.Validator)) {
      throw RxValidationError.throwAttributeValidatorRequired();
    }

    this.bindObservablesToAttributes();
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
      case RxValidationErrorAttributes.Validator:
        if (!newValue) {
          throw RxValidationError.throwAttributeValidatorRequired();
        }

        this.validator$.next(newValue);
        break;
    }
  }

  connectedCallback() {
    const parentControl = this.findParentControl();
    combineLatest(this.validator$, parentControl.validationErrors, parentControl.dirty, parentControl.touched)
      .pipe(
        map(([validator, validationErrors, dirty, touched]) => {
          // Если контрол не меняли, то ошибка валидации отображена не долна быть
          if (!dirty && !touched) {
            return false;
          }

          return validationErrors.indexOf(validator) !== -1;
        }),
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

  private bindObservablesToAttributes(): void {
    this.validator$.asObservable().subscribe(validator => {
      updateAttribute(this, RxValidationErrorAttributes.Validator, validator);
    });
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
