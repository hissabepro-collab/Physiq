// Génère les icônes PWA (manifest + apple-touch-icon) à partir d'un logo SVG simple.
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

function logoSvg(size, { padded = false } = {}) {
  const bg = "#050a0e";
  const ring = "#4de8ff";
  const pad = padded ? size * 0.18 : 0;
  const s = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = s * 0.32;
  const dotR = r * 0.42;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ring}" stroke-width="${size * 0.035}"/>
    <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${ring}"/>
  </svg>`;
}

const cibles = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180, padded: true },
  { name: "favicon-32.png", size: 32 },
];

await fs.mkdir(OUT_DIR, { recursive: true });

for (const c of cibles) {
  const svg = logoSvg(c.size, { padded: c.padded });
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, c.name));
  console.log("✓", c.name);
}
