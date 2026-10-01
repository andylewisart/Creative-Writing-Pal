// Builds the static github.io version into site/.
// There's no server there, so a grown-up saves the OpenAI key in the browser
// (Grown-ups corner) and the page calls OpenAI directly.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (p) => path.join(root, "public", p);
const out = path.join(root, "site");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "css"), { recursive: true });

await build({
  entryPoints: [pub("js/main.js")],
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  define: { __STATIC_SITE__: "true", __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC") },
  outfile: path.join(out, "app.js"),
});

fs.copyFileSync(pub("css/style.css"), path.join(out, "css/style.css"));
// Version the file names so a refresh always loads the newest game
// (GitHub Pages lets browsers reuse files for 10 minutes).
const hash = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(out, f))).digest("hex").slice(0, 10);
const html = fs
  .readFileSync(pub("index.html"), "utf8")
  .replace('<script type="module" src="js/main.js"></script>', `<script src="app.js?v=${hash("app.js")}" defer></script>`)
  .replace('href="css/style.css"', `href="css/style.css?v=${hash("css/style.css")}"`);
fs.writeFileSync(path.join(out, "index.html"), html);
fs.writeFileSync(path.join(out, ".nojekyll"), "");

const kb = (f) => Math.round(fs.statSync(path.join(out, f)).size / 1024);
console.log(`Wrote site/ (app.js ${kb("app.js")} KB, index.html, css/style.css)`);
