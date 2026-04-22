// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const { modulo } = require('react-native/types_generated/Libraries/Animated/AnimatedExports');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  }
]);
