import { NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

// Protège toutes les pages sauf /login et les routes techniques nécessaires
// à son fonctionnement (l'API de connexion et les fichiers statiques).
export const config = {
  // Les écrans de démarrage et les icônes doivent rester accessibles sans
  // session : iOS les demande avant toute connexion, et une redirection vers
  // la page de connexion ferait réapparaître l'écran blanc au lancement.
  // Ils ne contiennent que le logo, aucune donnée personnelle.
  //
  // demarrage.html est exclue pour la même raison : c'est la page d'entrée de
  // l'app installée, servie par le réseau de diffusion sans le moindre
  // aller-retour serveur. Elle n'affiche qu'un fond sombre — aucune donnée ;
  // la vérification de session a lieu juste après, quand elle navigue vers "/".
  matcher: ["/((?!login|api/login|demarrage.html|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|splash).*)"],
};

export async function proxy(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isValidSessionToken(token, process.env.SESSION_SECRET);

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
