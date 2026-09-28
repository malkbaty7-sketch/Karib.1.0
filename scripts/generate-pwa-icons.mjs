import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function generatePng(width, height, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4), height(4), bitDepth(1)=8, colorType(1)=6 (RGBA), comp(1)=0, filter(1)=0, interlace(1)=0
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient: Rich amber-brown (#1c1917 to #d97706)
      const gradFactor = (y / height) * 0.6 + (x / width) * 0.4;
      let r = Math.round(30 + gradFactor * 160);
      let g = Math.round(20 + gradFactor * 90);
      let b = Math.round(15 + gradFactor * 10);
      let a = 255;

      if (!isMaskable) {
        // Rounded squircle mask
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        const squircle = Math.pow(Math.abs(dx) / (width * 0.48), 4) + Math.pow(Math.abs(dy) / (height * 0.48), 4);
        if (squircle > 1.05) {
          a = 0;
        } else if (squircle > 0.95) {
          a = Math.round(255 * (1 - (squircle - 0.95) / 0.1));
        }
      }

      // Golden book / emblem in the center safe zone
      // Central icon elements: Open manuscript book & calligraphy quill
      const bookDistY = Math.abs(y - (cy + height * 0.08));
      const bookDistX = Math.abs(x - cx);

      // Open book pages shape
      if (bookDistY < height * 0.22 && bookDistX < width * 0.28 && a > 0) {
        // Curve of open pages
        const pageCurve = Math.sin((bookDistX / (width * 0.28)) * Math.PI) * (height * 0.06);
        const spine = Math.abs(x - cx) < width * 0.02;
        if (!spine && (y > cy - height * 0.12 + pageCurve) && (y < cy + height * 0.24 + pageCurve)) {
          // Page color: warm parchment / golden ivory
          r = 254;
          g = 243;
          b = 199;
          if ((y % (Math.round(height * 0.06))) < 2 && bookDistX > width * 0.06) {
            // Text line accents in pages
            r = 217;
            g = 119;
            b = 6;
          }
        }
      }

      // Golden Feather Quill angling across
      const quillAngle = (x - cx) * 0.7 + (y - (cy - height * 0.15));
      const quillDist = Math.abs((x - cx) - (y - cy) * 0.5);
      if (quillDist < width * 0.05 && y > cy - height * 0.32 && y < cy + height * 0.15 && a > 0) {
        // Gold feather color
        r = 245;
        g = 158;
        b = 11;
        // Quill spine
        if (quillDist < width * 0.015) {
          r = 254;
          g = 240;
          b = 138;
        }
      }

      rawData[offset++] = Math.min(255, Math.max(0, r));
      rawData[offset++] = Math.min(255, Math.max(0, g));
      rawData[offset++] = Math.min(255, Math.max(0, b));
      rawData[offset++] = Math.min(255, Math.max(0, a));
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate PNGs
console.log('Generating 192x192 PNG...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));

console.log('Generating 512x512 PNG...');
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));

console.log('Generating 512x512 Maskable PNG...');
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));

console.log('Generating 180x180 Apple Touch Icon...');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

// 2. Generate SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917" />
      <stop offset="50%" stop-color="#292524" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="page" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#fef3c7" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Base App Tile -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="url(#gold)" stroke-width="3" opacity="0.4" />

  <!-- Open Manuscript Book -->
  <g filter="url(#shadow)" transform="translate(0, 16)">
    <!-- Left Page -->
    <path d="M 120 330 C 180 320, 230 345, 252 355 L 252 205 C 230 195, 180 170, 120 180 Z" fill="url(#page)" />
    <!-- Right Page -->
    <path d="M 392 330 C 332 320, 282 345, 260 355 L 260 205 C 282 195, 332 170, 392 180 Z" fill="url(#page)" />
    <!-- Spine binding -->
    <rect x="252" y="195" width="8" height="165" rx="4" fill="#d97706" />
    <!-- Subtle lines on pages -->
    <line x1="145" y1="215" x2="225" y2="222" stroke="#d97706" stroke-width="3" stroke-linecap="round" opacity="0.6" />
    <line x1="145" y1="245" x2="225" y2="252" stroke="#d97706" stroke-width="3" stroke-linecap="round" opacity="0.6" />
    <line x1="145" y1="275" x2="215" y2="282" stroke="#d97706" stroke-width="3" stroke-linecap="round" opacity="0.6" />

    <line x1="287" y1="222" x2="367" y2="215" stroke="#d97706" stroke-width="3" stroke-linecap="round" opacity="0.6" />
    <line x1="287" y1="252" x2="367" y2="245" stroke="#d97706" stroke-width="3" stroke-linecap="round" opacity="0.6" />
    <line x1="297" y1="282" x2="367" y2="275" stroke="#d97706" stroke-width="3" stroke-linecap="round" opacity="0.6" />
  </g>

  <!-- Golden Calligraphy Feather Quill -->
  <g filter="url(#shadow)" transform="rotate(-28 256 220)">
    <path d="M 256 80 C 275 140, 295 210, 275 270 C 265 295, 256 315, 256 325 C 256 315, 247 295, 237 270 C 217 210, 237 140, 256 80 Z" fill="url(#gold)" />
    <!-- Shaft -->
    <line x1="256" y1="70" x2="256" y2="350" stroke="#fef08a" stroke-width="4" stroke-linecap="round" />
    <polygon points="256,350 252,365 260,365" fill="#fef08a" />
  </g>

  <!-- Elegant Arabic typography flourish: "كاتب" -->
  <text x="256" y="440" font-family="'Cairo', 'Tajawal', sans-serif" font-size="52" font-weight="800" text-anchor="middle" fill="url(#gold)" letter-spacing="2">كاتب</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
console.log('Generated icon.svg successfully.');
