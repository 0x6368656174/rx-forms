import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

type Validators = Map<string, Observable<boolean>>;

/**
 * Контрол формы
 */
export abstract class AbstractControl<T> extends HTMLElement {
  static get observedAttributes() {
    return ['name'];
  }
  /** Значение контрола */
  abstract value: Observable<T>;
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

  protected constructor() {
    super();

    this.pristine = this.pristine$.asObservable();
    this.dirty = this.pristine.pipe(map(value => !value));
    this.untouched = this.untouched$.asObservable();
    this.touched = this.untouched$.pipe(map(value => !value));

    this.valid = this.validators$.asObservable().pipe(
      switchMap(validators => {
        const validators$ = Array.from(validators).map(([name, validator]) => validator);
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

    if (!this.hasAttribute('name')) {
      throw new Error('Attribute "name" for rx-forms controls is required');
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case 'name':
        this.updateName(newValue);
        break;
    }
  }

  /**
   * Устанавлиает значение контрола
   *
   * @param value Значение контрола
   */
  setValue(value: T): void {
    this.value$.next(value);
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

  protected martAsDirty(): void {
    this.pristine$.next(false);
  }

  private updateName(name: string | null): void {
    if (!name) {
      throw new Error('Attribute "name" for rx-forms controls is required');
    }

    this.name$.next(name);
  }
}
