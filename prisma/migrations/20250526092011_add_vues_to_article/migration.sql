/*
  Warnings:

  - Added the required column `createurId` to the `Evenement` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "contenu" TEXT NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "vues" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Article_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Article" ("auteurId", "contenu", "createdAt", "description", "id", "slug", "titre", "updatedAt") SELECT "auteurId", "contenu", "createdAt", "description", "id", "slug", "titre", "updatedAt" FROM "Article";
DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE TABLE "new_Evenement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "lieu" TEXT NOT NULL,
    "type" TEXT,
    "acces" TEXT,
    "imageUrl" TEXT,
    "tarifCouple" REAL,
    "tarifFemme" REAL,
    "tarifHomme" REAL,
    "createurId" INTEGER NOT NULL,
    CONSTRAINT "Evenement_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Evenement" ("acces", "date", "description", "heureDebut", "heureFin", "id", "imageUrl", "lieu", "tarifCouple", "tarifFemme", "tarifHomme", "titre", "type") SELECT "acces", "date", "description", "heureDebut", "heureFin", "id", "imageUrl", "lieu", "tarifCouple", "tarifFemme", "tarifHomme", "titre", "type" FROM "Evenement";
DROP TABLE "Evenement";
ALTER TABLE "new_Evenement" RENAME TO "Evenement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
