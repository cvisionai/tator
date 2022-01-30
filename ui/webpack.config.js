const path = require("path")
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new WebpackShellPluginNext({
      onBeforeBuild: {
        scripts: ['python3 make_index_files.py'],
        blocking: true,
        parallel: false
      }
    })
  ]
}
