# openapi-ref-resolver

Simple resolver for bundling/dereferencing OpenAPI specifications (YAML and JSON).

Supported OpenAPI versions:
- 3.0.0, 3.0.1, 3.0.2

## How to use

```
npm install openapi-ref-resolver
```

Bundle:
```javascript
import { bundleOpenApiSpec } from 'openapi-ref-resolver';

const bundled = bundleOpenApiSpec('./api.yaml');
console.log(JSON.stringify(bundled, null, 2));
```

Dereference:
```javascript
import { dereferenceOpenApiSpec } from 'openapi-ref-resolver';

const dereferenced = dereferenceOpenApiSpec('./api.yaml');
console.log(JSON.stringify(dereferenced, null, 2));
```

## Missing features

- Support for OpenAPI v2
- Resolve URI references (only `file:` scheme is supported)

## But why another reference resolver?

I started this project while I was working on some OpenAPI-based custom code generator. At that time, I tried several libraries for bundling a multi-file YAML spec into a single-file JSON spec (a pretty common use case for code generation).

Long story short, I never managed to find a library that satisfies the following requirements, even for the simplest specs:

- `paths` references inlined, all other references locally resolved into `components/*`.
- generate readable local references, not `#/paths/~1api~1v1~garbledstuff/post/requestBody/content/application~1json/schema/properties/oh/god/why`
- Javascript library
- no preprocessing required with a manual tool
- produce a valid spec file

This library certainly has quirks too, so please open issues. Also, the code is very simple and PRs are welcome!
