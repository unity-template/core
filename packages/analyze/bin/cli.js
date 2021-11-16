#!/usr/bin/env node
const path = require('path');

const sync = require(path.join(__filename, '../../build/sync'));
const fs = require('fs-extra');


const packagePath = path.join(process.cwd(), './package.json');
const npmPackage = fs.readJsonSync(packagePath);
sync.default({
  ...npmPackage.syncConfig,
  cwd: process.cwd(),
});
