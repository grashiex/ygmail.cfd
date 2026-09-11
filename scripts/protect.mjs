/**
 * Obfuscate public JS from _src/js → js/
 * Run: npm run protect
 *
 * config.js is copied as-is (must stay editable; keep secrets OUT of it).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JavaScriptObfuscator from "javascript-obfuscator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "_src", "js");
const outDir = path.join(root, "js");

const OBFUSCATE = [
  "auth.js",
  "themes.js",
  "extractors.js",
  "demo-data.js",
  "api.js",
  "app.js",
];

const options = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  selfDefending: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  target: "browser",
};

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function main() {
  ensureDir(outDir);
  if (!fs.existsSync(srcDir)) {
    console.error("Missing _src/js — abort");
    process.exit(1);
  }

  // Editable public config (no GAS URL)
  const configSrc = path.join(srcDir, "config.js");
  if (fs.existsSync(configSrc)) {
    fs.copyFileSync(configSrc, path.join(outDir, "config.js"));
    console.log("copied  config.js");
  }

  for (const file of OBFUSCATE) {
    const input = path.join(srcDir, file);
    if (!fs.existsSync(input)) {
      console.warn("skip missing", file);
      continue;
    }
    const code = fs.readFileSync(input, "utf8");
    const result = JavaScriptObfuscator.obfuscate(code, options);
    fs.writeFileSync(path.join(outDir, file), result.getObfuscatedCode(), "utf8");
    console.log("obfuscated", file);
  }

  console.log("\nDone. Push js/ to GitHub Pages. Edit sources in _src/js/ then re-run.");
}

main();
