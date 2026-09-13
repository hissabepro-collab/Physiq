import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function DELETE(request, { params }) {
  const { id } = await params;
  const entree = await prisma.journalEntry.delete({ where: { id } });

  if (entree.photoUrl?.startsWith("/api/uploads/")) {
    const nomFichier = entree.photoUrl.replace("/api/uploads/", "");
    await fs.unlink(path.join(process.cwd(), "data", "uploads", nomFichier)).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
