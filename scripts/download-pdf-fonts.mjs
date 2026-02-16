#!/usr/bin/env node
/**
 * Download Inter font files for @react-pdf/renderer
 *
 * Remote font URLs do not work with react-pdf. This script downloads
 * the required Inter TTF files to public/fonts/inter/ for local use.
 *
 * Run: node scripts/download-pdf-fonts.mjs
 * Or: npm run fonts:download (if script is added to package.json)
 */

import { createWriteStream, mkdirSync, existsSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const FONTS_DIR_PUBLIC = join(PROJECT_ROOT, "public", "fonts", "inter");
const FONTS_DIR_SRC = join(PROJECT_ROOT, "src", "lib", "documents", "fonts");

const FONTS = [
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
    file: "Inter-Regular.ttf",
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc2dthjQ.ttf",
    file: "Inter-Italic.ttf",
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf",
    file: "Inter-Medium.ttf",
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc69thjQ.ttf",
    file: "Inter-MediumItalic.ttf",
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf",
    file: "Inter-SemiBold.ttf",
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcB9xhjQ.ttf",
    file: "Inter-SemiBoldItalic.ttf",
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
    file: "Inter-Bold.ttf",
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxhjQ.ttf",
    file: "Inter-BoldItalic.ttf",
  },
];

async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const stream = createWriteStream(destPath);
  stream.write(buffer);
  stream.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  for (const dir of [FONTS_DIR_PUBLIC, FONTS_DIR_SRC]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  for (const { url, file } of FONTS) {
    const destPath = join(FONTS_DIR_PUBLIC, file);
    process.stdout.write(`Downloading ${file}... `);
    try {
      await download(url, destPath);
      console.log("OK");
    } catch (err) {
      console.error("FAILED:", err.message);
      process.exit(1);
    }
  }

  // Copy to src for bundling (Vercel serverless)
  for (const { file } of FONTS) {
    copyFileSync(join(FONTS_DIR_PUBLIC, file), join(FONTS_DIR_SRC, file));
  }

  console.log("\nFonts downloaded to public/fonts/inter/ and src/lib/documents/fonts/");
}

main();
