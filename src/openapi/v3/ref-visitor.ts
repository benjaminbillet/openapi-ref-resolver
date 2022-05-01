import ReferenceSolver from '../ref-solver';
import {
  ComponentEventProps,
  EventType,
  MappingEventProps,
  ObjectType,
  ParsedRef,
  PathEventProps,
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
  resolvedDocument: OpenApiNode,
): ComponentEventProps => ({
  type: EventType.COMPONENT,
  objectType,
  originalRef,
  parsedRef,
  originalValue,
  resolvedValue,
  resolvedDocument,
});

const buildPathEvent = (
  originalRef: string,
  parsedRef: ParsedRef,
  originalValue: OpenApiNode,
  resolvedValue: OpenApiNode,
  resolvedDocument: OpenApiNode,
  pathParentKey: string,
): PathEventProps => ({
  type: EventType.PATH,
  originalRef,
  parsedRef,
  originalValue,
  resolvedValue,
  resolvedDocument,
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
  composition: OpenApiNode,
  branches: OpenApiNode[],
  callback: VisitorCallback,
) => {
  if (!composition || !branches) {
    return;
  }
  branches.forEach((branch: OpenApiNode) => {
    visitSchema(document, baseFile, refSolver, branch, callback);
  });
  if (composition.discriminator?.mapping) {
    callback(buildMappingEvent(branches, composition.discriminator?.mapping, document, baseFile));
  }
};

const visitSchema = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
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
    callback(buildComponentEvent(ObjectType.SCHEMA, schema.$ref, ref, schema, nextObject, nextDocument));
  }

  visitComposition(nextDocument, nextBaseFile, refSolver, nextObject, nextObject.oneOf, callback);
  visitComposition(nextDocument, nextBaseFile, refSolver, nextObject, nextObject.anyOf, callback);
  visitComposition(nextDocument, nextBaseFile, refSolver, nextObject, nextObject.allOf, callback);
  visitSchema(nextDocument, nextBaseFile, refSolver, nextObject.not, callback);

  if (nextObject.items) {
    visitSchema(nextDocument, nextBaseFile, refSolver, nextObject.items, callback);
  }
  if (nextObject.properties) {
    Object.values<OpenApiNode>(nextObject.properties).forEach((property) => {
      visitSchema(nextDocument, nextBaseFile, refSolver, property, callback);
    });
  }
  if (nextObject.additionalProperties && typeof nextObject.additionalProperties === 'object') {
    visitSchema(nextDocument, nextBaseFile, refSolver, nextObject.additionalProperties, callback);
  }
  return schema;
};

const visitRequestBody = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
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
      buildComponentEvent(ObjectType.REQUEST_BODY, requestBody.$ref, ref, requestBody, nextObject, nextDocument),
    );
  }
  visitMediaTypes(nextDocument, nextBaseFile, refSolver, nextObject.content, callback);
};

const visitExamples = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  examples: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!examples) {
    return;
  }
  Object.values<OpenApiNode>(examples).forEach((example) => {
    if (refSolver.isReference(example)) {
      const { value, ref, document: doc } = refSolver.resolve(example.$ref, document, baseFile);
      callback(buildComponentEvent(ObjectType.EXAMPLE, example.$ref, ref, example, value, doc));
    }
  });
};

const visitCallbacks = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  callbacks: Dict<OpenApiNode> | undefined,
  visitorCallback: VisitorCallback,
) => {
  if (!callbacks) {
    return;
  }
  Object.values<OpenApiNode>(callbacks).forEach((callback) => {
    if (refSolver.isReference(callback)) {
      const { value, ref, document: doc } = refSolver.resolve(callback.$ref, document, baseFile);
      visitorCallback(buildComponentEvent(ObjectType.CALLBACK, callback.$ref, ref, callback, value, doc));
    }
  });
};

