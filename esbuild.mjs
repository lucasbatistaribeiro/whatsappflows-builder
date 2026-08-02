// Builds the Figma plugin: a sandboxed main bundle (dist/code.js) and a single
// self-contained UI file (dist/ui.html) with the UI bundle inlined.
import esbuild from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");
await mkdir("dist", { recursive: true });

const common = { bundle: true, target: "es2019", logLevel: "info" };

async function buildUI() {
  const result = await esbuild.build({
    ...common,
    entryPoints: ["src/ui/ui.ts"],
    write: false,
    format: "iife",
  });
  const js = result.outputFiles[0].text;
  const template = await readFile("src/ui/ui.html", "utf8");
  const html = template.replace("/*__UI_BUNDLE__*/", () => js);
  await writeFile("dist/ui.html", html);
}

async function buildMain() {
  await esbuild.build({
    ...common,
    entryPoints: ["src/main/index.ts"],
    outfile: "dist/code.js",
    format: "iife",
  });
}

if (watch) {
  const ctx = await esbuild.context({
    ...common,
    entryPoints: ["src/main/index.ts"],
    outfile: "dist/code.js",
    format: "iife",
  });
  await ctx.watch();
  await buildUI();
  console.log("watching main; UI rebuilt once (re-run for UI changes)");
} else {
  await Promise.all([buildMain(), buildUI()]);
  console.log("build complete -> dist/");
}
