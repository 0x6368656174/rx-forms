/**
 * Обновляет значение атрибута элемента. Если значение передано null, то удалит атрибут
 *
 * @param element Элемент
 * @param attribute Атрибут
 * @param value Значение
 */
import { RxForm } from './rx-form';
import { RxFormField } from './rx-form-field';

export function updateAttribute(element: HTMLElement, attribute: string, value: string | null): void {
  if (value === null) {
    if (element.hasAttribute(attribute)) {
      element.removeAttribute(attribute);
    }
  } else {
    if (element.getAttribute(attribute) !== value) {
      element.setAttribute(attribute, value);
    }
  }
}

/**
 * Находит родительский <rx-form-field> для элемента
 *
 * @param element Элемент
 */
export function findParentFormField<T>(element: HTMLElement): RxFormField<T> | null {
  const parentFormFiled = element.closest(RxFormField.tagName);
  if (!parentFormFiled || !(parentFormFiled instanceof RxFormField)) {
    return null;
  }

  return parentFormFiled;
}

/**
 * Находит родительский <rx-form> для элемента
 *
 * @param element Элемент
 * @param tagName Тэг элемента
 */
export function findParentForm(element: HTMLElement, tagName: string): RxForm {
  const parentForm = element.closest('form');
  if (!parentForm || !(parentForm instanceof RxForm)) {
    throw new Error(`<${tagName}> must be child of <${RxForm.tagName}>`);
  }

  return parentForm;
}
