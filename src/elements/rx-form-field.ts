import { isEqual } from 'lodash';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { Control } from './control';
import { Elements } from './elements';

interface RxFormFieldPrivate<T> {
  control$: BehaviorSubject<Control<T> | null>;
  disconnected$: Subject<void>;
}

const privateData: WeakMap<RxFormField<any>, RxFormFieldPrivate<any>> = new WeakMap();

function createPrivate<T>(instance: RxFormField<T>): RxFormFieldPrivate<T> {
  const data = {
    control$: new BehaviorSubject<Control<T> | null>(null),
    disconnected$: new Subject<void>(),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate<T>(instance: RxFormField<T>): RxFormFieldPrivate<T> {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

/**
 * Поле формы
 */
export class RxFormField<T> extends HTMLElement {
  /** Тег */
  static readonly tagName = Elements.RxFormField;
  /**
   * Контрол
   */
  readonly rxControl: Observable<Control<T> | null>;

  /** Вызывается, когда элемент удален из DOM */
  readonly rxDisconnected: Observable<void>;

  constructor() {
    super();

    const data = createPrivate(this);

    this.rxControl = data.control$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    this.rxDisconnected = data.disconnected$.asObservable();
  }

  /**
   * Устанавливает контрол поля
   *
   * @param control Контрол
   */
  setControl(control: Control<T> | null) {
    getPrivate(this).control$.next(control);
  }

  /** @internal */
  disconnectedCallback() {
    const data = getPrivate(this);
    data.disconnected$.next();
  }
}

customElements.define(RxFormField.tagName, RxFormField);
