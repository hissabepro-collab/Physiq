// Recherche d'études scientifiques sur PubMed (base publique de la National
// Library of Medicine, gratuite, sans clé). Utilisée par le coach quand une
// question demande des connaissances au-delà des données de l'utilisateur.
//
// Pourquoi PubMed plutôt que Google : la recherche Google intégrée à Gemini
// n'est pas gratuite sur ce compte (quota 0, vérifié le 13/11/2026), et pour
// la composition corporelle, la nutrition et le sommeil, les études publiées
// sont la source la plus fiable.
//
// Seuls des termes de recherche généraux partent vers PubMed (ex. « protein
// intake fat loss resistance training ») : jamais les données de l'utilisateur.

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const DELAI = 6000;
const MAX_ETUDES = 4;

// PubMed sans clé : 3 requêtes par seconde au plus, sinon 429 (constaté le
// 13/11/2026). Les appels sont espacés d'au moins 350 ms.
let prochainCreneau = 0;
async function attendreCreneau() {
  const maintenant = Date.now();
  const attente = Math.max(0, prochainCreneau - maintenant);
  prochainCreneau = Math.max(maintenant, prochainCreneau) + 350;
  if (attente) await new Promise((r) => setTimeout(r, attente));
}

async function lire(url, type) {
  await attendreCreneau();
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), DELAI);
  try {
    const rep = await fetch(url, { signal: arret.signal, headers: { "User-Agent": "physiq-coach" } });
    if (!rep.ok) throw new Error(`PubMed ${rep.status}`);
    return type === "json" ? await rep.json() : await rep.text();
  } finally {
    clearTimeout(minuteur);
  }
}

function texteXml(bloc) {
  return bloc
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cherche les études les plus pertinentes des 10 dernières années, en
 * privilégiant méta-analyses, revues et essais. Renvoie au plus 4 études :
 * { titre, annee, revue, type, resume (tronqué), lien }.
 */
export async function rechercherEtudes(requete) {
  const termes = String(requete ?? "").slice(0, 200).trim();
  if (!termes) return [];
  const filtre = '(meta-analysis[pt] OR systematic review[pt] OR review[pt] OR randomized controlled trial[pt] OR position statement OR guideline[pt])';
  const params = new URLSearchParams({
    db: "pubmed",
    term: `(${termes}) AND ${filtre}`,
    retmax: String(MAX_ETUDES),
    sort: "relevance",
    datetype: "pdat",
    reldate: String(365 * 10),
    retmode: "json",
    tool: "physiq",
  });
  const recherche = await lire(`${BASE}/esearch.fcgi?${params}`, "json");
  let ids = recherche?.esearchresult?.idlist ?? [];
  if (ids.length === 0) {
    // Rien avec le filtre : on retente sans, toujours sur 10 ans.
    params.set("term", termes);
    ids = (await lire(`${BASE}/esearch.fcgi?${params}`, "json"))?.esearchresult?.idlist ?? [];
  }
  if (ids.length === 0) {
    // Requête trop précise (fréquent avec celles que formule le modèle) :
    // on garde les 3 premiers mots-clés, avec le filtre de qualité.
    const courts = termes.replace(/["()]/g, " ").split(/\s+/).filter((m) => m.length > 2 && !/^(and|or|not|the|for|with|of|in|on)$/i.test(m)).slice(0, 3);
    if (courts.length >= 2) {
      params.set("term", `(${courts.join(" ")}) AND ${filtre}`);
      ids = (await lire(`${BASE}/esearch.fcgi?${params}`, "json"))?.esearchresult?.idlist ?? [];
    }
  }
  if (ids.length === 0) return [];

  const xml = await lire(`${BASE}/efetch.fcgi?db=pubmed&retmode=xml&tool=physiq&id=${ids.join(",")}`, "text");
  const articles = xml.split("<PubmedArticle>").slice(1);
  return articles.map((a) => {
    const pmid = a.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    const titre = texteXml(a.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1] ?? "");
    const revue = texteXml(a.match(/<ISOAbbreviation>([\s\S]*?)<\/ISOAbbreviation>/)?.[1] ?? a.match(/<Title>([\s\S]*?)<\/Title>/)?.[1] ?? "");
    const annee = a.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/)?.[1] ?? a.match(/<Year>(\d{4})<\/Year>/)?.[1] ?? null;
    const types = [...a.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((m) => texteXml(m[1]));
    const type = types.find((t) => /Meta-Analysis|Systematic Review|Randomized Controlled Trial|Review|Guideline/i.test(t)) ?? types[0] ?? "";
    const resume = [...a.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => texteXml(m[1])).join(" ");
    return {
      titre,
      annee,
      revue,
      type,
      resume: resume.length > 1400 ? resume.slice(0, 1400) + "…" : resume,
      lien: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null,
    };
  }).filter((e) => e.titre && e.lien);
}
