-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Article_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "coverUrl" TEXT,
    "experience" TEXT,
    "rechercheType" TEXT,
    "sexe" TEXT,
    "fumeur" TEXT,
    "silhouette" TEXT,
    "taille" TEXT,
    "origines" TEXT,
    "yeux" TEXT,
    "cheveux" TEXT
);
INSERT INTO "new_Utilisateur" ("age", "cheveux", "consent", "coverUrl", "createdAt", "description", "email", "emailVerified", "experience", "fumeur", "id", "lastLogin", "localisation", "nom", "orientation", "origines", "password", "photoUrl", "prenom", "pseudo", "rechercheType", "sexe", "silhouette", "taille", "type", "yeux") SELECT "age", "cheveux", "consent", "coverUrl", "createdAt", "description", "email", "emailVerified", "experience", "fumeur", "id", "lastLogin", "localisation", "nom", "orientation", "origines", "password", "photoUrl", "prenom", "pseudo", "rechercheType", "sexe", "silhouette", "taille", "type", "yeux" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_pseudo_key" ON "Utilisateur"("pseudo");
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
