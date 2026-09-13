// Import en masse de rapports Visbody PDF dans la base de données.
// Usage : node scripts/seed-from-pdfs.mjs "chemin1.pdf" "chemin2.pdf" ...
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { parseVisbodyPdf } from "../src/lib/parseVisbodyPdf.js";

const prisma = new PrismaClient();

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error("Donne au moins un chemin de PDF en argument.");
  process.exit(1);
}

let profilMisAJour = false;

for (const chemin of fichiers) {
  const buffer = fs.readFileSync(chemin);
  const nom = chemin.split(/[\\/]/).pop();
  const { donnees, warnings, profil } = await parseVisbodyPdf(buffer, nom);

  if (warnings.length) {
    console.log(`⚠ ${nom} :`, warnings);
  }
  if (!donnees.dateScan) {
    console.log(`✗ ${nom} ignoré : date de scan introuvable`);
    continue;
  }

  const existant = await prisma.mesure.findFirst({ where: { dateScan: donnees.dateScan } });
  if (existant) {
    console.log(`… ${nom} déjà présent pour le ${donnees.dateScan.toISOString().slice(0, 10)}, ignoré`);
    continue;
  }

  await prisma.mesure.create({ data: donnees });
  console.log(`✓ ${nom} importé (${donnees.dateScan.toISOString().slice(0, 10)}, score ${donnees.scoreVisbody})`);

  if (!profilMisAJour && (profil.tailleCm || profil.sexe)) {
    await prisma.profil.upsert({
      where: { id: 1 },
      update: { tailleCm: profil.tailleCm ?? undefined, sexe: profil.sexe ?? undefined },
      create: { id: 1, tailleCm: profil.tailleCm, sexe: profil.sexe },
    });
    profilMisAJour = true;
  }
}

await prisma.$disconnect();
