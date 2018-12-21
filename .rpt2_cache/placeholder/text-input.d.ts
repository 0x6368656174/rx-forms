import { AbstractControl } from './abstract-control';
import { BehaviorSubject, Observable } from 'rxjs';
export declare class TextInput extends AbstractControl<string> {
    value: Observable<string>;
    protected value$: BehaviorSubject<string>;
    private input;
    constructor();
}
