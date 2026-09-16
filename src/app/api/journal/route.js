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
  const noteEtoiles = formData.get("noteEtoiles") ? Number(formData.get("noteEtoiles")) : null;
  const mesureId = formData.get("mesureId") || null;
  const semaineIso = formData.get("semaineIso") || null;
  const photo = formData.get("photo");

  const listeJours = (champ) => {
    const brut = formData.get(champ);
    if (!brut) return null;
    try {
      const parsed = JSON.parse(brut);
      return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : null;
    } catch {
      return null;
    }
  };
  const joursEntraines = listeJours("joursEntraines");
  const joursDiete = listeJours("joursDiete");

  // Sommeil : 7 cases, une par nuit (0=lundi). Une nuit non renseignée reste
  // null et ne pèse pas sur la moyenne — dormir mal n'est pas la même chose
  // que ne pas avoir noté.
  const heuresSommeil = (() => {
    const brut = formData.get("heuresSommeil");
    if (!brut) return null;
    try {
      const parsed = JSON.parse(brut);
      if (!Array.isArray(parsed)) return null;
      return Array.from({ length: 7 }, (_, i) => {
        const n = Number(parsed[i]);
        return Number.isFinite(n) && n > 0 && n <= 24 ? n : null;
      });
    } catch {
      return null;
    }
  })();

  const nuitsRenseignees = (heuresSommeil ?? []).filter((n) => n != null);
  const sommeilHeures = nuitsRenseignees.length
    ? Math.round((nuitsRenseignees.reduce((a, b) => a + b, 0) / nuitsRenseignees.length) * 100) / 100
    : null;

  let photoUrl = null;
  if (photo && typeof photo === "object" && photo.size > 0) {
    await fs.mkdir(DOSSIER_UPLOADS, { recursive: true });
    const extension = (photo.name?.split(".").pop() || "jpg").toLowerCase();
    const nomFichier = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    await fs.writeFile(path.join(DOSSIER_UPLOADS, nomFichier), buffer);
    photoUrl = `/api/uploads/${nomFichier}`;
  }

  const donnees = {
    texte,
    heuresSommeil,
    sommeilHeures,
    noteEtoiles,
    semaineIso,
    joursEntraines,
    joursDiete,
    mesureId: mesureId || null,
  };
  // Une photo absente ne doit pas effacer celle déjà enregistrée.
  if (photoUrl) donnees.photoUrl = photoUrl;

  // Un seul bilan par semaine : on complète celui qui existe déjà.
  const existante = semaineIso
    ? await prisma.journalEntry.findFirst({ where: { semaineIso } })
    : null;

  const entree = existante
    ? await prisma.journalEntry.update({ where: { id: existante.id }, data: donnees })
    : await prisma.journalEntry.create({ data: { ...donnees, photoUrl } });

  return NextResponse.json({ entree });
}
