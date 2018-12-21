import { Observable } from 'rxjs';
import { AbstractControl } from './abstract-control';
import { valueValidator } from './value-validator';

export function pattern(control: AbstractControl<string>, regExp: RegExp): Observable<boolean> {
  const validator = (value: string): boolean => {
    return regExp.test(value);
  };

  return valueValidator(control, validator);
}
