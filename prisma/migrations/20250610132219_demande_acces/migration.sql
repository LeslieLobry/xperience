/*
  Warnings:

  - You are about to drop the column `codeAcces` on the `GaleriePrivee` table. All the data in the column will be lost.
  - You are about to alter the column `taille` on the `Utilisateur` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- CreateTable
CREATE TABLE "DemandeAcces" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "galeriePriveeId" INTEGER NOT NULL,
    "demandeurId" INTEGER NOT NULL,
    "proprietaireId" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DemandeAcces_galeriePriveeId_fkey" FOREIGN KEY ("galeriePriveeId") REFERENCES "GaleriePrivee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DemandeAcces_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DemandeAcces_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GaleriePrivee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GaleriePrivee_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GaleriePrivee" ("createdAt", "id", "nom", "utilisateurId") SELECT "createdAt", "id", "nom", "utilisateurId" FROM "GaleriePrivee";
DROP TABLE "GaleriePrivee";
ALTER TABLE "new_GaleriePrivee" RENAME TO "GaleriePrivee";
CREATE UNIQUE INDEX "GaleriePrivee_utilisateurId_key" ON "GaleriePrivee"("utilisateurId");
CREATE TABLE "new_Utilisateur" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "password" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orientation" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "consent" BOOLEAN NOT NULL,
    "localisation" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME,
    "emailVerified" DATETIME,
    "description" TEXT,
    "coverUrl" TEXT,
    "experience" TEXT,
    "rechercheType" TEXT,
    "sexe" TEXT,
    "fumeur" TEXT,
    "silhouette" TEXT,
    "taille" INTEGER,
    "origines" TEXT,
    "yeux" TEXT,
    "cheveux" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'hors_ligne',
    "consentCGU" BOOLEAN NOT NULL DEFAULT false,
    "consentCGUDate" DATETIME
);
INSERT INTO "new_Utilisateur" ("age", "cheveux", "consent", "consentCGU", "consentCGUDate", "coverUrl", "createdAt", "description", "email", "emailVerified", "experience", "fumeur", "id", "lastLogin", "localisation", "nom", "orientation", "origines", "password", "photoUrl", "prenom", "pseudo", "rechercheType", "role", "sexe", "silhouette", "statut", "taille", "type", "yeux") SELECT "age", "cheveux", "consent", "consentCGU", "consentCGUDate", "coverUrl", "createdAt", "description", "email", "emailVerified", "experience", "fumeur", "id", "lastLogin", "localisation", "nom", "orientation", "origines", "password", "photoUrl", "prenom", "pseudo", "rechercheType", "role", "sexe", "silhouette", "statut", "taille", "type", "yeux" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_pseudo_key" ON "Utilisateur"("pseudo");
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DemandeAcces_galeriePriveeId_demandeurId_key" ON "DemandeAcces"("galeriePriveeId", "demandeurId");
