import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth";

export async function POST(request) {
  const { motDePasse } = await request.json();
  if (!motDePasse) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const profil = await prisma.profil.findUnique({ where: { id: 1 } });

  let ok = false;
  if (profil?.motDePasseHash) {
    ok = await bcrypt.compare(motDePasse, profil.motDePasseHash);
  } else {
    // Aucun mot de passe personnalisé encore défini : on retombe sur celui
    // des variables d'environnement (à changer dans Paramètres ensuite).
    ok = motDePasse === process.env.SITE_PASSWORD;
  }

  if (!ok) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const token = await createSessionToken(process.env.SESSION_SECRET);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
