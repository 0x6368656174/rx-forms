import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function minDate(rxValue: Observable<DateTime | null>, min: DateTime): Observable<boolean> {
  const validator = (value: DateTime | null): boolean => {
    if (value === null) {
      return true;
    }

    return min >= value;
  };

  return rxValue.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
