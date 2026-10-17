import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url));
const VERSION = '20261017-starcore-16';

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path)
      : entry.name.endsWith('.js') || entry.name === 'index.html' ? [path] : [];
  });
}

test('公開遊戲每個載入中的模組都使用同一個快取版本', () => {
  const files = sourceFiles(ROOT);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:from\s*|src\s*=\s*)["'](\.\/[^"']+\.js[^"']*)["']/g)) {
      assert.match(match[1], new RegExp(`\\?v=${VERSION}$`),
        `${file} 仍載入舊快取網址 ${match[1]}`);
    }
    if (file.endsWith('index.html')) {
      assert.match(text, new RegExp(VERSION));
    }
  }
});
