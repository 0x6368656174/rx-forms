import { Elements } from './elements';
import { emitDisconnected, RadioControl } from './radio-control';
import { RxForm } from './rx-form';
import { RxInputRadio } from './rx-input-radio';
import { findParentForm } from './utils';

// Контролы по формам
const controls: WeakMap<RxForm, Map<string, RadioControl>> = new WeakMap();
// Инпуты к формам
const inputsToForm: WeakMap<RxInputRadio, RxForm> = new WeakMap();
// // Количество контролов в контроле
const inputsCount: WeakMap<RadioControl, number> = new WeakMap();

export class RadioControlRegistry {
  add(input: RxInputRadio, control: RadioControl): RadioControl {
    // Не используем тут RxInputRadio.tagName, т.к. это вызовет цикличную зависимость
    const form = findParentForm(input, Elements.RxInputRadio);

    let formControls = controls.get(form);
    if (formControls === undefined) {
      formControls = new Map();
      controls.set(form, formControls);
    }

    const existControl = formControls.get(control.getName());
    if (existControl !== undefined) {
      // Контрол уже создан
      control = existControl;
    } else {
      formControls.set(control.getName(), control);
    }

    // // Добавим один инпут к общему количеству
    inputsCount.set(control, (inputsCount.get(control) || 0) + 1);
    // Добавим связь инпут-поле
    inputsToForm.set(input, form);

    form.addControl(control);

    return control;
  }

  remove(input: RxInputRadio): void {
    const name = input.getName();

    const form = inputsToForm.get(input);
    if (form === undefined) {
      throw new Error('Not found parent form for input');
    }

    // Удалим один инпут из общего количества
    inputsCount.set(input, (inputsCount.get(input) || 0) - 1);
    // Удалим связь инпут-поле
    inputsToForm.delete(input);

    const formInputCount = inputsCount.get(input);
    if (formInputCount === undefined || formInputCount < 0) {
      throw new Error('Form field inputs count undefined or < 0');
    }

    // Если не осталось больше инпутов в данном поле
    if (formInputCount === 0) {
      form.removeControl(input);

      const formControls = controls.get(form);
      if (formControls === undefined) {
        throw new Error('Something wrong=(');
      }

      const control = formControls.get(name);
      if (!control) {
        throw new Error('Control for form field not found');
      }
      // Вызовем событие отключение контрола
      emitDisconnected(control);

      formControls.delete(name);
      if (formControls.size === 0) {
        controls.delete(form);
      }

      inputsCount.delete(control);
    }
  }
}
