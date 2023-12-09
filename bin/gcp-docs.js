#!/usr/bin/env node

import { cli } from '../src/cli.js';

cli(process.argv).catch(error => {
  console.error(error);
  process.exit(1);
});
