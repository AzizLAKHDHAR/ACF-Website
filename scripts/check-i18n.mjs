#!/usr/bin/env node
// Verifies that messages/{ar,fr,en}.json have identical key sets, no empty strings,
// and the same ICU placeholders per key. Exits non-zero on any mismatch (run in CI).
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
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

// ICU argument names, from the real parser (plural/select branch text is not a placeholder).
function placeholders(message) {
  const names = new Set();
  const walk = (elements) => {
    for (const element of elements) {
      if (element.type !== TYPE.literal && element.type !== TYPE.pound && 'value' in element) {
        names.add(element.value);
      }
      if ('options' in element) {
        for (const option of Object.values(element.options)) walk(option.value);
      }
      if ('children' in element) walk(element.children);
    }
  };
  walk(parse(String(message)));
  return [...names].sort().join(',');
}

function parses(message) {
  try {
    parse(String(message));
    return true;
  } catch {
    return false;
  }
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
    } else if (!parses(message)) {
      errors.push(`${locale}: invalid ICU message "${key}"`);
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
