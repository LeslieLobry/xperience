/*
  Warnings:

  - Made the column `acces` on table `Evenement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Evenement` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evenement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "lieu" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "acces" TEXT NOT NULL,
    "imageUrl" TEXT,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "tarifCouple" REAL,
    "tarifFemme" REAL,
    "tarifHomme" REAL,
    "latitude" REAL,
    "longitude" REAL,
    "createurId" INTEGER NOT NULL,
    CONSTRAINT "Evenement_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Evenement" ("acces", "createurId", "date", "description", "heureDebut", "heureFin", "id", "imageUrl", "lieu", "tarifCouple", "tarifFemme", "tarifHomme", "titre", "type") SELECT "acces", "createurId", "date", "description", "heureDebut", "heureFin", "id", "imageUrl", "lieu", "tarifCouple", "tarifFemme", "tarifHomme", "titre", "type" FROM "Evenement";
DROP TABLE "Evenement";
ALTER TABLE "new_Evenement" RENAME TO "Evenement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