const visitHeaders = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  headers: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!headers) {
    return;
  }
  Object.values<OpenApiNode>(headers).forEach((header) => {
    if (refSolver.isReference(header)) {
      const { value, ref, document: doc } = refSolver.resolve(header.$ref, document, baseFile);
      callback(buildComponentEvent(ObjectType.HEADER, header.$ref, ref, header, value, doc));
    }
  });
};

const visitLinks = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  links: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!links) {
    return;
  }
  Object.values<OpenApiNode>(links).forEach((link) => {
    if (refSolver.isReference(link)) {
      const { value, ref, document: doc } = refSolver.resolve(link.$ref, document, baseFile);
      callback(buildComponentEvent(ObjectType.LINK, link.$ref, ref, link, value, doc));
    }
  });
};

const visitMediaTypes = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  mediaTypes: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!mediaTypes) {
    return;
  }
  Object.values<OpenApiNode>(mediaTypes).forEach((media) => {
    visitSchema(document, baseFile, refSolver, media.schema, callback);
    visitExamples(document, baseFile, refSolver, media.examples, callback);
  });
};

const visitResponses = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  responses: Dict<OpenApiNode> | undefined,
  callback: VisitorCallback,
) => {
  if (!responses) {
    return;
  }
  Object.values<OpenApiNode>(responses).forEach((response) => {
    let nextBaseFile = baseFile;
    let nextDocument = document;
    let nextObject = response;
    if (refSolver.isReference(response)) {
      const { value, ref, document: doc } = refSolver.resolve(response.$ref, document, baseFile);
      nextBaseFile = ref.remote;
      nextDocument = doc;
      nextObject = value;
      callback(buildComponentEvent(ObjectType.RESPONSE, response.$ref, ref, response, nextObject, nextDocument));
    }
    visitMediaTypes(nextDocument, nextBaseFile, refSolver, nextObject.content, callback);
    visitHeaders(nextDocument, nextBaseFile, refSolver, nextObject.headers, callback);
    visitLinks(nextDocument, nextBaseFile, refSolver, nextObject.links, callback);
  });
};

const visitPathParameters = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  parameters: OpenApiNode[] | undefined,
  callback: VisitorCallback,
) => {
  if (!parameters) {
    return;
  }
  parameters.forEach((parameter) => {
    let nextBaseFile = baseFile;
    let nextDocument = document;
    let nextObject = parameter;
    if (refSolver.isReference(parameter)) {
      const { value, ref, document: doc } = refSolver.resolve(parameter.$ref, document, baseFile);
      nextBaseFile = ref.remote;
      nextDocument = doc;
      nextObject = value;
      callback(buildComponentEvent(ObjectType.PARAMETER, parameter.$ref, ref, parameter, nextObject, nextDocument));
    }
    visitSchema(nextDocument, nextBaseFile, refSolver, nextObject.schema, callback);
    visitExamples(nextDocument, nextBaseFile, refSolver, nextObject.examples, callback);
  });
};

const visitOperation = (
  document: OpenApiNode,
  baseFile: string,
  refSolver: ReferenceSolver,
  operation: OpenApiNode | undefined,
  callback: VisitorCallback,
) => {
  if (!operation) {
    return;
  }
  visitPathParameters(document, baseFile, refSolver, operation.parameters, callback);
  visitRequestBody(document, baseFile, refSolver, operation.requestBody, callback);
  visitCallbacks(document, baseFile, refSolver, operation.callbacks, callback);
  visitResponses(document, baseFile, refSolver, operation.responses, callback);
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
      if (refSolver.isReference(apiPath)) {
        const { value, ref, document: doc } = refSolver.resolve(apiPath.$ref, openapiDoc, baseFile);
        nextBaseFile = ref.remote;
        nextDocument = doc;
        nextObject = value;
        callback(buildPathEvent(apiPath.$ref, ref, apiPath, nextObject, nextDocument, key));
      }
      visitPathParameters(nextDocument, nextBaseFile, refSolver, nextObject.parameters, callback);
      METHODS.forEach((method) => {
        const operation = nextObject[method];
        visitOperation(nextDocument, nextBaseFile, refSolver, operation, callback);
      });
    });
  }
};
