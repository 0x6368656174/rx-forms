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
