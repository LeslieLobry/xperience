-- CreateTable
CREATE TABLE "Blocage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bloqueurId" INTEGER NOT NULL,
    "bloquéId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Blocage_bloqueurId_fkey" FOREIGN KEY ("bloqueurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Blocage_bloquéId_fkey" FOREIGN KEY ("bloquéId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Blocage_bloqueurId_bloquéId_key" ON "Blocage"("bloqueurId", "bloquéId");
