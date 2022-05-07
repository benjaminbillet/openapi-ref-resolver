import path from 'path';
import { dereferenceOpenApiSpec, parseOpenApiSpec } from '../../src';

const runTest = (testDir: string) => {
  const rootFile = path.resolve(__dirname, '..', 'input-apis', testDir, 'api.yaml');
  const spec = dereferenceOpenApiSpec(rootFile);
  const expected = parseOpenApiSpec(path.resolve(__dirname, testDir, 'api.json'));
  expect(spec).toEqual(expected);
};

const TEST_DIRS = [
  'test-api1',
  'composition-api1',
  'cornercase-api1',
  'cornercase-api2',
  'cornercase-api3',
  'cornercase-api4',
];

describe('dereference', () => {
  for (let i = 0; i < TEST_DIRS.length; i++) {
    it(TEST_DIRS[i], () => {
      runTest(TEST_DIRS[i]);
    });
  }
});
