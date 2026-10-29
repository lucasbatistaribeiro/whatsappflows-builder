// Builds the Figma plugin from src/ straight into plugin/ — the only folder that
// ships. Output is exactly what the manifest points at: code.js (the sandbox
// bundle) and ui.html (the UI with its bundle inlined), so plugin/ ends up
// holding the three files Figma loads and nothing else.
//
// Paths resolve from this file rather than the shell's cwd, so the npm scripts
// work from the repo root.
import esbuild from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...parts) => path.join(root, ...parts);

const watch = process.argv.includes("--watch");
await mkdir(p("plugin"), { recursive: true });

const common = { bundle: true, target: "es2019", logLevel: "info" };
const mainOptions = {
  ...common,
  entryPoints: [p("src/main/index.ts")],
  outfile: p("plugin/code.js"),
  format: "iife",
};

async function buildUI() {
  const result = await esbuild.build({
    ...common,
    entryPoints: [p("src/ui/ui.ts")],
    write: false,
    format: "iife",
  });
  const js = result.outputFiles[0].text;
  // The design tokens live in their own file (mirrored from the Figma
  // variables) and are inlined into the stylesheet, like the bundle is into
  // the script. Both replacements take a function so `$` in the payload is
  // literal, not a replacement pattern.
  const tokens = await readFile(p("src/ui/tokens.css"), "utf8");
  const template = await readFile(p("src/ui/ui.html"), "utf8");
  const html = template
    .replace("/*__UI_TOKENS__*/", () => tokens)
    .replace("/*__UI_BUNDLE__*/", () => js);
  await writeFile(p("plugin/ui.html"), html);
}

if (watch) {
  const ctx = await esbuild.context(mainOptions);
  await ctx.watch();
  await buildUI();
  console.log("watching main; UI rebuilt once (re-run for UI changes)");
} else {
  await Promise.all([esbuild.build(mainOptions), buildUI()]);
  console.log("build complete -> plugin/ (manifest.json + code.js + ui.html)");
}
