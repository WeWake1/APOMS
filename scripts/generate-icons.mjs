// Generates public/icons/*.png from an inline pallet-glyph SVG.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Side profile of a wooden pallet: top deck, three blocks, bottom deck.
function palletSvg({ maskable }) {
  // Maskable icons must keep the glyph inside the central safe zone.
  const inset = maskable ? 60 : 0;
  return `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#ece0c3"/>
  ${maskable ? "" : '<rect x="14" y="14" width="484" height="484" rx="96" fill="#ece0c3" stroke="#26190e" stroke-width="20"/>'}
  <g transform="translate(${inset / 2} ${inset / 2}) scale(${(512 - inset) / 512})">
    <rect x="96" y="150" width="320" height="48" rx="10" fill="#bb3a06"/>
    <rect x="96" y="216" width="64" height="60" rx="8" fill="#26190e"/>
    <rect x="224" y="216" width="64" height="60" rx="8" fill="#26190e"/>
    <rect x="352" y="216" width="64" height="60" rx="8" fill="#26190e"/>
    <rect x="96" y="294" width="320" height="48" rx="10" fill="#26190e"/>
  </g>
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const plain = Buffer.from(palletSvg({ maskable: false }));
const maskable = Buffer.from(palletSvg({ maskable: true }));

await sharp(plain).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(plain).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");

console.log("icons written to public/icons/");
