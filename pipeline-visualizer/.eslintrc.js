const { resolve } = require('path');

module.exports = {
  root: true,
  extends: ['plugin:@osd/eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', resolve(__dirname, '../../node_modules')],
      },
    },
  },
};
