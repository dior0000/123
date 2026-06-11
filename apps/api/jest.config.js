/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  passWithNoTests: true,
  moduleNameMapper: {
    '^@pocketbiz/shared$': '<rootDir>/../../packages/shared/src',
  },
};
