const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Make react-native-svg work on Expo Web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-svg') {
    return context.resolveRequest(
      context,
      'react-native-svg/src/ReactNativeSVG.web',
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

// The support service (backend-support-service/) is a separate Node package. The app
// only imports its engine and FAQ file, so keep Metro out of its own node_modules
// (crawling it can exhaust file handles on Windows: "EMFILE: too many open files").
const path = require('path');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const supportModules = path.resolve(__dirname, 'backend-support-service', 'node_modules');
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList || []),
  new RegExp(`^${escapeRegExp(supportModules)}([\\\\/].*)?$`),
];

module.exports = config;
