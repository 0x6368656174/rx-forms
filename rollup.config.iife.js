import config from './rollup.config.base';
import { terser } from "rollup-plugin-terser";


const pkg = require('./package');

config.output.push({
  file: `dist/${pkg.main}`,
  name: 'rxForms',
  format: 'iife',
  sourcemap: true,
});

// config.plugins.push(terser());

module.exports = config;
