import antfu from '@antfu/eslint-config'

export default antfu({
  /**
   * Style
   */
  stylistic: {
    indent: 2, // 2 格缩进
    quotes: 'single', // 单引号
    semi: false, // 不使用分号

    overrides: {
      'no-console': 'off', // 使用 console 时发出警告
      'no-empty': 'warn', // 空代码块时发出警告
      'unused-imports/no-unused-vars': 'warn', // 未使用的变量或导入时发出警告

      'no-async-promise-executor': 'off', // 允许在 Promise 构造函数中使用 async 函数
      'node/prefer-global/process': 'off', // 不强制使用全局的 process 对象
      'eqeqeq': 'off', // 不强制使用 === 和 !==
      'no-sequences': 'off', // 允许使用逗号操作符
      'no-extend-native': 'off', // 允许扩展原生对象的原型

      'ts/ban-ts-comment': 'off', // 允许使用 @ts-ignore 等 TypeScript 注释
      'unicorn/no-new-array': 'off', // 允许使用 new Array()
      'ts/no-unsafe-function-type': 'off', // 允许不安全的函数类型
      'eslint-comments/no-unlimited-disable': 'off', // 允许无限禁用 ESLint 规则
      'prefer-promise-reject-errors': 'off', // 允许 Promise.reject() 不传参数

      'no-useless-return': 'off', // 允许无用的 return 语句
      'style/no-mixed-operators': 'off', // 允许混合使用不同的操作符
      'operator-linebreak': ['off', 'after', { /** 操作符换行时放在行尾 */
        overrides: {
          '||': 'after', // 逻辑或操作符放在行尾
          '&&': 'after', // 逻辑与操作符放在行尾
          '?': 'before', // 三元操作符的问号放在行首
          ':': 'before', // 三元操作符的冒号放在行首
        },
      }],
      'ts/no-use-before-define': 'off', // 允许在定义前使用变量
      'ts/consistent-type-definitions': 'off', // 允许使用 interface 和 type 定义类型
      'no-new': 'off',

      'style/max-statements-per-line': 'off', // 允许每行语句数量不超过 1
      'no-case-declarations': 'off', // 允许 switch case 语句中出现变量声明
      'accessor-pairs': 'off', // 允许在 getter 和 setter 中使用 accessor pairs

      'no-alert': 'off', // 允许使用 alert()
      'no-cond-assign': 'off', // 允许在条件语句中赋值
      'no-new-func': 'off', // 允许使用 new Function()
      'no-eval': 'off', // 允许使用 eval()

      'node/prefer-global/buffer': 'off', // 允许使用全局 Buffer

      /**
       * 这个配置没用，还是删除换行，几十年了也不修复
       * 给个错误的配置关掉它
       */
      /**
       * 'no-multiple-empty-lines': ['error', { max: 3, maxBOF: 0, maxEOF: 0 }],
       * 'no-multiple-empty-lines': {},
       */
    },
  },

  /**
   * Language config
   */
  jsonc: false,
  regexp: false,
  typescript: true,

  /**
   * eslint-config 只对 Vue 和 TypeScript 有天然的支持
   * 如果你需要对第三方框架进行支持，需要自行开启
   * 开启后 运行 npx eslint 会提示你缺少的插件
   * 如 React Svelte Astro Solid UnoCSS
   */
  react: {
    overrides: {
      /** JSX 表达式中花括号中添加空格 */
      'style/jsx-curly-spacing': [
        'error',
        { when: 'always' }, // 总是在花括号内添加空格
      ],

      /** return JSX 时不换行加上括号 */
      'style/jsx-wrap-multilines': [
        'error',
        {
          declaration: false, // 允许声明时不换行
          assignment: false, // 允许赋值时不换行
          return: false, // 允许 return 时不换行
          arrow: false, // 允许箭头函数时不换行
          condition: false, // 允许条件表达式时不换行
          logical: false, // 允许逻辑表达式时不换行
          prop: false, // 允许属性时不换行
        },
      ],

      'style/jsx-closing-tag-location': 'off', // 关闭 JSX 闭合标签位置检查
      'style/jsx-closing-bracket-location': 'off', // 关闭 JSX 闭合括号位置检查
      'react/no-unstable-default-props': 'off', // 关闭不稳定的默认 props 检查
      'react-web-api/no-leaked-timeout': 'off', // 允许 setTimeout 后没有 clearTimeout
      'react-dom/no-missing-button-type': 'off', // 允许 button 元素没有 type 属性
      'react-refresh/only-export-components': 'off', // 允许导出 * type
      'react/no-clone-element': 'off', // 允许 cloneElement
      'react/no-children-to-array': 'off', // 允许 Children.toArray
      'react/no-create-ref': 'off', // 允许 createRef
    },
  },

  // Vue 相关的配置
  vue: {
    overrides: {
      'vue/block-order': [ // Vue 文件中块的顺序
        'error',
        {
          order: ['template', 'script', 'style'], // 顺序为 template -> script -> style
        },
      ],

      'vue/no-reserved-component-names': 'off', // 允许使用保留字作为组件名
    },
  },

  ignores: [
    'dist',
    'public',
    'node_modules',
    '**/*.json',
    '**/*.jsonc',
    '**/*.json5',
    '**/*.d.ts',
  ],
})
