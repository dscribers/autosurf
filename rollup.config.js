import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

const babelled = babel({
  exclude: 'node_modules/**', // only transpile our source code
  plugins: ['@babel/plugin-proposal-private-methods'],
})

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: pkg.rollup.autosurf.main,
        format: 'cjs',
      },
      {
        file: pkg.rollup.autosurf.module,
        format: 'es',
      },
      {
        file: pkg.rollup.autosurf.browser,
        format: 'iife',
        name: 'AutoSurf',
      },
    ],
    plugins: [resolve(), commonjs(), babelled, terser()],
  },
  {
    input: 'src/Surf.js',
    output: [
      {
        file: pkg.rollup.surf.main,
        format: 'cjs',
      },
      {
        file: pkg.rollup.surf.module,
        format: 'es',
      },
      {
        file: pkg.rollup.surf.browser,
        format: 'iife',
        name: 'Surf',
      },
    ],
    plugins: [resolve(), commonjs(), babelled, terser()],
  },
]
