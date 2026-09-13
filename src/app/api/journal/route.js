import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

// NOTE : les photos sont stockées sur le disque local (dossier /data/uploads,
// exclu du dépôt git). Cela fonctionne en développement, mais Vercel ne
// conserve pas les fichiers écrits sur disque entre les requêtes en
// production (environnement serverless) — il faudra brancher un stockage
// externe (ex: Vercel Blob, gratuit) avant de déployer si tu veux garder les
// photos de progression en ligne.
const DOSSIER_UPLOADS = path.join(process.cwd(), "data", "uploads");

export async function GET() {
  const entrees = await prisma.journalEntry.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json({ entrees });
}

export async function POST(request) {
  const formData = await request.formData();
  const texte = formData.get("texte") || null;
  const sommeilHeures = formData.get("sommeilHeures") ? Number(formData.get("sommeilHeures")) : null;
  const mesureId = formData.get("mesureId") || null;
  const photo = formData.get("photo");

  let photoUrl = null;
  if (photo && typeof photo === "object" && photo.size > 0) {
    await fs.mkdir(DOSSIER_UPLOADS, { recursive: true });
    const extension = (photo.name?.split(".").pop() || "jpg").toLowerCase();
    const nomFichier = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    await fs.writeFile(path.join(DOSSIER_UPLOADS, nomFichier), buffer);
    photoUrl = `/api/uploads/${nomFichier}`;
  }

  const entree = await prisma.journalEntry.create({
    data: { texte, sommeilHeures, mesureId: mesureId || null, photoUrl },
  });

  return NextResponse.json({ entree });
}
