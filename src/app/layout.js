import { Space_Grotesk, Manrope } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import ImmersiveBackground from "@/components/ImmersiveBackground";
import { ECRANS_DEMARRAGE } from "@/lib/ecransDemarrage";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Physiq",
  description: "Suivi personnel de composition corporelle",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // "black" et non "black-translucent" : en translucide, la vue web passe
    // sous la barre d'état, et cette zone reste non peinte pendant le
    // démarrage — c'est un bandeau blanc en haut de l'écran au lancement.
    // En "black", iOS réserve la barre d'état et la remplit lui-même.
    statusBarStyle: "black",
    title: "Physiq",
  },
  // Next n'émet que `mobile-web-app-capable`, le nom standardisé. iOS, lui,
  // conditionne encore l'affichage des écrans de démarrage à la balise
  // préfixée `apple-` : sans elle, il ignore purement et simplement les
  // `apple-touch-startup-image` et lance l'app sur du blanc.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    // Écrans de démarrage iOS : sans eux, toucher l'icône affiche un écran
    // blanc le temps que le moteur web démarre. iOS exige une image aux
    // dimensions exactes de l'appareil, d'où une entrée par modèle.
    other: ECRANS_DEMARRAGE.map(({ media, url }) => ({
      rel: "apple-touch-startup-image",
      media,
      url,
    })),
  },
};

export const viewport = {
  themeColor: "#050a0e",
  viewportFit: "cover",
  // Déclaré en balise et pas seulement en style sur <html> : c'est ce qui fixe
  // la couleur par défaut de la toile du navigateur, celle qu'il peint avant
  // d'avoir lu la moindre feuille de style. Sans elle, cette toile est blanche
  // — d'où l'image blanche fugace au tout premier instant du lancement.
  colorScheme: "dark",
};

// La couleur de fond est écrite en dur dans le document, et non seulement
// dans la feuille de style : tant qu'un fichier CSS externe n'est pas chargé,
// le navigateur peint du blanc par défaut. Posée ici, elle s'applique dès le
// tout premier octet de HTML, avant toute ressource.
const FOND = "#050a0e";

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${manrope.variable} h-full antialiased`}
      style={{ backgroundColor: FOND, colorScheme: "dark" }}
    >
      <body
        className="min-h-full flex flex-col font-sans text-foreground"
        style={{ backgroundColor: FOND }}
      >
        <ImmersiveBackground />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
