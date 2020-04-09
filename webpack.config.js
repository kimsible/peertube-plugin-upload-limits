const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const EsmWebpackPlugin = require('@purtuga/esm-webpack-plugin')

const { mediainfoWasmPath } = require('./globals.js')

const config = {
  entry: ['mediainfo.js/dist/mediainfo.min.js', './client/common-client-plugin.js'],
  output: {
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
              replace: mediainfoWasmPath
            }
          }
        ]
      }
    ]
  },
  externals: {
    mediainfo: 'MediaInfo'
  },
  plugins: [
    new EsmWebpackPlugin(),
    new CopyWebpackPlugin([{
      from: './node_modules/mediainfo.js/dist/mediainfo.wasm',
      to: '../public/web-assembly/mediainfo.wasm'
    }])
  ]
}

module.exports = config
