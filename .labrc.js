module.exports = {
  coverage: true,
  threshold: 74,
  lint: false,
  globals:
    'verbose,dryRun,SharedArrayBuffer,Atomics,BigUint64Array,BigInt64Array,BigInt,URL,URLSearchParams,TextEncoder,TextDecoder,queueMicrotask,AggregateError,FinalizationRegistry,WeakRef,atob,btoa,AbortController,AbortSignal,EventTarget,Event,MessageChannel,MessagePort,MessageEvent,performance,Blob,BroadcastChannel,structuredClone,DOMException,ReadableStream,ReadableStreamDefaultReader,ReadableStreamBYOBReader,ReadableStreamBYOBRequest,ReadableByteStreamController,ReadableStreamDefaultController,TransformStream,TransformStreamDefaultController,WritableStream,WritableStreamDefaultWriter,WritableStreamDefaultController,ByteLengthQueuingStrategy,CountQueuingStrategy,TextEncoderStream,TextDecoderStream,CompressionStream,DecompressionStream,fetch,FormData,Headers,Request,Response',
  assert: '@hapi/code',
  verbose: true,
  'coverage-exclude': ['lib/interface']
};
