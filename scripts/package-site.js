import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {};
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(absolute, relative + '/');
    else files[relative] = new Uint8Array(await readFile(absolute));
  }
}
await collect(path.join(root, 'dist'));
await writeFile(path.join(root, 'gavins-car-racing-site.zip'), zipSync(files));
console.log('Created gavins-car-racing-site.zip. Extract its contents into your website folder.');
