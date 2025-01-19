const path = require('path');

module.exports = {
  webpack: function override(config) {
    return config;
  },
  paths: function overridePaths(paths) {
    // Change 'src' to 'src/client'
    paths.appSrc = path.resolve(__dirname, 'src/client');
    paths.appPublic = path.resolve(__dirname, 'public');
    paths.appHtml = path.resolve(__dirname, 'public/index.html');
    paths.appIndexJs = path.resolve(__dirname, 'src/client/index.tsx');
    paths.appBuild = path.resolve(__dirname, 'build');
    return paths;
  },
};
