/**
 * Обновляет значение атрибута элемента. Если значение передано null, то удалит атрибут
 *
 * @param element Элемент
 * @param attribute Атрибут
 * @param value Значение
 */
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
