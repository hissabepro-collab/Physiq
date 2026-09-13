import { PDFParse } from "pdf-parse";

/**
 * Parseur de rapports Visbody (PDF).
 *
 * Le rapport alterne entre anglais et français selon les scans, avec des
 * libellés différents pour les mêmes métriques. Certaines valeurs (SMM, BFP,
 * IMC, RTH, métabolisme de base, graisse viscérale, ICW, ECW, ratio ECW/TBW,
 * masses par segment) n'apparaissent JAMAIS à côté de leur libellé dans le
 * flux de texte du PDF : elles sont regroupées dans un bloc de nombres en fin
 * de document, mais toujours dans le même ordre, quelle que soit la langue.
 * On s'appuie donc sur deux stratégies combinées :
 *  - des expressions régulières bilingues pour les champs qui ONT leur valeur
 *    juste à côté du libellé (poids, masse maigre, masse musculaire, eau
 *    corporelle totale, évaluation de l'obésité) — utilisées aussi comme
 *    validation croisée du bloc positionnel ;
 *  - un repérage positionnel pour le bloc de nombres final.
 */

const QUALIFIER_WORDS = new Set([
  "normal",
  "over",
  "under",
  "haute",
  "basse",
  "excès",
  "exces",
  "bas",
]);

function toNumber(str) {
  if (str == null) return null;
  const n = Number.parseFloat(String(str).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function extractDeltaScore(text) {
  const m = text.match(
    /(?:Compared to [Tt]he Last Score|Comparaison avec la derni[eè]re note)\s*([+-]?\d+)/
  );
  return m ? Number.parseInt(m[1], 10) : null;
}

function stripDeltaLine(text) {
  return text.replace(
    /(?:Compared to [Tt]he Last Score|Comparaison avec la derni[eè]re note)\s*[+-]?\d+/,
    ""
  );
}

function extractScore(text) {
  const cleaned = stripDeltaLine(text);
  const m = cleaned.match(/(?:Score|Note)\s+(\d{1,3})\b/);
  return m ? Number.parseInt(m[1], 10) : null;
}

function extractHeader(flat) {
  const height = flat.match(/(?:Height|Taille)\s*:\s*([\d.]+)\s*cm/i);
  const age = flat.match(/Age\s*:\s*(\d+)/i);
  const gender = flat.match(/(?:Gender|Sexe)\s*:\s*(Male|Female|Homme|Femme)/i);
  const dateTime = flat.match(
    /(?:Test Date\/?\s*Time|Temps de d[ée]tection)\s*:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/i
  );
  const langue = /Rapport Composition corporelle|Note \d/.test(flat) ? "fr" : "en";

  return {
    tailleCm: height ? toNumber(height[1]) : null,
    age: age ? Number.parseInt(age[1], 10) : null,
    sexe: gender ? (/^(male|homme)$/i.test(gender[1]) ? "Homme" : "Femme") : null,
    dateScan: dateTime ? new Date(`${dateTime[1]}T${dateTime[2]}`) : null,
    langue,
  };
}

// Champs directement associés à leur libellé dans le texte (table "Overview").
function extractOverviewTable(flat) {
  const weight = flat.match(
    /(?:Weight|Poids)\s*kg\s+([\d.]+)\s*\[[^\]]*\]\s*([\d.]+)\s*\[/i
  );
  const leanBodyMass = flat.match(
    /(?:Lean\s*Body\s*M\s*ass|MMC)\s*kg\s+([\d.]+)\s*\[[^\]]*\]\s*([\d.]+)\s*\[/i
  );
  const muscleMass = flat.match(
    /(?:M\s*uscle\s*M\s*ass|Masse\s*musculaire)\s*kg\s+([\d.]+)\s*\[[^\]]*\]\s*([\d.]+)\s*\[/i
  );
  const bodyWater = flat.match(
    /(?:Body Water|Eau\s*Corporelle\s*Totale)\s*kg\s+([\d.]+)\s*\[/i
  );

  return {
    poidsKg: weight ? toNumber(weight[1]) : null,
    masseGrasseKg: weight ? toNumber(weight[2]) : null, // "Body Fat Mass" / "MGC" (2e valeur de la ligne Poids)
    masseMaigreKg: leanBodyMass ? toNumber(leanBodyMass[1]) : null,
    selsInorganiquesKg: leanBodyMass ? toNumber(leanBodyMass[2]) : null,
    masseMusculaireKg: muscleMass ? toNumber(muscleMass[1]) : null,
    proteineKg: muscleMass ? toNumber(muscleMass[2]) : null,
    eauTotaleKg: bodyWater ? toNumber(bodyWater[1]) : null,
  };
}

// Table "Evaluation de l'obésité" / "Obesity Assessment" : valeurs idéales.
function extractIdealValues(flat) {
  const weight = flat.match(
    /(?:Weight|Poids)\s*kg\s+([\d.]+)\s*(?:Over|Under|Normal|Exc[eè]s|Bas)\s+([\d.]+)\s+(-?[\d.]+)/i
  );
  const fatMass = flat.match(
    /(?:Body Fat Mass|MGC)\s*kg\s+([\d.]+)\s*(?:Over|Under|Normal|Exc[eè]s|Bas)\s+([\d.]+)\s+(-?[\d.]+)/i
  );

  return {
    poidsIdealKg: weight ? toNumber(weight[2]) : null,
    masseGrasseIdealeKg: fatMass ? toNumber(fatMass[2]) : null,
  };
}

// Âge métabolique : nombre isolé juste avant "Segmental Fat Analysis".
function extractAgeMetabolique(flat) {
  const m = flat.match(
    /\]\s*(\d+)\s*(?:Segmental Fat Analysis|Masse\s*graisseuse\s*par\s*segment)/i
  );
  return m ? Number.parseInt(m[1], 10) : null;
}

/**
 * Bloc de nombres positionnel, en fin de rapport, toujours dans cet ordre :
 * [Poids, SMM, MasseGrasse, BFP%, IMC, RTH, MB, GraisseViscérale, ICW, ECW,
 *  (RatioECW/TBW si présent), TroncGraisse, qualificatif, TroncMuscle, qualificatif]
 */
function extractPositionalBlock(flat) {
  const tokens = flat.split(/\s+/).filter(Boolean);

  const leftRightIdx = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if ((a === "Left" && b === "Right") || (a === "Gauche" && b === "Droit")) {
      leftRightIdx.push(i);
    }
  }
  if (leftRightIdx.length < 2) {
    return { fields: {}, segments: null, warning: "Bloc de segments introuvable" };
  }

  const dumpStart = leftRightIdx[1] + 2;
  const dumpTokens = tokens.slice(dumpStart);
  const hasRatio = /ECW\s*\/\s*TBW/i.test(flat);
  const count = hasRatio ? 11 : 10;

  const nums = dumpTokens.slice(0, count).map(toNumber);
  if (nums.some((n) => n === null) || nums.length < count) {
    return { fields: {}, segments: null, warning: "Bloc de valeurs final incomplet ou inattendu" };
  }

  const [poids, smm, masseGrasse, bfp, imc, rth, mb, graisseViscerale, icw, ecw, ratio] = nums;

  const troncGraisse = toNumber(dumpTokens[count]);
  const troncMuscle = toNumber(dumpTokens[count + 2]);

  // Segments bras/jambes : entre la 1re et la 2e occurrence de "Left Right".
  const fatSegTokens = tokens.slice(leftRightIdx[0] - 8, leftRightIdx[0]);
  const leanSegTokens = tokens.slice(leftRightIdx[1] - 8, leftRightIdx[1]);
  const readPairs = (arr) =>
    arr
      .filter((t) => !QUALIFIER_WORDS.has(t.toLowerCase()) && t.toLowerCase() !== "kg")
      .map(toNumber)
      .filter((n) => n !== null);
  const fatVals = readPairs(fatSegTokens); // [brasG, jambeG, brasD, jambeD]
  const leanVals = readPairs(leanSegTokens);

  return {
    fields: {
      smmKg: smm,
      bfpPct: bfp,
      imc,
      rth,
      metabolismeBaseKcal: mb,
      niveauGraisseViscerale: graisseViscerale,
      eauIntracellulaireKg: icw,
      eauExtracellulaireKg: ecw,
      ratioEcwTbw: hasRatio ? ratio : null,
      // servent de validation croisée avec la table Overview :
      _poidsPositionnel: poids,
      _masseGrassePositionnelle: masseGrasse,
    },
    segments: {
      grasseKg: {
        brasGauche: fatVals[0] ?? null,
        jambeGauche: fatVals[1] ?? null,
        brasDroit: fatVals[2] ?? null,
        jambeDroite: fatVals[3] ?? null,
        tronc: troncGraisse,
      },
      maigreKg: {
        brasGauche: leanVals[0] ?? null,
        jambeGauche: leanVals[1] ?? null,
        brasDroit: leanVals[2] ?? null,
        jambeDroite: leanVals[3] ?? null,
        tronc: troncMuscle,
      },
    },
    warning: null,
  };
}

/**
 * @param {Buffer} buffer - contenu binaire du PDF
 * @param {string} [sourceFichier] - nom du fichier d'origine, pour traçabilité
 */
export async function parseVisbodyPdf(buffer, sourceFichier = null) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  const rawText = result.text;
  const flat = rawText.replace(/\s+/g, " ").trim();

  const header = extractHeader(flat);
  const overview = extractOverviewTable(flat);
  const ideal = extractIdealValues(flat);
  const ageMetabolique = extractAgeMetabolique(flat);
  const positional = extractPositionalBlock(flat);
  const scoreVisbody = extractScore(flat);
  const deltaScorePrecedent = extractDeltaScore(flat);

  const warnings = [];
  if (positional.warning) warnings.push(positional.warning);

  // Validation croisée : le poids et la masse grasse doivent être cohérents
  // entre la table "Overview" (par libellé) et le bloc positionnel.
  const { _poidsPositionnel, _masseGrassePositionnelle, ...positionalFields } =
    positional.fields;
  if (
    overview.poidsKg != null &&
    _poidsPositionnel != null &&
    Math.abs(overview.poidsKg - _poidsPositionnel) > 0.2
  ) {
    warnings.push(
      `Poids incohérent entre les deux tables du rapport (${overview.poidsKg} vs ${_poidsPositionnel}) — à vérifier`
    );
  }
  if (
    overview.masseGrasseKg != null &&
    _masseGrassePositionnelle != null &&
    Math.abs(overview.masseGrasseKg - _masseGrassePositionnelle) > 0.2
  ) {
    warnings.push(
      `Masse grasse incohérente entre les deux tables du rapport (${overview.masseGrasseKg} vs ${_masseGrassePositionnelle}) — à vérifier`
    );
  }

  const donnees = {
    dateScan: header.dateScan,
    scoreVisbody,
    poidsKg: overview.poidsKg,
    masseGrasseKg: overview.masseGrasseKg,
    bfpPct: positionalFields.bfpPct ?? null,
    masseMusculaireKg: overview.masseMusculaireKg,
    smmKg: positionalFields.smmKg ?? null,
    masseMaigreKg: overview.masseMaigreKg,
    eauTotaleKg: overview.eauTotaleKg,
    eauIntracellulaireKg: positionalFields.eauIntracellulaireKg ?? null,
    eauExtracellulaireKg: positionalFields.eauExtracellulaireKg ?? null,
    ratioEcwTbw: positionalFields.ratioEcwTbw ?? null,
    imc: positionalFields.imc ?? null,
    rth: positionalFields.rth ?? null,
    metabolismeBaseKcal: positionalFields.metabolismeBaseKcal ?? null,
    ageMetabolique,
    niveauGraisseViscerale: positionalFields.niveauGraisseViscerale ?? null,
    selsInorganiquesKg: overview.selsInorganiquesKg,
    proteineKg: overview.proteineKg,
    poidsIdealKg: ideal.poidsIdealKg,
    masseGrasseIdealeKg: ideal.masseGrasseIdealeKg,
    segments: positional.segments,
    languePdf: header.langue,
    sourceFichier,
    extractionAuto: true,
  };

  // Champs essentiels manquants -> l'utilisateur devra les corriger à la main.
  for (const champ of ["dateScan", "poidsKg", "masseGrasseKg", "masseMusculaireKg"]) {
    if (donnees[champ] == null) warnings.push(`Champ essentiel non détecté : ${champ}`);
  }

  return { donnees, warnings, profil: { tailleCm: header.tailleCm, sexe: header.sexe } };
}
