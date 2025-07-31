import js from '@eslint/js';
export default [
  js.configs.recommended,
  {
    files: ['*.js', 'data/loader.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        location: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        console: 'readonly'
      }
    },
    rules: {}
  },
  {
    files: ['scripts/*.js', 'generateZonePlaceholders.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly'
      }
    },
    rules: {}
  }
];
