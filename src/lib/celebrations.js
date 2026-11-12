// Célébrations de la carte de rang : une signature par LETTRE, enrichie par
// le SIGNE. Plus on monte, plus c'est impressionnant.
//
//   D  Impact     — la carte se soulève, tourne et retombe lourdement ; poussière.
//   C  Lame       — tour vif comme une lame d'acier ; gerbe d'étincelles.
//   B  Forge      — la carte chauffe au rouge, tourne lentement ; braises qui montent.
//   A  Couronne   — double tour en s'élevant ; étoiles d'or, rayons, paillettes.
//   S  Ascension  — fissures de lumière, éclair, triple tour ; spectre, pluie de lumière.
//
// Le signe : « - » = la signature seule ; lettre seule = plus de particules et
// un effet de plus ; « + » = encore plus, et un tour supplémentaire (C et B).

/** Niveau dans la lettre : 0 pour « - » (et D), 1 pour la lettre seule, 2 pour « + ». */
export function niveauDansLettre(label) {
  if (label.endsWith("+")) return 2;
  if (label.endsWith("-") || label === "D") return 0;
  return 1;
}

const FAMILLES = {
  D: { duree: 1600, tours: 360, prelude: 0, bascule: 0.36, atterrissage: 0.74, info: "d" },
  C: { duree: 1350, tours: 360, prelude: 0, bascule: 0.3, atterrissage: 0.62, info: "std" },
  B: { duree: 1900, tours: 360, prelude: 0, bascule: 0.5, atterrissage: 0.86, info: "lent" },
  A: { duree: 2150, tours: 720, prelude: 0, bascule: 0.3, atterrissage: 0.86, info: "std" },
  S: { duree: 2800, tours: 1080, prelude: 1150, bascule: 0.22, atterrissage: 0.86, info: "std" },
};

/** Réglages complets de la célébration d'un rang ("B+", "A-"…). */
export function reglagesFete(label) {
  const famille = label[0];
  const n = niveauDansLettre(label);
  const base = FAMILLES[famille] ?? FAMILLES.C;
  const tourEnPlus = (famille === "C" || famille === "B") && n === 2;
  const duree = base.duree + (tourEnPlus ? 350 : 0) + n * 60;
  const tours = base.tours + (tourEnPlus ? 360 : 0);

  const fx = {
    poussiere: famille === "D" ? 14 : 0,
    etincelles: famille === "C" ? 10 + n * 7 : 0,
    chaleur: famille === "B",
    braises: famille === "B" ? 12 + n * 8 : 0,
    etoiles: famille === "A" ? 8 + n * 4 : 0,
    paillettes: famille === "A" ? n * 12 : 0,
    eclatsPrisme: famille === "S" ? 18 + n * 6 : 0,
    pluie: famille === "S" ? (n >= 1 ? 12 + n * 6 : 0) : 0,
    fissures: famille === "S",
    spectre: famille === "S",
    rayons: (famille === "A" && n >= 1) || famille === "S",
    trait: famille !== "D" && !(famille === "C" && n === 0),
    aura: famille !== "D" && !(famille === "C" && n === 0),
    onde: (famille === "C" && n === 2) || (famille === "B" && n >= 1) || famille === "A" || famille === "S",
    ondeDouble: (famille === "A" && n === 2) || famille === "S",
    grandeOnde: famille === "S" && n === 2,
  };

  return {
    famille,
    n,
    fx,
    prelude: base.prelude,
    duree,
    tours,
    info: base.info,
    bascule: base.prelude + Math.round(duree * base.bascule),
    atterrissage: base.prelude + Math.round(duree * base.atterrissage),
    fin: base.prelude + duree + 1400,
  };
}

// Particules : positions et trajectoires fixes (rendu stable, pas de hasard).
export const POUSSIERE = Array.from({ length: 14 }, (_, i) => ({
  dx: (i % 2 ? 1 : -1) * (40 + ((i * 29) % 130)),
  dy: -(8 + ((i * 17) % 34)),
  taille: 4 + (i % 4) * 2,
  retard: (i % 5) * 25,
}));
export const ETINCELLES = Array.from({ length: 24 }, (_, i) => ({
  angle: -160 + ((i * 47) % 140),
  distance: 90 + ((i * 53) % 120),
  retard: (i % 6) * 22,
}));
export const BRAISES = Array.from({ length: 28 }, (_, i) => ({
  x: `${4 + ((i * 37) % 92)}%`,
  dx: ((i * 23) % 40) - 20,
  hauteur: -(120 + ((i * 41) % 160)),
  taille: 3 + (i % 3),
  retard: (i * 83) % 1300,
  duree: 1500 + ((i * 97) % 900),
}));
export const ETOILES = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return {
    x: `${50 + Math.cos(a) * 58}%`,
    y: `${50 + Math.sin(a) * 66}%`,
    taille: 9 + (i % 3) * 4,
    retard: (i % 8) * 60,
  };
});
export const ECLATS = Array.from({ length: 36 }, (_, i) => ({
  angle: i * 10 + (i % 2 ? 5 : -3),
  distance: 120 + ((i * 37) % 110),
  largeur: 3 + (i % 3) * 2,
  hauteur: 6 + (i % 4) * 3,
  tour: (i % 2 ? 1 : -1) * (180 + (i % 5) * 90),
  retard: (i % 6) * 30,
  clair: i % 3 === 0,
}));
export const GOUTTES = Array.from({ length: 24 }, (_, i) => ({
  x: `${(i * 53) % 100}%`,
  retard: (i * 97) % 1100,
  duree: 1100 + ((i * 131) % 700),
  taille: 2 + (i % 3),
}));

// Scintillements AU REPOS, selon la matière et la finition : étoiles d'or pour
// l'or (dès A-), éclats irisés pour le prisme, simples reflets pour le « + »
// des autres matières. C'est ce qui distingue d'un coup d'œil un B- d'un A-.
const POSITIONS = [
  { x: "12%", y: "34%" }, { x: "31%", y: "62%" }, { x: "24%", y: "20%" }, { x: "44%", y: "40%" },
  { x: "8%", y: "60%" }, { x: "70%", y: "18%" }, { x: "86%", y: "52%" }, { x: "58%", y: "74%" },
  { x: "38%", y: "12%" }, { x: "92%", y: "28%" }, { x: "18%", y: "82%" }, { x: "76%", y: "84%" },
];
export function scintillementsRepos(materiau, finition) {
  const parFinition = { brosse: 0, poli: 1, etincelant: 2 }[finition] ?? 0;
  let nombre = 0;
  let forme = "reflet";
  if (materiau === "or") {
    nombre = [3, 5, 8][parFinition];
    forme = "etoile";
  } else if (materiau === "prisme") {
    nombre = [6, 9, 12][parFinition];
    forme = "prisme";
  } else if (finition === "etincelant") {
    nombre = 4;
  }
  return POSITIONS.slice(0, nombre).map((p, i) => ({ ...p, forme, retard: `${(i * 0.53) % 2.6}s` }));
}
