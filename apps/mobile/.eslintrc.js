/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'babel.config.js', 'jest.config.js'],
};
