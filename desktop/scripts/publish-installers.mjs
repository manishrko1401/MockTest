// Puts the newly built installers on the website (web/public/downloads) as the latest version.
//   npm run build:all && npm run publish:web
// The website's download button (/api/download/windows) always serves what latest.json lists,
// so after this the next website deploy offers the new version. Older installers are removed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const conf = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const version = conf.version;
const product = conf.productName || 'Mock Test Hub';
const outDir = path.join(root, '..', 'web', 'public', 'downloads');

const builds = {
  x64: path.join(root, 'src-tauri', 'target', 'x86_64-pc-windows-msvc', 'release', 'bundle', 'nsis', `${product}_${version}_x64-setup.exe`),
  arm64: path.join(root, 'src-tauri', 'target', 'aarch64-pc-windows-msvc', 'release', 'bundle', 'nsis', `${product}_${version}_arm64-setup.exe`),
};

for (const [arch, file] of Object.entries(builds)) {
  if (!fs.existsSync(file)) {
    console.error(`Missing the ${arch} installer for version ${version}:\n  ${file}\nRun "npm run build:all" first.`);
    process.exit(1);
  }
}

fs.mkdirSync(outDir, { recursive: true });
for (const old of fs.readdirSync(outDir)) {
  if (old.endsWith('.exe')) fs.rmSync(path.join(outDir, old));
}

const files = {};
for (const [arch, file] of Object.entries(builds)) {
  const name = `MockTestHub_${version}_${arch}-setup.exe`;
  fs.copyFileSync(file, path.join(outDir, name));
  files[arch] = { file: name, size: fs.statSync(file).size };
}

const latest = { version, releasedAt: new Date().toISOString().slice(0, 10), files };
fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(latest, null, 2) + '\n');
console.log(`Website now offers version ${version}:`);
for (const [arch, f] of Object.entries(files)) console.log(`  ${arch}: ${f.file} (${(f.size / 1048576).toFixed(1)} MB)`);
console.log('Deploy the website to publish it.');
