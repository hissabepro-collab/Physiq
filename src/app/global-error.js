"use client";

// Dernier filet : une erreur dans la mise en page racine elle-même. Elle
// remplace tout le document, donc elle porte son propre fond sombre en dur
// (pas de feuille de style garantie à ce stade). Jamais de page blanche.
export default function ErreurGlobale({ reset }) {
  return (
    <html lang="fr" style={{ backgroundColor: "#050a0e", colorScheme: "dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#050a0e",
          color: "#f1f4f8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Physiq n&apos;a pas pu s&apos;ouvrir.</p>
        <p style={{ fontSize: 12, color: "#8b93a3", margin: "6px 0 20px" }}>Le serveur se réveille sans doute.</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            height: 44,
            padding: "0 20px",
            borderRadius: 999,
            border: "1px solid rgba(143,227,255,0.6)",
            background: "rgba(143,227,255,0.1)",
            color: "#f1f4f8",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
