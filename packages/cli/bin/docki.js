#!/usr/bin/env node
'use strict';

const { main } = require('../src/main');

main(process.argv.slice(2)).catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(typeof err?.exitCode === 'number' ? err.exitCode : 1);
});
