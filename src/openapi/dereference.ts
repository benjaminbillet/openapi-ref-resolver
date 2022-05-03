import { Dict, OpenApiNode } from '../types/common';
import { visit } from './v3/ref-visitor';
import { ComponentEvent, EventType, MappingEvent } from './v3/types';
import ReferenceSolver from './ref-solver';
import { bundle } from './bundle';

interface Context {
  // maps components references to paths references
  refsToPaths: Dict;
  refSolver: ReferenceSolver;
}

const onMappingVisited = (context: Context, event: MappingEvent) => {
  Object.entries(event.mapping).forEach(([value, ref]) => {
    const localPath = ref.substring(2);
    let mappedRef = context.refsToPaths[localPath];
    if (mappedRef == null) {
      const parts = localPath.split('/');
      let idx = parts.length - 1;
      while (idx >= 0) {
        mappedRef = context.refsToPaths[parts.slice(0, idx).join('/')];
        if (mappedRef != null) {
          break;
        }
        idx--;
      }
      if (mappedRef != null) {
        mappedRef = `${mappedRef}/${parts.slice(idx).join('/')}`;
      }
    }
    event.mapping[value] = `#/${mappedRef}` || event.mapping[value];
  });
};

const onComponentVisited = (context: Context, event: ComponentEvent) => {
  const { originalValue, resolvedValue, objectPath, parsedRef } = event;
  delete originalValue.$ref;
  Object.assign(originalValue, resolvedValue);

  context.refsToPaths[parsedRef.local] = objectPath
    .map((x) => x.toString().replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('/');
};

const replaceRefs = (openapiDoc: OpenApiNode) => {
  const context: Context = {
    refsToPaths: {},
    refSolver: new ReferenceSolver(),
  };

  visit(openapiDoc, '', context.refSolver, (event) => {
    if (event.type === EventType.MAPPING) {
      onMappingVisited(context, event);
      return;
    }
    if (event.type === EventType.COMPONENT) {
      onComponentVisited(context, event);
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
