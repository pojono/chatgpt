module.exports = {
  extends: [
    "eslint:recommended",
    // https://typescript-eslint.io/linting/configs
    // Contains all of recommended,
    // recommended-type-checked, and strict,
    // along with additional strict rules that require type information.
    "plugin:@typescript-eslint/strict-type-checked",
    // Contains all the stylistic,
    // along with additional stylistic rules that require type information.
    "plugin:@typescript-eslint/stylistic-type-checked",
    // https://github.com/prettier/eslint-plugin-prettier#recommended-configuration
    "plugin:prettier/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname
  },
  plugins: ["@typescript-eslint"],
  root: true,
  rules: {
    'prettier/prettier': 'warn',
  },
  ignorePatterns: ["dist/", "node_modules/"]
};