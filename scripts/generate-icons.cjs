const sharp = require('sharp');
const path = require('path');

const SIZE = 512;
const BG = '#050505';
const ACCENT = '#f59e0b';

const svg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" rx="${SIZE * 0.2}" fill="${BG}"/>
  <path d="M${SIZE*0.52} ${SIZE*0.12} L${SIZE*0.32} ${SIZE*0.48} L${SIZE*0.48} ${SIZE*0.48} L${SIZE*0.38} ${SIZE*0.88} L${SIZE*0.68} ${SIZE*0.42} L${SIZE*0.52} ${SIZE*0.42} Z" fill="${ACCENT}"/>
  <text x="${SIZE*0.5}" y="${SIZE*0.96}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${SIZE*0.14}" fill="#a1a1aa" letter-spacing="2">GS</text>
</svg>`;

async function generate() {
  const outDir = path.join(__dirname, '..', 'public');
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));
  await sharp(Buffer.from(svg)).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
  console.log('Done: icon-512.png, icon-192.png');
}
generate().catch(console.error);