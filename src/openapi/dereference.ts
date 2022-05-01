import { Dict, OpenApiNode } from '../types/common';
import path from 'path';
import { visit } from './v3/ref-visitor';
import { EventType, ObjectType } from './v3/types';
import ReferenceSolver from './ref-solver';
import { bundle } from './bundle';

const replaceRefs = (openapiDoc: OpenApiNode) => {
  const refSolver = new ReferenceSolver();

  const refsToPaths: Dict = {};
  visit(openapiDoc, '', refSolver, (event) => {
    if (event.type === EventType.MAPPING) {
      Object.entries(event.mapping).forEach(([type, ref]) => {
        event.mapping[type] = refsToPaths[event.mapping[type].substring(2)];
      });
      return;
    }
    if (event.type === EventType.COMPONENT) {
      const { originalValue, resolvedValue, objectPath, parsedRef } = event;
      delete originalValue.$ref;
      Object.assign(originalValue, resolvedValue);

      refsToPaths[parsedRef.local] = objectPath.map((x) => x.toString().replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
      return;
    }
  });
  return openapiDoc;
};

export const dereference = (openapiDoc: OpenApiNode, baseFile: string) => {
  const bundled = bundle(openapiDoc, baseFile);
  const finalResult = replaceRefs(bundled);
  delete finalResult.components;
  return finalResult;
};
