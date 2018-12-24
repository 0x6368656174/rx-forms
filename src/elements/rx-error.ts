import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, shareReplay, switchMap, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Control } from './control';
import { CustomElement } from './custom-element';
import { RxFormField } from './rx-form-field';
import { updateAttribute } from './utils';

export enum RxErrorAttributes {
  Validator = 'validator',
}

export class RxError extends HTMLElement implements CustomElement {
  /**
   * Валидатор
   */
  get validator(): Observable<string> {
    return this.validator$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }

  /** @internal */
  static readonly observedAttributes = [RxErrorAttributes.Validator];
  /** Тег */
  static readonly tagName = 'rx-error';

  private static throwAttributeValidatorRequired(): Error {
    return new Error(`Attribute "${RxErrorAttributes.Validator}"` + ` for <${RxError.tagName}> is required`);
  }

  private readonly validator$ = new BehaviorSubject<string>('');
  private readonly unsubscribe$ = new Subject<void>();

  constructor() {
    super();

    if (!this.hasAttribute(RxErrorAttributes.Validator)) {
      throw RxError.throwAttributeValidatorRequired();
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

  /** @internal */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case RxErrorAttributes.Validator:
        if (!newValue) {
          throw RxError.throwAttributeValidatorRequired();
        }

        this.validator$.next(newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    this.findParentFormField()
      .rxControl.pipe(
        filter((control): control is Control<any> => !!control),
        switchMap(control => combineLatest(control.rxValidationErrors, control.rxDirty, control.rxTouched)),
        withLatestFrom(this.validator$),
        map(([[validationErrors, dirty, touched], validator]) => {
          // Если контрол не меняли, то ошибка валидации отображена не должна
          if (!dirty && !touched) {
            return false;
          }

          return validationErrors.indexOf(validator) !== -1;
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe(visible => {
        if (visible) {
          this.classList.add(`${RxError.tagName}--visible`);
          this.classList.remove(`${RxError.tagName}--hidden`);
        } else {
          this.classList.remove(`${RxError.tagName}--visible`);
          this.classList.add(`${RxError.tagName}--hidden`);
        }
      });
  }

  /** @internal */
  disconnectedCallback() {
    this.unsubscribe$.next();
  }

  private bindObservablesToAttributes(): void {
    this.validator$.asObservable().subscribe(validator => {
      updateAttribute(this, RxErrorAttributes.Validator, validator);
    });
  }

  private findParentFormField(): RxFormField<any> {
    const parentFormFiled = this.closest(RxFormField.tagName);
    if (!parentFormFiled || !(parentFormFiled instanceof RxFormField)) {
      throw new Error(`<${RxError.tagName}> must be child of <${RxFormField.tagName}>`);
    }

    return parentFormFiled;
  }
}

customElements.define(RxError.tagName, RxError);
