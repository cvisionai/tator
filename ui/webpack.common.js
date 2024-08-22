const path = require("path")
const WebpackShellPluginNext = require("webpack-shell-plugin-next");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");

module.exports = {
  entry: {
    "project-settings": "./src/js/project-settings/index.js",
    "project-detail": "./src/js/project-detail/index.js",
    "organization-settings": "./src/js/organization-settings/index.js",
    "password-reset": "./src/js/password-reset/index.js",
    annotation: "./src/js/annotation/index.js",
    organizations: "./src/js/organizations/index.js",
    "account-profile": "./src/js/account-profile/index.js",
    token: "./src/js/token/index.js",
    projects: "./src/js/projects/index.js",
    util: "./src/js/util/index.js",
    registration: "./src/js/registration/index.js",
    components: "./src/js/components/index.js",
    portal: "./src/js/analytics/index.js",
    "third-party": "./src/js/third-party/index.js",
    "tator-ui": "./src/js/index.js",
  },
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    clean: true,
    library: {
      type: 'module',
    }
  },
  plugins: [
    new WebpackShellPluginNext({
      onBeforeBuild: {
        scripts: ["python3 make_index_files.py"],
        blocking: true,
        parallel: false
      }
    }),
    new MiniCssExtractPlugin(),
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true,
      cwd: process.cwd(),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader"
        ],
      },
      {
        test: /\.(svg|jpg|ico|png|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2)$/i,
        type: 'asset/resource',
      }
    ]
  },
}
