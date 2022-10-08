import typescript from '@rollup/plugin-typescript';
import sourceMaps from 'rollup-plugin-sourcemaps';

export default {
  input: './packages/index.ts', // 入口文件
  output: [
    // 2种输出格式
    {
      format: 'cjs', // 输出格式
      file: './lib/micro-vue.cjs.js', // 输出路径
      sourcemap: true,
    },
    {
      format: 'es',
      file: './lib/micro-vue.esm.js',
      sourcemap: true,
    },
  ],
  plugins: [typescript(), sourceMaps()],
};
