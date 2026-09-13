# Physiq

Site personnel de suivi de composition corporelle, alimenté par les rapports
PDF de la machine Visbody. Next.js + Tailwind CSS + Prisma.

## Développement local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Mot de passe défini dans
`.env` (voir `.env.example`).

La base de données locale est un simple fichier SQLite (`prisma/dev.db`),
jamais commité. Pour importer des rapports Visbody en masse en local :

```bash
node scripts/seed-from-pdfs.mjs "chemin/vers/rapport1.pdf" "chemin/vers/rapport2.pdf"
```

Ou directement depuis l'écran "Nouveau scan" du site.

## Structure

- `src/app/(app)/` — écrans protégés par mot de passe (accueil, scan,
  historique, comparer, objectifs, journal, paramètres)
- `src/app/api/` — routes API (parsing PDF, mesures, objectifs, journal, export)
- `src/lib/parseVisbodyPdf.js` — parseur bilingue (EN/FR) des rapports Visbody
- `src/lib/rang.js` — calcul du rang (paliers + XP) à partir du score Visbody
- `prisma/schema.prisma` — modèle de données

## Déployer en ligne (Vercel, gratuit)

1. **Créer une base Postgres gratuite** sur [Neon](https://neon.tech) ou
   [Supabase](https://supabase.com). Récupère la chaîne de connexion
   (`postgresql://...`).
2. Dans `prisma/schema.prisma`, change `provider = "sqlite"` en
   `provider = "postgresql"`.
3. Pousse le code sur un dépôt GitHub (le `.gitignore` exclut déjà tout
   secret et toute donnée personnelle — `.env`, `prisma/dev.db`,
   `data/uploads/`).
4. Sur [vercel.com](https://vercel.com), crée un compte (gratuit, connexion
   possible directement avec GitHub), puis "Add New Project" → importe le
   dépôt.
5. Dans les réglages du projet Vercel, onglet "Environment Variables",
   ajoute :
   - `DATABASE_URL` → la chaîne de connexion Postgres de l'étape 1
   - `SITE_PASSWORD` → un mot de passe temporaire (tu pourras le changer
     depuis Paramètres une fois connecté)
   - `SESSION_SECRET` → une valeur aléatoire longue, générée avec
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
6. Avant le premier déploiement (ou juste après), applique le schéma à la
   base de production :
   ```bash
   DATABASE_URL="ta_chaine_postgres" npx prisma migrate deploy
   ```
7. Déploie. Le site est accessible sur `ton-projet.vercel.app` (gratuit).

### Limite à connaître : les photos du journal

Les photos ajoutées dans le Journal sont actuellement stockées sur le disque
local du serveur (`data/uploads/`). En développement, ça fonctionne très
bien. **En production sur Vercel (environnement serverless), les fichiers
écrits sur disque ne sont pas conservés entre les requêtes** — les photos
uploadées une fois déployé risquent de disparaître. Si tu veux garder cette
fonctionnalité en ligne, il faudra brancher un stockage externe comme
[Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (gratuit pour un
usage personnel) à la place de l'écriture disque dans
`src/app/api/journal/route.js`.

### Installer comme application

Une fois le site déployé (HTTPS requis), ouvre-le sur ton téléphone : Chrome
Android proposera "Ajouter à l'écran d'accueil" automatiquement, et sur
iPhone (Safari) via le bouton de partage → "Sur l'écran d'accueil".
