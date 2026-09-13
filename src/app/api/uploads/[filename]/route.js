import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DOSSIER_UPLOADS = path.join(process.cwd(), "data", "uploads");

const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(request, { params }) {
  const { filename } = await params;

  // Empêche toute tentative de sortir du dossier d'uploads.
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 });
  }

  try {
    const buffer = await fs.readFile(path.join(DOSSIER_UPLOADS, filename));
    const extension = filename.split(".").pop().toLowerCase();
    return new NextResponse(buffer, {
      headers: { "Content-Type": TYPES[extension] || "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
}
