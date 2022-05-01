import { Dict, OpenApiNode } from '../../types/common';

export enum ObjectType {
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

export enum EventType {
  PATH,
  MAPPING,
  COMPONENT,
}

export interface ParsedRef {
  remote: string;
  local: string;
  full: string;
}

export interface VisitorEventProps {
  originalRef: string;
  parsedRef: ParsedRef;
  originalValue: OpenApiNode;
  resolvedValue: OpenApiNode;
  resolvedDocument: OpenApiNode;
  objectPath: VisitedPath;
}

export interface PathEventProps extends VisitorEventProps {
  type: EventType.PATH;
  pathParentKey: string;
}

export interface MappingEventProps {
  type: EventType.MAPPING;
  refs: OpenApiNode[];
  mapping: Dict;
  document: OpenApiNode;
  baseFile: string;
}

export interface ComponentEventProps extends VisitorEventProps {
  type: EventType.COMPONENT;
  objectType: ObjectType;
}

export type VisitorEvent = PathEventProps | MappingEventProps | ComponentEventProps;

export type VisitorCallback = (event: VisitorEvent) => void;

export type VisitedPath = (number | string)[];
