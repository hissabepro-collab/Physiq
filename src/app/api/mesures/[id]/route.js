import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CHAMPS_MODIFIABLES = [
  "poidsKg",
  "masseGrasseKg",
  "bfpPct",
  "masseMusculaireKg",
  "smmKg",
  "masseMaigreKg",
  "eauTotaleKg",
  "eauIntracellulaireKg",
  "eauExtracellulaireKg",
  "ratioEcwTbw",
  "imc",
  "rth",
  "metabolismeBaseKcal",
  "ageMetabolique",
  "niveauGraisseViscerale",
  "selsInorganiquesKg",
  "proteineKg",
  "scoreVisbody",
];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();

  const data = {};
  for (const champ of CHAMPS_MODIFIABLES) {
    if (champ in body) {
      data[champ] = body[champ] === "" || body[champ] === null ? null : Number(body[champ]);
    }
  }
  data.extractionAuto = false;

  const mesure = await prisma.mesure.update({ where: { id }, data });
  return NextResponse.json({ mesure });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.mesure.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
