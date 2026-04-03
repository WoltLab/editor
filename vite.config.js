import { defineConfig } from "vite";
import { existsSync } from "fs";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";

function ckeditorTranslations() {
  return {
    name: "ckeditor5-translations",
    async writeBundle(options) {
      const outDir = options.dir || "dist";
      const targetDir = resolve(outDir, "translations");

      // Parse app.ts to find all @ckeditor/ckeditor5-* packages.
      const appSource = await readFile("app.ts", "utf-8");
      const packages = [
        ...new Set(
          [...appSource.matchAll(/@ckeditor\/(ckeditor5-[a-z-]+)/g)].map(
            (m) => m[1],
          ),
        ),
      ];

      // Collect the translation directories that exist for these packages.
      const translationDirs = packages
        .map((pkg) =>
          resolve("node_modules/@ckeditor", pkg, "dist/translations"),
        )
        .filter((dir) => existsSync(dir));

      // Determine available languages from the first directory.
      const languages = (await readdir(translationDirs[0]))
        .filter((f) => f.endsWith(".umd.js") && f !== "en.umd.js")
        .map((f) => f.replace(".umd.js", ""));

      await mkdir(targetDir, { recursive: true });

      // For each language, concatenate the translation files from all packages.
      await Promise.all(
        languages.map(async (lang) => {
          const parts = await Promise.all(
            translationDirs.map(async (dir) => {
              const file = resolve(dir, `${lang}.umd.js`);
              if (existsSync(file)) {
                return readFile(file, "utf-8");
              }
              return "";
            }),
          );

          await writeFile(
            resolve(targetDir, `${lang}.js`),
            parts.filter(Boolean).join("\n"),
          );
        }),
      );
    },
  };
}

export default defineConfig({
  build: {
    lib: {
      entry: ["app.ts"],
      fileName: "ckeditor5",
      formats: ["umd"],
      name: "ckeditor5",
    },
  },
  plugins: [ckeditorTranslations()],
});
