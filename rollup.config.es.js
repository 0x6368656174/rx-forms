import config from './rollup.config.base';

const pkg = require('./package');

config.output.push({
  file: `${pkg.module}`,
  format: 'es',
});

config.external.push(...[
  'rxjs',
  'rxjs/operators',
  'luxon',
]);

module.exports = config;
