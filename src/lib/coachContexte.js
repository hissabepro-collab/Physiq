// Ce que le coach sait de l'utilisateur : un résumé texte de la base,
// construit à chaque question côté serveur. Rien n'est stocké ailleurs.
//
// Le texte est déterministe à données égales (ordre fixe, pas d'heure) : il
// reste identique d'une question à l'autre, ce qui permet la mise en cache
// du début de la requête et divise le coût des questions suivantes.

import { prisma } from "@/lib/db";
import { lireNotes } from "@/lib/coachMemoire";
import { calculerRang } from "@/lib/rang";
import { calculerXp } from "@/lib/xp";
import { calculerBilan } from "@/lib/profilStats";
import { cleSemaine, dernieresSemaines, moyenneNuits, OBJECTIFS_DEFAUT, JOURS_LONGS } from "@/lib/semaines";

const CHAMPS_SCAN = [
  ["scoreVisbody", "score Visbody", "/100"],
  ["poidsKg", "poids", "kg"],
  ["masseGrasseKg", "masse grasse", "kg"],
  ["bfpPct", "taux de masse grasse", "%"],
  ["masseMusculaireKg", "masse musculaire totale", "kg"],
  ["smmKg", "masse musculaire squelettique (SMM)", "kg"],
  ["masseMaigreKg", "masse maigre", "kg"],
  ["eauTotaleKg", "eau totale", "kg"],
  ["eauIntracellulaireKg", "eau intracellulaire", "kg"],
  ["eauExtracellulaireKg", "eau extracellulaire", "kg"],
  ["ratioEcwTbw", "ratio eau extra / eau totale", ""],
  ["proteineKg", "protéines", "kg"],
  ["selsInorganiquesKg", "sels minéraux", "kg"],
  ["imc", "IMC", ""],
  ["rth", "rapport taille / hanches", ""],
  ["niveauGraisseViscerale", "graisse viscérale (niveau)", ""],
  ["metabolismeBaseKcal", "métabolisme de base", "kcal"],
  ["ageMetabolique", "âge métabolique", "ans"],
  ["poidsIdealKg", "poids idéal (rapport)", "kg"],
  ["masseGrasseIdealeKg", "masse grasse idéale (rapport)", "kg"],
];

const NOMS_METRIQUES = Object.fromEntries(CHAMPS_SCAN.map(([cle, label, unite]) => [cle, { label, unite }]));

function date(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

function nombre(v) {
  if (v == null) return null;
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100).replace(".", ",");
}

function age(naissance) {
  if (!naissance) return null;
  const n = new Date(naissance);
  const auj = new Date();
  let a = auj.getFullYear() - n.getFullYear();
  if (auj < new Date(auj.getFullYear(), n.getMonth(), n.getDate())) a--;
  return a;
}

function blocScan(m, index) {
  const lignes = [`Scan ${index + 1} — ${date(m.dateScan)}`];
  for (const [cle, label, unite] of CHAMPS_SCAN) {
    const v = nombre(m[cle]);
    if (v == null) continue;
    const plage = m.plages?.[cle];
    const normale = plage && plage.min != null && plage.max != null ? ` (normale ${nombre(plage.min)}–${nombre(plage.max)})` : "";
    lignes.push(`- ${label} : ${v}${unite ? " " + unite : ""}${normale}`);
  }
  if (m.segments && typeof m.segments === "object") {
    const parties = Object.entries(m.segments)
      .map(([seg, val]) => {
        if (!val || typeof val !== "object") return null;
        const details = Object.entries(val)
          .filter(([, x]) => typeof x === "number")
          .map(([k, x]) => `${k} ${nombre(x)}`)
          .join(", ");
        return details ? `${seg} : ${details}` : null;
      })
      .filter(Boolean);
    if (parties.length) lignes.push(`- segments : ${parties.join(" ; ")}`);
  }
  return lignes.join("\n");
}

