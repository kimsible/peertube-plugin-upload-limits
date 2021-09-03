const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const CopyPlugin = require('copy-webpack-plugin')
const pkg = require('./package.json')

const PUBLIC_PATH = `/plugins/${pkg.name.replace('peertube-plugin-', '')}/${pkg.version}/static/`

module.exports = async env => {
  let mode, output, watch

  if (env.prod) {
    mode = 'production'

    output = {
      path: path.resolve(__dirname, 'dist')
    }
  }

  if (env.dev) {
    dotenv.config()

    mode = 'development'

    const { PEERTUBE_PATH } = process.env

    await fs.promises.access(PEERTUBE_PATH, fs.constants.R_OK | fs.constants.W_OK)

    output = {
      path: path.resolve(PEERTUBE_PATH, `./storage/plugins/node_modules/${pkg.name}`)
    }

    watch = true
  }

  return {
    mode,
    watch,
    entry: './client/common-client-plugin.js',
    output: {
      ...output,
      publicPath: PUBLIC_PATH,
      filename: 'common-client-plugin.js',
      chunkFilename: 'assets/[name].js',
      library: {
        type: 'module'
      }
    },
    module: {
      rules: [
        {
          test: /mediainfo\.js$/,
          parser: {
            commonjs: false,
            node: false
          },
          use: [
            {
              loader: 'string-replace-loader',
              options: {
                search: 'MediaInfoModule.wasm',
                replace: path.resolve(PUBLIC_PATH, 'assets/MediaInfoModule.wasm')
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: './node_modules/mediainfo.js/dist/MediaInfoModule.wasm', to: 'assets/MediaInfoModule.wasm' }
        ]
      })
    ],
    experiments: {
      outputModule: true
    }
  }
}
