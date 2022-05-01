import path from 'path';
import { bundleOpenApiSpec, parseOpenApiSpec } from '../../src';

const runTest = (testDir: string) => {
  const rootFile = path.resolve(__dirname, '..', 'input-apis', testDir, 'api.yaml');
  const spec = bundleOpenApiSpec(rootFile);
  const expected = parseOpenApiSpec(path.resolve(__dirname, testDir, 'api.json'));
  expect(spec).toEqual(expected);
};

const TEST_DIRS = ['test-api1', 'composition-api1'];

describe('bundle', () => {
  for (let i = 0; i < TEST_DIRS.length; i++) {
    it(TEST_DIRS[i], () => {
      runTest(TEST_DIRS[i]);
    });
  }
});
