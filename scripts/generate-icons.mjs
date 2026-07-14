// Generates public/icons/*.png: the Ambica triangle standing on a wooden
// pallet — frameless, on kraft. Logo source: scripts/ambica-logo.png.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";

const LOGO_RATIO = 3134 / 3581; // source height / width

const logoData = `data:image/png;base64,${(
  await readFile("scripts/ambica-logo.png")
).toString("base64")}`;

// Theme tokens (app/globals.css)
const KRAFT = "#ece0c3";
const INK = "#26190e";
const STAMP = "#bb3a06";

// Big triangle logo resting on a compact pallet (orange top deck, ink
// blocks + bottom deck — same side profile as the board's theme).
function iconSvg({ maskable }) {
  // Maskable icons must keep the glyph inside the central safe zone.
  const scale = maskable ? 0.8 : 1;
  const logoH = 185;
  const logoW = Math.round(logoH / LOGO_RATIO);
  return `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${KRAFT}"/>
  <g transform="translate(256 222) scale(${scale}) translate(-256 -256)">
    <image href="${logoData}" x="${256 - logoW / 2}" y="${332 - logoH}" width="${logoW}" height="${logoH}"/>
    <rect x="88" y="334" width="336" height="42" rx="10" fill="${STAMP}"/>
    <rect x="88" y="390" width="60" height="34" rx="8" fill="${INK}"/>
    <rect x="226" y="390" width="60" height="34" rx="8" fill="${INK}"/>
    <rect x="364" y="390" width="60" height="34" rx="8" fill="${INK}"/>
    <rect x="88" y="438" width="336" height="42" rx="10" fill="${INK}"/>
  </g>
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const plain = Buffer.from(iconSvg({ maskable: false }));
const maskable = Buffer.from(iconSvg({ maskable: true }));

await sharp(plain).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(plain).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");

console.log("icons written to public/icons/");
