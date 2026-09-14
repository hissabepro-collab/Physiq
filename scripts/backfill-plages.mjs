// Recalcule les plages normales des scans déjà en base à partir de leurs PDF.
// Usage : node scripts/backfill-plages.mjs "chemin1.pdf" "chemin2.pdf" ...
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { parseVisbodyPdf } from "../src/lib/parseVisbodyPdf.js";

const prisma = new PrismaClient();

for (const chemin of process.argv.slice(2)) {
  const { donnees } = await parseVisbodyPdf(fs.readFileSync(chemin), chemin.split(/[\\/]/).pop());
  if (!donnees.dateScan) continue;

  const existant = await prisma.mesure.findFirst({ where: { dateScan: donnees.dateScan } });
  if (!existant) {
    console.log(`… aucun scan en base pour le ${donnees.dateScan.toISOString().slice(0, 10)}`);
    continue;
  }

  await prisma.mesure.update({
    where: { id: existant.id },
    data: { plages: donnees.plages },
  });
  console.log(
    `✓ ${donnees.dateScan.toISOString().slice(0, 10)} — ${Object.keys(donnees.plages).length} plages enregistrées`
  );
}

await prisma.$disconnect();
