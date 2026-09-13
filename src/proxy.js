import { NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

// Protège toutes les pages sauf /login et les routes techniques nécessaires
// à son fonctionnement (l'API de connexion et les fichiers statiques).
export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)"],
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
