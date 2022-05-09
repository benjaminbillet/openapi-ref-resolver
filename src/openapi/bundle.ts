import { Dict, OpenApiNode, ResolvedRef } from '../types/common';
import path from 'path';
import { visit } from './v3/ref-visitor';
import { ComponentEvent, EventType, MappingEvent, ObjectType, PathEvent } from './v3/types';
import ReferenceSolver from './ref-solver';

interface Context {
  // maps absolute references to local references
  originalRefToLocalRef: Dict;
  // maps local references to corresponding ref objects
  localRefToOriginalRefObjs: Dict<OpenApiNode[]>;
  // resolved openapi components
  components: Dict<Dict<OpenApiNode>>;
  // resolved openapi paths
  paths: Dict<{ resolved: OpenApiNode; ref?: ResolvedRef }>;
  refSolver: ReferenceSolver;
}

const onPathVisited = (context: Context, event: PathEvent) => {
  context.paths[event.pathParentKey || ''] = { resolved: event.resolvedValue, ref: event.parsedRef };
};

const onMappingVisited = (context: Context, event: MappingEvent) => {
  Object.entries(event.mapping).forEach(([value, ref]) => {
    const { ref: resolvedRef } = context.refSolver.resolve(ref, event.document, event.baseFile);
    let localRef = context.originalRefToLocalRef[resolvedRef.full];
    if (localRef == null) {
      // we have a local reference to a composition branch
      const parts = resolvedRef.local.split('/');
      const index = parts.pop();
      const composeType = parts.pop();
      if (index != null && (composeType === 'oneOf' || composeType === 'anyOf' || composeType === 'allOf')) {
        const parentRef = resolvedRef.full.substring(
          0,
          resolvedRef.full.length - index.length - composeType.length - 2,
        );
        localRef = context.originalRefToLocalRef[parentRef];
        if (localRef != null) {
          localRef = `${localRef}/${composeType}/${index}`;
        }
      }
    }
    event.mapping[value] = localRef || event.mapping[value];
  });
};

const onComponentVisited = (context: Context, event: ComponentEvent, rootFile: string) => {
  const { objectType, parsedRef, originalValue, resolvedValue } = event;
  if (parsedRef.remote === rootFile && parsedRef.local.startsWith('components')) {
    return;
  }
  const localRefParts = parsedRef.local.split('/');
  let key = localRefParts.join('-');
  if (context.components[event.objectType][key] && !context.originalRefToLocalRef[parsedRef.full]) {
    // duplicate reference name, add the file name
    key = `${path.parse(parsedRef.remote).name}-${key}`;
  }
  // TODO if key is still a duplicate, aggressively converts the full absolute ref into a key

  const localRef = `#/components/${objectType}/${key}`;
  context.originalRefToLocalRef[parsedRef.full] = localRef;
  context.localRefToOriginalRefObjs[localRef] = context.localRefToOriginalRefObjs[localRef] || [];
  context.localRefToOriginalRefObjs[localRef].push(originalValue);
  context.components[objectType][key] = resolvedValue;
};

const analyzeRefs = (openapiDoc: OpenApiNode, rootFile: string) => {
  const components: Dict<Dict<OpenApiNode>> = openapiDoc.components || {};
  Object.values(ObjectType).forEach((type) => {
    components[type] = components[type] || {};
  });
  const context: Context = {
    components,
    originalRefToLocalRef: {},
    localRefToOriginalRefObjs: {},
    paths: {},
    refSolver: new ReferenceSolver(),
  };
  visit(openapiDoc, rootFile, context.refSolver, (event) => {
    if (event.type === EventType.PATH) {
      onPathVisited(context, event);
      return;
    }
    if (event.type === EventType.MAPPING) {
      onMappingVisited(context, event);
      return;
    }
    onComponentVisited(context, event, rootFile);
  });
  return context;
};

export const bundle = (openapiDoc: OpenApiNode, baseFile: string) => {
  const context = analyzeRefs(openapiDoc, path.resolve(baseFile));
  const { paths, components, localRefToOriginalRefObjs } = context;
  Object.entries(paths).forEach(([pathName, path]) => {
    openapiDoc.paths[pathName] = path.resolved;
  });
  openapiDoc.components = Object.fromEntries(
    Object.entries(components).filter(([, items]) => Object.values(items).length > 0),
  );
  Object.entries(localRefToOriginalRefObjs).forEach(([localRef, refObjs]) => {
    refObjs.forEach((r) => {
      r.$ref = localRef;
    });
  });
  return {
    pathRefs: Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, path.ref])),
    document: openapiDoc,
  };
};
