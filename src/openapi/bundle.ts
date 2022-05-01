import { Dict, OpenApiNode } from '../types/common';
import path from 'path';
import { visit } from './v3/ref-visitor';
import { EventType, ObjectType } from './v3/types';
import ReferenceSolver from './ref-solver';

const analyzeRefs = (openapiDoc: OpenApiNode, baseFile: string) => {
  const refSolver = new ReferenceSolver();

  // maps absolute references to local references
  const originalRefToLocalRef: Dict = {};
  // maps local references to corresponding ref objects
  const localRefToOriginalRefObjs: Dict<OpenApiNode[]> = {};
  // resolved openapi components
  const components: Dict<Dict<OpenApiNode>> = openapiDoc.components || {};
  Object.values(ObjectType).forEach((type) => {
    components[type] = components[type] || {};
  });
  // resolved openapi paths
  const paths: Dict<OpenApiNode> = {};
  visit(openapiDoc, baseFile, refSolver, (event) => {
    if (event.type === EventType.PATH) {
      paths[event.pathParentKey || ''] = event.resolvedValue;
      return;
    }
    if (event.type === EventType.MAPPING) {
      Object.entries(event.mapping).forEach(([type, ref]) => {
        const { ref: resolvedRef } = refSolver.resolve(ref, event.document, event.baseFile);
        event.mapping[type] = originalRefToLocalRef[resolvedRef.full];
      });
      return;
    }

    const { objectType, parsedRef, originalValue, resolvedValue } = event;
    if (parsedRef.remote === baseFile && parsedRef.local.startsWith('components')) {
      return;
    }
    const localRefParts = parsedRef.local.split('/');
    let key = localRefParts.join('-');
    if (components[event.objectType][key] && !originalRefToLocalRef[parsedRef.full]) {
      key = `${path.parse(parsedRef.remote).name}-${key}`;
    }
    // TODO if key is still a duplicate, aggressively converts the full absolute ref into a key

    const localRef = `#/components/${objectType}/${key}`;
    originalRefToLocalRef[parsedRef.full] = localRef;
    localRefToOriginalRefObjs[localRef] = localRefToOriginalRefObjs[localRef] || [];
    localRefToOriginalRefObjs[localRef].push(originalValue);
    components[objectType][key] = resolvedValue;
  });
  return { paths, components, localRefToOriginalRefObjs };
};

export const bundle = (openapiDoc: OpenApiNode, baseFile: string) => {
  const { paths, components, localRefToOriginalRefObjs } = analyzeRefs(openapiDoc, path.resolve(baseFile));
  Object.entries(paths).forEach(([pathName, path]) => {
    openapiDoc.paths[pathName] = path;
  });
  openapiDoc.components = Object.fromEntries(
    Object.entries(components).filter(([, items]) => Object.values(items).length > 0),
  );
  Object.entries(localRefToOriginalRefObjs).forEach(([localRef, refObjs]) => {
    refObjs.forEach((r) => {
      r.$ref = localRef;
    });
  });
  return openapiDoc;
};
