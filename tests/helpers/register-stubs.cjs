// Redirects native-only modules to in-memory stubs so app services run under
// Node's test runner. tsx transpiles the TS sources to CJS, so the CJS
// resolver is the interception point.
// Used via:  node --require ./tests/helpers/register-stubs.cjs --import tsx --test …
const Module = require('node:module');
const path = require('node:path');

const STUBS = {
  '@react-native-async-storage/async-storage': path.join(__dirname, 'stubs', 'async-storage.cjs'),
  'react-native': path.join(__dirname, 'stubs', 'react-native.cjs'),
  'react-native-purchases': path.join(__dirname, 'stubs', 'react-native-purchases.cjs'),
  '@supabase/supabase-js': path.join(__dirname, 'stubs', 'supabase-js.cjs'),
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
  return originalResolve.call(this, request, ...rest);
};
