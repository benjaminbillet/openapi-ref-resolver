export type Dict<V = string> = {
  [key: string]: V;
};

export type OneOrMany<T> = T | T[];

export type OpenApiNode = {
  [key: string]: any;
};

export type FileFormat = 'yaml' | 'json';
