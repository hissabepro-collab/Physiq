import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validerSeance } from "@/lib/carnet";

// Carnet d'entraînement : liste, ajout, modification, suppression de
// séances. Protégée par la session comme toutes les routes /api.

export const dynamic = "force-dynamic";

export async function GET() {
  const seances = await prisma.seanceMuscu.findMany({ orderBy: { date: "desc" }, take: 200 });
  return NextResponse.json({ seances });
}

async function lireCorps(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request) {
  const r = validerSeance(await lireCorps(request));
  if (r.erreur) return NextResponse.json({ erreur: r.erreur }, { status: 400 });
  const seance = await prisma.seanceMuscu.create({ data: r.seance });
  return NextResponse.json({ seance });
}

export async function PUT(request) {
  const corps = await lireCorps(request);
  if (!corps?.id) return NextResponse.json({ erreur: "requete-invalide" }, { status: 400 });
  const r = validerSeance(corps);
  if (r.erreur) return NextResponse.json({ erreur: r.erreur }, { status: 400 });
  try {
    const seance = await prisma.seanceMuscu.update({ where: { id: String(corps.id) }, data: r.seance });
    return NextResponse.json({ seance });
  } catch {
    return NextResponse.json({ erreur: "introuvable" }, { status: 404 });
  }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erreur: "requete-invalide" }, { status: 400 });
  try {
    await prisma.seanceMuscu.delete({ where: { id } });
  } catch {
    return NextResponse.json({ erreur: "introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
