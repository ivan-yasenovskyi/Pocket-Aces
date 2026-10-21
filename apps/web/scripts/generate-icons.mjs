import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const file = (path) => fileURLToPath(new URL(path, root));
const logo = file("public/images/logo.webp");
const NAVY = "#02336b";

async function icon(size, { round = true } = {}) {
  const pad = Math.round(size * 0.08);
  const inner = await sharp(logo).resize(size - pad * 2, size - pad * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const shape = round
    ? `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${NAVY}"/></svg>`
    : `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${NAVY}"/></svg>`;
  return sharp(Buffer.from(shape)).composite([{ input: inner, gravity: "center" }]).png().toBuffer();
}

function ico(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size >= 256 ? 0 : size, 6);
  header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

async function openGraph() {
  const width = 1200;
  const height = 630;
  const background = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#02336b"/>
          <stop offset="0.58" stop-color="#0a5ba8"/>
          <stop offset="1" stop-color="#1a9ed5"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
      <text x="80" y="430" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="120" fill="#ffffff">POCKET</text>
      <text x="80" y="545" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="120" fill="#ffffff">ACES</text>
      <text x="84" y="595" font-family="Arial, sans-serif" font-size="30" fill="#ffc21f">Drużyna siatkarska · Łódź</text>
    </svg>`;
  const topo = await sharp(file("public/images/topo.svg"), { density: 72 }).resize(width, width).extract({ left: 0, top: 0, width, height: height }).ensureAlpha(0.35).toBuffer();
  const badge = await sharp(logo).resize(220, 220, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const player = await sharp(file("public/images/player-10.webp")).resize({ height: 600 }).toBuffer();
  return sharp(Buffer.from(background))
    .composite([
      { input: topo, blend: "over" },
      { input: badge, left: 80, top: 60 },
      { input: player, left: 1200 - 470, top: 630 - 600 },
    ])
    .png()
    .toBuffer();
}

const icon512 = await icon(512);
await writeFile(file("src/app/icon.png"), icon512);
await writeFile(file("src/app/apple-icon.png"), await icon(180, { round: false }));
await writeFile(file("src/app/favicon.ico"), ico(await icon(48), 48));
await writeFile(file("src/app/opengraph-image.png"), await openGraph());
await writeFile(file("src/app/opengraph-image.alt.txt"), "Pocket Aces — drużyna siatkarska z Łodzi");
console.log("Gotowe: favicon.ico, icon.png, apple-icon.png, opengraph-image.png");
