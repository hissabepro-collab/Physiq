// Premier écran envoyé à l'ouverture de l'app, avant que l'accueil soit prêt.
//
// POURQUOI (vidéo iPhone analysée image par image, 12/11/2026) : iOS retire
// son écran de démarrage dès que la page commence à arriver, puis fond vers le
// navigateur. Si la page ne s'est pas encore dessinée, ce fondu part vers le
// fond BLANC vide du navigateur : 3 images de gris de plus en plus clair, le
// « flash blanc ». Avec ce fichier, Next envoie tout de suite cet écran noir,
// et la vraie page arrive ensuite par-dessus.
//
// Le rectangle SVG plein écran compte comme du contenu visible pour Safari :
// sans lui, une page « vide » (simple fond) n'est pas dessinée tout de suite
// et le blanc revient. Même couleur que l'écran de démarrage (#050a0e).
//
// Placé à la racine, il couvre aussi la barre de navigation : l'app apparaît
// d'un bloc, sans la barre seule d'abord. Pendant la navigation entre onglets,
// Next garde la page affichée et ne montre pas cet écran.
export default function Chargement() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "#050a0e" }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <rect width="100%" height="100%" fill="#050a0e" />
      </svg>
      <style>{`
        .attente-lancement{position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#8fe3ff;box-shadow:0 0 14px #8fe3ff;opacity:0;animation:attente-apparait .4s 1.2s ease-out forwards,attente-pulse 1.4s 1.6s ease-in-out infinite}
        @keyframes attente-apparait{to{opacity:.9}}
        @keyframes attente-pulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(.55);opacity:.4}}
      `}</style>
      <div className="attente-lancement" />
    </div>
  );
}
