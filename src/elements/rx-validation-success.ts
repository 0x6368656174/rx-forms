import { combineLatest, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { AbstractControl } from './abstract-control';
import { anyControlQuery, controlHtmlTags } from './controls';
import { CustomElement } from './custom-element';

export class RxValidationSuccess extends HTMLElement implements CustomElement {
  static readonly tagName = 'rx-validation-success';

  private readonly unsubscribe$ = new Subject<void>();

  connectedCallback() {
    const parentControl = this.findParentControl();
    combineLatest(parentControl.valid, parentControl.dirty, parentControl.touched)
      .pipe(
        map(([valid, dirty, touched]) => {
          // Если контрол не меняли, то ошибка валидации отображена не долна быть
          if (!dirty && !touched) {
            return false;
          }

          return valid;
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe(visible => {
        if (visible) {
          this.classList.add(`${RxValidationSuccess.tagName}--visible`);
          this.classList.remove(`${RxValidationSuccess.tagName}--hidden`);
        } else {
          this.classList.remove(`${RxValidationSuccess.tagName}--visible`);
          this.classList.add(`${RxValidationSuccess.tagName}--hidden`);
        }
      });
  }

  disconnectedCallback() {
    this.unsubscribe$.next();
  }

  private findParentControl(): AbstractControl<any> {
    const parentControl = this.closest(anyControlQuery);
    if (!parentControl || !(parentControl instanceof AbstractControl)) {
      throw new Error(`<${RxValidationSuccess.tagName}> must be child one of ${controlHtmlTags.join(', ')}`);
    }

    return parentControl;
  }
}

customElements.define(RxValidationSuccess.tagName, RxValidationSuccess);
