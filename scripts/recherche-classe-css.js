// recherche-classe-css.js (version ESM)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const searchClass = process.argv[2];

if (!searchClass) {
  console.error('❌ Merci de fournir le nom d’une classe à rechercher.');
  process.exit(1);
}

// Pour avoir __dirname en ESM :
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction récursive
function searchCSSFiles(dir) {
  const results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...searchCSSFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(searchClass)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// 📁 Recherche depuis le dossier actuel
const result = searchCSSFiles(__dirname);

if (result.length === 0) {
  console.log(`❌ Aucune occurrence de "${searchClass}" trouvée.`);
} else {
  console.log(`✅ Fichiers contenant "${searchClass}" :\n`);
  result.forEach((f) => console.log(`- ${f}`));
}
