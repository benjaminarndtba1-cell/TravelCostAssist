/**
 * App Icon Generator für TravelCostAssist
 * Design: Blauer Hintergrund, weißes Flugzeug (Draufsicht) + Euro-Badge
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const PRIMARY = { r: 21, g: 101, b: 192 };
const WHITE = { r: 255, g: 255, b: 255 };

function createPNG(w, h) {
  return new PNG({ width: w, height: h, filterType: -1 });
}

function setPixel(png, x, y, c, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = c.r; png.data[i+1] = c.g; png.data[i+2] = c.b; png.data[i+3] = a;
}

function blendPixel(png, x, y, c, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  const f = a / 255;
  png.data[i] = Math.round(c.r * f + png.data[i] * (1 - f));
  png.data[i+1] = Math.round(c.g * f + png.data[i+1] * (1 - f));
  png.data[i+2] = Math.round(c.b * f + png.data[i+2] * (1 - f));
  png.data[i+3] = Math.min(255, Math.round((f + png.data[i+3]/255 * (1-f)) * 255));
}

function fillCircleAA(png, cx, cy, r, c, alpha = 255) {
  for (let y = Math.floor(cy-r-1); y <= Math.ceil(cy+r+1); y++) {
    for (let x = Math.floor(cx-r-1); x <= Math.ceil(cx+r+1); x++) {
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (d <= r + 0.5) {
        const aa = Math.min(1, r - d + 0.5);
        blendPixel(png, x, y, c, Math.round(alpha * aa));
      }
    }
  }
}

function fillRoundedRect(png, x, y, w, h, r, c, alpha = 255) {
  for (let py = Math.floor(y); py < Math.ceil(y+h); py++) {
    for (let px = Math.floor(x); px < Math.ceil(x+w); px++) {
      let inside = true;
      // Check corners
      const corners = [[x+r, y+r], [x+w-r, y+r], [x+r, y+h-r], [x+w-r, y+h-r]];
      if (px < x+r && py < y+r) { inside = Math.sqrt((px-x-r)**2 + (py-y-r)**2) <= r + 0.5; }
      else if (px > x+w-r && py < y+r) { inside = Math.sqrt((px-x-w+r)**2 + (py-y-r)**2) <= r + 0.5; }
      else if (px < x+r && py > y+h-r) { inside = Math.sqrt((px-x-r)**2 + (py-y-h+r)**2) <= r + 0.5; }
      else if (px > x+w-r && py > y+h-r) { inside = Math.sqrt((px-x-w+r)**2 + (py-y-h+r)**2) <= r + 0.5; }
      if (inside) blendPixel(png, px, py, c, alpha);
    }
  }
}

// Fill a convex polygon defined by points [{x,y}]
function fillPolygon(png, points, color, alpha = 255) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of points) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  minY = Math.floor(minY); maxY = Math.ceil(maxY);

  for (let y = minY; y <= maxY; y++) {
    const intersections = [];
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p1 = points[i], p2 = points[j];
      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        const t = (y - p1.y) / (p2.y - p1.y);
        intersections.push(p1.x + t * (p2.x - p1.x));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2) {
      for (let x = Math.floor(intersections[i]); x <= Math.ceil(intersections[i+1]); x++) {
        blendPixel(png, x, y, color, alpha);
      }
    }
  }
}

// Draw a top-down airplane (rotated 45 degrees, flying upper-right)
function drawTopDownAirplane(png, cx, cy, size, color) {
  const s = size;
  // Rotation angle: ~-30 degrees (flying upper-right)
  const angle = -Math.PI / 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  function rot(x, y) {
    return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos };
  }

  // Fuselage (elongated shape)
  const fuseW = s * 0.06;
  const fuseLen = s * 0.45;
  const fuselage = [
    rot(-fuseW, -fuseLen),    // top-left
    rot(0, -fuseLen - s*0.04), // nose tip
    rot(fuseW, -fuseLen),     // top-right
    rot(fuseW, fuseLen * 0.7),// bottom-right
    rot(0, fuseLen * 0.8),    // tail tip
    rot(-fuseW, fuseLen * 0.7),// bottom-left
  ];
  fillPolygon(png, fuselage, color);

  // Main wings (swept back, wide)
  const wingSpan = s * 0.42;
  const wingChord = s * 0.12;
  // Right wing
  const rWing = [
    rot(fuseW * 0.5, -s * 0.05),
    rot(wingSpan, s * 0.08),
    rot(wingSpan, s * 0.08 + wingChord * 0.4),
    rot(fuseW * 0.5, s * 0.05 + wingChord * 0.3),
  ];
  fillPolygon(png, rWing, color);
  // Left wing
  const lWing = [
    rot(-fuseW * 0.5, -s * 0.05),
    rot(-wingSpan, s * 0.08),
    rot(-wingSpan, s * 0.08 + wingChord * 0.4),
    rot(-fuseW * 0.5, s * 0.05 + wingChord * 0.3),
  ];
  fillPolygon(png, lWing, color);

  // Tail wings (smaller, at the back)
  const tailSpan = s * 0.16;
  const tailY = fuseLen * 0.55;
  // Right tail
  const rTail = [
    rot(fuseW * 0.3, tailY - s * 0.01),
    rot(tailSpan, tailY + s * 0.04),
    rot(tailSpan, tailY + s * 0.07),
    rot(fuseW * 0.3, tailY + s * 0.04),
  ];
  fillPolygon(png, rTail, color);
  // Left tail
  const lTail = [
    rot(-fuseW * 0.3, tailY - s * 0.01),
    rot(-tailSpan, tailY + s * 0.04),
    rot(-tailSpan, tailY + s * 0.07),
    rot(-fuseW * 0.3, tailY + s * 0.04),
  ];
  fillPolygon(png, lTail, color);
}

// Draw Euro sign using arc + bars
function drawEuroSymbol(png, cx, cy, size, color) {
  const r = size * 0.32;
  const thick = size * 0.065;

  // C-shape arc
  for (let a = 0.6; a < 5.7; a += 0.005) {
    const x = cx + Math.cos(a) * r;
    const y = cy - Math.sin(a) * r;
    fillCircleAA(png, x, y, thick, color);
  }

  // Two horizontal bars
  const barW = r * 1.1;
  const barH = thick * 1.4;
  fillRoundedRect(png, cx - barW * 0.6, cy - r * 0.24 - barH/2, barW, barH, barH/3, color);
  fillRoundedRect(png, cx - barW * 0.6, cy + r * 0.12 - barH/2, barW, barH, barH/3, color);
}

function generateIcon(size, outputPath, isAdaptive) {
  const png = createPNG(size, size);
  const cx = size / 2;
  const cy = size / 2;

  // Clear to transparent
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      setPixel(png, x, y, {r:0,g:0,b:0}, 0);

  if (!isAdaptive) {
    // Blue rounded square background
    fillRoundedRect(png, 0, 0, size, size, size * 0.2, PRIMARY);
    // Subtle gradient (darker at bottom)
    for (let y = Math.floor(size * 0.4); y < size; y++) {
      const a = Math.floor(((y - size * 0.4) / (size * 0.6)) * 35);
      for (let x = 0; x < size; x++) blendPixel(png, x, y, {r:0,g:0,b:0}, a);
    }
  }

  const fgColor = isAdaptive ? WHITE : WHITE;

  // Airplane (centered a bit above middle)
  drawTopDownAirplane(png, cx - size * 0.02, cy - size * 0.06, size * 0.75, fgColor);

  // Euro badge (bottom-right)
  const euroCx = cx + size * 0.2;
  const euroCy = cy + size * 0.22;
  const euroR = size * 0.13;

  if (!isAdaptive) {
    fillCircleAA(png, euroCx, euroCy, euroR + size * 0.008, WHITE, 40);
  }
  fillCircleAA(png, euroCx, euroCy, euroR, WHITE);
  drawEuroSymbol(png, euroCx, euroCy, euroR * 1.8, PRIMARY);

  fs.writeFileSync(outputPath, PNG.sync.write(png));
  console.log(`Created: ${outputPath} (${size}x${size})`);
}

function generateSplash(size, outputPath) {
  const png = createPNG(size, size);
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      setPixel(png, x, y, {r:0,g:0,b:0}, 0);

  // White circle background
  fillCircleAA(png, cx, cy, size * 0.4, WHITE);

  // Airplane
  drawTopDownAirplane(png, cx - size * 0.01, cy - size * 0.04, size * 0.6, PRIMARY);

  // Euro badge
  const euroCx = cx + size * 0.14;
  const euroCy = cy + size * 0.17;
  const euroR = size * 0.09;
  fillCircleAA(png, euroCx, euroCy, euroR, PRIMARY);
  drawEuroSymbol(png, euroCx, euroCy, euroR * 1.6, WHITE);

  fs.writeFileSync(outputPath, PNG.sync.write(png));
  console.log(`Created: ${outputPath} (${size}x${size})`);
}

const assetsDir = path.join(__dirname, 'assets');
console.log('Generating TravelCostAssist app icons...\n');

generateIcon(1024, path.join(assetsDir, 'icon.png'), false);
generateIcon(1024, path.join(assetsDir, 'adaptive-icon.png'), true);
generateSplash(512, path.join(assetsDir, 'splash-icon.png'));
generateIcon(48, path.join(assetsDir, 'favicon.png'), false);

console.log('\nDone!');
