"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold print:hidden"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
