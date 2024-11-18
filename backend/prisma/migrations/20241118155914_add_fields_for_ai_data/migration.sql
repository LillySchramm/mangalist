-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "aiSuggestedSeries" TEXT,
ADD COLUMN     "aiSuggestedVolume" INTEGER,
ADD COLUMN     "usedAiVersion" INTEGER;
