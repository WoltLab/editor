import { defineConfig } from "vite";
import { access, mkdir, readdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { pathToFileURL } from "url";

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
          const dictionary = {};
          let getPluralForm = null;

          for (const dir of translationDirs) {
            const file = resolve(dir, `${lang}.js`);
            try {
              await access(file);
            } catch {
              continue;
            }

            // Import the module instead of parsing its source, the
            // serialization of the upstream files is not stable.
            const translations = (await import(pathToFileURL(file).href))
              .default[lang];
            if (translations === undefined) {
              throw new Error(`Missing the language key '${lang}' in ${file}`);
            }

            Object.assign(dictionary, translations.dictionary);
            getPluralForm ??= translations.getPluralForm ?? null;
          }

          if (Object.keys(dictionary).length === 0) {
            throw new Error(`The merged dictionary for '${lang}' is empty.`);
          }

          // A method shorthand is not a valid expression on its own.
          let pluralForm = "null";
          if (getPluralForm !== null) {
            pluralForm = String(getPluralForm);
            if (pluralForm.startsWith("getPluralForm")) {
              pluralForm = `function ${pluralForm}`;
            }
          }

          const merged =
            `(e=>{` +
            `const l=e['${lang}']||={dictionary:{},getPluralForm:null};` +
            `Object.assign(l.dictionary,${JSON.stringify(dictionary)});` +
            `l.getPluralForm=${pluralForm};` +
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
