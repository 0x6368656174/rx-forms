import flatMap from 'lodash-es/flatMap';
import isEqual from 'lodash-es/isEqual';
import { DateTime } from 'luxon';
import { BehaviorSubject, combineLatest, fromEvent, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
import { createTextMaskInputElement } from 'text-mask-core';
import { maxDate, minDate, Validators } from '../validators';
import {
  checkControlRequiredAttributes,
  Control,
  ControlAttributes,
  ControlBehaviourSubjects,
  controlConnectedCallback,
  controlDisconnectedCallback,
  controlObservedAttributes,
  createControlObservables,
  removeValidator,
  setValidator,
  subscribeToControlObservables,
  unsubscribeFromObservables,
  updateControlAttributesBehaviourSubjects,
  ValidatorsMap,
} from './control';
import { Elements } from './elements';
import { updateAttribute } from './utils';

enum RxInputDateTimeAttributes {
  Format = 'format',
  Locale = 'locale',
  Max = 'max',
  Min = 'min',
}

function throwInvalidMaxMin(attribute: RxInputDateTimeAttributes.Max | RxInputDateTimeAttributes.Min, format: string) {
  return new Error(`Attribute "${attribute}" of <${RxInputDateTime.tagName}> must be in format "${format}"`);
}

function throwAttributeFormatRequired(): Error {
  return new Error(`Attribute "${RxInputDateTimeAttributes.Format}" for <${RxInputDateTime.tagName}> is required`);
}

// Взято из https://github.com/moment/luxon/blob/master/src/impl/formatter.js#L49
function parseFormat(fmt: string) {
  let current = null;
  let currentFull = '';
  let bracketed = false;

  const splits = [];
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt.charAt(i);
    if (c === "'") {
      if (currentFull.length > 0) {
        splits.push({ literal: bracketed, val: currentFull });
      }
      current = null;
      currentFull = '';
      bracketed = !bracketed;
    } else if (bracketed) {
      currentFull += c;
    } else if (c === current) {
      currentFull += c;
    } else {
      if (currentFull.length > 0) {
        splits.push({ literal: false, val: currentFull });
      }
      currentFull = c;
      current = c;
    }
  }

  if (currentFull.length > 0) {
    splits.push({ literal: bracketed, val: currentFull });
  }

  return splits;
}

function subscribeToValueChanges(control: RxInputDateTime): void {
  const data = getPrivate(control);

  const textInputMaskElement$ = control.rxFormat.pipe(
    map(format => {
      if (!format) {
        return null;
      }

      const mask = flatMap(
        parseFormat(format).map(token => {
          switch (token.val) {
            case 'S':
              return [/\d?/, /\d?/, /\d/];
            case 'u':
            case 'SSS':
              return [/\d/, /\d/, /\d/];
            case 's':
              return [/[1-5]?/, /\d/];
            case 'ss':
              return [/[0-5]/, /\d/];
            case 'm':
              return [/[1-5]?/, /\d/];
            case 'mm':
              return [/[0-5]/, /\d/];
            case 'h':
              return [/1?/, /\d/];
            case 'hh':
              return [/[0-1]/, /\d/];
            case 'H':
              return [/[1-2]?/, /\d/];
            case 'HH':
              return [/[0-2]/, /\d/];
            case 'a':
              return [/[AP]/, 'M'];
            case 'd':
              return [/[1-3]?/, /\d/];
            case 'dd':
              return [/[0-3]/, /\d/];
            case 'E':
            case 'c':
              return [/[1-7]/];
            case 'L':
            case 'M':
              return [/1?/, /\d/];
            case 'LL':
            case 'MM':
              return [/[0-1]/, /\d/];
            case 'y':
              return [/\d?/, /\d?/, /\d?/, /\d/];
            case 'yy':
              return [/\d/, /\d/];
            case 'yyyy':
              return [/\d/, /\d/, /\d/, /\d/];
            case 'yyyyy':
              return [/\d?/, /\d?/, /\d/, /\d/, /\d/, /\d/];
            case 'yyyyyy':
              return [/\d/, /\d/, /\d/, /\d/, /\d/, /\d/];
            case 'k':
              return [/\d?/, /\d?/, /\d?/, /\d/];
            case 'kkkk':
              return [/\d/, /\d/, /\d/, /\d/];
            case 'W':
              return [/\d?/, /\d/];
            case 'WWWWW':
              return [/\d/, /\d/, /\d/, /\d/];
            case 'q':
              return [/0?/, /\d/];
            case 'qq':
              return [/0/, /\d/];
            case 'o':
              return [/\d?/, /\d?/, /\d/];
            case 'ooo':
              return [/\d/, /\d/, /\d/];
            case 'z':
            case 'Z':
            case 'ZZ':
            case 'ZZZ':
            case 'cc':
            case 'ccc':
            case 'EE':
            case 'EEE':
            case 'MMM':
            case 'MMMM':
            case 'G':
            case 'GG':
            case 'GGGGG':
              return null;
            default:
              return [token.val];
          }
        }),
      );

      // Если хоть одну из букв не смогли превратить в маску, то маску включать не будем
      if (mask.some(char => char === null)) {
        console.info(
          `Format "${format}" can not convert to <${RxInputDateTime.tagName}> mask.` +
            ` Supported only digital mask. Mask disabled.`,
        );
        return null;
      }

      return createTextMaskInputElement({
        inputElement: control,
        mask: mask as Array<string | RegExp>,
      });
    }),
  );

  const onInput$ = fromEvent(control, 'input');
  combineLatest(onInput$, textInputMaskElement$)
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(([_, textInputMaskElement]) => {
      if (textInputMaskElement !== null) {
        textInputMaskElement.update(control.value);
      }

      if (data.value$.getValue() !== control.value) {
        data.value$.next(control.value);
      }
    });
}

