import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const objectifs = await prisma.objectif.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ objectifs });
}

export async function POST(request) {
  const body = await request.json();
  const objectif = await prisma.objectif.create({
    data: {
      metrique: body.metrique,
      valeurCible: Number(body.valeurCible),
      dateCible: body.dateCible ? new Date(body.dateCible) : null,
    },
  });
  return NextResponse.json({ objectif });
}
