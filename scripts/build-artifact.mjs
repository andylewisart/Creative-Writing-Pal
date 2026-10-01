// Bundles the whole game into one self-contained HTML file (dist/story-quest.html)
// that can be published as a claude.ai artifact. There, the game asks Claude
// through the viewer's own Claude account, so no API key is needed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (p) => path.join(root, "public", p);

const html = fs.readFileSync(pub("index.html"), "utf8");
const body = html.match(/<!-- app:start -->([\s\S]*?)<!-- app:end -->/)[1].trim();
const fonts = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/)[1];
const css = fs.readFileSync(pub("css/style.css"), "utf8");

const result = await build({
  entryPoints: [pub("js/main.js")],
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  write: false,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// The artifact host wraps this in its own <!doctype>/<head>/<body>, so we
// write the page content directly: title and styles first.
const out = `<title>Story Quest</title>
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`;

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const file = path.join(root, "dist", "story-quest.html");
fs.writeFileSync(file, out);
console.log(`Wrote ${path.relative(root, file)} (${Math.round(out.length / 1024)} KB)`);
