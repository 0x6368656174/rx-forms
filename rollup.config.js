import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';

const pkg = require('./package.json');

module.exports = {
  input: 'src/index.ts',
  output: [
    // {
    //   file: `${pkg.main}.js`,
    //   format: 'cjs',
    // },
    {
      file: `${pkg.main}.js`,
      name: 'rxForms',
      format: 'iife',
    },
    // {
    //   file: `${pkg.module}.js`,
    //   format: 'es',
    // },
  ],
  // external: [
  //   'rxjs',
  //   'rxjs/operators',
  // ],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs({
      namedExports: {
        'node_modules/lodash/lodash.js': [
          'startsWith',
          'endsWith',
          'isString',
          'isEqual',
          'flatMap',
          'values',
        ],
        'node_modules/json5/lib/index.js': [
          'parse',
        ],
        'node_modules/text-mask-core/dist/textMaskCore.js': [
          'createTextMaskInputElement',
        ],
      }
    }),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),

    // Resolve source maps to the original source
    sourceMaps(),
  ]
};