export async function construireContexte() {
  const [mesures, profil, entrees, objectifs, mensuels, notes] = await Promise.all([
    prisma.mesure.findMany({ orderBy: { dateScan: "asc" } }),
    prisma.profil.findUnique({ where: { id: 1 } }),
    prisma.journalEntry.findMany({ where: { semaineIso: { not: null } }, orderBy: { semaineIso: "asc" } }),
    prisma.objectif.findMany({ where: { actif: true }, orderBy: { createdAt: "asc" } }),
    prisma.objectifMensuel.findMany({ orderBy: { nature: "asc" } }),
    lireNotes(),
  ]);

  const parties = [];
  const auj = new Date();
  parties.push(`Date du jour : ${date(auj)} (${JOURS_LONGS[(auj.getDay() + 6) % 7].toLowerCase()}).`);

  // Profil
  const p = [`Prénom : ${profil?.prenom || "Issa"}`];
  if (profil?.sexe) p.push(`sexe : ${profil.sexe}`);
  if (profil?.tailleCm) p.push(`taille : ${nombre(profil.tailleCm)} cm`);
  const a = age(profil?.dateNaissance);
  if (a != null) p.push(`âge : ${a} ans`);
  parties.push(`## Profil\n${p.join(", ")}.`);

  // Mémoire du coach : en tête, car elle peut changer toute la réponse
  // (blessure, préférence, style demandé).
  parties.push(
    notes.length
      ? `## Ce qu'Issa t'a demandé de retenir (mémoire du coach, à respecter)\n${notes.map((n) => `- ${n.texte} (noté le ${date(n.createdAt)})`).join("\n")}`
      : "## Ce qu'Issa t'a demandé de retenir (mémoire du coach)\nRien pour l'instant."
  );

  // Scans
  if (mesures.length === 0) {
    parties.push("## Scans Visbody\nAucun scan enregistré pour l'instant.");
  } else {
    const derniere = mesures.at(-1);
    const rang = calculerRang(derniere.scoreVisbody);
    const entete = [`## Scans Visbody (${mesures.length}, du plus ancien au plus récent)`];
    if (rang) {
      entete.push(
        `Rang actuel dans l'app : ${rang.label} (score ${rang.score}/100)` +
          (rang.palierSuivant ? `, prochain palier ${rang.palierSuivant} à ${rang.pointsAvantPalierSuivant} point(s).` : ", palier maximal.")
      );
    }
    parties.push([...entete, ...mesures.map(blocScan)].join("\n\n"));

    // Repères calculés par l'app : le modèle rapide se trompe dans les calculs
    // (constaté le 13/11/2026 : « 1,6 à 2 g/kg, soit 145 à 160 g » pour 91 kg).
    const reperes = [];
    const poids = derniere.poidsKg;
    if (poids) {
      const g = (k) => Math.round(poids * k);
      reperes.push(`- protéines en recomposition (1,6 à 2,2 g/kg) : ${g(1.6)} à ${g(2.2)} g par jour (2 g/kg = ${g(2)} g)`);
      reperes.push(`- eau (30 à 40 ml/kg) : ${nombre(Math.round(poids * 0.03 * 10) / 10)} à ${nombre(Math.round(poids * 0.04 * 10) / 10)} L par jour`);
    }
    if (derniere.metabolismeBaseKcal) {
      const mb = derniere.metabolismeBaseKcal;
      const bas = Math.round((mb * 1.5) / 10) * 10;
      const haut = Math.round((mb * 1.7) / 10) * 10;
      reperes.push(`- dépense quotidienne estimée (métabolisme de base × 1,5 à 1,7, activité modérée à soutenue) : ${bas} à ${haut} kcal ; estimation, à ajuster selon l'évolution du poids`);
      reperes.push(`- apport pour un déficit modéré (300 à 500 kcal) : environ ${bas - 500} à ${haut - 300} kcal par jour`);
    }
    if (derniere.masseGrasseKg != null && poids && derniere.bfpPct != null) {
      const maigre = poids - derniere.masseGrasseKg;
      reperes.push(`- poids correspondant à 15 % de masse grasse à masse maigre égale : ${nombre(Math.round((maigre / 0.85) * 10) / 10)} kg ; à 13 % : ${nombre(Math.round((maigre / 0.87) * 10) / 10)} kg`);
    }
    if (reperes.length) parties.push(`## Repères calculés par l'app (à utiliser tels quels, ne pas recalculer)\n${reperes.join("\n")}`);

    const bilan = calculerBilan(mesures);
    if (bilan) {
      const lignes = bilan.map(
        (b) => `- ${b.label} : ${nombre(b.valeur)} ${b.unite} — ${b.statut}${b.delta != null ? ` (écart avec le scan précédent : ${b.delta > 0 ? "+" : ""}${nombre(b.delta)})` : ""}. ${b.texte}`
      );
      parties.push(`## Bilan corporel calculé par l'app (dernier scan)\n${lignes.join("\n")}`);
    }
  }

  // Habitudes
  const parSemaine = Object.fromEntries(entrees.map((e) => [e.semaineIso, e]));
  const actuelle = cleSemaine(auj);
  const semaines = dernieresSemaines(parSemaine, OBJECTIFS_DEFAUT, actuelle, 12).filter((s) => s.renseignee);
  const o = OBJECTIFS_DEFAUT;
  const hab = [
    `## Habitudes (bilans hebdomadaires saisis, 12 dernières semaines)`,
    `Objectifs : ${o.seancesParSemaine} séances par semaine, alimentation tenue ${o.dieteParSemaine} jours sur 7, ${o.sommeilHeures} h de sommeil par nuit (nuits du vendredi et du samedi exclues du calcul).`,
  ];
  if (semaines.length === 0) {
    hab.push("Aucun bilan hebdomadaire saisi.");
  } else {
    for (const s of semaines) {
      const e = parSemaine[s.cle];
      const nuits = Array.isArray(e?.heuresSommeil)
        ? e.heuresSommeil.map((h, i) => (h == null ? null : `${JOURS_LONGS[i].slice(0, 3).toLowerCase()} ${nombre(h)} h`)).filter(Boolean).join(", ")
        : null;
      const moy = moyenneNuits(e);
      let ligne = `- ${s.libelle}${s.cle === actuelle ? " (semaine en cours)" : ""} : ${s.seances} séance(s), alimentation ${s.diete}/7`;
      if (moy != null) ligne += `, sommeil moyen ${nombre(moy)} h`;
      if (nuits) ligne += ` (${nuits})`;
      if (e?.noteEtoiles) ligne += `, ressenti ${e.noteEtoiles}/5`;
      if (e?.texte) ligne += `. Note : « ${e.texte.slice(0, 400).replace(/\s+/g, " ")} »`;
      hab.push(ligne);
    }
  }
  parties.push(hab.join("\n"));

  const xp = calculerXp(entrees, mesures.length, OBJECTIFS_DEFAUT, actuelle);
  parties.push(`## Progression dans l'app\nNiveau ${xp.niveau}, ${xp.total} XP au total (${xp.habitudes} XP d'habitudes, ${xp.scans} XP de scans).`);

  // Objectifs
  const obj = ["## Objectifs fixés par l'utilisateur"];
  if (objectifs.length === 0 && mensuels.length === 0) obj.push("Aucun objectif fixé.");
  for (const x of objectifs) {
    const m = NOMS_METRIQUES[x.metrique];
    obj.push(`- ${m?.label ?? x.metrique} : ${nombre(x.valeurCible)}${m?.unite ? " " + m.unite : ""}${x.dateCible ? ` d'ici le ${date(x.dateCible)}` : ""}`);
  }
  for (const x of mensuels) obj.push(`- objectif mensuel « ${x.nature} » : ${nombre(x.valeurCible)}`);
  parties.push(obj.join("\n"));

  return parties.join("\n\n");
}
