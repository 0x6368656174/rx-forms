import { isEqual } from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { Control } from './control';

/**
 * Поле формы
 */
export abstract class RxFormField<T> extends HTMLElement {
  /**
   * Контрол
   */
  get rxControl(): Observable<Control<T> | null> {
    return this.control$.pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }

  /** Тег */
  static readonly tagName = 'rx-form-field';

  private control$ = new BehaviorSubject<Control<T> | null>(null);

  protected constructor() {
    super();
  }

  /**
   * Устанавливает контрол поля
   *
   * @param control Контрол
   */
  setControl(control: Control<T> | null) {
    this.control$.next(control);
  }
}

customElements.define(RxFormField.tagName, RxFormField);
