// Écran de marque affiché pendant les temps d'attente.
//
// Il reproduit volontairement, au pixel près, l'image de démarrage générée
// par scripts/generate-splash.mjs : au lancement de l'app, iOS affiche
// d'abord ce PNG, puis la page /demarrage, puis cet écran pendant que le
// tableau de bord se charge. Comme les trois sont identiques, l'utilisateur
// ne voit qu'une seule image immobile du premier au dernier instant — plus de
// clignotement blanc ni de squelette gris entre les étapes.
//
// Si tu modifies les proportions ici, reporte-les dans le script (et
// inversement), sinon la continuité se casse.

const ACCENT = "#4de8ff";
const FOND = "#050a0e";

// Le script dessine avec r = 10 % du plus petit côté, soit ~40 points sur un
// téléphone. Toutes les dimensions ci-dessous en découlent.
const R = 40;

export default function EcranLogo() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ backgroundColor: FOND }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: R * 4.4, height: R * 4.4 }}
      >
        {/* lueur large, très discrète */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)`, opacity: 0.06 }}
        />
        {/* anneau */}
        <div
          className="absolute rounded-full"
          style={{ width: R * 2, height: R * 2, border: `${R * 0.09}px solid ${ACCENT}` }}
        />
        {/* noyau plein */}
        <div
          className="absolute rounded-full"
          style={{ width: R * 0.84, height: R * 0.84, background: ACCENT }}
        />
      </div>

      <div
        className="font-display font-bold"
        style={{ fontSize: R * 0.42, letterSpacing: R * 0.08, color: ACCENT, opacity: 0.85, marginTop: 4 }}
      >
        PHYSIQ
      </div>
    </div>
  );
}
