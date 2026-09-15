"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Bascule de l'écran de démarrage statique vers le tableau de bord.
//
// On passe par une navigation côté client plutôt que par window.location :
// le navigateur reste sur la page déjà peinte (fond sombre + logo) pendant
// qu'il récupère le tableau de bord, au lieu de vider l'écran pour attendre
// une nouvelle page. C'est ce qui remplace l'écran blanc par l'écran de marque.
export default function RedirectionAccueil() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
