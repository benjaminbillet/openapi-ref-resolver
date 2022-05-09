export type Dict<V = string> = {
  [key: string]: V;
};

export type OneOrMany<T> = T | T[];

export type OpenApiNode = {
  [key: string]: any;
};

export type FileFormat = 'yaml' | 'json';

export interface ResolvedRef {
  // absolute remote part of the reference
  remote: string;
  // local part of the reference (without #/ prefix)
  local: string;
  // full reference: <remote>#/<local>
  full: string;
}
