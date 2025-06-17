import fs from "fs";
import path from "path";

const folder = "./"; // à adapter si besoin

function scanFolder(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith("node_modules")) {
      scanFolder(fullPath);
    } else if (file.endsWith(".css")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (/[^a-zA-Z]p[\s,{.#:]/.test(line)) {
          console.log(`🔍 ${fullPath}:${index + 1} → ${line.trim()}`);
        }
      });
    }
  }
}

scanFolder(folder);
