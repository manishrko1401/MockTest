import { defineConfig } from "prisma/config";
import fs from "fs";
import path from "path";

// Manually load .env file from the current directory
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const index = trimmed.indexOf("=");
        if (index !== -1) {
          const key = trimmed.slice(0, index).trim();
          let val = trimmed.slice(index + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  console.error("Failed to load .env manually in prisma.config.ts:", e);
}

export default defineConfig({
  schema: "./schema.prisma",
  datasource: {
    url: (process.env.DATABASE_URL || "").trim(),
  },
});
