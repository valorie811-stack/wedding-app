#!/usr/bin/env node
/**
 * Derives every branding image from one source photo.
 *
 * Usage:  node scripts/build-brand-images.mjs <source-image>
 *
 * Kept as a script rather than hand-exported files so the crops are
 * reproducible: swap the source photo, re-run, and every size regenerates
 * with the same framing rules.
 *
 * Outputs
 *   app/icon.png                  favicon (Next file convention)
 *   app/apple-icon.png            iOS home screen
 *   app/opengraph-image.jpg       link-share preview card
 *   public/icon-192.png           PWA manifest, purpose "any"
 *   public/icon-512.png           PWA manifest, purpose "any"
 *   public/icon-maskable-512.png  PWA manifest, purpose "maskable"
 *   public/couple.jpg             login screen
 *
 * Encoding matters here because sw.js serves everything under public/
 * cache-first, so these land on every install. The source is a photograph,
 * which plain PNG stores terribly — the icon set alone was 2.6MB before
 * quantising. Icons stay PNG for launcher compatibility but are palette-
 * quantised; the share card is JPEG, where PNG bought nothing (1.4MB -> 84KB).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: node scripts/build-brand-images.mjs <source-image>");
  process.exit(1);
}

// Maskable icons are cropped to a circle/squircle; only the middle ~80% is
// guaranteed visible. Rather than gamble on the crop, inset the photo into a
// solid field that matches the manifest theme_color.
const SAFE = 0.8;
const THEME = "#263D30";

const out = (p) => path.join(ROOT, p);

async function main() {
  const meta = await sharp(SRC).metadata();
  const { width: w, height: h } = meta;

  // Square: centre crop the largest square the photo allows. Both cats sit
  // across the middle, so centre keeps each face.
  const side = Math.min(w, h);
  const square = () =>
    sharp(SRC).extract({
      left: Math.round((w - side) / 2),
      top: Math.round((h - side) / 2),
      width: side,
      height: side,
    });

  const kb = (p) => Math.round(fs.statSync(out(p)).size / 1024) + "KB";
  const iconPng = { compressionLevel: 9, palette: true, quality: 90 };

  const squares = [
    ["app/icon.png", 32],
    ["app/apple-icon.png", 180],
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
  ];
  for (const [file, size] of squares) {
    await square().resize(size, size, { fit: "cover" }).png(iconPng).toFile(out(file));
    console.log(`${file}  ${size}x${size}  ${kb(file)}`);
  }

  // Maskable: photo inset to the safe zone on a themed field.
  const inner = Math.round(512 * SAFE);
  const innerBuf = await square().resize(inner, inner, { fit: "cover" }).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: THEME },
  })
    .composite([{ input: innerBuf, gravity: "centre" }])
    .png(iconPng)
    .toFile(out("public/icon-maskable-512.png"));
  console.log(`public/icon-maskable-512.png  512x512  ${kb("public/icon-maskable-512.png")} (photo inset to ${Math.round(SAFE * 100)}%)`);

  // Share card: 1200x630. Cropping a square that hard would behead both cats,
  // so bias the window upward to hold the faces.
  const ogH = Math.round(w / (1200 / 630));
  const top = Math.max(0, Math.min(h - ogH, Math.round(h * 0.07)));
  await sharp(SRC)
    .extract({ left: 0, top, width: w, height: ogH })
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out("app/opengraph-image.jpg"));
  console.log(`app/opengraph-image.jpg  1200x630  ${kb("app/opengraph-image.jpg")} (window ${w}x${ogH} at y=${top})`);

  // Login screen: 2x a ~128px avatar, JPEG since it is a photo over a flat panel.
  await square().resize(256, 256, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toFile(out("public/couple.jpg"));
  console.log("public/couple.jpg  256x256");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
