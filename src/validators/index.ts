export enum Validators {
  Required = 'required',
  Pattern = 'pattern',
  Format = 'format',
  Max = 'max',
  Min = 'min',
  MaxLength = 'maxlength',
  MinLength = 'minlength',
}

export * from './validator-max-date';
export * from './validator-max-length';
export * from './validator-max-number';
export * from './validator-min-date';
export * from './validator-min-length';
export * from './validator-min-number';
export * from './validator-pattern';
