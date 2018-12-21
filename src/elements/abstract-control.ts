import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { CustomElement } from './custom-element';
import { updateAttribute } from './utils';

type Validators = Map<string, Observable<boolean>>;

export enum AbstractControlAttributes {
  Name = 'name',
  ValidatorRequired = 'validator-required',
}

/**
 * Контрол формы
 */
export abstract class AbstractControl<T> extends HTMLElement implements CustomElement {
  /**
   * Значение контрола
   */
  get value(): Observable<T> {
    return this.value$.pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }

  /**
   * Признак того, чтоле обязательное
   */
  get validatorRequired(): Observable<boolean> {
    return this.validatorRequired$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }

  /**
   * Имя
   */
  get name(): Observable<string> {
    return this.name$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }
  static observedAttributes: string[] = [AbstractControlAttributes.Name, AbstractControlAttributes.ValidatorRequired];

  private static throwAttributeNameRequired(): Error {
    return new Error(`Attribute "${AbstractControlAttributes.Name}" for any rx-forms controls is required`);
  }

  // /** Значение контрола */
  // abstract value: Observable<T>;
  /** Признак того, что контрол проходит валидацию */
  valid: Observable<boolean>;
  /** Признак того, что контрол не проходит валидацию */
  invalid: Observable<boolean>;
  /** Признак того, что контрол "грязный", т.е. его значение менялось програмно */
  dirty: Observable<boolean>;
  /** Признак того, что контрол "чистый", т.е. его значение не менялось програмно */
  pristine: Observable<boolean>;
  /** Признак того, что контрол принимал и терял фокус */
  touched: Observable<boolean>;
  /** Признак того, что контрол не принимал и не терял фокус */
  untouched: Observable<boolean>;
  /** Список ошибок валидации */
  validationErrors: Observable<string[]>;

  protected abstract value$: BehaviorSubject<T>;
  protected pristine$ = new BehaviorSubject(true);
  protected untouched$ = new BehaviorSubject(true);
  protected validators$ = new BehaviorSubject<Validators>(new Map());
  protected name$ = new BehaviorSubject<string>('');
  protected validatorRequired$ = new BehaviorSubject<boolean>(false);

  protected constructor() {
    super();

    this.pristine = this.pristine$.asObservable();
    this.dirty = this.pristine.pipe(map(value => !value));
    this.untouched = this.untouched$.asObservable();
    this.touched = this.untouched$.pipe(map(value => !value));

    this.valid = this.validators$.asObservable().pipe(
      switchMap(validators => {
        const validators$ = Array.from(validators).map(([_, validator]) => validator);
        return combineLatest(validators$);
      }),
      map(validList => {
        return !validList.some(valid => !valid);
      }),
      shareReplay(1),
    );
    this.invalid = this.valid.pipe(map(value => !value));

    this.validationErrors = this.validators$.asObservable().pipe(
      switchMap(validators => {
        const validators$ = Array.from(validators).map(([name, validator]) => {
          return validator.pipe(map(valid => (valid ? null : name)));
        });
        return combineLatest(validators$);
      }),
      map(messageList => {
        return messageList.filter((message): message is string => message !== null);
      }),
      shareReplay(1),
    );

    if (!this.hasAttribute(AbstractControlAttributes.Name)) {
      throw AbstractControl.throwAttributeNameRequired();
    }

    this.bindBaseObservablesToAttributes();
  }

  /** @internal */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case AbstractControlAttributes.Name:
        if (!newValue) {
          throw AbstractControl.throwAttributeNameRequired();
        }

        this.name$.next(newValue);
        break;
      case AbstractControlAttributes.ValidatorRequired:
        this.validatorRequired$.next(newValue !== null);
        break;
    }
  }

  /**
   * Устанавлиает значени контрола
   *
   * @param value Значение
   */
  setValue(value: T) {
    this.value$.next(value);
  }

  /**
   * Устанавлиает признак того, что поле обязательное
   *
   * @param required Признак того, что поле обязательное
   */
  setValidatorRequired(required: boolean) {
    this.validatorRequired$.next(required);
  }

  /**
   * Устанавлиает валидатор
   *
   * @param name Название валидатора
   * @param validator Валидатор, Observable, которая геренирует true, если контрол проходит валидацию,
   *                  или false, если не проходит
   */
  setValidator(name: string, validator: Observable<boolean>): void {
    const next = new Map(this.validators$.getValue());
    next.set(name, validator);
    this.validators$.next(next);
  }

  /**
   * Удаляет валидатор
   *
   * @param validator Название валидатора
   */
  removeValidator(validator: string): void {
    const next = new Map(this.validators$.getValue());
    if (next.has(validator)) {
      next.delete(validator);
      this.validators$.next(next);
    }
  }

  /**
   * Устанавлиает имя
   *
   * @param name Имя
   */
  setName(name: string) {
    this.name$.next(name);
  }

  protected markAsTouched(): void {
    this.untouched$.next(false);
  }

  protected martAsDirty(): void {
    this.pristine$.next(false);
  }

  protected updateAttribute(attribute: string, value: string | null): void {
    updateAttribute(this, attribute, value);
  }

  private bindBaseObservablesToAttributes(): void {
    this.name$.asObservable().subscribe(name => {
      this.updateAttribute(AbstractControlAttributes.Name, name);
    });

    this.validatorRequired$.asObservable().subscribe(required => {
      this.updateAttribute(AbstractControlAttributes.ValidatorRequired, required ? '' : null);
    });
  }
}
