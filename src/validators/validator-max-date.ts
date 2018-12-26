import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function maxDate(rxValue: Observable<DateTime | null>, max: DateTime): Observable<boolean> {
  const validator = (value: DateTime | null): boolean => {
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
