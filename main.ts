// Package the local game and screenshots for the make.fun submission.
// Run with Node 22; MAKEFUN_OUTPUT_DIR can override the default /output path.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const sourceDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const dossierPath = join(outputDir, 'dossier.json');

function requireSourceDirectory(name) {
  const path = join(sourceDir, name);
  if (!existsSync(path)) {
    throw new Error(`Required source directory is missing: ${path}`);
  }
  return path;
}

function copyDirectory(name) {
  const source = requireSourceDirectory(name);
  const destination = join(outputDir, name);
  cpSync(source, destination, { recursive: true });
  return destination;
}

function createDossier() {
  const limits = {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  };
  writeFileSync(dossierPath, buildDossier(outputDir, limits));
}

function countTopLevelFiles(directory) {
  return readdirSync(directory).length;
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  const gamePath = copyDirectory('game');
  const screenshotsPath = copyDirectory('screenshots');
  createDossier();
  // Keep the summary compact while confirming both copied locations and dossier path.
  console.error(`Copied game (${countTopLevelFiles(gamePath)} entries) and screenshots (${countTopLevelFiles(screenshotsPath)} entries) to ${outputDir}; wrote ${dossierPath}`);
}

main();
