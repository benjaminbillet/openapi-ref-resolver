import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';
import { getProtocol } from '../util/uri';
import { Dict, OpenApiNode } from '../types/common';


export default class {
  private refCache: Dict<OpenApiNode> = {};

  public isReference(obj: any): obj is { $ref: string } {
    return '$ref' in obj;
  }

  public resolve(ref: string, document: OpenApiNode, baseFile: string) {
    if (ref.startsWith('#')) {
      return this.resolveLocal(ref, baseFile, document);
    }
    const protocol = getProtocol(ref);
    if (protocol != null) {
      if (protocol == 'file://') {
        ref = ref[7] === '/' ? ref.substring(8) : ref.substring(7);
      }
    }
    return this.resolveFile(ref, baseFile);
  }

  private followPath(document: any, path: string): OpenApiNode {
    const parts = path.split('/');
    const value = parts.reduce((result, part) => {
      return result[part.replaceAll('~0', '~').replaceAll('~1', '/')];
    }, document);
    return value;
  }

  private resolveLocal(ref: string, baseFile: string, document: OpenApiNode) {
    const localPath = ref.substring(2);
    const value = this.followPath(document, localPath);
    return {
      value,
      document,
      ref: { remote: baseFile, local: localPath, full: `${baseFile}/${localPath}` },
    };
  }

  private resolveFile(ref: string, baseFile: string) {
    const [filePath, absLocalPath] = ref.split('#');
    const localPath = absLocalPath.substring(1);
    const absoluteFilePath = path.join(path.dirname(path.resolve(baseFile)), filePath);
    let document = this.refCache[absoluteFilePath];
    if (!document) {
      document = yaml.load(fs.readFileSync(absoluteFilePath).toString()) as OpenApiNode;
      this.refCache[absoluteFilePath] = document;
    }
    const value = this.followPath(document, localPath);
    return {
      value,
      document,
      ref: { remote: absoluteFilePath, local: localPath, full: `${absoluteFilePath}/${localPath}` },
    };
  }
}
