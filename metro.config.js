const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList =
  require('./node_modules/metro-config/src/defaults/exclusionList').default;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Native build intermediates under node_modules are transient and can be
    // created/removed while Metro is crawling the tree on Windows, which
    // causes fs.watch ENOENT crashes in the fallback watcher.
    blockList: exclusionList([
      /node_modules[/\\].+[/\\]android[/\\]\.cxx[/\\].*/,
      /node_modules[/\\].+[/\\]android[/\\]build[/\\].*/,
      /android[/\\]app[/\\]build[/\\].*/,
    ]),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
