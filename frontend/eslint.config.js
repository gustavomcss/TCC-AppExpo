const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

/*
 * ESLint flat config: Expo rules first, then the Prettier config last so that it turns off
 * every stylistic rule that would conflict with the formatter.
 */
module.exports = defineConfig([
    globalIgnores(['dist/*', '.expo/*', 'node_modules/*']),
    expoConfig,
    prettierConfig,
]);
