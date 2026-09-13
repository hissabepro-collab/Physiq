import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function POST() {
  await prisma.journalEntry.deleteMany();
  await prisma.objectif.deleteMany();
  await prisma.mesure.deleteMany();
  await prisma.profil.deleteMany();

  await fs.rm(path.join(process.cwd(), "data", "uploads"), { recursive: true, force: true });

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
