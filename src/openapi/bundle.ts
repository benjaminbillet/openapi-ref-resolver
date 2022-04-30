import { Dict, OpenApiNode } from '../types/common';
import path from 'path';
import { visit } from './v3/ref-visitor';
import { ObjectType } from './v3/types';
import ReferenceSolver from './ref-solver';

const analyzeRefs = (openapiDoc: OpenApiNode, baseFile: string) => {
  // maps an absolute reference to a local reference
  const originalRefToLocalRef: Dict = {};
  // maps a local reference name to a list of ref objects
  const localRefToOriginalRefObjs: Dict<{ $ref: string }[]> = {};
  // components part of the openapi spec
  const components: Dict<Dict<OpenApiNode>> = Object.fromEntries(Object.values(ObjectType).map((v) => [v, {}]));
  // resolved openapi paths
  const paths: Dict<OpenApiNode> = {};
  visit(
    openapiDoc,
    baseFile,
    new ReferenceSolver(),
    (objectType, originalRef, parsedRef, originalValue, resolvedValue, resolvedDocument, pathParentKey) => {
      if (objectType === ObjectType.PATH) {
        paths[pathParentKey || ''] = resolvedValue;
        return;
      }

      const localRefParts = parsedRef.local.split('/');
      let key = localRefParts.join('-');
      if (components[objectType][key] && !originalRefToLocalRef[parsedRef.full]) {
        key = `${path.basename(parsedRef.remote)}-${key}`;
      }
      // TODO if key is still a duplicate, aggressively converts the full absolute ref into a key

      const localRef = `#/components/${objectType}/${key}`;
      originalRefToLocalRef[parsedRef.full] = localRef;
      localRefToOriginalRefObjs[localRef] = localRefToOriginalRefObjs[localRef] || [];
      localRefToOriginalRefObjs[localRef].push(originalValue);
      components[objectType][key] = resolvedValue;
    },
  );
  return { paths, components, localRefToOriginalRefObjs };
};

export const bundle = (openapiDoc: OpenApiNode, baseFile: string) => {
  const { paths, components, localRefToOriginalRefObjs } = analyzeRefs(openapiDoc, path.resolve(baseFile));
  openapiDoc.paths = paths;
  openapiDoc.components = components;
  Object.entries(localRefToOriginalRefObjs).forEach(([localRef, refObjs]) => {
    refObjs.forEach((r) => {
      r.$ref = localRef;
    });
  });
  return openapiDoc;
};
