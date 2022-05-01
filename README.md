# openapi-ref-resolver

Simple resolver for bundling OpenAPI specifications (YAML and JSON).

Supported OpenAPI versions:
- 3.0.0, 3.0.1, 3.0.2

## How to use

```
npm install openapi-ref-resolver
```

```javascript
import { bundleOpenApiSpec } from 'openapi-ref-resolver';

try {
  const bundled = bundleOpenApiSpec('./api.yaml');
  console.log(JSON.stringify(bundled, null, 2));
} catch (err) {
  console.log(err);
}
```

## Missing features

- Dereference
- Support for OpenAPI v2
- Resolve URI references (only `file:` scheme is supported)

## But why another reference resolver?

I started this project while I was working on some OpenAPI-based custom code generator. At that time, I tried several libraries for bundling a multi-file YAML spec into a single-file JSON spec (a use case that I consider quite common when you are doing code generation).

Long story short, I never managed to find a library that satisfies the following requirements, even for the simplest specs:

- `paths` references inlined, all other references locally resolved into `components/*` depending on their types.
- produce readable local references and not things like `#/paths/~1api~1v1~garbledstud/post/requestBody/content/application~1json/schema/properties/ohgodwhy`
- Javascript library
- no preprocessing required with a manual tool
- produces a valid spec file

My lib certainly has quirks too, so please open issues. Also, the code is very simple and PRs are welcome!
