import { RxInputText } from './rx-input-text';
import { RxTextarea } from './rx-textarea';

export const controlTags = [RxInputText.tagName, RxTextarea.tagName];
export const controlHtmlTags = controlTags.map(control => `<${control}>`);
export const anyControlQuery = controlTags.join(',');
