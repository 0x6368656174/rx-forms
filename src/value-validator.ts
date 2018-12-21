import { AbstractControl } from './abstract-control';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

type ValidatorFn<T> = (value: T) => boolean;

export function valueValidator<T>(control: AbstractControl<T>, validator: ValidatorFn<T>): Observable<boolean> {
  return control.value.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
