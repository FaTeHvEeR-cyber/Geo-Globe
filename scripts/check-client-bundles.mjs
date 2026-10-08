import { readdir, readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import path from 'node:path';

// Parse without executing. This catches invalid escapes emitted by minifiers
// that can pass next build but prevent the Cesium chunk loading in browsers.
async function check(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await check(file);
    else if (entry.name.endsWith('.js')) {
      try { new Script(await readFile(file, 'utf8'), { filename: file }); }
      catch (error) { throw new Error(`${file}: ${error.message}`); }
      count++;
    }
  }
  return count;
}
console.log(`Verified syntax of ${await check('.next/static/chunks')} production JavaScript chunks.`);
