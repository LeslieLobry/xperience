/*
  Warnings:

  - You are about to drop the column `coverUrl` on the `Utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `sexe` on the `Utilisateur` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "experience" TEXT,
    "rechercheType" TEXT,
    "fumeur" TEXT,
    "silhouette" TEXT,
    "taille" INTEGER,
    "origines" TEXT,
    "yeux" TEXT,
    "cheveux" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_ligne',
    "consentCGU" BOOLEAN NOT NULL DEFAULT false,
    "consentCGUDate" DATETIME
);
INSERT INTO "new_Utilisateur" ("age", "cheveux", "consent", "consentCGU", "consentCGUDate", "createdAt", "description", "email", "emailVerified", "experience", "fumeur", "id", "lastLogin", "localisation", "nom", "orientation", "origines", "password", "photoUrl", "prenom", "pseudo", "rechercheType", "role", "silhouette", "statut", "taille", "type", "yeux") SELECT "age", "cheveux", "consent", "consentCGU", "consentCGUDate", "createdAt", "description", "email", "emailVerified", "experience", "fumeur", "id", "lastLogin", "localisation", "nom", "orientation", "origines", "password", "photoUrl", "prenom", "pseudo", "rechercheType", "role", "silhouette", "statut", "taille", "type", "yeux" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_pseudo_key" ON "Utilisateur"("pseudo");
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
