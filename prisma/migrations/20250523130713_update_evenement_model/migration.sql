/*
  Warnings:

  - You are about to drop the column `createurId` on the `Evenement` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Evenement` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Evenement` table. All the data in the column will be lost.
  - You are about to drop the column `participants` on the `Evenement` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_Participation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_Participation_A_fkey" FOREIGN KEY ("A") REFERENCES "Evenement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_Participation_B_fkey" FOREIGN KEY ("B") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "tarifHomme" REAL
);
INSERT INTO "new_Evenement" ("acces", "date", "description", "id", "imageUrl", "lieu", "titre", "type") SELECT "acces", "date", "description", "id", "imageUrl", "lieu", "titre", "type" FROM "Evenement";
DROP TABLE "Evenement";
ALTER TABLE "new_Evenement" RENAME TO "Evenement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_Participation_AB_unique" ON "_Participation"("A", "B");

-- CreateIndex
CREATE INDEX "_Participation_B_index" ON "_Participation"("B");
