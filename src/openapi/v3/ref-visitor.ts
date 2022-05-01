import ReferenceSolver from '../ref-solver';
import {
  ComponentEventProps,
  EventType,
  MappingEventProps,
  ObjectType,
  ParsedRef,
  PathEventProps,
  VisitedPath,
  VisitorCallback,
} from './types';
import { Dict, OpenApiNode } from '../../types/common';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const buildComponentEvent = (
  objectType: ObjectType,
  originalRef: string,
  parsedRef: ParsedRef,
  originalValue: OpenApiNode,
  resolvedValue: OpenApiNode,
  objectPath: VisitedPath,
  resolvedDocument: OpenApiNode,
): ComponentEventProps => ({
  type: EventType.COMPONENT,
  objectType,
  originalRef,
  parsedRef,
  originalValue,
  resolvedValue,
  resolvedDocument,
  objectPath,
});

const buildPathEvent = (
  originalRef: string,
  parsedRef: ParsedRef,
  originalValue: OpenApiNode,
  resolvedValue: OpenApiNode,
  objectPath: VisitedPath,
  resolvedDocument: OpenApiNode,
  pathParentKey: string,
): PathEventProps => ({
  type: EventType.PATH,
  originalRef,
  parsedRef,
  originalValue,
  resolvedValue,
  resolvedDocument,
  objectPath,
  pathParentKey,
});

const buildMappingEvent = (
  refs: OpenApiNode[],
  mapping: Dict,
  document: OpenApiNode,
  baseFile: string,
): MappingEventProps => ({
  type: EventType.MAPPING,
  refs,
  mapping,
  document,
  baseFile,
});

const visitComposition = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  composition: OpenApiNode,
  branches: OpenApiNode[],
  callback: VisitorCallback,
) => {
  if (!composition || !branches) {
    return;
  }
  branches.forEach((branch: OpenApiNode, index) => {
    visitSchema(document, baseFile, refSolver, [...objectPath, index], branch, callback);
  });
  if (composition.discriminator?.mapping) {
    callback(buildMappingEvent(branches, composition.discriminator?.mapping, document, baseFile));
  }
};

const visitSchema = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  schema: OpenApiNode,
  callback: VisitorCallback,
) => {
  if (!schema) {
    return schema;
  }
  let nextBaseFile = baseFile;
  let nextDocument = document;
  let nextObject = schema;
  if (refSolver.isReference(schema)) {
    const { value, ref, document: doc } = refSolver.resolve(schema.$ref, document, baseFile);
    nextBaseFile = ref.remote;
    nextDocument = doc;
    nextObject = value;
    callback(buildComponentEvent(ObjectType.SCHEMA, schema.$ref, ref, schema, nextObject, objectPath, nextDocument));
  }

  visitComposition(
    nextDocument,
    nextBaseFile,
    refSolver,
    [...objectPath, 'oneOf'],
    nextObject,
    nextObject.oneOf,
    callback,
  );
  visitComposition(
    nextDocument,
    nextBaseFile,
    refSolver,
    [...objectPath, 'anyOf'],
    nextObject,
    nextObject.anyOf,
    callback,
  );
  visitComposition(
    nextDocument,
    nextBaseFile,
    refSolver,
    [...objectPath, 'allOf'],
    nextObject,
    nextObject.allOf,
    callback,
  );
  visitSchema(nextDocument, nextBaseFile, refSolver, [...objectPath, 'not'], nextObject.not, callback);

  if (nextObject.items) {
    visitSchema(nextDocument, nextBaseFile, refSolver, [...objectPath, 'items'], nextObject.items, callback);
  }
  if (nextObject.properties) {
    Object.entries<OpenApiNode>(nextObject.properties).forEach(([name, property]) => {
      visitSchema(nextDocument, nextBaseFile, refSolver, [...objectPath, 'properties', name], property, callback);
    });
  }
  if (nextObject.additionalProperties && typeof nextObject.additionalProperties === 'object') {
    visitSchema(
      nextDocument,
      nextBaseFile,
      refSolver,
      [...objectPath, 'additionalProperties'],
      nextObject.additionalProperties,
      callback,
    );
  }
  return schema;
};

const visitRequestBody = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  requestBody: OpenApiNode,
  callback: VisitorCallback,
) => {
  if (!requestBody) {
    return requestBody;
  }

  let nextBaseFile = baseFile;
  let nextDocument = document;
  let nextObject = requestBody;
  if (refSolver.isReference(requestBody)) {
    const { value, ref, document: doc } = refSolver.resolve(requestBody.$ref, document, baseFile);
    nextBaseFile = ref.remote;
    nextDocument = doc;
    nextObject = value;
    callback(
      buildComponentEvent(ObjectType.REQUEST_BODY, requestBody.$ref, ref, requestBody, nextObject, objectPath, nextDocument),
    );
  }
  visitMediaTypes(nextDocument, nextBaseFile, refSolver, [...objectPath, 'content'], nextObject.content, callback);
};

const visitExamples = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  examples: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!examples) {
    return;
  }
  Object.entries<OpenApiNode>(examples).forEach(([name, example]) => {
    if (refSolver.isReference(example)) {
      const { value, ref, document: doc } = refSolver.resolve(example.$ref, document, baseFile);
      callback(buildComponentEvent(ObjectType.EXAMPLE, example.$ref, ref, example, value, [...objectPath, name], doc));
    }
  });
};

