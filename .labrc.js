module.exports = {
  coverage: true,
  threshold: 74,
  lint: true,
  globals: 'verbose,dryRun,SharedArrayBuffer,Atomics,BigUint64Array,BigInt64Array,BigInt,URL,URLSearchParams,TextEncoder,TextDecoder,queueMicrotask',
  assert: '@hapi/code',
  verbose: true,
  'coverage-exclude': [
    'lib/interface',
    'lib/transitions',
  ]
};
