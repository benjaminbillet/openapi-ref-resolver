import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { FileFormat, OpenApiNode } from './types/common';
import { bundle } from './openapi/bundle';
import { dereference } from './openapi/dereference';

export { FileFormat, OpenApiNode } from './types/common';

export const parseOpenApiSpec = (rootFile: string, type?: FileFormat): OpenApiNode => {
  let fileType = type || 'yaml';
  if (!type) {
    const name = path.basename(rootFile).toLowerCase();
    if (name.endsWith('.json')) {
      fileType = 'json';
    }
  }
  const data = fs.readFileSync(rootFile).toString();
  if (fileType === 'yaml') {
    return <OpenApiNode>yaml.load(data);
  }
  return JSON.parse(data);
};

export const bundleOpenApiSpec = (rootFile: string, type?: FileFormat) => {
  const openApi = parseOpenApiSpec(rootFile, type);
  return bundle(openApi, rootFile);
};

export const dereferenceOpenApiSpec = (rootFile: string, type?: FileFormat) => {
  const openApi = parseOpenApiSpec(rootFile, type);
  return dereference(openApi, rootFile);
};
