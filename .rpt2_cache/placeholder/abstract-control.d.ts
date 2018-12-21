import { BehaviorSubject, Observable } from 'rxjs';
/**
 * Контрол формы
 */
export declare abstract class AbstractControl<T> extends HTMLElement {
    /** Значение контрола */
    abstract value: Observable<T>;
    /** Признак того, что контрол проходит валидацию */
    valid: Observable<boolean>;
    /** Признак того, что контрол не проходит валидацию */
    invalid: Observable<boolean>;
    /** Признак того, что контрол "грязный", т.е. его значение менялось програмно */
    dirty: Observable<boolean>;
    /** Признак того, что контрол "чистый", т.е. его значение не менялось програмно */
    pristine: Observable<boolean>;
    /** Признак того, что контрол принимал и терял фокус */
    touched: Observable<boolean>;
    /** Признак того, что контрол не принимал и не терял фокус */
    untouched: Observable<boolean>;
    /** Список ошибок валидации */
    validationErrors: Observable<string[]>;
    protected abstract value$: BehaviorSubject<T>;
    protected pristine$: BehaviorSubject<boolean>;
    protected untouched$: BehaviorSubject<boolean>;
    protected validators$: BehaviorSubject<Map<symbol, {
        validator: Observable<boolean>;
        message: string;
    }>>;
    protected name$: BehaviorSubject<string>;
    protected constructor();
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    private updateName;
    /**
     * Устанавлиает значение контрола
     *
     * @param value Значение контрола
     */
    setValue(value: T): void;
    /**
     * Устанавлиает валидатор
     *
     * @param validator Валидатор, Observable, которая геренирует true, если контрол проходит валидацию,
     *                  или false, если не проходит
     * @param message Сообщение об ошибке валидации
     *
     * @return Возвращает Уникальный symbol для созданого валидатора
     */
    addValidator(validator: Observable<boolean>, message: string): symbol;
    /**
     * Удаляет валидатор
     *
     * @param validator Уникальный symbol валидатора, который вернул setValidator()
     */
    removeValidator(validator: symbol): void;
    protected markAsTouched(): void;
    protected martAsDirty(): void;
}
