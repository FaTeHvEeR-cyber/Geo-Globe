import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'node_modules/cesium/Build/Cesium');
const target = path.join(root, 'public/cesium');
if (path.relative(root, target) !== path.join('public', 'cesium')) throw new Error('Invalid asset path');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const directory of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) {
  await cp(path.join(source, directory), path.join(target, directory), { recursive: true });
}
const { version } = JSON.parse(await readFile(path.join(root, 'node_modules/cesium/package.json'), 'utf8'));
await writeFile(path.join(target, 'version.json'), JSON.stringify({ version }));
console.log(`Cesium ${version}: runtime assets synchronized`);
