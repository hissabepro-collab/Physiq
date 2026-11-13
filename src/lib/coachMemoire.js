import { prisma } from "@/lib/db";

// Mémoire du coach : notes durables sur Issa (préférences, contraintes,
// blessures, horaires, corrections de style), relues à chaque question.
// Écrites par le coach (outil « memoriser ») ou par Issa depuis la page Coach.

export const MAX_NOTES = 60;
const MAX_CARACTERES = 300;

export async function lireNotes() {
  return prisma.coachNote.findMany({ orderBy: { createdAt: "asc" }, take: MAX_NOTES });
}

function normaliser(t) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Ajoute une note, sauf doublon exact. Renvoie { note } ou { erreur }. */
export async function ajouterNote(texteBrut, source = "coach") {
  const texte = String(texteBrut ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES);
  if (texte.length < 3) return { erreur: "Note vide." };
  const notes = await lireNotes();
  const cle = normaliser(texte);
  const doublon = notes.find((n) => normaliser(n.texte) === cle);
  if (doublon) return { note: doublon, deja: true };
  if (notes.length >= MAX_NOTES) return { erreur: `Mémoire pleine (${MAX_NOTES} notes) : Issa doit en supprimer depuis la page Coach.` };
  const note = await prisma.coachNote.create({ data: { texte, source: source === "utilisateur" ? "utilisateur" : "coach" } });
  return { note };
}

export async function supprimerNote(id) {
  await prisma.coachNote.delete({ where: { id: String(id) } });
}
