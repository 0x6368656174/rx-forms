import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function minLength(rxValue: Observable<string>, length: number): Observable<boolean> {
  const validator = (value: string): boolean => {
    return value.length >= length;
  };

  return rxValue.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
