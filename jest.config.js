// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html
module.exports = {
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/packages/*/tsconfig.json',
    },
  },

  collectCoverageFrom: [
    '**/packages/*/**/*.js',
    '**/packages/*/**/*.ts',
    '!**/bin/**',
    '!**/cli/**',
    '!**/perf/**',
    '!**/__mocks__/**',
    '!**/__tests__/**',
    '!**/build/**',
    '!**/vendor/**',
    '!e2e/**',
  ],

  modulePathIgnorePatterns: [
    'examples/.*',
    'packages/.*/build',
  ],

  moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],

  testEnvironment: 'node',

  projects: ['<rootDir>'],

  setupFiles: [
    '<rootDir>/packages/analyze/__tests__/@helpers/setup.ts',
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/dist/',
    '/integration-tests/',
    '\\.snap$',
    '/build/',
    '/coverage/',
    '/packages/.*/build',
    '/packages/.*/dist',
    '/packages/.*/lib',
  ],

  coveragePathIgnorePatterns: ['/__tests__/', '/node_modules/'],

  testRegex: '(/__tests__/.*\.(test|spec))\\.(ts|tsx|js|jsx)$',

  clearMocks: true,

  coverageDirectory: 'coverage',

  coverageProvider: 'v8',

  verbose: true,

  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },

  testEnvironment: 'node',
};
