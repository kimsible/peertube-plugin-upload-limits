const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const EsmWebpackPlugin = require('@purtuga/esm-webpack-plugin')

const { version } = require('./package.json')
const pluginPath = `/plugins/upload-limits/${version}`

const config = {
  entry: './client/common-client-plugin.js',
  output: {
    publicPath: `${pluginPath}/client-scripts/`,
    path: path.resolve(__dirname, '.'),
    filename: 'dist/common-client-plugin.js',
    library: 'script',
    libraryTarget: 'var'
  },
  module: {
    rules: [
      {
        test: /mediainfo.*\.js$/,
        use: [
          'script-loader',
          {
            loader: 'string-replace-loader',
            options: {
              search: 'mediainfo.wasm',
              replace: `${pluginPath}/static/wasm/mediainfo.wasm`
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new EsmWebpackPlugin(),
    new CopyWebpackPlugin([{
      from: './node_modules/mediainfo.js/dist/mediainfo.wasm',
      to: './assets/wasm/mediainfo.wasm'
    }])
  ]
}

module.exports = config
