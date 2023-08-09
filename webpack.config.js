// webpack.config.js

"use strict";

const path = require("path");
const { styles } = require("@ckeditor/ckeditor5-dev-utils");
const {
  CKEditorTranslationsPlugin,
} = require("@ckeditor/ckeditor5-dev-translations");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (_env, argv) => {
  const postcssOptions = styles.getPostCssConfig({
    themeImporter: {
      themePath: require.resolve("@ckeditor/ckeditor5-theme-lark"),
    },
    minify: true,
  });
  postcssOptions.plugins.push(require("postcss-hover-media-feature"));

  const config = {
    // https://webpack.js.org/configuration/entry-context/
    entry: "./app.ts",

    // https://webpack.js.org/configuration/output/
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "ckeditor5.bundle.js",
      library: "CKEditor5",
      //libraryTarget: 'amd',
    },

    plugins: [
      new CKEditorTranslationsPlugin({
        additionalLanguages: "all",
        language: "en",
      }),
      new MiniCssExtractPlugin({
        filename: "ckeditor5.css",
      }),
    ],

    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node-modules/,
        },
        {
          test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,

          use: ["raw-loader"],
        },
        {
          test: /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,

          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "postcss-loader",
              options: {
                postcssOptions,
              },
            },
          ],
        },
      ],
    },

    resolve: {
      extensions: [".ts", ".js"],
    },

    // By default webpack logs warnings if the bundle is bigger than 200kb.
    performance: { hints: false },
  };

  if (argv.mode === "development") {
    config.devtool = "source-map";
  }

  return config;
};
