import { isValid } from 'date-fns';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function maxDate(rxValue: Observable<Date | null>, max: Date): Observable<boolean> {
  const validator = (value: Date | null): boolean => {
    if (value === null) {
      return true;
    }

    if (!isValid(value)) {
      return true;
    }

    return value.getTime() <= max.getTime();
  };

  return rxValue.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
