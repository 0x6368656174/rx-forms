import { RxTextInput } from './rx-text-input';
import { RxTextarea } from './rx-textarea';

export const controlTags = [RxTextInput.tagName, RxTextarea.tagName];
export const controlHtmlTags = controlTags.map(control => `<${control}>`);
export const anyControlQuery = controlTags.join(',');
