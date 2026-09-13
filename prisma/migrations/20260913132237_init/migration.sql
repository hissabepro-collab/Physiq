-- CreateTable
CREATE TABLE "Mesure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateScan" DATETIME NOT NULL,
    "scoreVisbody" INTEGER,
    "poidsKg" REAL,
    "masseGrasseKg" REAL,
    "bfpPct" REAL,
    "masseMusculaireKg" REAL,
    "smmKg" REAL,
    "masseMaigreKg" REAL,
    "eauTotaleKg" REAL,
    "eauIntracellulaireKg" REAL,
    "eauExtracellulaireKg" REAL,
    "ratioEcwTbw" REAL,
    "imc" REAL,
    "rth" REAL,
    "metabolismeBaseKcal" REAL,
    "ageMetabolique" INTEGER,
    "niveauGraisseViscerale" REAL,
    "selsInorganiquesKg" REAL,
    "proteineKg" REAL,
    "poidsIdealKg" REAL,
    "masseGrasseIdealeKg" REAL,
    "segments" JSONB,
    "languePdf" TEXT,
    "sourceFichier" TEXT,
    "extractionAuto" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Objectif" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metrique" TEXT NOT NULL,
    "valeurCible" REAL NOT NULL,
    "dateCible" DATETIME,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texte" TEXT,
    "photoUrl" TEXT,
    "sommeilHeures" REAL,
    "mesureId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntry_mesureId_fkey" FOREIGN KEY ("mesureId") REFERENCES "Mesure" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profil" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "prenom" TEXT NOT NULL DEFAULT 'Issa',
    "tailleCm" REAL,
    "sexe" TEXT,
    "dateNaissance" DATETIME,
    "motDePasseHash" TEXT
);

-- CreateIndex
CREATE INDEX "Mesure_dateScan_idx" ON "Mesure"("dateScan");
