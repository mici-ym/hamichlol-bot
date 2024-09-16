export default {
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  ignores: [
    "node_modules/*",
    "**/wiki/*",
    "**/check-wiki-event",
    "**/import/*",
  ],
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      plugins: ["@babel/plugin-syntax-import-assertions"],
    },
  },
  plugins: ["@babel"],
  rules: {
    "import/no-unresolved": "off",
    "import/extensions": "off",
  },
};
