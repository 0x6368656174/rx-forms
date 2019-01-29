import config from './rollup.config.base';

const pkg = require('./package');

config.output.push({
  file: `dist/${pkg.module}`,
  format: 'es',
});

config.external.push(...[
  'rxjs',
  'rxjs/operators',
]);

module.exports = config;
