/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  serverModuleFormat: "cjs",
  serverNodeBuiltinsPolyfill: {
    modules: {
      crypto: true,
      stream: true,
      fs: true,
      path: true,
      "fs/promises": true,
      os: true,
      util: true,
    }
  },

  // See https://github.com/remix-run/remix/discussions/2594.
  serverDependenciesToBundle: [
    /^rehype.*/,
    /^remark.*/,
    /^unified.*/,
    /^unist.*/,
    /^hast.*/,
    /^bail.*/,
    /^trough.*/,
    /^mdast.*/,
    /^micromark.*/,
    /^decode.*/,
    /^character.*/,
    /^property.*/,
    /^space.*/,
    /^comma.*/,
    /^react-markdown$/,
    /^vfile.*/,
    /^ccount*/,
    /^markdown-table*/,
    /^longest-streak.*/,
    /^is-plain-obj.*/,
    /^escape-string-regexp.*/,
    /^trim-lines.*/,
  ],
  sourcemap: true,
}
