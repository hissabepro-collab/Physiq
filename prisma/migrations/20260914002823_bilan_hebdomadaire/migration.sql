-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "joursDiete" JSONB,
ADD COLUMN     "joursEntraines" JSONB,
ADD COLUMN     "semaineIso" TEXT;
