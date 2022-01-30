const path = require("path")
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  entry: {
    "project-settings": "./src/project-settings/index.js",
    "project-detail": "./src/project-detail/index.js",
    "organization-settings": "./src/organization-settings/index.js",
    "password-reset": "./src/password-reset/index.js",
    annotation: "./src/annotation/index.js",
    organizations: "./src/organizations/index.js",
    "account-profile": "./src/account-profile/index.js",
    annotator: "./src/annotator/index.js",
    token: "./src/token/index.js",
    projects: "./src/projects/index.js",
    tasks: "./src/tasks/index.js",
    util: "./src/util/index.js",
    registration: "./src/registration/index.js",
    components: "./src/components/index.js",
    "new-project": "./src/new-project/index.js",
    analytics: "./src/analytics/index.js"
  },
  output: {
    filename: "[name].js",
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
