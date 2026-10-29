// Generates the Keystone favicons, app icons and OpenGraph image from the master SVGs in
// src/assets/brand/ (copies of the owner's brand/ files — never redraw the mark).
// Usage: node scripts/brand-assets.mjs   (needs Playwright's Chromium; the OG image loads Cabin from Google Fonts)
//
// Writes:
//   src/app/favicon.ico              16 / 32 / 48 px, small mark (PNG-in-ICO)
//   src/app/apple-icon.png           180 px, charcoal tile (22 % radius), dark-variant mark
//   public/icons/icon-192.png        192 px, same tile as the apple icon
//   public/icons/icon-512.png        512 px, same tile
//   public/icons/icon-maskable-512.png  512 px full-bleed charcoal, mark inside the 80 % safe zone
//   src/app/opengraph-image.png      1200×630, light background, mark + wordmark + tagline
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BRAND = "src/assets/brand";
const svg = (name) => readFileSync(path.join(BRAND, name), "utf8");
const MARK = svg("keystone-mark.svg");
const MARK_DARK = svg("keystone-mark-dark.svg");
const MARK_SMALL = svg("keystone-mark-small.svg");

const CHARCOAL = "#201F1E";
const LIGHT_BG = "#F6F4F2";

/** An SVG sized to fill its box. */
const fill = (source) => source.replace("<svg ", '<svg width="100%" height="100%" ');

const page = (body, css = "", head = "") => `<!doctype html><html><head>${head}<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  ${css}
</style></head><body>${body}</body></html>`;

/** Tile: rounded square (radius as a fraction of the size) with the mark at `scale` of the size, centred. */
const tile = ({ size, radius, bg, mark, scale }) =>
  page(
    `<div id="t"><div id="m">${fill(mark)}</div></div>`,
    `#t { width: ${size}px; height: ${size}px; background: ${bg}; border-radius: ${radius * size}px;
          display: flex; align-items: center; justify-content: center; }
     #m { width: ${scale * size}px; height: ${scale * size}px; }`,
  );

/** The bare mark, transparent background. */
const bare = (size, mark) =>
  page(`<div id="t">${fill(mark)}</div>`, `#t { width: ${size}px; height: ${size}px; }`);

const og = () =>
  page(
    `<div id="t">
       <div id="lockup"><div id="m">${fill(MARK)}</div><span id="w">Keystone</span></div>
       <p id="tag">Build on solid numbers</p>
     </div>`,
    `#t { width: 1200px; height: 630px; background: ${LIGHT_BG}; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 28px; font-family: Cabin, sans-serif; color: ${CHARCOAL}; }
     #lockup { display: flex; align-items: center; gap: 28px; }
     #m { width: 220px; height: 220px; }
     #w { font-weight: 700; font-size: 150px; letter-spacing: -1.5px; line-height: 1; }
     #tag { margin: 0; font-size: 44px; font-weight: 400; color: #6b645d; }`,
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cabin:wght@400;700&display=block">',
  );

/** Packs PNG images into one .ico (PNG entries, read by every current browser and Windows). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const p = await context.newPage();

  /** Renders `html` and screenshots the #t box (transparent outside it). */
  async function shot(html, { fonts = false } = {}) {
    await p.setContent(html, { waitUntil: fonts ? "networkidle" : "load" });
    if (fonts) {
      const ok = await p.evaluate(async () => {
        const faces = await document.fonts.load('700 150px "Cabin"', "Keystone");
        await document.fonts.ready;
        return faces.length > 0;
      });
      if (!ok) throw new Error("Cabin did not load (needs network for Google Fonts).");
    }
    return p.locator("#t").screenshot({ omitBackground: true });
  }

  const favicon = [];
  for (const size of [16, 32, 48]) favicon.push({ size, png: await shot(bare(size, MARK_SMALL)) });
  writeFileSync("src/app/favicon.ico", ico(favicon));

  const appTile = (size) => tile({ size, radius: 0.22, bg: CHARCOAL, mark: MARK_DARK, scale: 0.78 });
  writeFileSync("src/app/apple-icon.png", await shot(appTile(180)));
  writeFileSync("public/icons/icon-192.png", await shot(appTile(192)));
  writeFileSync("public/icons/icon-512.png", await shot(appTile(512)));
  // Maskable: the platform crops to any shape inside a centred circle of 80 % — keep the mark well within it.
  writeFileSync(
    "public/icons/icon-maskable-512.png",
    await shot(tile({ size: 512, radius: 0, bg: CHARCOAL, mark: MARK_DARK, scale: 0.56 })),
  );
  writeFileSync("src/app/opengraph-image.png", await shot(og(), { fonts: true }));
  console.log("Brand assets written.");
} finally {
  await browser.close();
}
