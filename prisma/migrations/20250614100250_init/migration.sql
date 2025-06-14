-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXTE', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "DemandeStatut" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE');

-- CreateTable
CREATE TABLE "DemandeAcces" (
    "id" SERIAL NOT NULL,
    "galeriePriveeId" INTEGER NOT NULL,
    "demandeurId" INTEGER NOT NULL,
    "proprietaireId" INTEGER NOT NULL,
    "statut" "DemandeStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeAcces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "password" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orientation" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "consent" BOOLEAN NOT NULL,
    "localisation" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),
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
    "consentCGUDate" TIMESTAMP(3),

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GaleriePrivee" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GaleriePrivee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evenement" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "acces" TEXT NOT NULL,
    "imageUrl" TEXT,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "tarifCouple" DOUBLE PRECISION,
    "tarifFemme" DOUBLE PRECISION,
    "tarifHomme" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "lien" TEXT,
    "createurId" INTEGER NOT NULL,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "contenu" TEXT NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vues" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageArticle" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "ImageArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recherche" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "utilisateurId" INTEGER NOT NULL,

    CONSTRAINT "Recherche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envie" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "utilisateurId" INTEGER NOT NULL,

    CONSTRAINT "Envie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avis" (
    "id" SERIAL NOT NULL,
    "commentaire" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" INTEGER NOT NULL,
    "cibleId" INTEGER NOT NULL,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" SERIAL NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "supprimé" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "contenu" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "type" "MessageType" NOT NULL DEFAULT 'TEXTE',
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "galeriePriveeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalMessage" (
    "id" SERIAL NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalChatRead" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastRead" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalChatRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blocage" (
    "id" SERIAL NOT NULL,
    "bloqueurId" INTEGER NOT NULL,
    "bloquéId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blocage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" SERIAL NOT NULL,
    "auteurId" INTEGER NOT NULL,
    "cibleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Participation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_Participation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeAcces_galeriePriveeId_demandeurId_key" ON "DemandeAcces"("galeriePriveeId", "demandeurId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_pseudo_key" ON "Utilisateur"("pseudo");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GaleriePrivee_utilisateurId_key" ON "GaleriePrivee"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Avis_auteurId_cibleId_key" ON "Avis"("auteurId", "cibleId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_utilisateurId_conversationId_key" ON "Participant"("utilisateurId", "conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalChatRead_userId_key" ON "GlobalChatRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Blocage_bloqueurId_bloquéId_key" ON "Blocage"("bloqueurId", "bloquéId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_auteurId_cibleId_key" ON "Like"("auteurId", "cibleId");

-- CreateIndex
CREATE INDEX "_Participation_B_index" ON "_Participation"("B");

-- AddForeignKey
ALTER TABLE "DemandeAcces" ADD CONSTRAINT "DemandeAcces_galeriePriveeId_fkey" FOREIGN KEY ("galeriePriveeId") REFERENCES "GaleriePrivee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAcces" ADD CONSTRAINT "DemandeAcces_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAcces" ADD CONSTRAINT "DemandeAcces_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaleriePrivee" ADD CONSTRAINT "GaleriePrivee_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evenement" ADD CONSTRAINT "Evenement_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageArticle" ADD CONSTRAINT "ImageArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recherche" ADD CONSTRAINT "Recherche_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envie" ADD CONSTRAINT "Envie_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_cibleId_fkey" FOREIGN KEY ("cibleId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_galeriePriveeId_fkey" FOREIGN KEY ("galeriePriveeId") REFERENCES "GaleriePrivee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalMessage" ADD CONSTRAINT "GlobalMessage_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalChatRead" ADD CONSTRAINT "GlobalChatRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blocage" ADD CONSTRAINT "Blocage_bloqueurId_fkey" FOREIGN KEY ("bloqueurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blocage" ADD CONSTRAINT "Blocage_bloquéId_fkey" FOREIGN KEY ("bloquéId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_cibleId_fkey" FOREIGN KEY ("cibleId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Participation" ADD CONSTRAINT "_Participation_A_fkey" FOREIGN KEY ("A") REFERENCES "Evenement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Participation" ADD CONSTRAINT "_Participation_B_fkey" FOREIGN KEY ("B") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
