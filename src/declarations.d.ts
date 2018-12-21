declare module 'text-mask-core' {
  export interface CreateTextMastInputElementOptions {
    inputElement: HTMLInputElement;
    mask: Array<string | RegExp>;
  }

  export interface TextMaskInputElement {
    update(value: string): void;
  }

  export function createTextMaskInputElement(options: CreateTextMastInputElementOptions): TextMaskInputElement;
}
