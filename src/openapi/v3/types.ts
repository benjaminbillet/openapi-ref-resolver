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
  PATH = 'path',
  MAPPING = 'mapping',
  COMPONENT = 'component',
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

export interface PathEvent extends VisitorEventProps {
  type: EventType.PATH;
  pathParentKey: string;
}

export interface MappingEvent {
  type: EventType.MAPPING;
  refs: OpenApiNode[];
  mapping: Dict;
  document: OpenApiNode;
  baseFile: string;
}

export interface ComponentEvent extends VisitorEventProps {
  type: EventType.COMPONENT;
  objectType: ObjectType;
}

export type VisitorEvent = PathEvent | MappingEvent | ComponentEvent;

export type VisitorCallback = (event: VisitorEvent) => void;

export type VisitedPath = (number | string)[];
