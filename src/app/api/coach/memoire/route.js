import { NextResponse } from "next/server";
import { lireNotes, ajouterNote, supprimerNote } from "@/lib/coachMemoire";

// Mémoire du coach, vue depuis la page Coach : lire, ajouter, supprimer.
// Protégée par la session comme toutes les routes /api (voir src/proxy.js).

export const dynamic = "force-dynamic";

export async function GET() {
  const notes = await lireNotes();
  return NextResponse.json({ notes: notes.map((n) => ({ id: n.id, texte: n.texte, source: n.source, createdAt: n.createdAt })) });
}

export async function POST(request) {
  let corps;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "requete-invalide" }, { status: 400 });
  }
  const r = await ajouterNote(corps?.texte, "utilisateur");
  if (r.erreur) return NextResponse.json({ erreur: r.erreur }, { status: 400 });
  return NextResponse.json({ note: r.note, deja: Boolean(r.deja) });
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erreur: "requete-invalide" }, { status: 400 });
  try {
    await supprimerNote(id);
  } catch {
    return NextResponse.json({ erreur: "introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
