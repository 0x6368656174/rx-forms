import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { CustomElement } from './custom-element';
import { updateAttribute } from './utils';

type Validators = Map<string, Observable<boolean>>;

export enum AbstractControlAttributes {
  Name = 'name',
  ReadOnly = 'readonly',
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
   * Признак того, что поле доступно только для чтения
   */
  get readonly(): Observable<boolean> {
    return this.readonly$.asObservable().pipe(
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
  static readonly observedAttributes: string[] = [
    AbstractControlAttributes.Name,
    AbstractControlAttributes.ReadOnly,
    AbstractControlAttributes.ValidatorRequired,
  ];

  private static throwAttributeNameRequired(): Error {
    return new Error(`Attribute "${AbstractControlAttributes.Name}" for any rx-forms controls is required`);
  }

  abstract readonly tagName: string;

  /** Признак того, что контрол проходит валидацию */
  readonly valid: Observable<boolean>;
  /** Признак того, что контрол не проходит валидацию */
  readonly invalid: Observable<boolean>;
  /** Признак того, что контрол "грязный", т.е. его значение менялось програмно */
  readonly dirty: Observable<boolean>;
  /** Признак того, что контрол "чистый", т.е. его значение не менялось програмно */
  readonly pristine: Observable<boolean>;
  /** Признак того, что контрол принимал и терял фокус */
  readonly touched: Observable<boolean>;
  /** Признак того, что контрол не принимал и не терял фокус */
  readonly untouched: Observable<boolean>;
  /** Список ошибок валидации */
  readonly validationErrors: Observable<string[]>;

  protected abstract value$: BehaviorSubject<T>;
  protected readonly pristine$ = new BehaviorSubject(true);
  protected readonly untouched$ = new BehaviorSubject(true);
  protected readonly validators$ = new BehaviorSubject<Validators>(new Map());
  protected readonly name$ = new BehaviorSubject<string>('');
  protected readonly readonly$ = new BehaviorSubject<boolean>(false);
  protected readonly validatorRequired$ = new BehaviorSubject<boolean>(false);

  protected constructor() {
    super();

    this.pristine = this.pristine$.asObservable();
    this.dirty = this.pristine.pipe(map(value => !value));
    this.untouched = this.untouched$.asObservable();
    this.touched = this.untouched$.pipe(map(value => !value));

    this.valid = this.validators$.asObservable().pipe(
      switchMap(validators => {
        if (validators.size === 0) {
          return of([]);
        }

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
        if (validators.size === 0) {
          return of([]);
        }

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
    this.bindBaseObservablesToClass();
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
      case AbstractControlAttributes.ReadOnly:
        this.readonly$.next(newValue !== null);
        break;
      case AbstractControlAttributes.ValidatorRequired:
        this.validatorRequired$.next(newValue !== null);
        break;
    }
  }

  /**
   * Устанавлиает имя
   *
   * @param name Имя
   */
  setName(name: string): void {
    this.name$.next(name);
  }

  /**
   * Устанавлиает значени контрола
   *
   * @param value Значение
   */
  setValue(value: T): void {
    this.markAsDirty();
    this.value$.next(value);
  }

  /**
   * Устанавлиает признак того, что поле обязательное
   *
   * @param required Признак того, что поле обязательное
   */
  setValidatorRequired(required: boolean): void {
    this.validatorRequired$.next(required);
  }

  /**
   * Устанавлиает признак того, что поле доступно только для чтения
   *
   * @param readonly Признак того, что поле доступно только для чтения
   */
  setReadonly(readonly: boolean): void {
    this.readonly$.next(readonly);
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

  protected markAsTouched(): void {
    this.untouched$.next(false);
  }

  protected markAsDirty(): void {
    this.pristine$.next(false);
  }

  protected updateAttribute(attribute: string, value: string | null): void {
    updateAttribute(this, attribute, value);
  }

  private bindBaseObservablesToClass() {
    this.valid.subscribe(valid => {
      if (valid) {
        this.classList.add(`${this.tagName}--valid`);
        this.classList.remove(`${this.tagName}--invalid`);
      } else {
        this.classList.remove(`${this.tagName}--valid`);
        this.classList.add(`${this.tagName}--invalid`);
      }
    });

    this.dirty.subscribe(dirty => {
      if (dirty) {
        this.classList.add(`${this.tagName}--dirty`);
        this.classList.remove(`${this.tagName}--pristine`);
      } else {
        this.classList.remove(`${this.tagName}--dirty`);
        this.classList.add(`${this.tagName}--pristine`);
      }
    });

    this.touched.subscribe(touched => {
      if (touched) {
        this.classList.add(`${this.tagName}--touched`);
        this.classList.remove(`${this.tagName}--untouched`);
      } else {
        this.classList.remove(`${this.tagName}--touched`);
        this.classList.add(`${this.tagName}--untouched`);
      }
    });
  }

  private bindBaseObservablesToAttributes(): void {
    this.name$.asObservable().subscribe(name => {
      this.updateAttribute(AbstractControlAttributes.Name, name);
    });

    this.readonly$.asObservable().subscribe(readonly => {
      this.updateAttribute(AbstractControlAttributes.ReadOnly, readonly ? '' : null);
    });

    this.validatorRequired$.asObservable().subscribe(required => {
      this.updateAttribute(AbstractControlAttributes.ValidatorRequired, required ? '' : null);
    });
  }
}
