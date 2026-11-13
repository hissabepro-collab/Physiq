// Quel service d'IA répond au coach, selon les clés présentes sur le serveur.
// Gemini d'abord (offre gratuite, choix de l'utilisateur le 13/11/2026),
// puis Claude ; sans clé, la page passe en mode « copier vers Claude ».
export function fournisseurCoach() {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}
