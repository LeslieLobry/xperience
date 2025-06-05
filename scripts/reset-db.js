// scripts/reset-db.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('prisma/dev.db');
const migrationsPath = path.resolve('prisma/migrations');

// 1. Supprime la BDD
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️ Base de données supprimée');
}

// 2. Supprime les migrations
if (fs.existsSync(migrationsPath)) {
  fs.rmSync(migrationsPath, { recursive: true, force: true });
  console.log('🧹 Migrations supprimées');
}

// 3. Recrée la migration initiale
try {
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✅ Base de données réinitialisée avec succès !');
} catch (error) {
  console.error('❌ Erreur pendant la migration :', error.message);
}
