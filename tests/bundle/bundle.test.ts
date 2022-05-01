import path from 'path';
import { bundle } from '../../src/openapi/bundle';
import { parseOpenApiSpec } from '../../src';

const runTest = (testDir: string) => {
  const rootFile = path.resolve(__dirname, testDir, 'input', 'api.yaml');
  const spec = bundle(parseOpenApiSpec(rootFile), rootFile);
  const expected = parseOpenApiSpec(path.resolve(__dirname, testDir, 'output', 'api.json'));
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
