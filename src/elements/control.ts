import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap, takeUntil } from 'rxjs/operators';
import { Validators as ValidatorsName } from '../validators';
import { RxFormField } from './rx-form-field';
import { updateAttribute } from './utils';

export type ValidatorsMap = Map<string, Observable<boolean>>;
export type ValidatorsBehaviourSubject = BehaviorSubject<ValidatorsMap>;

/**
 * Проверяет, что все обязательные атрибуты для контрола установлены
 *
 * @param element Элемент контрола
 * @param tagName Тэг
 */
export function checkControlRequiredAttributes(element: HTMLElement, tagName: string) {
  if (!element.hasAttribute(ControlAttributes.Name)) {
    throw throwAttributeNameRequired(tagName);
  }
}

/**
 * Подписывается на изменения Observable'ов контрола
 *
 * @param element Элемент контрола
 * @param control Контрол
 * @param tagName Тэг
 */
export function subscribeToControlObservables<T>(element: HTMLElement, control: Control<T>, tagName: string) {
  bindControlObservablesToClass(element, tagName, control);
  bindControlObservablesToAttributes(element, control);
  bindControlObservablesToValidators(control);
}

/**
 * Устанавливает валидатор
 *
 * @param control Контрол
 * @param name Название валидатора
 * @param validator Валидатор, Observable, которая генерирует true, если контрол проходит валидацию,
 *                  или false, если не проходит
 */
export function setValidator(control: WithValidators, name: string, validator: Observable<boolean>): void {
  const next = new Map(control.validators$.getValue());
  next.set(name, validator);
  control.validators$.next(next);
}

interface WithValidators {
  validators$: ValidatorsBehaviourSubject;
}

interface WithDisconnected {
  disconnected$: Subject<void>;
}

interface DisconnectedObservable {
  rxDisconnected: Observable<void>;
}

/**
 * Удаляет валидатор
 *
 * @param control Контрол
 * @param validator Название валидатора
 */
export function removeValidator(control: WithValidators, validator: string): void {
  const next = new Map(control.validators$.getValue());
  if (next.has(validator)) {
    next.delete(validator);
    control.validators$.next(next);
  }
}

interface ControlClassObservables extends DisconnectedObservable {
  rxValid: Observable<boolean>;
  rxDirty: Observable<boolean>;
  rxTouched: Observable<boolean>;
}

/**
 * Биндит общие Observable'ы в имена классов элемента
 *
 * @param element Контрол
 * @param tagName Тэг элемента
 * @param observables Observable'ы
 */
function bindControlObservablesToClass(element: HTMLElement, tagName: string, observables: ControlClassObservables) {
  observables.rxValid.pipe(takeUntil(observables.rxDisconnected)).subscribe(valid => {
    if (valid) {
      element.classList.add(`${tagName}--valid`);
      element.classList.remove(`${tagName}--invalid`);
    } else {
      element.classList.remove(`${tagName}--valid`);
      element.classList.add(`${tagName}--invalid`);
    }
  });

  observables.rxDirty.pipe(takeUntil(observables.rxDisconnected)).subscribe(dirty => {
    if (dirty) {
      element.classList.add(`${tagName}--dirty`);
      element.classList.remove(`${tagName}--pristine`);
    } else {
      element.classList.remove(`${tagName}--dirty`);
      element.classList.add(`${tagName}--pristine`);
    }
  });

  observables.rxTouched.pipe(takeUntil(observables.rxDisconnected)).subscribe(touched => {
    if (touched) {
      element.classList.add(`${tagName}--touched`);
      element.classList.remove(`${tagName}--untouched`);
    } else {
      element.classList.remove(`${tagName}--touched`);
      element.classList.add(`${tagName}--untouched`);
    }
  });
}

enum ControlAttributes {
  Name = 'name',
  Readonly = 'readonly',
  Required = 'required',
  Disabled = 'disabled',
}

interface ControlAttributeObservables extends DisconnectedObservable {
  rxName: Observable<string>;
  rxReadonly: Observable<boolean>;
  rxRequired: Observable<boolean>;
  rxDisabled: Observable<boolean>;
}

/**
 * Биндит общие Observable'ы в атрибуты элемента
 *
 * @param element Контрол
 * @param observables Observable'ы
 */
