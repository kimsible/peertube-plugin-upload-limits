const { version, name } = require('./package.json')

module.exports = {
  mediainfoWasmPath: `/plugins/${name.replace('peertube-plugin-', '')}/${version}/static/web-assembly/mediainfo.wasm`
}
