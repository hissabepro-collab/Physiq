-- CreateTable
CREATE TABLE "SeanceMuscu" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "titre" TEXT,
    "exercices" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeanceMuscu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeanceMuscu_date_idx" ON "SeanceMuscu"("date");
