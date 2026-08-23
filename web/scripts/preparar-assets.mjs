// Copia a public/ los assets que viven fuera de web/: el modelo ONNX y las
// ilustraciones de referencia. Se hace al construir en vez de versionar copias,
// para no duplicar 8,5 MB en el repositorio.
import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = dirname(dirname(fileURLToPath(import.meta.url)));
const raiz = dirname(web);

const copias = [
  [join(raiz, 'models', 'best-320.onnx'), join(web, 'public', 'models', 'best-320.onnx')],
  [join(raiz, 'models', 'clases.json'), join(web, 'public', 'models', 'clases.json')],
];

for (const [origen, destino] of copias) {
  if (!existsSync(origen)) {
    console.error(`\nFalta ${origen}\nCorre primero:  .venv/Scripts/python.exe scripts/export_onnx.py\n`);
    process.exit(1);
  }
  await mkdir(dirname(destino), { recursive: true });
  await cp(origen, destino);
}

const letras = join(web, 'public', 'img', 'letras');
await mkdir(letras, { recursive: true });
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  const origen = join(raiz, 'img', `${c}.png`);
  if (existsSync(origen)) await cp(origen, join(letras, `${c}.png`));
}

console.log('assets listos en web/public/');
