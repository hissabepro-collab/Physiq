// Recherche d'articles de presse via le flux RSS public de Google Actualités
// (gratuit, sans clé). Utilisée par le coach pour l'actualité et les articles
// grand public, en complément des études de PubMed (lib/rechercheEtudes).
//
// Seuls des termes de recherche généraux partent vers Google : jamais les
// données de l'utilisateur. Le flux ne donne que le titre, le média, la date
// et le lien ; le coach doit donc citer ces articles avec prudence.

const DELAI = 6000;
const MAX_ARTICLES = 5;

function texte(bloc) {
  return (bloc ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Articles récents (2 dernières années) : { titre, media, date, lien }. */
export async function rechercherPresse(requete) {
  const termes = String(requete ?? "").slice(0, 200).trim();
  if (!termes) return [];
  const params = new URLSearchParams({ q: `${termes} when:2y`, hl: "fr", gl: "FR", ceid: "FR:fr" });
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), DELAI);
  let xml;
  try {
    const rep = await fetch(`https://news.google.com/rss/search?${params}`, { signal: arret.signal, headers: { "User-Agent": "physiq-coach" } });
    if (!rep.ok) throw new Error(`Actualités ${rep.status}`);
    xml = await rep.text();
  } finally {
    clearTimeout(minuteur);
  }
  return xml
    .split("<item>")
    .slice(1, MAX_ARTICLES + 1)
    .map((item) => {
      const media = texte(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]);
      let titre = texte(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
      // Google ajoute « - Média » à la fin du titre.
      if (media && titre.endsWith(` - ${media}`)) titre = titre.slice(0, -(media.length + 3));
      const lien = texte(item.match(/<link>([\s\S]*?)<\/link>/)?.[1]);
      const brute = texte(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]);
      const date = brute ? new Date(brute).toISOString().slice(0, 10) : null;
      return { titre, media, date, lien };
    })
    .filter((a) => a.titre && a.lien?.startsWith("https://"));
}
