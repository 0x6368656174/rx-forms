export interface CustomElement {
  /** @internal */
  attributeChangedCallback?: (name: string, oldValue: string | null, newValue: string | null) => void;
  /** @internal */
  connectedCallback?: () => void;
  /** @internal */
  disconnectedCallback?: () => void;
}
