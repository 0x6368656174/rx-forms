import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { Validators as ValidatorsName } from '../validators';
import { RxFormField } from './rx-form-field';
import { updateAttribute } from './utils';

export type ValidatorsMap = Map<string, Observable<boolean>>;
export type ValidatorsBehaviourSubject = BehaviorSubject<ValidatorsMap>;

/**
 * Устанавливает валидатор
 *
 * @param name Название валидатора
 * @param validator Валидатор, Observable, которая генерирует true, если контрол проходит валидацию,
 *                  или false, если не проходит
 */
export function setValidator(this: WithValidators, name: string, validator: Observable<boolean>): void {
  const next = new Map(this.validators$.getValue());
  next.set(name, validator);
  this.validators$.next(next);
}

interface WithValidators {
  validators$: ValidatorsBehaviourSubject;
}

/**
 * Удаляет валидатор
 *
 * @param validator Название валидатора
 */
export function removeValidator(this: WithValidators, validator: string): void {
  const next = new Map(this.validators$.getValue());
  if (next.has(validator)) {
    next.delete(validator);
    this.validators$.next(next);
  }
}

interface ControlClassObservables {
  rxValid: Observable<boolean>;
  rxDirty: Observable<boolean>;
  rxTouched: Observable<boolean>;
}

/**
 * Биндит общие Observable'ы в имена классов элемента
 *
 * @param tagName Тэг элемента
 * @param observables Observable'ы
 */
export function bindControlObservablesToClass(
  this: HTMLElement,
  tagName: string,
  observables: ControlClassObservables,
) {
  observables.rxValid.subscribe(valid => {
    if (valid) {
      this.classList.add(`${tagName}--valid`);
      this.classList.remove(`${tagName}--invalid`);
    } else {
      this.classList.remove(`${tagName}--valid`);
      this.classList.add(`${tagName}--invalid`);
    }
  });

  observables.rxDirty.subscribe(dirty => {
    if (dirty) {
      this.classList.add(`${tagName}--dirty`);
      this.classList.remove(`${tagName}--pristine`);
    } else {
      this.classList.remove(`${tagName}--dirty`);
      this.classList.add(`${tagName}--pristine`);
    }
  });

  observables.rxTouched.subscribe(touched => {
    if (touched) {
      this.classList.add(`${tagName}--touched`);
      this.classList.remove(`${tagName}--untouched`);
    } else {
      this.classList.remove(`${tagName}--touched`);
      this.classList.add(`${tagName}--untouched`);
    }
  });
}

enum ControlAttributes {
  Name = 'name',
  Readonly = 'readonly',
  Required = 'required',
}

interface ControlAttributeObservables {
  rxName: Observable<string>;
  rxReadonly: Observable<boolean>;
  rxRequired: Observable<boolean>;
}

/**
 * Биндит общие Observable'ы в атрибуты элемента
 *
 * @param observables Observable'ы
 */
export function bindControlObservablesToAttributes(this: HTMLElement, observables: ControlAttributeObservables): void {
  observables.rxName.subscribe(name => {
    updateAttribute(this, ControlAttributes.Name, name);
  });

  observables.rxReadonly.subscribe(readonly => {
    updateAttribute(this, ControlAttributes.Readonly, readonly ? '' : null);
  });

  observables.rxRequired.subscribe(required => {
    updateAttribute(this, ControlAttributes.Required, required ? '' : null);
  });
}

interface ControlValidatorObservables {
  rxRequired: Observable<boolean>;
}

interface WithValue<T> {
  rxValue: Observable<T>;
}

/**
 * Биндит общие Observable'ы к валидаторам
 *
 * @param observables Observable'ы
 */
export function bindControlObservablesToValidators(
  this: WithValidators,
  observables: ControlValidatorObservables & WithValue<any>,
): void {
  observables.rxRequired.subscribe(required => {
    if (!required) {
      removeValidator.call(this, ValidatorsName.Required);
    } else {
      const validator = observables.rxValue.pipe(map(value => !!value));

      setValidator.call(this, ValidatorsName.Required, validator);
    }
  });
}

/**
 * Список базовых атрибутов, на обновление которых должен подписаться компонент
 */
export const controlObservedAttributes: string[] = [
  ControlAttributes.Name,
  ControlAttributes.Readonly,
  ControlAttributes.Required,
];

/**
 * Возвращает ошибку о том, что атрибут name для контрола обязательный
 *
 * @param tagName Тэг контрола
 */
export function throwAttributeNameRequired(tagName: string): Error {
  return new Error(`Attribute "${ControlAttributes.Name}" for <${tagName}> is required`);
}

/**
 * Базовая функция, вызываемая при добавлении элемента в DOM
 *
 * @param tagName Тэг элемента
 */
export function controlConnectedCallback<T>(this: HTMLElement & Control<T>, tagName: string) {
  findParentFormField<T>(this, tagName).setControl(this);
}

/**
 * Базовая функция, вызываемая при удалении элемента из DOM
 *
 * @param tagName Тэг элемента
 */
export function controlDisconnectedCallback(this: HTMLElement, tagName: string) {
  findParentFormField(this, tagName).setControl(null);
}

/**
 * Находит родительский <rx-form-field> для элемента
 *
 * @param element Элемент
 * @param tagName Тэг элемента
 */
export function findParentFormField<T>(element: HTMLElement, tagName: string): RxFormField<T> {
  const parentFormFiled = element.closest(RxFormField.tagName);
  if (!parentFormFiled || !(parentFormFiled instanceof RxFormField)) {
    throw new Error(`<${tagName}> must be child of <${RxFormField.tagName}>`);
  }

  return parentFormFiled;
}

