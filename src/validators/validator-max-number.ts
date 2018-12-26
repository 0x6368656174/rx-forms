import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function maxNumber(rxValue: Observable<number | null>, max: number): Observable<boolean> {
  const validator = (value: number | null): boolean => {
    if (value === null) {
      return true;
    }

    return value <= max;
  };

  return rxValue.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
