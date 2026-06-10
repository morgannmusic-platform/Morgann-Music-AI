import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve(process.cwd(), 'instruction');
const indexFile = path.join(dir, 'index.json');

async function buildIndex() {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'))
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    console.error('Aucun fichier .txt trouvé dans le dossier instruction/.');
    process.exit(1);
  }

  await writeFile(indexFile, JSON.stringify({ files }, null, 2) + '\n', 'utf8');
  console.log(`Généré ${indexFile} avec ${files.length} fichier(s).`);
}

buildIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});