function setValidators(control: RxInputDateTime): void {
  const data = getPrivate(control);

  const validator = control.rxValue.pipe(map(value => (value !== null ? value.isValid : true)));

  setValidator(data, Validators.Format, validator);

  control.rxMax.pipe(takeUntil(control.rxDisconnected)).subscribe(max => {
    if (!max) {
      control.removeValidator(Validators.Max);
    } else {
      control.setValidator(Validators.Max, maxDate(control.rxValue, max));
    }
  });

  control.rxMin.pipe(takeUntil(control.rxDisconnected)).subscribe(min => {
    if (!min) {
      control.removeValidator(Validators.Min);
    } else {
      control.setValidator(Validators.Min, minDate(control.rxValue, min));
    }
  });
}

function subscribeToAttributeObservables(control: RxInputDateTime): void {
  getPrivate(control)
    .value$.asObservable()
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(value => {
      if (control.value !== value) {
        updateAttribute(control, ControlAttributes.Value, value);
      }
    });

  control.rxFormat.pipe(takeUntil(control.rxDisconnected)).subscribe(format => {
    updateAttribute(control, RxInputDateTimeAttributes.Format, format);
  });

  control.rxLocale.pipe(takeUntil(control.rxDisconnected)).subscribe(locale => {
    updateAttribute(control, RxInputDateTimeAttributes.Locale, locale);
  });

  combineLatest(control.rxFormat, control.rxLocale, control.rxMax)
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(([format, locale, max]) => {
      let value: string | null = null;
      if (max) {
        if (locale) {
          value = max.setLocale(locale).toFormat(format);
        } else {
          value = max.toFormat(format);
        }
      }
      updateAttribute(control, RxInputDateTimeAttributes.Max, value);
    });

  combineLatest(control.rxFormat, control.rxLocale, control.rxMin)
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(([format, locale, min]) => {
      let value: string | null = null;
      if (min) {
        if (locale) {
          value = min.setLocale(locale).toFormat(format);
        } else {
          value = min.toFormat(format);
        }
      }
      updateAttribute(control, RxInputDateTimeAttributes.Min, value);
    });
}

interface RxInputDateTimePrivate extends ControlBehaviourSubjects {
  value: DateTime | null;
  readonly value$: BehaviorSubject<string>;
  readonly format$: BehaviorSubject<string>;
  readonly locale$: BehaviorSubject<string | null>;
  readonly max$: BehaviorSubject<DateTime | null>;
  readonly min$: BehaviorSubject<DateTime | null>;
}

const privateData: WeakMap<RxInputDateTime, RxInputDateTimePrivate> = new WeakMap();

