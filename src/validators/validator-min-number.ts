import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function minNumber(rxValue: Observable<number | null>, min: number): Observable<boolean> {
  const validator = (value: number | null): boolean => {
    if (value === null) {
      return true;
    }

    return value >= min;
  };

  return rxValue.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
