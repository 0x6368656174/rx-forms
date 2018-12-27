import { fromEvent, Observable } from 'rxjs';
import { mapTo } from 'rxjs/operators';
import { RxForm } from './rx-form';
import { findParentForm } from './utils';

interface RxSubmitDomPrivate {
  parentForm: RxForm;
}

const domPrivateData: WeakMap<RxSubmit, RxSubmitDomPrivate> = new WeakMap();

function createDomPrivate(instance: RxSubmit, data: RxSubmitDomPrivate): void {
  domPrivateData.set(instance, data);
}

function getDomPrivate(instance: RxSubmit): RxSubmitDomPrivate {
  const data = domPrivateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

export class RxSubmit extends HTMLButtonElement {
  /** Тэг */
  static readonly tagName = 'rx-submit';

  /** Observable, который эмитирует новые значения при клике по кнопке */
  readonly rxClick: Observable<void>;

  constructor() {
    super();

    this.rxClick = fromEvent(this, 'click').pipe(mapTo(undefined));
  }

  /** @internal */
  connectedCallback() {
    const parentForm = findParentForm(this, RxSubmit.tagName);
    createDomPrivate(this, { parentForm });

    parentForm.addSubmitButton(this);
  }

  /** @internal */
  disconnectedCallback() {
    const domData = getDomPrivate(this);

    domData.parentForm.removeSubmitButton(this);
  }
}

customElements.define(RxSubmit.tagName, RxSubmit, { extends: 'button' });