function bindControlObservablesToAttributes(element: HTMLElement, observables: ControlAttributeObservables): void {
  observables.rxName.pipe(takeUntil(observables.rxDisconnected)).subscribe(name => {
    updateAttribute(element, ControlAttributes.Name, name);
  });

  observables.rxReadonly.pipe(takeUntil(observables.rxDisconnected)).subscribe(readonly => {
    updateAttribute(element, ControlAttributes.Readonly, readonly ? '' : null);
  });

  observables.rxRequired.pipe(takeUntil(observables.rxDisconnected)).subscribe(required => {
    updateAttribute(element, ControlAttributes.Required, required ? '' : null);
  });

  observables.rxDisabled.pipe(takeUntil(observables.rxDisconnected)).subscribe(disabled => {
    updateAttribute(element, ControlAttributes.Disabled, disabled ? '' : null);
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
 * @param control Контрол
 */
function bindControlObservablesToValidators<T>(control: Control<T>): void {
  control.rxRequired.pipe(takeUntil(control.rxDisconnected)).subscribe(required => {
    if (!required) {
      control.removeValidator(ValidatorsName.Required);
    } else {
      const validator = control.rxSet;

      control.setValidator(ValidatorsName.Required, validator);
    }
  });
}

/**
 * Список базовых атрибутов, на обновление которых должен подписаться компонент
 */
export const controlObservedAttributes: string[] = [
  ControlAttributes.Name,
  ControlAttributes.Readonly,
  ControlAttributes.Disabled,
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
 * @param control Контрол
 * @param tagName Тэг элемента
 */
export function controlConnectedCallback<T>(control: HTMLElement & Control<T>, tagName: string): void {
  findParentFormField<T>(control, tagName).setControl(control);
}

/**
 * Базовая функция, вызываемая при удалении элемента из DOM
 *
 * @param control Контрол
 * @param tagName Тэг элемента
 */
export function controlDisconnectedCallback(control: HTMLElement, tagName: string): void {
  findParentFormField(control, tagName).setControl(null);
}

/**
 * Отписывается от Observable'ов контрола
 *
 * @param withDisconnected Объект с свойством disconnected$
 */
export function unsubscribeFromObservables(withDisconnected: WithDisconnected): void {
  withDisconnected.disconnected$.next();
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
  disabled$: BehaviorSubject<boolean>;
  required$: BehaviorSubject<boolean>;
}

/**
 * Обновляет базовые BehaviourSubject'ы атрибутов
 *
 * @param control Контрол
 * @param attributeName Имя атрибута
 * @param tagName Тэг элемента
 * @param value Значение
 */
export function updateControlAttributesBehaviourSubjects<T>(
  control: Control<T>,
  attributeName: string,
  tagName: string,
  value: string | null,
): void {
  switch (attributeName) {
    case ControlAttributes.Name:
      if (!value) {
        throw throwAttributeNameRequired(tagName);
      }

      control.setName(value);
      break;
    case ControlAttributes.Readonly:
      control.setReadonly(value !== null);
      break;
    case ControlAttributes.Disabled:
      control.setDisabled(value !== null);
      break;
    case ControlAttributes.Required:
      control.setRequired(value !== null);
      break;
  }
}

export interface ControlBehaviourSubjects<T>
  extends ControlAttributesBehaviorSubjects,
    WithValidators,
    WithDisconnected {
  value$: BehaviorSubject<T>;
  pristine$: BehaviorSubject<boolean>;
  untouched$: BehaviorSubject<boolean>;
}

export interface ControlObservables<T>
  extends ControlClassObservables,
    ControlAttributeObservables,
    ControlValidatorObservables,
    WithValue<T> {
  rxDisconnected: Observable<void>;
  rxPristine: Observable<boolean>;
  rxUntouched: Observable<boolean>;
  rxInvalid: Observable<boolean>;
  rxValidationErrors: Observable<string[]>;
  rxSet: Observable<boolean>;
  rxEnabled: Observable<boolean>;
}

export function createControlObservables<T>(behaviourSubjects: ControlBehaviourSubjects<T>): ControlObservables<T> {
  const rxPristine = behaviourSubjects.pristine$.asObservable();
  const rxDirty = rxPristine.pipe(map(value => !value));
  const rxUntouched = behaviourSubjects.untouched$.asObservable();
  const rxTouched = rxUntouched.pipe(map(value => !value));
  const rxDisabled = behaviourSubjects.disabled$.asObservable();
  const rxEnabled = rxDisabled.pipe(map(value => !value));

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

  const rxValue = behaviourSubjects.value$.asObservable().pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1),
  );

  const rxDisconnected = behaviourSubjects.disconnected$.asObservable();

  const rxSet = rxValue.pipe(
    map(value => value !== null),
    distinctUntilChanged(isEqual),
    shareReplay(1),
  );

  return {
    rxDirty,
    rxDisabled,
    rxDisconnected,
    rxEnabled,
    rxInvalid,
    rxName,
    rxPristine,
    rxReadonly,
    rxRequired,
    rxSet,
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
  /** Признак того, что поле доступно для редактирования */
  readonly rxEnabled: Observable<boolean>;
  /** Признак того, что поле НЕ доступно для редактирования */
  readonly rxDisabled: Observable<boolean>;
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
  /** Вызывается, когда элемент удален из DOM */
  readonly rxDisconnected: Observable<void>;
  /** Признак того, что полю установлено значение */
  readonly rxSet: Observable<boolean>;

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
   * Устанавливает признак того, что поле должно быть доступно для редактирования
   *
   * @param enabled Признак того, что поле доступно для редактирования
   */
  setEnabled(enabled: boolean): void;

  /**
   * Устанавливает признак того, что поле НЕ должно быть доступно для редактирования
   *
   * @param disabled Признак того, что поле НЕ доступно для редактирования
   */
  setDisabled(disabled: boolean): void;

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
