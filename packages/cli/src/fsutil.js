'use strict';

const fs = require('fs');
const path = require('path');

function pathExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeText(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, 'utf8');
}

function copyFile(src, dest, { force = true, skipExisting = false } = {}) {
  if (pathExists(dest)) {
    if (skipExisting) return;
    if (!force) return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyTree(src, dest, opts = {}) {
  if (!pathExists(src)) return;
  const stat = fs.statSync(src);
  if (stat.isFile()) {
    copyFile(src, dest, opts);
    return;
  }
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    copyTree(path.join(src, entry), path.join(dest, entry), opts);
  }
}

module.exports = { pathExists, ensureDir, readText, writeText, copyFile, copyTree };
