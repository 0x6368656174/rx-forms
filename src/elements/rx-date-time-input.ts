import { flatMap, isEqual } from 'lodash';
import { DateTime } from 'luxon';
import { BehaviorSubject, combineLatest, fromEvent, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { createTextMaskInputElement } from 'text-mask-core';
import { Validators } from '../validators';
import {
  Control,
  ControlBehaviourSubjects,
  controlConnectedCallback,
  controlDisconnectedCallback,
  controlObservedAttributes,
  createControlObservables,
  prepareControl,
  removeValidator,
  setValidator,
  updateControlAttributesBehaviourSubjects,
  ValidatorsMap,
} from './control';
import { updateAttribute } from './utils';

enum RxDateTimeInputAttributes {
  Format = 'format',
  Locale = 'locale',
}

function throwAttributeFormatRequired(): Error {
  return new Error(`Attribute "${RxDateTimeInputAttributes.Format}" for <${RxDateTimeInput.tagName}> is required`);
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

function bindOnInput(this: RxDateTimeInput): void {
  const data = getPrivate(this);

  const textInputMaskElement$ = data.format$.asObservable().pipe(
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
          `Format "${format}" can not convert to <${RxDateTimeInput.tagName}> mask.` +
            ` Supported only digital mask. Mask disabled.`,
        );
        return null;
      }

      return createTextMaskInputElement({
        inputElement: this,
        mask: mask as Array<string | RegExp>,
      });
    }),
  );

  const onInput$ = fromEvent(this, 'input');
  combineLatest(onInput$, textInputMaskElement$, data.format$, data.locale$).subscribe(
    ([_, textInputMaskElement, format, locale]) => {
      let value: string;

      if (textInputMaskElement === null) {
        value = this.value;
      } else {
        textInputMaskElement.update(this.value);
        value = this.value;
      }

      if (value === '') {
        data.value$.next(null);
      } else {
        const dateTime = DateTime.fromFormat(value, format, { locale: locale || undefined });
        data.value$.next(dateTime);
      }
    },
  );
}

function bindValidators(this: RxDateTimeInput): void {
  const data = getPrivate(this);

  const validator = this.rxValue.pipe(map(value => (value !== null ? value.isValid : true)));

  setValidator(data, Validators.Format, validator);
}

function bindObservablesToAttributes(this: RxDateTimeInput): void {
  const data = getPrivate(this);

  data.format$.asObservable().subscribe(format => {
    updateAttribute(this, RxDateTimeInputAttributes.Format, format);
  });

  data.locale$.asObservable().subscribe(locale => {
    updateAttribute(this, RxDateTimeInputAttributes.Locale, locale);
  });
}

interface RxTextInputPrivate extends ControlBehaviourSubjects<DateTime | null> {
  readonly format$: BehaviorSubject<string>;
  readonly locale$: BehaviorSubject<string | null>;

  readonly value$: BehaviorSubject<DateTime | null>;
  readonly validators$: BehaviorSubject<ValidatorsMap>;
  readonly pristine$: BehaviorSubject<boolean>;
  readonly untouched$: BehaviorSubject<boolean>;
  readonly name$: BehaviorSubject<string>;
  readonly readonly$: BehaviorSubject<boolean>;
  readonly required$: BehaviorSubject<boolean>;
}

const privateData: WeakMap<RxDateTimeInput, RxTextInputPrivate> = new WeakMap();

function createPrivate(instance: RxDateTimeInput): RxTextInputPrivate {
  const format = instance.getAttribute(RxDateTimeInputAttributes.Format);
  if (format === null) {
    throw throwAttributeFormatRequired();
  }

  const locale = instance.getAttribute(RxDateTimeInputAttributes.Format);
  const value = DateTime.fromFormat(instance.value, format, { locale: locale || undefined });

  const data = {
    format$: new BehaviorSubject<string>(format),
    locale$: new BehaviorSubject<string | null>(locale),
    name$: new BehaviorSubject<string>(''),
    pristine$: new BehaviorSubject(true),
    readonly$: new BehaviorSubject<boolean>(false),
    required$: new BehaviorSubject<boolean>(false),
    untouched$: new BehaviorSubject(true),
    validators$: new BehaviorSubject<ValidatorsMap>(new Map()),
    value$: new BehaviorSubject<DateTime | null>(value),
  };

  privateData.set(instance, data);

  return data;
}

function getPrivate(instance: RxDateTimeInput): RxTextInputPrivate {
  const data = privateData.get(instance);
  if (data === undefined) {
    throw new Error('Something wrong =(');
  }

  return data;
}

/**
 * Поле ввода даты
 */
export class RxDateTimeInput extends HTMLInputElement implements Control<DateTime | null> {
  /** Тэг */
  static readonly tagName: string = 'rx-date-time-input';

  /** @internal */
  static readonly observedAttributes = [
    ...controlObservedAttributes,
    RxDateTimeInputAttributes.Format,
    RxDateTimeInputAttributes.Locale,
  ];

  /**
   * Формат
   */
  readonly rxFormat: Observable<string>;
  /**
   * Локаль
   */
  readonly rxLocale: Observable<string | null>;

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

  constructor() {
    super();

    const data = createPrivate(this);

    const observables = createControlObservables(data);
    this.rxName = observables.rxName;
    this.rxReadonly = observables.rxReadonly;
    this.rxRequired = observables.rxRequired;
    this.rxValue = observables.rxValue;
    this.rxPristine = observables.rxPristine;
    this.rxDirty = observables.rxDirty;
    this.rxUntouched = observables.rxUntouched;
    this.rxTouched = observables.rxTouched;
    this.rxValid = observables.rxValid;
    this.rxInvalid = observables.rxInvalid;
    this.rxValidationErrors = observables.rxValidationErrors;

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

    fromEvent(this, 'blur').subscribe(() => this.markAsTouched());

    prepareControl(this, RxDateTimeInput.tagName, data);

    bindOnInput.call(this);
    bindValidators.call(this);
    bindObservablesToAttributes.call(this);
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

    getPrivate(this).value$.next(value);
    const format = data.format$.getValue();
    const locale = data.locale$.getValue();
    if (value === null) {
      this.value = '';
    } else {
      if (locale) {
        this.value = value.setLocale(locale).toFormat(format);
      } else {
        this.value = value.toFormat(format);
      }
    }

    this.markAsDirty();
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

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (newValue === oldValue) {
      return;
    }

    const data = getPrivate(this);

    switch (name) {
      case RxDateTimeInputAttributes.Format:
        if (!newValue) {
          throw throwAttributeFormatRequired();
        }
        data.format$.next(newValue);
        break;
      case RxDateTimeInputAttributes.Locale:
        data.locale$.next(newValue);
        break;
      default:
        updateControlAttributesBehaviourSubjects(data, name, RxDateTimeInput.tagName, newValue);
        break;
    }
  }

  /** @internal */
  connectedCallback() {
    controlConnectedCallback(this, RxDateTimeInput.tagName);
  }

  /** @internal */
  disconnectedCallback() {
    controlDisconnectedCallback(this, RxDateTimeInput.tagName);
  }
}

customElements.define(RxDateTimeInput.tagName, RxDateTimeInput, { extends: 'input' });
