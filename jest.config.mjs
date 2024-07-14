export default {
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node'],
};