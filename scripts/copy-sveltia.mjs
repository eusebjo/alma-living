// Copia il pannello Sveltia CMS da node_modules in public/admin/, dove Astro lo
// serve come file statico (/admin/sveltia-cms.js). Gira prima di `astro dev` e
// `astro build` (script `predev` e `prebuild` in package.json).
//
// Copia anche i tre moduli di `dist/chunks` (git, react-dom, qrcode): lo script
// li cerca prima accanto a sé e solo dopo su unpkg.com, quindi così non servono
// richieste a terzi per caricarli.
//
// I file copiati non si versionano (vedi .gitignore): la versione è quella di
// package.json, fissata senza ^ né ~.
//
// Solo API di Node, nessun comando di shell: funziona uguale su Windows e Linux.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pacchetto = join(radice, 'node_modules', '@sveltia', 'cms');
const destinazione = join(radice, 'public', 'admin');

if (!existsSync(join(pacchetto, 'dist', 'sveltia-cms.js'))) {
  console.error(
    'Sveltia CMS non è installato (node_modules/@sveltia/cms/dist/sveltia-cms.js manca). Esegui `npm ci`.',
  );
  process.exit(1);
}

mkdirSync(destinazione, { recursive: true });
cpSync(
  join(pacchetto, 'dist', 'sveltia-cms.js'),
  join(destinazione, 'sveltia-cms.js'),
);

// Ripartiamo da zero: non restano file di una versione precedente. Le mappe dei
// sorgenti (.map) pesano più dei moduli e servono solo a chi sviluppa Sveltia.
rmSync(join(destinazione, 'chunks'), { recursive: true, force: true });
cpSync(join(pacchetto, 'dist', 'chunks'), join(destinazione, 'chunks'), {
  recursive: true,
  filter: (origine) => !origine.endsWith('.map'),
});

const { version } = JSON.parse(
  readFileSync(join(pacchetto, 'package.json'), 'utf8'),
);
console.log(`Sveltia CMS ${version} copiato in public/admin/`);
