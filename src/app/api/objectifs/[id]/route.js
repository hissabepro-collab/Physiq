import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const data = {};
  if ("actif" in body) data.actif = Boolean(body.actif);
  if ("valeurCible" in body) data.valeurCible = Number(body.valeurCible);
  if ("dateCible" in body) data.dateCible = body.dateCible ? new Date(body.dateCible) : null;

  const objectif = await prisma.objectif.update({ where: { id }, data });
  return NextResponse.json({ objectif });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.objectif.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
