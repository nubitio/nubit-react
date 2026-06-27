#!/usr/bin/env node
/**
 * Nubit eject CLI — generates explicit resource/page files from Hydra docs.
 * Run from the monorepo root: node packages/eject/bin/nubit.mjs eject fields /api/products
 */
import process from 'node:process';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadModule() {
  const distRoot = resolve(__dirname, '../dist');
  try {
    return await import(pathToFileURL(resolve(distRoot, 'index.mjs')).href);
  } catch {
    // Dev fallback: import TypeScript sources via relative path (requires built hydra/crud)
    return await import(pathToFileURL(resolve(__dirname, '../src/runCli.ts')).href);
  }
}

const [, , command, target, ...rest] = process.argv;

function flag(name, fallback) {
  const index = rest.indexOf(name);
  if (index === -1) return fallback;
  return rest[index + 1] ?? fallback;
}

const mod = await loadModule();
await mod.runCli({ command, target, rest, flag, writeFileSync, resolve });