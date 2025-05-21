-- CreateTable
CREATE TABLE "Evenement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "lieu" TEXT NOT NULL,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL,
    "acces" TEXT NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER NOT NULL,
    CONSTRAINT "Evenement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
