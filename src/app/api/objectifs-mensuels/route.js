import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const NATURES = ["seances", "diete", "sommeil"];

// Enregistre ou retire l'objectif mensuel d'une nature. Une valeur vide
// supprime l'objectif, pour qu'on puisse revenir à « pas d'objectif ».
export async function PUT(request) {
  const { nature, valeurCible } = await request.json();
  if (!NATURES.includes(nature)) {
    return NextResponse.json({ error: "Nature inconnue" }, { status: 400 });
  }

  if (valeurCible === "" || valeurCible == null) {
    await prisma.objectifMensuel.deleteMany({ where: { nature } });
    return NextResponse.json({ ok: true, supprime: true });
  }

  const valeur = Number(valeurCible);
  if (!Number.isFinite(valeur) || valeur <= 0) {
    return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
  }

  const objectif = await prisma.objectifMensuel.upsert({
    where: { nature },
    update: { valeurCible: valeur },
    create: { nature, valeurCible: valeur },
  });
  return NextResponse.json({ objectif });
}
