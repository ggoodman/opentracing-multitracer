# Opentracing client that wraps a collection of child tracers

This is a library implementing the Open Tracing API such that it will deliver trace data to all subordinate tracing clients.

## Why?

As a part of some work evaluating whether my team would be interested in implementing distributed tracing, we considered multiple tracing solutions. This library helped us in a few ways:

1. We discovered what appeard to be a bug in a tracer client and wanted to be sure that the same operation generated an accurate trace using another client.
2. We wanted to compare the tracing interface and ergonomics of different tracing solutions. This library helped us compare the same traces across different systems.

## Installation

```bash
npm install opentracing-multitracer
```

## Example

```js
const { MultiTracer } = require('opentracing-multitracer');

const datadog = createDatadogTracer();
const jaeger = createJaegerTracer();
const lightstep = createLightstepTracer();

const multi = new MultiTracer([
    datadog,
    jaeger,
    lightstep,
]);

const span = multi.startSpan('hello-opentracing'); // A span is created in each tracer
span.finish();
```

## API

Instances of the `MultiTracer` implement the [opentracing api](https://github.com/opentracing/opentracing-javascript#api-documentation). Please refer to the canonical documentation.

## Notes

Care is taken so that injected and extracted span contexts are bound to the correct tracer. Further, span references will be properly associated with the correct subordinate tracer.

> **WARNING**: Because we do not attempt to intercept or modify injections, it is possible that multiple subordinate tracers may clobber each others' injections if they use the same carrier keys. Buyer beware.
