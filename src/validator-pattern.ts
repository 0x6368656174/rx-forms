import { AbstractControl } from './abstract-control';
import { valueValidator } from './value-validator';
import { Observable } from 'rxjs';

export function pattern(control: AbstractControl<string>, regExp: RegExp): Observable<boolean> {
  const validator = (value: string): boolean => {
    return regExp.test(value);
  };

  return valueValidator(control, validator);
}
