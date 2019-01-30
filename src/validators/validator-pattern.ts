import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function pattern(rxValue: Observable<string>, regExp: RegExp): Observable<boolean> {
  const validator = (value: string): boolean => {
    if (value === '') {
      return true;
    }

    return regExp.test(value);
  };

  return rxValue.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
