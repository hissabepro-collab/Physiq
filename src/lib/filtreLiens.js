// Garde-fou contre les sources inventées (constaté le 13/11/2026 : Gemini
// Flash-Lite citait des liens PubMed de mémoire, sans avoir cherché).
//
// Le texte du coach passe par ce filtre avant d'être envoyé : un lien
// Markdown [texte](url) n'est gardé que si son url a réellement été renvoyée
// par une recherche faite pendant cette réponse ; sinon seul le texte reste.
// Les adresses nues (https://…) non vérifiées sont retirées.
//
// La réponse arrive par morceaux : un lien peut être coupé en deux. Le filtre
// garde donc en attente la fin du texte à partir d'un « [ » ou d'un « http »
// non terminé, au plus 500 caractères.

const LIEN = /\[([^\]\n]{1,300})\]\((\S{1,500}?)\)/g;
const NU = /(^|[\s(])(https?:\/\/[^\s)]+)/g;

export function creerFiltreLiens(autorises, ecrire) {
  let tampon = "";

  function nettoyer(texte) {
    return texte
      .replace(LIEN, (tout, libelle, url) => (autorises.has(url) ? tout : libelle))
      .replace(NU, (tout, avant, url) => (autorises.has(url) ? tout : avant));
  }

  function pousser(morceau, fin = false) {
    tampon += morceau;
    let coupe = tampon.length;
    if (!fin) {
      const crochet = tampon.lastIndexOf("[");
      if (crochet !== -1 && !/\]\(\S*?\)/.test(tampon.slice(crochet))) coupe = Math.min(coupe, crochet);
      // Dernier mot : une adresse en cours (« https://… ») ou son début
      // (« h », « htt », « https:/ »…), coupé entre deux morceaux.
      const dernier = tampon.match(/\S*$/)[0];
      const mot = dernier.replace(/^\(/, "");
      if (mot && (/^https?:\/\//.test(mot) || "https://".startsWith(mot) || "http://".startsWith(mot))) {
        coupe = Math.min(coupe, tampon.length - dernier.length);
      }
      // Rien ne reste en attente indéfiniment.
      if (tampon.length - coupe > 500) coupe = tampon.length;
    }
    const pret = tampon.slice(0, coupe);
    tampon = tampon.slice(coupe);
    if (pret) ecrire(nettoyer(pret));
  }

  return {
    ecrire: (morceau) => pousser(morceau),
    vider: () => pousser("", true),
  };
}
