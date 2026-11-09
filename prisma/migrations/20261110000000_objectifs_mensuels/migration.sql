-- CreateTable
CREATE TABLE "ObjectifMensuel" (
    "id" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "valeurCible" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectifMensuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObjectifMensuel_nature_key" ON "ObjectifMensuel"("nature");
