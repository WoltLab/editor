import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: ["app.ts"],
      fileName: "ckeditor5",
      formats: ["umd"],
      name: "ckeditor5",
    },
  },
});
