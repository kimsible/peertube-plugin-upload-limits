const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const EsmWebpackPlugin = require('@purtuga/esm-webpack-plugin')

const { version } = require('./package.json')
const publicPluginPath = `/plugins/upload-limits/${version}`

module.exports = async env => {
  let mode, output, watch

  if (env.prod) {
    mode = 'production'

    output = {
      path: path.resolve(__dirname, '.')
    }
  }

  if (env.dev) {
    dotenv.config()

    mode = 'development'

    const { PEERTUBE_PATH } = process.env

    await fs.promises.access(PEERTUBE_PATH, fs.constants.R_OK | fs.constants.W_OK)

    output = {
      path: path.resolve(PEERTUBE_PATH, './storage/plugins/node_modules/peertube-plugin-upload-limits')
    }

    watch = true
  }

  return {
    mode,
    watch,
    entry: './client/common-client-plugin.js',
    output: {
      ...output,
      publicPath: `${publicPluginPath}/client-scripts/`,
      filename: 'dist/common-client-plugin.js',
      chunkFilename: 'dist/[name].js',
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
                replace: `${publicPluginPath}/static/wasm/mediainfo.wasm`
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
}
