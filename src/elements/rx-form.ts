import isEqual from 'lodash-es/isEqual';
import values from 'lodash-es/values';
import { BehaviorSubject, combineLatest, merge, Observable, of, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from 'rxjs/operators';
import { Control, Writeable } from './control';
import { Elements } from './elements';
import { RxSubmit } from './rx-submit';

interface RxFormPrivate {
  controls$: BehaviorSubject<Controls>;
  submitButtons$: BehaviorSubject<RxSubmit[]>;
  disconnected$: Subject<void>;
}

const privateData: WeakMap<RxForm, RxFormPrivate> = new WeakMap();

function createPrivate(instance: RxForm): RxFormPrivate {
  const data = {
    controls$: new BehaviorSubject<Controls>([]),
    disconnected$: new Subject<void>(),
    submitButtons$: new BehaviorSubject<RxSubmit[]>([]),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxForm): RxFormPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

/**
 * Ошибки валидации.
 *
 * Ключ - название контрола, который не пошел валидацию
 * Значение - список ошибок валидации контрола
 */
export interface ValidationErrors {
  [name: string]: string[];
}

/**
 * Значения
 *
 * Ключ - название контрола
 * Значение - значение контрола
 */
export interface Values {
  [name: string]: any;
}

/**
 * Контролы
 *
 * Ключ - название контрола
 * Значение - контрол
 */
type Controls = Array<Control<any>>;

export class RxForm extends HTMLFormElement {
  /** Тэг */
  static readonly tagName = Elements.RxForm;
  /** Все контролы */
  readonly rxControls: Observable<Controls>;
  /** Признак того, что все контролы формы прошли валидацию */
  readonly rxValid: Observable<boolean>;
  /** Признак того, что какой-то из контролов формы не прошел валидацию */
  readonly rxInvalid: Observable<boolean>;
  /** Значение формы - объект, ключом которого будут имена контролов, а значениям - значения контролов. */
  readonly rxValue: Observable<Values>;
  /** Вызывается, когда элемент удален из DOM */
  readonly rxDisconnected: Observable<void>;
  /**
   * Список ошибок валидации - объект, ключом которого будет контрола, не прошедшего валидацию, а значением -
   * ошибки валидации контрола
   */
  readonly rxValidationErrors: Observable<ValidationErrors>;
  /**
   * Вызывается в случае отправки формы, содержим значение формы, такое же как и в rxValue
   *
   * Данное событие будет вызвано <rx-submit>, если он установлен в <button type="button">.
   */
  readonly rxSubmit: Observable<Values>;

  setup(this: Writeable<RxForm>): void {
    try {
      getPrivate(this);
      return;
    } catch (e) {
      // Приватных данных нет, поэтому создадим их
    }

    const data = createPrivate(this);

    this.rxDisconnected = data.disconnected$.asObservable();

    this.rxControls = data.controls$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    this.rxValid = this.rxControls.pipe(
      switchMap(controlsObject => {
        const controls = values(controlsObject);
        if (controls.length === 0) {
          return of([]);
        }

        return combineLatest(controls.map(control => control.rxValid));
      }),
      map(validList => {
        if (validList.length === 0) {
          return true;
        }

        return !validList.some(valid => !valid);
      }),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
    this.rxInvalid = this.rxValid.pipe(map(value => !value));

    this.rxValue = this.rxControls.pipe(
      switchMap(controls => {
        interface ValueType {
          name: string;
          value: any;
        }
        if (controls.length === 0) {
          return of([] as ValueType[]);
        }

        const values$: Array<Observable<ValueType>> = controls.map(control => {
          return combineLatest(control.rxName, control.rxValue).pipe(
            map(([name, value]) => {
              return {
                name,
                value,
              };
            }),
          );
        });

        return combineLatest(values$);
      }),
      map(controlValues => {
        const result = {} as { [name: string]: any };
        for (const value of controlValues) {
          result[value.name] = value.value;
        }

        return result;
      }),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    this.rxValidationErrors = this.rxControls.pipe(
      switchMap(controls => {
        interface ErrorType {
          name: string;
          errors: string[];
        }
        if (controls.length === 0) {
          return of([] as ErrorType[]);
        }

        const errors$: Array<Observable<ErrorType>> = controls.map(control => {
          return combineLatest(control.rxName, control.rxValidationErrors).pipe(
            map(([name, errors]) => {
              return {
                errors,
                name,
              };
            }),
          );
        });

        return combineLatest(errors$);
      }),
      map(controlErrors => {
        const result = {} as { [name: string]: string[] };
        for (const errors of controlErrors) {
          if (errors.errors.length !== 0) {
            result[errors.name] = errors.errors;
          }
        }

        return result;
      }),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    this.rxSubmit = data.submitButtons$.pipe(
      switchMap(() => data.submitButtons$.asObservable()),
      switchMap(buttons => {
        const clicks$ = buttons.map(button => button.rxClick);

        return merge(...clicks$);
      }),
      withLatestFrom(this.rxValid),
      filter(([_, valid]) => valid),
      switchMap(() => this.rxValue.pipe(take(1))),
    );
  }

  /**
   * Возвращает контрол с указанным именем
   *
   * @param name Имя контрола
   */
  get(name: string): Control<any> {
    const result = getPrivate(this)
      .controls$.getValue()
      .find(control => control.getName() === name);
    if (result === undefined) {
      throw new Error(`Control with name "${name}" not found in <${RxForm.tagName}>`);
    }

    return result;
  }

  /**
   * Включает контрол с указанным именем
   *
   * @param name Имя
   */
  enableControl(name: string): void {
    this.get(name).setEnabled(true);
  }

  /**
   * Выключает контрол с указанным именем
   *
   * @param name Имя
   */
  disableControl(name: string): void {
    this.get(name).setDisabled(true);
  }

  /**
   * Добавляет контрол
   *
   * @param control Контрол
   */
  addControl(control: Control<any>): void {
    const data = getPrivate(this);

    const controls = data.controls$.getValue();
    if (controls.indexOf(control) === -1) {
      data.controls$.next([...controls, control]);
    }
  }

  /**
   * Удаляет контрол
   *
   * @param control Контрол
   */
  removeControl(control: Control<any>): void {
    const data = getPrivate(this);

    const controls = data.controls$.getValue();
    if (controls.indexOf(control) === -1) {
      data.controls$.next(controls.filter(c => c !== control));
    }
  }

  /**
   * Возвращает все контролы
   */
  getControls(): Array<Control<any>> {
    return getPrivate(this).controls$.getValue();
  }

  /**
   * Добавляет кнопку отправки
   *
   * @param button Кнопка
   */
  addSubmitButton(button: RxSubmit): void {
    const data = getPrivate(this);

    const buttons = data.submitButtons$.getValue();
    if (buttons.indexOf(button) === -1) {
      data.submitButtons$.next([...buttons, button]);
    }
  }

  /**
   * Удаляет кнопку отправки
   *
   * @param button Кнопка отправки
   */
  removeSubmitButton(button: RxSubmit): void {
    const data = getPrivate(this);

    const buttons = data.submitButtons$.getValue();
    if (buttons.indexOf(button) === -1) {
      data.submitButtons$.next(buttons.filter(c => c !== button));
    }
  }

  /** @internal */
  connectedCallback() {
    // TODO: После того, как Safari научится поддерживать Custom Elements v1, убрать от сюда и добавить конструктор
    this.setup();

    // Отключим отправку невалидной формы
    let valid = false;

    this.rxValid.pipe(takeUntil(this.rxDisconnected)).subscribe(v => (valid = v));

    const onSubmit = (event: Event) => {
      if (!valid) {
        event.preventDefault();
      }
    };

    this.addEventListener('submit', onSubmit);
    this.rxDisconnected.pipe(take(1)).subscribe(() => this.removeEventListener('submit', onSubmit));

    // При клике будем устанавливать для всех контролов признак того, что они теряли фокус
    const data = getPrivate(this);

    data.submitButtons$
      .asObservable()
      .pipe(
        switchMap(buttons => {
          const clicks$ = buttons.map(button => button.rxClick);

          return merge(...clicks$);
        }),
        takeUntil(this.rxDisconnected),
        switchMap(() => this.rxControls),
      )
      .subscribe(controls => {
        for (const control of controls) {
          control.markAsTouched();
        }
      });
  }

  /** @internal */
  disconnectedCallback() {
    getPrivate(this).disconnected$.next();
  }
}

customElements.define(RxForm.tagName, RxForm, { extends: 'form' });
