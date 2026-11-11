// Apparence de la carte de rang : la LETTRE fixe le matériau, le signe
// (-, rien, +) fixe la finition. Treize matériaux se confondraient ; cinq
// matériaux à trois finitions se lisent d'un coup d'œil.
//
//   D graphite · C acier · B bronze · A or · S prisme (holographique)
//   « - » brossé (mat) · lettre seule : poli (reflet) · « + » étincelant (éclats)

export const MATERIAUX = {
  graphite: {
    nom: "Graphite",
    cadre: ["#3a3f47", "#8b9099", "#2a2e34"],
    lettre: ["#d5d9de", "#6d737c", "#d5d9de"],
    film: ["rgba(200,205,212,0.5)", "rgba(120,126,134,0.45)"],
    lueur: "rgba(160,166,176,0.22)",
  },
  acier: {
    nom: "Acier",
    cadre: ["#9aa4b1", "#e3e8ee", "#6f7986"],
    lettre: ["#f1f4f8", "#8f99a6", "#f1f4f8"],
    film: ["rgba(227,232,238,0.5)", "rgba(154,164,177,0.45)"],
    lueur: "rgba(200,210,222,0.28)",
  },
  bronze: {
    nom: "Bronze",
    cadre: ["#b9825c", "#f0c9a6", "#8a5a3c"],
    lettre: ["#f7d9bd", "#b9825c", "#f7d9bd"],
    film: ["rgba(240,201,166,0.5)", "rgba(185,130,92,0.45)"],
    lueur: "rgba(226,173,134,0.32)",
  },
  or: {
    nom: "Or",
    cadre: ["#d8b86a", "#fff1c4", "#a8853a"],
    lettre: ["#fff4d2", "#d1ad5c", "#fff4d2"],
    film: ["rgba(255,241,196,0.5)", "rgba(216,184,106,0.45)"],
    lueur: "rgba(236,211,145,0.32)",
  },
  prisme: {
    nom: "Prisme",
    cadre: ["#e4ecf3", "#8fe3ff", "#b9a4ff"],
    lettre: ["#e4ecf3", "#8fe3ff", "#b9a4ff"],
    film: ["rgba(143,227,255,0.5)", "rgba(185,164,255,0.5)"],
    lueur: "rgba(143,227,255,0.32)",
  },
};

const PAR_LETTRE = { D: "graphite", C: "acier", B: "bronze", A: "or", S: "prisme" };

/** { materiau, finition } pour un libellé de rang ("B+", "A-", "D"…). */
export function apparenceRang(label) {
  if (!label) return { materiau: "acier", finition: "brosse" };
  const materiau = PAR_LETTRE[label[0]] ?? "acier";
  const finition = label.endsWith("+") ? "etincelant" : label.endsWith("-") || label === "D" ? "brosse" : "poli";
  return { materiau, finition };
}

/** Variables CSS d'un matériau, posées sur la carte. */
export function variablesMateriau(materiau) {
  const m = MATERIAUX[materiau] ?? MATERIAUX.acier;
  return {
    "--c1": m.cadre[0],
    "--c2": m.cadre[1],
    "--c3": m.cadre[2],
    "--l1": m.lettre[0],
    "--l2": m.lettre[1],
    "--l3": m.lettre[2],
    "--f1": m.film[0],
    "--f2": m.film[1],
    "--lueur": m.lueur,
  };
}
