import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve('android/app/src/main/AndroidManifest.xml');
const requiredPermissions = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
];

let manifest;
try {
  manifest = await readFile(manifestPath, 'utf8');
} catch {
  console.error('Android project not found. Run `pnpm exec cap add android` first.');
  process.exit(1);
}

const missing = requiredPermissions.filter(
  (permission) =>
    !new RegExp(`<uses-permission\\s+android:name=["']${permission}["']`).test(manifest),
);

if (!missing.length) {
  console.log('Android location permissions are present.');
  process.exit(0);
}

if (!/<\/manifest>\s*$/.test(manifest)) {
  console.error('Could not find the closing manifest tag.');
  process.exit(1);
}

const declarations = missing
  .map((permission) => `    <uses-permission android:name="${permission}" />`)
  .join('\n');
manifest = manifest.replace(/<\/manifest>\s*$/, `${declarations}\n</manifest>\n`);
await writeFile(manifestPath, manifest, 'utf8');
console.log(`Added Android location permissions: ${missing.join(', ')}`);
