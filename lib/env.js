'use strict';

exports.isNode = 'undefined' != typeof process &&
  'object' == typeof module &&
  'object' == typeof global &&
  'function' == typeof Buffer &&
  process.argv;

exports.isMongo = !exports.isNode &&
  'function' == typeof printjson &&
  'function' == typeof ObjectId &&
  'function' == typeof rs &&
  'function' == typeof sh;

exports.isBrowser = !exports.isNode && !exports.isMongo && 'undefined' != typeof window;

exports.isAstra = exports.isNode && process.env.USE_ASTRA;

exports.type = exports.isAstra ? 'astra'
  : exports.isNode ? 'node'
    : exports.isMongo ? 'mongo'
      : exports.isBrowser ? 'browser'
        : 'unknown';
