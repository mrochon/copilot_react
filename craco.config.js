const webpack = require('webpack');
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for Node.js core modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        process: require.resolve('process/browser.js'),
        events: require.resolve('events/'),
        vm: false,
        child_process: false,
      };

      // Disable fully specified requirement for ESM modules
      webpackConfig.resolve.fullySpecified = false;

      // Replace node: protocol imports with polyfills
      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          const moduleName = resource.request.replace(/^node:/, '');
          
          const replacements = {
            events: 'events/',
            stream: 'stream-browserify',
            buffer: 'buffer/',
            util: 'util/',
            crypto: 'crypto-browserify',
          };

          if (replacements[moduleName]) {
            resource.request = replacements[moduleName];
          } else {
            // For modules we can't polyfill (like child_process), use fallback
            resource.request = path.resolve(__dirname, 'node_modules/node-noop');
          }
        })
      );

      // Add plugin to provide process and Buffer globally
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser.js',
          Buffer: ['buffer', 'Buffer'],
        })
      );

      return webpackConfig;
    },
  },
};
