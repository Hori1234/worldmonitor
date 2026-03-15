/**
 * Compiles the sebuf RPC gateway (api/[domain]/v1/[rpc].ts) into a single
 * self-contained ESM bundle (api/[domain]/v1/[rpc].js) so the Tauri sidecar's
 * buildRouteTable() can discover and load it.
 *
 * Run: node scripts/build-sidecar-sebuf.mjs
 * Or:  npm run build:sidecar-sebuf
 */

// import { build } from 'esbuild';
// import { stat } from 'node:fs/promises';
// import { fileURLToPath } from 'node:url';
// import path from 'node:path';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const projectRoot = path.resolve(__dirname, '..');

// const entryPoint = path.join(projectRoot, 'api', '[domain]', 'v1', '[rpc].ts');
// const outfile = path.join(projectRoot, 'api', '[domain]', 'v1', '[rpc].js');


//Previous code
// try {
//   await build({
//     entryPoints: [entryPoint],
//     outfile,
//     bundle: true,
//     format: 'esm',
//     platform: 'node',
//     target: 'node18',
//     // Tree-shake unused exports for smaller bundle
//     treeShaking: true,
//   });

//   const { size } = await stat(outfile);
//   const sizeKB = (size / 1024).toFixed(1);
//   console.log(`build:sidecar-sebuf  api/[domain]/v1/[rpc].js  ${sizeKB} KB`);
// } catch (err) {
//   console.error('build:sidecar-sebuf failed:', err.message);
//   process.exit(1);
// }


import { build } from 'esbuild';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const apiDir = path.join(projectRoot, 'api');

// Function to recursively find all [rpc].ts files
function findRpcFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findRpcFiles(filePath, fileList);
    } else if (file === '[rpc].ts') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const entryPoints = findRpcFiles(apiDir);

if (entryPoints.length === 0) {
  console.warn("No [rpc].ts files found to build for sidecar!");
  process.exit(0);
}

try {
  for (const entryPoint of entryPoints) {
    // Generate an outfile path replacing .ts with .js
    const outfile = entryPoint.replace(/\.ts$/, '.js');

    await build({
      entryPoints: [entryPoint],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node18',
      // Tree-shake unused exports for smaller bundle
      treeShaking: true,
    });

    const { size } = await stat(outfile);
    const sizeKB = (size / 1024).toFixed(1);
    
    // Make display path relative to root to look clean in logs
    const displayPath = path.relative(projectRoot, outfile).replace(/\\/g, '/');
    console.log(`build:sidecar-sebuf  ${displayPath}  ${sizeKB} KB`);
  }
} catch (err) {
  console.error('build:sidecar-sebuf failed:', err.message);
  process.exit(1);
}