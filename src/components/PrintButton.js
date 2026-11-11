"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center rounded-full border border-accent/60 bg-accent-soft px-4 py-2 text-sm font-semibold print:hidden"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
