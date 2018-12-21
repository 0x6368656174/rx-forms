import { BehaviorSubject, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { Validators } from '../validators';
import { AbstractControl } from './abstract-control';

export class RxTextarea extends AbstractControl<string> {
  static readonly tagName: string = 'rx-textarea';
  get tagName(): string {
    return RxTextarea.tagName;
  }

  protected readonly value$ = new BehaviorSubject<string>('');

  private readonly textarea: HTMLTextAreaElement;

  constructor() {
    super();

    const foundTextarea = this.querySelector('textarea');
    if (!foundTextarea) {
      throw new Error(`<${RxTextarea.tagName}> not found child <textarea>`);
    }

    this.textarea = foundTextarea;

    fromEvent(this.textarea, 'blur').subscribe(() => this.markAsTouched());

    this.bindObservablesToInputAttributes();
    this.bindOnInput();
    this.bindValidators();
  }

  private bindObservablesToInputAttributes(): void {
    this.name$.asObservable().subscribe(name => this.textarea.setAttribute('name', name));
  }

  private bindOnInput(): void {
    fromEvent(this.textarea, 'input').subscribe(() => {
      this.value$.next(this.textarea.value);
    });
  }

  private bindValidators(): void {
    this.validatorRequired$.asObservable().subscribe(required => {
      if (!required) {
        this.removeValidator(Validators.Required);
      } else {
        const validator = this.value.pipe(map(value => value !== ''));

        this.setValidator(Validators.Required, validator);
      }
    });
  }
}

customElements.define(RxTextarea.tagName, RxTextarea);
