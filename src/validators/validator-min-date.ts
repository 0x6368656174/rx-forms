import { isValid } from 'date-fns';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export function minDate(rxValue: Observable<Date | null>, min: Date): Observable<boolean> {
  const validator = (value: Date | null): boolean => {
    if (value === null) {
      return true;
    }

    if (!isValid(value)) {
      return true;
    }

    return value.getTime() >= min.getTime();
  };

  return rxValue.pipe(
    map(validator),
    distinctUntilChanged(),
  );
}
