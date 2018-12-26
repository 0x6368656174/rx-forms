import { findParentFormField } from './control';
import { emitDisconnected, RadioControl } from './radio-control';
import { RxFormField } from './rx-form-field';
import { RxInputRadio } from './rx-input-radio';

// Контролы по полям
const controls: WeakMap<RxFormField<string | null>, RadioControl> = new WeakMap();
// Инпуты к полям
const inputsToFormFields: WeakMap<RxInputRadio, RxFormField<string | null>> = new WeakMap();
// Количество контролов в поле
const inputsCount: WeakMap<RxFormField<string | null>, number> = new WeakMap();

export class RadioControlRegistry {
  add(input: RxInputRadio, control: RadioControl): RadioControl {
    const formField = findParentFormField<string | null>(input, RxInputRadio.tagName);

    const existControl = controls.get(formField);
    if (existControl !== undefined) {
      // Контрол уже создан
      control = existControl;
    } else {
      controls.set(formField, control);
    }

    // Добавим один инпут к общему количеству
    inputsCount.set(formField, (inputsCount.get(formField) || 0) + 1);
    // Добавим связь инпут-поле
    inputsToFormFields.set(input, formField);

    formField.setControl(control);
    return control;
  }

  remove(input: RxInputRadio): void {
    const formField = inputsToFormFields.get(input);
    if (formField === undefined) {
      throw new Error('Not found parent form field for input');
    }

    // Удалим один инпут из общего количества
    inputsCount.set(formField, (inputsCount.get(formField) || 0) - 1);
    // Удалим связь инпут-поле
    inputsToFormFields.delete(input);

    const formFieldInputCount = inputsCount.get(formField);
    if (formFieldInputCount === undefined || formFieldInputCount < 0) {
      throw new Error('Form field inputs count undefined or < 0');
    }

    // Если не осталось больше инпутов в данном поле
    if (formFieldInputCount === 0) {
      formField.setControl(null);

      const control = controls.get(formField);
      if (!control) {
        throw new Error('Control for form field not found');
      }
      // Вызовем событие отключение контрола
      emitDisconnected(control);

      controls.delete(formField);
      inputsCount.delete(formField);
    }
  }
}
