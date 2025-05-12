-- AlterTable
ALTER TABLE "Article" ADD COLUMN "description" TEXT;

-- CreateTable
CREATE TABLE "ImageArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    CONSTRAINT "ImageArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
