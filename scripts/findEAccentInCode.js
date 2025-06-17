import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// 🔧 Nécessaire pour recréer __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const folder = path.join(__dirname, ".."); // remonte à la racine du projet
const extensions = [".js", ".jsx", ".ts", ".tsx"];

function scanFolder(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !["node_modules", ".next", ".vercel", "public"].includes(file)
    ) {
      scanFolder(fullPath);
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (line.includes("x-périences")) {
          console.log(`🔍 ${fullPath}:${index + 1} → ${line.trim()}`);
        }
      });
    }
  }
}

scanFolder(folder);