interface ControlAttributesBehaviorSubjects {
  name$: BehaviorSubject<string>;
  readonly$: BehaviorSubject<boolean>;
  required$: BehaviorSubject<boolean>;
}

/**
 * Обновляет базовые BehaviourSubject'ы атрибутов
 *
 * @param attributeName Имя атрибута
 * @param tagName Тэг элемента
 * @param value Значение
 */
export function updateControlAttributesBehaviourSubjects(
  this: ControlAttributesBehaviorSubjects,
  attributeName: string,
  tagName: string,
  value: string | null,
): void {
  switch (attributeName) {
    case ControlAttributes.Name:
      if (!value) {
        throw throwAttributeNameRequired(tagName);
      }

      this.name$.next(value);
      break;
    case ControlAttributes.Readonly:
      this.readonly$.next(value !== null);
      break;
    case ControlAttributes.Required:
      this.required$.next(value !== null);
      break;
  }
}

export interface ControlBehaviourSubjects<T> extends ControlAttributesBehaviorSubjects {
  value$: BehaviorSubject<T>;
  pristine$: BehaviorSubject<boolean>;
  untouched$: BehaviorSubject<boolean>;
  validators$: ValidatorsBehaviourSubject;
}

export interface ControlObservables<T>
  extends ControlClassObservables,
    ControlAttributeObservables,
    ControlValidatorObservables,
    WithValue<T> {
  rxPristine: Observable<boolean>;
  rxUntouched: Observable<boolean>;
  rxInvalid: Observable<boolean>;
  rxValidationErrors: Observable<string[]>;
}

export function createControlObservables<T>(behaviourSubjects: ControlBehaviourSubjects<T>): ControlObservables<T> {
  const rxPristine = behaviourSubjects.pristine$.asObservable();
  const rxDirty = rxPristine.pipe(map(value => !value));
  const rxUntouched = behaviourSubjects.untouched$.asObservable();
  const rxTouched = rxUntouched.pipe(map(value => !value));

  const rxValid = behaviourSubjects.validators$.asObservable().pipe(
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
  const rxInvalid = rxValid.pipe(map(value => !value));

  const rxValidationErrors = behaviourSubjects.validators$.asObservable().pipe(
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

  const rxName = behaviourSubjects.name$.asObservable().pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1),
  );

  const rxReadonly = behaviourSubjects.readonly$.asObservable().pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1),
  );

  const rxRequired = behaviourSubjects.required$.asObservable().pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1),
  );

  const rxValue = behaviourSubjects.value$.pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1),
  );

  return {
    rxDirty,
    rxInvalid,
    rxName,
    rxPristine,
    rxReadonly,
    rxRequired,
    rxTouched,
    rxUntouched,
    rxValid,
    rxValidationErrors,
    rxValue,
  };
}

export interface Control<T> extends ControlObservables<T> {
  /** Значение контрола */
  readonly rxValue: Observable<T>;
  /** Признак того, что поле обязательное */
  readonly rxRequired: Observable<boolean>;
  /** Признак того, что поле доступно только для чтения */
  readonly rxReadonly: Observable<boolean>;
  /** Имя */
  readonly rxName: Observable<string>;
  /** Признак того, что контрол проходит валидацию */
  readonly rxValid: Observable<boolean>;
  /** Признак того, что контрол не проходит валидацию */
  readonly rxInvalid: Observable<boolean>;
  /** Признак того, что контрол "грязный", т.е. его значение менялось програмно */
  readonly rxDirty: Observable<boolean>;
  /** Признак того, что контрол "чистый", т.е. его значение не менялось програмно */
  readonly rxPristine: Observable<boolean>;
  /** Признак того, что контрол принимал и терял фокус */
  readonly rxTouched: Observable<boolean>;
  /** Признак того, что контрол не принимал и не терял фокус */
  readonly rxUntouched: Observable<boolean>;
  /** Список ошибок валидации */
  readonly rxValidationErrors: Observable<string[]>;

  /**
   * Устанавливает имя
   *
   * @param name Имя
   */
  setName(name: string): void;

  /**
   * Устанавливает значение контрола
   *
   * @param value Значение
   */
  setValue(value: T): void;

  /**
   * Устанавливает признак того, что поле обязательное
   *
   * @param required Признак того, что поле обязательное
   */
  setRequired(required: boolean): void;

  /**
   * Устанавливает признак того, что поле доступно только для чтения
   *
   * @param readonly Признак того, что поле доступно только для чтения
   */
  setReadonly(readonly: boolean): void;

  /**
   * Устанавливает валидатор
   *
   * @param name Название валидатора
   * @param validator Валидатор, Observable, которая генерирует true, если контрол проходит валидацию,
   *                  или false, если не проходит
   */
  setValidator(name: string, validator: Observable<boolean>): void;

  /**
   * Удаляет валидатор
   *
   * @param validator Название валидатора
   */
  removeValidator(validator: string): void;

  /**
   * Помечает контрол как контрол, который принимал и терял фокус
   */
  markAsTouched(): void;

  /**
   * Помечает контрол как контрол, который НЕ принимал и терял фокус
   */
  markAsUnTouched(): void;

  /**
   * Помечает контрол как "грязный", т.е. как контрол значение которого менялось програмно
   */
  markAsDirty(): void;

  /**
   * Помечает контрол как "чистый", т.е. как контрол значение которого не менялось програмно
   */
  markAsPristine(): void;
}
