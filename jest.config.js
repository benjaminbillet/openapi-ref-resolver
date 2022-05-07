module.exports = {
  testEnvironment: 'node',
  roots: ['tests'],
  'moduleFileExtensions': ['ts', 'js'],
  'transform': {
    '\\.ts': 'babel-jest',
    '\\.js$': 'babel-jest',
  }
};
