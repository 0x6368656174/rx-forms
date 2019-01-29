import isEqual from 'lodash-es/isEqual';
import { combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, shareReplay, switchMap, takeUntil } from 'rxjs/operators';
import { Control, Writeable } from './control';
import { CustomElement } from './custom-element';
import { Elements } from './elements';
import { findParentFormField } from './utils';

interface RxSuccessPrivate {
  readonly disconnected$: Subject<void>;
}

const privateData: WeakMap<RxSuccess, RxSuccessPrivate> = new WeakMap();

function createPrivate(instance: RxSuccess): RxSuccessPrivate {
  const data = {
    disconnected$: new Subject<void>(),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxSuccess): RxSuccessPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

export class RxSuccess extends HTMLElement implements CustomElement {
  /** Тег */
  static readonly tagName = Elements.RxSuccess;

  /** Вызывается, когда элемент удален из DOM */
  readonly rxDisconnected: Observable<void>;

  setup(this: Writeable<RxSuccess>): void {
    try {
      getPrivate(this);
      return;
    } catch (e) {
      // Приватных данных нет, поэтому создадим их
    }

    const data = createPrivate(this);

    this.rxDisconnected = data.disconnected$.asObservable().pipe(
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );
  }

  /** @internal */
  connectedCallback() {
    // TODO: После того, как Safari научится поддерживать Custom Elements v1, убрать от сюда и добавить конструктор
    this.setup();

    const parentFormField = findParentFormField(this);

    if (parentFormField) {
      parentFormField.rxControl
        .pipe(
          filter((control): control is Control<any> => !!control),
          switchMap(control => combineLatest(control.rxValid, control.rxDirty, control.rxTouched)),
          map(([valid, dirty, touched]) => {
            // Если контрол не меняли, то успех валидации отображена не должен
            if (!dirty && !touched) {
              return false;
            }

            return valid;
          }),
          takeUntil(this.rxDisconnected),
        )
        .subscribe(visible => {
          if (visible) {
            this.classList.add(`${RxSuccess.tagName}--visible`);
            this.classList.remove(`${RxSuccess.tagName}--hidden`);
          } else {
            this.classList.remove(`${RxSuccess.tagName}--visible`);
            this.classList.add(`${RxSuccess.tagName}--hidden`);
          }
        });
    }
  }

  /** @internal */
  disconnectedCallback() {
    getPrivate(this).disconnected$.next();
  }
}

customElements.define(RxSuccess.tagName, RxSuccess);
