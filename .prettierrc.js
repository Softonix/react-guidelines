// @ts-check

/** @type {import("prettier").Config} */
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,

  plugins: ['@ianvs/prettier-plugin-sort-imports'],

  importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '', '^~/(.*)$', '', '^[./]'],
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderTypeScriptVersion: '5.9.3',
  importOrderCaseSensitive: false,
}
