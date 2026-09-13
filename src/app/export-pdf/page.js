import { prisma } from "@/lib/db";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const COLONNES = [
  { key: "dateScan", label: "Date", format: (v) => new Date(v).toLocaleDateString("fr-FR") },
  { key: "scoreVisbody", label: "Score" },
  { key: "poidsKg", label: "Poids (kg)" },
  { key: "bfpPct", label: "Masse grasse (%)" },
  { key: "masseMusculaireKg", label: "Masse musc. (kg)" },
  { key: "imc", label: "IMC" },
];

export default async function ExportPdfPage() {
  const mesures = await prisma.mesure.findMany({ orderBy: { dateScan: "asc" } });

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 text-foreground print:text-black">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="font-display text-xl font-bold">Export de tes données</h1>
        <PrintButton />
      </div>
      <p className="mt-1 text-sm text-foreground-muted print:hidden">
        Utilise le bouton pour ouvrir la boîte d'impression de ton navigateur, puis choisis "Enregistrer en PDF".
      </p>

      <h2 className="mt-8 font-display text-lg font-bold">Physiq — Historique de composition corporelle</h2>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-soft print:border-black">
            {COLONNES.map((c) => (
              <th key={c.key} className="py-2 text-left font-semibold">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mesures.map((m) => (
            <tr key={m.id} className="border-b border-border-soft/50 print:border-black/20">
              {COLONNES.map((c) => (
                <td key={c.key} className="py-2 pr-3">
                  {c.format ? c.format(m[c.key]) : m[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