const visitCallbacks = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  callbacks: Dict<OpenApiNode> | undefined,
  visitorCallback: VisitorCallback,
) => {
  if (!callbacks) {
    return;
  }
  Object.entries<OpenApiNode>(callbacks).forEach(([name, callback]) => {
    if (refSolver.isReference(callback)) {
      const { value, ref, document: doc } = refSolver.resolve(callback.$ref, document, baseFile);
      visitorCallback(buildComponentEvent(ObjectType.CALLBACK, callback.$ref, ref, callback, value, [...objectPath, name], doc));
    }
  });
};

const visitHeaders = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  headers: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!headers) {
    return;
  }
  Object.entries<OpenApiNode>(headers).forEach(([name, header]) => {
    if (refSolver.isReference(header)) {
      const { value, ref, document: doc } = refSolver.resolve(header.$ref, document, baseFile);
      callback(buildComponentEvent(ObjectType.HEADER, header.$ref, ref, header, value, [...objectPath, name], doc));
    }
  });
};

const visitLinks = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  links: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!links) {
    return;
  }
  Object.entries<OpenApiNode>(links).forEach(([name, link]) => {
    if (refSolver.isReference(link)) {
      const { value, ref, document: doc } = refSolver.resolve(link.$ref, document, baseFile);
      callback(buildComponentEvent(ObjectType.LINK, link.$ref, ref, link, value, [...objectPath, name], doc));
    }
  });
};

const visitMediaTypes = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  mediaTypes: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!mediaTypes) {
    return;
  }
  Object.entries<OpenApiNode>(mediaTypes).forEach(([key, media]) => {
    visitSchema(document, baseFile, refSolver, [...objectPath, key, 'schema'], media.schema, callback);
    visitExamples(document, baseFile, refSolver, [...objectPath, key, 'examples'], media.examples, callback);
  });
};

const visitResponses = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  responses: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!responses) {
    return;
  }
  Object.entries<OpenApiNode>(responses).forEach(([method, response]) => {
    let nextBaseFile = baseFile;
    let nextDocument = document;
    let nextObject = response;
    objectPath = [...objectPath, method];
    if (refSolver.isReference(response)) {
      const { value, ref, document: doc } = refSolver.resolve(response.$ref, document, baseFile);
      nextBaseFile = ref.remote;
      nextDocument = doc;
      nextObject = value;
      callback(buildComponentEvent(ObjectType.RESPONSE, response.$ref, ref, response, nextObject, objectPath, nextDocument));
    }
    visitMediaTypes(
      nextDocument,
      nextBaseFile,
      refSolver,
      [...objectPath, 'content'],
      nextObject.content,
      callback,
    );
    visitHeaders(
      nextDocument,
      nextBaseFile,
      refSolver,
      [...objectPath, 'headers'],
      nextObject.headers,
      callback,
    );
    visitLinks(nextDocument, nextBaseFile, refSolver, [...objectPath, method, 'links'], nextObject.links, callback);
  });
};

const visitPathParameters = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  parameters: OpenApiNode[] | undefined,
  callback: VisitorCallback,
) => {
  if (!parameters) {
    return;
  }
  parameters.forEach((parameter, index) => {
    let nextBaseFile = baseFile;
    let nextDocument = document;
    let nextObject = parameter;
    const objectPath: VisitedPath = ['paths', index];
    if (refSolver.isReference(parameter)) {
      const { value, ref, document: doc } = refSolver.resolve(parameter.$ref, document, baseFile);
      nextBaseFile = ref.remote;
      nextDocument = doc;
      nextObject = value;
      callback(buildComponentEvent(ObjectType.PARAMETER, parameter.$ref, ref, parameter, nextObject, objectPath, nextDocument));
    }
    visitSchema(nextDocument, nextBaseFile, refSolver, objectPath, nextObject.schema, callback);
    visitExamples(nextDocument, nextBaseFile, refSolver, objectPath, nextObject.examples, callback);
  });
};

const visitOperation = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  objectPath: VisitedPath,
  operation: OpenApiNode | undefined,
  callback: VisitorCallback,
) => {
  if (!operation) {
    return;
  }
  visitPathParameters(document, baseFile, refSolver, [...objectPath, 'parameters'], operation.parameters, callback);
  visitRequestBody(document, baseFile, refSolver, [...objectPath, 'requestBody'], operation.requestBody, callback);
  visitCallbacks(document, baseFile, refSolver, [...objectPath, 'callbacks'], operation.callbacks, callback);
  visitResponses(document, baseFile, refSolver, [...objectPath, 'responses'], operation.responses, callback);
};

export const visit = (
  openapiDoc: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  callback: VisitorCallback,
) => {
  if (openapiDoc.paths) {
    Object.entries(openapiDoc.paths).forEach(([key, apiPath]: any) => {
      let nextBaseFile = baseFile;
      let nextDocument = openapiDoc;
      let nextObject = apiPath;
      const objectPath: VisitedPath = ['paths', key];
      if (refSolver.isReference(apiPath)) {
        const { value, ref, document: doc } = refSolver.resolve(apiPath.$ref, openapiDoc, baseFile);
        nextBaseFile = ref.remote;
        nextDocument = doc;
        nextObject = value;
        callback(buildPathEvent(apiPath.$ref, ref, apiPath, nextObject, objectPath, nextDocument, key));
      }
      visitPathParameters(
        nextDocument,
        nextBaseFile,
        refSolver,
        [...objectPath, 'parameters'],
        nextObject.parameters,
        callback,
      );
      METHODS.forEach((method) => {
        const operation = nextObject[method];
        visitOperation(nextDocument, nextBaseFile, refSolver, [...objectPath, method], operation, callback);
      });
    });
  }
};
