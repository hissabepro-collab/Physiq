"use client";

import { useRouter } from "next/navigation";

/**
 * À appeler après CHAQUE écriture réussie — enregistrement, modification,
 * suppression.
 *
 * Next garde en mémoire les pages déjà visitées pour que la navigation soit
 * instantanée, et les liens de la barre les préchargent, ce qui porte cette
 * mémoire à cinq minutes. Sans purge, on enregistrait son bilan dans le
 * Journal puis on revenait sur l'accueil… qui affichait encore les chiffres
 * d'avant, parfois plusieurs minutes durant. De quoi croire que rien n'avait
 * été enregistré.
 *
 * Mettre à jour l'état local de la page courante ne suffit pas : ce sont les
 * AUTRES pages, rendues côté serveur, qu'il faut invalider.
 */
export function useRafraichir() {
  const router = useRouter();
  return () => router.refresh();
}
