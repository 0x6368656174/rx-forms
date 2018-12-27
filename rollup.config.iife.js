import config from './rollup.config.base';
import { terser } from "rollup-plugin-terser";


const pkg = require('./package');

config.output.push({
  file: `${pkg.main}`,
  name: 'rxForms',
  format: 'iife',
});

config.plugins.push(terser());

module.exports = config;
