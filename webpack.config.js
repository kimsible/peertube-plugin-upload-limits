const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const EsmWebpackPlugin = require('@purtuga/esm-webpack-plugin')

const { version } = require('./package.json')
const publicPath = `/plugins/upload-limits/${version}/client-scripts/dist/`

const config = {
  entry: './client/common-client-plugin.js',
  output: {
    publicPath,
    path: path.resolve(__dirname, './dist'),
    filename: './common-client-plugin.js',
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
              replace: `${publicPath}mediainfo.wasm`
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
      to: './mediainfo.wasm'
    }])
  ]
}

module.exports = config
