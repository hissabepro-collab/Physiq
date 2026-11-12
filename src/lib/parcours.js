// Parcours : l'histoire de la progression, construite à partir des scans et
// du journal. Refait le 12/11/2026 (l'ancienne page recopiait l'accueil en
// plein écran sans rien raconter).
//
// Produit :
//   - un résumé (depuis quand, combien de scans et de semaines, meilleur rang,
//     niveau) ;
//   - le prochain cap (rang suivant, niveau suivant, point le plus faible) ;
//   - une frise d'événements datés, du plus récent au plus ancien : scans,
//     passages de rang, niveaux gagnés, meilleures semaines, séries de
//     semaines réussies, début du suivi.

import { calculerRang, ORDRE_RANGS } from "@/lib/rang";
import { MATERIAUX, apparenceRang } from "@/lib/materiaux";
import { lundiDeSemaine, libelleSemaine, semaineReussie } from "@/lib/semaines";
import { BAREME, niveauDepuisXp, xpSemaine } from "@/lib/xp";
import { calculerBilan } from "@/lib/profilStats";

function arrondi(n, d = 1) {
  return n == null ? null : Math.round(n * 10 ** d) / 10 ** d;
}

function signe(n, d = 1, unite = "") {
  if (n == null || n === 0) return null;
  return `${n > 0 ? "+" : "−"}${Math.abs(arrondi(n, d)).toLocaleString("fr-FR")}${unite}`;
}

