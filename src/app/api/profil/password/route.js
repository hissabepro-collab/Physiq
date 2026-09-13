import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function PATCH(request) {
  const { motDePasseActuel, nouveauMotDePasse } = await request.json();
  if (!nouveauMotDePasse || nouveauMotDePasse.length < 4) {
    return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 4 caractères" }, { status: 400 });
  }

  const profil = await prisma.profil.findUnique({ where: { id: 1 } });
  const actuelValide = profil?.motDePasseHash
    ? await bcrypt.compare(motDePasseActuel, profil.motDePasseHash)
    : motDePasseActuel === process.env.SITE_PASSWORD;

  if (!actuelValide) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  const hash = await bcrypt.hash(nouveauMotDePasse, 10);
  await prisma.profil.upsert({
    where: { id: 1 },
    update: { motDePasseHash: hash },
    create: { id: 1, motDePasseHash: hash },
  });

  return NextResponse.json({ ok: true });
}
