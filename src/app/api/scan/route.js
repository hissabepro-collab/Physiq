import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseVisbodyPdf } from "@/lib/parseVisbodyPdf";

export async function POST(request) {
  const formData = await request.formData();
  const fichiers = formData.getAll("fichiers");

  if (fichiers.length === 0) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  const resultats = [];

  for (const fichier of fichiers) {
    const nom = fichier.name || "rapport.pdf";
    try {
      const buffer = Buffer.from(await fichier.arrayBuffer());
      const { donnees, warnings, profil } = await parseVisbodyPdf(buffer, nom);

      if (!donnees.dateScan) {
        resultats.push({ nom, ok: false, erreur: "Date de scan introuvable dans le PDF" });
        continue;
      }

      const existant = await prisma.mesure.findFirst({ where: { dateScan: donnees.dateScan } });
      if (existant) {
        resultats.push({ nom, ok: false, erreur: "Un scan existe déjà pour cette date", doublon: true });
        continue;
      }

      const mesure = await prisma.mesure.create({ data: donnees });

      if (profil.tailleCm || profil.sexe) {
        await prisma.profil.upsert({
          where: { id: 1 },
          update: { tailleCm: profil.tailleCm ?? undefined, sexe: profil.sexe ?? undefined },
          create: { id: 1, tailleCm: profil.tailleCm, sexe: profil.sexe },
        });
      }

      resultats.push({ nom, ok: true, mesure, warnings });
    } catch (e) {
      console.error("Erreur import scan:", e);
      resultats.push({ nom, ok: false, erreur: "Impossible de lire ce PDF (fichier corrompu ou format inattendu)" });
    }
  }

  return NextResponse.json({ resultats });
}
