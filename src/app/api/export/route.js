import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const COLONNES = [
  "dateScan", "scoreVisbody", "poidsKg", "bfpPct", "masseGrasseKg", "masseMusculaireKg",
  "smmKg", "masseMaigreKg", "imc", "rth", "metabolismeBaseKcal", "ageMetabolique",
  "niveauGraisseViscerale", "eauTotaleKg", "eauIntracellulaireKg", "eauExtracellulaireKg",
  "ratioEcwTbw", "selsInorganiquesKg", "proteineKg",
];

function versCsv(mesures) {
  const lignes = [COLONNES.join(",")];
  for (const m of mesures) {
    const ligne = COLONNES.map((c) => {
      const v = c === "dateScan" ? m[c].toISOString().slice(0, 10) : m[c];
      return v == null ? "" : String(v);
    });
    lignes.push(ligne.join(","));
  }
  return lignes.join("\n");
}

export async function GET(request) {
  const mesures = await prisma.mesure.findMany({ orderBy: { dateScan: "asc" } });
  const csv = versCsv(mesures);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="physiq-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
