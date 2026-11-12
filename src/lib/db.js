import { PrismaClient } from "@prisma/client";

// Évite de recréer une connexion à chaque rechargement à chaud en développement.
const globalForPrisma = globalThis;

// Erreurs de connexion passagères : la base Neon s'endort après 5 minutes
// sans activité (offre gratuite) et met un moment à se réveiller. Sans
// nouvelle tentative, la première requête après une pause échouait et
// l'utilisateur voyait une page d'erreur au lancement (12/11/2026).
const ERREURS_PASSAGERES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const TENTATIVES = 4;
// Budget total : au-delà, on laisse l'erreur remonter vers la page d'erreur
// sombre (qui réessaie elle-même) plutôt que de laisser l'écran noir de
// longues secondes. Mesuré : sans budget, 12 s d'écran noir en cas de panne.
const BUDGET_MS = 6000;

function creerClient() {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        let derniere;
        const debut = Date.now();
        for (let essai = 0; essai < TENTATIVES; essai++) {
          const reste = BUDGET_MS - (Date.now() - debut);
          if (reste <= 0) break;
          let minuteur;
          try {
            // On n'attend pas une tentative au-delà du budget restant. Le
            // minuteur est annulé dans tous les cas : sinon il rejette plus
            // tard une promesse que personne n'écoute (erreur non gérée qui
            // peut arrêter le processus — constaté le 12/11/2026).
            return await Promise.race([
              query(args),
              new Promise((_, refus) => {
                minuteur = setTimeout(() => refus(new Error("Timed out: budget de connexion dépassé")), reste);
              }),
            ]);
          } catch (e) {
            const code = e?.code ?? e?.errorCode;
            const passagere = ERREURS_PASSAGERES.has(code) || /Can't reach database server|Timed out/i.test(e?.message ?? "");
            if (!passagere || Date.now() - debut > BUDGET_MS) throw e;
            derniere = e;
            await new Promise((r) => setTimeout(r, 400 * (essai + 1)));
          } finally {
            clearTimeout(minuteur);
          }
        }
        throw derniere ?? new Error("Timed out: budget de connexion dépassé");
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
