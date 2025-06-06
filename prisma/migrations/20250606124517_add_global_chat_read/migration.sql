-- CreateTable
CREATE TABLE "GlobalChatRead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "lastRead" DATETIME NOT NULL,
    CONSTRAINT "GlobalChatRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalChatRead_userId_key" ON "GlobalChatRead"("userId");
