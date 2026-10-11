import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request) {
  // Le parseur est chargé ICI, dans le try, et non en tête de fichier. Si la
  // bibliothèque PDF ne se charge pas dans l'environnement serverless, la
  // route renvoie alors une erreur lisible au lieu d'un 500 vide — avant, une
  // seule erreur de chargement faisait tomber tous les imports à la fois.
  let parseVisbodyPdf;
  try {
    // pdf-parse attend DOMMatrix, une API de navigateur absente de Node. Il
    // tente de la fournir via @napi-rs/canvas, qui ne se charge pas sur Vercel.
    // On fournit donc une implémentation pure JavaScript AVANT l'import : la
    // bibliothèque la trouve déjà et n'essaie pas le reste.
    if (!globalThis.DOMMatrix) {
      const { default: DOMMatrixPolyfill } = await import("@thednp/dommatrix");
      globalThis.DOMMatrix = DOMMatrixPolyfill;
    }
    ({ parseVisbodyPdf } = await import("@/lib/parseVisbodyPdf"));
  } catch (e) {
    console.error("Chargement du parseur PDF impossible:", e);
    return NextResponse.json(
      { error: `Lecture PDF indisponible sur le serveur : ${e.message}` },
      { status: 500 }
    );
  }

  let fichiers;
  try {
    const formData = await request.formData();
    fichiers = formData.getAll("fichiers");
  } catch (e) {
    return NextResponse.json({ error: `Envoi illisible : ${e.message}` }, { status: 400 });
  }

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
      resultats.push({
        nom,
        ok: false,
        erreur: "Impossible de lire ce PDF (fichier corrompu ou format inattendu)",
        detail: e.message,
      });
    }
  }

  return NextResponse.json({ resultats });
}
