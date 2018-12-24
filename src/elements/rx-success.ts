import { combineLatest, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { Control } from './control';
import { CustomElement } from './custom-element';
import { RxFormField } from './rx-form-field';

export class RxSuccess extends HTMLElement implements CustomElement {
  /** Тег */
  static readonly tagName = 'rx-success';

  private readonly unsubscribe$ = new Subject<void>();

  /** @internal */
  connectedCallback() {
    this.findParentFormField()
      .rxControl.pipe(
        filter((control): control is Control<any> => !!control),
        switchMap(control => combineLatest(control.rxValid, control.rxDirty, control.rxTouched)),
        map(([valid, dirty, touched]) => {
          // Если контрол не меняли, то усхпех валидации отображена не должен
          if (!dirty && !touched) {
            return false;
          }

          return valid;
        }),
        takeUntil(this.unsubscribe$),
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

  /** @internal */
  disconnectedCallback() {
    this.unsubscribe$.next();
  }

  private findParentFormField(): RxFormField<any> {
    const parentFormFiled = this.closest(RxFormField.tagName);
    if (!parentFormFiled || !(parentFormFiled instanceof RxFormField)) {
      throw new Error(`<${RxSuccess.tagName}> must be child of <${RxFormField.tagName}>`);
    }

    return parentFormFiled;
  }
}

customElements.define(RxSuccess.tagName, RxSuccess);
