/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../../.eslintrc.js', 'prettier'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
  ignorePatterns: ['node_modules/', '.next/', 'dist/'],
};
