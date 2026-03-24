/** @type {import('jest').Config} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',    // Set the test environment to Node.jspn
  roots: ['<rootDir>/src', '<rootDir>/tests'], // Specify where your source and test files are
  moduleNameMapper: {
    '^#/(.*)$': '<rootDir>/src/$1', // Map #/ to the src/ directory
  },
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverage: true,
};