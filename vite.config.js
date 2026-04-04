import { defineConfig } from "vite";
import { access, mkdir, readdir, readFile, writeFile } from "fs/promises";
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
      const allDirs = packages.map((pkg) =>
        resolve("node_modules/@ckeditor", pkg, "dist/translations"),
      );
      const translationDirs = (
        await Promise.all(
          allDirs.map((dir) =>
            access(dir)
              .then(() => dir)
              .catch(() => null),
          ),
        )
      ).filter(Boolean);

      // Determine available languages from the first directory.
      const languages = (await readdir(translationDirs[0]))
        .filter(
          (f) =>
            f.endsWith(".js") &&
            !f.endsWith(".umd.js") &&
            !f.endsWith(".d.ts") &&
            f !== "en.js",
        )
        .map((f) => f.replace(".js", ""));

      await mkdir(targetDir, { recursive: true });

      // For each language, merge dictionaries from all packages into a single IIFE.
      await Promise.all(
        languages.map(async (lang) => {
          const dictionaries = [];
          let getPluralForm = null;

          for (const dir of translationDirs) {
            const file = resolve(dir, `${lang}.js`);
            let source;
            try {
              source = await readFile(file, "utf-8");
            } catch {
              continue;
            }

            // Extract the dictionary entries from:
            // export default {"lang":{"dictionary":{...},getPluralForm(n){...}}}
            const dictMatch = source.match(
              /"dictionary":\{(.+?)\},getPluralForm/,
            );
            if (dictMatch) {
              dictionaries.push(dictMatch[1]);
            }

            if (getPluralForm === null) {
              const pluralMatch = source.match(
                /getPluralForm(\([^)]*\)\{.+?\})/,
              );
              if (pluralMatch) {
                getPluralForm = pluralMatch[1];
              }
            }
          }

          const merged =
            `(e=>{` +
            `const l=e['${lang}']||={dictionary:{},getPluralForm:null};` +
            `Object.assign(l.dictionary,{${dictionaries.join(",")}});` +
            `l.getPluralForm=${getPluralForm ? `function${getPluralForm}` : "null"};` +
            `})(window.CKEDITOR_TRANSLATIONS||={});`;

          await writeFile(resolve(targetDir, `${lang}.js`), merged);
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
  define: {
    define: "undefined",
  },
  plugins: [ckeditorTranslations()],
});
