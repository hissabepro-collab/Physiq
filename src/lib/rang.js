// Système de rang à paliers fins, basé sur le score Visbody (/100).
// Chaque palier couvre ~3 points ; une barre d'XP montre la progression
// à l'intérieur du palier courant, même quand la lettre ne change pas.

const PALIERS = [
  { label: "D", min: 0, max: 59 },
  { label: "C-", min: 60, max: 62 },
  { label: "C", min: 63, max: 66 },
  { label: "C+", min: 67, max: 69 },
  { label: "B-", min: 70, max: 72 },
  { label: "B", min: 73, max: 76 },
  { label: "B+", min: 77, max: 79 },
  { label: "A-", min: 80, max: 82 },
  { label: "A", min: 83, max: 86 },
  { label: "A+", min: 87, max: 89 },
  { label: "S-", min: 90, max: 92 },
  { label: "S", min: 93, max: 96 },
  { label: "S+", min: 97, max: 100 },
];

export function calculerRang(score) {
  if (score == null) return null;

  const clamped = Math.max(0, Math.min(100, score));
  const index = PALIERS.findIndex((p) => clamped >= p.min && clamped <= p.max);
  const palier = PALIERS[index] ?? PALIERS[0];
  const suivant = PALIERS[index + 1] ?? null;

  const largeur = palier.max - palier.min + 1;
  const xpPercent = Math.round(((clamped - palier.min + 1) / largeur) * 100);

  return {
    label: palier.label,
    score: clamped,
    xpPercent: Math.max(0, Math.min(100, xpPercent)),
    palierSuivant: suivant?.label ?? null,
    pointsAvantPalierSuivant: suivant ? suivant.min - clamped : null,
  };
}
