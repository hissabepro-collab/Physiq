-- CreateTable
CREATE TABLE "CoachNote" (
    "id" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'coach',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachNote_createdAt_idx" ON "CoachNote"("createdAt");
