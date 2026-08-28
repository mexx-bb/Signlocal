import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "brand-assets");
const output = resolve(root, "dist", "public");
const destination = join(output, "signlocal-assets");
const mappings = new Map([
  ["/manus-storage/signlocal-hero_90dd687c.png", "/signlocal-assets/signlocal-hero.png"],
  ["/manus-storage/signlocal-mobile-illustration_0ec34c95.png", "/signlocal-assets/signlocal-mobile-illustration.png"],
  ["/manus-storage/signlocal-path-detail_5b48504e.png", "/signlocal-assets/signlocal-path-detail.png"],
  ["/manus-storage/signlocal-brand-mark_96c1547c.png", "/signlocal-assets/signlocal-brand-mark.png"],
  ["/manus-storage/signlocal-mobile-icon_205ef848.png", "/signlocal-assets/signlocal-mobile-icon.png"],
  ["/manus-storage/signlocal-macos-hotspot-guide_0d054cc0.png", "/signlocal-assets/signlocal-macos-hotspot-guide.png"],
]);

if (!existsSync(source)) throw new Error("Der Ordner brand-assets fehlt. Verwende den vollständigen GitHub-Quellstand mit den mitgelieferten Markenquellen.");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const [, externalPath] of mappings) {
  const fileName = externalPath.split("/").at(-1);
  const sourcePath = join(source, fileName);
  if (!existsSync(sourcePath)) throw new Error(`Erforderliche Markenquelle fehlt: brand-assets/${fileName}`);
  cpSync(sourcePath, join(destination, fileName));
}

function rewrite(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) { rewrite(path); continue; }
    if (!/\.(?:html|js|mjs|css|webmanifest)$/u.test(entry)) continue;
    let content = readFileSync(path, "utf8");
    for (const [from, to] of mappings) content = content.replaceAll(from, to);
    writeFileSync(path, content);
  }
}

rewrite(output);
console.log("Externer Signlocal-Build fertig: lokale Markenquellen liegen unter /signlocal-assets/.");