export function construireParcours(mesures, entrees, objectifs) {
  const semaines = [...entrees].filter((e) => e.semaineIso).sort((a, b) => a.semaineIso.localeCompare(b.semaineIso));
  const scans = [...mesures].sort((a, b) => new Date(a.dateScan) - new Date(b.dateScan));
  const evenements = [];

  // ── Scans et passages de rang ──────────────────────────────────────────
  let rangPrecedent = null;
  scans.forEach((m, i) => {
    const rang = calculerRang(m.scoreVisbody);
    const avant = scans[i - 1];
    const ecarts = avant
      ? [
          signe(m.masseMusculaireKg - avant.masseMusculaireKg, 1, " kg de muscle"),
          signe(m.masseGrasseKg - avant.masseGrasseKg, 1, " kg de gras"),
          signe(m.scoreVisbody - avant.scoreVisbody, 0, " pt"),
        ].filter(Boolean)
      : [];
    if (rang && rangPrecedent !== rang.label) {
      const monte = rangPrecedent == null || ORDRE_RANGS.indexOf(rang.label) > ORDRE_RANGS.indexOf(rangPrecedent);
      if (monte) {
        const nouvelleMatiere = !rangPrecedent || rangPrecedent[0] !== rang.label[0];
        const nom = MATERIAUX[apparenceRang(rang.label).materiau].nom;
        evenements.push({
          date: m.dateScan,
          type: "rang",
          rang: rang.label,
          titre: rangPrecedent ? `Rang ${rang.label}` : `Premier rang : ${rang.label}`,
          texte: nouvelleMatiere ? `Ta carte passe en ${nom.toLowerCase()}.` : `Nouvelle finition, toujours en ${nom.toLowerCase()}.`,
        });
      }
    }
    rangPrecedent = rang?.label ?? rangPrecedent;
    evenements.push({
      date: m.dateScan,
      type: "scan",
      rang: rang?.label ?? null,
      titre: i === 0 ? "Premier scan" : `Scan n° ${i + 1}`,
      texte: [
        m.scoreVisbody != null ? `Score ${m.scoreVisbody}/100` : null,
        m.masseMusculaireKg != null ? `${arrondi(m.masseMusculaireKg).toLocaleString("fr-FR")} kg de muscle` : null,
        m.bfpPct != null ? `${arrondi(m.bfpPct).toLocaleString("fr-FR")} % de graisse` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      ecarts,
    });
  });

  // ── Semaines : niveaux, meilleure semaine, séries ──────────────────────
  // XP cumulés semaine après semaine (scans comptés à leur semaine).
  const scansParSemaine = new Map();
  for (const m of scans) {
    const d = new Date(m.dateScan);
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const cle = semaines.find((s) => lundiDeSemaine(s.semaineIso).toDateString() === lundi.toDateString())?.semaineIso;
    if (cle) scansParSemaine.set(cle, (scansParSemaine.get(cle) ?? 0) + 1);
  }
  let total = 0;
  let niveau = 1;
  let meilleure = null;
  let serie = 0;
  let meilleureSerie = 0;
  for (const s of semaines) {
    const x = xpSemaine(s, objectifs);
    total += x.total + (scansParSemaine.get(s.semaineIso) ?? 0) * BAREME.scan;
    const n = niveauDepuisXp(total).niveau;
    const date = lundiDeSemaine(s.semaineIso);
    if (n > niveau) {
      evenements.push({
        date,
        type: "niveau",
        titre: n - niveau > 1 ? `Niveaux ${niveau + 1} à ${n}` : `Niveau ${n}`,
        texte: `${total.toLocaleString("fr-FR")} XP au total, semaine du ${libelleSemaine(s.semaineIso)}.`,
      });
      niveau = n;
    }
    if (!meilleure || x.total > meilleure.xp) meilleure = { cle: s.semaineIso, xp: x.total, date, s };
    if (semaineReussie(s, objectifs)) {
      serie += 1;
      if (serie >= 2 && serie > meilleureSerie) {
        evenements.push({
          date,
          type: "serie",
          titre: `${serie} semaines réussies d'affilée`,
          texte: "Séances, diète et sommeil tous au rendez-vous.",
        });
      }
      meilleureSerie = Math.max(meilleureSerie, serie);
    } else {
      serie = 0;
    }
  }
  if (meilleure && meilleure.xp > 0) {
    const nb = (l) => (Array.isArray(l) ? l.length : 0);
    evenements.push({
      date: meilleure.date,
      type: "record",
      titre: "Ta meilleure semaine",
      texte: `${meilleure.xp} XP : ${nb(meilleure.s.joursEntraines)} séances et ${nb(meilleure.s.joursDiete)} jours de diète (${libelleSemaine(meilleure.cle)}).`,
    });
  }
  if (semaines.length) {
    evenements.push({
      date: lundiDeSemaine(semaines[0].semaineIso),
      type: "debut",
      titre: "Début du suivi",
      texte: `Premier bilan de semaine (${libelleSemaine(semaines[0].semaineIso)}).`,
    });
  }

  // Scans tombés une semaine sans bilan : leurs XP comptent quand même.
  const scansComptes = [...scansParSemaine.values()].reduce((x, y) => x + y, 0);
  total += (scans.length - scansComptes) * BAREME.scan;

  evenements.sort((a, b) => new Date(b.date) - new Date(a.date) || ordreType(a.type) - ordreType(b.type));

  // ── Résumé et prochain cap ─────────────────────────────────────────────
  const meilleurScore = scans.reduce((max, m) => (m.scoreVisbody != null && m.scoreVisbody > max ? m.scoreVisbody : max), -1);
  const meilleurRang = meilleurScore >= 0 ? calculerRang(meilleurScore) : null;
  const derniere = scans.at(-1);
  const rangActuel = derniere ? calculerRang(derniere.scoreVisbody) : null;
  const niveauActuel = niveauDepuisXp(total);
  const bilan = derniere ? calculerBilan(scans) : null;
  const faible = bilan?.find((b) => b.statut === "attention") ?? bilan?.find((b) => b.statut === "surveiller") ?? null;
  const debut = semaines.length ? lundiDeSemaine(semaines[0].semaineIso) : derniere ? new Date(derniere.dateScan) : null;

  return {
    resume: {
      depuis: debut,
      scans: scans.length,
      semaines: semaines.length,
      meilleurRang: meilleurRang?.label ?? null,
      niveau: niveauActuel.niveau,
      xp: total,
      meilleureSerie,
    },
    cap: {
      rang: rangActuel,
      niveau: niveauActuel,
      faible: faible ? { label: faible.label, texte: faible.texte } : null,
    },
    evenements,
  };
}

function ordreType(t) {
  return { rang: 0, scan: 1, niveau: 2, serie: 3, record: 4, debut: 5 }[t] ?? 9;
}
