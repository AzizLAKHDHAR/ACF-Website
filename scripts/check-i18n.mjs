#!/usr/bin/env node
// Verifies that messages/{ar,fr,en}.json have identical key sets, no empty strings,
// and the same ICU placeholders per key. Exits non-zero on any mismatch (run in CI).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LOCALES = ['ar', 'fr', 'en'];
const REFERENCE = 'en';
const messagesDir = new URL('../messages/', import.meta.url);

function flatten(value, prefix = '', out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object') flatten(child, path, out);
    else out.set(path, child);
  }
  return out;
}

function placeholders(message) {
  return [...String(message).matchAll(/\{\s*([A-Za-z0-9_]+)/g)]
    .map((m) => m[1])
    .sort()
    .join(',');
}

const catalogs = Object.fromEntries(
  LOCALES.map((locale) => {
    const file = fileURLToPath(new URL(`${locale}.json`, messagesDir));
    return [locale, flatten(JSON.parse(readFileSync(file, 'utf8')))];
  }),
);

const errors = [];
const reference = catalogs[REFERENCE];

for (const locale of LOCALES) {
  const catalog = catalogs[locale];
  for (const key of reference.keys()) {
    if (!catalog.has(key)) errors.push(`${locale}: missing key "${key}"`);
  }
  for (const [key, message] of catalog) {
    if (!reference.has(key))
      errors.push(`${locale}: extra key "${key}" (not in ${REFERENCE}.json)`);
    if (typeof message !== 'string' || message.trim() === '') {
      errors.push(`${locale}: empty or non-string message "${key}"`);
    } else if (reference.has(key) && placeholders(message) !== placeholders(reference.get(key))) {
      errors.push(`${locale}: placeholders of "${key}" differ from ${REFERENCE}.json`);
    }
  }
}

if (errors.length > 0) {
  console.error(`i18n check failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`i18n check passed: ${reference.size} keys in ${LOCALES.join(', ')}.`);
