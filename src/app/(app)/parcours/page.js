import { prisma } from "@/lib/db";
import { calculerRang } from "@/lib/rang";
import { calculerAxesProfil } from "@/lib/profilStats";
import { bilanSemaine, calculerSerie, cleSemaine, libelleSemaine, OBJECTIFS_DEFAUT } from "@/lib/semaines";
import ParcoursClient from "@/components/ParcoursClient";

export const dynamic = "force-dynamic";

export default async function ParcoursPage() {
  const [mesures, profil, entreesJournal] = await Promise.all([
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
    prisma.profil.findUnique({ where: { id: 1 } }),
    prisma.journalEntry.findMany({ where: { semaineIso: { not: null } } }),
  ]);

  const derniere = mesures.at(-1);
  const precedente = mesures.at(-2);
  const parSemaine = Object.fromEntries(entreesJournal.map((e) => [e.semaineIso, e]));
  const semaineActuelle = cleSemaine(new Date());

  return (
    <ParcoursClient
      prenom={profil?.prenom || "Issa"}
      derniere={derniere ?? null}
      precedente={precedente ?? null}
      mesures={mesures}
      rang={derniere ? calculerRang(derniere.scoreVisbody) : null}
      axesProfil={calculerAxesProfil(mesures)}
      bilan={bilanSemaine(parSemaine[semaineActuelle], OBJECTIFS_DEFAUT)}
      serie={calculerSerie(parSemaine, OBJECTIFS_DEFAUT, semaineActuelle)}
      libelleSemaine={libelleSemaine(semaineActuelle)}
    />
  );
}
