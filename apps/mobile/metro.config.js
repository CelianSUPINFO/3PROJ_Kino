const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Socket.IO's ESM package exports are not resolved reliably by Metro on Windows.
// Falling back to the package's CommonJS entry keeps iOS and Android bundling stable.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
