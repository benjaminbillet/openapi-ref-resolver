import { OpenApiNode } from '../../types/common';

export enum ObjectType {
  PATH = 'paths',
  PARAMETER = 'parameters',
  EXAMPLE = 'examples',
  REQUEST_BODY = 'requestBodies',
  SCHEMA = 'schemas',
  RESPONSE = 'responses',
  LINK = 'links',
  CALLBACK = 'callbacks',
  SECURITY_SCHEME = 'securitySchemes',
  HEADER = 'headers',
}

export interface ParsedRef {
  remote: string;
  local: string;
  full: string;
}

export type VisitorCallback = (
  objectType: ObjectType,
  originalRef: string,
  parsedRef: ParsedRef,
  originalValue: { $ref: string },
  resolvedValue: OpenApiNode,
  resolvedDocument: OpenApiNode,
  pathParentKey?: string,
) => void;
