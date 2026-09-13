-- CreateTable
CREATE TABLE "Mesure" (
    "id" TEXT NOT NULL,
    "dateScan" TIMESTAMP(3) NOT NULL,
    "scoreVisbody" INTEGER,
    "poidsKg" DOUBLE PRECISION,
    "masseGrasseKg" DOUBLE PRECISION,
    "bfpPct" DOUBLE PRECISION,
    "masseMusculaireKg" DOUBLE PRECISION,
    "smmKg" DOUBLE PRECISION,
    "masseMaigreKg" DOUBLE PRECISION,
    "eauTotaleKg" DOUBLE PRECISION,
    "eauIntracellulaireKg" DOUBLE PRECISION,
    "eauExtracellulaireKg" DOUBLE PRECISION,
    "ratioEcwTbw" DOUBLE PRECISION,
    "imc" DOUBLE PRECISION,
    "rth" DOUBLE PRECISION,
    "metabolismeBaseKcal" DOUBLE PRECISION,
    "ageMetabolique" INTEGER,
    "niveauGraisseViscerale" DOUBLE PRECISION,
    "selsInorganiquesKg" DOUBLE PRECISION,
    "proteineKg" DOUBLE PRECISION,
    "poidsIdealKg" DOUBLE PRECISION,
    "masseGrasseIdealeKg" DOUBLE PRECISION,
    "segments" JSONB,
    "languePdf" TEXT,
    "sourceFichier" TEXT,
    "extractionAuto" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mesure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objectif" (
    "id" TEXT NOT NULL,
    "metrique" TEXT NOT NULL,
    "valeurCible" DOUBLE PRECISION NOT NULL,
    "dateCible" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Objectif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texte" TEXT,
    "photoUrl" TEXT,
    "sommeilHeures" DOUBLE PRECISION,
    "mesureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profil" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "prenom" TEXT NOT NULL DEFAULT 'Issa',
    "tailleCm" DOUBLE PRECISION,
    "sexe" TEXT,
    "dateNaissance" TIMESTAMP(3),
    "motDePasseHash" TEXT,

    CONSTRAINT "Profil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mesure_dateScan_idx" ON "Mesure"("dateScan");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_mesureId_fkey" FOREIGN KEY ("mesureId") REFERENCES "Mesure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
