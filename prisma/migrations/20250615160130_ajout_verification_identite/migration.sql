-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "verificationDeadline" TIMESTAMP(3),
ADD COLUMN     "verificationIdentite" BOOLEAN NOT NULL DEFAULT false;
