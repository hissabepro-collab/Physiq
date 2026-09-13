/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse (via pdfjs-dist) utilise des chemins de worker dynamiques que
  // le bundler de Next.js ne résout pas correctement — on le laisse tourner
  // en require() Node natif à la place.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
