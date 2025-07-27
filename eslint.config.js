import js from '@eslint/js';
export default [
  js.configs.recommended,
  {
    files: ['*.js', 'data/loader.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: { document: 'readonly', window: 'readonly' , fetch: 'readonly', location: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', localStorage: 'readonly' }
    },
    rules: {}
  }
];
