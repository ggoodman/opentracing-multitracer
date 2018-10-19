import * as Opentracing from 'opentracing';

export class MultiSpan extends Opentracing.Span {
  private spanContext: Opentracing.SpanContext;

  constructor(private multiTracer: MultiTracer, private spans: Opentracing.Span[], private multiName: string) {
    super();

    this.spanContext = new MultiSpanContext(this.spans.map(span => span.context()));
  }

  protected _addTags(keyValuePairs: { [key: string]: any }): void {
    for (const span of this.spans) {
      span.addTags(keyValuePairs);
    }
  }

  protected _context(): Opentracing.SpanContext {
    return this.spanContext;
  }

  protected _finish(finishTime?: number) {
    const now = Date.now();

    for (const span of this.spans) {
      span.finish(finishTime);
    }
  }

  protected _getBaggageItem(key: string): string | undefined {
    for (const span of this.spans) {
      const value = span.getBaggageItem(key);

      if (typeof value !== undefined) return value;
    }
  }

  protected _log(keyValuePairs: { [key: string]: any }, timestamp?: number): void {
    for (const span of this.spans) {
      span.log(keyValuePairs, timestamp);
    }
  }

  protected _setBaggageItem(key: string, value: string): void {
    for (const span of this.spans) {
      span.setBaggageItem(key, value);
    }
  }

  protected _setOperationName(name: string): void {
    for (const span of this.spans) {
      span.setOperationName(name);
    }
  }

  protected _tracer() {
    return this.multiTracer;
  }
}

export class MultiSpanContext extends Opentracing.SpanContext {
  constructor(public spanContexts: Opentracing.SpanContext[]) {
    super();
  }
}

export class MultiTracer extends Opentracing.Tracer {
  constructor(public tracers: Opentracing.Tracer[]) {
    super();
  }

  _extract(format: string, carrier: any) {
    const spanContexts = this.tracers.map(tracer => tracer.extract(format, carrier));

    return new MultiSpanContext(spanContexts);
  }

  _inject(spanContext: Opentracing.SpanContext, format: string, carrier: any) {
    for (const tracerIdx in this.tracers) {
      const tracer = this.tracers[tracerIdx];
      if (spanContext instanceof MultiSpanContext) {
        tracer.inject(spanContext.spanContexts[tracerIdx], format, carrier);
      } else {
        tracer.inject(spanContext, format, carrier);
      }
    }
  }

  _startSpan(name: string, options: Opentracing.SpanOptions = {}) {
    const spans = this.tracers.map((tracer, tracerIdx) => {
      const references = options.references
        ? options.references
            .map(ref => {
              const spanContext = ref.referencedContext();

              if (spanContext instanceof MultiSpanContext) {
                if (!spanContext.spanContexts[tracerIdx]) {
                  return;
                }

                return new Opentracing.Reference(ref.type(), spanContext.spanContexts[tracerIdx]);
              }

              return ref;
            })
            .filter(Boolean)
        : undefined;

      return tracer.startSpan(name, { ...options, references });
    });
    const multiSpan = new MultiSpan(this, spans, name);

    return multiSpan;
  }
}