function createPrivate(instance: RxInputDateTime): RxInputDateTimePrivate {
  const data = {
    disabled$: new BehaviorSubject<boolean>(false),
    disconnected$: new Subject<void>(),
    format$: new BehaviorSubject<string>(''),
    locale$: new BehaviorSubject<string | null>(null),
    max$: new BehaviorSubject<DateTime | null>(null),
    min$: new BehaviorSubject<DateTime | null>(null),
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
    value: null,
    value$: new BehaviorSubject<string>(''),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxInputDateTime): RxInputDateTimePrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

function subscribeToObservables(control: RxInputDateTime): void {
  subscribeToValueChanges(control);
  subscribeToAttributeObservables(control);

  const data = getPrivate(control);
  control.rxValue.pipe(takeUntil(control.rxDisconnected)).subscribe(value => (data.value = value));

  fromEvent(control, 'blur')
    .pipe(takeUntil(control.rxDisconnected))
    .subscribe(() => control.markAsTouched());
}

/**
 * Поле ввода даты
 */
export class RxInputDateTime extends HTMLInputElement implements Control<DateTime | null> {
  /** Тэг */
  static readonly tagName: string = Elements.RxInputDateTime;

  /** @internal */
  static readonly observedAttributes = [
    ...controlObservedAttributes,
    ControlAttributes.Value,
    RxInputDateTimeAttributes.Format,
    RxInputDateTimeAttributes.Locale,
  ];

  /**
   * Формат
   */
  readonly rxFormat: Observable<string>;
  /**
   * Локаль
   */
  readonly rxLocale: Observable<string | null>;
  /**
   * Максимальная дата
   */
  readonly rxMax: Observable<DateTime | null>;
  /**
   * Минимальная дата
   */
  readonly rxMin: Observable<DateTime | null>;

  readonly rxDisconnected: Observable<void>;
  readonly rxDirty: Observable<boolean>;
  readonly rxInvalid: Observable<boolean>;
  readonly rxName: Observable<string>;
  readonly rxPristine: Observable<boolean>;
  readonly rxReadonly: Observable<boolean>;
  readonly rxRequired: Observable<boolean>;
  readonly rxTouched: Observable<boolean>;
  readonly rxUntouched: Observable<boolean>;
  readonly rxValid: Observable<boolean>;
  readonly rxValidationErrors: Observable<string[]>;
  readonly rxValue: Observable<DateTime | null>;
  readonly rxSet: Observable<boolean>;
  readonly rxEnabled: Observable<boolean>;
  readonly rxDisabled: Observable<boolean>;

  constructor() {
    super();

    checkControlRequiredAttributes(this, RxInputDateTime.tagName);

    const data = createPrivate(this);

    const observables = createControlObservables(data);
    this.rxDisconnected = observables.rxDisconnected;
    this.rxName = observables.rxName;
    this.rxReadonly = observables.rxReadonly;
    this.rxRequired = observables.rxRequired;
    this.rxPristine = observables.rxPristine;
    this.rxDirty = observables.rxDirty;
    this.rxUntouched = observables.rxUntouched;
    this.rxTouched = observables.rxTouched;
    this.rxValid = observables.rxValid;
    this.rxInvalid = observables.rxInvalid;
    this.rxValidationErrors = observables.rxValidationErrors;
    this.rxEnabled = observables.rxEnabled;
    this.rxDisabled = observables.rxDisabled;

    this.rxFormat = getPrivate(this)
      .format$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxLocale = getPrivate(this)
      .locale$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxMax = getPrivate(this)
      .max$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxMin = getPrivate(this)
      .min$.asObservable()
      .pipe(
        distinctUntilChanged(isEqual),
        shareReplay(1),
      );

    this.rxValue = combineLatest(data.value$.asObservable(), this.rxFormat, this.rxLocale).pipe(
      map(([value, format, locale]) => {
        if (value === '') {
          return null;
        }

        return DateTime.fromFormat(value, format, { locale: locale || undefined });
      }),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    this.rxSet = this.rxValue.pipe(
      map(value => value !== null),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    );

    setValidators(this);
  }

  markAsDirty(): void {
    getPrivate(this).pristine$.next(false);
  }

  markAsPristine(): void {
    getPrivate(this).pristine$.next(true);
  }

  markAsTouched(): void {
    getPrivate(this).untouched$.next(false);
  }

  markAsUnTouched(): void {
    getPrivate(this).untouched$.next(true);
  }

  removeValidator(validator: string): void {
    removeValidator(getPrivate(this), validator);
  }

  setName(name: string): void {
    getPrivate(this).name$.next(name);
  }

  setReadonly(readonly: boolean): void {
    getPrivate(this).readonly$.next(readonly);
  }

  setRequired(required: boolean): void {
    getPrivate(this).required$.next(required);
  }

  setValidator(name: string, validator: Observable<boolean>): void {
    setValidator(getPrivate(this), name, validator);
  }

  setValue(value: DateTime | null): void {
    const data = getPrivate(this);

    const format = this.getFormat();
    const locale = this.getLocale();
    let str = '';
    if (value !== null) {
      if (locale) {
        str = value.setLocale(locale).toFormat(format);
      } else {
        str = value.toFormat(format);
      }
    }

    data.value$.next(str);
    this.markAsDirty();
  }

  setEnabled(enabled: boolean): void {
    getPrivate(this).disabled$.next(!enabled);
  }

  setDisabled(disabled: boolean): void {
    getPrivate(this).disabled$.next(disabled);
  }

  getName(): string {
    return getPrivate(this).name$.getValue();
  }

  getValue(): DateTime | null {
    return getPrivate(this).value;
  }

  isRequired(): boolean {
    return getPrivate(this).required$.getValue();
  }

  isReadonly(): boolean {
    return getPrivate(this).readonly$.getValue();
  }

  isEnabled(): boolean {
    return !getPrivate(this).disabled$.getValue();
  }

  isDisabled(): boolean {
    return getPrivate(this).disabled$.getValue();
  }

  isTouched(): boolean {
    return !getPrivate(this).untouched$.getValue();
  }

  isUnTouched(): boolean {
    return getPrivate(this).untouched$.getValue();
  }

  isDirty(): boolean {
    return !getPrivate(this).pristine$.getValue();
  }

  isPristine(): boolean {
    return getPrivate(this).pristine$.getValue();
  }

  /**
   * Устанавливает формат
   *
   * @param format Формат
   */
  setFormat(format: string) {
    getPrivate(this).format$.next(format);
  }

  /**
   * Устанавливает локаль
   *
   * @param locale Локаль
   */
  setLocale(locale: string | null) {
    getPrivate(this).locale$.next(locale);
  }

  /**
   * Устанавливает максимальную дату
   *
   * @param max Дата
   */
  setMax(max: DateTime | null) {
    getPrivate(this).max$.next(max);
  }

  /**
   * Устанавливает минимальную дату
   *
   * @param min Дата
   */
  setMin(min: DateTime | null) {
    getPrivate(this).min$.next(min);
  }

  /** Возвращает формат */
  getFormat(): string {
    return getPrivate(this).format$.getValue();
  }

  /** Возвращает локаль */
  getLocale(): string | null {
    return getPrivate(this).locale$.getValue();
  }

  /** Возвращает максимальную дату */
  getMax(): DateTime | null {
    return getPrivate(this).max$.getValue();
  }

  /** Возвращает минимальную дату */
  getMin(): DateTime | null {
    return getPrivate(this).min$.getValue();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    switch (name) {
      case ControlAttributes.Value: {
        getPrivate(this).value$.next(newValue || '');
        break;
      }
      case RxInputDateTimeAttributes.Format:
        if (!newValue) {
          throw throwAttributeFormatRequired();
        }
        this.setFormat(newValue);
        break;
      case RxInputDateTimeAttributes.Locale:
        this.setLocale(newValue);
        break;
      case RxInputDateTimeAttributes.Max: {
        if (newValue !== null) {
          const data = getPrivate(this);
          const format = data.format$.getValue();
          const locale = data.locale$.getValue();

          const value = DateTime.fromFormat(newValue, format, { locale: locale || undefined });
          if (!value.isValid) {
            throwInvalidMaxMin(RxInputDateTimeAttributes.Max, format);
          }

          this.setMax(value);
        } else {
          this.setMax(null);
        }

        break;
      }
      case RxInputDateTimeAttributes.Min: {
        if (newValue !== null) {
          const data = getPrivate(this);
          const format = data.format$.getValue();
          const locale = data.locale$.getValue();

          const value = DateTime.fromFormat(newValue, format, { locale: locale || undefined });
          if (!value.isValid) {
            throwInvalidMaxMin(RxInputDateTimeAttributes.Min, format);
          }

          this.setMin(value);
        } else {
          this.setMin(null);
        }

        break;
      }
      default:
        updateControlAttributesBehaviourSubjects(this, name, RxInputDateTime.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this);

    subscribeToControlObservables(this, this, RxInputDateTime.tagName);
    subscribeToObservables(this);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this);

    unsubscribeFromObservables(getPrivate(this));
  }
}

customElements.define(RxInputDateTime.tagName, RxInputDateTime, { extends: 'input' });
